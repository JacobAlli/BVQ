# BalancedViewerQueue (BVQ)

## Project Overview

A Twitch chat bot + web dashboard for Rocket League streamers who run viewer private matches. BVQ manages a FIFO viewer queue with automatic team balancing based on peak MMR. The streamer is always on a team — the bot handles who plays next (strict queue order) and which team they're on (MMR-balanced).

**Deployment model:** Single self-hosted instance on a VPS (Hetzner) that joins 1-2 Twitch channels. Each channel has its own independent queue, settings, and match history. Adding a new streamer = adding an entry to the channels config. No signup flow, no auth — just you managing the config.

### Core Problem

Existing queue bots (PlayWithViewers, StreamElements Viewer Queue) handle FIFO ordering but have zero awareness of player skill. Streamers end up with lopsided lobbies. When queue overflow happens (e.g., 10 players for a 3v3), there's no system for fair rotation — it becomes awkward and manual.

### Core Solution

- **FIFO queue** — join order determines who plays, period. No favoritism, no MMR-based queue jumping.
- **MMR-aware team splitting** — once the active players are selected, the bot optimally distributes them across teams to minimize MMR difference.
- **Automatic rotation** — players who just finished go to the back of the queue, next batch gets pulled from the top.
- **Streamer always plays** — streamer occupies a fixed slot on one team. Balance algorithm accounts for the streamer's MMR.
- **Flexible format** — supports 2v2, 3v3, and 4v4. Streamer picks the format per session or per match.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ with TypeScript |
| Twitch Chat | `tmi.js` |
| Web Framework | Fastify (API) |
| Frontend | React + Vite |
| Database | SQLite via `better-sqlite3` |
| Realtime | WebSocket (native `ws` or Socket.IO) |
| Styling | Tailwind CSS |
| MMR API | Tracker Network API (TRN) + self-report fallback |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  Per-channel dashboard — dark gamer aesthetic    │
│  /channel/:name — queue, teams, controls, log   │
│         Connects via WebSocket for realtime       │
├─────────────────────────────────────────────────┤
│                  Fastify API Server              │
│  REST endpoints scoped by channel                │
│  WebSocket server for realtime queue state        │
├──────────────┬──────────────┬────────────────────┤
│  Twitch Bot  │  Queue Engine │  Balance Engine    │
│  (tmi.js)    │  FIFO + rotate│  MMR team split    │
│  Joins 1-2   │  per-channel  │  per-channel       │
│  channels    │  isolation    │  streamer slot     │
├──────────────┴──────────────┴────────────────────┤
│              SQLite Database                      │
│  channels, players, queue_entries, matches, cache │
└─────────────────────────────────────────────────┘
```

### Module Breakdown

**`src/bot/`** — Twitch chat bot
- `twitch-client.ts` — tmi.js connection, auth, joins all channels from DB
- `command-handler.ts` — command parser and router, resolves channel context from the incoming message's channel
- `commands/` — individual command implementations (all receive channel context)

**`src/queue/`** — Queue engine
- `queue-manager.ts` — FIFO queue state, add/remove/rotate
- `rotation.ts` — post-match rotation logic (played → back of queue, pull next batch)

**`src/balance/`** — Team balancing
- `balance-engine.ts` — optimal team split algorithm given N players + streamer
- `mmr-resolver.ts` — resolves MMR for a player (API → cache → self-report)

**`src/api/`** — Fastify REST + WebSocket
- `server.ts` — Fastify setup, route registration
- `routes/` — REST endpoints, all scoped under `/api/channels/:channelId/`
- `ws.ts` — WebSocket manager, broadcasts queue state changes per channel

**`src/db/`** — Database layer
- `database.ts` — SQLite connection, migrations
- `models/` — typed query functions for each table

**`src/frontend/`** — React dashboard (Vite project)
- Streamer-facing web panel
- OBS browser source compatible overlay

---

## Database Schema

```sql
-- Channel/streamer config (one row per supported channel)
CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_channel TEXT NOT NULL UNIQUE,           -- channel name the bot joins
  streamer_twitch_username TEXT NOT NULL,
  streamer_platform TEXT NOT NULL DEFAULT 'epic', -- epic | steam | psn | xbox
  streamer_game_id TEXT NOT NULL,
  streamer_mmr INTEGER NOT NULL DEFAULT 1400,
  default_format TEXT NOT NULL DEFAULT '3v3',     -- '2v2' | '3v3' | '4v4'
  default_mmr INTEGER NOT NULL DEFAULT 800,
  queue_open INTEGER NOT NULL DEFAULT 0,          -- 0 = closed, 1 = open
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registered players (persists across sessions, shared across channels)
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_username TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'epic',       -- epic | steam | psn | xbox
  game_id TEXT NOT NULL,                        -- their in-game ID
  peak_mmr INTEGER,                             -- from API or self-report
  mmr_source TEXT DEFAULT 'none',               -- 'api' | 'self_report' | 'none'
  mmr_last_updated INTEGER,                     -- unix timestamp
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Active queue (scoped per channel, cleared on queue close)
CREATE TABLE queue_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  position INTEGER NOT NULL,                    -- FIFO order
  status TEXT NOT NULL DEFAULT 'waiting',        -- 'waiting' | 'active' | 'played'
  games_played_session INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(channel_id, player_id)
);

