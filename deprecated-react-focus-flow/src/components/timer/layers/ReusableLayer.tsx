import React from 'react';
import ClockMarkers from '../ClockMarkers';

interface ReusableLayerProps {
    radius: number;
    center: number;
    guideRef: React.Ref<SVGCircleElement>;
}

const ReusableLayer: React.FC<ReusableLayerProps> = ({ radius, center, guideRef }) => {
    return (
        <g>
            <circle
                ref={guideRef}
                className="progress-ring__background"
                strokeWidth="25"
                fill="transparent"
                r={radius}
                cx={center}
                cy={center}
            />
            <g>
                <ClockMarkers radius={radius} center={center} strokeWidth={25} />
            </g>
        </g>
    );
};

export default ReusableLayer;