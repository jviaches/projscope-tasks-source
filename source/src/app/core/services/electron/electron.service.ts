import { Injectable, NgZone } from "@angular/core";

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote, dialog } from "electron";
import * as childProcess from "child_process";
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
  encrypedSecretKey = "321c3c23-cbf1-4a30-938d-f8bd80757a0e";

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;
  dialog: typeof dialog;

  appSettings: AppSettings;
  project: BehaviorSubject<Project> = new BehaviorSubject(null);
  systemUpdateMessage: BehaviorSubject<ProgramUpdate> = new BehaviorSubject(null);
  filePath: string = "";
  dataChangeDetected = false;
  autosave: boolean = false;
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
    // Conditional imports
    if (this.isElectron) {

      this.ipcRenderer = window.require("electron").ipcRenderer;
      this.webFrame = window.require("electron").webFrame;

      // If you wan to use remote object, please set enableRemoteModule to true in main.ts
      this.remote = window.require("electron").remote;

      this.childProcess = window.require("child_process");
      this.fs = window.require("fs");
      this.dialog = this.remote.dialog;

      const newUpdate = {
        releaseNotes: null,
        releaseName: ''
      };
      this.systemUpdateMessage.next(newUpdate);
      this.loadAppSettings();


      this.ipcRenderer.on("new-project", (event, arg) => {
        this.ngZone.run(() => {
          this.newProject().then((value) => {
            this.redirectTo("/project", false);
          });
        });
      });

      this.ipcRenderer.on("save-project", (event, arg) => {
        this.ngZone.run(() => {
          if (this.project === null) {
            this.notificationService.showActionConfirmationFail(
              "No active project!"
            );
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
            this.notificationService.showActionConfirmationFail(
              "No active project!"
            );
          } else {
            this.saveAsProject(JSON.stringify(this.project.value));
            this.notificationService.showActionConfirmationSuccess("Project has been saved.");
          }
        });
        this.ipcRenderer.send("close-project-enable", true);
      });

      // this.ipcRenderer.on("auto-save-project", (event, status) => {
      //   this.ngZone.run(() => {
      //     this.notificationService.showActionConfirmationFail(
      //       status ? " Autosave enabled" : "Autosave disabled"
      //     );
      //     this.autosave = status;
      //   });
      //   this.ipcRenderer.send("close-project-enable", true);
      // });

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
          this.notificationService.showModalComponent(AboutComponent, 'About', '');
        });
      });


      // this.ipcRenderer.on('checking-for-update', () => {
      //   //this.ipcRenderer.removeAllListeners('checking-for-update');
      //   this.notificationService.showActionConfirmationSuccess('checking-for-update..');
      // });

      this.ipcRenderer.on('update-available', () => {
        //this.ipcRenderer.removeAllListeners('update-available');
        //this.notificationService.showActionConfirmationSuccess('update-available..');
      });

      // this.ipcRenderer.on('update-not-available', () => {
      //   //this.ipcRenderer.removeAllListeners('update-not-available');
      //   this.notificationService.showActionConfirmationSuccess('update-not-available..');
      // });

      // this.ipcRenderer.on('update-error', () => {
      //   //this.ipcRenderer.removeAllListeners('update-error');
      //   this.notificationService.showActionConfirmationSuccess('update-error..');
      // });

      this.ipcRenderer.on("update-downloaded", (releaseNotes, releaseName) => {

        const newUpdate = {
          releaseNotes: releaseNotes,
          releaseName: releaseName
        };
        this.systemUpdateMessage.next(newUpdate);
      });

      // this.ipcRenderer.send('app_version');
      // this.ipcRenderer.on('app_version', (event, arg) => {
      //   this.ipcRenderer.removeAllListeners('app_version');
      //   this.notificationService.showActionConfirmationSuccess('app_ver: ' + arg.version)
      // });

      // this.ipcRenderer.on('update_available', () => {
      //   this.ipcRenderer.removeAllListeners('update_available');
      //   this.notificationService.showActionConfirmationSuccess('A new update is available. Downloading now...');
      // });
    }
  }

  exitProgram() {
    this.project = new BehaviorSubject(null);
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
  }

  saveProject(content: any) {
    if (this.filePath === "") {
      this.saveAsProject(content);
    } else {
      var encryptedContent = this.encrypt(content);
      this.fs.writeFile(this.filePath, encryptedContent, (err) => {
        if (err) {
          alert("An error ocurred updating the file" + err.message);
          console.log(err);
          return;
        }
      });
    }

    this.dataChangeDetected = false;
    this.setPageTitle(false);
  }

  saveAsProject(content: any) {
    console.log(content);

    var encryptedContent = this.encrypt(content);

    var filepath = this.dialog.showSaveDialogSync(null, {
      properties: ["createDirectory"],
      filters: [{ name: "Project", extensions: ["prj"] }],
    });

    // dialog was cancelled by user
    if (filepath === undefined) {
      return;
    } else {
      this.filePath = filepath;
    }

    this.fs.writeFile(filepath, encryptedContent, (err) => {
      if (err) {
        alert("An error ocurred updating the file" + err.message);
        console.log(err);
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
              var file = this.dialog.showOpenDialogSync(null, {
                properties: ["openFile"],
                filters: [{ name: "Project", extensions: ["prj"] }],
              });

              this.fs.readFile(file[0], "utf-8", (err, data) => {
                try {
                  const decryptedContent = this.decrypt(data);

                  this.filePath = file[0];
                  this.setPageTitle(false);
                  this.setLastTaskId(JSON.parse(decryptedContent));

                  this.project.next(JSON.parse(decryptedContent));
                } catch (error) {
                  this.notificationService.showModalMessage(
                    "Error",
                    "Incorrect or corrupted projscope file!"
                  );
                  Promise.reject('Error');
                }
                resolve(this.project.value);
              });
            }
          });
      } else {
        var file = this.dialog.showOpenDialogSync(null, {
          properties: ["openFile"],
          filters: [{ name: "Project", extensions: ["prj"] }],
        });

        if (file !== undefined) {
          this.fs.readFile(file[0], "utf-8", (err, data) => {
            try {
              const decryptedContent = this.decrypt(data);
              this.filePath = file[0];
              this.setPageTitle(false);
              this.setLastTaskId(JSON.parse(decryptedContent));
              this.project.next(JSON.parse(decryptedContent));
            } catch (error) {
              this.notificationService.showModalMessage(
                "Error",
                "Incorrect or corrupted projscope file!"
              );

              Promise.reject('Error');
            }

            resolve(this.project.value);
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
    this.notificationService.showYesNoModalMessage("").subscribe((result) => {
      if (result === "yes") {

        const taskIndex = this.project.value.sections[sectionIndex - 1].tasks.findIndex((task) => task.id === taskId);
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
      version: this.appSettings?.version || 'DEBUG',
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
  }

  setPageTitle(change: boolean) {
    if (this.filePath === "") {
      this.titleService.setTitle(ElectronService.PAGE_TITLE);
    } else {
      if (change) {
        this.titleService.setTitle(
          ElectronService.PAGE_TITLE + " - " + this.filePath + "*"
        );
      } else {
        this.titleService.setTitle(
          ElectronService.PAGE_TITLE + " - " + this.filePath
        );
      }
    }
  }

  dialogContent(): string {
    return this.filePath !== "" && this.dataChangeDetected
      ? "Project is not saved!"
      : "";
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

      project.sections.forEach(section => {
        const localMaxId = Math.max(...section.tasks.map((task) => task.id))
        if (localMaxId > maxTaskId) {
          maxTaskId = localMaxId;
        }
      });

      this.lastTaskId = maxTaskId;
    }
  }

  encrypt(content: string): string {
    const ciphertext = this.CryptoJS.AES.encrypt(
      content,
      this.encrypedSecretKey
    ).toString();
    return ciphertext;
  }

  decrypt(ciphertext: string): string {
    const bytes = this.CryptoJS.AES.decrypt(ciphertext, this.encrypedSecretKey);
    const originalText = bytes.toString(this.CryptoJS.enc.Utf8);
    return originalText;
  }

  // app settings
  private saveAppSettings() {
    this.fs.writeFile('settings.cfg', JSON.stringify(this.appSettings), (err) => {
      if (err) {
        console.log(err);
        return;
      }
    });
  }

  private loadAppSettings() {
    this.fs.readFile('settings.cfg', "utf-8", (err, data) => {
      if (err) {
        this.appSettings = new AppSettings();
        this.themeService.setActiveThemeById(1);
        this.saveAppSettings();
        return;
      } else {
        this.appSettings = JSON.parse(data)
        this.themeService.setActiveThemeById(this.appSettings.themeId)

      }
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
