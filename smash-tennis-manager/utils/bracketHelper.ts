import { Match, TournamentPlayer } from '../types';

export interface GroupStandingRow {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    setsWon: number;
    setsLost: number;
    diffSets: number;
    gamesWon: number;
    gamesLost: number;
    diffGames: number;
    points: number;
    rank?: number;
    isQualified?: boolean;
}

export interface GroupZone {
    groupNumber: number;
    groupName: string;
    players: GroupStandingRow[];
    matches: Match[];
}

interface ParsedSets {
    p1Sets: number;
    p2Sets: number;
    p1Games: number;
    p2Games: number;
}

export function parseSingleSetForStats(setStr: string): { g1: number; g2: number } | null {
    if (!setStr) return null;
    const clean = setStr.trim();
    if (!clean) return null;

    // Handle walkover notation
    if (/^[WOwo]$/i.test(clean) || clean.toLowerCase() === 'wo' || clean.toLowerCase() === 'w/o') {
        return null;
    }

    // Match "7-6 (10-8)" or "7-6(7-5)" or "6-4" or "10-8"
    const match = clean.match(/^(\d+)\s*[-/]\s*(\d+)/);
    if (!match) return null;

    let g1 = parseInt(match[1], 10) || 0;
    let g2 = parseInt(match[2], 10) || 0;

    // If it's a raw STB score (e.g. 10-8 or 8-10 or 12-10)
    if (g1 >= 10 || g2 >= 10) {
        if (g1 > g2) {
            return { g1: 7, g2: 6 };
        } else {
            return { g1: 6, g2: 7 };
        }
    }

    return { g1, g2 };
}

export function parseMatchScore(score: any): ParsedSets {
    let p1Sets = 0;
    let p2Sets = 0;
    let p1Games = 0;
    let p2Games = 0;

    if (!score) return { p1Sets, p2Sets, p1Games, p2Games };

    if (typeof score === 'object' && !Array.isArray(score)) {
        const setKeys = ['set1', 'set2', 'set3'];
        for (const key of setKeys) {
            if (score[key] && typeof score[key] === 'string') {
                const parsed = parseSingleSetForStats(score[key]);
                if (parsed) {
                    p1Games += parsed.g1;
                    p2Games += parsed.g2;
                    if (parsed.g1 > parsed.g2) p1Sets++;
                    else if (parsed.g2 > parsed.g1) p2Sets++;
                }
            }
        }
    } else if (Array.isArray(score)) {
        for (const s of score) {
            const rawStr = typeof s === 'string' ? s : `${s.p1 || s[0] || 0}-${s.p2 || s[1] || 0}`;
            const parsed = parseSingleSetForStats(rawStr);
            if (parsed) {
                p1Games += parsed.g1;
                p2Games += parsed.g2;
                if (parsed.g1 > parsed.g2) p1Sets++;
                else if (parsed.g2 > parsed.g1) p2Sets++;
            }
        }
    } else if (typeof score === 'string') {
        const clean = score.trim();
        const chunks = clean.split(/\s+/);
        // Merge chunks if parens were separated e.g. ["7-6", "(10-8)"]
        const merged: string[] = [];
        for (const c of chunks) {
            if (c.startsWith('(') && merged.length > 0) {
                merged[merged.length - 1] += ` ${c}`;
            } else {
                merged.push(c);
            }
        }
        for (const chunk of merged) {
            const parsed = parseSingleSetForStats(chunk);
            if (parsed) {
                p1Games += parsed.g1;
                p2Games += parsed.g2;
                if (parsed.g1 > parsed.g2) p1Sets++;
                else if (parsed.g2 > parsed.g1) p2Sets++;
            }
        }
    }

    return { p1Sets, p2Sets, p1Games, p2Games };
}

