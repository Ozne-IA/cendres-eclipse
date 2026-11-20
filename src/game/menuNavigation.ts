import type { GamepadMenuCommand } from './types';

const menuSelector = '[data-gamepad-menu]';
const excluded = '[data-gamepad-ignore], [hidden], [inert]';
type Direction = 'up' | 'down' | 'left' | 'right';

function activeMenu(root: HTMLElement): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(menuSelector)).at(-1);
}

function buttonsIn(menu: HTMLElement): HTMLButtonElement[] {
  // Options and launcher use native controls. The controller can dismiss them
  // without changing a setting or activating a button on the screen underneath.
  const selector = menu.dataset.gamepadMenu === 'overlay' ? 'button[data-gamepad-back]' : 'button';
  return Array.from(menu.querySelectorAll<HTMLButtonElement>(selector)).filter((button) =>
    !button.matches(':disabled') &&
    button.getAttribute('aria-disabled') !== 'true' &&
    !button.closest(excluded) &&
    button.getClientRects().length > 0 &&
    getComputedStyle(button).visibility === 'visible'
  );
}

function focusButton(button: HTMLButtonElement): void {
  if (button === document.activeElement && button.hasAttribute('data-gamepad-focus')) return;
  button.dataset.gamepadFocus = '';
  button.focus({ preventScroll: true });
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  button.addEventListener('blur', () => button.removeAttribute('data-gamepad-focus'), { once: true });
}

function defaultButton(buttons: HTMLButtonElement[]): HTMLButtonElement | undefined {
  return buttons.find((button) => button.hasAttribute('data-gamepad-default')) ?? buttons[0];
}

export function focusGamepadMenu(root: HTMLElement): void {
  const menu = activeMenu(root);
  const button = menu && defaultButton(buttonsIn(menu));
  if (button) focusButton(button);
}

function directionalButton(
  buttons: HTMLButtonElement[],
  current: HTMLButtonElement,
  direction: Direction
): HTMLButtonElement | undefined {
  const start = current.getBoundingClientRect();
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'up' || direction === 'left' ? -1 : 1;
  let nearest: HTMLButtonElement | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const button of buttons) {
    if (button === current) continue;
    const box = button.getBoundingClientRect();
    const dx = box.left + box.width / 2 - start.left - start.width / 2;
    const dy = box.top + box.height / 2 - start.top - start.height / 2;
    const forward = sign * (horizontal ? dx : dy);
    if (forward < 2) continue;

    // Prefer buttons in the same row or column, including differently sized buttons.
    const sideways = horizontal
      ? Math.max(0, box.top - start.bottom, start.top - box.bottom)
      : Math.max(0, box.left - start.right, start.left - box.right);
    const score = forward + 3 * sideways + 0.1 * Math.abs(horizontal ? dy : dx);
    if (score < bestScore) {
      bestScore = score;
      nearest = button;
    }
  }
  return nearest;
}

export function handleGamepadMenu(root: HTMLElement, command: GamepadMenuCommand): void {
  const menu = activeMenu(root);
  if (!menu) return;
  const buttons = buttonsIn(menu);
  if (command === 'back' || command === 'pause') {
    if (command === 'pause' && !menu.matches('[data-gamepad-menu="pause"], [data-gamepad-menu="overlay"]')) return;
    buttons.find((button) => button.hasAttribute('data-gamepad-back'))?.click();
    return;
  }

  const current = buttons.find((button) =>
    button === document.activeElement && button.hasAttribute('data-gamepad-focus')
  );
  if (!current) {
    const first = defaultButton(buttons);
    if (first) focusButton(first);
    return;
  }
  if (command === 'confirm') {
    current.click();
    // A purchase can disable or remove the current button.
    requestAnimationFrame(() => {
      if (!root.isConnected || activeMenu(root) !== menu) return;
      if (!buttonsIn(menu).includes(current)) focusGamepadMenu(root);
      else if (document.activeElement === document.body) focusButton(current);
    });
    return;
  }

  const next = directionalButton(buttons, current, command);
  if (next) focusButton(next);
}
