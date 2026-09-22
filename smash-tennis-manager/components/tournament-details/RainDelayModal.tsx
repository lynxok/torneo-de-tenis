import React from 'react';
import { CloudRain, X, Clock, Info, Loader2 } from 'lucide-react';

export interface RainDelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOopDate: string;
  formatFullDateDisplay: (dateStr: string) => string;
  unplayedMatchesCount: number;
  rainDelayMinutes: number;
  onSelectRainDelayMinutes: (mins: number) => void;
  onApplyRainDelay: () => void;
  isApplyingRainDelay: boolean;
}

export const RainDelayModal: React.FC<RainDelayModalProps> = ({
  isOpen,
  onClose,
  selectedOopDate,
  formatFullDateDisplay,
  unplayedMatchesCount,
  rainDelayMinutes,
  onSelectRainDelayMinutes,
  onApplyRainDelay,
  isApplyingRainDelay
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <CloudRain size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Demora General por Clima</h3>
              <p className="text-xs text-amber-300/80">Postergar partidos de la jornada</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Jornada Seleccionada:</div>
            <div className="text-sm font-bold text-white">{formatFullDateDisplay(selectedOopDate)}</div>
            <div className="text-[11px] text-slate-400">
              {unplayedMatchesCount} partidos pendientes a postergar en el club.
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" /> Tiempo de Demora a Sumar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 45, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onSelectRainDelayMinutes(mins)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    rainDelayMinutes === mins
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  +{mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-300">
              <Info size={13} /> ¿Qué pasará al aplicar?
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Se sumarán <strong>{rainDelayMinutes} minutos</strong> al horario de inicio programado de todos los partidos pendientes de este día.</li>
              <li>Se actualizará su estado a <strong>"Demorado"</strong> en la Orden de Juego y en las pantallas de TV.</li>
              <li>Podrás restablecer los horarios o modificar la demora en cualquier momento.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onApplyRainDelay}
              disabled={isApplyingRainDelay}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isApplyingRainDelay ? (
                <><Loader2 size={14} className="animate-spin" /> Aplicando...</>
              ) : (
                <><CloudRain size={14} /> Postergar Jornada (+{rainDelayMinutes} min)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
