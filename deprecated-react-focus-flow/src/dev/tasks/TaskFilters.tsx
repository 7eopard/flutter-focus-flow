import React from 'react';

interface TaskFiltersProps {
    sortOrder: 'default' | 'dueDate' | 'creationDate';
    setSortOrder: (order: 'default' | 'dueDate' | 'creationDate') => void;
    t: (key: string) => string;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ sortOrder, setSortOrder, t }) => {
    const sortOptions = [
        { value: 'default', label: t('sortDefault') },
        { value: 'dueDate', label: t('sortDueDate') },
        { value: 'creationDate', label: t('sortCreationDate') },
    ];

    return (
        <div className="flex self-start bg-[var(--card-bg-light)] rounded-full p-1">
            {sortOptions.map(({ value, label }) => (
                <button
                    key={value}
                    onClick={() => setSortOrder(value as any)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                        sortOrder === value
                            ? 'bg-[var(--card-bg)] text-[var(--text-color)] shadow-sm'
                            : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-color)]'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

export default TaskFilters;