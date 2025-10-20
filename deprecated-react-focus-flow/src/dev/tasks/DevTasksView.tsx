import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, Settings, TasksState, TasksHandlers } from '../../types';
import TaskFilters from './TaskFilters';
import TaskList from './TaskList';
import { AddIcon } from './TaskIcons';

interface DevTasksViewProps {
    t: (key: string, ...args: any[]) => string;
    tasksState: TasksState;
    tasksHandlers: TasksHandlers;
    settings: Settings;
}

const DevTasksView: React.FC<DevTasksViewProps> = ({ t, tasksState, tasksHandlers, settings }) => {
    const { tasks } = tasksState;
    const [sortOrder, setSortOrder] = useState<'default' | 'dueDate' | 'creationDate'>('default');
    const [showArchived, setShowArchived] = useState(false);
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set<number>());
    const [showInput, setShowInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showInput) {
            inputRef.current?.focus();
        }
    }, [showInput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            tasksHandlers.handleAddTask(inputValue.trim());
            setInputValue('');
            setShowInput(false);
        }
    };


    const sortedTasks = useMemo(() => {
        const tasksCopy = [...tasks];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getTodayScore = (task: Task) => {
            if (task.status === 'archived') return 7;
            if (task.status === 'done') return 6;

            const startDate = task.startDate ? new Date(task.startDate) : null;
            if (startDate) startDate.setHours(0,0,0,0);
            
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            if (dueDate) dueDate.setHours(0,0,0,0);

            if (task.status === 'doing') return 0;
            if (task.status === 'suspended') return 1;
            if (dueDate && dueDate < today) return 2;
            if ((dueDate && dueDate.getTime() === today.getTime()) || (startDate && startDate.getTime() <= today.getTime())) return 3;
            if (task.isPostponed && startDate && startDate > today) return 4;
            if (startDate && startDate > today) return 5;
            return 6;
        };
        
        tasksCopy.sort((a, b) => {
            const scoreA = getTodayScore(a);
            const scoreB = getTodayScore(b);

            switch (sortOrder) {
                case 'dueDate':
                    if (a.status === 'done' || a.status === 'archived') return 1;
                    if (b.status === 'done' || b.status === 'archived') return -1;
                    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return a.order - b.order;
                case 'creationDate':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                default:
                    if (scoreA !== scoreB) return scoreA - scoreB;
                    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return a.order - b.order;
            }
        });
        
        return tasksCopy;
    }, [tasks, sortOrder]);

    const toggleExpand = (taskId: number) => {
        setExpandedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    };

    return (
        <div className="flex flex-col w-full h-full p-4">
            <div className="relative w-full max-w-2xl mx-auto bg-[var(--card-bg)] rounded-2xl p-6 flex flex-col flex-grow min-h-0 shadow-lg">
                <div className="flex flex-col gap-4 mb-4 flex-shrink-0">
                    <h2 className="text-xl font-semibold pb-4 border-b border-[var(--card-bg-light)]">
                        {t('todoTitle')}
                    </h2>
                    <TaskFilters sortOrder={sortOrder} setSortOrder={setSortOrder} t={t} />
                </div>
                <TaskList
                    tasks={sortedTasks}
                    tasksHandlers={tasksHandlers}
                    settings={settings}
                    t={t}
                    sortOrder={sortOrder}
                    showArchived={showArchived}
                    expandedIds={expandedTaskIds}
                    toggleExpand={toggleExpand}
                />
                <div className="mt-6 text-center flex-shrink-0">
                    <button className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-color)]" onClick={() => setShowArchived(prev => !prev)}>
                        {showArchived ? t('hideArchived') : t('showArchived')}
                    </button>
                </div>

                <div className="absolute bottom-6 right-6 z-10 w-[calc(100%-3rem)] max-w-sm ml-auto">
                    {showInput ? (
                         <div className="p-2 bg-[var(--card-bg)] rounded-2xl shadow-lg border border-[var(--card-bg-light)] animate-[fadeIn_0.2s_ease]">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onBlur={() => { if (!inputValue.trim()) { setShowInput(false); } }}
                                    placeholder={t('addTaskPlaceholder')}
                                    className="flex-grow w-auto bg-[var(--card-bg-light)] border-2 border-transparent rounded-lg px-4 py-2 text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--card-bg)]"
                                />
                                <button
                                    type="submit"
                                    aria-label={t('addTask')}
                                    className="flex-shrink-0 w-11 h-11 rounded-lg bg-[var(--accent-color)] text-[var(--card-bg)] flex items-center justify-center transition-opacity hover:opacity-90"
                                >
                                    <AddIcon />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowInput(true)}
                                className="flex items-center gap-3 h-14 pl-4 pr-6 bg-[var(--accent-color)] text-[var(--card-bg)] rounded-[16px] shadow-lg hover:shadow-xl transition-all font-semibold"
                                aria-label={t('addTask')}
                            >
                                <AddIcon />
                                <span>New task</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DevTasksView;