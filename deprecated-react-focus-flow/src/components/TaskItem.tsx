
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, TasksHandlers, Settings, SuspensionReason } from '../types';

const formatDate = (isoDate: string, locale: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return adjustedDate.toISOString().split('T')[0];
};

// --- SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.81.97H5.44l.8-.97zM5 19V8h14v11H5zm11-5.5l-4 4-4-4 1.41-1.41L11 13.67V10h2v3.67l1.59-1.58L16 13.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>;
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
const ExpandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.06-1.06z"/></svg>;
const MoreVertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;


// Status Indicator Icons
const PostponedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414L10 9.414l3.293 3.293a1 1 0 001.414-1.414l-4-4z" clipRule="evenodd" /></svg>;
const WaitingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const BlockedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>;
const StartDateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>;
const DueDateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;


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
            // FIX: Explicitly type 't' as Task to help TypeScript inference.
            allTasks.forEach((t: Task) => {
                if (t.parentTaskId === parentId) {
                    descendants.add(t.id);
                    findDescendants(t.id);
                }
            });
        };
        findDescendants(task.id);

        // FIX: Explicitly type 't' as Task to help TypeScript inference.
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
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
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
        <div className="prereq-modal-backdrop">
            <div className="prereq-modal" ref={modalRef}>
                <h3>{t('selectPrerequisites')}</h3>
                <ul className="prereq-modal-list">
                    {availableTasks.length > 0 ? availableTasks.map(t => (
                        <li key={t.id} className="prereq-modal-item" onClick={() => handleToggle(t.id)}>
                             <input
                                type="checkbox"
                                checked={selectedIds.has(t.id)}
                                onChange={() => handleToggle(t.id)}
                            />
                            <label htmlFor={`prereq-${t.id}`}>{t.text}</label>
                        </li>
                    )) : <li>{t('noPrerequisites')}</li>}
                </ul>
                <form onSubmit={handleAddAndLink} className="prereq-modal-add-form">
                     <input
                        type="text"
                        value={newPrereqText}
                        onChange={(e) => setNewPrereqText(e.target.value)}
                        placeholder={t('newPrerequisitePlaceholder')}
                        className="task-input"
                    />
                    <button type="submit" className="control-button save-btn">{t('addAndLink')}</button>
                </form>
                <div className="prereq-modal-actions">
                    <button onClick={onClose}>{t('cancel')}</button>
                    <button onClick={handleSave} className="control-button save-btn">{t('save')}</button>
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
            if (showPauseMenu && pauseMenuRef.current && !pauseMenuRef.current.contains(target)) {
                setShowPauseMenu(false);
            }
            if (showMoreMenu && moreMenuRef.current && !moreMenuRef.current.contains(target)) {
                 const trigger = (moreMenuRef.current.previousSibling as HTMLElement);
                 if (!trigger || !trigger.contains(target)) {
                    setShowMoreMenu(false);
                 }
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
            if (!isExpanded) {
                toggleExpand(task.id);
            }
        }
    };
    
    const handlePause = (reason: SuspensionReason) => {
        tasksHandlers.pauseTask(task.id, reason);
        setShowPauseMenu(false);
    };
    
    const handleAddToToday = () => {
        tasksHandlers.updateTask(task.id, { startDate: new Date().toISOString().split('T')[0] });
    };

    const isBlocked = useMemo(() => {
        return (task.prerequisiteTaskIds?.length ?? 0) > 0;
    }, [task.prerequisiteTaskIds]);

    const isOutstanding = useMemo(() => {
        if (task.status === 'doing') return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = task.startDate ? new Date(task.startDate) : null;
        if (startDate) startDate.setHours(0,0,0,0);
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        if (dueDate) dueDate.setHours(0,0,0,0);
        if (dueDate && dueDate < today) return true;
        if ((dueDate && dueDate.getTime() === today.getTime()) || (startDate && startDate.getTime() <= today.getTime())) return true;
        return false;
    }, [task.status, task.startDate, task.dueDate]);

    return (
        <li
            className="task-item-container"
            data-status={isBlocked ? 'blocked' : task.status}
            data-expanded={isExpanded}
            style={{ '--indent-level': level } as React.CSSProperties}
        >
            <div className="task-item">
                <div className="task-item-main">
                    <button
                        onClick={() => toggleExpand(task.id)}
                        className="task-action-btn expand-task-btn"
                        aria-expanded={isExpanded}
                        style={{ visibility: hasSubtasks ? 'visible' : 'hidden' }}
                    >
                        <ExpandIcon />
                    </button>
                    <button onClick={() => tasksHandlers.toggleTask(task.id)} className="task-toggle-btn" aria-label={`Mark task ${task.text} as ${task.status === 'done' ? 'incomplete' : 'complete'}`}>
                        <span className="checkbox-icon">
                            {task.status === 'done' && <CheckIcon />}
                        </span>
                    </button>
                    <div className="task-content">
                        <div className="task-primary-line">
                            <span className="task-status-indicator">
                                {task.isPostponed && <PostponedIcon />}
                                {task.status === 'suspended' && task.suspensionReason === 'waiting' && <WaitingIcon />}
                                {task.status === 'suspended' && task.suspensionReason === 'delayed' && <PauseIcon />}
                            </span>
                            {isEditing ? (
                                <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onBlur={handleEditSubmit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
                                    className="task-input"
                                />
                            ) : (
                                <span className="task-text" onClick={() => { if (task.status !== 'done' && task.status !== 'archived') setIsEditing(true); }}>{task.text}</span>
                            )}
                        </div>
                         {isBlocked && (
                            <div className="prerequisites-display">
                                <span><BlockedIcon /> {t('isBlockedBy')}</span>
                                {task.prerequisiteTaskIds?.map(id => allTasks.get(id)?.text).filter(Boolean).slice(0, 2).join(', ')}
                                {(task.prerequisiteTaskIds?.length ?? 0) > 2 ? '...' : ''}
                            </div>
                        )}
                        <div className="task-date-display">
                            {task.startDate && <span className={isOutstanding ? 'overdue' : ''}><StartDateIcon /> {formatDate(task.startDate, settings.language)}</span>}
                            {task.dueDate && <span className={new Date(task.dueDate) < new Date() ? 'overdue' : ''}><DueDateIcon /> {formatDate(task.dueDate || '', settings.language)}</span>}
                        </div>
                    </div>
                    <div className="task-actions">
                         {task.status === 'todo' && !isBlocked && !isOutstanding && (
                            <button className="task-action-btn" onClick={handleAddToToday} aria-label={t('addToToday')} title={t('addToToday')}><SunIcon /></button>
                        )}
                        {task.status === 'todo' && !isBlocked && isOutstanding && (
                            <button className="task-action-btn" onClick={() => tasksHandlers.startTask(task.id)} aria-label={t('startTask')}><PlayIcon /></button>
                        )}
                        {task.status === 'doing' && (
                             <div style={{position: 'relative'}}>
                                <button className="task-action-btn" onClick={() => setShowPauseMenu(true)} aria-label={t('pauseTask')}><PauseIcon /></button>
                                {showPauseMenu && (
                                    <div className="pause-menu" ref={pauseMenuRef}>
                                        <button className="task-action-btn" onClick={() => handlePause('waiting')} title={t('waiting')}><WaitingIcon /></button>
                                        <button className="task-action-btn" onClick={() => handlePause('delayed')} title={t('delayed')}><PauseIcon /></button>
                                    </div>
                                )}
                            </div>
                        )}
                        {task.status === 'suspended' && (
                             <button className="task-action-btn" onClick={() => tasksHandlers.resumeTask(task.id)} aria-label={t('resumeTask')}><PlayIcon /></button>
                        )}
                        <button className="task-action-btn" onClick={() => setShowMoreMenu(prev => !prev)}><MoreVertIcon /></button>
                         {showMoreMenu && (
                            <div className="task-more-menu" ref={moreMenuRef}>
                                <button onClick={() => { setDetailsOpen(p => !p); setShowMoreMenu(false); }}><EditIcon /> {t('editTaskDetails')}</button>
                                <button onClick={() => { setShowPrereqModal(true); setShowMoreMenu(false); }}><LinkIcon /> {t('setPrerequisites')}</button>
                                <button onClick={() => { tasksHandlers.archiveTask(task.id); setShowMoreMenu(false); }}><ArchiveIcon /> {t('archiveTask')}</button>
                                <button onClick={() => { tasksHandlers.deleteTask(task.id); setShowMoreMenu(false); }} className="delete"><DeleteIcon /> {t('deleteTask', task.text)}</button>
                            </div>
                         )}
                    </div>
                </div>
                {detailsOpen && (
                    <div className="task-details">
                        <div className="task-date-input-group">
                            <label htmlFor={`start-date-${task.id}`}>{t('startDate')}</label>
                            <input
                                type="date"
                                id={`start-date-${task.id}`}
                                value={formatDate(task.startDate || '', settings.language)}
                                onChange={(e) => tasksHandlers.updateTask(task.id, { startDate: e.target.value })}
                            />
                        </div>
                        <div className="task-date-input-group">
                            <label htmlFor={`due-date-${task.id}`}>{t('dueDate')}</label>
                             <input
                                type="date"
                                id={`due-date-${task.id}`}
                                value={formatDate(task.dueDate || '', settings.language)}
                                onChange={(e) => tasksHandlers.updateTask(task.id, { dueDate: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </div>
            {isExpanded && (
                <>
                    <ul className="subtask-list">
                        {subtasks.map(subtask => (
                            <TaskItem
                                key={subtask.id}
                                task={subtask}
                                allTasks={allTasks}
                                // FIX: Explicitly type 't' as Task to help TypeScript inference.
                                subtasks={allTasks.size > 0 ? Array.from(allTasks.values()).filter((t: Task) => t.parentTaskId === subtask.id) : []}
                                level={level + 1}
                                expandedIds={expandedIds}
                                toggleExpand={toggleExpand}
                                tasksHandlers={tasksHandlers}
                                settings={settings}
                                t={t}
                            />
                        ))}
                    </ul>
                     <form onSubmit={handleSubtaskSubmit} className="add-subtask-form task-form">
                        <input
                            type="text"
                            value={subtaskInput}
                            onChange={(e) => setSubtaskInput(e.target.value)}
                            placeholder={t('addSubtask')}
                            className="task-input"
                        />
                        <button type="submit" className="task-add-btn" aria-label={t('addSubtask')}><AddIcon /></button>
                    </form>
                </>
            )}
            {showPrereqModal && (
                <PrerequisiteModal
                    task={task}
                    allTasks={allTasks}
                    tasksHandlers={tasksHandlers}
                    onClose={() => setShowPrereqModal(false)}
                    t={t}
                />
            )}
        </li>
    );
};

export default TaskItem;
