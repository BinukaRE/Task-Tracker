import React, { useState, useMemo } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Timer,
  GripVertical,
  Layers,
  Filter,
  CalendarCheck2,
  Sparkles,
  Flame,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';

const COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    accentColor: 'sky',
    dotClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
    headerBg: 'from-sky-500/10 via-sky-500/5 to-transparent',
    borderClass: 'border-sky-500/20',
    hoverBorder: 'hover:border-sky-500/40',
    badgeClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    cardBorderHover: 'group-hover:border-sky-500/40',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    accentColor: 'amber',
    dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse',
    headerBg: 'from-amber-500/10 via-amber-500/5 to-transparent',
    borderClass: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/40',
    badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    cardBorderHover: 'group-hover:border-amber-500/40',
  },
  {
    id: 'review',
    title: 'In Review',
    accentColor: 'purple',
    dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]',
    headerBg: 'from-purple-500/10 via-purple-500/5 to-transparent',
    borderClass: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/40',
    badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    cardBorderHover: 'group-hover:border-purple-500/40',
  },
  {
    id: 'done',
    title: 'Completed',
    accentColor: 'emerald',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    headerBg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    borderClass: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/40',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    cardBorderHover: 'group-hover:border-emerald-500/40',
  },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to get local YYYY-MM-DD
function toLocalDateStr(d) {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper to get start and end of week (Monday to Sunday)
function getWeekRange(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push(cur);
  }

  return {
    start: monday,
    end: sunday,
    startStr: toLocalDateStr(monday),
    endStr: toLocalDateStr(sunday),
    days,
  };
}

// Helper to get start and end of month
function getMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    startStr: toLocalDateStr(start),
    endStr: toLocalDateStr(end),
  };
}

// Helper to extract task start and end YYYY-MM-DD
function getTaskDateBounds(task) {
  let startStr = null;
  let endStr = null;

  if (task.dueDate) {
    startStr = task.dueDate.split('T')[0];
    endStr = startStr;
  }

  if (task.startTime) {
    try {
      const s = new Date(task.startTime);
      if (!isNaN(s.getTime())) {
        startStr = toLocalDateStr(s);
        if (!endStr) endStr = startStr;
      }
    } catch {}
  }

  if (task.endTime) {
    try {
      const e = new Date(task.endTime);
      if (!isNaN(e.getTime())) {
        endStr = toLocalDateStr(e);
        if (!startStr) startStr = endStr;
      }
    } catch {}
  }

  return { startStr, endStr };
}

// Check if task falls into Day, Week, Month, or All
function isTaskInTimeScope(task, scope, anchorDate, includeUnscheduled) {
  const { startStr, endStr } = getTaskDateBounds(task);

  if (!startStr) {
    return scope === 'all' || includeUnscheduled;
  }

  if (scope === 'all') return true;

  if (scope === 'day') {
    const target = toLocalDateStr(anchorDate);
    return target >= startStr && target <= (endStr || startStr);
  }

  if (scope === 'week') {
    const { startStr: weekStart, endStr: weekEnd } = getWeekRange(anchorDate);
    const taskEnd = endStr || startStr;
    return taskEnd >= weekStart && startStr <= weekEnd;
  }

  if (scope === 'month') {
    const { startStr: monthStart, endStr: monthEnd } = getMonthRange(anchorDate);
    const taskEnd = endStr || startStr;
    return taskEnd >= monthStart && startStr <= monthEnd;
  }

  return true;
}

