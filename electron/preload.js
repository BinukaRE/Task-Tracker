const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Tasks Persistence
  getTasks: () => ipcRenderer.invoke('tasks:get'),
  saveTasks: (tasks) => ipcRenderer.invoke('tasks:save', tasks),

  // Settings Persistence
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Local Apple Calendar Integration
  syncAppleCalendar: () => ipcRenderer.invoke('calendar:syncApple'),
  openAppleCalendar: () => ipcRenderer.invoke('calendar:openApple'),
  getCalendarServerInfo: () => ipcRenderer.invoke('calendar:getServerInfo'),
  subscribeWebcal: () => ipcRenderer.invoke('calendar:subscribeWebcal'),
  exportIcsFile: () => ipcRenderer.invoke('calendar:exportIcs'),

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
  onSyncTriggered: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('action:trigger-sync', subscription);
    return () => ipcRenderer.removeListener('action:trigger-sync', subscription);
  },
});
