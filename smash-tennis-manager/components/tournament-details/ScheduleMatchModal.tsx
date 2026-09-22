import React from 'react';
import { Tournament, TournamentPlayer, Match, Booking } from '../../types';
import { Calendar, X, Clock, ChevronRight, MapPin, AlertTriangle, Check, CheckCircle2, Info, Trash2, Loader2, Save } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatters';

export interface ScheduleMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  match: Match;
  players: TournamentPlayer[];
  scheduleDate: string;
  onScheduleDateChange: (date: string) => void;
  onOpenCalendarPicker: (dateStr?: string) => void;
  quickDatePresets: { label: string; dateStr: string }[];
  formatFullDateDisplay: (dateStr: string) => string;
  scheduleTime: string;
  onScheduleTimeChange: (time: string) => void;
  isCustomCourt: boolean;
  onToggleCustomCourt: () => void;
  customCourtName: string;
  onCustomCourtNameChange: (name: string) => void;
  scheduleCourt: string;
  onScheduleCourtChange: (court: string) => void;
  courtOptions: string[];
  conflictBooking: Booking | null;
  availableCourtsAtThisTime: string[];
  overrideConflict: boolean;
  onOverrideConflictChange: (override: boolean) => void;
  loadingDayBookings: boolean;
  currentTargetCourt: string;
  scheduleOopTurn: string;
  onScheduleOopTurnChange: (turn: string) => void;
  scheduleOopNote: string;
  onScheduleOopNoteChange: (note: string) => void;
  onClearSchedule: () => void;
  onSaveSchedule: (e: React.FormEvent) => void;
  savingSchedule: boolean;
}

