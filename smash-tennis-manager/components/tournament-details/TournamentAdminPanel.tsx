import React from 'react';
import { 
    Users, 
    Settings2, 
    ArrowLeftRight, 
    Trophy, 
    CheckCircle2, 
    UserPlus, 
    Trash2, 
    Lightbulb, 
    Shield, 
    Gift, 
    Wallet, 
    TrendingUp 
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Tournament, Match, TournamentPlayer, User } from '../../types';
import { api } from '../../services/api';
import { soundEffects } from '../../services/soundEffects';

interface TournamentAdminPanelProps {
    isClubAdmin: boolean;
    tournament: Tournament;
    isRegClosed: boolean;
    loadTournament: () => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    matches: Match[];
    players: TournamentPlayer[];
    setFixtureNumGroups: (num: number) => void;
    handleShufflePreview: (num: number) => void;
    setShowFixtureModal: (show: boolean) => void;
    groupMatches: Match[];
    isSwapMode: boolean;
    setIsSwapMode: (mode: boolean) => void;
    setSwapSource: (source: any) => void;
    isSwapping: boolean;
    handleOpenOfficializeModal: () => void;
    generatingPlayoffs: boolean;
    playoffMatches: Match[];
    handleConfirmAllGroupMatches: () => void;
    openManualEnrollModal: () => void;
    canDeleteTournament: boolean;
    setShowDeleteModal: (show: boolean) => void;
    user: User;
    isCommissionWaived: boolean;
    isTogglingWaive: boolean;
    handleToggleCommissionWaived: () => void;
    countsForRanking: boolean;
    isTogglingRanking: boolean;
    handleToggleCountsForRanking: () => void;
    tierInfo: {
        label: string;
        pointsWinner: number;
        badgeColor: string;
        textColor: string;
        borderColor: string;
    };
    finances: {
        grossTotal: number;
        feePct: number;
        platformTotalCommission: number;
        clubNetIncome: number;
    };
    effectivePrice: number;
}

