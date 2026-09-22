import React from 'react';
import { 
    Eye, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    Shield 
} from 'lucide-react';
import { Tournament, User } from '../../types';
import { normalizeCategoryKey } from '../../utils/ranking';

interface TournamentBannersProps {
    genderElig: {
        tournamentGenderLabel: string;
        badgeLabel: string;
        isInformativeOnly: boolean;
    };
    tournament: Tournament;
    user: User;
    getUserMasterEligibility: (user: User, topN?: number) => { eligible: boolean; rank?: number };
    allProfilesForMasters: any[];
}

export const TournamentBanners: React.FC<TournamentBannersProps> = ({
    genderElig,
    tournament,
    user,
    getUserMasterEligibility,
    allProfilesForMasters,
}) => {
    return (
        <>

            {/* ── Gender Informative Mode Banner ────────────────────────────────── */}
            {genderElig.isInformativeOnly && (
                <div className={`border rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md ${
                    genderElig.tournamentGenderLabel === 'Damas'
                        ? 'bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border-pink-500/30 text-pink-200'
                        : 'bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/30 text-blue-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${
                            genderElig.tournamentGenderLabel === 'Damas'
                                ? 'bg-pink-500/20 border-pink-500/30'
                                : 'bg-blue-500/20 border-blue-500/30'
                        }`}>
                            <Eye size={20} className={genderElig.tournamentGenderLabel === 'Damas' ? 'text-pink-300' : 'text-blue-300'} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider">Modo Informativo</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    genderElig.tournamentGenderLabel === 'Damas' ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                }`}>
                                    {genderElig.badgeLabel}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Estás visualizando los cuadros, zonas y marcadores de este torneo exclusivo de {genderElig.tournamentGenderLabel}. Las inscripciones de jugadores están reservadas para dicha rama.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Masters Eligibility Banner ────────────────────────────────────── */}
            {tournament.tier_applied === 'masters' && (() => {
                const MASTERS_TOP_N = 20;
                const masterElig = getUserMasterEligibility(user, MASTERS_TOP_N);
                const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'coordinator';
                return (
                    <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-emerald-900/40 border border-emerald-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-lg">
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow">
                                👑
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-emerald-400">Torneo Master Final</div>
                                <div className="text-white font-bold text-sm">Acceso exclusivo por ranking</div>
                            </div>
                        </div>
                        <div className="flex-1 text-xs text-slate-300 leading-relaxed">
                            Este torneo está reservado para los <span className="text-emerald-300 font-bold">Top {MASTERS_TOP_N} jugadores</span> de cada categoría según el ranking oficial del circuito.
                            Es el cierre de temporada más prestigioso del año.
                        </div>
                        {!isAdmin && (
                            allProfilesForMasters.length === 0 ? (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-xs text-muted flex-shrink-0">
                                    <Loader2 size={13} className="animate-spin" /> Verificando ranking...
                                </div>
                            ) : masterElig.eligible ? (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex-shrink-0 shadow">
                                    <CheckCircle2 size={14} /> Clasificado · #{masterElig.rank} en {normalizeCategoryKey(user.category)}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-bold text-xs flex-shrink-0">
                                    <AlertTriangle size={14} /> No clasificado · #{masterElig.rank} en {normalizeCategoryKey(user.category)}
                                </div>
                            )
                        )}
                        {isAdmin && (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex-shrink-0">
                                <Shield size={14} /> Admin · Puedes inscribir manualmente
                            </div>
                        )}
                    </div>
                );
            })()}
        </>
    );
};
