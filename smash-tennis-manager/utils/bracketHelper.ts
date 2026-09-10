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

export function calculateUnifiedStandings(zones: GroupZone[], allPlayers?: TournamentPlayer[]): GroupStandingRow[] {
    const playerMap = new Map<string, GroupStandingRow>();

    for (const z of zones) {
        for (const p of z.players) {
            if (!playerMap.has(p.playerId)) {
                playerMap.set(p.playerId, { ...p });
            } else {
                const existing = playerMap.get(p.playerId)!;
                existing.matchesPlayed += p.matchesPlayed;
                existing.matchesWon += p.matchesWon;
                existing.matchesLost += p.matchesLost;
                existing.setsWon += p.setsWon;
                existing.setsLost += p.setsLost;
                existing.diffSets = existing.setsWon - existing.setsLost;
                existing.gamesWon += p.gamesWon;
                existing.gamesLost += p.gamesLost;
                existing.diffGames = existing.gamesWon - existing.gamesLost;
                existing.points += p.points;
            }
        }
    }

    if (allPlayers) {
        for (const tp of allPlayers) {
            const pId = tp.player_id || tp.id;
            if (pId && !playerMap.has(pId)) {
                playerMap.set(pId, {
                    playerId: pId,
                    playerName: tp.player_name || tp.name || 'Jugador',
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
        }
    }

    const rows = Array.from(playerMap.values());

    rows.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;
        if (b.diffGames !== a.diffGames) return b.diffGames - a.diffGames;
        return a.playerName.localeCompare(b.playerName);
    });

    return rows.map((r, idx) => ({
        ...r,
        rank: idx + 1,
        isQualified: true
    }));
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
    const orderedStandardNames = [
        'Octavos de Final',
        'Pre-Cuartos',
        'Cuartos de Final',
        'Semifinal',
        'Semifinales',
        'Final',
        'Gran Final'
    ];

    for (const standardName of orderedStandardNames) {
        const matchingKey = Array.from(roundsMap.keys()).find(k => k.toLowerCase() === standardName.toLowerCase());
        if (matchingKey) {
            const list = roundsMap.get(matchingKey)!;
            list.sort((a, b) => {
                const idxA = a.proposal_data?.bracket_match_index ?? 0;
                const idxB = b.proposal_data?.bracket_match_index ?? 0;
                return idxA - idxB;
            });
            rounds.push({
                name: standardName,
                matches: list
            });
            roundsMap.delete(matchingKey);
        }
    }

    for (const [key, list] of roundsMap.entries()) {
        list.sort((a, b) => {
            const idxA = a.proposal_data?.bracket_match_index ?? 0;
            const idxB = b.proposal_data?.bracket_match_index ?? 0;
            return idxA - idxB;
        });
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
    isBye?: boolean;
}

export interface ProjectedRound {
    name: string;
    matches: ProjectedMatch[];
}

export function getProjectedPlayoffRounds(
    zones: GroupZone[],
    competitionFormat?: string,
    allowByes: boolean = true,
    allPlayers?: TournamentPlayer[]
): ProjectedRound[] {
    if (!zones || zones.length === 0) return [];

    const isTablaGeneral = competitionFormat === 'tabla_general_byes';

    if (isTablaGeneral) {
        const unified = calculateUnifiedStandings(zones, allPlayers);
        return getProjectedRoundsFromUnified(unified, allowByes);
    }

    const rounds: ProjectedRound[] = [];

    if (zones.length === 4) {
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
    } else if (zones.length === 3) {
        // 3 Zonas con BYEs anti-repetición:
        // Los 2 mejores primeros obtienen BYE directo a Semifinales
        const groupWinners = zones.map((z, idx) => ({ zone: z, player: z.players[0], zoneIdx: idx }))
            .filter(w => !!w.player);
        // Ordenar a los ganadores por puntos > sets > games para determinar los 2 mejores primeros
        groupWinners.sort((a, b) => {
            if ((b.player.points || 0) !== (a.player.points || 0)) return (b.player.points || 0) - (a.player.points || 0);
            if ((b.player.diffSets || 0) !== (a.player.diffSets || 0)) return (b.player.diffSets || 0) - (a.player.diffSets || 0);
            return (b.player.diffGames || 0) - (a.player.diffGames || 0);
        });

        const topWinner1 = groupWinners[0]; // Semifinal 1 (BYE)
        const topWinner2 = groupWinners[1]; // Semifinal 2 (BYE)
        const thirdWinner = groupWinners[2]; // Juega Cuartos

        // Determinar qué zonas son para armar los cruces anti-repetición
        // Zonas de los BYEs:
        const byeZoneIdxs = new Set([topWinner1?.zoneIdx, topWinner2?.zoneIdx]);
        // La zona restante (thirdWinner)
        const thirdZoneIdx = thirdWinner?.zoneIdx ?? 2;

        // Segundos de cada zona:
        const secPlayers = zones.map((z, idx) => ({ zone: z, player: z.players[1], zoneIdx: idx }));
        // El 2° de una de las zonas con BYE juega contra el 3er ganador
        // Elegimos al 2° de la zona del topWinner1 para que juegue contra thirdWinner en Cuartos 1
        // y que su ganador vaya a la Semifinal 2 (contra topWinner2), ¡así nunca se cruzan de la misma zona!
        const secOfBye1 = secPlayers.find(s => s.zoneIdx === topWinner1?.zoneIdx) || secPlayers[0];
        const secOfBye2 = secPlayers.find(s => s.zoneIdx === topWinner2?.zoneIdx) || secPlayers[1];
        const secOfThird = secPlayers.find(s => s.zoneIdx === thirdZoneIdx) || secPlayers[2];

        // Cuartos 1: 1° Zona Restante vs 2° Zona de Bye 1 -> Va a Semifinal 2
        // Cuartos 2: 2° Zona de Bye 2 vs 2° Zona Restante -> Va a Semifinal 1
        const qfMatches: ProjectedMatch[] = [
            {
                id: 'proj-qf-1',
                round: 'Cuartos de Final',
                slotP1Label: `1° ${thirdWinner?.zone.groupName || 'Zona C'}`,
                p1Name: thirdWinner?.player?.playerName,
                p1Id: thirdWinner?.player?.playerId,
                slotP2Label: `2° ${secOfBye1?.zone.groupName || 'Zona A'}`,
                p2Name: secOfBye1?.player?.playerName,
                p2Id: secOfBye1?.player?.playerId
            },
            {
                id: 'proj-qf-2',
                round: 'Cuartos de Final',
                slotP1Label: `2° ${secOfBye2?.zone.groupName || 'Zona B'}`,
                p1Name: secOfBye2?.player?.playerName,
                p1Id: secOfBye2?.player?.playerId,
                slotP2Label: `2° ${secOfThird?.zone.groupName || 'Zona C'}`,
                p2Name: secOfThird?.player?.playerName,
                p2Id: secOfThird?.player?.playerId
            }
        ];

        const sfMatches: ProjectedMatch[] = [
            {
                id: 'proj-sf-1',
                round: 'Semifinal',
                slotP1Label: `1° ${topWinner1?.zone.groupName || 'Zona A'} (BYE a Semis)`,
                p1Name: topWinner1?.player?.playerName,
                p1Id: topWinner1?.player?.playerId,
                slotP2Label: `Ganador Cuartos 2 (${secOfBye2?.zone.groupName || '2°B'} vs ${secOfThird?.zone.groupName || '2°C'})`
            },
            {
                id: 'proj-sf-2',
                round: 'Semifinal',
                slotP1Label: `1° ${topWinner2?.zone.groupName || 'Zona B'} (BYE a Semis)`,
                p1Name: topWinner2?.player?.playerName,
                p1Id: topWinner2?.player?.playerId,
                slotP2Label: `Ganador Cuartos 1 (${thirdWinner?.zone.groupName || '1°C'} vs ${secOfBye1?.zone.groupName || '2°A'})`
            }
        ];

        const finalMatch: ProjectedMatch = {
            id: 'proj-f-1',
            round: 'Final',
            slotP1Label: 'Ganador Semifinal 1',
            slotP2Label: 'Ganador Semifinal 2'
        };

        rounds.push(
            { name: 'Cuartos de Final (Proyectado)', matches: qfMatches },
            { name: 'Semifinales (Proyectado)', matches: sfMatches },
            { name: 'Gran Final', matches: [finalMatch] }
        );
    } else if (zones.length === 2) {
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
            { name: 'Gran Final', matches: [finalMatch] }
        );
    } else {
        const unified = calculateUnifiedStandings(zones, allPlayers);
        return getProjectedRoundsFromUnified(unified, allowByes);
    }

    return rounds;
}

function getProjectedRoundsFromUnified(standings: GroupStandingRow[], allowByes: boolean = true): ProjectedRound[] {
    const rounds: ProjectedRound[] = [];
    const N = standings.length;
    if (N < 2) return rounds;

    if (N === 9 && allowByes) {
        // Exact 9-player structure with BYEs (Photo reference)
        const s1 = standings[0];
        const s2 = standings[1];
        const s3 = standings[2];
        const s4 = standings[3];
        const s5 = standings[4];
        const s6 = standings[5];
        const s7 = standings[6];
        const s8 = standings[7];
        const s9 = standings[8];

        const octMatch: ProjectedMatch = {
            id: 'proj-oct-1',
            round: 'Octavos de Final',
            slotP1Label: '5° Clasificación General',
            p1Name: s5?.playerName,
            p1Id: s5?.playerId,
            slotP2Label: '9° Clasificación General',
            p2Name: s9?.playerName,
            p2Id: s9?.playerId
        };

        const qfMatches: ProjectedMatch[] = [
            {
                id: 'proj-qf-1',
                round: 'Cuartos de Final',
                slotP1Label: '3° Clasificación (BYE)',
                p1Name: s3?.playerName,
                p1Id: s3?.playerId,
                slotP2Label: 'Ganador 5° vs 9°'
            },
            {
                id: 'proj-qf-2',
                round: 'Cuartos de Final',
                slotP1Label: '7° Clasificación',
                p1Name: s7?.playerName,
                p1Id: s7?.playerId,
                slotP2Label: '6° Clasificación',
                p2Name: s6?.playerName,
                p2Id: s6?.playerId
            },
            {
                id: 'proj-qf-3',
                round: 'Cuartos de Final',
                slotP1Label: '8° Clasificación',
                p1Name: s8?.playerName,
                p1Id: s8?.playerId,
                slotP2Label: '4° Clasificación',
                p2Name: s4?.playerName,
                p2Id: s4?.playerId
            }
        ];

        const sfMatches: ProjectedMatch[] = [
            {
                id: 'proj-sf-1',
                round: 'Semifinal',
                slotP1Label: '1° Clasificación (BYE a Semifinal)',
                p1Name: s1?.playerName,
                p1Id: s1?.playerId,
                slotP2Label: 'Ganador Cuartos 1 (3° vs [5°/9°])'
            },
            {
                id: 'proj-sf-2',
                round: 'Semifinal',
                slotP1Label: '2° Clasificación (BYE a Semifinal)',
                p1Name: s2?.playerName,
                p1Id: s2?.playerId,
                slotP2Label: 'Ganador Cuartos 3 (8° vs 4°)'
            }
        ];

        const finalMatch: ProjectedMatch = {
            id: 'proj-f-1',
            round: 'Final',
            slotP1Label: 'Ganador Semifinal 1',
            slotP2Label: 'Ganador Semifinal 2'
        };

        rounds.push(
            { name: 'Octavos de Final / Pre-Cuartos', matches: [octMatch] },
            { name: 'Cuartos de Final (Proyectado)', matches: qfMatches },
            { name: 'Semifinales (Proyectado)', matches: sfMatches },
            { name: 'Gran Final', matches: [finalMatch] }
        );
    } else if (N === 6 && allowByes) {
        const s1 = standings[0];
        const s2 = standings[1];
        const s3 = standings[2];
        const s4 = standings[3];
        const s5 = standings[4];
        const s6 = standings[5];

        const qfMatches: ProjectedMatch[] = [
            {
                id: 'proj-qf-1',
                round: 'Cuartos de Final',
                slotP1Label: '4° Clasificación',
                p1Name: s4?.playerName,
                p1Id: s4?.playerId,
                slotP2Label: '5° Clasificación',
                p2Name: s5?.playerName,
                p2Id: s5?.playerId
            },
            {
                id: 'proj-qf-2',
                round: 'Cuartos de Final',
                slotP1Label: '3° Clasificación',
                p1Name: s3?.playerName,
                p1Id: s3?.playerId,
                slotP2Label: '6° Clasificación',
                p2Name: s6?.playerName,
                p2Id: s6?.playerId
            }
        ];

        const sfMatches: ProjectedMatch[] = [
            {
                id: 'proj-sf-1',
                round: 'Semifinal',
                slotP1Label: '1° Clasificación (BYE)',
                p1Name: s1?.playerName,
                p1Id: s1?.playerId,
                slotP2Label: 'Ganador 4° vs 5°'
            },
            {
                id: 'proj-sf-2',
                round: 'Semifinal',
                slotP1Label: '2° Clasificación (BYE)',
                p1Name: s2?.playerName,
                p1Id: s2?.playerId,
                slotP2Label: 'Ganador 3° vs 6°'
            }
        ];

        rounds.push(
            { name: 'Cuartos de Final (Proyectado)', matches: qfMatches },
            { name: 'Semifinales (Proyectado)', matches: sfMatches },
            { name: 'Gran Final', matches: [{ id: 'proj-f-1', round: 'Final', slotP1Label: 'Ganador Semifinal 1', slotP2Label: 'Ganador Semifinal 2' }] }
        );
    } else {
        const topCount = Math.min(N, 8);
        const matches: ProjectedMatch[] = [];

        if (topCount > 4) {
            // Cuartos de Final estándar profesional (8 jugadores):
            // Llave 1 (Arriba): 1° vs 8°
            // Llave 2:         4° vs 5°
            // Llave 3:         3° vs 6°
            // Llave 4 (Abajo): 2° vs 7°
            const qfPairs = [
                { p1Idx: 0, p2Idx: 7 }, // 1° vs 8°
                { p1Idx: 3, p2Idx: 4 }, // 4° vs 5°
                { p1Idx: 2, p2Idx: 5 }, // 3° vs 6°
                { p1Idx: 1, p2Idx: 6 }, // 2° vs 7°
            ];

            qfPairs.forEach((pair, idx) => {
                const s1 = standings[pair.p1Idx];
                const s2 = standings[pair.p2Idx];
                matches.push({
                    id: `proj-m-${idx}`,
                    round: 'Cuartos de Final (Proyectado)',
                    slotP1Label: `${pair.p1Idx + 1}° Clasificación`,
                    p1Name: s1?.playerName,
                    p1Id: s1?.playerId,
                    slotP2Label: `${pair.p2Idx + 1}° Clasificación`,
                    p2Name: s2?.playerName,
                    p2Id: s2?.playerId
                });
            });

            rounds.push({ name: 'Cuartos de Final (Proyectado)', matches });
            rounds.push({
                name: 'Semifinales (Proyectado)',
                matches: [
                    { id: 'proj-sf-1', round: 'Semifinal', slotP1Label: 'Ganador Llave 1 (1° vs 8°)', slotP2Label: 'Ganador Llave 2 (4° vs 5°)' },
                    { id: 'proj-sf-2', round: 'Semifinal', slotP1Label: 'Ganador Llave 3 (3° vs 6°)', slotP2Label: 'Ganador Llave 4 (2° vs 7°)' }
                ]
            });
            rounds.push({
                name: 'Gran Final',
                matches: [
                    { id: 'proj-f-1', round: 'Final', slotP1Label: 'Ganador Semifinal 1', slotP2Label: 'Ganador Semifinal 2' }
                ]
            });
        } else {
            // Semifinales estándar (4 jugadores): 1° vs 4°, 2° vs 3°
            const sfPairs = [
                { p1Idx: 0, p2Idx: 3 }, // 1° vs 4°
                { p1Idx: 1, p2Idx: 2 }, // 2° vs 3°
            ];

            sfPairs.forEach((pair, idx) => {
                const s1 = standings[pair.p1Idx];
                const s2 = standings[pair.p2Idx];
                matches.push({
                    id: `proj-m-${idx}`,
                    round: 'Semifinales (Proyectado)',
                    slotP1Label: `${pair.p1Idx + 1}° Clasificación`,
                    p1Name: s1?.playerName,
                    p1Id: s1?.playerId,
                    slotP2Label: `${pair.p2Idx + 1}° Clasificación`,
                    p2Name: s2?.playerName,
                    p2Id: s2?.playerId
                });
            });

            rounds.push({ name: 'Semifinales (Proyectado)', matches });
            rounds.push({
                name: 'Gran Final',
                matches: [
                    { id: 'proj-f-1', round: 'Final', slotP1Label: 'Ganador Semifinal 1', slotP2Label: 'Ganador Semifinal 2' }
                ]
            });
        }
    }

    return rounds;
}

export interface PlayoffMatchSeed {
    round: string;
    player1?: { id: string; name: string };
    player2?: { id: string; name: string };
    proposal_data?: {
        bracket_round: 'Octavos de Final' | 'Pre-Cuartos' | 'Cuartos de Final' | 'Semifinal' | 'Final' | string;
        bracket_match_index: number;
        next_round?: string;
        next_match_index?: number;
        next_slot?: 'player1' | 'player2';
        slot1_label?: string;
        slot2_label?: string;
        is_bye?: boolean;
    };
}

export function buildPlayoffTreeWithByes(
    standings: GroupStandingRow[],
    options?: { allowByes?: boolean }
): PlayoffMatchSeed[] {
    const seeds: PlayoffMatchSeed[] = [];
    const N = standings.length;
    if (N < 2) return seeds;

    const allowByes = options?.allowByes ?? true;

    if (N === 9 && allowByes) {
        // Exact 9-player structure with BYEs (Photo reference)
        const s1 = standings[0];
        const s2 = standings[1];
        const s3 = standings[2];
        const s4 = standings[3];
        const s5 = standings[4];
        const s6 = standings[5];
        const s7 = standings[6];
        const s8 = standings[7];
        const s9 = standings[8];

        // 1. Octavos / Pre-cuartos: 5° vs 9°
        seeds.push({
            round: 'Octavos de Final',
            player1: s5 ? { id: s5.playerId, name: s5.playerName } : undefined,
            player2: s9 ? { id: s9.playerId, name: s9.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Octavos de Final',
                bracket_match_index: 0,
                next_round: 'Cuartos de Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `5° ${s5?.playerName || '5° General'}`,
                slot2_label: `9° ${s9?.playerName || '9° General'}`
            }
        });

        // 2. Cuartos de Final: 3 Matches
        // Match 0: 3° (BYE) vs Winner(5° vs 9°) -> Goes to Semifinal 0 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: s3 ? { id: s3.playerId, name: s3.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 0,
                next_round: 'Semifinal',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `3° ${s3?.playerName || '3° General'} (BYE)`,
                slot2_label: 'Ganador 5° vs 9°'
            }
        });

        // Match 1: 7° vs 6° -> Goes to Semifinal 1 (player1)
        seeds.push({
            round: 'Cuartos de Final',
            player1: s7 ? { id: s7.playerId, name: s7.playerName } : undefined,
            player2: s6 ? { id: s6.playerId, name: s6.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 1,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player1',
                slot1_label: `7° ${s7?.playerName || '7° General'}`,
                slot2_label: `6° ${s6?.playerName || '6° General'}`
            }
        });

        // Match 2: 8° vs 4° -> Goes to Semifinal 1 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: s8 ? { id: s8.playerId, name: s8.playerName } : undefined,
            player2: s4 ? { id: s4.playerId, name: s4.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 2,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player2',
                slot1_label: `8° ${s8?.playerName || '8° General'}`,
                slot2_label: `4° ${s4?.playerName || '4° General'}`
            }
        });

        // 3. Semifinales: 2 Matches
        // Semi 0: 1° (BYE) vs Winner Cuartos 0 -> Goes to Final (player1)
        seeds.push({
            round: 'Semifinal',
            player1: s1 ? { id: s1.playerId, name: s1.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: `1° ${s1?.playerName || '1° General'} (BYE a Semifinal)`,
                slot2_label: 'Ganador Cuartos 1 (3° vs [5°/9°])'
            }
        });

        // Semi 1: 2° (BYE) vs Winner Cuartos 2 -> Goes to Final (player2)
        seeds.push({
            round: 'Semifinal',
            player1: s2 ? { id: s2.playerId, name: s2.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `2° ${s2?.playerName || '2° General'} (BYE a Semifinal)`,
                slot2_label: 'Ganador Cuartos 3 (8° vs 4°)'
            }
        });

        // 4. Gran Final
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });

        return seeds;
    }

    if (N === 6 && allowByes) {
        const s1 = standings[0];
        const s2 = standings[1];
        const s3 = standings[2];
        const s4 = standings[3];
        const s5 = standings[4];
        const s6 = standings[5];

        // Cuartos 0: 4° vs 5° -> Goes to Semi 0 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: s4 ? { id: s4.playerId, name: s4.playerName } : undefined,
            player2: s5 ? { id: s5.playerId, name: s5.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 0,
                next_round: 'Semifinal',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `4° ${s4?.playerName}`,
                slot2_label: `5° ${s5?.playerName}`
            }
        });

        // Cuartos 1: 3° vs 6° -> Goes to Semi 1 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: s3 ? { id: s3.playerId, name: s3.playerName } : undefined,
            player2: s6 ? { id: s6.playerId, name: s6.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 1,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player2',
                slot1_label: `3° ${s3?.playerName}`,
                slot2_label: `6° ${s6?.playerName}`
            }
        });

        // Semi 0: 1° (BYE) vs Winner Cuartos 0 -> Goes to Final (player1)
        seeds.push({
            round: 'Semifinal',
            player1: s1 ? { id: s1.playerId, name: s1.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: `1° ${s1?.playerName} (BYE)`,
                slot2_label: 'Ganador 4° vs 5°'
            }
        });

        // Semi 1: 2° (BYE) vs Winner Cuartos 1 -> Goes to Final (player2)
        seeds.push({
            round: 'Semifinal',
            player1: s2 ? { id: s2.playerId, name: s2.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `2° ${s2?.playerName} (BYE)`,
                slot2_label: 'Ganador 3° vs 6°'
            }
        });

        // Final
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });

        return seeds;
    }

    // Default top 4 or top 8 con emparejamientos estándar profesionales
    const topQ = standings.slice(0, 8);
    if (topQ.length > 4) {
        // Cuartos de Final (8 jugadores):
        // Llave 0: 1° vs 8° -> va a Semifinal 0 (player1)
        // Llave 1: 4° vs 5° -> va a Semifinal 0 (player2)
        // Llave 2: 3° vs 6° -> va a Semifinal 1 (player1)
        // Llave 3: 2° vs 7° -> va a Semifinal 1 (player2)
        const qfPairs = [
            { p1Idx: 0, p2Idx: 7, semiMatch: 0, semiSlot: 'player1' as const }, // 1° vs 8°
            { p1Idx: 3, p2Idx: 4, semiMatch: 0, semiSlot: 'player2' as const }, // 4° vs 5°
            { p1Idx: 2, p2Idx: 5, semiMatch: 1, semiSlot: 'player1' as const }, // 3° vs 6°
            { p1Idx: 1, p2Idx: 6, semiMatch: 1, semiSlot: 'player2' as const }, // 2° vs 7°
        ];

        qfPairs.forEach((pair, i) => {
            const p1 = topQ[pair.p1Idx];
            const p2 = topQ[pair.p2Idx];
            seeds.push({
                round: 'Cuartos de Final',
                player1: p1?.playerId ? { id: p1.playerId, name: p1.playerName || '' } : undefined,
                player2: p2?.playerId ? { id: p2.playerId, name: p2.playerName || '' } : undefined,
                proposal_data: {
                    bracket_round: 'Cuartos de Final',
                    bracket_match_index: i,
                    next_round: 'Semifinal',
                    next_match_index: pair.semiMatch,
                    next_slot: pair.semiSlot,
                    slot1_label: `${pair.p1Idx + 1}° ${p1?.playerName || ''}`,
                    slot2_label: `${pair.p2Idx + 1}° ${p2?.playerName || ''}`
                }
            });
        });

        seeds.push({
            round: 'Semifinal',
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: 'Ganador Llave 1 (1° vs 8°)',
                slot2_label: 'Ganador Llave 2 (4° vs 5°)'
            }
        });
        seeds.push({
            round: 'Semifinal',
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: 'Ganador Llave 3 (3° vs 6°)',
                slot2_label: 'Ganador Llave 4 (2° vs 7°)'
            }
        });
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });
    } else {
        // Semifinales (4 jugadores): 1° vs 4°, 2° vs 3°
        const sfPairs = [
            { p1Idx: 0, p2Idx: 3, finalSlot: 'player1' as const }, // 1° vs 4°
            { p1Idx: 1, p2Idx: 2, finalSlot: 'player2' as const }, // 2° vs 3°
        ];

        sfPairs.forEach((pair, i) => {
            const p1 = topQ[pair.p1Idx];
            const p2 = topQ[pair.p2Idx];
            seeds.push({
                round: 'Semifinal',
                player1: p1?.playerId ? { id: p1.playerId, name: p1.playerName || '' } : undefined,
                player2: p2?.playerId ? { id: p2.playerId, name: p2.playerName || '' } : undefined,
                proposal_data: {
                    bracket_round: 'Semifinal',
                    bracket_match_index: i,
                    next_round: 'Final',
                    next_match_index: 0,
                    next_slot: pair.finalSlot,
                    slot1_label: `${pair.p1Idx + 1}° ${p1?.playerName || ''}`,
                    slot2_label: `${pair.p2Idx + 1}° ${p2?.playerName || ''}`
                }
            });
        });

        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });
    }

    return seeds;
}

