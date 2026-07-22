import { describe, it, expect } from "vitest"
import { nextRoundPairings } from "./tournament"

describe("nextRoundPairings", () => {
  it("pairs 4 winners into 2 semifinal->final fixtures", () => {
    const pairs = nextRoundPairings([
      { position: 1, winnerParticipantId: "A" },
      { position: 2, winnerParticipantId: "B" },
    ])
    expect(pairs).toEqual([{ position: 1, home: "A", away: "B" }])
  })

  it("handles an odd bracket (3 players -> 1 real match + 1 bye) into a final", () => {
    // Round 1 had: pos1 winner=W (real), pos2 winner=C (bye auto-complete)
    const pairs = nextRoundPairings([
      { position: 1, winnerParticipantId: "W" },
      { position: 2, winnerParticipantId: "C" },
    ])
    expect(pairs).toEqual([{ position: 1, home: "W", away: "C" }])
  })

  it("respects position ordering regardless of input order", () => {
    const pairs = nextRoundPairings([
      { position: 3, winnerParticipantId: "C" },
      { position: 1, winnerParticipantId: "A" },
      { position: 4, winnerParticipantId: "D" },
      { position: 2, winnerParticipantId: "B" },
    ])
    expect(pairs).toEqual([
      { position: 1, home: "A", away: "B" },
      { position: 2, home: "C", away: "D" },
    ])
  })

  it("carries a lone winner forward as a bye (odd number of winners)", () => {
    const pairs = nextRoundPairings([
      { position: 1, winnerParticipantId: "A" },
      { position: 2, winnerParticipantId: "B" },
      { position: 3, winnerParticipantId: "C" },
    ])
    expect(pairs).toEqual([
      { position: 1, home: "A", away: "B" },
      { position: 2, home: "C", away: null },
    ])
  })
})
