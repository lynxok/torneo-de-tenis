import React, { useEffect, useState } from 'react';
import { HeadToHeadStats } from '../types';
import { api } from '../services/api';
import { X, Trophy, Flame, Swords, Calendar, Award, ChevronRight, Loader2, Sparkles, User, Shield } from 'lucide-react';
import { formatPlayerName } from '../utils/formatters';

interface HeadToHeadModalProps {
    player1Id: string;
    player2Id: string;
    onClose: () => void;
    onChallenge?: (player2Id: string) => void;
}

export const HeadToHeadModal: React.FC<HeadToHeadModalProps> = ({
    player1Id,
    player2Id,
    onClose,
    onChallenge
}) => {
    const [stats, setStats] = useState<HeadToHeadStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchH2H = async () => {
            setLoading(true);
            try {
                const data = await api.matches.getHeadToHead(player1Id, player2Id);
                setStats(data);
            } catch (e) {
                console.error("Error loading H2H stats:", e);
            } finally {
                setLoading(false);
            }
        };

        if (player1Id && player2Id) {
            fetchH2H();
        }
    }, [player1Id, player2Id]);

    const p1 = stats?.player1;
    const p2 = stats?.player2;
    const total = stats?.totalMatches || 0;
    const p1Wins = stats?.player1Wins || 0;
    const p2Wins = stats?.player2Wins || 0;

    const p1Pct = total > 0 ? Math.round((p1Wins / total) * 100) : 50;
    const p2Pct = total > 0 ? Math.round((p2Wins / total) * 100) : 50;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-b from-slate-900 via-card to-slate-950 border border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 relative">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/20 text-primary rounded-xl border border-primary/30">
                            <Swords size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                Historial Cara a Cara <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">H2H</span>
                            </h3>
                            <p className="text-xs text-muted">Estadísticas de rivalidad y enfrentamientos directos</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted">
                            <Loader2 className="animate-spin text-primary" size={36} />
                            <p className="text-sm font-medium">Calculando historial de enfrentamientos...</p>
                        </div>
                    ) : !stats || !p1 || !p2 ? (
                        <div className="text-center py-12 text-muted">
                            No se pudieron obtener los datos de los jugadores.
                        </div>
                    ) : (
                        <>
                            {/* Versus Stage Banner */}
                            <div className="relative bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-orange-950/40 border border-white/10 rounded-2xl p-5 shadow-lg overflow-hidden">
                                <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                                
                                <div className="grid grid-cols-5 items-center gap-2 relative z-10">
                                    {/* Player 1 */}
                                    <div className="col-span-2 flex flex-col items-center text-center space-y-2">
                                        <div className="relative">
                                            {p1.avatar_url ? (
                                                <img src={p1.avatar_url} alt={p1.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 font-black text-xl">
                                                    {p1.name.charAt(0)}
                                                </div>
                                            )}
                                            <span className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-blue-400">
                                                {p1.category || '4ta'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm leading-snug">{p1.name}</h4>
                                            <p className="text-[10px] text-blue-400 font-bold uppercase mt-0.5">Jugador 1</p>
                                        </div>
                                    </div>

                                    {/* Center Score & VS */}
                                    <div className="col-span-1 flex flex-col items-center justify-center">
                                        <div className="text-xs font-black tracking-widest text-muted uppercase">VS</div>
                                        <div className="text-2xl sm:text-3xl font-black text-white my-1 tracking-tight flex items-center gap-2">
                                            <span className={p1Wins > p2Wins ? 'text-blue-400' : 'text-white'}>{p1Wins}</span>
                                            <span className="text-muted text-lg">-</span>
                                            <span className={p2Wins > p1Wins ? 'text-orange-400' : 'text-white'}>{p2Wins}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {total} {total === 1 ? 'partido' : 'partidos'}
                                        </div>
                                    </div>

                                    {/* Player 2 */}
                                    <div className="col-span-2 flex flex-col items-center text-center space-y-2">
                                        <div className="relative">
                                            {p2.avatar_url ? (
                                                <img src={p2.avatar_url} alt={p2.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shadow-md" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center text-orange-400 font-black text-xl">
                                                    {p2.name.charAt(0)}
                                                </div>
                                            )}
                                            <span className="absolute -bottom-2 -right-2 bg-orange-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-orange-400">
                                                {p2.category || '4ta'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm leading-snug">{p2.name}</h4>
                                            <p className="text-[10px] text-orange-400 font-bold uppercase mt-0.5">Jugador 2</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Percentage Bar */}
                                <div className="mt-5 space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-black">
                                        <span className="text-blue-400">{p1Pct}% ({p1Wins} victorias)</span>
                                        <span className="text-orange-400">{p2Pct}% ({p2Wins} victorias)</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden flex border border-white/10">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" 
                                            style={{ width: `${total > 0 ? (p1Wins / total) * 100 : 50}%` }}
                                        />
                                        <div 
                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700" 
                                            style={{ width: `${total > 0 ? (p2Wins / total) * 100 : 50}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Key Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase">Sets Ganados</div>
                                    <div className="text-sm font-black text-white mt-1">
                                        <span className="text-blue-400">{stats.player1SetsWon}</span> / <span className="text-orange-400">{stats.player2SetsWon}</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase">Games Totales</div>
                                    <div className="text-sm font-black text-white mt-1">
                                        <span className="text-blue-400">{stats.player1GamesWon}</span> / <span className="text-orange-400">{stats.player2GamesWon}</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase">Eficacia P1</div>
                                    <div className="text-sm font-black text-blue-400 mt-1">
                                        {p1Pct}%
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <div className="text-[10px] text-muted font-bold uppercase">Racha Actual</div>
                                    <div className="text-sm font-black text-white mt-1 flex items-center justify-center gap-1">
                                        {stats.streakCount && stats.streakCount > 0 ? (
                                            <>
                                                <Flame size={14} className="text-amber-400 fill-amber-400" />
                                                <span className="text-amber-400">{stats.streakCount} {stats.streakCount === 1 ? 'partido' : 'partidos'}</span>
                                            </>
                                        ) : (
                                            <span className="text-muted text-xs">Sin racha</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Match History Timeline */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <Trophy size={14} className="text-primary" /> Historial de Partidos ({stats.matches.length})
                                </h4>

                                {stats.matches.length === 0 ? (
                                    <div className="text-center py-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-muted text-xs">
                                        <Swords size={32} className="mx-auto mb-2 opacity-40 text-primary" />
                                        <p className="font-bold text-white">Aún no registran enfrentamientos oficiales</p>
                                        <p className="mt-0.5 text-slate-400">¡Sé el primero en lanzar un desafío o competir en un torneo!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {stats.matches.map(m => {
                                            const winnerIsP1 = m.winner_id === player1Id;
                                            const winnerIsP2 = m.winner_id === player2Id;
                                            
                                            // Format score string
                                            let scoreStr = 'Sin resultado';
                                            if (m.score) {
                                                if (typeof m.score === 'string') {
                                                    scoreStr = m.score;
                                                } else if (typeof m.score === 'object') {
                                                    const sets = [m.score.set1, m.score.set2, m.score.set3].filter(Boolean);
                                                    if (sets.length > 0) scoreStr = sets.join('  ');
                                                }
                                            }

                                            return (
                                                <div 
                                                    key={m.id}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-white/20 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-white">{m.tournament_name}</span>
                                                            {m.round && (
                                                                <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                                                                    {m.round}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-muted flex items-center gap-1">
                                                            <Calendar size={11} /> {new Date(m.date).toLocaleDateString()}
                                                        </div>
                                                    </div>

                                                    <div className="text-right space-y-1">
                                                        <div className="text-sm font-black font-mono tracking-wide text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 inline-block">
                                                            {scoreStr}
                                                        </div>
                                                        {m.winner_name && (
                                                            <div className="text-[10px] font-bold">
                                                                Ganador: <span className={winnerIsP1 ? 'text-blue-400' : winnerIsP2 ? 'text-orange-400' : 'text-primary'}>
                                                                    {m.winner_name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>

                    {onChallenge && player2Id !== player1Id && (
                        <button 
                            onClick={() => { onClose(); onChallenge(player2Id); }}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
                        >
                            <Swords size={14} /> Desafiar a este Rival
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
