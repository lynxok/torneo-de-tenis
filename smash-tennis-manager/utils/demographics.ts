/**
 * Helper utilities for player demographics, age calculation, and categories
 */

export function calculateAge(birthDate?: string | null): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 0 ? age : null;
}

export function isJuniorPlayer(birthDate?: string | null, threshold: number = 16): boolean {
    const age = calculateAge(birthDate);
    if (age === null) return false; // Default to adult if not specified
    return age <= threshold;
}

export function getAgeCategoryLabel(birthDate?: string | null, threshold: number = 16): string {
    const age = calculateAge(birthDate);
    if (age === null) return 'Adulto / Mayor';
    if (age <= threshold) {
        return `Menor (${age} años)`;
    }
    return `Mayor (${age} años)`;
}

export function formatGender(gender?: string | null): string {
    if (!gender) return 'Masculino';
    const g = gender.toLowerCase().trim();
    if (g === 'femenino' || g === 'female' || g === 'f' || g === 'damas') {
        return 'Femenino';
    }
    return 'Masculino';
}

export function getGenderBadgeClass(gender?: string | null): string {
    const g = formatGender(gender);
    if (g === 'Femenino') {
        return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
    }
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
}

export type TournamentGenderScope = 'damas' | 'caballeros' | 'mixto' | 'open';

export function getTournamentGenderScope(tournament?: {
    gender?: string | null;
    name?: string | null;
    category?: string | null;
    competitions?: { gender?: string | null }[] | null;
} | null): TournamentGenderScope {
    if (!tournament) return 'open';

    // 1. Check competitions if present
    if (tournament.competitions && tournament.competitions.length > 0) {
        const genders = new Set(
            tournament.competitions.map(c => (c.gender || '').toUpperCase().trim())
        );
        if (genders.has('X')) return 'mixto';
        if (genders.has('F') && genders.has('M')) return 'open';
        if (genders.has('F') && !genders.has('M')) return 'damas';
        if (genders.has('M') && !genders.has('F')) return 'caballeros';
    }

    // 2. Check explicit tournament.gender
    if (tournament.gender) {
        const g = tournament.gender.toLowerCase().trim();
        if (g === 'damas' || g === 'f' || g === 'femenino' || g === 'mujeres') return 'damas';
        if (g === 'caballeros' || g === 'm' || g === 'masculino' || g === 'hombres') return 'caballeros';
        if (g === 'mixto' || g === 'x' || g === 'mixed') return 'mixto';
    }

    // 3. Fallback to name or category inspection (common when created as "Torneo Damas 3ra")
    const combinedText = `${tournament.name || ''} ${tournament.category || ''}`.toLowerCase();
    if (combinedText.includes('damas') || combinedText.includes('femenin') || combinedText.includes('mujeres')) {
        return 'damas';
    }
    if (combinedText.includes('mixto') || combinedText.includes('dobles mixto')) {
        return 'mixto';
    }
    if (combinedText.includes('caballeros') || combinedText.includes('masculin') || combinedText.includes('hombres')) {
        return 'caballeros';
    }

    return 'caballeros';
}

export interface TournamentGenderEligibility {
    canEnroll: boolean;
    isInformativeOnly: boolean;
    reason?: string;
    tournamentGenderLabel: string;
    badgeLabel: string;
}

export function checkPlayerGenderEligibility(
    user?: { gender?: string | null; role?: string | null } | null,
    tournament?: {
        gender?: string | null;
        name?: string | null;
        category?: string | null;
        competitions?: { gender?: string | null }[] | null;
    } | null
): TournamentGenderEligibility {
    const scope = getTournamentGenderScope(tournament);

    let tournamentGenderLabel = 'Caballeros';
    let badgeLabel = '👤 Caballeros';
    if (scope === 'damas') {
        tournamentGenderLabel = 'Damas';
        badgeLabel = '🌸 Damas';
    } else if (scope === 'mixto') {
        tournamentGenderLabel = 'Mixto';
        badgeLabel = '⚡ Mixto';
    } else if (scope === 'open') {
        tournamentGenderLabel = 'Abierto';
        badgeLabel = '🎾 Abierto';
    }

    // If tournament has multiple competitions, check if player can participate in at least one competition
    if (tournament?.competitions && tournament.competitions.length > 0) {
        const uGender = formatGender(user?.gender);
        const isUserFemale = uGender === 'Femenino';
        const hasMatchingComp = tournament.competitions.some(c => {
            const cg = (c.gender || '').toUpperCase().trim();
            if (cg === 'X') return true;
            if (cg === 'F' && isUserFemale) return true;
            if (cg === 'M' && !isUserFemale) return true;
            return false;
        });

        if (hasMatchingComp) {
            return {
                canEnroll: true,
                isInformativeOnly: false,
                tournamentGenderLabel,
                badgeLabel
            };
        } else {
            return {
                canEnroll: false,
                isInformativeOnly: true,
                reason: `Este torneo es exclusivo para la categoría ${tournamentGenderLabel}.`,
                tournamentGenderLabel,
                badgeLabel
            };
        }
    }

    // Single competition / global tournament gender
    if (scope === 'mixto' || scope === 'open') {
        return {
            canEnroll: true,
            isInformativeOnly: false,
            tournamentGenderLabel,
            badgeLabel
        };
    }

    const uGender = formatGender(user?.gender);
    const isUserFemale = uGender === 'Femenino';
    const isUserMale = !isUserFemale;

    if (scope === 'damas' && !isUserFemale) {
        return {
            canEnroll: false,
            isInformativeOnly: true,
            reason: 'Este torneo es exclusivo para la categoría Damas (Femenino).',
            tournamentGenderLabel: 'Damas',
            badgeLabel: '🌸 Damas'
        };
    }

    if (scope === 'caballeros' && !isUserMale) {
        return {
            canEnroll: false,
            isInformativeOnly: true,
            reason: 'Este torneo es exclusivo para la categoría Caballeros (Masculino).',
            tournamentGenderLabel: 'Caballeros',
            badgeLabel: '👤 Caballeros'
        };
    }

    return {
        canEnroll: true,
        isInformativeOnly: false,
        tournamentGenderLabel,
        badgeLabel
    };
}
