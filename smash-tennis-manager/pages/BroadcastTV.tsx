import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Tournament, Match, Institution, UserProfile, TournamentPlayer } from '../types';
import { QRCodeSVG } from '../components/QRCodeSVG';
import { soundEffects } from '../services/soundEffects';
import { calculateGroupStandings, organizePlayoffRounds, GroupZone } from '../utils/bracketHelper';
import { getTournamentTier } from '../utils/tournamentTiers';
import { getTournamentCoordinates } from '../utils/geoUtils';
import { 
    Tv, Play, Pause, Maximize, Minimize, Volume2, VolumeX, ArrowLeft,
    Clock, Calendar, CloudSun, Trophy, Swords, Users, Sparkles,
    MapPin, Wind, Droplets, CheckCircle2, ShieldCheck, QrCode, Building, Layers
} from 'lucide-react';

interface BroadcastTVProps {
    user?: UserProfile | null;
    initialTournamentId?: string;
    onExit?: () => void;
}

type TVSlide = 'live' | 'order_of_play' | 'standings' | 'playoffs' | 'weather' | 'qr';

export const BroadcastTV: React.FC<BroadcastTVProps> = ({ user, initialTournamentId, onExit }) => {
    const isSuperAdmin = user?.role === 'superadmin';
    const isOrgAdmin = user?.role === 'admin' || user?.role === 'professor' || user?.role === 'coordinator';

    // Get URL Params for public TV / Chromecast links (e.g. ?view=tv&club=inst-1)
    const urlParams = useMemo(() => {
        return typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    }, []);

    const urlClubParam = urlParams.get('club') || urlParams.get('c') || urlParams.get('institution');
    const urlTournamentParam = initialTournamentId || urlParams.get('tournament') || urlParams.get('t');

    // Institution State
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(() => {
        if (isOrgAdmin && user?.institution_id) return user.institution_id;
        if (urlClubParam) return urlClubParam;
        if (isSuperAdmin) return 'all';
        return '';
    });

    // Tournaments & Matches State
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>(urlTournamentParam || '');
    const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    // TV Slides & Timing
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [slideDuration, setSlideDuration] = useState(15); // seconds
    const [slideProgress, setSlideProgress] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Weather State
    const [weather, setWeather] = useState<{
        temp: number;
        apparentTemp: number;
        windSpeed: number;
        windGusts: number;
        humidity: number;
        weatherCode: number;
        daily: Array<{ date: string; maxTemp: number; minTemp: number; rainSum: number; windSpeed: number; code: number }>;
    } | null>(null);

    const slides: { id: TVSlide; label: string; icon: any }[] = [
        { id: 'live', label: 'Canchas en Vivo', icon: Swords },
        { id: 'order_of_play', label: 'Orden de Juego', icon: Clock },
        { id: 'standings', label: 'Tablas de Zonas', icon: Users },
        { id: 'playoffs', label: 'Cuadro de Llaves', icon: Trophy },
        { id: 'weather', label: 'Clima & Canchas', icon: CloudSun },
        { id: 'qr', label: 'Inscripciones QR', icon: QrCode },
    ];

    // Clock ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load initial institutions & tournaments
    const fetchData = async () => {
        try {
            const [allTourneys, allInsts] = await Promise.all([
                api.tournaments.getAll(),
                api.institutions.getAll()
            ]);

            setInstitutions(allInsts);

            // Determine effective institution filter
            let effectiveInstId = selectedInstitutionId;
            if (isOrgAdmin && user?.institution_id) {
                effectiveInstId = user.institution_id;
            } else if (!effectiveInstId && allInsts.length > 0) {
                effectiveInstId = urlClubParam || (isSuperAdmin ? 'all' : allInsts[0].id);
            }
            setSelectedInstitutionId(effectiveInstId);

            // Filter tournaments by institution
            const filteredTourneys = allTourneys.filter(t => {
                if (effectiveInstId === 'all') return true;
                return t.institution_id === effectiveInstId;
            });

            setTournaments(filteredTourneys);

            // Find current active tournament
            let targetTourney = filteredTourneys.find(t => t.id === selectedTournamentId) || 
                                filteredTourneys.find(t => t.status === 'ongoing' || t.status === 'in_progress') ||
                                filteredTourneys[0] || null;

            if (targetTourney) {
                setSelectedTournamentId(targetTourney.id);
                const fullTourney = await api.tournaments.getById(targetTourney.id);
                setActiveTournament(fullTourney);
                setMatches(fullTourney?.matches || []);
                setPlayers(fullTourney?.tournament_players || []);
            } else {
                setActiveTournament(null);
                setMatches([]);
                setPlayers([]);
            }
        } catch (e) {
            console.error("Error fetching broadcast data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const pollInterval = setInterval(fetchData, 25000);
        return () => clearInterval(pollInterval);
    }, [selectedInstitutionId]);

    // When tournament selector changes manually
    const handleSelectTournament = async (tId: string) => {
        setSelectedTournamentId(tId);
        if (!tId) return;
        setLoading(true);
        try {
            const full = await api.tournaments.getById(tId);
            setActiveTournament(full);
            setMatches(full?.matches || []);
            setPlayers(full?.tournament_players || []);
        } catch (e) {
            console.error("Error changing tournament in BroadcastTV:", e);
        } finally {
            setLoading(false);
        }
    };

    // Active Institution Details
    const currentInstitution = useMemo(() => {
        if (selectedInstitutionId === 'all') return null;
        return institutions.find(i => i.id === selectedInstitutionId) || null;
    }, [institutions, selectedInstitutionId]);

    const clubName = useMemo(() => {
        if (currentInstitution?.name) return currentInstitution.name;
        if (activeTournament?.institution_name) return activeTournament.institution_name;
        if (user?.institution && isOrgAdmin) return user.institution;
        if (selectedInstitutionId === 'all') return 'Circuito General Smash Tenis';
        return 'Club de Tenis';
    }, [currentInstitution, activeTournament, user, isOrgAdmin, selectedInstitutionId]);

    // Fetch live weather for active institution coordinates
    useEffect(() => {
        let lat = -32.0664;
        let lon = -60.6384;

        if (currentInstitution) {
            if (currentInstitution.latitude && currentInstitution.longitude) {
                lat = currentInstitution.latitude;
                lon = currentInstitution.longitude;
            } else {
                const geo = getTournamentCoordinates({ 
                    institutions: currentInstitution, 
                    institution_name: currentInstitution.name,
                    city: currentInstitution.city 
                });
                lat = geo.lat;
                lon = geo.lng;
            }
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=America%2FArgentina%2FBuenos_Aires`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.current && data.daily) {
                    const daily = data.daily.time.slice(0, 5).map((date: string, i: number) => ({
                        date,
                        maxTemp: Math.round(data.daily.temperature_2m_max[i]),
                        minTemp: Math.round(data.daily.temperature_2m_min[i]),
                        rainSum: Math.round(data.daily.precipitation_sum[i] || 0),
                        windSpeed: Math.round(data.daily.wind_speed_10m_max[i]),
                        code: data.daily.weather_code[i]
                    }));

                    setWeather({
                        temp: Math.round(data.current.temperature_2m),
                        apparentTemp: Math.round(data.current.apparent_temperature),
                        windSpeed: Math.round(data.current.wind_speed_10m),
                        windGusts: Math.round(data.current.wind_gusts_10m || data.current.wind_speed_10m),
                        humidity: Math.round(data.current.relative_humidity_2m),
                        weatherCode: data.current.weather_code,
                        daily
                    });
                }
            })
            .catch(err => console.warn("OpenMeteo fetch notice in BroadcastTV:", err));
    }, [currentInstitution?.id, currentInstitution?.name, currentInstitution?.city]);

    // Slide Carousel Timer with smooth progress bar
    useEffect(() => {
        if (!isPlaying) return;

        const intervalMs = 100;
        const step = (intervalMs / (slideDuration * 1000)) * 100;

        const timer = setInterval(() => {
            setSlideProgress(prev => {
                if (prev >= 100) {
                    setCurrentSlideIndex(curr => {
                        const next = (curr + 1) % slides.length;
                        if (soundEnabled) soundEffects.playScoreBeep();
                        return next;
                    });
                    return 0;
                }
                return prev + step;
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [isPlaying, slideDuration, slides.length, soundEnabled]);

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    // Filter matches robustly for group stage and playoffs
    const groupMatches = useMemo(() => {
        return matches.filter(m => 
            m.round === 'Fase de Grupos' || 
            Boolean(m.group_number) || 
            Boolean(m.zone) || 
            (m.round && (m.round.toLowerCase().includes('grupo') || m.round.toLowerCase().includes('zona')))
        );
    }, [matches]);

    const playoffMatches = useMemo(() => {
        return matches.filter(m => 
            m.round !== 'Fase de Grupos' && 
            !m.group_number && 
            !m.zone && 
            !(m.round && (m.round.toLowerCase().includes('grupo') || m.round.toLowerCase().includes('zona')))
        );
    }, [matches]);

    // Group calculations (Standings)
    const zones: GroupZone[] = useMemo(() => {
        const effectivePlayers = players.length > 0 ? players : (activeTournament?.tournament_players || []);
        return calculateGroupStandings(groupMatches, effectivePlayers);
    }, [groupMatches, players, activeTournament?.tournament_players]);

    // Playoff rounds
    const playoffRounds = useMemo(() => {
        return organizePlayoffRounds(playoffMatches);
    }, [playoffMatches]);

    // Live matches: either in court right now or scheduled
    const liveMatches = useMemo(() => {
        return matches.filter(m => !m.is_played && (m.scheduling_status === 'scheduled' || m.court || m.round?.includes('Semifinal') || m.round?.includes('Final')));
    }, [matches]);

    const scheduledMatches = useMemo(() => {
        return matches.filter(m => !m.is_played);
    }, [matches]);

    const currentSlide = slides[currentSlideIndex].id;

    // QR Target URL
    const qrUrl = useMemo(() => {
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://smashtenis.lnx.com.ar';
        if (activeTournament?.id) {
            return `${base}/?view=tournament-detail&tournament=${activeTournament.id}`;
        }
        if (selectedInstitutionId && selectedInstitutionId !== 'all') {
            return `${base}/?view=tournaments&club=${selectedInstitutionId}`;
        }
        return `${base}/inicio`;
    }, [activeTournament?.id, selectedInstitutionId]);

    // Helper to format score cleanly
    const parseScoreDisplay = (score: any) => {
        if (!score) return { p1: '-', p2: '-' };
        if (typeof score === 'object') {
            const p1s: string[] = [];
            const p2s: string[] = [];
            ['set1', 'set2', 'set3'].forEach(k => {
                if (score[k]) {
                    const match = String(score[k]).match(/^(\d+)\s*[-/]\s*(\d+)/);
                    if (match) {
                        p1s.push(match[1]);
                        p2s.push(match[2]);
                    }
                }
            });
            if (p1s.length > 0) {
                return { p1: p1s.join('  '), p2: p2s.join('  ') };
            }
        }
        return { p1: '6', p2: '4' };
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex flex-col select-none overflow-hidden font-sans">
            
            {/* TOP BROADCAST HEADER (TV SAFE AREA) */}
            <header className="h-20 bg-slate-950/90 border-b border-primary/30 backdrop-blur px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-2xl gap-4">
                {/* Left: Brand & Institution Scoping */}
                <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    {onExit && (
                        <button 
                            onClick={onExit}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/10 transition-colors shrink-0"
                            title="Volver al panel"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 p-0.5 shadow-lg shadow-primary/30 flex items-center justify-center shrink-0">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <Tv size={22} className="text-primary animate-pulse" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate">SMASH BROADCAST</span>
                                <span className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-md tracking-widest uppercase animate-pulse flex items-center gap-1 shadow-md shadow-red-600/30 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> EN VIVO
                                </span>
                            </div>

                            {/* Institution Display / Selector */}
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                                {isSuperAdmin ? (
                                    /* Super Admin: Can select any institution */
                                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-lg">
                                        <Building size={12} className="text-orange-400 shrink-0" />
                                        <select
                                            value={selectedInstitutionId}
                                            onChange={(e) => {
                                                setSelectedInstitutionId(e.target.value);
                                                setSelectedTournamentId('');
                                            }}
                                            className="bg-transparent text-orange-200 font-bold text-xs outline-none cursor-pointer"
                                        >
                                            <option value="all" className="bg-slate-900 text-white">🌐 Todas las Sedes (General)</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id} className="bg-slate-900 text-white">
                                                    🎾 {inst.name} {inst.city ? `(${inst.city})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    /* Organizer / Admin: Fixed to their own organization */
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-300 truncate">
                                        <MapPin size={12} className="text-primary shrink-0" />
                                        <span className="truncate">{clubName}</span>
                                        {currentInstitution?.city && (
                                            <span className="text-slate-500 text-[11px] hidden md:inline">• {currentInstitution.city}</span>
                                        )}
                                    </div>
                                )}

                                {/* Tournament switcher */}
                                {tournaments.length > 0 && (
                                    <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                        <Layers size={11} className="text-primary shrink-0" />
                                        <select
                                            value={selectedTournamentId}
                                            onChange={(e) => handleSelectTournament(e.target.value)}
                                            className="bg-transparent text-slate-300 text-xs font-bold outline-none cursor-pointer max-w-[140px] sm:max-w-[220px] truncate"
                                        >
                                            {tournaments.map(t => (
                                                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                                                    🏆 {t.name} ({t.category})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Slide Pills Navigation */}
                <div className="hidden lg:flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                    {slides.map((s, idx) => {
                        const Icon = s.icon;
                        const isCurrent = currentSlideIndex === idx;
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setCurrentSlideIndex(idx);
                                    setSlideProgress(0);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    isCurrent
                                        ? 'bg-primary text-slate-950 shadow-lg shadow-primary/30 scale-105'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{s.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Digital Clock & TV Controls */}
                <div className="flex items-center gap-4 shrink-0">
                    {/* Live Clock */}
                    <div className="text-right">
                        <div className="text-xl font-black tracking-wider text-primary font-mono leading-none">
                            {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {currentTime.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                    </div>

                    {/* TV Action Controls */}
                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-2 rounded-lg transition-colors ${isPlaying ? 'text-primary hover:bg-primary/20' : 'text-yellow-400 hover:bg-yellow-400/20'}`}
                            title={isPlaying ? 'Pausar Carrusel' : 'Reanudar Carrusel'}
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        </button>

                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title={soundEnabled ? 'Silenciar campanada' : 'Activar sonido de cambio'}
                        >
                            {soundEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} />}
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Pantalla Completa (F11)"
                        >
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* PROGRESS BAR UNDER HEADER */}
            <div className="w-full h-1.5 bg-slate-950 overflow-hidden shrink-0">
                <div 
                    className="h-full bg-gradient-to-r from-primary via-emerald-400 to-yellow-400 transition-all duration-100 ease-linear shadow-sm"
                    style={{ width: `${slideProgress}%` }}
                ></div>
            </div>

            {/* MAIN STAGE CONTENT */}
            <main className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col justify-center relative">
                
                {/* 1. SLIDE: LIVE COURTS */}
                {currentSlide === 'live' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Swords size={16} /> Central de Canchas
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    Partidos en Cancha & Marcadores en Vivo
                                </h1>
                            </div>
                            {activeTournament && (
                                <div className="text-right hidden sm:block">
                                    <span className="text-sm font-bold text-slate-300">{activeTournament.name}</span>
                                    <div className="text-xs text-primary font-bold">{activeTournament.category} • {activeTournament.gender}</div>
                                </div>
                            )}
                        </div>

                        {liveMatches.length === 0 ? (
                            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-2xl">
                                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-white">No hay partidos en juego en este momento</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto">
                                    Los próximos encuentros de {clubName} comenzarán según el orden de juego programado.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {liveMatches.slice(0, 4).map((m, idx) => {
                                    const parsed = parseScoreDisplay(m.score);
                                    return (
                                        <div key={m.id || idx} className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-2 border-primary/40 rounded-3xl p-6 shadow-2xl shadow-primary/10 flex flex-col justify-between relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bg-primary text-slate-950 font-black text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                                                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span> Cancha {m.court || (idx + 1)}
                                            </div>

                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                {m.round || 'Fase de Zonas'} • {activeTournament?.category || 'Torneo'}
                                            </div>

                                            {/* Scoreboard Block */}
                                            <div className="space-y-4 my-2">
                                                {/* Player 1 */}
                                                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-base border border-primary/30 shrink-0">
                                                            {m.player1_name?.charAt(0) || '1'}
                                                        </div>
                                                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                                                            {m.player1_name || 'Jugador 1'}
                                                        </span>
                                                    </div>
                                                    <span className="text-2xl sm:text-3xl font-black text-primary font-mono px-3 shrink-0">
                                                        {parsed.p1}
                                                    </span>
                                                </div>

                                                {/* Player 2 */}
                                                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-base border border-white/10 shrink-0">
                                                            {m.player2_name?.charAt(0) || '2'}
                                                        </div>
                                                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                                                            {m.player2_name || 'Jugador 2'}
                                                        </span>
                                                    </div>
                                                    <span className="text-2xl sm:text-3xl font-black text-white font-mono px-3 shrink-0">
                                                        {parsed.p2}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                                                <span>Formato: Al mejor de 3 sets (STB a 10)</span>
                                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                    <Sparkles size={12} /> Punto de Oro
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. SLIDE: ORDER OF PLAY */}
                {currentSlide === 'order_of_play' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Clock size={16} /> Programación Oficial
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    Orden de Juego & Próximos Turnos
                                </h1>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                {clubName}
                            </span>
                        </div>

                        {scheduledMatches.length === 0 ? (
                            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center space-y-4">
                                <Clock size={40} className="text-primary mx-auto opacity-70" />
                                <h3 className="text-xl font-bold text-white">No hay partidos programados pendientes</h3>
                                <p className="text-slate-400 text-xs">Todos los encuentros asignados han sido completados.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {scheduledMatches.slice(0, 6).map((m, idx) => (
                                    <div key={m.id || idx} className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-3 hover:border-primary/40 transition-colors shadow-lg">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="px-2.5 py-1 bg-primary/20 text-primary font-bold rounded-lg border border-primary/30">
                                                {m.scheduled_time ? `🕒 ${m.scheduled_time} hs` : `Turno ${idx + 1}`}
                                            </span>
                                            <span className="text-slate-400 font-bold">
                                                Cancha {m.court || ((idx % 3) + 1)}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 py-1">
                                            <div className="text-base font-black text-white flex items-center justify-between">
                                                <span className="truncate">{m.player1_name || 'TBD'}</span>
                                                <span className="text-xs text-primary font-mono font-bold">VS</span>
                                            </div>
                                            <div className="text-base font-black text-white truncate">
                                                {m.player2_name || 'TBD'}
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-400 border-t border-white/10 pt-2 flex justify-between">
                                            <span>{m.round || 'Zona de Clasificación'}</span>
                                            <span className="text-slate-300 font-semibold">{activeTournament?.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. SLIDE: STANDINGS (FASE DE GRUPOS) */}
                {currentSlide === 'standings' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Users size={16} /> Tablas de Posiciones
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    Fase de Grupos & Clasificación a Playoffs
                                </h1>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                Top 2 Clasifican a Llaves
                            </span>
                        </div>

                        {zones.length === 0 ? (
                            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
                                <Users size={40} className="text-primary mx-auto opacity-70" />
                                <h3 className="text-xl font-bold text-white">Sin fase de grupos activa en este torneo</h3>
                                <p className="text-slate-400 text-xs">El torneo se disputa en formato de cuadro directo o aún no ha conformado zonas.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {zones.map((z, idx) => (
                                    <div key={z.groupNumber || idx} className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                                        <div className="bg-slate-950 p-3.5 border-b border-white/10 flex justify-between items-center">
                                            <span className="text-sm font-black text-white uppercase tracking-wider">{z.groupName}</span>
                                            <span className="text-xs text-primary font-bold">{z.players.length} Jugadores</span>
                                        </div>
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-black/30 text-slate-400 font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-3">Pos / Jugador</th>
                                                    <th className="p-3 text-center">PJ</th>
                                                    <th className="p-3 text-center">PG</th>
                                                    <th className="p-3 text-center">PP</th>
                                                    <th className="p-3 text-center">Sets (Dif)</th>
                                                    <th className="p-3 text-center text-primary font-black">Pts</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {z.players.map((st, sIdx) => {
                                                    const isQualified = sIdx < 2;
                                                    return (
                                                        <tr key={st.playerId || sIdx} className={isQualified ? 'bg-primary/5 font-semibold text-white' : 'text-slate-300'}>
                                                            <td className="p-3 flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                                    isQualified ? 'bg-primary text-slate-950' : 'bg-white/10 text-slate-400'
                                                                }`}>
                                                                    {st.rank || sIdx + 1}
                                                                </span>
                                                                <span className="font-bold truncate max-w-[140px] sm:max-w-[180px]">{st.playerName}</span>
                                                            </td>
                                                            <td className="p-3 text-center text-slate-400">{st.matchesPlayed}</td>
                                                            <td className="p-3 text-center text-emerald-400 font-bold">{st.matchesWon}</td>
                                                            <td className="p-3 text-center text-slate-400">{st.matchesLost}</td>
                                                            <td className="p-3 text-center font-mono">
                                                                {st.setsWon}-{st.setsLost} {st.diffSets !== 0 && (
                                                                    <span className={st.diffSets > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                                                        ({st.diffSets > 0 ? `+${st.diffSets}` : st.diffSets})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center text-primary font-black text-sm">{st.points}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. SLIDE: PLAYOFFS / BRACKETS */}
                {currentSlide === 'playoffs' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Trophy size={16} /> Eliminación Directa
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    Cuadro de Llaves & Camino al Campeonato
                                </h1>
                            </div>
                        </div>

                        {playoffRounds.length === 0 ? (
                            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center space-y-4 shadow-xl">
                                <Trophy size={48} className="text-yellow-400 mx-auto" />
                                <h3 className="text-2xl font-bold text-white">Las llaves se conformarán al finalizar la fase de grupos</h3>
                                <p className="text-slate-400 text-sm">Los mejores 2 clasificados de cada zona disputarán las semifinales y finales.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                {playoffRounds.map((round, rIdx) => (
                                    <div key={rIdx} className="space-y-4">
                                        <div className="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 py-2 px-4 rounded-xl text-center">
                                            {round.roundName}
                                        </div>
                                        <div className="space-y-4">
                                            {round.matches.map((m, mIdx) => {
                                                const parsed = parseScoreDisplay(m.score);
                                                return (
                                                    <div key={m.id || mIdx} className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-2 shadow-lg">
                                                        <div className={`flex justify-between items-center text-sm ${m.winner_id === m.player1_id ? 'text-primary font-black' : 'text-white'}`}>
                                                            <span className="truncate">{m.player1_name || 'TBD'}</span>
                                                            <span className="font-mono text-xs">{parsed.p1 !== '-' ? parsed.p1 : ''}</span>
                                                        </div>
                                                        <div className={`flex justify-between items-center text-sm border-t border-white/5 pt-1.5 ${m.winner_id === m.player2_id ? 'text-primary font-black' : 'text-white'}`}>
                                                            <span className="truncate">{m.player2_name || 'TBD'}</span>
                                                            <span className="font-mono text-xs">{parsed.p2 !== '-' ? parsed.p2 : ''}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. SLIDE: WEATHER & COURTS */}
                {currentSlide === 'weather' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <CloudSun size={16} /> Estación Meteorológica Oficial
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    Condiciones Climáticas & Estado de Canchas
                                </h1>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                                <CheckCircle2 size={16} /> Canchas en Óptimo Estado
                            </span>
                        </div>

                        {weather ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Big Card: Current Temp */}
                                <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-card to-slate-950 border border-primary/30 rounded-3xl p-8 flex flex-col justify-between shadow-2xl">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {currentInstitution?.city || 'Diamante, Entre Ríos'}
                                        </div>
                                        <div className="text-7xl sm:text-8xl font-black text-white tracking-tighter my-4">
                                            {weather.temp}°<span className="text-3xl text-primary font-medium">C</span>
                                        </div>
                                        <div className="text-sm font-bold text-slate-300">
                                            Sensación Térmica: {weather.apparentTemp}°C
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/10 text-xs">
                                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                            <div className="text-slate-400 flex items-center gap-1.5"><Wind size={14} className="text-primary" /> Viento</div>
                                            <div className="text-base font-black text-white mt-1">{weather.windSpeed} km/h</div>
                                        </div>
                                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                                            <div className="text-slate-400 flex items-center gap-1.5"><Droplets size={14} className="text-blue-400" /> Humedad</div>
                                            <div className="text-base font-black text-white mt-1">{weather.humidity}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: 5-Day Forecast Table */}
                                <div className="lg:col-span-2 bg-slate-900/90 border border-white/10 rounded-3xl p-8 flex flex-col justify-between shadow-2xl">
                                    <div className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Calendar size={16} className="text-primary" /> Pronóstico Extendido — {clubName}
                                    </div>

                                    <div className="grid grid-cols-5 gap-3">
                                        {weather.daily.map((d, i) => {
                                            const dayName = new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
                                            return (
                                                <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center space-y-3">
                                                    <div className="text-xs font-black text-slate-400">{dayName}</div>
                                                    <CloudSun size={28} className="text-yellow-400 mx-auto" />
                                                    <div className="space-y-0.5">
                                                        <div className="text-lg font-black text-white">{d.maxTemp}°</div>
                                                        <div className="text-xs font-bold text-blue-400">{d.minTemp}°</div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        {d.rainSum > 0 ? `🌧️ ${d.rainSum} mm` : '☀️ 0 mm'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-slate-300 flex items-center gap-3">
                                        <ShieldCheck size={20} className="text-primary shrink-0" />
                                        <span>Canchas de polvo de ladrillo habilitadas y con mantenimiento técnico al día.</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">Cargando datos meteorológicos...</div>
                        )}
                    </div>
                )}

                {/* 6. SLIDE: QR ENROLLMENT & APP */}
                {currentSlide === 'qr' && (
                    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                            <div>
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <QrCode size={16} /> Acceso Rápido Móvil
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                                    ¡Sumate a {clubName}!
                                </h1>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                                App Web Oficial
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-primary/40 rounded-3xl p-8 sm:p-12 shadow-2xl">
                            <div className="space-y-5">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 rounded-full text-xs font-bold">
                                    <Sparkles size={13} /> {activeTournament ? activeTournament.name : 'Inscripciones Abiertas'}
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                                    Escaneá el código QR con tu celular y jugá en nuestro club
                                </h2>
                                <ul className="space-y-2.5 text-sm text-slate-300">
                                    <li className="flex items-center gap-2.5">
                                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                                        <span>Seguí tus partidos, resultados y horarios en vivo.</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                                        <span>Sumá puntos al Ranking Oficial de 1ra a 7ma categoría.</span>
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                                        <span>Desafiá a otros socios y reservá canchas desde tu teléfono.</span>
                                    </li>
                                </ul>
                                <div className="text-xs text-slate-400 font-mono truncate">
                                    {qrUrl}
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center space-y-4">
                                <QRCodeSVG 
                                    value={qrUrl} 
                                    size={240}
                                    className="border-4 border-primary shadow-2xl shadow-primary/40 p-3 bg-white"
                                />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                    Apuntá tu cámara aquí
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* BOTTOM TICKER FOOTER */}
            <footer className="h-14 bg-slate-950 border-t border-white/10 px-8 flex items-center justify-between shrink-0 text-xs text-slate-400">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-white flex items-center gap-2">
                        <Trophy size={14} className="text-yellow-400" /> Circuito Smash Tenis
                    </span>
                    <span className="hidden sm:inline">Pantalla Oficial • {clubName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-primary">Rotación: {slideDuration}s</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span className="text-slate-500 font-mono text-[11px]">v1.6.4</span>
                </div>
            </footer>
        </div>
    );
};
