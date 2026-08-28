// Geospatial Utilities for Smash Tennis Tournaments & Clubs

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface UserLocation extends Coordinates {
    accuracy?: number;
}

// Well-known tennis clubs and city coordinates in Argentina
export const KNOWN_TENNIS_CLUBS: Record<string, Coordinates> = {
    // Entre Ríos
    'tenis parque españa': { lat: -32.0664, lng: -60.6384 },
    'parque españa': { lat: -32.0664, lng: -60.6384 },
    'club parque españa': { lat: -32.0664, lng: -60.6384 },
    'diamante': { lat: -32.0664, lng: -60.6384 },
    
    'club smash': { lat: -31.7333, lng: -60.5290 },
    'club atletico paracao': { lat: -31.7483, lng: -60.5289 },
    'paracao': { lat: -31.7483, lng: -60.5289 },
    'club estudiantes de parana': { lat: -31.7198, lng: -60.5368 },
    'cae parana': { lat: -31.7198, lng: -60.5368 },
    'club nautico parana': { lat: -31.7155, lng: -60.5320 },
    'club rowing parana': { lat: -31.7180, lng: -60.5340 },
    'parana': { lat: -31.7320, lng: -60.5290 },

    'club union de crespo': { lat: -32.0298, lng: -60.3060 },
    'asociacion deportiva y cultural crespo': { lat: -32.0315, lng: -60.3120 },
    'crespo': { lat: -32.0300, lng: -60.3080 },

    'club 25 de mayo victoria': { lat: -32.6180, lng: -60.1580 },
    'victoria': { lat: -32.6190, lng: -60.1570 },

    'club hipico concordia': { lat: -31.3930, lng: -58.0210 },
    'club victoria concordia': { lat: -31.3980, lng: -58.0180 },
    'concordia': { lat: -31.3929, lng: -58.0209 },

    'club nautico gualeguaychu': { lat: -33.0120, lng: -58.5130 },
    'gualeguaychu': { lat: -33.0094, lng: -58.5172 },

    'club gimnasia y esgrima cdelu': { lat: -32.4830, lng: -58.2320 },
    'concepcion del uruguay': { lat: -32.4840, lng: -58.2330 },

    // Santa Fe
    'santa fe lawn tennis club': { lat: -31.6420, lng: -60.7020 },
    'club atletico union santa fe': { lat: -31.6310, lng: -60.7150 },
    'santa fe': { lat: -31.6333, lng: -60.7000 },
    'jockey club de rosario': { lat: -32.9230, lng: -60.7280 },
    'rosario': { lat: -32.9587, lng: -60.6930 },
    'rafaela': { lat: -31.2503, lng: -61.4867 },

    // Buenos Aires & CABA
    'buenos aires lawn tennis club': { lat: -34.5684, lng: -58.4239 },
    'baltc': { lat: -34.5684, lng: -58.4239 },
    'club ciudad de buenos aires': { lat: -34.5414, lng: -58.4592 },
    'club harrods gath & chaves': { lat: -34.5570, lng: -58.4480 },
    'tenis club argentino': { lat: -34.5630, lng: -58.4110 },
    'buenos aires': { lat: -34.6037, lng: -58.3816 },
    'caba': { lat: -34.6037, lng: -58.3816 },

    // Córdoba & other provinces
    'cordoba lawn tennis club': { lat: -31.4280, lng: -64.1750 },
    'cordoba': { lat: -31.4201, lng: -64.1888 },
};

// Default center baseline (Entre Ríos - Diamante / Paraná region as core hub)
export const DEFAULT_MAP_CENTER: Coordinates = { lat: -32.0664, lng: -60.6384 };

/**
 * Calculates straight-line distance in kilometers between two GPS points using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Formats a distance in kilometers to user-friendly string (e.g. "450 m" or "2.4 km")
 */
export function formatDistance(distanceKm: number | null | undefined): string {
    if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) return '';
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}

/**
 * Resolves coordinates for a tournament or institution
 */
export function getTournamentCoordinates(item: {
    id?: string;
    institution_id?: string;
    institutions?: {
        name?: string | null;
        city?: string | null;
        province?: string | null;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
    } | null;
    institution_name?: string | null;
    city?: string | null;
    province?: string | null;
}): Coordinates {
    // 1. Direct explicit coordinates if available
    if (item.institutions?.latitude && item.institutions?.longitude) {
        return { lat: Number(item.institutions.latitude), lng: Number(item.institutions.longitude) };
    }

    const instName = (item.institutions?.name || item.institution_name || '').toLowerCase().trim();
    const city = (item.institutions?.city || item.city || '').toLowerCase().trim();
    const province = (item.institutions?.province || item.province || '').toLowerCase().trim();
    const address = (item.institutions?.address || '').toLowerCase().trim();

    // 2. Check known tennis club dictionary by club name
    for (const [key, coords] of Object.entries(KNOWN_TENNIS_CLUBS)) {
        if (instName && (instName.includes(key) || key.includes(instName))) {
            return coords;
        }
    }

    // 3. Check known city / address / province
    for (const [key, coords] of Object.entries(KNOWN_TENNIS_CLUBS)) {
        if (city && (city === key || city.includes(key))) {
            return coords;
        }
        if (address && address.includes(key)) {
            return coords;
        }
    }

    // 4. Stable deterministic scatter based on ID or Name hash around core center
    let hash = 0;
    const seed = item.id || item.institution_id || instName || city || 'smash-tournament';
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const latOffset = ((Math.abs(hash % 1000) - 500) / 500) * 0.05;
    const lngOffset = ((Math.abs((hash >> 5) % 1000) - 500) / 500) * 0.07;

    return {
        lat: DEFAULT_MAP_CENTER.lat + latOffset,
        lng: DEFAULT_MAP_CENTER.lng + lngOffset,
    };
}

/**
 * Open external navigation apps with coordinates or venue query
 */
export function openDirections(coords: Coordinates, label?: string) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const query = label ? encodeURIComponent(label) : `${coords.lat},${coords.lng}`;

    if (isIOS) {
        window.open(`maps://maps.apple.com/?daddr=${coords.lat},${coords.lng}&q=${query}`, '_blank');
    } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=${query}`, '_blank');
    }
}

export function openWaze(coords: Coordinates) {
    window.open(`https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`, '_blank');
}
