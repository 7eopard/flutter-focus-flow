





import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { TimerState, TimerHandlers } from '../hooks/useTimer';
import { Interactions } from '../hooks/useInteractions';
import { Settings, View } from '../types';

import ReusableLayer from './timer/layers/ReusableLayer';
import AnalogLayer from './timer/layers/AnalogLayer';
import DigitalLayer from './timer/layers/DigitalLayer';
import MutuallyExclusiveLayer from './timer/layers/MutuallyExclusiveLayer';
import TimerControls from './timer/TimerControls';
import TimeDisplay from './TimeDisplay';
import FormattedText from './common/FormattedText';

interface TimerViewProps {
    t: (key: string, ...args: any[]) => string;
    timer: TimerState;
    timerHandlers: TimerHandlers;
    interactions: Interactions;
    settings: Settings;
    setView: (view: View) => void;
    hoverInfo: string | null;
    infoMessage: string | null;
    setHoverInfo: (text: string | null) => void;
    isZenMode: boolean;
    primaryView: 'digital' | 'analog';
    isZenInterfaceVisible: boolean;
    setIsZenInterfaceVisible: React.Dispatch<React.SetStateAction<boolean>>;
    currentlyVisibleView: 'digital' | 'analog';
}

const VIEWBOX_SIZE = 520;

