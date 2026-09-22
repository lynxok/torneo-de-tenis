import React from 'react';
import { HelpCircle, Trophy, Grid, X } from 'lucide-react';

export interface ProjectionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectionHelpModal: React.FC<ProjectionHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">¿Cómo se resuelven los dos métodos de cruces?</h3>
              <p className="text-xs text-slate-400">Guía reglamentaria y lógica de emparejamiento para playoffs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 text-xs text-slate-300">
          {/* Método 1: Tabla General Unificada */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
              <Trophy size={16} />
              <span>1. Tabla General Unificada + BYEs (Criterio por Mérito Global)</span>
            </div>
            <p className="leading-relaxed">
              Todos los clasificados de todas las zonas se unifican en una sola tabla general del <strong>1° al N°</strong> según:
              <span className="block mt-1 font-mono text-amber-200/90 text-[11px] bg-black/30 p-2 rounded-lg">
                Puntos &gt; Partidos Ganados &gt; Diferencia de Sets &gt; Diferencia de Games
              </span>
            </p>

            {/* Definición y Explicación de BYE */}
            <div className="p-3 bg-black/40 rounded-xl border border-amber-500/20 space-y-1.5">
              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <span>💡 ¿Qué significa tener un "BYE" en tenis?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Un <strong>BYE</strong> (pase libre o exención de ronda) ocurre cuando un cuadro eliminatorio no completa una potencia de 2 exacta (por ejemplo, clasifican 6 jugadores en vez de 8).
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Para completar el cuadro sin partidos ficticios, los <strong>mejores clasificados (1° y 2°) descansan en la primera ronda (Cuartos) y avanzan automáticamente a Semifinales</strong> como premio a su mejor rendimiento, esperando a los ganadores de los otros cruces.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                <span>🎾 Estructura de cabezas de serie profesional:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-300">
                <li><strong>Si clasifican 6 jugadores (ej: 3 zonas de 4):</strong> El 1° y 2° de la general reciben <strong>BYE directo a Semifinales</strong> (uno en la llave alta y otro en la baja). El 3°, 4°, 5° y 6° juegan los Cuartos de Final (3° vs 6° y 4° vs 5°).</li>
                <li><strong>Si clasifican 8 jugadores (ej: 4 zonas):</strong> Cuadro completo sin BYEs: <strong>1° vs 8°</strong>, <strong>4° vs 5°</strong>, <strong>3° vs 6°</strong> y <strong>2° vs 7°</strong> (regla profesional donde la suma de puestos da N+1).</li>
                <li><strong>Ideal para:</strong> Premiar con justicia deportiva a quienes ganaron más partidos y perdieron menos games en toda la fase regular.</li>
              </ul>
            </div>
          </div>

          {/* Método 2: Cruces Directos por Zonas */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-2.5">
            <div className="flex items-center gap-2 text-primary font-black text-sm">
              <Grid size={16} />
              <span>2. Cruces Directos por Zonas (Criterio Anti-Repetición Clásico)</span>
            </div>
            <p className="leading-relaxed">
              Los clasificados se emparejan estrictamente según su posición dentro de su grupo, garantizando que <strong>nadie vuelva a jugar contra un rival de su misma zona</strong> en la ronda inicial de playoffs.
            </p>
            <div className="space-y-2 pt-1">
              <div className="font-bold text-white">¿Cómo se resuelve según la cantidad de zonas?</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <span className="font-bold text-primary block">🎾 3 Zonas (Impares con 12 jugadores):</span>
                  <p className="text-slate-400 leading-snug">
                    Los <strong>2 mejores primeros</strong> reciben <strong>BYE a Semifinales</strong>. Se cruzan en Cuartos: <strong>1°C vs 2°A</strong> y <strong>2°B vs 2°C</strong>. ¡Cero repetición de grupo!
                  </p>
                </div>

                <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <span className="font-bold text-primary block">🎾 4 Zonas (Cuadro Tradicional de 8):</span>
                  <p className="text-slate-400 leading-snug">
                    Cruces alternados: <strong>1°A vs 2°C</strong> y <strong>1°B vs 2°D</strong> (llave alta). <strong>1°C vs 2°A</strong> y <strong>1°D vs 2°B</strong> (llave baja). Los del mismo grupo no se cruzan antes de la Final.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparativa rápida */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>💡 <strong>Tip para el Organizador:</strong> Podés alternar los dos botones arriba para previsualizar los cruces en vivo antes de oficializar definitivamente.</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
