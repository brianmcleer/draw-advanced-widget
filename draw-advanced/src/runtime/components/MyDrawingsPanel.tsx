import React, { useState, useEffect, useRef } from 'react';
import { Button, TextInput, NumericInput, Switch, Slider, Label, AdvancedButtonGroup, Select, Option, Popper } from 'jimu-ui';
import { SymbolSelector, JimuSymbolType, JimuSymbol } from 'jimu-ui/advanced/map';
import { JimuMapView } from 'jimu-arcgis';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Graphic from 'esri/Graphic';
import SketchViewModel from 'esri/widgets/Sketch/SketchViewModel';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import SimpleLineSymbol from 'esri/symbols/SimpleLineSymbol';
import SimpleFillSymbol from 'esri/symbols/SimpleFillSymbol';
import TextSymbol from 'esri/symbols/TextSymbol';
import Color from 'esri/Color';
import Font from 'esri/symbols/Font';
import { ThemeContext } from 'jimu-theme';
import { IMThemeVariables } from 'jimu-core';
import HitTestResult = __esri.HitTestResult;
import GraphicHit = __esri.GraphicHit;
import { ColorPicker } from 'jimu-ui/basic/color-picker';
import geometryEngineAsync from "esri/geometry/geometryEngineAsync";
import Point from "esri/geometry/Point";

// Optional: Import icons for text alignment if available
import hAlignLeft from 'jimu-icons/svg/outlined/editor/text-left.svg';
import hAlignCenter from 'jimu-icons/svg/outlined/editor/text-center.svg';
import hAlignRight from 'jimu-icons/svg/outlined/editor/text-right.svg';
import vAlignBase from './assets/text-align-v-base.svg';
import vAlignTop from './assets/text-align-v-t.svg';
import vAlignMid from './assets/text-align-v-m.svg';
import vAlignBot from './assets/text-align-v-b.svg';
import fsBoldIcon from './assets/bold.svg';
import fItalicIcon from './assets/italic.svg';
import fUnderlineIcon from './assets/underline.svg';

import { InputUnit } from 'jimu-ui/advanced/style-setting-components';
import { Icon } from 'jimu-ui';

import { TextStyleEditor } from './TextStyleEditor';

import { Alert } from 'jimu-ui';

type FontStyle = 'bold' | 'italic' | 'underline';
type HorizontalAlign = 'left' | 'center' | 'right';
type VerticalAlign = 'baseline' | 'top' | 'middle' | 'bottom';


interface ExtendedGraphic extends __esri.Graphic {
    measure?: {
        graphic: ExtendedGraphic;
        areaUnit?: string;
        lengthUnit?: string;
    };
    measureParent?: ExtendedGraphic;
    checked?: boolean;
    originalSymbol?: any; // Use 'any' here to avoid TypeScript errors
}

interface MyDrawingsPanelProps {
    graphicsLayer: GraphicsLayer;
    jimuMapView: JimuMapView;
    allowLocalStorage?: boolean;
    localStorageKey?: string;
    confirmOnDelete?: boolean;
    onDrawingSelect?: (graphic: __esri.Graphic, index: number) => void;
    onDrawingsUpdate?: (graphics: __esri.Graphic[]) => void;
    showAlert?: (message: string, type: 'success' | 'error' | 'info') => void;
    drawings?: __esri.Graphic[]; // Optional prop to receive drawings from parent
    isActiveTab: boolean;
}

interface MyDrawingsPanelState {
    drawings: ExtendedGraphic[];
    selectedGraphicIndex: number | null;
    sortOption: 'name' | 'type' | 'created';
    editingGraphicIndex: number | null;
    alertMessage: string;
    alertType: 'success' | 'error' | 'info' | 'warning';
    showAlert: boolean;
    consentGranted: boolean | null;
    graphicsWatchHandle: __esri.WatchHandle | null;

    // Confirm dialog
    confirmDialogOpen: boolean;
    confirmDialogAction: (() => void) | null;
    confirmDialogMessage: string;
    confirmDialogType: 'delete' | 'clearAll';
    confirmDialogItemIndex: number | null;

    // Import
    importDialogOpen: boolean;
    importFile: File | null;
    importFileContent: string | null;

    // Selection
    selectedGraphics: Set<number>;
    symbolEditingIndex: number | null;
    showStorageDisclaimer: boolean;

    // Text editor values
    textValue: string;

    // Text symbol editing properties
    fontColor: string;
    fontSize: number;
    fontFamily: string;
    fontOpacity: number;
    fontRotation: number;

    // Text alignment
    horizontalAlignment: 'left' | 'center' | 'right';
    verticalAlignment: 'baseline' | 'top' | 'middle' | 'bottom';

    // Button active states
    hAlignLeftActive: boolean;
    hAlignCenterActive: boolean;
    hAlignRightActive: boolean;
    vAlignBaseActive: boolean;
    vAlignTopActive: boolean;
    vAlignMidActive: boolean;
    vAlignBotActive: boolean;
    fsBoldActive: boolean;
    fsItalicActive: boolean;
    fsUnderlineActive: boolean;

    // Font style
    fontWeight: string;
    fontStyle: string;
    fontDecoration: string;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;

    // Halo properties
    fontHaloEnabled: boolean;
    fontHaloColor: string;
    fontHaloSize: number;
    fontHaloOpacity: number;

    // TextSymbol object for editor
    currentTextSymbol: TextSymbol;

    // Restore prompt
    showLoadPrompt: boolean;
    hasExistingDrawings: boolean;
}

export class MyDrawingsPanel extends React.PureComponent<MyDrawingsPanelProps, MyDrawingsPanelState> {
    sketchViewModel: SketchViewModel | null = null;
    private localStorageKey: string;
    private ignoreNextGraphicsUpdate = false;
    private internalSketchVM = true; // Track if we're using our own SketchVM or parent's

    private _mapClickSyncEnabled = true;
    private _drawingMap: Map<string, number> = new Map();
    private _refreshDrawingsOriginal: () => void;
    private _cleanMeasurementLabelsHandler: __esri.WatchHandle | null = null;
    private _measurementStyleWatcher: __esri.WatchHandle | null = null;
    private _positionWatchers: { [key: string]: __esri.WatchHandle } = {};
    private _savePositionTimeout: any = null;
    private _loadChoiceMadeThisSession = false;
    private static _drawingsLoadChoiceTimestamp: number = 0;
    private _afterRefreshDrawings: () => void = null;
    private _graphicsWatchHandles: __esri.WatchHandle[] = [];
    private _goToController: AbortController | null = null;
    private _originalQuality: string = 'high';
    private _isInteracting: boolean = false;
    constructor(props: MyDrawingsPanelProps) {
        super(props);

        // Use origin + pathname to uniquely identify the app (ignores query/hash)
        const fullUrl = `${window.location.origin}${window.location.pathname}`;

        // Base64 encode and sanitize for safe localStorage usage
        const baseKey = btoa(fullUrl).replace(/[^a-zA-Z0-9]/g, '_');

        // Remove the truncation! Keeping the full encoded key ensures uniqueness
        this.localStorageKey = this.props.localStorageKey
            ? this.props.localStorageKey
            : `drawings_${baseKey}`;

        // Log for debugging
        // console.log(`Using localStorage key: ${this.localStorageKey}`);

        // Get consent status from localStorage
        const consentValue = localStorage.getItem('drawingConsentGranted');

        // Set to null if not decided yet
        const consentGranted = consentValue === 'true'
            ? true
            : consentValue === 'false'
                ? false
                : null;

        this.state = {
            drawings: [],
            selectedGraphicIndex: null,
            sortOption: 'name',
            editingGraphicIndex: null,
            alertMessage: '',
            alertType: 'info',
            showAlert: false,
            consentGranted,
            graphicsWatchHandle: null,

            // Confirmation dialog
            confirmDialogOpen: false,
            confirmDialogAction: null,
            confirmDialogMessage: '',
            confirmDialogType: 'delete',
            confirmDialogItemIndex: null,

            // Import dialog
            importDialogOpen: false,
            importFile: null,
            importFileContent: null,

            // Selection
            selectedGraphics: new Set<number>(),
            symbolEditingIndex: null,
            showStorageDisclaimer: false,

            // Text input
            textValue: '',

            // Text symbol style properties
            fontColor: 'rgba(0,0,0,1)',
            fontSize: 12,
            fontFamily: 'Arial',
            fontOpacity: 1,
            fontRotation: 0,

            // Text alignment
            horizontalAlignment: 'center',
            verticalAlignment: 'middle',

            // Alignment button states
            hAlignLeftActive: false,
            hAlignCenterActive: true,
            hAlignRightActive: false,
            vAlignBaseActive: false,
            vAlignTopActive: false,
            vAlignMidActive: true,
            vAlignBotActive: false,

            // Font style button states
            fsBoldActive: false,
            fsItalicActive: false,
            fsUnderlineActive: false,

            // Font style values
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontDecoration: 'none',
            isBold: false,
            isItalic: false,
            isUnderline: false,

            // Halo properties
            fontHaloEnabled: false,
            fontHaloColor: 'rgba(255,255,255,1)',
            fontHaloSize: 1,
            fontHaloOpacity: 1,

            // TextSymbol object (used by the editor)
            currentTextSymbol: new TextSymbol({
                verticalAlignment: 'middle',
                font: {
                    family: 'Arial',
                    size: 12,
                    style: 'normal',
                    weight: 'normal',
                    decoration: 'none'
                },
                text: 'Text',
                color: new Color('rgba(0,0,0,1)'),
                haloColor: null,
                haloSize: 0,
                angle: 0
            }),

            // Restore prompt
            showLoadPrompt: false,
            hasExistingDrawings: false
        };

    }

    componentDidMount() {
        // Initialize components if consent is already granted (true)
        if (this.state.consentGranted === true && this.props.jimuMapView && this.props.graphicsLayer) {
            // Check for existing drawings first, but only if choice wasn't already made
            if (MyDrawingsPanel._drawingsLoadChoiceTimestamp > 0 || !this.checkExistingDrawings()) {
                // If choice was already made or no existing drawings, initialize normally
                this.initializeComponents();
            }
        }
    }

    componentDidUpdate(prevProps: MyDrawingsPanelProps, prevState: MyDrawingsPanelState) {
        // If consent changed from null to true, check for existing drawings first
        if (prevState.consentGranted === null && this.state.consentGranted === true) {
            if (this.props.jimuMapView && this.props.graphicsLayer) {
                // Check if choice was already made in this page session
                if (MyDrawingsPanel._drawingsLoadChoiceTimestamp > 0 || !this.checkExistingDrawings()) {
                    // If choice was already made or no existing drawings, initialize normally
                    this.initializeComponents();
                }
            }
        }

        // Check if the graphics layer or map view changed (only if consent is granted)
        if (this.state.consentGranted === true) {
            if (prevProps.graphicsLayer !== this.props.graphicsLayer && this.props.graphicsLayer) {
                // Remove previous watch handle if it exists
                if (this.state.graphicsWatchHandle) {
                    this.state.graphicsWatchHandle.remove();
                }

                this.setupGraphicsWatcher();
                this.refreshDrawingsFromLayer();
            }

            if (prevProps.jimuMapView !== this.props.jimuMapView && this.props.jimuMapView) {
                this.initializeComponents();
            }
        }

        // ✅ Enable or disable map popups based on tab activity
        if (prevProps.isActiveTab !== this.props.isActiveTab && this.props.jimuMapView?.view) {
            this.props.jimuMapView.view.popupEnabled = !this.props.isActiveTab;
        }
    }


    componentWillUnmount() {
        // Stop the map click sync process
        this._mapClickSyncEnabled = false;

        // Clean up measurement style watcher
        if (this._measurementStyleWatcher) {
            this._measurementStyleWatcher.remove();
            this._measurementStyleWatcher = null;
        }

        // Clean up watch handle
        if (this.state.graphicsWatchHandle) {
            this.state.graphicsWatchHandle.remove();
        }

        // Clean up position watchers
        if (this._positionWatchers) {
            Object.values(this._positionWatchers).forEach(watcher => {
                if (watcher) watcher.remove();
            });
            this._positionWatchers = {};
        }

        // Clean up graphics watch handles
        if (this._graphicsWatchHandles) {
            this._graphicsWatchHandles.forEach(handle => {
                if (handle) handle.remove();
            });
            this._graphicsWatchHandles = [];
        }

        // Clear any pending timeouts
        if (this._savePositionTimeout) {
            clearTimeout(this._savePositionTimeout);
            this._savePositionTimeout = null;
        }

        // Clean up AbortController for goTo operations
        if (this._goToController) {
            this._goToController.abort();
            this._goToController = null;
        }

        // Clean up SketchViewModel ONLY if we created it internally
        if (this.sketchViewModel && this.internalSketchVM) {
            this.sketchViewModel.destroy();
        }

        // ✅ Re-enable popups when unmounting the component
        if (this.props.jimuMapView?.view) {
            this.props.jimuMapView.view.popupEnabled = true;
        }
    }


    setupInteractionManager = () => {
        if (!this.props.jimuMapView?.view) return;

        try {
            // Store original quality setting
            const view = this.props.jimuMapView.view as any;
            if (view.qualityProfile !== undefined) {
                this._originalQuality = view.qualityProfile;
            }

            // More efficient interaction handling
            const startInteraction = () => {
                if (!this._isInteracting) {
                    this._isInteracting = true;

                    // Lower quality during interaction
                    if (view.qualityProfile !== undefined) {
                        view.qualityProfile = "low";
                    }

                    // Hide measurement graphics during interaction
                    if (this.props.graphicsLayer) {
                        this.props.graphicsLayer.graphics.forEach((g: __esri.Graphic) => {
                            if (g.attributes?.isMeasurementLabel || g.attributes?.hideDuringInteraction) {
                                g.visible = false;
                            }
                        });
                    }
                }
            };

            // Debounced end interaction with longer delay
            const endInteraction = this.debounce(() => {
                if (this._isInteracting) {
                    this._isInteracting = false;

                    // Restore original quality
                    if (view.qualityProfile !== undefined) {
                        view.qualityProfile = this._originalQuality;
                    }

                    // Show hidden graphics
                    if (this.props.graphicsLayer) {
                        this.props.graphicsLayer.graphics.forEach((g: __esri.Graphic) => {
                            if (g.attributes?.isMeasurementLabel || g.attributes?.hideDuringInteraction) {
                                g.visible = true;
                            }
                        });
                    }

                    // Force a refresh after a short delay
                    setTimeout(() => this.forceMapRefresh(), 250);
                }
            }, 300); // Longer debounce for smoother transitions

            // Register all interaction events
            this.props.jimuMapView.view.on("drag", startInteraction);
            this.props.jimuMapView.view.on("drag", ["end"], endInteraction);
            this.props.jimuMapView.view.on("mouse-wheel", startInteraction);
            this.props.jimuMapView.view.on("mouse-wheel", endInteraction);
            this.props.jimuMapView.view.on("key-down", (event) => {
                const navKeys = ["+", "-", "_", "=", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
                if (navKeys.includes(event.key)) {
                    startInteraction();
                }
            });
            this.props.jimuMapView.view.on("key-up", endInteraction);

        } catch (err) {
            console.warn("Could not setup interaction manager:", err);
        }
    };

    // Track when user starts interacting
    handleInteractionStart = () => {
        this._isInteracting = true;

        try {
            const view = this.props.jimuMapView?.view as any;

            // Lower rendering quality for smoother interaction
            if (view?.qualityProfile !== undefined) {
                view.qualityProfile = "low";
            }

            // Optionally hide graphics like labels during interaction
            if (this.props.graphicsLayer) {
                this.props.graphicsLayer.graphics.forEach((g: __esri.Graphic) => {
                    if (g.attributes?.isMeasurementLabel || g.attributes?.hideDuringInteraction) {
                        g.visible = false;
                    }
                });
            }
        } catch (err) {
            console.warn("Error in interaction start handler:", err);
        }
    };

    ensureUniqueName = (name: string): string => {
        if (!name) return `Drawing_${Date.now()}`;

        // Check if this name already exists in our drawings
        const lowerCaseName = name.toLowerCase();
        const existingNames = this.state.drawings.map(d =>
            (d.attributes?.name || '').toLowerCase()
        );

        // If name doesn't exist, return as is
        if (!existingNames.includes(lowerCaseName)) {
            return name;
        }

        // Add a counter to make name unique
        let counter = 1;
        let newName = `${name} (${counter})`;
        let lowerCaseNewName = newName.toLowerCase();

        // Keep incrementing counter until we find a unique name
        while (existingNames.includes(lowerCaseNewName)) {
            counter++;
            newName = `${name} (${counter})`;
            lowerCaseNewName = newName.toLowerCase();
        }

        return newName;
    };

    // Track when user stops interacting
    handleInteractionEnd = () => {
        this._isInteracting = false;

        try {
            const view = this.props.jimuMapView?.view as any;

            // Restore rendering quality
            if (view?.qualityProfile !== undefined && this._originalQuality) {
                view.qualityProfile = this._originalQuality;
            }

            // Restore hidden graphics
            if (this.props.graphicsLayer) {
                this.props.graphicsLayer.graphics.forEach((g: __esri.Graphic) => {
                    if (g.attributes?.isMeasurementLabel || g.attributes?.hideDuringInteraction) {
                        g.visible = true;
                    }
                });
            }

            const refresh = () => this.forceMapRefresh();

            // Defer refresh until idle or next frame
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(refresh);
            } else {
                requestAnimationFrame(refresh);
            }

        } catch (err) {
            console.warn("Error in interaction end handler:", err);
        }
    };




