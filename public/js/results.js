// SQL query results panel controller
window.RowvaneResults = (function () {
  const NUMERIC_TYPES = new Set([
    'int2', 'int4', 'int8', 'smallint', 'integer', 'bigint',
    'decimal', 'numeric', 'real', 'double precision', 'float4', 'float8',
    'money', 'serial', 'bigserial'
  ]);

  const DATE_TIME_TYPES = new Set([
    'date', 'timestamp without time zone', 'timestamp with time zone',
    'time without time zone', 'time with time zone', 'timestamptz', 'timestamp'
  ]);

  function isNumericType(typeStr) {
    return NUMERIC_TYPES.has((typeStr || '').toLowerCase());
  }

  function isBooleanType(typeStr) {
    const t = (typeStr || '').toLowerCase();
    return t === 'boolean' || t === 'bool';
  }

  function formatCellValue(value) {
    if (value === null || value === undefined) {
      return { text: 'NULL', isNull: true, isBool: false };
    }
    if (typeof value === 'boolean') {
      return { text: value ? 'true' : 'false', isNull: false, isBool: true, boolVal: value };
    }
    if (value instanceof Date) {
      return { text: value.toISOString(), isNull: false, isBool: false };
    }
    if (typeof value === 'number') {
      return { text: String(value), isNull: false, isBool: false, isNumeric: true };
    }
    if (typeof value === 'object') {
      try {
        return { text: JSON.stringify(value), isNull: false, isBool: false };
      } catch (_e) {
        return { text: String(value), isNull: false, isBool: false };
      }
    }
    return { text: String(value), isNull: false, isBool: false };
  }

  function escapeCsvField(val) {
    if (val === null || val === undefined) {
      return '';
    }
    if (val === '') {
      return '""';
    }
    if (typeof val === 'boolean') {
      return val ? 'true' : 'false';
    }
    if (val instanceof Date) {
      return `"${val.toISOString()}"`;
    }
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (
      str.includes('"') ||
      str.includes(',') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function serializeToCsv(columns, rows) {
    const colNames = columns.map((c) =>
      typeof c === 'object' && c !== null ? c.name : String(c)
    );

    const headerLine = colNames.map(escapeCsvField).join(',');
    const lines = [headerLine];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row) continue;
        const rowLine = colNames.map((col) => escapeCsvField(row[col])).join(',');
        lines.push(rowLine);
      }
    }

    return lines.join('\r\n');
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCsv(filename, columns, rows) {
    const csvContent = serializeToCsv(columns, rows);
    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    triggerBlobDownload(blob, filename);
  }

  function createResultsController(elements, callbacks = {}) {
    let state = {
      mode: 'idle', // 'idle' | 'loading' | 'results' | 'error'
      results: [],
      activeIndex: 0,
      error: null,
      totalDurationMs: 0,
    };

    function setMode(mode) {
      state.mode = mode;
      if (elements.idleState) elements.idleState.classList.toggle('hidden', mode !== 'idle');
      if (elements.loadingState) elements.loadingState.classList.toggle('hidden', mode !== 'loading');
      if (elements.errorState) elements.errorState.classList.toggle('hidden', mode !== 'error');
      if (elements.commandState) elements.commandState.classList.toggle('hidden', true);
      if (elements.tableViewport) elements.tableViewport.classList.toggle('hidden', mode !== 'results');
      if (elements.headerBar) elements.headerBar.classList.toggle('hidden', mode === 'idle');
      if (elements.exportBtn) elements.exportBtn.classList.toggle('hidden', mode !== 'results');
    }

    function renderNavTabs() {
      if (!elements.navTabs) return;
      elements.navTabs.innerHTML = '';

      if (state.results.length <= 1) {
        elements.navTabs.classList.add('single-result');
        return;
      }

      elements.navTabs.classList.remove('single-result');

      state.results.forEach((res, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `results-tab-btn ${idx === state.activeIndex ? 'active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', String(idx === state.activeIndex));

        const cmd = res.command || 'STMT';
        const count = res.rowCount ?? (res.rows ? res.rows.length : 0);
        btn.innerHTML = `<span class="res-tab-cmd">${cmd}</span> <span class="res-tab-count">(${count})</span>`;
        btn.title = `Switch to Result ${idx + 1}: ${cmd} (${count} rows)`;

        btn.addEventListener('click', () => {
          setActiveIndex(idx);
        });

        elements.navTabs.appendChild(btn);
      });
    }

    function renderActiveResultSet() {
      const res = state.results[state.activeIndex];
      if (!res) return;

      const hasRows = Array.isArray(res.rows) && res.rows.length > 0;
      const hasFields = Array.isArray(res.fields) && res.fields.length > 0;
      const isSelect = res.command === 'SELECT' || hasFields;

      // Update sub-bar meta
      if (elements.timingBadge) {
        const dur = res.durationMs ?? state.totalDurationMs;
        elements.timingBadge.textContent = `${Number(dur).toFixed(2)}ms`;
      }

      if (elements.rowBadge) {
        const count = res.rowCount ?? (res.rows ? res.rows.length : 0);
        let countText = `${count} ${count === 1 ? 'row' : 'rows'}`;
        if (res.truncated) {
          countText += ' (capped)';
        }
        elements.rowBadge.textContent = countText;
      }

      // 1. Non-SELECT command with no rows (e.g. INSERT/UPDATE/DELETE/CREATE/DROP)
      if (!isSelect && !hasRows) {
        if (elements.exportBtn) elements.exportBtn.classList.add('hidden');
        if (elements.tableViewport) elements.tableViewport.classList.add('hidden');
        if (elements.commandState) {
          elements.commandState.classList.remove('hidden');
          const titleEl = elements.commandState.querySelector('#resultsCommandTitle, .results-command-title, .command-badge-pill');
          const subEl = elements.commandState.querySelector('#resultsCommandSubtitle, .results-command-subtitle, .results-state-subtitle');
          if (titleEl) titleEl.textContent = res.command || 'SUCCESS';
          if (subEl) {
            const count = res.rowCount ?? 0;
            if (count > 0 || res.command === 'INSERT' || res.command === 'UPDATE' || res.command === 'DELETE') {
              subEl.textContent = `${count} ${count === 1 ? 'row' : 'rows'} affected`;
            } else {
              subEl.textContent = 'Command executed successfully';
            }
          }
        }
        return;
      }

      // 2. Tabular view (SELECT or commands with RETURNING)
      if (elements.exportBtn) elements.exportBtn.classList.remove('hidden');
      if (elements.commandState) elements.commandState.classList.add('hidden');
      if (elements.tableViewport) elements.tableViewport.classList.remove('hidden');

      renderGridTable(res);
    }

    let resultSortCol = null;
    let resultSortDir = 'asc';

    function renderGridTable(res) {
      if (!elements.gridHead || !elements.gridBody) return;

      elements.gridHead.innerHTML = '';
      while (elements.gridHead.firstChild) elements.gridHead.removeChild(elements.gridHead.firstChild);
      elements.gridBody.innerHTML = '';
      while (elements.gridBody.firstChild) elements.gridBody.removeChild(elements.gridBody.firstChild);

      // Determine columns from fields or rows
      let columns = [];
      if (Array.isArray(res.fields) && res.fields.length > 0) {
        columns = res.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }));
      } else if (Array.isArray(res.rows) && res.rows.length > 0) {
        columns = Object.keys(res.rows[0]).map(k => ({ name: k }));
      }

      function renderHead() {
        elements.gridHead.innerHTML = '';
        const trHead = document.createElement('tr');
        const thCorner = document.createElement('th');
        thCorner.className = 'row-num-header';
        thCorner.textContent = '#';
        trHead.appendChild(thCorner);

        columns.forEach(col => {
          const th = document.createElement('th');
          th.className = 'res-col-header';
          th.title = `Click to sort by ${col.name}`;

          const inner = document.createElement('div');
          inner.className = 'col-header-inner';

          const nameSpan = document.createElement('span');
          nameSpan.className = 'col-name-text';
          nameSpan.textContent = col.name;
          inner.appendChild(nameSpan);

          if (resultSortCol === col.name) {
            th.classList.add('sorted-col');
            const ind = document.createElement('span');
            ind.className = 'col-sort-indicator';
            ind.textContent = resultSortDir === 'desc' ? ' ↓' : ' ↑';
            inner.appendChild(ind);
          }

          th.addEventListener('click', () => {
            if (resultSortCol === col.name) {
              resultSortDir = resultSortDir === 'asc' ? 'desc' : 'asc';
            } else {
              resultSortCol = col.name;
              resultSortDir = 'asc';
            }
            renderHead();
            renderRows();
          });

          th.appendChild(inner);
          trHead.appendChild(th);
        });
        elements.gridHead.appendChild(trHead);
      }

      function renderRows() {
        elements.gridBody.innerHTML = '';
        const rawRows = res.rows || [];
        if (elements.emptyRowsNotice) {
          elements.emptyRowsNotice.classList.toggle('hidden', rawRows.length > 0);
        }
        if (rawRows.length === 0) return;

        let displayRows = rawRows;
        if (resultSortCol) {
          displayRows = [...rawRows].sort((a, b) => {
            const valA = a[resultSortCol];
            const valB = b[resultSortCol];
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            if (typeof valA === 'number' && typeof valB === 'number') {
              return resultSortDir === 'asc' ? valA - valB : valB - valA;
            }
            const cmp = String(valA).localeCompare(String(valB));
            return resultSortDir === 'asc' ? cmp : -cmp;
          });
        }

        const fragment = document.createDocumentFragment();
        displayRows.forEach((row, rowIdx) => {
          const tr = document.createElement('tr');

          const tdNum = document.createElement('td');
          tdNum.className = 'row-num-cell';
          tdNum.textContent = String(rowIdx + 1);
          tr.appendChild(tdNum);

          columns.forEach(col => {
            const td = document.createElement('td');
            td.className = 'data-cell';
            if (resultSortCol === col.name) {
              td.classList.add('sorted-col-cell');
            }

            const val = row[col.name];
            const fmt = formatCellValue(val);

            if (fmt.isNull) {
              td.classList.add('cell-null');
              td.textContent = 'NULL';
            } else if (fmt.isBool) {
              td.innerHTML = `<span class="bool-pill ${fmt.boolVal ? 'bool-true' : 'bool-false'}">${fmt.text}</span>`;
            } else {
              if (fmt.isNumeric) {
                td.classList.add('cell-numeric');
              }
              td.textContent = fmt.text;
            }

            td.title = `${col.name}: ${fmt.text}`;
            tr.appendChild(td);
          });

          fragment.appendChild(tr);
        });

        elements.gridBody.appendChild(fragment);
      }

      renderHead();
      renderRows();
    }

    function setActiveIndex(idx) {
      if (idx < 0 || idx >= state.results.length) return;
      state.activeIndex = idx;
      renderNavTabs();
      renderActiveResultSet();
      if (typeof callbacks.onResultSelect === 'function') {
        callbacks.onResultSelect(idx, state.results[idx]);
      }
    }

    const controller = {
      setLoading() {
        setMode('loading');
        if (elements.statusTextEl) {
          elements.statusTextEl.textContent = 'Executing query on PostgreSQL…';
        }
      },

      setResults(data) {
        const results = Array.isArray(data?.results) ? data.results : [];
        state.results = results;
        state.activeIndex = 0;
        state.error = null;

        // Calculate total duration
        let totalDur = 0;
        results.forEach(r => {
          if (typeof r.durationMs === 'number') totalDur += r.durationMs;
        });
        state.totalDurationMs = totalDur;

        setMode('results');

        if (elements.countBadgeEl) {
          elements.countBadgeEl.textContent = String(results.length);
          elements.countBadgeEl.classList.remove('hidden');
          if (typeof callbacks.onCountBadgeChange === 'function') {
            callbacks.onCountBadgeChange(results.length);
          }
        }

        if (elements.statusTextEl) {
          const countStr = results.length === 1 ? '1 statement' : `${results.length} statements`;
          elements.statusTextEl.textContent = `Completed in ${totalDur.toFixed(2)}ms (${countStr})`;
        }

        renderNavTabs();
        renderActiveResultSet();
      },

      setError(err) {
        state.error = err;
        state.results = [];
        state.activeIndex = 0;

        setMode('error');

        if (elements.countBadgeEl) {
          elements.countBadgeEl.classList.add('hidden');
          if (typeof callbacks.onCountBadgeChange === 'function') {
            callbacks.onCountBadgeChange(0);
          }
        }

        const msg = err?.message || 'Query execution failed.';
        const code = err?.code;
        const pos = err?.position;

        if (elements.errorMessage) {
          elements.errorMessage.textContent = msg;
        }

        if (elements.errorCodeTag) {
          if (code) {
            elements.errorCodeTag.textContent = `Code: ${code}`;
            elements.errorCodeTag.classList.remove('hidden');
          } else {
            elements.errorCodeTag.classList.add('hidden');
          }
        }

        if (elements.errorPosTag) {
          if (pos) {
            elements.errorPosTag.textContent = `Position: ${pos}`;
            elements.errorPosTag.classList.remove('hidden');
          } else {
            elements.errorPosTag.classList.add('hidden');
          }
        }

        if (elements.statusTextEl) {
          elements.statusTextEl.textContent = code
            ? `Execution error (${code}): ${msg.slice(0, 48)}`
            : `Execution error: ${msg.slice(0, 48)}`;
        }
      },

      setIdle() {
        state.results = [];
        state.activeIndex = 0;
        state.error = null;
        setMode('idle');

        if (elements.navTabs) elements.navTabs.innerHTML = '';
        if (elements.timingBadge) elements.timingBadge.textContent = '0.00ms';
        if (elements.rowBadge) elements.rowBadge.textContent = '0 rows';

        if (elements.countBadgeEl) {
          elements.countBadgeEl.textContent = '0';
          elements.countBadgeEl.classList.add('hidden');
          if (typeof callbacks.onCountBadgeChange === 'function') {
            callbacks.onCountBadgeChange(0);
          }
        }
        if (elements.statusTextEl) {
          elements.statusTextEl.textContent = 'Ready · Press Run (⌘↵) to execute';
        }
      },

      getState() {
        return { ...state };
      },

      setActiveIndex,
    };

    // Wire Clear Results button in results toolbar
    if (elements.clearBtn) {
      elements.clearBtn.addEventListener('click', () => {
        controller.setIdle();
        if (typeof callbacks.onClear === 'function') {
          callbacks.onClear();
        }
      });
    }

    // Wire Clear / Dismiss button inside Command feedback state box
    const cmdDismiss = elements.commandDismissBtn || (elements.commandState ? elements.commandState.querySelector('#resultsCommandDismissBtn') : null);
    if (cmdDismiss) {
      cmdDismiss.addEventListener('click', () => {
        controller.setIdle();
        if (typeof callbacks.onClear === 'function') {
          callbacks.onClear();
        }
      });
    }

    // Wire Export CSV button for currently selected result set
    if (elements.exportBtn) {
      elements.exportBtn.addEventListener('click', () => {
        const res = state.results[state.activeIndex];
        if (!res) return;

        let columns = [];
        if (Array.isArray(res.fields) && res.fields.length > 0) {
          columns = res.fields.map((f) => f.name);
        } else if (Array.isArray(res.rows) && res.rows.length > 0) {
          columns = Object.keys(res.rows[0]);
        }

        if (columns.length === 0) return;

        const cmd = (res.command || 'query').toLowerCase();
        const nowStr = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const filename = `result_${state.activeIndex + 1}_${cmd}_${nowStr}.csv`;

        downloadCsv(filename, columns, res.rows || []);

        if (typeof callbacks.onExport === 'function') {
          callbacks.onExport(res, filename);
        }
      });
    }

    return controller;
  }

  return {
    escapeCsvField,
    serializeToCsv,
    downloadCsv,
    triggerBlobDownload,
    createResultsController,
  };
})();
