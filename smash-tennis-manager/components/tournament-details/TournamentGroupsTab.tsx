import React from 'react';
import { 
    Grid, 
    Trophy, 
    ArrowLeftRight, 
    Swords, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    Calendar, 
    Sparkles, 
    Edit3, 
    MapPin, 
    MessageCircle, 
    Check, 
    Shield 
} from 'lucide-react';
import { Tournament, Match, User } from '../../types';
import { GroupZone, UnifiedStandingRow } from '../../utils/bracketHelper';
import { formatPlayerName, formatMatchScore } from '../../utils/formatters';
import { soundEffects } from '../../services/soundEffects';

interface TournamentGroupsTabProps {
    zones: GroupZone[];
    unifiedStandings: UnifiedStandingRow[];
    standingsViewMode: 'unified' | 'zones';
    setStandingsViewMode: (mode: 'unified' | 'zones') => void;
    competitionFormat: string;
    isSwapMode: boolean;
    swapSource: { id: string; name: string } | null;
    handlePlayerClickForSwap: (playerId: string, playerName: string) => void;
    tournament: Tournament;
    user: User;
    isClubAdmin: boolean;
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

export const TournamentGroupsTab: React.FC<TournamentGroupsTabProps> = ({
    zones,
    unifiedStandings,
    standingsViewMode,
    setStandingsViewMode,
    competitionFormat,
    isSwapMode,
    swapSource,
    handlePlayerClickForSwap,
    tournament,
    user,
    isClubAdmin,
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
            {zones.length === 0 ? (
                <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-dashed border-white/10 space-y-2">
                    <Grid size={32} className="mx-auto opacity-40 text-primary" />
                    <p className="text-sm font-semibold text-white">Aún no se ha generado la fase de grupos</p>
                    <p className="text-xs text-muted">Los administradores pueden configurar y sortear las zonas desde el panel superior.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Sub-tab Switcher: Tabla General vs Zonas */}
                    <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900/60 p-2 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setStandingsViewMode('unified')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    standingsViewMode === 'unified' 
                                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                                        : 'text-slate-400 hover:text-white bg-white/5'
                                }`}
                            >
                                <Trophy size={13} /> Tabla General ({unifiedStandings.length})
                            </button>
                            <button
                                onClick={() => setStandingsViewMode('zones')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    standingsViewMode === 'zones' 
                                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                        : 'text-slate-400 hover:text-white bg-white/5'
                                }`}
                            >
                                <Grid size={13} /> Zonas Individuales ({zones.length})
                            </button>
                        </div>
                        <span className="text-[11px] text-slate-400 hidden sm:inline font-semibold">
                            {competitionFormat === 'tabla_general_byes' ? '🏆 Modalidad: Tabla General + BYEs' : '🎾 Modalidad: Zonas Tradicionales'}
                        </span>
                    </div>

                    {/* TABLA GENERAL UNIFICADA (Estilo Planilla Oficial) */}
                    {standingsViewMode === 'unified' && (
                        <div className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-0">
                            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-800 to-transparent border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 font-black">
                                        <Trophy size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                            Clasificación General ({unifiedStandings.length} Participantes)
                                        </h4>
                                        <span className="text-[10px] text-muted">
                                            Orden: Puntos &gt; Partidos Ganados &gt; Dif. Sets &gt; Dif. Games
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                    {competitionFormat === 'tabla_general_byes' ? 'Tabla General Unificada' : 'Tabla General Oficial'}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-black/30 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="py-2.5 px-3">#</th>
                                            <th className="py-2.5 px-3">Jugador</th>
                                            <th className="py-2.5 px-2 text-center" title="Partidos Jugados">PJ</th>
                                            <th className="py-2.5 px-2 text-center text-green-400" title="Partidos Ganados">PG</th>
                                            <th className="py-2.5 px-2 text-center text-red-400" title="Partidos Perdidos">PP</th>
                                            <th className="py-2.5 px-2 text-center" title="Sets Ganados / Perdidos / Diferencia">Sets (Dif)</th>
                                            <th className="py-2.5 px-2 text-center" title="Games Ganados / Perdidos / Diferencia">Games (Dif)</th>
                                            <th className="py-2.5 px-3 text-right text-primary font-black" title="Puntos en la tabla">PTS</th>
                                            <th className="py-2.5 px-3 text-center">Destino en Cuadro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {unifiedStandings.map((p) => {
                                            const isTopSeed = p.rank === 1 || p.rank === 2;
                                            const isByeQuarter = p.rank === 3;
                                            return (
                                                <tr 
                                                    key={p.playerId}
                                                    className={`transition-colors hover:bg-white/5 ${
                                                        p.rank === 1 ? 'bg-amber-500/10' :
                                                        p.rank === 2 ? 'bg-slate-400/10' :
                                                        p.rank === 3 ? 'bg-amber-700/10' : ''
                                                    }`}
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                            p.rank === 1 ? 'bg-yellow-500 text-dark font-black shadow-sm' :
                                                            p.rank === 2 ? 'bg-slate-300 text-dark font-black' :
                                                            p.rank === 3 ? 'bg-amber-600 text-white font-bold' :
                                                            'bg-slate-800 text-slate-400'
                                                        }`}>
                                                            {p.rank}°
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white">{formatPlayerName(p.playerName)}</span>
                                                            {p.groupName && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                                                                    {p.groupName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{p.matchesPlayed}</td>
                                                    <td className="py-2.5 px-2 text-center text-green-400 font-mono font-bold">{p.matchesWon}</td>
                                                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{p.matchesLost}</td>
                                                    <td className="py-2.5 px-2 text-center text-slate-300 font-mono text-[11px]">
                                                        {p.setsWon}-{p.setsLost} <span className={p.diffSets > 0 ? 'text-green-400 font-bold' : p.diffSets < 0 ? 'text-red-400' : 'text-slate-500'}>({p.diffSets > 0 ? `+${p.diffSets}` : p.diffSets})</span>
                                                    </td>
                                                    <td className={`py-2.5 px-2 text-center font-mono text-[11px] ${p.diffGames > 0 ? 'text-green-400 font-bold' : p.diffGames < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {p.gamesWon}-{p.gamesLost} ({p.diffGames > 0 ? `+${p.diffGames}` : p.diffGames})
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-primary">
                                                        {p.points}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {competitionFormat === 'tabla_general_byes' ? (
                                                            isTopSeed ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                                                    BYE a Semis ⚡
                                                                </span>
                                                            ) : isByeQuarter && unifiedStandings.length === 9 ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                                                    BYE a Cuartos 🎾
                                                                </span>
                                                            ) : p.rank === 5 || p.rank === 9 ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                                                    Pre-Cuartos
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                                                    Cuartos de Final
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                                                                {p.rank <= 4 ? 'Clasifica a Playoffs ✓' : 'Fase de Zonas'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Individual Zones Grid */}
                    <div className="grid grid-cols-1 gap-6">
                        {zones.map((zone) => (
                            <div key={zone.groupNumber} className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                {/* Zone Header */}
                                <div className="p-4 bg-gradient-to-r from-primary/20 via-slate-800 to-transparent border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary font-black">
                                            <Grid size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider">{zone.groupName}</h4>
                                            <span className="text-[10px] text-muted">{zone.players.length} participantes • 2 clasifican</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                                        Top 2 a Playoffs
                                    </span>
                                </div>

                                {/* Standings Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-black/30 text-slate-400 font-bold uppercase text-[10px]">
                                                <th className="py-2.5 px-3">#</th>
                                                <th className="py-2.5 px-3">Jugador</th>
                                                <th className="py-2.5 px-2 text-center" title="Partidos Jugados">PJ</th>
                                                <th className="py-2.5 px-2 text-center text-green-400" title="Partidos Ganados">PG</th>
                                                <th className="py-2.5 px-2 text-center text-red-400" title="Partidos Perdidos">PP</th>
                                                <th className="py-2.5 px-2 text-center" title="Sets Ganados / Perdidos">Sets (Dif)</th>
                                                <th className="py-2.5 px-2 text-center" title="Diferencia de Games">Games</th>
                                                <th className="py-2.5 px-3 text-right text-primary font-black" title="Puntos en la tabla">PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {zone.players.map((p, idx) => {
                                                const isSwapSelected = swapSource?.id === p.playerId;
                                                return (
                                                    <tr 
                                                        key={p.playerId}
                                                        className={`transition-colors ${p.isQualified ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-white/5'} ${isSwapSelected ? 'bg-amber-500/20 ring-1 ring-amber-400' : ''}`}
                                                    >
                                                        <td className="py-2.5 px-3">
                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                                idx === 0 ? 'bg-yellow-500 text-dark font-black shadow-sm' :
                                                                idx === 1 ? 'bg-slate-300 text-dark font-black' :
                                                                'bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {p.rank || idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {isSwapMode ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePlayerClickForSwap(p.playerId, p.playerName)}
                                                                    className="text-left font-semibold text-white hover:text-amber-300 flex items-center gap-1.5"
                                                                >
                                                                    <ArrowLeftRight size={12} className={isSwapSelected ? "text-amber-400" : "text-slate-500"} />
                                                                    <span>{formatPlayerName(p.playerName)}</span>
                                                                    {isSwapSelected && <span className="text-[10px] text-amber-300 font-bold">(Elegido)</span>}
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-white">{formatPlayerName(p.playerName)}</span>
                                                                    {p.isQualified && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-bold">
                                                                            Clasifica ✓
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{p.matchesPlayed}</td>
                                                        <td className="py-2.5 px-2 text-center text-green-400 font-mono font-bold">{p.matchesWon}</td>
                                                        <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{p.matchesLost}</td>
                                                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono text-[11px]">
                                                            {p.setsWon}-{p.setsLost} <span className={p.diffSets > 0 ? 'text-green-400' : p.diffSets < 0 ? 'text-red-400' : 'text-slate-500'}>({p.diffSets > 0 ? `+${p.diffSets}` : p.diffSets})</span>
                                                        </td>
                                                        <td className={`py-2.5 px-2 text-center font-mono text-[11px] ${p.diffGames > 0 ? 'text-green-400' : p.diffGames < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                            {p.diffGames > 0 ? `+${p.diffGames}` : p.diffGames}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-primary">
                                                            {p.points}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Zone Matches List */}
                                <div className="p-3 bg-black/25 border-t border-white/5 space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                                        <Trophy size={11} className="text-primary" /> Partidos de {zone.groupName}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {zone.matches.map(m => {
                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                            const isMatchFinishedAndConfirmed = !!(m.is_played && m.score_status === 'confirmed');
                                            const canEditScore = isClubAdmin || (isUserInMatch && !isMatchFinishedAndConfirmed);
                                            const formattedScore = formatMatchScore(m.score);
                                            const isDoubles = tournament.type === 'doubles' || !!m.player1_partner_id;
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
                                                    className={`bg-slate-950/60 p-3 rounded-xl border transition-all flex flex-col gap-2 text-xs ${
                                                        isUserInMatch && scheduledInfo && !m.is_played
                                                            ? 'border-blue-500/40 bg-blue-950/20 shadow-md shadow-blue-950/40'
                                                            : 'border-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <div className={`flex justify-between items-center ${m.winner_id === m.player1_id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                                                <span className="truncate">{p1DisplayName}</span>
                                                                {m.winner_id === m.player1_id && <span className="text-[10px] text-green-400 ml-2">Ganador ✓</span>}
                                                            </div>
                                                            <div className={`flex justify-between items-center ${m.winner_id === m.player2_id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                                                <span className="truncate">{p2DisplayName}</span>
                                                                {m.winner_id === m.player2_id && <span className="text-[10px] text-green-400 ml-2">Ganador ✓</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {/* H2H Button */}
                                                            {m.player1_id && m.player2_id && (
                                                                <button
                                                                    onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors text-[10px] font-bold flex items-center gap-1"
                                                                    title="Ver Historial Cara a Cara"
                                                                >
                                                                    <Swords size={12} /> H2H
                                                                </button>
                                                            )}

                                                            {formattedScore ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="px-2 py-1 bg-black/40 border border-white/10 rounded-lg font-mono font-bold text-primary text-xs">
                                                                        {formattedScore}
                                                                    </span>
                                                                    {m.score_status === 'pending_confirmation' && (
                                                                        <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5" title={`Auto-confirmación en ${hoursRemaining} hs`}>
                                                                            <Clock size={10} /> Pendiente ({hoursRemaining}h)
                                                                        </span>
                                                                    )}
                                                                    {m.score_status === 'disputed' && (
                                                                        <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                                                                            <AlertTriangle size={10} /> En Disputa
                                                                        </span>
                                                                    )}
                                                                    {m.score_status === 'confirmed' && (
                                                                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                                                                            <CheckCircle2 size={10} /> Verificado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-[10px] font-semibold">
                                                                    Por Jugar
                                                                </span>
                                                            )}

                                                            {/* Schedule Button for Admin or Assigned Players (Solo si el partido NO fue jugado aún) */}
                                                            {(isClubAdmin || isUserInMatch) && !m.is_played && !m.winner_id && (
                                                                <button
                                                                    onClick={() => openScheduleModal(m)}
                                                                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                                                                        scheduledInfo
                                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                            : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                    }`}
                                                                    title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                                >
                                                                    <Calendar size={12} className={scheduledInfo ? "text-blue-400" : ""} />
                                                                    <span className="hidden sm:inline">{scheduledInfo ? "Horario" : "Programar"}</span>
                                                                </button>
                                                            )}

                                                            {canEditScore && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openQuickScorerModal(m)}
                                                                        className="p-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1 text-[10px] font-black shadow-sm active:scale-95"
                                                                        title="Carga Rápida Táctil (Quick-Scorer)"
                                                                    >
                                                                        <Sparkles size={12} className="text-emerald-400" />
                                                                        <span>Rápido</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openScoreModal(m)}
                                                                        className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                                                                            !m.is_played
                                                                                ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 shadow-sm'
                                                                                : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                        }`}
                                                                        title={m.is_played ? "Modificar resultado detallado" : "Cargar resultado tradicional"}
                                                                    >
                                                                        <Edit3 size={12} className={!m.is_played ? "text-primary" : ""} />
                                                                        <span className="hidden sm:inline">{m.is_played ? "Editar" : "Detallado"}</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Scheduled Info Badge (Solo si está pendiente por jugar) */}
                                                    {scheduledInfo && !m.is_played && !m.winner_id && (
                                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={11} className="text-blue-400" /> {scheduledInfo.dateStr}
                                                            </span>
                                                            <span className="text-blue-400/60">•</span>
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Clock size={11} className="text-blue-400" /> {scheduledInfo.timeStr}
                                                            </span>
                                                            <span className="text-blue-400/60">•</span>
                                                            <span className="flex items-center gap-1 font-bold text-blue-200">
                                                                <MapPin size={11} className="text-green-400" /> {scheduledInfo.courtStr}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Player Highlight & WhatsApp Coordination Banner */}
                                                    {isUserInMatch && scheduledInfo && !m.is_played && (
                                                        <div className="p-2 bg-gradient-to-r from-blue-500/20 via-primary/10 to-transparent border border-blue-500/30 rounded-xl flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 text-[11px] text-blue-200 truncate">
                                                                <Clock size={12} className="text-blue-400 shrink-0" />
                                                                <span className="truncate"><strong>Tu partido:</strong> {scheduledInfo.fullLabel}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    soundEffects.playScoreBeep();
                                                                    const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr} (${tournament.institutions?.name || 'el club'}). ¿Confirmás disponibilidad?`);
                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                }}
                                                                className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                                                                title="Coordinar por WhatsApp con rival"
                                                            >
                                                                <MessageCircle size={11} /> Coordinar
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Submitter info for played matches */}
                                                    {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name || m.played_at) && (
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1.5 px-0.5">
                                                            <span className="truncate">
                                                                Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name || 'Participante'}</strong>
                                                            </span>
                                                            <span className="text-[9px] text-slate-500 shrink-0 ml-2">
                                                                {m.score_submitted_at || m.score?.submitted_at || m.played_at 
                                                                    ? new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs (' + new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ')'
                                                                    : ''}
                                                            </span>
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

                                                    {/* Rival Score Confirmation Banner */}
                                                    {isOpponentPending && (
                                                        <div className="mt-1 p-2.5 bg-amber-500/15 border border-amber-500/35 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                                                            <div className="text-[11px] text-amber-200">
                                                                <span>¿Confirmas este marcador cargado por <strong>{m.score_submitted_by_name || m.score?.submitted_by_name || 'tu rival'}</strong>?</span>
                                                                <span className="text-amber-400/90 text-[10px] block sm:inline sm:ml-1 font-semibold">• Auto-valida en {hoursRemaining} hs</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                                                                <button
                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                    className="flex-1 sm:flex-none px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all"
                                                                >
                                                                    <Check size={12} /> Confirmar
                                                                </button>
                                                                <button
                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                    className="flex-1 sm:flex-none px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all"
                                                                >
                                                                    <AlertTriangle size={12} /> Disputar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Admin Direct Validation Banner */}
                                                    {isClubAdmin && (m.score_status === 'pending_confirmation' || m.score_status === 'disputed') && (
                                                        <div className="mt-1 p-2 bg-purple-500/15 border border-purple-500/30 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                                                            <span className="text-[10px] text-purple-200 flex items-center gap-1 font-medium">
                                                                <Shield size={12} className="text-purple-400" />
                                                                {m.score_status === 'disputed' ? 'En disputa (requiere arbitraje)' : `Pendiente de validación (${hoursRemaining}h)`}
                                                            </span>
                                                            <button
                                                                onClick={() => handleConfirmScore(m.id)}
                                                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
                                                                title="Validar y confirmar oficialmente como Administrador"
                                                            >
                                                                <Check size={11} /> Validar (Admin)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
