// Playground and demos controller
window.RowvanePlayground = (function () {
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createPlaygroundController(containerEl, callbacks = {}) {
    let state = {
      activeTab: 'all', // 'all' | 'fundamentals' | 'intermediate' | 'advanced' | 'chaos' | 'labs'
      demos: [],
      status: null,
      loading: false,
    };

    const navTabsContainer = containerEl.querySelector('#playgroundNavTabs');
    const cardsGrid = containerEl.querySelector('#playgroundCardsGrid');
    const statusBanner = containerEl.querySelector('#playgroundStatusBanner');

    async function loadStatus() {
      try {
        const statusData = await window.RowvaneAPI.getPlaygroundStatus();
        state.status = statusData;
        renderStatusBanner();
      } catch (err) {
        console.error('Failed to load playground status:', err);
      }
    }

    async function loadDemos() {
      state.loading = true;
      render();
      try {
        const [demosData, statusData] = await Promise.all([
          window.RowvaneAPI.getPlaygroundDemos(),
          window.RowvaneAPI.getPlaygroundStatus(),
        ]);
        state.demos = demosData.demos || [];
        state.status = statusData;
      } catch (err) {
        console.error('Failed to load playground demos:', err);
      } finally {
        state.loading = false;
        render();
      }
    }

    function setTab(tab) {
      state.activeTab = tab;
      renderNavTabs();
      renderCards();
    }

    function renderStatusBanner() {
      if (!statusBanner) return;

      const { database, tableCount, totalRows, isClean } = state.status || {
        database: 'rowvane_playground',
        tableCount: 9,
        totalRows: 170,
        isClean: true,
      };

      const integrityBadge = isClean
        ? `<span class="pg-pill pg-pill-clean" title="All tables and canonical university records are intact">
             <span class="pg-pill-dot" aria-hidden="true"></span>
             <span>Intact Showcase Data</span>
           </span>`
        : `<span class="pg-pill pg-pill-dirty" title="Showcase schema or row counts have been modified. Click Reset to restore original data">
             <span class="pg-pill-dot" aria-hidden="true"></span>
             <span>Showcase Modified / Corrupted</span>
           </span>`;

      statusBanner.innerHTML = `
        <div class="pg-banner-inner">
          <div class="pg-banner-identity">
            <div class="pg-banner-title-line">
              <span class="pg-badge-symbol" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/></svg>
              </span>
              <h2 class="pg-banner-heading">Showcase University Database</h2>
              <code class="pg-banner-dbname">${escapeHtml(database)}</code>
              ${integrityBadge}
            </div>
            <p class="pg-banner-summary">
              Isolated university schema with <strong>${tableCount || 9} tables</strong> and <strong>${(totalRows || 170).toLocaleString()} records</strong>. Experiment with complex joins, window functions, recursive CTEs, and destructive chaos scenarios.
            </p>
          </div>

          <div class="pg-banner-actions">
            <button
              type="button"
              class="pg-reset-btn"
              id="pgResetActionBtn"
              title="Reset playground database to pristine initial state"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13.5 8A5.5 5.5 0 1 1 11.88 4.11M13.5 2.5v3h-3" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Reset Showcase</span>
            </button>
          </div>
        </div>
      `;

      const actionBtn = statusBanner.querySelector('#pgResetActionBtn');
      if (actionBtn) {
        actionBtn.addEventListener('click', handleReset);
      }
    }

    async function handleReset() {
      const confirmed = window.confirm(
        'Reset the playground showcase database?\n\nThis will re-initialize the university schema and restore all original demonstration tables, constraints, and records.'
      );
      if (!confirmed) return;

      try {
        if (typeof callbacks.showToast === 'function') {
          callbacks.showToast('Resetting playground database to pristine state…');
        }
        const res = await window.RowvaneAPI.resetPlayground();
        if (typeof callbacks.showToast === 'function') {
          callbacks.showToast(
            `Showcase reset complete in ${res.durationMs || 0}ms (${res.counts?.students || 0} students restored).`
          );
        }
        await loadDemos();
        if (typeof callbacks.onResetCompleted === 'function') {
          callbacks.onResetCompleted();
        }
      } catch (err) {
        console.error('Playground reset failed:', err);
        if (typeof callbacks.showToast === 'function') {
          callbacks.showToast(`Reset failed: ${err.message}`);
        }
      }
    }

    function renderNavTabs() {
      if (!navTabsContainer) return;
      const tabs = [
        { id: 'all', label: 'All Demonstrations', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
        { id: 'fundamentals', label: 'Fundamentals', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
        { id: 'intermediate', label: 'Intermediate', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
        { id: 'advanced', label: 'Advanced SQL', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>' },
        { id: 'chaos', label: 'Chaos Mode', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
        { id: 'labs', label: 'Concurrency & Perf Labs', iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31L4.82 17.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.68-3L14 9.31V2"/></svg>' },
      ];

      navTabsContainer.innerHTML = `
        <div class="pg-segmented-nav" role="tablist" aria-label="Demonstration Categories">
          ${tabs
            .map(
              (t) => `
            <button
              type="button"
              class="pg-nav-tab ${state.activeTab === t.id ? 'active' : ''} ${t.id === 'chaos' ? 'tab-chaos' : ''}"
              data-tab="${t.id}"
              role="tab"
              aria-selected="${state.activeTab === t.id ? 'true' : 'false'}"
            >
              <span class="tab-icon" aria-hidden="true">${t.iconSvg}</span>
              <span class="tab-label">${t.label}</span>
            </button>
          `
            )
            .join('')}
        </div>
      `;

      navTabsContainer.querySelectorAll('.pg-nav-tab').forEach((btn) => {
        btn.addEventListener('click', () => setTab(btn.dataset.tab));
      });
    }

    function renderCards() {
      if (!cardsGrid) return;

      if (state.loading && !state.demos.length) {
        cardsGrid.innerHTML = `
          <div class="pg-loading-card">
            <div class="explorer-spinner" aria-hidden="true"></div>
            <span>Loading curated demonstration catalog…</span>
          </div>
        `;
        return;
      }

      // Special Labs Tab
      if (state.activeTab === 'labs') {
        renderLabsSection();
        return;
      }

      let filtered = state.demos;
      if (state.activeTab !== 'all') {
        filtered = state.demos.filter((d) => d.category === state.activeTab);
      }

      if (filtered.length === 0) {
        cardsGrid.innerHTML = `<div class="pg-empty-card">No demonstrations found in this category.</div>`;
        return;
      }

      cardsGrid.innerHTML = filtered
        .map((demo) => {
          const isChaos = demo.category === 'chaos';
          const diffClass = (demo.difficulty || 'beginner').toLowerCase();

          const badgeText = isChaos
            ? 'DESTRUCTIVE / CHAOS'
            : (demo.badge || demo.difficulty || 'FUNDAMENTAL').toUpperCase();

          return `
          <div class="pg-demo-card ${isChaos ? 'is-chaos-card' : ''}" data-id="${demo.id}">
            <div class="pg-card-top">
              <div class="pg-card-badge-row">
                <span class="pg-card-badge badge-${isChaos ? 'chaos' : diffClass}">
                  ${isChaos ? '<span class="badge-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>' : ''}
                  ${escapeHtml(badgeText)}
                </span>
                <span class="pg-category-label">${escapeHtml(demo.category.toUpperCase())}</span>
              </div>
              <h3 class="pg-card-title">${escapeHtml(demo.title)}</h3>
              <p class="pg-card-desc">${escapeHtml(demo.description)}</p>
            </div>

            <div class="pg-card-sql-wrap">
              <div class="pg-sql-bar">
                <span class="pg-sql-lang-tag">SQL</span>
                <button type="button" class="pg-copy-btn" data-sql="${escapeHtml(demo.sql)}" title="Copy SQL statement">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
              <pre class="pg-sql-snippet"><code>${escapeHtml(demo.sql)}</code></pre>
            </div>

            <div class="pg-card-actions">
              <button
                type="button"
                class="pg-card-btn btn-secondary load-editor-btn"
                data-id="${demo.id}"
                title="Load query into SQL Editor without running"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2.5 13.5l2.5-.5 8-8-2-2-8 8-.5 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Edit in SQL Panel</span>
              </button>
              <button
                type="button"
                class="pg-card-btn ${isChaos ? 'btn-danger' : 'btn-primary'} run-demo-btn"
                data-id="${demo.id}"
                title="${isChaos ? 'Execute destructive demonstration query' : 'Execute query and view results'}"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M4 2.5v11l9-5.5-9-5.5z"/>
                </svg>
                <span>${isChaos ? 'Execute Chaos' : 'Run Demo'}</span>
              </button>
            </div>
          </div>
        `;
        })
        .join('');

      // Copy SQL listener
      cardsGrid.querySelectorAll('.pg-copy-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const sql = btn.dataset.sql;
          try {
            await navigator.clipboard.writeText(sql);
            const orig = btn.innerHTML;
            btn.innerHTML = '<span>Copied!</span>';
            setTimeout(() => {
              btn.innerHTML = orig;
            }, 1500);
          } catch (err) {
            console.error('Failed to copy SQL:', err);
          }
        });
      });

      cardsGrid.querySelectorAll('.load-editor-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const demo = state.demos.find((d) => d.id === btn.dataset.id);
          if (demo && typeof callbacks.onLoadInEditor === 'function') {
            callbacks.onLoadInEditor(demo.sql);
          }
        });
      });

      cardsGrid.querySelectorAll('.run-demo-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const demo = state.demos.find((d) => d.id === btn.dataset.id);
          if (demo && typeof callbacks.onRunDemo === 'function') {
            callbacks.onRunDemo(demo.sql, demo);
          }
        });
      });
    }

    function renderLabsSection() {
      cardsGrid.innerHTML = `
        <!-- Concurrency Laboratory Card -->
        <div class="pg-demo-card lab-card">
          <div class="pg-card-top">
            <div class="pg-card-badge-row">
              <span class="pg-card-badge badge-lab">MULTI-SESSION CONCURRENCY</span>
              <span class="pg-category-label">LABORATORY</span>
            </div>
            <h3 class="pg-card-title">Row-Level Lock Conflict &amp; Lock Wait Simulator</h3>
            <p class="pg-card-desc">
              Demonstrates PostgreSQL Multi-Version Concurrency Control (MVCC) and row-level locking. Spawns two isolated sessions: <strong>Session 1</strong> acquires an exclusive row lock on student ID 1 using <code>SELECT ... FOR UPDATE</code>. <strong>Session 2</strong> attempts a concurrent <code>UPDATE</code> and is forced into a lock wait state until the statement timeout expires.
            </p>
            <div class="lab-guide-box">
              <div class="lab-guide-col">
                <span class="guide-tag">What this tests:</span>
                <p>Transaction isolation, lock acquisition order, and how PostgreSQL protects records from dirty writes and lost updates.</p>
              </div>
              <div class="lab-guide-col">
                <span class="guide-tag">Expected outcome:</span>
                <p>Session 1 holds the lock for 1,200ms; Session 2 waits and safely aborts on statement timeout without corrupting data.</p>
              </div>
            </div>
          </div>

          <div class="lab-control-bar">
            <button type="button" class="pg-card-btn btn-primary" id="runConcurrencyLabBtn">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5-9-5.5z"/>
              </svg>
              <span>Run Lock Simulator</span>
            </button>
          </div>

          <div class="lab-output-terminal" id="concurrencyLabOutput">
            <div class="lab-placeholder">Click "Run Lock Simulator" to initiate concurrent transaction sessions and inspect lock waits.</div>
          </div>
        </div>

        <!-- Performance Benchmark Card -->
        <div class="pg-demo-card lab-card">
          <div class="pg-card-top">
            <div class="pg-card-badge-row">
              <span class="pg-card-badge badge-lab">QUERY OPTIMIZATION</span>
              <span class="pg-category-label">LABORATORY</span>
            </div>
            <h3 class="pg-card-title">Query Execution Plan &amp; Index Scan Benchmark</h3>
            <p class="pg-card-desc">
              Analyzes PostgreSQL Query Planner optimization. Populates a large synthetic dataset in <code>chaos_benchmark_dataset</code> and executes dual <code>EXPLAIN ANALYZE</code> runs comparing an unindexed <strong>Sequential Scan (Seq Scan)</strong> against an indexed <strong>B-Tree Index Scan</strong>.
            </p>
            <div class="lab-guide-box">
              <div class="lab-guide-col">
                <span class="guide-tag">What this tests:</span>
                <p>Disk I/O vs memory lookups, cost estimation, and the exponential difference in execution speed on filtered queries.</p>
              </div>
              <div class="lab-guide-col">
                <span class="guide-tag">Key metrics:</span>
                <p><strong>Execution Time (ms):</strong> Real run time. <strong>Speedup:</strong> Performance ratio between indexed and unindexed scans.</p>
              </div>
            </div>
          </div>

          <div class="lab-control-bar">
            <label for="benchmarkRowsSelect" class="lab-select-label">Dataset Size:</label>
            <select id="benchmarkRowsSelect" class="custom-select" style="width: 140px;">
              <option value="2000">2,000 rows</option>
              <option value="5000" selected>5,000 rows</option>
              <option value="10000">10,000 rows</option>
            </select>
            <button type="button" class="pg-card-btn btn-primary" id="runBenchmarkLabBtn">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5-9-5.5z"/>
              </svg>
              <span>Execute Benchmark</span>
            </button>
            <button type="button" class="pg-card-btn btn-secondary" id="purgeBenchmarkTableBtn" title="Drop benchmark table from playground database">
              <span>Purge Table</span>
            </button>
          </div>

          <div class="lab-output-terminal" id="benchmarkLabOutput">
            <div class="lab-placeholder">Select row volume and click "Execute Benchmark" to analyze planner metrics and scan speed.</div>
          </div>
        </div>
      `;

      // Wire up Lab Actions
      const lockBtn = cardsGrid.querySelector('#runConcurrencyLabBtn');
      const lockOutput = cardsGrid.querySelector('#concurrencyLabOutput');
      if (lockBtn && lockOutput) {
        lockBtn.addEventListener('click', async () => {
          lockBtn.disabled = true;
          lockOutput.innerHTML = `
            <div class="lab-progress">
              <div class="explorer-spinner" aria-hidden="true"></div>
              <span>Spawning concurrent PostgreSQL sessions and acquiring row locks…</span>
            </div>`;
          try {
            const data = await window.RowvaneAPI.runConcurrencyLockDemo();
            lockOutput.innerHTML = `
              <div class="lab-result-grid">
                <div class="lab-metric-card">
                  <span class="metric-label">Session 1 (Lock Holder)</span>
                  <span class="metric-val">PID ${data.session1?.pid}</span>
                  <span class="metric-sub">${escapeHtml(data.session1?.status)}</span>
                </div>
                <div class="lab-metric-card">
                  <span class="metric-label">Session 2 (Blocked)</span>
                  <span class="metric-val">PID ${data.session2?.pid}</span>
                  <span class="metric-sub">${escapeHtml(data.session2?.status)}</span>
                </div>
                <div class="lab-metric-card">
                  <span class="metric-label">Outcome</span>
                  <span class="metric-val">${escapeHtml(data.outcome)}</span>
                  <span class="metric-sub">${data.totalDurationMs}ms elapsed</span>
                </div>
              </div>
              <div class="lab-narrative">${escapeHtml(data.narrative)}</div>
            `;
          } catch (err) {
            lockOutput.innerHTML = `<div class="lab-error">Concurrency lab failed: ${escapeHtml(err.message)}</div>`;
          } finally {
            lockBtn.disabled = false;
          }
        });
      }

      const benchBtn = cardsGrid.querySelector('#runBenchmarkLabBtn');
      const purgeBtn = cardsGrid.querySelector('#purgeBenchmarkTableBtn');
      const benchSelect = cardsGrid.querySelector('#benchmarkRowsSelect');
      const benchOutput = cardsGrid.querySelector('#benchmarkLabOutput');

      if (benchBtn && benchOutput) {
        benchBtn.addEventListener('click', async () => {
          benchBtn.disabled = true;
          const rows = parseInt(benchSelect?.value || '5000', 10);
          benchOutput.innerHTML = `
            <div class="lab-progress">
              <div class="explorer-spinner" aria-hidden="true"></div>
              <span>Generating ${rows.toLocaleString()} benchmark rows and profiling plans…</span>
            </div>`;
          try {
            const data = await window.RowvaneAPI.runPerformanceBenchmark(rows);
            benchOutput.innerHTML = `
              <div class="lab-result-grid">
                <div class="lab-metric-card">
                  <span class="metric-label">Dataset</span>
                  <span class="metric-val">${data.benchmarkTable?.rowCount?.toLocaleString()} rows</span>
                  <span class="metric-sub">${escapeHtml(data.benchmarkTable?.tableSize)} on disk</span>
                </div>
                <div class="lab-metric-card highlight-metric">
                  <span class="metric-label">Sequential Scan</span>
                  <span class="metric-val">${data.unindexedQuery?.executionTimeMs} ms</span>
                  <span class="metric-sub">${data.unindexedQuery?.planType}</span>
                </div>
                <div class="lab-metric-card highlight-metric-speed">
                  <span class="metric-label">Indexed B-Tree Scan</span>
                  <span class="metric-val">${data.indexedQuery?.executionTimeMs} ms</span>
                  <span class="metric-sub">${data.indexedQuery?.planType}</span>
                </div>
                <div class="lab-metric-card speedup-metric">
                  <span class="metric-label">Performance Speedup</span>
                  <span class="metric-val">${data.summary?.speedupMultiplier}</span>
                  <span class="metric-sub">${escapeHtml(data.summary?.fasterQuery)}</span>
                </div>
              </div>
              <div class="lab-narrative">${escapeHtml(data.summary?.recommendation)}</div>
            `;
          } catch (err) {
            benchOutput.innerHTML = `<div class="lab-error">Benchmark failed: ${escapeHtml(err.message)}</div>`;
          } finally {
            benchBtn.disabled = false;
          }
        });
      }

      if (purgeBtn && benchOutput) {
        purgeBtn.addEventListener('click', async () => {
          purgeBtn.disabled = true;
          try {
            await window.RowvaneAPI.purgeBenchmarkTable();
            benchOutput.innerHTML = `<div class="lab-placeholder">Benchmark dataset purged from disk storage.</div>`;
            if (typeof callbacks.showToast === 'function') {
              callbacks.showToast('Benchmark dataset dropped successfully.');
            }
          } catch (err) {
            benchOutput.innerHTML = `<div class="lab-error">Failed to purge table: ${escapeHtml(err.message)}</div>`;
          } finally {
            purgeBtn.disabled = false;
          }
        });
      }
    }

    function render() {
      renderStatusBanner();
      renderNavTabs();
      renderCards();
    }

    return {
      loadDemos,
      loadStatus,
      setTab,
      render,
      handleReset,
    };
  }

  return {
    createPlaygroundController,
  };
})();
