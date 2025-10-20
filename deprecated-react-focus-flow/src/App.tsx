import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, InterferenceLevel, Mode, DisplayMode, Settings, SetSettings, GoalMarkerDivision, Task, ImportModes, PomodoroSession, TaskStatus } from './types';
import useSettings from './hooks/useSettings';
import useTasks from './hooks/useTasks';
import useTimer, { TimerState, TimerHandlers } from './hooks/useTimer';
import useInteractions, { Interactions } from './hooks/useInteractions';
import TimerView from './components/TimerView';
import SettingsView from './components/SettingsView';
import NavTray from './components/NavTray';
import TasksView from './components/TasksView';
import StatsView from './components/StatsView';
import Header from './components/Header';
import DevView from './dev/DevView';

// --- [NEW] Legacy Phone View Component ---
interface LegacyPhoneViewProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    timerHandlers: TimerHandlers;
    interactions: Interactions;
    settings: Settings;
    setSettings: SetSettings;
}

const sanitizeNumericInput = (value: string, allowNegative: boolean = false): string => {
    // 1. Convert full-width characters to half-width
    let sanitized = value.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
    
    // 2. Truncate decimal part by removing decimal point and everything after it.
    const decimalIndex = sanitized.indexOf('.');
    if (decimalIndex !== -1) {
        sanitized = sanitized.substring(0, decimalIndex);
    }

    // 3. Handle negative sign and other characters
    if (allowNegative) {
        // Keep the first character if it's a '-', then filter the rest for digits.
        const firstChar = sanitized.charAt(0);
        const rest = sanitized.slice(1);
        const numbersInRest = rest.replace(/[^0-9]/g, '');
        sanitized = (firstChar === '-' ? '-' : firstChar.replace(/[^0-9]/g, '')) + numbersInRest;
    } else {
        sanitized = sanitized.replace(/[^0-9]/g, '');
    }

    return sanitized;
};


