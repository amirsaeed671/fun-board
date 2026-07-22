import { z } from "zod"

export const registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be 3-20 characters").max(20),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().trim().max(40).optional(),
})

export const playerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  avatarSeed: z.string().trim().min(1).max(64).optional(),
  avatarStyle: z.string().trim().min(1).max(40).optional(),
})

export const playerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  avatarSeed: z.string().trim().min(1).max(64).optional(),
  avatarStyle: z.string().trim().min(1).max(40).optional(),
})

export const matchCreateSchema = z.object({
  homePlayerId: z.string().min(1),
  awayPlayerId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  homeTeam: z.string().trim().max(60).optional(),
  awayTeam: z.string().trim().max(60).optional(),
  stage: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  playedAt: z.string().optional(),
  tournamentId: z.string().optional(),
  tournamentMatchId: z.string().optional(),
  shootoutWinnerId: z.string().optional(),
})

export const matchUpdateSchema = z.object({
  homeScore: z.number().int().min(0).max(99).optional(),
  awayScore: z.number().int().min(0).max(99).optional(),
  homeTeam: z.string().trim().max(60).nullable().optional(),
  awayTeam: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  playedAt: z.string().optional(),
  shootoutWinnerId: z.string().nullable().optional(),
})

export const tournamentCreateSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(60),
  format: z.enum(["knockout", "round-robin"]),
  playerIds: z.array(z.string().min(1)).min(2, "Select at least 2 players"),
})

export const settingsSchema = z.object({
  leaderboardName: z.string().trim().min(1).max(60).optional(),
  action: z.enum(["rename", "regenerate-slug"]).optional(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

/** Parse or throw a ValidationError carrying a friendly message. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new ValidationError(first?.message ?? "Invalid input")
  }
  return result.data
}
