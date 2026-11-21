import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { RendererScene } from './fixtures/rendererScenes';

const scenes = ['title', 'room', 'telegraph', 'guardian'] as const satisfies readonly RendererScene[];
const fixturePath = '/__renderer-visual';
const width = 960;
const height = 540;

test.use({
  viewport: { width, height },
  deviceScaleFactor: 1,
  launchOptions: { args: ['--disable-gpu', '--force-color-profile=srgb'] },
});

let bundle: string;

test.beforeAll(async () => {
  // Compile the browser-only fixture in memory so it cannot enter the release build.
  const { build } = await import('vite');
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: 'silent',
    build: {
      write: false,
      rolldownOptions: {
        input: fileURLToPath(new URL('./fixtures/rendererScenes.ts', import.meta.url)),
      },
    },
  });
  if (Array.isArray(result) || !('output' in result)) {
    throw new Error('Expected a single bundled renderer fixture');
  }
  const entry = result.output.find((file) => file.type === 'chunk' && file.isEntry);
  if (entry?.type !== 'chunk') throw new Error('Missing renderer fixture entry');
  bundle = entry.code;
});

for (const scene of scenes) {
  test(`renderer canvas · ${scene}`, async ({ page }) => {
    await page.route(fixturePath, (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!DOCTYPE html><html lang="fr"><meta charset="utf-8">
        <title>Références visuelles · Cendres de l’Éclipse</title>
        <style>body{margin:0}canvas{display:block}</style>
        <canvas width="${width}" height="${height}"></canvas>
        <script type="module" src="${fixturePath}.js"></script></html>`,
    }));
    await page.route(`${fixturePath}.js`, (route) => route.fulfill({
      contentType: 'text/javascript',
      body: bundle,
    }));
    await page.goto(fixturePath);
    // Wait for the renderer's artwork cache before capturing a single fixed-time frame.
    await expect.poll(() => page.evaluate((name) => window.drawRendererScene(name), scene)).toBe(true);
    await expect(page.locator('canvas')).toHaveScreenshot(`${scene}.png`, {
      threshold: 0.1,
      maxDiffPixels: 100,
    });
  });
}
