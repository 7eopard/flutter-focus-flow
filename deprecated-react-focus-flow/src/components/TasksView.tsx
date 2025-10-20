import React, { useMemo, useState } from 'react';
import { Task, Settings } from '../types';
import { TasksHandlers, TasksState } from '../types';
import TaskItem from './TaskItem'; // Import the new component

interface TasksViewProps {
    t: (key: string, ...args: any[]) => string;
    tasksState: TasksState;
    tasksHandlers: TasksHandlers;
    settings: Settings;
}

const TasksView: React.FC<TasksViewProps> = ({ t, tasksState, tasksHandlers, settings }) => {
    const { tasks, taskInput, setTaskInput } = tasksState;
    const { handleAddTask } = tasksHandlers;

    const [sortOrder, setSortOrder] = useState<'default' | 'dueDate' | 'creationDate'>('default');
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set<number>());
    const [showArchived, setShowArchived] = useState(false);
    
    const sortedTasks = useMemo(() => {
        const tasksCopy = [...tasks];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getTodayScore = (task: Task) => {
            // Give archived tasks the lowest possible priority
            if (task.status === 'archived') return 7;
            if (task.status === 'done') return 6;

            const startDate = task.startDate ? new Date(task.startDate) : null;
            if (startDate) startDate.setHours(0,0,0,0);
            
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            if (dueDate) dueDate.setHours(0,0,0,0);

            if (task.status === 'doing') return 0;
            if (task.status === 'suspended') return 1;
            if (dueDate && dueDate < today) return 2; // Overdue
            if ((dueDate && dueDate.getTime() === today.getTime()) || (startDate && startDate.getTime() <= today.getTime())) return 3; // Due or active today
            
            // Postponed tasks with future start dates get higher priority than other future tasks
            if (task.isPostponed && startDate && startDate > today) return 4;
            
            if (startDate && startDate > today) return 5; // Scheduled for future
            return 6; // No dates
        };
        
        tasksCopy.sort((a, b) => {
            const scoreA = getTodayScore(a);
            const scoreB = getTodayScore(b);

            switch (sortOrder) {
                case 'dueDate':
                     // Handle done/archived sorting
                    if (a.status === 'done' || a.status === 'archived') return 1;
                    if (b.status === 'done' || b.status === 'archived') return -1;
                    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return a.order - b.order;
                case 'creationDate':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'default':
                default:
                    if (scoreA !== scoreB) return scoreA - scoreB;
                    // For tasks with the same score, prioritize those with due dates
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
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };
    
    const taskMap = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
    
    const tasksByParent = useMemo(() => {
        const map = new Map<number | null, Task[]>();
        sortedTasks.forEach(task => {
            const parentId = task.parentTaskId || null;
            if (!map.has(parentId)) {
                map.set(parentId, []);
            }
            map.get(parentId)!.push(task);
        });
        return map;
    }, [sortedTasks]);

    const sortOptions = [
        { value: 'default', label: t('sortDefault') },
        { value: 'dueDate', label: t('sortDueDate') },
        { value: 'creationDate', label: t('sortCreationDate') },
    ];
    
    const topLevelTasks = tasksByParent.get(null)?.filter(t => showArchived || t.status !== 'archived') || [];

    const getGroup = (task: Task): string | null => {
        if (sortOrder !== 'default') return null;

        const status = task.status;
        if (status === 'archived') return t('groupArchived');
        if (status === 'done') return t('groupDone');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = task.startDate ? new Date(task.startDate) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        if (dueDate) dueDate.setHours(0, 0, 0, 0);

        if (status === 'doing' || (dueDate && dueDate < today) || (dueDate && dueDate.getTime() === today.getTime()) || (startDate && startDate.getTime() <= today.getTime())) {
            return t('groupOutstanding');
        }
        if (status === 'suspended') {
            return t('groupPending');
        }
        return t('groupUpcoming');
    };

    let lastGroup: string | null = null;
    
    return (
        <div className="tasks-view">
            <div className="settings-section">
                <div className="task-view-header">
                    <h2>{t('todoTitle')}</h2>
                    <div className="task-sort-control segmented-control">
                        {sortOptions.map(({value, label}) => (
                            <button key={value} className={sortOrder === value ? 'active' : ''} onClick={() => setSortOrder(value as any)}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleAddTask(taskInput); }} className="task-form">
                    <input type="text" value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder={t('addTaskPlaceholder')} className="task-input" />
                    <button type="submit" className="task-add-btn" aria-label={t('addTask')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                </form>
                <ul className="task-list">
                    {topLevelTasks.map(task => {
                        const currentGroup = getGroup(task);
                        const showHeader = currentGroup && currentGroup !== lastGroup;
                        if (showHeader) {
                            lastGroup = currentGroup;
                        }
                        return (
                             <React.Fragment key={task.id}>
                                {showHeader && <li className="task-group-header">{currentGroup}</li>}
                                <TaskItem
                                    task={task}
                                    allTasks={taskMap}
                                    subtasks={tasksByParent.get(task.id) || []}
                                    level={0}
                                    expandedIds={expandedTaskIds}
                                    toggleExpand={toggleExpand}
                                    tasksHandlers={tasksHandlers}
                                    settings={settings}
                                    t={t}
                                />
                            </React.Fragment>
                        );
                    })}
                </ul>
                 <div className="task-view-footer">
                    <button className="text-button" onClick={() => setShowArchived(prev => !prev)}>
                        {showArchived ? t('hideArchived') : t('showArchived')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TasksView;
