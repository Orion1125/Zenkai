// ══════════════════════════════════════════════
// ZENKAI — NeonDB Connection
// ══════════════════════════════════════════════

import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
  if (!sql) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(dbUrl);
  }
  return sql;
}

export async function initDb() {
  const sql = getDb();

  // ── Users / Auth table ──────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      x_handle      VARCHAR(100),
      spot_type     VARCHAR(10),
      referral_code VARCHAR(12) UNIQUE NOT NULL,
      referred_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      extra_spins   INTEGER NOT NULL DEFAULT 0,
      completed_at  TIMESTAMP,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create wallets table with handle column
  await sql`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) UNIQUE NOT NULL,
      handle VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add handle column if table already exists without it
  try {
    await sql`
      ALTER TABLE wallets ADD COLUMN IF NOT EXISTS handle VARCHAR(100)
    `;
  } catch (err) {
    // Column might already exist, that's fine
  }

  // Create submissions table for all new registrations
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL,
      handle VARCHAR(100),
      quote_url TEXT,
      submitted_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Tier-specific allowlist tables
  await sql`
    CREATE TABLE IF NOT EXISTS allowlist_gtd (
      id         SERIAL PRIMARY KEY,
      address    VARCHAR(42) UNIQUE NOT NULL,
      handle     VARCHAR(100),
      ip         VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS allowlist_fcfs (
      id         SERIAL PRIMARY KEY,
      address    VARCHAR(42) UNIQUE NOT NULL,
      handle     VARCHAR(100),
      ip         VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add ip/user_agent to existing tables if they don't have them
  try { await sql`ALTER TABLE allowlist_gtd  ADD COLUMN IF NOT EXISTS ip         VARCHAR(64)`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE allowlist_gtd  ADD COLUMN IF NOT EXISTS user_agent TEXT`; }        catch { /* ignore */ }
  try { await sql`ALTER TABLE allowlist_fcfs ADD COLUMN IF NOT EXISTS ip         VARCHAR(64)`; } catch { /* ignore */ }
  try { await sql`ALTER TABLE allowlist_fcfs ADD COLUMN IF NOT EXISTS user_agent TEXT`; }        catch { /* ignore */ }

  await sql`
    CREATE TABLE IF NOT EXISTS sybil_log (
      id         SERIAL PRIMARY KEY,
      ip         VARCHAR(64),
      user_agent TEXT,
      handle     VARCHAR(100),
      address    VARCHAR(42),
      reason     VARCHAR(50),
      flagged_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log('✓ Database initialized — all tables ready');
}
