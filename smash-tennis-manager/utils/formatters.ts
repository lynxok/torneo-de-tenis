export function capitalizeWord(w?: string): string {
    if (!w) return '';
    const clean = w.trim();
    if (!clean) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Standardize player full name:
 * First Name with capitalized initial(s) and Last Name in ALL CAPS.
 * Examples:
 * - formatPlayerName("matias", "jovanovich") -> "Matias JOVANOVICH"
 * - formatPlayerName("juan ignacio", "gastaldo") -> "Juan Ignacio GASTALDO"
 * - formatPlayerName("walter spector") -> "Walter SPECTOR"
 */
export function formatPlayerName(name?: string, lastname?: string): string {
    if (!name && !lastname) return 'Jugador';

    if (name && lastname && lastname.trim()) {
        const cleanName = name.trim().split(/\s+/).map(capitalizeWord).join(' ');
        const cleanLastname = lastname.trim().toUpperCase();
        return `${cleanName} ${cleanLastname}`;
    }

    if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            const last = parts.pop()!.toUpperCase();
            const first = parts.map(capitalizeWord).join(' ');
            return `${first} ${last}`;
        }
        return capitalizeWord(parts[0]);
    }

    if (lastname) {
        return lastname.trim().toUpperCase();
    }

    return 'Jugador';
}

/**
 * Format score object into human-readable tennis score string (e.g. "6-4 4-6 10-8")
 */
export function formatMatchScore(score: any): string | null {
    if (!score) return null;
    if (typeof score === 'string') return score;
    if (typeof score === 'object') {
        if (score.set1 || score.set2) {
            const s1 = score.set1 || '';
            const s2 = score.set2 || '';
            const s3 = score.set3 ? ` ${score.set3}` : '';
            return `${s1} ${s2}${s3}`.trim();
        }
        if (Array.isArray(score)) {
            return score.map((s: any) => `${s.p1}-${s.p2}`).join(' ');
        }
    }
    return JSON.stringify(score);
}
