# ProjScope Tasks

A free, offline, privacy-first task management desktop app built on Kanban methodology.  
Available for **Windows** and **Linux** (macOS build planned).

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
| **Project files** | Projects are saved as `.prj` files (AES-256 encrypted JSON) |
| **Light / Dark theme** | Toggle between themes; preference is persisted across sessions |
| **Auto-updater** | App checks for new releases once per day and prompts to install |

### Project Management

| Feature | Description |
|---|---|
| **New / Open / Save / Save As** | Full file lifecycle via the File menu |
| **Close project** | Closes the current board without exiting |
| **Unsaved-changes guard** | Confirmation dialog before any destructive action (exit, new, open, close) when there are unsaved changes; no unnecessary dialog when the project is already saved |
| **Auto-save** | Changes are written to disk automatically whenever a file path is already known |
| **Section renaming** | Click the pencil icon or use the section menu to rename a column inline; changes are saved immediately |

### Tags

| Feature | Description |
|---|---|
| **Project-level tags** | Create named tags with auto-assigned colours from a curated palette |
| **Tag assignment** | Assign or remove any number of tags from a task in the task detail view |
| **Tags on cards** | Assigned tags appear as small colour pills directly on the Kanban card |
| **Delete tag** | Removing a tag from the project automatically removes it from every task (cascade delete) |

### Startup & File Handling

| Feature | Description |
|---|---|
| **Auto-load last project** | The previously opened project is re-opened automatically on next launch |
| **CLI file argument** | Launch with `-o <path>` or `--open <path>` (or pass a `.prj` path as a bare argument) to open a specific file on startup |
| **File association** | `.prj` files can be double-clicked to open the app directly into that project |

### Dashboard UI

The dashboard was redesigned from the ground up:

| Element | Description |
|---|---|
| **Top bar** | Logo, inline project-name edit, global task search with autocomplete, Add Task button, theme toggle |
| **Stats strip** | Live counters for Total Tasks, In Progress, Done, and High Priority; overall progress bar |
| **Kanban columns** | Section colour dot, task count badge, inline rename input, contextual menu (Rename / Delete) |
| **Task cards** | Priority left-stripe, tag pills, creation date, priority badge; done-column cards are dimmed with strikethrough titles |
| **Sidebar — Progress** | Animated SVG donut chart showing overall completion % with a per-section breakdown bar chart |
| **Sidebar — Tags** | Live tag management: create, view, and delete tags from one place |
| **Sidebar — Priority legend** | Quick-reference colour guide |
| **Sidebar — Notes** | Rich-text project notes (Quill editor) |

### Code Quality Improvements

- `ChangeDetectionStrategy.OnPush` on the main board component for better performance
- `takeUntil(destroy$)` pattern on all subscriptions — no memory leaks
- `debounceTime(300)` on the search input
- Replaced all `==`/`!=` with `===`/`!==`
- Removed all `console.log` calls and dead commented-out code
- Replaced all `alert()` calls with the app's own modal notification service
- Schema versioning system for `.prj` files (see below)

---

## Project File Schema Versioning

`.prj` files carry a `schemaVersion` field. When a file saved by an older version is opened, a migration chain runs automatically to fill in any fields that didn't exist yet — existing data is never lost.

To add a new field in a future release:
1. Bump `CURRENT_SCHEMA_VERSION` in `electron.service.ts`
2. Add one entry to the `MIGRATIONS` map with the old version as the key and a function that returns the project with the new field filled in at a safe default

Files without a `schemaVersion` field are treated as v0 and migrated forward.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 14+
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
npm run build
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
| `npm run build` | Build Angular app to `/dist` |
| `npm run build:prod` | Production build with AOT |
| `npm run electron:local` | Build and launch in Electron |
| `npm run electron:build` | Build and package as a distributable |

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
          electron/electron.service.ts  # All file I/O, IPC, project state
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

## Public Releases

Built installers are published at: https://github.com/jviaches/projscope-tasks

---

## Contributing

Collaboration is welcome in any form:

- **Designer** — help craft an even more compelling UI
- **Developer** — bug fixes, new features, refactoring, peer review
- **Tester** — find rough edges and report issues

Open an issue or a pull request to get started.
