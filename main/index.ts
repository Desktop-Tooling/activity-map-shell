const { app, BrowserWindow, ipcMain, shell, screen: electronScreen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const JSON5 = require('json5');

let mainWindow: Electron.BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' || process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Activity Map',
    backgroundColor: '#1a1b1e',
    show: false,
  });
  mainWindow = win;
  win.setMenu(null);

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  const setOpaque = (w: Electron.BrowserWindow, opaque: number) => {
    if (w && !w.isDestroyed()) w.setOpacity(opaque);
  };
  win.setOpacity(0.95);
  win.on('focus', () => setOpaque(win, 1));
  win.on('blur', () => setOpaque(win, 0.95));

  const sendViewportBounds = () => {
    if (win.isDestroyed()) return;
    try {
      win.webContents.send('viewport-bounds', win.getBounds());
    } catch {}
  };
  win.on('move', sendViewportBounds);
  win.on('resize', sendViewportBounds);

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('display-info', { index: 0, isPrimary: true });
  });

  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
  });
  win.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });

ipcMain.handle('window-hide', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('activity-map-mouse-over', (e: Electron.IpcMainEvent) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && !w.isDestroyed()) w.setOpacity(1); // 100% opaque when hovered
});
ipcMain.on('activity-map-mouse-leave', (e: Electron.IpcMainEvent) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && !w.isDestroyed()) w.setOpacity(w.isFocused() ? 1 : 0.95); // 95% opaque when no hover
});
ipcMain.handle('window-minimize', (e: Electron.IpcMainInvokeEvent) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && !w.isDestroyed()) w.minimize();
});
ipcMain.handle('window-close', (e: Electron.IpcMainInvokeEvent) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && !w.isDestroyed()) w.close();
});

// --- Windows helpers (run from app root so paths resolve) ---
const appRoot = path.resolve(__dirname, '..');
const getWindowsScript = path.join(__dirname, 'get-windows.ps1');
const getAppListScript = path.join(__dirname, 'get-app-list.ps1');
const focusWindowScript = path.join(__dirname, 'focus-window.ps1');
const captureWindowScript = path.join(__dirname, 'capture-window.ps1');

function runPowerShell(scriptPath: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args
    ], { cwd: appRoot, windowsHide: true });
    let out = '';
    let err = '';
    ps.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    ps.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    ps.on('close', (code: number | null) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || `Exit ${code}`));
    });
  });
}

ipcMain.handle('get-viewport-bounds', (e: Electron.IpcMainInvokeEvent) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  return win && !win.isDestroyed() ? win.getBounds() : { x: 0, y: 0, width: 1920, height: 1080 };
});

ipcMain.handle('get-windows', async () => {
  if (process.platform !== 'win32') return [];
  try {
    const raw = await runPowerShell(getWindowsScript);
    const json = raw.replace(/^\s*/, '').replace(/\s*$/, '');
    if (!json) return [];
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('get-windows error', e);
    return [];
  }
});

ipcMain.handle('focus-window', async (_e: Electron.IpcMainInvokeEvent, hwnd: string) => {
  if (process.platform !== 'win32') return;
  try {
    await runPowerShell(focusWindowScript, [hwnd]);
  } catch (e) {
    console.error('focus-window error', e);
  }
});

const userDataPath = app.getPath('userData');
const launchCountsPath = path.join(userDataPath, 'activity-map-launch-counts.json5');

