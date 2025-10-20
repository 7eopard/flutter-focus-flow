import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Settings, View } from '../../types';
import { TimerState, TimerHandlers } from '../../hooks/useTimer';
import { Interactions } from '../../hooks/useInteractions';

import ClockFace from './ClockFace';
import ProgressRing from './ProgressRing';
import AnalogLayer from './AnalogLayer';
import DigitalLayer from './DigitalLayer';
import PomodoroGoalMarkers from './PomodoroGoalMarkers';
import PrimaryActionButton from './PrimaryActionButton';

interface DevFocusViewProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    timerHandlers: TimerHandlers;
    interactions: Interactions;
    settings: Settings;
    setView: (view: View) => void;
    infoMessage: string | null;
    setHoverInfo: (text: string | null) => void;
    primaryView: 'digital' | 'analog';
}

const DevFocusView: React.FC<DevFocusViewProps> = (props) => {
    const { t, timer, interactions, settings, primaryView } = props;
    const { isKnobActive, displayedTime, deltaMinuteHandRotation, knobTextureOffset } = interactions.state;
    const { handleKnobWheel, handleKnobKeyDown } = interactions.handlers;
    
    const [currentlyVisibleView, setCurrentlyVisibleView] = useState<'digital' | 'analog'>(primaryView);
    const showDigital = currentlyVisibleView === 'digital';

    // --- Refs and State for Knob/Stem Positioning ---
    const clockContainerRef = useRef<HTMLDivElement>(null);
    const [knobStyle, setKnobStyle] = useState<React.CSSProperties>({});
    const [stemStyle, setStemStyle] = useState<React.CSSProperties>({});

    useLayoutEffect(() => {
        const calculateStyles = () => {
            const containerEl = clockContainerRef.current;
            if (!containerEl) return;

            const rect = containerEl.getBoundingClientRect();
            const scale = rect.width / 520; // 520 is the base viewBox size

            const KNOB_BASE_WIDTH = 35;
            const KNOB_BASE_HEIGHT = 70;
            const STEM_BASE_HEIGHT = 6;

            const knobWidth = KNOB_BASE_WIDTH * scale;
            const knobHeight = KNOB_BASE_HEIGHT * scale;
            
            const pullOutDistance = knobWidth * 0.5 + 5 * scale;

            setKnobStyle({
                right: `${-knobWidth / 2}px`,
                top: '50%',
                width: `${knobWidth}px`,
                height: `${knobHeight}px`,
                borderRadius: `${20 * scale}px`,
                borderWidth: `${2 * scale}px`,
                transform: `translateY(-50%) translateX(${isKnobActive ? pullOutDistance : 0}px)`,
                backgroundPositionY: `${knobTextureOffset}px`
            });

            const stemHeight = STEM_BASE_HEIGHT * scale;
            const stemStartOffset = (rect.width / 2) - ((210 + 25 / 2) * scale);
            const finalStemWidth = stemStartOffset + (isKnobActive ? pullOutDistance : 0);

            setStemStyle({
                right: '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: `${finalStemWidth}px`,
                height: `${stemHeight}px`,
            });
        };

        calculateStyles();
        
        const observer = new ResizeObserver(calculateStyles);
        if (clockContainerRef.current) {
            observer.observe(clockContainerRef.current);
        }
        
        return () => observer.disconnect();
    }, [isKnobActive, knobTextureOffset]);

    const localHandleKnobInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        interactions.handlers.handleKnobInteractionStart(e);
    };

    return (
        <div className="relative flex flex-col items-center h-full p-0 m-0" onWheel={handleKnobWheel}>
            <div className="relative w-full flex justify-center items-center mb-8 flex-1 min-h-0">
                <div 
                    ref={clockContainerRef}
                    className="relative w-[85vmin] max-w-[750px] aspect-square flex justify-center items-center flex-shrink-0 select-none"
                    aria-label="Timer display"
                >
                    <div
                        className={`absolute z-20 transition-transform duration-300 ${isKnobActive ? 'cursor-ns-resize' : 'cursor-pointer'}`}
                        style={knobStyle}
                        ref={interactions.state.knobRef}
                        onClick={(e) => { e.stopPropagation(); interactions.handlers.handleKnobClick(); }}
                        onMouseDown={localHandleKnobInteractionStart}
                        onTouchStart={localHandleKnobInteractionStart}
                        onKeyDown={handleKnobKeyDown}
                        tabIndex={2}
                        role="slider"
                    ></div>
                    <div className="absolute z-10" style={stemStyle}></div>

                    <ClockFace>
                        {showDigital && timer.mode === 'work' && (
                            <>
                                <ProgressRing
                                    timer={timer}
                                    settings={settings}
                                    displayedTime={displayedTime}
                                />
                                <PomodoroGoalMarkers
                                    radius={210}
                                    center={260}
                                    minWorkMins={settings.minWorkMins}
                                    displayedTime={displayedTime}
                                    goalMarkerDivision={settings.goalMarkerDivision}
                                />
                            </>
                        )}
                        <AnalogLayer
                            showDigital={showDigital}
                            settings={settings}
                            timer={timer}
                            displayedTime={displayedTime}
                        />
                        {isKnobActive && (
                            <g style={{ transform: `rotate(${deltaMinuteHandRotation}deg)`, transformOrigin: `260px 260px` }}>
                                <line
                                    className="stroke-[var(--accent-color)] stroke-[5] [stroke-linecap:round] transition-transform duration-100 linear"
                                    x1="260" y1="260" x2="260" y2={260 - (210 * 0.44)}
                                />
                            </g>
                        )}
                    </ClockFace>
                    
                    <DigitalLayer
                        showDigital={showDigital}
                        timer={timer}
                        settings={settings}
                        interactions={interactions}
                    />
                </div>
            </div>
            
            <div className="flex flex-col items-center justify-center w-full flex-shrink-0 md:relative pb-[72px] md:pb-0">
                <div className="flex flex-col items-center justify-center w-full min-h-[1.5rem] md:min-h-[4.5rem]">
                     <div className={`transition-opacity duration-300 ${props.infoMessage ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-[var(--text-muted)] text-sm font-medium">
                            {props.infoMessage || ' '}
                        </span>
                    </div>
                </div>
                <PrimaryActionButton {...props} />
            </div>
        </div>
    );
};

export default DevFocusView;