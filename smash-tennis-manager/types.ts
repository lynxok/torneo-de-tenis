

export type UserRole = 'player' | 'admin' | 'superadmin' | 'coordinator' | 'professor';

export interface UserClubMembership {
  institution_id: string;
  institution_name?: string;
  member_number?: string;
  is_primary?: boolean;
  status?: 'active' | 'pending' | 'inactive';
  joined_date?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  free_tournaments_count: number;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  expires_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface TournamentSaga {
  id: string;
  name: string;
  institution_id?: string;
  created_by?: string;
  current_tier: 'challenger' | '250' | '500' | '1000' | 'masters';
  total_editions: number;
  last_edition_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  lastname?: string;
  role: UserRole;
  category?: string;
  gender?: string;
  birth_date?: string; // Format: YYYY-MM-DD
  institution_id?: string;
  institution?: string; // joined name
  phone?: string;
  dni?: string;
  is_approved?: boolean;
  is_member?: boolean;
  member_number?: string;
  member_status?: 'active' | 'pending' | 'inactive';
  memberships?: UserClubMembership[];
  matches_won?: number;
  tournaments_won?: number;
  profile_picture_url?: string; // New field for Drive Image
  show_whatsapp?: boolean; // Privacy setting: allow others to contact via WhatsApp

  // Organizer Benefits & Trial
  promo_code_used?: string;
  free_tournaments_remaining?: number;
  free_tournaments_disputed?: number;
  membership_type?: 'standard' | 'trial' | 'vip_time_limited' | 'vip_permanent';
  membership_expires_at?: string;
  is_membership_active?: boolean;
}

export interface SystemConfig {
    profile_banner_url?: string;
    google_drive_enabled: boolean;
    google_client_id: string;
    google_api_key: string;
    target_folder_id: string; // The folder ID where images will be stored
    service_account_email?: string; // Email to share the folder with
    welcome_message?: string; // New: Welcome message for new users
    junior_age_threshold?: number; // Age threshold to classify as junior (default: 16)

    // Smash Tour Tiering (Modelo A: Por Convocatoria y Sagas)
    tier_challenger_points?: number;
    tier_challenger_min_players?: number;
    tier_challenger_max_players?: number;
    tier_challenger_fee_pct?: number;

    tier_250_min_players?: number;
    tier_250_max_players?: number;
    tier_250_points?: number;
    tier_250_fee_pct?: number; // Tarifa bonificada por mérito (ej: 5%)
    tier_250_direct_fee_pct?: number; // Salto directo (ej: 6%)

    tier_500_min_players?: number;
    tier_500_max_players?: number;
    tier_500_points?: number;
    tier_500_fee_pct?: number; // Tarifa bonificada por mérito (ej: 5%)
    tier_500_direct_fee_pct?: number; // Salto directo (ej: 7%)

    tier_1000_min_players?: number;
    tier_1000_max_players?: number;
    tier_1000_points?: number;
    tier_1000_fee_pct?: number; // Tarifa bonificada por mérito (ej: 5%)
    tier_1000_direct_fee_pct?: number; // Salto directo (ej: 8%)

    tier_masters_min_players?: number;
    tier_masters_points?: number;
    tier_masters_fee_pct?: number; // Tarifa bonificada por mérito (ej: 5%)
    tier_masters_direct_fee_pct?: number; // Salto directo (ej: 10%)

    // Progression & Epic Cadence Rules
    saga_cooldown_days?: number; // Default 180 days
    disputed_min_matches?: number; // Default 2 matches

    // Platform Monetization Settings
    monetization_base_fee_fixed?: number; // Fee fijo por inscripto (opcional)
    platform_payout_alias?: string;       // Alias Mercado Pago / CVU de la app
    platform_payout_holder?: string;      // Titular de la cuenta
}

export interface TournamentTierInfo {
    tierKey: 'challenger' | '250' | '500' | '1000' | 'masters';
    label: string;
    badgeColor: string;
    textColor: string;
    borderColor: string;
    pointsWinner: number;
    feePercentage: number;
    directFeePercentage?: number;
    minPlayers: number;
    maxPlayers?: number;
}

export interface WeeklySchedule {
  day_number: number; // 0 (Sun) to 6 (Sat)
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export interface DateOverride {
  date: string; // YYYY-MM-DD
  is_open: boolean;
  open_time?: string;
  close_time?: string;
  reason?: string; // e.g. "Feriado", "Reformas"
}

export interface Institution {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  cover_url?: string; // New: For card background
  
