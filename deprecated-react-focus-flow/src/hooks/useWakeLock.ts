import { useEffect, useRef } from 'react';

/**
 * A hook to manage the Screen Wake Lock API.
 * It requests a wake lock when the timer is active and the feature is enabled.
 * It also handles re-acquiring the lock when the document becomes visible again.
 * @param enabled - Whether the keep screen on feature is enabled in settings.
 * @param isActive - Whether the timer is currently running.
 */
const useWakeLock = (enabled: boolean, isActive: boolean) => {
    const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

    useEffect(() => {
        // Function to request the wake lock
        const requestWakeLock = async () => {
            if (!('wakeLock' in navigator)) {
                console.warn('Screen Wake Lock API not supported.');
                return;
            }
            try {
                // FIX: Only request a new lock if one isn't already held OR if the existing one has been released by the system.
                // This makes the logic more robust if the 'release' event isn't caught (e.g., after tab suspension).
                if (!wakeLockSentinelRef.current || wakeLockSentinelRef.current.released) {
                    wakeLockSentinelRef.current = await navigator.wakeLock.request('screen');
                    wakeLockSentinelRef.current.addEventListener('release', () => {
                        // The lock has been released, nullify the ref. This can happen
                        // for various reasons, like system constraints or tab visibility changes.
                        wakeLockSentinelRef.current = null;
                    });
                }
            } catch (err: any) {
                console.error(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
            }
        };

        // Function to release the wake lock
        const releaseWakeLock = async () => {
            if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
                await wakeLockSentinelRef.current.release();
                // The release event listener above will set the ref to null.
            }
        };

        if (enabled && isActive) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // Re-acquire the lock if the document becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled && isActive) {
                requestWakeLock();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup function for when the component unmounts or dependencies change
        return () => {
            releaseWakeLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, isActive]);
};

export default useWakeLock;