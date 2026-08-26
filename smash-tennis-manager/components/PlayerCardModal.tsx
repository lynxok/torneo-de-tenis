import React, { useRef, useState, useMemo } from 'react';
import { UserProfile, PlayerStatsSummary } from '../types';
import { soundEffects } from '../services/soundEffects';
import { X, Download, Share2, Trophy, Award, Flame, Zap, Shield, Sparkles, Star, Crown, Medal } from 'lucide-react';
import { formatPlayerName } from '../utils/formatters';
import { calculatePlayerAchievements, getTopUnlockedAchievements } from '../utils/achievements';

interface PlayerCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  stats?: PlayerStatsSummary | null;
  rank?: number;
}

export const PlayerCardModal: React.FC<PlayerCardModalProps> = ({
  isOpen,
  onClose,
  user,
  stats,
  rank = 1
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const topBadges = useMemo(() => {
    const all = calculatePlayerAchievements(user, stats || null);
    return getTopUnlockedAchievements(all, 3);
  }, [user, stats]);

  if (!isOpen) return null;

  const formattedName = formatPlayerName(user.name, user.lastname);
  const winRate = stats ? stats.winRate : (user.matches_won ? 75 : 50);
  const matchesWon = stats ? stats.wonMatches : (user.matches_won || 0);
  const streak = stats ? Math.max(0, stats.currentStreak) : 3;
  const bestStreak = stats ? stats.bestStreak : 5;
  const tieBreakRate = stats ? stats.tieBreakWinRate : 67;

  // ATP Rating Tier (Gold, Platinum, Diamond based on category & rank)
  const isTopTier = user.category === '1ra' || user.category === '2da' || rank <= 5;

  const handleDownloadPng = async () => {
    soundEffects.playTennisHit();
    setIsGenerating(true);
    try {
      const element = cardRef.current;
      if (!element) return;

      const canvas = document.createElement('canvas');
      const rect = element.getBoundingClientRect();
      const scale = 2; // High resolution

      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(scale, scale);

        // Draw background
        const bgGrad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
        bgGrad.addColorStop(0, '#1a1005');
        bgGrad.addColorStop(0.5, '#0d0a04');
        bgGrad.addColorStop(1, '#050402');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, rect.width, rect.height);

        const data = new XMLSerializer().serializeToString(element);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
        
        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);

        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URLObj.revokeObjectURL(blobURL);

          const link = document.createElement('a');
          link.download = `PlayerCard-${formattedName.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
          setIsGenerating(false);
          soundEffects.playBookingSuccess();
        };

        img.onerror = () => {
          const link = document.createElement('a');
          link.download = `PlayerCard-${formattedName.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
          setIsGenerating(false);
        };

        img.src = blobURL;
      }
    } catch (e) {
      console.error('Error exporting player card:', e);
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    soundEffects.playScoreBeep();
    const club = user.institution || 'Smash Tenis';
    let text = `🎾 *SMASH PLAYER CARD* 🎾\n`;
    text += `👤 *Jugador:* ${formattedName}\n`;
    text += `🏅 *Categoría:* ${user.category || '4ta'} | 📍 *Club:* ${club}\n`;
    text += `📊 *Efectividad:* ${winRate}% Victorias (${matchesWon} PG)\n`;
    text += `🔥 *Mejor Racha:* ${bestStreak} partidos invicto\n`;
    text += `🏆 *Ranking:* #${rank} Oficial\n`;
    if (topBadges.length > 0) {
      text += `🎖️ *Medallas:* ${topBadges.map(b => b.title).join(' • ')}\n`;
    }
    text += `\n📲 Consultá el perfil completo en: https://smashtenis.lnx.com.ar`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Tarjeta de Jugador Smash
              </h2>
              <p className="text-xs text-muted">Ficha coleccionable oficial de rendimiento</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 flex flex-col items-center justify-center bg-black/40">
          
          {/* Visual Player Card (Exportable Target) */}
          <div
            ref={cardRef}
            className="w-[300px] sm:w-[320px] aspect-[1/1.58] rounded-3xl bg-gradient-to-b from-amber-950/90 via-slate-950 to-slate-950 border-2 border-amber-500/50 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white select-none"
          >
            {/* Top Shine & Accents */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Card Header: Rank & Rating */}
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col">
                <span className="text-3xl font-black font-display text-amber-400 tracking-tight leading-none">
                  {winRate}
                </span>
                <span className="text-[10px] font-black uppercase text-amber-200/80 tracking-widest mt-0.5">
                  RAT
                </span>
                <div className="mt-2 text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 w-fit">
                  {user.category || '4ta'}
                </div>
              </div>

              {/* Avatar Photo */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-2 border-amber-400/80 bg-slate-900 overflow-hidden shadow-xl shadow-amber-500/10">
                  {user.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-gradient-to-br from-amber-600 to-orange-700">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                  #{rank}
                </div>
              </div>
            </div>

            {/* Player Name & Club */}
            <div className="text-center z-10 my-1.5 pt-1.5 border-t border-amber-500/20">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide truncate">
                {formattedName}
              </h3>
              <p className="text-[11px] text-amber-200/70 font-semibold truncate">
                📍 {user.institution || 'Tenis Parque España'}
              </p>
            </div>

            {/* 6 Key Stats Grid (FUT Style) */}
            <div className="grid grid-cols-2 gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-2.5 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">VICTORIAS</span>
                <span className="font-extrabold text-amber-300 text-xs">{matchesWon} PG</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">EFECTIVIDAD</span>
                <span className="font-extrabold text-emerald-400 text-xs">{winRate}%</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">TIE-BREAKS</span>
                <span className="font-extrabold text-amber-300 text-xs">{tieBreakRate}%</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">RACHA</span>
                <span className="font-extrabold text-orange-400 text-xs">🔥 {streak}</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">TÍTULOS</span>
                <span className="font-extrabold text-amber-300 text-xs">{user.tournaments_won || 0} 🏆</span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted font-bold text-[9px]">ESTADO</span>
                <span className="font-extrabold text-emerald-400 text-xs">PRO</span>
              </div>
            </div>

            {/* Top Achievements Badges Row */}
            {topBadges.length > 0 && (
              <div className="flex items-center justify-around gap-1 bg-black/40 border border-amber-500/20 rounded-xl px-2 py-1.5 z-10 my-1">
                {topBadges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[9px] font-bold text-amber-200/90 truncate">
                    <span className="text-[10px]">{badge.unlocked ? '🏅' : '🔒'}</span>
                    <span className="truncate max-w-[72px]">{badge.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Card Footer */}
            <div className="flex items-center justify-between text-[9px] text-amber-400/60 font-bold z-10 pt-0.5">
              <span className="tracking-widest">SMASH TENNIS PRO</span>
              <span>2026 EDITION</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-[320px] grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleDownloadPng}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20 text-xs disabled:opacity-50"
            >
              <Download size={16} />
              {isGenerating ? 'Generando...' : 'Descargar'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl hover:bg-emerald-600/30 active:scale-[0.98] transition-all text-xs"
            >
              <Share2 size={16} />
              WhatsApp
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
