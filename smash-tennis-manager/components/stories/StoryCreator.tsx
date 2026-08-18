import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Type, Smile, AtSign, MapPin, Trash2, Send, 
    Sparkles, ChevronRight, Search
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
];

const QUICK_EMOJIS = ['🎾', '🔥', '🏆', '🥇', '⚡', '💪', '👏', '🎯', '🚀', '💯', '🥵', '😎'];

const TEXT_COLORS = [
    { text: '#FFFFFF', bg: 'rgba(0,0,0,0.6)', label: 'Blanco' },
    { text: '#bef264', bg: 'rgba(0,0,0,0.7)', label: 'Lime' },
    { text: '#38bdf8', bg: 'rgba(0,0,0,0.7)', label: 'Cyan' },
    { text: '#f43f5e', bg: 'rgba(0,0,0,0.7)', label: 'Rosa' },
    { text: '#fbbf24', bg: 'rgba(0,0,0,0.7)', label: 'Amarillo' },
];

export const StoryCreator: React.FC<StoryCreatorProps> = ({
    isOpen,
    onClose,
    onPublished,
    currentUser,
    institutions
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    useEffect(() => {
        if (!mentionQuery.trim()) {
            setMentionResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const results = await api.stories.searchUsersForMention(mentionQuery);
                setMentionResults(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingUsers(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [mentionQuery]);

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

        setIsOverTrash(y > 85);
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
        } catch (error) {
            console.error('Error al publicar historia:', error);
            alert('No se pudo publicar la historia. Verifique la conexión.');
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

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none overflow-hidden touch-none">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {!imagePreview ? (
                <div className="w-full h-full max-w-md flex flex-col justify-between p-6 bg-gradient-to-b from-slate-900 via-black to-slate-950 text-white">
                    <div className="flex justify-between items-center pt-4">
                        <button 
                            onClick={onClose}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/30 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" /> Modo SuperAdmin
                        </div>
                    </div>

                    <div className="text-center space-y-4 my-auto">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-lime-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-lime-500/20">
                            <Sparkles className="w-12 h-12 text-slate-950 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Nueva Historia Smash</h2>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                            Visible para toda la comunidad por <span className="text-lime-400 font-bold">20 horas</span>. Al expirar se eliminará de la base de datos automáticamente.
                        </p>
                    </div>

                    <div className="space-y-3 pb-8">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-bold text-base shadow-lg shadow-lime-500/25 active:scale-[0.98] transition flex items-center justify-center gap-3"
                        >
                            <span>Elegir Foto o Tomar con Cámara</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 text-slate-400 text-sm font-medium hover:text-white transition"
                        >
                            Cancelar
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
                    className="relative w-full h-[100dvh] max-w-md bg-black flex flex-col justify-between overflow-hidden"
                >
                    <img 
                        src={imagePreview} 
                        alt="Story preview" 
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

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
                                    <div className="px-3.5 py-1.5 rounded-full bg-white/90 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 border border-white">
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

                    {/* TOP BAR */}
                    <div className="relative z-30 flex items-center justify-between p-4 pt-6">
                        <button 
                            onClick={handleReset}
                            className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 active:scale-95 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                            <button 
                                onClick={() => setActiveTool('text')}
                                className={`p-2 rounded-full transition ${activeTool === 'text' ? 'bg-lime-500 text-black' : 'text-white hover:bg-white/10'}`}
                                title="Texto"
                            >
                                <Type className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={() => setActiveTool('stickers')}
                                className={`p-2 rounded-full transition ${activeTool === 'stickers' ? 'bg-lime-500 text-black' : 'text-white hover:bg-white/10'}`}
                                title="Stickers y Emojis"
                            >
                                <Smile className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={() => setActiveTool('mentions')}
                                className={`p-2 rounded-full transition ${activeTool === 'mentions' ? 'bg-lime-500 text-black' : 'text-white hover:bg-white/10'}`}
                                title="Etiquetar Jugador"
                            >
                                <AtSign className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={() => setActiveTool('location')}
                                className={`p-2 rounded-full transition ${activeTool === 'location' ? 'bg-lime-500 text-black' : 'text-white hover:bg-white/10'}`}
                                title="Ubicación"
                            >
                                <MapPin className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* BOTTOM BAR */}
                    <div className="relative z-30 p-4 pb-8 flex items-center justify-between">
                        {draggingLayerId ? (
                            <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                                isOverTrash ? 'bg-red-600 text-white scale-105 shadow-xl' : 'bg-black/60 text-slate-300 border border-white/20'
                            }`}>
                                <Trash2 className="w-5 h-5" />
                                <span>{isOverTrash ? 'Soltar para eliminar' : 'Arrastrar aquí para borrar'}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-xs text-white/80 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                                    <span>20 horas</span>
                                </div>

                                <button 
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="py-3 px-6 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-lime-500/20 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
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

                    {/* MODAL: TEXTO */}
                    {activeTool === 'text' && (
                        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-6">
                            <div className="flex justify-between items-center">
                                <button onClick={() => setActiveTool('none')} className="text-white p-2">
                                    <X className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={handleAddText}
                                    className="px-5 py-1.5 rounded-full bg-lime-400 text-black font-bold text-sm"
                                >
                                    Listo
                                </button>
                            </div>

                            <div className="my-auto flex flex-col items-center">
                                <textarea 
                                    autoFocus
                                    rows={3}
                                    placeholder="Escribe un mensaje..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    style={{
                                        color: TEXT_COLORS[selectedColorIdx].text,
                                        backgroundColor: TEXT_COLORS[selectedColorIdx].bg
                                    }}
                                    className="w-full max-w-xs text-center text-2xl font-black p-4 rounded-2xl outline-none resize-none border-none"
                                />
                            </div>

                            <div className="flex justify-center gap-3 pb-4">
                                {TEXT_COLORS.map((c, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => setSelectedColorIdx(i)}
                                        style={{ backgroundColor: c.text }}
                                        className={`w-8 h-8 rounded-full border-2 transition ${selectedColorIdx === i ? 'border-white scale-125' : 'border-transparent'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODAL: STICKERS & EMOJIS */}
                    {activeTool === 'stickers' && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-6 text-white overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Smile className="w-5 h-5 text-lime-400" /> Stickers de Tenis
                                </h3>
                                <button onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
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
                                                onClick={() => handleAddSticker(st)}
                                                className={`p-3 rounded-xl bg-gradient-to-r ${st.bg} font-black text-xs text-slate-950 shadow-md text-left active:scale-95 transition flex items-center justify-between`}
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
                                                onClick={() => handleAddEmoji(em)}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-125 transition flex items-center justify-center"
                                            >
                                                {em}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: MENCIONES */}
                    {activeTool === 'mentions' && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-6 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <AtSign className="w-5 h-5 text-lime-400" /> Etiquetar Jugador
                                </h3>
                                <button onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
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
                                        onClick={() => handleAddMention(u)}
                                        className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-between active:scale-[0.99] transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center font-bold text-lime-400">
                                                {u.profile_picture_url ? (
                                                    <img src={u.profile_picture_url} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    u.name[0]
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm text-white">{u.name} {u.lastname || ''}</p>
                                                <p className="text-xs text-slate-400">Rol: {u.role}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}

                                {!isSearchingUsers && mentionQuery && mentionResults.length === 0 && (
                                    <div className="text-center py-8 text-sm text-slate-400">
                                        No se encontraron jugadores con ese nombre.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODAL: UBICACIÓN */}
                    {activeTool === 'location' && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-6 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-400" /> Agregar Ubicación
                                </h3>
                                <button onClick={() => setActiveTool('none')} className="p-2 text-white/70 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1">
                                <p className="text-xs text-slate-400 font-medium mb-3">Sedes del Torneo & Canchas:</p>
                                {institutions.map((inst) => (
                                    <button 
                                        key={inst.id}
                                        onClick={() => handleAddLocation(inst.name, inst.id)}
                                        className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-between text-left active:scale-[0.99] transition"
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
                                    onClick={() => handleAddLocation('Cancha Central')}
                                    className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-white/15 flex items-center gap-3 text-left"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold text-xs">
                                        🎾
                                    </div>
                                    <p className="font-bold text-sm text-white">Cancha Central</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};