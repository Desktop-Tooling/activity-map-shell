import React, { useEffect, useState } from 'react';

export interface WindowInfo {
  hwnd: string;
  processId: number;
  title: string;
  processName: string;
  startTime?: string;
}

const DRAG_TYPE = 'application/x-activity-window';

function parseWindowFromDrag(dataTransfer: DataTransfer): WindowInfo | null {
  const raw = dataTransfer.getData(DRAG_TYPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WindowInfo;
  } catch {
    return null;
  }
}

export function setWindowDragData(dataTransfer: DataTransfer, win: WindowInfo) {
  dataTransfer.setData(DRAG_TYPE, JSON.stringify(win));
  dataTransfer.effectAllowed = 'copy';
}

export function getWindowFromDrop(dataTransfer: DataTransfer): WindowInfo | null {
  return parseWindowFromDrag(dataTransfer);
}

export function ServicesStrip() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.activityMapAPI.getWindows().then((list) => {
      if (cancelled) return;
      const withStart = (list as WindowInfo[]).map((w) => ({
        ...w,
        hwnd: String(w.hwnd),
        startTime: w.startTime ?? '',
      }));
      withStart.sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
      setWindows(withStart);
    });
    const t = setInterval(() => {
      window.activityMapAPI.getWindows().then((list) => {
        if (cancelled) return;
        const withStart = (list as WindowInfo[]).map((w) => ({
          ...w,
          hwnd: String(w.hwnd),
          startTime: w.startTime ?? '',
        }));
        withStart.sort((a, b) => {
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
        setWindows(withStart);
      });
    }, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="services-strip" role="region" aria-label="Running windows">
      <div className="services-strip-scroll">
        {windows.map((win) => (
          <div
            key={win.hwnd}
            className="services-strip-tile"
            draggable
            onDragStart={(e) => {
              setWindowDragData(e.dataTransfer, win);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={win.title}
          >
            <span className="services-strip-process">{win.processName}</span>
            <span className="services-strip-title">{win.title || '(no title)'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}