import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Trophy, Calendar, MapPin, DollarSign, ChevronRight, Plus, AlertTriangle, X, Filter, Share2, MessageCircle, Sparkles } from 'lucide-react';
import { getCategoryRank, getCategoriesForInstitution, ALL_CATEGORIES } from '../utils/categories';
import { getTournamentTier } from '../utils/tournamentTiers';

interface TournamentsProps {
    user: UserProfile;
    onNavigate?: (view: string, data?: any) => void;
    initialState?: any; // To handle potential params passed
}

export const Tournaments: React.FC<TournamentsProps> = ({ user, onNavigate }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [warningTournament, setWarningTournament] = useState<Tournament | null>(null);
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

            await api.tournaments.create({ ...newTournament, institution_id: targetInstitutionId });
            addToast("Torneo creado exitosamente", 'success');
            setShowCreateModal(false);
            loadTournaments();
        } catch (e: any) {
            console.error("Error al crear torneo:", e);
            addToast(e?.message ? `Error al crear torneo: ${e.message}` : "Error al crear torneo", 'error');
        }
    };

    const [institutions, setInstitutions] = useState<any[]>([]);
    useEffect(() => {
        if (user.role === 'superadmin') {
            api.institutions.getAll().then(setInstitutions);
        }
    }, [user.role]);

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Torneos</h2>
                    <p className="text-muted text-sm">Competencias disponibles.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <div className="col-span-full text-center text-muted">Cargando torneos...</div> :
                    tournaments.map(t => (
                        <Card key={t.id} onClick={() => handleTournamentClick(t)} className="group cursor-pointer hover:border-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg ${t.status === 'active' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-muted'}`}>
                                    <Trophy size={24} />
                                </div>
                                <div className="flex items-center gap-1.5">
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
                                    {Boolean(t.is_commission_waived || (typeof t.rules === 'object' && t.rules !== null && t.rules.is_commission_waived)) && (user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === t.institution_id)) && (
                                        <div 
                                            className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-help transition-transform hover:scale-105"
                                            title="El torneo ha sido bonificado por Smash Tenis"
                                        >
                                            Bonificado
                                        </div>
                                    )}
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.status === 'active' ? 'bg-green-500/20 text-green-400' : t.status === 'finished' ? 'bg-slate-700 text-slate-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {t.status === 'active' ? 'En Curso' : t.status === 'finished' ? 'Finalizado' : 'Borrador'}
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
                            <div className="text-sm text-muted mb-4 flex items-center gap-2">
                                <MapPin size={14} /> {t.institutions?.name}
                            </div>

                            <div className="space-y-2 text-sm border-t border-white/5 pt-3">
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
                                    <span className="text-muted">Categoría</span>
                                    <span className="font-bold text-white">{t.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Fecha Inicio</span>
                                    <span className="font-bold text-white">{new Date(t.start_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Inscripción</span>
                                    <span className="font-bold text-primary">${t.registration_price}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                }
            </div>

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
        </div>
    );
};