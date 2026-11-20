import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'build-service-worker',
        apply: 'build',
        enforce: 'post',
        generateBundle(_, bundle) {
          const assets = Object.keys(bundle)
            .filter((fileName) => fileName.endsWith('.js') || fileName.endsWith('.css'))
            .sort()
            .map((fileName) => `/${fileName}`);
          const worker = fs.readFileSync(new URL('./src/pwa/sw.js', import.meta.url), 'utf8');
          const buildVersion = createHash('sha256')
            .update(worker)
            .update(JSON.stringify(assets))
            .update(fs.readFileSync(new URL('./index.html', import.meta.url)))
            .digest('hex')
            .slice(0, 12);
          this.emitFile({
            type: 'asset',
            fileName: 'sw.js',
            source: `const BUILD_VERSION = ${JSON.stringify(buildVersion)};
const BUILD_ASSETS = ${JSON.stringify(assets)};
${worker}`,
          });
        },
      },
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
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
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
