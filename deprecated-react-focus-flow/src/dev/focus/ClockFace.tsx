import React from 'react';

const VIEWBOX_SIZE = 520;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 210;
const STROKE_WIDTH = 25;

const ClockMarkers: React.FC = () => {
    const count = 60;
    const padding = 8;
    const effectiveRadius = RADIUS - (STROKE_WIDTH / 2) - padding;

    return (
        <g>
            {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                const isHour = i % 5 === 0;
                const length = isHour ? 10 : 5;
                const x1 = CENTER + (effectiveRadius - length) * Math.cos(angle);
                const y1 = CENTER + (effectiveRadius - length) * Math.sin(angle);
                const x2 = CENTER + effectiveRadius * Math.cos(angle);
                const y2 = CENTER + effectiveRadius * Math.sin(angle);
                return (
                    <line
                        key={i}
                        className={`
                            stroke-[var(--text-muted)] transition-stroke duration-300
                            ${isHour ? 'stroke-2' : 'stroke-1'}
                        `}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                    />
                );
            })}
        </g>
    );
};

interface ClockFaceProps {
    children: React.ReactNode;
}

const ClockFace: React.FC<ClockFaceProps> = ({ children }) => {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            className="absolute top-0 left-0"
        >
            <g>
                <circle
                    className="stroke-[rgba(138,147,165,0.2)]"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    r={RADIUS}
                    cx={CENTER}
                    cy={CENTER}
                />
                <ClockMarkers />
            </g>
            {children}
        </svg>
    );
};

export default ClockFace;