    refreshGraphicDisplay = (graphic: ExtendedGraphic) => {
        if (!graphic) return;

        try {
            // First try direct visibility toggle for this specific graphic
            this.ensureGraphicVisibility(graphic);

            // If we have a valid graphic index, update our internal state
            const uniqueId = graphic.attributes?.uniqueId;
            if (uniqueId && this._drawingMap.has(uniqueId)) {
                const index = this._drawingMap.get(uniqueId);
                if (index !== undefined) {
                    // Update state for this specific graphic
                    const updatedDrawings = [...this.state.drawings];
                    updatedDrawings[index] = graphic;

                    this.setState({ drawings: updatedDrawings });
                }
            }
        } catch (err) {
            console.error("Error refreshing graphic display:", err);

            // Fall back to the traditional refresh as a last resort
            // But don't do it if we're interacting to avoid excessive refreshes
            if (!this._isInteracting) {
                this.forceMapRefresh();
            }
        }
    };

    forceMapRefresh = () => {
        if (!this.props.jimuMapView?.view) return;

        try {
            // Abort any ongoing navigation
            if (this._goToController) {
                this._goToController.abort();
                this._goToController = null;
            }

            // Create a new controller
            const controller = new AbortController();
            this._goToController = controller;

            // Get current center and scale
            const view = this.props.jimuMapView.view;
            const currentCenter = view.center.clone();
            const currentScale = view.scale;

            // Option 1: Stationary refresh (no motion)
            view.goTo({
                target: currentCenter,
                scale: currentScale
            }, {
                animate: false,
                duration: 0,
                signal: controller.signal
            }).catch(err => {
                if (err.name !== 'AbortError' && err.name !== 'view:goto-interrupted') {
                    console.error('Map refresh error:', err);
                }
            });

            // Option 2: Alternative approach - use updateExtent
            // view.extent = view.extent.clone();

        } catch (err) {
            console.error("Error refreshing map:", err);
        }
    };


    ensureGraphicVisibility = (graphic: ExtendedGraphic) => {
        if (!graphic || !this.props.graphicsLayer) return;

        try {
            // Store original visibility
            const wasVisible = graphic.visible !== false;

            // Toggle visibility to force a redraw of just this graphic
            // This is much lighter than refreshing the whole map
            graphic.visible = false;

            // Use setTimeout instead of requestAnimationFrame for broader compatibility
            setTimeout(() => {
                if (graphic && !graphic.destroyed) {
                    // Restore original visibility
                    graphic.visible = wasVisible;
                }
            }, 0);
        } catch (err) {
            console.error("Error ensuring graphic visibility:", err);
        }
    };

    handleLoadExistingDrawings = () => {
        // Set a timestamp to mark that we've shown the prompt in this page session
        MyDrawingsPanel._drawingsLoadChoiceTimestamp = new Date().getTime();

        // console.log('User chose to load existing drawings - choice recorded for this page session');

        this.setState({ showLoadPrompt: false }, () => {
            // Load drawings from localStorage and initialize components
            this.loadFromLocalStorage();
            this.initializeComponents();
        });
    };

    handleStartFresh = () => {
        // Set a timestamp to mark that we've shown the prompt in this page session
        MyDrawingsPanel._drawingsLoadChoiceTimestamp = new Date().getTime();

        // console.log('User chose to delete all and start new - choice recorded for this page session');

        // Remove existing drawings from localStorage
        if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
            try {
                localStorage.removeItem(this.localStorageKey);
                // console.log(`Cleared existing drawings from localStorage key: ${this.localStorageKey}`); //
            } catch (err) {
                console.error(`Error clearing drawings from localStorage:`, err);
            }
        }