export const TournamentAdminPanel: React.FC<TournamentAdminPanelProps> = ({
    isClubAdmin,
    tournament,
    isRegClosed,
    loadTournament,
    addToast,
    matches,
    players,
    setFixtureNumGroups,
    handleShufflePreview,
    setShowFixtureModal,
    groupMatches,
    isSwapMode,
    setIsSwapMode,
    setSwapSource,
    isSwapping,
    handleOpenOfficializeModal,
    generatingPlayoffs,
    playoffMatches,
    handleConfirmAllGroupMatches,
    openManualEnrollModal,
    canDeleteTournament,
    setShowDeleteModal,
    user,
    isCommissionWaived,
    isTogglingWaive,
    handleToggleCommissionWaived,
    countsForRanking,
    isTogglingRanking,
    handleToggleCountsForRanking,
    tierInfo,
    finances,
    effectivePrice,
}) => {
    if (!isClubAdmin) return null;

    return (
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
                                            onClick={() => {
                                                if (matches.some(m => m.round === 'Fase de Grupos')) {
                                                    alert('Ya existe una fase de grupos activa.');
                                                    return;
                                                }
                                                if (players.length < 3) {
                                                    addToast('Se necesitan al menos 3 jugadores inscriptos para generar grupos.', 'warning');
                                                    return;
                                                }
                                                const defaultGroups = Math.max(1, Math.floor(players.length / 3));
                                                setFixtureNumGroups(defaultGroups);
                                                handleShufflePreview(defaultGroups);
                                                setShowFixtureModal(true);
                                            }}
                                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Settings2 size={14} /> Configurar y Generar Grupos
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

                                        {groupMatches.length > 0 && tournament.status !== 'finished' && (
                                            <button
                                                onClick={handleOpenOfficializeModal}
                                                disabled={generatingPlayoffs}
                                                className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Trophy size={14} className={generatingPlayoffs ? "animate-spin text-amber-400" : "text-amber-400"} />
                                                {playoffMatches.length > 0 ? 'Regenerar Llaves de Playoffs' : '🏆 Clasificar y Armar Llaves'}
                                            </button>
                                        )}

                                        {groupMatches.some(m => (m.score || m.is_played) && m.score_status !== 'confirmed') && (
                                            <button
                                                onClick={handleConfirmAllGroupMatches}
                                                className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                                title="Validar y confirmar oficialmente todos los resultados pendientes de la fase de grupos"
                                            >
                                                <CheckCircle2 size={14} className="text-purple-400" /> Validar Resultados Pendientes
                                            </button>
                                        )}

                                        <button
                                            onClick={openManualEnrollModal}
                                            className="px-4 py-2 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <UserPlus size={14} /> Inscribir Jugador
                                        </button>
                                    </>
                                )}

                                {canDeleteTournament && (
                                    <button
                                        onClick={() => {
                                            soundEffects.playScoreBeep();
                                            setShowDeleteModal(true);
                                        }}
                                        className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ml-auto"
                                        title="Eliminar este torneo de forma permanente"
                                    >
                                        <Trash2 size={14} /> Eliminar Torneo
                                    </button>
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
                            {/* SUPERADMIN EXCLUSIVE CONTROLS */}
                            {user.role === 'superadmin' && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-purple-950/40 border border-purple-500/30 rounded-2xl space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} className="text-purple-400" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Controles Exclusivos de Superadmin
                                            </h4>
                                        </div>
                                        <span className="text-[10px] bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">Solo Superadmin</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Switch 1: Bonificación */}
                                        <div className="p-3 bg-slate-900/60 border border-purple-500/20 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                                                    <Gift size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">Bonificar Torneo (0% Comisión)</div>
                                                    <div className="text-[10px] text-purple-200/70 truncate">
                                                        {isCommissionWaived ? '100% bonificado sin comisión.' : 'Comisión estándar activa.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isCommissionWaived}
                                                    disabled={isTogglingWaive}
                                                    onChange={handleToggleCommissionWaived}
                                                />
                                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                                            </label>
                                        </div>

                                        {/* Switch 2: Suma Puntos al Ranking */}
                                        <div className="p-3 bg-slate-900/60 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                                                    <Trophy size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">Suma Puntos al Ranking</div>
                                                    <div className="text-[10px] text-blue-200/70 truncate">
                                                        {countsForRanking ? 'Torneo oficial puntuable.' : 'Torneo amistoso (sin puntos).'}
                                                    </div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={countsForRanking}
                                                    disabled={isTogglingRanking}
                                                    onChange={handleToggleCountsForRanking}
                                                />
                                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FINANCIAL & COMMISSION SUMMARY */}
                            <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
                                {/* Cartel / Banner de Bonificado para el Organizador y Superadmin */}
                                {isCommissionWaived && (
                                    <div className="mb-4 p-3 bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                        <div className="flex items-center gap-2.5">
                                            <Gift className="text-emerald-400 shrink-0" size={20} />
                                            <div>
                                                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                    <span>🎉 Torneo 100% Bonificado</span>
                                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold">0% Comisión</span>
                                                </div>
                                                <div className="text-[11px] text-emerald-200/80">
                                                    La plataforma Smash Tennis ha bonificado este torneo. El 100% de lo recaudado queda libre para el club organizador.
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500 text-dark font-black rounded-lg text-xs tracking-wider uppercase shadow-md shrink-0">
                                            Bonificado
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-2.5 mb-3 gap-2">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} className="text-green-400" />
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            Desglose Financiero y Nivel del Torneo
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCommissionWaived && (
                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                Bonificado
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${tierInfo.badgeColor} ${tierInfo.textColor} ${tierInfo.borderColor}`}>
                                            {tierInfo.label} • {tierInfo.pointsWinner} pts al Campeón
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                        <div className="text-[10px] text-muted uppercase font-bold">Recaudación Bruta</div>
                                        <div className="text-base font-mono font-bold text-white">
                                            ${finances.grossTotal.toLocaleString('es-AR')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{players.length} inscriptos × ${effectivePrice.toLocaleString('es-AR')}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl border space-y-1 ${isCommissionWaived ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                        <div className="text-[10px] uppercase font-bold flex items-center justify-between text-green-400">
                                            <span>Comisión App Smash ({finances.feePct}%)</span>
                                            <TrendingUp size={12} />
                                        </div>
                                        <div className="text-base font-mono font-bold text-green-400 flex items-center gap-2">
                                            <span>${finances.platformTotalCommission.toLocaleString('es-AR')}</span>
                                            {isCommissionWaived && (
                                                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                                    100% OFF
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-green-300/70">
                                            {isCommissionWaived ? 'Bonificación otorgada por Superadmin' : `Take rate según nivel ${tierInfo.label}`}
                                        </div>
                                    </div>
                                    <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                        <div className="text-[10px] text-muted uppercase font-bold">Ingreso Neto Club</div>
                                        <div className="text-base font-mono font-bold text-primary">
                                            ${finances.clubNetIncome.toLocaleString('es-AR')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">Fondos libres de sede y premios</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
        </div>
    );
};
