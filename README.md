<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<div align="center">
  <h1>Activity Map Shell</h1>
  <p>Windows GUI: 2D process/activity map with blocks, launcher, and window thumbnails.</p>
  <p>
    <a href="https://github.com/AMDphreak/activity-map-shell/issues">Report Bug</a>
    ·
    <a href="https://github.com/AMDphreak/activity-map-shell/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

A Windows GUI shell that runs on top of your desktop and shows a **2D dependency graph** of running processes. Use it as a temporal activity map: add blocks for app instances, attach real windows, connect related blocks with edges, and refocus or launch apps from one place.

### Features

- **Click on the canvas** to add a new block.
- **Click a block** to open the app launcher: launch a new app or **attach** an existing window (from the list of visible windows) to that block.
- **Focus** button on attached blocks brings that window to the front.
- **Capture** (camera icon) captures a window thumbnail; the block shows a clipped preview with a fade at the bottom.
- **Drag** blocks to arrange them; **connect** blocks by dragging from the bottom handle of one to the top of another to show correlation (e.g. Cursor + terminal + browser tab group).
- Map is **saved automatically** every 8 seconds to `%APPDATA%\activity-map-shell\activity-map.json5`.

### Built With

- **Electron** (main process), **Vite + React** (UI), **@xyflow/react** (2D graph).
- Windows: process/window list and focus via PowerShell scripts; window thumbnail via PowerShell + .NET `Graphics.CopyFromScreen`.
- Config/data: JSON5 in user data directory.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Windows 10/11 (process list, focus, and thumbnail capture are Windows-specific).
- Node 18+ and pnpm.

### Installation

```bash
pnpm install
pnpm run dev
```

Starts Vite (renderer) and Electron. If Electron opens before the app is ready, refresh the window.

Production:

```bash
pnpm run build
pnpm start
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

Add blocks on the canvas, attach windows, connect related apps, and use Focus/Capture on blocks. Layout persists automatically under AppData.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Fork the project, create a feature branch, commit, push, and open a pull request.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Ryan Johnson — [@amdphreak](https://twitter.com/amdphreak)

Project Link: [https://github.com/AMDphreak/activity-map-shell](https://github.com/AMDphreak/activity-map-shell)

Site: [https://ryanjohnson.dev](https://ryanjohnson.dev)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/AMDphreak/activity-map-shell.svg?style=for-the-badge
[contributors-url]: https://github.com/AMDphreak/activity-map-shell/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/AMDphreak/activity-map-shell.svg?style=for-the-badge
[forks-url]: https://github.com/AMDphreak/activity-map-shell/network/members
[stars-shield]: https://img.shields.io/github/stars/AMDphreak/activity-map-shell.svg?style=for-the-badge
[stars-url]: https://github.com/AMDphreak/activity-map-shell/stargazers
[issues-shield]: https://img.shields.io/github/issues/AMDphreak/activity-map-shell.svg?style=for-the-badge
[issues-url]: https://github.com/AMDphreak/activity-map-shell/issues
