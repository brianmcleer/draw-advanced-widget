# Changelog

Newest first. Every release bumps `manifest.json` and `package.json` together.

## 4.6.0 (2026-10-08)

- Localization: the widget and its settings panel follow the app language in all 39 Experience Builder locales, including the out-of-the-box Language Switcher widget and the `?locale=` URL parameter. `manifest.json` lists every locale in `translatedLocales`.
- About 640 hardcoded English strings moved into `translations/default.ts` (dialogs, buttons, tooltips, screen-reader labels, status announcements, the custom unit editor in settings). Sentences with values are single ICU messages such as `Delete {name}`, so translators see the whole sentence.
- Locale files are generated with exb-i18n-kit from the translations Esri ships with Experience Builder and the ArcGIS Maps SDK plus Unicode CLDR unit names. Strings Esri does not ship show in English until translated; see `i18n/STATUS.md`.
- Help guide: a tip explains which language the widget uses.
- Fix bug where messages with values showed raw `{placeholders}` when a panel ran without the host widget's translator.

## 4.5.6 (2026-09-18)

- Settings: a **Show help guide** option. Turn it off and the question-mark button and the first-run hint both disappear; the guide itself is untouched. Undefined means on, so apps configured before this release keep their help button.

## 4.5.5 (2026-09-18)

- Security: the beacon's session id now falls back to `crypto.getRandomValues` and then to a clock value instead of `Math.random`, which CodeQL flags as insecure randomness (shared beacon 1.1.1). The id only groups one page load's events; it is never a secret or a credential.
- Build: `tsconfig.json` is `jsx: react-jsx` with `jsxImportSource: @emotion/react`, matching the Experience Builder client. ts-loader reads the widget tsconfig, and the previous classic `jsx: react` setting made the settings panel and runtime fail with "Cannot convert undefined or null to object" after a full rebuild. No functional change.

## 4.5.4 (2026-09-18)

- Added: anonymous usage and error telemetry (shared beacon module; off unless the portal publishes an exb-beacon-sink table; telemetry: false in config disables it).

## 4.5.3 (2026-09-17)

- Packaging: `src/declarations.d.ts` now ships only the `*.svg`, `*.css` and `require` declarations. The `jszip`, `geojson`, `@mapbox/shp-write` and `shpjs` blocks moved to the editor-only `src/vendor-shims.d.ts`, which the release zip leaves out, because ambient declarations of real packages shadow the `@types` of neighbouring widgets (reported on 4.5.2).

## Earlier releases

See the GitHub releases page and the changelog section of the README.
