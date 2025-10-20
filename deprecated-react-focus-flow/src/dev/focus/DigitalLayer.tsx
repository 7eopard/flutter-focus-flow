import React from 'react';
import { TimerState } from '../../hooks/useTimer';
import { Interactions } from '../../hooks/useInteractions';
import { Settings } from '../../types';

interface DigitalLayerProps {
    showDigital: boolean;
    timer: TimerState;
    settings: Settings;
    interactions: Interactions;
}

const CharacterDisplay: React.FC<{ text: string }> = ({ text }) => (
    <>
        {text.split('').map((char, i) => (
            <span key={i} className="inline-block w-[13cqw] text-center">{char}</span>
        ))}
    </>
);

const DigitalLayer: React.FC<DigitalLayerProps> = ({ showDigital, timer, settings, interactions }) => {
    const { mode, displayMode } = timer;
    const { displayedTime } = interactions.state;
    const { minWorkMins } = settings;
    const minWorkSeconds = minWorkMins * 60;

    const secondsToDisplay = mode === 'work' && displayMode === 'countdown' 
        ? minWorkSeconds - displayedTime 
        : displayedTime;
        
    const absSeconds = Math.abs(secondsToDisplay);
    const leftValue = Math.floor(absSeconds / 60);
    const rightValue = absSeconds % 60;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] flex items-center justify-center pointer-events-none">
            <div 
                className={`w-full h-full flex flex-col items-center justify-center text-center transition-opacity duration-300
                    [container-type:inline-size]
                    ${showDigital ? 'opacity-100' : 'opacity-0'}
                `}
            >
                <div className="flex items-center justify-center leading-none font-bold text-[var(--text-color)] text-[22cqw]">
                    {/* Time Value */}
                    <div className="flex">
                        <CharacterDisplay text={leftValue.toString().padStart(2, '0')} />
                    </div>
                    {/* Separator */}
                    <span className="text-[20cqw] mx-[1cqw] text-center -translate-y-1">:</span>
                    {/* Time Value */}
                    <div className="flex">
                         <CharacterDisplay text={rightValue.toString().padStart(2, '0')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DigitalLayer;