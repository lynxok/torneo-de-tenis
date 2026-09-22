import React from 'react';
import { Match } from '../../types';
import { Edit3, X, AlertTriangle, Trophy, Plus, RotateCcw, Loader2, Save } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatters';

export interface ScoreInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  isClubAdmin: boolean;
  isWalkover: boolean;
  onToggleWalkover: (isWo: boolean) => void;
  walkoverWinnerId: string;
  onWalkoverWinnerIdChange: (id: string) => void;
  scoreP1Set1: number | '';
  onScoreP1Set1Change: (val: number | '') => void;
  scoreP2Set1: number | '';
  onScoreP2Set1Change: (val: number | '') => void;
  tbP1Set1: number | '';
  onTbP1Set1Change: (val: number | '') => void;
  tbP2Set1: number | '';
  onTbP2Set1Change: (val: number | '') => void;
  scoreP1Set2: number | '';
  onScoreP1Set2Change: (val: number | '') => void;
  scoreP2Set2: number | '';
  onScoreP2Set2Change: (val: number | '') => void;
  tbP1Set2: number | '';
  onTbP1Set2Change: (val: number | '') => void;
  tbP2Set2: number | '';
  onTbP2Set2Change: (val: number | '') => void;
  hasSet3: boolean;
  onAddSet3: () => void;
  onRemoveSet3: () => void;
  isSet3SuperTiebreak: boolean;
  onSetIsSet3SuperTiebreak: (isStb: boolean) => void;
  scoreP1Set3: number | '';
  onScoreP1Set3Change: (val: number | '') => void;
  scoreP2Set3: number | '';
  onScoreP2Set3Change: (val: number | '') => void;
  tbP1Set3: number | '';
  onTbP1Set3Change: (val: number | '') => void;
  tbP2Set3: number | '';
  onTbP2Set3Change: (val: number | '') => void;
  computedWinnerInfo?: {
    winnerId: string;
    winnerName: string;
    p1Sets: number;
    p2Sets: number;
    isComplete: boolean;
    isTie: boolean;
  };
  onResetScore: () => void;
  onSaveScore: (e: React.FormEvent) => void;
  savingScore: boolean;
}

