import React from 'react';
import {
    Trophy,
    CheckCircle2,
    Sparkles,
    Grid,
    HelpCircle,
    Check,
    Calendar,
    Clock,
    MapPin,
    MessageCircle,
    AlertTriangle,
    Swords,
    Edit3,
    Shield
} from 'lucide-react';
import { Tournament, Match, User } from '../../types';
import { PlayoffRound, ProjectedRound } from '../../utils/bracketHelper';
import { formatPlayerName, formatMatchScore } from '../../utils/formatters';
import { soundEffects } from '../../services/soundEffects';

interface TournamentPlayoffsTabProps {
    championName: string | null;
    playoffRounds: PlayoffRound[];
    projectedPlayoffRounds: ProjectedRound[];
    isGroupStageComplete: boolean;
    setShowProjectionHelpModal: (show: boolean) => void;
    isClubAdmin: boolean;
    groupMatches: Match[];
    handleOpenOfficializeModal: () => void;
    generatingPlayoffs: boolean;
    unplayedGroupMatches: Match[];
    tournament: Tournament;
    user: User;
    openScheduleModal: (m: Match) => void;
    openQuickScorerModal: (m: Match) => void;
    openScoreModal: (m: Match) => void;
    handleConfirmScore: (matchId: string) => void;
    setDisputeMatchId: (matchId: string) => void;
    setH2hPlayers: (players: { p1Id: string; p2Id: string }) => void;
    formatScheduledInfo: (scheduledAt?: string, courtName?: string) => {
        dateStr: string;
        timeStr: string;
        courtStr: string;
        fullLabel: string;
        iso?: string;
    } | null;
}

