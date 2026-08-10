class Match {
    constructor(p1, p2) {
        this.p1 = p1; // Player object
        this.p2 = p2; // Player object
        this.sets = []; // Array of specific scores e.g. [{p1:6, p2:4}, {p1:4, p2:6}, {p1:10, p2:8}]
        this.winner = null;
        this.isPlayed = false;
    }

    setScore(scoreString) {
        // Expected format: "6-4 4-6 10-8" or "6/4 4/6 10/8"
        const parts = scoreString.trim().split(/[\s,]+/);
        const setsToAdd = [];

        parts.forEach(part => {
            const scores = part.replace('/', '-').split('-');
            if (scores.length === 2) {
                const s1 = parseInt(scores[0]);
                const s2 = parseInt(scores[1]);
                if (!isNaN(s1) && !isNaN(s2)) {
                    setsToAdd.push({ p1: s1, p2: s2 });
                }
            }
        });

        this.setScoreFromSets(setsToAdd);
    }

    setScoreFromSets(setsArray) {
        this.sets = [];
        let p1Sets = 0;
        let p2Sets = 0;

        for (let i = 0; i < setsArray.length; i++) {
            const set = setsArray[i];
            const s1 = set.p1;
            const s2 = set.p2;

            this.sets.push({ p1: s1, p2: s2 });

            // Regular Set Rules:
            // Won if 6-X where X<=4
            // Won if 7-5 or 7-6
            const isRegularSetWin = (winner, loser) => {
                if (winner === 6 && loser <= 4) return true;
                if (winner === 7 && (loser === 5 || loser === 6)) return true;
                return false;
            };

            // STB or Pro Set Rules (Generous fallback for high scores):
            // Won if >= 10 and margin >= 2
            const isSuperSetWin = (winner, loser) => {
                return winner >= 10 && (winner - loser) >= 2;
            };

            // Determine set winner
            if (isRegularSetWin(s1, s2) || isSuperSetWin(s1, s2)) {
                p1Sets++;
            } else if (isRegularSetWin(s2, s1) || isSuperSetWin(s2, s1)) {
                p2Sets++;
            }

            // TERMINATION CHECK
            if ((p1Sets === 2 || p2Sets === 2)) {
                // Match finished at this set.
                // If there are more sets in setsArray, throw error.
                if (i < setsArray.length - 1) {
                    throw new Error(`Partido finalizado en el set ${i + 1}. No puedes cargar un ${i + 2}º set.`);
                }
                break; // Stop adding
            }
        }

        this.isPlayed = true;

        if (p1Sets > p2Sets) this.winner = this.p1;
        else if (p2Sets > p1Sets) this.winner = this.p2;
        else this.winner = null;
    }

    setWalkover(winnerPlayer) {
        if (!winnerPlayer) return;
        this.winner = winnerPlayer;
        this.sets = [{ p1: 'W', p2: 'O' }]; // Symbolic representation
        this.isPlayed = true;
        this.isWalkover = true;
    }
}

class Tournament {
    constructor() {
        this.name = null;
        this.institution = null; // Linked Institution Name
        this.type = 'singles';
        this.category = 'Open'; // A, B, C...
        this.players = [];
        this.groups = [];
        this.matches = []; // Flat list of all matches
        this.bracket = [];
        this.championName = null;
        this.surface = null;
    }

    init(name, type, category, institution = null, startDate = null, duration = null, observations = '', rules = {}, registrationDeadline = null, championName = null, surface = null) {
        this.name = name;
        this.institution = institution;
        this.type = type;
        this.category = category;
        this.startDate = startDate;
        this.duration = duration;
        this.observations = observations;
        this.rules = rules; // { goldenPoint, matchFormat, tiebreakType }
        this.registrationDeadline = registrationDeadline;
        this.championName = championName;
        this.surface = surface;
        this.players = [];
        this.groups = [];
        this.matches = [];
        this.bracket = [];
    }

