// Share-slug generator for public board URLs (/l/[slug]).
// rng is injectable so the generator is deterministic under test.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

export function makeSlug(len = 10, rng: () => number = Math.random): string {
  let s = ""
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(rng() * ALPHABET.length)]
  }
  return s
}

// Turn a username into a friendly base slug (fallback to a random slug if empty).
export function slugifyUsername(username: string): string {
  const base = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base.length >= 2 ? base : makeSlug()
}
