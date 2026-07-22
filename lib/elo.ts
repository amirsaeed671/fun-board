const K = 32

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function newRating(
  current: number,
  expected: number,
  actual: number
): number {
  return Math.round(current + K * (actual - expected))
}

export type MatchResult = "home" | "away" | "draw"

export function calculateEloChanges(
  homeElo: number,
  awayElo: number,
  result: MatchResult
): { homeAfter: number; awayAfter: number } {
  const expectedHome = expectedScore(homeElo, awayElo)
  const expectedAway = expectedScore(awayElo, homeElo)

  let actualHome: number
  let actualAway: number

  if (result === "home") {
    actualHome = 1
    actualAway = 0
  } else if (result === "away") {
    actualHome = 0
    actualAway = 1
  } else {
    actualHome = 0.5
    actualAway = 0.5
  }

  return {
    homeAfter: newRating(homeElo, expectedHome, actualHome),
    awayAfter: newRating(awayElo, expectedAway, actualAway),
  }
}

export function getEloTier(elo: number): {
  tier: string
  color: string
  min: number
} {
  if (elo >= 1400)
    return { tier: "Elite", color: "text-amber-400", min: 1400 }
  if (elo >= 1200)
    return { tier: "Gold", color: "text-yellow-500", min: 1200 }
  if (elo >= 1100)
    return { tier: "Silver", color: "text-slate-400", min: 1100 }
  if (elo >= 950)
    return { tier: "Bronze", color: "text-orange-600", min: 950 }
  return { tier: "Iron", color: "text-stone-500", min: 0 }
}
