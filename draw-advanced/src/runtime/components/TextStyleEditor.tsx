import React from 'react';
import {
    Button,
    TextInput,
    NumericInput,
    Label,
    AdvancedButtonGroup,
    Select,
    Option,
    Icon,
    Switch
} from 'jimu-ui';
import { ColorPicker } from 'jimu-ui/basic/color-picker';
// CloseOutlined removed - no longer needed
import TextSymbol from 'esri/symbols/TextSymbol';
import Font from 'esri/symbols/Font';
import Color from 'esri/Color';

import fsBoldIcon from '../assets/bold.svg';
import fItalicIcon from '../assets/italic.svg';
import fUnderlineIcon from '../assets/underline.svg';
import hAlignLeft from 'jimu-icons/svg/outlined/editor/text-left.svg';
import hAlignCenter from 'jimu-icons/svg/outlined/editor/text-center.svg';
import hAlignRight from 'jimu-icons/svg/outlined/editor/text-right.svg';
import vAlignTop from '../assets/text-align-v-t.svg';
import vAlignMid from '../assets/text-align-v-m.svg';
import vAlignBot from '../assets/text-align-v-b.svg';
import vAlignBase from '../assets/text-align-v-base.svg';

interface Props {
    currentTextSymbol: TextSymbol;
    updateSymbol: (updated: TextSymbol) => void;
    show: boolean;
    onClose: () => void;
    graphic?: any;
}

// Generate unique IDs for accessibility
const generateId = (base: string): string => `${base}-${Math.random().toString(36).substr(2, 9)}`;

