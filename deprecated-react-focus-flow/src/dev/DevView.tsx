import React, { useState } from 'react';
import { Settings, View, TasksState, TasksHandlers } from '../types';
import { TimerState, TimerHandlers } from '../hooks/useTimer';
import { Interactions } from '../hooks/useInteractions';
import DevNavBar from './DevNavBar';
import DevFocusView from './focus/DevFocusView';
import DevTasksView from './tasks/DevTasksView';

// Define a type for the views available in the dev environment
type DevViewName = 'timer' | 'tasks' | 'stats' | 'settings' | 'focus';

interface DevViewProps {
    t: (key: string, ...args: any[]) => string;
    primaryView: 'digital' | 'analog';
    timer: TimerState;
    timerHandlers: TimerHandlers;
    settings: Settings;
    interactions: Interactions;
    infoMessage: string | null;
    setHoverInfo: (text: string | null) => void;
    setView: (view: View) => void;
    tasksState: TasksState;
    tasksHandlers: TasksHandlers;
}

const DevView: React.FC<DevViewProps> = (props) => {
    const { t, primaryView, settings, tasksState, tasksHandlers } = props;
    const [activeDevView, setActiveDevView] = useState<DevViewName>('focus');
    const [isRailCollapsed, setIsRailCollapsed] = useState(false);

    const PlaceholderIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--accent-color)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17-.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25-1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
    );

    const renderContent = () => {
        switch (activeDevView) {
            case 'focus':
                return <DevFocusView {...props} />;
            case 'tasks':
                return <DevTasksView t={t} tasksState={tasksState} tasksHandlers={tasksHandlers} settings={settings} />;
            default:
                // Placeholder for other views
                return (
                    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                        <div className="max-w-md mx-auto bg-[var(--card-bg)] rounded-2xl p-6 shadow-lg flex flex-col items-center gap-4 text-center">
                            <PlaceholderIcon />
                            <h1 className="text-2xl font-semibold text-[var(--text-color)]">
                                Dev View Content
                            </h1>
                            <p className="text-[var(--text-muted)]">
                                This is the isolated development environment. The active view is{' '}
                                <span className="font-semibold text-[var(--accent-color)] capitalize">{activeDevView}</span>.
                            </p>
                            <button className="bg-[var(--accent-color)] text-[var(--card-bg)] font-bold py-2 px-4 rounded-full hover:opacity-90 transition-opacity">
                                Sample Action
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-dvh w-full bg-[var(--bg-color)] text-[var(--text-color)] font-[var(--font-family)]">
            <DevNavBar
                activeView={activeDevView as View}
                setActiveView={(view) => setActiveDevView(view as DevViewName)}
                t={t}
                primaryView={primaryView}
                isNavRailCollapsed={isRailCollapsed}
                setIsNavRailCollapsed={setIsRailCollapsed}
            />
            <main className="flex-1 min-w-0 pb-20 md:pb-0">
               {renderContent()}
            </main>
        </div>
    );
};

export default DevView;