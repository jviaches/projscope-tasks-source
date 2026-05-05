import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ElectronService } from './electron/electron.service';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {

  readonly languages: Language[] = [
    { code: 'en', name: 'English',   flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch',   flag: '🇩🇪' },
    { code: 'fr', name: 'Français',  flag: '🇫🇷' },
    { code: 'es', name: 'Español',   flag: '🇪🇸' },
    { code: 'ru', name: 'Русский',   flag: '🇷🇺' },
  ];

  /** JSON object loaded from the user's custom override file, or null. */
  private _overrideJson: Record<string, any> | null = null;

  /** Whether a custom override is currently active. */
  get hasCustomOverride(): boolean {
    return this._overrideJson !== null;
  }

  get currentLang(): string {
    return this.translate.currentLang ?? 'en';
  }

  constructor(
    private translate: TranslateService,
    private electronService: ElectronService
  ) {
    translate.setDefaultLang('en');

    // Subscribe to settingsLoaded$ so we apply the saved language and any
    // custom override as soon as settings are ready.
    this.electronService.settingsLoaded$.subscribe(settings => {
      const lang  = settings?.language      ?? 'en';
      const path  = settings?.customLangPath ?? null;

      if (path) {
        this._readFile(path)
          .then(text => {
            try { this._overrideJson = JSON.parse(text); } catch { /* corrupt */ }
          })
          .catch(() => { /* missing file — ignore */ })
          .finally(() => this._use(lang));
      } else {
        this._use(lang);
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Switch to a built-in language and persist the choice. */
  setLanguage(code: string): void {
    this.electronService.updateLanguageSetting(code);
    this._use(code);
  }

  /** Open a file-picker, load the chosen JSON as an override, and persist the path. */
  async loadCustomOverrideFromDisk(): Promise<void> {
    const paths = this.electronService.showOpenDialog({
      title: 'Select language override JSON',
      filters: [{ name: 'JSON files', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!paths?.length) return;

    try {
      const text = await this._readFile(paths[0]);
      this._overrideJson = JSON.parse(text);
      this.electronService.updateCustomLangPath(paths[0]);
      this._use(this.currentLang);          // re-apply current language with new override
    } catch {
      this._overrideJson = null;
    }
  }

  /** Remove the custom override and clear the saved path. */
  clearCustomOverride(): void {
    this._overrideJson = null;
    this.electronService.updateCustomLangPath(null);
    this._use(this.currentLang);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Load a language, then apply the in-memory override on top. */
  private _use(lang: string): void {
    this.translate.use(lang).subscribe(() => {
      if (this._overrideJson) {
        this.translate.setTranslation(lang, this._overrideJson, true /* merge */);
      }
    });
  }

  private _readFile(path: string): Promise<string> {
    return this.electronService.readFileAsync(path);
  }
}
