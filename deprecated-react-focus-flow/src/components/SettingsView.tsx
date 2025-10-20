import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Settings, SetSettings, View, MovementType, ImportModes } from '../types';
import FormattedText from './common/FormattedText';

// This custom hook calculates and applies the correct position for a tooltip to keep it within the viewport.
// It is now robust against race conditions and correctly handles pointer events.
const useTooltipPositioning = (
    isVisible: boolean,
    triggerRef: React.RefObject<HTMLElement | null>,
    tooltipRef: React.RefObject<HTMLDivElement | null>
) => {
    // Start with a state that is fully hidden and non-interactive.
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none',
    });

    // Encapsulate position calculation logic into a memoized callback.
    const calculateAndSetPosition = useCallback(() => {
        if (!triggerRef.current || !tooltipRef.current) {
            return;
        }

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipEl = tooltipRef.current;
        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;

        // If the tooltip has no size yet, do nothing.
        // The ResizeObserver will trigger this function again when it gets a size.
        if (tooltipWidth === 0 && tooltipHeight === 0) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const PADDING = 16;
        const GAP = 10;

        let left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        left = Math.max(PADDING, left);
        left = Math.min(left, viewportWidth - tooltipWidth - PADDING);

        const spaceAbove = triggerRect.top;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const neededHeight = tooltipHeight + GAP;
        
        let top;
        let initialTransform;

        if (spaceAbove >= neededHeight) {
            top = triggerRect.top - tooltipHeight - GAP;
            initialTransform = 'translateY(10px)';
        } else if (spaceBelow >= neededHeight) {
            top = triggerRect.bottom + GAP;
            initialTransform = 'translateY(-10px)';
        } else {
            if (spaceAbove > spaceBelow) {
                top = Math.max(triggerRect.top - tooltipHeight - GAP, PADDING);
                initialTransform = 'translateY(10px)';
            } else {
                top = Math.min(triggerRect.bottom + GAP, viewportHeight - tooltipHeight - PADDING);
                initialTransform = 'translateY(-10px)';
            }
        }
        
        if (isNaN(top) || isNaN(left)) {
             setStyle(prev => ({ ...prev, top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }));
             return;
        }

        // Set the calculated position, ready for animation.
        setStyle({
            position: 'fixed',
            left: `${left}px`,
            top: `${top}px`,
            opacity: 0,
            transform: initialTransform,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            pointerEvents: 'auto', // It will become interactive after animation.
        });

        // Use rAF to apply the final visible state, triggering the animation.
        requestAnimationFrame(() => {
            setStyle(prev => ({ ...prev, opacity: 1, transform: 'translateY(0)' }));
        });

    }, []); // No dependencies, as it only needs refs which are stable.

    // Effect for showing/hiding
    useLayoutEffect(() => {
        if (isVisible) {
            calculateAndSetPosition();
        } else {
            // When hiding, animate out and make it non-interactive.
            setStyle(prev => ({ 
                ...prev, 
                opacity: 0, 
                transform: 'translateY(10px)', 
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: 'none',
            }));
        }
    }, [isVisible, calculateAndSetPosition]);

    // Effect for observing size changes (fixes the race condition)
    useLayoutEffect(() => {
        const tooltipEl = tooltipRef.current;
        if (!tooltipEl) return;
        
        const observer = new ResizeObserver(() => {
            if (isVisible) {
                calculateAndSetPosition();
            }
        });
        
        observer.observe(tooltipEl);
        
        return () => observer.disconnect();
    }, [tooltipRef, isVisible, calculateAndSetPosition]);

    return style;
};


// --- Reusable InfoTooltip Component (Portal-based) ---
const InfoTooltip: React.FC<{ text: string; ariaLabel: string; onMouseDown: (e: React.MouseEvent) => void; }> = ({ text, ariaLabel, onMouseDown }) => {
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const tooltipStyle = useTooltipPositioning(isVisible, triggerRef, tooltipRef);

    // Click toggles visibility for touch devices
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(prev => !prev);
    };

    // The tooltip content, which will be rendered in a portal.
    const portalContent = (
        <div ref={tooltipRef} className="info-tooltip" style={tooltipStyle}>
            <FormattedText text={text} />
        </div>
    );

    return (
        <>
            <div className="info-tooltip-container">
                <button
                    ref={triggerRef}
                    className="info-tooltip-trigger"
                    aria-label={ariaLabel}
                    onMouseEnter={() => setIsVisible(true)}
                    onMouseLeave={() => setIsVisible(false)}
                    onClick={handleClick}
                    onFocus={() => setIsVisible(true)}
                    onBlur={() => setIsVisible(false)}
                    onMouseDown={onMouseDown} // Propagate the event handler
                >
                    <svg xmlns="http://www.w.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </button>
            </div>
            {/* Ensure createPortal is only called on the client */}
            {typeof document !== 'undefined' && createPortal(portalContent, document.body)}
        </>
    );
};

