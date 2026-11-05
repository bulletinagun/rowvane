// CSV import/export controller
window.RowvaneImportExport = (function () {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initImportExport(dom, callbacks = {}) {
    let parsedCsv = null; // { headers: [], rows: [] }

    const importModal = dom.csvImportModal;
    const fileInput = dom.csvFileInput;
    const dropZone = dom.csvDropZone;
    const previewArea = dom.csvPreviewArea;
    const mappingArea = dom.csvMappingArea;
    const executeBtn = dom.csvExecuteImportBtn;
    const headerCloseBtn = dom.csvCancelImportBtn || importModal?.querySelector('#csvCancelImportBtn');
    const footerCancelBtn = dom.csvModalCancelBtn || importModal?.querySelector('#csvModalCancelBtn');
    const newTableRadio = dom.csvModeNewTable;
    const existingTableRadio = dom.csvModeExistingTable;
    const tableNameInput = dom.csvTargetTableName;
    const existingTableSelect = dom.csvExistingTableSelect;
    let lastTrigger = null;

    function setModalOrigin(trigger) {
      if (!importModal) return;
      const box = importModal.querySelector('.modal-box');
      const trg = trigger || lastTrigger || dom.importCsvToolbarBtn || dom.sidebarCsvDropBtn;
      if (box && trg) {
        lastTrigger = trg;
        const trgRect = trg.getBoundingClientRect();
        if (trgRect.width === 0 && trgRect.height === 0) {
          box.style.setProperty('--modal-origin-x', '50%');
          box.style.setProperty('--modal-origin-y', '50%');
          return;
        }
        const boxWidth = box.offsetWidth || 650;
        const boxHeight = box.offsetHeight || 420;
        const untransformedBoxLeft = (window.innerWidth - boxWidth) / 2;
        const untransformedBoxTop = (window.innerHeight - boxHeight) / 2;

        const originX = (trgRect.left + trgRect.width / 2) - untransformedBoxLeft;
        const originY = (trgRect.top + trgRect.height / 2) - untransformedBoxTop;
        box.style.setProperty('--modal-origin-x', `${Math.round(originX)}px`);
        box.style.setProperty('--modal-origin-y', `${Math.round(originY)}px`);
      }
    }

    function openModal(trigger) {
      if (!importModal) return;
      const trg = (trigger && trigger.target) ? trigger.currentTarget : (trigger || dom.importCsvToolbarBtn || dom.sidebarCsvDropBtn);
      setModalOrigin(trg);
      importModal.classList.remove('hidden');
      resetModalState();
      populateExistingTables();
    }

    function closeModal() {
      if (!importModal) return;
      setModalOrigin();
      importModal.classList.add('hidden');
      resetModalState();
    }

    function resetModalState() {
      parsedCsv = null;
      if (fileInput) fileInput.value = '';
      if (previewArea) previewArea.innerHTML = '';
      if (mappingArea) mappingArea.innerHTML = '';
      if (executeBtn) executeBtn.disabled = true;
      if (tableNameInput) tableNameInput.value = '';
    }

    function populateExistingTables() {
      if (!existingTableSelect) return;
      const tables = typeof callbacks.getExistingTables === 'function' ? callbacks.getExistingTables() : [];
      existingTableSelect.innerHTML = tables
        .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
        .join('');
    }

    function parseCsvFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        // Parse CSV using PapaParse if available, else simple line splitter
        let results = null;
        if (window.Papa) {
          results = window.Papa.parse(text, { skipEmptyLines: true });
        } else {
          // Fallback parser
          const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
          const rows = lines.map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '')));
          results = { data: rows };
        }

        if (!results.data || results.data.length === 0) {
          alert('CSV file is empty.');
          return;
        }

        const headers = results.data[0].map((h) => String(h || '').trim());
        const rows = results.data.slice(1);
        parsedCsv = { headers, rows, filename: file.name };

        // Default table name from file name
        const baseName = file.name
          .replace(/\.csv$/i, '')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/^(\d)/, 'table_$1');
        if (tableNameInput) tableNameInput.value = baseName;

        await renderPreviewAndMapping(headers, rows);
      };
      reader.readAsText(file);
    }

    async function renderPreviewAndMapping(headers, rows) {
      if (!previewArea || !mappingArea) return;
      previewArea.innerHTML = '<span class="spin">Analyzing CSV columns and inferring types…</span>';

      try {
        const previewData = await window.RowvaneAPI.previewCsv(headers, rows);
        const inferredCols = previewData.columns || [];

        // 1. Preview Table (First 5 rows)
        const sampleRows = rows.slice(0, 5);
        const headersHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
        const rowsHtml = sampleRows
          .map(
            (r) =>
              `<tr>${headers.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('')}</tr>`
          )
          .join('');

        previewArea.innerHTML = `
          <div class="csv-preview-summary">
            Detected <strong>${headers.length} columns</strong> and <strong>${rows.length.toLocaleString()} rows</strong> in <em>${escapeHtml(parsedCsv.filename)}</em>.
          </div>
          <div class="csv-preview-table-wrap">
            <table class="csv-preview-table">
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;

        // 2. Mapping Configuration
        mappingArea.innerHTML = `
          <h4 class="csv-map-title">Column Type & Mapping Configuration</h4>
          <table class="csv-map-table">
            <thead>
              <tr>
                <th>Source Header</th>
                <th>Target Column Name</th>
                <th>PostgreSQL Type</th>
              </tr>
            </thead>
            <tbody>
              ${inferredCols
                .map(
                  (col, idx) => `
                <tr>
                  <td><code>${escapeHtml(col.sourceHeader)}</code></td>
                  <td>
                    <input type="text" class="csv-col-name-input" data-idx="${idx}" value="${escapeHtml(col.suggestedColumn)}" />
                  </td>
                  <td>
                    <select class="csv-col-type-select" data-idx="${idx}">
                      <option value="TEXT" ${col.inferredType === 'TEXT' ? 'selected' : ''}>TEXT</option>
                      <option value="INTEGER" ${col.inferredType === 'INTEGER' ? 'selected' : ''}>INTEGER</option>
                      <option value="BIGINT" ${col.inferredType === 'BIGINT' ? 'selected' : ''}>BIGINT</option>
                      <option value="NUMERIC(14, 2)" ${col.inferredType.startsWith('NUMERIC') ? 'selected' : ''}>NUMERIC</option>
                      <option value="BOOLEAN" ${col.inferredType === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                      <option value="TIMESTAMPTZ" ${col.inferredType === 'TIMESTAMPTZ' ? 'selected' : ''}>TIMESTAMPTZ</option>
                    </select>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;

        if (executeBtn) executeBtn.disabled = false;
      } catch (err) {
        previewArea.innerHTML = `<div class="lab-error">Failed to analyze CSV: ${escapeHtml(err.message)}</div>`;
      }
    }

    async function handleExecuteImport() {
      if (!parsedCsv) return;
      const isNewTable = newTableRadio ? newTableRadio.checked : true;
      const targetTable = isNewTable
        ? tableNameInput?.value?.trim()
        : existingTableSelect?.value;

      if (!targetTable) {
        alert('Please specify a target table name.');
        return;
      }

      // Collect column mappings
      const colNameInputs = mappingArea.querySelectorAll('.csv-col-name-input');
      const colTypeSelects = mappingArea.querySelectorAll('.csv-col-type-select');

      const columns = [];
      colNameInputs.forEach((input) => {
        const idx = parseInt(input.dataset.idx, 10);
        const name = input.value.trim();
        const type = colTypeSelects[idx]?.value || 'TEXT';
        columns.push({ name, type, sourceIndex: idx });
      });

      const target = typeof callbacks.getTarget === 'function' ? callbacks.getTarget() : 'default';

      if (executeBtn) {
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<span class="spin">Importing…</span>';
      }

      try {
        const result = await window.RowvaneAPI.importCsv({
          tableName: targetTable,
          createNewTable: isNewTable,
          columns,
          rows: parsedCsv.rows,
          nullAsEmpty: true,
          target,
        });

        closeModal();
        if (typeof callbacks.showToast === 'function') {
          callbacks.showToast(
            `Successfully imported ${result.importedRows.toLocaleString()} rows into "${result.table}" (${result.durationMs}ms)!`
          );
        }
        if (typeof callbacks.onImportCompleted === 'function') {
          callbacks.onImportCompleted(result.table);
        }
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      } finally {
        if (executeBtn) {
          executeBtn.disabled = false;
          executeBtn.innerHTML = '<span>Execute Import</span>';
        }
      }
    }

    // Wire Event Listeners
    if (dom.importCsvToolbarBtn) {
      dom.importCsvToolbarBtn.addEventListener('click', openModal);
    }
    if (dom.sidebarCsvDropBtn) {
      dom.sidebarCsvDropBtn.addEventListener('click', openModal);
      dom.sidebarCsvDropBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      });

      dom.sidebarCsvDropBtn.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.sidebarCsvDropBtn.classList.add('drag-over');
      });
      dom.sidebarCsvDropBtn.addEventListener('dragleave', () => {
        dom.sidebarCsvDropBtn.classList.remove('drag-over');
      });
      dom.sidebarCsvDropBtn.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.sidebarCsvDropBtn.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;

        const isCsv =
          file.name.toLowerCase().endsWith('.csv') ||
          file.type.includes('csv') ||
          file.type === 'text/plain';

        if (!isCsv) {
          const msg =
            'Currently, Rowvane supports CSV (.csv) file imports. Support for additional formats is planned.';
          if (typeof callbacks.showToast === 'function') {
            callbacks.showToast(msg);
          } else {
            alert(msg);
          }
          return;
        }

        // Open modal with preview and column mapping workflow before committing
        openModal();
        parseCsvFile(file);
      });
    }
    if (headerCloseBtn) {
      headerCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }
    if (footerCancelBtn) {
      footerCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }
    if (importModal) {
      importModal.addEventListener('click', (e) => {
        if (e.target === importModal) {
          e.preventDefault();
          closeModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && importModal && !importModal.classList.contains('hidden')) {
        e.preventDefault();
        closeModal();
      }
    });
    if (executeBtn) {
      executeBtn.addEventListener('click', handleExecuteImport);
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.[0]) parseCsvFile(e.target.files[0]);
      });
    }

    // Wire Drag and Drop
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files?.[0]) {
          parseCsvFile(e.dataTransfer.files[0]);
        }
      });
    }

    return {
      openModal,
      closeModal,
      isOpen: () => importModal && !importModal.classList.contains('hidden'),
    };
  }

  return {
    initImportExport,
  };
})();
