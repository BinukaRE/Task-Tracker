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
  const { currentView, syncNotice } = useTasks();

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

          {/* Sync Notice Toast */}
          {syncNotice && (
            <div className="absolute bottom-5 right-5 z-40 max-w-sm rounded-xl p-3.5 shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-start gap-3 bg-slate-900/90 border-slate-700/80">
              {syncNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : syncNotice.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-semibold text-slate-100">{syncNotice.message}</div>
                {syncNotice.details && (
                  <div className="text-[11px] text-slate-400 mt-0.5">{syncNotice.details}</div>
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