export default function KanbanView() {
  const {
    filteredTasks,
    openCreateModal,
    openEditModal,
    updateTask,
    toggleTaskStatus,
    setCurrentView,
    setActivePomodoroTaskId,
  } = useTasks();

  // Time scope mode: 'day' | 'week' | 'month' | 'all'
  const [timeScope, setTimeScope] = useState('week');
  // Current anchor date (defaults to today)
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  // Option to include unscheduled tasks when viewing a specific day/week/month
  const [includeUnscheduled, setIncludeUnscheduled] = useState(false);

  // Drag and drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Today reference
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const anchorDateStr = useMemo(() => toLocalDateStr(anchorDate), [anchorDate]);

  // Week range for the active anchor date
  const weekInfo = useMemo(() => getWeekRange(anchorDate), [anchorDate]);
  // Month range for the active anchor date
  const monthInfo = useMemo(() => getMonthRange(anchorDate), [anchorDate]);

  // Filter tasks strictly according to the active time scope
  const scopedTasks = useMemo(() => {
    return filteredTasks.filter((task) =>
      isTaskInTimeScope(task, timeScope, anchorDate, includeUnscheduled)
    );
  }, [filteredTasks, timeScope, anchorDate, includeUnscheduled]);

  // Count unscheduled tasks that might be hidden
  const unscheduledCount = useMemo(() => {
    return filteredTasks.filter((t) => !t.dueDate && !t.startTime).length;
  }, [filteredTasks]);

  // Quick task counts for each day in the current week strip
  const weekDayTaskCounts = useMemo(() => {
    const counts = {};
    weekInfo.days.forEach((d) => {
      const dStr = toLocalDateStr(d);
      counts[dStr] = filteredTasks.filter((task) => {
        const { startStr, endStr } = getTaskDateBounds(task);
        if (!startStr) return false;
        return dStr >= startStr && dStr <= (endStr || startStr);
      }).length;
    });
    return counts;
  }, [filteredTasks, weekInfo]);

  // Navigation handlers
  const handlePrev = () => {
    setAnchorDate((prev) => {
      const d = new Date(prev);
      if (timeScope === 'day') {
        d.setDate(d.getDate() - 1);
      } else if (timeScope === 'week') {
        d.setDate(d.getDate() - 7);
      } else if (timeScope === 'month') {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setAnchorDate((prev) => {
      const d = new Date(prev);
      if (timeScope === 'day') {
        d.setDate(d.getDate() + 1);
      } else if (timeScope === 'week') {
        d.setDate(d.getDate() + 7);
      } else if (timeScope === 'month') {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  const handleDirectDatePick = (e) => {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      setAnchorDate(new Date(y, m - 1, d));
      if (timeScope === 'all') setTimeScope('day');
    }
  };

  const handleMove = (task, direction) => {
    const statusOrder = ['todo', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    let nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      updateTask(task.id, { status: statusOrder[nextIndex] });
    }
  };

  const handleStartFocus = (task) => {
    setActivePomodoroTaskId(task.id);
    setCurrentView('pomodoro');
  };

  // Helper for priority badge
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <Flame className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
            Low
          </span>
        );
    }
  };

  // Helper for event time formatting
  const formatEventTime = (task) => {
    if (task.startTime) {
      try {
        const s = new Date(task.startTime);
        if (!isNaN(s.getTime())) {
          const timeStr = s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          if (task.endTime) {
            const e = new Date(task.endTime);
            if (!isNaN(e.getTime())) {
              const endTimeStr = e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              return `${timeStr} – ${endTimeStr}`;
            }
          }
          return timeStr;
        }
      } catch {}
    }
    return null;
  };

  // Header period render helper
  const renderHeaderPeriod = () => {
    if (timeScope === 'day') {
      const isToday = anchorDateStr === todayStr;
      const formatted = anchorDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-slate-100">{formatted}</span>
          {isToday && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
              Today
            </span>
          )}
        </div>
      );
    }

    if (timeScope === 'week') {
      const startFmt = weekInfo.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFmt = weekInfo.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isCurrentWeek = todayStr >= weekInfo.startStr && todayStr <= weekInfo.endStr;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-slate-100">
            {startFmt} – {endFmt}
          </span>
          {isCurrentWeek && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
              This Week
            </span>
          )}
        </div>
      );
    }

    if (timeScope === 'month') {
      const curYear = anchorDate.getFullYear();
      const curMonth = anchorDate.getMonth();
      const isCurrentMonth = todayStr.startsWith(`${curYear}-${String(curMonth + 1).padStart(2, '0')}`);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner">
            <select
              value={curMonth}
              onChange={(e) => {
                const nextMonth = Number(e.target.value);
                setAnchorDate(new Date(curYear, nextMonth, 1));
              }}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx} className="bg-slate-900 text-slate-100">
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-600">/</span>
            <select
              value={curYear}
              onChange={(e) => {
                const nextYear = Number(e.target.value);
                setAnchorDate(new Date(nextYear, curMonth, 1));
              }}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-slate-100">
                  {y}
                </option>
              ))}
            </select>
          </div>
          {isCurrentMonth && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
              This Month
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-wide text-slate-100">All Tasks & Events</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/80">
          Full Timeline
        </span>
      </div>
    );
  };

  return (
    <div className="h-full flex-1 flex flex-col bg-slate-950/40 overflow-hidden">
      {/* Top Header Bar: Time Scope Segmented Control + Period Navigation + Actions */}
      <header className="p-3.5 sm:px-6 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 z-10">
        {/* Left: Time Scope Selector Pills (Segmented Control style) */}
        <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setTimeScope('day')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              timeScope === 'day'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Day</span>
          </button>

          <button
            onClick={() => setTimeScope('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              timeScope === 'week'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Week</span>
          </button>

          <button
            onClick={() => setTimeScope('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              timeScope === 'month'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>

          <button
            onClick={() => setTimeScope('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              timeScope === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
        </div>

        {/* Center: Period Navigator */}
        <div className="flex items-center gap-2">
          {timeScope !== 'all' && (
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {renderHeaderPeriod()}

          {timeScope !== 'all' && (
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Jump to Today Button */}
          {timeScope !== 'all' && (
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm"
            >
              Today
            </button>
          )}

          {/* Quick Date Picker Trigger */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={anchorDateStr}
              onChange={handleDirectDatePick}
              className="w-8 h-8 opacity-0 absolute inset-0 cursor-pointer z-10"
              title="Pick a specific date"
            />
            <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 text-slate-400 hover:text-indigo-400 transition-colors pointer-events-none shadow-sm">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Right: Counter badge, Unscheduled toggle, & New Task CTA */}
        <div className="flex items-center gap-2.5">
          {/* Total Tasks Count in current scope */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-inner">
            <span className="text-slate-400">Tasks:</span>
            <span className="font-bold text-indigo-400">{scopedTasks.length}</span>
          </div>

          {/* Unscheduled toggle (for Day, Week, Month) */}
          {timeScope !== 'all' && unscheduledCount > 0 && (
            <button
              onClick={() => setIncludeUnscheduled(!includeUnscheduled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shadow-sm ${
                includeUnscheduled
                  ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title={`${unscheduledCount} unscheduled task(s) in system`}
            >
              <Filter className="w-3 h-3" />
              <span>Unscheduled ({unscheduledCount})</span>
            </button>
          )}

          {/* Quick Add Task */}
          <button
            onClick={() =>
              openCreateModal({
                status: 'todo',
                dueDate: anchorDateStr || todayStr,
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* Interactive 7-Day Week Strip (Visible in 'day' and 'week' scope) */}
      {(timeScope === 'day' || timeScope === 'week') && (
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto">
          <div className="flex items-center justify-center gap-2.5 min-w-max mx-auto max-w-4xl">
            {weekInfo.days.map((dayObj) => {
              const dayStr = toLocalDateStr(dayObj);
              const isToday = dayStr === todayStr;
              const isSelectedDay = timeScope === 'day' && dayStr === anchorDateStr;
              const taskCount = weekDayTaskCounts[dayStr] || 0;
              const dayName = SHORT_DAYS[dayObj.getDay()];
              const dayNum = dayObj.getDate();

              return (
                <button
                  key={dayStr}
                  onClick={() => {
                    setAnchorDate(dayObj);
                    setTimeScope('day');
                  }}
                  className={`group flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[76px] rounded-2xl border transition-all duration-150 relative ${
                    isSelectedDay
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-400/80 text-white shadow-lg shadow-indigo-600/30 scale-[1.03] ring-2 ring-indigo-400/30'
                      : isToday
                      ? 'bg-slate-900/90 border-cyan-500/50 text-slate-200 hover:border-cyan-400 hover:bg-slate-850 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelectedDay ? 'text-indigo-100' : isToday ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" title="Today" />
                    )}
                  </div>

                  <span
                    className={`text-base font-extrabold my-0.5 transition-colors ${
                      isSelectedDay ? 'text-white' : 'text-slate-100'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <div className="mt-0.5 flex items-center">
                    {taskCount > 0 ? (
                      <span
                        className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] transition-colors ${
                          isSelectedDay
                            ? 'bg-white/20 text-white'
                            : isToday
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">-</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Board Columns Container */}
      <main className="flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="flex gap-5 min-w-[1020px] h-full items-start">
          {COLUMNS.map((column) => {
            const colTasks = scopedTasks.filter((t) => t.status === column.id);
            const isColumnHovered = dragOverColumnId === column.id;

            return (
              <section
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColumnId !== column.id) setDragOverColumnId(column.id);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(column.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverColumnId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
                  if (taskId) {
                    updateTask(taskId, { status: column.id });
                  }
                  setDraggingTaskId(null);
                  setDragOverColumnId(null);
                }}
                className={`flex-1 flex flex-col max-h-full rounded-2xl border transition-all duration-200 bg-slate-900/40 backdrop-blur-xl overflow-hidden ${
                  isColumnHovered
                    ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/25 shadow-[0_0_30px_rgba(99,102,241,0.25)] scale-[1.01]'
                    : `border-slate-800/80 ${column.hoverBorder}`
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 border-b ${column.borderClass} bg-gradient-to-b ${column.headerBg} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${column.dotClass}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {column.title}
                    </h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${column.badgeClass}`}>
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      openCreateModal({
                        status: column.id,
                        dueDate: anchorDateStr || todayStr,
                      })
                    }
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title={`Add task to ${column.title}`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {colTasks.length === 0 ? (
                    <div
                      className={`py-12 px-4 text-center rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                        isColumnHovered
                          ? 'border-indigo-400/80 bg-indigo-500/10 text-indigo-300'
                          : 'border-slate-800/60 bg-slate-950/20 text-slate-500'
                      }`}
                    >
                      {isColumnHovered ? (
                        <>
                          <Sparkles className="w-5 h-5 text-indigo-400 animate-bounce" />
                          <p className="text-xs font-medium text-indigo-300">Drop task here</p>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 mb-1">
                            <Layers className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-medium text-slate-400">No tasks in this column</p>
                          <p className="text-[11px] text-slate-500">Add or drag tasks here</p>
                        </>
                      )}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isDragging = draggingTaskId === task.id;
                      const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
                      const completedSubtasks = task.subtasks
                        ? task.subtasks.filter((s) => s.completed).length
                        : 0;
                      const timeFormatted = formatEventTime(task);

                      // Determine calendar origin tag if present
                      const calTag = (task.tags || []).find(
                        (t) => t !== 'AppleCalendar' && (t.includes('@') || t.includes('Event') || t.includes('University'))
                      );

                      const isDone = task.status === 'done';
                      const isDueToday = task.dueDate && task.dueDate === todayStr;
                      const isPastDue = !isDone && task.dueDate && task.dueDate < todayStr;

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverColumnId(null);
                          }}
                          className={`group relative rounded-xl border p-3.5 transition-all duration-200 select-none cursor-grab active:cursor-grabbing ${
                            isDragging
                              ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-950/30 scale-95 shadow-inner'
                              : 'border-slate-800/80 bg-slate-900/80 hover:bg-slate-850/90 hover:border-slate-700/80 shadow-md hover:shadow-xl hover:-translate-y-0.5'
                          } ${isDone ? 'opacity-70 bg-slate-900/50' : ''}`}
                          onClick={() => openEditModal(task)}
                        >
                          {/* Top Row: Category + Priority + Calendar Badge + Drag Grip */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/50">
                                {task.category || 'General'}
                              </span>
                              {getPriorityBadge(task.priority)}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(task.calendarEventUid ||
                                (task.tags && task.tags.includes('AppleCalendar')) ||
                                task.isCalendarScraped) && (
                                <div
                                  className="text-[10px] text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/25 font-medium max-w-[130px] truncate shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                                  title={`Apple Calendar: ${calTag || 'University Event'}`}
                                >
                                  <Calendar className="w-3 h-3 flex-shrink-0 text-cyan-400" />
                                  <span className="truncate">{calTag || 'Apple Cal'}</span>
                                </div>
                              )}
                              <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors cursor-grab" />
                            </div>
                          </div>

                          {/* Task Title & Status Toggle */}
                          <div className="flex items-start gap-2.5 mb-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskStatus(task.id);
                              }}
                              className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                              title={isDone ? 'Mark Incomplete' : 'Mark Complete'}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>

                            <h4
                              className={`text-xs font-semibold leading-relaxed transition-colors ${
                                isDone
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-100 group-hover:text-indigo-300'
                              } line-clamp-2`}
                            >
                              {task.title}
                            </h4>
                          </div>

                          {/* Description snippet */}
                          {task.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed pl-6.5">
                              {task.description}
                            </p>
                          )}

                          {/* Subtasks Progress */}
                          {totalSubtasks > 0 && (
                            <div className="mb-3 space-y-1.5 pl-6.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 font-medium text-slate-400">
                                  <CheckSquare className="w-3 h-3 text-slate-500" />
                                  Subtasks
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-slate-300">
                                  {completedSubtasks}/{totalSubtasks}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Card Footer: Due Date / Time & Action Buttons */}
                          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-800/70 text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {task.dueDate && (
                                <div
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                    isPastDue
                                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/25'
                                      : isDueToday
                                      ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                                      : 'text-slate-400 bg-slate-800/50'
                                  }`}
                                >
                                  {isPastDue ? (
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  <span>{isDueToday ? 'Today' : task.dueDate}</span>
                                </div>
                              )}

                              {timeFormatted && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-indigo-300 font-mono text-[9px] border border-indigo-500/20">
                                  {timeFormatted}
                                </span>
                              )}

                              {!task.dueDate && !task.startTime && (
                                <span className="text-slate-500 italic">No date</span>
                              )}
                            </div>

                            {/* Actions: Pomodoro timer, Move Left, Move Right */}
                            <div
                              className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Focus Session Button */}
                              <button
                                onClick={() => handleStartFocus(task)}
                                className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 transition-colors"
                                title="Start Focus Session"
                              >
                                <Timer className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Left */}
                              {column.id !== 'todo' && (
                                <button
                                  onClick={() => handleMove(task, -1)}
                                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                  title="Move to Previous Column"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Move Right */}
                              {column.id !== 'done' && (
                                <button
                                  onClick={() => handleMove(task, 1)}
                                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                  title="Move to Next Column"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
