# ProjScope Tasks

[![Release](https://img.shields.io/github/v/release/jviaches/projscope-tasks-source?label=latest&color=6550d6)](https://github.com/jviaches/projscope-tasks-source/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/jviaches/projscope-tasks-source/release.yml?label=build)](https://github.com/jviaches/projscope-tasks-source/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Issues](https://img.shields.io/github/issues/jviaches/projscope-tasks-source)](https://github.com/jviaches/projscope-tasks-source/issues)

A free, offline, privacy-first task management desktop app built on Kanban methodology.  
Available for **Windows**, **macOS**, and **Linux** — no account, no cloud, no subscription.

---

## What is ProjScope Tasks?

![Dashboard Bright](https://github.com/jviaches/projscope-tasks-source/blob/main/images/dashboard-bright.png)

![Dashboard Dark](https://github.com/jviaches/projscope-tasks-source/blob/main/images/dashboard-dark.png)

ProjScope Tasks is designed for solopreneurs, indie developers, and small teams who want a clean, fast, local-first task board with zero cloud dependency. Every project lives in a single encrypted `.prj` file on your machine — no accounts, no subscriptions, no data leaving your computer.

The app is built with **Angular 13** + **Electron 12** and ships as a self-contained executable.

---

## Features

### Core

| Feature | Description |
|---|---|
| **Kanban board** | Drag and drop tasks freely between any section column |
| **Sections** | Create and delete columns to match your workflow |
| **Tasks** | Rich task detail view with title, body (rich text via Quill), priority, and tags |
| **Task priority** | Four levels — Critical, High, Normal, Minor — colour-coded with a left-edge stripe on each card |
| **Due dates** | Optional deadline (date + time) on any task; cards show a clock icon and a colour-coded bottom border that shifts green → amber → orange → red as the deadline approaches; hidden on Done-column cards |
| **Project files** | Projects are saved as `.prj` files (AES-256 encrypted JSON) |
| **Light / Dark theme** | Toggle between themes; preference is persisted across sessions |
| **Auto-updater** | App checks for new releases once per day and prompts to install |

### Project Management

| Feature | Description |
|---|---|
| **New / Open / Save / Save As** | Full file lifecycle via the File menu |
| **Close project** | Closes the current board without exiting |
| **Unsaved-changes guard** | Confirmation dialog before any destructive action when there are unsaved changes |
| **Auto-save** | Changes are written to disk automatically whenever a file path is already known |
| **Section renaming** | Click the pencil icon or use the section menu to rename a column inline |

### Tags

| Feature | Description |
|---|---|
| **Project-level tags** | Create named tags with auto-assigned colours from a curated palette |
| **Custom tag colours** | Click the palette icon on any tag badge to open a native colour picker; the new colour is applied instantly to all task cards that use the tag |
| **Tag assignment** | Assign or remove any number of tags from a task in the task detail view |
| **Tags on cards** | Assigned tags appear as small colour pills directly on the Kanban card |
| **Delete tag** | Removing a tag from the project automatically removes it from every task (cascade delete) |

### Filtering & Sorting

| Feature | Description |
|---|---|
| **Global date range filter** | A filter bar above the board lets you pick a From / To date; all columns are filtered simultaneously to show only tasks whose creation date (or due date, if set) falls within the range. A live counter shows how many tasks match; one click clears the filter |
| **Per-column sort** | Sort any column by task name or creation date, ascending or descending, via the column context menu. An active-sort badge shows the current sort; click it to clear |

### Startup & File Handling

| Feature | Description |
|---|---|
| **Auto-load last project** | The previously opened project is re-opened automatically on next launch |
| **CLI file argument** | Launch with `-o <path>` or `--open <path>` (or pass a `.prj` path as a bare argument) to open a specific file on startup |
| **File association** | `.prj` files can be double-clicked to open the app directly into that project |
| **Multi-project workspace** | Open multiple projects simultaneously as tabs; switch between them instantly |

### Dashboard UI

The dashboard was redesigned from the ground up:

| Element | Description |
|---|---|
| **Top bar** | Logo, project tabs, inline project-name edit, global task search with autocomplete, Add Task button, theme toggle |
| **Stats strip** | Live counters for Total Tasks, In Progress, Done, and High Priority; overall progress bar |
| **Date range filter bar** | Global date filter between the stats strip and the board; highlights with accent colour when active |
| **Kanban columns** | Section colour dot, task count badge, inline rename input, contextual menu (Rename / Sort / Delete) |
| **Task cards** | Priority left-stripe, tag pills, creation date, priority badge, optional deadline chip with urgency border; done-column cards are dimmed with strikethrough titles |
| **Sidebar — Progress** | Animated SVG donut chart showing overall completion % with a per-section breakdown bar chart |
| **Sidebar — Tags** | Live tag management: create, change colour, and delete tags from one place |
| **Sidebar — Priority legend** | Quick-reference colour guide |
| **Sidebar — Notes** | Rich-text project notes (Quill editor) |

---

## Due Date Urgency Colours

When a task has a deadline the card bottom border shifts colour automatically:

| Colour | Meaning |
|---|---|
| 🟢 Green | More than 3 days remaining |
| 🟡 Amber | 1 – 3 days remaining |
| 🟠 Orange | Less than 1 day remaining |
| 🔴 Red | Overdue |

The border is hidden on Done-column cards regardless of the deadline.

---

## Project File Schema Versioning

`.prj` files carry a `schemaVersion` field. When a file saved by an older version is opened, a migration chain runs automatically to fill in any fields that didn't exist yet — existing data is never lost.

| Version | What was added |
|---|---|
| 0 → 1 | `notes`, `tags`, normalised task fields |
| 1 → 2 | `dueDate` (null by default on all existing tasks) |

To add a new field in a future release:
1. Bump `CURRENT_SCHEMA_VERSION` in `electron.service.ts`
2. Add one entry to the `MIGRATIONS` map with the old version as the key and a function that returns the project with the new field filled in at a safe default

Files without a `schemaVersion` field are treated as v0 and migrated forward.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 16 (recommended; the stack targets Electron 12 / Angular 13)
- npm 6+

### Install dependencies

```bash
cd source
npm install
```

### Run in development (hot-reload)

```bash
npm start
```

### Build for production

```bash
npm run build:prod
```

### Package as installer

```bash
npm run electron:build
```

The packaged output appears in `source/release/`.

---

## Command Reference

| Command | Description |
|---|---|
| `npm start` | Start in development mode with Electron + hot reload |
| `npm run build` | Build Angular app + compile main.ts |
| `npm run build:prod` | Production build with AOT |
| `npm run electron:local` | Build and launch in Electron |
| `npm run electron:build` | Build and package as a distributable |

---

## Releases

Releases are built automatically by GitHub Actions when a version tag (`vX.Y.Z`) is pushed. Each release publishes the following assets:

| File | Platform |
|---|---|
| `Projscope Tasks-Setup-X.Y.Z-x64.exe` | Windows 64-bit installer (NSIS) |
| `Projscope Tasks-Setup-X.Y.Z-ia32.exe` | Windows 32-bit installer (NSIS) |
| `Projscope Tasks-Portable-X.Y.Z-x64.exe` | Windows 64-bit portable (no install needed) |
| `Projscope Tasks-X.Y.Z-x64.AppImage` | Linux AppImage |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | Angular 13 |
| Desktop shell | Electron 12 |
| UI components | Angular Material |
| Drag and drop | Angular CDK |
| Rich text editor | Quill (ngx-quill) |
| File encryption | CryptoJS (AES-256) |
| Packaging | electron-builder |
| Auto-update | electron-updater |

---

## Project Structure

```
source/
  main.ts                          # Electron main process
  src/
    app/
      core/
        models/                    # Project, Task, Tag, Priority, AppSettings interfaces
        services/
          electron/electron.service.ts  # All file I/O, IPC, project state, migrations
          notification.service.ts       # Modals and snackbars
          theme.service.ts              # Light/dark theme switching
        themes/theme.ts            # Theme token definitions
      project/
        project-management/        # Main Kanban board component
      task/
        task-view/                 # Task detail dialog
      modals/                      # Confirmation and info dialogs
    assets/
      styles/                      # Global SCSS tokens and shared styles
```

---

## Contributing

**Contributions of any kind are very welcome.** Whether you're fixing a typo or shipping a whole new feature — every bit helps.

| Role | How to help |
|---|---|
| 🐛 **Bug hunter** | [Open a bug report](https://github.com/jviaches/projscope-tasks-source/issues/new?template=bug_report.md) |
| 💡 **Idea person** | [Suggest a feature](https://github.com/jviaches/projscope-tasks-source/issues/new?template=feature_request.md) |
| 🎨 **Designer** | Improve UI/UX, icons, or accessibility |
| 👩‍💻 **Developer** | Fix bugs, add features, refactor, review PRs |
| 🧪 **Tester** | Try the app on different platforms and report rough edges |

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a pull request — it covers the dev setup, branch conventions, and PR checklist.

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

---

## Security

Found a vulnerability? Please **do not** open a public issue. See [SECURITY.md](SECURITY.md) for responsible-disclosure instructions.
