import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { MaterialModule } from './material.module';

import { AppComponent } from './app.component';
import { ProjectModule } from './project/project.module';
import { HomeComponent } from './home/home.component';


import { ModalDialogComponent } from './modals/modal-dialog/modal-dialog.component'
import { ModalYesNoDialogComponent } from './modals/yesno-modal-dialog/yesno-modal-dialog.component'

import { NotificationService } from './core/services/notification.service'
import { UtilsService } from './core/services/utils.service'
import { ThemeService } from './core/services/theme.service'

import { AboutComponent } from './about/about.component';


// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent, HomeComponent, AboutComponent, ModalDialogComponent, ModalYesNoDialogComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    MaterialModule,
    CoreModule,
    SharedModule,
    ProjectModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [NotificationService, Title, UtilsService, ThemeService],
  bootstrap: [AppComponent],
  entryComponents: [ModalDialogComponent, ModalYesNoDialogComponent]
})
export class AppModule { }
