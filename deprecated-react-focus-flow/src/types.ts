import React from "react";

// Core Types
export type View = 'timer' | 'tasks' | 'stats' | 'settings';
export type Mode = 'work' | 'break';
export type InterferenceLevel = 'zero' | 'weak' | 'strong';
export type DisplayMode = 'count up' | 'countdown';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';
export type KnobScrollMode = 'natural' | 'up_is_increase' | 'down_is_increase';
export type GoalMarkerDivision = 4 | 3 | 6 | 0;
export type RealismLevel = 'off' | 'material' | 'full';
export type SecondHandStyle = 'quartz_tick' | 'quartz_sweep' | 'traditional_escapement' | 'high_freq_escapement';
export type MovementType = 'quartz' | 'mechanical';
export type NavJitterMode = 'off' | 'directional' | 'bidirectional';
export type ContentJitterMode = 'off' | 'directional' | 'bidirectional';
export type FirstDayOfWeek = 'sunday' | 'monday';
export type ChartMetric = 'recorded' | 'actual' | 'net' | 'count';

// Task Management
export type TaskStatus = 'todo' | 'doing' | 'suspended' | 'done' | 'archived';
export type SuspensionReason = 'waiting' | 'delayed';

export interface Task {
  id: number;
  text: string;
  createdAt: string; // ISO string
  completedAt: string | null; // ISO string or null
  startDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  order: number; // For manual sorting
  appliedToSessionId: number | null; // For future use
  status: TaskStatus;
  suspensionReason?: SuspensionReason | null;
  isPostponed?: boolean;
  parentTaskId?: number | null;
  prerequisiteTaskIds?: number[];
}

export interface TasksState {
    tasks: Task[];
    taskInput: string;
    setTaskInput: React.Dispatch<React.SetStateAction<string>>;
    completedTasks: number;
}

export interface TasksHandlers {
    handleAddTask: (text: string, parentId?: number | null) => Task | undefined;
    toggleTask: (id: number) => void;
    deleteTask: (id: number) => void;
    updateTask: (id: number, updates: Partial<Omit<Task, 'id'>>) => void;
    startTask: (id: number) => void;
    pauseTask: (id: number, reason: SuspensionReason) => void;
    resumeTask: (id: number) => void;
    archiveTask: (id: number) => void;
    setPrerequisites: (id: number, prerequisiteIds: number[]) => void;
}

// Data Management
export interface ImportModes {
    tasks: 'append' | 'overwrite';
    stats: 'add' | 'overwrite';
}

// Pomodoro Session Data Structure
export interface PomodoroSession {
    id: number;
    title: string;
    startTime: string; // ISO string with timezone
    statisticalDateId: string; // YYYY-MM-DD string, based on session's local time and crossover setting. The single source of truth for grouping.
    startTimezoneOffset?: number; // Legacy: Client's timezone offset in minutes from UTC at session start. No longer saved for new sessions.
    endTime: string; // ISO string with timezone
    actualDuration: number; // Real-world elapsed seconds
    netDuration?: number; // Net duration excluding pauses.
    recordedDuration: number; // Timer's final value in seconds
    mft: number; // Minimum Focus Time (goal) in minutes
    pauseCount?: number; // Number of times the timer was paused.
    adjustments?: { amount: number; timestamp: string; }[]; // Log of time adjustments.
    totalAdjustment?: number; // Sum of all time adjustments in seconds.
    assignedTodos: number[]; // For future use
    todoDurations: Record<number, number>; // For future use
    notes: string; // For future use
}


// Settings Management
export interface Settings {
    minWorkMins: number;
    theme: Theme;
    language: Language;
    defaultDisplayMode: DisplayMode;
    knobScrollMode: KnobScrollMode;
    goalMarkerDivision: GoalMarkerDivision;
    realismLevel: RealismLevel;
    movementType: MovementType;
    secondHandStyle: SecondHandStyle;
    defaultZenMode: boolean;
    simpleMode: boolean;
    navJitterMode: NavJitterMode;
    contentJitterMode: ContentJitterMode;
    jitterInterval: number;
    longPressThreshold: number;
    legacyPhoneMode: boolean;
    legacyTheme: 'light' | 'dark';
    legacyOrientation: 'portrait' | 'landscape';
    legacyFont: 'serif' | 'sans-serif';
    legacyAnimationFrameRate: number;
    firstDayOfWeek: FirstDayOfWeek;
    dayCrossoverHour: number;
}

export type SetSettings = React.Dispatch<React.SetStateAction<Settings>>;