-- Match history (scoped per channel)
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  format TEXT NOT NULL,                          -- '2v2' | '3v3' | '4v4'
  team_a TEXT NOT NULL,                          -- JSON array of player IDs
  team_b TEXT NOT NULL,                          -- JSON array of player IDs
  team_a_avg_mmr INTEGER,
  team_b_avg_mmr INTEGER,
  mmr_diff INTEGER,                              -- absolute difference
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- MMR cache (avoid redundant API calls, shared across channels)
CREATE TABLE mmr_cache (
  player_id INTEGER NOT NULL REFERENCES players(id),
  playlist TEXT NOT NULL,                         -- 'ranked_doubles' | 'ranked_standard'
  peak_mmr INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (player_id, playlist)
);
```

---

## Twitch Commands

### Viewer Commands

| Command | Description |
|---------|-------------|
| `!register <platform>:<gameID>` | Register game ID. Platform: `epic`, `steam`, `psn`, `xbox`. Example: `!register epic:RocketKing99` |
| `!join` | Join the queue. Must be registered. |
| `!join <rank>` | Join with self-reported rank as fallback. Example: `!join C3` |
| `!leave` | Leave the queue. |
| `!pos` | Check your position in the queue. |
| `!rank` | Check your stored MMR/rank. |

### Streamer / Mod Commands

| Command | Description |
|---------|-------------|
| `!queue open` | Open the queue for joins. |
| `!queue close` | Close the queue (no new joins, existing queue preserved). |
| `!queue clear` | Close and clear the entire queue. |
| `!queue list` | Show current queue in chat. |
| `!format <2v2\|3v3\|4v4>` | Set the match format. |
| `!balance` | Pull next batch from queue top, split into balanced teams, post result. |
| `!next` | Rotate: current players → back of queue, pull next batch, balance, post. |
| `!reroll` | Re-shuffle team assignments for the current batch (same players, new split). |
| `!kick <username>` | Remove a player from the queue. |
| `!mmr <username>` | Manually look up a player's MMR. |
| `!setmmr <username> <mmr>` | Manually override a player's MMR. |

---

## Balance Algorithm

### Team Split Logic

Given the current format and the next N players from the queue (where N = total_slots - 1 for the streamer):

1. Resolve MMR for all active players (API → cache → self-report → default).
2. The streamer is pre-assigned to Team A.
3. For the remaining players, enumerate all possible Team A / Team B splits.
4. Score each split by `abs(team_a_avg_mmr - team_b_avg_mmr)`.
5. Select the split with the minimum MMR difference.
6. On ties, prefer the split that doesn't stack all the highest-MMR players together.

**Complexity:** For 3v3, the streamer takes a Team A slot. Remaining 5 players split into 2 (Team A) + 3 (Team B) = C(5,2) = 10 combinations. For 4v4, C(7,3) = 35. Brute force is trivially fast at these sizes.

### MMR Resolution Priority

1. **API cache** — if cached MMR exists and is < 24 hours old, use it.
2. **Tracker Network API** — fetch peak MMR from TRN. Cache the result.
3. **Self-reported rank** — if API fails or player not found, fall back to their `!join <rank>` value. Map rank labels to estimated MMR:
   - Bronze: 200, Silver: 400, Gold: 600, Platinum: 800
   - Diamond: 1000, Champion: 1200, C2: 1300, C3: 1400
   - GC1: 1500, GC2: 1600, GC3: 1700, SSL: 1900
4. **Default** — if nothing is available, assign a configurable default (e.g., 800, roughly Plat).

### Rank Label Parsing

Accept flexible input: `gc1`, `GC1`, `c3`, `C3`, `d2`, `D2`, `plat`, `plat3`, `diamond`, `champ2`, `ssl`, etc. Normalize to a canonical rank and map to MMR.

---

## Web Dashboard

### Design Direction

**Dark gamer aesthetic.** Think: dark background (#0a0a0f or similar near-black), accent color neon/electric (electric blue #00a8ff or similar — configurable), subtle glow effects on interactive elements, sharp corners or minimal border-radius, monospace or geometric sans-serif font for data (JetBrains Mono / Inter / Rajdhani), clean card-based layout.

NOT over-the-top RGB vomit. Clean, modern, dark — the kind of dashboard a streamer would be proud to show on stream.

### Dashboard Pages / Views

**Main View — Live Queue & Teams (`/channel/:channelName`)**
- Left panel: current queue as an ordered list. Each entry shows position, Twitch username, rank/MMR, and status (waiting / active / played). Subtle color coding by rank tier.
- Center panel: team display. When `!balance` is run, show Team A vs Team B in a versus-style layout. Player cards with name + MMR. Average MMR per team displayed. MMR difference highlighted (green if < 50, yellow if 50-150, red if > 150).
- Right panel: controls. Buttons for Open/Close Queue, Balance, Next, Reroll, Format selector (2v2/3v3/4v4). Streamer MMR display.

**Match History View**
- Table/card list of past matches this session.
- Each entry shows teams, MMR averages, MMR diff, timestamp.

**Settings View**
- Per-channel settings: streamer's RL ID, platform, MMR, default format, default MMR for unranked players.
- Accent color picker.
- TRN API key display (global, set via env — show status only).

### OBS Overlay Mode

A stripped-down, transparent-background version of the team display that can be loaded as an OBS browser source. URL: `https://yourdomain.com/overlay/:channelName`. Shows current teams or "Queue Open — !join to play" when idle. Compact, readable at stream resolution.

