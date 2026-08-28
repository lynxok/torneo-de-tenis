import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, Institution, TournamentSaga } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Trophy, Calendar, MapPin, DollarSign, ChevronRight, Plus, AlertTriangle, X, Filter, Share2, MessageCircle, Sparkles, Trash2, Loader2, Edit2, Layers, Gift, Award, Zap, Map as MapIcon, List } from 'lucide-react';
import { getCategoryRank, getCategoriesForInstitution, ALL_CATEGORIES } from '../utils/categories';
import { getTournamentTier, TIER_META, TIER_ORDER, getEffectiveTournamentTier, DEFAULT_TIER_CONFIG, getTierInfoByKey } from '../utils/tournamentTiers';
import { TournamentsMap } from '../components/TournamentsMap';

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

export const canEditTournament = (t: Tournament, u?: UserProfile): boolean => {
    if (!u || !t) return false;
    if (u.role === 'superadmin') return true;
    if (t.created_by && t.created_by === u.id) return true;
    if ((u.role === 'admin' || u.role === 'professor' || u.role === 'coordinator') && u.institution_id && t.institution_id === u.institution_id) return true;
    return false;
};

export const Tournaments: React.FC<TournamentsProps> = ({ user, onNavigate, initialState }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [warningTournament, setWarningTournament] = useState<Tournament | null>(null);
    const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false); // For admins
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Tournament>>({
        name: '',
        start_date: '',
        type: 'singles',
        gender: 'Caballeros',
        category: '4ta',
        registration_price: 0,
        registration_closed: false,
        status: 'draft'
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

    // Sagas & Tier State
    const [sagas, setSagas] = useState<TournamentSaga[]>([]);
    const [selectedSagaId, setSelectedSagaId] = useState<string>('');
    const [selectedTierKey, setSelectedTierKey] = useState<'challenger' | '250' | '500' | '1000' | 'masters'>('challenger');
    const [systemConfig, setSystemConfig] = useState<any>(DEFAULT_TIER_CONFIG);

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
            api.sagas.getByInstitution(user.institution_id).then(setSagas).catch(() => {});
        }
        api.settings.getConfig().then(cfg => setSystemConfig({ ...DEFAULT_TIER_CONFIG, ...cfg })).catch(() => {});
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

    // When a saga is selected in create modal, auto-suggest name and evaluate tier
    const handleSelectSaga = (sagaId: string) => {
        setSelectedSagaId(sagaId);
        if (!sagaId) {
            setSelectedTierKey('challenger');
            return;
        }
        const found = sagas.find(s => s.id === sagaId);
        if (found) {
            const nextEdition = (found.total_editions || 0) + 1;
            setNewTournament(prev => ({
                ...prev,
                name: prev.name && !prev.name.includes('Edición') ? prev.name : `${found.name} - Edición ${nextEdition}`
            }));
            setSelectedTierKey(found.current_tier || 'challenger');
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
        const userRank = getCategoryRank(user.category || '');

        const hasCompetitions = t.competitions && t.competitions.length > 0;

        if (hasCompetitions) {
            const matchingComps = t.competitions!.filter(comp => {
                if (comp.gender !== 'X' && user.gender) {
                    const matchGender = (comp.gender === 'M' && (user.gender.toLowerCase() === 'masculino' || user.gender.toLowerCase() === 'm')) ||
                                        (comp.gender === 'F' && (user.gender.toLowerCase() === 'femenino' || user.gender.toLowerCase() === 'f'));
                    if (!matchGender) return false;
                }
                return true;
            });

            if (matchingComps.length === 0) {
                setWarningTournament(t);
                return;
            }

            const canPlayAny = matchingComps.some(comp => {
                return comp.allowed_categories.some(cat => {
                    const catRank = getCategoryRank(cat);
                    return userRank >= catRank;
                });
            });

            if (!canPlayAny) {
                setWarningTournament(t);
                return;
            }
        } else {
            const tournamentRank = getCategoryRank(t.category);
            isCategoryCompatible = userRank >= tournamentRank;
            isHigherCategory = userRank < tournamentRank;

            if (isHigherCategory) {
                setWarningTournament(t);
                return;
            }
        }

        onNavigate && onNavigate('tournament-detail', t.id);
    };

    // Admin create function with Saga & Tier evaluation
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

            const selectedSaga = sagas.find(s => s.id === selectedSagaId);
            const tierCalc = getEffectiveTournamentTier(
                12,
                selectedTierKey,
                selectedSaga,
                tournaments,
                systemConfig,
                user
            );

            await api.tournaments.create({ 
                ...newTournament, 
                institution_id: targetInstitutionId,
                created_by: user.id,
                saga_id: selectedSagaId || null,
                edition_number: selectedSaga ? (selectedSaga.total_editions || 0) + 1 : 1,
                tier_applied: selectedTierKey,
                is_direct_jump: tierCalc.isDirectJump,
                commission_rate_applied: tierCalc.effectiveFeePct,
                is_trial_free: tierCalc.isTrialFree,
                is_disputed: false
            });

            addToast("Torneo creado exitosamente", 'success');
            setShowCreateModal(false);
            setSelectedSagaId('');
            setSelectedTierKey('challenger');
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

    const handleOpenEdit = (t: Tournament, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTournament(t);
        setEditFormData({
            name: t.name || '',
            start_date: t.start_date ? t.start_date.split('T')[0] : '',
            type: t.type || 'singles',
            gender: t.gender || 'Caballeros',
            category: t.category || '4ta',
            registration_price: t.registration_price || 0,
            registration_closed: !!t.registration_closed,
            status: t.status || 'draft'
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTournament) return;
        if (!editFormData.start_date) {
            addToast("Por favor selecciona una fecha de inicio", 'error');
            return;
        }

        setIsUpdating(true);
        try {
            const updates: Partial<Tournament> = {
                name: editFormData.name?.trim(),
                start_date: editFormData.start_date,
                type: editFormData.type,
                gender: editFormData.gender,
                category: editFormData.category,
                registration_price: Number(editFormData.registration_price) || 0,
                registration_closed: editFormData.registration_closed,
                status: editFormData.status
            };

            await api.tournaments.update(editingTournament.id, updates);
            addToast("¡Torneo y fecha de inicio actualizados exitosamente!", 'success');
            setEditingTournament(null);
            await loadTournaments();
        } catch (err: any) {
            console.error("Error al actualizar torneo:", err);
            addToast(err?.message ? `Error al actualizar torneo: ${err.message}` : "Error al actualizar torneo", 'error');
        } finally {
            setIsUpdating(false);
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
    const [viewMode, setViewMode] = useState<'list' | 'map'>(() => 
        (initialState?.view === 'map' || initialState === 'map') ? 'map' : 'list'
    );

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                        <Trophy className="text-primary" size={26} />
                        Torneos
                    </h2>
                    <p className="text-muted text-sm">Calendario y mapa interactivo de competencias oficiales.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* View Switcher: List vs Map */}
                    <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'list'
                                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <List size={15} />
                            <span>Lista</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'map'
                                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <MapIcon size={15} />
                            <span>Mapa</span>
                        </button>
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
            </div>

            {viewMode === 'map' ? (
                <TournamentsMap
                    tournaments={tournaments}
                    user={user}
                    onSelectTournament={handleTournamentClick}
                    onCloseMap={() => setViewMode('list')}
                />
            ) : (
                <>
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
                                                            {canEditTournament(t, user) && (
                                                                <button
                                                                    onClick={(e) => handleOpenEdit(t, e)}
                                                                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 transition-colors"
                                                                    title="Editar fecha de inicio y datos del torneo"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
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
                                                        const tierMeta = t.tier_applied ? (TIER_META[t.tier_applied] || TIER_META.challenger) : null;
                                                        const tier = t.tier_applied ? getTierInfoByKey(t.tier_applied, systemConfig) : getTournamentTier(t.players?.length || 12);
                                                        const badgeColor = tierMeta ? tierMeta.badgeColor : tier.badgeColor;
                                                        const textColor = tierMeta ? tierMeta.textColor : tier.textColor;
                                                        const borderColor = tierMeta ? tierMeta.borderColor : tier.borderColor;
                                                        const label = tierMeta ? tierMeta.label : tier.label;

                                                        return (
                                                            <div className="flex justify-between items-center pb-1">
                                                                <span className="text-muted text-xs">Circuito</span>
                                                                {countsForRanking ? (
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badgeColor} ${textColor} ${borderColor}`}>
                                                                        {label} • {tier.pointsWinner} pts
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
            </>
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

                            {/* Saga Selector */}
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Layers size={14} className="text-primary" /> Saga / Serie del Torneo</span>
                                    <span className="text-[10px] text-primary font-normal">Opcional para ascender de nivel</span>
                                </label>
                                <select
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary text-sm"
                                    value={selectedSagaId}
                                    onChange={e => handleSelectSaga(e.target.value)}
                                >
                                    <option value="">-- Torneo Independiente (Sin Saga) --</option>
                                    {sagas.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} (Edición {(s.total_editions || 0) + 1} • Nivel: {TIER_META[s.current_tier]?.shortLabel || 'Challenger'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tier / Categoria ATP Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Trophy size={14} className="text-amber-400" /> Categoría ATP del Torneo</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                    {TIER_ORDER.map(tKey => {
                                        const meta = TIER_META[tKey];
                                        const isSelected = selectedTierKey === tKey;
                                        return (
                                            <button
                                                key={tKey}
                                                type="button"
                                                onClick={() => setSelectedTierKey(tKey)}
                                                className={`p-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                                                    isSelected 
                                                        ? `${meta.badgeColor} ${meta.borderColor} ${meta.textColor} ring-2 ring-primary/40 scale-[1.02]`
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <span className="text-base">{meta.icon}</span>
                                                <span className="text-[10px] leading-tight">{meta.shortLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Commission & Free Trial Status Banner */}
                            {(() => {
                                const selectedSaga = sagas.find(s => s.id === selectedSagaId);
                                const activeInst = user.role === 'superadmin' && newTournament.institution_id
                                    ? institutions.find(i => i.id === newTournament.institution_id)
                                    : currentInstitution;

                                const tierCalc = getEffectiveTournamentTier(
                                    12,
                                    selectedTierKey,
                                    selectedSaga,
                                    tournaments,
                                    systemConfig,
                                    user,
                                    activeInst
                                );

                                const trialRemaining = Math.max(
                                    user.free_tournaments_remaining || 0,
                                    activeInst?.free_tournaments_remaining || 0
                                );

                                return (
                                    <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                                        tierCalc.isTrialFree
                                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                                            : tierCalc.isVipWaived
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                                : tierCalc.isDirectJump
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                                    : 'bg-green-500/10 border-green-500/30 text-green-200'
                                    }`}>
                                        {tierCalc.isTrialFree && <Gift size={18} className="text-cyan-400 shrink-0" />}
                                        {tierCalc.isVipWaived && <Sparkles size={18} className="text-emerald-400 shrink-0" />}
                                        {!tierCalc.isTrialFree && !tierCalc.isVipWaived && tierCalc.isDirectJump && <Zap size={18} className="text-amber-400 shrink-0" />}
                                        {!tierCalc.isTrialFree && !tierCalc.isVipWaived && !tierCalc.isDirectJump && <Award size={18} className="text-green-400 shrink-0" />}

                                        <div className="flex-1 leading-tight">
                                            <div className="font-bold text-[11px] uppercase tracking-wider">
                                                {tierCalc.isTrialFree 
                                                    ? `🎉 Torneo de Bienvenida Bonificado (0% Comisión • Te quedan ${trialRemaining} ${trialRemaining === 1 ? 'cupo' : 'cupos'})`
                                                    : tierCalc.isVipWaived 
                                                        ? '👑 Membresía VIP Bonificada (0% Comisión)'
                                                        : tierCalc.isDirectJump 
                                                            ? `⚡ Salto Directo a ${tierCalc.tierInfo.label} (${tierCalc.effectiveFeePct}% Comisión)`
                                                            : `✓ Tarifa Bonificada por Mérito / Saga (${tierCalc.effectiveFeePct}% Comisión)`
                                                }
                                            </div>
                                            <div className="text-[10px] text-slate-300 mt-0.5">
                                                {tierCalc.tierInfo.pointsWinner} puntos al campeón • Convocatoria: {tierCalc.tierInfo.minPlayers}{tierCalc.tierInfo.maxPlayers ? `-${tierCalc.tierInfo.maxPlayers}` : '+'} jugadores
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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

            {/* Edit Tournament Modal */}
            {editingTournament && (
                <div id="edit-tournament-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Editar Torneo y Fechas</h3>
                                    <p className="text-xs text-muted">{editingTournament.institutions?.name || 'Torneo propio'}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingTournament(null)} className="text-muted hover:text-white p-1"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Nombre del Torneo</label>
                                <input 
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                    value={editFormData.name || ''} 
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} 
                                    required 
                                />
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
                                <label className="text-xs text-amber-300 uppercase font-bold flex items-center gap-1.5">
                                    <Calendar size={14} /> Fecha de Inicio Oficial *
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-amber-400" 
                                    value={editFormData.start_date || ''} 
                                    onChange={e => setEditFormData({ ...editFormData, start_date: e.target.value })} 
                                    required 
                                />
                                <p className="text-[11px] text-amber-200/70">Esta fecha define el inicio del cuadro y la agrupación en el calendario general.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Modalidad</label>
                                    <select 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={editFormData.type || 'singles'} 
                                        onChange={e => setEditFormData({ ...editFormData, type: e.target.value as any })}
                                    >
                                        <option value="singles">Singles</option>
                                        <option value="doubles">Dobles</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Rama</label>
                                    <select 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={editFormData.gender || 'Caballeros'} 
                                        onChange={e => setEditFormData({ ...editFormData, gender: e.target.value as any })}
                                    >
                                        <option value="Caballeros">Caballeros</option>
                                        <option value="Damas">Damas</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría</label>
                                    <select 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={editFormData.category || '4ta'} 
                                        onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                                    >
                                        {getCategoriesForInstitution(
                                            user.role === 'superadmin' && editingTournament.institution_id 
                                                ? institutions.find(i => i.id === editingTournament.institution_id) 
                                                : currentInstitution
                                        ).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Precio Inscripción ($)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={editFormData.registration_price ?? 0} 
                                        onChange={e => setEditFormData({ ...editFormData, registration_price: parseFloat(e.target.value) || 0 })} 
                                        required 
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Inscripción</label>
                                    <select 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                                        value={editFormData.registration_closed ? 'closed' : 'open'} 
                                        onChange={e => setEditFormData({ ...editFormData, registration_closed: e.target.value === 'closed' })}
                                    >
                                        <option value="open">🟢 Abierta</option>
                                        <option value="closed">🔴 Cerrada</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingTournament(null)} 
                                    disabled={isUpdating}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isUpdating}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                                >
                                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                    {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};