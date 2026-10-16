const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// System calendars that should not be scraped as user tasks
const SYSTEM_CALENDARS = [
  'birthdays',
  'siri suggestions',
  'holidays in sri lanka',
  'scheduled reminders',
];

/**
 * Execute AppleScript via stdin with safety timeout (plain text output, no '-s s' quotes)
 */
function runAppleScript(script, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript');
    let stdout = '';
    let stderr = '';
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        proc.kill('SIGKILL');
        reject(new Error(`AppleScript execution timed out (${timeoutMs}ms)`));
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
        const errText = stderr.trim() || `AppleScript exited with code ${code}`;
        reject(new Error(errText));
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
 * Check if Task Flow is authorized to communicate with Apple Calendar
 */
async function checkCalendarPermission() {
  if (process.platform !== 'darwin') {
    return { authorized: false, isMac: false, message: 'Only macOS supports Apple Calendar' };
  }

  const script = `
tell application "Calendar"
  try
    set calCount to count of calendars
    return "OK:" & (calCount as string)
  on error errMsg number errNum
    return "ERR:" & (errNum as string) & ":" & errMsg
  end try
end tell
`;

  try {
    const raw = await runAppleScript(script, 6000);
    const cleaned = raw.replace(/^"|"$/g, '').trim();

    if (cleaned.startsWith('OK:')) {
      const count = parseInt(cleaned.replace('OK:', ''), 10) || 0;
      return { authorized: true, isMac: true, calendarCount: count };
    } else {
      const is1743 = cleaned.includes('-1743') || cleaned.toLowerCase().includes('not authorized');
      return {
        authorized: false,
        isMac: true,
        isPermissionError: is1743,
        error: cleaned,
        message: is1743
          ? 'Not authorized to access Apple Calendar (-1743). Please grant permission in System Settings.'
          : cleaned,
      };
    }
  } catch (err) {
    const errMsg = err.message || '';
    const is1743 = errMsg.includes('-1743') || errMsg.toLowerCase().includes('not authorized');
    return {
      authorized: false,
      isMac: true,
      isPermissionError: is1743,
      error: errMsg,
      message: is1743
        ? 'Not authorized to access Apple Calendar (-1743). Please grant permission in System Settings.'
        : errMsg,
    };
  }
}

/**
 * Get list of available calendar names
 */
async function getAvailableCalendars() {
  if (process.platform !== 'darwin') return [];
  try {
    const script = `tell application "Calendar" to get name of every calendar`;
    const namesRaw = await runAppleScript(script, 5000);
    const cleaned = namesRaw.replace(/^"|"$/g, '').trim();
    if (!cleaned) return [];
    return cleaned.split(',').map(s => s.trim()).filter(Boolean);
  } catch (err) {
    return [];
  }
}

/**
 * PURE READ-ONLY SCRAPER:
 * Scrapes events from Apple Calendar into Task Flow.
 * STRICT POLICY:
 * - Read-only: NEVER modifies, edits, creates, or deletes any event in Apple Calendar.
 * - Does not accept edits from Apple Calendar to existing tasks.
 */
async function scrapeAppleCalendarEvents(existingTasks = [], options = {}) {
  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Apple Calendar scraping is only supported on macOS.',
      newTasks: [],
    };
  }

  // Generous rolling window: default past 60 days to next 90 days (captures semester exams and active schedules)
  const pastDays = options.pastDays !== undefined ? Number(options.pastDays) : 60;
  const futureDays = options.rangeDays !== undefined ? Number(options.rangeDays) : 90;
  const targetCalendarName = options.targetCalendar || null;

  // Track existing IDs and titles so we NEVER duplicate or alter existing tasks
  const existingUids = new Set(existingTasks.map(t => t.calendarEventUid).filter(Boolean));
  const existingTitles = new Set(existingTasks.map(t => (t.title || '').toLowerCase().trim()));

  try {
    // 1. Fetch all calendar names
    const getNamesScript = `tell application "Calendar" to get name of every calendar`;
    const namesRaw = await runAppleScript(getNamesScript, 6000);
    const cleanedNames = namesRaw.replace(/^"|"$/g, '').trim();
    const allCalNames = cleanedNames.split(',').map(s => s.trim()).filter(Boolean);

    if (allCalNames.length === 0) {
      return {
        success: true,
        newTasks: [],
        totalDiscovered: 0,
        scrapedCount: 0,
        message: 'No calendars found in Apple Calendar.',
      };
    }

    const discoveredEvents = [];
    const newTasks = [];

    // 2. Iterate each user calendar safely with individual 10s timeouts
    for (let i = 1; i <= allCalNames.length; i++) {
      const calName = allCalNames[i - 1];
      const calLower = calName.toLowerCase();

      // Skip system or unrequested calendars
      if (SYSTEM_CALENDARS.some(s => calLower.includes(s))) {
        continue;
      }
      if (targetCalendarName && targetCalendarName !== 'all' && calName !== targetCalendarName) {
        continue;
      }

      const calScript = `
tell application "Calendar"
  set nowRef to (current date)
  set startDate to nowRef - (${pastDays} * days)
  set endDate to nowRef + (${futureDays} * days)
  set res to {}
  try
    set targetCal to calendar ${i}
    set evs to (events of targetCal whose start date >= startDate and start date <= endDate)
    repeat with ev in evs
      try
        set evUid to uid of ev
        set evTitle to summary of ev
        set evStart to (start date of ev as «class isot» as string)
        set evEnd to (end date of ev as «class isot» as string)
        set evDesc to description of ev
        if evDesc is missing value then set evDesc to ""
        set end of res to (evUid & ":::SEP:::" & evTitle & ":::SEP:::" & evStart & ":::SEP:::" & evEnd & ":::SEP:::" & evDesc)
      end try
    end repeat
  end try
  set AppleScript's text item delimiters to ":::ROW:::"
  return res as string
end tell
`;

      try {
        const rawOutput = await runAppleScript(calScript, 10000);
        if (rawOutput && rawOutput.length > 0) {
          const rows = rawOutput.split(':::ROW:::').filter(r => r.trim().length > 0);

          for (const row of rows) {
            const parts = row.split(':::SEP:::');
            if (parts.length >= 4) {
              const uid = parts[0].trim();
              const title = parts[1].trim();
              const startDateStr = parts[2].trim();
              const endDateStr = parts[3].trim();
              const desc = (parts[4] || '').trim();

              const startDate = new Date(startDateStr);
              const endDate = endDateStr ? new Date(endDateStr) : null;
              const dueDate = !isNaN(startDate.getTime())
                ? startDate.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

              discoveredEvents.push({
                uid,
                title,
                startDateStr,
                endDateStr,
                desc,
                calName,
              });

              // Check if task already exists in Task Flow
              const alreadyExists = (uid && existingUids.has(uid)) || existingTitles.has(title.toLowerCase());

              if (!alreadyExists) {
                // Determine appropriate priority and category
                const isExam = title.toLowerCase().includes('exam') || title.toLowerCase().includes('cat');
                const isMeeting = title.toLowerCase().includes('meeting') || title.toLowerCase().includes('mentor');

                let category = 'General';
                if (calName.includes('ousl') || calName.toLowerCase().includes('university')) {
                  category = 'University';
                } else if (calName === 'Work') {
                  category = 'Work';
                } else if (calName === 'Personal' || calName.includes('@gmail')) {
                  category = 'Personal';
                }

                newTasks.push({
                  id: 'task-cal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                  title: title,
                  description: desc ? `[${calName}]\n\n${desc}` : `[Apple Calendar: ${calName}]`,
                  status: 'todo',
                  priority: isExam ? 'urgent' : (isMeeting ? 'high' : 'medium'),
                  category: category,
                  tags: ['AppleCalendar', calName],
                  dueDate: dueDate,
                  startTime: !isNaN(startDate.getTime()) ? startDate.toISOString() : null,
                  endTime: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : null,
                  estimatedMinutes: 60,
                  actualMinutes: 0,
                  subtasks: [],
                  calendarEventUid: uid,
                  isCalendarScraped: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });

                existingTitles.add(title.toLowerCase());
                if (uid) existingUids.add(uid);
              }
            }
          }
        }
      } catch (calErr) {
        // Individual calendar error or timeout - continue to other calendars without failing
        console.warn(`Calendar "${calName}" scrape skipped:`, calErr.message);
      }
    }

    return {
      success: true,
      newTasks: newTasks,
      totalDiscovered: discoveredEvents.length,
      scrapedCount: newTasks.length,
      message: newTasks.length > 0
        ? `Successfully scraped ${newTasks.length} new event(s) from Apple Calendar!`
        : (discoveredEvents.length > 0
            ? `Checked ${discoveredEvents.length} calendar event(s). All events are already in Task Flow.`
            : 'No events found in Apple Calendar for the selected date range.'),
    };
  } catch (err) {
    console.error('Apple Calendar scraping error:', err);
    const errMsg = err.message || '';
    const isPermissionError = errMsg.includes('-1743') ||
                              errMsg.toLowerCase().includes('not authorized') ||
                              errMsg.toLowerCase().includes('permission');

    return {
      success: false,
      newTasks: [],
      error: isPermissionError ? 'macOS Permission Required' : 'Calendar Scrape Failed',
      isPermissionError,
      details: isPermissionError
        ? 'macOS blocked Task Flow from accessing Calendar (Error -1743). Please open System Settings > Privacy & Security > Automation and enable Calendar.'
        : `Could not access Apple Calendar: ${errMsg}.`,
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

/**
 * Open macOS Privacy & Security Settings directly to Automation or Calendars
 */
async function openPrivacySettings(target = 'automation') {
  if (process.platform === 'darwin') {
    try {
      const pane = target === 'calendars' ? 'Privacy_Calendars' : 'Privacy_Automation';
      await execAsync(`open "x-apple.systempreferences:com.apple.preference.security?${pane}"`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Platform is not macOS' };
}

module.exports = {
  scrapeAppleCalendarEvents,
  checkCalendarPermission,
  getAvailableCalendars,
  openAppleCalendar,
  openPrivacySettings,
};
