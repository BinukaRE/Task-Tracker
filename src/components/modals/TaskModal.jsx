import React, { useState, useEffect } from 'react';
import { useTasks } from '../../context/TaskContext';
import {
  X,
  Calendar,
  Clock,
  Tag,
  CheckSquare,
  Plus,
  Trash2,
  Bell,
  FolderOpen,
  CheckCircle2,
  Circle
} from 'lucide-react';

export default function TaskModal() {
  const {
    isTaskModalOpen,
    setIsTaskModalOpen,
    selectedTask,
    modalMode,
    addTask,
    updateTask,
    deleteTask,
    categories,
  } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Work');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [syncWithCalendar, setSyncWithCalendar] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title || '');
      setDescription(selectedTask.description || '');
      setStatus(selectedTask.status || 'todo');
      setPriority(selectedTask.priority || 'medium');
      setCategory(selectedTask.category || 'Work');
      setTags(selectedTask.tags || []);
      setDueDate(selectedTask.dueDate || '');
      setStartTime(selectedTask.startTime || '');
      setEndTime(selectedTask.endTime || '');
      setEstimatedMinutes(selectedTask.estimatedMinutes || 60);
      setSubtasks(selectedTask.subtasks || []);
      setSyncWithCalendar(selectedTask.syncWithCalendar !== undefined ? selectedTask.syncWithCalendar : true);
      setReminderMinutesBefore(selectedTask.reminderMinutesBefore !== undefined ? selectedTask.reminderMinutesBefore : 15);
    }
  }, [selectedTask]);

  if (!isTaskModalOpen) return null;

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: 'st-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const toggleSubtaskItem = (id) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const removeSubtaskItem = (id) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      category: isAddingCategory && newCategoryInput.trim() ? newCategoryInput.trim() : category,
      tags,
      dueDate: dueDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      subtasks,
      syncWithCalendar,
      reminderMinutesBefore: Number(reminderMinutesBefore),
    };

    if (modalMode === 'create') {
      await addTask(payload);
    } else if (selectedTask) {
      await updateTask(selectedTask.id, payload);
    }

    setIsTaskModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedTask && confirm('Are you sure you want to delete this task?')) {
      await deleteTask(selectedTask.id);
      setIsTaskModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h3 className="text-base font-bold text-slate-100">
              {modalMode === 'create' ? 'Create New Task' : 'Edit Task'}
            </h3>
          </div>
          <button
            onClick={() => setIsTaskModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prepare design specification for macOS Calendar integration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl glass-input text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Notes</label>
            <textarea
              rows={3}
              placeholder="Add detailed context, links, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />
          </div>

          {/* Row 1: Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none capitalize"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none capitalize"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Row 2: Category & Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Category / Project</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  {isAddingCategory ? 'Select existing' : '+ New Category'}
                </button>
              </div>

              {isAddingCategory ? (
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none"
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none"
                >
                  {categories.filter(c => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Row 3: Due Date & Start/End Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (opt)</label>
              <input
                type="time"
                value={startTime ? startTime.substring(11, 16) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartTime(val && dueDate ? `${dueDate}T${val}:00` : val);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Time (opt)</label>
              <input
                type="time"
                value={endTime ? endTime.substring(11, 16) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndTime(val && dueDate ? `${dueDate}T${val}:00` : val);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-200 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Apple Calendar Linking Section */}
          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Sync with Local Apple Calendar
                </span>
              </div>
              <input
                type="checkbox"
                checked={syncWithCalendar}
                onChange={(e) => setSyncWithCalendar(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {syncWithCalendar && (
              <div className="flex items-center justify-between pt-2 border-t border-indigo-500/20 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Calendar Reminder Alert:</span>
                </div>
                <select
                  value={reminderMinutesBefore}
                  onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={0}>At time of event</option>
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (press Enter to add)</label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl glass-input">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-500 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="flex-1 min-w-[80px] bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none px-1"
              />
            </div>
          </div>

          {/* Subtasks Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                Subtasks / Checklist
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {subtasks.filter(s => s.completed).length}/{subtasks.length} done
              </span>
            </div>

            <div className="space-y-1.5 mb-2">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 group"
                >
                  <div
                    onClick={() => toggleSubtaskItem(st.id)}
                    className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer flex-1 min-w-0"
                  >
                    {st.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={`truncate ${st.completed ? 'line-through text-slate-500' : ''}`}>
                      {st.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSubtaskItem(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add subtask item..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl glass-input text-slate-200 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <div>
            {modalMode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {modalMode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
