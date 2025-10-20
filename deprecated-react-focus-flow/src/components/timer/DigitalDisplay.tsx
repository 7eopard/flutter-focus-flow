import React from 'react';
import TimeDisplay from '../TimeDisplay';
import { TimerState } from '../../hooks/useTimer';
import { Interactions } from '../../hooks/useInteractions';
import { Settings } from '../../types';

interface DigitalDisplayProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    settings: Settings;
    interactions: Interactions;
    showDigital: boolean;
}

const DigitalDisplay: React.FC<DigitalDisplayProps> = ({ t, timer, settings, interactions, showDigital }) => {
    const { mode, displayMode } = timer;
    const { minWorkMins } = settings;
    const { displayedTime } = interactions.state;

    const minWorkSeconds = minWorkMins * 60;

    return (
        <>
            <div 
                className="main-time-container" 
                style={{ opacity: showDigital ? 1 : 0.1, transition: 'opacity 0.4s ease' }}
            >
                <TimeDisplay seconds={mode === 'work' && displayMode === 'countdown' ? minWorkSeconds - displayedTime : displayedTime} />
            </div>

            <div className="timer-footer">
                {/* Footer is now mostly empty */}
            </div>
        </>
    );
};

export default DigitalDisplay;