import React from 'react';
import BezelMarkers from '../BezelMarkers';
import AnalogClockLabels from '../AnalogClockLabels';
import PomodoroGoalMarkers from '../PomodoroGoalMarkers';
import { TimerState } from '../../../hooks/useTimer';
import { Settings } from '../../../types';

interface MutuallyExclusiveLayerProps {
    showDigital: boolean;
    timer: TimerState;
    settings: Settings;
    displayedTime: number;
    progress: number;
    radius: number;
    outerRadius: number;
    circumference: number;
    center: number;
    minWorkMins: number;
    goalMarkerDivision: Settings['goalMarkerDivision'];
}

const MutuallyExclusiveLayer: React.FC<MutuallyExclusiveLayerProps> = ({
    showDigital,
    timer,
    settings,
    displayedTime,
    progress,
    radius,
    outerRadius,
    circumference,
    center,
    minWorkMins,
    goalMarkerDivision,
}) => {
    const { mode, displayMode } = timer;
    const { realismLevel } = settings;

    if (showDigital) {
        // Countdown ring starts full and depletes counter-clockwise.
        const countdownRing = (
            <g transform={`translate(${center}, ${center}) rotate(-90) scale(1, -1)`}>
                <circle
                    className="progress-ring__main"
                    strokeWidth="25"
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="0"
                    cy="0"
                    style={{ 
                        strokeDasharray: circumference, 
                        strokeDashoffset: progress * circumference 
                    }}
                />
            </g>
        );
        
        // Count up ring starts empty and fills clockwise
        const mainProgress = Math.min(1, progress);
        const overtimeProgress = Math.max(0, progress - 1);
        const outerCircumference = 2 * Math.PI * outerRadius;
        const mainOffset = circumference - mainProgress * circumference;
        const overtimeOffset = outerCircumference - overtimeProgress * outerCircumference;
        
        const countUpRing = (
             <g transform={`rotate(-90 ${center} ${center})`}>
                <circle
                    className="progress-ring__main"
                    strokeWidth="25"
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={center}
                    cy={center}
                    style={{ strokeDasharray: circumference, strokeDashoffset: mainOffset }}
                />
                {progress > 1 && (
                     <circle
                        className="progress-ring__overtime"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        r={outerRadius}
                        cx={center}
                        cy={center}
                        style={{ strokeDasharray: outerCircumference, strokeDashoffset: overtimeOffset }}
                    />
                )}
            </g>
        );

        return (
            <g className={`progress-ring ${!showDigital ? 'analog-view' : 'digital-view'}`}>
                {/* Render the correct progress ring based on mode */}
                {mode === 'work' && displayMode === 'count up' && countUpRing}
                {mode === 'work' && displayMode === 'countdown' && countdownRing}

                {/* Always render goal markers in digital work mode */}
                {mode === 'work' && (
                    <PomodoroGoalMarkers
                        radius={radius}
                        minWorkMins={minWorkMins}
                        displayedTime={displayedTime}
                        goalMarkerDivision={goalMarkerDivision}
                        center={center}
                    />
                )}
            </g>
        );

    } else { // Analog View
        return (
            <g>
                <BezelMarkers timer={timer} settings={settings} displayedTime={displayedTime} center={center}/>
                <AnalogClockLabels radius={radius - 45} center={center} />
            </g>
        );
    }
};

export default MutuallyExclusiveLayer;