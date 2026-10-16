import React from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Timer,
  MoreVertical,
  AlertCircle
} from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'from-slate-500/20 to-slate-500/5', border: 'border-slate-700/60', badge: 'bg-slate-800 text-slate-300' },
  { id: 'in_progress', title: 'In Progress', color: 'from-indigo-500/20 to-indigo-500/5', border: 'border-indigo-500/40', badge: 'bg-indigo-950/60 text-indigo-300' },
  { id: 'review', title: 'In Review', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/40', badge: 'bg-amber-950/60 text-amber-300' },
  { id: 'done', title: 'Completed', color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/40', badge: 'bg-emerald-950/60 text-emerald-300' },
];

export default function KanbanView() {
  const {
    filteredTasks,
    openCreateModal,
    openEditModal,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    toggleSubtask,
    setCurrentView,
    setActivePomodoroTaskId,
  } = useTasks();

  const handleMove = (task, direction) => {
    const statusOrder = ['todo', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    let nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      updateTask(task.id, { status: statusOrder[nextIndex] });
    }
  };

  const handleStartFocus = (task) => {
    setActivePomodoroTaskId(task.id);
    setCurrentView('pomodoro');
  };

  // Helper for priority formatting
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="h-full flex-1 overflow-x-auto p-6 bg-slate-900/30">
      <div className="flex gap-5 min-w-[1020px] h-full items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);

          return (
            <div
              key={column.id}
              className="flex-1 flex flex-col max-h-full rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md overflow-hidden"
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b ${column.border} bg-gradient-to-b ${column.color} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {column.title}
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${column.badge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => openCreateModal({ status: column.id })}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Add task in this column"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800/60 rounded-xl">
                    No tasks here
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
                    const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

                    return (
                      <div
                        key={task.id}
                        className={`group relative rounded-xl border border-slate-800/80 bg-slate-900/90 hover:border-slate-700/80 hover:bg-slate-900 p-4 transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer ${
                          task.status === 'done' ? 'opacity-70' : ''
                        }`}
                        onClick={() => openEditModal(task)}
                      >
                        {/* Top bar: Category + Priority + Calendar badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {task.category || 'General'}
                            </span>
                            {getPriorityBadge(task.priority)}
                          </div>

                          {task.syncWithCalendar && (
                            <div
                              className="text-[10px] text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20"
                              title="Linked with Apple Calendar"
                            >
                              <Calendar className="w-3 h-3" />
                              <span className="hidden xl:inline">iCal</span>
                            </div>
                          )}
                        </div>

                        {/* Title & Checkbox */}
                        <div className="flex items-start gap-2.5 mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(task.id);
                            }}
                            className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                          >
                            {task.status === 'done' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <h4
                            className={`text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-relaxed ${
                              task.status === 'done' ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Subtasks Progress */}
                        {totalSubtasks > 0 && (
                          <div className="mb-3 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-slate-500" />
                                Subtasks
                              </span>
                              <span>
                                {completedSubtasks}/{totalSubtasks}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Footer: Due date + Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1 text-slate-300 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{task.dueDate}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">No due date</span>
                          )}

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {/* Focus Timer Trigger */}
                            <button
                              onClick={() => handleStartFocus(task)}
                              className="p-1 rounded hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                              title="Start Focus Session"
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Left */}
                            {column.id !== 'todo' && (
                              <button
                                onClick={() => handleMove(task, -1)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                title="Move Left"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Move Right */}
                            {column.id !== 'done' && (
                              <button
                                onClick={() => handleMove(task, 1)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                title="Move Right"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