    // Helper to compare categories. Returns true if pCat is allowed in tCat.
    // Logic: A > B > C.
    // If Tournament is B, allow B and C. Reject A.
    // 1(A) < 2(B).
    // If P (1) < T (2) -> REJECT.
    isCategoryAllowed(playerCat) {
        const ranks = { 'A': 1, 'B': 2, 'C': 3, 'OPEN': 0 }; // OPEN allows everyone
        const tRank = ranks[this.category.toUpperCase()] || 0;
        const pRank = ranks[playerCat.toUpperCase()] || 3; // Default to lowest if unknown

        // If Tournament is Open (0), allow all.
        // If P=1 (A), T=2 (B). 1 < 2 -> False.
        // If P=2 (B), T=2 (B). 2 >= 2 -> True.
        // If P=3 (C), T=2 (B). 3 >= 2 -> True.

        if (tRank === 0) return true;
        return pRank >= tRank;
    }

    addPlayer(name, category) {
        if (!this.isCategoryAllowed(category)) {
            throw new Error(`Jugador de categoría ${category} no puede jugar torneo categoría ${this.category}.`);
        }

        this.players.push({
            id: this.players.length + 1,
            name: name,
            category: category,
            // Doubles specific
            members: [name],
            isComplete: this.type === 'singles', // In singles, always complete. In doubles, starts false if created this way.
            // Stats
            matchesPlayed: 0,
            matchesWon: 0,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            points: 0,
            diffSets: 0,
            diffGames: 0
        });
    }

    // Doubles: Register just one person (waiting for partner)
    createDoublesTeam(playerName, category) {
        if (this.type !== 'doubles') throw new Error("Este torneo no es de dobles.");
        if (!this.isCategoryAllowed(category)) {
            throw new Error(`Categoría ${category} no permitida.`);
        }

        // Similar to addPlayer but explicit incomplete
        this.players.push({
            id: this.players.length + 1,
            name: `${playerName} (Esperando compañero)`,
            category: category,
            members: [playerName],
            isComplete: false,
            // Stats (init 0)
            matchesPlayed: 0,
            matchesWon: 0,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            points: 0,
            diffSets: 0,
            diffGames: 0
        });
    }

    joinDoublesTeam(teamId, partnerName) {
        const team = this.players.find(p => p.id === teamId);
        if (!team) throw new Error("Equipo no encontrado");
        if (team.isComplete) throw new Error("El equipo ya está completo");

        team.members.push(partnerName);
        team.name = `${team.members[0]} / ${team.members[1]}`;
        team.isComplete = true;
    }

    getPlayersListString() {
        return this.players.map(p => p.name).join('\n');
    }

    generateGroups() {
        const totalPlayers = this.players.length;
        if (totalPlayers < 3) throw new Error(`Mínimo 3 jugadores para generar grupos. Actualmente hay ${totalPlayers} inscrito(s).`);

        // Shuffle
        let shuffled = [...this.players].sort(() => Math.random() - 0.5);

        // Strategy: Groups of 3. Remainders go to last groups to make 4.
        const groupCount = Math.floor(totalPlayers / 3);
        // Example: 4 players -> 1 group of 4? Or 1 group of 3 and 1 left over?
        // User said: "Grupos de 3 o 4".
        // If 4 players -> 1 group of 4.
        // If 5 players -> 1 group of 3, 1 group of 2 (bad).
        // If 5 -> 1 group of 5 (too big)? Or maybe 1 group of 3, matches inter-group? No.

        // Better logic: Calculate number of groups to minimize size variance.
        // Target size 3.

        this.groups = [];
        // Initialize groups
        // If players = 4 -> 1 group.
        // If players = 5 -> 1 group (5 is acceptable? User said 3 or 4).
        // Let's try to fit into 3 or 4.

        // Simple logic for now: Create groups of 3 until we run out, then distribute remainder.
        let numGroups = Math.floor(totalPlayers / 3);

        // If we have 4 players, Math.floor(4/3) = 1. Remainder 1. -> Group of 4. Good.
        // If we have 5 players, Math.floor(5/3) = 1. Remainder 2. -> Group of 5?
        // Be smart: 5 players -> Group of 5 is probably better than 3 and 2.
        // Or user explicitly said 3 or 4.
        // If 8 players -> 2 groups of 4.
        // If 7 players -> 1 group of 4, 1 group of 3.

        // Let's settle on: N groups.
        // If N=2, players=7. 7/2 = 3.5. -> 4 and 3.

        // Determine N groups such that size is between 3 and 4.
        // If impossible (e.g. 2 players), error.

        // Let's try to prioritize groups of 3.
        // But if we have huge numbers, we just mod.

        const idealSize = 3;
        numGroups = Math.ceil(totalPlayers / 4); // Min groups (max size 4)
        const maxGroups = Math.floor(totalPlayers / 3); // Max groups (min size 3)
        // Pick maxGroups normally to have smaller groups (more groups of 3).

        // Exception: 5 players. maxGroups=1 (floor). minGroups=2.
        // We can't do 2 groups of 3 (need 6).
        // We can't do 2 groups (3+2).
        // So 1 group of 5. User didn't say 5 allowed. But let's allow it as fallback.

        let targetGroups = maxGroups;
        if (targetGroups === 0) targetGroups = 1; // Fallback for <3 but >0

        for (let i = 0; i < targetGroups; i++) {
            this.groups.push({ id: i + 1, players: [], matches: [] }); // Group matches
        }

        shuffled.forEach((p, i) => {
            this.groups[i % targetGroups].players.push(p);
        });

        this.generateGroupMatches();
    }

