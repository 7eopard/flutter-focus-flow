
import React, { useRef, useEffect, useState } from 'react';
import { TimerState, TimerHandlers } from '../../hooks/useTimer';
import { Interactions } from '../../hooks/useInteractions';
import { Settings, InterferenceLevel, View } from '../../types';

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
// FIX: Refactored to a standard functional component with an explicit props interface.
// This ensures type safety and correctly handles the 'children' prop provided by JSX.
interface LongPressButtonProps {
    onLongPress: () => void;
    label: string;
    isLocked: boolean;
    threshold: number;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    tabIndex?: number;
    children: React.ReactNode;
}

const LongPressButton: React.FC<LongPressButtonProps> = ({
    onLongPress,
    label,
    isLocked,
    threshold,
    className = '',
    onMouseEnter,
    onMouseLeave,
    tabIndex,
    children,
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
                {children}
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
            case 'settings':
                return t('settings');
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
                 >
                    <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
                    <span className="fab-label">{undoLabel}</span>
                 </LongPressButton>
            );
        } else if (isKnobActive) {
            const isBreakMode = mode === 'break';
            const dropZoneTextKey = isBreakMode ? 'startNextSession' : 'setGoalAndBreak';
            const dropZoneIcon = isBreakMode ? 
                <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                : 
                <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6zm3.6 8h-3.36l-.4-2H7V6h5.4l.4 2h3.36v6z"/></svg>;

            return (
                <div 
                    ref={interactions.state.dropZoneRef}
                    className={`set-goal-drop-zone ${isDropZoneArmed ? 'armed' : ''}`}
                    onMouseEnter={handleDropZoneEnter}
                    onMouseLeave={handleDropZoneLeave}
                    tabIndex={1}
                >
                    {dropZoneIcon}
                    <span className="fab-label">{t(dropZoneTextKey)}</span>
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
                    isLocked={!isBreakUnlocked}
                    threshold={settings.longPressThreshold}
                    onMouseEnter={() => handleFocus('holdToBreak')}
                    onMouseLeave={handleBlur}
                    tabIndex={1}
                >
                    <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z"/></svg>
                    <span className="fab-label">{t('holdToBreak')}</span>
                    <span className="sub-label">{formatTime(earnedBreakSeconds)}</span>
                </LongPressButton>
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
                    <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>
                    <span className="fab-label">{t('start')}</span>
                </button>
            );
        } else if (mode === 'break') {
            return <div className="break-message">
                <svg className="fab-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z"/></svg>
                <span className="fab-label">{t('breakMessage')}</span>
            </div>;
        }
        return null;
    };

    const containerClasses = `timer-controls-container`;

    return (
        <div className={containerClasses} onClick={onInteraction} onKeyDown={onInteraction}>
            <div className="main-action-wrapper">
                {renderMainAction()}
            </div>
            <div className="lower-controls">
                {/* Secondary controls are now in the AppBar for compact views */}
                {settings.simpleMode && (
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setView('settings'); e.currentTarget.blur(); }}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setView('settings'); e.currentTarget.blur(); } }}
                        onMouseEnter={() => handleFocus('settings')} onMouseLeave={handleBlur}
                        onFocus={() => handleFocus('settings')} onBlur={handleBlur}
                        className="control-button icon-btn"
                        aria-label={t('settings')}
                        tabIndex={3}
                    >
                        <span className="btn-content-wrapper">
                            <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                            <span className="btn-label">{t('settings')}</span>
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default TimerControls;
