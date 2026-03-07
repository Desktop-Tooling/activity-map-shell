/// <reference types="vite/client" />

interface Window {
  activityMapAPI: {
    getWindows: () => Promise<{ hwnd: string; processId: number; title: string; processName: string }[]>;
    focusWindow: (hwnd: string) => Promise<void>;
    launchApp: (pathOrName: string) => Promise<void>;
    getCommonApps: () => Promise<{ name: string; path: string }[]>;
    loadMap: () => Promise<{ nodes: unknown[]; edges: unknown[]; groups: unknown[] }>;
    saveMap: (data: string) => Promise<void>;
    captureWindowThumbnail: (hwnd: string) => Promise<string | null>;
  };
}
