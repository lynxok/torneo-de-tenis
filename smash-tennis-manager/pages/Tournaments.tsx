import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Trophy, Calendar, MapPin, DollarSign, ChevronRight, Plus, AlertTriangle, X, Filter, Share2, MessageCircle, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { getCategoryRank, getCategoriesForInstitution, ALL_CATEGORIES } from '../utils/categories';
import { getTournamentTier } from '../utils/tournamentTiers';

interface TournamentsProps {
    user: UserProfile;
    onNavigate?: (view: string, data?: any) => void;
    initialState?: any; // To handle potential params passed
}

export const canDeleteTournament = (t: Tournament, u: UserProfile): boolean => {
    if (u.role === 'superadmin') return true;
    if (t.created_by && t.created_by === u.id) return true;
    if (u.role === 'admin' && u.institution_id && t.institution_id === u.institution_id) return true;
    return false;
};

export const Tournaments: React.FC<TournamentsProps> = ({ user, onNavigate }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [warningTournament, setWarningTournament] = useState<Tournament | null>(null);
    const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false); // For admins
    const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

    // Create Modal State
    const [newTournament, setNewTournament] = useState<Partial<Tournament>>({
        name: '',
        type: 'singles',
        gender: 'Caballeros',
        category: '4ta',
        start_date: '',
        registration_price: 0,
        status: 'draft'
    });

    const { addToast } = useToast();

    useEffect(() => {
        loadTournaments();
        if (user.institution_id) {
            api.institutions.getById(user.institution_id).then(inst => {
                if (inst) setCurrentInstitution(inst);
            }).catch(() => {});
        }
    }, [user.institution_id]);

    const loadTournaments = async () => {
        setLoading(true);
        try {
            const data = await api.tournaments.getAll();
            setTournaments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleTournamentClick = (t: Tournament) => {
        // Admins and Professors can enter any tournament detail view without category warnings
        if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'professor') {
            onNavigate && onNavigate('tournament-detail', t.id);
            return;
        }

        // Updated Logic for Multi-Competition
        let isCategoryCompatible = false;
        let isHigherCategory = false;

        if (t.competitions && t.competitions.length > 0) {
            // Check against all sub-competitions
            const userRank = getCategoryRank(user.category || '');

            for (const comp of t.competitions) {
                // Find the lowest rank in this competition (e.g. if 1ra+2da, rank is 2 (2da))
                const compRanks = comp.allowed_categories.map(getCategoryRank);
                const minRank = Math.min(...compRanks); // Best category (lowest number)
                const maxRank = Math.max(...compRanks); // Worst category (highest number)

                if (userRank <= maxRank) isCategoryCompatible = true; // User is equal or better than the worst in group
                if (userRank > minRank) isHigherCategory = true; // User is worse than the best in group (Challenger)
            }
        } else {
            // Legacy Check
            const userRank = getCategoryRank(user.category || '');
            const tourneyRank = getCategoryRank(t.category);

            if (user.category === t.category) isCategoryCompatible = true;
            if (t.category === 'Open') isCategoryCompatible = true;

            // Simple logic for demo:
            if (userRank === tourneyRank) isCategoryCompatible = true;
            if (userRank > tourneyRank) isHigherCategory = true;
        }

        // Simplified navigation for now
        onNavigate && onNavigate('tournament-detail', t.id);
    };

    // Admin create function
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Use selected institution for superadmin, or fallback to user's institution
            const targetInstitutionId = (user.role === 'superadmin' && newTournament.institution_id)
                ? newTournament.institution_id
                : user.institution_id;

            if (!targetInstitutionId) {
                addToast("Error: Institución no definida", 'error');
                return;
            }

            await api.tournaments.create({ 
                ...newTournament, 
                institution_id: targetInstitutionId,
                created_by: user.id
            });
            addToast("Torneo creado exitosamente", 'success');
            setShowCreateModal(false);
            loadTournaments();
        } catch (e: any) {
            console.error("Error al crear torneo:", e);
            addToast(e?.message ? `Error al crear torneo: ${e.message}` : "Error al crear torneo", 'error');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingTournament) return;
        setIsDeleting(true);
        try {
            await api.tournaments.delete(deletingTournament.id);
            addToast(`Torneo "${deletingTournament.name}" eliminado correctamente`, 'success');
            setDeletingTournament(null);
            await loadTournaments();
        } catch (err: any) {
            console.error("Error al eliminar torneo:", err);
            addToast(err?.message ? `Error al eliminar torneo: ${err.message}` : "Error al eliminar torneo", 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const [institutions, setInstitutions] = useState<any[]>([]);
    useEffect(() => {
        if (user.role === 'superadmin') {
            api.institutions.getAll().then(setInstitutions);
        }
    }, [user.role]);

    // Group tournaments by start month
    const groupedTournaments = React.useMemo(() => {
        const groups: { [key: string]: { monthLabel: string; sortKey: string; items: Tournament[] } } = {};
        
        // Sort tournaments by start_date ascending
        const sorted = [...tournaments].sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
            const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
            return dateA - dateB;
        });

        sorted.forEach(t => {
            if (!t.start_date) {
                const key = 'sin-fecha';
                if (!groups[key]) {
                    groups[key] = { monthLabel: 'Fechas a Confirmar', sortKey: '9999-99', items: [] };
                }
                groups[key].items.push(t);
                return;
            }

            const d = new Date(t.start_date + 'T00:00:00');
            const year = d.getFullYear();
            const month = d.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            if (!groups[key]) {
                const monthName = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                // Capitalize first letter
                const formattedName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                groups[key] = { monthLabel: formattedName, sortKey: key, items: [] };
            }
            groups[key].items.push(t);
        });

        return Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [tournaments]);

    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Torneos</h2>
                    <p className="text-muted text-sm">Calendario de competencias oficiales y amistosas.</p>
                </div>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                    <button
                        id="btn-new-tournament"
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Nuevo Torneo
                    </button>
                )}
            </div>

            {/* Month Quick Filter Tabs */}
            {groupedTournaments.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    <button
                        onClick={() => setSelectedMonthFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            selectedMonthFilter === 'all'
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-card border-white/10 text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Todos los Meses ({tournaments.length})
                    </button>
                    {groupedTournaments.map(g => (
                        <button
                            key={g.sortKey}
                            onClick={() => setSelectedMonthFilter(g.sortKey)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                selectedMonthFilter === g.sortKey
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-card border-white/10 text-muted hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {g.monthLabel} ({g.items.length})
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-muted">Cargando calendario de torneos...</div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-muted">
                    No hay torneos programados por el momento.
                </div>
            ) : (
                <div className="space-y-10">
                    {groupedTournaments
                        .filter(g => selectedMonthFilter === 'all' || selectedMonthFilter === g.sortKey)
                        .map(group => (
                            <div key={group.sortKey} className="space-y-4">
                                <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        <Calendar size={16} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white tracking-wide">
                                        {group.monthLabel}
                                    </h3>
                                    <span className="text-xs bg-white/5 text-muted px-2.5 py-0.5 rounded-full font-medium">
                                        {group.items.length} {group.items.length === 1 ? 'torneo' : 'torneos'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {group.items.map(t => {
                                        const isRegClosed = t.registration_closed || t.status === 'finished';
                                        const hasCompetitions = t.competitions && t.competitions.length > 0;

                                        return (
                                            <Card key={t.id} onClick={() => handleTournamentClick(t)} className="group cursor-pointer hover:border-primary/50 transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg ${t.status === 'active' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-muted'}`}>
                                                            <Trophy size={24} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                            {/* Doubles / Singles Badge */}
                                                            {t.type === 'doubles' ? (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                                                    👥 Dobles
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                                                    👤 Singles
                                                                </span>
                                                            )}

                                                            {/* Registration Status Badge */}
                                                            {isRegClosed ? (
                                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                                                    🔴 Inscripción Cerrada
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                                    🟢 Inscripción Abierta
                                                                </span>
                                                            )}

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const shareUrl = `${window.location.origin}/?tournament=${t.id}`;
                                                                    navigator.clipboard.writeText(shareUrl);
                                                                    addToast('¡Link del torneo copiado!', 'success');
                                                                }}
                                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-primary transition-colors border border-white/10"
                                                                title="Copiar link directo del torneo"
                                                            >
                                                                <Share2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const shareUrl = `${window.location.origin}/?tournament=${t.id}`;
                                                                    const message = encodeURIComponent(`🎾 ¡Te invito a participar o seguir el torneo "${t.name}" en ${t.institutions?.name || 'nuestro club'}! Mirá el cuadro y detalles aquí: ${shareUrl}`);
                                                                    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                                                                }}
                                                                className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors"
                                                                title="Compartir torneo por WhatsApp"
                                                            >
                                                                <MessageCircle size={14} />
                                                            </button>
                                                            {canDeleteTournament(t, user) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeletingTournament(t);
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-colors"
                                                                    title="Eliminar torneo de forma permanente"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
                                                    <div className="text-sm text-muted mb-4 flex items-center gap-2">
                                                        <MapPin size={14} /> {t.institutions?.name}
                                                    </div>

                                                    {/* Categorías o Sub-competencias */}
                                                    <div className="mb-4">
                                                        {hasCompetitions ? (
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Cuadros en juego:</span>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {t.competitions!.map((comp, cIdx) => (
                                                                        <span key={cIdx} className="bg-white/5 border border-white/10 text-slate-200 text-xs px-2 py-0.5 rounded-md font-semibold">
                                                                            {comp.name || comp.allowed_categories.join(' + ')}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted uppercase font-bold">Categoría:</span>
                                                                <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-md font-bold">
                                                                    {t.category}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm border-t border-white/5 pt-3 mt-auto">
                                                    {(() => {
                                                        const countsForRanking = t.counts_for_ranking !== false && (!t.rules || t.rules.counts_for_ranking !== false);
                                                        const tier = getTournamentTier(t.players?.length || 12);
                                                        return (
                                                            <div className="flex justify-between items-center pb-1">
                                                                <span className="text-muted text-xs">Circuito</span>
                                                                {countsForRanking ? (
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${tier.badgeColor} ${tier.textColor} ${tier.borderColor}`}>
                                                                        {tier.label} • {tier.pointsWinner} pts
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-white/10" title="Este torneo no suma puntos para el ranking global oficial">
                                                                        🎾 Amistoso • Sin Puntos
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="flex justify-between">
                                                        <span className="text-muted">Fecha Inicio</span>
                                                        <span className="font-bold text-white">{new Date(t.start_date + 'T00:00:00').toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted">Inscripción</span>
                                                        <span className="font-bold text-primary">${t.registration_price}</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Warning Modal */}
            {warningTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-yellow-500 mb-4">
                            <AlertTriangle size={32} />
                            <h3 className="text-xl font-bold text-white">Advertencia de Nivel</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            Estás intentando ingresar a un torneo de categoría <strong>{warningTournament.category}</strong>,
                            pero tu categoría actual es <strong>{user.category}</strong>.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setWarningTournament(null)} className="px-4 py-2 text-white">Cancelar</button>
                            <button
                                onClick={() => {
                                    onNavigate && onNavigate('tournament-detail', warningTournament.id);
                                    setWarningTournament(null);
                                }}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold"
                            >
                                Continuar de todos modos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div id="new-tournament-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white">Nuevo Torneo</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">

                            {/* Superadmin: Select Institution */}
                            {user.role === 'superadmin' && (
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Institución</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                                        value={newTournament.institution_id || ''}
                                        onChange={e => setNewTournament({ ...newTournament, institution_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecciona un Club...</option>
                                        {institutions.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Nombre del Torneo</label>
                                <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.name} onChange={e => setNewTournament({ ...newTournament, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Modalidad</label>
                                    <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.type} onChange={e => setNewTournament({ ...newTournament, type: e.target.value as any })}>
                                        <option value="singles">Singles</option>
                                        <option value="doubles">Dobles</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Cuadro / Rama</label>
                                    <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.gender || 'Caballeros'} onChange={e => setNewTournament({ ...newTournament, gender: e.target.value as any })}>
                                        <option value="Caballeros">Caballeros</option>
                                        <option value="Damas">Damas</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría</label>
                                    <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.category} onChange={e => setNewTournament({ ...newTournament, category: e.target.value })}>
                                        {getCategoriesForInstitution(
                                            user.role === 'superadmin' && newTournament.institution_id 
                                                ? institutions.find(i => i.id === newTournament.institution_id) 
                                                : currentInstitution
                                        ).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Fecha Inicio</label>
                                    <input type="date" className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.start_date} onChange={e => setNewTournament({ ...newTournament, start_date: e.target.value })} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Precio Inscripción</label>
                                    <input type="number" className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" value={newTournament.registration_price} onChange={e => setNewTournament({ ...newTournament, registration_price: parseInt(e.target.value) })} required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-lg mt-4">Crear Torneo</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Tournament Confirmation Modal */}
            {deletingTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">¿Eliminar Torneo?</h3>
                                <p className="text-xs text-muted">{deletingTournament.institutions?.name || 'Sede del torneo'}</p>
                            </div>
                        </div>
                        
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Estás por eliminar permanentemente el torneo <strong className="text-white font-bold">"{deletingTournament.name}"</strong>.
                        </p>

                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-red-400">
                                <AlertTriangle size={14} /> Esta acción es irreversible:
                            </div>
                            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 ml-1">
                                <li>Se borrarán todos los jugadores inscriptos y parejas.</li>
                                <li>Se eliminarán los partidos, zonas, marcadores y llaves.</li>
                                <li>Se desvincularán los turnos o reservas asociadas.</li>
                            </ul>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setDeletingTournament(null)}
                                disabled={isDeleting}
                                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Torneo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};