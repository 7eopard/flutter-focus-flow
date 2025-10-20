import { useState, useEffect, useCallback } from 'react';
import { Settings, Theme, Language, DisplayMode, KnobScrollMode, GoalMarkerDivision, RealismLevel, SecondHandStyle, MovementType, NavJitterMode, ContentJitterMode, FirstDayOfWeek } from '../types';
import { translations } from '../translations';

const useSettings = () => {
    const [settings, setSettings] = useState<Settings>(() => {
        const minWorkMins = parseInt(localStorage.getItem('minWorkMins') || '25', 10);
        const theme = (localStorage.getItem('theme') as Theme) || 'system';
        const language = (localStorage.getItem('language') as Language) || 'en';
        const defaultDisplayMode = (localStorage.getItem('defaultDisplayMode') as DisplayMode) || 'count up';
        const knobScrollMode = (localStorage.getItem('knobScrollMode') as KnobScrollMode) || 'natural';
        const goalMarkerDivision = (parseInt(localStorage.getItem('goalMarkerDivision') || '4', 10) as GoalMarkerDivision) || 4;
        const realismLevel = (localStorage.getItem('realismLevel') as RealismLevel) || 'off';
        const movementType = (localStorage.getItem('movementType') as MovementType) || 'quartz';
        const secondHandStyle = (localStorage.getItem('secondHandStyle') as SecondHandStyle) || 'quartz_tick';
        const defaultZenMode = localStorage.getItem('defaultZenMode') === 'true';
        const simpleMode = localStorage.getItem('simpleMode') === 'true';
        const navJitterMode = (localStorage.getItem('navJitterMode') as NavJitterMode) || 'directional';
        const contentJitterMode = (localStorage.getItem('contentJitterMode') as ContentJitterMode) || 'bidirectional';
        const jitterInterval = parseInt(localStorage.getItem('jitterInterval') || '30', 10);
        const longPressThreshold = parseInt(localStorage.getItem('longPressThreshold') || '700', 10);
        const legacyPhoneMode = localStorage.getItem('legacyPhoneMode') === 'true';
        const legacyTheme = (localStorage.getItem('legacyTheme') as 'light' | 'dark') || 'light';
        const legacyOrientation = (localStorage.getItem('legacyOrientation') as 'portrait' | 'landscape') || 'portrait';
        const legacyFont = (localStorage.getItem('legacyFont') as 'serif' | 'sans-serif') || 'serif';
        const legacyAnimationFrameRate = parseInt(localStorage.getItem('legacyAnimationFrameRate') || '2', 10);
        const firstDayOfWeek = (localStorage.getItem('firstDayOfWeek') as FirstDayOfWeek) || 'monday';
        const dayCrossoverHour = parseInt(localStorage.getItem('dayCrossoverHour') || '4', 10);

        return { minWorkMins, theme, language, defaultDisplayMode, knobScrollMode, goalMarkerDivision, realismLevel, movementType, secondHandStyle, defaultZenMode, simpleMode, navJitterMode, contentJitterMode, jitterInterval, longPressThreshold, legacyPhoneMode, legacyTheme, legacyOrientation, legacyFont, legacyAnimationFrameRate, firstDayOfWeek, dayCrossoverHour };
    });

    const t = useCallback((key: string, ...args: any[]) => {
        const dict = translations[settings.language] || translations.en;
        const translation = (dict as any)[key];
        if (typeof translation === 'function') {
            return (translation as (...args: any[]) => string)(...args);
        }
        return translation || key;
    }, [settings.language]);

    useEffect(() => {
        // Save all settings to localStorage whenever the settings object changes.
        Object.entries(settings).forEach(([key, value]) => {
            localStorage.setItem(key, String(value));
        });
    }, [settings]);

    useEffect(() => {
        // Apply theme based on settings
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = () => {
            document.documentElement.setAttribute('data-theme', settings.theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : settings.theme);
        };
        applyTheme();
        if (settings.theme === 'system') {
            mediaQuery.addEventListener('change', applyTheme);
            return () => mediaQuery.removeEventListener('change', applyTheme);
        }
    }, [settings.theme]);

    return { settings, setSettings, t };
};

export default useSettings;