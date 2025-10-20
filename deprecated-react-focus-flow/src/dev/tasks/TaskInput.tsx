import React, { useState } from 'react';
import { TasksHandlers } from '../../types';
import { AddIcon } from './TaskIcons';

interface TaskInputProps {
    tasksHandlers: TasksHandlers;
    t: (key: string) => string;
}

const TaskInput: React.FC<TaskInputProps> = ({ tasksHandlers, t }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            tasksHandlers.handleAddTask(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
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
    );
};

export default TaskInput;