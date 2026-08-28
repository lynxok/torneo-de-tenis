import React, { useState } from 'react';
import {
    Trophy, Users, Calendar, ShieldCheck, Zap, CloudRain, DollarSign,
    Award, Flame, Star, Sparkles, Clock, Smartphone, MessageCircle,
    ChevronRight, CheckCircle2, ArrowRight, Target, Layers, Check,
    Shield, ChevronDown, ChevronUp, Sparkle, Heart, RefreshCw, BarChart3,
    CalendarCheck, UserCheck, Play
} from 'lucide-react';

interface LandingPageProps {
    onOpenAuth: (mode?: 'login' | 'register', role?: 'player' | 'admin') => void;
    onExploreAsGuest?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
    // Active audience tab: 'organizers' vs 'players'
    const [audience, setAudience] = useState<'organizers' | 'players'>('organizers');

    // Interactive showcase tab
    const [activeFeature, setActiveFeature] = useState<'brackets' | 'bookings' | 'history' | 'matchmaking'>('brackets');

    // Simple calculator state
    const [simPlayers, setSimPlayers] = useState<number>(32);
    const [simFee, setSimFee] = useState<number>(20000);

    // FAQ Accordion
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // Calculation
    const grossTotal = simPlayers * simFee;
    const netClubIncome = Math.round(grossTotal * 0.95);

