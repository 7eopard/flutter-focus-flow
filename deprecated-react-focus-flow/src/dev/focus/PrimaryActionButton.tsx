import React, { useState, useRef, useEffect } from 'react';
import { TimerState, TimerHandlers } from '../../hooks/useTimer';
import { Interactions } from '../../hooks/useInteractions';
import { Settings, View } from '../../types';

interface PrimaryActionButtonProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    timerHandlers: TimerHandlers;
    interactions: Interactions;
    settings: Settings;
}

const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const LongPressWrapper: React.FC<React.PropsWithChildren<{
    onLongPress: () => void;
    label: string;
    isLocked: boolean;
    threshold: number;
    className?: string;
}>> = ({ children, onLongPress, label, isLocked, threshold, className }) => {
    const [isPressing, setIsPressing] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const startPress = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (isLocked) return;
        setIsPressing(true);
        timeoutRef.current = window.setTimeout(() => {
            onLongPress();
            setIsPressing(false);
        }, threshold);
    };

    const cancelPress = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsPressing(false);
    };

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            role="button"
            aria-label={label}
            tabIndex={0}
        >
            <div className={`absolute top-0 left-0 w-full h-full bg-[rgba(255,255,255,0.3)] origin-left pointer-events-none ${isPressing ? 'scale-x-100' : 'scale-x-0'}`} style={{ transition: `transform ${threshold}ms linear` }}></div>
            {children}
        </div>
    );
};

const PrimaryActionButton: React.FC<PrimaryActionButtonProps> = ({ t, timer, timerHandlers, interactions, settings }) => {
    const { mode, isActive } = timer;
    const { isKnobActive, showUndo, lastAction, displayedTime, isDropZoneArmed } = interactions.state;

    const FabIcon: React.FC<{ path: string }> = ({ path }) => (
        <svg className="w-6 h-6 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d={path} />
        </svg>
    );

    const renderFabContent = () => {
        let content = null;

        if (showUndo) {
            const undoLabel = lastAction === 'time_adjustment' ? t('undoAdjustment') : t('undoBreak');
            content = {
                key: 'undo',
                label: undoLabel,
                icon: <FabIcon path="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />,
                action: interactions.handlers.handleUndo,
                isLongPress: true,
                className: "bg-[var(--card-bg-light)] text-[var(--text-muted)]",
            };
        } else if (isKnobActive) {
            const isBreakMode = mode === 'break';
            content = {
                key: 'setGoal',
                label: t(isBreakMode ? 'startNextSession' : 'setGoalAndBreak'),
                icon: <FabIcon path={isBreakMode ? "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" : "M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6zm3.6 8h-3.36l-.4-2H7V6h5.4l.4 2h3.36v6z"} />,
                action: () => {}, // This is a drop zone, not a button
                isDropZone: true,
                className: `border-2 border-dashed ${isDropZoneArmed ? 'border-[var(--break-color)] text-[var(--break-color)] bg-[rgba(var(--break-color-rgb),0.1)]' : 'border-[var(--text-muted)] text-[var(--text-muted)]'}`
            };
        } else if (mode === 'break') {
            content = {
                key: 'break',
                label: t('breakMessage'),
                icon: <FabIcon path="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z" />,
                action: () => {},
                isStatic: true,
                className: "bg-[var(--card-bg-light)] text-[var(--accent-color)] opacity-80",
            };
        } else if (isActive) { // Work mode, active
            const earnedBreakSeconds = Math.floor(displayedTime / 5);
            const isBreakUnlocked = displayedTime >= settings.minWorkMins * 60;
            content = {
                key: 'holdToBreak',
                label: t('holdToBreak'),
                subLabel: formatTime(earnedBreakSeconds),
                icon: <FabIcon path="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z" />,
                action: () => timerHandlers.startBreak(interactions.state.interferenceLevel, Notification.permission),
                isLongPress: true,
                isLocked: !isBreakUnlocked,
                className: "bg-[var(--accent-color)] text-[var(--card-bg)]",
            };
        } else { // Work mode, paused
            content = {
                key: 'start',
                label: t('start'),
                icon: <FabIcon path="M8 5v14l11-7L8 5z" />,
                action: timerHandlers.toggleTimer,
                className: "bg-[var(--accent-color)] text-[var(--card-bg)]",
            };
        }

        if (!content) return null;

        const fabClasses = `w-full h-full flex items-center justify-center gap-2 px-4 rounded-[16px] text-base font-semibold transition-colors duration-200 ${content.className}`;

        const fabInnerContent = (
            <div className="flex items-center gap-2 z-10">
                {content.icon}
                <span className="fab-label">{content.label}</span>
                {content.subLabel && <span className="bg-[rgba(255,255,255,0.2)] text-white/90 px-2 py-1 rounded-md text-sm font-semibold">{content.subLabel}</span>}
            </div>
        );

        if (content.isLongPress) {
            return (
                <LongPressWrapper onLongPress={content.action} label={content.label} isLocked={content.isLocked || false} threshold={settings.longPressThreshold} className={fabClasses}>
                    {fabInnerContent}
                </LongPressWrapper>
            );
        }
        if (content.isDropZone) {
            return (
                <div ref={interactions.state.dropZoneRef} onMouseEnter={interactions.handlers.handleDropZoneEnter} onMouseLeave={interactions.handlers.handleDropZoneLeave} className={fabClasses}>
                    {fabInnerContent}
                </div>
            )
        }
        
        return (
            <button onClick={content.action} className={fabClasses} disabled={content.isStatic}>
                {fabInnerContent}
            </button>
        );
    };

    const wrapperClasses = `
        fixed bottom-24 right-4 z-50 h-14 w-auto min-w-[80px]
        md:relative md:bottom-auto md:right-auto md:z-auto md:w-[280px]
        shadow-lg rounded-[16px]
    `;

    return (
        <div className={wrapperClasses}>
            {renderFabContent()}
        </div>
    );
};

export default PrimaryActionButton;