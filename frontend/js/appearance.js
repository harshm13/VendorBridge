/**
 * VendorBridge Appearance Studio Engine (appearance.js)
 * Manages 5 Themes (Obsidian Dark, Clean Light, Midnight Slate, Deep Emerald, Warm Amber),
 * 6 Accents, 3 Radius presets, 3 Density levels, and Glassmorphism toggle.
 */
(function () {
  const STORAGE_KEY = 'vb_appearance_settings';
  const DEFAULTS = {
    theme: 'dark',
    accent: 'indigo',
    radius: 'modern',
    density: 'standard',
    glass: true,
  };

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function applySettings(settings) {
    const s = { ...DEFAULTS, ...settings };
    const root = document.documentElement;
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-accent', s.accent);
    root.setAttribute('data-radius', s.radius);
    root.setAttribute('data-density', s.density);
    root.setAttribute('data-glass', s.glass ? 'true' : 'false');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore storage quota errors
    }
    syncUI(s);
    window.dispatchEvent(new CustomEvent('vb:theme-changed', { detail: s }));
    return s;
  }

  function syncUI(s) {
    document.querySelectorAll('[data-set-theme]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-set-theme') === s.theme);
    });
    document.querySelectorAll('[data-set-accent]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-set-accent') === s.accent);
    });
    document.querySelectorAll('[data-set-radius]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-set-radius') === s.radius);
    });
    document.querySelectorAll('[data-set-density]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-set-density') === s.density);
    });
    const glassBtn = document.getElementById('glassToggleBtn');
    if (glassBtn) {
      glassBtn.classList.toggle('active', Boolean(s.glass));
      glassBtn.setAttribute('aria-pressed', String(Boolean(s.glass)));
    }
  }

  function ensureDrawerMarkup() {
    if (document.getElementById('appearanceDrawer')) return;

    const overlay = document.createElement('div');
    overlay.id = 'appearanceOverlay';
    overlay.className = 'appearance-overlay';

    const drawer = document.createElement('aside');
    drawer.id = 'appearanceDrawer';
    drawer.className = 'appearance-drawer';
    drawer.setAttribute('aria-label', 'Appearance Studio');
    drawer.innerHTML = `
      <div class="appearance-header">
        <div>
          <div style="font-weight:700;font-size:1rem;">Appearance Studio</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Personalize workspace theme &amp; density</div>
        </div>
        <button type="button" class="appearance-close-btn" id="closeAppearanceBtn" aria-label="Close Appearance Studio">&times;</button>
      </div>

      <div class="appearance-section">
        <div class="appearance-section-label">Theme Surface</div>
        <div class="theme-grid">
          <button type="button" class="theme-card" data-set-theme="dark"><span class="theme-preview" style="background:#09090b;"></span>Obsidian Dark</button>
          <button type="button" class="theme-card" data-set-theme="light"><span class="theme-preview" style="background:#f8fafc;border-color:#94a3b8;"></span>Light Studio</button>
          <button type="button" class="theme-card" data-set-theme="midnight"><span class="theme-preview" style="background:#020617;"></span>Midnight Blue</button>
          <button type="button" class="theme-card" data-set-theme="emerald"><span class="theme-preview" style="background:#03110d;"></span>Deep Emerald</button>
          <button type="button" class="theme-card" data-set-theme="amber"><span class="theme-preview" style="background:#110b05;"></span>Warm Amber</button>
        </div>
      </div>

      <div class="appearance-section">
        <div class="appearance-section-label">Brand Accent</div>
        <div class="accent-grid">
          <button type="button" class="accent-dot" data-set-accent="indigo" style="background:#6366f1;" title="Indigo"></button>
          <button type="button" class="accent-dot" data-set-accent="emerald" style="background:#10b981;" title="Emerald"></button>
          <button type="button" class="accent-dot" data-set-accent="blue" style="background:#3b82f6;" title="Azure Blue"></button>
          <button type="button" class="accent-dot" data-set-accent="violet" style="background:#8b5cf6;" title="Violet"></button>
          <button type="button" class="accent-dot" data-set-accent="rose" style="background:#f43f5e;" title="Rose"></button>
          <button type="button" class="accent-dot" data-set-accent="amber" style="background:#f59e0b;" title="Amber"></button>
        </div>
      </div>

      <div class="appearance-section">
        <div class="appearance-section-label">Corner Geometry</div>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-set-radius="sharp">Sharp</button>
          <button type="button" class="choice-btn" data-set-radius="modern">Modern</button>
          <button type="button" class="choice-btn" data-set-radius="round">Rounded</button>
        </div>
      </div>

      <div class="appearance-section">
        <div class="appearance-section-label">Table &amp; Card Density</div>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-set-density="compact">Compact</button>
          <button type="button" class="choice-btn" data-set-density="standard">Standard</button>
          <button type="button" class="choice-btn" data-set-density="comfortable">Airy</button>
        </div>
      </div>

      <div class="toggle-row">
        <span>Glassmorphic Blur</span>
        <button type="button" class="toggle-switch" id="glassToggleBtn" aria-label="Toggle Glassmorphism"></button>
      </div>

      <button type="button" class="reset-appearance-btn" id="resetAppearanceBtn">Reset to Default Obsidian</button>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.addEventListener('click', closeDrawer);
    drawer.querySelector('#closeAppearanceBtn').addEventListener('click', closeDrawer);

    drawer.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = getSettings();
        s.theme = btn.getAttribute('data-set-theme');
        applySettings(s);
      });
    });

    drawer.querySelectorAll('[data-set-accent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = getSettings();
        s.accent = btn.getAttribute('data-set-accent');
        applySettings(s);
      });
    });

    drawer.querySelectorAll('[data-set-radius]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = getSettings();
        s.radius = btn.getAttribute('data-set-radius');
        applySettings(s);
      });
    });

    drawer.querySelectorAll('[data-set-density]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = getSettings();
        s.density = btn.getAttribute('data-set-density');
        applySettings(s);
      });
    });

    drawer.querySelector('#glassToggleBtn').addEventListener('click', () => {
      const s = getSettings();
      s.glass = !s.glass;
      applySettings(s);
    });

    drawer.querySelector('#resetAppearanceBtn').addEventListener('click', () => {
      applySettings({ ...DEFAULTS });
    });
  }

  function openDrawer() {
    ensureDrawerMarkup();
    syncUI(getSettings());
    const d = document.getElementById('appearanceDrawer');
    const o = document.getElementById('appearanceOverlay');
    if (d) d.classList.add('open');
    if (o) o.classList.add('open');
  }

  function closeDrawer() {
    const d = document.getElementById('appearanceDrawer');
    const o = document.getElementById('appearanceOverlay');
    if (d) d.classList.remove('open');
    if (o) o.classList.remove('open');
  }

  // Apply saved theme immediately before first paint
  applySettings(getSettings());

  window.AppearanceEngine = {
    getSettings,
    applySettings,
    openDrawer,
    closeDrawer,
    toggleTheme: () => {
      const s = getSettings();
      s.theme = s.theme === 'light' ? 'dark' : 'light';
      return applySettings(s);
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureDrawerMarkup();
    syncUI(getSettings());
    document.querySelectorAll('[data-open-appearance], #appearanceBtn').forEach((btn) => {
      btn.addEventListener('click', openDrawer);
    });
  });
})();
