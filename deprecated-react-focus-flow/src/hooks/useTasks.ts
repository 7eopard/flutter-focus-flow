import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, TaskStatus, SuspensionReason } from '../types';

const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const savedTasks = localStorage.getItem('tasks');
            return savedTasks ? JSON.parse(savedTasks) : [];
        } catch (error) {
            console.error('Failed to parse tasks from localStorage', error);
            return [];
        }
    });
    const [taskInput, setTaskInput] = useState('');

    useEffect(() => {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('Failed to save tasks to localStorage', error);
        }
    }, [tasks]);

    const handleAddTask = useCallback((text: string, parentTaskId: number | null = null): Task | undefined => {
        if (text.trim()) {
            const now = new Date();
            const newTask: Task = {
                id: now.getTime(),
                text: text.trim(),
                createdAt: now.toISOString(),
                completedAt: null,
                startDate: null,
                dueDate: null,
                order: now.getTime(),
                appliedToSessionId: null,
                status: 'todo',
                suspensionReason: null,
                isPostponed: false,
                parentTaskId: parentTaskId || null,
                prerequisiteTaskIds: [],
            };
            setTasks(prevTasks => [...prevTasks, newTask]);
            if (!parentTaskId) {
                setTaskInput('');
            }
            return newTask;
        }
        return undefined;
    }, []);

    const toggleTask = useCallback((id: number) => {
        setTasks(prevTasks => {
            let newTasks = [...prevTasks];
            const taskToToggle = newTasks.find(t => t.id === id);
            if (!taskToToggle) return prevTasks;
    
            const isNowDone = taskToToggle.status !== 'done';
            const newStatus = isNowDone ? 'done' : 'todo';
    
            const idsToUpdate = new Set<number>([id]);
    
            // Parent -> Subtask status update
            const updateChildrenRecursive = (parentId: number) => {
                newTasks.forEach(child => {
                    if (child.parentTaskId === parentId) {
                        idsToUpdate.add(child.id);
                        updateChildrenRecursive(child.id);
                    }
                });
            };
            updateChildrenRecursive(id);
    
            newTasks = newTasks.map(t => 
                idsToUpdate.has(t.id) 
                    ? { ...t, status: newStatus, completedAt: isNowDone ? new Date().toISOString() : null, suspensionReason: null } 
                    : t
            );
    
            // Subtask -> Parent status update
            if (taskToToggle.parentTaskId && isNowDone) {
                const parentId = taskToToggle.parentTaskId;
                const siblings = newTasks.filter(t => t.parentTaskId === parentId);
                const allSiblingsDone = siblings.every(s => s.status === 'done');
                if (allSiblingsDone) {
                    newTasks = newTasks.map(t => 
                        t.id === parentId 
                            ? { ...t, status: 'done', completedAt: new Date().toISOString() } 
                            : t
                    );
                }
            }
            
            // Dependency Unlocking
            const newlyCompletedIds = newTasks
                .filter(t => t.status === 'done' && prevTasks.find(pt => pt.id === t.id)?.status !== 'done')
                .map(t => t.id);

            if (newlyCompletedIds.length > 0) {
                newTasks = newTasks.map(t => {
                    if (t.prerequisiteTaskIds && t.prerequisiteTaskIds.length > 0) {
                        const newPrereqs = t.prerequisiteTaskIds.filter(pId => !newlyCompletedIds.includes(pId));
                        if (newPrereqs.length < t.prerequisiteTaskIds.length) {
                            const updatedTask = { ...t, prerequisiteTaskIds: newPrereqs };
                            if (newPrereqs.length === 0 && updatedTask.status === 'suspended' && updatedTask.suspensionReason === 'waiting') {
                                updatedTask.status = 'todo';
                                updatedTask.suspensionReason = null;
                            }
                            return updatedTask;
                        }
                    }
                    return t;
                });
            }
    
            return newTasks;
        });
    }, []);

    const deleteTask = useCallback((id: number) => {
        setTasks(prevTasks => {
            const idsToDelete = new Set<number>([id]);
            const findChildrenRecursive = (parentId: number) => {
                prevTasks.forEach(task => {
                    if (task.parentTaskId === parentId) {
                        idsToDelete.add(task.id);
                        findChildrenRecursive(task.id);
                    }
                });
            };
            findChildrenRecursive(id);

            let remainingTasks = prevTasks.filter(task => !idsToDelete.has(task.id));
            
            // Clean up prerequisites
            remainingTasks = remainingTasks.map(task => {
                if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0) {
                    const newPrereqs = task.prerequisiteTaskIds.filter(prereqId => !idsToDelete.has(prereqId));
                    if (newPrereqs.length !== task.prerequisiteTaskIds.length) {
                        const updatedTask = { ...task, prerequisiteTaskIds: newPrereqs };
                        if (newPrereqs.length === 0 && updatedTask.status === 'suspended' && updatedTask.suspensionReason === 'waiting') {
                            updatedTask.status = 'todo';
                            updatedTask.suspensionReason = null;
                        }
                        return updatedTask;
                    }
                }
                return task;
            });
            return remainingTasks;
        });
    }, []);

    const updateTask = useCallback((id: number, updates: Partial<Omit<Task, 'id'>>) => {
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === id) {
                    const originalTask = { ...task };
                    let finalUpdates = { ...updates };
                    
                    if (updates.startDate !== undefined || updates.dueDate !== undefined) {
                        let isNowPostponed = originalTask.isPostponed || false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const oldStartDate = originalTask.startDate ? new Date(originalTask.startDate) : null;
                        if(oldStartDate) oldStartDate.setHours(0,0,0,0);
                        const newStartDateStr = updates.startDate !== undefined ? updates.startDate : originalTask.startDate;
                        const newStartDate = newStartDateStr ? new Date(newStartDateStr) : null;
                        if(newStartDate) newStartDate.setHours(0,0,0,0);

                        if (oldStartDate && oldStartDate <= today && newStartDate && newStartDate > today) {
                           isNowPostponed = true;
                        }
                        if (oldStartDate && oldStartDate > today && newStartDate && newStartDate > oldStartDate) {
                            isNowPostponed = true;
                        }

                        if (isNowPostponed && originalTask.status !== 'done') {
                            finalUpdates.status = 'todo';
                            finalUpdates.suspensionReason = null;
                        }
                        finalUpdates.isPostponed = isNowPostponed;
                    }

                    return { ...task, ...finalUpdates };
                }
                return task;
            })
        );
    }, []);

    const startTask = useCallback((id: number) => {
        updateTask(id, { status: 'doing', suspensionReason: null });
    }, [updateTask]);

    const pauseTask = useCallback((id: number, reason: SuspensionReason) => {
        updateTask(id, { status: 'suspended', suspensionReason: reason });
    }, [updateTask]);

    const resumeTask = useCallback((id: number) => {
        updateTask(id, { status: 'doing', suspensionReason: null });
    }, [updateTask]);
    
    const archiveTask = useCallback((id: number) => {
        setTasks(prevTasks => {
            const idsToArchive = new Set<number>([id]);
            const findChildrenRecursive = (parentId: number) => {
                prevTasks.forEach(task => {
                    if (task.parentTaskId === parentId) {
                        idsToArchive.add(task.id);
                        findChildrenRecursive(task.id);
                    }
                });
            };
            findChildrenRecursive(id);
    
            return prevTasks.map(task => 
                idsToArchive.has(task.id) ? { ...task, status: 'archived' } : task
            );
        });
    }, []);
    
    const setPrerequisites = useCallback((id: number, prerequisiteTaskIds: number[]) => {
        const hasPrereqs = prerequisiteTaskIds.length > 0;
        const taskIsDone = tasks.find(t => t.id === id)?.status === 'done';
        if (taskIsDone) return;
    
        updateTask(id, {
            prerequisiteTaskIds,
            status: hasPrereqs ? 'suspended' : 'todo',
            suspensionReason: hasPrereqs ? 'waiting' : null,
        });
    }, [updateTask, tasks]);

    const completedTasks = useMemo(() => tasks.filter(task => task.status === 'done').length, [tasks]);

    const tasksHandlers = useMemo(() => ({
        handleAddTask,
        toggleTask,
        deleteTask,
        updateTask,
        startTask,
        pauseTask,
        resumeTask,
        archiveTask,
        setPrerequisites,
    }), [handleAddTask, toggleTask, deleteTask, updateTask, startTask, pauseTask, resumeTask, archiveTask, setPrerequisites]);

    return {
        tasks,
        taskInput,
        setTaskInput,
        tasksHandlers,
        completedTasks,
        setTasks,
    };
};

export default useTasks;