export const ScheduleMatchModal: React.FC<ScheduleMatchModalProps> = ({
  isOpen,
  onClose,
  tournament,
  match,
  players,
  scheduleDate,
  onScheduleDateChange,
  onOpenCalendarPicker,
  quickDatePresets,
  formatFullDateDisplay,
  scheduleTime,
  onScheduleTimeChange,
  isCustomCourt,
  onToggleCustomCourt,
  customCourtName,
  onCustomCourtNameChange,
  scheduleCourt,
  onScheduleCourtChange,
  courtOptions,
  conflictBooking,
  availableCourtsAtThisTime,
  overrideConflict,
  onOverrideConflictChange,
  loadingDayBookings,
  currentTargetCourt,
  scheduleOopTurn,
  onScheduleOopTurnChange,
  scheduleOopNote,
  onScheduleOopNoteChange,
  onClearSchedule,
  onSaveSchedule,
  savingSchedule
}) => {
  if (!isOpen) return null;

  const p1Obj = players.find(p => p.player_id === match.player1_id || p.id === match.player1_id || (p.name && match.player1_name && p.name.toLowerCase().includes(match.player1_name.toLowerCase())));
  const p2Obj = players.find(p => p.player_id === match.player2_id || p.id === match.player2_id || (p.name && match.player2_name && p.name.toLowerCase().includes(match.player2_name.toLowerCase())));
  const p1Avail = p1Obj?.availability_notes || p1Obj?.time_restrictions;
  const p2Avail = p2Obj?.availability_notes || p2Obj?.time_restrictions;
  const p1Name = match.team1_name || formatPlayerName(match.player1_name) || 'Jugador 1';
  const p2Name = match.team2_name || formatPlayerName(match.player2_name) || 'Jugador 2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Programar Partido</h3>
              <p className="text-xs text-muted">Asignar fecha, horario y cancha oficial</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSaveSchedule} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Match Summary Card */}
          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
              <span>{match.round} {match.group_number ? `• Grupo ${match.group_number}` : ''}</span>
              <span className="text-primary font-bold">{tournament.category} • {tournament.gender || 'Caballeros'}</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span className="truncate">{p1Name}</span>
                <span className="text-[10px] text-muted">vs</span>
              </div>
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span className="truncate">{p2Name}</span>
              </div>
            </div>
          </div>

          {/* Player Availability Restrictions Highlight Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock size={13} className="text-amber-400" /> Disponibilidad de Horarios Declarada
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                <div className="text-[10px] text-muted font-bold truncate">{p1Name}:</div>
                <div className="text-xs font-medium">
                  {p1Avail ? (
                    <span className="text-amber-200">{p1Avail}</span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">✓ Sin restricciones</span>
                  )}
                </div>
              </div>
              <div className="p-2 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                <div className="text-[10px] text-muted font-bold truncate">{p2Name}:</div>
                <div className="text-xs font-medium">
                  {p2Avail ? (
                    <span className="text-amber-200">{p2Avail}</span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">✓ Sin restricciones</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date Field & Quick Buttons */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" /> Fecha del Partido *
              </label>
              <button
                type="button"
                onClick={() => onOpenCalendarPicker(scheduleDate)}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
              >
                <Calendar size={12} /> Abrir Calendario
              </button>
            </div>

            {/* Main Interactive Date Display & Picker Trigger */}
            <button
              type="button"
              onClick={() => onOpenCalendarPicker(scheduleDate)}
              className="w-full bg-sidebar hover:bg-slate-900/90 border border-white/10 hover:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-bold flex items-center justify-between transition-all group shadow-inner text-left"
              title="Haz clic para abrir el selector de calendario"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                  <Calendar size={15} />
                </div>
                <span className="truncate">{scheduleDate ? formatFullDateDisplay(scheduleDate) : 'Seleccionar fecha en calendario...'}</span>
              </div>
              <span className="text-[11px] text-primary font-bold flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                Elegir día <ChevronRight size={14} />
              </span>
            </button>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {quickDatePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onScheduleDateChange(preset.dateStr)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    scheduleDate === preset.dateStr
                      ? 'bg-primary/20 border-primary text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onOpenCalendarPicker(scheduleDate)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1 ml-auto"
              >
                <Calendar size={11} /> Ver Calendario Completo
              </button>
            </div>
          </div>

          {/* Time Field & Quick Slots */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-blue-400" /> Horario de Inicio *
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={e => onScheduleTimeChange(e.target.value)}
              className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-primary outline-none"
              required
            />
            {/* Quick Time Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onScheduleTimeChange(t)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                    scheduleTime === t
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  {t} hs
                </button>
              ))}
            </div>
          </div>

          {/* Court Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-green-400" /> Cancha Asignada *
              </label>
              <button
                type="button"
                onClick={onToggleCustomCourt}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                {isCustomCourt ? 'Elegir de lista' : 'Ingresar otra'}
              </button>
            </div>

            {isCustomCourt ? (
              <input
                type="text"
                placeholder="Ej: Cancha Central, Cancha 1 (Ladrillo)..."
                value={customCourtName}
                onChange={e => onCustomCourtNameChange(e.target.value)}
                className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary outline-none"
                required
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {courtOptions.map(court => (
                  <button
                    key={court}
                    type="button"
                    onClick={() => onScheduleCourtChange(court)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                      scheduleCourt === court
                        ? 'bg-green-500/20 border-green-400 text-green-300 shadow-sm'
                        : 'bg-white/5 border-white/10 text-muted hover:text-white'
                    }`}
                  >
                    {court}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Conflict Alert & Available Court Suggestions */}
          {conflictBooking && (
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl space-y-2.5 text-amber-200 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle size={16} />
                </div>
                <div className="text-xs space-y-0.5 flex-1 min-w-0">
                  <div className="font-bold text-amber-300 flex items-center justify-between gap-1">
                    <span>¡Cancha Ocupada en ese horario!</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-mono font-bold">
                      {conflictBooking.start_time} - {conflictBooking.end_time} hs
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-tight">
                    {conflictBooking.booking_type === 'tournament' ? (
                      <>Ya hay otro partido de torneo: <strong>{conflictBooking.title}</strong></>
                    ) : conflictBooking.booking_type === 'class' ? (
                      <>Hay una clase programada: <strong>{conflictBooking.title || 'Clase / Escuela'}</strong></>
                    ) : (
                      <>Reserva previa de socio: <strong>{conflictBooking.title || conflictBooking.user_name || 'Reserva de Cancha'}</strong></>
                    )}
                  </p>
                </div>
              </div>

              {/* Free court suggestions at the same hour */}
              {availableCourtsAtThisTime.length > 0 && (
                <div className="pt-1.5 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-amber-300 font-bold text-[10px] uppercase">Canchas libres:</span>
                  {availableCourtsAtThisTime.map(court => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => {
                        onScheduleCourtChange(court);
                      }}
                      className="px-2 py-0.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      title={`Mover partido a ${court} que está libre`}
                    >
                      <Check size={11} /> Elegir {court}
                    </button>
                  ))}
                </div>
              )}

              {/* Override option */}
              <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-amber-200 hover:text-white transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={overrideConflict}
                    onChange={e => onOverrideConflictChange(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-amber-500/40 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-xs">Priorizar torneo (reemplazar turno en el club)</span>
                </label>
              </div>
            </div>
          )}

          {/* Court is free confirmation */}
          {!conflictBooking && !loadingDayBookings && scheduleTime && scheduleDate && (
            <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-xs text-green-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-green-400" />
                <span>{currentTargetCourt} disponible ({scheduleTime} a {(() => {
                  const [h, m] = scheduleTime.split(':').map(Number);
                  const endTot = (h || 0) * 60 + (m || 0) + 90;
                  return `${String(Math.floor(endTot / 60) % 24).padStart(2, '0')}:${String(endTot % 60).padStart(2, '0')}`;
                })()} hs)</span>
              </span>
              <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">Se bloqueará en reservas</span>
            </div>
          )}

          {/* Order of Play - Turno y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/10">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-primary" /> Turno / Renglón OOP
              </label>
              <input
                type="text"
                placeholder="Ej: 1er Turno, A continuación, No antes 18 hs"
                value={scheduleOopTurn}
                onChange={e => onScheduleOopTurnChange(e.target.value)}
                className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Info size={13} className="text-amber-400" /> Nota u Observación
              </label>
              <input
                type="text"
                placeholder="Ej: Traer pelotas nuevas, Postergado..."
                value={scheduleOopNote}
                onChange={e => onScheduleOopNoteChange(e.target.value)}
                className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Live Summary Banner */}
          {scheduleDate && scheduleTime && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-blue-200 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
              <span>
                Programado para el <strong>{new Date(scheduleDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> a las <strong>{scheduleTime} hs</strong> en <strong>{isCustomCourt ? (customCourtName || 'Cancha') : scheduleCourt}</strong>.
              </span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
            {(match.scheduled_at || match.court_name) ? (
              <button
                type="button"
                onClick={onClearSchedule}
                disabled={savingSchedule}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1.5"
                title="Quitar fecha y horario asignado"
              >
                <Trash2 size={13} /> Desprogramar
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingSchedule}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-primary hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {savingSchedule ? (
                  <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={14} /> Guardar Horario</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
