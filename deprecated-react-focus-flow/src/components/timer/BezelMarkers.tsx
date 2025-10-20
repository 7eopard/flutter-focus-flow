import React, { useCallback } from 'react';
import { TimerState } from '../../hooks/useTimer';
import { Settings } from '../../types';
import useRealTime from '../../hooks/useRealTime';

interface BezelMarkersProps {
    timer: TimerState;
    settings: Settings;
    displayedTime: number;
    center: number;
}

const BezelMarkers: React.FC<BezelMarkersProps> = ({ timer, settings, displayedTime, center }) => {
    // FIX: Changed the argument from the invalid string 'sweep' to 'quartz_sweep' to match the 'SecondHandStyle' type.
    const { currentTime, minutesRotation } = useRealTime('quartz_sweep'); // sweep for smooth rotation
    const { startTime, displayMode } = timer;
    const { minWorkMins } = settings;

    const getStartBezelRotation = useCallback((): number => {
        if (!startTime) {
            return minutesRotation;
        }
        const startMinutes = startTime.getMinutes();
        const startSeconds = startTime.getSeconds();
        return (startMinutes * 6) + (startSeconds * 0.1);
    }, [startTime, minutesRotation]);

    const getGoalBezelRotation = useCallback((): number => {
        const minWorkSeconds = minWorkMins * 60;
        if (displayMode === 'count up') {
            const inferredStartTime = startTime || new Date(currentTime.getTime() - displayedTime * 1000);
            const goalTime = new Date(inferredStartTime.getTime() + minWorkSeconds * 1000);
            const goalMinutes = goalTime.getMinutes();
            const goalSeconds = goalTime.getSeconds();
            return (goalMinutes * 6) + (goalSeconds * 0.1);
        } else { // Countdown
            const remainingSeconds = minWorkSeconds - displayedTime;
            const eta = new Date(currentTime.getTime() + remainingSeconds * 1000);
            const etaMinutes = eta.getMinutes();
            const etaSeconds = eta.getSeconds();
            return (etaMinutes * 6) + (etaSeconds * 0.1);
        }
    }, [startTime, currentTime, displayedTime, minWorkMins, displayMode]);

    // [FIX] The hardcoded paths were designed for a 480x480 box with a center of 240.
    // This calculation ensures they are correctly offset for the new dynamic center.
    const baseTranslate = center - 240;

    return (
        <g>
            <g
                className="bezel-marker-group bezel-marker-start"
                style={{
                    transform: `rotate(${getStartBezelRotation()}deg)`,
                    transformOrigin: `${center}px ${center}px`,
                    transition: 'transform 0.35s linear'
                }}
            >
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="bezel-marker-shape" d="M 232 17.5 L 248 17.5 L 252 42.5 L 228 42.5 Z" />
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="bezel-marker-lume" d="M 233 19.5 L 247 19.5 L 250 40.5 L 230 40.5 Z" />
            </g>
            <g 
                className="bezel-marker-group bezel-marker-goal" 
                style={{ 
                    transform: `rotate(${getGoalBezelRotation()}deg)`, 
                    transformOrigin: `${center}px ${center}px`,
                    transition: 'transform 0.35s linear'
                }}
            >
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="bezel-marker-shape" d="M 230 17.5 L 250 17.5 L 240 42.5 Z" />
                <path transform={`translate(${baseTranslate}, ${baseTranslate})`} className="bezel-marker-lume" d="M 232 19.5 L 248 19.5 L 240 38.5 Z" />
            </g>
        </g>
    );
};

export default BezelMarkers;