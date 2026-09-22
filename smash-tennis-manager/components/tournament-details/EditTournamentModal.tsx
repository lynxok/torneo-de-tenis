import React from 'react';
import { Tournament } from '../../types';
import { Calendar, X, Layers, Loader2 } from 'lucide-react';
import { getCategoriesForInstitution } from '../../utils/categories';

export interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  formData: Partial<Tournament>;
  onFormChange: (data: Partial<Tournament>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isUpdating: boolean;
}

export const EditTournamentModal: React.FC<EditTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  formData,
  onFormChange,
  onSubmit,
  isUpdating
}) => {
  if (!isOpen) return null;

  return (
    <div id="edit-tournament-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Editar Torneo y Fechas</h3>
              <p className="text-xs text-muted">{tournament.institutions?.name || 'Torneo de tu institución'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs text-muted uppercase font-bold">Nombre del Torneo</label>
            <input 
              className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
              value={formData.name || ''} 
              onChange={e => onFormChange({ ...formData, name: e.target.value })} 
              required 
            />
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
            <label className="text-xs text-amber-300 uppercase font-bold flex items-center gap-1.5">
              <Calendar size={14} /> Fecha de Inicio Oficial *
            </label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-amber-400" 
              value={formData.start_date || ''} 
              onChange={e => onFormChange({ ...formData, start_date: e.target.value })} 
              required 
            />
            <p className="text-[11px] text-amber-200/70">Esta fecha define el inicio del cuadro y la visualización en el calendario oficial.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase font-bold">Modalidad</label>
              <select 
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                value={formData.type || 'singles'} 
                onChange={e => onFormChange({ ...formData, type: e.target.value as any })}
              >
                <option value="singles">Singles</option>
                <option value="doubles">Dobles</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase font-bold">Rama</label>
              <select 
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                value={formData.gender || 'Caballeros'} 
                onChange={e => onFormChange({ ...formData, gender: e.target.value as any })}
              >
                <option value="Caballeros">Caballeros</option>
                <option value="Damas">Damas</option>
                <option value="Mixto">Mixto</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase font-bold">Categoría</label>
              <select 
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                value={formData.category || '4ta'} 
                onChange={e => onFormChange({ ...formData, category: e.target.value })}
              >
                {getCategoriesForInstitution(tournament?.institutions).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} /> Formato de Competencia y Cuadros
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted uppercase font-bold">Esquema de Cuadro</label>
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-none focus:border-primary" 
                value={formData.competition_format || 'tabla_general_byes'} 
                onChange={e => onFormChange({ ...formData, competition_format: e.target.value as any })}
              >
                <option value="tabla_general_byes">🏆 Tabla General + Playoff con BYEs (Todos clasifican por mérito)</option>
                <option value="zonas_playoffs">🎾 Zonas Tradicionales (Clasifican 1° y 2° por grupo)</option>
                <option value="eliminacion_directa">⚡ Eliminación Directa con BYEs</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted uppercase font-bold">Partidos Mínimos Asegurados</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-primary" 
                  value={formData.min_guaranteed_matches || 3} 
                  onChange={e => onFormChange({ ...formData, min_guaranteed_matches: parseInt(e.target.value) })}
                >
                  <option value={1}>1 Partido (Directo)</option>
                  <option value={2}>2 Partidos (Zonas de 3)</option>
                  <option value={3}>3 Partidos (Zonas de 4 / Circuito)</option>
                  <option value={4}>4 Partidos (Zonas de 5)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted uppercase font-bold">Pases Directos (BYEs)</label>
                <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-white/10 cursor-pointer text-xs text-slate-200">
                  <input 
                    type="checkbox" 
                    className="accent-primary rounded" 
                    checked={formData.allow_byes !== false} 
                    onChange={e => onFormChange({ ...formData, allow_byes: e.target.checked })} 
                  />
                  <span>Activar BYEs en cuadro</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase font-bold">Precio Inscripción ($)</label>
              <input 
                type="number" 
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                value={formData.registration_price ?? 0} 
                onChange={e => onFormChange({ ...formData, registration_price: parseFloat(e.target.value) || 0 })} 
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted uppercase font-bold">Inscripción</label>
              <select 
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                value={formData.registration_closed ? 'closed' : 'open'} 
                onChange={e => onFormChange({ ...formData, registration_closed: e.target.value === 'closed' })}
              >
                <option value="open">🟢 Abierta</option>
                <option value="closed">🔴 Cerrada</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isUpdating} 
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isUpdating} 
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
              {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
