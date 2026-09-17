// Asset and CommonJS declarations that SHIP with the widget (harmless to neighbours:
// wildcard module names shadow nothing). The widget's own third-party libraries (jszip,
// geojson, @mapbox/shp-write, shpjs) moved to src/vendor-shims.d.ts on 17 September 2026:
// that file is editor-only and left out of the release zip, because an ambient
// `declare module 'jszip'` in your-extensions shadows the real @types for every other
// widget in the folder, the same way the react/jimu/esri shims did. Everything Experience
// Builder provides (react, jimu-*, esri/*, @emotion) is declared in src/exb-editor-shims.d.ts,
// copied unchanged from client\your-extensions\widgets\_vs\ (playbook Section 12, item 3).

declare function require(path: string): any;

declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.css';
