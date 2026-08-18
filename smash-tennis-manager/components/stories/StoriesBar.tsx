import React, { useState, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Story, UserProfile, Institution } from '../../types';
import { api } from '../../services/api';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';

interface StoriesBarProps {
    currentUser: UserProfile;
    institutions: Institution[];
    onSelectUser?: (userId: string) => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
    currentUser,
    institutions = [],
    onSelectUser
}) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [loadedInstitutions, setLoadedInstitutions] = useState<Institution[]>(institutions);

    const isSuperAdmin = currentUser?.role === 'superadmin';

    const loadStories = async () => {
        try {
            const data = await api.stories.getActive();
            setStories(data);
        } catch (error) {
            console.error("Error al cargar historias:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStories();
        if (!institutions || institutions.length === 0) {
            api.institutions.getAll().then(setLoadedInstitutions).catch(console.error);
        } else {
            setLoadedInstitutions(institutions);
        }
        // Polling cada 2 minutos para sincronizar historias
        const interval = setInterval(loadStories, 120000);
        return () => clearInterval(interval);
    }, [institutions]);

    const handleOpenStory = (index: number) => {
        setSelectedStoryIndex(index);
        setIsViewerOpen(true);
    };

    const handleStoryDeleted = (storyId: string) => {
        setStories(prev => prev.filter(s => s.id !== storyId));
    };

    // Si no hay usuario cargado aún, no mostramos la barra
    if (!currentUser) {
        return null;
    }

    // 1. Historias del usuario actual
    const myStories = stories.filter(s => s.user_id === currentUser.id);

    // 2. Historias de otros usuarios agrupadas por autor para mostrar 1 círculo por jugador con la miniatura
    interface UserStoryGroup {
        userId: string;
        author?: UserProfile;
        latestStory: Story;
        firstIndex: number;
        count: number;
    }

    const otherUserGroups = stories.reduce<UserStoryGroup[]>((acc, story, idx) => {
        if (story.user_id === currentUser.id) return acc;
        const existing = acc.find(g => g.userId === story.user_id);
        if (!existing) {
            acc.push({
                userId: story.user_id,
                author: story.author,
                latestStory: story,
                firstIndex: idx,
                count: 1
            });
        } else {
            existing.count += 1;
        }
        return acc;
    }, []);

    return (
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-md mb-6 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 px-1">
                {/* 1. BOTÓN / CÍRCULO "TU HISTORIA" */}
                {myStories.length > 0 ? (
                    /* Con historia activa: muestra la miniatura de su historia + botón '+' para sumar otra */
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group active:scale-95 transition">
                        <div 
                            onClick={() => {
                                const myFirstIdx = stories.findIndex(s => s.user_id === currentUser.id);
                                handleOpenStory(myFirstIdx >= 0 ? myFirstIdx : 0);
                            }}
                            className="relative w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-lime-400 via-emerald-500 to-teal-400 shadow-md shadow-lime-500/20 group-hover:shadow-lime-500/35 group-hover:scale-105 transition-all"
                        >
                            <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-950 flex items-center justify-center">
                                <img 
                                    src={myStories[0].media_url} 
                                    alt="Tu historia" 
                                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                />
                            </div>
                            {/* Botón Plus para agregar otra historia */}
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCreatorOpen(true);
                                }}
                                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-lime-500 text-slate-950 border-2 border-slate-900 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
                                title="Publicar otra historia"
                            >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                        </div>
                        <span className="text-[11px] font-bold text-lime-400 max-w-[68px] truncate text-center">
                            Tu Historia
                        </span>
                    </div>
                ) : (
                    /* Sin historia activa: muestra avatar con borde punteado para crear la primera */
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group active:scale-95 transition" onClick={() => setIsCreatorOpen(true)}>
                        <div className="relative w-16 h-16 rounded-full p-[2px] border-2 border-dashed border-lime-400/60 group-hover:border-lime-400 transition-all flex items-center justify-center bg-slate-950/60 shadow-md">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-300 group-hover:text-lime-400 transition overflow-hidden">
                                {currentUser?.profile_picture_url ? (
                                    <img 
                                        src={currentUser.profile_picture_url} 
                                        alt={currentUser.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                ) : (
                                    <span className="text-lime-400 font-bold">{currentUser?.name?.[0] || 'T'}</span>
                                )}
                            </div>
                            {/* Badge Plus */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-lime-500 text-slate-950 border-2 border-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-300 group-hover:text-lime-400 transition max-w-[68px] truncate text-center">
                            Tu Historia
                        </span>
                    </div>
                )}

                {/* 2. CÍRCULOS DE HISTORIAS ACTIVAS DE OTROS JUGADORES (CON MINIATURA DE LA HISTORIA + AVATAR EN LA ESQUINA) */}
                {otherUserGroups.map((group) => (
                    <div 
                        key={group.userId}
                        onClick={() => handleOpenStory(group.firstIndex)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group active:scale-95 transition"
                    >
                        <div className="relative w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-lime-400 via-emerald-500 to-teal-400 shadow-md shadow-lime-500/10 group-hover:shadow-lime-500/30 group-hover:scale-105 transition-all">
                            {/* Miniatura de la Imagen de la Historia */}
                            <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-950 flex items-center justify-center">
                                {group.latestStory.media_url ? (
                                    <img 
                                        src={group.latestStory.media_url} 
                                        alt="Miniatura historia" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-lime-400" />
                                )}
                            </div>

                            {/* Mini Avatar del autor en la esquina inferior derecha */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800 shadow-md flex items-center justify-center">
                                {group.author?.profile_picture_url ? (
                                    <img 
                                        src={group.author.profile_picture_url} 
                                        alt={group.author.name} 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <span className="text-[9px] font-extrabold text-lime-400">
                                        {group.author?.name?.[0] || 'J'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-300 max-w-[68px] truncate text-center">
                            {group.author?.name || 'Jugador'}
                        </span>
                    </div>
                ))}

                {/* Estado vacío cuando no hay historias activas de la comunidad */}
                {stories.length === 0 && (
                    <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 italic">
                        <Sparkles className="w-4 h-4 text-lime-400" />
                        <span>Comparte tus fotos y momentos del torneo</span>
                    </div>
                )}
            </div>

            {/* VISOR DE HISTORIAS */}
            <StoryViewer 
                isOpen={isViewerOpen}
                stories={stories}
                initialStoryIndex={selectedStoryIndex}
                onClose={() => setIsViewerOpen(false)}
                onStoryDeleted={handleStoryDeleted}
                currentUser={currentUser}
                onSelectUser={onSelectUser}
            />

            {/* CREADOR DE HISTORIAS */}
            <StoryCreator 
                isOpen={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                onPublished={loadStories}
                currentUser={currentUser}
                institutions={loadedInstitutions}
            />
        </div>
    );
};