export function calculateGroupStandings(groupMatches: Match[], players: TournamentPlayer[]): GroupZone[] {
    const groupsMap = new Map<number, { name: string; playerIds: Set<string>; matches: Match[] }>();

    for (const match of groupMatches) {
        const groupNum = match.group_number || 1;
        const groupName = match.proposal_data?.group_name || `Grupo ${String.fromCharCode(64 + groupNum)}`;

        if (!groupsMap.has(groupNum)) {
            groupsMap.set(groupNum, {
                name: groupName,
                playerIds: new Set<string>(),
                matches: []
            });
        }

        const g = groupsMap.get(groupNum)!;
        g.matches.push(match);
        if (match.player1_id) g.playerIds.add(match.player1_id);
        if (match.player2_id) g.playerIds.add(match.player2_id);
    }

    const resultZones: GroupZone[] = [];
    const sortedGroupNums = Array.from(groupsMap.keys()).sort((a, b) => a - b);

    for (const groupNum of sortedGroupNums) {
        const groupData = groupsMap.get(groupNum)!;
        const playerStats = new Map<string, GroupStandingRow>();

        for (const pid of groupData.playerIds) {
            const pInfo = players.find(p => p.player_id === pid || p.id === pid);
            const matchRef = groupData.matches.find(m => m.player1_id === pid || m.player2_id === pid);
            const displayName = pInfo?.name || pInfo?.player_name || 
                (matchRef?.player1_id === pid ? matchRef?.player1_name : matchRef?.player2_name) || 
                'Jugador';

            playerStats.set(pid, {
                playerId: pid,
                playerName: displayName,
                matchesPlayed: 0,
                matchesWon: 0,
                matchesLost: 0,
                setsWon: 0,
                setsLost: 0,
                diffSets: 0,
                gamesWon: 0,
                gamesLost: 0,
                diffGames: 0,
                points: 0
            });
        }

        for (const m of groupData.matches) {
            const isPlayed = m.winner_id || (m.score && (m.score.set1 || m.scheduling_status === 'finished'));
            if (!isPlayed) continue;

            const p1Stat = m.player1_id ? playerStats.get(m.player1_id) : null;
            const p2Stat = m.player2_id ? playerStats.get(m.player2_id) : null;
            const { p1Sets, p2Sets, p1Games, p2Games } = parseMatchScore(m.score);

            if (p1Stat) {
                p1Stat.matchesPlayed += 1;
                p1Stat.setsWon += p1Sets;
                p1Stat.setsLost += p2Sets;
                p1Stat.gamesWon += p1Games;
                p1Stat.gamesLost += p2Games;

                if (m.winner_id === m.player1_id || p1Sets > p2Sets) {
                    p1Stat.matchesWon += 1;
                    p1Stat.points += 1;
                } else {
                    p1Stat.matchesLost += 1;
                }
            }

            if (p2Stat) {
                p2Stat.matchesPlayed += 1;
                p2Stat.setsWon += p2Sets;
                p2Stat.setsLost += p1Sets;
                p2Stat.gamesWon += p2Games;
                p2Stat.gamesLost += p1Games;

                if (m.winner_id === m.player2_id || p2Sets > p1Sets) {
                    p2Stat.matchesWon += 1;
                    p2Stat.points += 1;
                } else {
                    p2Stat.matchesLost += 1;
                }
            }
        }

        const rows = Array.from(playerStats.values()).map(r => ({
            ...r,
            diffSets: r.setsWon - r.setsLost,
            diffGames: r.gamesWon - r.gamesLost
        }));

        rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;
            if (b.diffGames !== a.diffGames) return b.diffGames - a.diffGames;
            const directMatch = groupData.matches.find(m => 
                (m.player1_id === a.playerId && m.player2_id === b.playerId) ||
                (m.player1_id === b.playerId && m.player2_id === a.playerId)
            );
            if (directMatch && directMatch.winner_id) {
                if (directMatch.winner_id === a.playerId) return -1;
                if (directMatch.winner_id === b.playerId) return 1;
            }
            return 0;
        });

        const rankedRows = rows.map((r, idx) => ({
            ...r,
            rank: idx + 1,
            isQualified: idx < 2
        }));

        resultZones.push({
            groupNumber: groupNum,
            groupName: groupData.name,
            players: rankedRows,
            matches: groupData.matches
        });
    }

    return resultZones;
}

export interface PlayoffRound {
    name: string;
    matches: Match[];
}

