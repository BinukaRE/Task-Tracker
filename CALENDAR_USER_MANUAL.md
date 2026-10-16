# Task Flow: Apple Calendar User Manual & Integration Guide 🗓️⚡

Welcome to the **Task Flow Calendar User Manual**. Task Flow integrates directly with your macOS native Apple Calendar (`Calendar.app`) through a **safe, strictly read-only event scraping engine**.

---

## 🛡️ Strict Security & Data Policy

Task Flow is deliberately engineered with a **zero-write, read-only scraper architecture**:

1. **Pure Read-Only Scraping**:
   - Task Flow **NEVER creates, modifies, updates, or deletes** any events in your Apple Calendar.
   - Your Apple Calendar remains untouched, secure, and completely independent.

2. **Scrapes NEW Events Only**:
   - The scraper scans your local Apple Calendar for **new external events** (e.g. meetings, doctor appointments, or personal events added in Calendar.app).
   - Any newly discovered event is safely imported into Task Flow as a new task in your **To Do** backlog, carrying over the event title, scheduled date/time, and notes.

3. **Calendar Edits are Strictly Rejected**:
   - If an event is edited, renamed, or shifted inside Apple Calendar after being imported, **Task Flow intentionally ignores and rejects those external edits**.
   - **Why?** Task Flow is your single source of truth for task progress, checklists, priorities, Pomodoro focus time, and Kanban workflow stages. Discarding external edits prevents accidental data loss, unexpected schema conflicts, and status resets.

4. **No Subscriptions / No WebCal**:
   - Task Flow does **not** host or require any WebCal server or external subscription links. All event discovery happens directly on your Mac using native macOS AppleScript queries.

---

## 🚀 How to Use the Calendar Scraper

### Method 1: Instant Scrape from the Top Bar
1. In the Task Flow header (top right), click the **"Scrape Calendar"** button (or press `⌘ + Shift + C`).
2. Task Flow will immediately query Apple Calendar for events within a rolling 30-day window.
3. Any newly detected events will appear at the top of your **To Do** list.

### Method 2: Calendar Scraper Modal
1. Click **"Calendar Scraper"** in the left sidebar or the calendar status badge in the header.
2. The **Calendar Scraper & Manual** window will open.
3. Click **"Scrape Calendar Now"** to view real-time status and see how many new events were imported.
4. You can also click **"Open Apple Calendar"** to quickly view or add events in Calendar.app.

### Method 3: macOS System Menu & Tray
- You can trigger a scrape anytime from the macOS menu bar: **Calendar** → **Scrape Events from Apple Calendar**.
- You can also click the Task Flow tray icon in your Mac's top right menu bar and select **Scrape Apple Calendar Events**.

---

## 🔒 macOS Permissions Guide

Because Task Flow communicates with Apple Calendar via native macOS AppleScript, macOS may ask for your permission when you first scrape.

### Granting Permission:
1. When prompted by macOS:
   > *"Task Flow wants access to control 'Calendar'"* or *"Task Flow wants to access Calendars"*
2. Click **OK** or **Allow**.

### If you need to verify or reset permissions manually:
1. Open macOS **System Settings** (`⌘ + Space` → `System Settings`).
2. Go to **Privacy & Security** → **Automation** (or **Calendars**).
3. Find **Task Flow** (or **Electron**) and ensure the toggle for **Calendar** is switched **ON**.
4. Relaunch Task Flow.

---

## 📋 Integration Feature Matrix

| Feature | Supported? | Design Rationale |
| :--- | :---: | :--- |
| **Scrape NEW events from Apple Calendar** | ✅ **Yes** | Imports external meetings and appointments into your backlog. |
| **Modify or edit events in Apple Calendar** | ❌ **No (Blocked)** | Safeguards your Apple Calendar from unwanted changes. |
| **Accept external edits to existing tasks** | ❌ **No (Rejected)** | Task Flow is the sole authority for task state and checklists. |
| **Delete events from Apple Calendar** | ❌ **No (Blocked)** | Strictly zero write permissions or destructive commands. |
| **WebCal subscription feed** | ❌ **No (Removed)** | Native direct scraping eliminates cloud or port errors. |
| **100% Offline & Private** | ✅ **Yes** | All data remains strictly local on your Mac. |
