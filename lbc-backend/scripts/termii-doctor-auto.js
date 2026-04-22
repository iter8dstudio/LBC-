require('dotenv').config();

const { spawnSync } = require('child_process');

const enabled = String(process.env.TERMII_DOCTOR_AUTORUN || '').toLowerCase() === 'true';
const strictMode = String(process.env.TERMII_DOCTOR_STRICT || '').toLowerCase() === 'true';

if (!enabled) {
  console.log('[Termii Doctor] Auto-run disabled (set TERMII_DOCTOR_AUTORUN=true to enable).');
  process.exit(0);
}

console.log('[Termii Doctor] Auto-run enabled. Running diagnostics...');

const result = spawnSync(process.execPath, ['scripts/termii-doctor.js'], {
  stdio: 'inherit',
  env: process.env,
});

const exitCode = Number.isInteger(result.status) ? result.status : 1;

if (exitCode !== 0) {
  if (strictMode) {
    console.error(`[Termii Doctor] Failed with code ${exitCode}. TERMII_DOCTOR_STRICT=true, aborting startup.`);
    process.exit(exitCode);
  }

  console.warn(
    `[Termii Doctor] Failed with code ${exitCode}, but TERMII_DOCTOR_STRICT is not enabled. Continuing startup.`
  );
}

process.exit(0);
