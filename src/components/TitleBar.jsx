import React from 'react';
import { useTasks } from '../context/TaskContext';
import { Search, Plus, Calendar, RefreshCw, Radio, Sparkles } from 'lucide-react';
import appIcon from '../assets/icon.png';

export default function TitleBar() {
  const {
    searchQuery,
    setSearchQuery,
    openCreateModal,
    scrapeCalendarEvents,
    isScraping,
    setIsCalendarModalOpen,
    tasks,
    autoSyncState,
  } = useTasks();

  const activeCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <header className="titlebar-drag-region h-14 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 sticky top-0">
      {/* Left traffic lights space & branding */}
      <div className="flex items-center gap-3 pl-18 titlebar-no-drag">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 p-1 border border-slate-800 shadow-sm flex items-center justify-center flex-shrink-0">
            <img
              src={appIcon}
              alt="Task Tracker Icon"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow"
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            Task Tracker
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
        {/* 10-Minute Auto-Sync Live Status Pill */}
        <div
          onClick={() => setIsCalendarModalOpen(true)}
          className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium cursor-pointer hover:bg-emerald-900/30 transition-all shadow-sm"
          title={`10-Minute Auto-Sync Engine Active. Last Sync: ${
            autoSyncState?.lastSyncTime
              ? new Date(autoSyncState.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recent'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Auto-Sync 10m</span>
        </div>

        {/* Scrape All Calendar Events Button */}
        <button
          onClick={() => scrapeCalendarEvents({ pastDays: 180, rangeDays: 180 })}
          disabled={isScraping}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/60 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition-all ${
            isScraping ? 'opacity-80 cursor-wait bg-cyan-950/40 border-cyan-500/40 text-cyan-300' : ''
          }`}
          title="Deep Scrape all events from Apple Calendar (Past 180 Days + Next 180 Days)"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScraping ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isScraping ? 'Scraping All Events...' : 'Scrape All Events'}
          </span>
        </button>

        {/* Calendar Scraper Hub Modal Launcher */}
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all"
          title="Open Calendar Event Scraper"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Calendar Scraper</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
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
