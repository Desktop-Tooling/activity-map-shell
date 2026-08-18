import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('activityMapAPI', {
  getWindows: () => ipcRenderer.invoke('get-windows'),
  focusWindow: (hwnd: string) => ipcRenderer.invoke('focus-window', hwnd),
  launchApp: (pathOrName: string) => ipcRenderer.invoke('launch-app', pathOrName),
  getAppList: () => ipcRenderer.invoke('get-app-list'),
  loadMap: () => ipcRenderer.invoke('load-map'),
  saveMap: (data: string) => ipcRenderer.invoke('save-map'),
  captureWindowThumbnail: (hwnd: string) => ipcRenderer.invoke('capture-window-thumbnail', hwnd),
  getViewportBounds: () => ipcRenderer.invoke('get-viewport-bounds'),
  onViewportBounds: (callback: (bounds: { x: number; y: number; width: number; height: number }) => void) => {
    const handler = (_: unknown, bounds: { x: number; y: number; width: number; height: number }) => callback(bounds);
    ipcRenderer.on('viewport-bounds', handler);
    return () => ipcRenderer.removeListener('viewport-bounds', handler);
  },
  setMouseOver: (over: boolean) => ipcRenderer.send(over ? 'activity-map-mouse-over' : 'activity-map-mouse-leave'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowHide: () => ipcRenderer.invoke('window-hide'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  getRootPosition: () => ipcRenderer.invoke('get-root-position'),
  setMainDisplay: (id: number) => ipcRenderer.invoke('set-main-display', id),
  onDisplayInfo: (callback: (info: { index: number; isPrimary: boolean }) => void) => {
    const handler = (_: unknown, info: { index: number; isPrimary: boolean }) => callback(info);
    ipcRenderer.on('display-info', handler);
    return () => ipcRenderer.removeListener('display-info', handler);
  },
});
