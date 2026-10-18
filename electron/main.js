const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store');
const {
  scrapeAppleCalendarEvents,
  checkCalendarPermission,
  getAvailableCalendars,
  closeCalendarApp,
  isCalendarAppRunning,
  openAppleCalendar,
  openPrivacySettings,
} = require('./calendar-sync');

// Explicitly configure Electron App Name
app.setName('Task Tracker');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Initialize Persistent Stores (No sample data - clean user storage)
const tasksStore = new Store('tasks.json', { tasks: [] });

// Strip legacy sample tasks from store if present
try {
  const current = tasksStore.get('tasks') || [];
  const cleaned = current.filter(t => 
    t.id !== 'task-1' && 
    t.id !== 'task-2' && 
    t.title !== 'Q4 Product Roadmap Review' &&
    !t.title.match(/^\d{4}-\d{2}-\d{2}T/) &&
    t.title !== 'MHZ4359 Mathe'
  );
  if (cleaned.length !== current.length) {
    tasksStore.set('tasks', cleaned);
  }
} catch (e) {
  // Ignore
}

const settingsStore = new Store('settings.json', {
  autoScrapeIntervalMinutes: 10,
  theme: 'dark',
  notificationsEnabled: true
});

function createMainWindow() {
  const appIconPath = path.join(__dirname, '../public/icon.png');
  const appIconImage = fs.existsSync(appIconPath) ? nativeImage.createFromPath(appIconPath) : null;

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 650,
    title: 'Task Tracker',
    icon: appIconImage || appIconPath,
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

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] (L${level} ${sourceId}:${line}): ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Load Failed] Code ${errorCode}: ${errorDescription} (${validatedURL})`);
  });

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
  tray.setToolTip('Task Tracker');

  const updateContextMenu = () => {
    const tasks = tasksStore.get('tasks') || [];
    const pendingCount = tasks.filter(t => t.status !== 'done').length;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Task Tracker (${pendingCount} active)`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Task Tracker',
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
        label: 'Quit Task Tracker',
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
    const candidatePaths = [
      path.join(__dirname, '../build/icon.png'),
      path.join(__dirname, '../public/icon.png'),
      path.join(__dirname, '../assets/icon.png'),
      path.join(__dirname, '../build/icon.icns'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const dockImg = nativeImage.createFromPath(p);
          if (!dockImg.isEmpty()) {
            app.dock.setIcon(dockImg);
            break;
          }
        } catch (e) {
          console.warn('Failed to set dock icon from', p, e.message);
        }
      }
    }
  }

  // Setup Native macOS Application Menu
  const menuTemplate = [
    {
      label: 'Task Tracker',
      submenu: [
        { role: 'about', label: 'About Task Tracker' },
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
        { role: 'hide', label: 'Hide Task Tracker' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Task Tracker' }
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

  // Start Background Calendar Auto-Refresh Engine (Runs automatically every 10 minutes)
  startCalendarAutoSync();

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

// ----------------------------------------------------
// Customizable Apple Calendar Auto-Refresh Engine
// Default: 10 minutes (User Selectable & Persisted)
// ----------------------------------------------------
let autoSyncInterval = null;

const initialIntervalMinutes = (() => {
  const saved = Number(settingsStore.get('autoScrapeIntervalMinutes'));
  return !isNaN(saved) && saved >= 0 ? saved : 10;
})();

const autoSyncState = {
  enabled: initialIntervalMinutes > 0,
  intervalMinutes: initialIntervalMinutes,
  lastSyncTime: null,
  nextSyncTime: null,
  isSyncing: false,
  totalEventsTracked: 0,
};

function rescheduleAutoSync(minutes) {
  const mins = Number(minutes);
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  if (isNaN(mins) || mins <= 0) {
    autoSyncState.enabled = false;
    autoSyncState.intervalMinutes = 0;
    autoSyncState.nextSyncTime = null;
  } else {
    autoSyncState.enabled = true;
    autoSyncState.intervalMinutes = mins;
    const intervalMs = mins * 60 * 1000;
    autoSyncState.nextSyncTime = new Date(Date.now() + intervalMs).toISOString();

    autoSyncInterval = setInterval(() => {
      executeCalendarSync('auto');
    }, intervalMs);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('calendar:sync-status', autoSyncState);
  }
}

async function executeCalendarSync(source = 'auto') {
  if (autoSyncState.isSyncing) {
    return { inProgress: true, message: 'Calendar sync is already in progress.' };
  }

  const isRunning = isCalendarAppRunning();
  // CRITICAL REQUIREMENT: Do not open Calendar automatically during background auto-sync!
  if ((source === 'auto' || source === 'startup') && !isRunning) {
    autoSyncState.lastSyncTime = new Date().toISOString();
    if (autoSyncState.enabled && autoSyncState.intervalMinutes > 0) {
      autoSyncState.nextSyncTime = new Date(Date.now() + autoSyncState.intervalMinutes * 60 * 1000).toISOString();
    }
    autoSyncState.isSyncing = false;
    autoSyncState.statusMessage = 'Calendar closed (zero-load background idle)';
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('calendar:sync-status', autoSyncState);
    }
    return { success: true, skipped: true, reason: 'Calendar is closed' };
  }

  autoSyncState.isSyncing = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('calendar:sync-status', autoSyncState);
  }

  try {
    const tasks = tasksStore.get('tasks') || [];
    // Lightweight 30-day past and 60-day future rolling window for active tasks (zero load)
    const result = await scrapeAppleCalendarEvents(tasks, {
      pastDays: 30,
      rangeDays: 60,
      isBackground: source === 'auto' || source === 'startup',
      source,
    });
    
    autoSyncState.lastSyncTime = new Date().toISOString();
    if (autoSyncState.enabled && autoSyncState.intervalMinutes > 0) {
      autoSyncState.nextSyncTime = new Date(Date.now() + autoSyncState.intervalMinutes * 60 * 1000).toISOString();
    }

    if (result.success && result.newTasks && result.newTasks.length > 0) {
      const updated = [...result.newTasks, ...tasks];
      tasksStore.set('tasks', updated);
      autoSyncState.totalEventsTracked = updated.filter(t => t.calendarEventUid).length;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('calendar:auto-refreshed', {
          ...result,
          source,
          timestamp: autoSyncState.lastSyncTime,
          nextSyncTime: autoSyncState.nextSyncTime,
          totalTracked: autoSyncState.totalEventsTracked,
        });
      }

      if (Notification.isSupported() && source === 'auto') {
        new Notification({
          title: 'Task Tracker • Calendar Auto-Refresh',
          body: `Imported ${result.newTasks.length} new event(s) from Apple Calendar.`,
        }).show();
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      autoSyncState.totalEventsTracked = (tasksStore.get('tasks') || []).filter(t => t.calendarEventUid).length;
      mainWindow.webContents.send('calendar:auto-refreshed', {
        success: true,
        newTasks: [],
        source,
        message: 'All calendar events are up to date.',
        timestamp: autoSyncState.lastSyncTime,
        nextSyncTime: autoSyncState.nextSyncTime,
        totalTracked: autoSyncState.totalEventsTracked,
      });
    }

    return result;
  } catch (err) {
    console.warn('Auto-sync error:', err.message);
    return { success: false, error: err.message };
  } finally {
    autoSyncState.isSyncing = false;
    if (!isRunning) {
      await closeCalendarApp();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('calendar:sync-status', autoSyncState);
    }
  }
}

function startCalendarAutoSync() {
  const savedMinutes = Number(settingsStore.get('autoScrapeIntervalMinutes'));
  const intervalMinutes = !isNaN(savedMinutes) && savedMinutes >= 0 ? savedMinutes : 10;
  rescheduleAutoSync(intervalMinutes);

  // Initial auto-sync 3 seconds after window launch
  setTimeout(() => {
    executeCalendarSync('startup');
  }, 3000);
}

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

ipcMain.handle('calendar:getAutoSyncStatus', () => {
  return autoSyncState;
});

ipcMain.handle('calendar:forceAutoRefresh', async () => {
  return await executeCalendarSync('manual');
});

ipcMain.handle('calendar:setAutoSyncInterval', async (_event, minutes) => {
  const mins = Number(minutes);
  settingsStore.set('autoScrapeIntervalMinutes', mins);
  rescheduleAutoSync(mins);
  return autoSyncState;
});

ipcMain.handle('calendar:openApple', async () => {
  return await openAppleCalendar();
});

ipcMain.handle('calendar:closeApple', async () => {
  return await closeCalendarApp();
});

ipcMain.handle('calendar:isAppRunning', () => {
  return isCalendarAppRunning();
});

ipcMain.handle('calendar:getCalendars', async () => {
  return await getAvailableCalendars();
});

ipcMain.handle('calendar:checkPermission', async () => {
  return await checkCalendarPermission();
});

ipcMain.handle('calendar:openPrivacySettings', async (_event, target) => {
  return await openPrivacySettings(target);
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
