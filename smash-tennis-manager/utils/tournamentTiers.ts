import { SystemConfig, TournamentTierInfo, TournamentSaga, Tournament, UserProfile } from '../types';

export const DEFAULT_TIER_CONFIG = {
    // Challenger Tier (Base)
    tier_challenger_min_players: 4,
    tier_challenger_max_players: 16,
    tier_challenger_points: 125,
    tier_challenger_fee_pct: 5,

    // Smash 250
    tier_250_min_players: 17,
    tier_250_max_players: 32,
    tier_250_points: 250,
    tier_250_fee_pct: 5,        // Tarifa bonificada por mérito / fidelidad
    tier_250_direct_fee_pct: 6, // Salto directo

    // Smash 500
    tier_500_min_players: 33,
    tier_500_max_players: 64,
    tier_500_points: 500,
    tier_500_fee_pct: 5,        // Tarifa bonificada por mérito
    tier_500_direct_fee_pct: 7, // Salto directo

    // Smash 1000
    tier_1000_min_players: 65,
    tier_1000_max_players: 128,
    tier_1000_points: 1000,
    tier_1000_fee_pct: 5,       // Tarifa bonificada por mérito
    tier_1000_direct_fee_pct: 8,// Salto directo

    // Master Final
    tier_masters_min_players: 8,
    tier_masters_points: 1500,
    tier_masters_fee_pct: 5,        // Tarifa bonificada por mérito
    tier_masters_direct_fee_pct: 10,// Salto directo

    // Progression Rules
    saga_cooldown_days: 180,        // Mínimo de días entre ediciones para computar ascenso
    disputed_min_matches: 2,        // Mínimo de partidos jugados para considerar el torneo disputado

    // Monetization Fixed & Payouts
    monetization_base_fee_fixed: 0,
    platform_payout_alias: '',
    platform_payout_holder: ''
};

export const TIER_ORDER: Array<'challenger' | '250' | '500' | '1000' | 'masters'> = [
    'challenger',
    '250',
    '500',
    '1000',
    'masters'
];

export const TIER_META = {
    challenger: {
        label: 'Smash Challenger',
        shortLabel: 'Challenger',
        badgeColor: 'bg-gradient-to-r from-slate-500/25 to-zinc-500/25',
        textColor: 'text-slate-300',
        borderColor: 'border-slate-500/40',
        icon: '🛡️',
        description: 'Categoría inicial de prueba y fogueo para nuevas sagas o torneos base.'
    },
    '250': {
        label: 'Smash 250',
        shortLabel: '250',
        badgeColor: 'bg-gradient-to-r from-blue-500/25 to-cyan-500/25',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-500/40',
        icon: '🥉',
        description: 'Torneos abiertos de convocatoria media o sagas consolidadas.'
    },
    '500': {
        label: 'Smash 500',
        shortLabel: '500',
        badgeColor: 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25',
        textColor: 'text-purple-300',
        borderColor: 'border-purple-500/40',
        icon: '🥈',
        description: 'Grandes eventos regionales con alta participación y tradición.'
    },
    '1000': {
        label: 'Smash 1000',
        shortLabel: '1000',
        badgeColor: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/40',
        icon: '🥇',
        description: 'Torneos estelares del circuito anual con máxima repercusión.'
    },
    masters: {
        label: 'Smash Master Final',
        shortLabel: 'Master',
        badgeColor: 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/40',
        icon: '👑',
        description: 'Cierre anual de temporada con los mejores jugadores del ranking.'
    }
};

/**
 * Retorna la información visual y parámetros de un Tier dado su key
 */
