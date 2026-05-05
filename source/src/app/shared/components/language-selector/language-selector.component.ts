import { Component } from '@angular/core';
import { LanguageService, Language } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
})
export class LanguageSelectorComponent {
  open = false;

  constructor(public langService: LanguageService) {}

  get current(): Language {
    return this.langService.languages.find(l => l.code === this.langService.currentLang)
      ?? this.langService.languages[0];
  }

  select(code: string): void {
    this.langService.setLanguage(code);
    this.open = false;
  }

  async loadCustom(): Promise<void> {
    await this.langService.loadCustomOverrideFromDisk();
    this.open = false;
  }

  clearCustom(): void {
    this.langService.clearCustomOverride();
    this.open = false;
  }

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
  }
}
