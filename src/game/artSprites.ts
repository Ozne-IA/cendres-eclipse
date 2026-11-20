import { ARMOR_SKINS_DEF } from './data';
import { getColoredGlow } from './textures';
import type { ArmorSkinKey, Enemy, Player, RoomProp, WeaponKey } from './types';

// File temporarily reduced. Full restore needed.
export function getTorchGlow() { return getColoredGlow('amber'); }
export function getCrimsonGlow() { return getColoredGlow('crimson'); }
export function getAstralGlow() { return getColoredGlow('astral'); }
export function drawWeaponSprite() {}
export function drawPlantedRelicSword() {}
export function drawGroundShadow() {}
export function drawDetailedPlayer() {}
export function drawDetailedEnemy() {}
export function drawDetailedProp() {}
