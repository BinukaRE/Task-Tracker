import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Timer,
  Tag,
  CheckSquare,
  ArrowUpDown,
  Filter,
  CalendarDays,
  CalendarCheck,
  History,
  Sparkles
} from 'lucide-react';

export default function ListView() {
  const {
    filteredTasks,
    addTask,
    openEditModal,
    deleteTask,
    toggleTaskStatus,
    setCurrentView,
    setActivePomodoroTaskId,
  } = useTasks();

  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [quickCategory, setQuickCategory] = useState('Work');
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate' | 'priority' | 'title'
  const [sortAsc, setSortAsc] = useState(true);

  // Date Filtering Scope: default 'upcoming' (Current date & after dates only, removing before ones)
  const [dateScope, setDateScope] = useState('upcoming'); // 'upcoming' | 'today' | 'week' | 'month' | 'all' | 'past'
  const [includeUnscheduled, setIncludeUnscheduled] = useState(true);

  // Local date calculation helper (avoids UTC timezone shift issues)
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = getLocalDateString(nextWeek);

  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const nextMonthStr = getLocalDateString(nextMonth);

  // Statistics for scope badges
  const totalTasks = filteredTasks.length;
  const pastTasksCount = filteredTasks.filter(t => t.dueDate && t.dueDate < todayStr).length;
  const todayTasksCount = filteredTasks.filter(t => t.dueDate === todayStr).length;
  const upcomingTasksCount = filteredTasks.filter(t => !t.dueDate || t.dueDate >= todayStr).length;
  const weekTasksCount = filteredTasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr).length;

  // Filter tasks by date scope (Current date & after dates, removing past/before ones by default)
  const dateFilteredTasks = filteredTasks.filter((task) => {
    if (!task.dueDate) {
      return includeUnscheduled && (dateScope === 'upcoming' || dateScope === 'all');
    }

    if (dateScope === 'upcoming') {
      // CURRENT DATE (TODAY) AND AFTER DATES ONLY - REMOVES BEFORE ONES!
      return task.dueDate >= todayStr;
    }

    if (dateScope === 'today') {
      return task.dueDate === todayStr;
    }

    if (dateScope === 'week') {
      return task.dueDate >= todayStr && task.dueDate <= nextWeekStr;
    }

    if (dateScope === 'month') {
      return task.dueDate >= todayStr && task.dueDate <= nextMonthStr;
    }

    if (dateScope === 'past') {
      return task.dueDate < todayStr;
    }

    return true; // 'all'
  });

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    await addTask({
      title: quickTitle.trim(),
      dueDate: quickDueDate || todayStr,
      priority: quickPriority,
      category: quickCategory,
      syncWithCalendar: true,
      status: 'todo',
    });

    setQuickTitle('');
    setQuickDueDate('');
  };

  const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };

  const sortedTasks = [...dateFilteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      comparison = dateA - dateB;
    } else if (sortBy === 'priority') {
      comparison = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    }
    return sortAsc ? comparison : -comparison;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'low':
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700/60';
    }
  };

  const renderDateBadge = (dueDate) => {
    if (!dueDate) {
      return <span className="text-[11px] text-slate-500 font-mono">No Date</span>;
    }

    if (dueDate === todayStr) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Today</span>
        </span>
      );
    }

    if (dueDate === tomorrowStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <span>Tomorrow</span>
        </span>
      );
    }

    if (dueDate < todayStr) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
          title="Past Due / Previous Event"
        >
          <Clock className="w-3 h-3 text-rose-400" />
          <span>{dueDate}</span>
        </span>
      );
    }

    return (
      <div className="text-[11px] font-mono text-slate-300 flex items-center justify-end gap-1">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>{dueDate}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex-1 overflow-y-auto p-6 bg-slate-900/30 space-y-5">
      {/* Quick Add Form Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md shadow-sm"
      >
        <Plus className="w-4 h-4 text-indigo-400 ml-2" />
        <input
          type="text"
          placeholder="Add a new task... (e.g. Prepare quarterly performance metrics)"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none px-2"
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={quickDueDate}
            onChange={(e) => setQuickDueDate(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700/60 text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
          />

          <select
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700/60 text-slate-300 rounded-lg px-2 py-1 focus:outline-none capitalize"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700/60 text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value="Work">Work</option>
            <option value="Development">Development</option>
            <option value="Design">Design</option>
            <option value="Personal">Personal</option>
          </select>

          <button
            type="submit"
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Table / List Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md overflow-hidden">
        {/* Date Filter & Scope Controls Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Segmented Date Scopes */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setDateScope('upcoming')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateScope === 'upcoming'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show only tasks on current date and after dates (removes past ones)"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Current & Upcoming</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono text-cyan-300">
                {upcomingTasksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDateScope('today')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateScope === 'today'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Today</span>
              {todayTasksCount > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-mono">
                  {todayTasksCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setDateScope('week')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateScope === 'week'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Next 7 Days</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono text-slate-300">
                {weekTasksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDateScope('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateScope === 'month'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Next 30 Days</span>
            </button>

            <button
              type="button"
              onClick={() => setDateScope('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateScope === 'all'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all tasks including historical past ones"
            >
              <span>All ({totalTasks})</span>
            </button>
          </div>

          {/* Past Tasks Notification & Toggle */}
          {pastTasksCount > 0 && dateScope !== 'all' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>{pastTasksCount} past tasks removed</span>
              </span>
              <button
                type="button"
                onClick={() => setDateScope(dateScope === 'past' ? 'upcoming' : 'past')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  dateScope === 'past'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                {dateScope === 'past' ? '← Back to Upcoming' : 'View Past'}
              </button>
            </div>
          )}
        </div>

        {/* Table Controls Sub-Header */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/30">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span>
              {sortedTasks.length} {sortedTasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              ({dateScope === 'upcoming' ? 'Current & After' : dateScope.toUpperCase()})
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 text-slate-300 border border-slate-700/60 text-[11px] rounded-md px-2 py-1 focus:outline-none"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-700/60 text-slate-300 hover:bg-slate-800"
            >
              {sortAsc ? 'Ascending ↑' : 'Descending ↓'}
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/60">
          {sortedTasks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No tasks match your criteria. Add one above!
            </div>
          ) : (
            sortedTasks.map((task) => {
              const totalSub = task.subtasks ? task.subtasks.length : 0;
              const doneSub = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

              return (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between px-4 py-3 hover:bg-slate-900/60 transition-colors ${
                    task.status === 'done' ? 'bg-slate-950/20' : ''
                  }`}
                >
                  {/* Left: Checkbox + Title + Category + Subtask summary */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className="text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium text-slate-200 truncate cursor-pointer hover:text-indigo-300 ${
                            task.status === 'done' ? 'line-through text-slate-500' : ''
                          }`}
                          onClick={() => openEditModal(task)}
                        >
                          {task.title}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                          {task.category || 'General'}
                        </span>

                        {task.tags && task.tags.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {totalSub > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                          <CheckSquare className="w-3 h-3 text-slate-500" />
                          <span>
                            {doneSub}/{totalSub} subtasks completed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle / Right: Due Date + Calendar Sync + Priority + Action Buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Priority Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>

                    {/* Apple Calendar Badge */}
                    {task.syncWithCalendar ? (
                      <span
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono"
                        title="Synchronized with local Apple Calendar"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>iCal</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 px-2 py-0.5">Unsynced</span>
                    )}

                    {/* Due Date */}
                    <div className="text-right min-w-28 flex justify-end">
                      {renderDateBadge(task.dueDate)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setActivePomodoroTaskId(task.id);
                          setCurrentView('pomodoro');
                        }}
                        className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                        title="Start Focus Session"
                      >
                        <Timer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