export const getTierInfoByKey = (
    tierKey: 'challenger' | '250' | '500' | '1000' | 'masters',
    config?: Partial<SystemConfig>
): TournamentTierInfo => {
    const meta = TIER_META[tierKey] || TIER_META.challenger;

    let pointsWinner = 125;
    let feePercentage = 5;
    let directFeePercentage = 5;
    let minPlayers = 4;
    let maxPlayers: number | undefined = 16;

    if (tierKey === 'masters') {
        pointsWinner = Number(config?.tier_masters_points ?? DEFAULT_TIER_CONFIG.tier_masters_points);
        feePercentage = Number(config?.tier_masters_fee_pct ?? DEFAULT_TIER_CONFIG.tier_masters_fee_pct);
        directFeePercentage = Number(config?.tier_masters_direct_fee_pct ?? DEFAULT_TIER_CONFIG.tier_masters_direct_fee_pct);
        minPlayers = Number(config?.tier_masters_min_players ?? DEFAULT_TIER_CONFIG.tier_masters_min_players);
        maxPlayers = undefined;
    } else if (tierKey === '1000') {
        pointsWinner = Number(config?.tier_1000_points ?? DEFAULT_TIER_CONFIG.tier_1000_points);
        feePercentage = Number(config?.tier_1000_fee_pct ?? DEFAULT_TIER_CONFIG.tier_1000_fee_pct);
        directFeePercentage = Number(config?.tier_1000_direct_fee_pct ?? DEFAULT_TIER_CONFIG.tier_1000_direct_fee_pct);
        minPlayers = Number(config?.tier_1000_min_players ?? DEFAULT_TIER_CONFIG.tier_1000_min_players);
        maxPlayers = Number(config?.tier_1000_max_players ?? DEFAULT_TIER_CONFIG.tier_1000_max_players);
    } else if (tierKey === '500') {
        pointsWinner = Number(config?.tier_500_points ?? DEFAULT_TIER_CONFIG.tier_500_points);
        feePercentage = Number(config?.tier_500_fee_pct ?? DEFAULT_TIER_CONFIG.tier_500_fee_pct);
        directFeePercentage = Number(config?.tier_500_direct_fee_pct ?? DEFAULT_TIER_CONFIG.tier_500_direct_fee_pct);
        minPlayers = Number(config?.tier_500_min_players ?? DEFAULT_TIER_CONFIG.tier_500_min_players);
        maxPlayers = Number(config?.tier_500_max_players ?? DEFAULT_TIER_CONFIG.tier_500_max_players);
    } else if (tierKey === '250') {
        pointsWinner = Number(config?.tier_250_points ?? DEFAULT_TIER_CONFIG.tier_250_points);
        feePercentage = Number(config?.tier_250_fee_pct ?? DEFAULT_TIER_CONFIG.tier_250_fee_pct);
        directFeePercentage = Number(config?.tier_250_direct_fee_pct ?? DEFAULT_TIER_CONFIG.tier_250_direct_fee_pct);
        minPlayers = Number(config?.tier_250_min_players ?? DEFAULT_TIER_CONFIG.tier_250_min_players);
        maxPlayers = Number(config?.tier_250_max_players ?? DEFAULT_TIER_CONFIG.tier_250_max_players);
    } else {
        pointsWinner = Number(config?.tier_challenger_points ?? DEFAULT_TIER_CONFIG.tier_challenger_points);
        feePercentage = Number(config?.tier_challenger_fee_pct ?? DEFAULT_TIER_CONFIG.tier_challenger_fee_pct);
        directFeePercentage = feePercentage;
        minPlayers = Number(config?.tier_challenger_min_players ?? DEFAULT_TIER_CONFIG.tier_challenger_min_players);
        maxPlayers = Number(config?.tier_challenger_max_players ?? DEFAULT_TIER_CONFIG.tier_challenger_max_players);
    }

    return {
        tierKey,
        label: meta.label,
        badgeColor: meta.badgeColor,
        textColor: meta.textColor,
        borderColor: meta.borderColor,
        pointsWinner,
        feePercentage,
        directFeePercentage,
        minPlayers,
        maxPlayers
    };
};

/**
 * Evalúa el progreso histórico de una saga de torneo respetando la cadencia de 180 días.
 * Retorna el nivel máximo alcanzado por mérito y los detalles de las ediciones válidas.
 */
