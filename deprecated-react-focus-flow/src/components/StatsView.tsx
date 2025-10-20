import React, { useMemo, useState } from 'react';
import { PomodoroSession, Settings, ChartMetric } from '../types';

type ViewMode = 'week' | 'month' | 'year' | 'all';
type SubMode = 'natural' | 'rolling';

interface ChartDataPoint {
    key: string;
    label: string;
    value: number;
}

interface StatsViewProps {
    t: (key: string, ...args: any[]) => string;
    sessions: PomodoroSession[];
    completedTasks: number;
    settings: Settings;
}

// A reusable Filter Chip component adhering to MD3 specifications.
const FilterChip: React.FC<{
    label: string;
    isSelected: boolean;
    onClick: () => void;
}> = ({ label, isSelected, onClick }) => (
    <button
        onClick={onClick}
        aria-pressed={isSelected}
        className={`
            flex flex-shrink-0 items-center justify-center h-8 rounded-lg 
            text-sm font-medium transition-colors duration-200 ease-in-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-color)]
            ${isSelected
                ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)] pl-2 pr-4 gap-2'
                : 'border border-gray-300 dark:border-gray-600 bg-transparent text-[var(--text-muted)] hover:bg-gray-200/50 dark:hover:bg-white/10 px-4'
            }
        `}
    >
        {isSelected && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
            </svg>
        )}
        <span>{label}</span>
    </button>
);


// --- Date Helper Functions ---

const getStartOfWeek = (d: Date, firstDayOfWeek: 'monday' | 'sunday'): Date => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = date.getDate() - day + (firstDayOfWeek === 'monday' ? (day === 0 ? -6 : 1) : 0);
    return new Date(date.setDate(diff));
};

const getStartOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const getStartOfYear = (d: Date): Date => new Date(d.getFullYear(), 0, 1);

const formatDateId = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekId = (d: Date, firstDayOfWeek: 'monday' | 'sunday'): string => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayOfWeek = date.getUTCDay();
    const weekStartOffset = firstDayOfWeek === 'monday' ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;
    date.setUTCDate(date.getUTCDate() + weekStartOffset);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getMonthId = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// --- Fallback for legacy data ---
const getStatisticalDateIdForSession = (session: PomodoroSession): string => {
    if (session.statisticalDateId) {
        return session.statisticalDateId;
    }
    return session.startTime.split('T')[0];
};

const getMetricForSession = (session: PomodoroSession, metric: ChartMetric): number => {
    switch (metric) {
        case 'count': return 1;
        case 'recorded': return session.recordedDuration;
        case 'actual': return session.actualDuration;
        case 'net': default: return session.netDuration ?? session.actualDuration;
    }
};

const formatPercentage = (current: number, previous: number): { value: string; isPositive: boolean | null } => {
    if (previous === 0) {
        if (current > 0) return { value: '∞', isPositive: true };
        return { value: '0%', isPositive: null };
    }
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 0.01) return { value: '0%', isPositive: null };
    const sign = change > 0 ? '+' : '';
    return { value: `${sign}${change.toFixed(0)}%`, isPositive: change > 0 };
};

const ComparisonCard: React.FC<{
    title: string;
    currentValue: number;
    previousValue: number;
    metric: ChartMetric;
}> = ({ title, currentValue, previousValue, metric }) => {
    const { value, isPositive } = formatPercentage(currentValue, previousValue);
    
    const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>;
    const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>;
    const Arrow = isPositive === null ? null : (isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />);

    const formatValue = (seconds: number) => {
        if (metric === 'count') return seconds.toString();
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="stat-item">
            <div className="stat-value" style={{ color: isPositive === null ? 'var(--text-color)' : (isPositive ? 'var(--work-color)' : 'var(--break-color)')}}>
                {Arrow} {value}
            </div>
            <div className="stat-label">{title}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                {formatValue(currentValue)} vs {formatValue(previousValue)}
            </div>
        </div>
    );
};


