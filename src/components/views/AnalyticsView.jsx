import React from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  PieChart,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function AnalyticsView() {
  const { tasks, lastSyncTime, serverInfo } = useTasks();

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const review = tasks.filter((t) => t.status === 'review').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const syncedCount = tasks.filter((t) => t.syncWithCalendar).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalEstimatedMin = tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
  const totalActualMin = tasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);

  // Group by Priority
  const priorityCounts = {
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  // Group by Category
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))];
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: tasks.filter(t => t.category === cat).length,
    done: tasks.filter(t => t.category === cat && t.status === 'done').length,
  }));

  return (
    <div className="h-full flex-1 overflow-y-auto p-6 bg-slate-900/30 space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{total}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-indigo-400 font-semibold">{total - completed}</span> active right now
          </div>
        </div>

        {/* Completion Rate */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{completionRate}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Time Logged */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Logged Focus</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {(totalActualMin / 60).toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Estimated: {(totalEstimatedMin / 60).toFixed(1)} hrs
          </div>
        </div>

        {/* Local Calendar Link Status */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Apple Calendar</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {syncedCount} <span className="text-sm font-normal text-slate-400">synced</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Feed active on port {serverInfo?.port || 52884}</span>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status & Priority Distribution */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-400" />
            Priority Breakdown
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Urgent', count: priorityCounts.urgent, color: 'bg-rose-500', text: 'text-rose-400' },
              { label: 'High', count: priorityCounts.high, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'Medium', count: priorityCounts.medium, color: 'bg-blue-500', text: 'text-blue-400' },
              { label: 'Low', count: priorityCounts.low, color: 'bg-slate-500', text: 'text-slate-400' },
            ].map((p) => {
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <div key={p.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${p.text}`}>{p.label}</span>
                    <span className="text-slate-400 font-mono">
                      {p.count} tasks ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${p.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Category Performance
          </h3>

          <div className="space-y-3">
            {categoryCounts.map((cat) => {
              const pct = cat.count > 0 ? Math.round((cat.done / cat.count) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <span className="text-slate-400 font-mono">
                      {cat.done}/{cat.count} completed ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
