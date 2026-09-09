// ============================================================================
// exb-editor-shims.d.ts — Visual Studio ONLY (playbook Section 12, item 3, mode B).
// Ambient declarations for everything Experience Builder supplies at build time
// (react, jimu-*, esri/*, calcite, @emotion). Inert to the webpack build, which
// resolves the real modules. Members not listed are typed `any`; each imported
// name is declared as BOTH a value and a type so it works in either position.
// If the family master (client\your-extensions\widgets\_vs\exb-editor-shims.d.ts)
// is later dropped in, delete this file first: two copies produce TS2300.
// ============================================================================

// ---------------------------------------------------------------- react
declare module 'react' {
  export type Key = string | number;
  export type ReactNode = any;
  export type ReactElement<P = any, T = any> = any;
  export type ReactChild = any;
  export type ReactFragment = any;
  export type ReactPortal = any;
  export type CSSProperties = { [key: string]: any };
  export type Ref<T = any> = any;
  export type RefObject<T = any> = { current: T | null };
  export type MutableRefObject<T = any> = { current: T };
  export type ForwardedRef<T = any> = any;
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type ComponentType<P = any> = any;
  export type ComponentProps<T> = any;
  export type PropsWithChildren<P = any> = P & { children?: ReactNode };
  export type FC<P = any> = (props: P & { children?: ReactNode }) => any;
  export type FunctionComponent<P = any> = FC<P>;
  export type ForwardRefRenderFunction<T = any, P = any> = (props: P, ref: any) => any;
  export type ForwardRefExoticComponent<P = any> = any;
  export type RefAttributes<T = any> = { ref?: any };
  export type Context<T = any> = any;
  export type SyntheticEvent<T = any, E = any> = { target: any; currentTarget: any; preventDefault(): void; stopPropagation(): void; nativeEvent: E; [key: string]: any };
  export type ChangeEvent<T = any> = SyntheticEvent<T> & { target: T & { value: any; checked?: boolean; name?: string } };
  export type FormEvent<T = any> = SyntheticEvent<T>;
  export type MouseEvent<T = any, E = any> = SyntheticEvent<T, E> & { clientX: number; clientY: number; button: number; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean };
  export type KeyboardEvent<T = any> = SyntheticEvent<T> & { key: string; code: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; keyCode: number };
  export type FocusEvent<T = any> = SyntheticEvent<T> & { relatedTarget: any };
  export type DragEvent<T = any> = SyntheticEvent<T> & { dataTransfer: any };
  export type TouchEvent<T = any> = SyntheticEvent<T> & { touches: any; changedTouches: any };
  export type PointerEvent<T = any> = MouseEvent<T> & { pointerId: number; pointerType: string };
  export type WheelEvent<T = any> = MouseEvent<T> & { deltaY: number; deltaX: number };
  export type UIEvent<T = any> = SyntheticEvent<T>;
  export type ErrorInfo = { componentStack: string };
  export class Component<P = any, S = any, SS = any> {
    constructor(props?: P, context?: any);
    props: Readonly<P> & Readonly<{ children?: ReactNode }>;
    state: Readonly<S>;
    context: any;
    refs: { [key: string]: any };
    setState<K extends keyof S>(state: ((prev: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null), callback?: () => void): void;
    forceUpdate(callback?: () => void): void;
    render(): ReactNode;
    componentDidMount?(): void;
    componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: SS): void;
    componentWillUnmount?(): void;
    shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
    componentDidCatch?(error: Error, info: ErrorInfo): void;
    getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>): SS | null;
    static contextType?: any;
    static defaultProps?: any;
    static displayName?: string;
  }
  export class PureComponent<P = any, S = any, SS = any> extends Component<P, S, SS> {}
  export const Fragment: any;
  export const StrictMode: any;
  export const Suspense: any;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export function cloneElement(element: any, props?: any, ...children: any[]): any;
  export function isValidElement(obj: any): boolean;
  export function createContext<T = any>(defaultValue: T): any;
  export function createRef<T = any>(): RefObject<T>;
  export function forwardRef<T = any, P = any>(render: (props: P, ref: any) => any): any;
  export function memo<T = any>(component: T, compare?: any): T;
  export function lazy(factory: any): any;
  export function useState<S = any>(initial?: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T = any>(initial?: T | null): MutableRefObject<T>;
  export function useMemo<T = any>(factory: () => T, deps?: ReadonlyArray<any>): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps?: ReadonlyArray<any>): T;
  export function useContext<T = any>(ctx: any): T;
  export function useReducer(reducer: any, initial: any, init?: any): [any, (action: any) => void];
  export function useImperativeHandle(ref: any, init: () => any, deps?: ReadonlyArray<any>): void;
  export function useId(): string;
  export function useTransition(): [boolean, (cb: () => void) => void];
  export function useDeferredValue<T>(value: T): T;
  export function useSyncExternalStore(subscribe: any, getSnapshot: any, getServerSnapshot?: any): any;
  export const Children: any;
  export const version: string;
  export namespace JSX {
    interface Element { [key: string]: any }
    interface ElementClass { render(): any; [key: string]: any }
    interface ElementAttributesProperty { props: {} }
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: any; ref?: any }
    interface IntrinsicClassAttributes<T> { ref?: any }
    interface IntrinsicElements { [elemName: string]: any }
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
  export namespace JSX {
    interface Element { [key: string]: any }
    interface ElementClass { render(): any; [key: string]: any }
    interface ElementAttributesProperty { props: {} }
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: any; ref?: any }
    interface IntrinsicClassAttributes<T> { ref?: any }
    interface IntrinsicElements { [elemName: string]: any }
  }
}