// [NEW] Custom Confirmation Modal
const ConfirmationModal: React.FC<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    t: (key: string) => string;
}> = ({ title, message, confirmText, onConfirm, onCancel, t }) => {
    return createPortal(
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal-content" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc" onClick={(e) => e.stopPropagation()}>
                <h3 id="modal-title">{title}</h3>
                <p id="modal-desc">{message}</p>
                <div className="modal-actions">
                    <button onClick={onCancel}>{t('cancel')}</button>
                    <button onClick={onConfirm} className="confirm-btn">{confirmText}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Side Panel component for keyboard mode
const SidePanel: React.FC<{ 
    content: { title: string; description: string; info: string; };
}> = ({ content }) => {
    return (
        <aside className="side-panel">
            <div>
                {content.title && <h3 className="side-panel-title">{content.title}</h3>}
                {content.description && <p className="side-panel-description">{content.description}</p>}
                {content.info && (
                    <div className="side-panel-info">
                        <FormattedText text={content.info} />
                    </div>
                )}
            </div>
        </aside>
    );
};

interface SegmentedControlProps {
    path?: keyof Settings | 'taskImportMode' | 'statsImportMode'; // Make path optional
    options: { value: any; label: string }[];
    currentValue: any;
    isKeyboardMode: boolean;
    onChange: (value: any) => void; // Simplified onChange
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, currentValue, isKeyboardMode, onChange }) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const scrollWrapperRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const calculateAndSetTransform = () => {
            const scrollWrapper = scrollWrapperRef.current;
            const innerContainer = innerRef.current;
            
            if (isKeyboardMode && scrollWrapper && innerContainer) {
                const activeIndex = options.findIndex(opt => opt.value === currentValue);
                const activeButton = buttonRefs.current[activeIndex];
                if (!activeButton) return;
    
                const containerWidth = scrollWrapper.offsetWidth;
                const buttonWidth = activeButton.offsetWidth;
                const buttonOffsetLeft = activeButton.offsetLeft;
                
                if (containerWidth === 0) return;

                const containerCenter = containerWidth / 2;
                const buttonCenter = buttonOffsetLeft + buttonWidth / 2;
                const offset = containerCenter - buttonCenter;
                
                innerContainer.style.transform = `translateX(${offset}px)`;
            } else if (innerContainer) {
                // Reset styles for non-keyboard mode
                innerContainer.style.transform = 'translateX(0px)';
            }
        };

        calculateAndSetTransform();

        const scrollWrapperEl = scrollWrapperRef.current;
        if (!scrollWrapperEl) return;
        // Observe both the wrapper and the inner content to recalculate when either changes
        const observer = new ResizeObserver(calculateAndSetTransform);
        observer.observe(scrollWrapperEl);
        if (innerRef.current) {
            observer.observe(innerRef.current);
        }
        
        return () => observer.disconnect();

    }, [isKeyboardMode, currentValue, options]);


    // [FIX] This handler no longer stops propagation. This allows the parent
    // `setting-item` to receive the `mousedown` event, correctly manage focus,
    // and identify the interaction as mouse-driven.
    const handleButtonMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        // e.stopPropagation(); // This was the bug source.
    };

    return (
        <div className="segmented-control">
            <div 
                ref={scrollWrapperRef}
                className="segmented-control-scroll-wrapper"
            >
                <div ref={innerRef} className={`segmented-control-inner ${options.length >= 4 ? 'multi-row-potential' : ''}`}>
                    {options.map(({ value, label }, index) => (
                        <button
                            key={label}
                            ref={el => { buttonRefs.current[index] = el; }}
                            className={currentValue === value ? 'active' : ''}
                            onClick={() => onChange(value)}
                            onMouseDown={handleButtonMouseDown}
                            tabIndex={-1}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface SettingsViewProps {
    t: (key: string, ...args: any[]) => string;
    settings: Settings;
    setSettings: SetSettings;
    setView: (view: View) => void;
    onExport: () => void;
    onImport: (content: string, modes: ImportModes, isFromPaste: boolean) => void;
    backup: string | null;
    onRestore: () => void;
}

const sanitizeNumericInput = (value: string): string => {
    let sanitized = value.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
    const decimalIndex = sanitized.indexOf('.');
    if (decimalIndex !== -1) {
        sanitized = sanitized.substring(0, decimalIndex);
    }
    return sanitized.replace(/[^0-9]/g, '');
};

const settingsData: Record<string, { titleKey: string; descriptionKey: string; infoKey?: string; type?: 'numeric' | 'segmented'; unit?: string; min?: number; max?: number; step?: number; }> = {
    minWorkMins: { titleKey: 'minFocusTime', descriptionKey: 'minFocusTimeDescription', type: 'numeric', unit: 'm', min: 1, max: 180, step: 1 },
    defaultDisplayMode: { titleKey: 'defaultTimerView', descriptionKey: 'defaultTimerViewDescription', type: 'segmented' },
    goalMarkerDivision: { titleKey: 'subgoalQuantile', descriptionKey: 'subgoalQuantileDescription', infoKey: 'subgoalQuantileInfo', type: 'segmented' },
    movementType: { titleKey: 'movementType', descriptionKey: 'movementTypeDescription', infoKey: 'movementTypeInfo', type: 'segmented' },
    secondHandStyle: { titleKey: 'secondHandSubType', descriptionKey: 'secondHandSubTypeDescriptionQuartz' /* Dynamic */, infoKey: 'secondHandSubTypeInfoQuartz' /* Dynamic */, type: 'segmented' },
    theme: { titleKey: 'theme', descriptionKey: 'themeDescription', type: 'segmented' },
    language: { titleKey: 'language', descriptionKey: 'languageDescription', type: 'segmented' },
    firstDayOfWeek: { titleKey: 'firstDayOfWeekTitle', descriptionKey: 'firstDayOfWeekDescription', type: 'segmented' },
    dayCrossoverHour: { titleKey: 'dayCrossoverHourTitle', descriptionKey: 'dayCrossoverHourDescription', infoKey: 'dayCrossoverHourInfo', type: 'numeric', unit: 'h', min: 0, max: 23, step: 1 },
    knobScrollMode: { titleKey: 'knobScrollDirection', descriptionKey: 'knobScrollDirectionInfoShort', infoKey: 'knobScrollDirectionInfo', type: 'segmented' },
    defaultZenMode: { titleKey: 'defaultZenMode', descriptionKey: 'defaultZenModeDescription', type: 'segmented' },
    simpleMode: { titleKey: 'simpleMode', descriptionKey: 'simpleModeDescription', infoKey: 'simpleModeInfo', type: 'segmented' },
    navJitterMode: { titleKey: 'navJitterTitle', descriptionKey: 'navJitterDescription', infoKey: 'navJitterInfo', type: 'segmented' },
    contentJitterMode: { titleKey: 'contentJitterTitle', descriptionKey: 'contentJitterDescription', infoKey: 'contentJitterInfo', type: 'segmented' },
    jitterInterval: { titleKey: 'jitterIntervalTitle', descriptionKey: 'jitterIntervalDescription', type: 'numeric', unit: 's', min: 0, max: 600, step: 5 },
    longPressThreshold: { titleKey: 'longPressThreshold', descriptionKey: 'longPressThresholdDescription', infoKey: 'longPressThresholdInfo', type: 'numeric', unit: 'ms', min: 200, max: 3000, step: 50 },
    legacyPhoneMode: { titleKey: 'legacyPhoneMode', descriptionKey: 'legacyPhoneModeDescription', type: 'segmented' },
    restore: { titleKey: 'restoreDataTitle', descriptionKey: 'restoreDataDescription' },
    loadTestData: { titleKey: 'loadTestDataTitle', descriptionKey: 'loadTestDataDescription' },
};

const segmentedControlSettingsMap: Record<string, { options: any[] }> = {
    defaultDisplayMode: { options: ['count up', 'countdown'] },
    goalMarkerDivision: { options: [0, 4, 3, 6] },
    movementType: { options: ['quartz', 'mechanical'] },
    theme: { options: ['system', 'light', 'dark'] },
    language: { options: ['en', 'zh'] },
    firstDayOfWeek: { options: ['monday', 'sunday'] },
    knobScrollMode: { options: ['natural', 'up_is_increase', 'down_is_increase'] },
    defaultZenMode: { options: [false, true] },
    simpleMode: { options: [false, true] },
    navJitterMode: { options: ['off', 'directional', 'bidirectional'] },
    contentJitterMode: { options: ['off', 'directional', 'bidirectional'] },
    legacyPhoneMode: { options: [false, true] },
    secondHandStyle: { options: [] }
};

// [NEW] Helper to dynamically insert a custom user value into a sorted list of options.
const getDynamicNumericOptions = (
    staticOptions: { value: number; label: string }[],
    currentValue: number,
    unit: string
) => {
    const valueExists = staticOptions.some(opt => opt.value === currentValue);
    if (valueExists) {
        return staticOptions;
    }

    const newOption = { value: currentValue, label: `${currentValue}${unit}` };

    // Find the correct insertion point to keep the array sorted by value.
    const insertIndex = staticOptions.findIndex(opt => opt.value > currentValue);
    
    if (insertIndex === -1) {
        // The new value is larger than all existing options, append it.
        return [...staticOptions, newOption];
    } else {
        // Insert the new option at the correct index.
        const newOptions = [...staticOptions];
        newOptions.splice(insertIndex, 0, newOption);
        return newOptions;
    }
};

const SettingsView: React.FC<SettingsViewProps> = ({ t, settings, setSettings, setView, onExport, onImport, backup, onRestore }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSettingPath, setActiveSettingPath] = useState<string | null>(null);
    const [isKeyboardMode, setIsKeyboardMode] = useState(false);
    const [sidePanelContent, setSidePanelContent] = useState({ title: '', description: '', info: '' });
    const [activeTab, setActiveTab] = useState<'focus' | 'app'>('focus');

    const [minWorkMinsDisplay, setMinWorkMinsDisplay] = useState<string>(() => settings.minWorkMins.toString());
    const [dayCrossoverHourDisplay, setDayCrossoverHourDisplay] = useState<string>(() => settings.dayCrossoverHour.toString());
    const [jitterIntervalDisplay, setJitterIntervalDisplay] = useState<string>(() => settings.jitterInterval.toString());
    const [longPressThresholdDisplay, setLongPressThresholdDisplay] = useState<string>(() => settings.longPressThreshold.toString());
    const timeInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importModes, setImportModes] = useState<ImportModes>({ tasks: 'append', stats: 'add' });
    const [pasteContent, setPasteContent] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isImportUnlocked, setIsImportUnlocked] = useState(false);


    const generateNumericOptions = useCallback((min: number, max: number, step: number, unit: string) => {
        const options = [];
        for (let i = min; i <= max; i += step) {
            options.push({ value: i, label: `${i}${unit}` });
        }
        return options;
    }, []);

    const minWorkMinsOptions = useMemo(() => generateNumericOptions(1, 180, 1, 'm'), [generateNumericOptions]);
    const dayCrossoverHourOptions = useMemo(() => generateNumericOptions(0, 23, 1, 'h'), [generateNumericOptions]);
    const jitterIntervalOptions = useMemo(() => generateNumericOptions(0, 600, 5, 's'), [generateNumericOptions]);
    const longPressThresholdOptions = useMemo(() => generateNumericOptions(200, 3000, 50, 'ms'), [generateNumericOptions]);

    const dynamicMinWorkMinsOptions = useMemo(() => 
        getDynamicNumericOptions(minWorkMinsOptions, settings.minWorkMins, 'm'), 
        [minWorkMinsOptions, settings.minWorkMins]
    );

    const dynamicDayCrossoverHourOptions = useMemo(() =>
        getDynamicNumericOptions(dayCrossoverHourOptions, settings.dayCrossoverHour, 'h'),
        [dayCrossoverHourOptions, settings.dayCrossoverHour]
    );

    const dynamicJitterIntervalOptions = useMemo(() => 
        getDynamicNumericOptions(jitterIntervalOptions, settings.jitterInterval, 's'), 
        [jitterIntervalOptions, settings.jitterInterval]
    );

    const dynamicLongPressThresholdOptions = useMemo(() => 
        getDynamicNumericOptions(longPressThresholdOptions, settings.longPressThreshold, 'ms'), 
        [longPressThresholdOptions, settings.longPressThreshold]
    );


    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.focus();
        }
    }, []);

    useEffect(() => {
        if (activeSettingPath) {
            const data = settingsData[activeSettingPath];
            if (data) {
                let { titleKey, descriptionKey, infoKey } = data;
                if (activeSettingPath === 'secondHandStyle') {
                    descriptionKey = settings.movementType === 'quartz' ? 'secondHandSubTypeDescriptionQuartz' : 'secondHandSubTypeDescriptionMechanical';
                    infoKey = settings.movementType === 'quartz' ? 'secondHandSubTypeInfoQuartz' : 'secondHandSubTypeInfoMechanical';
                }
                setSidePanelContent({
                    title: t(titleKey),
                    description: t(descriptionKey),
                    info: infoKey ? t(infoKey) : ''
                });
            }
        } else {
             setSidePanelContent({
                title: t(activeTab === 'focus' ? 'focusSettingsTab' : 'appSettingsTab'),
                description: t(activeTab === 'focus' ? 'focusSettingsDescription' : 'appSettingsDescription'),
                info: ''
             });
        }
    }, [activeSettingPath, activeTab, t, settings.movementType]);

    const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleBack = () => setView('timer');

    const handleTimePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [hours, minutes] = e.target.value.split(':').map(Number);
        const totalMinutes = (hours * 60) + minutes;
        if (!isNaN(totalMinutes) && totalMinutes >= 1) {
            handleSettingChange('minWorkMins', totalMinutes);
            setMinWorkMinsDisplay(totalMinutes.toString());
        }
    };
    
    const handleMinWorkMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = sanitizeNumericInput(e.target.value);
        setMinWorkMinsDisplay(sanitizedValue);
        const numericValue = parseInt(sanitizedValue, 10);
        if (!isNaN(numericValue) && numericValue >= 1) {
            handleSettingChange('minWorkMins', numericValue);
        }
    };

    const handleMinWorkMinsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseInt(e.target.value, 10);
        if (isNaN(numericValue) || numericValue < 1) {
            handleSettingChange('minWorkMins', 25);
            setMinWorkMinsDisplay('25');
        }
    };

    const openTimePicker = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); 
        try { timeInputRef.current?.showPicker(); } catch (error) { timeInputRef.current?.click(); }
    };

    const handleNumericInputChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>,
        key: keyof Settings,
        min: number,
        max: number
    ) => {
        const sanitizedValue = sanitizeNumericInput(e.target.value);
        setter(sanitizedValue);
        const numericValue = parseInt(sanitizedValue, 10);
        if (!isNaN(numericValue)) {
            handleSettingChange(key, Math.max(min, Math.min(max, numericValue)) as any);
        }
    };
    
    const handleNumericInputBlur = (
        e: React.FocusEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>,
        key: keyof Settings,
        defaultValue: number
    ) => {
        const numericValue = parseInt(e.target.value, 10);
        if (isNaN(numericValue)) {
            handleSettingChange(key, defaultValue as any);
            setter(defaultValue.toString());
        } else {
            // Update display to reflect clamped value if it was out of bounds
            const data = settingsData[key];
            if (data?.type === 'numeric' && data.min !== undefined && data.max !== undefined) {
                 const clampedValue = Math.max(data.min, Math.min(data.max, numericValue));
                 if (clampedValue !== numericValue) {
                     setter(clampedValue.toString());
                 }
            }
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result;
                if (typeof content === 'string') {
                    onImport(content, importModes, false);
                }
            };
            reader.readAsText(file);
        }
        // Reset file input to allow re-uploading the same file
        if (e.target) e.target.value = '';
    };

    const handlePasteImport = () => {
        if (pasteContent.trim()) {
            onImport(pasteContent, importModes, true);
        }
    };

    const executeLoadTestData = async () => {
        try {
            const response = await fetch('/test-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            onImport(data, { tasks: 'overwrite', stats: 'overwrite' }, false);
        } catch (error) {
            console.error("Failed to load test data:", error);
            alert(t('loadTestDataError'));
        }
    };

    const handleLoadTestData = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmLoad = () => {
        executeLoadTestData();
        setShowConfirmModal(false);
    };

    const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const { key } = e;
    
        const isNavigationKey = [' ', 'Tab', 'Enter', 'Escape'].includes(key) || key.startsWith('Arrow');
    
        if (isNavigationKey && !isKeyboardMode) {
            setIsKeyboardMode(true);
        }
    
        const activeElement = document.activeElement as HTMLElement;
    
        if (key === 'Escape') {
            e.preventDefault();
            handleBack();
            return;
        }
    
        if (key.startsWith('Arrow')) {
            e.preventDefault();
    
            if (activeElement?.tagName === 'INPUT' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
                return;
            }
    
            const currentItem = activeElement?.closest('[data-setting-path]') as HTMLElement;
            const allItems = Array.from(containerRef.current?.querySelectorAll('[data-setting-path]:not(.disabled)') || []) as HTMLElement[];
    
            if (key === 'ArrowUp' || key === 'ArrowDown') {
                const currentIndex = allItems.indexOf(currentItem);
                let nextIndex;
    
                if (currentIndex === -1) {
                    nextIndex = 0;
                } else {
                    nextIndex = currentIndex + (key === 'ArrowDown' ? 1 : -1);
                    nextIndex = (nextIndex + allItems.length) % allItems.length;
                }
    
                const nextItem = allItems[nextIndex];
    
                if (nextItem) {
                    const scrollableContainer = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.settings-content-scrollable');
                    if (!scrollableContainer) {
                        nextItem.focus({ preventScroll: true });
                        nextItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        return;
                    }
    
                    const containerRect = scrollableContainer.getBoundingClientRect();
                    const itemRect = nextItem.getBoundingClientRect();
                    const isItemVisible = itemRect.top >= containerRect.top - 1 && itemRect.bottom <= containerRect.bottom + 1;
    
                    if (isItemVisible && currentItem) {
                        nextItem.focus();
                    } else {
                        const getOffsetTopRelativeToContainer = (element: HTMLElement, container: HTMLElement) => {
                            let offsetTop = 0;
                            let currentElement: HTMLElement | null = element;
                            while (currentElement && currentElement !== container) {
                                offsetTop += currentElement.offsetTop;
                                currentElement = currentElement.offsetParent as HTMLElement | null;
                            }
                            return offsetTop;
                        };
    
                        const itemOffsetTop = getOffsetTopRelativeToContainer(nextItem, scrollableContainer);
                        const targetRatio = key === 'ArrowDown' ? 0.75 : 0.25;
                        const itemHeight = nextItem.offsetHeight;
                        const targetOffsetInViewport = (scrollableContainer.clientHeight * targetRatio) - (itemHeight / 2);
                        const desiredScrollTop = itemOffsetTop - targetOffsetInViewport;
    
                        scrollableContainer.scrollTo({
                            top: desiredScrollTop,
                            behavior: 'smooth'
                        });
                        nextItem.focus({ preventScroll: true });
                    }
                }
            }
    
            if (key === 'ArrowLeft' || key === 'ArrowRight') {
                const path = currentItem?.dataset.settingPath as keyof Settings;
                if (!path) return;
    
                const data = settingsData[path];
                let options: any[] = [];
                if (data?.type === 'segmented') {
                    options = path === 'secondHandStyle'
                        ? (settings.movementType === 'quartz' ? ['quartz_tick', 'quartz_sweep'] : ['traditional_escapement', 'high_freq_escapement'])
                        : segmentedControlSettingsMap[path].options;
                } else if (data?.type === 'numeric') {
                    let dynamicOptionsObjects;
                    switch (path) {
                        case 'minWorkMins':
                            dynamicOptionsObjects = getDynamicNumericOptions(minWorkMinsOptions, settings.minWorkMins, 'm');
                            break;
                        case 'dayCrossoverHour':
                            dynamicOptionsObjects = getDynamicNumericOptions(dayCrossoverHourOptions, settings.dayCrossoverHour, 'h');
                            break;
                        case 'jitterInterval':
                            dynamicOptionsObjects = getDynamicNumericOptions(jitterIntervalOptions, settings.jitterInterval, 's');
                            break;
                        case 'longPressThreshold':
                            dynamicOptionsObjects = getDynamicNumericOptions(longPressThresholdOptions, settings.longPressThreshold, 'ms');
                            break;
                        default:
                            dynamicOptionsObjects = [];
                    }
                    options = dynamicOptionsObjects.map(opt => opt.value);
                }
    
                if (options.length > 0) {
                    let currentValue = settings[path] as any;
                    const currentIndex = options.indexOf(currentValue);
                    if (currentIndex === -1) return;

                    const delta = key === 'ArrowLeft' ? -1 : 1;
                    const newIndex = (currentIndex + delta + options.length) % options.length;
                    
                    if (path === 'movementType') {
                        handleMovementTypeChange(options[newIndex]);
                    } else {
                        handleSettingChange(path, options[newIndex]);
                    }
                }
            }
        }
    };
    
    const handleFocus = (e: React.FocusEvent) => {
        const targetItem = (e.target as HTMLElement).closest('[data-setting-path]');
        if (targetItem) {
            setActiveSettingPath(targetItem.getAttribute('data-setting-path'));
        }
    };
    
    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
             setActiveSettingPath(null);
             setIsKeyboardMode(false);
        }
    };
    
    const handleItemMouseDown = (e: React.MouseEvent<HTMLDivElement>, path: string) => {
        e.preventDefault();
        // [FIX] A mouse click should always set keyboard mode to FALSE. This prevents
        // single-display mode from incorrectly appearing on click.
        setIsKeyboardMode(false); 
        (e.currentTarget as HTMLElement).focus();
        setActiveSettingPath(path);
    };

    const handleMouseEnter = (path: string) => {
        setActiveSettingPath(path);
        if(document.activeElement === document.body || !containerRef.current?.contains(document.activeElement)) {
            setIsKeyboardMode(false);
        }
    };

    const handleMouseLeave = () => {
        if (document.activeElement?.closest('[data-setting-path]')) {
             return;
        }
        setActiveSettingPath(null);
    };

    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
             containerRef.current?.focus();
             // [FIX] Clicking the background should also disable keyboard mode.
             setIsKeyboardMode(false);
        }
    };

    // This handler allows clicks on tooltips or inputs to disable keyboard mode
    // without triggering the parent item's focus logic.
    const handleControlMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsKeyboardMode(false);
    };

    const handleMouseMove = () => {
        if (isKeyboardMode) {
            setIsKeyboardMode(false);
        }
    };

    const handleMovementTypeChange = useCallback((newType: MovementType) => {
        if (newType === settings.movementType) return;
        let newSecondHandStyle = settings.secondHandStyle;
        if (newType === 'mechanical') {
            if (newSecondHandStyle === 'quartz_tick') newSecondHandStyle = 'traditional_escapement';
            else if (newSecondHandStyle === 'quartz_sweep') newSecondHandStyle = 'high_freq_escapement';
        } else {
            if (newSecondHandStyle === 'traditional_escapement') newSecondHandStyle = 'quartz_tick';
            else if (newSecondHandStyle === 'high_freq_escapement') newSecondHandStyle = 'quartz_sweep';
        }
        setSettings(prev => ({ ...prev, movementType: newType, secondHandStyle: newSecondHandStyle }));
    }, [settings, setSettings]);
    
    const secondHandOptions = useMemo(() => settings.movementType === 'quartz'
        ? [{ value: 'quartz_tick', label: t('quartzTick') }, { value: 'quartz_sweep', label: t('quartzSweep') }]
        : [{ value: 'traditional_escapement', label: t('traditionalEscapement') }, { value: 'high_freq_escapement', label: t('highFreqEscapement') }],
    [settings.movementType, t]);
    
    return (
        <div 
            className={`settings-view ${isKeyboardMode ? 'keyboard-layout-active' : ''}`}
            ref={containerRef} 
            tabIndex={-1}
            onKeyDown={handleContainerKeyDown}
            onMouseDown={handleContainerMouseDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {showConfirmModal && (
                <ConfirmationModal
                    title={t('loadTestDataTitle')}
                    message={t('loadTestDataConfirm')}
                    confirmText={t('loadTestDataButton')}
                    onConfirm={handleConfirmLoad}
                    onCancel={() => setShowConfirmModal(false)}
                    t={t}
                />
            )}

            <SidePanel content={sidePanelContent} />

            <div className="settings-content-scrollable">
                <div className="settings-tabs">
                    <button className={activeTab === 'focus' ? 'active' : ''} onClick={() => setActiveTab('focus')}>{t('focusSettingsTab')}</button>
                    <button className={activeTab === 'app' ? 'active' : ''} onClick={() => setActiveTab('app')}>{t('appSettingsTab')}</button>
                </div>
                
                {activeTab === 'focus' && (
                    <>
                        <div className="settings-section">
                            <h2>{t('timerCoreTitle')}</h2>
                            <div className="setting-item" data-setting-path="minWorkMins" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "minWorkMins")} onMouseEnter={() => handleMouseEnter("minWorkMins")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('minFocusTime')}</div>
                                    <p className="setting-description">{t('minFocusTimeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    {isKeyboardMode ? (
                                        <SegmentedControl path="minWorkMins" options={dynamicMinWorkMinsOptions} currentValue={settings.minWorkMins} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('minWorkMins', value)} />
                                    ) : (
                                        <div className="input-with-button-wrapper">
                                            <input
                                                type="number" id="min-work-mins" value={minWorkMinsDisplay}
                                                onChange={handleMinWorkMinsChange} onBlur={handleMinWorkMinsBlur}
                                                placeholder="25" min="1" onMouseDown={handleControlMouseDown}
                                            />
                                            <button onClick={openTimePicker} className="time-picker-btn" aria-label={t('openTimePicker')} tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                            </button>
                                            <input type="time" ref={timeInputRef} onChange={handleTimePickerChange} style={{ display: 'none' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="defaultDisplayMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "defaultDisplayMode")} onMouseEnter={() => handleMouseEnter("defaultDisplayMode")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('defaultTimerView')}</div>
                                    <p className="setting-description">{t('defaultTimerViewDescription')}</p>
                                </div>
                                <div className="setting-control">
                                   <SegmentedControl path="defaultDisplayMode" options={[{ value: 'count up', label: t('countUp') },{ value: 'countdown', label: t('countdown') }]} currentValue={settings.defaultDisplayMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('defaultDisplayMode', value)} />
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="goalMarkerDivision" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "goalMarkerDivision")} onMouseEnter={() => handleMouseEnter("goalMarkerDivision")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('subgoalQuantile')}<InfoTooltip text={t('subgoalQuantileInfo')} ariaLabel={t('subgoalQuantileInfo')} onMouseDown={handleControlMouseDown} /></div>
                                    <p className="setting-description">{t('subgoalQuantileDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="goalMarkerDivision" options={[{ value: 0, label: t('none') },{ value: 4, label: '4' },{ value: 3, label: '3' },{ value: 6, label: '6' }]} currentValue={settings.goalMarkerDivision} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('goalMarkerDivision', value)} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h2>{t('clockFaceTitle')}</h2>
                            <div className="setting-item" data-setting-path="movementType" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "movementType")} onMouseEnter={() => handleMouseEnter("movementType")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('movementType')}<InfoTooltip text={t('movementTypeInfo')} ariaLabel={t('movementTypeTooltip')} onMouseDown={handleControlMouseDown} /></div>
                                    <p className="setting-description">{t('movementTypeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="movementType" options={[{ value: 'quartz', label: t('quartz') },{ value: 'mechanical', label: t('mechanical') }]} currentValue={settings.movementType} isKeyboardMode={isKeyboardMode} onChange={(value) => handleMovementTypeChange(value)} />
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="secondHandStyle" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "secondHandStyle")} onMouseEnter={() => handleMouseEnter("secondHandStyle")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('secondHandSubType')}<InfoTooltip text={settings.movementType === 'quartz' ? t('secondHandSubTypeInfoQuartz') : t('secondHandSubTypeInfoMechanical')} ariaLabel={t('secondHandSubTypeTooltip')} onMouseDown={handleControlMouseDown} /></div>
                                     <p className="setting-description">{settings.movementType === 'quartz' ? t('secondHandSubTypeDescriptionQuartz') : t('secondHandSubTypeDescriptionMechanical')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="secondHandStyle" options={secondHandOptions} currentValue={settings.secondHandStyle} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('secondHandStyle', value)} />
                                </div>
                            </div>
                            <div className="setting-item disabled" data-setting-path="realismLevel" tabIndex={-1}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('realismLevel')} <span className="dev-tag">{t('roadmapTitle')}</span></div>
                                    <p className="setting-description">{t('realismLevelDescription')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h2>{t('jitterTitle')}</h2>
                            <div className="setting-item" data-setting-path="navJitterMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "navJitterMode")} onMouseEnter={() => handleMouseEnter("navJitterMode")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('navJitterTitle')}<InfoTooltip text={t('navJitterInfo')} ariaLabel={t('navJitterInfo')} onMouseDown={handleControlMouseDown} /></div>
                                    <p className="setting-description">{t('navJitterDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="navJitterMode" options={[{ value: 'off', label: t('off') },{ value: 'directional', label: t('directional') }, { value: 'bidirectional', label: t('bidirectional') }]} currentValue={settings.navJitterMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('navJitterMode', value)} />
                                </div>
                            </div>
                             <div className="setting-item" data-setting-path="contentJitterMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "contentJitterMode")} onMouseEnter={() => handleMouseEnter("contentJitterMode")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('contentJitterTitle')}<InfoTooltip text={t('contentJitterInfo')} ariaLabel={t('contentJitterInfo')} onMouseDown={handleControlMouseDown} /></div>
                                   <p className="setting-description">{t('contentJitterDescription')}</p>
                               </div>
                               <div className="setting-control">
                                   <SegmentedControl path="contentJitterMode" options={[{ value: 'off', label: t('off') },{ value: 'directional', label: t('directional') }, { value: 'bidirectional', label: t('bidirectional') }]} currentValue={settings.contentJitterMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('contentJitterMode', value)} />
                               </div>
                           </div>
                           <div className={`setting-item ${settings.navJitterMode === 'off' && settings.contentJitterMode === 'off' ? 'disabled' : ''}`} data-setting-path="jitterInterval" tabIndex={settings.navJitterMode === 'off' && settings.contentJitterMode === 'off' ? -1 : 0} onMouseDown={(e) => handleItemMouseDown(e, "jitterInterval")} onMouseEnter={() => handleMouseEnter("jitterInterval")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('jitterIntervalTitle')}</div>
                                   <p className="setting-description">{t('jitterIntervalDescription')}</p>
                               </div>
                               <div className="setting-control">
                                   {isKeyboardMode ? (
                                       <SegmentedControl path="jitterInterval" options={dynamicJitterIntervalOptions} currentValue={settings.jitterInterval} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('jitterInterval', value)} />
                                   ) : (
                                       <input
                                           type="number" id="jitter-interval" value={jitterIntervalDisplay}
                                           onChange={(e) => handleNumericInputChange(e, setJitterIntervalDisplay, 'jitterInterval', 0, 600)}
                                           onBlur={(e) => handleNumericInputBlur(e, setJitterIntervalDisplay, 'jitterInterval', 30)}
                                           placeholder="30" min="0" onMouseDown={handleControlMouseDown}
                                       />
                                   )}
                               </div>
                           </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'app' && (
                    <>
                        <div className="settings-section">
                            <h2>{t('interfaceTitle')}</h2>
                             <div className="setting-item" data-setting-path="theme" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "theme")} onMouseEnter={() => handleMouseEnter("theme")}>
                                <div className="setting-text">
                                   <div className="setting-label">{t('theme')}</div>
                                   <p className="setting-description">{t('themeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="theme" options={[{ value: 'system', label: t('themeSystem') },{ value: 'light', label: t('themeLight') },{ value: 'dark', label: t('themeDark') }]} currentValue={settings.theme} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('theme', value)} />
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="language" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "language")} onMouseEnter={() => handleMouseEnter("language")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('language')}</div>
                                   <p className="setting-description">{t('languageDescription')}</p>
                                </div>
                               <div className="setting-control">
                                   <SegmentedControl path="language" options={[{ value: 'en', label: 'English' },{ value: 'zh', label: '中文' }]} currentValue={settings.language} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('language', value)} />
                               </div>
                           </div>
                            <div className="setting-item" data-setting-path="firstDayOfWeek" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "firstDayOfWeek")} onMouseEnter={() => handleMouseEnter("firstDayOfWeek")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('firstDayOfWeekTitle')}</div>
                                    <p className="setting-description">{t('firstDayOfWeekDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl path="firstDayOfWeek" options={[{ value: 'monday', label: t('monday') }, { value: 'sunday', label: t('sunday') }]} currentValue={settings.firstDayOfWeek} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('firstDayOfWeek', value)} />
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="dayCrossoverHour" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "dayCrossoverHour")} onMouseEnter={() => handleMouseEnter("dayCrossoverHour")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('dayCrossoverHourTitle')}<InfoTooltip text={t('dayCrossoverHourInfo')} ariaLabel={t('dayCrossoverHourInfo')} onMouseDown={handleControlMouseDown} /></div>
                                    <p className="setting-description">{t('dayCrossoverHourDescription')}</p>
                                </div>
                                <div className="setting-control">
                                   {isKeyboardMode ? (
                                       <SegmentedControl path="dayCrossoverHour" options={dynamicDayCrossoverHourOptions} currentValue={settings.dayCrossoverHour} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('dayCrossoverHour', value)} />
                                   ) : (
                                       <input
                                           type="number" id="day-crossover-hour" value={dayCrossoverHourDisplay}
                                           onChange={(e) => handleNumericInputChange(e, setDayCrossoverHourDisplay, 'dayCrossoverHour', 0, 23)}
                                           onBlur={(e) => handleNumericInputBlur(e, setDayCrossoverHourDisplay, 'dayCrossoverHour', 4)}
                                           placeholder="4" min="0" max="23" onMouseDown={handleControlMouseDown}
                                       />
                                   )}
                                </div>
                            </div>
                            <div className="setting-item" data-setting-path="defaultZenMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "defaultZenMode")} onMouseEnter={() => handleMouseEnter("defaultZenMode")}>
                                <div className="setting-text">
                                   <div className="setting-label">{t('defaultZenMode')}</div>
                                   <p className="setting-description">{t('defaultZenModeDescription')}</p>
                                </div>
                               <div className="setting-control">
                                   <SegmentedControl path="defaultZenMode" options={[{ value: false, label: t('off') },{ value: true, label: t('on') }]} currentValue={settings.defaultZenMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('defaultZenMode', value)} />
                               </div>
                           </div>
                           <div className="setting-item" data-setting-path="simpleMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "simpleMode")} onMouseEnter={() => handleMouseEnter("simpleMode")}>
                                <div className="setting-text">
                                   <div className="setting-label">{t('simpleMode')}<InfoTooltip text={t('simpleModeInfo')} ariaLabel={t('simpleModeInfo')} onMouseDown={handleControlMouseDown} /></div>
                                   <p className="setting-description">{t('simpleModeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                   <SegmentedControl path="simpleMode" options={[{ value: false, label: t('off') },{ value: true, label: t('on') }]} currentValue={settings.simpleMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('simpleMode', value)} />
                                </div>
                            </div>
                       </div>
                       
                        <div className="settings-section">
                           <h2>{t('advancedTitle')}</h2>
                           <div className="setting-item" data-setting-path="knobScrollMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "knobScrollMode")} onMouseEnter={() => handleMouseEnter("knobScrollMode")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('knobScrollDirection')}<InfoTooltip text={t('knobScrollDirectionInfo')} ariaLabel={t('knobScrollDirectionInfo')} onMouseDown={handleControlMouseDown} /></div>
                                   <p className="setting-description">{t('knobScrollDirectionInfoShort')}</p>
                               </div>
                               <div className="setting-control">
                                  <SegmentedControl path="knobScrollMode" options={[{ value: 'natural', label: t('natural') }, { value: 'up_is_increase', label: t('upIncreases') }, { value: 'down_is_increase', label: t('downIncreases') }]} currentValue={settings.knobScrollMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('knobScrollMode', value)} />
                               </div>
                           </div>
                           <div className="setting-item" data-setting-path="longPressThreshold" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "longPressThreshold")} onMouseEnter={() => handleMouseEnter("longPressThreshold")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('longPressThreshold')}<InfoTooltip text={t('longPressThresholdInfo')} ariaLabel={t('longPressThresholdInfo')} onMouseDown={handleControlMouseDown} /></div>
                                   <p className="setting-description">{t('longPressThresholdDescription')}</p>
                               </div>
                               <div className="setting-control">
                                  {isKeyboardMode ? (
                                       <SegmentedControl path="longPressThreshold" options={dynamicLongPressThresholdOptions} currentValue={settings.longPressThreshold} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('longPressThreshold', value)} />
                                   ) : (
                                       <input
                                           type="number" id="long-press-threshold" value={longPressThresholdDisplay}
                                           onChange={(e) => handleNumericInputChange(e, setLongPressThresholdDisplay, 'longPressThreshold', 200, 3000)}
                                           onBlur={(e) => handleNumericInputBlur(e, setLongPressThresholdDisplay, 'longPressThreshold', 700)}
                                           placeholder="700" min="200" onMouseDown={handleControlMouseDown}
                                       />
                                   )}
                               </div>
                           </div>
                           <div className="setting-item" data-setting-path="legacyPhoneMode" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "legacyPhoneMode")} onMouseEnter={() => handleMouseEnter("legacyPhoneMode")}>
                               <div className="setting-text">
                                   <div className="setting-label">{t('legacyPhoneMode')}</div>
                                   <p className="setting-description">{t('legacyPhoneModeDescription')}</p>
                               </div>
                               <div className="setting-control">
                                   <SegmentedControl path="legacyPhoneMode" options={[{ value: false, label: t('off') },{ value: true, label: t('on') }]} currentValue={settings.legacyPhoneMode} isKeyboardMode={isKeyboardMode} onChange={(value) => handleSettingChange('legacyPhoneMode', value)} />
                               </div>
                           </div>
                       </div>
        
                        <div className="settings-section">
                            <h2>{t('dataManagementTitle')}</h2>
                            <div className="setting-item" data-setting-path="export" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "export")} onMouseEnter={() => handleMouseEnter("export")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('exportDataTitle')}</div>
                                    <p className="setting-description">{t('exportDataDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <button onClick={() => { onExport(); setIsImportUnlocked(true); }} className="control-button icon-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>{t('export')}</button>
                                </div>
                            </div>
                             <div className={`setting-item ${!isImportUnlocked ? 'disabled' : ''}`} data-setting-path="taskImportMode" tabIndex={!isImportUnlocked ? -1 : 0} onMouseDown={(e) => handleItemMouseDown(e, "taskImportMode")} onMouseEnter={() => handleMouseEnter("taskImportMode")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('taskImportMode')}</div>
                                    <p className="setting-description">{t('taskImportModeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <SegmentedControl options={[{value: 'append', label: t('append')}, {value: 'overwrite', label: t('overwrite')}]} currentValue={importModes.tasks} isKeyboardMode={isKeyboardMode} onChange={(value) => setImportModes(prev => ({ ...prev, tasks: value }))} />
                                </div>
                            </div>
                            <div className={`setting-item ${!isImportUnlocked ? 'disabled' : ''}`} data-setting-path="statsImportMode" tabIndex={!isImportUnlocked ? -1 : 0} onMouseDown={(e) => handleItemMouseDown(e, "statsImportMode")} onMouseEnter={() => handleMouseEnter("statsImportMode")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('statsImportMode')}</div>
                                    <p className="setting-description">{t('statsImportModeDescription')}</p>
                                </div>
                                <div className="setting-control">
                                   <SegmentedControl options={[{value: 'add', label: t('add')}, {value: 'overwrite', label: t('overwrite')}]} currentValue={importModes.stats} isKeyboardMode={isKeyboardMode} onChange={(value) => setImportModes(prev => ({ ...prev, stats: value }))} />
                                </div>
                            </div>
                             <div className={`setting-item ${!isImportUnlocked ? 'disabled' : ''}`} data-setting-path="import" tabIndex={!isImportUnlocked ? -1 : 0} onMouseDown={(e) => handleItemMouseDown(e, "import")} onMouseEnter={() => handleMouseEnter("import")}>
                                <div className="setting-text">
                                    <div className="setting-label">
                                        {t('importDataTitle')}
                                        {!isImportUnlocked && <InfoTooltip text={t('unlockImportInfo')} ariaLabel={t('unlockImportInfo')} onMouseDown={handleControlMouseDown} />}
                                    </div>
                                    <p className="setting-description">{t('importDataDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <button onClick={handleImportClick} className="control-button icon-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>{t('import')}</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} accept=".txt,.json" disabled={!isImportUnlocked} />
                                </div>
                            </div>
                             <div className={`setting-item ${!isImportUnlocked ? 'disabled' : ''}`} data-setting-path="pasteImport" tabIndex={!isImportUnlocked ? -1 : 0} onMouseDown={(e) => handleItemMouseDown(e, "pasteImport")} onMouseEnter={() => handleMouseEnter("pasteImport")}>
                                <div className="setting-text">
                                    <div className="setting-label">
                                        {t('importFromPasteTitle')}
                                        {!isImportUnlocked && <InfoTooltip text={t('unlockImportInfo')} ariaLabel={t('unlockImportInfo')} onMouseDown={handleControlMouseDown} />}
                                    </div>
                                     <textarea 
                                        value={pasteContent}
                                        onChange={(e) => setPasteContent(e.target.value)}
                                        placeholder={t('pasteDataPlaceholder')}
                                        rows={4}
                                        className="paste-textarea"
                                        onMouseDown={handleControlMouseDown}
                                        disabled={!isImportUnlocked}
                                    />
                                </div>
                                <div className="setting-control">
                                     <button onClick={handlePasteImport} disabled={!pasteContent.trim() || !isImportUnlocked} className="control-button icon-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>{t('importPaste')}</button>
                                </div>
                            </div>
                            {backup && (
                                <div className="setting-item" data-setting-path="restore" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "restore")} onMouseEnter={() => handleMouseEnter("restore")}>
                                    <div className="setting-text">
                                        <div className="setting-label">{t('restoreDataTitle')}</div>
                                        <p className="setting-description">{t('restoreDataDescription')}</p>
                                    </div>
                                    <div className="setting-control">
                                        <button onClick={onRestore} className="control-button icon-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>{t('restore')}</button>
                                    </div>
                                </div>
                            )}
                            <div className="setting-item" data-setting-path="loadTestData" tabIndex={0} onMouseDown={(e) => handleItemMouseDown(e, "loadTestData")} onMouseEnter={() => handleMouseEnter("loadTestData")}>
                                <div className="setting-text">
                                    <div className="setting-label">{t('loadTestDataTitle')} <span className="dev-tag">DEV</span></div>
                                    <p className="setting-description">{t('loadTestDataDescription')}</p>
                                </div>
                                <div className="setting-control">
                                    <button onClick={handleLoadTestData} className="control-button icon-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>{t('loadTestDataButton')}</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {settings.simpleMode && (
                <div className="settings-footer-mobile">
                    <button className="back-button" onClick={handleBack}>
                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                         <span>{t('backToTimer')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SettingsView;