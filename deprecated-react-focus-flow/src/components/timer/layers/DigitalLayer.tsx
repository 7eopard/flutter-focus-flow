import React from 'react';
import DigitalDisplay from '../DigitalDisplay';
import { TimerState } from '../../../hooks/useTimer';
import { Interactions } from '../../../hooks/useInteractions';
import { Settings } from '../../../types';

interface DigitalLayerProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    settings: Settings;
    interactions: Interactions;
    showDigital: boolean;
}

const DigitalLayer: React.FC<DigitalLayerProps> = ({ t, timer, settings, interactions, showDigital }) => {
    const isGlancing = !showDigital;
    return (
        <div className="timer-content-positioner">
            <div className={`timer-content-inner ${isGlancing ? 'glancing' : ''}`}>
                 <DigitalDisplay
                    t={t}
                    timer={timer}
                    settings={settings}
                    interactions={interactions}
                    showDigital={showDigital}
                 />
            </div>
        </div>
    );
};

export default DigitalLayer;