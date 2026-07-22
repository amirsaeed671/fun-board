import { db } from "./db"
import { SCHEMA_SQL } from "./schema"

const globalForMigrate = globalThis as unknown as { _migrated?: boolean }

export async function migrate() {
  if (globalForMigrate._migrated) return
  try {
    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const sql of statements) {
      await db.execute(sql)
    }
    globalForMigrate._migrated = true
  } catch (error) {
    console.error("[v0] Migration error:", error)
    throw error
  }
}