const LegacyPhoneView: React.FC<LegacyPhoneViewProps> = ({ t, timer, timerHandlers, interactions, settings, setSettings }) => {
    const { timeInSeconds, isActive, mode, firedGoalMarkers } = timer;
    const { toggleTimer } = timerHandlers;
    const { handleStartBreak } = interactions.handlers;

    const [legacyView, setLegacyView] = useState<'timer' | 'settings'>('timer');
    const [animationFrame, setAnimationFrame] = useState(0);
    const [isColonVisible, setIsColonVisible] = useState(true);
    const animationChars = ['▚', '▘', '▀', '▝', '▞', '▖', '▄', '▗'];
    const [minWorkMinsDisplay, setMinWorkMinsDisplay] = useState(settings.minWorkMins.toString());
    const [animationFrameRateDisplay, setAnimationFrameRateDisplay] = useState(settings.legacyAnimationFrameRate.toString());

    const formatEarnedBreakTime = (totalSeconds: number): string => {
        if (totalSeconds <= 0) {
            return "0s";
        }
    
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
    
        const parts = [];
        if (hours > 0) {
            parts.push(`${hours}h`);
        }
        if (minutes > 0) {
            parts.push(`${minutes}m`);
        }
        if (seconds > 0) {
            parts.push(`${seconds}s`);
        }
        
        return parts.join('');
    };

    useEffect(() => {
        let animationInterval: number | null = null;
        let colonInterval: number | null = null;
        let startTimeout: number | null = null;
    
        if (isActive) {
            const now = new Date();
            const delay = 1000 - now.getMilliseconds(); // Align to the start of the next second
    
            startTimeout = window.setTimeout(() => {
                // Block animation
                if (settings.legacyAnimationFrameRate > 0) {
                    const tick = () => {
                        setAnimationFrame(frame => (frame + 1) % animationChars.length);
                    };
                    tick(); // Fire once immediately on the aligned second to sync up
                    const interval = 1000 / settings.legacyAnimationFrameRate;
                    animationInterval = window.setInterval(tick, interval);
                }
                // Colon blink animation
                else if (settings.legacyAnimationFrameRate === -1) {
                    const tick = () => setIsColonVisible(v => !v);
                    tick(); // Fire once immediately to sync up
                    colonInterval = window.setInterval(tick, 500);
                }
            }, delay);
    
        } else {
            setAnimationFrame(0);
            setIsColonVisible(true); // Reset colon to visible when paused
        }
    
        return () => {
            if (startTimeout) clearTimeout(startTimeout);
            if (animationInterval) clearInterval(animationInterval);
            if (colonInterval) clearInterval(colonInterval);
        };
    }, [isActive, animationChars.length, settings.legacyAnimationFrameRate]);

    const formatLegacyTimeJSX = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        const showColon = !(isActive && settings.legacyAnimationFrameRate === -1 && !isColonVisible);

        return (
            <>
                {mins}
                <span style={{ visibility: showColon ? 'visible' : 'hidden' }}>:</span>
                {secs}
            </>
        );
    };

    const earnedBreakSeconds = Math.floor(timeInSeconds / 5);

    const handleExit = () => setSettings(prev => ({ ...prev, legacyPhoneMode: false }));
    const handleAdjust = () => timerHandlers.setTimeInSeconds(0);
    const handleThemeChange = (theme: 'light' | 'dark') => setSettings(prev => ({ ...prev, legacyTheme: theme }));
    const handleOrientationChange = (orientation: 'portrait' | 'landscape') => setSettings(prev => ({ ...prev, legacyOrientation: orientation }));
    const handleGoalMarkerChange = (division: GoalMarkerDivision) => setSettings(prev => ({ ...prev, goalMarkerDivision: division }));
    const handleFontChange = (font: 'serif' | 'sans-serif') => setSettings(prev => ({ ...prev, legacyFont: font }));
    
    const handleMinWorkMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = sanitizeNumericInput(e.target.value);
        setMinWorkMinsDisplay(sanitizedValue);

        const numericValue = parseInt(sanitizedValue, 10);
        if (!isNaN(numericValue) && numericValue >= 1) {
            setSettings(prev => ({ ...prev, minWorkMins: numericValue }));
        }
    };

    const handleMinWorkMinsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numericValue = parseInt(value, 10);
        const defaultValue = 25;

        if (value === '' || isNaN(numericValue) || numericValue < 1) {
            // Revert to default value and display it.
            setMinWorkMinsDisplay(defaultValue.toString());
            setSettings(prev => ({ ...prev, minWorkMins: defaultValue }));
        } else {
            // Sanitize display and ensure settings are correct.
            setMinWorkMinsDisplay(numericValue.toString());
            setSettings(prev => ({ ...prev, minWorkMins: numericValue }));
        }
    };

    const handleFrameRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitizedValue = sanitizeNumericInput(e.target.value, true);
        setAnimationFrameRateDisplay(sanitizedValue);
    
        const numericValue = parseInt(sanitizedValue, 10);
        if (!isNaN(numericValue)) {
            // Update the setting immediately, even if out of range.
            // The blur event will handle clamping the final value.
            setSettings(prev => ({ ...prev, legacyAnimationFrameRate: numericValue }));
        }
    };
    
    const handleFrameRateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let numericValue = parseInt(value, 10);
        const defaultValue = 2;
    
        if (isNaN(numericValue) || value.trim() === '-' || value.trim() === '') {
            numericValue = defaultValue;
        } else {
            // Clamp the value to be within -1 and 8.
            numericValue = Math.max(-1, Math.min(8, numericValue));
        }
        
        setAnimationFrameRateDisplay(numericValue.toString());
        setSettings(prev => ({ ...prev, legacyAnimationFrameRate: numericValue }));
    };

    const renderLegacyProgressBarsJSX = () => {
        const { minWorkMins, goalMarkerDivision } = settings;
        const goalSeconds = minWorkMins * 60;
        const barWidth = 10;
        const placeholder = '░';
        const subgoalMarker = '▓';

        let mainBarJSX: React.ReactNode = <span style={{ color: settings.legacyTheme === 'light' ? '#ffffff' : '#000000' }}>{placeholder.repeat(barWidth).split('').join('')}</span>;
        let overtimeBarJSX: React.ReactNode | null = null;

        if (goalSeconds > 0) {
            const progress = timeInSeconds / goalSeconds;

            // --- Main Bar ---
            let mainProgressBarString;
            if (progress >= 1) {
                mainProgressBarString = '█'.repeat(barWidth);
            } else {
                const totalFill = progress * barWidth;
                const fullCells = Math.floor(totalFill);
                const partialFill = totalFill - fullCells;
                const partials = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
                const partialIndex = Math.floor(partialFill * partials.length);
                const partialChar = (fullCells < barWidth && partialIndex > 0) ? partials[partialIndex] : '';
                mainProgressBarString = '█'.repeat(fullCells) + partialChar;
            }

            let barChars = placeholder.repeat(barWidth).split('');
            for (let i = 0; i < mainProgressBarString.length; i++) {
                barChars[i] = mainProgressBarString[i];
            }

            const allGoalMarkerMinutes = (() => {
                if (goalMarkerDivision === 0 || minWorkMins < goalMarkerDivision) return [];
                // FIX: Explicitly typed the fractions map to resolve a type inference issue.
                // This was causing errors in subsequent arithmetic operations.
                const fractionsMap: { [key: number]: number[] } = {
                    4: [0.25, 0.5, 0.75, 1],
                    3: [1 / 3, 2 / 3, 1],
                    6: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1],
                };
                const fractions = fractionsMap[goalMarkerDivision] || [];
                const markers = fractions.map(fraction => Math.round(minWorkMins * fraction));
                return [...new Set(markers)].sort((a, b) => a - b);
            })();

            allGoalMarkerMinutes.forEach(minute => {
                const cellIndex = Math.min(barWidth - 1, Math.floor((minute * 60 / goalSeconds) * barWidth));
                if (firedGoalMarkers.includes(minute)) {
                    barChars[cellIndex] = subgoalMarker;
                }
            });

            const lastFilledIndex = barChars.map(c => c !== placeholder).lastIndexOf(true);
            
            if (lastFilledIndex === -1) {
                mainBarJSX = <span className="progress-placeholder" style={{ color: settings.legacyTheme === 'light' ? '#ffffff' : '#000000' }}>{barChars.join('')}</span>;
            } else {
                const filledChars = barChars.slice(0, lastFilledIndex + 1);
                const placeholderChars = barChars.slice(lastFilledIndex + 1);
                const filledPart = <span className="progress-fill">{filledChars.join('')}</span>;
                let placeholderPart: React.ReactNode = null;
                if (placeholderChars.length > 0) {
                    placeholderPart = <span className="progress-placeholder" style={{ color: settings.legacyTheme === 'light' ? '#ffffff' : '#000000' }}>{placeholderChars.join('')}</span>;
                }
                mainBarJSX = (
                    <>
                        {filledPart}
                        {placeholderPart}
                    </>
                );
            }

            // --- Overtime Bar ---
            if (progress > 1) {
                const overtimeSeconds = timeInSeconds - goalSeconds;
                const totalOvertimeProgress = overtimeSeconds / goalSeconds;
                const cycleIndex = Math.floor(totalOvertimeProgress);
                let progressInCycle = totalOvertimeProgress % 1;
                let effectiveCycleIndex = cycleIndex;

                if (progressInCycle === 0 && totalOvertimeProgress > 0) {
                    progressInCycle = 1.0;
                    effectiveCycleIndex = cycleIndex - 1;
                }

                const fullCells = Math.floor(progressInCycle * barWidth);
                
                const overtimeName = 'progress-ring__overtime';
                const overtimeStyle: React.CSSProperties = {
                    color: settings.legacyTheme === 'light' ? 'dimgray' : '#aaaaaa',
                };

                if (effectiveCycleIndex === 0) {
                    // Lap 1 (100-200%): Fills with ▔ over ░
                    const filledPartString = '▔'.repeat(fullCells);
                    const placeholderPartString = placeholder.repeat(barWidth - fullCells);

                    const overtimeFilledPart = filledPartString.length > 0
                        ? <span className="progress-fill">{filledPartString}</span>
                        : null;
                    const overtimePlaceholderPart = placeholderPartString.length > 0
                        ? <span className="progress-placeholder" style={{ color: settings.legacyTheme === 'light' ? '#ffffff' : '#000000' }}>{placeholderPartString}</span>
                        : null;

                    overtimeBarJSX = (
                        <div className={overtimeName} style={overtimeStyle}>
                            {overtimeFilledPart}
                            {overtimePlaceholderPart}
                        </div>
                    );
                } else if (effectiveCycleIndex >= 3) {
                    // Lap 4+ (400%+): Full █ bar with last block highlighted
                    const lastBlock = <span style={{ color: 'var(--accent-color)' }}>█</span>;
                    overtimeBarJSX = (
                        <div className={overtimeName} style={overtimeStyle}>
                            {'█'.repeat(barWidth - 1)}
                            {lastBlock}
                        </div>
                    );
                } else {
                    const chars = ['░', '▔', '▀', '█'];
                    const prevChar = chars[effectiveCycleIndex];
                    const currChar = chars[effectiveCycleIndex + 1];

                    const filledPartString = currChar.repeat(fullCells);
                    const placeholderPartString = prevChar.repeat(barWidth - fullCells);

                    const overtimeFilledPart = filledPartString.length > 0
                        ? <span className="progress-fill">{filledPartString}</span>
                        : null;
                    const overtimePlaceholderPart = placeholderPartString.length > 0
                        ? <span className="progress-placeholder">{placeholderPartString}</span>
                        : null;

                     overtimeBarJSX = (
                        <div className={overtimeName} style={overtimeStyle}>
                            {overtimeFilledPart}
                            {overtimePlaceholderPart}
                        </div>
                    );
                }
            }
        }
        
        return <div className="progress-bars-legacy">{mainBarJSX}{overtimeBarJSX}</div>;
    };
    
    return (
        <div className="legacy-phone-backdrop">
            {/* The rest of the LegacyPhoneView JSX */}
        </div>
    );
};


