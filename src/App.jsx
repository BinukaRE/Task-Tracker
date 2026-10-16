import React from 'react';
import { TaskProvider, useTasks } from './context/TaskContext';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import KanbanView from './components/views/KanbanView';
import ListView from './components/views/ListView';
import CalendarView from './components/views/CalendarView';
import PomodoroView from './components/views/PomodoroView';
import AnalyticsView from './components/views/AnalyticsView';
import TaskModal from './components/modals/TaskModal';
import CalendarSyncModal from './components/modals/CalendarSyncModal';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

function MainLayout() {
  const { currentView, scrapeNotice, syncNotice, clearScrapeNotice, openPrivacySettings } = useTasks();
  const notice = scrapeNotice || syncNotice;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Frameless macOS Titlebar */}
      <TitleBar />

      {/* Main Workspace Container */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Active View */}
          {currentView === 'kanban' && <KanbanView />}
          {currentView === 'list' && <ListView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'pomodoro' && <PomodoroView />}
          {currentView === 'analytics' && <AnalyticsView />}

          {/* Scrape Notice Toast */}
          {notice && (
            <div className={`absolute bottom-5 right-5 z-40 max-w-md rounded-xl p-4 shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-start gap-3 ${
              notice.isPermissionError || notice.type === 'permission_error'
                ? 'bg-amber-950/95 border-amber-600/60 shadow-amber-950/50'
                : notice.type === 'success'
                ? 'bg-slate-900/95 border-emerald-600/50'
                : 'bg-slate-900/95 border-slate-700/80'
            }`}>
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (notice.isPermissionError || notice.type === 'permission_error' || notice.type === 'warning') ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-100 flex items-center justify-between">
                  <span>{notice.message}</span>
                  {clearScrapeNotice && (
                    <button
                      onClick={clearScrapeNotice}
                      className="text-slate-400 hover:text-white p-0.5 -mr-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {notice.details && (
                  <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{notice.details}</div>
                )}
                {(notice.isPermissionError || notice.type === 'permission_error') && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => openPrivacySettings('automation')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm transition-colors"
                    >
                      Open macOS System Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <TaskModal />
      <CalendarSyncModal />
    </div>
  );
}

export default function App() {
  return (
    <TaskProvider>
      <MainLayout />
    </TaskProvider>
  );
}
