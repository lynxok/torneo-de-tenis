import React, { useEffect, useState } from 'react';
import { 
  Trophy, Sparkles, Swords, X, ArrowRight, Check, ShoppingBag, CreditCard, Calendar
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  getActivePlayerRelease, hasSeenPlayerRelease, markPlayerReleaseAsSeen, PlayerRelease, PlayerImprovementItem 
} from '../data/playerImprovements';
import { soundEffects } from '../services/soundEffects';

interface PlayerImprovementsModalProps {
  user?: UserProfile | null;
  onNavigate?: (view: string) => void;
}

export const PlayerImprovementsModal: React.FC<PlayerImprovementsModalProps> = ({ user, onNavigate }) => {
  const [activeRelease, setActiveRelease] = useState<PlayerRelease | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Comprueba si hay novedades activas para jugadores
  useEffect(() => {
    // Aplica para rol player (o cualquier usuario que ingrese como jugador)
    const release = getActivePlayerRelease();
    if (!release) {
      setActiveRelease(null);
      return;
    }

    setActiveRelease(release);

    // Si el usuario es un jugador y aún no la vio, abrir el modal automáticamente
    const isPlayer = !user?.role || user?.role === 'player';
    if (isPlayer) {
      const seen = hasSeenPlayerRelease(release.id);
      if (!seen) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          soundEffects.playTennisHit();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.role, user?.id]);

  // Listener para apertura manual (desde Sidebar o botón en panel)
  useEffect(() => {
    const handleManualOpen = () => {
      const release = getActivePlayerRelease();
      if (release) {
        setActiveRelease(release);
        setIsOpen(true);
        soundEffects.playTennisHit();
      }
    };

    window.addEventListener('open-player-improvements', handleManualOpen);
    return () => {
      window.removeEventListener('open-player-improvements', handleManualOpen);
    };
  }, []);

  const handleDismiss = () => {
    if (activeRelease) {
      markPlayerReleaseAsSeen(activeRelease.id);
    }
    soundEffects.playScoreBeep();
    setIsOpen(false);
  };

  const handleNavigateView = (view: string) => {
    if (activeRelease) {
      markPlayerReleaseAsSeen(activeRelease.id);
    }
    soundEffects.playBookingSuccess();
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(view);
    }
  };

  if (!isOpen || !activeRelease) return null;

  const renderIcon = (iconName: PlayerImprovementItem['iconName']) => {
    switch (iconName) {
      case 'swords': return <Swords size={18} className="text-emerald-400" />;
      case 'shopping-bag': return <ShoppingBag size={18} className="text-cyan-400" />;
      case 'credit-card': return <CreditCard size={18} className="text-sky-400" />;
      case 'calendar': return <Calendar size={18} className="text-amber-400" />;
      case 'trophy': return <Trophy size={18} className="text-purple-400" />;
      default: return <Sparkles size={18} className="text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl w-full max-w-2xl shadow-2xl shadow-emerald-500/10 relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Glow Decorativo de Fondo */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 relative z-10 flex items-start justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeRelease.badge || 'Novedades para Jugadores'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/25">
                  {activeRelease.version}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {activeRelease.title}
              </h2>
              <p className="text-xs text-slate-300">
                {activeRelease.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10"
            title="Cerrar novedades"
          >
            <X size={20} />
          </button>
        </div>

        {/* Improvements List */}
        <div className="p-6 space-y-3.5 overflow-y-auto custom-scrollbar relative z-10 flex-1">
          {activeRelease.items.map((item, index) => (
            <div 
              key={item.id || index}
              className="p-4 bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all space-y-1.5 group hover:bg-slate-800/60"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:scale-105 transition-transform">
                    {renderIcon(item.iconName)}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${item.tagColor || 'bg-white/5 text-slate-300 border-white/10'}`}>
                  {item.tag}
                </span>
              </div>
              <p className="text-xs text-slate-300/90 leading-relaxed pl-11">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-white/[0.02] relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
            <Check size={14} className="text-emerald-400" />
            <span>Nuevas funciones activas en tu cuenta</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs transition-all"
            >
              ¡Entendido!
            </button>
            <button
              onClick={() => handleNavigateView('open-matches')}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Swords size={14} />
              <span>Partidos Abiertos</span>
            </button>
            <button
              onClick={() => handleNavigateView('shop')}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25 hover:brightness-110 transition-all"
            >
              <ShoppingBag size={14} />
              <span>Ver Tienda</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
