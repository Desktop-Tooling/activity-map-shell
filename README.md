# Activity Map Shell

A Windows GUI shell that runs on top of your desktop and shows a **2D dependency graph** of running processes. Use it as a temporal activity map: add blocks for app instances, attach real windows, connect related blocks with edges, and refocus or launch apps from one place.

## Features

- **Click on the canvas** to add a new block.
- **Click a block** to open the app launcher: launch a new app or **attach** an existing window (from the list of visible windows) to that block.
- **Focus** button on attached blocks brings that window to the front.
- **Capture** (camera icon) captures a window thumbnail; the block shows a clipped preview with a fade at the bottom.
- **Drag** blocks to arrange them; **connect** blocks by dragging from the bottom handle of one to the top of another to show correlation (e.g. Cursor + terminal + browser tab group).
- Map is **saved automatically** every 8 seconds to `%APPDATA%\activity-map-shell\activity-map.json5`.

## Run (development)

```bash
pnpm install
pnpm run dev
```

Starts Vite (renderer) and Electron. If Electron opens before the app is ready, refresh the window.

## Run (production)

```bash
pnpm run build
pnpm start
```

## Tech

- **Electron** (main process), **Vite + React** (UI), **@xyflow/react** (2D graph).
- Windows: process/window list and focus via PowerShell scripts; window thumbnail via PowerShell + .NET `Graphics.CopyFromScreen`.
- Config/data: JSON5 in user data directory.

## Requirements

- Windows 10/11 (process list, focus, and thumbnail capture are Windows-specific).
- Node 18+ and pnpm.
