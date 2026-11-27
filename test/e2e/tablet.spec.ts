import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 1024, height: 768 } });

test('tablette · déplacer et lancer un Art ensemble puis ouvrir la pause', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Cour d[’']Entraînement/i }).tap();
  const controls = page.getByTestId('touch-controls');
  await expect(controls).toBeVisible();
  const right = controls.getByRole('button', { name: 'Aller à droite' });
  const skill = controls.getByRole('button', { name: 'Art', exact: true });
  const points = await Promise.all([right, skill].map(async (button, id) =>
    button.evaluate((element, id) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id };
    }, id)
  ));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, 1) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await expect(controls.locator('[data-pressed]')).toHaveCount(2);
  await expect(page.getByTestId('hud-skill-status')).toHaveText(/[\d.]+ s/);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(controls.locator('[data-pressed]')).toHaveCount(0);
  await page.getByRole('button', { name: /Pause/ }).tap();
  await expect(controls).toHaveCount(0);
  await page.getByRole('button', { name: /Reprendre/i }).tap();
  await expect(controls).toBeVisible();
  await expect(controls.locator('[data-pressed]')).toHaveCount(0);
});
