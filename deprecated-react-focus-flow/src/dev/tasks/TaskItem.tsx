import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, TasksHandlers, Settings, SuspensionReason } from '../../types';
import { PlayIcon, PauseIcon, LinkIcon, EditIcon, ArchiveIcon, DeleteIcon, AddIcon, ExpandIcon, CheckIcon, SunIcon, MoreVertIcon, PostponedIcon, WaitingIcon, BlockedIcon, StartDateIcon, DueDateIcon } from './TaskIcons';

const formatDate = (isoDate: string | null, locale: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return adjustedDate.toISOString().split('T')[0];
};

const PrerequisiteModal: React.FC<{
    task: Task;
    allTasks: Map<number, Task>;
    tasksHandlers: TasksHandlers;
    onClose: () => void;
    t: (key: string, ...args: any[]) => string;
}> = ({ task, allTasks, tasksHandlers, onClose, t }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(task.prerequisiteTaskIds || []));
    const [newPrereqText, setNewPrereqText] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const availableTasks = useMemo(() => {
        const descendants = new Set<number>();
        const findDescendants = (parentId: number) => {
            allTasks.forEach((t: Task) => {
                if (t.parentTaskId === parentId) {
                    descendants.add(t.id);
                    findDescendants(t.id);
                }
            });
        };
        findDescendants(task.id);

        return Array.from(allTasks.values()).filter((t: Task) =>
            t.id !== task.id &&
            t.status !== 'done' &&
            t.status !== 'archived' &&
            !descendants.has(t.id)
        );
    }, [allTasks, task.id]);
    
    const handleToggle = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSave = () => {
        tasksHandlers.setPrerequisites(task.id, Array.from(selectedIds));
        onClose();
    };
    
    const handleAddAndLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPrereqText.trim()) {
            const newPrereqTask = tasksHandlers.handleAddTask(newPrereqText);
            if (newPrereqTask) {
                setSelectedIds(prev => new Set(prev).add(newPrereqTask.id));
            }
            setNewPrereqText('');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[1000] grid place-items-center animate-[fadeIn_0.2s_ease]">
            <div ref={modalRef} className="bg-[var(--card-bg)] p-6 rounded-2xl w-[90%] max-w-md max-h-[80vh] flex flex-col shadow-lg">
                <h3 className="m-0 mb-4 flex-shrink-0 text-lg font-semibold">{t('selectPrerequisites')}</h3>
                <ul className="overflow-y-auto flex-grow list-none p-0">
                    {availableTasks.length > 0 ? availableTasks.map(t => (
                        <li key={t.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--card-bg-light)]" onClick={() => handleToggle(t.id)}>
                             <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => handleToggle(t.id)} className="w-5 h-5 flex-shrink-0" />
                            <label className="flex-grow">{t.text}</label>
                        </li>
                    )) : <li className='p-2 text-[var(--text-muted)]'>{t('noPrerequisites')}</li>}
                </ul>
                <form onSubmit={handleAddAndLink} className="flex gap-2 mt-4 pt-4 border-t border-[var(--card-bg-light)]">
                    <input type="text" value={newPrereqText} onChange={(e) => setNewPrereqText(e.target.value)} placeholder={t('newPrerequisitePlaceholder')} className="h-10 flex-grow w-auto bg-[var(--card-bg-light)] border-2 border-transparent rounded-lg px-4 text-[var(--text-color)] focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--card-bg)]" />
                    <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--accent-color)] text-[var(--card-bg)] font-semibold">{t('addAndLink')}</button>
                </form>
                <div className="flex justify-end gap-2 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold border border-[var(--card-bg-light)] hover:bg-[var(--card-bg-light)]">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[var(--accent-color)] text-[var(--card-bg)] font-semibold">{t('save')}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};


