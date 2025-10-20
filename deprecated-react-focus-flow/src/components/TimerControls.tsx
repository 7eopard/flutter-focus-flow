import React, { useRef, useEffect, useState } from 'react';
import { TimerState, TimerHandlers } from '../hooks/useTimer';
import { Interactions } from '../hooks/useInteractions';
import { Settings, InterferenceLevel, View } from '../types';

interface TimerControlsProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    timerHandlers: TimerHandlers;
    interactions: Interactions;
    settings: Settings;
    setView: (view: View) => void;
    onInteraction: () => void;
    setHoverInfo: (text: string | null) => void;
}

// --- [FIX] STABLE COMPONENT DEFINITION ---
const LongPressButton = ({
    onLongPress,
    label,
    subLabel,
    isLocked,
    threshold,
    className = '',
    onMouseEnter,
    onMouseLeave,
    tabIndex,
}: {
    onLongPress: () => void;
    label: string;
    subLabel?: string;
    isLocked: boolean;
    threshold: number;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    tabIndex?: number;
}) => {
    const [isPressing, setIsPressing] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const startPress = () => {
        if (isLocked) return;
        setIsPressing(true);
        timeoutRef.current = window.setTimeout(() => {
            onLongPress();
            setIsPressing(false); // Reset after action
        }, threshold);
    };

    const cancelPress = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsPressing(false);
    };
    
    const handleInteractionStart = (e: React.SyntheticEvent) => {
        e.preventDefault();
        startPress();
    };

    const handleInteractionEnd = (e: React.SyntheticEvent) => {
        e.preventDefault();
        cancelPress();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === ' ' || e.key === 'Enter') && !isPressing && !e.repeat) {
            handleInteractionStart(e);
        }
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            handleInteractionEnd(e);
        }
    };
    
    return (
        <button
            className={`long-press-button ${isPressing ? 'is-pressing' : ''} ${className}`}
            style={{ '--long-press-duration': `${threshold}ms` } as React.CSSProperties}
            disabled={isLocked}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={() => { cancelPress(); onMouseLeave?.(); }}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onFocus={onMouseEnter}
            onBlur={onMouseLeave}
            onMouseEnter={onMouseEnter}
            onClick={(e) => e.preventDefault()}
            tabIndex={tabIndex}
            aria-label={label}
        >
            <div className="long-press-progress" />
            <div className="long-press-content">
                {subLabel && <span className="sub-label">{subLabel}</span>}
                {label}
            </div>
        </button>
    );
};


const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TimerControls: React.FC<TimerControlsProps> = ({ t, timer, timerHandlers, interactions, settings, setView, onInteraction, setHoverInfo }) => {
    const { mode, isActive } = timer;
    const {
        isKnobActive,
        showUndo,
        lastAction,
        displayedTime,
        isDropZoneArmed,
    } = interactions.state;
    const {
        handleDropZoneEnter,
        handleDropZoneLeave,
        handleUndo,
    } = interactions.handlers;

    const getHoverInfoText = (key: string) => {
        switch(key) {
            case 'holdToBreak':
                return t('infoHoldToBreak');
            case 'holdToUndo':
                return t('infoHoldToUndo');
            default:
                return null;
        }
    };

    const handleFocus = (key: string) => setHoverInfo(getHoverInfoText(key));
    const handleBlur = () => setHoverInfo(null);
    
    const renderMainAction = () => {
        if (showUndo) {
            const undoLabel = lastAction === 'time_adjustment' ? t('undoAdjustment') : t('undoBreak');
            return (
                 <LongPressButton
                    onLongPress={handleUndo}
                    label={undoLabel}
                    isLocked={false}
                    threshold={settings.longPressThreshold}
                    className="undo"
                    onMouseEnter={() => handleFocus('holdToUndo')}
                    onMouseLeave={handleBlur}
                    tabIndex={1}
                 />
            );
        } else if (isKnobActive) {
            return (
                <div 
                    ref={interactions.state.dropZoneRef}
                    className={`set-goal-drop-zone ${isDropZoneArmed ? 'armed' : ''}`}
                    onMouseEnter={handleDropZoneEnter}
                    onMouseLeave={handleDropZoneLeave}
                    tabIndex={1}
                >
                    {t('setGoalAndBreak')}
                </div>
            );
        } else if (isActive && mode === 'work') {
            const earnedBreakSeconds = Math.floor(displayedTime / 5);
            const minWorkSeconds = settings.minWorkMins * 60;
            const isBreakUnlocked = displayedTime >= minWorkSeconds;
            return (
                <LongPressButton
                    onLongPress={() => timerHandlers.startBreak(interactions.state.interferenceLevel, Notification.permission)}
                    label={t('holdToBreak')}
                    subLabel={formatTime(earnedBreakSeconds)}
                    isLocked={!isBreakUnlocked}
                    threshold={settings.longPressThreshold}
                    onMouseEnter={() => handleFocus('holdToBreak')}
                    onMouseLeave={handleBlur}
                    tabIndex={1}
                />
            );
        } else if (!isActive && mode === 'work') {
            return (
                <button 
                    onMouseDown={(e) => { e.preventDefault(); timerHandlers.toggleTimer(); }}
                    onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            timerHandlers.toggleTimer();
                        }
                    }}
                    className="control-button start-pause extended-fab"
                    tabIndex={1}
                >
                    {t('start')}
                </button>
            );
        } else if (mode === 'break') {
            return <div className="break-message">{t('breakMessage')}</div>;
        }
        return null;
    };

    const containerClasses = `timer-controls-container`;

    return (
        <div className={containerClasses} onClick={onInteraction} onKeyDown={onInteraction}>
            <div className="main-action-wrapper">
                {renderMainAction()}
            </div>
        </div>
    );
};

export default TimerControls;