import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Trash2, ShieldAlert } from 'lucide-react';
import { Story, UserProfile } from '../../types';
import { api } from '../../services/api';

interface StoryViewerProps {
    isOpen: boolean;
    stories: Story[];
    initialStoryIndex?: number;
    onClose: () => void;
    onStoryDeleted?: (storyId: string) => void;
    currentUser?: UserProfile;
    onSelectUser?: (userId: string) => void;
}

const STORY_DURATION_MS = 5000; // 5 segundos por historia

export const StoryViewer: React.FC<StoryViewerProps> = ({
    isOpen,
    stories,
    initialStoryIndex = 0,
    onClose,
    onStoryDeleted,
    currentUser,
    onSelectUser
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(0);

    // Sincronizar índice inicial cuando se abre
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(Math.min(initialStoryIndex, stories.length - 1));
            setProgress(0);
            startTimeRef.current = null;
            pausedTimeRef.current = 0;
        }
    }, [isOpen, initialStoryIndex, stories.length]);

    const activeStory = stories[currentIndex];
    const isSuperAdmin = currentUser?.role === 'superadmin';

    // Temporizador de barra de progreso con requestAnimationFrame
    useEffect(() => {
        if (!isOpen || !activeStory || isPaused) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const updateProgress = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp - pausedTimeRef.current;
            const elapsed = timestamp - startTimeRef.current;
            const currentProgress = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);

            setProgress(currentProgress);

            if (currentProgress >= 100) {
                // Siguiente historia o cerrar si es la última
                if (currentIndex < stories.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setProgress(0);
                    startTimeRef.current = null;
                    pausedTimeRef.current = 0;
                } else {
                    onClose();
                }
            } else {
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateProgress);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isOpen, currentIndex, activeStory, isPaused, stories.length, onClose]);

    // Pausar y reanudar al mantener presionado
    const handlePressStart = () => {
        setIsPaused(true);
        if (startTimeRef.current) {
            pausedTimeRef.current = (progress / 100) * STORY_DURATION_MS;
        }
    };

    const handlePressEnd = () => {
        setIsPaused(false);
        startTimeRef.current = null;
    };

    // Navegación izquierda / derecha al tocar bordes
    const handleTapScreen = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.3) {
            // Toque en el tercio izquierdo: ir a historia anterior
            if (currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
                setProgress(0);
                startTimeRef.current = null;
                pausedTimeRef.current = 0;
            }
        } else {
            // Toque en los dos tercios derechos: ir a siguiente historia
            if (currentIndex < stories.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setProgress(0);
                startTimeRef.current = null;
                pausedTimeRef.current = 0;
            } else {
                onClose();
            }
        }
    };

    // Eliminar historia (solo superadmin o autor)
    const handleDeleteStory = async () => {
        if (!activeStory || !confirm("¿Seguro que deseas eliminar esta historia?")) return;
        setIsDeleting(true);
        try {
            await api.stories.deleteStory(activeStory.id, activeStory.storage_path);
            if (onStoryDeleted) onStoryDeleted(activeStory.id);
            if (stories.length <= 1) {
                onClose();
            } else {
                if (currentIndex >= stories.length - 1) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                }
                setProgress(0);
                startTimeRef.current = null;
            }
        } catch (error) {
            console.error("Error al borrar historia:", error);
            alert("No se pudo borrar la historia");
        } finally {
            setIsDeleting(false);
        }
    };

    // Calcular horas restantes de la historia
    const getRemainingHours = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
        const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
        if (hours === 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    };

    if (!isOpen || !activeStory) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none touch-none overflow-hidden">
            {/* Contenedor Vertical 9:16 Mobile-First */}
            <div 
                className="relative w-full h-[100dvh] max-w-md bg-slate-950 flex flex-col justify-between overflow-hidden shadow-2xl"
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
            >
                {/* Fondo: Imagen de la Historia */}
                <img 
                    src={activeStory.media_url} 
                    alt="Story" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

                {/* CAPAS INTERACTIVAS (Stickers, Menciones, Ubicación, Texto) */}
                {activeStory.layers?.map((layer) => (
                    <div 
                        key={layer.id}
                        style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 30
                        }}
                        className="absolute pointer-events-auto select-none"
                    >
                        {layer.type === 'text' && (
                            <div 
                                style={{ color: layer.color, backgroundColor: layer.bgColor }}
                                className="px-4 py-2 rounded-xl text-lg font-black tracking-wide shadow-2xl backdrop-blur-sm text-center max-w-[280px] break-words"
                            >
                                {layer.text}
                            </div>
                        )}

                        {layer.type === 'emoji' && (
                            <span className="text-5xl filter drop-shadow-lg">
                                {layer.emoji}
                            </span>
                        )}

                        {layer.type === 'sticker' && (
                            <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-black text-sm tracking-wider shadow-2xl uppercase border-2 border-white/40">
                                {layer.label}
                            </div>
                        )}

                        {layer.type === 'mention' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectUser) {
                                        onClose();
                                        onSelectUser(layer.userId);
                                    }
                                }}
                                className="px-3.5 py-1.5 rounded-full bg-white/90 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 border border-white hover:scale-105 active:scale-95 transition"
                            >
                                <div className="w-4 h-4 rounded-full bg-lime-500 flex items-center justify-center text-[10px] text-black font-extrabold">
                                    @
                                </div>
                                <span>{layer.fullName}</span>
                            </button>
                        )}

                        {layer.type === 'location' && (
                            <div className="px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-bold text-xs shadow-xl flex items-center gap-1.5 backdrop-blur-md border border-blue-400/40">
                                <MapPin className="w-3.5 h-3.5 text-blue-200 fill-current" />
                                <span>{layer.locationName}</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* ZONA DE CONTROL Y HEADER */}
                <div className="relative z-40 p-4 pt-6 flex flex-col gap-3">
                    {/* BARRAS DE PROGRESO SEGMENTADAS */}
                    <div className="flex items-center gap-1.5 w-full">
                        {stories.map((s, idx) => {
                            let barProgress = 0;
                            if (idx < currentIndex) barProgress = 100;
                            else if (idx === currentIndex) barProgress = progress;

                            return (
                                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-white transition-[width] duration-75 ease-linear rounded-full"
                                        style={{ width: `${barProgress}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* CABECERA: AVATAR, AUTOR, TIEMPO RESTANTE Y ACCIONES */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-lime-400 to-emerald-500 shadow-md">
                                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-sm text-lime-400">
                                    {activeStory.author?.profile_picture_url ? (
                                        <img 
                                            src={activeStory.author.profile_picture_url} 
                                            alt={activeStory.author.name} 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        (activeStory.author?.name || 'S')[0]
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-sm text-white drop-shadow">
                                        {activeStory.author ? `${activeStory.author.name} ${activeStory.author.lastname || ''}`.trim() : 'Smash Tennis'}
                                    </p>
                                    <span className="px-1.5 py-0.5 rounded-full bg-lime-400/20 border border-lime-400/40 text-[10px] font-bold text-lime-400">
                                        OFICIAL
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/70">
                                    Quedan {getRemainingHours(activeStory.expires_at)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Botón borrar (Solo SuperAdmin) */}
                            {isSuperAdmin && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteStory();
                                    }}
                                    disabled={isDeleting}
                                    title="Eliminar historia ahora"
                                    className="p-2 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md active:scale-95 transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            {/* Botón cerrar */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md active:scale-95 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ZONA DE TOQUE LATERAL PARA CAMBIAR HISTORIAS */}
                <div 
                    onClick={handleTapScreen}
                    className="absolute inset-0 z-20 cursor-pointer"
                />

                {/* FOOTER: INDICADOR DE PAUSA */}
                <div className="relative z-30 p-4 pb-8 text-center pointer-events-none">
                    {isPaused && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 text-xs font-semibold">
                            Pausado
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};