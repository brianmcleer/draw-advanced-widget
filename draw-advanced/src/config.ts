import { ImmutableObject } from 'seamless-immutable';

export interface Config {
    creationMode: DrawMode;
    turnOffOnClose: boolean;
    changeTitle: boolean;
    distanceUnits?: Array<{ unit: string }> // ✅ FIXED
    areaUnits?: Array<{ unit: string }> // ✅ FIXED
    radiusUnits?: Array<{ unit: string }> // ✅ FIXED
    measurePointLabel?: string
    measurePolylineLabel?: string
    measurePolygonLabel?: string
    measureCircleLabel?: string
    title: string
    listMode: boolean
    changeListMode: boolean
    userDistances: [Object]
    defaultDistance: number
    userAreas: [Object]
    defaultArea: number
    // Storage scope for drawings persistence
    storageScope: StorageScope
    // Mailing Labels integration
    enableMailingLabels?: boolean
    mailingLabelsWidgetId?: string
    mailingLabelsControllerId?: string
    // Identify By Query integration - SEND direction
    enableIdentifyByQuery?: boolean
    identifyWidgetId?: string
    identifyControllerId?: string
    // Identify By Query integration - RECEIVE direction
    enableIdentifyIntegration?: boolean
    // Tool + panel toggles consumed by the runtime widget
    enableMyDrawings?: boolean
    enableMyDrawingsImport?: boolean
    enableMyDrawingsExport?: boolean
    enableMyDrawingsLock?: boolean
    enableMyDrawingsGroup?: boolean
    enableMyDrawingsMerge?: boolean
    enableMyDrawingsDuplicate?: boolean
    enableMyDrawingsZoomTo?: boolean
    enableMyDrawingsProperties?: boolean
    enableMyDrawingsSort?: boolean
    maxDrawings?: number
    defaultTab?: string
    enablePointTool?: boolean
    enablePolylineTool?: boolean
    enableFreePolylineTool?: boolean
    enableTextTool?: boolean
    enableRectangleTool?: boolean
    enablePolygonTool?: boolean
    enableFreePolygonTool?: boolean
    enableCircleTool?: boolean
    enableTriangleTool?: boolean
    enableCurveTools?: boolean
    enableCopyFromMap?: boolean
    enableSymbolEditor?: boolean
    enableMeasurements?: boolean
    enableSnapping?: boolean
    enableBuffer?: boolean
    // Developer-configurable buffer defaults (initial values; users can still change at runtime)
    defaultBufferDistance?: number
    defaultBufferUnit?: string
    defaultBufferOpacity?: number
    defaultBufferColor?: string
    enableUndoRedo?: boolean
    confirmBeforeClear?: boolean
}

export enum DrawMode {
    SINGLE = 'single',
    CONTINUOUS = 'continuous',
    UPDATE = 'update'
}

export enum StorageScope {
    APP_SPECIFIC = 'app-specific',
    GLOBAL = 'global'
}

export type IMConfig = ImmutableObject<Config>;