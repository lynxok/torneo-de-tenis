import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarGridCell {
  dayNum: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isTournamentDay: boolean;
  isWeekend: boolean;
}

export interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarViewMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  startDate?: string;
  onSelectTournamentStartDate?: () => void;
  scheduleDate: string;
  onSelectDate: (dateStr: string) => void;
  calendarCells: CalendarGridCell[];
  formatFullDateDisplay: (dateStr: string) => string;
}

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  isOpen,
  onClose,
  calendarViewMonth,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  startDate,
  onSelectTournamentStartDate,
  scheduleDate,
  onSelectDate,
  calendarCells,
  formatFullDateDisplay
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 animate-in fade-in duration-200">
      <div className="bg-card border border-white/15 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col p-5 space-y-4">
        {/* Header: Month & Year Navigator */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <h4 className="text-base font-black text-white capitalize tracking-tight">
              {calendarViewMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </h4>
            <span className="text-[10px] text-muted uppercase font-bold">Seleccionar Día del Partido</span>
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
            title="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Quick Jump Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={onGoToToday}
            className="px-2.5 py-1 bg-white/5 hover:bg-primary/20 text-muted hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all"
          >
            Ir a Hoy
          </button>

          {startDate && (
            <button
              type="button"
              onClick={onSelectTournamentStartDate}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all"
            >
              🏆 Inicio Torneo ({startDate.split('-').slice(1).reverse().join('/')})
            </button>
          )}
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 border-b border-white/10 pb-2">
          <span>Lu</span>
          <span>Ma</span>
          <span>Mi</span>
          <span>Ju</span>
          <span>Vi</span>
          <span className="text-blue-400 font-bold">Sá</span>
          <span className="text-blue-400 font-bold">Do</span>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectDate(cell.dateStr)}
                className={`h-9 rounded-xl text-xs flex flex-col items-center justify-center relative transition-all ${
                  cell.isSelected
                    ? 'bg-gradient-to-br from-blue-600 to-primary text-white font-black ring-2 ring-primary shadow-lg scale-105 z-10'
                    : cell.isToday
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 hover:bg-primary/20'
                    : cell.isCurrentMonth
                    ? cell.isWeekend
                      ? 'bg-white/5 hover:bg-primary/20 text-slate-100 font-bold border border-white/5 hover:border-primary/40'
                      : 'bg-black/30 hover:bg-primary/20 text-slate-300 font-medium hover:text-white'
                    : 'opacity-25 text-slate-500 hover:opacity-50 hover:bg-white/5'
                }`}
                title={cell.dateStr}
              >
                <span>{cell.dayNum}</span>
                {cell.isTournamentDay && !cell.isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Info & Close */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300 font-medium truncate">
            {scheduleDate ? (
              <span>Elegido: <strong className="text-primary">{formatFullDateDisplay(scheduleDate)}</strong></span>
            ) : (
              <span>Toca cualquier día para seleccionarlo</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