    return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-[#e15b34] selection:text-white antialiased overflow-x-hidden">
            {/* Subtle background glow effect */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#e15b34]/15 via-[#ccff00]/5 to-transparent rounded-full blur-[120px]" />
                <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
            </div>

            {/* Top Navbar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-[#07090e]/80 border-b border-white/10">
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

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <button
                            type="button"
                            onClick={() => {
                                setAudience('organizers');
                                document.getElementById('seccion-roles')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`transition-colors ${audience === 'organizers' ? 'text-white font-bold' : 'hover:text-white'}`}
                        >
                            Para Clubes
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAudience('players');
                                document.getElementById('seccion-roles')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`transition-colors ${audience === 'players' ? 'text-[#ccff00] font-bold' : 'hover:text-white'}`}
                        >
                            Para Jugadores
                        </button>
                        <a href="#demo" className="hover:text-white transition-colors">Funcionalidades</a>
                        <a href="#precios" className="hover:text-white transition-colors">0 Costos Fijos</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                    </nav>

                    {/* CTAs */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onOpenAuth('login')}
                            className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                        >
                            Ingresar
                        </button>
                        <button
                            onClick={() => onOpenAuth('register', 'admin')}
                            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-[#ccff00] hover:bg-[#b8e600] rounded-xl shadow-md shadow-[#ccff00]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Crear Club Gratis
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
                {/* Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">
                        La plataforma moderna para deportes de raqueta • Sin abonos fijos
                    </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] mb-6">
                    El epicentro de tu juego.{' '}
                    <span className="bg-gradient-to-r from-[#e15b34] via-[#ff7c4d] to-[#ccff00] bg-clip-text text-transparent">
                        Donde cada punto cuenta.
                    </span>
                </h1>

                {/* Subhead */}
                <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
                    Gestioná torneos con sorteo automático por ranking, administrá turnos con control de lluvia y caja, y viví tu modo historia profesional en tenis y pádel.
                </p>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-16">
                    <button
                        onClick={() => onOpenAuth('register', 'admin')}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#e15b34] to-[#f26d46] text-white font-bold text-sm shadow-lg shadow-[#e15b34]/25 hover:shadow-xl hover:shadow-[#e15b34]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Trophy size={18} />
                        <span>Digitalizar mi Club</span>
                    </button>
                    <button
                        onClick={() => onOpenAuth('register', 'player')}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Users size={18} className="text-[#ccff00]" />
                        <span>Registrarme como Jugador</span>
                    </button>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-8 border-t border-white/10 text-left">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-xl font-black text-[#ccff00] font-mono">$0 Fijos</div>
                        <div className="text-xs text-slate-400 mt-0.5">Sin costos mensuales de mantenimiento.</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-xl font-black text-[#e15b34] font-mono">Seeds Auto</div>
                        <div className="text-xs text-slate-400 mt-0.5">Zonas y llaves con cabezas de serie del ranking.</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-xl font-black text-cyan-400 font-mono">Modo Historia</div>
                        <div className="text-xs text-slate-400 mt-0.5">Ficha pro con estadísticas y Head to Head.</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-xl font-black text-purple-400 font-mono">PWA 1-Click</div>
                        <div className="text-xs text-slate-400 mt-0.5">Instalable en iOS y Android al instante.</div>
                    </div>
                </div>
            </section>

            {/* INTERACTIVE PRODUCT TOUR (CLEAN TABBED DEMO) */}
            <section id="demo" className="relative z-10 py-16 bg-[#040508]/80 border-y border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-bold text-[#ccff00] uppercase tracking-wider">Demostración en Vivo</span>
                        <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 mb-3">
                            Todo lo que necesitás, en una sola app
                        </h2>
                        <p className="text-slate-400 text-sm">
                            Hacé clic en cada función para ver cómo Smash resuelve la gestión deportiva en segundos.
                        </p>
                    </div>

                    {/* Interactive Feature Selector */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {[
                            { id: 'brackets', label: '🏆 Sorteos & Seeds', icon: Trophy },
                            { id: 'bookings', label: '📅 Canchas & Lluvia', icon: CloudRain },
                            { id: 'history', label: '⚡ Modo Historia & H2H', icon: Award },
                            { id: 'matchmaking', label: '👥 Parejas & Sparring', icon: Users },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeFeature === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveFeature(tab.id as any)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                                        isActive
                                            ? 'bg-[#e15b34] text-white shadow-md shadow-[#e15b34]/30'
                                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Interactive Mockup Container */}
                    <div className="bg-[#0f131c] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl">
                        {activeFeature === 'brackets' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                    <div className="text-xs font-bold text-[#ccff00] uppercase">
                                        Generación Automática de Zonas y Llaves
                                    </div>
                                    <span className="text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                                        Seeds asignados por ranking en vivo
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-[10px] text-[#e15b34] font-bold uppercase mb-1.5 flex justify-between">
                                            <span>Cuadro Superior</span>
                                            <span className="bg-[#e15b34]/20 px-1.5 py-0.5 rounded">Seed #1</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-sm text-white">
                                            <span>Federico Rossi (1°)</span>
                                            <span className="font-mono text-[#ccff00]">6 6</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                                            <span>Lucas Benítez</span>
                                            <span className="font-mono">3 2</span>
                                        </div>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-[10px] text-[#ccff00] font-bold uppercase mb-1.5 flex justify-between">
                                            <span>Cuadro Inferior</span>
                                            <span className="bg-[#ccff00]/20 px-1.5 py-0.5 rounded text-[#ccff00]">Seed #2</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-sm text-white">
                                            <span>Gonzalo Maidana (2°)</span>
                                            <span className="font-mono text-[#ccff00]">6 6</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                                            <span>Ramiro Díaz</span>
                                            <span className="font-mono">4 3</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                                    <span>✨ Los favoritos no se cruzan en primeras rondas. Planilla A4 lista para imprimir en 1 clic.</span>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'bookings' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                    <div className="text-xs font-bold text-blue-400 uppercase">
                                        Grilla de Turnos & Protocolo de Lluvia
                                    </div>
                                    <span className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CloudRain size={12} /> Alerta por Clima Activa
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                        <div className="font-bold">Cancha 1 (Polvo)</div>
                                        <div className="text-[11px] text-slate-400 mt-1">16:00 hs • Jugado</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                        <div className="font-bold">Cancha 2 (Rápida)</div>
                                        <div className="text-[11px] text-slate-400 mt-1">17:30 hs • En curso</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                        <div className="font-bold">Cancha 3 (Luz)</div>
                                        <div className="text-[11px] text-slate-400 mt-1">19:00 hs • Reservado</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 flex items-center justify-between">
                                    <span>🌧️ ¿Llovió? Reprogramá la jornada entera con 1 clic sin perder resultados cargados.</span>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'history' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                    <div className="text-xs font-bold text-cyan-400 uppercase">
                                        Ficha Profesional & Historial H2H
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                        Federico Rossi • 3ra Categoría
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-lg font-bold text-[#ccff00] font-mono">1.450</div>
                                        <div className="text-[10px] text-slate-400">Puntos Ranking</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-lg font-bold text-white font-mono">78%</div>
                                        <div className="text-[10px] text-slate-400">Efectividad Sets</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-lg font-bold text-amber-400 font-mono">4 🏆</div>
                                        <div className="text-[10px] text-slate-400">Títulos Ganados</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                        <div className="text-lg font-bold text-cyan-400 font-mono">#1</div>
                                        <div className="text-[10px] text-slate-400">Posición Actual</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                                    <span>⚔️ Compará tu historial Head-to-Head frente a frente con cualquier tenista del circuito.</span>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'matchmaking' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                    <div className="text-xs font-bold text-purple-400 uppercase">
                                        Buscador de Pareja de Dobles & Sparring
                                    </div>
                                    <span className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                        Comunidad Activa
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-bold text-white">Búsqueda de Dobles:</span>{' '}
                                            <span className="text-slate-400">Torneo Smash 250 (4ta Cat) • Club Parque España</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded bg-[#ccff00]/10 text-[#ccff00] font-bold">Postularme</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="font-bold text-white">Sparring Hoy 18:30:</span>{' '}
                                            <span className="text-slate-400">Peloteo de entrenamiento • 3ra Cat</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded bg-[#e15b34]/10 text-[#e15b34] font-bold">Sumarme</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                                    <span>🎾 Nunca más te quedes sin jugar por falta de compañero o rival.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* BENTO GRID: FOR CLUBS & FOR PLAYERS */}
            <section id="seccion-roles" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
                {/* Section Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1 rounded-2xl bg-[#0f131c] border border-white/10 shadow-lg">
                        <button
                            type="button"
                            onClick={() => setAudience('organizers')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                                audience === 'organizers'
                                    ? 'bg-[#e15b34] text-white shadow-md shadow-[#e15b34]/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Shield size={16} />
                            <span>Para Organizadores & Clubes</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAudience('players')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                                audience === 'players'
                                    ? 'bg-[#ccff00] text-slate-950 shadow-md shadow-[#ccff00]/25'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Trophy size={16} />
                            <span>Para Jugadores</span>
                        </button>
                    </div>
                </div>

                {audience === 'organizers' ? (
                    <div id="clubes" className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Card 1 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-[#e15b34]/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-[#e15b34]/15 text-[#e15b34] flex items-center justify-center mb-4">
                                    <Trophy size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Sorteos & Seeds Automáticos</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Zonas y llaves armadas en 1 clic respetando cabezas de serie del ranking. Planillas A4 listas para mesa de control.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Sagas anuales Challenger a Masters
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-[#ccff00]/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center mb-4">
                                    <CloudRain size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Canchas, Turnos & Clima</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Grilla por tipo de cancha y luces. Protocolo de cancelación por lluvia con reprogramación ágil y avisos a socios.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Solo 3% por valor de alquiler
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-emerald-400/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                                    <DollarSign size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Caja en Vivo & 0 Costos Fijos</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Arqueo de ingresos por turnos y torneos. Sin abonos mensuales: 5% por torneo y solo 3% por turno alquilado.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Cero riesgo para el club
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div id="jugadores" className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Player Card 1 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-[#ccff00]/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center mb-4">
                                    <Award size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Modo Historia & Ficha Pro</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Historial completo de partidos, efectividad, copas ganadas y gráfico de evolución de ranking de tu categoría.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Puntos oficiales por partido
                                </div>
                            </div>

                            {/* Player Card 2 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-purple-400/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
                                    <Users size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">Matchmaking & Pareja de Dobles</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Encontrá compañero para el próximo torneo o sparring para pelotear hoy mismo según tu nivel y zona.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Stories efímeras del club
                                </div>
                            </div>

                            {/* Player Card 3 */}
                            <div className="p-6 rounded-2xl bg-[#0f131c] border border-white/10 hover:border-cyan-400/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-4">
                                    <Smartphone size={20} />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">100% Gratis & App Móvil</h3>
                                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                    Reservá turnos e inscribite a torneos desde tu celular con PWA instalable sin costo alguno para el jugador.
                                </p>
                                <div className="text-[11px] text-[#ccff00] font-semibold flex items-center gap-1">
                                    <Check size={13} /> Sin descargas pesadas
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* CLEAN CALCULATOR & TRANSPARENT PRICING */}
            <section id="precios" className="py-16 bg-[#040508]/60 border-y border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="bg-[#0f131c] border border-white/10 rounded-3xl p-6 sm:p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div>
                                <span className="text-xs font-bold text-[#ccff00] uppercase">Filosofía Sin Costos Fijos</span>
                                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-3">
                                    Tu club no paga abonos mensuales
                                </h2>
                                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                                    Modelo 100% por uso: <strong>5% por torneo disputado</strong> y solo <strong>3% por valor de alquiler de cancha</strong>. Si no hay actividad, no pagás nada.
                                </p>

                                <div className="space-y-4 text-xs font-medium">
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

                            {/* Clean Result Card */}
                            <div className="p-6 rounded-2xl bg-black/50 border border-white/10 text-center">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Ingreso Neto Torneo para tu Club
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-[#ccff00] font-mono mb-2">
                                    ${netClubIncome.toLocaleString('es-AR')}
                                </div>
                                <div className="space-y-1 text-[11px] text-slate-400 mb-6 py-2 border-y border-white/5">
                                    <div className="flex justify-between">
                                        <span>Comisión Torneo:</span>
                                        <span className="text-white font-bold font-mono">5%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Comisión Alquiler Canchas:</span>
                                        <span className="text-[#ccff00] font-bold font-mono">3% por turno</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Costo Fijo Mensual:</span>
                                        <span className="text-emerald-400 font-bold font-mono">$0 (Gratis)</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenAuth('register', 'admin')}
                                    className="w-full py-3 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 font-bold text-xs sm:text-sm transition-all"
                                >
                                    Crear mi Club / Torneo Gratis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PADEL EXPANSION TEASER (CLEAN & MINIMAL) */}
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
                            a: "Sí, 100% gratuito. Registro, ficha pro, ranking en vivo, búsqueda de pareja de dobles y reserva de turnos son libres de costo."
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
                                className="w-full p-4 text-left font-bold text-white text-xs sm:text-sm flex justify-between items-center hover:text-[#ccff00] transition-colors"
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
                        Comenzá a potenciar tu club hoy mismo
                    </h2>
                    <p className="text-white/80 text-xs sm:text-sm max-w-lg mx-auto mb-8 font-normal">
                        Sumate a los clubes y jugadores que ya organizan su pasión con Smash. Sin costos fijos, sin riesgos.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => onOpenAuth('register', 'admin')}
                            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all"
                        >
                            Crear Club Gratis
                        </button>
                        <button
                            onClick={() => onOpenAuth('register', 'player')}
                            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-black/40 text-white font-bold text-xs sm:text-sm border border-white/20 hover:bg-black/60 transition-all"
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
                        <a href="https://lynx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center">
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
