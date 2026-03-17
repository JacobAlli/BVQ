# BVQ — Balanced Viewer Queue (Streamer.bot Extension)

A Streamer.bot extension for Rocket League streamers who run viewer private matches. Manages a FIFO (first in, first out) viewer queue with automatic team balancing based on peak MMR from Tracker Network.

## What It Does

- **FIFO queue** — join order determines who plays
- **MMR-aware team balancing** — automatically splits players into balanced teams
- **Auto MMR lookup** — fetches Ranked Doubles 2v2 MMR from Tracker Network
- **Epic account validation** — registration verifies your Epic ID exists on Tracker Network
- **Automatic rotation** — finished players go to the back, next batch gets pulled
- **Flexible format** — supports 2v2, 3v3, and 4v4
- **Persistent data** — player registrations, queue state, and match history survive restarts

## Setup (1 minute)

1. Open Streamer.bot
2. Click **Import** in the top menu
3. Paste the import string from `bvq.sb` (or copy it from the distributor)
4. Click **Import** — this creates the **BVQ Engine** action and all 12 commands automatically
5. Done! Type `!queue open` in your chat to verify

## Commands

### Viewer Commands

| Command     | Description                                |
| ----------- | ------------------------------------------ |
| `!register` | Register your Epic ID: `!register YourName` |
| `!join`     | Join the queue (optional rank: `!join C3`) |
| `!leave`    | Leave the queue                            |
| `!pos`      | Check your position                        |

### Mod/Broadcaster Commands

| Command    | Description                                       |
| ---------- | ------------------------------------------------- |
| `!queue`   | Manage queue: `!queue open/close/clear/list`      |
| `!balance` | Pull players from queue and create balanced teams |
| `!next`    | Rotate current players out, balance next batch    |
| `!reroll`  | Re-shuffle teams (same players, new split)        |
| `!format`  | Set format: `!format 2v2` or `3v3` or `4v4`      |
| `!kick`    | Remove a player: `!kick username`                 |
| `!mmr`     | Look up player's MMR: `!mmr username`             |
| `!setmmr`  | Override MMR: `!setmmr username 1500`             |

> **Note:** `!balance` and `!next` do the same thing — rotate any active players to the back of the queue, then pull the next batch and balance teams. Use whichever you prefer.

## How to Use

1. **Register yourself**: `!register YourEpicName`
2. **Open the queue**: `!queue open`
3. **Viewers join**: They type `!register EpicName` once, then `!join` each session
4. **Create teams**: When enough players are in queue, type `!balance`
5. **Play the match**: The bot posts balanced teams to chat
6. **Next round**: Type `!next` (or `!balance` again) to rotate and balance the next batch
7. **Reshuffle**: Type `!reroll` if you want different team assignments (same players)
8. **Close up**: `!queue close` or `!queue clear` when done

## MMR Resolution

MMR is resolved in this priority:

1. **Cache** — if looked up in the last 24 hours, uses cached value
2. **Tracker Network** — fetches Ranked Doubles 2v2 peak rating automatically
3. **Self-reported** — if a player joins with a rank (`!join C3`), uses that
4. **Default** — 800 MMR (roughly Platinum)

### Supported Rank Labels

`bronze`, `silver`, `gold`, `plat`/`platinum`, `diamond`, `champ`/`champion`, `gc`/`grandchamp`, `ssl`

With tiers: `b1`-`b3`, `s1`-`s3`, `g1`-`g3`, `p1`-`p3`, `d1`-`d3`, `c1`-`c3`, `gc1`-`gc3`

Also: `plat1`-`plat3`, `diamond1`-`diamond3`, `champ1`-`champ3`

## Data Storage

All data is stored as JSON files in `%APPDATA%/BVQ/`:

- `players.json` — registered players and their MMR
- `queue.json` — current queue state
- `matches.json` — match history (last 100)
- `mmr_cache.json` — API response cache (24h TTL)
- `settings.json` — format and queue settings

To reset everything, delete the `%APPDATA%/BVQ/` folder.

## Troubleshooting

**Commands not responding:** Make sure the BVQ Engine action is enabled. Check that each command's Action is set to `BVQ Engine`.

**Registration says "could not verify":** The Tracker Network API may be temporarily busy. The player is still registered — their MMR will be looked up when `!balance` runs.

**TRN not finding a player:** The player must use their exact Epic Games display name (case-sensitive). They need to have played Ranked Doubles 2v2 at least once.

**Queue state seems wrong after restart:** Check that `%APPDATA%/BVQ/` folder exists and contains JSON files. Data loads from these files on first use after a Streamer.bot restart.

## Credits

Built by jKubbbbb
