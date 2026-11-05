// Backup and restore modal controller
window.RowvaneBackupRestore = (function () {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initBackupRestore(dom, callbacks = {}) {
    const modal = dom.backupRestoreModal;
    const triggerBtn = dom.backupRestoreTriggerBtn;
    const closeBtn = dom.backupRestoreCloseBtn;
    const footerCloseBtn = dom.backupModalCloseBtn || modal?.querySelector('#backupModalCloseBtn');
    const utilityStatusArea = dom.backupUtilityStatus;
    const downloadSqlBackupBtn = dom.downloadSqlBackupBtn;
    const downloadDumpBackupBtn = dom.downloadDumpBackupBtn;
    const restoreFileInput = dom.restoreFileInput;
    const restorePreviewArea = dom.restorePreviewArea;
    const executeRestoreBtn = dom.executeRestoreBtn;

    let pendingRestore = null; // { format: 'sql'|'custom', payload: string, fileName: string, fileSize: number }
    let isRestoring = false;

    function setModalOrigin() {
      if (!modal) return;
      const box = modal.querySelector('.modal-box');
      const trigger = triggerBtn || dom.backupRestoreTriggerBtn;
      if (box && trigger) {
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
    }

    async function openModal() {
      if (!modal) return;
      setModalOrigin();
      modal.classList.remove('hidden');

      const target = typeof callbacks.getTarget === 'function' ? callbacks.getTarget() : 'default';
      const titleEl = modal.querySelector('#backupModalTitle');
      const subtitleEl = modal.querySelector('.modal-subtitle');
      const targetLabel = target === 'playground'
        ? 'Playground Database (rowvane_playground)'
        : target.startsWith('conn_')
        ? `External Database (${target})`
        : 'Default Database (rowvane)';

      if (titleEl) {
        titleEl.textContent = `Backup & Restore — ${target === 'playground' ? 'Playground' : target.startsWith('conn_') ? 'External' : 'Default'}`;
      }
      if (subtitleEl) {
        subtitleEl.textContent = `Native PostgreSQL backup creation and safe restoration for ${targetLabel}.`;
      }

      await checkUtilities();
    }

    function closeModal() {
      if (!modal || isRestoring) return;
      setModalOrigin();
      modal.classList.add('hidden');
      pendingRestore = null;
      if (restoreFileInput) restoreFileInput.value = '';
      if (restorePreviewArea) restorePreviewArea.innerHTML = '';
      if (executeRestoreBtn) executeRestoreBtn.disabled = true;
    }

    async function checkUtilities() {
      if (!utilityStatusArea) return;
      utilityStatusArea.innerHTML = `<span class="spin">Checking native PostgreSQL utilities…</span>`;
      try {
        const data = await window.RowvaneAPI.getBackupUtilities();
        const okSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>';
        const errSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        utilityStatusArea.innerHTML = `
          <div class="util-status-row">
            <span class="util-badge ${data.pgDump.available ? 'util-ok' : 'util-err'}">
              ${data.pgDump.available ? okSvg : errSvg}pg_dump
            </span>
            <span class="util-badge ${data.pgRestore.available ? 'util-ok' : 'util-err'}">
              ${data.pgRestore.available ? okSvg : errSvg}pg_restore
            </span>
            <span class="util-badge ${data.psql.available ? 'util-ok' : 'util-err'}">
              ${data.psql.available ? okSvg : errSvg}psql
            </span>
          </div>
          <div class="util-version-text">
            ${data.pgDump.available ? escapeHtml(data.pgDump.version) : 'Note: Install PostgreSQL CLI tools to enable native dumps.'}
          </div>
        `;
      } catch (err) {
        utilityStatusArea.innerHTML = `<div class="lab-error">Utility check failed: ${escapeHtml(err.message)}</div>`;
      }
    }

    function triggerBackupDownload(format) {
      const target = typeof callbacks.getTarget === 'function' ? callbacks.getTarget() : 'default';
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/backup-restore/backup';
      form.target = '_blank';

      const inputTarget = document.createElement('input');
      inputTarget.type = 'hidden';
      inputTarget.name = 'target';
      inputTarget.value = target;
      form.appendChild(inputTarget);

      const inputFormat = document.createElement('input');
      inputFormat.type = 'hidden';
      inputFormat.name = 'format';
      inputFormat.value = format;
      form.appendChild(inputFormat);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    }

    function handleFileSelection(file) {
      if (!file) return;
      const isCustomDump = file.name.endsWith('.dump') || file.type === 'application/octet-stream';
      const sizeKb = (file.size / 1024).toFixed(1);

      if (isCustomDump) {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingRestore = {
            format: 'custom',
            payload: e.target.result, // DataURL base64 string
            fileName: file.name,
            fileSize: file.size,
          };

          if (restorePreviewArea) {
            restorePreviewArea.innerHTML = `
              <div class="restore-file-info" style="display:flex; justify-content:space-between; align-items:center;">
                <span>File: <strong>${escapeHtml(file.name)}</strong> (${sizeKb} KB)</span>
                <span class="col-type-badge" style="background:rgba(167,139,250,0.15); color:#c4b5fd; border:1px solid rgba(167,139,250,0.3);">Custom Dump (.dump)</span>
              </div>
              <div style="margin-top:8px; padding:10px; background:#0d0c15; border-radius:4px; font-size:11px; color:#9c9cb2; border:1px solid #252438;">
                Native compressed PostgreSQL archive. Restoration will execute via <code>pg_restore --clean --if-exists</code> into the target database.
              </div>
            `;
          }
          if (executeRestoreBtn) executeRestoreBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingRestore = {
            format: 'sql',
            payload: e.target.result,
            fileName: file.name,
            fileSize: file.size,
          };

          if (restorePreviewArea) {
            const previewLines = e.target.result.split('\n').slice(0, 15).join('\n');
            restorePreviewArea.innerHTML = `
              <div class="restore-file-info" style="display:flex; justify-content:space-between; align-items:center;">
                <span>File: <strong>${escapeHtml(file.name)}</strong> (${sizeKb} KB)</span>
                <span class="col-type-badge" style="background:rgba(52,211,153,0.15); color:#6ee7b7; border:1px solid rgba(52,211,153,0.3);">Plain SQL (.sql)</span>
              </div>
              <pre class="restore-sql-preview"><code>${escapeHtml(previewLines)}\n...</code></pre>
            `;
          }
          if (executeRestoreBtn) executeRestoreBtn.disabled = false;
        };
        reader.readAsText(file);
      }
    }

    async function handleExecuteRestore() {
      if (!pendingRestore) return;
      const target = typeof callbacks.getTarget === 'function' ? callbacks.getTarget() : 'default';
      const targetName = target === 'playground'
        ? 'Playground Database ("rowvane_playground")'
        : target.startsWith('conn_')
        ? `External Connection ("${target}")`
        : 'Default Database ("rowvane")';

      const toolName = pendingRestore.format === 'custom' ? 'pg_restore' : 'psql';
      const confirmed = window.confirm(
        `WARNING: Destructive Database Restoration\n\nTarget: ${targetName}\nFormat: ${pendingRestore.format.toUpperCase()} via native ${toolName}\nFile: ${pendingRestore.fileName}\n\nExisting tables and data in this database may be dropped or overwritten.\n\nDo you want to proceed with this restoration?`
      );
      if (!confirmed) return;

      isRestoring = true;
      if (executeRestoreBtn) {
        executeRestoreBtn.disabled = true;
        executeRestoreBtn.innerHTML = `<span class="spin"></span> Restoring via ${toolName}…`;
      }

      try {
        const res = await window.RowvaneAPI.restoreDatabase(target, {
          format: pendingRestore.format,
          payload: pendingRestore.payload,
        });

        alert(`Restoration Successful!\n\nDatabase: ${res.database}\nFormat: ${res.format}\nDuration: ${res.durationMs}ms\n\n${res.notes || ''}`);
        isRestoring = false;
        closeModal();
        if (typeof callbacks.onRestoreCompleted === 'function') {
          callbacks.onRestoreCompleted();
        }
      } catch (err) {
        alert(`Restoration Failed: ${err.message || 'Operation failed'}`);
      } finally {
        isRestoring = false;
        if (executeRestoreBtn) {
          executeRestoreBtn.disabled = false;
          executeRestoreBtn.innerHTML = '<span>Execute Restore</span>';
        }
      }
    }

    if (triggerBtn) triggerBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeModal);
    if (downloadSqlBackupBtn) {
      downloadSqlBackupBtn.addEventListener('click', () => triggerBackupDownload('sql'));
    }
    if (downloadDumpBackupBtn) {
      downloadDumpBackupBtn.addEventListener('click', () => triggerBackupDownload('custom'));
    }
    if (restoreFileInput) {
      restoreFileInput.addEventListener('change', (e) => {
        if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
      });
    }
    if (executeRestoreBtn) {
      executeRestoreBtn.addEventListener('click', handleExecuteRestore);
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && !isRestoring) closeModal();
      });
    }

    return {
      openModal,
      closeModal,
      isOpen: () => modal && !modal.classList.contains('hidden'),
      isRestoring: () => isRestoring,
    };
  }

  return {
    initBackupRestore,
  };
})();
