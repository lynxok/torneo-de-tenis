import React, { useState, useEffect } from 'react';
import { UserProfile, Institution, MatchmakingPost } from '../types';
import { api } from '../services/api';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';
import { 
    Users, Plus, MessageCircle, Calendar, Clock, MapPin, Sparkles, Filter, X, 
    CheckCircle2, Trash2, Shield, User, Building, Send, Swords, Award, AlertCircle, Loader2
} from 'lucide-react';
import { getCategoriesForInstitution, NUMERIC_CATEGORIES } from '../utils/categories';
import { formatPlayerName } from '../utils/formatters';

interface MatchmakingBoardProps {
    user: UserProfile;
    institutions: Institution[];
}

export const MatchmakingBoard: React.FC<MatchmakingBoardProps> = ({ user, institutions }) => {
    const [posts, setPosts] = useState<MatchmakingPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterInst, setFilterInst] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterType, setFilterType] = useState<'all' | 'singles' | 'doubles'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Create Form State
    const [postType, setPostType] = useState<'singles' | 'doubles'>('singles');
    const [postCategory, setPostCategory] = useState(user.category || '4ta');
    const [postInstId, setPostInstId] = useState(user.institution_id || (institutions[0]?.id || ''));
    const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
    const [postTimeSlot, setPostTimeSlot] = useState('18:00');
    const [hasCourtBooked, setHasCourtBooked] = useState(false);
    const [courtName, setCourtName] = useState('Cancha 1');
    const [postDescription, setPostDescription] = useState('');
    const [postPreferredSide, setPostPreferredSide] = useState<'drive' | 'backhand' | 'both'>('drive');
    const [postDominantHand, setPostDominantHand] = useState<'right' | 'left'>('right');
    const [postPlayStyle, setPostPlayStyle] = useState<'competitive' | 'recreational' | 'active'>('competitive');

    const { addToast } = useToast();

    useEffect(() => {
        loadPosts();
    }, [filterInst, filterCategory, filterType]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await api.matchmaking.getPosts(
                filterInst === 'all' ? undefined : filterInst,
                filterCategory === 'all' ? undefined : filterCategory,
                filterType === 'all' ? undefined : filterType
            );
            setPosts(data);
        } catch (e) {
            console.error("Error loading matchmaking posts:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const instObj = institutions.find(i => i.id === postInstId);
            await api.matchmaking.createPost({
                user_id: user.id,
                user_name: user.name,
                user_lastname: user.lastname,
                user_phone: user.phone,
                user_avatar: user.profile_picture_url || (user as any).avatar_url,
                user_category: user.category || '4ta',
                type: postType,
                category: postCategory,
                institution_id: postInstId,
                institution_name: instObj?.name || 'Club de Tenis',
                date: postDate,
                time_slot: postTimeSlot,
                has_court_booked: hasCourtBooked,
                court_name: hasCourtBooked ? courtName : undefined,
                description: postDescription,
                preferred_side: postType === 'doubles' ? postPreferredSide : undefined,
                dominant_hand: postType === 'doubles' ? postDominantHand : undefined,
                play_style: postType === 'doubles' ? postPlayStyle : undefined
            });

            addToast("¡Aviso publicado con éxito en el tablón!", "success");
            setShowCreateModal(false);
            setPostDescription('');
            loadPosts();
        } catch (e: any) {
            addToast("Error al publicar aviso: " + e.message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("¿Deseas eliminar esta publicación?")) return;
        try {
            await api.matchmaking.deletePost(postId);
            addToast("Publicación eliminada.", "info");
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e: any) {
            addToast("Error al eliminar aviso.", "error");
        }
    };

    const handleJoinMatch = async (post: MatchmakingPost) => {
        if (!post.user_phone) {
            addToast("El jugador no tiene teléfono público registrado.", "info");
            return;
        }

        // WhatsApp direct link
        let cleanPhone = post.user_phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
        else if (cleanPhone.length === 8) cleanPhone = '549343' + cleanPhone;

        const myName = formatPlayerName(user.name, user.lastname);
        let msg = '';
        if (post.type === 'doubles') {
            const sideStr = post.preferred_side === 'backhand' ? 'juego del lado del revés' : post.preferred_side === 'drive' ? 'juego del lado del drive' : 'juego en ambos lados';
            msg = `¡Hola ${post.user_name}! Vi tu aviso en Smash Tenis buscando pareja para dobles (${post.category}). Soy ${myName} (${user.category || '4ta'}, ${sideStr}), ¿te gustaría que armemos dupla para jugar / competir?`;
        } else {
            msg = `¡Hola ${post.user_name}! Vi tu aviso en Smash Tenis para jugar un singles (${post.category}) el ${post.date || 'próximo día'} a las ${post.time_slot || 'hora acordada'}. Soy ${myName} (${user.category || '4ta'}), ¿sigue disponible para jugar?`;
        }
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

        window.open(waUrl, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header / Intro Banner */}
            <div className="bg-gradient-to-r from-orange-950/40 via-slate-900/80 to-blue-950/40 border border-primary/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black text-base">
                        <Users size={20} /> Tablón de Rivales y Parejas de Dobles
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl">
                        ¿Tenés cancha reservada y te falta rival? ¿Querés armar un dobles o encontrar rivales de tu categoría? Publicá tu anuncio o unite a los partidos de otros socios.
                    </p>
                </div>

                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 shrink-0"
                >
                    <Plus size={16} /> Publicar Búsqueda
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-card border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted font-bold mr-2">
                    <Filter size={14} /> Filtros:
                </div>

                {/* Modalidad Filter */}
                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            filterType === 'all' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('singles')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            filterType === 'singles' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                        }`}
                    >
                        Singles
                    </button>
                    <button
                        onClick={() => setFilterType('doubles')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                            filterType === 'doubles' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                        }`}
                    >
                        Dobles
                    </button>
                </div>

                {/* Club Filter */}
                <select
                    className="bg-sidebar border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                    value={filterInst}
                    onChange={e => setFilterInst(e.target.value)}
                >
                    <option value="all">Todos los Clubes</option>
                    {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>

                {/* Category Filter */}
                <select
                    className="bg-sidebar border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="all">Todas las Categorías</option>
                    {NUMERIC_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <div className="ml-auto text-xs text-muted">
                    {posts.length} {posts.length === 1 ? 'anuncio activo' : 'anuncios activos'}
                </div>
            </div>

            {/* Posts Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted">
                    <Loader2 className="animate-spin text-primary mb-2" size={32} />
                    <p className="text-xs">Cargando anuncios del tablón...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl p-6 text-muted space-y-3">
                    <Users size={40} className="mx-auto text-primary opacity-40" />
                    <h4 className="font-bold text-white text-base">No hay anuncios activos con estos filtros</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Sé el primero en publicar una búsqueda para jugar hoy o el fin de semana.
                    </p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                        Publicar Primer Aviso
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map(post => {
                        const isOwn = post.user_id === user.id;
                        const isDoubles = post.type === 'doubles';

                        return (
                            <Card 
                                key={post.id} 
                                className="p-5 flex flex-col justify-between border-white/10 hover:border-primary/40 transition-all bg-card/90 shadow-xl relative overflow-hidden group"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1 ${isDoubles ? 'bg-purple-500' : 'bg-primary'}`} />

                                <div className="space-y-4">
                                    {/* Card Header: Player Info + Type Badge */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-3">
                                            {post.user_avatar ? (
                                                <img src={post.user_avatar} alt={post.user_name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center border border-primary/30 text-sm">
                                                    {post.user_name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{post.user_name}</h4>
                                                <div className="text-[10px] text-muted flex items-center gap-1.5">
                                                    <span className="text-primary font-bold">{post.user_category || '4ta'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                isDoubles 
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                                                    : 'bg-primary/20 text-primary border-primary/30'
                                            }`}>
                                                {isDoubles ? '🎾 Dobles' : '⚡ Singles'}
                                            </span>
                                            {isOwn && (
                                                <button 
                                                    onClick={() => handleDeletePost(post.id)}
                                                    className="text-muted hover:text-red-400 p-1 transition-colors"
                                                    title="Eliminar mi aviso"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Match details */}
                                    <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3 space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-slate-300">
                                            <div className="flex items-center gap-1.5">
                                                <Building size={14} className="text-primary" />
                                                <span className="font-semibold">{post.institution_name || 'Club'}</span>
                                            </div>
                                            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                                                Cat: {post.category}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] text-muted">
                                            {post.date && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} className="text-amber-400" />
                                                    <span>{post.date}</span>
                                                </div>
                                            )}
                                            {post.time_slot && (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} className="text-blue-400" />
                                                    <span>{post.time_slot} hs</span>
                                                </div>
                                            )}
                                        </div>

                                        {post.has_court_booked && (
                                            <div className="text-[10px] bg-green-500/10 text-green-300 border border-green-500/20 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Cancha ya reservada ({post.court_name || 'Cancha 1'})
                                            </div>
                                        )}

                                        {/* Doubles Partner Specific Badges */}
                                        {isDoubles && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {post.preferred_side && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md font-bold">
                                                        🎾 {post.preferred_side === 'backhand' ? 'Lado Revés' : post.preferred_side === 'drive' ? 'Lado Drive' : 'Ambos Lados'}
                                                    </span>
                                                )}
                                                {post.dominant_hand && (
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-bold">
                                                        🖐️ {post.dominant_hand === 'left' ? 'Zurdo' : 'Diestro'}
                                                    </span>
                                                )}
                                                {post.play_style && (
                                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                                                        🎯 {post.play_style === 'competitive' ? 'Competitivo' : 'Recreativo'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {post.description && (
                                        <p className="text-xs text-slate-300 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
                                            "{post.description}"
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-4 pt-3 border-t border-white/10">
                                    {isOwn ? (
                                        <div className="text-center text-[11px] text-muted font-medium py-1">
                                            Tu publicación activa en el tablón
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleJoinMatch(post)}
                                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-green-600/20 flex items-center justify-center gap-1.5"
                                        >
                                            <MessageCircle size={15} /> ¡Me Sumo! (Coordinar por WhatsApp)
                                        </button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Post Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-white">Publicar Búsqueda en el Tablón</h3>
                                <p className="text-xs text-muted">Encontrá rivales de tu nivel o sumá parejas para dobles</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePost} className="p-6 space-y-4 overflow-y-auto">
                            {/* Type Selection */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Modalidad</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPostType('singles')}
                                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            postType === 'singles'
                                                ? 'bg-primary/20 border-primary text-white shadow-md'
                                                : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                        }`}
                                    >
                                        ⚡ Singles (1 vs 1)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPostType('doubles')}
                                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            postType === 'doubles'
                                                ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                                                : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                        }`}
                                    >
                                        🎾 Dobles (Falta 1 o Pareja)
                                    </button>
                                </div>
                            </div>

                            {/* Club / Institution */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Club / Sede</label>
                                <select
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                                    value={postInstId}
                                    onChange={e => setPostInstId(e.target.value)}
                                    required
                                >
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.city || 'Sede'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category & Date Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría Buscada</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                                        value={postCategory}
                                        onChange={e => setPostCategory(e.target.value)}
                                    >
                                        {NUMERIC_CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Fecha Estimada</label>
                                    <input 
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-primary font-bold"
                                        value={postDate}
                                        onChange={e => setPostDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Time Slot */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Horario Preferido</label>
                                <input 
                                    type="time"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                                    value={postTimeSlot}
                                    onChange={e => setPostTimeSlot(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Doubles Partner Options (When type is doubles) */}
                            {postType === 'doubles' && (
                                <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-3">
                                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                        🎾 Preferencias para la Dupla de Dobles
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-muted uppercase font-bold">Mi Lado Preferido</label>
                                            <select
                                                className="w-full bg-sidebar border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-400"
                                                value={postPreferredSide}
                                                onChange={e => setPostPreferredSide(e.target.value as any)}
                                            >
                                                <option value="drive">Lado Drive (Derecha)</option>
                                                <option value="backhand">Lado Revés (Izquierda)</option>
                                                <option value="both">Ambos Lados / Indiferente</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] text-muted uppercase font-bold">Mano Hábil</label>
                                            <select
                                                className="w-full bg-sidebar border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-400"
                                                value={postDominantHand}
                                                onChange={e => setPostDominantHand(e.target.value as any)}
                                            >
                                                <option value="right">Diestro</option>
                                                <option value="left">Zurdo</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted uppercase font-bold">Objetivo de Juego</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'competitive', label: '🏆 Competitivo' },
                                                { id: 'recreational', label: '🎾 Recreativo' },
                                                { id: 'active', label: '⚡ Sumar Ritmo' }
                                            ].map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => setPostPlayStyle(s.id as any)}
                                                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                        postPlayStyle === s.id
                                                            ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                                                            : 'bg-sidebar border-white/5 text-muted hover:text-white'
                                                    }`}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Court Booked Toggle */}
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-bold">
                                    <input 
                                        type="checkbox"
                                        checked={hasCourtBooked}
                                        onChange={e => setHasCourtBooked(e.target.checked)}
                                        className="rounded accent-primary w-4 h-4"
                                    />
                                    <span>Ya tengo la cancha reservada</span>
                                </label>

                                {hasCourtBooked && (
                                    <input 
                                        type="text"
                                        placeholder="Ej: Cancha 2 de polvo de ladrillo"
                                        className="w-full bg-sidebar border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary"
                                        value={courtName}
                                        onChange={e => setCourtName(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Description / Comment */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Mensaje o Aclaración (Opcional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej: Busco partido parejo de 3ra para entrenar o jugar un set largo..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                                    value={postDescription}
                                    onChange={e => setPostDescription(e.target.value)}
                                />
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                                >
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar Aviso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