export function organizePlayoffRounds(playoffMatches: Match[]): PlayoffRound[] {
    const roundsMap = new Map<string, Match[]>();

    for (const m of playoffMatches) {
        const roundName = m.round || 'Playoffs';
        if (!roundsMap.has(roundName)) {
            roundsMap.set(roundName, []);
        }
        roundsMap.get(roundName)!.push(m);
    }

    const rounds: PlayoffRound[] = [];

    for (const standardName of ['Cuartos de Final', 'Semifinal', 'Semifinales', 'Final']) {
        const matchingKey = Array.from(roundsMap.keys()).find(k => k.toLowerCase() === standardName.toLowerCase());
        if (matchingKey) {
            rounds.push({
                name: standardName,
                matches: roundsMap.get(matchingKey)!
            });
            roundsMap.delete(matchingKey);
        }
    }

    for (const [key, list] of roundsMap.entries()) {
        rounds.push({
            name: key,
            matches: list
        });
    }

    return rounds;
}

export interface ProjectedMatch {
    id: string;
    round: string;
    slotP1Label: string;
    p1Name?: string;
    p1Id?: string;
    slotP2Label: string;
    p2Name?: string;
    p2Id?: string;
}

export interface ProjectedRound {
    name: string;
    matches: ProjectedMatch[];
}

