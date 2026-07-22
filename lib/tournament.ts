import { v4 as uuidv4 } from "uuid"
import { db } from "./db"
import { recomputeUser } from "./recompute"

export const CHAMPION_BONUS = 5
export const RUNNER_UP_BONUS = 2

interface TMRow {
  id: string
  round: number
  position: number
  home_participant_id: string | null
  away_participant_id: string | null
  winner_participant_id: string | null
  status: string
}

// ── Pure bracket helper ─────────────────────────────────────────────────────
export interface RoundResult {
  position: number
  winnerParticipantId: string | null
}

/** Pair the winners of one round into the next round's fixtures. */
export function nextRoundPairings(
  round: RoundResult[]
): { position: number; home: string | null; away: string | null }[] {
  const winners = [...round]
    .sort((a, b) => a.position - b.position)
    .map((m) => m.winnerParticipantId)
  const pairs: { position: number; home: string | null; away: string | null }[] = []
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push({ position: i / 2 + 1, home: winners[i] ?? null, away: winners[i + 1] ?? null })
  }
  return pairs
}

// ── Fixture generation ──────────────────────────────────────────────────────
export async function generateKnockout(tournamentId: string, participantIds: string[]) {
  const stmts: { sql: string; args: (string | number | null)[] }[] = []
  let position = 1
  for (let i = 0; i < participantIds.length; i += 2) {
    const home = participantIds[i]
    const away = participantIds[i + 1] ?? null
    const isBye = away === null
    stmts.push({
      sql: `INSERT INTO tournament_matches
              (id, tournament_id, round, position, home_participant_id, away_participant_id, winner_participant_id, status)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
      args: [uuidv4(), tournamentId, position, home, away, isBye ? home : null, isBye ? "completed" : "pending"],
    })
    position++
  }
  if (stmts.length) await db.batch(stmts, "write")
}

export async function generateRoundRobin(tournamentId: string, participantIds: string[]) {
  const stmts: { sql: string; args: (string | number | null)[] }[] = []
  let position = 1
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      stmts.push({
        sql: `INSERT INTO tournament_matches
                (id, tournament_id, round, position, home_participant_id, away_participant_id)
              VALUES (?, ?, 1, ?, ?, ?)`,
        args: [uuidv4(), tournamentId, position, participantIds[i], participantIds[j]],
      })
      position++
    }
  }
  if (stmts.length) await db.batch(stmts, "write")
}

// ── Reads scoped to owner ───────────────────────────────────────────────────
async function loadMatches(userId: string, tournamentId: string): Promise<TMRow[]> {
  const res = await db.execute({
    sql: `SELECT tm.* FROM tournament_matches tm
          JOIN tournaments t ON tm.tournament_id = t.id
          WHERE tm.tournament_id = ? AND t.created_by = ?
          ORDER BY tm.round ASC, tm.position ASC`,
    args: [tournamentId, userId],
  })
  return res.rows as unknown as TMRow[]
}

async function participantPlayerId(participantId: string | null): Promise<string | null> {
  if (!participantId) return null
  const res = await db.execute({
    sql: "SELECT player_id FROM tournament_participants WHERE id = ?",
    args: [participantId],
  })
  return (res.rows[0] as Record<string, unknown> | undefined)?.player_id as string ?? null
}

// ── Advancement + completion ────────────────────────────────────────────────
/** Advance a knockout bracket if the top round is fully decided; complete the
 *  tournament when the final is done. Safe to call after every recorded result. */
export async function advanceKnockout(userId: string, tournamentId: string): Promise<void> {
  const tms = await loadMatches(userId, tournamentId)
  if (!tms.length) return

  const maxRound = Math.max(...tms.map((m) => m.round))
  const roundMatches = tms.filter((m) => m.round === maxRound)
  const allDone = roundMatches.every((m) => m.status === "completed")
  if (!allDone) return

  if (roundMatches.length === 1) {
    const final = roundMatches[0]
    const champ = final.winner_participant_id
    const runner =
      champ === final.home_participant_id ? final.away_participant_id : final.home_participant_id
    if (champ) {
      await completeTournamentByParticipants(userId, tournamentId, champ, runner)
    }
    return
  }

  const pairings = nextRoundPairings(
    roundMatches.map((m) => ({ position: m.position, winnerParticipantId: m.winner_participant_id }))
  )
  const stmts = pairings.map((p) => {
    const isBye = p.away === null && p.home !== null
    return {
      sql: `INSERT INTO tournament_matches
              (id, tournament_id, round, position, home_participant_id, away_participant_id, winner_participant_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        tournamentId,
        maxRound + 1,
        p.position,
        p.home,
        p.away,
        isBye ? p.home : null,
        isBye ? "completed" : "pending",
      ] as (string | number | null)[],
    }
  })
  if (stmts.length) await db.batch(stmts, "write")
  // A freshly-created round could be all byes — resolve it too.
  await advanceKnockout(userId, tournamentId)
}

