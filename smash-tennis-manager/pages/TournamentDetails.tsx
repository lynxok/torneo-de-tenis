import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, TournamentPlayer, Match } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Trophy, Calendar, MapPin, DollarSign, Users, ChevronLeft, UserPlus, CheckCircle2, Loader2, Play, AlertTriangle } from 'lucide-react';

interface TournamentDetailsProps {
    tournamentId: string;
    user: UserProfile;
    onBack: () => void;
}

export const TournamentDetails: React.FC<TournamentDetailsProps> = ({ tournamentId, user, onBack }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const { addToast } = useToast();

    // Derived state
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        loadTournament();
    }, [tournamentId]);

    const loadTournament = async () => {
        setLoading(true);
        try {
            const data = await api.tournaments.getById(tournamentId);
            setTournament(data);
            if (data.tournament_players) setPlayers(data.tournament_players);
            if (data.matches) setMatches(data.matches);
        } catch (e) {
            console.error(e);
            addToast("Error al cargar torneo", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollClick = async () => {
        if (!tournament) return;
        if (!confirm(`¿Confirmas tu inscripción a ${tournament.name} por $${tournament.registration_price}?`)) return;

        setIsEnrolling(true);
        try {
            await api.players.enroll(tournament.id, user.id, user.name + ' ' + (user.lastname || ''), user.category || 'Open', tournament.registration_price);
            addToast("Inscripción exitosa. ¡Buena suerte!", 'success');
            loadTournament(); // Refresh to see update
        } catch (e: any) {
            addToast("Error al inscribirse: " + e.message, 'error');
        } finally {
            setIsEnrolling(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-muted">Cargando detalles...</div>;
    if (!tournament) return <div className="text-center py-20 text-red-500">Torneo no encontrado.</div>;

    const isEnrolled = players.some(p => p.player_id === user.id || p.id === user.id);

    const isRegClosed = tournament.registration_closed || tournament.status !== 'draft'; // Usually active implies closed for new registrations unless open

    return (
        <div className="space-y-6 animate-fade-up">
            <button onClick={onBack} className="flex items-center gap-2 text-muted hover:text-white mb-4">
                <ChevronLeft size={18} /> Volver a Torneos
            </button>

            {/* Header */}
            <div className="relative h-64 rounded-3xl overflow-hidden bg-slate-800 group">
                {tournament.image_url ? (
                    <img src={tournament.image_url} alt={tournament.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black opacity-60"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <div className="flex gap-2 mb-2">
                                <span className="bg-primary text-dark font-bold px-2 py-1 rounded text-xs uppercase">{tournament.category}</span>
                                <span className="bg-white/10 text-white font-bold px-2 py-1 rounded text-xs uppercase">{tournament.type}</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-2">{tournament.name}</h1>
                            <div className="flex items-center gap-4 text-sm text-slate-300">
                                <span className="flex items-center gap-1"><Calendar size={16} /> {new Date(tournament.start_date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><MapPin size={16} /> {tournament.institutions?.name}</span>
                                <span className="flex items-center gap-1"><Users size={16} /> {players.length} Inscritos</span>
                            </div>
                        </div>
                        {/* Action Button inside header for desktop, or below for mobile */}
                        <div className="hidden md:block">
                            {!isEnrolled ? (
                                !isRegClosed ? (
                                    <button onClick={handleEnrollClick} disabled={isEnrolling} className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                                        {isEnrolling ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                        Inscribirme (${tournament.registration_price})
                                    </button>
                                ) : (
                                    <div className="px-6 py-3 bg-white/5 text-muted font-bold rounded-xl border border-white/10">Inscripción Cerrada</div>
                                )
                            ) : (
                                <div className="px-6 py-3 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30 flex items-center gap-2">
                                    <CheckCircle2 size={20} /> Ya estás inscrito
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Action Bar */}
            <div className="md:hidden">
                {!isEnrolled ? (
                    !isRegClosed ? (
                        <button onClick={handleEnrollClick} disabled={isEnrolling} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            {isEnrolling ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                            Inscribirme (${tournament.registration_price})
                        </button>
                    ) : (
                        <div className="w-full py-3 bg-white/5 text-muted font-bold rounded-xl border border-white/10 text-center">Inscripción Cerrada</div>
                    )
                ) : (
                    <div className="w-full py-3 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30 flex items-center justify-center gap-2">
                        <CheckCircle2 size={20} /> Ya estás inscrito
                    </div>
                )}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ADMIN PANEL */}
                {(user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament.institution_id)) && (
                    <div className="col-span-1 lg:col-span-3">
                        <Card className="bg-slate-800/50 border-white/10">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Users size={20} /> Panel de Administración <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-muted uppercase">{tournament.status}</span>
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿${isRegClosed ? 'Abrir' : 'Cerrar'} inscripciones?`)) return;
                                        try {
                                            await api.tournaments.update(tournament.id, { registration_closed: !isRegClosed });
                                            addToast('Estado actualizado', 'success');
                                            loadTournament();
                                        } catch (e) { addToast('Error al actualizar', 'error'); }
                                    }}
                                    className={`px-4 py-2 rounded-xl font-bold border transition-all ${isRegClosed
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                                        }`}
                                >
                                    {isRegClosed ? 'Abrir Inscripción' : 'Cerrar Inscripción'}
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!confirm('¿Eliminar torneo permanentemente? Esta acción es irreversible.')) return;
                                        if (!confirm('Seguro?? Se borrarán todos los partidos.')) return;
                                        try {
                                            await api.tournaments.delete(tournament.id);
                                            addToast('Torneo eliminado', 'success');
                                            onBack();
                                        } catch (e) {
                                            console.error(e);
                                            addToast('Error al eliminar', 'error');
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl font-bold transition-all"
                                >
                                    Eliminar Torneo
                                </button>

                                {/* GENERATE CONTROLS */}
                                {tournament.status !== 'finished' ? (
                                    <>
                                        <div className="w-px bg-white/10 mx-2"></div>
                                        <button
                                            onClick={async () => {
                                                if (matches.some(m => m.round === 'Fase de Grupos')) {
                                                    alert('Ya existe una fase de grupos.');
                                                    return;
                                                }

                                                try {
                                                    await api.tournaments.generateFixture(tournament.id);
                                                    addToast('Grupos generados exitosamente!', 'success');
                                                    loadTournament();
                                                } catch (e: any) { addToast(e.message, 'error'); }
                                            }}
                                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl font-bold transition-all flex items-center gap-2"
                                        >
                                            <Play size={16} /> Generar Grupos
                                        </button>

                                        <button
                                            onClick={async () => {
                                                if (matches.some(m => m.round === 'Cuartos de Final' || m.round === 'Semifinal')) {
                                                    alert('Ya existen playoffs.');
                                                    return;
                                                }
                                                try {
                                                    await api.tournaments.generatePlayoffs(tournament.id);
                                                    addToast('Bracket generado!', 'success');
                                                    loadTournament();
                                                } catch (e: any) { addToast(e.message, 'error'); }
                                            }}
                                            className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl font-bold transition-all flex items-center gap-2"
                                        >
                                            <Trophy size={16} /> Generar Playoffs
                                        </button>
                                    </>
                                ) : matches.length === 0 ? (
                                    <>
                                        <div className="w-px bg-white/10 mx-2"></div>
                                        <button
                                            onClick={async () => {
                                                if (!confirm("¿Autogenerar historial completo? Esto creará grupos y playoffs aleatorios.")) return;
                                                try {
                                                    await api.tournaments.simulateHistory(tournament.id);
                                                    addToast("Datos históricos generados", "success");
                                                    loadTournament();
                                                } catch (e: any) { addToast(e.message, 'error'); }
                                            }}
                                            className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl font-bold transition-all flex items-center gap-2"
                                        >
                                            <Trophy size={16} /> Simular Historial
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted italic ml-2 border-l border-white/10 pl-4">
                                        <CheckCircle2 size={16} /> Opciones de generación bloqueadas (Torneo Finalizado)
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Left: Info & Brackets placeholder */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Groups / Matches */}
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="text-amber-500" /> Partidos & Resultados
                        </h3>
                        {matches.length === 0 ? (
                            <div className="text-center py-10 text-muted bg-white/5 rounded-xl border border-white/5 border-dashed">
                                El fixture aún no ha sido generado.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {matches.map(m => (
                                    <div key={m.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <div className="text-sm">
                                            <div className={`font-bold ${m.winner_id === m.player1_id ? 'text-green-400' : 'text-white'}`}>{m.player1_name || 'TBD'}</div>
                                            <div className={`font-bold ${m.winner_id === m.player2_id ? 'text-green-400' : 'text-white'}`}>{m.player2_name || 'TBD'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-muted mb-1">{m.round}</div>
                                            {m.score ? (
                                                <div className="text-sm font-mono font-bold text-white">{JSON.stringify(m.score)}</div>
                                            ) : (
                                                <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">Pendiente</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Players List */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Users size={18} className="text-blue-400" /> Jugadores ({players.length})
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {players.length === 0 ? (
                                <div className="text-muted text-sm text-center py-4">Aún no hay inscritos.</div>
                            ) : (
                                players.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                            {(p.name || p.player_name || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{p.name || p.player_name}</div>
                                            <div className="text-[10px] text-muted">{p.category || 'Sin Cat.'}</div>
                                        </div>
                                        {(p.player_id === user.id || p.id === user.id) && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded font-bold">Tú</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};