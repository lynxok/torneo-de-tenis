import React, { useState } from 'react';
import { Institution } from '../types';
import { QRCodeSVG } from './QRCodeSVG';
import { Printer, X, Copy, ExternalLink, QrCode, Check } from 'lucide-react';
import { useToast } from './ui/Toast';

interface CourtQRModalProps {
    institution: Institution;
    isOpen: boolean;
    onClose: () => void;
}

export const CourtQRModal: React.FC<CourtQRModalProps> = ({
    institution,
    isOpen,
    onClose
}) => {
    const { addToast } = useToast();
    const totalCourts = (institution.courts_with_light || 0) + (institution.courts_without_light || 0) || 4;
    const [selectedCourt, setSelectedCourt] = useState<number | 'all'>('all');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    const courtList = Array.from({ length: Math.max(1, totalCourts) }, (_, i) => i + 1);

    const getCourtUrl = (courtNum: number) => {
        const origin = window.location.origin;
        return `${origin}/?view=shop&club=${institution.id}&court=${courtNum}`;
    };

    const handleCopyUrl = (courtNum: number) => {
        const url = getCourtUrl(courtNum);
        navigator.clipboard.writeText(url);
        setCopiedIndex(courtNum);
        addToast(`¡Enlace directo para Cancha ${courtNum} copiado!`, 'success');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    const courtsToRender = selectedCourt === 'all' ? courtList : [selectedCourt];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
            {/* CSS print-specific styles to ensure only posters print in A4 */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-court-qrs, #printable-court-qrs * {
                            visibility: visible;
                        }
                        #printable-court-qrs {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white !important;
                            color: black !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .qr-print-card {
                            page-break-after: always;
                            box-shadow: none !important;
                            border: 3px solid #0f172a !important;
                            color: #0f172a !important;
                            background: #ffffff !important;
                            margin-bottom: 2rem !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            <div className="bg-card border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
                {/* Header (No print) */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 no-print">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Carteles QR para Canchas • Pedidos al Buffet</h3>
                            <p className="text-xs text-muted">Imprimí y colocá en cada red o poste de cancha para que los socios pidan sin salir a la cantina</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white p-2 rounded-lg hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Controls Bar (No print) */}
                <div className="p-4 bg-sidebar border-b border-white/10 flex flex-wrap items-center justify-between gap-3 no-print">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">Mostrar:</span>
                        <select
                            value={selectedCourt}
                            onChange={e => setSelectedCourt(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="bg-card border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                            <option value="all">Todas las canchas ({courtList.length} carteles)</option>
                            {courtList.map(c => (
                                <option key={c} value={c}>Solo Cancha {c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                        >
                            <Printer size={15} /> Imprimir Carteles (A4)
                        </button>
                    </div>
                </div>

                {/* Printable Canvas Area */}
                <div id="printable-court-qrs" className="p-6 overflow-y-auto space-y-6 bg-slate-950">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {courtsToRender.map(courtNum => {
                            const courtUrl = getCourtUrl(courtNum);

                            return (
                                <div 
                                    key={courtNum} 
                                    className="qr-print-card bg-white text-slate-900 rounded-3xl p-6 border-4 border-slate-900 shadow-xl flex flex-col items-center justify-between text-center relative overflow-hidden"
                                >
                                    {/* Top banner */}
                                    <div className="w-full bg-slate-900 text-white py-2 px-4 rounded-xl mb-4 flex items-center justify-between font-black tracking-wider text-xs uppercase">
                                        <span>🎾 Smash Tenis</span>
                                        <span className="text-emerald-400">{institution.name}</span>
                                    </div>

                                    {/* Headline */}
                                    <div className="space-y-1 mb-3">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                                            Servicio a la Cancha 🥤
                                        </span>
                                        <h2 className="text-xl font-black text-slate-900 leading-tight">
                                            ¿Pelotas, agua o bebidas?
                                        </h2>
                                        <p className="text-xs text-slate-600 font-medium">
                                            Escaneá con tu celular y te lo llevamos directamente:
                                        </p>
                                    </div>

                                    {/* Giant Court Badge */}
                                    <div className="bg-slate-900 text-white px-5 py-1.5 rounded-2xl font-black text-lg tracking-wider mb-4 shadow-md flex items-center gap-2">
                                        <span>CANCHA</span>
                                        <span className="text-emerald-400 text-2xl font-mono">{courtNum}</span>
                                    </div>

                                    {/* QR Code SVG */}
                                    <div className="p-3 bg-slate-100 rounded-2xl border-2 border-slate-300 mb-3 shadow-inner">
                                        <QRCodeSVG value={courtUrl} size={180} />
                                    </div>

                                    {/* Instructions list */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-left space-y-1 text-[11px] font-medium text-slate-700 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900">1.</span>
                                            <span>Abrí la cámara de tu celular y apuntá al código QR.</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900">2.</span>
                                            <span>Elegí pelotas, agua, bebidas o minutas de la cantina.</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900">3.</span>
                                            <span>Aboná con Mercado Pago (0% comisión) y ¡a jugar!</span>
                                        </div>
                                    </div>

                                    {/* Action Bar (No print) */}
                                    <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-200 no-print">
                                        <button
                                            onClick={() => handleCopyUrl(courtNum)}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            {copiedIndex === courtNum ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                            {copiedIndex === courtNum ? '¡Copiado!' : 'Copiar Link'}
                                        </button>

                                        <a
                                            href={courtUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <ExternalLink size={13} /> Probar Tienda
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer (No print) */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center no-print">
                    <p className="text-xs text-muted">
                        💡 Tip: Podés plastificar los carteles y colgarlos en el alambre de cada cancha.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
