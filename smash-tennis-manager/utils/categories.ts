import { Institution } from '../types';

export type CategorySystem = 'numeric' | 'letters';

export const NUMERIC_CATEGORIES = [
    '1ra',
    '2da',
    '3ra',
    '4ta',
    '5ta',
    '6ta',
    '7ma',
    'Open'
] as const;

export const LETTER_CATEGORIES = [
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2',
    'D1',
    'D2',
    'Open'
] as const;

export const SIMPLE_LETTER_CATEGORIES = [
    'A',
    'B',
    'C',
    'Open'
] as const;

export interface CategoryEquivalence {
    rank: number;
    numeric: string;
    letters: string[];
    label: string;
}

export const CATEGORY_EQUIVALENCES: CategoryEquivalence[] = [
    { rank: 1, numeric: '1ra', letters: ['A1', 'A'], label: '1ra División / A1' },
    { rank: 2, numeric: '2da', letters: ['A2'], label: '2da División / A2' },
    { rank: 3, numeric: '3ra', letters: ['B1', 'B'], label: '3ra División / B1' },
    { rank: 4, numeric: '4ta', letters: ['B2'], label: '4ta División / B2' },
    { rank: 5, numeric: '5ta', letters: ['C1', 'C'], label: '5ta División / C1' },
    { rank: 6, numeric: '6ta', letters: ['C2'], label: '6ta División / C2' },
    { rank: 7, numeric: '7ma', letters: ['D1', 'D2', 'D'], label: '7ma División / D' },
    { rank: 99, numeric: 'Open', letters: ['Open', 'OPEN'], label: 'Categoría Abierta (Open)' }
];

/**
 * Obtiene el rango numérico de una categoría para comparaciones y ordenamiento (menor número = mayor nivel)
 */
export function getCategoryRank(cat: string | null | undefined): number {
    if (!cat) return 99;
    const normalized = cat.trim();

    // Buscar en la tabla de equivalencias
    for (const eq of CATEGORY_EQUIVALENCES) {
        if (eq.numeric.toLowerCase() === normalized.toLowerCase()) {
            return eq.rank;
        }
        if (eq.letters.some(l => l.toLowerCase() === normalized.toLowerCase())) {
            return eq.rank;
        }
    }

    // Casos especiales directos
    const directMap: Record<string, number> = {
        '1ra': 1, 'primera': 1, '1': 1, 'a1': 1, 'a': 1,
        '2da': 2, 'segunda': 2, '2': 2, 'a2': 2,
        '3ra': 3, 'tercera': 3, '3': 3, 'b1': 3, 'b': 3,
        '4ta': 4, 'cuarta': 4, '4': 4, 'b2': 4,
        '5ta': 5, 'quinta': 5, '5': 5, 'c1': 5, 'c': 5,
        '6ta': 6, 'sexta': 6, '6': 6, 'c2': 6,
        '7ma': 7, 'septima': 7, '7': 7, 'd1': 7, 'd2': 7, 'd': 7,
        'open': 99
    };

    return directMap[normalized.toLowerCase()] ?? 99;
}

/**
 * Obtiene la categoría equivalente en el sistema destino
 */
export function getEquivalentCategory(cat: string, targetSystem: CategorySystem): string {
    const rank = getCategoryRank(cat);
    const item = CATEGORY_EQUIVALENCES.find(eq => eq.rank === rank);
    if (!item) return cat;

    if (targetSystem === 'numeric') {
        return item.numeric;
    } else {
        return item.letters[0] || item.numeric;
    }
}

/**
 * Obtiene el listado de categorías a mostrar según la configuración de la institución
 */
export function getCategoriesForInstitution(institution?: Partial<Institution> | null): string[] {
    const system = institution?.category_system || 'numeric';
    if (system === 'letters') {
        return [...LETTER_CATEGORIES];
    }
    return [...NUMERIC_CATEGORIES];
}

/**
 * Todas las categorías posibles para selectores globales / superadmin
 */
export const ALL_CATEGORIES = [
    '1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma',
    'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2',
    'Open'
];
