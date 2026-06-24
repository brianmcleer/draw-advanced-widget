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