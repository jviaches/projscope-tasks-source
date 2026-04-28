# Contributing to ProjScope Tasks

Thank you for taking the time to contribute! This document explains how to get the project running locally, the conventions we follow, and what a good pull request looks like.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Branch & Commit Conventions](#branch--commit-conventions)
4. [Pull Request Checklist](#pull-request-checklist)
5. [Reporting Bugs](#reporting-bugs)
6. [Suggesting Features](#suggesting-features)
7. [Code Style](#code-style)

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 LTS |
| npm | 9+ |
| Git | any recent |

### Fork & clone

```bash
# 1. Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/projscope-tasks-source.git
cd projscope-tasks-source/source
npm install
```

### Run in dev mode (hot-reload)

```bash
npm start          # starts Electron + Angular dev server
```

### Build & package

```bash
npm run build:dev  # fast dev build
npm run build:prod # production build (AOT)
npm run electron:build  # creates installer in release/
```

---

## Development Workflow

1. **Create a branch** from `main` (see naming below).
2. **Make your changes** — keep commits small and focused.
3. **Build** (`npm run build:dev`) and manually smoke-test in the running app.
4. **Push** your branch and open a pull request against `main`.

---

## Branch & Commit Conventions

### Branches

```
feat/short-description       # new feature
fix/short-description        # bug fix
chore/short-description      # tooling, deps, CI
docs/short-description       # documentation only
```

### Commits — [Conventional Commits](https://www.conventionalcommits.org/)

```
feat: add drag-to-section animation
fix: dropdown arrow invisible in dark theme
chore: bump electron-builder to 24
docs: document schema migration steps
```

---

## Pull Request Checklist

Before marking your PR ready for review, make sure:

- [ ] `npm run build:dev` exits with no errors
- [ ] The change works in both **light** and **dark** theme
- [ ] New UI elements use CSS variables (`var(--text-primary)`, `var(--input-bg)`, etc.) — no hardcoded colours
- [ ] No `console.log` calls left in production code
- [ ] The PR description explains **what** changed and **why**

---

## Reporting Bugs

Use the **[Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)** issue template. Please include:

- OS and version (Windows 11, macOS 14, Ubuntu 22.04 …)
- App version (shown in Help → About)
- Steps to reproduce
- Expected vs actual behaviour
- Screenshots if relevant

---

## Suggesting Features

Use the **[Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)** template. Describe the problem you're trying to solve — not just the solution — so we can discuss the best approach together.

---

## Code Style

- **TypeScript** — strict mode, `===`/`!==` always, no `any` if avoidable
- **Angular** — `ChangeDetectionStrategy.OnPush`, `takeUntil(destroy$)` for subscriptions
- **SCSS** — use existing CSS variables from `src/app/core/themes/theme.ts`; no hardcoded colour values
- **Formatting** — follow the existing indentation (2 spaces); ESLint is configured in the project

---

Questions? Open a [discussion](https://github.com/jviaches/projscope-tasks-source/discussions) or an issue — we're happy to help.
