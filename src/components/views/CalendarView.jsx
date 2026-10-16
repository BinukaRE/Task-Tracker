import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Sliders,
  CalendarDays,
  X,
  BookOpen
} from 'lucide-react';

export default function CalendarView() {
  const {
    tasks,
    openCreateModal,
    openEditModal,
    openAppleCalendar,
    scrapeCalendarEvents,
    isScraping,
    lastScrapeTime,
    autoSyncState,
    forceAutoRefresh,
    setIsCalendarModalOpen,
  } = useTasks();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  const handleMonthChange = (newMonth) => {
    setCurrentDate(new Date(year, Number(newMonth), 1));
  };

  const handleYearChange = (newYear) => {
    setCurrentDate(new Date(Number(newYear), month, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to check if a task occurs on a given date (with multi-day span support)
  const isTaskOnDate = (task, dateString) => {
    if (!task) return false;
    const taskDue = task.dueDate ? task.dueDate.split('T')[0] : null;
    if (taskDue === dateString) return true;

    if (task.startTime) {
      try {
        const start = new Date(task.startTime);
        if (!isNaN(start.getTime())) {
          const startDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
          if (startDateStr === dateString) return true;

          if (task.endTime) {
            const end = new Date(task.endTime);
            if (!isNaN(end.getTime())) {
              const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
              if (dateString >= startDateStr && dateString <= endDateStr) {
                return true;
              }
            }
          }
        }
      } catch {}
    }
    return false;
  };

  // Helper to format event time
  const formatEventTime = (task) => {
    if (!task.startTime) return null;
    try {
      const d = new Date(task.startTime);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  // Count total Apple Calendar events in Task Flow
  const appleCalendarTasks = tasks.filter(
    (t) => t.calendarEventUid || t.isCalendarScraped || (t.tags && t.tags.includes('AppleCalendar'))
  );

  // Generate grid calendar cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    calendarCells.push({
      day: d,
      monthOffset: -1,
      dateString: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      monthOffset: 0,
      dateString: dateStr,
    });
  }

  // Next month leading days to complete grid
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    calendarCells.push({
      day: d,
      monthOffset: 1,
      dateString: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Tasks for the selected date drawer
  const selectedDateTasks = tasks.filter((t) => isTaskOnDate(t, selectedDateStr));

  return (
    <div className="h-full flex-1 flex flex-col p-6 bg-slate-900/30 overflow-hidden">
      {/* Top Banner: Apple Calendar Live Integration */}
      <div className="mb-4 p-3.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/70 to-cyan-950/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Apple Calendar Link Active</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                10m Auto-Refresh
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {appleCalendarTasks.length} Events Linked
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Continuously imports events from Apple Calendar (Academic & Personal) and maps them to your schedule.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scrapeCalendarEvents({ rangeDays: 180, pastDays: 180 })}
            disabled={isScraping || autoSyncState?.isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
            title="Scrape all new events from Apple Calendar now (past 180d + next 180d)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isScraping || autoSyncState?.isSyncing) ? 'animate-spin' : ''}`} />
            <span>{(isScraping || autoSyncState?.isSyncing) ? 'Updating...' : 'Update from Apple Calendar'}</span>
          </button>

          <button
            onClick={() => openAppleCalendar()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60"
            title="Open macOS Calendar.app"
          >
            <span>Calendar.app</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setIsCalendarModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title="Calendar Link Settings & Manual"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Navigation & Controls Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-2.5 py-1 text-sm font-bold text-slate-100 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none cursor-pointer"
            >
              {monthNames.map((mName, idx) => (
                <option key={idx} value={idx}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-2 py-1 text-sm font-bold text-slate-100 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none cursor-pointer"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Main Calendar Body: Grid + Selected Day Inspector */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Calendar Month Grid */}
        <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto pr-1">
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateString === todayStr;
            const isCurrentMonth = cell.monthOffset === 0;
            const isSelected = cell.dateString === selectedDateStr;

            // Find tasks/events for this day
            const dayTasks = tasks.filter((t) => isTaskOnDate(t, cell.dateString));
            const calEventsCount = dayTasks.filter(
              (t) => t.calendarEventUid || t.isCalendarScraped || (t.tags && t.tags.includes('AppleCalendar'))
            ).length;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDateStr(cell.dateString)}
                className={`min-h-[105px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                  isSelected
                    ? 'ring-2 ring-cyan-500/70 border-cyan-400 bg-cyan-950/20 shadow-md'
                    : isToday
                    ? 'border-indigo-500/60 bg-indigo-950/20'
                    : isCurrentMonth
                    ? 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'border-slate-900/40 bg-slate-950/10 opacity-40 hover:opacity-70'
                }`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-mono font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold shadow'
                          : isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {calEventsCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title={`${calEventsCount} Apple Calendar Event(s)`} />
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateModal({ dueDate: cell.dateString });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="Add task on this day"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Tasks & Events mapped on this date */}
                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayTasks.map((t) => {
                    const isAppleCal = t.calendarEventUid || t.isCalendarScraped || (t.tags && t.tags.includes('AppleCalendar'));
                    const eventTime = formatEventTime(t);

                    return (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(t);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate border flex items-center justify-between gap-1 transition-all ${
                          t.status === 'done'
                            ? 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                            : isAppleCal
                            ? 'bg-cyan-950/50 text-cyan-200 border-cyan-500/30 hover:border-cyan-400'
                            : t.priority === 'urgent'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                            : t.priority === 'high'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                            : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
                        }`}
                        title={`${t.title}${eventTime ? ` (${eventTime})` : ''}${isAppleCal ? ' [Apple Calendar]' : ''}`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {isAppleCal && <CalendarIcon className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />}
                          {eventTime && <span className="text-[9px] text-cyan-300 font-mono flex-shrink-0">{eventTime}</span>}
                          <span className="truncate">{t.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] text-slate-500 text-right mt-1 flex items-center justify-between">
                  {calEventsCount > 0 && (
                    <span className="text-cyan-400/80 font-mono text-[9px] flex items-center gap-0.5">
                      <CalendarIcon className="w-2.5 h-2.5" />
                      {calEventsCount}
                    </span>
                  )}
                  <span className="ml-auto">
                    {dayTasks.length > 0 && `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Inspector Side Drawer */}
        {selectedDateStr && (
          <div className="w-80 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-4 flex flex-col justify-between overflow-hidden shadow-xl animate-in slide-in-from-right-4 duration-150">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Selected Schedule
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                </div>

                <button
                  onClick={() => openCreateModal({ dueDate: selectedDateStr })}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Task list for this day */}
              <div className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {selectedDateTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-xl space-y-1">
                    <CalendarDays className="w-6 h-6 text-slate-600 mx-auto" />
                    <div>No events on this day</div>
                    <div className="text-[10px] text-slate-600">Click Add to schedule a new task</div>
                  </div>
                ) : (
                  selectedDateTasks.map((task) => {
                    const isAppleCal = task.calendarEventUid || task.isCalendarScraped || (task.tags && task.tags.includes('AppleCalendar'));
                    const eventTime = formatEventTime(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => openEditModal(task)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                          isAppleCal
                            ? 'border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-400'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {task.category || 'General'}
                          </span>

                          {isAppleCal && (
                            <span className="text-[10px] font-medium text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                              <CalendarIcon className="w-2.5 h-2.5" />
                              Apple Calendar
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-200 mt-1 line-clamp-2">
                          {task.title}
                        </h4>

                        {eventTime && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 mt-1.5">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{eventTime}</span>
                          </div>
                        )}

                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{selectedDateTasks.length} event(s) scheduled</span>
              <button
                onClick={() => openAppleCalendar()}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Calendar.app</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
