import React from 'react';

interface ClockMarkersProps {
    radius: number;
    count?: number;
    center?: number;
    strokeWidth?: number;
}

const ClockMarkers: React.FC<ClockMarkersProps> = ({ radius, count = 60, center = 200, strokeWidth = 15 }) => {
    const padding = 8;
    const effectiveRadius = radius - (strokeWidth / 2) - padding;
    return (
        <g>
            {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                const isHour = count === 12 || (count === 60 && i % 5 === 0);
                const length = isHour ? 10 : 5;
                const x1 = center + (effectiveRadius - length) * Math.cos(angle);
                const y1 = center + (effectiveRadius - length) * Math.sin(angle);
                const x2 = center + effectiveRadius * Math.cos(angle);
                const y2 = center + effectiveRadius * Math.sin(angle);
                return <line key={i} className={`clock-marker ${isHour ? 'hour' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
        </g>
    );
};

export default ClockMarkers;
