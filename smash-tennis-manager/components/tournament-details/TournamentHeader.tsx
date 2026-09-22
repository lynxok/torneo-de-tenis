import React from 'react';
import { 
    ChevronLeft, 
    Eye, 
    Trophy, 
    Award, 
    Calendar, 
    MapPin, 
    Users, 
    ImageIcon, 
    Printer, 
    Share2, 
    MessageCircle, 
    Loader2, 
    UserPlus, 
    CheckCircle2 
} from 'lucide-react';
import { Tournament, TournamentPlayer, User } from '../../types';
import { soundEffects } from '../../services/soundEffects';

interface TournamentHeaderProps {
    tournament: Tournament;
    players: TournamentPlayer[];
    user: User;
    onBack: () => void;
    genderElig: {
        tournamentGenderLabel: string;
        badgeLabel: string;
        isInformativeOnly: boolean;
    };
    competitionFormat: string;
    minGuaranteedMatches: number;
    countsForRanking: boolean;
    tierInfo: {
        badgeColor: string;
        textColor: string;
        borderColor: string;
        label: string;
        pointsWinner: number;
    };
    isUserMember: boolean;
    setShowEnrolledModal: (show: boolean) => void;
    canEditTournament: (tournament: Tournament, user: User) => boolean;
    handleOpenEditTournament: () => void;
    setShowGraphicModal: (show: boolean) => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    isRegClosed: boolean;
    isEnrolled: boolean;
    handleEnrollClick: () => void;
    isEnrolling: boolean;
    effectivePrice: number;
}

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
    tournament,
    players,
    user,
    onBack,
    genderElig,
    competitionFormat,
    minGuaranteedMatches,
    countsForRanking,
    tierInfo,
    isUserMember,
    setShowEnrolledModal,
    canEditTournament,
    handleOpenEditTournament,
    setShowGraphicModal,
    addToast,
    isRegClosed,
    isEnrolled,
    handleEnrollClick,
    isEnrolling,
    effectivePrice,
}) => {
    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-2 text-muted hover:text-white mb-4 transition-colors">
                <ChevronLeft size={18} /> Volver a Torneos
            </button>

            {/* Header */}
            <div className="relative h-64 rounded-3xl overflow-hidden bg-slate-800 group shadow-2xl border border-white/10">
                {tournament.image_url ? (
                    <img src={tournament.image_url} alt={tournament.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black opacity-60"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="bg-primary text-dark font-bold px-2.5 py-1 rounded-lg text-xs uppercase shadow-sm">{tournament.category}</span>
                                <span className="bg-white/10 text-white font-bold px-2.5 py-1 rounded-lg text-xs uppercase backdrop-blur-sm border border-white/10">{tournament.type}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm flex items-center gap-1 ${
                                    genderElig.tournamentGenderLabel === 'Damas'
                                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                                        : genderElig.tournamentGenderLabel === 'Mixto'
                                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}>
                                    {genderElig.badgeLabel}
                                </span>
                                {genderElig.isInformativeOnly && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        <Eye size={12} /> Modo Informativo
                                    </span>
                                )}
                                {competitionFormat === 'tabla_general_byes' ? (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        🏆 Tabla General + BYEs
                                    </span>
                                ) : competitionFormat === 'eliminacion_directa' ? (
                                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        ⚡ Eliminación Directa
                                    </span>
                                ) : (
                                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        🎾 Zonas + Playoffs
                                    </span>
                                )}
                                {minGuaranteedMatches > 0 && (
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        🎾 {minGuaranteedMatches} Partidos Garantizados
                                    </span>
                                )}
                                {countsForRanking ? (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${tierInfo.badgeColor} ${tierInfo.textColor} ${tierInfo.borderColor}`}>
                                        <Trophy size={12} /> {tierInfo.label} • {tierInfo.pointsWinner} pts
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-white/10 shadow-sm flex items-center gap-1.5" title="Este torneo no suma puntos para el ranking global oficial">
                                        🎾 Amistoso • Sin Puntos
                                    </span>
                                )}
                                {isUserMember && (
                                    <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <Award size={12} /> Socio del Club
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{tournament.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                                <span className="flex items-center gap-1"><Calendar size={14} className="text-primary" /> {new Date(tournament.start_date + 'T00:00:00').toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><MapPin size={14} className="text-primary" /> {tournament.institutions?.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        soundEffects.playScoreBeep();
                                        setShowEnrolledModal(true);
                                    }}
                                    className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/5 font-semibold"
                                    title="Abrir listado de jugadores inscriptos"
                                >
                                    <Users size={14} className="text-primary" /> {players.length} Inscritos
                                </button>
                            </div>
                        </div>

                        {/* Action and Share Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Ver Inscriptos Modal Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    soundEffects.playScoreBeep();
                                    setShowEnrolledModal(true);
                                }}
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm shadow-md"
                                title="Ver lista completa de jugadores inscriptos"
                            >
                                <Users size={16} className="text-primary" /> Ver Inscriptos ({players.length})
                            </button>
                            {canEditTournament(tournament, user) && (
                                <button
                                    onClick={() => {
                                        soundEffects.playScoreBeep();
                                        handleOpenEditTournament();
                                    }}
                                    className="px-4 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold rounded-xl transition-all border border-amber-500/30 flex items-center gap-2 text-sm shadow-md"
                                    title="Editar fecha de inicio y datos del torneo"
                                >
                                    <Calendar size={16} className="text-amber-400" /> Editar Fechas / Torneo
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    soundEffects.playTennisHit();
                                    setShowGraphicModal(true);
                                }}
                                className="px-4 py-3 bg-gradient-to-r from-primary/25 to-orange-500/25 hover:from-primary/35 hover:to-orange-500/35 text-orange-200 font-bold rounded-xl transition-all border border-primary/40 flex items-center gap-2 text-sm shadow-md"
                                title="Generar placas para Instagram Stories, Feed y WhatsApp"
                            >
                                <ImageIcon size={16} className="text-primary" /> Placas Redes
                            </button>

                            {(user.role === 'admin' || user.role === 'superadmin') && (
                                <button
                                    onClick={() => {
                                        soundEffects.playScoreBeep();
                                        window.print();
                                    }}
                                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm"
                                    title="Imprimir Planilla Oficial de Mesa de Control A4"
                                >
                                    <Printer size={16} className="text-primary" /> Planilla A4
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    soundEffects.playBookingSuccess();
                                    addToast('¡Link del torneo copiado al portapapeles!', 'success');
                                }}
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm"
                                title="Copiar link directo al torneo"
                            >
                                <Share2 size={16} className="text-primary" /> Copiar Link
                            </button>

                            <button
                                onClick={() => {
                                    soundEffects.playScoreBeep();
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    const clubName = tournament.institutions?.name || 'nuestro club';
                                    const messageText = isRegClosed
                                        ? `🎾 Aquí podés ver el avance del torneo "${tournament.name}" en ${clubName}. Mirá el cuadro, partidos y resultados aquí: ${shareUrl}`
                                        : `🎾 ¡Te invito a participar en el torneo "${tournament.name}" en ${clubName}! Regístrate o inscríbete directamente aquí: ${shareUrl}`;
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`, '_blank');
                                }}
                                className="px-4 py-3 bg-green-600/30 hover:bg-green-600/50 text-green-300 font-semibold rounded-xl transition-all border border-green-500/30 flex items-center gap-2 text-sm"
                                title={isRegClosed ? "Compartir avance del torneo por WhatsApp" : "Compartir por WhatsApp"}
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>

                            {tournament.type === 'doubles' && !isEnrolled && !isRegClosed && !genderElig.isInformativeOnly && (
                                <button
                                    onClick={() => {
                                        soundEffects.playScoreBeep();
                                        const phone = tournament.institutions?.phone || '';
                                        const cleanPhone = phone.replace(/[^0-9]/g, '');
                                        const msg = encodeURIComponent(`¡Hola! Estoy interesado en jugar el torneo de dobles "${tournament.name}" en ${tournament.institutions?.name || 'el club'}, pero no tengo pareja. ¿Hay otros jugadores de mi categoría buscando dupla?`);
                                        if (cleanPhone) {
                                            window.open(`https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone}?text=${msg}`, '_blank');
                                        } else {
                                            addToast("Podés coordinar o publicar tu búsqueda en la sección Tablón de Rivales.", "info");
                                        }
                                    }}
                                    className="px-4 py-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-bold rounded-xl transition-all border border-purple-500/40 flex items-center gap-2 text-sm shadow-md"
                                    title="Buscar compañero para este torneo de dobles"
                                >
                                    <Users size={16} className="text-purple-300" /> Busco Pareja
                                </button>
                            )}

                            {genderElig.isInformativeOnly ? (
                                <div className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 shadow-sm ${
                                    genderElig.tournamentGenderLabel === 'Damas'
                                        ? 'bg-pink-500/15 border-pink-500/30 text-pink-200'
                                        : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                                }`}>
                                    <Eye size={16} className={genderElig.tournamentGenderLabel === 'Damas' ? 'text-pink-400' : 'text-blue-400'} />
                                    <div>
                                        <div className="font-bold flex items-center gap-1.5">
                                            <span>Torneo Exclusivo {genderElig.tournamentGenderLabel}</span>
                                            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] uppercase font-black tracking-wider">Modo Informativo</span>
                                        </div>
                                        <div className="text-[11px] opacity-80 font-normal">
                                            Visualización activa · Inscripción no habilitada para tu género
                                        </div>
                                    </div>
                                </div>
                            ) : !isEnrolled ? (
                                !isRegClosed ? (
                                    <button onClick={handleEnrollClick} disabled={isEnrolling} className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-sm">
                                        {isEnrolling ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                                        Inscribirme (${effectivePrice})
                                    </button>
                                ) : (
                                    <div className="px-6 py-3 bg-white/5 text-muted font-bold rounded-xl border border-white/10 text-sm">Inscripción Cerrada</div>
                                )
                            ) : (
                                <div className="px-6 py-3 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30 flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={18} /> Ya estás inscrito
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
