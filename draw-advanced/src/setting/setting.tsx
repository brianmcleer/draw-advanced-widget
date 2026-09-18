import { React, defaultMessages as jimuCoreMessages } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { IMConfig, Config, DrawMode, StorageScope } from '../config';
import defaultMessages from './translations/default';
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { Select, Option, defaultMessages as jimuUIDefaultMessages, Checkbox, TextInput, TextArea, Label, Button, Alert, Switch, NumericInput, Tooltip } from 'jimu-ui'
import { SidePopper } from 'jimu-ui/advanced/setting-components'
import { ColorPicker } from 'jimu-ui/basic/color-picker'
import UnitMaker from './components/unitMaker';

// ============================================================================
// Types
// ============================================================================

interface Unit {
    unit: string;
    label: string;
    abbreviation: string;
    conversion: number;
}

const toMutableUnits = (value: any): Unit[] => {
    if (!value) return []
    if (typeof value.asMutable === 'function') return value.asMutable({ deep: true }) as Unit[]
    return Array.isArray(value) ? [...value] as Unit[] : []
}

interface SettingState {
    linearSidePopper: boolean;
    areaSidePopper: boolean;
    defaultDistanceUnit: any;
    defaultAreaUnit: any;
    availableDistanceUnits: Unit[];
    availableAreaUnits: Unit[];
    detectedWidgets: Array<{ id: string; label: string }>;
    scanning: boolean;
    scanMessage: string;
    exportXml: string;
    importXml: string;
    importError: string;
    importSuccess: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const defaultDistanceUnits: Unit[] = [
    { unit: 'kilometers', label: 'Kilometers', abbreviation: 'km', conversion: 0.001 },
    { unit: 'miles', label: 'Miles', abbreviation: 'mi', conversion: 0.000621371 },
    { unit: 'meters', label: 'Meters', abbreviation: 'm', conversion: 1 },
    { unit: 'nautical-miles', label: 'Nautical Miles', abbreviation: 'NM', conversion: 0.000539957 },
    { unit: 'feet', label: 'Feet', abbreviation: 'ft', conversion: 3.28084 },
    { unit: 'yards', label: 'Yards', abbreviation: 'yd', conversion: 1.09361 }
];

const defaultAreaUnits: Unit[] = [
    { unit: 'square-kilometers', label: 'Square Kilometers', abbreviation: 'km\xb2', conversion: 0.000001 },
    { unit: 'square-miles', label: 'Square Miles', abbreviation: 'mi\xb2', conversion: 3.86102e-7 },
    { unit: 'acres', label: 'Acres', abbreviation: 'ac', conversion: 0.000247105 },
    { unit: 'hectares', label: 'Hectares', abbreviation: 'ha', conversion: 0.0001 },
    { unit: 'square-meters', label: 'Square Meters', abbreviation: 'm\xb2', conversion: 1 },
    { unit: 'square-feet', label: 'Square Feet', abbreviation: 'ft\xb2', conversion: 10.7639 },
    { unit: 'square-yards', label: 'Square Yards', abbreviation: 'yd\xb2', conversion: 1.19599 }
];

const DRAW_TOOLS: Array<{ key: keyof Config; label: string; icon: string; desc: string }> = [
    { key: 'enablePointTool', label: 'Point', icon: '\u25CF', desc: 'Place single point markers.' },
    { key: 'enablePolylineTool', label: 'Polyline', icon: '\u2571', desc: 'Draw multi-segment lines by clicking vertices.' },
    { key: 'enableFreePolylineTool', label: 'Freehand Line', icon: '\u223F', desc: 'Draw freehand lines by dragging.' },
    { key: 'enableTextTool', label: 'Text', icon: 'T', desc: 'Place editable text labels on the map.' },
    { key: 'enableRectangleTool', label: 'Rectangle', icon: '\u25AD', desc: 'Draw rectangles by dragging.' },
    { key: 'enablePolygonTool', label: 'Polygon', icon: '\u2B20', desc: 'Draw multi-vertex polygons by clicking.' },
    { key: 'enableFreePolygonTool', label: 'Freehand Polygon', icon: '\u25CC', desc: 'Draw freehand polygons by dragging.' },
    { key: 'enableCircleTool', label: 'Circle', icon: '\u25CB', desc: 'Draw circles by dragging from a center point.' },
    { key: 'enableTriangleTool', label: 'Triangle', icon: '\u25B3', desc: 'Draw equilateral triangles.' },
    { key: 'enableCurveTools', label: 'Curve Tools', icon: '\u2312', desc: 'Bezier / arc curve drawing options. Requires a compatible JSAPI Sketch build.' }
];

// ============================================================================
// Styles
// ============================================================================

const s = {
    toggleRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '6px 0'
    } as React.CSSProperties,
    toggleLabel: { margin: 0, fontSize: '13px', fontWeight: 500 } as React.CSSProperties,
    sub: { fontSize: '11px', color: 'var(--calcite-color-text-2, #6c757d)', margin: '2px 0 0 0', lineHeight: '1.4' } as React.CSSProperties,
    sectionDesc: { fontSize: '12px', color: 'var(--calcite-color-text-2, #6c757d)', margin: '0 0 8px 0', lineHeight: '1.4' } as React.CSSProperties,
    checkRow: { display: 'flex', alignItems: 'center', padding: '4px 0' } as React.CSSProperties,
    checkLabel: { marginLeft: '6px', fontSize: '13px' } as React.CSSProperties,
    divider: { borderTop: '1px solid var(--calcite-color-border-3, #e8e8e8)', margin: '8px 0' } as React.CSSProperties,
    indent: { paddingLeft: '12px', borderLeft: '3px solid var(--calcite-color-border-3, #e0e0e0)', marginTop: '6px' } as React.CSSProperties,
    toolGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', padding: '4px 0' } as React.CSSProperties,
    toolIcon: { display: 'inline-block', width: '18px', textAlign: 'center', fontSize: '13px', color: 'var(--calcite-color-text-2, #666)', marginRight: '2px' } as React.CSSProperties,
    quickBtns: { display: 'flex', gap: '6px', marginBottom: '6px' } as React.CSSProperties,
    fieldLabel: { display: 'block', fontSize: '13px', fontWeight: 500, margin: '0 0 4px 0' } as React.CSSProperties,
    fieldRow: { width: '100%', padding: '4px 0' } as React.CSSProperties,
};

// ============================================================================
// Component
// ============================================================================

type SettingProps = AllWidgetSettingProps<IMConfig> & {
    id: string;
    useMapWidgetIds?: string[];
    useDataSources?: any[];
    [key: string]: any;
};

