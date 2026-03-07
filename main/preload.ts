import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('activityMapAPI', {
  getWindows: () => ipcRenderer.invoke('get-windows'),
  focusWindow: (hwnd: string) => ipcRenderer.invoke('focus-window', hwnd),
  launchApp: (pathOrName: string) => ipcRenderer.invoke('launch-app', pathOrName),
  getCommonApps: () => ipcRenderer.invoke('get-common-apps'),
  loadMap: () => ipcRenderer.invoke('load-map'),
  saveMap: (data: string) => ipcRenderer.invoke('save-map'),
  captureWindowThumbnail: (hwnd: string) => ipcRenderer.invoke('capture-window-thumbnail', hwnd),
});