export const evaluateSagaProgression = (
    saga: TournamentSaga | null | undefined,
    previousTournaments: Tournament[] = [],
    config?: Partial<SystemConfig>
): {
    maxMeritTier: 'challenger' | '250' | '500' | '1000' | 'masters';
    validEditionsCount: number;
    totalEditionsCount: number;
    reasons: string[];
} => {
    if (!saga) {
        return {
            maxMeritTier: 'challenger',
            validEditionsCount: 0,
            totalEditionsCount: 0,
            reasons: ['Torneo independiente (sin saga vinculada)']
        };
    }

    const minCooldownDays = Number(config?.saga_cooldown_days ?? DEFAULT_TIER_CONFIG.saga_cooldown_days);

    // Ordenar torneos anteriores de la saga por fecha cronológica ascendente
    const sorted = [...previousTournaments]
        .filter(t => t.saga_id === saga.id && (t.status === 'finished' || t.is_disputed))
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    let validEditionsCount = 0;
    let lastValidDate: Date | null = null;
    let maxMeritTier: 'challenger' | '250' | '500' | '1000' | 'masters' = 'challenger';
    const reasons: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const currentDate = new Date(t.start_date);

        if (!lastValidDate) {
            validEditionsCount++;
            lastValidDate = currentDate;
            reasons.push(`Edición 1 (${t.name || 'Inicio'}): Habilitó base Challenger.`);
        } else {
            const diffDays = Math.floor((currentDate.getTime() - lastValidDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= minCooldownDays) {
                validEditionsCount++;
                lastValidDate = currentDate;
                reasons.push(`Edición ${validEditionsCount} (${diffDays} días después): Computó mérito de ascenso.`);
            } else {
                reasons.push(`Edición adicional (${diffDays} días después): No computó para ascenso por jugarse en menos de ${minCooldownDays} días.`);
            }
        }
    }

    // Reglas de ascenso por ediciones válidas acumuladas
    if (validEditionsCount >= 4) {
        maxMeritTier = 'masters';
    } else if (validEditionsCount >= 3) {
        maxMeritTier = '1000';
    } else if (validEditionsCount >= 2) {
        maxMeritTier = '500';
    } else if (validEditionsCount >= 1) {
        maxMeritTier = '250';
    } else {
        maxMeritTier = 'challenger';
    }

    return {
        maxMeritTier,
        validEditionsCount,
        totalEditionsCount: sorted.length,
        reasons
    };
};

/**
 * Determina el tier efectivo y la comisión exacta a aplicar para un torneo
 */
export const getEffectiveTournamentTier = (
    playerCount: number,
    chosenTierKey?: string,
    saga?: TournamentSaga | null,
    sagaTournaments: Tournament[] = [],
    config?: Partial<SystemConfig>,
    user?: UserProfile | null,
    institution?: { is_membership_active?: boolean; membership_expires_at?: string | null; free_tournaments_remaining?: number } | null
): {
    tier: TournamentTierInfo;
    isDirectJump: boolean;
    effectiveFeePct: number;
    meritTier: 'challenger' | '250' | '500' | '1000' | 'masters';
    isTrialFree: boolean;
    isVipWaiver: boolean;
} => {
    // 1. Evaluación de Membresía VIP o Torneo de Prueba (por Usuario o por Club/Institución)
    const isVipWaiver = Boolean(
        (user?.is_membership_active && (!user?.membership_expires_at || new Date(user.membership_expires_at) > new Date())) ||
        (institution?.is_membership_active && (!institution?.membership_expires_at || new Date(institution.membership_expires_at) > new Date()))
    );

    const hasTrialSlots = Boolean(
        (user?.free_tournaments_remaining && user.free_tournaments_remaining > 0) ||
        (institution?.free_tournaments_remaining && institution.free_tournaments_remaining > 0)
    );

    // 2. Determinar el nivel de mérito de la saga
    const sagaEval = evaluateSagaProgression(saga, sagaTournaments, config);
    const meritTier = sagaEval.maxMeritTier;

    // 3. Nivel seleccionado o inferido
    let targetTierKey: 'challenger' | '250' | '500' | '1000' | 'masters' = 'challenger';
    if (chosenTierKey && TIER_ORDER.includes(chosenTierKey as any)) {
        targetTierKey = chosenTierKey as any;
    } else if (playerCount >= 65) {
        targetTierKey = '1000';
    } else if (playerCount >= 33) {
        targetTierKey = '500';
    } else if (playerCount >= 17) {
        targetTierKey = '250';
    } else {
        targetTierKey = 'challenger';
    }

    const tier = getTierInfoByKey(targetTierKey, config);

    // 4. Determinar si es salto directo
    const targetTierIndex = TIER_ORDER.indexOf(targetTierKey);
    const meritTierIndex = TIER_ORDER.indexOf(meritTier);
    const isDirectJump = targetTierIndex > meritTierIndex;

    // 5. Cálculo de porcentaje de comisión
    let effectiveFeePct = isDirectJump 
        ? (tier.directFeePercentage ?? tier.feePercentage) 
        : tier.feePercentage;

    let isTrialFree = false;

    if (isVipWaiver) {
        effectiveFeePct = 0;
    } else if (hasTrialSlots) {
        effectiveFeePct = 0;
        isTrialFree = true;
    }

    return {
        tier,
        isDirectJump,
        effectiveFeePct,
        meritTier,
        isTrialFree,
        isVipWaiver
    };
};

