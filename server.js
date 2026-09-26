import { createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPrompt, buildPromptSections } from './lib/promptBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const libDir = path.join(__dirname, 'lib');
const port = Number(process.env.PORT || 3000);
const maxBodySize = 1024 * 1024;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8'
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

function writeJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  response.end(JSON.stringify(body));
}

function writeText(response, statusCode, message, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...extraHeaders
  });
  response.end(message);
}

function getApiHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

async function readJsonBody(request) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of request) {
    totalLength += chunk.length;
    if (totalLength > maxBodySize) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  try {
    const data = JSON.parse(rawBody);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

async function handleApiRequest(request, response, pathname) {
  if (pathname !== '/api/reverse-engineer') {
    writeJson(response, 404, { error: 'Not found' }, getApiHeaders());
    return true;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, getApiHeaders());
    response.end();
    return true;
  }

  if (request.method !== 'POST') {
    writeJson(response, 405, { error: 'Method not allowed' }, {
      ...getApiHeaders(),
      'Allow': 'POST, OPTIONS'
    });
    return true;
  }

  try {
    const formData = await readJsonBody(request);
    const sections = buildPromptSections(formData);
    const prompt = buildPrompt(formData);

    writeJson(response, 200, { prompt, sections }, getApiHeaders());
  } catch (error) {
    writeJson(response, error.statusCode || 500, { error: error.message || 'Unexpected error' }, getApiHeaders());
  }

  return true;
}

function handleStaticRequest(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    writeText(response, 405, 'Method not allowed', {
      'Allow': 'GET, HEAD'
    });
    return;
  }

  const filePath = path.normalize(resolveFile(pathname));
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
    writeText(response, 404, 'Not found');
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

    writeText(response, 500, 'Unable to read file');
  });

  stream.pipe(response);
}

export function createAppServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      await handleApiRequest(request, response, url.pathname);
      return;
    }

    handleStaticRequest(request, response, url.pathname);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  createAppServer().listen(port, () => {
    console.log(`Prompt reverse-engineering app running at http://localhost:${port}`);
  });
}
