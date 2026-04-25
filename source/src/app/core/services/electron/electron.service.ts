import { Injectable, NgZone } from "@angular/core";

import { ipcRenderer, webFrame, remote, dialog } from "electron";
import * as fs from "fs";

import { Project, Task } from "../../models/project.model";
import { ProgramUpdate } from "../../models/update.model";
import { AppSettings } from "../../models/appsettings.model";
import { NotificationService } from "../notification.service";
import { Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { Title } from "@angular/platform-browser";
import { AboutComponent } from "../../../about/about.component";
import { TaskViewComponent } from "../../../task/task-view/task-view.component";
import { ThemeService } from "../theme.service";

@Injectable({
  providedIn: "root",
})
export class ElectronService {
  public static readonly PAGE_TITLE = "ProjScope Tasks";

  CryptoJS = require("crypto-js");
  private readonly encryptionKey = "321c3c23-cbf1-4a30-938d-f8bd80757a0e";

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  fs: typeof fs;
  dialog: typeof dialog;

  appSettings: AppSettings;
  project: BehaviorSubject<Project> = new BehaviorSubject(null);
  systemUpdateMessage: BehaviorSubject<ProgramUpdate> = new BehaviorSubject(null);
  filePath: string = "";
  dataChangeDetected = false;
  lastTaskId: number = 0;

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

      this.ipcRenderer.on("new-project", (event, arg) => {
        this.ngZone.run(() => {
          this.newProject().then(() => {
            this.redirectTo("/project", false);
          });
        });
      });

      this.ipcRenderer.on("save-project", (event, arg) => {
        this.ngZone.run(() => {
          if (this.project === null) {
            this.notificationService.showActionConfirmationFail("No active project!");
          } else {
            this.saveProject(JSON.stringify(this.project.value));
            this.notificationService.showActionConfirmationSuccess("Project has been saved.");
          }
        });
        this.ipcRenderer.send("close-project-enable", true);
      });

      this.ipcRenderer.on("save-as-project", (event, arg) => {
        this.ngZone.run(() => {
          if (this.project === null) {
            this.notificationService.showActionConfirmationFail("No active project!");
          } else {
            this.saveAsProject(JSON.stringify(this.project.value));
            this.notificationService.showActionConfirmationSuccess("Project has been saved.");
          }
        });
        this.ipcRenderer.send("close-project-enable", true);
      });

      this.ipcRenderer.on("open-project", (event, arg) => {
        this.ngZone.run(() => {
          this.loadProject().then((value) => {
            if (value === null) {
              this.resetProject();
            } else {
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

      this.ipcRenderer.on("update-downloaded", (event, releaseNotes, releaseName) => {
        this.systemUpdateMessage.next({
          releaseNotes: (releaseNotes as string) ?? null,
          releaseName: (releaseName as string) ?? "",
        });
      });
    }
  }

  exitProgram() {
    this.notificationService
      .showYesNoModalMessage(this.dialogContent())
      .subscribe((response) => {
        if (response === "yes") {
          this.ipcRenderer.send("app-close", null);
        }
      });
  }

  newProject() {
    return new Promise<Project>((resolve) => {
      if (this.project.value === null) {
        this.ipcRenderer.send("close-project-enable", true);
        this.filePath = "";
        this.setPageTitle(false);
        this.project.next(this.defaultProject);
        this.setLastTaskId(this.defaultProject);
        resolve(this.project.value);
      } else {
        this.notificationService
          .showYesNoModalMessage(this.dialogContent())
          .subscribe((response) => {
            if (response === "yes") {
              this.ipcRenderer.send("close-project-enable", true);
              this.project.next(this.defaultProject);
              this.filePath = "";
              this.setPageTitle(false);
              this.setLastTaskId(this.defaultProject);
              resolve(this.project.value);
            }
          });
      }
    });
  }

  updateProjectName(projName: string) {
    this.setDataChange();
    this.project.value.name = projName;
    this.project.next(this.project.value);
  }

  closeProject() {
    this.notificationService
      .showYesNoModalMessage(this.dialogContent())
      .subscribe((response) => {
        if (response === "yes") {
          this.resetProject();
        }
      });
  }

  resetProject() {
    this.ipcRenderer.send("close-project-enable", false);
    this.project = new BehaviorSubject(null);
    this.filePath = "";
    this.dataChangeDetected = false;
    this.setPageTitle(false);
    this.setLastTaskId(null);
    this.redirectTo("/", false);
    this.loadAppSettings();
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
      });
    }
  }

  saveAsProject(content: string) {
    const encryptedContent = this.encrypt(content);

    const filepath = this.dialog.showSaveDialogSync(null, {
      properties: ["createDirectory"],
      filters: [{ name: "Project", extensions: ["prj"] }],
    });

    if (filepath === undefined) {
      return;
    }

    this.filePath = filepath;

    this.fs.writeFile(filepath, encryptedContent, (err) => {
      if (err) {
        this.notificationService.showModalMessage(
          "Save Error",
          `Failed to save project: ${err.message}`
        );
        return;
      }
      this.ipcRenderer.send("close-project-enable", true);
      this.dataChangeDetected = false;
      this.setPageTitle(false);
    });
  }

  loadProject(): Promise<Project> {
    return new Promise<Project>((resolve) => {
      if (this.filePath !== "") {
        this.notificationService
          .showYesNoModalMessage(this.dialogContent())
          .subscribe((response) => {
            if (response === "no") {
              resolve(this.project.value);
            } else {
              const file = this.dialog.showOpenDialogSync(null, {
                properties: ["openFile"],
                filters: [{ name: "Project", extensions: ["prj"] }],
              });

              this.fs.readFile(file[0], "utf-8", (err, data) => {
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
                  const parsed = JSON.parse(decryptedContent);
                  if (!this.isValidProject(parsed)) {
                    throw new Error("Invalid project structure");
                  }
                  this.filePath = file[0];
                  this.setPageTitle(false);
                  this.setLastTaskId(parsed);
                  this.project.next(parsed);
                  resolve(this.project.value);
                } catch (error) {
                  this.notificationService.showModalMessage(
                    "Error",
                    "Incorrect or corrupted projscope file!"
                  );
                  resolve(null);
                }
              });
            }
          });
      } else {
        const file = this.dialog.showOpenDialogSync(null, {
          properties: ["openFile"],
          filters: [{ name: "Project", extensions: ["prj"] }],
        });

        if (file !== undefined) {
          this.fs.readFile(file[0], "utf-8", (err, data) => {
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
              const parsed = JSON.parse(decryptedContent);
              if (!this.isValidProject(parsed)) {
                throw new Error("Invalid project structure");
              }
              this.filePath = file[0];
              this.setPageTitle(false);
              this.setLastTaskId(parsed);
              this.project.next(parsed);
              resolve(this.project.value);
            } catch (error) {
              this.notificationService.showModalMessage(
                "Error",
                "Incorrect or corrupted projscope file!"
              );
              resolve(null);
            }
          });
        }
      }
    });
  }

  createTask() {
    this.notificationService
      .showModalComponent(TaskViewComponent, "", {})
      .subscribe((result) => {
        if (result !== "FAIL") {
          const task: Task = {
            id: this.getNextTaskId(),
            title: result.caption,
            content: result.text,
            priority: result.priority.value,
            tags: [],
            orderIndex: result.section.value,
            creationDate: new Date(),
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
    const project = {
      version: this.appSettings?.version || "DEBUG",
      name: "Project Name",
      notes: "notes..",
      sections: [
        { orderIndex: 1, name: "Backlog", tasks: [] },
        { orderIndex: 2, name: "To Do", tasks: [] },
        { orderIndex: 3, name: "In Progress", tasks: [] },
        { orderIndex: 4, name: "Done", tasks: [] },
      ],
      tags: [],
    };
    return project;
  }

  setDataChange() {
    this.dataChangeDetected = true;
    this.setPageTitle(true);
    if (this.filePath !== "") {
      this.saveProject(JSON.stringify(this.project.value));
    }
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
    return this.dataChangeDetected ? "Project is not saved!" : "";
  }

  getNextTaskId(): number {
    this.lastTaskId += 1;
    return this.lastTaskId;
  }

  setLastTaskId(project: Project) {
    if (!project) {
      this.lastTaskId = 0;
    } else {
      let maxTaskId = 0;
      project.sections.forEach((section) => {
        const localMaxId = Math.max(...section.tasks.map((task) => task.id));
        if (localMaxId > maxTaskId) {
          maxTaskId = localMaxId;
        }
      });
      this.lastTaskId = maxTaskId;
    }
  }

  encrypt(content: string): string {
    return this.CryptoJS.AES.encrypt(content, this.encryptionKey).toString();
  }

  decrypt(ciphertext: string): string {
    const bytes = this.CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
    return bytes.toString(this.CryptoJS.enc.Utf8);
  }

  private isValidProject(data: unknown): data is Project {
    if (!data || typeof data !== "object") return false;
    const p = data as Record<string, unknown>;
    return (
      typeof p.name === "string" &&
      typeof p.version === "string" &&
      Array.isArray(p.sections) &&
      Array.isArray(p.tags) &&
      (p.sections as unknown[]).every(
        (s: unknown) =>
          s &&
          typeof (s as Record<string, unknown>).orderIndex === "number" &&
          typeof (s as Record<string, unknown>).name === "string" &&
          Array.isArray((s as Record<string, unknown>).tasks)
      )
    );
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
      this.themeService.setActiveThemeById(this.appSettings.themeId);
    });
  }

  updateTheme(themeId: number) {
    this.themeService.setActiveThemeById(themeId);
    this.appSettings.themeId = themeId;
    this.saveAppSettings();
  }

  getActiveThemeId(): number {
    return this.themeService.getActiveTheme().id;
  }
}
