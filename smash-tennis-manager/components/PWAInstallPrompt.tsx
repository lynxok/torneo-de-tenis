import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, Sparkles, MoreVertical, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

export const triggerPWAInstall = () => {
    window.dispatchEvent(new CustomEvent('open-pwa-install'));
};

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios'>('android');

    useEffect(() => {
        // Check if already installed / in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                 (window.navigator as any).standalone === true;
        setIsStandalone(isStandaloneMode);

        // Detect OS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);
        setActiveGuideTab(isIosDevice ? 'ios' : 'android');

        if (isStandaloneMode) return;

        // Check dismissed in session
        const dismissed = sessionStorage.getItem('pwa_banner_dismissed');

        // Android / Desktop beforeinstallprompt
        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!dismissed) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Custom global trigger for manual clicks from Sidebar or Profile
        const handleManualOpen = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(({ outcome }: any) => {
                    if (outcome === 'accepted') {
                        setShowBanner(false);
                        setShowInstructionsModal(false);
                    }
                });
            } else {
                setShowInstructionsModal(true);
            }
        };

        window.addEventListener('open-pwa-install', handleManualOpen);

        // For mobile non-standalone, show subtle banner after 3 seconds if not dismissed
        if (!dismissed && !isStandaloneMode) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('open-pwa-install', handleManualOpen);
        };
    }, [deferredPrompt]);

    const handleBannerClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(({ outcome }: any) => {
                if (outcome === 'accepted') {
                    setShowBanner(false);
                }
                setDeferredPrompt(null);
            });
        } else {
            // Open instruction modal
            setShowInstructionsModal(true);
            setShowBanner(false);
        }
    };

    const handleDismissBanner = () => {
        setShowBanner(false);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    if (isStandalone) return null;

    return (
        <>
            {/* FLOATING BANNER */}
            {showBanner && !showInstructionsModal && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-gradient-to-r from-slate-900 via-card to-slate-950 border border-primary/40 p-4 rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-between gap-3 relative">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                <Smartphone size={22} className="text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                    Instalar Smash Tenis <Sparkles size={12} className="text-yellow-400 fill-yellow-400" />
                                </h4>
                                <p className="text-[11px] text-slate-300">
                                    {isIOS ? 'Agregá la app a tu pantalla de inicio' : 'Accedé en 1 toque y sin conexión'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBannerClick}
                                className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center gap-1.5 shrink-0"
                            >
                                <Download size={13} /> Instalar
                            </button>
                            <button
                                onClick={handleDismissBanner}
                                className="text-muted hover:text-white p-1.5 transition-colors rounded-lg hover:bg-white/5"
                                title="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INSTRUCTIONS MODAL */}
            {showInstructionsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-none">Instalar Smash Tenis</h3>
                                    <p className="text-xs text-muted mt-1">Como aplicación nativa en tu celular</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowInstructionsModal(false)}
                                className="text-muted hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* OS Tabs */}
                        <div className="flex border-b border-white/10 bg-black/30 p-1.5 gap-2">
                            <button
                                onClick={() => setActiveGuideTab('android')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    activeGuideTab === 'android'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-muted hover:text-white'
                                }`}
                            >
                                🤖 Android / Chrome
                            </button>
                            <button
                                onClick={() => setActiveGuideTab('ios')}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    activeGuideTab === 'ios'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-muted hover:text-white'
                                }`}
                            >
                                🍎 iPhone / iPad (Safari)
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            {activeGuideTab === 'android' ? (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            1
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Abrí el menú del navegador <MoreVertical size={14} className="text-primary" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Tocá los <strong>tres puntos</strong> en la esquina superior derecha de Google Chrome.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            2
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Seleccioná "Instalar aplicación" <Download size={14} className="text-green-400" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                O la opción <strong>"Agregar a la pantalla principal"</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            3
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Confirmá la instalación <CheckCircle2 size={14} className="text-primary" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Tocá <strong>Instalar</strong>. ¡Listo! Smash Tenis aparecerá junto a tus demás aplicaciones con pantalla completa.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            1
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Tocá el botón Compartir <Share size={14} className="text-blue-400" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                En Safari, tocá el ícono de <strong>cuadrado con flecha hacia arriba</strong> en la barra inferior de tu pantalla.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            2
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Elegí "Agregar al inicio" <PlusSquare size={14} className="text-yellow-400" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Deslizá el menú hacia abajo y tocá <strong>"Agregar a pantalla de inicio"</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                        <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black flex items-center justify-center shrink-0 text-xs mt-0.5">
                                            3
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                Tocá "Agregar" <CheckCircle2 size={14} className="text-primary" />
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Tocá <strong>Agregar</strong> en la esquina superior derecha y Smash Tenis quedará como app en tu iPhone/iPad.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Benefits box */}
                            <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-2xl space-y-1">
                                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                    <Sparkles size={13} /> Ventajas de la App Instalada
                                </div>
                                <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                                    <li>✓ Funciona a pantalla completa sin barra de navegación del navegador.</li>
                                    <li>✓ Carga instantánea y soporte para ver torneos sin conexión.</li>
                                    <li>✓ Acceso directo desde tu pantalla de inicio como cualquier app nativa.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => setShowInstructionsModal(false)}
                                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/20"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
