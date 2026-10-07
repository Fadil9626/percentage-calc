/**
 * serve.js — tiny zero-dependency static server for the built CRA app.
 *
 * Serves ./build on PORT (default 3030) with SPA fallback to index.html.
 * Runs as a plain Node process so PM2 can manage it directly on Windows —
 * no `cmd` window, and it survives closing the terminal.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3030;
const ROOT = path.join(__dirname, 'build');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
};

// Basic protections for every answer: no framing (clickjacking), no type guessing, no referrer
// leaking to other sites.
const SECURITY = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // Strip query string and decode.
  // A malformed address (a stray %) would throw here and take the whole server down.
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { return send(res, 400, 'Bad request'); }
  if (urlPath === '/') urlPath = '/index.html';

  // Resolve safely inside ROOT (block path traversal). Compared with the separator, or a sibling
  // folder whose name merely starts with "build" (build-old, ...) would count as inside.
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  // Source maps would hand anyone the app's full source; they stay on this machine.
  if (filePath.endsWith('.map')) return send(res, 404, 'Not found');

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      const ext = path.extname(filePath).toLowerCase();
      const cache = ext === '.html' ? 'no-cache' : 'public, max-age=31536000';
      return send(res, 200, data, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache });
    }
    // SPA fallback: unknown route with no file extension → index.html
    if (!path.extname(urlPath)) {
      return fs.readFile(path.join(ROOT, 'index.html'), (e, html) => {
        if (e) return send(res, 404, 'Not found');
        send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      });
    }
    send(res, 404, 'Not found');
  });
});

server.listen(PORT, () => {
  console.log(`Percentage Calculator frontend served from ./build on port ${PORT}`);
});