// ---------------------------------------------------------------------------
// Settings XML transfer: schema-level key lists.
// The import allowlist must be the config SCHEMA, not the keys that happen to
// be set in the receiving app — a boolean feature toggle that was never touched
// there is absent from its config object, and an instance-derived allowlist
// silently dropped it on import. Likewise, defaulted booleans (undefined ⇒ on)
// were never written on export, so an export could not turn a feature back on
// in an app where it had been switched off. Keep both lists in step with the
// Config interface in ../config.ts when adding keys.
// ---------------------------------------------------------------------------
const KNOWN_CONFIG_KEYS: string[] = [
    'creationMode',
    'turnOffOnClose',
    'changeTitle',
    'distanceUnits',
    'areaUnits',
    'radiusUnits',
    'measurePointLabel',
    'measurePolylineLabel',
    'measurePolygonLabel',
    'measureCircleLabel',
    'title',
    'listMode',
    'changeListMode',
    'userDistances',
    'defaultDistance',
    'userAreas',
    'defaultArea',
    'storageScope',
    'enableMailingLabels',
    'mailingLabelsWidgetId',
    'mailingLabelsControllerId',
    'enableIdentifyByQuery',
    'identifyWidgetId',
    'identifyControllerId',
    'enableIdentifyIntegration',
    'enableMyDrawings',
    'enableMyDrawingsImport',
    'enableMyDrawingsExport',
    'enableMyDrawingsLock',
    'enableMyDrawingsGroup',
    'enableMyDrawingsMerge',
    'enableMyDrawingsDuplicate',
    'enableMyDrawingsZoomTo',
    'enableMyDrawingsProperties',
    'enableMyDrawingsSort',
    'maxDrawings',
    'defaultTab',
    'enablePointTool',
    'enablePolylineTool',
    'enableFreePolylineTool',
    'enableTextTool',
    'enableRectangleTool',
    'enablePolygonTool',
    'enableFreePolygonTool',
    'enableCircleTool',
    'enableTriangleTool',
    'enableCurveTools',
    'enableCopyFromMap',
    'enableSymbolEditor',
    'enableMeasurements',
    'rememberMeasurementPreferences',
    'allowMultipleUnits',
    'enableSnapping',
    'enableBuffer',
    'defaultBufferDistance',
    'defaultBufferUnit',
    'defaultBufferOpacity',
    'defaultBufferColor',
    'enableUndoRedo',
    'confirmBeforeClear'
]

// Boolean toggles whose undefined value means ON (rendered with `!== false`).
const DEFAULT_ON_BOOLEAN_KEYS: string[] = [
    'turnOffOnClose',
    'changeTitle',
    'changeListMode',
    'enableMailingLabels',
    'enableIdentifyByQuery',
    'enableIdentifyIntegration',
    'enableMyDrawings',
    'enableMyDrawingsImport',
    'enableMyDrawingsExport',
    'enableMyDrawingsLock',
    'enableMyDrawingsGroup',
    'enableMyDrawingsMerge',
    'enableMyDrawingsDuplicate',
    'enableMyDrawingsZoomTo',
    'enableMyDrawingsProperties',
    'enableMyDrawingsSort',
    'enablePointTool',
    'enablePolylineTool',
    'enableFreePolylineTool',
    'enableTextTool',
    'enableRectangleTool',
    'enablePolygonTool',
    'enableFreePolygonTool',
    'enableCircleTool',
    'enableTriangleTool',
    'enableCurveTools',
    'enableCopyFromMap',
    'enableSymbolEditor',
    'enableMeasurements',
    'rememberMeasurementPreferences',
    'allowMultipleUnits',
    'enableSnapping',
    'enableBuffer',
    'enableUndoRedo',
    'confirmBeforeClear'
]

export default class Setting extends React.PureComponent<SettingProps, SettingState> {
    // Translation helper backed by the builder's intl; falls back to English defaults.
    nls = (id: string, values?: Record<string, any>): string =>
        (this.props as any).intl ? (this.props as any).intl.formatMessage({ id, defaultMessage: (defaultMessages as any)[id] }, values) : ((defaultMessages as any)[id] ?? id);

    declare props: SettingProps;
    declare state: SettingState;
    declare setState: any;
    declare forceUpdate: any;
    constructor(props) {
        super(props)
        this.state = {
            linearSidePopper: false,
            areaSidePopper: false,
            defaultDistanceUnit: this.props.config.defaultDistance,
            defaultAreaUnit: this.props.config.defaultArea,
            availableDistanceUnits: [...defaultDistanceUnits, ...toMutableUnits(this.props.config.userDistances)],
            availableAreaUnits: [...defaultAreaUnits, ...toMutableUnits(this.props.config.userAreas)],
            detectedWidgets: [],
            scanning: false,
            scanMessage: '',
            exportXml: '',
            importXml: '',
            importError: '',
            importSuccess: false
        }
    }

    // Hidden file input used by the settings XML import
    private fileInputRef = React.createRef<HTMLInputElement>();

    // ========================================================================
    // Config helpers
    // ========================================================================

    formatMessage = (id) => {
        return this.props.intl
            ? this.props.intl.formatMessage({ id: id, defaultMessage: defaultMessages[id] || id })
            : id
    }

    onPropertyChange = (name: keyof Config, value: any) => {
        const { config } = this.props
        if (value === config[name]) return
        this.props.onSettingChange({ id: this.props.id, config: config.set(name, value) })
    }

    onMapWidgetSelected = (useMapWidgetsId: string[]) => {
        this.props.onSettingChange({ id: this.props.id, useMapWidgetIds: useMapWidgetsId });
    }

    setConfig = (key: keyof Config, value: any) => {
        this.props.onSettingChange({ id: this.props.id, config: this.props.config.set(key, value) })
    }

    setConfigBatch = (updates: Partial<Config>) => {
        let cfg = this.props.config;
        for (const [key, value] of Object.entries(updates) as Array<[keyof Config, Config[keyof Config]]>) {
            cfg = cfg.set(key, value as any) as any;
        }
        this.props.onSettingChange({ id: this.props.id, config: cfg });
    }

    toggleConfig = (key: keyof Config) => {
        this.setConfig(key, !this.props.config[key])
    }

    // ========================================================================
    // Settings import / export (XML) — transfer config between applications
    // ========================================================================

    private escapeXml = (str: string): string =>
        String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')

    /** Serialize the entire widget config to a portable XML document. */
    generateSettingsXml = (): string => {
        const cfg: any = (this.props.config as any)?.asMutable
            ? (this.props.config as any).asMutable({ deep: true })
            : { ...(this.props.config as any) }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml += '<DrawAdvancedSettings version="4.4.0">\n'
        // Materialize defaulted booleans so the export is complete and portable.
        DEFAULT_ON_BOOLEAN_KEYS.forEach((k) => { if (cfg[k] === undefined || cfg[k] === null) cfg[k] = true })
        Object.keys(cfg || {}).sort().forEach((key) => {
            const value = cfg[key]
            if (value === undefined || value === null) return
            let type = 'string'
            let text = ''
            if (typeof value === 'boolean') { type = 'boolean'; text = value ? 'true' : 'false' }
            else if (typeof value === 'number') { type = 'number'; text = String(value) }
            else if (typeof value === 'object') { type = 'json'; text = JSON.stringify(value) }
            else { type = 'string'; text = String(value) }
            xml += `  <setting key="${this.escapeXml(key)}" type="${type}">${this.escapeXml(text)}</setting>\n`
        })
        xml += '</DrawAdvancedSettings>'
        return xml
    }

    /** Parse the XML document into a flat key→value map, coercing by declared type. */
    private unescapeXml = (str: string): string =>
        String(str)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&')

