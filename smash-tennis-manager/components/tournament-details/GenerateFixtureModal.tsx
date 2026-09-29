import React, { useState } from 'react';
import { Tournament, TournamentPlayer, GroupStageFormat } from '../../types';
import { Settings2, X, Info, Grid, Layers, Shuffle, Loader2, Check, Zap, HelpCircle } from 'lucide-react';

export interface GenerateFixtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  players: TournamentPlayer[];
  fixtureNumGroups: number;
  onNumGroupsChange: (num: number) => void;
  onShufflePreview: (num: number) => void;
  previewGroups: { name: string; players: TournamentPlayer[] }[];
  onConfirmFixture: (groupStageFormat: GroupStageFormat) => void;
  generatingFixture: boolean;
  initialGroupStageFormat?: GroupStageFormat;
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
  generatingFixture,
  initialGroupStageFormat = 'round_robin'
}) => {
  const [selectedFormat, setSelectedFormat] = useState<GroupStageFormat>(
    (tournament.rules?.group_stage_format as GroupStageFormat) || initialGroupStageFormat
  );
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Generar presets inteligentes de zonas que nunca se repitan
  const smartPresets = React.useMemo(() => {
    const total = players.length;
    if (total < 4) return [];

    const presetsMap = new Map<number, { label: string; sublabel: string; perGroup: number }>();

    // 1. Preset Zonas de 4 (Ideal para Cruzada / Americana o grupos de 4)
    if (total >= 4) {
      const g4 = Math.max(1, Math.round(total / 4));
      if (!presetsMap.has(g4)) {
        presetsMap.set(g4, {
          label: `${g4} ${g4 === 1 ? 'Zona' : 'Zonas'}`,
          sublabel: g4 === 1 ? 'Grupo único (4 jugadores)' : `~${Math.round(total / g4)} por grupo (Zonas de 4)`,
          perGroup: Math.round(total / g4)
        });
      }
    }

    // 2. Preset Zonas de 3 (Torneo rápido / fin de semana)
    if (total >= 6) {
      const g3 = Math.max(1, Math.round(total / 3));
      if (!presetsMap.has(g3)) {
        presetsMap.set(g3, {
          label: `${g3} ${g3 === 1 ? 'Zona' : 'Zonas'}`,
          sublabel: `~${Math.round(total / g3)} por grupo (Zonas rápidas de 3)`,
          perGroup: Math.round(total / g3)
        });
      }
    }

    // 3. Preset 2 Zonas (Clásico torneo en 2 grupos)
    if (total >= 6 && !presetsMap.has(2)) {
      presetsMap.set(2, {
        label: '2 Zonas',
        sublabel: `${Math.ceil(total / 2)} por grupo (2 Grupos)`,
        perGroup: Math.ceil(total / 2)
      });
    }

    return Array.from(presetsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, data]) => ({ num, ...data }));
  }, [players.length]);

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

          {/* GROUP STAGE MATCH FORMAT SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted uppercase font-bold flex items-center gap-1.5">
                <span>1. Sistema de Juego en Zonas</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-primary hover:text-primary-hover text-xs flex items-center gap-1 font-semibold transition-colors"
              >
                <HelpCircle size={14} /> ¿Cómo funciona cada sistema?
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFormat('round_robin')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedFormat === 'round_robin'
                    ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                    : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Todos contra Todos</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-mono">Tradicional</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Cada jugador se enfrenta a todos sus rivales de zona. En zonas de 4 son 6 partidos en total (<strong>3 partidos por jugador</strong>).
                </p>
                <div className="mt-2 text-[10px] font-medium text-slate-400">
                  Ideal para: <span className="text-white">Torneos largos o semanales con tiempo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('cross_4')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedFormat === 'cross_4'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                    : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" /> Americana / Cruzada de 4
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">2 Fechas</span>
                </div>
                <p className="text-[11px] text-slate-300/80 mt-1 leading-relaxed">
                  Cruces iniciales + 2da fecha automática (<em>Ganadores vs Ganadores</em> y <em>Perdedores vs Perdedores</em>). Exactamente <strong>2 partidos por jugador</strong>.
                </p>
                <div className="mt-2 text-[10px] font-medium text-amber-300/80">
                  Ideal para: <span className="text-amber-200">Torneos de fin de semana o relámpago</span>
                </div>
              </button>
            </div>
          </div>

          {/* GROUP FORMAT SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
              <span>2. Cantidad de Zonas a Distribuir</span>
              <span className="text-primary font-normal lowercase text-[11px]">
                ({players.length} inscriptos)
              </span>
            </label>

            {smartPresets.length > 0 && (
              <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(smartPresets.length, 3)} gap-2.5`}>
                {smartPresets.map((preset) => {
                  const isSelected = fixtureNumGroups === preset.num;
                  return (
                    <button
                      key={preset.num}
                      type="button"
                      onClick={() => {
                        onNumGroupsChange(preset.num);
                        onShufflePreview(preset.num);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                          : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">
                        {preset.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {preset.sublabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
              {previewGroups.map((grp, idx) => {
                const isGroupCross4 = selectedFormat === 'cross_4' && grp.players.length === 4;
                const matchCount = isGroupCross4 ? 4 : (grp.players.length * (grp.players.length - 1)) / 2;

                return (
                  <div key={idx} className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-bold text-xs text-primary">{grp.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        isGroupCross4 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-white/5 text-muted'
                      }`}>
                        {grp.players.length} jugadores • {matchCount} partidos {isGroupCross4 ? '(Cruzada)' : ''}
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-muted">
            Total de partidos a disputar:{' '}
            <strong className="text-white">
              {previewGroups.reduce((acc, g) => {
                const isC4 = selectedFormat === 'cross_4' && g.players.length === 4;
                return acc + (isC4 ? 4 : (g.players.length * (g.players.length - 1)) / 2);
              }, 0)}{' '}
              partidos
            </strong>{' '}
            {selectedFormat === 'cross_4' && (
              <span className="text-amber-400 font-medium ml-1">(Modalidad Cruzada)</span>
            )}
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
              onClick={() => onConfirmFixture(selectedFormat)}
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

        {/* HELP MODAL: GUÍA DE MODALIDADES DE JUEGO */}
        {showHelpModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <HelpCircle size={18} className="text-primary" />
                  Guía de Sistemas de Juego en Zonas
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="text-muted hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* AMERICANA / CRUZADA */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                      <Zap size={15} /> Americana / Zona Cruzada de 4
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      Recomendado Relámpago
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Formato dinámico y rápido donde cada jugador disputa <strong>exactamente 2 partidos</strong> de zona (4 partidos en total por grupo en lugar de 6):
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300/90 text-[11px]">
                    <li><strong>Fecha 1 (Cruces iniciales):</strong> Jugador 1 vs Jugador 4 y Jugador 2 vs Jugador 3.</li>
                    <li><strong>Fecha 2 (Definición automática):</strong> Los dos ganadores juegan entre sí (definen el 1° y 2° puesto), y los dos perdedores juegan entre sí (definen el 3° y 4° puesto).</li>
                    <li><strong>Ahorro de canchas y tiempo:</strong> Ideal para torneos de un fin de semana evitando que un jugador espere partidos intrascendentes.</li>
                  </ul>
                </div>

                {/* TODOS CONTRA TODOS */}
                <div className="bg-slate-800/80 border border-white/10 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Todos contra Todos (Round Robin Clásico)</span>
                    <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Formato Liga
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Todos juegan contra todos dentro de la zona:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>En una zona de 4 jugadores se disputan <strong>6 partidos en total</strong> (3 partidos por persona).</li>
                    <li>En una zona de 3 jugadores se disputan <strong>3 partidos en total</strong> (2 partidos por persona).</li>
                    <li>Ideal cuando el torneo dispone de varias semanas o días para jugar y los inscriptos buscan sumar el mayor volumen de partidos posible.</li>
                  </ul>
                </div>

                {/* CRITERIO PARA ELEGIR CANTIDAD DE ZONAS */}
                <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-3 space-y-1.5">
                  <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                    <Grid size={13} /> ¿Cuántas zonas conviene poner?
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    • Si elegís <strong>Americana / Cruzada</strong>, lo ideal son zonas de 4 jugadores (ej: con 8 jugadores = 2 zonas de 4; con 16 jugadores = 4 zonas de 4).<br />
                    • Si tenés pocos días y querés zonas cortas en Todos contra Todos, apuntá a <strong>zonas de 3 jugadores</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 border-t border-white/10 bg-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
