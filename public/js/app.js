// Main application controller
(function () {
  const api = window.RowvaneAPI;
  const Grid = window.RowvaneGrid;
  const Editor = window.RowvaneEditor;
  const Results = window.RowvaneResults;
  const Customization = window.RowvaneCustomization;

  // DOM References
  const dom = {
    appShell: document.getElementById('appShell'),
    topToolbar: document.querySelector('.top-toolbar'),
    workspaceBody: document.getElementById('workspaceBody'),
    sidebar: document.getElementById('sidebar'),
    sidebarResizer: document.getElementById('sidebarResizer'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    gridPane: document.getElementById('gridPane'),
    tableCountBadge: document.getElementById('tableCountBadge'),
    tableList: document.getElementById('tableList'),
    activeTableName: document.getElementById('activeTableName'),

    dbStatusDot: document.getElementById('dbStatusDot'),
    dbStatusText: document.getElementById('dbStatusText'),
    dbStatusPill: document.getElementById('dbStatusPill'),

    refreshTableBtn: document.getElementById('refreshTableBtn'),
    insertRowBtn: document.getElementById('insertRowBtn'),
    deleteRowBtn: document.getElementById('deleteRowBtn'),
    gridUndoBtn: document.getElementById('gridUndoBtn'),
    gridRedoBtn: document.getElementById('gridRedoBtn'),
    importCsvToolbarBtn: document.getElementById('importCsvToolbarBtn'),
    exportCsvToolbarBtn: document.getElementById('exportCsvToolbarBtn'),
    sidebarCsvDropBtn: document.getElementById('sidebarCsvDropBtn'),
    sidebarDragHandle: document.getElementById('sidebarDragHandle'),
    sidebarLockBtn: document.getElementById('sidebarLockBtn'),
    sidebarGlassBtn: document.getElementById('sidebarGlassBtn'),
    sidebarDockBtn: document.getElementById('sidebarDockBtn'),
    sqlDragHandle: document.getElementById('sqlDragHandle'),
    sqlLockBtn: document.getElementById('sqlLockBtn'),
    sqlGlassBtn: document.getElementById('sqlGlassBtn'),
    sqlDockBtn: document.getElementById('sqlDockBtn'),
    sqlPanelCollapseBtn: document.getElementById('sqlPanelCollapseBtn'),

    settingsToggleBtn: document.getElementById('settingsToggleBtn'),
    customizationBackdrop: document.getElementById('customizationBackdrop'),
    customizationDrawer: document.getElementById('customizationDrawer'),
    customizationCloseBtn: document.getElementById('customizationCloseBtn'),

    framingSlider: document.getElementById('framingSlider'),
    framingValueLabel: document.getElementById('framingValueLabel'),
    framingSnapBtns: document.querySelectorAll('[data-framing-snap]'),
    resizePolicyHint: document.getElementById('resizePolicyHint'),
    surfaceMaterialHint: document.getElementById('surfaceMaterialHint'),
    globalRoundnessSlider: document.getElementById('globalRoundnessSlider'),
    globalRoundnessLabel: document.getElementById('globalRoundnessLabel'),
    workspaceRoundnessSelect: document.getElementById('workspaceRoundnessSelect'),
    panelRoundnessSelect: document.getElementById('panelRoundnessSelect'),
    buttonRoundnessSelect: document.getElementById('buttonRoundnessSelect'),
    inputRoundnessSelect: document.getElementById('inputRoundnessSelect'),
    navRoundnessSelect: document.getElementById('navRoundnessSelect'),
    tableRoundnessSelect: document.getElementById('tableRoundnessSelect'),
    overlayRoundnessSelect: document.getElementById('overlayRoundnessSelect'),
    sqlHistoryRetentionSelect: document.getElementById('sqlHistoryRetentionSelect'),
    clearShapeOverridesBtn: document.getElementById('clearShapeOverridesBtn'),
    motionSpeedSlider: document.getElementById('motionSpeedSlider'),
    motionSpeedLabel: document.getElementById('motionSpeedLabel'),
    resetInitialBox: document.getElementById('resetInitialBox'),
    resetConfirmBox: document.getElementById('resetConfirmBox'),
    resetDiffSummary: document.getElementById('resetDiffSummary'),
    resetDiffList: document.getElementById('resetDiffList'),
    resetCustomizationBtn: document.getElementById('resetCustomizationBtn'),
    resetCancelBtn: document.getElementById('resetCancelBtn'),
    resetConfirmBtn: document.getElementById('resetConfirmBtn'),
    segmentedBtns: document.querySelectorAll('.seg-btn[data-setting]'),

    gridRowSummary: document.getElementById('gridRowSummary'),
    gridColSummary: document.getElementById('gridColSummary'),
    gridTimingSummary: document.getElementById('gridTimingSummary'),
    gridSortSummary: document.getElementById('gridSortSummary'),
    gridSyncPill: document.getElementById('gridSyncPill'),
    gridSyncText: document.getElementById('gridSyncText'),
    gridStalePill: document.getElementById('gridStalePill'),
    gridStaleText: document.getElementById('gridStaleText'),
    gridStaleRetryBtn: document.getElementById('gridStaleRetryBtn'),
    cellInspectorPill: document.getElementById('cellInspectorPill'),

    gridViewport: document.getElementById('gridViewport'),
    gridLoadingState: document.getElementById('gridLoadingState'),
    gridErrorState: document.getElementById('gridErrorState'),
    gridErrorTitle: document.getElementById('gridErrorTitle'),
    gridErrorMessage: document.getElementById('gridErrorMessage'),
    gridRetryBtn: document.getElementById('gridRetryBtn'),
    gridEmptyState: document.getElementById('gridEmptyState'),
    sheetGrid: document.getElementById('sheetGrid'),
    sheetGridHead: document.getElementById('sheetGridHead'),
    sheetGridBody: document.getElementById('sheetGridBody'),

    sqlPanel: document.getElementById('sqlPanel'),
    sqlPanelBody: document.getElementById('sqlPanelBody'),
    sqlPanelResizer: document.getElementById('sqlPanelResizer'),
    sqlSplitResizer: document.getElementById('sqlSplitResizer'),
    sqlLineGutter: document.getElementById('sqlLineGutter'),
    sqlEditorInput: document.getElementById('sqlEditorInput'),
    runQueryBtn: document.getElementById('runQueryBtn'),
    cancelQueryBtn: document.getElementById('cancelQueryBtn'),
    sqlStatusText: document.getElementById('sqlStatusText'),

    sqlPanelTabs: document.getElementById('sqlPanelTabs'),
    sqlTabIndicator: document.getElementById('sqlTabIndicator'),
    sqlTabQuery: document.getElementById('sqlTabQuery'),
    sqlTabResults: document.getElementById('sqlTabResults'),
    sqlTabSplit: document.getElementById('sqlTabSplit'),
    sqlTabHistory: document.getElementById('sqlTabHistory'),
    sqlHistoryDrawer: document.getElementById('sqlHistoryDrawer'),
    sqlHistoryList: document.getElementById('sqlHistoryList'),
    clearSqlHistoryBtn: document.getElementById('clearSqlHistoryBtn'),
    closeSqlHistoryBtn: document.getElementById('closeSqlHistoryBtn'),
    sqlResultsBadge: document.getElementById('sqlResultsBadge'),

    sqlResultsWorkspace: document.getElementById('sqlResultsWorkspace'),
    resultsHeaderBar: document.getElementById('resultsHeaderBar'),
    resultsNavTabs: document.getElementById('resultsNavTabs'),
    resultsTimingBadge: document.getElementById('resultsTimingBadge'),
    resultsRowBadge: document.getElementById('resultsRowBadge'),
    resultsIdleState: document.getElementById('resultsIdleState'),
    resultsLoadingState: document.getElementById('resultsLoadingState'),
    resultsCommandState: document.getElementById('resultsCommandState'),
    resultsErrorState: document.getElementById('resultsErrorState'),
    resultsErrorTitle: document.getElementById('resultsErrorTitle'),
    resultsErrorMessage: document.getElementById('resultsErrorMessage'),
    resultsErrorCodeTag: document.getElementById('resultsErrorCodeTag'),
    resultsErrorPosTag: document.getElementById('resultsErrorPosTag'),
    resultsTableViewport: document.getElementById('resultsTableViewport'),
    resultsGrid: document.getElementById('resultsGrid'),
    resultsGridHead: document.getElementById('resultsGridHead'),
    resultsGridBody: document.getElementById('resultsGridBody'),
    resultsEmptyRows: document.getElementById('resultsEmptyRows'),
    resultsExportBtn: document.getElementById('resultsExportBtn'),
    resultsClearBtn: document.getElementById('resultsClearBtn'),
    resultsCommandDismissBtn: document.getElementById('resultsCommandDismissBtn'),

    workspaceToast: document.getElementById('workspaceToast'),

    // Context Breadcrumb Elements
    contextDbName: document.getElementById('contextDbName'),
    contextSchemaName: document.getElementById('contextSchemaName'),
    contextEnvBadge: document.getElementById('contextEnvBadge'),

    // Settings Mode Switcher Controls
    settingModePlaygroundBtn: document.getElementById('settingModePlaygroundBtn'),
    settingModeRealBtn: document.getElementById('settingModeRealBtn'),
    settingEnvHint: document.getElementById('settingEnvHint'),

    // View Navigation Tabs
    viewNavTabs: document.getElementById('viewNavTabs'),
    viewNavIndicator: document.getElementById('viewNavIndicator'),
    viewNavGrid: document.getElementById('viewNavGrid'),
    viewNavExplorer: document.getElementById('viewNavExplorer'),
    viewNavPlayground: document.getElementById('viewNavPlayground'),

    // Explorer & Playground Panes
    explorerPane: document.getElementById('explorerPane'),
    playgroundPane: document.getElementById('playgroundPane'),

    // Backup & Restore Modal Elements
    backupRestoreTriggerBtn: document.getElementById('backupRestoreTriggerBtn'),
    backupRestoreModal: document.getElementById('backupRestoreModal'),
    backupRestoreCloseBtn: document.getElementById('backupRestoreCloseBtn'),
    backupUtilityStatus: document.getElementById('backupUtilityStatus'),
    downloadSqlBackupBtn: document.getElementById('downloadSqlBackupBtn'),
    downloadDumpBackupBtn: document.getElementById('downloadDumpBackupBtn'),
    restoreFileInput: document.getElementById('restoreFileInput'),
    restorePreviewArea: document.getElementById('restorePreviewArea'),
    executeRestoreBtn: document.getElementById('executeRestoreBtn'),

    // CSV Import Modal Elements
    csvImportModal: document.getElementById('csvImportModal'),
    csvFileInput: document.getElementById('csvFileInput'),
    csvDropZone: document.getElementById('csvDropZone'),
    csvPreviewArea: document.getElementById('csvPreviewArea'),
    csvMappingArea: document.getElementById('csvMappingArea'),
    csvExecuteImportBtn: document.getElementById('csvExecuteImportBtn'),
    csvCancelImportBtn: document.getElementById('csvCancelImportBtn'),
    csvModalCancelBtn: document.getElementById('csvModalCancelBtn'),
    csvModeNewTable: document.getElementById('csvModeNewTable'),
    csvModeExistingTable: document.getElementById('csvModeExistingTable'),
    csvTargetTableName: document.getElementById('csvTargetTableName'),
    csvExistingTableSelect: document.getElementById('csvExistingTableSelect'),

    // Row Operations Modal Elements
    insertRowModal: document.getElementById('insertRowModal'),
    insertRowCloseBtn: document.getElementById('insertRowCloseBtn'),
    insertRowCancelBtn: document.getElementById('insertRowCancelBtn'),
    insertRowSubmitBtn: document.getElementById('insertRowSubmitBtn'),
    insertRowFormFields: document.getElementById('insertRowFormFields'),
    insertRowErrorBanner: document.getElementById('insertRowErrorBanner'),
    insertRowModalTitle: document.getElementById('insertRowModalTitle'),
    insertRowModalSubtitle: document.getElementById('insertRowModalSubtitle'),

    deleteRowModal: document.getElementById('deleteRowModal'),
    deleteRowCloseBtn: document.getElementById('deleteRowCloseBtn'),
    deleteRowCancelBtn: document.getElementById('deleteRowCancelBtn'),
    deleteRowConfirmBtn: document.getElementById('deleteRowConfirmBtn'),
    deleteRowConfirmText: document.getElementById('deleteRowConfirmText'),
    deleteRowSummaryBox: document.getElementById('deleteRowSummaryBox'),
    deleteRowErrorBanner: document.getElementById('deleteRowErrorBanner'),

    // Real Database Mode: Connect External DB Elements
    connectDbTriggerBtn: document.getElementById('connectDbTriggerBtn'),
    connectDbModal: document.getElementById('connectDbModal'),
    connectDbCloseBtn: document.getElementById('connectDbCloseBtn'),
    connectDbCancelBtn: document.getElementById('connectDbCancelBtn'),
    connTabParams: document.getElementById('connTabParams'),
    connTabUri: document.getElementById('connTabUri'),
    connParamsPanel: document.getElementById('connParamsPanel'),
    connUriPanel: document.getElementById('connUriPanel'),
    connNickInput: document.getElementById('connNickInput'),
    connHostInput: document.getElementById('connHostInput'),
    connPortInput: document.getElementById('connPortInput'),
    connDbInput: document.getElementById('connDbInput'),
    connUserInput: document.getElementById('connUserInput'),
    connPassInput: document.getElementById('connPassInput'),
    connSslCheck: document.getElementById('connSslCheck'),
    connUriInput: document.getElementById('connUriInput'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    executeConnectBtn: document.getElementById('executeConnectBtn'),
    connTestFeedback: document.getElementById('connTestFeedback'),
    activeConnsList: document.getElementById('activeConnsList'),
  };

  let backupRestoreController = null;
  let importExportController = null;
  const TARGET_STORAGE_KEY = 'rowvane_target_mode';
  let initialTarget = 'default';
  try {
    const savedTarget = localStorage.getItem(TARGET_STORAGE_KEY);
    if (savedTarget === 'playground' || (savedTarget && savedTarget.startsWith('conn_'))) {
      initialTarget = savedTarget;
    }
  } catch (_e) {}

  const appState = {
    target: initialTarget, // 'default' (Real Database) | 'playground' | custom connection ID
    activeView: 'grid', // 'grid' | 'explorer' | 'playground'
    tables: [],
    activeTable: null,
    currentTableColumns: [],
    currentTablePrimaryKeys: [],
    sort: null,
    dir: 'asc',
    toastTimer: null,
    drawerOpen: false,
  };

  let toastRemainingMs = 3200;
  let toastStartTime = 0;
  let isToastHovered = false;

  function dismissToast() {
    if (!dom.workspaceToast) return;
    if (appState.toastTimer) {
      clearTimeout(appState.toastTimer);
      appState.toastTimer = null;
    }
    dom.workspaceToast.classList.add('hidden');
    dom.workspaceToast.style.transform = '';
  }

  function startToastTimer(durationMs) {
    if (appState.toastTimer) clearTimeout(appState.toastTimer);
    toastRemainingMs = durationMs;
    toastStartTime = Date.now();
    appState.toastTimer = setTimeout(() => {
      if (!isToastHovered) {
        dismissToast();
      }
    }, durationMs);
  }

  function showToast(message) {
    if (!dom.workspaceToast) return;
    dom.workspaceToast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button type="button" class="toast-close-btn" aria-label="Dismiss notification">&times;</button>
    `;
    dom.workspaceToast.style.transform = '';
    dom.workspaceToast.classList.remove('hidden');

    const closeBtn = dom.workspaceToast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast();
      });
    }

    startToastTimer(3400);
  }

  if (dom.workspaceToast) {
    dom.workspaceToast.addEventListener('mouseenter', () => {
      isToastHovered = true;
      if (appState.toastTimer) {
        clearTimeout(appState.toastTimer);
        const elapsed = Date.now() - toastStartTime;
        toastRemainingMs = Math.max(800, toastRemainingMs - elapsed);
      }
    });

    dom.workspaceToast.addEventListener('mouseleave', () => {
      isToastHovered = false;
      if (!dom.workspaceToast.classList.contains('hidden')) {
        startToastTimer(toastRemainingMs);
      }
    });

    // Swipe-to-dismiss right gesture
    let swipeStartX = 0;
    let isSwipingToast = false;
    dom.workspaceToast.addEventListener('pointerdown', (e) => {
      swipeStartX = e.clientX;
      isSwipingToast = true;
    });
    window.addEventListener('pointermove', (e) => {
      if (!isSwipingToast || dom.workspaceToast.classList.contains('hidden')) return;
      const dx = e.clientX - swipeStartX;
      if (dx > 0) {
        dom.workspaceToast.style.transform = `translateX(${dx}px)`;
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (!isSwipingToast) return;
      isSwipingToast = false;
      const dx = e.clientX - swipeStartX;
      if (dx > 60) {
        dom.workspaceToast.style.transform = `translateX(${dx + 40}px)`;
        dismissToast();
      } else {
        dom.workspaceToast.style.transform = '';
      }
    });
  }

  function setSyncActivity(active, label = 'Updating…') {
    if (dom.gridSyncPill && dom.gridSyncText) {
      dom.gridSyncText.textContent = label;
      dom.gridSyncPill.classList.toggle('hidden', !active);
    }
    if (dom.refreshTableBtn) {
      dom.refreshTableBtn.classList.toggle('is-spinning', active);
    }
  }

  function setStaleWarning(isStale, message = 'Sync failed') {
    if (!dom.gridStalePill) return;
    if (isStale) {
      if (dom.gridStaleText) dom.gridStaleText.textContent = `Stale data (${message})`;
      dom.gridStalePill.classList.remove('hidden');
    } else {
      dom.gridStalePill.classList.add('hidden');
    }
  }

  function setModalOrigin(modalEl, triggerEl) {
    if (!modalEl) return;
    const trigger = triggerEl || modalEl._lastTriggerEl;
    if (!trigger) return;
    modalEl._lastTriggerEl = trigger;

    const box = modalEl.querySelector('.modal-box');
    if (!box) return;

    const triggerRect = trigger.getBoundingClientRect();
    if (triggerRect.width === 0 && triggerRect.height === 0) {
      box.style.setProperty('--modal-origin-x', '50%');
      box.style.setProperty('--modal-origin-y', '50%');
      return;
    }

    const boxWidth = box.offsetWidth || 650;
    const boxHeight = box.offsetHeight || 420;
    const untransformedBoxLeft = (window.innerWidth - boxWidth) / 2;
    const untransformedBoxTop = (window.innerHeight - boxHeight) / 2;

    const originX = (triggerRect.left + triggerRect.width / 2) - untransformedBoxLeft;
    const originY = (triggerRect.top + triggerRect.height / 2) - untransformedBoxTop;

    box.style.setProperty('--modal-origin-x', `${Math.round(originX)}px`);
    box.style.setProperty('--modal-origin-y', `${Math.round(originY)}px`);
  }

  // --- Database Undo / Redo Manager ---
  const undoStack = [];
  const redoStack = [];
  const MAX_UNDO_STACK = 20;

  function updateUndoRedoUI() {
    if (dom.gridUndoBtn) {
      dom.gridUndoBtn.disabled = undoStack.length === 0;
      const last = undoStack[undoStack.length - 1];
      dom.gridUndoBtn.title = last
        ? `Undo ${last.description || 'last edit'} (⌘Z / Ctrl+Z)`
        : 'Undo last database edit (⌘Z / Ctrl+Z)';
    }
    if (dom.gridRedoBtn) {
      dom.gridRedoBtn.disabled = redoStack.length === 0;
      const next = redoStack[redoStack.length - 1];
      dom.gridRedoBtn.title = next
        ? `Redo ${next.description || 'reverted edit'} (⌘⇧Z / Ctrl+Y)`
        : 'Redo reverted database edit (⌘⇧Z / Ctrl+Y)';
    }
  }

  function recordUndoAction(action) {
    undoStack.push(action);
    if (undoStack.length > MAX_UNDO_STACK) {
      undoStack.shift();
    }
    redoStack.length = 0;
    updateUndoRedoUI();
  }

  async function executeUndo() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();

    try {
      if (action.type === 'cell_edit') {
        await api.updateTableRow(action.tableName, action.pks, { [action.column]: action.oldVal }, action.target);
        redoStack.push(action);
        showToast(`Undid edit in "${action.column}".`);
      } else if (action.type === 'row_insert') {
        await api.deleteTableRow(action.tableName, action.pks, action.target);
        redoStack.push(action);
        showToast(`Undid row insertion in "${action.tableName}".`);
      } else if (action.type === 'row_delete') {
        const res = await api.insertTableRow(action.tableName, action.row, action.target);
        if (res.row) action.row = res.row;
        redoStack.push(action);
        showToast(`Restored deleted row in "${action.tableName}".`);
      }

      if (redoStack.length > MAX_UNDO_STACK) {
        redoStack.shift();
      }

      if (appState.activeTable === action.tableName) {
        loadTableData(action.tableName, { soft: true, activityLabel: 'Refreshing…' });
      }
    } catch (err) {
      showToast(`Cannot undo: ${err.error || err.message || 'Record not found or conflicted.'}`);
    } finally {
      updateUndoRedoUI();
    }
  }

  async function executeRedo() {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();

    try {
      if (action.type === 'cell_edit') {
        await api.updateTableRow(action.tableName, action.pks, { [action.column]: action.newVal }, action.target);
        undoStack.push(action);
        showToast(`Redid edit in "${action.column}".`);
      } else if (action.type === 'row_insert') {
        const res = await api.insertTableRow(action.tableName, action.row, action.target);
        if (res.row) action.row = res.row;
        undoStack.push(action);
        showToast(`Re-inserted row into "${action.tableName}".`);
      } else if (action.type === 'row_delete') {
        await api.deleteTableRow(action.tableName, action.pks, action.target);
        undoStack.push(action);
        showToast(`Re-deleted row from "${action.tableName}".`);
      }

      if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
      }

      if (appState.activeTable === action.tableName) {
        loadTableData(action.tableName, { soft: true, activityLabel: 'Refreshing…' });
      }
    } catch (err) {
      showToast(`Cannot redo: ${err.error || err.message || 'Record conflict.'}`);
    } finally {
      updateUndoRedoUI();
    }
  }

  // Initialize Customization Controller
  const customizationController = Customization.createCustomizationController(
    {
      appShell: dom.appShell,
      topToolbar: dom.topToolbar,
      workspaceBody: dom.workspaceBody,
      sidebar: dom.sidebar,
      gridPane: dom.gridPane,
      sqlPanel: dom.sqlPanel,
      sidebarToggleBtn: dom.sidebarToggleBtn,
      sidebarGlassBtn: dom.sidebarGlassBtn,
      sqlGlassBtn: dom.sqlGlassBtn,
      sidebarDockBtn: dom.sidebarDockBtn,
      sqlDockBtn: dom.sqlDockBtn,
      sidebarLockBtn: dom.sidebarLockBtn,
      sqlLockBtn: dom.sqlLockBtn,
      sqlPanelCollapseBtn: dom.sqlPanelCollapseBtn,
      framingSlider: dom.framingSlider,
      framingValueLabel: dom.framingValueLabel,
      framingSnapBtns: dom.framingSnapBtns,
      resizePolicyHint: dom.resizePolicyHint,
      surfaceMaterialHint: dom.surfaceMaterialHint,
      globalRoundnessSlider: dom.globalRoundnessSlider,
      globalRoundnessLabel: dom.globalRoundnessLabel,
      workspaceRoundnessSelect: dom.workspaceRoundnessSelect,
      panelRoundnessSelect: dom.panelRoundnessSelect,
      buttonRoundnessSelect: dom.buttonRoundnessSelect,
      inputRoundnessSelect: dom.inputRoundnessSelect,
      navRoundnessSelect: dom.navRoundnessSelect,
      tableRoundnessSelect: dom.tableRoundnessSelect,
      overlayRoundnessSelect: dom.overlayRoundnessSelect,
      sqlHistoryRetentionSelect: dom.sqlHistoryRetentionSelect,
      clearShapeOverridesBtn: dom.clearShapeOverridesBtn,
      motionSpeedSlider: dom.motionSpeedSlider,
      motionSpeedLabel: dom.motionSpeedLabel,
      resetInitialBox: dom.resetInitialBox,
      resetConfirmBox: dom.resetConfirmBox,
      resetDiffSummary: dom.resetDiffSummary,
      resetDiffList: dom.resetDiffList,
      resetCustomizationBtn: dom.resetCustomizationBtn,
      resetCancelBtn: dom.resetCancelBtn,
      resetConfirmBtn: dom.resetConfirmBtn,
      segmentedBtns: dom.segmentedBtns,
    },
    {
      onReset(prefs, patch, resetCount) {
        if (patch.sqlCollapsed !== undefined && typeof editorController !== 'undefined' && editorController) {
          editorController.setCollapsed(prefs.sqlCollapsed);
        }
        if (resetCount === 0) {
          showToast('No settings selected for restore.');
        } else {
          showToast(`Restored ${resetCount} setting${resetCount === 1 ? '' : 's'} to studio defaults.`);
        }
      },
    }
  );

  // Initialize Grid Controller
  const gridController = Grid.createGridController(
    {
      viewportEl: dom.gridViewport,
      loadingState: dom.gridLoadingState,
      errorState: dom.gridErrorState,
      errorTitle: dom.gridErrorTitle,
      errorMessage: dom.gridErrorMessage,
      emptyState: dom.gridEmptyState,
      tableEl: dom.sheetGrid,
      theadEl: dom.sheetGridHead,
      tbodyEl: dom.sheetGridBody,
      cellInspectorPill: dom.cellInspectorPill,
    },
    {
      onSortChange(columnName, options = {}) {
        if (!appState.activeTable) return;
        let nextSorts = [];

        if (typeof options === 'string') {
          nextSorts = [{ column: columnName, dir: options }];
        } else if (options && options.shiftKey) {
          const current = Array.isArray(options.currentSorts) ? [...options.currentSorts] : [];
          const idx = current.findIndex((s) => s.column === columnName);
          if (idx === -1) {
            nextSorts = [...current, { column: columnName, dir: 'asc' }];
          } else if (current[idx].dir === 'asc') {
            nextSorts = [...current];
            nextSorts[idx] = { column: columnName, dir: 'desc' };
          } else {
            nextSorts = current.filter((s) => s.column !== columnName);
          }
        } else {
          const current = Array.isArray(options?.currentSorts) ? options.currentSorts : [];
          const existing = current.find((s) => s.column === columnName);
          if (!existing) {
            nextSorts = [{ column: columnName, dir: 'asc' }];
          } else if (existing.dir === 'asc') {
            nextSorts = [{ column: columnName, dir: 'desc' }];
          } else {
            nextSorts = [];
          }
        }

        appState.sorts = nextSorts;
        const sortParam = nextSorts.map((s) => `${s.column}:${s.dir}`).join(',');
        const sortSummary = nextSorts.length
          ? nextSorts.map((s) => `${s.column} (${s.dir.toUpperCase()})`).join(', ')
          : 'Unsorted';

        loadTableData(appState.activeTable, {
          sort: sortParam,
          soft: true,
          activityLabel: nextSorts.length ? `Sorting by ${sortSummary}…` : 'Clearing sort…',
        });
      },
      async onCellSave({ tableName, pks, updates, prevVal, val, onSuccess, onError }) {
        try {
          const res = await api.updateTableRow(tableName, pks, updates, appState.target);
          onSuccess(res.row);
          const colName = Object.keys(updates)[0];

          // Consolidate rapid consecutive edits on the same cell within 2.5s into a single undo unit
          const lastAction = undoStack[undoStack.length - 1];
          const now = Date.now();
          const isSameCell =
            lastAction &&
            lastAction.type === 'cell_edit' &&
            lastAction.tableName === tableName &&
            lastAction.column === colName &&
            lastAction.target === appState.target &&
            JSON.stringify(lastAction.pks) === JSON.stringify(pks) &&
            now - (lastAction.timestamp || 0) < 2500;

          if (isSameCell) {
            lastAction.newVal = val;
            lastAction.timestamp = now;
          } else {
            recordUndoAction({
              type: 'cell_edit',
              tableName,
              pks: { ...pks },
              column: colName,
              oldVal: prevVal,
              newVal: val,
              target: appState.target,
              timestamp: now,
              description: `edit in ${colName}`,
            });
          }
          showToast(`Saved cell update to "${tableName}".`);
        } catch (err) {
          onError(err);
        }
      },
      onRowSelected(row, rowIdx, primaryKeys) {
        if (dom.deleteRowBtn) {
          const hasPk = primaryKeys && primaryKeys.length > 0;
          dom.deleteRowBtn.disabled = !row || !hasPk;
          if (row && !hasPk) {
            dom.deleteRowBtn.title = 'Cannot delete rows without a primary key';
          } else {
            dom.deleteRowBtn.title = row ? 'Delete the selected row' : 'Select a row to delete';
          }
        }
      },
      onToast(msg) {
        showToast(msg);
      },
    }
  );

  // Initialize Bottom SQL Editor Shell Controller
  const editorController = Editor.createEditorController(
    {
      panelEl: dom.sqlPanel,
      resizerEl: dom.sqlPanelResizer,
      gutterEl: dom.sqlLineGutter,
      textareaEl: dom.sqlEditorInput,
      runBtnEl: dom.runQueryBtn,
    },
    {
      clampHeight(rawHeight) {
        return customizationController.clampSqlPanelHeight(rawHeight);
      },
      onHeightChange(clampedHeight) {
        customizationController.setLiveSqlPanelHeight(clampedHeight);
      },
      onHeightCommit(clampedHeight) {
        if (clampedHeight > 36) {
          customizationController.updatePrefs({ sqlPanelHeight: clampedHeight });
        } else {
          customizationController.setLiveSqlPanelHeight(clampedHeight);
        }
      },
      onCollapseChange(collapsed) {
        customizationController.updatePrefs({ sqlCollapsed: Boolean(collapsed) });
        customizationController.refreshResetDiff();
      },
      onRunRequested(text) {
        executeSqlQuery(text);
      },
    }
  );

  // Initialize SQL Results Panel Controller
  const resultsController = Results.createResultsController(
    {
      containerEl: dom.sqlResultsWorkspace,
      headerBar: dom.resultsHeaderBar,
      navTabs: dom.resultsNavTabs,
      timingBadge: dom.resultsTimingBadge,
      rowBadge: dom.resultsRowBadge,
      exportBtn: dom.resultsExportBtn,
      clearBtn: dom.resultsClearBtn,
      commandDismissBtn: dom.resultsCommandDismissBtn,
      idleState: dom.resultsIdleState,
      loadingState: dom.resultsLoadingState,
      commandState: dom.resultsCommandState,
      errorState: dom.resultsErrorState,
      errorTitle: dom.resultsErrorTitle,
      errorMessage: dom.resultsErrorMessage,
      errorCodeTag: dom.resultsErrorCodeTag,
      errorPosTag: dom.resultsErrorPosTag,
      tableViewport: dom.resultsTableViewport,
      gridHead: dom.resultsGridHead,
      gridBody: dom.resultsGridBody,
      emptyRowsNotice: dom.resultsEmptyRows,
      countBadgeEl: dom.sqlResultsBadge,
      statusTextEl: dom.sqlStatusText,
    },
    {
      onExport(res, filename) {
        const rowCount = Array.isArray(res.rows) ? res.rows.length : 0;
        const cappedNote = res.truncated ? ' (capped at query limit)' : '';
        showToast(
          `Exported ${rowCount.toLocaleString()} row${rowCount === 1 ? '' : 's'}${cappedNote} to ${filename}`
        );
      },
      onCountBadgeChange() {
        updateSqlTabIndicator();
      },
      onClear() {
        showToast('SQL results cleared.');
      },
    }
  );
  resultsController.setIdle();

  // SQL Panel View Mode Switching (Split, Query, Results, History)
  let lastActiveSqlView = 'query';

  function updateSqlTabIndicator() {
    if (!dom.sqlPanelTabs || !dom.sqlTabIndicator) return;
    const activeTab = dom.sqlPanelTabs.querySelector('.sql-tab.active');
    if (!activeTab) {
      dom.sqlTabIndicator.style.opacity = '0';
      dom.sqlPanelTabs.classList.remove('has-indicator');
      return;
    }
    const navRect = dom.sqlPanelTabs.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const left = tabRect.left - navRect.left;
    const width = tabRect.width;

    dom.sqlTabIndicator.style.transform = `translateX(${left}px)`;
    dom.sqlTabIndicator.style.width = `${width}px`;
    dom.sqlTabIndicator.style.opacity = '1';
    dom.sqlPanelTabs.classList.add('has-indicator');
  }

  // Observe SQL tab resizing (badge appear/disappear) to ensure indicator stays aligned
  if (typeof ResizeObserver !== 'undefined' && dom.sqlPanelTabs) {
    const tabsObserver = new ResizeObserver(() => {
      updateSqlTabIndicator();
    });
    tabsObserver.observe(dom.sqlPanelTabs);
    [dom.sqlTabQuery, dom.sqlTabResults, dom.sqlTabSplit, dom.sqlTabHistory].forEach((tab) => {
      if (tab) tabsObserver.observe(tab);
    });
  }

  // Smooth frame-by-frame indicator tracking during results badge transitions
  dom.sqlResultsBadge?.addEventListener('transitionrun', () => {
    let animId;
    const track = () => {
      updateSqlTabIndicator();
      animId = requestAnimationFrame(track);
    };
    animId = requestAnimationFrame(track);
    const stop = () => {
      cancelAnimationFrame(animId);
      updateSqlTabIndicator();
      dom.sqlResultsBadge?.removeEventListener('transitionend', stop);
      dom.sqlResultsBadge?.removeEventListener('transitioncancel', stop);
    };
    dom.sqlResultsBadge?.addEventListener('transitionend', stop);
    dom.sqlResultsBadge?.addEventListener('transitioncancel', stop);
    setTimeout(stop, 350);
  });

  function updateHistoryBackButton() {
    if (!dom.closeSqlHistoryBtn) return;
    const span = dom.closeSqlHistoryBtn.querySelector('span');
    const targetLabel = lastActiveSqlView === 'query'
      ? 'Back to Query'
      : (lastActiveSqlView === 'results' ? 'Back to Results' : 'Back to Split');
    if (span) {
      span.textContent = targetLabel;
    }
    dom.closeSqlHistoryBtn.setAttribute('title', targetLabel);
  }

  function setSqlViewMode(viewMode) {
    if (!dom.sqlPanel) return;
    if (viewMode !== 'history') {
      lastActiveSqlView = viewMode;
      toggleSqlHistory(false);
    }
    dom.sqlPanel.setAttribute('data-view', viewMode);
    dom.sqlTabQuery?.classList.toggle('active', viewMode === 'query');
    dom.sqlTabResults?.classList.toggle('active', viewMode === 'results');
    dom.sqlTabSplit?.classList.toggle('active', viewMode === 'split');
    dom.sqlTabHistory?.classList.toggle('active', viewMode === 'history');
    dom.sqlTabQuery?.setAttribute('aria-selected', String(viewMode === 'query'));
    dom.sqlTabResults?.setAttribute('aria-selected', String(viewMode === 'results'));
    dom.sqlTabSplit?.setAttribute('aria-selected', String(viewMode === 'split'));
    dom.sqlTabHistory?.setAttribute('aria-selected', String(viewMode === 'history'));

    updateSqlTabIndicator();

    if (viewMode === 'history') {
      updateHistoryBackButton();
      toggleSqlHistory(true);
    }
  }

  dom.sqlTabQuery?.addEventListener('click', () => setSqlViewMode('query'));
  dom.sqlTabResults?.addEventListener('click', () => setSqlViewMode('results'));
  dom.sqlTabSplit?.addEventListener('click', () => setSqlViewMode('split'));
  dom.sqlTabHistory?.addEventListener('click', () => {
    const isCurrentlyHistory = dom.sqlHistoryDrawer && !dom.sqlHistoryDrawer.classList.contains('hidden');
    if (isCurrentlyHistory) {
      setSqlViewMode(lastActiveSqlView || 'query');
    } else {
      setSqlViewMode('history');
    }
  });
  dom.closeSqlHistoryBtn?.addEventListener('click', () => setSqlViewMode(lastActiveSqlView || 'query'));

  // --- SQL Editor / Results Draggable Split Resizer ---
  (function initSqlSplitResizer() {
    if (!dom.sqlSplitResizer || !dom.sqlPanelBody) return;
    const resizer = dom.sqlSplitResizer;
    const body = dom.sqlPanelBody;

    const SAVED_RATIO_KEY = 'rowvane_sql_split_ratio';
    let savedRatio = parseFloat(localStorage.getItem(SAVED_RATIO_KEY));
    if (isNaN(savedRatio) || savedRatio < 0.2 || savedRatio > 0.8) {
      savedRatio = 0.5;
    }
    body.style.setProperty('--sql-split-ratio', `${(savedRatio * 100).toFixed(2)}%`);

    let isDragging = false;
    let activePointerId = null;

    function onPointerMove(e) {
      if (!isDragging) return;
      const rect = body.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawRatio = (e.clientX - rect.left) / rect.width;
      const minRatio = Math.max(0.18, 200 / rect.width);
      const maxRatio = Math.min(0.82, 1 - (220 / rect.width));
      const clampedRatio = Math.min(Math.max(rawRatio, minRatio), maxRatio);

      body.style.setProperty('--sql-split-ratio', `${(clampedRatio * 100).toFixed(2)}%`);
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing');

      if (activePointerId !== null) {
        try {
          if (resizer.hasPointerCapture(activePointerId)) {
            resizer.releasePointerCapture(activePointerId);
          }
        } catch (_e) {}
        activePointerId = null;
      }

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const rect = body.getBoundingClientRect();
      if (rect.width > 0) {
        const currentRatio = parseFloat(body.style.getPropertyValue('--sql-split-ratio')) / 100;
        if (!isNaN(currentRatio)) {
          localStorage.setItem(SAVED_RATIO_KEY, String(currentRatio));
        }
      }
    }

    resizer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging = true;
      activePointerId = e.pointerId;
      try {
        resizer.setPointerCapture(e.pointerId);
      } catch (_e) {}

      resizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing');

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });

    resizer.addEventListener('dblclick', () => {
      body.style.setProperty('--sql-split-ratio', '50%');
      localStorage.setItem(SAVED_RATIO_KEY, '0.5');
      showToast('SQL workspace split reset to 50/50 balance.');
    });

    resizer.addEventListener('keydown', (e) => {
      let current = parseFloat(body.style.getPropertyValue('--sql-split-ratio')) || 50;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(20, current - 5);
        body.style.setProperty('--sql-split-ratio', `${next}%`);
        localStorage.setItem(SAVED_RATIO_KEY, String(next / 100));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(80, current + 5);
        body.style.setProperty('--sql-split-ratio', `${next}%`);
        localStorage.setItem(SAVED_RATIO_KEY, String(next / 100));
      }
    });
  })();

  // --- SQL Query History Storage & Drawer ---
  const SQL_HISTORY_KEY = 'rowvane_sql_history';

  function saveQueryToHistory(sql, success, durationMs = 0, rowCount = 0) {
    if (!sql || !sql.trim()) return;
    try {
      let history = [];
      const stored = localStorage.getItem(SQL_HISTORY_KEY);
      if (stored) {
        history = JSON.parse(stored);
      }
      if (!Array.isArray(history)) history = [];

      if (history.length > 0 && history[0].sql.trim() === sql.trim()) {
        history[0].timestamp = new Date().toISOString();
        history[0].success = success;
        history[0].durationMs = durationMs;
        history[0].rowCount = rowCount;
      } else {
        history.unshift({
          id: Date.now(),
          sql: sql.trim(),
          success,
          durationMs,
          rowCount,
          timestamp: new Date().toISOString(),
        });
      }

      const maxRetention = Number(customizationController?.getPrefs?.().sqlHistoryRetention) || 100;
      if (history.length > maxRetention) history = history.slice(0, maxRetention);
      localStorage.setItem(SQL_HISTORY_KEY, JSON.stringify(history));
    } catch (_e) {}
  }

  function renderSqlHistory() {
    if (!dom.sqlHistoryList) return;
    try {
      const stored = localStorage.getItem(SQL_HISTORY_KEY);
      const history = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(history) || history.length === 0) {
        dom.sqlHistoryList.innerHTML = `<div class="sql-history-empty">No queries in history yet. Execute a query with ⌘↵ to see it here.</div>`;
        return;
      }

      dom.sqlHistoryList.innerHTML = '';
      history.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'sql-history-item';

        const d = new Date(item.timestamp);
        const timeStr = isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        el.innerHTML = `
          <div class="sql-history-top">
            <span class="sql-history-time">${escapeHtml(timeStr)} · ${item.durationMs || 0}ms</span>
            <span class="sql-history-badge ${item.success ? 'badge-success' : 'badge-error'}">${item.success ? 'SUCCESS' : 'ERROR'}</span>
          </div>
          <div class="sql-history-sql">${escapeHtml(item.sql)}</div>
        `;

        el.addEventListener('click', () => {
          if (dom.sqlEditorInput) {
            dom.sqlEditorInput.value = item.sql;
            dom.sqlEditorInput.dispatchEvent(new Event('input'));
            showToast('Loaded query from history into editor.');
            setSqlViewMode(lastActiveSqlView || 'split');
          }
        });

        dom.sqlHistoryList.appendChild(el);
      });
    } catch (_e) {
      dom.sqlHistoryList.innerHTML = `<div class="sql-history-empty">Failed to load history.</div>`;
    }
  }

  function toggleSqlHistory(forceState = null) {
    if (!dom.sqlHistoryDrawer) return;
    const shouldOpen = forceState !== null ? forceState : dom.sqlHistoryDrawer.classList.contains('hidden');
    dom.sqlHistoryDrawer.classList.toggle('hidden', !shouldOpen);
    dom.sqlTabHistory?.classList.toggle('active', shouldOpen);

    if (shouldOpen) {
      renderSqlHistory();
    }
  }

  dom.clearSqlHistoryBtn?.addEventListener('click', () => {
    localStorage.removeItem(SQL_HISTORY_KEY);
    renderSqlHistory();
    showToast('Query history cleared.');
  });

  // Live SQL Query Execution Controller
  let isExecutingSql = false;
  let currentExecutingQueryId = null;

  dom.cancelQueryBtn?.addEventListener('click', async () => {
    if (!currentExecutingQueryId) return;
    try {
      if (dom.cancelQueryBtn) {
        dom.cancelQueryBtn.disabled = true;
        dom.cancelQueryBtn.textContent = 'Cancelling…';
      }
      await api.cancelQuery(currentExecutingQueryId, null, appState.target);
      showToast('Query cancellation signal sent.');
    } catch (err) {
      showToast('Failed to cancel query: ' + (err.message || err));
    }
  });

  async function executeSqlQuery(sqlTarget, targetOverride, options = {}) {
    if (isExecutingSql) return;
    const targetPayload = (typeof sqlTarget === 'object' && sqlTarget !== null)
      ? sqlTarget
      : { sql: (typeof sqlTarget === 'string' ? sqlTarget : dom.sqlEditorInput?.value || ''), isSelection: false };

    const sql = (targetPayload.sql || '').trim();
    if (!sql) {
      showToast('SQL editor is empty. Enter a query to run.');
      return;
    }

    const target = targetOverride || appState.target;
    isExecutingSql = true;
    currentExecutingQueryId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Show Cancel button
    if (dom.cancelQueryBtn) {
      dom.cancelQueryBtn.classList.remove('hidden');
      dom.cancelQueryBtn.disabled = false;
      dom.cancelQueryBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M2 2l8 8M10 2L2 10" />
        </svg>
        <span>Cancel</span>`;
    }

    // Loading indicator on Run button
    if (dom.runQueryBtn) {
      dom.runQueryBtn.disabled = true;
      dom.runQueryBtn.classList.add('is-running');
      dom.runQueryBtn.setAttribute('aria-busy', 'true');
      dom.runQueryBtn.dataset.originalHtml = dom.runQueryBtn.innerHTML;
      dom.runQueryBtn.innerHTML = '<span class="run-spinner" aria-hidden="true"></span> <span>Running…</span>';
    }

    // Auto-uncollapse SQL panel if currently collapsed
    if (dom.sqlPanel?.classList.contains('collapsed')) {
      editorController.setCollapsed(false);
    }

    resultsController.setLoading();

    try {
      const response = await api.executeQuery(sql, target, currentExecutingQueryId);
      resultsController.setResults(response);
      const totalResults = response.results?.length || 0;
      saveQueryToHistory(sql, true, response.totalDurationMs || 0, totalResults);

      // Route execution destination view on success according to options or user preference
      const destination = options?.forcedDestination || customizationController?.getPrefs?.().sqlExecutionDestination || 'split';
      if (destination === 'results') {
        setSqlViewMode('results');
      } else if (destination === 'split') {
        setSqlViewMode('split');
      } else if (destination === 'query') {
        setSqlViewMode('query');
      }

      // Apply query clearance setting on success
      const afterExec = customizationController?.getPrefs?.().sqlAfterExecution || 'keep';
      if (afterExec === 'clear') {
        editorController.clearQuery();
      } else if (afterExec === 'restrictive' && targetPayload.isSelection) {
        editorController.clearExecutedTarget(targetPayload);
      } else if (targetPayload.isSelection) {
        editorController.restoreSelection(targetPayload.selectionStart, targetPayload.selectionEnd);
      }

      if (response.rolledBackUnfinishedTx) {
        showToast('Notice: Unfinished explicit transaction was automatically rolled back.');
      } else {
        const selNotice = targetPayload.isSelection ? ' (selection)' : '';
        showToast(
          totalResults > 1
            ? `Executed ${totalResults} statements successfully${selNotice}.`
            : `Query executed successfully${selNotice}.`
        );
      }

      // If DDL/DML was executed, refresh tables to update row counts and schema changes
      if (
        /^\s*(CREATE|DROP|ALTER|TRUNCATE|INSERT|DELETE|UPDATE)\b/i.test(sql)
      ) {
        initWorkspace(true);
        if (playgroundController) {
          playgroundController.loadStatus();
        }
      }
    } catch (err) {
      console.error('[sql-query-error]', err);
      saveQueryToHistory(sql, false, 0, 0);
      resultsController.setError(err);
      showToast(err.message || 'SQL execution failed.');
      // On error: preserve selection if selection was executed
      if (targetPayload.isSelection) {
        editorController.restoreSelection(targetPayload.selectionStart, targetPayload.selectionEnd);
      }
    } finally {
      isExecutingSql = false;
      currentExecutingQueryId = null;
      if (dom.cancelQueryBtn) {
        dom.cancelQueryBtn.classList.add('hidden');
      }
      if (dom.runQueryBtn) {
        dom.runQueryBtn.disabled = false;
        dom.runQueryBtn.classList.remove('is-running');
        dom.runQueryBtn.removeAttribute('aria-busy');
        if (dom.runQueryBtn.dataset.originalHtml) {
          dom.runQueryBtn.innerHTML = dom.runQueryBtn.dataset.originalHtml;
        }
      }
    }
  }

  if (customizationController.getPrefs().sqlCollapsed) {
    editorController.setCollapsed(true);
  }

  // Initialize Sidebar Horizontal Drag Resizer
  (function initSidebarResizer() {
    if (!dom.sidebarResizer || !dom.sidebar) return;
    let isDragging = false;
    let startX = 0;
    let startWidth = 236;
    let activePointerId = null;
    let rafId = null;
    let pendingWidth = null;

    function applySidebarWidth(nextWidth, commit = false) {
      const clamped = customizationController.setLiveSidebarWidth(nextWidth);
      if (dom.sidebar && dom.sidebar.style.width && !dom.sidebar.classList.contains('is-floating-panel')) {
        dom.sidebar.style.width = '';
      }
      if (commit) {
        customizationController.updatePrefs({ sidebarWidth: clamped });
      }
    }

    function stopDragging(e, commit = true) {
      if (!isDragging) return;
      isDragging = false;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pendingWidth = null;

      if (activePointerId !== null && dom.sidebarResizer) {
        try {
          if (dom.sidebarResizer.hasPointerCapture(activePointerId)) {
            dom.sidebarResizer.releasePointerCapture(activePointerId);
          }
        } catch (_err) {}
        activePointerId = null;
      }

      dom.sidebarResizer.classList.remove('dragging');
      document.body.classList.remove('is-resizing');
      document.body.style.cursor = '';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);

      if (commit && e) {
        const deltaX = e.clientX - startX;
        applySidebarWidth(startWidth + deltaX, true);
      }
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      pendingWidth = startWidth + deltaX;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (isDragging && pendingWidth !== null) {
            applySidebarWidth(pendingWidth, false);
          }
        });
      }
    }

    function onPointerUp(e) {
      stopDragging(e, true);
    }

    function onPointerCancel() {
      stopDragging(null, false);
    }

    function onWindowBlur() {
      stopDragging(null, false);
    }

    dom.sidebarResizer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (isDragging) {
        stopDragging(null, false);
      }
      isDragging = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startWidth = dom.sidebar.getBoundingClientRect().width;

      try {
        dom.sidebarResizer.setPointerCapture(e.pointerId);
      } catch (_err) {}

      dom.sidebarResizer.classList.add('dragging');
      document.body.classList.add('is-resizing');
      document.body.style.cursor = 'ew-resize';

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('blur', onWindowBlur);
    });

    dom.sidebarResizer.addEventListener('keydown', (e) => {
      const current = dom.sidebar.getBoundingClientRect().width;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        applySidebarWidth(current + 20, true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        applySidebarWidth(current - 20, true);
      }
    });
  })();

  // Compute untransformed transform-origin for the customization drawer,
  // guaranteeing it emerges from and returns to the exact center of settingsToggleBtn
  function updateDrawerOrigin() {
    if (!dom.settingsToggleBtn || !dom.customizationDrawer) return;
    const btnRect = dom.settingsToggleBtn.getBoundingClientRect();
    const btnCenter = btnRect.left + btnRect.width / 2;
    // Drawer is anchored at right: 12px.
    // Distance from the right edge of the viewport to the button center:
    const btnFromRight = window.innerWidth - btnCenter;
    // Distance from the right edge of the drawer to the button center:
    const offsetFromDrawerRight = Math.max(6, Math.round(btnFromRight - 12));
    dom.customizationDrawer.style.setProperty(
      '--drawer-origin-x',
      `calc(100% - ${offsetFromDrawerRight}px)`
    );
    dom.customizationDrawer.style.setProperty('--drawer-origin-y', '0px');
  }

  // Customization Center Drawer Open / Close
  function setCustomizationDrawerOpen(open) {
    appState.drawerOpen = Boolean(open);
    if (appState.drawerOpen) {
      updateDrawerOrigin();
      syncOperatingModeControls();
      requestAnimationFrame(() => {
        customizationController.updateSegmentedPills?.();
      });
    } else {
      document.querySelectorAll('.override-info-panel').forEach((panel) => {
        panel.classList.add('hidden');
      });
      document.querySelectorAll('.override-info-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-expanded', 'false');
      });
    }
    dom.customizationDrawer?.classList.toggle('hidden', !appState.drawerOpen);
    dom.customizationBackdrop?.classList.toggle('hidden', !appState.drawerOpen);
    dom.settingsToggleBtn?.classList.toggle('active', appState.drawerOpen);
    dom.settingsToggleBtn?.setAttribute(
      'aria-expanded',
      String(appState.drawerOpen)
    );
  }

  dom.settingsToggleBtn?.addEventListener('click', () => {
    setCustomizationDrawerOpen(!appState.drawerOpen);
  });

  dom.customizationCloseBtn?.addEventListener('click', () => {
    setCustomizationDrawerOpen(false);
  });

  dom.customizationBackdrop?.addEventListener('click', () => {
    setCustomizationDrawerOpen(false);
  });

  // Component Group Overrides explanation toggles
  document.querySelectorAll('.override-info-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-info-target');
      if (!targetId) return;
      const targetPanel = document.getElementById(targetId);
      if (!targetPanel) return;
      const isCurrentlyOpen = !targetPanel.classList.contains('hidden');

      // Close all other panels for clean accordion focus
      document.querySelectorAll('.override-info-panel').forEach((panel) => {
        panel.classList.add('hidden');
      });
      document.querySelectorAll('.override-info-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-expanded', 'false');
      });

      if (!isCurrentlyOpen) {
        targetPanel.classList.remove('hidden');
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  async function refreshHealthStatus() {
    try {
      const health = await api.getHealth(appState.target);
      const dbInfo = health.db || {};
      dom.dbStatusDot.className = 'status-dot status-online';
      dom.dbStatusText.textContent = `${dbInfo.database || 'rowvane'} · ${
        dbInfo.latencyMs ?? 0
      }ms`;
      dom.dbStatusPill.title = `${dbInfo.version || 'PostgreSQL'} (user: ${
        dbInfo.user || 'unknown'
      })`;
      if (dbInfo.database) {
        appState.activeDatabase = dbInfo.database;
      }
      updateContextBreadcrumb();
    } catch (err) {
      dom.dbStatusDot.className = 'status-dot status-offline';
      dom.dbStatusText.textContent = 'DB Offline';
      dom.dbStatusPill.title = err.message;
    }
  }

  function renderSidebarTables() {
    dom.tableList.innerHTML = '';
    dom.tableCountBadge.textContent = String(appState.tables.length);

    appState.tables.forEach((tbl) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `table-item${
        tbl.name === appState.activeTable ? ' active' : ''
      }`;
      btn.setAttribute('role', 'option');
      btn.setAttribute(
        'aria-selected',
        tbl.name === appState.activeTable ? 'true' : 'false'
      );

      btn.innerHTML = `
        <span class="table-item-left">
          <svg class="table-item-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
            <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" stroke-width="1.25"/>
            <line x1="6" y1="6" x2="6" y2="13.5" stroke="currentColor" stroke-width="1.25"/>
          </svg>
          <span class="table-item-name"></span>
        </span>
        <span class="table-item-count"></span>
      `;

      btn.querySelector('.table-item-name').textContent = tbl.name;
      btn.querySelector('.table-item-count').textContent = String(tbl.rowCount);
      btn.title = `${tbl.name} (${tbl.rowCount} rows)`;

      btn.addEventListener('click', () => {
        if (appState.activeTable === tbl.name) return;
        selectTable(tbl.name);
      });

      li.appendChild(btn);
      dom.tableList.appendChild(li);
    });
  }

  /**
   * Loads table rows without abrupt full-grid blinking when rows are already visible.
   * Preserves existing rows if a refresh or sort fails.
   */
  async function loadTableData(tableName, options = {}) {
    const useSoftUpdate = Boolean(options.soft) || gridController.hasData();
    appState.activeTable = tableName;
    updateContextBreadcrumb();

    if (useSoftUpdate) {
      gridController.showLoading(true);
      setSyncActivity(true, options.activityLabel || 'Syncing…');
    } else {
      gridController.showLoading(false);
      dom.gridRowSummary.textContent = 'Loading rows…';
      if (dom.gridTimingSummary) dom.gridTimingSummary.textContent = '—';
    }

    const effectiveSort =
      options.sort !== undefined
        ? options.sort
        : Array.isArray(appState.sorts) && appState.sorts.length > 0
        ? appState.sorts.map((s) => `${s.column}:${s.dir}`).join(',')
        : undefined;

    try {
      const payload = await api.getTableRows(tableName, {
        ...options,
        sort: effectiveSort,
        target: appState.target,
      });

      // Explicitly distinguish visible/fetched rows vs total table records in PostgreSQL
      dom.gridRowSummary.textContent = `Fetched ${payload.rowCount} of ${payload.totalRows} total rows`;
      dom.gridColSummary.textContent = `${payload.columns.length} columns`;
      if (dom.gridTimingSummary) {
        dom.gridTimingSummary.textContent = `Query: ${payload.executionMs}ms (server fetch + parse)`;
      }
      if (Array.isArray(payload.sorts) && payload.sorts.length > 0) {
        dom.gridSortSummary.textContent = `Sorted by ${payload.sorts
          .map((s) => `${s.column} (${s.dir.toUpperCase()})`)
          .join(', ')}`;
      } else if (payload.sort) {
        dom.gridSortSummary.textContent = `Sorted by ${payload.sort} (${(payload.dir || 'asc').toUpperCase()})`;
      } else {
        dom.gridSortSummary.textContent = 'Unsorted';
      }

      setStaleWarning(false);
      appState.currentTableColumns = payload.columns || [];
      appState.currentTablePrimaryKeys = payload.primaryKeys || [];
      gridController.renderData(payload);
    } catch (err) {
      gridController.clearSoftLoading();
      if (gridController.hasData()) {
        // Keep existing usable rows visible, but visibly flag that data may be stale
        setStaleWarning(true, err.message || 'fetch failed');
        showToast(`Could not refresh "${tableName}": ${err.message}. Showing previous data.`);
      } else {
        dom.gridRowSummary.textContent = 'Error loading rows';
        if (dom.gridTimingSummary) dom.gridTimingSummary.textContent = '—';
        setStaleWarning(false);
        gridController.showError(
          `Could not load "${tableName}"`,
          err.message || 'Database query failed'
        );
      }
    } finally {
      setSyncActivity(false);
    }
  }

  function selectTable(tableName) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.removeAllRanges();
    }
    appState.activeTable = tableName;
    appState.sort = null;
    appState.dir = 'asc';
    renderSidebarTables();
    updateContextBreadcrumb();
    loadTableData(tableName, {
      soft: gridController.hasData(),
      activityLabel: `Loading ${tableName}…`,
    });
  }

  async function initWorkspace() {
    refreshHealthStatus();

    try {
      gridController.showLoading(false);
      const data = await api.getTables(appState.target);
      appState.tables = data.tables || [];
      if (data.database) {
        appState.activeDatabase = data.database;
      }
      renderSidebarTables();

      if (appState.tables.length > 0) {
        const tableToSelect =
          appState.activeTable && appState.tables.some((t) => t.name === appState.activeTable)
            ? appState.activeTable
            : appState.tables[0].name;
        selectTable(tableToSelect);
      } else {
        appState.activeTable = null;
        updateContextBreadcrumb();
        dom.gridRowSummary.textContent = '0 tables in schema';
        gridController.renderData({ table: null, columns: [], rows: [] });
      }
      updateViewNavIndicator();
      updateUndoRedoUI();
    } catch (err) {
      gridController.showError(
        'Failed to fetch database tables',
        err.message || 'Ensure PostgreSQL is running and seeded.'
      );
    }
  }

  // UI Event Listeners
  dom.sidebarToggleBtn.addEventListener('click', () => {
    if (dom.sidebar) {
      dom.sidebar.style.removeProperty('transform');
      dom.sidebar.style.removeProperty('transition');
      dom.sidebar.style.removeProperty('transform-origin');
    }
    customizationController.updateSidebarButtonVector?.();
    const currentPrefs = customizationController.getPrefs();
    customizationController.updatePrefs({
      sidebarCollapsed: !currentPrefs.sidebarCollapsed,
    });
  });

  // Panel Modularity Controls: Per-Panel Lock/Unlock, Drag-to-Reposition, Dock/Float, Glass Material
  dom.sidebarLockBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextLocked = !currentPrefs.sidebarLock;
    customizationController.updatePrefs({ sidebarLock: nextLocked });
    showToast(nextLocked ? 'Sidebar position locked' : 'Sidebar position unlocked');
    customizationController.refreshResetDiff();
  });

  dom.sqlLockBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextLocked = !currentPrefs.sqlLock;
    customizationController.updatePrefs({ sqlLock: nextLocked });
    showToast(nextLocked ? 'SQL Editor position locked' : 'SQL Editor position unlocked');
    customizationController.refreshResetDiff();
  });

  dom.sidebarGlassBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextGlass = !currentPrefs.sidebarGlass;
    customizationController.updatePrefs({ sidebarGlass: nextGlass });
    dom.sidebarGlassBtn.classList.toggle('active', nextGlass);
    showToast(`Sidebar material: ${nextGlass ? 'Glass' : 'Standard'}`);
    customizationController.refreshResetDiff();
  });

  dom.sqlGlassBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextGlass = !currentPrefs.sqlGlass;
    customizationController.updatePrefs({ sqlGlass: nextGlass });
    dom.sqlGlassBtn.classList.toggle('active', nextGlass);
    showToast(`SQL Editor material: ${nextGlass ? 'Glass' : 'Standard'}`);
    customizationController.refreshResetDiff();
  });

  // Floating Panel Drag-to-Reposition Implementation (Sidebar)
  (function initFloatingSidebarDrag() {
    if (!dom.sidebar || !dom.sidebarDragHandle) return;
    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 10;
    let startTop = 10;

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const parentRect = dom.workspaceBody
        ? dom.workspaceBody.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      const panelRect = dom.sidebar.getBoundingClientRect();

      const maxLeft = Math.max(10, parentRect.width - panelRect.width - 10);
      const maxTop = Math.max(10, parentRect.height - panelRect.height - 10);

      const newLeft = Math.min(Math.max(10, startLeft + dx), maxLeft);
      const newTop = Math.min(Math.max(10, startTop + dy), maxTop);

      dom.sidebar.style.left = `${newLeft}px`;
      dom.sidebar.style.top = `${newTop}px`;
      dom.sidebar.style.bottom = 'auto';
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      try {
        if (e && e.pointerId) dom.sidebarDragHandle.releasePointerCapture(e.pointerId);
      } catch (_e) {}
      dom.sidebar.classList.remove('panel-is-dragging');
      document.body.classList.remove('is-panel-dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      customizationController.updateSidebarButtonVector?.();
      const rect = dom.sidebar.getBoundingClientRect();
      const parentRect = dom.workspaceBody ? dom.workspaceBody.getBoundingClientRect() : { left: 0, top: 0 };
      customizationController.setSavedFloatingSidebar?.({
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top),
      });
    }

    dom.sidebarDragHandle.addEventListener('pointerdown', (e) => {
      const prefs = customizationController.getPrefs();
      if (prefs.sidebarMode !== 'floating') {
        showToast('Click Float button in sidebar header to detach panel first');
        return;
      }
      if (prefs.sidebarLock) {
        showToast('Sidebar is locked against movement');
        return;
      }
      e.preventDefault();
      try {
        dom.sidebarDragHandle.setPointerCapture(e.pointerId);
      } catch (_e) {}
      isDragging = true;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      const parentRect = dom.workspaceBody
        ? dom.workspaceBody.getBoundingClientRect()
        : { left: 0, top: 0 };
      const panelRect = dom.sidebar.getBoundingClientRect();
      startLeft = panelRect.left - parentRect.left;
      startTop = panelRect.top - parentRect.top;

      dom.sidebar.classList.add('panel-is-dragging');
      document.body.classList.add('is-panel-dragging');
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });

    // Double-click resets to default floating anchor
    dom.sidebarDragHandle.addEventListener('dblclick', () => {
      dom.sidebar.style.left = '16px';
      dom.sidebar.style.top = '16px';
      dom.sidebar.style.bottom = 'auto';
      dom.sidebar.style.width = '220px';
      dom.sidebar.style.height = '420px';
      customizationController.setSavedFloatingSidebar?.({
        left: 16,
        top: 16,
        width: 220,
        height: 420,
      });
      showToast('Sidebar restored to default anchor position');
    });
  })();

  dom.sidebarDockBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextMode = currentPrefs.sidebarMode === 'docked' ? 'floating' : 'docked';
    customizationController.updatePrefs({ sidebarMode: nextMode });
    showToast(nextMode === 'floating' ? 'Sidebar switched to Floating (Compact)' : 'Sidebar docked to layout');
    customizationController.refreshResetDiff();
  });

  // Floating Panel Drag-to-Reposition Implementation (SQL Editor)
  (function initFloatingSqlDrag() {
    if (!dom.sqlPanel || !dom.sqlDragHandle) return;
    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const parentRect = dom.workspaceBody
        ? dom.workspaceBody.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      const panelRect = dom.sqlPanel.getBoundingClientRect();

      const maxLeft = Math.max(10, parentRect.width - panelRect.width - 10);
      const maxTop = Math.max(10, parentRect.height - panelRect.height - 10);

      const newLeft = Math.min(Math.max(10, startLeft + dx), maxLeft);
      const newTop = Math.min(Math.max(10, startTop + dy), maxTop);

      dom.sqlPanel.style.left = `${newLeft}px`;
      dom.sqlPanel.style.top = `${newTop}px`;
      dom.sqlPanel.style.right = 'auto';
      dom.sqlPanel.style.bottom = 'auto';
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      try {
        if (e && e.pointerId) dom.sqlDragHandle.releasePointerCapture(e.pointerId);
      } catch (_e) {}
      dom.sqlPanel.classList.remove('panel-is-dragging');
      document.body.classList.remove('is-panel-dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      const rect = dom.sqlPanel.getBoundingClientRect();
      const parentRect = dom.workspaceBody ? dom.workspaceBody.getBoundingClientRect() : { left: 0, top: 0 };
      customizationController.setSavedFloatingSql?.({
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top),
      });
    }

    dom.sqlDragHandle.addEventListener('pointerdown', (e) => {
      const prefs = customizationController.getPrefs();
      if (prefs.sqlMode !== 'floating') {
        showToast('Click Float button in SQL panel header to detach panel first');
        return;
      }
      if (prefs.sqlLock) {
        showToast('SQL Editor is locked against movement');
        return;
      }
      e.preventDefault();
      try {
        dom.sqlDragHandle.setPointerCapture(e.pointerId);
      } catch (_e) {}
      isDragging = true;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      const parentRect = dom.workspaceBody
        ? dom.workspaceBody.getBoundingClientRect()
        : { left: 0, top: 0 };
      const panelRect = dom.sqlPanel.getBoundingClientRect();
      startLeft = panelRect.left - parentRect.left;
      startTop = panelRect.top - parentRect.top;

      dom.sqlPanel.classList.add('panel-is-dragging');
      document.body.classList.add('is-panel-dragging');
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });

    // Double-click resets to default floating anchor
    dom.sqlDragHandle.addEventListener('dblclick', () => {
      const bodyRect = dom.workspaceBody ? dom.workspaceBody.getBoundingClientRect() : null;
      const defLeft = bodyRect ? Math.max(16, Math.round(bodyRect.width - 760 - 16)) : 16;
      const defTop = bodyRect ? Math.max(16, Math.round(bodyRect.height - 260 - 16)) : 16;
      dom.sqlPanel.style.left = `${defLeft}px`;
      dom.sqlPanel.style.top = `${defTop}px`;
      dom.sqlPanel.style.right = 'auto';
      dom.sqlPanel.style.bottom = 'auto';
      dom.sqlPanel.style.width = '760px';
      dom.sqlPanel.style.height = '260px';
      customizationController.setSavedFloatingSql?.({
        left: defLeft,
        top: defTop,
        width: 760,
        height: 260,
      });
      showToast('SQL Editor restored to default anchor position');
    });
  })();

  dom.sqlDockBtn?.addEventListener('click', () => {
    const currentPrefs = customizationController.getPrefs();
    const nextMode = currentPrefs.sqlMode === 'docked' ? 'floating' : 'docked';
    customizationController.updatePrefs({ sqlMode: nextMode });
    showToast(nextMode === 'floating' ? 'SQL Editor switched to Floating' : 'SQL Editor docked to layout');
    customizationController.refreshResetDiff();
  });

  // Floating Panel 8-Direction Resizing Controller
  function initFloatingPanelResize(panelEl, defaultDims, boundsFn, getLockedFn) {
    if (!panelEl) return;
    const handles = panelEl.querySelectorAll('.floating-resizer-handle');
    if (!handles.length) return;

    let isResizing = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let startHeight = 0;
    let activeDir = '';

    function onPointerMove(e) {
      if (!isResizing) return;
      const dx = e.clientX - startPointerX;
      const dy = e.clientY - startPointerY;
      const parentRect = dom.workspaceBody
        ? dom.workspaceBody.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      const bounds = boundsFn(parentRect);

      // East (right)
      if (activeDir.includes('e')) {
        const maxWidthAtPos = Math.max(bounds.minWidth, parentRect.width - startLeft - 10);
        const effectiveMax = Math.min(bounds.maxWidth, maxWidthAtPos);
        const nextW = Math.min(effectiveMax, Math.max(bounds.minWidth, startWidth + dx));
        panelEl.style.width = `${Math.round(nextW)}px`;
      }

      // South (bottom)
      if (activeDir.includes('s')) {
        const maxHeightAtPos = Math.max(bounds.minHeight, parentRect.height - startTop - 10);
        const effectiveMax = Math.min(bounds.maxHeight, maxHeightAtPos);
        const nextH = Math.min(effectiveMax, Math.max(bounds.minHeight, startHeight + dy));
        panelEl.style.height = `${Math.round(nextH)}px`;
      }

      // West (left)
      if (activeDir.includes('w')) {
        const rawW = startWidth - dx;
        const clampedW = Math.min(bounds.maxWidth, Math.max(bounds.minWidth, rawW));
        const deltaW = clampedW - startWidth;
        const nextLeft = startLeft - deltaW;
        if (nextLeft >= 10) {
          panelEl.style.left = `${Math.round(nextLeft)}px`;
          panelEl.style.width = `${Math.round(clampedW)}px`;
        }
      }

      // North (top)
      if (activeDir.includes('n')) {
        const rawH = startHeight - dy;
        const clampedH = Math.min(bounds.maxHeight, Math.max(bounds.minHeight, rawH));
        const deltaH = clampedH - startHeight;
        const nextTop = startTop - deltaH;
        if (nextTop >= 10) {
          panelEl.style.top = `${Math.round(nextTop)}px`;
          panelEl.style.height = `${Math.round(clampedH)}px`;
        }
      }
    }

    let activeHandle = null;

    function onPointerUp(e) {
      if (!isResizing) return;
      isResizing = false;
      try {
        if (activeHandle && e && e.pointerId) activeHandle.releasePointerCapture(e.pointerId);
      } catch (_e) {}
      activeHandle = null;
      document.body.classList.remove('is-resizing');
      panelEl.classList.remove('panel-is-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      const parentRect = dom.workspaceBody ? dom.workspaceBody.getBoundingClientRect() : { left: 0, top: 0 };
      const panelRect = panelEl.getBoundingClientRect();
      const dims = {
        left: Math.round(panelRect.left - parentRect.left),
        top: Math.round(panelRect.top - parentRect.top),
        width: Math.round(panelRect.width),
        height: Math.round(panelRect.height),
      };
      if (panelEl === dom.sidebar) {
        customizationController.setSavedFloatingSidebar?.(dims);
      } else if (panelEl === dom.sqlPanel) {
        customizationController.setSavedFloatingSql?.(dims);
      }
    }

    handles.forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        if (!panelEl.classList.contains('is-floating-panel')) return;
        if (getLockedFn && getLockedFn()) {
          showToast('Panel is locked against resizing');
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        activeHandle = handle;
        try {
          handle.setPointerCapture(e.pointerId);
        } catch (_e) {}

        isResizing = true;
        activeDir = handle.dataset.dir || 'se';
        startPointerX = e.clientX;
        startPointerY = e.clientY;

        const parentRect = dom.workspaceBody
          ? dom.workspaceBody.getBoundingClientRect()
          : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const panelRect = panelEl.getBoundingClientRect();

        startLeft = panelRect.left - parentRect.left;
        startTop = panelRect.top - parentRect.top;
        startWidth = panelRect.width;
        startHeight = panelRect.height;

        panelEl.style.left = `${Math.round(startLeft)}px`;
        panelEl.style.top = `${Math.round(startTop)}px`;
        panelEl.style.right = 'auto';
        panelEl.style.bottom = 'auto';

        document.body.classList.add('is-resizing');
        panelEl.classList.add('panel-is-resizing');
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });

      if (handle.classList.contains('floating-resizer-se')) {
        handle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          panelEl.style.width = `${defaultDims.width}px`;
          panelEl.style.height = `${defaultDims.height}px`;
          const parentRect = dom.workspaceBody ? dom.workspaceBody.getBoundingClientRect() : { left: 0, top: 0 };
          const panelRect = panelEl.getBoundingClientRect();
          const dims = {
            left: Math.round(panelRect.left - parentRect.left),
            top: Math.round(panelRect.top - parentRect.top),
            width: defaultDims.width,
            height: defaultDims.height,
          };
          if (panelEl === dom.sidebar) {
            customizationController.setSavedFloatingSidebar?.(dims);
          } else if (panelEl === dom.sqlPanel) {
            customizationController.setSavedFloatingSql?.(dims);
          }
          showToast('Floating panel restored to default size');
        });
      }
    });
  }

  // Initialize Floating Panel Resizers
  initFloatingPanelResize(
    dom.sidebar,
    { width: 220, height: 420 },
    (parentRect) => ({
      minWidth: 180,
      minHeight: 150,
      maxWidth: Math.min(480, Math.floor(parentRect.width * 0.7)),
      maxHeight: Math.min(720, Math.floor(parentRect.height * 0.85)),
    }),
    () => customizationController.getPrefs().sidebarLock
  );

  initFloatingPanelResize(
    dom.sqlPanel,
    { width: 760, height: 260 },
    (parentRect) => ({
      minWidth: 320,
      minHeight: 120,
      maxWidth: Math.min(1000, Math.floor(parentRect.width * 0.9)),
      maxHeight: Math.min(600, Math.floor(parentRect.height * 0.8)),
    }),
    () => customizationController.getPrefs().sqlLock
  );

  dom.sqlPanelCollapseBtn?.addEventListener('click', () => {
    editorController.toggleCollapse();
  });

  // Global toolbar undo/redo buttons
  dom.gridUndoBtn?.addEventListener('click', executeUndo);
  dom.gridRedoBtn?.addEventListener('click', executeRedo);

  // Global keyboard shortcuts: Cmd+B (sidebar), Cmd+, (Customization Center), Cmd+Enter (Run SQL), Cmd+Z / Cmd+Shift+Z (Undo/Redo), Esc (close modals/drawers)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (document.activeElement === dom.sqlEditorInput) {
        return; // Handled directly by editorController
      }

      // Do not run SQL if target originates from cell editor or open modal
      if (e.target?.closest?.('.cell-editor-container, .cell-editor-input, .cell-editor-textarea, .cell-is-editing, .modal-backdrop')) {
        return;
      }

      // Do not run SQL if any modal dialog is currently open
      const isAnyModalOpen = Boolean(document.querySelector('.modal-backdrop:not(.hidden)'));
      if (isAnyModalOpen) return;

      // Do not run SQL if a spreadsheet cell is actively in edit mode
      if (typeof gridController !== 'undefined' && gridController?.isEditing?.()) {
        return;
      }

      // Do not run SQL if user is typing in any text input, textarea, or contenteditable
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || activeEl?.isContentEditable) {
        return;
      }

      // Execute SQL when SQL workspace, spreadsheet selection, or workspace area is focused
      e.preventDefault();
      executeSqlQuery(dom.sqlEditorInput?.value);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      dom.sidebarToggleBtn.click();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      setCustomizationDrawerOpen(!appState.drawerOpen);
      return;
    }

    const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
    const isRedo =
      ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
      ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y');

    if (isUndo || isRedo) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable ||
          activeEl.classList.contains('cell-editor-input') ||
          activeEl.closest('.modal-backdrop:not(.hidden)'));

      if (!isInput) {
        e.preventDefault();
        if (isUndo) {
          executeUndo();
        } else {
          executeRedo();
        }
        return;
      }
    }

    if (e.key === 'Escape') {
      const openPanel = document.querySelector('.override-info-panel:not(.hidden)');
      if (openPanel) {
        e.preventDefault();
        openPanel.classList.add('hidden');
        document.querySelectorAll('.override-info-btn').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-expanded', 'false');
        });
        return;
      }
      if (dom.deleteRowModal && !dom.deleteRowModal.classList.contains('hidden')) {
        e.preventDefault();
        closeDeleteRowModal();
        return;
      }
      if (dom.insertRowModal && !dom.insertRowModal.classList.contains('hidden')) {
        e.preventDefault();
        closeInsertRowModal();
        return;
      }
      if (typeof importExportController !== 'undefined' && importExportController?.isOpen?.()) {
        e.preventDefault();
        importExportController.closeModal();
        return;
      }
      if (typeof backupRestoreController !== 'undefined' && backupRestoreController?.isOpen?.()) {
        if (!backupRestoreController.isRestoring || !backupRestoreController.isRestoring()) {
          e.preventDefault();
          backupRestoreController.closeModal();
          return;
        }
      }
      if (dom.connectDbModal && !dom.connectDbModal.classList.contains('hidden')) {
        e.preventDefault();
        closeConnectDbModal();
        return;
      }
      if (dom.sqlHistoryDrawer && !dom.sqlHistoryDrawer.classList.contains('hidden')) {
        e.preventDefault();
        setSqlViewMode(lastActiveSqlView || 'split');
        return;
      }
      if (appState.drawerOpen) {
        e.preventDefault();
        setCustomizationDrawerOpen(false);
      }
    }
  });

  // Window resize handler: prevent floating panels from being stranded off-canvas
  window.addEventListener('resize', () => {
    updateDrawerOrigin();
    updateViewNavIndicator();
    updateSqlTabIndicator();
    customizationController.updateSegmentedPills?.();
    customizationController.updateSidebarButtonVector?.();
    const parentRect = dom.workspaceBody
      ? dom.workspaceBody.getBoundingClientRect()
      : { width: window.innerWidth, height: window.innerHeight };

    if (dom.sidebar && dom.sidebar.classList.contains('is-floating-panel')) {
      const panelRect = dom.sidebar.getBoundingClientRect();
      const currentLeft = parseFloat(dom.sidebar.style.left) || 16;
      const currentTop = parseFloat(dom.sidebar.style.top) || 16;
      const maxLeft = Math.max(10, parentRect.width - panelRect.width - 10);
      const maxTop = Math.max(10, parentRect.height - panelRect.height - 10);
      if (currentLeft > maxLeft) dom.sidebar.style.left = `${maxLeft}px`;
      if (currentTop > maxTop) dom.sidebar.style.top = `${maxTop}px`;
    }

    if (dom.sqlPanel && dom.sqlPanel.classList.contains('is-floating-panel')) {
      if (dom.sqlPanel.style.left && dom.sqlPanel.style.left !== 'auto') {
        const panelRect = dom.sqlPanel.getBoundingClientRect();
        const currentLeft = parseFloat(dom.sqlPanel.style.left) || 16;
        const currentTop = parseFloat(dom.sqlPanel.style.top) || 16;
        const maxLeft = Math.max(10, parentRect.width - panelRect.width - 10);
        const maxTop = Math.max(10, parentRect.height - panelRect.height - 10);
        if (currentLeft > maxLeft) dom.sqlPanel.style.left = `${maxLeft}px`;
        if (currentTop > maxTop) dom.sqlPanel.style.top = `${maxTop}px`;
      }
    }
  });

  dom.refreshTableBtn.addEventListener('mousedown', () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.removeAllRanges();
    }
  });

  dom.refreshTableBtn.addEventListener('click', async () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.removeAllRanges();
    }
    setSyncActivity(true, 'Refreshing…');
    await refreshHealthStatus();
    try {
      const data = await api.getTables(appState.target);
      appState.tables = data.tables || [];
      if (data.database) {
        appState.activeDatabase = data.database;
      }
      renderSidebarTables();
      updateContextBreadcrumb();

      if (appState.activeTable) {
        const tableStillExists = appState.tables.some((t) => t.name === appState.activeTable);
        if (tableStillExists) {
          await loadTableData(appState.activeTable, {
            sort: appState.sort,
            dir: appState.dir,
            soft: true,
            activityLabel: 'Refreshing…',
          });
        } else if (appState.tables.length > 0) {
          selectTable(appState.tables[0].name);
        } else {
          appState.activeTable = null;
          updateContextBreadcrumb();
          dom.gridRowSummary.textContent = '0 tables in schema';
          gridController.renderData({ table: null, columns: [], rows: [] });
        }
      } else if (appState.tables.length > 0) {
        selectTable(appState.tables[0].name);
      }
    } catch (err) {
      showToast(`Refresh failed: ${err.message}`);
    } finally {
      setSyncActivity(false);
    }
  });

  dom.gridRetryBtn.addEventListener('click', () => {
    if (appState.activeTable) {
      loadTableData(appState.activeTable, {
        sort: appState.sort,
        dir: appState.dir,
      });
    } else {
      initWorkspace();
    }
  });

  dom.gridStaleRetryBtn?.addEventListener('click', () => {
    if (appState.activeTable) {
      loadTableData(appState.activeTable, {
        sort: appState.sort,
        dir: appState.dir,
        soft: true,
        activityLabel: 'Retrying sync…',
      });
    }
  });

  // --- Extended Workspace Controllers ---

  // 0. Context Breadcrumb Updating
  function updateContextBreadcrumb() {
    let dbName = 'rowvane';
    let envBadgeText = 'Real DB';
    let envBadgeClass = 'badge-real';

    if (appState.target === 'playground') {
      dbName = 'rowvane_playground';
      envBadgeText = 'Playground';
      envBadgeClass = 'badge-playground';
    } else if (appState.target && appState.target.startsWith('conn_')) {
      dbName = appState.customDbName || 'external';
      envBadgeText = appState.customConnectionName || 'Custom DB';
      envBadgeClass = 'badge-custom';
    } else {
      dbName = appState.activeDatabase || 'rowvane';
      envBadgeText = 'Real DB';
      envBadgeClass = 'badge-real';
    }

    if (dom.contextDbName) dom.contextDbName.textContent = dbName;
    if (dom.contextSchemaName) {
      const curTable = appState.tables.find((t) => t.name === appState.activeTable);
      dom.contextSchemaName.textContent = curTable?.schema || 'public';
    }
    if (dom.activeTableName) dom.activeTableName.textContent = appState.activeTable || '—';
    if (dom.contextEnvBadge) {
      dom.contextEnvBadge.textContent = envBadgeText;
      dom.contextEnvBadge.className = `context-env-badge ${envBadgeClass}`;
    }
  }

  // 1. Operating Mode Synchronization & Switching
  function syncOperatingModeControls() {
    const isPlayground = appState.target === 'playground';
    const isReal = appState.target === 'default';
    const isCustom = Boolean(appState.target && appState.target.startsWith('conn_'));

    if (dom.settingModePlaygroundBtn) {
      dom.settingModePlaygroundBtn.classList.toggle('active', isPlayground);
      dom.settingModePlaygroundBtn.setAttribute('aria-checked', String(isPlayground));
    }
    if (dom.settingModeRealBtn) {
      dom.settingModeRealBtn.classList.toggle('active', isReal);
      dom.settingModeRealBtn.setAttribute('aria-checked', String(isReal));
    }
    if (dom.settingEnvHint) {
      if (isPlayground) {
        dom.settingEnvHint.textContent = 'Playground Sandbox active';
      } else if (isReal) {
        dom.settingEnvHint.textContent = 'Real Database active';
      } else if (isCustom) {
        dom.settingEnvHint.textContent = `External Connection (${escapeHtml(appState.customConnectionName || 'custom')}) active`;
      }
    }
    if (dom.viewNavPlayground) {
      dom.viewNavPlayground.classList.toggle('hidden', !isPlayground);
    }
    customizationController.updateSegmentedPills?.();
    updateViewNavIndicator();
  }

  function updateViewNavIndicator() {
    if (!dom.viewNavTabs || !dom.viewNavIndicator) return;
    const activeTab = dom.viewNavTabs.querySelector('.view-nav-tab.active:not(.hidden)');
    if (!activeTab) {
      dom.viewNavIndicator.style.opacity = '0';
      dom.viewNavTabs.classList.remove('has-indicator');
      return;
    }
    const navRect = dom.viewNavTabs.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const left = tabRect.left - navRect.left;
    const width = tabRect.width;

    dom.viewNavIndicator.style.transform = `translateX(${left}px)`;
    dom.viewNavIndicator.style.width = `${width}px`;
    dom.viewNavIndicator.style.opacity = '1';
    dom.viewNavTabs.classList.add('has-indicator');
  }

  async function setOperatingMode(targetMode) {
    if (appState.target === targetMode) return;
    const prevTarget = appState.target;
    appState.target = targetMode;
    try {
      localStorage.setItem(TARGET_STORAGE_KEY, targetMode);
    } catch (_e) {}
    const isPlayground = targetMode === 'playground';

    if (!isPlayground && appState.activeView === 'playground') {
      setActiveView('grid');
    }

    syncOperatingModeControls();
    updateContextBreadcrumb();

    try {
      await refreshHealthStatus();
      await initWorkspace();

      showToast(
        isPlayground
          ? 'Switched to Playground Mode (Showcase University Database).'
          : 'Switched to Real Database Mode.'
      );

      if (appState.activeView === 'explorer' && explorerController) {
        explorerController.loadSchema(appState.target);
      } else if (appState.activeView === 'playground' && playgroundController) {
        playgroundController.loadDemos();
      }
    } catch (err) {
      console.error('Mode switch failed:', err);
      // Revert if mode change failed
      appState.target = prevTarget;
      try {
        localStorage.setItem(TARGET_STORAGE_KEY, prevTarget);
      } catch (_e) {}
      syncOperatingModeControls();
      updateContextBreadcrumb();
      showToast(`Failed to switch mode: ${err.message || 'connection error'}`);
    }
  }

  dom.settingModePlaygroundBtn?.addEventListener('click', () => {
    if (appState.target !== 'playground') {
      setOperatingMode('playground');
    }
  });

  dom.settingModeRealBtn?.addEventListener('click', () => {
    if (appState.target !== 'default') {
      setOperatingMode('default');
    }
  });

  // 2. Main Workspace View Switcher (Grid, Explorer, Playground & Chaos)
  function setActiveView(view) {
    appState.activeView = view;
    if (dom.gridPane) dom.gridPane.classList.toggle('hidden', view !== 'grid');
    if (dom.explorerPane)
      dom.explorerPane.classList.toggle('hidden', view !== 'explorer');
    if (dom.playgroundPane)
      dom.playgroundPane.classList.toggle('hidden', view !== 'playground');

    dom.viewNavGrid?.classList.toggle('active', view === 'grid');
    dom.viewNavGrid?.setAttribute('aria-selected', String(view === 'grid'));
    dom.viewNavExplorer?.classList.toggle('active', view === 'explorer');
    dom.viewNavExplorer?.setAttribute(
      'aria-selected',
      String(view === 'explorer')
    );
    dom.viewNavPlayground?.classList.toggle('active', view === 'playground');
    dom.viewNavPlayground?.setAttribute(
      'aria-selected',
      String(view === 'playground')
    );

    updateViewNavIndicator();

    if (view === 'explorer' && explorerController) {
      explorerController.loadSchema(appState.target);
    } else if (view === 'playground' && playgroundController) {
      playgroundController.loadDemos();
    }
  }

  dom.viewNavGrid?.addEventListener('click', () => setActiveView('grid'));
  dom.viewNavExplorer?.addEventListener('click', () => setActiveView('explorer'));
  dom.viewNavPlayground?.addEventListener('click', () =>
    setActiveView('playground')
  );

  // 3. Initialize Playground Controller
  const playgroundController =
    window.RowvanePlayground?.createPlaygroundController(dom.playgroundPane, {
      showToast,
      onLoadInEditor(sql) {
        editorController.setValue(sql);
        editorController.setCollapsed(false);
        const currentMode = lastActiveSqlView || 'query';
        setSqlViewMode(currentMode === 'split' ? 'split' : 'query');
        showToast('Loaded demonstration query into SQL Editor.');
      },
      onRunDemo(sql, demo) {
        editorController.setValue(sql);
        editorController.setCollapsed(false);
        const currentMode = lastActiveSqlView || 'query';
        const targetView = currentMode === 'split' ? 'split' : 'results';
        setSqlViewMode(targetView);
        executeSqlQuery(sql, 'playground', { forcedDestination: targetView });
      },
      onResetCompleted() {
        initWorkspace();
      },
    });

  // 4. Initialize Database Structure Explorer Controller
  const explorerController = window.RowvaneExplorer?.createExplorerController(
    dom.explorerPane,
    {
      getTarget: () => appState.target,
      onOpenTable(tableName) {
        setActiveView('grid');
        selectTable(tableName);
      },
    }
  );

  // 5. Initialize CSV Import/Export Controller
  importExportController = window.RowvaneImportExport?.initImportExport(dom, {
    getTarget: () => appState.target,
    getExistingTables: () => appState.tables.map((t) => t.name),
    showToast,
    onImportCompleted(newTable) {
      initWorkspace().then(() => {
        if (newTable) selectTable(newTable);
      });
    },
  });

  dom.csvCancelImportBtn?.addEventListener('click', () => {
    importExportController?.closeModal?.();
  });
  dom.csvModalCancelBtn?.addEventListener('click', () => {
    importExportController?.closeModal?.();
  });

  // 6. Initialize Native Backup & Restore Controller
  backupRestoreController = window.RowvaneBackupRestore?.initBackupRestore(dom, {
    getTarget: () => appState.target,
    onRestoreCompleted() {
      initWorkspace();
    },
  });

  // 7. Table CSV Export
  async function handleExportActiveTableCsv() {
    const tableName = appState.activeTable;
    if (!tableName) {
      showToast('No table selected to export.');
      return;
    }

    const btn = dom.exportCsvToolbarBtn;
    const origHtml = btn ? btn.innerHTML : '';
    const origDisabled = btn ? btn.disabled : false;

    try {
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = `
          <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Exporting…</span>
        `;
      }

      showToast(`Exporting table "${tableName}" as CSV…`);
      const { blob, filename, exportedRows, totalRows } =
        await api.exportTableCsv(tableName, appState.target);

      const downloadName = filename || `${tableName}.csv`;
      Results.triggerBlobDownload(blob, downloadName);

      const count = exportedRows ?? totalRows;
      const rowsText =
        typeof count === 'number' && !isNaN(count)
          ? `${count.toLocaleString()} row${count === 1 ? '' : 's'}`
          : 'rows';
      showToast(
        `Successfully exported ${rowsText} from "${tableName}" to ${downloadName}`
      );
    } catch (err) {
      console.error('Failed to export table CSV:', err);
      showToast(err.message || 'Failed to export CSV. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = origDisabled;
        btn.removeAttribute('aria-busy');
        btn.innerHTML = origHtml;
      }
    }
  }

  dom.exportCsvToolbarBtn?.addEventListener('click', handleExportActiveTableCsv);

  // 8. SQL File Drag & Drop into SQL Editor
  if (dom.sqlEditorInput) {
    dom.sqlEditorInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      dom.sqlEditorInput.classList.add('drag-over');
    });
    dom.sqlEditorInput.addEventListener('dragleave', () => {
      dom.sqlEditorInput.classList.remove('drag-over');
    });
    dom.sqlEditorInput.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.sqlEditorInput.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith('.sql') || file.type.includes('text'))) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          editorController.setValue(ev.target.result);
          showToast(`Loaded SQL file "${file.name}" into editor.`);
        };
        reader.readAsText(file);
      }
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- 9. Insert Row Controller ---
  function openInsertRowModal() {
    if (!appState.activeTable) {
      showToast('No active table selected.');
      return;
    }
    if (!dom.insertRowModal || !dom.insertRowFormFields) return;

    dom.insertRowModalTitle.textContent = `Insert Row — ${appState.activeTable}`;
    dom.insertRowModalSubtitle.textContent = `Table has ${appState.currentTableColumns.length} columns. Primary keys and defaults are labeled below.`;
    dom.insertRowErrorBanner.classList.add('hidden');
    dom.insertRowErrorBanner.textContent = '';
    dom.insertRowFormFields.innerHTML = '';

    appState.currentTableColumns.forEach((col) => {
      const fieldBox = document.createElement('div');
      fieldBox.className = 'form-field-group';

      const labelRow = document.createElement('div');
      labelRow.className = 'field-label-row';

      const label = document.createElement('label');
      label.className = 'field-name';
      label.textContent = col.name;

      if (!col.nullable && !col.defaultValue && !col.isPrimaryKey) {
        const star = document.createElement('span');
        star.className = 'req-star';
        star.textContent = ' *';
        star.title = 'Required (NOT NULL)';
        label.appendChild(star);
      }

      const badges = document.createElement('div');
      badges.className = 'field-badges';

      if (col.isPrimaryKey) {
        const pkBadge = document.createElement('span');
        pkBadge.className = 'col-pk-badge';
        pkBadge.textContent = 'PK';
        badges.appendChild(pkBadge);
      }

      const typeBadge = document.createElement('span');
      typeBadge.className = 'col-type-badge';
      typeBadge.textContent = col.udtName || col.dataType;
      badges.appendChild(typeBadge);

      if (col.defaultValue) {
        const defBadge = document.createElement('span');
        defBadge.className = 'col-def-badge';
        defBadge.textContent = `Default: ${col.defaultValue}`;
        badges.appendChild(defBadge);
      }

      labelRow.appendChild(label);
      labelRow.appendChild(badges);
      fieldBox.appendChild(labelRow);

      if (col.isPrimaryKey) {
        const pkModeWrap = document.createElement('div');
        pkModeWrap.className = 'pk-mode-segmented';
        const autoBtn = document.createElement('button');
        autoBtn.type = 'button';
        autoBtn.className = 'pk-mode-btn active';
        autoBtn.textContent = 'Auto';
        autoBtn.title = 'Let PostgreSQL generate identifier automatically';

        const manualBtn = document.createElement('button');
        manualBtn.type = 'button';
        manualBtn.className = 'pk-mode-btn';
        manualBtn.textContent = 'Manual';
        manualBtn.title = 'Enter custom primary key value';

        pkModeWrap.appendChild(autoBtn);
        pkModeWrap.appendChild(manualBtn);
        badges.appendChild(pkModeWrap);

        const genNotice = document.createElement('div');
        genNotice.className = 'field-gen-notice';
        genNotice.textContent = 'Generated automatically by PostgreSQL sequence / identity';

        const input = document.createElement('input');
        input.className = 'modal-input hidden';
        input.dataset.colName = col.name;
        input.dataset.pkMode = 'auto';

        const isNum = ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision', 'int4', 'int8'].includes((col.dataType || col.udtName || '').toLowerCase());
        if (isNum) {
          input.type = 'number';
          input.step = '1';
        } else {
          input.type = 'text';
        }
        input.placeholder = 'Enter custom primary key identifier';

        const warnEl = document.createElement('div');
        warnEl.className = 'pk-duplicate-warning hidden';
        warnEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg><span>This primary key already exists. Please choose a unique identifier.</span>`;

        function checkDuplicatePk() {
          if (input.dataset.pkMode !== 'manual') {
            warnEl.classList.add('hidden');
            dom.insertRowSubmitBtn.disabled = false;
            return;
          }
          const val = input.value.trim();
          if (!val) {
            warnEl.classList.add('hidden');
            dom.insertRowSubmitBtn.disabled = false;
            return;
          }
          const rows = gridController.getState().rows || [];
          const isTaken = rows.some((r) => String(r[col.name]) === val);
          if (isTaken) {
            warnEl.classList.remove('hidden');
            dom.insertRowSubmitBtn.disabled = true;
          } else {
            warnEl.classList.add('hidden');
            dom.insertRowSubmitBtn.disabled = false;
          }
        }

        input.addEventListener('input', checkDuplicatePk);

        autoBtn.addEventListener('click', () => {
          autoBtn.classList.add('active');
          manualBtn.classList.remove('active');
          genNotice.classList.remove('hidden');
          input.classList.add('hidden');
          warnEl.classList.add('hidden');
          input.dataset.pkMode = 'auto';
          dom.insertRowSubmitBtn.disabled = false;
        });

        manualBtn.addEventListener('click', () => {
          manualBtn.classList.add('active');
          autoBtn.classList.remove('active');
          genNotice.classList.add('hidden');
          input.classList.remove('hidden');
          input.dataset.pkMode = 'manual';
          input.focus();
          checkDuplicatePk();
        });

        fieldBox.appendChild(genNotice);
        fieldBox.appendChild(input);
        fieldBox.appendChild(warnEl);
      } else if (col.isGenerated || col.hasSequence) {
        const genNotice = document.createElement('div');
        genNotice.className = 'field-gen-notice';
        genNotice.textContent = 'Generated automatically by PostgreSQL';
        fieldBox.appendChild(genNotice);
      } else {
        const isBool = (col.dataType || '').toLowerCase() === 'boolean' || (col.udtName || '').toLowerCase() === 'bool';
        if (isBool) {
          const select = document.createElement('select');
          select.className = 'modal-input';
          select.dataset.colName = col.name;

          const optDef = document.createElement('option');
          optDef.value = '__default__';
          optDef.textContent = col.defaultValue ? `(Default: ${col.defaultValue})` : '(Default / Auto)';
          select.appendChild(optDef);

          const optT = document.createElement('option');
          optT.value = 'true';
          optT.textContent = 'true';
          select.appendChild(optT);

          const optF = document.createElement('option');
          optF.value = 'false';
          optF.textContent = 'false';
          select.appendChild(optF);

          if (col.nullable) {
            const optNull = document.createElement('option');
            optNull.value = '__null__';
            optNull.textContent = 'NULL';
            select.appendChild(optNull);
          }
          fieldBox.appendChild(select);
        } else {
          const input = document.createElement('input');
          input.className = 'modal-input';
          input.dataset.colName = col.name;

          const isNum = ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision', 'int4', 'int8'].includes((col.dataType || col.udtName || '').toLowerCase());
          if (isNum) {
            input.type = 'number';
            input.step = 'any';
          } else {
            input.type = 'text';
          }

          input.placeholder = col.defaultValue
            ? `(Default: ${col.defaultValue})`
            : col.nullable
            ? 'NULL'
            : 'Required value';

          fieldBox.appendChild(input);
        }
      }

      dom.insertRowFormFields.appendChild(fieldBox);
    });

    setModalOrigin(dom.insertRowModal, dom.insertRowBtn);
    dom.insertRowModal.classList.remove('hidden');
    const firstInput = dom.insertRowFormFields.querySelector('input, select');
    if (firstInput) firstInput.focus();
  }

  function closeInsertRowModal() {
    if (!dom.insertRowModal) return;
    setModalOrigin(dom.insertRowModal, dom.insertRowBtn);
    dom.insertRowModal.classList.add('hidden');
  }

  dom.insertRowBtn?.addEventListener('click', openInsertRowModal);
  dom.insertRowCloseBtn?.addEventListener('click', closeInsertRowModal);
  dom.insertRowCancelBtn?.addEventListener('click', closeInsertRowModal);
  dom.insertRowModal?.addEventListener('click', (e) => {
    if (e.target === dom.insertRowModal) closeInsertRowModal();
  });

  dom.insertRowSubmitBtn?.addEventListener('click', async () => {
    if (!appState.activeTable) return;
    const inputs = dom.insertRowFormFields.querySelectorAll('[data-col-name]');
    const rowPayload = {};

    inputs.forEach((el) => {
      const colName = el.dataset.colName;
      if (el.dataset.pkMode === 'auto') {
        return; // Omit auto-generated primary key so PostgreSQL sequence handles it
      }
      const rawVal = el.value.trim();

      if (el.tagName === 'SELECT') {
        if (rawVal === '__default__') return; // let PG use default
        if (rawVal === '__null__') {
          rowPayload[colName] = null;
        } else {
          rowPayload[colName] = rawVal === 'true';
        }
      } else {
        if (rawVal === '') {
          const colMeta = appState.currentTableColumns.find((c) => c.name === colName);
          if (colMeta?.defaultValue || colMeta?.isPrimaryKey) return;
          if (colMeta?.nullable) {
            rowPayload[colName] = null;
          }
          return;
        }
        const colMeta = appState.currentTableColumns.find((c) => c.name === colName);
        const isNum = ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision', 'int4', 'int8'].includes((colMeta?.dataType || colMeta?.udtName || '').toLowerCase());
        if (isNum) {
          rowPayload[colName] = Number(rawVal);
        } else {
          rowPayload[colName] = rawVal;
        }
      }
    });

    try {
      dom.insertRowSubmitBtn.disabled = true;
      dom.insertRowSubmitBtn.innerHTML = '<span class="spin"></span> Saving…';
      const res = await api.insertTableRow(appState.activeTable, rowPayload, appState.target);

      gridController.insertRow(res.row);
      closeInsertRowModal();
      showToast(`Inserted new row into "${appState.activeTable}".`);

      const pkMap = {};
      (appState.currentTablePrimaryKeys || []).forEach((k) => {
        if (res.row && res.row[k] !== undefined) {
          pkMap[k] = res.row[k];
        }
      });
      recordUndoAction({
        type: 'row_insert',
        tableName: appState.activeTable,
        row: { ...res.row },
        pks: pkMap,
        target: appState.target,
        description: 'row insertion',
      });

      // Update table row count locally and preserve current table view
      const curTable = appState.tables.find((t) => t.name === appState.activeTable);
      if (curTable && typeof curTable.rowCount === 'number') {
        curTable.rowCount += 1;
      }
      renderSidebarTables();
      await loadTableData(appState.activeTable, { soft: true });
    } catch (err) {
      dom.insertRowErrorBanner.textContent = err.error || err.message || 'Insert failed';
      dom.insertRowErrorBanner.classList.remove('hidden');
    } finally {
      dom.insertRowSubmitBtn.disabled = false;
      dom.insertRowSubmitBtn.innerHTML = '<span>Save Row to PostgreSQL</span>';
    }
  });

  // --- 10. Delete Row Controller ---
  let pendingDeleteTarget = null;

  function openDeleteRowModal() {
    const sel = gridController.getSelectedRow();
    if (!sel) {
      showToast('Select a row in the grid first to delete it.');
      return;
    }
    if (!sel.primaryKeys || sel.primaryKeys.length === 0) {
      showToast('Cannot delete rows from a table without a primary key.');
      return;
    }
    pendingDeleteTarget = {
      row: { ...sel.row },
      pks: { ...sel.pks },
      primaryKeys: [...sel.primaryKeys],
      rowIdx: sel.rowIdx,
    };

    dom.deleteRowConfirmText.textContent = `Are you sure you want to permanently delete this row from "${appState.activeTable}"?`;
    dom.deleteRowSummaryBox.innerHTML = '';
    dom.deleteRowErrorBanner.classList.add('hidden');
    dom.deleteRowErrorBanner.textContent = '';

    const summaryList = document.createElement('div');
    summaryList.className = 'pk-summary-list';

    for (const [pkCol, val] of Object.entries(sel.pks)) {
      const item = document.createElement('div');
      item.className = 'pk-summary-item';
      item.innerHTML = `<strong>${escapeHtml(pkCol)}:</strong> <code>${escapeHtml(String(val))}</code>`;
      summaryList.appendChild(item);
    }

    dom.deleteRowSummaryBox.appendChild(summaryList);
    setModalOrigin(dom.deleteRowModal, dom.deleteRowBtn);
    dom.deleteRowModal.classList.remove('hidden');
  }

  function closeDeleteRowModal() {
    pendingDeleteTarget = null;
    if (!dom.deleteRowModal) return;
    setModalOrigin(dom.deleteRowModal, dom.deleteRowBtn);
    dom.deleteRowModal.classList.add('hidden');
  }

  dom.deleteRowBtn?.addEventListener('click', openDeleteRowModal);
  dom.deleteRowCloseBtn?.addEventListener('click', closeDeleteRowModal);
  dom.deleteRowCancelBtn?.addEventListener('click', closeDeleteRowModal);

  dom.deleteRowConfirmBtn?.addEventListener('click', async () => {
    const sel = pendingDeleteTarget || gridController.getSelectedRow();
    if (!sel || !appState.activeTable) return;
    const deletedRow = { ...sel.row };
    const deletedPks = { ...sel.pks };
    const tableName = appState.activeTable;
    const target = appState.target;

    try {
      dom.deleteRowConfirmBtn.disabled = true;
      dom.deleteRowConfirmBtn.innerHTML = '<span class="spin"></span> Deleting…';
      await api.deleteTableRow(tableName, deletedPks, target);

      gridController.deleteSelectedRow();
      closeDeleteRowModal();
      showToast(`Row deleted from "${tableName}".`);

      recordUndoAction({
        type: 'row_delete',
        tableName,
        row: deletedRow,
        pks: deletedPks,
        target,
        description: 'row deletion',
      });

      // Update table row count locally and preserve current table view
      const curTable = appState.tables.find((t) => t.name === tableName);
      if (curTable && typeof curTable.rowCount === 'number') {
        curTable.rowCount = Math.max(0, curTable.rowCount - 1);
      }
      renderSidebarTables();
      await loadTableData(tableName, { soft: true });
    } catch (err) {
      dom.deleteRowErrorBanner.textContent = err.error || err.message || 'Delete failed';
      dom.deleteRowErrorBanner.classList.remove('hidden');
      showToast(`Delete failed: ${err.error || err.message || 'Constraint violation'}`);
    } finally {
      dom.deleteRowConfirmBtn.disabled = false;
      dom.deleteRowConfirmBtn.innerHTML = '<span>Delete Row</span>';
    }
  });

  // --- 11. Real Database Connection Controller ---
  let activeConnTab = 'params';

  function setConnTab(tab) {
    activeConnTab = tab;
    dom.connTabParams?.classList.toggle('active', tab === 'params');
    dom.connTabUri?.classList.toggle('active', tab === 'uri');
    dom.connParamsPanel?.classList.toggle('hidden', tab !== 'params');
    dom.connUriPanel?.classList.toggle('hidden', tab !== 'uri');
  }

  dom.connTabParams?.addEventListener('click', () => setConnTab('params'));
  dom.connTabUri?.addEventListener('click', () => setConnTab('uri'));

  function buildConnectionPayload() {
    if (activeConnTab === 'uri') {
      return {
        connectionString: (dom.connUriInput?.value || '').trim(),
      };
    }
    return {
      name: (dom.connNickInput?.value || '').trim(),
      host: (dom.connHostInput?.value || 'localhost').trim(),
      port: Number(dom.connPortInput?.value || 5432),
      database: (dom.connDbInput?.value || '').trim(),
      user: (dom.connUserInput?.value || 'postgres').trim(),
      password: dom.connPassInput?.value || '',
      ssl: Boolean(dom.connSslCheck?.checked),
    };
  }

  async function refreshActiveConnectionsList() {
    if (!dom.activeConnsList) return;
    try {
      const res = await api.getConnections();
      const list = res.connections || [];
      if (list.length === 0) {
        dom.activeConnsList.innerHTML = `<div class="active-conn-empty">No external databases currently connected.</div>`;
        return;
      }

      dom.activeConnsList.innerHTML = '';
      list.forEach((conn) => {
        const card = document.createElement('div');
        card.className = 'active-conn-card';

        const isCurrent = appState.target === conn.id;

        card.innerHTML = `
          <div class="active-conn-info">
            <span class="active-conn-title">${escapeHtml(conn.name || conn.database)} ${isCurrent ? '<span class="pg-pill pg-pill-clean">Active</span>' : ''}</span>
            <span class="active-conn-subtitle">${escapeHtml(conn.user)}@${escapeHtml(conn.host)}:${escapeHtml(String(conn.port))}/${escapeHtml(conn.database)} · PG ${escapeHtml(conn.version || '16')}</span>
          </div>
          <div class="active-conn-actions">
            ${
              isCurrent
                ? ''
                : `<button type="button" class="modal-btn modal-btn-secondary switch-conn-btn" data-id="${conn.id}">Switch</button>`
            }
            <button type="button" class="modal-btn modal-btn-danger disconnect-conn-btn" data-id="${conn.id}">Disconnect</button>
          </div>
        `;

        card.querySelector('.switch-conn-btn')?.addEventListener('click', () => {
          appState.target = conn.id;
          try {
            localStorage.setItem(TARGET_STORAGE_KEY, conn.id);
          } catch (_e) {}
          appState.customDbName = conn.database;
          appState.customConnectionName = conn.name || conn.database;
          if (dom.modeLabel) dom.modeLabel.textContent = conn.name || conn.database;
          if (dom.modeToggleBtn) dom.modeToggleBtn.className = 'mode-toggle-btn mode-custom';
          updateContextBreadcrumb();
          if (dom.viewNavPlayground) dom.viewNavPlayground.classList.add('hidden');
          if (appState.activeView === 'playground') setActiveView('grid');
          initWorkspace();
          closeConnectDbModal();
          showToast(`Switched active workspace to "${conn.name || conn.database}".`);
        });

        card.querySelector('.disconnect-conn-btn')?.addEventListener('click', async () => {
          await api.disconnectDatabase(conn.id);
          if (appState.target === conn.id) {
            setOperatingMode('playground');
          }
          refreshActiveConnectionsList();
          showToast(`Disconnected "${conn.name || conn.database}".`);
        });

        dom.activeConnsList.appendChild(card);
      });
    } catch (err) {
      console.warn('Could not load connections:', err);
    }
  }

  function openConnectDbModal() {
    if (!dom.connectDbModal) return;
    setModalOrigin(dom.connectDbModal, dom.connectDbTriggerBtn);
    if (dom.connTestFeedback) {
      dom.connTestFeedback.className = 'conn-test-box hidden';
      dom.connTestFeedback.textContent = '';
    }
    refreshActiveConnectionsList();
    dom.connectDbModal.classList.remove('hidden');
  }

  function closeConnectDbModal() {
    if (!dom.connectDbModal) return;
    setModalOrigin(dom.connectDbModal, dom.connectDbTriggerBtn);
    dom.connectDbModal.classList.add('hidden');
  }

  dom.connectDbTriggerBtn?.addEventListener('click', openConnectDbModal);
  dom.connectDbCloseBtn?.addEventListener('click', closeConnectDbModal);
  dom.connectDbCancelBtn?.addEventListener('click', closeConnectDbModal);
  dom.connectDbModal?.addEventListener('click', (e) => {
    if (e.target === dom.connectDbModal) closeConnectDbModal();
  });

  dom.testConnectionBtn?.addEventListener('click', async () => {
    const payload = buildConnectionPayload();
    const btn = dom.testConnectionBtn;
    const feedback = dom.connTestFeedback;
    if (!feedback) return;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span> Testing connection…';
      feedback.className = 'conn-test-box hidden';

      const res = await api.testConnection(payload);

      feedback.className = 'conn-test-box conn-test-ok';
      feedback.innerHTML = `
        <strong>Connection Successful!</strong><br />
        Connected to <strong>${escapeHtml(res.database)}</strong> as user <code>${escapeHtml(res.user)}</code> (latency: ${res.latencyMs}ms).<br />
        PostgreSQL Version: ${escapeHtml(res.version)} · Tables detected: ${res.tableCount}
      `;
      feedback.classList.remove('hidden');
    } catch (err) {
      feedback.className = 'conn-test-box conn-test-err';
      feedback.innerHTML = `<strong>Connection Failed:</strong> ${escapeHtml(err.error || err.message)}`;
      feedback.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Test Connection</span>';
    }
  });

  dom.executeConnectBtn?.addEventListener('click', async () => {
    const payload = buildConnectionPayload();
    const btn = dom.executeConnectBtn;
    const feedback = dom.connTestFeedback;

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span> Connecting…';

      const res = await api.connectDatabase(payload);
      const conn = res.connection;

      appState.target = conn.connectionId;
      try {
        localStorage.setItem(TARGET_STORAGE_KEY, conn.connectionId);
      } catch (_e) {}
      appState.customDbName = conn.database;
      appState.customConnectionName = conn.name || conn.database;
      if (dom.modeLabel) dom.modeLabel.textContent = conn.name || conn.database;
      if (dom.modeToggleBtn) dom.modeToggleBtn.className = 'mode-toggle-btn mode-custom';
      updateContextBreadcrumb();
      if (dom.viewNavPlayground) dom.viewNavPlayground.classList.add('hidden');
      if (appState.activeView === 'playground') setActiveView('grid');

      closeConnectDbModal();
      showToast(`Connected to "${conn.name || conn.database}". Loading tables…`);
      initWorkspace();
    } catch (err) {
      if (feedback) {
        feedback.className = 'conn-test-box conn-test-err';
        feedback.innerHTML = `<strong>Failed to Connect:</strong> ${escapeHtml(err.error || err.message)}`;
        feedback.classList.remove('hidden');
      } else {
        showToast(`Connection failed: ${err.message}`);
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Connect &amp; Open Workspace</span>';
    }
  });

  updateDrawerOrigin();
  syncOperatingModeControls();
  customizationController.updateSegmentedPills?.();
  customizationController.updateSidebarButtonVector?.();
  updateUndoRedoUI();
  updateViewNavIndicator();
  updateSqlTabIndicator();
  initWorkspace();
})();
