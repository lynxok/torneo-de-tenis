import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Type, Smile, AtSign, MapPin, Trash2, Send, 
    Sparkles, ChevronRight, Search, Image as ImageIcon,
    Camera, Upload, Palette, ArrowLeft, Check
} from 'lucide-react';
import { StoryLayer, StoryTextLayer, StoryEmojiLayer, StoryStickerLayer, StoryMentionLayer, StoryLocationLayer, UserProfile, Institution } from '../../types';
import { api } from '../../services/api';

interface StoryCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onPublished: () => void;
    currentUser: UserProfile;
    institutions: Institution[];
}

const TENNIS_STICKERS = [
    { id: 'match_point', label: 'MATCH POINT 🔥', bg: 'from-amber-500 to-red-600' },
    { id: 'game_set_match', label: 'GAME, SET & MATCH 🎾', bg: 'from-lime-500 to-emerald-600' },
    { id: 'ace', label: 'ACE! ⚡', bg: 'from-blue-500 to-indigo-600' },
    { id: 'champions', label: 'CAMPEONES 🏆', bg: 'from-yellow-400 to-amber-600' },
    { id: 'clay_court', label: 'POLVO DE LADRILLO 🧱', bg: 'from-orange-600 to-amber-700' },
    { id: 'training', label: 'ENTRENAMIENTO 💪', bg: 'from-purple-600 to-pink-600' },
    { id: 'smash_tourn', label: 'TORNEO SMASH 🎾', bg: 'from-lime-400 to-emerald-700' },
    { id: 'cancha_central', label: 'CANCHA CENTRAL 🏟️', bg: 'from-sky-500 to-blue-700' },
];

const QUICK_EMOJIS = ['🎾', '🔥', '🏆', '🥇', '⚡', '💪', '👏', '🎯', '🚀', '💯', '🥵', '😎', '👑', '⭐', '💥', '🤩', '🎾', '🍻'];

const TEXT_COLORS = [
    { text: '#FFFFFF', bg: 'rgba(0,0,0,0.75)', label: 'Blanco' },
    { text: '#bef264', bg: 'rgba(0,0,0,0.85)', label: 'Lime' },
    { text: '#38bdf8', bg: 'rgba(0,0,0,0.85)', label: 'Cyan' },
    { text: '#f43f5e', bg: 'rgba(0,0,0,0.85)', label: 'Rosa' },
    { text: '#fbbf24', bg: 'rgba(0,0,0,0.85)', label: 'Amarillo' },
    { text: '#000000', bg: 'rgba(255,255,255,0.9)', label: 'Negro' },
];

const GRADIENT_PRESETS = [
    { id: 'smash', label: 'Smash Neon', colors: ['#14532d', '#064e3b', '#022c22'] },
    { id: 'clay', label: 'Polvo de Ladrillo', colors: ['#9a3412', '#7c2d12', '#431407'] },
    { id: 'night', label: 'Cancha Nocturna', colors: ['#1e1b4b', '#0f172a', '#020617'] },
    { id: 'sunset', label: 'Atardecer Tenis', colors: ['#831843', '#581c87', '#1e1b4b'] },
    { id: 'gold', label: 'Grand Slam Dorado', colors: ['#78350f', '#451a03', '#1c1917'] },
];