export const TextStyleEditor: React.FC<Props> = ({ currentTextSymbol, updateSymbol, show, onClose, graphic }) => {
    const originalDisplayTextRef = React.useRef<string>('');
    const isClosingRef = React.useRef<boolean>(false);
    const [symbol, setSymbol] = React.useState<TextSymbol | null>(null);
    const [hasChanges, setHasChanges] = React.useState(false);

    // Ref for focus management
    const editorRef = React.useRef<HTMLDivElement>(null);
    const closeButtonRef = React.useRef<HTMLButtonElement>(null);
    const firstFocusableRef = React.useRef<HTMLInputElement>(null);

    // Unique IDs for ARIA associations
    const [ids] = React.useState(() => ({
        editorPanel: generateId('text-style-editor'),
        labelTextInput: generateId('label-text-input'),
        labelTextDesc: generateId('label-text-desc'),
        labelTextHint: generateId('label-text-hint'),
        fontFamilySelect: generateId('font-family-select'),
        fontFamilyDesc: generateId('font-family-desc'),
        fontColorPicker: generateId('font-color-picker'),
        fontColorDesc: generateId('font-color-desc'),
        fontSizeInput: generateId('font-size-input'),
        fontSizeDesc: generateId('font-size-desc'),
        fontStyleGroup: generateId('font-style-group'),
        fontStyleDesc: generateId('font-style-desc'),
        opacityInput: generateId('opacity-input'),
        opacityDesc: generateId('opacity-desc'),
        rotationInput: generateId('rotation-input'),
        rotationDesc: generateId('rotation-desc'),
        hAlignGroup: generateId('h-align-group'),
        hAlignDesc: generateId('h-align-desc'),
        vAlignGroup: generateId('v-align-group'),
        vAlignDesc: generateId('v-align-desc'),
        bgColorPicker: generateId('bg-color-picker'),
        bgColorDesc: generateId('bg-color-desc'),
        haloToggle: generateId('halo-toggle'),
        haloToggleDesc: generateId('halo-toggle-desc'),
        haloColorPicker: generateId('halo-color-picker'),
        haloColorDesc: generateId('halo-color-desc'),
        haloSizeInput: generateId('halo-size-input'),
        haloSizeDesc: generateId('halo-size-desc'),
        haloOpacityInput: generateId('halo-opacity-input'),
        haloOpacityDesc: generateId('halo-opacity-desc'),
        liveRegion: generateId('live-region'),
        applyButton: generateId('apply-button')
    }));

    // Live region announcement state
    const [announcement, setAnnouncement] = React.useState<string>('');

    // Announce changes to screen readers
    const announce = (message: string) => {
        setAnnouncement(message);
        // Clear after announcement
        setTimeout(() => setAnnouncement(''), 1000);
    };

    // UI state
    const [text, setText] = React.useState<string>('');
    const [fontSize, setFontSize] = React.useState<number>(12);
    const [fontColor, setFontColor] = React.useState<string>('#000000');
    const [fontOpacity, setFontOpacity] = React.useState<number>(1);
    const [fontFamily, setFontFamily] = React.useState<string>('Arial');
    const [fontWeight, setFontWeight] = React.useState<string>('normal');
    const [fontStyle, setFontStyle] = React.useState<string>('normal');
    const [fontDecoration, setFontDecoration] = React.useState<string>('none');
    const [fontRotation, setFontRotation] = React.useState<number>(0);
    const [horizontalAlignment, setHorizontalAlignment] = React.useState<'left' | 'center' | 'right'>('center');
    const [verticalAlignment, setVerticalAlignment] = React.useState<'top' | 'middle' | 'bottom' | 'baseline'>('middle');
    const [fontBackgroundColor, setFontBackgroundColor] = React.useState<string>('rgba(0,0,0,0)');
    const [fontHaloEnabled, setFontHaloEnabled] = React.useState<boolean>(false);
    const [haloDetailsOpen, setHaloDetailsOpen] = React.useState<boolean>(false);
    const [fontHaloColor, setFontHaloColor] = React.useState<string>('rgba(255,255,255,1)');
    const [fontHaloSize, setFontHaloSize] = React.useState<number>(1);
    const [fontHaloOpacity, setFontHaloOpacity] = React.useState<number>(1);

    // Focus management when editor opens
    React.useEffect(() => {
        if (show && firstFocusableRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                firstFocusableRef.current?.focus();
            }, 100);
        }
    }, [show]);

    // Handle Escape key to close editor
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (show && e.key === 'Escape') {
                e.preventDefault();
                handleApplyClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show]);

    // Focus trap for modal-like behavior
    React.useEffect(() => {
        if (!show || !editorRef.current) return;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !editorRef.current) return;

            const focusableElements = editorRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
    }, [show]);

    const findTextInDOM = (): string | null => {
        if (typeof document === 'undefined') return null;
        try {
            if (!(window as any)._textChangeObserver) {
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            const target = mutation.target as HTMLElement;
                            if (target && target.textContent) {
                                if (target.classList?.contains('esri-text-symbol') ||
                                    (target.tagName && (target.tagName.toLowerCase() === 'text' || target.tagName.toLowerCase() === 'tspan'))) {
                                    const content = target.textContent;
                                    if (typeof content === 'string' && content.trim() && content.trim().toLowerCase() !== 'text') {
                                        (window as any)._lastTextChangeValue = content.trim();
                                    }
                                }
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true, characterData: true, subtree: true });
                (window as any)._textChangeObserver = observer;
            }
            if ((window as any)._lastTextChangeValue && (window as any)._lastTextChangeValue.trim().toLowerCase() !== 'text') {
                return (window as any)._lastTextChangeValue;
            }
            const selectionHandles = document.querySelectorAll('.esri-view [class*="selection"], .esri-view .esri-editing-text');
            for (const handle of selectionHandles as any) {
                if (handle.textContent && handle.textContent.trim().toLowerCase() !== 'text' && handle.textContent.trim() !== '') {
                    return handle.textContent.trim();
                }
            }
            const allTextElems = Array.from(document.querySelectorAll('.esri-view svg text, .esri-view svg tspan'));
            const sortedByRecent = allTextElems.sort((a, b) => {
                const aTime = parseInt(a.getAttribute('data-timestamp') || '0', 10);
                const bTime = parseInt(b.getAttribute('data-timestamp') || '0', 10);
                return bTime - aTime;
            });
            for (const elem of sortedByRecent) {
                const content = elem.textContent;
                if (content && content.trim().toLowerCase() !== 'text' && content.trim() !== '' && !content.includes('NaN')) {
                    let parentElem: HTMLElement | null = elem.parentElement;
                    let isSystemLabel = false;
                    while (parentElem) {
                        const cls = parentElem.className || '';
                        if (typeof cls === 'string' && (
                            cls.includes('esri-basemap') || cls.includes('esri-legend') ||
                            cls.includes('esri-attribution') || cls.includes('esri-ui') || cls.includes('esri-widget')
                        )) {
                            isSystemLabel = true;
                            break;
                        }
                        parentElem = parentElem.parentElement;
                    }
                    if (!isSystemLabel) {
                        return content.trim();
                    }
                }
            }
            const textInputs = document.querySelectorAll('input[type="text"], textarea');
            for (const input of textInputs as any) {
                if (input.value && input.value.trim().toLowerCase() !== 'text' && input.value.trim() !== '') {
                    const maybeTextField = input.closest('[class*="text"]') || input.closest('[class*="label"]');
                    if (maybeTextField) {
                        return input.value.trim();
                    }
                }
            }
        } catch { }
        return null;
    };

    const findTextInObject = (obj: any): string | null => {
        if (!obj) return null;
        try {
            if (obj.declaredClass === 'esri.symbols.TextSymbol' && obj.text) {
                if (obj.text.trim().toLowerCase() !== 'text' && obj.text.trim() !== '') {
                    return obj.text;
                }
            }
            const textProps = ['text', 'label', 'value', 'displayValue', 'displayText', 'name', 'title', 'caption'];
            for (const prop of textProps) {
                if (obj[prop] && typeof obj[prop] === 'string') {
                    const val = obj[prop].trim();
                    if (val.toLowerCase() !== 'text' && val !== '') return val;
                }
            }
            if (obj.attributes) {
                for (const key in obj.attributes) {
                    const attrVal = obj.attributes[key];
                    if (attrVal && typeof attrVal === 'string') {
                        const val = attrVal.trim();
                        if (val.toLowerCase() !== 'text' && val !== '') return val;
                    }
                }
            }
            if (obj.symbol) {
                const nested = findTextInObject(obj.symbol);
                if (nested) return nested;
            }
            if (obj.graphic) {
                const nested = findTextInObject(obj.graphic);
                if (nested) return nested;
            }
        } catch { }
        return null;
    };

    React.useEffect(() => {
        // Reset flag when show changes
        if (!show) {
            isClosingRef.current = false;
            return;
        }

        if (!currentTextSymbol) return;

        // Reset closing flag when editor opens
        isClosingRef.current = false;

        try {
            setSymbol(currentTextSymbol);
            setHasChanges(false);

            // Centralized auto-generated ID detection
            const isAutoId = (val: string | null | undefined): boolean => {
                if (!val) return false;
                const v = val.trim();
                return v.startsWith('g_') ||
                    v.startsWith('auto_') ||
                    v.startsWith('imported_') ||
                    v.startsWith('restored_') ||
                    v.startsWith('copy_') ||
                    /^[a-z]_\d+_[a-z0-9]+$/i.test(v) ||
                    /^[a-z]+_\d{10,}/i.test(v);
            };

            let textContent = '';

            // 1. Try graphic name (skip auto-generated IDs)
            if (graphic?.attributes?.name && !isAutoId(graphic.attributes.name)) {
                textContent = graphic.attributes.name;
            }

            // 2. Try symbol text (skip auto-generated IDs)
            if (!textContent) {
                const symbolText = graphic?.symbol?.text ?? currentTextSymbol.text;
                if (symbolText && !isAutoId(symbolText)) {
                    textContent = symbolText;
                }
            }

            // 3. If still empty, try DOM/object — but ALSO filter out auto-gen IDs
            if (!textContent) {
                const domText = findTextInDOM();
                const altText = findTextInObject(graphic) ?? findTextInObject(currentTextSymbol);

                if (domText && !isAutoId(domText)) {
                    textContent = domText;
                } else if (altText && !isAutoId(altText)) {
                    textContent = altText;
                }
            }

            // 4. Final fallback from currentTextSymbol.text
            if (!textContent) {
                const symbolText = currentTextSymbol.text || '';
                if (!isAutoId(symbolText)) {
                    textContent = symbolText;
                }
            }

            // 5. Handle auto-numbered text (e.g., "text 1") when symbol is just "text"
            if (textContent && /^text\s+\d+$/i.test(textContent.trim())) {
                const actualSymbolText = graphic?.symbol?.text ?? currentTextSymbol.text;
                if (actualSymbolText && actualSymbolText.trim().toLowerCase() === 'text') {
                    textContent = actualSymbolText;
                }
            }

            // 6. Absolute fallback — never show an auto-gen ID
            if (!textContent || isAutoId(textContent)) {
                textContent = currentTextSymbol.text && !isAutoId(currentTextSymbol.text)
                    ? currentTextSymbol.text
                    : 'Text';
            }

            originalDisplayTextRef.current = textContent || '';
            setText(textContent);

            const fontDef = currentTextSymbol.font;
            setFontFamily(fontDef?.family || 'Arial');
            setFontSize(fontDef?.size || 12);
            setFontWeight(fontDef?.weight || 'normal');
            setFontStyle(fontDef?.style || 'normal');
            setFontDecoration(fontDef?.decoration || 'none');

            const c = currentTextSymbol.color;
            if (c) {
                const r = Math.round(c.r);
                const g = Math.round(c.g);
                const b = Math.round(c.b);
                const a = c.a !== undefined ? c.a : 1;
                const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
                setFontColor(hex);
                setFontOpacity(a);
            }

            setFontRotation(currentTextSymbol.angle || 0);
            setHorizontalAlignment((currentTextSymbol.horizontalAlignment as any) || 'center');
            setVerticalAlignment((currentTextSymbol.verticalAlignment as any) || 'middle');

            const bgc = currentTextSymbol.backgroundColor;
            if (bgc) {
                const bgHex = `rgba(${bgc.r},${bgc.g},${bgc.b},${bgc.a !== undefined ? bgc.a : 1})`;
                setFontBackgroundColor(bgHex);
            } else {
                setFontBackgroundColor('rgba(0,0,0,0)');
            }

            const halo = currentTextSymbol.haloColor;
            const hSize = currentTextSymbol.haloSize;
            if (halo && hSize && hSize > 0) {
                setFontHaloEnabled(true);
                const haloHex = `rgba(${halo.r},${halo.g},${halo.b},${halo.a !== undefined ? halo.a : 1})`;
                setFontHaloColor(haloHex);
                setFontHaloSize(hSize);
                setFontHaloOpacity(halo.a !== undefined ? halo.a : 1);
            } else {
                setFontHaloEnabled(false);
                setFontHaloColor('rgba(255,255,255,1)');
                setFontHaloSize(1);
                setFontHaloOpacity(1);
            }

            // Announce editor opened for screen readers
            announce('Text style editor opened. Use Tab to navigate between controls.');
        } catch (err) {
            console.error('Error initializing text style editor:', err);
        }
    }, [currentTextSymbol, show, graphic]);

    const updateText = (newText: string) => {
        if (isClosingRef.current) return;
        setText(newText);
        if (!symbol) return;
        const updated = symbol.clone();
        updated.text = newText;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const updateFontFamily = (newFamily: string) => {
        if (isClosingRef.current) return;
        setFontFamily(newFamily);
        if (!symbol) return;
        const updated = symbol.clone();
        const f = new Font({
            family: newFamily,
            size: fontSize,
            weight: fontWeight as "normal" | "bold" | "bolder" | "lighter",
            style: fontStyle as "normal" | "italic" | "oblique",
            decoration: fontDecoration as "none" | "underline" | "line-through"
        });
        updated.font = f;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(`Font changed to ${newFamily}`);
    };

    const updateFontSize = (newSize: number) => {
        if (isClosingRef.current) return;
        setFontSize(newSize);
        if (!symbol) return;
        const updated = symbol.clone();
        const f = new Font({
            family: fontFamily,
            size: newSize,
            weight: fontWeight as "normal" | "bold" | "bolder" | "lighter",
            style: fontStyle as "normal" | "italic" | "oblique",
            decoration: fontDecoration as "none" | "underline" | "line-through"
        });
        updated.font = f;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const parseColorToRgba = (colorStr: string): { r: number; g: number; b: number; a: number } => {
        let r = 0, g = 0, b = 0, a = 1;
        if (colorStr.startsWith('#')) {
            const hex = colorStr.slice(1);
            if (hex.length === 6 || hex.length === 8) {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
                if (hex.length === 8) {
                    a = parseInt(hex.slice(6, 8), 16) / 255;
                }
            }
        } else if (colorStr.startsWith('rgba')) {
            const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                r = parseInt(match[1], 10);
                g = parseInt(match[2], 10);
                b = parseInt(match[3], 10);
                a = match[4] ? parseFloat(match[4]) : 1;
            }
        } else if (colorStr.startsWith('rgb')) {
            const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                r = parseInt(match[1], 10);
                g = parseInt(match[2], 10);
                b = parseInt(match[3], 10);
            }
        }
        return { r, g, b, a };
    };

    const updateFontColor = (newColor: string) => {
        if (isClosingRef.current) return;
        setFontColor(newColor);
        if (!symbol) return;
        const updated = symbol.clone();
        const { r, g, b } = parseColorToRgba(newColor);
        updated.color = new Color([r, g, b, fontOpacity]);
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(`Font color changed to ${newColor}`);
    };

    const updateFontOpacity = (newOpacity: number) => {
        setFontOpacity(newOpacity);
        if (!symbol) return;
        const updated = symbol.clone();
        const { r, g, b } = parseColorToRgba(fontColor);
        updated.color = new Color([r, g, b, newOpacity]);
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const updateFontWeight = (newWeight: string) => {
        setFontWeight(newWeight);
        if (!symbol) return;
        const updated = symbol.clone();
        const f = new Font({
            family: fontFamily,
            size: fontSize,
            weight: newWeight as "normal" | "bold" | "bolder" | "lighter",
            style: fontStyle as "normal" | "italic" | "oblique",
            decoration: fontDecoration as "none" | "underline" | "line-through"
        });
        updated.font = f;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(newWeight === 'bold' ? 'Bold enabled' : 'Bold disabled');
    };

    const updateFontStyle = (newStyle: string) => {
        setFontStyle(newStyle);
        if (!symbol) return;
        const updated = symbol.clone();
        const f = new Font({
            family: fontFamily,
            size: fontSize,
            weight: fontWeight as "normal" | "bold" | "bolder" | "lighter",
            style: newStyle as "normal" | "italic" | "oblique",
            decoration: fontDecoration as "none" | "underline" | "line-through"
        });
        updated.font = f;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(newStyle === 'italic' ? 'Italic enabled' : 'Italic disabled');
    };

    const updateFontDecoration = (newDecoration: string) => {
        setFontDecoration(newDecoration);
        if (!symbol) return;
        const updated = symbol.clone();
        const f = new Font({
            family: fontFamily,
            size: fontSize,
            weight: fontWeight as "normal" | "bold" | "bolder" | "lighter",
            style: fontStyle as "normal" | "italic" | "oblique",
            decoration: newDecoration as "none" | "underline" | "line-through"
        });
        updated.font = f;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(newDecoration === 'underline' ? 'Underline enabled' : 'Underline disabled');
    };

    const updateFontRotation = (newRotation: number) => {
        setFontRotation(newRotation);
        if (!symbol) return;
        const updated = symbol.clone();
        updated.angle = newRotation;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const updateHorizontalAlignment = (newAlign: 'left' | 'center' | 'right') => {
        setHorizontalAlignment(newAlign);
        if (!symbol) return;
        const updated = symbol.clone();
        updated.horizontalAlignment = newAlign;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(`Horizontal alignment set to ${newAlign}`);
    };

    const updateVerticalAlignment = (newAlign: 'top' | 'middle' | 'bottom' | 'baseline') => {
        setVerticalAlignment(newAlign);
        if (!symbol) return;
        const updated = symbol.clone();
        updated.verticalAlignment = newAlign;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(`Vertical alignment set to ${newAlign}`);
    };

    const updateBackgroundColor = (newColor: string) => {
        setFontBackgroundColor(newColor);
        if (!symbol) return;
        const updated = symbol.clone();
        const { r, g, b, a } = parseColorToRgba(newColor);
        if (a === 0) {
            updated.backgroundColor = null;
        } else {
            updated.backgroundColor = new Color([r, g, b, a]);
        }
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(a === 0 ? 'Background color removed' : `Background color changed`);
    };

    const updateFontHaloEnabled = (enabled: boolean) => {
        if (isClosingRef.current) return;
        setFontHaloEnabled(enabled);
        setHaloDetailsOpen(enabled);
        if (!symbol) return;
        const updated = symbol.clone();
        if (enabled) {
            const { r, g, b, a } = parseColorToRgba(fontHaloColor);
            updated.haloColor = new Color([r, g, b, a]);
            updated.haloSize = fontHaloSize;
        } else {
            updated.haloColor = null;
            updated.haloSize = 0;
        }
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
        announce(enabled ? 'Text halo enabled' : 'Text halo disabled');
    };

    const updateFontHaloColor = (newColor: string) => {
        if (isClosingRef.current) return;
        setFontHaloColor(newColor);
        if (!symbol || !fontHaloEnabled) return;
        const updated = symbol.clone();
        const { r, g, b, a } = parseColorToRgba(newColor);
        updated.haloColor = new Color([r, g, b, a]);
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const updateFontHaloSize = (newSize: number) => {
        if (isClosingRef.current) return;
        setFontHaloSize(newSize);
        if (!symbol || !fontHaloEnabled) return;
        const updated = symbol.clone();
        updated.haloSize = newSize;
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const updateFontHaloOpacity = (newOpacity: number) => {
        if (isClosingRef.current) return;
        setFontHaloOpacity(newOpacity);
        if (!symbol || !fontHaloEnabled) return;
        const updated = symbol.clone();
        const { r, g, b } = parseColorToRgba(fontHaloColor);
        updated.haloColor = new Color([r, g, b, newOpacity]);
        setSymbol(updated);
        updateSymbol(updated);
        setHasChanges(true);
    };

    const handleApplyClose = () => {
        isClosingRef.current = true;
        announce('Text style editor closed. Changes applied.');
        onClose();
    };

    if (!show) {
        return null;
    }

    // Shared label style
    const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#374151', fontWeight: 500 };

    return (
        <div
            ref={editorRef}
            id={ids.editorPanel}
            className="text-style-editor w-100"
            aria-label="Text Style Editor"
            aria-describedby={`${ids.editorPanel}-desc`}
            style={{ boxSizing: 'border-box' }}
        >
            {/* Screen reader only description */}
            <div id={`${ids.editorPanel}-desc`} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                Text style editor panel. Configure font, size, color, alignment, and effects for your text label. Press Escape to close and apply changes.
            </div>

            {/* Live region for announcements */}
            <div
                id={ids.liveRegion}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
                {announcement}
            </div>

            {/* Action bar — uses div role=button to avoid jimu button CSS overrides */}
            <div
                style={{
                    marginBottom: '12px',
                    padding: '0',
                    background: '#fff',
                    position: 'relative',
                    zIndex: 5
                }}
            >
                <div
                    id={ids.applyButton}
                    role="button"
                    tabIndex={0}
                    onClick={handleApplyClose}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleApplyClose(); } }}
                    aria-label="Apply all text style changes and close the editor"
                    title="Apply all changes and close this editor (Escape)"
                    style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                        backgroundColor: '#0066cc',
                        border: '2px solid #0055aa',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        textAlign: 'center' as const,
                        lineHeight: '1.4',
                        boxSizing: 'border-box' as const,
                        userSelect: 'none' as const,
                        WebkitUserSelect: 'none' as const
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0055aa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0066cc'; }}
                >
                    ✓ Apply &amp; Close
                </div>
            </div>

            {/* Label text input section */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Label Text Configuration
                </legend>
                <div style={{ marginBottom: '0' }}>
                    <label
                        htmlFor={ids.labelTextInput}
                        className="d-block"
                        style={{ marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#1f2937' }}
                    >
                        Label Text
                        <span className="sr-only"> - Enter the text content for your map label</span>
                    </label>
                    <span id={ids.labelTextDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                        Enter the text you want to display on the map. Spaces are preserved. Current length is {text.length} characters with {text.split(' ').length - 1} spaces.
                    </span>
                    <input
                        ref={firstFocusableRef}
                        id={ids.labelTextInput}
                        type="text"
                        className="form-control"
                        value={text}
                        placeholder="Your Text Here"
                        onChange={e => {
                            const rawValue = e.target.value;
                            updateText(rawValue);
                        }}
                        onKeyDown={e => {
                            if (e.key === ' ' || e.key === 'Spacebar') {
                                e.preventDefault();
                                const input = e.currentTarget;
                                const start = input.selectionStart || 0;
                                const end = input.selectionEnd || 0;
                                const newText = text.substring(0, start) + ' ' + text.substring(end);
                                updateText(newText);
                                setTimeout(() => {
                                    input.selectionStart = input.selectionEnd = start + 1;
                                }, 0);
                            }
                        }}
                        aria-label="Label text input"
                        aria-describedby={`${ids.labelTextDesc} ${ids.labelTextHint}`}
                        aria-required="false"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        title="Enter the text content for your map label. Spaces are preserved."
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '13px',
                            whiteSpace: 'pre',
                            fontFamily: 'monospace',
                            backgroundColor: '#fff'
                        }}
                    />
                    <small
                        id={ids.labelTextHint}
                        style={{ fontSize: '10px', marginTop: '3px', lineHeight: '1.2', color: '#9ca3af', display: 'block' }}
                        aria-live="polite"
                    >
                        Length: {text.length} | Spaces: {text.split(' ').length - 1}
                    </small>
                </div>
            </fieldset>

            {/* Font family selection */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Font Family Selection
                </legend>
                <div className="w-100 d-flex align-items-center">
                    <label
                        htmlFor={ids.fontFamilySelect}
                        className="mr-2"
                        style={{ ...labelStyle, minWidth: '35px' }}
                    >
                        Font:
                        <span className="sr-only"> - Select a font family for the text</span>
                    </label>
                    <span id={ids.fontFamilyDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                        Choose a typeface from the available font families. Current selection is {fontFamily}.
                    </span>
                    <Select
                        id={ids.fontFamilySelect}
                        size="sm"
                        value={fontFamily}
                        onChange={e => updateFontFamily(e.target.value)}
                        className="flex-grow-1"
                        aria-label={`Font family selector, currently ${fontFamily}`}
                        aria-describedby={ids.fontFamilyDesc}
                        title="Select font family for the label text"
                        style={{ fontSize: '12px' }}
                    >
                        <Option value="Alegreya" aria-label="Alegreya font">Alegreya</Option>
                        <Option value="Arial" aria-label="Arial font">Arial</Option>
                        <Option value="Avenir Next LT Pro" aria-label="Avenir Next font">Avenir Next</Option>
                        <Option value="Josefin Slab" aria-label="Josefin Slab font">Josefin Slab</Option>
                        <Option value="Merriweather" aria-label="Merriweather font">Merriweather</Option>
                        <Option value="Montserrat" aria-label="Montserrat font">Montserrat</Option>
                        <Option value="Noto Sans" aria-label="Noto Sans font">Noto Sans</Option>
                        <Option value="Noto Serif" aria-label="Noto Serif font">Noto Serif</Option>
                        <Option value="Playfair Display" aria-label="Playfair Display font">Playfair Display</Option>
                        <Option value="Roboto" aria-label="Roboto font">Roboto</Option>
                        <Option value="Ubuntu" aria-label="Ubuntu font">Ubuntu</Option>
                    </Select>
                </div>
            </fieldset>

            {/* Color, Size, and Style formatting section */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Font Color, Size, and Style Controls
                </legend>
                <div
                    className="w-100 d-flex flex-wrap align-items-center"
                    style={{ gap: '6px' }}
                >
                    {/* Font Color Picker */}
                    <div role="group" aria-labelledby={ids.fontColorDesc}>
                        <span id={ids.fontColorDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Font color picker. Current color is {fontColor}. Opens color selection dialog.
                        </span>
                        <ColorPicker
                            className="fontcolorpicker"
                            title={`Font color: ${fontColor}. Click to change the text color.`}
                            style={{ padding: '0' }}
                            width={24}
                            height={24}
                            color={fontColor || 'rgba(0,0,0,1)'}
                            onChange={updateFontColor}
                            aria-label={`Font color picker, current color ${fontColor}`}
                            aria-describedby={ids.fontColorDesc}
                            aria-haspopup="dialog"
                        />
                    </div>

                    {/* Font Size Input */}
                    <div role="group" aria-labelledby={ids.fontSizeDesc}>
                        <span id={ids.fontSizeDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Font size in points. Enter a value between 1 and 120. Current size is {fontSize} points.
                        </span>
                        <NumericInput
                            id={ids.fontSizeInput}
                            size="sm"
                            className="fontsizeinput"
                            style={{ width: '4.5rem' }}
                            value={fontSize}
                            min={1}
                            max={120}
                            showHandlers={true}
                            onChange={updateFontSize}
                            aria-label={`Font size in points, current value ${fontSize}`}
                            aria-describedby={ids.fontSizeDesc}
                            aria-valuemin={1}
                            aria-valuemax={120}
                            aria-valuenow={fontSize}
                            title={`Font size: ${fontSize}pt. Use arrow keys or type to adjust (1-120).`}
                        />
                    </div>

                    {/* Visual separator */}
                    <div
                        style={{ borderRight: '1px solid #ccc', height: '24px' }}
                        role="separator"
                        aria-orientation="vertical"
                        aria-hidden="true"
                    />

                    {/* Font Style Buttons - Bold, Italic, Underline */}
                    <div
                        role="group"
                        aria-label="Font style options: bold, italic, and underline toggles"
                        id={ids.fontStyleGroup}
                    >
                        <span id={ids.fontStyleDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Toggle buttons for text formatting. Bold is {fontWeight === 'bold' ? 'enabled' : 'disabled'}.
                            Italic is {fontStyle === 'italic' ? 'enabled' : 'disabled'}.
                            Underline is {fontDecoration === 'underline' ? 'enabled' : 'disabled'}.
                        </span>
                        <AdvancedButtonGroup size="sm" aria-describedby={ids.fontStyleDesc}>
                            <Button
                                icon
                                size="sm"
                                active={fontWeight === 'bold'}
                                aria-pressed={fontWeight === 'bold'}
                                aria-label={`Bold text, currently ${fontWeight === 'bold' ? 'enabled' : 'disabled'}. Press to toggle.`}
                                title={`Bold (${fontWeight === 'bold' ? 'On' : 'Off'}). Click to ${fontWeight === 'bold' ? 'disable' : 'enable'} bold formatting.`}
                                onClick={() => updateFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                                style={fontWeight === 'bold' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={fsBoldIcon} size="s" aria-hidden="true" color={fontWeight === 'bold' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={fontStyle === 'italic'}
                                aria-pressed={fontStyle === 'italic'}
                                aria-label={`Italic text, currently ${fontStyle === 'italic' ? 'enabled' : 'disabled'}. Press to toggle.`}
                                title={`Italic (${fontStyle === 'italic' ? 'On' : 'Off'}). Click to ${fontStyle === 'italic' ? 'disable' : 'enable'} italic formatting.`}
                                onClick={() => updateFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                                style={fontStyle === 'italic' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={fItalicIcon} size="s" aria-hidden="true" color={fontStyle === 'italic' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={fontDecoration === 'underline'}
                                aria-pressed={fontDecoration === 'underline'}
                                aria-label={`Underline text, currently ${fontDecoration === 'underline' ? 'enabled' : 'disabled'}. Press to toggle.`}
                                title={`Underline (${fontDecoration === 'underline' ? 'On' : 'Off'}). Click to ${fontDecoration === 'underline' ? 'disable' : 'enable'} underline formatting.`}
                                onClick={() => updateFontDecoration(fontDecoration === 'underline' ? 'none' : 'underline')}
                                style={fontDecoration === 'underline' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={fUnderlineIcon} width={11} aria-hidden="true" color={fontDecoration === 'underline' ? '#4338ca' : undefined} />
                            </Button>
                        </AdvancedButtonGroup>
                    </div>
                </div>
            </fieldset>

            {/* Opacity and Rotation section */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Opacity and Rotation Controls
                </legend>
                <div
                    className="w-100 d-flex justify-content-between align-items-center"
                    style={{ gap: '10px' }}
                >
                    {/* Opacity control */}
                    <div className="d-flex align-items-center" style={{ flex: '1' }} role="group" aria-labelledby={ids.opacityDesc}>
                        <label
                            htmlFor={ids.opacityInput}
                            style={{ ...labelStyle, marginRight: '4px', minWidth: '50px' }}
                        >
                            Opacity:
                        </label>
                        <span id={ids.opacityDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Text opacity percentage. 0 is fully transparent, 100 is fully opaque. Current value is {Math.round(fontOpacity * 100)} percent.
                        </span>
                        <NumericInput
                            id={ids.opacityInput}
                            size="sm"
                            style={{ width: '55px' }}
                            value={Math.round(fontOpacity * 100)}
                            min={0}
                            max={100}
                            step={5}
                            showHandlers={true}
                            onChange={value => updateFontOpacity(value / 100)}
                            aria-label={`Font opacity percentage, current value ${Math.round(fontOpacity * 100)} percent`}
                            aria-describedby={ids.opacityDesc}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(fontOpacity * 100)}
                            title={`Opacity: ${Math.round(fontOpacity * 100)}%. Adjust transparency from 0% (invisible) to 100% (solid).`}
                        />
                    </div>

                    {/* Rotation control */}
                    <div className="d-flex align-items-center" style={{ flex: '1' }} role="group" aria-labelledby={ids.rotationDesc}>
                        <label
                            htmlFor={ids.rotationInput}
                            style={{ ...labelStyle, marginRight: '4px', minWidth: '55px' }}
                        >
                            Rotation:
                        </label>
                        <span id={ids.rotationDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Text rotation angle in degrees. Negative values rotate counterclockwise, positive values rotate clockwise. Range is -360 to 360 degrees. Current value is {fontRotation} degrees.
                        </span>
                        <NumericInput
                            id={ids.rotationInput}
                            size="sm"
                            style={{ width: '60px' }}
                            value={fontRotation}
                            showHandlers={true}
                            min={-360}
                            max={360}
                            onChange={updateFontRotation}
                            aria-label={`Text rotation in degrees, current value ${fontRotation} degrees`}
                            aria-describedby={ids.rotationDesc}
                            aria-valuemin={-360}
                            aria-valuemax={360}
                            aria-valuenow={fontRotation}
                            title={`Rotation: ${fontRotation}°. Adjust angle from -360° to 360°. Positive rotates clockwise.`}
                        />
                    </div>
                </div>
            </fieldset>

            {/* Alignment section */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Text Alignment Controls
                </legend>
                <div className="w-100 d-flex justify-content-between align-items-center">
                    {/* Horizontal Alignment */}
                    <div
                        role="radiogroup"
                        aria-label="Horizontal text alignment"
                        aria-describedby={ids.hAlignDesc}
                        id={ids.hAlignGroup}
                    >
                        <span id={ids.hAlignDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Choose horizontal alignment for text. Options are left, center, or right. Currently set to {horizontalAlignment}.
                        </span>
                        <AdvancedButtonGroup size="sm">
                            <Button
                                icon
                                size="sm"
                                active={horizontalAlignment === 'left'}
                                role="radio"
                                aria-checked={horizontalAlignment === 'left'}
                                aria-label={`Align left${horizontalAlignment === 'left' ? ', selected' : ''}`}
                                title={`Align Left${horizontalAlignment === 'left' ? ' (Current)' : ''}. Position text to the left.`}
                                onClick={() => updateHorizontalAlignment('left')}
                                style={horizontalAlignment === 'left' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={hAlignLeft} size="s" aria-hidden="true" color={horizontalAlignment === 'left' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={horizontalAlignment === 'center'}
                                role="radio"
                                aria-checked={horizontalAlignment === 'center'}
                                aria-label={`Align center${horizontalAlignment === 'center' ? ', selected' : ''}`}
                                title={`Align Center${horizontalAlignment === 'center' ? ' (Current)' : ''}. Position text in the center.`}
                                onClick={() => updateHorizontalAlignment('center')}
                                style={horizontalAlignment === 'center' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={hAlignCenter} size="s" aria-hidden="true" color={horizontalAlignment === 'center' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={horizontalAlignment === 'right'}
                                role="radio"
                                aria-checked={horizontalAlignment === 'right'}
                                aria-label={`Align right${horizontalAlignment === 'right' ? ', selected' : ''}`}
                                title={`Align Right${horizontalAlignment === 'right' ? ' (Current)' : ''}. Position text to the right.`}
                                onClick={() => updateHorizontalAlignment('right')}
                                style={horizontalAlignment === 'right' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={hAlignRight} size="s" aria-hidden="true" color={horizontalAlignment === 'right' ? '#4338ca' : undefined} />
                            </Button>
                        </AdvancedButtonGroup>
                    </div>

                    {/* Visual separator */}
                    <div
                        style={{ borderRight: '1px solid #ccc', height: '24px' }}
                        role="separator"
                        aria-orientation="vertical"
                        aria-hidden="true"
                    />

                    {/* Vertical Alignment */}
                    <div
                        role="radiogroup"
                        aria-label="Vertical text alignment"
                        aria-describedby={ids.vAlignDesc}
                        id={ids.vAlignGroup}
                    >
                        <span id={ids.vAlignDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Choose vertical alignment for text. Options are baseline, top, middle, or bottom. Currently set to {verticalAlignment}.
                        </span>
                        <AdvancedButtonGroup size="sm">
                            <Button
                                icon
                                size="sm"
                                active={verticalAlignment === 'baseline'}
                                role="radio"
                                aria-checked={verticalAlignment === 'baseline'}
                                aria-label={`Align to baseline${verticalAlignment === 'baseline' ? ', selected' : ''}`}
                                title={`Baseline Alignment${verticalAlignment === 'baseline' ? ' (Current)' : ''}. Align text to the font baseline.`}
                                onClick={() => updateVerticalAlignment('baseline')}
                                style={verticalAlignment === 'baseline' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={vAlignBase} size="s" aria-hidden="true" color={verticalAlignment === 'baseline' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={verticalAlignment === 'top'}
                                role="radio"
                                aria-checked={verticalAlignment === 'top'}
                                aria-label={`Align to top${verticalAlignment === 'top' ? ', selected' : ''}`}
                                title={`Top Alignment${verticalAlignment === 'top' ? ' (Current)' : ''}. Position text at the top.`}
                                onClick={() => updateVerticalAlignment('top')}
                                style={verticalAlignment === 'top' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={vAlignTop} size="s" aria-hidden="true" color={verticalAlignment === 'top' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={verticalAlignment === 'middle'}
                                role="radio"
                                aria-checked={verticalAlignment === 'middle'}
                                aria-label={`Align to middle${verticalAlignment === 'middle' ? ', selected' : ''}`}
                                title={`Middle Alignment${verticalAlignment === 'middle' ? ' (Current)' : ''}. Center text vertically.`}
                                onClick={() => updateVerticalAlignment('middle')}
                                style={verticalAlignment === 'middle' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={vAlignMid} size="s" aria-hidden="true" color={verticalAlignment === 'middle' ? '#4338ca' : undefined} />
                            </Button>
                            <Button
                                icon
                                size="sm"
                                active={verticalAlignment === 'bottom'}
                                role="radio"
                                aria-checked={verticalAlignment === 'bottom'}
                                aria-label={`Align to bottom${verticalAlignment === 'bottom' ? ', selected' : ''}`}
                                title={`Bottom Alignment${verticalAlignment === 'bottom' ? ' (Current)' : ''}. Position text at the bottom.`}
                                onClick={() => updateVerticalAlignment('bottom')}
                                style={verticalAlignment === 'bottom' ? { backgroundColor: '#e0e7ff', borderColor: '#6366f1' } : undefined}
                            >
                                <Icon icon={vAlignBot} size="s" aria-hidden="true" color={verticalAlignment === 'bottom' ? '#4338ca' : undefined} />
                            </Button>
                        </AdvancedButtonGroup>
                    </div>
                </div>
            </fieldset>

            {/* Background and Halo section */}
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 4px', position: 'relative' }}>
                <legend className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    Background Color and Halo Effect Controls
                </legend>

                {/* Halo details — floats above the toggle row */}
                {fontHaloEnabled && haloDetailsOpen && (
                    <div
                        className="d-flex align-items-center flex-wrap"
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            marginBottom: '4px',
                            gap: '12px',
                            padding: '8px 10px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '5px',
                            border: '1px solid #d1d5db',
                            boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
                            zIndex: 10
                        }}
                        role="group"
                        aria-label="Halo style details"
                    >
                        <span id={ids.haloColorDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Halo color. Current: {fontHaloColor}.
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>Color:</label>
                            <div style={{ border: '1px solid #9ca3af', borderRadius: '3px', padding: '1px', lineHeight: 0 }}>
                                <ColorPicker
                                    id={ids.haloColorPicker}
                                    style={{ padding: '0' }}
                                    width={22}
                                    height={22}
                                    color={fontHaloColor}
                                    onChange={updateFontHaloColor}
                                    aria-label={`Halo color picker, current ${fontHaloColor}`}
                                    aria-describedby={ids.haloColorDesc}
                                    aria-haspopup="dialog"
                                    title={`Halo color: ${fontHaloColor}`}
                                />
                            </div>
                        </div>

                        <span id={ids.haloSizeDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Halo size: {fontHaloSize}px.
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>Size:</label>
                            <NumericInput
                                id={ids.haloSizeInput}
                                size="sm"
                                style={{ width: '54px' }}
                                value={fontHaloSize}
                                min={1}
                                max={20}
                                showHandlers={true}
                                onChange={updateFontHaloSize}
                                aria-label={`Halo size ${fontHaloSize}px`}
                                aria-describedby={ids.haloSizeDesc}
                                aria-valuemin={1}
                                aria-valuemax={20}
                                aria-valuenow={fontHaloSize}
                                title={`Halo size: ${fontHaloSize}px`}
                            />
                        </div>

                        <span id={ids.haloOpacityDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Halo opacity: {Math.round(fontHaloOpacity * 100)}%.
                        </span>
                        <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>Opacity:</label>
                            <NumericInput
                                id={ids.haloOpacityInput}
                                size="sm"
                                style={{ width: '54px' }}
                                value={Math.round(fontHaloOpacity * 100)}
                                min={0}
                                max={100}
                                step={5}
                                showHandlers={true}
                                onChange={value => updateFontHaloOpacity(value / 100)}
                                aria-label={`Halo opacity ${Math.round(fontHaloOpacity * 100)}%`}
                                aria-describedby={ids.haloOpacityDesc}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(fontHaloOpacity * 100)}
                                title={`Halo opacity: ${Math.round(fontHaloOpacity * 100)}%`}
                            />
                        </div>
                        {/* Done button to close float */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setHaloDetailsOpen(false)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHaloDetailsOpen(false); } }}
                            aria-label="Close halo settings"
                            title="Close halo settings"
                            style={{
                                marginLeft: 'auto',
                                padding: '3px 12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#374151',
                                backgroundColor: '#fff',
                                border: '1px solid #d1d5db',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                userSelect: 'none' as const,
                                lineHeight: '1.4'
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#e5e7eb'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fff'; }}
                        >
                            Done
                        </div>
                    </div>
                )}

                {/* Background + Halo toggle row */}
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center" role="group" aria-labelledby={ids.bgColorDesc}>
                        <label
                            htmlFor={ids.bgColorPicker}
                            style={{ ...labelStyle, marginRight: '6px' }}
                        >
                            Background:
                        </label>
                        <span id={ids.bgColorDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Background color behind the text. Current setting is {fontBackgroundColor === 'rgba(0,0,0,0)' ? 'transparent (no background)' : fontBackgroundColor}. Opens color selection dialog.
                        </span>
                        <ColorPicker
                            id={ids.bgColorPicker}
                            style={{ padding: '0' }}
                            width={26}
                            height={26}
                            color={fontBackgroundColor === 'rgba(0,0,0,0)' ? '' : fontBackgroundColor}
                            onChange={updateBackgroundColor}
                            aria-label={`Background color picker, currently ${fontBackgroundColor === 'rgba(0,0,0,0)' ? 'transparent' : fontBackgroundColor}`}
                            aria-describedby={ids.bgColorDesc}
                            aria-haspopup="dialog"
                            title={`Background color: ${fontBackgroundColor === 'rgba(0,0,0,0)' ? 'None (transparent)' : fontBackgroundColor}. Click to select a background color for the text.`}
                        />
                    </div>

                    <div className="d-flex align-items-center" style={{ gap: '6px' }} role="group" aria-label="Text halo effect controls">
                        <label
                            htmlFor={ids.haloToggle}
                            style={labelStyle}
                            id={`${ids.haloToggle}-label`}
                        >
                            Halo:
                        </label>
                        <span id={ids.haloToggleDesc} className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                            Enable or disable halo effect around text. Currently {fontHaloEnabled ? 'enabled' : 'disabled'}.
                        </span>
                        <Switch
                            id={ids.haloToggle}
                            size="sm"
                            checked={fontHaloEnabled}
                            onChange={evt => updateFontHaloEnabled(evt.target.checked)}
                            aria-label={`Toggle text halo effect, currently ${fontHaloEnabled ? 'enabled' : 'disabled'}`}
                            aria-describedby={ids.haloToggleDesc}
                            aria-checked={fontHaloEnabled}
                            title={`Halo Effect: ${fontHaloEnabled ? 'On' : 'Off'}`}
                        />
                        {fontHaloEnabled && !haloDetailsOpen && (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setHaloDetailsOpen(true)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHaloDetailsOpen(true); } }}
                                aria-label="Edit halo settings"
                                title="Edit halo settings"
                                style={{
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    color: '#0066cc',
                                    cursor: 'pointer',
                                    userSelect: 'none' as const,
                                    textDecoration: 'underline'
                                }}
                            >
                                Edit
                            </div>
                        )}
                    </div>
                </div>
            </fieldset>

            {/* Skip link for keyboard users - placed at end for logical tab order */}
            <a
                href="#"
                className="sr-only"
                style={{
                    position: 'absolute',
                    left: '-10000px',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden'
                }}
                onFocus={(e) => {
                    e.currentTarget.style.position = 'static';
                    e.currentTarget.style.width = 'auto';
                    e.currentTarget.style.height = 'auto';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.position = 'absolute';
                    e.currentTarget.style.left = '-10000px';
                    e.currentTarget.style.width = '1px';
                    e.currentTarget.style.height = '1px';
                }}
                onClick={(e) => {
                    e.preventDefault();
                    firstFocusableRef.current?.focus();
                }}
            >
                Return to beginning of text editor
            </a>
        </div>
    );
};