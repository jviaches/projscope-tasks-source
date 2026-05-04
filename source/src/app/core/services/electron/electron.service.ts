import { Injectable, NgZone } from "@angular/core";

import { ipcRenderer, webFrame, remote, dialog } from "electron";
import * as fs from "fs";

import { Project, Task } from "../../models/project.model";
import { ProgramUpdate } from "../../models/update.model";
import { AppSettings } from "../../models/appsettings.model";
import { NotificationService } from "../notification.service";
import { Router } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";
import { Title } from "@angular/platform-browser";
import { AboutComponent } from "../../../about/about.component";
import { TaskViewComponent } from "../../../task/task-view/task-view.component";
import { ThemeService } from "../theme.service";

/**
 * Prefix for the Map key of projects that have not yet been saved to disk.
 * Each new project gets a unique key: __new__0, __new__1, …
 */
const UNSAVED_PREFIX = "__new__";

const isUnsaved = (path: string) => path.startsWith(UNSAVED_PREFIX);

/** Shape of each entry emitted by openProjectsList$ for the tab bar. */
export interface ProjectEntry {
  path: string;   // file path, or __new__N key for an unsaved project
  name: string;
  dirty: boolean;
}

@Injectable({
  providedIn: "root",
})
export class ElectronService {
  public static readonly PAGE_TITLE = "ProjScope Tasks";

  // Bump this and add an entry to MIGRATIONS whenever the Project shape changes.
  private static readonly CURRENT_SCHEMA_VERSION = 2;

  private static readonly MIGRATIONS: Record<number, (p: any) => any> = {
    0: (p: any) => ({
      ...p,
      schemaVersion: 1,
      notes: p.notes ?? "",
      tags: (p.tags ?? []).map((t: any) => ({
        id: t.id ?? 0,
        name: t.name ?? "",
        color: t.color ?? "#607D8B",
      })),
      sections: (p.sections ?? []).map((s: any) => ({
        orderIndex: s.orderIndex ?? 0,
        name: s.name ?? "Section",
        tasks: (s.tasks ?? []).map((t: any) => ({
          id: t.id ?? 0,
          title: t.title ?? "",
          content: t.content ?? "",
          priority: t.priority ?? 1,
          tags: t.tags ?? [],
          orderIndex: t.orderIndex ?? 0,
          creationDate: t.creationDate ?? new Date().toISOString(),
        })),
      })),
    }),
    1: (p: any) => ({
      ...p,
      schemaVersion: 2,
      sections: (p.sections ?? []).map((s: any) => ({
        ...s,
        tasks: (s.tasks ?? []).map((t: any) => ({
          ...t,
          dueDate: t.dueDate ?? null,
        })),
      })),
    }),
  };

  CryptoJS = require("crypto-js");
  private readonly encryptionKey = "321c3c23-cbf1-4a30-938d-f8bd80757a0e";

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  fs: typeof fs;
  dialog: typeof dialog;

  appSettings: AppSettings;

  // ── Multi-project workspace state ─────────────────────────────────────────
  /** Counter for generating unique keys for new unsaved projects. */
  private _newProjectCounter = 0;

  /** All loaded projects, keyed by file path or __new__N for unsaved ones. */
  private _loadedProjects = new Map<string, Project>();
  /** Per-project dirty flags. */
  private _projectDirty = new Map<string, boolean>();
  /** Per-project last-used task ID counters. */
  private _lastTaskIdMap = new Map<string, number>();

  /** The key (file path or __new__N) of the currently active project. */
  activeProjectPath = "";

  /** Reactive list of all open projects — drives the tab bar. */
  openProjectsList$ = new BehaviorSubject<ProjectEntry[]>([]);
  // ─────────────────────────────────────────────────────────────────────────

  /** The currently active project as a reactive observable. */
  project: BehaviorSubject<Project> = new BehaviorSubject(null);
  systemUpdateMessage: BehaviorSubject<ProgramUpdate> = new BehaviorSubject(null);

  /** Emits update-check state strings to interested subscribers (e.g. About dialog). */
  updateCheckState$ = new Subject<string>();

