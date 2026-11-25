import { dot, drawGroundShadow, getTorchGlow, mkGrad, poly } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { RoomProp } from './types';

export function getCrimsonGlow(): HTMLCanvasElement | null {
  return getColoredGlow('crimson');
}

export function getAstralGlow(): HTMLCanvasElement | null {
  return getColoredGlow('astral');
}

export function drawDetailedProp(ctx: CanvasRenderingContext2D, pr: RoomProp, time: number): void {
  drawGroundShadow(ctx, pr.x + pr.w / 2, pr.y + pr.h, pr.w * 0.54, 0.44);

  if (pr.type === 'chest' || pr.type === 'gilded_chest') {
    const gilded = pr.type === 'gilded_chest';
    if (gilded && !pr.opened) {
      const g = getColoredGlow('gold');
      if (g) {
        ctx.globalAlpha = 0.62;
        ctx.drawImage(g, pr.x + pr.w / 2 - 58, pr.y + pr.h / 2 - 58, 116, 116);
        ctx.globalAlpha = 1;
      }
    }
    const bodyGrad = mkGrad(
      ctx,
      pr.x,
      pr.y + 8,
      pr.x,
      pr.y + pr.h,
      null,
      pr.opened
        ? [
            [0, '#2b221e'],
            [1, '#140f12'],
          ]
        : gilded
        ? [
            [0, '#b57e2b'],
            [0.5, '#784e18'],
            [1, '#3d250d'],
          ]
        : [
            [0, '#6e4a2b'],
            [0.55, '#472d19'],
            [1, '#26170e'],
          ]
    );

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + 8, pr.w / 2, 8.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0c080e';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(pr.x, pr.y + 8, pr.w, pr.h - 8);

    // Forged iron / brass straps & rivets
    ctx.fillStyle = gilded ? '#f2cc78' : '#8a7a68';
    ctx.fillRect(pr.x + 5, pr.y + 2, 4, pr.h - 2);
    ctx.fillRect(pr.x + pr.w - 9, pr.y + 2, 4, pr.h - 2);
    ctx.fillStyle = gilded ? '#ffd470' : '#b88d48';
    ctx.fillRect(pr.x + 1, pr.y + 8, pr.w - 2, 2);

    if (!pr.opened) {
      ctx.fillStyle = gilded ? '#ffd470' : '#c89b4b';
      ctx.fillRect(pr.x + pr.w / 2 - 4, pr.y + 10, 8, 9);
      ctx.fillStyle = '#0d090f';
      ctx.fillRect(pr.x + pr.w / 2 - 1, pr.y + 13, 2, 4);
    }
    ctx.lineWidth = 1;
  } else if (pr.type === 'urn' && !pr.broken) {
    ctx.fillStyle = mkGrad(ctx, pr.x, pr.y, pr.x + pr.w, pr.y + pr.h, null, [
      [0, '#785848'],
      [0.5, '#543c32'],
      [1, '#291b18'],
    ]);
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h * 0.62, pr.w * 0.46, pr.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#100b10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#8b6852';
    ctx.fillRect(pr.x + 4, pr.y, pr.w - 8, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(pr.x + 3, pr.y + 13, pr.w - 6, 2);
    ctx.lineWidth = 1;
  } else if (pr.type === 'brazier') {
    const cx = pr.x + pr.w / 2;
    if (!pr.used) {
      const g = getTorchGlow();
      if (g) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(g, Math.round(cx - 108), Math.round(pr.y - 94), 216, 216);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#181216';
    ctx.fillRect(pr.x + 7, pr.y + 20, 4.5, 18);
    ctx.fillRect(pr.x + pr.w - 11.5, pr.y + 20, 4.5, 18);
    ctx.fillRect(cx - 2.2, pr.y + 20, 4.5, 16);
    const bowlGrad = mkGrad(ctx, pr.x, pr.y + 10, pr.x + pr.w, pr.y + 22, null, [
      [0, '#4f403c'],
      [0.55, '#332828'],
      [1, '#1a1316'],
    ]);
    poly(
      ctx,
      [pr.x - 1, pr.y + 10, pr.x + pr.w + 1, pr.y + 10, pr.x + pr.w - 5, pr.y + 22, pr.x + 5, pr.y + 22],
      bowlGrad,
      '#735a44',
      1.3
    );
    ctx.lineWidth = 1;

    if (!pr.used) {
      const fl = Math.sin(time * 9.5 + pr.x) * 3.5;
      ctx.fillStyle = '#c43e22';
      ctx.beginPath();
      ctx.moveTo(pr.x + 3, pr.y + 10);
      ctx.quadraticCurveTo(cx - 6, pr.y - 12, cx + fl, pr.y - 25);
      ctx.quadraticCurveTo(cx + 8, pr.y - 8, pr.x + pr.w - 3, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff8c2b';
      ctx.beginPath();
      ctx.moveTo(pr.x + 7, pr.y + 10);
      ctx.quadraticCurveTo(cx - 2, pr.y - 7, cx + fl * 0.65, pr.y - 17);
      ctx.quadraticCurveTo(cx + 4, pr.y - 5, pr.x + pr.w - 7, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      dot(ctx, cx, pr.y + 5, 5, '#fff2b0');
    }
  } else if (pr.type === 'shrine') {
    if (!pr.used) {
      const cg = getCrimsonGlow();
      if (cg) {
        ctx.globalAlpha = 0.78;
        ctx.drawImage(cg, pr.x + pr.w / 2 - 84, pr.y - 58, 168, 168);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#241e27';
    ctx.fillRect(pr.x + 4, pr.y + 18, pr.w - 8, pr.h - 18);
    ctx.strokeStyle = '#534556';
    ctx.strokeRect(pr.x + 4, pr.y + 18, pr.w - 8, pr.h - 18);
    ctx.fillStyle = '#3f3444';
    ctx.fillRect(pr.x, pr.y + pr.h - 8, pr.w, 8);
    const hover = pr.used ? 0 : Math.sin(time * 3) * 3.5;
    poly(
      ctx,
      [pr.x + pr.w / 2, pr.y - 11 + hover, pr.x + pr.w - 5, pr.y + 12 + hover, pr.x + pr.w / 2, pr.y + 24 + hover, pr.x + 5, pr.y + 12 + hover],
      pr.used ? '#4a3d42' : '#e03c4e'
    );
    if (!pr.used) {
      poly(
        ctx,
        [pr.x + pr.w / 2, pr.y - 7 + hover, pr.x + pr.w / 2 + 5, pr.y + 11 + hover, pr.x + pr.w / 2, pr.y + 18 + hover],
        'rgba(255, 224, 232, 0.72)'
      );
    }
  } else if (pr.type === 'merchant') {
    const g = getTorchGlow();
    if (g) {
      ctx.globalAlpha = 0.72;
      ctx.drawImage(g, pr.x - 62, pr.y - 32, 124, 124);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#3d3028';
    ctx.fillRect(pr.x + 16, pr.y + 12, 16, 26);
    poly(ctx, [pr.x + 2, pr.y + pr.h, pr.x + 8, pr.y + 10, pr.x + 26, pr.y + 10, pr.x + 30, pr.y + pr.h], '#262d3a');
    dot(ctx, pr.x + 17, pr.y + 10, 9, '#53453c');
    ctx.fillStyle = '#6b5235';
    ctx.fillRect(pr.x - 4, pr.y + 4, 3, pr.h - 4);
    dot(ctx, pr.x - 6, pr.y + 18 + Math.sin(time * 3) * 1.5, 4.5, '#ffd470');
  } else if (pr.type === 'lore') {
    if (!pr.used) {
      const ag = getAstralGlow();
      if (ag) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(ag, pr.x + pr.w / 2 - 64, pr.y - 34, 128, 128);
        ctx.globalAlpha = 1;
      }
    }
    const stGrad = mkGrad(ctx, pr.x, pr.y, pr.x + pr.w, pr.y + pr.h, null, [
      [0, '#3e3948'],
      [1, '#1d1924'],
    ]);
    poly(
      ctx,
      [pr.x, pr.y + pr.h, pr.x + 2, pr.y + 8, pr.x + pr.w / 2, pr.y, pr.x + pr.w - 2, pr.y + 8, pr.x + pr.w, pr.y + pr.h],
      stGrad,
      '#0e0b12',
      1
    );
    ctx.fillStyle = pr.used ? '#6e645c' : '#8ab8e6';
    ctx.fillRect(pr.x + 8, pr.y + 13, pr.w - 16, 3);
    ctx.fillRect(pr.x + 7, pr.y + 21, pr.w - 14, 3);
    ctx.fillRect(pr.x + 9, pr.y + 29, pr.w - 18, 3);
  } else if (pr.type === 'npc' && !pr.used) {
    const ag = getAstralGlow();
    if (ag) {
      ctx.globalAlpha = 0.68;
      ctx.drawImage(ag, pr.x + pr.w / 2 - 60, pr.y - 28, 120, 120);
      ctx.globalAlpha = 1;
    }
    poly(
      ctx,
      [pr.x, pr.y + pr.h, pr.x + 4, pr.y + 14, pr.x + pr.w - 4, pr.y + 14, pr.x + pr.w, pr.y + pr.h],
      '#334c6b',
      '#121a26',
      1
    );
    ctx.fillStyle = '#e8e1d5';
    ctx.fillRect(pr.x + 7, pr.y + 2, pr.w - 14, 13);
  } else if (pr.type === 'exit') {
    // Gothic stone pillars, carved archway & keystone
    const archGrad = ctx.createLinearGradient(pr.x - 10, pr.y, pr.x + pr.w + 10, pr.y + pr.h);
    archGrad.addColorStop(0, '#372e3a');
    archGrad.addColorStop(1, '#19141d');
    ctx.fillStyle = archGrad;
    ctx.fillRect(pr.x - 10, pr.y + 12, 12, pr.h - 12);
    ctx.fillRect(pr.x + pr.w - 2, pr.y + 12, 12, pr.h - 12);
    ctx.fillStyle = '#4c3e49';
    ctx.fillRect(pr.x - 12, pr.y + 10, 16, 6);
    ctx.fillRect(pr.x + pr.w - 4, pr.y + 10, 16, 6);

    ctx.fillStyle = pr.locked ? '#181014' : '#0b0811';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x, pr.y + 24);
    ctx.quadraticCurveTo(pr.x + pr.w / 2, pr.y - 14, pr.x + pr.w, pr.y + 24);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pr.locked ? '#822834' : '#d4a853';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.lineWidth = 1;

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
        ctx.globalAlpha = 0.85;
        ctx.drawImage(g, Math.round(pr.x + pr.w / 2 - 86), Math.round(pr.y + pr.h / 2 - 86), 172, 172);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(255, 222, 130, 0.94)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 18 + Math.sin(time * 4) * 2, time * 1.6, time * 1.6 + Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 10, -time * 2.2, -time * 2.2 + Math.PI * 1.2);
      ctx.stroke();
      dot(ctx, pr.x + pr.w / 2, pr.y + pr.h * 0.56, 3.2, '#fff5cc');
      ctx.lineWidth = 1;
    }
  }
}
