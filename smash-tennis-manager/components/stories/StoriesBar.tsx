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
    institutions,
    onSelectUser
}) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

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
        // Polling cada 2 minutos para sincronizar historias
        const interval = setInterval(loadStories, 120000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenStory = (index: number) => {
        setSelectedStoryIndex(index);
        setIsViewerOpen(true);
    };

    const handleStoryDeleted = (storyId: string) => {
        setStories(prev => prev.filter(s => s.id !== storyId));
    };

    // Si no hay historias y el usuario NO es superadmin, no mostramos la barra para mantener limpio el feed
    if (!isLoading && stories.length === 0 && !isSuperAdmin) {
        return null;
    }

    return (
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-md mb-6 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 px-1">
                {/* 1. BOTÓN CREAR HISTORIA (EXCLUSIVO SUPERADMIN) */}
                {isSuperAdmin && (
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group" onClick={() => setIsCreatorOpen(true)}>
                        <div className="relative w-16 h-16 rounded-full p-[2px] border-2 border-dashed border-lime-400/60 group-hover:border-lime-400 transition-all flex items-center justify-center bg-slate-950/60 shadow-md active:scale-95">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-300 group-hover:text-lime-400 transition overflow-hidden">
                                {currentUser?.profile_picture_url ? (
                                    <img 
                                        src={currentUser.profile_picture_url} 
                                        alt={currentUser.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                ) : (
                                    <span className="text-lime-400 font-bold">{currentUser?.name?.[0] || 'S'}</span>
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

                {/* 2. CÍRCULOS DE HISTORIAS ACTIVAS */}
                {stories.map((story, idx) => (
                    <div 
                        key={story.id}
                        onClick={() => handleOpenStory(idx)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group active:scale-95 transition"
                    >
                        <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-lime-400 via-emerald-500 to-teal-400 shadow-md shadow-lime-500/10 group-hover:shadow-lime-500/25 transition">
                            <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-950 flex items-center justify-center">
                                {story.media_url ? (
                                    <img 
                                        src={story.media_url} 
                                        alt="Historia" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                    />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-lime-400" />
                                )}
                            </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-300 max-w-[68px] truncate text-center">
                            {story.author?.name || 'Smash'}
                        </span>
                    </div>
                ))}

                {/* Estado vacío para superadmin sin historias publicadas aún */}
                {stories.length === 0 && isSuperAdmin && (
                    <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 italic">
                        <Sparkles className="w-4 h-4 text-lime-400" />
                        <span>Publica la primera historia oficial del torneo</span>
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

            {/* CREADOR DE HISTORIAS (SOLO SUPERADMIN) */}
            {isSuperAdmin && (
                <StoryCreator 
                    isOpen={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    onPublished={loadStories}
                    currentUser={currentUser}
                    institutions={institutions}
                />
            )}
        </div>
    );
};