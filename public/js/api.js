// API client for backend requests
window.RowvaneAPI = (function () {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = { error: await response.text() };
    }

    if (!response.ok) {
      const errMsg =
        typeof payload?.error === 'string'
          ? payload.error
          : payload?.error?.message || `Request failed with HTTP ${response.status}`;
      const error = new Error(errMsg);
      error.status = response.status;
      error.code = payload?.error?.code;
      error.position = payload?.error?.position;
      error.details = payload?.details;
      error.rawPayload = payload;
      throw error;
    }

    return payload;
  }

  return {
    getHealth(target = 'default') {
      return request(`/api/health?target=${encodeURIComponent(target)}`);
    },

    getTables(target = 'default') {
      return request(`/api/tables?target=${encodeURIComponent(target)}`);
    },

    getTableRows(
      tableName,
      { limit = 250, offset = 0, sort, dir, target = 'default' } = {}
    ) {
      const encodedTable = encodeURIComponent(tableName);
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        target,
      });
      if (sort) params.set('sort', sort);
      if (dir) params.set('dir', dir);
      return request(`/api/tables/${encodedTable}/rows?${params.toString()}`);
    },

    updateTableRow(tableName, pks, updates, target = 'default') {
      const encodedTable = encodeURIComponent(tableName);
      return request(`/api/tables/${encodedTable}/rows?target=${encodeURIComponent(target)}`, {
        method: 'PATCH',
        body: JSON.stringify({ pks, updates, target }),
      });
    },

    insertTableRow(tableName, row, target = 'default') {
      const encodedTable = encodeURIComponent(tableName);
      return request(`/api/tables/${encodedTable}/rows?target=${encodeURIComponent(target)}`, {
        method: 'POST',
        body: JSON.stringify({ row, target }),
      });
    },

    deleteTableRow(tableName, pks, target = 'default') {
      const encodedTable = encodeURIComponent(tableName);
      return request(`/api/tables/${encodedTable}/rows?target=${encodeURIComponent(target)}`, {
        method: 'DELETE',
        body: JSON.stringify({ pks, target }),
      });
    },

    executeQuery(sql, target = 'default', queryId = null) {
      return request('/api/query', {
        method: 'POST',
        body: JSON.stringify({ sql, target, queryId }),
      });
    },

    async exportTableCsv(tableName, target = 'default') {
      const encodedTable = encodeURIComponent(tableName);
      const response = await fetch(
        `/api/tables/${encodedTable}/export?target=${encodeURIComponent(target)}`,
        {
          headers: { Accept: 'text/csv, application/json' },
        }
      );

      if (!response.ok) {
        let errPayload = null;
        try {
          errPayload = await response.json();
        } catch (_e) {
          errPayload = { error: await response.text() };
        }
        const error = new Error(
          errPayload?.error || `Export failed with HTTP ${response.status}`
        );
        error.status = response.status;
        throw error;
      }

      const blob = await response.blob();
      const totalRows = response.headers.get('X-Total-Rows');
      const exportedRows = response.headers.get('X-Exported-Rows');
      const disposition = response.headers.get('Content-Disposition') || '';
      let filename = `${tableName}.csv`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch (_e) {
          filename = match[1];
        }
      }
      return {
        blob,
        filename,
        totalRows: Number(totalRows) || null,
        exportedRows: Number(exportedRows) || null,
      };
    },

    // Workspace endpoints
    getPlaygroundDemos(category) {
      const q = category ? `?category=${encodeURIComponent(category)}` : '';
      return request(`/api/playground/demos${q}`);
    },

    getPlaygroundStatus() {
      return request('/api/playground/status');
    },

    resetPlayground() {
      return request('/api/playground/reset', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
    },

    runConcurrencyLockDemo() {
      return request('/api/playground/concurrency/lock-demo', {
        method: 'POST',
      });
    },

    runPerformanceBenchmark() {
      return request('/api/playground/performance/benchmark', {
        method: 'POST',
      });
    },

    getDatabaseSchema(target = 'default') {
      return request(`/api/explorer/schema?target=${encodeURIComponent(target)}`);
    },

    previewCsv(headers, rows) {
      return request('/api/import-export/csv/preview', {
        method: 'POST',
        body: JSON.stringify({ headers, rows }),
      });
    },

    importCsv(payload) {
      return request('/api/import-export/csv/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getBackupUtilities() {
      return request('/api/backup-restore/utilities');
    },

    cancelQuery(queryId, pid, target = 'default') {
      return request('/api/query/cancel', {
        method: 'POST',
        body: JSON.stringify({ queryId, pid, target }),
      });
    },

    generateWorkload(preset = 'small', customRows) {
      return request('/api/playground/generate-workload', {
        method: 'POST',
        body: JSON.stringify({ preset, customRows }),
      });
    },

    purgeWorkload() {
      return request('/api/playground/generate-workload', {
        method: 'DELETE',
      });
    },

    restoreDatabase(target, { format = 'sql', payload, sqlScript } = {}) {
      return request('/api/backup-restore/restore', {
        method: 'POST',
        body: JSON.stringify({
          target,
          confirm: true,
          format,
          payload: payload || sqlScript,
          sqlScript: sqlScript || payload,
        }),
      });
    },

    restoreSql(target, sqlScript) {
      return this.restoreDatabase(target, { format: 'sql', sqlScript });
    },

    // Custom connections
    testConnection(payload) {
      return request('/api/connections/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    connectDatabase(payload) {
      return request('/api/connections/connect', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getConnections() {
      return request('/api/connections');
    },

    disconnectDatabase(connectionId) {
      return request('/api/connections/disconnect', {
        method: 'POST',
        body: JSON.stringify({ connectionId }),
      });
    },
  };
})();
