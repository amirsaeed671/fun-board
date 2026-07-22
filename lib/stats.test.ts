import { describe, it, expect } from "vitest"
import type { Match } from "./queries"
import {
  toPlayerRows,
  playerRecord,
  headToHead,
  nemesis,
  favouriteVictim,
  teamsUsed,
  bestTeam,
  unluckyTeam,
  biggestWin,
  worstDefeat,
  longestWinStreak,
  currentStreak,
  recentForm,
  buildH2HWins,
  sortPointsTable,
} from "./stats"

// Minimal Match factory. `p1` is always the "home" player unless overridden.
let seq = 0
function mk(part: {
  home: string
  away: string
  hs: number
  as: number
  ht?: string
  at?: string
  at_time?: string
}): Match {
  seq++
  return {
    id: `m${seq}`,
    home_player_id: part.home,
    away_player_id: part.away,
    home_score: part.hs,
    away_score: part.as,
    home_team: part.ht ?? null,
    away_team: part.at ?? null,
    stage: null,
    shootout_winner_id: null,
    home_elo_before: 1000,
    away_elo_before: 1000,
    home_elo_after: 1000,
    away_elo_after: 1000,
    tournament_id: null,
    tournament_round: null,
    recorded_by: "u1",
    played_at: part.at_time ?? `2026-01-0${seq}T00:00:00`,
    notes: null,
    home_player_name: part.home,
    away_player_name: part.away,
    home_avatar_seed: part.home,
    away_avatar_seed: part.away,
  }
}

describe("toPlayerRows + playerRecord", () => {
  it("computes W/D/L, goals and win rate from a player's perspective", () => {
    const matches = [
      mk({ home: "A", away: "B", hs: 3, as: 1 }), // A win
      mk({ home: "B", away: "A", hs: 2, as: 2 }), // draw (A away)
      mk({ home: "A", away: "C", hs: 0, as: 4 }), // A loss
    ]
    const rows = toPlayerRows(matches, "A")
    const r = playerRecord(rows)
    expect(r).toMatchObject({ played: 3, w: 1, d: 1, l: 1, gf: 5, ga: 7, gd: -2, winRate: 33 })
  })
})

describe("headToHead / nemesis / favouriteVictim", () => {
  const matches = [
    mk({ home: "A", away: "B", hs: 1, as: 3 }), // A loses to B
    mk({ home: "A", away: "B", hs: 0, as: 2 }), // A loses to B
    mk({ home: "A", away: "C", hs: 5, as: 0 }), // A beats C
    mk({ home: "C", away: "A", hs: 1, as: 4 }), // A beats C
  ]
  const rows = toPlayerRows(matches, "A")

  it("aggregates per opponent", () => {
    const h = headToHead(rows)
    const b = h.find((x) => x.opponentId === "B")!
    expect(b).toMatchObject({ played: 2, w: 0, d: 0, l: 2 })
  })
  it("nemesis is the most-lost-to opponent", () => {
    expect(nemesis(rows)?.opponentId).toBe("B")
  })
  it("favourite victim is the most-beaten opponent", () => {
    expect(favouriteVictim(rows)?.opponentId).toBe("C")
  })
  it("returns null when there are no losses/wins", () => {
    const onlyWins = toPlayerRows([mk({ home: "A", away: "B", hs: 1, as: 0 })], "A")
    expect(nemesis(onlyWins)).toBeNull()
    const onlyLosses = toPlayerRows([mk({ home: "A", away: "B", hs: 0, as: 1 })], "A")
    expect(favouriteVictim(onlyLosses)).toBeNull()
  })
})