function loadLaunchCounts(): Record<string, number> {
  try {
    const raw = fs.readFileSync(launchCountsPath, 'utf-8');
    const parsed = JSON5.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveLaunchCounts(counts: Record<string, number>) {
  fs.writeFileSync(launchCountsPath, JSON5.stringify(counts, null, 2), 'utf-8');
}

function incrementLaunchCount(pathOrName: string) {
  const key = pathOrName.trim().toLowerCase();
  if (!key) return;
  const counts = loadLaunchCounts();
  counts[key] = (counts[key] ?? 0) + 1;
  saveLaunchCounts(counts);
}

ipcMain.handle('launch-app', async (_e: Electron.IpcMainInvokeEvent, pathOrName: string) => {
  try {
    incrementLaunchCount(pathOrName);
    shell.openPath(pathOrName).then((err: string) => {
      if (err) shell.openExternal(pathOrName);
    });
  } catch (e) {
    console.error('launch-app error', e);
  }
});

ipcMain.handle('increment-launch-count', async (_e: Electron.IpcMainInvokeEvent, pathOrName: string) => {
  incrementLaunchCount(pathOrName);
});

interface AppEntry { path: string; name: string; count?: number }

ipcMain.handle('get-app-list', async () => {
  const counts = loadLaunchCounts();
  let apps: AppEntry[] = [];
  if (process.platform === 'win32') {
    try {
      const raw = await runPowerShell(getAppListScript);
      const json = raw.replace(/^\s*/, '').replace(/\s*$/, '');
      if (json) {
        const parsed = JSON.parse(json);
        apps = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      }
    } catch (e) {
      console.error('get-app-list error', e);
    }
  }
  if (apps.length === 0) {
    const fallbackPaths: string[] = [
      process.env.COMSPEC || 'cmd.exe',
      'powershell.exe',
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'notepad.exe'),
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'calc.exe'),
      path.join(process.env.SystemRoot || 'C:\\Windows', 'explorer.exe'),
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'mspaint.exe'),
    ].filter(Boolean);
    const known: { path: string; name: string }[] = [];
    for (const p of fallbackPaths) {
      try {
        if (fs.existsSync(p)) known.push({ path: p, name: path.basename(p, '.exe') });
      } catch {}
    }
    if (known.length > 0) apps = known;
    else apps = fallbackPaths.map((p) => ({ path: p, name: path.basename(p, '.exe') }));
  }
  const withCount: AppEntry[] = apps.map((a) => ({
    path: a.path,
    name: a.name,
    count: counts[a.path.trim().toLowerCase()] ?? 0,
  }));
  withCount.sort((a, b) => ((b.count ?? 0) - (a.count ?? 0)) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return withCount;
});

// Persist map to JSON5 in user data
const mapPath = path.join(userDataPath, 'activity-map.json5');

ipcMain.handle('load-map', async () => {
  try {
    const raw = fs.readFileSync(mapPath, 'utf-8');
    return JSON5.parse(raw);
  } catch {
    return { nodes: [], edges: [], groups: [] };
  }
});

ipcMain.handle('save-map', async (_e: Electron.IpcMainInvokeEvent, data: string) => {
  fs.writeFileSync(mapPath, data, 'utf-8');
});

const screenConfigPath = path.join(userDataPath, 'activity-map-screen.json5');
const ROOT_NODE_WIDTH = 64;
const ROOT_NODE_HEIGHT = 40;
const ROOT_MARGIN_LEFT = 24;

function loadMainDisplayId(): number | null {
  try {
    const raw = fs.readFileSync(screenConfigPath, 'utf-8');
    const parsed = JSON5.parse(raw);
    return typeof parsed.mainDisplayId === 'number' ? parsed.mainDisplayId : null;
  } catch {
    return null;
  }
}

function saveMainDisplayId(id: number) {
  fs.writeFileSync(screenConfigPath, JSON5.stringify({ mainDisplayId: id }, null, 2), 'utf-8');
}

ipcMain.handle('get-displays', async () => {
  const displays = electronScreen.getAllDisplays();
  return displays.map((d: Electron.Display) => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    rotation: d.rotation,
    primary: d.id === electronScreen.getPrimaryDisplay().id,
  }));
});

ipcMain.handle('get-root-position', async () => {
  const primary = electronScreen.getPrimaryDisplay();
  const mainId = loadMainDisplayId();
  const displays = electronScreen.getAllDisplays();
  const main = mainId !== null ? displays.find((d: Electron.Display) => d.id === mainId) : null;
  const d = main || primary;
  const b = d.bounds;
  const x = b.x + ROOT_MARGIN_LEFT;
  const y = b.y + b.height / 2 - ROOT_NODE_HEIGHT / 2;
  return { x, y };
});

ipcMain.handle('set-main-display', async (_e: Electron.IpcMainInvokeEvent, id: number) => {
  saveMainDisplayId(id);
});

const os = require('os');
const tmpDir = path.join(os.tmpdir(), 'activity-map-shell');

ipcMain.handle('capture-window-thumbnail', async (_e: Electron.IpcMainInvokeEvent, hwnd: string) => {
  if (process.platform !== 'win32') return null;
  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, `thumb-${hwnd}-${Date.now()}.png`);
    await runPowerShell(captureWindowScript, [hwnd, outPath]);
    if (fs.existsSync(outPath)) {
      const buf = fs.readFileSync(outPath);
      const base64 = buf.toString('base64');
      try { fs.unlinkSync(outPath); } catch {}
      return `data:image/png;base64,${base64}`;
    }
  } catch (err) {
    console.error('capture-window-thumbnail error', err);
  }
  return null;
});
