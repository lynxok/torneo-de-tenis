import React from 'react';
import { Tournament, TournamentPlayer } from '../../types';
import { Settings2, X, Info, Grid, Layers, Shuffle, Loader2, Check } from 'lucide-react';

export interface GenerateFixtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  players: TournamentPlayer[];
  fixtureNumGroups: number;
  onNumGroupsChange: (num: number) => void;
  onShufflePreview: (num: number) => void;
  previewGroups: { name: string; players: TournamentPlayer[] }[];
  onConfirmFixture: () => void;
  generatingFixture: boolean;
}

export const GenerateFixtureModal: React.FC<GenerateFixtureModalProps> = ({
  isOpen,
  onClose,
  tournament,
  players,
  fixtureNumGroups,
  onNumGroupsChange,
  onShufflePreview,
  previewGroups,
  onConfirmFixture,
  generatingFixture
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings2 size={18} className="text-primary" /> Configurar y Sortear Zonas del Torneo
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {tournament.name} • {players.length} Jugadores Inscriptos
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* SEEDING DISCLAIMER NOTICE */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                Asignación de Cabezas de Serie y Ranking
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Hasta no contar con un historial o ranking oficial consolidado en el sistema, el armado de las zonas se realiza mediante un <strong>sorteo 100% aleatorio y equitativo</strong> sin cabezas de serie automáticas.
              </p>
              <p className="text-[11px] text-amber-300/80 italic">
                💡 Una vez generado el fixture, podrás reubicar o intercambiar a los jugadores destacados entre zonas usando el botón <strong>"Intercambiar Jugadores"</strong>.
              </p>
            </div>
          </div>

          {/* GROUP FORMAT SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
              <span>Formato y Cantidad de Zonas</span>
              <span className="text-primary font-normal lowercase text-[11px]">
                ({players.length} inscriptos)
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Preset: 4 Groups if available or Math.floor(N/3) */}
              {players.length >= 6 && (
                <button
                  type="button"
                  onClick={() => {
                    const g = Math.max(1, Math.floor(players.length / 3));
                    onNumGroupsChange(g);
                    onShufflePreview(g);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    fixtureNumGroups === Math.max(1, Math.floor(players.length / 3))
                      ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                      : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-xs text-white">
                    {Math.max(1, Math.floor(players.length / 3))} Zonas (Estándar)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ~{Math.ceil(players.length / Math.max(1, Math.floor(players.length / 3)))} jugadores por grupo
                  </div>
                </button>
              )}

              {/* Preset: 3 Groups if available */}
              {players.length >= 8 && (
                <button
                  type="button"
                  onClick={() => {
                    const g = Math.max(1, Math.floor(players.length / 4));
                    onNumGroupsChange(g);
                    onShufflePreview(g);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    fixtureNumGroups === Math.max(1, Math.floor(players.length / 4))
                      ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                      : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-xs text-white">
                    {Math.max(1, Math.floor(players.length / 4))} Zonas (Más Partidos)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ~{Math.ceil(players.length / Math.max(1, Math.floor(players.length / 4)))} jugadores por grupo
                  </div>
                </button>
              )}

              {/* Preset: 2 Groups (Liga / Big Groups) */}
              {players.length >= 4 && (
                <button
                  type="button"
                  onClick={() => {
                    onNumGroupsChange(2);
                    onShufflePreview(2);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    fixtureNumGroups === 2
                      ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                      : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-xs text-white">
                    2 Zonas (Liga)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {Math.ceil(players.length / 2)} por grupo
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* CUSTOM SLIDER / STEPPER */}
          <div className="bg-sidebar/40 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Grid size={14} className="text-primary" /> Cantidad personalizada de Zonas
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Ajusta manualmente el número de zonas para el torneo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={fixtureNumGroups <= 1}
                onClick={() => {
                  const next = Math.max(1, fixtureNumGroups - 1);
                  onNumGroupsChange(next);
                  onShufflePreview(next);
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30"
              >
                -
              </button>
              <span className="font-bold text-sm text-primary w-20 text-center">
                {fixtureNumGroups} {fixtureNumGroups === 1 ? 'Zona' : 'Zonas'}
              </span>
              <button
                type="button"
                disabled={fixtureNumGroups >= Math.floor(players.length / 2)}
                onClick={() => {
                  const next = Math.min(Math.floor(players.length / 2), fixtureNumGroups + 1);
                  onNumGroupsChange(next);
                  onShufflePreview(next);
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* PREVIEW OF DRAW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-primary" /> Previsualización del Sorteo ({previewGroups.length} Zonas)
              </h4>
              <button
                type="button"
                onClick={() => onShufflePreview(fixtureNumGroups)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
                title="Volver a mezclar aleatoriamente"
              >
                <Shuffle size={13} className="text-primary" /> Volver a Sortear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {previewGroups.map((grp, idx) => (
                <div key={idx} className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-xs text-primary">{grp.name}</span>
                    <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
                      {grp.players.length} jugadores • {(grp.players.length * (grp.players.length - 1)) / 2} partidos
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {grp.players.map((p, pIdx) => (
                      <li key={p.id || pIdx} className="text-xs text-slate-300 flex items-center justify-between">
                        <span className="truncate">{pIdx + 1}. {p.name || p.player_name}</span>
                        <span className="text-[10px] text-muted font-mono">{p.category || tournament.category}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-muted">
            Total de partidos a disputar: <strong className="text-white">{previewGroups.reduce((acc, g) => acc + (g.players.length * (g.players.length - 1)) / 2, 0)} partidos</strong>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmFixture}
              disabled={generatingFixture || previewGroups.length === 0}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
            >
              {generatingFixture ? (
                <><Loader2 size={14} className="animate-spin" /> Generando...</>
              ) : (
                <><Check size={14} /> Confirmar y Activar Torneo</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
