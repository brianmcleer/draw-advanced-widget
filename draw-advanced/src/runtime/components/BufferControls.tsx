import { React } from 'jimu-core';
import { Label, NumericInput, Select, Option, Button } from 'jimu-ui';
import { CollapsableCheckbox } from 'jimu-ui/advanced/setting-components';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Graphic from 'esri/Graphic';
import Point from 'esri/geometry/Point';
import Polygon from 'esri/geometry/Polygon';
// jimu-arcgis types used via prop typing only
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol';
import SimpleLineSymbol from 'esri/symbols/SimpleLineSymbol';
import TextSymbol from 'esri/symbols/TextSymbol';
import Color from 'esri/Color';
import * as geometryEngine from 'esri/geometry/geometryEngine';

interface ExtendedGraphic extends Graphic {
    isBufferDrawing?: boolean;
    sourceGraphicId?: string;
    bufferGraphic?: ExtendedGraphic | null;

    bufferLabel?: any | null;
    bufferLabelShadow?: any | null;  // subtle text shadow graphic
    bufferLeader?: any | null;       // leader line polyline graphic
    bufferLeaderOutline?: any | null; // leader line white outline/halo

    bufferSettings?: {
        distance: number;
        unit: string;
        enabled: boolean;
        opacity?: number;
        hasLabel?: boolean;
    } | null;
}


// ── Manual buffer helpers (no WASM required) ────────────────────────────────
const UNIT_TO_METERS: Record<string, number> = {
    meters: 1, meter: 1, esrimeters: 1,
    kilometers: 1000, kilometer: 1000, esrikilometers: 1000,
    feet: 0.3048, foot: 0.3048, esrifeet: 0.3048,
    miles: 1609.344, mile: 1609.344, esrimiles: 1609.344,
    yards: 0.9144, yard: 0.9144, esriyards: 0.9144,
    nauticalmiles: 1852, esrinauticalmiles: 1852,
};
const toMeters = (dist: number, unit: string): number =>
    dist * (UNIT_TO_METERS[(unit || '').toLowerCase().replace(/-/g, '')] ?? 1);

const makePoly = (rings: number[][][], sr: any): any =>
    Polygon.fromJSON({ rings, spatialReference: sr?.toJSON ? sr.toJSON() : sr });

/** Circular polygon. */
const circleRing = (cx: number, cy: number, r: number, isGeo: boolean, N = 72): number[][] => {
    const ring: number[][] = [];
    const cosLat = isGeo ? Math.cos(cy * Math.PI / 180) : 1;
    for (let i = 0; i <= N; i++) {
        const a = 2 * Math.PI * i / N;
        ring.push([cx + (r / (isGeo ? 111320 * cosLat : 1)) * Math.cos(a),
        cy + (r / (isGeo ? 111320 : 1)) * Math.sin(a)]);
    }
    return ring;
};

/** Semicircle arc from angle `from` sweeping +π, 18 points. */
const arcPoints = (cx: number, cy: number, r: number, from: number): number[][] => {
    const pts: number[][] = [];
    for (let i = 0; i <= 18; i++) pts.push([cx + r * Math.cos(from + Math.PI * i / 18), cy + r * Math.sin(from + Math.PI * i / 18)]);
    return pts;
};

/**
 * Stadium / capsule buffer for a polyline path.
 * Offset both sides with per-vertex mitered normals, semicircle caps at each end.
 */
const pathBuffer = (path: number[][], distM: number, sr: any): any => {
    if (path.length < 2) return null;
    const n = path.length;

    // Per-segment left-side unit normals
    const segNorm = (i: number) => {
        const dx = path[i + 1][0] - path[i][0], dy = path[i + 1][1] - path[i][1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { nx: -dy / len, ny: dx / len };
    };

    // Miter normal at vertex i (average of adjacent segment normals)
    const vertNorm = (i: number) => {
        if (i === 0) return segNorm(0);
        if (i === n - 1) return segNorm(n - 2);
        const a = segNorm(i - 1), b = segNorm(i);
        const mx = a.nx + b.nx, my = a.ny + b.ny;
        const mlen = Math.sqrt(mx * mx + my * my) || 1;
        return { nx: mx / mlen, ny: my / mlen };
    };

    const left: number[][] = [], right: number[][] = [];
    for (let i = 0; i < n; i++) {
        const { nx, ny } = vertNorm(i);
        left.push([path[i][0] + nx * distM, path[i][1] + ny * distM]);
        right.push([path[i][0] - nx * distM, path[i][1] - ny * distM]);
    }

    // Cap angles — start at the LAST LEFT angle and sweep π to reach LAST RIGHT
    // End cap: forward direction of last segment
    const efDx = path[n - 1][0] - path[n - 2][0], efDy = path[n - 1][1] - path[n - 2][1];
    const efAngle = Math.atan2(efDy, efDx);
    // left of end = efAngle+π/2; sweep +π to reach efAngle-π/2 (right of end)
    const endCapFrom = efAngle + Math.PI / 2;

    // Start cap: backward direction (pointing away from line start)
    const sfDx = path[0][0] - path[1][0], sfDy = path[0][1] - path[1][1];
    const sfAngle = Math.atan2(sfDy, sfDx);
    // right of start = sfAngle-π/2 (= -efAngle+π-π/2 for straight line);
    // after right.reverse(), we arrive at right[0], which is at angle -(efAngle+π/2)
    // sweep +π to reach left[0] at efAngle+π/2
    const startCapFrom = sfAngle + Math.PI / 2;

    const ring: number[][] = [
        ...left,
        // End cap: sweep outward past the endpoint
        ...arcPoints(path[n - 1][0], path[n - 1][1], distM, efAngle - Math.PI / 2).slice().reverse(),
        ...[...right].reverse(),
        // Start cap: sweep outward past the start point
        ...arcPoints(path[0][0], path[0][1], distM, sfAngle - Math.PI / 2).slice().reverse(),
        left[0],
    ];
    return makePoly([ring], sr);
};

/**
 * Polygon offset buffer.
 * Offsets each vertex outward along the bisector of adjacent edge outward-normals.
 * Convex corners get a small arc; concave corners are beveled.
 */
const polygonBuffer = (rings: number[][][], distM: number, sr: any): any => {
    if (!rings?.length) return null;

    const offsetRing = (ring: number[][]): number[][] => {
        const pts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
            ? ring.slice(0, -1) : ring;
        const n = pts.length;
        if (n < 3) return ring;

        // Compute signed area (Shoelace)
        let area = 0;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
        }
        // CCW ring (area>0): outward = RIGHT normal = (dy/len, -dx/len)
        // CW  ring (area<0): outward = LEFT  normal = (-dy/len, dx/len)
        // Unified: outward = s*(dy/len, -dx/len) where s = area>0 ? 1 : -1
        const s = area > 0 ? 1 : -1;

        const edgeNorm = (i: number) => {
            const j = (i + 1) % n;
            const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return { nx: s * dy / len, ny: s * (-dx) / len };
        };

        // Convex corners get a rounded arc fillet (matching geometryEngine.buffer);
        // concave corners use a single bisector intersection (sharp inside corner).
        const ARC_STEP = Math.PI / 12;       // ~15° per fillet step
        const MAX_ARC_STEPS = 24;            // cap for very acute corners

        const result: number[][] = [];
        for (let i = 0; i < n; i++) {
            const prev = (i + n - 1) % n;
            const ea = edgeNorm(prev), eb = edgeNorm(i);
            const cross = ea.nx * eb.ny - ea.ny * eb.nx;
            const dot = ea.nx * eb.nx + ea.ny * eb.ny;
            const isConvex = cross * s > 0;
            if (isConvex) {
                // Arc fillet around pts[i] with radius distM, swept on the outward side.
                const a0 = Math.atan2(ea.ny, ea.nx);
                const a1 = Math.atan2(eb.ny, eb.nx);
                let delta = a1 - a0;
                // Outward sweep: CCW for s=+1, CW for s=-1
                if (s > 0) { while (delta <= 0) delta += 2 * Math.PI; if (delta > 2 * Math.PI) delta -= 2 * Math.PI; }
                else { while (delta >= 0) delta -= 2 * Math.PI; if (delta < -2 * Math.PI) delta += 2 * Math.PI; }
                const steps = Math.min(MAX_ARC_STEPS, Math.max(2, Math.ceil(Math.abs(delta) / ARC_STEP)));
                for (let k = 0; k <= steps; k++) {
                    const a = a0 + delta * (k / steps);
                    result.push([pts[i][0] + distM * Math.cos(a), pts[i][1] + distM * Math.sin(a)]);
                }
            } else {
                // Concave or straight corner: single bisector intersection
                const mx = ea.nx + eb.nx, my = ea.ny + eb.ny;
                const mlen = Math.sqrt(mx * mx + my * my) || 1;
                const cosHalf = Math.sqrt(Math.max(0, (1 + dot) / 2));
                const miterLen = cosHalf < 0.05 ? distM * 4 : Math.min(distM / cosHalf, distM * 4);
                result.push([pts[i][0] + (mx / mlen) * miterLen, pts[i][1] + (my / mlen) * miterLen]);
            }
        }
        result.push(result[0]);
        return result;
    };

    return makePoly(rings.map(r => offsetRing(r)), sr);
};

