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
  AlertCircle
} from 'lucide-react';

export default function CalendarView() {
  const {
    tasks,
    openCreateModal,
    openEditModal,
    openAppleCalendar,
    subscribeWebcal,
    lastSyncTime,
  } = useTasks();

  const [currentDate, setCurrentDate] = useState(new Date());

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
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate grid calendar cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarCells.push({
      day: d,
      monthOffset: -1,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
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

  // Next month leading days to complete 35 or 42 cells grid
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      day: d,
      monthOffset: 1,
      dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="h-full flex-1 flex flex-col p-6 bg-slate-900/30 overflow-hidden">
      {/* Top Banner: Calendar Link Info */}
      <div className="mb-4 p-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              macOS Calendar Link Active
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal">
                Bi-Directional Feed
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Tasks created or scheduled here sync directly into your local Apple Calendar ("Task Flow" calendar).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAppleCalendar()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60"
          >
            <span>Open Apple Calendar</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => subscribeWebcal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow"
          >
            <span>WebCal 1-Click Feed</span>
          </button>
        </div>
      </div>

      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
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

      {/* Calendar Month Grid */}
      <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateString === todayStr;
          const isCurrentMonth = cell.monthOffset === 0;

          // Find tasks for this day
          const dayTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            return t.dueDate.startsWith(cell.dateString);
          });

          return (
            <div
              key={idx}
              onClick={() => openCreateModal({ dueDate: cell.dateString })}
              className={`min-h-[100px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                isToday
                  ? 'border-indigo-500/50 bg-indigo-950/20'
                  : isCurrentMonth
                  ? 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                  : 'border-slate-900/40 bg-slate-950/10 opacity-40 hover:opacity-70'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                    isToday
                      ? 'bg-indigo-600 text-white font-bold'
                      : isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {cell.day}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateModal({ dueDate: cell.dateString });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white transition-opacity"
                  title="Add task on this day"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Tasks mapped on this date */}
              <div className="space-y-1 overflow-y-auto max-h-[85px]">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(t);
                    }}
                    className={`text-[10px] px-2 py-1 rounded truncate border flex items-center justify-between gap-1 transition-all ${
                      t.status === 'done'
                        ? 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
                        : t.priority === 'urgent'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                        : t.priority === 'high'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    <span className="truncate">{t.title}</span>
                    {t.syncWithCalendar && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" title="Synced to iCal" />
                    )}
                  </div>
                ))}
              </div>

              <div className="text-[9px] text-slate-500 text-right mt-1">
                {dayTasks.length > 0 && `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
