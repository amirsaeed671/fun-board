import { db } from "./db"
import { SCHEMA_SQL, COLUMN_MIGRATIONS } from "./schema"
import { makeSlug, slugifyUsername } from "./slug"

const globalForMigrate = globalThis as unknown as { _migrated?: boolean }

async function ensureColumn(table: string, column: string, ddl: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`)
  const has = info.rows.some(
    (r) => (r as Record<string, unknown>).name === column
  )
  if (!has) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

async function backfillBoardIdentity() {
  const users = await db.execute(
    "SELECT id, username, display_name, leaderboard_name, share_slug FROM users"
  )
  const taken = new Set(
    users.rows
      .map((r) => (r as Record<string, unknown>).share_slug as string | null)
      .filter(Boolean) as string[]
  )
  for (const row of users.rows) {
    const u = row as Record<string, unknown>
    const updates: { sql: string; args: string[] }[] = []

    if (!u.share_slug) {
      let slug = slugifyUsername(u.username as string)
      while (taken.has(slug)) slug = makeSlug()
      taken.add(slug)
      updates.push({
        sql: "UPDATE users SET share_slug = ? WHERE id = ?",
        args: [slug, u.id as string],
      })
    }
    if (!u.leaderboard_name) {
      const name = `${(u.display_name as string) ?? (u.username as string)}'s League`
      updates.push({
        sql: "UPDATE users SET leaderboard_name = ? WHERE id = ?",
        args: [name, u.id as string],
      })
    }
    for (const stmt of updates) await db.execute(stmt)
  }
}

export async function migrate() {
  if (globalForMigrate._migrated) return
  try {
    // 1) Create tables/indexes (fresh DB path).
    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      // Skip PRAGMAs: hosted Turso (libSQL over HTTP) rejects statements like
      // `PRAGMA journal_mode=WAL`, and journaling/FK config is managed server-side.
      .filter((s) => s.length > 0 && !/^pragma\b/i.test(s))
    for (const sql of statements) {
      await db.execute(sql)
    }

    // 2) Add columns missing on pre-existing databases.
    for (const m of COLUMN_MIGRATIONS) {
      await ensureColumn(m.table, m.column, m.ddl)
    }

    // 3) Unique index for share_slug (safe to run after column exists).
    await db.execute(
      "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_slug ON users(share_slug)"
    )

    // 4) Backfill board identity for existing users.
    await backfillBoardIdentity()

    globalForMigrate._migrated = true
  } catch (error) {
    console.error("[fun-board] Migration error:", error)
    throw error
  }
}