const TimerView: React.FC<TimerViewProps> = ({ 
    t, timer, timerHandlers, interactions, settings, setView, hoverInfo, infoMessage, setHoverInfo, 
    isZenMode, primaryView, isZenInterfaceVisible, 
    setIsZenInterfaceVisible, currentlyVisibleView
}) => {
    const { mode, isActive } = timer;
    const { minWorkMins } = settings;
    const { isKnobActive, deltaMinuteHandRotation, displayedTime, currentDelta } = interactions.state;
    const { handleKnobWheel, handleKnobKeyDown } = interactions.handlers;

    // --- Refs ---
    const zenInterfaceTimeoutRef = useRef<number | null>(null);
    const timerCardRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const guideRingRef = useRef<SVGCircleElement>(null);

    // --- Dynamic Knob & Stem Positioning ---
    const [knobStyle, setKnobStyle] = useState<React.CSSProperties & { [key: string]: string | number }>({});
    const [stemStyle, setStemStyle] = useState<React.CSSProperties>({});
    
    // Cleanup timeouts on component unmount
    useEffect(() => {
        return () => {
            if (zenInterfaceTimeoutRef.current) clearTimeout(zenInterfaceTimeoutRef.current);
        };
    }, []);

    // Effect for robust Zen Mode focus management
    useEffect(() => {
        if (isZenMode) {
            // When Zen is active OR the temp UI hides, focus the main card
            if (!isZenInterfaceVisible) {
                timerCardRef.current?.focus();
            }
        }
    }, [isZenMode, isZenInterfaceVisible]);


    const calculateStyles = useCallback(() => {
        const svgEl = svgRef.current;
        const guideEl = guideRingRef.current;
        const containerEl = svgEl?.parentElement;
        const wrapperEl = containerEl?.parentElement;

        if (!svgEl || !guideEl || !containerEl || !wrapperEl) return;

        const ctm = svgEl.getScreenCTM();
        if (!ctm) return;

        const SVG_STROKE_WIDTH = 25;
        const SVG_KNOB_BASE_WIDTH = 35;
        const SVG_KNOB_BASE_HEIGHT = 70;
        const SVG_STEM_BASE_HEIGHT = 6;
        const SVG_STEM_GAP = 2;

        const svgR = guideEl.r.baseVal.value;
        const svgCx = guideEl.cx.baseVal.value;
        const svgCy = guideEl.cy.baseVal.value;
        
        const svgRect = svgEl.getBoundingClientRect();
        const scale = svgRect.width / VIEWBOX_SIZE;
        
        const knobCenterRadius = svgR + (SVG_STROKE_WIDTH / 2) + SVG_STEM_GAP + (SVG_KNOB_BASE_WIDTH / 2);
        const knobCenterSvgPoint = svgEl.createSVGPoint();
        knobCenterSvgPoint.x = svgCx + knobCenterRadius;
        knobCenterSvgPoint.y = svgCy;
        const knobCenterScreenPoint = knobCenterSvgPoint.matrixTransform(ctm);
        
        const containerRect = containerEl.getBoundingClientRect();
        const wrapperRect = wrapperEl.getBoundingClientRect();
        
        const knobWidth = SVG_KNOB_BASE_WIDTH * scale;
        const knobHeight = SVG_KNOB_BASE_HEIGHT * scale;
        const pullOutDistance = knobWidth * 0.5 + 5 * scale;

        setKnobStyle({
            left: `${knobCenterScreenPoint.x - containerRect.left - (knobWidth / 2)}px`,
            top: `${knobCenterScreenPoint.y - containerRect.top - (knobHeight / 2)}px`,
            width: `${knobWidth}px`,
            height: `${knobHeight}px`,
            borderRadius: `${20 * scale}px`,
            borderWidth: `${2 * scale}px`,
            '--knob-active-translate-x': `${pullOutDistance}px`,
        });

        const stemStartRadius = svgR + (SVG_STROKE_WIDTH / 2);
        const stemStartSvgPoint = svgEl.createSVGPoint();
        stemStartSvgPoint.x = svgCx + stemStartRadius;
        stemStartSvgPoint.y = svgCy;
        const stemStartScreenPoint = stemStartSvgPoint.matrixTransform(ctm);
        
        const baseStemWidth = (knobCenterScreenPoint.x - (knobWidth/2)) - stemStartScreenPoint.x;
        const finalStemWidth = baseStemWidth + (isKnobActive ? pullOutDistance : 0);
        const stemHeight = SVG_STEM_BASE_HEIGHT * scale;

        setStemStyle({
            left: `${stemStartScreenPoint.x - wrapperRect.left}px`,
            top: `${knobCenterScreenPoint.y - wrapperRect.top - (stemHeight / 2)}px`,
            width: `${finalStemWidth}px`,
            height: `${stemHeight}px`,
        });
    }, [isKnobActive]); 

    useLayoutEffect(() => {
        const svgEl = svgRef.current;
        const observer = new ResizeObserver(calculateStyles);
        
        if (svgEl) {
            observer.observe(svgEl);
        }
        
        calculateStyles(); // Initial calculation

        return () => {
            if (svgEl) {
                observer.unobserve(svgEl);
            }
        };
    }, [calculateStyles]);


    // Handler to temporarily show UI in Zen Mode. Any interaction resets the timer.
    const showZenInterface = () => {
        if (!isZenMode) return;

        if (!isZenInterfaceVisible) {
            setIsZenInterfaceVisible(true);
        }

        if (zenInterfaceTimeoutRef.current) {
            clearTimeout(zenInterfaceTimeoutRef.current);
        }

        zenInterfaceTimeoutRef.current = window.setTimeout(() => {
            setIsZenInterfaceVisible(false);
            zenInterfaceTimeoutRef.current = null;
        }, 3000);
    };
    
    const handleZenKeyDown = (e: React.KeyboardEvent) => {
        if (isZenMode) {
            // Only exit Zen on specific, intentional key presses
            if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter' || e.key === 'Return') {
                showZenInterface();
            }
        }
    };

    const showDigital = currentlyVisibleView === 'digital';

    // --- Logic for Info Display ---
    const minWorkSeconds = minWorkMins * 60;
    const remainingSecondsToGoal = minWorkSeconds - displayedTime;
    const goalEtaDate = new Date(Date.now() + remainingSecondsToGoal * 1000);
    const formattedEta = goalEtaDate.toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit' });
    const showEta = mode === 'work' && (isKnobActive || !isActive) && displayedTime < minWorkSeconds;
    
    // Message priority: Explicit info message > Hover hint > ETA
    const infoText = infoMessage ? infoMessage : (hoverInfo ? hoverInfo : (showEta ? `${t('goalTimeLabel')} ${formattedEta}` : null));

    const formatTimeForAria = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return t('timeValue', minutes, seconds);
    };

    // --- Derived Values for SVG ---
    const radius = 210;
    const mainStrokeWidth = 25;
    const overtimeStrokeWidth = 10;
    const gap = 1;
    const outerRadius = radius + (mainStrokeWidth / 2) + gap + (overtimeStrokeWidth / 2);
    const circumference = 2 * Math.PI * radius;
    const center = VIEWBOX_SIZE / 2;
    const progress = displayedTime / (minWorkMins * 60);
    
    const showZenLayout = isZenMode && !isZenInterfaceVisible;
    
    const timerCardClasses = [
        'timer-card',
        !showDigital ? 'glance-dim-view' : '',
        isActive ? 'timer-active-effect' : '',
        showZenLayout ? 'zen-mode-active' : ''
    ].filter(Boolean).join(' ');

    const localHandleKnobWheel = (e: React.WheelEvent) => {
        showZenInterface();
        handleKnobWheel(e);
    };

    const localHandleKnobInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        showZenInterface();
        interactions.handlers.handleKnobInteractionStart(e);
    };
    
    return (
        <div 
            ref={timerCardRef}
            className={timerCardClasses} 
            onWheel={localHandleKnobWheel} 
            onClick={showZenInterface}
            onKeyDown={handleZenKeyDown}
            tabIndex={isZenMode ? 0 : -1}
        >
            <div className="timer-display-wrapper">
                <div 
                    className="time-adjust-knob-stem" 
                    style={{
                        ...stemStyle,
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                        backgroundColor: isKnobActive ? 'var(--accent-color)' : 'var(--text-muted)'
                    }} 
                />
                
                <div className="progress-ring-container">
                    <div
                        className={`time-adjust-knob ${isKnobActive ? 'active' : ''}`}
                        ref={interactions.state.knobRef}
                        style={{
                            ...knobStyle,
                            transform: `translateX(${isKnobActive ? `var(--knob-active-translate-x)` : '0px'})`,
                            backgroundPositionY: `${interactions.state.knobTextureOffset}px`
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            showZenInterface();
                            interactions.handlers.handleKnobClick();
                        }}
                        onMouseDown={localHandleKnobInteractionStart}
                        onTouchStart={localHandleKnobInteractionStart}
                        onKeyDown={handleKnobKeyDown}
                        tabIndex={2}
                        role="slider"
                        aria-label={t('adjustTimeKnob')}
                        aria-valuemin={0}
                        aria-valuemax={18000} // 5 hours
                        aria-valuenow={displayedTime}
                        aria-valuetext={formatTimeForAria(displayedTime)}
                    >
                    </div>

                    <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
                        <defs>
                            <filter id="red-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                                <feMorphology operator="dilate" radius="2" in="SourceAlpha" result="thicken" />
                                <feGaussianBlur in="thicken" stdDeviation="5" result="blurred" />
                                <feFlood floodColor="var(--work-color)" result="glowColor" />
                                <feComposite in="glowColor" in2="blurred" operator="in" result="softGlow_colored" />
                                <feMerge>
                                    <feMergeNode in="softGlow_colored"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <g>
                            <ReusableLayer radius={radius} center={center} guideRef={guideRingRef} />

                            <MutuallyExclusiveLayer
                                showDigital={showDigital}
                                timer={timer}
                                settings={settings}
                                displayedTime={displayedTime}
                                progress={progress}
                                radius={radius}
                                outerRadius={outerRadius}
                                circumference={circumference}
                                center={center}
                                minWorkMins={minWorkMins}
                                goalMarkerDivision={settings.goalMarkerDivision}
                            />
                            <AnalogLayer
                                showDigital={showDigital}
                                secondHandStyle={settings.secondHandStyle}
                                center={center}
                            />
                            {isKnobActive && (
                                <g style={{ transform: `rotate(${deltaMinuteHandRotation}deg)`, transformOrigin: `${center}px ${center}px` }}>
                                    <line className="minute-hand" x1={center} y1={center} x2={center} y2={center - (radius * 0.44)} />
                                </g>
                            )}
                        </g>
                    </svg>

                    <DigitalLayer
                        t={t}
                        timer={timer}
                        settings={settings}
                        interactions={interactions}
                        showDigital={showDigital}
                    />
                </div>
            </div>

            <div className="multi-use-container">
                <div className="multi-use-container-inner">
                    <div className="info-display">
                        <div className="adjustment-info">
                            {isKnobActive && (
                                <TimeDisplay seconds={currentDelta} showSign={true} isDelta={true} />
                            )}
                        </div>
                        <div className={`eta-display ${isKnobActive || !infoText ? 'is-hidden' : ''}`}>
                             <span className="eta-display-text">
                                {infoText && <FormattedText text={infoText} />}
                            </span>
                        </div>
                    </div>

                    <TimerControls
                        t={t}
                        timer={timer}
                        timerHandlers={timerHandlers}
                        interactions={interactions}
                        settings={settings}
                        setView={setView}
                        onInteraction={showZenInterface}
                        setHoverInfo={setHoverInfo}
                    />
                </div>
            </div>
        </div>
    );
};

export default TimerView;