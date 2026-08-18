import React from 'react';

const TOP_BAR_HEIGHT = 28;

interface TopBarProps {
  displayLabel?: string;
  onScreenConfigClick?: () => void;
  screenConfigOpen?: boolean;
}

export function TopBar({ displayLabel = 'Screen', onScreenConfigClick, screenConfigOpen }: TopBarProps) {
  return (
    <header
      className="app-top-bar"
      style={{ height: TOP_BAR_HEIGHT }}
      data-app-region="drag"
    >
      <span className="app-top-bar-title">Activity Map</span>
      <div className="app-top-bar-center" data-app-region="no-drag">
        {onScreenConfigClick && (
          <button
            type="button"
            className={`app-top-bar-btn app-top-bar-screen-btn ${screenConfigOpen ? 'active' : ''}`}
            onClick={onScreenConfigClick}
            title="Display layout (position of monitors in 2D space)"
            aria-label="Screen config"
          >
            {displayLabel}
          </button>
        )}
      </div>
      <div className="app-top-bar-actions" data-app-region="no-drag">
        <button
          type="button"
          className="app-top-bar-btn"
          onClick={() => window.activityMapAPI.windowMinimize()}
          title="Minimize"
          aria-label="Minimize"
        >
          ΓÇö
        </button>
        <button
          type="button"
          className="app-top-bar-btn app-top-bar-btn-close"
          onClick={() => window.activityMapAPI.windowClose()}
          title="Close"
          aria-label="Close"
        >
          ├ù
        </button>
      </div>
    </header>
  );
}