const App: React.FC = () => {
    const { settings, setSettings, t } = useSettings();
    const tasksState = useTasks();
    const [view, setView] = useState<View>('timer');
    const [interferenceLevel, setInterferenceLevel] = useState<InterferenceLevel>('weak');
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [primaryView, setPrimaryView] = useState<'digital' | 'analog'>('digital');
    const [temporaryGlance, setTemporaryGlance] = useState<'digital' | 'analog' | null>(null);
    const [isZenMode, setIsZenMode] = useState(settings.defaultZenMode);
    const [isZenInterfaceVisible, setIsZenInterfaceVisible] = useState(!settings.defaultZenMode);
    const [isNavRailCollapsed, setIsNavRailCollapsed] = useState(false);
    const [hoverInfo, setHoverInfo] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const infoTimeoutRef = useRef<number | null>(null);
    const [backup, setBackup] = useState<string | null>(localStorage.getItem('backup'));
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [devMode, setDevMode] = useState(false);

    const { timer, timerHandlers } = useTimer(settings, { interferenceLevel, notificationPermission }, t);
    const interactions = useInteractions(settings, timer, timerHandlers, { interferenceLevel, notificationPermission }, { setInterferenceLevel, setNotificationPermission }, setHoverInfo);
    
    const { mode } = timer;
    const isZenModeGlobal = isZenMode && view === 'timer';

    useEffect(() => {
        setIsZenMode(settings.defaultZenMode);
        setIsZenInterfaceVisible(!settings.defaultZenMode);
    }, [settings.defaultZenMode]);
    
    const showInfoMessage = useCallback((message: string) => {
        setInfoMessage(message);
        if (infoTimeoutRef.current) clearTimeout(infoTimeoutRef.current);
        infoTimeoutRef.current = window.setTimeout(() => setInfoMessage(null), 3000);
    }, []);

    const handleDisplayModeToggle = useCallback(() => {
        if (temporaryGlance) {
            setPrimaryView(temporaryGlance);
            showInfoMessage(t('viewChangedMessage', t(temporaryGlance === 'digital' ? 'digitalView' : 'analogView')));
            setTemporaryGlance(null);
        } else {
            timerHandlers.toggleDisplayMode();
            showInfoMessage(t('displayModeSet', t(timer.displayMode === 'count up' ? 'countdown' : 'countUp')));
        }
    }, [temporaryGlance, timer.displayMode, timerHandlers, setPrimaryView, showInfoMessage, t]);

    const glanceTimeoutRef = useRef<number | null>(null);
    const glanceButtonRef = useRef<HTMLButtonElement>(null);

    const onGlanceInteractionStart = useCallback((e: React.SyntheticEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setTemporaryGlance(primaryView === 'digital' ? 'analog' : 'digital');
        glanceTimeoutRef.current = window.setTimeout(() => {
            setPrimaryView(prev => prev === 'digital' ? 'analog' : 'digital');
            showInfoMessage(t('viewChangedMessage', t(primaryView === 'digital' ? 'analogView' : 'digitalView')));
            setTemporaryGlance(null);
            glanceTimeoutRef.current = null;
        }, 4000);
    }, [primaryView, showInfoMessage, t]);

    const onGlanceInteractionEnd = useCallback((e: React.SyntheticEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (glanceTimeoutRef.current) {
            clearTimeout(glanceTimeoutRef.current);
            glanceTimeoutRef.current = null;
        }
        if (temporaryGlance) {
            showInfoMessage(t('temporaryGlanceMessage', t(temporaryGlance === 'digital' ? 'digitalView' : 'analogView')));
            setTimeout(() => setTemporaryGlance(null), 2000);
        }
    }, [temporaryGlance, showInfoMessage, t]);

    const handleInterferenceToggle = useCallback(() => {
        interactions.handlers.handleInterferenceCycle((newLevel) => {
             showInfoMessage(t('interferenceLevelSet', t(newLevel)));
        });
    }, [interactions.handlers, showInfoMessage, t]);

    const handleZenToggle = useCallback(() => {
        setIsZenMode(prev => {
            const newMode = !prev;
            showInfoMessage(newMode ? t('zenModeEnabled') : t('zenModeDisabled'));
            setIsZenInterfaceVisible(true);
            return newMode;
        });
    }, [showInfoMessage, t]);
    
    // --- Data Management ---
    const handleExport = () => {
        const dataToExport = {
            timestamp: new Date().toISOString(),
            settings: settings,
            tasks: tasksState.tasks,
            sessions: timer.sessions,
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `pomodoro_hub_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImport = (content: string, modes: ImportModes, isFromPaste: boolean) => {
        try {
            const data = JSON.parse(content);
            if (data && data.settings && data.tasks && data.sessions) {
                const currentData = {
                    settings: settings,
                    tasks: tasksState.tasks,
                    sessions: timer.sessions
                };
                const backupStr = JSON.stringify(currentData);
                localStorage.setItem('backup', backupStr);
                setBackup(backupStr);

                setSettings(data.settings);
                tasksState.setTasks(modes.tasks === 'overwrite' ? data.tasks : [...tasksState.tasks, ...data.tasks]);
                timerHandlers.setSessions(modes.stats === 'overwrite' ? data.sessions : [...timer.sessions, ...data.sessions]);
                
                alert(isFromPaste ? t('pasteImportSuccess') : t('importSuccess'));
            } else {
                throw new Error("Invalid data structure");
            }
        } catch (error) {
            console.error(error);
            alert(isFromPaste ? t('pasteImportError') : t('importError'));
        }
    };
    
    const handleRestore = () => {
        const backupStr = localStorage.getItem('backup');
        if (backupStr) {
            try {
                const data = JSON.parse(backupStr);
                 setSettings(data.settings);
                 tasksState.setTasks(data.tasks);
                 timerHandlers.setSessions(data.sessions);
                 alert(t('restoreSuccess'));
            } catch (error) {
                console.error(error);
                alert(t('restoreError'));
            }
        }
    };
    
    // --- Anti-Burn-In Jitter Effect ---
    useEffect(() => {
        let jitterIntervalId: number | null = null;
        const mainEl = mainContentRef.current;
        const navEl = document.querySelector('.nav-content-shifter');

        if (mainEl && settings.contentJitterMode !== 'off') {
            jitterIntervalId = window.setInterval(() => {
                const x = settings.contentJitterMode === 'bidirectional' ? (Math.random() - 0.5) * 4 : 0;
                const y = (Math.random() - 0.5) * 4;
                mainEl.style.transform = `translate(${x}px, ${y}px)`;
            }, settings.jitterInterval * 1000);
        }

        if (navEl && navEl instanceof HTMLElement && settings.navJitterMode !== 'off') {
            const isVertical = window.innerWidth >= 600;
            jitterIntervalId = window.setInterval(() => {
                const mainAxis = (Math.random() - 0.5) * 4;
                const crossAxis = settings.navJitterMode === 'bidirectional' ? (Math.random() - 0.5) * 4 : 0;
                const x = isVertical ? crossAxis : mainAxis;
                const y = isVertical ? mainAxis : crossAxis;
                navEl.style.transform = `translate(${x}px, ${y}px)`;
            }, settings.jitterInterval * 1000);
        }

        return () => {
            if (jitterIntervalId) clearInterval(jitterIntervalId);
            if (mainEl) mainEl.style.transform = '';
            if (navEl && navEl instanceof HTMLElement) navEl.style.transform = '';
        };
    }, [settings.contentJitterMode, settings.navJitterMode, settings.jitterInterval]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 0);
    };

    const renderView = () => {
        switch (view) {
            case 'timer':
                return <TimerView t={t} timer={timer} timerHandlers={timerHandlers} interactions={interactions} settings={settings} setView={setView} hoverInfo={hoverInfo} infoMessage={infoMessage} setHoverInfo={setHoverInfo} isZenMode={isZenMode} primaryView={primaryView} isZenInterfaceVisible={isZenInterfaceVisible} setIsZenInterfaceVisible={setIsZenInterfaceVisible} currentlyVisibleView={temporaryGlance || primaryView} />;
            case 'tasks':
                return <TasksView t={t} tasksState={tasksState} tasksHandlers={tasksState.tasksHandlers} settings={settings} />;
            case 'stats':
                return <StatsView t={t} sessions={timer.sessions} completedTasks={tasksState.completedTasks} settings={settings} />;
            case 'settings':
                return <SettingsView t={t} settings={settings} setSettings={setSettings} setView={setView} onExport={handleExport} onImport={handleImport} backup={backup} onRestore={handleRestore} />;
            default:
                return null;
        }
    };

    if (settings.legacyPhoneMode) {
        return <LegacyPhoneView t={t} timer={timer} timerHandlers={timerHandlers} interactions={interactions} settings={settings} setSettings={setSettings} />;
    }

    if (devMode) {
        return (
            <div className={`app-container mode-${mode}`}>
                <button 
                    onClick={() => setDevMode(false)}
                    className="fixed bottom-4 right-4 bg-red-500 text-white rounded-full w-16 h-16 shadow-lg z-[1000] flex items-center justify-center font-bold"
                    aria-label="Exit Dev Mode"
                >
                    Exit
                </button>
                <DevView
                    t={t}
                    primaryView={primaryView}
                    timer={timer}
                    timerHandlers={timerHandlers}
                    settings={settings}
                    interactions={interactions}
                    infoMessage={infoMessage}
                    setHoverInfo={setHoverInfo}
                    setView={setView}
                    tasksState={tasksState}
                    tasksHandlers={tasksState.tasksHandlers}
                />
            </div>
        );
    }
    
    return (
        <div className={`app-container mode-${mode} ${isZenModeGlobal ? 'zen-mode-global-active' : ''}`}>
            <button 
                onClick={() => setDevMode(true)}
                className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full w-14 h-14 shadow-lg z-[1000] flex items-center justify-center font-bold"
                aria-label="Enter Dev Mode"
            >
                Dev
            </button>
            <div className={`app-shell view-${view} ${isNavRailCollapsed ? 'nav-rail-collapsed' : ''}`}>
                {!settings.simpleMode && <NavTray activeView={view} setActiveView={setView} t={t} primaryView={primaryView} isNavRailCollapsed={isNavRailCollapsed} setIsNavRailCollapsed={setIsNavRailCollapsed} />}
                <div className="app-view-wrapper">
                     <Header 
                        t={t}
                        view={view}
                        title={view === 'timer' ? '' : t(view === 'tasks' ? 'todoTitle' : view)}
                        isScrolled={isScrolled}
                        timerControls={{
                            glanceButtonRef,
                            temporaryGlance,
                            primaryView,
                            interferenceLevel,
                            isZenMode,
                            onDisplayModeToggle: handleDisplayModeToggle,
                            onGlanceInteractionStart: onGlanceInteractionStart,
                            onGlanceInteractionEnd: onGlanceInteractionEnd,
                            onInterferenceToggle: handleInterferenceToggle,
                            onZenToggle: handleZenToggle
                        }}
                        settingsControl={{
                            show: settings.simpleMode,
                            onSettingsClick: () => setView('settings'),
                        }}
                    />
                    <main ref={mainContentRef} className="app-main-content" onScroll={handleScroll}>
                        {renderView()}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;