        // Initialize with empty drawing layer
        this.setState({
            showLoadPrompt: false,
            hasExistingDrawings: false
        }, this.initializeComponents);
    };

    // Call this in your initializeComponents method
    setupMapQualityManager = () => {
        if (!this.props.jimuMapView?.view) return;
        try {
            // Use type assertion or conditional check
            const view = this.props.jimuMapView.view as any; // Type assertion

            // Store original quality setting
            if (view.qualityProfile !== undefined) {
                this._originalQuality = view.qualityProfile;
            }

            // Rest of your code remains the same
            view.on("drag", ["start"], () => this.lowerMapQuality());
            view.on("drag", ["end"], () => this.restoreMapQuality());
            // etc...
        } catch (err) {
            console.warn("Could not setup map quality manager:", err);
        }
    };

    // Lower map quality during interactions to reduce texture warnings
    lowerMapQuality = () => {
        if (!this.props.jimuMapView?.view) return;
        try {
            // Type assertion approach
            const view = this.props.jimuMapView.view as any;

            // Lower quality during interaction
            if (view.qualityProfile !== undefined) {
                view.qualityProfile = "low";
            }
        } catch (err) {
            console.warn("Could not lower map quality:", err);
        }
    };

    restoreMapQuality = () => {
        if (!this.props.jimuMapView?.view) return;
        try {
            // Type assertion approach
            const view = this.props.jimuMapView.view as any;

            // Restore original quality
            if (view.qualityProfile !== undefined) {
                view.qualityProfile = this._originalQuality;
            }
        } catch (err) {
            console.warn("Could not restore map quality:", err);
        }
    };

    // Utility debounce function
    debounce = (func: Function, wait: number) => {
        let timeout: any;

        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    resetSessionChoice = () => {
        sessionStorage.removeItem('drawingsLoadChoiceMade');
        // console.log('Load choice session flag has been reset');
    };

    checkExistingDrawings = () => {
        const currentTime = new Date().getTime();

        // Get the current application session ID - this will be unique for each page load
        // but consistent during a single page session (even when switching tabs)
        const currentSessionId = window.location.href;

        // Check if we've shown this prompt recently in this specific page load
        // We track this with a timestamp attached to the unique app session
        if (MyDrawingsPanel._drawingsLoadChoiceTimestamp > 0) {
            // console.log('Load choice was already made in this page session - skipping prompt');
            return false;
        }

        if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
            try {
                // Get saved data without immediately loading it
                const savedData = localStorage.getItem(this.localStorageKey);

                if (savedData) {
                    const parsedData = JSON.parse(savedData);

                    // Check if we have valid data with drawings
                    if (Array.isArray(parsedData) && parsedData.length > 0) {
                        // We have existing drawings, so we should show the load prompt
                        this.setState({
                            hasExistingDrawings: true,
                            showLoadPrompt: true
                        });
                        // console.log(`Found ${parsedData.length} existing drawing(s) in localStorage - showing prompt`);
                        return true;
                    }
                }
            } catch (err) {
                console.error(`Error checking for existing drawings in localStorage:`, err);
            }
        }

        return false;
    };


    handleDrawingSelectAndScroll = (graphic: __esri.Graphic, index: number) => {
        try {
            // Cancel any active editing or navigation first
            if (this._goToController) {
                this._goToController.abort();
                this._goToController = null;
            }

            this.sketchViewModel?.cancel();

            // MODIFIED: Only update selectedGraphicIndex, preserve selectedGraphics
            this.setState({
                selectedGraphicIndex: index
                // Remove this line to preserve multiple selections
                // selectedGraphics: new Set([index])
            });

            // Find the list item
            const item = document.getElementById(`drawing-item-${index}`);

            // Immediately scroll the item into view with smooth behavior
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Defer the map highlight to ensure UI is responsive first
            setTimeout(() => {
                if (!this._isInteracting) {
                    this.highlightGraphic(graphic, index);
                    this.props.onDrawingSelect?.(graphic, index);
                }
            }, 100);

        } catch (err) {
            console.error('Error in handleDrawingSelectAndScroll:', err);
            this.showLocalAlert('Error selecting drawing from map', 'error');
        }
    };


    initializeComponents = () => {
        if (!this.props.jimuMapView || !this.props.graphicsLayer) return;

        // Create SketchViewModel - completely independent from widget.tsx
        this.sketchViewModel = new SketchViewModel({
            view: this.props.jimuMapView.view,
            layer: this.props.graphicsLayer
        });
        this.internalSketchVM = true;

        // Initialize the interaction manager to track user interactions
        this.setupInteractionManager();

        // Apply measurement label style fix
        this.fixMeasurementLabelStyles();

        // Setup graphics watcher
        this.setupGraphicsWatcher();

        // Initial refresh of drawings
        this.refreshDrawingsFromLayer();

        // Load from localStorage ONLY if allowed and consent granted
        if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
            this.loadFromLocalStorage();
        }

        // NEW APPROACH: Create a map of uniqueIds to indices for fast lookup
        const updateDrawingMap = () => {
            // Create a map of uniqueId -> index for quick lookups
            this._drawingMap.clear(); // Clear existing entries
            this.state.drawings.forEach((drawing, index) => {
                if (drawing.attributes?.uniqueId) {
                    this._drawingMap.set(drawing.attributes.uniqueId, index);
                }
            });
            // console.log("Drawing map updated with", this._drawingMap.size, "entries");
        };

        // Initial map creation
        updateDrawingMap();

        // FIXED: Instead of overriding the method with recursion, create a post-refresh callback
        this._afterRefreshDrawings = () => {
            // Update drawing map
            updateDrawingMap();

            // Force a map refresh to ensure graphics are visible
            this.forceMapRefresh();

            // console.log("Post-refresh processing complete");
        };

        // Schedule a sync verification check
        this.scheduleDrawingsSyncCheck();

        // CRITICAL FIX: Add event listener for SketchViewModel's update events
        // This ensures we update the UI when a drawing is selected via the SketchViewModel
        this.sketchViewModel.on("update", (event) => {
            // console.log("SketchViewModel update event:", event);

            if (event.state === "active" && event.graphics.length > 0) {
                const selectedGraphic = event.graphics[0];

                // Try to match by uniqueId
                if (selectedGraphic.attributes?.uniqueId) {
                    const uniqueId = selectedGraphic.attributes.uniqueId;

                    if (this._drawingMap.has(uniqueId)) {
                        const index = this._drawingMap.get(uniqueId);
                        if (index !== undefined) {
                            // console.log(`SketchVM selected drawing at index ${index}`);

                            // Update UI immediately for responsive feedback
                            document.querySelectorAll('.drawing-item').forEach(item => {
                                item.classList.remove('selected-drawing');
                            });

                            const item = document.getElementById(`drawing-item-${index}`);
                            if (item) {
                                item.classList.add('selected-drawing');
                                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }

                            // Update React state
                            this.setState({
                                selectedGraphicIndex: index,
                                selectedGraphics: new Set([index])
                            });

                            // Notify parent if needed
                            if (this.props.onDrawingSelect) {
                                this.props.onDrawingSelect(selectedGraphic, index);
                            }
                        }
                    }
                }
            }

            // FIXED: Add a check for "complete" state to detect when editing finishes
            if (event.state === "complete" && event.graphics.length > 0) {
                // console.log("SketchViewModel update complete - saving positions:", event);

                // When an update is completed, save the changes
                // Wait a brief moment to ensure the graphicsLayer is updated
                setTimeout(() => {
                    // Disable the watch event to prevent duplicate refreshes
                    this.ignoreNextGraphicsUpdate = true;

                    // Force a refresh of drawings from the layer to ensure we capture the latest positions
                    this.refreshDrawingsFromLayer();

                    // Explicitly save to localStorage after position update
                    if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                        this.saveToLocalStorage();
                        // console.log("Drawing positions updated and saved to localStorage");
                    }

                    // Force a map refresh to ensure all graphics are visible
                    this.forceMapRefresh();
                }, 50);
            }
        });

        // Add a watch for graphics collection changes to detect new drawings
        // This is TypeScript-safe compared to the "graphic-add" event
        const graphicsWatchHandle = this.props.graphicsLayer.graphics.watch("length", (newLength, oldLength) => {
            if (newLength > oldLength) {
                // console.log(`Graphics collection changed: ${oldLength} -> ${newLength}`);
                // Graphics were added, force a refresh
                setTimeout(() => {
                    this.forceMapRefresh();
                    // console.log("Map refreshed after new graphics added");
                }, 100);
            }
        });

        // Store the watch handle for cleanup in componentWillUnmount
        this._graphicsWatchHandles.push(graphicsWatchHandle);

        // Also listen to the "change" event on the graphics collection for more detail
        this.props.graphicsLayer.graphics.on("change", (event) => {
            if (event.added && event.added.length > 0) {
                // console.log("Graphics added event detected:", event.added.length);
                // When graphics are added, force a map refresh after a short delay
                setTimeout(() => {
                    this.forceMapRefresh();
                    // console.log("Map refreshed after graphics change event");
                }, 100);
            }
        });

        // IMPROVED map click handler with proper typing
        this.props.jimuMapView.view.on("click", async (event) => {
            if (this.state.consentGranted !== true) {
                this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
                return;
            }

            // console.log("Map clicked, looking for graphics...");

            try {
                const hitTestResult = await this.props.jimuMapView.view.hitTest(event);
                // console.log("Hit test results:", hitTestResult.results.length);

                // Cast the results array to allow for type narrowing
                const results = hitTestResult.results as any[];

                // Find graphics hits in our layer
                const graphicHits = results.filter(result =>
                    result &&
                    'graphic' in result &&
                    result.graphic &&
                    result.graphic.layer === this.props.graphicsLayer
                ) as GraphicHit[];

                // console.log("Graphics in our layer:", graphicHits.length);

                if (graphicHits.length > 0) {
                    const clickedGraphic = graphicHits[0].graphic;
                    // console.log("Clicked graphic:", clickedGraphic);
                    // console.log("Graphic attributes:", clickedGraphic.attributes);

                    // CRITICAL FIX: Update the graphic in SketchViewModel 
                    // This will trigger the SketchViewModel update event handler
                    if (this.sketchViewModel) {
                        // console.log("Updating SketchViewModel with clicked graphic");
                        this.sketchViewModel.cancel();
                        this.sketchViewModel.update([clickedGraphic]);
                    }

                    // Still try direct selection as a fallback
                    if (clickedGraphic.attributes?.uniqueId && this._drawingMap) {
                        const uniqueId = clickedGraphic.attributes.uniqueId;

                        if (this._drawingMap.has(uniqueId)) {
                            const index = this._drawingMap.get(uniqueId);
                            if (index !== undefined) {
                                // console.log(`Direct selection of drawing at index ${index}`);

                                // Update UI immediately
                                document.querySelectorAll('.drawing-item').forEach(item => {
                                    item.classList.remove('selected-drawing');
                                });

                                const item = document.getElementById(`drawing-item-${index}`);
                                if (item) {
                                    item.classList.add('selected-drawing');
                                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }

                                // Update state
                                this.setState({
                                    selectedGraphicIndex: index,
                                    selectedGraphics: new Set([index])
                                });

                                // Notify parent
                                if (this.props.onDrawingSelect) {
                                    this.props.onDrawingSelect(clickedGraphic, index);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Hit test error:", err);
            }
        });

        // Performance optimization: Set up the drawing map immediately
        this._drawingMap.clear();
        this.state.drawings.forEach((drawing, index) => {
            if (drawing.attributes?.uniqueId) {
                this._drawingMap.set(drawing.attributes.uniqueId, index);
            }
        });

        // FIXED: Post-refresh callback for cleanup and optimization
        this._afterRefreshDrawings = () => {
            // Update drawing map
            this._drawingMap.clear();
            this.state.drawings.forEach((drawing, index) => {
                if (drawing.attributes?.uniqueId) {
                    this._drawingMap.set(drawing.attributes.uniqueId, index);
                }
            });

            // Use lighter refresh method instead of forcing map refresh
            const shouldRefreshMap = this.state.drawings.length > 0 &&
                !this._isInteracting;

            if (shouldRefreshMap) {
                // Only do a full refresh if we have drawings and aren't interacting
                setTimeout(() => this.forceMapRefresh(), 100);
            }
        };

        // Performance optimization: Add some helpful tips to the console
        // console.log("Drawing panel fully initialized with performance optimizations");

        // CRITICAL FIX: Add event listener for SketchViewModel's update events
        // This ensures we update the UI when a drawing is selected via the SketchViewModel
        this.sketchViewModel.on("update", (event) => {
            // ... existing SketchViewModel update code ...

            // Add at the very end of the existing event handler:
            if (event.state === "complete") {
                // Force clear any AbortController to prevent stale references
                if (this._goToController) {
                    this._goToController.abort();
                    this._goToController = null;
                }
            }
        });

        // Start the background map click sync as a final safety net
        this.mapClickSync();
    };

    mapClickSync = () => {
        // Only run if enabled
        if (!this._mapClickSyncEnabled || !this.props.jimuMapView || !this.props.graphicsLayer) return;

        // Get currently selected graphics from the SketchViewModel
        const selectedGraphics = this.sketchViewModel?.updateGraphics?.toArray() || [];

        if (selectedGraphics.length > 0) {
            // Get the first selected graphic
            const selectedGraphic = selectedGraphics[0];

            if (selectedGraphic.attributes?.uniqueId) {
                const uniqueId = selectedGraphic.attributes.uniqueId;

                // Look up the index in our map
                if (this._drawingMap.has(uniqueId)) {
                    const index = this._drawingMap.get(uniqueId);

                    // Only update if selection has changed and index is defined
                    if (index !== undefined && this.state.selectedGraphicIndex !== index) {
                        // console.log(`Map sync found different selection: ${index}`);

                        // Update UI immediately
                        document.querySelectorAll('.drawing-item').forEach(item => {
                            item.classList.remove('selected-drawing');
                        });

                        const item = document.getElementById(`drawing-item-${index}`);
                        if (item) {
                            item.classList.add('selected-drawing');
                            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }

                        // Update state
                        this.setState({
                            selectedGraphicIndex: index
                            // MODIFIED: Remove this line to preserve multiple selections
                            // selectedGraphics: new Set([index])
                        });

                        // Notify parent
                        if (this.props.onDrawingSelect) {
                            this.props.onDrawingSelect(selectedGraphic, index);
                        }
                    }
                }
            }
        }

        // Schedule next sync
        setTimeout(this.mapClickSync, 500);
    };


    setupGraphicsWatcher = () => {
        if (!this.props.graphicsLayer) return;

        // Watch for changes to the graphics collection
        const watchHandle = this.props.graphicsLayer.graphics.on("change", (event) => {
            // Skip if we triggered this change ourselves
            if (this.ignoreNextGraphicsUpdate) {
                this.ignoreNextGraphicsUpdate = false;
                return;
            }

            // Refresh drawings from the layer
            this.refreshDrawingsFromLayer();
        });

        this.setState({ graphicsWatchHandle: watchHandle });
    }

    refreshDrawingsFromLayer = () => {
        if (!this.props.graphicsLayer) return;

        // Get all graphics from the layer
        const allGraphics = this.props.graphicsLayer.graphics.toArray();

        // Filter out measurement labels and hidden graphics
        const filteredGraphics = allGraphics.filter(g =>
            !g.attributes?.isMeasurementLabel &&
            !g.attributes?.hideFromList
        ) as ExtendedGraphic[];

        // Sort the graphics based on current sort option
        const sortedGraphics = this.sortGraphicsArray(filteredGraphics);

        // Update state with the new drawings
        this.setState({
            drawings: sortedGraphics,
            // Clear selection when drawings change
            selectedGraphics: new Set<number>(),
            symbolEditingIndex: null
        }, () => {
            // Log the current state of graphics
            // console.log(`RefreshDrawingsFromLayer: ${sortedGraphics.length} drawings in state, ${this.props.graphicsLayer.graphics.length} graphics in layer`);

            // Notify parent if needed
            if (this.props.onDrawingsUpdate) {
                this.props.onDrawingsUpdate(sortedGraphics);
            }

            // Save to local storage only if consent granted
            if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                this.saveToLocalStorage();
            }

            // Call the post-refresh function if defined
            if (typeof this._afterRefreshDrawings === 'function') {
                this._afterRefreshDrawings();
            }
        });
    };

    verifyDrawingsSync = () => {
        if (!this.props.graphicsLayer) return;

        // Count actual visible graphics (excluding measurement labels)
        const visibleGraphics = this.props.graphicsLayer.graphics.filter(g =>
            !g.attributes?.isMeasurementLabel &&
            !g.attributes?.hideFromList
        ).length;

        // Compare with drawings array
        if (visibleGraphics !== this.state.drawings.length) {
            console.warn(`Drawing sync issue detected: ${visibleGraphics} visible graphics vs ${this.state.drawings.length} drawings in state`);

            // Force refresh if mismatch detected
            this.forceMapRefresh();
        } else {
            // console.log(`Drawings sync verified: ${visibleGraphics} visible graphics match ${this.state.drawings.length} drawings in state`);
        }
    };

    scheduleDrawingsSyncCheck = () => {
        // Check sync 1 second after initialization
        setTimeout(() => {
            this.verifyDrawingsSync();

            // Additional check after 3 seconds to catch any lagging issues
            setTimeout(() => {
                this.verifyDrawingsSync();
            }, 3000);
        }, 1000);
    };

    sortGraphicsArray = (graphics: ExtendedGraphic[]) => {
        const { sortOption } = this.state;

        return [...graphics].sort((a, b) => {
            if (sortOption === 'name') {
                const nameA = (a.attributes?.name || '').toLowerCase();
                const nameB = (b.attributes?.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            } else if (sortOption === 'type') {
                const typeA = (a.attributes?.geometryType || a.geometry?.type || '').toLowerCase();
                const typeB = (b.attributes?.geometryType || b.geometry?.type || '').toLowerCase();
                return typeA.localeCompare(typeB);
            } else if (sortOption === 'created') {
                const createdA = a.attributes?.createdDate ? Number(a.attributes.createdDate) : 0;
                const createdB = b.attributes?.createdDate ? Number(b.attributes.createdDate) : 0;
                return createdB - createdA; // Newest first
            }
            return 0;
        });
    }

    handleConsentYes = () => {
        localStorage.setItem('drawingConsentGranted', 'true');
        this.setState({ consentGranted: true, showStorageDisclaimer: true });
    }

    handleDrawingSelect = (graphic: __esri.Graphic) => {
        if (!graphic || !graphic.geometry) return;

        // Cancel any active operations before starting a new one
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        // Normalize unsupported polyline symbol types to SimpleLineSymbol
        if (graphic.geometry.type === 'polyline' && graphic.symbol?.type !== 'simple-line') {
            const symbolColor = (graphic.symbol as any)?.color || [0, 0, 0, 1];
            const symbolWidth = (graphic.symbol as any)?.width || 2;
            const symbolStyle = (graphic.symbol as any)?.style || 'solid';

            graphic.symbol = new SimpleLineSymbol({
                color: symbolColor,
                width: symbolWidth,
                style: symbolStyle
            });
        }

        // Use our internal SketchVM to edit the graphic
        if (this.sketchViewModel) {
            this.sketchViewModel.update([graphic]);

            // Add watch for position changes on this specific graphic
            // This ensures we save positions even if the user drags via direct manipulation
            const graphicKey = graphic.attributes?.uniqueId || `temp_${Date.now()}`;

            // Remove any existing watch for this graphic if present
            if (this._positionWatchers && this._positionWatchers[graphicKey]) {
                this._positionWatchers[graphicKey].remove();
                delete this._positionWatchers[graphicKey];
            }

            // Initialize the position watchers object if it doesn't exist
            if (!this._positionWatchers) {
                this._positionWatchers = {};
            }

            // Add a new watch for this graphic's geometry
            this._positionWatchers[graphicKey] = graphic.watch('geometry', (newGeometry) => {
                // console.log(`Geometry changed for graphic ${graphicKey}`);

                // Debounce the save operation to avoid too many saves during dragging
                clearTimeout(this._savePositionTimeout);
                this._savePositionTimeout = setTimeout(() => {
                    // Manually trigger a save to localStorage
                    if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                        this.saveToLocalStorage();
                        // console.log(`Saved position change for graphic ${graphicKey}`);
                    }
                }, 500);
            });
        }
    };

    highlightGraphic = async (graphic: ExtendedGraphic, index: number) => {
        if (!graphic || !this.props.jimuMapView || this.state.consentGranted !== true) return;

        try {
            // 1. Properly abort any ongoing navigation FIRST
            if (this._goToController) {
                this._goToController.abort();
                this._goToController = null;
            }

            // 2. Cancel any active editing
            this.sketchViewModel?.cancel();

            // 3. Select the graphic immediately for UI feedback
            this.handleDrawingSelect(graphic);
            this.props.onDrawingSelect?.(graphic, index);

            // Skip navigation if no geometry
            if (!graphic.geometry) return;

            // Create a new abort controller for this navigation
            const controller = new AbortController();
            this._goToController = controller;

            // Build the zoom target
            let target = graphic.geometry;

            // For non-point geometries, find the center
            if (graphic.geometry.type !== 'point') {
                if ('centroid' in graphic.geometry) {
                    target = (graphic.geometry as any).centroid;
                } else if (graphic.geometry.extent?.center) {
                    target = graphic.geometry.extent.center;
                }
            }

            // Get appropriate zoom level based on geometry type and size
            let scale: number;

            if (graphic.geometry.extent) {
                // Calculate scale based on extent size (with padding)
                const extentWidth = graphic.geometry.extent.width;
                scale = extentWidth * 5; // Adjust multiplier as needed
                // Ensure reasonable min/max scale
                scale = Math.max(500, Math.min(50000, scale));
            } else {
                // Default scale for points or small features
                scale = 2000;
            }

            // Wait for the view to be ready
            await this.props.jimuMapView.view.when();

            // Execute the navigation with NO animation for instant response
            this.props.jimuMapView.view.goTo({
                target,
                scale
            }, {
                animate: false, // Disable animation for instant response
                duration: 0,    // Zero duration
                signal: controller.signal
            }).catch(err => {
                // Only log non-abort errors
                if (err.name !== 'AbortError' && err.name !== 'view:goto-interrupted') {
                    console.error('Navigation error:', err);
                }
            });

        } catch (error) {
            console.error('Error highlighting graphic:', error);
        }
    };

    handleConsentNo = () => {
        // Set localStorage value to 'false' to remember user's choice
        localStorage.setItem('drawingConsentGranted', 'false');

        // Delete any existing stored drawings
        localStorage.removeItem(this.localStorageKey);

        // Set state to false but don't close the panel, just show the permission denied UI
        this.setState({ consentGranted: false });
    }

    loadFromLocalStorage = () => {
        if (this.props.allowLocalStorage === false || this.state.consentGranted !== true) return;

        const storageKey = this.localStorageKey;
        // console.log(`Loading drawings from localStorage key: ${storageKey}`);

        const savedData = localStorage.getItem(storageKey);
        if (!savedData) {
            // console.log(`No saved drawings found for key: ${storageKey}`);
            return;
        }

        const runRestore = () => {
            try {
                const parsedData = JSON.parse(savedData);

                if (!Array.isArray(parsedData)) {
                    console.warn(`Invalid data format in localStorage for key: ${storageKey}`);
                    return;
                }

                if (this.props.graphicsLayer && this.props.graphicsLayer.graphics.length === 0) {
                    this.props.graphicsLayer.removeAll();
                    this.ignoreNextGraphicsUpdate = true;

                    let loadedCount = 0;

                    parsedData.forEach((item, index) => {
                        try {
                            const graphic = Graphic.fromJSON(item);

                            if (!graphic.attributes) {
                                graphic.attributes = {};
                            }

                            if (!graphic.attributes.uniqueId) {
                                graphic.attributes.uniqueId = `restored_${Date.now()}_${loadedCount}`;
                            }

                            this.props.graphicsLayer.add(graphic);
                            loadedCount++;
                        } catch (err) {
                            console.warn(`Error restoring graphic at index ${index} from localStorage:`, err);
                        }
                    });

                    if (loadedCount > 0) {
                        this.refreshDrawingsFromLayer();
                        // console.log(`Successfully loaded ${loadedCount} drawing(s) from key: ${storageKey}`);
                    } else {
                        // console.log(`No valid drawings loaded from key: ${storageKey}`);
                    }
                } else {
                    // console.log(`Graphics layer is not empty; skipping load from key: ${storageKey}`);
                }
            } catch (err) {
                console.error(`Error parsing drawings from localStorage key: ${storageKey}`, err);
                this.showLocalAlert('Error loading saved drawings', 'error');
            }
        };

        // Defer restore until idle if possible
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(runRestore);
        } else {
            setTimeout(runRestore, 0);
        }
    };


    saveToLocalStorage = () => {
        if (this.props.allowLocalStorage === false || this.state.consentGranted !== true) return;

        try {
            // Ensure we have the latest drawings from the graphics layer
            const currentGraphics = this.props.graphicsLayer.graphics.toArray();

            // Filter to keep only non-measurement, non-hidden graphics
            const filteredGraphics = currentGraphics.filter(g =>
                !g.attributes?.isMeasurementLabel &&
                !g.attributes?.hideFromList
            );

            // Prepare the current drawings for storage
            const graphicsToSave = filteredGraphics.map(graphic => {
                // Force full serialization of geometry with toJSON
                const json = graphic.toJSON();

                // Ensure each graphic has a uniqueId for tracking
                if (!json.attributes) {
                    json.attributes = {};
                }

                if (!json.attributes.uniqueId) {
                    const uniqueId = `restored_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                    json.attributes.uniqueId = uniqueId;
                }

                // Ensure createdDate exists
                if (!json.attributes.createdDate) {
                    json.attributes.createdDate = Date.now();
                }

                return json;
            });

            const storageKey = this.localStorageKey;

            // Save asynchronously when the browser is idle
            const saveFn = () => {
                try {
                    const stringified = JSON.stringify(graphicsToSave);
                    localStorage.setItem(storageKey, stringified);
                    // console.log(`Successfully saved ${graphicsToSave.length} drawing(s) to localStorage key: ${storageKey}`);
                } catch (stringifyError) {
                    console.error(`Failed to stringify graphics for localStorage key: ${storageKey}`, stringifyError);
                    this.showLocalAlert('Error saving drawings (stringify failed)', 'error');
                }
            };

            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(saveFn);
            } else {
                setTimeout(saveFn, 0);
            }

        } catch (err) {
            console.error(`Error preparing drawings for localStorage key: ${this.localStorageKey}`, err);
            this.showLocalAlert('Error saving drawings', 'error');
        }
    };


    showLocalAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
        // If parent provided a showAlert function, use it
        if (this.props.showAlert) {
            this.props.showAlert(message, type as 'success' | 'error' | 'info');
            return;
        }

        // Otherwise, use internal state
        this.setState({ alertMessage: message, alertType: type, showAlert: true });
        setTimeout(() => this.setState({ showAlert: false }), 3000);
    }

    updateSymbolWithoutClosing = (symbol: any, index: number) => {
        // Cancel any active SketchViewModel operation
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        const drawings = [...this.state.drawings];

        // Defensive check
        if (!drawings[index]) {
            console.warn(`Drawing not found at index ${index}`);
            return;
        }

        const originalGraphic = drawings[index];

        try {
            // Create a clone of the graphic to avoid modifying shared references
            const graphic = originalGraphic.clone();

            // Handle polyline: enforce SimpleLineSymbol
            if (graphic.geometry?.type === 'polyline') {
                if (!symbol || symbol.type !== 'simple-line') {
                    symbol = new SimpleLineSymbol({
                        color: symbol?.color || [0, 0, 0, 1],
                        width: symbol?.width || 2,
                        style: symbol?.style || 'solid'
                    });
                } else {
                    // Clone the symbol if it exists
                    symbol = symbol.clone();
                }
            } else {
                // For other types, ensure we're working with a clone
                if (symbol) {
                    symbol = symbol.clone();
                }
            }

            // Handle text: ensure TextSymbol has required props
            if (symbol?.type === 'text') {
                const textSymbol = symbol as TextSymbol;

                if (!textSymbol.color) {
                    textSymbol.color = new Color([0, 0, 0, 1]);
                }

                if (!textSymbol.font) {
                    textSymbol.font = new Font({ size: 12 });
                } else {
                    // Ensure required font fields exist with a new Font object
                    textSymbol.font = new Font({
                        family: textSymbol.font.family || 'Arial',
                        size: textSymbol.font.size || 12,
                        style: textSymbol.font.style || 'normal',
                        weight: textSymbol.font.weight || 'normal',
                        decoration: textSymbol.font.decoration || 'none'
                    });
                }

                if (!textSymbol.text) {
                    textSymbol.text = graphic.attributes?.name || 'Label';
                }

                symbol = textSymbol;
            }

            // Apply the symbol
            graphic.symbol = symbol;

            // Update the array in state
            drawings[index] = graphic;

            // Update the graphics layer without triggering a watch event
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update state and persist to localStorage
            this.setState({ drawings }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (err) {
            console.error('Error updating symbol:', err);
            this.showLocalAlert('Error updating symbol', 'error');
        }
    };


    isSupportedSymbol = (symbol: any, geometryType?: string): boolean => {
        if (!symbol) return false;

        // Always consider polylines as supported, regardless of symbol type
        if (geometryType === 'polyline') {
            return true; // Allow all polyline symbols
        }

        if (geometryType === 'point') {
            return symbol.type && ['simple-marker', 'picture-marker', 'text'].includes(symbol.type);
        }
        if (geometryType === 'polygon') {
            return symbol.type === 'simple-fill';
        }
        return false;
    };

    ensureMapViewReady = async () => {
        if (!this.props.jimuMapView?.view) return false;

        try {
            // Ensure view is ready
            await this.props.jimuMapView.view.when();

            // Also ensure layer view for graphics layer is ready
            if (this.props.graphicsLayer) {
                await this.props.jimuMapView.view.whenLayerView(this.props.graphicsLayer);
            }

            return true;
        } catch (err) {
            console.warn("Error ensuring map view ready:", err);
            return false;
        }
    };

    handleListItemClick = (graphic: ExtendedGraphic, index: number) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        // If already selected, do nothing (don't re-zoom or re-initialize symbol editor)
        if (this.state.selectedGraphicIndex === index) {
            return;
        }

        // Abort any ongoing navigation
        if (this._goToController) {
            this._goToController.abort();
            this._goToController = null;
        }

        // Cancel any active sketch editing
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        // MODIFIED: Only update selectedGraphicIndex, don't modify selectedGraphics
        this.setState({
            selectedGraphicIndex: index
            // Remove this line to preserve multiple selections
            // selectedGraphics: new Set([index])
        });

        // Initialize symbol editor state
        this.openSymbolEditor(index);

        // Delay highlight and selection handling to allow UI to reflect state
        requestAnimationFrame(() => {
            if (!this._isInteracting) {
                this.highlightGraphic(graphic, index);
            } else {
                this.handleDrawingSelect(graphic);
                this.props.onDrawingSelect?.(graphic, index);
            }
        });
    };



    // Methods for confirmation dialog handling
    openConfirmDialog = (message: string, type: 'delete' | 'clearAll', action: () => void, itemIndex: number = -1) => {
        this.setState({
            confirmDialogOpen: true,
            confirmDialogMessage: message,
            confirmDialogAction: action,
            confirmDialogType: type,
            confirmDialogItemIndex: itemIndex >= 0 ? itemIndex : null
        });
    }

    closeConfirmDialog = () => {
        this.setState({
            confirmDialogOpen: false,
            confirmDialogAction: null,
            confirmDialogItemIndex: null
        });
    }

    executeConfirmAction = () => {
        // Execute the stored action
        if (this.state.confirmDialogAction) {
            this.state.confirmDialogAction();
        }

        // Close the dialog
        this.closeConfirmDialog();
    }



    handleCopyDrawing = (index: number, event?: React.MouseEvent) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        // Stop event propagation if provided
        if (event) {
            event.stopPropagation();
        }

        try {
            // Get the graphic to copy
            const graphicToCopy = this.state.drawings[index];
            if (!graphicToCopy) return;

            // Clone the graphic
            const graphicJson = graphicToCopy.toJSON();
            const newGraphic = Graphic.fromJSON(graphicJson);

            // Modify attributes for the new copy
            if (!newGraphic.attributes) {
                newGraphic.attributes = {};
            }

            // Generate new uniqueId
            newGraphic.attributes.uniqueId = `copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Update the name to indicate it's a copy
            const originalName = graphicToCopy.attributes?.name || `Drawing ${index + 1}`;
            newGraphic.attributes.name = `Copy of ${originalName}`;

            // Update creation date to now
            newGraphic.attributes.createdDate = Date.now();

            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Add to the graphics layer
            this.props.graphicsLayer.add(newGraphic);

            // Silently refresh drawings from layer to update the UI
            // without showing any alert message
            this.refreshDrawingsFromLayer();

            // Just log to console instead of showing an alert
            // console.log('Drawing copied successfully');
        } catch (error) {
            console.error('Error copying graphic:', error);
            this.showLocalAlert('Error copying drawing', 'error');
        }
    }

    // Modified handleDeleteGraphic method
    handleDeleteGraphic = (index: number, event?: React.MouseEvent) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        // Stop event propagation if provided
        if (event) {
            event.stopPropagation();
        }

        // If confirmation is required, show the custom confirmation dialog
        if (this.props.confirmOnDelete !== false) {
            const deleteAction = () => {
                this.performDeleteGraphic(index);
            };

            this.openConfirmDialog(
                'Are you sure you want to delete this drawing?',
                'delete',
                deleteAction,
                index
            );
        } else {
            // If no confirmation needed, delete directly
            this.performDeleteGraphic(index);
        }
    }

    // New method that performs the actual deletion
    performDeleteGraphic = (index: number) => {
        // Get the graphic to delete
        const graphicToDelete = this.state.drawings[index];
        if (!graphicToDelete) return;

        try {
            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Remove from the graphics layer
            this.props.graphicsLayer.remove(graphicToDelete);

            // Update state manually for immediate feedback
            const updatedDrawings = [...this.state.drawings];
            updatedDrawings.splice(index, 1);

            // Update selected graphics: remove the deleted index and adjust higher indices
            const newSelected = new Set<number>();
            this.state.selectedGraphics.forEach(selectedIndex => {
                if (selectedIndex < index) {
                    newSelected.add(selectedIndex); // Keep lower indices as they are
                } else if (selectedIndex > index) {
                    newSelected.add(selectedIndex - 1); // Decrement higher indices
                }
                // The deleted index itself is not included
            });

            this.setState({
                drawings: updatedDrawings,
                selectedGraphicIndex: null,
                selectedGraphics: newSelected
            }, () => {
                // Save to localStorage if consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }

                // Notify parent if needed
                if (this.props.onDrawingsUpdate) {
                    this.props.onDrawingsUpdate(updatedDrawings);
                }
            });
        } catch (error) {
            console.error('Error deleting graphic:', error);
            this.showLocalAlert('Error deleting drawing', 'error');

            // Refresh from layer to ensure state is consistent
            this.refreshDrawingsFromLayer();
        }
    }

    // Add this method to your MyDrawingsPanel class
    fixMeasurementLabelStyles = () => {
        if (!this.props.graphicsLayer) return;

        // Create a method to observe the graphics collection
        const monitorGraphicsCollection = () => {
            // Use the collection's watch method on the 'length' property
            // This fires whenever graphics are added or removed
            const watcher = this.props.graphicsLayer.graphics.watch('length', () => {
                // Get all graphics in the collection
                const allGraphics = this.props.graphicsLayer.graphics.toArray();

                // Process each graphic
                allGraphics.forEach(graphic => {
                    // Only process measurement labels that haven't been fixed yet
                    if (graphic &&
                        graphic.attributes &&
                        graphic.attributes.isMeasurementLabel &&
                        graphic.symbol &&
                        graphic.symbol.type === 'text' &&
                        !graphic.attributes._styleFixed) {

                        // Store the text content
                        const labelText = graphic.symbol.text;

                        // Create a fresh text symbol for the measurement
                        const cleanSymbol = new TextSymbol({
                            text: labelText,
                            color: new Color([0, 0, 0, 1]),
                            haloColor: new Color([255, 255, 255, 1]),
                            haloSize: 2,
                            font: new Font({
                                family: "Arial",
                                size: 12,
                                weight: "normal",
                                style: "normal",
                                decoration: "none"
                            }),
                            horizontalAlignment: "center",
                            verticalAlignment: "middle"
                        });

                        // Replace the symbol
                        graphic.symbol = cleanSymbol;

                        // Mark this graphic as fixed so we don't process it again
                        if (!graphic.attributes) graphic.attributes = {};
                        graphic.attributes._styleFixed = true;

                        // console.log("Applied clean symbol to measurement label");
                    }
                });
            });

            // Store the watcher for cleanup
            this._measurementStyleWatcher = watcher;
        };

        // Start monitoring
        monitorGraphicsCollection();
        // console.log("Measurement label style fix applied");
    };

    // Modified handleClearAllClick method
    handleClearAllClick = () => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        // If confirmation is required, show the custom confirmation dialog
        if (this.props.confirmOnDelete !== false) {
            const clearAllAction = () => {
                this.performClearAll();
            };

            this.openConfirmDialog(
                'Are you sure you want to delete ALL drawings?',
                'clearAll',
                clearAllAction
            );
        } else {
            // If no confirmation needed, clear all directly
            this.performClearAll();
        }
    }

    // New method that performs the actual clear all operation
    performClearAll = () => {
        try {
            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Remove all graphics from the layer
            this.props.graphicsLayer.removeAll();

            // Update state
            this.setState({
                drawings: [],
                selectedGraphicIndex: null,
                selectedGraphics: new Set<number>(),
                symbolEditingIndex: null
            }, () => {
                // Save to localStorage if consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }

                // Notify parent if needed
                if (this.props.onDrawingsUpdate) {
                    this.props.onDrawingsUpdate([]);
                }
            });
        } catch (error) {
            console.error('Error clearing graphics:', error);
            this.showLocalAlert('Error clearing drawings', 'error');

            // Refresh from layer to ensure state is consistent
            this.refreshDrawingsFromLayer();
        }
    }

    // Methods for import dialog handling
    handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const content = evt.target?.result as string;

                // Validate it's JSON first before showing dialog
                JSON.parse(content); // This will throw if invalid

                // Store the file content in state and open the dialog
                this.setState({
                    importFile: file,
                    importFileContent: content,
                    importDialogOpen: true
                });
            } catch (err) {
                console.error('Error parsing JSON file:', err);
                this.showLocalAlert('Invalid file format', 'error');
                // Clear the file input
                e.target.value = '';
            }
        };

        reader.onerror = () => {
            this.showLocalAlert('Error reading file', 'error');
            // Clear the file input
            e.target.value = '';
        };

        reader.readAsText(file);

        // Clear the file input after reading starts
        e.target.value = '';
    }

    closeImportDialog = () => {
        this.setState({
            importDialogOpen: false,
            importFile: null,
            importFileContent: null
        });
    }

    // Handle replacing all existing drawings
    handleImportReplace = () => {
        this.processImport(true);
    }

    // Handle adding to existing drawings
    handleImportAdd = () => {
        this.processImport(false);
    }

    // Process the import with or without replacement
    processImport = (replace: boolean) => {
        const { importFileContent } = this.state;

        if (!importFileContent) {
            this.closeImportDialog();
            return;
        }

        try {
            const parsedContent = JSON.parse(importFileContent);

            // Check if we have valid data
            if (!Array.isArray(parsedContent)) {
                this.showLocalAlert('Invalid file format', 'error');
                this.closeImportDialog();
                return;
            }

            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Clear existing graphics if requested
            if (replace) {
                this.props.graphicsLayer.removeAll();
            }

            // Add each graphic to the layer
            let successCount = 0;
            let errorCount = 0;

            parsedContent.forEach((item, index) => {
                try {
                    const graphic = Graphic.fromJSON(item);

                    // Add required attributes
                    if (!graphic.attributes) {
                        graphic.attributes = {};
                    }

                    // Generate a truly unique ID for each imported graphic
                    // This ensures we don't get conflicts with existing graphics
                    const uniqueId = `imported_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 10)}`;
                    graphic.attributes.uniqueId = uniqueId;

                    // Ensure name exists and is unique
                    if (!graphic.attributes.name) {
                        const geometryType = graphic.geometry?.type || 'unknown';
                        graphic.attributes.name = `Imported ${geometryType} ${index + 1}`;
                    }

                    // Make sure the name is unique to avoid conflicts with existing drawings
                    if (!replace) {
                        graphic.attributes.name = this.ensureUniqueName(graphic.attributes.name);

                        // If this is a text symbol, also update the text value to match the new name
                        if (graphic.symbol && graphic.symbol.type === 'text') {
                            (graphic.symbol as any).text = graphic.attributes.name;
                        }
                    }

                    // Ensure createdDate exists
                    if (!graphic.attributes.createdDate) {
                        graphic.attributes.createdDate = Date.now();
                    }

                    // Add to the graphics layer
                    this.props.graphicsLayer.add(graphic);
                    successCount++;
                } catch (err) {
                    console.warn(`Error importing graphic at index ${index}:`, err);
                    errorCount++;
                }
            });

            // Refresh drawings from layer
            this.refreshDrawingsFromLayer();

            // Only log to console instead of showing a success message
            if (successCount > 0) {
                let message = `Successfully imported ${successCount} drawing(s)`;
                if (errorCount > 0) {
                    message += ` (${errorCount} error(s))`;
                }
                // console.log(message);
            } else {
                // Still show alert for complete failures
                this.showLocalAlert('No drawings could be imported', 'error');
            }
        } catch (err) {
            console.error('Error importing drawings:', err);
            this.showLocalAlert('Error importing file', 'error');
        }

        // Close the dialog
        this.closeImportDialog();
    }

    handleExport = () => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        if (this.state.drawings.length === 0) {
            this.showLocalAlert('No drawings to export', 'warning');
            return;
        }

        try {
            // Create JSON from the drawings
            const graphicsJson = this.state.drawings.map(graphic => graphic.toJSON());
            const jsonString = JSON.stringify(graphicsJson, null, 2);

            // Create a blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'myDrawings.json';
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            // No alert for successful export
            // console.log(`Successfully exported ${this.state.drawings.length} drawings`);
        } catch (err) {
            console.error('Error exporting drawings:', err);
            // Still show alert for errors
            this.showLocalAlert('Error exporting drawings', 'error');
        }
    }

    // Toggle selection for a specific drawing
    handleToggleSelect = (index: number, event: React.MouseEvent) => {
        // Stop propagation to prevent triggering the list item click
        event.stopPropagation();

        // Cancel any active SketchViewModel operation
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        const { selectedGraphics } = this.state;
        const newSelected = new Set(selectedGraphics);

        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }

        // Update the checkbox selection state
        this.setState({ selectedGraphics: newSelected });

        // ADDED: If this is the only selected item, also set it as the selectedGraphicIndex for editing
        if (newSelected.size === 1 && newSelected.has(index)) {
            this.setState({ selectedGraphicIndex: index });
        }
    };

    // Select/deselect all drawings
    handleToggleSelectAll = () => {
        const { drawings, selectedGraphics } = this.state;

        // If all are selected, clear the selection
        if (selectedGraphics.size === drawings.length) {
            this.setState({
                selectedGraphics: new Set<number>(),
                symbolEditingIndex: null
            });
        } else {
            // Otherwise, select all
            const allIndices = new Set<number>(drawings.map((_, index) => index));
            this.setState({ selectedGraphics: allIndices });
        }
    }

    // Export a single drawing
    handleExportSingle = (index: number, event: React.MouseEvent) => {
        // Stop propagation to prevent triggering the list item click
        event.stopPropagation();

        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        const graphic = this.state.drawings[index];
        if (!graphic) return;

        try {
            // Create JSON from the single drawing
            const graphicJson = graphic.toJSON();
            const jsonString = JSON.stringify([graphicJson], null, 2);

            // Create filename based on drawing name
            const fileName = graphic.attributes?.name
                ? `${graphic.attributes.name.replace(/\s+/g, '_')}.json`
                : `drawing_${index + 1}.json`;

            // Create a blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            // No alert for successful export
            // console.log(`Successfully exported drawing "${fileName}"`);
        } catch (err) {
            console.error('Error exporting drawing:', err);
            this.showLocalAlert('Error exporting drawing', 'error');
        }
    }

    // Export selected drawings
    handleExportSelected = () => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        const { drawings, selectedGraphics } = this.state;

        if (selectedGraphics.size === 0) {
            this.showLocalAlert('No drawings selected', 'warning');
            return;
        }

        try {
            // Create JSON from the selected drawings
            const selectedDrawings = Array.from(selectedGraphics).map(index => drawings[index]);
            const graphicsJson = selectedDrawings.map(graphic => graphic.toJSON());
            const jsonString = JSON.stringify(graphicsJson, null, 2);

            // Create a blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `selected_drawings_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            // No alert for successful export
            // console.log(`Successfully exported ${selectedGraphics.size} selected drawing(s)`);
        } catch (err) {
            console.error('Error exporting selected drawings:', err);
            this.showLocalAlert('Error exporting selected drawings', 'error');
        }
    }

    // Delete selected drawings
    handleDeleteSelected = () => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        const { selectedGraphics } = this.state;

        if (selectedGraphics.size === 0) {
            this.showLocalAlert('No drawings selected', 'warning');
            return;
        }

        // If confirmation is required, show custom dialog
        if (this.props.confirmOnDelete !== false) {
            const deleteAction = () => {
                this.performDeleteSelected();
            };

            this.openConfirmDialog(
                `Are you sure you want to delete ${selectedGraphics.size} selected drawing(s)?`,
                'delete',
                deleteAction
            );
        } else {
            // If no confirmation needed, delete directly
            this.performDeleteSelected();
        }
    }

    // Perform the deletion of selected drawings
    performDeleteSelected = () => {
        const { drawings, selectedGraphics } = this.state;

        if (selectedGraphics.size === 0) return;

        try {
            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Get selected graphics in descending index order (to avoid index shifting issues)
            const selectedIndices = Array.from(selectedGraphics).sort((a, b) => b - a);

            // Remove from the graphics layer
            for (const index of selectedIndices) {
                const graphic = drawings[index];
                if (graphic) {
                    this.props.graphicsLayer.remove(graphic);
                }
            }

            // Update state directly
            const updatedDrawings = drawings.filter((_, index) => !selectedGraphics.has(index));

            this.setState({
                drawings: updatedDrawings,
                selectedGraphics: new Set<number>(),
                symbolEditingIndex: null,
                selectedGraphicIndex: null
            }, () => {
                // Save to localStorage if consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }

                // Notify parent if needed
                if (this.props.onDrawingsUpdate) {
                    this.props.onDrawingsUpdate(updatedDrawings);
                }
            });
        } catch (error) {
            console.error('Error deleting selected graphics:', error);
            this.showLocalAlert('Error deleting selected drawings', 'error');

            // Refresh from layer to ensure state is consistent
            this.refreshDrawingsFromLayer();
        }
    }

    handleSortOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        const sortOption = e.target.value as 'name' | 'type' | 'created';

        this.setState({ sortOption }, () => {
            // Sort the current drawings
            const sortedDrawings = this.sortGraphicsArray(this.state.drawings);
            this.setState({ drawings: sortedDrawings });
        });
    }

    startEditing = (index: number, event?: React.MouseEvent) => {
        // Check consent
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        // Stop event propagation if provided
        if (event) {
            event.stopPropagation();
        }

        this.setState({ editingGraphicIndex: index });
    }

    handleNameChange = (index: number, newName: string) => {
        // Debugging: Log input value to see if spaces are present
        // console.log('handleNameChange received:', newName, 'contains spaces:', newName.includes(' '));

        // Check consent
        if (this.state.consentGranted !== true) return;

        const updatedDrawings = [...this.state.drawings];
        const graphic = updatedDrawings[index];

        if (!graphic) return;

        // Ensure attributes object
        if (!graphic.attributes) {
            graphic.attributes = {};
        }

        // Update name attribute - add more debugging
        graphic.attributes.name = newName;
        // console.log('Set attributes.name to:', graphic.attributes.name);

        // If it's a text symbol, update the text content
        if (graphic.symbol?.type === 'text') {
            const textSymbol = graphic.symbol as TextSymbol;
            textSymbol.text = newName;
            // console.log('Updated text symbol to:', textSymbol.text);
        }

        // Optional: reapply the graphic to the layer to reflect name change
        this.ignoreNextGraphicsUpdate = true;
        this.props.graphicsLayer.remove(graphic);
        this.props.graphicsLayer.add(graphic);

        // Update state and persist
        this.setState({ drawings: updatedDrawings }, () => {
            // Confirm value in the updated state
            const confirmedValue = this.state.drawings[index]?.attributes?.name;
            // console.log('Name in state after update:', confirmedValue);

            if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                this.saveToLocalStorage();
            }
        });
    };


    saveNameEdit = () => {
        // Check consent
        if (this.state.consentGranted !== true || this.state.editingGraphicIndex === null) {
            if (this.state.consentGranted !== true) {
                this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            }
            return;
        }

        try {
            // Get the updated graphic
            const graphic = this.state.drawings[this.state.editingGraphicIndex];
            if (!graphic) return;

            // Mark that we're about to update the graphics layer
            this.ignoreNextGraphicsUpdate = true;

            // Update the graphic in the layer (remove and re-add to ensure update)
            this.props.graphicsLayer.remove(graphic);
            this.props.graphicsLayer.add(graphic);

            // Exit editing mode
            this.setState({ editingGraphicIndex: null }, () => {
                // Save to localStorage if consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });

            // Don't show alert - silently update
            // this.showLocalAlert('Name updated', 'success');
        } catch (error) {
            console.error('Error saving name edit:', error);

            // We'll still show an error if something goes wrong
            this.showLocalAlert('Error updating name', 'error');

            // Exit editing mode
            this.setState({ editingGraphicIndex: null });
        }
    }

    cancelNameEdit = () => {
        this.setState({ editingGraphicIndex: null });
    }

    getDrawingTypeLabel = (graphic: ExtendedGraphic): string => {
        // Try to get the draw mode from attributes
        let drawMode = graphic.attributes?.drawMode;

        // If not found, try to get geometry type
        if (!drawMode) {
            const geomTypeAttr = graphic.attributes?.geometryType;

            if (['circle', 'rectangle', 'text'].includes(geomTypeAttr)) {
                drawMode = geomTypeAttr;
            }
            // Check if it's a text symbol
            else if (
                graphic.geometry?.type === 'point' &&
                graphic.symbol?.type === 'text'
            ) {
                drawMode = 'text';
            }
            // Otherwise, determine from geometry
            else {
                drawMode = graphic.geometry?.type;
            }
        }

        // Convert technical names to user-friendly labels
        switch (drawMode) {
            case 'point':
                return 'Point';
            case 'polyline':
                return 'Line';
            case 'polygon':
                return 'Polygon';
            case 'rectangle':
            case 'extent':
                return 'Rectangle';
            case 'circle':
                return 'Circle';
            case 'text':
                return 'Text';
            default:
                return drawMode?.charAt(0).toUpperCase() + drawMode?.slice(1) || 'Unknown';
        }
    }

    formatCreatedDate = (dateValue: number | string): string => {
        if (!dateValue) return '';

        const date = new Date(Number(dateValue));
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    openSymbolEditor = (index: number, event?: React.MouseEvent | React.KeyboardEvent) => {
        if (this.state.consentGranted !== true) {
            this.showLocalAlert('My Drawings feature requires local storage permission', 'warning');
            return;
        }

        if (event) event.stopPropagation();

        const graphic = this.state.drawings[index];
        if (!graphic) {
            console.warn(`No drawing found at index ${index}`);
            return;
        }

        // Cancel the current SketchViewModel operation before changing the graphic in state
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        // Specifically for text symbols, initialize additional text editing state
        if (graphic.symbol?.type === 'text') {
            const textSymbol = graphic.symbol as __esri.TextSymbol;
            // Get symbol color as rgba string for the color picker
            const symbolColor = textSymbol.color ?
                this.convertColorToRgba(textSymbol.color) : 'rgba(0,0,0,1)';

            // Get halo color and settings
            const haloEnabled = textSymbol.haloSize !== null && textSymbol.haloSize > 0;
            const haloColor = textSymbol.haloColor ?
                this.convertColorToRgba(textSymbol.haloColor) : 'rgba(255,255,255,1)';
            const haloSize = textSymbol.haloSize || 1;

            // Get text alignment states
            const horizontalAlignment = textSymbol.horizontalAlignment || 'center';
            const verticalAlignment = textSymbol.verticalAlignment || 'middle';

            // Get font style settings - ensure we're getting the correct values
            const fontWeight = textSymbol.font?.weight || 'normal';
            const fontStyle = textSymbol.font?.style || 'normal';
            const fontDecoration = textSymbol.font?.decoration || 'none';
            const fontSize = textSymbol.font?.size || 12;
            const fontRotation = textSymbol.angle || 0;

            // Check if styling is active - be very explicit to ensure we set correct states
            const isBold = fontWeight === 'bold';
            const isItalic = fontStyle === 'italic';
            const isUnderline = fontDecoration === 'underline';

            // console.log('Opening style editor with font settings:', {
            //     fontWeight, fontStyle, fontDecoration,
            //     isBold, isItalic, isUnderline
            // });


            // Update state with all text properties
            this.setState({
                symbolEditingIndex: index,
                textValue: textSymbol.text || '',
                // Text properties
                fontColor: symbolColor,
                fontSize: fontSize,
                fontFamily: textSymbol.font?.family || 'Arial',
                fontRotation: fontRotation,
                // Opacity values (from alpha channel)
                fontOpacity: textSymbol.color?.a || 1,
                // Halo settings
                fontHaloEnabled: haloEnabled,
                fontHaloColor: haloColor,
                fontHaloSize: haloSize,
                fontHaloOpacity: textSymbol.haloColor?.a || 1,
                // Alignment settings
                horizontalAlignment: horizontalAlignment,
                verticalAlignment: verticalAlignment,
                // Font style settings
                fontWeight: fontWeight,
                fontStyle: fontStyle,
                fontDecoration: fontDecoration,
                // Button active states - be very explicit
                hAlignLeftActive: horizontalAlignment === 'left',
                hAlignCenterActive: horizontalAlignment === 'center',
                hAlignRightActive: horizontalAlignment === 'right',
                vAlignBaseActive: verticalAlignment === 'baseline',
                vAlignTopActive: verticalAlignment === 'top',
                vAlignMidActive: verticalAlignment === 'middle',
                vAlignBotActive: verticalAlignment === 'bottom',
                fsBoldActive: isBold,
                fsItalicActive: isItalic,
                fsUnderlineActive: isUnderline,
                // Also add these boolean state values for the actual styling
                isBold: isBold,
                isItalic: isItalic,
                isUnderline: isUnderline
            });
        } else {
            // For non-text symbols, just open the standard symbol editor
            this.setState({
                symbolEditingIndex: index,
                textValue: ''
            });
        }
    };

    applyTextChangesExplicitly = (index: number) => {
        const graphic = this.state.drawings[index];
        if (!graphic || !graphic.symbol || graphic.symbol.type !== 'text') return;

        try {
            // Clone the original symbol
            const originalSymbol = graphic.symbol as __esri.TextSymbol;
            const textSymbol = originalSymbol.clone();

            // Clone and apply font settings
            const currentFont = textSymbol.font?.clone() || new Font();
            currentFont.family = this.state.fontFamily || 'Arial';
            currentFont.size = this.state.fontSize || 12;
            currentFont.weight = this.state.isBold ? 'bold' : 'normal';
            currentFont.style = this.state.isItalic ? 'italic' : 'normal';
            currentFont.decoration = this.state.isUnderline ? 'underline' : 'none';
            textSymbol.font = currentFont;

            // Update other text properties
            textSymbol.text = this.state.textValue;
            textSymbol.color = this.hexToRgba(
                this.rgbaToHex(this.state.fontColor),
                this.state.fontOpacity
            );
            textSymbol.horizontalAlignment = this.state.horizontalAlignment || 'center';
            textSymbol.verticalAlignment = this.state.verticalAlignment || 'middle';
            textSymbol.angle = this.state.fontRotation ?? 0;

            // Halo settings
            if (this.state.fontHaloEnabled) {
                textSymbol.haloSize = this.state.fontHaloSize;
                textSymbol.haloColor = this.hexToRgba(
                    this.rgbaToHex(this.state.fontHaloColor),
                    this.state.fontHaloOpacity
                );
            } else {
                textSymbol.haloSize = 0;
                textSymbol.haloColor = null;
            }

            // Clone and update the graphic
            const updatedGraphic = graphic.clone();
            updatedGraphic.symbol = textSymbol;

            // Replace graphic in layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(graphic);

            setTimeout(() => {
                this.props.graphicsLayer.add(updatedGraphic);

                // Nudge the view to force refresh
                if (this.props.jimuMapView?.view) {
                    const currentCenter = this.props.jimuMapView.view.center.clone();
                    this.props.jimuMapView.view.goTo(currentCenter, { duration: 0 });
                }

                // Re-enable editing
                if (this.sketchViewModel?.updateGraphics) {
                    this.sketchViewModel.cancel();
                    setTimeout(() => {
                        this.sketchViewModel.update([updatedGraphic]);
                    }, 50);
                }

                // Persist to local storage
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }

                // Clear editor state and close style editor
                this.setState({
                    symbolEditingIndex: null,
                    selectedGraphicIndex: null,
                    selectedGraphics: new Set()
                });

                // console.log('Changes applied successfully, map updated, and editor closed');
            }, 50);
        } catch (error) {
            console.error('Error applying text changes:', error);
            this.showLocalAlert('Error applying changes', 'error');
            this.setState({
                symbolEditingIndex: null,
                selectedGraphicIndex: null,
                selectedGraphics: new Set()
            });
        }
    };


    // Helper method to convert ArcGIS Color to RGBA string
    convertColorToRgba = (color: __esri.Color): string => {
        if (!color) return 'rgba(0,0,0,1)';

        // Use toRgba() if available
        if (typeof color.toRgba === 'function') {
            const rgba = color.toRgba();
            return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        }

        // Fallback in case toRgba is not available
        return `rgba(${color.r || 0},${color.g || 0},${color.b || 0},${color.a || 1})`;
    };

    // Convert rgba string to hex color
    rgbaToHex = (rgba) => {
        // Handle potential errors with rgba format
        if (!rgba || typeof rgba !== 'string') {
            return '#000000'; // Default to black
        }

        // Extract RGBA values
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) {
            return '#000000'; // Default to black if format doesn't match
        }

        // Convert to hex
        const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3], 10).toString(16).padStart(2, '0');

        return `#${r}${g}${b}`;
    };

    // Convert hex color to rgba
    hexToRgba = (hex, alpha = 1) => {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Create RGBA color object
        return new Color([r, g, b, alpha]);
    };


    applyTextChanges = (originalGraphic: ExtendedGraphic) => {
        if (!originalGraphic || !this.props.graphicsLayer) return;

        try {
            // Create a clone of the graphic to avoid modifying shared references
            const graphic = originalGraphic.clone();

            // Apply the changes immediately to the map
            this.ignoreNextGraphicsUpdate = true;

            // First remove and then re-add the graphic to ensure the changes are visible
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // If we're in edit mode with SketchViewModel, update it too
            if (this.sketchViewModel && this.sketchViewModel.updateGraphics) {
                const isBeingEdited = this.sketchViewModel.updateGraphics.some(g =>
                    g.attributes?.uniqueId === graphic.attributes?.uniqueId
                );

                if (isBeingEdited) {
                    // Cancel current edit operation and restart with updated graphic
                    this.sketchViewModel.cancel();
                    this.sketchViewModel.update([graphic]);
                }
            }

            return graphic; // Return the new graphic for potential further use
        } catch (error) {
            console.error('Error applying text changes:', error);
            this.showLocalAlert('Error updating text', 'error');
            return null;
        }
    };

    // Update each method to call applyTextChanges after modifying the text symbol

    updateTextValue = (value: string, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Update the text symbol and attributes
            textSymbol.text = value;

            if (!graphic.attributes) {
                graphic.attributes = {};
            }
            graphic.attributes.name = value;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update component state and persist
            this.setState({ drawings, textValue: value }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating text value:', error);
            this.showLocalAlert('Error updating text', 'error');
        }
    };

    updateFontSize = (size: number, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Create a new Font object with updated size
            const font = textSymbol.font ? textSymbol.font.clone() : new Font({});
            font.size = size;

            // Assign the new font to the symbol
            textSymbol.font = font;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state and persist
            this.setState({
                drawings,
                fontSize: size
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font size:', error);
            this.showLocalAlert('Error updating text size', 'error');
        }
    };


    updateFontFamily = (family: string, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Create a new Font object with updated family
            const font = textSymbol.font ? textSymbol.font.clone() : new Font({});
            font.family = family;

            // Assign the new font to the symbol
            textSymbol.font = font;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state and persist
            this.setState({
                drawings,
                fontFamily: family
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font family:', error);
            this.showLocalAlert('Error updating text font', 'error');
        }
    };

    updateFontColor = (color: any, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Create a new Color object to ensure no shared references
            textSymbol.color = color.clone ? color.clone() : new Color(color.toRgba ? color.toRgba() : color);

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Convert the color to rgba string for state
            const rgba = `rgba(${color.r},${color.g},${color.b},${color.a})`;

            // Update state and persist
            this.setState({
                drawings,
                fontColor: rgba,
                fontOpacity: color.a || 1
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font color:', error);
            this.showLocalAlert('Error updating text color', 'error');
        }
    };

    updateFontOpacity = (opacity: number, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Update opacity while preserving color
            if (textSymbol.color) {
                // Create a new Color object with the updated opacity
                const rgbaValues = textSymbol.color.toRgba ? textSymbol.color.toRgba() : [0, 0, 0, opacity];
                rgbaValues[3] = opacity; // Set alpha value
                textSymbol.color = new Color(rgbaValues);
            }

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Convert color for state
            const rgba = textSymbol.color ?
                `rgba(${textSymbol.color.r},${textSymbol.color.g},${textSymbol.color.b},${opacity})` :
                `rgba(0,0,0,${opacity})`;

            // Update state and persist
            this.setState({
                drawings,
                fontOpacity: opacity,
                fontColor: rgba
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font opacity:', error);
            this.showLocalAlert('Error updating text opacity', 'error');
        }
    };

    updateFontRotation = (rotation: number, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Update rotation
            textSymbol.angle = rotation;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state and persist
            this.setState({
                drawings,
                fontRotation: rotation
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font rotation:', error);
            this.showLocalAlert('Error updating text rotation', 'error');
        }
    };

    // Font style methods (bold, italic, underline)
    toggleFontStyle = (styleType: 'bold' | 'italic' | 'underline', index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];

        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Create a new Font object to avoid modifying shared references
            const font = textSymbol.font ? textSymbol.font.clone() : new Font({});

            // Update the font style based on the styleType
            switch (styleType) {
                case 'bold':
                    const isBold = font.weight !== 'bold';
                    font.weight = isBold ? 'bold' : 'normal';
                    this.setState({
                        fsBoldActive: isBold,
                        isBold: isBold
                    });
                    break;
                case 'italic':
                    const isItalic = font.style !== 'italic';
                    font.style = isItalic ? 'italic' : 'normal';
                    this.setState({
                        fsItalicActive: isItalic,
                        isItalic: isItalic
                    });
                    break;
                case 'underline':
                    const isUnderline = font.decoration !== 'underline';
                    font.decoration = isUnderline ? 'underline' : 'none';
                    this.setState({
                        fsUnderlineActive: isUnderline,
                        isUnderline: isUnderline
                    });
                    break;
            }

            // Assign the new font to the symbol
            textSymbol.font = font;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state and persist
            this.setState({ drawings }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating font style:', error);
            this.showLocalAlert('Error updating text style', 'error');
        }
    };

    // Horizontal alignment method
    updateHorizontalAlignment = (alignment: 'left' | 'center' | 'right', index: number) => {
        // console.log(`Updating horizontal alignment to ${alignment} for drawing at index ${index}`);

        // Validate inputs
        if (index === undefined || index === null) {
            console.error('Invalid index provided to updateHorizontalAlignment');
            return;
        }

        // Get a copy of the drawings array
        const drawings = [...this.state.drawings];

        // Check if the graphic exists at the given index
        if (!drawings[index]) {
            console.error(`No drawing found at index ${index}`);
            return;
        }

        const originalGraphic = drawings[index];

        // Validate the graphic has a text symbol
        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') {
            console.error('Cannot update horizontal alignment: graphic has no text symbol');
            return;
        }

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Log current state before changes
            // console.log('Current symbol state:', {
            //     horizontalAlignment: textSymbol.horizontalAlignment,
            //     text: textSymbol.text,
            //     hasSymbol: !!textSymbol
            // });


            // Update horizontal alignment
            textSymbol.horizontalAlignment = alignment;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state with new alignment and button states
            this.setState({
                drawings,
                horizontalAlignment: alignment,
                hAlignLeftActive: alignment === 'left',
                hAlignCenterActive: alignment === 'center',
                hAlignRightActive: alignment === 'right'
            }, () => {
                // Log updated state
                // console.log('Horizontal alignment updated successfully:', {
                //     alignment,
                //     buttonStates: {
                //         left: this.state.hAlignLeftActive,
                //         center: this.state.hAlignCenterActive,
                //         right: this.state.hAlignRightActive
                //     }
                // });


                // Save to localStorage if enabled and consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating horizontal alignment:', error);
            this.showLocalAlert('Error updating text alignment', 'error');
        }
    };

    // Vertical alignment method
    updateVerticalAlignment = (alignment: 'baseline' | 'top' | 'middle' | 'bottom', index: number) => {
        console.log(`Updating vertical alignment to ${alignment} for drawing at index ${index}`);

        // Validate inputs
        if (index === undefined || index === null) {
            console.error('Invalid index provided to updateVerticalAlignment');
            return;
        }

        // Get a copy of the drawings array
        const drawings = [...this.state.drawings];

        // Check if the graphic exists at the given index
        if (!drawings[index]) {
            console.error(`No drawing found at index ${index}`);
            return;
        }

        const originalGraphic = drawings[index];

        // Validate the graphic has a text symbol
        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') {
            console.error('Cannot update vertical alignment: graphic has no text symbol');
            return;
        }

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Log current state before changes
            // console.log('Current symbol state:', {
            //     verticalAlignment: textSymbol.verticalAlignment,
            //     text: textSymbol.text,
            //     hasSymbol: !!textSymbol
            // });


            // Update vertical alignment
            textSymbol.verticalAlignment = alignment;

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state with new alignment and button states
            this.setState({
                drawings,
                verticalAlignment: alignment,
                vAlignBaseActive: alignment === 'baseline',
                vAlignTopActive: alignment === 'top',
                vAlignMidActive: alignment === 'middle',
                vAlignBotActive: alignment === 'bottom'
            }, () => {
                /*
                    // Log updated state
                    console.log('Vertical alignment updated successfully:', {
                        alignment,
                        buttonStates: {
                            baseline: this.state.vAlignBaseActive,
                            top: this.state.vAlignTopActive,
                            middle: this.state.vAlignMidActive,
                            bottom: this.state.vAlignBotActive
                        }
                    });
                */


                // Save to localStorage if enabled and consent granted
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating vertical alignment:', error);
            this.showLocalAlert('Error updating text alignment', 'error');
        }
    };

    // Halo methods
    toggleHaloEnabled = (enabled: boolean, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];
        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            if (enabled) {
                // Enable halo with default values if not set
                textSymbol.haloSize = this.state.fontHaloSize || 1;

                // Create a new Color object for halo
                const haloColor = this.state.fontHaloColor || 'rgba(255,255,255,1)';
                const colorMatch = haloColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

                if (colorMatch) {
                    const r = parseInt(colorMatch[1], 10);
                    const g = parseInt(colorMatch[2], 10);
                    const b = parseInt(colorMatch[3], 10);
                    const a = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;
                    textSymbol.haloColor = new Color([r, g, b, a]);
                } else {
                    textSymbol.haloColor = new Color([255, 255, 255, 1]);
                }
            } else {
                // Disable halo
                textSymbol.haloSize = 0;
                textSymbol.haloColor = null;
            }

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Update state and persist - remove fontHalo since it's not in your state interface
            this.setState({
                drawings,
                fontHaloEnabled: enabled
                // Remove fontHalo property since it's not in your state type
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error toggling halo:', error);
            this.showLocalAlert('Error updating text halo', 'error');
        }
    };

    updateHaloSize = (size: number, index: number) => {
        const drawings = [...this.state.drawings];
        const graphic = drawings[index];

        if (!graphic || !graphic.symbol || graphic.symbol.type !== 'text') return;

        const textSymbol = graphic.symbol as __esri.TextSymbol;

        // Update halo size
        textSymbol.haloSize = size;

        // Ensure halo color is set if size is set
        if (size > 0 && !textSymbol.haloColor) {
            textSymbol.haloColor = new Color([255, 255, 255, 1]);
        }

        // Apply changes immediately
        this.applyTextChanges(graphic);

        // Update state
        this.setState({
            drawings,
            fontHaloSize: size,
            fontHaloEnabled: size > 0
        }, () => {
            if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                this.saveToLocalStorage();
            }
        });
    };

    updateHaloColor = (color: any, index: number) => {
        const drawings = [...this.state.drawings];
        const graphic = drawings[index];

        if (!graphic || !graphic.symbol || graphic.symbol.type !== 'text') return;

        const textSymbol = graphic.symbol as __esri.TextSymbol;

        // Update halo color
        textSymbol.haloColor = color;

        // Ensure halo size is set if color is set
        if (!textSymbol.haloSize || textSymbol.haloSize <= 0) {
            textSymbol.haloSize = 1;
        }

        // Apply changes immediately
        this.applyTextChanges(graphic);

        // Convert color for state
        const rgba = `rgba(${color.r},${color.g},${color.b},${color.a})`;

        // Update state
        this.setState({
            drawings,
            fontHaloColor: rgba,
            fontHaloOpacity: color.a || 1,
            fontHaloEnabled: true
        }, () => {
            if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                this.saveToLocalStorage();
            }
        });
    };

    updateHaloOpacity = (opacity: number, index: number) => {
        const drawings = [...this.state.drawings];
        const originalGraphic = drawings[index];
        if (!originalGraphic || !originalGraphic.symbol || originalGraphic.symbol.type !== 'text') return;

        try {
            // Clone the graphic and symbol
            const graphic = originalGraphic.clone();
            const textSymbol = graphic.symbol.clone() as __esri.TextSymbol;

            // Update opacity while preserving halo color
            if (textSymbol.haloColor) {
                // Create a new Color object with the updated opacity
                const rgbaValues = textSymbol.haloColor.toRgba ? textSymbol.haloColor.toRgba() : [255, 255, 255, opacity];
                rgbaValues[3] = opacity; // Set alpha value
                textSymbol.haloColor = new Color(rgbaValues);
            } else if (this.state.fontHaloEnabled) {
                // Create a new halo color if not present but enabled
                textSymbol.haloColor = new Color([255, 255, 255, opacity]);
            }

            // Apply the updated symbol to the graphic
            graphic.symbol = textSymbol;

            // Update in the layer
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update in state
            drawings[index] = graphic;

            // Convert color for state
            const rgba = textSymbol.haloColor ?
                `rgba(${textSymbol.haloColor.r},${textSymbol.haloColor.g},${textSymbol.haloColor.b},${opacity})` :
                `rgba(255,255,255,${opacity})`;

            // Update state and persist - removed fontHalo property to fix TypeScript error
            this.setState({
                drawings,
                fontHaloOpacity: opacity,
                fontHaloColor: rgba
                // Removed fontHalo property which is causing TS error
            }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Error updating halo opacity:', error);
            this.showLocalAlert('Error updating text halo opacity', 'error');
        }
    };

    closeSymbolEditor = () => {
        this.setState({ symbolEditingIndex: null });
    };

    updateSymbol = (symbol: any, index: number) => {
        // Cancel any active SketchViewModel operation
        if (this.sketchViewModel) {
            this.sketchViewModel.cancel();
        }

        const drawings = [...this.state.drawings];

        // Validate drawing index
        if (!drawings[index]) {
            console.warn(`No drawing found at index ${index} in updateSymbol`);
            return;
        }

        const originalGraphic = drawings[index];

        try {
            // Create a clone of the graphic to avoid modifying shared references
            const graphic = originalGraphic.clone();

            // Clone the incoming symbol if it exists
            let finalSymbol = symbol ? symbol.clone() : null;

            // Handle polyline: enforce SimpleLineSymbol
            if (graphic.geometry?.type === 'polyline') {
                if (!finalSymbol || finalSymbol.type !== 'simple-line') {
                    finalSymbol = new SimpleLineSymbol({
                        color: finalSymbol?.color || [0, 0, 0, 1],
                        width: finalSymbol?.width || 2,
                        style: finalSymbol?.style || 'solid'
                    });
                }
            }

            // Handle text: ensure TextSymbol has required props
            if (finalSymbol?.type === 'text') {
                const textSymbol = finalSymbol as TextSymbol;

                if (!textSymbol.color) {
                    textSymbol.color = new Color([0, 0, 0, 1]);
                }

                if (!textSymbol.font) {
                    textSymbol.font = new Font({ size: 12 });
                } else {
                    // Ensure required font fields exist with a new Font object
                    textSymbol.font = new Font({
                        family: textSymbol.font.family || 'Arial',
                        size: textSymbol.font.size || 12,
                        style: textSymbol.font.style || 'normal',
                        weight: textSymbol.font.weight || 'normal',
                        decoration: textSymbol.font.decoration || 'none'
                    });
                }

                if (!textSymbol.text) {
                    textSymbol.text = graphic.attributes?.name || 'Label';
                }

                finalSymbol = textSymbol;
            }

            // Assign the final symbol to the graphic clone
            graphic.symbol = finalSymbol;

            // Update the array in state
            drawings[index] = graphic;

            // Update the graphics layer without triggering a watch event
            this.ignoreNextGraphicsUpdate = true;
            this.props.graphicsLayer.remove(originalGraphic);
            this.props.graphicsLayer.add(graphic);

            // Update state and persist to localStorage
            this.setState({ drawings }, () => {
                if ((this.props.allowLocalStorage !== false) && this.state.consentGranted === true) {
                    this.saveToLocalStorage();
                }
            });
        } catch (err) {
            console.error('Failed to update symbol:', err);
            this.showLocalAlert('Error updating symbol', 'error');
        }
    };


    render() {
        const {
            drawings, selectedGraphicIndex, sortOption, editingGraphicIndex,
            alertMessage, alertType, showAlert, consentGranted,
            confirmDialogOpen, confirmDialogMessage, confirmDialogType,
            importDialogOpen, importFile, selectedGraphics
        } = this.state;

        const verticalMap: Record<VerticalAlign, { label: string; stateKey: keyof MyDrawingsPanelState }> = {
            top: { label: 'Top', stateKey: 'vAlignTopActive' },
            middle: { label: 'Middle', stateKey: 'vAlignMidActive' },
            bottom: { label: 'Bottom', stateKey: 'vAlignBotActive' },
            baseline: { label: 'Base', stateKey: 'vAlignBaseActive' }
        };

        // Custom styles to override any gray backgrounds
        const whiteBackgroundStyle = {
            backgroundColor: '#fff',
            boxShadow: 'none'
        };

        const storageDisclaimerContent = (
            <div
                className="p-4 text-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="storageDisclaimerTitle"
                aria-describedby="storageDisclaimerDescription"
                style={{ backgroundColor: '#fff' }}
            >
                <h5 id="storageDisclaimerTitle" className="mb-3" tabIndex={-1}>
                    Important Notice
                </h5>
                <div id="storageDisclaimerDescription">
                    <p>
                        Your drawings are saved in your web browser using local storage. This means they’re only available on this device and in this browser.
                    </p>
                    <p>
                        If you clear your browser data, switch to a different browser or computer, or if the application receives an update, your drawings may be lost.
                    </p>
                    <p>
                        To keep your work safe, please use the <strong>Import</strong> and <strong>Export</strong> buttons to back up and restore your drawings.
                    </p>
                </div>
                <Button
                    type="primary"
                    title="Acknowledge this notice and continue"
                    aria-label="Acknowledge disclaimer and continue to My Drawings panel"
                    onClick={() =>
                        this.setState({ showStorageDisclaimer: false }, () => {
                            this.initializeComponents();
                            setTimeout(() => {
                                document.getElementById('drawingPanelHeader')?.focus();
                            }, 100);
                        })
                    }
                >
                    Continue
                </Button>
            </div>
        );

        // Header style with !important to override any external styles
        const headerStyle = {
            backgroundColor: '#fff !important',
            boxShadow: 'none'
        };

        // Add button styling to make them equal width

        const customCss = `
          /* Force white background on potentially gray elements */
          .my-drawings-panel,
          .my-drawings-panel h5,
          .my-drawings-panel .border-bottom,
          .my-drawings-panel > div,
          .my-drawings-panel > div > div {
              background-color: #fff !important;
          }

          .my-drawings-panel .drawing-list-container {
              overflow-y: auto !important;
          }

          /* Target panel headers that might be getting styled by the framework */
          .panel-title, 
          .panel-heading,
          .widget-title,
          .widget-heading,
          .widget-header {
              background-color: #fff !important;
          }

          /* Style the main panel header specifically */
          .my-drawings {
              background-color: #fff !important;
          }

          /* SCROLLING IMPROVEMENTS */
          .my-drawings-panel {
              display: flex !important;
              flex-direction: column !important;
              height: 100% !important;
              overflow: hidden !important;
          }

          .accessible-tooltip-wrapper {
            position: relative !important;
            display: inline-block !important;
          }

          .accessible-tooltip-wrapper:hover .accessible-tooltip,
          .accessible-tooltip-wrapper:focus-within .accessible-tooltip {
              visibility: visible !important;
              opacity: 1 !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip {
              visibility: hidden !important;
              opacity: 0 !important;
              position: absolute !important;
              z-index: 1000 !important;
              background-color: rgba(0, 0, 0, 0.75) !important;
              color: white !important;
              text-align: center !important;
              padding: 5px 10px !important;
              border-radius: 4px !important;
              font-size: 12px !important;
              white-space: nowrap !important;
              pointer-events: none !important;
              transition: opacity 0.2s, visibility 0.2s !important;
          }

          /* Position the tooltip */
          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="top"] {
              bottom: 100% !important;
              left: 50% !important;
              transform: translateX(-50%) translateY(-6px) !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="bottom"] {
              top: 100% !important;
              left: 50% !important;
              transform: translateX(-50%) translateY(6px) !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="left"] {
              right: 100% !important;
              top: 50% !important;
              transform: translateY(-50%) translateX(-6px) !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="right"] {
              left: 100% !important;
              top: 50% !important;
              transform: translateY(-50%) translateX(6px) !important;
          }

          /* Add arrows */
          .accessible-tooltip-wrapper .accessible-tooltip::after {
              content: "" !important;
              position: absolute !important;
              border-width: 5px !important;
              border-style: solid !important;
              border-color: transparent !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="top"]::after {
              bottom: -10px !important;
              left: 50% !important;
              margin-left: -5px !important;
              border-color: rgba(0, 0, 0, 0.75) transparent transparent transparent !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="bottom"]::after {
              top: -10px !important;
              left: 50% !important;
              margin-left: -5px !important;
              border-color: transparent transparent rgba(0, 0, 0, 0.75) transparent !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="left"]::after {
              top: 50% !important;
              right: -10px !important;
              margin-top: -5px !important;
              border-color: transparent transparent transparent rgba(0, 0, 0, 0.75) !important;
          }

          .accessible-tooltip-wrapper .accessible-tooltip[data-placement="right"]::after {
              top: 50% !important;
              left: -10px !important;
              margin-top: -5px !important;
              border-color: transparent rgba(0, 0, 0, 0.75) transparent transparent !important;
          }

          /* Main scrollable container */
          .my-drawings-panel .flex-grow-1,
          .my-drawings-panel .drawing-list-container {
              overflow-y: auto !important;
              flex: 1 1 auto !important;
              height: auto !important;
              max-height: 100% !important;
          }

          /* Ensure the top controls don't shrink */
          .my-drawings-panel .border-bottom {
              flex-shrink: 0 !important;
          }

          /* ======= IMPROVED DRAWING ITEM STYLING ======= */
  
          /* Drawing item container styling */
          .drawing-item {
              position: relative;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              overflow: hidden;
              box-sizing: border-box;
              width: 100%;
              margin-bottom: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
              transition: all 0.2s ease;
          }

          /* Hover effect for drawing items */
          .drawing-item:hover {
              border-color: #c0c0c0;
              box-shadow: 0 2px 5px rgba(0,0,0,0.08);
          }

          /* Selected item styling */
          .drawing-item.selected-drawing {
              background-color: #f0f7ff !important;
              border-color: #3b82f6 !important;
              border-width: 2px !important;
              border-style: solid !important;
              box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15) !important;
              position: relative;
              z-index: 1;
              transition: background-color 0.2s, border-color 0.25s;
          }

          /* Add a left accent bar for selected items */
          .drawing-item.selected-drawing::before {
              content: '';
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 4px;
              background-color: #3b82f6;
              border-top-left-radius: 3px;
              border-bottom-left-radius: 3px;
          }
  
          /* Truncate text labels to prevent overflow */
          .drawing-item .font-weight-bold,
          .drawing-item .text-muted {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
  
          /* ======= IMPROVED BUTTON STYLING ======= */
  
          /* Contain buttons in a proper grid layout */
          .drawing-item .d-flex.flex-column {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 6px;
          }
  
          /* OPTIMIZED COMPACT BUTTON LAYOUT FOR 5 BUTTONS */
          .drawing-item .button-container {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 2px !important; /* Reduced for 5 buttons */
              width: 100% !important;
              margin-top: 8px !important;
          }
  
          /* Individual button styling - optimized for 5 buttons */
          .drawing-item .btn {
              flex: 1 !important;
              min-width: 65px !important; /* Reduced for 5 buttons */
              padding: 4px 5px !important; /* Smaller padding */
              font-size: 11px !important; /* Slightly smaller font */
              white-space: nowrap !important;
              text-align: center !important;
              justify-content: center !important;
              display: flex !important;
              align-items: center !important;
              transition: all 0.2s !important;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
              margin: 0 !important;
          }
  
          /* Ensure icons have consistent spacing */
          .drawing-item .btn i {
              margin-right: 3px !important; /* Reduced for compactness */
              font-size: 10px !important; /* Smaller icons */
          }
  
          /* Button hover effect */
          .drawing-item .btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              z-index: 1; /* Ensure hover shadow isn't clipped */
          }
  
          /* Ensure button action happens on click */
          .drawing-item .btn:active {
              transform: translateY(1px);
              box-shadow: 0 1px 1px rgba(0,0,0,0.1);
          }
  
          /* Button colors */
          .drawing-item .btn-danger {
              background-color: #f8d7da;
              border-color: #f5c6cb;
              color: #721c24;
          }
  
          .drawing-item .btn-danger:hover {
              background-color: #f1c1c7;
              border-color: #efb0b9;
          }
  
          /* Extra compact styling for wider screens - allow to fit 5 buttons */
          @media (min-width: 651px) {
              .drawing-item .button-container {
                  gap: 3px !important;
              }
      
              .drawing-item .btn {
                  min-width: 70px !important;
                  padding: 4px 6px !important;
                  font-size: 12px !important;
              }
      
              .drawing-item .btn i {
                  margin-right: 3px !important;
                  font-size: 11px !important;
              }
          }
  
          /* ======= TEXT STYLE EDITOR IMPROVEMENTS ======= */
  
          /* Text editor container */
          .text-editor {
              padding: 12px;
              border-radius: 6px;
              background-color: #f9f9f9 !important;
              border: 1px solid #e0e0e0;
              margin-top: 8px;
              box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
              width: 100%;
              overflow: hidden;
          }
  
          /* Form groups within text editor */
          .text-editor .form-group {
              margin-bottom: 12px;
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(0,0,0,0.05);
          }
  
          .text-editor .form-group:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
          }
  
          /* Form controls */
          .text-editor input,
          .text-editor select,
          .text-editor .form-control {
              max-width: 100%;
              width: 100%;
          }
  
          .text-editor input[type="text"],
          .text-editor input[type="number"] {
              text-overflow: ellipsis;
          }
  
          /* Form labels */
          .text-editor label {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
              font-size: 12px;
              margin-bottom: 4px;
          }
  
          /* Color picker and number inputs */
          .text-editor input[type="color"] {
              height: 32px;
              width: 32px;
              padding: 0;
              min-width: 32px;
          }
  
          .text-editor input[type="number"] {
              max-width: 80px;
          }
  
          /* Range sliders */
          .text-editor input[type="range"] {
              height: 6px;
              background: #e0e0e0;
              border-radius: 3px;
              width: 100%;
          }
  
          /* Text style button controls */
          .text-editor .text-style-btn {
              min-width: 40px !important;
              height: 40px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              position: relative !important;
              margin: 0 2px;
          }
  
          /* Active buttons style */
          .text-editor .btn-primary.text-style-btn::after {
              content: '';
              position: absolute;
              bottom: 3px;
              left: 30%;
              width: 40%;
              height: 2px;
              background-color: white;
          }

          /* ALIGNMENT BUTTON IMPROVEMENTS */
          .text-alignment-btn {
              min-width: 0 !important; 
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              padding: 6px 4px !important;
              margin: 0 2px !important;
              overflow: hidden !important;
          }

          .text-alignment-btn .alignment-label {
              font-size: 12px !important;
              font-weight: normal !important;
              margin-bottom: 2px !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              width: 100% !important;
              text-align: center !important;
          }

          .text-alignment-btn .alignment-icon {
              font-size: 8px !important;
              opacity: 0.8 !important;
          }

          .text-alignment-btn.active .alignment-label {
              font-weight: bold !important;
          }

          /* Horizontal alignment specific styles */
          .horizontal-alignment-controls {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 12px !important;
              width: 100% !important;
          }
  
          .horizontal-alignment-controls .btn-group {
              width: 100% !important;
              display: flex !important;
              gap: 2% !important;
          }

          /* Vertical alignment specific styles */
          .vertical-alignment-controls {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 12px !important;
              width: 100% !important;
          }
  
          .vertical-alignment-controls .btn-group {
              width: 100% !important;
              display: flex !important;
              gap: 2% !important;
          }

          /* Alignment buttons */
          .btn-sm.alignment-button {
              flex: 1 !important;
              min-width: 0 !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              font-size: 12px !important;
              padding: 4px 2px !important;
          }

          /* Improved visual indicators for alignment states */
          .alignment-label-container {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
          }

          /* Button group improvements */
          .alignment-btn-group {
              display: flex !important;
              width: 100% !important;
              justify-content: space-between !important;
              gap: 2% !important;
          }
  
          /* Apply button styling */
          .text-editor .btn-primary {
              width: 100%;
              margin-top: 12px;
              font-weight: bold;
          }
  
          /* ======= IMPROVED RESPONSIVE TOOLBAR STYLING ======= */
  
          /* Enhanced responsive toolbar styling */
          .my-drawings-panel .top-controls {
              display: flex !important;
              flex-direction: column !important;
              padding: 8px 8px !important;
              border-bottom: 1px solid #e0e0e0 !important;
              background-color: #fff !important;
              gap: 6px !important;
              margin-bottom: 8px !important;
          }

          /* First line container with sort and select all */
          .my-drawings-panel .toolbar-first-line {
              display: flex !important;
              flex-wrap: wrap !important; /* Enable wrapping */
              align-items: center !important;
              gap: 8px !important; /* Space between wrapped items */
              width: 100% !important;
              margin-bottom: 6px !important;
          }

          /* Sort dropdown container */
          .my-drawings-panel .sort-wrapper {
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              flex: 0 0 auto !important; /* Don't stretch, keep natural size */
              min-width: auto !important; /* Let it size naturally */
              margin-right: 8px !important; /* Space after the wrapper */
          }

          .my-drawings-panel .sort-label {
              font-size: 12px !important;
              margin: 0 !important;
              white-space: nowrap !important;
              color: #555 !important;
          }

          .my-drawings-panel .sort-select {
              font-size: 12px !important;
              height: 28px !important;
              min-width: 120px !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              border: 1px solid #ccc !important;
          }

          /* Override Bootstrap's form-control padding which can be excessive */
          .my-drawings-panel .form-control-sm.sort-select {
              padding: 2px 6px !important; /* Ensure this overrides Bootstrap */
              height: 28px !important;
          }

          /* Select All styling */
          .my-drawings-panel .select-all-wrapper {
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              white-space: nowrap !important;
              margin-right: auto !important; /* Push to left side */
          }

          .my-drawings-panel #selectAllCheckbox {
              margin: 0 !important;
              cursor: pointer !important;
          }

          .my-drawings-panel .select-all-label {
              font-size: 12px !important;
              margin: 0 !important;
              white-space: nowrap !important;
              cursor: pointer !important;
              color: #555 !important;
          }

          /* Action buttons wrapper - IMPROVED WRAPPING */
          .my-drawings-panel .action-buttons-wrapper {
              display: flex !important;
              flex-wrap: wrap !important; /* Enable wrapping */
              gap: 6px !important; /* Increased gap for better separation when wrapped */
              width: 100% !important;
          }

          /* Action button styling - ENSURE FULL TEXT VISIBILITY */
          .my-drawings-panel .action-btn {
              flex: 0 1 auto !important; /* Don't grow, but allow shrinking */
              min-width: auto !important; /* Remove minimum width to prevent text truncation */
              padding: 5px 10px !important; /* More comfortable padding */
              font-size: 12px !important;
              white-space: nowrap !important; /* Never truncate button text */
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              transition: all 0.15s ease !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
              margin-right: 0 !important; /* Let gap handle spacing */
              overflow: visible !important; /* Ensure text is never cut off */
          }

          .my-drawings-panel .action-btn i {
              margin-right: 4px !important;
              font-size: 12px !important;
          }

          /* Responsive behavior for extremely narrow screens */
          @media (max-width: 350px) {
              /* Force drawing item buttons to stack on very narrow screens */
              .drawing-item .button-container {
                  flex-direction: column !important;
              }
      
              .drawing-item .btn {
                  width: 100% !important;
                  margin-bottom: 4px !important;
              }
      
              .text-editor .d-flex {
                  flex-wrap: wrap;
              }
      
              /* Toolbar responsive - stack elements for very narrow screens */
              .my-drawings-panel .toolbar-first-line {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 8px !important;
              }
      
              .my-drawings-panel .sort-wrapper,
              .my-drawings-panel .select-all-wrapper {
                  width: 100% !important;
                  margin-right: 0 !important;
              }
      
              .my-drawings-panel .sort-select {
                  flex-grow: 1 !important;
                  width: 100% !important;
              }
      
              /* Stack buttons in a single column */
              .my-drawings-panel .action-buttons-wrapper {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 6px !important;
              }
      
              .my-drawings-panel .action-btn {
                  width: 100% !important;
                  justify-content: flex-start !important; /* Left align text */
              }
          }
  
          /* Responsive behavior for narrow screens */
          @media (min-width: 351px) and (max-width: 500px) {
              /* Make buttons more compact on medium screens */
              .drawing-item .button-container {
                  gap: 2px !important;
              }
      
              .drawing-item .btn {
                  padding: 3px 2px !important;
                  font-size: 10px !important;
                  min-width: 50px !important;
              }
      
              .drawing-item .btn i {
                  margin-right: 2px !important;
                  font-size: 9px !important;
              }
      
              /* Toolbar responsive adjustments */
              .my-drawings-panel .toolbar-first-line {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 8px !important;
              }
      
              .my-drawings-panel .sort-wrapper,
              .my-drawings-panel .select-all-wrapper {
                  width: 100% !important;
                  margin-right: 0 !important;
              }
      
              .my-drawings-panel .sort-select {
                  flex-grow: 1 !important;
                  width: 100% !important;
              }
      
              /* Two buttons per row for action buttons */
              .my-drawings-panel .action-buttons-wrapper {
                  display: flex !important;
                  flex-wrap: wrap !important;
                  gap: 6px !important;
              }
      
              .my-drawings-panel .action-btn {
                  flex: 1 0 calc(50% - 6px) !important; /* Two buttons per row with gap */
                  padding: 5px 8px !important;
                  font-size: 11px !important;
                  justify-content: flex-start !important; /* Left align text */
              }
      
              .my-drawings-panel .action-btn i {
                  margin-right: 3px !important;
                  font-size: 10px !important;
              }
          }
  
          /* Medium screens adjustments */
          @media (min-width: 501px) and (max-width: 700px) {
              /* Adjust toolbar button spacing */
              .my-drawings-panel .action-buttons-wrapper {
                  gap: 5px !important;
              }
      
              .my-drawings-panel .action-btn {
                  padding: 5px 8px !important;
                  font-size: 11px !important;
              }
      
              .my-drawings-panel .action-btn i {
                  margin-right: 3px !important;
                  font-size: 11px !important;
              }
      
              /* Ensure sort controls don't take too much space */
              .my-drawings-panel .sort-select {
                  min-width: 110px !important;
              }
          }
  
          /* Medium-large screens */
          @media (min-width: 501px) and (max-width: 650px) {
              .drawing-item .button-container {
                  gap: 2px !important;
              }
      
              .drawing-item .btn {
                  padding: 4px 3px !important;
                  font-size: 11px !important;
                  min-width: 60px !important;
              }
      
              .drawing-item .btn i {
                  margin-right: 2px !important;
              }
          }
  
          /* ======= SCROLLBAR STYLING ======= */
  
          /* Firefox scrollbar */
          .px-3 {
              scrollbar-width: thin;
              scrollbar-color: rgba(0,0,0,0.2) transparent;
          }
  
          /* Chrome/Safari scrollbar */
          .px-3::-webkit-scrollbar {
              width: 6px;
          }
  
          .px-3::-webkit-scrollbar-track {
              background: transparent;
          }
  
          .px-3::-webkit-scrollbar-thumb {
              background-color: rgba(0,0,0,0.2);
              border-radius: 3px;
          }
  
          /* Prevent text overflow in all text elements */
          .text-truncate {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
          }
        `;


        // Custom confirmation dialog for delete/clear
        const confirmationDialog = confirmDialogOpen && (
            <div
                className="confirmation-dialog-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirmationDialogTitle"
                aria-describedby="confirmationDialogMessage"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div
                    className="confirmation-dialog"
                    style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '4px',
                        width: '80%',
                        maxWidth: '300px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                >
                    <div className="confirmation-dialog-header mb-3">
                        <h5 id="confirmationDialogTitle" tabIndex={-1} className="m-0">
                            Confirm {confirmDialogType === 'delete' ? 'Delete' : 'Clear All'}
                        </h5>
                    </div>
                    <div className="confirmation-dialog-body mb-3">
                        <p id="confirmationDialogMessage" className="m-0">
                            {confirmDialogMessage}
                        </p>
                    </div>
                    <div className="confirmation-dialog-footer d-flex justify-content-end" role="group" aria-label="Confirmation options">
                        <Button
                            size="sm"
                            className="mr-2"
                            onClick={this.closeConfirmDialog}
                            title="Cancel and close the dialog"
                            aria-label="Cancel"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            type="danger"
                            onClick={this.executeConfirmAction}
                            title="Confirm and proceed"
                            aria-label="Confirm and proceed"
                        >
                            OK
                        </Button>
                    </div>
                </div>
            </div>
        );

        // Import confirmation dialog
        const importDialog = importDialogOpen && (
            <div
                className="confirmation-dialog-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="importDialogTitle"
                aria-describedby="importDialogDescription"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div
                    className="confirmation-dialog"
                    style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '4px',
                        width: '80%',
                        maxWidth: '300px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                >
                    <div className="confirmation-dialog-header mb-3">
                        <h5 id="importDialogTitle" tabIndex={-1} className="m-0">
                            Import Drawings
                        </h5>
                    </div>
                    <div id="importDialogDescription" className="confirmation-dialog-body mb-3">
                        <p className="m-0">{importFile && `File: ${importFile.name}`}</p>
                        <p className="mt-2 mb-0">
                            Would you like to replace existing drawings or add to them?
                        </p>
                    </div>
                    <div className="confirmation-dialog-footer d-flex justify-content-between" role="group" aria-label="Import action options">
                        <Button
                            size="sm"
                            onClick={this.closeImportDialog}
                            title="Cancel import and close dialog"
                            aria-label="Cancel import"
                        >
                            Cancel
                        </Button>
                        <div>
                            <Button
                                size="sm"
                                className="mr-2"
                                onClick={this.handleImportAdd}
                                title="Add imported drawings to existing ones"
                                aria-label="Add drawings"
                            >
                                Add
                            </Button>
                            <Button
                                size="sm"
                                type="danger"
                                onClick={this.handleImportReplace}
                                title="Replace existing drawings with imported file"
                                aria-label="Replace drawings"
                            >
                                Replace
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );

        // Content for when local storage permission is denied
        const permissionDeniedContent = (
            <div
                className="my-drawings-panel p-3"
                role="dialog"
                aria-modal="true"
                aria-labelledby="permissionDeniedTitle"
                aria-describedby="permissionDeniedDescription"
                style={{ backgroundColor: '#fff', height: '100%', boxShadow: 'none' }}
            >
                <div className="text-center mb-4">
                    <h5 id="permissionDeniedTitle" tabIndex={-1}>
                        My Drawings Feature Unavailable
                    </h5>
                    <div id="permissionDeniedDescription">
                        <p>This feature requires local storage permission to save your drawings.</p>
                    </div>
                    <div className="mt-4">
                        <Button
                            type="primary"
                            onClick={this.handleConsentYes}
                            title="Enable local storage to use the My Drawings feature"
                            aria-label="Allow local storage permission to enable My Drawings feature"
                        >
                            Allow Local Storage Permission
                        </Button>
                    </div>
                </div>

                {showAlert && (
                    <div role="alert" aria-live="assertive">
                        <Alert
                            className={`edraw-alert edraw-alert-${alertType}`}
                            withIcon
                            open
                            type={alertType}
                            text={alertMessage}
                        />
                    </div>
                )}
            </div>
        );

        // Only show consent prompt if consent status is undecided (null)
        const showConsentPrompt = consentGranted === null;

        // Consent prompt content
        const consentPromptContent = (
            <div
                className="consent-banner border p-3 mb-2 text-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consentPromptTitle"
                aria-describedby="consentPromptDescription"
                style={{ backgroundColor: '#fff', height: '100%', boxShadow: 'none' }}
            >
                <h5 id="consentPromptTitle" className="mb-3" tabIndex={-1}>
                    Storage Permission Required
                </h5>
                <div id="consentPromptDescription">
                    <p className="mb-3">
                        To use the My Drawings panel, you must allow saving drawings in your browser's local storage.
                    </p>
                    <p className="mb-3">
                        This allows your drawings to be remembered when you return to this page later.
                    </p>
                </div>
                <div className="d-flex justify-content-center mt-3" role="group" aria-label="Consent choices">
                    <Button
                        type="primary"
                        size="sm"
                        className="mr-3"
                        onClick={this.handleConsentYes}
                        title="Allow saving drawings to your browser"
                        aria-label="Allow saving drawings to your browser"
                    >
                        Allow Local Storage
                    </Button>
                    <Button
                        type="danger"
                        size="sm"
                        onClick={this.handleConsentNo}
                        title="Do not allow saving drawings to your browser"
                        aria-label="Do not allow saving drawings to your browser"
                    >
                        Don't Allow
                    </Button>
                </div>
            </div>
        );

        const loadPromptContent = (
            <div
                className="p-4 text-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="loadPromptTitle"
                aria-describedby="loadPromptDescription"
                style={{ backgroundColor: '#fff', height: '100%' }}
            >
                <h5 id="loadPromptTitle" className="mb-3" tabIndex={-1}>
                    Existing Drawings Found
                </h5>
                <div id="loadPromptDescription">
                    <p>You have drawings saved from a previous session.</p>
                    <p>Would you like to load your existing drawings or delete all and start new?</p>
                </div>
                <div className="d-flex justify-content-center mt-4 gap-3" role="group" aria-label="Load options">
                    <Button
                        type="primary"
                        onClick={this.handleLoadExistingDrawings}
                        className="mr-3"
                        title="Load your previously saved drawings"
                        aria-label="Load previously saved drawings"
                    >
                        Load Existing Drawings
                    </Button>
                    <Button
                        type="danger"
                        onClick={this.handleStartFresh}
                        title="Delete all saved drawings and start fresh"
                        aria-label="Delete all saved drawings and start fresh"
                    >
                        Delete All and Start New
                    </Button>
                </div>
            </div>
        );


        const AccessibleTooltip = ({ title, children, placement = 'top', disabled = false }) => {
            if (disabled || !title) return children;

            return (
                <div
                    className="accessible-tooltip-wrapper"
                    style={{ position: 'relative', display: 'inline-block' }}
                >
                    {children}
                    <span
                        className="accessible-tooltip"
                        role="tooltip"
                        aria-hidden="true"
                        data-placement={placement}
                    >
                        {title}
                    </span>
                </div>
            );
        };

        const mainPanelContent = (
            <div className="my-drawings-panel p-2" style={{ backgroundColor: '#fff' }}>
                {/* Top controls - compact responsive layout with accessible tooltips */}
                <div className="top-controls">
                    {/* First line: Sort and Select All */}
                    <div className="toolbar-first-line">
                        <div className="sort-wrapper">
                            <label
                                className="sort-label"
                                id="sort-drawings-label"
                                htmlFor="sort-select"
                                title="Sort drawings by different criteria"
                            >
                                Sort By:
                            </label>
                            <select
                                id="sort-select"
                                value={sortOption}
                                onChange={this.handleSortOptionChange}
                                className="sort-select"
                                aria-labelledby="sort-drawings-label"
                                title="Sort drawings by name, type, or creation date"
                            >
                                <option value="name">Name (A → Z)</option>
                                <option value="type">Type (A → Z)</option>
                                <option value="created">Created (Newest First)</option>
                            </select>
                        </div>

                        <div className="select-all-wrapper">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedGraphics.size === drawings.length && drawings.length > 0}
                                onChange={this.handleToggleSelectAll}
                                disabled={drawings.length === 0}
                                id="selectAllCheckbox"
                                aria-label="Select all drawings"
                                title="Select all drawings"
                            />
                            <label
                                htmlFor="selectAllCheckbox"
                                className="select-all-label"
                                title="Select all drawings"
                            >
                                Select All
                            </label>
                        </div>
                    </div>

                    {/* Second line: Action buttons */}
                    <div className="toolbar-second-line">
                        <div className="action-buttons-wrapper">
                            <Button
                                size="sm"
                                onClick={() => document.getElementById('import-file').click()}
                                className="action-btn"
                                aria-label="Import drawings from file"
                                title="Import drawings from file"
                            >
                                <i className="fas fa-file-import" aria-hidden="true"></i> Import
                            </Button>

                            <Button
                                size="sm"
                                onClick={this.handleExport}
                                disabled={drawings.length === 0}
                                className="action-btn"
                                aria-label="Export all drawings"
                                title="Export all drawings"
                            >
                                <i className="fas fa-file-export" aria-hidden="true"></i> Export All
                            </Button>

                            <Button
                                size="sm"
                                onClick={this.handleExportSelected}
                                disabled={selectedGraphics.size === 0}
                                className="action-btn"
                                aria-label="Export selected drawings"
                                title="Export selected drawings"
                            >
                                <i className="fas fa-file-download" aria-hidden="true"></i> Export Selected
                            </Button>

                            <Button
                                size="sm"
                                type="danger"
                                onClick={this.handleDeleteSelected}
                                disabled={selectedGraphics.size === 0}
                                className="action-btn"
                                aria-label="Delete selected drawings"
                                title="Delete selected drawings"
                            >
                                <i className="fas fa-trash-alt" aria-hidden="true"></i> Delete Selected
                            </Button>
                        </div>
                    </div>
                </div>

                {/* FIXED HEIGHT scrollable list - as simple as possible */}
                <div
                    className="px-3 drawing-list"
                    style={{
                        height: '500px',
                        overflowY: 'scroll',
                        backgroundColor: '#fff'
                    }}
                    role="list"
                    aria-label="Drawings list"
                >
                    {drawings.length === 0 ? (
                        <div className="text-center p-3 border rounded" style={{ backgroundColor: '#fff' }}>
                            <p className="mb-0">No drawings available. Create a drawing in the Add Drawing tab.</p>
                        </div>
                    ) : (
                            drawings.map((graphic, index) => (
                                <div
                                    id={`drawing-item-${index}`}
                                    key={`drawing-${graphic.attributes?.uniqueId || index}`}
                                    className={`drawing-item border p-2 mb-2 rounded ${selectedGraphicIndex === index ? 'selected-drawing' : ''}`}
                                    onClick={() => this.handleListItemClick(graphic, index)}
                                    role="listitem"
                                    aria-selected={selectedGraphicIndex === index}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            this.handleListItemClick(graphic, index);
                                        }
                                    }}
                                >
                                    <div className="d-flex">
                                        {/* Content area */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className='d-flex'>
                                                {/* Checkbox for multi-select */}
                                                <label className="d-flex align-items-start mr-3 mt-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mr-2 mt-1"
                                                        checked={selectedGraphics.has(index)}
                                                        onClick={(e) => this.handleToggleSelect(index, e)}
                                                        aria-label={`Select drawing: ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                        title={`Select ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                        id={`checkbox-drawing-${index}`}
                                                    />
                                                    <span className="sr-only">
                                                        Select {graphic.attributes?.name || `Drawing ${index + 1}`}
                                                    </span>
                                                </label>
                                                {/* Name or inline rename input */}
                                            <div>
                                            {editingGraphicIndex === index ? (
                                                <div className="form-group" onClick={(e) => e.stopPropagation()}>
                                                    <label htmlFor={`edit-name-input-${index}`} className="sr-only">Edit drawing name</label>
                                                    <input
                                                        id={`edit-name-input-${index}`}
                                                        type="text"
                                                        className="form-control mb-2 drawing-name-input"
                                                        value={graphic.attributes?.name || ''}
                                                        onChange={(e) => {
                                                            // Preserve the value exactly as typed, including spaces
                                                            const inputValue = e.target.value;
                                                            this.handleNameChange(index, inputValue);
                                                        }}
                                                        onBlur={this.saveNameEdit}
                                                        onKeyDown={(e) => {
                                                            // Prevent event from bubbling up to parent elements that might interfere
                                                            e.stopPropagation();

                                                            if (e.key === 'Enter') {
                                                                this.saveNameEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                        // Disable any browser features that might interfere with spaces
                                                        spellCheck="false"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        aria-label="Edit drawing name"
                                                        title="Edit drawing name"
                                                        // Add inline styles to ensure spaces are preserved
                                                        style={{
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'normal',
                                                            wordSpacing: 'normal',
                                                            textTransform: 'none'
                                                        }}
                                                    />
                                                    {/* Add save/cancel buttons for better UX */}
                                                    <div className="d-flex mt-1">
                                                        <Button
                                                            size="sm"
                                                            className="mr-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.saveNameEdit();
                                                            }}
                                                            title="Save name"
                                                            aria-label="Save drawing name"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.cancelNameEdit();
                                                            }}
                                                            title="Cancel editing"
                                                            aria-label="Cancel name editing"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-weight-bold text-truncate">
                                                        {graphic.attributes?.name || `Drawing ${index + 1}`}
                                                    </div>
                                                    <div className="text-muted small mb-2 text-truncate">
                                                        Type: {this.getDrawingTypeLabel(graphic)}
                                                        {graphic.attributes?.createdDate && ` • Created: ${this.formatCreatedDate(graphic.attributes.createdDate)}`}
                                                    </div>
                                                </>
                                            )}         
                                         </div>  
                                       </div>
                                        {/* Action Buttons */}
                                        <div className="button-container drawToolbarDiv">
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    this.handleCopyDrawing(index, e);
                                                }}
                                                className="btn-light"
                                                aria-label={`Copy ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                title="Create a copy of this drawing"
                                            >
                                                <i className="fas fa-copy" aria-hidden="true"></i> Copy
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    this.startEditing(index, e);
                                                }}
                                                className="btn-light"
                                                aria-label={`Rename ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                title="Rename this drawing"
                                            >
                                                <i className="fas fa-pencil-alt" aria-hidden="true"></i> Rename
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    this.handleExportSingle(index, e);
                                                }}
                                                className="btn-light"
                                                aria-label={`Download ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                title="Download this drawing as a file"
                                            >
                                                <i className="fas fa-download" aria-hidden="true"></i> Download
                                            </Button>

                                            <Button
                                                size="sm"
                                                type="danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    this.handleDeleteGraphic(index, e);
                                                }}
                                                aria-label={`Delete ${graphic.attributes?.name || `Drawing ${index + 1}`}`}
                                                title="Delete this drawing"
                                            >
                                                <i className="fas fa-trash-alt" aria-hidden="true"></i> Delete
                                            </Button>
                                        </div>
                                        {/* Style Editor (SymbolSelector or TextStyleEditor) */}
                                        {selectedGraphicIndex === index && (
                                            <div
                                                className="mt-3 border"
                                                onClick={(e) => e.stopPropagation()}
                                                role="region"
                                                aria-label="Style editor"
                                            >
                                                {this.isSupportedSymbol(graphic.symbol, graphic.geometry?.type) ? (
                                                    (graphic.symbol as any)?.type === 'text' ? (
                                                        <>
                                                            {graphic && (graphic.symbol as any)?.type === 'text' && (
                                                                <>
                                                                    {/* console.log("🧩 Opening TextStyleEditor with graphic:", graphic) */}
                                                                    {/* console.log("🔤 graphic.symbol.text:", (graphic.symbol as TextSymbol)?.text) */}
                                                                    {/* console.log("📦 Is TextSymbol:", graphic.symbol instanceof TextSymbol) */}
                                                                </>
                                                            )}
                                                            <TextStyleEditor
                                                                currentTextSymbol={this.state.currentTextSymbol}
                                                                graphic={graphic}
                                                                updateSymbol={(sym) => this.updateSymbolWithoutClosing(sym, index)}
                                                                show={true}
                                                                onClose={() => {
                                                                    this.setState({ selectedGraphicIndex: null, selectedGraphics: new Set() });
                                                                }}
                                                            />
                                                        </>
                                                    ) : (
                                                        <SymbolSelector
                                                            symbol={graphic.symbol as any}
                                                            jimuSymbolType={
                                                                graphic.geometry?.type === 'point'
                                                                    ? JimuSymbolType.Point
                                                                    : graphic.geometry?.type === 'polyline'
                                                                        ? JimuSymbolType.Polyline
                                                                        : JimuSymbolType.Polygon
                                                            }
                                                            onPointSymbolChanged={(sym) => this.updateSymbolWithoutClosing(sym, index)}
                                                            onPolylineSymbolChanged={(sym) => this.updateSymbolWithoutClosing(sym, index)}
                                                            onPolygonSymbolChanged={(sym) => this.updateSymbolWithoutClosing(sym, index)}
                                                        />
                                                    )
                                                ) : (
                                                    <div className="text-muted">This symbol type is not supported for style editing.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {/* Hidden file input for import */}
                <input
                    type="file"
                    id="import-file"
                    accept="application/json"
                    onChange={this.handleImport}
                    style={{ display: 'none' }}
                />
            </div>
        );

        return (
            <div
                className="my-drawings-panel p-2"
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    ...whiteBackgroundStyle
                }}
            >
                {/* Screen reader alert area */}
                {showAlert && (
                    <div role="alert" aria-live="assertive">
                        <Alert
                            className={`edraw-alert edraw-alert-${alertType}`}
                            withIcon
                            open
                            type={alertType}
                            text={alertMessage}
                        />
                    </div>
                )}

                {/* Accessible dialogs */}
                {confirmationDialog && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirmationDialogTitle"
                        aria-describedby="confirmationDialogDescription"
                    >
                        {confirmationDialog}
                    </div>
                )}

                {importDialog && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="importDialogTitle"
                        aria-describedby="importDialogDescription"
                    >
                        {importDialog}
                    </div>
                )}

                {/* Conditional rendering with focus management */}
                {showConsentPrompt ? (
                    <div>{consentPromptContent}</div>
                ) : consentGranted === false ? (
                    <div>{permissionDeniedContent}</div>
                ) : this.state.showLoadPrompt ? (
                    <div>{loadPromptContent}</div>
                ) : this.state.showStorageDisclaimer ? (
                    <div
                        className="p-4 text-center"
                        style={{ backgroundColor: '#fff' }}
                        role="region"
                        aria-labelledby="storageDisclaimerTitle"
                    >
                        <h5 id="storageDisclaimerTitle" className="mb-3" tabIndex={-1}>
                            Important Notice
                        </h5>
                        <p id="storageDisclaimerDescription">
                            Your drawings are saved in your web browser using local storage. This means they're only available on this device and in this browser.
                        </p>
                        <p>
                            If you clear your browser data, switch to a different browser or computer, or if the application receives an update, your drawings may be lost.
                        </p>
                        <p>
                            To keep your work safe, please use the <strong>Import</strong> and <strong>Export</strong> buttons to back up and restore your drawings.
                        </p>
                        <Button
                            type="primary"
                            title="Acknowledge this notice and continue"
                            aria-label="Continue to drawing panel"
                            onClick={() =>
                                this.setState({ showStorageDisclaimer: false }, () => {
                                    this.initializeComponents();
                                    setTimeout(() => {
                                        const el = document.getElementById('drawingPanelHeader');
                                        el?.focus();
                                    }, 100); // Ensure DOM is ready
                                })
                            }
                        >
                            Continue
                        </Button>
                    </div>
                ) : (
                    <div role="region" aria-labelledby="drawingPanelHeader">
                        <h2 id="drawingPanelHeader" tabIndex={-1} className="sr-only">
                            Drawing Panel
                        </h2>
                        {mainPanelContent}
                    </div>
                )}

                {/* Add a style tag with our CSS overrides */}
                <style dangerouslySetInnerHTML={{ __html: customCss }} />
            </div>
        );
    }
}

export default MyDrawingsPanel;