### Realtime Updates

All dashboard state updates via WebSocket. When a viewer joins the queue, the dashboard updates instantly. When `!balance` is triggered (from chat OR the dashboard button), teams appear immediately. No polling.

---

## Streamer Configuration

**Global config** (env vars / `.env` file): Bot username, OAuth token, TRN API key, API port. Set once.

**Per-channel config** (database `channels` table): Each streamer's Twitch channel, RL ID, platform, MMR, default format, default MMR for unranked players. Managed by you (the operator) — either via direct DB insert, a simple admin CLI command, or a password-protected admin page in the dashboard.

To add a new streamer:
1. Get their Twitch channel name, RL ID, platform, and approximate MMR.
2. Insert a row into the `channels` table.
3. The bot joins their channel automatically (within 30s or on manual refresh).
4. Give them their dashboard URL: `https://yourdomain.com/channel/theirname`

---

## Phase Plan

### Phase 1: Core Bot + Queue Engine
- [ ] Project scaffolding (TypeScript, ESLint, tsconfig)
- [ ] SQLite database setup with migrations (including `channels` table)
- [ ] tmi.js Twitch bot — connects and joins all channels from DB
- [ ] Channel polling — detect new channels added to DB, join without restart
- [ ] Command parser and router with channel context injection
- [ ] `!register`, `!join`, `!leave`, `!pos` commands (channel-scoped queues)
- [ ] `!queue open/close/clear/list` mod commands
- [ ] FIFO queue manager with position tracking (per-channel isolation)
- [ ] Basic chat output formatting