declare module '@emotion/react/jsx-runtime' {
  export * from 'react/jsx-runtime';
}

declare module 'react-dom' {
  const ReactDOM: any;
  export default ReactDOM;
  export const createPortal: any;
  export const render: any;
  export const findDOMNode: any;
  export const unmountComponentAtNode: any;
}

// ---------------------------------------------------------------- jimu-core
declare module 'jimu-core' {
  import * as ReactNS from 'react';
  export import React = ReactNS;
  export const jsx: any;
  export const css: any;
  export type SerializedStyles = any;
  export type ThemeVariables = any;
  export type IMThemeVariables = any;
  export type IntlShape = { formatMessage(descriptor: { id: string; defaultMessage?: string }, values?: any): string; [key: string]: any };
  export type ImmutableObject<T> = T & {
    set<K extends keyof T>(key: K, value: T[K]): ImmutableObject<T>;
    set(key: string, value: any): ImmutableObject<T>;
    setIn(path: any[], value: any): ImmutableObject<T>;
    without(key: any): ImmutableObject<T>;
    merge(other: any, options?: any): ImmutableObject<T>;
    asMutable(options?: any): T;
    getIn(path: any[]): any;
    [key: string]: any;
  };
  export type ImmutableArray<T> = ReadonlyArray<T> & { asMutable(options?: any): T[]; set(i: number, v: T): ImmutableArray<T>; [key: string]: any };
  export const Immutable: any;
  export type AllWidgetProps<C = any> = {
    id: string;
    widgetId?: string;
    label?: string;
    config: C;
    intl: IntlShape;
    theme: any;
    useMapWidgetIds?: string[];
    useDataSources?: any;
    stateProps?: any;
    state?: any;
    dispatch?: any;
    controllerWidgetId?: string;
    portalUrl?: string;
    portalSelf?: any;
    user?: any;
    token?: string;
    locale?: string;
    appMode?: any;
    layoutId?: string;
    layoutItemId?: string;
    enableDataAction?: boolean;
    onInitDragHandler?: any;
    onInitResizeHandler?: any;
    [key: string]: any;
  };
  export enum WidgetState { Opened = 'OPENED', Closed = 'CLOSED', Active = 'ACTIVE' }
  export const appActions: any;
  export const getAppStore: () => any;
  export const MutableStoreManager: any;
  export const DataSourceManager: any;
  export const SessionManager: any;
  export const portalUrlUtils: any;
  export const urlUtils: any;
  export const utils: any;
  export const lodash: any;
  export const classNames: any;
  export const defaultMessages: { [key: string]: string };
  export const hooks: {
    useTranslation: (...messages: Array<{ [key: string]: string }>) => (id: string, values?: any) => string;
    useEventCallback: <T extends (...args: any[]) => any>(cb: T) => T;
    useLatest: <T>(v: T) => { current: T };
    usePrevious: <T>(v: T) => T;
    [key: string]: any;
  };
  export const useIntl: () => IntlShape;
  export const injectIntl: any;
  export const FormattedMessage: any;
  export const polished: any;
  export const moduleLoader: any;
  export const loadArcGISJSAPIModules: any;
  export const BaseWidget: any;
  export const ReactRedux: any;
  export const ReactResizeDetector: any;
  export const focusElementInKeyboardMode: any;
  export type IMState = any;
  export type IMAppConfig = any;
  export type UseDataSource = any;
  export type DataSource = any;
  export type FeatureLayerDataSource = any;
  export type DataRecord = any;
  export type WidgetProps = any;
  export type WidgetInjectedProps = any;
  export type LayoutInfo = any;
  export type AppMode = any;
  export type BrowserSizeMode = any;
}

