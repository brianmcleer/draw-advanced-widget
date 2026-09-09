// Editor-only ambient declarations for the widget's OWN third-party libraries.
// Everything Experience Builder provides (react, jimu-*, esri/*, @emotion) is declared in
// src/exb-editor-shims.d.ts, copied unchanged from client\your-extensions\widgets\_vs\
// (playbook Section 12, item 3, mode B). Do not redeclare those here: duplicate ambient
// module declarations of the same default export produce TS2300/TS2528 in Visual Studio.
// Inert to the webpack build.

declare function require(path: string): any;

declare module '*.svg' {
    const content: string;
    export default content;
}

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

declare module '*.css';
