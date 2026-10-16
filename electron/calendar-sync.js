const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * Execute AppleScript via stdin with safety timeout
 */
function runAppleScript(script, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-s', 's']);
    let stdout = '';
    let stderr = '';
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        proc.kill();
        reject(new Error('AppleScript execution timed out (12s)'));
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
    const result = await runAppleScript(script, 5000);
    if (result.startsWith('OK:')) {
      const count = parseInt(result.replace('OK:', ''), 10) || 0;
      return { authorized: true, isMac: true, calendarCount: count };
    } else {
      const is1743 = result.includes('-1743') || result.toLowerCase().includes('not authorized');
      return {
        authorized: false,
        isMac: true,
        isPermissionError: is1743,
        error: result,
        message: is1743
          ? 'Not authorized to send Apple events to Calendar (-1743)'
          : result,
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
        ? 'Not authorized to send Apple events to Calendar (-1743)'
        : errMsg,
    };
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

  const rangeDays = options.rangeDays || 30;

  // Track existing IDs and titles so we NEVER duplicate or alter existing tasks
  const existingUids = new Set(existingTasks.map(t => t.calendarEventUid).filter(Boolean));
  const existingTitles = new Set(existingTasks.map(t => (t.title || '').toLowerCase().trim()));

  // Multi-tier resilient AppleScript:
  // 1. Attempts date-filtered query
  // 2. If 'whose' clause throws an error or fails due to macOS AppleScript bugs, falls back to full calendar inspection
  const script = `
tell application "Calendar"
  set eventList to {}
  set nowRef to (current date)
  set startDate to nowRef - (7 * days)
  set endDate to nowRef + (${rangeDays} * days)

  set calList to calendars

  repeat with aCal in calList
    set cName to name of aCal
    set foundEvs to {}

    -- Strategy A: Fast filtered query
    try
      set foundEvs to (every event of aCal whose (start date ≥ startDate and start date ≤ endDate))
    on error
      set foundEvs to {}
    end try

    -- Strategy B: Fallback if Strategy A returned 0 (bypasses AppleScript whose clause bugs with date objects)
    if (count of foundEvs) is 0 then
      try
        set allEvs to every event of aCal
        repeat with ev in allEvs
          try
            set sDate to (start date of ev)
            if (sDate ≥ startDate and sDate ≤ endDate) then
              set end of foundEvs to ev
            end if
          end try
        end repeat
      on error
        -- Inaccessible or empty calendar
      end try
    end if

    -- Extract metadata from found events
    repeat with ev in foundEvs
      try
        set evTitle to (summary of ev)
        if evTitle is not missing value and evTitle is not "" then
          set evDesc to (description of ev)
          if evDesc is missing value then set evDesc to ""
          
          set evUid to (uid of ev)
          if evUid is missing value then set evUid to ""
          
          set evStart to (start date of ev)
          set evEnd to (end date of ev)
          
          set evStartIso to (evStart as «class isot» as string)
          set evEndIso to (evEnd as «class isot» as string)
          
          set end of eventList to (evUid & ":::SEP:::" & evTitle & ":::SEP:::" & evStartIso & ":::SEP:::" & evEndIso & ":::SEP:::" & evDesc & ":::SEP:::" & cName)
        end if
      end try
    end repeat
  end repeat

  set AppleScript's text item delimiters to ":::ROW:::"
  return eventList as string
end tell
`;

  try {
    const rawOutput = await runAppleScript(script, 15000);
    const discoveredEvents = [];
    const newTasks = [];

    if (rawOutput && rawOutput.length > 0) {
      const rows = rawOutput.split(':::ROW:::').filter(r => r.trim().length > 0);

      for (const row of rows) {
        const parts = row.split(':::SEP:::');
        if (parts.length >= 6) {
          const uid = parts[0].trim();
          const title = parts[1].trim();
          const startDateStr = parts[2].trim();
          const endDateStr = parts[3].trim();
          const desc = parts[4].trim();
          const calName = parts[5].trim();

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

          // STRICT SCRAPE FILTER:
          // 1. Must NOT already be scraped (check UID)
          // 2. Must NOT match an existing task title
          // 3. Edits to existing tasks in Calendar are strictly NOT applied to Task Flow
          const alreadyExists = (uid && existingUids.has(uid)) || existingTitles.has(title.toLowerCase());

          if (!alreadyExists) {
            newTasks.push({
              id: 'task-cal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              title: title,
              description: desc ? `[Apple Calendar: ${calName}]\n\n${desc}` : `[Apple Calendar: ${calName}]`,
              status: 'todo',
              priority: calName.toLowerCase().includes('work') ? 'high' : 'medium',
              category: calName === 'Work' ? 'Work' : (calName === 'Personal' ? 'Personal' : 'General'),
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

    return {
      success: true,
      newTasks: newTasks,
      totalDiscovered: discoveredEvents.length,
      scrapedCount: newTasks.length,
      message: newTasks.length > 0
        ? `Successfully scraped ${newTasks.length} new event(s) from Apple Calendar!`
        : (discoveredEvents.length > 0
            ? `Found ${discoveredEvents.length} calendar event(s). No new events to import (existing tasks remain protected and unedited).`
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
        ? 'macOS blocked Task Flow from accessing Calendar (Error -1743). Please open System Settings > Privacy & Security > Automation and enable Calendar for Task Flow.'
        : `Could not access Apple Calendar (${errMsg}). Ensure Calendar.app is open.`,
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
  openAppleCalendar,
  openPrivacySettings,
};
