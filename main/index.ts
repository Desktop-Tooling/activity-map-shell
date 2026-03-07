const { app, BrowserWindow, ipcMain, shell } = require('electron');
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

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });

// --- Windows helpers (run from app root so paths resolve) ---
const appRoot = path.resolve(__dirname, '..');
const getWindowsScript = path.join(__dirname, 'get-windows.ps1');
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

ipcMain.handle('launch-app', async (_e: Electron.IpcMainInvokeEvent, pathOrName: string) => {
  try {
    shell.openPath(pathOrName).then((err: string) => {
      if (err) shell.openExternal(pathOrName);
    });
  } catch (e) {
    console.error('launch-app error', e);
  }
});

// Start menu / recent apps list (simplified: common apps)
ipcMain.handle('get-common-apps', async () => {
  const common: { name: string; path: string }[] = [];
  if (process.platform !== 'win32') return common;
  const locations = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'cursor.exe'),
    path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'msedge.exe'),
    process.env.COMSPEC || 'cmd.exe',
    'powershell.exe',
  ];
  for (const p of locations) {
    if (p && (p.endsWith('.exe') ? fs.existsSync(p) : true)) {
      const name = path.basename(p, '.exe');
      if (!common.some((a) => a.name === name)) common.push({ name, path: p });
    }
  }
  return common;
});

// Persist map to JSON5 in user data
const userDataPath = app.getPath('userData');
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
