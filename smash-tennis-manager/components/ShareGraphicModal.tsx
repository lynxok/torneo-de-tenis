import React, { useRef, useState } from 'react';
import { Tournament, Match, UserProfile } from '../types';
import { soundEffects } from '../services/soundEffects';
import { X, Download, Share2, Sparkles, Trophy, Grid, Calendar, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { GroupZone, PlayoffRound } from '../utils/bracketHelper';
import { getTournamentTier } from '../utils/tournamentTiers';
import { formatMatchScore } from '../utils/formatters';
import { api } from '../services/api';

interface ShareGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  zones?: GroupZone[];
  playoffRounds?: PlayoffRound[];
  championName?: string;
  matches?: Match[];
  currentUser?: UserProfile;
}

export const ShareGraphicModal: React.FC<ShareGraphicModalProps> = ({
  isOpen,
  onClose,
  tournament,
  zones = [],
  playoffRounds = [],
  championName,
  matches = [],
  currentUser
}) => {
  const [graphicType, setGraphicType] = useState<'playoffs' | 'standings' | 'order_of_play' | 'champion'>('standings');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'story'>('story'); // 'square' (1:1) or 'story' (9:16)
  const [themeStyle, setThemeStyle] = useState<'dark' | 'clay' | 'grass'>('dark');
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number | 'all'>('all');
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | 'all'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishingStory, setIsPublishingStory] = useState(false);
  const [storyPublished, setStoryPublished] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const tier = getTournamentTier(tournament);
  const isOrganizerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const formatShortScore = (score: any) => {
    return formatMatchScore(score) || '';
  };

  const getThemeBg = () => {
    switch (themeStyle) {
      case 'clay':
        return 'from-[#2c130b] via-[#1a0c07] to-[#0d0503] border-orange-500/30';
      case 'grass':
        return 'from-[#071f12] via-[#05140b] to-[#020a06] border-emerald-500/30';
      case 'dark':
      default:
        return 'from-[#0d131f] via-[#07090e] to-[#040508] border-primary/30';
    }
  };

  const getAccentColor = () => {
    switch (themeStyle) {
      case 'clay':
        return 'text-orange-400 border-orange-500 bg-orange-500/20';
      case 'grass':
        return 'text-emerald-400 border-emerald-500 bg-emerald-500/20';
      case 'dark':
      default:
        return 'text-primary border-primary bg-primary/20';
    }
  };

  const displayedZones = selectedZoneIndex === 'all' ? zones : [zones[selectedZoneIndex]].filter(Boolean);
  const displayedRounds = selectedRoundIndex === 'all' ? playoffRounds : [playoffRounds[selectedRoundIndex]].filter(Boolean);

  // Pure HTML5 Canvas rendering engine (guarantees no tainted canvas SecurityErrors)
  const renderGraphicToCanvas = async (width: number, height: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("No se pudo iniciar el renderizado Canvas");

    // 1. Background Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    if (themeStyle === 'clay') {
      bg.addColorStop(0, '#2c130b');
      bg.addColorStop(0.5, '#1a0c07');
      bg.addColorStop(1, '#0d0503');
    } else if (themeStyle === 'grass') {
      bg.addColorStop(0, '#071f12');
      bg.addColorStop(0.5, '#05140b');
      bg.addColorStop(1, '#020a06');
    } else {
      bg.addColorStop(0, '#0d131f');
      bg.addColorStop(0.5, '#07090e');
      bg.addColorStop(1, '#040508');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Outer glow border
    ctx.strokeStyle = themeStyle === 'clay' ? 'rgba(249, 115, 22, 0.4)' : themeStyle === 'grass' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(225, 91, 52, 0.4)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    // 2. Preload Logo as local Image or stylized fallback
    const padX = 60;
    let curY = 80;

    let logoLoaded = false;
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        logoImg.onload = () => { logoLoaded = true; res(null); };
        logoImg.onerror = () => res(null);
        logoImg.src = "/Smash.png";
      });

      if (logoLoaded && logoImg.width > 0) {
        // Watermark in background
        ctx.save();
        ctx.globalAlpha = 0.08;
        const wmSize = width * 0.75;
        ctx.drawImage(logoImg, width - wmSize * 0.75, height - wmSize * 0.75, wmSize, wmSize);
        ctx.restore();

        // Header logo
        const lHeight = 70;
        const lWidth = (logoImg.width / logoImg.height) * lHeight;
        ctx.drawImage(logoImg, padX, curY, lWidth, lHeight);

        // "OFICIAL" badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.roundRect(padX + lWidth + 18, curY + 15, 110, 38, 19);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('OFICIAL', padX + lWidth + 73, curY + 40);
      }
    } catch (e) {
      console.warn("Logo fallback:", e);
    }

    if (!logoLoaded) {
      ctx.fillStyle = '#e15b34';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SMASH TENIS', padX, curY + 50);
    }

    // Tier Badge
    const tierWidth = 190;
    ctx.fillStyle = themeStyle === 'clay' ? 'rgba(249, 115, 22, 0.2)' : themeStyle === 'grass' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(225, 91, 52, 0.2)';
    ctx.strokeStyle = themeStyle === 'clay' ? '#f97316' : themeStyle === 'grass' ? '#10b981' : '#e15b34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(width - padX - tierWidth, curY + 10, tierWidth, 48, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tier.label, width - padX - (tierWidth / 2), curY + 42);

    curY += 100;

    // Header Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, curY);
    ctx.lineTo(width - padX, curY);
    ctx.stroke();

    curY += 45;

    // Tournament Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(tournament.name.toUpperCase(), padX, curY);

    curY += 36;

    // Subtitle (Club & Category)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px sans-serif';
    const clubText = `📍 ${tournament.institutions?.name || 'Club'} • ${tournament.category} ${tournament.gender || 'Caballeros'}`;
    ctx.fillText(clubText, padX, curY);

    curY += 55;

    // 4. Main Body Content
    if (graphicType === 'champion') {
      const centerY = curY + 300;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(width / 2, centerY - 100, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '90px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆', width / 2, centerY - 65);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 24px sans-serif';
      ctx.fillText('CAMPEÓN DEL TORNEO', width / 2, centerY + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px sans-serif';
      const cName = championName || tournament.champion_name || 'Por Definir';
      ctx.fillText(cName, width / 2, centerY + 100);

      ctx.fillStyle = 'rgba(253, 230, 138, 0.8)';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`+${tier.pointsWinner} Pts para el Ranking Oficial`, width / 2, centerY + 155);
    } 
    else if (graphicType === 'standings') {
      ctx.fillStyle = themeStyle === 'clay' ? '#fb923c' : themeStyle === 'grass' ? '#34d399' : '#f97316';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📊 TABLA DE POSICIONES', padX, curY);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'right';
      const subLabel = selectedZoneIndex === 'all' ? `TODAS LAS ZONAS (${zones.length})` : zones[selectedZoneIndex]?.groupName || '';
      ctx.fillText(subLabel, width - padX, curY);

      curY += 30;

      const renderZones = displayedZones;
      const isMultiCol = renderZones.length > 2;

      if (isMultiCol) {
        const colW = (width - padX * 2 - 30) / 2;
        const cardH = 260;

        renderZones.forEach((z, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const zX = padX + col * (colW + 30);
          const zY = curY + row * (cardH + 20);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(zX, zY, colW, cardH, 16);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fdba74';
          ctx.font = '900 22px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(z.groupName?.toUpperCase() || `ZONA ${i + 1}`, zX + 20, zY + 38);

          (z.players || []).slice(0, 4).forEach((p, pIdx) => {
            const rowY = zY + 80 + pIdx * 46;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            const pName = `${pIdx + 1}. ${p.playerName || 'Jugador'}`;
            ctx.fillText(pName, zX + 20, rowY);

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'right';
            const stats = `${p.matchesWon || 0}G - ${p.matchesLost || 0}P`;
            ctx.fillText(stats, zX + colW - 20, rowY);
          });
        });
      } else {
        const cardW = width - padX * 2;
        renderZones.forEach((z, i) => {
          const cardH = 80 + (z.players?.length || 3) * 55;
          const zY = curY;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(padX, zY, cardW, cardH, 20);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fdba74';
          ctx.font = '900 26px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(z.groupName?.toUpperCase() || `ZONA ${i + 1}`, padX + 25, zY + 45);

          (z.players || []).forEach((p, pIdx) => {
            const rowY = zY + 100 + pIdx * 55;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${pIdx + 1}. ${p.playerName || 'Jugador'}`, padX + 25, rowY);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${p.matchesWon || 0}G - ${p.matchesLost || 0}P (${p.points || 0} pts)`, padX + cardW - 25, rowY);
          });

          curY += cardH + 25;
        });
      }
    }
    else if (graphicType === 'playoffs') {
      ctx.fillStyle = '#f97316';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🏆 CUADRO DE PLAYOFFS', padX, curY);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'right';
      const subLabel = selectedRoundIndex === 'all' ? `LLAVES (${playoffRounds.length} RONDAS)` : playoffRounds[selectedRoundIndex]?.name || '';
      ctx.fillText(subLabel, width - padX, curY);

      curY += 30;

      const renderRounds = displayedRounds;
      renderRounds.forEach((r) => {
        ctx.fillStyle = '#fdba74';
        ctx.font = '900 22px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🏆 ${r.name.toUpperCase()}`, padX, curY + 25);
        curY += 40;

        const mCount = (r.matches || []).length;
        const isMulti = mCount > 2;
        const cardW = isMulti ? (width - padX * 2 - 30) / 2 : width - padX * 2;
        const cardH = 140;

        (r.matches || []).forEach((m, mIdx) => {
          const col = isMulti ? mIdx % 2 : 0;
          const row = isMulti ? Math.floor(mIdx / 2) : mIdx;
          const mX = padX + col * (cardW + 30);
          const mY = curY + row * (cardH + 16);

          const isP1Win = m.winner_id && m.winner_id === m.player1_id;
          const isP2Win = m.winner_id && m.winner_id === m.player2_id;
          const sc = formatShortScore(m.score);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(mX, mY, cardW, cardH, 16);
          ctx.fill();
          ctx.stroke();

          // Player 1
          ctx.fillStyle = isP1Win ? '#f97316' : '#ffffff';
          ctx.font = isP1Win ? '900 20px sans-serif' : 'bold 20px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((isP1Win ? '▶ ' : '') + (m.player1_name || 'Por Definir'), mX + 16, mY + 36);

          if (isP1Win && sc) {
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('GANADOR', mX + cardW - 16, mY + 36);
          }

          // Player 2
          ctx.fillStyle = isP2Win ? '#f97316' : '#ffffff';
          ctx.font = isP2Win ? '900 20px sans-serif' : 'bold 20px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((isP2Win ? '▶ ' : '') + (m.player2_name || 'Por Definir'), mX + 16, mY + 76);

          if (isP2Win && sc) {
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('GANADOR', mX + cardW - 16, mY + 76);
          }

          // Score footer
          if (m.is_played && sc) {
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Marcador: ${sc}`, mX + cardW - 16, mY + 118);
          } else if (m.scheduled_at) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`📅 ${m.scheduled_at.slice(11, 16)} hs`, mX + cardW - 16, mY + 118);
          }
        });

        curY += Math.ceil(mCount / (isMulti ? 2 : 1)) * (cardH + 16) + 20;
      });
    }
    else if (graphicType === 'order_of_play') {
      ctx.fillStyle = '#f97316';
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📅 ORDEN DE JUEGO OFICIAL', padX, curY);
      curY += 40;

      const cardW = width - padX * 2;
      (matches || []).slice(0, 6).forEach((m, idx) => {
        const mY = curY + idx * 80;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(padX, mY, cardW, 66, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${m.player1_name || 'Jugador 1'}  vs  ${m.player2_name || 'Jugador 2'}`, padX + 20, mY + 42);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'right';
        const timeStr = m.scheduled_at ? `${m.scheduled_at.slice(11, 16)} hs` : 'A confirmar';
        ctx.fillText(timeStr, padX + cardW - 20, mY + 42);
      });
    }

    // 5. Footer
    const footY = height - 70;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, footY);
    ctx.lineTo(width - padX, footY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('smashtenis.lnx.com.ar', padX, footY + 40);

    ctx.fillStyle = '#f97316';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('#SmashTenis', width - padX, footY + 40);

    return canvas;
  };

  const handleDownloadPng = async () => {
    soundEffects.playTennisHit();
    setIsGenerating(true);
    try {
      const width = 1080;
      const height = aspectRatio === 'story' ? 1920 : 1080;
      const canvas = await renderGraphicToCanvas(width, height);

      const link = document.createElement('a');
      link.download = `SmashTenis-${tournament.name.replace(/\s+/g, '_')}-${graphicType}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      soundEffects.playBookingSuccess();
    } catch (e: any) {
      console.error('Error generating graphic:', e);
      alert('Error al generar la imagen: ' + (e.message || 'Intente nuevamente'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishStory = async () => {
    if (!currentUser?.id) return;
    soundEffects.playScoreBeep();
    setIsPublishingStory(true);
    try {
      // 1080x1920 is standard Instagram/App Story format
      const canvas = await renderGraphicToCanvas(1080, 1920);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
      if (!blob) throw new Error("No se pudo procesar la imagen de la historia");

      const file = new File([blob], `story_${tournament.id}_${graphicType}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await api.stories.createStory(file, [], currentUser.id);

      soundEffects.playBookingSuccess();
      setStoryPublished(true);
      setTimeout(() => setStoryPublished(false), 4000);
    } catch (err: any) {
      console.error("Error publishing story:", err);
      alert("Error al publicar historia: " + (err.message || 'Intente nuevamente'));
    } finally {
      setIsPublishingStory(false);
    }
  };

  const handleShareWhatsApp = () => {
    soundEffects.playScoreBeep();
    const clubName = tournament.institutions?.name || 'Smash Tenis';
    let text = `🎾 *${tournament.name.toUpperCase()}* - ${clubName}\n`;
    text += `🏆 *Categoría:* ${tournament.category} | ${tournament.gender || 'Caballeros'}\n`;
    text += `📍 *Circuito:* ${tier.label} (+${tier.pointsWinner} pts)\n\n`;

    if (graphicType === 'champion' && championName) {
      text += `👑 *¡CAMPEÓN CONSAGRADO!* 👑\n🥇 *${championName}*\n\n`;
    } else if (graphicType === 'playoffs' && playoffRounds && playoffRounds.length > 0) {
      text += `🔥 *Cuadro de Eliminación (Playoffs):*\n`;
      const roundsToShare = selectedRoundIndex === 'all' ? playoffRounds : [playoffRounds[selectedRoundIndex]].filter(Boolean);
      roundsToShare.forEach(r => {
        text += `\n*🏆 ${r.name}:*\n`;
        (r.matches || []).forEach(m => {
          const p1 = m.player1_name || 'Por definir';
          const p2 = m.player2_name || 'Por definir';
          const sc = formatShortScore(m.score);
          if (m.is_played && sc) {
            text += `• ${p1} vs ${p2} ➔ *${sc}* (Ganador: ${m.winner_name || 'Definido'})\n`;
          } else {
            text += `• ${p1} vs ${p2}\n`;
          }
        });
      });
    } else if (graphicType === 'standings' && zones && zones.length > 0) {
      if (selectedZoneIndex === 'all') {
        text += `📊 *Fase de Zonas (${zones.length} Grupos Definidos):*\n`;
        zones.forEach(z => {
          text += `\n*${z.groupName}:*\n`;
          (z.players || []).forEach((p, idx) => {
            text += `${idx + 1}. ${p.playerName} (${p.matchesWon || 0}G-${p.matchesLost || 0}P, ${p.points || 0} pts)\n`;
          });
        });
      } else {
        const z = zones[selectedZoneIndex];
        if (z) {
          text += `📊 *Posiciones ${z.groupName}:*\n`;
          (z.players || []).forEach((p, idx) => {
            text += `${idx + 1}. ${p.playerName} (${p.matchesWon || 0}G-${p.matchesLost || 0}P, ${p.points || 0} pts)\n`;
          });
        }
      }
    }

    text += `\n📲 Seguí los resultados en vivo en: https://smashtenis.lnx.com.ar/?t=${tournament.id}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Generador de Placas Oficiales
              </h2>
              <p className="text-xs text-muted">Descargá imágenes listas para Instagram Stories, Feed, Historias Smash y WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Controls & Preview Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto">
          
          {/* Controls Column (Left) */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Type Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">1. Tipo de Placa</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setGraphicType('standings'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    graphicType === 'standings' 
                      ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10' 
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  <Grid size={16} className={graphicType === 'standings' ? 'text-primary' : ''} />
                  Posiciones Zonas
                </button>
                <button
                  onClick={() => { setGraphicType('playoffs'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    graphicType === 'playoffs' 
                      ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10' 
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  <Trophy size={16} className={graphicType === 'playoffs' ? 'text-primary' : ''} />
                  Cuadro Playoffs
                </button>
                <button
                  onClick={() => { setGraphicType('order_of_play'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    graphicType === 'order_of_play' 
                      ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10' 
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  <Calendar size={16} className={graphicType === 'order_of_play' ? 'text-primary' : ''} />
                  Orden del Día
                </button>
                <button
                  onClick={() => { setGraphicType('champion'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    graphicType === 'champion' 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10' 
                      : 'bg-white/5 border-white/10 text-muted hover:text-white'
                  }`}
                >
                  <Trophy size={16} className={graphicType === 'champion' ? 'text-amber-400' : ''} />
                  Placa Campeón
                </button>
              </div>
            </div>

            {/* Zone Selector Sub-Filter (Only when 'standings' is active) */}
            {graphicType === 'standings' && zones.length > 1 && (
              <div className="animate-in fade-in duration-150">
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Zonas a Incluir</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/30 rounded-xl border border-white/5">
                  <button
                    onClick={() => { setSelectedZoneIndex('all'); soundEffects.playScoreBeep(); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedZoneIndex === 'all'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    Todas ({zones.length})
                  </button>
                  {zones.map((z, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedZoneIndex(idx); soundEffects.playScoreBeep(); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedZoneIndex === idx
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      {z.groupName?.replace('Grupo ', 'Zona ') || `Z${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Playoff Round Sub-Filter (Only when 'playoffs' is active) */}
            {graphicType === 'playoffs' && playoffRounds.length > 1 && (
              <div className="animate-in fade-in duration-150">
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1.5">Rondas de Llaves</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/30 rounded-xl border border-white/5">
                  <button
                    onClick={() => { setSelectedRoundIndex('all'); soundEffects.playScoreBeep(); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedRoundIndex === 'all'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    Todas ({playoffRounds.length})
                  </button>
                  {playoffRounds.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedRoundIndex(idx); soundEffects.playScoreBeep(); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedRoundIndex === idx
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted hover:text-white'
                      }`}
                    >
                      {r.name.replace('de Final', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">2. Formato de Imagen</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setAspectRatio('story'); soundEffects.playScoreBeep(); }}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                    aspectRatio === 'story' ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  📱 Story / WhatsApp (9:16)
                </button>
                <button
                  onClick={() => { setAspectRatio('square'); soundEffects.playScoreBeep(); }}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                    aspectRatio === 'square' ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🟦 Feed / Cuadrado (1:1)
                </button>
              </div>
            </div>

            {/* Theme Style Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">3. Superficie</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setThemeStyle('dark'); soundEffects.playScoreBeep(); }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    themeStyle === 'dark' ? 'bg-blue-900/40 border-blue-500 text-blue-200' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🌑 Hard Court
                </button>
                <button
                  onClick={() => { setThemeStyle('clay'); soundEffects.playScoreBeep(); }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    themeStyle === 'clay' ? 'bg-orange-950/60 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🧱 Ladrillo
                </button>
                <button
                  onClick={() => { setThemeStyle('grass'); soundEffects.playScoreBeep(); }}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    themeStyle === 'grass' ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🌱 Césped
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDownloadPng}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary to-orange-500 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                <Download size={18} />
                {isGenerating ? 'Generando PNG...' : 'Descargar Imagen (PNG)'}
              </button>

              {/* Publish to Smash Stories (Admin & SuperAdmin only) */}
              {isOrganizerOrAdmin && (
                <button
                  onClick={handlePublishStory}
                  disabled={isPublishingStory || storyPublished}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all border text-xs ${
                    storyPublished 
                      ? 'bg-green-600/30 border-green-500/50 text-green-300'
                      : 'bg-lime-500/20 hover:bg-lime-500/30 border-lime-500/40 text-lime-300 active:scale-[0.98]'
                  }`}
                >
                  {isPublishingStory ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Publicando en Historias...
                    </>
                  ) : storyPublished ? (
                    <>
                      <Check size={16} className="text-green-400" />
                      ¡Publicado en Historias de Smash!
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-lime-400" />
                      ⭐ Publicar en Historias de Smash
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold hover:bg-emerald-600/30 active:scale-[0.98] transition-all text-xs"
              >
                <Share2 size={16} />
                Compartir por WhatsApp
              </button>
            </div>

          </div>

          {/* Preview Canvas (Right) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="text-xs text-muted font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-primary" /> Previsualización en Vivo
            </div>

            {/* The Actual Renderable Graphic */}
            <div 
              ref={previewRef}
              className={`w-full max-w-[340px] ${
                aspectRatio === 'story' ? 'aspect-[9/16]' : 'aspect-square'
              } rounded-2xl bg-gradient-to-b ${getThemeBg()} border p-4 sm:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white select-none transition-all duration-300`}
            >
              {/* Subtle Watermark BG Logo */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-15 pointer-events-none">
                <img src="/Smash.png" alt="" className="w-full h-full object-contain filter grayscale brightness-200" crossOrigin="anonymous" />
              </div>

              {/* Graphic Header with Official Smash Logo */}
              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <img 
                      src="/Smash.png" 
                      alt="Smash Tenis" 
                      className="h-7 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]" 
                      crossOrigin="anonymous" 
                    />
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">OFICIAL</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getAccentColor()}`}>
                    {tier.label}
                  </span>
                </div>

                <div className="pt-0.5">
                  <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight uppercase line-clamp-2">
                    {tournament.name}
                  </h3>
                  <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                    📍 {tournament.institutions?.name || 'Club'} • {tournament.category} {tournament.gender || 'Caballeros'}
                  </p>
                </div>
              </div>

              {/* Graphic Content Body */}
              <div className="my-auto py-2 w-full overflow-hidden">
                {graphicType === 'champion' && (
                  <div className="text-center space-y-3 py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-bounce">
                      <Trophy size={32} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase">CAMPEÓN DEL TORNEO</div>
                      <div className="text-lg sm:text-xl font-black text-white mt-1">
                        {championName || tournament.champion_name || 'Por Definir'}
                      </div>
                      <div className="text-xs text-amber-200/70 mt-0.5">+{tier.pointsWinner} Pts para el Ranking</div>
                    </div>
                  </div>
                )}

                {graphicType === 'playoffs' && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1"><Trophy size={12} /> Cuadro de Playoffs</span>
                      <span className="text-[9px] text-muted">
                        {selectedRoundIndex === 'all' ? `Todas las Rondas (${playoffRounds.length})` : playoffRounds[selectedRoundIndex]?.name}
                      </span>
                    </div>
                    {(!displayedRounds || displayedRounds.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Fase final en preparación</div>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-hidden">
                        {displayedRounds.map((r, rIdx) => (
                          <div key={rIdx} className="space-y-1">
                            <div className="font-black text-[9px] text-orange-300 uppercase tracking-wider px-1">
                              🏆 {r.name}
                            </div>
                            <div className={`gap-1.5 ${
                              (r.matches || []).length > 2 ? 'grid grid-cols-2' : 'space-y-1'
                            }`}>
                              {(r.matches || []).map((m, mIdx) => {
                                const isP1Winner = m.winner_id && m.winner_id === m.player1_id;
                                const isP2Winner = m.winner_id && m.winner_id === m.player2_id;
                                const scoreText = formatShortScore(m.score);

                                return (
                                  <div key={mIdx} className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-[9px]">
                                    {/* Player 1 */}
                                    <div className={`flex justify-between items-center py-0.5 ${
                                      isP1Winner ? 'font-bold text-primary' : 'text-white'
                                    }`}>
                                      <span className="truncate max-w-[100px] flex items-center gap-1">
                                        {isP1Winner && <span className="text-primary text-[8px]">▶</span>}
                                        {m.player1_name || 'Por Definir'}
                                      </span>
                                      {scoreText && m.is_played && isP1Winner && (
                                        <span className="text-[8px] bg-primary/20 text-primary px-1 rounded font-bold">GANADOR</span>
                                      )}
                                    </div>
                                    {/* Player 2 */}
                                    <div className={`flex justify-between items-center py-0.5 border-t border-white/5 ${
                                      isP2Winner ? 'font-bold text-primary' : 'text-white'
                                    }`}>
                                      <span className="truncate max-w-[100px] flex items-center gap-1">
                                        {isP2Winner && <span className="text-primary text-[8px]">▶</span>}
                                        {m.player2_name || 'Por Definir'}
                                      </span>
                                      {scoreText && m.is_played && isP2Winner && (
                                        <span className="text-[8px] bg-primary/20 text-primary px-1 rounded font-bold">GANADOR</span>
                                      )}
                                    </div>
                                    {/* Score / Status Footer */}
                                    {m.is_played && scoreText ? (
                                      <div className="text-right text-[8px] font-black text-amber-300/90 pt-0.5">
                                        Marcador: {scoreText}
                                      </div>
                                    ) : m.scheduled_at ? (
                                      <div className="text-right text-[8px] text-muted pt-0.5">
                                        📅 {m.scheduled_at.slice(11, 16)} hs
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {graphicType === 'standings' && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1"><Grid size={12} /> Tabla de Posiciones</span>
                      <span className="text-[9px] text-muted">
                        {selectedZoneIndex === 'all' ? `Todas las Zonas (${zones.length})` : zones[selectedZoneIndex]?.groupName}
                      </span>
                    </div>
                    {(!displayedZones || displayedZones.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Zonas aún no generadas</div>
                    ) : (
                      <div className={`gap-1.5 max-h-[250px] overflow-hidden ${
                        displayedZones.length > 2 ? 'grid grid-cols-2' : 'space-y-1.5'
                      }`}>
                        {displayedZones.map((z, i) => {
                          const zoneTitle = z.groupName || (z as any).name || `Zona ${z.groupNumber || (i + 1)}`;
                          const zonePlayers = z.players || (z as any).standings || [];
                          const isCompact = displayedZones.length > 2;

                          return (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-1.5">
                              <div className="font-black text-[9px] sm:text-[10px] text-orange-300 uppercase mb-0.5 truncate">
                                {zoneTitle}
                              </div>
                              {zonePlayers.map((st: any, idx: number) => {
                                const playerName = st.playerName || st.name || 'Jugador';
                                const won = st.matchesWon ?? st.won ?? 0;
                                const lost = st.matchesLost ?? st.lost ?? 0;
                                return (
                                  <div key={idx} className="flex justify-between items-center text-[9px] py-0.5 border-b border-white/5 last:border-0">
                                    <span className="font-bold text-white truncate max-w-[90px] sm:max-w-[110px]">
                                      {idx + 1}. {playerName}
                                    </span>
                                    <span className="text-muted font-bold text-[8px] sm:text-[9px] shrink-0 ml-1">
                                      {won}G-{lost}P {isCompact ? '' : `(${st.points ?? 0}p)`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {graphicType === 'order_of_play' && (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Calendar size={12} /> Orden de Juego Oficial
                    </div>
                    {(!matches || matches.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Sin partidos programados hoy</div>
                    ) : (
                      <div className="space-y-1 max-h-[220px] overflow-hidden">
                        {matches.slice(0, 5).map((m, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-1.5 flex justify-between items-center text-[9px]">
                            <span className="font-bold text-white truncate max-w-[170px]">
                              {m.player1_name || 'Jugador 1'} vs {m.player2_name || 'Jugador 2'}
                            </span>
                            <span className="text-primary font-bold shrink-0">{m.scheduled_at ? m.scheduled_at.slice(11, 16) : 'A conf.'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Graphic Footer */}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[9px] text-muted shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <img src="/Smash.png" alt="" className="h-3 w-auto object-contain opacity-80" crossOrigin="anonymous" />
                  <span>smashtenis.lnx.com.ar</span>
                </div>
                <span className="font-bold text-primary">#SmashTenis</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

