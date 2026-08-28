
import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';
import { UserProfile, UserRole } from './types';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { TUTORIALS, TutorialsPage } from './pages/TutorialsPage';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ToastProvider } from './components/ui/Toast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { VersionUpdatePrompt } from './components/VersionUpdatePrompt';
import { soundEffects } from './services/soundEffects';
import { Menu, ShieldAlert, User, Shield, Loader2, GraduationCap } from 'lucide-react';

// Resilient Code-Splitting with auto-retry on new version deployments
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const retryKey = `smash_retry_${name}`;
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem(retryKey);
    try {
      const component = await factory();
      window.sessionStorage.removeItem(retryKey);
      return component;
    } catch (error: any) {
      console.warn(`[Vite Chunk Retry] Chunk loading failed for ${name}. Reloading for latest build...`, error);
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem(retryKey, 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const Dashboard = lazyRetry(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })), 'Dashboard');
const Tournaments = lazyRetry(() => import('./pages/Tournaments').then(m => ({ default: m.Tournaments })), 'Tournaments');
const TournamentDetails = lazyRetry(() => import('./pages/TournamentDetails').then(m => ({ default: m.TournamentDetails })), 'TournamentDetails');
const Profile = lazyRetry(() => import('./pages/Profile').then(m => ({ default: m.Profile })), 'Profile');
const Rankings = lazyRetry(() => import('./pages/Rankings').then(m => ({ default: m.Rankings })), 'Rankings');
const Players = lazyRetry(() => import('./pages/Players').then(m => ({ default: m.Players })), 'Players');
const Bookings = lazyRetry(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })), 'Bookings');
const Messages = lazyRetry(() => import('./pages/Messages').then(m => ({ default: m.Messages })), 'Messages');
const Reports = lazyRetry(() => import('./pages/Reports').then(m => ({ default: m.Reports })), 'Reports');
const AdminUsers = lazyRetry(() => import('./pages/AdminUsers').then(m => ({ default: m.AdminUsers })), 'AdminUsers');
const AdminInstitutions = lazyRetry(() => import('./pages/AdminInstitutions').then(m => ({ default: m.AdminInstitutions })), 'AdminInstitutions');
const AdminSettings = lazyRetry(() => import('./pages/AdminSettings').then(m => ({ default: m.AdminSettings })), 'AdminSettings');
const PricingAndCommissions = lazyRetry(() => import('./pages/PricingAndCommissions').then(m => ({ default: m.PricingAndCommissions })), 'PricingAndCommissions');
const LandingPage = lazyRetry(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })), 'LandingPage');
const CoachDashboard = lazyRetry(() => import('./pages/CoachDashboard').then(m => ({ default: m.CoachDashboard })), 'CoachDashboard');

