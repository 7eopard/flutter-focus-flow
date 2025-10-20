import React, { useCallback } from 'react';
import useRealTime from '../../hooks/useRealTime';
// FIX: TimerState is not exported from ../../types. It is exported from ../../hooks/useTimer.
import { Settings } from '../../types';
import { TimerState } from '../../hooks/useTimer';

const CENTER = 260;

interface AnalogLayerProps {
    showDigital: boolean;
    settings: Settings;
    timer: TimerState;
    displayedTime: number;
}

const AnalogLayer: React.FC<AnalogLayerProps> = ({ showDigital, settings, timer, displayedTime }) => {
    const { currentTime, secondsRotation, minutesRotation, hoursRotation } = useRealTime(settings.secondHandStyle);
    const { startTime, displayMode } = timer;
    const { minWorkMins } = settings;

    const getStartBezelRotation = useCallback((): number => {
        if (!startTime) return minutesRotation;
        const startMinutes = startTime.getMinutes();
        const startSeconds = startTime.getSeconds();
        return (startMinutes * 6) + (startSeconds * 0.1);
    }, [startTime, minutesRotation]);

    const getGoalBezelRotation = useCallback((): number => {
        const minWorkSeconds = minWorkMins * 60;
        if (displayMode === 'count up') {
            const inferredStartTime = startTime || new Date(currentTime.getTime() - displayedTime * 1000);
            const goalTime = new Date(inferredStartTime.getTime() + minWorkSeconds * 1000);
            return (goalTime.getMinutes() * 6) + (goalTime.getSeconds() * 0.1);
        } else { // Countdown
            const remainingSeconds = minWorkSeconds - displayedTime;
            const eta = new Date(currentTime.getTime() + remainingSeconds * 1000);
            return (eta.getMinutes() * 6) + (eta.getSeconds() * 0.1);
        }
    }, [startTime, currentTime, displayedTime, minWorkMins, displayMode]);

    const BezelMarker: React.FC<{ rotation: number; type: 'start' | 'goal' }> = ({ rotation, type }) => {
        const shapePath = type === 'start'
            ? "M 232 17.5 L 248 17.5 L 252 42.5 L 228 42.5 Z"
            : "M 230 17.5 L 250 17.5 L 240 42.5 Z";
        const lumePath = type === 'start'
            ? "M 233 19.5 L 247 19.5 L 250 40.5 L 230 40.5 Z"
            : "M 232 19.5 L 248 19.5 L 240 38.5 Z";
        const baseTranslate = CENTER - 240;

        return (
            <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CENTER}px ${CENTER}px`, transition: 'transform 0.35s linear' }}>
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="fill-[rgba(var(--text-muted-rgb),0.3)] stroke-[rgba(var(--text-muted-rgb),0.5)] stroke-[0.5] transition-colors" d={shapePath} />
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="fill-[var(--accent-color)] transition-colors" d={lumePath} />
            </g>
        );
    };

    return (
        <g style={{ opacity: showDigital ? 0.1 : 1, transition: 'opacity 0.4s ease' }}>
            <BezelMarker rotation={getStartBezelRotation()} type="start" />
            <BezelMarker rotation={getGoalBezelRotation()} type="goal" />
            
            {/* Real Time Clock */}
            <g style={{ transform: `rotate(${hoursRotation}deg)`, transformOrigin: `${CENTER}px ${CENTER}px` }}>
                <line className="stroke-[var(--text-color)] stroke-[6] [stroke-linecap:round] transition-stroke" x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 62} />
            </g>
            <g style={{ transform: `rotate(${minutesRotation}deg)`, transformOrigin: `${CENTER}px ${CENTER}px` }}>
                <line className="stroke-[var(--text-color)] stroke-4 [stroke-linecap:round] transition-stroke" x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 103} />
            </g>
            <g style={{ transform: `rotate(${secondsRotation}deg)`, transformOrigin: `${CENTER}px ${CENTER}px`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <line className="stroke-[var(--accent-color)] stroke-2 [stroke-linecap:round] transition-stroke" x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 113} />
            </g>
            <circle className="fill-[var(--text-color)]" cx={CENTER} cy={CENTER} r="4" />
        </g>
    );
};

export default AnalogLayer;
