import { UserProfile, PlayerStatsSummary, PlayerAchievement, AchievementTier } from '../types';
import { getUserRankInfo } from './ranking';

export function calculatePlayerAchievements(
    user: UserProfile,
    stats: PlayerStatsSummary | null,
    allProfiles: UserProfile[] = []
): PlayerAchievement[] {
    const wins = stats ? stats.wonMatches : (user.matches_won || 0);
    const tourneysWon = user.tournaments_won || 0;
    const totalMatches = stats ? stats.totalMatches : wins;
    const bestStreak = stats ? stats.bestStreak : (wins >= 3 ? 3 : wins);
    const tieBreaksWon = stats ? stats.tieBreaksWon : 0;
    const tieBreakWinRate = stats ? stats.tieBreakWinRate : 0;
    const threeSetsWon = stats ? stats.threeSetsWon : 0;
    const winRate = stats ? stats.winRate : (totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0);

    const rankInfo = getUserRankInfo(user.id, allProfiles.length > 0 ? allProfiles : [user]);
    const isTop10 = rankInfo.categoryRank <= 10 || rankInfo.globalRank <= 10;
    const isMemberActive = Boolean(user.is_member && user.is_approved !== false);

    const achievements: PlayerAchievement[] = [
        // 1. Debut Triunfal (1ra victoria)
        {
            id: 'debut_winner',
            title: 'Debut Triunfal',
            description: 'Consiguió su primera victoria oficial en el circuito.',
            category: 'victory',
            tier: 'bronze',
            icon: 'Sparkles',
            unlocked: wins >= 1,
            progress: {
                current: Math.min(wins, 1),
                max: 1,
                label: wins >= 1 ? '¡Completado!' : '0/1 victoria'
            },
            badgeColor: 'from-amber-700 to-amber-900',
            rewardDescription: '+50 pts de experiencia'
        },

        // 2. Campeón Oficial (Ganó 1 torneo)
        {
            id: 'tournament_champion',
            title: 'Campeón de Torneo',
            description: 'Se consagró campeón de al menos 1 torneo oficial.',
            category: 'tournament',
            tier: 'gold',
            icon: 'Trophy',
            unlocked: tourneysWon >= 1,
            progress: {
                current: Math.min(tourneysWon, 1),
                max: 1,
                label: tourneysWon >= 1 ? '¡Campeón!' : '0/1 título'
            },
            badgeColor: 'from-yellow-500 to-amber-600',
            rewardDescription: 'Insignia de Campeón en Perfil'
        },

        // 3. Rey de Copas (Multicampeón)
        {
            id: 'multiple_titles',
            title: 'Rey de Copas',
            description: 'Conquistó 2 o más títulos oficiales en Smash Tenis.',
            category: 'tournament',
            tier: 'diamond',
            icon: 'Crown',
            unlocked: tourneysWon >= 2,
            progress: {
                current: Math.min(tourneysWon, 2),
                max: 2,
                label: `${tourneysWon}/2 títulos`
            },
            badgeColor: 'from-cyan-400 to-blue-600',
            rewardDescription: 'Corona dorada en rankings'
        },

        // 4. En Racha (3 victorias seguidas)
        {
            id: 'unbeaten_streak',
            title: 'En Llamas / En Racha',
            description: 'Alcanzó una racha invicta de 3 o más victorias consecutivas.',
            category: 'streak',
            tier: 'silver',
            icon: 'Flame',
            unlocked: bestStreak >= 3,
            progress: {
                current: Math.min(bestStreak, 3),
                max: 3,
                label: `${bestStreak}/3 partidos invicto`
            },
            badgeColor: 'from-orange-500 to-red-600',
            rewardDescription: 'Efecto de fuego en tarjeta coleccionable'
        },

        // 5. Rey del Tie-Break
        {
            id: 'tie_break_king',
            title: 'Rey del Tie-Break',
            description: 'Efectividad superior al 60% en desempates y Super Tie-Breaks.',
            category: 'special',
            tier: 'gold',
            icon: 'Zap',
            unlocked: tieBreaksWon >= 2 && tieBreakWinRate >= 60,
            progress: {
                current: tieBreaksWon,
                max: 2,
                label: `${tieBreaksWon}/2 ganados (${tieBreakWinRate}%)`
            },
            badgeColor: 'from-amber-400 to-orange-500',
            rewardDescription: 'Especialista en momentos de presión'
        },

        // 6. Guerrero del 3er Set (Decisivos)
        {
            id: 'three_set_warrior',
            title: 'Guerrero del 3er Set',
            description: 'Ganó 2 o más batallas a 3 sets o Super Tie-Breaks definitorios.',
            category: 'special',
            tier: 'silver',
            icon: 'Shield',
            unlocked: threeSetsWon >= 2,
            progress: {
                current: Math.min(threeSetsWon, 2),
                max: 2,
                label: `${threeSetsWon}/2 batallas ganadas`
            },
            badgeColor: 'from-emerald-500 to-teal-700',
            rewardDescription: 'Espíritu de lucha inquebrantable'
        },

        // 7. Top 10 Oficial
        {
            id: 'top_ten',
            title: 'Top 10 Oficial',
            description: 'Alcanzó el Top 10 en el ranking de su categoría o general.',
            category: 'victory',
            tier: 'gold',
            icon: 'Medal',
            unlocked: isTop10,
            progress: {
                current: isTop10 ? 1 : 0,
                max: 1,
                label: isTop10 ? `Top #${rankInfo.categoryRank}` : `Puesto #${rankInfo.categoryRank}`
            },
            badgeColor: 'from-yellow-400 to-yellow-600',
            rewardDescription: 'Posición de élite en el circuito'
        },

        // 8. Veterano del Circuito (5+ partidos jugados)
        {
            id: 'circuit_veteran',
            title: 'Veterano del Circuito',
            description: 'Disputó 5 o más partidos oficiales en la plataforma.',
            category: 'community',
            tier: 'bronze',
            icon: 'Activity',
            unlocked: totalMatches >= 5,
            progress: {
                current: Math.min(totalMatches, 5),
                max: 5,
                label: `${totalMatches}/5 partidos`
            },
            badgeColor: 'from-slate-600 to-slate-800',
            rewardDescription: 'Reconocimiento a la constancia deportiva'
        },

        // 9. Efectividad Letal (Win rate >= 70%)
        {
            id: 'lethal_efficiency',
            title: 'Efectividad Letal',
            description: 'Mantiene más del 70% de efectividad de victorias (mín. 3 partidos).',
            category: 'victory',
            tier: 'diamond',
            icon: 'Target',
            unlocked: winRate >= 70 && totalMatches >= 3,
            progress: {
                current: winRate,
                max: 70,
                label: `${winRate}% efectividad (mín. 70%)`
            },
            badgeColor: 'from-purple-500 to-indigo-700',
            rewardDescription: 'Estatus de jugador temible'
        },

        // 10. Socio Comprometido
        {
            id: 'active_member',
            title: 'Socio Comprometido',
            description: 'Miembro activo y verificado en su institución de tenis.',
            category: 'community',
            tier: 'silver',
            icon: 'Award',
            unlocked: isMemberActive,
            progress: {
                current: isMemberActive ? 1 : 0,
                max: 1,
                label: isMemberActive ? 'Activo' : 'Pendiente'
            },
            badgeColor: 'from-blue-500 to-indigo-600',
            rewardDescription: 'Tarifa preferencial de socio'
        },

        // 11. Foto Oficial del Circuito
        {
            id: 'profile_photo',
            title: 'Foto Oficial',
            description: 'Subió su foto de perfil oficial para el circuito y la tarjeta coleccionable.',
            category: 'community',
            tier: 'bronze',
            icon: 'Camera',
            unlocked: Boolean(user.profile_picture_url && user.profile_picture_url.trim().length > 0),
            progress: {
                current: (user.profile_picture_url && user.profile_picture_url.trim().length > 0) ? 1 : 0,
                max: 1,
                label: (user.profile_picture_url && user.profile_picture_url.trim().length > 0) ? '¡Foto activa!' : '0/1 foto cargada'
            },
            badgeColor: 'from-sky-600 to-blue-800',
            rewardDescription: '+50 pts de bonus en el Ranking'
        }
    ];

    // Sort: Unlocked first (by tier diamond > gold > silver > bronze), then by progress percentage desc
    const tierWeight: Record<AchievementTier, number> = {
        diamond: 4,
        gold: 3,
        silver: 2,
        bronze: 1
    };

    return achievements.sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;

        if (a.unlocked && b.unlocked) {
            return tierWeight[b.tier] - tierWeight[a.tier];
        }

        const aPct = a.progress.max > 0 ? a.progress.current / a.progress.max : 0;
        const bPct = b.progress.max > 0 ? b.progress.current / b.progress.max : 0;
        return bPct - aPct;
    });
}

