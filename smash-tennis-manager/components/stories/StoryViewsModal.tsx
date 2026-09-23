import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Heart, Flame, Sparkles, Trophy } from 'lucide-react';
import { StoryViewItem, UserProfile } from '../../types';
import { formatPlayerName } from '../../utils/formatters';

interface StoryViewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    views: StoryViewItem[];
    isLoading: boolean;
    onSelectUser?: (userId: string) => void;
}

export const StoryViewsModal: React.FC<StoryViewsModalProps> = ({
    isOpen,
    onClose,
    views = [],
    isLoading,
    onSelectUser
}) => {
    const [filter, setFilter] = useState<'all' | 'reactions'>('all');

    if (!isOpen) return null;

    const filteredViews = filter === 'reactions' 
        ? views.filter(v => Boolean(v.reaction))
        : views;

    const totalReactions = views.filter(v => Boolean(v.reaction)).length;

    const formatRelativeTime = (isoDate: string) => {
        const diffMs = new Date().getTime() - new Date(isoDate).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Ahora mismo';
        if (diffMin < 60) return `Hace ${diffMin}m`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `Hace ${diffHours}h`;
        return `Hace ${Math.floor(diffHours / 24)}d`;
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
                            <Eye className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-tight">
                                Actividad de tu historia
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                {views.length} {views.length === 1 ? 'persona vio' : 'personas vieron'} • {totalReactions} {totalReactions === 1 ? 'reacción' : 'reacciones'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filtros rápidos */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/50">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                            filter === 'all'
                                ? 'bg-lime-400 text-slate-950'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        Todos ({views.length})
                    </button>
                    <button
                        onClick={() => setFilter('reactions')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                            filter === 'reactions'
                                ? 'bg-lime-400 text-slate-950'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <span>Reacciones</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-bold">
                            {totalReactions}
                        </span>
                    </button>
                </div>

                {/* Lista de Espectadores */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/40">
                    {isLoading ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                            Cargando actividad...
                        </div>
                    ) : filteredViews.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                            <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                            <p>
                                {filter === 'reactions' 
                                    ? 'Aún no hay reacciones en esta historia.' 
                                    : 'Aún no hay visualizaciones registradas.'}
                            </p>
                        </div>
                    ) : (
                        filteredViews.map((item) => {
                            const displayName = item.user?.name 
                                ? formatPlayerName(item.user.name, item.user.lastname)
                                : 'Jugador de Tenis';

                            return (
                                <div 
                                    key={item.id}
                                    className="flex items-center justify-between py-2 px-1 hover:bg-slate-800/30 rounded-xl transition cursor-pointer"
                                    onClick={() => {
                                        if (item.user_id && onSelectUser) {
                                            onClose();
                                            onSelectUser(item.user_id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="relative w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-lime-400 flex-shrink-0">
                                            {item.user?.profile_picture_url ? (
                                                <img 
                                                    src={item.user.profile_picture_url} 
                                                    alt={displayName} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                item.user?.name?.[0] || 'J'
                                            )}
                                        </div>

                                        {/* Nombre y tiempo */}
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white hover:text-lime-400 transition">
                                                {displayName}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {formatRelativeTime(item.viewed_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reacción Emoji */}
                                    {item.reaction ? (
                                        <div className="w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-lg shadow-sm">
                                            {item.reaction}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-500 pr-1">Visto</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
