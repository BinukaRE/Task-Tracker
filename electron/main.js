const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
const { scrapeAppleCalendarEvents, openAppleCalendar } = require('./calendar-sync');

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
      description: 'Review cross-functional milestones, deliverables, and deadlines with team.',
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
        { id: 'sub-2', title: 'Gather engineering estimates', completed: false }
      ],
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
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
});

const settingsStore = new Store('settings.json', {
  autoScrapeIntervalMinutes: 30,
  theme: 'dark',
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
        label: 'Scrape Apple Calendar Events',
        click: async () => {
          const currentTasks = tasksStore.get('tasks') || [];
          const res = await scrapeAppleCalendarEvents(currentTasks);
          if (res.success && res.newTasks && res.newTasks.length > 0) {
            tasksStore.set('tasks', [...res.newTasks, ...currentTasks]);
            if (mainWindow) mainWindow.webContents.send('action:scraped', res);
          }
          if (Notification.isSupported()) {
            new Notification({
              title: 'Calendar Scraper',
              body: res.message || 'Scrape completed',
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
  // Set macOS Dock Icon
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
          label: 'Scrape Calendar Events',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: async () => {
            if (mainWindow) {
              mainWindow.webContents.send('action:trigger-scrape');
            }
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
          label: 'Scrape Events from Apple Calendar',
          click: async () => {
            if (mainWindow) mainWindow.webContents.send('action:trigger-scrape');
          }
        },
        {
          label: 'Open Apple Calendar App',
          click: () => openAppleCalendar()
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

// PURE READ-ONLY SCRAPING: Scrapes events from Apple Calendar without modifying or editing calendar
ipcMain.handle('calendar:scrape', async (_event, options) => {
  const tasks = tasksStore.get('tasks') || [];
  const result = await scrapeAppleCalendarEvents(tasks, options);
  if (result.success && result.newTasks && result.newTasks.length > 0) {
    const updated = [...result.newTasks, ...tasks];
    tasksStore.set('tasks', updated);
  }
  return result;
});

ipcMain.handle('calendar:openApple', async () => {
  return await openAppleCalendar();
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
