import { renderDeepAtmosphericDecor, renderMidAtmosphereAndDust } from './atmosphere';
import { BIOMES } from './data';
import type { FrameProfile } from './frameProfile';
import { renderDeepParallaxLayers } from './parallax';
import { dot, getTorchGlow, mkGrad, poly } from './renderPrimitives';
import type { RenderContextState } from './renderer';
import { getCoronaSprite, renderBackdropAndEclipse, renderMidgroundArchitecture } from './sceneryRender';
import { getColoredGlow, getStonePattern, getTitleHeroArtwork } from './textures';
import type { BiomeDef } from './types';
import { drawPlantedRelicSword, drawWeaponSprite } from './weaponRender';

export function renderTitleShowcase(ctx: CanvasRenderingContext2D, W: number, H: number, time: number): void {
  const groundY = Math.round(H * 0.78);

  // Textured cracked ashlar terrace with smoldering subterranean ember veins
  const stonePat = getStonePattern(ctx, BIOMES[0]);
  ctx.fillStyle = stonePat || '#151118';
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = mkGrad(ctx, 0, groundY, 0, H, null, [[0, 'rgba(7,6,9,.14)'], [0.28, 'rgba(7,6,9,.56)'], [1, 'rgba(6,5,8,.94)']]);
  ctx.fillRect(0, groundY, W, H - groundY);

  // Carved stone cornice & brass frieze edge
  ctx.fillStyle = '#5c4635';
  ctx.fillRect(0, groundY, W, 6);
  ctx.fillStyle = 'rgba(255, 240, 212, 0.22)';
  ctx.fillRect(0, groundY, W, 1.8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, groundY + 6, W, 4);

  // Smoldering charred ash crevices across right-half stone foreground
  const fissurePulse = 0.45 + 0.32 * Math.sin(time * 2.4);
  const emberPool = getColoredGlow('amber');
  for (const fx of [W * 0.54, W * 0.67, W * 0.82]) {
    if (emberPool) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fissurePulse * 0.48;
      ctx.drawImage(emberPool, fx - 54, groundY + 14, 108, 34);
      ctx.restore();
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(7, 5, 8, 0.88)';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(fx - 38, groundY + 25);
    ctx.lineTo(fx - 10, groundY + 34);
    ctx.lineTo(fx + 14, groundY + 29);
    ctx.lineTo(fx + 42, groundY + 39);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 112, 36, ${fissurePulse})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.restore();
  }

  // Planted weathered swords in the ash flanking the showcase vigil
  drawPlantedRelicSword(ctx, Math.round(W * 0.54), groundY + 4, -0.22, 1.15, true);
  drawPlantedRelicSword(ctx, Math.round(W * 0.89), groundY + 6, 0.16, 1.25, true);

  // Ornate Wrought-Iron Sanctuary Brazier on right third with warm radial bloom
  const bx = Math.round(W * 0.79);
  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(glow, bx - 220, groundY - 245, 440, 440);
    ctx.globalAlpha = 1;
  }

  // Contact shadow under brazier
  ctx.fillStyle = 'rgba(4, 3, 6, 0.65)';
  ctx.beginPath();
  ctx.ellipse(bx, groundY + 2, 34, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clawed wrought-iron pedestal & ribbed fire bowl
  ctx.fillStyle = '#1b1416';
  ctx.fillRect(bx - 16, groundY - 26, 6, 26);
  ctx.fillRect(bx + 10, groundY - 26, 6, 26);
  ctx.fillRect(bx - 4, groundY - 26, 8, 22);
  poly(ctx, [bx - 27, groundY - 37, bx + 27, groundY - 37, bx + 19, groundY - 23, bx - 19, groundY - 23], '#332826', '#6c533f', 1.4);
  ctx.lineWidth = 1;

  // Multi-tongue roaring flame & rising ember sparks
  const fl = Math.sin(time * 7.5) * 4.5;
  const fl2 = Math.cos(time * 9.2) * 3;
  ctx.fillStyle = '#b8351c';
  ctx.beginPath();
  ctx.moveTo(bx - 18, groundY - 37);
  ctx.quadraticCurveTo(bx - 8, groundY - 72, bx + fl, groundY - 94);
  ctx.quadraticCurveTo(bx + 11, groundY - 68, bx + 18, groundY - 37);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff8624';
  ctx.beginPath();
  ctx.moveTo(bx - 12, groundY - 37);
  ctx.quadraticCurveTo(bx - 2, groundY - 64, bx + fl * 0.65 + fl2 * 0.4, groundY - 78);
  ctx.quadraticCurveTo(bx + 8, groundY - 58, bx + 12, groundY - 37);
  ctx.closePath();
  ctx.fill();

  dot(ctx, bx, groundY - 45, 7.5, '#fff3b8');

  for (let s = 0; s < 8; s++) {
    const sy = ((time * 32 + s * 17) % 86);
    const sx = bx + Math.sin(time * 3 + s * 1.9) * 24 - s * 5;
    ctx.globalAlpha = 1 - sy / 86;
    ctx.fillStyle = s % 2 === 0 ? '#ffd470' : '#ff7b29';
    ctx.fillRect(sx, groundY - 52 - sy, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;

  // Monumental Crowned Eclipse Knight Showcase keeping vigil beneath the Solar Eclipse
  const px = Math.round(W * 0.65);
  const bob = Math.sin(time * 1.9) * 1.5;
  const cloakWave = Math.sin(time * 2.5) * 4;
  ctx.save();
  ctx.translate(px, groundY);
  ctx.scale(1.88, 1.88);

  // Warm rim glow behind hero
  if (glow) {
    ctx.globalAlpha = 0.36;
    ctx.drawImage(glow, -48, -68, 96, 96);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(4, 3, 6, 0.68)';
  ctx.beginPath();
  ctx.ellipse(2, 1, 26, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tattered Crimson-lined War Cloak billowing left
  ctx.fillStyle = '#47151e';
  ctx.beginPath();
  ctx.moveTo(-4, -37 + bob);
  ctx.quadraticCurveTo(-22, -23 + cloakWave * 0.4, -34, -2 + cloakWave * 0.3);
  ctx.lineTo(-22, -7);
  ctx.lineTo(-14, -1);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1b161d';
  ctx.beginPath();
  ctx.moveTo(-4, -38 + bob);
  ctx.quadraticCurveTo(-20, -25 + cloakWave * 0.4, -31, -6 + cloakWave * 0.3);
  ctx.lineTo(-19, -11);
  ctx.lineTo(-10, -4);
  ctx.lineTo(7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crimson shoulder scarf
  ctx.fillStyle = '#781d29';
  ctx.beginPath();
  ctx.moveTo(-3, -36 + bob);
  ctx.quadraticCurveTo(-18, -35, -30, -27 + cloakWave * 0.35);
  ctx.lineTo(-24, -22 + cloakWave * 0.35);
  ctx.quadraticCurveTo(-14, -30, 0, -31 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Greaves, Sabatons & Chainmail + Tattered Split Surcoat
  ctx.fillStyle = '#252831';
  ctx.fillRect(-7.5, -16, 5, 16);
  ctx.fillRect(2.5, -16, 5, 16);
  ctx.fillStyle = '#5a6070';
  ctx.fillRect(-7, -11, 4, 3);
  ctx.fillRect(3, -11, 4, 3);

  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(-8, -20, 16, 11);
  poly(ctx, [-4.5, -19, 4.5, -19, 5.5, -4, 1, -8, -2, -3, -5, -7], '#631b26');

  // Engraved Eclipse Cuirass, Cross-Belt & Hip Pouch
  poly(ctx, [-10.5, -15, -9, -36 + bob, 9, -36 + bob, 10.5, -15], '#2c303a', '#09070b', 1);

  ctx.strokeStyle = '#c89b4b';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -27 + bob * 0.7, 4.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#472f22';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-7, -35 + bob);
  ctx.lineTo(7.5, -20);
  ctx.stroke();
  ctx.fillStyle = '#38251a';
  ctx.fillRect(-10, -20, 20, 3);
  ctx.fillStyle = '#ffd470';
  ctx.fillRect(-2, -20.5, 4, 4);

  // Lamellar Shoulder Pauldrons catching warm brazier highlight
  for (const side of [-1, 1] as const) {
    ctx.fillStyle = side === 1 ? '#5e6675' : '#3d424e';
    ctx.beginPath();
    ctx.ellipse(side * 7.5, -33 + bob, 7.6, 5.2, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = side === 1 ? '#ffb86b' : '#120e16';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Jagged Crowned Gothic Fluted Visor Helm
  poly(ctx, [-7.2, -48 + bob, 7.2, -48 + bob, 7.5, -38 + bob, 0, -33.5 + bob, -7.5, -38 + bob], '#383d48', '#09070b', 1);
  poly(ctx, [-7, -47 + bob, -8, -54 + bob, -3.5, -49.5 + bob, 0, -56.5 + bob, 3.5, -49.5 + bob, 8, -54 + bob, 7, -47 + bob], '#8b6f47', '#09070b', 1);

  // Breather Grille & Fierce Molten Ember Eyes
  ctx.strokeStyle = '#100c14';
  ctx.lineWidth = 0.9;
  for (let gx = -3; gx <= 3; gx += 2) {
    ctx.beginPath();
    ctx.moveTo(gx, -40 + bob);
    ctx.lineTo(gx * 0.8, -35.5 + bob);
    ctx.stroke();
  }
  ctx.fillStyle = '#0d090e';
  ctx.fillRect(-4.5, -43.8 + bob, 9.5, 2.6);
  ctx.fillStyle = '#ff6a1f';
  ctx.fillRect(-3.6, -43.4 + bob, 3, 1.8);
  ctx.fillRect(1.2, -43.4 + bob, 3.2, 1.8);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(2, -43.1 + bob, 1.4, 1.1);

  // Runic Bastard Sword held diagonally toward the ember-cracked ground
  ctx.save();
  ctx.translate(10, -24 + bob);
  ctx.rotate(1.16);
  drawWeaponSprite(ctx, 'clay_blade', 0.96);
  ctx.restore();
  ctx.restore();
}

export function renderTitleArtworkBackdrop(
  ctx: CanvasRenderingContext2D,
  art: HTMLImageElement,
  biome: BiomeDef,
  W: number,
  H: number,
  time: number,
  fogQuality: 'off' | 'medium' | 'high'
): void {
  ctx.fillStyle = '#070509';
  ctx.fillRect(0, 0, W, H);

  // Scale image slightly wider to allow smooth right-shift framing (Knight occupies right 62%, UI sits clearly on left 38%)
  const coverScale = Math.max((W * 1.16) / art.naturalWidth, H / art.naturalHeight);
  const dw = art.naturalWidth * coverScale;
  const dh = art.naturalHeight * coverScale;
  const panX = Math.sin(time * 0.25) * 6;
  const dx = Math.round(W - dw + dw * 0.045 + panX);
  const dy = Math.round((H - dh) * 0.38);

  ctx.drawImage(art, dx, dy, dw, dh);

  // Subtle top/bottom vignette & left-third dark-plum reading scrim protecting title typography & controls
  ctx.fillStyle = mkGrad(ctx, 0, 0, W * 0.62, 0, null, [[0, 'rgba(7,5,10,.94)'], [0.46, 'rgba(8,6,12,.78)'], [0.76, 'rgba(9,7,13,.32)'], [1, 'rgba(9,7,13,0)']]);
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = mkGrad(ctx, 0, H * 0.72, 0, H, null, [[0, 'rgba(7,5,10,0)'], [1, 'rgba(7,5,10,.76)']]);
  ctx.fillRect(0, H * 0.72, W, H * 0.28);

  // Live additive Solar Eclipse corona pulse aligned to the painted Eclipse in the 2K concept art
  const eclipseX = dx + dw * 0.635;
  const eclipseY = dy + dh * 0.255;
  const corona = getCoronaSprite();
  if (corona) {
    const pulse = 1 + Math.sin(time * 1.8) * 0.06;
    const rad = dw * 0.145 * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 + Math.sin(time * 2.2) * 0.08;
    ctx.drawImage(corona, eclipseX - rad, eclipseY - rad, rad * 2, rad * 2);
    ctx.restore();
  }

  // Flickering additive ember bloom along the painted runic sword & cracked ash foreground
  const amber = getColoredGlow('amber');
  if (amber) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const swordX = dx + dw * 0.31;
    const swordY = dy + dh * 0.71;
    const flick = 0.22 + Math.sin(time * 5.2) * 0.07;
    ctx.globalAlpha = flick;
    ctx.drawImage(amber, swordX - 90, swordY - 90, 180, 180);
    ctx.restore();
  }

  // Live drifting volumetric mist & glowing rising ember particles across the painted ruin terrace
  renderMidAtmosphereAndDust(ctx, biome, W, H, time * 14, 0, time, true, fogQuality);
}

export function renderTitleFrame(
  ctx: CanvasRenderingContext2D,
  st: RenderContextState,
  profile?: FrameProfile,
): void {
  const { width: W, height: H, time } = st;
  const b = st.room ? st.room.biome : BIOMES[0];
  const fogQuality = st.settings?.fogQuality ?? 'high';
  const titleArt = getTitleHeroArtwork();
  if (titleArt) {
    const titleStart = profile?.now() ?? 0;
    renderTitleArtworkBackdrop(ctx, titleArt, b, W, H, time, fogQuality);
    profile?.finishTiming('titleArtwork', titleStart);
    return;
  }

  const camX = Math.sin(time * 0.14) * 90 + 160;
  const camY = 120;
  let sceneryStart = profile?.now() ?? 0;
  const eclipseX = renderBackdropAndEclipse(ctx, b, W, H, camX, camY, time, true, st.trauma);
  const parallaxOn = st.settings?.parallaxEnabled !== false;
  const shakeMult = st.settings?.screenShakeScale ?? 1;
  profile?.finishTiming('backdropAndEclipse', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  if (parallaxOn) {
    renderDeepParallaxLayers(ctx, b, W, H, camX, 0, time, st.trauma * shakeMult);
  }
  renderDeepAtmosphericDecor(ctx, b, W, H, camX, 0, time, true, fogQuality);
  profile?.finishTiming('distantScenery', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  renderMidgroundArchitecture(ctx, W, H, camX, camY, time, true, st.trauma * shakeMult, eclipseX);
  profile?.finishTiming('midgroundArchitecture', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  renderMidAtmosphereAndDust(ctx, b, W, H, camX, 0, time, true, fogQuality);
  profile?.finishTiming('midgroundAtmosphere', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  renderTitleShowcase(ctx, W, H, time);
  profile?.finishTiming('titleShowcase', sceneryStart);
}
