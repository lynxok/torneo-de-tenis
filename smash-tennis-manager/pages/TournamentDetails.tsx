import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, TournamentPlayer, Match } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Trophy, Calendar, MapPin, Users, ChevronLeft, UserPlus, CheckCircle2, Loader2, Play, Edit3, X, Save, Layers, Award, Sparkles, Share2, MessageCircle, ArrowLeftRight, Lightbulb } from 'lucide-react';

interface TournamentDetailsProps {
    tournamentId: string;
    user: UserProfile;
    onBack: () => void;
}

export const TournamentDetails: React.FC<TournamentDetailsProps> = ({ tournamentId, user, onBack }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'playoffs'>('all');
    const { addToast } = useToast();

    // Swap / Edit Groups State
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState<{ id: string; name: string } | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    // Score Modal State
    const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
    const [scoreP1Set1, setScoreP1Set1] = useState(6);
    const [scoreP2Set1, setScoreP2Set1] = useState(4);
    const [scoreP1Set2, setScoreP1Set2] = useState(6);
    const [scoreP2Set2, setScoreP2Set2] = useState(3);
    const [scoreP1Set3, setScoreP1Set3] = useState(0);
    const [scoreP2Set3, setScoreP2Set3] = useState(0);
    const [hasSet3, setHasSet3] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
    const [savingScore, setSavingScore] = useState(false);

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

    const isUserMember = api.memberships.isMemberOf(user, tournament?.institution_id);
    const effectivePrice = tournament?.registration_price || 0;

    const handleEnrollClick = async () => {
        if (!tournament) return;
        if (!confirm(`¿Confirmas tu inscripción a ${tournament.name} por $${effectivePrice}?`)) return;

        setIsEnrolling(true);
        try {
            await api.players.enroll(tournament.id, user.id, user.name + ' ' + (user.lastname || ''), user.category || 'Open', effectivePrice);
            addToast("¡Inscripción exitosa! Buena suerte en el torneo.", 'success');
            loadTournament();
        } catch (e: any) {
            addToast("Error al inscribirse: " + e.message, 'error');
        } finally {
            setIsEnrolling(false);
        }
    };

    const openScoreModal = (m: Match) => {
        setSelectedMatchForScore(m);
        setSelectedWinnerId(m.winner_id || m.player1_id || '');
        setHasSet3(false);
        setScoreP1Set1(6);
        setScoreP2Set1(4);
        setScoreP1Set2(6);
        setScoreP2Set2(3);
        setScoreP1Set3(0);
        setScoreP2Set3(0);
    };

    const handleSaveScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatchForScore) return;

        setSavingScore(true);
        try {
            const scoreObj: any = {
                set1: `${scoreP1Set1}-${scoreP2Set1}`,
                set2: `${scoreP1Set2}-${scoreP2Set2}`,
            };
            if (hasSet3) {
                scoreObj.set3 = `${scoreP1Set3}-${scoreP2Set3}`;
            }

            await api.matches.updateScore(selectedMatchForScore.id, scoreObj, selectedWinnerId);
            addToast("Resultado registrado correctamente.", 'success');
            setSelectedMatchForScore(null);
            loadTournament();
        } catch (e: any) {
            addToast("Error al guardar resultado: " + e.message, 'error');
        } finally {
            setSavingScore(false);
        }
    };

    const handlePlayerClickForSwap = async (playerId?: string, playerName?: string) => {
        if (!isSwapMode || !tournament || !playerId || !playerName) return;

        if (!swapSource) {
            setSwapSource({ id: playerId, name: playerName });
            addToast(`Seleccionaste a ${playerName}. Ahora haz clic en el jugador con quien deseas intercambiarlo.`, 'info');
            return;
        }

        if (swapSource.id === playerId) {
            setSwapSource(null);
            addToast('Selección cancelada', 'info');
            return;
        }

        // Execute swap
        setIsSwapping(true);
        try {
            await api.tournaments.swapGroupPlayers(
                tournament.id,
                swapSource,
                { id: playerId, name: playerName }
            );
            addToast(`¡Intercambio realizado entre ${swapSource.name} y ${playerName}!`, 'success');
            setSwapSource(null);
            setIsSwapMode(false);
            loadTournament();
        } catch (e: any) {
            addToast("Error al intercambiar jugadores: " + e.message, 'error');
        } finally {
            setIsSwapping(false);
        }
    };

    const formatMatchScore = (score: any) => {
        if (!score) return null;
        if (typeof score === 'string') return score;
        if (typeof score === 'object') {
            if (score.set1 || score.set2) {
                const s1 = score.set1 || '';
                const s2 = score.set2 || '';
                const s3 = score.set3 ? ` ${score.set3}` : '';
                return `${s1} ${s2}${s3}`.trim();
            }
            if (Array.isArray(score)) {
                return score.map((s: any) => `${s.p1}-${s.p2}`).join(' ');
            }
        }
        return JSON.stringify(score);
    };

    if (loading) return <div className="text-center py-20 text-muted">Cargando detalles del torneo...</div>;
    if (!tournament) return <div className="text-center py-20 text-red-500">Torneo no encontrado.</div>;

    const isEnrolled = players.some(p => p.player_id === user.id || p.id === user.id);
    const isRegClosed = tournament.registration_closed || tournament.status !== 'draft';
    const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament.institution_id);

    const groupMatches = matches.filter(m => m.round === 'Fase de Grupos' || m.group_number);
    const playoffMatches = matches.filter(m => m.round !== 'Fase de Grupos' && !m.group_number);

    const displayedMatches = activeTab === 'groups' ? groupMatches : activeTab === 'playoffs' ? playoffMatches : matches;

    return (
        <div className="space-y-6 animate-fade-up">
            <button onClick={onBack} className="flex items-center gap-2 text-muted hover:text-white mb-4 transition-colors">
                <ChevronLeft size={18} /> Volver a Torneos
            </button>

            {/* Header */}
            <div className="relative h-64 rounded-3xl overflow-hidden bg-slate-800 group shadow-2xl border border-white/10">
                {tournament.image_url ? (
                    <img src={tournament.image_url} alt={tournament.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black opacity-60"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <div className="flex gap-2 mb-2">
                                <span className="bg-primary text-dark font-bold px-2.5 py-1 rounded-lg text-xs uppercase shadow-sm">{tournament.category}</span>
                                <span className="bg-white/10 text-white font-bold px-2.5 py-1 rounded-lg text-xs uppercase backdrop-blur-sm border border-white/10">{tournament.type}</span>
                                {isUserMember && (
                                    <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <Award size={12} /> Socio del Club
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{tournament.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                                <span className="flex items-center gap-1"><Calendar size={14} className="text-primary" /> {new Date(tournament.start_date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><MapPin size={14} className="text-primary" /> {tournament.institutions?.name}</span>
                                <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> {players.length} Inscritos</span>
                            </div>
                        </div>

                        {/* Action and Share Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    addToast('¡Link del torneo copiado al portapapeles!', 'success');
                                }}
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm"
                                title="Copiar link directo al torneo"
                            >
                                <Share2 size={16} className="text-primary" /> Copiar Link
                            </button>

                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    const message = encodeURIComponent(`🎾 ¡Te invito a participar en el torneo "${tournament.name}" en ${tournament.institutions?.name || 'nuestro club'}! Regístrate o inscríbete directamente aquí: ${shareUrl}`);
                                    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                                }}
                                className="px-4 py-3 bg-green-600/30 hover:bg-green-600/50 text-green-300 font-semibold rounded-xl transition-all border border-green-500/30 flex items-center gap-2 text-sm"
                                title="Compartir por WhatsApp"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>

                            {!isEnrolled ? (
                                !isRegClosed ? (
                                    <button onClick={handleEnrollClick} disabled={isEnrolling} className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-sm">
                                        {isEnrolling ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                        Inscribirme (${effectivePrice})
                                    </button>
                                ) : (
                                    <div className="px-6 py-3 bg-white/5 text-muted font-bold rounded-xl border border-white/10 text-sm">Inscripción Cerrada</div>
                                )
                            ) : (
                                <div className="px-6 py-3 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30 flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={18} /> Ya estás inscrito
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ADMIN PANEL */}
                {isClubAdmin && (
                    <div className="col-span-1 lg:col-span-3">
                        <Card className="bg-slate-800/50 border-white/10">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-primary" /> Panel de Control del Torneo
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-muted uppercase font-semibold">{tournament.status}</span>
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿${isRegClosed ? 'Abrir' : 'Cerrar'} inscripciones?`)) return;
                                        try {
                                            await api.tournaments.update(tournament.id, { registration_closed: !isRegClosed });
                                            addToast('Estado actualizado', 'success');
                                            loadTournament();
                                        } catch (e) { addToast('Error al actualizar', 'error'); }
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isRegClosed
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                                        }`}
                                >
                                    {isRegClosed ? 'Abrir Inscripción' : 'Cerrar Inscripción'}
                                </button>

                                {tournament.status !== 'finished' && (
                                    <>
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
                                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <Play size={14} /> Generar Grupos
                                        </button>

                                        {groupMatches.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setIsSwapMode(!isSwapMode);
                                                    setSwapSource(null);
                                                }}
                                                disabled={isSwapping}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                                    isSwapMode
                                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                <ArrowLeftRight size={14} className={isSwapping ? "animate-spin" : ""} />
                                                {isSwapMode ? 'Cancelar Intercambio' : 'Intercambiar Jugadores'}
                                            </button>
                                        )}

                                        <button
                                            onClick={async () => {
                                                if (matches.some(m => m.round === 'Cuartos de Final' || m.round === 'Semifinal')) {
                                                    alert('Ya existen playoffs.');
                                                    return;
                                                }
                                                try {
                                                    await api.tournaments.generatePlayoffs(tournament.id);
                                                    addToast('Bracket de playoffs generado!', 'success');
                                                    loadTournament();
                                                } catch (e: any) { addToast(e.message, 'error'); }
                                            }}
                                            className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <Trophy size={14} /> Generar Playoffs
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Organizer Advice Banner */}
                            {groupMatches.length > 0 && tournament.status !== 'finished' && (
                                <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                    <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-200/90 leading-relaxed">
                                        <span className="font-bold text-amber-300">Consejo de Organización:</span> Al no contar con datos previos o historial suficiente de los jugadores, si observas que un grupo está desfasado o muy desigual, puedes hacer clic en <strong className="text-white">"Intercambiar Jugadores"</strong> para equilibrar las zonas manualmente haciendo clic sobre los dos participantes que deseas intercambiar.
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* Left: Matches & Brackets */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy className="text-amber-500" size={20} /> Partidos y Cuadro de Competencia
                            </h3>

                            {/* View Filter Tabs */}
                            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeTab === 'all' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                >
                                    Todos ({matches.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('groups')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeTab === 'groups' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                >
                                    Grupos ({groupMatches.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('playoffs')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeTab === 'playoffs' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                >
                                    Playoffs ({playoffMatches.length})
                                </button>
                            </div>
                        </div>

                        {/* Swap Mode Active Guide Bar */}
                        {isSwapMode && (
                            <div className="mb-4 p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                                <div className="text-xs text-amber-200 flex items-center gap-2.5">
                                    <ArrowLeftRight size={18} className="text-amber-400 shrink-0" />
                                    {swapSource ? (
                                        <span>
                                            Seleccionaste a <strong className="text-white bg-amber-500/40 px-2 py-0.5 rounded-lg font-bold">{swapSource.name}</strong>. Ahora haz clic sobre el jugador con quien deseas intercambiarlo.
                                        </span>
                                    ) : (
                                        <span>
                                            <strong className="text-white">Modo Intercambio Activo:</strong> Haz clic sobre el primer jugador que deseas mover de zona.
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setIsSwapMode(false); setSwapSource(null); }}
                                    className="text-xs text-amber-300 hover:text-white px-3 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 rounded-xl transition-all font-semibold self-end sm:self-auto"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}

                        {displayedMatches.length === 0 ? (
                            <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Trophy size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No hay partidos disponibles en esta sección.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {displayedMatches.map(m => {
                                    const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id;
                                    const canEditScore = isClubAdmin || isUserInMatch;
                                    const formattedScore = formatMatchScore(m.score);
                                    const isGroupMatchPending = m.round === 'Fase de Grupos' && m.scheduling_status !== 'finished';
                                    const isP1SelectedForSwap = swapSource?.id === m.player1_id;
                                    const isP2SelectedForSwap = swapSource?.id === m.player2_id;

                                    return (
                                        <div key={m.id} className="bg-slate-900/60 hover:bg-slate-900 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                            <div className="space-y-1.5 flex-1 min-w-0 w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 px-2 py-0.5 rounded">
                                                        {m.round} {m.group_number ? `(Grupo ${m.group_number})` : ''}
                                                    </span>
                                                    {isUserInMatch && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                                                            Tu Partido
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1 pt-1">
                                                    {/* Player 1 Row */}
                                                    {isSwapMode && isGroupMatchPending ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePlayerClickForSwap(m.player1_id, m.player1_name)}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-all border ${
                                                                isP1SelectedForSwap
                                                                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-md'
                                                                    : 'bg-white/5 hover:bg-amber-500/10 border-white/5 hover:border-amber-500/30 text-white'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <ArrowLeftRight size={13} className={isP1SelectedForSwap ? "text-amber-400" : "text-muted"} />
                                                                {m.player1_name || 'A definir'}
                                                            </span>
                                                            <span className="text-[11px] text-amber-300/80 font-normal">
                                                                {isP1SelectedForSwap ? '✓ Seleccionado' : 'Click para mover'}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player1_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                            <span>{m.player1_name || 'A definir'}</span>
                                                            {m.winner_id === m.player1_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                        </div>
                                                    )}

                                                    {/* Player 2 Row */}
                                                    {isSwapMode && isGroupMatchPending ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePlayerClickForSwap(m.player2_id, m.player2_name)}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-all border ${
                                                                isP2SelectedForSwap
                                                                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-md'
                                                                    : 'bg-white/5 hover:bg-amber-500/10 border-white/5 hover:border-amber-500/30 text-white'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <ArrowLeftRight size={13} className={isP2SelectedForSwap ? "text-amber-400" : "text-muted"} />
                                                                {m.player2_name || 'A definir'}
                                                            </span>
                                                            <span className="text-[11px] text-amber-300/80 font-normal">
                                                                {isP2SelectedForSwap ? '✓ Seleccionado' : 'Click para mover'}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player2_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                            <span>{m.player2_name || 'A definir'}</span>
                                                            {m.winner_id === m.player2_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                                                {formattedScore ? (
                                                    <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-center">
                                                        <div className="text-[10px] text-muted uppercase font-bold">Resultado</div>
                                                        <div className="text-sm font-mono font-bold text-primary">{formattedScore}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg font-semibold">
                                                        Por Jugar
                                                    </span>
                                                )}

                                                {canEditScore && !isSwapMode && (
                                                    <button
                                                        onClick={() => openScoreModal(m)}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-all border border-white/10"
                                                        title="Cargar o modificar resultado"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Players List */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
                            <Users size={18} className="text-primary" /> Jugadores Inscritos ({players.length})
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {players.length === 0 ? (
                                <div className="text-muted text-sm text-center py-6">Aún no hay jugadores inscritos.</div>
                            ) : (
                                players.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-sidebar/50 border border-white/5 rounded-xl hover:border-white/20 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                            {(p.name || p.player_name || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-white truncate">{p.name || p.player_name}</div>
                                            <div className="text-[10px] text-muted">{p.category ? `${p.category} Cat.` : 'Sin Categoría'}</div>
                                        </div>
                                        {(p.player_id === user.id || p.id === user.id) && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                                Tú
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* SCORE INPUT MODAL */}
            {selectedMatchForScore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Edit3 size={18} className="text-primary" /> Cargar Resultado del Partido
                            </h3>
                            <button onClick={() => setSelectedMatchForScore(null)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveScore} className="p-6 space-y-4">
                            <div className="text-center pb-2 border-b border-white/10">
                                <span className="text-xs text-muted font-bold uppercase">{selectedMatchForScore.round}</span>
                                <div className="text-white font-bold text-sm mt-1">
                                    {selectedMatchForScore.player1_name} vs {selectedMatchForScore.player2_name}
                                </div>
                            </div>

                            {/* SETS INPUT */}
                            <div className="space-y-3">
                                {/* Set 1 */}
                                <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white">Set 1</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP1Set1}
                                        onChange={e => setScoreP1Set1(Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP2Set1}
                                        onChange={e => setScoreP2Set1(Number(e.target.value))}
                                    />
                                </div>

                                {/* Set 2 */}
                                <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white">Set 2</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP1Set2}
                                        onChange={e => setScoreP1Set2(Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP2Set2}
                                        onChange={e => setScoreP2Set2(Number(e.target.value))}
                                    />
                                </div>

                                {/* Set 3 / Super Tiebreak */}
                                {hasSet3 ? (
                                    <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5 animate-fade-up">
                                        <span className="text-xs font-bold text-white">Set 3 / STB</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                            value={scoreP1Set3}
                                            onChange={e => setScoreP1Set3(Number(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                            value={scoreP2Set3}
                                            onChange={e => setScoreP2Set3(Number(e.target.value))}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setHasSet3(true)}
                                        className="w-full py-2 border border-dashed border-white/20 text-xs text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                                    >
                                        + Agregar 3er Set / Super Tiebreak
                                    </button>
                                )}
                            </div>

                            {/* WINNER SELECTOR */}
                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs text-muted uppercase font-bold">Ganador del Partido</label>
                                <select
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs font-bold focus:border-primary outline-none"
                                    value={selectedWinnerId}
                                    onChange={e => setSelectedWinnerId(e.target.value)}
                                    required
                                >
                                    <option value={selectedMatchForScore.player1_id}>{selectedMatchForScore.player1_name}</option>
                                    <option value={selectedMatchForScore.player2_id}>{selectedMatchForScore.player2_name}</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMatchForScore(null)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingScore}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {savingScore ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar Marcador
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};