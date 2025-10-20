import React from 'react';
import { TimerState } from '../../hooks/useTimer';
import { Settings } from '../../types';

interface ProgressRingProps {
    timer: TimerState;
    settings: Settings;
    displayedTime: number;
}

const VIEWBOX_SIZE = 520;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 210;
const STROKE_WIDTH = 25;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// For overtime
const GAP = 1;
const OVERTIME_STROKE_WIDTH = 10;
const OUTER_RADIUS = RADIUS + (STROKE_WIDTH / 2) + GAP + (OVERTIME_STROKE_WIDTH / 2);
const OUTER_CIRCUMFERENCE = 2 * Math.PI * OUTER_RADIUS;

const ProgressRing: React.FC<ProgressRingProps> = ({ timer, settings, displayedTime }) => {
    const { mode, displayMode } = timer;
    const { minWorkMins } = settings;

    const progress = displayedTime / (minWorkMins * 60);

    const ringClasses = "transition-all duration-300 linear stroke-[var(--accent-color)]";

    if (mode === 'break') {
        return null; // No ring during break
    }

    if (displayMode === 'countdown') {
        return (
            <g transform={`translate(${CENTER}, ${CENTER}) rotate(-90) scale(1, -1)`}>
                <circle
                    className={ringClasses}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    fill="transparent"
                    r={RADIUS}
                    cx="0"
                    cy="0"
                    style={{
                        strokeDasharray: CIRCUMFERENCE,
                        strokeDashoffset: progress * CIRCUMFERENCE
                    }}
                />
            </g>
        );
    }
    
    // Count Up Mode
    const mainProgress = Math.min(1, progress);
    const overtimeProgress = Math.max(0, progress - 1);
    const mainOffset = CIRCUMFERENCE - mainProgress * CIRCUMFERENCE;
    const overtimeOffset = OUTER_CIRCUMFERENCE - overtimeProgress * OUTER_CIRCUMFERENCE;

    return (
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            <circle
                className={ringClasses}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="transparent"
                r={RADIUS}
                cx={CENTER}
                cy={CENTER}
                style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: mainOffset }}
            />
            {progress > 1 && (
                <circle
                    className={`${ringClasses} opacity-80`}
                    strokeWidth={OVERTIME_STROKE_WIDTH}
                    strokeLinecap="round"
                    fill="transparent"
                    r={OUTER_RADIUS}
                    cx={CENTER}
                    cy={CENTER}
                    style={{ strokeDasharray: OUTER_CIRCUMFERENCE, strokeDashoffset: overtimeOffset }}
                />
            )}
        </g>
    );
};

export default ProgressRing;