import React, { useMemo } from 'react';
import { Task, Settings, TasksHandlers } from '../../types';
import TaskItem from './TaskItem';

interface TaskListProps {
    tasks: Task[];
    tasksHandlers: TasksHandlers;
    settings: Settings;
    t: (key: string, ...args: any[]) => string;
    sortOrder: 'default' | 'dueDate' | 'creationDate';
    showArchived: boolean;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, tasksHandlers, settings, t, sortOrder, showArchived, expandedIds, toggleExpand }) => {
    
    const taskMap = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
    
    const tasksByParent = useMemo(() => {
        const map = new Map<number | null, Task[]>();
        tasks.forEach(task => {
            const parentId = task.parentTaskId || null;
            if (!map.has(parentId)) {
                map.set(parentId, []);
            }
            map.get(parentId)!.push(task);
        });
        return map;
    }, [tasks]);

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
        <ul className="list-none overflow-y-auto flex-grow mt-4 pr-2 -mr-2 pb-20">
            {topLevelTasks.map(task => {
                const currentGroup = getGroup(task);
                const showHeader = currentGroup && currentGroup !== lastGroup;
                if (showHeader) {
                    lastGroup = currentGroup;
                }
                return (
                     <React.Fragment key={task.id}>
                        {showHeader && <li className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-6 mb-2 pb-1 border-b border-[var(--card-bg-light)]">{currentGroup}</li>}
                        <TaskItem
                            task={task}
                            allTasks={taskMap}
                            subtasks={tasksByParent.get(task.id) || []}
                            level={0}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                            tasksHandlers={tasksHandlers}
                            settings={settings}
                            t={t}
                        />
                    </React.Fragment>
                );
            })}
        </ul>
    );
};

export default TaskList;