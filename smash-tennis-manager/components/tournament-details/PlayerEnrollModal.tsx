import React from 'react';
import { Tournament, UserProfile } from '../../types';
import { Trophy, X, CreditCard, Check, Copy, ExternalLink, Receipt, Trash2, Upload, Clock, Info, Loader2, CheckCircle2 } from 'lucide-react';

export interface PlayerEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  user: UserProfile;
  effectivePrice: number;
  hostInstitution: any;
  copiedAlias: boolean;
  onCopyAlias: () => void;
  enrollmentReceiptImage: string | null;
  onReceiptImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReceiptImage: () => void;
  onViewReceipt: (url: string) => void;
  playerAvailabilityNotes: string;
  onAvailabilityNotesChange: (notes: string) => void;
  onToggleAvailabilityChip: (chip: string) => void;
  onConfirmEnroll: () => void;
  isEnrolling: boolean;
}

export const PlayerEnrollModal: React.FC<PlayerEnrollModalProps> = ({
  isOpen,
  onClose,
  tournament,
  user,
  effectivePrice,
  hostInstitution,
  copiedAlias,
  onCopyAlias,
  enrollmentReceiptImage,
  onReceiptImageChange,
  onRemoveReceiptImage,
  onViewReceipt,
  playerAvailabilityNotes,
  onAvailabilityNotesChange,
  onToggleAvailabilityChip,
  onConfirmEnroll,
  isEnrolling
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inscripción al Torneo</h3>
              <p className="text-xs text-muted">{tournament.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted block">Arancel oficial de inscripción</span>
              <span className="text-lg font-black text-white">${effectivePrice}</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-primary/20 text-primary font-bold border border-primary/30">
              {user.category || tournament.category} • {tournament.gender || 'Caballeros'}
            </span>
          </div>

          {effectivePrice > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 via-blue-900/20 to-slate-900 border border-sky-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <CreditCard size={16} />
                  <span>Pago del Arancel (0% Comisión)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Directo al Club
                </span>
              </div>

              {(hostInstitution?.alias_mp || hostInstitution?.cvu_mp) ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300">
                    Podés transferir el arancel (${effectivePrice}) por Mercado Pago o banco:
                  </p>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-muted uppercase font-bold">Alias de Mercado Pago</div>
                      <div className="font-mono text-sm font-bold text-emerald-400 truncate">
                        {hostInstitution.alias_mp || hostInstitution.cvu_mp}
                      </div>
                      {hostInstitution.titular_mp && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Titular: {hostInstitution.titular_mp}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onCopyAlias}
                      className="px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                    >
                      {copiedAlias ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedAlias ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <a
                    href="https://www.mercadopago.com.ar/transfer/account-finder?preference_id=transfer-mla-desktop&workflow_id=ars_transfer"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const val = hostInstitution.alias_mp || hostInstitution.cvu_mp || '';
                      if (val) navigator.clipboard.writeText(val);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
                  >
                    <ExternalLink size={14} />
                    <span>Copiar Alias y Abrir Mercado Pago</span>
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  El club no ha configurado alias online. Podrás abonar tu arancel directamente en mesa de control el día del torneo.
                </p>
              )}
            </div>
          )}

          {/* Step: Adjuntar Comprobante de Transferencia (Obligatorio si arancel > $0) */}
          {effectivePrice > 0 && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-primary" /> Comprobante de Transferencia *
                </label>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Reserva de plaza (15 min)
                </span>
              </div>
              <p className="text-xs text-muted">
                Adjuntá la foto o captura del comprobante bancario para asegurar tu lugar en el cuadro:
              </p>

              {enrollmentReceiptImage ? (
                <div className="relative group rounded-xl overflow-hidden border border-emerald-500/50 bg-black/40 p-2 flex items-center gap-3">
                  <img 
                    src={enrollmentReceiptImage} 
                    alt="Comprobante" 
                    className="w-16 h-16 object-cover rounded-lg border border-white/10 cursor-pointer"
                    onClick={() => onViewReceipt(enrollmentReceiptImage)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check size={14} /> Comprobante adjuntado
                    </div>
                    <div className="text-[10px] text-muted">Haz clic en "Confirmar Inscripción" para finalizar.</div>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveReceiptImage}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Quitar comprobante"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/20 hover:border-primary/60 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all text-center">
                  <Upload size={22} className="text-primary mb-1" />
                  <span className="text-xs font-bold text-white">Subir captura o foto del comprobante</span>
                  <span className="text-[10px] text-muted mt-0.5">JPG o PNG hasta 10 MB (se comprime automáticamente)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={onReceiptImageChange}
                  />
                </label>
              )}
            </div>
          )}

          {/* Availability / Schedule Restrictions Section */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" /> Tu Disponibilidad Horaria (Opcional)
            </label>
            <p className="text-xs text-muted">
              Selecciona o escribe tus preferencias de horario para que la organización las tenga en cuenta:
            </p>

            {/* Quick Selection Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Viernes desde 19hs',
                'Sábado mañana',
                'Sábado tarde',
                'Domingo todo el día',
                'Sin restricciones'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onToggleAvailabilityChip(chip)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    playerAvailabilityNotes.includes(chip)
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Custom Text Area / Input */}
            <textarea
              rows={2}
              value={playerAvailabilityNotes}
              onChange={e => onAvailabilityNotesChange(e.target.value)}
              placeholder="Ej: Sábado no puedo de 13 a 16 hs, resto del fin de semana disponible..."
              className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-blue-200">
            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <span>Tu disponibilidad será visible para los organizadores en la mesa de control al programar tus partidos.</span>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isEnrolling}
            className="px-4 py-2.5 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmEnroll}
            disabled={isEnrolling}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
          >
            {isEnrolling ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirmar Inscripción
          </button>
        </div>
      </div>
    </div>
  );
};
