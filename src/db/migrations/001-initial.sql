-- Channel/streamer config
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_channel TEXT NOT NULL UNIQUE,
  streamer_twitch_username TEXT NOT NULL,
  streamer_platform TEXT NOT NULL DEFAULT 'epic',
  streamer_game_id TEXT NOT NULL,
  streamer_mmr INTEGER NOT NULL DEFAULT 1400,
  default_format TEXT NOT NULL DEFAULT '3v3',
  default_mmr INTEGER NOT NULL DEFAULT 800,
  queue_open INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registered players
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_username TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'epic',
  game_id TEXT NOT NULL,
  peak_mmr INTEGER,
  mmr_source TEXT DEFAULT 'none',
  mmr_last_updated INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Active queue (scoped per channel)
CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  games_played_session INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(channel_id, player_id)
);

-- Match history
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  format TEXT NOT NULL,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  team_a_avg_mmr INTEGER,
  team_b_avg_mmr INTEGER,
  mmr_diff INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- MMR cache
CREATE TABLE IF NOT EXISTS mmr_cache (
  player_id INTEGER NOT NULL REFERENCES players(id),
  playlist TEXT NOT NULL,
  peak_mmr INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (player_id, playlist)
);
