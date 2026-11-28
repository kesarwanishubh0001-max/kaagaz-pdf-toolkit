const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

let localServer = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  // IMPORTANT: Serve .traineddata.gz as raw bytes (without Content-Encoding: gzip)
  // because Tesseract.js decompresses .traineddata.gz directly in JS.
  '.gz': 'application/octet-stream',
};

function startLocalDistServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let targetPath = path.normalize(path.join(distDir, reqPath === '/' ? 'index.html' : reqPath));
        if (!targetPath.startsWith(distDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
          targetPath = path.join(distDir, 'index.html');
        }
        const ext = path.extname(targetPath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(targetPath).pipe(res);
      } catch {
        res.writeHead(500);
        res.end('Internal Error');
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

async function createWindow() {
  const distDir = path.join(__dirname, '../dist');
  const { server, port } = await startLocalDistServer(distDir);
  localServer = server;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'KAAGAZ',
    autoHideMenuBar: true,
    backgroundColor: '#08080A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.maximize();
  await win.loadURL(`http://127.0.0.1:${port}/`);

  win.webContents.setWindowOpenHandler(({ url: extUrl }) => {
    if (extUrl.startsWith('http://') || extUrl.startsWith('https://')) {
      shell.openExternal(extUrl);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (localServer) {
    try {
      localServer.close();
    } catch {
      // ignore
    }
    localServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
