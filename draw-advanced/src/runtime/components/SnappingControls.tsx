import { React, hooks } from 'jimu-core';
import defaultMessages from '../translations/default';
import { ImmutableObject } from 'jimu-core';
import { CollapsableCheckbox, Alert, Switch, Label, Select, Option, Slider, NumericInput } from 'jimu-ui';
import { ColorPicker } from 'jimu-ui/basic/color-picker';
import type { JimuMapView } from 'jimu-arcgis';
// FeatureSnappingLayerSource removed in JSAPI 5.0 - featureSources autocasts
import FeatureLayer from 'esri/layers/FeatureLayer';
import Collection from 'esri/core/Collection';
import GridControls from 'esri/widgets/support/GridControls';
import { __t } from '../i18n-t'

interface SnappingControlsProps {
    jimuMapView: JimuMapView;
    sketchViewModel: any;
}

// Screen reader only styles for visually hidden but accessible text
const srOnlyStyles: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0'
};

// Remembered snapping/grid checkbox state (per browser, per app path), same tier as the
// measurement preferences. Read once at mount so the panels render open when they were on.
const SNAP_PREFS_KEY = `draw-advanced:snap-prefs:v1:${typeof window !== 'undefined' ? window.location.pathname : 'default'}`;
interface SnapPrefs { enabled?: boolean; gridEnabled?: boolean; gridDynamicScale?: boolean; gridSnapEnabled?: boolean; gridRotateWithMap?: boolean }
const loadSnapPrefs = (): SnapPrefs | null => {
    try {
        const raw = window.localStorage?.getItem(SNAP_PREFS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed as SnapPrefs : null;
    } catch { return null; }
};
const boolOr = (v: any, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export const SnappingControls = (props: SnappingControlsProps): React.ReactElement => {
    const t = hooks.useTranslation(defaultMessages);
    const [savedSnap] = React.useState<SnapPrefs | null>(loadSnapPrefs);
    const [enabled, setEnabled] = React.useState(boolOr(savedSnap?.enabled, false));
    const [snapSourcesCount, setSnapSourcesCount] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const processedLayerKeys = React.useRef(new Set<string>());

    // Grid Controls state
    // Grid can only be on while snapping is on
    const [gridEnabled, setGridEnabled] = React.useState(boolOr(savedSnap?.enabled, false) && boolOr(savedSnap?.gridEnabled, false));
    const [gridColor, setGridColor] = React.useState('rgba(0,0,0,1)');
    const [gridTheme, setGridTheme] = React.useState<'light' | 'dark' | 'custom'>('light');
    const [gridRotation, setGridRotation] = React.useState(0);
    const [gridSpacing, setGridSpacing] = React.useState(50);
    const [gridDynamicScale, setGridDynamicScale] = React.useState(boolOr(savedSnap?.gridDynamicScale, true));
    const [gridSnapEnabled, setGridSnapEnabled] = React.useState(boolOr(savedSnap?.gridSnapEnabled, true));
    const [gridMajorLineInterval, setGridMajorLineInterval] = React.useState(5);
    const [gridRotateWithMap, setGridRotateWithMap] = React.useState(boolOr(savedSnap?.gridRotateWithMap, false));

    // Save the checkbox state whenever it changes
    React.useEffect(() => {
        try {
            window.localStorage?.setItem(SNAP_PREFS_KEY, JSON.stringify({ enabled, gridEnabled, gridDynamicScale, gridSnapEnabled, gridRotateWithMap }));
        } catch { /* quota or privacy mode: settings simply don't persist */ }
    }, [enabled, gridEnabled, gridDynamicScale, gridSnapEnabled, gridRotateWithMap]);
    const [gridPlacementActive, setGridPlacementActive] = React.useState(false);
    const gridControlsRef = React.useRef<GridControls | null>(null);

    // Linear unit grid state
    const [gridSpacingMode, setGridSpacingMode] = React.useState<'pixels' | 'mapUnits'>('pixels');
    const [gridMapUnit, setGridMapUnit] = React.useState<'feet' | 'meters' | 'yards'>('feet');
    const [gridMapUnitValue, setGridMapUnitValue] = React.useState(100);

    // Track whether grid was on before snapping was disabled (for restore)
    const gridWasEnabledRef = React.useRef(false);
    // Guard against re-entrant state updates during sync
    const isSyncingRef = React.useRef(false);

    // Generate unique IDs for accessibility associations
    const baseId = React.useId();
    const ids = {
        snappingPanel: `${baseId}-snapping-panel`,
        snappingStatus: `${baseId}-snapping-status`,
        snappingInstructions: `${baseId}-snapping-instructions`,
        snappingError: `${baseId}-snapping-error`,
        gridPanel: `${baseId}-grid-panel`,
        gridStatus: `${baseId}-grid-status`,
        gridThemeLabel: `${baseId}-grid-theme-label`,
        gridThemeSelect: `${baseId}-grid-theme-select`,
        gridThemeDesc: `${baseId}-grid-theme-desc`,
        gridColorLabel: `${baseId}-grid-color-label`,
        gridColorPicker: `${baseId}-grid-color-picker`,
        gridSpacingLabel: `${baseId}-grid-spacing-label`,
        gridSpacingSlider: `${baseId}-grid-spacing-slider`,
        gridSpacingInput: `${baseId}-grid-spacing-input`,
        gridSpacingDesc: `${baseId}-grid-spacing-desc`,
        gridRotationLabel: `${baseId}-grid-rotation-label`,
        gridRotationSlider: `${baseId}-grid-rotation-slider`,
        gridRotationInput: `${baseId}-grid-rotation-input`,
        gridRotationDesc: `${baseId}-grid-rotation-desc`,
        gridMajorLineLabel: `${baseId}-grid-majorline-label`,
        gridMajorLineSlider: `${baseId}-grid-majorline-slider`,
        gridMajorLineInput: `${baseId}-grid-majorline-input`,
        gridMajorLineDesc: `${baseId}-grid-majorline-desc`,
        gridDynamicScaleSwitch: `${baseId}-grid-dynamic-scale`,
        gridDynamicScaleDesc: `${baseId}-grid-dynamic-scale-desc`,
        gridSnapSwitch: `${baseId}-grid-snap`,
        gridSnapDesc: `${baseId}-grid-snap-desc`,
        gridPlacementButton: `${baseId}-grid-placement-btn`,
        gridPlacementDesc: `${baseId}-grid-placement-desc`,
        gridRotateMapSwitch: `${baseId}-grid-rotate-map`,
        gridRotateMapDesc: `${baseId}-grid-rotate-map-desc`,
        gridSpacingModeLabel: `${baseId}-grid-spacing-mode-label`,
        gridSpacingModeSelect: `${baseId}-grid-spacing-mode-select`,
        gridSpacingModeDesc: `${baseId}-grid-spacing-mode-desc`,
        gridMapUnitLabel: `${baseId}-grid-map-unit-label`,
        gridMapUnitSelect: `${baseId}-grid-map-unit-select`,
        gridMapUnitValueLabel: `${baseId}-grid-map-unit-value-label`,
        gridMapUnitValueInput: `${baseId}-grid-map-unit-value-input`,
        gridMapUnitValueDesc: `${baseId}-grid-map-unit-value-desc`,
        liveRegion: `${baseId}-live-region`
    };

    // Ref for live region announcements
    const liveRegionRef = React.useRef<HTMLDivElement>(null);

    // Function to announce messages to screen readers
    const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (liveRegionRef.current) {
            liveRegionRef.current.setAttribute('aria-live', priority);
            liveRegionRef.current.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                if (liveRegionRef.current) {
                    liveRegionRef.current.textContent = '';
                }
            }, 1000);
        }
    }, []);

    const isSnappableLayer = (layer: any): boolean => {
        if (!layer?.visible) return false;
        const snappableTypes = ['feature', 'graphics', 'csv', 'geojson', 'wfs'];
        return snappableTypes.includes(layer?.type?.toLowerCase() || '');
    };

    const addSnappingSource = (layer: any, snapSources: any[], key: string) => {
        if (processedLayerKeys.current.has(key)) return;
        try {
            const source: any = { layer, enabled: true }; // JSAPI 5.0 autocasting
            snapSources.push(source);
            processedLayerKeys.current.add(key);
        } catch (err) {
            console.warn(`Failed to add snapping source for ${key}: ${err.message}`);
        }
    };

    const recurseLayers = async (
        layer: any,
        snapSources: any[],
        depth = 0
    ) => {
        if (!layer || depth > 10 || !layer.visible) return;

        const key = layer.id || layer.url || `${layer.title}-${depth}`;

        if (isSnappableLayer(layer)) {
            addSnappingSource(layer, snapSources, key);
        }

        if (layer?.url && layer?.type === 'sublayer' && layer?.layerType === 'Feature Layer') {
            const urlKey = `url:${layer.url}`;
            if (!processedLayerKeys.current.has(urlKey)) {
                try {
                    const featureLayer = new FeatureLayer({ url: layer.url, visible: true, outFields: ['*'] });
                    await featureLayer.load();
                    addSnappingSource(featureLayer, snapSources, urlKey);
                } catch (err) {
                    console.warn(`❌ Could not load feature layer from URL ${layer.url}: ${err.message}`);
                }
            }
        }

        const sublayerCollections = [
            layer.sublayers,
            layer.allSublayers,
            layer.layers,
            layer.subLayers,
            layer.layerInfos
        ];

        for (const coll of sublayerCollections) {
            if (coll?.items) {
                for (const sub of coll.items) await recurseLayers(sub, snapSources, depth + 1);
            } else if (Array.isArray(coll)) {
                for (const sub of coll) await recurseLayers(sub, snapSources, depth + 1);
            }
        }
    };

    const configureSnapping = async () => {
        setIsLoading(true);
        setError(null);
        processedLayerKeys.current.clear();
        announce(t('configuringSnappingPleaseWait'), 'polite');

        const view = props.jimuMapView?.view;
        const sketchVM = props.sketchViewModel;

        if (!view) {
            const errorMsg = __t("mapViewIsNotAvailable");
            setError(errorMsg);
            setIsLoading(false);
            announce(t('errorErrorMsg', { errorMsg }), 'assertive');
            return;
        }
        if (!sketchVM) {
            const errorMsg = __t("sketchViewModelIsNotAvailable");
            setError(errorMsg);
            setIsLoading(false);
            announce(t('errorErrorMsg', { errorMsg }), 'assertive');
            return;
        }

        try {
            // Enable snapping on the SketchViewModel up front, before the layer scan
            // below (which can be slow or throw). Custom tools (triangle, curve) read
            // snappingOptions.enabled directly, so it must be set even if the scan
            // fails. featureSources are attached afterward once gathered.
            const options = {
                enabled: true,
                featureEnabled: true,
                selfEnabled: true,
                distance: 15,
                featureSources: new Collection()
            };
            sketchVM.snappingOptions = options;
            (view as any).snappingOptions = options;
            if (gridControlsRef.current?.viewModel) {
                gridControlsRef.current.snappingOptions = options;
            }

            const snapSources: any[] = [];
            const allLayers = view.map.allLayers.toArray();

            await Promise.all(
                allLayers
                    .filter((l) => l.load && !l.loaded)
                    .map((l) => l.load().catch(() => { }))
            );

            for (const layer of allLayers) {
                try { await recurseLayers(layer, snapSources); }
                catch (e) { console.warn('Snap layer enumerate failed:', e); }
            }

            // Attach discovered sources to the already-enabled options.
            try {
                const fs = (sketchVM.snappingOptions as any).featureSources;
                if (fs?.removeAll) { fs.removeAll(); fs.addMany(snapSources); }
                else (sketchVM.snappingOptions as any).featureSources = new Collection(snapSources);
            } catch {
                (sketchVM.snappingOptions as any).featureSources = new Collection(snapSources);
            }

            setSnapSourcesCount(snapSources.length);
            if (snapSources.length === 0) {
                const warningMsg = __t("noVisibleSnappableLayersFound");
                setError(warningMsg);
                announce(t('warningWarningMsg', { warningMsg }), 'polite');
            } else {
                announce((snapSources.length !== 1 ? t('snappingEnabledWithSnapSourcesCountLayersAvailable', { snapSourcesCount: snapSources.length }) : t('snappingEnabledWithSnapSourcesCountLayerAvailable', { snapSourcesCount: snapSources.length })), 'polite');
            }
        } catch (err: any) {
            console.error('Error configuring snapping:', err);
            const errorMsg = __t("snappingFailedMessage", { message: err.message });
            setError(errorMsg);
            announce(t('errorErrorMsg', { errorMsg }), 'assertive');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = () => {
        const newState = !enabled;

        if (!newState && gridEnabled) {
            // Snapping is being disabled while grid is on — force grid off first
            gridWasEnabledRef.current = true;
            forceGridOff();
        }

        setEnabled(newState);
        announce(newState ? t('snappingEnabled') : t('snappingDisabled'), 'polite');
    };

    const handleGridToggle = () => {
        // Prevent toggling grid on if snapping is disabled
        if (!enabled && !gridEnabled) {
            announce(t('enableSnappingFirstToUseThe'), 'assertive');
            return;
        }

        const newState = !gridEnabled;
        setGridEnabled(newState);

        // Directly sync the viewModel immediately to avoid stale state
        if (gridControlsRef.current?.viewModel) {
            try {
                gridControlsRef.current.viewModel.trySetDisplayEnabled(newState);
                if (!newState) {
                    gridControlsRef.current.viewModel.snappingEnabled = false;
                }
            } catch (e) {
                console.warn('Error syncing grid toggle:', e);
            }
        }

        announce(newState ? t('gridOverlayEnabled') : t('gridOverlayDisabled'), 'polite');
    };

    /**
     * Force grid off and sync all state — used when snapping is disabled
     * to prevent orphaned grid state
     */
    const forceGridOff = React.useCallback(() => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        try {
            setGridEnabled(false);

            if (gridControlsRef.current?.viewModel) {
                try {
                    gridControlsRef.current.viewModel.trySetDisplayEnabled(false);
                    gridControlsRef.current.viewModel.snappingEnabled = false;
                } catch (e) {
                    console.warn('Error forcing grid off:', e);
                }
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, []);

    React.useEffect(() => {
        if (enabled && props.jimuMapView?.view && props.sketchViewModel) {
            configureSnapping();
        }
        if (!enabled && props.jimuMapView?.view && props.sketchViewModel) {
            // Disable snapping on the SketchViewModel
            props.sketchViewModel.snappingOptions.enabled = false;

            // Also disable on the view if it was set there
            const view = props.jimuMapView.view;
            if ((view as any).snappingOptions) {
                (view as any).snappingOptions.enabled = false;
            }

            // Force grid off when snapping is disabled to prevent orphaned state
            forceGridOff();
        }
    }, [enabled, props.jimuMapView, props.sketchViewModel]);

    // Grid Controls initialization and cleanup
    React.useEffect(() => {
        // Initialize GridControls when we have a 2D MapView (grid only works in 2D)
        if (props.jimuMapView?.view && !gridControlsRef.current) {
            try {
                const view = props.jimuMapView.view;

                // Grid only works with 2D MapView, not SceneView
                if (view.type !== '2d') {
                    return;
                }

                // Create GridControls instance - it manages the view's grid
                const gridControls = new GridControls({
                    view: view as any,
                    theme: gridTheme,
                    customColor: gridTheme === 'custom' ? gridColor : undefined,
                    snappingOptions: props.sketchViewModel?.snappingOptions || (view as any).snappingOptions || undefined,
                    visibleElements: {
                        colorSelection: false,
                        dynamicScaleToggle: false,
                        gridEnabledToggle: false,
                        numericInputs: false,
                        gridSnapEnabledToggle: false,
                        lineIntervalInput: false,
                        outOfScaleWarning: false,
                        placementButtons: false,
                        rotateWithMapToggle: false
                    }
                });

                // Store reference
                gridControlsRef.current = gridControls;

                // Initial grid state - enable if toggle is on
                if (gridControls.viewModel && gridEnabled) {
                    gridControls.viewModel.trySetDisplayEnabled(true);
                    gridControls.viewModel.dynamicScaling = gridSpacingMode === 'mapUnits' ? false : gridDynamicScale;
                    gridControls.viewModel.rotation = gridRotation;
                    gridControls.viewModel.spacing = gridSpacing;
                    gridControls.viewModel.snappingEnabled = gridSnapEnabled;
                    gridControls.viewModel.majorLineInterval = gridMajorLineInterval;
                    gridControls.viewModel.rotateWithMap = gridRotateWithMap;
                }

            } catch (error) {
                console.error('Error initializing GridControls:', error);
            }
        }

        // Cleanup on unmount
        return () => {
            if (gridControlsRef.current) {
                try {
                    // Disable grid before destroying
                    if (gridControlsRef.current.viewModel) {
                        gridControlsRef.current.viewModel.trySetDisplayEnabled(false);
                    }
                    gridControlsRef.current.destroy();
                } catch (error) {
                    console.warn('Error destroying GridControls:', error);
                }
                gridControlsRef.current = null;
            }
        };
    }, [props.jimuMapView, props.sketchViewModel]);

    // Effect 1: Enable or disable the grid display.
    // ONLY fires when gridEnabled changes — avoids re-calling trySetDisplayEnabled
    // on every property tweak, which resets the grid and discards pending changes.
    React.useEffect(() => {
        if (isSyncingRef.current) return;
        if (gridControlsRef.current?.viewModel) {
            try {
                gridControlsRef.current.viewModel.trySetDisplayEnabled(gridEnabled);
                if (!gridEnabled) {
                    gridControlsRef.current.viewModel.snappingEnabled = false;
                }
            } catch (error) {
                console.warn('Error toggling grid display:', error);
            }
        }
    }, [gridEnabled]);

    // Effect 2: Push property changes to the viewModel (only when grid is enabled).
    // This runs independently of trySetDisplayEnabled so property writes aren't
    // clobbered by an enable/disable cycle.
    React.useEffect(() => {
        if (!gridEnabled || isSyncingRef.current) return;
        const vm = gridControlsRef.current?.viewModel;
        if (!vm) return;

        try {
            // CRITICAL: Set dynamicScaling BEFORE spacing.
            // With dynamicScaling on, the engine internally scales the spacing value.
            // We must disable it first so our pixel value is used literally.
            vm.dynamicScaling = gridSpacingMode === 'mapUnits' ? false : gridDynamicScale;

            vm.rotation = gridRotation;
            vm.spacing = gridSpacing;
            vm.snappingEnabled = gridSnapEnabled;
            vm.majorLineInterval = gridMajorLineInterval;
            vm.rotateWithMap = gridRotateWithMap;
            gridControlsRef.current.theme = gridTheme;
            if (gridTheme === 'custom') {
                gridControlsRef.current.customColor = gridColor;
            }
        } catch (error) {
            console.warn('Error updating grid properties:', error);
        }
    }, [gridEnabled, gridRotation, gridSpacing, gridDynamicScale, gridSnapEnabled,
        gridMajorLineInterval, gridRotateWithMap, gridTheme, gridColor, gridSpacingMode, props.jimuMapView]);


    // Synchronize grid snapping with SketchViewModel snapping options
    React.useEffect(() => {
        if (gridControlsRef.current?.viewModel && props.sketchViewModel?.snappingOptions) {
            try {
                gridControlsRef.current.snappingOptions = props.sketchViewModel.snappingOptions;
            } catch (error) {
                console.warn('Error syncing grid snapping:', error);
            }
        }
    }, [gridSnapEnabled, gridEnabled, props.sketchViewModel?.snappingOptions]);

    // Grid placement: toggle interactive placement mode (place origin by clicking the map)
    React.useEffect(() => {
        const vm = gridControlsRef.current?.viewModel;
        if (!vm || !gridEnabled) {
            if (gridPlacementActive) setGridPlacementActive(false);
            return;
        }

        if (gridPlacementActive) {
            vm.interactivePlacementState = 'place';

            // Watch for the viewModel to finish placement (returns to 'interactive' after user clicks)
            const handle = vm.watch('interactivePlacementState', (state) => {
                if (state === 'interactive') {
                    setGridPlacementActive(false);
                }
            });

            return () => {
                handle?.remove();
                if (vm.interactivePlacementState === 'place') {
                    vm.interactivePlacementState = 'interactive';
                }
            };
        } else {
            if (vm.interactivePlacementState === 'place') {
                vm.interactivePlacementState = 'interactive';
            }
        }
    }, [gridPlacementActive, gridEnabled]);

    // ========================================================================
    // LINEAR UNIT-BASED GRID SPACING
    // ========================================================================

    /**
     * Convert a user-specified distance to the value to set on vm.spacing.
     *
     * Empirical testing shows vm.spacing maps 1:1 to measured feet:
     *   vm.spacing = 204.3  → measured 204.25 ft
     *   vm.spacing = 30.48  → measured 30.48 ft
     * This holds regardless of CRS (UTM 32612 / meters) and zoom level.
     *
     * So: convert the user's input to feet and set directly.
     */
    const convertToSpacingValue = React.useCallback((value: number, unit: 'feet' | 'meters' | 'yards'): number => {
        switch (unit) {
            case 'meters':
                return value * 3.28084;  // meters to feet
            case 'yards':
                return value * 3;        // yards to feet
            case 'feet':
            default:
                return value;
        }
    }, []);

    // Effect: In map-units mode, set vm.spacing directly.
    // No CRS conversion needed — vm.spacing empirically maps 1:1 to feet.
    React.useEffect(() => {
        if (gridSpacingMode !== 'mapUnits' || !gridEnabled) return;

        const spacingValue = convertToSpacingValue(gridMapUnitValue, gridMapUnit);

        if (spacingValue <= 0) return;

        const vm = gridControlsRef.current?.viewModel;
        if (!vm) return;

        vm.dynamicScaling = false;
        vm.spacing = spacingValue;

        setGridSpacing(spacingValue);
    }, [gridSpacingMode, gridMapUnitValue, gridMapUnit, gridEnabled, convertToSpacingValue]);

    return (
        <div
            className='drawToolbarDiv'
            role="region"
            aria-label={t('snapSnappingAndGridControls')}
        >
            {/* Live region for screen reader announcements */}
            <div
                ref={liveRegionRef}
                id={ids.liveRegion}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={srOnlyStyles}
            />

            {/* Wrapper with tooltip for CollapsableCheckbox */}
            <div
                title={enabled
                    ? t('clickToDisableSnappingWhenEnabled')
                    : t('clickToEnableSnappingSnappingHelps')}
            >
                <CollapsableCheckbox
                    label={enabled ? t('snapDisableSnapping') : t('snapEnableSnapping')}
                    checked={enabled}
                    onCheckedChange={handleToggle}
                    disableActionForUnchecked
                    defaultIsOpen={enabled}
                    openForCheck
                    closeForUncheck
                    className='w-100'
                    aria-expanded={enabled}
                    aria-controls={ids.snappingPanel}
                    aria-describedby={ids.snappingInstructions}
                >
                    <div
                        id={ids.snappingPanel}
                        className='ml-3 my-1'
                        role="group"
                        aria-label={t('snapSnappingOptionsAndSettings')}
                    >
                        {/* Instructions list with accessibility */}
                        <ul
                            id={ids.snappingInstructions}
                            className='text-dark m-0 pl-3 small'
                            aria-label={t('snapSnappingKeyboardShortcutsAndInstructions')}
                        >
                            <li>
                                {t('hold')} <strong><kbd>{t('snapCtrl')}</kbd></strong> {t('windowsOr')} <strong><kbd>{t('snapCmd')}</kbd></strong> {t('macToTemporarilyDisableSnappingWhile')}
                            </li>
                            <li>
                                {t('snapToFeatureVerticesEdgesAnd')}
                            </li>
                        </ul>

                        {/* Loading state with accessibility */}
                        {isLoading && (
                            <p
                                className='text-info my-1'
                                role="status"
                                aria-busy="true"
                                aria-live="polite"
                            >
                                <span style={srOnlyStyles}>{t('snapLoading')}</span>
                                {t('configuringSnapping')}
                            </p>
                        )}

                        {/* Error/Warning alert with accessibility */}
                        {error && (
                            <Alert
                                type='warning'
                                className='mt-2'
                                withIcon
                                text={error}
                                closable
                                role="alert"
                                aria-live="assertive"
                                aria-atomic="true"
                            />
                        )}

                        {/* Snapping status for screen readers */}
                        {enabled && !isLoading && !error && snapSourcesCount > 0 && (
                            <p
                                id={ids.snappingStatus}
                                style={srOnlyStyles}
                                role="status"
                            >
                                {(snapSourcesCount !== 1 ? t('snappingIsActiveWithSnapSourcesCountLayers', { snapSourcesCount }) : t('snappingIsActiveWithSnapSourcesCountLayer', { snapSourcesCount }))}
                            </p>
                        )}

                        {/* Grid Controls - Only show in 2D MapView and when snapping is enabled */}
                        {props.jimuMapView?.view?.type !== '2d' ? (
                            // Show info message if not in 2D view
                            <div
                                className='w-100 mt-3'
                                role="note"
                                aria-label={t('snapGridControlsAvailabilityNotice')}
                            >
                                <Alert
                                    type='info'
                                    withIcon
                                    text={t('gridControlsAreOnlyAvailableIn')}
                                    closable={false}
                                    role="status"
                                    aria-live="polite"
                                />
                            </div>
                        ) : (
                            // Show full grid controls if in 2D view
                            <div
                                className='mt-3'
                                role="region"
                                aria-label={t('snapGridOverlayControls')}
                            >
                                {/* Wrapper with tooltip for Grid CollapsableCheckbox */}
                                <div
                                    title={gridEnabled
                                        ? t('clickToDisableTheGridOverlay')
                                        : t('clickToEnableTheGridOverlay')}
                                >
                                    <CollapsableCheckbox
                                        className='w-100'
                                        checked={gridEnabled}
                                        onCheckedChange={handleGridToggle}
                                        disableActionForUnchecked
                                        defaultIsOpen={gridEnabled}
                                        openForCheck
                                        closeForUncheck
                                        label={gridEnabled ? t('snapDisableGrid') : t('snapEnableGrid')}
                                        aria-expanded={gridEnabled}
                                        aria-controls={ids.gridPanel}
                                    >
                                        <div
                                            id={ids.gridPanel}
                                            className='ml-3 my-1'
                                            role="group"
                                            aria-label={t('snapGridConfigurationOptions')}
                                        >
                                            {/* Grid status for screen readers */}
                                            <div
                                                id={ids.gridStatus}
                                                style={srOnlyStyles}
                                                role="status"
                                            >
                                                {gridEnabled
                                                    ? t('gridIsEnabledThemeGridThemeSpacing', { gridTheme, gridSpacingMode: gridSpacingMode === 'mapUnits'
                                                        ? `${gridMapUnitValue} ${gridMapUnit}`
                                                        : t('gridSpacingPixels', { gridSpacing }), gridRotation })
                                                    : t('gridIsDisabled')}
                                            </div>

                                            {gridEnabled && (
                                                <div
                                                    className='d-flex flex-column'
                                                    role="form"
                                                    aria-label={t('snapGridSettingsForm')}
                                                >
                                                    {/* Grid Theme Selection */}
                                                    <div className='mb-2'>
                                                        <label
                                                            id={ids.gridThemeLabel}
                                                            htmlFor={ids.gridThemeSelect}
                                                            className='d-flex flex-column'
                                                        >
                                                            <span
                                                                className='mb-1'
                                                                style={{ fontSize: '12px' }}
                                                            >
                                                                {t('gridTheme')}
                                                            </span>
                                                            <Select
                                                                id={ids.gridThemeSelect}
                                                                size='sm'
                                                                style={{ width: '100%' }}
                                                                value={gridTheme}
                                                                onChange={(e) => {
                                                                    const newTheme = e.target.value as 'light' | 'dark' | 'custom';
                                                                    setGridTheme(newTheme);
                                                                    announce(t('gridThemeChangedToNewTheme', { newTheme }), 'polite');
                                                                }}
                                                                aria-labelledby={ids.gridThemeLabel}
                                                                aria-describedby={ids.gridThemeDesc}
                                                                title={t('snapSelectAColorThemeFor')}
                                                            >
                                                                <Option value='light'>{t('snapLight')}</Option>
                                                                <Option value='dark'>{t('snapDark')}</Option>
                                                                <Option value='custom'>{t('snapCustom')}</Option>
                                                            </Select>
                                                        </label>
                                                        <span
                                                            id={ids.gridThemeDesc}
                                                            style={srOnlyStyles}
                                                        >
                                                            {t('chooseLightForDarkBackgroundsDark')}
                                                        </span>
                                                    </div>

                                                    {/* Custom Color Picker */}
                                                    {gridTheme === 'custom' && (
                                                        <div className='mb-2'>
                                                            <label
                                                                id={ids.gridColorLabel}
                                                                htmlFor={ids.gridColorPicker}
                                                                className='d-flex flex-column'
                                                            >
                                                                <span
                                                                    className='mb-1'
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    {t('gridColor')}
                                                                </span>
                                                                <div title={t('snapSelectACustomColorFor')}>
                                                                    <ColorPicker
                                                                        color={gridColor}
                                                                        onChange={(color) => {
                                                                            setGridColor(color);
                                                                            announce(t('gridColorChanged'), 'polite');
                                                                        }}
                                                                        aria-labelledby={ids.gridColorLabel}
                                                                    />
                                                                </div>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {/* Set Grid Origin Button */}
                                                    <div className='mb-2'>
                                                        <span
                                                            className='mb-1 d-block'
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            {t('gridOrigin')}
                                                        </span>
                                                        <button
                                                            id={ids.gridPlacementButton}
                                                            type="button"
                                                            className={`btn btn-sm w-100 ${gridPlacementActive ? 'btn-primary' : 'btn-secondary'}`}
                                                            onClick={() => {
                                                                const newState = !gridPlacementActive;
                                                                setGridPlacementActive(newState);
                                                                announce(
                                                                    newState
                                                                        ? t('placeGridModeActivatedClickOn')
                                                                        : t('placeGridModeDeactivated'),
                                                                    'polite'
                                                                );
                                                            }}
                                                            title={gridPlacementActive
                                                                ? t('clickToCancelPlacementCurrentlyWaiting')
                                                                : t('clickToSetTheGridOrigin')}
                                                            aria-pressed={gridPlacementActive}
                                                            aria-describedby={ids.gridPlacementDesc}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px',
                                                                border: '1px solid var(--light-500)',
                                                                borderRadius: '2px'
                                                            }}
                                                        >
                                                            <svg
                                                                width='14'
                                                                height='14'
                                                                viewBox='0 0 16 16'
                                                                fill='currentColor'
                                                                aria-hidden="true"
                                                                focusable="false"
                                                            >
                                                                <path d='M8 0L7 1v6H1l-1 1 1 1h6v6l1 1 1-1V9h6l1-1-1-1H9V1L8 0z' />
                                                            </svg>
                                                            {gridPlacementActive ? t('clickMapToSetOrigin') : t('setGridOrigin')}
                                                        </button>
                                                        <span id={ids.gridPlacementDesc} style={srOnlyStyles}>
                                                            {t('setsTheGridCenterPointBy')}
                                                        </span>
                                                    </div>

                                                    {/* Grid Spacing Mode Selector */}
                                                    <div className='mb-2'>
                                                        <label
                                                            id={ids.gridSpacingModeLabel}
                                                            htmlFor={ids.gridSpacingModeSelect}
                                                            className='d-flex flex-column'
                                                        >
                                                            <span
                                                                className='mb-1'
                                                                style={{ fontSize: '12px' }}
                                                            >
                                                                {t('spacingMode')}
                                                            </span>
                                                            <Select
                                                                id={ids.gridSpacingModeSelect}
                                                                size='sm'
                                                                style={{ width: '100%' }}
                                                                value={gridSpacingMode}
                                                                onChange={(e) => {
                                                                    const newMode = e.target.value as 'pixels' | 'mapUnits';
                                                                    setGridSpacingMode(newMode);
                                                                    announce((newMode === 'pixels' ? t('gridSpacingModeChangedToPixels') : t('gridSpacingModeChangedToMap')), 'polite');
                                                                }}
                                                                aria-labelledby={ids.gridSpacingModeLabel}
                                                                aria-describedby={ids.gridSpacingModeDesc}
                                                                title={t('snapChooseWhetherGridSpacingIs')}
                                                            >
                                                                <Option value='pixels'>{t('snapPixelsScreen')}</Option>
                                                                <Option value='mapUnits'>{t('snapMapUnitsLinear')}</Option>
                                                            </Select>
                                                        </label>
                                                        <span
                                                            id={ids.gridSpacingModeDesc}
                                                            style={srOnlyStyles}
                                                        >
                                                            {t('pixelsModeSetsGridLineDistance')}
                                                        </span>
                                                    </div>

                                                    {/* Grid Spacing - Pixel mode */}
                                                    {gridSpacingMode === 'pixels' && (
                                                        <div className='mb-2'>
                                                            <label
                                                                id={ids.gridSpacingLabel}
                                                                className='d-flex flex-column'
                                                            >
                                                                <span
                                                                    className='mb-1'
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    {t('gridSpacingPixels2')}
                                                                </span>
                                                                <div
                                                                    className='d-flex align-items-center'
                                                                    role="group"
                                                                    aria-labelledby={ids.gridSpacingLabel}
                                                                >
                                                                    <div
                                                                        className='flex-grow-1 mr-2'
                                                                        title={t('snapGridSpacingSliderCurrentValue', { gridSpacing: gridSpacing })}
                                                                    >
                                                                        <Slider
                                                                            id={ids.gridSpacingSlider}
                                                                            value={gridSpacing}
                                                                            onChange={(e) => {
                                                                                const newValue = Number(e.target.value);
                                                                                setGridSpacing(newValue);
                                                                                announce(t('gridSpacingNewValuePixels', { newValue }), 'polite');
                                                                            }}
                                                                            min={10}
                                                                            max={200}
                                                                            step={5}
                                                                            aria-label={t('snapGridSpacingGridspacingPixels', { gridSpacing: gridSpacing })}
                                                                            aria-valuemin={10}
                                                                            aria-valuemax={200}
                                                                            aria-valuenow={gridSpacing}
                                                                            aria-valuetext={t('gridSpacingPixels', { gridSpacing })}
                                                                            aria-describedby={ids.gridSpacingDesc}
                                                                        />
                                                                    </div>
                                                                    <NumericInput
                                                                        id={ids.gridSpacingInput}
                                                                        size='sm'
                                                                        value={gridSpacing}
                                                                        onChange={(value) => {
                                                                            setGridSpacing(value);
                                                                            announce(t('gridSpacingSetToValuePixels', { value }), 'polite');
                                                                        }}
                                                                        min={10}
                                                                        max={200}
                                                                        step={5}
                                                                        style={{ width: '70px' }}
                                                                        aria-label={t('snapGridSpacingInPixels')}
                                                                        aria-describedby={ids.gridSpacingDesc}
                                                                        title={t('snapEnterGridSpacingValueIn')}
                                                                    />
                                                                </div>
                                                            </label>
                                                            <span id={ids.gridSpacingDesc} style={srOnlyStyles}>
                                                                {t('adjustTheDistanceBetweenGridLines')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Grid Spacing - Map Units mode */}
                                                    {gridSpacingMode === 'mapUnits' && (
                                                        <div className='mb-2'>
                                                            {/* Unit type selector */}
                                                            <label
                                                                id={ids.gridMapUnitLabel}
                                                                htmlFor={ids.gridMapUnitSelect}
                                                                className='d-flex flex-column mb-1'
                                                            >
                                                                <span
                                                                    className='mb-1'
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    {t('unit')}
                                                                </span>
                                                                <Select
                                                                    id={ids.gridMapUnitSelect}
                                                                    size='sm'
                                                                    style={{ width: '100%' }}
                                                                    value={gridMapUnit}
                                                                    onChange={(e) => {
                                                                        const newUnit = e.target.value as 'feet' | 'meters' | 'yards';
                                                                        setGridMapUnit(newUnit);
                                                                        announce(t('gridUnitChangedToNewUnit', { newUnit }), 'polite');
                                                                    }}
                                                                    aria-labelledby={ids.gridMapUnitLabel}
                                                                    title={t('snapSelectTheMapUnitFor')}
                                                                >
                                                                    <Option value='feet'>{t('feet')}</Option>
                                                                    <Option value='meters'>{t('meters')}</Option>
                                                                    <Option value='yards'>{t('yards')}</Option>
                                                                </Select>
                                                            </label>

                                                            {/* Distance value input */}
                                                            <label
                                                                id={ids.gridMapUnitValueLabel}
                                                                className='d-flex flex-column'
                                                            >
                                                                <span
                                                                    className='mb-1'
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    {t('gridSpacingGridMapUnit', { gridMapUnit })}
                                                                </span>
                                                                <NumericInput
                                                                    id={ids.gridMapUnitValueInput}
                                                                    size='sm'
                                                                    value={gridMapUnitValue}
                                                                    onChange={(value) => {
                                                                        if (value != null && value > 0) {
                                                                            setGridMapUnitValue(value);
                                                                            announce(t('gridSpacingSetToValueGridMapUnit', { value, gridMapUnit }), 'polite');
                                                                        }
                                                                    }}
                                                                    min={1}
                                                                    max={50000}
                                                                    step={gridMapUnit === 'meters' ? 10 : gridMapUnit === 'feet' ? 25 : 10}
                                                                    style={{ width: '100%' }}
                                                                    showHandlers={true}
                                                                    aria-label={t('snapGridSpacingInGridmapunit', { gridMapUnit: gridMapUnit })}
                                                                    aria-describedby={ids.gridMapUnitValueDesc}
                                                                    title={t('snapEnterGridSpacingInGridmapunit', { gridMapUnit: gridMapUnit })}
                                                                />
                                                            </label>

                                                            {/* Spacing info */}
                                                            <span id={ids.gridMapUnitValueDesc} style={srOnlyStyles}>
                                                                {t('setTheRealWorldDistanceBetween')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Grid Rotation */}
                                                    <div className='mb-2'>
                                                        <label
                                                            id={ids.gridRotationLabel}
                                                            className='d-flex flex-column'
                                                        >
                                                            <span
                                                                className='mb-1'
                                                                style={{ fontSize: '12px' }}
                                                            >
                                                                {t('gridRotationDegrees')}
                                                            </span>
                                                            <div
                                                                className='d-flex align-items-center'
                                                                role="group"
                                                                aria-labelledby={ids.gridRotationLabel}
                                                            >
                                                                <div
                                                                    className='flex-grow-1 mr-2'
                                                                    title={t('snapGridRotationSliderCurrentValue', { gridRotation: gridRotation })}
                                                                >
                                                                    <Slider
                                                                        id={ids.gridRotationSlider}
                                                                        value={gridRotation}
                                                                        onChange={(e) => {
                                                                            let value = Number(e.target.value);
                                                                            // Normalize to 0-360 range
                                                                            value = value % 360;
                                                                            if (value < 0) value += 360;
                                                                            setGridRotation(value);
                                                                            announce(t('gridRotationValueDegrees', { value }), 'polite');
                                                                        }}
                                                                        min={0}
                                                                        max={360}
                                                                        step={5}
                                                                        aria-label={t('snapGridRotationGridrotationDegrees', { gridRotation: gridRotation })}
                                                                        aria-valuemin={0}
                                                                        aria-valuemax={360}
                                                                        aria-valuenow={gridRotation}
                                                                        aria-valuetext={t('gridRotationDegrees2', { gridRotation })}
                                                                        aria-describedby={ids.gridRotationDesc}
                                                                    />
                                                                </div>
                                                                <NumericInput
                                                                    id={ids.gridRotationInput}
                                                                    size='sm'
                                                                    value={gridRotation}
                                                                    onChange={(value) => {
                                                                        // Normalize to 0-360 range
                                                                        let normalized = value % 360;
                                                                        if (normalized < 0) normalized += 360;
                                                                        setGridRotation(normalized);
                                                                        announce(t('gridRotationSetToNormalizedDegrees', { normalized }), 'polite');
                                                                    }}
                                                                    min={0}
                                                                    max={360}
                                                                    step={5}
                                                                    style={{ width: '70px' }}
                                                                    aria-label={t('snapGridRotationInDegrees')}
                                                                    aria-describedby={ids.gridRotationDesc}
                                                                    title={t('snapEnterGridRotationValueIn')}
                                                                />
                                                            </div>
                                                        </label>
                                                        <span id={ids.gridRotationDesc} style={srOnlyStyles}>
                                                            {t('adjustTheRotationAngleOfThe')}
                                                        </span>
                                                    </div>

                                                    {/* Major Line Interval */}
                                                    <div className='mb-2'>
                                                        <label
                                                            id={ids.gridMajorLineLabel}
                                                            className='d-flex flex-column'
                                                        >
                                                            <span
                                                                className='mb-1'
                                                                style={{ fontSize: '12px' }}
                                                            >
                                                                {t('majorLineInterval')}
                                                            </span>
                                                            <div
                                                                className='d-flex align-items-center'
                                                                role="group"
                                                                aria-labelledby={ids.gridMajorLineLabel}
                                                            >
                                                                <div
                                                                    className='flex-grow-1 mr-2'
                                                                    title={(gridMajorLineInterval === 1 ? t('majorLineIntervalSliderCurrentValue', { gridMajorLineInterval }) : (gridMajorLineInterval === 2 ? t('majorLineIntervalSliderCurrentValue2', { gridMajorLineInterval }) : (gridMajorLineInterval === 3 ? t('majorLineIntervalSliderCurrentValue3', { gridMajorLineInterval }) : t('majorLineIntervalSliderCurrentValue4', { gridMajorLineInterval }))))}
                                                                >
                                                                    <Slider
                                                                        id={ids.gridMajorLineSlider}
                                                                        value={gridMajorLineInterval}
                                                                        onChange={(e) => {
                                                                            const newValue = Number(e.target.value);
                                                                            setGridMajorLineInterval(newValue);
                                                                            announce(t('majorLineIntervalEveryNewValueLines', { newValue }), 'polite');
                                                                        }}
                                                                        min={1}
                                                                        max={10}
                                                                        step={1}
                                                                        aria-label={t('snapMajorLineIntervalEveryGridmajorlineinterval', { gridMajorLineInterval: gridMajorLineInterval })}
                                                                        aria-valuemin={1}
                                                                        aria-valuemax={10}
                                                                        aria-valuenow={gridMajorLineInterval}
                                                                        aria-valuetext={t('everyGridMajorLineIntervalLines', { gridMajorLineInterval })}
                                                                        aria-describedby={ids.gridMajorLineDesc}
                                                                    />
                                                                </div>
                                                                <NumericInput
                                                                    id={ids.gridMajorLineInput}
                                                                    size='sm'
                                                                    value={gridMajorLineInterval}
                                                                    onChange={(value) => {
                                                                        setGridMajorLineInterval(value);
                                                                        announce(t('majorLineIntervalSetToEvery', { value }), 'polite');
                                                                    }}
                                                                    min={1}
                                                                    max={10}
                                                                    step={1}
                                                                    style={{ width: '70px' }}
                                                                    aria-label={t('snapMajorLineInterval')}
                                                                    aria-describedby={ids.gridMajorLineDesc}
                                                                    title={t('snapEnterHowOftenMajorThicker')}
                                                                />
                                                            </div>
                                                        </label>
                                                        <span id={ids.gridMajorLineDesc} style={srOnlyStyles}>
                                                            {t('setHowOftenMajorGridLines')}
                                                        </span>
                                                    </div>

                                                    {/* Grid Options Toggles */}
                                                    <fieldset
                                                        className='d-flex flex-column mt-2'
                                                        style={{ border: 'none', padding: 0, margin: 0 }}
                                                    >
                                                        <legend style={srOnlyStyles}>{t('snapGridBehaviorOptions')}</legend>

                                                        {/* Dynamic Scaling Toggle — hidden in map-units mode (forced off) */}
                                                        {gridSpacingMode !== 'mapUnits' && (
                                                            <div className='mb-1'>
                                                                <label
                                                                    className='d-flex align-items-center'
                                                                    style={{ cursor: 'pointer' }}
                                                                    title={gridDynamicScale
                                                                        ? t('dynamicScalingIsOnTheGrid')
                                                                        : t('dynamicScalingIsOffTheGrid')}
                                                                >
                                                                    <Switch
                                                                        id={ids.gridDynamicScaleSwitch}
                                                                        checked={gridDynamicScale}
                                                                        onChange={() => {
                                                                            const newValue = !gridDynamicScale;
                                                                            setGridDynamicScale(newValue);
                                                                            announce((newValue ? t('dynamicScalingEnabled') : t('dynamicScalingDisabled')), 'polite');
                                                                        }}
                                                                        className='mr-2'
                                                                        size='sm'
                                                                        role="switch"
                                                                        aria-checked={gridDynamicScale}
                                                                        aria-describedby={ids.gridDynamicScaleDesc}
                                                                    />
                                                                    <span style={{ fontSize: '12px' }}>{t('snapDynamicScaling')}</span>
                                                                </label>
                                                                <span id={ids.gridDynamicScaleDesc} style={srOnlyStyles}>
                                                                    {t('whenEnabledTheGridAutomaticallyAdjusts')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Snap to Grid Toggle */}
                                                        <div className='mb-1'>
                                                            <label
                                                                className='d-flex align-items-center'
                                                                style={{ cursor: 'pointer' }}
                                                                title={gridSnapEnabled
                                                                    ? t('snapToGridIsOnYour')
                                                                    : t('snapToGridIsOffYour')}
                                                            >
                                                                <Switch
                                                                    id={ids.gridSnapSwitch}
                                                                    checked={gridSnapEnabled}
                                                                    onChange={() => {
                                                                        const newValue = !gridSnapEnabled;
                                                                        setGridSnapEnabled(newValue);
                                                                        announce((newValue ? t('snapToGridEnabled') : t('snapToGridDisabled')), 'polite');
                                                                    }}
                                                                    className='mr-2'
                                                                    size='sm'
                                                                    role="switch"
                                                                    aria-checked={gridSnapEnabled}
                                                                    aria-describedby={ids.gridSnapDesc}
                                                                />
                                                                <span style={{ fontSize: '12px' }}>{t('snapSnapToGrid')}</span>
                                                            </label>
                                                            <span id={ids.gridSnapDesc} style={srOnlyStyles}>
                                                                {t('whenEnabledYourDrawingCursorWill')}
                                                            </span>
                                                        </div>

                                                        {/* Rotate with Map Toggle */}
                                                        <div className='mb-1'>
                                                            <label
                                                                className='d-flex align-items-center'
                                                                style={{ cursor: 'pointer' }}
                                                                title={gridRotateWithMap
                                                                    ? t('rotateWithMapIsOnThe')
                                                                    : t('rotateWithMapIsOffThe')}
                                                            >
                                                                <Switch
                                                                    id={ids.gridRotateMapSwitch}
                                                                    checked={gridRotateWithMap}
                                                                    onChange={() => {
                                                                        const newValue = !gridRotateWithMap;
                                                                        setGridRotateWithMap(newValue);
                                                                        announce((newValue ? t('rotateWithMapEnabled') : t('rotateWithMapDisabled')), 'polite');
                                                                    }}
                                                                    className='mr-2'
                                                                    size='sm'
                                                                    role="switch"
                                                                    aria-checked={gridRotateWithMap}
                                                                    aria-describedby={ids.gridRotateMapDesc}
                                                                />
                                                                <span style={{ fontSize: '12px' }}>{t('snapRotateWithMap')}</span>
                                                            </label>
                                                            <span id={ids.gridRotateMapDesc} style={srOnlyStyles}>
                                                                {t('whenEnabledTheGridWillRotate')}
                                                            </span>
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsableCheckbox>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsableCheckbox>
            </div>
        </div>
    );
};