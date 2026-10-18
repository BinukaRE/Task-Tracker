import React, { createContext, useContext, useState, useEffect } from 'react';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentView, setCurrentView] = useState('kanban'); // 'kanban' | 'list' | 'calendar' | 'pomodoro' | 'analytics'
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Calendar Scraper State (Strict Read-Only)
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState(null);
  const [scrapeNotice, setScrapeNotice] = useState(null);
  const [scrapeStats, setScrapeStats] = useState({ totalScraped: 0, lastCount: 0 });
  const [calendarPermission, setCalendarPermission] = useState({ checked: false, authorized: false });
  const [autoSyncState, setAutoSyncState] = useState({
    enabled: true,
    intervalMinutes: 10,
    lastSyncTime: null,
    nextSyncTime: null,
    isSyncing: false,
    totalEventsTracked: 0,
  });

  // Pomodoro Focus state
  const [activePomodoroTaskId, setActivePomodoroTaskId] = useState(null);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        if (isElectron) {
          const loadedTasks = await window.electronAPI.getTasks();
          const cleanTasks = (loadedTasks || []).filter(
            (t) => t.id !== 'task-1' && t.id !== 'task-2' && t.title !== 'Q4 Product Roadmap Review'
          );
          setTasks(cleanTasks);
        } else {
          const local = localStorage.getItem('task_tracker_tasks') || localStorage.getItem('task_flow_tasks');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              const cleanTasks = (parsed || []).filter(
                (t) => t.id !== 'task-1' && t.id !== 'task-2' && t.title !== 'Q4 Product Roadmap Review'
              );
              setTasks(cleanTasks);
            } catch (e) {
              setTasks([]);
            }
          } else {
            setTasks([]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData().then(() => {
      checkCalendarPermission();
    });

    if (isElectron) {
      const unsubQuick = window.electronAPI.onQuickTaskTriggered(() => {
        openCreateModal();
      });
      const unsubScrape = window.electronAPI.onScrapeTriggered(() => {
        scrapeCalendarEvents();
      });
      const unsubScraped = window.electronAPI.onScraped((res) => {
        if (res.newTasks && res.newTasks.length > 0) {
          setTasks((prev) => [...res.newTasks, ...prev]);
        }
      });
      const unsubAuto = window.electronAPI.onCalendarAutoRefreshed?.((res) => {
        if (res.newTasks && res.newTasks.length > 0) {
          setTasks((prev) => [...res.newTasks, ...prev]);
          setScrapeStats((prev) => ({
            totalScraped: prev.totalScraped + res.newTasks.length,
            lastCount: res.newTasks.length,
          }));
          setScrapeNotice({
            type: 'success',
            message: `Calendar Auto-Refreshed: ${res.newTasks.length} new event(s) imported.`,
            details: 'Next 10-minute auto-refresh scheduled',
          });
        }
        if (res.timestamp) {
          setLastScrapeTime(new Date(res.timestamp));
        }
      });
      const unsubStatus = window.electronAPI.onCalendarSyncStatus?.((status) => {
        if (status) setAutoSyncState((prev) => ({ ...prev, ...status }));
      });

      // Initial auto-sync status check
      window.electronAPI.getAutoSyncStatus?.().then((status) => {
        if (status) setAutoSyncState((prev) => ({ ...prev, ...status }));
      });

      return () => {
        if (unsubQuick) unsubQuick();
        if (unsubScrape) unsubScrape();
        if (unsubScraped) unsubScraped();
        if (unsubAuto) unsubAuto();
        if (unsubStatus) unsubStatus();
      };
    }
  }, []);

  // Save changes to tasks
  const persistTasks = async (updatedTasks) => {
    setTasks(updatedTasks);
    if (isElectron) {
      await window.electronAPI.saveTasks(updatedTasks);
    } else {
      localStorage.setItem('task_tracker_tasks', JSON.stringify(updatedTasks));
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
      status: 'todo',
      priority: 'medium',
      category: 'Work',
      ...newTaskData,
    };
    const updated = [newTask, ...tasks];
    await persistTasks(updated);
    return newTask;
  };

  // Update Task (ONLY updates Task Flow tasks locally, NEVER touches Apple Calendar)
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
  };

  // Delete Task (ONLY deletes from Task Flow, NEVER deletes from Apple Calendar)
  const deleteTask = async (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    await persistTasks(updated);
  };

  // Toggle Task Status
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

  /**
   * PURE READ-ONLY SCRAPING:
   * Scrapes events from Apple Calendar into Task Flow.
   * STRICT POLICY:
   * - Never creates, modifies, or deletes events in Apple Calendar.
   * - Rejects any edits made in Apple Calendar to existing tasks.
   */
  const checkCalendarPermission = async () => {
    if (isElectron && window.electronAPI.checkCalendarPermission) {
      const res = await window.electronAPI.checkCalendarPermission();
      setCalendarPermission({ checked: true, ...res });
      return res;
    }
    return { authorized: false, isMac: false };
  };

  const openPrivacySettings = async (target = 'automation') => {
    if (isElectron && window.electronAPI.openPrivacySettings) {
      await window.electronAPI.openPrivacySettings(target);
    }
  };

  /**
   * PURE READ-ONLY SCRAPING:
   * Scrapes events from Apple Calendar into Task Flow.
   * STRICT POLICY:
   * - Never creates, modifies, or deletes events in Apple Calendar.
   * - Rejects any edits made in Apple Calendar to existing tasks.
   */
  const scrapeCalendarEvents = async (options = {}) => {
    if (!isElectron) {
      setScrapeNotice({ type: 'warning', message: 'Calendar scraping requires the macOS desktop app.' });
      return;
    }

    setIsScraping(true);
    try {
      const res = await window.electronAPI.scrapeCalendarEvents(options);
      setLastScrapeTime(new Date());

      if (res.isPermissionError) {
        setCalendarPermission(prev => ({ ...prev, checked: true, authorized: false, isPermissionError: true }));
      } else if (res.success) {
        setCalendarPermission(prev => ({ ...prev, checked: true, authorized: true }));
      }

      if (res.success) {
        if (res.skipped) {
          setScrapeNotice({
            type: 'info',
            message: res.message || 'Calendar is closed.',
            details: 'Task Tracker runs silently in the background and will never open Calendar automatically.'
          });
        } else if (res.newTasks && res.newTasks.length > 0) {
          setTasks((prev) => [...res.newTasks, ...prev]);
          setScrapeStats(prev => ({
            totalScraped: prev.totalScraped + res.newTasks.length,
            lastCount: res.newTasks.length,
          }));
          setScrapeNotice({
            type: 'success',
            message: res.message,
            details: 'Read-only: Apple Calendar was NOT modified.'
          });
        } else {
          setScrapeNotice({
            type: 'info',
            message: res.message || 'No new events found in Apple Calendar.',
            details: 'Existing tasks remain protected and unedited.'
          });
        }
      } else {
        setScrapeNotice({
          type: res.isPermissionError ? 'permission_error' : 'warning',
          message: res.error || 'Scraper notice',
          details: res.details,
          isPermissionError: res.isPermissionError,
        });
      }
    } catch (err) {
      console.error('Error scraping calendar:', err);
      setScrapeNotice({ type: 'error', message: 'Failed to scrape Apple Calendar.' });
    } finally {
      setIsScraping(false);
      setTimeout(() => setScrapeNotice(null), 8000);
    }
  };

  // Open Apple Calendar app
  const openAppleCalendar = async () => {
    if (isElectron) {
      await window.electronAPI.openAppleCalendar();
    }
  };

  // Trigger immediate Auto-Sync Link refresh
  const forceAutoRefresh = async () => {
    if (isElectron && window.electronAPI.forceAutoRefresh) {
      setIsScraping(true);
      try {
        const res = await window.electronAPI.forceAutoRefresh();
        if (res?.newTasks && res.newTasks.length > 0) {
          setTasks((prev) => [...res.newTasks, ...prev]);
        }
        return res;
      } finally {
        setIsScraping(false);
      }
    }
  };

  // Update and reschedule auto-sync interval
  const updateAutoSyncInterval = async (minutes) => {
    const mins = Number(minutes);
    if (isElectron && window.electronAPI.setAutoSyncInterval) {
      const updated = await window.electronAPI.setAutoSyncInterval(mins);
      if (updated) {
        setAutoSyncState(updated);
      }
    } else {
      setAutoSyncState(prev => ({
        ...prev,
        enabled: mins > 0,
        intervalMinutes: mins,
        nextSyncTime: mins > 0 ? new Date(Date.now() + mins * 60 * 1000).toISOString() : null,
      }));
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
        // Pure Read-Only Calendar Scraper
        isScraping,
        lastScrapeTime,
        scrapeNotice,
        syncNotice: scrapeNotice, // backward compatibility
        setScrapeNotice,
        clearScrapeNotice: () => setScrapeNotice(null),
        scrapeStats,
        scrapeCalendarEvents,
        openAppleCalendar,
        calendarPermission,
        checkCalendarPermission,
        openPrivacySettings,
        autoSyncState,
        forceAutoRefresh,
        updateAutoSyncInterval,
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