  // Contact & Location
  address?: string;
  city: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  maps_url?: string;

  // Facilities
  courts_total?: number;
  courts_with_light?: number;
  courts_without_light?: number;
  courts_clay?: number;
  courts_hard?: number;
  courts_indoor?: number;
  
  // Amenities (Array of strings)
  amenities?: string[]; // e.g., 'parking', 'buffet', 'showers', 'wifi', 'shop'

  // Commercial & Configuration
  price_day?: number;
  price_night?: number;
  price_member_day?: number; // Special price for members
  price_member_night?: number; // Special night price for members
  
  allow_racket_rental?: boolean; // Toggle for racket rental
  price_racket?: number; // Rental price for rackets
  
  allow_ball_rental?: boolean; // Toggle for ball rental
  price_ball?: number;   // Rental price for balls
  
  // Time Configuration
  config_match_duration_3_sets?: number; // minutes
  config_match_duration_5_sets?: number; // minutes
  config_booking_min_duration?: number;  // minutes (Base slot duration)
  config_max_booking_slots?: number;     // Max consecutive slots (1-4)

  // Schedule Configuration (Legacy simple fields kept for fallback)
  schedule_open?: string;  
  schedule_close?: string; 
  schedule_night_start?: string; 

  // New Advanced Scheduling
  weekly_schedule?: WeeklySchedule[];
  date_overrides?: DateOverride[];

  payment_link?: string;
  mp_access_token?: string; // MercadoPago
  
  category_system?: 'numeric' | 'letters'; // Configuration for category nomenclature
  is_active?: boolean;

  // Club Membership & Free Trial (SaaS Benefits)
  is_membership_active?: boolean;
  membership_type?: 'none' | 'vip_permanent' | 'vip_time_limited';
  membership_expires_at?: string | null;
  free_tournaments_remaining?: number;
  free_tournaments_disputed?: number;
}

// New Interface for Sub-Competitions (Merged Categories)
export interface TournamentCompetition {
    id: string;
    name: string; // e.g. "Primera + Segunda" or "Categoría A"
    allowed_categories: string[]; // e.g. ['1ra', '2da']
    gender: 'M' | 'F' | 'X';
    type: 'singles' | 'doubles';
    min_participants?: number;
    max_participants?: number;
    custom_price?: number; // New: Price override for this specific group
}

export interface Tournament {
  id: string;
  name: string;
  
  // Legacy fields kept for backward compatibility or default display
  type: 'singles' | 'doubles';
  gender?: 'M' | 'F' | 'X' | 'Mixto' | 'Caballeros' | 'Damas'; 
  category: string; 

  // NEW: Multi-competition support
  competitions?: TournamentCompetition[]; 

  start_date: string;
  duration?: string;
  status: 'draft' | 'active' | 'finished';
  institution_id?: string;
  institutions?: { name: string };
  registration_price?: number;
  payment_link?: string;
  rules?: any;
  groups?: TournamentGroup[];
  bracket?: any[];
  champion_name?: string;
  created_by?: string;
  image_url?: string; 
  
  // Registration Control
  registration_closed?: boolean;
  registration_deadline?: string; // YYYY-MM-DD

  // Superadmin Fee Waiver
  is_commission_waived?: boolean;

  // Superadmin Ranking Control
  counts_for_ranking?: boolean;

  // ATP Point Defense Logic
  previous_edition_id?: string; // ID of the tournament from last year

