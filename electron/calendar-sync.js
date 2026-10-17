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
 * Execute JXA (JavaScript for Automation) via stdin with timeout
 */
function runJXA(script, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-l', 'JavaScript']);
    let stdout = '';
    let stderr = '';
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        proc.kill('SIGKILL');
        reject(new Error(`JXA execution timed out (${timeoutMs}ms)`));
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
        const errText = stderr.trim() || `JXA exited with code ${code}`;
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
    const all = cleaned.split(',').map(s => s.trim()).filter(Boolean);
    const seen = new Set();
    const result = [];
    for (const name of all) {
      const lower = name.toLowerCase();
      if (
        lower.includes('birthday') ||
        lower.includes('siri') ||
        lower.includes('reminder') ||
        lower.includes('holiday')
      ) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(name);
    }
    return result;
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
  if (!Array.isArray(existingTasks)) {
    options = existingTasks || {};
    existingTasks = [];
  }

  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Apple Calendar scraping is only supported on macOS.',
      newTasks: [],
    };
  }

  // Comprehensive rolling window: default past 60 days to next 60 days (captures full current academic period)
  const pastDays = options.pastDays !== undefined ? Number(options.pastDays) : 60;
  const futureDays = options.rangeDays !== undefined ? Number(options.rangeDays) : 60;
  const targetCalendarName = options.targetCalendar || null;

  // Track existing IDs and titles so we NEVER duplicate or alter existing tasks
  const existingUids = new Set(existingTasks.map(t => t.calendarEventUid).filter(Boolean));
  const existingTitles = new Set(existingTasks.map(t => (t.title || '').toLowerCase().trim()));

  try {
    const targetFilter = targetCalendarName && targetCalendarName !== 'all' ? targetCalendarName.toLowerCase().trim() : null;

    const script = `
tell application "Calendar"
  set results to {}
  set dStart to (current date) - (${pastDays} * days)
  set dEnd to (current date) + (${futureDays} * days)
  set cList to every calendar
  set seenNames to {}
  repeat with c in cList
    set cName to name of c
    if cName is not in seenNames and cName is not in {"Birthdays", "Siri Suggestions", "Holidays in Sri Lanka", "Scheduled Reminders"} then
      set end of seenNames to cName
      try
        tell c
          set sList to (summary of every event whose start date >= dStart and start date <= dEnd)
          set uList to (uid of every event whose start date >= dStart and start date <= dEnd)
          set stList to (start date of every event whose start date >= dStart and start date <= dEnd)
          set etList to (end date of every event whose start date >= dStart and start date <= dEnd)
        end tell
        set num to count of sList
        repeat with i from 1 to num
          try
            set rawSummary to (item i of sList)
            set AppleScript's text item delimiters to {return, linefeed}
            set textItems to text items of rawSummary
            set AppleScript's text item delimiters to " "
            set cleanSummary to textItems as text

            set sDate to ((item i of stList) as «class isot» as string)
            set eDate to ""
            try
              set eDate to ((item i of etList) as «class isot» as string)
            end try

            set end of results to (cName & "<|>" & (item i of uList) & "<|>" & cleanSummary & "<|>" & sDate & "<|>" & eDate)
          end try
        end repeat
      end try
    end if
  end repeat
  set AppleScript's text item delimiters to linefeed
  return results as text
end tell
`;

    const rawOutput = await runAppleScript(script, 120000);
    const lines = (rawOutput || '').split(/\r?\n/).filter(l => l.trim().length > 0);
    const newTasks = [];

    for (const line of lines) {
      const parts = line.split('<|>');
      if (parts.length < 4) continue;

      const calName = (parts[0] || '').trim();
      const uid = (parts[1] || '').trim();
      const title = (parts[2] || '').trim();
      const startDateStr = (parts[3] || '').trim();
      const endDateStr = (parts[4] || '').trim();
      const desc = (parts[5] || '').trim();

      if (!title || !startDateStr) continue;
      if (targetFilter && calName.toLowerCase() !== targetFilter) continue;

      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        // Strictly ignore events without a valid start date - NEVER default to today!
        continue;
      }

      const endDate = endDateStr && !isNaN(new Date(endDateStr).getTime()) ? new Date(endDateStr) : null;
      const dueDate = startDate.toISOString().split('T')[0];

      // Check if task already exists in Task Flow
      const alreadyExists = (uid && existingUids.has(uid)) || existingTitles.has(title.toLowerCase());

      if (!alreadyExists) {
        // Determine appropriate priority and category
        const isExam = title.toLowerCase().includes('exam') || title.toLowerCase().includes('cat');
        const isMeeting = title.toLowerCase().includes('meeting') || title.toLowerCase().includes('mentor');

        let category = 'General';
        if (calName.toLowerCase().includes('ousl') || calName.toLowerCase().includes('university')) {
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

    return {
      success: true,
      newTasks: newTasks,
      totalDiscovered: lines.length,
      scrapedCount: newTasks.length,
      message: newTasks.length > 0
        ? `Successfully scraped ${newTasks.length} new event(s) from Apple Calendar!`
        : (lines.length > 0
            ? `Checked ${lines.length} calendar event(s). All events are already in Task Flow.`
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
