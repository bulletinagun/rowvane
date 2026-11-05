// Database structure explorer controller
window.RowvaneExplorer = (function () {
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createExplorerController(containerEl, callbacks = {}) {
    let state = {
      schemaData: null,
      filterQuery: '',
      loading: false,
      selectedTable: null,
    };

    const searchInput = containerEl.querySelector('#explorerSearchInput');
    const searchClearBtn = containerEl.querySelector('#explorerSearchClearBtn');
    const tablesListEl = containerEl.querySelector('#explorerTablesList');
    const relationshipsEl = containerEl.querySelector('#explorerRelationshipsList');
    const tableDetailEl = containerEl.querySelector('#explorerTableDetail');
    const refreshBtn = containerEl.querySelector('#explorerRefreshBtn');
    const globalCountBadge = containerEl.querySelector('#globalRelsCountBadge');

    async function loadSchema(target = 'default') {
      state.loading = true;
      render();
      try {
        const data = await window.RowvaneAPI.getDatabaseSchema(target);
        state.schemaData = data;
        if ((!state.selectedTable || !data.tables?.some(t => t.name === state.selectedTable)) && data.tables?.length > 0) {
          state.selectedTable = data.tables[0].name;
        }
      } catch (err) {
        console.error('Failed to load explorer schema:', err);
      } finally {
        state.loading = false;
        render();
      }
    }

    function renderTablesList() {
      if (!tablesListEl) return;
      if (state.loading && !state.schemaData) {
        tablesListEl.innerHTML = `
          <div class="explorer-empty-nav">
            <div class="explorer-spinner" aria-hidden="true"></div>
            <span>Cataloging database schema…</span>
          </div>`;
        return;
      }
      if (!state.schemaData?.tables) {
        tablesListEl.innerHTML = `<div class="explorer-empty-nav">Catalog unavailable.</div>`;
        return;
      }

      const q = state.filterQuery.trim().toLowerCase();
      const filtered = state.schemaData.tables.filter((t) =>
        t.name.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        tablesListEl.innerHTML = `
          <div class="explorer-empty-nav">
            <span class="empty-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <span>No tables match "${escapeHtml(state.filterQuery)}"</span>
          </div>`;
        return;
      }

      tablesListEl.innerHTML = filtered
        .map((t) => {
          const isSelected = t.name === state.selectedTable;
          const pkCount = t.primaryKeys.length;
          const fkCount = t.foreignKeys.length;
          const colCount = t.columns.length;
          const isView = t.type === 'VIEW';

          return `
          <button
            type="button"
            class="explorer-table-item ${isSelected ? 'active' : ''}"
            data-table="${escapeHtml(t.name)}"
            role="tab"
            aria-selected="${isSelected ? 'true' : 'false'}"
          >
            <div class="explorer-item-main">
              <span class="explorer-table-icon" aria-hidden="true">
                ${isView
                  ? '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>'
                  : '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M2 6h12M6 6v8" stroke="currentColor" stroke-width="1.2"/></svg>'
                }
              </span>
              <span class="explorer-table-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
              <span class="explorer-type-tag ${isView ? 'tag-view' : 'tag-base'}">${isView ? 'VIEW' : 'TABLE'}</span>
            </div>
            <div class="explorer-table-badges">
              <span class="explorer-meta-chip">${colCount} cols</span>
              ${pkCount > 0 ? `<span class="explorer-meta-chip chip-pk" title="Primary Key: ${escapeHtml(t.primaryKeys.join(', '))}">PK</span>` : ''}
              ${fkCount > 0 ? `<span class="explorer-meta-chip chip-fk" title="${fkCount} Foreign Key relationships">${fkCount} FK</span>` : ''}
            </div>
          </button>
        `;
        })
        .join('');

      tablesListEl.querySelectorAll('.explorer-table-item').forEach((item) => {
        item.addEventListener('click', () => {
          if (state.selectedTable === item.dataset.table) return;
          state.selectedTable = item.dataset.table;
          renderTablesList();
          renderTableDetail();
        });
      });
    }

    function renderTableDetail() {
      if (!tableDetailEl) return;
      if (state.loading && !state.schemaData) {
        tableDetailEl.innerHTML = `
          <div class="explorer-loading-state">
            <div class="explorer-spinner" aria-hidden="true"></div>
            <h3>Loading table schema…</h3>
          </div>`;
        return;
      }
      if (!state.schemaData?.tables || !state.selectedTable) {
        tableDetailEl.innerHTML = `
          <div class="explorer-placeholder">
            <div class="placeholder-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
            <h3>Select a table from the catalog</h3>
            <p>Inspect columns, primary keys, relational foreign key graphs, and indexes.</p>
          </div>`;
        return;
      }

      const table = state.schemaData.tables.find(
        (t) => t.name === state.selectedTable
      );
      if (!table) {
        tableDetailEl.innerHTML = `
          <div class="explorer-placeholder">
            <div class="placeholder-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h3>Table "${escapeHtml(state.selectedTable)}" not found</h3>
            <p>The table may have been dropped or renamed. Refresh the schema to reload.</p>
          </div>`;
        return;
      }

      // Foreign key lookup set for column indicators
      const fkColMap = new Map();
      table.foreignKeys.forEach((fk) => {
        fkColMap.set(fk.fromColumn, fk);
      });

      // Columns Table
      const columnsHtml = table.columns
        .map((col, idx) => {
          const isPk = col.isPrimaryKey || table.primaryKeys.includes(col.name);
          const fk = fkColMap.get(col.name);

          let keyBadge = '—';
          if (isPk && fk) {
            keyBadge = `<span class="key-pill pill-pk-fk" title="Primary Key &amp; Foreign Key">PK / FK</span>`;
          } else if (isPk) {
            keyBadge = `<span class="key-pill pill-pk" title="Primary Key">PK</span>`;
          } else if (fk) {
            keyBadge = `<span class="key-pill pill-fk" title="Foreign Key referencing ${escapeHtml(fk.toTable)}.${escapeHtml(fk.toColumn)}">FK</span>`;
          }

          const typeTagClass = col.dataType.toUpperCase().includes('INT')
            ? 'type-int'
            : col.dataType.toUpperCase().includes('CHAR') || col.dataType.toUpperCase().includes('TEXT')
            ? 'type-text'
            : col.dataType.toUpperCase().includes('TIME') || col.dataType.toUpperCase().includes('DATE')
            ? 'type-date'
            : col.dataType.toUpperCase().includes('BOOL')
            ? 'type-bool'
            : col.dataType.toUpperCase().includes('NUM') || col.dataType.toUpperCase().includes('FLOAT')
            ? 'type-numeric'
            : col.dataType.toUpperCase().includes('JSON')
            ? 'type-json'
            : 'type-generic';

          return `
          <tr class="${isPk ? 'row-pk' : ''}">
            <td class="col-idx">${idx + 1}</td>
            <td class="col-key">${keyBadge}</td>
            <td class="col-name-cell">
              <span class="col-name-text ${isPk ? 'is-pk' : ''}">
                ${isPk ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pk-icon" aria-hidden="true" style="margin-right:4px;"><path d="m21 2-2 2m-1.5 1.5L10 13l-4 4-4-1 1-4 4-4 7.5-7.5Z"/><circle cx="17.5" cy="6.5" r="2.5"/></svg>' : ''}
                ${escapeHtml(col.name)}
              </span>
            </td>
            <td class="col-type-cell">
              <code class="col-type-pill ${typeTagClass}">${escapeHtml(col.dataType)}</code>
            </td>
            <td class="col-nullable-cell">
              ${col.nullable
                ? '<span class="nullable-tag tag-yes">NULL</span>'
                : '<span class="nullable-tag tag-no">NOT NULL</span>'}
            </td>
            <td class="col-default-cell">
              ${col.defaultValue
                ? `<code class="default-val-pill">${escapeHtml(col.defaultValue)}</code>`
                : '<span class="default-empty">—</span>'}
            </td>
          </tr>
        `;
        })
        .join('');

      // Inbound relationships from other tables
      const allRels = state.schemaData.relationships || [];
      const inboundRels = allRels.filter((r) => r.toTable === table.name);

      // Foreign Keys Outbound HTML
      let outboundFkHtml = '';
      if (table.foreignKeys.length > 0) {
        outboundFkHtml = `
          <div class="fk-list-group">
            <h4 class="fk-group-title">Outbound Foreign Keys (References from this table)</h4>
            <div class="rel-cards-list">
              ${table.foreignKeys
                .map(
                  (fk) => `
                <div class="rel-flow-card">
                  <div class="rel-endpoint">
                    <span class="rel-point-label">Origin</span>
                    <span class="rel-col-highlight">${escapeHtml(fk.fromColumn)}</span>
                  </div>
                  <div class="rel-connector">
                    <span class="rel-arrow-line"></span>
                    <span class="rel-verb">references</span>
                    <span class="rel-arrow-head">&rarr;</span>
                  </div>
                  <div class="rel-endpoint">
                    <span class="rel-point-label">Target Table</span>
                    <span class="rel-target-table" data-jump-table="${escapeHtml(fk.toTable)}">${escapeHtml(fk.toTable)}</span>
                    <span class="rel-target-col">(${escapeHtml(fk.toColumn)})</span>
                  </div>
                  <div class="rel-rule-badge">
                    <span>ON DELETE</span>
                    <strong>${escapeHtml(fk.onDelete || 'NO ACTION')}</strong>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `;
      }

      // Foreign Keys Inbound HTML
      let inboundFkHtml = '';
      if (inboundRels.length > 0) {
        inboundFkHtml = `
          <div class="fk-list-group" style="margin-top: 14px;">
            <h4 class="fk-group-title">Inbound References (Referenced by other tables)</h4>
            <div class="rel-cards-list">
              ${inboundRels
                .map(
                  (r) => `
                <div class="rel-flow-card inbound">
                  <div class="rel-endpoint">
                    <span class="rel-point-label">Referenced By</span>
                    <span class="rel-target-table" data-jump-table="${escapeHtml(r.fromTable)}">${escapeHtml(r.fromTable)}</span>
                    <span class="rel-target-col">(${escapeHtml(r.fromColumn)})</span>
                  </div>
                  <div class="rel-connector">
                    <span class="rel-arrow-line"></span>
                    <span class="rel-verb">points to</span>
                    <span class="rel-arrow-head">&rarr;</span>
                  </div>
                  <div class="rel-endpoint">
                    <span class="rel-point-label">Target Column</span>
                    <span class="rel-col-highlight">${escapeHtml(r.toColumn)}</span>
                  </div>
                  <div class="rel-rule-badge">
                    <span>ON DELETE</span>
                    <strong>${escapeHtml(r.onDelete || 'NO ACTION')}</strong>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `;
      }

      const totalFkCount = table.foreignKeys.length + inboundRels.length;
      const fksSectionContent = totalFkCount > 0
        ? `${outboundFkHtml}${inboundFkHtml}`
        : `<div class="explorer-empty-card">No foreign key constraints defined on this table.</div>`;

      // Indexes HTML
      const indexesHtml =
        table.indexes.length > 0
          ? `<div class="index-cards-grid">
              ${table.indexes
                .map(
                  (idx) => `
                <div class="index-item-card">
                  <div class="index-item-header">
                    <span class="index-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 2a4 4 0 0 0-4 4c0 .44.07.86.2 1.25L2 11.45V14h2.55l1.2-1.2h1.5v-1.5h1.5l.5-.5c.39.13.81.2 1.25.2a4 4 0 1 0 0-8z"/>
                        <circle cx="11.5" cy="4.5" r=".75" fill="currentColor"/>
                      </svg>
                    </span>
                    <span class="index-name">${escapeHtml(idx.name)}</span>
                    ${idx.name.endsWith('_pkey') ? '<span class="idx-pk-tag">PRIMARY KEY</span>' : '<span class="idx-btree-tag">BTREE</span>'}
                  </div>
                  <pre class="index-def-code"><code>${escapeHtml(idx.definition)}</code></pre>
                </div>
              `
                )
                .join('')}
            </div>`
          : '<div class="explorer-empty-card">No indexes found for this table.</div>';

      tableDetailEl.innerHTML = `
        <div class="explorer-detail-wrap">
          <!-- 1. Hero Object Overview Card -->
          <div class="explorer-card overview-hero-card">
            <div class="overview-header-row">
              <div class="overview-title-group">
                <div class="overview-schema-path">
                  <span class="schema-tag">public</span>
                  <span class="path-sep">/</span>
                  <h2 class="overview-table-title">${escapeHtml(table.name)}</h2>
                  <span class="explorer-type-tag ${table.type === 'VIEW' ? 'tag-view' : 'tag-base'}">${escapeHtml(table.type || 'BASE TABLE')}</span>
                </div>
                <div class="overview-quick-metrics">
                  <div class="metric-chip">
                    <span class="metric-val">${table.columns.length}</span>
                    <span class="metric-lbl">Columns</span>
                  </div>
                  <div class="metric-chip">
                    <span class="metric-val">${table.primaryKeys.length}</span>
                    <span class="metric-lbl">${table.primaryKeys.length === 1 ? 'Primary Key' : 'Primary Keys'}</span>
                  </div>
                  <div class="metric-chip">
                    <span class="metric-val">${table.foreignKeys.length}</span>
                    <span class="metric-lbl">Foreign Keys</span>
                  </div>
                  <div class="metric-chip">
                    <span class="metric-val">${table.indexes.length}</span>
                    <span class="metric-lbl">Indexes</span>
                  </div>
                </div>
              </div>

              <div class="overview-actions">
                <button type="button" class="explorer-action-btn view-data-btn" data-table="${escapeHtml(table.name)}" title="Browse this table in the spreadsheet grid">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
                    <path d="M2 6h12M6 6v8" stroke="currentColor" stroke-width="1.2"/>
                  </svg>
                  <span>Open in Data Grid &rarr;</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Columns Table Card -->
          <div class="explorer-card">
            <div class="card-section-head">
              <div class="sec-title-group">
                <h3 class="card-sec-title">Columns</h3>
                <span class="sec-count-badge">${table.columns.length} attributes</span>
              </div>
            </div>
            <div class="columns-table-container">
              <table class="explorer-columns-table">
                <thead>
                  <tr>
                    <th class="th-idx">#</th>
                    <th class="th-key">Key</th>
                    <th class="th-name">Column Name</th>
                    <th class="th-type">Data Type</th>
                    <th class="th-nullable">Nullability</th>
                    <th class="th-default">Default Expression</th>
                  </tr>
                </thead>
                <tbody>
                  ${columnsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. Foreign Key Relationships Card -->
          <div class="explorer-card">
            <div class="card-section-head">
              <div class="sec-title-group">
                <h3 class="card-sec-title">Relational Constraints</h3>
                <span class="sec-count-badge">${totalFkCount} links</span>
              </div>
            </div>
            <div class="card-section-body">
              ${fksSectionContent}
            </div>
          </div>

          <!-- 4. Indexes Card -->
          <div class="explorer-card">
            <div class="card-section-head">
              <div class="sec-title-group">
                <h3 class="card-sec-title">Indexes &amp; Performance Keys</h3>
                <span class="sec-count-badge">${table.indexes.length} indexes</span>
              </div>
            </div>
            <div class="card-section-body">
              ${indexesHtml}
            </div>
          </div>
        </div>
      `;

      // Jump to table event listeners
      tableDetailEl.querySelectorAll('[data-jump-table]').forEach((el) => {
        el.addEventListener('click', () => {
          const targetTable = el.dataset.jumpTable;
          if (targetTable && state.schemaData?.tables?.some((t) => t.name === targetTable)) {
            state.selectedTable = targetTable;
            renderTablesList();
            renderTableDetail();
          }
        });
      });

      // View Data button listener
      const viewDataBtn = tableDetailEl.querySelector('.view-data-btn');
      if (viewDataBtn) {
        viewDataBtn.addEventListener('click', () => {
          if (typeof callbacks.onOpenTable === 'function') {
            callbacks.onOpenTable(table.name);
          }
        });
      }
    }

    function renderRelationships() {
      if (!relationshipsEl) return;
      const rels = state.schemaData?.relationships || [];
      const globalCard = relationshipsEl.closest('.global-rel-card');

      if (globalCountBadge) {
        globalCountBadge.textContent = `${rels.length} relationship${rels.length === 1 ? '' : 's'} in schema`;
      }

      // Hide the redundant global relationship card when actively inspecting a specific table's details,
      // eliminating the redundant divider and duplicate relationship list beneath the table's cards.
      if (state.selectedTable || rels.length === 0) {
        if (globalCard) globalCard.classList.add('hidden');
        return;
      }
      if (globalCard) globalCard.classList.remove('hidden');

      relationshipsEl.innerHTML = `
        <div class="rel-global-grid">
          ${rels
            .map(
              (r) => `
            <div class="rel-global-card">
              <div class="rel-global-main">
                <div class="rel-global-node" data-jump-table="${escapeHtml(r.fromTable)}" title="Click to view ${escapeHtml(r.fromTable)}">
                  <span class="rel-global-table">${escapeHtml(r.fromTable)}</span>
                  <span class="rel-global-col">.${escapeHtml(r.fromColumn)}</span>
                </div>
                <div class="rel-global-arrow" aria-hidden="true">&rarr;</div>
                <div class="rel-global-node" data-jump-table="${escapeHtml(r.toTable)}" title="Click to view ${escapeHtml(r.toTable)}">
                  <span class="rel-global-table">${escapeHtml(r.toTable)}</span>
                  <span class="rel-global-col">.${escapeHtml(r.toColumn)}</span>
                </div>
              </div>
              <div class="rel-global-rule">ON DELETE ${escapeHtml(r.onDelete || 'NO ACTION')}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      relationshipsEl.querySelectorAll('[data-jump-table]').forEach((node) => {
        node.addEventListener('click', () => {
          const targetTable = node.dataset.jumpTable;
          if (targetTable && state.schemaData?.tables?.some((t) => t.name === targetTable)) {
            state.selectedTable = targetTable;
            renderTablesList();
            renderTableDetail();
          }
        });
      });
    }

    function render() {
      renderTablesList();
      renderTableDetail();
      renderRelationships();
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.filterQuery = e.target.value;
        if (searchClearBtn) {
          searchClearBtn.classList.toggle('hidden', !e.target.value);
        }
        renderTablesList();
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          state.filterQuery = '';
          searchClearBtn.classList.add('hidden');
          searchInput.focus();
          renderTablesList();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const target =
          typeof callbacks.getTarget === 'function'
            ? callbacks.getTarget()
            : 'default';
        loadSchema(target);
      });
    }

    return {
      loadSchema,
      render,
    };
  }

  return {
    createExplorerController,
  };
})();