    parseSettingsXml = (xmlString: string): Record<string, any> | null => {
        try {
            if (typeof xmlString !== 'string' || xmlString.indexOf('<DrawAdvancedSettings') === -1) return null

            // Only import keys in the config schema (KNOWN_CONFIG_KEYS) or already
            // present in the current config. This hardens the import (no arbitrary
            // keys) and keeps the parse a plain text scan rather than routing
            // untrusted text through a DOM parser, which is reported as a
            // DOM-based XSS sink.
            const cfg: any = (this.props.config as any)?.asMutable
                ? (this.props.config as any).asMutable({ deep: true })
                : { ...(this.props.config as any) }
            const allowed = new Set([...Object.keys(cfg || {}), ...KNOWN_CONFIG_KEYS])

            const out: Record<string, any> = {}
            const settingRe = /<setting\b([^>]*)>([\s\S]*?)<\/setting>/g
            const keyRe = /\bkey\s*=\s*"([^"]*)"/
            const typeRe = /\btype\s*=\s*"([^"]*)"/
            let m: RegExpExecArray | null
            while ((m = settingRe.exec(xmlString)) !== null) {
                const attrs = m[1] || ''
                const keyMatch = keyRe.exec(attrs)
                if (!keyMatch) continue
                const key = this.unescapeXml(keyMatch[1])
                if (!allowed.has(key)) continue
                const type = (typeRe.exec(attrs)?.[1]) || 'string'
                const raw = this.unescapeXml(m[2] ?? '')
                try {
                    if (type === 'boolean') out[key] = raw.trim() === 'true'
                    else if (type === 'number') { const n = Number(raw); if (!isNaN(n)) out[key] = n }
                    else if (type === 'json') out[key] = JSON.parse(raw)
                    else out[key] = raw
                } catch { /* skip malformed entry */ }
            }
            return Object.keys(out).length > 0 ? out : null
        } catch {
            return null
        }
    }

    handleGenerateExport = () => {
        this.setState({ exportXml: this.generateSettingsXml() })
    }

    handleCopyExport = () => {
        try { navigator.clipboard?.writeText(this.state.exportXml || this.generateSettingsXml()) } catch { /* no-op */ }
    }

    handleDownloadExport = () => {
        const xml = this.state.exportXml || this.generateSettingsXml()
        const blob = new Blob([xml], { type: 'application/xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'draw-advanced-settings.xml'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            this.setState({ importXml: (event.target?.result as string) || '', importError: '', importSuccess: false })
        }
        reader.onerror = () => this.setState({ importError: 'Could not read the selected file.' })
        reader.readAsText(file)
        if (this.fileInputRef.current) this.fileInputRef.current.value = ''
    }

    handleApplyImport = () => {
        const text = (this.state.importXml || '').trim()
        if (!text) { this.setState({ importError: 'Paste XML or load a file first.', importSuccess: false }); return }
        const parsed = this.parseSettingsXml(text)
        if (!parsed) { this.setState({ importError: 'Could not parse this file. Make sure it is a Draw Advanced settings XML export.', importSuccess: false }); return }

        let cfg = this.props.config
        for (const [key, value] of Object.entries(parsed)) {
            cfg = cfg.set(key as keyof Config, value as any) as any
        }
        this.props.onSettingChange({ id: this.props.id, config: cfg })

        // Refresh local state derived from config so the unit pickers reflect the import.
        const importedUserDistances = toMutableUnits(cfg.userDistances)
        const importedUserAreas = toMutableUnits(cfg.userAreas)
        this.setState({
            importError: '',
            importSuccess: true,
            importXml: '',
            defaultDistanceUnit: cfg.defaultDistance,
            defaultAreaUnit: cfg.defaultArea,
            availableDistanceUnits: [...defaultDistanceUnits, ...importedUserDistances],
            availableAreaUnits: [...defaultAreaUnits, ...importedUserAreas]
        })
        setTimeout(() => this.setState({ importSuccess: false }), 4000)
    }

    componentDidMount() {
        if (this.props.config.storageScope === undefined) {
            this.setConfig('storageScope', StorageScope.APP_SPECIFIC)
        }
    }

    // ========================================================================
    // Specific handlers
    // ========================================================================

    handleDrawModeChange = (evt) => { this.onPropertyChange('creationMode', evt?.target?.value) }
    handleTitle = (value) => { this.setConfig('title', value) }

    handleDefaultDistance = (value) => {
        this.setConfig('defaultDistance', value)
        this.setState({ defaultDistanceUnit: value })
    }

    handleDefaultArea = (value) => {
        this.setConfig('defaultArea', value)
        this.setState({ defaultAreaUnit: value })
    }

    handleStorageScopeChange = (evt) => {
        this.setConfig('storageScope', evt?.target?.value as StorageScope)
    }

    handleAddUnit = (newUnit: Unit, type: 'linear' | 'area') => {
        if (type === 'linear') {
            const userDistances = toMutableUnits(this.props.config.userDistances)
            const updatedDistances = [...userDistances, newUnit]
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = toMutableUnits(this.props.config.userAreas)
            const updatedAreas = [...userAreas, newUnit]
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userAreas', updatedAreas) })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...updatedAreas], defaultAreaUnit: null })
        }
    }

    handleChangeUnit = (newUnit: Unit, type: 'linear' | 'area') => {
        if (type === 'linear') {
            const userDistances = toMutableUnits(this.props.config.userDistances)
            const updatedDistances = [...userDistances]
            const index = updatedDistances.findIndex(existing => existing.unit === newUnit.unit)
            if (index !== -1) updatedDistances[index] = newUnit
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = toMutableUnits(this.props.config.userAreas)
            const updatedAreas = [...userAreas]
            const index = updatedAreas.findIndex(existing => existing.unit === newUnit.unit)
            if (index !== -1) updatedAreas[index] = newUnit
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userAreas', updatedAreas) })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...updatedAreas], defaultAreaUnit: null })
        }
    }

    handleDeleteUnit = (unit: Unit, type: 'linear' | 'area') => {
        if (type === 'linear') {
            const userDistances = toMutableUnits(this.props.config.userDistances)
            const updatedDistances = userDistances.filter(u => u.unit !== unit.unit)
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = toMutableUnits(this.props.config.userAreas)
            const updatedAreas = userAreas.filter(u => u.unit !== unit.unit)
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userAreas', updatedAreas) })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...updatedAreas], defaultAreaUnit: null })
        }
    }

    // ========================================================================
    // Render helpers
    // ========================================================================

    /** Scan app config.json for all widgets (ExB dev edition builder doesn't expose user widgets in the store) */
    scanForWidgets = async () => {
        this.setState({ scanning: true });
        try {
            const url = new URL(window.location.href);
            let appId = url.searchParams.get('id');
            if (!appId) {
                const pathMatch = window.location.href.match(/experience\/(\d+)/);
                appId = pathMatch ? pathMatch[1] : null;
            }
            if (!appId) {
                this.setState({ scanning: false, scanMessage: 'Could not determine the app ID from the URL. Enter the widget ID manually below.' });
                return;
            }

            const baseUrl = window.location.origin;
            const possiblePaths = [
                `${baseUrl}/apps/${appId}/config.json`,
                `/apps/${appId}/config.json`,
            ];

            let appConfigData: any = null;
            for (const path of possiblePaths) {
                try {
                    const resp = await fetch(path);
                    if (resp.ok) {
                        const text = await resp.text();
                        try {
                            const data = JSON.parse(text);
                            if (data.widgets) {
                                appConfigData = data;
                                break;
                            }
                        } catch { /* not valid JSON */ }
                    }
                } catch { /* try next */ }
            }

            if (appConfigData?.widgets) {
                const allWidgets = Object.entries(appConfigData.widgets)
                    .map(([id, w]: [string, any]) => ({
                        id,
                        label: w.label || id
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                this.setState({ detectedWidgets: allWidgets, scanMessage: '' });
            } else {
                this.setState({ scanMessage: `Could not load the app config. Enter the widget ID manually. Your config is at: server/public/apps/${appId}/config.json` });
            }
        } catch (e) {
            console.warn('Draw Widget Scan: Error', e);
        }
        this.setState({ scanning: false });
    };

    /** Default-ON Switch (enabled unless explicitly false) */
    renderToggle = (key: keyof Config, label: string, description?: string) => {
        const checked = this.props.config[key] !== false;
        const descId = `draw-setting-${key}-desc`;
        const control = (
            <Switch
                checked={checked}
                onChange={() => this.setConfig(key, !checked)}
                aria-label={label}
                aria-describedby={description ? descId : undefined}
                title={description || label}
            />
        );
        return (
            <SettingRow>
                <div style={s.toggleRow}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                        <Label style={s.toggleLabel} title={description || label}>{label}</Label>
                        {description && <p id={descId} style={s.sub}>{description}</p>}
                    </div>
                    {description ? <Tooltip title={description} placement='left'>{control}</Tooltip> : control}
                </div>
            </SettingRow>
        )
    }

    /** Default-OFF Switch (opt-in, off unless explicitly true) */
    renderOptInToggle = (key: keyof Config, label: string, description?: string) => {
        const checked = this.props.config[key] === true;
        const descId = `draw-setting-${key}-desc`;
        const control = (
            <Switch
                checked={checked}
                onChange={() => this.setConfig(key, !checked)}
                aria-label={label}
                aria-describedby={description ? descId : undefined}
                title={description || label}
            />
        );
        return (
            <SettingRow>
                <div style={s.toggleRow}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                        <Label style={s.toggleLabel} title={description || label}>{label}</Label>
                        {description && <p id={descId} style={s.sub}>{description}</p>}
                    </div>
                    {description ? <Tooltip title={description} placement='left'>{control}</Tooltip> : control}
                </div>
            </SettingRow>
        )
    }

    /** Checkbox with inline label. defaultOn=true means feature is on unless config says false. */
    renderCheck = (key: keyof Config, label: string, defaultOn: boolean = true, tip?: string) => {
        const checked = defaultOn ? this.props.config[key] !== false : this.props.config[key] === true;
        const row = (
            <div style={s.checkRow} title={tip || label}>
                <Checkbox checked={checked} onChange={() => this.setConfig(key, !checked)} aria-label={tip ? `${label}. ${tip}` : label} />
                <span style={s.checkLabel}>{label}</span>
            </div>
        );
        return tip ? <Tooltip title={tip} placement='left'>{row}</Tooltip> : row;
    }

    // ========================================================================
    // Render
    // ========================================================================

    render() {
        const { useMapWidgetIds, config } = this.props
        const userDistances = toMutableUnits(config.userDistances)
        const userAreas = toMutableUnits(config.userAreas)

        const enabledToolCount = DRAW_TOOLS.filter(t => config[t.key] !== false).length;
        const myDrawingsEnabled = config.enableMyDrawings !== false;
        const measurementsEnabled = config.enableMeasurements !== false;

        return (
            <div>
                <div className="widget-setting-psearch">

                    {/* ================================================================
                        SECTION 1: MAP & DRAW MODE
                    ================================================================ */}
                    <SettingSection className="map-selector-section" title={this.formatMessage('sourceLabel')}>
                        <SettingRow label={this.formatMessage('selectMapWidget')} />
                        <SettingRow>
                            <MapWidgetSelector onSelect={this.onMapWidgetSelected} useMapWidgetIds={useMapWidgetIds} />
                        </SettingRow>
                        <SettingRow label={this.formatMessage('selectDrawMode')} flow='wrap'>
                            <Select value={config.creationMode} onChange={this.handleDrawModeChange} className='drop-height' aria-label={this.nls('settingDrawingCreationMode')}>
                                <Option value={DrawMode.CONTINUOUS} title={this.nls('settingKeepTheActiveToolSelected')}>{this.formatMessage('drawModeContinuous')}</Option>
                                <Option value={DrawMode.SINGLE} title={this.nls('settingDeactivateTheToolAfterEach')}>{this.formatMessage('drawModeSingle')}</Option>
                            </Select>
                            <p style={{ ...s.sub, marginTop: '4px' }}>
                                {config.creationMode === DrawMode.CONTINUOUS
                                    ? 'Drawing tool stays active after completing each shape.'
                                    : 'Drawing tool deactivates after completing one shape.'}
                            </p>
                        </SettingRow>
                    </SettingSection>

                    {/* ================================================================
                        SECTION: IMPORT / EXPORT SETTINGS
                    ================================================================ */}
                    <SettingSection title={this.nls('settingImportExportSettings')}>
                        <p style={s.sectionDesc}>
                            Save this widget&apos;s configuration to an XML file, or load a saved file to copy settings
                            between applications. Importing merges the file&apos;s values onto the current configuration.
                            The selected map widget is not included.
                        </p>

                        {/* Export */}
                        <div style={s.fieldRow}>
                            <Label style={s.fieldLabel}>{this.nls('settingExport')}</Label>
                            <div style={s.quickBtns}>
                                <Tooltip title={this.nls('settingBuildAnXmlDocumentFrom')} placement='top'>
                                    <Button size='sm' type='primary' onClick={this.handleGenerateExport} aria-label={this.nls('settingGenerateSettingsXml')} title={this.nls('settingGenerateSettingsXml')}>
                                        Generate XML
                                    </Button>
                                </Tooltip>
                                <Tooltip title={this.nls('settingDownloadTheCurrentSettingsAs')} placement='top'>
                                    <Button size='sm' type='default' onClick={this.handleDownloadExport} aria-label={this.nls('settingDownloadSettingsXmlFile')} title={this.nls('settingDownloadSettingsAsAnXml')}>
                                        Download File
                                    </Button>
                                </Tooltip>
                            </div>
                            {this.state.exportXml && (
                                <>
                                    <TextArea
                                        className='w-100'
                                        style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '11px' }}
                                        readOnly
                                        value={this.state.exportXml}
                                        aria-label={this.nls('settingExportedSettingsXml')}
                                    />
                                    <div style={{ ...s.quickBtns, marginTop: '6px' }}>
                                        <Button size='sm' type='tertiary' onClick={this.handleCopyExport} aria-label={this.nls('settingCopySettingsXmlToClipboard')} title={this.nls('settingCopyXmlToClipboard')}>
                                            Copy to Clipboard
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={s.divider} />

                        {/* Import */}
                        <div style={s.fieldRow}>
                            <Label style={s.fieldLabel}>{this.nls('settingImport')}</Label>
                            <input
                                ref={this.fileInputRef}
                                type='file'
                                accept='.xml,application/xml,text/xml'
                                onChange={this.handleFileImport}
                                style={{ display: 'none' }}
                                aria-hidden='true'
                                tabIndex={-1}
                            />
                            <div style={s.quickBtns}>
                                <Tooltip title={this.nls('settingChooseAPreviouslyExportedXml')} placement='top'>
                                    <Button size='sm' type='default' onClick={() => this.fileInputRef.current?.click()} aria-label={this.nls('settingLoadSettingsFromAnXml')} title={this.nls('settingLoadSettingsFromAnXml2')}>
                                        Load from File
                                    </Button>
                                </Tooltip>
                            </div>
                            <Label className='w-100' style={{ fontSize: '12px', marginTop: '4px' }}>
                                Or paste XML:
                                <TextArea
                                    className='w-100 mt-1'
                                    style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '11px' }}
                                    value={this.state.importXml}
                                    onChange={(e) => this.setState({ importXml: e.target.value, importError: '', importSuccess: false })}
                                    placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<DrawAdvancedSettings version="4.2.0">\n  <setting key="enablePointTool" type="boolean">true</setting>\n  ...\n</DrawAdvancedSettings>'}
                                    aria-label={this.nls('settingPasteSettingsXmlToImport')}
                                />
                            </Label>
                            <div style={{ ...s.quickBtns, marginTop: '6px' }}>
                                <Tooltip title={this.nls('settingApplyTheLoadedOrPasted')} placement='top'>
                                    <Button size='sm' type='primary' onClick={this.handleApplyImport} aria-label={this.nls('settingApplyImportedSettings')} title={this.nls('settingApplyImportedSettings')}>
                                        Apply Imported Settings
                                    </Button>
                                </Tooltip>
                            </div>
                            {this.state.importError && (
                                <Alert type='error' role='alert' aria-live='assertive' closable onClose={() => this.setState({ importError: '' })} style={{ width: '100%', marginTop: '6px' }}>
                                    {this.state.importError}
                                </Alert>
                            )}
                            {this.state.importSuccess && (
                                <Alert type='success' role='status' aria-live='polite' style={{ width: '100%', marginTop: '6px' }}>
                                    Settings imported. Review the sections below and click Save in the builder to keep them.
                                </Alert>
                            )}
                        </div>
                    </SettingSection>

                    {/* ================================================================
                        SECTION 2: DRAW TOOLS
                    ================================================================ */}
                    <SettingSection title={this.nls('settingDrawToolsEnabledtoolcountOfLength', { enabledToolCount: enabledToolCount, length: DRAW_TOOLS.length })}>
                        <p style={s.sectionDesc}>{this.nls('settingChooseWhichDrawingToolsAppear')}</p>

                        <div style={s.quickBtns}>
                            <Button size="sm" type="default" title={this.nls('settingEnableEveryDrawingTool')} aria-label={this.nls('settingEnableAllDrawingTools')} onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = true; });
                                this.setConfigBatch(updates);
                            }}>{this.nls('settingEnableAll')}</Button>
                            <Button size="sm" type="default" title={this.nls('settingDisableEveryDrawingTool')} aria-label={this.nls('settingDisableAllDrawingTools')} onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = false; });
                                this.setConfigBatch(updates);
                            }}>{this.nls('settingDisableAll')}</Button>
                        </div>

                        <div style={s.toolGrid}>
                            {DRAW_TOOLS.map(tool => (
                                <Tooltip key={tool.key} title={tool.desc} placement='top'>
                                    <div style={s.checkRow} title={tool.desc}>
                                        <Checkbox
                                            checked={config[tool.key] !== false}
                                            onChange={() => this.setConfig(tool.key, config[tool.key] === false)}
                                            aria-label={this.nls('settingLabelDrawingToolDesc', { label: tool.label, desc: tool.desc })}
                                        />
                                        <span style={s.checkLabel}>
                                            <span style={s.toolIcon} aria-hidden="true">{tool.icon}</span>
                                            {tool.label}
                                        </span>
                                    </div>
                                </Tooltip>
                            ))}
                        </div>

                        {enabledToolCount === 0 && (
                            <Alert type='warning' style={{ width: '100%', marginTop: '8px' }}>
                                No draw tools enabled. Users will not be able to create new drawings.
                            </Alert>
                        )}
                    </SettingSection>

                    {/* ================================================================
                        SECTION 3: FEATURES & CAPABILITIES
                    ================================================================ */}
                    <SettingSection title={this.nls('settingFeaturesAmpCapabilities')}>
                        <p style={s.sectionDesc}>{this.nls('settingEnableOrDisableMajorWidget')}</p>

                        {this.renderToggle('enableSymbolEditor', 'Symbol Editor',
                            'Color, size, and style controls for drawing symbols.')}

                        {this.renderToggle('enableMeasurements', 'Measurements',
                            'Length, area, and perimeter measurement labels on drawings.')}

                        {config.enableMeasurements !== false && (
                            <div style={s.indent}>
                                {this.renderToggle('rememberMeasurementPreferences', 'Remember User Preferences',
                                    'Store each user\'s measurement units, display options, and decimal places in their browser so they persist between sessions. Users can reset to your defaults at any time.')}

                                {this.renderToggle('allowMultipleUnits', 'Multiple Units',
                                    'Let users show measurements in additional units alongside the primary unit, for example acres with square feet.')}
                            </div>
                        )}

                        {this.renderToggle('enableSnapping', 'Snapping',
                            'Snap drawing vertices to features in other map layers.')}

                        {this.renderToggle('enableBuffer', 'Buffer',
                            'Create buffer zones around drawn features.')}

                        {config.enableBuffer !== false && (
                            <div style={s.indent}>
                                <p style={s.sub}>{this.nls('settingDefaultBufferValuesUsedWhen')}</p>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title={this.nls('settingInitialBufferDistanceAndUnit')}>{this.nls('settingDefaultDistance')}</Label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <NumericInput
                                            value={config.defaultBufferDistance ?? 100}
                                            min={0.1}
                                            step={0.1}
                                            onChange={(v) => this.setConfig('defaultBufferDistance', v)}
                                            style={{ width: '100px' }}
                                            aria-label={this.nls('settingDefaultBufferDistance')}
                                            title={this.nls('settingInitialBufferDistance')}
                                        />
                                        <Select
                                            value={config.defaultBufferUnit || 'feet'}
                                            onChange={(e) => this.setConfig('defaultBufferUnit', e.target.value)}
                                            style={{ flex: 1, minWidth: '110px' }}
                                            aria-label={this.nls('settingDefaultBufferUnit')}
                                            title={this.nls('settingInitialBufferDistanceUnit')}
                                        >
                                            <Option value='feet'>{this.nls('settingFeet')}</Option>
                                            <Option value='meters'>{this.nls('settingMeters')}</Option>
                                            <Option value='miles'>{this.nls('settingMiles')}</Option>
                                            <Option value='kilometers'>{this.nls('settingKilometers')}</Option>
                                        </Select>
                                    </div>
                                </div>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title={this.nls('settingInitialBufferFillOpacity1')}>Default Opacity (%)</Label>
                                    <NumericInput
                                        value={config.defaultBufferOpacity ?? 75}
                                        min={1}
                                        max={100}
                                        step={1}
                                        onChange={(v) => this.setConfig('defaultBufferOpacity', v)}
                                        style={{ width: '100px' }}
                                        aria-label={this.nls('settingDefaultBufferOpacityPercentage')}
                                        title={this.nls('settingInitialBufferFillOpacity12')}
                                    />
                                </div>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title={this.nls('settingColorUsedWhenAUser')}>{this.nls('settingDefaultCustomColor')}</Label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ColorPicker
                                            width={28}
                                            height={28}
                                            color={config.defaultBufferColor || '#d83020'}
                                            onChange={(c: string) => this.setConfig('defaultBufferColor', c)}
                                            aria-label={this.nls('settingDefaultBufferCustomColor')}
                                            title={this.nls('settingDefaultCustomBufferColor')}
                                        />
                                        <span style={{ ...s.sub, margin: 0, flex: 1 }}>{this.nls('settingUsedWhenAUserEnables')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {this.renderToggle('enableUndoRedo', 'Undo / Redo',
                            'Undo and redo buttons during active drawing.')}

                        {this.renderToggle('enableCopyFromMap', 'Copy from Map',
                            'Copy features from map layers into drawings. Includes single click, multi-select, and spatial selection modes.')}
                    </SettingSection>

                    {/* ================================================================
                        SECTION 4: MY DRAWINGS PANEL
                    ================================================================ */}
                    <SettingSection title={this.nls('settingMyDrawingsPanel')}>
                        {this.renderToggle('enableMyDrawings', 'Enable My Drawings',
                            'Tabbed panel for managing, sorting, and organizing saved drawings. When disabled, there is no tab bar and only the Draw panel is shown.')}

                        {myDrawingsEnabled && (
                            <>
                                <div style={s.divider} />
                                <p style={{ ...s.sub, fontWeight: 600, color: 'var(--calcite-color-text-2, #495057)', marginBottom: '6px' }}>
                                    Choose which actions are available in the My Drawings toolbar:
                                </p>
                                <div style={s.indent}>
                                    {this.renderCheck('enableMyDrawingsImport', 'Import (Shapefile, GeoJSON, KML)', true, 'Show the Import button for loading Shapefile (.zip), GeoJSON, and KML files into My Drawings.')}
                                    {this.renderCheck('enableMyDrawingsExport', 'Export (Shapefile, GeoJSON, KML, CSV)', true, 'Show the Export menu. Buffers are exported as their own features in every format.')}
                                    {this.renderCheck('enableMyDrawingsLock', 'Lock / Unlock drawings', true, 'Allow users to lock drawings so they cannot be moved or edited.')}
                                    {this.renderCheck('enableMyDrawingsGroup', 'Group / Ungroup drawings', true, 'Allow users to group multiple drawings together for batch actions.')}
                                    {this.renderCheck('enableMyDrawingsMerge', 'Merge selected drawings', true, 'Allow users to merge selected geometries into a single drawing.')}
                                    {this.renderCheck('enableMyDrawingsDuplicate', 'Duplicate drawings', true, 'Allow users to duplicate an existing drawing.')}
                                    {this.renderCheck('enableMyDrawingsZoomTo', 'Zoom to drawing', true, 'Show a control that zooms the map to a drawing extent.')}
                                    {this.renderCheck('enableMyDrawingsProperties', 'View drawing properties', true, 'Show the per-drawing properties / details panel.')}
                                    {this.renderCheck('enableMyDrawingsSort', 'Sort and filter controls', true, 'Show sorting and filtering controls at the top of the My Drawings list.')}
                                </div>

                                <div style={{ ...s.quickBtns, marginTop: '8px', paddingLeft: '12px' }}>
                                    <Button size="sm" type="default" title={this.nls('settingEnableEveryMyDrawingsAction')} aria-label={this.nls('settingEnableAllMyDrawingsActions')} onClick={() => {
                                        this.setConfigBatch({
                                            enableMyDrawingsImport: true, enableMyDrawingsExport: true,
                                            enableMyDrawingsLock: true, enableMyDrawingsGroup: true,
                                            enableMyDrawingsMerge: true, enableMyDrawingsDuplicate: true,
                                            enableMyDrawingsZoomTo: true, enableMyDrawingsProperties: true,
                                            enableMyDrawingsSort: true
                                        });
                                    }}>{this.nls('settingEnableAll')}</Button>
                                    <Button size="sm" type="default" title={this.nls('settingDisableEveryMyDrawingsAction')} aria-label={this.nls('settingDisableAllMyDrawingsActions')} onClick={() => {
                                        this.setConfigBatch({
                                            enableMyDrawingsImport: false, enableMyDrawingsExport: false,
                                            enableMyDrawingsLock: false, enableMyDrawingsGroup: false,
                                            enableMyDrawingsMerge: false, enableMyDrawingsDuplicate: false,
                                            enableMyDrawingsZoomTo: false, enableMyDrawingsProperties: false,
                                            enableMyDrawingsSort: false
                                        });
                                    }}>{this.nls('settingDisableAll')}</Button>
                                </div>
                            </>
                        )}
                    </SettingSection>

                    {/* ================================================================
                        SECTION 5: DRAW LAYER
                    ================================================================ */}
                    <SettingSection title={this.nls('settingDrawLayer')}>
                        <SettingRow>
                            <Label className='w-100'>
                                Default Layer Name:
                                <TextInput
                                    type='text'
                                    required
                                    defaultValue={config.title || 'Drawn Graphics'}
                                    onChange={(e) => this.handleTitle(e.target.value)}
                                    aria-label={this.nls('settingDefaultDrawLayerName')}
                                    title={this.nls('settingNameAppliedToTheGraphics')}
                                />
                            </Label>
                        </SettingRow>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                            {this.renderCheck('changeTitle', 'Allow users to rename the draw layer', false, 'When on, end users can edit the draw layer name at runtime.')}
                            {this.renderCheck('listMode', 'Show draw layer in map layer list', false, 'When on, the draw graphics layer appears in the map\u2019s layer list / legend.')}
                            {this.renderCheck('changeListMode', 'Allow users to toggle layer list visibility', false, 'When on, end users can show or hide the draw layer in the layer list.')}
                        </div>
                    </SettingSection>

                    {/* ================================================================
                        SECTION 6: DRAWING STORAGE
                    ================================================================ */}
                    <SettingSection title={this.nls('settingDrawingStorage')}>
                        <SettingRow>
                            <Label className='w-100'>
                                Storage Scope:
                                <Select
                                    value={config.storageScope || StorageScope.APP_SPECIFIC}
                                    onChange={this.handleStorageScopeChange}
                                    className='drop-height'
                                    aria-label={this.nls('settingSelectStorageScopeForSaved')}
                                    title={this.nls('settingAppSpecificKeepsDrawingsIsolated')}
                                >
                                    <Option value={StorageScope.APP_SPECIFIC}>{this.nls('settingThisApplicationOnly')}</Option>
                                    <Option value={StorageScope.GLOBAL}>{this.nls('settingAllApplicationsGlobal')}</Option>
                                </Select>
                            </Label>
                        </SettingRow>
                        <SettingRow>
                            <Alert type='info' style={{ width: '100%' }}>
                                {String(config.storageScope) === 'global'
                                    ? 'Drawings are shared across all Experience Builder applications on this domain.'
                                    : 'Drawings are isolated to this specific application.'}
                            </Alert>
                        </SettingRow>

                        <div style={s.divider} />

                        <SettingRow>
                            <div style={{ width: '100%' }}>
                                <Label style={s.toggleLabel}>{this.nls('settingMaximumSavedDrawings')}</Label>
                                <p style={s.sub}>
                                    Limit how many drawings are stored in the browser. Set to 0 for unlimited.
                                    Large numbers of complex drawings may impact browser performance.
                                </p>
                                <NumericInput
                                    value={config.maxDrawings ?? 0}
                                    min={0}
                                    max={10000}
                                    step={10}
                                    onChange={(value) => this.setConfig('maxDrawings', value)}
                                    aria-label={this.nls('settingMaximumNumberOfSavedDrawings')}
                                    title={this.nls('settingCapHowManyDrawingsPersist')}
                                    style={{ width: '120px', marginTop: '4px' }}
                                />
                            </div>
                        </SettingRow>
                    </SettingSection>

                    {/* ================================================================
                        SECTION 7: INTEGRATIONS
                    ================================================================ */}
                    <SettingSection title={this.nls('settingIntegrations')}>
                        <p style={s.sectionDesc}>{this.nls('settingConnectTheDrawWidgetWith')}</p>

                        {this.renderOptInToggle('enableMailingLabels', 'Mailing Labels',
                            'Show a button that sends drawing geometry to the Mailing Labels widget for parcel selection. The Mailing Labels widget must also have its Draw Widget integration enabled.')}

                        {config.enableMailingLabels === true && (
                            <div style={s.indent}>
                                <SettingRow>
                                    <div style={{ width: '100%' }}>
                                        <Label style={s.toggleLabel}>{this.nls('settingTargetWidget')}</Label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                                            <Button size="sm" type="primary" onClick={this.scanForWidgets} disabled={this.state.scanning} style={{ whiteSpace: 'nowrap' }}>
                                                {this.state.scanning ? 'Scanning...' : 'Scan App'}
                                            </Button>
                                            <span style={s.sub}>
                                                Reads app config to find widgets
                                            </span>
                                        </div>
                                        {this.state.scanMessage && (
                                            <Alert
                                                type='warning'
                                                role='status'
                                                aria-live='polite'
                                                closable
                                                onClose={() => this.setState({ scanMessage: '' })}
                                                style={{ width: '100%', marginBottom: '6px' }}
                                            >
                                                {this.state.scanMessage}
                                            </Alert>
                                        )}
                                        {this.state.detectedWidgets.length > 0 ? (
                                            <Select
                                                value={config.mailingLabelsWidgetId || ''}
                                                onChange={(e) => this.setConfig('mailingLabelsWidgetId', e.target.value)}
                                                size="sm"
                                                aria-label={this.nls('settingSelectTheMailingLabelsWidget')}
                                            >
                                                <Option value=''>— Select a widget —</Option>
                                                {this.state.detectedWidgets.map(w => (
                                                    <Option key={w.id} value={w.id}>{w.label}</Option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <TextInput
                                                value={config.mailingLabelsWidgetId || ''}
                                                onChange={(e) => this.setConfig('mailingLabelsWidgetId', e.target.value)}
                                                placeholder={this.nls('settingEGWidget3')}
                                                aria-label={this.nls('settingMailingLabelsTargetWidgetId')}
                                                title={this.nls('settingTheWidgetIdOfThe')}
                                                size="sm"
                                            />
                                        )}
                                        {config.mailingLabelsWidgetId && (
                                            <span style={s.sub}>Widget ID: {config.mailingLabelsWidgetId}</span>
                                        )}

                                        <Label style={{ ...s.toggleLabel, marginTop: '10px' }}>{this.nls('settingParentWidgetController')}</Label>
                                        {this.state.detectedWidgets.length > 0 ? (
                                            <Select
                                                value={config.mailingLabelsControllerId || ''}
                                                onChange={(e) => this.setConfig('mailingLabelsControllerId', e.target.value)}
                                                size="sm"
                                                aria-label={this.nls('settingSelectTheWidgetControllerContaining')}
                                            >
                                                <Option value=''>— Select controller —</Option>
                                                {this.state.detectedWidgets.filter(w => w.label.toLowerCase().includes('controller')).map(w => (
                                                    <Option key={w.id} value={w.id}>{w.label}</Option>
                                                ))}
                                                {/* Also show all widgets in case the controller doesn't have "controller" in its name */}
                                                <Option disabled>─── All Widgets ───</Option>
                                                {this.state.detectedWidgets.map(w => (
                                                    <Option key={`all-${w.id}`} value={w.id}>{w.label}</Option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <TextInput
                                                value={config.mailingLabelsControllerId || ''}
                                                onChange={(e) => this.setConfig('mailingLabelsControllerId', e.target.value)}
                                                placeholder={this.nls('settingEGWidget75')}
                                                aria-label={this.nls('settingMailingLabelsParentControllerWidget')}
                                                title={this.nls('settingTheWidgetControllerSidebarThat')}
                                                size="sm"
                                            />
                                        )}
                                        <p style={s.sub}>
                                            The widget controller / sidebar that contains the Mailing Labels widget.
                                            This ensures the controller panel opens before sending geometry.
                                        </p>
                                    </div>
                                </SettingRow>
                                {!config.mailingLabelsWidgetId && (
                                    <Alert type='warning' style={{ width: '100%' }}>
                                        No widget selected. Click "Scan App" to detect widgets, or enter the widget ID manually.
                                    </Alert>
                                )}
                            </div>
                        )}
                    </SettingSection>

                    {this.renderOptInToggle('enableIdentifyByQuery', 'Identify By Query',
                        'Show a button that sends drawing geometry to the Identify By Query widget for feature identification. The Identify By Query widget must also have its Draw Widget integration enabled.')}

                    {config.enableIdentifyByQuery === true && (
                        <div style={s.indent}>
                            <SettingRow>
                                <div style={{ width: '100%' }}>
                                    <Label style={s.toggleLabel}>{this.nls('settingTargetWidget')}</Label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px' }}>
                                        <Button size="sm" type="primary" onClick={this.scanForWidgets} disabled={this.state.scanning} style={{ whiteSpace: 'nowrap' }}>
                                            {this.state.scanning ? 'Scanning...' : 'Scan App'}
                                        </Button>
                                        <span style={s.sub}>
                                            Reads app config to find widgets
                                        </span>
                                    </div>
                                    {this.state.scanMessage && (
                                        <Alert
                                            type='warning'
                                            role='status'
                                            aria-live='polite'
                                            closable
                                            onClose={() => this.setState({ scanMessage: '' })}
                                            style={{ width: '100%', marginBottom: '6px' }}
                                        >
                                            {this.state.scanMessage}
                                        </Alert>
                                    )}
                                    {this.state.detectedWidgets.length > 0 ? (
                                        <Select
                                            value={config.identifyWidgetId || ''}
                                            onChange={(e) => this.setConfig('identifyWidgetId', e.target.value)}
                                            size="sm"
                                            aria-label={this.nls('settingSelectTheIdentifyByQuery')}
                                        >
                                            <Option value=''>— Select a widget —</Option>
                                            {this.state.detectedWidgets.map(w => (
                                                <Option key={w.id} value={w.id}>{w.label}</Option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <TextInput
                                            value={config.identifyWidgetId || ''}
                                            onChange={(e) => this.setConfig('identifyWidgetId', e.target.value)}
                                            placeholder={this.nls('settingEGWidget5')}
                                            aria-label={this.nls('settingIdentifyByQueryTargetWidget')}
                                            title={this.nls('settingTheWidgetIdOfThe2')}
                                            size="sm"
                                        />
                                    )}
                                    {config.identifyWidgetId && (
                                        <span style={s.sub}>Widget ID: {config.identifyWidgetId}</span>
                                    )}

                                    <Label style={{ ...s.toggleLabel, marginTop: '10px' }}>{this.nls('settingParentWidgetController')}</Label>
                                    {this.state.detectedWidgets.length > 0 ? (
                                        <Select
                                            value={config.identifyControllerId || ''}
                                            onChange={(e) => this.setConfig('identifyControllerId', e.target.value)}
                                            size="sm"
                                            aria-label={this.nls('settingSelectTheWidgetControllerContaining2')}
                                        >
                                            <Option value=''>— Select controller —</Option>
                                            {this.state.detectedWidgets.filter(w => w.label.toLowerCase().includes('controller')).map(w => (
                                                <Option key={w.id} value={w.id}>{w.label}</Option>
                                            ))}
                                            {/* Also show all widgets in case the controller doesn't have "controller" in its name */}
                                            <Option disabled>─── All Widgets ───</Option>
                                            {this.state.detectedWidgets.map(w => (
                                                <Option key={`all-${w.id}`} value={w.id}>{w.label}</Option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <TextInput
                                            value={config.identifyControllerId || ''}
                                            onChange={(e) => this.setConfig('identifyControllerId', e.target.value)}
                                            placeholder={this.nls('settingEGWidget76')}
                                            aria-label={this.nls('settingIdentifyByQueryParentController')}
                                            title={this.nls('settingTheWidgetControllerSidebarThat2')}
                                            size="sm"
                                        />
                                    )}
                                    <p style={s.sub}>
                                        The widget controller / sidebar that contains the Identify By Query widget.
                                        This ensures the controller panel opens before sending geometry.
                                    </p>
                                </div>
                            </SettingRow>
                            {!config.identifyWidgetId && (
                                <Alert type='warning' style={{ width: '100%' }}>
                                    No widget selected. Click "Scan App" to detect widgets, or enter the widget ID manually.
                                </Alert>
                            )}
                        </div>
                    )}

                    {this.renderOptInToggle('enableIdentifyIntegration', 'Receive from Identify By Query',
                        'Allow the Identify By Query widget to send feature geometries to this widget using the "Copy To Draw" button. Received geometries will appear in My Drawings and be saved to storage.')}

                    {/* ================================================================
                        SECTION 8: MEASUREMENT UNITS
                    ================================================================ */}
                    <SettingSection title={this.nls('settingMeasurementUnits')}>
                        {!measurementsEnabled ? (
                            <SettingRow>
                                <Alert type='info' style={{ width: '100%' }}>
                                    Enable Measurements in Features &amp; Capabilities to configure units.
                                </Alert>
                            </SettingRow>
                        ) : (
                            <>
                                {/* Linear */}
                                <SettingRow>
                                    <Button onClick={() => this.setState({ linearSidePopper: true })} style={{ width: '100%' }} title={this.nls('settingAddCustomLinearUnitsOr')} aria-label={this.nls('settingAddOrChangeLinearUnits')}>
                                        Add or Change Linear Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Linear Unit:
                                        <Select title={this.nls('settingDefaultLinearUnitUsedFor')} aria-label={this.nls('settingDefaultLinearUnit')} onChange={(e) => this.handleDefaultDistance(e.target.value)} value={this.state.defaultDistanceUnit}>
                                            {this.state.availableDistanceUnits.map((unit, index) => (
                                                <Option key={index} value={index}>{unit.label} ({unit.abbreviation})</Option>
                                            ))}
                                        </Select>
                                        {this.state.defaultDistanceUnit === null && <Alert type='warning'>{this.nls('settingResetDefaultDistanceUnits')}</Alert>}
                                    </Label>
                                </SettingRow>

                                <div style={s.divider} />

                                {/* Area */}
                                <SettingRow>
                                    <Button onClick={() => this.setState({ areaSidePopper: true })} style={{ width: '100%' }} title={this.nls('settingAddCustomAreaUnitsOr')} aria-label={this.nls('settingAddOrChangeAreaUnits')}>
                                        Add or Change Area Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Area Units:
                                        <Select title={this.nls('settingDefaultAreaUnitUsedFor')} aria-label={this.nls('settingDefaultAreaUnit')} onChange={(e) => this.handleDefaultArea(e.target.value)} value={this.state.defaultAreaUnit}>
                                            {this.state.availableAreaUnits.map((unit, index) => (
                                                <Option key={index} value={index}>{unit.label} ({unit.abbreviation})</Option>
                                            ))}
                                        </Select>
                                        <span style={{ fontSize: '11px', color: 'var(--calcite-color-text-2, #6c757d)' }}>
                                            Note: superscript characters may not display correctly here but will work in the application.
                                        </span>
                                        {this.state.defaultAreaUnit === null && <Alert type='warning'>{this.nls('settingResetDefaultAreaUnits')}</Alert>}
                                    </Label>
                                </SettingRow>

                                <div style={s.divider} />

                                {/* Label templates */}
                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title={this.nls('settingTemplateForPolylineLengthLabels')}>{this.nls('settingPolylineLabelTemplate')}</Label>
                                    <TextInput
                                        className='w-100'
                                        value={config.measurePolylineLabel || ''}
                                        placeholder='{{length}} {{lengthUnit}}'
                                        onChange={(e) => this.setConfig('measurePolylineLabel', e.target.value)}
                                        aria-label={this.nls('settingPolylineMeasurementLabelTemplate')}
                                        title='Template for polyline length labels. Tokens: {{length}}, {{lengthUnit}}.'
                                    />
                                </div>
                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title={this.nls('settingTemplateForPolygonAreaAnd')}>{this.nls('settingPolygonLabelTemplate')}</Label>
                                    <TextInput
                                        className='w-100'
                                        value={config.measurePolygonLabel || ''}
                                        placeholder='Area: {{area}} {{areaUnit}}'
                                        onChange={(e) => this.setConfig('measurePolygonLabel', e.target.value)}
                                        aria-label={this.nls('settingPolygonMeasurementLabelTemplate')}
                                        title='Template for polygon labels. Tokens: {{area}}, {{areaUnit}}, {{length}}, {{lengthUnit}}.'
                                    />
                                </div>
                                <p style={s.sub}>
                                    Tokens: <code>{'{{length}}'}</code>, <code>{'{{lengthUnit}}'}</code>, <code>{'{{area}}'}</code>, <code>{'{{areaUnit}}'}</code>.
                                    Leave blank to use built-in defaults.
                                </p>
                            </>
                        )}
                    </SettingSection>

                    {/* ================================================================
                        SECTION 9: WIDGET BEHAVIOR
                    ================================================================ */}
                    <SettingSection title={this.nls('settingWidgetBehavior')}>
                        {/* Default tab */}
                        {myDrawingsEnabled && (
                            <SettingRow>
                                <Label className='w-100'>
                                    Default Tab:
                                    <Select
                                        value={config.defaultTab || 'draw'}
                                        onChange={(e) => this.setConfig('defaultTab', e.target.value)}
                                        aria-label={this.nls('settingSelectWhichTabOpensBy')}
                                        title={this.nls('settingWhichTabIsActiveWhen')}
                                    >
                                        <Option value='draw'>{this.nls('settingDraw')}</Option>
                                        <Option value='mydrawings'>{this.nls('settingMyDrawings')}</Option>
                                    </Select>
                                    <p style={s.sub}>{this.nls('settingWhichTabIsActiveWhen')}</p>
                                </Label>
                            </SettingRow>
                        )}

                        {/* Confirm before clear */}
                        {this.renderCheck('confirmBeforeClear', 'Require confirmation before clearing all drawings', true, 'Show a confirmation prompt before the Clear All / Delete All action runs.')}

                        {/* Turn off on close */}
                        <div style={{ marginTop: '4px' }}>
                            {this.renderCheck('turnOffOnClose', 'Stop drawing when widget is closed', false, 'Cancel any active drawing session when the widget panel is closed. Recommended when the widget lives inside a Widget Controller.')}
                            <p style={{ ...s.sub, marginLeft: '24px' }}>
                                Enable when the widget is inside a Widget Controller so active drawings are cancelled on close.
                            </p>
                        </div>
                    </SettingSection>
                    <SettingSection title='Help'>
                      <SettingRow tag='label' label='Show help guide'>
                        <Switch
                          checked={this.props.config?.showHelp !== false}
                          onChange={(evt) => { this.props.onSettingChange({ id: this.props.id, config: (this.props.config as any).set('showHelp', evt.target.checked) }) }}
                          aria-label='Show the question-mark button that opens the widget help guide'
                        />
                      </SettingRow>
                    </SettingSection>

                </div>

                {/* Side poppers for unit editors */}
                <SidePopper
                    position='right'
                    isOpen={this.state.linearSidePopper}
                    toggle={() => this.setState({ linearSidePopper: !this.state.linearSidePopper })}
                    title={this.nls('settingChangeLinearUnits')}
                    trigger={<span /> as any as HTMLElement}
                >
                    <Alert>{this.nls('settingTheDefaultLinearUnitMust')}</Alert>
                    <UnitMaker allUnits={this.state.availableDistanceUnits} handleAddUnit={this.handleAddUnit} type={'linear'} />
                    {userDistances && userDistances.length > 0 && <div><hr /><h3>{this.nls('settingEditUnits')}</h3></div>}
                    {userDistances && userDistances.map((oldUnit, index) => (
                        <UnitMaker key={index} allUnits={this.state.availableDistanceUnits} handleChangeUnit={this.handleChangeUnit} type={'linear'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit} />
                    ))}
                </SidePopper>
                <SidePopper
                    position='right'
                    isOpen={this.state.areaSidePopper}
                    toggle={() => this.setState({ areaSidePopper: !this.state.areaSidePopper })}
                    title={this.nls('settingChangeAreaUnits')}
                    trigger={<span /> as any as HTMLElement}
                >
                    <Alert>{this.nls('settingTheDefaultAreaUnitMust')}</Alert>
                    <UnitMaker allUnits={this.state.availableAreaUnits} handleAddUnit={this.handleAddUnit} type={'area'} />
                    {userAreas && userAreas.length > 0 && <div><hr /><h3>{this.nls('settingEditUnits')}</h3></div>}
                    {userAreas && userAreas.map((oldUnit, index) => (
                        <UnitMaker key={index} allUnits={this.state.availableAreaUnits} handleChangeUnit={this.handleChangeUnit} type={'area'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit} />
                    ))}
                </SidePopper>
            </div>
        )
    }
}