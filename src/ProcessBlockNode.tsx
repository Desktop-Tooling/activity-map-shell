import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useUpdateNodeData, useMapContext } from './MapContext';

export interface ProcessBlockData {
  label: string;
  processName?: string;
  hwnd?: string;
  processId?: number;
  startTime?: string;
  screenshotDataUrl?: string;
  groupId?: string;
  appPath?: string;
}

function ProcessBlockNode({ id, data, selected }: NodeProps<ProcessBlockData>) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const didSelectRef = useRef(false);
  const hasWindow = Boolean(data.hwnd);
  const updateNodeData = useUpdateNodeData();
  const { openLauncherForNodeId, setOpenLauncherForNodeId, removeNode } = useMapContext();

  useEffect(() => {
    if (openLauncherForNodeId === id) {
      setLauncherOpen(true);
      didSelectRef.current = false;
      setOpenLauncherForNodeId(null);
    }
  }, [openLauncherForNodeId, id, setOpenLauncherForNodeId]);

  const handleLauncherClose = useCallback(() => {
    setLauncherOpen(false);
    if (!didSelectRef.current) removeNode(id);
  }, [id, removeNode]);

  const captureThumbnail = useCallback(() => {
    if (!data.hwnd) return;
    setCapturing(true);
    window.activityMapAPI.captureWindowThumbnail(data.hwnd).then((dataUrl) => {
      if (dataUrl) updateNodeData(id, { screenshotDataUrl: dataUrl });
      setCapturing(false);
    }).catch(() => setCapturing(false));
  }, [data.hwnd, id, updateNodeData]);

  const handleRefocus = useCallback(() => {
    if (data.hwnd) window.activityMapAPI.focusWindow(data.hwnd);
  }, [data.hwnd]);

  const handleLaunch = useCallback((pathOrName: string) => {
    didSelectRef.current = true;
    window.activityMapAPI.launchApp(pathOrName);
    setLauncherOpen(false);
  }, []);

  const handleAttach = useCallback(
    (win: { hwnd: string; title: string; processName: string }) => {
      didSelectRef.current = true;
      updateNodeData(id, { hwnd: win.hwnd, label: win.title, processName: win.processName });
      setLauncherOpen(false);
      setCapturing(true);
      window.activityMapAPI
        .captureWindowThumbnail(win.hwnd)
        .then((dataUrl) => {
          if (dataUrl) updateNodeData(id, { screenshotDataUrl: dataUrl });
          setCapturing(false);
        })
        .catch(() => setCapturing(false));
    },
    [id, updateNodeData]
  );

  const isGhost = !!(data as ProcessBlockData & { isGhost?: boolean }).isGhost;

  return (
    <div
      className={`process-block ${isGhost ? 'process-block-ghost' : ''}`}
      data-selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        if (!isGhost) setLauncherOpen((o) => !o);
      }}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />
      <Handle type="source" position={Position.Bottom} className="node-handle" />

      <div className="process-block-preview">
        {data.screenshotDataUrl ? (
          <img src={data.screenshotDataUrl} alt="" className="process-block-screenshot" />
        ) : (
          <div className="process-block-placeholder">
            <span className="process-block-icon">{data.processName?.slice(0, 2)?.toUpperCase() || '?'}</span>
          </div>
        )}
        <div className="process-block-fade" />
      </div>

      <div className="process-block-footer">
        <span className="process-block-title" title={data.label}>
          {data.label || data.processName || 'New app'}
        </span>
        <div className="process-block-actions">
          {hasWindow && (
            <>
              <button
                type="button"
                className="process-block-refocus"
                onClick={(e) => { e.stopPropagation(); handleRefocus(); }}
                title="Bring window to front"
              >
                Focus
              </button>
              <button
                type="button"
                className="process-block-capture"
                onClick={(e) => { e.stopPropagation(); captureThumbnail(); }}
                title="Capture window thumbnail"
                disabled={capturing}
              >
                {capturing ? '╬ô├ç┬¬' : 'Γëí╞Æ├┤Γòû'}
              </button>
            </>
          )}
        </div>
      </div>

      {launcherOpen && (
        <AppLauncherPopup
          onClose={handleLauncherClose}
          onLaunch={handleLaunch}
          onAttachWindow={handleAttach}
        />
      )}
    </div>
  );
}

interface AppLauncherPopupProps {
  onClose: () => void;
  onLaunch: (path: string) => void;
  onAttachWindow: (win: { hwnd: string; title: string; processName: string }) => void;
}

function AppLauncherPopup({ onClose, onLaunch, onAttachWindow }: AppLauncherPopupProps) {
  const [apps, setApps] = React.useState<{ path: string; name: string; count: number }[]>([]);
  const [windows, setWindows] = React.useState<{ hwnd: string; title: string; processName: string }[]>([]);
  const [tab, setTab] = React.useState<'launch' | 'attach'>('launch');
  const [search, setSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    window.activityMapAPI.getAppList().then(setApps);
    window.activityMapAPI.getWindows().then((list) =>
      setWindows(
        list.map((w: { hwnd: string; title: string; processName: string }) => ({
          hwnd: String(w.hwnd),
          title: w.title,
          processName: w.processName,
        }))
      )
    );
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const filteredApps = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => a.name.toLowerCase().includes(q));
  }, [apps, search]);

  return (
    <div className="app-launcher-overlay" onClick={onClose}>
      <div className="app-launcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-launcher-header">
          <input
            ref={searchInputRef}
            type="search"
            className="app-launcher-search"
            placeholder="Search apps╬ô├ç┬¬"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="app-launcher-tabs">
            <button type="button" className={tab === 'launch' ? 'active' : ''} onClick={() => setTab('launch')}>
              Apps
            </button>
            <button type="button" className={tab === 'attach' ? 'active' : ''} onClick={() => setTab('attach')}>
              Attach window
            </button>
          </div>
        </div>

        {tab === 'launch' && (
          <div className="app-launcher-grid-scroll">
            <div className="app-launcher-grid">
              {filteredApps.map((a) => (
                <button
                  key={a.path}
                  type="button"
                  className="app-launcher-tile"
                  onClick={() => onLaunch(a.path)}
                  title={`${a.name}${a.count > 0 ? ` (used ${a.count}Γö£├╣)` : ''}`}
                >
                  <span className="app-launcher-icon">{a.name.slice(0, 2).toUpperCase()}</span>
                  <span className="app-launcher-tile-name">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'attach' && (
          <div className="app-launcher-list-scroll">
            <ul className="app-launcher-list">
              {windows.map((w) => (
                <li key={w.hwnd}>
                  <button type="button" onClick={() => onAttachWindow(w)} title={w.title}>
                    <span className="attach-process">{w.processName}</span>
                    <span className="attach-title">{w.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" className="app-launcher-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default ProcessBlockNode;
