import React, { useState, useEffect } from 'react';
import {
    Trophy, Users, Calendar, ShieldCheck, Zap, CloudRain, DollarSign,
    Award, Flame, Star, Sparkles, Clock, Smartphone, MessageCircle,
    ChevronRight, CheckCircle2, ArrowRight, Target, Layers, Check,
    Shield, ChevronDown, ChevronUp, Sparkle, Heart, RefreshCw, BarChart3,
    CalendarCheck, UserCheck, Play, Radio, Swords, TrendingUp, CircleDot, Activity,
    GraduationCap, Camera, FlameKindling, Image as ImageIcon
} from 'lucide-react';

interface LandingPageProps {
    onOpenAuth: (mode?: 'login' | 'register', role?: 'player' | 'admin') => void;
    onExploreAsGuest?: () => void;
    user?: any;
    onNavigateDashboard?: () => void;
    onLogout?: () => void;
}

type UserRoleType = 'player' | 'organizer' | 'coach';

export const LandingPage: React.FC<LandingPageProps> = ({ 
    onOpenAuth, 
    user, 
    onNavigateDashboard, 
    onLogout 
}) => {
    // Active Role: 'player' | 'organizer' | 'coach'
    const [activeRole, setActiveRole] = useState<UserRoleType>('player');

    // Dynamic Live Simulation States:
    // 1. Bracket simulation winner
    const [bracketWinner, setBracketWinner] = useState<'seed1' | 'seed2' | null>('seed1');

    // 2. Interactive Court Booking Slot selection
    const [selectedSlot, setSelectedSlot] = useState<{ court: string; time: string; type: string; price: number }>({
        court: 'Cancha 1',
        time: '19:00',
        type: 'Polvo de Ladrillo (Luz)',
        price: 12000
    });
    const [isSlotBooked, setIsSlotBooked] = useState(false);

    // 3. Dynamic H2H Rivalry Selector
    const [selectedH2HRival, setSelectedH2HRival] = useState<'maidana' | 'benitez' | 'diaz'>('maidana');

    // 4. Player Streak Simulation
    const [currentStreak, setCurrentStreak] = useState(4);

    // 5. Calculator state for Organizers
    const [simPlayers, setSimPlayers] = useState<number>(32);
    const [simFee, setSimFee] = useState<number>(20000);

    // 6. FAQ Accordion
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // 7. Live Pulse Toast Feed
    const [liveEventIndex, setLiveEventIndex] = useState(0);

    const liveEvents = [
        { text: '🔥 Martín G. alcanzó una racha de 5 victorias consecutivas en 3ra Cat', icon: Flame, color: 'text-amber-400' },
        { text: '📸 Club Parque España publicó 3 nuevas Stories del torneo de hoy', icon: Camera, color: 'text-purple-400' },
        { text: 'Torneo Smash 250: 28/32 inscriptos • Cuadros con Seeds listos', icon: Trophy, color: 'text-[#ccff00]' },
        { text: 'Cancha 2 liberada y notificada a lista de espera', icon: CloudRain, color: 'text-blue-400' },
        { text: 'Profe Diego sumó 12 alumnos con seguimiento de ranking', icon: GraduationCap, color: 'text-cyan-400' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setLiveEventIndex((prev) => (prev + 1) % liveEvents.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [liveEvents.length]);

    // Calculation for Organizers
    const grossTotal = simPlayers * simFee;
    const smashCommission = Math.round(grossTotal * 0.05);
    const netClubIncome = grossTotal - smashCommission;

    const h2hProfiles = {
        maidana: {
            name: 'Gonzalo Maidana',
            cat: '3ra Categoría (2°)',
            score: '3 - 2',
            sets: '7-6, 4-6, 10-8',
            winRate: '60%',
            recentWinner: 'Federico Rossi (6-4 7-5)'
        },
        benitez: {
            name: 'Lucas Benítez',
            cat: '3ra Categoría (4°)',
            score: '4 - 0',
            sets: '6-2, 6-3',
            winRate: '100%',
            recentWinner: 'Federico Rossi (6-3 6-2)'
        },
        diaz: {
            name: 'Ramiro Díaz',
            cat: '3ra Categoría (3°)',
            score: '2 - 3',
            sets: '4-6, 7-5, 8-10',
            winRate: '40%',
            recentWinner: 'Ramiro Díaz (7-5 6-4)'
        }
    };

    return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-[#e15b34] selection:text-white antialiased overflow-x-hidden">
            {/* Background ambient lighting */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#e15b34]/15 via-[#ccff00]/5 to-transparent rounded-full blur-[120px]" />
                <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
            </div>

            {/* LIVE PULSE TICKER STRIP */}
            <div className="bg-[#0b0f19] border-b border-white/5 py-1.5 px-4 text-[11px] overflow-hidden relative z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Comunidad Smash en Vivo</span>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 animate-fade-in transition-all">
                            {React.createElement(liveEvents[liveEventIndex].icon, {
                                size: 13,
                                className: liveEvents[liveEventIndex].color
                            })}
                            <span className="text-slate-300 font-medium truncate">
                                {liveEvents[liveEventIndex].text}
                            </span>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[10px]">
                        <span>Actualizado automáticamente</span>
                        <Activity size={12} className="text-[#ccff00]" />
                    </div>
                </div>
            </div>

            {/* TOP NAVBAR */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-[#07090e]/85 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/Smash.png" alt="Smash Tenis" className="h-10 w-auto object-contain" />
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white tracking-wide text-sm">SMASH</span>
                            <span className="text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/20 px-2 py-0.5 rounded-full">
                                TENIS & PÁDEL
                            </span>
                        </div>
                    </div>

                    {/* Quick Role Navigation Pills */}
                    <div className="hidden md:flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRole('player');
                                document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeRole === 'player'
                                    ? 'bg-[#ccff00] text-slate-950 shadow-md shadow-[#ccff00]/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Trophy size={13} />
                            <span>Soy Jugador</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRole('organizer');
                                document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeRole === 'organizer'
                                    ? 'bg-[#e15b34] text-white shadow-md shadow-[#e15b34]/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Shield size={13} />
                            <span>Soy Organizador / Club</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRole('coach');
                                document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeRole === 'coach'
                                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <GraduationCap size={13} />
                            <span>Soy Profesor</span>
                        </button>
                    </div>

                    {/* Auth CTAs */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                <button
                                    onClick={onNavigateDashboard}
                                    className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-[#ccff00] hover:bg-[#b8e600] rounded-xl shadow-md shadow-[#ccff00]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                                >
                                    <Trophy size={14} />
                                    <span>Ir a mi Panel</span>
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                    Cerrar Sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => onOpenAuth('login')}
                                    className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                    Ingresar
                                </button>
                                <button
                                    onClick={() => onOpenAuth('register', activeRole === 'organizer' ? 'admin' : 'player')}
                                    className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-[#ccff00] hover:bg-[#b8e600] rounded-xl shadow-md shadow-[#ccff00]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                >
                                    {activeRole === 'organizer' ? 'Crear Club Gratis' : 'Registrarme Gratis'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO SECTION WITH INTERACTIVE ROLE GATE */}
            <section className="relative z-10 pt-12 pb-16 md:pt-18 md:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
                {/* Brand Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">
                        El ecosistema inteligente de tenis y pádel • 0 Costos Fijos
                    </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1] mb-4">
                    ¿Cuál es tu rol en la cancha?
                </h1>
                <p className="text-sm sm:text-lg text-slate-400 max-w-xl mx-auto mb-10 font-normal">
                    Elegí tu perfil para descubrir las herramientas pensadas exactamente a tu medida.
                </p>

                {/* THE 3 PROMINENT ROLE CARDS (INTERACTIVE GATE) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left mb-12">
                    
                    {/* Role 1: JUGADOR */}
                    <button
                        type="button"
                        onClick={() => {
                            setActiveRole('player');
                            document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group text-left ${
                            activeRole === 'player'
                                ? 'bg-gradient-to-b from-[#ccff00]/15 via-[#0f131c] to-[#07090e] border-[#ccff00] shadow-xl shadow-[#ccff00]/15 scale-[1.03]'
                                : 'bg-[#0f131c]/80 border-white/10 hover:border-white/20 hover:scale-[1.01]'
                        }`}
                    >
                        {activeRole === 'player' && (
                            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-[#ccff00] text-slate-950 px-2 py-0.5 rounded-full">
                                Activo
                            </div>
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center mb-4">
                            <Trophy size={24} />
                        </div>
                        <h2 className="text-lg font-black text-white mb-1 group-hover:text-[#ccff00] transition-colors">
                            🏆 Soy Jugador
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                            Modo Historia, <strong>Modo Rachas 🔥</strong>, stories de tu club, ranking en vivo y búsqueda de compañero de dobles o sparring.
                        </p>
                        <div className="text-[11px] font-bold text-[#ccff00] flex items-center gap-1">
                            <span>Ver experiencia de jugador</span>
                            <ArrowRight size={13} />
                        </div>
                    </button>

                    {/* Role 2: ORGANIZADOR / CLUB */}
                    <button
                        type="button"
                        onClick={() => {
                            setActiveRole('organizer');
                            document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group text-left ${
                            activeRole === 'organizer'
                                ? 'bg-gradient-to-b from-[#e15b34]/15 via-[#0f131c] to-[#07090e] border-[#e15b34] shadow-xl shadow-[#e15b34]/20 scale-[1.03]'
                                : 'bg-[#0f131c]/80 border-white/10 hover:border-white/20 hover:scale-[1.01]'
                        }`}
                    >
                        {activeRole === 'organizer' && (
                            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-[#e15b34] text-white px-2 py-0.5 rounded-full">
                                Activo
                            </div>
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-[#e15b34]/15 text-[#e15b34] flex items-center justify-center mb-4">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-lg font-black text-white mb-1 group-hover:text-[#e15b34] transition-colors">
                            🛡️ Soy Organizador / Club
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                            Armado automático de llaves y zonas con <strong>Seeds de ranking</strong>, grilla de canchas con protocolo de lluvia y <strong>$0 costos fijos</strong>.
                        </p>
                        <div className="text-[11px] font-bold text-[#e15b34] flex items-center gap-1">
                            <span>Ver centro de control</span>
                            <ArrowRight size={13} />
                        </div>
                    </button>

                    {/* Role 3: PROFESOR / ENTRENADOR */}
                    <button
                        type="button"
                        onClick={() => {
                            setActiveRole('coach');
                            document.getElementById('role-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group text-left ${
                            activeRole === 'coach'
                                ? 'bg-gradient-to-b from-cyan-500/15 via-[#0f131c] to-[#07090e] border-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.03]'
                                : 'bg-[#0f131c]/80 border-white/10 hover:border-white/20 hover:scale-[1.01]'
                        }`}
                    >
                        {activeRole === 'coach' && (
                            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full">
                                Activo
                            </div>
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-4">
                            <GraduationCap size={24} />
                        </div>
                        <h2 className="text-lg font-black text-white mb-1 group-hover:text-cyan-400 transition-colors">
                            🎾 Soy Profesor / Coach
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                            Seguimiento de evolución de alumnos, sugerencias de categorización oficial y organización de torneos formativos de tu escuela.
                        </p>
                        <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                            <span>Ver herramientas para profes</span>
                            <ArrowRight size={13} />
                        </div>
                    </button>
                </div>
            </section>

            {/* DYNAMIC ROLE EXPERIENCE SECTION */}
            <section id="role-details" className="relative z-10 py-16 bg-[#040508]/90 border-y border-white/10 scroll-mt-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">

                    {/* ========================================================
                        VISTA 1: SOY JUGADOR (EL PROTAGONISTA)
                    ======================================================== */}
                    {activeRole === 'player' && (
                        <div className="space-y-12 animate-fade-in">
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] text-xs font-bold mb-3">
                                    <Trophy size={14} /> EXPERIENCIA DEL JUGADOR • 100% GRATIS
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                                    Tu carrera de tenis como nunca la viviste
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    Sumá puntos en cada torneo, mantené tu racha ganadora, compartí tus victorias en las stories del club y encontrá siempre con quién jugar.
                                </p>
                            </div>

                            {/* BENTO GRID: JUGADOR */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                
                                {/* 1. MODO RACHAS (HIGHLIGHT) */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-amber-500/30 hover:border-amber-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4">
                                            <Flame size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full mb-2">
                                            🔥 MODO RACHAS EN VIVO
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Encendé tu Racha de Victorias
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Cada victoria consecutiva activa insignias especiales en tu perfil. Alcanzá rachas de 3, 5 y 10 triunfos y subí de posición en el ranking más rápido.
                                        </p>
                                    </div>

                                    {/* Interactive Streak Simulator */}
                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
                                        <div className="flex justify-between items-center text-xs mb-2">
                                            <span className="text-slate-400">Racha Actual Simulada:</span>
                                            <span className="font-bold text-amber-400 font-mono flex items-center gap-1">
                                                <Flame size={14} /> {currentStreak} victorias
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4, 5].map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setCurrentStreak(st)}
                                                    className={`flex-1 py-1 rounded-lg text-center text-[10px] font-bold font-mono transition-all ${
                                                        currentStreak >= st
                                                            ? 'bg-gradient-to-r from-amber-500 to-[#e15b34] text-white shadow-sm'
                                                            : 'bg-white/5 text-slate-500'
                                                    }`}
                                                >
                                                    {st}W 🔥
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. STORIES EFÍMERAS DEL CLUB */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                                            <Camera size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full mb-2">
                                            📸 COMUNIDAD 24 HORAS
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Stories del Club & Festejos
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Compartí tus mejores momentos, fotos levantando la copa o festejando en el club. Disponibles por 24 horas para toda la comunidad tenística.
                                        </p>
                                    </div>

                                    {/* Mockup Stories Avatar List */}
                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-11 h-11 rounded-full ring-2 ring-purple-500 ring-offset-2 ring-offset-black bg-gradient-to-tr from-purple-600 to-[#ccff00] p-0.5 flex items-center justify-center">
                                                <span className="font-bold text-xs text-white">FR</span>
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 bg-purple-500 text-[9px] font-bold px-1 rounded-full">🏆</span>
                                        </div>
                                        <div className="text-left text-xs">
                                            <div className="font-bold text-white">Federico Rossi</div>
                                            <div className="text-slate-400 text-[11px]">«¡Campeón Smash 250! 🥇» (hace 1h)</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. MODO HISTORIA & H2H */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-4">
                                            <Swords size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full mb-2">
                                            ⚔️ HEAD-TO-HEAD
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Modo Historia & Duelo de Rivales
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Tu ficha profesional con historial de todos tus partidos, sets jugados, efectividad y comparador directo cara a cara con rivales de tu categoría.
                                        </p>
                                    </div>

                                    {/* H2H Mini Widget */}
                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
                                        <div className="flex justify-between items-center text-xs mb-1.5">
                                            <span className="font-bold text-white">F. Rossi</span>
                                            <span className="font-mono text-[#ccff00] font-black bg-white/5 px-2 py-0.5 rounded">3 - 2</span>
                                            <span className="font-bold text-slate-300">G. Maidana</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 text-center">Último: 7-6, 4-6, 10-8 (Súper Tie-Break)</div>
                                    </div>
                                </div>
                            </div>

                            {/* PLAYER CTA */}
                            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#ccff00]/10 via-black to-[#0f131c] border border-[#ccff00]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-bold text-white">¿Listo para salir a la cancha?</h4>
                                    <p className="text-xs text-slate-400">Creá tu ficha de jugador 100% gratuita y empezá a sumar puntos hoy mismo.</p>
                                </div>
                                <button
                                    onClick={() => onOpenAuth('register', 'player')}
                                    className="px-6 py-3 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-[#ccff00]/20 transition-all cursor-pointer whitespace-nowrap"
                                >
                                    Crear mi Ficha de Jugador Gratis
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        VISTA 2: SOY ORGANIZADOR / CLUB (EL CENTRO DE MANDO)
                    ======================================================== */}
                    {activeRole === 'organizer' && (
                        <div className="space-y-12 animate-fade-in">
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e15b34]/10 border border-[#e15b34]/20 text-[#e15b34] text-xs font-bold mb-3">
                                    <Shield size={14} /> CENTRO DE CONTROL DEL CLUB • 0 COSTOS FIJOS
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                                    Organizá torneos y turnos sin estrés
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    Sorteo automático con cabezas de serie del ranking, grilla de canchas con protocolo de lluvia y 100% libre de abonos fijos mensuales.
                                </p>
                            </div>

                            {/* BENTO GRID: ORGANIZADOR */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                
                                {/* 1. SORTEOS Y SEEDS */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-[#e15b34]/30 hover:border-[#e15b34]/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-[#e15b34]/15 text-[#e15b34] flex items-center justify-center mb-4">
                                            <Trophy size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#e15b34] bg-[#e15b34]/10 px-2 py-0.5 rounded-full mb-2">
                                            🏆 SEEDS DEL RANKING
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Sorteo Automático con Seeds
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            El algoritmo posiciona a los líderes de ranking en extremos opuestos para evitar cruces tempranos. Genera planillas A4 listas para imprimir.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs">
                                        <div className="flex justify-between font-bold text-white mb-1">
                                            <span>Seed #1: F. Rossi (1°)</span>
                                            <span className="text-[#ccff00]">Cuadro Superior</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-white">
                                            <span>Seed #2: G. Maidana (2°)</span>
                                            <span className="text-[#ccff00]">Cuadro Inferior</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. CANCHAS, TURNOS Y LLUVIA */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-blue-500/30 hover:border-blue-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
                                            <CloudRain size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full mb-2">
                                            🌧️ PROTOCOLO POR LLUVIA
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Turnos, Iluminación & Clima
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Administrá canchas de polvo, rápida y pádel. En caso de lluvia, reprogramá toda la jornada en 1 clic notificando a socios de inmediato.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs">
                                        <div className="flex justify-between text-slate-300 mb-1">
                                            <span>Comisión alquiler:</span>
                                            <span className="text-[#ccff00] font-bold font-mono">Solo 3%</span>
                                        </div>
                                        <div className="text-[11px] text-blue-300">✅ Reprogramación masiva en 1 clic</div>
                                    </div>
                                </div>

                                {/* 3. $0 FIJOS & CAJA */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                                            <DollarSign size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mb-2">
                                            💰 RIESGO CERO
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Cero Abonos Mensuales
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Sin costos de alta ni cuotas fijas mensuales. Solo 5% sobre inscripciones de torneos disputados y 3% en turnos. Si no hay actividad, no pagás nada.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-center">
                                        <span className="text-emerald-400 font-bold font-mono text-sm">
                                            $0 Costo Fijo Mensual
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* SIMULADOR FINANCIERO */}
                            <div className="p-6 sm:p-8 rounded-3xl bg-[#0f131c] border border-white/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div>
                                        <div className="text-xs font-bold text-[#ccff00] uppercase mb-1">Simulador Financiero de Torneo</div>
                                        <h3 className="text-xl font-bold text-white mb-3">Probá la recaudación neta de tu club</h3>
                                        <div className="space-y-4 text-xs">
                                            <div>
                                                <div className="flex justify-between text-slate-300 mb-1">
                                                    <span>Inscriptos en Torneo:</span>
                                                    <span className="font-bold text-white font-mono">{simPlayers} jugadores</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="8"
                                                    max="64"
                                                    step="4"
                                                    value={simPlayers}
                                                    onChange={(e) => setSimPlayers(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e15b34]"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-slate-300 mb-1">
                                                    <span>Inscripción por jugador:</span>
                                                    <span className="font-bold text-[#ccff00] font-mono">${simFee.toLocaleString('es-AR')}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="5000"
                                                    max="50000"
                                                    step="1000"
                                                    value={simFee}
                                                    onChange={(e) => setSimFee(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ccff00]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl bg-black/50 border border-white/10 text-center">
                                        <div className="text-xs text-slate-400 uppercase mb-1">Ganancia Neta para tu Club (95%)</div>
                                        <div className="text-3xl font-black text-[#ccff00] font-mono mb-3">
                                            ${netClubIncome.toLocaleString('es-AR')}
                                        </div>
                                        <button
                                            onClick={() => onOpenAuth('register', 'admin')}
                                            className="w-full py-3 rounded-xl bg-[#e15b34] hover:bg-[#f26d46] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                                        >
                                            Crear mi Club / Sede Gratis
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        VISTA 3: SOY PROFESOR / COACH (EL FORMADOR)
                    ======================================================== */}
                    {activeRole === 'coach' && (
                        <div className="space-y-12 animate-fade-in">
                            <div className="text-center max-w-2xl mx-auto">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
                                    <GraduationCap size={14} /> PANEL DEL ENTRENADOR • SEGUIMIENTO Y ESCUELA
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                                    Potenciá el desarrollo de tus alumnos
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    Seguimiento de evolución de ranking, nivelación de categorías y organización de torneos formativos o clínicas para tu academia.
                                </p>
                            </div>

                            {/* BENTO GRID: PROFESOR */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                
                                {/* 1. SEGUIMIENTO DE ALUMNOS */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-4">
                                            <TrendingUp size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full mb-2">
                                            📈 EVOLUCIÓN TÉCNICA
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Ficha y Métricas de Alumnos
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Accedé al historial de partidos oficiales de tus alumnos, efectividad de primeros saques, tie-breaks y desempeño bajo presión.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs">
                                        <div className="flex justify-between text-slate-300 mb-1">
                                            <span>Martín G. (3ra Cat):</span>
                                            <span className="text-[#ccff00] font-bold">+350 pts este mes</span>
                                        </div>
                                        <div className="text-[11px] text-cyan-400">🔥 75% efectividad en tie-breaks</div>
                                    </div>
                                </div>

                                {/* 2. NIVELACIÓN Y CATEGORÍAS */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                                            <Target size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full mb-2">
                                            🎯 CATEGORIZACIÓN OFICIAL
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Nivelación & Ascensos
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Validá o recomendá el cambio de categoría (5ta, 4ta, 3ra, 2da, 1ra) basado en datos empíricos de juego y resultados en torneos.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs">
                                        <div className="text-slate-300">Sugerencia Automática:</div>
                                        <div className="text-[11px] text-purple-300 font-semibold mt-0.5">
                                            «Listo para ascender a 2da Categoría»
                                        </div>
                                    </div>
                                </div>

                                {/* 3. TORNEOS DE ESCUELA */}
                                <div className="p-6 rounded-3xl bg-[#0f131c] border border-[#ccff00]/30 hover:border-[#ccff00]/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-2xl bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center mb-4">
                                            <Users size={22} />
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-full mb-2">
                                            🎾 CLÍNICAS Y TORNEOS
                                        </div>
                                        <h3 className="text-base font-bold text-white mb-2">
                                            Eventos Internos de Academia
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Organizá torneos internos relámpago, dobles rotativos y clínicas de fin de semana con armado automático de zonas en minutos.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-center">
                                        <span className="text-[#ccff00] font-bold">1-Click Torneos Relámpago</span>
                                    </div>
                                </div>
                            </div>

                            {/* COACH CTA */}
                            <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-black to-[#0f131c] border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-bold text-white">¿Sos profesor o dirigís una academia?</h4>
                                    <p className="text-xs text-slate-400">Creá tu cuenta de profesor o sumate con tu club para administrar tus alumnos.</p>
                                </div>
                                <button
                                    onClick={() => onOpenAuth('register', 'admin')}
                                    className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-cyan-400/20 transition-all cursor-pointer whitespace-nowrap"
                                >
                                    Sumar mi Escuela / Academia
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* PADEL EXPANSION TEASER */}
            <section className="py-14 max-w-4xl mx-auto px-4 sm:px-6">
                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-purple-900/25 via-blue-900/20 to-[#0f131c] border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold mb-2">
                            <Sparkle size={12} /> PRÓXIMAMENTE
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Módulo Completo de Pádel</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-md">
                            Rankings en duplas, categorías de 1ra a 8va y administración de canchas de cristal y muro en el mismo panel.
                        </p>
                    </div>
                    <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-purple-200 shrink-0">
                        Tenis + Pádel Unificados
                    </span>
                </div>
            </section>

            {/* CONCISE FAQ */}
            <section id="faq" className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-8">
                    <span className="text-xs font-bold text-[#ccff00] uppercase">Preguntas Frecuentes</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Dudas comunes resueltas</h2>
                </div>

                <div className="space-y-3">
                    {[
                        {
                            q: "¿Cómo es el esquema de costos para los clubes?",
                            a: "Smash no cobra ningún abono mensual, costo de alta ni mantenimiento fijo. Operamos bajo un modelo transparente por éxito: solo un 5% sobre inscripciones de torneos disputados y solo un 3% sobre el valor de alquiler de canchas. Si no hay actividad, el costo es $0."
                        },
                        {
                            q: "¿Es gratis para los jugadores?",
                            a: "Sí, 100% gratuito de por vida. Registro, ficha pro, modo rachas, stories, ranking en vivo, búsqueda de pareja de dobles y reserva de turnos son totalmente libres de costo."
                        },
                        {
                            q: "¿Cómo funciona el Modo Rachas?",
                            a: "Al acumular victorias consecutivas en torneos o partidos oficiales, el sistema desbloquea insignias de racha en tu perfil (3W, 5W, 10W) que aumentan tu prestigio en la comunidad y bonifican tu ranking."
                        },
                        {
                            q: "¿Cómo se asignan los Cabezas de Serie en los torneos?",
                            a: "El algoritmo lee automáticamente los puntos del ranking de cada inscripto y los ubica en extremos opuestos del cuadro para evitar cruces prematuros."
                        },
                        {
                            q: "¿Qué ocurre en caso de lluvia?",
                            a: "El sistema cuenta con un botón de reprogramación ágil que avisa a los jugadores y permite mover horarios en la grilla sin perder resultados ya cargados."
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-[#0f131c] border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full p-4 text-left font-bold text-white text-xs sm:text-sm flex justify-between items-center hover:text-[#ccff00] transition-colors cursor-pointer"
                            >
                                <span>{item.q}</span>
                                {openFaq === idx ? <ChevronUp size={16} className="text-[#ccff00]" /> : <ChevronDown size={16} className="text-slate-500" />}
                            </button>
                            {openFaq === idx && (
                                <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 text-center">
                <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#e15b34] via-[#b83d1b] to-[#07090e] border border-[#e15b34]/30 shadow-2xl">
                    <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                        Comenzá a potenciar tu juego o tu club hoy mismo
                    </h2>
                    <p className="text-white/80 text-xs sm:text-sm max-w-lg mx-auto mb-8 font-normal">
                        Sumate a los clubes, profesores y jugadores que ya organizan su pasión con Smash. Sin costos fijos, sin riesgos.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => onOpenAuth('register', 'admin')}
                            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all cursor-pointer"
                        >
                            Crear Club Gratis
                        </button>
                        <button
                            onClick={() => onOpenAuth('register', 'player')}
                            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-black/40 text-white font-bold text-xs sm:text-sm border border-white/20 hover:bg-black/60 transition-all cursor-pointer"
                        >
                            Registro de Jugador
                        </button>
                    </div>
                </div>
            </section>

            {/* CLEAN FOOTER */}
            <footer className="border-t border-white/10 bg-[#040508] py-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <img src="/Smash.png" alt="Smash Tenis" className="h-7 w-auto object-contain" />
                        <span className="font-bold text-slate-300">Smash Tenis & Pádel</span>
                    </div>

                    <div className="flex items-center gap-3.5">
                        <span className="text-sm text-slate-400 font-medium">Desarrollado por</span>
                        <a href="https://www.lnx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center">
                            <img src="/lynx-logo-blanco.png" alt="LYNX" className="h-9 md:h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]" />
                        </a>
                    </div>

                    <div>
                        © {new Date().getFullYear()} Smash Tennis Manager. Todos los derechos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
};
