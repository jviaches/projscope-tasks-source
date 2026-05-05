# 🌍 Translations

ProjScope Tasks ships with built-in support for **English, German, French, Spanish and Russian**. Adding a new language or improving an existing one requires no coding experience — only a text editor and a JSON file.

---

## How the i18n system works

All UI strings live in `source/src/assets/i18n/` as plain JSON files, one per language:

```
source/src/assets/i18n/
├── en.json   ← English  (authoritative, always complete)
├── de.json   ← German
├── fr.json   ← French
├── es.json   ← Spanish
└── ru.json   ← Russian
```

At runtime the app loads `en.json` as the fallback, then switches to the user's selected language. Any key missing from a translation file falls back to English automatically.

---

## Adding a new language

1. **Copy `en.json`** and rename it to your [BCP-47 language code](https://en.wikipedia.org/wiki/IETF_language_tag)  
   (e.g. `pt.json` for Portuguese, `ja.json` for Japanese, `uk.json` for Ukrainian).

2. **Translate every value** — keep all the JSON keys exactly as they are, only change the string on the right side of the colon:

   ```jsonc
   // en.json
   "welcome": {
     "headline": "Welcome back. What are we shipping today?"
   }

   // pt.json  ← translate the values, not the keys
   "welcome": {
     "headline": "Bem-vindo de volta. O que vamos entregar hoje?"
   }
   ```

3. **Register the language** in `LanguageService`  
   (`source/src/app/core/services/language.service.ts`):

   ```ts
   readonly languages: Language[] = [
     { code: 'en', name: 'English',    flag: '🇬🇧' },
     { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
     // add your entry here ↓
     { code: 'pt', name: 'Português',  flag: '🇵🇹' },
   ];
   ```

4. **Test** by running the app (`npm start`) and switching to your new language via the Language selector in the welcome screen or the main toolbar.

5. **Submit a Pull Request** with the new JSON file and the one-line change to `LanguageService`. That's it — no other code changes needed.

---

## Improving an existing translation

Open the relevant JSON file, correct or improve any strings, and submit a Pull Request. The English file (`en.json`) is always the source of truth — if you notice a key is missing from another language file, add it.

---

## Translation variables

Some strings contain interpolation placeholders like `{{year}}` or `{{count}}`. Leave those tokens unchanged — only translate the surrounding text:

```jsonc
// en.json
"license": "© {{year}} ProjScope · MIT licensed"

// de.json
"license": "© {{year}} ProjScope · MIT-Lizenz"
```

---

## Custom language override (end-user feature)

Users who want to tweak specific strings without contributing back can load a **partial JSON override file** directly in the app:

1. Open the **Language selector** (flag button in the top bar).
2. Click **"Load custom JSON…"** and pick any `.json` file.
3. Only the keys present in that file are overridden — everything else stays from the selected language.

This is also the recommended way to test a translation in progress before submitting a PR.

**Example override file** — only changes two strings, leaves the rest untouched:

```json
{
  "welcome": {
    "headline": "Ciao! Cosa consegniamo oggi?"
  },
  "project": {
    "addTask": "Aggiungi attività"
  }
}
```

---

## Finding the "Translate the UI" card

Inside the app, go to **Help → About** (or press the About menu item). The About screen has a **"Translate the UI"** card in the "Join the Project" section that links directly back here.

---

## Questions

Open an issue or start a discussion on [GitHub](https://github.com/jviaches/projscope-tasks-source). Thank you for helping make ProjScope Tasks accessible to more people! 🙏
