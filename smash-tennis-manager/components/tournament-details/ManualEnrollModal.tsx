import React from 'react';
import { Tournament, UserProfile, TournamentPlayer } from '../../types';
import { UserPlus, UserCheck, Users, Search, DollarSign, Clock, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatters';
import { getCategoriesForInstitution } from '../../utils/categories';

export interface ManualEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  players: TournamentPlayer[];
  allProfiles: UserProfile[];
  loadingProfiles: boolean;
  enrollMode: 'member' | 'guest';
  onEnrollModeChange: (mode: 'member' | 'guest') => void;
  searchUserQuery: string;
  onSearchUserQueryChange: (query: string) => void;
  filterByGender: boolean;
  onToggleFilterByGender: () => void;
  selectedUserForEnroll: UserProfile | null;
  onSelectUserForEnroll: (user: UserProfile) => void;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  guestPartnerName: string;
  onGuestPartnerNameChange: (name: string) => void;
  guestCategory: string;
  onGuestCategoryChange: (category: string) => void;
  manualFee: number;
  onManualFeeChange: (fee: number) => void;
  manualPaymentStatus: 'paid' | 'pending';
  onManualPaymentStatusChange: (status: 'paid' | 'pending') => void;
  manualAvailabilityNotes: string;
  onManualAvailabilityNotesChange: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  matchTournamentGender: (userGender?: string, targetGender?: string) => boolean;
  getUserMasterEligibility?: (user: UserProfile, topN?: number) => { eligible: boolean; rank: number; topN: number };
  allProfilesForMasters?: UserProfile[];
}