export const StoryCreator: React.FC<StoryCreatorProps> = ({
    isOpen,
    onClose,
    onPublished,
    currentUser,
    institutions = []
}) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [layers, setLayers] = useState<StoryLayer[]>([]);
    const [activeTool, setActiveTool] = useState<'none' | 'text' | 'stickers' | 'mentions' | 'location'>('none');
    const [isPublishing, setIsPublishing] = useState(false);

    const [textInput, setTextInput] = useState('');
    const [selectedColorIdx, setSelectedColorIdx] = useState(0);

    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionResults, setMentionResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSelectGradient = async (preset: typeof GRADIENT_PRESETS[0]) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
            gradient.addColorStop(0, preset.colors[0]);
            gradient.addColorStop(0.5, preset.colors[1]);
            gradient.addColorStop(1, preset.colors[2]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1080, 1920);
        }
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `story_${preset.id}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setImageFile(file);
                setImagePreview(URL.createObjectURL(blob));
            }
        }, 'image/jpeg', 0.92);
    };

    useEffect(() => {
        if (activeTool !== 'mentions') return;
        setIsSearchingUsers(true);
        const timer = setTimeout(async () => {
            try {
                const results = await api.stories.searchUsersForMention(mentionQuery);
                setMentionResults(results);
            } catch (err) {
                console.error("Error buscando jugadores:", err);
            } finally {
                setIsSearchingUsers(false);
            }
        }, mentionQuery.trim() ? 200 : 0);
        return () => clearTimeout(timer);
    }, [mentionQuery, activeTool]);

    const handleTouchStart = (layerId: string, e: React.TouchEvent | React.MouseEvent) => {
        e.stopPropagation();
        setDraggingLayerId(layerId);
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!draggingLayerId || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let x = ((clientX - rect.left) / rect.width) * 100;
        let y = ((clientY - rect.top) / rect.height) * 100;

        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));

        setIsOverTrash(y > 82);
        setLayers(prev => prev.map(l => l.id === draggingLayerId ? { ...l, x, y } : l));
    };

    const handleTouchEnd = () => {
        if (draggingLayerId && isOverTrash) {
            setLayers(prev => prev.filter(l => l.id !== draggingLayerId));
        }
        setDraggingLayerId(null);
        setIsOverTrash(false);
    };

    const handleAddText = () => {
        if (!textInput.trim()) {
            setActiveTool('none');
            return;
        }
        const newLayer: StoryTextLayer = {
            id: 'text_' + Date.now(),
            type: 'text',
            text: textInput.trim(),
            color: TEXT_COLORS[selectedColorIdx].text,
            bgColor: TEXT_COLORS[selectedColorIdx].bg,
            x: 50,
            y: 45
        };
        setLayers(prev => [...prev, newLayer]);
        setTextInput('');
        setActiveTool('none');
    };

    const handleAddSticker = (sticker: typeof TENNIS_STICKERS[0]) => {
        const newLayer: StoryStickerLayer = {
            id: 'sticker_' + Date.now(),
            type: 'sticker',
            stickerId: sticker.id,
            stickerUrl: '',
            label: sticker.label,
            x: 50,
            y: 50
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveTool('none');
    };

    const handleAddEmoji = (emoji: string) => {
        const newLayer: StoryEmojiLayer = {
            id: 'emoji_' + Date.now(),
            type: 'emoji',
            emoji: emoji,
            x: 50,
            y: 50,
            size: 40
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveTool('none');
    };

    const handleAddMention = (user: any) => {
        const newLayer: StoryMentionLayer = {
            id: 'mention_' + Date.now(),
            type: 'mention',
            userId: user.id,
            username: '@' + user.name.toLowerCase() + (user.lastname ? '_' + user.lastname.toLowerCase() : ''),
            fullName: (user.name + ' ' + (user.lastname || '')).trim(),
            avatarUrl: user.profile_picture_url,
            x: 50,
            y: 60
        };
        setLayers(prev => [...prev, newLayer]);
        setMentionQuery('');
        setMentionResults([]);
        setActiveTool('none');
    };

    const handleAddLocation = (locationName: string, institutionId?: string) => {
        const newLayer: StoryLocationLayer = {
            id: 'loc_' + Date.now(),
            type: 'location',
            locationName,
            institutionId,
            x: 50,
            y: 25
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveTool('none');
    };

    const handlePublish = async () => {
        if (!imageFile || !currentUser?.id) return;
        setIsPublishing(true);
        try {
            await api.stories.createStory(imageFile, layers, currentUser.id);
            onPublished();
            handleReset();
            onClose();
        } catch (error: any) {
            console.error('Error al publicar historia:', error);
            const msg = error?.message || 'Verifique la conexión o el esquema de base de datos.';
            alert(`No se pudo publicar la historia: ${msg}`);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleReset = () => {
        setImageFile(null);
        setImagePreview(null);
        setLayers([]);
        setActiveTool('none');
        setTextInput('');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] w-screen h-[100dvh] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center select-none overflow-hidden touch-none p-0 sm:p-4 m-0">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
            />

            <input 
                type="file" 
                ref={cameraInputRef} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                onChange={handleFileChange} 
            />

            {!imagePreview ? (
                <div className="relative w-full h-[100dvh] sm:h-[92vh] sm:max-h-[820px] max-w-md flex flex-col justify-between p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white shadow-2xl sm:rounded-3xl border border-white/10 overflow-y-auto">
                    <div className="flex justify-between items-center pt-2 pb-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95 transition"
                            title="Cerrar"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/30 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" /> {currentUser?.role === 'superadmin' ? 'Modo SuperAdmin' : 'Comunidad Smash'}
                        </div>
                    </div>

                    <div className="text-center space-y-4 my-auto px-2">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-lime-400 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-lime-500/30 ring-4 ring-lime-400/20">
                            <Sparkles className="w-10 h-10 text-slate-950" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">Crear Historia Smash</h2>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                                Comparte fotos de tus partidos, entrenamientos o momentos del torneo con la comunidad. Activa por <span className="text-lime-400 font-bold">20 horas</span>.
                            </p>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-lime-400" /> O elige un fondo de color
                            </p>
                            <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
                                {GRADIENT_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handleSelectGradient(preset)}
                                        style={{
                                            background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]}, ${preset.colors[2]})`
                                        }}
                                        className="h-14 rounded-2xl border-2 border-white/20 hover:border-lime-400 hover:scale-105 active:scale-95 transition shadow-lg flex items-center justify-center group"
                                        title={preset.label}
                                    >
                                        <Sparkles className="w-4 h-4 text-white/50 group-hover:text-white transition" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-4 pb-2">
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-black text-base shadow-xl shadow-lime-500/25 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <ImageIcon className="w-5 h-5 stroke-[2.5]" />
                            <span>Subir Foto de Galería</span>
                            <ChevronRight className="w-5 h-5 ml-auto opacity-70" />
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-full py-3.5 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-sm border border-white/10 active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <Camera className="w-5 h-5 text-lime-400" />
                            <span>Tomar Foto con Cámara</span>
                            <ChevronRight className="w-5 h-5 ml-auto text-slate-400" />
                        </button>

                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-full py-2 text-slate-400 text-sm font-bold hover:text-white transition"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    ref={canvasRef}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-full h-[100dvh] sm:h-[92vh] sm:max-h-[820px] max-w-md bg-black flex flex-col justify-between overflow-hidden shadow-2xl sm:rounded-3xl border border-white/10"
                >
                    {/* Imagen de Fondo */}
                    <img 
                        src={imagePreview} 
                        alt="Story preview" 
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

                    {/* CAPAS INTERACTIVAS */}
                    {layers.map((layer) => {
                        const isDragging = draggingLayerId === layer.id;

                        return (
                            <div 
                                key={layer.id}
                                onMouseDown={(e) => handleTouchStart(layer.id, e)}
                                onTouchStart={(e) => handleTouchStart(layer.id, e)}

                                style={{
                                    left: `${layer.x}%`,
                                    top: `${layer.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isDragging ? 40 : 20,
                                }}
                                className={`absolute cursor-grab active:cursor-grabbing transition-transform ${
                                    isDragging ? 'scale-110 ring-2 ring-lime-400 rounded-xl' : ''
                                }`}
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
                                    <span className="text-5xl filter drop-shadow-lg select-none">
                                        {layer.emoji}
                                    </span>
                                )}

                                {layer.type === 'sticker' && (
                                    <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-black text-sm tracking-wider shadow-2xl uppercase border-2 border-white/40 flex items-center gap-1.5">
                                        {layer.label}
                                    </div>
                                )}

                                {layer.type === 'mention' && (
                                    <div className="px-3.5 py-1.5 rounded-full bg-white/95 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 border border-white">
                                        <div className="w-4 h-4 rounded-full bg-lime-500 flex items-center justify-center text-[10px] text-black font-extrabold">
                                            @
                                        </div>
                                        <span>{layer.fullName}</span>
                                    </div>
                                )}

                                {layer.type === 'location' && (
                                    <div className="px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-bold text-xs shadow-xl flex items-center gap-1.5 backdrop-blur-md border border-blue-400/40">
                                        <MapPin className="w-3.5 h-3.5 text-blue-200 fill-current" />
                                        <span>{layer.locationName}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* TOP BAR CON HERRAMIENTAS */}
                    <div className="relative z-30 flex items-center justify-between p-4 pt-6">
                        <button 
                            type="button"
                            onClick={handleReset}
                            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 active:scale-95 transition border border-white/10"
                            title="Cambiar imagen / Volver"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-xl">
                            <button 
                                type="button"
                                onClick={() => setActiveTool('text')}
                                className={`p-2 rounded-full transition ${activeTool === 'text' ? 'bg-lime-500 text-black shadow-md' : 'text-white hover:bg-white/10'}`}
                                title="Agregar Texto"
                            >
                                <Type className="w-5 h-5" />
                            </button>

                            <button 
                                type="button"
                                onClick={() => setActiveTool('stickers')}
                                className={`p-2 rounded-full transition ${activeTool === 'stickers' ? 'bg-lime-500 text-black shadow-md' : 'text-white hover:bg-white/10'}`}
                                title="Stickers y Emojis"
                            >
                                <Smile className="w-5 h-5" />
                            </button>

                            <button 
                                type="button"
                                onClick={() => setActiveTool('mentions')}
                                className={`p-2 rounded-full transition ${activeTool === 'mentions' ? 'bg-lime-500 text-black shadow-md' : 'text-white hover:bg-white/10'}`}
                                title="Etiquetar Jugador"
                            >
                                <AtSign className="w-5 h-5" />
                            </button>

                            <button 
                                type="button"
                                onClick={() => setActiveTool('location')}
                                className={`p-2 rounded-full transition ${activeTool === 'location' ? 'bg-lime-500 text-black shadow-md' : 'text-white hover:bg-white/10'}`}
                                title="Agregar Ubicación"
                            >
                                <MapPin className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* BOTTOM BAR: PUBLICAR O ZONA DE BASURA */}
                    <div className="relative z-30 p-4 pb-6 flex items-center justify-between">
                        {draggingLayerId ? (
                            <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                                isOverTrash ? 'bg-red-600 text-white scale-105 shadow-xl' : 'bg-black/70 text-slate-300 border border-white/20'
                            }`}>
                                <Trash2 className="w-5 h-5" />
                                <span>{isOverTrash ? 'Soltar para eliminar' : 'Arrastrar aquí para borrar'}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-xs text-white/90 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10">
                                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                                    <span>20 horas activas</span>
                                </div>

                                <button 
                                    type="button"
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="py-3 px-6 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-lime-500/20 hover:brightness-110 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isPublishing ? (
                                        <span>Publicando...</span>
                                    ) : (
                                        <>
                                            <span>Compartir Historia</span>
                                            <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    {/* MODAL HERRAMIENTA: TEXTO */}
                    {activeTool === 'text' && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6">
                            <div className="flex justify-between items-center">
                                <button type="button" onClick={() => setActiveTool('none')} className="text-white p-2">
                                    <X className="w-6 h-6" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleAddText}
                                    className="px-5 py-2 rounded-full bg-lime-400 text-black font-extrabold text-sm shadow-lg active:scale-95 transition flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Listo</span>
                                </button>
                            </div>

                            <div className="my-auto flex flex-col items-center">
                                <textarea 
                                    autoFocus
                                    rows={3}
                                    placeholder="Escribe tu mensaje aquí..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    style={{
                                        color: TEXT_COLORS[selectedColorIdx].text,
                                        backgroundColor: TEXT_COLORS[selectedColorIdx].bg
                                    }}
                                    className="w-full max-w-xs text-center text-2xl font-black p-4 rounded-2xl outline-none resize-none border border-white/20 shadow-2xl placeholder-white/40"
                                />
                            </div>

                            <div className="flex justify-center gap-3 pb-4">
                                {TEXT_COLORS.map((c, i) => (
                                    <button 
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedColorIdx(i)}
                                        style={{ backgroundColor: c.text }}
                                        className={`w-8 h-8 rounded-full border-2 transition ${selectedColorIdx === i ? 'border-white scale-125 shadow-lg ring-2 ring-lime-400' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODAL HERRAMIENTA: STICKERS & EMOJIS */}
                    {activeTool === 'stickers' && (
                        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 text-white overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Smile className="w-5 h-5 text-lime-400" /> Stickers de Tenis
                                </h3>
                                <button type="button" onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Packs Especiales</h4>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {TENNIS_STICKERS.map((st) => (
                                            <button 
                                                key={st.id}
                                                type="button"
                                                onClick={() => handleAddSticker(st)}
                                                className={`p-3.5 rounded-xl bg-gradient-to-r ${st.bg} font-black text-xs text-slate-950 shadow-md text-left active:scale-95 transition flex items-center justify-between border border-white/20`}
                                            >
                                                <span>{st.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Emojis Rápidos</h4>
                                    <div className="grid grid-cols-6 gap-2 text-3xl text-center">
                                        {QUICK_EMOJIS.map((em, idx) => (
                                            <button 
                                                key={idx}
                                                type="button"
                                                onClick={() => handleAddEmoji(em)}
                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 active:scale-125 transition flex items-center justify-center border border-white/5"
                                            >
                                                {em}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL HERRAMIENTA: MENCIONES */}
                    {activeTool === 'mentions' && (
                        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <AtSign className="w-5 h-5 text-lime-400" /> Etiquetar Jugador
                                </h3>
                                <button type="button" onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="relative mb-4">
                                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar por nombre o apellido..."
                                    value={mentionQuery}
                                    onChange={(e) => setMentionQuery(e.target.value)}
                                    className="w-full bg-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none border border-white/10 focus:border-lime-400 transition"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {isSearchingUsers && (
                                    <div className="text-center py-6 text-sm text-slate-400 animate-pulse">
                                        Buscando jugadores...
                                    </div>
                                )}

                                {!isSearchingUsers && mentionResults.map((u) => (
                                    <button 
                                        key={u.id}
                                        type="button"
                                        onClick={() => handleAddMention(u)}
                                        className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-between active:scale-[0.99] transition border border-white/5 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center font-bold text-lime-400">
                                                {u.profile_picture_url ? (
                                                    <img src={u.profile_picture_url} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    (u.name || 'J')[0]
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm text-white flex items-center gap-2">
                                                    <span>{u.name} {u.lastname || ''}</span>
                                                    {u.role === 'superadmin' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-lime-400/20 text-lime-400 text-[9px] font-black uppercase">
                                                            SuperAdmin
                                                        </span>
                                                    )}
                                                    {u.role === 'admin' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-400 text-[9px] font-black uppercase">
                                                            Organizador
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {u.category ? `Categoría ${u.category}` : 'Jugador registrado'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}

                                {!isSearchingUsers && mentionQuery && mentionResults.length === 0 && (
                                    <div className="text-center py-8 text-sm text-slate-400">
                                        No se encontraron jugadores con "{mentionQuery}".
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODAL HERRAMIENTA: UBICACIÓN */}
                    {activeTool === 'location' && (
                        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-400" /> Agregar Ubicación
                                </h3>
                                <button type="button" onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1">
                                <p className="text-xs text-slate-400 font-medium mb-3">Sedes del Torneo & Canchas:</p>
                                {institutions.map((inst) => (
                                    <button 
                                        key={inst.id}
                                        type="button"
                                        onClick={() => handleAddLocation(inst.name, inst.id)}
                                        className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-between text-left active:scale-[0.99] transition border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{inst.name}</p>
                                                <p className="text-xs text-slate-400">{inst.city || 'Sede oficial'}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                                
                                <button 
                                    type="button"
                                    onClick={() => handleAddLocation('Cancha Central')}
                                    className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-white/15 flex items-center gap-3 text-left border border-white/5"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold text-xs">
                                        🎾
                                    </div>
                                    <p className="font-bold text-sm text-white">Cancha Central</p>
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => handleAddLocation('Cancha 1')}
                                    className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-white/15 flex items-center gap-3 text-left border border-white/5"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold text-xs">
                                        🎾
                                    </div>
                                    <p className="font-bold text-sm text-white">Cancha 1</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body
    );
};