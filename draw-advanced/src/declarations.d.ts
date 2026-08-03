// Editor-only compatibility declarations for Experience Builder 1.21.
// These files are ignored at runtime; webpack resolves the real modules.

declare function require(path: string): any;

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '@emotion/react/jsx-runtime' {
  export * from 'react/jsx-runtime';
}

declare module 'esri/Color' {
  class Color {
    constructor(value?: any);
    [key: string]: any;
  }
  export default Color;
}

declare module 'esri/Graphic' {
  class Graphic {
    constructor(properties?: any);
    static fromJSON(json: any): Graphic;
    [key: string]: any;
  }
  export default Graphic;
}

declare module 'esri/core/Collection' {
  class Collection<T = any> {
    constructor(items?: T[] | any);
    [key: string]: any;
  }
  export default Collection;
}

declare module 'esri/geometry/Point' {
  class Point { constructor(properties?: any); [key: string]: any; }
  export default Point;
}

declare module 'esri/geometry/Multipoint' {
  class Multipoint { constructor(properties?: any); static fromJSON(json: any): Multipoint; [key: string]: any; }
  export default Multipoint;
}

declare module 'esri/geometry/Extent' {
  class Extent { constructor(properties?: any); static fromJSON(json: any): Extent; [key: string]: any; }
  export default Extent;
}

declare module 'esri/geometry/Circle' {
  class Circle { constructor(properties?: any); [key: string]: any; }
  export default Circle;
}

declare module 'esri/geometry/Polygon' {
  class Polygon {
    constructor(properties?: any);
    static fromJSON(json: any): Polygon;
    static fromExtent(extent: any): Polygon;
    [key: string]: any;
  }
  export default Polygon;
}

declare module 'esri/geometry/Polyline' {
  class Polyline {
    constructor(properties?: any);
    static fromJSON(json: any): Polyline;
    [key: string]: any;
  }
  export default Polyline;
}

declare module 'esri/geometry/SpatialReference' {
  class SpatialReference {
    constructor(properties?: any);
    static WGS84: SpatialReference;
    [key: string]: any;
  }
  export default SpatialReference;
}

declare module 'esri/layers/FeatureLayer' {
  class FeatureLayer { constructor(properties?: any); [key: string]: any; }
  export default FeatureLayer;
}

declare module 'esri/layers/GraphicsLayer' {
  class GraphicsLayer { constructor(properties?: any); [key: string]: any; }
  export default GraphicsLayer;
}

declare module 'esri/symbols/Font' {
  class Font { constructor(properties?: any); [key: string]: any; }
  export default Font;
}

declare module 'esri/symbols/PictureMarkerSymbol' {
  class PictureMarkerSymbol { constructor(properties?: any); static fromJSON(json: any): PictureMarkerSymbol; [key: string]: any; }
  export default PictureMarkerSymbol;
}

declare module 'esri/symbols/SimpleFillSymbol' {
  class SimpleFillSymbol { constructor(properties?: any); static fromJSON(json: any): SimpleFillSymbol; [key: string]: any; }
  export default SimpleFillSymbol;
}

declare module 'esri/symbols/SimpleLineSymbol' {
  class SimpleLineSymbol { constructor(properties?: any); static fromJSON(json: any): SimpleLineSymbol; [key: string]: any; }
  export default SimpleLineSymbol;
}

declare module 'esri/symbols/SimpleMarkerSymbol' {
  class SimpleMarkerSymbol { constructor(properties?: any); static fromJSON(json: any): SimpleMarkerSymbol; [key: string]: any; }
  export default SimpleMarkerSymbol;
}

declare module 'esri/symbols/TextSymbol' {
  class TextSymbol { constructor(properties?: any); static fromJSON(json: any): TextSymbol; [key: string]: any; }
  export default TextSymbol;
}

declare module 'esri/widgets/Sketch/SketchViewModel' {
  class SketchViewModel { constructor(properties?: any); [key: string]: any; }
  export default SketchViewModel;
}

declare module 'esri/widgets/support/GridControls' {
  class GridControls { constructor(properties?: any); [key: string]: any; }
  export default GridControls;
}

declare module 'esri/geometry/geometryEngine' {
  export const buffer: any;
  export const geodesicLength: any;
  export const simplify: any;
  export const union: any;
}

declare module 'esri/geometry/operators/densifyOperator' { export const execute: any; }
declare module 'esri/geometry/operators/lengthOperator' { export const execute: any; }
declare module 'esri/geometry/operators/geodeticLengthOperator' { export const execute: any; export const load: any; }
declare module 'esri/geometry/operators/areaOperator' { export const execute: any; }
declare module 'esri/geometry/operators/geodeticAreaOperator' { export const execute: any; export const load: any; }
declare module 'esri/geometry/operators/projectOperator' {
  export const executeMany: any;
  export const isLoaded: any;
  export const load: any;
}

declare module 'esri/geometry/support/webMercatorUtils' {
  export const geographicToWebMercator: any;
  export const webMercatorToGeographic: any;
}

declare module 'esri/geometry/support/jsonUtils' { export const fromJSON: any; }
declare module 'esri/symbols/support/jsonUtils' { export const fromJSON: any; }


declare module 'proj4' {
  const proj4: any;
  export default proj4;
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

declare module 'react-dom' {
  const ReactDOM: any;
  export default ReactDOM;
}

declare module 'geojson' {
  export type GeoJsonProperties = { [name: string]: any } | null;
  export interface Geometry { type: string; [name: string]: any; }
  export interface FeatureCollection<G = Geometry, P = GeoJsonProperties> {
    type: 'FeatureCollection';
    features: Array<{ type: 'Feature'; geometry: G; properties: P; [name: string]: any }>;
    [name: string]: any;
  }
}
