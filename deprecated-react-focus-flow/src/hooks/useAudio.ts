import { useCallback, useRef, useEffect } from 'react';

// This hook encapsulates all Web Audio API logic for generating sounds.
const useAudio = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    // Refs for all nodes to prevent garbage collection leaks.
    const reverbNodeRef = useRef<ConvolverNode | null>(null);
    const reverbWetGainRef = useRef<GainNode | null>(null);
    const distortionNodeRef = useRef<WaveShaperNode | null>(null);
    const pannerNodeRef = useRef<PannerNode | null>(null);


    // This cleanup effect is the core of the memory leak fix.
    // It runs when the component using this hook unmounts.
    useEffect(() => {
        return () => {
            const audioCtx = audioContextRef.current;
            if (audioCtx) {
                // Disconnect all nodes to break the audio graph.
                pannerNodeRef.current?.disconnect();
                distortionNodeRef.current?.disconnect();
                reverbWetGainRef.current?.disconnect();
                reverbNodeRef.current?.disconnect();

                // Close the context to release all associated system resources.
                if (audioCtx.state !== 'closed') {
                    audioCtx.close();
                }

                // Clear all refs to allow garbage collection.
                audioContextRef.current = null;
                pannerNodeRef.current = null;
                distortionNodeRef.current = null;
                reverbWetGainRef.current = null;
                reverbNodeRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only on mount and unmount.


    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
                return null;
            }
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }, []);

    const playSound = useCallback((type: 'tick' | 'escapement_beat' | 'alert', frequency = 880, startTime = 0) => {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        // --- Refactored helper to set up the main audio graph for physical sounds ---
        const ensurePhysicalAudioGraph = () => {
             // --- Reverb setup (physical space) ---
            if (!reverbNodeRef.current) {
                const convolver = audioCtx.createConvolver();
                const duration = 0.2, decay = 5, sampleRate = audioCtx.sampleRate; // Shorter duration for a smaller "watch case" space
                const length = sampleRate * duration;
                const impulse = audioCtx.createBuffer(2, length, sampleRate);
                const impulseL = impulse.getChannelData(0);
                const impulseR = impulse.getChannelData(1);
                for (let i = 0; i < length; i++) {
                    const n = length - i;
                    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
                    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
                }
                convolver.buffer = impulse;
                reverbNodeRef.current = convolver;

                const wetGain = audioCtx.createGain();
                wetGain.gain.value = 0.6; // Reduced wetness for a less "cavernous" sound
                convolver.connect(wetGain).connect(audioCtx.destination);
                reverbWetGainRef.current = wetGain;
            }
            const convolver = reverbNodeRef.current;

            // --- Distortion setup (warmth and imperfection) ---
            if (!distortionNodeRef.current) {
                const distortion = audioCtx.createWaveShaper();
                const k = 25;
                const n_samples = 44100;
                const curve = new Float32Array(n_samples);
                for (let i = 0; i < n_samples; ++i) {
                    const x = i * 2 / n_samples - 1;
                    curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
                }
                distortion.curve = curve;
                distortion.oversample = '4x';
                distortionNodeRef.current = distortion;
            }
            const distortion = distortionNodeRef.current;

            // --- Spatialization setup (3D positioning) ---
            if(!pannerNodeRef.current) {
                const panner = audioCtx.createPanner();
                panner.panningModel = 'HRTF'; // Best for headphones
                panner.distanceModel = 'inverse';
                panner.positionX.value = 0;
                panner.positionY.value = 0.2;
                panner.positionZ.value = -1.5;
                panner.orientationX.value = 0;
                panner.orientationY.value = 0;
                panner.orientationZ.value = -1; // Facing the user
                
                distortion.connect(panner);
                panner.connect(audioCtx.destination);
                panner.connect(convolver);
                pannerNodeRef.current = panner;
            }
        };

        // --- Refactored helper to create a single noise burst ---
        const createNoiseBurst = (
            freq: number, q: number, gain: number, attack: number, decay: number, type: BiquadFilterType, scheduledTime: number
        ) => {
            const noiseSource = audioCtx.createBufferSource();
            const bufferSize = audioCtx.sampleRate * decay * 1.1;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            noiseSource.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(freq, scheduledTime);
            filter.Q.value = q;

            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, scheduledTime);
            gainNode.gain.linearRampToValueAtTime(gain, scheduledTime + attack);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduledTime + decay);

            if (distortionNodeRef.current) {
                noiseSource.connect(filter).connect(gainNode).connect(distortionNodeRef.current);
            }

            noiseSource.start(scheduledTime);
            noiseSource.stop(scheduledTime + decay);
        };
        
        if (type === 'tick' || type === 'escapement_beat') {
            ensurePhysicalAudioGraph();
            
            if (type === 'tick') {
                const jitter = (Math.random() - 0.5) * 0.03; // +/- 15ms for realism
                const now = Math.max(audioCtx.currentTime, audioCtx.currentTime + startTime + jitter);
                createNoiseBurst(4000, 1, 0.1, 0.002, 0.04, 'highpass', now);
                createNoiseBurst(1500, 10, 0.06, 0.005, 0.06, 'bandpass', now);
                createNoiseBurst(450, 5, 0.04, 0.01, 0.08, 'bandpass', now);
            } else { // escapement_beat
                const jitter = (Math.random() - 0.5) * 0.005; // +/- 2.5ms for micro-realism
                const now = Math.max(audioCtx.currentTime, audioCtx.currentTime + startTime + jitter);
                
                // [REFINED] Part 1: Impulse Pin hits Pallet Fork ("Tick") - Sharper, higher-freq, more metallic
                createNoiseBurst(6500, 5, 0.07, 0.001, 0.012, 'highpass', now);
                // [REFINED] Part 2: Escape Wheel Tooth Releases ("Tock") - Higher freq (less plastic), more resonant
                createNoiseBurst(2800, 12, 0.04, 0.002, 0.020, 'bandpass', now + 0.008);
                // [REFINED] Part 3: Pallet Fork Horn hits Banking Pin ("Lock") - Higher freq, much quieter, less tonal
                createNoiseBurst(1500, 4, 0.015, 0.004, 0.028, 'bandpass', now + 0.015);
            }

        } else { // 'alert'
            const now = audioCtx.currentTime + startTime;
            const panner = pannerNodeRef.current;
            const destination = panner || audioCtx.destination;

            const noise = audioCtx.createBufferSource();
            const bufferSize = audioCtx.sampleRate * 0.05;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            noise.buffer = buffer;
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 5000;
            noiseFilter.Q.value = 2;
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.4, now + 0.001);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
            noise.connect(noiseFilter).connect(noiseGain).connect(destination);
            noise.start(now);
            noise.stop(now + 0.05);
            
            const fundamental = frequency * 0.5;
            const partials = [
                { ratio: 1.00,  initial: 0.2, peak: 1.0, decay: 3.0 },
                { ratio: 2.005, initial: 0.1, peak: 0.6, decay: 2.5 },
                { ratio: 3.01,  initial: 0.1, peak: 0.4, decay: 2.0 },
                { ratio: 1.76,  initial: 0.3, peak: 0.1, decay: 0.3 },
                { ratio: 4.33,  initial: 0.2, peak: 0.05, decay: 0.5 },
            ];

            const finalMixer = audioCtx.createGain();
            finalMixer.gain.value = 0.4;
            finalMixer.connect(destination);

            partials.forEach(({ ratio, initial, peak, decay }) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(finalMixer);

                osc.type = 'sine';
                const freq = fundamental * ratio;
                osc.frequency.setValueAtTime(freq, now);
                
                const bloomTime = 0.15;
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(initial, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(peak, now + bloomTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

                osc.start(now);
                osc.stop(now + decay + 0.1);
            });
        }
    }, [getAudioContext]);
    
    const playAlertSequence = useCallback((frequency: number, count: number) => {
        for (let i = 0; i < count; i++) {
            playSound('alert', frequency, i * 0.15);
        }
    }, [playSound]);

    return { getAudioContext, playSound, playAlertSequence };
};

export default useAudio;