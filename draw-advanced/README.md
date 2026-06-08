# Advanced Draw Widget for ArcGIS Experience Builder

An advanced drawing widget for ArcGIS Experience Builder. It builds on the work of Robert Scheitlin, Adrien Hoff, and others to add a full measurement system, live tooltips, snapping, buffers, line arrows, rich text styling, a My Drawings manager with local-storage save, and import/export across GeoJSON, KML, zipped shapefile, and legacy JSON.

- **Authors:** Brian McLeer, GIS Administrator/Developer, City of Grand Junction, CO; and Jeffrey Thompson, City of Arlington, TX
- **License:** Apache-2.0
- **Discussion, downloads, and feedback:** [Advanced Draw Widget on Esri Community](https://community.esri.com/t5/experience-builder-custom-widgets/advanced-draw-widget-improvements-import-export/ba-p/1618579)

Built and tested on **ArcGIS Experience Builder Developer Edition 1.19 and 1.20**. Per the community thread, the earliest compatible release is Developer Edition 1.17 (Enterprise 11.5); the measurement functions use API features added in 4.32, so it will not run on versions earlier than 1.17.

---

## Installation

This widget ships with a `package.json` and `package-lock.json`, so you do not install each dependency by hand. To add it to your Experience Builder Developer Edition:

1. Copy the `draw-advanced` folder into your client extensions directory:

   ```
   <ExperienceBuilder>/client/your-extensions/widgets/draw-advanced
   ```

   The `manifest.json` must sit directly inside `your-extensions/widgets/draw-advanced/`, not one level deeper (for example `widgets/draw-advanced/draw-advanced/`). Nesting it a second level is the usual cause of a widget not registering.

2. From your Experience Builder **client** directory, run:

   ```bash
   npm ci
   ```

   `npm ci` installs the exact versions captured in `package-lock.json`. Because the widget lives in `your-extensions` and carries its own `package.json`, Experience Builder installs its dependencies automatically. You do not install shp-write, shpjs, or jszip by hand.

3. Start (or restart) the client, then refresh the Builder window. The widget appears under **Insert Widget > Custom**.

> If you add the widget to an Experience Builder that is already running, re-run the client install and restart the dev server so the new dependencies are picked up. Editing a source file generally only needs a Builder refresh.

### Manual install (only if you are not using the lockfile)

```bash
npm install --save @mapbox/shp-write
npm install --save shpjs jszip
```

## Dependencies

| Package | Purpose |
| --- | --- |
| `@mapbox/shp-write` | Export drawings to zipped shapefile |
| `shpjs` | Parse imported shapefiles to GeoJSON |
| `jszip` | Read and write the shapefile ZIP container |

`proj4` and `seamless-immutable` are resolved from the ArcGIS Maps SDK and the jimu framework, so they are not listed here. Exact versions of the listed packages are pinned in `package.json` and frozen in `package-lock.json`.

---

## Features

### Draw tab
- **Drawing tools:** point, line, freehand line, text, rectangle, polygon, freehand polygon, and circle, in a two-row layout with clear Drawing Mode, Edit Mode, and No Drawings indicators.
- **Measurement system:** real-time area, perimeter, length, radius, and coordinate calculations; geodetic or planar based on spatial reference; distance and area units including user-defined custom units; per-segment line measurements; configurable decimal precision and per-metric toggles.
- **Tooltips:** live length, area, perimeter, radius, and coordinate readouts while drawing, with smart placement and styling.
- **Snapping:** detects all visible snappable layers (feature, graphics, CSV, GeoJSON, WFS, sublayers) with a 15 pixel tolerance, self-snapping, and temporary disable via Ctrl/Cmd. Optional alignment grid.
- **Buffers:** add buffers to points, lines, polygons, and circles with configurable distance, unit, and opacity; buffers update when the parent is reshaped and are included in import and export.
- **Line arrows:** add direction arrowheads to straight and freehand lines.
- **Text tool:** expanded font library, real-time preview, rotation, multi-line support, and outline/halo controls.
- **Layer management:** toggle the drawing layer in the map layer list and set a custom layer name.

### My Drawings tab
- **Save and restore:** local-storage save with user consent, per-application or global scope, and session continuity on the same device and browser.
- **Import/Export:** GeoJSON, KML, zipped shapefile, and legacy JSON, plus a format compatible with the out-of-the-box EB Draw widget import/export.
- **Organization:** individual and bulk selection, manual and attribute-based sorting, name filtering, collapse/expand, zoom-all and zoom-to, and move up/down to control draw order.
- **Editing:** inline rename, symbol and text styling, copy/duplicate, lock to prevent edits, notes and labeling, and per-drawing visibility and measurement toggles.
- **Operations:** undo/redo, bulk delete with confirmation, Delete All, and copy/paste of features from map layers.

### Integration
- Send a drawn geometry to the Mailing Labels widget as a selection.
- Optional integration with the custom Identify By Query widget.

For the complete narrative of capabilities and known issues, see the [Esri Community post](https://community.esri.com/t5/experience-builder-custom-widgets/advanced-draw-widget-improvements-import-export/ba-p/1618579).

---

## Known issues

- **Circles are 60-sided polygons.** Any polygon with exactly 60 sides is treated as a circle and given a radius, so a hand-drawn 60-sided polygon or a distorted circle will be measured as a circle.
- **Freehand line segments** generate too many segment labels to be useful; avoid segment labels on freehand lines.
- **Custom units in the Builder** clear the selected default unit on save. Pick a temporary unit, save, then switch back and save again.
- **Background color picker** needs a Standard Color chosen first before the other color options behave.

---

## Troubleshooting: `draw-advanced is duplicated`

When you run the client install, Experience Builder registers each widget by the `name` in its `manifest.json` and throws `draw-advanced is duplicated` when that name registers more than once. A single, correctly placed copy cannot duplicate itself, so a second copy is present somewhere. Check, in order:

1. A nested folder `widgets\draw-advanced\draw-advanced`. The manifest must sit directly inside the widget folder, not a second level deep.
2. A leftover folder from an earlier build or version, including any `-copy` folder or a folder under a previous name.
3. A stale compiled build in `client\dist\widgets`. Stop the client, delete the matching folder under `dist\widgets` (or run a clean build), then start again.

---

## Feedback

Please report bugs, ideas, and questions on the [Esri Community blog post](https://community.esri.com/t5/experience-builder-custom-widgets/advanced-draw-widget-improvements-import-export/ba-p/1618579).

---

## Changelog

- **2026-05-05** Minor bug fix to version 4.0 resolving an issue when merging multiple buffered features.
- **2026-05-01** Version 4: integration with the Identify By Query widget; multi-line numbers supported for text.
- **2026-04-01** Developer Edition 1.20 build available (3.2 = DE 1.20, 3.1 = DE 1.19).
- **2026-02-24** Version 3.1: lock drawing, measurement on/off for one or all, copy one or multiple features, multi-select by click or shape, merge before paste, send to Mailing Labels, more tool/function settings, and sort-order and prior-session bug fixes.
- **2026-02-12** Fixed import of SHP files using regional coordinate systems (for example EPSG:5514).
- **2026-02-05** Version 3: shapefile and KML import/export, storage scope setting, and a My Drawings UI overhaul.
- **2025-10-15** Version 2: buffers, line arrows, GeoJSON import/export, measurement label editing, and Delete All.

---

## Credits

Created by **Brian McLeer** (City of Grand Junction, CO) and **Jeffrey Thompson** (City of Arlington, TX), building on contributions from Robert Scheitlin, Adrien Hoff, Mattias Ekström, and Jérôme Ray. Thanks to the Esri Experience Builder community for feedback and testing.