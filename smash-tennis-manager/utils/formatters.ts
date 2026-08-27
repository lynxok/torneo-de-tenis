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
 * Format a single set string into standardized tennis score (e.g. "10-8" -> "7-6 (10-8)", "7-6(5)" -> "7-6 (7-5)")
 */
export function formatSingleSet(setStr?: string): string {
    if (!setStr) return '';
    const clean = setStr.trim();
    if (!clean) return '';

    // If walkover or non-numeric
    if (/^[WOwo]$/i.test(clean) || clean.toLowerCase() === 'wo' || clean.toLowerCase() === 'w/o') {
        return clean.toUpperCase();
    }

    // Match patterns like "7-6 (10-8)", "7-6(7-5)", "7-6(5)", "10-8", "6-4"
    const match = clean.match(/^(\d+)\s*[-/]\s*(\d+)(?:\s*\((.*?)\))?/);
    if (!match) return clean;

    let p1 = parseInt(match[1], 10);
    let p2 = parseInt(match[2], 10);
    let tb = match[3] ? match[3].trim() : '';

    // Case 1: Raw Super Tie-Break legacy format (e.g. "10-8" or "8-10" or "12-10")
    if (p1 >= 10 || p2 >= 10) {
        if (p1 > p2) {
            return `7-6 (${p1}-${p2})`;
        } else {
            return `6-7 (${p1}-${p2})`;
        }
    }

    // Case 2: 7-6 or 6-7 with tiebreak info
    if ((p1 === 7 && p2 === 6) || (p1 === 6 && p2 === 7)) {
        if (tb) {
            // If tb is single number like "5", expand to "7-5" or "5-7"
            if (/^\d+$/.test(tb)) {
                const loserPoints = parseInt(tb, 10);
                if (p1 === 7) {
                    return `7-6 (7-${loserPoints})`;
                } else {
                    return `6-7 (${loserPoints}-7)`;
                }
            }
            // If tb already has both numbers e.g. "7-5" or "10-8"
            return `${p1}-${p2} (${tb})`;
        }
        return `${p1}-${p2}`;
    }

    return `${p1}-${p2}`;
}

/**
 * Format score object into human-readable tennis score string (e.g. "6-4 4-6 7-6 (10-8)")
 */
export function formatMatchScore(score: any): string | null {
    if (!score) return null;
    if (typeof score === 'string') {
        const clean = score.trim();
        // If it contains multiple sets separated by space
        const chunks = clean.split(/\s+/);
        if (chunks.length > 0) {
            // Group tokens so (10-8) stays attached to 7-6 if separated by space
            const mergedChunks: string[] = [];
            for (let i = 0; i < chunks.length; i++) {
                const current = chunks[i];
                if (current.startsWith('(') && mergedChunks.length > 0) {
                    mergedChunks[mergedChunks.length - 1] += ` ${current}`;
                } else {
                    mergedChunks.push(current);
                }
            }
            return mergedChunks.map(formatSingleSet).join(' ');
        }
        return formatSingleSet(clean);
    }
    if (typeof score === 'object') {
        if (score.set1 || score.set2) {
            const s1 = formatSingleSet(score.set1);
            const s2 = formatSingleSet(score.set2);
            const s3 = score.set3 ? ` ${formatSingleSet(score.set3)}` : '';
            return `${s1} ${s2}${s3}`.trim();
        }
        if (Array.isArray(score)) {
            return score.map((s: any) => {
                if (typeof s === 'string') return formatSingleSet(s);
                return formatSingleSet(`${s.p1 || s[0] || 0}-${s.p2 || s[1] || 0}`);
            }).join(' ');
        }
    }
    return JSON.stringify(score);
}
