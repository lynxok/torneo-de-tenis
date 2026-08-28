
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { Medal, Trophy, Search, User, Info, X, Zap, Target, Star, ChevronDown, ChevronUp, History, TrendingUp, Calculator, Camera, Sparkles } from 'lucide-react';
import { NUMERIC_CATEGORIES } from '../utils/categories';
import { formatPlayerName } from '../utils/formatters';
import { calculatePointsDetails, computeRankings, normalizeCategoryKey, RankedPlayer } from '../utils/ranking';
import { UserAvatar } from '../components/UserAvatar';

interface RankingsProps {
    user: UserProfile;
}

export const Rankings: React.FC<RankingsProps> = ({ user }) => {
    const [players, setPlayers] = useState<RankedPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [activeCategory, setActiveCategory] = useState('Global');

    // Modals
    const [showRules, setShowRules] = useState(false);
    const [showRulesSummary, setShowRulesSummary] = useState(false);
    const [selectedPlayerForPoints, setSelectedPlayerForPoints] = useState<UserProfile | null>(null);

    const categories = ['Global', ...NUMERIC_CATEGORIES];

    useEffect(() => {
        api.auth.getAllProfiles().then(data => {
            const enriched = data.map(p => {
                if (p.id === user.id) {
                    return {
                        ...p,
                        ...user,
                        profile_picture_url: user.profile_picture_url || p.profile_picture_url,
                        avatar_url: user.avatar_url || (p as any).avatar_url
                    };
                }
                return p;
            });
            const ranked = computeRankings(enriched);
            setPlayers(ranked);
        }).finally(() => setLoading(false));
    }, [user]);

    const filteredPlayers = players.filter(p => {
        // 1. Text Search Filter
        const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase()) ||
            (p.lastname || '').toLowerCase().includes(filter.toLowerCase());

        // 2. Category Filter
        const playerCat = normalizeCategoryKey(p.category);
        const matchesCategory = activeCategory === 'Global' ? true : playerCat.toLowerCase() === activeCategory.toLowerCase();

        return matchesSearch && matchesCategory;
    });

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="text-yellow-400 w-6 h-6" />;
        if (index === 1) return <Medal className="text-gray-300 w-6 h-6" />;
        if (index === 2) return <Medal className="text-amber-600 w-6 h-6" />;
        return <span className="font-bold text-muted w-6 text-center">{index + 1}</span>;
    };

    const handlePointClick = (e: React.MouseEvent, player: UserProfile) => {
        e.stopPropagation();
        const enrichedPlayer = player.id === user.id ? { ...player, ...user } : player;
        setSelectedPlayerForPoints(enrichedPlayer);
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white">Ranking {activeCategory}</h2>
                    </div>
                    <p className="text-muted text-sm">
                        {activeCategory === 'Global'
                            ? 'Clasificación general de todos los jugadores.'
                            : `Clasificación exclusiva para la categoría ${activeCategory}.`}
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar jugador..."
                        className="w-full bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* SCORING SYSTEM BANNER */}
            <div id="ranking-rules-banner" className="bg-gradient-to-r from-blue-900/30 to-card border border-blue-500/20 rounded-2xl overflow-hidden">
                <div
                    onClick={() => setShowRulesSummary(!showRulesSummary)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">¿Cómo sumar puntos?</h3>
                            <p className="text-xs text-muted">Conoce el sistema de puntuación del ranking.</p>
                        </div>
                    </div>
                    <div className="text-muted">
                        {showRulesSummary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>

                {showRulesSummary && (
                    <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-xs text-muted uppercase font-bold mb-1 flex items-center gap-1"><Zap size={12} className="text-yellow-400" /> Partidos</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-slate-300">Victoria</span>
                                    <span className="text-lg font-bold text-green-400">+100 pts</span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-slate-400">Bonus por Jugar</span>
                                    <span className="text-sm font-bold text-slate-400">+20 pts</span>
                                </div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-xs text-muted uppercase font-bold mb-1 flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> Torneos</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-slate-300">Campeón</span>
                                    <span className="text-lg font-bold text-amber-400">+1000 pts</span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-slate-400">Finalista</span>
                                    <span className="text-sm font-bold text-white">+600 pts</span>
                                </div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <div className="text-xs text-muted uppercase font-bold mb-1 flex items-center gap-1"><Camera size={12} className="text-sky-400" /> Perfil & Identidad</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-slate-300">Foto de Perfil</span>
                                    <span className="text-lg font-bold text-sky-400">+50 pts</span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-slate-400">Tipo de Bono</span>
                                    <span className="text-xs font-bold text-slate-300">Única vez (Fijo)</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center">
                                <button
                                    onClick={() => setShowRules(true)}
                                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-sm font-bold transition-colors border border-white/10 flex items-center justify-center gap-2"
                                >
                                    <Info size={16} /> Ver Reglamento Completo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 border ${activeCategory === cat
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-card text-muted border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div id="ranking-table" className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-muted text-sm uppercase tracking-wider">
                                <th className="p-4 text-center w-16">#</th>
                                <th className="p-4">Jugador</th>
                                <th className="p-4 hidden md:table-cell">Categoría</th>
                                <th className="p-4 hidden sm:table-cell">Club</th>
                                <th className="p-4 text-right">Puntos Totales</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-muted">Cargando ranking...</td></tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-muted">No hay jugadores en esta categoría.</td></tr>
                            ) : filteredPlayers.map((player, index) => {
                                const isCurrentUser = player.id === user.id;
                                const stats = calculatePointsDetails(player);

                                return (
                                    <tr
                                        key={player.id}
                                        className={`transition-colors group ${isCurrentUser
                                            ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary'
                                            : 'hover:bg-white/5 border-l-4 border-l-transparent'
                                            }`}
                                    >
                                        <td className="p-4 flex justify-center items-center">
                                            {getRankIcon(index)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar 
                                                    user={player} 
                                                    size="sm" 
                                                    shape="circle" 
                                                    isCurrentUser={isCurrentUser} 
                                                />
                                                <div>
                                                    <div className={`font-bold transition-colors flex items-center gap-1.5 ${isCurrentUser ? 'text-primary' : 'text-white group-hover:text-primary'
                                                        }`}>
                                                        <span>{formatPlayerName(player.name, player.lastname)}</span>
                                                        {(player.tournaments_won || 0) > 0 && (
                                                            <span title={`Campeón: ${player.tournaments_won} títulos`} className="text-xs">👑</span>
                                                        )}
                                                        {(player.matches_won || 0) >= 5 && (
                                                            <span title={`${player.matches_won} partidos ganados`} className="text-xs">🔥</span>
                                                        )}
                                                        {isCurrentUser && <span className="text-[10px] bg-primary text-dark font-black px-1.5 py-0.5 rounded ml-1 uppercase">Tú</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm hidden md:table-cell">
                                            <span className={`px-2 py-1 rounded text-xs border ${isCurrentUser
                                                ? 'bg-primary/20 text-primary border-primary/20'
                                                : 'bg-white/5 text-slate-300 border-white/10'
                                                }`}>
                                                {player.category || 'N/A'}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-sm hidden sm:table-cell ${isCurrentUser ? 'text-slate-200' : 'text-muted'}`}>
                                            {player.institution || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={(e) => handlePointClick(e, player)}
                                                className={`px-3 py-1 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ml-auto ${isCurrentUser
                                                    ? 'bg-primary text-dark hover:scale-105 hover:shadow-lg hover:shadow-primary/20'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                                    }`}
                                                title="Ver desglose de puntos"
                                            >
                                                <Calculator size={14} />
                                                {stats.total}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RULES MODAL */}
            {showRules && <RankingRulesModal onClose={() => setShowRules(false)} />}

            {/* POINTS BREAKDOWN MODAL */}
            {selectedPlayerForPoints && (
                <PointsBreakdownModal
                    player={selectedPlayerForPoints}
                    user={user}
                    onClose={() => setSelectedPlayerForPoints(null)}
                />
            )}
        </div>
    );
};


import { Match } from '../types';

const PointsBreakdownModal = ({ player, user, onClose }: { player: UserProfile, user: UserProfile, onClose: () => void }) => {
    const isMe = player.id === user.id;
    // Enrich with latest user memory if looking at own profile
    const activePlayer: UserProfile = isMe ? { ...player, ...user } : player;

    // State for detailed history
    const [historyMatches, setHistoryMatches] = useState<Match[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [expandedSection, setExpandedSection] = useState<'tournaments' | 'wins' | 'participation' | null>(null);

    // Initial simple stats from profile (fallback)
    const [stats, setStats] = useState(() => calculatePointsDetails(activePlayer));

    useEffect(() => {
        // Fetch real history to populate details
        api.matches.getByUser(activePlayer.id)
            .then(data => {
                setHistoryMatches(data);

                // Recalculate Stats based on REAL history
                let newTotal = 0;
                let tournWins = 0;
                let tournPts = 0;
                let matchWins = 0;
                let matchPts = 0;
                let partCount = 0;
                let partPts = 0;

                data.forEach(m => {
                    const isWinner = m.winner_id === activePlayer.id;

                    // 1. Participation (Everyone gets it)
                    partCount++;
                    partPts += 20;
                    newTotal += 20;

                    // 2. Match Win
                    if (isWinner) {
                        matchWins++;
                        matchPts += 100;
                        newTotal += 100;

                        // 3. Tournament Win (Assumption: Round 'Final' + Winner)
                        if (m.round === 'Final') {
                            tournWins++;
                            tournPts += 1000;
                            newTotal += 1000;
                        }
                    }
                });

                // 4. Photo Bonus
                const photoUrl = activePlayer.profile_picture_url || (activePlayer as any).avatar_url;
                const hasPhoto = Boolean(photoUrl && typeof photoUrl === 'string' && photoUrl.trim().length > 0);
                const photoPts = hasPhoto ? 50 : 0;
                newTotal += photoPts;

                setStats({
                    total: newTotal,
                    breakdown: {
                        tournaments: { count: tournWins, points: tournPts },
                        wins: { count: matchWins, points: matchPts },
                        participation: { count: partCount, points: partPts },
                        profilePhoto: { count: hasPhoto ? 1 : 0, points: photoPts }
                    }
                });
            })
            .catch(err => console.error("Failed to load history", err))
            .finally(() => setLoadingDetails(false));
    }, [activePlayer.id, activePlayer.profile_picture_url, (activePlayer as any).avatar_url]);

    const toggleSection = (section: 'tournaments' | 'wins' | 'participation') => {
        if (expandedSection === section) {
            setExpandedSection(null);
        } else {
            setExpandedSection(section);
        }
    };

    // Derived lists from real history
    const winsList = historyMatches.filter(m => m.winner_id === activePlayer.id);
    const participationList = historyMatches;
    const tournamentsList = historyMatches.filter(m => m.round === 'Final' && m.winner_id === activePlayer.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95" onClick={onClose}>
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-card flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <UserAvatar 
                            user={activePlayer} 
                            size="lg" 
                            shape="circle" 
                            isCurrentUser={isMe} 
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 text-muted text-xs uppercase font-bold">
                                <Zap size={12} className="text-yellow-400" /> Desglose de Puntaje
                            </div>
                            <h3 className="text-xl font-bold text-white truncate">
                                {formatPlayerName(activePlayer.name, activePlayer.lastname)}
                            </h3>
                            <p className="text-xs text-slate-300">
                                {isMe ? 'Así se compone tu puntaje actual.' : 'Detalle de puntos acumulados en base al historial.'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-3xl font-bold text-primary transition-all duration-500 font-mono">
                            {loadingDetails ? <span className="text-muted text-lg animate-pulse">...</span> : stats.total}
                        </div>
                        <div className="text-[10px] text-muted uppercase">Puntos Totales</div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center">
                            <Trophy className="text-amber-400 mb-2" size={24} />
                            <div className="text-xl font-bold text-white">
                                {loadingDetails ? '-' : stats.breakdown.tournaments.points}
                            </div>
                            <div className="text-[10px] text-muted uppercase mt-1">
                                {loadingDetails ? '-' : stats.breakdown.tournaments.count} Torneos Ganados
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center">
                            <TrendingUp className="text-green-400 mb-2" size={24} />
                            <div className="text-xl font-bold text-white">
                                {loadingDetails ? '-' : stats.breakdown.wins.points}
                            </div>
                            <div className="text-[10px] text-muted uppercase mt-1">
                                {loadingDetails ? '-' : stats.breakdown.wins.count} Partidos Ganados
                            </div>
                        </div>
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                            <History size={16} className="text-muted" /> Historial de Puntos
                        </h4>

                        {/* History Items with Expand interactions */}
                        <div className="space-y-2">

                            {/* 1. TOURNAMENTS */}
                            <div className="rounded-lg overflow-hidden border border-amber-500/20 transition-all">
                                <div
                                    className={`flex justify-between items-center p-3 bg-amber-500/10 cursor-pointer hover:bg-amber-500/15 ${expandedSection === 'tournaments' ? 'bg-amber-500/15' : ''}`}
                                    onClick={() => toggleSection('tournaments')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-amber-500/20 rounded text-amber-400"><Trophy size={14} /></div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                Campeón de Torneo
                                                {expandedSection === 'tournaments' ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
                                            </div>
                                            <div className="text-[10px] text-muted">Bonus por título obtenido</div>
                                        </div>
                                    </div>
                                    <div className="text-amber-400 font-bold font-mono">+{loadingDetails ? '...' : stats.breakdown.tournaments.points}</div>
                                </div>
                                {expandedSection === 'tournaments' && (
                                    <div className="bg-black/20 p-3 text-xs space-y-2 border-t border-amber-500/10 animate-in slide-in-from-top-2">
                                        {loadingDetails ? <p className="text-muted">Cargando detalles...</p> :
                                            tournamentsList.length > 0 ? (
                                                tournamentsList.map(m => (
                                                    <div key={m.id} className="flex justify-between text-slate-300">
                                                        <span>{m.tournaments?.name || 'Torneo sin nombre'}</span>
                                                        <span className="text-amber-400 font-mono">+1000</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-muted italic">No se encontraron registros detallados de torneos en el historial reciente.</div>
                                            )
                                        }
                                    </div>
                                )}
                            </div>

                            {/* 2. MATCH WINS */}
                            <div className="rounded-lg overflow-hidden border border-green-500/20 transition-all">
                                <div
                                    className={`flex justify-between items-center p-3 bg-green-500/10 cursor-pointer hover:bg-green-500/15 ${expandedSection === 'wins' ? 'bg-green-500/15' : ''}`}
                                    onClick={() => toggleSection('wins')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-green-500/20 rounded text-green-400"><Zap size={14} /></div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                Victorias Acumuladas
                                                {expandedSection === 'wins' ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
                                            </div>
                                            <div className="text-[10px] text-muted">{loadingDetails ? '...' : stats.breakdown.wins.count} victorias x 100pts</div>
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-bold font-mono">+{loadingDetails ? '...' : stats.breakdown.wins.points}</div>
                                </div>
                                {expandedSection === 'wins' && (
                                    <div className="bg-black/20 p-3 text-xs space-y-2 border-t border-green-500/10 animate-in slide-in-from-top-2">
                                        {loadingDetails ? <p className="text-muted">Cargando detalles...</p> :
                                            winsList.length > 0 ? (
                                                winsList.slice(0, 10).map(m => (
                                                    <div key={m.id} className="flex justify-between text-slate-300 border-b border-white/5 last:border-0 pb-1 last:pb-0 mb-1 last:mb-0">
                                                        <div className="truncate pr-2">
                                                            Vs. {m.player1_id === player.id ? m.player2_name : m.player1_name}
                                                            <span className="opacity-50 ml-1 text-[10px]">({m.tournaments?.name})</span>
                                                        </div>
                                                        <span className="text-green-400 font-mono shrink-0">+100</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-muted italic">No hay victorias registradas.</div>
                                            )
                                        }
                                        {winsList.length > 10 && <div className="text-[10px] text-center text-muted pt-1">Ver {winsList.length - 10} más...</div>}
                                    </div>
                                )}
                            </div>

                            {/* 3. PARTICIPATION */}
                            <div className="rounded-lg overflow-hidden border border-white/10 transition-all">
                                <div
                                    className={`flex justify-between items-center p-3 bg-white/5 cursor-pointer hover:bg-white/10 ${expandedSection === 'participation' ? 'bg-white/10' : ''}`}
                                    onClick={() => toggleSection('participation')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white/10 rounded text-slate-400"><User size={14} /></div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                                Bonus por Presentación
                                                {expandedSection === 'participation' ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
                                            </div>
                                            <div className="text-[10px] text-muted">Por jugar {loadingDetails ? '...' : stats.breakdown.participation.count} partidos (sin ganar)</div>
                                        </div>
                                    </div>
                                    <div className="text-slate-400 font-bold font-mono">+{loadingDetails ? '...' : stats.breakdown.participation.points}</div>
                                </div>
                                {expandedSection === 'participation' && (
                                    <div className="bg-black/20 p-3 text-xs space-y-2 border-t border-white/5 animate-in slide-in-from-top-2">
                                        <p className="text-[10px] text-muted mb-2">Se otorgan puntos por cada partido jugado (independientemente del resultado).</p>
                                        {loadingDetails ? <p className="text-muted">Cargando detalles...</p> :
                                            participationList.length > 0 ? (
                                                participationList.slice(0, 5).map(m => (
                                                    <div key={m.id} className="flex justify-between text-slate-400 border-b border-white/5 last:border-0 pb-1 last:pb-0">
                                                        <div>Vs. {m.player1_id === player.id ? m.player2_name : m.player1_name}</div>
                                                        <span className="font-mono">+20</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-muted italic">No hay partidos registrados.</div>
                                            )
                                        }
                                    </div>
                                )}
                            </div>

                            {/* 4. PROFILE PHOTO BONUS */}
                            <div className="rounded-lg overflow-hidden border border-white/10 transition-all">
                                <div className="flex justify-between items-center p-3 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded ${stats.breakdown.profilePhoto?.count ? 'bg-sky-500/20 text-sky-400' : 'bg-white/10 text-slate-500'}`}>
                                            <Camera size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                Foto de Perfil Oficial
                                                {stats.breakdown.profilePhoto?.count ? (
                                                    <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/30">✓ Activo (1/1)</span>
                                                ) : (
                                                    <span className="text-[10px] bg-white/10 text-slate-400 font-bold px-1.5 py-0.5 rounded">Pendiente</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted">Bono único no acumulativo por foto cargada en el perfil</div>
                                        </div>
                                    </div>
                                    <div className={`font-bold font-mono ${stats.breakdown.profilePhoto?.points ? 'text-sky-400' : 'text-slate-500'}`}>
                                        +{loadingDetails ? '...' : (stats.breakdown.profilePhoto?.points || 0)}
                                    </div>
                                </div>
                            </div>

                            {!loadingDetails && stats.total === 0 && (
                                <div className="text-center py-6 text-muted text-sm italic">
                                    El jugador aún no ha sumado puntos basados en el historial registrado.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex gap-3">
                        <Info className="text-blue-400 shrink-0" size={18} />
                        <p className="text-xs text-blue-200">
                            {isMe
                                ? "Estos puntos se calculan en tiempo real basándose en tu historial de partidos y tu perfil oficial."
                                : "Este desglose refleja los puntos obtenidos en partidos y perfil registrados en la plataforma."}
                        </p>
                    </div>

                </div>

                <div className="p-5 border-t border-white/10 bg-white/5 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const RankingRulesModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Target className="text-primary" /> Sistema de Puntuación
                        </h3>
                        <p className="text-xs text-muted">¿Cómo se calculan los puntos del ranking?</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Section 1: Matches */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" /> Partidos & Desafíos
                        </h4>
                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                            <div className="flex justify-between items-center p-3 border-b border-white/5">
                                <span className="text-sm text-slate-300">Victoria en Partido</span>
                                <span className="text-sm font-bold text-green-400">+100 pts</span>
                            </div>
                            <div className="flex justify-between items-center p-3">
                                <div>
                                    <span className="text-sm text-slate-300 block">Bonus por Presentación</span>
                                    <span className="text-[10px] text-muted">(Incluso si pierdes)</span>
                                </div>
                                <span className="text-sm font-bold text-slate-400">+20 pts</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">
                            * Se otorgan 20 puntos solo por jugar el partido. El ganador suma los 100 de victoria. Esto fomenta la actividad constante en el ranking.
                        </p>
                    </div>

                    {/* Section 2: Tournaments */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                            <Trophy size={16} className="text-amber-400" /> Bonus por Torneo
                        </h4>
                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                            <div className="grid grid-cols-3 text-xs text-muted uppercase font-bold bg-black/20 border-b border-white/5 p-2">
                                <div className="col-span-2">Instancia Alcanzada</div>
                                <div className="text-right">Bonus</div>
                            </div>
                            <div className="grid grid-cols-3 p-2 border-b border-white/5 items-center">
                                <div className="col-span-2 text-white font-bold flex items-center gap-2"><Trophy size={12} className="text-yellow-400" /> Campeón</div>
                                <div className="text-right font-bold text-yellow-400">+1000</div>
                            </div>
                            <div className="grid grid-cols-3 p-2 border-b border-white/5 items-center">
                                <div className="col-span-2 text-white font-medium flex items-center gap-2"><Medal size={12} className="text-slate-300" /> Finalista</div>
                                <div className="text-right font-bold text-white">+600</div>
                            </div>
                            <div className="grid grid-cols-3 p-2 border-b border-white/5 items-center">
                                <div className="col-span-2 text-slate-300 text-sm">Semifinal</div>
                                <div className="text-right font-bold text-slate-300">+360</div>
                            </div>
                            <div className="grid grid-cols-3 p-2 border-b border-white/5 items-center">
                                <div className="col-span-2 text-slate-300 text-sm">Cuartos de Final</div>
                                <div className="text-right font-bold text-slate-300">+180</div>
                            </div>
                            <div className="grid grid-cols-3 p-2 items-center">
                                <div className="col-span-2 text-slate-300 text-sm">Fase de Grupos</div>
                                <div className="text-right font-bold text-slate-300">+90</div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Identity & Profile Bonus */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                            <Camera size={16} className="text-sky-400" /> Identidad & Foto de Perfil
                        </h4>
                        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden p-3 flex justify-between items-center">
                            <div>
                                <span className="text-sm text-slate-200 font-semibold block">Foto Oficial Cargada</span>
                                <span className="text-[10px] text-muted block">Bono único de bienvenida para incentivar perfiles completos. No se acumula al cambiar la foto.</span>
                            </div>
                            <span className="text-sm font-bold text-sky-400 font-mono shrink-0 ml-3">+50 pts</span>
                        </div>
                    </div>

                    {/* Section 4: Extra Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                        <Star className="text-blue-400 shrink-0" size={20} />
                        <div>
                            <h5 className="text-sm font-bold text-white mb-1">Ascensos y Descensos</h5>
                            <p className="text-xs text-blue-200 leading-relaxed">
                                El ranking se actualiza en tiempo real. Los mejores jugadores de cada categoría al final de la temporada tendrán la opción de ascender a la categoría superior.
                            </p>
                        </div>
                    </div>

                </div>

                <div className="p-5 border-t border-white/10 bg-white/5">
                    <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
