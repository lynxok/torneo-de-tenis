
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, Match, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    Search, MapPin, Award, UserPlus, X, Activity, Trophy, Calendar, MessageCircle, Send, 
    Clock, CheckCircle2, LayoutList, LayoutGrid, ChevronRight, MoreHorizontal, Building, 
    Sparkles, Zap, Smartphone, Loader2, Lock, AlertTriangle 
} from 'lucide-react';
import { getCategoryRank, NUMERIC_CATEGORIES } from '../utils/categories';

interface PlayersProps {
    user: UserProfile;
    onNavigate?: (view: string, data?: any) => void;
}

export const Players: React.FC<PlayersProps> = ({ user, onNavigate }) => {
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  // Filters
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); 
  
  // Modals
  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMustActivateModal, setShowMustActivateModal] = useState(false);
  const [showTargetDisabledModal, setShowTargetDisabledModal] = useState<{ show: boolean; playerName: string }>({ show: false, playerName: '' });

  const isCurrentUserChallengesActive = Boolean(user.phone && user.show_whatsapp !== false);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [allPlayers, allInstitutions] = await Promise.all([
                api.auth.getAllProfiles(),
                api.institutions.getAll()
            ]);
            setPlayers(allPlayers);
            setInstitutions(allInstitutions);
        } catch (e) {
            console.error("Error loading players data", e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  // --- SMART SUGGESTION ALGORITHM (UPDATED) ---
  const suggestions = useMemo(() => {
      // If current user has challenges disabled, do not show recommendations
      if (!user || user.show_whatsapp === false || players.length === 0) return [];

      return players
        .filter(p => p.id !== user.id && p.role !== 'admin' && p.role !== 'superadmin' && p.show_whatsapp !== false) // Exclude self, admins and users with challenges off
        .map(p => {
            let score = 0;
            let reasons = [];

            if (user.institution_id && p.institution_id === user.institution_id) {
                score += 50;
                reasons.push('Mismo Club');
            }

            const uRank = getCategoryRank(user.category);
            const pRank = getCategoryRank(p.category);

            if (uRank !== 99 && pRank !== 99 && uRank === pRank) {
                score += 30;
                reasons.push('Misma Categoría');
            } else if (uRank !== 99 && pRank !== 99 && Math.abs(uRank - pRank) === 1) {
                score += 10; // Close category
            }

            const myWins = user.matches_won || 0;
            const theirWins = p.matches_won || 0;
            const diff = Math.abs(myWins - theirWins);
            
            if (diff <= 3) {
                score += 20;
                if (score < 50) reasons.push('Nivel Similar'); 
            } else if (diff <= 6) {
                score += 10;
            }

            return { ...p, matchScore: score, matchReasons: reasons };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .filter(p => p.matchScore > 10) 
        .slice(0, 3); 
  }, [players, user]);


  const filteredPlayers = useMemo(() => {
    // 1. Base Filter (by search name, category dropdown, institution dropdown)
    let result = players.filter(p => {
      // If viewer is player, exclude admins/coordinators/professors
      if (user.role === 'player' && (p.role === 'admin' || p.role === 'superadmin' || p.role === 'coordinator' || p.role === 'professor')) {
        return false;
      }

      const matchesName = p.name.toLowerCase().includes(filter.toLowerCase()) || 
                          (p.lastname && p.lastname.toLowerCase().includes(filter.toLowerCase()));
      
      const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
      
      const matchesInstitution = institutionFilter 
          ? (p.institution_id === institutionFilter) 
          : true;

      return matchesName && matchesCategory && matchesInstitution;
    });

    // 2. Custom Category Sorting Order (uses global category rank)
    const userRank = getCategoryRank(user.category);

    result.sort((a, b) => {
        // Exclude self or keep self on top if desired (keep self at top of list)
        if (a.id === user.id) return -1;
        if (b.id === user.id) return 1;

        const aRank = getCategoryRank(a.category);
        const bRank = getCategoryRank(b.category);

        const getDistanceScore = (rank: number) => {
            if (userRank === 99 || rank === 99) return 100 + rank;
            if (rank === userRank) return 0; // Same category first
            if (rank > userRank) {
                // Lower categories below
                return rank - userRank; 
            } else {
                // Higher categories at the very end
                return 100 + (userRank - rank);
            }
        };

        const scoreA = getDistanceScore(aRank);
        const scoreB = getDistanceScore(bRank);

        if (scoreA !== scoreB) {
            return scoreA - scoreB;
        }

        // Secondary sort: Most wins first
        return (b.matches_won || 0) - (a.matches_won || 0);
    });

    return result;
  }, [players, user, filter, categoryFilter, institutionFilter]);

  const handleOpenProfile = (player: UserProfile) => {
    setSelectedPlayer(player);
  };

  const handleContact = (e: React.MouseEvent, player: UserProfile) => {
    e.stopPropagation();
    if (!isCurrentUserChallengesActive) {
        setShowMustActivateModal(true);
        return;
    }
    const isTargetEligible = Boolean(player.phone && player.show_whatsapp !== false);
    if (!isTargetEligible) {
        setShowTargetDisabledModal({
            show: true,
            playerName: `${player.name} ${player.lastname || ''}`.trim()
        });
        return;
    }
    if (selectedPlayer?.id !== player.id) setSelectedPlayer(player);
    setShowContactModal(true);
  };

  return (
    <div className="space-y-8 animate-fade-up">

      {!isCurrentUserChallengesActive && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 animate-fade-up">
              <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
              <div>
                  <h4 className="text-sm font-bold text-white">Desafíos de Jugadores Desactivados</h4>
                  <p className="text-xs text-slate-300">Has configurado tu perfil como no disponible para desafíos. Para enviar o recibir retos de partidos de otros jugadores, activa la opción en tu Perfil.</p>
              </div>
          </div>
      )}
      
      {!loading && suggestions.length > 0 && !filter && !categoryFilter && !institutionFilter && (
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-400 border border-yellow-500/20">
                      <Sparkles size={18} />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-white leading-none">Rivales Recomendados</h3>
                      <p className="text-xs text-muted">Jugadores con perfil similar al tuyo.</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestions.map((player: any) => (
                      <div 
                        key={player.id}
                        onClick={() => handleOpenProfile(player)}
                        className="bg-gradient-to-br from-card to-slate-800 border border-yellow-500/20 rounded-2xl p-4 cursor-pointer hover:border-yellow-500/50 transition-all group relative overflow-hidden"
                      >
                          <div className={`absolute top-0 right-0 text-[10px] font-bold px-2 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 text-black ${player.matchScore >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                              <Zap size={10} fill="black" /> {Math.min(player.matchScore, 99)}% Match
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                              <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-white shadow-inner relative shrink-0">
                                  {player.name.charAt(0)}
                                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${player.is_approved ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                              </div>
                              <div className="min-w-0">
                                  <h4 className="font-bold text-white truncate">{player.name} {player.lastname}</h4>
                                  <div className="text-xs text-muted truncate">{player.institution || 'Sin club'}</div>
                              </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mb-4">
                              {player.matchReasons.map((reason: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-white/5 text-slate-300 px-1.5 py-0.5 rounded border border-white/5">
                                      {reason}
                                  </span>
                              ))}
                          </div>

                          <button 
                              onClick={(e) => handleContact(e, player)}
                              className="w-full py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                          >
                              <MessageCircle size={14} /> Desafiar Ahora
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 2. MAIN DIRECTORY HEADER & FILTERS */}
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Directorio Completo</h2>
                <p className="text-muted text-sm">Explora todos los jugadores registrados.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap" id="filter-bar">
                <div className="flex bg-card border border-white/10 rounded-xl p-1 shrink-0">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow' : 'text-muted hover:text-white'}`}
                        title="Vista de Lista"
                    >
                        <LayoutList size={20} />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow' : 'text-muted hover:text-white'}`}
                        title="Vista de Grilla"
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>

                <select 
                    className="bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors cursor-pointer text-sm max-w-[200px]"
                    value={institutionFilter}
                    onChange={(e) => setInstitutionFilter(e.target.value)}
                >
                    <option value="">Todas las Sedes</option>
                    {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>

                <select 
                    className="bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors cursor-pointer text-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">Todas las Categorías</option>
                    {NUMERIC_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c === 'Open' ? 'Open' : `${c} Categoría`}</option>
                    ))}
                </select>
                
                <div className="relative flex-1 sm:w-64 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        className="w-full bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {loading ? (
            <div className="text-center py-20 text-muted">Cargando jugadores...</div>
        ) : filteredPlayers.length === 0 ? (
            <div className="py-20 text-center text-muted border border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2">
                <Search size={32} className="opacity-20" />
                <span>No se encontraron jugadores con los filtros actuales.</span>
            </div>
        ) : (
            <div id="players-container">
                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10 text-muted text-xs uppercase tracking-wider">
                                        <th className="p-4 pl-6">Jugador</th>
                                        <th className="p-4">Ubicación / Club</th>
                                        <th className="p-4 text-center">Categoría</th>
                                        <th className="p-4 text-center hidden md:table-cell">Estadísticas</th>
                                        <th className="p-4 text-right pr-6">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredPlayers.map(player => (
                                        <tr 
                                            key={player.id} 
                                            onClick={() => handleOpenProfile(player)}
                                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10 group-hover:ring-primary/50 transition-all">
                                                            {player.name.charAt(0)}
                                                        </div>
                                                        {player.is_approved && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full" title="Verificado"></div>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white group-hover:text-primary transition-colors">
                                                            {player.name} {player.lastname}
                                                            {player.id === user.id && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold">Yo</span>}
                                                        </div>
                                                        <div className="text-xs text-muted">Miembro Activo</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Building size={14} className="text-muted" />
                                                    {player.institution || <span className="text-muted italic">Sin club asignado</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${player.category ? 'bg-white/5 text-white border-white/10' : 'text-muted border-transparent'}`}>
                                                    {player.category || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="flex items-center justify-center gap-4 text-xs">
                                                    <div className="text-center">
                                                        <span className="block font-bold text-white">{player.matches_won || 0}</span>
                                                        <span className="text-muted">Victorias</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {player.id !== user.id && (
                                                        !player.phone || player.show_whatsapp === false ? (
                                                            <button 
                                                                onClick={(e) => handleContact(e, player)}
                                                                className="p-2 rounded-lg bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-white/5 text-xs flex items-center gap-1 transition-all" 
                                                                title="Este usuario no está habilitado a ser desafiado (falta registro de WhatsApp)"
                                                            >
                                                                <Lock size={14} /> <span className="hidden xl:inline text-[10px]">Sin WhatsApp</span>
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => handleContact(e, player)}
                                                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                                                                title="Desafiar / Contactar"
                                                            >
                                                                <MessageCircle size={16} />
                                                            </button>
                                                        )
                                                    )}
                                                    <button className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-all">
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* GRID VIEW */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPlayers.map(player => {
                            const isEligible = Boolean(player.phone && player.show_whatsapp !== false);
                            return (
                                <Card 
                                    key={player.id} 
                                    className="flex flex-col gap-4 hover:border-primary/50 group cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden"
                                    onClick={() => handleOpenProfile(player)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-2xl font-bold text-white shadow-inner relative">
                                            {player.name.charAt(0)}
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card ${player.is_approved ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg leading-tight group-hover:text-primary transition-colors">
                                                {player.name} {player.lastname}
                                            </h4>
                                            <span className="text-xs text-muted">{player.id === user.id ? 'Tú' : 'Jugador'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t border-white/5 pt-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted flex items-center gap-2"><MapPin size={14} /> Club</span>
                                            <span className="text-slate-200 truncate max-w-[120px]">{player.institution || 'Sin club'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted flex items-center gap-2"><Award size={14} /> Categoría</span>
                                            <span className="text-slate-200">{player.category || '-'}</span>
                                        </div>
                                    </div>
                                    {player.id !== user.id && (
                                        !isEligible ? (
                                            <button 
                                                onClick={(e) => handleContact(e, player)}
                                                className="mt-2 w-full py-2 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-white/5 transition-all text-center leading-tight"
                                                title="Este usuario no está habilitado a ser desafiado (falta registro de WhatsApp)"
                                            >
                                                <Lock size={12} className="shrink-0 text-yellow-500/80" /> No habilitado a ser desafiado (falta WhatsApp)
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={(e) => handleContact(e, player)}
                                                className="mt-2 w-full py-2 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-muted text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <MessageCircle size={14} /> Contactar / Desafiar
                                            </button>
                                        )
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* MUST ACTIVATE WHATSAPP MODAL FOR CURRENT USER */}
      {showMustActivateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
                  <div className="w-14 h-14 bg-green-500/10 text-green-400 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Smartphone size={28} />
                  </div>
                  <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-white">Activa tu WhatsApp primero</h3>
                      <p className="text-xs text-muted leading-relaxed">
                          Para poder desafiar a otros jugadores y coordinar partidos, primero debes ingresar tu número y activar la opción de WhatsApp en tu Perfil.
                      </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                      <button
                          onClick={() => setShowMustActivateModal(false)}
                          className="px-4 py-2 rounded-xl text-xs text-muted hover:text-white bg-white/5 transition-colors"
                      >
                          Cancelar
                      </button>
                      {onNavigate && (
                          <button
                              onClick={() => {
                                  setShowMustActivateModal(false);
                                  onNavigate('profile');
                              }}
                              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center gap-1.5"
                          >
                              Ir a mi Perfil
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* TARGET NOT ELIGIBLE MODAL */}
      {showTargetDisabledModal.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
                  <div className="w-14 h-14 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Lock size={28} />
                  </div>
                  <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">Usuario no habilitado</h3>
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-200 font-semibold leading-snug">
                          Este usuario no está habilitado a ser desafiado (falta registro de WhatsApp).
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                          El jugador <strong className="text-white">{showTargetDisabledModal.playerName}</strong> aún no ha completado su número de teléfono o ha desactivado los desafíos en su cuenta.
                      </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                      <button
                          onClick={() => setShowTargetDisabledModal({ show: false, playerName: '' })}
                          className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
                      >
                          Entendido
                      </button>
                  </div>
              </div>
          </div>
      )}

      {selectedPlayer && (
          <PlayerProfileModal 
            player={selectedPlayer} 
            currentUser={user}
            onClose={() => setSelectedPlayer(null)} 
            onContact={() => {
                if (!isCurrentUserChallengesActive) {
                    setShowMustActivateModal(true);
                    return;
                }
                const isTargetEligible = Boolean(selectedPlayer.phone && selectedPlayer.show_whatsapp !== false);
                if (!isTargetEligible) {
                    setShowTargetDisabledModal({
                        show: true,
                        playerName: `${selectedPlayer.name} ${selectedPlayer.lastname || ''}`.trim()
                    });
                    return;
                }
                setShowContactModal(true);
            }}
          />
      )}

      {showContactModal && selectedPlayer && (
          <ContactModal 
            toPlayer={selectedPlayer} 
            currentUser={user}
            onClose={() => setShowContactModal(false)} 
          />
      )}
    </div>
  );
};

const ArrowUpRightIcon = ({ className, size }: { className?: string, size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="7" y1="17" x2="17" y2="7"></line>
        <polyline points="7 7 17 7 17 17"></polyline>
    </svg>
);

// --- MODALS (Reused) ---
const PlayerProfileModal = ({ player, currentUser, onClose, onContact }: { player: UserProfile, currentUser: UserProfile, onClose: () => void, onContact: () => void }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    useEffect(() => {
        api.matches.getByUser(player.id)
            .then(data => setMatches(data || []))
            .catch(console.error)
            .finally(() => setLoadingMatches(false));
    }, [player.id]);
    const isMe = player.id === currentUser.id;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div id="player-profile-modal" className="bg-card border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"><X size={20} /></button>
                <div className="relative h-40 bg-gradient-to-r from-slate-800 to-slate-900">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                </div>
                <div className="px-8 pb-8 -mt-16 flex flex-col md:flex-row gap-6 items-end md:items-start relative z-10">
                    <div className="w-32 h-32 rounded-3xl bg-card border-4 border-card shadow-xl flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-slate-700 to-slate-600">
                        {player.name.charAt(0)}
                    </div>
                    <div className="flex-1 pt-16 md:pt-18 space-y-1">
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-3xl font-bold text-white">{player.name} {player.lastname}</h2>
                                <p className="text-muted flex items-center gap-2">
                                    <MapPin size={16} /> {player.institution || 'Jugador Libre'} 
                                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                    <span className="text-primary font-bold">Cat. {player.category || '-'}</span>
                                </p>
                             </div>
                             {!isMe && (
                                 !player.phone || player.show_whatsapp === false ? (
                                     <button 
                                         onClick={onContact} 
                                         className="hidden md:flex bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold items-center gap-2 transition-colors"
                                     >
                                         <Lock size={14} className="text-yellow-500/80" /> No habilitado (falta WhatsApp)
                                     </button>
                                 ) : (
                                     <button onClick={onContact} className="hidden md:flex bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-lg shadow-primary/20">
                                         <MessageCircle size={18} /> Desafiar
                                     </button>
                                 )
                             )}
                        </div>
                    </div>
                </div>
                <div className="px-8 pb-8 overflow-y-auto space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                            <Trophy className="mx-auto text-yellow-400 mb-2" size={24} />
                            <div className="text-2xl font-bold text-white">{player.matches_won || 0}</div>
                            <div className="text-[10px] text-muted uppercase font-bold">Victorias</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                            <Activity className="mx-auto text-blue-400 mb-2" size={24} />
                            <div className="text-2xl font-bold text-white">{matches.length}</div>
                            <div className="text-[10px] text-muted uppercase font-bold">Partidos</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                            <Calendar className="mx-auto text-green-400 mb-2" size={24} />
                            <div className="text-2xl font-bold text-white">{new Date().getFullYear()}</div>
                            <div className="text-[10px] text-muted uppercase font-bold">Miembro</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContactModal = ({ toPlayer, currentUser, onClose }: { toPlayer: UserProfile, currentUser: UserProfile, onClose: () => void }) => {
    const [message, setMessage] = useState(`¡Hola ${toPlayer.name}! Te encontré en Smash Tennis (${toPlayer.institution || 'Comunidad'}) y vi que jugamos en la misma categoría. ¿Te gustaría armar un partido este fin de semana? 🎾`);
    const [sending, setSending] = useState(false);
    const { addToast } = useToast();

    const templates = [
        { label: "🎾 Desafío Single", text: `¡Hola ${toPlayer.name}! Te desafío a un partido de single amistoso. ¿Qué día y horario te queda cómodo?` },
        { label: "⚡ Peloteo / Práctica", text: `¡Hola ${toPlayer.name}! ¿Te prendes a un peloteo de práctica y ritmo esta semana en ${toPlayer.institution || 'el club'}?` },
        { label: "👥 Sumar a Dobles", text: `¡Hola ${toPlayer.name}! Estamos armando un dobles y buscamos un jugador de tu nivel. ¿Te gustaría sumarte?` },
    ];

    const cleanPhone = toPlayer.phone ? toPlayer.phone.replace(/[^0-9]/g, '') : '';
    const isWhatsAppAllowed = toPlayer.show_whatsapp !== false;
    const hasPhone = isWhatsAppAllowed && cleanPhone.length >= 8;
    // Format Argentina phone if starts with 0 or 15 or lacks country code
    const formattedPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone.replace(/^0+/, '').replace(/^15/, '')}`;
    const whatsappUrl = hasPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : null;

    const handleSendAppMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.messages.send({
                sender_id: currentUser.id,
                receiver_id: toPlayer.id,
                content: message,
                type: 'direct'
            });
            addToast(`¡Desafío enviado a ${toPlayer.name}!`, 'success');
            onClose();
        } catch (err: any) {
            addToast(`Error al enviar mensaje: ${err.message}`, 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {toPlayer.name[0]}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white leading-none">Desafiar a {toPlayer.name} {toPlayer.lastname || ''}</h3>
                            <p className="text-xs text-muted mt-1">{toPlayer.institution || 'Sin club'} • Cat. {toPlayer.category || 'Open'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Quick templates */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] text-muted uppercase font-bold tracking-wider">Plantillas Rápidas</label>
                        <div className="flex flex-wrap gap-1.5">
                            {templates.map((tpl, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setMessage(tpl.text)}
                                    className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] text-muted uppercase font-bold tracking-wider">Mensaje del Desafío</label>
                        <textarea 
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-primary transition-colors min-h-[100px]" 
                            value={message} 
                            onChange={e => setMessage(e.target.value)}
                        />
                    </div>

                    {hasPhone ? (
                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                                    <Smartphone size={14} /> WhatsApp Disponible
                                </span>
                                <p className="text-[11px] text-muted">Abre un chat directo con el jugador en WhatsApp con este mensaje.</p>
                            </div>
                            <a
                                href={whatsappUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                    addToast("Abriendo WhatsApp...", "info");
                                    setTimeout(onClose, 500);
                                }}
                                className="px-3.5 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-green-600/20 transition-all shrink-0"
                            >
                                <MessageCircle size={14} /> Desafiar por WhatsApp
                            </a>
                        </div>
                    ) : !isWhatsAppAllowed ? (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] text-slate-400">
                            🔒 Este jugador ha configurado su WhatsApp como privado. Puedes comunicarte directamente enviando un mensaje interno.
                        </div>
                    ) : (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] text-slate-400">
                            ℹ️ Este jugador no tiene teléfono registrado, pero recibirá tu notificación en su buzón interno de Smash Tennis.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs text-muted hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSendAppMessage} 
                        disabled={sending || !message.trim()}
                        className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                    >
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar Mensaje en la App
                    </button>
                </div>
            </div>
        </div>
    );
};
