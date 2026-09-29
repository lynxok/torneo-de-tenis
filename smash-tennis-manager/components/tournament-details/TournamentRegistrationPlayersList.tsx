import React from 'react';
import { 
    Users, 
    Download, 
    UserPlus, 
    FileText, 
    Eye, 
    Check, 
    Clock, 
    CheckCircle2, 
    RefreshCw, 
    Trash2,
    Edit2,
    Loader2,
    X
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Tournament, TournamentPlayer, User } from '../../types';
import { exportTournamentPlayersToCSV } from '../../utils/exportHelper';
import { soundEffects } from '../../services/soundEffects';

interface TournamentRegistrationPlayersListProps {
    matchesLength: number;
    tournament: Tournament;
    players: TournamentPlayer[];
    isClubAdmin: boolean;
    allProfiles: any[];
    addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    openManualEnrollModal: () => void;
    user: User;
    setViewingReceiptModal: (url: string | null) => void;
    handleUpdatePaymentStatus: (playerId: string, currentStatus: string) => void;
    handleOpenReplaceModal: (player: TournamentPlayer) => void;
    handleDeletePlayer: (playerId: string, playerName: string) => void;
    onUpdateDni?: (player: TournamentPlayer, dni: string) => Promise<void>;
}

export const TournamentRegistrationPlayersList: React.FC<TournamentRegistrationPlayersListProps> = ({
    matchesLength,
    tournament,
    players,
    isClubAdmin,
    allProfiles,
    addToast,
    openManualEnrollModal,
    user,
    setViewingReceiptModal,
    handleUpdatePaymentStatus,
    handleOpenReplaceModal,
    handleDeletePlayer,
    onUpdateDni,
}) => {
    const [editingDniId, setEditingDniId] = React.useState<string | null>(null);
    const [tempDniValue, setTempDniValue] = React.useState('');
    const [savingDni, setSavingDni] = React.useState(false);

    if (matchesLength > 0) return null;

    return (
        <div className="space-y-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Users size={18} className="text-primary" /> Inscritos ({players.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    {isClubAdmin && (
                                        <button
                                            onClick={() => {
                                                if (!tournament) return;
                                                const profileMap: Record<string, any> = {};
                                                allProfiles.forEach(prof => { profileMap[prof.id] = prof; });
                                                exportTournamentPlayersToCSV(tournament, players, profileMap);
                                                soundEffects.playScoreBeep();
                                                addToast("¡Listado de inscriptos descargado en CSV!", "success");
                                            }}
                                            className="p-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                            title="Descargar lista de inscriptos en Excel / CSV con datos de contacto y disponibilidad"
                                        >
                                            <Download size={13} className="text-emerald-400" /> Exportar CSV
                                        </button>
                                    )}
                                    {isClubAdmin && (
                                        <button
                                            onClick={openManualEnrollModal}
                                            className="p-1.5 px-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                            title="Inscribir jugador manualmente"
                                        >
                                            <UserPlus size={13} /> + Inscribir
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                                {players.length === 0 ? (
                                    <div className="text-muted text-sm text-center py-6">Aún no hay jugadores inscritos.</div>
                                ) : (
                                    players.map((p, i) => {
                                        const pDisplayName = formatPlayerName(p.name || p.player_name);
                                        const isPaid = p.payment_status === 'paid';
                                        const isSelf = p.player_id === user.id || p.id === user.id;
                                        const pAvailability = p.availability_notes || p.time_restrictions;

                                        return (
                                            <div key={p.id || i} className="flex items-center justify-between gap-2 p-2.5 bg-sidebar/50 border border-white/5 rounded-xl hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                        {pDisplayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-bold text-white truncate">{pDisplayName}</div>
                                                        {editingDniId === p.id ? (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <input
                                                                    type="text"
                                                                    placeholder="DNI (sin puntos)..."
                                                                    value={tempDniValue}
                                                                    onChange={e => setTempDniValue(e.target.value)}
                                                                    className="bg-slate-900 border border-primary/50 rounded-md px-2 py-0.5 text-[11px] text-white outline-none w-28 font-mono"
                                                                    autoFocus
                                                                    onKeyDown={async e => {
                                                                        if (e.key === 'Enter' && onUpdateDni) {
                                                                            setSavingDni(true);
                                                                            try {
                                                                                await onUpdateDni(p, tempDniValue);
                                                                                setEditingDniId(null);
                                                                            } finally {
                                                                                setSavingDni(false);
                                                                            }
                                                                        } else if (e.key === 'Escape') {
                                                                            setEditingDniId(null);
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={savingDni}
                                                                    onClick={async () => {
                                                                        if (onUpdateDni) {
                                                                            setSavingDni(true);
                                                                            try {
                                                                                await onUpdateDni(p, tempDniValue);
                                                                                setEditingDniId(null);
                                                                            } finally {
                                                                                setSavingDni(false);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1 bg-primary text-white rounded-md hover:bg-primary/80 transition-all text-xs"
                                                                    title="Guardar DNI"
                                                                >
                                                                    {savingDni ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingDniId(null)}
                                                                    className="p-1 bg-white/10 text-slate-300 rounded-md hover:bg-white/20 transition-all text-xs"
                                                                    title="Cancelar"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                <span className="text-[10px] text-muted">{p.category ? `${p.category} Cat.` : 'Sin Cat.'}</span>

                                                                {/* DNI Display / Add / Edit */}
                                                                {p.dni ? (
                                                                    <span 
                                                                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                                                            p.player_id 
                                                                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                                                                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                                        }`}
                                                                        title={p.player_id ? "DNI vinculado con cuenta registrada" : "DNI listo para vincular cuando se registre"}
                                                                    >
                                                                        DNI: {p.dni}
                                                                        {isClubAdmin && onUpdateDni && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingDniId(p.id);
                                                                                    setTempDniValue(p.dni || '');
                                                                                }}
                                                                                className="text-slate-400 hover:text-white ml-0.5"
                                                                                title="Editar DNI"
                                                                            >
                                                                                <Edit2 size={9} />
                                                                            </button>
                                                                        )}
                                                                    </span>
                                                                ) : isClubAdmin && !p.player_id && onUpdateDni ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingDniId(p.id);
                                                                            setTempDniValue('');
                                                                        }}
                                                                        className="text-[9px] text-primary hover:underline flex items-center gap-1 font-semibold bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 transition-all"
                                                                        title="Cargar DNI para vincular su cuenta automáticamente"
                                                                    >
                                                                        <Edit2 size={8} /> + DNI
                                                                    </button>
                                                                ) : isClubAdmin && onUpdateDni ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingDniId(p.id);
                                                                            setTempDniValue('');
                                                                        }}
                                                                        className="text-[9px] text-slate-400 hover:text-white flex items-center gap-0.5 font-semibold bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition-all"
                                                                        title="Cargar DNI"
                                                                    >
                                                                        <Edit2 size={8} /> + DNI
                                                                    </button>
                                                                ) : null}

                                                                {(isClubAdmin || isSelf) && p.fee_amount ? (
                                                                    <span className="text-[10px] text-slate-400 font-mono">${p.fee_amount}</span>
                                                                ) : null}
                                                                {(isClubAdmin || isSelf) && pAvailability ? (
                                                                    <span 
                                                                        className="text-[9px] text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[170px]"
                                                                        title={`Disponibilidad: ${pAvailability}`}
                                                                    >
                                                                        <Clock size={9} className="text-amber-400 shrink-0" />
                                                                        <span className="truncate">{pAvailability}</span>
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {/* Comprobante de pago adjunto para Admin */}
                                                    {isClubAdmin && p.receipt_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingReceiptModal(p.receipt_url || null)}
                                                            className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 flex items-center gap-1 transition-all"
                                                            title="Ver comprobante de pago subido por el jugador"
                                                        >
                                                            <Eye size={11} className="text-blue-400" />
                                                            <span>Comprobante</span>
                                                        </button>
                                                    )}

                                                    {/* Payment Status: Admin or Self only */}
                                                    {isClubAdmin ? (
                                                        <button
                                                            onClick={() => handleTogglePaymentStatus(p)}
                                                            title="Click para cambiar estado de pago"
                                                            className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition-all ${
                                                                isPaid
                                                                    ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'
                                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                                            }`}
                                                        >
                                                            {isPaid ? 'Pagado' : 'Pendiente'}
                                                        </button>
                                                    ) : isSelf ? (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                                                            isPaid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                            {isPaid ? 'Inscripción Pagada' : 'Pago Pendiente'}
                                                        </span>
                                                    ) : null}

                                                    {isSelf && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-bold">
                                                            Tú
                                                        </span>
                                                    )}

                                                    {/* Action Buttons for Admin */}
                                                    {isClubAdmin && (
                                                        <div className="flex items-center gap-1.5 ml-1">
                                                            <button
                                                                onClick={() => handleOpenReplaceModal(p)}
                                                                className="p-1.5 bg-primary/15 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                                                                title="Sustituir / Reemplazar jugador en el torneo"
                                                            >
                                                                <RefreshCw size={14} />
                                                            </button>

                                                            {matches.length === 0 && (
                                                                <button
                                                                    onClick={() => handleUnenrollPlayer(p)}
                                                                    disabled={deletingPlayerId === p.id}
                                                                    className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                                                                    title="Dar de baja / Quitar inscripto"
                                                                >
                                                                    {deletingPlayerId === p.id ? (
                                                                        <Loader2 size={14} className="animate-spin text-red-400" />
                                                                    ) : (
                                                                        <Trash2 size={14} />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>
    );
};
