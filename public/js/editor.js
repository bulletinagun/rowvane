// SQL editor and resizable split pane controller
window.RowvaneEditor = (function () {
  function createEditorController(elements, callbacks = {}) {
    function updateLineNumbers() {
      const value = elements.textareaEl.value || '';
      const lineCount = Math.max(1, value.split('\n').length);
      const spans = [];
      for (let i = 1; i <= lineCount; i += 1) {
        spans.push(`<span>${i}</span>`);
      }
      elements.gutterEl.innerHTML = spans.join('');
    }

    // Sync gutter vertical scroll with textarea
    elements.textareaEl.addEventListener('scroll', () => {
      elements.gutterEl.scrollTop = elements.textareaEl.scrollTop;
    });

    elements.textareaEl.addEventListener('input', updateLineNumbers);

    function getExecutionTarget() {
      const fullText = elements.textareaEl.value || '';
      const start = elements.textareaEl.selectionStart;
      const end = elements.textareaEl.selectionEnd;
      if (typeof start === 'number' && typeof end === 'number' && end > start) {
        const selected = fullText.substring(start, end);
        if (selected.trim().length > 0) {
          return {
            sql: selected,
            isSelection: true,
            selectionStart: start,
            selectionEnd: end,
            fullText,
          };
        }
      }
      return {
        sql: fullText,
        isSelection: false,
        selectionStart: 0,
        selectionEnd: fullText.length,
        fullText,
      };
    }

    function triggerRun() {
      if (typeof callbacks.onRunRequested === 'function') {
        const target = getExecutionTarget();
        callbacks.onRunRequested(target);
      }
    }

    // Support Tab indentation and Cmd/Ctrl+Enter trigger
    elements.textareaEl.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        triggerRun();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const start = elements.textareaEl.selectionStart;
        const end = elements.textareaEl.selectionEnd;
        const val = elements.textareaEl.value;
        elements.textareaEl.value = `${val.substring(0, start)}  ${val.substring(end)}`;
        elements.textareaEl.selectionStart = start + 2;
        elements.textareaEl.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });

    elements.runBtnEl.addEventListener('click', () => {
      triggerRun();
    });

    // Drag-to-resize and collapse bottom SQL panel
    let isDragging = false;
    let startY = 0;
    let startHeight = 240;
    let activePointerId = null;
    let rafId = null;
    let pendingHeight = null;
    let lastExpandedHeight = 240;
    let lastFloatingWidth = 760;
    let collapsedViaButton = false;

    // Initialize lastExpandedHeight from current CSS variable or computed style if expanded
    try {
      const initialH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--sql-panel-height'),
        10
      );
      if (initialH > 60) {
        lastExpandedHeight = initialH;
      }
    } catch (_e) {
      // Fall back to default 240
    }

    function getCollapseBtn() {
      return document.getElementById('sqlPanelCollapseBtn');
    }

    function updateSqlCollapseOrigin() {
      const btn = getCollapseBtn();
      const panel = elements.panelEl;
      if (!btn || !panel) return;
      const btnRect = btn.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const header = panel.querySelector('.sql-panel-header');
      const headerH = header ? header.offsetHeight : 34;

      const originX = Math.round(btnRect.left + btnRect.width / 2 - panelRect.left);
      const originY = Math.round(btnRect.top + btnRect.height / 2 - (panelRect.top + headerH));

      panel.style.setProperty('--sql-collapse-origin-x', `${originX}px`);
      panel.style.setProperty('--sql-collapse-origin-y', `${originY}px`);
      const ws = panel.querySelector('.sql-editor-workspace');
      if (ws) {
        ws.style.setProperty('--sql-collapse-origin-x', `${originX}px`);
        ws.style.setProperty('--sql-collapse-origin-y', `${originY}px`);
      }
      const resWs = panel.querySelector('.sql-results-workspace');
      if (resWs) {
        resWs.style.setProperty('--sql-collapse-origin-x', `${originX}px`);
        resWs.style.setProperty('--sql-collapse-origin-y', `${originY}px`);
      }
      const hist = panel.querySelector('.sql-history-drawer');
      if (hist) {
        hist.style.setProperty('--sql-collapse-origin-x', `${originX}px`);
        hist.style.setProperty('--sql-collapse-origin-y', `${originY}px`);
      }
      const body = panel.querySelector('.sql-panel-body');
      if (body) {
        body.style.setProperty('--sql-collapse-origin-x', `${originX}px`);
        body.style.setProperty('--sql-collapse-origin-y', `${originY}px`);
      }
    }

    function getCollapsedHeight() {
      const headerEl = elements.panelEl?.querySelector('.sql-panel-header');
      if (headerEl) {
        const h = Math.round(headerEl.getBoundingClientRect().height);
        if (h >= 24 && h <= 60) return h;
      }
      const cssH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--sql-header-height'),
        10
      );
      return (cssH >= 24 && cssH <= 60) ? cssH : 36;
    }

    function setCollapseButtonState(collapsed) {
      const btn = getCollapseBtn();
      if (!btn) return;
      btn.classList.toggle('active', collapsed);
      btn.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      btn.title = collapsed ? 'Expand SQL Editor' : 'Collapse SQL Editor';
      btn.setAttribute('aria-expanded', String(!collapsed));
    }

    // Drag resize height application:
    function applyDragHeight(nextHeight, commit = false) {
      const collapsedH = getCollapsedHeight();
      const maxAllowed = Math.floor(window.innerHeight * 0.72);
      const rawClamped = Math.min(Math.max(nextHeight, collapsedH), maxAllowed);
      const isAtCollapsed = rawClamped <= collapsedH;

      if (isAtCollapsed) {
        // Dragged all the way down to header using the paddle:
        // Activate the collapse button and keep it active until dragged back open
        if (elements.panelEl && !elements.panelEl.classList.contains('collapsed')) {
          elements.panelEl.classList.add('collapsed');
        }
        setCollapseButtonState(true);
        // Collapsed using the paddle: button cannot expand it unless dragged back open
        collapsedViaButton = false;
        if (typeof callbacks.onCollapseChange === 'function') {
          callbacks.onCollapseChange(true);
        }
      } else {
        // Dragged the slightest up: technically uncollapse it and deactivate button
        if (elements.panelEl && elements.panelEl.classList.contains('collapsed')) {
          elements.panelEl.classList.remove('collapsed');
        }
        setCollapseButtonState(false);
        collapsedViaButton = false;
        if (typeof callbacks.onCollapseChange === 'function') {
          callbacks.onCollapseChange(false);
        }

        if (rawClamped >= 80) {
          lastExpandedHeight = rawClamped;
        }
      }

      if (elements.panelEl && elements.panelEl.style.height) {
        elements.panelEl.style.height = '';
      }

      document.documentElement.style.setProperty(
        '--sql-panel-height',
        `${rawClamped}px`
      );
      if (typeof callbacks.onHeightChange === 'function') {
        callbacks.onHeightChange(rawClamped);
      }
      if (commit && typeof callbacks.onHeightCommit === 'function') {
        callbacks.onHeightCommit(rawClamped);
      }
    }

    // Collapse button action:
    function toggleCollapse() {
      if (elements.panelEl) {
        elements.panelEl.style.removeProperty('transform');
        elements.panelEl.style.removeProperty('transition');
        elements.panelEl.style.removeProperty('transform-origin');
      }
      const isCurrentlyCollapsed = Boolean(
        elements.panelEl?.classList.contains('collapsed')
      );

      if (isCurrentlyCollapsed) {
        collapsedViaButton = false;

        // Expand smoothly back to last expanded height
        const targetHeight = Math.max(lastExpandedHeight || 240, 100);
        updateSqlCollapseOrigin();

        elements.panelEl?.classList.remove('collapsed');
        setCollapseButtonState(false);

        if (elements.panelEl && elements.panelEl.style.height) {
          elements.panelEl.style.height = '';
        }

        document.documentElement.style.setProperty(
          '--sql-panel-height',
          `${targetHeight}px`
        );
        if (typeof callbacks.onHeightChange === 'function') {
          callbacks.onHeightChange(targetHeight);
        }
        if (typeof callbacks.onHeightCommit === 'function') {
          callbacks.onHeightCommit(targetHeight);
        }
        if (typeof callbacks.onCollapseChange === 'function') {
          callbacks.onCollapseChange(false);
        }
      } else {
        // Was expanded: collapse smoothly down to header height using the button
        collapsedViaButton = true;
        const currentH = Math.round(
          elements.panelEl ? elements.panelEl.getBoundingClientRect().height : 240
        );
        if (currentH > 60) {
          lastExpandedHeight = currentH;
        }
        updateSqlCollapseOrigin();

        elements.panelEl?.classList.add('collapsed');
        setCollapseButtonState(true);

        if (elements.panelEl && elements.panelEl.style.height) {
          elements.panelEl.style.height = '';
        }

        const collapsedH = getCollapsedHeight();
        document.documentElement.style.setProperty(
          '--sql-panel-height',
          `${collapsedH}px`
        );
        if (typeof callbacks.onHeightChange === 'function') {
          callbacks.onHeightChange(collapsedH);
        }
        if (typeof callbacks.onHeightCommit === 'function') {
          callbacks.onHeightCommit(collapsedH);
        }
        if (typeof callbacks.onCollapseChange === 'function') {
          callbacks.onCollapseChange(true);
        }
      }
    }

    function stopDragging(e, commit = true) {
      if (!isDragging) return;
      isDragging = false;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pendingHeight = null;

      if (activePointerId !== null && elements.resizerEl) {
        try {
          if (elements.resizerEl.hasPointerCapture(activePointerId)) {
            elements.resizerEl.releasePointerCapture(activePointerId);
          }
        } catch (_err) {
          // Ignore if pointer capture already released by browser
        }
        activePointerId = null;
      }

      elements.resizerEl?.classList.remove('dragging');
      document.body.classList.remove('is-resizing');
      document.body.style.cursor = '';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);

      if (commit && e) {
        const deltaY = startY - e.clientY;
        applyDragHeight(startHeight + deltaY, true);
      }
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      pendingHeight = startHeight + deltaY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (isDragging && pendingHeight !== null) {
            applyDragHeight(pendingHeight, false);
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

    elements.resizerEl.addEventListener('pointerdown', (e) => {
      // Only drag on primary mouse button
      if (e.button !== 0) return;
      e.preventDefault();

      // If a drag was somehow already active, clean it up cleanly first
      if (isDragging) {
        stopDragging(null, false);
      }

      // Immediately disable all CSS transitions to guarantee instantaneous tracking
      document.body.classList.add('is-resizing');

      const collapsedH = getCollapsedHeight();
      const currentHeight = Math.round(elements.panelEl.getBoundingClientRect().height);
      startHeight = Math.max(collapsedH, currentHeight);

      // Ensure inline height is cleared so CSS variable takes precedence
      if (elements.panelEl && elements.panelEl.style.height) {
        elements.panelEl.style.height = '';
      }

      isDragging = true;
      activePointerId = e.pointerId;
      startY = e.clientY;

      try {
        elements.resizerEl.setPointerCapture(e.pointerId);
      } catch (_err) {
        // Fall back gracefully if setPointerCapture is unsupported
      }

      elements.resizerEl.classList.add('dragging');
      document.body.style.cursor = 'ns-resize';

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('blur', onWindowBlur);
    });

    // Keyboard resize support on separator for accessibility
    elements.resizerEl.addEventListener('keydown', (e) => {
      const current = elements.panelEl.getBoundingClientRect().height;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        applyDragHeight(current + 24, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        applyDragHeight(current - 24, true);
      }
    });

    function setCollapsed(collapsed) {
      const isCurrentlyCollapsed = Boolean(elements.panelEl?.classList.contains('collapsed'));
      if (Boolean(collapsed) === isCurrentlyCollapsed) return;

      if (collapsed) {
        collapsedViaButton = true;
        const currentH = Math.round(
          elements.panelEl ? elements.panelEl.getBoundingClientRect().height : 240
        );
        if (currentH > 60) {
          lastExpandedHeight = currentH;
        }
        updateSqlCollapseOrigin();
        elements.panelEl?.classList.add('collapsed');
        setCollapseButtonState(true);
        if (elements.panelEl && elements.panelEl.style.height) {
          elements.panelEl.style.height = '';
        }
        const collapsedH = getCollapsedHeight();
        document.documentElement.style.setProperty('--sql-panel-height', `${collapsedH}px`);
      } else {
        collapsedViaButton = false;
        updateSqlCollapseOrigin();
        elements.panelEl?.classList.remove('collapsed');
        setCollapseButtonState(false);
        if (elements.panelEl && elements.panelEl.style.height) {
          elements.panelEl.style.height = '';
        }
        const targetHeight = Math.max(lastExpandedHeight || 240, 100);
        document.documentElement.style.setProperty('--sql-panel-height', `${targetHeight}px`);
      }
    }

    updateLineNumbers();

    return {
      getQuery() {
        return elements.textareaEl.value;
      },
      setQuery(sql) {
        elements.textareaEl.value = sql;
        updateLineNumbers();
      },
      setValue(sql) {
        elements.textareaEl.value = sql;
        updateLineNumbers();
      },
      clearQuery() {
        elements.textareaEl.value = '';
        updateLineNumbers();
      },
      getExecutionTarget,
      clearExecutedTarget(target) {
        if (!target) return;
        if (target.isSelection) {
          const full = elements.textareaEl.value || '';
          const before = full.substring(0, target.selectionStart);
          const after = full.substring(target.selectionEnd);
          elements.textareaEl.value = before + after;
          elements.textareaEl.selectionStart = target.selectionStart;
          elements.textareaEl.selectionEnd = target.selectionStart;
        } else {
          elements.textareaEl.value = '';
        }
        updateLineNumbers();
      },
      restoreSelection(start, end) {
        if (typeof start === 'number' && typeof end === 'number') {
          elements.textareaEl.focus();
          elements.textareaEl.setSelectionRange(start, end);
        }
      },
      toggleCollapse,
      setCollapsed,
      isCollapsed() {
        return Boolean(elements.panelEl?.classList.contains('collapsed'));
      },
    };
  }

  return {
    createEditorController,
  };
})();
