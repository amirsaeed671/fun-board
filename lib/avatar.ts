// DiceBear pixel-art style avatars
export function getAvatarUrl(seed: string, size = 80): string {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=transparent`
}

export function getRandomSeed(): string {
  return Math.random().toString(36).substring(2, 10)
}