  // Saga & Multi-Edition Tracking
  saga_id?: string;
  sagas?: TournamentSaga;
  edition_number?: number;
  tier_applied?: 'challenger' | '250' | '500' | '1000' | 'masters';
  is_direct_jump?: boolean;
  commission_rate_applied?: number;
  is_trial_free?: boolean;
  is_disputed?: boolean;
}

export interface TournamentGroup {
  id: number | string;
  players: TournamentPlayer[];
  matches: Match[];
}

export interface TournamentPlayer {
  id: string; // Enrollment ID
  player_id?: string; // User ID
  name: string;
  player_name?: string;
  category?: string;
  points?: number;
  matchesPlayed?: number;
  matchesWon?: number;
  setsWon?: number;
  setsLost?: number;
  gamesWon?: number;
  gamesLost?: number;
  diffSets?: number;
  diffGames?: number;
  payment_status?: string;
  fee_amount?: number; // New: Records the price agreed upon enrollment
  isComplete?: boolean; // For doubles
  members?: string[]; // For doubles
  partner_id?: string; // For doubles
  partner_name?: string; // For doubles
  is_doubles_pair?: boolean;
  availability_notes?: string;
  time_restrictions?: string;
}

export interface Match {
  id: string;
  tournament_id?: string;
  player1_id?: string;
  player2_id?: string;
  player1_name?: string;
  player2_name?: string;
  player1_partner_id?: string;
  player2_partner_id?: string;
  player1_partner_name?: string;
  player2_partner_name?: string;
  team1_name?: string;
  team2_name?: string;
  winner_id?: string;
  winner_name?: string;
  winner_partner_id?: string;
  score?: any; // Array of {p1: number, p2: number} or {set1: string, set2: string, set3?: string}
  round?: string;
  group_number?: number;
  scheduling_status?: 'proposed' | 'confirmed' | 'finished' | null;
  scheduled_at?: string;
  court_name?: string;
  proposal_data?: any;
  court_slot_id?: string;
  is_played?: boolean;
  
  // Score Verification & 24h Auto-confirmation
  score_status?: 'pending_confirmation' | 'confirmed' | 'disputed';
  score_submitted_by?: string;
  score_submitted_by_name?: string;
  score_submitted_at?: string;
  score_dispute_reason?: string;
  score_confirmed_at?: string;

  // UI helpers
  p1?: TournamentPlayer;
  p2?: TournamentPlayer;
  winner?: TournamentPlayer;
  tournaments?: { name: string; institution_id?: string; institutions?: { name: string } };
}

export interface HeadToHeadStats {
  player1: { id: string; name: string; lastname?: string; category?: string; avatar_url?: string };
  player2: { id: string; name: string; lastname?: string; category?: string; avatar_url?: string };
  totalMatches: number;
  player1Wins: number;
  player2Wins: number;
  player1SetsWon: number;
  player2SetsWon: number;
  player1GamesWon: number;
  player2GamesWon: number;
  lastWinnerId?: string;
  streakCount?: number;
  streakWinnerName?: string;
  matches: Array<{
    id: string;
    date: string;
    tournament_name?: string;
    round?: string;
    score: any;
    winner_id?: string;
    winner_name?: string;
  }>;
}

export interface MatchmakingPost {
  id: string;
  user_id: string;
  user_name: string;
  user_lastname?: string;
  user_phone?: string;
  user_avatar?: string;
  user_category?: string;
  type: 'singles' | 'doubles';
  category: string;
  institution_id?: string;
  institution_name?: string;
  date?: string;
  time_slot?: string;
  has_court_booked?: boolean;
  court_name?: string;
  description?: string;
  created_at: string;
  status: 'open' | 'matched' | 'cancelled';
  matched_with_user_id?: string;
  matched_with_name?: string;