export function getTopUnlockedAchievements(achievements: PlayerAchievement[], limit = 3): PlayerAchievement[] {
    const unlocked = achievements.filter(a => a.unlocked);
    if (unlocked.length >= limit) {
        return unlocked.slice(0, limit);
    }
    // Fill with closest to unlocking
    return achievements.slice(0, limit);
}

export function getTierColorClasses(tier: AchievementTier) {
    switch (tier) {
        case 'diamond':
            return {
                bg: 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300',
                badge: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950',
                border: 'border-cyan-400/50',
                glow: 'shadow-cyan-500/20'
            };
        case 'gold':
            return {
                bg: 'bg-amber-500/10 border-amber-400/40 text-amber-300',
                badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950',
                border: 'border-amber-400/50',
                glow: 'shadow-amber-500/20'
            };
        case 'silver':
            return {
                bg: 'bg-slate-300/10 border-slate-300/30 text-slate-200',
                badge: 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950',
                border: 'border-slate-300/40',
                glow: 'shadow-slate-300/15'
            };
        case 'bronze':
        default:
            return {
                bg: 'bg-amber-700/10 border-amber-700/30 text-amber-400',
                badge: 'bg-gradient-to-r from-amber-600 to-amber-800 text-white',
                border: 'border-amber-700/40',
                glow: 'shadow-amber-700/15'
            };
    }
}
