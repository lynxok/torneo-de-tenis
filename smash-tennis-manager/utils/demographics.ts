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
