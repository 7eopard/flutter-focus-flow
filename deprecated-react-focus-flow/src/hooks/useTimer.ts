import { useState, useEffect, useCallback, useRef } from 'react';
import { Mode, DisplayMode, Settings, InterferenceLevel, PomodoroSession } from '../types';
import useAudio from './useAudio';

export type TimerState = ReturnType<typeof useTimer>['timer'];
export type TimerHandlers = ReturnType<typeof useTimer>['timerHandlers'];

interface InterferenceProps {
    interferenceLevel: InterferenceLevel;
    notificationPermission: NotificationPermission;
}

// --- [REFACTORED] Centralized Date Logic ---

/**
 * Applies the "day crossover" logic to a given date.
 * If the date's hour is before the crossover hour, it's considered part of the previous day.
 * @param localDate The local date/time of the session start.
 * @param crossoverHour The hour (0-23) at which the day rolls over.
 * @returns A new Date object representing the correct statistical day.
 */
const getStatisticalDate = (localDate: Date, crossoverHour: number): Date => {
    const d = new Date(localDate); // Create a copy to avoid mutating the original
    if (d.getHours() < crossoverHour) {
        d.setDate(d.getDate() - 1);
    }
    return d;
};

/**
 * Formats a Date object into a 'YYYY-MM-DD' string.
 */
const formatDateId = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Generates the session title string based on its statistical date.
 */
const formatSessionTitle = (statisticalDate: Date, settings: Settings): string => {
    const year = statisticalDate.getFullYear();
    const month = String(statisticalDate.getMonth() + 1).padStart(2, '0');
    const day = String(statisticalDate.getDate()).padStart(2, '0');
    const oneDay = 1000 * 60 * 60 * 24;

    const startOfYearForWeek = new Date(year, 0, 1);
    const dayOfWeekOfJan1 = startOfYearForWeek.getDay(); // 0=Sun, 1=Mon, ...
    const firstDayOfWeekForCalc = settings.firstDayOfWeek === 'monday' ? (dayOfWeekOfJan1 === 0 ? 6 : dayOfWeekOfJan1 - 1) : dayOfWeekOfJan1;
    const daysSinceStart = Math.floor((statisticalDate.getTime() - startOfYearForWeek.getTime()) / oneDay);
    const weekNumber = String(Math.ceil((daysSinceStart + 1 + firstDayOfWeekForCalc) / 7)).padStart(2, '0');
    
    const dayOfWeek = statisticalDate.toLocaleDateString('en-US', { weekday: 'short' });

    return `${year}${month}${day}W${weekNumber}${dayOfWeek}`;
};


