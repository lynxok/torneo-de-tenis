import { UserProfile } from '../types';
import { getEquivalentCategory } from './categories';

export interface PlayerPointsDetails {
    total: number;
    breakdown: {
        tournaments: { count: number; points: number };
        wins: { count: number; points: number };
        participation: { count: number; points: number };
        profilePhoto: { count: number; points: number };
    };
}

export function calculatePointsDetails(player: UserProfile): PlayerPointsDetails {
    const wins = player.matches_won || 0;
    const tourneys = player.tournaments_won || 0;
    const estimatedLosses = Math.floor(wins * 0.5);
    const hasPhoto = Boolean(player.profile_picture_url && player.profile_picture_url.trim().length > 0);

    const pointsFromTournaments = tourneys * 1000;
    const pointsFromWins = wins * 100;
    const pointsFromParticipation = estimatedLosses * 20;
    const pointsFromProfilePhoto = hasPhoto ? 50 : 0;

    const total = pointsFromTournaments + pointsFromWins + pointsFromParticipation + pointsFromProfilePhoto;

    return {
        total,
        breakdown: {
            tournaments: { count: tourneys, points: pointsFromTournaments },
            wins: { count: wins, points: pointsFromWins },
            participation: { count: estimatedLosses, points: pointsFromParticipation },
            profilePhoto: { count: hasPhoto ? 1 : 0, points: pointsFromProfilePhoto }
        }
    };
}

export function calculatePlayerPoints(player: UserProfile): number {
    return calculatePointsDetails(player).total;
}

export interface RankedPlayer extends UserProfile {
    calculated_points: number;
    global_rank: number;
    category_rank: number;
    points_details: PlayerPointsDetails;
}

export function normalizeCategoryKey(cat?: string | null): string {
    if (!cat) return 'Sin Asignar';
    const clean = cat.toLowerCase().replace(/categor[ií]a|divisi[oó]n/gi, '').trim();
    if (['1ra', 'primera', '1', '1ª', 'a1', 'a'].includes(clean)) return '1ra';
    if (['2da', 'segunda', '2', '2ª', 'a2'].includes(clean)) return '2da';
    if (['3ra', 'tercera', '3', '3ª', 'b1', 'b'].includes(clean)) return '3ra';
    if (['4ta', 'cuarta', '4', '4ª', 'b2'].includes(clean)) return '4ta';
    if (['5ta', 'quinta', '5', '5ª', 'c1', 'c'].includes(clean)) return '5ta';
    if (['6ta', 'sexta', '6', '6ª', 'c2'].includes(clean)) return '6ta';
    if (['7ma', 'septima', '7', '7ª', 'd1', 'd2', 'd'].includes(clean)) return '7ma';
    if (['open', 'libre', 'abierta'].includes(clean)) return 'Open';
    return getEquivalentCategory(cat, 'numeric') || cat.trim();
}

/**
 * Calculates global and category rankings for a list of players
 */
export function computeRankings(players: UserProfile[]): RankedPlayer[] {
    // 1. Calculate points for all players
    const withPoints: RankedPlayer[] = players.map(p => {
        const details = calculatePointsDetails(p);
        return {
            ...p,
            calculated_points: details.total,
            points_details: details,
            global_rank: 0,
            category_rank: 0
        };
    });

    // 2. Sort by points desc, then tournaments won desc, then matches won desc, then name asc
    withPoints.sort((a, b) => {
        if (b.calculated_points !== a.calculated_points) {
            return b.calculated_points - a.calculated_points;
        }
        if ((b.tournaments_won || 0) !== (a.tournaments_won || 0)) {
            return (b.tournaments_won || 0) - (a.tournaments_won || 0);
        }
        if ((b.matches_won || 0) !== (a.matches_won || 0)) {
            return (b.matches_won || 0) - (a.matches_won || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    // 3. Assign global ranks
    withPoints.forEach((p, idx) => {
        p.global_rank = idx + 1;
    });

    // 4. Calculate category ranks
    const categoryGroups: Record<string, RankedPlayer[]> = {};
    withPoints.forEach(p => {
        const cat = normalizeCategoryKey(p.category);
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(p);
    });

    Object.values(categoryGroups).forEach(group => {
        // Group is already sorted in order of points
        group.forEach((p, idx) => {
            p.category_rank = idx + 1;
        });
    });

    return withPoints;
}

export function getUserRankInfo(targetUserId: string, allPlayers: UserProfile[]): {
    globalRank: number;
    categoryRank: number;
    points: number;
    totalPlayers: number;
    totalCategoryPlayers: number;
    category: string;
} {
    const ranked = computeRankings(allPlayers);
    const userRanked = ranked.find(p => p.id === targetUserId);
    const cat = normalizeCategoryKey(userRanked?.category);
    const categoryPlayersCount = ranked.filter(p => normalizeCategoryKey(p.category) === cat).length;

    if (!userRanked) {
        return {
            globalRank: ranked.length > 0 ? ranked.length : 1,
            categoryRank: 1,
            points: 0,
            totalPlayers: ranked.length,
            totalCategoryPlayers: categoryPlayersCount || 1,
            category: cat
        };
    }

    return {
        globalRank: userRanked.global_rank,
        categoryRank: userRanked.category_rank,
        points: userRanked.calculated_points,
        totalPlayers: ranked.length,
        totalCategoryPlayers: categoryPlayersCount,
        category: cat
    };
}
