import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      // Serves & bundles Tesseract.js worker, LSTM WASM cores, and English + Hindi
      // traineddata locally at /ocr/* so OCR works with 0% internet on Mobile, PC, and Web.
      {
        name: 'bundle-local-ocr-assets',
        configureServer(server) {
          const ocrFileMap = (): Record<string, { file: string; mime: string }> => {
            const nm = path.resolve(__dirname, 'node_modules');
            const coreFiles = [
              'tesseract-core-lstm.wasm.js',
              'tesseract-core-lstm.wasm',
              'tesseract-core-simd-lstm.wasm.js',
              'tesseract-core-simd-lstm.wasm',
              'tesseract-core-relaxedsimd-lstm.wasm.js',
              'tesseract-core-relaxedsimd-lstm.wasm',
            ];
            const map: Record<string, { file: string; mime: string }> = {
              '/ocr/worker.min.js': {
                file: path.join(nm, 'tesseract.js/dist/worker.min.js'),
                mime: 'application/javascript; charset=utf-8',
              },
              '/ocr/tessdata/eng.traineddata.gz': {
                file: path.join(nm, '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
                mime: 'application/octet-stream',
              },
              '/ocr/tessdata/hin.traineddata.gz': {
                file: path.join(nm, '@tesseract.js-data/hin/4.0.0_best_int/hin.traineddata.gz'),
                mime: 'application/octet-stream',
              },
            };
            for (const f of coreFiles) {
              map[`/ocr/core/${f}`] = {
                file: path.join(nm, 'tesseract.js-core', f),
                mime: f.endsWith('.wasm')
                  ? 'application/wasm'
                  : 'application/javascript; charset=utf-8',
              };
            }
            return map;
          };

          server.middlewares.use((req, res, next) => {
            const rawUrl = (req.url || '').split('?')[0];
            if (!rawUrl.startsWith('/ocr/')) {
              return next();
            }
            const entry = ocrFileMap()[rawUrl];
            if (!entry || !fs.existsSync(entry.file)) {
              return next();
            }
            res.setHeader('Content-Type', entry.mime);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            fs.createReadStream(entry.file).pipe(res);
          });
        },
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) return;

          const nm = path.resolve(__dirname, 'node_modules');
          const ocrDir = path.join(distDir, 'ocr');
          const coreDir = path.join(ocrDir, 'core');
          const tessDir = path.join(ocrDir, 'tessdata');
          fs.mkdirSync(coreDir, {recursive: true});
          fs.mkdirSync(tessDir, {recursive: true});

          const copyIfExists = (src: string, dest: string) => {
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          };

          copyIfExists(
            path.join(nm, 'tesseract.js/dist/worker.min.js'),
            path.join(ocrDir, 'worker.min.js')
          );

          const coreFiles = [
            'tesseract-core-lstm.wasm.js',
            'tesseract-core-lstm.wasm',
            'tesseract-core-simd-lstm.wasm.js',
            'tesseract-core-simd-lstm.wasm',
            'tesseract-core-relaxedsimd-lstm.wasm.js',
            'tesseract-core-relaxedsimd-lstm.wasm',
          ];
          for (const f of coreFiles) {
            copyIfExists(path.join(nm, 'tesseract.js-core', f), path.join(coreDir, f));
          }

          copyIfExists(
            path.join(nm, '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
            path.join(tessDir, 'eng.traineddata.gz')
          );
          copyIfExists(
            path.join(nm, '@tesseract.js-data/hin/4.0.0_best_int/hin.traineddata.gz'),
            path.join(tessDir, 'hin.traineddata.gz')
          );
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
