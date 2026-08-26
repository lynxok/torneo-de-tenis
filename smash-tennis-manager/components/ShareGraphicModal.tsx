import React, { useRef, useState } from 'react';
import { Tournament, Match, TournamentPlayer } from '../types';
import { soundEffects } from '../services/soundEffects';
import { X, Download, Share2, Sparkles, Trophy, Grid, Calendar, Image as ImageIcon, Check } from 'lucide-react';
import { GroupZone, PlayoffRound } from '../utils/bracketHelper';
import { getTournamentTier } from '../utils/tournamentTiers';

interface ShareGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  zones?: GroupZone[];
  playoffRounds?: PlayoffRound[];
  championName?: string;
  matches?: Match[];
}

export const ShareGraphicModal: React.FC<ShareGraphicModalProps> = ({
  isOpen,
  onClose,
  tournament,
  zones = [],
  playoffRounds = [],
  championName,
  matches = []
}) => {
  const [graphicType, setGraphicType] = useState<'playoffs' | 'standings' | 'order_of_play' | 'champion'>('playoffs');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'story'>('story'); // 'square' (1:1) or 'story' (9:16)
  const [themeStyle, setThemeStyle] = useState<'dark' | 'clay' | 'grass'>('dark');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const tier = getTournamentTier(tournament);

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

  const handleDownloadPng = async () => {
    soundEffects.playTennisHit();
    setIsGenerating(true);
    try {
      // Dynamic import of html2canvas or inline canvas renderer
      const element = previewRef.current;
      if (!element) return;

      // Use HTML5 Canvas to capture high-res image
      const canvas = document.createElement('canvas');
      const rect = element.getBoundingClientRect();
      const scale = 2; // High DPI

      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(scale, scale);
        
        // Draw background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
        if (themeStyle === 'clay') {
          bgGrad.addColorStop(0, '#2c130b');
          bgGrad.addColorStop(1, '#0d0503');
        } else if (themeStyle === 'grass') {
          bgGrad.addColorStop(0, '#071f12');
          bgGrad.addColorStop(1, '#020a06');
        } else {
          bgGrad.addColorStop(0, '#0d131f');
          bgGrad.addColorStop(1, '#040508');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Convert HTML element to SVG foreignObject
        const data = new XMLSerializer().serializeToString(element);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
        
        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);

        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URLObj.revokeObjectURL(blobURL);

          // Download as PNG
          const link = document.createElement('a');
          link.download = `SmashTenis-${tournament.name.replace(/\s+/g, '_')}-${graphicType}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
          setIsGenerating(false);
          soundEffects.playBookingSuccess();
        };

        img.onerror = () => {
          // Fallback direct download
          const link = document.createElement('a');
          link.download = `SmashTenis-${tournament.name.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
          setIsGenerating(false);
        };

        img.src = blobURL;
      }
    } catch (e) {
      console.error('Error generating graphic:', e);
      setIsGenerating(false);
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
      text += `🔥 *Cuadro de Playoffs en Juego:*\n`;
      playoffRounds.forEach(r => {
        text += `• *${r.name}:* ${(r.matches || []).length} partido(s)\n`;
      });
    } else if (graphicType === 'standings' && zones && zones.length > 0) {
      text += `📊 *Fase de Zonas:* ${zones.length} grupos definidos.\n`;
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
              <p className="text-xs text-muted">Descargá imágenes listas para Instagram Stories, Feed y WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Controls & Preview Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 overflow-y-auto">
          
          {/* Controls Column (Left) */}
          <div className="md:col-span-5 space-y-5">
            
            {/* Type Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">1. Tipo de Placa</label>
              <div className="grid grid-cols-2 gap-2">
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

            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">2. Formato de Imagen</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setAspectRatio('story'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    aspectRatio === 'story' ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  📱 Story / WhatsApp (9:16)
                </button>
                <button
                  onClick={() => { setAspectRatio('square'); soundEffects.playScoreBeep(); }}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    aspectRatio === 'square' ? 'bg-primary/20 border-primary text-white' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🟦 Feed / Cuadrado (1:1)
                </button>
              </div>
            </div>

            {/* Theme Style Selector */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">3. Estilo Visual</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setThemeStyle('dark'); soundEffects.playScoreBeep(); }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    themeStyle === 'dark' ? 'bg-blue-900/40 border-blue-500 text-blue-200' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🌑 Hard Court
                </button>
                <button
                  onClick={() => { setThemeStyle('clay'); soundEffects.playScoreBeep(); }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    themeStyle === 'clay' ? 'bg-orange-950/60 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-muted'
                  }`}
                >
                  🧱 Polvo Ladrillo
                </button>
                <button
                  onClick={() => { setThemeStyle('grass'); soundEffects.playScoreBeep(); }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
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
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-primary to-orange-500 text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                <Download size={18} />
                {isGenerating ? 'Generando PNG...' : 'Descargar Imagen (PNG)'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold hover:bg-emerald-600/30 active:scale-[0.98] transition-all"
              >
                <Share2 size={18} />
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
              } rounded-2xl bg-gradient-to-b ${getThemeBg()} border p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white select-none transition-all duration-300`}
            >
              {/* Subtle Watermark BG Logo */}
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none"></div>

              {/* Graphic Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider text-primary font-display">SMASH</span>
                    <span className="text-[10px] uppercase font-bold text-muted bg-white/5 px-2 py-0.5 rounded-full">Oficial</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getAccentColor()}`}>
                    {tier.label}
                  </span>
                </div>

                <div className="pt-1">
                  <h3 className="text-base font-extrabold text-white leading-tight uppercase line-clamp-2">
                    {tournament.name}
                  </h3>
                  <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                    📍 {tournament.institutions?.name || 'Club'} • {tournament.category} {tournament.gender || 'Caballeros'}
                  </p>
                </div>
              </div>

              {/* Graphic Content Body */}
              <div className="my-auto py-3">
                {graphicType === 'champion' && (
                  <div className="text-center space-y-3 py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-bounce">
                      <Trophy size={32} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase">CAMPEÓN DEL TORNEO</div>
                      <div className="text-xl font-black text-white mt-1">
                        {championName || tournament.champion_name || 'Por Definir'}
                      </div>
                      <div className="text-xs text-amber-200/70 mt-0.5">+{tier.pointsWinner} Pts para el Ranking</div>
                    </div>
                  </div>
                )}

                {graphicType === 'playoffs' && (
                  <div className="space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Trophy size={12} /> Cuadro de Eliminación
                    </div>
                    {(!playoffRounds || playoffRounds.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Fase final en preparación</div>
                    ) : (
                      <div className="space-y-1.5 max-h-[190px] overflow-hidden">
                        {playoffRounds.slice(0, 3).map((r, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between items-center">
                            <span className="font-bold text-white text-[11px]">{r.name}</span>
                            <span className="text-[10px] text-primary font-bold">{(r.matches || []).length} Partido(s)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {graphicType === 'standings' && (
                  <div className="space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Grid size={12} /> Tabla de Posiciones
                    </div>
                    {(!zones || zones.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Zonas aún no generadas</div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-hidden">
                        {zones.slice(0, 3).map((z, i) => {
                          const zoneTitle = z.groupName || (z as any).name || `Zona ${z.groupNumber || (i + 1)}`;
                          const zonePlayers = z.players || (z as any).standings || [];
                          return (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2">
                              <div className="font-black text-[10px] text-orange-300 uppercase mb-1">{zoneTitle}</div>
                              {zonePlayers.slice(0, 3).map((st: any, idx: number) => {
                                const playerName = st.playerName || st.name || 'Jugador';
                                const won = st.matchesWon ?? st.won ?? 0;
                                const lost = st.matchesLost ?? st.lost ?? 0;
                                return (
                                  <div key={idx} className="flex justify-between items-center text-[10px] py-0.5 border-b border-white/5 last:border-0">
                                    <span className="font-bold text-white truncate max-w-[150px]">{idx + 1}. {playerName}</span>
                                    <span className="text-muted font-bold text-[9px]">{won}G - {lost}P ({st.points ?? 0} pts)</span>
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
                  <div className="space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={12} /> Orden de Juego Oficial
                    </div>
                    {(!matches || matches.length === 0) ? (
                      <div className="text-center py-6 text-muted text-xs italic">Sin partidos programados hoy</div>
                    ) : (
                      <div className="space-y-1.5 max-h-[190px] overflow-hidden">
                        {matches.slice(0, 4).map((m, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between items-center text-[10px]">
                            <span className="font-bold text-white truncate max-w-[170px]">
                              {m.player1_name || 'Jugador 1'} vs {m.player2_name || 'Jugador 2'}
                            </span>
                            <span className="text-primary font-bold">{m.scheduled_at ? m.scheduled_at.slice(11, 16) : 'A confirmar'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Graphic Footer */}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[9px] text-muted">
                <span>smashtenis.lnx.com.ar</span>
                <span className="font-bold text-white">#SmashTennis</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