export const ManualEnrollModal: React.FC<ManualEnrollModalProps> = ({
  isOpen,
  onClose,
  tournament,
  players,
  allProfiles,
  loadingProfiles,
  enrollMode,
  onEnrollModeChange,
  searchUserQuery,
  onSearchUserQueryChange,
  filterByGender,
  onToggleFilterByGender,
  selectedUserForEnroll,
  onSelectUserForEnroll,
  guestName,
  onGuestNameChange,
  guestPartnerName,
  onGuestPartnerNameChange,
  guestCategory,
  onGuestCategoryChange,
  manualFee,
  onManualFeeChange,
  manualPaymentStatus,
  onManualPaymentStatusChange,
  manualAvailabilityNotes,
  onManualAvailabilityNotesChange,
  onSubmit,
  submitting,
  matchTournamentGender,
  getUserMasterEligibility,
  allProfilesForMasters = []
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus size={18} className="text-primary" /> Inscribir Jugador al Torneo
          </h3>
          <button onClick={onClose} className="text-muted hover:text-white p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => onEnrollModeChange('member')}
              className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                enrollMode === 'member'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted hover:text-white'
              }`}
            >
              <UserCheck size={14} /> Socio / Usuario Registrado
            </button>
            <button
              type="button"
              onClick={() => onEnrollModeChange('guest')}
              className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                enrollMode === 'guest'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Users size={14} /> Jugador Externo / Invitado
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {enrollMode === 'member' ? (
            <div className="space-y-3">
              <label className="text-xs text-muted font-bold uppercase block">Buscar Usuario o Socio</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, DNI o email..."
                  value={searchUserQuery}
                  onChange={e => onSearchUserQueryChange(e.target.value)}
                  className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                />
              </div>

              {/* Gender filter toggle indicator */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-muted flex items-center gap-1">
                  Rama torneo: <strong className="text-primary font-bold">{tournament?.gender || 'Caballeros'}</strong>
                </span>
                <button
                  type="button"
                  onClick={onToggleFilterByGender}
                  className="text-primary hover:underline font-semibold"
                >
                  {filterByGender ? 'Ver todos los socios' : 'Filtrar por rama'}
                </button>
              </div>

              {/* User Search Results */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/5 rounded-2xl p-2 bg-slate-900/60 custom-scrollbar">
                {loadingProfiles ? (
                  <div className="py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" /> Buscando socios...
                  </div>
                ) : (
                  allProfiles
                    .filter(p => {
                      if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
                      const query = searchUserQuery.toLowerCase().trim();
                      if (!query) return true;
                      const fullName = `${p.name} ${p.lastname || ''}`.toLowerCase();
                      return (
                        fullName.includes(query) ||
                        (p.email && p.email.toLowerCase().includes(query)) ||
                        (p.dni && p.dni.includes(query))
                      );
                    })
                    .slice(0, 30)
                    .map(p => {
                      const isSelected = selectedUserForEnroll?.id === p.id;
                      const isAlreadyIn = players.some(pl => pl.player_id === p.id);
                      const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';

                      // Masters eligibility badge (admin can still force-enroll)
                      const showMastersBadge = tournament?.tier_applied === 'masters' && allProfilesForMasters.length > 0 && getUserMasterEligibility;
                      const playerMasterElig = showMastersBadge ? getUserMasterEligibility(p, 20) : null;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isAlreadyIn}
                          onClick={() => onSelectUserForEnroll(p)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                            isAlreadyIn
                              ? 'opacity-40 bg-white/5 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary/20 border border-primary/40 text-primary font-bold shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-white border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold truncate flex items-center gap-1.5">
                              {formatPlayerName(p.name, p.lastname)}
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                {isFemale ? 'Damas' : 'Caballeros'}
                              </span>
                              {playerMasterElig && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${playerMasterElig.eligible ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/25'}`} title={playerMasterElig.eligible ? `Top ${playerMasterElig.topN} — Clasificado` : `Posición #${playerMasterElig.rank} — No clasificado para Masters`}>
                                  👑 #{playerMasterElig.rank}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted truncate">
                              {p.category ? `${p.category} Cat.` : 'Sin Cat.'} {p.institution ? `• ${p.institution}` : ''}
                            </div>
                          </div>
                          {isAlreadyIn ? (
                            <span className="text-[10px] text-yellow-400 font-semibold">Ya inscripto</span>
                          ) : isSelected ? (
                            <CheckCircle2 size={16} className="text-primary" />
                          ) : null}
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted font-bold uppercase block mb-1.5">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Rodríguez"
                  value={guestName}
                  onChange={e => onGuestNameChange(e.target.value)}
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white focus:border-primary outline-none"
                />
              </div>

              {/* Doubles Partner for Guests */}
              {tournament?.type === 'doubles' && (
                <div>
                  <label className="text-xs text-primary font-bold uppercase block mb-1.5">🎾 Nombre de la Pareja de Dobles *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={guestPartnerName}
                    onChange={e => onGuestPartnerNameChange(e.target.value)}
                    className="w-full bg-sidebar border border-primary/40 rounded-xl p-3 text-xs text-white focus:border-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-muted font-bold uppercase block mb-1.5">Categoría *</label>
                <select
                  value={guestCategory}
                  onChange={e => onGuestCategoryChange(e.target.value)}
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-semibold focus:border-primary outline-none"
                >
                  {getCategoriesForInstitution(tournament?.institutions).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Commercial / Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs text-muted font-bold uppercase block mb-1.5">Arancel de Inscripción ($)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-3.5 text-muted" />
                <input
                  type="number"
                  min={0}
                  value={manualFee}
                  onChange={e => onManualFeeChange(Number(e.target.value))}
                  className="w-full bg-sidebar border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white font-mono font-bold focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted font-bold uppercase block mb-1.5">Estado de Pago</label>
              <select
                value={manualPaymentStatus}
                onChange={e => onManualPaymentStatusChange(e.target.value as 'pending' | 'paid')}
                className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:border-primary outline-none"
              >
                <option value="paid">Pagado (Abonó en el Club)</option>
                <option value="pending">Pendiente de Pago</option>
              </select>
            </div>
          </div>

          {/* Availability / Time Restrictions */}
          <div>
            <label className="text-xs text-muted font-bold uppercase block mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" /> Disponibilidad / Restricciones Horarias (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Viernes desde 19hs, Sábado todo el día, Domingo no puede"
              value={manualAvailabilityNotes}
              onChange={e => onManualAvailabilityNotesChange(e.target.value)}
              className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Esta nota se mostrará al organizar los partidos en el calendario oficial.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Confirmar Inscripción
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
