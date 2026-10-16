import React from 'react';
import { useTasks } from '../context/TaskContext';
import {
  Columns3,
  ListTodo,
  CalendarDays,
  Timer,
  BarChart3,
  Calendar,
  ExternalLink,
  CheckCircle2,
  FolderOpen,
  Filter,
  Zap
} from 'lucide-react';

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    selectedCategory,
    setSelectedCategory,
    selectedPriority,
    setSelectedPriority,
    categories,
    tasks,
    openAppleCalendar,
    scrapeCalendarEvents,
    isScraping,
    setIsCalendarModalOpen,
    lastScrapeTime,
  } = useTasks();

  const navItems = [
    { id: 'kanban', label: 'Kanban Board', icon: Columns3, count: tasks.filter(t => t.status !== 'done').length },
    { id: 'list', label: 'List View', icon: ListTodo, count: tasks.length },
    { id: 'calendar', label: 'Calendar View', icon: CalendarDays },
    { id: 'pomodoro', label: 'Focus Timer', icon: Timer },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const priorities = ['All', 'urgent', 'high', 'medium', 'low'];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 flex flex-col justify-between select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Views
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Categories / Projects Filter */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3" />
              Categories
            </span>
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              const count = cat === 'All' ? tasks.length : tasks.filter(t => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cat === 'Work'
                          ? 'bg-blue-400'
                          : cat === 'Development'
                          ? 'bg-emerald-400'
                          : cat === 'Design'
                          ? 'bg-pink-400'
                          : cat === 'Personal'
                          ? 'bg-amber-400'
                          : 'bg-indigo-400'
                      }`}
                    />
                    <span>{cat}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Priority
            </span>
          </div>
          <div className="flex flex-wrap gap-1 px-2">
            {priorities.map((pri) => {
              const isActive = selectedPriority === pri;
              return (
                <button
                  key={pri}
                  onClick={() => setSelectedPriority(pri)}
                  className={`text-[11px] px-2.5 py-1 rounded-md capitalize transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-900/40 hover:bg-slate-900'
                  }`}
                >
                  {pri}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Local Calendar Integration Widget */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-slate-900/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Apple Calendar</div>
                <div className="text-[10px] text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Read-Only Scraper
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
              title="Open Calendar Scraper & Manual"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-slate-400 mb-2.5">
            {lastScrapeTime
              ? `Last scraped: ${new Date(lastScrapeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Pulls events from Apple Calendar'}
          </div>

          <button
            onClick={() => scrapeCalendarEvents()}
            disabled={isScraping}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition-all active:scale-95 mb-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Scraping Events...' : 'Scrape Calendar Events'}</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => openAppleCalendar()}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 transition-all border border-slate-700/50"
            >
              <span>Open App</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-[11px] font-medium text-indigo-300 transition-all border border-indigo-500/30"
              title="View Scraper details & Manual"
            >
              <span>Manual</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
