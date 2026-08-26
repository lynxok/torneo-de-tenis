import React, { useEffect, useState } from 'react';
import { Booking, UserProfile, Institution, BookingParticipant, WaitlistEntry } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { formatPlayerName } from '../utils/formatters';
import { soundEffects } from '../services/soundEffects';
import { 
    Calendar, Clock, MapPin, X, Loader2, CheckCircle2, DollarSign, Lock, ChevronLeft, ChevronRight, 
    Trash2, Trophy, Grid, Repeat, GraduationCap, AlertCircle, Plus, Search, Building as BuildingIcon, 
    ArrowRight, Edit, AlertTriangle, CalendarX, Settings2, Smartphone, Wallet, Award, Sun, Moon, Info, 
    Sparkles, ShieldCheck, Star, Share2, MessageCircle, CloudRain, CloudLightning, Users, Check, Flame,
    User
} from 'lucide-react';

export const Bookings: React.FC<{ user: UserProfile }> = ({ user }) => {
  if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'professor') {
      return <AdminBookingManager user={user} />;
  }
  return <PlayerBookings user={user} />;
};

const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekday = weekdays[dateObj.getDay()] || 'Día';
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');

    if (dateStr === todayStr) {
        return `Hoy - ${weekday} ${dayStr}/${monthStr}`;
    } else if (dateStr === tomorrowStr) {
        return `Mañana - ${weekday} ${dayStr}/${monthStr}`;
    } else {
        return `${weekday} ${dayStr}/${monthStr}/${y}`;
    }
};

interface MatchParticipantSelectorProps {
    matchType: 'singles' | 'doubles';
    onMatchTypeChange: (type: 'singles' | 'doubles') => void;
    participants: BookingParticipant[];
    onChange: (participants: BookingParticipant[]) => void;
    currentUser?: UserProfile;
    isAdmin?: boolean;
}

