import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'worker', 'migrations');
const wranglerEntrypoint = path.join(rootDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

const args = process.argv.slice(2);
let database = 'zenkai';
const wranglerArgs = [];

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--database' || arg === '--db') {
    database = args[i + 1];
    i += 1;
    continue;
  }
  wranglerArgs.push(arg);
}

function runWrangler(extraArgs, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [wranglerEntrypoint, 'd1', 'execute', database, ...wranglerArgs, ...extraArgs], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n').trim();
    throw new Error(detail || `wrangler failed with exit code ${result.status}`);
  }

  return result.stdout || '';
}

function queryJson(sql) {
  const raw = runWrangler(['--command', sql, '--json'], { capture: true });
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0]?.results || [] : [];
  } catch (error) {
    throw new Error(`Unable to parse JSON query output for "${sql}": ${error.message}\n${raw}`);
  }
}

runWrangler([
  '--command',
  `CREATE TABLE IF NOT EXISTS schema_migrations (
     name TEXT PRIMARY KEY,
     applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
]);

let applied = new Set();
const appliedRows = queryJson('SELECT name FROM schema_migrations ORDER BY name');
applied = new Set(appliedRows.map((row) => row.name));

if (applied.size === 0) {
  const tables = new Set(queryJson("SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name));
  const cardColumns = new Set(queryJson('PRAGMA table_info(game_cards)').map((row) => row.name));
  const queueColumns = new Set(queryJson('PRAGMA table_info(battle_queue)').map((row) => row.name));
  const battleColumns = new Set(queryJson('PRAGMA table_info(battles)').map((row) => row.name));
  const profileColumns = new Set(queryJson('PRAGMA table_info(profiles)').map((row) => row.name));
  const baseline = [];

  if (tables.has('wallets') && tables.has('game_cards') && tables.has('battle_queue') && tables.has('battles')) {
    baseline.push('001_initial_schema.sql');
  }
  if (
    profileColumns.has('address') &&
    ['pwr', 'def', 'spd', 'element', 'ability', 'rarity', 'traits_json'].every((column) => cardColumns.has(column)) &&
    ['ticket_id', 'status', 'match_id', 'matched_at', 'expires_at', 'updated_at', 'rating', 'bucket_key'].every((column) => queueColumns.has(column)) &&
    ['p1_ticket_id', 'p2_ticket_id'].every((column) => battleColumns.has(column))
  ) {
    baseline.push('002_matchmaking_and_profiles.sql');
  }
  if (
    ['competitive_rating', 'competitive_rd', 'competitive_volatility', 'competitive_matches', 'last_rated_at'].every((column) => cardColumns.has(column))
  ) {
    baseline.push('003_competitive_ratings.sql');
  }
  if (tables.has('player_progress') && tables.has('equipment_unlocks') && tables.has('card_loadouts')) {
    baseline.push('004_equipment_system.sql');
  }

  for (const migration of baseline) {
    runWrangler(['--command', `INSERT OR IGNORE INTO schema_migrations (name) VALUES ('${migration.replace(/'/g, "''")}')`]);
    applied.add(migration);
  }

  if (baseline.length) {
    console.log(`Baselined existing schema with ${baseline.length} migration record(s).`);
  }
}

const migrations = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

const pending = migrations.filter((name) => !applied.has(name));

if (pending.length === 0) {
  console.log(`No pending migrations for ${database}.`);
  process.exit(0);
}

for (const migration of pending) {
  const sourcePath = path.join(migrationsDir, migration);
  const sql = fs.readFileSync(sourcePath, 'utf8').trimEnd();
  const wrappedSql = `${sql}\n\nINSERT INTO schema_migrations (name) VALUES ('${migration.replace(/'/g, "''")}');\n`;
  const tempPath = path.join(os.tmpdir(), `zenkai-${migration}`);

  fs.writeFileSync(tempPath, wrappedSql, 'utf8');
  console.log(`Applying ${migration}...`);

  try {
    runWrangler(['--file', tempPath]);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

console.log(`Applied ${pending.length} migration(s) to ${database}.`);
