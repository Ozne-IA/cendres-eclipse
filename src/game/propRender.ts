import { drawGroundShadow, getTorchGlow } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { RoomProp } from './types';

export function getCrimsonGlow(): HTMLCanvasElement | null {
  return getColoredGlow('crimson');
}

export function getAstralGlow(): HTMLCanvasElement | null {
  return getColoredGlow('astral');
}

export function drawDetailedProp(ctx: CanvasRenderingContext2D, pr: RoomProp, time: number): void {
  drawGroundShadow(ctx, pr.x + pr.w / 2, pr.y + pr.h, pr.w * 0.52, 0.42);

  if (pr.type === 'chest' || pr.type === 'gilded_chest') {
    const gilded = pr.type === 'gilded_chest';
    if (gilded && !pr.opened) {
      const g = getColoredGlow('gold');
      if (g) {
        ctx.globalAlpha = 0.58;
        ctx.drawImage(g, pr.x + pr.w / 2 - 56, pr.y + pr.h / 2 - 56, 112, 112);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = pr.opened ? '#261e1a' : gilded ? '#966824' : '#5e4024';
    ctx.fillRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + 8, pr.w / 2, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gilded ? '#ffd470' : '#b88d48';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.fillStyle = gilded ? '#ffd470' : '#968262';
    ctx.fillRect(pr.x + 6, pr.y + 3, 3, pr.h - 3);
    ctx.fillRect(pr.x + pr.w - 9, pr.y + 3, 3, pr.h - 3);
    if (!pr.opened) {
      ctx.fillRect(pr.x + pr.w / 2 - 3, pr.y + 11, 6, 8);
    }
    ctx.lineWidth = 1;
  } else if (pr.type === 'urn' && !pr.broken) {
    ctx.fillStyle = '#5c4337';
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h * 0.62, pr.w * 0.46, pr.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#120d12';
    ctx.stroke();
    ctx.fillStyle = '#8b6852';
    ctx.fillRect(pr.x + 4, pr.y, pr.w - 8, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(pr.x + 3, pr.y + 13, pr.w - 6, 2);
  } else if (pr.type === 'brazier') {
    const cx = pr.x + pr.w / 2;
    if (!pr.used) {
      const g = getTorchGlow();
      if (g) {
        ctx.globalAlpha = 0.82;
        ctx.drawImage(g, Math.round(cx - 104), Math.round(pr.y - 90), 208, 208);
        ctx.globalAlpha = 1;
      }
    }
    // Wrought-iron clawed feet & ribbed bowl
    ctx.fillStyle = '#1b1517';
    ctx.fillRect(pr.x + 7, pr.y + 20, 4, 18);
    ctx.fillRect(pr.x + pr.w - 11, pr.y + 20, 4, 18);
    ctx.fillRect(cx - 2, pr.y + 20, 4, 16);
    ctx.fillStyle = '#382c2a';
    ctx.beginPath();
    ctx.moveTo(pr.x - 1, pr.y + 10);
    ctx.lineTo(pr.x + pr.w + 1, pr.y + 10);
    ctx.lineTo(pr.x + pr.w - 5, pr.y + 22);
    ctx.lineTo(pr.x + 5, pr.y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6b5340';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.lineWidth = 1;

    if (!pr.used) {
      const fl = Math.sin(time * 9.5 + pr.x) * 3.5;
      ctx.fillStyle = '#c43e22';
      ctx.beginPath();
      ctx.moveTo(pr.x + 3, pr.y + 10);
      ctx.quadraticCurveTo(cx - 6, pr.y - 12, cx + fl, pr.y - 24);
      ctx.quadraticCurveTo(cx + 8, pr.y - 8, pr.x + pr.w - 3, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff8c2b';
      ctx.beginPath();
      ctx.moveTo(pr.x + 7, pr.y + 10);
      ctx.quadraticCurveTo(cx - 2, pr.y - 7, cx + fl * 0.65, pr.y - 16);
      ctx.quadraticCurveTo(cx + 4, pr.y - 5, pr.x + pr.w - 7, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff2b0';
      ctx.beginPath();
      ctx.arc(cx, pr.y + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pr.type === 'shrine') {
    if (!pr.used) {
      const cg = getCrimsonGlow();
      if (cg) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(cg, pr.x + pr.w / 2 - 80, pr.y - 56, 160, 160);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#262028';
    ctx.fillRect(pr.x + 4, pr.y + 18, pr.w - 8, pr.h - 18);
    ctx.fillStyle = '#4a3f4e';
    ctx.fillRect(pr.x, pr.y + pr.h - 8, pr.w, 8);
    const hover = pr.used ? 0 : Math.sin(time * 3) * 3.5;
    ctx.fillStyle = pr.used ? '#4a3d42' : '#e03c4e';
    ctx.beginPath();
    ctx.moveTo(pr.x + pr.w / 2, pr.y - 10 + hover);
    ctx.lineTo(pr.x + pr.w - 5, pr.y + 12 + hover);
    ctx.lineTo(pr.x + pr.w / 2, pr.y + 23 + hover);
    ctx.lineTo(pr.x + 5, pr.y + 12 + hover);
    ctx.closePath();
    ctx.fill();
    if (!pr.used) {
      ctx.fillStyle = 'rgba(255, 220, 226, 0.65)';
      ctx.beginPath();
      ctx.moveTo(pr.x + pr.w / 2, pr.y - 6 + hover);
      ctx.lineTo(pr.x + pr.w / 2 + 5, pr.y + 11 + hover);
      ctx.lineTo(pr.x + pr.w / 2, pr.y + 18 + hover);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pr.type === 'merchant') {
    const g = getTorchGlow();
    if (g) {
      ctx.globalAlpha = 0.68;
      ctx.drawImage(g, pr.x - 60, pr.y - 30, 120, 120);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#3d3028';
    ctx.fillRect(pr.x + 16, pr.y + 12, 16, 26);
    ctx.fillStyle = '#2a303c';
    ctx.beginPath();
    ctx.moveTo(pr.x + 2, pr.y + pr.h);
    ctx.lineTo(pr.x + 8, pr.y + 10);
    ctx.lineTo(pr.x + 26, pr.y + 10);
    ctx.lineTo(pr.x + 30, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#53453c';
    ctx.beginPath();
    ctx.arc(pr.x + 17, pr.y + 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b5235';
    ctx.fillRect(pr.x - 4, pr.y + 4, 3, pr.h - 4);
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(pr.x - 6, pr.y + 18 + Math.sin(time * 3) * 1.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (pr.type === 'lore') {
    if (!pr.used) {
      const ag = getAstralGlow();
      if (ag) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(ag, pr.x + pr.w / 2 - 64, pr.y - 34, 128, 128);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#2d2a34';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x + 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w / 2, pr.y);
    ctx.lineTo(pr.x + pr.w - 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120f16';
    ctx.stroke();
    ctx.fillStyle = pr.used ? '#6e645c' : '#8ab8e6';
    ctx.fillRect(pr.x + 8, pr.y + 13, pr.w - 16, 3);
    ctx.fillRect(pr.x + 7, pr.y + 21, pr.w - 14, 3);
    ctx.fillRect(pr.x + 9, pr.y + 29, pr.w - 18, 3);
  } else if (pr.type === 'npc' && !pr.used) {
    const ag = getAstralGlow();
    if (ag) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(ag, pr.x + pr.w / 2 - 60, pr.y - 28, 120, 120);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#3e5a7a';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x + 4, pr.y + 14);
    ctx.lineTo(pr.x + pr.w - 4, pr.y + 14);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e1d5';
    ctx.fillRect(pr.x + 7, pr.y + 2, pr.w - 14, 13);
  } else if (pr.type === 'exit') {
    // Gothic stone pillars & keystone arch
    ctx.fillStyle = '#241d26';
    ctx.fillRect(pr.x - 9, pr.y + 12, 11, pr.h - 12);
    ctx.fillRect(pr.x + pr.w - 2, pr.y + 12, 11, pr.h - 12);
    ctx.fillStyle = '#3b2f38';
    ctx.fillRect(pr.x - 11, pr.y + 10, 15, 5);
    ctx.fillRect(pr.x + pr.w - 4, pr.y + 10, 15, 5);

    ctx.fillStyle = pr.locked ? '#181014' : '#0f0b14';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x, pr.y + 24);
    ctx.quadraticCurveTo(pr.x + pr.w / 2, pr.y - 14, pr.x + pr.w, pr.y + 24);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pr.locked ? '#822834' : '#d4a853';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.lineWidth = 1;

    // Keystone crest
    ctx.fillStyle = pr.locked ? '#5e2029' : '#d4a853';
    ctx.fillRect(pr.x + pr.w / 2 - 4, pr.y + 2, 8, 8);

    if (pr.locked) {
      ctx.strokeStyle = '#a82835';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y + 28);
      ctx.lineTo(pr.x + pr.w, pr.y + 62);
      ctx.moveTo(pr.x + pr.w, pr.y + 28);
      ctx.lineTo(pr.x, pr.y + 62);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      const g = getColoredGlow('gold');
      if (g) {
        ctx.globalAlpha = 0.82;
        ctx.drawImage(g, Math.round(pr.x + pr.w / 2 - 84), Math.round(pr.y + pr.h / 2 - 84), 168, 168);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(255, 222, 130, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 18 + Math.sin(time * 4) * 2, time * 1.6, time * 1.6 + Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 10, -time * 2.2, -time * 2.2 + Math.PI * 1.2);
      ctx.stroke();
      ctx.fillStyle = '#fff5cc';
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
    }
  }
}
