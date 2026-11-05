// Table data grid component
window.RowvaneGrid = (function () {
  const NUMERIC_TYPES = new Set([
    'integer',
    'smallint',
    'bigint',
    'numeric',
    'decimal',
    'real',
    'double precision',
    'int2',
    'int4',
    'int8',
    'float4',
    'float8',
  ]);

  const DATE_TIME_TYPES = new Set([
    'date',
    'timestamp without time zone',
    'timestamp with time zone',
    'time without time zone',
    'time with time zone',
    'timestamptz',
    'timestamp',
  ]);

  function isNumericColumn(col) {
    return (
      NUMERIC_TYPES.has((col.dataType || '').toLowerCase()) ||
      NUMERIC_TYPES.has((col.udtName || '').toLowerCase())
    );
  }

  function isDateColumn(col) {
    return (
      DATE_TIME_TYPES.has((col.dataType || '').toLowerCase()) ||
      DATE_TIME_TYPES.has((col.udtName || '').toLowerCase())
    );
  }

  function isBooleanColumn(col) {
    if (!col) return false;
    const dt = (col.dataType || '').toLowerCase();
    const udt = (col.udtName || '').toLowerCase();
    return dt === 'boolean' || udt === 'bool';
  }

  function isJsonColumn(col) {
    if (!col) return false;
    const dt = (col.dataType || '').toLowerCase();
    const udt = (col.udtName || '').toLowerCase();
    return dt === 'json' || dt === 'jsonb' || udt === 'json' || udt === 'jsonb';
  }

  function formatTypeBadge(col) {
    const udt = (col.udtName || '').toLowerCase();
    const dt = (col.dataType || '').toLowerCase();
    if (udt === 'int4' || dt === 'integer') return 'int4';
    if (udt === 'int8' || dt === 'bigint') return 'int8';
    if (udt === 'int2' || dt === 'smallint') return 'int2';
    if (udt === 'varchar' || dt === 'character varying') return 'varchar';
    if (udt === 'bpchar' || dt === 'character') return 'char';
    if (udt === 'bool' || dt === 'boolean') return 'bool';
    if (udt === 'numeric' || dt === 'numeric') return 'numeric';
    if (udt === 'timestamptz') return 'timestamptz';
    if (udt === 'jsonb' || dt === 'jsonb') return 'jsonb';
    if (udt === 'json' || dt === 'json') return 'json';
    return udt || dt || 'text';
  }

  function formatCellValue(value, col) {
    if (value === null || value === undefined) {
      return { text: 'NULL', isNull: true, isBool: false };
    }

    if (typeof value === 'boolean' || isBooleanColumn(col)) {
      const boolVal = Boolean(value);
      return {
        text: boolVal ? 'true' : 'false',
        isNull: false,
        isBool: true,
        boolVal,
      };
    }

    if (isDateColumn(col) && typeof value === 'string') {
      const udt = (col.udtName || '').toLowerCase();
      if (udt === 'date' && value.includes('T')) {
        return {
          text: value.slice(0, 10),
          isNull: false,
          isBool: false,
        };
      }
    }

    if (value instanceof Date) {
      return {
        text: value.toISOString(),
        isNull: false,
        isBool: false,
      };
    }

    if (typeof value === 'object') {
      return {
        text: JSON.stringify(value),
        isNull: false,
        isBool: false,
      };
    }

    return {
      text: String(value),
      isNull: false,
      isBool: false,
    };
  }

  function createGridController(elements, callbacks = {}) {
    const cellSaveRevisions = new Map();
    const state = {
      tableName: null,
      columns: [],
      primaryKeys: [],
      rows: [],
      sort: null,
      dir: 'asc',
      sorts: [],
      selectedRowIdx: null,
      selectedColIdx: null,
      hasRenderedData: false,
      editing: null, // { rowIdx, colIdx, col, td, originalVal, isNull, inputEl, selectEl }
    };

    function clearBrowserTextSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges();
      }
    }

    function showState(mode, errorInfo = {}) {
      elements.tableEl.classList.remove('is-soft-updating');
      elements.loadingState.classList.toggle('hidden', mode !== 'loading');
      elements.errorState.classList.toggle('hidden', mode !== 'error');
      elements.emptyState.classList.toggle('hidden', mode !== 'empty');
      elements.tableEl.classList.toggle('hidden', mode !== 'data');

      if (mode === 'error') {
        elements.errorTitle.textContent =
          errorInfo.title || 'Failed to load table rows';
        elements.errorMessage.textContent =
          errorInfo.message || 'Check your PostgreSQL connection and try again.';
      }
    }

    function clearSelection() {
      if (state.editing) {
        commitEditingCell(false);
      }
      const prevCell = elements.tbodyEl.querySelector('.cell-selected');
      if (prevCell) prevCell.classList.remove('cell-selected');
      const prevRow = elements.tbodyEl.querySelector('.row-selected');
      if (prevRow) prevRow.classList.remove('row-selected');

      state.selectedRowIdx = null;
      state.selectedColIdx = null;

      if (elements.cellInspectorPill) {
        elements.cellInspectorPill.textContent = 'No cell selected';
      }

      if (typeof callbacks.onRowSelected === 'function') {
        callbacks.onRowSelected(null, null, state.primaryKeys);
      }
    }

    function selectCell(rowIdx, colIdx, focusViewport = false) {
      if (
        rowIdx < 0 ||
        rowIdx >= state.rows.length ||
        colIdx < 0 ||
        colIdx >= state.columns.length
      ) {
        return;
      }

      // If already editing, commit before changing selection
      if (state.editing) {
        if (state.editing.rowIdx === rowIdx && state.editing.colIdx === colIdx) {
          return;
        }
        commitEditingCell(false);
      }

      const prevCell = elements.tbodyEl.querySelector('.cell-selected');
      if (prevCell) prevCell.classList.remove('cell-selected');
      const prevRow = elements.tbodyEl.querySelector('.row-selected');
      if (prevRow) prevRow.classList.remove('row-selected');

      state.selectedRowIdx = rowIdx;
      state.selectedColIdx = colIdx;

      const targetRow = elements.tbodyEl.children[rowIdx];
      if (!targetRow) return;
      targetRow.classList.add('row-selected');

      const targetCell = targetRow.children[colIdx + 1];
      if (!targetCell) return;
      targetCell.classList.add('cell-selected');

      targetCell.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });

      if (focusViewport) {
        elements.viewportEl.focus({ preventScroll: true });
      }

      const col = state.columns[colIdx];
      const rawVal = state.rows[rowIdx]?.[col.name];
      const formatted = formatCellValue(rawVal, col);

      const pkText = col.isPrimaryKey ? ' [PK]' : '';
      if (elements.cellInspectorPill) {
        elements.cellInspectorPill.textContent = `[R${rowIdx + 1}, ${col.name}${pkText}] = ${formatted.text}`;
      }

      if (typeof callbacks.onRowSelected === 'function') {
        callbacks.onRowSelected(state.rows[rowIdx], rowIdx, state.primaryKeys);
      }
    }

    function renderCellContent(td, rawVal, col) {
      td.innerHTML = '';
      td.className = 'data-cell';
      if (state.sort === col.name) {
        td.classList.add('sorted-col-cell');
      }

      const formatted = formatCellValue(rawVal, col);
      if (formatted.isNull) {
        td.classList.add('cell-null');
        td.textContent = 'NULL';
      } else if (formatted.isBool) {
        const pill = document.createElement('span');
        pill.className = `bool-pill ${formatted.boolVal ? 'bool-true' : 'bool-false'}`;
        pill.textContent = formatted.text;
        td.appendChild(pill);
      } else {
        if (isNumericColumn(col)) {
          td.classList.add('cell-numeric');
        } else if (isDateColumn(col) || col.isPrimaryKey || isJsonColumn(col)) {
          td.classList.add('cell-mono');
        }
        td.textContent = formatted.text;
      }
    }

    function cancelEditingCell() {
      if (!state.editing) return;
      const { rowIdx, colIdx, td, col, originalVal, cleanup } = state.editing;
      if (typeof cleanup === 'function') cleanup();
      state.editing = null;
      renderCellContent(td, originalVal, col);
      td.classList.remove('cell-is-editing');
      selectCell(rowIdx, colIdx, true);
    }

    function commitEditingCell(andSelect = true, onFinished = null) {
      if (!state.editing) return;
      const { rowIdx, colIdx, col, td, originalVal, isNull, inputEl, selectEl, originalPks, cleanup } = state.editing;

      let nextVal;
      if (isBooleanColumn(col)) {
        const selStr = selectEl?.value;
        if (selStr === 'NULL') nextVal = null;
        else nextVal = selStr === 'true';
      } else if (isNull) {
        nextVal = null;
      } else if (isNumericColumn(col)) {
        const txt = (inputEl?.value || '').trim();
        if (txt === '') {
          nextVal = col.nullable ? null : 0;
        } else {
          nextVal = Number(txt);
          if (isNaN(nextVal)) {
            if (typeof callbacks.onToast === 'function') {
              callbacks.onToast(`Invalid numeric value for column "${col.name}".`);
            }
            cancelEditingCell();
            return;
          }
        }
      } else {
        // Text / Varchar / UUID / Date / JSON / JSONB
        const txt = inputEl?.value ?? '';
        nextVal = txt;
      }

      if (typeof cleanup === 'function') cleanup();
      state.editing = null;

      // Check if unchanged
      const isUnchanged =
        (originalVal === null && nextVal === null) ||
        (originalVal !== null && nextVal !== null &&
          (typeof originalVal === 'object' ? JSON.stringify(originalVal) : String(originalVal)) === (typeof nextVal === 'object' ? JSON.stringify(nextVal) : String(nextVal)));

      if (isUnchanged) {
        renderCellContent(td, originalVal, col);
        td.classList.remove('cell-is-editing');
        if (andSelect) selectCell(rowIdx, colIdx, true);
        if (typeof onFinished === 'function') onFinished();
        return;
      }

      // Check if table has primary keys
      if (!state.primaryKeys || state.primaryKeys.length === 0) {
        renderCellContent(td, originalVal, col);
        td.classList.remove('cell-is-editing');
        if (typeof callbacks.onToast === 'function') {
          callbacks.onToast('Cannot mutate table: No primary key or unique identifier found.');
        }
        if (typeof onFinished === 'function') onFinished();
        return;
      }

      // Always use the immutable primary keys captured when editing started
      const pks = { ...originalPks };

      const cellKey = `${state.tableName || ''}:${Object.entries(pks).sort().map(([k, v]) => `${k}=${v}`).join('&')}:${col.name}`;
      const saveRev = (cellSaveRevisions.get(cellKey) || 0) + 1;
      cellSaveRevisions.set(cellKey, saveRev);

      // Locate target row in state.rows by matching primary keys (never drift by index)
      const targetRowIdx = state.rows.findIndex((r) =>
        state.primaryKeys.every((pk) => String(r[pk]) === String(originalPks[pk]))
      );
      const effectiveRowIdx = targetRowIdx !== -1 ? targetRowIdx : rowIdx;

      // Optimistically update internal row state immediately so UI remains responsive and consistent
      if (effectiveRowIdx >= 0 && effectiveRowIdx < state.rows.length) {
        state.rows[effectiveRowIdx] = { ...state.rows[effectiveRowIdx], [col.name]: nextVal };
      }

      // Indicate saving
      td.classList.remove('cell-is-editing');
      td.classList.add('cell-saving');
      td.textContent = nextVal === null ? 'NULL' : (typeof nextVal === 'object' ? JSON.stringify(nextVal) : String(nextVal));

      // Keep cell visibly selected and focused immediately without waiting for server round-trip
      if (andSelect) {
        selectCell(effectiveRowIdx, colIdx, true);
      }

      if (typeof callbacks.onCellSave === 'function') {
        callbacks.onCellSave({
          tableName: state.tableName,
          pks,
          updates: { [col.name]: nextVal },
          rowIdx: effectiveRowIdx,
          colIdx,
          col,
          val: nextVal,
          prevVal: originalVal,
          revision: saveRev,
          cellKey,
          onSuccess(updatedRow) {
            // Drop stale network responses if a newer save was queued for this cell
            if (cellSaveRevisions.get(cellKey) !== saveRev) {
              return;
            }

            td.classList.remove('cell-saving', 'cell-error');
            td.classList.add('cell-saved');

            // Find matching row by primary keys
            const matchIdx = state.rows.findIndex((r) =>
              state.primaryKeys.every((pk) => String(r[pk]) === String(originalPks[pk]))
            );
            const idx = matchIdx !== -1 ? matchIdx : effectiveRowIdx;

            if (idx >= 0 && idx < state.rows.length) {
              // Crucial: Primary keys are immutable; never overwrite original PKs during a cell edit!
              const safeUpdated = { ...updatedRow };
              for (const pk of state.primaryKeys) {
                safeUpdated[pk] = originalPks[pk];
              }
              state.rows[idx] = { ...state.rows[idx], ...safeUpdated };
              renderCellContent(td, state.rows[idx][col.name], col);
            }

            // Flash the whole row to indicate persistence
            const tr = elements.tbodyEl.children[idx];
            if (tr) {
              tr.classList.remove('row-flash-update');
              void tr.offsetWidth;
              tr.classList.add('row-flash-update');
            }

            setTimeout(() => {
              td.classList.remove('cell-saved');
            }, 1200);

            if (andSelect) selectCell(idx, colIdx, true);
            if (typeof onFinished === 'function') onFinished();
          },
          onError(err) {
            // If a newer save was queued, do not revert to older state
            if (cellSaveRevisions.get(cellKey) !== saveRev) {
              return;
            }

            td.classList.remove('cell-saving');
            td.classList.add('cell-error');
            td.title = err.message || err.error || 'Update failed';

            // Revert cell content by matching original primary keys
            const matchIdx = state.rows.findIndex((r) =>
              state.primaryKeys.every((pk) => String(r[pk]) === String(originalPks[pk]))
            );
            const idx = matchIdx !== -1 ? matchIdx : effectiveRowIdx;
            if (idx >= 0 && idx < state.rows.length) {
              state.rows[idx] = { ...state.rows[idx], [col.name]: originalVal };
              renderCellContent(td, originalVal, col);
            }

            if (typeof callbacks.onToast === 'function') {
              callbacks.onToast(err.error || err.message || 'Database update failed');
            }
            if (andSelect) selectCell(idx, colIdx, true);
            if (typeof onFinished === 'function') onFinished();
          },
        });
      }
    }

    function startEditingCell(rowIdx, colIdx, initialChar = null) {
      if (rowIdx < 0 || rowIdx >= state.rows.length || colIdx < 0 || colIdx >= state.columns.length) {
        return;
      }

      // Check primary key presence
      if (!state.primaryKeys || state.primaryKeys.length === 0) {
        if (typeof callbacks.onToast === 'function') {
          callbacks.onToast('Table has no primary key or unique identifier. Direct cell editing is disabled for safety.');
        }
        return;
      }

      const col = state.columns[colIdx];
      if (col.isGenerated || col.hasSequence) {
        if (typeof callbacks.onToast === 'function') {
          callbacks.onToast(`Column "${col.name}" is a database-generated identifier and cannot be edited directly.`);
        }
        return;
      }

      if (state.editing) {
        if (state.editing.rowIdx === rowIdx && state.editing.colIdx === colIdx) {
          // Already actively editing this cell — do not commit or restart
          if (state.editing.inputEl && document.activeElement !== state.editing.inputEl) {
            state.editing.inputEl.focus();
          }
          return;
        }
        commitEditingCell(false);
      }

      const row = state.rows[rowIdx];
      const rawVal = row[col.name];
      const targetRow = elements.tbodyEl.children[rowIdx];
      const td = targetRow?.children[colIdx + 1];
      if (!td) return;

      td.classList.add('cell-is-editing');
      td.innerHTML = '';

      const container = document.createElement('div');
      container.className = 'cell-editor-container';

      // Prevent clicks and double-clicks inside editor from bubbling to table cell handlers
      container.addEventListener('click', (e) => e.stopPropagation());
      container.addEventListener('dblclick', (e) => e.stopPropagation());
      container.addEventListener('mousedown', (e) => e.stopPropagation());

      let inputEl = null;
      let selectEl = null;
      let isNullVal = rawVal === null;

      if (isBooleanColumn(col)) {
        selectEl = document.createElement('select');
        selectEl.className = 'cell-editor-select';

        const optTrue = document.createElement('option');
        optTrue.value = 'true';
        optTrue.textContent = 'true';

        const optFalse = document.createElement('option');
        optFalse.value = 'false';
        optFalse.textContent = 'false';

        selectEl.appendChild(optTrue);
        selectEl.appendChild(optFalse);

        if (col.nullable) {
          const optNull = document.createElement('option');
          optNull.value = 'NULL';
          optNull.textContent = 'NULL';
          selectEl.appendChild(optNull);
        }

        selectEl.value = rawVal === null ? 'NULL' : String(Boolean(rawVal));
        container.appendChild(selectEl);
      } else {
        inputEl = document.createElement('input');
        inputEl.className = 'cell-editor-input';

        if (isNumericColumn(col)) {
          inputEl.type = 'number';
          const isInt = ['integer', 'bigint', 'smallint', 'int4', 'int8', 'int2'].includes((col.dataType || col.udtName || '').toLowerCase());
          inputEl.step = isInt ? '1' : 'any';
        } else {
          inputEl.type = 'text';
        }

        if (initialChar !== null) {
          inputEl.value = initialChar;
          isNullVal = false;
        } else if (rawVal === null || rawVal === undefined) {
          inputEl.value = '';
          isNullVal = true;
        } else {
          inputEl.value = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal);
          isNullVal = false;
        }

        container.appendChild(inputEl);

        // Explicit NULL Toggle Button for nullable fields
        if (col.nullable) {
          const nullBtn = document.createElement('button');
          nullBtn.type = 'button';
          nullBtn.className = `cell-null-toggle ${isNullVal ? 'is-null' : ''}`;
          nullBtn.title = 'Toggle SQL NULL (Alt+N)';
          nullBtn.textContent = 'NULL';

          nullBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Keep input focused
            isNullVal = !isNullVal;
            state.editing.isNull = isNullVal;
            nullBtn.classList.toggle('is-null', isNullVal);
            if (isNullVal) {
              inputEl.value = '';
            } else {
              inputEl.focus();
            }
          });

          container.appendChild(nullBtn);

          inputEl.addEventListener('input', () => {
            if (isNullVal) {
              isNullVal = false;
              state.editing.isNull = false;
              nullBtn.classList.remove('is-null');
            }
          });
        }
      }

      td.appendChild(container);

      // Track pointer interactions inside the cell container so clicking native stepper buttons
      // or toggles does not trigger premature blur destruction.
      let isInteractingWithStepper = false;
      const setInteracting = () => { isInteractingWithStepper = true; };
      const clearInteracting = () => { setTimeout(() => { isInteractingWithStepper = false; }, 220); };
      container.addEventListener('pointerdown', setInteracting);
      container.addEventListener('mousedown', setInteracting);
      window.addEventListener('pointerup', clearInteracting);
      window.addEventListener('mouseup', clearInteracting);

      const originalPks = {};
      for (const pkCol of state.primaryKeys) {
        originalPks[pkCol] = row[pkCol];
      }

      state.editing = {
        rowIdx,
        colIdx,
        col,
        td,
        originalVal: rawVal,
        originalPks,
        isNull: isNullVal,
        inputEl,
        selectEl,
        cleanup() {
          window.removeEventListener('pointerup', clearInteracting);
          window.removeEventListener('mouseup', clearInteracting);
        },
      };

      const activeCtl = selectEl || inputEl;
      if (activeCtl) {
        activeCtl.focus();
        if (inputEl && initialChar === null && inputEl.select) {
          inputEl.select();
        }

        activeCtl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            commitEditingCell(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelEditingCell();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            const forward = !e.shiftKey;
            commitEditingCell(false, () => {
              let nextCol = colIdx + (forward ? 1 : -1);
              let nextRow = rowIdx;
              if (forward && nextCol >= state.columns.length) {
                nextCol = 0;
                nextRow = Math.min(rowIdx + 1, state.rows.length - 1);
              } else if (!forward && nextCol < 0) {
                nextCol = state.columns.length - 1;
                nextRow = Math.max(rowIdx - 1, 0);
              }
              selectCell(nextRow, nextCol, false);
              startEditingCell(nextRow, nextCol);
            });
          } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
            e.preventDefault();
            e.stopPropagation();
            if (col.nullable) {
              isNullVal = !isNullVal;
              state.editing.isNull = isNullVal;
              const btn = container.querySelector('.cell-null-toggle');
              if (btn) btn.classList.toggle('is-null', isNullVal);
              if (isNullVal && inputEl) inputEl.value = '';
            }
          }
        });

        activeCtl.addEventListener('blur', (e) => {
          setTimeout(() => {
            if (isInteractingWithStepper) {
              if (inputEl && document.activeElement !== inputEl) {
                inputEl.focus();
              }
              return;
            }
            if (state.editing && !td.contains(document.activeElement)) {
              commitEditingCell(false);
            }
          }, 180);
        });
      }
    }

    function renderHeader() {
      elements.theadEl.innerHTML = '';
      const tr = document.createElement('tr');

      const cornerTh = document.createElement('th');
      cornerTh.className = 'row-num-header';
      cornerTh.textContent = '#';
      tr.appendChild(cornerTh);

      state.columns.forEach((col) => {
        const th = document.createElement('th');
        const sortIdx = state.sorts.findIndex((s) => s.column === col.name);
        const isSorted = sortIdx !== -1;
        const currentSort = isSorted ? state.sorts[sortIdx] : null;

        if (isSorted) {
          th.classList.add('sorted-col');
        }
        th.title = `Sort by ${col.name} (${col.dataType}). Shift-click for multi-column sort.`;

        const inner = document.createElement('div');
        inner.className = 'col-header-inner';

        const left = document.createElement('div');
        left.className = 'col-header-left';

        if (col.isPrimaryKey) {
          const pkBadge = document.createElement('span');
          pkBadge.className = 'col-pk-badge';
          pkBadge.textContent = 'PK';
          left.appendChild(pkBadge);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'col-name-text';
        nameSpan.textContent = col.name;
        left.appendChild(nameSpan);

        const right = document.createElement('div');
        right.className = 'col-header-right';

        const typeBadge = document.createElement('span');
        typeBadge.className = 'col-type-badge';
        typeBadge.textContent = formatTypeBadge(col);
        right.appendChild(typeBadge);

        const sortInd = document.createElement('span');
        sortInd.className = 'col-sort-indicator';
        if (isSorted && currentSort) {
          const arrow = currentSort.dir === 'desc' ? '↓' : '↑';
          if (state.sorts.length > 1) {
            sortInd.innerHTML = `<span class="sort-priority">${sortIdx + 1}</span>${arrow}`;
          } else {
            sortInd.textContent = arrow;
          }
        } else {
          sortInd.textContent = '';
        }
        right.appendChild(sortInd);

        inner.appendChild(left);
        inner.appendChild(right);
        th.appendChild(inner);

        th.addEventListener('click', (e) => {
          if (typeof callbacks.onSortChange === 'function') {
            callbacks.onSortChange(col.name, {
              shiftKey: e.shiftKey,
              currentSorts: [...state.sorts],
            });
          }
        });

        tr.appendChild(th);
      });

      elements.theadEl.appendChild(tr);
    }

    function renderBody() {
      clearBrowserTextSelection();
      elements.tbodyEl.innerHTML = '';
      const fragment = document.createDocumentFragment();

      state.rows.forEach((row, rowIdx) => {
        const tr = document.createElement('tr');

        const numTd = document.createElement('td');
        numTd.className = 'row-num-cell';
        numTd.textContent = String(rowIdx + 1);
        tr.appendChild(numTd);

        state.columns.forEach((col, colIdx) => {
          const td = document.createElement('td');
          const rawVal = row[col.name];
          renderCellContent(td, rawVal, col);

          td.addEventListener('click', () => {
            selectCell(rowIdx, colIdx, true);
          });

          td.addEventListener('dblclick', (e) => {
            e.preventDefault();
            selectCell(rowIdx, colIdx, false);
            startEditingCell(rowIdx, colIdx);
          });

          tr.appendChild(td);
        });

        fragment.appendChild(tr);
      });

      elements.tbodyEl.appendChild(fragment);
    }

    function renderData(payload) {
      clearBrowserTextSelection();
      const isSameTable = state.tableName === payload.table;
      const prevRowIdx = state.selectedRowIdx;
      const prevColIdx = state.selectedColIdx;

      state.tableName = payload.table;
      state.columns = payload.columns || [];
      state.primaryKeys = payload.primaryKeys || state.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
      state.rows = payload.rows || [];

      if (Array.isArray(payload.sorts) && payload.sorts.length > 0) {
        state.sorts = payload.sorts.map((s) => ({ column: s.column, dir: s.dir || 'asc' }));
        state.sort = state.sorts[0].column;
        state.dir = state.sorts[0].dir;
      } else if (payload.sort) {
        state.sorts = [{ column: payload.sort, dir: payload.dir || 'asc' }];
        state.sort = payload.sort;
        state.dir = payload.dir || 'asc';
      } else {
        state.sorts = [];
        state.sort = null;
        state.dir = 'asc';
      }

      state.editing = null;

      renderHeader();

      if (state.rows.length === 0) {
        state.hasRenderedData = false;
        state.selectedRowIdx = null;
        state.selectedColIdx = null;
        if (elements.cellInspectorPill) {
          elements.cellInspectorPill.textContent = '0 rows';
        }
        showState('empty');
        if (typeof callbacks.onRowSelected === 'function') {
          callbacks.onRowSelected(null, null, state.primaryKeys);
        }
        return;
      }

      renderBody();
      state.hasRenderedData = true;
      showState('data');

      const hasPriorSelection = isSameTable && prevRowIdx !== null && prevColIdx !== null;
      if (hasPriorSelection) {
        const nextRowIdx = Math.min(prevRowIdx, state.rows.length - 1);
        const nextColIdx = Math.min(prevColIdx, state.columns.length - 1);
        selectCell(nextRowIdx, nextColIdx, false);
      } else {
        clearSelection();
      }
    }

    // Keyboard navigation inside the grid viewport
    elements.viewportEl.addEventListener('keydown', (e) => {
      if (state.rows.length === 0 || state.columns.length === 0) return;
      if (state.editing) return; // Do not intercept while actively typing in editor

      if (state.selectedRowIdx === null || state.selectedColIdx === null) {
        if (!e.metaKey && !e.ctrlKey && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
          e.preventDefault();
          selectCell(0, 0, true);
        }
        return;
      }

      const curRow = state.selectedRowIdx;
      const curCol = state.selectedColIdx;

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        startEditingCell(curRow, curCol);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const col = state.columns[curCol];
        if (col && col.nullable && !col.isGenerated) {
          e.preventDefault();
          startEditingCell(curRow, curCol, '');
        }
        return;
      }

      // If user starts typing a printable character directly on selected cell
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEditingCell(curRow, curCol, e.key);
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectCell(Math.min(curRow + 1, state.rows.length - 1), curCol);
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectCell(Math.max(curRow - 1, 0), curCol);
          break;
        case 'ArrowRight':
          e.preventDefault();
          selectCell(curRow, Math.min(curCol + 1, state.columns.length - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          selectCell(curRow, Math.max(curCol - 1, 0));
          break;
        default:
          break;
      }
    });

    elements.viewportEl.addEventListener('mousedown', (e) => {
      if (!e.target.closest('td, th, input, select, button, textarea, [role="button"]')) {
        clearBrowserTextSelection();
        if (state.selectedRowIdx !== null || state.editing) {
          clearSelection();
        }
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (
        !e.target.closest(
          '.sheet-grid, .table-workspace-toolbar, .grid-meta-bar, .modal-dialog, .modal-backdrop, .modal-box, .customization-drawer, .sidebar, .top-toolbar'
        )
      ) {
        if (state.selectedRowIdx !== null || state.editing) {
          clearSelection();
        }
      }
    });

    return {
      hasData() {
        return state.hasRenderedData && state.rows.length > 0;
      },
      showLoading(soft = false) {
        if (soft && state.hasRenderedData && state.rows.length > 0) {
          elements.tableEl.classList.add('is-soft-updating');
          return;
        }
        showState('loading');
      },
      clearSoftLoading() {
        elements.tableEl.classList.remove('is-soft-updating');
      },
      showError(title, message) {
        showState('error', { title, message });
      },
      renderData,
      getState() {
        return { ...state };
      },
      getSelectedRow() {
        if (state.selectedRowIdx === null || !state.rows[state.selectedRowIdx]) {
          return null;
        }
        const row = state.rows[state.selectedRowIdx];
        const pks = {};
        for (const pkCol of state.primaryKeys) {
          pks[pkCol] = row[pkCol];
        }
        return {
          row,
          rowIdx: state.selectedRowIdx,
          pks,
          primaryKeys: state.primaryKeys,
        };
      },
      insertRow(newRow) {
        state.rows.unshift(newRow);
        renderBody();
        selectCell(0, 0, false);
        const tr = elements.tbodyEl.children[0];
        if (tr) {
          tr.classList.remove('row-flash-update');
          void tr.offsetWidth;
          tr.classList.add('row-flash-update');
        }
      },
      deleteSelectedRow() {
        if (state.selectedRowIdx === null) return null;
        const removed = state.rows.splice(state.selectedRowIdx, 1)[0];
        if (state.rows.length === 0) {
          showState('empty');
          state.selectedRowIdx = null;
          state.selectedColIdx = null;
        } else {
          renderBody();
          const nextIdx = Math.min(state.selectedRowIdx, state.rows.length - 1);
          selectCell(nextIdx, state.selectedColIdx ?? 0, false);
        }
        return removed;
      },
      isEditing() {
        return Boolean(state.editing);
      },
    };
  }

  return {
    createGridController,
    formatCellValue,
  };
})();
