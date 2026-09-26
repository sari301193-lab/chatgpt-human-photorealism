import { createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const libDir = path.join(__dirname, 'lib');
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function resolveFile(urlPath) {
  if (urlPath === '/') {
    return path.join(publicDir, 'index.html');
  }

  if (urlPath.startsWith('/lib/')) {
    return path.join(libDir, urlPath.slice('/lib/'.length));
  }

  return path.join(publicDir, urlPath.slice(1));
}

function isWithinDirectory(baseDir, filePath) {
  const relativePath = path.relative(baseDir, filePath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      'Allow': 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8'
    });
    response.end('Method not allowed');
    return;
  }

  const url = new URL(request.url || '/', 'http://localhost');
  const filePath = path.normalize(resolveFile(url.pathname));
  const isAllowedPath =
    filePath === path.join(publicDir, 'index.html') ||
    isWithinDirectory(publicDir, filePath) ||
    isWithinDirectory(libDir, filePath);

  let fileStats;
  try {
    fileStats = statSync(filePath);
  } catch {
    fileStats = null;
  }

  if (!isAllowedPath || !fileStats?.isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream'
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }

    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Unable to read file');
  });

  stream.pipe(response);
});

server.listen(port, () => {
  console.log(`Prompt reverse-engineering app running at http://localhost:${port}`);
});
