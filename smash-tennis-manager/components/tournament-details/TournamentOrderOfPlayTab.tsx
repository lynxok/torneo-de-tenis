import React from 'react';
import {
    Calendar,
    Plus,
    CloudRain,
    MessageCircle,
    Printer,
    ImageIcon,
    Clock,
    MapPin,
    Zap,
    Check,
    Info,
    Loader2,
    Edit3,
    Award,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { Tournament, Match, User, TournamentPlayer } from '../../types';
import { formatPlayerName, formatMatchScore } from '../../utils/formatters';
import { soundEffects } from '../../services/soundEffects';

interface TournamentOrderOfPlayTabProps {
    formatFullDateDisplay: (dateStr: string) => string;
    selectedOopDate: string;
    setSelectedOopDate: (date: string) => void;
    oopDates: string[];
    matches: Match[];
    getMatchDate: (m: Match) => string | null;
    isClubAdmin: boolean;
    setShowRainDelayModal: (show: boolean) => void;
    handleShareOopWhatsApp: () => void;
    handlePrintOop: () => void;
    setShowGraphicModal: (show: boolean) => void;
    oopDateMatches: Match[];
    getMatchOopStatus: (m: Match) => string;
    unscheduledMatches: Match[];
    openScheduleModal: (m: Match) => void;
    oopMatchesByCourt: Record<string, Match[]>;
    user: User;
    getMatchTime: (m: Match) => string;
    tournament: Tournament;
    updatingOopMatchId: string | null;
    handleQuickChangeOopStatus: (m: Match, newStatus: any) => void;
    openScoreModal: (m: Match) => void;
    setShowUnscheduledDrawer: (show: boolean) => void;
    showUnscheduledDrawer: boolean;
    players: TournamentPlayer[];
}

export const TournamentOrderOfPlayTab: React.FC<TournamentOrderOfPlayTabProps> = ({
    formatFullDateDisplay,
    selectedOopDate,
    setSelectedOopDate,
    oopDates,
    matches,
    getMatchDate,
    isClubAdmin,
    setShowRainDelayModal,
    handleShareOopWhatsApp,
    handlePrintOop,
    setShowGraphicModal,
    oopDateMatches,
    getMatchOopStatus,
    unscheduledMatches,
    openScheduleModal,
    oopMatchesByCourt,
    user,
    getMatchTime,
    tournament,
    updatingOopMatchId,
    handleQuickChangeOopStatus,
    openScoreModal,
    setShowUnscheduledDrawer,
    showUnscheduledDrawer,
    players,
}) => {
    return (
                            <div className="space-y-6">
                                {/* Top Controls Bar: Dates & Actions */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-white/10 rounded-2xl">
                                    {/* Date Selector Pills */}
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar size={13} className="text-primary" /> Jornada Seleccionada
                                            </span>
                                            <span className="text-xs font-semibold text-primary">
                                                {formatFullDateDisplay(selectedOopDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                            {oopDates.map(dateStr => {
                                                const [y, m, d] = dateStr.split('-').map(Number);
                                                const dObj = new Date(y, m - 1, d);
                                                const dayShort = dObj.toLocaleDateString('es-AR', { weekday: 'short' });
                                                const dayNum = dObj.getDate();
                                                const monthShort = dObj.toLocaleDateString('es-AR', { month: 'short' });
                                                const countForDate = matches.filter(m => !m.is_bye && getMatchDate(m) === dateStr).length;
                                                const isSelected = selectedOopDate === dateStr;

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => {
                                                            setSelectedOopDate(dateStr);
                                                            soundEffects.playScoreBeep();
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                                            isSelected
                                                                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                                                                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span>{dayShort.charAt(0).toUpperCase() + dayShort.slice(1)} {dayNum} {monthShort}</span>
                                                        {countForDate > 0 && (
                                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>
                                                                {countForDate}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {/* Custom Date Input Trigger */}
                                            <label className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1">
                                                <Plus size={13} /> Otra Fecha
                                                <input
                                                    type="date"
                                                    value={selectedOopDate}
                                                    onChange={e => {
                                                        if (e.target.value) {
                                                            setSelectedOopDate(e.target.value);
                                                            soundEffects.playScoreBeep();
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 shrink-0">
                                        {isClubAdmin && (
                                            <button
                                                onClick={() => setShowRainDelayModal(true)}
                                                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                                                title="Ajustar demora por lluvia a todos los partidos de la jornada"
                                            >
                                                <CloudRain size={14} className="text-amber-400" />
                                                <span>Demora Clima</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleShareOopWhatsApp}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                                            title="Compartir programación de hoy por WhatsApp"
                                        >
                                            <MessageCircle size={14} className="text-green-400" />
                                            <span>WhatsApp</span>
                                        </button>

                                        <button
                                            onClick={handlePrintOop}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5"
                                            title="Imprimir cartel A4 para el tablero del club"
                                        >
                                            <Printer size={14} />
                                            <span>Imprimir A4</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowGraphicModal(true);
                                                soundEffects.playScoreBeep();
                                            }}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all flex items-center gap-1.5 shadow-sm"
                                            title="Generar gráfica para Instagram o WhatsApp Stories"
                                        >
                                            <ImageIcon size={14} />
                                            <span>Gráfica Redes</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Weather / Rain Delay Notice Banner */}
                                {oopDateMatches.some(m => getMatchOopStatus(m) === 'delayed') && (
                                    <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-in fade-in">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                                                <CloudRain size={18} />
                                            </div>
                                            <div className="text-xs">
                                                <div className="font-bold text-amber-300">Jornada Afectada por Clima / Lluvia</div>
                                                <p className="text-[11px] text-amber-200/90">Los horarios han sido demorados. Verifique los nuevos turnos y estados a continuación.</p>
                                            </div>
                                        </div>
                                        {isClubAdmin && (
                                            <button
                                                onClick={() => setShowRainDelayModal(true)}
                                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-all self-end sm:self-auto shrink-0"
                                            >
                                                Modificar Demora
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Main OOP Courts Board */}
                                {oopDateMatches.length === 0 ? (
                                    <div className="text-center py-14 bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                                        <Clock size={38} className="mx-auto text-primary opacity-60" />
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-white">No hay partidos programados para esta fecha</h4>
                                            <p className="text-xs text-muted max-w-md mx-auto">
                                                Seleccione otro día en la barra superior o asigne horarios a los partidos pendientes del torneo.
                                            </p>
                                        </div>
                                        {isClubAdmin && unscheduledMatches.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    const first = unscheduledMatches[0];
                                                    if (first) openScheduleModal(first);
                                                }}
                                                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-sm"
                                            >
                                                <Calendar size={14} /> Programar un Partido para este Día
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                        {oopMatchesByCourt.map(({ court, matches: cMatches }) => (
                                            <div
                                                key={court}
                                                className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg"
                                            >
                                                {/* Court Header */}
                                                <div className="p-3 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={15} className="text-green-400" />
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">{court}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                                                        {cMatches.length} {cMatches.length === 1 ? 'partido' : 'partidos'}
                                                    </span>
                                                </div>

                                                {/* Court Matches Stack */}
                                                <div className="p-3 space-y-3 flex-1">
                                                    {cMatches.length === 0 ? (
                                                        <div className="py-8 text-center text-slate-500 text-xs italic">
                                                            Sin partidos en este turno
                                                        </div>
                                                    ) : (
                                                        cMatches.map((m) => {
                                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                                            const isMatchFinishedAndConfirmed = !!(m.is_played && m.score_status === 'confirmed');
                                                            const canEditScore = isClubAdmin || (isUserInMatch && !isMatchFinishedAndConfirmed);
                                                            const p1Display = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                            const p2Display = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                            const oopStatus = getMatchOopStatus(m);
                                                            const matchTime = getMatchTime(m);
                                                            const note = m.oop_note || m.proposal_data?.oop_note;
                                                            const turn = m.oop_turn || m.proposal_data?.oop_turn;
                                                            const formattedScore = formatMatchScore(m.score);

                                                            return (
                                                                <div
                                                                    key={m.id}
                                                                    className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                                                                        oopStatus === 'in_progress'
                                                                            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                                                                            : oopStatus === 'warming_up'
                                                                            ? 'bg-amber-950/30 border-amber-500/40 shadow-md shadow-amber-950/30'
                                                                            : oopStatus === 'delayed'
                                                                            ? 'bg-red-950/30 border-red-500/40'
                                                                            : isUserInMatch
                                                                            ? 'bg-blue-950/30 border-blue-500/40 shadow-md shadow-blue-950/30'
                                                                            : 'bg-white/5 hover:bg-white/[0.07] border-white/10'
                                                                    }`}
                                                                >
                                                                    {/* Match Top Bar: Time / Turn & Status Badge */}
                                                                    <div className="flex items-center justify-between gap-1.5 text-xs">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-white/10 shrink-0">
                                                                                {matchTime}
                                                                            </span>
                                                                            {turn && (
                                                                                <span className="text-[10px] text-slate-400 truncate">
                                                                                    {turn}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        {oopStatus === 'in_progress' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse shrink-0">
                                                                                <Zap size={11} className="fill-emerald-400 text-emerald-400" /> En Juego
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'warming_up' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                                                                                <span>🎾</span> Calentando
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'delayed' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 shrink-0">
                                                                                <CloudRain size={11} /> Demorado
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'finished' && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1 shrink-0">
                                                                                <Check size={11} /> Finalizado
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'scheduled' && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                                                                                Programado
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Round / Group and Category */}
                                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/5 pb-1">
                                                                        <span className="uppercase font-semibold truncate">
                                                                            {m.round} {m.group_number ? `• Grupo ${m.group_number}` : ''}
                                                                        </span>
                                                                        <span className="text-primary font-bold shrink-0">
                                                                            {tournament.category} {tournament.gender ? `• ${tournament.gender}` : ''}
                                                                        </span>
                                                                    </div>

                                                                    {/* Players */}
                                                                    <div className="space-y-1 py-0.5">
                                                                        <div className={`text-xs font-bold flex items-center justify-between ${m.winner_id === m.player1_id ? 'text-green-400' : 'text-white'}`}>
                                                                            <span className="truncate">{p1Display}</span>
                                                                            {m.winner_id === m.player1_id && <span className="text-[10px] text-green-400 font-bold ml-1">✓</span>}
                                                                        </div>
                                                                        <div className={`text-xs font-bold flex items-center justify-between ${m.winner_id === m.player2_id ? 'text-green-400' : 'text-white'}`}>
                                                                            <span className="truncate">{p2Display}</span>
                                                                            {m.winner_id === m.player2_id && <span className="text-[10px] text-green-400 font-bold ml-1">✓</span>}
                                                                        </div>
                                                                    </div>

                                                                    {/* Score if finished */}
                                                                    {formattedScore && (
                                                                        <div className="bg-black/40 border border-white/10 px-2 py-1 rounded-lg text-center font-mono text-xs font-bold text-primary">
                                                                            {formattedScore}
                                                                        </div>
                                                                    )}

                                                                    {/* Note memo if provided */}
                                                                    {note && (
                                                                        <div className="text-[10px] text-amber-300/90 italic bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                            <Info size={11} className="shrink-0 text-amber-400" />
                                                                            <span className="truncate">{note}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Admin Real-time OOP Status Chips Bar */}
                                                                    {isClubAdmin && !m.is_played && (
                                                                        <div className="pt-1.5 border-t border-white/10 space-y-1">
                                                                            <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                                                                                <span>Cambiar Estado en Vivo:</span>
                                                                                {updatingOopMatchId === m.id && <Loader2 size={10} className="animate-spin text-primary" />}
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-1 text-[10px]">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'warming_up')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'warming_up'
                                                                                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar en calentamiento"
                                                                                >
                                                                                    🎾 Calent
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'in_progress')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'in_progress'
                                                                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar en juego"
                                                                                >
                                                                                    ⚡ Juego
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'delayed')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'delayed'
                                                                                            ? 'bg-red-500 text-white border-red-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar demorado por lluvia o tiempo"
                                                                                >
                                                                                    🌧️ Demor
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'scheduled')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'scheduled'
                                                                                            ? 'bg-blue-500 text-white border-blue-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Restablecer a programado"
                                                                                >
                                                                                    🕒 Prog
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Action Buttons: Schedule, Score, WhatsApp */}
                                                                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5 text-xs">
                                                                        {(isClubAdmin || isUserInMatch) && !m.is_played && (
                                                                            <button
                                                                                onClick={() => openScheduleModal(m)}
                                                                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold flex items-center gap-1 transition-all"
                                                                                title="Cambiar horario o cancha"
                                                                            >
                                                                                <Calendar size={11} className="text-blue-400" />
                                                                                <span>Horario</span>
                                                                            </button>
                                                                        )}

                                                                        {canEditScore && (
                                                                            <button
                                                                                onClick={() => openScoreModal(m)}
                                                                                className="px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                                                                title={m.is_played ? "Editar marcador" : "Cargar resultado"}
                                                                            >
                                                                                <Edit3 size={11} />
                                                                                <span>{m.is_played ? "Editar" : "Resultado"}</span>
                                                                            </button>
                                                                        )}

                                                                        {isUserInMatch && !m.is_played && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    soundEffects.playScoreBeep();
                                                                                    const opp = m.player1_id === user.id ? p2Display : p1Display;
                                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opp}! Te escribo para coordinar nuestro partido de "${tournament.name}" fijado para el ${formatFullDateDisplay(selectedOopDate)} a las ${matchTime} en ${court} (${tournament.institutions?.name || 'el club'}). ¿Confirmamos?`);
                                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                                }}
                                                                                className="px-2 py-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 text-[11px] font-bold flex items-center gap-1 transition-all ml-auto"
                                                                                title="Enviar WhatsApp al rival"
                                                                            >
                                                                                <MessageCircle size={11} />
                                                                                <span>Rival</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Organizer Assistant: Unscheduled Matches Drawer */}
                                {isClubAdmin && unscheduledMatches.length > 0 && (
                                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                        <div 
                                            onClick={() => setShowUnscheduledDrawer(!showUnscheduledDrawer)}
                                            className="p-4 bg-slate-950 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/10"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                                                    <Clock size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                        Partidos Pendientes de Programación
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                                            {unscheduledMatches.length} por jugar
                                                        </span>
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">Encuentros que aún no tienen fecha ni horario asignado en el fixture</p>
                                                </div>
                                            </div>
                                            <button className="text-xs text-primary font-bold hover:underline">
                                                {showUnscheduledDrawer ? 'Ocultar' : 'Ver Lista'}
                                            </button>
                                        </div>

                                        {showUnscheduledDrawer && (
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
                                                {unscheduledMatches.map(m => {
                                                    const p1 = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                    const p2 = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                    const p1Obj = players.find(p => p.player_id === m.player1_id || p.id === m.player1_id);
                                                    const p2Obj = players.find(p => p.player_id === m.player2_id || p.id === m.player2_id);
                                                    const availNote = p1Obj?.availability_notes || p2Obj?.availability_notes || p1Obj?.time_restrictions || p2Obj?.time_restrictions;

                                                    return (
                                                        <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                                                    <span>{m.round} {m.group_number ? `• G${m.group_number}` : ''}</span>
                                                                    <span className="text-primary">{tournament.category}</span>
                                                                </div>
                                                                <div className="text-xs font-bold text-white pt-1">
                                                                    <div className="truncate">{p1}</div>
                                                                    <div className="text-[10px] text-slate-500">vs</div>
                                                                    <div className="truncate">{p2}</div>
                                                                </div>
                                                                {availNote && (
                                                                    <div className="text-[10px] text-amber-300 italic pt-1 truncate">
                                                                        Disp: {availNote}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => openScheduleModal(m)}
                                                                className="w-full py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                            >
                                                                <Calendar size={12} /> Asignar a {formatFullDateDisplay(selectedOopDate).split(',')[0]}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* OFFICIAL CLUB SPONSORS SECTION */}
                                <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 rounded-3xl space-y-4 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                                                <Award size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                                                    Auspiciantes & Sponsors Oficiales
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                                                        {tournament.institutions?.name || 'Sede'}
                                                    </span>
                                                </h4>
                                                <p className="text-xs text-slate-400">Marcas y empresas que respaldan el circuito y los torneos del club</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sponsors Cards Grid */}
                                    {((tournament?.sponsors || []).filter(s => s.is_active).length > 0) ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {(tournament?.sponsors || []).filter(s => s.is_active).map(sponsor => (
                                                <div
                                                    key={sponsor.id}
                                                    className="p-3.5 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl flex flex-col items-center text-center space-y-2.5 transition-all group"
                                                >
                                                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                        {sponsor.logo_url ? (
                                                            <img
                                                                src={sponsor.logo_url}
                                                                alt={sponsor.name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        ) : (
                                                            <Award size={26} className="text-amber-400 opacity-60" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 w-full">
                                                        <div className="text-xs font-bold text-white truncate">{sponsor.name}</div>
                                                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            sponsor.category === 'main'
                                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                : sponsor.category === 'official'
                                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                                        }`}>
                                                            {sponsor.category === 'main' ? 'Sponsor Principal' : sponsor.category === 'official' ? 'Auspiciante Oficial' : 'Aliado'}
                                                        </span>
                                                    </div>

                                                    {/* External Links */}
                                                    <div className="flex items-center gap-1.5 pt-1">
                                                        {sponsor.website_url && (
                                                            <a
                                                                href={sponsor.website_url.startsWith('http') ? sponsor.website_url : `https://${sponsor.website_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                                                                title="Visitar sitio web oficial"
                                                            >
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                        {sponsor.phone_whatsapp && (
                                                            <a
                                                                href={`https://api.whatsapp.com/send?phone=${sponsor.phone_whatsapp.replace(/[^0-9]/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors"
                                                                title="Contactar por WhatsApp"
                                                            >
                                                                <MessageCircle size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center space-y-1">
                                            <p className="text-xs text-slate-300 font-semibold">
                                                Aún no se han configurado sponsors para esta institución.
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Los administradores del club pueden cargarlos desde el panel de Sedes e Instituciones para que aparezcan en todos sus torneos.
                                            </p>
                                        </div>
                                    )}

                                    {/* Future Monetization Teaser & Sponsor Acquisition Callout */}
                                    <div className="p-3 bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-amber-400 shrink-0" />
                                            <span className="text-slate-300 text-[11px]">
                                                ¿Te gustaría promocionar tu empresa en la Orden de Juego y en las pantallas de TV del club?
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                soundEffects.playScoreBeep();
                                                const orgPhone = (tournament?.institutions as any)?.phone || '';
                                                const text = encodeURIComponent(`Hola! Quisiera información para auspiciar el torneo "${tournament.name}" en Smash Tenis.`);
                                                const cleanPhone = orgPhone.replace(/\D/g, '');
                                                const url = cleanPhone 
                                                    ? 'https://api.whatsapp.com/send?phone=' + cleanPhone + '&text=' + text
                                                    : 'https://api.whatsapp.com/send?text=' + text;
                                                window.open(url, '_blank');
                                            }}
                                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-[11px] transition-all shrink-0 self-end sm:self-auto"
                                        >
                                            Sumar mi Marca 🤝
                                        </button>
                                    </div>
                                </div>
                            </div>
    );
};