  // Doubles Partner Specific Fields
  preferred_side?: 'drive' | 'backhand' | 'both';
  dominant_hand?: 'right' | 'left';
  play_style?: 'competitive' | 'recreational' | 'active';
  target_tournament_id?: string;
  target_tournament_name?: string;
}

export interface BookingParticipant {
  user_id?: string;
  name: string;
  lastname?: string;
  is_registered?: boolean;
  avatar_url?: string;
  dni?: string;
  phone?: string;
}

export interface Booking {
  id: string;
  user_id: string;
  institution_id: string;
  date: string;
  start_time: string;
  end_time: string;
  court_name: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'blocked';
  booking_type?: 'guest' | 'tournament' | 'maintenance' | 'class' | 'recurring';
  match_type?: 'singles' | 'doubles';
  counts_for_stats?: boolean;
  title?: string; // "Clase", "Torneo: Juan vs Pedro", "Turno Fijo"
  description?: string; // Optional details
  total_price: number;
  extras?: {
      rackets?: number;
      balls?: boolean;
      night_light?: boolean;
      teacher?: boolean;
      match_type?: 'singles' | 'doubles';
      counts_for_stats?: boolean;
      participants?: BookingParticipant[];
  };
  payment_status?: string;
  institutions?: { name: string };
  participants?: BookingParticipant[];
  user_name?: string;
  profiles?: { id: string; name: string; lastname?: string; avatar_url?: string; profile_picture_url?: string };
  deleted_by_user?: boolean;
  is_recurring?: boolean;
  recurring_weeks?: number;
  recurrence_group_id?: string;
  cancellation_reason?: 'user' | 'weather' | 'maintenance' | 'admin';
  
