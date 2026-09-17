// vendor-shims.d.ts
// City of Grand Junction GIS Division
//
// Editor-only declarations for the Draw Advanced widget's OWN third-party libraries. Sits
// beside the untouched master copy of exb-editor-shims.d.ts (copied from widgets\_vs).
// Left out of the release zip by publish.ps1 ($ReleaseOnlyExclude, "src\*-shims.d.ts"): an
// ambient `declare module 'jszip'` dropped into your-extensions shadows the real @types/jszip
// for every neighbouring widget. Webpack (transpileOnly) never reads .d.ts files, so the
// build does not need these; only Visual Studio does. Keep this file a script (no top-level
// import/export) so every block stays ambient.

declare module 'jszip' {
    class JSZip {
        static loadAsync(data: any): Promise<any>;
        loadAsync(data: any): Promise<any>;
        file(path: string): any;
        remove(path: string): this;
        generateAsync(options: any): Promise<any>;
        [key: string]: any;
    }
    export default JSZip;
}

declare module 'geojson' {
    export type GeoJsonProperties = { [name: string]: any } | null;
    export interface Geometry { type: string;[name: string]: any; }
    export interface FeatureCollection<G = Geometry, P = GeoJsonProperties> {
        type: 'FeatureCollection';
        features: Array<{ type: 'Feature'; geometry: G; properties: P;[name: string]: any }>;
        [name: string]: any;
    }
}

declare module '@mapbox/shp-write' {
    const shpwrite: any;
    export default shpwrite;
}

declare module 'shpjs' {
    const shp: any;
    export default shp;
}
