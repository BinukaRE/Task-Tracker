const http = require('http');
const { exec } = require('child_process');
const { generateIcs } = require('./calendar-sync');

let server = null;
let currentPort = 52884;
let getTasksFn = () => [];

function startCalendarServer(getTasksCallback, port = 52884) {
  if (server) {
    return Promise.resolve({ port: currentPort, webcalUrl: `webcal://localhost:${currentPort}/calendar.ics` });
  }

  getTasksFn = getTasksCallback;
  currentPort = port;

  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/calendar.ics' || url.pathname === '/tasks.ics') {
        try {
          const tasks = getTasksFn() || [];
          const icsContent = generateIcs(tasks);

          res.writeHead(200, {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="task-tracker.ics"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.end(icsContent);
        } catch (err) {
          console.error('Error generating calendar feed:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error generating calendar feed');
        }
      } else if (url.pathname === '/download.ics') {
        try {
          const tasks = getTasksFn() || [];
          const icsContent = generateIcs(tasks);

          res.writeHead(200, {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="task-tracker-export.ics"',
          });
          res.end(icsContent);
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
        // Try another port
        currentPort++;
        server.listen(currentPort);
      } else {
        console.error('Calendar server error:', err);
        reject(err);
      }
    });

    server.listen(currentPort, '127.0.0.1', () => {
      console.log(`Calendar sync server active at http://127.0.0.1:${currentPort}/calendar.ics`);
      resolve({
        port: currentPort,
        httpUrl: `http://localhost:${currentPort}/calendar.ics`,
        webcalUrl: `webcal://localhost:${currentPort}/calendar.ics`,
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
  const url = `webcal://localhost:${currentPort}/calendar.ics`;
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
    downloadUrl: `http://localhost:${currentPort}/download.ics`,
  }),
};
