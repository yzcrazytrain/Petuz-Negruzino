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
  warmTint: number; // 0 = cool moonlight, 1 = warm sodium reflection
  trail: Array<{ x: number; y: number; r: number }>;
}

interface CameraRainOverlayProps {
  /** Subtle multiplier (e.g. 0.7 on title, 1.0 in gameplay) */
  intensity?: number;
}

/**
 * Cinematic camera-lens light drizzle droplet overlay.
 * Renders realistic translucent refracting beads strictly along the outer optical lens frame
 * (keeping the center aiming sightline 100% unobstructed) that condense, catch warm sodium
 * and cool moonlight highlights, occasionally trickle down the glass, and evaporate.
 */
export function CameraRainOverlay({ intensity = 1 }: CameraRainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnDrop = (preAged = false): LensDrop => {
      // Strictly bias drops into the outer optical frame — never over the center crosshair!
      let x = Math.random();
      let y = Math.random();
      const zone = Math.random();
      if (zone < 0.36) {
        // Left margin
        x = 0.015 + Math.random() * 0.16;
        y = 0.08 + Math.random() * 0.82;
      } else if (zone < 0.72) {
        // Right margin
        x = 0.825 + Math.random() * 0.16;
        y = 0.08 + Math.random() * 0.82;
      } else if (zone < 0.9) {
        // Top brow
        x = 0.14 + Math.random() * 0.72;
        y = 0.015 + Math.random() * 0.11;
      } else {
        // Bottom fringe
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
        warmTint: Math.random() < 0.45 ? 0.85 : 0.2,
        trail: [],
      };
    };

    const dropCount = Math.max(12, Math.round(24 * intensity));
    const drops: LensDrop[] = Array.from({ length: dropCount }, () => spawnDrop(true));

    const drawDroplet = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      alpha: number,
      warmTint: number
    ) => {
      if (alpha <= 0.01 || rx <= 0.5) return;

      ctx.save();
      ctx.translate(cx, cy);

      // Soft dark refraction rim underneath droplet
      ctx.beginPath();
      ctx.ellipse(0, ry * 0.12, rx * 1.06, ry * 1.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 10, 18, ${(alpha * 0.22).toFixed(3)})`;
      ctx.fill();

      // Main translucent lens dome with inverted sky-to-sodium caustic gradient
      const grad = ctx.createRadialGradient(
        -rx * 0.24,
        -ry * 0.28,
        rx * 0.1,
        0,
        ry * 0.15,
        Math.max(rx, ry) * 1.05
      );
      const hiR = Math.round(215 + warmTint * 38);
      const hiG = Math.round(230 - warmTint * 16);
      const hiB = Math.round(250 - warmTint * 78);
      const lowR = Math.round(135 + warmTint * 98);
      const lowG = Math.round(168 - warmTint * 12);
      const lowB = Math.round(212 - warmTint * 104);

      grad.addColorStop(0, `rgba(${hiR}, ${hiG}, ${hiB}, ${(alpha * 0.42).toFixed(3)})`);
      grad.addColorStop(0.55, `rgba(115, 145, 182, ${(alpha * 0.13).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${lowR}, ${lowG}, ${lowB}, ${(alpha * 0.34).toFixed(3)})`);

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Thin optical edge sheen
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = `rgba(218, 234, 255, ${(alpha * 0.28).toFixed(3)})`;
      ctx.stroke();

      // Crisp upper-left pinpoint specular highlight
      ctx.beginPath();
      ctx.ellipse(-rx * 0.3, -ry * 0.32, rx * 0.25, ry * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 252, 245, ${(alpha * 0.62).toFixed(3)})`;
      ctx.fill();

      // Warm bottom caustic crescent (classic rain-on-camera-glass signature)
      ctx.beginPath();
      ctx.arc(0, ry * 0.22, rx * 0.68, 0.22 * Math.PI, 0.78 * Math.PI);
      ctx.lineWidth = Math.max(0.9, rx * 0.18);
      ctx.strokeStyle = `rgba(${lowR}, ${lowG}, ${lowB}, ${(alpha * 0.48).toFixed(3)})`;
      ctx.stroke();

      ctx.restore();
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.life += dt;

        if (d.life >= d.maxLife || d.y > 1.03) {
          drops[i] = spawnDrop(false);
          continue;
        }

        // Smooth fade-in (0.45s) and gradual evaporation fade-out (last 1.4s)
        const fadeIn = Math.min(1, d.life / 0.45);
        const fadeOut = Math.min(1, Math.max(0, (d.maxLife - d.life) / 1.4));
        const alpha = fadeIn * fadeOut * 0.76 * intensity;

        if (d.sliding) {
          // Slight jerky surface-tension stick-slip trickle down the lens glass
          const slip = 0.55 + 0.45 * Math.sin(d.life * 3.1 + i * 1.9);
          d.y += d.vy * slip * dt;
          d.x += (d.vx + Math.sin(d.life * 1.7 + i) * 0.0018) * dt;

          // Leave subtle micro-bead trail behind sliding drops
          const lastTrail = d.trail[d.trail.length - 1];
          const px = d.x * width;
          const py = d.y * height;
          if (!lastTrail || Math.hypot(px - lastTrail.x, py - lastTrail.y) > d.r * 2.4) {
            d.trail.push({ x: px, y: py, r: Math.max(1.0, d.r * 0.36) });
            if (d.trail.length > 7) d.trail.shift();
          }
        } else {
          d.y += d.vy * dt;
        }

        // Draw delicate micro-trail beads for trickling drops
        for (let t = 0; t < d.trail.length; t++) {
          const bead = d.trail[t];
          const beadAlpha = alpha * ((t + 1) / (d.trail.length + 1)) * 0.46;
          drawDroplet(bead.x, bead.y, bead.r, bead.r * 1.12, beadAlpha, d.warmTint);
        }

        // Elongate slightly vertically when sliding down lens glass
        const stretch = d.sliding ? 1.38 : 1.12;
        drawDroplet(d.x * width, d.y * height, d.r, d.r * stretch, alpha, d.warmTint);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="camera-rain-overlay"
      aria-hidden="true"
      className="fixed inset-0 z-10 w-full h-full pointer-events-none select-none"
    />
  );
}