export function getProjectedPlayoffRounds(zones: GroupZone[]): ProjectedRound[] {
    if (!zones || zones.length < 2) return [];

    const rounds: ProjectedRound[] = [];

    if (zones.length === 4) {
        // 4 Zones -> Cuartos de Final (4 matches), Semifinal (2 matches), Final (1 match)
        const zA = zones[0];
        const zB = zones[1];
        const zC = zones[2];
        const zD = zones[3];

        const qfMatches: ProjectedMatch[] = [
            {
                id: 'proj-qf-1',
                round: 'Cuartos de Final',
                slotP1Label: `1° ${zA?.groupName || 'Grupo A'}`,
                p1Name: zA?.players[0]?.playerName,
                p1Id: zA?.players[0]?.playerId,
                slotP2Label: `2° ${zB?.groupName || 'Grupo B'}`,
                p2Name: zB?.players[1]?.playerName,
                p2Id: zB?.players[1]?.playerId
            },
            {
                id: 'proj-qf-2',
                round: 'Cuartos de Final',
                slotP1Label: `1° ${zC?.groupName || 'Grupo C'}`,
                p1Name: zC?.players[0]?.playerName,
                p1Id: zC?.players[0]?.playerId,
                slotP2Label: `2° ${zD?.groupName || 'Grupo D'}`,
                p2Name: zD?.players[1]?.playerName,
                p2Id: zD?.players[1]?.playerId
            },
            {
                id: 'proj-qf-3',
                round: 'Cuartos de Final',
                slotP1Label: `1° ${zB?.groupName || 'Grupo B'}`,
                p1Name: zB?.players[0]?.playerName,
                p1Id: zB?.players[0]?.playerId,
                slotP2Label: `2° ${zA?.groupName || 'Grupo A'}`,
                p2Name: zA?.players[1]?.playerName,
                p2Id: zA?.players[1]?.playerId
            },
            {
                id: 'proj-qf-4',
                round: 'Cuartos de Final',
                slotP1Label: `1° ${zD?.groupName || 'Grupo D'}`,
                p1Name: zD?.players[0]?.playerName,
                p1Id: zD?.players[0]?.playerId,
                slotP2Label: `2° ${zC?.groupName || 'Grupo C'}`,
                p2Name: zC?.players[1]?.playerName,
                p2Id: zC?.players[1]?.playerId
            }
        ];

        const sfMatches: ProjectedMatch[] = [
            {
                id: 'proj-sf-1',
                round: 'Semifinal',
                slotP1Label: 'Ganador Llave 1 (1°A vs 2°B)',
                slotP2Label: 'Ganador Llave 2 (1°C vs 2°D)'
            },
            {
                id: 'proj-sf-2',
                round: 'Semifinal',
                slotP1Label: 'Ganador Llave 3 (1°B vs 2°A)',
                slotP2Label: 'Ganador Llave 4 (1°D vs 2°C)'
            }
        ];

        const finalMatch: ProjectedMatch[] = [
            {
                id: 'proj-f-1',
                round: 'Final',
                slotP1Label: 'Ganador Semifinal 1',
                slotP2Label: 'Ganador Semifinal 2'
            }
        ];

        rounds.push(
            { name: 'Cuartos de Final (Proyectado)', matches: qfMatches },
            { name: 'Semifinales', matches: sfMatches },
            { name: 'Gran Final', matches: finalMatch }
        );
    } else if (zones.length === 2) {
        // 2 Zones -> Semifinales (2 matches), Final (1 match)
        const zA = zones[0];
        const zB = zones[1];

        const sfMatches: ProjectedMatch[] = [
            {
                id: 'proj-sf-1',
                round: 'Semifinal',
                slotP1Label: `1° ${zA?.groupName || 'Grupo A'}`,
                p1Name: zA?.players[0]?.playerName,
                p1Id: zA?.players[0]?.playerId,
                slotP2Label: `2° ${zB?.groupName || 'Grupo B'}`,
                p2Name: zB?.players[1]?.playerName,
                p2Id: zB?.players[1]?.playerId
            },
            {
                id: 'proj-sf-2',
                round: 'Semifinal',
                slotP1Label: `1° ${zB?.groupName || 'Grupo B'}`,
                p1Name: zB?.players[0]?.playerName,
                p1Id: zB?.players[0]?.playerId,
                slotP2Label: `2° ${zA?.groupName || 'Grupo A'}`,
                p2Name: zA?.players[1]?.playerName,
                p2Id: zA?.players[1]?.playerId
            }
        ];

        const finalMatch: ProjectedMatch[] = [
            {
                id: 'proj-f-1',
                round: 'Final',
                slotP1Label: 'Ganador Semifinal 1',
                slotP2Label: 'Ganador Semifinal 2'
            }
        ];

        rounds.push(
            { name: 'Semifinales (Proyectado)', matches: sfMatches },
            { name: 'Gran Final', matches: finalMatch }
        );
    } else {
        const qualifiers: { label: string; pName?: string; pId?: string }[] = [];
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            qualifiers.push({
                label: `1° ${z.groupName}`,
                pName: z.players[0]?.playerName,
                pId: z.players[0]?.playerId
            });
            if (z.players.length > 1) {
                qualifiers.push({
                    label: `2° ${z.groupName}`,
                    pName: z.players[1]?.playerName,
                    pId: z.players[1]?.playerId
                });
            }
        }

        const topQ = qualifiers.slice(0, 8);
        const roundName = topQ.length > 4 ? 'Cuartos de Final (Proyectado)' : 'Semifinales (Proyectado)';
        const matches: ProjectedMatch[] = [];

        for (let i = 0; i < topQ.length; i += 2) {
            if (i + 1 < topQ.length) {
                matches.push({
                    id: `proj-m-${i}`,
                    round: roundName,
                    slotP1Label: topQ[i].label,
                    p1Name: topQ[i].pName,
                    p1Id: topQ[i].pId,
                    slotP2Label: topQ[i + 1].label,
                    p2Name: topQ[i + 1].pName,
                    p2Id: topQ[i + 1].pId
                });
            }
        }

        rounds.push({ name: roundName, matches });
        if (roundName.includes('Cuartos')) {
            rounds.push({
                name: 'Semifinales',
                matches: [
                    { id: 'proj-sf-1', round: 'Semifinal', slotP1Label: 'Ganador Llave 1', slotP2Label: 'Ganador Llave 2' },
                    { id: 'proj-sf-2', round: 'Semifinal', slotP1Label: 'Ganador Llave 3', slotP2Label: 'Ganador Llave 4' }
                ]
            });
        }
        rounds.push({
            name: 'Gran Final',
            matches: [
                { id: 'proj-f-1', round: 'Final', slotP1Label: 'Ganador Semifinal 1', slotP2Label: 'Ganador Semifinal 2' }
            ]
        });
    }

    return rounds;
}
