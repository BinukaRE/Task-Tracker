# Task Flow: Apple Calendar User Manual & Integration Guide 🗓️⚡

This manual explains how **Task Flow** connects with your native macOS Apple Calendar (`Calendar.app`), how events are synchronized, and how data integrity is strictly enforced.

---

## 🛡️ Core Data Flow & Integrity Policy

Task Flow uses an **authoritative, single-source-of-truth architecture**:

1. **Task Flow is the Source of Truth**:
   - All tasks, subtask checklists, status (`To Do`, `In Progress`, `In Review`, `Completed`), priorities, and notes belong to Task Flow.
   - When tasks are scheduled, Task Flow automatically pushes them into Apple Calendar so you can see them on your timeline alongside your daily routine.

2. **Scraping NEW Data Only**:
   - The system can scrape your Apple Calendar to discover **new events** (e.g. meetings, appointments, personal reminders added directly in Apple Calendar).
   - Any newly discovered event is automatically imported into Task Flow as a new task with its due date, time, and title.

3. **Calendar Edits are NOT Accepted**:
   - If an existing Task Flow event is edited, renamed, moved, or altered inside Apple Calendar, **Task Flow intentionally ignores and rejects those edits**.
   - **Why?** Apple Calendar only stores basic event strings and lacks Task Flow's subtask checklists, Kanban stages, and custom priority metadata. Rejecting external edits protects your tasks from accidental data loss, schema corruption, or conflicting modifications.
   - To update a task's title, time, or details, always make the change directly inside **Task Flow**. It will immediately push the updated event to Apple Calendar.

---

## 🚀 Step-by-Step Connection Instructions

### Method 1: 1-Click Connect (Recommended)

1. Open **Task Flow**.
2. Click **"1-Click Connect Calendar"** in the left sidebar or open the **Calendar Hub** from the top header.
3. macOS Apple Calendar will automatically launch and display a subscription prompt:
   > *"Subscribe to calendar: Task Flow?"*
4. Click **Subscribe**.
5. In the calendar settings dialog:
   - **Name**: `Task Flow`
   - **Location**: Select **iCloud** (to automatically sync tasks to your iPhone, iPad, and Apple Watch!).
   - **Auto-refresh**: Choose **Every 15 minutes** or **Every hour**.
   - **Remove Alerts**: Uncheck this if you wish to receive native macOS/iOS task reminder alarms.
6. Click **OK**. Your calendar is now linked!

---

### Method 2: Direct AppleScript Sync (Push Tasks)

1. Click **"Sync Calendar"** in the top bar or menu bar tray.
2. If macOS prompts:
   > *"Task Flow wants to access Calendars"*
   Click **Allow / OK**.
3. Task Flow will automatically create a dedicated **"Task Flow"** calendar in Apple Calendar and push all your scheduled tasks, subtasks, notes, and alarms.

---

### Method 3: Scraping New Events from Apple Calendar

1. Create any event in Apple Calendar (for example: *"10:00 AM Client Meeting"* or *"Doctor Appointment"*).
2. In Task Flow, open **Calendar Hub** and click **"Scrape New Events from Calendar"**.
3. Task Flow scans your Apple Calendar for new events created within a rolling window:
   - Events without an existing Task Flow ID are imported as new tasks in your **To Do** list.
   - Any modifications made in Apple Calendar to existing tasks are safely filtered out and ignored.

---

### Method 4: Standalone .ics Export

1. Open **Calendar Hub** and click **"Export iCalendar (.ics)"**.
2. Save the `.ics` file anywhere on your Mac.
3. Double-click the file to import tasks into Apple Calendar, Google Calendar, or Outlook.

---

## 📱 Mobile Sync (iPhone, iPad & Apple Watch)

To see your Task Flow schedule on your mobile devices:
1. When subscribing to the WebCal feed on your Mac, set **Location** to **iCloud** (instead of "On My Mac").
2. Your iPhone and iPad will automatically sync the **Task Flow** calendar through your iCloud account!

---

## 🔧 macOS Permissions & Troubleshooting

### If AppleScript reports a permission error:
1. Open macOS **System Settings** (`⌘ + Space` → `System Settings`).
2. Go to **Privacy & Security** → **Calendars**.
3. Locate **Task Flow** (or **Electron**) and toggle the switch to **ON**.
4. Restart Task Flow:
   ```bash
   npm start
   ```

### If you prefer not to grant AppleScript permissions:
- Use **Method 1 (1-Click WebCal Subscription)**. WebCal is a standard macOS protocol that connects without requiring any accessibility or scripting permissions.

---

## 📋 Summary Table

| Action | Supported? | Description |
| :--- | :---: | :--- |
| **Push tasks from Task Flow → Apple Calendar** | ✅ **Yes** | Automatic with alarms, subtasks & priority notes. |
| **Scrape NEW events from Apple Calendar → Task Flow** | ✅ **Yes** | Imports external meetings/appointments as tasks. |
| **Accept edits made in Apple Calendar → Task Flow** | ❌ **No (Rejected)** | Strict policy: rejects external edits to protect task state. |
| **Sync across iPhone / iPad / Apple Watch** | ✅ **Yes** | Via iCloud calendar subscription. |
| **Offline operation** | ✅ **Yes** | Local SQLite/JSON store and local WebCal feed. |
