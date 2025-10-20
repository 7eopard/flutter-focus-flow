import React from 'react';
import AnalogClock from '../AnalogClock';
import { SecondHandStyle } from '../../../types';

interface AnalogLayerProps {
    showDigital: boolean;
    secondHandStyle: SecondHandStyle;
    center: number;
}
const NON_FOCUSED_OPACITY = 0.1;

const AnalogLayer: React.FC<AnalogLayerProps> = ({ showDigital, secondHandStyle, center }) => {
    
    const style: React.CSSProperties = {
        opacity: showDigital ? NON_FOCUSED_OPACITY : 1,
        transition: 'opacity 0.4s ease',
    };
    
    return (
        <g className="real-time-clock" style={style}>
            <AnalogClock secondHandStyle={secondHandStyle} center={center} />
        </g>
    );
};

export default AnalogLayer;