export const VALID_VIEWS = [
  'dashboard',
  'tournaments',
  'tournaments-map',
  'tournament-detail',
  'profile',
  'rankings',
  'players',
  'bookings',
  'messages',
  'reports',
  'coach-dashboard',
  'classes',
  'pricing-commissions',
  'admin-users',
  'admin-institutions',
  'admin-settings',
  'tutorials',
  'landing',
  'inicio'
];

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      if (pathname.includes('/inicio') || pathname.endsWith('/inicio') || params.get('view') === 'inicio' || params.get('view') === 'landing') {
        return 'landing';
      }
    } catch (e) {}
    return 'dashboard';
  });
  const [navData, setNavData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // New State for Messages

  // Unauthenticated Navigation State (Landing vs Auth form)
  const [unauthView, setUnauthView] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'player' | 'admin'>('player');

  // Super Admin Debug State
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);

  // --- TUTORIAL STATE ---
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  // DERIVED STATE: Effective User (Real + Simulation)
  // Defined here so it can be used in effects before early returns
  const effectiveUser = userProfile ? {
    ...userProfile,
    role: simulatedRole || userProfile.role
  } : null;

  const fetchingProfileUserIdRef = useRef<string | null>(null);
  const fetchingMessagesRef = useRef<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        checkUrlRedirects();
      } else {
        checkUnauthUrlRedirects();
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        checkUrlRedirects();
      } else {
        setUserProfile(null);
        setLoading(false);
        setSimulatedRole(null);
        setHasSelectedRole(false);
        setUnreadCount(0);
        fetchingProfileUserIdRef.current = null;
        checkUnauthUrlRedirects();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUnauthUrlRedirects = () => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname.toLowerCase();
    const modeParam = params.get('mode');
    const roleParam = params.get('role');
    const clubParam = params.get('club') || params.get('c');
    const viewParam = params.get('view');

    const isExplicitInicio = pathname.includes('/inicio') || pathname.endsWith('/inicio') || viewParam === 'inicio' || viewParam === 'landing';

    if (isExplicitInicio) {
      setUnauthView('landing');
      setActiveView('landing');
      return;
    }

    if (modeParam === 'login' || modeParam === 'register' || clubParam || viewParam === 'auth' || viewParam === 'login' || viewParam === 'register') {
      setUnauthView('auth');
      if (modeParam === 'register' || viewParam === 'register') setAuthMode('register');
      if (modeParam === 'login' || viewParam === 'login') setAuthMode('login');
      if (roleParam === 'admin' || roleParam === 'player') setAuthRole(roleParam as any);
    } else {
      setUnauthView('landing');
      setActiveView('landing');
    }
  };

  const checkUrlRedirects = () => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname.toLowerCase();
    const tournamentId = params.get('tournament') || params.get('t');
    const clubId = params.get('club') || params.get('institution') || params.get('c');
    const viewParam = params.get('view');

    const isExplicitInicio = pathname.includes('/inicio') || pathname.endsWith('/inicio') || viewParam === 'inicio' || viewParam === 'landing';

    if (isExplicitInicio) {
      setActiveView('landing');
    } else if (tournamentId) {
      setActiveView('tournament-detail');
      setNavData(tournamentId);
    } else if (clubId) {
      setActiveView('bookings');
      setNavData({ clubId });
    } else if (viewParam === 'map') {
      setActiveView('tournaments');
      setNavData({ view: 'map' });
    } else if (viewParam && VALID_VIEWS.includes(viewParam)) {
      setActiveView(viewParam);
    } else {
      setActiveView(prev => VALID_VIEWS.includes(prev) ? prev : 'dashboard');
    }
  };

  // Sync Badge Count with Role Changes (Simulation)
  useEffect(() => {
    if (effectiveUser) {
      fetchUnreadMessages(effectiveUser);
    }
  }, [userProfile?.id, userProfile?.role, simulatedRole]);

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileUserIdRef.current === userId) return;
    fetchingProfileUserIdRef.current = userId;

    try {
      const profile = await api.auth.getUserProfile(userId);
      setUserProfile(profile);
    } catch (e) {
      console.error(e);
    } finally {
      fetchingProfileUserIdRef.current = null;
      setLoading(false);
    }
  };

  const fetchUnreadMessages = async (profile: UserProfile) => {
    if (fetchingMessagesRef.current) return;
    fetchingMessagesRef.current = true;
    try {
      const msgs = await api.messages.getInbox(profile);
      const unread = msgs.filter(m => !m.is_read).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Error fetching unread count", e);
    } finally {
      fetchingMessagesRef.current = false;
    }
  };

  const handleLogout = async () => {
    await api.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setActiveView('landing');
    setUnauthView('landing');
    setSimulatedRole(null);
    setHasSelectedRole(false);
    setUnreadCount(0);
    window.history.pushState({}, '', '/inicio');
  };

  const handleNavigate = (view: string, data?: any) => {
    soundEffects.playScoreBeep();
    setActiveView(view);
    if (data !== undefined) setNavData(data);
    setMobileMenuOpen(false);
    // Refresh unread count when navigating
    if (effectiveUser) fetchUnreadMessages(effectiveUser);
  };

  // --- TUTORIAL HANDLERS ---
  const handleStartTutorial = (tutorialId: string) => {
    setActiveTutorialId(tutorialId);
    setIsTutorialActive(true);
  };

  const handleTutorialComplete = () => {
    setIsTutorialActive(false);
    setActiveTutorialId(null);
  };

  const activeTutorialDef = TUTORIALS.find(t => t.id === activeTutorialId);

  const handleSimulateRole = (role: UserRole) => {
    setSimulatedRole(role);
    setHasSelectedRole(true);
  };

  const handleDevSuperAdminBypass = () => {
    const debugProfile: UserProfile = {
      id: 'debug-superadmin-001',
      name: 'SuperAdmin',
      lastname: 'Developer',
      email: 'dev@smashtennis.local',
      role: 'superadmin',
      is_approved: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSession({
      access_token: 'debug-token-mock',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'debug-refresh-mock',
      user: {
        id: debugProfile.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: debugProfile.email,
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      }
    });
    setUserProfile(debugProfile);
    setLoading(false);
  };

  // STANDALONE LANDING PAGE VIEW (FULL-SCREEN FOR BOTH AUTH & UNAUTH USERS AT /inicio)
  if (activeView === 'landing' || activeView === 'inicio') {
    return (
      <Suspense fallback={<div className="h-screen bg-dark flex items-center justify-center text-primary">Cargando Smash Tenis...</div>}>
        <LandingPage
          user={effectiveUser}
          onOpenAuth={(mode = 'login', role = 'player') => {
            if (effectiveUser) {
              setActiveView('dashboard');
              window.history.pushState({}, '', '/');
            } else {
              setAuthMode(mode);
              setAuthRole(role);
              setUnauthView('auth');
              setActiveView('auth');
            }
          }}
          onNavigateDashboard={() => {
            setActiveView('dashboard');
            window.history.pushState({}, '', '/');
          }}
          onLogout={handleLogout}
        />
      </Suspense>
    );
  }

  if (loading) return <div className="h-screen bg-dark flex items-center justify-center text-primary">Cargando aplicación...</div>;

  if (!session || !userProfile || !effectiveUser) {
    if (unauthView === 'landing') {
      return (
        <Suspense fallback={<div className="h-screen bg-dark flex items-center justify-center text-primary">Cargando Smash Tenis...</div>}>
          <LandingPage
            onOpenAuth={(mode = 'login', role = 'player') => {
              setAuthMode(mode);
              setAuthRole(role);
              setUnauthView('auth');
            }}
          />
        </Suspense>
      );
    }

    return (
      <AuthPage
        initialMode={authMode}
        initialRole={authRole}
        onLoginSuccess={() => { }}
        onBackToLanding={() => {
          setUnauthView('landing');
          setActiveView('landing');
        }}
      />
    );
  }

  // INTERCEPTOR: Super Admin Role Selection
  if (userProfile.role === 'superadmin' && !hasSelectedRole) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Bienvenido, Super Admin</h1>
            <p className="text-muted text-sm">Selecciona con qué rol deseas visualizar y operar la plataforma en esta sesión.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setSimulatedRole(null); setHasSelectedRole(true); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-white group-hover:text-orange-400 transition-colors">Super Admin (Real)</div>
                <div className="text-xs text-muted">Acceso total a todas las funciones y debug.</div>
              </div>
            </button>

            <button
              onClick={() => { setSimulatedRole('admin'); setHasSelectedRole(true); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-white group-hover:text-purple-400 transition-colors">Organizador / Admin</div>
                <div className="text-xs text-muted">Gestión de torneos, canchas y usuarios.</div>
              </div>
            </button>

            <button
              onClick={() => { setSimulatedRole('professor'); setHasSelectedRole(true); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">Profesor / Entrenador</div>
                <div className="text-xs text-muted">Gestión de alumnos, clases y avales técnicos.</div>
              </div>
            </button>

            <button
              onClick={() => { setSimulatedRole('player'); setHasSelectedRole(true); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <User size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-white group-hover:text-primary transition-colors">Jugador</div>
                <div className="text-xs text-muted">Vista estándar de usuario final.</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark text-slate-100 font-sans overflow-hidden">

      {/* TUTORIAL OVERLAY */}
      <TutorialOverlay
        isActive={isTutorialActive}
        steps={activeTutorialDef?.steps || []}
        onComplete={handleTutorialComplete}
        currentView={activeView}
        onNavigateRequest={(view) => setActiveView(view)}
      />

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300`}>
        <Sidebar
          role={effectiveUser.role}
          activeView={activeView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          unreadCount={unreadCount}
          userName={effectiveUser.name}
          userAvatar={effectiveUser.profile_picture_url}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-white/10 bg-dark/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-muted" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="font-bold text-lg text-white capitalize">
              {VALID_VIEWS.includes(activeView as any) 
                ? activeView.replace('-', ' ').replace('detail', 'detalle') 
                : 'Panel General'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {simulatedRole && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                <ShieldAlert size={14} className="text-orange-400" />
                <span className="text-xs font-bold text-orange-200">Modo Simulación: {simulatedRole}</span>
              </div>
            )}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white">{effectiveUser.name}</div>
              <div className="text-xs text-muted capitalize">{effectiveUser.role === 'admin' ? 'Organizador' : effectiveUser.role}</div>
            </div>
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20 cursor-pointer overflow-hidden"
              onClick={() => setActiveView('profile')}
            >
              {effectiveUser.profile_picture_url ? (
                <img src={effectiveUser.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                effectiveUser.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-10">
            <Suspense fallback={
              <div className="h-72 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <span className="text-xs text-muted font-bold tracking-widest uppercase">Cargando pantalla...</span>
              </div>
            }>
              {activeView === 'dashboard' && <Dashboard user={effectiveUser} onNavigate={handleNavigate} />}
              {activeView === 'tournaments' && <Tournaments user={effectiveUser} onNavigate={handleNavigate} initialState={navData} />}
              {activeView === 'tournaments-map' && <Tournaments user={effectiveUser} onNavigate={handleNavigate} initialState={{ view: 'map' }} />}
              {activeView === 'tournament-detail' && (
                <TournamentDetails
                  tournamentId={navData}
                  user={effectiveUser}
                  onBack={() => handleNavigate('tournaments')}
                />
              )}
              {activeView === 'profile' && (
                <Profile
                  user={effectiveUser}
                  onProfileUpdate={() => fetchProfile(effectiveUser.id)}
                />
              )}
              {activeView === 'rankings' && <Rankings user={effectiveUser} />}
              {activeView === 'players' && <Players user={effectiveUser} onNavigate={handleNavigate} />}
              {activeView === 'bookings' && <Bookings user={effectiveUser} />}
              {activeView === 'messages' && (
                <Messages
                  user={effectiveUser}
                  onRefreshNotifications={() => fetchUnreadMessages(effectiveUser)}
                />
              )}
              {activeView === 'reports' && <Reports user={effectiveUser} />}
              {(activeView === 'coach-dashboard' || activeView === 'classes') && (
                <CoachDashboard user={effectiveUser} onNavigate={handleNavigate} />
              )}
              {activeView === 'pricing-commissions' && (
                <PricingAndCommissions user={effectiveUser} onNavigate={handleNavigate} />
              )}
              {activeView === 'admin-users' && <AdminUsers user={effectiveUser} />}
              {activeView === 'admin-institutions' && <AdminInstitutions user={effectiveUser} />}
              {activeView === 'admin-settings' && <AdminSettings user={effectiveUser} />}

              {/* Tutorial View */}
              {activeView === 'tutorials' && (
                <TutorialsPage
                  user={effectiveUser}
                  onStartTutorial={handleStartTutorial}
                />
              )}

              {/* Default Fallback for unmatched/unknown activeView */}
              {!VALID_VIEWS.includes(activeView as any) && (
                <Dashboard user={effectiveUser} onNavigate={handleNavigate} />
              )}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <ToastProvider>
    <AppContent />
    <PWAInstallPrompt />
    <VersionUpdatePrompt />
  </ToastProvider>
);

export default App;
