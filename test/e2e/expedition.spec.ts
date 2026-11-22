import { expect, test, type Locator, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/game/data';
import { defaultSave } from '../../src/game/rules';

const confirm = 0;
const back = 1;
const start = 9;
const down = 13;
const right = 15;

declare global {
  interface Window {
    restoreRandom: () => void;
    simulatedGamepad: { pressed: number[]; polls: number };
  }
}

const expeditionLabel = /Descendre dans l'Abîme/;
const trainingLabel = /Cour d[’']Entraînement/i;
const retreatLabel = /Rentrer au Bastion du Crépuscule/;

async function keyboardSelect(page: Page, button: Locator): Promise<void> {
  await expect(button).toBeVisible();
  for (let i = 0; i < 30 && !(await button.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
}

async function setPadButtons(page: Page, pressed: number[]): Promise<void> {
  const initialPolls = await page.evaluate((buttons) => {
    window.simulatedGamepad.pressed = buttons;
    return window.simulatedGamepad.polls;
  }, pressed);
  // Wait for the game to sample both the press and the release under its own scheduler.
  await page.waitForFunction((polls) => window.simulatedGamepad.polls >= polls + 3, initialPolls);
}

async function tapPad(page: Page, button: number): Promise<void> {
  await setPadButtons(page, [button]);
  await setPadButtons(page, []);
}

async function readSave(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

for (const input of ['clavier', 'manette'] as const) {
  test(`titre → Cour → pause → reprise → Bastion → expédition → bilan · ${input}`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    const save = defaultSave();
    save.muted = true;
    save.settings.difficulty = 'eclipse';
    // Give the first expedition some real, bankable loot via the normal starting talent.
    save.talents.ash_reserves = 1;
    const requestedMenus: string[] = [];
    page.on('request', (request) => {
      const chunk = /\/assets\/(BastionModal|GameMenuModal|LauncherModal)-[^/]+\.js$/.exec(request.url());
      if (chunk) requestedMenus.push(chunk[1]);
    });
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
    await page.addInitScript(({ gamepad, key, initialSave }) => {
      localStorage.setItem(key, JSON.stringify(initialSave));
      // Seed 5 gives the first expedition a flat approach and a ground enemy.
      const random = Math.random;
      Math.random = () => 5 / 0x100000000;
      window.restoreRandom = () => { Math.random = random; };
      if (gamepad) {
        const pad = { pressed: [] as number[], polls: 0 };
        window.simulatedGamepad = pad;
        Object.defineProperty(navigator, 'getGamepads', {
          value: () => {
            pad.polls++;
            return [{
              index: 0,
              connected: true,
              id: 'Playwright gamepad',
              mapping: 'standard',
              axes: [0, 0, 0, 0],
              buttons: Array.from({ length: 17 }, (_, index) => {
                const pressed = pad.pressed.includes(index);
                return { pressed, touched: pressed, value: Number(pressed) };
              }),
            }, null, null, null];
          },
        });
      }
    }, { gamepad: input === 'manette', key: SAVE_KEY, initialSave: save });

    const title = page.getByTestId('title-screen');
    const hud = page.getByTestId('game-hud');
    const pause = page.getByTestId('pause-modal');
    const bastion = page.getByTestId('bastion-modal');
    const summary = page.getByTestId('gameover-modal');
    const assertTraining = () => expect(hud.getByText("Cour d'Entraînement · Bastion")).toBeVisible();

    await page.goto('/');
    await expect(title).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-state', 'title');
    await page.evaluate(() => window.restoreRandom());
    const training = title.getByRole('button', { name: trainingLabel });
    expect(requestedMenus).toEqual([]);

    if (input === 'clavier') {
      await keyboardSelect(page, training);
      await assertTraining();
      await page.keyboard.press('Escape');
      await expect(pause).toBeVisible();
      await keyboardSelect(page, pause.getByRole('button', { name: 'Reprendre' }));
      await assertTraining();
      await page.keyboard.press('Escape');
      await expect(pause).toBeVisible();
      await keyboardSelect(page, pause.getByRole('button', { name: retreatLabel }));
    } else {
      await tapPad(page, confirm);
      const startExpedition = title.getByRole('button', { name: expeditionLabel });
      await expect(startExpedition).toBeFocused();

      // Hold the options chunk to exercise the pending overlay before its controls exist.
      let releaseOptions!: () => void;
      const optionsReady = new Promise<void>((resolve) => { releaseOptions = resolve; });
      await page.route('**/assets/GameMenuModal-*.js', async (route) => {
        await optionsReady;
        await route.continue();
      });
      try {
        await title.getByRole('button', { name: 'Menu & Options' }).click();
        await expect(page.getByText('Chargement…', { exact: true })).toBeVisible();
        await page.keyboard.press('Enter');
        await tapPad(page, confirm);
        await expect(page.locator('body')).toHaveAttribute('data-state', 'title');
        await expect(title).toHaveAttribute('inert', '');
      } finally {
        releaseOptions();
      }
      const options = page.getByTestId('game-menu-modal');
      await expect(options.getByRole('button', { name: 'Fermer' })).toBeFocused();
      expect(requestedMenus).toEqual(['GameMenuModal']);

      await options.getByRole('button', { name: 'Launcher PC' }).click();
      const launcher = page.getByTestId('launcher-modal');
      await expect(launcher.getByRole('button', { name: 'Fermer' })).toBeVisible();
      await expect(options).toHaveCount(0);
      expect(requestedMenus).toEqual(['GameMenuModal', 'LauncherModal']);
      await tapPad(page, back);
      await expect(startExpedition).toBeFocused();

      await tapPad(page, down);
      await expect(training).toBeFocused();
      await expect(training).toHaveAttribute('data-gamepad-focus', '');
      await tapPad(page, confirm);
      await assertTraining();
      await setPadButtons(page, [confirm]);
      await setPadButtons(page, [confirm, start]);
      await expect(pause).toBeVisible();
      await expect(pause.getByRole('button', { name: 'Reprendre' })).toBeFocused();
      await setPadButtons(page, []);
      await tapPad(page, back);
      await assertTraining();
      await tapPad(page, start);
      await expect(pause).toBeVisible();
      await tapPad(page, down);
      await tapPad(page, down);
      await tapPad(page, down);
      await expect(pause.getByRole('button', { name: retreatLabel })).toBeFocused();
      await tapPad(page, down);
      await expect(pause.locator('button[data-testid^="exercise-"][data-gamepad-focus]')).toBeFocused();
      await tapPad(page, confirm);
      await expect(hud.getByTestId('training-exercise')).toHaveAttribute('data-complete', 'false');
      await tapPad(page, start);
      await expect(pause.getByRole('button', { name: 'Reprendre' })).toBeFocused();
      for (let i = 0; i < 3; i++) await tapPad(page, down);
      await expect(pause.getByRole('button', { name: retreatLabel })).toBeFocused();
      await tapPad(page, confirm);
    }

    await expect(bastion.getByRole('heading', { name: 'Bastion du Crépuscule' })).toBeVisible();
    expect(requestedMenus).toEqual(input === 'manette'
      ? ['GameMenuModal', 'LauncherModal', 'BastionModal']
      : ['BastionModal']);
    await expect(bastion.getByText('Gains de l’expédition')).toHaveCount(0);
    expect(await readSave(page)).toMatchObject({ res: save.res, records: { runs: 0 }, runHistory: [] });
    const expedition = bastion.getByRole('button', { name: expeditionLabel });
    if (input === 'clavier') {
      await keyboardSelect(page, expedition);
    } else {
      for (const button of [right, right, right, right, right, down]) await tapPad(page, button);
      await expect(expedition).toBeFocused();
      await tapPad(page, confirm);
    }

    await expect(hud.getByText(/^Strate 1 · /)).toBeVisible();
    await expect.poll(() => readSave(page)).toMatchObject({ records: { runs: 1 }, runHistory: [] });

    const health = page.getByTestId('hud-hp');
    const initialHealth = await health.innerText();
    if (input === 'clavier') await page.keyboard.down('ArrowRight');
    else await setPadButtons(page, [right]);
    // Walk into the first encounter and let its attacks cause a real defeat.
    await expect(health).not.toHaveText(initialHealth, { timeout: 30_000 });
    if (input === 'clavier') await page.keyboard.up('ArrowRight');
    else await setPadButtons(page, []);

    await expect(summary.getByRole('heading', { name: "L'Argile s'est Brisée" })).toBeVisible({ timeout: 50_000 });
    await expect(summary.getByText('Gains de l’expédition')).toBeVisible();
    await expect(summary.getByText('+25 Cendres')).toBeVisible();
    await expect.poll(() => readSave(page)).toMatchObject({
      records: { runs: 1 },
      runHistory: [{ outcome: 'defeat', depthReached: 1 }],
    });
    expect((await readSave(page)).runHistory).toHaveLength(1);

    const returnToBastion = summary.getByRole('button', { name: 'Bastion du Crépuscule' });
    if (input === 'clavier') {
      await keyboardSelect(page, returnToBastion);
    } else {
      await expect(returnToBastion).toBeFocused();
      await tapPad(page, confirm);
    }
    await expect(bastion.getByText('Gains de l’expédition')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

test('un écran différé indisponible permet de revenir au titre et à la Cour', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**/assets/GameMenuModal-*.js', (route) => route.abort());

  await page.goto('/');
  const title = page.getByTestId('title-screen');
  await title.getByRole('button', { name: 'Menu & Options' }).click();
  await expect(page.getByRole('alert')).toHaveText('Impossible de charger cet écran.');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();

  await expect(title).not.toHaveAttribute('inert', '');
  await title.getByRole('button', { name: trainingLabel }).click();
  await expect(page.getByTestId('game-hud').getByText("Cour d'Entraînement · Bastion")).toBeVisible();
});

test('la Cour permet de réussir et relancer un exercice, puis de revenir en entraînement libre', async ({ page }) => {
  const save = defaultSave();
  save.muted = true;
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.addInitScript(({ key, initialSave }) => {
    localStorage.setItem(key, JSON.stringify(initialSave));
  }, { key: SAVE_KEY, initialSave: save });
  await page.goto('/');
  const title = page.getByTestId('title-screen');
  const pause = page.getByTestId('pause-modal');
  const exercise = page.getByTestId('training-exercise');
  const initialSave = await readSave(page);

  await keyboardSelect(page, title.getByRole('button', { name: trainingLabel }));
  await expect(page.getByTestId('game-hud')).toBeVisible();
  await page.keyboard.press('Escape');
  await keyboardSelect(page, pause.getByTestId('exercise-movement'));
  await expect(exercise).toHaveAttribute('data-complete', 'false');

  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  try {
    await expect(exercise).toHaveAttribute('data-complete', 'true');
  } finally {
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');
  }

  await page.keyboard.press('Escape');
  await keyboardSelect(page, pause.getByRole('button', { name: 'Recommencer l’exercice' }));
  await expect(exercise).toHaveAttribute('data-complete', 'false');
  await page.keyboard.press('Escape');
  await keyboardSelect(page, pause.getByTestId('exercise-free'));
  await expect(exercise).toHaveCount(0);
  expect(await readSave(page)).toEqual(initialSave);
});
