import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed / in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                 (window.navigator as any).standalone === true;
        setIsStandalone(isStandaloneMode);

        if (isStandaloneMode) return;

        // Check iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check dismissed in session
        const dismissed = sessionStorage.getItem('pwa_dismissed');
        if (dismissed) return;

        // Android / Desktop beforeinstallprompt
        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // For iOS, show after 3 seconds if not standalone
        if (isIosDevice && !isStandaloneMode) {
            const timer = setTimeout(() => setShowPrompt(true), 3500);
            return () => clearTimeout(timer);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa_dismissed', 'true');
    };

    if (isStandalone || !showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-r from-slate-900 via-card to-slate-950 border border-primary/40 p-4 rounded-2xl shadow-2xl shadow-primary/10 flex items-center justify-between gap-3 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                        <Smartphone size={22} />
                    </div>
                    <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            Instalá Smash Tenis <Sparkles size={12} className="text-accent" />
                        </h4>
                        <p className="text-[11px] text-slate-300">
                            {isIOS ? 'Tocá Compartir y "Agregar a Inicio"' : 'Accedé más rápido y sin conexión'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isIOS ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-1 rounded-lg">
                            <Share size={12} /> + <PlusSquare size={12} />
                        </div>
                    ) : (
                        <button
                            onClick={handleInstallClick}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
                        >
                            <Download size={13} /> Instalar
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="text-muted hover:text-white p-1 transition-colors"
                        title="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
