import { React, defaultMessages as jimuCoreMessages } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { IMConfig, DrawMode, StorageScope } from '../config';
import defaultMessages from './translations/default';
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { Select, Option, defaultMessages as jimuUIDefaultMessages, Checkbox, TextInput, Label, Button, Alert, Switch, NumericInput } from 'jimu-ui'
import { SidePopper } from 'jimu-ui/advanced/setting-components'
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
    { key: 'enablePointTool', label: 'Point', icon: '\u25CF' },
    { key: 'enablePolylineTool', label: 'Polyline', icon: '\u2571' },
    { key: 'enableFreePolylineTool', label: 'Freehand Line', icon: '\u223F' },
    { key: 'enableTextTool', label: 'Text', icon: 'T' },
    { key: 'enableRectangleTool', label: 'Rectangle', icon: '\u25AD' },
    { key: 'enablePolygonTool', label: 'Polygon', icon: '\u2B20' },
    { key: 'enableFreePolygonTool', label: 'Freehand Polygon', icon: '\u25CC' },
    { key: 'enableCircleTool', label: 'Circle', icon: '\u25CB' }
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
    sub: { fontSize: '11px', color: '#6c757d', margin: '2px 0 0 0', lineHeight: '1.4' } as React.CSSProperties,
    sectionDesc: { fontSize: '12px', color: '#6c757d', margin: '0 0 8px 0', lineHeight: '1.4' } as React.CSSProperties,
    checkRow: { display: 'flex', alignItems: 'center', padding: '4px 0' } as React.CSSProperties,
    checkLabel: { marginLeft: '6px', fontSize: '13px' } as React.CSSProperties,
    divider: { borderTop: '1px solid #e8e8e8', margin: '8px 0' } as React.CSSProperties,
    indent: { paddingLeft: '12px', borderLeft: '3px solid #e0e0e0', marginTop: '6px' } as React.CSSProperties,
    toolGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', padding: '4px 0' } as React.CSSProperties,
    toolIcon: { display: 'inline-block', width: '18px', textAlign: 'center', fontSize: '13px', color: '#666', marginRight: '2px' } as React.CSSProperties,
    quickBtns: { display: 'flex', gap: '6px', marginBottom: '6px' } as React.CSSProperties,
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
            availableDistanceUnits: [...defaultDistanceUnits, ...(this.props.config.userDistances?.asMutable?.() || this.props.config.userDistances || [])],
            availableAreaUnits: [...defaultAreaUnits, ...(this.props.config.userAreas?.asMutable?.() || this.props.config.userAreas || [])],
            detectedWidgets: [],
            scanning: false
        }
    }

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
                alert('Could not determine app ID from URL. Please enter the widget ID manually.');
                this.setState({ scanning: false });
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
                this.setState({ detectedWidgets: allWidgets });
            } else {
                alert('Could not load app config. Please enter the widget ID manually.\n\nYour config is at: server/public/apps/' + appId + '/config.json');
            }
        } catch (e) {
            console.warn('Draw Widget Scan: Error', e);
        }
        this.setState({ scanning: false });
    };

    /** Default-ON Switch (enabled unless explicitly false) */
    renderToggle = (key: string, label: string, description?: string) => {
        const checked = this.props.config[key] !== false;
        return (
            <SettingRow>
                <div style={s.toggleRow}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                        <Label style={s.toggleLabel}>{label}</Label>
                        {description && <p style={s.sub}>{description}</p>}
                    </div>
                    <Switch checked={checked} onChange={() => this.setConfig(key, !checked)} aria-label={`${label} - ${checked ? 'enabled' : 'disabled'}`} />
                </div>
            </SettingRow>
        )
    }

    /** Default-OFF Switch (opt-in, off unless explicitly true) */
    renderOptInToggle = (key: string, label: string, description?: string) => {
        const checked = this.props.config[key] === true;
        return (
            <SettingRow>
                <div style={s.toggleRow}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                        <Label style={s.toggleLabel}>{label}</Label>
                        {description && <p style={s.sub}>{description}</p>}
                    </div>
                    <Switch checked={checked} onChange={() => this.setConfig(key, !checked)} aria-label={`${label} - ${checked ? 'enabled' : 'disabled'}`} />
                </div>
            </SettingRow>
        )
    }

    /** Checkbox with inline label. defaultOn=true means feature is on unless config says false. */
    renderCheck = (key: string, label: string, defaultOn: boolean = true) => {
        const checked = defaultOn ? this.props.config[key] !== false : this.props.config[key] === true;
        return (
            <div style={s.checkRow}>
                <Checkbox checked={checked} onChange={() => this.setConfig(key, !checked)} aria-label={label} />
                <span style={s.checkLabel}>{label}</span>
            </div>
        )
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
                            <Select value={config.creationMode} onChange={this.handleDrawModeChange} className='drop-height'>
                                <option value={DrawMode.CONTINUOUS}>{this.formatMessage('drawModeContinuous')}</option>
                                <option value={DrawMode.SINGLE}>{this.formatMessage('drawModeSingle')}</option>
                            </Select>
                            <p style={{ ...s.sub, marginTop: '4px' }}>
                                {config.creationMode === DrawMode.CONTINUOUS
                                    ? 'Drawing tool stays active after completing each shape.'
                                    : 'Drawing tool deactivates after completing one shape.'}
                            </p>
                        </SettingRow>
                    </SettingSection>

                    {/* ================================================================
                        SECTION 2: DRAW TOOLS
                    ================================================================ */}
                    <SettingSection title={`Draw Tools (${enabledToolCount} of ${DRAW_TOOLS.length})`}>
                        <p style={s.sectionDesc}>Choose which drawing tools appear in the toolbar. Disabled tools are hidden from users.</p>

                        <div style={s.quickBtns}>
                            <Button size="sm" type="default" onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = true; });
                                this.setConfigBatch(updates);
                            }}>Enable All</Button>
                            <Button size="sm" type="default" onClick={() => {
                                const updates: Record<string, any> = {};
                                DRAW_TOOLS.forEach(t => { updates[t.key] = false; });
                                this.setConfigBatch(updates);
                            }}>Disable All</Button>
                        </div>

                        <div style={s.toolGrid}>
                            {DRAW_TOOLS.map(tool => (
                                <div key={tool.key} style={s.checkRow}>
                                    <Checkbox
                                        checked={config[tool.key] !== false}
                                        onChange={() => this.setConfig(tool.key, config[tool.key] === false)}
                                        aria-label={`${tool.label} drawing tool`}
                                    />
                                    <span style={s.checkLabel}>
                                        <span style={s.toolIcon} aria-hidden="true">{tool.icon}</span>
                                        {tool.label}
                                    </span>
                                </div>
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
                                <p style={{ ...s.sub, fontWeight: 600, color: '#495057', marginBottom: '6px' }}>
                                    Choose which actions are available in the My Drawings toolbar:
                                </p>
                                <div style={s.indent}>
                                    {this.renderCheck('enableMyDrawingsImport', 'Import (Shapefile, GeoJSON, KML)')}
                                    {this.renderCheck('enableMyDrawingsExport', 'Export (Shapefile, GeoJSON, KML, CSV)')}
                                    {this.renderCheck('enableMyDrawingsLock', 'Lock / Unlock drawings')}
                                    {this.renderCheck('enableMyDrawingsGroup', 'Group / Ungroup drawings')}
                                    {this.renderCheck('enableMyDrawingsMerge', 'Merge selected drawings')}
                                    {this.renderCheck('enableMyDrawingsDuplicate', 'Duplicate drawings')}
                                    {this.renderCheck('enableMyDrawingsZoomTo', 'Zoom to drawing')}
                                    {this.renderCheck('enableMyDrawingsProperties', 'View drawing properties')}
                                    {this.renderCheck('enableMyDrawingsSort', 'Sort and filter controls')}
                                </div>

                                <div style={{ ...s.quickBtns, marginTop: '8px', paddingLeft: '12px' }}>
                                    <Button size="sm" type="default" onClick={() => {
                                        this.setConfigBatch({
                                            enableMyDrawingsImport: true, enableMyDrawingsExport: true,
                                            enableMyDrawingsLock: true, enableMyDrawingsGroup: true,
                                            enableMyDrawingsMerge: true, enableMyDrawingsDuplicate: true,
                                            enableMyDrawingsZoomTo: true, enableMyDrawingsProperties: true,
                                            enableMyDrawingsSort: true
                                        });
                                    }}>Enable All</Button>
                                    <Button size="sm" type="default" onClick={() => {
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
                                />
                            </Label>
                        </SettingRow>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                            {this.renderCheck('changeTitle', 'Allow users to rename the draw layer', false)}
                            {this.renderCheck('listMode', 'Show draw layer in map layer list', false)}
                            {this.renderCheck('changeListMode', 'Allow users to toggle layer list visibility', false)}
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
                                    <Button onClick={() => this.setState({ linearSidePopper: true })} style={{ width: '100%' }}>
                                        Add or Change Linear Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Linear Unit:
                                        <Select title='Linear Units' onChange={(e) => this.handleDefaultDistance(e.target.value)} value={this.state.defaultDistanceUnit}>
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
                                    <Button onClick={() => this.setState({ areaSidePopper: true })} style={{ width: '100%' }}>
                                        Add or Change Area Units
                                    </Button>
                                </SettingRow>
                                <SettingRow>
                                    <Label className='w-100'>
                                        Default Area Units:
                                        <Select title='Area Units' onChange={(e) => this.handleDefaultArea(e.target.value)} value={this.state.defaultAreaUnit}>
                                            {this.state.availableAreaUnits.map((unit, index) => (
                                                <Option key={index} value={index}>{unit.label} ({unit.abbreviation})</Option>
                                            ))}
                                        </Select>
                                        <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                            Note: superscript characters may not display correctly here but will work in the application.
                                        </span>
                                        {this.state.defaultAreaUnit === null && <Alert type='warning'>Reset Default Area Units</Alert>}
                                    </Label>
                                </SettingRow>
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
                                    >
                                        <Option value='draw'>Draw</Option>
                                        <Option value='mydrawings'>My Drawings</Option>
                                    </Select>
                                    <p style={s.sub}>Which tab is active when the widget first opens.</p>
                                </Label>
                            </SettingRow>
                        )}

                        {/* Confirm before clear */}
                        {this.renderCheck('confirmBeforeClear', 'Require confirmation before clearing all drawings', true)}

                        {/* Turn off on close */}
                        <div style={{ marginTop: '4px' }}>
                            {this.renderCheck('turnOffOnClose', 'Stop drawing when widget is closed', false)}
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