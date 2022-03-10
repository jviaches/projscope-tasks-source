import { Component, OnInit } from "@angular/core";
import { ElectronService } from "./core/services";
import { TranslateService } from "@ngx-translate/core";
import { AppConfig } from "../environments/environment";
import { ProgramUpdate } from "./core/models/update.model";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit{
  updateName = "";

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService
  ) {
    this.translate.setDefaultLang("en");
    //console.log('AppConfig', AppConfig);

    if (electronService.isElectron) {
      // console.log(process.env);
      // console.log('Run in electron');
      // console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      // console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log("Run in browser");
    }
  }
  ngOnInit(): void {
    this.electronService.systemUpdateMessage.subscribe((update) => {
      if (update.releaseName !== '') {
        this.updateName = update.releaseName;
        document.getElementById("notification").classList.remove("hidden");
      }
    });
  }

  closeNotification() {
    document.getElementById("notification").classList.add("hidden");
  }

  restartApp() {
    this.electronService.ipcRenderer.send("restart_app");
  }
}
