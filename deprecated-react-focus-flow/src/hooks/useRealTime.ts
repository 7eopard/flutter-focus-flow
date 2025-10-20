import { useState, useEffect, useRef } from 'react';
import { SecondHandStyle } from '../types';

const useRealTime = (secondHandStyle: SecondHandStyle) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const animationFrameRef = useRef<number | null>(null);
    
    useEffect(() => {
        const updateRealTime = () => {
            setCurrentTime(new Date());
            animationFrameRef.current = requestAnimationFrame(updateRealTime);
        };
        animationFrameRef.current = requestAnimationFrame(updateRealTime);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();
    const minutes = currentTime.getMinutes();
    const hours = currentTime.getHours();
    
    const secondsWithMs = seconds + milliseconds / 1000;

    let secondsRotation;
    switch (secondHandStyle) {
        case 'quartz_sweep':
            secondsRotation = secondsWithMs * 6;
            break;
        case 'traditional_escapement':
            // 2 steps per second (120 steps per minute) -> 3 degrees per step
            secondsRotation = Math.floor(secondsWithMs * 2) * 3;
            break;
        case 'high_freq_escapement':
            // 8 steps per second (480 steps per minute) -> 0.75 degrees per step
            secondsRotation = Math.floor(secondsWithMs * 8) * 0.75;
            break;
        case 'quartz_tick':
        default:
            secondsRotation = seconds * 6;
            break;
    }

    const minutesRotation = minutes * 6 + secondsWithMs * 0.1;
    const hoursRotation = (hours % 12) * 30 + minutes * 0.5;

    return { currentTime, secondsRotation, minutesRotation, hoursRotation };
};

export default useRealTime;