
import React from 'react';
import { View } from '../types';

interface NavTrayProps {
    activeView: View;
    setActiveView: (view: View) => void;
    t: (key: string) => string;
    navContentStyle?: React.CSSProperties;
    primaryView: 'digital' | 'analog';
    isNavRailCollapsed: boolean;
    setIsNavRailCollapsed: (value: React.SetStateAction<boolean>) => void;
}

const NavTray: React.FC<NavTrayProps> = ({ activeView, setActiveView, t, navContentStyle, primaryView, isNavRailCollapsed, setIsNavRailCollapsed }) => {
    const analogIconOutlined = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>;
    const digitalIconOutlined = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zM11 8h2v4h-2zm0 6h2v-2h-2z"/></svg>;

    // Icons for the new toggle button
    const menuIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
    const menuOpenIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41L19.59 7l-5 5 5 5L21 15.59z"/></svg>;


    // FIX: Changed JSX.Element to React.ReactElement to resolve namespace error.
    const navItems: { view: View; labelKey: string; icon: React.ReactElement }[] = [
        {
            view: 'timer',
            labelKey: 'timer',
            icon: primaryView === 'digital' ? digitalIconOutlined : analogIconOutlined,
        },
        {
            view: 'tasks',
            labelKey: 'todoTitle',
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7zm-4 6h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        },
        {
            view: 'stats',
            labelKey: 'statsTitle',
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6v14h4V6h-4zM8 14v6h4v-6H8zM2 12v8h4v-8H2z"/></svg>
        },
        {
            view: 'settings',
            labelKey: 'settings',
            icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.06-.22-.27-.39-.52-.39H9.87c-.25 0-.46.17-.52.39l-.27 2.48c-.59.24-1.12.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.56 8.81c-.12.2-.07.47.12.61l2.03 1.58c-.05.3-.07.61-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.27 2.48c.06.22.27.39.52.39h4.01c.25 0 .46-.17.52.39l.27-2.48c.59-.24 1.12-.56-1.62-.94l2.39.96c.22.08.47 0 .59.22l1.92-3.32c.12-.2.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        }
    ];

    return (
        <nav className="nav-tray">
            <div className="nav-tray-inner">
                <button className="nav-rail-toggle-btn" onClick={() => setIsNavRailCollapsed(prev => !prev)} aria-label={isNavRailCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
                    <div className="icon-wrapper">
                        {isNavRailCollapsed ? menuIcon : menuOpenIcon}
                    </div>
                </button>
                <div className="nav-content-shifter" style={navContentStyle}>
                    {navItems.map(({ view, labelKey, icon }) => (
                        <button 
                            key={view}
                            className={`nav-button ${activeView === view ? 'active' : ''}`}
                            onClick={() => setActiveView(view)}
                            aria-label={t(labelKey)}
                            aria-current={activeView === view}
                        >
                            <div className="nav-icon">
                                 <div className="icon-wrapper">{icon}</div>
                            </div>
                            <span className="nav-label">{t(labelKey)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default NavTray;
