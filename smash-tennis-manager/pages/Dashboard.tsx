
import React, { useEffect, useState } from 'react';
import { UserProfile, Match, Tournament, Booking, RankingPointRecord } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import {
    Trophy,
    Calendar,
    Activity,
    ArrowRight,
    Users,
    TrendingUp,
    Clock,
    Plus,
    Search,
    Zap,
    MapPin,
    DollarSign,
    ClipboardList,
    Settings,
    ChevronRight,
    UserPlus,
    Check,
    CheckCheck,
    Sparkles,
    MessageCircle,
    Swords,
    Shield,
    AlertTriangle,
    Flame,
    UserCircle
} from 'lucide-react';

interface DashboardProps {
    user: UserProfile;
    onNavigate: (view: string, data?: any) => void;
}

interface SuggestedRival extends UserProfile {
    matchScore: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'professor') {
        return <AdminDashboard user={user} onNavigate={onNavigate} />;
    }
    return <PlayerDashboard user={user} onNavigate={onNavigate} />;
};

// --- ADMIN DASHBOARD ---
const AdminDashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
    const [stats, setStats] = useState({
        activeTournaments: 0,
        todayBookings: 0,
        pendingUsers: 0,
        revenueToday: 0,
        revenueTrend: ''
    });
    const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
    const [pendingUsersList, setPendingUsersList] = useState<UserProfile[]>([]);

    // Player Data for Professor & Admin
    const [myMatches, setMyMatches] = useState<Match[]>([]);
    const [myRankingHistory, setMyRankingHistory] = useState<RankingPointRecord[]>([]);

    const [loading, setLoading] = useState(true);

    const isSuperAdmin = user.role === 'superadmin';
    const isProfessor = user.role === 'professor';
    const isAdmin = user.role === 'admin';

    // Show player section for Professors AND Admins (since they play too)
    const showPlayerSection = isProfessor || isAdmin;

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            // Parallel fetching for Admin Data
            const today = new Date().toISOString().split('T')[0];

            // Base queries that always run
            const baseQueries = [
                api.tournaments.getActive(),
                api.auth.getAllProfiles(),
                api.reports.getTransactions(user.institution_id || 'all', 1, 100)
            ];

            // Bookings query only if institution_id exists
            const bookingsPromise = user.institution_id
                ? api.bookings.getByInstitutionAndDate(user.institution_id, today)
                : Promise.resolve([]);

            const [tournaments, allProfiles, transactionsData, bookingsData] = await Promise.all([
                ...baseQueries,
                bookingsPromise
            ]);

            // Filter Admin Data
            let pending = allProfiles.filter(p => !p.is_approved && p.role !== 'superadmin');
            if (!isSuperAdmin && user.institution_id) {
                pending = pending.filter(p => p.institution_id === user.institution_id);
            }

            // Calculate real revenue from today's and yesterday's transactions
            const todayTransactions = transactionsData.filter(t => t.date?.startsWith(today));
            const todayRevenue = todayTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            // Calculate yesterday for trend
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const yesterdayTransactions = transactionsData.filter(t => t.date?.startsWith(yesterdayStr));
            const yesterdayRevenue = yesterdayTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            // Calculate trend percentage
            let revenueTrend = '';
            if (yesterdayRevenue > 0) {
                const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
                revenueTrend = change >= 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
            } else if (todayRevenue > 0) {
                revenueTrend = '+100%';
            }

            setStats({
                activeTournaments: tournaments.length,
                todayBookings: bookingsData.length,
                pendingUsers: pending.length,
                revenueToday: todayRevenue,
                revenueTrend
            });
            setPendingUsersList(pending);
            setTodayBookings(bookingsData);

            // NEW: Load player data if applicable
            if (showPlayerSection) {
                const [matches, ranking] = await Promise.all([
                    api.matches.getByUser(user.id),
                    api.rankings.getHistory(user.id)
                ]);
                setMyMatches(matches);
                setMyRankingHistory(ranking);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickApprove = async (userToApprove: UserProfile) => {
        if (!confirm(`¿Aprobar ingreso de ${userToApprove.name}?`)) return;
        try {
            await api.auth.updateProfile(userToApprove.id, { is_approved: true });
            const updatedList = pendingUsersList.filter(u => u.id !== userToApprove.id);
            setPendingUsersList(updatedList);
            setStats(prev => ({ ...prev, pendingUsers: updatedList.length }));
        } catch (e) {
            alert("Error al aprobar usuario");
        }
    };

    // Calculate player stats
    const myTotalPoints = myRankingHistory.reduce((sum, pt) => sum + pt.points, 0);
    const myNextMatch = myMatches.find(m => !m.winner_id && m.scheduled_at);

    if (loading) return <div className="flex h-96 items-center justify-center text-primary animate-pulse">Cargando panel administrativo...</div>;

    return (
        <div className="space-y-8 animate-fade-up">
            <div id="dashboard-header" className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Hola, {user.name}</h1>
                    <p className="text-muted">Panel de Gestión Operativa • <span className="text-primary font-bold">{user.institution || 'Vista General'}</span></p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onNavigate('bookings')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        Ver Agenda Completa
                    </button>
                </div>
            </div>

            <div id="dashboard-quick-actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card - Hidden for Professors */}
                {!isProfessor ? (
                    <KPICard label="Ingresos Hoy" value={`$${stats.revenueToday.toLocaleString()}`} sub="vs. ayer" icon={DollarSign} color="text-green-400" trend={stats.revenueTrend} onClick={() => onNavigate('reports')} />
                ) : (
                    <KPICard label="Clases Hoy" value="4" sub="Mis entrenamientos" icon={Activity} color="text-green-400" />
                )}

                <KPICard label="Reservas / Partidos" value={stats.todayBookings} sub="Turnos ocupados hoy" icon={Calendar} color="text-blue-400" />
                <KPICard label="Torneos Activos" value={stats.activeTournaments} sub="En fase de grupos" icon={Trophy} color="text-amber-400" onClick={() => onNavigate('tournaments')} />
                <KPICard label="Solicitudes" value={stats.pendingUsers} sub="Pendientes de aprobación" icon={Users} color="text-purple-400" onClick={() => onNavigate('admin-users')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div id="dashboard-main-content" className="lg:col-span-2 space-y-8">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-muted" /> Módulos de Gestión
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AdminModuleCard title="Torneos y Competencia" description="Crear cuadros, gestionar fechas y actualizar resultados." icon={Trophy} color="bg-amber-500" onClick={() => onNavigate('tournaments')} />

                            {(isSuperAdmin || !isProfessor) && (
                                <AdminModuleCard title="Jugadores y Usuarios" description="Base de datos de socios, categorías y perfiles." icon={Users} color="bg-blue-500" onClick={() => onNavigate('admin-users')} />
                            )}

                            <AdminModuleCard title="Instituciones y Sedes" description="Configurar canchas, precios y horarios de atención." icon={MapPin} color="bg-indigo-500" onClick={() => onNavigate('admin-institutions')} />

                            {/* Financial Module - Hidden for Professors */}
                            {!isProfessor && (
                                <AdminModuleCard title="Caja y Reportes" description="Ver balances financieros y estadísticas de ocupación." icon={TrendingUp} color="bg-green-600" onClick={() => onNavigate('reports')} />
                            )}
                        </div>
                    </div>

                    {/* --- PLAYER SECTION (Unified Card) --- */}
                    {showPlayerSection && (
                        <div className="pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <UserCircle size={20} className="text-primary" /> Mi Perfil de Jugador
                            </h3>

                            <div className="bg-gradient-to-r from-slate-900 to-card border border-white/10 rounded-3xl overflow-hidden relative group shadow-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">

                                    {/* Left: Next Match */}
                                    <div className="p-6 relative overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" onClick={() => myNextMatch && onNavigate('tournament-detail', myNextMatch.tournament_id)}>
                                        <div className="absolute right-0 top-0 p-4 opacity-5 text-primary pointer-events-none">
                                            <Swords size={120} />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                                    <div className="p-1 bg-primary/20 rounded"><Clock size={12} /></div>
                                                    Próximo Desafío
                                                </div>
                                                {myNextMatch && (
                                                    <span className="text-[10px] bg-white/10 text-white px-2 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                                                        {myNextMatch.tournaments?.name}
                                                    </span>
                                                )}
                                            </div>

                                            {myNextMatch ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Tu Rival</div>
                                                        <div className="text-2xl font-bold text-white leading-tight">
                                                            {myNextMatch.player1_id === user.id ? myNextMatch.player2_name : myNextMatch.player1_name || 'A definir'}
                                                        </div>
                                                        <div className="text-sm text-slate-400 mt-1">{myNextMatch.round}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <div className="flex items-center gap-2 text-xs text-white font-medium bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                                            <Calendar size={12} className="text-muted" />
                                                            {new Date(myNextMatch.scheduled_at!).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-white font-medium bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                                            <Clock size={12} className="text-muted" />
                                                            {myNextMatch.scheduled_at!.slice(11, 16)} hs
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col justify-center h-full py-2">
                                                    <div className="text-lg font-bold text-slate-300 mb-1">Sin partidos programados</div>
                                                    <div className="text-sm text-muted mb-4">Inscríbete en torneos para competir.</div>
                                                    <button className="self-start text-xs font-bold text-primary hover:text-white flex items-center gap-1 transition-colors">
                                                        Ver Torneos Disponibles <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Ranking */}
                                    <div className="p-6 relative overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onNavigate('rankings')}>
                                        <div className="absolute right-0 top-0 p-4 opacity-5 text-amber-500 pointer-events-none">
                                            <Trophy size={120} />
                                        </div>

                                        <div className="relative z-10 h-full flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-4">
                                                    <div className="p-1 bg-amber-500/20 rounded"><Flame size={12} /></div>
                                                    Rendimiento & Ranking
                                                </div>

                                                <div className="flex items-end gap-3 mb-2">
                                                    <div className="text-4xl font-bold text-white tracking-tighter">{myTotalPoints}</div>
                                                    <div className="text-sm font-bold text-muted mb-1.5 uppercase tracking-widest">Puntos</div>
                                                </div>

                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs text-slate-300">
                                                    <span>Categoría <strong>{user.category || 'N/A'}</strong></span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="text-xs text-muted group-hover:text-white transition-colors">
                                                    Ver historial completo
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-black transition-all shadow-lg">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div id="dashboard-stats-sidebar" className="space-y-6">
                    <Card className="bg-orange-500/5 border-orange-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                <UserPlus className="text-orange-400" size={18} /> Solicitudes ({pendingUsersList.length})
                            </h4>
                        </div>
                        <div className="space-y-3">
                            {pendingUsersList.slice(0, 5).map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">{u.name.charAt(0)}</div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{u.name} {u.lastname}</div>
                                            <div className="text-[10px] text-muted truncate capitalize">{u.role}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleQuickApprove(u)} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition-colors"><Check size={16} /></button>
                                </div>
                            ))}
                            {pendingUsersList.length === 0 && <div className="text-center py-6 text-muted text-sm"><CheckCheck size={24} className="mx-auto mb-2 opacity-50 text-green-500" />Todo al día.</div>}
                        </div>
                    </Card>
                    <div className="bg-card border border-white/10 rounded-2xl p-6">
                        <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-muted">Accesos Rápidos</h4>
                        <div className="space-y-3">
                            <QuickLink icon={Plus} label="Crear Nuevo Torneo" onClick={() => onNavigate('tournaments', { openModal: true })} />
                            <QuickLink icon={Calendar} label="Bloquear Cancha" onClick={() => onNavigate('bookings')} />
                            <QuickLink icon={Search} label="Buscar Jugador" onClick={() => onNavigate('players')} />
                            <QuickLink icon={ClipboardList} label="Cargar Resultados" onClick={() => onNavigate('tournaments')} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PLAYER DASHBOARD ---
const PlayerDashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
    const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [rankingHistory, setRankingHistory] = useState<RankingPointRecord[]>([]); // New for points
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        winRate: 0,
        totalPlayed: 0,
        pending: 0
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [tournamentsData, matchesData, rankingData] = await Promise.all([
                    api.tournaments.getActive(), // Gets all active tournaments
                    api.matches.getByUser(user.id),
                    api.rankings.getHistory(user.id) // Fetch Point History
                ]);

                setActiveTournaments(tournamentsData);
                setMatches(matchesData);
                setRankingHistory(rankingData);

                // Process Stats
                const played = matchesData.filter(m => m.winner_id).length;
                const won = matchesData.filter(m => m.winner_id === user.id).length;
                const pending = matchesData.filter(m => !m.winner_id).length;
                const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
                setStats({ winRate, totalPlayed: played, pending });

                // Next match Logic: Find the first pending match with a schedule
                const next = matchesData.find(m => !m.winner_id && m.scheduled_at);
                if (next) setNextMatch(next);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user.id]);

    // Logic: Identify points expiring soon (Age between 8 and 12 months)
    const expiringPoints = rankingHistory.filter(pt => {
        const obtained = new Date(pt.date_obtained);
        const now = new Date();
        const ageInMonths = (now.getFullYear() - obtained.getFullYear()) * 12 + (now.getMonth() - obtained.getMonth());
        return ageInMonths >= 8 && ageInMonths < 12;
    });

    // Calculate Total Points
    const totalPoints = rankingHistory.reduce((sum, pt) => sum + pt.points, 0);

    // Derive Lists
    // 1. My Enrolled Tournaments: Where user has matches OR is part of the player list (approximated by match participation for this demo)
    const myTournamentIds = new Set(matches.map(m => m.tournament_id));
    const enrolledTournaments = activeTournaments.filter(t => myTournamentIds.has(t.id));

    // 2. Open Compatible Tournaments: Active, not enrolled, registration open, category compatible
    const compatibleTournaments = activeTournaments.filter(t => {
        if (myTournamentIds.has(t.id)) return false; // Already enrolled
        if (t.registration_closed) return false; // Closed

        // Category Check
        const myCat = user.category;
        if (!myCat) return true; // Show all if user has no category

        // Check complex competitions
        if (t.competitions && t.competitions.length > 0) {
            return t.competitions.some(comp => comp.allowed_categories.includes(myCat));
        }

        // Legacy Check
        return t.category.includes(myCat) || t.category === 'Open';
    });

    if (loading) return <div className="flex h-96 items-center justify-center text-primary animate-pulse">Cargando tu panel...</div>;

    return (
        <div className="space-y-8 animate-fade-up">
            <div id="dashboard-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Hola, {user.name}</h1>
                    <p className="text-muted">
                        Bienvenido al panel general.
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <div className="text-xs font-bold text-muted uppercase tracking-wider">Fecha de hoy</div>
                    <div className="text-xl font-bold text-white">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                </div>
            </div>

            <div id="dashboard-quick-actions" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction icon={Calendar} label="Reservar Cancha" onClick={() => onNavigate('bookings')} color="bg-primary" />
                <QuickAction icon={Search} label="Buscar Rival" onClick={() => onNavigate('players')} color="bg-purple-500" />
                <QuickAction icon={Trophy} label="Mis Torneos" onClick={() => onNavigate('tournaments')} color="bg-amber-500" />
                <QuickAction icon={Zap} label="Ver Ranking" onClick={() => onNavigate('rankings')} color="bg-slate-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (2/3) */}
                <div id="dashboard-main-content" className="lg:col-span-2 space-y-8">

                    {/* --- NEW SECTION: POINTS DEFENSE ALERT --- */}
                    {expiringPoints.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-500">
                            <div className="bg-gradient-to-r from-orange-900/40 to-card border border-orange-500/30 rounded-3xl p-6 relative overflow-hidden">
                                {/* Background Effect */}
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-500"><Shield size={120} /></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-orange-500 text-black rounded-lg shadow-lg shadow-orange-500/20">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Defensa de Puntos</h3>
                                    </div>

                                    <p className="text-sm text-slate-300 mb-4 max-w-lg">
                                        Tienes puntos importantes que vencerán en los próximos meses.
                                        Compite en las nuevas ediciones para defender tu posición en el ranking.
                                    </p>

                                    <div className="space-y-3">
                                        {expiringPoints.map((pt) => {
                                            // Calculate exact expiration
                                            const obtained = new Date(pt.date_obtained);
                                            const expiration = new Date(obtained);
                                            expiration.setFullYear(obtained.getFullYear() + 1);

                                            return (
                                                <div key={pt.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center">
                                                            <div className="text-xl font-bold text-orange-400">{pt.points}</div>
                                                            <div className="text-[10px] text-muted uppercase">Puntos</div>
                                                        </div>
                                                        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                                                        <div>
                                                            <div className="font-bold text-white">{pt.tournament_name}</div>
                                                            <div className="text-xs text-orange-300 flex items-center gap-1">
                                                                <Clock size={12} /> Vence el {expiration.toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CTA: If next edition exists */}
                                                    {pt.next_edition_id ? (
                                                        <button
                                                            onClick={() => onNavigate('tournament-detail', pt.next_edition_id)}
                                                            className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-lg text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                                        >
                                                            <Shield size={16} /> Defender Título
                                                        </button>
                                                    ) : (
                                                        <div className="text-xs text-muted italic px-2">Esperando nueva edición...</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 1. NEXT MATCH CARD (Enhanced) */}
                    {nextMatch ? (
                        <div className="bg-gradient-to-r from-blue-900 to-slate-900 border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all shadow-xl" onClick={() => onNavigate('tournament-detail', nextMatch.tournament_id)}>
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Swords size={120} /></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-xs tracking-wider">
                                        <div className="p-1 bg-blue-500/20 rounded"><Clock size={14} /></div>
                                        Próximo Partido Confirmado
                                    </div>
                                    <div className="bg-black/30 px-3 py-1 rounded-full text-xs text-white border border-white/10 backdrop-blur-sm">
                                        {nextMatch.tournaments?.name}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Match Info */}
                                    <div className="space-y-4">
                                        <div className="flex flex-col">
                                            <span className="text-muted text-xs uppercase font-bold mb-1">Tu Rival</span>
                                            <div className="text-3xl font-bold text-white truncate">
                                                {nextMatch.player1_id === user.id ? nextMatch.player2_name : nextMatch.player1_name || 'TBD'}
                                            </div>
                                            <div className="text-sm text-blue-300 mt-1">{nextMatch.round}</div>
                                        </div>

                                        <div className="flex gap-4 pt-2">
                                            <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 min-w-[100px]">
                                                <span className="text-[10px] text-muted uppercase block mb-1">Sede / Club</span>
                                                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                                    <MapPin size={14} className="text-primary" />
                                                    {(nextMatch as any).tournaments?.institutions?.name || 'Sede Central'}
                                                </div>
                                            </div>
                                            <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 min-w-[100px]">
                                                <span className="text-[10px] text-muted uppercase block mb-1">Cancha</span>
                                                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                                    <Activity size={14} className="text-green-400" />
                                                    {nextMatch.court_slot_id || 'Cancha 1'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date & Time Big */}
                                    <div className="flex items-center justify-center sm:justify-end">
                                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl text-center min-w-[140px]">
                                            <div className="text-4xl font-bold text-white mb-1">{nextMatch.scheduled_at!.slice(11, 16)}</div>
                                            <div className="text-sm text-primary font-bold uppercase tracking-widest mb-2">Horas</div>
                                            <div className="h-px w-full bg-white/10 my-2"></div>
                                            <div className="text-lg text-slate-300 font-medium">
                                                {new Date(nextMatch.scheduled_at!).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-muted">
                                <Calendar size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Sin partidos programados</h3>
                                <p className="text-muted text-sm">No tienes partidos coordinados próximamente.</p>
                            </div>
                        </div>
                    )}

                    {/* 2. MY ENROLLED TOURNAMENTS */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Trophy className="text-amber-500" size={20} /> Mis Competiciones
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {enrolledTournaments.length === 0 ? (
                                <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-6 text-center text-sm text-muted">
                                    No estás inscrito en ningún torneo activo.
                                </div>
                            ) : (
                                enrolledTournaments.map(t => (
                                    <Card key={t.id} onClick={() => onNavigate('tournament-detail', t.id)} className="group hover:bg-white/5 relative overflow-hidden border-l-4 border-l-amber-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase border border-amber-500/20">Participando</div>
                                            <ArrowRight className="text-muted group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" size={16} />
                                        </div>
                                        <h4 className="font-bold text-white mb-1 truncate">{t.name}</h4>
                                        <p className="text-xs text-muted mb-3 flex items-center gap-1"><MapPin size={12} /> {t.institutions?.name}</p>

                                        {/* Fake Progress Bar */}
                                        <div className="flex justify-between text-[10px] text-muted mb-1">
                                            <span>Progreso</span>
                                            <span>Fase de Grupos</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-1/2 rounded-full"></div></div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3. OPEN TOURNAMENTS (Compatible) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-green-500/20 rounded-lg text-green-400"><UserPlus size={18} /></div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-none">Inscripciones Abiertas</h3>
                                <p className="text-xs text-muted">Torneos disponibles para tu categoría ({user.category || 'Sin Cat.'}).</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {compatibleTournaments.length === 0 ? (
                                <div className="text-center py-8 text-muted text-sm bg-white/5 rounded-2xl">
                                    No hay torneos abiertos compatibles con tu perfil en este momento.
                                </div>
                            ) : (
                                compatibleTournaments.map(t => (
                                    <div key={t.id} className="flex items-center justify-between bg-card border border-white/10 p-4 rounded-2xl hover:border-green-500/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-green-900/20 text-green-400 rounded-xl flex items-center justify-center font-bold text-lg border border-green-500/20">
                                                Go
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white group-hover:text-green-400 transition-colors">{t.name}</h4>
                                                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.start_date).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1"><DollarSign size={12} /> {t.registration_price || 'Consultar'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onNavigate('tournament-detail', t.id)}
                                            className="px-4 py-2 bg-white/5 hover:bg-green-600 hover:text-white text-green-400 text-xs font-bold rounded-xl transition-all border border-white/10 group-hover:border-green-600 shadow-lg"
                                        >
                                            Inscribirse
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column (1/3) */}
                <div id="dashboard-stats-sidebar" className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={TrendingUp} color="text-green-400" />
                        <StatCard label="Jugados" value={stats.totalPlayed} icon={Activity} color="text-blue-400" />
                        <StatCard label="Ganados" value={user.matches_won || 0} icon={Trophy} color="text-yellow-400" />
                        <StatCard label="Rank" value="-" icon={Zap} color="text-purple-400" />
                    </div>

                    {/* --- NEW SECTION: RANKING BREAKDOWN CARD --- */}
                    <Card className="flex flex-col">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                                <Flame size={16} className="text-orange-500" /> Ranking Actual
                            </h3>
                            <span className="text-xl font-bold text-primary">{totalPoints} pts</span>
                        </div>
                        <div className="flex-1 space-y-3">
                            {rankingHistory.length === 0 ? (
                                <div className="text-center text-muted text-xs py-4">Aún no tienes puntos.</div>
                            ) : (
                                rankingHistory.map((pt, i) => {
                                    const obtained = new Date(pt.date_obtained);
                                    const now = new Date();
                                    const ageInMonths = (now.getFullYear() - obtained.getFullYear()) * 12 + (now.getMonth() - obtained.getMonth());
                                    const isRisk = ageInMonths >= 8;

                                    return (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <div className="truncate pr-2">
                                                <div className="text-slate-200 truncate font-medium">{pt.tournament_name}</div>
                                                <div className="text-[10px] text-muted flex items-center gap-1">
                                                    {new Date(pt.date_obtained).toLocaleDateString()}
                                                    {isRisk && <span className="text-orange-400 font-bold">• Vence pronto</span>}
                                                </div>
                                            </div>
                                            <span className={`font-bold font-mono ${isRisk ? 'text-orange-400' : 'text-white'}`}>
                                                {pt.points}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div className="pt-2 border-t border-white/5 text-center">
                                <button onClick={() => onNavigate('rankings')} className="text-xs text-primary hover:text-white transition-colors">
                                    Ver Ranking Completo
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card className="h-auto">
                        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-muted">Historial Reciente</h3>
                        <div className="space-y-4">
                            {matches.length === 0 ? (
                                <div className="text-center text-muted text-sm py-4">Sin partidos registrados.</div>
                            ) : (
                                matches.slice(0, 5).map(m => {
                                    const isWinner = m.winner_id === user.id;
                                    const isPlayed = !!m.winner_id;
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                                            <div className={`w-2 h-full self-stretch rounded-full ${!isPlayed ? 'bg-slate-700' : isWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-white text-sm font-bold truncate">{m.player1_id === user.id ? m.player2_name : m.player1_name || 'Rival'}</span>
                                                    <span className={`text-xs font-mono ${isWinner ? 'text-green-400' : 'text-slate-400'}`}>{isPlayed ? 'Finalizado' : 'Pendiente'}</span>
                                                </div>
                                                <div className="text-xs text-muted truncate">{m.tournaments?.name}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- HELPERS ---
const QuickAction = ({ icon: Icon, label, onClick, color }: { icon: any, label: string, onClick: () => void, color: string }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group">
        <div className={`w-10 h-10 rounded-full ${color.replace('bg-', 'bg-opacity-20 ')} ${color.replace('bg-', 'text-')} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon size={20} className={color.includes('slate') ? 'text-white' : ''} />
        </div>
        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-card/50 border border-white/10 p-3 rounded-xl flex flex-col justify-center items-center">
        <Icon size={16} className={`${color} mb-1 opacity-80`} />
        <span className="text-lg font-bold text-white">{value}</span>
        <span className="text-[10px] text-muted uppercase">{label}</span>
    </div>
);

const KPICard = ({ label, value, sub, icon: Icon, color, trend, onClick }: any) => (
    <div onClick={onClick} className={`bg-card/50 border border-white/10 p-5 rounded-2xl relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:border-white/20' : ''}`}>
        <div className={`absolute top-0 right-0 p-3 opacity-10 ${color.replace('text-', 'text-')}`}><Icon size={64} /></div>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-lg ${color.replace('text-', 'bg-').replace('400', '500/20')} ${color} flex items-center justify-center mb-3`}><Icon size={20} /></div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
            <div className="text-xs font-bold uppercase text-muted mb-1">{label}</div>
            {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
            {trend && <div className="absolute top-5 right-5 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">{trend}</div>}
        </div>
    </div>
);

const AdminModuleCard = ({ title, description, icon: Icon, color, onClick }: any) => (
    <button onClick={onClick} className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left group">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}><Icon size={28} /></div>
        <div className="flex-1">
            <h4 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{title}</h4>
            <p className="text-sm text-muted leading-tight">{description}</p>
        </div>
        <ChevronRight className="text-muted group-hover:text-white group-hover:translate-x-1 transition-all" />
    </button>
);

const QuickLink = ({ icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
        <Icon size={18} className="text-primary" />
        <span className="text-sm font-medium">{label}</span>
        <ArrowRight size={14} className="ml-auto opacity-50" />
    </button>
);
