import { drawDetailedProp } from './propRender';
import type { PositionInterpolator } from './renderInterpolation';
import { getTorchGlow } from './renderPrimitives';
import { getColoredGlow, getStonePattern } from './textures';
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
): void {
  // 6. Torches & Wrought-Iron Wall Sconces
  const glowSprite = getTorchGlow();
  for (const t of room.torches) {
    if (t.x < camX - 180 || t.x > camX + W + 180) continue;
    const flick = 1 + Math.sin(time * 9 + t.x) * 0.08;
    const r = 132 * flick;
    if (glowSprite) {
      ctx.globalAlpha = 0.74;
      ctx.drawImage(glowSprite, Math.round(t.x - r), Math.round(t.y - r), Math.round(r * 2), Math.round(r * 2));
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#241c19';
    ctx.fillRect(t.x - 3, t.y, 6, 18);
    ctx.fillStyle = '#5c4839';
    ctx.fillRect(t.x - 7, t.y, 14, 3.5);
    const sway = Math.sin(time * 13 + t.x) * 2.5;
    ctx.fillStyle = '#d45124';
    ctx.beginPath();
    ctx.moveTo(t.x - 5.5, t.y);
    ctx.quadraticCurveTo(t.x - 3, t.y - 10, t.x + sway, t.y - 18 * flick);
    ctx.quadraticCurveTo(t.x + 4, t.y - 9, t.x + 5.5, t.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff0a8';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 3.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Textured Carved Stone Platforms & Gothic Bridges (horizontally clipped to viewport)
  const stonePat = getStonePattern(ctx, b);
  for (const entity of room.platforms) {
    const p = interpolate(entity);
    if (p.x + p.w < camX - 40 || p.x > camX + W + 40) continue;
    const drawX = Math.max(p.x, Math.floor(camX - 4));
    const drawRight = Math.min(p.x + p.w, Math.ceil(camX + W + 4));
    const drawW = drawRight - drawX;
    if (drawW <= 0) continue;

    if (p.broken) {
      ctx.strokeStyle = 'rgba(150, 88, 58, 0.35)';
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      continue;
    }

    if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(p.crumbleT * 42) * 0.3;
    }

    if (p.type === 'bounce') {
      ctx.fillStyle = '#36231c';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e06b2b';
      ctx.fillRect(p.x + 4, p.y - 3, p.w - 8, 4);
      const glowY = p.y - 11 - Math.abs(Math.sin(time * 4)) * 10;
      ctx.fillStyle = 'rgba(255, 194, 100, 0.72)';
      ctx.fillRect(p.x + p.w * 0.25, glowY, p.w * 0.5, 3);
    } else {
      ctx.fillStyle = stonePat || b.stone;
      ctx.fillRect(drawX, p.y, drawW, p.h);

      if (p.h >= 60) {
        ctx.fillStyle = 'rgba(6, 5, 8, 0.36)';
        ctx.fillRect(drawX, p.y + Math.round(p.h * 0.32), drawW, Math.ceil(p.h * 0.68));
        ctx.fillStyle = 'rgba(5, 4, 7, 0.72)';
        ctx.fillRect(drawX, p.y + Math.round(p.h * 0.66), drawW, Math.ceil(p.h * 0.34));
      }

      if (p.type !== 'solid') {
        // Carved stone/iron bridge corbel brackets beneath suspended platforms
        ctx.fillStyle = '#141018';
        ctx.fillRect(p.x + 10, p.y + p.h, 12, 10);
        ctx.fillRect(p.x + p.w - 22, p.y + p.h, 12, 10);
        ctx.fillStyle = '#68523e';
        ctx.fillRect(p.x + 12, p.y + p.h + 2, 8, 3);
        ctx.fillRect(p.x + p.w - 20, p.y + p.h + 2, 8, 3);
        ctx.fillStyle = 'rgba(6, 5, 9, 0.45)';
        ctx.fillRect(drawX, p.y + p.h - 4, drawW, 4);

        // Hanging gothic stone stalactites & weathered creeping roots beneath suspended platforms
        const rootSeed = Math.round(p.x * 0.1);
        ctx.fillStyle = '#100c14';
        for (let rx = drawX + 16; rx < drawRight - 16; rx += 28) {
          const rh = 6 + Math.abs(Math.sin(rx * 0.35 + rootSeed)) * 14;
          const rSway = Math.sin(time * 1.8 + rx) * 1.6;
          ctx.beginPath();
          ctx.moveTo(rx - 2.5, p.y + p.h);
          ctx.lineTo(rx + 2.5, p.y + p.h);
          ctx.lineTo(rx + rSway, p.y + p.h + rh);
          ctx.closePath();
          ctx.fill();
        }

        // Suspended wrought-iron dungeon chains
        if (Math.round(p.x) % 2 === 0) {
          const chainX = p.x + p.w * 0.5;
          if (chainX > camX - 30 && chainX < camX + W + 30) {
            const cSway = Math.sin(time * 1.35 + chainX * 0.05) * 3.5;
            ctx.strokeStyle = '#2b2320';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(chainX, p.y + p.h);
            ctx.lineTo(chainX + cSway, p.y + p.h + 36);
            ctx.stroke();
            ctx.fillStyle = '#423630';
            ctx.beginPath();
            ctx.arc(chainX + cSway, p.y + p.h + 38, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Sculpted Gothic Capstone Cornice
      ctx.fillStyle =
        p.type === 'crumble'
          ? '#96583a'
          : p.type === 'moving'
          ? '#d4a853'
          : b.trim;
      ctx.fillRect(drawX, p.y, drawW, 6);
      // Specular rim highlight along top stone edge
      ctx.fillStyle = 'rgba(255, 240, 212, 0.2)';
      ctx.fillRect(drawX, p.y, drawW, 1.8);
      // Recessed shadow under cornice overhang
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.fillRect(drawX, p.y + 6, drawW, 3);

      // Subtle ash moss & spectral lichen tufts along stone platform surface
      ctx.fillStyle =
        b.id === 'sanctuaire'
          ? 'rgba(212, 168, 83, 0.45)'
          : b.id === 'fleche'
          ? 'rgba(180, 52, 68, 0.36)'
          : 'rgba(112, 138, 156, 0.35)';
      for (let mx = drawX + 10; mx < drawRight - 10; mx += 32) {
        if (Math.sin(mx * 11.7) > 0.18) {
          ctx.fillRect(mx, p.y - 1.5, 6, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Warm torchlight reflection pools + smoldering subterranean ember cracks & planted relic swords along solid ground
  ctx.fillStyle = 'rgba(255, 148, 62, 0.12)';
  for (const t of room.torches) {
    if (t.x < camX - 100 || t.x > camX + W + 100) continue;
    if (Math.abs(room.groundY - t.y) < 150) {
      ctx.beginPath();
      ctx.ellipse(t.x, room.groundY + 2, 54, 5, 0, 0, Math.PI * 2);
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
        ctx.globalAlpha = glowPulse * 0.42;
        ctx.drawImage(amberGlow, fx - 44, p.y + 4, 88, 22);
        ctx.restore();
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(7, 5, 8, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(fx - 26, p.y + 11);
      ctx.lineTo(fx - 9, p.y + 14);
      ctx.lineTo(fx + 8, p.y + 12);
      ctx.lineTo(fx + 27, p.y + 17);
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
  // 8. Hazards
  for (const entity of room.hazards) {
    const h = interpolate(entity);
    if (h.x + h.w < camX - 60 || h.x > camX + W + 60) continue;
    if (h.kind === 'spikes') {
      for (let x = h.x; x < h.x + h.w; x += 14) {
        ctx.fillStyle = '#47151c';
        ctx.beginPath();
        ctx.moveTo(x, h.y + 24);
        ctx.lineTo(x + 7, h.y);
        ctx.lineTo(x + 14, h.y + 24);
        ctx.fill();
        ctx.fillStyle = '#b83c4c';
        ctx.beginPath();
        ctx.moveTo(x + 7, h.y);
        ctx.lineTo(x + 10.5, h.y + 24);
        ctx.lineTo(x + 7, h.y + 24);
        ctx.fill();
      }
    } else if (h.kind === 'flamejet') {
      ctx.fillStyle = '#2e2226';
      ctx.fillRect(h.x, h.y + 6, h.w, 8);
      if (h.active) {
        ctx.fillStyle = 'rgba(235, 112, 42, 0.85)';
        ctx.fillRect(h.x + 3, h.y - 84, h.w - 6, 90);
        ctx.fillStyle = '#fff0a8';
        ctx.fillRect(h.x + 7, h.y - 68, h.w - 14, 74);
      } else if (h.timer > 2.2) {
        ctx.fillStyle = 'rgba(255, 130, 48, 0.85)';
        ctx.fillRect(h.x + 6, h.y + 2, h.w - 12, 4);
      }
    } else if (h.kind === 'pendulum' && h.pivotX !== undefined && h.pivotY !== undefined && h.length) {
      const ang = h.angle ?? 0;
      const bx = h.pivotX + Math.sin(ang) * h.length;
      const by = h.pivotY + Math.cos(ang) * h.length;
      ctx.save();
      // Anchor bracket & wrought iron chain
      ctx.fillStyle = '#332826';
      ctx.fillRect(h.pivotX - 7, h.pivotY - 4, 14, 8);
      ctx.strokeStyle = '#6c5a4a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(h.pivotX, h.pivotY);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Crescent guillotine pendulum blade
      ctx.translate(bx, by);
      ctx.rotate(-ang);
      ctx.fillStyle = '#474f5c';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.quadraticCurveTo(0, 22, 24, -4);
      ctx.quadraticCurveTo(0, 6, -24, -4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4dde8';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#8b2430';
      ctx.fillRect(-10, 4, 20, 2.5);
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
  // 9. Props
  for (const pr of room.props) {
    if (pr.x + pr.w < camX - 100 || pr.x > camX + W + 100) continue;
    drawDetailedProp(ctx, pr, time);
  }
}
