import React from 'react';
import { Tournament, UserProfile, TournamentPlayer } from '../../types';
import { RefreshCw, UserCheck, Users, Search, CheckCircle2, Loader2, Info, X } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatters';
import { NUMERIC_CATEGORIES } from '../../utils/categories';

export interface ReplacePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  playerToReplace: TournamentPlayer | null;
  replaceMode: 'member' | 'guest';
  onReplaceModeChange: (mode: 'member' | 'guest') => void;
  allProfiles: UserProfile[];
  loadingProfiles: boolean;
  searchUserReplaceQuery: string;
  onSearchUserReplaceQueryChange: (query: string) => void;
  selectedUserForReplace: UserProfile | null;
  onSelectUserForReplace: (user: UserProfile) => void;
  replaceGuestName: string;
  onReplaceGuestNameChange: (name: string) => void;
  replacePartnerMode: 'member' | 'guest';
  onReplacePartnerModeChange: (mode: 'member' | 'guest') => void;
  searchPartnerReplaceQuery: string;
  onSearchPartnerReplaceQueryChange: (query: string) => void;
  selectedPartnerForReplace: UserProfile | null;
  onSelectPartnerForReplace: (user: UserProfile) => void;
  replaceGuestPartnerName: string;
  onReplaceGuestPartnerNameChange: (name: string) => void;
  replaceCategory: string;
  onReplaceCategoryChange: (cat: string) => void;
  filterByGender: boolean;
  onToggleFilterByGender: () => void;
  matchTournamentGender: (userGender?: string, targetGender?: string) => boolean;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  players: TournamentPlayer[];
}