describe("teamsUsed / bestTeam / unluckyTeam", () => {
  const matches = [
    mk({ home: "A", away: "B", hs: 2, as: 0, ht: "Arsenal" }),
    mk({ home: "A", away: "B", hs: 1, as: 0, ht: "Arsenal" }),
    mk({ home: "A", away: "B", hs: 0, as: 3, ht: "Spurs" }),
  ]
  const rows = toPlayerRows(matches, "A")

  it("aggregates per team", () => {
    const arsenal = teamsUsed(rows).find((t) => t.team === "Arsenal")!
    expect(arsenal).toMatchObject({ played: 2, w: 2, winRate: 100 })
  })
  it("best team has the highest win rate", () => {
    expect(bestTeam(rows)?.team).toBe("Arsenal")
  })
  it("unlucky team has the lowest win rate", () => {
    expect(unluckyTeam(rows)?.team).toBe("Spurs")
  })
})

describe("biggestWin / worstDefeat", () => {
  const matches = [
    mk({ home: "A", away: "B", hs: 3, as: 1 }), // +2
    mk({ home: "A", away: "C", hs: 6, as: 0 }), // +6  <- biggest
    mk({ home: "A", away: "D", hs: 0, as: 5 }), // -5  <- worst
    mk({ home: "A", away: "E", hs: 1, as: 2 }), // -1
  ]
  const rows = toPlayerRows(matches, "A")
  it("finds the biggest goal-difference win", () => {
    expect(biggestWin(rows)?.opponentId).toBe("C")
  })
  it("finds the worst defeat", () => {
    expect(worstDefeat(rows)?.opponentId).toBe("D")
  })
})

describe("streaks and form", () => {
  it("longestWinStreak counts the max consecutive wins", () => {
    const rows = toPlayerRows(
      [
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-01" }),
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-02" }),
        mk({ home: "A", away: "B", hs: 0, as: 1, at_time: "2026-01-03" }),
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-04" }),
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-05" }),
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-06" }),
      ],
      "A"
    )
    expect(longestWinStreak(rows)).toBe(3)
  })
  it("currentStreak reflects the most recent run", () => {
    const rows = toPlayerRows(
      [
        mk({ home: "A", away: "B", hs: 0, as: 1, at_time: "2026-01-01" }),
        mk({ home: "A", away: "B", hs: 1, as: 0, at_time: "2026-01-02" }),
        mk({ home: "A", away: "B", hs: 2, as: 0, at_time: "2026-01-03" }),
      ],
      "A"
    )
    expect(currentStreak(rows)).toEqual({ type: "W", count: 2 })
  })
  it("currentStreak is null with no matches", () => {
    expect(currentStreak([])).toBeNull()
  })
  it("recentForm returns most-recent-first, capped at n", () => {
    const rows = toPlayerRows(
      [
        mk({ home: "A", away: "B", hs: 0, as: 1, at_time: "2026-01-01" }), // L
        mk({ home: "A", away: "B", hs: 2, as: 2, at_time: "2026-01-02" }), // D
        mk({ home: "A", away: "B", hs: 3, as: 0, at_time: "2026-01-03" }), // W
      ],
      "A"
    )
    expect(recentForm(rows, 2)).toEqual(["W", "D"])
  })
})

describe("sortPointsTable", () => {
  it("orders by points, then GD, then GF, then head-to-head", () => {
    const players = [
      { id: "A", points: 6, goals_for: 5, goals_against: 3 },
      { id: "B", points: 6, goals_for: 8, goals_against: 6 }, // same pts, GD +2 = A's GD? A GD=2,B GD=2 -> GF tiebreak: B 8 > A 5
      { id: "C", points: 9, goals_for: 2, goals_against: 0 },
    ]
    const sorted = sortPointsTable(players)
    expect(sorted.map((p) => p.id)).toEqual(["C", "B", "A"])
  })

  it("uses head-to-head when points/GD/GF all tie", () => {
    const players = [
      { id: "A", points: 3, goals_for: 2, goals_against: 1 },
      { id: "B", points: 3, goals_for: 2, goals_against: 1 },
    ]
    // A beat B once
    const h2h = buildH2HWins([mk({ home: "A", away: "B", hs: 1, as: 0 })])
    const sorted = sortPointsTable(players, h2h)
    expect(sorted[0].id).toBe("A")
  })
})
