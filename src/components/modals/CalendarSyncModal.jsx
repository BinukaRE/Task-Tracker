import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  X,
  Calendar,
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Radio,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Laptop
} from 'lucide-react';

export default function CalendarSyncModal() {
  const {
    isCalendarModalOpen,
    setIsCalendarModalOpen,
    syncAppleCalendar,
    openAppleCalendar,
    subscribeWebcal,
    exportIcs,
    isSyncing,
    serverInfo,
    lastSyncTime,
    tasks,
  } = useTasks();

  const [copied, setCopied] = useState(false);

  if (!isCalendarModalOpen) return null;

  const handleCopyUrl = () => {
    if (serverInfo?.webcalUrl) {
      navigator.clipboard.writeText(serverInfo.webcalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const syncedCount = tasks.filter(t => t.syncWithCalendar && t.dueDate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                macOS Calendar Integration Hub
              </h3>
              <p className="text-xs text-slate-400">
                Synchronize your tasks directly with Apple Calendar (iCal)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCalendarModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Status Card */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Sync Engine Active
                </span>
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">{syncedCount}</span> tasks ready to sync to your local calendar.
              </div>
              <div className="text-[11px] text-slate-400">
                {lastSyncTime
                  ? `Last AppleScript sync: ${new Date(lastSyncTime).toLocaleTimeString()}`
                  : 'Ready for initial synchronization'}
              </div>
            </div>

            <button
              onClick={() => syncAppleCalendar()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Option 1: Direct AppleScript Sync */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  Method 1: Direct macOS Calendar App Sync
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                Native AppleScript
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly creates and maintains a dedicated <strong>"Task Flow"</strong> calendar inside your macOS Calendar app. Events update with descriptions, subtasks, priorities, and alarms.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => syncAppleCalendar()}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow"
              >
                Push Tasks to Apple Calendar
              </button>
              <button
                onClick={() => openAppleCalendar()}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              >
                <span>Launch App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Option 2: Live WebCal Subscription */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  Method 2: Live WebCal Subscription Feed (Recommended)
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                Auto-Refresh
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apple Calendar subscribes to a local live feed. Any time you change, add, or complete tasks, your calendar refreshes seamlessly. Also syncs across devices via iCloud Calendar!
            </p>

            {/* 1-Click Subscribe Button */}
            <button
              onClick={() => subscribeWebcal()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Subscribe in Apple Calendar</span>
            </button>

            {/* URL input */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Feed URL (for manual subscription):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={serverInfo?.webcalUrl || 'webcal://localhost:52884/calendar.ics'}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg glass-input text-slate-300 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700/60 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Option 3: Export .ics File */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  Method 3: Export Standalone .ics File
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all tasks into a standard RFC 5545 iCalendar (<code className="text-indigo-300">.ics</code>) file to double-click and import directly into Apple Calendar, Google Calendar, or Outlook.
            </p>
            <button
              onClick={() => exportIcs()}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export iCalendar (.ics)</span>
            </button>
          </div>

          {/* Permissions Help Note */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-2.5 text-[11px] text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>macOS Permission Tip:</strong> If macOS asks for calendar permissions when syncing via AppleScript, click "Allow". Alternatively, the <strong>WebCal Live Feed</strong> works completely without AppleScript permissions!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end">
          <button
            onClick={() => setIsCalendarModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
