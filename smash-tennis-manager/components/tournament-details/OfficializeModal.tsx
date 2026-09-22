import React from 'react';
import { TournamentPlayer } from '../../types';
import { Trophy, AlertTriangle, Sparkles, X } from 'lucide-react';
import { GroupZone, getProjectedPlayoffRounds } from '../../utils/bracketHelper';

export interface OfficializeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unplayedGroupMatchesCount: number;
  zones: GroupZone[];
  selectedOfficialFormat: string;
  onSelectOfficialFormat: (format: string) => void;
  allowByes: boolean;
  players: TournamentPlayer[];
  onConfirm: (format: string) => void;
  generatingPlayoffs: boolean;
}

export const OfficializeModal: React.FC<OfficializeModalProps> = ({
  isOpen,
  onClose,
  unplayedGroupMatchesCount,
  zones,
  selectedOfficialFormat,
  onSelectOfficialFormat,
  allowByes,
  players,
  onConfirm,
  generatingPlayoffs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-base font-black">Oficializar Cuadro de Llaves</h3>
              <p className="text-xs text-slate-400">Elige el método reglamentario para generar los cruces definitivos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unplayed matches notice */}
        {unplayedGroupMatchesCount > 0 && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 font-bold">Fase de Grupos en curso ({unplayedGroupMatchesCount} partidos pendientes)</strong>
              Al oficializar ahora, se cerrará la fase de zonas y se tomarán las posiciones actuales de la tabla para armar los playoffs.
            </div>
          </div>
        )}

        {/* Format selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Selecciona el Esquema de Cruces:
          </label>

          {/* Cartel de Sugerencia Inteligente según Zonas */}
          {zones.length === 4 && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-start gap-2.5 text-xs">
              <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">💡 Recomendación para 4 Zonas:</span>
                <span className="text-slate-300">
                  Se sugiere <strong>Cruces Directos por Zonas</strong> (1°A vs 2°C, 1°B vs 2°D, 1°C vs 2°A, 1°D vs 2°B). Es el formato tradicional de tenis: cruza zonas alternadas y garantiza que los rivales de un mismo grupo solo puedan reencontrarse en la Final.
                </span>
              </div>
            </div>
          )}

          {zones.length === 3 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs">
              <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block">💡 Torneo con 3 Zonas (6 clasificados):</span>
                <span className="text-slate-300">
                  Al ser cantidad impar de zonas, se sugiere <strong>Cruces Directos por Zonas</strong>: los 2 mejores primeros obtienen <strong>BYE directo a Semifinales</strong> por mérito deportivo, y se juegan 2 Cuartos de Final (1°C vs 2°A y 2°B vs 2°C) sin repetición de grupo.
                </span>
              </div>
            </div>
          )}

          {zones.length >= 5 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs">
              <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block">💡 Torneo con {zones.length} Zonas:</span>
                <span className="text-slate-300">
                  Para estructuras con más de 4 zonas, se recomienda <strong>Tabla General Unificada + BYEs</strong> para rankear objetivamente a los clasificados por puntos, sets y games para balancear el cuadro.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            <label
              onClick={() => onSelectOfficialFormat('tabla_general_byes')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                selectedOfficialFormat === 'tabla_general_byes'
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="officialFormat"
                checked={selectedOfficialFormat === 'tabla_general_byes'}
                onChange={() => onSelectOfficialFormat('tabla_general_byes')}
                className="mt-1 accent-amber-500"
              />
              <div>
                <div className="text-xs font-black text-white flex items-center gap-2">
                  🏆 Tabla General Unificada + BYEs
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">Por Mérito</span>
                  {zones.length >= 5 && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">Recomendado</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Se ordena a todos los jugadores por puntos, sets y games. El 1° y 2° general pasan con BYE a Semis, y el 1° cruza con el último clasificado (1° vs 8°, 4° vs 5°, 3° vs 6°, 2° vs 7°).
                </div>
              </div>
            </label>

            <label
              onClick={() => onSelectOfficialFormat('zonas_playoffs')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                selectedOfficialFormat === 'zonas_playoffs'
                  ? 'bg-primary/15 border-primary/60 shadow-md ring-1 ring-primary/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="officialFormat"
                checked={selectedOfficialFormat === 'zonas_playoffs'}
                onChange={() => onSelectOfficialFormat('zonas_playoffs')}
                className="mt-1 accent-primary"
              />
              <div>
                <div className="text-xs font-black text-white flex items-center gap-2">
                  🎾 Cruces Directos por Zonas
                  <span className="text-[10px] px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/30 rounded">Anti-Repetición</span>
                  {(zones.length === 3 || zones.length === 4) && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">Recomendado</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {zones.length === 3 
                    ? 'Formato especial para 3 zonas: Los 2 mejores primeros reciben BYE a Semis. Se arman Cuartos entre 1°C vs 2°A y 2°B vs 2°C garantizando que ningún rival de grupo se vuelva a cruzar en el debut.'
                    : zones.length === 4
                    ? 'Formato tradicional de 4 zonas alternadas: 1°A vs 2°C y 1°B vs 2°D (llave alta), 1°C vs 2°A y 1°D vs 2°B (llave baja). Evita choques tempranos entre zonas cercanas.'
                    : 'Cruces directos entre zonas garantizando que rivales de un mismo grupo no se crucen de entrada.'}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Live preview previewing chosen method matches */}
        <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Previa de Cruces Resultantes:</span>
            <span className="text-[10px] text-amber-400 font-mono">
              {selectedOfficialFormat === 'tabla_general_byes' ? 'Tabla General' : 'Directo por Zonas'}
            </span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {(() => {
              const previewRounds = getProjectedPlayoffRounds(zones, selectedOfficialFormat, allowByes, players);
              const firstRound = previewRounds[0];
              if (!firstRound || firstRound.matches.length === 0) {
                return <div className="text-xs text-slate-500 italic">No hay suficientes clasificados para armar la ronda.</div>;
              }
              return firstRound.matches.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="font-bold text-slate-200">{m.p1Name || m.slotP1Label}</span>
                  <span className="text-[10px] text-amber-400 font-black px-1.5">vs</span>
                  <span className="font-bold text-slate-200">{m.p2Name || m.slotP2Label}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={generatingPlayoffs}
            onClick={() => onConfirm(selectedOfficialFormat)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Trophy size={14} className={generatingPlayoffs ? 'animate-spin' : ''} />
            {generatingPlayoffs ? 'Oficializando...' : 'Confirmar y Crear Llaves Oficiales'}
          </button>
        </div>
      </div>
    </div>
  );
};
