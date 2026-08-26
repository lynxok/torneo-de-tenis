import React, { useState, useMemo } from 'react';
import { UserProfile, PlayerStatsSummary } from '../types';
import { TrendingUp, Award, Calendar, Activity, Zap, Flame, Shield, Info, BarChart3, CheckCircle2 } from 'lucide-react';

interface RankingEvolutionChartProps {
    user: UserProfile;
    stats: PlayerStatsSummary | null;
    rankInfo: { categoryRank: number; globalRank: number; points: number };
}

export const RankingEvolutionChart: React.FC<RankingEvolutionChartProps> = ({
    user,
    stats,
    rankInfo
}) => {
    const [activeTab, setActiveTab] = useState<'curve' | 'breakdown'>('curve');
    const [hoveredPoint, setHoveredPoint] = useState<{
        date: string;
        points: number;
        rank?: number;
        tournament_name?: string;
        index: number;
        x: number;
        y: number;
    } | null>(null);

    const historyData = useMemo(() => {
        if (!stats || !stats.rankingHistory || stats.rankingHistory.length === 0) {
            const defaultPoints = rankInfo.points || (user.matches_won ? user.matches_won * 50 : 0);
            return [
                { date: '2026-01-01', points: 0, rank: 10, tournament_name: 'Inicio de Temporada' },
                { date: new Date().toISOString().split('T')[0], points: defaultPoints, rank: rankInfo.categoryRank, tournament_name: 'Puntos Acumulados' }
            ];
        }

        if (stats.rankingHistory.length === 1) {
            return [
                { date: '2026-01-01', points: 0, rank: 10, tournament_name: 'Inicio de Temporada' },
                stats.rankingHistory[0]
            ];
        }

        return stats.rankingHistory;
    }, [stats, rankInfo, user]);

    const maxPoints = useMemo(() => {
        const highest = Math.max(...historyData.map(d => d.points), rankInfo.points, 100);
        return Math.ceil(highest * 1.15); // Add 15% top headroom
    }, [historyData, rankInfo]);

    // Calculate chart points (SVG 0-100 x, 0-50 y coordinate space)
    const pointsList = useMemo(() => {
        const len = historyData.length;
        return historyData.map((item, idx) => {
            const x = len > 1 ? (idx / (len - 1)) * 100 : 50;
            const y = 46 - ((item.points || 0) / maxPoints) * 38;
            return { ...item, x, y, idx };
        });
    }, [historyData, maxPoints]);

    const polylinePoints = useMemo(() => {
        return pointsList.map(p => `${p.x},${p.y}`).join(' ');
    }, [pointsList]);

    const polygonAreaPoints = useMemo(() => {
        if (pointsList.length === 0) return '0,50 100,50';
        return `0,50 ${polylinePoints} 100,50`;
    }, [pointsList, polylinePoints]);

    // Breakdown Stats
    const totalMatches = stats ? stats.totalMatches : (user.matches_won || 0);
    const wonMatches = stats ? stats.wonMatches : (user.matches_won || 0);
    const straightSetsWins = Math.max(0, wonMatches - (stats ? stats.threeSetsWon : 0));
    const threeSetsWins = stats ? stats.threeSetsWon : 0;
    const tieBreakRate = stats ? stats.tieBreakWinRate : 0;

    return (
        <div className="bg-gradient-to-br from-card via-slate-900 to-slate-950 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3.5">
                <div className="space-y-0.5">
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-primary" />
                        Evolución de Rendimiento & Ranking
                    </h3>
                    <p className="text-[11px] text-muted">
                        Progresión temporal de puntos oficiales y análisis de sets
                    </p>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                        onClick={() => setActiveTab('curve')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'curve'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-muted hover:text-white'
                        }`}
                    >
                        <TrendingUp size={13} /> Curva de Puntos
                    </button>
                    <button
                        onClick={() => setActiveTab('breakdown')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'breakdown'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-muted hover:text-white'
                        }`}
                    >
                        <BarChart3 size={13} /> Sets y Batallas
                    </button>
                </div>
            </div>

            {/* TAB 1: CURVA DE PUNTOS INTERACTIVA */}
            {activeTab === 'curve' && (
                <div className="space-y-4">
                    {/* SVG Chart Container */}
                    <div className="relative bg-black/30 border border-white/10 rounded-2xl p-4 pt-6 overflow-hidden">
                        
                        {/* Tooltip Overlay */}
                        {hoveredPoint && (
                            <div 
                                className="absolute z-20 top-2 bg-slate-900/95 border border-primary/40 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md text-xs pointer-events-none transition-all duration-150 animate-fade-in"
                                style={{
                                    left: `${Math.min(Math.max(hoveredPoint.x, 15), 85)}%`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="font-black text-primary flex items-center gap-1">
                                    <Award size={13} /> {hoveredPoint.points} pts
                                </div>
                                <div className="text-[10px] text-slate-300 font-medium truncate max-w-[160px]">
                                    {hoveredPoint.tournament_name || 'Torneo Oficial'}
                                </div>
                                <div className="text-[9px] text-muted flex items-center gap-1">
                                    <Calendar size={10} /> {hoveredPoint.date}
                                </div>
                            </div>
                        )}

                        {/* Chart Grid Lines */}
                        <div className="absolute inset-x-4 inset-y-6 flex flex-col justify-between pointer-events-none opacity-15">
                            <div className="border-b border-white border-dashed w-full" />
                            <div className="border-b border-white border-dashed w-full" />
                            <div className="border-b border-white border-dashed w-full" />
                        </div>

                        {/* SVG Drawing */}
                        <div className="h-32 sm:h-36 w-full relative">
                            <svg 
                                className="w-full h-full overflow-visible" 
                                viewBox="0 0 100 50" 
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#e15b34" stopOpacity="0.55" />
                                        <stop offset="70%" stopColor="#e15b34" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="#e15b34" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Gradient Fill Area */}
                                <polygon
                                    fill="url(#curveGradient)"
                                    points={polygonAreaPoints}
                                />

                                {/* Smooth Polyline */}
                                <polyline
                                    fill="none"
                                    stroke="#e15b34"
                                    strokeWidth="2.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={polylinePoints}
                                />

                                {/* Interactive Data Circles */}
                                {pointsList.map((pt) => (
                                    <g key={pt.idx} className="cursor-pointer">
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={hoveredPoint?.index === pt.idx ? 4.5 : 3}
                                            className={`${
                                                hoveredPoint?.index === pt.idx 
                                                    ? 'fill-white stroke-primary stroke-[2]' 
                                                    : 'fill-primary stroke-dark stroke-[1.5]'
                                            } transition-all duration-150`}
                                            onMouseEnter={() => setHoveredPoint({
                                                date: pt.date,
                                                points: pt.points,
                                                rank: pt.rank,
                                                tournament_name: pt.tournament_name,
                                                index: pt.idx,
                                                x: pt.x,
                                                y: pt.y
                                            })}
                                            onClick={() => setHoveredPoint({
                                                date: pt.date,
                                                points: pt.points,
                                                rank: pt.rank,
                                                tournament_name: pt.tournament_name,
                                                index: pt.idx,
                                                x: pt.x,
                                                y: pt.y
                                            })}
                                        />
                                    </g>
                                ))}
                            </svg>
                        </div>

                        {/* X-Axis Dates */}
                        <div className="flex justify-between items-center text-[10px] text-muted font-mono pt-2 border-t border-white/5">
                            <span>{historyData[0]?.date || 'Inicio'}</span>
                            <span className="text-primary font-bold">{historyData[historyData.length - 1]?.points || 0} pts acumulados</span>
                            <span>{historyData[historyData.length - 1]?.date || 'Hoy'}</span>
                        </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                            <div className="text-[10px] text-muted font-bold uppercase">Puntos Actuales</div>
                            <div className="text-base font-black text-primary mt-0.5">{rankInfo.points}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                            <div className="text-[10px] text-muted font-bold uppercase">Ranking Categoría</div>
                            <div className="text-base font-black text-amber-400 mt-0.5">#{rankInfo.categoryRank}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                            <div className="text-[10px] text-muted font-bold uppercase">Racha Récord</div>
                            <div className="text-base font-black text-orange-400 mt-0.5 flex items-center justify-center gap-1">
                                <Flame size={14} /> {stats ? stats.bestStreak : 0}
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                            <div className="text-[10px] text-muted font-bold uppercase">Efectividad General</div>
                            <div className="text-base font-black text-emerald-400 mt-0.5">{stats ? stats.winRate : 0}%</div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: RENDIMIENTO POR SETS & BATALLAS */}
            {activeTab === 'breakdown' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* Victorias 2 Sets Corridos vs 3 Sets */}
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>Distribución de Victorias</span>
                                <span className="text-primary">{wonMatches} PG Totales</span>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-300">En 2 sets corridos:</span>
                                        <strong className="text-emerald-400">{straightSetsWins} victorias</strong>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${wonMatches > 0 ? (straightSetsWins / wonMatches) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-300">En 3 sets / Super Tie-Break:</span>
                                        <strong className="text-amber-400">{threeSetsWins} batallas</strong>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${wonMatches > 0 ? (threeSetsWins / wonMatches) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rendimiento en Momentos Clave */}
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Zap size={15} className="text-amber-400" /> Presión & Tie-Breaks
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-center">
                                    <div className="text-[10px] text-muted font-bold">Tie-Breaks Ganados</div>
                                    <div className="text-lg font-black text-amber-300 mt-0.5">
                                        {stats ? `${stats.tieBreaksWon}/${stats.tieBreaksPlayed}` : '0/0'}
                                    </div>
                                    <div className="text-[9px] text-muted font-semibold">{tieBreakRate}% efectividad</div>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-center">
                                    <div className="text-[10px] text-muted font-bold">Partidos a 3 Sets</div>
                                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                                        {stats ? `${stats.threeSetsWon}/${stats.threeSetsPlayed}` : '0/0'}
                                    </div>
                                    <div className="text-[9px] text-muted font-semibold">Resistencia física</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};
