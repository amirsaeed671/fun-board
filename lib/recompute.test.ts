import { describe, it, expect } from "vitest"
import { replayElo, type ReplayMatch } from "./recompute"

function mk(id: string, home: string, away: string, hs: number, as: number): ReplayMatch {
  return { id, home_player_id: home, away_player_id: away, home_score: hs, away_score: as }
}

describe("replayElo", () => {
  it("gives +16/-16 for an even-rated win (K=32)", () => {
    const { snapshots, players } = replayElo([mk("m1", "A", "B", 2, 0)])
    expect(snapshots[0]).toEqual({ matchId: "m1", homeBefore: 1000, homeAfter: 1016, awayBefore: 1000, awayAfter: 984 })
    expect(players.get("A")).toMatchObject({ elo: 1016, wins: 1, losses: 0, draws: 0, points: 3, goals_for: 2, goals_against: 0 })
    expect(players.get("B")).toMatchObject({ elo: 984, wins: 0, losses: 1, points: 0 })
  })

  it("a draw between even players leaves Elo unchanged and gives 1 point each", () => {
    const { players } = replayElo([mk("m1", "A", "B", 1, 1)])
    expect(players.get("A")).toMatchObject({ elo: 1000, draws: 1, points: 1 })
    expect(players.get("B")).toMatchObject({ elo: 1000, draws: 1, points: 1 })
  })

  it("chains Elo across matches using the updated rating", () => {
    const { players } = replayElo([
      mk("m1", "A", "B", 1, 0), // A 1000->1016, B 1000->984
      mk("m2", "A", "B", 1, 0), // A now favourite, smaller gain
    ])
    const a = players.get("A")!
    const b = players.get("B")!
    expect(a.wins).toBe(2)
    expect(a.points).toBe(6)
    // A's second win gains less than 16 because A was already higher-rated.
    expect(a.elo).toBeGreaterThan(1016)
    expect(a.elo).toBeLessThan(1032)
    expect(a.elo + b.elo).toBe(2000) // zero-sum
  })

  it("accumulates goals for/against correctly", () => {
    const { players } = replayElo([
      mk("m1", "A", "B", 3, 1),
      mk("m2", "B", "A", 2, 2),
    ])
    expect(players.get("A")).toMatchObject({ goals_for: 5, goals_against: 3, wins: 1, draws: 1 })
    expect(players.get("B")).toMatchObject({ goals_for: 3, goals_against: 5, losses: 1, draws: 1 })
  })
})