const StatsView: React.FC<StatsViewProps> = ({ t, sessions, settings }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [subMode, setSubMode] = useState<SubMode>('natural');
    const [dateOffset, setDateOffset] = useState(0);
    const [selectedBar, setSelectedBar] = useState<string | null>(null);
    const [chartMetric, setChartMetric] = useState<ChartMetric>('net');

    // Chart layout constants
    const CHART_HEIGHT = 220;
    const CHART_TOP_PADDING = 20; // Space for value labels above bars
    const CHART_BOTTOM_PADDING = 30; // Space for x-axis labels below bars
    const CHART_DRAWABLE_HEIGHT = CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING;
    const CHART_BASELINE_Y = CHART_HEIGHT - CHART_BOTTOM_PADDING;


    const { periodLabel, startDate, endDate } = useMemo(() => {
        const now = new Date();
        let currentStartDate: Date;
        let currentEndDate: Date;
        let label = '';
    
        if (subMode === 'rolling') {
            const baseDate = new Date();
            baseDate.setDate(baseDate.getDate() + dateOffset);
            currentEndDate = baseDate;
            currentStartDate = new Date(baseDate);
    
            if (viewMode === 'week') {
                currentStartDate.setDate(baseDate.getDate() - 6);
            } else if (viewMode === 'month') {
                currentStartDate.setDate(baseDate.getDate() - 29);
            } else { // year
                currentStartDate.setDate(baseDate.getDate() - 364);
            }
            label = `${currentStartDate.toLocaleDateString(settings.language, { month: 'short', day: 'numeric' })} - ${currentEndDate.toLocaleDateString(settings.language, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else { // natural
            if (viewMode === 'week') {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (dateOffset * 7));
                currentStartDate = getStartOfWeek(d, settings.firstDayOfWeek);
                currentEndDate = new Date(currentStartDate);
                currentEndDate.setDate(currentEndDate.getDate() + 6);
                
                const weekId = getWeekId(currentStartDate, settings.firstDayOfWeek);
                const weekNumber = weekId.split('-W')[1].replace(/^0+/, '');
                const dateRange = `${currentStartDate.toLocaleDateString(settings.language, { month: 'short', day: 'numeric' })} - ${currentEndDate.toLocaleDateString(settings.language, { month: 'short', day: 'numeric', year: 'numeric' })}`;
                label = `${t('week')} ${weekNumber} (${dateRange})`;

            } else if (viewMode === 'month') {
                const d = new Date(now.getFullYear(), now.getMonth() + dateOffset, 1);
                currentStartDate = getStartOfMonth(d);
                currentEndDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                label = `${currentStartDate.toLocaleDateString(settings.language, { month: 'long', year: 'numeric' })}`;
            } else if (viewMode === 'year') {
                const d = new Date(now.getFullYear() + dateOffset, 0, 1);
                currentStartDate = getStartOfYear(d);
                currentEndDate = new Date(d.getFullYear(), 11, 31);
                label = `${currentStartDate.getFullYear()}`;
            } else { // 'all'
                currentStartDate = new Date(0);
                currentEndDate = new Date(8640000000000000);
                label = t('all');
            }
        }
    
        currentStartDate.setHours(0, 0, 0, 0);
        currentEndDate.setHours(23, 59, 59, 999);
    
        return { periodLabel: label, startDate: currentStartDate, endDate: currentEndDate };
    }, [viewMode, subMode, dateOffset, settings.firstDayOfWeek, settings.language, t]);

    const sessionsInPeriod = useMemo(() => {
        if (viewMode === 'all') return sessions;
        const startId = formatDateId(startDate);
        const endId = formatDateId(endDate);
        return sessions.filter(session => {
            const sessionId = getStatisticalDateIdForSession(session);
            return sessionId >= startId && sessionId <= endId;
        });
    }, [sessions, viewMode, startDate, endDate]);

    const stats = useMemo(() => {
        const totalDuration = sessionsInPeriod.reduce((sum, s) => sum + getMetricForSession(s, 'net'), 0);
        const sessionCount = sessionsInPeriod.length;
        return { totalDuration, sessionCount };
    }, [sessionsInPeriod]);

    // --- Comparison Logic ---
    const { periodOverPeriodData, yearOverYearData } = useMemo(() => {
        if (viewMode === 'all') return { periodOverPeriodData: { current: 0, previous: 0 }, yearOverYearData: { current: 0, previous: 0 } };

        const getPeriodValue = (start: Date, end: Date) => {
            const startId = formatDateId(start);
            const endId = formatDateId(end);
            return sessions
                .filter(s => {
                    const sId = getStatisticalDateIdForSession(s);
                    return sId >= startId && sId <= endId;
                })
                .reduce((sum, s) => sum + getMetricForSession(s, chartMetric), 0);
        };
        
        const currentPeriodValue = sessionsInPeriod.reduce((sum, s) => sum + getMetricForSession(s, chartMetric), 0);

        // Period-over-Period
        let prevStartDate = new Date(startDate);
        let prevEndDate = new Date(endDate);
        if (subMode === 'natural') {
            if (viewMode === 'week') {
                prevStartDate.setDate(prevStartDate.getDate() - 7);
                prevEndDate.setDate(prevEndDate.getDate() - 7);
            } else if (viewMode === 'month') {
                prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
                prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
            } else { // year
                prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
                prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
            }
        } else { // rolling
            const duration = (endDate.getTime() - startDate.getTime());
            prevStartDate = new Date(startDate.getTime() - duration - 1);
            prevEndDate = new Date(endDate.getTime() - duration - 1);
        }
        const previousPeriodValue = getPeriodValue(prevStartDate, prevEndDate);

        // Year-over-Year
        let yoyStartDate = new Date(startDate);
        let yoyEndDate = new Date(endDate);
        yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1);
        yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1);
        const yearOverYearPreviousValue = getPeriodValue(yoyStartDate, yoyEndDate);

        return {
            periodOverPeriodData: { current: currentPeriodValue, previous: previousPeriodValue },
            yearOverYearData: { current: currentPeriodValue, previous: yearOverYearPreviousValue }
        };

    }, [viewMode, subMode, startDate, endDate, sessions, chartMetric, sessionsInPeriod]);

    const chartData = useMemo(() => {
        const aggregatedData: ChartDataPoint[] = [];
    
        if (viewMode === 'week') {
            const dayLabels = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                dayLabels.push({
                    key: formatDateId(d),
                    label: d.toLocaleDateString(settings.language, { weekday: 'short' }),
                    value: 0
                });
            }
            sessionsInPeriod.forEach(session => {
                const dayId = getStatisticalDateIdForSession(session);
                const dayData = dayLabels.find(d => d.key === dayId);
                if (dayData) {
                    dayData.value += getMetricForSession(session, chartMetric);
                }
            });
            return dayLabels;
        }
    
        if (viewMode === 'month') {
            const weeklyData = new Map<string, { value: number; label: string }>();
            sessionsInPeriod.forEach(session => {
                const date = new Date(getStatisticalDateIdForSession(session) + 'T12:00:00Z');
                const weekKey = getWeekId(date, settings.firstDayOfWeek);
                if (!weeklyData.has(weekKey)) {
                    weeklyData.set(weekKey, { value: 0, label: t('week') + ' ' + weekKey.split('-W')[1] });
                }
                weeklyData.get(weekKey)!.value += getMetricForSession(session, chartMetric);
            });
            return Array.from(weeklyData.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([key, data]) => ({ key, ...data }));
        }
    
        if (viewMode === 'year') {
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
                const d = new Date(startDate.getFullYear(), i, 1);
                return {
                    key: getMonthId(d),
                    label: d.toLocaleDateString(settings.language, { month: 'short' }),
                    value: 0
                };
            });
            sessionsInPeriod.forEach(session => {
                const date = new Date(getStatisticalDateIdForSession(session) + 'T12:00:00Z');
                const monthIndex = date.getMonth();
                monthlyData[monthIndex].value += getMetricForSession(session, chartMetric);
            });
            return monthlyData;
        }
        
        return aggregatedData;
    }, [sessionsInPeriod, viewMode, chartMetric, settings.language, t, startDate, settings.firstDayOfWeek]);
    
    const maxChartValue = Math.max(...chartData.map(d => d.value), 1);
    
    const handleNav = (direction: number) => {
        setDateOffset(prev => prev + direction);
        setSelectedBar(null);
    };

    const formatDuration = (totalSeconds: number) => {
        if (chartMetric === 'count') return totalSeconds.toString();
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (totalSeconds < 60) {
            return `<1m`;
        }
        if (hours === 0) {
            return `${minutes}m`;
        }
        return `${hours}h ${minutes}m`;
    };

    const formatAdjustment = (seconds: number): string => {
        if (seconds === 0) return '0s';
        const sign = seconds > 0 ? '+' : '-';
        const absSeconds = Math.abs(seconds);

        if (absSeconds < 60) {
            return `${sign}${absSeconds}s`;
        }
        const minutes = Math.floor(absSeconds / 60);
        const remainingSeconds = absSeconds % 60;
        if (remainingSeconds === 0) {
            return `${sign}${minutes}m`;
        }
        return `${sign}${minutes}m ${remainingSeconds}s`;
    };
    
    const chartMetricOptions: ChartMetric[] = ['net', 'actual', 'recorded', 'count'];

    return (
        <div className="stats-view">
            <div className="settings-section">
                <div className="stats-header">
                    <div className="stats-header-top-row">
                        <h2>{t('statsTitle')}</h2>
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto pb-2 -mx-6 px-6" role="toolbar" aria-label="Statistics controls">
                        <div className="flex items-center gap-2" role="group" aria-label={t('period')}>
                             {(['week', 'month', 'year', 'all'] as ViewMode[]).map(mode => (
                                <FilterChip 
                                    key={mode} 
                                    label={t(mode)}
                                    isSelected={viewMode === mode}
                                    onClick={() => { setViewMode(mode); setDateOffset(0); }}
                                />
                            ))}
                        </div>
                        
                        {viewMode !== 'all' && (
                           <>
                               <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" role="separator"></div>
                                <div className="flex items-center gap-2" role="group" aria-label={t('periodType')}>
                                    {(['natural', 'rolling'] as SubMode[]).map(mode => (
                                        <FilterChip 
                                            key={mode} 
                                            label={t(`${mode}Period`)}
                                            isSelected={subMode === mode}
                                            onClick={() => { setSubMode(mode); setDateOffset(0); }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" role="separator"></div>
                        <div className="flex items-center gap-2" role="group" aria-label={t('chartMetricTitle')}>
                            {chartMetricOptions.map(metric => (
                                <FilterChip 
                                    key={metric}
                                    label={t(`metric${metric.charAt(0).toUpperCase() + metric.slice(1)}`)}
                                    isSelected={chartMetric === metric}
                                    onClick={() => setChartMetric(metric)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {viewMode !== 'all' && (
                    <div className="stats-period-navigator">
                        <button onClick={() => handleNav(-1)} aria-label={t('previousPeriod')}>‹</button>
                        <span className="stats-period-label">{periodLabel}</span>
                        <button onClick={() => handleNav(1)} disabled={dateOffset === 0} aria-label={t('nextPeriod')}>›</button>
                    </div>
                )}
                
                <div className="stats-grid">
                     <div className="stat-item">
                        <div className="stat-value">{stats.sessionCount}</div>
                        <div className="stat-label">{t('sessionsCount')}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{formatDuration(stats.totalDuration)}</div>
                        <div className="stat-label">{t('focusTime')}</div>
                    </div>
                    {viewMode !== 'all' && (
                         <>
                            <ComparisonCard 
                                title={t('comparisonPeriodOverPeriod')}
                                currentValue={periodOverPeriodData.current}
                                previousValue={periodOverPeriodData.previous}
                                metric={chartMetric}
                            />
                            <ComparisonCard
                                title={t('comparisonYearOverYear')}
                                currentValue={yearOverYearData.current}
                                previousValue={yearOverYearData.previous}
                                metric={chartMetric}
                            />
                        </>
                    )}
                </div>

                {chartData.length > 0 && (
                    <div className="stats-chart-container">
                        <svg viewBox={`0 0 ${chartData.length * 50 + 20} ${CHART_HEIGHT}`} preserveAspectRatio="xMinYMax meet">
                            <g>
                                {chartData.map((d, i) => {
                                    const barHeight = d.value > 0 ? (d.value / maxChartValue) * CHART_DRAWABLE_HEIGHT : 0;
                                    const x = i * 50 + 10;
                                    const y = CHART_BASELINE_Y - barHeight;
                                    return (
                                        <g key={d.key} className="bar-group" onClick={() => setSelectedBar(d.key)}>
                                            <rect
                                                x={x + 5}
                                                y={y}
                                                width="30"
                                                height={barHeight}
                                                rx="4"
                                                className={`bar ${selectedBar === d.key ? 'selected' : ''}`}
                                            />
                                            {d.value > 0 && (
                                                <text x={x + 20} y={y - 5} className="bar-value">
                                                    {formatDuration(d.value)}
                                                </text>
                                            )}
                                            <text x={x + 20} y={CHART_BASELINE_Y + 15} className="bar-label">
                                                {d.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                )}

                <div className="session-list">
                    {sessionsInPeriod.length > 0 ? (
                        [...sessionsInPeriod].reverse().map(session => {
                            const totalAdjustment = session.totalAdjustment ?? session.adjustments?.reduce((sum, adj) => sum + adj.amount, 0) ?? 0;
                            const hasPauses = session.pauseCount && session.pauseCount > 0;
                            const hasAdjustments = totalAdjustment !== 0;
                            const showExtraInfo = hasPauses || hasAdjustments;

                            return (
                                <div key={session.id} className="session-item">
                                    <div className="session-header">
                                        <h3>{session.title}</h3>
                                        <span>{new Date(session.startTime).toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="session-details">
                                        <div className="session-detail-item">
                                            <div className="session-detail-label">{t('recordedDuration')}</div>
                                            <div className="session-detail-value">{formatDuration(session.recordedDuration)}</div>
                                        </div>
                                        <div className="session-detail-item">
                                            <div className="session-detail-label">{t('sessionMFT')}</div>
                                            <div className="session-detail-value">{t('sessionMFTValue', session.mft)}</div>
                                        </div>
                                    </div>
                                    {showExtraInfo && (
                                        <div className="session-extra-details">
                                            {session.netDuration != null && <span>{t('net')}: {formatDuration(session.netDuration)}</span>}
                                            <span>{t('actualDuration')}: {formatDuration(session.actualDuration)}</span>
                                            {hasPauses && <span>{t('pausedTime')}: {session.pauseCount}x</span>}
                                            {hasAdjustments && <span>{t('adjusted')}: {formatAdjustment(totalAdjustment)}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-sessions">{t('noSessionsMessage')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsView;