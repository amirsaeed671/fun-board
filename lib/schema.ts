// SQL schema definitions for reference and migration.
// Every board is multi-tenant: rows are owned by a user_id (players.user_id,
// matches.recorded_by, tournaments.created_by). Boards are always public
// (read-only) via users.share_slug; only the owner can mutate.
export const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  leaderboard_name TEXT,
  share_slug TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  avatar_seed TEXT NOT NULL,
  avatar_style TEXT NOT NULL DEFAULT 'pixel-art',
  elo INTEGER NOT NULL DEFAULT 1000,
  points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  home_player_id TEXT NOT NULL REFERENCES players(id),
  away_player_id TEXT NOT NULL REFERENCES players(id),
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  home_team TEXT,
  away_team TEXT,
  stage TEXT,
  shootout_winner_id TEXT,
  home_elo_before INTEGER NOT NULL,
  away_elo_before INTEGER NOT NULL,
  home_elo_after INTEGER NOT NULL,
  away_elo_after INTEGER NOT NULL,
  tournament_id TEXT REFERENCES tournaments(id),
  tournament_round INTEGER,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  played_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS elo_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  elo INTEGER NOT NULL,
  match_id TEXT NOT NULL REFERENCES matches(id),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'knockout',
  status TEXT NOT NULL DEFAULT 'pending',
  winner_player_id TEXT REFERENCES players(id),
  runner_up_player_id TEXT REFERENCES players(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  seed INTEGER,
  group_name TEXT,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  eliminated INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  match_id TEXT REFERENCES matches(id),
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  home_participant_id TEXT REFERENCES tournament_participants(id),
  away_participant_id TEXT REFERENCES tournament_participants(id),
  winner_participant_id TEXT REFERENCES tournament_participants(id),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS point_adjustments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  tournament_id TEXT REFERENCES tournaments(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_player_id);
CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_player_id);
CREATE INDEX IF NOT EXISTS idx_matches_recorder ON matches(recorded_by);
CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_player ON elo_history(player_id);
CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tm_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_pa_user ON point_adjustments(user_id);
`

// Columns added after the initial v0 schema — applied idempotently to
// existing databases by lib/migrate.ts (SQLite ALTER TABLE ADD COLUMN
// cannot express UNIQUE / NOT NULL DEFAULT reliably, so these are plain).
export const COLUMN_MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  { table: "users", column: "leaderboard_name", ddl: "leaderboard_name TEXT" },
  { table: "users", column: "share_slug", ddl: "share_slug TEXT" },
  { table: "players", column: "avatar_style", ddl: "avatar_style TEXT NOT NULL DEFAULT 'pixel-art'" },
  { table: "players", column: "points", ddl: "points INTEGER NOT NULL DEFAULT 0" },
  { table: "matches", column: "home_team", ddl: "home_team TEXT" },
  { table: "matches", column: "away_team", ddl: "away_team TEXT" },
  { table: "matches", column: "stage", ddl: "stage TEXT" },
  { table: "matches", column: "shootout_winner_id", ddl: "shootout_winner_id TEXT" },
  { table: "tournaments", column: "winner_player_id", ddl: "winner_player_id TEXT" },
  { table: "tournaments", column: "runner_up_player_id", ddl: "runner_up_player_id TEXT" },
]
