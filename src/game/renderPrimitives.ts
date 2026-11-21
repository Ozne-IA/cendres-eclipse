import { getColoredGlow } from './textures';

export function getTorchGlow(): HTMLCanvasElement | null {
  return getColoredGlow('amber');
}

export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  radiusX: number,
  alpha = 0.48
): void {
  ctx.fillStyle = `rgba(4, 3, 6, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 1, radiusX, Math.max(3, radiusX * 0.22), 0, 0, Math.PI * 2);
  ctx.fill();
}
