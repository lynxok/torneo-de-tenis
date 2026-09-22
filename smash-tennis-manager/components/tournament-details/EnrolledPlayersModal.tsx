import React from 'react';
import { Tournament, UserProfile, TournamentPlayer } from '../../types';
import { Users, Search, Download, UserPlus, Eye, RefreshCw, Trash2, Clock, Loader2, X } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatters';

export interface EnrolledPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  players: TournamentPlayer[];
  filteredPlayers: TournamentPlayer[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  currentUser: UserProfile;
  isClubAdmin: boolean;
  onExportCSV: () => void;
  onOpenManualEnroll: () => void;
  onOpenReplaceModal: (player: TournamentPlayer) => void;
  onUnenrollPlayer: (player: TournamentPlayer) => void;
  onTogglePaymentStatus: (player: TournamentPlayer) => void;
  onViewReceipt: (receiptUrl: string) => void;
  deletingPlayerId: string | null;
}

export const EnrolledPlayersModal: React.FC<EnrolledPlayersModalProps> = ({
  isOpen,
  onClose,
  tournament,
  players,
  filteredPlayers,
  searchQuery,
  onSearchQueryChange,
  currentUser,
  isClubAdmin,
  onExportCSV,
  onOpenManualEnroll,
  onOpenReplaceModal,
  onUnenrollPlayer,
  onTogglePaymentStatus,
  onViewReceipt,
  deletingPlayerId
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                Jugadores Inscriptos
                <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  {players.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {tournament?.name} • Categoría: {tournament?.category || 'Todas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por jugador o categoría..."
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isClubAdmin && (
              <button
                onClick={onExportCSV}
                className="p-2 px-3 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Descargar lista de inscriptos en Excel / CSV con datos de contacto y disponibilidad"
              >
                <Download size={14} className="text-emerald-400" /> Exportar CSV
              </button>
            )}
            {isClubAdmin && (
              <button
                onClick={onOpenManualEnroll}
                className="p-2 px-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Inscribir jugador manualmente"
              >
                <UserPlus size={14} /> Inscribir
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[55vh]">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {searchQuery ? 'No se encontraron jugadores que coincidan con la búsqueda.' : 'Aún no hay jugadores inscriptos en este torneo.'}
            </div>
          ) : (
            filteredPlayers.map((p, i) => {
              const pDisplayName = formatPlayerName(p.name || p.player_name);
              const isPaid = p.payment_status === 'paid';
              const isSelf = p.player_id === currentUser.id || p.id === currentUser.id;
              const pAvailability = p.availability_notes || p.time_restrictions;

              return (
                <div 
                  key={p.id || i} 
                  className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 border border-white/5 rounded-xl hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 shadow-inner">
                      {pDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        <span>{pDisplayName}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {p.category ? `${p.category} Cat.` : 'Sin Cat.'}
                        </span>
                        {(isClubAdmin || isSelf) && p.fee_amount ? (
                          <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ${p.fee_amount}
                          </span>
                        ) : null}
                        {(isClubAdmin || isSelf) && pAvailability ? (
                          <span 
                            className="text-[10px] text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 max-w-[200px]"
                            title={`Disponibilidad: ${pAvailability}`}
                          >
                            <Clock size={10} className="text-amber-400 shrink-0" />
                            <span className="truncate">{pAvailability}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Comprobante de pago adjunto para Admin */}
                    {isClubAdmin && p.receipt_url && (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(p.receipt_url || '')}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 flex items-center gap-1 transition-all"
                        title="Ver comprobante de pago subido por el jugador"
                      >
                        <Eye size={12} className="text-blue-400" />
                        <span>Comprobante</span>
                      </button>
                    )}

                    {/* Payment Status: Admin or Self only */}
                    {isClubAdmin ? (
                      <button
                        onClick={() => onTogglePaymentStatus(p)}
                        title="Click para cambiar estado de pago"
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                          isPaid
                            ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {isPaid ? 'Pagado' : 'Pendiente'}
                      </button>
                    ) : isSelf ? (
                      <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border ${
                        isPaid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {isPaid ? 'Pagado' : 'Pendiente'}
                      </span>
                    ) : null}

                    {/* Action Buttons for Admin */}
                    {isClubAdmin && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <button
                          onClick={() => onOpenReplaceModal(p)}
                          className="p-1.5 bg-primary/15 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                          title="Sustituir / Reemplazar jugador en el torneo"
                        >
                          <RefreshCw size={14} />
                        </button>

                        <button
                          onClick={() => onUnenrollPlayer(p)}
                          disabled={deletingPlayerId === p.id}
                          className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                          title="Dar de baja / Quitar inscripto"
                        >
                          {deletingPlayerId === p.id ? (
                            <Loader2 size={14} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 mt-4">
          <span>Mostrando {filteredPlayers.length} de {players.length} jugadores</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