declare module 'jimu-arcgis' {
  export const JimuMapView: any;
  export type JimuMapView = any;
  export const JimuMapViewComponent: any;
  export type JimuMapViewComponent = any;
  export const loadArcGISJSAPIModules: any;
  export type loadArcGISJSAPIModules = any;
  const _default: any;
  export default _default;
}

declare module 'jimu-for-builder' {
  export type AllWidgetSettingProps<C = any> = { id: string; widgetId?: string; config: C; intl: any; theme: any; useMapWidgetIds?: string[]; useDataSources?: any; onSettingChange: (settings: any, ...args: any[]) => void; portalUrl?: string; portalSelf?: any; token?: string; locale?: string; [key: string]: any };
  const _default: any;
  export default _default;
}

declare module 'jimu-theme' {
  export const ThemeContext: any;
  export type ThemeContext = any;
  export const useTheme: () => any;
  const _default: any;
  export default _default;
}

declare module 'jimu-ui' {
  export const AdvancedButtonGroup: any;
  export type AdvancedButtonGroup = any;
  export const Alert: any;
  export type Alert = any;
  export const Button: any;
  export type Button = any;
  export const ButtonGroup: any;
  export type ButtonGroup = any;
  export const Checkbox: any;
  export type Checkbox = any;
  export const CollapsableCheckbox: any;
  export type CollapsableCheckbox = any;
  export const CollapsablePanel: any;
  export type CollapsablePanel = any;
  export const Dropdown: any;
  export type Dropdown = any;
  export const DropdownButton: any;
  export type DropdownButton = any;
  export const DropdownItem: any;
  export type DropdownItem = any;
  export const DropdownMenu: any;
  export type DropdownMenu = any;
  export const Icon: any;
  export type Icon = any;
  export const Label: any;
  export type Label = any;
  export const Modal: any;
  export type Modal = any;
  export const ModalBody: any;
  export type ModalBody = any;
  export const ModalFooter: any;
  export type ModalFooter = any;
  export const ModalHeader: any;
  export type ModalHeader = any;
  export const NumericInput: any;
  export type NumericInput = any;
  export const Option: any;
  export type Option = any;
  export const Popper: any;
  export type Popper = any;
  export const Select: any;
  export type Select = any;
  export const Slider: any;
  export type Slider = any;
  export const Switch: any;
  export type Switch = any;
  export const Tab: any;
  export type Tab = any;
  export const Tabs: any;
  export type Tabs = any;
  export const TextAlignValue: any;
  export type TextAlignValue = any;
  export const TextArea: any;
  export type TextArea = any;
  export const TextInput: any;
  export type TextInput = any;
  export const Tooltip: any;
  export type Tooltip = any;
  export const Loading: any;
  export type Loading = any;
  export const defaultMessages: { [key: string]: string };
  const _default: any;
  export default _default;
}

declare module 'jimu-ui/advanced/map' {
  export const JimuSymbol: any;
  export type JimuSymbol = any;
  export const JimuSymbolType: any;
  export type JimuSymbolType = any;
  export const SymbolSelector: any;
  export type SymbolSelector = any;
  const _default: any;
  export default _default;
}

declare module 'jimu-ui/advanced/setting-components' {
  export const CollapsableCheckbox: any;
  export type CollapsableCheckbox = any;
  export const MapWidgetSelector: any;
  export type MapWidgetSelector = any;
  export const SettingRow: any;
  export type SettingRow = any;
  export const SettingSection: any;
  export type SettingSection = any;
  export const SidePopper: any;
  export type SidePopper = any;
  const _default: any;
  export default _default;
}

declare module 'jimu-ui/advanced/style-setting-components' {
  export const InputUnit: any;
  export type InputUnit = any;
  const _default: any;
  export default _default;
}

declare module 'jimu-ui/basic/color-picker' {
  export const ColorPicker: any;
  export type ColorPicker = any;
  const _default: any;
  export default _default;
}

declare module 'calcite-components' {
  export const CalciteIcon: any;
  export type CalciteIcon = any;
  export const CalciteChip: any;
  export type CalciteChip = any;
  const _default: any;
  export default _default;
}

