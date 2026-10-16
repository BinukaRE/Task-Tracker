import React, { createContext, useContext, useState, useEffect } from 'react';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

// Check if running inside Electron with electronAPI available
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [currentView, setCurrentView] = useState('kanban'); // 'kanban' | 'list' | 'calendar' | 'pomodoro' | 'analytics'
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Calendar Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);
  const [serverInfo, setServerInfo] = useState({
    port: 52884,
    webcalUrl: 'webcal://localhost:52884/calendar.ics',
    httpUrl: 'http://localhost:52884/calendar.ics',
  });

  // Pomodoro Focus state
  const [activePomodoroTaskId, setActivePomodoroTaskId] = useState(null);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        if (isElectron) {
          const loadedTasks = await window.electronAPI.getTasks();
          setTasks(loadedTasks || []);
          const info = await window.electronAPI.getCalendarServerInfo();
          if (info) setServerInfo(info);
        } else {
          // Web fallback
          const local = localStorage.getItem('tasks_pro');
          if (local) {
            setTasks(JSON.parse(local));
          } else {
            // Sample initial data
            setTasks([
              {
                id: 'task-1',
                title: 'Q4 Product Roadmap Review',
                description: 'Review cross-functional milestones, deliverables, and calendar deadlines with team.',
                status: 'in_progress',
                priority: 'urgent',
                category: 'Work',
                tags: ['Strategy', 'Planning'],
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0],
                startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0] + 'T10:00:00',
                endTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0] + 'T11:30:00',
                estimatedMinutes: 90,
                actualMinutes: 45,
                subtasks: [
                  { id: 'sub-1', title: 'Prepare slide deck', completed: true },
                  { id: 'sub-2', title: 'Gather engineering estimates', completed: false },
                  { id: 'sub-3', title: 'Share agenda with attendees', completed: false }
                ],
                syncWithCalendar: true,
                reminderMinutesBefore: 15,
                color: '#6366f1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'task-2',
                title: 'Database Performance Optimization',
                description: 'Analyze slow query logs, add composite indexes, and benchmark response times.',
                status: 'todo',
                priority: 'high',
                category: 'Development',
                tags: ['Backend', 'SQL'],
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().split('T')[0],
                startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().split('T')[0] + 'T14:00:00',
                endTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().split('T')[0] + 'T16:00:00',
                estimatedMinutes: 120,
                actualMinutes: 0,
                subtasks: [
                  { id: 'sub-4', title: 'Enable slow query logging', completed: false }
                ],
                syncWithCalendar: true,
                reminderMinutesBefore: 30,
                color: '#ec4899',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Listen for tray quick task action
    if (isElectron) {
      const unsubQuick = window.electronAPI.onQuickTaskTriggered(() => {
        openCreateModal();
      });
      const unsubSync = window.electronAPI.onSyncTriggered(() => {
        syncAppleCalendar();
      });
      return () => {
        if (unsubQuick) unsubQuick();
        if (unsubSync) unsubSync();
      };
    }
  }, []);

  // Save changes to tasks
  const persistTasks = async (updatedTasks) => {
    setTasks(updatedTasks);
    if (isElectron) {
      await window.electronAPI.saveTasks(updatedTasks);
    } else {
      localStorage.setItem('tasks_pro', JSON.stringify(updatedTasks));
    }
  };

  // Add Task
  const addTask = async (newTaskData) => {
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actualMinutes: 0,
      subtasks: [],
      tags: [],
      syncWithCalendar: true,
      reminderMinutesBefore: 15,
      status: 'todo',
      priority: 'medium',
      category: 'Work',
      ...newTaskData,
    };
    const updated = [newTask, ...tasks];
    await persistTasks(updated);

    // If task has calendar sync enabled, trigger sync
    if (isElectron && newTask.syncWithCalendar && newTask.dueDate) {
      syncAppleCalendar(updated);
    }

    return newTask;
  };

  // Update Task
  const updateTask = async (id, updates) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    await persistTasks(updated);

    if (isElectron) {
      const target = updated.find(t => t.id === id);
      if (target && target.syncWithCalendar) {
        syncAppleCalendar(updated);
      }
    }
  };

  // Delete Task
  const deleteTask = async (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    await persistTasks(updated);
    if (isElectron) {
      syncAppleCalendar(updated);
    }
  };

  // Toggle Task Status (cycle or mark done)
  const toggleTaskStatus = async (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const nextStatus = current.status === 'done' ? 'todo' : 'done';
    await updateTask(id, { status: nextStatus });
  };

  // Toggle Subtask
  const toggleSubtask = async (taskId, subtaskId) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;

    const subtasks = (current.subtasks || []).map((s) => {
      if (s.id === subtaskId) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    // If all subtasks are done, offer to complete the task
    const allDone = subtasks.length > 0 && subtasks.every(s => s.completed);
    await updateTask(taskId, {
      subtasks,
      status: allDone ? 'done' : (current.status === 'done' ? 'in_progress' : current.status)
    });
  };

  // Log Focus / Pomodoro minutes
  const logFocusTime = async (taskId, minutes) => {
    const current = tasks.find(t => t.id === taskId);
    if (!current) return;
    const actual = (current.actualMinutes || 0) + minutes;
    await updateTask(taskId, { actualMinutes: actual });
  };

  // Synchronize with Local Apple Calendar
  const syncAppleCalendar = async (customTasksList) => {
    if (!isElectron) {
      setSyncNotice({ type: 'warning', message: 'Direct Apple Calendar sync is available in macOS Desktop app mode.' });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await window.electronAPI.syncAppleCalendar();
      setLastSyncTime(new Date());
      if (res.success) {
        setSyncNotice({ type: 'success', message: res.message || 'Synchronized with macOS Calendar!' });
      } else {
        setSyncNotice({ type: 'warning', message: res.error || 'Calendar notice', details: res.details });
      }
    } catch (err) {
      console.error('Error syncing calendar:', err);
      setSyncNotice({ type: 'error', message: 'Failed to communicate with macOS Calendar app.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

  // Open Apple Calendar app
  const openAppleCalendar = async () => {
    if (isElectron) {
      await window.electronAPI.openAppleCalendar();
    }
  };

  // Subscribe via WebCal
  const subscribeWebcal = async () => {
    if (isElectron) {
      await window.electronAPI.subscribeWebcal();
    } else {
      window.open(serverInfo.webcalUrl, '_blank');
    }
  };

  // Export .ics
  const exportIcs = async () => {
    if (isElectron) {
      const res = await window.electronAPI.exportIcsFile();
      if (res.success) {
        setSyncNotice({ type: 'success', message: `Exported to ${res.filePath}` });
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } else {
      window.open(serverInfo.downloadUrl || 'http://localhost:52884/download.ics', '_blank');
    }
  };

  // Modal helpers
  const openCreateModal = (preset = {}) => {
    setSelectedTask({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      category: 'Work',
      tags: [],
      dueDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      estimatedMinutes: 60,
      subtasks: [],
      syncWithCalendar: true,
      reminderMinutesBefore: 15,
      ...preset,
    });
    setModalMode('create');
    setIsTaskModalOpen(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setModalMode('edit');
    setIsTaskModalOpen(true);
  };

  // Categories list derived from tasks + defaults
  const categories = ['All', ...new Set(['Work', 'Development', 'Design', 'Personal', ...tasks.map(t => t.category).filter(Boolean)])];

  // Filtered Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    const matchesPriority = selectedPriority === 'All' || task.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'All' || task.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <TaskContext.Provider
      value={{
        tasks,
        filteredTasks,
        loading,
        currentView,
        setCurrentView,
        selectedTask,
        setSelectedTask,
        isTaskModalOpen,
        setIsTaskModalOpen,
        isCalendarModalOpen,
        setIsCalendarModalOpen,
        modalMode,
        openCreateModal,
        openEditModal,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        toggleSubtask,
        logFocusTime,
        // Search & Filter
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedPriority,
        setSelectedPriority,
        selectedStatus,
        setSelectedStatus,
        categories,
        // Calendar
        isSyncing,
        lastSyncTime,
        syncNotice,
        serverInfo,
        syncAppleCalendar,
        openAppleCalendar,
        subscribeWebcal,
        exportIcs,
        // Pomodoro
        activePomodoroTaskId,
        setActivePomodoroTaskId,
        isElectron,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
