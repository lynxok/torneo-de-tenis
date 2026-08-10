
import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Mail, Bell, Plus, Search, Send, Megaphone, Users, User, X, CheckCheck, Loader2, ChevronDown, Trash2 } from 'lucide-react';

interface MessagesProps {
    user: UserProfile;
    onRefreshNotifications?: () => void;
}

export const Messages: React.FC<MessagesProps> = ({ user, onRefreshNotifications }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    useEffect(() => {
        loadInbox();
    }, [user]);

    const loadInbox = () => {
        setLoading(true);
        api.messages.getInbox(user).then(setMessages).finally(() => setLoading(false));
    };

    const handleMessageSent = () => {
        setShowCompose(false);
        loadInbox(); // Refresh list to show sent message
    };

    const handleDelete = async (e: React.MouseEvent, msgId: string) => {
        e.stopPropagation(); // Prevent opening the message
        if (!window.confirm("¿Seguro que quieres borrar este mensaje?")) return;

        // Optimistic update
        setMessages(prev => prev.filter(m => m.id !== msgId));

        try {
            await api.messages.delete(msgId);
        } catch (error) {
            console.error("Error deleting message:", error);
            loadInbox(); // Revert on error
        }
    };

    const handleOpenMessage = async (msg: Message) => {
        // 1. Set as selected to open modal
        setSelectedMessage(msg);

        // 2. If unread, mark as read in backend
        if (!msg.is_read) {
            // Update local state UI instantly for better UX
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));

            try {
                await api.messages.markAsRead(msg.id);
                // 3. Trigger global badge refresh
                if (onRefreshNotifications) {
                    onRefreshNotifications();
                }
            } catch (e) {
                console.error("Error marking message as read", e);
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-up h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Mail className="text-primary" /> Mensajes
                </h2>
                <button
                    id="btn-new-message"
                    onClick={() => setShowCompose(true)}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={18} /> Nuevo Mensaje
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {loading ? (
                    <div className="text-center py-20 text-muted">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-muted">
                        No tienes mensajes nuevos.
                    </div>
                ) : (
                    messages.map(msg => (
                        <Card
                            key={msg.id}
                            className={`flex gap-4 cursor-pointer hover:bg-white/5 transition-all group ${!msg.is_read ? 'bg-white/5 border-l-4 border-l-primary' : 'opacity-80'}`}
                            onClick={() => handleOpenMessage(msg)}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${msg.type.includes('broadcast') ? 'bg-purple-500/20 text-purple-400' :
                                    !msg.is_read ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-muted'
                                }`}>
                                {msg.type.includes('broadcast') ? <Megaphone size={20} /> : <User size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold truncate ${!msg.is_read ? 'text-white' : 'text-slate-300'}`}>
                                        {msg.subject}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted whitespace-nowrap">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={(e) => handleDelete(e, msg.id)}
                                            className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Borrar mensaje"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-primary/80 mb-0.5 font-medium flex items-center gap-1">
                                    {msg.sender_name}
                                    {msg.type.includes('broadcast') && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 rounded uppercase ml-1">Difusión</span>}
                                </p>
                                <p className="text-sm text-muted truncate">{msg.content}</p>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* COMPOSE MODAL */}
            {showCompose && (
                <ComposeModal user={user} onClose={() => setShowCompose(false)} onSent={handleMessageSent} />
            )}

            {/* READ MESSAGE MODAL */}
            {selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <button onClick={() => setSelectedMessage(null)} className="absolute top-4 right-4 text-muted hover:text-white"><X size={20} /></button>

                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                {selectedMessage.type.includes('broadcast') && <Megaphone size={16} className="text-purple-400" />}
                                <span className="text-xs text-muted uppercase font-bold">{selectedMessage.sender_name}</span>
                                <span className="text-muted text-xs">• {new Date(selectedMessage.created_at).toLocaleString()}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">{selectedMessage.subject}</h3>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl text-slate-200 text-sm whitespace-pre-wrap leading-relaxed border border-white/5 min-h-[150px]">
                            {selectedMessage.content}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setSelectedMessage(null)} className="text-primary hover:text-white text-sm font-medium transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPOSE MODAL ---

const ComposeModal = ({ user, onClose, onSent }: { user: UserProfile, onClose: () => void, onSent: () => void }) => {
    const [sending, setSending] = useState(false);
    const [recipientType, setRecipientType] = useState<'individual' | 'broadcast_admins' | 'broadcast_players'>('individual');
    const [receiverId, setReceiverId] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [userList, setUserList] = useState<UserProfile[]>([]);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load users initially
        api.auth.getAllProfiles().then(setUserList);
    }, []);

    useEffect(() => {
        // Click outside to close dropdown
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsSearching(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);

        if (recipientType === 'individual' && !receiverId) {
            alert("Por favor selecciona un destinatario.");
            setSending(false);
            return;
        }

        try {
            const messageData: Partial<Message> = {
                sender_id: user.id,
                sender_name: `${user.name} ${user.lastname || ''}`,
                type: recipientType === 'individual' ? 'direct' : recipientType === 'broadcast_admins' ? 'broadcast_admins' : 'broadcast_institution',
                receiver_id: recipientType === 'individual' ? receiverId : undefined,
                institution_id: user.institution_id, // For broadcast filtering
                subject,
                content,
                is_read: false
            };

            await api.messages.send(messageData);
            onSent();
        } catch (error) {
            console.error(error);
            alert("Error al enviar mensaje");
        } finally {
            setSending(false);
        }
    };

    const canBroadcastAdmins = user.role === 'superadmin';
    const canBroadcastPlayers = user.role === 'admin' || user.role === 'superadmin';

    // Logic for User Search: Filter users but default to ALL if searchTerm is empty
    const filteredUsers = userList.filter(u =>
        u.id !== user.id &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.lastname && u.lastname.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const selectedUser = userList.find(u => u.id === receiverId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div id="compose-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Send size={18} /> Redactar Mensaje</h3>
                    <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSend} className="p-5 space-y-4 overflow-y-auto">

                    {/* Recipient Type Selection */}
                    {(canBroadcastAdmins || canBroadcastPlayers) && (
                        <div className="flex gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => { setRecipientType('individual'); setReceiverId(''); setSearchTerm(''); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${recipientType === 'individual' ? 'bg-primary text-white border-primary' : 'bg-white/5 text-muted border-white/10'}`}
                            >
                                Individual
                            </button>
                            {canBroadcastPlayers && (
                                <button
                                    type="button"
                                    onClick={() => setRecipientType('broadcast_players')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${recipientType === 'broadcast_players' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white/5 text-muted border-white/10'}`}
                                >
                                    A mis Jugadores
                                </button>
                            )}
                            {canBroadcastAdmins && (
                                <button
                                    type="button"
                                    onClick={() => setRecipientType('broadcast_admins')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${recipientType === 'broadcast_admins' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 text-muted border-white/10'}`}
                                >
                                    A Organizadores
                                </button>
                            )}
                        </div>
                    )}

                    {/* Dynamic Recipient Field */}
                    {recipientType === 'individual' ? (
                        <div className="space-y-1 relative" ref={wrapperRef}>
                            <label className="text-xs text-muted uppercase font-bold">Destinatario</label>

                            {receiverId && selectedUser ? (
                                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                            {selectedUser.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{selectedUser.name} {selectedUser.lastname}</div>
                                            <div className="text-xs text-muted">{selectedUser.role}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setReceiverId(''); setSearchTerm(''); setIsSearching(true); }}
                                        className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 text-muted pointer-events-none" size={16} />
                                    <input
                                        type="text"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        placeholder="Escribe para buscar o selecciona..."
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setIsSearching(true); }}
                                        onFocus={() => setIsSearching(true)}
                                    />
                                    <ChevronDown className="absolute right-3 top-3.5 text-muted pointer-events-none" size={16} />

                                    {isSearching && (
                                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                            {filteredUsers.length === 0 ? (
                                                <div className="p-3 text-xs text-muted text-center">
                                                    {searchTerm ? 'No se encontraron usuarios.' : 'Cargando usuarios...'}
                                                </div>
                                            ) : (
                                                filteredUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setReceiverId(u.id);
                                                            setSearchTerm('');
                                                            setIsSearching(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 border-b border-white/5 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{u.name} {u.lastname}</div>
                                                            <div className="text-xs text-muted">{u.institution || 'Sin Club'} • {u.role}</div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`p-3 rounded-xl border ${recipientType === 'broadcast_admins' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-purple-500/10 border-purple-500/20'} flex items-center gap-3`}>
                            <Megaphone className={recipientType === 'broadcast_admins' ? 'text-orange-400' : 'text-purple-400'} size={20} />
                            <div>
                                <div className={`text-sm font-bold ${recipientType === 'broadcast_admins' ? 'text-orange-400' : 'text-purple-400'}`}>
                                    {recipientType === 'broadcast_admins' ? 'Difusión a Organizadores' : 'Difusión a todos los jugadores'}
                                </div>
                                <div className="text-xs text-muted">
                                    {recipientType === 'broadcast_admins'
                                        ? 'Este mensaje se enviará a todos los administradores del sistema.'
                                        : `Se enviará a todos los jugadores registrados en ${user.institution || 'tu institución'}.`}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs text-muted uppercase font-bold">Asunto</label>
                        <input
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm font-bold"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            required
                            placeholder="Ej: Cambio de horario..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted uppercase font-bold">Mensaje</label>
                        <textarea
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary min-h-[150px] resize-none text-sm"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            placeholder="Escribe tu mensaje aquí..."
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {sending ? <><Loader2 className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Mensaje</>}
                    </button>
                </form>
            </div>
        </div>
    );
};
