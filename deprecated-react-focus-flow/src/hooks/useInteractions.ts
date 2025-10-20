import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, InterferenceLevel } from '../types';
import { TimerState, TimerHandlers } from './useTimer';

export type Interactions = ReturnType<typeof useInteractions>;

interface InterferenceProps {
    interferenceLevel: InterferenceLevel;
    notificationPermission: NotificationPermission;
}
interface InterferenceSetters {
    setInterferenceLevel: React.Dispatch<React.SetStateAction<InterferenceLevel>>;
    setNotificationPermission: React.Dispatch<React.SetStateAction<NotificationPermission>>;
}

const useInteractions = (
    settings: Settings,
    timer: TimerState,
    timerHandlers: TimerHandlers,
    interferenceProps: InterferenceProps,
    interferenceSetters: InterferenceSetters,
    setHoverInfo: (text: string | null) => void
) => {
    const { knobScrollMode } = settings;
    const { timeInSeconds, isActive } = timer;
    const { setTimeInSeconds, startBreak, undoBreak, setGoalAndStartBreak, testInterferenceFeedback, endBreakAndStartNewSession, recordAdjustment } = timerHandlers;
    const { interferenceLevel, notificationPermission } = interferenceProps;
    const { setInterferenceLevel, setNotificationPermission } = interferenceSetters;

    // --- SHARED STATE ---
    const undoTimeoutRef = useRef<number | null>(null);

    // --- KNOB STATE ---
    const [isKnobActive, setIsKnobActive] = useState(false);
    const [isKnobDragging, setIsKnobDragging] = useState(false);
    const [timeAdjustmentDelta, setTimeAdjustmentDelta] = useState(0);
    const [smoothDragOffset, setSmoothDragOffset] = useState(0);
    const [knobTextureOffset, setKnobTextureOffset] = useState(0);
    const knobRef = useRef<HTMLDivElement>(null);
    const wasActiveBeforeKnob = useRef(false);
    const knobDragRef = useRef({ startY: 0, lastTimeUpdateY: 0, initialTimeAdjustmentDelta: 0, timeAtDragStart: 0 });
    const timeInSecondsRef = useRef(timeInSeconds);
    useEffect(() => { timeInSecondsRef.current = timeInSeconds; }, [timeInSeconds]);
    const timeAdjustmentDeltaRef = useRef(timeAdjustmentDelta);
    useEffect(() => { timeAdjustmentDeltaRef.current = timeAdjustmentDelta; }, [timeAdjustmentDelta]);

    // --- DROP ZONE STATE ---
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isHoveringDropZone, setIsHoveringDropZone] = useState(false);
    const isHoveringDropZoneRef = useRef(isHoveringDropZone);
    useEffect(() => { isHoveringDropZoneRef.current = isHoveringDropZone; }, [isHoveringDropZone]);
    const [isDropZoneArmed, setIsDropZoneArmed] = useState(false);
    const isDropZoneArmedRef = useRef(isDropZoneArmed);
    useEffect(() => { isDropZoneArmedRef.current = isDropZoneArmed; }, [isDropZoneArmed]);
    const dropZoneHoverTimeoutRef = useRef<number | null>(null);

    // --- UNDO STATE ---
    const [showUndo, setShowUndo] = useState(false);
    const [lastAction, setLastAction] = useState<'time_adjustment' | 'start_break' | null>(null);
    const [lastAdjustmentAmount, setLastAdjustmentAmount] = useState(0);

    // --- DERIVED STATE ---
    const currentDelta = timeAdjustmentDelta;
    const displayedTime = isKnobActive ? Math.max(0, timeInSeconds + currentDelta) : timeInSeconds;
    const deltaMinuteHandRotation = (timeInSeconds + (isKnobDragging ? smoothDragOffset : timeAdjustmentDelta)) * 0.1;

    // --- INTERFERENCE ---
    const handleInterferenceCycle = (onCycleComplete: (newLevel: InterferenceLevel) => void) => {
        const levels: InterferenceLevel[] = ['zero', 'weak', 'strong'];
        const currentIndex = levels.indexOf(interferenceLevel);
        const nextLevel = levels[(currentIndex + 1) % levels.length];

        const triggerTest = (level: InterferenceLevel, permission: NotificationPermission) => {
             testInterferenceFeedback(level, permission);
        };
        
        if (nextLevel === 'strong' && notificationPermission !== 'granted') {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
                setInterferenceLevel(nextLevel);
                triggerTest(nextLevel, permission);
                onCycleComplete(nextLevel);
            });
        } else {
            setInterferenceLevel(nextLevel);
            triggerTest(nextLevel, notificationPermission);
            onCycleComplete(nextLevel);
        }
    };
    
    // --- KNOB LOGIC ---
    const applyTimeAdjustment = useCallback((adjustment: number) => {
        const baseTime = isKnobDragging ? knobDragRef.current.timeAtDragStart : timeInSecondsRef.current;
        const prospectiveTotalTime = baseTime + timeAdjustmentDeltaRef.current + adjustment;
        let actualAdjustment = adjustment;

        if (prospectiveTotalTime < 0) {
            actualAdjustment = -(baseTime + timeAdjustmentDeltaRef.current);
        }

        if (actualAdjustment !== 0) {
            setTimeAdjustmentDelta(prevDelta => prevDelta + actualAdjustment);
            if ('vibrate' in navigator) navigator.vibrate(10);
        }
    }, [isKnobDragging]);

    const handleKnobClick = () => {
        if (isKnobDragging) return;

        if (isKnobActive) {
            if (timeAdjustmentDeltaRef.current !== 0) {
                setTimeInSeconds(prev => Math.max(0, prev + timeAdjustmentDeltaRef.current));
                recordAdjustment(timeAdjustmentDeltaRef.current);
                setLastAdjustmentAmount(timeAdjustmentDeltaRef.current);
                setLastAction('time_adjustment');
                setShowUndo(true);
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                undoTimeoutRef.current = window.setTimeout(() => setShowUndo(false), 10000);
            }
            
            setIsKnobDragging(false);
            setSmoothDragOffset(0);
            setKnobTextureOffset(0);
            setTimeAdjustmentDelta(0);
            if (wasActiveBeforeKnob.current) {
                timerHandlers.setIsActive(true);
            }
            setIsKnobActive(false);

        } else {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            setShowUndo(false);
            setTimeAdjustmentDelta(0);
            setSmoothDragOffset(0);
            setKnobTextureOffset(0);
            wasActiveBeforeKnob.current = isActive;
            if (isActive) timerHandlers.setIsActive(false);
            setIsKnobActive(true);
            knobDragRef.current.timeAtDragStart = timeInSecondsRef.current;
        }
    };

    const cancelKnobAdjustment = useCallback(() => {
        if (!isKnobActive) return;
        setTimeAdjustmentDelta(0);
        setIsKnobDragging(false);
        setSmoothDragOffset(0);
        setKnobTextureOffset(0);
        if (wasActiveBeforeKnob.current) {
            timerHandlers.setIsActive(true);
        }
        setIsKnobActive(false);
    }, [isKnobActive, timerHandlers]);

    const handleKnobKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isKnobActive) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleKnobClick();
            }
        } else {
            e.preventDefault();
            const adjustmentAmount = e.shiftKey ? 300 : 60; // 5 mins or 1 min
            switch(e.key) {
                case 'ArrowUp':
                case 'ArrowRight':
                    applyTimeAdjustment(adjustmentAmount);
                    break;
                case 'ArrowDown':
                case 'ArrowLeft':
                    applyTimeAdjustment(-adjustmentAmount);
                    break;
                case 'Enter':
                case ' ':
                    handleKnobClick();
                    break;
                case 'Escape':
                    cancelKnobAdjustment();
                    break;
            }
        }
    }, [isKnobActive, applyTimeAdjustment, handleKnobClick, cancelKnobAdjustment]);


    // --- SET GOAL & BREAK (DROP ZONE) ---
    const handleSetGoalAndBreak = useCallback(() => {
        // If in break mode, end the break and start the next session.
        if (timer.mode === 'break') {
            endBreakAndStartNewSession(interferenceLevel, notificationPermission);
        } else {
            // Otherwise, set the goal and start a break.
            const minWorkSeconds = settings.minWorkMins * 60;
            setGoalAndStartBreak(minWorkSeconds, interferenceLevel, notificationPermission);
        }
        
        // Universal cleanup for the knob and drop zone state.
        setIsKnobActive(false);
        setIsKnobDragging(false);
        setTimeAdjustmentDelta(0);
        setSmoothDragOffset(0);
        setKnobTextureOffset(0);
        wasActiveBeforeKnob.current = false;
        setIsHoveringDropZone(false);
        setIsDropZoneArmed(false);
        if (dropZoneHoverTimeoutRef.current) {
            clearTimeout(dropZoneHoverTimeoutRef.current);
        }
    }, [settings.minWorkMins, timer.mode, setGoalAndStartBreak, endBreakAndStartNewSession, interferenceLevel, notificationPermission]);

    // This must be defined before it's used in the useEffect below.
    const handleDropZoneEnter = useCallback(() => {
        setIsHoveringDropZone(true);
        if (dropZoneHoverTimeoutRef.current) clearTimeout(dropZoneHoverTimeoutRef.current);
        dropZoneHoverTimeoutRef.current = window.setTimeout(() => {
            setIsDropZoneArmed(true);
            if ('vibrate' in navigator) navigator.vibrate(50);
        }, 1000);
    }, []);

    const handleDropZoneLeave = useCallback(() => {
        setIsHoveringDropZone(false);
        setIsDropZoneArmed(false);
        if (dropZoneHoverTimeoutRef.current) {
            clearTimeout(dropZoneHoverTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isKnobDragging) return;
        
        const handleMove = (clientY: number, clientX: number) => {
            const totalDeltaY = knobDragRef.current.startY - clientY;
            const SCALING_FACTOR = 40;
            const MAPPED_OFFSET = Math.atan(totalDeltaY / SCALING_FACTOR) * SCALING_FACTOR * 1.5;
            setKnobTextureOffset(MAPPED_OFFSET);
            let smoothSecondsOffset = -totalDeltaY + knobDragRef.current.initialTimeAdjustmentDelta;
            const timeAtDragStart = knobDragRef.current.timeAtDragStart;
            if (timeAtDragStart + smoothSecondsOffset < 0) {
                smoothSecondsOffset = -timeAtDragStart;
                const REVERSE_MAPPED_OFFSET = Math.tan((-timeAtDragStart - knobDragRef.current.initialTimeAdjustmentDelta) / (SCALING_FACTOR * 1.5)) * SCALING_FACTOR;
                setKnobTextureOffset(REVERSE_MAPPED_OFFSET);
            }
            setSmoothDragOffset(smoothSecondsOffset);
            const deltaYFromLastTick = knobDragRef.current.lastTimeUpdateY - clientY;
            const tickThreshold = 15;
            if (Math.abs(deltaYFromLastTick) >= tickThreshold) {
                const ticks = Math.floor(deltaYFromLastTick / tickThreshold);
                applyTimeAdjustment(-ticks * 15);
                knobDragRef.current.lastTimeUpdateY -= (ticks * tickThreshold);
            }
             // --- FIX: Manual collision detection for touch devices ---
            if (dropZoneRef.current && 'ontouchstart' in window) {
                const rect = dropZoneRef.current.getBoundingClientRect();
                const isOver = clientX >= rect.left && clientX <= rect.right &&
                               clientY >= rect.top && clientY <= rect.bottom;
                
                if (isOver && !isHoveringDropZoneRef.current) {
                    handleDropZoneEnter();
                } else if (!isOver && isHoveringDropZoneRef.current) {
                    handleDropZoneLeave();
                }
            }
        };

        const handleDragEnd = () => {
            setIsKnobDragging(false);
            setSmoothDragOffset(0);
            if (isHoveringDropZoneRef.current && isDropZoneArmedRef.current) {
                handleSetGoalAndBreak();
            }
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientY, e.clientX);
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            handleMove(e.touches[0].clientY, e.touches[0].clientX);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isKnobDragging, applyTimeAdjustment, handleSetGoalAndBreak, handleDropZoneEnter, handleDropZoneLeave]);

    const handleKnobWheel = (e: React.WheelEvent) => {
        if (!isKnobActive) return;
        e.preventDefault();
        const isOverKnob = knobRef.current?.contains(e.target as Node);
        let adjustment = 0;
        switch (knobScrollMode) {
            case 'natural':
                adjustment = isOverKnob ? (e.deltaY > 0 ? 15 : -15) : (e.deltaY > 0 ? -15 : 15);
                break;
            case 'up_is_increase':
                adjustment = e.deltaY > 0 ? -15 : 15;
                break;
            case 'down_is_increase':
                adjustment = e.deltaY > 0 ? 15 : -15;
                break;
        }
        applyTimeAdjustment(adjustment);
        setKnobTextureOffset(prev => prev - e.deltaY * 0.5);
    };

    const handleKnobInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isKnobActive) return;
        e.preventDefault();
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        knobDragRef.current.startY = clientY;
        knobDragRef.current.lastTimeUpdateY = clientY;
        knobDragRef.current.initialTimeAdjustmentDelta = timeAdjustmentDelta;
        knobDragRef.current.timeAtDragStart = timeInSecondsRef.current;
        setIsKnobDragging(true);
        setSmoothDragOffset(timeAdjustmentDelta);
    };

    const handleUndo = useCallback(() => {
        if (lastAction === 'time_adjustment') {
            setTimeInSeconds(prev => Math.max(0, prev - lastAdjustmentAmount));
        } else if (lastAction === 'start_break') {
            undoBreak();
        }
        setShowUndo(false);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }, [lastAction, lastAdjustmentAmount, setTimeInSeconds, undoBreak]);

    // This wrapper is needed to set the last action correctly for the undo button.
    const handleStartBreak = useCallback(() => {
        startBreak(interferenceLevel, notificationPermission);
        setLastAction('start_break');
        setShowUndo(true);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = window.setTimeout(() => setShowUndo(false), 10000);
    }, [startBreak, interferenceLevel, notificationPermission]);


    return {
        state: {
            interferenceLevel,
            isKnobActive,
            isKnobDragging,
            isDropZoneArmed,
            showUndo,
            lastAction,
            displayedTime,
            currentDelta,
            deltaMinuteHandRotation,
            knobRef,
            dropZoneRef,
            knobTextureOffset,
        },
        handlers: {
            handleKnobClick,
            handleKnobWheel,
            handleKnobInteractionStart,
            handleKnobKeyDown,
            cancelKnobAdjustment,
            handleUndo,
            handleStartBreak,
            handleInterferenceCycle,
            handleSetGoalAndBreak,
            handleDropZoneEnter,
            handleDropZoneLeave
        }
    };
};

export default useInteractions;