const MatchParticipantSelector: React.FC<MatchParticipantSelectorProps> = ({
    matchType,
    onMatchTypeChange,
    participants,
    onChange,
    currentUser,
    isAdmin = false
}) => {
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [activeSearchSlot, setActiveSearchSlot] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.auth.getAllProfiles(1, 200).then(setAllProfiles).catch(console.error);
    }, []);

    const targetSlotsCount = matchType === 'singles' ? 2 : 4;

    // Slot metadata definitions
    const getSlotInfo = (index: number) => {
        if (matchType === 'singles') {
            if (index === 0) return { label: 'Jugador 1 (Titular / Anfitrión)', teamLabel: 'Jugador 1', color: 'text-primary' };
            return { label: 'Jugador 2 (Rival / Oponente)', teamLabel: 'Jugador 2', color: 'text-amber-400' };
        } else {
            if (index === 0) return { label: 'Pareja 1 - Jugador 1 (Titular)', teamLabel: 'Pareja 1', color: 'text-primary' };
            if (index === 1) return { label: 'Pareja 1 - Jugador 2 (Compañero)', teamLabel: 'Pareja 1', color: 'text-primary' };
            if (index === 2) return { label: 'Pareja 2 - Jugador 1 (Rival 1)', teamLabel: 'Pareja 2', color: 'text-blue-400' };
            return { label: 'Pareja 2 - Jugador 2 (Rival 2)', teamLabel: 'Pareja 2', color: 'text-blue-400' };
        }
    };

    const handleSelectRegistered = (slotIndex: number, p: UserProfile) => {
        const formatted = formatPlayerName(p.name, p.lastname);
        const newPart: BookingParticipant = {
            user_id: p.id,
            name: formatted,
            lastname: p.lastname,
            is_registered: true,
            avatar_url: p.profile_picture_url || (p as any).avatar_url,
            dni: p.dni,
            phone: p.phone
        };
        const next = [...participants];
        next[slotIndex] = newPart;
        onChange(next.slice(0, targetSlotsCount));
        setActiveSearchSlot(null);
        setSearchTerm('');
    };

    const handleSelectUnregistered = (slotIndex: number) => {
        const newPart: BookingParticipant = {
            name: 'Jugador no registrado en app',
            is_registered: false
        };
        const next = [...participants];
        next[slotIndex] = newPart;
        onChange(next.slice(0, targetSlotsCount));
        setActiveSearchSlot(null);
        setSearchTerm('');
    };

    const handleRemoveSlot = (slotIndex: number) => {
        const next = [...participants];
        const sanitized: BookingParticipant[] = [];
        for (let i = 0; i < targetSlotsCount; i++) {
            if (i !== slotIndex && next[i]) {
                sanitized[i] = next[i];
            }
        }
        onChange(sanitized);
        if (activeSearchSlot === slotIndex) {
            setActiveSearchSlot(null);
            setSearchTerm('');
        }
    };

    const handleToggleType = (type: 'singles' | 'doubles') => {
        if (type === matchType) return;
        onMatchTypeChange(type);
        if (type === 'singles') {
            onChange(participants.slice(0, 2));
        } else {
            const next = [...participants];
            onChange(next);
        }
    };

    // Filter profiles matching search term (Name, Lastname, DNI, Phone, Institution)
    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanDigits = cleanSearch.replace(/[^0-9]/g, '');
    const filteredProfiles = allProfiles.filter(p => {
        // Exclude if already selected in another slot
        const isAlreadySelected = participants.some((item, idx) => idx !== activeSearchSlot && item && item.user_id === p.id);
        if (isAlreadySelected) return false;
        if (!cleanSearch) return true;

        const fullName = `${p.name} ${p.lastname || ''}`.toLowerCase();
        const dni = (p.dni || '').toLowerCase();
        const phone = (p.phone || '').replace(/[^0-9]/g, '');
        const inst = (p.institution || '').toLowerCase();

        const matchName = fullName.includes(cleanSearch);
        const matchDni = dni.includes(cleanSearch);
        const matchPhone = Boolean(cleanDigits && phone && phone.includes(cleanDigits));
        const matchInst = inst.includes(cleanSearch);

        return matchName || matchDni || matchPhone || matchInst;
    }).slice(0, 6);

    const filledCount = participants.slice(0, targetSlotsCount).filter(p => p && p.name).length;
    const isAllFilled = filledCount === targetSlotsCount;
    const isAllRegistered = isAllFilled && participants.slice(0, targetSlotsCount).every(p => p && p.is_registered === true);

    return (
        <div className="space-y-3.5 bg-white/5 p-4 rounded-2xl border border-white/10">
            {/* Header: Modality Selector (Singles vs Dobles) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs text-muted uppercase font-black tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-primary" /> Modalidad de Juego (Obligatorio)
                    </label>
                    <span className="text-[11px] font-bold text-primary">
                        {matchType === 'singles' ? '1 vs 1 (2 Jugadores)' : '2 vs 2 (4 Jugadores)'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => handleToggleType('singles')}
                        className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            matchType === 'singles'
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        🎾 Singles (2 Jugadores)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleToggleType('doubles')}
                        className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            matchType === 'doubles'
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                                : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        👥 Dobles (4 Jugadores)
                    </button>
                </div>
            </div>

            {/* Slots List */}
            <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[10.5px] text-muted font-bold uppercase">
                    <span>Jugadores Asignados ({filledCount}/{targetSlotsCount})</span>
                    <span>Búsqueda por Nombre, DNI o Celular</span>
                </div>

                <div className="space-y-2">
                    {Array.from({ length: targetSlotsCount }).map((_, slotIdx) => {
                        const participant = participants[slotIdx];
                        const slotInfo = getSlotInfo(slotIdx);
                        const isSelf = currentUser && participant?.user_id === currentUser.id;
                        const isSearchingThisSlot = activeSearchSlot === slotIdx;

                        return (
                            <div 
                                key={slotIdx} 
                                className={`rounded-xl border transition-all ${
                                    participant 
                                        ? (participant.is_registered 
                                            ? 'bg-slate-900/90 border-primary/30 p-2.5 shadow-sm' 
                                            : 'bg-amber-950/20 border-amber-500/30 p-2.5')
                                        : (isSearchingThisSlot 
                                            ? 'bg-slate-900 border-primary p-2.5 shadow-lg ring-1 ring-primary/30' 
                                            : 'bg-black/30 border-white/10 p-2 hover:border-white/20')
                                }`}
                            >
                                {participant ? (
                                    /* FILLED SLOT */
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Avatar or Icon */}
                                            {participant.avatar_url ? (
                                                <img 
                                                    src={participant.avatar_url} 
                                                    alt={participant.name} 
                                                    className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0" 
                                                />
                                            ) : (
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                    participant.is_registered ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                }`}>
                                                    {participant.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] text-muted font-bold uppercase">{slotInfo.label}:</span>
                                                    <span className="text-xs font-bold text-white truncate max-w-[180px]">
                                                        {participant.name}
                                                    </span>
                                                    {isSelf && (
                                                        <span className="text-[9px] bg-primary text-dark font-black px-1.5 py-0.2 rounded uppercase">Tú</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {participant.is_registered ? (
                                                        <span className="text-[9.5px] bg-green-500/15 text-green-300 border border-green-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                                            <CheckCircle2 size={10} /> Socio Registrado
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9.5px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                                            <AlertCircle size={10} /> No Registrado en App
                                                        </span>
                                                    )}
                                                    {participant.dni && (
                                                        <span className="text-[9.5px] text-muted">DNI: {participant.dni}</span>
                                                    )}
                                                    {participant.phone && !participant.dni && (
                                                        <span className="text-[9.5px] text-muted">Tel: {participant.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remove / Change Action */}
                                        {(!isSelf || isAdmin) && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSlot(slotIdx)}
                                                className="p-1 text-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                                                title="Quitar / Cambiar jugador"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    /* EMPTY SLOT WITH ACTIVE SEARCH */
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${slotIdx < 2 ? 'bg-primary' : 'bg-blue-400'}`}></span>
                                                {slotInfo.label}
                                            </span>
                                            {isSearchingThisSlot && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveSearchSlot(null); setSearchTerm(''); }}
                                                    className="text-[10px] text-muted hover:text-white"
                                                >
                                                    Cerrar
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 text-muted" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Buscar socio por Nombre, DNI o Celular..."
                                                className="w-full bg-sidebar border border-white/15 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
                                                value={isSearchingThisSlot ? searchTerm : ''}
                                                onFocus={() => {
                                                    setActiveSearchSlot(slotIdx);
                                                    setSearchTerm('');
                                                }}
                                                onChange={e => {
                                                    setActiveSearchSlot(slotIdx);
                                                    setSearchTerm(e.target.value);
                                                }}
                                            />
                                        </div>

                                        {/* Dropdown with results and standardized Non-Registered Button */}
                                        {isSearchingThisSlot && (
                                            <div className="mt-1.5 bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-20 space-y-1 p-1">
                                                <div className="text-[10px] text-muted uppercase font-black px-2 py-1 flex justify-between items-center border-b border-white/5">
                                                    <span>Socios Registrados</span>
                                                    <span>{filteredProfiles.length} coincidencia(s)</span>
                                                </div>

                                                <div className="max-h-44 overflow-y-auto space-y-0.5 custom-scrollbar">
                                                    {filteredProfiles.length > 0 ? (
                                                        filteredProfiles.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => handleSelectRegistered(slotIdx, p)}
                                                                className="w-full text-left p-2 hover:bg-primary/20 rounded-lg flex items-center justify-between text-xs transition-colors group"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {p.profile_picture_url || (p as any).avatar_url ? (
                                                                        <img 
                                                                            src={p.profile_picture_url || (p as any).avatar_url} 
                                                                            alt={p.name} 
                                                                            className="w-6 h-6 rounded-full object-cover border border-white/20 shrink-0" 
                                                                        />
                                                                    ) : (
                                                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                            {p.name.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <div className="font-bold text-white truncate flex items-center gap-1.5">
                                                                            <span>{formatPlayerName(p.name, p.lastname)}</span>
                                                                            {p.category && (
                                                                                <span className="text-[9px] bg-white/10 px-1.5 py-0.2 rounded text-muted">
                                                                                    {p.category}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] text-muted flex items-center gap-2 truncate">
                                                                            {p.dni && <span>DNI: {p.dni}</span>}
                                                                            {p.phone && <span>Tel: {p.phone}</span>}
                                                                            {p.institution && <span className="truncate max-w-[90px]">({p.institution})</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Plus size={14} className="text-primary opacity-70 group-hover:opacity-100 shrink-0" />
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-center text-xs text-muted italic">
                                                            No se encontraron socios registrados para "{searchTerm}"
                                                        </div>
                                                    )}
                                                </div>

                                                {/* STANDARDIZED OPTION: Jugador no registrado */}
                                                <div className="pt-1 border-t border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectUnregistered(slotIdx)}
                                                        className="w-full text-left p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold flex items-center justify-between border border-amber-500/20 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle size={14} className="text-amber-400 shrink-0" />
                                                            <div>
                                                                <div>👤 Jugador no registrado en la app</div>
                                                                <div className="text-[9.5px] text-amber-400/80 font-normal">
                                                                    Se reserva el turno sin computar para el historial
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Live Warning / Status Banner */}
            {!isAllRegistered ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                        <div className="font-bold text-amber-200 uppercase tracking-wider text-[10.5px]">
                            Aviso de Historial y Resultados
                        </div>
                        <p className="text-amber-300 font-bold text-xs leading-snug">
                            Se reserva el turno pero el partido no contará para el historial de resultados.
                        </p>
                        <p className="text-[10.5px] text-amber-300/80 leading-normal">
                            {!isAllFilled
                                ? `Faltan asignar ${targetSlotsCount - filledCount} de los ${targetSlotsCount} jugadores requeridos para ${matchType === 'singles' ? 'Singles' : 'Dobles'}.`
                                : `Uno o más participantes fueron seleccionados como "No registrado en app". Para que el partido sume estadísticas y cuente para el historial oficial (H2H), todos los ${targetSlotsCount} jugadores deben ser socios registrados.`
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in">
                    <ShieldCheck size={18} className="text-green-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                        <div className="font-bold text-green-200 uppercase tracking-wider text-[10.5px]">
                            ✓ Partido Oficial Habilitado ({matchType === 'singles' ? 'Singles 1 vs 1' : 'Dobles 2 vs 2'})
                        </div>
                        <p className="text-green-300 font-bold text-xs leading-snug">
                            Todos los {targetSlotsCount} jugadores son socios registrados en la app.
                        </p>
                        <p className="text-[10.5px] text-green-300/80 leading-normal">
                            El partido computará para el historial de resultados, estadísticas personales y registro Head to Head (H2H).
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlayerBookings: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_bookings' | 'clubs_catalog'>('my_bookings');
  const [statusFilter, setStatusFilter] = useState<'active' | 'history'>('active');
  const [clubSearch, setClubSearch] = useState('');
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [selectedClubIdForBooking, setSelectedClubIdForBooking] = useState<string | undefined>(undefined);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [bookingsData, instData] = await Promise.all([
            api.bookings.getByUser(user.id),
            api.institutions.getAll()
        ]);
        const activeInst = (instData || []).filter(i => i.is_active !== false);
        setBookings(bookingsData || []);
        setInstitutions(activeInst);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const isModifiable = (booking: Booking) => {
      if (booking.status === 'cancelled' || booking.status === 'rejected') return false;
      
      const bookingDate = new Date(`${booking.date}T${booking.start_time}`);
      const now = new Date();
      const diffMs = bookingDate.getTime() - now.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      
      return diffHrs >= 24;
  };

  const handleCancel = async (booking: Booking) => {
      if (!confirm('¿Estás seguro de cancelar esta reserva? Esta acción liberará la cancha.')) return;
      try {
          await api.bookings.update(booking.id, { status: 'cancelled' });
          addToast('Reserva cancelada correctamente. Se movió a tu historial.', 'info');
          setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      } catch (e) {
          addToast('Error al cancelar la reserva.', 'error');
      }
  };

  const handleDeletePermanently = async (booking: Booking) => {
      if (!confirm('¿Deseas eliminar definitivamente este turno de tu historial?')) return;
      try {
          setBookings(prev => prev.filter(b => b.id !== booking.id));
          await api.bookings.delete(booking.id);
          addToast('Reserva eliminada definitivamente del historial.', 'success');
      } catch (e) {
          addToast('Error al eliminar la reserva.', 'error');
          loadData();
      }
  };

  const handleRescheduleClick = (booking: Booking) => {
      setBookingToReschedule(booking);
      setSelectedClubIdForBooking(booking.institution_id);
      setShowNewBooking(true);
  };

  const handleBookAtClub = (clubId: string) => {
      setBookingToReschedule(null);
      setSelectedClubIdForBooking(clubId);
      setShowNewBooking(true);
  };

  const filteredClubs = institutions.filter(inst => 
      inst.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
      (inst.city && inst.city.toLowerCase().includes(clubSearch.toLowerCase()))
  );

  const activeBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');
  const historyBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');
  const displayedBookings = statusFilter === 'active' ? activeBookings : historyBookings;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
        <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Reservas de Canchas</h2>
            <p className="text-muted text-sm">Gestiona tus partidos y consulta los clubes disponibles con sus tarifas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* View Switcher */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
                <button
                    onClick={() => setActiveTab('my_bookings')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'my_bookings' 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'text-muted hover:text-white'
                    }`}
                >
                    <Calendar size={14} /> Mis Turnos ({bookings.length})
                </button>
                <button
                    onClick={() => setActiveTab('clubs_catalog')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'clubs_catalog' 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'text-muted hover:text-white'
                    }`}
                >
                    <BuildingIcon size={14} /> Ver Clubes y Tarifas ({institutions.length})
                </button>
            </div>

            <button 
                id="btn-player-book"
                onClick={() => { setBookingToReschedule(null); setSelectedClubIdForBooking(undefined); setShowNewBooking(true); }}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 text-xs"
            >
                <Plus size={16} /> Reservar Ahora
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted">Cargando información...</div>
      ) : activeTab === 'my_bookings' ? (
        /* MY BOOKINGS TAB */
        <div className="space-y-4">
            {/* Sub-pills for Active vs History */}
            <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-white/10 w-fit text-xs font-bold">
                <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === 'active' 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-muted hover:text-white'
                    }`}
                >
                    Turnos Próximos ({activeBookings.length})
                </button>
                <button
                    onClick={() => setStatusFilter('history')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                        statusFilter === 'history' 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-muted hover:text-white'
                    }`}
                >
                    Historial / Cancelados ({historyBookings.length})
                </button>
            </div>

            {displayedBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-2xl text-muted">
                    <Calendar size={44} className="mb-3 opacity-40 text-primary" />
                    <p className="font-bold text-white text-base">
                        {statusFilter === 'active' ? 'No tienes turnos próximos activos.' : 'No tienes reservas en el historial.'}
                    </p>
                    <p className="text-xs text-muted mt-1">
                        {statusFilter === 'active' ? 'Explora los clubes y reserva tu cancha en el horario que prefieras.' : 'Tus reservas canceladas o pasadas se listarán aquí.'}
                    </p>
                    {statusFilter === 'active' && (
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setActiveTab('clubs_catalog')} className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors">
                                Ver Tarifario de Clubes
                            </button>
                            <button onClick={() => { setBookingToReschedule(null); setSelectedClubIdForBooking(undefined); setShowNewBooking(true); }} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors">
                                Hacer una Reserva
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedBookings.map(booking => {
                        const canModify = isModifiable(booking);
                        const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected';

                        return (
                            <Card key={booking.id} className={`relative overflow-hidden group hover:border-white/20 transition-all ${isCancelled ? 'opacity-70 grayscale-[30%]' : ''}`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCancelled ? 'bg-red-500' : booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                <div className="pl-2">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold uppercase text-muted flex items-center gap-1">
                                            <Calendar size={12} className="text-primary" /> {formatFriendlyDate(booking.date)}
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black ${
                                            isCancelled ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        }`}>
                                            {isCancelled ? 'Cancelada' : booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-extrabold text-white text-xl leading-none mb-1">
                                        {booking.start_time} <span className="text-sm text-muted font-normal">- {booking.end_time}</span>
                                    </h3>
                                    <div className="text-sm text-primary font-bold mb-2">{booking.institutions?.name}</div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 p-2 rounded-lg">
                                        <MapPin size={12} className="text-primary" /> {booking.court_name}
                                    </div>

                                    {/* Participating Players Tags */}
                                    {booking.participants && booking.participants.length > 0 && (
                                        <div className="mt-2.5 bg-white/5 p-2 rounded-lg border border-white/5 space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-muted font-bold uppercase">
                                                <span className="flex items-center gap-1">
                                                    <Users size={11} className="text-primary" /> {booking.match_type === 'doubles' || booking.participants.length > 2 ? 'Dobles' : 'Singles'} ({booking.participants.length}):
                                                </span>
                                                {booking.counts_for_stats || (booking.extras as any)?.counts_for_stats ? (
                                                    <span className="text-[9px] text-green-300 font-black flex items-center gap-0.5">
                                                        <ShieldCheck size={10} /> Oficial
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-amber-400 font-medium flex items-center gap-0.5" title="No computa para historial">
                                                        <AlertTriangle size={10} /> Sin Historial
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {booking.participants.map((p, idx) => (
                                                    <span key={idx} className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold truncate max-w-full border ${
                                                        p.is_registered ? 'bg-primary/20 border-primary/30 text-white' : 'bg-amber-500/20 border-amber-500/30 text-amber-200'
                                                    }`}>
                                                        {p.name} {p.user_id === user.id ? '(Tú)' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {booking.total_price > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-xs text-muted">Total abonado / estimado</span>
                                            <span className="text-sm font-bold text-white">${booking.total_price}</span>
                                        </div>
                                    )}
                                    {booking.extras && (
                                        <div className="mt-2 text-[10px] text-muted flex flex-wrap gap-2">
                                            {booking.extras.rackets > 0 && <span className="bg-white/5 px-1.5 py-0.5 rounded">Raquetas: {booking.extras.rackets}</span>}
                                            {booking.extras.balls && <span className="bg-white/5 px-1.5 py-0.5 rounded">Pelotas: Sí</span>}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                                        {!isCancelled ? (
                                            canModify ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleRescheduleClick(booking)}
                                                        className="flex-1 py-2 bg-white/5 hover:bg-primary/20 hover:text-primary text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Edit size={14} /> Reprogramar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCancel(booking)}
                                                        className="py-2 px-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                        title="Cancelar Reserva"
                                                    >
                                                        <CalendarX size={14} /> Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full py-2 text-[10px] text-center text-muted bg-white/5 rounded-lg flex items-center justify-center gap-1 opacity-70">
                                                    <AlertTriangle size={12} /> Cambios cerrados (24h)
                                                </div>
                                            )
                                        ) : (
                                            <button
                                                onClick={() => handleDeletePermanently(booking)}
                                                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-red-500/20"
                                            >
                                                <Trash2 size={14} /> Eliminar del historial
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
      ) : (
        /* ALL CLUBS & TARIFFS CATALOG TAB */
        <div className="space-y-6">
            {/* Search & Info Banner */}
            <div className="bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900 border border-primary/20 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Award size={18} /> Tarifario y Beneficios Exclusivos de Socios
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl">
                        A los <strong>socios oficiales</strong> de cada institución se les aplica automáticamente una <strong>tarifa preferencial</strong> en todos los turnos. Si aún no eres socio de una sede, podrás reservar igualmente con la tarifa de invitado.
                    </p>
                </div>

                <div className="relative w-full md:w-64 shrink-0">
                    <Search className="absolute left-3 top-2.5 text-muted" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar club o ciudad..." 
                        className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                        value={clubSearch}
                        onChange={e => setClubSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Clubs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredClubs.map(inst => {
                    const isMemberOfThisClub = api.memberships.isMemberOf(user, inst.id);
                    const isPrimaryClub = user.institution_id === inst.id || user.memberships?.some(m => m.institution_id === inst.id && m.is_primary);
                    const hasMemberPricing = Boolean(inst.price_member_day || inst.price_member_night);
                    const minSlotDuration = inst.config_booking_min_duration || 60;

                    return (
                        <Card key={inst.id} className="p-5 flex flex-col justify-between border-white/10 hover:border-primary/40 transition-all bg-card shadow-lg">
                            <div className="space-y-4">
                                {/* Club Header */}
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white tracking-tight">{inst.name}</h3>
                                            {isPrimaryClub ? (
                                                <span className="text-[10px] bg-primary text-dark px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm">
                                                    <Star size={10} className="fill-dark" /> Club Principal
                                                </span>
                                            ) : isMemberOfThisClub ? (
                                                <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <Award size={10} /> Socio Activo
                                                </span>
                                            ) : null}
                                        </div>
                                        {inst.city && (
                                            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                                <MapPin size={12} /> {inst.city} {inst.address ? `• ${inst.address}` : ''}
                                            </div>
                                        )}
                                    </div>

                                    {hasMemberPricing ? (
                                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                            <Sparkles size={12} /> Tarifa de Socio Disponible
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-white/5 text-muted px-2 py-1 rounded-lg font-medium">
                                            Tarifa Única
                                        </span>
                                    )}
                                </div>

                                {/* Court & Shift Info */}
                                <div className="flex items-center gap-3 text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl">
                                    <div className="flex items-center gap-1">
                                        <Sun size={14} className="text-amber-400" />
                                        <span>{inst.courts_without_light || 0} canchas sin luz</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <div className="flex items-center gap-1">
                                        <Moon size={14} className="text-blue-400" />
                                        <span>{inst.courts_with_light || 0} con luz artificial</span>
                                    </div>
                                    <div className="w-px h-3 bg-white/10"></div>
                                    <div className="text-muted text-[11px]">
                                        Turno: {minSlotDuration}m
                                    </div>
                                </div>

                                {/* Explicit Notice for Members */}
                                <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl space-y-2">
                                    <div className="text-[11px] text-primary font-bold flex items-center gap-1.5">
                                        <Info size={14} /> Tarifa Preferencial para Socios
                                    </div>
                                    <p className="text-[11px] text-slate-300">
                                        A los socios oficiales de <strong>{inst.name}</strong> se les otorga un descuento preferencial en cada turno reservado.
                                    </p>

                                    {/* Comparative Pricing Table */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {/* Member Rate Box */}
                                        <div className={`p-2.5 rounded-lg border ${isMemberOfThisClub ? 'bg-primary/20 border-primary shadow-sm' : 'bg-black/30 border-white/5'}`}>
                                            <div className="text-[10px] font-bold text-primary uppercase flex items-center justify-between">
                                                <span>Tarifa Socios</span>
                                                {isMemberOfThisClub && <span className="text-[9px] text-green-300 font-bold">✓ Tu Tarifa</span>}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                <div className="text-xs font-bold text-white flex justify-between">
                                                    <span className="text-muted font-normal">Diurno:</span> 
                                                    <span>${inst.price_member_day || inst.price_day || 0}</span>
                                                </div>
                                                <div className="text-xs font-bold text-white flex justify-between">
                                                    <span className="text-muted font-normal">Nocturno:</span> 
                                                    <span>${inst.price_member_night || inst.price_night || inst.price_member_day || inst.price_day || 0}</span>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-muted mt-1">Costo por turno ({minSlotDuration} min)</div>
                                        </div>

                                        {/* General / Guest Rate Box */}
                                        <div className={`p-2.5 rounded-lg border ${!isMemberOfThisClub ? 'bg-white/5 border-white/20 shadow-sm' : 'bg-black/30 border-white/5'}`}>
                                            <div className="text-[10px] font-bold text-muted uppercase flex items-center justify-between">
                                                <span>Invitados / No Socios</span>
                                                {!isMemberOfThisClub && <span className="text-[9px] text-amber-300 font-bold">✓ Tu Tarifa</span>}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                <div className="text-xs font-bold text-white flex justify-between">
                                                    <span className="text-muted font-normal">Diurno:</span> 
                                                    <span>${inst.price_day || 0}</span>
                                                </div>
                                                <div className="text-xs font-bold text-white flex justify-between">
                                                    <span className="text-muted font-normal">Nocturno:</span> 
                                                    <span>${inst.price_night || inst.price_day || 0}</span>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-muted mt-1">Costo por turno ({minSlotDuration} min)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Book Action Button & Share */}
                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => {
                                            const shareUrl = `${window.location.origin}/?club=${inst.id}`;
                                            navigator.clipboard.writeText(shareUrl);
                                            addToast('¡Link del club copiado al portapapeles!', 'success');
                                        }}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-primary transition-all border border-white/10"
                                        title="Copiar link directo del club"
                                    >
                                        <Share2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const shareUrl = `${window.location.origin}/?club=${inst.id}`;
                                            const message = encodeURIComponent(`🎾 ¡Te invito a jugar y reservar canchas en "${inst.name}" a través de Smash Tennis! Link directo: ${shareUrl}`);
                                            window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                                        }}
                                        className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-all"
                                        title="Compartir por WhatsApp"
                                    >
                                        <MessageCircle size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleBookAtClub(inst.id)}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
                                >
                                    Reservar Cancha <ArrowRight size={14} />
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
      )}

      {/* NEW BOOKING / RESCHEDULE MODAL */}
      {showNewBooking && (
          <PlayerNewBookingModal 
            user={user} 
            existingBooking={bookingToReschedule || undefined}
            initialInstitutionId={selectedClubIdForBooking}
            onClose={() => { setShowNewBooking(false); setBookingToReschedule(null); }} 
            onSuccess={() => {
                setShowNewBooking(false);
                setBookingToReschedule(null);
                loadData();
            }}
          />
      )}
    </div>
  );
};

const PlayerNewBookingModal = ({ 
    user, 
    existingBooking, 
    initialInstitutionId,
    onClose, 
    onSuccess 
}: { 
    user: UserProfile, 
    existingBooking?: Booking, 
    initialInstitutionId?: string,
    onClose: () => void, 
    onSuccess: () => void 
}) => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInstId, setSelectedInstId] = useState(initialInstitutionId || '');
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [extras, setExtras] = useState({ rackets: 0, balls: false });
    const [durationMultiplier, setDurationMultiplier] = useState(1);
    const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');
    const [participants, setParticipants] = useState<BookingParticipant[]>([]);
    const { addToast } = useToast();

    // Payment Flow State
    const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success'>('select');
    const [paymentMethod, setPaymentMethod] = useState<'mp' | 'cash'>('mp');

    const isReschedule = !!existingBooking;

    useEffect(() => {
        const selfName = formatPlayerName(user.name, user.lastname);
        const userPart: BookingParticipant = {
            user_id: user.id,
            name: selfName,
            lastname: user.lastname,
            is_registered: true,
            avatar_url: user.profile_picture_url || (user as any).avatar_url,
            dni: user.dni,
            phone: user.phone
        };

        if (existingBooking?.participants && existingBooking.participants.length > 0) {
            setParticipants(existingBooking.participants);
            setMatchType(existingBooking.match_type || (existingBooking.participants.length > 2 ? 'doubles' : 'singles'));
        } else {
            setParticipants([userPart]);
            setMatchType('singles');
        }
    }, [user, existingBooking]);

    useEffect(() => {
        api.institutions.getAll().then(data => {
            setInstitutions(data);
            
            if (isReschedule && existingBooking) {
                setSelectedInstId(existingBooking.institution_id);
                setDate(existingBooking.date);
                if (existingBooking.extras) setExtras(existingBooking.extras as any);
            } else if (initialInstitutionId) {
                setSelectedInstId(initialInstitutionId);
                setDate(new Date().toISOString().split('T')[0]);
            } else {
                if (user.institution_id) {
                    const exists = data.find(i => i.id === user.institution_id);
                    if (exists) {
                        setSelectedInstId(user.institution_id);
                    } else if (data.length > 0) {
                        setSelectedInstId(data[0].id);
                    }
                } else if (data.length > 0) {
                    setSelectedInstId(data[0].id);
                }
                setDate(new Date().toISOString().split('T')[0]);
            }
        });
    }, [user.institution_id, existingBooking, initialInstitutionId]);

    useEffect(() => {
        if (selectedInstId && date) {
            setLoadingSlots(true);
            setSelectedSlot(null);
            api.institutions.getCourtSlots(selectedInstId, date)
                .then(setSlots)
                .finally(() => setLoadingSlots(false));
        } else {
            setSlots([]);
        }
    }, [selectedInstId, date]);

    useEffect(() => {
        if (!isReschedule) {
            setExtras({ rackets: 0, balls: false });
            setDurationMultiplier(1);
        }
    }, [selectedInstId]);

    const handlePrevDay = () => {
        if (!date) return;
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() - 1);
        const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];
        if (newStr >= todayStr || isReschedule) {
            setDate(newStr);
        }
    };

    const handleNextDay = () => {
        if (!date) return;
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() + 1);
        const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        setDate(newStr);
    };

    const handleToday = () => {
        setDate(new Date().toISOString().split('T')[0]);
    };

    const selectedInst = institutions.find(i => i.id === selectedInstId);
    
    const minDuration = selectedInst?.config_booking_min_duration || 60;
    const maxSlots = selectedInst?.config_max_booking_slots || 4;

    const isUserMemberOfInst = api.memberships.isMemberOf(user, selectedInstId);

    const isNightSlot = (timeStr?: string) => {
        if (!timeStr || !selectedInst) return false;
        const nightStart = selectedInst.schedule_night_start || '18:00';
        return timeStr >= nightStart;
    };

    const getBaseHourlyPrice = () => {
        if (!selectedInst) return 0;
        const isNight = selectedSlot ? isNightSlot(selectedSlot.start_time) : false;

        if (isUserMemberOfInst) {
            if (isNight) {
                return selectedInst.price_member_night ?? selectedInst.price_night ?? selectedInst.price_member_day ?? selectedInst.price_day ?? 0;
            }
            return selectedInst.price_member_day ?? selectedInst.price_day ?? 0;
        } else {
            if (isNight) {
                return selectedInst.price_night ?? selectedInst.price_day ?? 0;
            }
            return selectedInst.price_day ?? 0;
        }
    };

    const calculateTotal = () => {
        if (!selectedInst) return 0;
        const base = getBaseHourlyPrice();
        let total = base * durationMultiplier;
        
        if (extras.rackets > 0 && selectedInst.price_racket) {
            total += extras.rackets * selectedInst.price_racket;
        }
        if (extras.balls && selectedInst.price_ball) {
            total += selectedInst.price_ball;
        }
        return total;
    };

    const addMinutes = (time: string, mins: number) => {
        const [h, m] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + mins, 0);
        return date.toTimeString().slice(0, 5);
    };

    const handleConfirm = async () => {
        if (!selectedSlot || !selectedInstId) return;
        
        setIsSubmitting(true);
        setPaymentStep('processing');

        setTimeout(async () => {
            try {
                const totalDuration = minDuration * durationMultiplier;
                const totalPrice = calculateTotal();
                
                const paymentStatus = paymentMethod === 'mp' ? 'completed' : 'pending';
                const bookingStatus = paymentMethod === 'mp' ? 'confirmed' : 'pending';

                const requiredCount = matchType === 'singles' ? 2 : 4;
                const activeParticipants = participants.slice(0, requiredCount).filter(Boolean);
                const isOfficial = activeParticipants.length === requiredCount && activeParticipants.every(p => p.is_registered);

                const creatorFormattedName = formatPlayerName(user.name, user.lastname);
                let resolvedTitle = '';
                if (matchType === 'singles') {
                    if (activeParticipants.length === 2) {
                        resolvedTitle = `${activeParticipants[0].name} vs ${activeParticipants[1].name}`;
                    } else if (activeParticipants.length === 1) {
                        resolvedTitle = activeParticipants[0].name;
                    } else {
                        resolvedTitle = `${creatorFormattedName} (Singles)`;
                    }
                } else {
                    if (activeParticipants.length === 4) {
                        resolvedTitle = `${activeParticipants[0].name} / ${activeParticipants[1].name} vs ${activeParticipants[2].name} / ${activeParticipants[3].name}`;
                    } else if (activeParticipants.length > 1) {
                        resolvedTitle = activeParticipants.map(p => p.name).join(' vs ');
                    } else {
                        resolvedTitle = `${creatorFormattedName} (Dobles)`;
                    }
                }

                const bookingData = {
                    user_id: user.id,
                    institution_id: selectedInstId,
                    date: date,
                    start_time: selectedSlot.start_time,
                    end_time: addMinutes(selectedSlot.start_time, totalDuration), 
                    court_name: selectedSlot.court_name,
                    status: bookingStatus as any, 
                    booking_type: 'guest' as const,
                    match_type: matchType,
                    counts_for_stats: isOfficial,
                    title: resolvedTitle,
                    total_price: totalPrice,
                    extras: { 
                        ...(extras || {}), 
                        match_type: matchType,
                        counts_for_stats: isOfficial,
                        participants: activeParticipants 
                    },
                    payment_status: paymentStatus,
                    participants: activeParticipants
                };

                if (isReschedule && existingBooking) {
                    await api.bookings.update(existingBooking.id, bookingData);
                    addToast('Reserva reprogramada con éxito.', 'success');
                } else {
                    await api.bookings.create(bookingData, user);
                    if (paymentMethod === 'mp') {
                        addToast('¡Pago exitoso! Reserva confirmada y jugadores notificados.', 'success');
                    } else {
                        addToast('Reserva solicitada. Paga en el club para confirmar.', 'info');
                    }
                }
                
                setPaymentStep('success');
                setTimeout(() => onSuccess(), 1500);

            } catch (e: any) {
                addToast('Error al procesar: ' + e.message, 'error');
                setIsSubmitting(false);
                setPaymentStep('select');
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div id="player-booking-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {isReschedule ? 'Reprogramar Reserva' : 'Nueva Reserva de Cancha'}
                        </h3>
                        <p className="text-xs text-muted">
                            {isReschedule ? 'Selecciona la nueva fecha, modalidad y horario' : 'Selecciona club, modalidad, jugadores y horario'}
                        </p>
                    </div>
                    {!isSubmitting && <button onClick={onClose} className="text-muted hover:text-white"><X size={20}/></button>}
                </div>

                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    
                    {/* PAYMENT PROCESSING VIEW */}
                    {paymentStep === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in">
                            <Loader2 className="animate-spin text-primary" size={48} />
                            <div className="text-center">
                                <h3 className="font-bold text-white text-lg">Procesando Reserva...</h3>
                                <p className="text-muted text-sm">Guardando turno y notificando jugadores</p>
                            </div>
                        </div>
                    )}

                    {paymentStep === 'success' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-white text-xl">¡Reserva Confirmada!</h3>
                                <p className="text-green-400 text-sm font-bold">Tu cancha ha sido reservada con éxito.</p>
                                {participants.length > 1 && (
                                    <p className="text-xs text-muted mt-1">Se enviaron notificaciones a los jugadores añadidos.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SELECTION FORM VIEW */}
                    {paymentStep === 'select' && (
                        <>
                            {/* Club selector */}
                            <div className="space-y-2">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                    <BuildingIcon size={14} className="text-primary" /> Club / Sede
                                </label>
                                <select 
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                    value={selectedInstId}
                                    onChange={e => setSelectedInstId(e.target.value)}
                                    disabled={isReschedule}
                                >
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name} {inst.city ? `- ${inst.city}` : ''} 
                                            {inst.id === user.institution_id ? ' (Mi Club Principal)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Navigation Bar with < > arrows */}
                            <div className="space-y-2">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" /> Día de Reserva
                                </label>
                                
                                <div className="flex flex-wrap items-center gap-2 bg-sidebar p-2 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={handlePrevDay}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                            title="Día anterior"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextDay}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                            title="Día siguiente"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    <div className="flex-1 text-center font-black text-sm text-primary tracking-wide bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">
                                        {formatFriendlyDate(date)}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleToday}
                                        className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Hoy
                                    </button>

                                    <input 
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        className="bg-card border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-primary text-xs font-bold"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Match & Participant Selector */}
                            <MatchParticipantSelector
                                matchType={matchType}
                                onMatchTypeChange={setMatchType}
                                participants={participants}
                                onChange={setParticipants}
                                currentUser={user}
                                isAdmin={false}
                            />

                            {selectedInst && (
                                <div className="space-y-2">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                        <Clock size={14} className="text-primary" /> Duración del Turno
                                    </label>
                                    <div className="flex gap-2">
                                        {Array.from({ length: maxSlots }, (_, i) => i + 1).map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setDurationMultiplier(num)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                    durationMultiplier === num
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                        : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                                }`}
                                            >
                                                {num} {num === 1 ? 'Turno' : 'Turnos'}
                                                <span className="block text-[9px] font-normal opacity-70">
                                                    {minDuration * num} min
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extra Options */}
                            {selectedInst && (
                                <div className="space-y-2 bg-white/5 p-3.5 rounded-xl border border-white/10">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-primary" /> Adicionales Opcionales
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <label className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                            extras.balls ? 'bg-primary/20 border-primary text-white' : 'bg-sidebar border-white/10 text-muted hover:border-white/20'
                                        }`}>
                                            <span className="flex items-center gap-2">
                                                🎾 Tubo de Pelotas Nuevas
                                            </span>
                                            <input 
                                                type="checkbox"
                                                checked={extras.balls}
                                                onChange={e => {
                                                    soundEffects.playScoreBeep();
                                                    setExtras(prev => ({ ...prev, balls: e.target.checked }));
                                                }}
                                                className="accent-primary w-4 h-4 rounded cursor-pointer"
                                            />
                                        </label>

                                        <label className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                            (extras.rackets || 0) > 0 ? 'bg-primary/20 border-primary text-white' : 'bg-sidebar border-white/10 text-muted hover:border-white/20'
                                        }`}>
                                            <span className="flex items-center gap-2">
                                                🏸 Alquiler de Raquetas
                                            </span>
                                            <select
                                                value={extras.rackets || 0}
                                                onChange={e => {
                                                    soundEffects.playScoreBeep();
                                                    setExtras(prev => ({ ...prev, rackets: Number(e.target.value) }));
                                                }}
                                                className="bg-card border border-white/20 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                                            >
                                                <option value={0}>0</option>
                                                <option value={1}>1 ($1500)</option>
                                                <option value={2}>2 ($3000)</option>
                                                <option value={4}>4 ($6000)</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                        <Clock size={14} className="text-primary" /> Horarios Disponibles ({formatFriendlyDate(date)})
                                    </label>
                                </div>
                                {loadingSlots ? (
                                    <div className="py-8 text-center text-muted"><Loader2 className="animate-spin mx-auto mb-2 text-primary" /> Buscando canchas disponibles...</div>
                                ) : slots.length === 0 ? (
                                    <div className="py-6 px-4 text-center border border-dashed border-white/10 rounded-xl flex flex-col items-center gap-3 bg-white/5">
                                        <Calendar size={24} className="opacity-50 text-primary" />
                                        <div>
                                            <p className="font-bold text-white text-sm">No hay horarios disponibles en esta fecha.</p>
                                            <p className="text-xs text-muted mt-0.5">¿Deseas que te avisemos de inmediato si se libera una cancha?</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!selectedInstId || !date) return;
                                                soundEffects.playTennisHit();
                                                try {
                                                    await api.bookings.addToWaitlist({
                                                        institution_id: selectedInstId,
                                                        date: date,
                                                        start_time: '18:00',
                                                        court_name: 'Cualquier Cancha',
                                                        user_id: user.id,
                                                        user_name: formatPlayerName(user.name, user.lastname),
                                                        user_phone: user.phone
                                                    });
                                                    soundEffects.playBookingSuccess();
                                                    addToast('¡Te anotaste en la Lista de Espera! Te notificaremos al buzón si se libera un turno.', 'success');
                                                } catch (e: any) {
                                                    addToast('Error al sumarte a la lista de espera: ' + e.message, 'error');
                                                }
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                                        >
                                            <Flame size={14} className="text-amber-400" /> Anotarme en Lista de Espera
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {slots.map((slot, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={!slot.is_active}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                                    selectedSlot === slot 
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                                        : !slot.is_active 
                                                            ? 'bg-white/5 text-muted border-transparent opacity-50 cursor-not-allowed'
                                                            : 'bg-card text-white border-white/10 hover:border-white/30 hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="font-bold text-sm">{slot.start_time}</span>
                                                <span className="text-[10px] opacity-80 truncate w-full text-center">{slot.court_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedSlot && (
                                <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                    {/* Order Summary */}
                                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-primary font-bold uppercase">Total a Pagar</span>
                                                {isUserMemberOfInst ? (
                                                    <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                                                        ★ Tarifa Socio Aplicada
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-white/10 text-muted px-2 py-0.5 rounded-full font-medium">
                                                        Tarifa General
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-white text-sm font-bold">{selectedSlot.court_name} • {selectedSlot.start_time}</div>
                                            <div className="text-[10px] text-muted space-x-1">
                                                <span>{durationMultiplier} {durationMultiplier === 1 ? 'turno' : 'turnos'} ({minDuration * durationMultiplier} min)</span>
                                                <span>•</span>
                                                <span className="text-slate-300">${getBaseHourlyPrice()}/turno ({isNightSlot(selectedSlot.start_time) ? 'Nocturno' : 'Diurno'})</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white">
                                                ${calculateTotal()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentMethod('mp')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                                paymentMethod === 'mp' 
                                                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10' 
                                                    : 'bg-sidebar border-white/10 text-muted hover:border-white/30'
                                            }`}
                                        >
                                            <Smartphone size={20} className={paymentMethod === 'mp' ? 'text-blue-400' : ''} />
                                            <span className="text-xs font-bold">Mercado Pago</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                                paymentMethod === 'cash' 
                                                    ? 'bg-green-500/20 border-green-500 text-white shadow-lg shadow-green-500/10' 
                                                    : 'bg-sidebar border-white/10 text-muted hover:border-white/30'
                                            }`}
                                        >
                                            <Wallet size={20} className={paymentMethod === 'cash' ? 'text-green-400' : ''} />
                                            <span className="text-xs font-bold">En el Club</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {paymentStep === 'select' && (
                    <div className="p-5 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleConfirm}
                            disabled={!selectedSlot}
                            className={`px-6 py-2 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg transition-all ${
                                !selectedSlot ? 'opacity-50 cursor-not-allowed bg-slate-700' :
                                paymentMethod === 'mp' ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20' : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
                            }`}
                        >
                            {paymentMethod === 'mp' ? 'Pagar y Reservar' : 'Confirmar Reserva'} <CheckCircle2 size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminBookingManager: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [institution, setInstitution] = useState<Institution | null>(null);
    const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>(user.institution_id || '');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingGrid, setLoadingGrid] = useState(false);
    const [gridSlots, setGridSlots] = useState<string[]>([]);
    const [gridCourts, setGridCourts] = useState<string[]>([]);
    const [isDayClosed, setIsDayClosed] = useState(false);
    const [dayScheduleInfo, setDayScheduleInfo] = useState<{open: string, close: string} | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{time: string, court: string} | null>(null);
    const [actionType, setActionType] = useState<'guest' | 'tournament' | 'maintenance' | 'class' | null>(null);
    const [adminMatchType, setAdminMatchType] = useState<'singles' | 'doubles'>('singles');
    const [bookingTitle, setBookingTitle] = useState('');
    const [participants, setParticipants] = useState<BookingParticipant[]>([]);
    const [matchResult, setMatchResult] = useState(''); 
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
    const [extras, setExtras] = useState({ rackets: 0, balls: false });
    const [tournamentFormat, setTournamentFormat] = useState<'3' | '5'>('3');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]); 
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    
    // Mass cancellation por clima
    const [showWeatherModal, setShowWeatherModal] = useState(false);
    const [weatherCancelScope, setWeatherCancelScope] = useState<'full_day' | 'from_time'>('full_day');
    const [weatherStartTime, setWeatherStartTime] = useState('16:00');
    const [weatherReason, setWeatherReason] = useState('Suspensión por lluvia / mal tiempo');
    const [weatherActionLoading, setWeatherActionLoading] = useState(false);

    const { addToast } = useToast();

    const handlePrevDay = () => {
        if (!selectedDate) return;
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() - 1);
        const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        setSelectedDate(newStr);
    };

    const handleNextDay = () => {
        if (!selectedDate) return;
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() + 1);
        const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        setSelectedDate(newStr);
    };

    const handleToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const isNightSlot = (timeStr?: string) => {
        if (!timeStr || !institution) return false;
        const nightStart = institution.schedule_night_start || '18:00';
        return timeStr >= nightStart;
    };

    const handleBulkCancelWeather = async () => {
        if (!institution) return;
        try {
            setWeatherActionLoading(true);
            soundEffects.playTennisHit();
            const startTimeParam = weatherCancelScope === 'from_time' ? weatherStartTime : undefined;
            const adminName = formatPlayerName(user.name, user.lastname) || 'Administración';
            const cancelled = await api.bookings.bulkCancelByWeather(
                institution.id,
                selectedDate,
                startTimeParam,
                weatherReason,
                adminName
            );
            soundEffects.playBookingSuccess();
            addToast(`Se suspendieron y cancelaron ${cancelled.length} reservas por mal tiempo y se notificó a los jugadores.`, 'success');
            setShowWeatherModal(false);
            loadBookingsResult();
        } catch (e: any) {
            addToast('Error al cancelar reservas masivamente: ' + e.message, 'error');
        } finally {
            setWeatherActionLoading(false);
        }
    };

    useEffect(() => {
        const loadInst = async () => {
            try {
                const all = await api.institutions.getAll();
                const active = (all || []).filter(i => i.is_active !== false);
                setAllInstitutions(active);

                let targetId = selectedInstId || user.institution_id;
                let current = targetId ? active.find(i => i.id === targetId) : null;
                if (!current && active.length > 0) {
                    current = active[0];
                    setSelectedInstId(current.id);
                }
                setInstitution(current || null);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadInst();
    }, [selectedInstId, user.institution_id]);

    useEffect(() => {
        if (!institution) return;
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); 
        const overrides = institution.date_overrides || [];
        const schedule = institution.weekly_schedule || [];
        const override = overrides.find(o => o.date === selectedDate);
        const dailyRule = schedule.find(w => w.day_number === dayOfWeek);
        let openTime = institution.schedule_open || '08:00';
        let closeTime = institution.schedule_close || '23:00';
        let isOpen = true;
        if (override) {
            isOpen = override.is_open;
            if (isOpen && override.open_time && override.close_time) {
                openTime = override.open_time;
                closeTime = override.close_time;
            }
        } else if (dailyRule) {
            isOpen = dailyRule.is_open;
            openTime = dailyRule.open_time;
            closeTime = dailyRule.close_time;
        }
        setIsDayClosed(!isOpen);
        setDayScheduleInfo({ open: openTime, close: closeTime });
        if (!isOpen) { setGridSlots([]); return; }
        const slots = [];
        let currentH = parseInt(openTime.split(':')[0]);
        let currentM = parseInt(openTime.split(':')[1]);
        const endH = parseInt(closeTime.split(':')[0]);
        const endM = parseInt(closeTime.split(':')[1]);
        if (isNaN(currentH) || isNaN(endH)) return;
        let loops = 0;
        const maxLoops = 48; 
        while (loops < maxLoops) {
             if (currentH > endH || (currentH === endH && currentM >= endM && endM !== 0)) break; 
            const timeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
            if (currentH < endH || (currentH === endH && currentM < endM)) {
                slots.push(timeStr);
            }
            currentM += 30; 
            while (currentM >= 60) {
                currentM -= 60;
                currentH += 1;
            }
            loops++;
        }
        setGridSlots(slots);
        const courts = Array.from({ length: institution.courts_total || 3 }, (_, i) => `Cancha ${i + 1}`);
        setGridCourts(courts);
    }, [institution, selectedDate]); 

    useEffect(() => {
        if (institution && selectedDate) {
            loadBookingsResult();
        }
    }, [selectedDate, institution]);

    const loadBookingsResult = async () => {
        if (!institution) return;
        setLoadingGrid(true);
        try {
            const data = await api.bookings.getByInstitutionAndDate(institution.id, selectedDate);
            setBookings(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingGrid(false);
        }
    };

    const getBookingType = (b: Booking): 'guest' | 'tournament' | 'maintenance' | 'class' => {
        if (b.booking_type) return b.booking_type;
        if (b.status === 'blocked') return 'maintenance';
        if (b.status === 'confirmed' && b.total_price === 0) return 'tournament';
        return 'guest';
    };

    const handleSlotClick = (time: string, court: string, existingBooking?: Booking) => {
        if (existingBooking) {
            setViewingBooking(existingBooking);
            setMatchResult(existingBooking.match_score || '');
        } else {
            setSelectedSlot({ time, court });
            setActionType(null);
            setAdminMatchType('singles');
            setBookingTitle('');
            setParticipants([]);
            setExtras({ rackets: 0, balls: false });
            setTournamentFormat('3');
            const [year, month, day] = selectedDate.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            const currentDay = dateObj.getDay();
            setIsRecurring(false);
            setRecurrenceDays([currentDay]); 
            const future = new Date(dateObj);
            future.setMonth(future.getMonth() + 3);
            setRecurrenceEndDate(future.toISOString().split('T')[0]);
        }
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateGuestPrice = (time: string) => {
        if (!institution) return 0;
        const hour = parseInt(time.split(':')[0]);
        const nightStart = parseInt((institution.schedule_night_start || '18:00').split(':')[0]);
        const basePrice = hour >= nightStart ? (institution.price_night || 0) : (institution.price_day || 0);
        let total = basePrice;
        if (extras.rackets > 0 && institution.price_racket) total += extras.rackets * institution.price_racket;
        if (extras.balls && institution.price_ball) total += institution.price_ball;
        return total;
    };

    const addMinutes = (time: string, mins: number) => {
        const [h, m] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + mins, 0);
        return date.toTimeString().slice(0, 5);
    };

    const handleCreateBooking = async (type: 'guest' | 'tournament' | 'maintenance' | 'class') => {
        if (!selectedSlot || !institution) return;
        let price = 0;
        if (type === 'guest') {
            price = calculateGuestPrice(selectedSlot.time);
        }
        const status: Booking['status'] = (type === 'maintenance' || type === 'class') ? 'blocked' : 'confirmed';
        
        const requiredCount = adminMatchType === 'singles' ? 2 : 4;
        const activeParticipants = participants.slice(0, requiredCount).filter(Boolean);
        const isOfficial = type === 'guest' && activeParticipants.length === requiredCount && activeParticipants.every(p => p.is_registered);

        let baseTitle = bookingTitle.trim();
        if (!baseTitle) {
            if (type === 'guest') {
                if (adminMatchType === 'singles') {
                    if (activeParticipants.length === 2) {
                        baseTitle = `${activeParticipants[0].name} vs ${activeParticipants[1].name}`;
                    } else if (activeParticipants.length === 1) {
                        baseTitle = activeParticipants[0].name;
                    } else {
                        baseTitle = 'Turno Singles';
                    }
                } else {
                    if (activeParticipants.length === 4) {
                        baseTitle = `${activeParticipants[0].name} / ${activeParticipants[1].name} vs ${activeParticipants[2].name} / ${activeParticipants[3].name}`;
                    } else if (activeParticipants.length > 1) {
                        baseTitle = activeParticipants.map(p => p.name).join(' vs ');
                    } else {
                        baseTitle = 'Turno Dobles';
                    }
                }
            } else {
                baseTitle = type === 'maintenance' ? 'Mantenimiento' : type === 'tournament' ? 'Partido Torneo' : 'Clase / Escuela';
            }
        }

        let duration = 90; 
        if (type === 'tournament') {
            duration = tournamentFormat === '5' ? (institution.config_match_duration_5_sets || 150) : (institution.config_match_duration_3_sets || 90);
        } else if (type === 'guest' || type === 'class') {
            duration = institution.config_booking_min_duration || 60;
        }

        const bookingTemplate = {
            user_id: user.id, 
            institution_id: institution.id,
            start_time: selectedSlot.time,
            end_time: addMinutes(selectedSlot.time, duration), 
            court_name: selectedSlot.court,
            status: status,
            booking_type: type,
            match_type: type === 'guest' ? adminMatchType : undefined,
            counts_for_stats: type === 'guest' ? isOfficial : false,
            title: baseTitle,
            total_price: price,
            payment_status: type === 'guest' ? 'pending' : 'n/a',
            extras: type === 'guest' ? { 
                ...(extras || {}), 
                match_type: adminMatchType,
                counts_for_stats: isOfficial,
                participants: activeParticipants 
            } : undefined,
            participants: activeParticipants
        };

        try {
            if ((type === 'class' || type === 'maintenance') && isRecurring && recurrenceEndDate) {
                const bookingsToCreate: Partial<Booking>[] = [];
                const endDate = new Date(recurrenceEndDate);
                let iterator = new Date(selectedDate); 
                let safetyCount = 0;
                while (iterator <= endDate && safetyCount < 365) {
                    const dayOfWeek = iterator.getDay(); 
                    if (recurrenceDays.includes(dayOfWeek)) {
                        bookingsToCreate.push({ ...bookingTemplate, date: formatDate(iterator) });
                    }
                    iterator.setDate(iterator.getDate() + 1);
                    safetyCount++;
                }
                if (bookingsToCreate.length === 0) bookingsToCreate.push({ ...bookingTemplate, date: selectedDate });
                await Promise.all(bookingsToCreate.map(b => api.bookings.create(b, user)));
                addToast(`Se han programado ${bookingsToCreate.length} sesiones.`, 'success');
            } else {
                await api.bookings.create({ ...bookingTemplate, date: selectedDate }, user);
                addToast('Reserva creada con éxito y jugadores notificados.', 'success');
            }
            loadBookingsResult();
            setSelectedSlot(null);
            setBookingTitle('');
            setParticipants([]);
        } catch (e: any) {
            addToast('Error al crear reserva: ' + e.message, 'error');
        }
    };

    const handleDeleteBooking = async () => {
        if (!viewingBooking) return;
        if (confirm("¿Estás seguro de eliminar esta reserva definitivamente?")) {
            try {
                setBookings(prev => prev.filter(b => b.id !== viewingBooking.id));
                setViewingBooking(null);
                await api.bookings.delete(viewingBooking.id);
                addToast('Reserva eliminada definitivamente.', 'info');
                loadBookingsResult();
            } catch (e: any) {
                addToast('Error al eliminar reserva: ' + e.message, 'error');
                loadBookingsResult();
            }
        }
    };

    const getBookingForSlot = (time: string, court: string) => {
        return bookings.find(b => b.court_name === court && b.start_time <= time && b.end_time > time);
    };

    if (loading) return <div className="text-center py-20 text-muted">Cargando panel de gestión...</div>;
    if (!institution) return <div className="flex flex-col items-center justify-center py-20 space-y-4"><AlertCircle size={48} className="text-muted opacity-50" /><h3 className="text-xl font-bold text-white">No se encontró institución</h3></div>;

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white">Gestión de Canchas</h2>
                    <p className="text-muted text-sm">Administra la disponibilidad, asigna jugadores y bloquea horarios.</p>
                </div>

                {/* SUPER ADMIN: Institution Selector */}
                {user.role === 'superadmin' && allInstitutions.length > 0 ? (
                    <div className="flex items-center gap-2 bg-card border border-primary/30 p-1.5 rounded-2xl shadow-lg">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <BuildingIcon size={18} />
                        </div>
                        <div className="pr-2">
                            <div className="text-[10px] uppercase font-bold text-muted">Sede Activa</div>
                            <select
                                className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer pr-4"
                                value={selectedInstId}
                                onChange={e => setSelectedInstId(e.target.value)}
                            >
                                {allInstitutions.map(inst => (
                                    <option key={inst.id} value={inst.id} className="bg-slate-900 text-white">
                                        {inst.name} ({inst.city || 'Sede'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : institution ? (
                    <div className="text-right">
                        <div className="text-sm font-bold text-white">{institution.name}</div>
                        <div className="text-xs text-muted">{institution.city}</div>
                    </div>
                ) : null}
            </div>

            <div id="grid-container">
                {/* Operational Grid Header with < > Day Navigation (Matching Screenshot 1) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        <h3 className="text-lg font-black text-white">Grilla Operativa</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* Day Switcher Arrows < > */}
                        <div className="flex items-center bg-card border border-white/10 rounded-xl p-1 shadow-inner">
                            <button 
                                type="button"
                                onClick={handlePrevDay} 
                                className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                                title="Día anterior"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                type="button"
                                onClick={handleNextDay} 
                                className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                                title="Día siguiente"
                            >
                                <ChevronRight size={18} />
                            </button>
                            <div className="px-3 py-1 text-xs sm:text-sm font-black text-white tracking-wide border-l border-white/10 flex items-center gap-1.5">
                                <span>{formatFriendlyDate(selectedDate)}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleToday}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                            Hoy
                        </button>

                        <input 
                            type="date" 
                            className="bg-card border border-white/10 rounded-xl px-3 py-2 text-white focus:border-primary focus:outline-none text-xs font-bold" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                        />

                        <button 
                            onClick={() => setShowWeatherModal(true)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-900/20"
                            title="Cancelar reservas masivamente por mal tiempo o lluvia"
                        >
                            <CloudRain size={16} /> Suspensión Clima
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto bg-card border border-white/10 rounded-2xl mb-4 relative min-h-[400px]">
                    {loadingGrid && (<div className="absolute inset-0 bg-dark/50 backdrop-blur-sm flex items-center justify-center z-10"><Loader2 className="animate-spin text-primary" size={40} /></div>)}
                    {isDayClosed ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted"><div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4"><Lock size={32} /></div><p className="font-bold text-white">Cerrado en esta fecha.</p></div>
                    ) : (
                        <div className="min-w-[800px]">
                            <div className="grid bg-white/5 border-b border-white/10 text-center py-2.5 sticky top-0 z-10 backdrop-blur-md" style={{ gridTemplateColumns: `70px repeat(${gridCourts.length}, 1fr)` }}>
                                <div className="text-[10px] font-bold text-muted uppercase flex items-center justify-center">Hora</div>
                                {gridCourts.map(court => (<div key={court} className="text-xs font-black text-white uppercase tracking-wider">{court}</div>))}
                            </div>
                            {gridSlots.map((time) => (
                                <div key={time} className="grid border-b border-white/5 hover:bg-white/5 transition-colors group" style={{ gridTemplateColumns: `70px repeat(${gridCourts.length}, 1fr)` }}>
                                    <div className="py-2 text-center text-[10px] font-mono text-muted border-r border-white/5 flex flex-col justify-center items-center bg-card/30"><span className={time.endsWith('00') ? "text-white font-bold" : "opacity-50"}>{time}</span></div>
                                    {gridCourts.map(court => {
                                        const booking = getBookingForSlot(time, court);
                                        const isStart = booking?.start_time === time;
                                        const visualType = booking ? getBookingType(booking) : 'guest';

                                        // Determine player names to display
                                        let playerNamesList: string[] = [];
                                        if (booking?.participants && booking.participants.length > 0) {
                                            playerNamesList = booking.participants.map(p => p.name);
                                        } else if (booking?.user_name) {
                                            playerNamesList = [booking.user_name];
                                        } else if (booking?.title && !['reserva de cancha', 'alquiler', 'guest', 'turno de cancha', 'turno'].includes(booking.title.trim().toLowerCase())) {
                                            playerNamesList = [booking.title];
                                        } else if (booking?.title) {
                                            playerNamesList = [booking.title];
                                        }

                                        const mainDisplayName = playerNamesList.length > 0 
                                            ? playerNamesList.join(' vs ') 
                                            : (visualType === 'maintenance' ? 'Mantenimiento' : visualType === 'class' ? 'Clase' : 'Reserva');

                                        return (
                                            <div key={court} className="p-0.5 border-r border-white/5 last:border-0 min-h-[46px] relative">
                                                {booking ? (
                                                    <div 
                                                        onClick={() => handleSlotClick(time, court, booking)} 
                                                        title={`Reserva: ${mainDisplayName} (${booking.start_time} - ${booking.end_time}) • ${court}`}
                                                        className={`h-full w-full rounded-lg flex flex-col justify-center cursor-pointer transition-all px-2.5 py-1 relative z-0 overflow-hidden shadow-sm ${
                                                            visualType === 'tournament' ? 'bg-amber-600/70 border-l-4 border-amber-400 hover:bg-amber-600/90 text-white' : 
                                                            visualType === 'class' ? 'bg-indigo-600/70 border-l-4 border-indigo-400 hover:bg-indigo-600/90 text-white' : 
                                                            visualType === 'maintenance' ? 'bg-slate-700/85 border-l-4 border-slate-400 hover:bg-slate-700 text-slate-200' : 
                                                            'bg-primary/25 border-l-4 border-primary hover:bg-primary/35 text-white'
                                                        }`}
                                                    >
                                                        {isStart ? (
                                                            <div className="flex flex-col justify-center space-y-0.5 z-10 leading-tight">
                                                                <div className="flex items-center gap-1.5">
                                                                    {visualType === 'class' ? (
                                                                        <GraduationCap size={12} className="text-indigo-300 shrink-0" />
                                                                    ) : visualType === 'tournament' ? (
                                                                        <Trophy size={12} className="text-amber-300 shrink-0" />
                                                                    ) : visualType === 'maintenance' ? (
                                                                        <Lock size={12} className="text-slate-300 shrink-0" />
                                                                    ) : (
                                                                        <Users size={12} className="text-primary shrink-0" />
                                                                    )}
                                                                    <span className="text-[11.5px] font-black text-white truncate tracking-tight uppercase">
                                                                        {playerNamesList.length > 0 ? playerNamesList[0] : mainDisplayName}
                                                                    </span>
                                                                </div>
                                                                {playerNamesList.length > 1 && (
                                                                    <div className="text-[10px] font-bold text-white/90 truncate pl-4 tracking-tight uppercase">
                                                                        vs {playerNamesList.slice(1).join(' / ')}
                                                                    </div>
                                                                )}
                                                                <div className="text-[9.5px] text-white/60 font-semibold pl-4 truncate">
                                                                    {booking.start_time} - {booking.end_time}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 opacity-65 text-[10px] font-semibold text-white/80 truncate">
                                                                <span className="text-primary font-black">↳</span>
                                                                <span className="truncate">{mainDisplayName}</span>
                                                                <span className="text-[9px] text-white/50">({booking.start_time}-{booking.end_time})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleSlotClick(time, court)} 
                                                        className="w-full h-full rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-colors"
                                                    ></button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* VIEWING MODAL */}
            {viewingBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
                        <button onClick={() => setViewingBooking(null)} className="absolute top-4 right-4 text-muted hover:text-white"><X size={20}/></button>
                        
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                                    {viewingBooking.court_name} • {viewingBooking.start_time} - {viewingBooking.end_time} hs
                                </span>
                                <span className="text-[10px] bg-white/10 text-white font-bold px-2 py-0.5 rounded border border-white/10">
                                    {viewingBooking.match_type === 'doubles' || (viewingBooking.participants && viewingBooking.participants.length > 2) ? '👥 Dobles' : '🎾 Singles'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-white mt-1">{viewingBooking.title}</h3>
                            <div className="text-xs text-muted mt-0.5">{formatFriendlyDate(viewingBooking.date)}</div>

                            {/* Official match status badge */}
                            <div className="mt-2">
                                {viewingBooking.counts_for_stats || (viewingBooking.extras as any)?.counts_for_stats ? (
                                    <div className="bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-bold p-2 rounded-lg flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-green-400 shrink-0" />
                                        <span>✓ Partido Oficial (Computa para el historial de resultados y H2H)</span>
                                    </div>
                                ) : (
                                    <div className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold p-2 rounded-lg flex items-center gap-1.5">
                                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                        <span>⚠️ Turno sin cómputo para el historial de resultados</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Display Participants */}
                        {viewingBooking.participants && viewingBooking.participants.length > 0 ? (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                                <div className="text-xs font-bold text-muted uppercase flex items-center gap-1.5">
                                    <Users size={14} className="text-primary" /> Jugadores en Cancha ({viewingBooking.participants.length})
                                </div>
                                <div className="space-y-1.5">
                                    {viewingBooking.participants.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 text-xs font-bold text-white">
                                            <span>{p.name}</span>
                                            {p.is_registered && <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Socio Registrado</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : viewingBooking.user_name ? (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                                <div className="text-xs font-bold text-muted uppercase flex items-center gap-1.5">
                                    <Users size={14} className="text-primary" /> Reservado por
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 text-xs font-bold text-white">
                                    <span>{viewingBooking.user_name}</span>
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Titular</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={handleDeleteBooking} 
                                className="flex-1 py-3 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                            >
                                <Trash2 size={18} /> Eliminar Reserva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE ACTION SELECTION MODAL */}
            {selectedSlot && !actionType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div id="booking-action-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative space-y-3">
                        <button onClick={() => setSelectedSlot(null)} className="absolute top-4 right-4 text-muted hover:text-white"><X size={20}/></button>
                        <div className="text-center">
                            <h3 className="font-bold text-white text-lg">Nueva Reserva</h3>
                            <p className="text-xs text-muted">{selectedSlot.court} • {selectedSlot.time} hs ({formatFriendlyDate(selectedDate)})</p>
                        </div>
                        <div className="space-y-2 pt-2">
                            <button onClick={() => setActionType('guest')} className="w-full py-3 bg-primary/15 text-primary hover:bg-primary/25 font-bold rounded-xl border border-primary/30 transition-all text-sm">
                                🎾 Alquiler / Turno de Cancha
                            </button>
                            <button onClick={() => setActionType('class')} className="w-full py-3 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 font-bold rounded-xl border border-indigo-500/30 transition-all text-sm">
                                🎓 Clase / Escuela
                            </button>
                            <button onClick={() => setActionType('maintenance')} className="w-full py-3 bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 font-bold rounded-xl border border-slate-600/30 transition-all text-sm">
                                🔒 Bloquear Cancha / Mantenimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE FORM WITH PARTICIPANT SELECTION */}
            {selectedSlot && actionType && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div id="booking-form-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
                        <button onClick={() => setSelectedSlot(null)} className="absolute top-4 right-4 text-muted hover:text-white"><X size={20}/></button>
                        
                        <div>
                            <span className="text-xs font-bold text-primary uppercase">{selectedSlot.court} • {selectedSlot.time} hs</span>
                            <h3 className="font-black text-white text-xl">
                                {actionType === 'guest' ? 'Nuevo Turno / Alquiler' : actionType === 'class' ? 'Nueva Clase' : 'Bloquear Horario'}
                            </h3>
                            <div className="text-xs text-muted">{formatFriendlyDate(selectedDate)}</div>
                        </div>

                        <div className="space-y-4 pt-1">
                            {/* Title (Optional override) */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Título o Motivo</label>
                                <input 
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary" 
                                    placeholder={actionType === 'guest' ? 'Ej: Turno Tarde o dejar vacío para usar nombres' : 'Título'} 
                                    value={bookingTitle} 
                                    onChange={e => setBookingTitle(e.target.value)} 
                                />
                            </div>

                            {/* Participating Players Selection */}
                            {actionType !== 'maintenance' && (
                                <MatchParticipantSelector
                                    matchType={adminMatchType}
                                    onMatchTypeChange={setAdminMatchType}
                                    participants={participants}
                                    onChange={setParticipants}
                                    currentUser={user}
                                    isAdmin={true}
                                />
                            )}

                            <button 
                                onClick={() => handleCreateBooking(actionType)} 
                                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Check size={18} /> Confirmar Reserva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WEATHER MASS CANCELLATION MODAL */}
            {showWeatherModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-card border border-blue-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                                <CloudRain size={26} />
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-bold text-white">Suspensión por Mal Tiempo</h3>
                                <p className="text-xs text-slate-300">
                                    Cancela y libera turnos afectados por lluvia o tormenta en <span className="text-white font-bold">{institution?.name}</span>.
                                </p>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted uppercase font-bold">Fecha Seleccionada</label>
                                    <div className="bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm font-bold flex items-center justify-between">
                                        <span>{formatFriendlyDate(selectedDate)}</span>
                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-muted">{selectedDate}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-muted uppercase font-bold">Alcance de la Suspensión</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setWeatherCancelScope('full_day')}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                                                weatherCancelScope === 'full_day'
                                                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                                                    : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                            }`}
                                        >
                                            <span className="block mb-1">Día Completo</span>
                                            <span className="text-[10px] font-normal opacity-70">Todas las reservas del día</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWeatherCancelScope('from_time')}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                                                weatherCancelScope === 'from_time'
                                                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                                                    : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                            }`}
                                        >
                                            <span className="block mb-1">A partir de un horario</span>
                                            <span className="text-[10px] font-normal opacity-70">Por inicio de lluvia</span>
                                        </button>
                                    </div>
                                </div>

                                {weatherCancelScope === 'from_time' && (
                                    <div className="space-y-1 animate-in fade-in">
                                        <label className="text-[10px] text-muted uppercase font-bold">Cancelar turnos a partir de las:</label>
                                        <input 
                                            type="time" 
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-blue-500 text-sm"
                                            value={weatherStartTime}
                                            onChange={e => setWeatherStartTime(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted uppercase font-bold">Motivo / Mensaje Informativo</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-blue-500"
                                        placeholder="Ej: Lluvia intensa - Canchas anegadas"
                                        value={weatherReason}
                                        onChange={e => setWeatherReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowWeatherModal(false)}
                                className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors text-sm"
                                disabled={weatherActionLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleBulkCancelWeather}
                                disabled={weatherActionLoading}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-sm disabled:opacity-50"
                            >
                                {weatherActionLoading ? <Loader2 className="animate-spin" size={16} /> : <CloudRain size={16} />}
                                Confirmar Suspensión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};