export const TournamentPlayoffsTab: React.FC<TournamentPlayoffsTabProps> = ({
    championName,
    playoffRounds,
    projectedPlayoffRounds,
    isGroupStageComplete,
    setShowProjectionHelpModal,
    isClubAdmin,
    groupMatches,
    handleOpenOfficializeModal,
    generatingPlayoffs,
    unplayedGroupMatches,
    tournament,
    user,
    openScheduleModal,
    openQuickScorerModal,
    openScoreModal,
    handleConfirmScore,
    setDisputeMatchId,
    setH2hPlayers,
    formatScheduledInfo,
}) => {
    return (
        <div className="space-y-6">
            {/* Champion Banner */}
                                {championName && (
                                    <div className="p-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-yellow-500/50 rounded-3xl text-center space-y-2 shadow-2xl animate-fade-in">
                                        <div className="inline-flex p-3 rounded-full bg-yellow-500/30 text-yellow-300 mb-1 ring-4 ring-yellow-400/20 animate-bounce">
                                            <Trophy size={36} />
                                        </div>
                                        <div className="text-xs uppercase tracking-widest font-black text-yellow-300">¡CAMPEÓN DEL TORNEO!</div>
                                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatPlayerName(championName)}</div>
                                        <div className="text-xs text-yellow-200/80">Felicitaciones al ganador del torneo {tournament.name}</div>
                                    </div>
                                )}

                                {playoffMatches.length === 0 ? (
                                    projectedPlayoffRounds.length > 0 ? (
                                        <div className="space-y-6">
                                            {/* Projected Notice Banner */}
                                            <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                                                isGroupStageComplete 
                                                    ? 'bg-gradient-to-r from-emerald-500/15 via-green-500/10 to-transparent border-emerald-500/30' 
                                                    : 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/30'
                                            }`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                                        isGroupStageComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                        {isGroupStageComplete ? <CheckCircle2 size={20} /> : <Sparkles size={18} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                            {isGroupStageComplete ? 'Fase de Grupos Finalizada' : 'Previsualización de Cruces Proyectados'}
                                                            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase ${
                                                                isGroupStageComplete ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                            }`}>
                                                                {isGroupStageComplete ? 'Listo para Oficializar' : 'En Vivo'}
                                                            </span>
                                                        </h4>
                                                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                                                            {isGroupStageComplete 
                                                                ? 'Todos los partidos de grupos han finalizado y las posiciones están 100% definidas. Ya puedes oficializar el cuadro de llaves definitivo.'
                                                                : `Las llaves se proyectan y actualizan automáticamente según las posiciones de la fase de zonas (restan ${unplayedGroupMatches.length} partido(s) por jugarse).`}
                                                        </p>

                                                        {/* Interactive Projection Method Switcher */}
                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <span className="text-[11px] font-bold text-slate-400">Método de Proyección:</span>
                                                            <div className="inline-flex p-1 bg-black/40 rounded-xl border border-white/10 gap-1 items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewFormat('tabla_general_byes')}
                                                                    className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                                                                        activeCompetitionFormat === 'tabla_general_byes'
                                                                            ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                                                            : 'text-slate-400 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <Trophy size={12} />
                                                                    Tabla General + BYEs
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewFormat('zonas_playoffs')}
                                                                    className={`px-3 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                                                                        activeCompetitionFormat === 'zonas_playoffs'
                                                                            ? 'bg-primary text-white shadow-md font-black'
                                                                            : 'text-slate-400 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <Grid size={12} />
                                                                    Cruces Directos por Zonas (Anti-Repetición)
                                                                </button>
                                                            </div>

                                                            {/* Botón de Ayuda / Explicación */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowProjectionHelpModal(true)}
                                                                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                                                                title="Ver explicación detallada de ambos métodos"
                                                            >
                                                                <HelpCircle size={13} className="text-amber-400" />
                                                                <span>¿Cómo funciona cada método?</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isClubAdmin && groupMatches.length > 0 && (
                                                    <button
                                                        onClick={handleOpenOfficializeModal}
                                                        disabled={generatingPlayoffs}
                                                        className={`px-4 py-2.5 text-dark font-black rounded-xl text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shrink-0 ${
                                                            isGroupStageComplete
                                                                ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-extrabold shadow-emerald-500/20'
                                                                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark'
                                                        }`}
                                                    >
                                                        <Trophy size={14} className={generatingPlayoffs ? "animate-spin" : ""} />
                                                        {isGroupStageComplete ? '🏆 Oficializar y Armar Llaves' : `🏆 Oficializar Llaves (${unplayedGroupMatches.length} pend.)`}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Projected Bracket Tree */}
                                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                                <div className="flex items-stretch gap-6 min-w-[650px] py-2">
                                                    {projectedPlayoffRounds.map((round, rIdx) => (
                                                        <div key={rIdx} className="flex-1 min-w-[220px] flex flex-col space-y-4">
                                                            <div className="text-center pb-2 border-b border-white/10">
                                                                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                                    {round.name}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-4 flex flex-col justify-around flex-1">
                                                                {round.matches.map((m) => (
                                                                    <div 
                                                                        key={m.id} 
                                                                        className="relative bg-slate-900/80 border border-dashed border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-3.5 shadow-lg transition-all space-y-2.5"
                                                                    >
                                                                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                                                                            <span>{m.round}</span>
                                                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                                                Proyectado
                                                                            </span>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            {/* Contender 1 */}
                                                                            <div className="bg-white/5 p-2 rounded-xl text-xs space-y-0.5 border border-white/5">
                                                                                <div className="text-[10px] text-muted font-bold">{m.slotP1Label}</div>
                                                                                <div className="font-bold text-white truncate">
                                                                                    {m.p1Name ? formatPlayerName(m.p1Name) : <span className="text-slate-400 italic">Por definir</span>}
                                                                                </div>
                                                                            </div>

                                                                            {/* Contender 2 */}
                                                                            <div className="bg-white/5 p-2 rounded-xl text-xs space-y-0.5 border border-white/5">
                                                                                <div className="text-[10px] text-muted font-bold">{m.slotP2Label}</div>
                                                                                <div className="font-bold text-white truncate">
                                                                                    {m.p2Name ? formatPlayerName(m.p2Name) : <span className="text-slate-400 italic">Por definir</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-14 text-muted bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                                            <Trophy size={40} className="mx-auto text-amber-500 opacity-60" />
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Cuadro de Llaves Pendiente</h4>
                                                <p className="text-xs text-muted max-w-md mx-auto">
                                                    Las llaves de eliminación directa se armarán una vez finalizada la fase de zonas con los clasificados de cada grupo.
                                                </p>
                                            </div>
                                            {isClubAdmin && groupMatches.length > 0 && (
                                                <button
                                                    onClick={handleOpenOfficializeModal}
                                                    disabled={generatingPlayoffs}
                                                    className="mt-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark font-black rounded-xl text-xs shadow-lg hover:brightness-110 transition-all inline-flex items-center gap-2"
                                                >
                                                    <Trophy size={14} className={generatingPlayoffs ? "animate-spin" : ""} />
                                                    🏆 Clasificar y Generar Llaves de Playoffs
                                                </button>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                                        <div className="flex items-stretch gap-8 min-w-[980px] py-3">
                                            {playoffRounds.map((round, rIdx) => (
                                                <div key={rIdx} className="flex-1 min-w-[320px] max-w-[360px] flex flex-col space-y-4">
                                                    <div className="text-center pb-2 border-b border-white/10">
                                                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                            {round.name}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-6 flex flex-col justify-around flex-1">
                                                        {round.matches.map((m) => {
                                                            const hasBothPlayers = !!(m.player1_id && m.player2_id);
                                                            const isUserInMatch = hasBothPlayers && (m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id);
                                                            const isMatchFinishedAndConfirmed = !!(m.is_played && m.score_status === 'confirmed');
                                                            const canEditScore = hasBothPlayers && (isClubAdmin || (isUserInMatch && !isMatchFinishedAndConfirmed));
                                                            const canSchedule = hasBothPlayers && (isClubAdmin || isUserInMatch) && !m.is_played && !m.winner_id;
                                                            const formattedScore = formatMatchScore(m.score);
                                                            const isFinished = !!m.winner_id || (m.score && m.scheduling_status === 'finished');
                                                            const p1DisplayName = m.team1_name || (m.player1_name ? formatPlayerName(m.player1_name) : null) || m.proposal_data?.slot1_label || 'A definir';
                                                            const p2DisplayName = m.team2_name || (m.player2_name ? formatPlayerName(m.player2_name) : null) || m.proposal_data?.slot2_label || 'A definir';
                                                            
                                                            // Accurate team separation for Singles and Doubles
                                                            const isSubmitterTeam1 = m.score_submitted_by === m.player1_id || (!!m.player1_partner_id && m.score_submitted_by === m.player1_partner_id);
                                                            const isSubmitterTeam2 = m.score_submitted_by === m.player2_id || (!!m.player2_partner_id && m.score_submitted_by === m.player2_partner_id);
                                                            const isUserInTeam1 = user.id === m.player1_id || (!!m.player1_partner_id && user.id === m.player1_partner_id);
                                                            const isUserInTeam2 = user.id === m.player2_id || (!!m.player2_partner_id && user.id === m.player2_partner_id);

                                                            const isOpponent = (isSubmitterTeam1 && isUserInTeam2) || (isSubmitterTeam2 && isUserInTeam1) || (!isSubmitterTeam1 && !isSubmitterTeam2 && isUserInMatch && user.id !== m.score_submitted_by);
                                                            const isOpponentPending = isOpponent && m.score_status === 'pending_confirmation';
                                                            const isSubmitterPending = (isUserInTeam1 && isSubmitterTeam1 || isUserInTeam2 && isSubmitterTeam2 || user.id === m.score_submitted_by) && m.score_status === 'pending_confirmation';
                                                            
                                                            let hoursRemaining = 24;
                                                            if (m.score_submitted_at) {
                                                                const elapsed = Date.now() - new Date(m.score_submitted_at).getTime();
                                                                const remMs = 24 * 60 * 60 * 1000 - elapsed;
                                                                hoursRemaining = remMs > 0 ? Math.ceil(remMs / (60 * 60 * 1000)) : 0;
                                                            }

                                                            const scheduledInfo = formatScheduledInfo(m.scheduled_at, m.court_name);

                                                            return (
                                                                <div 
                                                                    key={m.id} 
                                                                    className={`relative bg-slate-900/90 border rounded-2xl p-4 shadow-xl transition-all space-y-3 ${
                                                                        isFinished 
                                                                            ? 'border-primary/40 shadow-primary/5' 
                                                                            : isUserInMatch && scheduledInfo 
                                                                            ? 'border-blue-500/40 bg-blue-950/20' 
                                                                            : !hasBothPlayers
                                                                            ? 'border-dashed border-white/10 bg-slate-950/30'
                                                                            : 'border-white/10 hover:border-white/20'
                                                                    }`}
                                                                >
                                                                    <div className="space-y-2">
                                                                        {/* Contender 1 */}
                                                                        <div className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                                                                            m.winner_id && m.winner_id === m.player1_id 
                                                                                ? 'bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 shadow-sm' 
                                                                                : m.player1_id
                                                                                ? 'bg-white/5 text-white border border-white/5 font-semibold'
                                                                                : 'bg-white/[0.03] text-slate-400 border border-dashed border-white/10'
                                                                        }`}>
                                                                            <div className="flex flex-col truncate pr-2">
                                                                                {!m.player1_id && m.proposal_data?.slot1_label && (
                                                                                    <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">{m.proposal_data.slot1_label}</span>
                                                                                )}
                                                                                <span className={`truncate ${!m.player1_id ? 'text-[11px] text-slate-400 italic' : 'font-bold'}`}>
                                                                                    {m.player1_id ? p1DisplayName : (!m.proposal_data?.slot1_label ? 'Por definir' : '')}
                                                                                </span>
                                                                            </div>
                                                                            {m.winner_id && m.winner_id === m.player1_id && (
                                                                                <div className="p-1 rounded-full bg-emerald-500/30 text-emerald-400">
                                                                                    <Check size={12} className="stroke-[3]" />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Contender 2 */}
                                                                        <div className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                                                                            m.winner_id && m.winner_id === m.player2_id 
                                                                                ? 'bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 shadow-sm' 
                                                                                : m.player2_id
                                                                                ? 'bg-white/5 text-white border border-white/5 font-semibold'
                                                                                : 'bg-white/[0.03] text-slate-400 border border-dashed border-white/10'
                                                                        }`}>
                                                                            <div className="flex flex-col truncate pr-2">
                                                                                {!m.player2_id && m.proposal_data?.slot2_label && (
                                                                                    <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">{m.proposal_data.slot2_label}</span>
                                                                                )}
                                                                                <span className={`truncate ${!m.player2_id ? 'text-[11px] text-slate-400 italic' : 'font-bold'}`}>
                                                                                    {m.player2_id ? p2DisplayName : (!m.proposal_data?.slot2_label ? 'Por definir' : '')}
                                                                                </span>
                                                                            </div>
                                                                            {m.winner_id && m.winner_id === m.player2_id && (
                                                                                <div className="p-1 rounded-full bg-emerald-500/30 text-emerald-400">
                                                                                    <Check size={12} className="stroke-[3]" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Scheduled Info Badge (Solo si está pendiente por jugar) */}
                                                                    {scheduledInfo && !m.is_played && !m.winner_id && (
                                                                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                                                                            <span className="flex items-center gap-1">
                                                                                <Calendar size={10} className="text-blue-400" /> {scheduledInfo.dateStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-mono">
                                                                                <Clock size={10} className="text-blue-400" /> {scheduledInfo.timeStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-bold text-blue-200">
                                                                                <MapPin size={10} className="text-green-400" /> {scheduledInfo.courtStr}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Player Highlight & WhatsApp Coordination Banner */}
                                                                    {isUserInMatch && scheduledInfo && !m.is_played && !m.winner_id && (
                                                                        <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center justify-between gap-1.5 text-[10px]">
                                                                            <span className="text-blue-200 truncate"><strong>Tu partido:</strong> {scheduledInfo.timeStr} ({scheduledInfo.courtStr})</span>
                                                                            <button
                                                                                onClick={() => {
                                                                                    soundEffects.playScoreBeep();
                                                                                    const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" (${m.round || 'Playoffs'}) está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr}. ¿Confirmás?`);
                                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                                }}
                                                                                className="px-2 py-0.5 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded text-[9px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                                                                                title="Coordinar por WhatsApp"
                                                                            >
                                                                                <MessageCircle size={11} /> Avisar
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Status and Action Buttons */}
                                                                    <div className="pt-2.5 border-t border-white/5 space-y-2">
                                                                        {/* Row 1: Status & H2H */}
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                                {formattedScore ? (
                                                                                    <div className="flex flex-col gap-0.5">
                                                                                        <span className="font-mono font-bold text-primary text-xs bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                                                                                            {formattedScore}
                                                                                        </span>
                                                                                        {m.score_status === 'pending_confirmation' && (
                                                                                            <span className="text-[8px] text-amber-400 font-bold flex items-center gap-0.5">
                                                                                                <Clock size={9} /> Pendiente ({hoursRemaining}h)
                                                                                            </span>
                                                                                        )}
                                                                                        {m.score_status === 'disputed' && (
                                                                                            <span className="text-[8px] text-red-400 font-bold flex items-center gap-0.5">
                                                                                                <AlertTriangle size={9} /> En Disputa
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ) : hasBothPlayers ? (
                                                                                    <span className="text-[10px] text-yellow-400 font-semibold bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20 whitespace-nowrap">
                                                                                        Por Jugar
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[10px] text-slate-400 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/5 font-medium flex items-center gap-1 whitespace-nowrap">
                                                                                        <Clock size={10} className="text-slate-500" /> Esperando clasificados
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {m.player1_id && m.player2_id && (
                                                                                <button
                                                                                    onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors text-[10px] font-bold flex items-center gap-1 border border-white/5 shrink-0"
                                                                                    title="Ver H2H"
                                                                                >
                                                                                    <Swords size={11} /> H2H
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {/* Row 2: Action Buttons (full width grid/flex) */}
                                                                        {(canSchedule || canEditScore) && (
                                                                            <div className="flex items-center gap-1.5 pt-1">
                                                                                {/* Schedule Button */}
                                                                                {canSchedule && (
                                                                                    <button
                                                                                        onClick={() => openScheduleModal(m)}
                                                                                        className={`flex-1 min-w-0 p-1.5 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] font-bold ${
                                                                                            scheduledInfo
                                                                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                                                : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                                        }`}
                                                                                        title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                                                    >
                                                                                        <Calendar size={11} className={scheduledInfo ? "text-blue-400 shrink-0" : "shrink-0"} />
                                                                                        <span className="truncate">{scheduledInfo ? "Horario" : "Programar"}</span>
                                                                                    </button>
                                                                                )}

                                                                                {canEditScore && (
                                                                                    <>
                                                                                        <button
                                                                                            onClick={() => openQuickScorerModal(m)}
                                                                                            className="flex-1 min-w-0 p-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-1 text-[10px] font-black shadow-sm active:scale-95"
                                                                                            title="Carga Rápida Táctil (Quick-Scorer)"
                                                                                        >
                                                                                            <Sparkles size={11} className="text-emerald-400 shrink-0" />
                                                                                            <span className="truncate">Rápido</span>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => openScoreModal(m)}
                                                                                            className={`flex-1 min-w-0 p-1.5 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] font-bold ${
                                                                                                !m.is_played
                                                                                                    ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 shadow-sm'
                                                                                                    : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                                            }`}
                                                                                            title={m.is_played ? "Modificar marcador detallado" : "Cargar marcador"}
                                                                                        >
                                                                                            <Edit3 size={11} className={!m.is_played ? "text-primary shrink-0" : "shrink-0"} />
                                                                                            <span className="truncate">{m.is_played ? "Editar" : "Detallado"}</span>
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Submitter info */}
                                                                    {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name) && (
                                                                        <div className="text-[9px] text-slate-400 border-t border-white/5 pt-1 truncate">
                                                                            Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name}</strong>
                                                                        </div>
                                                                    )}

                                                                    {/* Submitter Pending Feedback Banner */}
                                                                    {isSubmitterPending && (
                                                                        <div className="mt-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] text-blue-300 flex items-center gap-1">
                                                                            <Clock size={10} className="text-blue-400 shrink-0" />
                                                                            <span>Esperando confirmación (valida en <strong>{hoursRemaining} hs</strong>).</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Dispute Reason Banner */}
                                                                    {m.score_status === 'disputed' && (m.score_dispute_reason || m.proposal_data?.dispute_reason) && (
                                                                        <div className="mt-1 px-2 py-1 bg-red-500/15 border border-red-500/30 rounded-lg text-[9px] text-red-200">
                                                                            <span className="font-bold text-red-300">Motivo: </span>
                                                                            <span className="italic">"{m.score_dispute_reason || m.proposal_data?.dispute_reason}"</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Rival Score Confirmation Banner */}
                                                                    {isOpponentPending && (
                                                                        <div className="mt-1 p-2 bg-amber-500/15 border border-amber-500/35 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                                                                            <span className="text-[10px] text-amber-200 font-medium">¿Confirmas? ({hoursRemaining}h)</span>
                                                                            <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                                                                                <button
                                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                                    className="flex-1 sm:flex-none px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-0.5"
                                                                                >
                                                                                    <Check size={11} /> Confirmar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                                    className="flex-1 sm:flex-none px-2 py-0.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-bold rounded-lg flex items-center justify-center gap-0.5"
                                                                                >
                                                                                    <AlertTriangle size={11} /> Disputar
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Admin Direct Validation Banner */}
                                                                    {isClubAdmin && (m.score_status === 'pending_confirmation' || m.score_status === 'disputed') && (
                                                                        <div className="mt-1 p-2 bg-purple-500/15 border border-purple-500/30 rounded-xl flex items-center justify-between gap-1.5 shadow-sm">
                                                                            <span className="text-[9px] text-purple-200 flex items-center gap-1 font-medium">
                                                                                <Shield size={11} className="text-purple-400" />
                                                                                {m.score_status === 'disputed' ? 'En disputa' : `Pendiente (${hoursRemaining}h)`}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => handleConfirmScore(m.id)}
                                                                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold rounded flex items-center gap-1 shadow-sm transition-all"
                                                                                title="Validar y confirmar oficialmente como Administrador"
                                                                            >
                                                                                <Check size={10} /> Validar (Admin)
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: TODOS LOS PARTIDOS (LISTA COMPACTA) */}
                        {activeTab === 'all' && (
                            <div>
                                {displayedMatches.length === 0 ? (
                                    <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <Trophy size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay partidos disponibles en esta sección.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {displayedMatches.map(m => {
                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                            const isMatchFinishedAndConfirmed = !!(m.is_played && m.score_status === 'confirmed');
                                            const canEditScore = isClubAdmin || (isUserInMatch && !isMatchFinishedAndConfirmed);
                                            const formattedScore = formatMatchScore(m.score);
                                            const p1DisplayName = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                            const p2DisplayName = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                            
                                            // Accurate team separation for Singles and Doubles
                                            const isSubmitterTeam1 = m.score_submitted_by === m.player1_id || (!!m.player1_partner_id && m.score_submitted_by === m.player1_partner_id);
                                            const isSubmitterTeam2 = m.score_submitted_by === m.player2_id || (!!m.player2_partner_id && m.score_submitted_by === m.player2_partner_id);
                                            const isUserInTeam1 = user.id === m.player1_id || (!!m.player1_partner_id && user.id === m.player1_partner_id);
                                            const isUserInTeam2 = user.id === m.player2_id || (!!m.player2_partner_id && user.id === m.player2_partner_id);

                                            const isOpponent = (isSubmitterTeam1 && isUserInTeam2) || (isSubmitterTeam2 && isUserInTeam1) || (!isSubmitterTeam1 && !isSubmitterTeam2 && isUserInMatch && user.id !== m.score_submitted_by);
                                            const isOpponentPending = isOpponent && m.score_status === 'pending_confirmation';
                                            const isSubmitterPending = (isUserInTeam1 && isSubmitterTeam1 || isUserInTeam2 && isSubmitterTeam2 || user.id === m.score_submitted_by) && m.score_status === 'pending_confirmation';
                                            
                                            let hoursRemaining = 24;
                                            if (m.score_submitted_at) {
                                                const elapsed = Date.now() - new Date(m.score_submitted_at).getTime();
                                                const remMs = 24 * 60 * 60 * 1000 - elapsed;
                                                hoursRemaining = remMs > 0 ? Math.ceil(remMs / (60 * 60 * 1000)) : 0;
                                            }

                                            const scheduledInfo = formatScheduledInfo(m.scheduled_at, m.court_name);

                                            return (
                                                <div 
                                                    key={m.id} 
                                                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                                                        isUserInMatch && scheduledInfo && !m.is_played
                                                            ? 'bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-950/30'
                                                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/10'
                                                    }`}
                                                >
                                                    <div className="space-y-2 flex-1 min-w-0 w-full sm:w-auto">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 px-2 py-0.5 rounded">
                                                                {m.round} {m.group_number ? `(Grupo ${m.group_number})` : ''}
                                                            </span>
                                                            {isUserInMatch && (
                                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                                                                    Tu Partido
                                                                </span>
                                                            )}
                                                            {scheduledInfo && !m.is_played && !m.winner_id && (
                                                                <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                                                    <Calendar size={11} className="text-blue-400" />
                                                                    <span>{scheduledInfo.dateStr}</span>
                                                                    <span className="text-blue-400/60">•</span>
                                                                    <Clock size={11} className="text-blue-400" />
                                                                    <span>{scheduledInfo.timeStr}</span>
                                                                    <span className="text-blue-400/60">•</span>
                                                                    <MapPin size={11} className="text-green-400" />
                                                                    <span className="text-white font-bold">{scheduledInfo.courtStr}</span>
                                                                </span>
                                                            )}
                                                            {m.score_status === 'pending_confirmation' && (
                                                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5" title={`Auto-confirmación en ${hoursRemaining} hs`}>
                                                                    <Clock size={10} /> Pendiente ({hoursRemaining}h)
                                                                </span>
                                                            )}
                                                            {m.score_status === 'disputed' && (
                                                                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                                    <AlertTriangle size={10} /> En Disputa
                                                                </span>
                                                            )}
                                                            {m.score_status === 'confirmed' && (
                                                                <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                                    <CheckCircle2 size={10} /> Verificado
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 pt-1">
                                                            <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player1_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                                <span>{p1DisplayName}</span>
                                                                {m.winner_id === m.player1_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                            </div>
                                                            <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player2_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                                <span>{p2DisplayName}</span>
                                                                {m.winner_id === m.player2_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                            </div>
                                                        </div>

                                                        {/* Player Highlight & WhatsApp Coordination Banner */}
                                                        {isUserInMatch && scheduledInfo && !m.is_played && !m.winner_id && (
                                                            <div className="p-2 bg-gradient-to-r from-blue-500/20 via-primary/10 to-transparent border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 mt-1">
                                                                <div className="flex items-center gap-1.5 text-xs text-blue-200 truncate">
                                                                    <Clock size={12} className="text-blue-400 shrink-0" />
                                                                    <span className="truncate"><strong>Tu partido:</strong> {scheduledInfo.fullLabel}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        soundEffects.playScoreBeep();
                                                                        const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                        const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr} (${tournament.institutions?.name || 'el club'}). ¿Confirmás?`);
                                                                        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                    }}
                                                                    className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                                                                    title="Coordinar por WhatsApp"
                                                                >
                                                                    <MessageCircle size={11} /> Coordinar
                                                                </button>
                                                            </div>
                                                        )}

                                                        {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name || m.played_at) && (
                                                            <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                                                                <span>Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name || 'Participante'}</strong></span>
                                                                {(m.score_submitted_at || m.score?.submitted_at || m.played_at) && (
                                                                    <span className="text-slate-500">
                                                                        • {new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs ({new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Submitter Pending Feedback Banner */}
                                                        {isSubmitterPending && (
                                                            <div className="mt-1 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 flex items-center gap-1.5">
                                                                <Clock size={11} className="text-blue-400 shrink-0" />
                                                                <span>Esperando confirmación de rivales (se auto-valida en <strong>{hoursRemaining} hs</strong>).</span>
                                                            </div>
                                                        )}

                                                        {/* Dispute Reason Banner */}
                                                        {m.score_status === 'disputed' && (m.score_dispute_reason || m.proposal_data?.dispute_reason) && (
                                                            <div className="mt-1 px-2.5 py-1.5 bg-red-500/15 border border-red-500/30 rounded-lg text-[10px] text-red-200">
                                                                <span className="font-bold text-red-300">Motivo del rechazo: </span>
                                                                <span className="italic">"{m.score_dispute_reason || m.proposal_data?.dispute_reason}"</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                                                        {m.player1_id && m.player2_id && (
                                                            <button
                                                                onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-all border border-white/10 text-xs font-bold flex items-center gap-1"
                                                                title="Ver Historial Cara a Cara"
                                                            >
                                                                <Swords size={14} /> H2H
                                                            </button>
                                                        )}

                                                        {/* Schedule Button for Admin or Assigned Players (Solo si el partido NO fue jugado aún) */}
                                                        {(isClubAdmin || isUserInMatch) && !m.is_played && !m.winner_id && (
                                                            <button
                                                                onClick={() => openScheduleModal(m)}
                                                                className={`px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                                                                    scheduledInfo
                                                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                        : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                }`}
                                                                title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                            >
                                                                <Calendar size={14} className={scheduledInfo ? "text-blue-400" : ""} />
                                                                <span>{scheduledInfo ? "Horario" : "Programar"}</span>
                                                            </button>
                                                        )}

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
                                                                className={`px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                                                                    !m.is_played
                                                                        ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 shadow-sm'
                                                                        : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                }`}
                                                                title={m.is_played ? "Modificar resultado" : "Cargar resultado del partido"}
                                                            >
                                                                <Edit3 size={14} className={!m.is_played ? "text-primary" : ""} />
                                                                <span>{m.is_played ? "Editar" : "Resultado"}</span>
                                                            </button>
                                                        )}

                                                        {isOpponentPending && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                    className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md"
                                                                    title="Confirmar marcador"
                                                                >
                                                                    <Check size={13} /> Confirmar
                                                                </button>
                                                                <button
                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                    className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1"
                                                                    title="Disputar marcador"
                                                                >
                                                                    <AlertTriangle size={13} /> Disputar
                                                                </button>
                                                            </div>
                                                        )}

                                                        {isClubAdmin && (m.score_status === 'pending_confirmation' || m.score_status === 'disputed') && (
                                                            <button
                                                                onClick={() => handleConfirmScore(m.id)}
                                                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md transition-all"
                                                                title="Validar y confirmar oficialmente como Administrador"
                                                            >
                                                                <Check size={13} /> Validar (Admin)
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
    );
};
