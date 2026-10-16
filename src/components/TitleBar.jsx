import React from 'react';
import { useTasks } from '../context/TaskContext';
import { Search, Plus, Calendar, RefreshCw, Radio, Sparkles } from 'lucide-react';

export default function TitleBar() {
  const {
    searchQuery,
    setSearchQuery,
    openCreateModal,
    syncAppleCalendar,
    isSyncing,
    setIsCalendarModalOpen,
    tasks,
  } = useTasks();

  const activeCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <header className="titlebar-drag-region h-14 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 sticky top-0">
      {/* Left traffic lights space & branding */}
      <div className="flex items-center gap-3 pl-18 titlebar-no-drag">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt="Task Flow Icon"
            className="w-6 h-6 rounded-lg shadow-md shadow-indigo-500/20 object-cover"
          />
          <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            Task Flow
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800/60 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{activeCount} active tasks</span>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <div className="flex-1 max-w-md mx-4 titlebar-no-drag">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks, tags, or categories (⌘K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg glass-input text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        {/* Calendar Sync Menu & Button */}
        <button
          onClick={() => syncAppleCalendar()}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/60 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition-all ${
            isSyncing ? 'opacity-70 cursor-wait' : ''
          }`}
          title="Sync directly with macOS Calendar"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync Calendar</span>
        </button>

        {/* Calendar Hub Modal Launcher */}
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all"
          title="Open Calendar Integration Hub"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Calendar Hub</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        {/* New Task Button */}
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}
