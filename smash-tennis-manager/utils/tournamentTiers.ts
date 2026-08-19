import { SystemConfig, TournamentTierInfo } from '../types';

export const DEFAULT_TIER_CONFIG = {
    tier_250_min_players: 6,
    tier_250_max_players: 16,
    tier_250_points: 250,
    tier_250_fee_pct: 5,

    tier_500_min_players: 17,
    tier_500_max_players: 32,
    tier_500_points: 500,
    tier_500_fee_pct: 7.5,

    tier_1000_min_players: 33,
    tier_1000_max_players: 64,
    tier_1000_points: 1000,
    tier_1000_fee_pct: 10,

    tier_masters_min_players: 8,
    tier_masters_points: 1500,
    tier_masters_fee_pct: 12,

    monetization_base_fee_fixed: 0,
    platform_payout_alias: '',
    platform_payout_holder: ''
};

export const getTournamentTier = (playerCount: number, config?: Partial<SystemConfig>): TournamentTierInfo => {
    const min500 = Number(config?.tier_500_min_players ?? DEFAULT_TIER_CONFIG.tier_500_min_players);
    const min1000 = Number(config?.tier_1000_min_players ?? DEFAULT_TIER_CONFIG.tier_1000_min_players);

    // Tier 1000 (33+ players)
    if (playerCount >= min1000) {
        return {
            tierKey: '1000',
            label: 'Smash 1000',
            badgeColor: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25',
            textColor: 'text-amber-300',
            borderColor: 'border-amber-500/40',
            pointsWinner: Number(config?.tier_1000_points ?? DEFAULT_TIER_CONFIG.tier_1000_points),
            feePercentage: Number(config?.tier_1000_fee_pct ?? DEFAULT_TIER_CONFIG.tier_1000_fee_pct),
            minPlayers: min1000
        };
    }

    // Tier 500 (17 to 32 players)
    if (playerCount >= min500) {
        return {
            tierKey: '500',
            label: 'Smash 500',
            badgeColor: 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25',
            textColor: 'text-purple-300',
            borderColor: 'border-purple-500/40',
            pointsWinner: Number(config?.tier_500_points ?? DEFAULT_TIER_CONFIG.tier_500_points),
            feePercentage: Number(config?.tier_500_fee_pct ?? DEFAULT_TIER_CONFIG.tier_500_fee_pct),
            minPlayers: min500,
            maxPlayers: min1000 - 1
        };
    }

    // Tier 250 (Default: up to 16 players)
    return {
        tierKey: '250',
        label: 'Smash 250',
        badgeColor: 'bg-gradient-to-r from-blue-500/25 to-cyan-500/25',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-500/40',
        pointsWinner: Number(config?.tier_250_points ?? DEFAULT_TIER_CONFIG.tier_250_points),
        feePercentage: Number(config?.tier_250_fee_pct ?? DEFAULT_TIER_CONFIG.tier_250_fee_pct),
        minPlayers: Number(config?.tier_250_min_players ?? DEFAULT_TIER_CONFIG.tier_250_min_players),
        maxPlayers: min500 - 1
    };
};

export const calculateTournamentFinances = (
    playerCount: number,
    pricePerPlayer: number,
    config?: Partial<SystemConfig>
) => {
    const tier = getTournamentTier(playerCount, config);
    const grossTotal = Math.max(0, playerCount * (pricePerPlayer || 0));
    const feePct = tier.feePercentage || 0;
    const fixedFeePerPlayer = Number(config?.monetization_base_fee_fixed || 0);

    const platformFeeFromPct = (grossTotal * feePct) / 100;
    const platformFeeFromFixed = playerCount * fixedFeePerPlayer;
    const platformTotalCommission = platformFeeFromPct + platformFeeFromFixed;
    const clubNetIncome = Math.max(0, grossTotal - platformTotalCommission);

    return {
        tier,
        playerCount,
        pricePerPlayer,
        grossTotal,
        feePct,
        fixedFeePerPlayer,
        platformTotalCommission,
        clubNetIncome
    };
};