  // ── Computed / backward-compat properties ────────────────────────────────

  /** Real file path of the active project, or '' for an unsaved project. */
  get filePath(): string {
    return isUnsaved(this.activeProjectPath) ? "" : this.activeProjectPath;
  }

  /** True if the currently active project has unsaved changes. */
  get dataChangeDetected(): boolean {
    return this._projectDirty.get(this.activeProjectPath) ?? false;
  }
  set dataChangeDetected(v: boolean) {
    if (this.activeProjectPath) {
      this._projectDirty.set(this.activeProjectPath, v);
      this.refreshOpenProjectsList();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private notificationService: NotificationService,
    private titleService: Title,
    private themeService: ThemeService
  ) {
    if (this.isElectron) {
      this.ipcRenderer = window.require("electron").ipcRenderer;
      this.webFrame = window.require("electron").webFrame;
      this.remote = window.require("electron").remote;
      this.fs = window.require("fs");
      this.dialog = this.remote.dialog;

      this.systemUpdateMessage.next({ releaseNotes: null, releaseName: "" });
      this.loadAppSettings();

      // ── Startup ──────────────────────────────────────────────────────────
      // main.ts sends this after did-finish-load with CLI path (or null).
      this.ipcRenderer.on("startup-load", (event, cliPath: string | null) => {
        this.ngZone.run(async () => {
          // CLI path takes priority — open just that one file.
          if (cliPath) {
            if (this.fs.existsSync(cliPath)) {
              const loaded = await this.loadProjectFromPath(cliPath, { switchTo: true });
              if (loaded) {
                this.ipcRenderer.send("close-project-enable", true);
                this.redirectTo("/project", false);
              }
            }
            return;
          }

          // Restore all previously open projects from settings.
          let pathsToLoad: string[] = (this.appSettings?.openProjectPaths ?? [])
            .filter((p) => this.fs.existsSync(p));

          // Backward-compat: if no openProjectPaths, fall back to lastProjectPath.
          if (pathsToLoad.length === 0 && this.appSettings?.lastProjectPath) {
            if (this.fs.existsSync(this.appSettings.lastProjectPath)) {
              pathsToLoad = [this.appSettings.lastProjectPath];
            } else {
              this.appSettings.lastProjectPath = "";
              this.saveAppSettings();
            }
          }

          if (pathsToLoad.length === 0) return;

          const preferred = this.appSettings?.lastProjectPath ?? pathsToLoad[0];
          let navigated = false;

          for (const p of pathsToLoad) {
            const shouldSwitch = p === preferred;
            const loaded = await this.loadProjectFromPath(p, { switchTo: shouldSwitch });
            if (loaded && !navigated) {
              navigated = true;
              this.ipcRenderer.send("close-project-enable", true);
              this.redirectTo("/project", false);
            }
          }

          // Guarantee the preferred project is active after the loop.
          if (preferred && this._loadedProjects.has(preferred)) {
            this.switchProject(preferred);
          }
        });
      });

      // ── File menu handlers ───────────────────────────────────────────────
      this.ipcRenderer.on("new-project", (event, arg) => {
        this.ngZone.run(() => {
          this.newProject().then(() => {
            this.redirectTo("/project", false);
          });
        });
      });

      this.ipcRenderer.on("save-project", (event, arg) => {
        this.ngZone.run(() => {
          if (this.project.value === null) {
            this.notificationService.showActionConfirmationFail("No active project!");
          } else {
            this.saveProject(JSON.stringify(this.project.value));
            this.notificationService.showActionConfirmationSuccess("Project has been saved.");
          }
        });
      });

      this.ipcRenderer.on("save-as-project", (event, arg) => {
        this.ngZone.run(() => {
          if (this.project.value === null) {
            this.notificationService.showActionConfirmationFail("No active project!");
          } else {
            this.saveAsProject(JSON.stringify(this.project.value));
          }
        });
      });

      this.ipcRenderer.on("open-project", (event, arg) => {
        this.ngZone.run(() => {
          this.addProject().then((loaded) => {
            if (loaded) {
              this.ipcRenderer.send("close-project-enable", true);
              this.redirectTo("/project", false);
            }
          });
        });
      });

      this.ipcRenderer.on("close-project", (event, arg) => {
        this.ngZone.run(() => {
          this.closeProject();
        });
      });

      this.ipcRenderer.on("exit", (event, arg) => {
        this.ngZone.run(() => {
          this.exitProgram();
        });
      });

      this.ipcRenderer.on("about", (event, arg) => {
        this.ngZone.run(() => {
          this.notificationService.showModalComponent(AboutComponent, "About", "");
        });
      });

      // ── Auto-update events ───────────────────────────────────────────────
      this.ipcRenderer.on("update-downloaded", (event, releaseNotes, releaseName) => {
        this.systemUpdateMessage.next({
          releaseNotes: (releaseNotes as string) ?? null,
          releaseName: (releaseName as string) ?? "",
        });
        this.ngZone.run(() => this.updateCheckState$.next(`available:${releaseName}`));
      });

      this.ipcRenderer.on("checking-for-update", () => {
        this.ngZone.run(() => this.updateCheckState$.next("checking"));
      });

      this.ipcRenderer.on("update-available", (_e, version: string) => {
        this.ngZone.run(() => this.updateCheckState$.next(`available:${version}`));
      });

      this.ipcRenderer.on("update-not-available", () => {
        this.ngZone.run(() => this.updateCheckState$.next("not-available"));
      });

      this.ipcRenderer.on("update-error", (_e, msg: string) => {
        this.ngZone.run(() => this.updateCheckState$.next(`error:${msg}`));
      });
    }
  }

  // ── Project lifecycle ────────────────────────────────────────────────────

  exitProgram() {
    const anyDirty = Array.from(this._projectDirty.values()).some((v) => v);
    if (!anyDirty) {
      this.ipcRenderer.send("app-close", null);
      return;
    }
    this.notificationService
      .showYesNoModalMessage("Some projects have unsaved changes. Exit anyway?")
      .subscribe((response) => {
        if (response === "yes") {
          this.ipcRenderer.send("app-close", null);
        }
      });
  }

  /**
   * Creates a new empty project and adds it as a tab.
   * If an unsaved project tab already exists, switches to it instead.
   */
  newProject(): Promise<Project> {
    return new Promise<Project>((resolve) => {
      const key = `${UNSAVED_PREFIX}${this._newProjectCounter++}`;
      const proj = this.defaultProject;
      this._loadedProjects.set(key, proj);
      this._projectDirty.set(key, false);
      this._setLastTaskIdForPath(key, proj);
      this.ipcRenderer.send("close-project-enable", true);
      this.switchProject(key);
      this.refreshOpenProjectsList();
      this._syncSettingsOpenPaths();
      resolve(proj);
    });
  }

  updateProjectName(projName: string) {
    this.setDataChange();
    this.project.value.name = projName;
    this.project.next(this.project.value);
    this.refreshOpenProjectsList();
  }

  /** Close the currently active project tab (with save prompt if dirty). */
  closeProject() {
    this.closeProjectTab(this.activeProjectPath);
  }

  /**
   * Close a specific project tab.
   * Prompts the user to confirm if that project has unsaved changes.
   */
  closeProjectTab(path: string) {
    if (!this._loadedProjects.has(path)) return;
    const isDirty = this._projectDirty.get(path) ?? false;
    if (isDirty) {
      this.notificationService
        .showYesNoModalMessage("This project has unsaved changes. Close anyway?")
        .subscribe((response) => {
          if (response === "yes") this._doCloseProject(path);
        });
    } else {
      this._doCloseProject(path);
    }
  }

  private _doCloseProject(path: string) {
    this._loadedProjects.delete(path);
    this._projectDirty.delete(path);
    this._lastTaskIdMap.delete(path);

    if (this._loadedProjects.size === 0) {
      // No more open projects → go home.
      this.ipcRenderer.send("close-project-enable", false);
      this.activeProjectPath = "";
      this.project.next(null);
      this.setPageTitle(false);
    } else {
      // Switch to the first remaining project.
      const remaining = Array.from(this._loadedProjects.keys());
      this.activeProjectPath = "";
      this.switchProject(remaining[0]);
    }

    this._syncSettingsOpenPaths();
    this.refreshOpenProjectsList();

    if (this._loadedProjects.size === 0) {
      this.redirectTo("/", false);
    }
  }

  /** Switch the active project to the given path. */
  switchProject(path: string) {
    if (!this._loadedProjects.has(path)) return;
    this.activeProjectPath = path;
    this.project.next(this._loadedProjects.get(path));
    this.setPageTitle(this.dataChangeDetected);

    // Persist the active path so it is focused again on next launch.
    if (this.appSettings && !isUnsaved(path)) {
      this.appSettings.lastProjectPath = path;
      this.saveAppSettings();
    }
  }

  /**
   * Open a file dialog and load the chosen .prj file into the workspace
   * as a new tab (or switch to it if already open).
   */
  addProject(): Promise<Project | null> {
    return new Promise<Project | null>((resolve) => {
      const file = this.dialog.showOpenDialogSync(null, {
        properties: ["openFile"],
        filters: [{ name: "Project", extensions: ["prj"] }],
      });
      if (file !== undefined) {
        this.loadProjectFromPath(file[0], { switchTo: true }).then(resolve);
      } else {
        resolve(null);
      }
    });
  }

  /** Kept for backward compatibility — delegates to addProject(). */
  loadProject(): Promise<Project | null> {
    return this.addProject();
  }

  /** @internal Used by startup-load and addProject. */
  resetProject() {
    this._doCloseProject(this.activeProjectPath);
  }

  saveProject(content: string) {
    if (this.filePath === "") {
      this.saveAsProject(content);
    } else {
      const encryptedContent = this.encrypt(content);
      this.fs.writeFile(this.filePath, encryptedContent, (err) => {
        if (err) {
          this.notificationService.showModalMessage(
            "Save Error",
            `Failed to save project: ${err.message}`
          );
          return;
        }
        this.dataChangeDetected = false;
        this.setPageTitle(false);
        this.refreshOpenProjectsList();
      });
    }
  }

  saveAsProject(content: string) {
    const encryptedContent = this.encrypt(content);

    let filepath = this.dialog.showSaveDialogSync(null, {
      properties: ["createDirectory"],
      filters: [{ name: "Project", extensions: ["prj"] }],
    });

    if (filepath === undefined) return;

    // Linux GTK dialogs do not auto-append the extension from the filter.
    if (!filepath.endsWith(".prj")) filepath += ".prj";

    this.fs.writeFile(filepath, encryptedContent, (err) => {
      if (err) {
        this.notificationService.showModalMessage(
          "Save Error",
          `Failed to save project: ${err.message}`
        );
        return;
      }

      // Re-key the map entry if the path changed (e.g. __new__N → real path).
      const oldPath = this.activeProjectPath;
      if (oldPath !== filepath) {
        const proj = this._loadedProjects.get(oldPath);
        const lastId = this._lastTaskIdMap.get(oldPath) ?? 0;
        this._loadedProjects.delete(oldPath);
        this._loadedProjects.set(filepath, proj);
        this._lastTaskIdMap.delete(oldPath);
        this._lastTaskIdMap.set(filepath, lastId);
        this._projectDirty.delete(oldPath);
        this.activeProjectPath = filepath;
      }

      this._projectDirty.set(filepath, false);
      this.ipcRenderer.send("close-project-enable", true);
      this.setPageTitle(false);
      if (this.appSettings) {
        this.appSettings.lastProjectPath = filepath;
        this._syncSettingsOpenPaths();
      }
      this.refreshOpenProjectsList();
      this.notificationService.showActionConfirmationSuccess("Project has been saved.");
    });
  }

  /**
   * Load a project from disk and add it to the open workspace.
   * If the file is already loaded, just switches to it (no re-read).
   */
  loadProjectFromPath(
    filePath: string,
    opts: { switchTo?: boolean } = { switchTo: true }
  ): Promise<Project> {
    return new Promise<Project>((resolve) => {
      // Already in workspace → just switch.
      if (this._loadedProjects.has(filePath)) {
        if (opts.switchTo !== false) this.switchProject(filePath);
        resolve(this._loadedProjects.get(filePath));
        return;
      }

      this.fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          this.notificationService.showModalMessage(
            "Load Error",
            `Failed to read file: ${err.message}`
          );
          resolve(null);
          return;
        }
        try {
          const decryptedContent = this.decrypt(data);
          const raw = JSON.parse(decryptedContent);
          if (!this.isValidProject(raw)) {
            throw new Error("Invalid project structure");
          }
          const parsed = this.migrateProject(raw);

          this._loadedProjects.set(filePath, parsed);
          this._projectDirty.set(filePath, false);
          this._setLastTaskIdForPath(filePath, parsed);

          if (opts.switchTo !== false) {
            this.switchProject(filePath);
          }

          if (this.appSettings) {
            this.appSettings.lastProjectPath = filePath;
          }
          this._syncSettingsOpenPaths();
          this.refreshOpenProjectsList();
          resolve(parsed);
        } catch (error) {
          this.notificationService.showModalMessage(
            "Error",
            "Incorrect or corrupted projscope file!"
          );
          resolve(null);
        }
      });
    });
  }

  // ── Task management ──────────────────────────────────────────────────────

  createTask(sectionIndex: number = 0) {
    this.notificationService
      .showModalComponent(TaskViewComponent, "", { sectionIndex })
      .subscribe((result) => {
        if (result !== "FAIL") {
          const task: Task = {
            id: this.getNextTaskId(),
            title: result.caption,
            content: result.text,
            priority: result.priority.value,
            tags: result.tags ?? [],
            orderIndex: result.section.value,
            creationDate: new Date(),
            dueDate: result.dueDate ?? null,
          };
          this.setDataChange();
          this.project.value.sections[result.section.value].tasks.push(task);
          this.project.next(this.project.value);
        }
      });
  }

  deleteTask(taskId: number, sectionIndex: number) {
    this.notificationService
      .showYesNoModalMessage("Delete this task?")
      .subscribe((result) => {
        if (result === "yes") {
          const taskIndex = this.project.value.sections[sectionIndex - 1].tasks.findIndex(
            (task) => task.id === taskId
          );
          this.project.value.sections[sectionIndex - 1].tasks.splice(taskIndex, 1);
          this.setDataChange();
          this.project.next(this.project.value);
        }
      });
  }

  // ── Misc helpers ─────────────────────────────────────────────────────────

  redirectTo(uri: string, fromHomePage: boolean) {
    if (fromHomePage) {
      this.router.navigateByUrl(uri);
    } else {
      this.router
        .navigateByUrl("/", { skipLocationChange: true })
        .then(() => this.router.navigate([uri]));
    }
  }

  public get defaultProject(): Project {
    return {
      schemaVersion: ElectronService.CURRENT_SCHEMA_VERSION,
      version: this.appSettings?.version || "DEBUG",
      name: "New Project",
      notes: "",
      sections: [
        { orderIndex: 1, name: "Backlog", tasks: [] },
        { orderIndex: 2, name: "To Do", tasks: [] },
        { orderIndex: 3, name: "In Progress", tasks: [] },
        { orderIndex: 4, name: "Done", tasks: [] },
      ],
      tags: [],
    };
  }

  setDataChange() {
    this.dataChangeDetected = true;
    this.setPageTitle(true);
    if (this.filePath !== "") {
      this.saveProject(JSON.stringify(this.project.value));
    }
    this.refreshOpenProjectsList();
  }

  setPageTitle(change: boolean) {
    if (this.filePath === "") {
      this.titleService.setTitle(ElectronService.PAGE_TITLE);
    } else {
      this.titleService.setTitle(
        change
          ? `${ElectronService.PAGE_TITLE} - ${this.filePath}*`
          : `${ElectronService.PAGE_TITLE} - ${this.filePath}`
      );
    }
  }

  dialogContent(): string {
    const anyDirty = Array.from(this._projectDirty.values()).some((v) => v);
    return anyDirty ? "Project is not saved!" : "";
  }

  getNextTaskId(): number {
    const current = this._lastTaskIdMap.get(this.activeProjectPath) ?? 0;
    const next = current + 1;
    this._lastTaskIdMap.set(this.activeProjectPath, next);
    return next;
  }

  encrypt(content: string): string {
    return this.CryptoJS.AES.encrypt(content, this.encryptionKey).toString();
  }

  decrypt(ciphertext: string): string {
    const bytes = this.CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
    return bytes.toString(this.CryptoJS.enc.Utf8);
  }

  updateTheme(themeId: number) {
    this.themeService.setActiveThemeById(themeId);
    this.appSettings.themeId = themeId;
    this.saveAppSettings();
  }

  getActiveThemeId(): number {
    return this.themeService.getActiveTheme().id;
  }

  /** Always returns the live version from package.json via Electron. */
  get appVersion(): string {
    if (this.remote?.app) {
      return this.remote.app.getVersion();
    }
    return this.appSettings?.version ?? "DEBUG";
  }

  /** Triggers a manual update check — main process handles the rest via IPC events. */
  checkForUpdates(): void {
    if (this.ipcRenderer) {
      this.ipcRenderer.send("check-for-updates");
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Rebuild and emit the current open-projects list for the tab bar. */
  private refreshOpenProjectsList() {
    const list: ProjectEntry[] = Array.from(this._loadedProjects.entries()).map(
      ([path, proj]) => ({
        path,
        name: proj.name,
        dirty: this._projectDirty.get(path) ?? false,
      })
    );
    this.openProjectsList$.next(list);
  }

  /** Persist the set of open project paths to settings.json. */
  private _syncSettingsOpenPaths() {
    if (!this.appSettings) return;
    this.appSettings.openProjectPaths = Array.from(this._loadedProjects.keys()).filter(
      (k) => !isUnsaved(k)
    );
    this.saveAppSettings();
  }

  private _setLastTaskIdForPath(path: string, project: Project) {
    if (!project) {
      this._lastTaskIdMap.set(path, 0);
      return;
    }
    let maxId = 0;
    project.sections.forEach((section) => {
      const localMax = Math.max(0, ...section.tasks.map((t) => t.id));
      if (localMax > maxId) maxId = localMax;
    });
    this._lastTaskIdMap.set(path, maxId);
  }

  private migrateProject(raw: unknown): Project {
    let p: any = raw;
    const from: number = typeof p.schemaVersion === "number" ? p.schemaVersion : 0;
    for (let v = from; v < ElectronService.CURRENT_SCHEMA_VERSION; v++) {
      const migrate = ElectronService.MIGRATIONS[v];
      if (migrate) p = migrate(p);
    }
    p.schemaVersion = ElectronService.CURRENT_SCHEMA_VERSION;
    return p as Project;
  }

  private isValidProject(data: unknown): data is Project {
    if (!data || typeof data !== "object") return false;
    const p = data as Record<string, unknown>;
    return typeof p.name === "string" && Array.isArray(p.sections);
  }

  private saveAppSettings() {
    this.fs.writeFile("settings.json", JSON.stringify(this.appSettings), (err) => {
      if (err) {
        console.error("Failed to save app settings:", err);
      }
    });
  }

  private loadAppSettings() {
    this.fs.readFile("settings.json", "utf-8", (err, data) => {
      if (err) {
        this.appSettings = new AppSettings();
        this.themeService.setActiveThemeById(1);
        this.saveAppSettings();
        return;
      }
      this.appSettings = JSON.parse(data);

      // Migrate: ensure openProjectPaths exists (backward compat with v<2.0.8 settings).
      if (!Array.isArray(this.appSettings.openProjectPaths)) {
        this.appSettings.openProjectPaths = this.appSettings.lastProjectPath
          ? [this.appSettings.lastProjectPath]
          : [];
      }

      this.themeService.setActiveThemeById(this.appSettings.themeId);
    });
  }
}
