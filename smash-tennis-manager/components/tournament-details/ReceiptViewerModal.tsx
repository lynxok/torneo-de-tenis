import React from 'react';
import { Receipt, X } from 'lucide-react';

export interface ReceiptViewerModalProps {
  receiptUrl: string | null;
  onClose: () => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  receiptUrl,
  onClose
}) => {
  if (!receiptUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-card border border-white/10 rounded-2xl p-5 max-w-lg w-full max-h-[90vh] flex flex-col relative shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt size={16} className="text-primary" /> Comprobante de Pago de Inscripción
          </h4>
          <button 
            onClick={onClose} 
            className="text-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/50 rounded-xl p-2 border border-white/5">
          <img 
            src={receiptUrl} 
            alt="Comprobante de Pago" 
            className="max-w-full max-h-[68vh] object-contain rounded-lg" 
          />
        </div>
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-muted mt-3">
          <span>Foto adjuntada por el jugador</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
