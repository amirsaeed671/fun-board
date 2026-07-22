import { createClient, type Client } from "@libsql/client"

const globalForDb = globalThis as unknown as { _db?: Client }

function getClient(): Client {
  if (!globalForDb._db) {
    const url = process.env.TURSO_DATABASE_URL
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL is not set. Copy .env.example to .env.local and add your Turso credentials."
      )
    }
    globalForDb._db = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return globalForDb._db
}

// Lazily create the client on first use so importing this module (in tests,
// during `next build`, etc.) never requires the database env to be present.
export const db = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
})
