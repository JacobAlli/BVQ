using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Newtonsoft.Json;

public class CPHInline
{
    // ══════════════════════════════════════════════════════════════
    //  DATA MODELS
    // ══════════════════════════════════════════════════════════════

    class Player
    {
        public string Username { get; set; }
        public string Platform { get; set; }
        public string GameId { get; set; }
        public int? PeakMmr { get; set; }
        public string MmrSource { get; set; } = "none";
        public long MmrLastUpdated { get; set; }
    }

    class QueueEntry
    {
        public string Username { get; set; }
        public int Position { get; set; }
        public string Status { get; set; } = "waiting";
        public int GamesPlayedSession { get; set; }
        public long JoinedAt { get; set; }
    }

    class TeamPlayer
    {
        public string Username { get; set; }
        public int Mmr { get; set; }
    }

    class BalanceResult
    {
        public List<TeamPlayer> Blue { get; set; }
        public List<TeamPlayer> Orange { get; set; }
        public int BlueAvgMmr { get; set; }
        public int OrangeAvgMmr { get; set; }
        public int MmrDiff { get; set; }
    }

    class MatchRecord
    {
        public string Format { get; set; }
        public List<TeamPlayer> Blue { get; set; }
        public List<TeamPlayer> Orange { get; set; }
        public int BlueAvg { get; set; }
        public int OrangeAvg { get; set; }
        public int Diff { get; set; }
        public long CreatedAt { get; set; }
    }

    class MmrCacheEntry
    {
        public int PeakMmr { get; set; }
        public long FetchedAt { get; set; }
    }

    class BvqSettings
    {
        public string DefaultFormat { get; set; } = "3v3";
        public int DefaultMmr { get; set; } = 800;
        public bool QueueOpen { get; set; }
        public string TrnApiKey { get; set; } = "1aa7bbd1-b289-4f02-860d-5779caf557d8";
    }

    class LastBalanceData
    {
        public List<TeamPlayer> Players { get; set; }
        public string Format { get; set; }
        public BalanceResult Result { get; set; }
    }

    class TrnResult
    {
        public bool? ProfileFound { get; set; }  // null=API error, true=found, false=not found
        public int? Mmr { get; set; }
    }

    // ══════════════════════════════════════════════════════════════
    //  STATIC STATE
    // ══════════════════════════════════════════════════════════════

    static bool _initialized = false;
    static Dictionary<string, Player> _players;
    static List<QueueEntry> _queue;
    static List<MatchRecord> _matches;
    static Dictionary<string, MmrCacheEntry> _mmrCache;
    static BvqSettings _settings;
    static LastBalanceData _lastBalance;
    static DateTime _lastTrnRequest = DateTime.MinValue;
    static string _dataDir;

    // ══════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════════

    static readonly string[] ValidFormats = { "2v2", "3v3", "4v4" };

