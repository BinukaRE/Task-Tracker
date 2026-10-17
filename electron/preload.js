const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Tasks Persistence
  getTasks: () => ipcRenderer.invoke('tasks:get'),
  saveTasks: (tasks) => ipcRenderer.invoke('tasks:save', tasks),

  // Settings Persistence
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Read-Only Apple Calendar Scraper
  scrapeCalendarEvents: (options) => ipcRenderer.invoke('calendar:scrape', options),
  checkCalendarPermission: () => ipcRenderer.invoke('calendar:checkPermission'),
  openAppleCalendar: () => ipcRenderer.invoke('calendar:openApple'),
  closeAppleCalendar: () => ipcRenderer.invoke('calendar:closeApple'),
  getAvailableCalendars: () => ipcRenderer.invoke('calendar:getCalendars'),
  openPrivacySettings: (target) => ipcRenderer.invoke('calendar:openPrivacySettings', target),
  getAutoSyncStatus: () => ipcRenderer.invoke('calendar:getAutoSyncStatus'),
  setAutoSyncInterval: (minutes) => ipcRenderer.invoke('calendar:setAutoSyncInterval', minutes),
  forceAutoRefresh: () => ipcRenderer.invoke('calendar:forceAutoRefresh'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System Notifications
  sendNotification: (options) => ipcRenderer.invoke('system:notify', options),

  // Event Listeners
  onQuickTaskTriggered: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('action:quick-task', subscription);
    return () => ipcRenderer.removeListener('action:quick-task', subscription);
  },
  onScrapeTriggered: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('action:trigger-scrape', subscription);
    return () => ipcRenderer.removeListener('action:trigger-scrape', subscription);
  },
  onScraped: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('action:scraped', subscription);
    return () => ipcRenderer.removeListener('action:scraped', subscription);
  },
  onCalendarAutoRefreshed: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('calendar:auto-refreshed', subscription);
    return () => ipcRenderer.removeListener('calendar:auto-refreshed', subscription);
  },
  onCalendarSyncStatus: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('calendar:sync-status', subscription);
    return () => ipcRenderer.removeListener('calendar:sync-status', subscription);
  },
});
