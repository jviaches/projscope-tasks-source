import { Component, OnInit } from "@angular/core";
import { ElectronService } from "../../core/services";
import { ThemeService } from "../../core/services/theme.service";
import { RecentProject } from "../../core/models/appsettings.model";

@Component({
  selector: "app-project-list",
  templateUrl: "./project-list.component.html",
  styleUrls: ["./project-list.component.scss"],
})
export class ProjectListComponent implements OnInit {
  constructor(
    private themeService: ThemeService,
    private electronService: ElectronService
  ) {}

  ngOnInit(): void {
    this.themeService.setLightTheme();
  }

  get recentProjects(): RecentProject[] {
    return this.electronService.appSettings?.recentProjects ?? [];
  }

  get version(): string {
    return this.electronService.appVersion;
  }

  get isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }

  loadProject() {
    this.electronService.loadProject().then((loaded) => {
      if (!loaded) return;
      this.electronService.ipcRenderer.send("close-project-enable", true);
      this.electronService.redirectTo("/project", false);
    });
  }

  newProject() {
    this.electronService.newProject().then(() => {
      this.electronService.ipcRenderer.send("close-project-enable", true);
      this.electronService.redirectTo("/project", false);
    });
  }

  exitProject() {
    this.electronService.exitProgram();
  }

  openRecent(path: string) {
    this.electronService.loadProjectFromPath(path, { switchTo: true }).then((loaded) => {
      if (!loaded) return;
      this.electronService.ipcRenderer.send("close-project-enable", true);
      this.electronService.redirectTo("/project", false);
    });
  }

  openGitHub() {
    this.electronService.openExternal("https://github.com/jviaches/projscope-tasks");
  }

  openCoffee() {
    this.electronService.openExternal("https://www.buymeacoffee.com/jviaches");
  }
}
