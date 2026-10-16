import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  X,
  Calendar,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  ArrowDownToLine,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info
} from 'lucide-react';

export default function CalendarSyncModal() {
  const {
    isCalendarModalOpen,
    setIsCalendarModalOpen,
    scrapeCalendarEvents,
    openAppleCalendar,
    isScraping,
    lastScrapeTime,
    tasks,
    scrapeStats,
    calendarPermission,
    checkCalendarPermission,
    openPrivacySettings,
  } = useTasks();

  const [activeTab, setActiveTab] = useState('scraper'); // 'scraper' | 'manual'
  const [rangeDays, setRangeDays] = useState(30);

  if (!isCalendarModalOpen) return null;

  const scrapedTasksCount = tasks.filter(t => t.calendarEventUid || (t.tags && t.tags.includes('AppleCalendar'))).length;

  const handleScrape = () => {
    scrapeCalendarEvents({ rangeDays: Number(rangeDays) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Apple Calendar Scraper & Manual
              </h3>
              <p className="text-xs text-slate-400">
                Read-only event scraper from macOS Apple Calendar (Calendar.app)
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
            onClick={() => setActiveTab('scraper')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'scraper'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Event Scraper</span>
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
            <span>User Manual & Policies</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {activeTab === 'scraper' ? (
            <>
              {/* Strict Read-Only Guarantee Banner */}
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-slate-900/50 to-indigo-950/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-cyan-200 flex items-center gap-2">
                    <span>100% Read-Only Scraper Guarantee</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal">
                      Zero Edits to Calendar
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    This system <strong>only scrapes events</strong> from your Apple Calendar. It <strong>never creates, edits, modifies, or deletes</strong> anything in your Apple Calendar. Your native calendar remains completely untouched.
                  </p>
                </div>
              </div>

              {/* macOS Permission Diagnostic Card (Shows only if permission is not yet granted) */}
              {calendarPermission?.checked && !calendarPermission?.authorized && (
                <div className="p-4 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900/80 to-amber-950/30 flex items-start gap-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-2.5 flex-1">
                    <div className="font-bold text-amber-200 flex items-center justify-between">
                      <span className="text-sm">macOS Calendar Permission Required</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Access Blocked
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      macOS prevented Task Flow from reading your Apple Calendar (Error -1743). Because macOS protects calendars with Privacy & Security permissions, you need to grant access:
                    </p>
                    <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div>1. Click <strong>Open macOS Settings</strong> below.</div>
                      <div>2. Under <strong>Automation</strong>, find <strong>Task Flow</strong> (or <strong>Electron</strong>).</div>
                      <div>3. Toggle <strong>Calendar</strong> to <strong className="text-emerald-400">ON</strong>.</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => openPrivacySettings('automation')}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open macOS Settings</span>
                      </button>
                      <button
                        onClick={() => checkCalendarPermission()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Check Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scrape Controls Card */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-slate-200">
                      Scrape New Events into Task Flow
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {scrapedTasksCount} imported tasks
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Scrape Range (Past 7 Days + Ahead):
                    </label>
                    <select
                      value={rangeDays}
                      onChange={(e) => setRangeDays(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg glass-input text-slate-200 focus:outline-none"
                    >
                      <option value={7}>Next 7 Days</option>
                      <option value={14}>Next 14 Days</option>
                      <option value={30}>Next 30 Days (Recommended)</option>
                      <option value={60}>Next 60 Days</option>
                      <option value={90}>Next 90 Days</option>
                      <option value={180}>Next 6 Months</option>
                      <option value={365}>Next 1 Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Target App Status:
                    </label>
                    <div className="px-3 py-1.5 text-xs rounded-lg glass-input text-slate-300 flex items-center justify-between">
                      <span>macOS Calendar.app</span>
                      <span className={`text-[10px] font-semibold ${
                        calendarPermission?.authorized ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {calendarPermission?.authorized
                          ? `Ready (${calendarPermission.calendarCount || 0} Cal)`
                          : 'Permission Required'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleScrape}
                  disabled={isScraping}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                  <span>{isScraping ? 'Scraping Apple Calendar...' : 'Scrape Calendar Events Now'}</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>
                    {lastScrapeTime
                      ? `Last scraped: ${new Date(lastScrapeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Ready to scrape'}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openAppleCalendar()}
                      className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>Open Calendar.app</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => openPrivacySettings('automation')}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Permissions
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Ingestion Policy Card */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How Task Flow Handles Scraped Data:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-slate-300">New events</strong> created in Apple Calendar are ingested as tasks in Task Flow.
                  </li>
                  <li>
                    <strong className="text-slate-300">Existing tasks</strong> in Task Flow are locked: edits made in Apple Calendar are <strong>strictly discarded</strong> to protect your task checklists and progress.
                  </li>
                  <li>
                    <strong className="text-slate-300">Apple Calendar is never altered:</strong> No events will be created, edited, or deleted in your calendar.
                  </li>
                </ul>
              </div>
            </>
          ) : (
            /* USER MANUAL TAB */
            <div className="space-y-5 text-slate-300 text-xs leading-relaxed">
              {/* Section 1: Overview */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Calendar Event Scraper: User Manual
                </h4>
                <p className="text-slate-300">
                  Task Flow features a <strong>strictly read-only</strong> calendar scraper designed to bridge your daily appointments and meetings into your task tracking workflow without ever risking accidental changes to your calendar.
                </p>
              </div>

              {/* Section 2: Strict Rule */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  Strict Policy: Scrape Only, Never Edit
                </h4>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Scraping Events:</strong> Task Flow queries macOS Calendar using read-only AppleScript queries (<code className="text-cyan-300">get events</code>). It converts event titles, start dates, end dates, and notes into tasks.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Zero Calendar Mutations:</strong> Task Flow contains NO write commands. It cannot and will not modify, add, or delete any event in your Apple Calendar.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Rejecting Calendar Edits:</strong> Once an event is in Task Flow, any subsequent edits to that event in Apple Calendar are ignored. Task Flow remains the authoritative place to track completion, subtasks, and focus timers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: How to Use */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  How to Scrape Events (3 Steps)
                </h4>

                <div className="space-y-2 text-slate-400">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <strong className="text-white">Step 1: Add Events in Apple Calendar</strong>
                    <p className="mt-0.5">
                      Create any meeting, doctor appointment, or reminder in your standard Apple Calendar (e.g. "Sprint Review with Team" at 2:00 PM).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <strong className="text-white">Step 2: Scrape in Task Flow</strong>
                    <p className="mt-0.5">
                      In Task Flow, click the <strong>"Scrape Calendar"</strong> button in the top bar or sidebar. You can choose to scrape 7, 14, 30, or 60 days ahead.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <strong className="text-white">Step 3: Track & Complete Tasks</strong>
                    <p className="mt-0.5">
                      The events appear in your <strong>To Do</strong> column with their exact scheduled dates and times. You can add checklists, run Pomodoro focus sessions, and mark them complete in Task Flow!
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Permissions */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2 text-[11px] text-slate-400">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  macOS Calendar Permission
                </h4>
                <p>
                  When scraping for the first time, macOS may prompt: <em>"Task Flow wants to access Calendars"</em>. Click <strong>Allow / OK</strong> so Task Flow can read your schedule. You can manage this at any time in <strong>System Settings → Privacy & Security → Calendars</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Read-Only mode: Apple Calendar is never modified</span>
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