/**
 * Buffer a polygon and union the resulting offset rings so that:
 *   - A multi-ring input (e.g. merged parcels) produces a single merged buffer
 *     rather than overlapping per-ring buffers.
 *   - Selection/identify against this buffer obeys true containment (no
 *     even/odd ring fill artifacts).
 * Falls back to plain ring-stack if geometryEngine is unavailable.
 */
const polygonBufferUnioned = (rings: number[][][], distM: number, sr: any): any => {
    if (!rings?.length) return null;
    const offsetPolys = rings.map(r => makePoly([r], sr))
        .map(p => polygonBuffer(p.rings, distM, sr))
        .filter(Boolean) as any[];
    if (offsetPolys.length === 0) return null;
    if (offsetPolys.length === 1) return offsetPolys[0];
    try {
        const ge: any = (geometryEngine as any).default || geometryEngine;
        if (ge?.union) {
            const result = ge.union(offsetPolys);
            if (result) return Array.isArray(result) ? result[0] : result;
        }
    } catch (e) {
        console.warn('polygonBufferUnioned: union failed, falling back to ring stack', e);
    }
    // Fallback: stacked rings (legacy behavior)
    const allRings: number[][][] = [];
    for (const p of offsetPolys) if (p.rings) for (const r of p.rings) allRings.push(r);
    return makePoly(allRings, sr);
};

/**
 * Run geometryEngine.simplify on a polygon to dissolve self-intersections
 * produced by manual offset buffering (spikes / pinches / interior cuts that
 * appear when the buffer overlaps itself in concave regions or narrow corridors).
 *
 * No-op if the engine is unavailable or simplify throws — returns the input as-is.
 * No-op if the input is not a polygon.
 */
const simplifyPolygonSafe = (geom: any): any => {
    if (!geom || geom.type !== 'polygon') return geom;
    try {
        const ge: any = (geometryEngine as any).default || geometryEngine;
        if (ge?.simplify) {
            const simplified = ge.simplify(geom);
            if (simplified) return Array.isArray(simplified) ? simplified[0] : simplified;
        }
    } catch (e) {
        console.warn('simplifyPolygonSafe: simplify failed, returning input as-is', e);
    }
    return geom;
};

const manualBuffer = (geometry: any, distMeters: number, sr: any): any => {
    if (!geometry) return null;
    const isGeo = sr?.isGeographic || sr?.wkid === 4326;

    // Convert meters to the SR's native coordinate units
    const srUnit = (sr?.unit || '').toLowerCase();
    let distSR = distMeters; // default: assume meters
    if (srUnit.includes('foot') || srUnit.includes('feet') || srUnit === 'us-feet' || srUnit === 'us_survey_feet') {
        distSR = distMeters / 0.3048;
    } else if (srUnit.includes('mile')) {
        distSR = distMeters / 1609.344;
    } else if (srUnit.includes('kilometer') || srUnit === 'km') {
        distSR = distMeters / 1000;
    }
    // For geographic (lat/lon), use the degree-based conversion in circleRing/pathBuffer
    const dUse = isGeo ? distMeters : distSR;

    // 🔧 Shape-first detection — don't trust geometry.type alone. After
    // Graphic.fromJSON rehydration the type field can be missing or wrong on
    // restored polygons, which previously routed to the extent fallback below
    // and produced a circle around the centroid instead of a polygon outline.
    const hasRings = Array.isArray(geometry.rings) && geometry.rings.length > 0 &&
        Array.isArray(geometry.rings[0]) && geometry.rings[0].length >= 3;
    const hasPaths = Array.isArray(geometry.paths) && geometry.paths.length > 0;
    const hasXY = typeof geometry.x === 'number' && typeof geometry.y === 'number';

    if (hasRings || geometry.type === 'polygon') {
        const r = polygonBufferUnioned(geometry.rings || [], dUse, sr);
        if (r) return r;
    }
    if (hasPaths || geometry.type === 'polyline') {
        const paths: number[][][] = geometry.paths || [];
        if (paths.length > 0) {
            if (paths.length === 1) return pathBuffer(paths[0], dUse, sr);
            const buffered: any[] = [];
            for (const path of paths) {
                const b = pathBuffer(path, dUse, sr);
                if (b) buffered.push(b);
            }
            if (buffered.length === 1) return buffered[0];
            if (buffered.length > 1) {
                try {
                    const ge: any = (geometryEngine as any).default || geometryEngine;
                    if (ge?.union) {
                        const result = ge.union(buffered);
                        if (result) return Array.isArray(result) ? result[0] : result;
                    }
                } catch (e) {
                    console.warn('manualBuffer (polyline): union failed, falling back to ring stack', e);
                }
                const allRings: number[][][] = [];
                for (const b of buffered) if (b.rings) for (const ring of b.rings) allRings.push(ring);
                if (allRings.length > 0) return makePoly(allRings, sr);
            }
        }
    }
    if (hasXY || geometry.type === 'point') {
        return makePoly([circleRing(geometry.x, geometry.y, dUse, isGeo)], sr);
    }
    const ext = geometry.extent;
    if (ext) {
        console.warn('manualBuffer falling back to bounding-circle:', geometry);
        const cx = (ext.xmin + ext.xmax) / 2, cy = (ext.ymin + ext.ymax) / 2;
        const r = Math.max(ext.width, ext.height) / 2 + dUse;
        return makePoly([circleRing(cx, cy, r, isGeo)], sr);
    }
    return null;
};

