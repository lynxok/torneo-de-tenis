import { UserRole } from '../types';

export interface PlayerImprovementItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagColor?: string;
  iconName: 'swords' | 'shopping-bag' | 'credit-card' | 'calendar' | 'trophy' | 'sparkles';
}

export interface PlayerRelease {
  id: string;
  version: string;
  title: string;
  subtitle: string;
  badge?: string;
  releaseDate: string; // YYYY-MM-DD
  validityDays: number;
  items: PlayerImprovementItem[];
}

export const PLAYER_RELEASES: PlayerRelease[] = [
  {
    id: 'release_player_2026_w37_v1_7_0',
    version: 'v1.7.0',
    title: '¡Nuevas Funciones para Jugadores!',
    subtitle: 'Partidos Abiertos con cupos, Tienda del Club y Pago Express en 1 clic',
    badge: 'Novedades de la App • v1.7.0',
    releaseDate: '2026-09-07',
    validityDays: 14,
    items: [
      {
        id: 'player_open_matches',
        title: 'Tablón de Partidos Abiertos (Matchmaking)',
        description: '¿Buscás rival para singles o te falta una persona para completar el dobles? Mirá los partidos con cupos disponibles (1/2 o 2/4), sumate al instante con 1 clic y coordiná por WhatsApp.',
        tag: '¡Nuevo! Comunidad',
        tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconName: 'swords'
      },
      {
        id: 'player_shop_buffet',
        title: 'Tienda Oficial & Buffet del Club',
        description: 'Comprá tubos de pelotas, overgrips, alquilá paletas/raquetas o pedí bebidas de cantina (Gatorade, agua, barritas) directamente desde tu celular con carrito de compras.',
        tag: 'Tienda & Cantina',
        tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        iconName: 'shopping-bag'
      },
      {
        id: 'player_express_checkout',
        title: 'Checkout Express Mercado Pago (0% Comisión)',
        description: 'Aboná tus pedidos de la tienda o el arancel de tus torneos de forma inmediata: tocás un botón, copiás el Alias oficial del club y se abre tu app de Mercado Pago para transferir sin comisiones extras.',
        tag: 'Pago en 1 Clic',
        tagColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        iconName: 'credit-card'
      },
      {
        id: 'player_court_bookings',
        title: 'Reserva Ágil de Canchas',
        description: 'Elegí el club, consultá los turnos disponibles en tiempo real y asegurá tu cancha de polvo de ladrillo o cemento tanto de día como con luz artificial.',
        tag: 'Canchas',
        tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        iconName: 'calendar'
      },
      {
        id: 'player_ranking_h2h',
        title: 'Ranking Oficial y Estadísticas H2H',
        description: 'Seguí tu evolución en el circuito, acumulá puntos de ascenso de categoría y compará tu historial frente a frente (Head to Head) contra tus rivales directos.',
        tag: 'Competición',
        tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        iconName: 'trophy'
      }
    ]
  }
];

export function isPlayerReleaseActive(release: PlayerRelease): boolean {
  if (!release || !release.releaseDate) return false;
  try {
    const releaseTime = new Date(release.releaseDate + 'T00:00:00').getTime();
    const nowTime = Date.now();
    const diffMs = nowTime - releaseTime;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= (release.validityDays || 14);
  } catch (e) {
    return false;
  }
}

export function getActivePlayerRelease(): PlayerRelease | null {
  const activeReleases = PLAYER_RELEASES.filter(r => isPlayerReleaseActive(r));
  return activeReleases.length > 0 ? activeReleases[0] : null;
}

export function hasSeenPlayerRelease(releaseId: string): boolean {
  if (typeof window === 'undefined') return false;
  const storageKey = `smash_player_imp_${releaseId}`;
  try {
    if (localStorage.getItem(storageKey) === 'seen') {
      return true;
    }
  } catch (e) {}

  try {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === storageKey && val === 'seen') {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

export function markPlayerReleaseAsSeen(releaseId: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = `smash_player_imp_${releaseId}`;
  try {
    localStorage.setItem(storageKey, 'seen');
  } catch (e) {}

  try {
    const maxAgeSeconds = 30 * 24 * 60 * 60;
    document.cookie = `${storageKey}=seen; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  } catch (e) {}
}
