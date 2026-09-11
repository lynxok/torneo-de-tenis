import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trophy, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Flame,
  Zap
} from 'lucide-react';
import gsap from 'gsap';
import { soundEffects } from '../services/soundEffects';

interface MatchQuickScorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player1Name: string;
  player2Name: string;
  currentScore?: string;
  onSaveScore: (scoreString: string, winnerId?: string) => Promise<void>;
  p1Id?: string;
  p2Id?: string;
}

export const MatchQuickScorerModal: React.FC<MatchQuickScorerModalProps> = ({
  isOpen,
  onClose,
  player1Name,
  player2Name,
  currentScore = '',
  onSaveScore,
  p1Id,
  p2Id
}) => {
  const [activeSet, setActiveSet] = useState<1 | 2 | 3>(1);
  const [set1, setSet1] = useState<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
  const [set2, setSet2] = useState<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
  const [set3, setSet3] = useState<{ p1: number | null; p2: number | null }>({ p1: null, p2: null });
  const [isWalkover, setIsWalkover] = useState(false);
  const [woWinner, setWoWinner] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<HTMLDivElement>(null);

  // Inicializar con resultado previo si existe
  useEffect(() => {
    if (!isOpen) return;

    if (currentScore) {
      if (currentScore.includes('W.O.') || currentScore.includes('WO')) {
        setIsWalkover(true);
      } else {
        const parts = currentScore.trim().split(/\s+/);
        if (parts[0]) {
          const [s1p1, s1p2] = parts[0].split('-').map(Number);
          if (!isNaN(s1p1) && !isNaN(s1p2)) setSet1({ p1: s1p1, p2: s1p2 });
        }
        if (parts[1]) {
          const [s2p1, s2p2] = parts[1].split('-').map(Number);
          if (!isNaN(s2p1) && !isNaN(s2p2)) setSet2({ p1: s2p1, p2: s2p2 });
        }
        if (parts[2]) {
          const [s3p1, s3p2] = parts[2].split('-').map(Number);
          if (!isNaN(s3p1) && !isNaN(s3p2)) setSet3({ p1: s3p1, p2: s3p2 });
        }
      }
    } else {
      setSet1({ p1: null, p2: null });
      setSet2({ p1: null, p2: null });
      setSet3({ p1: null, p2: null });
      setActiveSet(1);
      setIsWalkover(false);
    }
  }, [isOpen, currentScore]);

  // Animación suave de apertura
  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.92, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Determinar sets ganados
  const getSetWinner = (s: { p1: number | null; p2: number | null }) => {
    if (s.p1 === null || s.p2 === null) return null;
    if (s.p1 > s.p2) return 1;
    if (s.p2 > s.p1) return 2;
    return null;
  };

  const s1Winner = getSetWinner(set1);
  const s2Winner = getSetWinner(set2);
  const s3Winner = getSetWinner(set3);

  let p1Sets = (s1Winner === 1 ? 1 : 0) + (s2Winner === 1 ? 1 : 0) + (s3Winner === 1 ? 1 : 0);
  let p2Sets = (s1Winner === 2 ? 1 : 0) + (s2Winner === 2 ? 1 : 0) + (s3Winner === 2 ? 1 : 0);

  const matchWinner = isWalkover ? woWinner : p1Sets >= 2 ? 1 : p2Sets >= 2 ? 2 : null;

  // Preset común para sets rápidos
  const standardPresets = [
    { label: '6 - 0', p1: 6, p2: 0 },
    { label: '6 - 1', p1: 6, p2: 1 },
    { label: '6 - 2', p1: 6, p2: 2 },
    { label: '6 - 3', p1: 6, p2: 3 },
    { label: '6 - 4', p1: 6, p2: 4 },
    { label: '7 - 5', p1: 7, p2: 5 },
    { label: '7 - 6', p1: 7, p2: 6 },
    { label: '0 - 6', p1: 0, p2: 6 },
    { label: '1 - 6', p1: 1, p2: 6 },
    { label: '2 - 6', p1: 2, p2: 6 },
    { label: '3 - 6', p1: 3, p2: 6 },
    { label: '4 - 6', p1: 4, p2: 6 },
    { label: '5 - 7', p1: 5, p2: 7 },
    { label: '6 - 7', p1: 6, p2: 7 },
  ];

  const superTiebreakPresets = [
    { label: '10 - 4', p1: 10, p2: 4 },
    { label: '10 - 6', p1: 10, p2: 6 },
    { label: '10 - 8', p1: 10, p2: 8 },
    { label: '11 - 9', p1: 11, p2: 9 },
    { label: '4 - 10', p1: 4, p2: 10 },
    { label: '6 - 10', p1: 6, p2: 10 },
    { label: '8 - 10', p1: 8, p2: 10 },
    { label: '9 - 11', p1: 9, p2: 11 },
  ];

  const applyPreset = (p1: number, p2: number) => {
    soundEffects.play('click');
    if (activeSet === 1) {
      setSet1({ p1, p2 });
      setActiveSet(2);
    } else if (activeSet === 2) {
      setSet2({ p1, p2 });
      // Si con este set ya alguien ganó 2-0, no hace falta set 3
      const willP1Win = (s1Winner === 1 && p1 > p2);
      const willP2Win = (s1Winner === 2 && p2 > p1);
      if (!willP1Win && !willP2Win) {
        setActiveSet(3);
      }
    } else if (activeSet === 3) {
      setSet3({ p1, p2 });
    }
  };

  const handleCustomInput = (player: 'p1' | 'p2', val: number) => {
    const updater = (prev: { p1: number | null; p2: number | null }) => ({
      ...prev,
      [player]: val
    });

    if (activeSet === 1) setSet1(updater);
    if (activeSet === 2) setSet2(updater);
    if (activeSet === 3) setSet3(updater);
  };

  const buildScoreString = () => {
    if (isWalkover) {
      return woWinner === 1 ? 'W.O. (Ganador: Jugador 1)' : 'W.O. (Ganador: Jugador 2)';
    }

    const sets: string[] = [];
    if (set1.p1 !== null && set1.p2 !== null) sets.push(`${set1.p1}-${set1.p2}`);
    if (set2.p1 !== null && set2.p2 !== null) sets.push(`${set2.p1}-${set2.p2}`);
    if (set3.p1 !== null && set3.p2 !== null) sets.push(`${set3.p1}-${set3.p2}`);
    return sets.join(' ');
  };

  const handleConfirm = async () => {
    setError(null);
    if (!isWalkover && !matchWinner) {
      setError('Debes completar al menos 2 sets ganados para registrar el ganador');
      soundEffects.play('click');
      return;
    }

    const scoreString = buildScoreString();
    const winnerId = matchWinner === 1 ? p1Id : p2Id;

    try {
      setIsSaving(true);
      
      // Animación GSAP de celebración en trofeo
      if (trophyRef.current) {
        gsap.to(trophyRef.current, {
          scale: 1.4,
          rotation: 15,
          duration: 0.3,
          yoyo: true,
          repeat: 3,
          ease: 'power2.inOut'
        });
      }

      await onSaveScore(scoreString, winnerId);
      soundEffects.play('success');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar resultado');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSetState = activeSet === 1 ? set1 : activeSet === 2 ? set2 : set3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div 
        ref={modalRef}
        className="bg-surface border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-primary/10 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-dark/40">
          <div className="flex items-center gap-3">
            <div ref={trophyRef} className="p-2.5 rounded-2xl bg-primary/15 text-primary">
              <Trophy size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                Cargar Marcador Rápido
              </h3>
              <p className="text-xs text-muted">
                Keypad táctil con sets automáticos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Marcador En Vivo Visual */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-dark/60 to-surface border-b border-white/5 space-y-3">
          {/* Jugador 1 */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            matchWinner === 1 
              ? 'bg-primary/15 border-primary/40 shadow-sm shadow-primary/20' 
              : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex items-center gap-2 min-w-0 pr-2">
              {matchWinner === 1 && <Flame size={18} className="text-primary flex-shrink-0 animate-bounce" />}
              <span className="font-bold text-sm sm:text-base text-white truncate">
                {player1Name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set1.p1 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set1.p1 ?? '-'}
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set2.p1 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set2.p1 ?? '-'}
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set3.p1 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set3.p1 ?? '-'}
              </div>
            </div>
          </div>

          {/* Jugador 2 */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            matchWinner === 2 
              ? 'bg-primary/15 border-primary/40 shadow-sm shadow-primary/20' 
              : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex items-center gap-2 min-w-0 pr-2">
              {matchWinner === 2 && <Flame size={18} className="text-primary flex-shrink-0 animate-bounce" />}
              <span className="font-bold text-sm sm:text-base text-white truncate">
                {player2Name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set1.p2 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set1.p2 ?? '-'}
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set2.p2 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set2.p2 ?? '-'}
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${set3.p2 !== null ? 'bg-white/15 text-white' : 'bg-white/5 text-muted'}`}>
                {set3.p2 ?? '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Set Activo */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-dark/60 p-1 rounded-2xl border border-white/10">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    soundEffects.play('click');
                    setActiveSet(s);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeSet === s
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  Set {s} {s === 3 ? '(STB)' : ''}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                soundEffects.play('click');
                setIsWalkover(!isWalkover);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isWalkover 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-white/5 text-muted hover:text-white border-white/10'
              }`}
            >
              W.O. / Retiro
            </button>
          </div>

          {isWalkover ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <span className="text-xs text-amber-200 font-bold block">
                Seleccioná el ganador por Walkover / Retiro:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWoWinner(1)}
                  className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                    woWinner === 1 ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/5 text-white border-white/10'
                  }`}
                >
                  {player1Name} (W.O.)
                </button>
                <button
                  onClick={() => setWoWinner(2)}
                  className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                    woWinner === 2 ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/5 text-white border-white/10'
                  }`}
                >
                  {player2Name} (W.O.)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Presets Rápidos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider">
                    {activeSet === 3 ? 'Presets Super Tie-Break' : `Presets Rápidos Set ${activeSet}`}
                  </span>
                  <span className="text-[11px] text-primary font-medium">Toque único</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {(activeSet === 3 ? superTiebreakPresets : standardPresets).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(p.p1, p.p2)}
                      className="min-h-[44px] py-2 px-1 rounded-xl bg-white/5 hover:bg-primary/20 hover:border-primary/40 border border-white/10 text-white font-bold text-xs transition-all active:scale-95 text-center flex items-center justify-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ajuste manual por si fue un resultado atípico */}
              <div className="pt-2 border-t border-white/5">
                <span className="text-[11px] text-muted font-bold block mb-2">
                  Ajuste manual games Set {activeSet}:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-dark/40 p-2 rounded-2xl border border-white/5">
                    <span className="text-xs text-muted truncate flex-1">{player1Name}</span>
                    <input 
                      type="number"
                      min={0}
                      max={99}
                      placeholder="0"
                      value={currentSetState.p1 ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleCustomInput('p1', parseInt(e.target.value) || 0)}
                      className="w-12 h-10 text-center font-bold text-white bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-dark/40 p-2 rounded-2xl border border-white/5">
                    <span className="text-xs text-muted truncate flex-1">{player2Name}</span>
                    <input 
                      type="number"
                      min={0}
                      max={99}
                      placeholder="0"
                      value={currentSetState.p2 ?? ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleCustomInput('p2', parseInt(e.target.value) || 0)}
                      className="w-12 h-10 text-center font-bold text-white bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-dark/50 flex items-center gap-3">
          <button
            onClick={() => {
              soundEffects.play('click');
              setSet1({ p1: null, p2: null });
              setSet2({ p1: null, p2: null });
              setSet3({ p1: null, p2: null });
              setActiveSet(1);
              setIsWalkover(false);
            }}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all active:scale-95"
            title="Reiniciar marcador"
          >
            <RotateCcw size={18} />
          </button>
          <button
            disabled={isSaving}
            onClick={handleConfirm}
            className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-primary to-primary-hover hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <Zap size={18} className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Confirmar y Guardar Marcador</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