interface TaskItemProps {
    task: Task;
    allTasks: Map<number, Task>;
    subtasks: Task[];
    level: number;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    tasksHandlers: TasksHandlers;
    settings: Settings;
    t: (key: string, ...args: any[]) => string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, allTasks, subtasks, level, expandedIds, toggleExpand, tasksHandlers, settings, t }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingText, setEditingText] = useState(task.text);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showPrereqModal, setShowPrereqModal] = useState(false);
    const [subtaskInput, setSubtaskInput] = useState('');

    const editInputRef = useRef<HTMLInputElement>(null);
    const pauseMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    const isExpanded = expandedIds.has(task.id);
    const hasSubtasks = subtasks.length > 0;

    useEffect(() => {
        if (isEditing) {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }
    }, [isEditing]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (showPauseMenu && pauseMenuRef.current && !pauseMenuRef.current.contains(target)) setShowPauseMenu(false);
            if (showMoreMenu && moreMenuRef.current && !moreMenuRef.current.contains(target)) {
                 const trigger = (moreMenuRef.current.previousSibling as HTMLElement);
                 if (!trigger || !trigger.contains(target)) setShowMoreMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPauseMenu, showMoreMenu]);

    const handleEditSubmit = () => {
        if (editingText.trim()) {
            tasksHandlers.updateTask(task.id, { text: editingText.trim() });
        }
        setIsEditing(false);
    };

    const handleSubtaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (subtaskInput.trim()) {
            tasksHandlers.handleAddTask(subtaskInput, task.id);
            setSubtaskInput('');
            if (!isExpanded) toggleExpand(task.id);
        }
    };
    
    const handlePause = (reason: SuspensionReason) => {
        tasksHandlers.pauseTask(task.id, reason);
        setShowPauseMenu(false);
    };
    
    const handleAddToToday = () => {
        tasksHandlers.updateTask(task.id, { startDate: new Date().toISOString().split('T')[0] });
    };

    const isBlocked = useMemo(() => (task.prerequisiteTaskIds?.length ?? 0) > 0, [task.prerequisiteTaskIds]);
    const isOverdue = useMemo(() => task.dueDate && new Date(task.dueDate) < new Date(), [task.dueDate]);

    const dataStatus = isBlocked ? 'blocked' : task.status;
    const taskItemClasses = `transition-opacity duration-300 ${ (dataStatus === 'suspended' || dataStatus === 'archived' || dataStatus === 'blocked') ? 'opacity-60' : '' }`;
    const textClasses = (task.status === 'done' || task.status === 'archived') ? 'line-through text-[var(--text-muted)]' : '';

    return (
        <li className={taskItemClasses} style={{ '--indent-level': level } as React.CSSProperties}>
            <div className="py-3 border-b border-[var(--card-bg-light)] group">
                <div className="flex items-center gap-1">
                    <button onClick={() => toggleExpand(task.id)} className="p-1 rounded-full text-[var(--text-muted)]" style={{ visibility: hasSubtasks ? 'visible' : 'hidden' }}><ExpandIcon className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} /></button>
                    <button onClick={() => tasksHandlers.toggleTask(task.id)} className="p-0 flex-shrink-0">
                        <span className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' : 'border-[var(--text-muted)] group-hover:border-[var(--text-color)]'}`}>
                            {task.status === 'done' && <CheckIcon className="w-4 h-4 text-[var(--card-bg)]" />}
                        </span>
                    </button>
                    <div className="flex flex-col flex-grow min-w-0 mx-1">
                        <div className={`flex items-center gap-2 ${textClasses}`}>
                            <span className="text-sm text-[var(--text-muted)] inline-flex items-center">{task.status === 'suspended' && (task.suspensionReason === 'waiting' ? <WaitingIcon /> : <PauseIcon />)}</span>
                            {isEditing ? (
                                <input ref={editInputRef} type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} onBlur={handleEditSubmit} onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()} className="w-full bg-transparent border-b border-[var(--accent-color)] focus:outline-none"/>
                            ) : (
                                <span className="flex-grow cursor-text" onClick={() => { if (task.status !== 'done' && task.status !== 'archived') setIsEditing(true); }}>{task.text}</span>
                            )}
                        </div>
                         <div className={`flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium mt-1 ${textClasses}`}>
                            {isBlocked && <span className="flex items-center gap-1"><BlockedIcon /> {t('isBlockedBy')} {task.prerequisiteTaskIds?.map(id => allTasks.get(id)?.text).filter(Boolean).slice(0, 1).join(', ')}{(task.prerequisiteTaskIds?.length ?? 0) > 1 ? '...' : ''}</span>}
                            {task.startDate && <span className="flex items-center gap-1"><StartDateIcon /> {formatDate(task.startDate, settings.language)}</span>}
                            {task.dueDate && <span className={`flex items-center gap-1 ${isOverdue && task.status !== 'done' ? 'text-[var(--work-color)]' : ''}`}><DueDateIcon /> {formatDate(task.dueDate, settings.language)}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {task.status === 'todo' && !isBlocked && <button className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-color)]" onClick={() => tasksHandlers.startTask(task.id)} title={t('startTask')}><PlayIcon /></button>}
                        {task.status === 'doing' && <div className="relative"><button className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-color)]" onClick={() => setShowPauseMenu(p => !p)} title={t('pauseTask')}><PauseIcon /></button>
                            {showPauseMenu && <div ref={pauseMenuRef} className="absolute right-full top-[-5px] mr-2 flex gap-1 bg-[var(--card-bg)] p-1 rounded-lg shadow-md z-10"><button onClick={() => handlePause('waiting')} title={t('waiting')} className="p-1 rounded-full bg-[var(--card-bg-light)]"><WaitingIcon /></button><button onClick={() => handlePause('delayed')} title={t('delayed')} className="p-1 rounded-full bg-[var(--card-bg-light)]"><PauseIcon /></button></div>}
                        </div>}
                        {task.status === 'suspended' && <button className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-color)]" onClick={() => tasksHandlers.resumeTask(task.id)} title={t('resumeTask')}><PlayIcon /></button>}
                        <div className="relative"><button className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-color)]" onClick={() => setShowMoreMenu(p => !p)}><MoreVertIcon /></button>
                            {showMoreMenu && <div ref={moreMenuRef} className="absolute right-0 top-full mt-1 w-max bg-[var(--card-bg)] p-2 rounded-lg shadow-lg z-20 flex flex-col gap-1">
                                <button onClick={() => { setDetailsOpen(p => !p); setShowMoreMenu(false); }} className="flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md hover:bg-[var(--card-bg-light)]"><EditIcon />{t('editTaskDetails')}</button>
                                <button onClick={() => { setShowPrereqModal(true); setShowMoreMenu(false); }} className="flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md hover:bg-[var(--card-bg-light)]"><LinkIcon />{t('setPrerequisites')}</button>
                                <button onClick={() => { tasksHandlers.archiveTask(task.id); setShowMoreMenu(false); }} className="flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md hover:bg-[var(--card-bg-light)]"><ArchiveIcon />{t('archiveTask')}</button>
                                <button onClick={() => { tasksHandlers.deleteTask(task.id); setShowMoreMenu(false); }} className="flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md hover:bg-[var(--card-bg-light)] text-[var(--work-color)]"><DeleteIcon />{t('deleteTask', task.text)}</button>
                            </div>}
                        </div>
                    </div>
                </div>
                {detailsOpen && <div className="grid grid-cols-2 gap-4 pt-3 pb-1 pl-12 animate-[fadeIn_0.3s_ease]">
                    <div><label className="text-xs font-semibold text-[var(--text-muted)]">{t('startDate')}</label><input type="date" value={formatDate(task.startDate, settings.language)} onChange={(e) => tasksHandlers.updateTask(task.id, { startDate: e.target.value })} className="mt-1 w-full bg-[var(--card-bg-light)] border-2 border-transparent rounded-lg p-1 text-sm focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--card-bg)]" /></div>
                    <div><label className="text-xs font-semibold text-[var(--text-muted)]">{t('dueDate')}</label><input type="date" value={formatDate(task.dueDate, settings.language)} onChange={(e) => tasksHandlers.updateTask(task.id, { dueDate: e.target.value })} className="mt-1 w-full bg-[var(--card-bg-light)] border-2 border-transparent rounded-lg p-1 text-sm focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--card-bg)]" /></div>
                </div>}
            </div>
            {isExpanded && (<>
                <ul className="list-none pl-5 ml-5 border-l border-[var(--card-bg-light)]">
                    {subtasks.map(subtask => <TaskItem key={subtask.id} task={subtask} allTasks={allTasks} subtasks={tasksByParent.get(subtask.id) || []} level={level + 1} expandedIds={expandedIds} toggleExpand={toggleExpand} tasksHandlers={tasksHandlers} settings={settings} t={t} />)}
                </ul>
                <form onSubmit={handleSubtaskSubmit} className="flex gap-2 mt-2" style={{ paddingLeft: `calc(1.25rem + 1.25rem + ${level * (1.25)}rem)` }}><input type="text" value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} placeholder={t('addSubtask')} className="flex-grow text-sm bg-[var(--card-bg-light)] border-2 border-transparent rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--card-bg)]" /><button type="submit" className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-color)] text-[var(--card-bg)] flex items-center justify-center"><AddIcon /></button></form>
            </>)}
            {showPrereqModal && <PrerequisiteModal task={task} allTasks={allTasks} tasksHandlers={tasksHandlers} onClose={() => setShowPrereqModal(false)} t={t} />}
        </li>
    );
};

const tasksByParent = new Map<number | null, Task[]>();

export default TaskItem;