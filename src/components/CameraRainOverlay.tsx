import { useEffect, useRef } from 'react';

interface LensDrop {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  r: number; // radius in px
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sliding: boolean;
  warm: boolean;
  trail: Array<{ x: number; y: number; r: number }>;
}

interface CameraRainOverlayProps {
  /** Subtle multiplier (e.g. 0.7 on title, 1.0 in gameplay) */
  intensity?: number;
  /** Pauses 2D rain canvas animation when game is paused or modal open */
  paused?: boolean;
  /** Reduces droplet count and frame rate for battery-saving eco mode */
  eco?: boolean;
}

function buildCachedDropSprite(warm: boolean): HTMLCanvasElement {
  const size = 48;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const cx = size / 2;
  const cy = size / 2;
  const rx = 18;
  const ry = 20;
  const warmTint = warm ? 0.85 : 0.2;

  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.12, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 10, 18, 0.22)';
  ctx.fill();

  const grad = ctx.createRadialGradient(-rx * 0.24, -ry * 0.28, rx * 0.1, 0, ry * 0.15, ry * 1.05);
  const hiR = Math.round(215 + warmTint * 38);
  const hiG = Math.round(230 - warmTint * 16);
  const hiB = Math.round(250 - warmTint * 78);
  const lowR = Math.round(135 + warmTint * 98);
  const lowG = Math.round(168 - warmTint * 12);
  const lowB = Math.round(212 - warmTint * 104);

  grad.addColorStop(0, `rgba(${hiR}, ${hiG}, ${hiB}, 0.42)`);
  grad.addColorStop(0.55, 'rgba(115, 145, 182, 0.13)');
  grad.addColorStop(1, `rgba(${lowR}, ${lowG}, ${lowB}, 0.34)`);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(218, 234, 255, 0.28)';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-rx * 0.3, -ry * 0.32, rx * 0.25, ry * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 252, 245, 0.62)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, ry * 0.22, rx * 0.68, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = `rgba(${lowR}, ${lowG}, ${lowB}, 0.48)`;
  ctx.stroke();

  return c;
}

/**
 * Energy-efficient cinematic camera-lens light drizzle droplet overlay.
 * Pre-renders droplet refractions into cached offscreen sprites (zero per-frame gradient allocations),
 * paces updates to 18-24 FPS, and pauses completely when the tab is hidden or game is paused.
 */
export function CameraRainOverlay({
  intensity = 1,
  paused = false,
  eco = false,
}: CameraRainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const warmSprite = buildCachedDropSprite(true);
    const coolSprite = buildCachedDropSprite(false);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafId = 0;
    let lastDraw = 0;
    let lastSim = performance.now();
    const minFrameMs = eco ? 1000 / 18 : 1000 / 24;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, eco ? 1 : 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnDrop = (preAged = false): LensDrop => {
      let x = Math.random();
      let y = Math.random();
      const zone = Math.random();
      if (zone < 0.36) {
        x = 0.015 + Math.random() * 0.16;
        y = 0.08 + Math.random() * 0.82;
      } else if (zone < 0.72) {
        x = 0.825 + Math.random() * 0.16;
        y = 0.08 + Math.random() * 0.82;
      } else if (zone < 0.9) {
        x = 0.14 + Math.random() * 0.72;
        y = 0.015 + Math.random() * 0.11;
      } else {
        x = 0.2 + Math.random() * 0.6;
        y = 0.87 + Math.random() * 0.11;
      }

      const isRunner = Math.random() < 0.24;
      const r = isRunner ? 3.2 + Math.random() * 3.1 : 1.7 + Math.random() * 2.5;
      const maxLife = isRunner ? 6.5 + Math.random() * 5.0 : 4.5 + Math.random() * 6.0;
      return {
        x,
        y,
        r,
        vx: (Math.random() - 0.5) * 0.002,
        vy: isRunner ? 0.012 + Math.random() * 0.022 : 0.0005 + Math.random() * 0.0014,
        life: preAged ? Math.random() * maxLife * 0.75 : 0,
        maxLife,
        sliding: isRunner,
        warm: Math.random() < 0.45,
        trail: [],
      };
    };

    const baseCount = eco ? 12 : 22;
    const dropCount = Math.max(8, Math.round(baseCount * intensity));
    const drops: LensDrop[] = Array.from({ length: dropCount }, () => spawnDrop(true));

    const drawSprite = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      alpha: number,
      warm: boolean
    ) => {
      if (alpha <= 0.01 || rx <= 0.5) return;
      ctx.globalAlpha = Math.min(1, alpha);
      const w = rx * 2.55;
      const h = ry * 2.55;
      ctx.drawImage(warm ? warmSprite : coolSprite, cx - w * 0.5, cy - h * 0.5, w, h);
    };

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (paused || document.hidden) {
        lastSim = now;
        return;
      }
      if (now - lastDraw < minFrameMs) return;
      lastDraw = now;

      const dt = Math.min(0.08, Math.max(0.001, (now - lastSim) / 1000));
      lastSim = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.life += dt;

        if (d.life >= d.maxLife || d.y > 1.03) {
          drops[i] = spawnDrop(false);
          continue;
        }

        const fadeIn = Math.min(1, d.life / 0.45);
        const fadeOut = Math.min(1, Math.max(0, (d.maxLife - d.life) / 1.4));
        const alpha = fadeIn * fadeOut * 0.76 * intensity;

        if (d.sliding) {
          const slip = 0.55 + 0.45 * Math.sin(d.life * 3.1 + i * 1.9);
          d.y += d.vy * slip * dt;
          d.x += (d.vx + Math.sin(d.life * 1.7 + i) * 0.0018) * dt;

          const lastTrail = d.trail[d.trail.length - 1];
          const px = d.x * width;
          const py = d.y * height;
          if (!lastTrail || Math.hypot(px - lastTrail.x, py - lastTrail.y) > d.r * 2.6) {
            d.trail.push({ x: px, y: py, r: Math.max(1.0, d.r * 0.36) });
            if (d.trail.length > 5) d.trail.shift();
          }
        } else {
          d.y += d.vy * dt;
        }

        for (let t = 0; t < d.trail.length; t++) {
          const bead = d.trail[t];
          const beadAlpha = alpha * ((t + 1) / (d.trail.length + 1)) * 0.46;
          drawSprite(bead.x, bead.y, bead.r, bead.r * 1.12, beadAlpha, d.warm);
        }

        const stretch = d.sliding ? 1.38 : 1.12;
        drawSprite(d.x * width, d.y * height, d.r, d.r * stretch, alpha, d.warm);
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, paused, eco]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="camera-rain-overlay"
      aria-hidden="true"
      className="fixed inset-0 z-10 w-full h-full pointer-events-none select-none"
    />
  );
}
