import { COURSE_MARKERS } from './trainingSession';
import { drawDetailedProp } from './propRender';
import type { PositionInterpolator } from './renderInterpolation';
import { dot, getTorchGlow, mkGrad, poly } from './renderPrimitives';
import { getColoredGlow, getCornicePattern, getStonePattern } from './textures';
import type { BiomeDef, RoomData } from './types';
import { drawPlantedRelicSword } from './weaponRender';

export function renderTerrainAndTorches(
  ctx: CanvasRenderingContext2D,
  room: RoomData,
  b: BiomeDef,
  camX: number,
  W: number,
  time: number,
  interpolate: PositionInterpolator,
  reduceOverdraw = false,
): void {
  // 1. Forged-Iron Wall Sconces & Torches with Warm Volumetric Glow
  const glowSprite = getTorchGlow();
  for (const t of room.torches) {
    if (t.x < camX - 200 || t.x > camX + W + 200) continue;
    const flick = 1 + Math.sin(time * 9.5 + t.x * 0.13) * 0.085;
    const r = (reduceOverdraw ? 96 : 148) * flick;
    if (glowSprite) {
      ctx.save();
      if (!reduceOverdraw) ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.62;
      ctx.drawImage(glowSprite, Math.round(t.x - r), Math.round(t.y - r), Math.round(r * 2), Math.round(r * 2));
      ctx.restore();
    }

    // Tapered gothic stone-and-iron sconce shield
    poly(
      ctx,
      [t.x, t.y - 9, t.x + 8.5, t.y - 3, t.x + 6, t.y + 18, t.x, t.y + 27, t.x - 6, t.y + 18, t.x - 8.5, t.y - 3],
      '#171219',
      '#3d302a',
      1.1
    );

    // Wrought-iron bracket arm & spiked cup
    ctx.fillStyle = '#120e14';
    ctx.fillRect(t.x - 3.5, t.y + 1, 7, 21);
    ctx.fillStyle = '#473930';
    ctx.fillRect(t.x - 2, t.y + 2, 2.5, 18);
    poly(ctx, [t.x - 9, t.y - 1, t.x + 9, t.y - 1, t.x + 6, t.y + 6, t.x - 6, t.y + 6], '#2d2320', '#735a45', 1.1);

    // Multi-tongue roaring flame + rising sparks
    const sway = Math.sin(time * 13 + t.x) * 2.8;
    const sway2 = Math.cos(time * 10.2 + t.x * 0.5) * 1.8;
    ctx.fillStyle = '#b8321c';
    ctx.beginPath();
    ctx.moveTo(t.x - 6.5, t.y);
    ctx.quadraticCurveTo(t.x - 5, t.y - 12, t.x + sway, t.y - 22 * flick);
    ctx.quadraticCurveTo(t.x + 6, t.y - 11, t.x + 6.5, t.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff8a28';
    ctx.beginPath();
    ctx.moveTo(t.x - 4.2, t.y);
    ctx.quadraticCurveTo(t.x - 2, t.y - 9, t.x + sway * 0.7 + sway2 * 0.3, t.y - 16 * flick);
    ctx.quadraticCurveTo(t.x + 3.5, t.y - 8, t.x + 4.2, t.y);
    ctx.closePath();
    ctx.fill();

    dot(ctx, t.x, t.y - 3.5, 3.2, '#fff3b8');

    // Two rising ember sparks per torch
    for (let sp = 0; sp < 2; sp++) {
      const sy = ((time * 24 + sp * 13 + t.x) % 28);
      const sx = t.x + Math.sin(time * 4 + sp * 2.1 + t.x) * 5;
      ctx.globalAlpha = (1 - sy / 28) * 0.85;
      ctx.fillStyle = sp === 0 ? '#ffd470' : '#ff7b29';
      ctx.fillRect(sx, t.y - 12 - sy, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // 2. Sculpted Gothic Masonry Platforms, Bridges & Grounds
  const stonePat = getStonePattern(ctx, b);
  const cornicePat = getCornicePattern(ctx, b);

  for (const entity of room.platforms) {
    const p = interpolate(entity);
    if (p.x + p.w < camX - 40 || p.x > camX + W + 40) continue;
    const drawX = Math.max(p.x, Math.floor(camX - 4));
    const drawRight = Math.min(p.x + p.w, Math.ceil(camX + W + 4));
    const drawW = drawRight - drawX;
    if (drawW <= 0) continue;

    if (p.broken) {
      ctx.strokeStyle = 'rgba(150, 88, 58, 0.32)';
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      continue;
    }

    if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
      ctx.globalAlpha = 0.52 + Math.sin(p.crumbleT * 42) * 0.32;
    }

    if (p.type === 'bounce') {
      // Forged obsidian thermal vent cauldron with glowing molten runes
      ctx.fillStyle = '#1b1419';
      ctx.fillRect(p.x, p.y + 3, p.w, p.h - 3);
      ctx.strokeStyle = '#5c3c2e';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(p.x, p.y + 3, p.w, p.h - 3);
      ctx.fillStyle = '#3d251d';
      ctx.fillRect(p.x + 3, p.y, p.w - 6, 5);
      ctx.fillStyle = '#ff7b29';
      ctx.fillRect(p.x + 8, p.y - 1, p.w - 16, 3);
      const glowY = p.y - 11 - Math.abs(Math.sin(time * 4.5)) * 12;
      ctx.fillStyle = 'rgba(255, 208, 120, 0.78)';
      ctx.fillRect(p.x + p.w * 0.24, glowY, p.w * 0.52, 2.5);
      ctx.lineWidth = 1;
    } else if (p.type === 'moving') {
      // Mechanical brass & obsidian chain-driven stone plinth
      const midX = p.x + p.w * 0.5;
      ctx.strokeStyle = '#3d332c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 12, p.y - 44);
      ctx.lineTo(p.x + 12, p.y + 4);
      ctx.moveTo(p.x + p.w - 12, p.y - 44);
      ctx.lineTo(p.x + p.w - 12, p.y + 4);
      ctx.stroke();

      ctx.fillStyle = stonePat || b.stone;
      ctx.fillRect(drawX, p.y, drawW, p.h);

      // Brass-framed edge guards & central solar gear core
      ctx.fillStyle = '#755830';
      ctx.fillRect(p.x, p.y, 7, p.h);
      ctx.fillRect(p.x + p.w - 7, p.y, 7, p.h);
      ctx.fillStyle = '#d4a853';
      ctx.fillRect(drawX, p.y, drawW, 4);
      ctx.fillStyle = 'rgba(255, 240, 198, 0.35)';
      ctx.fillRect(drawX, p.y, drawW, 1.5);
      ctx.strokeStyle = '#0c0910';
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      dot(ctx, midX, p.y + p.h * 0.55, 6.5, '#1b141a');
      dot(ctx, midX, p.y + p.h * 0.55, 2.8, '#ffd470');
      ctx.lineWidth = 1;
    } else {
      // Base ashlar stone masonry anchored vertically to platform top
      ctx.save();
      ctx.translate(0, p.y);
      ctx.fillStyle = stonePat || b.stone;
      ctx.fillRect(drawX, 0, drawW, p.h);
      ctx.restore();

      if (p.h >= 60) {
        // Thick solid ground: subtle recessed relief arches + deep abyssal bottom fade
        ctx.fillStyle = 'rgba(6, 4, 9, 0.38)';
        for (let ax = Math.floor(drawX / 120) * 120 + 20; ax < drawRight - 40; ax += 120) {
          ctx.beginPath();
          ctx.arc(ax + 38, p.y + 52, 28, Math.PI, 0);
          ctx.lineTo(ax + 66, p.y + p.h);
          ctx.lineTo(ax + 10, p.y + p.h);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = mkGrad(ctx, 0, p.y + 18, 0, p.y + p.h, null, [
          [0, 'rgba(5, 4, 8, 0.12)'],
          [0.45, 'rgba(5, 4, 8, 0.45)'],
          [1, 'rgba(4, 3, 6, 0.88)'],
        ]);
        ctx.fillRect(drawX, p.y + 18, drawW, p.h - 18);
      }

      if (p.type !== 'solid') {
        // Sculpted Gothic Corbelled Stone Bridge underside
        poly(
          ctx,
          [
            p.x + 4, p.y + p.h,
            p.x + 12, p.y + p.h + 13,
            p.x + 28, p.y + p.h + 7,
            p.x + p.w * 0.5 - 12, p.y + p.h + 4,
            p.x + p.w * 0.5, p.y + p.h + 11,
            p.x + p.w * 0.5 + 12, p.y + p.h + 4,
            p.x + p.w - 28, p.y + p.h + 7,
            p.x + p.w - 12, p.y + p.h + 13,
            p.x + p.w - 4, p.y + p.h,
          ],
          '#100c14',
          'rgba(255, 224, 180, 0.11)',
          1
        );

        const rootSeed = Math.round(p.x * 0.1);
        for (let rx = drawX + 22; rx < drawRight - 22; rx += 42) {
          const rh = 7 + Math.abs(Math.sin(rx * 0.35 + rootSeed)) * 12;
          poly(ctx, [rx - 3.5, p.y + p.h, rx + 3.5, p.y + p.h, rx, p.y + p.h + rh], '#130e17');
          poly(ctx, [rx - 3.5, p.y + p.h, rx, p.y + p.h, rx, p.y + p.h + rh], 'rgba(130, 120, 138, 0.16)');
        }

        // Suspended forged iron chain with link beads
        if (Math.round(p.x) % 2 === 0) {
          const chainX = p.x + p.w * 0.5;
          if (chainX > camX - 30 && chainX < camX + W + 30) {
            const cSway = Math.sin(time * 1.35 + chainX * 0.05) * 3;
            ctx.strokeStyle = '#2d2522';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(chainX, p.y + p.h + 8);
            ctx.lineTo(chainX + cSway, p.y + p.h + 38);
            ctx.stroke();
            for (let k = 1; k <= 3; k++) {
              const frac = k / 3.5;
              dot(ctx, chainX + cSway * frac, p.y + p.h + 8 + 30 * frac, 2.2, '#53443b');
            }
          }
        }
      }

      // Sculpted Gothic Capstone Cornice
      if (p.type === 'crumble') {
        ctx.fillStyle = '#8f4f32';
        ctx.fillRect(drawX, p.y, drawW, 6);
        // Glowing fracture seams across crumbling slabs
        ctx.strokeStyle = '#ff7b29';
        ctx.lineWidth = 1.2;
        for (let cx = drawX + 16; cx < drawRight - 10; cx += 24) {
          ctx.beginPath();
          ctx.moveTo(cx, p.y);
          ctx.lineTo(cx + 4, p.y + p.h * 0.5);
          ctx.lineTo(cx - 2, p.y + p.h);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      } else if (cornicePat) {
        ctx.save();
        ctx.translate(0, p.y);
        ctx.fillStyle = cornicePat;
        ctx.fillRect(drawX, 0, drawW, Math.min(14, p.h));
        ctx.restore();
      } else {
        ctx.fillStyle = b.trim;
        ctx.fillRect(drawX, p.y, drawW, 6);
        ctx.fillStyle = 'rgba(255, 240, 212, 0.22)';
        ctx.fillRect(drawX, p.y, drawW, 1.8);
      }

      // Subtle biome-tinted moss, ash & mineral tufts along stone platform top
      ctx.fillStyle =
        b.id === 'sanctuaire'
          ? 'rgba(212, 168, 83, 0.42)'
          : b.id === 'fleche'
          ? 'rgba(180, 52, 68, 0.36)'
          : 'rgba(112, 138, 156, 0.32)';
      for (let mx = drawX + 10; mx < drawRight - 10; mx += 32) {
        if (Math.sin(mx * 11.7) > 0.2) {
          ctx.fillRect(mx, p.y - 1.5, 7, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Warm torchlight bounce pools & subterranean ember cracks + planted relic swords along solid ground
  ctx.fillStyle = 'rgba(255, 148, 62, 0.14)';
  for (const t of room.torches) {
    if (t.x < camX - 100 || t.x > camX + W + 100) continue;
    if (Math.abs(room.groundY - t.y) < 165) {
      ctx.beginPath();
      ctx.ellipse(t.x, room.groundY + 2, 62, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let pIdx = 0; pIdx < room.platforms.length; pIdx++) {
    const p = room.platforms[pIdx];
    if (p.broken || p.type !== 'solid' || p.w < 240) continue;
    if (p.x + p.w < camX - 60 || p.x > camX + W + 60) continue;
    const fx = p.x + p.w * 0.42;
    if (fx > camX - 80 && fx < camX + W + 80) {
      const glowPulse = 0.38 + 0.25 * Math.sin(time * 2.2 + pIdx);
      const amberGlow = getColoredGlow('amber');
      if (amberGlow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glowPulse * 0.44;
        ctx.drawImage(amberGlow, fx - 46, p.y + 6, 92, 24);
        ctx.restore();
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(7, 5, 8, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(fx - 26, p.y + 15);
      ctx.lineTo(fx - 9, p.y + 18);
      ctx.lineTo(fx + 8, p.y + 16);
      ctx.lineTo(fx + 27, p.y + 21);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 114, 38, ${glowPulse})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
    if (pIdx % 3 === 1 && p.x + 68 > camX - 40 && p.x + 68 < camX + W + 40) {
      drawPlantedRelicSword(ctx, p.x + 68, p.y + 2, -0.14, 0.86, true);
    }
  }
}

export function renderHazards(
  ctx: CanvasRenderingContext2D,
  room: RoomData,
  camX: number,
  W: number,
  interpolate: PositionInterpolator,
): void {
  for (const entity of room.hazards) {
    const h = interpolate(entity);
    if (h.x + h.w < camX - 60 || h.x > camX + W + 60) continue;
    if (h.kind === 'spikes') {
      // Forged iron spike bedplate
      ctx.fillStyle = '#1b1418';
      ctx.fillRect(h.x, h.y + 20, h.w, 5);
      for (let x = h.x; x < h.x + h.w; x += 14) {
        poly(ctx, [x + 1, h.y + 22, x + 7, h.y, x + 13, h.y + 22], '#3c3f4a');
        poly(ctx, [x + 7, h.y, x + 10.5, h.y + 22, x + 7, h.y + 22], '#7e8694');
        poly(ctx, [x + 5, h.y + 7, x + 7, h.y, x + 9, h.y + 7], '#9c2432');
      }
    } else if (h.kind === 'flamejet') {
      ctx.fillStyle = '#241c20';
      ctx.fillRect(h.x, h.y + 5, h.w, 9);
      ctx.strokeStyle = '#634c3d';
      ctx.strokeRect(h.x, h.y + 5, h.w, 9);
      if (h.active) {
        ctx.fillStyle = 'rgba(235, 112, 42, 0.85)';
        ctx.fillRect(h.x + 3, h.y - 84, h.w - 6, 90);
        ctx.fillStyle = '#fff0a8';
        ctx.fillRect(h.x + 7, h.y - 68, h.w - 14, 74);
      } else if (h.timer > 2.2) {
        ctx.fillStyle = 'rgba(255, 130, 48, 0.88)';
        ctx.fillRect(h.x + 6, h.y + 2, h.w - 12, 4);
      }
    } else if (h.kind === 'pendulum' && h.pivotX !== undefined && h.pivotY !== undefined && h.length) {
      const ang = h.angle ?? 0;
      const bx = h.pivotX + Math.sin(ang) * h.length;
      const by = h.pivotY + Math.cos(ang) * h.length;
      ctx.save();
      ctx.fillStyle = '#2b2220';
      ctx.fillRect(h.pivotX - 9, h.pivotY - 5, 18, 10);
      ctx.strokeStyle = '#6c5a4a';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(h.pivotX, h.pivotY);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Crescent guillotine blade with bevel & brass rivets
      ctx.translate(bx, by);
      ctx.rotate(-ang);
      ctx.fillStyle = '#3c434f';
      ctx.beginPath();
      ctx.moveTo(-26, -5);
      ctx.quadraticCurveTo(0, 24, 26, -5);
      ctx.quadraticCurveTo(0, 6, -26, -5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#dce4ee';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#8b2430';
      ctx.fillRect(-12, 4, 24, 2.5);
      ctx.fillStyle = '#d4a853';
      ctx.beginPath();
      ctx.arc(-8, -1, 1.8, 0, Math.PI * 2);
      ctx.arc(8, -1, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function renderProps(
  ctx: CanvasRenderingContext2D,
  room: RoomData,
  camX: number,
  W: number,
  time: number,
): void {
  for (const pr of room.props) {
    if (pr.x + pr.w < camX - 100 || pr.x > camX + W + 100) continue;
    drawDetailedProp(ctx, pr, time);
  }
}

export function renderCourseMarkers(ctx: CanvasRenderingContext2D, groundY: number, progress: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.lineWidth = 2;

  for (let i = 0; i < COURSE_MARKERS.length; i++) {
    const { x, height } = COURSE_MARKERS[i];
    const y = groundY - height;
    const active = i === progress;
    const reached = i < progress;
    ctx.fillStyle = active ? '#ffda82' : reached ? '#294735' : '#221b19';
    ctx.strokeStyle = active ? '#fff1bc' : reached ? '#a9d1a6' : '#a69888';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 32, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#281a0a' : '#f8eddd';
    ctx.fillText(String(i + 1), x, y - 32);
    if (reached) {
      ctx.beginPath();
      ctx.moveTo(x + 16, y - 15);
      ctx.lineTo(x + 20, y - 11);
      ctx.lineTo(x + 27, y - 21);
      ctx.stroke();
    }
  }

  ctx.restore();
}
