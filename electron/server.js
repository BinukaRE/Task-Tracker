const http = require('http');
const { exec } = require('child_process');
const { generateIcs } = require('./calendar-sync');

let server = null;
let currentPort = 52884;
let getTasksFn = () => [];

function startCalendarServer(getTasksCallback, port = 52884) {
  if (server) {
    return Promise.resolve({
      port: currentPort,
      httpUrl: `http://localhost:${currentPort}/calendar.ics`,
      webcalUrl: `webcal://localhost:${currentPort}/calendar.ics`,
      webcalIpUrl: `webcal://127.0.0.1:${currentPort}/calendar.ics`,
    });
  }

  getTasksFn = getTasksCallback;
  currentPort = port;

  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      console.log(`[CalendarServer] ${req.method} ${req.url} (User-Agent: ${req.headers['user-agent'] || 'unknown'})`);
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      
      // Standard CORS and CalDAV headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, PROPFIND');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Depth, User-Agent');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/calendar.ics' || url.pathname === '/tasks.ics' || url.pathname === '/') {
        try {
          const tasks = getTasksFn() || [];
          const icsContent = generateIcs(tasks);
          const buf = Buffer.from(icsContent, 'utf8');

          res.writeHead(200, {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Length': buf.length,
            'Content-Disposition': 'inline; filename="task-tracker.ics"',
            'X-WR-CALNAME': 'Task Tracker',
            'X-WR-CALDESC': 'Task Tracker Synchronized Tasks',
            'X-PUBLISHED-TTL': 'PT15M',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          });

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          res.end(buf);
        } catch (err) {
          console.error('[CalendarServer] Error generating calendar feed:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error generating calendar feed');
        }
      } else if (url.pathname === '/download.ics') {
        try {
          const tasks = getTasksFn() || [];
          const icsContent = generateIcs(tasks);
          const buf = Buffer.from(icsContent, 'utf8');

          res.writeHead(200, {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Length': buf.length,
            'Content-Disposition': 'attachment; filename="task-tracker-export.ics"',
            'X-WR-CALNAME': 'Task Tracker',
          });
          res.end(buf);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error exporting ICS');
        }
      } else if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', taskCount: (getTasksFn() || []).length }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        currentPort++;
        server.listen(currentPort);
      } else {
        console.error('[CalendarServer] error:', err);
        reject(err);
      }
    });

    // Listen on all interfaces (IPv4 and IPv6) to avoid localhost vs 127.0.0.1 mismatch
    server.listen(currentPort, () => {
      console.log(`[CalendarServer] Calendar sync server active on port ${currentPort}`);
      resolve({
        port: currentPort,
        httpUrl: `http://localhost:${currentPort}/calendar.ics`,
        webcalUrl: `webcal://localhost:${currentPort}/calendar.ics`,
        webcalIpUrl: `webcal://127.0.0.1:${currentPort}/calendar.ics`,
        downloadUrl: `http://localhost:${currentPort}/download.ics`,
      });
    });
  });
}

function stopCalendarServer() {
  if (server) {
    server.close();
    server = null;
  }
}

function openWebcalSubscription() {
  // Use 127.0.0.1 for explicit IP resolution in macOS CalendarAgent
  const url = `webcal://127.0.0.1:${currentPort}/calendar.ics`;
  return new Promise((resolve, reject) => {
    exec(`open "${url}"`, (err) => {
      if (err) {
        console.error('Failed to open webcal URL:', err);
        reject(err);
      } else {
        resolve({ success: true, url });
      }
    });
  });
}

module.exports = {
  startCalendarServer,
  stopCalendarServer,
  openWebcalSubscription,
  getServerInfo: () => ({
    port: currentPort,
    httpUrl: `http://localhost:${currentPort}/calendar.ics`,
    webcalUrl: `webcal://localhost:${currentPort}/calendar.ics`,
    webcalIpUrl: `webcal://127.0.0.1:${currentPort}/calendar.ics`,
    downloadUrl: `http://localhost:${currentPort}/download.ics`,
  }),
};
