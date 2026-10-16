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
  Laptop,
  BookOpen,
  ArrowDownToLine,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';

export default function CalendarSyncModal() {
  const {
    isCalendarModalOpen,
    setIsCalendarModalOpen,
    syncAppleCalendar,
    connectCalendar,
    importIcsToCalendar,
    scrapeNewCalendarEvents,
    openAppleCalendar,
    subscribeWebcal,
    exportIcs,
    isSyncing,
    serverInfo,
    lastSyncTime,
    tasks,
  } = useTasks();

  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'manual'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Apple Calendar Integration & Manual
              </h3>
              <p className="text-xs text-slate-400">
                Connect, synchronize, and scrape events with macOS Calendar
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCalendarModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-800/60">
          <button
            onClick={() => setActiveTab('hub')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hub'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Connection & Scraper Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Calendar User Manual</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">Guide</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {activeTab === 'hub' ? (
            <>
              {/* Status & 1-Click Connect Header */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Sync Engine Ready
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">{syncedCount}</span> tasks active for calendar sync.
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lastSyncTime
                      ? `Last sync: ${new Date(lastSyncTime).toLocaleTimeString()}`
                      : 'Feed active on port 52884'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => connectCalendar()}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>1-Click Connect Calendar</span>
                  </button>
                </div>
              </div>

              {/* Scrape New Calendar Events Section */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-slate-200">
                      Scrape New Events from Apple Calendar
                    </h4>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    <Lock className="w-3 h-3" />
                    Edits Rejected
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Imports <strong>brand-new events</strong> created in Apple Calendar directly into Task Flow as new tasks.
                </p>

                {/* Data Integrity Callout */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">Strict Data Protection Policy:</strong> Task Flow only scrapes <em>new</em> events. Any external edits made in Apple Calendar to existing tasks are <strong>strictly discarded</strong> to keep your Task Flow checklists, status, and notes authoritative and uncorrupted.
                  </div>
                </div>

                <button
                  onClick={() => scrapeNewCalendarEvents()}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  <ArrowDownToLine className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Scraping Calendar...' : 'Scrape New Events from Calendar'}</span>
                </button>
              </div>

              {/* Live WebCal Subscription */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-slate-200">
                      Live WebCal Feed (Auto-Updates Everywhere)
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Subscribing links your Calendar directly to Task Flow. Any changes made in Task Flow immediately reflect on your Mac, iPhone, and iPad via iCloud Calendar.
                </p>

                {/* Subscription Notice */}
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Subscription Location Tip:</strong> When Apple Calendar's prompt opens, make sure to set <strong>Location: "On My Mac"</strong> (not iCloud). Apple's cloud servers cannot connect to local computer ports.
                  </div>
                </div>

                <button
                  onClick={() => subscribeWebcal()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Subscribe in Apple Calendar (Set Location: "On My Mac")</span>
                </button>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Feed URL:
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

              {/* 1-Click Native Import Card (Guaranteed Zero-Error Import) */}
              <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-100">
                      1-Click Native Import to Apple Calendar (Guaranteed)
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Instant & Works in iCloud
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bypasses all WebCal subscription errors! Opens Apple Calendar with a pre-built <code className="text-indigo-300">.ics</code> package. Simply click <strong>"Add"</strong> in the Apple Calendar popup, and every task is added into your calendar.
                </p>
                <button
                  onClick={() => importIcsToCalendar()}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  <span>1-Click Import All Tasks into Apple Calendar</span>
                </button>
              </div>

              {/* Direct AppleScript Sync & App Launch */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-200">
                      Direct Push to Calendar App
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pushes your tasks directly into a dedicated <strong>"Task Flow"</strong> calendar inside Apple Calendar with alarms and descriptions.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => syncAppleCalendar()}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow"
                  >
                    Push Tasks to Calendar
                  </button>
                  <button
                    onClick={() => openAppleCalendar()}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
                  >
                    <span>Open Calendar App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Standalone Export */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <span className="text-xs text-slate-400">Need a standalone calendar file?</span>
                <button
                  onClick={() => exportIcs()}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .ics</span>
                </button>
              </div>
            </>
          ) : (
            /* USER MANUAL TAB */
            <div className="space-y-5 text-slate-300 text-xs leading-relaxed">
              {/* Section 1: Overview */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Task Flow Calendar User Manual
                </h4>
                <p className="text-slate-300">
                  Welcome to the Task Flow calendar integration guide. This manual explains how the calendar synchronization engine works, how to connect your Apple Calendar app, and how data flow is protected.
                </p>
              </div>

              {/* Section 2: Core Data Policy */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Data Flow & Integrity Policy (Important)
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Task Flow is the Source of Truth:</strong> Your tasks, priorities, checklists, and notes belong to Task Flow. They are pushed to Apple Calendar so you can see them on your timeline.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Scraping New Events Only:</strong> When you click "Scrape New Events", Task Flow searches your Apple Calendar for new events you created (meetings, personal events) and converts them into tasks in Task Flow.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Calendar Edits Are NOT Accepted:</strong> If you modify an existing task's event in Apple Calendar (e.g. rename it, edit notes, or alter times), Task Flow <strong>rejects and ignores</strong> those edits. This ensures that external calendar apps cannot corrupt or erase your Task Flow subtasks, progress, or priority settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Connection Methods */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Step-by-Step Connection Instructions
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h5 className="font-semibold text-white mb-1">Method A: 1-Click Connect (Easiest)</h5>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Click the <strong className="text-slate-200">"1-Click Connect Calendar"</strong> button.</li>
                      <li>Apple Calendar will automatically open with a prompt asking: <em>"Subscribe to calendar: Task Flow?"</em></li>
                      <li>Click <strong className="text-slate-200">Subscribe</strong>.</li>
                      <li>In the dialog, choose your desired auto-refresh frequency (e.g., <strong>Every 15 minutes</strong> or <strong>Every hour</strong>) and set location to <strong>iCloud</strong> to sync across your iPhone and iPad!</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h5 className="font-semibold text-white mb-1">Method B: Direct AppleScript Sync</h5>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Click <strong className="text-slate-200">"Push Tasks to Calendar"</strong>.</li>
                      <li>If macOS displays a permission prompt asking: <em>"Task Flow wants to access Calendars"</em>, click <strong className="text-slate-200">Allow / OK</strong>.</li>
                      <li>A dedicated <strong className="text-indigo-300">"Task Flow"</strong> calendar will appear in Apple Calendar with all scheduled tasks and alerts.</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <h5 className="font-semibold text-white mb-1">Method C: Scrape Events from Apple Calendar</h5>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Add any new event or meeting in Apple Calendar (e.g. "Dentist Appointment" or "Client Sync").</li>
                      <li>In Task Flow, click <strong className="text-cyan-300">"Scrape New Events from Calendar"</strong>.</li>
                      <li>The new event is automatically imported as a task in Task Flow!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Section 4: Mobile & iCloud Sync */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  Syncing with iPhone & iPad via iCloud
                </h4>
                <p className="text-slate-400">
                  When subscribing to the Task Flow WebCal calendar in Apple Calendar on your Mac, select <strong>Location: iCloud</strong> in the subscription settings. The calendar and all its task reminders will automatically sync across your Apple Watch, iPhone, and iPad!
                </p>
              </div>

              {/* Section 5: Troubleshooting */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  macOS Permissions Troubleshooting
                </h4>
                <p className="text-slate-400">
                  If AppleScript synchronization is ever blocked:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Open macOS <strong className="text-slate-200">System Settings</strong>.</li>
                  <li>Navigate to <strong className="text-slate-200">Privacy & Security → Calendars</strong>.</li>
                  <li>Ensure <strong className="text-slate-200">Task Flow</strong> has calendar access enabled.</li>
                  <li>Alternatively, use the <strong>WebCal 1-Click Subscription</strong> which never requires AppleScript accessibility permissions.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Task Flow authoritative mode active</span>
          </div>

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
