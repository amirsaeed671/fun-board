// DiceBear HTTP API avatars (SVG), seeded by the player name/seed.
// Style is stored per player so admins can pick a look they like.
export const AVATAR_STYLES = [
  "pixel-art",
  "adventurer",
  "fun-emoji",
  "bottts",
  "thumbs",
  "big-smile",
  "lorelei",
  "notionists",
] as const

export type AvatarStyle = (typeof AVATAR_STYLES)[number]

export function getAvatarUrl(seed: string, style = "pixel-art", size = 80): string {
  const safeStyle = (AVATAR_STYLES as readonly string[]).includes(style) ? style : "pixel-art"
  return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${encodeURIComponent(
    seed
  )}&size=${size}&backgroundColor=transparent`
}

export function getRandomSeed(): string {
  return Math.random().toString(36).substring(2, 10)
}
