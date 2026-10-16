const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ical = require('ical-generator').default || require('ical-generator');

const execAsync = util.promisify(exec);

const CALENDAR_NAME = 'Task Flow';

/**
 * Generate standard RFC 5545 iCalendar content for tasks
 */
function generateIcs(tasks = [], options = {}) {
  const calendar = ical({
    name: options.name || CALENDAR_NAME,
    description: 'Tasks synchronized from Task Flow macOS Desktop App',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    prodId: {
      company: 'TaskFlow',
      product: 'TaskFlowMac',
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
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

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
      id: `taskflow-${task.id}`,
      start: start,
      end: end,
      allDay: isAllDay,
      summary: task.status === 'done' ? `✓ [DONE] ${task.title}` : task.title,
      description: description,
      status: statusMap[task.status] || 'CONFIRMED',
      priority: priorityMap[task.priority] || 5,
      categories: task.category ? [{ name: task.category }] : undefined,
    });

    if (task.reminderMinutesBefore !== undefined && task.reminderMinutesBefore >= 0) {
      event.createAlarm({
        type: 'display',
        trigger: task.reminderMinutesBefore * 60,
        description: `Reminder: ${task.title}`,
      });
    }
  }

  return calendar.toString();
}

/**
 * Execute AppleScript cleanly via stdin with timeout
 */
function runAppleScript(script, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-s', 's']);
    let stdout = '';
    let stderr = '';
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        proc.kill();
        reject(new Error('AppleScript execution timed out'));
      }
    }, timeoutMs);

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `AppleScript exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(script);
    proc.stdin.end();
  });
}

/**
 * Sync tasks with Apple Calendar using AppleScript, with fallback to opening .ics/WebCal
 */
async function syncTasksWithAppleCalendar(tasks = []) {
  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Direct Apple Calendar synchronization is only supported on macOS.',
    };
  }

  const syncableTasks = tasks.filter(t => t.syncWithCalendar !== false && (t.dueDate || t.startTime));

  // Always write a fresh .ics file to temp directory
  try {
    const icsContent = generateIcs(tasks);
    const tempIcsPath = path.join(os.tmpdir(), 'TaskFlow.ics');
    fs.writeFileSync(tempIcsPath, icsContent, 'utf8');
  } catch (e) {
    console.error('Failed to write temp .ics:', e);
  }

  if (syncableTasks.length === 0) {
    return {
      success: true,
      message: 'No tasks scheduled with due dates to synchronize.',
      syncedCount: 0,
    };
  }

  try {
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
        `  tell targetCal`,
        `    set allEvents to (every event whose description contains "${taskIdTag}")`,
        `    if (count of allEvents) > 0 then`,
        `      set existingEvent to first item of allEvents`,
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
    await runAppleScript(fullScript, 6000);

    return {
      success: true,
      method: 'applescript',
      message: `Successfully synchronized ${syncableTasks.length} task(s) to "${CALENDAR_NAME}" in macOS Calendar!`,
      syncedCount: syncableTasks.length,
    };
  } catch (err) {
    console.warn('Direct AppleScript sync notice, activating native calendar open fallback:', err.message);

    // Automatic Fallback: Open generated .ics in Apple Calendar
    try {
      const tempIcsPath = path.join(os.tmpdir(), 'TaskFlow.ics');
      if (fs.existsSync(tempIcsPath)) {
        await execAsync(`open -a Calendar "${tempIcsPath}"`);
      } else {
        await execAsync('open -a Calendar');
      }
      return {
        success: true,
        method: 'native-open',
        message: `Opened ${syncableTasks.length} task(s) directly in Apple Calendar!`,
        syncedCount: syncableTasks.length,
        details: 'Import into your preferred calendar or subscribe to the live feed for auto-refresh.',
      };
    } catch (openErr) {
      return {
        success: false,
        error: openErr.message,
        details: 'Could not launch Apple Calendar. You can use the WebCal 1-click subscription link.',
      };
    }
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

/**
 * 1-Click Connect Calendar: launches Apple Calendar and triggers subscription or import
 */
async function connectCalendar(tasks = []) {
  if (process.platform !== 'darwin') {
    return { success: false, error: 'Platform is not macOS' };
  }

  try {
    // 1. Write fresh .ics to temp
    const icsContent = generateIcs(tasks);
    const tempIcsPath = path.join(os.tmpdir(), 'TaskFlow.ics');
    fs.writeFileSync(tempIcsPath, icsContent, 'utf8');

    // 2. Open Apple Calendar
    await execAsync('open -a Calendar');

    // 3. Try to subscribe to the WebCal feed
    const webcalUrl = 'webcal://localhost:52884/calendar.ics';
    await execAsync(`open "${webcalUrl}"`).catch(() => {
      // If webcal protocol fails, open the .ics file directly
      return execAsync(`open -a Calendar "${tempIcsPath}"`);
    });

    return {
      success: true,
      message: 'Connected to macOS Calendar! Check the Apple Calendar subscription prompt.',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Scrapes ONLY NEW events from Apple Calendar into Task Flow.
 * Strictly ignores and rejects any edits made in Apple Calendar to existing tasks.
 */
async function scrapeNewEventsFromAppleCalendar(existingTasks = []) {
  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Apple Calendar scraping is only supported on macOS.',
      newTasks: []
    };
  }

  const existingTitles = new Set(existingTasks.map(t => (t.title || '').toLowerCase().trim()));

  const script = `
