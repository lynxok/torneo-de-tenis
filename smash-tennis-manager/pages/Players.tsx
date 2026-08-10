
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, Match, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Search, MapPin, Award, UserPlus, X, Activity, Trophy, Calendar, MessageCircle, Send, Clock, CheckCircle2, LayoutList, LayoutGrid, ChevronRight, MoreHorizontal, Building, Sparkles, Zap } from 'lucide-react';

interface PlayersProps {
    user: UserProfile;
}

export const Players: React.FC<PlayersProps> = ({ user }) => {
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); 
  
  // Modals
  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

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
      if (!user || players.length === 0) return [];

      return players
        .filter(p => p.id !== user.id && p.role !== 'admin' && p.role !== 'superadmin') // Exclude self and admins
        .map(p => {
            let score = 0;
            let reasons = [];

            if (user.institution_id && p.institution_id === user.institution_id) {
                score += 50;
                reasons.push('Mismo Club');
            }

            if (user.category && p.category === user.category) {
                score += 30;
                reasons.push('Misma Categoría');
            } else if (user.category && p.category) {
                const cats = ['1ra', '2da', '3ra', '4ta', '5ta'];
                const uIdx = cats.indexOf(user.category);
                const pIdx = cats.indexOf(p.category);
                if (uIdx !== -1 && pIdx !== -1 && Math.abs(uIdx - pIdx) === 1) {
                    score += 10; // Close category
                }
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


  const filteredPlayers = players.filter(p => {
    const matchesName = p.name.toLowerCase().includes(filter.toLowerCase()) || 
                        (p.lastname && p.lastname.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    
    const matchesInstitution = institutionFilter 
        ? (p.institution_id === institutionFilter) 
        : true;

    return matchesName && matchesCategory && matchesInstitution;
  });

  const handleOpenProfile = (player: UserProfile) => {
    setSelectedPlayer(player);
  };

  const handleContact = (e: React.MouseEvent, player: UserProfile) => {
    e.stopPropagation();
    if (selectedPlayer?.id !== player.id) setSelectedPlayer(player);
    setShowContactModal(true);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      
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
                    <option value="1ra">1ra Categoría</option>
                    <option value="2da">2da Categoría</option>
                    <option value="3ra">3ra Categoría</option>
                    <option value="4ta">4ta Categoría</option>
                    <option value="5ta">5ta Categoría</option>
                    <option value="Open">Open</option>
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
                                                        <button 
                                                            onClick={(e) => handleContact(e, player)}
                                                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                                                            title="Desafiar / Contactar"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
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
                        {filteredPlayers.map(player => (
                            <Card 
                                key={player.id} 
                                className="flex flex-col gap-4 hover:border-primary/50 group cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden"
                                onClick={() => handleOpenProfile(player)}
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowUpRightIcon className="text-muted group-hover:text-primary" size={16} />
                                </div>
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
                                    <button 
                                        onClick={(e) => handleContact(e, player)}
                                        className="mt-2 w-full py-2 rounded-lg bg-white/5 hover:bg-primary hover:text-white text-muted text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={14} /> Contactar
                                    </button>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {selectedPlayer && (
          <PlayerProfileModal 
            player={selectedPlayer} 
            currentUser={user}
            onClose={() => setSelectedPlayer(null)} 
            onContact={() => setShowContactModal(true)}
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
                                 <button onClick={onContact} className="hidden md:flex bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold items-center gap-2 transition-all shadow-lg shadow-primary/20">
                                    <MessageCircle size={18} /> Desafiar
                                 </button>
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
    const [message, setMessage] = useState(`Hola ${toPlayer.name}, te desafío a un partido.`);
    const handleSend = (e: React.FormEvent) => { e.preventDefault(); alert("Desafío enviado"); onClose(); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Desafiar a {toPlayer.name}</h3>
                <textarea className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white mb-4" value={message} onChange={e => setMessage(e.target.value)}></textarea>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-white">Cancelar</button>
                    <button onClick={handleSend} className="px-4 py-2 bg-primary text-white rounded-xl">Enviar</button>
                </div>
            </div>
        </div>
    );
};