interface BufferControlsProps {
    jimuMapView: any;
    sketchViewModel: any;
}

const asExtended = (g: any) => g as ExtendedGraphic;

export const BufferControls: React.FC<BufferControlsProps> = ({ jimuMapView, sketchViewModel }) => {
    // OFF by default
    const [bufferEnabled, setBufferEnabled] = React.useState<boolean>(false);
    const [bufferDistance, setBufferDistance] = React.useState<number>(100);
    const [bufferUnit, setBufferUnit] = React.useState<string>('feet');
    const [bufferOpacity, setBufferOpacity] = React.useState<number>(75);

    // Accessibility: Status announcement for screen readers
    const [statusMessage, setStatusMessage] = React.useState<string>('');
    const statusTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const geometryWatchers = React.useRef<Map<string, any>>(new Map());

    // Unique IDs for ARIA associations
    const componentId = React.useRef(`buffer-controls-${Math.random().toString(36).substr(2, 9)}`).current;
    const distanceInputId = `${componentId}-distance`;
    const unitSelectId = `${componentId}-unit`;
    const opacityInputId = `${componentId}-opacity`;
    const statusRegionId = `${componentId}-status`;
    const descriptionId = `${componentId}-description`;
    const distanceDescId = `${componentId}-distance-desc`;
    const unitDescId = `${componentId}-unit-desc`;
    const opacityDescId = `${componentId}-opacity-desc`;

    // Accessibility: Announce status messages to screen readers
    const announceStatus = React.useCallback((message: string) => {
        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
        }
        setStatusMessage(message);
        statusTimeoutRef.current = setTimeout(() => {
            setStatusMessage('');
        }, 5000);
    }, []);

    // --- persistence ---
    const saveSettings = React.useCallback((partial?: { enabled?: boolean; distance?: number; unit?: string; opacity?: number }) => {
        try {
            const toSave = {
                enabled: bufferEnabled,
                distance: bufferDistance,
                unit: bufferUnit,
                opacity: bufferOpacity,
                ...partial
            };
            localStorage.setItem('bufferControlSettings', JSON.stringify(toSave));
        } catch { /* no-op */ }
    }, [bufferEnabled, bufferDistance, bufferUnit, bufferOpacity]);

    const loadSettings = React.useCallback(() => {
        try {
            const raw = localStorage.getItem('bufferControlSettings');
            if (!raw) return;
            const parsed = JSON.parse(raw);

            // Always start with buffers disabled, regardless of saved state
            // if (typeof parsed.enabled === 'boolean') setBufferEnabled(parsed.enabled);

            // Load other user preferences
            if (typeof parsed.distance === 'number') setBufferDistance(parsed.distance);
            if (typeof parsed.unit === 'string') setBufferUnit(parsed.unit);
            if (typeof parsed.opacity === 'number') setBufferOpacity(parsed.opacity);
        } catch { /* no-op */ }
    }, []);

    React.useEffect(() => { loadSettings(); }, [loadSettings]);
    React.useEffect(() => { saveSettings(); }, [bufferEnabled, saveSettings]);

    // cleanup
    React.useEffect(() => {
        return () => {
            geometryWatchers.current.forEach(w => { try { w.remove(); } catch { } });
            geometryWatchers.current.clear();
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    // --- helpers ---
    const getDrawLayer = React.useCallback((): GraphicsLayer | null => {
        const view = jimuMapView?.view;
        if (!view) return null;
        return view.map.findLayerById('DrawGL') as GraphicsLayer;
    }, [jimuMapView]);

    const colorToArray = (c: any): number[] => {
        if (!c) return [0, 0, 0, 1];
        if (Array.isArray(c)) return c.length >= 3 ? c : [0, 0, 0, 1];
        if (typeof c === 'object') {
            // @ts-ignore
            if ('r' in c && 'g' in c && 'b' in c) return [c.r ?? 0, c.g ?? 0, c.b ?? 0, c.a ?? 1];
            // @ts-ignore
            if (typeof c.toRgba === 'function') { try { return c.toRgba(); } catch { return [0, 0, 0, 1]; } }
        }
        return [0, 0, 0, 1];
    };

    // Contrast-aware text/halo based on a base color (falls back gracefully)
    const getReadableTextAndHalo = (base?: Color) => {
        const c = base ?? new Color([0, 122, 194, 1]);
        const [r, g, b] = [c.r, c.g, c.b].map(v => v / 255);
        const srgb = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        const useDarkText = luminance > 0.6; // bright fill → dark text
        return {
            text: useDarkText ? new Color([20, 20, 20, 1]) : new Color([255, 255, 255, 1]),
            halo: useDarkText ? new Color([255, 255, 255, 0.95]) : new Color([0, 0, 0, 0.85])
        };
    };

    const getSelectedMainGraphics = React.useCallback((): ExtendedGraphic[] => {
        const arr = sketchViewModel?.updateGraphics?.toArray?.() ?? [];
        return arr.filter((g: any) => {
            const a = g.attributes || {};
            if (a.isBuffer || a.isMeasurementLabel || a.hideFromList) return false;
            if (g.geometry?.type === 'point' && g.symbol?.type === 'text' && a.isMeasurementLabel) return false;
            return true;
        }) as ExtendedGraphic[];
    }, [sketchViewModel]);

    // --- geometry/symbol ---
    const createBufferGeometry = async (geometry: any, distance: number, unit: string) => {
        try {
            const view = jimuMapView?.view;
            if (!view) return null;
            const sr = view.spatialReference;

            // PRIMARY: try geometryEngine — produces topologically clean buffers
            // (self-intersections from offset overlap are dissolved automatically).
            try {
                const ge: any = (geometryEngine as any).default || geometryEngine;
                if (ge?.buffer) {
                    const useGeodesic = sr?.isGeographic || sr?.wkid === 4326;
                    const linearUnit = (unit || 'meters').toLowerCase().replace(/-/g, '');
                    const result = useGeodesic
                        ? (ge.geodesicBuffer ? ge.geodesicBuffer(geometry, distance, linearUnit) : ge.buffer(geometry, distance, linearUnit, true))
                        : ge.buffer(geometry, distance, linearUnit);
                    if (result) return Array.isArray(result) ? result[0] : result;
                }
            } catch (engineErr) {
                console.warn('createBufferGeometry: geometryEngine failed, using manual fallback', engineErr);
            }

            // FALLBACK: manual offset buffer + simplify to dissolve self-intersections.
            const distMeters = toMeters(distance, unit);
            const manual = manualBuffer(geometry, distMeters, sr);
            return simplifyPolygonSafe(manual);
        } catch (e) {
            console.error('Buffer geometry error', e);
            return null;
        }
    };

    const makeBufferSymbol = (parent: ExtendedGraphic): SimpleFillSymbol => {
        const op = ((parent.bufferSettings?.opacity ?? bufferOpacity) / 100);
        const gType = parent.geometry?.type;

        let fill = new Color([0, 122, 194, 0.3 * op]);
        let out = new Color([0, 122, 194, 1.0 * op]);
        let width = 2.5;

        try {
            if (gType === 'polygon' && parent.symbol?.type === 'simple-fill') {
                const s = parent.symbol as any;
                const fc = colorToArray(s.color);
                fill = new Color([fc[0], fc[1], fc[2], (fc[3] ?? 1) * op]);
                if (s.outline?.color) {
                    const oc = colorToArray(s.outline.color);
                    out = new Color([oc[0], oc[1], oc[2], (oc[3] ?? 1) * op]);
                }
                if (s.outline?.width) width = Math.max(s.outline.width * 1.2, 2.0);
            } else if (gType === 'polyline' && parent.symbol?.type === 'simple-line') {
                const l = parent.symbol as any;
                const lc = colorToArray(l.color);
                fill = new Color([lc[0], lc[1], lc[2], (lc[3] ?? 1) * 0.6 * op]);
                out = new Color([lc[0], lc[1], lc[2], (lc[3] ?? 1) * op]);
                if (l.width) width = Math.max(l.width * 1.2, 2.0);
            } else if (gType === 'point' && parent.symbol?.type === 'simple-marker') {
                const m = parent.symbol as any;
                const mc = colorToArray(m.color);
                fill = new Color([mc[0], mc[1], mc[2], (mc[3] ?? 1) * 0.6 * op]);
                out = new Color([mc[0], mc[1], mc[2], (mc[3] ?? 1) * op]);
                if (m.outline?.width) width = Math.max(m.outline.width * 1.2, 2.5);
            }
        } catch { /* defaults */ }

        return new SimpleFillSymbol({
            color: fill,
            outline: new SimpleLineSymbol({ color: out, width, style: 'dash' })
        });
    };

    const ensureWatcher = (parent: ExtendedGraphic) => {
        const id = parent.attributes?.uniqueId;
        if (!id) return;
        const existing = geometryWatchers.current.get(id);
        if (existing) { try { existing.remove(); } catch { } }
        const h = parent.watch('geometry', () => updateAttachedBuffer(parent));
        geometryWatchers.current.set(id, h);
    };

    // Get label point positioned inside buffer (fallback)
    const getLabelPoint = (originalGeometry: any, bufferGeometry: any): any | null => {
        if (!originalGeometry || !bufferGeometry) return null;

        try {
            let bufferCenter: any | null = null;

            // Buffer geometry center
            if ('centroid' in bufferGeometry) {
                bufferCenter = (bufferGeometry as any).centroid;
            } else if ((bufferGeometry as any).extent?.center) {
                bufferCenter = (bufferGeometry as any).extent.center;
            }

            return bufferCenter;
        } catch (e) {
            console.error('Error calculating label point', e);
            return null;
        }
    };

    // Choose a clean anchor point just outside the buffer (NE quadrant) with padding
    const getExteriorLabelPoint = (bufferGeometry: any): any | null => {
        try {
            const geomAny: any = bufferGeometry as any;
            const center: any | null =
                ('centroid' in geomAny && geomAny.centroid) ? geomAny.centroid :
                    (geomAny.extent?.center ?? null);
            const extent = geomAny.extent;
            if (!center || !extent) return center;

            // NE direction vector and margin (~20% of half-extent)
            const dx = (extent.xmax - center.x);
            const dy = (extent.ymax - center.y);
            const marginX = dx * 0.20;
            const marginY = dy * 0.20;

            return new Point({
                x: center.x + dx + marginX,
                y: center.y + dy + marginY,
                spatialReference: bufferGeometry.spatialReference
            });
        } catch (e) {
            console.error('getExteriorLabelPoint failed', e);
            return null;
        }
    };

    // Smart pluralization for units
    const formatUnit = (distance: number, unit: string): string => {
        const singularForms: { [key: string]: string } = {
            'feet': 'Foot',
            'meters': 'Meter',
            'miles': 'Mile',
            'kilometers': 'Kilometer'
        };

        const pluralForms: { [key: string]: string } = {
            'feet': 'Feet',
            'meters': 'Meters',
            'miles': 'Miles',
            'kilometers': 'Kilometers'
        };

        // Check if distance is exactly 1
        if (distance === 1) {
            return singularForms[unit] || unit.charAt(0).toUpperCase() + unit.slice(1);
        } else {
            return pluralForms[unit] || unit.charAt(0).toUpperCase() + unit.slice(1);
        }
    };

    const updateAttachedBuffer = async (parent: ExtendedGraphic) => {
        const layer = getDrawLayer();
        if (!layer || !parent.bufferGraphic || !parent.bufferSettings) return;
        try {
            const geom = await createBufferGeometry(parent.geometry, parent.bufferSettings.distance, parent.bufferSettings.unit);
            if (!geom) return;
            const buf = parent.bufferGraphic;
            layer.remove(buf);
            buf.geometry = geom;
            buf.symbol = makeBufferSymbol(parent);
            layer.add(buf);

            // Update label position/text if it exists
            if (parent.bufferLabel) {
                // reposition to exterior anchor if available
                const labelPoint = getExteriorLabelPoint(geom) || getLabelPoint(parent.geometry, geom);
                if (labelPoint) {
                    parent.bufferLabel.geometry = labelPoint;
                    if (parent.bufferLabelShadow) {
                        parent.bufferLabelShadow.geometry = labelPoint;
                    }
                }

                // keep texts and sizes consistent
                try {
                    const distance = parent.bufferSettings.distance;
                    const unitDisplay = formatUnit(distance, parent.bufferSettings.unit);
                    const newText = `${distance} ${unitDisplay} Buffer`;

                    const main = parent.bufferLabel.symbol as any;
                    if (main && main.type === 'text') {
                        main.text = newText;
                        if (main.font) { main.font.size = 16; (main.font as any).weight = 'bold'; }
                        parent.bufferLabel.symbol = main;
                    }

                    if (parent.bufferLabelShadow) {
                        const sh = parent.bufferLabelShadow.symbol as any;
                        if (sh && sh.type === 'text') {
                            sh.text = newText;
                            if (sh.font) { sh.font.size = 16; (sh.font as any).weight = 'bold'; }
                            parent.bufferLabelShadow.symbol = sh;
                        }
                    }
                } catch { /* no-op */ }
            }

            // rebuild leader
            try {
                const center = ('centroid' in geom) ? (geom as any).centroid : (geom as any).extent?.center;
                if (center && parent.bufferLabel) {
                    const polyline = {
                        type: 'polyline',
                        paths: [
                            [(center as any).x, (center as any).y],
                            [(parent.bufferLabel.geometry as any).x, (parent.bufferLabel.geometry as any).y]
                        ],
                        spatialReference: geom.spatialReference
                    } as unknown as any;

                    // Enhanced leader line with white outline for visibility on aerial imagery
                    const leaderSymbol = new SimpleLineSymbol({
                        color: new Color([0, 0, 0, 0.9]),  // Much darker for visibility
                        width: 2.5,  // Thicker line
                        style: 'short-dot'
                    });

                    // White outline (halo) for contrast on any background
                    const leaderOutlineSymbol = new SimpleLineSymbol({
                        color: new Color([255, 255, 255, 0.85]),  // White outline
                        width: 4.5,  // Wider for halo effect
                        style: 'short-dot'
                    });

                    // Remove old leader graphics if they exist
                    if (parent.bufferLeaderOutline) {
                        try { layer.remove(parent.bufferLeaderOutline); } catch { }
                    }
                    if (parent.bufferLeader) {
                        try { layer.remove(parent.bufferLeader); } catch { }
                    }

                    // Add outline first, then main line on top for proper layering
                    const leaderOutline = new Graphic({ geometry: polyline, symbol: leaderOutlineSymbol, attributes: { hideFromList: true } });
                    parent.bufferLeaderOutline = leaderOutline;
                    parent.bufferLeader = new Graphic({ geometry: polyline, symbol: leaderSymbol, attributes: { hideFromList: true } });
                    layer.add(leaderOutline);
                    layer.add(parent.bufferLeader);
                }
            } catch { /* no-op */ }
        } catch (e) { console.error('Buffer update failed', e); }
    };

    // Create buffer label with premium aesthetics (fixed size, shadow, halo, leader, exterior placement)
    const createBufferLabel = (parent: ExtendedGraphic, bufferGeometry: any): any | null => {
        try {
            const layer = getDrawLayer();
            if (!layer || !parent.bufferSettings) return null;

            const distance = parent.bufferSettings.distance;
            const unit = parent.bufferSettings.unit;

            // Smart pluralization
            const unitDisplay = formatUnit(distance, unit);
            const labelText = `${distance} ${unitDisplay} Buffer`;

            // Use the exterior anchor for stellar cartography
            const labelPoint = getExteriorLabelPoint(bufferGeometry) || getLabelPoint(parent.geometry, bufferGeometry);
            if (!labelPoint) return null;

            // Harmonize with parent's symbol color if available
            let themeColor: Color | undefined;
            try {
                const sym: any = parent.symbol;
                if (sym?.outline?.color) {
                    const oc = colorToArray(sym.outline.color);
                    themeColor = new Color([oc[0], oc[1], oc[2], 1]);
                } else if (sym?.color) {
                    const fc = colorToArray(sym.color);
                    themeColor = new Color([fc[0], fc[1], fc[2], 1]);
                }
            } catch { /* fallback below */ }

            const { text: textColor, halo: haloColor } = getReadableTextAndHalo(themeColor);

            // PASS 1: soft drop shadow (sits behind, tiny offset)
            const shadowSymbol = new TextSymbol({
                text: labelText,
                color: new Color([0, 0, 0, 0.35]),
                haloColor: new Color([255, 255, 255, 0]),
                haloSize: 0,
                xoffset: 1,
                yoffset: 2,
                font: {
                    size: 16, // FIXED so it never scales with map
                    family: 'Avenir Next, Arial, sans-serif',
                    weight: 'bold'
                },
                horizontalAlignment: 'center',
                verticalAlignment: 'middle'
            });

            const shadowGraphic = new Graphic({
                geometry: labelPoint,
                symbol: shadowSymbol,
                attributes: {
                    uniqueId: `buffer_label_shadow_${parent.attributes?.uniqueId}_${Date.now()}`,
                    parentId: parent.attributes?.uniqueId,
                    isBufferLabelShadow: true,
                    hideFromList: true,
                    isMeasurementLabel: false
                }
            });

            // PASS 2: main label (high-contrast halo)
            const textSymbol = new TextSymbol({
                text: labelText,
                color: textColor,
                haloColor,
                haloSize: 4, // slightly larger for "knockout" effect
                font: {
                    size: 16, // FIXED
                    family: 'Avenir Next, Arial, sans-serif',
                    weight: 'bold'
                },
                horizontalAlignment: 'center',
                verticalAlignment: 'middle'
            });

            const labelGraphic = new Graphic({
                geometry: labelPoint,
                symbol: textSymbol,
                attributes: {
                    uniqueId: `buffer_label_${parent.attributes?.uniqueId}_${Date.now()}`,
                    name: `Buffer Label: ${labelText}`,
                    parentId: parent.attributes?.uniqueId,
                    isBufferLabel: true,
                    hideFromList: true,
                    isMeasurementLabel: false
                }
            });

            // LEADER LINE from centroid → label
            try {
                const geomAny: any = bufferGeometry as any;
                const center = (geomAny.centroid ?? geomAny.extent?.center) as any;
                if (center) {
                    const polyline = {
                        type: 'polyline',
                        paths: [
                            [(center as any).x, (center as any).y],
                            [(labelPoint as any).x, (labelPoint as any).y]
                        ],
                        spatialReference: bufferGeometry.spatialReference
                    } as unknown as any;

                    // Enhanced leader line with white outline for visibility on aerial imagery
                    const leaderSymbol = new SimpleLineSymbol({
                        color: new Color([0, 0, 0, 0.9]),  // Much darker for visibility
                        width: 2.5,  // Thicker line
                        style: 'short-dot'
                    });

                    // White outline (halo) for contrast on any background
                    const leaderOutlineSymbol = new SimpleLineSymbol({
                        color: new Color([255, 255, 255, 0.85]),  // White outline
                        width: 4.5,  // Wider for halo effect
                        style: 'short-dot'
                    });

                    // Add outline first, then main line on top for proper layering
                    const leaderOutline = new Graphic({ geometry: polyline, symbol: leaderOutlineSymbol, attributes: { hideFromList: true } });
                    parent.bufferLeaderOutline = leaderOutline;
                    parent.bufferLeader = new Graphic({ geometry: polyline, symbol: leaderSymbol, attributes: { hideFromList: true } });
                    layer.add(leaderOutline);
                    layer.add(parent.bufferLeader);
                }
            } catch { /* no-op */ }

            // Add in back-to-front order for proper stacking
            layer.add(shadowGraphic);
            layer.add(labelGraphic);

            parent.bufferLabelShadow = shadowGraphic;
            parent.bufferLabel = labelGraphic;

            return labelGraphic;
        } catch (e) {
            console.error('Failed to create buffer label', e);
            return null;
        }
    };

    const createOrUpdateBufferFor = async (parent: ExtendedGraphic, distance: number, unit: string) => {
        const layer = getDrawLayer();
        if (!layer) return;
        const a = parent.attributes || {};
        const id = a.uniqueId;
        if (!id) return;

        // skip text symbols
        if (parent.geometry?.type === 'point' && parent.symbol?.type === 'text') return;

        if (parent.bufferGraphic) {
            try { layer.remove(parent.bufferGraphic); } catch { }
            parent.bufferGraphic = null;
        }

        const geom = await createBufferGeometry(parent.geometry, distance, unit);
        if (!geom) return;

        // Track hasLabel state in buffer settings
        parent.bufferSettings = {
            distance,
            unit,
            enabled: true,
            opacity: bufferOpacity,
            hasLabel: parent.bufferLabel ? true : false
        };

        const buf = new Graphic({
            geometry: geom,
            symbol: makeBufferSymbol(parent),
            attributes: {
                uniqueId: `buffer_${id}_${Date.now()}`,
                name: `${a.name ?? 'Drawing'} Buffer`,
                parentId: id,
                isBuffer: true,
                hideFromList: true,
                isMeasurementLabel: false,
                bufferDistance: distance,
                bufferUnit: unit
            }
        }) as ExtendedGraphic;

        buf.isBufferDrawing = true;
        buf.sourceGraphicId = id;
        parent.bufferGraphic = buf;

        const idx = layer.graphics.indexOf(parent);
        if (idx >= 0) layer.graphics.add(buf, idx);
        else layer.add(buf);

        ensureWatcher(parent);
        window.dispatchEvent(new CustomEvent('saveDrawingsToStorage', { detail: { ts: Date.now() } }));
    };

    const removeBufferFor = (parent: ExtendedGraphic) => {
        const layer = getDrawLayer();
        if (!layer) return;
        const id = parent.attributes?.uniqueId;
        if (!id) return;

        if (parent.bufferGraphic) {
            try { layer.remove(parent.bufferGraphic); } catch { }
            parent.bufferGraphic = null;
        }

        if (parent.bufferLabel) {
            try { layer.remove(parent.bufferLabel); } catch { }
            parent.bufferLabel = null;
        }
        if (parent.bufferLabelShadow) {
            try { layer.remove(parent.bufferLabelShadow); } catch { }
            parent.bufferLabelShadow = null;
        }
        if (parent.bufferLeader) {
            try { layer.remove(parent.bufferLeader); } catch { }
            parent.bufferLeader = null;
        }
        if (parent.bufferLeaderOutline) {
            try { layer.remove(parent.bufferLeaderOutline); } catch { }
            parent.bufferLeaderOutline = null;
        }

        parent.bufferSettings = null;

        const w = geometryWatchers.current.get(id);
        if (w) { try { w.remove(); } catch { } geometryWatchers.current.delete(id); }
    };

    const triggerSave = () => {
        window.dispatchEvent(new CustomEvent('saveDrawingsToStorage', { detail: { ts: Date.now() } }));
    };

    // auto-create buffer on new drawings when enabled
    React.useEffect(() => {
        if (!sketchViewModel) return;
        const handle = sketchViewModel.on('create', (evt: any) => {
            if (evt?.state === 'complete' && bufferEnabled) {
                const g = asExtended(evt.graphic);
                if (g?.geometry) {
                    setTimeout(async () => {
                        try {
                            await createOrUpdateBufferFor(g, bufferDistance, bufferUnit);
                            triggerSave();
                            announceStatus(`Buffer automatically created: ${bufferDistance} ${formatUnit(bufferDistance, bufferUnit)}`);
                        } catch (e) { console.error('Auto buffer on create failed', e); }
                    }, 100);
                }
            }
        });
        return () => { try { handle.remove(); } catch { } };
    }, [sketchViewModel, bufferEnabled, bufferDistance, bufferUnit, announceStatus]);

    // --- button handlers (selected only) ---
    const handleUpdateBuffer = async () => {
        if (!bufferEnabled) {
            announceStatus('Buffer feature is disabled. Enable buffer to use this action.');
            return;
        }
        const selected = getSelectedMainGraphics();
        if (selected.length === 0) {
            announceStatus('No graphics selected. Select graphics on the map to create or update buffers.');
            return;
        }
        for (const g of selected) {
            if (!g.bufferGraphic) await createOrUpdateBufferFor(g, bufferDistance, bufferUnit);
            else {
                if (g.bufferSettings) {
                    g.bufferSettings.distance = bufferDistance;
                    g.bufferSettings.unit = bufferUnit;
                }
                await updateAttachedBuffer(g);
            }
        }
        saveSettings({ distance: bufferDistance, unit: bufferUnit });
        announceStatus(`Buffer updated: ${bufferDistance} ${formatUnit(bufferDistance, bufferUnit)} applied to ${selected.length} graphic${selected.length !== 1 ? 's' : ''}`);
    };

    const handleUpdateOpacity = () => {
        if (!bufferEnabled) {
            announceStatus('Buffer feature is disabled. Enable buffer to use this action.');
            return;
        }
        const selected = getSelectedMainGraphics();
        if (selected.length === 0) {
            announceStatus('No graphics selected. Select graphics with buffers to update opacity.');
            return;
        }
        let updatedCount = 0;
        selected.forEach(g => {
            if (g.bufferSettings && g.bufferGraphic) {
                g.bufferSettings.opacity = bufferOpacity;
                g.bufferGraphic.symbol = makeBufferSymbol(g);
                updatedCount++;
            }
        });
        saveSettings({ opacity: bufferOpacity });
        triggerSave();
        announceStatus(`Opacity updated to ${bufferOpacity}% for ${updatedCount} buffer${updatedCount !== 1 ? 's' : ''}`);
    };

    const handleLabelBuffer = () => {
        if (!bufferEnabled) {
            announceStatus('Buffer feature is disabled. Enable buffer to use this action.');
            return;
        }
        const layer = getDrawLayer();
        if (!layer) {
            announceStatus('Drawing layer not available.');
            return;
        }

        const selected = getSelectedMainGraphics();
        if (selected.length === 0) {
            announceStatus('No graphics selected. Select graphics with buffers to add labels.');
            return;
        }
        let labeledCount = 0;
        selected.forEach(g => {
            if (g.bufferGraphic && g.bufferSettings) {
                // Remove existing label/shadow/leader if present
                if (g.bufferLabel) { try { layer.remove(g.bufferLabel); } catch { } g.bufferLabel = null; }
                if (g.bufferLabelShadow) { try { layer.remove(g.bufferLabelShadow); } catch { } g.bufferLabelShadow = null; }
                if (g.bufferLeader) { try { layer.remove(g.bufferLeader); } catch { } g.bufferLeader = null; }
                if (g.bufferLeaderOutline) { try { layer.remove(g.bufferLeaderOutline); } catch { } g.bufferLeaderOutline = null; }

                // Create new label (also creates shadow and leader)
                const label = createBufferLabel(g, g.bufferGraphic.geometry);
                if (label) {
                    g.bufferLabel = label;
                    if (g.bufferSettings) { g.bufferSettings.hasLabel = true; }
                    // Inherit visibility from parent
                    if (g.visible === false) {
                        label.visible = false;
                        if (g.bufferLabelShadow) g.bufferLabelShadow.visible = false;
                        if (g.bufferLeader) g.bufferLeader.visible = false;
                        if (g.bufferLeaderOutline) g.bufferLeaderOutline.visible = false;
                    }
                    labeledCount++;
                }
            }
        });
        triggerSave();
        announceStatus(`Labels added to ${labeledCount} buffer${labeledCount !== 1 ? 's' : ''}`);
    };

    const handleRemoveBuffer = () => {
        const selected = getSelectedMainGraphics();
        if (selected.length === 0) {
            announceStatus('No graphics selected. Select graphics to remove their buffers.');
            return;
        }
        let removedCount = 0;
        selected.forEach(g => {
            if (g.bufferGraphic) {
                removeBufferFor(g);
                removedCount++;
            }
        });
        triggerSave();
        announceStatus(`${removedCount} buffer${removedCount !== 1 ? 's' : ''} removed from selected graphics`);
    };

    // Handle checkbox state change with screen reader announcement
    const handleBufferEnabledChange = (val: boolean) => {
        setBufferEnabled(val);
        announceStatus(val ? 'Buffer feature enabled. Configure distance, unit, and opacity below.' : 'Buffer feature disabled.');
    };

    // --- UI ---
    return (
        <div
            className='drawToolbarDiv'
            role="region"
            aria-label="Buffer Controls Panel"
            aria-describedby={descriptionId}
        >
            {/* Hidden description for screen readers */}
            <div id={descriptionId} className="sr-only" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                Buffer controls allow you to create buffer zones around map graphics.
                Enable the buffer feature, set the distance and unit of measurement,
                adjust opacity, then use the action buttons to apply, label, or remove buffers from selected graphics.
            </div>

            {/* Live region for status announcements - WCAG 2.1 compliant */}
            <div
                id={statusRegionId}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
                {statusMessage}
            </div>

            <div
                title="Enable or disable buffer creation for map graphics. When enabled, buffers will be automatically created around new drawings."
            >
                <CollapsableCheckbox
                    className='w-100'
                    label='Enable Buffer'
                    checked={bufferEnabled}
                    onCheckedChange={handleBufferEnabledChange}
                    disableActionForUnchecked
                    openForCheck
                    closeForUncheck
                    aria-label="Enable Buffer - Checkbox to toggle buffer creation feature"
                    aria-describedby={descriptionId}
                    aria-expanded={bufferEnabled}
                    aria-controls={`${componentId}-content`}
                >
                    <div
                        id={`${componentId}-content`}
                        className='ml-3 my-1'
                        role="group"
                        aria-label="Buffer Configuration Options"
                    >
                        {/* Distance Input Row */}
                        <div
                            className='d-flex align-items-center mb-2'
                            role="group"
                            aria-labelledby={`${distanceInputId}-label`}
                        >
                            <Label
                                id={`${distanceInputId}-label`}
                                for={distanceInputId}
                                className='mr-2 mb-0 d-flex align-items-center'
                                title="Buffer distance - the radius of the buffer zone around graphics"
                            >
                                Distance:
                            </Label>
                            {/* Hidden description for screen readers */}
                            <span id={distanceDescId} className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
                                Enter the buffer distance value. Minimum value is 0.1. Use arrow keys or type a number.
                            </span>
                            <NumericInput
                                id={distanceInputId}
                                size='sm'
                                value={bufferDistance}
                                onChange={(v: number) => {
                                    setBufferDistance(v);
                                    saveSettings({ distance: v });
                                }}
                                className='mr-2'
                                style={{ width: '80px' }}
                                min={0.1}
                                step={0.1}
                                aria-label={`Buffer distance in ${bufferUnit}`}
                                aria-describedby={distanceDescId}
                                aria-valuemin={0.1}
                                aria-valuenow={bufferDistance}
                                aria-required="true"
                                title={`Current buffer distance: ${bufferDistance} ${bufferUnit}. Enter the distance value for the buffer zone. Minimum: 0.1`}
                            />
                            {/* Hidden description for unit select */}
                            <span id={unitDescId} className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
                                Select the unit of measurement for the buffer distance. Options: Feet, Meters, Miles, Kilometers.
                            </span>
                            <Select
                                id={unitSelectId}
                                size='sm'
                                value={bufferUnit}
                                onChange={(e) => {
                                    const u = (e.target as HTMLSelectElement).value;
                                    setBufferUnit(u);
                                    saveSettings({ unit: u });
                                    announceStatus(`Buffer unit changed to ${u}`);
                                }}
                                style={{ width: '110px' }}
                                aria-label="Buffer distance unit of measurement"
                                aria-describedby={unitDescId}
                                title={`Current unit: ${bufferUnit}. Select the unit of measurement for the buffer distance.`}
                            >
                                <Option
                                    value='feet'
                                    aria-label="Feet - Imperial unit of measurement"
                                    title="Feet - Standard imperial unit for short distances"
                                >
                                    Feet
                                </Option>
                                <Option
                                    value='meters'
                                    aria-label="Meters - Metric unit of measurement"
                                    title="Meters - Standard metric unit for short distances"
                                >
                                    Meters
                                </Option>
                                <Option
                                    value='miles'
                                    aria-label="Miles - Imperial unit for longer distances"
                                    title="Miles - Imperial unit for longer distances (5,280 feet)"
                                >
                                    Miles
                                </Option>
                                <Option
                                    value='kilometers'
                                    aria-label="Kilometers - Metric unit for longer distances"
                                    title="Kilometers - Metric unit for longer distances (1,000 meters)"
                                >
                                    Kilometers
                                </Option>
                            </Select>
                        </div>

                        {/* Opacity Input Row */}
                        <div
                            className='d-flex align-items-center mb-2'
                            role="group"
                            aria-labelledby={`${opacityInputId}-label`}
                        >
                            <Label
                                id={`${opacityInputId}-label`}
                                for={opacityInputId}
                                className='mr-2 mb-0 d-flex align-items-center'
                                title="Buffer opacity - controls the transparency of the buffer visualization"
                            >
                                Opacity:
                            </Label>
                            {/* Hidden description for screen readers */}
                            <span id={opacityDescId} className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
                                Enter the buffer opacity percentage. Range: 1 to 100 percent. Higher values make the buffer more visible.
                            </span>
                            <NumericInput
                                id={opacityInputId}
                                size='sm'
                                value={bufferOpacity}
                                onChange={(v: number) => {
                                    setBufferOpacity(v);
                                    saveSettings({ opacity: v });
                                }}
                                className='mr-2'
                                style={{ width: '80px' }}
                                min={1}
                                max={100}
                                step={1}
                                aria-label="Buffer opacity percentage"
                                aria-describedby={opacityDescId}
                                aria-valuemin={1}
                                aria-valuemax={100}
                                aria-valuenow={bufferOpacity}
                                aria-required="true"
                                title={`Current opacity: ${bufferOpacity}%. Enter a value between 1 and 100. Higher values make the buffer more visible on the map.`}
                            />
                            <span
                                className='text-muted'
                                aria-hidden="true"
                                title="Percent symbol - opacity is measured as a percentage"
                            >
                                %
                            </span>
                        </div>

                        {/* Action Buttons - spread across the widget */}
                        <div
                            className='d-flex gap-2 mt-1'
                            role="toolbar"
                            aria-label="Buffer action buttons"
                            aria-describedby={`${componentId}-toolbar-desc`}
                        >
                            {/* Hidden toolbar description */}
                            <span
                                id={`${componentId}-toolbar-desc`}
                                className="sr-only"
                                style={{ position: 'absolute', left: '-9999px' }}
                            >
                                Use these buttons to manage buffers on selected graphics.
                                First select graphics on the map, then use these actions.
                            </span>

                            <Button
                                size='sm'
                                onClick={handleUpdateBuffer}
                                className='flex-fill'
                                style={{ minWidth: 0 }}
                                title='Update Buffer - Creates new buffers or updates existing buffer geometry for all currently selected graphics using the distance and unit values configured above'
                                aria-label={`Update Buffer - Apply ${bufferDistance} ${bufferUnit} buffer to selected graphics`}
                                aria-describedby={`${componentId}-update-desc`}
                                disabled={!bufferEnabled}
                                aria-disabled={!bufferEnabled}
                            >
                                Update Buffer
                            </Button>
                            {/* Hidden button description */}
                            <span
                                id={`${componentId}-update-desc`}
                                className="sr-only"
                                style={{ position: 'absolute', left: '-9999px' }}
                            >
                                Creates new buffer zones or updates existing buffers for selected map graphics
                                using the current distance ({bufferDistance}) and unit ({bufferUnit}) settings.
                            </span>

                            <Button
                                size='sm'
                                onClick={handleUpdateOpacity}
                                className='flex-fill'
                                style={{ minWidth: 0 }}
                                title='Update Graphic - Applies the current opacity setting to all buffers on selected graphics without changing their size or shape'
                                aria-label={`Update Graphic Opacity - Set buffer opacity to ${bufferOpacity}% for selected graphics`}
                                aria-describedby={`${componentId}-opacity-btn-desc`}
                                disabled={!bufferEnabled}
                                aria-disabled={!bufferEnabled}
                            >
                                Update Graphic
                            </Button>
                            {/* Hidden button description */}
                            <span
                                id={`${componentId}-opacity-btn-desc`}
                                className="sr-only"
                                style={{ position: 'absolute', left: '-9999px' }}
                            >
                                Updates the visual opacity of existing buffers on selected graphics
                                to {bufferOpacity}% without changing buffer geometry.
                            </span>

                            <Button
                                size='sm'
                                onClick={handleLabelBuffer}
                                className='flex-fill'
                                style={{ minWidth: 0 }}
                                title='Label Buffer - Adds text labels showing the buffer distance to all buffers on selected graphics. Labels include a leader line connecting to the buffer.'
                                aria-label="Label Buffer - Add distance labels to buffers on selected graphics"
                                aria-describedby={`${componentId}-label-desc`}
                                disabled={!bufferEnabled}
                                aria-disabled={!bufferEnabled}
                            >
                                Label Buffer
                            </Button>
                            {/* Hidden button description */}
                            <span
                                id={`${componentId}-label-desc`}
                                className="sr-only"
                                style={{ position: 'absolute', left: '-9999px' }}
                            >
                                Adds visible text labels showing buffer distance to selected graphics.
                                Labels are positioned outside the buffer with a leader line for clarity.
                            </span>

                            <Button
                                size='sm'
                                onClick={handleRemoveBuffer}
                                className='flex-fill'
                                style={{ minWidth: 0 }}
                                title='Remove Buffer - Permanently removes all buffer zones and their labels from the currently selected graphics'
                                aria-label="Remove Buffer - Delete buffers and labels from selected graphics"
                                aria-describedby={`${componentId}-remove-desc`}
                            >
                                Remove Buffer
                            </Button>
                            {/* Hidden button description */}
                            <span
                                id={`${componentId}-remove-desc`}
                                className="sr-only"
                                style={{ position: 'absolute', left: '-9999px' }}
                            >
                                Permanently removes buffer zones, labels, and leader lines from all selected graphics.
                                This action cannot be undone.
                            </span>
                        </div>

                        {/* Keyboard navigation hint for screen readers */}
                        <div
                            className="sr-only"
                            style={{ position: 'absolute', left: '-9999px' }}
                            role="note"
                            aria-label="Keyboard navigation instructions"
                        >
                            Use Tab to navigate between controls.
                            Use arrow keys to adjust numeric values.
                            Press Enter or Space to activate buttons.
                            Buffer status updates will be announced automatically.
                        </div>
                    </div>
                </CollapsableCheckbox>
            </div>
        </div>
    );
};