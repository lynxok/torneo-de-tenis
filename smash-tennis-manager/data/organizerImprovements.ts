import { UserRole } from '../types';

export interface ImprovementItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagColor?: string;
  iconName: 'trophy' | 'layers' | 'check-circle' | 'printer' | 'image' | 'sparkles' | 'swords' | 'settings' | 'shield' | 'shopping-bag' | 'credit-card' | 'wallet';
}

export interface OrganizerRelease {
  id: string;
  version: string;
  title: string;
  subtitle: string;
  badge?: string;
  releaseDate: string; // Formato YYYY-MM-DD
  validityDays: number; // Cantidad de días que permanecerá activa (5 a 7 días)
  targetRoles: UserRole[];
  items: ImprovementItem[];
}

export const ORGANIZER_RELEASES: OrganizerRelease[] = [
  {
    id: 'release_2026_w37_v1_7_0',
    version: 'v1.7.0',
    title: 'Novedades para Organizadores & Clubes',
    subtitle: 'Tienda Oficial Pro-Shop, Checkout Express 0% comisión y Tablón de Partidos Abiertos',
    badge: 'Nueva Versión v1.7.0',
    releaseDate: '2026-09-07',
    validityDays: 14,
    targetRoles: ['admin', 'superadmin', 'professor', 'coordinator'],
    items: [
      {
        id: 'feat_pro_shop_buffet',
        title: 'Tienda Oficial & Buffet del Club (Pro-Shop)',
        description: 'Monetizá los insumos de tu club: catálogo para vender tubos de pelotas, overgrips, alquiler de paletas/raquetas y refrigerios de buffet (Gatorade, agua, barritas) con carrito integrado.',
        tag: 'Servicios del Club',
        tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconName: 'shopping-bag'
      },
      {
        id: 'feat_checkout_express_zero_fee',
        title: 'Checkout Express Mercado Pago (0% Comisión)',
        description: 'Recibí el 100% neto del dinero al instante. Los jugadores transfieren directamente a tu Alias o CVU de Mercado Pago / banco sin intermediarios ni retenciones del 4% al 7%.',
        tag: '0% Comisión',
        tagColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        iconName: 'credit-card'
      },
      {
        id: 'feat_club_alias_config',
        title: 'Configuración de Alias / CVU por Cada Club',
        description: 'Desde Administración > Instituciones tenés una pestaña exclusiva para registrar y validar el Alias, CVU y Titular de cuenta bancaria o Mercado Pago de cada sede.',
        tag: 'Administración',
        tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        iconName: 'settings'
      },
      {
        id: 'feat_tournament_mp_enrollment',
        title: 'Cobro de Aranceles en Inscripción de Torneos',
        description: 'Al inscribirse a torneos con arancel, el jugador tiene acceso directo en 1 clic para copiar tu Alias y abrir Mercado Pago para abonar antes de confirmar su lugar.',
        tag: 'Torneos & Finanzas',
        tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        iconName: 'trophy'
      },
      {
        id: 'feat_open_matches_matchmaking',
        title: 'Tablón de Partidos Abiertos (Matchmaking)',
        description: 'Aumentá la ocupación de canchas con partidos de Singles (2 cupos) y Dobles (4 cupos). Los jugadores ven los lugares libres, se unen con 1 clic y coordinan por WhatsApp.',
        tag: 'Comunidad & Canchas',
        tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        iconName: 'swords'
      }
    ]
  },
  {
    id: 'release_2026_w36_v1_6_5',
    version: 'v1.6.5',
    title: 'Novedades de la Semana para Organizadores',
    subtitle: 'Nuevas modalidades de torneo, garantía de partidos y cuadro inteligente con BYEs',
    badge: 'Semana 1 al 7 de Septiembre',
    releaseDate: '2026-09-01',
    validityDays: 7,
    targetRoles: ['admin', 'superadmin', 'professor', 'coordinator'],
    items: [
      {
        id: 'feat_tabla_general_byes',
        title: 'Modalidad Tabla General + BYEs',
        description: 'Todos los jugadores disputan la fase de zonas y clasifican al cuadro final por mérito en una tabla unificada. El sistema asigna pases directos (BYE) a Semifinales o Cuartos a los mejores clasificados.',
        tag: 'Modalidad de Torneo',
        tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        iconName: 'trophy'
      },
      {
        id: 'feat_guaranteed_matches',
        title: 'Garantía de Partidos Asegurados',
        description: 'Al crear el torneo podés fijar un mínimo de 2, 3 o 4 partidos garantizados por participante, asegurando una gran experiencia para todos los inscriptos.',
        tag: 'Inscripción & Zonas',
        tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconName: 'layers'
      },
      {
        id: 'feat_unified_standings_live',
        title: 'Tabla Única de Clasificación en Vivo',
        description: 'Visualizá la clasificación del 1° al N° con sumatoria de puntos, partidos ganados, diferencia de sets, games y la fase exacta de destino en los playoffs.',
        tag: 'Mesa de Control',
        tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        iconName: 'check-circle'
      },
      {
        id: 'feat_anti_collision',
        title: 'Cruces Inteligentes Anti-Colisión',
        description: 'El algoritmo separa en mitades opuestas del cuadro a rivales que hayan compartido el mismo grupo para que no vuelvan a cruzarse en el debut de playoffs.',
        tag: 'Algoritmo de Llaves',
        tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        iconName: 'swords'
      },
      {
        id: 'feat_print_and_social',
        title: 'Planilla Oficial A4 y Placas para Redes',
        description: 'Imprimí la planilla completa para la mesa de control en hoja A4 y generá placas gráficas automáticas con los resultados para Instagram Stories, Feed y WhatsApp.',
        tag: 'Difusión y Gestión',
        tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        iconName: 'printer'
      }
    ]
  }
];

// Helper: Comprobar si una entrega está activa por fecha (dentro de los N días de vigencia)
export function isReleaseActive(release: OrganizerRelease): boolean {
  if (!release || !release.releaseDate) return false;
  try {
    const releaseTime = new Date(release.releaseDate + 'T00:00:00').getTime();
    const nowTime = Date.now();
    const diffMs = nowTime - releaseTime;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= (release.validityDays || 7);
  } catch (e) {
    return false;
  }
}

// Helper: Obtener la última novedad activa para un rol de usuario
export function getActiveReleaseForRole(role?: UserRole): OrganizerRelease | null {
  if (!role) return null;
  const activeReleases = ORGANIZER_RELEASES.filter(r => 
    r.targetRoles.includes(role) && isReleaseActive(r)
  );
  return activeReleases.length > 0 ? activeReleases[0] : null;
}

// Helper: Comprobar si el usuario ya vio la novedad (localStorage + Cookie)
export function hasSeenRelease(releaseId: string): boolean {
  if (typeof window === 'undefined') return false;
  const storageKey = `smash_org_imp_${releaseId}`;
  
  // 1. Chequeo en localStorage
  try {
    if (localStorage.getItem(storageKey) === 'seen') {
      return true;
    }
  } catch (e) {}

  // 2. Chequeo en Cookies
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

// Helper: Marcar la novedad como vista en localStorage y Cookies
export function markReleaseAsSeen(releaseId: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = `smash_org_imp_${releaseId}`;

  // 1. Guardar en localStorage
  try {
    localStorage.setItem(storageKey, 'seen');
  } catch (e) {}

  // 2. Guardar en Cookies (válida por 30 días)
  try {
    const maxAgeSeconds = 30 * 24 * 60 * 60;
    document.cookie = `${storageKey}=seen; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  } catch (e) {}
}
