/**
 * VendorBridge ERP - Custom Appearance System & Persistent Theme Engine
 */

(function () {
    const STORAGE_KEY = 'vb_appearance_settings';

    const defaultSettings = {
        theme: 'dark',
        accent: 'indigo',
        radius: 'round',
        density: 'standard',
        glass: true
    };

    // Load saved settings or fallback to defaults
    function getSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }

    // Save settings to localStorage
    function saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save appearance settings:', e);
        }
    }

    // Apply settings to <html> tag attributes immediately
    function applySettings(settings) {
        const root = document.documentElement;
        root.setAttribute('data-theme', settings.theme || 'light');
        root.setAttribute('data-accent', settings.accent || 'indigo');
        root.setAttribute('data-radius', settings.radius || 'modern');
        root.setAttribute('data-density', settings.density || 'standard');
        root.setAttribute('data-glass', settings.glass ? 'true' : 'false');
    }

    // Apply saved settings immediately prior to full render to avoid FOUC
    let currentSettings = getSettings();
    applySettings(currentSettings);

    // Initialize UI components once DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        injectAppearanceUI();
        bindEvents();
        syncUIState(currentSettings);
    });

    function injectAppearanceUI() {
        if (document.getElementById('appearanceDrawer')) return;

        // Floating Trigger Button
        const floatBtn = document.createElement('button');
        floatBtn.className = 'appearance-floating-btn';
        floatBtn.id = 'openAppearanceBtn';
        floatBtn.title = 'Customize Appearance';
        floatBtn.setAttribute('aria-label', 'Customize Appearance');
        floatBtn.innerHTML = '<i class="fa-solid fa-palette"></i>';
        document.body.appendChild(floatBtn);

        // Drawer Overlay & Modal Markup
        const drawerMarkup = `
            <div class="appearance-drawer-overlay" id="appearanceOverlay"></div>
            <div class="appearance-drawer" id="appearanceDrawer">
                <div class="appearance-drawer-header">
                    <h3><i class="fa-solid fa-wand-magic-sparkles"></i> Custom Appearance</h3>
                    <button class="appearance-close-btn" id="closeAppearanceBtn" title="Close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="appearance-drawer-body">
                    
                    <!-- Theme Mode Selection -->
                    <div class="appearance-section">
                        <label class="section-title">Theme Presets</label>
                        <div class="theme-grid">
                            <button class="theme-option-btn" data-theme-val="light">
                                <i class="fa-solid fa-sun"></i> Light Mode
                            </button>
                            <button class="theme-option-btn" data-theme-val="dark">
                                <i class="fa-solid fa-moon"></i> Dark Mode
                            </button>
                            <button class="theme-option-btn" data-theme-val="midnight">
                                <i class="fa-solid fa-circle-nodes"></i> Midnight Glass
                            </button>
                            <button class="theme-option-btn" data-theme-val="emerald">
                                <i class="fa-solid fa-leaf"></i> Emerald ERP
                            </button>
                            <button class="theme-option-btn" data-theme-val="amber">
                                <i class="fa-solid fa-fire"></i> Warm Amber
                            </button>
                        </div>
                    </div>

                    <!-- Accent Color Selection -->
                    <div class="appearance-section">
                        <label class="section-title">Accent Color Scheme</label>
                        <div class="accent-grid">
                            <div class="accent-dot accent-indigo" data-accent-val="indigo" title="Indigo"></div>
                            <div class="accent-dot accent-emerald" data-accent-val="emerald" title="Emerald Green"></div>
                            <div class="accent-dot accent-blue" data-accent-val="blue" title="Sapphire Blue"></div>
                            <div class="accent-dot accent-violet" data-accent-val="violet" title="Royal Violet"></div>
                            <div class="accent-dot accent-rose" data-accent-val="rose" title="Crimson Rose"></div>
                            <div class="accent-dot accent-amber" data-accent-val="amber" title="Sunset Amber"></div>
                        </div>
                    </div>

                    <!-- Border Radius Style -->
                    <div class="appearance-section">
                        <label class="section-title">Corner Roundness</label>
                        <div class="choice-row">
                            <button class="choice-btn" data-radius-val="sharp">Sharp (4px)</button>
                            <button class="choice-btn" data-radius-val="modern">Modern (12px)</button>
                            <button class="choice-btn" data-radius-val="round">Round (20px)</button>
                        </div>
                    </div>

                    <!-- Layout Density -->
                    <div class="appearance-section">
                        <label class="section-title">Layout Spacing</label>
                        <div class="choice-row">
                            <button class="choice-btn" data-density-val="compact">Compact</button>
                            <button class="choice-btn" data-density-val="standard">Standard</button>
                            <button class="choice-btn" data-density-val="comfortable">Relaxed</button>
                        </div>
                    </div>

                    <!-- Glassmorphism Toggle -->
                    <div class="appearance-section">
                        <div class="toggle-switch-group">
                            <label class="section-title" style="margin-bottom:0;">Glass Translucency</label>
                            <input type="checkbox" id="glassToggle" style="width:20px; height:20px; cursor:pointer;">
                        </div>
                    </div>

                </div>
                <div class="appearance-drawer-footer">
                    <button class="reset-appearance-btn" id="resetAppearanceBtn"><i class="fa-solid fa-rotate-left"></i> Reset to Defaults</button>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = drawerMarkup;
        document.body.appendChild(wrapper);
    }

    function bindEvents() {
        const openBtn = document.getElementById('openAppearanceBtn');
        const closeBtn = document.getElementById('closeAppearanceBtn');
        const overlay = document.getElementById('appearanceOverlay');
        const drawer = document.getElementById('appearanceDrawer');
        const resetBtn = document.getElementById('resetAppearanceBtn');

        // Open Drawer
        function openDrawer() {
            drawer.classList.add('active');
            overlay.classList.add('active');
        }

        // Close Drawer
        function closeDrawer() {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }

        if (openBtn) openBtn.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);

        // Bind any navbar appearance trigger button
        document.addEventListener('click', function(e) {
            if (e.target.closest('.appearance-nav-btn') || e.target.closest('#navAppearanceBtn')) {
                e.preventDefault();
                openDrawer();
            }
        });

        // Theme Preset buttons
        document.querySelectorAll('[data-theme-val]').forEach(btn => {
            btn.addEventListener('click', function () {
                currentSettings.theme = this.getAttribute('data-theme-val');
                updateAppearance();
            });
        });

        // Accent Dot buttons
        document.querySelectorAll('[data-accent-val]').forEach(dot => {
            dot.addEventListener('click', function () {
                currentSettings.accent = this.getAttribute('data-accent-val');
                updateAppearance();
            });
        });

        // Radius Choice buttons
        document.querySelectorAll('[data-radius-val]').forEach(btn => {
            btn.addEventListener('click', function () {
                currentSettings.radius = this.getAttribute('data-radius-val');
                updateAppearance();
            });
        });

        // Density Choice buttons
        document.querySelectorAll('[data-density-val]').forEach(btn => {
            btn.addEventListener('click', function () {
                currentSettings.density = this.getAttribute('data-density-val');
                updateAppearance();
            });
        });

        // Glass Toggle
        const glassToggle = document.getElementById('glassToggle');
        if (glassToggle) {
            glassToggle.addEventListener('change', function () {
                currentSettings.glass = this.checked;
                updateAppearance();
            });
        }

        // Reset Settings
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                currentSettings = { ...defaultSettings };
                updateAppearance();
            });
        }
    }

    function updateAppearance() {
        applySettings(currentSettings);
        saveSettings(currentSettings);
        syncUIState(currentSettings);
    }

    function syncUIState(settings) {
        // Active Theme Button
        document.querySelectorAll('[data-theme-val]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme-val') === settings.theme);
        });

        // Active Accent Dot
        document.querySelectorAll('[data-accent-val]').forEach(dot => {
            dot.classList.toggle('active', dot.getAttribute('data-accent-val') === settings.accent);
        });

        // Active Radius Button
        document.querySelectorAll('[data-radius-val]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-radius-val') === settings.radius);
        });

        // Active Density Button
        document.querySelectorAll('[data-density-val]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-density-val') === settings.density);
        });

        // Glass Switch Checkbox
        const glassToggle = document.getElementById('glassToggle');
        if (glassToggle) {
            glassToggle.checked = !!settings.glass;
        }
    }

    // Expose API for external script usage if needed
    window.Appearance = {
        getSettings,
        saveSettings,
        applySettings,
        setTheme: function (theme) {
            currentSettings.theme = theme;
            updateAppearance();
        },
        setAccent: function (accent) {
            currentSettings.accent = accent;
            updateAppearance();
        }
    };
})();