declare module 'jimu-icons/outlined/directional/arrow-redo' { export const ArrowRedoOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/directional/arrow-undo' { export const ArrowUndoOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/editor/close' { export const CloseOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/editor/copy' { export const CopyOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/editor/edit' { export const EditOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/editor/trash' { export const TrashOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/outlined/suggested/wrong' { export const WrongOutlined: any; const _d: any; export default _d; }
declare module 'jimu-icons/*' { const _d: any; export default _d; export const Icon: any; }

// ---------------------------------------------------------------- esri (Maps SDK 5.x)
declare module 'esri/*' { const _d: any; export default _d; }
declare module 'esri/Color' {
  export default class Color {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/Graphic' {
  export default class Graphic {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/core/Collection' {
  export default class Collection {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Circle' {
  export default class Circle {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Extent' {
  export default class Extent {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Multipoint' {
  export default class Multipoint {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Point' {
  export default class Point {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Polygon' {
  export default class Polygon {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/Polyline' {
  export default class Polyline {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/SpatialReference' {
  export default class SpatialReference {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/layers/FeatureLayer' {
  export default class FeatureLayer {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/layers/GraphicsLayer' {
  export default class GraphicsLayer {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/Font' {
  export default class Font {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/PictureMarkerSymbol' {
  export default class PictureMarkerSymbol {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/SimpleFillSymbol' {
  export default class SimpleFillSymbol {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/SimpleLineSymbol' {
  export default class SimpleLineSymbol {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/SimpleMarkerSymbol' {
  export default class SimpleMarkerSymbol {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/symbols/TextSymbol' {
  export default class TextSymbol {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/widgets/Sketch/SketchViewModel' {
  export default class SketchViewModel {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/widgets/support/GridControls' {
  export default class GridControls {
    constructor(props?: any);
    static fromJSON(json: any): any;
    static fromExtent?(extent: any): any;
    static WGS84: any;
    static WebMercator: any;
    clone(): any;
    toJSON(): any;
    watch(path: any, cb: any): any;
    on(name: any, cb: any): any;
    destroy(): void;
    [key: string]: any;
  }
}
declare module 'esri/geometry/geometryEngine' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/areaOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/densifyOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/geodeticAreaOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/geodeticLengthOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/lengthOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/operators/projectOperator' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/support/webMercatorUtils' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/geometry/support/jsonUtils' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}
declare module 'esri/symbols/support/jsonUtils' {
  export const execute: any;
  export const executeMany: any;
  export const load: any;
  export const isLoaded: any;
  export const fromJSON: any;
  export const geodesicLength: any; export const planarLength: any; export const geodesicArea: any; export const planarArea: any;
  export const buffer: any; export const geodesicBuffer: any; export const union: any; export const intersect: any; export const difference: any; export const simplify: any; export const isSimple: any; export const densify: any; export const geodesicDensify: any; export const contains: any; export const intersects: any; export const distance: any; export const nearestCoordinate: any; export const nearestVertex: any; export const extendedSpatialReferenceInfo: any; export const generalize: any; export const offset: any; export const cut: any; export const rotate: any; export const convexHull: any; export const within: any; export const overlaps: any; export const equals: any; export const crosses: any; export const touches: any; export const disjoint: any; export const clip: any; export const flipHorizontal: any; export const flipVertical: any; export const relate: any; export const symmetricDifference: any; export const project: any; export const geographicToWebMercator: any; export const webMercatorToGeographic: any; export const xyToLngLat: any; export const lngLatToXY: any; export const canProject: any;
  const _d: any; export default _d;
}

// __esri global namespace (this file is a global script, so a top-level namespace is global).
// Open interfaces: the real @arcgis/core types merge with these if they ever load.
declare namespace __esri {
  interface Graphic { [key: string]: any }
  interface Geometry { [key: string]: any }
  interface Point { [key: string]: any }
  interface Polyline { [key: string]: any }
  interface Polygon { [key: string]: any }
  interface Extent { [key: string]: any }
  interface SpatialReference { [key: string]: any }
  interface MapView { [key: string]: any }
  interface SceneView { [key: string]: any }
  interface GraphicsLayer { [key: string]: any }
  interface FeatureLayer { [key: string]: any }
  interface Layer { [key: string]: any }
  interface Symbol { [key: string]: any }
  interface TextSymbol { [key: string]: any }
  interface SimpleMarkerSymbol { [key: string]: any }
  interface SimpleLineSymbol { [key: string]: any }
  interface SimpleFillSymbol { [key: string]: any }
  interface PictureMarkerSymbol { [key: string]: any }
  interface Color { [key: string]: any }
  interface SketchViewModel { [key: string]: any }
  interface Collection<T = any> { [key: string]: any }
  interface Handle { remove(): void }
  interface WatchHandle { remove(): void }
}
