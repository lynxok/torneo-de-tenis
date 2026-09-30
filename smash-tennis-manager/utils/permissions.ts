import { UserRole } from '../types';

export type AppPermission =
  | 'view_dashboard'
  | 'view_tournaments'
  | 'create_tournament'
  | 'manage_tournament'
  | 'view_rankings'
  | 'view_players'
  | 'view_bookings'
  | 'create_booking'
  | 'block_court'
  | 'view_shop'
  | 'manage_shop'
  | 'view_coach_dashboard'
  | 'manage_coach_students'
  | 'view_messages'
  | 'view_finances'
  | 'view_pricing'
  | 'manage_pricing'
  | 'view_admin_users'
  | 'manage_admin_users'
  | 'view_admin_institutions'
  | 'manage_admin_institutions'
  | 'view_admin_settings'
  | 'view_tv';

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  player: [
    'view_dashboard',
    'view_tournaments',
    'view_rankings',
    'view_players',
    'view_bookings',
    'create_booking',
    'view_shop',
    'view_messages',
    'view_tv'
  ],
  professor: [
    'view_dashboard',
    'view_tournaments',
    'view_rankings',
    'view_players',
    'view_bookings',
    'create_booking',
    'view_shop',
    'view_coach_dashboard',
    'manage_coach_students',
    'view_messages',
    'view_tv'
  ],
  coordinator: [
    'view_dashboard',
    'view_tournaments',
    'manage_tournament',
    'view_rankings',
    'view_players',
    'view_bookings',
    'create_booking',
    'view_shop',
    'view_coach_dashboard',
    'view_messages',
    'view_tv'
  ],
  admin: [
    'view_dashboard',
    'view_tournaments',
    'create_tournament',
    'manage_tournament',
    'view_rankings',
    'view_players',
    'view_bookings',
    'create_booking',
    'block_court',
    'view_shop',
    'manage_shop',
    'view_coach_dashboard',
    'manage_coach_students',
    'view_messages',
    'view_finances',
    'view_pricing',
    'manage_pricing',
    'view_admin_users',
    'manage_admin_users',
    'view_admin_institutions',
    'manage_admin_institutions',
    'view_tv'
  ],
  superadmin: [
    'view_dashboard',
    'view_tournaments',
    'create_tournament',
    'manage_tournament',
    'view_rankings',
    'view_players',
    'view_bookings',
    'create_booking',
    'block_court',
    'view_shop',
    'manage_shop',
    'view_coach_dashboard',
    'manage_coach_students',
    'view_messages',
    'view_finances',
    'view_pricing',
    'manage_pricing',
    'view_admin_users',
    'manage_admin_users',
    'view_admin_institutions',
    'manage_admin_institutions',
    'view_admin_settings',
    'view_tv'
  ]
};

export function hasPermission(role: UserRole | undefined, permission: AppPermission): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes(permission);
}

export function canAccessView(role: UserRole | undefined, viewName: string): boolean {
  if (!role) return false;
  if (role === 'superadmin') return true;

  switch (viewName) {
    case 'dashboard':
      return hasPermission(role, 'view_dashboard');
    case 'tournaments':
    case 'tournaments-map':
    case 'tournament-detail':
      return hasPermission(role, 'view_tournaments');
    case 'rankings':
      return hasPermission(role, 'view_rankings');
    case 'players':
    case 'open-matches':
      return hasPermission(role, 'view_players');
    case 'bookings':
      return hasPermission(role, 'view_bookings');
    case 'shop':
      return hasPermission(role, 'view_shop');
    case 'messages':
      return hasPermission(role, 'view_messages');
    case 'reports':
      return hasPermission(role, 'view_finances');
    case 'coach-dashboard':
    case 'classes':
      return hasPermission(role, 'view_coach_dashboard');
    case 'pricing-commissions':
      return hasPermission(role, 'view_pricing');
    case 'admin-users':
      return hasPermission(role, 'view_admin_users');
    case 'admin-institutions':
      return hasPermission(role, 'view_admin_institutions');
    case 'admin-settings':
      return hasPermission(role, 'view_admin_settings');
    case 'tv':
    case 'broadcast':
      return hasPermission(role, 'view_tv');
    case 'profile':
    case 'tutorials':
    case 'landing':
    case 'inicio':
      return true;
    default:
      return false;
  }
}