  // Tournament specific
  match_score?: string; // e.g. "6-4 6-2" if played
  match_id?: string;
}

export interface WaitlistEntry {
  id: string;
  court_name: string;
  date: string;
  start_time: string;
  user_id: string;
  user_name: string;
  user_phone?: string;
  institution_id: string;
  status: 'waiting' | 'notified' | 'claimed' | 'cancelled';
  created_at: string;
}

export interface FrequentOpponent {
  id: string;
  name: string;
  matches: number;
  wins: number;
  losses: number;
}

export interface PlayerStatsSummary {
  totalMatches: number;
  wonMatches: number;
  lostMatches: number;
  winRate: number;
  tieBreaksPlayed: number;
  tieBreaksWon: number;
  tieBreakWinRate: number;
  threeSetsPlayed: number;
  threeSetsWon: number;
  currentStreak: number;
  bestStreak: number;
  frequentOpponents: FrequentOpponent[];
  rankingHistory: Array<{ date: string; points: number; rank: number; tournament_name?: string }>;
}

export interface CourtSlot {
  id: string;
  institution_id: string;
  court_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id?: string; // Optional if broadcast
  type: 'direct' | 'broadcast_admins' | 'broadcast_institution';
  institution_id?: string; // For filtering broadcasts
  subject: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Transaction {
    id: string;
    institution_id: string;
    date: string; // ISO
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: 'booking' | 'tournament_fee' | 'product_sale' | 'maintenance' | 'other';
    status: 'completed' | 'pending';
    payment_method: 'cash' | 'mercadopago' | 'transfer';
    user_name?: string;
}

// TUTORIAL TYPES
export interface TutorialStep {
    targetId: string; // ID of the DOM element
    title: string;
    content: string;
    view?: string; // View to navigate to before showing this step
}

export interface TutorialDef {
    id: string;
    title: string;
    description: string;
    icon: any; // Lucide Icon
    role: UserRole[]; // Who can see this tutorial
    steps: TutorialStep[];
}

// RANKING HISTORY TYPE (New)
export interface RankingPointRecord {
    id: string;
    tournament_name: string;
    points: number;
    date_obtained: string; // ISO Date
    category: string;
    // If the tournament has a new edition open for registration
    next_edition_id?: string; 
    next_edition_name?: string;
}

// STORIES TYPES
export type StoryLayerType = 'text' | 'sticker' | 'mention' | 'location' | 'emoji';

export interface StoryLayerBase {
    id: string;
    type: StoryLayerType;
    x: number; // percentage (0 - 100)
    y: number; // percentage (0 - 100)
    scale?: number;
    rotation?: number;
}

export interface StoryTextLayer extends StoryLayerBase {
    type: 'text';
    text: string;
    color: string;
    bgColor?: string;
    fontSize?: number;
}

export interface StoryEmojiLayer extends StoryLayerBase {
    type: 'emoji';
    emoji: string;
    size?: number;
}

export interface StoryStickerLayer extends StoryLayerBase {
    type: 'sticker';
    stickerId: string;
    stickerUrl: string;
    label?: string;
}

export interface StoryMentionLayer extends StoryLayerBase {
    type: 'mention';
    userId: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
}

export interface StoryLocationLayer extends StoryLayerBase {
    type: 'location';
    locationName: string;
    institutionId?: string;
}

export type StoryLayer = StoryTextLayer | StoryEmojiLayer | StoryStickerLayer | StoryMentionLayer | StoryLocationLayer;

export interface Story {
    id: string;
    user_id: string;
    media_url: string;
    storage_path?: string;
    layers: StoryLayer[];
    created_at: string;
    expires_at: string;
    author?: {
        name: string;
        lastname?: string;
        profile_picture_url?: string;
        role: UserRole;
    };
}

// REPORTS & HEATMAP TYPES
export interface HeatmapDayItem {
    day: string;
    short: string;
    day_number: number;
    count: number;
    revenue: number;
    intensity: number; // 0 to 100
}

export interface HeatmapHourItem {
    hour: string;
    count: number;
    intensity: number; // 0 to 100
}

export interface HeatmapMatrixCell {
    day: string;
    day_short: string;
    day_number: number;
    hour: string;
    count: number;
    intensity: number; // 0 to 100
}

export interface ChartDataPoint {
    day: string;
    shortDay?: string;
    income: number;
    expense: number;
}

export interface ReportStats {
    total_income: number;
    total_expenses: number;
    net_income: number;
    profit_margin: number;
    income_bookings: number;
    income_tournaments: number;
    income_shop: number;
    pending_income: number;
    occupancy_rate: number;
    revenue_sources: { name: string; value: number; color: string }[];
    payment_methods: { name: string; value: number; color: string }[];
    peak_hours: { hour: string; count: number; intensity: number }[];
    days_heatmap: HeatmapDayItem[];
    hours_heatmap: HeatmapHourItem[];
    matrix_heatmap: HeatmapMatrixCell[][];
    chart_data: ChartDataPoint[];
    top_player?: { name: string; matches_won: number };
    top_bookers?: any[];
}

// ACHIEVEMENTS & GAMIFICATION TYPES
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type AchievementCategory = 'victory' | 'tournament' | 'streak' | 'special' | 'community';

export interface PlayerAchievement {
    id: string;
    title: string;
    description: string;
    category: AchievementCategory;
    tier: AchievementTier;
    icon: string; // Lucide icon name or emoji identifier
    unlocked: boolean;
    progress: {
        current: number;
        max: number;
        label: string;
    };
    unlockedAt?: string;
    badgeColor?: string;
    rewardDescription?: string;
}

// ==========================================
// COACH / PROFESSOR SUITE TYPES
// ==========================================

export interface CoachStudentPack {
    studentId: string;
    totalClasses: number;
    usedClasses: number;
    price: number;
    paymentStatus: 'paid' | 'pending';
    notes?: string;
    updatedAt?: string;
}

export interface CoachStudentGoal {
    studentId: string;
    technicalGoals: string;
    strengths?: string;
    areasToImprove?: string;
    commitmentLevel?: number; // 1 to 5
    updatedAt?: string;
}

export interface CoachGroup {
    id: string;
    name: string;
    description?: string;
    category?: string;
    scheduleDays: string[];
    scheduleTime: string;
    courtName?: string;
    studentIds: string[];
    maxStudents?: number;
    color?: string;
    createdAt?: string;
}

export interface CoachAttendanceRecord {
    id: string;
    date: string;
    groupId?: string;
    groupName?: string;
    presentStudentIds: string[];
    topic: string;
    notes?: string;
}

export interface CoachDrill {
    id: string;
    title: string;
    level: 'Iniciación' | 'Intermedio' | 'Avanzado' | 'Todos';
    category: 'Fondo de Cancha' | 'Volea y Red' | 'Servicio y Devolución' | 'Dobles' | 'Táctico y Presión';
    description: string;
    durationMin: number;
    playersNeeded: string;
    objective: string;
}