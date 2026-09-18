# Changelog

Newest first. Every release bumps `manifest.json` and `package.json` together.

## 4.5.4 (2026-09-18)

- Added: anonymous usage and error telemetry (shared beacon module; off unless the portal publishes an exb-beacon-sink table; telemetry: false in config disables it).

## 4.5.3 (2026-09-17)

- Packaging: `src/declarations.d.ts` now ships only the `*.svg`, `*.css` and `require` declarations. The `jszip`, `geojson`, `@mapbox/shp-write` and `shpjs` blocks moved to the editor-only `src/vendor-shims.d.ts`, which the release zip leaves out, because ambient declarations of real packages shadow the `@types` of neighbouring widgets (reported on 4.5.2).

## Earlier releases

See the GitHub releases page and the changelog section of the README.
