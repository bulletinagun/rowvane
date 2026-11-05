// Process runner for external tools (pg_dump, psql)
const { spawn } = require('child_process');

/**
 * Spawns an external utility process safely without shell interpolation.
 * @param {string} command - Path or name of executable (e.g. 'pg_dump', 'psql')
 * @param {string[]} args - Array of command-line arguments
 * @param {Object} options - Execution options
 * @param {string} [options.password] - Database password (injected via PGPASSWORD env)
 * @param {string} [options.stdin] - Input data to pipe to stdin
 * @param {number} [options.timeoutMs=60000] - Process timeout in milliseconds
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, durationMs: number }>}
 */
function runProcessSafe(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const env = { ...process.env };
    if (options.password) {
      env.PGPASSWORD = options.password;
    }

    const proc = spawn(command, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
      reject(
        new Error(`Process "${command}" timed out after ${options.timeoutMs || 60000}ms`)
      );
    }, options.timeoutMs || 60000);

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf8');
    });

    if (options.stdin) {
      proc.stdin.write(options.stdin);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }

    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (!timedOut) reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) return;

      const durationMs = Date.now() - startTime;
      if (code !== 0) {
        const err = new Error(
          stderrData.trim() || `Process "${command}" exited with code ${code}`
        );
        err.exitCode = code;
        err.stderr = stderrData;
        err.stdout = stdoutData;
        err.durationMs = durationMs;
        return reject(err);
      }

      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        exitCode: code,
        durationMs,
      });
    });
  });
}

/**
 * Check if a CLI command is available on PATH and return its version.
 * @param {string} binary
 * @returns {Promise<{ available: boolean, version?: string, error?: string }>}
 */
async function checkBinaryVersion(binary) {
  try {
    const result = await runProcessSafe(binary, ['--version'], { timeoutMs: 5000 });
    return {
      available: true,
      version: result.stdout.trim() || result.stderr.trim(),
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
    };
  }
}

module.exports = {
  runProcessSafe,
  checkBinaryVersion,
};
