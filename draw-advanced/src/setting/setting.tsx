import { React, defaultMessages as jimuCoreMessages } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { IMConfig, DrawMode, StorageScope } from '../config';
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

const DRAW_TOOLS = [
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

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, SettingState> {
    constructor(props) {
        super(props)
        this.state = {
            linearSidePopper: false,
            areaSidePopper: false,
            defaultDistanceUnit: this.props.config.defaultDistance,
            defaultAreaUnit: this.props.config.defaultArea,
            availableDistanceUnits: [...defaultDistanceUnits, ...((this.props.config.userDistances?.asMutable?.() || this.props.config.userDistances || []) as unknown as Unit[])],
            availableAreaUnits: [...defaultAreaUnits, ...((this.props.config.userAreas?.asMutable?.() || this.props.config.userAreas || []) as unknown as Unit[])],
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

    onPropertyChange = (name, value) => {
        const { config } = this.props
        if (value === config[name]) return
        this.props.onSettingChange({ id: this.props.id, config: config.set(name, value) })
    }

    onMapWidgetSelected = (useMapWidgetsId: string[]) => {
        this.props.onSettingChange({ id: this.props.id, useMapWidgetIds: useMapWidgetsId });
    }

    setConfig = (key: string, value: any) => {
        this.props.onSettingChange({ id: this.props.id, config: this.props.config.set(key, value) })
    }

    setConfigBatch = (updates: Record<string, any>) => {
        let cfg = this.props.config;
        for (const [key, value] of Object.entries(updates)) {
            cfg = cfg.set(key, value) as any;
        }
        this.props.onSettingChange({ id: this.props.id, config: cfg });
    }

    toggleConfig = (key: string) => {
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
        xml += '<DrawAdvancedSettings version="4.2.0">\n'
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
    parseSettingsXml = (xmlString: string): Record<string, any> | null => {
        try {
            const doc = new DOMParser().parseFromString(xmlString, 'text/xml')
            if (doc.querySelector('parsererror')) return null
            const root = doc.querySelector('DrawAdvancedSettings')
            if (!root) return null
            const out: Record<string, any> = {}
            const nodes = doc.querySelectorAll('setting')
            nodes.forEach((node) => {
                const key = node.getAttribute('key')
                if (!key) return
                const type = node.getAttribute('type') || 'string'
                const raw = node.textContent ?? ''
                try {
                    if (type === 'boolean') out[key] = raw.trim() === 'true'
                    else if (type === 'number') { const n = Number(raw); if (!isNaN(n)) out[key] = n }
                    else if (type === 'json') out[key] = JSON.parse(raw)
                    else out[key] = raw
                } catch { /* skip malformed entry */ }
            })
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
            cfg = cfg.set(key, value) as any
        }
        this.props.onSettingChange({ id: this.props.id, config: cfg })

        // Refresh local state derived from config so the unit pickers reflect the import.
        const importedUserDistances = ((cfg.userDistances as any)?.asMutable?.() || cfg.userDistances || []) as unknown as Unit[]
        const importedUserAreas = ((cfg.userAreas as any)?.asMutable?.() || cfg.userAreas || []) as unknown as Unit[]
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
            const userDistances = (this.props.config.userDistances?.asMutable?.() || []) as unknown as Unit[]
            const updatedDistances = [...userDistances, newUnit]
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = (this.props.config.userAreas?.asMutable?.() || []) as unknown as Unit[]
            const updatedAreas = [...userAreas, newUnit]
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userAreas', updatedAreas) })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...updatedAreas], defaultAreaUnit: null })
        }
    }

    handleChangeUnit = (newUnit: Unit, type: 'linear' | 'area') => {
        if (type === 'linear') {
            const userDistances = (this.props.config.userDistances?.asMutable?.() || []) as unknown as Unit[]
            const updatedDistances = [...userDistances]
            const index = updatedDistances.findIndex(existing => existing.unit === newUnit.unit)
            if (index !== -1) updatedDistances[index] = newUnit
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = (this.props.config.userAreas?.asMutable?.() || []) as unknown as Unit[]
            const updatedAreas = [...userAreas]
            const index = updatedAreas.findIndex(existing => existing.unit === newUnit.unit)
            if (index !== -1) updatedAreas[index] = newUnit
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userAreas', updatedAreas) })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...updatedAreas], defaultAreaUnit: null })
        }
    }

    handleDeleteUnit = (unit: Unit, type: 'linear' | 'area') => {
        if (type === 'linear') {
            const userDistances = (this.props.config.userDistances?.asMutable?.() || []) as unknown as Unit[]
            const updatedDistances = userDistances.filter(u => u.unit !== unit.unit)
            this.props.onSettingChange({ id: this.props.id, config: this.props.config.set('userDistances', updatedDistances) })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...updatedDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = (this.props.config.userAreas?.asMutable?.() || []) as unknown as Unit[]
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
    renderToggle = (key: string, label: string, description?: string) => {
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
    renderOptInToggle = (key: string, label: string, description?: string) => {
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
    renderCheck = (key: string, label: string, defaultOn: boolean = true, tip?: string) => {
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
        const userDistances = (config.userDistances?.asMutable?.() || config.userDistances || []) as unknown as Unit[]
        const userAreas = (config.userAreas?.asMutable?.() || config.userAreas || []) as unknown as Unit[]

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
                            <Select value={config.creationMode} onChange={this.handleDrawModeChange} className='drop-height' aria-label='Drawing creation mode'>
                                <Option value={DrawMode.CONTINUOUS} title='Keep the active tool selected so users can draw multiple shapes in a row.'>{this.formatMessage('drawModeContinuous')}</Option>
                                <Option value={DrawMode.SINGLE} title='Deactivate the tool after each completed shape.'>{this.formatMessage('drawModeSingle')}</Option>
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
                    <SettingSection title="Import / Export Settings">
                        <p style={s.sectionDesc}>
                            Save this widget&apos;s configuration to an XML file, or load a saved file to copy settings
                            between applications. Importing merges the file&apos;s values onto the current configuration.
                            The selected map widget is not included.
                        </p>

                        {/* Export */}
                        <div style={s.fieldRow}>
                            <Label style={s.fieldLabel}>Export</Label>
                            <div style={s.quickBtns}>
                                <Tooltip title='Build an XML document from the current settings and show it below.' placement='top'>
                                    <Button size='sm' type='primary' onClick={this.handleGenerateExport} aria-label='Generate settings XML' title='Generate settings XML'>
                                        Generate XML
                                    </Button>
                                </Tooltip>
                                <Tooltip title='Download the current settings as an .xml file.' placement='top'>
                                    <Button size='sm' type='default' onClick={this.handleDownloadExport} aria-label='Download settings XML file' title='Download settings as an .xml file'>
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
                                        aria-label='Exported settings XML'
                                    />
                                    <div style={{ ...s.quickBtns, marginTop: '6px' }}>
                                        <Button size='sm' type='tertiary' onClick={this.handleCopyExport} aria-label='Copy settings XML to clipboard' title='Copy XML to clipboard'>
                                            Copy to Clipboard
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={s.divider} />

                        {/* Import */}
                        <div style={s.fieldRow}>
                            <Label style={s.fieldLabel}>Import</Label>
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
                                <Tooltip title='Choose a previously exported .xml file.' placement='top'>
                                    <Button size='sm' type='default' onClick={() => this.fileInputRef.current?.click()} aria-label='Load settings from an XML file' title='Load settings from an .xml file'>
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
                                    aria-label='Paste settings XML to import'
                                />
                            </Label>
                            <div style={{ ...s.quickBtns, marginTop: '6px' }}>
                                <Tooltip title='Apply the loaded or pasted settings to this widget.' placement='top'>
                                    <Button size='sm' type='primary' onClick={this.handleApplyImport} aria-label='Apply imported settings' title='Apply imported settings'>
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
                    <SettingSection title={`Draw Tools (${enabledToolCount} of ${DRAW_TOOLS.length})`}>
                        <p style={s.sectionDesc}>Choose which drawing tools appear in the toolbar. Disabled tools are hidden from users.</p>

                        <div style={s.quickBtns}>
                            <Button size="sm" type="default" title="Enable every drawing tool" aria-label="Enable all drawing tools" onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = true; });
                                this.setConfigBatch(updates);
                            }}>Enable All</Button>
                            <Button size="sm" type="default" title="Disable every drawing tool" aria-label="Disable all drawing tools" onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = false; });
                                this.setConfigBatch(updates);
                            }}>Disable All</Button>
                        </div>

                        <div style={s.toolGrid}>
                            {DRAW_TOOLS.map(tool => (
                                <Tooltip key={tool.key} title={tool.desc} placement='top'>
                                    <div style={s.checkRow} title={tool.desc}>
                                        <Checkbox
                                            checked={config[tool.key] !== false}
                                            onChange={() => this.setConfig(tool.key, config[tool.key] === false)}
                                            aria-label={`${tool.label} drawing tool. ${tool.desc}`}
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
                    <SettingSection title="Features &amp; Capabilities">
                        <p style={s.sectionDesc}>Enable or disable major widget features. Disabled features are completely hidden from users.</p>

                        {this.renderToggle('enableSymbolEditor', 'Symbol Editor',
                            'Color, size, and style controls for drawing symbols.')}

                        {this.renderToggle('enableMeasurements', 'Measurements',
                            'Length, area, and perimeter measurement labels on drawings.')}

                        {this.renderToggle('enableSnapping', 'Snapping',
                            'Snap drawing vertices to features in other map layers.')}

                        {this.renderToggle('enableBuffer', 'Buffer',
                            'Create buffer zones around drawn features.')}

                        {config.enableBuffer !== false && (
                            <div style={s.indent}>
                                <p style={s.sub}>Default buffer values used when the widget first loads. Users can still change these at runtime.</p>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title='Initial buffer distance and unit applied to new buffers.'>Default Distance</Label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <NumericInput
                                            value={config.defaultBufferDistance ?? 100}
                                            min={0.1}
                                            step={0.1}
                                            onChange={(v) => this.setConfig('defaultBufferDistance', v)}
                                            style={{ width: '100px' }}
                                            aria-label='Default buffer distance'
                                            title='Initial buffer distance.'
                                        />
                                        <Select
                                            value={config.defaultBufferUnit || 'feet'}
                                            onChange={(e) => this.setConfig('defaultBufferUnit', e.target.value)}
                                            style={{ flex: 1, minWidth: '110px' }}
                                            aria-label='Default buffer unit'
                                            title='Initial buffer distance unit.'
                                        >
                                            <Option value='feet'>Feet</Option>
                                            <Option value='meters'>Meters</Option>
                                            <Option value='miles'>Miles</Option>
                                            <Option value='kilometers'>Kilometers</Option>
                                        </Select>
                                    </div>
                                </div>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title='Initial buffer fill opacity (1\u2013100%).'>Default Opacity (%)</Label>
                                    <NumericInput
                                        value={config.defaultBufferOpacity ?? 75}
                                        min={1}
                                        max={100}
                                        step={1}
                                        onChange={(v) => this.setConfig('defaultBufferOpacity', v)}
                                        style={{ width: '100px' }}
                                        aria-label='Default buffer opacity percentage'
                                        title='Initial buffer fill opacity, 1 to 100 percent.'
                                    />
                                </div>

                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title='Color used when a user turns on the custom buffer color option.'>Default Custom Color</Label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ColorPicker
                                            width={28}
                                            height={28}
                                            color={config.defaultBufferColor || '#d83020'}
                                            onChange={(c: string) => this.setConfig('defaultBufferColor', c)}
                                            aria-label='Default buffer custom color'
                                            title='Default custom buffer color.'
                                        />
                                        <span style={{ ...s.sub, margin: 0, flex: 1 }}>Used when a user enables custom buffer color.</span>
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
                    <SettingSection title="My Drawings Panel">
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
                                    <Button size="sm" type="default" title="Enable every My Drawings action" aria-label="Enable all My Drawings actions" onClick={() => {
                                        this.setConfigBatch({
                                            enableMyDrawingsImport: true, enableMyDrawingsExport: true,
                                            enableMyDrawingsLock: true, enableMyDrawingsGroup: true,
                                            enableMyDrawingsMerge: true, enableMyDrawingsDuplicate: true,
                                            enableMyDrawingsZoomTo: true, enableMyDrawingsProperties: true,
                                            enableMyDrawingsSort: true
                                        });
                                    }}>Enable All</Button>
                                    <Button size="sm" type="default" title="Disable every My Drawings action" aria-label="Disable all My Drawings actions" onClick={() => {
                                        this.setConfigBatch({
                                            enableMyDrawingsImport: false, enableMyDrawingsExport: false,
                                            enableMyDrawingsLock: false, enableMyDrawingsGroup: false,
                                            enableMyDrawingsMerge: false, enableMyDrawingsDuplicate: false,
                                            enableMyDrawingsZoomTo: false, enableMyDrawingsProperties: false,
                                            enableMyDrawingsSort: false
                                        });
                                    }}>Disable All</Button>
                                </div>
                            </>
                        )}
                    </SettingSection>

                    {/* ================================================================
                        SECTION 5: DRAW LAYER
                    ================================================================ */}
                    <SettingSection title="Draw Layer">
                        <SettingRow>
                            <Label className='w-100'>
                                Default Layer Name:
                                <TextInput
                                    type='text'
                                    required
                                    defaultValue={config.title || 'Drawn Graphics'}
                                    onChange={(e) => this.handleTitle(e.target.value)}
                                    aria-label="Default draw layer name"
                                    title="Name applied to the graphics layer that holds drawings."
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
                    <SettingSection title="Drawing Storage">
                        <SettingRow>
                            <Label className='w-100'>
                                Storage Scope:
                                <Select
                                    value={config.storageScope || StorageScope.APP_SPECIFIC}
                                    onChange={this.handleStorageScopeChange}
                                    className='drop-height'
                                    aria-label='Select storage scope for saved drawings'
                                    title='App-specific keeps drawings isolated to this experience; Global shares them across all experiences on this domain.'
                                >
                                    <Option value={StorageScope.APP_SPECIFIC}>This Application Only</Option>
                                    <Option value={StorageScope.GLOBAL}>All Applications (Global)</Option>
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
                                <Label style={s.toggleLabel}>Maximum Saved Drawings</Label>
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
                                    aria-label="Maximum number of saved drawings"
                                    title="Cap how many drawings persist in browser storage. 0 = unlimited. High counts of complex geometry can slow the browser."
                                    style={{ width: '120px', marginTop: '4px' }}
                                />
                            </div>
                        </SettingRow>
                    </SettingSection>

                    {/* ================================================================
                        SECTION 7: INTEGRATIONS
                    ================================================================ */}
                    <SettingSection title="Integrations">
                        <p style={s.sectionDesc}>Connect the Draw widget with other widgets in the application.</p>

                        {this.renderOptInToggle('enableMailingLabels', 'Mailing Labels',
                            'Show a button that sends drawing geometry to the Mailing Labels widget for parcel selection. The Mailing Labels widget must also have its Draw Widget integration enabled.')}

                        {config.enableMailingLabels === true && (
                            <div style={s.indent}>
                                <SettingRow>
                                    <div style={{ width: '100%' }}>
                                        <Label style={s.toggleLabel}>Target Widget</Label>
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
                                                aria-label='Select the Mailing Labels widget'
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
                                                placeholder="e.g. widget_3"
                                                aria-label="Mailing Labels target widget ID"
                                                title="The widget ID of the Mailing Labels widget that should receive geometry."
                                                size="sm"
                                            />
                                        )}
                                        {config.mailingLabelsWidgetId && (
                                            <span style={s.sub}>Widget ID: {config.mailingLabelsWidgetId}</span>
                                        )}

                                        <Label style={{ ...s.toggleLabel, marginTop: '10px' }}>Parent Widget Controller</Label>
                                        {this.state.detectedWidgets.length > 0 ? (
                                            <Select
                                                value={config.mailingLabelsControllerId || ''}
                                                onChange={(e) => this.setConfig('mailingLabelsControllerId', e.target.value)}
                                                size="sm"
                                                aria-label='Select the widget controller containing Mailing Labels'
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
                                                placeholder="e.g. widget_75"
                                                aria-label="Mailing Labels parent controller widget ID"
                                                title="The widget controller / sidebar that contains the Mailing Labels widget."
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
                                    <Label style={s.toggleLabel}>Target Widget</Label>
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
                                            aria-label='Select the Identify By Query widget'
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
                                            placeholder="e.g. widget_5"
                                            aria-label="Identify By Query target widget ID"
                                            title="The widget ID of the Identify By Query widget that should receive geometry."
                                            size="sm"
                                        />
                                    )}
                                    {config.identifyWidgetId && (
                                        <span style={s.sub}>Widget ID: {config.identifyWidgetId}</span>
                                    )}

                                    <Label style={{ ...s.toggleLabel, marginTop: '10px' }}>Parent Widget Controller</Label>
                                    {this.state.detectedWidgets.length > 0 ? (
                                        <Select
                                            value={config.identifyControllerId || ''}
                                            onChange={(e) => this.setConfig('identifyControllerId', e.target.value)}
                                            size="sm"
                                            aria-label='Select the widget controller containing Identify By Query'
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
                                            placeholder="e.g. widget_76"
                                            aria-label="Identify By Query parent controller widget ID"
                                            title="The widget controller / sidebar that contains the Identify By Query widget."
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
                    <SettingSection title="Measurement Units">
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
                                    <Button onClick={() => this.setState({ linearSidePopper: true })} style={{ width: '100%' }} title='Add custom linear units or edit existing ones' aria-label='Add or change linear units'>
                                        Add or Change Linear Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Linear Unit:
                                        <Select title='Default linear unit used for length and perimeter measurements' aria-label='Default linear unit' onChange={(e) => this.handleDefaultDistance(e.target.value)} value={this.state.defaultDistanceUnit}>
                                            {this.state.availableDistanceUnits.map((unit, index) => (
                                                <Option key={index} value={index}>{unit.label} ({unit.abbreviation})</Option>
                                            ))}
                                        </Select>
                                        {this.state.defaultDistanceUnit === null && <Alert type='warning'>Reset Default Distance Units</Alert>}
                                    </Label>
                                </SettingRow>

                                <div style={s.divider} />

                                {/* Area */}
                                <SettingRow>
                                    <Button onClick={() => this.setState({ areaSidePopper: true })} style={{ width: '100%' }} title='Add custom area units or edit existing ones' aria-label='Add or change area units'>
                                        Add or Change Area Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Area Units:
                                        <Select title='Default area unit used for area measurements' aria-label='Default area unit' onChange={(e) => this.handleDefaultArea(e.target.value)} value={this.state.defaultAreaUnit}>
                                            {this.state.availableAreaUnits.map((unit, index) => (
                                                <Option key={index} value={index}>{unit.label} ({unit.abbreviation})</Option>
                                            ))}
                                        </Select>
                                        <span style={{ fontSize: '11px', color: 'var(--calcite-color-text-2, #6c757d)' }}>
                                            Note: superscript characters may not display correctly here but will work in the application.
                                        </span>
                                        {this.state.defaultAreaUnit === null && <Alert type='warning'>Reset Default Area Units</Alert>}
                                    </Label>
                                </SettingRow>

                                <div style={s.divider} />

                                {/* Label templates */}
                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title='Template for polyline length labels.'>Polyline Label Template</Label>
                                    <TextInput
                                        className='w-100'
                                        value={config.measurePolylineLabel || ''}
                                        placeholder='{{length}} {{lengthUnit}}'
                                        onChange={(e) => this.setConfig('measurePolylineLabel', e.target.value)}
                                        aria-label='Polyline measurement label template'
                                        title='Template for polyline length labels. Tokens: {{length}}, {{lengthUnit}}.'
                                    />
                                </div>
                                <div style={s.fieldRow}>
                                    <Label style={s.fieldLabel} title='Template for polygon area and perimeter labels.'>Polygon Label Template</Label>
                                    <TextInput
                                        className='w-100'
                                        value={config.measurePolygonLabel || ''}
                                        placeholder='Area: {{area}} {{areaUnit}}'
                                        onChange={(e) => this.setConfig('measurePolygonLabel', e.target.value)}
                                        aria-label='Polygon measurement label template'
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
                    <SettingSection title="Widget Behavior">
                        {/* Default tab */}
                        {myDrawingsEnabled && (
                            <SettingRow>
                                <Label className='w-100'>
                                    Default Tab:
                                    <Select
                                        value={config.defaultTab || 'draw'}
                                        onChange={(e) => this.setConfig('defaultTab', e.target.value)}
                                        aria-label='Select which tab opens by default'
                                        title='Which tab is active when the widget first opens.'
                                    >
                                        <Option value='draw'>Draw</Option>
                                        <Option value='mydrawings'>My Drawings</Option>
                                    </Select>
                                    <p style={s.sub}>Which tab is active when the widget first opens.</p>
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

                </div>

                {/* Side poppers for unit editors */}
                <SidePopper
                    position='right'
                    isOpen={this.state.linearSidePopper}
                    toggle={() => this.setState({ linearSidePopper: !this.state.linearSidePopper })}
                    title='Change Linear Units'
                    trigger={<span /> as any as HTMLElement}
                >
                    <Alert>The Default Linear Unit must be reset after changes in this panel.</Alert>
                    <UnitMaker allUnits={this.state.availableDistanceUnits} handleAddUnit={this.handleAddUnit} type={'linear'} />
                    {userDistances && userDistances.length > 0 && <div><hr /><h3>Edit Units</h3></div>}
                    {userDistances && userDistances.map((oldUnit, index) => (
                        <UnitMaker key={index} allUnits={this.state.availableDistanceUnits} handleChangeUnit={this.handleChangeUnit} type={'linear'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit} />
                    ))}
                </SidePopper>
                <SidePopper
                    position='right'
                    isOpen={this.state.areaSidePopper}
                    toggle={() => this.setState({ areaSidePopper: !this.state.areaSidePopper })}
                    title='Change Area Units'
                    trigger={<span /> as any as HTMLElement}
                >
                    <Alert>The Default Area Unit must be reset after changes in this panel.</Alert>
                    <UnitMaker allUnits={this.state.availableAreaUnits} handleAddUnit={this.handleAddUnit} type={'area'} />
                    {userAreas && userAreas.length > 0 && <div><hr /><h3>Edit Units</h3></div>}
                    {userAreas && userAreas.map((oldUnit, index) => (
                        <UnitMaker key={index} allUnits={this.state.availableAreaUnits} handleChangeUnit={this.handleChangeUnit} type={'area'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit} />
                    ))}
                </SidePopper>
            </div>
        )
    }
}