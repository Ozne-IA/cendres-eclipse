import { expect, test } from '@playwright/test';
import { TITLE_HERO_ARTWORK_URL } from '../../src/artwork';

test.use({ serviceWorkers: 'allow' });

test('le titre et les menus différés restent accessibles hors ligne', async ({ context, page }) => {
  await context.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const titleArtCached = await page.evaluate(async (url) => !!(await caches.match(url)), TITLE_HERO_ARTWORK_URL);
  expect(titleArtCached).toBe(true);

  // Do not visit these menus online before reloading.
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const title = page.getByTestId('title-screen');
  await title.getByRole('button', { name: 'Menu & Options' }).click();
  await page.getByTestId('game-menu-modal').getByRole('button', { name: 'Launcher PC' }).click();
  await page.getByTestId('launcher-modal').getByRole('button', { name: 'Fermer' }).click();
  await title.getByRole('button', { name: 'Bastion du Crépuscule' }).click();
  const bastion = page.getByTestId('bastion-modal');
  await expect(bastion.getByRole('heading', { name: 'Bastion du Crépuscule' })).toBeVisible();
  await bastion.getByRole('button', { name: /Descendre dans l'Abîme/ }).click();
  await expect(page.getByTestId('game-hud').getByText(/^Strate 1 · /)).toBeVisible();
});
