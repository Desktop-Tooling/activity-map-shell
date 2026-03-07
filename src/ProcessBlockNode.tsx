import React, { useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useUpdateNodeData } from './MapContext';

export interface ProcessBlockData {
  label: string;
  processName?: string;
  hwnd?: string;
  processId?: number;
  screenshotDataUrl?: string;
  groupId?: string;
  appPath?: string;
}

function ProcessBlockNode({ id, data, selected }: NodeProps<ProcessBlockData>) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const hasWindow = Boolean(data.hwnd);
  const updateNodeData = useUpdateNodeData();

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
    window.activityMapAPI.launchApp(pathOrName);
    setLauncherOpen(false);
  }, []);

  return (
    <div
      className="process-block"
      data-selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        setLauncherOpen((o) => !o);
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
          {data.label || data.processName || 'New block'}
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
                {capturing ? '…' : '📷'}
              </button>
            </>
          )}
        </div>
      </div>

      {launcherOpen && (
        <AppLauncherPopup
          onClose={() => setLauncherOpen(false)}
          onLaunch={handleLaunch}
          onAttachWindow={(win) => {
            updateNodeData(id, { hwnd: win.hwnd, label: win.title, processName: win.processName });
            setLauncherOpen(false);
            setCapturing(true);
            window.activityMapAPI.captureWindowThumbnail(win.hwnd).then((dataUrl) => {
              if (dataUrl) updateNodeData(id, { screenshotDataUrl: dataUrl });
              setCapturing(false);
            }).catch(() => setCapturing(false));
          }}
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
  const [apps, setApps] = React.useState<{ name: string; path: string }[]>([]);
  const [windows, setWindows] = React.useState<{ hwnd: string; title: string; processName: string }[]>([]);
  const [tab, setTab] = React.useState<'launch' | 'attach'>('launch');

  React.useEffect(() => {
    window.activityMapAPI.getCommonApps().then(setApps);
    window.activityMapAPI.getWindows().then((list) =>
      setWindows(list.map((w: { hwnd: string; title: string; processName: string }) => ({ hwnd: String(w.hwnd), title: w.title, processName: w.processName })))
    );
  }, []);

  return (
    <div className="app-launcher-overlay" onClick={onClose}>
      <div className="app-launcher-popup" onClick={(e) => e.stopPropagation()}>
        <div className="app-launcher-tabs">
          <button type="button" className={tab === 'launch' ? 'active' : ''} onClick={() => setTab('launch')}>
            Launch app
          </button>
          <button type="button" className={tab === 'attach' ? 'active' : ''} onClick={() => setTab('attach')}>
            Attach window
          </button>
        </div>
        {tab === 'launch' && (
          <ul className="app-launcher-list">
            {apps.map((a) => (
              <li key={a.path}>
                <button type="button" onClick={() => onLaunch(a.path)}>{a.name}</button>
              </li>
            ))}
          </ul>
        )}
        {tab === 'attach' && (
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
        )}
        <button type="button" className="app-launcher-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default ProcessBlockNode;
