<a id="readme-top"></a>
<div align="center">
  <a href="https://github.com/AMDphreak/activity-map-shell/graphs/contributors"><img src="https://img.shields.io/github/contributors/AMDphreak/activity-map-shell.svg?style=for-the-badge" alt="Contributors"></a>
  <a href="https://github.com/AMDphreak/activity-map-shell/network/members"><img src="https://img.shields.io/github/forks/AMDphreak/activity-map-shell.svg?style=for-the-badge" alt="Forks"></a>
  <a href="https://github.com/AMDphreak/activity-map-shell/stargazers"><img src="https://img.shields.io/github/stars/AMDphreak/activity-map-shell.svg?style=for-the-badge" alt="Stargazers"></a>
  <a href="https://github.com/AMDphreak/activity-map-shell/issues"><img src="https://img.shields.io/github/issues/AMDphreak/activity-map-shell.svg?style=for-the-badge" alt="Issues"></a>

  <h1>Activity Map Shell</h1>
  <p>Windows GUI: 2D process/activity map with blocks, launcher, and window thumbnails.</p>
  <p>
    <a href="https://github.com/AMDphreak/activity-map-shell/issues">Report Bug</a>
    &middot;
    <a href="https://github.com/AMDphreak/activity-map-shell/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
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

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* **App shell** — [![Electron][Electron.com]][Electron-url]
  * [![Vite][Vite.dev]][Vite-url]
  * [![React][React.js]][React-url]
  * [![xyflow][xyflow.com]][xyflow-url]
* **Windows helpers** — PowerShell scripts for process/window list and focus; PowerShell + .NET `Graphics.CopyFromScreen` for thumbnails
* **Config** — JSON5 in the user data directory

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

### Top contributors

<a href="https://github.com/AMDphreak/activity-map-shell/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AMDphreak/activity-map-shell" alt="contributors" />
</a>

For per-person profile links, prefer [all-contributors](https://allcontributors.org/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Ryan Johnson — [@amdphreak](https://twitter.com/amdphreak)

Project Link: [https://github.com/AMDphreak/activity-map-shell](https://github.com/AMDphreak/activity-map-shell)

Site: [https://ryanjohnson.dev](https://ryanjohnson.dev)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[Electron.com]: https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white
[Electron-url]: https://www.electronjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[Vite.dev]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[xyflow.com]: https://img.shields.io/badge/xyflow-1A192B?style=for-the-badge&logo=react&logoColor=white
[xyflow-url]: https://reactflow.dev/
