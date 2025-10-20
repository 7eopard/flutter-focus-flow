import React from 'react';

const AnalogClockLabels = ({ radius, center = 200 }: { radius: number, center?: number }) => {
    return (
        <g>
            {Array.from({ length: 12 }, (_, i) => {
                const hour = i === 0 ? 12 : i;
                const targetAngle = (hour / 12) * 2 * Math.PI - Math.PI / 2;
                const sourceAngle = targetAngle;

                const x = center + radius * Math.cos(sourceAngle);
                const y = center + radius * Math.sin(sourceAngle);

                return (
                    <text key={hour} x={x} y={y} className="clock-time-label" style={{fontSize: '1.2rem'}}>
                        {hour === 0 ? 12 : hour}
                    </text>
                );
            })}
        </g>
    );
};

export default AnalogClockLabels;