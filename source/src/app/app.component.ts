import { Component, OnInit, OnDestroy } from "@angular/core";
import { ElectronService } from "./core/services";
import { TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  updateName = "";
  private destroy$ = new Subject<void>();

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService
  ) {
    this.translate.setDefaultLang("en");
  }

  ngOnInit(): void {
    this.electronService.systemUpdateMessage
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => {
        if (update?.releaseName) {
          this.updateName = update.releaseName;
          const el = document.getElementById("notification");
          if (el) el.classList.remove("hidden");
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeNotification() {
    const el = document.getElementById("notification");
    if (el) el.classList.add("hidden");
  }

  restartApp() {
    this.electronService.ipcRenderer.send("restart_app");
  }
}
