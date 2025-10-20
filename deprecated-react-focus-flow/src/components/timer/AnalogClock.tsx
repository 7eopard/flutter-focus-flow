import React from 'react';
import useRealTime from '../../hooks/useRealTime';
import { SecondHandStyle } from '../../types';

interface AnalogClockProps {
    secondHandStyle: SecondHandStyle;
    center: number;
}

const getSecondHandTransition = (style: SecondHandStyle): React.CSSProperties => {
    switch (style) {
        case 'quartz_sweep':
        case 'high_freq_escapement':
            // For smooth or high-frequency movements, let the JS drive the updates without CSS animation.
            return { transition: 'none' };
        case 'traditional_escapement':
            // A quick, sharp transition for the twice-per-second tick.
            return { transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)' };
        case 'quartz_tick':
        default:
            // The original, more pronounced "tick" animation.
            return { transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' };
    }
};


const AnalogClock: React.FC<AnalogClockProps> = ({ secondHandStyle, center }) => {
    const { secondsRotation, minutesRotation, hoursRotation } = useRealTime(secondHandStyle);
    
    // Proportional lengths based on a radius of 210
    const r = center / 210;
    
    const secondHandGroupStyle: React.CSSProperties = {
        transform: `rotate(${secondsRotation}deg)`,
        transformOrigin: `${center}px ${center}px`,
        ...getSecondHandTransition(secondHandStyle)
    };

    return (
         <g>
            {/* Labels have been extracted to AnalogClockLabels.tsx */}
            <g style={{ transform: `rotate(${hoursRotation}deg)`, transformOrigin: `${center}px ${center}px` }}>
                <line className="hour-hand" x1={center} y1={center} x2={center} y2={center - (62 * r)} />
                <line className="hour-hand-lume" x1={center} y1={center - (5 * r)} x2={center} y2={center - (56 * r)} strokeWidth="2.5" />
            </g>
            <g style={{ transform: `rotate(${minutesRotation}deg)`, transformOrigin: `${center}px ${center}px` }}>
                <line className="minute-hand-realtime" x1={center} y1={center} x2={center} y2={center - (103 * r)} />
                <line className="minute-hand-lume" x1={center} y1={center - (5 * r)} x2={center} y2={center - (98 * r)} strokeWidth="2" />
            </g>
            <g style={secondHandGroupStyle}>
                <line className="second-hand" x1={center} y1={center} x2={center} y2={center - (113 * r)} />
            </g>
            <circle className="clock-center" cx={center} cy={center} r="4" />
        </g>
    );
};

export default AnalogClock;