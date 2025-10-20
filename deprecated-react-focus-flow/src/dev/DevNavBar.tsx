import React, { useState, useRef, useLayoutEffect } from 'react';
import { View } from '../types';

interface DevNavBarProps {
    activeView: View | 'focus';
    setActiveView: (view: View | 'focus') => void;
    t: (key: string) => string;
    primaryView: 'digital' | 'analog';
    isNavRailCollapsed: boolean;
    setIsNavRailCollapsed: (value: React.SetStateAction<boolean>) => void;
}

const DevNavBar: React.FC<DevNavBarProps> = ({ activeView, setActiveView, t, primaryView, isNavRailCollapsed, setIsNavRailCollapsed }) => {
    // --- State & Refs for Animated Indicator ---
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const navContentRef = useRef<HTMLDivElement>(null);

    const menuIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
    const menuOpenIcon = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41L19.59 7l-5 5 5 5L21 15.59z"/></svg>;

    const navItems: { view: View | 'focus'; labelKey: string; icon: React.ReactElement }[] = [
        { view: 'focus', labelKey: 'timer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg> },
        { view: 'tasks', labelKey: 'todoTitle', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7zm-4 6h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg> },
        { view: 'stats', labelKey: 'statsTitle', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M16 6v14h4V6h-4zM8 14v6h4v-6H8zM2 12v8h4v-8H2z"/></svg> },
        { view: 'settings', labelKey: 'settings', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.06-.22-.27-.39-.52-.39H9.87c-.25 0-.46.17-.52.39l-.27 2.48c-.59.24-1.12-.56-1.62-.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.56 8.81c-.12.2-.07.47.12.61l2.03 1.58c-.05.3-.07.61-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.27 2.48c.06.22.27.39.52.39h4.01c.25 0 .46-.17.52.39l.27-2.48c.59-.24 1.12-.56-1.62-.94l2.39.96c.22.08.47 0 .59.22l1.92-3.32c.12-.2.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg> }
    ];

    const activeIndex = navItems.findIndex(item => item.view === activeView);

    useLayoutEffect(() => {
        const updateIndicator = () => {
            if (activeIndex === -1 || !navContentRef.current) return;
            const activeButton = buttonRefs.current[activeIndex];
            if (!activeButton) return;

            const navRect = navContentRef.current.getBoundingClientRect();
            
            const isExpandedLayout = window.innerWidth >= 1280 && !isNavRailCollapsed;
            
            let style = {};
            if (isExpandedLayout) {
                // Expanded Side Rail Layout (Icon + Label)
                const buttonRect = activeButton.getBoundingClientRect();
                style = {
                    top: `${buttonRect.top - navRect.top + (buttonRect.height - 40) / 2}px`,
                    left: `${buttonRect.left - navRect.left}px`,
                    width: `${buttonRect.width}px`,
                    height: '40px',
                    opacity: 1,
                };
            } else {
                // Collapsed Rail or Bottom Bar Layout (Icon only)
                const iconContainer = activeButton.querySelector('.nav-icon-container');
                if (iconContainer) {
                    const iconRect = iconContainer.getBoundingClientRect();
                     style = {
                        top: `${iconRect.top - navRect.top}px`,
                        left: `${iconRect.left - navRect.left}px`,
                        width: `${iconRect.width}px`,
                        height: `${iconRect.height}px`,
                        opacity: 1,
                    };
                }
            }
            setIndicatorStyle(style);
        };
        
        updateIndicator();
        
        const observer = new ResizeObserver(updateIndicator);
        if (navContentRef.current) {
            observer.observe(navContentRef.current);
        }
        
        return () => observer.disconnect();

    }, [activeView, isNavRailCollapsed, activeIndex]);

    return (
        <nav className={`
            bg-[color-mix(in_srgb,var(--card-bg)_85%,var(--surface-tint)_15%)]
            transition-[width] duration-300 ease-in-out z-50 flex flex-col
            fixed bottom-0 left-0 w-full h-20 
            md:relative md:h-full md:w-20 md:border-r md:border-[var(--card-bg-light)]
            xl:w-${isNavRailCollapsed ? '20' : '64'}
        `}>
            <div className="hidden xl:flex items-center h-16 flex-shrink-0 px-2">
                 <button
                    className="flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-color)] w-12 h-12 rounded-full"
                    onClick={() => setIsNavRailCollapsed(prev => !prev)}
                    aria-label={isNavRailCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                >
                    {isNavRailCollapsed ? menuIcon : menuOpenIcon}
                </button>
            </div>
            
            <div ref={navContentRef} className="relative w-full h-full flex flex-row justify-around items-center px-1 md:flex-col md:justify-center md:px-0 md:gap-3 xl:px-3">
                <div 
                    className="absolute bg-[var(--secondary-container)] rounded-full transition-all duration-300 ease-in-out" 
                    style={{...indicatorStyle, transition: 'top 0.3s ease-in-out, left 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out, opacity 0.2s ease' }}
                ></div>

                {navItems.map(({ view, labelKey, icon }, index) => {
                    const isActive = activeView === view;
                    return (
                        <button
                            key={view}
                            ref={el => { buttonRefs.current[index] = el; }}
                            className="relative flex flex-col items-center justify-start gap-1 h-14 w-full max-w-24 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-color)] xl:flex-row xl:justify-start xl:h-14 xl:px-4 xl:gap-3 xl:max-w-none data-[collapsed=true]:flex-col data-[collapsed=true]:justify-center data-[collapsed=true]:gap-1 data-[collapsed=true]:px-0"
                            data-collapsed={isNavRailCollapsed}
                            onClick={() => setActiveView(view)}
                            aria-label={t(labelKey)}
                            aria-current={isActive}
                        >
                            <div className="nav-icon-container w-16 h-8 flex items-center justify-center xl:w-6 xl:h-6">
                                <span className={`transition-colors ${isActive ? 'text-[var(--on-secondary-container)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-color)]'}`}>{icon}</span>
                            </div>
                            <span className={`text-xs font-semibold whitespace-nowrap transition-colors xl:text-sm ${isActive ? 'text-[var(--on-secondary-container)] xl:font-bold' : 'text-[var(--text-muted)] group-hover:text-[var(--text-color)]'} data-[collapsed=true]:text-xs data-[collapsed=false]:xl:block`
                             }
                             data-collapsed={isNavRailCollapsed}
                            >
                                {t(labelKey)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default DevNavBar;