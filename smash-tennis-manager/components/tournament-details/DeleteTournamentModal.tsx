import React from 'react';
import { Tournament } from '../../types';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export interface DeleteTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  playersCount: number;
  matchesCount: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteTournamentModal: React.FC<DeleteTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  playersCount,
  matchesCount,
  onConfirm,
  isDeleting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">¿Eliminar este Torneo?</h3>
            <p className="text-xs text-muted">{tournament.institutions?.name || 'Sede del torneo'}</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-300 leading-relaxed">
          Estás por eliminar de forma permanente e irreversible el torneo <strong className="text-white font-bold">"{tournament.name}"</strong>.
        </p>

        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-red-400">
            <AlertTriangle size={14} /> Se eliminarán automáticamente:
          </div>
          <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 ml-1">
            <li><strong>{playersCount} inscriptos</strong> y sus parejas registradas.</li>
            <li><strong>{matchesCount} partidos</strong>, grupos, marcadores y cuadro de llaves.</li>
            <li>Todas las reservas de canchas y programaciones asociadas.</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Torneo'}
          </button>
        </div>
      </div>
    </div>
  );
};