    static readonly Dictionary<string, int> RankMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        {"bronze", 200}, {"silver", 400}, {"gold", 600}, {"platinum", 800}, {"plat", 800},
        {"diamond", 1000}, {"champ", 1200}, {"champion", 1200},
        {"gc", 1500}, {"grandchamp", 1500}, {"ssl", 1900}, {"supersonic", 1900},
        {"b1", 100}, {"b2", 200}, {"b3", 300},
        {"s1", 300}, {"s2", 400}, {"s3", 500},
        {"g1", 500}, {"g2", 600}, {"g3", 700},
        {"p1", 700}, {"p2", 800}, {"p3", 900},
        {"plat1", 700}, {"plat2", 800}, {"plat3", 900},
        {"d1", 900}, {"d2", 1000}, {"d3", 1100},
        {"diamond1", 900}, {"diamond2", 1000}, {"diamond3", 1100},
        {"c1", 1100}, {"c2", 1300}, {"c3", 1400},
        {"champ1", 1100}, {"champ2", 1300}, {"champ3", 1400},
        {"gc1", 1500}, {"gc2", 1600}, {"gc3", 1700},
    };

    static readonly Dictionary<string, int> FormatTeamSize = new Dictionary<string, int>
    {
        {"2v2", 2}, {"3v3", 3}, {"4v4", 4}
    };

    // ══════════════════════════════════════════════════════════════
    //  PERSISTENCE
    // ══════════════════════════════════════════════════════════════

    void EnsureInitialized()
    {
        if (_initialized) return;

        _dataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "BVQ"
        );
        Directory.CreateDirectory(_dataDir);

        _players = LoadJson<Dictionary<string, Player>>("players.json")
                   ?? new Dictionary<string, Player>();
        _queue = LoadJson<List<QueueEntry>>("queue.json")
                 ?? new List<QueueEntry>();
        _matches = LoadJson<List<MatchRecord>>("matches.json")
                   ?? new List<MatchRecord>();
        _mmrCache = LoadJson<Dictionary<string, MmrCacheEntry>>("mmr_cache.json")
                    ?? new Dictionary<string, MmrCacheEntry>();
        _settings = LoadJson<BvqSettings>("settings.json")
                    ?? new BvqSettings();

        _initialized = true;
        CPH.LogInfo("[BVQ] Initialized. Data dir: " + _dataDir);
    }

    T LoadJson<T>(string filename) where T : class
    {
        string path = Path.Combine(_dataDir, filename);
        if (!File.Exists(path)) return null;
        try
        {
            string json = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<T>(json);
        }
        catch (Exception ex)
        {
            CPH.LogWarn("[BVQ] Failed to load " + filename + ": " + ex.Message);
            return null;
        }
    }

    void SaveJson(string filename, object data)
    {
        string path = Path.Combine(_dataDir, filename);
        try
        {
            File.WriteAllText(path, JsonConvert.SerializeObject(data, Formatting.Indented));
        }
        catch (Exception ex)
        {
            CPH.LogWarn("[BVQ] Failed to save " + filename + ": " + ex.Message);
        }
    }

    void SavePlayers() { SaveJson("players.json", _players); }
    void SaveQueue() { SaveJson("queue.json", _queue); }
    void SaveMatches() { SaveJson("matches.json", _matches); }
    void SaveMmrCache() { SaveJson("mmr_cache.json", _mmrCache); }
    void SaveSettings() { SaveJson("settings.json", _settings); }

    // ══════════════════════════════════════════════════════════════
    //  ENTRY POINT
    // ══════════════════════════════════════════════════════════════

    public bool Execute()
    {
        EnsureInitialized();

        CPH.TryGetArg("command", out string command);
        CPH.TryGetArg("rawInput", out string rawInput);
        CPH.TryGetArg("user", out string user);
        CPH.TryGetArg("role", out int role);
        CPH.TryGetArg("isModerator", out bool isMod);
        CPH.TryGetArg("isBroadcaster", out bool isBroadcaster);

        bool isPrivileged = role >= 3 || isMod || isBroadcaster;
        string userLower = (user ?? "").ToLower().Trim();
        string input = (rawInput ?? "").Trim();

        switch (command?.ToLower())
        {
            case "!register": return HandleRegister(userLower, input, isPrivileged);
            case "!join":     return HandleJoin(userLower);
            case "!leave":    return HandleLeave(userLower);
            case "!pos":      return HandlePos(userLower);
            case "!rank":     return HandleRank(userLower);
            case "!queue":    return HandleQueue(userLower, input, isPrivileged);
            case "!balance":  return HandleBalance(userLower, isPrivileged);
            case "!next":     return HandleNext(userLower, input, isPrivileged);
            case "!reroll":   return HandleReroll(userLower, isPrivileged);
            case "!format":   return HandleFormat(userLower, input, isPrivileged);
            case "!lobby":    return HandleLobby(userLower);
            case "!kick":     return HandleKick(userLower, input, isPrivileged);
            case "!mmr":      return HandleMmrLookup(userLower, input, isPrivileged);
            case "!setmmr":   return HandleSetMmr(userLower, input, isPrivileged);
            default:
                CPH.LogWarn("[BVQ] Unknown command: " + command);
                return true;
        }
    }

    void Say(string message)
    {
        CPH.SendMessage(message);
    }

    // ══════════════════════════════════════════════════════════════
    //  QUEUE MANAGEMENT
    // ══════════════════════════════════════════════════════════════

    List<QueueEntry> GetWaitingQueue()
    {
        return _queue
            .Where(e => e.Status == "waiting")
            .OrderBy(e => e.Position)
            .ToList();
    }

    int GetWaitingCount()
    {
        return _queue.Count(e => e.Status == "waiting");
    }

    List<QueueEntry> GetActiveQueue()
    {
        return _queue
            .Where(e => e.Status == "active")
            .OrderBy(e => e.Position)
            .ToList();
    }

    QueueEntry GetEntry(string username)
    {
        return _queue.FirstOrDefault(e => e.Username == username);
    }

    bool AddToQueue(string username)
    {
        if (_queue.Any(e => e.Username == username))
            return false;

        int maxPos = _queue.Count > 0 ? _queue.Max(e => e.Position) : 0;
        _queue.Add(new QueueEntry
        {
            Username = username,
            Position = maxPos + 1,
            Status = "waiting",
            GamesPlayedSession = 0,
            JoinedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
        SaveQueue();
        return true;
    }

    bool RemoveFromQueue(string username)
    {
        int removed = _queue.RemoveAll(e => e.Username == username);
        if (removed > 0)
        {
            CompactPositions();
            return true;
        }
        return false;
    }

    List<QueueEntry> PullNextBatch(int count)
    {
        var waiting = GetWaitingQueue();
        var batch = waiting.Take(count).ToList();
        foreach (var entry in batch)
        {
            // Modify the actual list item by reference
            var actual = _queue.First(e => e.Username == entry.Username);
            actual.Status = "active";
        }
        SaveQueue();
        return batch;
    }

    void RotateQueue()
    {
        // Critical: ORDER BY position ASC before reassigning
        var active = _queue
            .Where(e => e.Status == "active")
            .OrderBy(e => e.Position)
            .ToList();

        if (active.Count == 0) return;

        int maxPos = _queue.Count > 0 ? _queue.Max(e => e.Position) : 0;
        int nextPos = maxPos + 1;

        foreach (var entry in active)
        {
            // Update the actual list item
            var actual = _queue.First(e => e.Username == entry.Username);
            actual.Status = "waiting";
            actual.Position = nextPos++;
            actual.GamesPlayedSession++;
        }
        CompactPositions();
    }

    void CompactPositions()
    {
        var ordered = _queue.OrderBy(e => e.Position).ToList();
        for (int i = 0; i < ordered.Count; i++)
        {
            ordered[i].Position = i + 1;
        }
        SaveQueue();
    }

    void ClearQueue()
    {
        _queue.Clear();
        _settings.QueueOpen = false;
        SaveQueue();
        SaveSettings();
    }

    // ══════════════════════════════════════════════════════════════
    //  BALANCE ENGINE
    // ══════════════════════════════════════════════════════════════

    int GetTeamSize(string format)
    {
        return FormatTeamSize.ContainsKey(format) ? FormatTeamSize[format] : 3;
    }

    int GetTotalSlots(string format)
    {
        return GetTeamSize(format) * 2;
    }

    BalanceResult BalanceTeams(List<TeamPlayer> players, string format)
    {
        int teamSize = GetTeamSize(format);
        int totalNeeded = teamSize * 2;

        if (players.Count != totalNeeded)
            throw new Exception(
                "Expected " + totalNeeded + " players for " + format +
                ", got " + players.Count
            );

        int[] indices = Enumerable.Range(0, players.Count).ToArray();
        List<int[]> combos = GetCombinations(indices, teamSize);

        int[] bestTeamA = null;
        double bestDiff = double.MaxValue;
        double bestMaxSpread = double.MaxValue;

        foreach (int[] teamAIdxs in combos)
        {
            var teamASet = new HashSet<int>(teamAIdxs);
            int[] teamBIdxs = indices.Where(i => !teamASet.Contains(i)).ToArray();

            double[] teamAMmrs = teamAIdxs.Select(i => (double)players[i].Mmr).ToArray();
            double[] teamBMmrs = teamBIdxs.Select(i => (double)players[i].Mmr).ToArray();

            double diff = Math.Abs(teamAMmrs.Average() - teamBMmrs.Average());
            double maxSpread = Math.Max(
                teamAMmrs.Max() - teamAMmrs.Min(),
                teamBMmrs.Max() - teamBMmrs.Min()
            );

            if (diff < bestDiff || (diff == bestDiff && maxSpread < bestMaxSpread))
            {
                bestDiff = diff;
                bestTeamA = teamAIdxs;
                bestMaxSpread = maxSpread;
            }
        }

        var bluePlayers = bestTeamA.Select(i => players[i]).ToList();
        var bestSet = new HashSet<int>(bestTeamA);
        var orangePlayers = indices.Where(i => !bestSet.Contains(i))
                                   .Select(i => players[i]).ToList();

        int blueAvg = (int)Math.Round(bluePlayers.Average(p => (double)p.Mmr));
        int orangeAvg = (int)Math.Round(orangePlayers.Average(p => (double)p.Mmr));

        return new BalanceResult
        {
            Blue = bluePlayers,
            Orange = orangePlayers,
            BlueAvgMmr = blueAvg,
            OrangeAvgMmr = orangeAvg,
            MmrDiff = Math.Abs(blueAvg - orangeAvg)
        };
    }

    List<int[]> GetCombinations(int[] arr, int k)
    {
        var result = new List<int[]>();
        CombinationsHelper(arr, k, 0, new List<int>(), result);
        return result;
    }

    void CombinationsHelper(int[] arr, int k, int start, List<int> current, List<int[]> result)
    {
        if (current.Count == k)
        {
            result.Add(current.ToArray());
            return;
        }
        for (int i = start; i <= arr.Length - (k - current.Count); i++)
        {
            current.Add(arr[i]);
            CombinationsHelper(arr, k, i + 1, current, result);
            current.RemoveAt(current.Count - 1);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  MMR RESOLUTION
    // ══════════════════════════════════════════════════════════════

    int ResolveMmr(string username)
    {
        if (!_players.ContainsKey(username))
            return _settings.DefaultMmr;

        Player player = _players[username];

        // 1. Manual MMR (set by mod/broadcaster) — always takes priority
        if (player.MmrSource == "manual" && player.PeakMmr.HasValue)
            return player.PeakMmr.Value;

        // 2. Check cache (24h TTL)
        string cacheKey = player.GameId.ToLower();
        if (_mmrCache.ContainsKey(cacheKey))
        {
            MmrCacheEntry cached = _mmrCache[cacheKey];
            long age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - cached.FetchedAt;
            if (age < 86400)
                return cached.PeakMmr;
        }

        // 3. Try TRN API
        TrnResult result = LookupEpicProfile(player.GameId);
        if (result.Mmr.HasValue)
        {
            _mmrCache[cacheKey] = new MmrCacheEntry
            {
                PeakMmr = result.Mmr.Value,
                FetchedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
            player.PeakMmr = result.Mmr.Value;
            player.MmrSource = "api";
            player.MmrLastUpdated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            SaveMmrCache();
            SavePlayers();
            return result.Mmr.Value;
        }

        // 4. Previously stored MMR
        if (player.PeakMmr.HasValue)
            return player.PeakMmr.Value;

        // 5. Default
        return _settings.DefaultMmr;
    }

    Dictionary<string, int> ResolveAllMmr(List<string> usernames)
    {
        var result = new Dictionary<string, int>();
        foreach (string u in usernames)
        {
            result[u] = ResolveMmr(u);
        }
        return result;
    }

    TrnResult LookupEpicProfile(string gameId)
    {
        TimeSpan elapsed = DateTime.UtcNow - _lastTrnRequest;
        if (elapsed.TotalMilliseconds < 2000)
        {
            System.Threading.Thread.Sleep(2000 - (int)elapsed.TotalMilliseconds);
        }
        _lastTrnRequest = DateTime.UtcNow;

        string url = "https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/"
                     + Uri.EscapeDataString(gameId);

        try
        {
            string body = CurlGet(url);

            if (body == null)
                return new TrnResult { ProfileFound = null, Mmr = null };

            // curl returns the HTTP body — check if it looks like a 404/error page
            if (body.Contains("\"errors\""))
            {
                var errObj = Newtonsoft.Json.Linq.JObject.Parse(body);
                var errMsg = errObj["errors"]?[0]?["message"]?.ToString() ?? "";
                if (errMsg.Contains("not been found") || errMsg.Contains("not found"))
                {
                    CPH.LogInfo("[BVQ] TRN player not found: epic:" + gameId);
                    return new TrnResult { ProfileFound = false, Mmr = null };
                }
                CPH.LogWarn("[BVQ] TRN error for epic:" + gameId + " — " + errMsg);
                return new TrnResult { ProfileFound = null, Mmr = null };
            }

            var data = Newtonsoft.Json.Linq.JObject.Parse(body);
            var segments = data["data"]?["segments"];

            if (segments == null)
                return new TrnResult { ProfileFound = true, Mmr = null };

            foreach (var segment in segments)
            {
                string segType = segment["type"]?.ToString();
                string segName = segment["metadata"]?["name"]?.ToString();

                if (segType == "playlist" && segName == "Ranked Doubles 2v2")
                {
                    var peakToken = segment["stats"]?["peakRating"]?["value"];
                    var ratingToken = segment["stats"]?["rating"]?["value"];

                    int? peak = peakToken != null ? (int?)peakToken : null;
                    int? rating = ratingToken != null ? (int?)ratingToken : null;

                    return new TrnResult { ProfileFound = true, Mmr = peak ?? rating };
                }
            }

            return new TrnResult { ProfileFound = true, Mmr = null };
        }
        catch (Exception ex)
        {
            CPH.LogWarn("[BVQ] TRN error for epic:" + gameId + ": " + ex.Message);
            return new TrnResult { ProfileFound = null, Mmr = null };
        }
    }

    string CurlGet(string url)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "curl",
                Arguments = "-s -L -H \"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\" "
                          + "-H \"Accept: application/json\" "
                          + "\"" + url + "\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var proc = Process.Start(psi);
            string output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(15000);

            if (proc.ExitCode != 0)
            {
                CPH.LogWarn("[BVQ] curl exited with code " + proc.ExitCode);
                return null;
            }

            return output;
        }
        catch (Exception ex)
        {
            CPH.LogWarn("[BVQ] curl failed: " + ex.Message);
            return null;
        }
    }

    int? ParseRankToMmr(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        string key = input.Trim().ToLower();
        return RankMap.ContainsKey(key) ? (int?)RankMap[key] : null;
    }

    // ══════════════════════════════════════════════════════════════
    //  COMMAND HANDLERS
    // ══════════════════════════════════════════════════════════════

    bool HandleRegister(string user, string input, bool isPrivileged)
    {
        if (string.IsNullOrEmpty(input))
        {
            Say("@" + user + " Usage: !register <EpicID> — Use your Epic Games display name.");
            return true;
        }

        // Mod override: !register <username> <EpicID>
        string[] parts = input.Split(new[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
        string targetUser = user;
        string gameId;

        if (isPrivileged && parts.Length >= 2)
        {
            // Mods can register/re-register on behalf of someone
            targetUser = parts[0].ToLower().TrimStart('@');
            gameId = parts[1].Trim();
        }
        else
        {
            // Viewer self-registration
            if (_players.ContainsKey(user))
            {
                Say("@" + user + " You're already registered as " +
                    _players[user].GameId + ". Ask a mod to update your Epic ID if needed.");
                return true;
            }

            gameId = input.Trim();
        }

        // Handle legacy "platform:id" format — strip the prefix
        if (gameId.StartsWith("epic:", StringComparison.OrdinalIgnoreCase) ||
            gameId.StartsWith("steam:", StringComparison.OrdinalIgnoreCase) ||
            gameId.StartsWith("psn:", StringComparison.OrdinalIgnoreCase) ||
            gameId.StartsWith("xbox:", StringComparison.OrdinalIgnoreCase))
        {
            gameId = gameId.Substring(gameId.IndexOf(':') + 1).Trim();
        }

        if (string.IsNullOrEmpty(gameId))
        {
            Say("@" + user + " You need to provide an Epic ID.");
            return true;
        }

        // Validate against Tracker Network
        TrnResult result = LookupEpicProfile(gameId);

        if (result.ProfileFound == false)
        {
            Say("@" + user + " Could not find \"" + gameId +
                "\" on Tracker Network. Make sure you're using the exact Epic Games display name.");
            return true;
        }

        bool isUpdate = _players.ContainsKey(targetUser);
        if (isUpdate)
        {
            _players[targetUser].Platform = "epic";
            _players[targetUser].GameId = gameId;
        }
        else
        {
            _players[targetUser] = new Player
            {
                Username = targetUser,
                Platform = "epic",
                GameId = gameId,
                MmrSource = "none"
            };
        }

        // If we got MMR from TRN, save it (only if not manually set)
        if (result.Mmr.HasValue && _players[targetUser].MmrSource != "manual")
        {
            _players[targetUser].PeakMmr = result.Mmr.Value;
            _players[targetUser].MmrSource = "api";
            _players[targetUser].MmrLastUpdated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            string cacheKey = gameId.ToLower();
            _mmrCache[cacheKey] = new MmrCacheEntry
            {
                PeakMmr = result.Mmr.Value,
                FetchedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
            SaveMmrCache();
        }

        SavePlayers();

        string mmrMsg = result.Mmr.HasValue
            ? " MMR: " + result.Mmr.Value
            : " (no MMR found — a mod can set it with !setmmr)";

        if (targetUser != user)
            Say("@" + user + " Registered " + targetUser + " as " + gameId + "!" + mmrMsg);
        else
            Say("@" + user + " Registered as " + gameId + "!" + mmrMsg);
        return true;
    }

    bool HandleJoin(string user)
    {
        if (!_players.ContainsKey(user))
        {
            Say("@" + user + " You need to register first! " +
                "Use: !register <EpicID>");
            return true;
        }

        if (!_settings.QueueOpen)
        {
            Say("@" + user + " The queue is currently closed.");
            return true;
        }

        QueueEntry existing = GetEntry(user);
        if (existing != null)
        {
            var waiting = GetWaitingQueue();
            int idx = waiting.FindIndex(e => e.Username == user);
            if (idx >= 0)
                Say("@" + user + " You're already in the queue at position #" + (idx + 1) + ".");
            else
                Say("@" + user + " You're already in the queue (status: " + existing.Status + ").");
            return true;
        }

        AddToQueue(user);
        var waitList = GetWaitingQueue();
        int pos = waitList.FindIndex(e => e.Username == user) + 1;
        Say("@" + user + " You joined the queue at position #" + pos + "!");
        return true;
    }

    bool HandleLeave(string user)
    {
        if (!_players.ContainsKey(user))
        {
            Say("@" + user + " You're not registered. Use: !register <EpicID>");
            return true;
        }

        if (RemoveFromQueue(user))
            Say("@" + user + " You left the queue.");
        else
            Say("@" + user + " You're not in the queue.");
        return true;
    }

    bool HandlePos(string user)
    {
        QueueEntry entry = GetEntry(user);
        if (entry == null)
        {
            Say("@" + user + " You're not in the queue.");
            return true;
        }

        var waiting = GetWaitingQueue();
        int idx = waiting.FindIndex(e => e.Username == user);
        if (idx >= 0)
            Say("@" + user + " You're #" + (idx + 1) + " of " + waiting.Count + " in the queue.");
        else
            Say("@" + user + " You're in the queue (status: " + entry.Status + ").");
        return true;
    }

    bool HandleRank(string user)
    {
        if (!_players.ContainsKey(user))
        {
            Say("@" + user + " You're not registered. Use: !register <EpicID>");
            return true;
        }

        Player player = _players[user];
        if (!player.PeakMmr.HasValue)
        {
            Say("@" + user + " No MMR on file. A mod can set it with !setmmr, or it will be fetched from Tracker Network.");
            return true;
        }

        string source = player.MmrSource == "api" ? "API" :
                         player.MmrSource == "self_report" ? "self-reported" :
                         player.MmrSource == "manual" ? "manual" : "unknown";
        Say("@" + user + " Your MMR: " + player.PeakMmr + " (" + source + ")");
        return true;
    }

    bool HandleLobby(string user)
    {
        if (_lastBalance == null || _lastBalance.Result == null)
        {
            Say("@" + user + " No active lobby right now.");
            return true;
        }

        var blueNames = _lastBalance.Result.Blue.Select(p => p.Username + "(" + p.Mmr + ")");
        var orangeNames = _lastBalance.Result.Orange.Select(p => p.Username + "(" + p.Mmr + ")");

        Say("🔷 Blue: " + string.Join(", ", blueNames) + " | " +
            "🔶 Orange: " + string.Join(", ", orangeNames));
        return true;
    }

    bool HandleQueue(string user, string input, bool isPrivileged)
    {
        string sub = string.IsNullOrEmpty(input) ? "" : input.Split(' ')[0].ToLower();

        if ((sub == "open" || sub == "close" || sub == "clear") && !isPrivileged)
        {
            Say("@" + user + " Only mods and the broadcaster can manage the queue.");
            return true;
        }

        switch (sub)
        {
            case "open":
                _settings.QueueOpen = true;
                SaveSettings();
                Say("The queue is now OPEN! Type !join to enter.");
                break;

            case "close":
                _settings.QueueOpen = false;
                SaveSettings();
                Say("The queue is now CLOSED. No new joins accepted.");
                break;

            case "clear":
                ClearQueue();
                Say("The queue has been cleared and closed.");
                break;

            case "list":
            {
                var entries = GetWaitingQueue();
                if (entries.Count == 0)
                {
                    Say("The queue is empty.");
                    return true;
                }

                var lines = entries.Take(10).Select((e, i) =>
                {
                    Player p = _players.ContainsKey(e.Username) ? _players[e.Username] : null;
                    string mmrStr = (p?.PeakMmr.HasValue == true) ? " (" + p.PeakMmr + ")" : "";
                    return (i + 1) + ". " + e.Username + mmrStr;
                });
                string more = entries.Count > 10
                    ? " (+" + (entries.Count - 10) + " more)" : "";
                Say("Queue (" + entries.Count + "): " + string.Join(" | ", lines) + more);
                break;
            }

            default:
            {
                int count = GetWaitingCount();
                string status = _settings.QueueOpen ? "OPEN" : "CLOSED";
                Say("Queue is " + status + " — " + count +
                    " player" + (count == 1 ? "" : "s") + " waiting.");
                break;
            }
        }
        return true;
    }

    bool HandleBalance(string user, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can balance teams.");
            return true;
        }

        return DoRotateAndBalance();
    }

    bool HandleNext(string user, string input, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can advance the queue.");
            return true;
        }

        string sub = string.IsNullOrEmpty(input) ? "" : input.Split(' ')[0].ToLower();

        if (sub == "blue" || sub == "orange")
            return DoKothRotateAndBalance(sub);
        else
            return DoRotateAndBalance();
    }

    bool DoRotateAndBalance()
    {
        // Rotate any active players to back of queue (no-op if none)
        RotateQueue();

        string format = _settings.DefaultFormat;
        int totalSlots = GetTotalSlots(format);
        int waitingCount = GetWaitingCount();

        if (waitingCount < totalSlots)
        {
            int teamSize = GetTeamSize(format);
            Say("Not enough players for " + format + ". Need " + totalSlots +
                ", have " + waitingCount + ". (" + teamSize + "v" + teamSize + ")");
            return true;
        }

        var batch = PullNextBatch(totalSlots);
        var usernames = batch.Select(e => e.Username).ToList();
        var mmrMap = ResolveAllMmr(usernames);

        var players = usernames.Select(u => new TeamPlayer
        {
            Username = u,
            Mmr = mmrMap[u]
        }).ToList();

        BalanceResult result = BalanceTeams(players, format);

        _lastBalance = new LastBalanceData
        {
            Players = players,
            Format = format,
            Result = result
        };

        RecordMatch(format, result);
        PostTeams(result);
        return true;
    }

    bool DoKothRotateAndBalance(string winnerTeam)
    {
        if (_lastBalance == null || _lastBalance.Result == null)
        {
            Say("No active lobby. Use !balance to start.");
            return true;
        }

        string format = _settings.DefaultFormat;
        int teamSize = GetTeamSize(format);

        // Determine which team stays (winners) and which rotates out (losers)
        List<TeamPlayer> winners = winnerTeam == "blue"
            ? _lastBalance.Result.Blue
            : _lastBalance.Result.Orange;
        List<TeamPlayer> losers = winnerTeam == "blue"
            ? _lastBalance.Result.Orange
            : _lastBalance.Result.Blue;

        // Rotate losers to back of queue
        int maxPos = _queue.Count > 0 ? _queue.Max(e => e.Position) : 0;
        int nextPos = maxPos + 1;
        foreach (var loser in losers)
        {
            var entry = _queue.FirstOrDefault(e => e.Username == loser.Username && e.Status == "active");
            if (entry != null)
            {
                entry.Status = "waiting";
                entry.Position = nextPos++;
                entry.GamesPlayedSession++;
            }
        }
        CompactPositions();

        // Winners stay active — verify they're still in queue
        var stayingPlayers = new List<string>();
        foreach (var winner in winners)
        {
            var entry = _queue.FirstOrDefault(e => e.Username == winner.Username && e.Status == "active");
            if (entry != null)
                stayingPlayers.Add(winner.Username);
        }

        // How many new players do we need?
        int totalSlots = GetTotalSlots(format);
        int slotsNeeded = totalSlots - stayingPlayers.Count;
        int waitingCount = GetWaitingCount();

        if (waitingCount < slotsNeeded)
        {
            Say("Not enough players in queue. Need " + slotsNeeded +
                " more, have " + waitingCount + " waiting.");
            return true;
        }

        // Pull new players from queue
        var newBatch = PullNextBatch(slotsNeeded);
        var allUsernames = stayingPlayers
            .Concat(newBatch.Select(e => e.Username))
            .ToList();

        // Resolve MMR and balance all players together
        var mmrMap = ResolveAllMmr(allUsernames);
        var players = allUsernames.Select(u => new TeamPlayer
        {
            Username = u,
            Mmr = mmrMap[u]
        }).ToList();

        BalanceResult result = BalanceTeams(players, format);

        _lastBalance = new LastBalanceData
        {
            Players = players,
            Format = format,
            Result = result
        };

        string winLabel = winnerTeam == "blue" ? "🔷 Blue" : "🔶 Orange";
        Say(winLabel + " wins! Rotating in new challengers...");
        RecordMatch(format, result);
        PostTeams(result);
        return true;
    }

    bool HandleReroll(string user, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can reroll teams.");
            return true;
        }

        if (_lastBalance == null)
        {
            Say("@" + user + " No active balance to reroll. Run !balance first.");
            return true;
        }

        // Check for missing players (kicked or left since last balance)
        var currentPlayers = new List<TeamPlayer>();
        var missing = new List<string>();
        foreach (var p in _lastBalance.Players)
        {
            var entry = GetEntry(p.Username);
            if (entry != null && entry.Status == "active")
                currentPlayers.Add(p);
            else
                missing.Add(p.Username);
        }

        // Pull replacements from queue for missing players
        if (missing.Count > 0)
        {
            int waitingCount = GetWaitingCount();
            int replacements = Math.Min(missing.Count, waitingCount);

            if (replacements > 0)
            {
                var newBatch = PullNextBatch(replacements);
                var newUsernames = newBatch.Select(e => e.Username).ToList();
                var newMmr = ResolveAllMmr(newUsernames);

                foreach (string u in newUsernames)
                {
                    currentPlayers.Add(new TeamPlayer { Username = u, Mmr = newMmr[u] });
                }
            }

            if (currentPlayers.Count < GetTotalSlots(_lastBalance.Format))
            {
                Say("Removed " + string.Join(", ", missing) +
                    " but not enough players in queue to fill the lobby. Need " +
                    (GetTotalSlots(_lastBalance.Format) - currentPlayers.Count) + " more.");
                return true;
            }

            Say("Replaced " + string.Join(", ", missing) + " with players from queue.");
        }

        // Shuffle players for a different split
        var rng = new Random();
        var shuffled = currentPlayers.OrderBy(_ => rng.Next()).ToList();

        BalanceResult result = BalanceTeams(shuffled, _lastBalance.Format);

        _lastBalance = new LastBalanceData
        {
            Players = shuffled,
            Format = _lastBalance.Format,
            Result = result
        };

        RecordMatch(_lastBalance.Format, result);
        if (missing.Count == 0) Say("Rerolled teams!");
        PostTeams(result);
        return true;
    }

    bool HandleFormat(string user, string input, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can change the format.");
            return true;
        }

        string fmt = string.IsNullOrEmpty(input) ? "" : input.Split(' ')[0].ToLower();
        if (!ValidFormats.Contains(fmt))
        {
            Say("@" + user + " Usage: !format <2v2|3v3|4v4> — Current: " +
                _settings.DefaultFormat);
            return true;
        }

        _settings.DefaultFormat = fmt;
        SaveSettings();
        Say("Format set to " + fmt + ".");
        return true;
    }

    bool HandleKick(string user, string input, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can kick players.");
            return true;
        }

        string target = string.IsNullOrEmpty(input) ? "" :
                         input.Split(' ')[0].ToLower().TrimStart('@');
        if (string.IsNullOrEmpty(target))
        {
            Say("@" + user + " Usage: !kick <username>");
            return true;
        }

        if (RemoveFromQueue(target))
            Say(target + " has been removed from the queue.");
        else
            Say("@" + user + " " + target + " is not in the queue.");
        return true;
    }

    bool HandleMmrLookup(string user, string input, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can look up other players' MMR.");
            return true;
        }

        string target = string.IsNullOrEmpty(input) ? "" :
                         input.Split(' ')[0].ToLower().TrimStart('@');
        if (string.IsNullOrEmpty(target))
        {
            Say("@" + user + " Usage: !mmr <username>");
            return true;
        }

        if (!_players.ContainsKey(target))
        {
            Say("@" + user + " Player \"" + target + "\" is not registered.");
            return true;
        }

        int mmr = ResolveMmr(target);
        Player p = _players[target];
        string source = p.MmrSource == "api" ? "API" :
                         p.MmrSource == "self_report" ? "self-reported" :
                         p.MmrSource == "manual" ? "manual" : "default";
        Say("@" + user + " " + target + "'s MMR: " + mmr + " (" + source + ")");
        return true;
    }

    bool HandleSetMmr(string user, string input, bool isPrivileged)
    {
        if (!isPrivileged)
        {
            Say("@" + user + " Only mods can set MMR.");
            return true;
        }

        string[] parts = (input ?? "").Split(
            new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            Say("@" + user + " Usage: !setmmr <username> <mmr>");
            return true;
        }

        string target = parts[0].ToLower().TrimStart('@');
        int mmr;
        int? rankMmr = ParseRankToMmr(parts[1]);
        if (rankMmr.HasValue)
        {
            mmr = rankMmr.Value;
        }
        else if (!int.TryParse(parts[1], out mmr) || mmr < 0 || mmr > 3000)
        {
            Say("@" + user + " Usage: !setmmr <username> <mmr or rank> — e.g. !setmmr user 1200 or !setmmr user gc1");
            return true;
        }

        if (!_players.ContainsKey(target))
        {
            Say("@" + user + " Player \"" + target + "\" is not registered.");
            return true;
        }

        _players[target].PeakMmr = mmr;
        _players[target].MmrSource = "manual";
        _players[target].MmrLastUpdated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        SavePlayers();
        Say("@" + user + " Set " + target + "'s MMR to " + mmr + ".");
        return true;
    }

// ══════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════

    void RecordMatch(string format, BalanceResult result)
    {
        _matches.Add(new MatchRecord
        {
            Format = format,
            Blue = result.Blue,
            Orange = result.Orange,
            BlueAvg = result.BlueAvgMmr,
            OrangeAvg = result.OrangeAvgMmr,
            Diff = result.MmrDiff,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });

        // Cap at 100 matches
        if (_matches.Count > 100)
            _matches = _matches.Skip(_matches.Count - 100).ToList();

        SaveMatches();
    }

    void PostTeams(BalanceResult result)
    {
        var blueNames = result.Blue.Select(p => p.Username + "(" + p.Mmr + ")");
        var orangeNames = result.Orange.Select(p => p.Username + "(" + p.Mmr + ")");

        Say("🔷 Blue [avg " + result.BlueAvgMmr + "]: " +
            string.Join(", ", blueNames) + " | " +
            "🔶 Orange [avg " + result.OrangeAvgMmr + "]: " +
            string.Join(", ", orangeNames) + " | " +
            "Diff: " + result.MmrDiff);
    }
}