export function buildPlayoffTreeFromZones(
    zones: GroupZone[],
    competitionFormat?: string,
    allowByes: boolean = true
): PlayoffMatchSeed[] {
    const seeds: PlayoffMatchSeed[] = [];
    if (!zones || zones.length === 0) return seeds;

    if (competitionFormat === 'tabla_general_byes') {
        const unified = calculateUnifiedStandings(zones);
        return buildPlayoffTreeWithByes(unified, { allowByes });
    }

    if (zones.length === 4) {
        const zA = zones[0]?.players;
        const zB = zones[1]?.players;
        const zC = zones[2]?.players;
        const zD = zones[3]?.players;

        // 4 Cuartos de Final (Separación de grupos: 1A y 2A en mitades opuestas)
        seeds.push({
            round: 'Cuartos de Final',
            player1: zA?.[0] ? { id: zA[0].playerId, name: zA[0].playerName } : undefined,
            player2: zB?.[1] ? { id: zB[1].playerId, name: zB[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 0,
                next_round: 'Semifinal',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: `1° ${zones[0]?.groupName || 'Grupo A'}`,
                slot2_label: `2° ${zones[1]?.groupName || 'Grupo B'}`
            }
        });
        seeds.push({
            round: 'Cuartos de Final',
            player1: zC?.[0] ? { id: zC[0].playerId, name: zC[0].playerName } : undefined,
            player2: zD?.[1] ? { id: zD[1].playerId, name: zD[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 1,
                next_round: 'Semifinal',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `1° ${zones[2]?.groupName || 'Grupo C'}`,
                slot2_label: `2° ${zones[3]?.groupName || 'Grupo D'}`
            }
        });
        seeds.push({
            round: 'Cuartos de Final',
            player1: zB?.[0] ? { id: zB[0].playerId, name: zB[0].playerName } : undefined,
            player2: zA?.[1] ? { id: zA[1].playerId, name: zA[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 2,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player1',
                slot1_label: `1° ${zones[1]?.groupName || 'Grupo B'}`,
                slot2_label: `2° ${zones[0]?.groupName || 'Grupo A'}`
            }
        });
        seeds.push({
            round: 'Cuartos de Final',
            player1: zD?.[0] ? { id: zD[0].playerId, name: zD[0].playerName } : undefined,
            player2: zC?.[1] ? { id: zC[1].playerId, name: zC[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 3,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player2',
                slot1_label: `1° ${zones[3]?.groupName || 'Grupo D'}`,
                slot2_label: `2° ${zones[2]?.groupName || 'Grupo C'}`
            }
        });

        // 2 Semifinales
        seeds.push({
            round: 'Semifinal',
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: 'Ganador Llave 1 (1°A vs 2°B)',
                slot2_label: 'Ganador Llave 2 (1°C vs 2°D)'
            }
        });
        seeds.push({
            round: 'Semifinal',
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: 'Ganador Llave 3 (1°B vs 2°A)',
                slot2_label: 'Ganador Llave 4 (1°D vs 2°C)'
            }
        });

        // 1 Gran Final
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });
    } else if (zones.length === 3) {
        // 3 Zonas con BYEs anti-repetición:
        const groupWinners = zones.map((z, idx) => ({ zone: z, player: z.players[0], zoneIdx: idx }))
            .filter(w => !!w.player);
        groupWinners.sort((a, b) => {
            if ((b.player.points || 0) !== (a.player.points || 0)) return (b.player.points || 0) - (a.player.points || 0);
            if ((b.player.diffSets || 0) !== (a.player.diffSets || 0)) return (b.player.diffSets || 0) - (a.player.diffSets || 0);
            return (b.player.diffGames || 0) - (a.player.diffGames || 0);
        });

        const topWinner1 = groupWinners[0]; // Semifinal 0 (BYE)
        const topWinner2 = groupWinners[1]; // Semifinal 1 (BYE)
        const thirdWinner = groupWinners[2]; // Juega Cuartos 0

        const thirdZoneIdx = thirdWinner?.zoneIdx ?? 2;
        const secPlayers = zones.map((z, idx) => ({ zone: z, player: z.players[1], zoneIdx: idx }));
        const secOfBye1 = secPlayers.find(s => s.zoneIdx === topWinner1?.zoneIdx) || secPlayers[0];
        const secOfBye2 = secPlayers.find(s => s.zoneIdx === topWinner2?.zoneIdx) || secPlayers[1];
        const secOfThird = secPlayers.find(s => s.zoneIdx === thirdZoneIdx) || secPlayers[2];

        // Cuartos 0: 1° Zona Restante vs 2° Zona de Bye 1 -> Va a Semifinal 1 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: thirdWinner?.player ? { id: thirdWinner.player.playerId, name: thirdWinner.player.playerName } : undefined,
            player2: secOfBye1?.player ? { id: secOfBye1.player.playerId, name: secOfBye1.player.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 0,
                next_round: 'Semifinal',
                next_match_index: 1,
                next_slot: 'player2',
                slot1_label: `1° ${thirdWinner?.zone.groupName || 'Zona C'}`,
                slot2_label: `2° ${secOfBye1?.zone.groupName || 'Zona A'}`
            }
        });

        // Cuartos 1: 2° Zona de Bye 2 vs 2° Zona Restante -> Va a Semifinal 0 (player2)
        seeds.push({
            round: 'Cuartos de Final',
            player1: secOfBye2?.player ? { id: secOfBye2.player.playerId, name: secOfBye2.player.playerName } : undefined,
            player2: secOfThird?.player ? { id: secOfThird.player.playerId, name: secOfThird.player.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Cuartos de Final',
                bracket_match_index: 1,
                next_round: 'Semifinal',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `2° ${secOfBye2?.zone.groupName || 'Zona B'}`,
                slot2_label: `2° ${secOfThird?.zone.groupName || 'Zona C'}`
            }
        });

        // Semifinal 0: 1° Zona Bye 1 vs Ganador Cuartos 1
        seeds.push({
            round: 'Semifinal',
            player1: topWinner1?.player ? { id: topWinner1.player.playerId, name: topWinner1.player.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: `1° ${topWinner1?.zone.groupName || 'Zona A'} (BYE a Semis)`,
                slot2_label: `Ganador Cuartos 2 (${secOfBye2?.zone.groupName || '2°B'} vs ${secOfThird?.zone.groupName || '2°C'})`
            }
        });

        // Semifinal 1: 1° Zona Bye 2 vs Ganador Cuartos 0
        seeds.push({
            round: 'Semifinal',
            player1: topWinner2?.player ? { id: topWinner2.player.playerId, name: topWinner2.player.playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `1° ${topWinner2?.zone.groupName || 'Zona B'} (BYE a Semis)`,
                slot2_label: `Ganador Cuartos 1 (${thirdWinner?.zone.groupName || '1°C'} vs ${secOfBye1?.zone.groupName || '2°A'})`
            }
        });

        // Gran Final
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });
    } else if (zones.length === 2) {
        const zA = zones[0]?.players;
        const zB = zones[1]?.players;

        // 2 Semifinales
        seeds.push({
            round: 'Semifinal',
            player1: zA?.[0] ? { id: zA[0].playerId, name: zA[0].playerName } : undefined,
            player2: zB?.[1] ? { id: zB[1].playerId, name: zB[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 0,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player1',
                slot1_label: `1° ${zones[0]?.groupName || 'Grupo A'}`,
                slot2_label: `2° ${zones[1]?.groupName || 'Grupo B'}`
            }
        });
        seeds.push({
            round: 'Semifinal',
            player1: zB?.[0] ? { id: zB[0].playerId, name: zB[0].playerName } : undefined,
            player2: zA?.[1] ? { id: zA[1].playerId, name: zA[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Semifinal',
                bracket_match_index: 1,
                next_round: 'Final',
                next_match_index: 0,
                next_slot: 'player2',
                slot1_label: `1° ${zones[1]?.groupName || 'Grupo B'}`,
                slot2_label: `2° ${zones[0]?.groupName || 'Grupo A'}`
            }
        });

        // 1 Gran Final
        seeds.push({
            round: 'Final',
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: 'Ganador Semifinal 1',
                slot2_label: 'Ganador Semifinal 2'
            }
        });
    } else if (zones.length === 1) {
        const zA = zones[0]?.players;
        seeds.push({
            round: 'Final',
            player1: zA?.[0] ? { id: zA[0].playerId, name: zA[0].playerName } : undefined,
            player2: zA?.[1] ? { id: zA[1].playerId, name: zA[1].playerName } : undefined,
            proposal_data: {
                bracket_round: 'Final',
                bracket_match_index: 0,
                slot1_label: `1° ${zones[0]?.groupName || 'Grupo A'}`,
                slot2_label: `2° ${zones[0]?.groupName || 'Grupo A'}`
            }
        });
    } else {
        const unified = calculateUnifiedStandings(zones);
        return buildPlayoffTreeWithByes(unified, { allowByes });
    }

    return seeds;
}
