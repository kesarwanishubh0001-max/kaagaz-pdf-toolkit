import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const publicDir = path.resolve(__dirname, 'public');

function readStaticFile(filename: string): string | null {
  const candidates = [
    path.join(distDir, filename),
    path.join(publicDir, filename),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Explicit SEO & Search Console routes (served with exact Content-Type in both dev and production)
  app.get('/sitemap.xml', (_req, res) => {
    const xml = readStaticFile('sitemap.xml');
    if (!xml) {
      res.status(404).type('text/plain').send('sitemap.xml not found');
      return;
    }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  });

  app.get('/robots.txt', (_req, res) => {
    const txt =
      readStaticFile('robots.txt') ||
      'User-agent: *\nAllow: /\n\nSitemap: https://kaagaz.ai.studio/sitemap.xml\n';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(txt);
  });

  app.get('/google4fb0e2a5e6bccf59.html', (_req, res) => {
    const html =
      readStaticFile('google4fb0e2a5e6bccf59.html') ||
      'google-site-verification: google4fb0e2a5e6bccf59.html';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          // Ensure Tesseract .traineddata.gz is served as raw bytes without Content-Encoding: gzip
          if (filePath.endsWith('.traineddata.gz')) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.removeHeader('Content-Encoding');
          }
        },
      })
    );

    // SPA fallback for client-side routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KAAGAZ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