export const ScoreInputModal: React.FC<ScoreInputModalProps> = ({
  isOpen,
  onClose,
  match,
  isClubAdmin,
  isWalkover,
  onToggleWalkover,
  walkoverWinnerId,
  onWalkoverWinnerIdChange,
  scoreP1Set1,
  onScoreP1Set1Change,
  scoreP2Set1,
  onScoreP2Set1Change,
  tbP1Set1,
  onTbP1Set1Change,
  tbP2Set1,
  onTbP2Set1Change,
  scoreP1Set2,
  onScoreP1Set2Change,
  scoreP2Set2,
  onScoreP2Set2Change,
  tbP1Set2,
  onTbP1Set2Change,
  tbP2Set2,
  onTbP2Set2Change,
  hasSet3,
  onAddSet3,
  onRemoveSet3,
  isSet3SuperTiebreak,
  onSetIsSet3SuperTiebreak,
  scoreP1Set3,
  onScoreP1Set3Change,
  scoreP2Set3,
  onScoreP2Set3Change,
  tbP1Set3,
  onTbP1Set3Change,
  tbP2Set3,
  onTbP2Set3Change,
  computedWinnerInfo,
  onResetScore,
  onSaveScore,
  savingScore
}) => {
  if (!isOpen) return null;

  const p1Name = match.team1_name || match.player1_name || 'Jugador 1';
  const p2Name = match.team2_name || match.player2_name || 'Jugador 2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Edit3 size={18} className="text-primary" /> Cargar Resultado del Partido
          </h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={onSaveScore} className="p-6 space-y-4">
          <div className="text-center pb-2 border-b border-white/10">
            <span className="text-xs text-muted font-bold uppercase">{match.round}</span>
            <div className="text-white font-bold text-sm mt-1">
              {p1Name} vs {p2Name}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isClubAdmin ? (
                <span className="text-green-400 font-bold">✓ Oficialización directa como Administrador</span>
              ) : (
                <span className="text-amber-300">⏳ Tu rival tendrá 24hs para confirmar o se autoconfirmará</span>
              )}
            </div>
          </div>

          {/* MODE SELECTOR: REGULAR MATCH VS WALKOVER */}
          <div className="flex items-center justify-center p-1 bg-black/40 rounded-xl border border-white/10 gap-1">
            <button
              type="button"
              onClick={() => onToggleWalkover(false)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                !isWalkover 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎾 Partido Jugado
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleWalkover(true);
                if (!walkoverWinnerId && match) {
                  onWalkoverWinnerIdChange(match.player1_id);
                }
              }}
              className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                isWalkover 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Victoria por W.O.
            </button>
          </div>

          {isWalkover ? (
            <div className="space-y-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-fade-up">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  Se declarará ganador al jugador o equipo que se presentó. Por reglamento oficial, se computará un resultado de <strong>6-0 y 6-0</strong> para la tabla de posiciones.
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-amber-300 uppercase font-bold">¿Quién gana por Walkover (W.O.)?</label>
                <select
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-white text-xs font-bold focus:border-amber-400 outline-none"
                  value={walkoverWinnerId}
                  onChange={e => onWalkoverWinnerIdChange(e.target.value)}
                  required={isWalkover}
                >
                  <option value={match.player1_id}>
                    🏆 {p1Name} (Ganador por W.O.)
                  </option>
                  <option value={match.player2_id}>
                    🏆 {p2Name} (Ganador por W.O.)
                  </option>
                </select>
              </div>
            </div>
          ) : (
            <>
              {/* SETS INPUT */}
              <div className="space-y-3">
                {/* Set 1 */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <span className="text-xs font-bold text-white">Set 1</span>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      placeholder="0"
                      className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                      value={scoreP1Set1}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value)));
                        onScoreP1Set1Change(val);
                        if (val === 7 && scoreP2Set1 === 6) { onTbP1Set1Change(7); onTbP2Set1Change(5); }
                        else if (val === 6 && scoreP2Set1 === 7) { onTbP1Set1Change(5); onTbP2Set1Change(7); }
                      }}
                      required={!isWalkover}
                    />
                    <input
                      type="number"
                      min={0}
                      max={7}
                      placeholder="0"
                      className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                      value={scoreP2Set1}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value)));
                        onScoreP2Set1Change(val);
                        if (scoreP1Set1 === 7 && val === 6) { onTbP1Set1Change(7); onTbP2Set1Change(5); }
                        else if (scoreP1Set1 === 6 && val === 7) { onTbP1Set1Change(5); onTbP2Set1Change(7); }
                      }}
                      required={!isWalkover}
                    />
                  </div>

                  {/* Set 1 Tiebreak sub-input */}
                  {((scoreP1Set1 === 7 && scoreP2Set1 === 6) || (scoreP1Set1 === 6 && scoreP2Set1 === 7)) && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 rounded-lg animate-fade-up">
                      <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                        <Trophy size={12} className="text-amber-400" /> Puntos Tie-Break:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder={scoreP1Set1 === 7 ? "7" : "5"}
                          className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                          value={tbP1Set1}
                          onChange={e => onTbP1Set1Change(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <span className="text-muted text-xs font-bold">-</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder={scoreP2Set1 === 7 ? "7" : "5"}
                          className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                          value={tbP2Set1}
                          onChange={e => onTbP2Set1Change(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Set 2 */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <span className="text-xs font-bold text-white">Set 2</span>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      placeholder="0"
                      className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                      value={scoreP1Set2}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value)));
                        onScoreP1Set2Change(val);
                        if (val === 7 && scoreP2Set2 === 6) { onTbP1Set2Change(7); onTbP2Set2Change(5); }
                        else if (val === 6 && scoreP2Set2 === 7) { onTbP1Set2Change(5); onTbP2Set2Change(7); }
                      }}
                      required={!isWalkover}
                    />
                    <input
                      type="number"
                      min={0}
                      max={7}
                      placeholder="0"
                      className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                      value={scoreP2Set2}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value)));
                        onScoreP2Set2Change(val);
                        if (scoreP1Set2 === 7 && val === 6) { onTbP1Set2Change(7); onTbP2Set2Change(5); }
                        else if (scoreP1Set2 === 6 && val === 7) { onTbP1Set2Change(5); onTbP2Set2Change(7); }
                      }}
                      required={!isWalkover}
                    />
                  </div>

                  {/* Set 2 Tiebreak sub-input */}
                  {((scoreP1Set2 === 7 && scoreP2Set2 === 6) || (scoreP1Set2 === 6 && scoreP2Set2 === 7)) && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 rounded-lg animate-fade-up">
                      <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                        <Trophy size={12} className="text-amber-400" /> Puntos Tie-Break:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder={scoreP1Set2 === 7 ? "7" : "5"}
                          className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                          value={tbP1Set2}
                          onChange={e => onTbP1Set2Change(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <span className="text-muted text-xs font-bold">-</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder={scoreP2Set2 === 7 ? "7" : "5"}
                          className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                          value={tbP2Set2}
                          onChange={e => onTbP2Set2Change(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Set 3 / Super Tiebreak */}
                {hasSet3 ? (
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-2.5 animate-fade-up">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSetIsSet3SuperTiebreak(true)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                            isSet3SuperTiebreak
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                              : 'bg-white/5 text-muted hover:text-white border border-transparent'
                          }`}
                        >
                          ⚡ Súper Tie-Break (10 pts)
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetIsSet3SuperTiebreak(false)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                            !isSet3SuperTiebreak
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                              : 'bg-white/5 text-muted hover:text-white border border-transparent'
                          }`}
                        >
                          🎾 Set Regular
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={onRemoveSet3} 
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {isSet3SuperTiebreak ? "Puntos STB" : "Set 3 (Games)"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={isSet3SuperTiebreak ? 40 : 7}
                        placeholder={isSet3SuperTiebreak ? "10" : "0"}
                        className={`bg-sidebar border rounded-lg p-2 text-center text-white font-bold font-mono outline-none ${
                          isSet3SuperTiebreak ? "border-amber-500/40 focus:border-amber-400 text-amber-300" : "border-white/10 focus:border-primary"
                        }`}
                        value={scoreP1Set3}
                        onChange={e => {
                          const maxVal = isSet3SuperTiebreak ? 40 : 7;
                          const val = e.target.value === '' ? '' : Math.min(maxVal, Math.max(0, Number(e.target.value)));
                          onScoreP1Set3Change(val);
                          if (!isSet3SuperTiebreak) {
                            if (val === 7 && scoreP2Set3 === 6) { onTbP1Set3Change(7); onTbP2Set3Change(5); }
                            else if (val === 6 && scoreP2Set3 === 7) { onTbP1Set3Change(5); onTbP2Set3Change(7); }
                          }
                        }}
                        required={hasSet3}
                      />
                      <input
                        type="number"
                        min={0}
                        max={isSet3SuperTiebreak ? 40 : 7}
                        placeholder={isSet3SuperTiebreak ? "8" : "0"}
                        className={`bg-sidebar border rounded-lg p-2 text-center text-white font-bold font-mono outline-none ${
                          isSet3SuperTiebreak ? "border-amber-500/40 focus:border-amber-400 text-amber-300" : "border-white/10 focus:border-primary"
                        }`}
                        value={scoreP2Set3}
                        onChange={e => {
                          const maxVal = isSet3SuperTiebreak ? 40 : 7;
                          const val = e.target.value === '' ? '' : Math.min(maxVal, Math.max(0, Number(e.target.value)));
                          onScoreP2Set3Change(val);
                          if (!isSet3SuperTiebreak) {
                            if (scoreP1Set3 === 7 && val === 6) { onTbP1Set3Change(7); onTbP2Set3Change(5); }
                            else if (scoreP1Set3 === 6 && val === 7) { onTbP1Set3Change(5); onTbP2Set3Change(7); }
                          }
                        }}
                        required={hasSet3}
                      />
                    </div>

                    {/* Notice about 7-6 computation for STB */}
                    {isSet3SuperTiebreak ? (
                      <div className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                        ℹ️ El desempate se guardará oficialmente como <span className="font-mono font-bold text-amber-300">{Number(scoreP1Set3) > Number(scoreP2Set3) ? `7-6 (${scoreP1Set3 || 10}-${scoreP2Set3 || 8})` : `6-7 (${scoreP1Set3 || 8}-${scoreP2Set3 || 10})`}</span> sumando 7 y 6 games a la tabla.
                      </div>
                    ) : (
                      ((scoreP1Set3 === 7 && scoreP2Set3 === 6) || (scoreP1Set3 === 6 && scoreP2Set3 === 7)) && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 rounded-lg animate-fade-up">
                          <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                            <Trophy size={12} className="text-amber-400" /> Puntos Tie-Break:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={30}
                              placeholder={scoreP1Set3 === 7 ? "7" : "5"}
                              className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                              value={tbP1Set3}
                              onChange={e => onTbP1Set3Change(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            <span className="text-muted text-xs font-bold">-</span>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              placeholder={scoreP2Set3 === 7 ? "7" : "5"}
                              className="w-12 bg-sidebar border border-amber-500/30 rounded p-1 text-center text-xs text-white font-bold font-mono focus:border-amber-400 outline-none"
                              value={tbP2Set3}
                              onChange={e => onTbP2Set3Change(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onAddSet3}
                    className="w-full py-2 border border-dashed border-white/20 text-xs text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} /> Agregar 3er Set / Súper Tie-Break
                  </button>
                )}
              </div>

              {/* DEDUCED WINNER BANNER (AUTOMATIC - NO MANUAL SELECT) */}
              <div className="pt-2">
                {computedWinnerInfo?.isComplete ? (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-300 uppercase font-extrabold tracking-wider">
                          Ganador Automático ({computedWinnerInfo.p1Sets} - {computedWinnerInfo.p2Sets} sets)
                        </div>
                        <div className="text-sm font-black text-white">
                          {formatPlayerName(computedWinnerInfo.winnerName)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ✓ Verificado por Sets
                    </span>
                  </div>
                ) : computedWinnerInfo?.isTie && (scoreP1Set1 !== '' && scoreP2Set1 !== '') ? (
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-300 text-xs font-semibold animate-fade-in">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Empate 1-1 en sets. Debes activar y completar el <strong>3er Set / Súper Tie-Break</strong> para definir al ganador.</span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-slate-400">
                    Ingresa los resultados de los sets para calcular al ganador automáticamente.
                  </div>
                )}
              </div>
            </>
          )}

          <div className="pt-4 flex items-center justify-between gap-2 border-t border-white/10">
            {isClubAdmin && match.is_played ? (
              <button
                type="button"
                disabled={savingScore}
                onClick={onResetScore}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Anular el resultado cargado y volver el partido al estado 'Por Jugar'"
              >
                <RotateCcw size={13} /> Volver a Por Jugar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingScore}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {savingScore ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                {match.is_played ? 'Actualizar Marcador' : 'Guardar Marcador'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
