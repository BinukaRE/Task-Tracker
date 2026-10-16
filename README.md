# Task Flow ⚡🗓️

An advanced desktop task tracking system built with **Electron + React + Tailwind CSS**, featuring a seamless hybrid integration with the native **macOS Calendar (iCal)** app.

---

## ✨ Features

- **macOS Desktop Integration**:
  - Native frameless design with inset traffic-light controls and glassmorphism styling.
  - macOS Menu Bar / System Tray icon with quick status, quick task launcher, and calendar sync commands.
  - Global hotkeys (e.g. `⌘ + Shift + T` to quick add tasks from anywhere).
- **Hybrid macOS Calendar Link**:
  - **Direct AppleScript Sync**: Automatically manages a dedicated `"Task Tracker Pro"` calendar in Apple Calendar (`Calendar.app`), creating and updating events with titles, notes, subtask checklists, priorities, and customizable alarm reminders (0, 5, 15, 30, 60 minutes before).
  - **Live WebCal Subscription (`webcal://`)**: Integrated local background server serving a dynamic RFC 5545 iCalendar feed (`webcal://localhost:52884/calendar.ics`). Subscribing with 1 click allows auto-sync across your Mac, iPad, and iPhone via iCloud Calendar.
  - **Standalone .ics Export**: 1-click export of your full task schedule into standard `.ics` files.
- **Multiple Task Management Views**:
  - **Kanban Board**: Drag/move tasks between *To Do*, *In Progress*, *In Review*, and *Completed* columns with priority glow indicators, subtask progress meters, and calendar sync status.
  - **List / Table View**: Fast table with quick inline task creation, multi-attribute sorting (due date, priority, title), and category filters.
  - **Calendar View**: Interactive Month and Day agenda view plotting scheduled tasks with their due times and calendar sync flags.
  - **Pomodoro Focus Timer**: Integrated 25/5/15 minute focus timer linked to any selected task, auto-tracking actual focus time and subtask completion with ambient audio alerts.
  - **Analytics & Insights**: Live productivity metrics, completion rates, priority distribution, and estimation accuracy.
- **Local-First & Offline**:
  - All tasks and user settings are persisted locally in standard macOS application storage with atomic file writes to ensure data safety.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or navigate to repository
cd "Task Tracker"

# Install dependencies
npm install
```

### 2. Development Mode

Runs the Vite dev server and opens the Electron desktop window with Hot Module Replacement (HMR):

```bash
npm run dev
```

### 3. Production Build & Launch

Build the optimized React bundle and launch the native desktop application:

```bash
npm run build
npm start
```

---

## 🔗 How the Local Calendar Link Works

Task Flow provides a robust calendar integration engine with an **authoritative data integrity policy**:
- **Scrapes NEW Events Only**: You can scrape new events from Apple Calendar into Task Flow with 1 click.
- **Strictly Rejects Calendar Edits**: Any external edits made to existing tasks inside Apple Calendar are discarded to keep your subtasks, status, and priorities uncorrupted.

For comprehensive instructions, see the complete [**Calendar User Manual (CALENDAR_USER_MANUAL.md)**](file:///Users/binuka/Documents/GitHub/Task%20Tracker/CALENDAR_USER_MANUAL.md).

### Method 1: 1-Click Connect Calendar (Recommended WebCal)
1. Click **"1-Click Connect Calendar"** in the sidebar or Calendar Hub.
2. Apple Calendar opens asking to subscribe to `webcal://localhost:52884/calendar.ics`.
3. Set location to **iCloud** to sync tasks across your Mac, iPhone, and iPad.

### Method 2: Direct AppleScript Sync (Push Tasks)
1. Click **"Sync Calendar"** to push tasks directly into a dedicated **"Task Flow"** calendar in Apple Calendar with alarms and notes.

### Method 3: Scrape New Calendar Events
1. In the Calendar Hub, click **"Scrape New Events from Calendar"**.
2. Brand-new external events are imported as tasks. Existing tasks are protected from modifications.

---

## 📁 Project Architecture

```
Task Tracker/
├── electron/
│   ├── main.js             # Electron main process (window, tray, IPC handlers)
│   ├── preload.js          # Secure context bridge between Electron & React
│   ├── calendar-sync.js    # Direct AppleScript sync logic & RFC 5545 generator
│   ├── server.js           # Local WebCal subscription HTTP server
│   └── store.js            # Atomic local JSON storage engine
├── src/
│   ├── components/
│   │   ├── TitleBar.jsx    # macOS styled draggable header with search & sync
│   │   ├── Sidebar.jsx     # Navigation, category filters, and calendar link card
│   │   ├── views/
│   │   │   ├── KanbanView.jsx    # 4-stage Kanban board
│   │   │   ├── ListView.jsx      # Sortable list with quick inline creator
│   │   │   ├── CalendarView.jsx  # Interactive month and day agenda grid
│   │   │   ├── PomodoroView.jsx  # Focus timer linked to tasks
│   │   │   └── AnalyticsView.jsx # Productivity charts and sync diagnostics
│   │   └── modals/
│   │       ├── TaskModal.jsx         # Full task editor with calendar reminder settings
│   │       └── CalendarSyncModal.jsx # Calendar integration hub & subscription manager
│   ├── context/
│   │   └── TaskContext.jsx # Global task state and IPC coordinator
│   ├── App.jsx             # Main application shell
│   ├── main.jsx            # React root mount
│   └── index.css           # Tailwind CSS v4 styling & glassmorphism utilities
├── vite.config.mjs         # Vite bundler configuration
└── package.json            # Project manifest & scripts
```

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 44
- **UI Framework**: React 19
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Calendar Standard**: RFC 5545 (`ical-generator`)
- **macOS Automation**: AppleScript / JXA (`osascript`)
