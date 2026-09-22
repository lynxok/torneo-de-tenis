import React from 'react';
import { Tournament, Match, TournamentPlayer } from '../../types';
import { formatPlayerName, formatMatchScore } from '../../utils/formatters';

interface TournamentPrintSheetsProps {
    tournament: Tournament;
    players: TournamentPlayer[];
    matches: Match[];
    formatFullDateDisplay: (dateStr: string) => string;
    selectedOopDate: string;
    oopDateMatches: Match[];
    oopMatchesByCourt: Array<{ court: string; matches: Match[] }>;
    getMatchTime: (m: Match) => string;
}

export const TournamentPrintSheets: React.FC<TournamentPrintSheetsProps> = ({
    tournament,
    players,
    matches,
    formatFullDateDisplay,
    selectedOopDate,
    oopDateMatches,
    oopMatchesByCourt,
    getMatchTime,
}) => {
    return (
        <>
            {/* PRINTABLE CONTROL SHEET (A4 - Only visible during print) */}
            <div id="print-control-sheet" className="hidden print:block bg-white text-black font-sans z-[99999]">
                <div className="border-b-2 border-black pb-2 mb-3 flex justify-between items-start">
                    <div className="space-y-0.5">
                        <div className="text-[9px] font-black tracking-widest text-slate-700 uppercase">
                            SMASH TENNIS MANAGER • PLANILLA OFICIAL DE MESA DE CONTROL
                        </div>
                        <h1 className="text-xl font-black text-black uppercase tracking-tight">{tournament.name}</h1>
                        <p className="text-[11px] text-slate-800">
                            <strong>Sede / Club:</strong> {tournament.institutions?.name || 'Club'} • <strong>Categoría:</strong> {tournament.category} ({tournament.gender || 'Caballeros'}) • <strong>Modalidad:</strong> {tournament.type === 'doubles' ? 'Dobles' : 'Singles'}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <img
                            src="/Smash.png"
                            alt="Smash Tenis"
                            className="h-8 w-auto object-contain"
                            crossOrigin="anonymous"
                        />
                        <div className="text-right text-[9px] text-slate-700 font-semibold">
                            <div><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-AR')}</div>
                            <div><strong>Total Inscriptos:</strong> {players.length}</div>
                        </div>
                    </div>
                </div>

                {/* Matches Table */}
                <div className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-wider bg-slate-200 p-1.5 border border-black mb-2">
                        ORDEN DE JUEGO & RESULTADOS DE PARTIDOS
                    </h2>
                    <table className="w-full text-xs border-collapse border border-black table-fixed">
                        <thead>
                            <tr className="bg-slate-100 text-center font-bold h-7">
                                <th className="border border-black p-1 w-[3%]">#</th>
                                <th className="border border-black p-1 w-[11%]">Fase / Zona</th>
                                <th className="border border-black p-1 w-[7%]">Horario</th>
                                <th className="border border-black p-1 w-[7%]">Cancha</th>
                                <th className="border border-black p-1 text-left pl-2 w-[21%]">Jugador / Pareja 1</th>
                                <th className="border border-black p-1 text-left pl-2 w-[21%]">Jugador / Pareja 2</th>
                                <th className="border border-black p-1 w-[5%]">Set 1</th>
                                <th className="border border-black p-1 w-[5%]">Set 2</th>
                                <th className="border border-black p-1 w-[5%]">STB</th>
                                <th className="border border-black p-1 w-[15%]">Ganador</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="border border-black p-4 text-center italic">Sin partidos generados</td>
                                </tr>
                            ) : (
                                matches.map((m, idx) => {
                                    const isDoubles = tournament.type === 'doubles';
                                    const p1Name = isDoubles ? (m.team1_name || formatPlayerName(m.player1_name)) : formatPlayerName(m.player1_name) || 'Jugador 1';
                                    const p2Name = isDoubles ? (m.team2_name || formatPlayerName(m.player2_name)) : formatPlayerName(m.player2_name) || 'Jugador 2';
                                    
                                    let s1 = '', s2 = '', s3 = '';
                                    if (m.score && typeof m.score === 'object') {
                                        s1 = m.score.set1 || '';
                                        s2 = m.score.set2 || '';
                                        s3 = m.score.set3 || m.score.stb || '';
                                    } else if (typeof m.score === 'string' && m.score.trim()) {
                                        const parts = m.score.trim().split(/\s+/);
                                        s1 = parts[0] || '';
                                        s2 = parts[1] || '';
                                        s3 = parts[2] || '';
                                    }

                                    const winnerDisplayName = m.winner_name || (m.winner_id ? (m.winner_id === m.player1_id ? p1Name : p2Name) : '');

                                    return (
                                        <tr key={idx} className="text-center h-8">
                                            <td className="border border-black p-1 font-bold">{idx + 1}</td>
                                            <td className="border border-black p-1 font-semibold truncate">{m.round || (m.group_number ? `Zona ${m.group_number}` : 'Fase Previa')}</td>
                                            <td className="border border-black p-1">{m.scheduled_at ? (new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs') : '___:___'}</td>
                                            <td className="border border-black p-1 font-semibold truncate">{m.court_name || 'Cancha ___'}</td>
                                            <td className="border border-black p-1 text-left pl-2 font-bold truncate">{p1Name}</td>
                                            <td className="border border-black p-1 text-left pl-2 font-bold truncate">{p2Name}</td>
                                            <td className="border border-black p-1 font-mono font-bold">{m.is_played ? s1 : ''}</td>
                                            <td className="border border-black p-1 font-mono font-bold">{m.is_played ? s2 : ''}</td>
                                            <td className="border border-black p-1 font-mono font-bold">{m.is_played ? s3 : ''}</td>
                                            <td className="border border-black p-1 font-bold text-slate-900 truncate">{winnerDisplayName}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Signatures & Footer */}
                <div className="mt-8 pt-4 border-t border-black flex justify-between items-end text-xs">
                    <div className="text-center w-52">
                        <div className="border-b border-black mb-1 h-8"></div>
                        <span>Firma Fiscalizador / Juez de Mesa</span>
                    </div>
                    <div className="text-center w-52">
                        <div className="border-b border-black mb-1 h-8"></div>
                        <span>Firma Director del Torneo</span>
                    </div>
                </div>
            </div>

            {/* PRINTABLE DAILY ORDER OF PLAY (A4 - Only visible during print) */}
            <div id="print-oop-sheet" className="hidden print:block bg-white text-black font-sans z-[99999]">
                <div className="border-b-2 border-black pb-2 mb-3 flex justify-between items-start">
                    <div className="space-y-0.5">
                        <div className="text-[9px] font-black tracking-widest text-slate-700 uppercase">
                            SMASH TENNIS MANAGER • PROGRAMACIÓN OFICIAL DEL DÍA
                        </div>
                        <h1 className="text-xl font-black text-black uppercase tracking-tight">{tournament.name}</h1>
                        <p className="text-[11px] text-slate-800">
                            <strong>Club / Sede:</strong> {tournament.institutions?.name || 'Club'} • <strong>Jornada:</strong> {formatFullDateDisplay(selectedOopDate)} • <strong>Categoría:</strong> {tournament.category} ({tournament.gender || 'Caballeros'})
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <img
                            src="/Smash.png"
                            alt="Smash Tenis"
                            className="h-8 w-auto object-contain"
                            crossOrigin="anonymous"
                        />
                        <div className="text-right text-[9px] text-slate-700 font-semibold">
                            <div><strong>Emisión:</strong> {new Date().toLocaleDateString('es-AR')}</div>
                            <div><strong>Partidos en Jornada:</strong> {oopDateMatches.length}</div>
                        </div>
                    </div>
                </div>

                {/* Courts Grid for Print */}
                <div className="space-y-4 mb-4">
                    {oopMatchesByCourt.map(({ court, matches: cMatches }) => (
                        <div key={court} className="border border-black rounded p-2">
                            <div className="bg-slate-200 border-b border-black p-1 text-xs font-black uppercase flex justify-between">
                                <span>{court}</span>
                                <span>{cMatches.length} Turnos</span>
                            </div>
                            <table className="w-full text-xs border-collapse table-fixed mt-1">
                                <thead>
                                    <tr className="bg-slate-100 text-center font-bold h-6 border-b border-black">
                                        <th className="border border-black p-1 w-[12%]">Horario / Turno</th>
                                        <th className="border border-black p-1 w-[18%]">Fase</th>
                                        <th className="border border-black p-1 text-left pl-2 w-[28%]">Jugador / Pareja 1</th>
                                        <th className="border border-black p-1 text-left pl-2 w-[28%]">Jugador / Pareja 2</th>
                                        <th className="border border-black p-1 w-[14%]">Resultado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cMatches.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-2 italic text-slate-500 border border-black">
                                                Sin partidos programados en esta cancha
                                            </td>
                                        </tr>
                                    ) : (
                                        cMatches.map(m => {
                                            const time = getMatchTime(m);
                                            const p1 = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                            const p2 = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                            const score = formatMatchScore(m.score);

                                            return (
                                                <tr key={m.id} className="text-center h-7 border-b border-black">
                                                    <td className="border border-black p-1 font-bold">{time}</td>
                                                    <td className="border border-black p-1">{m.round} {m.group_number ? `(G${m.group_number})` : ''}</td>
                                                    <td className="border border-black p-1 text-left pl-2 font-bold">{p1}</td>
                                                    <td className="border border-black p-1 text-left pl-2 font-bold">{p2}</td>
                                                    <td className="border border-black p-1 font-mono">{score || '-'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* Print Sponsors Footer */}
                {((tournament?.sponsors || []).filter(s => s.is_active).length > 0) && (
                    <div className="pt-2 border-t-2 border-black flex items-center justify-between text-xs">
                        <span className="font-black uppercase text-[10px]">Auspiciantes Oficiales del Club:</span>
                        <div className="flex items-center gap-3">
                            {(tournament?.sponsors || []).filter(s => s.is_active).map(s => (
                                <span key={s.id} className="font-bold text-[10px] border border-black px-2 py-0.5 rounded">
                                    {s.name} ({s.category === 'main' ? 'Sponsor Principal' : 'Auspiciante'})
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
