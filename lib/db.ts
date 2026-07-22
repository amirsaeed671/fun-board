import { createClient } from "@libsql/client"

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createClient> | undefined
}

export const db =
  globalForDb.db ??
  createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

if (process.env.NODE_ENV !== "production") globalForDb.db = db
