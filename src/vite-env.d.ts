/// <reference types="vite/client" />

interface Window {
  activityMapAPI: {
    getWindows: () => Promise<{ hwnd: string; processId: number; title: string; processName: string; startTime?: string }[]>;
    focusWindow: (hwnd: string) => Promise<void>;
    launchApp: (pathOrName: string) => Promise<void>;
    getAppList: () => Promise<{ path: string; name: string; count: number }[]>;
    loadMap: () => Promise<{ nodes: unknown[]; edges: unknown[]; groups: unknown[] }>;
    saveMap: (data: string) => Promise<void>;
    captureWindowThumbnail: (hwnd: string) => Promise<string | null>;
    getViewportBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
    onViewportBounds: (callback: (bounds: { x: number; y: number; width: number; height: number }) => void) => () => void;
    setMouseOver: (over: boolean) => void;
    windowMinimize: () => Promise<void>;
    windowClose: () => Promise<void>;
    getDisplays: () => Promise<{ id: number; bounds: { x: number; y: number; width: number; height: number }; workArea: unknown; scaleFactor: number; rotation: number; primary: boolean }[]>;
    getRootPosition: () => Promise<{ x: number; y: number }>;
    setMainDisplay: (id: number) => Promise<void>;
    onDisplayInfo: (callback: (info: { index: number; isPrimary: boolean }) => void) => () => void;
  };
}
