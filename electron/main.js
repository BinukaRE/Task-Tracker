const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
const { syncTasksWithAppleCalendar, openAppleCalendar, generateIcs, connectCalendar } = require('./calendar-sync');
const { startCalendarServer, getServerInfo, openWebcalSubscription } = require('./server');

// Explicitly configure Electron App Name
app.setName('Task Flow');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Initialize Persistent Stores
const tasksStore = new Store('tasks.json', {
  tasks: [
    {
      id: 'task-1',
      title: 'Q4 Product Roadmap Review',
      description: 'Review cross-functional milestones, deliverables, and calendar deadlines with team.',
      status: 'in_progress',
      priority: 'urgent',
      category: 'Work',
      tags: ['Strategy', 'Planning'],
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Tomorrow
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
      description: 'Analyze slow query logs, add missing composite indexes, and benchmark response times.',
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
        { id: 'sub-4', title: 'Enable slow query logging', completed: false },
        { id: 'sub-5', title: 'Run EXPLAIN ANALYZE on top 5 queries', completed: false }
      ],
      syncWithCalendar: true,
      reminderMinutesBefore: 30,
      color: '#ec4899',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-3',
      title: 'Update Design System Tokens',
      description: 'Align color palettes and typography scale with the new brand guidelines.',
      status: 'review',
      priority: 'medium',
      category: 'Design',
      tags: ['Figma', 'UI'],
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString().split('T')[0],
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString().split('T')[0] + 'T09:30:00',
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString().split('T')[0] + 'T11:00:00',
      estimatedMinutes: 90,
      actualMinutes: 75,
      subtasks: [
        { id: 'sub-6', title: 'Export variables to JSON', completed: true },
        { id: 'sub-7', title: 'Sync with frontend design team', completed: false }
      ],
      syncWithCalendar: true,
      reminderMinutesBefore: 15,
      color: '#10b981',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-4',
      title: 'Weekly 1-on-1 Catchup',
      description: 'Discuss career growth goals, unblock current obstacles, and plan upcoming quarter.',
      status: 'done',
      priority: 'low',
      category: 'Personal',
      tags: ['1on1', 'Career'],
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0],
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0] + 'T16:00:00',
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0] + 'T16:45:00',
      estimatedMinutes: 45,
      actualMinutes: 50,
      subtasks: [],
      syncWithCalendar: true,
      reminderMinutesBefore: 10,
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
});

const settingsStore = new Store('settings.json', {
  autoSyncWithAppleCalendar: true,
  syncIntervalMinutes: 30,
  webcalPort: 52884,
  theme: 'dark',
  calendarName: 'Task Flow',
  notificationsEnabled: true
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 650,
    title: 'Task Flow',
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
      }
    });
  } else {
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a 16x16 or 20x20 template icon for macOS menu bar
  const iconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="13" rx="2" stroke="white" stroke-width="1.8"/>
    <path d="M7 2v3M13 2v3M3 8h14" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M7 12l2 2 4-4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  let icon = nativeImage.createFromBuffer(Buffer.from(iconSvg));
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Task Flow');

  const updateContextMenu = () => {
    const tasks = tasksStore.get('tasks') || [];
    const pendingCount = tasks.filter(t => t.status !== 'done').length;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Task Flow (${pendingCount} active)`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Task Flow',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      {
        label: 'Quick Add Task...',
        accelerator: 'CommandOrControl+Shift+T',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('action:quick-task');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Sync with Apple Calendar',
        click: async () => {
          const currentTasks = tasksStore.get('tasks') || [];
          const res = await syncTasksWithAppleCalendar(currentTasks);
          if (Notification.isSupported()) {
            new Notification({
              title: res.success ? 'Calendar Synchronized' : 'Calendar Sync Notice',
              body: res.message || res.details || 'Sync completed',
            }).show();
          }
        },
      },
      {
        label: 'Open Apple Calendar',
        click: () => {
          openAppleCalendar();
        },
      },
      {
        label: 'Subscribe via WebCal Link',
        click: () => {
          openWebcalSubscription();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Task Flow',
        accelerator: 'CommandOrControl+Q',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Set macOS Dock Icon explicitly
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath);
    }
  }

  // Setup Native macOS Application Menu
  const menuTemplate = [
    {
      label: 'Task Flow',
      submenu: [
        { role: 'about', label: 'About Task Flow' },
        { type: 'separator' },
        {
          label: 'Quick Add Task...',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              mainWindow.webContents.send('action:quick-task');
            }
          }
        },
        {
          label: 'Sync Calendar',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const currentTasks = tasksStore.get('tasks') || [];
            await syncTasksWithAppleCalendar(currentTasks);
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Task Flow' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Task Flow' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Calendar',
      submenu: [
        {
          label: 'Sync with Apple Calendar',
          click: async () => {
            const currentTasks = tasksStore.get('tasks') || [];
            await syncTasksWithAppleCalendar(currentTasks);
          }
        },
        {
          label: 'Open Apple Calendar',
          click: () => openAppleCalendar()
        },
        {
          label: 'Subscribe to Live WebCal Feed',
          click: () => openWebcalSubscription()
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Start local calendar subscription server
  const settings = settingsStore.get();
  await startCalendarServer(
    () => tasksStore.get('tasks') || [],
    settings.webcalPort || 52884
  );

  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('tasks:get', async () => {
  return tasksStore.get('tasks') || [];
});

ipcMain.handle('tasks:save', async (_event, newTasks) => {
  tasksStore.set('tasks', newTasks);
  return { success: true };
});

ipcMain.handle('settings:get', async () => {
  return settingsStore.get();
});

ipcMain.handle('settings:save', async (_event, newSettings) => {
  settingsStore.set(newSettings);
  return { success: true };
});

ipcMain.handle('calendar:syncApple', async () => {
  const tasks = tasksStore.get('tasks') || [];
  return await syncTasksWithAppleCalendar(tasks);
});

ipcMain.handle('calendar:connect', async () => {
  const tasks = tasksStore.get('tasks') || [];
  return await connectCalendar(tasks);
});

ipcMain.handle('calendar:openApple', async () => {
  return await openAppleCalendar();
});

ipcMain.handle('calendar:getServerInfo', async () => {
  return getServerInfo();
});

ipcMain.handle('calendar:subscribeWebcal', async () => {
  return await openWebcalSubscription();
});

ipcMain.handle('calendar:exportIcs', async () => {
  if (!mainWindow) return { success: false };
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Tasks to iCalendar (.ics)',
    defaultPath: 'tasks-export.ics',
    filters: [{ name: 'iCalendar Files', extensions: ['ics'] }],
  });

  if (!filePath) return { success: false, cancelled: true };

  const tasks = tasksStore.get('tasks') || [];
  const icsData = generateIcs(tasks);
  fs.writeFileSync(filePath, icsData, 'utf8');

  return { success: true, filePath };
});

ipcMain.handle('system:notify', async (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return { success: true };
  }
  return { success: false };
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});
