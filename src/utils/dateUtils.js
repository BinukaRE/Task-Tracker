/**
 * Utility functions for date parsing, formatting, and chronological sorting
 */

export function toLocalDateString(d = new Date()) {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a millisecond timestamp for chronological ascending sorting:
 * 1. Exact startTime takes highest precision priority.
 * 2. Due date with time is parsed as exact time.
 * 3. Date-only dueDate (YYYY-MM-DD) is anchored to 23:59:59.999 local time
 *    so scheduled timed events throughout that day sort first in chronological order.
 * 4. Unscheduled tasks without any date/time return Infinity (sorted to the bottom).
 */
export function getTaskSortTimestamp(task) {
  if (!task) return Infinity;

  // 1. If task has an explicit startTime
  if (task.startTime) {
    try {
      const time = new Date(task.startTime).getTime();
      if (!isNaN(time)) return time;
    } catch {}
  }

  // 2. If task has a dueDate
  if (task.dueDate) {
    const raw = String(task.dueDate).trim();
    // Check if ISO or contains time (e.g. 2026-10-18T14:30)
    if (raw.includes('T') && raw.length > 10) {
      try {
        const time = new Date(raw).getTime();
        if (!isNaN(time)) return time;
      } catch {}
    }

    // YYYY-MM-DD date string
    const datePart = raw.split('T')[0];
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      // Local time at end of day so timed events on the same date appear before untimed tasks
      const localEndOfDay = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
      if (!isNaN(localEndOfDay)) return localEndOfDay;
    }

    const fallback = new Date(raw).getTime();
    if (!isNaN(fallback)) return fallback;
  }

  return Infinity;
}

/**
 * Compares two tasks chronologically by ascending time.
 * If timestamps are identical, falls back to alphabetical title sort.
 */
export function compareTasksByAscendingTime(a, b) {
  const timeA = getTaskSortTimestamp(a);
  const timeB = getTaskSortTimestamp(b);
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return (a.title || '').localeCompare(b.title || '');
}

/**
 * Format event time string (e.g. "10:30 AM" or "10:30 AM – 1:30 PM")
 */
export function formatEventTimeRange(task) {
  if (!task || !task.startTime) return null;
  try {
    const s = new Date(task.startTime);
    if (isNaN(s.getTime())) return null;
    const startStr = s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (task.endTime) {
      const e = new Date(task.endTime);
      if (!isNaN(e.getTime())) {
        const endStr = e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `${startStr} – ${endStr}`;
      }
    }
    return startStr;
  } catch {
    return null;
  }
}
