import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPath = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.QORE_STATIC_HOST ?? '127.0.0.1';
const port = Number(process.env.QORE_STATIC_PORT ?? '4173');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff2', 'font/woff2']
]);

function send(statusCode, response, body, headers = {}) {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    ...headers
  });
  response.end(body);
}

function resolvePath(urlPathname) {
  const safePath = normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath === '/' ? '/index.html' : safePath;
  const filePath = resolve(rootPath, `.${relativePath}`);

  if (!filePath.startsWith(rootPath)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  const htmlPath = resolve(rootPath, `.${relativePath}.html`);

  if (existsSync(htmlPath) && statSync(htmlPath).isFile()) {
    return htmlPath;
  }

  const indexPath = resolve(rootPath, join(`.${relativePath}`, 'index.html'));

  if (existsSync(indexPath) && statSync(indexPath).isFile()) {
    return indexPath;
  }

  return null;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);
  const filePath = resolvePath(requestUrl.pathname);

  if (!filePath) {
    send(404, response, 'Not found', { 'content-type': 'text/plain; charset=utf-8' });
    return;
  }

  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Qore static server listening on http://${host}:${port}\n`);
});