export async function completeTournamentByParticipants(
  userId: string,
  tournamentId: string,
  championParticipantId: string,
  runnerUpParticipantId: string | null
) {
  const champPlayer = await participantPlayerId(championParticipantId)
  const runnerPlayer = await participantPlayerId(runnerUpParticipantId)
  if (!champPlayer) return
  await completeTournament(userId, tournamentId, champPlayer, runnerPlayer)
}

/** Mark a tournament complete, set winner/runner-up, apply bonus points. */
export async function completeTournament(
  userId: string,
  tournamentId: string,
  winnerPlayerId: string,
  runnerUpPlayerId: string | null
) {
  // Verify ownership.
  const own = await db.execute({
    sql: "SELECT id FROM tournaments WHERE id = ? AND created_by = ?",
    args: [tournamentId, userId],
  })
  if (own.rows.length === 0) return

  const stmts: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `UPDATE tournaments SET status = 'completed', ended_at = datetime('now'),
              winner_player_id = ?, runner_up_player_id = ? WHERE id = ? AND created_by = ?`,
      args: [winnerPlayerId, runnerUpPlayerId, tournamentId, userId],
    },
    // Idempotent: clear any prior bonuses for this tournament before re-applying.
    {
      sql: "DELETE FROM point_adjustments WHERE tournament_id = ? AND user_id = ?",
      args: [tournamentId, userId],
    },
    {
      sql: `INSERT INTO point_adjustments (id, user_id, player_id, tournament_id, points, reason)
            VALUES (?, ?, ?, ?, ?, 'champion')`,
      args: [uuidv4(), userId, winnerPlayerId, tournamentId, CHAMPION_BONUS],
    },
  ]
  if (runnerUpPlayerId) {
    stmts.push({
      sql: `INSERT INTO point_adjustments (id, user_id, player_id, tournament_id, points, reason)
            VALUES (?, ?, ?, ?, ?, 'runner_up')`,
      args: [uuidv4(), userId, runnerUpPlayerId, tournamentId, RUNNER_UP_BONUS],
    })
  }
  await db.batch(stmts, "write")
  await recomputeUser(userId)
}

/** Remove a tournament: unlink its matches (keep global stats), drop bracket,
 *  participants, bonuses; reopen nothing. Recomputes afterwards. */
export async function deleteTournament(userId: string, tournamentId: string) {
  const own = await db.execute({
    sql: "SELECT id FROM tournaments WHERE id = ? AND created_by = ?",
    args: [tournamentId, userId],
  })
  if (own.rows.length === 0) return
  await db.batch(
    [
      { sql: "UPDATE matches SET tournament_id = NULL, stage = NULL, tournament_round = NULL WHERE tournament_id = ? AND recorded_by = ?", args: [tournamentId, userId] },
      { sql: "DELETE FROM point_adjustments WHERE tournament_id = ? AND user_id = ?", args: [tournamentId, userId] },
      { sql: "DELETE FROM tournament_matches WHERE tournament_id = ?", args: [tournamentId] },
      { sql: "DELETE FROM tournament_participants WHERE tournament_id = ?", args: [tournamentId] },
      { sql: "DELETE FROM tournaments WHERE id = ? AND created_by = ?", args: [tournamentId, userId] },
    ],
    "write"
  )
  await recomputeUser(userId)
}

/** When a tournament match's result is removed, reset that fixture and drop any
 *  later rounds that were derived from it, and reopen a completed tournament. */
export async function undoTournamentResult(userId: string, tournamentMatchId: string) {
  const res = await db.execute({
    sql: `SELECT tm.*, tm.tournament_id as tid FROM tournament_matches tm
          JOIN tournaments t ON tm.tournament_id = t.id
          WHERE tm.id = ? AND t.created_by = ?`,
    args: [tournamentMatchId, userId],
  })
  const tm = res.rows[0] as unknown as (TMRow & { tid: string }) | undefined
  if (!tm) return

  await db.batch(
    [
      {
        sql: "UPDATE tournament_matches SET match_id = NULL, winner_participant_id = NULL, status = 'pending' WHERE id = ?",
        args: [tournamentMatchId],
      },
      // Downstream rounds are now invalid.
      {
        sql: "DELETE FROM tournament_matches WHERE tournament_id = ? AND round > ?",
        args: [tm.tid, tm.round],
      },
      // Reopen the tournament and clear its result + bonuses.
      {
        sql: "UPDATE tournaments SET status = 'active', ended_at = NULL, winner_player_id = NULL, runner_up_player_id = NULL WHERE id = ? AND created_by = ?",
        args: [tm.tid, userId],
      },
      {
        sql: "DELETE FROM point_adjustments WHERE tournament_id = ? AND user_id = ?",
        args: [tm.tid, userId],
      },
    ],
    "write"
  )
}
