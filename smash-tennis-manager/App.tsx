
import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { api } from './services/api';
import { UserProfile, UserRole } from './types';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetails } from './pages/TournamentDetails';
import { Profile } from './pages/Profile';
import { Rankings } from './pages/Rankings';
import { Players } from './pages/Players';
import { Bookings } from './pages/Bookings';
import { Messages } from './pages/Messages';
import { AdminUsers } from './pages/AdminUsers';
import { AdminInstitutions } from './pages/AdminInstitutions';
import { AdminSettings } from './pages/AdminSettings';
import { Reports } from './pages/Reports';
import { TutorialsPage, TUTORIALS } from './pages/TutorialsPage';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ToastProvider } from './components/ui/Toast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { VersionUpdatePrompt } from './components/VersionUpdatePrompt';
import { Menu, ShieldAlert, User, Shield } from 'lucide-react';

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [navData, setNavData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // New State for Messages

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        checkUrlRedirects();
      } else {
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUrlRedirects = () => {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('tournament') || params.get('t');
    const clubId = params.get('club') || params.get('institution') || params.get('c');

    if (tournamentId) {
      setActiveView('tournament-detail');
      setNavData(tournamentId);
    } else if (clubId) {
      setActiveView('bookings');
      setNavData({ clubId });
    }
  };

  // Sync Badge Count with Role Changes (Simulation)
  useEffect(() => {
    if (effectiveUser) {
      fetchUnreadMessages(effectiveUser);
    }
  }, [userProfile, simulatedRole]);

  const fetchProfile = async (userId: string) => {
    try {
      const profile = await api.auth.getUserProfile(userId);
      setUserProfile(profile);
      // fetchUnreadMessages called by useEffect above
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadMessages = async (profile: UserProfile) => {
    try {
      const msgs = await api.messages.getInbox(profile);
      const unread = msgs.filter(m => !m.is_read).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Error fetching unread count", e);
    }
  };

  const handleLogout = async () => {
    await api.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setActiveView('dashboard');
    setSimulatedRole(null);
    setHasSelectedRole(false);
    setUnreadCount(0);
  };

  const handleNavigate = (view: string, data?: any) => {
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

  const handleDebugLogin = () => {
    const debugProfile: UserProfile = {
      id: 'admin-parque-espana',
      email: 'organizador@parqueespana.com',
      name: 'Organizador',
      lastname: 'Parque España',
      role: 'admin',
      institution_id: 'inst-parque-espana',
      institution: 'Tenis Parque España - Diamante, E.R.',
      is_approved: true,
      matches_won: 48,
      tournaments_won: 12,
      category: 'Organizador / Admin',
      profile_picture_url: '/parque-espana-logo.png'
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
    // Badge update handled by useEffect
    setLoading(false);
  };

  if (loading) return <div className="h-screen bg-dark flex items-center justify-center text-primary">Cargando aplicación...</div>;

  if (!session || !userProfile || !effectiveUser) {
    return <AuthPage onLoginSuccess={() => { }} />;
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
            <h2 className="font-bold text-lg text-white capitalize">{activeView.replace('-', ' ').replace('detail', 'detalle')}</h2>
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
            {activeView === 'dashboard' && <Dashboard user={effectiveUser} onNavigate={handleNavigate} />}
            {activeView === 'tournaments' && <Tournaments user={effectiveUser} onNavigate={handleNavigate} initialState={navData} />}
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