### Phase 2: MMR Integration
- [ ] Tracker Network API client with rate limiting
- [ ] MMR cache layer (SQLite)
- [ ] Self-report rank parser (flexible input → canonical rank → MMR)
- [ ] `!rank` and `!mmr` commands
- [ ] `!setmmr` manual override
- [ ] MMR resolution pipeline (cache → API → self-report → default)

### Phase 3: Balance Engine + Rotation
- [ ] Balance algorithm (brute-force optimal split)
- [ ] Streamer fixed-slot logic
- [ ] `!balance` command — pull N from queue top, split, post teams
- [ ] `!next` command — rotate played → back of queue, pull next, balance
- [ ] `!reroll` command — reshuffle current batch
- [ ] `!format` command
- [ ] Match history recording
- [ ] Clean chat output for team assignments (formatted, readable)

### Phase 4: Web Dashboard
- [ ] Fastify API server setup with channel-scoped routes (`/api/channels/:id/...`)
- [ ] WebSocket server for realtime state (per-channel rooms)
- [ ] React + Vite frontend scaffolding
- [ ] Dark gamer theme (Tailwind config, CSS variables, fonts)
- [ ] Channel route: `/channel/:name` — each streamer gets their own dashboard URL
- [ ] Live queue panel with rank-colored entries
- [ ] Team display (versus layout, MMR comparison)
- [ ] Control panel (open/close, balance, next, reroll, format picker)
- [ ] Match history view
- [ ] Settings page (per-channel: RL ID, format, default MMR, accent color)
- [ ] OBS overlay mode at `/overlay/:name` (transparent, compact team display)

### Phase 5: Polish + Distribution
- [ ] Error handling and edge cases (duplicate joins, empty queue, not enough players)
- [ ] Chat messages: helpful error messages for viewers
- [ ] `!kick` command
- [ ] Rate limiting on viewer commands
- [ ] Sub-only / follower-only queue mode (optional)
- [ ] Session stats summary command
- [ ] README with setup instructions
- [ ] Docker support (optional)

---

## File Structure

```
balanced-viewer-queue/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts              # Frontend build config
├── tailwind.config.ts
├── src/
│   ├── index.ts                # Entry point — starts bot + API server
│   ├── config.ts               # Config loader (file or env vars)
│   ├── bot/
│   │   ├── twitch-client.ts    # tmi.js connection management
│   │   ├── command-handler.ts  # Command parser + router
│   │   └── commands/
│   │       ├── register.ts
│   │       ├── join.ts
│   │       ├── leave.ts
│   │       ├── pos.ts
│   │       ├── rank.ts
│   │       ├── queue.ts        # open/close/clear/list
│   │       ├── format.ts
│   │       ├── balance.ts
│   │       ├── next.ts
│   │       ├── reroll.ts
│   │       ├── kick.ts
│   │       ├── mmr.ts
│   │       └── setmmr.ts
│   ├── queue/
│   │   ├── queue-manager.ts
│   │   └── rotation.ts
│   ├── balance/
│   │   ├── balance-engine.ts
│   │   └── mmr-resolver.ts
│   ├── api/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── queue.ts
│   │   │   ├── matches.ts
│   │   │   └── settings.ts
│   │   └── ws.ts
│   ├── db/
│   │   ├── database.ts
│   │   ├── migrations/
│   │   │   └── 001-initial.sql
│   │   └── models/
│   │       ├── players.ts
│   │       ├── queue.ts
│   │       ├── matches.ts
│   │       └── mmr-cache.ts
│   └── frontend/
│       ├── index.html
│       ├── App.tsx
│       ├── main.tsx
│       ├── hooks/
│       │   └── useWebSocket.ts
│       ├── components/
│       │   ├── QueuePanel.tsx
│       │   ├── TeamDisplay.tsx
│       │   ├── ControlPanel.tsx
│       │   ├── MatchHistory.tsx
│       │   ├── Settings.tsx
│       │   ├── PlayerCard.tsx
│       │   └── OBSOverlay.tsx
│       └── styles/
│           └── theme.css
├── data/
│   └── bvq.db                  # SQLite database (gitignored)
└── .env                        # Bot credentials + API keys (gitignored)
```

