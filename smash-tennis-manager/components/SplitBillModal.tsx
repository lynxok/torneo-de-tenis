import React, { useState } from 'react';
import { Card } from './ui/Card';
import { useToast } from './ui/Toast';
import { X, Users, Copy, MessageCircle, Check, DollarSign, ExternalLink } from 'lucide-react';

interface SplitBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalPrice: number;
    courtName?: string;
    clubName?: string;
    clubAlias?: string;
    date?: string;
    timeSlot?: string;
    initialPlayersCount?: number;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
    isOpen,
    onClose,
    totalPrice,
    courtName = 'Cancha Principal',
    clubName = 'Club de Tenis',
    clubAlias = 'parqueespana.tenis',
    date = 'Hoy',
    timeSlot = '',
    initialPlayersCount = 2
}) => {
    const { addToast } = useToast();
    const [splitCount, setSplitCount] = useState<number>(initialPlayersCount === 4 ? 4 : 2);
    const [copiedAlias, setCopiedAlias] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);

    if (!isOpen) return null;

    const pricePerPerson = Math.round(totalPrice / splitCount);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
    };

    const handleCopyAlias = () => {
        navigator.clipboard.writeText(clubAlias);
        setCopiedAlias(true);
        addToast(`¡Alias "${clubAlias}" copiado al portapapeles!`, 'success');
        setTimeout(() => setCopiedAlias(false), 2000);
    };

    const generateWhatsAppMessage = () => {
        return `🎾 *División de Cancha - Smash Tenis*\n` +
            `📍 Club: *${clubName}*\n` +
            `🏟️ Cancha: *${courtName}*\n` +
            `📅 Fecha: *${date}* ${timeSlot ? `a las *${timeSlot} hs*` : ''}\n\n` +
            `💰 *Costo Total de Cancha:* ${formatCurrency(totalPrice)}\n` +
            `👥 *División entre:* ${splitCount} jugadores (${splitCount === 2 ? 'Singles' : 'Dobles'})\n` +
            `👉 *Tu parte es:* *${formatCurrency(pricePerPerson)}*\n\n` +
            `📲 *Alias Mercado Pago / Banco:* \n` +
            `*${clubAlias}*\n\n` +
            `¡Nos vemos en la cancha a jugar! 🎾🔥`;
    };

    const handleShareWhatsApp = () => {
        const msg = generateWhatsAppMessage();
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopySummary = () => {
        const msg = generateWhatsAppMessage();
        navigator.clipboard.writeText(msg);
        setCopiedSummary(true);
        addToast('¡Resumen de cobro copiado al portapapeles!', 'success');
        setTimeout(() => setCopiedSummary(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Dividir Pago de Cancha</h3>
                            <p className="text-xs text-muted">Cálculo exacto por jugador y cobro por WhatsApp</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white p-2 rounded-lg hover:bg-white/10">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Match Overview */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs space-y-1">
                        <div className="flex justify-between text-slate-300">
                            <span className="text-muted">Club:</span>
                            <strong className="text-white">{clubName}</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span className="text-muted">Cancha y Horario:</span>
                            <span className="text-white">{courtName} {timeSlot ? `• ${timeSlot}` : ''}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 pt-1 border-t border-white/5 font-bold">
                            <span className="text-muted">Total Alquiler:</span>
                            <span className="text-emerald-400 font-mono text-sm">{formatCurrency(totalPrice)}</span>
                        </div>
                    </div>

                    {/* Split selector */}
                    <div className="space-y-2">
                        <label className="text-xs text-muted uppercase font-bold block">
                            ¿Entre cuántos jugadores se divide?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSplitCount(2)}
                                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                                    splitCount === 2
                                        ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                }`}
                            >
                                <span className="text-sm font-black">2 Jugadores (Singles)</span>
                                <span className="text-[11px] opacity-80">50% cada uno</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSplitCount(4)}
                                className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                                    splitCount === 4
                                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                        : 'bg-sidebar border-white/10 text-muted hover:text-white'
                                }`}
                            >
                                <span className="text-sm font-black">4 Jugadores (Dobles)</span>
                                <span className="text-[11px] opacity-80">25% cada uno</span>
                            </button>
                        </div>
                    </div>

                    {/* Price per Person Highlight */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-1">
                        <span className="text-[11px] text-muted uppercase tracking-wider font-bold">Le corresponde abonar a cada uno:</span>
                        <div className="text-3xl font-black text-emerald-400 font-mono">
                            {formatCurrency(pricePerPerson)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                            ({splitCount} cuotas iguales de {formatCurrency(pricePerPerson)})
                        </span>
                    </div>

                    {/* Club Alias Info */}
                    <div className="bg-sidebar border border-white/10 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-muted uppercase font-bold block">Alias Mercado Pago del Club</span>
                                <span className="font-mono font-black text-emerald-400 text-base">
                                    {clubAlias}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyAlias}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                                {copiedAlias ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                {copiedAlias ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={handleShareWhatsApp}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={16} /> Enviar Cobro por WhatsApp a Jugadores
                        </button>

                        <button
                            type="button"
                            onClick={handleCopySummary}
                            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                            {copiedSummary ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copiedSummary ? '¡Mensaje Copiado!' : 'Copiar Detalle al Portapapeles'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};