const useTimer = (
    settings: Settings,
    interferenceProps: InterferenceProps,
    t: (key: string, ...args: any[]) => string
) => {
    const { defaultDisplayMode, minWorkMins, secondHandStyle } = settings;
    const { interferenceLevel, notificationPermission } = interferenceProps;
    const { playSound, playAlertSequence, getAudioContext } = useAudio();
    
    const [timeInSeconds, setTimeInSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<Mode>('work');
    const [displayMode, setDisplayMode] = useState<DisplayMode>(defaultDisplayMode);
    const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
        try {
            const savedSessions = localStorage.getItem('sessions');
            return savedSessions ? JSON.parse(savedSessions) : [];
        } catch (error) {
            console.error('Failed to parse sessions from localStorage', error);
            return [];
        }
    });
    const [breakTotalDuration, setBreakTotalDuration] = useState(0);
    const [timeAtBreakStart, setTimeAtBreakStart] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [startTimeAtBreakStart, setStartTimeAtBreakStart] = useState<Date | null>(null);
    const [lastUsedInterferenceLevel, setLastUsedInterferenceLevel] = useState<InterferenceLevel>('weak');
    const [lastUsedNotificationPermission, setLastUsedNotificationPermission] = useState(Notification.permission);
    const [firedGoalMarkers, setFiredGoalMarkers] = useState<number[]>([]);

    const [sessionPauseCount, setSessionPauseCount] = useState(0);
    const [sessionTotalPausedTime, setSessionTotalPausedTime] = useState(0);
    const [sessionAdjustments, setSessionAdjustments] = useState<{ amount: number; timestamp: string; }[]>([]);
    const pauseStartTimeRef = useRef<number | null>(null);
    
    const [currentSessionActualDuration, setCurrentSessionActualDuration] = useState(0);
    const lastTickTimeRef = useRef<number | null>(null);
    
    const timeInSecondsRef = useRef(timeInSeconds);
    const interferenceLevelRef = useRef(interferenceLevel);

    useEffect(() => { timeInSecondsRef.current = timeInSeconds; }, [timeInSeconds]);
    useEffect(() => { interferenceLevelRef.current = interferenceLevel; }, [interferenceLevel]);
    useEffect(() => { setDisplayMode(defaultDisplayMode); }, [defaultDisplayMode]);
    useEffect(() => {
        try {
            localStorage.setItem('sessions', JSON.stringify(sessions));
        } catch (error) {
            console.error('Failed to save sessions to localStorage', error);
        }
    }, [sessions]);

    const handleSessionEndFeedback = useCallback((
        title: string,
        body: string,
        level: InterferenceLevel,
        permission: NotificationPermission,
        alertType: 'subGoal' | 'mainGoal' | 'test' | 'breakOver'
    ) => {
        if (settings.legacyPhoneMode) {
             if (level === 'strong' && permission === 'granted') {
                new Notification(title, { body, tag: 'pomodoro-hub-notification' });
            }
            return;
        }

        if ('vibrate' in navigator) {
            if (alertType === 'test') {
                navigator.vibrate(50);
            } else {
                navigator.vibrate([200, 100, 200]);
            }
        }

        if (level === 'strong' && permission === 'granted') {
            new Notification(title, { body, tag: 'pomodoro-hub-notification' });
        }

        if (level === 'zero') {
            return;
        }

        switch (alertType) {
            case 'subGoal':
                if (level === 'weak') playSound('alert', 1200);
                else if (level === 'strong') playAlertSequence(1200, 3);
                break;
            case 'mainGoal':
                if (level === 'weak') playAlertSequence(1500, 3);
                else if (level === 'strong') {
                    const firstSequenceDuration = 5 * 0.15;
                    const pauseDuration = 1.0;
                    const secondSequenceStartTime = firstSequenceDuration + pauseDuration;
                    for (let i = 0; i < 5; i++) {
                        playSound('alert', 1500, i * 0.15);
                        playSound('alert', 1500, secondSequenceStartTime + (i * 0.15));
                    }
                }
                break;
            case 'breakOver':
                if (level === 'weak') playSound('alert', 880);
                else if (level === 'strong') playAlertSequence(880, 2);
                break;
            case 'test':
                if (level === 'weak') playSound('alert', 880);
                else if (level === 'strong') playAlertSequence(880, 2);
                break;
        }
    }, [playSound, playAlertSequence, settings.legacyPhoneMode, t]);

    const getGoalMarkersInMinutes = useCallback(() => {
        const { goalMarkerDivision, minWorkMins } = settings;
        if (goalMarkerDivision === 0 || minWorkMins < goalMarkerDivision) {
            return [];
        }

        const fractions: number[] = [];
        if (goalMarkerDivision === 4) fractions.push(0.25, 0.5, 0.75, 1);
        else if (goalMarkerDivision === 3) fractions.push(1/3, 2/3, 1);
        else if (goalMarkerDivision === 6) fractions.push(1/6, 2/6, 3/6, 4/6, 5/6, 1);

        const markers = fractions.map(fraction => Math.round(minWorkMins * fraction));
        
        return [...new Set(markers)].sort((a, b) => a - b);
    }, [settings.minWorkMins, settings.goalMarkerDivision]);

    const endBreak = useCallback((level: InterferenceLevel, permission: NotificationPermission) => {
        handleSessionEndFeedback(t('breakOverTitle'), t('breakOverBody'), level, permission, 'breakOver');
        setMode('work');
        setTimeInSeconds(0);
        setIsActive(false);
        setDisplayMode(defaultDisplayMode);
        setFiredGoalMarkers([]);
        setCurrentSessionActualDuration(0);
    }, [handleSessionEndFeedback, defaultDisplayMode, t]);

    const resetSessionTracking = useCallback(() => {
        setSessionPauseCount(0);
        setSessionTotalPausedTime(0);
        setSessionAdjustments([]);
        pauseStartTimeRef.current = null;
        setCurrentSessionActualDuration(0);
    }, []);
    
    const startBreak = useCallback((level: InterferenceLevel, permission: NotificationPermission) => {
        const breakDuration = Math.floor(timeInSecondsRef.current / 5);
        
        const totalAdjustment = sessionAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
        const netDuration = currentSessionActualDuration - sessionTotalPausedTime;

        const sessionStartTime = startTime ? startTime.toISOString() : new Date(Date.now() - timeInSecondsRef.current * 1000).toISOString();
        
        const localStartDate = new Date(sessionStartTime);
        const statisticalDate = getStatisticalDate(localStartDate, settings.dayCrossoverHour);
        
        const newSession: PomodoroSession = {
            id: Date.now(),
            startTime: sessionStartTime,
            statisticalDateId: formatDateId(statisticalDate),
            title: formatSessionTitle(statisticalDate, settings),
            endTime: new Date().toISOString(),
            actualDuration: Math.round(currentSessionActualDuration),
            netDuration: Math.round(netDuration),
            recordedDuration: timeInSecondsRef.current,
            mft: settings.minWorkMins,
            pauseCount: sessionPauseCount,
            adjustments: sessionAdjustments,
            totalAdjustment,
            assignedTodos: [],
            todoDurations: {},
            notes: '',
        };
        setSessions(prev => [...prev, newSession]);

        setTimeAtBreakStart(timeInSecondsRef.current);
        setStartTimeAtBreakStart(startTime);
        setBreakTotalDuration(breakDuration);
        setMode('break');
        setTimeInSeconds(breakDuration);
        setIsActive(true);
        setStartTime(null);
        setLastUsedInterferenceLevel(level);
        setLastUsedNotificationPermission(permission);
        setFiredGoalMarkers(getGoalMarkersInMinutes());
        resetSessionTracking();

    }, [startTime, currentSessionActualDuration, sessionAdjustments, sessionTotalPausedTime, sessionPauseCount, settings, getGoalMarkersInMinutes, resetSessionTracking]);

    const setGoalAndStartBreak = useCallback((minWorkSeconds: number, level: InterferenceLevel, permission: NotificationPermission) => {
        const breakDuration = Math.floor(minWorkSeconds / 5);
        handleSessionEndFeedback(t('goalSetAndBreakTitle'), t('breakStartBody', Math.floor(breakDuration / 60)), level, permission, 'mainGoal');
        
        const totalAdjustment = sessionAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
        const finalActualDuration = currentSessionActualDuration + Math.max(0, (minWorkSeconds - timeInSecondsRef.current) - sessionTotalPausedTime);
        const netDuration = finalActualDuration - sessionTotalPausedTime;

        const sessionStartTime = startTime ? startTime.toISOString() : new Date(Date.now() - timeInSecondsRef.current * 1000).toISOString();
        const localStartDate = new Date(sessionStartTime);
        const statisticalDate = getStatisticalDate(localStartDate, settings.dayCrossoverHour);

        const newSession: PomodoroSession = {
            id: Date.now(),
            startTime: sessionStartTime,
            statisticalDateId: formatDateId(statisticalDate),
            title: formatSessionTitle(statisticalDate, settings),
            endTime: new Date().toISOString(),
            actualDuration: Math.round(finalActualDuration),
            netDuration: Math.round(netDuration),
            recordedDuration: minWorkSeconds,
            mft: minWorkSeconds / 60,
            pauseCount: sessionPauseCount,
            adjustments: sessionAdjustments,
            totalAdjustment,
            assignedTodos: [],
            todoDurations: {},
            notes: '',
        };
        setSessions(prev => [...prev, newSession]);

        setTimeAtBreakStart(minWorkSeconds);
        setStartTimeAtBreakStart(new Date(Date.now() - ((timeInSecondsRef.current + (minWorkSeconds - timeInSecondsRef.current)) * 1000 - minWorkSeconds * 1000)));
        setBreakTotalDuration(breakDuration);
        setMode('break');
        setTimeInSeconds(breakDuration);
        setIsActive(true);
        setStartTime(null);
        setLastUsedInterferenceLevel(level);
        setLastUsedNotificationPermission(permission);
        setFiredGoalMarkers(getGoalMarkersInMinutes());
        resetSessionTracking();

    }, [handleSessionEndFeedback, t, getGoalMarkersInMinutes, currentSessionActualDuration, startTime, sessionAdjustments, sessionPauseCount, sessionTotalPausedTime, resetSessionTracking, settings]);

    const undoBreak = useCallback(() => {
        const markers = getGoalMarkersInMinutes();
        const passedMarkers = markers.filter(m => timeAtBreakStart >= m * 60);

        setSessions(prev => prev.slice(0, -1));
        setMode('work');
        setTimeInSeconds(timeAtBreakStart);
        setStartTime(startTimeAtBreakStart);
        setIsActive(true);
        setBreakTotalDuration(0);
        setFiredGoalMarkers(passedMarkers);
    }, [timeAtBreakStart, getGoalMarkersInMinutes, startTimeAtBreakStart]);

    const endBreakAndStartNewSession = useCallback((level: InterferenceLevel, permission: NotificationPermission) => {
        handleSessionEndFeedback(t('breakOverTitle'), t('breakOverBody'), level, permission, 'breakOver');
        setMode('work');
        setTimeInSeconds(0);
        setIsActive(true);
        setStartTime(new Date());
        setDisplayMode(defaultDisplayMode);
        setFiredGoalMarkers([]);
        resetSessionTracking();
    }, [handleSessionEndFeedback, defaultDisplayMode, t, resetSessionTracking]);

    useEffect(() => {
        let interval: number | null = null;
        let startTimeout: number | null = null;

        if (isActive) {
            const now = new Date();
            const CUSHION_MS = 10;
            const delay = 1000 - now.getMilliseconds() + CUSHION_MS;

            startTimeout = window.setTimeout(() => {
                lastTickTimeRef.current = performance.now();
                const tick = () => {
                    if (!settings.legacyPhoneMode && interferenceLevelRef.current !== 'zero' && secondHandStyle === 'quartz_tick') {
                        playSound('tick');
                    }
                    
                    const now = performance.now();
                    if (lastTickTimeRef.current) {
                        const delta = (now - lastTickTimeRef.current) / 1000;
                        if (mode === 'work') {
                            setCurrentSessionActualDuration(prev => prev + delta);
                        }
                    }
                    lastTickTimeRef.current = now;

                    if (mode === 'work') {
                        setTimeInSeconds(prevTime => prevTime + 1);
                    } else {
                        setTimeInSeconds(prevTime => prevTime - 1);
                    }
                };
                
                tick(); 

                interval = window.setInterval(tick, 1000);
            }, delay);
        } else {
            lastTickTimeRef.current = null;
        }

        return () => {
            if (startTimeout) window.clearTimeout(startTimeout);
            if (interval) window.clearInterval(interval);
        };
    }, [isActive, mode, secondHandStyle, playSound, settings.legacyPhoneMode]);

    useEffect(() => {
        if (!isActive || interferenceLevel === 'zero' || settings.legacyPhoneMode) {
            return;
        }

        let audioTimeout: number | null = null;
        const isEscapement = secondHandStyle === 'traditional_escapement' || secondHandStyle === 'high_freq_escapement';

        if (isEscapement) {
            getAudioContext();
            const intervalMs = secondHandStyle === 'traditional_escapement' ? 500 : 125;
            
            const scheduleTick = () => {
                const jitter = (Math.random() - 0.5) * (intervalMs * 0.1);
                playSound('escapement_beat');
                audioTimeout = window.setTimeout(scheduleTick, intervalMs + jitter);
            };
            scheduleTick();
        }

        return () => {
            if (audioTimeout) window.clearTimeout(audioTimeout);
        };
    }, [isActive, secondHandStyle, interferenceLevel, playSound, getAudioContext, settings.legacyPhoneMode]);

    useEffect(() => {
        if (mode === 'work' && isActive) {
            const goalMarkers = getGoalMarkersInMinutes();
            if (goalMarkers.length === 0) return;

            const newFiredMarkers: number[] = [];
            let didFireNewMarker = false;
            
            for (const marker of goalMarkers) {
                const markerInSeconds = marker * 60;
                if (timeInSeconds >= markerInSeconds) {
                    newFiredMarkers.push(marker);
                    if (!firedGoalMarkers.includes(marker)) {
                        didFireNewMarker = true;
                        const lastMarker = goalMarkers[goalMarkers.length - 1];
                        const isMainGoal = marker === lastMarker;

                        handleSessionEndFeedback(
                            isMainGoal ? t('goalReachedTitle') : t('subGoalReachedBody', marker),
                            isMainGoal ? t('goalReachedBody', marker) : t('subGoalReachedBody', marker),
                            interferenceLevel,
                            notificationPermission,
                            isMainGoal ? 'mainGoal' : 'subGoal'
                        );
                    }
                }
            }
            
            if (didFireNewMarker) {
                setFiredGoalMarkers(prevFired => [...new Set([...prevFired, ...newFiredMarkers])]);
            } else if (newFiredMarkers.length < firedGoalMarkers.length) {
                 setFiredGoalMarkers(newFiredMarkers);
            }

        } else if (mode === 'break') {
            if (timeInSeconds <= 0 && isActive) {
                endBreak(lastUsedInterferenceLevel, lastUsedNotificationPermission);
            }
        }
    }, [
        timeInSeconds, 
        isActive, 
        mode, 
        getGoalMarkersInMinutes, 
        handleSessionEndFeedback, 
        t, 
        interferenceLevel, 
        notificationPermission, 
        endBreak, 
        lastUsedInterferenceLevel, 
        lastUsedNotificationPermission,
        firedGoalMarkers
    ]);

    const toggleTimer = () => {
        if (mode === 'break') return;
        getAudioContext();
        if (!isActive && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        if (!isActive && timeInSecondsRef.current === 0) {
            setStartTime(new Date());
        }

        if (isActive) {
            setSessionPauseCount(prev => prev + 1);
            pauseStartTimeRef.current = performance.now();
        } else {
            if (pauseStartTimeRef.current) {
                const pausedDurationMs = performance.now() - pauseStartTimeRef.current;
                setSessionTotalPausedTime(prev => prev + (pausedDurationMs / 1000));
                pauseStartTimeRef.current = null;
            }
        }

        setIsActive(!isActive);
    };

    const toggleDisplayMode = () => {
        setDisplayMode(prev => prev === 'count up' ? 'countdown' : 'count up');
    };

    const recordAdjustment = useCallback((amount: number) => {
        if (amount === 0) return;
        setSessionAdjustments(prev => [...prev, { amount, timestamp: new Date().toISOString() }]);
    }, []);



    const testInterferenceFeedback = useCallback((level: InterferenceLevel, permission: NotificationPermission) => {
        handleSessionEndFeedback(t('testNotificationTitle'), t('testNotificationBody'), level, permission, 'test');
    }, [handleSessionEndFeedback, t]);

    return {
        timer: {
            timeInSeconds,
            isActive,
            mode,
            displayMode,
            sessions,
            breakTotalDuration,
            startTime,
            firedGoalMarkers,
        },
        timerHandlers: {
            setTimeInSeconds,
            setIsActive,
            setMode,
            setBreakTotalDuration,
            toggleTimer,
            toggleDisplayMode,
            startBreak,
            endBreak,
            undoBreak,
            setGoalAndStartBreak,
            testInterferenceFeedback,
            setSessions,
            endBreakAndStartNewSession,
            recordAdjustment,
        },
    };
};

export default useTimer;