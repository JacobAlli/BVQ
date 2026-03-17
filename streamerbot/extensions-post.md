# Balanced Viewer Queue (BVQ)

A queue management and team balancing extension for Rocket League streamers who run viewer private matches. Players join a FIFO queue, and when you're ready to play, the bot automatically pulls the next batch and splits them into MMR-balanced teams.

## Features

- **FIFO queue** — join order determines who plays, no favoritism
- **Automatic MMR lookup** — fetches Ranked Doubles 2v2 peak MMR from Tracker Network on registration
- **Epic account validation** — registration verifies the player's Epic ID exists before accepting
- **MMR-balanced teams** — brute-force optimal team split that minimizes MMR difference
- **Automatic rotation** — finished players go to the back of the queue, next batch gets pulled
- **Self-report fallback** — players can join with a rank (`!join C3`) if MMR lookup fails
- **Flexible format** — supports 2v2, 3v3, and 4v4
- **Persistent data** — player registrations, queue state, and match history survive restarts

## Import Code

[bvq.sb](https://github.com/JacobAlli/BVQ/raw/master/streamerbot/bvq.sb)

## Installation

1. In Streamer.bot, click **Import** in the top menu
2. Drag the `bvq.sb` file into the Import String field (or paste the import string)
3. Click **Import** — this creates the BVQ Engine action and all 12 commands automatically
4. That's it! Type `!queue open` in your chat to start

## Commands

### Viewer Commands

| Command | Description |
|---------|-------------|
| `!register <EpicID>` | Register your Epic Games display name |
| `!join` | Join the queue |
| `!join <rank>` | Join with self-reported rank (e.g. `!join C3`) |
| `!leave` | Leave the queue |
| `!pos` | Check your position in the queue |

### Mod / Broadcaster Commands

| Command | Description |
|---------|-------------|
| `!queue open` | Open the queue for joins |
| `!queue close` | Close the queue |
| `!queue clear` | Close and clear the entire queue |
| `!queue list` | Show current queue in chat |
| `!balance` | Pull next batch from queue and create balanced teams |
| `!next` | Rotate current players out, pull next batch, balance |
| `!reroll` | Re-shuffle teams (same players, new split) |
| `!format <2v2\|3v3\|4v4>` | Set the match format |
| `!kick <username>` | Remove a player from the queue |
| `!mmr <username>` | Look up a player's MMR |
| `!setmmr <username> <mmr>` | Manually override a player's MMR |

## How It Works

1. **Viewers register** once with `!register TheirEpicName` — the bot validates their Epic account against Tracker Network and saves their MMR
2. **Streamer opens the queue** with `!queue open`
3. **Viewers join** with `!join` — they're added to the back of the queue
4. **Streamer creates teams** with `!balance` — the bot pulls the next batch of players from the top of the queue, resolves everyone's MMR, and splits them into optimally balanced teams
5. **After the match**, type `!next` to rotate the current players to the back and pull the next batch
6. **Want different teams?** Type `!reroll` to reshuffle the same players into a new split

## MMR Resolution

MMR is resolved automatically in this priority:

1. **Cache** — if looked up in the last 24 hours, uses the cached value
2. **Tracker Network** — fetches Ranked Doubles 2v2 peak rating
3. **Self-reported** — if a player joined with a rank (`!join C3`), uses that
4. **Default** — 800 MMR (roughly Platinum)

### Supported Rank Labels

`bronze`, `silver`, `gold`, `plat`, `diamond`, `champ`, `gc`, `ssl`

With tiers: `b1`-`b3`, `s1`-`s3`, `g1`-`g3`, `p1`-`p3`, `d1`-`d3`, `c1`-`c3`, `gc1`-`gc3`

## Data Storage

All data is stored as JSON files in `%APPDATA%/BVQ/`:

- `players.json` — registered players and their MMR
- `queue.json` — current queue state
- `matches.json` — match history (last 100)
- `mmr_cache.json` — MMR cache (24h TTL)
- `settings.json` — format and queue settings

To reset everything, delete the `%APPDATA%/BVQ/` folder.

## Source Code

[GitHub — JacobAlli/BVQ](https://github.com/JacobAlli/BVQ)