    generateGroupMatches() {
        this.matches = [];
        this.groups.forEach((group, groupIndex) => {
            group.matches = []; // Clear
            const ps = group.players;
            // Round robin
            for (let i = 0; i < ps.length; i++) {
                for (let j = i + 1; j < ps.length; j++) {
                    const m = new Match(ps[i], ps[j]);
                    m.groupNumber = groupIndex + 1; // Assign group number for filtering
                    m.roundName = 'Grupos';
                    group.matches.push(m);
                    this.matches.push(m);
                }
            }
        });
    }

    updateStandings() {
        // Reset Stats
        this.players.forEach(p => {
            p.matchesPlayed = 0;
            p.matchesWon = 0;
            p.setsWon = 0;
            p.setsLost = 0;
            p.gamesWon = 0;
            p.gamesLost = 0;
            p.points = 0;
            p.diffSets = 0;
            p.diffGames = 0;
        });

        this.matches.forEach(m => {
            console.log(`Checking match for standings: ${m.p1.name} vs ${m.p2.name}, Round: ${m.roundName}, isPlayoff: ${m.isPlayoff}, Winner: ${m.winner?.name}`);
            if (m.isPlayed && m.winner && !m.isPlayoff) {
                // Update basic stats
                m.p1.matchesPlayed++;
                m.p2.matchesPlayed++;

                if (m.winner === m.p1) {
                    m.p1.matchesWon++;
                    m.p1.points += 1; // Custom rule: 1 pt per win
                } else {
                    m.p2.matchesWon++;
                    m.p2.points += 1;
                }

                // Detailed Stats
                m.sets.forEach((set, index) => {
                    const isSuperTieBreak = (Math.max(set.p1, set.p2) >= 10 && Math.abs(set.p1 - set.p2) >= 2 && m.sets.length === 3 && index === 2);

                    // Logic for "Games" in STB:
                    // Option A: Count STB as 1 game (1-0).
                    // Option B: Count points as games (10-8).
                    // Given "game diff", usually STB points distort too much (e.g. 10-0 is +10 games).
                    // I will count STB as 1 game win for winner, 0 for loser.

                    if (isSuperTieBreak) {
                        if (set.p1 > set.p2) {
                            m.p1.gamesWon += 1;
                            m.p2.gamesLost += 1;
                            m.p1.setsWon += 1;
                            m.p2.setsLost += 1;
                        } else {
                            m.p2.gamesWon += 1;
                            m.p1.gamesLost += 1;
                            m.p2.setsWon += 1;
                            m.p1.setsLost += 1;
                        }
                    } else {
                        // Normal Set
                        m.p1.gamesWon += set.p1;
                        m.p1.gamesLost += set.p2;
                        m.p2.gamesWon += set.p2;
                        m.p2.gamesLost += set.p1;

                        if (set.p1 > set.p2) {
                            m.p1.setsWon++;
                            m.p2.setsLost++;
                        } else if (set.p2 > set.p1) {
                            m.p2.setsWon++;
                            m.p1.setsLost++;
                        }
                    }
                });
            }
        });

        // Calc Diffs
        this.players.forEach(p => {
            p.diffSets = p.setsWon - p.setsLost;
            p.diffGames = p.gamesWon - p.gamesLost;
        });

        // Sort Groups
        this.groups.forEach(group => {
            group.players.sort((a, b) => {
                // 1. Points (Wins)
                if (b.points !== a.points) return b.points - a.points;

                // 2. Head-to-Head (if only 2 players are tied in points)
                // We check if there's a match between them
                const headToHeadMatch = this.matches.find(m =>
                    m.isPlayed &&
                    ((m.p1.id === a.id && m.p2.id === b.id) || (m.p1.id === b.id && m.p2.id === a.id))
                );

                if (headToHeadMatch) {
                    if (headToHeadMatch.winner.id === a.id) return -1; // a wins H2H, stays above b
                    if (headToHeadMatch.winner.id === b.id) return 1;  // b wins H2H, goes above a
                }

                // 3. Set Diff
                if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;

                // 4. Game Diff
                return b.diffGames - a.diffGames;
            });
        });
    }

