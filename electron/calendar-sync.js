const { exec } = require('child_process');
const util = require('util');
const ical = require('ical-generator').default || require('ical-generator');

const execAsync = util.promisify(exec);

const CALENDAR_NAME = 'Task Tracker Pro';

/**
 * Generate standard RFC 5545 iCalendar content for tasks
 */
function generateIcs(tasks = [], options = {}) {
  const calendar = ical({
    name: options.name || CALENDAR_NAME,
    description: 'Tasks synchronized from Task Tracker Pro Desktop App',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    prodId: {
      company: 'TaskTrackerPro',
      product: 'TaskTrackerMac',
      language: 'EN',
    },
  });

  const syncableTasks = tasks.filter(t => t.dueDate || (t.startTime && t.endTime));

  for (const task of syncableTasks) {
    let start = task.startTime ? new Date(task.startTime) : (task.dueDate ? new Date(task.dueDate) : new Date());
    let end;

    if (task.endTime) {
      end = new Date(task.endTime);
    } else if (task.estimatedMinutes) {
      end = new Date(start.getTime() + task.estimatedMinutes * 60 * 1000);
    } else {
      // Default to 1 hour
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    // Safety check for valid dates
    if (isNaN(start.getTime())) start = new Date();
    if (isNaN(end.getTime()) || end <= start) end = new Date(start.getTime() + 30 * 60 * 1000);

    const isAllDay = !task.startTime && task.dueDate && (!task.dueDate.includes('T') || task.dueDate.endsWith('T00:00:00.000Z'));

    const priorityMap = {
      urgent: 1,
      high: 3,
      medium: 5,
      low: 9,
    };

    const statusMap = {
      done: 'CANCELLED',
      todo: 'CONFIRMED',
      in_progress: 'CONFIRMED',
      review: 'CONFIRMED',
    };

    const subtasksText = (task.subtasks && task.subtasks.length > 0)
      ? `\n\nSubtasks:\n${task.subtasks.map(s => `  ${s.completed ? '✓' : '○'} ${s.title}`).join('\n')}`
      : '';

    const description = `${task.description || ''}${subtasksText}\n\n` +
      `----------------------------------------\n` +
      `Status: ${(task.status || 'todo').toUpperCase()}\n` +
      `Priority: ${(task.priority || 'medium').toUpperCase()}\n` +
      `Category: ${task.category || 'General'}\n` +
      (task.tags && task.tags.length ? `Tags: ${task.tags.join(', ')}\n` : '') +
      `[TaskTracker-ID: ${task.id}]`;

    const event = calendar.createEvent({
      id: `tasktracker-${task.id}`,
      start: isAllDay ? start : start,
      end: isAllDay ? end : end,
      allDay: isAllDay,
      summary: task.status === 'done' ? `✓ [DONE] ${task.title}` : task.title,
      description: description,
      status: statusMap[task.status] || 'CONFIRMED',
      priority: priorityMap[task.priority] || 5,
      categories: task.category ? [{ name: task.category }] : undefined,
    });

    // Add reminder alarm if requested
    if (task.reminderMinutesBefore !== undefined && task.reminderMinutesBefore >= 0) {
      event.createAlarm({
        type: 'display',
        trigger: task.reminderMinutesBefore * 60, // in seconds before start
        description: `Reminder: ${task.title}`,
      });
    }
  }

  return calendar.toString();
}

/**
 * Direct AppleScript execution to sync tasks with macOS Calendar.app
 */
async function syncTasksWithAppleCalendar(tasks = []) {
  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Direct Apple Calendar synchronization is only supported on macOS.',
    };
  }

  const syncableTasks = tasks.filter(t => t.syncWithCalendar !== false && (t.dueDate || t.startTime));

  if (syncableTasks.length === 0) {
    return {
      success: true,
      message: 'No tasks scheduled with due dates to synchronize.',
      syncedCount: 0,
    };
  }

  try {
    // Generate an AppleScript that:
    // 1. Checks or creates the "Task Tracker Pro" calendar
    // 2. Iterates tasks and either updates existing event or creates new one
    const scriptParts = [
      `tell application "Calendar"`,
      `  set targetCalName to "${CALENDAR_NAME}"`,
      `  set targetCal to missing value`,
      `  repeat with aCal in calendars`,
      `    if name of aCal is targetCalName then`,
      `      set targetCal to aCal`,
      `      exit repeat`,
      `    end if`,
      `  end repeat`,
      `  if targetCal is missing value then`,
      `    set targetCal to (make new calendar with properties {name:targetCalName, color:{14000, 26000, 65000}})`,
      `  end if`,
    ];

    for (const task of syncableTasks) {
      let start = task.startTime ? new Date(task.startTime) : (task.dueDate ? new Date(task.dueDate) : new Date());
      let end = task.endTime ? new Date(task.endTime) : new Date(start.getTime() + (task.estimatedMinutes || 60) * 60 * 1000);
      
      const safeTitle = (task.status === 'done' ? `✓ [DONE] ${task.title}` : task.title)
        .replace(/["\\]/g, '\\$&')
        .replace(/\n/g, ' ');
      
      const safeDesc = `Status: ${task.status} | Priority: ${task.priority} | TaskID: ${task.id}\\n${(task.description || '').replace(/["\\]/g, '\\$&').replace(/\n/g, '\\n')}`;

      // AppleScript dates: "Month Day, Year Hours:Minutes:Seconds"
      const formatAppleDate = (d) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const m = months[d.getMonth()];
        const day = d.getDate();
        const y = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `date "${m} ${day}, ${y} ${hh}:${mm}:${ss}"`;
      };

      const startDateApple = formatAppleDate(start);
      const endDateApple = formatAppleDate(end);
      const taskIdTag = `TaskTracker-ID: ${task.id}`;

      scriptParts.push(
        `  -- Sync task: ${task.id}`,
        `  set existingEvent to missing value`,
        `  tell targetCal`,
        `    set allEvents to (every event whose description contains "${taskIdTag}")`,
        `    if (count of allEvents) > 0 then`,
        `      set existingEvent to first item of allEvents`,
        `    end if`,
        `    if existingEvent is not missing value then`,
        `      set summary of existingEvent to "${safeTitle}"`,
        `      set start date of existingEvent to ${startDateApple}`,
        `      set end date of existingEvent to ${endDateApple}`,
        `      set description of existingEvent to "${safeDesc}\\n${taskIdTag}"`,
        `    else`,
        `      make new event at end of events with properties {summary:"${safeTitle}", start date:${startDateApple}, end date:${endDateApple}, description:"${safeDesc}\\n${taskIdTag}"}`,
        `    end if`,
        `  end tell`
      );
    }

    scriptParts.push(`end tell`);

    const fullScript = scriptParts.join('\n');
    
    // Execute AppleScript via osascript
    await execAsync(`osascript -e '${fullScript.replace(/'/g, "'\\''")}'`);

    return {
      success: true,
      message: `Successfully synchronized ${syncableTasks.length} task(s) to "${CALENDAR_NAME}" in macOS Calendar!`,
      syncedCount: syncableTasks.length,
    };
  } catch (err) {
    console.error('AppleScript sync error:', err);
    return {
      success: false,
      error: err.message || 'Failed to sync with macOS Calendar via AppleScript.',
      details: 'Please grant Calendar permissions to Task Tracker Pro if prompted by macOS, or use the 1-Click WebCal live subscription link.',
    };
  }
}

/**
 * Open macOS Calendar application
 */
async function openAppleCalendar() {
  if (process.platform === 'darwin') {
    try {
      await execAsync('open -a Calendar');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Platform is not macOS' };
}

module.exports = {
  CALENDAR_NAME,
  generateIcs,
  syncTasksWithAppleCalendar,
  openAppleCalendar,
};
