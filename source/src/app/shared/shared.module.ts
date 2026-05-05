import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { PageNotFoundComponent } from './components';
import { WebviewDirective } from './directives';
import { FormsModule } from '@angular/forms';
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, LanguageSelectorComponent],
  imports: [CommonModule, TranslateModule, FormsModule],
  exports: [TranslateModule, WebviewDirective, FormsModule, LanguageSelectorComponent]
})
export class SharedModule { }