/**
 * Helper retrocompatible para obtener el tier basado en cantidad de inscriptos
 */
export const getTournamentTier = (playerCount: number, config?: Partial<SystemConfig>): TournamentTierInfo => {
    if (playerCount >= 65) return getTierInfoByKey('1000', config);
    if (playerCount >= 33) return getTierInfoByKey('500', config);
    if (playerCount >= 17) return getTierInfoByKey('250', config);
    return getTierInfoByKey('challenger', config);
};

/**
 * Cálculo integral de finanzas y recaudación del torneo
 */
export const calculateTournamentFinances = (
    playerCount: number,
    pricePerPlayer: number,
    config?: Partial<SystemConfig>,
    isWaived: boolean = false,
    options?: {
        chosenTierKey?: string;
        saga?: TournamentSaga | null;
        sagaTournaments?: Tournament[];
        user?: UserProfile | null;
        isTrialFree?: boolean;
    }
) => {
    const calculation = getEffectiveTournamentTier(
        playerCount,
        options?.chosenTierKey,
        options?.saga,
        options?.sagaTournaments,
        config,
        options?.user
    );

    const grossTotal = Math.max(0, playerCount * (pricePerPlayer || 0));
    const shouldWaive = isWaived || calculation.isVipWaiver || calculation.isTrialFree || options?.isTrialFree;

    if (shouldWaive) {
        return {
            tier: calculation.tier,
            playerCount,
            pricePerPlayer,
            grossTotal,
            feePct: 0,
            originalFeePct: calculation.effectiveFeePct,
            fixedFeePerPlayer: 0,
            platformTotalCommission: 0,
            clubNetIncome: grossTotal,
            isWaived: true,
            isTrialFree: calculation.isTrialFree || options?.isTrialFree,
            isDirectJump: calculation.isDirectJump,
            meritTier: calculation.meritTier
        };
    }

    const feePct = calculation.effectiveFeePct;
    const fixedFeePerPlayer = Number(config?.monetization_base_fee_fixed || 0);

    const platformFeeFromPct = (grossTotal * feePct) / 100;
    const platformFeeFromFixed = playerCount * fixedFeePerPlayer;
    const platformTotalCommission = platformFeeFromPct + platformFeeFromFixed;
    const clubNetIncome = Math.max(0, grossTotal - platformTotalCommission);

    return {
        tier: calculation.tier,
        playerCount,
        pricePerPlayer,
        grossTotal,
        feePct,
        originalFeePct: calculation.tier.feePercentage,
        fixedFeePerPlayer,
        platformTotalCommission,
        clubNetIncome,
        isWaived: false,
        isTrialFree: false,
        isDirectJump: calculation.isDirectJump,
        meritTier: calculation.meritTier
    };
};