export const ReplacePlayerModal: React.FC<ReplacePlayerModalProps> = ({
  isOpen,
  onClose,
  tournament,
  playerToReplace,
  replaceMode,
  onReplaceModeChange,
  allProfiles,
  loadingProfiles,
  searchUserReplaceQuery,
  onSearchUserReplaceQueryChange,
  selectedUserForReplace,
  onSelectUserForReplace,
  replaceGuestName,
  onReplaceGuestNameChange,
  replacePartnerMode,
  onReplacePartnerModeChange,
  searchPartnerReplaceQuery,
  onSearchPartnerReplaceQueryChange,
  selectedPartnerForReplace,
  onSelectPartnerForReplace,
  replaceGuestPartnerName,
  onReplaceGuestPartnerNameChange,
  replaceCategory,
  onReplaceCategoryChange,
  filterByGender,
  onToggleFilterByGender,
  matchTournamentGender,
  onSubmit,
  isSubmitting,
  players
}) => {
  if (!isOpen || !playerToReplace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw size={18} className="text-primary" /> Sustituir Jugador
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Jugador saliente: <strong className="text-white">{playerToReplace.player_name || playerToReplace.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector (Singles) */}
        {tournament.type !== 'doubles' && (
          <div className="p-4 pb-0">
            <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => onReplaceModeChange('member')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replaceMode === 'member'
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-muted hover:text-white'
                }`}
              >
                <UserCheck size={14} /> Socio Registrado
              </button>
              <button
                type="button"
                onClick={() => onReplaceModeChange('guest')}
                className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replaceMode === 'guest'
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-muted hover:text-white'
                }`}
              >
                <Users size={14} /> Jugador Externo / Invitado
              </button>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {tournament.type === 'doubles' ? (
            <div className="space-y-4">
              {/* JUGADOR 1 */}
              <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <UserCheck size={14} /> Jugador 1
                  </span>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onReplaceModeChange('member')}
                      className={`px-2 py-0.5 rounded-lg font-semibold ${replaceMode === 'member' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    >
                      Socio
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplaceModeChange('guest')}
                      className={`px-2 py-0.5 rounded-lg font-semibold ${replaceMode === 'guest' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    >
                      Invitado
                    </button>
                  </div>
                </div>

                {replaceMode === 'member' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar Jugador 1 por nombre o DNI..."
                      value={searchUserReplaceQuery}
                      onChange={e => onSearchUserReplaceQueryChange(e.target.value)}
                      className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1.5 bg-black/20 custom-scrollbar">
                      {allProfiles
                        .filter(p => {
                          if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
                          const query = searchUserReplaceQuery.toLowerCase().trim();
                          if (!query) return true;
                          return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                        })
                        .slice(0, 15)
                        .map(p => {
                          const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectUserForReplace(p);
                                onReplaceGuestNameChange(formatPlayerName(p.name, p.lastname));
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                                selectedUserForReplace?.id === p.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-white'
                              }`}
                            >
                              <div className="truncate flex items-center gap-1.5">
                                <span>{formatPlayerName(p.name, p.lastname)}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isFemale ? 'Damas' : 'Caballeros'}
                                </span>
                              </div>
                              {selectedUserForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Nombre y Apellido del Jugador 1"
                    value={replaceGuestName}
                    onChange={e => onReplaceGuestNameChange(e.target.value)}
                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                    required
                  />
                )}
              </div>

              {/* JUGADOR 2 (PAREJA) */}
              <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <Users size={14} /> Jugador 2 (Pareja de Dobles)
                  </span>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onReplacePartnerModeChange('member')}
                      className={`px-2 py-0.5 rounded-lg font-semibold ${replacePartnerMode === 'member' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    >
                      Socio
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplacePartnerModeChange('guest')}
                      className={`px-2 py-0.5 rounded-lg font-semibold ${replacePartnerMode === 'guest' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                    >
                      Invitado
                    </button>
                  </div>
                </div>

                {replacePartnerMode === 'member' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar Pareja por nombre o DNI..."
                      value={searchPartnerReplaceQuery}
                      onChange={e => onSearchPartnerReplaceQueryChange(e.target.value)}
                      className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1.5 bg-black/20 custom-scrollbar">
                      {allProfiles
                        .filter(p => {
                          if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
                          const query = searchPartnerReplaceQuery.toLowerCase().trim();
                          if (!query) return true;
                          return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                        })
                        .slice(0, 15)
                        .map(p => {
                          const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPartnerForReplace(p);
                                onReplaceGuestPartnerNameChange(formatPlayerName(p.name, p.lastname));
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                                selectedPartnerForReplace?.id === p.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-white'
                              }`}
                            >
                              <div className="truncate flex items-center gap-1.5">
                                <span>{formatPlayerName(p.name, p.lastname)}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isFemale ? 'Damas' : 'Caballeros'}
                                </span>
                              </div>
                              {selectedPartnerForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Nombre y Apellido de la Pareja"
                    value={replaceGuestPartnerName}
                    onChange={e => onReplaceGuestPartnerNameChange(e.target.value)}
                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                    required
                  />
                )}
              </div>
            </div>
          ) : replaceMode === 'member' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted font-bold uppercase block">Buscar Nuevo Jugador (Socio)</label>
                <button
                  type="button"
                  onClick={onToggleFilterByGender}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  {filterByGender ? 'Ver todos' : `Filtrar (${tournament?.gender || 'Rama'})`}
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, DNI o email..."
                  value={searchUserReplaceQuery}
                  onChange={e => onSearchUserReplaceQueryChange(e.target.value)}
                  className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                />
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
                      const query = searchUserReplaceQuery.toLowerCase().trim();
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
                      const isSelected = selectedUserForReplace?.id === p.id;
                      const isAlreadyIn = players.some(pl => pl.player_id === p.id && pl.id !== playerToReplace.id);
                      const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isAlreadyIn}
                          onClick={() => {
                            onSelectUserForReplace(p);
                            if (p.category) onReplaceCategoryChange(p.category);
                          }}
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
                <label className="text-xs text-muted font-bold uppercase block mb-1">Nombre y Apellido del Nuevo Jugador *</label>
                <input
                  type="text"
                  placeholder="Ej: Martín Palermo"
                  value={replaceGuestName}
                  onChange={e => onReplaceGuestNameChange(e.target.value)}
                  className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="text-xs text-muted font-bold uppercase block mb-1">Categoría</label>
            <select
              value={replaceCategory}
              onChange={e => onReplaceCategoryChange(e.target.value)}
              className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
            >
              {NUMERIC_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'Open' ? 'Categoría Open' : `${cat} Categoría`}
                </option>
              ))}
            </select>
          </div>

          {/* Informative notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 mb-0.5">Información de la Sustitución</strong>
              {tournament.type === 'doubles' ? (
                <span>La dupla ocupará la misma posición/zona de <strong>{playerToReplace.player_name || playerToReplace.name}</strong> y sus partidos pendientes se actualizarán con los nuevos integrantes.</span>
              ) : (
                <span>El nuevo jugador ocupará la misma posición/zona de <strong>{playerToReplace.player_name || playerToReplace.name}</strong> y sus partidos pendientes se actualizarán automáticamente.</span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white text-xs hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (tournament.type !== 'doubles' && replaceMode === 'member' && !selectedUserForReplace) || (tournament.type !== 'doubles' && replaceMode === 'guest' && !replaceGuestName.trim())}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              ) : (
                <><RefreshCw size={14} /> Confirmar Sustitución</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