    // Check if all group stage matches are complete
    areAllGroupMatchesComplete() {
        if (this.groups.length === 0) return false;
        if (this.matches.length === 0) return false;

        // Only check group matches (not playoff matches)
        const groupMatches = this.matches.filter(m => !m.isPlayoff);
        if (groupMatches.length === 0) return false;

        return groupMatches.every(m => m.isPlayed && m.winner);
    }

    // Check if a specific group has completed all its matches
    isGroupComplete(groupIndex) {
        if (!this.groups[groupIndex]) return false;
        const group = this.groups[groupIndex];
        if (!group.matches || group.matches.length === 0) return false;
        return group.matches.every(m => m.isPlayed && m.winner);
    }

    // Get qualified players (1st and 2nd from each group)
    getQualifiedPlayers() {
        this.updateStandings();
        const qualified = [];

        this.groups.forEach((group, groupIndex) => {
            const sorted = [...group.players].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;
                return b.diffGames - a.diffGames;
            });

            // 1st place
            if (sorted[0]) {
                qualified.push({ player: sorted[0], position: 1, group: groupIndex + 1 });
            }
            // 2nd place
            if (sorted[1]) {
                qualified.push({ player: sorted[1], position: 2, group: groupIndex + 1 });
            }
        });

        return qualified;
    }

    generateBracket() {
        // 0. Safety Guard: Don't allow regeneration if bracket exists
        if (this.bracket && this.bracket.length > 0) {
            throw new Error("Las llaves ya han sido generadas. Para resetearlas, contacta a soporte o limpia la base de datos.");
        }

        // 1. Validate Group Stage Completion
        // Flatten all matches in groups and check isPlayed
        const allGroupMatches = this.groups.flatMap(g => g.matches);
        const incompleteMatches = allGroupMatches.filter(m => !m.isPlayed);

        if (incompleteMatches.length > 0) {
            throw new Error(`No se pueden generar las llaves. Aún hay ${incompleteMatches.length} partidos de grupo pendientes.`);
        }

        // 2. Identify Qualifiers (Top 2 per Group)
        this.updateStandings();
        let qualifiers = [];
        this.groups.forEach(g => {
            // 1st place
            if (g.players[0]) qualifiers.push({ p: g.players[0], pos: 1 });
            // 2nd place
            if (g.players[1]) qualifiers.push({ p: g.players[1], pos: 2 });
        });

        // Sort qualifiers based on performance (Points > DiffSets > DiffGames)
        qualifiers.sort((a, b) => {
            if (a.pos !== b.pos) return a.pos - b.pos; // 1sts first, then 2nds
            if (b.p.points !== a.p.points) return b.p.points - a.p.points;
            if (b.p.diffSets !== a.p.diffSets) return b.p.diffSets - a.p.diffSets;
            return b.p.diffGames - a.p.diffGames;
        });

        // Target size: Power of 2 (4, 8, 16)
        let n = qualifiers.length;
        if (n < 2) throw new Error("No hay suficientes clasificados (mínimo 2).");

        let size = 2;
        while (size < n) size *= 2;
        // If we have 6, size is 8. So 2 byes?
        // For MVP, we'll slice to the closest power of 2 downwards if not exact? 
        // No, usually you give Byes to top seeds.
        // Let's assume we limit to the top power of 2 players (drop lowest qualifiers)
        // OR we implement BYES. 
        // User said: "Generar Llave". Let's stick to simple: Crop to power of 2.
        // If 6 players: Take top 4. (Sorry bottom 2).
        // Or Take top 8 (adding 2 Nulls).
        // Let's crop to `closest_lower_power_of_2` if not distinct?
        // Actually, 8 is better. Top 2 get Byes.
        // Implementation: Pad with "BYE" players.

        // Let's crop to 4, 8, 16 for simplicity in MVP 1.0 logic.
        // If 6 players -> Top 4 qualify.
        // If 12 players -> Top 8 qualify.
        let bracketSize = 4;
        if (n >= 8) bracketSize = 8;
        if (n >= 16) bracketSize = 16;

        // Taking top K qualifiers
        let seeds = qualifiers.slice(0, bracketSize).map(q => q.p);

        if (seeds.length < bracketSize) {
            // Not enough players for minimum bracket 4?
            // Should not happen if check n < 2, but logic above sets 4 as min.
            // If n=2 or 3 -> bracketSize=4. We need to fill with BYEs or reduce to Final (2).
            if (n < 4) bracketSize = 2;
            seeds = qualifiers.slice(0, bracketSize).map(q => q.p);
        }

        this.bracket = []; // Array of Rounds (Arrays of Matches)

        // Calculate Rounds needed
        // Size 8 -> QF (4), SF (2), F (1). Rounds = 3. Log2(8).
        const numRounds = Math.log2(bracketSize);

        // Generate Empty Bracket Tree
        // We generate rounds from Final (Round N) down to First Round? 
        // Or First to Final.
        // Let's build strictly: Round 0 = First Round.

        let rounds = [];
        for (let r = 0; r < numRounds; r++) {
            rounds.push([]); // Init round array
        }

        // Logic to link matches
        // Round 0 has size/2 matches.
        // Round 1 has size/4...
        // ...
        // Round Last has 1 match.

        // We'll create objects with temp IDs to link them inside memory
        let matchCounter = 0;

        // Build rounds content
        let matchesInRound = bracketSize / 2;
        for (let r = 0; r < numRounds; r++) {
            let roundName = this.getRoundName(matchesInRound);
            for (let m = 0; m < matchesInRound; m++) {
                let match = new Match(null, null); // Empty match
                match._tempId = `temp-${r}-${m}`; // Internal ID for linking
                match.roundName = roundName;
                match.isPlayoff = true;
                match.packet_pos = m; // Position in the bracket (0=top, 1=bottom relative to parent)
                // packet_pos logic:
                // If I am Round 0, Match 0. My Next is Round 1, Match 0. Pos 0 (Top).
                // If I am Round 0, Match 1. My Next is Round 1, Match 0. Pos 1 (Bottom).

                // Linkage (except for Final)
                if (r < numRounds - 1) {
                    let nextRoundIdx = r + 1;
                    let nextMatchIdx = Math.floor(m / 2);
                    let posInNext = m % 2; // 0 or 1
                    match._nextMatchTempId = `temp-${nextRoundIdx}-${nextMatchIdx}`;
                    match.bracket_pos = posInNext;
                } else {
                    match.next_match_id = null; // Champion
                }

                rounds[r].push(match);
            }
            matchesInRound /= 2;
        }

        // Now Populate First Round with Seeds
        // Ordering for Size 8: 1-8, 4-5, 3-6, 2-7. 
        // Indices (0-based): 0 vs 7, 3 vs 4, 2 vs 5, 1 vs 6.
        // Pairings array logic.

        // Generic seeding function
        const getSeeding = (numPlayers) => {
            let rounds = Math.log2(numPlayers) - 1;
            let pls = [1, 2]; // Start with Final (1 vs 2)
            for (let i = 0; i < rounds; i++) {
                let next = [];
                pls.forEach(p => {
                    next.push(p);
                    next.push(numPlayers + 1 - p); // 1 vs 8 (1+8=9), 2 vs 7 ...
                });
                pls = next;
            }
            return pls; // [1, 8, 4, 5, 2, 7, 3, 6] for 8
        };

        const seedOrder = getSeeding(bracketSize);
        // seedOrder is [1, 8, 4, 5, 2, 7, 3, 6]
        // Pairs: (1,8), (4,5), (2,7), (3,6)
        // Wait, standard bracket visualization order is usually:
        // Top Half: (1 vs 8), (4 vs 5)
        // Bottom Half: (3 vs 6), (2 vs 7) -> Wait, 2 vs 7 usually at very bottom?
        // Standard: 1 vs 8, 4 vs 5, 3 vs 6, 2 vs 7 ?
        // Winner(1,8) vs Winner(4,5).
        // Winner(3,6) vs Winner(2,7) -> Winner(2) usually meets Winner(3) in semis?
        // Yes. 1 meets 4. 2 meets 3.
        // So pairs: [ (1,8), (4,5) ] and [ (3,6), (2,7) ].

        // My rounds[0] has matches mapping to that structure.
        // matches[0] links to SF[0]. matches[1] links to SF[0].
        // So matches[0] should be (1 vs 8). matches[1] should be (4 vs 5).
        // matches[2] links to SF[1]. matches[3] links to SF[1].
        // matches[2] should be (3 vs 6). matches[3] should be (2 vs 7).

        // Let's iterate matches[0..3] and assign.
        // M0: Seed 1 (Idx 0) vs Seed 8 (Idx 7)
        // M1: Seed 4 (Idx 3) vs Seed 5 (Idx 4)
        // M2: Seed 3 (Idx 2) vs Seed 6 (Idx 5)
        // M3: Seed 2 (Idx 1) vs Seed 7 (Idx 6)

        // We need a map from "Match Index" to "Seed Pair".
        // Use the seedOrder array.
        // Chunk into pairs? [1,8], [4,5], [2,7], [3,6].
        // Wait, current seedOrder [1,8,4,5,2,7,3,6] gives exactly that if taken sequentially.
        // (1,8) -> M0. (4,5) -> M1. (2,7) -> M2?
        // If I put (2,7) at M2, then Winner(2) meets Winner(3) ?
        // M2 and M3 feed SF1.
        // If M2=(2,7) and M3=(3,6). Then Winner(2) plays Winner(3). Correct.
        // So the seedOrder generated by algorithm is exactly correct for sequential match assignment.

        for (let i = 0; i < rounds[0].length; i++) {
            let match = rounds[0][i];
            let seed1 = seedOrder[i * 2]; // 1-based seed
            let seed2 = seedOrder[i * 2 + 1];

            match.p1 = seeds[seed1 - 1]; // 0-based array index
            match.p2 = seeds[seed2 - 1];
            match.isPlayed = false;
        }

        this.bracket = rounds;
    }

    getRoundName(numMatches) {
        if (numMatches === 1) return 'Final';
        if (numMatches === 2) return 'Semifinal';
        if (numMatches === 4) return 'Cuartos de Final';
        if (numMatches === 8) return 'Octavos de Final';
        return 'Ronda Eliminatoria';
    }

    // Helper to find next match reference
    // Used by app.js during saving
    getNextMatchRef(currentMatch) {
        if (!currentMatch._nextMatchTempId && !currentMatch.next_match_id) return null;
        // Return info needed to find it
        // In-memory: look up by _tempId in this.bracket
        // Database: return next_match_id
        return {
            id: currentMatch.next_match_id,
            pos: currentMatch.bracket_pos
        };
    }

    // Logic to advance result
    getAdvanceUpdates(match) {
        if (!match.winner) return null;
        if (match.bracket_pos === undefined || match.bracket_pos === null) return null;
        // Note: bracket_pos is 0 or 1.

        // We return validation data. Application layer (app.js) must perform the update
        // on the "next_match_id" found in the DB.

        return {
            targetField: match.bracket_pos === 0 ? 'player1' : 'player2',
            player_id: match.winner.id,
            player_name: match.winner.name
        };
    }
}
