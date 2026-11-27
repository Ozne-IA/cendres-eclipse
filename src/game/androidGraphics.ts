import { DEFAULT_SETTINGS } from './data';
import type { GamePhase, GameSettings, SaveData } from './types';

export const ANDROID_ASSET_ORIGIN = 'https://appassets.androidplatform.net';

const MAX_TITLE_CANVAS_PIXELS = 1280 * 720;
const MAX_GAMEPLAY_CANVAS_PIXELS = 960 * 540;

export const ANDROID_GRAPHICS_DEFAULTS = {
  fogQuality: 'medium',
  vfxQuality: 'medium',
  parallaxEnabled: false,
} satisfies Partial<GameSettings>;

// Keep the CSS size and game coordinates. Only the Canvas backing store gets smaller.
export function androidCanvasPixelRatio(
  width: number, height: number, devicePixelRatio: number, phase: GamePhase = 'title',
): number {
  const budget = phase === 'title' ? MAX_TITLE_CANVAS_PIXELS : MAX_GAMEPLAY_CANVAS_PIXELS;
  return Math.min(devicePixelRatio, 1, Math.sqrt(budget / (width * height)));
}

export function initializeAndroidGraphics(save: SaveData): SaveData {
  if (save.androidGraphicsInitialized) return save;
  const { settings } = save;
  const untouched = settings.fogQuality === DEFAULT_SETTINGS.fogQuality
    && settings.vfxQuality === DEFAULT_SETTINGS.vfxQuality
    && settings.parallaxEnabled === DEFAULT_SETTINGS.parallaxEnabled;
  return {
    ...save,
    androidGraphicsInitialized: true,
    settings: untouched ? { ...settings, ...ANDROID_GRAPHICS_DEFAULTS } : settings,
  };
}
