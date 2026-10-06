# Changelog

Notable functional changes to Activity Map Shell are listed here.

## 2026-10-06 — antora-dark-mode and lockfile sync

- Replaced retired `antora-dark-theme` with `antora-dark-mode` `^1.4.5` (Default UI overlay via `supplemental_files`).
- Synced `pnpm-lock.yaml` with `package.json` so `antora` / dark-mode and other declared deps install under `--frozen-lockfile`.
- Refreshed deprecated transitive `@xmldom/xmldom` 0.8.11 -> 0.8.15 (via electron-builder / plist) within range.

## 2026-09-07 — Antora component normalization

- Normalized the Antora descriptor for continuous publishing.
- Removed the duplicate component-title navigation entry.
- Added page context metadata, repaired corrupted punctuation, and aligned the window description with the current single-window implementation.
- Linked the public README to the component on the Desktop Tooling docs hub.

Details: [Antora component normalization](changelog/2026-09-07%20-%20antora%20component%20normalization.md)

## 2026-08-18 — Map interaction expansion

- Added superblocks, a running-window services strip, and the top navigation bar.
- Added Start Menu application discovery and one companion Electron window per display.
- Added the first Antora product documentation.

## 2026-03-07 — Initial activity map

- Introduced the Windows 2D process graph and Activity Map Shell application scaffold.
