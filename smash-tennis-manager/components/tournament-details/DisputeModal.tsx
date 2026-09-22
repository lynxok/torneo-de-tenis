import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputeReason: string;
  onDisputeReasonChange: (reason: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  disputeReason,
  onDisputeReasonChange,
  onSubmit,
  submitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={18} /> Reportar Discrepancia de Marcador
          </h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-xs text-slate-300">
            Indica cuál fue el resultado real o el motivo del desacuerdo. El organizador del torneo o SuperAdmin será notificado para arbitrar.
          </p>
          <textarea
            rows={3}
            required
            placeholder="Ej: El segundo set terminó 6-4 a mi favor, no 4-6..."
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            value={disputeReason}
            onChange={e => onDisputeReasonChange(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Enviar Disputa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
