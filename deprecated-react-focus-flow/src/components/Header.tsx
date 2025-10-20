import React from 'react';
import { View, InterferenceLevel } from '../types';

// --- Helper Icon Components for AppBar ---
const InterferenceIcon = ({ level }: { level: InterferenceLevel }) => {
    const commonProps = {
        className: "control-icon",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round" as "round",
        strokeLinejoin: "round" as "round",
    };
    switch (level) {
        case 'strong':
            return <svg {...commonProps}><path d="M3 10c2-2.5 4 2.5 6 0s4-2.5 6 0m-9 4c2-2.5 4 2.5 6 0s4-2.5 6 0"/></svg>;
        case 'weak':
            return <svg {...commonProps}><path d="M3 12c2-3 4 3 6 0s4-3 6 0 4 3 6 0"/></svg>;
        default: // 'zero'
            return <svg {...commonProps}><path d="M4 12h16" /></svg>;
    }
};
const GlanceIcon = ({ primaryView }: { primaryView: 'digital' | 'analog' }) => {
    const iconProps = {
        className: "control-icon",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor"
    };
    if (primaryView === 'digital') {
        return <svg {...iconProps}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm4.25 6.75L13 15.08V11h2v3.5l2.85 1.65-.85 1.45z" /></svg>;
    } else {
        return <svg {...iconProps}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.2 13.4-1.4-1.4-1.8 1.8-1.4-1.4 1.8-1.8-1.4-1.4L11 13.2V8h2v3.6l1.8 1.8 1.4-1.4 1.8 1.8-1.4 1.4zM7 16h5v2H7v-2z" /></svg>;
    }
};
const ZenIcon = ({ isZenMode }: { isZenMode: boolean }) => (
    <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        {isZenMode && <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />}
    </svg>
);

interface HeaderProps {
    t: (key: string, ...args: any[]) => string;
    view: View;
    title: string;
    isScrolled: boolean;
    onBack?: () => void;
    timerControls: {
        glanceButtonRef: React.RefObject<HTMLButtonElement>;
        temporaryGlance: 'digital' | 'analog' | null;
        primaryView: 'digital' | 'analog';
        interferenceLevel: InterferenceLevel;
        isZenMode: boolean;
        onDisplayModeToggle: () => void;
        onGlanceInteractionStart: (e: React.SyntheticEvent<HTMLButtonElement>) => void;
        onGlanceInteractionEnd: (e: React.SyntheticEvent<HTMLButtonElement>) => void;
        onInterferenceToggle: () => void;
        onZenToggle: () => void;
    };
    settingsControl: {
        show: boolean;
        onSettingsClick: () => void;
    };
}

const Header: React.FC<HeaderProps> = ({ t, view, title, isScrolled, onBack, timerControls, settingsControl }) => {
    
    const renderTimerControls = () => (
        <>
            <button onClick={timerControls.onDisplayModeToggle} className="control-button icon-btn" aria-label={t('toggleDisplayMode')}>
               <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>
            </button>
            <button ref={timerControls.glanceButtonRef} onMouseDown={timerControls.onGlanceInteractionStart} onMouseUp={timerControls.onGlanceInteractionEnd} onTouchStart={timerControls.onGlanceInteractionStart} onTouchEnd={timerControls.onGlanceInteractionEnd} className={`control-button icon-btn ${!!timerControls.temporaryGlance ? 'glance-active' : ''}`} aria-label={t('toggleGlance')}>
                <div className="glance-progress-fill" />
                <div className="glance-progress-icon-bar" />
                <GlanceIcon primaryView={timerControls.primaryView} />
            </button>
            <button onClick={timerControls.onInterferenceToggle} className="control-button icon-btn" aria-label={t('interferenceCycle', t(timerControls.interferenceLevel))}>
                <InterferenceIcon level={timerControls.interferenceLevel} />
            </button>
            <button onClick={timerControls.onZenToggle} className={`control-button icon-btn ${timerControls.isZenMode ? 'active' : ''}`} aria-label={t('zenMode')}>
                <ZenIcon isZenMode={timerControls.isZenMode} />
            </button>
            {settingsControl.show && (
               <button onClick={settingsControl.onSettingsClick} className="control-button icon-btn" aria-label={t('settings')}>
                   <svg className="control-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
               </button>
            )}
        </>
    );

    return (
        <header className={`top-app-bar ${isScrolled ? 'elevated' : ''}`} aria-label={t('secondaryActions')}>
            <div className="app-bar-content">
                <div className="app-bar-leading">
                    {onBack && (
                        <button onClick={onBack} className="icon-button back-button" aria-label={t('back')}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                                <path d="M0 0h24v24H0V0z" fill="none"/>
                                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                            </svg>
                        </button>
                    )}
                </div>

                {title && <h1 className="app-bar-title">{title}</h1>}
                
                <div className="app-bar-trailing">
                    {view === 'timer' && renderTimerControls()}
                </div>
            </div>
        </header>
    );
};

export default Header;