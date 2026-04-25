import { Component, OnInit } from "@angular/core";
import { ElectronService } from "../../core/services";
import { ThemeService } from "../../core/services/theme.service";

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

  loadProject() {
    this.electronService.loadProject().then(() => {
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
}
