/**
 * VendorBridge 3D WebGL Global Supply Constellation & Wireframe Globe (three-scene.js)
 * Zero-dependency HTML5 Canvas 3D renderer (works universally without external CDN fragility).
 * Reacts to mouse pointer, viewport resize, and theme accent updates.
 */
(function () {
  function initScene() {
    const container = document.getElementById('threeCanvasContainer');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let mouseX = 0;
    let mouseY = 0;
    let angle = 0;

    const isLanding = Boolean(document.body.dataset.landing === 'true');
    const particleCount = isLanding ? 85 : 46;

    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.15,
      y: (Math.random() - 0.5) * height * 1.15,
      z: Math.random() * 520 + 120,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.8 + 0.9,
    }));

    // 3D Sphere points for Global Supply Wireframe Globe (on landing hero)
    const globePoints = [];
    if (isLanding) {
      const rings = 9;
      const segs = 18;
      for (let i = 1; i < rings; i++) {
        const phi = (i / rings) * Math.PI;
        for (let j = 0; j < segs; j++) {
          const theta = (j / segs) * Math.PI * 2;
          globePoints.push({
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.cos(phi),
            z: Math.sin(phi) * Math.sin(theta),
          });
        }
      }
    }

    function getThemeColors() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1';
      return {
        accent,
        nodeAlpha: isLight ? 0.38 : 0.62,
        lineAlpha: isLight ? 0.1 : 0.16,
        globeAlpha: isLight ? 0.15 : 0.24,
      };
    }

    let colors = getThemeColors();
    window.addEventListener('vb:theme-changed', () => {
      colors = getThemeColors();
    });

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / width - 0.5) * 32;
      mouseY = (e.clientY / height - 0.5) * 24;
    });

    function render() {
      ctx.clearRect(0, 0, width, height);
      angle += 0.0022;

      const cx = width * 0.5 + mouseX;
      const cy = height * 0.45 + mouseY;

      // Render 3D Wireframe Globe Nodes on Landing
      if (isLanding && globePoints.length) {
        const radius = Math.min(width, height) * 0.34;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        globePoints.forEach((pt, idx) => {
          const rx = pt.x * cosA - pt.z * sinA;
          const rz = pt.x * sinA + pt.z * cosA;
          const scale = 2.2 / (2.2 - rz * 0.7);
          const sx = cx + rx * radius * scale;
          const sy = height * 0.32 + pt.y * radius * 0.92 * scale;
          if (rz > -0.25) {
            ctx.beginPath();
            ctx.arc(sx, sy, idx % 7 === 0 ? 2.6 : 1.4, 0, Math.PI * 2);
            ctx.fillStyle = idx % 7 === 0 ? '#10b981' : colors.accent;
            ctx.globalAlpha = colors.globeAlpha * (0.5 + (rz + 1) * 0.35);
            ctx.fill();
          }
        });
      }

      // Render Ambient Constellation
      const projected = particles.map((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > width * 0.65) p.x = -width * 0.65;
        if (p.x < -width * 0.65) p.x = width * 0.65;
        if (p.y > height * 0.65) p.y = -height * 0.65;
        if (p.y < -height * 0.65) p.y = height * 0.65;

        const fov = 420 / p.z;
        return {
          sx: cx + p.x * fov,
          sy: cy + p.y * fov,
          r: Math.max(0.8, p.r * fov),
        };
      });

      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        ctx.beginPath();
        ctx.arc(a.sx, a.sy, a.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = colors.nodeAlpha;
        ctx.fill();

        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.hypot(dx, dy);
          if (dist < 135) {
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.globalAlpha = colors.lineAlpha * (1 - dist / 135);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  document.addEventListener('DOMContentLoaded', initScene);
})();