tell application "Calendar"
  set results to ""
  set nowRef to (current date)
  set startSearch to nowRef - (2 * days)
  set endSearch to nowRef + (30 * days)

  repeat with aCal in calendars
    set calName to name of aCal
    try
      set evs to (every event of aCal whose (start date >= startSearch and start date <= endSearch))
      repeat with ev in evs
        set evDesc to (description of ev)
        if evDesc is missing value then set evDesc to ""
        
        -- Filter rule: Only scrape if it DOES NOT have an existing Task Flow ID tag
        -- Any existing Task Flow task events that were modified in Calendar are strictly ignored!
        if (evDesc does not contain "TaskTracker-ID") and (evDesc does not contain "taskflow-") then
          set evTitle to (summary of ev)
          if evTitle is not missing value and evTitle is not "" then
            set evStart to (start date of ev as «class isot» as string)
            set evEnd to (end date of ev as «class isot» as string)
            set results to results & evTitle & ":::SEP:::" & evStart & ":::SEP:::" & evEnd & ":::SEP:::" & evDesc & ":::SEP:::" & calName & ":::ROW:::"
          end if
        end if
      end repeat
    end try
  end repeat
  return results
end tell
`;

  try {
    const rawOutput = await runAppleScript(script, 8000);
    const newTasks = [];

    if (rawOutput && rawOutput.length > 0) {
      const rows = rawOutput.split(':::ROW:::').filter(r => r.trim().length > 0);

      for (const row of rows) {
        const parts = row.split(':::SEP:::');
        if (parts.length >= 4) {
          const title = parts[0].trim();
          const startDateStr = parts[1].trim();
          const endDateStr = parts[2].trim();
          const desc = parts[3].trim();
          const calName = parts[4] ? parts[4].trim() : 'Calendar';

          // Strictly filter: Only import if not already an existing task by title
          if (!existingTitles.has(title.toLowerCase())) {
            const startDate = new Date(startDateStr);
            const dueDate = !isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            newTasks.push({
              id: 'task-cal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              title: title,
              description: desc ? `Imported from Apple Calendar (${calName})\n\n${desc}` : `Imported from Apple Calendar (${calName})`,
              status: 'todo',
              priority: 'medium',
              category: calName === 'Work' ? 'Work' : (calName === 'Personal' ? 'Personal' : 'General'),
              tags: ['CalendarImport'],
              dueDate: dueDate,
              startTime: !isNaN(startDate.getTime()) ? startDate.toISOString() : null,
              endTime: endDateStr && !isNaN(new Date(endDateStr).getTime()) ? new Date(endDateStr).toISOString() : null,
              estimatedMinutes: 60,
              actualMinutes: 0,
              subtasks: [],
              syncWithCalendar: true,
              reminderMinutesBefore: 15,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            existingTitles.add(title.toLowerCase());
          }
        }
      }
    }

    return {
      success: true,
      newTasks: newTasks,
      scrapedCount: newTasks.length,
      ignoredEdits: true,
      message: newTasks.length > 0
        ? `Successfully imported ${newTasks.length} new event(s) from Apple Calendar! (Any edits to existing tasks were ignored).`
        : 'Checked Apple Calendar: No new external events found. Existing task edits were ignored as per policy.',
    };
  } catch (err) {
    console.error('Apple Calendar scraping notice:', err);
    return {
      success: false,
      newTasks: [],
      error: err.message,
      details: 'Could not access Apple Calendar. Ensure Calendar permissions are granted in System Settings > Privacy & Security > Calendars.',
    };
  }
}

module.exports = {
  CALENDAR_NAME,
  generateIcs,
  syncTasksWithAppleCalendar,
  openAppleCalendar,
  connectCalendar,
  scrapeNewEventsFromAppleCalendar,
};
