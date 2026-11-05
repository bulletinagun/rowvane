// Workspace settings and layout preferences
window.RowvaneCustomization = (function () {
  const OLD_STORAGE_KEY = 'sheetshift.preferences.v1';
  const STORAGE_KEY = 'rowvane.preferences.v1';
  const RESET_EXCLUSIONS_KEY = 'rowvane.resetExclusions.v1';

  function loadResetExclusions() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return {};
      const raw = window.localStorage.getItem(RESET_EXCLUSIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_err) {
      return {};
    }
  }

  function saveResetExclusions(exclusions) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(RESET_EXCLUSIONS_KEY, JSON.stringify(exclusions));
      }
    } catch (_err) {}
  }

  // Corner profile levels L0..L6
  const SHAPE_LEVELS = [
    { level: 0, name: 'None', basePx: 0 },
    { level: 1, name: 'Tight', basePx: 4 },
    { level: 2, name: 'Compact', basePx: 8 },
    { level: 3, name: 'Balanced', basePx: 11 },
    { level: 4, name: 'Soft', basePx: 16 },
    { level: 5, name: 'Relaxed', basePx: 20 },
    { level: 6, name: 'Generous', basePx: 24 },
  ];

  function calculateComponentRadius(levelIdx, group) {
    const idx = Math.max(0, Math.min(6, Number(levelIdx) || 0));

    switch (group) {
      case 'workspace': {
        const scale = ['0px', '3px', '5px', '8px', '12px', '16px', '20px'];
        return scale[idx] || '5px';
      }

      case 'panels': {
        const scale = ['0px', '3px', '6px', '9px', '13px', '18px', '22px'];
        return scale[idx] || '6px';
      }

      case 'buttons': {
        // Restrained generous max (16px) - prevents square icon buttons from turning into circles
        const scale = ['0px', '2px', '4px', '6px', '9px', '12px', '16px'];
        return scale[idx] || '4px';
      }

      case 'inputs': {
        const scale = ['0px', '2px', '4px', '6px', '8px', '9px', '10px'];
        return scale[idx] || '4px';
      }

      case 'nav': {
        // Restrained max (12px) - prevents sidebar items from turning into distorted pills
        const scale = ['0px', '2px', '4px', '6px', '8px', '10px', '12px'];
        return scale[idx] || '4px';
      }

      case 'tables': {
        // Tables, Cells & SQL Workspace: calibrated 0px to 14px scale for visible, expressive roundness
        const scale = ['0px', '2px', '4px', '6px', '8px', '11px', '14px'];
        return scale[idx] || '4px';
      }

      case 'overlays': {
        const scale = ['0px', '4px', '8px', '11px', '16px', '20px', '24px'];
        return scale[idx] || '8px';
      }

      default: {
        const defaultScale = ['0px', '4px', '8px', '11px', '16px', '20px', '24px'];
        return defaultScale[idx] || '8px';
      }
    }
  }

  // 100% Density Baselines for Relative Progressive Compression
  const DENSITY_PRESETS = {
    compact: {
      rowHeight: 24,
      headerHeight: 28,
      cellPadX: 8,
      fontSize: 12,
      sidebarPadY: 4,
      sidebarPadX: 7,
      sidebarFontSize: 11.5,
      sidebarIconSize: 13,
      sidebarHeaderHeight: 34,
      toolbarHeight: 40,
      toolbarBtnHeight: 26,
      toolbarFontSize: 11.5,
      metaBarHeight: 26,
      sqlHeaderHeight: 32,
      sqlFontSize: 11.5,
      sqlGutterWidth: 36,
      ctrlBtnSize: 20,
      runBtnHeight: 24,
    },
    balanced: {
      rowHeight: 30,
      headerHeight: 32,
      cellPadX: 10,
      fontSize: 12.5,
      sidebarPadY: 6,
      sidebarPadX: 8,
      sidebarFontSize: 12,
      sidebarIconSize: 14,
      sidebarHeaderHeight: 38,
      toolbarHeight: 44,
      toolbarBtnHeight: 28,
      toolbarFontSize: 12,
      metaBarHeight: 30,
      sqlHeaderHeight: 36,
      sqlFontSize: 12.5,
      sqlGutterWidth: 42,
      ctrlBtnSize: 22,
      runBtnHeight: 26,
    },
    spacious: {
      rowHeight: 36,
      headerHeight: 38,
      cellPadX: 14,
      fontSize: 13,
      sidebarPadY: 8,
      sidebarPadX: 10,
      sidebarFontSize: 13,
      sidebarIconSize: 15,
      sidebarHeaderHeight: 42,
      toolbarHeight: 48,
      toolbarBtnHeight: 30,
      toolbarFontSize: 12.5,
      metaBarHeight: 34,
      sqlHeaderHeight: 40,
      sqlFontSize: 13,
      sqlGutterWidth: 46,
      ctrlBtnSize: 24,
      runBtnHeight: 28,
    },
  };

  // Hard Minimum Dimensions — absolute lower limits for Freeform compression (1px down from previous minimums)
  const HARD_MINIMUMS = Object.freeze({
    generalText: 4,        // px (was 5)
    tableSidebarLabels: 4, // px (was 5)
    tableCellText: 4,      // px (was 5)
    sqlEditorText: 4,      // px (was 5)
    buttonLabels: 4,       // px (was 5)
    icons: 4,              // px (was 5)
    secondaryMetadata: 3,  // px (was 4)
    interactiveButtonHit: 14, // 14x14 px (was 15x15)
    tableRowHeight: 12,    // px (was 13)
  });

  /**
   * Calculate smooth progressive compression reduction factor (0.0 to maxReduction)
   * relative to available space between normalSpace (0% reduction) and minSpace (max reduction).
   * Maps smoothly to stages:
   * - Normal: 0%
   * - Light: 10–15%
   * - Moderate: 20–30%
   * - Heavy: 35–45%
   * - Extreme: 50–60%
   */
  function calculateCompressionReduction(available, normal, min, maxReduction = 0.55) {
    if (available >= normal) return 0;
    if (available <= min) return maxReduction;
    const t = (normal - available) / (normal - min);
    return Math.min(maxReduction, Math.max(0, t * maxReduction));
  }

  const MOTION_PROFILES = {
    slick: {
      fastMs: 0,
      medMs: 0,
      ease: 'linear',
    },
    smooth: {
      fastMs: 140,
      medMs: 200,
      ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    fluid: {
      fastMs: 280,
      medMs: 440,
      ease: 'cubic-bezier(0.25, 1.15, 0.35, 1)',
    },
  };

  const DEFAULT_PREFS = Object.freeze({
    workspaceMargin: 0, // 0..24 px continuous margin continuum
    workspaceFraming: 0, // Backward-compat alias for workspaceMargin
    resizePolicy: 'guided', // 'guided' | 'freeform'
    sidebarGlass: false, // Per-panel Standard vs Glass
    sqlGlass: false, // Per-panel Standard vs Glass
    sidebarMode: 'docked', // 'docked' | 'floating'
    sqlMode: 'docked', // 'docked' | 'floating'
    sidebarWidth: 236,
    sidebarCollapsed: false,
    sqlPanelHeight: 240,
    sqlCollapsed: false,
    sidebarLock: false,
    sqlLock: false,
    density: 'balanced', // 'compact' | 'balanced' | 'spacious'
    globalRoundness: 2, // 0..6 (Default L2 Compact)
    workspaceRoundness: 'inherit', // 'inherit' | 0..6
    panelRoundness: 'inherit', // 'inherit' | 0..6
    buttonRoundness: 'inherit', // 'inherit' | 0..6
    inputRoundness: 'inherit', // 'inherit' | 0..6
    navRoundness: 'inherit', // 'inherit' | 0..6
    tableRoundness: 'inherit', // 'inherit' | 0..6
    overlayRoundness: 'inherit', // 'inherit' | 0..6
    panelLock: false, // Panel resize/move locking
    motionProfile: 'smooth', // 'slick' | 'smooth' | 'fluid'
    motionSpeed: 1.0, // 0.25..2.0 multiplier
    sqlAfterExecution: 'keep', // 'keep' | 'clear' | 'restrictive'
    sqlExecutionDestination: 'split', // 'split' | 'results' | 'query'
    sqlHistoryRetention: 100, // 50 | 100 | 250 | 500 | 1000
    floatingSqlPos: null, // { left, top, width, height }
    floatingSidebarPos: null, // { left, top, width, height }
  });

  function clampNumber(val, min, max, fallback) {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(Math.max(num, min), max);
  }

  function validateShapeOverride(val) {
    if (val === 'inherit') return 'inherit';
    const num = Number.parseInt(val, 10);
    if (Number.isInteger(num) && num >= 0 && num <= 6) {
      return String(num);
    }
    return 'inherit';
  }

  /**
   * Calculate safe panel bounds according to active resizePolicy ('guided' vs 'freeform')
   * and current window viewport dimensions, preventing panels from obscuring grid content.
   */
  function getLayoutBounds(policy = 'guided') {
    const vw = Math.max(window.innerWidth || 1024, 360);
    const vh = Math.max(window.innerHeight || 768, 420);

    if (policy === 'freeform') {
      // Freeform provides extensive spatial freedom down to a 52px rail and 36px header,
      // while guaranteeing essential workspace visibility to avoid total content collapse
      return {
        sidebarMin: 52,
        sidebarMax: Math.max(200, Math.min(480, vw - 240)),
        sqlMin: 36,
        sqlMax: Math.max(100, Math.min(vh - 140, Math.floor(vh * 0.78))),
      };
    }

    // Guided policy: enforces sensible minimums, preserves readable text and full status badges
    return {
      sidebarMin: 204,
      sidebarMax: Math.max(220, Math.min(340, Math.floor(vw * 0.34))),
      sqlMin: 140,
      sqlMax: Math.max(180, Math.min(vh - 250, Math.floor(vh * 0.52))),
    };
  }

  function sanitizePrefs(raw = {}) {
    const policy =
      raw.resizePolicy === 'freeform' ? 'freeform' : DEFAULT_PREFS.resizePolicy;
    const bounds = getLayoutBounds(policy);

    // Backward-compat mapping for instant -> slick
    const rawMotion = raw.motionProfile === 'instant' ? 'slick' : raw.motionProfile;

    let marginVal = DEFAULT_PREFS.workspaceMargin;
    if (raw.workspaceMargin !== undefined) {
      marginVal = Math.round(clampNumber(raw.workspaceMargin, 0, 24, 0));
    } else if (raw.workspaceFraming !== undefined) {
      marginVal = Math.round(clampNumber(raw.workspaceFraming, 0, 100, 0) * 0.24);
    }

    return {
      workspaceMargin: marginVal,
      workspaceFraming: marginVal,
      resizePolicy: policy,
      sidebarGlass: Boolean(raw.sidebarGlass ?? (raw.surfaceMaterial === 'glass')),
      sqlGlass: Boolean(raw.sqlGlass),
      sidebarMode:
        raw.sidebarMode === 'floating' ? 'floating' : DEFAULT_PREFS.sidebarMode,
      sqlMode:
        raw.sqlMode === 'floating' ? 'floating' : DEFAULT_PREFS.sqlMode,
      sidebarWidth: Math.round(
        clampNumber(
          raw.sidebarWidth,
          bounds.sidebarMin,
          bounds.sidebarMax,
          DEFAULT_PREFS.sidebarWidth
        )
      ),
      sidebarCollapsed: Boolean(raw.sidebarCollapsed),
      sqlPanelHeight: Math.round(
        clampNumber(
          raw.sqlPanelHeight,
          bounds.sqlMin,
          bounds.sqlMax,
          DEFAULT_PREFS.sqlPanelHeight
        )
      ),
      sqlCollapsed: Boolean(raw.sqlCollapsed),
      sidebarLock: Boolean(raw.sidebarLock),
      sqlLock: Boolean(raw.sqlLock),
      panelLock: Boolean(raw.panelLock || (raw.sidebarLock && raw.sqlLock)),
      density: DENSITY_PRESETS[raw.density]
        ? raw.density
        : DEFAULT_PREFS.density,
      globalRoundness: Math.round(
        clampNumber(raw.globalRoundness, 0, 6, DEFAULT_PREFS.globalRoundness)
      ),
      workspaceRoundness: validateShapeOverride(raw.workspaceRoundness),
      panelRoundness: validateShapeOverride(raw.panelRoundness),
      buttonRoundness: validateShapeOverride(raw.buttonRoundness),
      inputRoundness: validateShapeOverride(raw.inputRoundness),
      navRoundness: validateShapeOverride(raw.navRoundness),
      tableRoundness: validateShapeOverride(raw.tableRoundness),
      overlayRoundness: validateShapeOverride(raw.overlayRoundness),
      panelLock: Boolean(raw.panelLock),
      motionProfile: MOTION_PROFILES[rawMotion]
        ? rawMotion
        : DEFAULT_PREFS.motionProfile,
      motionSpeed: clampNumber(raw.motionSpeed, 0.25, 2.0, DEFAULT_PREFS.motionSpeed),
      sqlAfterExecution: ['keep', 'clear', 'restrictive'].includes(raw.sqlAfterExecution)
        ? raw.sqlAfterExecution
        : DEFAULT_PREFS.sqlAfterExecution,
      sqlExecutionDestination: ['split', 'results', 'query'].includes(raw.sqlExecutionDestination)
        ? raw.sqlExecutionDestination
        : DEFAULT_PREFS.sqlExecutionDestination,
      sqlHistoryRetention: Number(raw.sqlHistoryRetention) > 0
        ? Number(raw.sqlHistoryRetention)
        : DEFAULT_PREFS.sqlHistoryRetention,
      floatingSqlPos: raw.floatingSqlPos && typeof raw.floatingSqlPos === 'object' ? raw.floatingSqlPos : null,
      floatingSidebarPos: raw.floatingSidebarPos && typeof raw.floatingSidebarPos === 'object' ? raw.floatingSidebarPos : null,
    };
  }

  function loadStoredPrefs() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return sanitizePrefs(DEFAULT_PREFS);
      }

      const newRaw = window.localStorage.getItem(STORAGE_KEY);
      const oldRaw = window.localStorage.getItem(OLD_STORAGE_KEY);

      // Case 1: New key exists
      if (newRaw) {
        try {
          const parsedNew = JSON.parse(newRaw);
          const sanitized = sanitizePrefs(parsedNew);
          // If old key still lingers, remove it now that new key is proven valid
          if (oldRaw) {
            window.localStorage.removeItem(OLD_STORAGE_KEY);
          }
          return sanitized;
        } catch (_parseErr) {
          // If new key contains malformed JSON but old key exists and is valid, recover from old
          if (oldRaw) {
            let parsedOld;
            try {
              parsedOld = JSON.parse(oldRaw);
            } catch (_oldParseErr) {
              // Both keys malformed, fallback to default
              return sanitizePrefs(DEFAULT_PREFS);
            }
            const recovered = sanitizePrefs(parsedOld);
            try {
              const serialized = JSON.stringify(recovered);
              window.localStorage.setItem(STORAGE_KEY, serialized);
              if (window.localStorage.getItem(STORAGE_KEY) === serialized) {
                window.localStorage.removeItem(OLD_STORAGE_KEY);
              }
            } catch (_writeErr) {
              // Write failed (e.g. storage quota); preserve oldRaw and use recovered prefs in-memory
            }
            return recovered;
          }
          return sanitizePrefs(DEFAULT_PREFS);
        }
      }

      // Case 2: New key does not exist, but old key exists (migration path)
      if (oldRaw) {
        let parsedOld;
        try {
          parsedOld = JSON.parse(oldRaw);
        } catch (_oldParseErr) {
          // Malformed old data, safely fall back without crashing
          return sanitizePrefs(DEFAULT_PREFS);
        }
        const sanitized = sanitizePrefs(parsedOld);
        try {
          const serialized = JSON.stringify(sanitized);
          window.localStorage.setItem(STORAGE_KEY, serialized);
          // Verify write succeeded before deleting old key
          if (window.localStorage.getItem(STORAGE_KEY) === serialized) {
            window.localStorage.removeItem(OLD_STORAGE_KEY);
          }
        } catch (_writeErr) {
          // Write failed (e.g. storage quota); preserve oldRaw and use sanitized prefs in-memory
        }
        return sanitized;
      }

      // Case 3: Neither key exists (first run)
      return sanitizePrefs(DEFAULT_PREFS);
    } catch (_err) {
      return sanitizePrefs(DEFAULT_PREFS);
    }
  }

  function saveStoredPrefs(prefs) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_err) {
      // Ignore storage quota or private-mode errors gracefully
    }
  }

  function formatMarginLabel(val) {
    if (val === 0) return '0px (Flush)';
    return `${val}px`;
  }

  function formatFramingLabel(val) {
    return formatMarginLabel(val);
  }

  function createCustomizationController(domElements, callbacks = {}) {
    let prefs = loadStoredPrefs();
    let prevSidebarFloating = prefs.sidebarMode === 'floating';
    let prevSqlFloating = prefs.sqlMode === 'floating';
    let sidebarDockTimeout = null;
    let sqlDockTimeout = null;
    let sidebarEnterTimeout = null;
    let sqlEnterTimeout = null;
    let activeSidebarSpacer = null;
    let activeSqlSpacer = null;
    let prevSidebarCollapsed = Boolean(prefs.sidebarCollapsed);
    let prevSqlCollapsed = Boolean(prefs.sqlCollapsed);
    let savedFloatingSidebar = {
      left: 16,
      top: 16,
      width: 220,
      height: 420,
      ...(prefs.floatingSidebarPos || {}),
    };
    let savedFloatingSql = {
      left: null,
      top: null,
      width: 760,
      height: 260,
      ...(prefs.floatingSqlPos || {}),
    };

    function getTransitionDurationMs() {
      if (prefs.motionProfile === 'slick') return 0;
      const motion = MOTION_PROFILES[prefs.motionProfile] || MOTION_PROFILES.smooth;
      const speed = prefs.motionSpeed || 1;
      return Math.round(motion.medMs / speed);
    }

    /**
     * Relative Progressive Responsive Compression Engine for Freeform Mode
     * Relative to currently active density baseline (Compact, Balanced, or Spacious).
     * Smoothly calculates reductions across 5 stages:
     * - Normal: 0% reduction
     * - Light: 10-15% reduction
     * - Moderate: 20-30% reduction
     * - Heavy: 35-45% reduction
     * - Extreme: 50-60% reduction
     * Strictly enforces hard minimums (text >= 5px, icons >= 5px, button hit >= 15x15px, row height >= 13px, metadata >= 4px).
     * In Guided mode: compression factor is 0, preserving 100% standard baseline.
     */
    function applyResponsiveCompression(liveOptions = {}) {
      const rootStyle = document.documentElement.style;
      const isFreeform = prefs.resizePolicy === 'freeform';
      const density = DENSITY_PRESETS[prefs.density] || DENSITY_PRESETS.balanced;

      const sidebarEl = domElements.sidebar;
      const sqlEl = domElements.sqlPanel;
      const gridPaneEl = domElements.gridPane || document.getElementById('gridPane');
      const toolbarEl = domElements.topToolbar || document.querySelector('.top-toolbar');

      if (!isFreeform) {
        // Guided mode: Strictly preserve 100% density presets without compression
        rootStyle.setProperty('--grid-row-height', `${density.rowHeight}px`);
        rootStyle.setProperty('--grid-header-height', `${density.headerHeight}px`);
        rootStyle.setProperty('--grid-cell-pad-x', `${density.cellPadX}px`);
        rootStyle.setProperty('--grid-font-size', `${density.fontSize}px`);

        rootStyle.setProperty('--sidebar-item-pad-y', `${density.sidebarPadY}px`);
        rootStyle.setProperty('--sidebar-item-pad-x', `${density.sidebarPadX}px`);
        rootStyle.setProperty('--sidebar-font-size', `${density.sidebarFontSize}px`);
        rootStyle.setProperty('--sidebar-icon-size', `${density.sidebarIconSize}px`);
        rootStyle.setProperty('--sidebar-header-height', `${density.sidebarHeaderHeight}px`);
        rootStyle.setProperty('--sidebar-ctrl-btn-size', `${density.ctrlBtnSize}px`);

        rootStyle.setProperty('--sql-header-height', `${density.sqlHeaderHeight}px`);
        rootStyle.setProperty('--sql-font-size', `${density.sqlFontSize}px`);
        rootStyle.setProperty('--sql-gutter-width', `${density.sqlGutterWidth}px`);
        rootStyle.setProperty('--sql-ctrl-btn-size', `${density.ctrlBtnSize}px`);
        rootStyle.setProperty('--sql-run-btn-height', `${density.runBtnHeight}px`);

        rootStyle.setProperty('--toolbar-height', `${density.toolbarHeight}px`);
        rootStyle.setProperty('--toolbar-btn-height', `${density.toolbarBtnHeight}px`);
        rootStyle.setProperty('--toolbar-font-size', `${density.toolbarFontSize}px`);
        rootStyle.setProperty('--meta-bar-height', `${density.metaBarHeight}px`);

        // Clean up Freeform adaptive layout stage classes
        if (sidebarEl) {
          sidebarEl.classList.remove(
            'rail-extreme', 'rail-heavy', 'rail-moderate', 'rail-light',
            'compact-rail', 'narrow-rail'
          );
        }
        if (sqlEl) {
          sqlEl.classList.remove(
            'sql-compact-v', 'sql-extreme-v', 'sql-compact-h', 'sql-extreme-h'
          );
        }
        if (gridPaneEl) {
          gridPaneEl.classList.remove('grid-compact-v', 'grid-extreme-v', 'grid-compact-h');
        }
        if (toolbarEl) {
          toolbarEl.classList.remove('tb-compact', 'tb-extreme');
        }
        return;
      }

      // Freeform Mode: Measure available space for each component
      const vw = Math.max(window.innerWidth || 1024, 360);
      const vh = Math.max(window.innerHeight || 768, 420);

      const isLiveSidebar = Boolean(liveOptions && typeof liveOptions.sidebarWidth === 'number');
      const isLiveSql = Boolean(liveOptions && typeof liveOptions.sqlPanelHeight === 'number');

      // 1. Sidebar Available Space
      const isSidebarFloating = prefs.sidebarMode === 'floating';
      const sidebarWidth = isLiveSidebar
        ? liveOptions.sidebarWidth
        : (isSidebarFloating
            ? (sidebarEl ? (parseFloat(sidebarEl.style.width) || prefs.sidebarWidth || 220) : 220)
            : prefs.sidebarWidth);

      // 2. SQL Panel Available Space
      const isSqlFloating = prefs.sqlMode === 'floating';
      const sqlHeight = isLiveSql
        ? liveOptions.sqlPanelHeight
        : (isSqlFloating
            ? (sqlEl ? (parseFloat(sqlEl.style.height) || prefs.sqlPanelHeight || 240) : 240)
            : prefs.sqlPanelHeight);

      // Avoid synchronous getBoundingClientRect layout thrashing during live dragging
      const sqlWidth = (isLiveSidebar || isLiveSql)
        ? (isSidebarFloating ? vw : Math.max(260, vw - sidebarWidth))
        : (sqlEl && sqlEl.getBoundingClientRect().width > 0
            ? sqlEl.getBoundingClientRect().width
            : (isSidebarFloating ? vw : Math.max(260, vw - sidebarWidth)));

      // 3. Grid Pane Available Space
      // Deterministically measure workspaceMain container so dimensions never fight or fluctuate
      const workspaceMainEl = document.getElementById('workspaceMain');
      const wsMainHeight = workspaceMainEl && workspaceMainEl.clientHeight > 0
        ? workspaceMainEl.clientHeight
        : Math.max(120, vh - 60);

      const gridHeight = isSqlFloating
        ? wsMainHeight
        : Math.max(40, wsMainHeight - sqlHeight - 8);

      const wsBodyEl = domElements.workspaceBody;
      const wsBodyWidth = wsBodyEl && wsBodyEl.clientWidth > 0
        ? wsBodyEl.clientWidth
        : vw;

      const gridWidth = isSidebarFloating
        ? wsBodyWidth
        : Math.max(200, wsBodyWidth - sidebarWidth - 8);

      // 4. Top Toolbar Available Space
      const toolbarWidth = toolbarEl && toolbarEl.clientWidth > 0
        ? toolbarEl.clientWidth
        : vw;

      // Calculate smooth compression reductions (0.00 to 0.55 max reduction)
      const sidebarRed = calculateCompressionReduction(sidebarWidth, 210, 52, 0.55);
      const sqlHeightRed = calculateCompressionReduction(sqlHeight, 200, 36, 0.55);
      const sqlWidthRed = calculateCompressionReduction(sqlWidth, 700, 260, 0.55);
      const gridHeightRed = calculateCompressionReduction(gridHeight, 280, 60, 0.55);
      const gridWidthRed = calculateCompressionReduction(gridWidth, 700, 280, 0.55);
      const toolbarRed = calculateCompressionReduction(toolbarWidth, 900, 360, 0.50);

      // Hard minimum bounds enforcement (lowered by 1px):
      // Row height: min 12px
      const gridProgress = Math.min(1, Math.max(gridHeightRed, gridWidthRed) / 0.55);
      const compRowHeight = Math.max(
        HARD_MINIMUMS.tableRowHeight,
        Math.round(density.rowHeight - (density.rowHeight - HARD_MINIMUMS.tableRowHeight) * (gridHeightRed / 0.55))
      );
      // Header height: min 14px
      const compHeaderHeight = Math.max(
        14,
        Math.round(density.headerHeight - (density.headerHeight - 14) * (gridHeightRed / 0.55))
      );
      // Cell padding: min 1px
      const compCellPadX = Math.max(
        1,
        Math.round(density.cellPadX * (1 - Math.max(gridHeightRed, gridWidthRed) * 1.0))
      );
      // Table cell font size: min 4px
      const compGridFontSize = Math.max(
        HARD_MINIMUMS.tableCellText,
        Math.round((density.fontSize - (density.fontSize - HARD_MINIMUMS.tableCellText) * gridProgress) * 10) / 10
      );

      // Sidebar properties
      const sidebarProgress = Math.min(1, sidebarRed / 0.55);
      const compSbPadY = Math.max(
        1,
        Math.round(density.sidebarPadY * (1 - sidebarRed * 1.0))
      );
      const compSbPadX = Math.max(
        1,
        Math.round(density.sidebarPadX * (1 - sidebarRed * 1.0))
      );
      const compSbFontSize = Math.max(
        HARD_MINIMUMS.tableSidebarLabels,
        Math.round((density.sidebarFontSize - (density.sidebarFontSize - HARD_MINIMUMS.tableSidebarLabels) * sidebarProgress) * 10) / 10
      );
      const compSbIconSize = Math.max(
        HARD_MINIMUMS.icons,
        Math.round(density.sidebarIconSize - (density.sidebarIconSize - HARD_MINIMUMS.icons) * sidebarProgress)
      );
      const compSbHeaderHeight = Math.max(
        16,
        Math.round(density.sidebarHeaderHeight - (density.sidebarHeaderHeight - 16) * sidebarProgress)
      );
      const compSbCtrlBtnSize = Math.max(
        HARD_MINIMUMS.interactiveButtonHit,
        Math.round(density.ctrlBtnSize - (density.ctrlBtnSize - HARD_MINIMUMS.interactiveButtonHit) * sidebarProgress)
      );

      // SQL Panel properties — hard-limited to 4px minimum text / 14px minimum buttons, exactly like everything else
      const compSqlHeaderHeight = density.sqlHeaderHeight;
      const compSqlFontSize = Math.max(
        HARD_MINIMUMS.sqlEditorText,
        Math.round(density.sqlFontSize * (1 - Math.max(sqlHeightRed, sqlWidthRed) * 0.7) * 10) / 10
      );
      const compSqlGutterWidth = Math.max(
        14,
        Math.round(density.sqlGutterWidth * (1 - sqlHeightRed * 0.75))
      );
      const compSqlCtrlBtnSize = Math.max(
        HARD_MINIMUMS.interactiveButtonHit,
        Math.round(density.ctrlBtnSize * (1 - Math.max(sqlHeightRed, sqlWidthRed) * 0.65))
      );
      const compSqlRunBtnHeight = Math.max(
        HARD_MINIMUMS.interactiveButtonHit,
        Math.round(density.runBtnHeight * (1 - Math.max(sqlHeightRed, sqlWidthRed) * 0.65))
      );

      // Toolbar properties
      const toolbarProgress = Math.min(1, toolbarRed / 0.50);
      const compToolbarHeight = Math.max(
        24,
        Math.round(density.toolbarHeight - (density.toolbarHeight - 24) * toolbarProgress)
      );
      const compToolbarBtnHeight = Math.max(
        HARD_MINIMUMS.interactiveButtonHit,
        Math.round(density.toolbarBtnHeight - (density.toolbarBtnHeight - HARD_MINIMUMS.interactiveButtonHit) * toolbarProgress)
      );
      const compToolbarFontSize = Math.max(
        HARD_MINIMUMS.buttonLabels,
        Math.round((density.toolbarFontSize - (density.toolbarFontSize - HARD_MINIMUMS.buttonLabels) * toolbarProgress) * 10) / 10
      );
      const compMetaBarHeight = Math.max(
        16,
        Math.round(density.metaBarHeight - (density.metaBarHeight - 16) * (gridHeightRed / 0.55))
      );

      // Set computed compressed CSS variables on documentElement
      rootStyle.setProperty('--grid-row-height', `${compRowHeight}px`);
      rootStyle.setProperty('--grid-header-height', `${compHeaderHeight}px`);
      rootStyle.setProperty('--grid-cell-pad-x', `${compCellPadX}px`);
      rootStyle.setProperty('--grid-font-size', `${compGridFontSize}px`);

      rootStyle.setProperty('--sidebar-item-pad-y', `${compSbPadY}px`);
      rootStyle.setProperty('--sidebar-item-pad-x', `${compSbPadX}px`);
      rootStyle.setProperty('--sidebar-font-size', `${compSbFontSize}px`);
      rootStyle.setProperty('--sidebar-icon-size', `${compSbIconSize}px`);
      rootStyle.setProperty('--sidebar-header-height', `${compSbHeaderHeight}px`);
      rootStyle.setProperty('--sidebar-ctrl-btn-size', `${compSbCtrlBtnSize}px`);

      rootStyle.setProperty('--sql-header-height', `${compSqlHeaderHeight}px`);
      rootStyle.setProperty('--sql-font-size', `${compSqlFontSize}px`);
      rootStyle.setProperty('--sql-gutter-width', `${compSqlGutterWidth}px`);
      rootStyle.setProperty('--sql-ctrl-btn-size', `${compSqlCtrlBtnSize}px`);
      rootStyle.setProperty('--sql-run-btn-height', `${compSqlRunBtnHeight}px`);

      rootStyle.setProperty('--toolbar-height', `${compToolbarHeight}px`);
      rootStyle.setProperty('--toolbar-btn-height', `${compToolbarBtnHeight}px`);
      rootStyle.setProperty('--toolbar-font-size', `${compToolbarFontSize}px`);
      rootStyle.setProperty('--meta-bar-height', `${compMetaBarHeight}px`);

      // Reflow and Stage Transitions (Prioritize shrinking to hard minimums before hiding)
      if (sidebarEl && !sidebarEl.classList.contains('collapsed')) {
        sidebarEl.classList.toggle('rail-extreme', sidebarWidth < 85);
        sidebarEl.classList.toggle('rail-heavy', sidebarWidth >= 85 && sidebarWidth < 155);
        sidebarEl.classList.toggle('rail-moderate', sidebarWidth >= 155 && sidebarWidth < 185);
        sidebarEl.classList.toggle('rail-light', sidebarWidth >= 185 && sidebarWidth < 210);
        sidebarEl.classList.toggle('compact-rail', sidebarWidth < 85);
        sidebarEl.classList.toggle('narrow-rail', sidebarWidth < 155);
      }

      if (sqlEl) {
        // SQL panel: no hiding, all elements remain visible and hard-limited at 4px
        sqlEl.classList.remove('sql-compact-h', 'sql-extreme-h', 'sql-compact-v', 'sql-extreme-v');
      }

      if (gridPaneEl) {
        gridPaneEl.classList.toggle('grid-compact-v', gridHeight < 120);
        gridPaneEl.classList.toggle('grid-extreme-v', gridHeight < 70);
        gridPaneEl.classList.toggle('grid-compact-h', gridWidth < 380);
      }

      if (toolbarEl) {
        toolbarEl.classList.toggle('tb-compact', toolbarWidth < 420);
        toolbarEl.classList.toggle('tb-extreme', toolbarWidth < 320);
      }
    }

    function applyToDOM() {
      const rootStyle = document.documentElement.style;
      const bounds = getLayoutBounds(prefs.resizePolicy);

      // Clamp current dimensions to active policy bounds
      prefs.sidebarWidth = Math.round(
        clampNumber(prefs.sidebarWidth, bounds.sidebarMin, bounds.sidebarMax, 236)
      );
      prefs.sqlPanelHeight = Math.round(
        clampNumber(prefs.sqlPanelHeight, bounds.sqlMin, bounds.sqlMax, 240)
      );

      // 1. Workspace Margin (0px Flush to 24px Generous)
      const marginPx = prefs.workspaceMargin;
      rootStyle.setProperty('--workspace-margin', `${marginPx}px`);
      rootStyle.setProperty('--workspace-pad', `${marginPx}px`);
      rootStyle.setProperty('--workspace-gap', `${marginPx}px`);

      if (marginPx === 0) {
        rootStyle.setProperty('--workspace-shadow', 'none');
        rootStyle.setProperty('--workspace-panel-border', 'none');
        rootStyle.setProperty('--workspace-panel-bg', '#111118');
        domElements.appShell?.classList.remove('is-framed', 'is-floating-mode');
        domElements.appShell?.classList.add('is-flush-mode');
      } else {
        rootStyle.setProperty(
          '--workspace-shadow',
          `0 4px ${Math.round(4 + marginPx * 0.75)}px rgba(0, 0, 0, 0.65)`
        );
        rootStyle.setProperty('--workspace-panel-border', '1px solid #252530');
        rootStyle.setProperty('--workspace-panel-bg', '#111118');
        domElements.appShell?.classList.remove('is-flush-mode');
        domElements.appShell?.classList.add('is-framed');
      }

      // Material Treatment: Per-panel Glass toggles (Sidebar & SQL Editor)
      domElements.sidebar?.classList.toggle('is-glass-panel', Boolean(prefs.sidebarGlass));
      domElements.sqlPanel?.classList.toggle('is-glass-panel', Boolean(prefs.sqlGlass));
      domElements.sidebarGlassBtn?.classList.toggle('active', Boolean(prefs.sidebarGlass));
      domElements.sqlGlassBtn?.classList.toggle('active', Boolean(prefs.sqlGlass));

      // Resize policy: Freeform vs Guided systemic awareness
      const isFreeform = prefs.resizePolicy === 'freeform';
      if (document.body) {
        document.body.classList.toggle('policy-freeform', isFreeform);
        document.body.classList.toggle('policy-guided', !isFreeform);
      }
      if (domElements.appShell) {
        domElements.appShell.classList.toggle('policy-freeform', isFreeform);
        domElements.appShell.classList.toggle('policy-guided', !isFreeform);
      }

      // 2. Sidebar & SQL Panel Dimensions + Modularity & Freeform Auto-Reflow
      const density = DENSITY_PRESETS[prefs.density] || DENSITY_PRESETS.balanced;
      rootStyle.setProperty('--sidebar-width', `${prefs.sidebarWidth}px`);

      const isSqlCollapsed = Boolean(prefs.sqlCollapsed);
      if (domElements.sqlPanel) {
        domElements.sqlPanel.classList.toggle('collapsed', isSqlCollapsed);
      }
      const sqlCollapseBtn = domElements.sqlPanelCollapseBtn || document.getElementById('sqlPanelCollapseBtn');
      if (sqlCollapseBtn) {
        sqlCollapseBtn.classList.toggle('active', isSqlCollapsed);
        sqlCollapseBtn.style.transform = isSqlCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        sqlCollapseBtn.title = isSqlCollapsed ? 'Expand SQL Editor' : 'Collapse SQL Editor';
        sqlCollapseBtn.setAttribute('aria-expanded', String(!isSqlCollapsed));
      }

      if (isSqlCollapsed) {
        const headerH = density.sqlHeaderHeight || 36;
        rootStyle.setProperty('--sql-panel-height', `${headerH}px`);
      } else {
        rootStyle.setProperty('--sql-panel-height', `${prefs.sqlPanelHeight}px`);
      }

      // Reflow sidebar: content-first preservation down to 85px, ultra-compact icon rail < 85px
      if (domElements.sidebar) {
        const isCompactRail = isFreeform && prefs.sidebarWidth < 85;
        const isNarrowRail = isFreeform && prefs.sidebarWidth < 140;
        domElements.sidebar.classList.toggle('compact-rail', isCompactRail);
        domElements.sidebar.classList.toggle('narrow-rail', isNarrowRail);
      }

      // Per-panel Lock Mode (Sidebar & SQL Editor)
      const isSidebarLocked = Boolean(prefs.sidebarLock);
      const isSqlLocked = Boolean(prefs.sqlLock);
      const isWorkspaceLocked = Boolean(prefs.panelLock || (isSidebarLocked && isSqlLocked));

      domElements.sidebar?.classList.toggle('panel-locked', isSidebarLocked);
      domElements.sqlPanel?.classList.toggle('panel-locked', isSqlLocked);

      const sidebarLockBtnEl = domElements.sidebarLockBtn || document.getElementById('sidebarLockBtn');
      if (sidebarLockBtnEl) {
        sidebarLockBtnEl.classList.toggle('active', isSidebarLocked);
        sidebarLockBtnEl.title = isSidebarLocked
          ? 'Unlock sidebar movement and position'
          : 'Lock sidebar position';
        sidebarLockBtnEl.setAttribute('aria-pressed', String(isSidebarLocked));
      }

      const sqlLockBtnEl = domElements.sqlLockBtn || document.getElementById('sqlLockBtn');
      if (sqlLockBtnEl) {
        sqlLockBtnEl.classList.toggle('active', isSqlLocked);
        sqlLockBtnEl.title = isSqlLocked
          ? 'Unlock SQL editor movement and position'
          : 'Lock SQL editor position';
        sqlLockBtnEl.setAttribute('aria-pressed', String(isSqlLocked));
      }

      if (document.body) {
        document.body.classList.toggle('workspace-locked', isWorkspaceLocked);
      }

      // Seamless Layout Transition for Floating vs Docked Mode (Sidebar)
      const isSidebarFloating = prefs.sidebarMode === 'floating';
      if (isSidebarFloating !== prevSidebarFloating) {
        clearTimeout(sidebarDockTimeout);
        clearTimeout(sidebarEnterTimeout);
        const sidebar = domElements.sidebar;
        if (sidebar) {
          sidebar.classList.remove('panel-is-docking');
          sidebar.style.removeProperty('max-width');
          sidebar.style.removeProperty('max-height');
        }
        const durationMs = getTransitionDurationMs();
        const bodyRect = domElements.workspaceBody ? domElements.workspaceBody.getBoundingClientRect() : null;

        if (isSidebarFloating) {
          // Docked -> Floating
          let fromLeft = 0, fromTop = 0, fromWidth = prefs.sidebarWidth || 220, fromHeight = bodyRect ? Math.round(bodyRect.height) : 600;
          if (sidebar && bodyRect) {
            const curRect = sidebar.getBoundingClientRect();
            fromLeft = Math.round(curRect.left - bodyRect.left);
            fromTop = Math.round(curRect.top - bodyRect.top);
            fromWidth = Math.round(curRect.width) || fromWidth;
            fromHeight = Math.round(curRect.height) || fromHeight;
          }

          const targetLeft = Math.min(Math.max(10, savedFloatingSidebar.left), bodyRect ? Math.max(10, bodyRect.width - savedFloatingSidebar.width - 10) : savedFloatingSidebar.left);
          const targetTop = Math.min(Math.max(10, savedFloatingSidebar.top), bodyRect ? Math.max(10, bodyRect.height - savedFloatingSidebar.height - 10) : savedFloatingSidebar.top);
          const targetWidth = savedFloatingSidebar.width;
          const targetHeight = savedFloatingSidebar.height;

          // Environment adaptation: smoothly close the vacated space in workspaceBody
          if (durationMs > 0 && domElements.workspaceBody) {
            if (!activeSidebarSpacer) {
              activeSidebarSpacer = document.createElement('div');
              activeSidebarSpacer.className = 'dock-space-transition';
              activeSidebarSpacer.style.width = `${Math.round(fromWidth + 7)}px`;
              activeSidebarSpacer.style.height = '100%';
              domElements.workspaceBody.prepend(activeSidebarSpacer);
            }
            const spacerDurationMs = Math.round(durationMs / 1.3); // 130% speed
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';
            requestAnimationFrame(() => {
              if (activeSidebarSpacer) {
                activeSidebarSpacer.style.transition = `width ${spacerDurationMs}ms ${ease}`;
                activeSidebarSpacer.style.width = '0px';
              }
            });
          }

          if (sidebar) {
            sidebar.classList.add('is-floating-panel');
            sidebar.classList.add('panel-is-docking');
            sidebar.style.setProperty('max-width', 'none', 'important');
            sidebar.style.setProperty('max-height', 'none', 'important');
            sidebar.style.position = 'absolute';
            sidebar.style.transition = 'none';
            sidebar.style.left = `${fromLeft}px`;
            sidebar.style.top = `${fromTop}px`;
            sidebar.style.right = 'auto';
            sidebar.style.bottom = 'auto';
            sidebar.style.width = `${fromWidth}px`;
            sidebar.style.height = `${fromHeight}px`;
            sidebar.style.boxShadow = 'none';
            sidebar.style.borderRadius = 'var(--radius-panel, 0px)';
            void sidebar.offsetWidth;
          }
          if (domElements.workspaceBody) {
            domElements.workspaceBody.classList.add('sidebar-floating');
          }

          if (durationMs > 0 && sidebar) {
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';
            requestAnimationFrame(() => {
              sidebar.style.transition = `left ${durationMs}ms ${ease}, top ${durationMs}ms ${ease}, width ${durationMs}ms ${ease}, height ${durationMs}ms ${ease}, border-radius ${durationMs}ms ${ease}, box-shadow ${durationMs}ms ${ease}`;
              sidebar.style.left = `${targetLeft}px`;
              sidebar.style.top = `${targetTop}px`;
              sidebar.style.width = `${targetWidth}px`;
              sidebar.style.height = `${targetHeight}px`;
              sidebar.style.borderRadius = 'var(--radius-overlay)';
              sidebar.style.boxShadow = '0 16px 44px rgba(0, 0, 0, 0.88)';

              sidebarEnterTimeout = setTimeout(() => {
                sidebar.classList.remove('panel-is-docking');
                sidebar.style.removeProperty('max-width');
                sidebar.style.removeProperty('max-height');
                sidebar.style.transition = '';
                sidebar.style.boxShadow = '';
                sidebar.style.borderRadius = '';
                if (activeSidebarSpacer) {
                  activeSidebarSpacer.remove();
                  activeSidebarSpacer = null;
                }
              }, durationMs);
            });
          } else if (sidebar) {
            sidebar.style.left = `${targetLeft}px`;
            sidebar.style.top = `${targetTop}px`;
            sidebar.style.width = `${targetWidth}px`;
            sidebar.style.height = `${targetHeight}px`;
            sidebar.style.boxShadow = '';
            sidebar.style.borderRadius = '';
            if (activeSidebarSpacer) {
              activeSidebarSpacer.remove();
              activeSidebarSpacer = null;
            }
          }
        } else {
          // Floating -> Docked
          let fromLeft = 16, fromTop = 16, fromWidth = 220, fromHeight = 420;
          if (sidebar && bodyRect) {
            const curRect = sidebar.getBoundingClientRect();
            fromLeft = Math.round(curRect.left - bodyRect.left);
            fromTop = Math.round(curRect.top - bodyRect.top);
            fromWidth = Math.round(curRect.width) || fromWidth;
            fromHeight = Math.round(curRect.height) || fromHeight;
            if ((fromLeft >= 10 || fromTop >= 10) && fromWidth >= 150 && fromHeight >= 150) {
              savedFloatingSidebar.left = fromLeft;
              savedFloatingSidebar.top = fromTop;
              savedFloatingSidebar.width = fromWidth;
              savedFloatingSidebar.height = fromHeight;
            }
          }

          const panelWidth = prefs.sidebarWidth || 220;
          const targetSpaceWidth = panelWidth + 7;
          const targetHeight = domElements.workspaceBody ? domElements.workspaceBody.clientHeight : (bodyRect ? Math.round(bodyRect.height) : 600);

          if (durationMs > 0 && domElements.workspaceBody && sidebar) {
            const spacerDurationMs = Math.round(durationMs / 1.3); // 130% speed
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';

            if (!activeSidebarSpacer) {
              activeSidebarSpacer = document.createElement('div');
              activeSidebarSpacer.className = 'dock-space-transition';
              activeSidebarSpacer.style.width = '0px';
              activeSidebarSpacer.style.height = '100%';
              domElements.workspaceBody.prepend(activeSidebarSpacer);
            }

            requestAnimationFrame(() => {
              if (activeSidebarSpacer) {
                activeSidebarSpacer.style.transition = `width ${spacerDurationMs}ms ${ease}`;
                activeSidebarSpacer.style.width = `${targetSpaceWidth}px`;
              }
            });

            sidebar.classList.add('panel-is-docking');
            sidebar.style.setProperty('max-width', 'none', 'important');
            sidebar.style.setProperty('max-height', 'none', 'important');
            sidebar.style.position = 'absolute';
            sidebar.style.transition = 'none';
            sidebar.style.left = `${fromLeft}px`;
            sidebar.style.top = `${fromTop}px`;
            sidebar.style.right = 'auto';
            sidebar.style.bottom = 'auto';
            sidebar.style.width = `${fromWidth}px`;
            sidebar.style.height = `${fromHeight}px`;
            sidebar.style.boxShadow = '0 16px 44px rgba(0, 0, 0, 0.88)';
            sidebar.style.borderRadius = 'var(--radius-overlay)';
            void sidebar.offsetWidth;

            requestAnimationFrame(() => {
              sidebar.style.transition = `left ${spacerDurationMs}ms ${ease}, top ${spacerDurationMs}ms ${ease}, width ${spacerDurationMs}ms ${ease}, height ${spacerDurationMs}ms ${ease}, border-radius ${spacerDurationMs}ms ${ease}, box-shadow ${spacerDurationMs}ms ${ease}`;
              sidebar.style.left = '0px';
              sidebar.style.top = '0px';
              sidebar.style.right = 'auto';
              sidebar.style.bottom = 'auto';
              sidebar.style.width = `${panelWidth}px`;
              sidebar.style.height = `${targetHeight}px`;
              sidebar.style.borderRadius = 'var(--radius-panel, 0px)';
              sidebar.style.boxShadow = 'none';

              sidebarDockTimeout = setTimeout(() => {
                if (activeSidebarSpacer) {
                  activeSidebarSpacer.remove();
                  activeSidebarSpacer = null;
                }
                sidebar.classList.remove('is-floating-panel', 'panel-is-docking');
                if (domElements.workspaceBody) {
                  domElements.workspaceBody.classList.remove('sidebar-floating');
                }
                sidebar.style.removeProperty('max-width');
                sidebar.style.removeProperty('max-height');
                sidebar.style.position = '';
                sidebar.style.left = '';
                sidebar.style.top = '';
                sidebar.style.bottom = '';
                sidebar.style.right = '';
                sidebar.style.width = '';
                sidebar.style.height = '';
                sidebar.style.boxShadow = '';
                sidebar.style.borderRadius = '';
                sidebar.style.transition = '';
              }, spacerDurationMs);
            });
          } else {
            // Instant fallback (slick / no duration)
            if (activeSidebarSpacer) {
              activeSidebarSpacer.remove();
              activeSidebarSpacer = null;
            }
            if (sidebar) {
              sidebar.classList.remove('is-floating-panel', 'panel-is-docking');
              sidebar.style.position = '';
              sidebar.style.left = '';
              sidebar.style.top = '';
              sidebar.style.bottom = '';
              sidebar.style.right = '';
              sidebar.style.width = '';
              sidebar.style.height = '';
              sidebar.style.boxShadow = '';
              sidebar.style.borderRadius = '';
              sidebar.style.transition = '';
            }
            if (domElements.workspaceBody) {
              domElements.workspaceBody.classList.remove('sidebar-floating');
            }
          }
        }
        prevSidebarFloating = isSidebarFloating;
      } else if (!isSidebarFloating) {
        if (domElements.sidebar) {
          domElements.sidebar.classList.remove('is-floating-panel');
        }
        if (domElements.workspaceBody) {
          domElements.workspaceBody.classList.remove('sidebar-floating');
        }
      } else if (isSidebarFloating && domElements.sidebar) {
        domElements.sidebar.classList.add('is-floating-panel');
        if (domElements.workspaceBody) {
          domElements.workspaceBody.classList.add('sidebar-floating');
        }
      }

      const sidebarDockBtnEl = domElements.sidebarDockBtn || document.getElementById('sidebarDockBtn');
      if (sidebarDockBtnEl) {
        sidebarDockBtnEl.classList.toggle('active', isSidebarFloating);
        sidebarDockBtnEl.title = isSidebarFloating
          ? 'Dock Sidebar to layout'
          : 'Float Sidebar panel';
        sidebarDockBtnEl.setAttribute('aria-pressed', String(isSidebarFloating));
      }

      // Seamless Layout Transition for Floating vs Docked Mode (SQL Editor)
      const isSqlFloating = prefs.sqlMode === 'floating';
      if (isSqlFloating !== prevSqlFloating) {
        clearTimeout(sqlDockTimeout);
        clearTimeout(sqlEnterTimeout);
        const sqlPanel = domElements.sqlPanel;
        if (sqlPanel) {
          sqlPanel.classList.remove('panel-is-docking');
          sqlPanel.style.removeProperty('max-width');
          sqlPanel.style.removeProperty('max-height');
        }
        const durationMs = getTransitionDurationMs();
        const wsMain = document.getElementById('workspaceMain');
        const bodyRect = domElements.workspaceBody ? domElements.workspaceBody.getBoundingClientRect() : null;

        if (isSqlFloating) {
          // Docked -> Floating
          let fromLeft = 0, fromTop = 0, fromWidth = 760, fromHeight = prefs.sqlPanelHeight || 240;
          if (sqlPanel && bodyRect) {
            const curRect = sqlPanel.getBoundingClientRect();
            fromLeft = Math.round(curRect.left - bodyRect.left);
            fromTop = Math.round(curRect.top - bodyRect.top);
            fromWidth = Math.round(curRect.width) || fromWidth;
            fromHeight = Math.round(curRect.height) || fromHeight;
          }

          const targetWidth = savedFloatingSql.width;
          const targetHeight = savedFloatingSql.height;
          const defaultLeft = bodyRect ? Math.max(10, Math.round(bodyRect.width - targetWidth - 20)) : 100;
          const defaultTop = bodyRect ? Math.max(10, Math.round(bodyRect.height - targetHeight - 20)) : 200;
          const targetLeft = savedFloatingSql.left != null
            ? Math.min(Math.max(10, savedFloatingSql.left), bodyRect ? Math.max(10, bodyRect.width - targetWidth - 10) : savedFloatingSql.left)
            : defaultLeft;
          const targetTop = savedFloatingSql.top != null
            ? Math.min(Math.max(10, savedFloatingSql.top), bodyRect ? Math.max(10, bodyRect.height - targetHeight - 10) : savedFloatingSql.top)
            : defaultTop;

          // Environment adaptation: smoothly close the vacated space in workspaceMain
          if (durationMs > 0 && wsMain) {
            if (!activeSqlSpacer) {
              activeSqlSpacer = document.createElement('div');
              activeSqlSpacer.className = 'dock-space-transition';
              activeSqlSpacer.style.height = `${Math.round(fromHeight + 7)}px`;
              activeSqlSpacer.style.width = '100%';
              wsMain.appendChild(activeSqlSpacer);
            }
            const spacerDurationMs = Math.round(durationMs / 1.3); // 130% speed
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';
            requestAnimationFrame(() => {
              if (activeSqlSpacer) {
                activeSqlSpacer.style.transition = `height ${spacerDurationMs}ms ${ease}`;
                activeSqlSpacer.style.height = '0px';
              }
            });
          }

          if (sqlPanel) {
            sqlPanel.classList.add('is-floating-panel');
            sqlPanel.classList.add('panel-is-docking');
            sqlPanel.style.setProperty('max-width', 'none', 'important');
            sqlPanel.style.setProperty('max-height', 'none', 'important');
            sqlPanel.style.position = 'absolute';
            sqlPanel.style.transition = 'none';
            sqlPanel.style.left = `${fromLeft}px`;
            sqlPanel.style.top = `${fromTop}px`;
            sqlPanel.style.right = 'auto';
            sqlPanel.style.bottom = 'auto';
            sqlPanel.style.width = `${fromWidth}px`;
            sqlPanel.style.height = `${fromHeight}px`;
            sqlPanel.style.boxShadow = 'none';
            sqlPanel.style.borderRadius = 'var(--radius-panel, 0px)';
            void sqlPanel.offsetWidth;
          }
          if (domElements.workspaceBody) {
            domElements.workspaceBody.classList.add('sql-floating');
          }
          if (document.body) {
            document.body.classList.add('sql-panel-floating');
          }

          if (durationMs > 0 && sqlPanel) {
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';
            requestAnimationFrame(() => {
              sqlPanel.style.transition = `left ${durationMs}ms ${ease}, top ${durationMs}ms ${ease}, width ${durationMs}ms ${ease}, height ${durationMs}ms ${ease}, border-radius ${durationMs}ms ${ease}, box-shadow ${durationMs}ms ${ease}`;
              sqlPanel.style.left = `${targetLeft}px`;
              sqlPanel.style.top = `${targetTop}px`;
              sqlPanel.style.width = `${targetWidth}px`;
              sqlPanel.style.height = `${targetHeight}px`;
              sqlPanel.style.borderRadius = 'var(--radius-overlay)';
              sqlPanel.style.boxShadow = '0 16px 44px rgba(0, 0, 0, 0.88)';

              sqlEnterTimeout = setTimeout(() => {
                sqlPanel.classList.remove('panel-is-docking');
                sqlPanel.style.removeProperty('max-width');
                sqlPanel.style.removeProperty('max-height');
                sqlPanel.style.transition = '';
                sqlPanel.style.boxShadow = '';
                sqlPanel.style.borderRadius = '';
                if (activeSqlSpacer) {
                  activeSqlSpacer.remove();
                  activeSqlSpacer = null;
                }
              }, durationMs);
            });
          } else if (sqlPanel) {
            sqlPanel.style.left = `${targetLeft}px`;
            sqlPanel.style.top = `${targetTop}px`;
            sqlPanel.style.width = `${targetWidth}px`;
            sqlPanel.style.height = `${targetHeight}px`;
            sqlPanel.style.boxShadow = '';
            sqlPanel.style.borderRadius = '';
            if (activeSqlSpacer) {
              activeSqlSpacer.remove();
              activeSqlSpacer = null;
            }
          }
        } else {
          // Floating -> Docked
          let fromLeft = 16, fromTop = 16, fromWidth = 760, fromHeight = 260;
          if (sqlPanel && bodyRect) {
            const curRect = sqlPanel.getBoundingClientRect();
            fromLeft = Math.round(curRect.left - bodyRect.left);
            fromTop = Math.round(curRect.top - bodyRect.top);
            fromWidth = Math.round(curRect.width) || fromWidth;
            fromHeight = Math.round(curRect.height) || fromHeight;
            if ((fromLeft >= 10 || fromTop >= 10) && fromWidth >= 200 && fromHeight >= 100) {
              savedFloatingSql.left = fromLeft;
              savedFloatingSql.top = fromTop;
              savedFloatingSql.width = fromWidth;
              savedFloatingSql.height = fromHeight;
            }
          }

          const panelHeight = prefs.sqlPanelHeight || 240;
          const targetSpaceHeight = panelHeight + 7;
          const wsRect = wsMain ? wsMain.getBoundingClientRect() : null;
          const targetLeft = wsRect && bodyRect ? Math.round(wsRect.left - bodyRect.left) : (prefs.sidebarMode === 'docked' ? (prefs.sidebarWidth || 220) + 7 : 0);
          const targetTop = bodyRect ? Math.round(bodyRect.height - panelHeight) : 400;
          const targetWidth = wsRect ? Math.round(wsRect.width) : 800;
          const targetHeight = panelHeight;

          if (durationMs > 0 && wsMain && sqlPanel) {
            const spacerDurationMs = Math.round(durationMs / 1.3); // 130% speed
            const ease = prefs.motionProfile === 'fluid' ? 'var(--fluid-ease)' : 'var(--motion-ease)';

            if (!activeSqlSpacer) {
              activeSqlSpacer = document.createElement('div');
              activeSqlSpacer.className = 'dock-space-transition';
              activeSqlSpacer.style.height = '0px';
              activeSqlSpacer.style.width = '100%';
              wsMain.appendChild(activeSqlSpacer);
            }

            requestAnimationFrame(() => {
              if (activeSqlSpacer) {
                activeSqlSpacer.style.transition = `height ${spacerDurationMs}ms ${ease}`;
                activeSqlSpacer.style.height = `${targetSpaceHeight}px`;
              }
            });

            sqlPanel.classList.add('panel-is-docking');
            sqlPanel.style.setProperty('max-width', 'none', 'important');
            sqlPanel.style.setProperty('max-height', 'none', 'important');
            sqlPanel.style.position = 'absolute';
            sqlPanel.style.transition = 'none';
            sqlPanel.style.left = `${fromLeft}px`;
            sqlPanel.style.top = `${fromTop}px`;
            sqlPanel.style.right = 'auto';
            sqlPanel.style.bottom = 'auto';
            sqlPanel.style.width = `${fromWidth}px`;
            sqlPanel.style.height = `${fromHeight}px`;
            sqlPanel.style.boxShadow = '0 16px 44px rgba(0, 0, 0, 0.88)';
            sqlPanel.style.borderRadius = 'var(--radius-overlay)';
            void sqlPanel.offsetWidth;

            requestAnimationFrame(() => {
              sqlPanel.style.transition = `left ${spacerDurationMs}ms ${ease}, top ${spacerDurationMs}ms ${ease}, width ${spacerDurationMs}ms ${ease}, height ${spacerDurationMs}ms ${ease}, border-radius ${spacerDurationMs}ms ${ease}, box-shadow ${spacerDurationMs}ms ${ease}`;
              sqlPanel.style.left = `${targetLeft}px`;
              sqlPanel.style.top = `${targetTop}px`;
              sqlPanel.style.right = 'auto';
              sqlPanel.style.bottom = 'auto';
              sqlPanel.style.width = `${targetWidth}px`;
              sqlPanel.style.height = `${targetHeight}px`;
              sqlPanel.style.borderRadius = 'var(--radius-panel, 0px)';
              sqlPanel.style.boxShadow = 'none';

              sqlDockTimeout = setTimeout(() => {
                if (activeSqlSpacer) {
                  activeSqlSpacer.remove();
                  activeSqlSpacer = null;
                }
                sqlPanel.classList.remove('is-floating-panel', 'panel-is-docking');
                if (domElements.workspaceBody) {
                  domElements.workspaceBody.classList.remove('sql-floating');
                }
                if (document.body) {
                  document.body.classList.remove('sql-panel-floating');
                }
                sqlPanel.style.removeProperty('max-width');
                sqlPanel.style.removeProperty('max-height');
                sqlPanel.style.position = '';
                sqlPanel.style.left = '';
                sqlPanel.style.top = '';
                sqlPanel.style.bottom = '';
                sqlPanel.style.right = '';
                sqlPanel.style.width = '';
                sqlPanel.style.height = '';
                sqlPanel.style.boxShadow = '';
                sqlPanel.style.borderRadius = '';
                sqlPanel.style.transition = '';
              }, spacerDurationMs);
            });
          } else {
            // Instant fallback (slick / no duration)
            if (activeSqlSpacer) {
              activeSqlSpacer.remove();
              activeSqlSpacer = null;
            }
            if (sqlPanel) {
              sqlPanel.classList.remove('is-floating-panel', 'panel-is-docking');
              sqlPanel.style.position = '';
              sqlPanel.style.left = '';
              sqlPanel.style.top = '';
              sqlPanel.style.bottom = '';
              sqlPanel.style.right = '';
              sqlPanel.style.width = '';
              sqlPanel.style.height = '';
              sqlPanel.style.boxShadow = '';
              sqlPanel.style.borderRadius = '';
              sqlPanel.style.transition = '';
            }
            if (domElements.workspaceBody) {
              domElements.workspaceBody.classList.remove('sql-floating');
            }
            if (document.body) {
              document.body.classList.remove('sql-panel-floating');
            }
          }
        }
        prevSqlFloating = isSqlFloating;
      } else if (!isSqlFloating) {
        if (domElements.sqlPanel) {
          domElements.sqlPanel.classList.remove('is-floating-panel');
        }
        if (domElements.workspaceBody) {
          domElements.workspaceBody.classList.remove('sql-floating');
        }
        if (document.body) {
          document.body.classList.remove('sql-panel-floating');
        }
      } else if (isSqlFloating && domElements.sqlPanel) {
        domElements.sqlPanel.classList.add('is-floating-panel');
        if (domElements.workspaceBody) {
          domElements.workspaceBody.classList.add('sql-floating');
        }
        if (document.body) {
          document.body.classList.add('sql-panel-floating');
        }
      }

      const sqlDockBtnEl = domElements.sqlDockBtn || document.getElementById('sqlDockBtn');
      if (sqlDockBtnEl) {
        sqlDockBtnEl.classList.toggle('active', isSqlFloating);
        sqlDockBtnEl.title = isSqlFloating
          ? 'Dock SQL Editor to layout'
          : 'Float SQL Editor panel';
        sqlDockBtnEl.setAttribute('aria-pressed', String(isSqlFloating));
      }

      if (prefs.sidebarCollapsed !== prevSidebarCollapsed) {
        prevSidebarCollapsed = prefs.sidebarCollapsed;
        clearTimeout(sidebarEnterTimeout);
        clearTimeout(sidebarDockTimeout);
        if (activeSidebarSpacer) {
          activeSidebarSpacer.remove();
          activeSidebarSpacer = null;
        }
        if (domElements.sidebar) {
          domElements.sidebar.style.removeProperty('transform');
          domElements.sidebar.style.removeProperty('transition');
          domElements.sidebar.style.removeProperty('transform-origin');
        }
      }

      if (prefs.sqlCollapsed !== prevSqlCollapsed) {
        prevSqlCollapsed = prefs.sqlCollapsed;
        clearTimeout(sqlEnterTimeout);
        clearTimeout(sqlDockTimeout);
        if (activeSqlSpacer) {
          activeSqlSpacer.remove();
          activeSqlSpacer = null;
        }
        if (domElements.sqlPanel) {
          domElements.sqlPanel.style.removeProperty('transform');
          domElements.sqlPanel.style.removeProperty('transition');
          domElements.sqlPanel.style.removeProperty('transform-origin');
        }
      }

      if (domElements.sidebar) {
        domElements.sidebar.classList.toggle('collapsed', prefs.sidebarCollapsed);
      }
      if (domElements.sidebarToggleBtn) {
        domElements.sidebarToggleBtn.setAttribute(
          'aria-expanded',
          String(!prefs.sidebarCollapsed)
        );
        domElements.sidebarToggleBtn.classList.toggle('active', !prefs.sidebarCollapsed);
        domElements.sidebarToggleBtn.title = prefs.sidebarCollapsed
          ? 'Open Sidebar (⌘B)'
          : 'Collapse Sidebar (⌘B)';
      }

      // 3. Component-Aware Shape & Corner Profile Hierarchy
      const globalIdx = prefs.globalRoundness;

      function resolveRadius(overrideVal, group) {
        if (overrideVal !== 'inherit' && overrideVal !== undefined) {
          return calculateComponentRadius(Number(overrideVal), group);
        }
        return calculateComponentRadius(globalIdx, group);
      }

      const panelRadius = resolveRadius(prefs.panelRoundness, 'panels');

      rootStyle.setProperty('--radius-workspace', panelRadius);
      rootStyle.setProperty('--radius-panel', panelRadius);
      rootStyle.setProperty('--radius-btn', resolveRadius(prefs.buttonRoundness, 'buttons'));
      rootStyle.setProperty('--radius-input', resolveRadius(prefs.inputRoundness, 'inputs'));
      rootStyle.setProperty('--radius-nav', resolveRadius(prefs.navRoundness, 'nav'));
      rootStyle.setProperty('--radius-table', resolveRadius(prefs.tableRoundness, 'tables'));
      rootStyle.setProperty('--radius-overlay', resolveRadius(prefs.overlayRoundness, 'overlays'));

      // 4. Density Presets & Relative Progressive Responsive Compression
      applyResponsiveCompression();

      // 5. Motion & Animation Speed
      const motion = MOTION_PROFILES[prefs.motionProfile] || MOTION_PROFILES.smooth;
      const speedFactor = prefs.motionSpeed || 1;
      const fastMs = Math.round(motion.fastMs / speedFactor);
      const medMs = Math.round(motion.medMs / speedFactor);

      rootStyle.setProperty('--motion-duration-fast', `${fastMs}ms`);
      rootStyle.setProperty('--motion-duration-med', `${medMs}ms`);
      rootStyle.setProperty('--motion-ease', motion.ease);

      // Motion profile state classes for organic shape interpolation
      domElements.appShell?.classList.remove('motion-slick', 'motion-smooth', 'motion-fluid');
      domElements.appShell?.classList.add(`motion-${prefs.motionProfile}`);
      if (document.body) {
        document.body.classList.remove('motion-slick', 'motion-smooth', 'motion-fluid');
        document.body.classList.add(`motion-${prefs.motionProfile}`);
      }

      syncDrawerControls();
      updateSidebarButtonVector();
    }

    function updateSidebarButtonVector() {
      const sidebar = domElements.sidebar;
      const toggleBtn = domElements.sidebarToggleBtn || document.getElementById('sidebarToggleBtn');
      if (!sidebar || !toggleBtn) return;
      const btnRect = toggleBtn.getBoundingClientRect();
      const isFloating = sidebar.classList.contains('is-floating-panel');

      let sidebarLeft, sidebarTop, sidebarWidth, sidebarHeight;
      if (isFloating) {
        sidebarLeft = parseFloat(sidebar.style.left) || 16;
        sidebarTop = parseFloat(sidebar.style.top) || 16;
        sidebarWidth = parseFloat(sidebar.style.width) || prefs.sidebarWidth || 220;
        sidebarHeight = parseFloat(sidebar.style.height) || 420;
      } else {
        const bodyRect = domElements.workspaceBody ? domElements.workspaceBody.getBoundingClientRect() : { left: 0, top: 48, height: window.innerHeight - 48 };
        sidebarLeft = bodyRect.left;
        sidebarTop = bodyRect.top;
        sidebarWidth = prefs.sidebarWidth || 220;
        sidebarHeight = bodyRect.height || (window.innerHeight - 48);
      }

      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;
      const sidebarCenterX = sidebarLeft + sidebarWidth / 2;
      const sidebarCenterY = sidebarTop + sidebarHeight / 2;
      const dx = Math.round(btnCenterX - sidebarCenterX);
      const dy = Math.round(btnCenterY - sidebarCenterY);
      sidebar.style.setProperty('--sidebar-btn-dx', `${dx}px`);
      sidebar.style.setProperty('--sidebar-btn-dy', `${dy}px`);

      const dockOriginX = Math.round(btnCenterX - sidebarLeft);
      const dockOriginY = Math.round(btnCenterY - sidebarTop);
      sidebar.style.setProperty('--sidebar-dock-origin-x', `${dockOriginX}px`);
      sidebar.style.setProperty('--sidebar-dock-origin-y', `${dockOriginY}px`);
    }

    function updateSegmentedPills() {
      const controls = document.querySelectorAll('.segmented-control');
      controls.forEach((ctrl) => {
        let indicator = ctrl.querySelector('.seg-indicator');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'seg-indicator';
          indicator.setAttribute('aria-hidden', 'true');
          ctrl.prepend(indicator);
        }
        const activeBtn = ctrl.querySelector('.seg-btn.active');
        if (activeBtn) {
          indicator.style.left = `${activeBtn.offsetLeft}px`;
          indicator.style.width = `${activeBtn.offsetWidth}px`;
          indicator.style.top = `${activeBtn.offsetTop}px`;
          indicator.style.height = `${activeBtn.offsetHeight}px`;
          indicator.style.opacity = '1';
        } else {
          indicator.style.opacity = '0';
        }
      });
    }

    function syncDrawerControls() {
      if (domElements.framingSlider) {
        domElements.framingSlider.value = String(prefs.workspaceMargin);
      }
      if (domElements.framingValueLabel) {
        domElements.framingValueLabel.textContent = formatMarginLabel(
          prefs.workspaceMargin
        );
      }
      if (domElements.framingSnapBtns) {
        domElements.framingSnapBtns.forEach((btn) => {
          const snapVal = Number(btn.getAttribute('data-framing-snap'));
          btn.classList.toggle(
            'active',
            Math.abs(prefs.workspaceMargin - snapVal) <= 2
          );
        });
      }

      if (domElements.resizePolicyHint) {
        domElements.resizePolicyHint.textContent =
          prefs.resizePolicy === 'guided' ? 'Smart bounds' : 'Wide range';
      }

      if (domElements.globalRoundnessSlider) {
        domElements.globalRoundnessSlider.value = String(prefs.globalRoundness);
      }
      if (domElements.globalRoundnessLabel) {
        const lvl = SHAPE_LEVELS[prefs.globalRoundness] || SHAPE_LEVELS[2];
        domElements.globalRoundnessLabel.textContent = `${lvl.name} (L${lvl.level})`;
      }

      const globalLvl = SHAPE_LEVELS[prefs.globalRoundness] || SHAPE_LEVELS[2];
      const overrideGroups = [
        { select: domElements.panelRoundnessSelect, key: 'panelRoundness', group: 'panels' },
        { select: domElements.buttonRoundnessSelect, key: 'buttonRoundness', group: 'buttons' },
        { select: domElements.inputRoundnessSelect, key: 'inputRoundness', group: 'inputs' },
        { select: domElements.navRoundnessSelect, key: 'navRoundness', group: 'nav' },
        { select: domElements.tableRoundnessSelect, key: 'tableRoundness', group: 'tables' },
        { select: domElements.overlayRoundnessSelect, key: 'overlayRoundness', group: 'overlays' },
      ];

      overrideGroups.forEach(({ select, key, group }) => {
        if (!select) return;
        select.value = prefs[key];
        const isInherited = prefs[key] === 'inherit' || prefs[key] === undefined;
        const inheritOpt = select.querySelector('option[value="inherit"]');
        const effectivePx = calculateComponentRadius(prefs.globalRoundness, group);
        if (inheritOpt) {
          inheritOpt.textContent = `Inherit (${effectivePx})`;
          inheritOpt.title = `Inherits global shape (${effectivePx})`;
        }
        select.title = isInherited
          ? `Inheriting global shape (${effectivePx})`
          : (select.options[select.selectedIndex]?.text || '');
        const item = select.closest('.override-item');
        if (item) {
          item.classList.toggle('is-overridden', !isInherited);
          // Remove any status tags so labels remain clean and spacious without wrapping
          const tag = item.querySelector('.override-status-tag');
          if (tag) tag.remove();
        }
      });

      const isSlick = prefs.motionProfile === 'slick';
      if (domElements.motionSpeedSlider) {
        domElements.motionSpeedSlider.value = String(prefs.motionSpeed);
        domElements.motionSpeedSlider.disabled = isSlick;
        domElements.motionSpeedSlider.closest('.setting-row')?.classList.toggle('setting-disabled', isSlick);
      }
      if (domElements.motionSpeedLabel) {
        if (isSlick) {
          domElements.motionSpeedLabel.textContent = 'Disabled (Instant)';
        } else {
          const speedVal = prefs.motionSpeed;
          const speedTxt = `${speedVal.toFixed(speedVal % 1 === 0 ? 1 : 2)}×`;
          let speedDescriptor = 'Normal';
          if (speedVal <= 0.25) {
            speedDescriptor = 'Ultra-Slow';
          } else if (speedVal < 1.0) {
            speedDescriptor = 'Relaxed';
          } else if (speedVal > 1.0) {
            speedDescriptor = 'Snappy';
          }
          domElements.motionSpeedLabel.textContent = `${speedTxt} ${speedDescriptor}`;
        }
      }

      if (domElements.sqlHistoryRetentionSelect) {
        domElements.sqlHistoryRetentionSelect.value = String(prefs.sqlHistoryRetention || 100);
      }

      // Sync all segmented buttons
      if (domElements.segmentedBtns) {
        domElements.segmentedBtns.forEach((btn) => {
          const key = btn.getAttribute('data-setting');
          const val = btn.getAttribute('data-value');
          const isActive = String(prefs[key]) === val;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-checked', String(isActive));
        });
      }

      updateSegmentedPills();
    }

    function updatePrefs(patch, persist = true) {
      prefs = sanitizePrefs({ ...prefs, ...patch });
      applyToDOM();
      if (persist) {
        saveStoredPrefs(prefs);
      }
      // Live Reset Preview update: immediately refreshes changed diff while reset drop-up is open
      if (domElements.resetConfirmBox && !domElements.resetConfirmBox.classList.contains('hidden')) {
        renderResetDiff();
      }
      if (typeof callbacks.onChange === 'function') {
        callbacks.onChange(prefs);
      }
    }

    function resetToDefaults() {
      // Selective Reset: only reset non-excluded changed settings
      const exclusions = loadResetExclusions();
      const patch = {};
      let resetCount = 0;

      for (const key of Object.keys(DEFAULT_PREFS)) {
        if (key === 'workspaceFraming') continue;
        if (prefs[key] !== DEFAULT_PREFS[key] && !exclusions[key]) {
          patch[key] = DEFAULT_PREFS[key];
          resetCount += 1;
        }
      }

      if (resetCount > 0) {
        updatePrefs(patch);
      } else {
        applyToDOM();
        if (domElements.resetConfirmBox && !domElements.resetConfirmBox.classList.contains('hidden')) {
          renderResetDiff();
        }
      }

      if (typeof callbacks.onReset === 'function') {
        callbacks.onReset(prefs, patch, resetCount);
      }
    }

    // Bind Drawer UI Controls
    if (domElements.framingSlider) {
      domElements.framingSlider.addEventListener('input', (e) => {
        updatePrefs({ workspaceMargin: Number(e.target.value) });
      });
    }

    if (domElements.framingSnapBtns) {
      domElements.framingSnapBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const snapVal = Number(btn.getAttribute('data-framing-snap'));
          // When user clicks Inset or Floating snap preset and panels are still L0/inherit,
          // apply framing immediately so they see the separation cleanly.
          updatePrefs({ workspaceFraming: snapVal });
        });
      });
    }

    if (domElements.segmentedBtns) {
      domElements.segmentedBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-setting');
          const val = btn.getAttribute('data-value');
          if (key && val) {
            updatePrefs({ [key]: val });
          }
        });
      });
    }

    if (domElements.globalRoundnessSlider) {
      domElements.globalRoundnessSlider.addEventListener('input', (e) => {
        updatePrefs({ globalRoundness: Number(e.target.value) });
      });
    }

    if (domElements.workspaceRoundnessSelect) {
      domElements.workspaceRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ workspaceRoundness: e.target.value });
      });
    }

    if (domElements.panelRoundnessSelect) {
      domElements.panelRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ panelRoundness: e.target.value });
      });
    }

    if (domElements.buttonRoundnessSelect) {
      domElements.buttonRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ buttonRoundness: e.target.value });
      });
    }

    if (domElements.inputRoundnessSelect) {
      domElements.inputRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ inputRoundness: e.target.value });
      });
    }

    if (domElements.navRoundnessSelect) {
      domElements.navRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ navRoundness: e.target.value });
      });
    }

    if (domElements.tableRoundnessSelect) {
      domElements.tableRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ tableRoundness: e.target.value });
      });
    }

    if (domElements.overlayRoundnessSelect) {
      domElements.overlayRoundnessSelect.addEventListener('change', (e) => {
        updatePrefs({ overlayRoundness: e.target.value });
      });
    }

    if (domElements.sqlHistoryRetentionSelect) {
      domElements.sqlHistoryRetentionSelect.addEventListener('change', (e) => {
        updatePrefs({ sqlHistoryRetention: Number(e.target.value) });
      });
    }

    if (domElements.clearShapeOverridesBtn) {
      domElements.clearShapeOverridesBtn.addEventListener('click', () => {
        updatePrefs({
          workspaceRoundness: 'inherit',
          panelRoundness: 'inherit',
          buttonRoundness: 'inherit',
          inputRoundness: 'inherit',
          navRoundness: 'inherit',
          tableRoundness: 'inherit',
          overlayRoundness: 'inherit',
        });
      });
    }

    if (domElements.motionSpeedSlider) {
      domElements.motionSpeedSlider.addEventListener('input', (e) => {
        updatePrefs({ motionSpeed: Number(e.target.value) });
      });
    }

    function formatValueForDiff(key, val) {
      if (val === undefined || val === null) {
        if (key === 'floatingSqlPos' || key === 'floatingSidebarPos') {
          return 'Default (Anchored)';
        }
        return 'None';
      }
      if (key === 'floatingSqlPos' || key === 'floatingSidebarPos') {
        if (typeof val === 'object' && val) {
          if (val.width && val.height) {
            return `Custom (${val.width}×${val.height}px)`;
          }
          return 'Custom Position';
        }
        return 'Default (Anchored)';
      }
      if (key === 'sqlExecutionDestination') {
        if (val === 'query') return 'Stay in Query';
        if (val === 'results') return 'Results View';
        if (val === 'split') return 'Split View';
        return String(val);
      }
      if (key === 'sqlAfterExecution') {
        if (val === 'keep') return 'Keep Query';
        if (val === 'clear') return 'Clear Query';
        if (val === 'restrictive') return 'Restrictive';
        return String(val);
      }
      if (key === 'sidebarGlass' || key === 'sqlGlass') {
        return val ? 'Glass (Translucent)' : 'Standard (Solid)';
      }
      if (key === 'sidebarMode' || key === 'sqlMode') {
        return val === 'floating' ? 'Floating' : 'Docked';
      }
      if (key === 'resizePolicy') {
        return val === 'freeform' ? 'Freeform' : 'Guided';
      }
      if (key === 'density') {
        if (val === 'compact') return 'Compact';
        if (val === 'spacious') return 'Spacious';
        return 'Balanced';
      }
      if (key === 'motionProfile') {
        if (val === 'slick') return 'Slick';
        if (val === 'fluid') return 'Fluid';
        return 'Smooth';
      }
      if (key === 'sqlHistoryRetention') {
        return `${val} queries`;
      }
      if (key === 'workspaceMargin' || key === 'workspaceFraming') {
        const num = Number(val);
        return num === 0 ? '0px (Flush)' : `${num}px`;
      }
      if (key === 'globalRoundness') {
        const lvl = SHAPE_LEVELS[Number(val)] || SHAPE_LEVELS[2];
        return `${lvl.name} (L${lvl.level})`;
      }
      if (key === 'motionSpeed') {
        return `${Number(val).toFixed(val % 1 === 0 ? 1 : 2)}×`;
      }
      if (key.endsWith('Roundness')) {
        if (val === 'inherit') return 'Inherit';
        const lvl = SHAPE_LEVELS[Number(val)];
        return lvl ? `L${lvl.level} ${lvl.name}` : String(val);
      }
      if (key === 'sidebarWidth') return `${val}px`;
      if (key === 'sqlPanelHeight') return `${val}px`;
      if (key === 'sidebarCollapsed' || key === 'sqlCollapsed') {
        return val ? 'Collapsed' : 'Expanded';
      }
      if (key === 'sidebarLock' || key === 'sqlLock' || key === 'panelLock') {
        return val ? 'Locked' : 'Unlocked';
      }
      if (typeof val === 'boolean') return val ? 'On' : 'Off';
      if (typeof val === 'string') return val.charAt(0).toUpperCase() + val.slice(1);
      return String(val);
    }

    const SETTING_LABELS = {
      workspaceMargin: 'Workspace Margin',
      workspaceFraming: 'Workspace Margin',
      resizePolicy: 'Resize Policy',
      sidebarGlass: 'Sidebar Glass',
      sqlGlass: 'SQL Editor Glass',
      sidebarMode: 'Sidebar Mode',
      sqlMode: 'SQL Editor Mode',
      sidebarWidth: 'Sidebar Width',
      sidebarCollapsed: 'Sidebar Collapsed',
      sqlPanelHeight: 'SQL Editor Height',
      sqlCollapsed: 'SQL Editor Collapsed',
      sidebarLock: 'Sidebar Lock',
      sqlLock: 'SQL Editor Lock',
      density: 'Density',
      globalRoundness: 'Corner Profile',
      workspaceRoundness: 'Workspace Framing',
      panelRoundness: 'Panels',
      buttonRoundness: 'Buttons & Actions',
      inputRoundness: 'Inputs & Dropdowns',
      navRoundness: 'Navigation & Controls',
      tableRoundness: 'Table Grid & SQL',
      overlayRoundness: 'Floating & Overlays',
      panelLock: 'Panel Lock',
      motionProfile: 'Motion Profile',
      motionSpeed: 'Animation Speed',
      sqlAfterExecution: 'After SQL Execution',
      sqlExecutionDestination: 'SQL Execution Destination',
      sqlHistoryRetention: 'History Retention Limit',
      floatingSqlPos: 'Floating SQL Editor Position',
      floatingSidebarPos: 'Floating Sidebar Position',
    };

    function getSettingLabel(key) {
      if (SETTING_LABELS[key]) return SETTING_LABELS[key];
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    }

    function renderResetDiff() {
      if (!domElements.resetDiffList) return;
      domElements.resetDiffList.innerHTML = '';

      const diffs = [];
      const exclusions = loadResetExclusions();

      for (const key of Object.keys(DEFAULT_PREFS)) {
        if (key === 'workspaceFraming') continue; // Skip alias
        const currentVal = prefs[key];
        const defaultVal = DEFAULT_PREFS[key];
        let hasDiff = currentVal !== defaultVal;
        if (typeof currentVal === 'object' && typeof defaultVal === 'object') {
          hasDiff = JSON.stringify(currentVal) !== JSON.stringify(defaultVal);
        }
        if (hasDiff) {
          diffs.push({
            key,
            label: getSettingLabel(key),
            current: formatValueForDiff(key, currentVal),
            target: formatValueForDiff(key, defaultVal),
          });
        }
      }

      let activeCount = 0;
      let excludedCount = 0;

      if (diffs.length === 0) {
        if (domElements.resetDiffSummary) {
          domElements.resetDiffSummary.textContent = 'All settings match studio defaults';
        }
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'reset-empty-diff';
        emptyDiv.textContent = 'Workspace is already configured to Studio Defaults.';
        domElements.resetDiffList.appendChild(emptyDiv);
        return;
      }

      diffs.forEach((item) => {
        const isExcluded = Boolean(exclusions[item.key]);
        if (isExcluded) {
          excludedCount += 1;
        } else {
          activeCount += 1;
        }

        const row = document.createElement('div');
        row.className = `reset-diff-item${isExcluded ? ' is-excluded' : ''}`;
        row.setAttribute('role', 'checkbox');
        row.setAttribute('aria-checked', String(!isExcluded));
        row.tabIndex = 0;
        row.title = isExcluded ? 'Excluded from reset (click to restore to default)' : 'Included in reset (click to preserve current)';

        row.innerHTML = `
          <span class="reset-diff-check" aria-hidden="true">${isExcluded ? '☐' : '☑'}</span>
          <span class="reset-diff-key">${item.label}</span>
          <span class="reset-diff-vals">
            <span class="reset-diff-current">${item.current}</span>
            <span class="reset-diff-arrow">→</span>
            <span class="reset-diff-target">${item.target}</span>
          </span>
          <span class="reset-diff-badge ${isExcluded ? 'badge-kept' : 'badge-reset'}">${isExcluded ? 'Keep' : 'Reset'}</span>
        `;

        function toggleItem() {
          const nextEx = !Boolean(exclusions[item.key]);
          exclusions[item.key] = nextEx;
          saveResetExclusions(exclusions);
          renderResetDiff();
        }

        row.addEventListener('click', (e) => {
          e.preventDefault();
          toggleItem();
        });

        row.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleItem();
          }
        });

        domElements.resetDiffList.appendChild(row);
      });

      if (domElements.resetDiffSummary) {
        if (activeCount === 0) {
          domElements.resetDiffSummary.textContent = `All ${diffs.length} changed settings preserved (0 will reset)`;
        } else if (excludedCount > 0) {
          domElements.resetDiffSummary.textContent = `${activeCount} will reset · ${excludedCount} preserved`;
        } else {
          domElements.resetDiffSummary.textContent = `${activeCount} setting${activeCount === 1 ? '' : 's'} will be restored`;
        }
      }
    }

    function setResetConfirmOpen(open) {
      if (!domElements.resetConfirmBox) return;
      if (open) {
        renderResetDiff();
        domElements.resetConfirmBox.classList.remove('hidden');
      } else {
        domElements.resetConfirmBox.classList.add('hidden');
      }
    }

    if (domElements.resetCustomizationBtn) {
      domElements.resetCustomizationBtn.addEventListener('click', () => {
        const isCurrentlyOpen = !domElements.resetConfirmBox?.classList.contains('hidden');
        setResetConfirmOpen(!isCurrentlyOpen);
      });
    }

    if (domElements.resetCancelBtn) {
      domElements.resetCancelBtn.addEventListener('click', () => {
        setResetConfirmOpen(false);
      });
    }

    if (domElements.resetConfirmBtn) {
      domElements.resetConfirmBtn.addEventListener('click', () => {
        setResetConfirmOpen(false);
        resetToDefaults();
      });
    }

    // Re-clamp on browser window resize so panels never overflow or overlap
    window.addEventListener('resize', () => {
      applyToDOM();
    });

    // ResizeObserver for dynamic progressive compression when containers change
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        // Suppress ResizeObserver while actively dragging a splitter to eliminate competing layout recalculations
        if (document.body.classList.contains('is-resizing')) return;
        if (prefs.resizePolicy === 'freeform') {
          applyResponsiveCompression();
        }
      });
      if (domElements.appShell) ro.observe(domElements.appShell);
      if (domElements.workspaceBody) ro.observe(domElements.workspaceBody);
      if (domElements.sidebar) ro.observe(domElements.sidebar);
      if (domElements.sqlPanel) ro.observe(domElements.sqlPanel);
      const gp = domElements.gridPane || document.getElementById('gridPane');
      if (gp) ro.observe(gp);
    }

    // Apply initial stored preferences immediately
    applyToDOM();

    return {
      getPrefs() {
        return { ...prefs };
      },
      updatePrefs,
      resetToDefaults,
      renderResetDiff,
      refreshResetDiff() {
        if (domElements.resetConfirmBox && !domElements.resetConfirmBox.classList.contains('hidden')) {
          renderResetDiff();
        }
      },
      clampSidebarWidth(width) {
        const b = getLayoutBounds(prefs.resizePolicy);
        return Math.round(clampNumber(width, b.sidebarMin, b.sidebarMax, prefs.sidebarWidth));
      },
      clampSqlPanelHeight(height) {
        const b = getLayoutBounds(prefs.resizePolicy);
        // Allow dragging down to header height (32px compact, 36px balanced, 40px spacious)
        return Math.round(clampNumber(height, 32, b.sqlMax, prefs.sqlPanelHeight));
      },
      setLiveSidebarWidth(width) {
        const b = getLayoutBounds(prefs.resizePolicy);
        const clamped = Math.round(clampNumber(width, b.sidebarMin, b.sidebarMax, prefs.sidebarWidth));
        prefs.sidebarWidth = clamped;
        document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
        if (prefs.resizePolicy === 'freeform') {
          applyResponsiveCompression({ sidebarWidth: clamped });
        }
        return clamped;
      },
      setLiveSqlPanelHeight(height) {
        const b = getLayoutBounds(prefs.resizePolicy);
        // Allow live dragging down to the header height
        const clamped = Math.round(clampNumber(height, 32, b.sqlMax, prefs.sqlPanelHeight));
        prefs.sqlPanelHeight = clamped;
        document.documentElement.style.setProperty('--sql-panel-height', `${clamped}px`);
        if (prefs.resizePolicy === 'freeform') {
          applyResponsiveCompression({ sqlPanelHeight: clamped });
        }
        return clamped;
      },
      applyResponsiveCompression,
      updateSegmentedPills,
      updateSidebarButtonVector,
      setSavedFloatingSidebar(pos) {
        if (pos) {
          if (pos.left !== undefined) savedFloatingSidebar.left = pos.left;
          if (pos.top !== undefined) savedFloatingSidebar.top = pos.top;
          if (pos.width !== undefined) savedFloatingSidebar.width = pos.width;
          if (pos.height !== undefined) savedFloatingSidebar.height = pos.height;
          updatePrefs({ floatingSidebarPos: { ...savedFloatingSidebar } });
        }
      },
      setSavedFloatingSql(pos) {
        if (pos) {
          if (pos.left !== undefined) savedFloatingSql.left = pos.left;
          if (pos.top !== undefined) savedFloatingSql.top = pos.top;
          if (pos.width !== undefined) savedFloatingSql.width = pos.width;
          if (pos.height !== undefined) savedFloatingSql.height = pos.height;
          updatePrefs({ floatingSqlPos: { ...savedFloatingSql } });
        }
      },
      getSavedFloatingSidebar() {
        return { ...savedFloatingSidebar };
      },
      getSavedFloatingSql() {
        return { ...savedFloatingSql };
      },
    };
  }

  return {
    SHAPE_LEVELS,
    DEFAULT_PREFS,
    createCustomizationController,
  };
})();