---

## Key Design Decisions

1. **SQLite over Postgres/Redis** — this serves 1-2 channels max. SQLite is zero-config, fast, and the data volume is tiny. All queries are channel-scoped via `channel_id` foreign key.

2. **Brute-force balance over heuristics** — with max 7 players to split (4v4 minus streamer), the search space is at most C(7,3) = 35. No need for approximation algorithms.

3. **MMR caching at 24h TTL** — peak MMR doesn't change mid-session. Aggressive caching avoids TRN rate limits.

4. **WebSocket over polling** — the dashboard needs to feel instant. When someone joins the queue, the streamer sees it immediately.

5. **Monorepo with Vite** — single `npm install`, single build step. Frontend is served by Fastify in production.

6. **tmi.js over custom IRC** — battle-tested, typed, handles reconnection and rate limiting out of the box.

---

## Environment Variables / Config

```
TWITCH_BOT_USERNAME=BVQBot
TWITCH_OAUTH_TOKEN=oauth:xxxxxx
TRN_API_KEY=xxxxx                  # optional
API_PORT=3000
```

Channel-specific config is stored in the `channels` database table, not env vars. To add a new streamer, insert a row into `channels` with their Twitch channel name, RL ID, platform, and MMR. The bot auto-joins all channels listed in the table on startup.

Example: adding a channel via SQLite CLI or a simple admin endpoint:
```sql
INSERT INTO channels (twitch_channel, streamer_twitch_username, streamer_platform, streamer_game_id, streamer_mmr)
VALUES ('coolstreamer', 'coolstreamer', 'epic', 'CoolStreamerRL', 1500);
```

The bot detects new channel rows and joins them without restart (poll the table every 30s or expose an admin endpoint to trigger a refresh).

---

## Edge Cases to Handle

- **Not enough players:** `!balance` with fewer players than the format requires → inform chat how many more are needed.
- **Duplicate join:** Player already in queue tries `!join` again → tell them their position.
- **Unregistered join:** Player tries `!join` without `!register` → prompt them to register.
- **Queue closed:** Player tries `!join` when queue is closed → inform them.
- **TRN API down:** Gracefully fall back to self-report or default MMR. Never block the queue.
- **Player leaves mid-active:** If a player in the current match leaves, pull the next person from queue to replace them, rebalance.
- **Empty queue on `!next`:** Inform streamer no more players are waiting.
- **Single unranked player in lobby:** Use default MMR, note in chat that their rank is estimated.
- **Streamer changes format mid-session:** Current queue is preserved, just adjust the batch size on next `!balance`.
- **Player in multiple channels:** Players table is shared (same Twitch user, same RL ID), but queue_entries are channel-scoped. A player can be in two different streamers' queues simultaneously.
- **Channel added at runtime:** Bot polls the `channels` table every 30s and joins any new channels without requiring a restart.
