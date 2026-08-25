import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, TournamentPlayer, Match } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    Trophy, Calendar, MapPin, Users, ChevronLeft, UserPlus, CheckCircle2, Loader2, Play, Edit3, 
    X, Save, Layers, Award, Sparkles, Share2, MessageCircle, ArrowLeftRight, Lightbulb, Trash2, 
    Search, DollarSign, UserCheck, Shuffle, Info, Settings2, Grid, Check, TrendingUp, Wallet, Gift, Shield,
    Swords, AlertTriangle, CheckSquare, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { getCategoriesForInstitution, isUserEligibleForCategories, NUMERIC_CATEGORIES } from '../utils/categories';
import { getTournamentTier, calculateTournamentFinances } from '../utils/tournamentTiers';
import { formatPlayerName } from '../utils/formatters';
import { calculateGroupStandings, organizePlayoffRounds, getProjectedPlayoffRounds, GroupZone, GroupStandingRow, PlayoffRound, ProjectedRound } from '../utils/bracketHelper';
import { HeadToHeadModal } from '../components/HeadToHeadModal';

interface TournamentDetailsProps {
    tournamentId: string;
    user: UserProfile;
    onBack: () => void;
}

export const TournamentDetails: React.FC<TournamentDetailsProps> = ({ tournamentId, user, onBack }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'playoffs'>('groups');
    const { addToast } = useToast();

    // H2H State
    const [h2hPlayers, setH2hPlayers] = useState<{ p1Id: string; p2Id: string } | null>(null);

    // Superadmin Fee Waiver & Ranking State
    const [isTogglingWaive, setIsTogglingWaive] = useState(false);
    const [isTogglingRanking, setIsTogglingRanking] = useState(false);
    const [generatingPlayoffs, setGeneratingPlayoffs] = useState(false);

    // Swap / Edit Groups State
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState<{ id: string; name: string } | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    // Fixture Generation Modal State
    const [showFixtureModal, setShowFixtureModal] = useState(false);
    const [fixtureNumGroups, setFixtureNumGroups] = useState(4);
    const [previewGroups, setPreviewGroups] = useState<{ name: string; players: TournamentPlayer[] }[]>([]);
    const [generatingFixture, setGeneratingFixture] = useState(false);

    // Manual Enroll Modal State (with Doubles Partner support)
    const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
    const [enrollMode, setEnrollMode] = useState<'member' | 'guest'>('member');
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<UserProfile | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestCategory, setGuestCategory] = useState('');
    const [partnerUserForEnroll, setPartnerUserForEnroll] = useState<UserProfile | null>(null);
    const [guestPartnerName, setGuestPartnerName] = useState('');
    const [manualFee, setManualFee] = useState<number>(0);
    const [manualPaymentStatus, setManualPaymentStatus] = useState<'pending' | 'paid'>('paid');
    const [submittingEnroll, setSubmittingEnroll] = useState(false);
    const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

    // Replace / Substitute Player State (Singles & Doubles)
    const [playerToReplace, setPlayerToReplace] = useState<TournamentPlayer | null>(null);
    const [replaceMode, setReplaceMode] = useState<'member' | 'guest'>('member');
    const [selectedUserForReplace, setSelectedUserForReplace] = useState<UserProfile | null>(null);
    const [searchUserReplaceQuery, setSearchUserReplaceQuery] = useState('');
    const [replaceGuestName, setReplaceGuestName] = useState('');
    const [replacePartnerMode, setReplacePartnerMode] = useState<'member' | 'guest'>('guest');
    const [selectedPartnerForReplace, setSelectedPartnerForReplace] = useState<UserProfile | null>(null);
    const [searchPartnerReplaceQuery, setSearchPartnerReplaceQuery] = useState('');
    const [replaceGuestPartnerName, setReplaceGuestPartnerName] = useState('');
    const [replaceCategory, setReplaceCategory] = useState('4ta');
    const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

    // Score Modal State (with 24h confirmation & doubles support)
    const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
    const [scoreP1Set1, setScoreP1Set1] = useState(6);
    const [scoreP2Set1, setScoreP2Set1] = useState(4);
    const [scoreP1Set2, setScoreP1Set2] = useState(6);
    const [scoreP2Set2, setScoreP2Set2] = useState(3);
    const [scoreP1Set3, setScoreP1Set3] = useState(0);
    const [scoreP2Set3, setScoreP2Set3] = useState(0);
    const [hasSet3, setHasSet3] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
    const [savingScore, setSavingScore] = useState(false);

    // Dispute Modal State
    const [disputeMatchId, setDisputeMatchId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);

    // Derived state
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        loadTournament();
    }, [tournamentId]);

    const loadTournament = async () => {
        setLoading(true);
        try {
            const data = await api.tournaments.getById(tournamentId);
            setTournament(data);
            if (data.tournament_players) setPlayers(data.tournament_players);
            if (data.matches) setMatches(data.matches);
            if (data.registration_price !== undefined) {
                setManualFee(data.registration_price);
            }
            if (data.category) {
                setGuestCategory(data.category);
            }
        } catch (e) {
            console.error(e);
            addToast("Error al cargar torneo", 'error');
        } finally {
            setLoading(false);
        }
    };

    const isUserMember = api.memberships.isMemberOf(user, tournament?.institution_id);
    const effectivePrice = tournament?.registration_price || 0;

    const handleEnrollClick = async () => {
        if (!tournament) return;

        // Check Category Eligibility
        const allowedCats = tournament.competitions && tournament.competitions.length > 0
            ? tournament.competitions.flatMap(c => c.allowed_categories)
            : [tournament.category];

        const eligibility = isUserEligibleForCategories(user.category, allowedCats);

        if (!eligibility.canEnroll) {
            alert(eligibility.reason || 'No puedes inscribirte a una categoría inferior a tu nivel actual.');
            return;
        }

        let confirmMsg = `¿Confirmas tu inscripción a ${tournament.name} por $${effectivePrice}?`;
        if (eligibility.isChallenger) {
            confirmMsg = `🎾 Estás por inscribirte en una categoría superior a tu nivel (${user.category || '4ta'}).\n\n¿Deseas confirmar tu inscripción como Desafío/Challenger por $${effectivePrice}?`;
        }

        if (!confirm(confirmMsg)) return;

        setIsEnrolling(true);
        try {
            await api.players.enroll(tournament.id, user.id, user.name + ' ' + (user.lastname || ''), user.category || 'Open', effectivePrice);
            addToast("¡Inscripción exitosa! Buena suerte en el torneo.", 'success');
            loadTournament();
        } catch (e: any) {
            addToast("Error al inscribirse: " + e.message, 'error');
        } finally {
            setIsEnrolling(false);
        }
    };

    const openScoreModal = (m: Match) => {
        const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament?.institution_id);
        
        // If match is already confirmed or disputed, only club admin/superadmin can edit
        if ((m.score_status === 'confirmed' || m.score_status === 'disputed') && !isClubAdmin) {
            addToast("Este marcador ya ha sido verificado u oficializado. Solo el organizador o SuperAdmin puede modificarlo.", "info");
            return;
        }

        setSelectedMatchForScore(m);
        setSelectedWinnerId(m.winner_id || m.player1_id || '');
        setHasSet3(false);
        setScoreP1Set1(6);
        setScoreP2Set1(4);
        setScoreP1Set2(6);
        setScoreP2Set2(3);
        setScoreP1Set3(0);
        setScoreP2Set3(0);
    };

    const handleSaveScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatchForScore) return;

        setSavingScore(true);
        try {
            const scoreObj: any = {
                set1: `${scoreP1Set1}-${scoreP2Set1}`,
                set2: `${scoreP1Set2}-${scoreP2Set2}`,
            };
            if (hasSet3) {
                scoreObj.set3 = `${scoreP1Set3}-${scoreP2Set3}`;
            }

            const isDoubles = tournament?.type === 'doubles';
            const winnerPartnerId = selectedWinnerId === selectedMatchForScore.player1_id 
                ? selectedMatchForScore.player1_partner_id 
                : selectedMatchForScore.player2_partner_id;

            const res = await api.matches.updateScore(
                selectedMatchForScore.id, 
                scoreObj, 
                selectedWinnerId,
                user,
                isDoubles,
                winnerPartnerId
            );

            if (res.scoreStatus === 'confirmed') {
                addToast("Marcador oficializado y confirmado exitosamente.", 'success');
            } else {
                addToast("Resultado cargado. Tu rival tiene 24 horas para confirmarlo o reportar discrepancia.", 'info');
            }
            setSelectedMatchForScore(null);
            loadTournament();
        } catch (e: any) {
            addToast("Error al guardar resultado: " + e.message, 'error');
        } finally {
            setSavingScore(false);
        }
    };

    const handleConfirmScore = async (matchId: string) => {
        try {
            await api.matches.confirmScore(matchId, user);
            addToast("¡Marcador confirmado exitosamente! Puntos acreditados al ranking.", "success");
            loadTournament();
        } catch (e: any) {
            addToast("Error al confirmar resultado: " + e.message, "error");
        }
    };

    const handleDisputeScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disputeMatchId) return;
        setSubmittingDispute(true);
        try {
            await api.matches.disputeScore(disputeMatchId, disputeReason, user);
            addToast("Discrepancia registrada. El organizador del torneo revisará el marcador.", "warning");
            setDisputeMatchId(null);
            setDisputeReason('');
            loadTournament();
        } catch (e: any) {
            addToast("Error al reportar discrepancia: " + e.message, "error");
        } finally {
            setSubmittingDispute(false);
        }
    };

    const openManualEnrollModal = async () => {
        setShowManualEnrollModal(true);
        setSelectedUserForEnroll(null);
        setPartnerUserForEnroll(null);
        setGuestPartnerName('');
        setSearchUserQuery('');
        setGuestName('');
        setGuestCategory(tournament?.category || '4ta');
        setManualFee(tournament?.registration_price || 0);
        setManualPaymentStatus('paid');

        if (allProfiles.length === 0) {
            setLoadingProfiles(true);
            try {
                const profiles = await api.auth.getAllProfiles(1, 200);
                // Exclude superadmin and purely staff if desired, keep player profiles
                setAllProfiles(profiles);
            } catch (e) {
                console.error("Error loading profiles:", e);
            } finally {
                setLoadingProfiles(false);
            }
        }
    };

    const handleManualEnrollSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournament) return;

        let pName = '';
        let pId: string | undefined = undefined;
        let pCat = '';
        let partnerId: string | undefined = undefined;
        let partnerName: string | undefined = undefined;

        if (enrollMode === 'member') {
            if (!selectedUserForEnroll) {
                addToast("Por favor selecciona un socio del listado.", 'error');
                return;
            }
            pId = selectedUserForEnroll.id;
            pName = `${selectedUserForEnroll.name} ${selectedUserForEnroll.lastname || ''}`.trim();
            pCat = selectedUserForEnroll.category || tournament.category || 'Open';

            // Check if already enrolled
            const alreadyEnrolled = players.some(p => p.player_id === pId);
            if (alreadyEnrolled) {
                addToast("Este socio ya se encuentra inscripto en el torneo.", 'error');
                return;
            }

            if (tournament.type === 'doubles') {
                if (partnerUserForEnroll) {
                    partnerId = partnerUserForEnroll.id;
                    partnerName = `${partnerUserForEnroll.name} ${partnerUserForEnroll.lastname || ''}`.trim();
                } else if (guestPartnerName.trim()) {
                    partnerName = guestPartnerName.trim();
                }
            }
        } else {
            if (!guestName.trim()) {
                addToast("Por favor ingresa el nombre del jugador invitado.", 'error');
                return;
            }
            pName = guestName.trim();
            pCat = guestCategory || tournament.category || 'Open';

            if (tournament.type === 'doubles' && guestPartnerName.trim()) {
                partnerName = guestPartnerName.trim();
            }
        }

        setSubmittingEnroll(true);
        try {
            await api.players.manualEnroll(tournament.id, {
                playerId: pId,
                playerName: pName,
                category: pCat,
                fee: manualFee,
                paymentStatus: manualPaymentStatus,
                partnerId,
                partnerName
            });

            addToast(`¡${pName} ${partnerName ? `y ${partnerName}` : ''} fueron inscriptos correctamente!`, 'success');
            setShowManualEnrollModal(false);
            loadTournament();
        } catch (e: any) {
            addToast("Error al inscribir: " + (e.message || 'Intente nuevamente'), 'error');
        } finally {
            setSubmittingEnroll(false);
        }
    };

    const handleUnenrollPlayer = async (player: TournamentPlayer) => {
        const playerName = player.name || player.player_name || 'este jugador';
        if (!confirm(`¿Estás seguro de dar de baja a ${playerName} del torneo?`)) return;

        setDeletingPlayerId(player.id);
        try {
            await api.players.unenroll(player.id);
            addToast(`Inscripción de ${playerName} eliminada.`, 'success');
            loadTournament();
        } catch (e: any) {
            addToast("Error al eliminar inscripción: " + (e.message || 'Error de servidor'), 'error');
        } finally {
            setDeletingPlayerId(null);
        }
    };

    const handleTogglePaymentStatus = async (player: TournamentPlayer) => {
        const nextStatus: 'pending' | 'paid' = player.payment_status === 'paid' ? 'pending' : 'paid';
        try {
            await api.players.updatePaymentStatus(player.id, nextStatus);
            addToast(`Estado de pago actualizado a ${nextStatus === 'paid' ? 'Pagado' : 'Pendiente'}.`, 'success');
            // Optimistic update
            setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, payment_status: nextStatus } : p));
        } catch (e: any) {
            addToast("Error al actualizar pago", 'error');
            loadTournament();
        }
    };

    const handleOpenReplaceModal = (player: TournamentPlayer) => {
        setPlayerToReplace(player);
        setReplaceMode('member');
        setSelectedUserForReplace(null);
        setSearchUserReplaceQuery('');
        
        // Parse doubles pair if tournament is doubles
        const rawName = player.player_name || player.name || '';
        const parts = rawName.split(' / ');
        setReplaceGuestName(parts[0]?.trim() || '');
        setReplaceGuestPartnerName(parts[1]?.trim() || '');
        setReplacePartnerMode('guest');
        setSelectedPartnerForReplace(null);
        setSearchPartnerReplaceQuery('');

        setReplaceCategory(player.category || tournament?.category || '4ta');
        if (allProfiles.length === 0) {
            setLoadingProfiles(true);
            api.auth.getAllProfiles()
                .then(setAllProfiles)
                .finally(() => setLoadingProfiles(false));
        }
    };

    const handleReplacePlayerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournament || !playerToReplace) return;

        let pId: string | undefined = undefined;
        let pName = '';
        let pCat = replaceCategory;

        if (tournament.type === 'doubles') {
            const p1 = replaceMode === 'member' && selectedUserForReplace
                ? formatPlayerName(selectedUserForReplace.name, selectedUserForReplace.lastname)
                : replaceGuestName.trim();
            const p2 = replacePartnerMode === 'member' && selectedPartnerForReplace
                ? formatPlayerName(selectedPartnerForReplace.name, selectedPartnerForReplace.lastname)
                : replaceGuestPartnerName.trim();

            if (!p1) {
                addToast("Ingresa o selecciona al Jugador 1.", 'error');
                return;
            }
            if (!p2) {
                addToast("Ingresa o selecciona al Jugador 2 (Pareja).", 'error');
                return;
            }

            pName = `${p1} / ${p2}`;
            if (replaceMode === 'member' && selectedUserForReplace) {
                pId = selectedUserForReplace.id;
            }
        } else {
            if (replaceMode === 'member') {
                if (!selectedUserForReplace) {
                    addToast("Por favor selecciona un socio de la lista.", 'error');
                    return;
                }
                pId = selectedUserForReplace.id;
                pName = formatPlayerName(selectedUserForReplace.name, selectedUserForReplace.lastname);
                pCat = replaceCategory || selectedUserForReplace.category || '4ta';
            } else {
                if (!replaceGuestName.trim()) {
                    addToast("Ingresa el nombre y apellido del nuevo jugador.", 'error');
                    return;
                }
                pName = replaceGuestName.trim();
                pCat = replaceCategory || tournament.category || '4ta';
            }
        }

        const oldName = playerToReplace.player_name || playerToReplace.name || 'el jugador';
        if (!confirm(`¿Confirmas sustituir a "${oldName}" por "${pName}" en todos los partidos de este torneo?`)) {
            return;
        }

        setIsSubmittingReplace(true);
        try {
            await api.players.replacePlayer(tournament.id, playerToReplace, {
                playerId: pId,
                playerName: pName,
                category: pCat
            });

            addToast(`¡"${oldName}" fue sustituido exitosamente por "${pName}"!`, 'success');
            setPlayerToReplace(null);
            loadTournament();
        } catch (err: any) {
            addToast("Error al sustituir jugador: " + (err.message || 'Error del servidor'), 'error');
        } finally {
            setIsSubmittingReplace(false);
        }
    };

    const handlePlayerClickForSwap = async (playerId?: string, playerName?: string) => {
        if (!isSwapMode || !tournament || !playerId || !playerName) return;

        if (!swapSource) {
            setSwapSource({ id: playerId, name: playerName });
            addToast(`Seleccionaste a ${playerName}. Ahora haz clic en el jugador con quien deseas intercambiarlo.`, 'info');
            return;
        }

        if (swapSource.id === playerId) {
            setSwapSource(null);
            addToast('Selección cancelada', 'info');
            return;
        }

        // Execute swap
        setIsSwapping(true);
        try {
            await api.tournaments.swapGroupPlayers(
                tournament.id,
                swapSource,
                { id: playerId, name: playerName }
            );
            addToast(`¡Intercambio realizado entre ${swapSource.name} y ${playerName}!`, 'success');
            setSwapSource(null);
            setIsSwapMode(false);
            loadTournament();
        } catch (e: any) {
            addToast("Error al intercambiar jugadores: " + e.message, 'error');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleShufflePreview = (numGroupsToUse: number) => {
        if (players.length < 3) return;
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const count = Math.max(1, Math.min(numGroupsToUse, Math.floor(players.length / 2)));
        const rawGroups: TournamentPlayer[][] = Array.from({ length: count }, () => []);
        shuffled.forEach((p, index) => {
            rawGroups[index % count].push(p);
        });

        const generated = rawGroups.map((grp, idx) => ({
            name: `Grupo ${String.fromCharCode(65 + idx)}`,
            players: grp
        }));
        setPreviewGroups(generated);
    };

    const handleConfirmCustomFixture = async () => {
        if (!tournament || previewGroups.length === 0) return;
        setGeneratingFixture(true);
        try {
            await api.tournaments.generateFixture(tournament.id, previewGroups);
            addToast(`¡Fixture generado exitosamente con ${previewGroups.length} zonas!`, 'success');
            setShowFixtureModal(false);
            loadTournament();
        } catch (e: any) {
            addToast("Error al generar fixture: " + e.message, 'error');
        } finally {
            setGeneratingFixture(false);
        }
    };

    const formatMatchScore = (score: any) => {
        if (!score) return null;
        if (typeof score === 'string') return score;
        if (typeof score === 'object') {
            if (score.set1 || score.set2) {
                const s1 = score.set1 || '';
                const s2 = score.set2 || '';
                const s3 = score.set3 ? ` ${score.set3}` : '';
                return `${s1} ${s2}${s3}`.trim();
            }
            if (Array.isArray(score)) {
                return score.map((s: any) => `${s.p1}-${s.p2}`).join(' ');
            }
        }
        return JSON.stringify(score);
    };

    if (loading) return <div className="text-center py-20 text-muted">Cargando detalles del torneo...</div>;
    if (!tournament) return <div className="text-center py-20 text-red-500">Torneo no encontrado.</div>;

    const isEnrolled = players.some(p => p.player_id === user.id || p.id === user.id);
    const isRegClosed = tournament.registration_closed || tournament.status !== 'draft';
    const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament.institution_id);

    const groupMatches = matches.filter(m => m.round === 'Fase de Grupos' || m.group_number);
    const playoffMatches = matches.filter(m => m.round !== 'Fase de Grupos' && !m.group_number);
    const displayedMatches = activeTab === 'groups' ? groupMatches : activeTab === 'playoffs' ? playoffMatches : matches;

    const zones = calculateGroupStandings(groupMatches, players);
    const playoffRounds = organizePlayoffRounds(playoffMatches);
    const projectedPlayoffRounds = getProjectedPlayoffRounds(zones);

    const finalMatch = playoffMatches.find(m => m.round === 'Final');
    const championName = finalMatch?.winner_id ? (
        finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player1_name : finalMatch.player2_name
    ) : null;

    const handleGeneratePlayoffsFromZones = async () => {
        if (!tournament || zones.length === 0) return;

        const qualifiers: { zoneName: string; rank: number; player: GroupStandingRow }[] = [];
        for (const z of zones) {
            if (z.players.length > 0) {
                qualifiers.push({ zoneName: z.groupName, rank: 1, player: z.players[0] });
            }
            if (z.players.length > 1) {
                qualifiers.push({ zoneName: z.groupName, rank: 2, player: z.players[1] });
            }
        }

        if (qualifiers.length < 2) {
            addToast("Se necesitan al menos 2 jugadores clasificados para armar los playoffs.", "warning");
            return;
        }

        if (playoffMatches.length > 0) {
            if (!confirm("Ya existen llaves de playoffs generadas. ¿Deseas regenerarlas con los clasificados actuales de cada zona?")) {
                return;
            }
        }

        setGeneratingPlayoffs(true);
        try {
            const customMatches: { round: string; player1: { id: string; name: string }; player2: { id: string; name: string } }[] = [];

            if (zones.length === 4) {
                const zA = zones[0]?.players;
                const zB = zones[1]?.players;
                const zC = zones[2]?.players;
                const zD = zones[3]?.players;

                if (zA?.[0] && zB?.[1]) {
                    customMatches.push({ round: 'Cuartos de Final', player1: { id: zA[0].playerId, name: zA[0].playerName }, player2: { id: zB[1].playerId, name: zB[1].playerName } });
                }
                if (zC?.[0] && zD?.[1]) {
                    customMatches.push({ round: 'Cuartos de Final', player1: { id: zC[0].playerId, name: zC[0].playerName }, player2: { id: zD[1].playerId, name: zD[1].playerName } });
                }
                if (zB?.[0] && zA?.[1]) {
                    customMatches.push({ round: 'Cuartos de Final', player1: { id: zB[0].playerId, name: zB[0].playerName }, player2: { id: zA[1].playerId, name: zA[1].playerName } });
                }
                if (zD?.[0] && zC?.[1]) {
                    customMatches.push({ round: 'Cuartos de Final', player1: { id: zD[0].playerId, name: zD[0].playerName }, player2: { id: zC[1].playerId, name: zC[1].playerName } });
                }
            } else if (zones.length === 2) {
                const zA = zones[0]?.players;
                const zB = zones[1]?.players;
                if (zA?.[0] && zB?.[1]) {
                    customMatches.push({ round: 'Semifinal', player1: { id: zA[0].playerId, name: zA[0].playerName }, player2: { id: zB[1].playerId, name: zB[1].playerName } });
                }
                if (zB?.[0] && zA?.[1]) {
                    customMatches.push({ round: 'Semifinal', player1: { id: zB[0].playerId, name: zB[0].playerName }, player2: { id: zA[1].playerId, name: zA[1].playerName } });
                }
            } else {
                const topP = qualifiers.slice(0, 8);
                const roundName = topP.length > 4 ? 'Cuartos de Final' : 'Semifinal';
                for (let i = 0; i < topP.length; i += 2) {
                    if (i + 1 < topP.length) {
                        customMatches.push({
                            round: roundName,
                            player1: { id: topP[i].player.playerId, name: topP[i].player.playerName },
                            player2: { id: topP[i + 1].player.playerId, name: topP[i + 1].player.playerName }
                        });
                    }
                }
            }

            await api.tournaments.generatePlayoffs(tournament.id, customMatches);
            addToast("¡Cuadro de llaves generado exitosamente con los clasificados de cada zona!", "success");
            setActiveTab('playoffs');
            loadTournament();
        } catch (e: any) {
            addToast("Error al armar llaves: " + e.message, "error");
        } finally {
            setGeneratingPlayoffs(false);
        }
    };

    const isCommissionWaived = Boolean(
        tournament.is_commission_waived ?? 
        (typeof tournament.rules === 'object' && tournament.rules !== null && tournament.rules.is_commission_waived)
    );

    const handleToggleCommissionWaived = async () => {
        if (user.role !== 'superadmin' || !tournament) return;
        const nextVal = !isCommissionWaived;
        setIsTogglingWaive(true);
        try {
            const currentRules = (typeof tournament.rules === 'object' && tournament.rules !== null) ? tournament.rules : {};
            const updatedRules = { ...currentRules, is_commission_waived: nextVal };
            
            try {
                await api.tournaments.update(tournament.id, { 
                    rules: updatedRules,
                    is_commission_waived: nextVal 
                });
            } catch (colErr) {
                await api.tournaments.update(tournament.id, { 
                    rules: updatedRules
                });
            }

            setTournament({
                ...tournament,
                rules: updatedRules,
                is_commission_waived: nextVal
            });
            addToast(nextVal ? '🎉 Torneo bonificado: Comisión de la App al 0%' : 'Bonificación desactivada: Se aplica comisión estándar', 'success');
        } catch (err) {
            console.error(err);
            addToast('Error al actualizar estado de bonificación', 'error');
        } finally {
            setIsTogglingWaive(false);
        }
    };

    const countsForRanking = Boolean(
        (tournament.counts_for_ranking ?? 
        (typeof tournament.rules === 'object' && tournament.rules !== null && tournament.rules.counts_for_ranking)) !== false
    );

    const handleToggleCountsForRanking = async () => {
        if (user.role !== 'superadmin' || !tournament) return;
        const nextVal = !countsForRanking;
        setIsTogglingRanking(true);
        try {
            const currentRules = (typeof tournament.rules === 'object' && tournament.rules !== null) ? tournament.rules : {};
            const updatedRules = { ...currentRules, counts_for_ranking: nextVal };
            
            try {
                await api.tournaments.update(tournament.id, { 
                    rules: updatedRules,
                    counts_for_ranking: nextVal 
                });
            } catch (colErr) {
                await api.tournaments.update(tournament.id, { 
                    rules: updatedRules
                });
            }

            setTournament({
                ...tournament,
                rules: updatedRules,
                counts_for_ranking: nextVal
            });
            addToast(nextVal ? '🏆 Torneo oficial: Suma puntos para el ranking' : '🎾 Torneo configurado como Amistoso (No suma puntos)', 'success');
        } catch (err) {
            console.error(err);
            addToast('Error al actualizar configuración de ranking', 'error');
        } finally {
            setIsTogglingRanking(false);
        }
    };

    const tierInfo = getTournamentTier(players.length);
    const finances = calculateTournamentFinances(players.length, effectivePrice, undefined, isCommissionWaived);

    return (
        <div className="space-y-6 animate-fade-up">
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
                                <span className="flex items-center gap-1"><Calendar size={14} className="text-primary" /> {new Date(tournament.start_date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><MapPin size={14} className="text-primary" /> {tournament.institutions?.name}</span>
                                <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> {players.length} Inscritos</span>
                            </div>
                        </div>

                        {/* Action and Share Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    addToast('¡Link del torneo copiado al portapapeles!', 'success');
                                }}
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10 flex items-center gap-2 text-sm"
                                title="Copiar link directo al torneo"
                            >
                                <Share2 size={16} className="text-primary" /> Copiar Link
                            </button>

                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/?tournament=${tournament.id}`;
                                    const message = encodeURIComponent(`🎾 ¡Te invito a participar en el torneo "${tournament.name}" en ${tournament.institutions?.name || 'nuestro club'}! Regístrate o inscríbete directamente aquí: ${shareUrl}`);
                                    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                                }}
                                className="px-4 py-3 bg-green-600/30 hover:bg-green-600/50 text-green-300 font-semibold rounded-xl transition-all border border-green-500/30 flex items-center gap-2 text-sm"
                                title="Compartir por WhatsApp"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>

                            {!isEnrolled ? (
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ADMIN PANEL */}
                {isClubAdmin && (
                    <div className="col-span-1 lg:col-span-3">
                        <Card className="bg-slate-800/50 border-white/10">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-primary" /> Panel de Control del Torneo
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-muted uppercase font-semibold">{tournament.status}</span>
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿${isRegClosed ? 'Abrir' : 'Cerrar'} inscripciones?`)) return;
                                        try {
                                            await api.tournaments.update(tournament.id, { registration_closed: !isRegClosed });
                                            addToast('Estado actualizado', 'success');
                                            loadTournament();
                                        } catch (e) { addToast('Error al actualizar', 'error'); }
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isRegClosed
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                                        }`}
                                >
                                    {isRegClosed ? 'Abrir Inscripción' : 'Cerrar Inscripción'}
                                </button>

                                {tournament.status !== 'finished' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                if (matches.some(m => m.round === 'Fase de Grupos')) {
                                                    alert('Ya existe una fase de grupos activa.');
                                                    return;
                                                }
                                                if (players.length < 3) {
                                                    addToast('Se necesitan al menos 3 jugadores inscriptos para generar grupos.', 'warning');
                                                    return;
                                                }
                                                const defaultGroups = Math.max(1, Math.floor(players.length / 3));
                                                setFixtureNumGroups(defaultGroups);
                                                handleShufflePreview(defaultGroups);
                                                setShowFixtureModal(true);
                                            }}
                                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Settings2 size={14} /> Configurar y Generar Grupos
                                        </button>

                                        {groupMatches.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setIsSwapMode(!isSwapMode);
                                                    setSwapSource(null);
                                                }}
                                                disabled={isSwapping}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                                    isSwapMode
                                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                <ArrowLeftRight size={14} className={isSwapping ? "animate-spin" : ""} />
                                                {isSwapMode ? 'Cancelar Intercambio' : 'Intercambiar Jugadores'}
                                            </button>
                                        )}

                                        {groupMatches.length > 0 && tournament.status !== 'finished' && (
                                            <button
                                                onClick={handleGeneratePlayoffsFromZones}
                                                disabled={generatingPlayoffs}
                                                className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Trophy size={14} className={generatingPlayoffs ? "animate-spin text-amber-400" : "text-amber-400"} />
                                                {playoffMatches.length > 0 ? 'Regenerar Llaves de Playoffs' : '🏆 Clasificar y Armar Llaves'}
                                            </button>
                                        )}

                                        <button
                                            onClick={openManualEnrollModal}
                                            className="px-4 py-2 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <UserPlus size={14} /> Inscribir Jugador
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Organizer Advice Banner */}
                            {groupMatches.length > 0 && tournament.status !== 'finished' && (
                                <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                    <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-200/90 leading-relaxed">
                                        <span className="font-bold text-amber-300">Consejo de Organización:</span> Al no contar con datos previos o historial suficiente de los jugadores, si observas que un grupo está desfasado o muy desigual, puedes hacer clic en <strong className="text-white">"Intercambiar Jugadores"</strong> para equilibrar las zonas manualmente haciendo clic sobre los dos participantes que deseas intercambiar.
                                    </div>
                                </div>
                            )}
                            {/* SUPERADMIN EXCLUSIVE CONTROLS */}
                            {user.role === 'superadmin' && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-purple-950/40 border border-purple-500/30 rounded-2xl space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} className="text-purple-400" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                Controles Exclusivos de Superadmin
                                            </h4>
                                        </div>
                                        <span className="text-[10px] bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">Solo Superadmin</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Switch 1: Bonificación */}
                                        <div className="p-3 bg-slate-900/60 border border-purple-500/20 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                                                    <Gift size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">Bonificar Torneo (0% Comisión)</div>
                                                    <div className="text-[10px] text-purple-200/70 truncate">
                                                        {isCommissionWaived ? '100% bonificado sin comisión.' : 'Comisión estándar activa.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isCommissionWaived}
                                                    disabled={isTogglingWaive}
                                                    onChange={handleToggleCommissionWaived}
                                                />
                                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                                            </label>
                                        </div>

                                        {/* Switch 2: Suma Puntos al Ranking */}
                                        <div className="p-3 bg-slate-900/60 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                                                    <Trophy size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">Suma Puntos al Ranking</div>
                                                    <div className="text-[10px] text-blue-200/70 truncate">
                                                        {countsForRanking ? 'Torneo oficial puntuable.' : 'Torneo amistoso (sin puntos).'}
                                                    </div>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={countsForRanking}
                                                    disabled={isTogglingRanking}
                                                    onChange={handleToggleCountsForRanking}
                                                />
                                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FINANCIAL & COMMISSION SUMMARY */}
                            <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
                                {/* Cartel / Banner de Bonificado para el Organizador y Superadmin */}
                                {isCommissionWaived && (
                                    <div className="mb-4 p-3 bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-emerald-950/50 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                        <div className="flex items-center gap-2.5">
                                            <Gift className="text-emerald-400 shrink-0" size={20} />
                                            <div>
                                                <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                    <span>🎉 Torneo 100% Bonificado</span>
                                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold">0% Comisión</span>
                                                </div>
                                                <div className="text-[11px] text-emerald-200/80">
                                                    La plataforma Smash Tennis ha bonificado este torneo. El 100% de lo recaudado queda libre para el club organizador.
                                                </div>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-500 text-dark font-black rounded-lg text-xs tracking-wider uppercase shadow-md shrink-0">
                                            Bonificado
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-2.5 mb-3 gap-2">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} className="text-green-400" />
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            Desglose Financiero y Nivel del Torneo
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCommissionWaived && (
                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                Bonificado
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${tierInfo.badgeColor} ${tierInfo.textColor} ${tierInfo.borderColor}`}>
                                            {tierInfo.label} • {tierInfo.pointsWinner} pts al Campeón
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                        <div className="text-[10px] text-muted uppercase font-bold">Recaudación Bruta</div>
                                        <div className="text-base font-mono font-bold text-white">
                                            ${finances.grossTotal.toLocaleString('es-AR')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{players.length} inscriptos × ${effectivePrice.toLocaleString('es-AR')}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl border space-y-1 ${isCommissionWaived ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                        <div className="text-[10px] uppercase font-bold flex items-center justify-between text-green-400">
                                            <span>Comisión App Smash ({finances.feePct}%)</span>
                                            <TrendingUp size={12} />
                                        </div>
                                        <div className="text-base font-mono font-bold text-green-400 flex items-center gap-2">
                                            <span>${finances.platformTotalCommission.toLocaleString('es-AR')}</span>
                                            {isCommissionWaived && (
                                                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                                    100% OFF
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-green-300/70">
                                            {isCommissionWaived ? 'Bonificación otorgada por Superadmin' : `Take rate según nivel ${tierInfo.label}`}
                                        </div>
                                    </div>
                                    <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                        <div className="text-[10px] text-muted uppercase font-bold">Ingreso Neto Club</div>
                                        <div className="text-base font-mono font-bold text-primary">
                                            ${finances.clubNetIncome.toLocaleString('es-AR')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">Fondos libres de sede y premios</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Left: Matches & Brackets */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy className="text-amber-500" size={20} /> Competencia y Cuadro
                            </h3>

                            {/* View Filter Tabs */}
                            <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-2xl border border-white/10 text-xs gap-1">
                                <button
                                    onClick={() => setActiveTab('groups')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeTab === 'groups' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:text-white'}`}
                                >
                                    <Grid size={14} /> Fase de Zonas ({zones.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('playoffs')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeTab === 'playoffs' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:text-white'}`}
                                >
                                    <Trophy size={14} /> Cuadro de Llaves ({playoffMatches.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeTab === 'all' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:text-white'}`}
                                >
                                    <Layers size={14} /> Todos ({matches.length})
                                </button>
                            </div>
                        </div>

                        {/* Swap Mode Active Guide Bar */}
                        {isSwapMode && (
                            <div className="mb-4 p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                                <div className="text-xs text-amber-200 flex items-center gap-2.5">
                                    <ArrowLeftRight size={18} className="text-amber-400 shrink-0" />
                                    {swapSource ? (
                                        <span>
                                            Seleccionaste a <strong className="text-white bg-amber-500/40 px-2 py-0.5 rounded-lg font-bold">{swapSource.name}</strong>. Ahora haz clic sobre el jugador con quien deseas intercambiarlo.
                                        </span>
                                    ) : (
                                        <span>
                                            <strong className="text-white">Modo Intercambio Activo:</strong> Haz clic sobre el primer jugador que deseas mover de zona.
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setIsSwapMode(false); setSwapSource(null); }}
                                    className="text-xs text-amber-300 hover:text-white px-3 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 rounded-xl transition-all font-semibold self-end sm:self-auto"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}

                        {/* TAB 1: FASE DE ZONAS Y TABLAS DE POSICIONES */}
                        {activeTab === 'groups' && (
                            <div className="space-y-6">
                                {zones.length === 0 ? (
                                    <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-dashed border-white/10 space-y-2">
                                        <Grid size={32} className="mx-auto opacity-40 text-primary" />
                                        <p className="text-sm font-semibold text-white">Aún no se ha generado la fase de grupos</p>
                                        <p className="text-xs text-muted">Los administradores pueden configurar y sortear las zonas desde el panel superior.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {zones.map((zone) => (
                                            <div key={zone.groupNumber} className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                                {/* Zone Header */}
                                                <div className="p-4 bg-gradient-to-r from-primary/20 via-slate-800 to-transparent border-b border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary font-black">
                                                            <Grid size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-white uppercase tracking-wider">{zone.groupName}</h4>
                                                            <span className="text-[10px] text-muted">{zone.players.length} participantes • 2 clasifican</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                                                        Top 2 a Playoffs
                                                    </span>
                                                </div>

                                                {/* Standings Table */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead>
                                                            <tr className="border-b border-white/10 bg-black/30 text-slate-400 font-bold uppercase text-[10px]">
                                                                <th className="py-2.5 px-3">#</th>
                                                                <th className="py-2.5 px-3">Jugador</th>
                                                                <th className="py-2.5 px-2 text-center" title="Partidos Jugados">PJ</th>
                                                                <th className="py-2.5 px-2 text-center text-green-400" title="Partidos Ganados">PG</th>
                                                                <th className="py-2.5 px-2 text-center text-red-400" title="Partidos Perdidos">PP</th>
                                                                <th className="py-2.5 px-2 text-center" title="Sets Ganados / Perdidos">Sets (Dif)</th>
                                                                <th className="py-2.5 px-2 text-center" title="Diferencia de Games">Games</th>
                                                                <th className="py-2.5 px-3 text-right text-primary font-black" title="Puntos en la tabla">PTS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {zone.players.map((p, idx) => {
                                                                const isSwapSelected = swapSource?.id === p.playerId;
                                                                return (
                                                                    <tr 
                                                                        key={p.playerId}
                                                                        className={`transition-colors ${p.isQualified ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-white/5'} ${isSwapSelected ? 'bg-amber-500/20 ring-1 ring-amber-400' : ''}`}
                                                                    >
                                                                        <td className="py-2.5 px-3">
                                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                                                idx === 0 ? 'bg-yellow-500 text-dark font-black shadow-sm' :
                                                                                idx === 1 ? 'bg-slate-300 text-dark font-black' :
                                                                                'bg-slate-800 text-slate-400'
                                                                            }`}>
                                                                                {p.rank || idx + 1}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3">
                                                                            {isSwapMode ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handlePlayerClickForSwap(p.playerId, p.playerName)}
                                                                                    className="text-left font-semibold text-white hover:text-amber-300 flex items-center gap-1.5"
                                                                                >
                                                                                    <ArrowLeftRight size={12} className={isSwapSelected ? "text-amber-400" : "text-slate-500"} />
                                                                                    <span>{formatPlayerName(p.playerName)}</span>
                                                                                    {isSwapSelected && <span className="text-[10px] text-amber-300 font-bold">(Elegido)</span>}
                                                                                </button>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-white">{formatPlayerName(p.playerName)}</span>
                                                                                    {p.isQualified && (
                                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 font-bold">
                                                                                            Clasifica ✓
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{p.matchesPlayed}</td>
                                                                        <td className="py-2.5 px-2 text-center text-green-400 font-mono font-bold">{p.matchesWon}</td>
                                                                        <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{p.matchesLost}</td>
                                                                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono text-[11px]">
                                                                            {p.setsWon}-{p.setsLost} <span className={p.diffSets > 0 ? 'text-green-400' : p.diffSets < 0 ? 'text-red-400' : 'text-slate-500'}>({p.diffSets > 0 ? `+${p.diffSets}` : p.diffSets})</span>
                                                                        </td>
                                                                        <td className={`py-2.5 px-2 text-center font-mono text-[11px] ${p.diffGames > 0 ? 'text-green-400' : p.diffGames < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                            {p.diffGames > 0 ? `+${p.diffGames}` : p.diffGames}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-primary">
                                                                            {p.points}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Zone Matches List */}
                                                <div className="p-3 bg-black/25 border-t border-white/5 space-y-2">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                                                        <Trophy size={11} className="text-primary" /> Partidos de {zone.groupName}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {zone.matches.map(m => {
                                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                                            const canEditScore = isClubAdmin || (isUserInMatch && m.score_status !== 'confirmed');
                                                            const formattedScore = formatMatchScore(m.score);
                                                            const isDoubles = tournament.type === 'doubles';
                                                            const p1DisplayName = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                            const p2DisplayName = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                            const isOpponentPending = isUserInMatch && m.score_status === 'pending_confirmation' && user.id !== m.score_submitted_by;

                                                            return (
                                                                <div key={m.id} className="bg-slate-950/60 p-3 rounded-xl border border-white/5 flex flex-col gap-2 text-xs">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex-1 min-w-0 space-y-1">
                                                                            <div className={`flex justify-between items-center ${m.winner_id === m.player1_id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                                                                <span className="truncate">{p1DisplayName}</span>
                                                                                {m.winner_id === m.player1_id && <span className="text-[10px] text-green-400 ml-2">Ganador ✓</span>}
                                                                            </div>
                                                                            <div className={`flex justify-between items-center ${m.winner_id === m.player2_id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                                                                <span className="truncate">{p2DisplayName}</span>
                                                                                {m.winner_id === m.player2_id && <span className="text-[10px] text-green-400 ml-2">Ganador ✓</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {/* H2H Button */}
                                                                            {m.player1_id && m.player2_id && (
                                                                                <button
                                                                                    onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors text-[10px] font-bold flex items-center gap-1"
                                                                                    title="Ver Historial Cara a Cara"
                                                                                >
                                                                                    <Swords size={12} /> H2H
                                                                                </button>
                                                                            )}

                                                                            {formattedScore ? (
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    <span className="px-2 py-1 bg-black/40 border border-white/10 rounded-lg font-mono font-bold text-primary text-xs">
                                                                                        {formattedScore}
                                                                                    </span>
                                                                                    {m.score_status === 'pending_confirmation' && (
                                                                                        <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                                                                                            <Clock size={10} /> Pendiente 24h
                                                                                        </span>
                                                                                    )}
                                                                                    {m.score_status === 'disputed' && (
                                                                                        <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                                                                                            <AlertTriangle size={10} /> En Disputa
                                                                                        </span>
                                                                                    )}
                                                                                    {m.score_status === 'confirmed' && (
                                                                                        <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                                                                                            <CheckCircle2 size={10} /> Verificado
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-[10px] font-semibold">
                                                                                    Por Jugar
                                                                                </span>
                                                                            )}
                                                                            {canEditScore && (
                                                                                <button
                                                                                    onClick={() => openScoreModal(m)}
                                                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors"
                                                                                    title="Cargar o editar resultado"
                                                                                >
                                                                                    <Edit3 size={13} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Rival Score Confirmation Banner */}
                                                                    {isOpponentPending && (
                                                                        <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2">
                                                                            <span className="text-[11px] text-amber-300 font-medium">¿Confirmas este marcador cargado por tu rival?</span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-all"
                                                                                >
                                                                                    <Check size={12} /> Confirmar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                                    className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all"
                                                                                >
                                                                                    <AlertTriangle size={12} /> Disputar
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: CUADRO DE LLAVES (PLAYOFFS / BRACKET TREE) */}
                        {activeTab === 'playoffs' && (
                            <div className="space-y-6">
                                {/* Champion Banner */}
                                {championName && (
                                    <div className="p-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-yellow-500/50 rounded-3xl text-center space-y-2 shadow-2xl animate-fade-in">
                                        <div className="inline-flex p-3 rounded-full bg-yellow-500/30 text-yellow-300 mb-1 ring-4 ring-yellow-400/20 animate-bounce">
                                            <Trophy size={36} />
                                        </div>
                                        <div className="text-xs uppercase tracking-widest font-black text-yellow-300">¡CAMPEÓN DEL TORNEO!</div>
                                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatPlayerName(championName)}</div>
                                        <div className="text-xs text-yellow-200/80">Felicitaciones al ganador del torneo {tournament.name}</div>
                                    </div>
                                )}

                                {playoffMatches.length === 0 ? (
                                    projectedPlayoffRounds.length > 0 ? (
                                        <div className="space-y-6">
                                            {/* Projected Notice Banner */}
                                            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                                                        <Sparkles size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                            Previsualización de Cruces Proyectados
                                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                                                                En Vivo
                                                            </span>
                                                        </h4>
                                                        <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                                                            Las llaves se proyectan y actualizan automáticamente según las posiciones de la fase de zonas. Una vez concluidos los grupos, el organizador oficializará los partidos finales.
                                                        </p>
                                                    </div>
                                                </div>

                                                {isClubAdmin && groupMatches.length > 0 && (
                                                    <button
                                                        onClick={handleGeneratePlayoffsFromZones}
                                                        disabled={generatingPlayoffs}
                                                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark font-black rounded-xl text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shrink-0"
                                                    >
                                                        <Trophy size={14} className={generatingPlayoffs ? "animate-spin" : ""} />
                                                        🏆 Oficializar y Armar Llaves
                                                    </button>
                                                )}
                                            </div>

                                            {/* Projected Bracket Tree */}
                                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                                <div className="flex items-stretch gap-6 min-w-[650px] py-2">
                                                    {projectedPlayoffRounds.map((round, rIdx) => (
                                                        <div key={rIdx} className="flex-1 min-w-[220px] flex flex-col space-y-4">
                                                            <div className="text-center pb-2 border-b border-white/10">
                                                                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                                    {round.name}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-4 flex flex-col justify-around flex-1">
                                                                {round.matches.map((m) => (
                                                                    <div 
                                                                        key={m.id} 
                                                                        className="relative bg-slate-900/80 border border-dashed border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-3.5 shadow-lg transition-all space-y-2.5"
                                                                    >
                                                                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                                                                            <span>{m.round}</span>
                                                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                                                Proyectado
                                                                            </span>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            {/* Contender 1 */}
                                                                            <div className="bg-white/5 p-2 rounded-xl text-xs space-y-0.5 border border-white/5">
                                                                                <div className="text-[10px] text-muted font-bold">{m.slotP1Label}</div>
                                                                                <div className="font-bold text-white truncate">
                                                                                    {m.p1Name ? formatPlayerName(m.p1Name) : <span className="text-slate-400 italic">Por definir</span>}
                                                                                </div>
                                                                            </div>

                                                                            {/* Contender 2 */}
                                                                            <div className="bg-white/5 p-2 rounded-xl text-xs space-y-0.5 border border-white/5">
                                                                                <div className="text-[10px] text-muted font-bold">{m.slotP2Label}</div>
                                                                                <div className="font-bold text-white truncate">
                                                                                    {m.p2Name ? formatPlayerName(m.p2Name) : <span className="text-slate-400 italic">Por definir</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-14 text-muted bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                                            <Trophy size={40} className="mx-auto text-amber-500 opacity-60" />
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Cuadro de Llaves Pendiente</h4>
                                                <p className="text-xs text-muted max-w-md mx-auto">
                                                    Las llaves de eliminación directa se armarán una vez finalizada la fase de zonas con los clasificados de cada grupo.
                                                </p>
                                            </div>
                                            {isClubAdmin && groupMatches.length > 0 && (
                                                <button
                                                    onClick={handleGeneratePlayoffsFromZones}
                                                    disabled={generatingPlayoffs}
                                                    className="mt-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark font-black rounded-xl text-xs shadow-lg hover:brightness-110 transition-all inline-flex items-center gap-2"
                                                >
                                                    <Trophy size={14} className={generatingPlayoffs ? "animate-spin" : ""} />
                                                    🏆 Clasificar y Generar Llaves de Playoffs
                                                </button>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                                        <div className="flex items-stretch gap-6 min-w-[650px] py-2">
                                            {playoffRounds.map((round, rIdx) => (
                                                <div key={rIdx} className="flex-1 min-w-[220px] flex flex-col space-y-4">
                                                    <div className="text-center pb-2 border-b border-white/10">
                                                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                            {round.name}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-4 flex flex-col justify-around flex-1">
                                                        {round.matches.map((m) => {
                                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                                            const canEditScore = isClubAdmin || (isUserInMatch && m.score_status !== 'confirmed');
                                                            const formattedScore = formatMatchScore(m.score);
                                                            const isFinished = !!m.winner_id || (m.score && m.scheduling_status === 'finished');
                                                            const p1DisplayName = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                            const p2DisplayName = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                            const isOpponentPending = isUserInMatch && m.score_status === 'pending_confirmation' && user.id !== m.score_submitted_by;

                                                            return (
                                                                <div 
                                                                    key={m.id} 
                                                                    className={`relative bg-slate-900/90 border rounded-2xl p-3.5 shadow-lg transition-all space-y-2.5 ${
                                                                        isFinished ? 'border-primary/40' : 'border-white/10 hover:border-white/20'
                                                                    }`}
                                                                >
                                                                    <div className="space-y-2">
                                                                        {/* Contender 1 */}
                                                                        <div className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                                                                            m.winner_id === m.player1_id ? 'bg-green-500/20 text-green-300 font-bold border border-green-500/30' : 'bg-white/5 text-white'
                                                                        }`}>
                                                                            <span className="truncate font-semibold">{p1DisplayName}</span>
                                                                            {m.winner_id === m.player1_id && <Check size={14} className="text-green-400 shrink-0" />}
                                                                        </div>

                                                                        {/* Contender 2 */}
                                                                        <div className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                                                                            m.winner_id === m.player2_id ? 'bg-green-500/20 text-green-300 font-bold border border-green-500/30' : 'bg-white/5 text-white'
                                                                        }`}>
                                                                            <span className="truncate font-semibold">{p2DisplayName}</span>
                                                                            {m.winner_id === m.player2_id && <Check size={14} className="text-green-400 shrink-0" />}
                                                                        </div>
                                                                    </div>

                                                                    {/* Score & Edit Bar */}
                                                                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5">
                                                                            {m.player1_id && m.player2_id && (
                                                                                <button
                                                                                    onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                                    className="p-1 rounded bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors text-[10px] font-bold flex items-center gap-0.5"
                                                                                    title="Ver H2H"
                                                                                >
                                                                                    <Swords size={11} /> H2H
                                                                                </button>
                                                                            )}
                                                                            {formattedScore ? (
                                                                                <span className="font-mono font-bold text-primary text-xs bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                                                                                    {formattedScore}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-yellow-400 font-semibold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                                                                    Por Jugar
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {canEditScore && (
                                                                            <button
                                                                                onClick={() => openScoreModal(m)}
                                                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-colors text-[11px] font-bold flex items-center gap-1"
                                                                                title="Cargar marcador"
                                                                            >
                                                                                <Edit3 size={12} /> Cargar
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Rival Score Confirmation Banner */}
                                                                    {isOpponentPending && (
                                                                        <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2">
                                                                            <span className="text-[10px] text-amber-300 font-medium">¿Confirmas resultado?</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                                    className="px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded"
                                                                                >
                                                                                    ✓ Sí
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                                    className="px-2 py-0.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-bold rounded"
                                                                                >
                                                                                    Disputar
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: TODOS LOS PARTIDOS (LISTA COMPACTA) */}
                        {activeTab === 'all' && (
                            <div>
                                {displayedMatches.length === 0 ? (
                                    <div className="text-center py-12 text-muted bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <Trophy size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay partidos disponibles en esta sección.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {displayedMatches.map(m => {
                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                            const canEditScore = isClubAdmin || (isUserInMatch && m.score_status !== 'confirmed');
                                            const formattedScore = formatMatchScore(m.score);
                                            const p1DisplayName = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                            const p2DisplayName = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                            const isOpponentPending = isUserInMatch && m.score_status === 'pending_confirmation' && user.id !== m.score_submitted_by;

                                            return (
                                                <div key={m.id} className="bg-slate-900/60 hover:bg-slate-900 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                                    <div className="space-y-1.5 flex-1 min-w-0 w-full sm:w-auto">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 px-2 py-0.5 rounded">
                                                                {m.round} {m.group_number ? `(Grupo ${m.group_number})` : ''}
                                                            </span>
                                                            {isUserInMatch && (
                                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                                                                    Tu Partido
                                                                </span>
                                                            )}
                                                            {m.score_status === 'pending_confirmation' && (
                                                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                                    <Clock size={10} /> Pendiente 24h
                                                                </span>
                                                            )}
                                                            {m.score_status === 'disputed' && (
                                                                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                                    <AlertTriangle size={10} /> En Disputa
                                                                </span>
                                                            )}
                                                            {m.score_status === 'confirmed' && (
                                                                <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                                    <CheckCircle2 size={10} /> Verificado
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 pt-1">
                                                            <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player1_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                                <span>{p1DisplayName}</span>
                                                                {m.winner_id === m.player1_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                            </div>
                                                            <div className={`text-sm font-semibold flex items-center justify-between ${m.winner_id === m.player2_id ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                                <span>{p2DisplayName}</span>
                                                                {m.winner_id === m.player2_id && <span className="text-xs text-green-400 font-bold">Ganador ✓</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                                                        {m.player1_id && m.player2_id && (
                                                            <button
                                                                onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-all border border-white/10 text-xs font-bold flex items-center gap-1"
                                                                title="Ver Historial Cara a Cara"
                                                            >
                                                                <Swords size={14} /> H2H
                                                            </button>
                                                        )}

                                                        {formattedScore ? (
                                                            <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-center">
                                                                <div className="text-[10px] text-muted uppercase font-bold">Resultado</div>
                                                                <div className="text-sm font-mono font-bold text-primary">{formattedScore}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg font-semibold">
                                                                Por Jugar
                                                            </span>
                                                        )}

                                                        {canEditScore && !isSwapMode && (
                                                            <button
                                                                onClick={() => openScoreModal(m)}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-all border border-white/10"
                                                                title="Cargar o modificar resultado"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                        )}

                                                        {isOpponentPending && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleConfirmScore(m.id)}
                                                                    className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md"
                                                                    title="Confirmar marcador"
                                                                >
                                                                    <Check size={13} /> Confirmar
                                                                </button>
                                                                <button
                                                                    onClick={() => setDisputeMatchId(m.id)}
                                                                    className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1"
                                                                    title="Disputar marcador"
                                                                >
                                                                    <AlertTriangle size={13} /> Disputar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Players List */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                <Users size={18} className="text-primary" /> Inscritos ({players.length})
                            </h3>
                            {isClubAdmin && (
                                <button
                                    onClick={openManualEnrollModal}
                                    className="p-1.5 px-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                    title="Inscribir jugador manualmente"
                                >
                                    <UserPlus size={13} /> + Inscribir
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                            {players.length === 0 ? (
                                <div className="text-muted text-sm text-center py-6">Aún no hay jugadores inscritos.</div>
                            ) : (
                                players.map((p, i) => {
                                    const pDisplayName = formatPlayerName(p.name || p.player_name);
                                    const isPaid = p.payment_status === 'paid';

                                    return (
                                        <div key={p.id || i} className="flex items-center justify-between gap-2 p-2.5 bg-sidebar/50 border border-white/5 rounded-xl hover:border-white/20 transition-all">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                    {pDisplayName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-white truncate">{pDisplayName}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-muted">{p.category ? `${p.category} Cat.` : 'Sin Cat.'}</span>
                                                        {p.fee_amount ? (
                                                            <span className="text-[10px] text-slate-400 font-mono">${p.fee_amount}</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Payment Status Badge / Button for Admin */}
                                                {isClubAdmin ? (
                                                    <button
                                                        onClick={() => handleTogglePaymentStatus(p)}
                                                        title="Click para cambiar estado de pago"
                                                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition-all ${
                                                            isPaid
                                                                ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'
                                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                                        }`}
                                                    >
                                                        {isPaid ? 'Pagado' : 'Pendiente'}
                                                    </button>
                                                ) : (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                                                        isPaid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    }`}>
                                                        {isPaid ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                )}

                                                {(p.player_id === user.id || p.id === user.id) && (
                                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-bold">
                                                        Tú
                                                    </span>
                                                )}

                                                {/* Action Buttons for Admin */}
                                                {isClubAdmin && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleOpenReplaceModal(p)}
                                                            className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="Sustituir / Reemplazar jugador en el torneo"
                                                        >
                                                            <RefreshCw size={13} />
                                                        </button>

                                                        {matches.length === 0 && (
                                                            <button
                                                                onClick={() => handleUnenrollPlayer(p)}
                                                                disabled={deletingPlayerId === p.id}
                                                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Dar de baja / Quitar inscripto"
                                                            >
                                                                {deletingPlayerId === p.id ? (
                                                                    <Loader2 size={13} className="animate-spin text-red-400" />
                                                                ) : (
                                                                    <Trash2 size={13} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* MANUAL ENROLL MODAL */}
            {showManualEnrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <UserPlus size={18} className="text-primary" /> Inscribir Jugador al Torneo
                            </h3>
                            <button onClick={() => setShowManualEnrollModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Selector */}
                        <div className="p-4 pb-0">
                            <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-white/10 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setEnrollMode('member')}
                                    className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        enrollMode === 'member'
                                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                                            : 'text-muted hover:text-white'
                                    }`}
                                >
                                    <UserCheck size={14} /> Socio / Usuario Registrado
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEnrollMode('guest')}
                                    className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        enrollMode === 'guest'
                                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                                            : 'text-muted hover:text-white'
                                    }`}
                                >
                                    <Users size={14} /> Jugador Externo / Invitado
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleManualEnrollSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {enrollMode === 'member' ? (
                                <div className="space-y-3">
                                    <label className="text-xs text-muted font-bold uppercase block">Buscar Usuario o Socio</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, apellido, DNI o email..."
                                            value={searchUserQuery}
                                            onChange={e => setSearchUserQuery(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                                        />
                                    </div>

                                    {/* User Search Results */}
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/5 rounded-2xl p-2 bg-slate-900/60 custom-scrollbar">
                                        {loadingProfiles ? (
                                            <div className="py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                                                <Loader2 size={14} className="animate-spin text-primary" /> Buscando socios...
                                            </div>
                                        ) : (
                                            allProfiles
                                                .filter(p => {
                                                    const query = searchUserQuery.toLowerCase().trim();
                                                    if (!query) return true;
                                                    const fullName = `${p.name} ${p.lastname || ''}`.toLowerCase();
                                                    return (
                                                        fullName.includes(query) ||
                                                        (p.email && p.email.toLowerCase().includes(query)) ||
                                                        (p.dni && p.dni.includes(query))
                                                    );
                                                })
                                                .slice(0, 30)
                                                .map(p => {
                                                    const isSelected = selectedUserForEnroll?.id === p.id;
                                                    const isAlreadyIn = players.some(pl => pl.player_id === p.id);

                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            disabled={isAlreadyIn}
                                                            onClick={() => setSelectedUserForEnroll(p)}
                                                            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                                                                isAlreadyIn
                                                                    ? 'opacity-40 bg-white/5 cursor-not-allowed'
                                                                    : isSelected
                                                                    ? 'bg-primary/20 border border-primary/40 text-primary font-bold shadow-sm'
                                                                    : 'bg-white/5 hover:bg-white/10 text-white border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold truncate">{formatPlayerName(p.name, p.lastname)}</div>
                                                                <div className="text-[10px] text-muted truncate">
                                                                    {p.category ? `${p.category} Cat.` : 'Sin Cat.'} {p.institution ? `• ${p.institution}` : ''}
                                                                </div>
                                                            </div>
                                                            {isAlreadyIn ? (
                                                                <span className="text-[10px] text-yellow-400 font-semibold">Ya inscripto</span>
                                                            ) : isSelected ? (
                                                                <CheckCircle2 size={16} className="text-primary" />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-muted font-bold uppercase block mb-1.5">Nombre y Apellido *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Marcos Rodríguez"
                                            value={guestName}
                                            onChange={e => setGuestName(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white focus:border-primary outline-none"
                                        />
                                    </div>

                                    {/* Doubles Partner for Guests */}
                                    {tournament?.type === 'doubles' && (
                                        <div>
                                            <label className="text-xs text-primary font-bold uppercase block mb-1.5">🎾 Nombre de la Pareja de Dobles *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Juan Pérez"
                                                value={guestPartnerName}
                                                onChange={e => setGuestPartnerName(e.target.value)}
                                                className="w-full bg-sidebar border border-primary/40 rounded-xl p-3 text-xs text-white focus:border-primary outline-none"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs text-muted font-bold uppercase block mb-1.5">Categoría *</label>
                                        <select
                                            value={guestCategory}
                                            onChange={e => setGuestCategory(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-semibold focus:border-primary outline-none"
                                        >
                                            {getCategoriesForInstitution(tournament?.institutions).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Commercial / Payment Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                                <div>
                                    <label className="text-xs text-muted font-bold uppercase block mb-1.5">Arancel de Inscripción ($)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-3.5 text-muted" />
                                        <input
                                            type="number"
                                            min={0}
                                            value={manualFee}
                                            onChange={e => setManualFee(Number(e.target.value))}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white font-mono font-bold focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-muted font-bold uppercase block mb-1.5">Estado de Pago</label>
                                    <select
                                        value={manualPaymentStatus}
                                        onChange={e => setManualPaymentStatus(e.target.value as 'pending' | 'paid')}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:border-primary outline-none"
                                    >
                                        <option value="paid">Pagado (Abonó en el Club)</option>
                                        <option value="pending">Pendiente de Pago</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowManualEnrollModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingEnroll}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                                >
                                    {submittingEnroll ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Confirmar Inscripción
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SCORE INPUT MODAL */}
            {selectedMatchForScore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Edit3 size={18} className="text-primary" /> Cargar Resultado del Partido
                            </h3>
                            <button onClick={() => setSelectedMatchForScore(null)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveScore} className="p-6 space-y-4">
                            <div className="text-center pb-2 border-b border-white/10">
                                <span className="text-xs text-muted font-bold uppercase">{selectedMatchForScore.round}</span>
                                <div className="text-white font-bold text-sm mt-1">
                                    {selectedMatchForScore.team1_name || selectedMatchForScore.player1_name} vs {selectedMatchForScore.team2_name || selectedMatchForScore.player2_name}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    {isClubAdmin ? (
                                        <span className="text-green-400 font-bold">✓ Oficialización directa como Administrador</span>
                                    ) : (
                                        <span className="text-amber-300">⏳ Tu rival tendrá 24hs para confirmar o se autoconfirmará</span>
                                    )}
                                </div>
                            </div>

                            {/* SETS INPUT */}
                            <div className="space-y-3">
                                {/* Set 1 */}
                                <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white">Set 1</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP1Set1}
                                        onChange={e => setScoreP1Set1(Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP2Set1}
                                        onChange={e => setScoreP2Set1(Number(e.target.value))}
                                    />
                                </div>

                                {/* Set 2 */}
                                <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white">Set 2</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP1Set2}
                                        onChange={e => setScoreP1Set2(Number(e.target.value))}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                        value={scoreP2Set2}
                                        onChange={e => setScoreP2Set2(Number(e.target.value))}
                                    />
                                </div>

                                {/* Set 3 / Super Tiebreak */}
                                {hasSet3 ? (
                                    <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5 animate-fade-up">
                                        <span className="text-xs font-bold text-white">Set 3 / STB</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                            value={scoreP1Set3}
                                            onChange={e => setScoreP1Set3(Number(e.target.value))}
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold"
                                            value={scoreP2Set3}
                                            onChange={e => setScoreP2Set3(Number(e.target.value))}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setHasSet3(true)}
                                        className="w-full py-2 border border-dashed border-white/20 text-xs text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                                    >
                                        + Agregar 3er Set / Super Tiebreak
                                    </button>
                                )}
                            </div>

                            {/* WINNER SELECTOR */}
                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs text-muted uppercase font-bold">Ganador del Partido</label>
                                <select
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs font-bold focus:border-primary outline-none"
                                    value={selectedWinnerId}
                                    onChange={e => setSelectedWinnerId(e.target.value)}
                                    required
                                >
                                    <option value={selectedMatchForScore.player1_id}>{selectedMatchForScore.team1_name || selectedMatchForScore.player1_name}</option>
                                    <option value={selectedMatchForScore.player2_id}>{selectedMatchForScore.team2_name || selectedMatchForScore.player2_name}</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMatchForScore(null)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingScore}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {savingScore ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar Marcador
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DISPUTE MODAL */}
            {disputeMatchId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <AlertTriangle className="text-red-400" size={18} /> Reportar Discrepancia de Marcador
                            </h3>
                            <button onClick={() => setDisputeMatchId(null)} className="text-muted hover:text-white"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleDisputeScore} className="space-y-3">
                            <p className="text-xs text-slate-300">
                                Indica cuál fue el resultado real o el motivo del desacuerdo. El organizador del torneo o SuperAdmin será notificado para arbitrar.
                            </p>
                            <textarea
                                rows={3}
                                required
                                placeholder="Ej: El segundo set terminó 6-4 a mi favor, no 4-6..."
                                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                                value={disputeReason}
                                onChange={e => setDisputeReason(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setDisputeMatchId(null)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submittingDispute} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                                    {submittingDispute ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Enviar Disputa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HEAD TO HEAD (H2H) MODAL */}
            {h2hPlayers && (
                <HeadToHeadModal
                    player1Id={h2hPlayers.p1Id}
                    player2Id={h2hPlayers.p2Id}
                    onClose={() => setH2hPlayers(null)}
                />
            )}

            {/* GENERATE FIXTURE MODAL */}
            {showFixtureModal && tournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Settings2 size={18} className="text-primary" /> Configurar y Sortear Zonas del Torneo
                                </h3>
                                <p className="text-xs text-muted mt-0.5">
                                    {tournament.name} • {players.length} Jugadores Inscriptos
                                </p>
                            </div>
                            <button onClick={() => setShowFixtureModal(false)} className="text-muted hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* SEEDING DISCLAIMER NOTICE */}
                            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                                    <Info size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                        Asignación de Cabezas de Serie y Ranking
                                    </h4>
                                    <p className="text-xs text-amber-200/90 leading-relaxed">
                                        Hasta no contar con un historial o ranking oficial consolidado en el sistema, el armado de las zonas se realiza mediante un <strong>sorteo 100% aleatorio y equitativo</strong> sin cabezas de serie automáticas.
                                    </p>
                                    <p className="text-[11px] text-amber-300/80 italic">
                                        💡 Una vez generado el fixture, podrás reubicar o intercambiar a los jugadores destacados entre zonas usando el botón <strong>"Intercambiar Jugadores"</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* GROUP FORMAT SELECTOR */}
                            <div className="space-y-2">
                                <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                    <span>Formato y Cantidad de Zonas</span>
                                    <span className="text-primary font-normal lowercase text-[11px]">
                                        ({players.length} inscriptos)
                                    </span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* Preset: 4 Groups if available or Math.floor(N/3) */}
                                    {players.length >= 6 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const g = Math.max(1, Math.floor(players.length / 3));
                                                setFixtureNumGroups(g);
                                                handleShufflePreview(g);
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                fixtureNumGroups === Math.max(1, Math.floor(players.length / 3))
                                                    ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                                                    : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="font-bold text-xs text-white">
                                                {Math.max(1, Math.floor(players.length / 3))} Zonas (Estándar)
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                ~{Math.ceil(players.length / Math.max(1, Math.floor(players.length / 3)))} jugadores por grupo
                                            </div>
                                        </button>
                                    )}

                                    {/* Preset: 3 Groups if available */}
                                    {players.length >= 8 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const g = Math.max(1, Math.floor(players.length / 4));
                                                setFixtureNumGroups(g);
                                                handleShufflePreview(g);
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                fixtureNumGroups === Math.max(1, Math.floor(players.length / 4))
                                                    ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                                                    : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="font-bold text-xs text-white">
                                                {Math.max(1, Math.floor(players.length / 4))} Zonas (Más Partidos)
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                ~{Math.ceil(players.length / Math.max(1, Math.floor(players.length / 4)))} jugadores por grupo
                                            </div>
                                        </button>
                                    )}

                                    {/* Preset: 2 Groups (Liga / Big Groups) */}
                                    {players.length >= 4 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFixtureNumGroups(2);
                                                handleShufflePreview(2);
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                fixtureNumGroups === 2
                                                    ? 'bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary/50'
                                                    : 'bg-sidebar/50 border-white/5 text-muted hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="font-bold text-xs text-white">
                                                2 Zonas (Liga)
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                {Math.ceil(players.length / 2)} por grupo
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* CUSTOM SLIDER / STEPPER */}
                            <div className="bg-sidebar/40 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold text-white flex items-center gap-2">
                                        <Grid size={14} className="text-primary" /> Cantidad personalizada de Zonas
                                    </div>
                                    <p className="text-[11px] text-muted mt-0.5">
                                        Ajusta manualmente el número de zonas para el torneo
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={fixtureNumGroups <= 1}
                                        onClick={() => {
                                            const next = Math.max(1, fixtureNumGroups - 1);
                                            setFixtureNumGroups(next);
                                            handleShufflePreview(next);
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold text-sm text-primary w-20 text-center">
                                        {fixtureNumGroups} {fixtureNumGroups === 1 ? 'Zona' : 'Zonas'}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={fixtureNumGroups >= Math.floor(players.length / 2)}
                                        onClick={() => {
                                            const next = Math.min(Math.floor(players.length / 2), fixtureNumGroups + 1);
                                            setFixtureNumGroups(next);
                                            handleShufflePreview(next);
                                        }}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* PREVIEW OF DRAW */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers size={14} className="text-primary" /> Previsualización del Sorteo ({previewGroups.length} Zonas)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => handleShufflePreview(fixtureNumGroups)}
                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
                                        title="Volver a mezclar aleatoriamente"
                                    >
                                        <Shuffle size={13} className="text-primary" /> Volver a Sortear
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                    {previewGroups.map((grp, idx) => (
                                        <div key={idx} className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                                                <span className="font-bold text-xs text-primary">{grp.name}</span>
                                                <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
                                                    {grp.players.length} jugadores • {(grp.players.length * (grp.players.length - 1)) / 2} partidos
                                                </span>
                                            </div>
                                            <ul className="space-y-1">
                                                {grp.players.map((p, pIdx) => (
                                                    <li key={p.id || pIdx} className="text-xs text-slate-300 flex items-center justify-between">
                                                        <span className="truncate">{pIdx + 1}. {p.name || p.player_name}</span>
                                                        <span className="text-[10px] text-muted font-mono">{p.category || tournament.category}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="text-xs text-muted">
                                Total de partidos a disputar: <strong className="text-white">{previewGroups.reduce((acc, g) => acc + (g.players.length * (g.players.length - 1)) / 2, 0)} partidos</strong>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowFixtureModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCustomFixture}
                                    disabled={generatingFixture || previewGroups.length === 0}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                                >
                                    {generatingFixture ? (
                                        <><Loader2 size={14} className="animate-spin" /> Generando...</>
                                    ) : (
                                        <><Check size={14} /> Confirmar y Activar Torneo</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REPLACE / SUBSTITUTE PLAYER MODAL */}
            {playerToReplace && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <RefreshCw size={18} className="text-primary" /> Sustituir Jugador
                                </h3>
                                <p className="text-xs text-muted mt-0.5">
                                    Jugador saliente: <strong className="text-white">{playerToReplace.player_name || playerToReplace.name}</strong>
                                </p>
                            </div>
                            <button onClick={() => setPlayerToReplace(null)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Selector (Singles) */}
                        {tournament.type !== 'doubles' && (
                            <div className="p-4 pb-0">
                                <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-white/10 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setReplaceMode('member')}
                                        className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            replaceMode === 'member'
                                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                                : 'text-muted hover:text-white'
                                        }`}
                                    >
                                        <UserCheck size={14} /> Socio Registrado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReplaceMode('guest')}
                                        className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            replaceMode === 'guest'
                                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                                : 'text-muted hover:text-white'
                                        }`}
                                    >
                                        <Users size={14} /> Jugador Externo / Invitado
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleReplacePlayerSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            {tournament.type === 'doubles' ? (
                                <div className="space-y-4">
                                    {/* JUGADOR 1 */}
                                    <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                                <UserCheck size={14} /> Jugador 1
                                            </span>
                                            <div className="flex gap-1 text-[11px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setReplaceMode('member')}
                                                    className={`px-2 py-0.5 rounded-lg font-semibold ${replaceMode === 'member' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                                >
                                                    Socio
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplaceMode('guest')}
                                                    className={`px-2 py-0.5 rounded-lg font-semibold ${replaceMode === 'guest' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                                >
                                                    Invitado
                                                </button>
                                            </div>
                                        </div>

                                        {replaceMode === 'member' ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar Jugador 1 por nombre o DNI..."
                                                    value={searchUserReplaceQuery}
                                                    onChange={e => setSearchUserReplaceQuery(e.target.value)}
                                                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                                <div className="max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1.5 bg-black/20 custom-scrollbar">
                                                    {allProfiles
                                                        .filter(p => {
                                                            const query = searchUserReplaceQuery.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                                                        })
                                                        .slice(0, 15)
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedUserForReplace(p);
                                                                    setReplaceGuestName(formatPlayerName(p.name, p.lastname));
                                                                }}
                                                                className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                                                                    selectedUserForReplace?.id === p.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-white'
                                                                }`}
                                                            >
                                                                <span className="truncate">{formatPlayerName(p.name, p.lastname)}</span>
                                                                {selectedUserForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Nombre y Apellido del Jugador 1"
                                                value={replaceGuestName}
                                                onChange={e => setReplaceGuestName(e.target.value)}
                                                className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                                required
                                            />
                                        )}
                                    </div>

                                    {/* JUGADOR 2 (PAREJA) */}
                                    <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                                                <Users size={14} /> Jugador 2 (Pareja de Dobles)
                                            </span>
                                            <div className="flex gap-1 text-[11px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setReplacePartnerMode('member')}
                                                    className={`px-2 py-0.5 rounded-lg font-semibold ${replacePartnerMode === 'member' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                                >
                                                    Socio
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplacePartnerMode('guest')}
                                                    className={`px-2 py-0.5 rounded-lg font-semibold ${replacePartnerMode === 'guest' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                                                >
                                                    Invitado
                                                </button>
                                            </div>
                                        </div>

                                        {replacePartnerMode === 'member' ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar Pareja por nombre o DNI..."
                                                    value={searchPartnerReplaceQuery}
                                                    onChange={e => setSearchPartnerReplaceQuery(e.target.value)}
                                                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                                                />
                                                <div className="max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-xl p-1.5 bg-black/20 custom-scrollbar">
                                                    {allProfiles
                                                        .filter(p => {
                                                            const query = searchPartnerReplaceQuery.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                                                        })
                                                        .slice(0, 15)
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPartnerForReplace(p);
                                                                    setReplaceGuestPartnerName(formatPlayerName(p.name, p.lastname));
                                                                }}
                                                                className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between ${
                                                                    selectedPartnerForReplace?.id === p.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-white/5 text-white'
                                                                }`}
                                                            >
                                                                <span className="truncate">{formatPlayerName(p.name, p.lastname)}</span>
                                                                {selectedPartnerForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Nombre y Apellido de la Pareja"
                                                value={replaceGuestPartnerName}
                                                onChange={e => setReplaceGuestPartnerName(e.target.value)}
                                                className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                                required
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : replaceMode === 'member' ? (
                                <div className="space-y-3">
                                    <label className="text-xs text-muted font-bold uppercase block">Buscar Nuevo Jugador (Socio)</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, DNI o email..."
                                            value={searchUserReplaceQuery}
                                            onChange={e => setSearchUserReplaceQuery(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                                        />
                                    </div>

                                    {/* User Search Results */}
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/5 rounded-2xl p-2 bg-slate-900/60 custom-scrollbar">
                                        {loadingProfiles ? (
                                            <div className="py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                                                <Loader2 size={14} className="animate-spin text-primary" /> Buscando socios...
                                            </div>
                                        ) : (
                                            allProfiles
                                                .filter(p => {
                                                    const query = searchUserReplaceQuery.toLowerCase().trim();
                                                    if (!query) return true;
                                                    const fullName = `${p.name} ${p.lastname || ''}`.toLowerCase();
                                                    return (
                                                        fullName.includes(query) ||
                                                        (p.email && p.email.toLowerCase().includes(query)) ||
                                                        (p.dni && p.dni.includes(query))
                                                    );
                                                })
                                                .slice(0, 30)
                                                .map(p => {
                                                    const isSelected = selectedUserForReplace?.id === p.id;
                                                    const isAlreadyIn = players.some(pl => pl.player_id === p.id && pl.id !== playerToReplace.id);

                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            disabled={isAlreadyIn}
                                                            onClick={() => {
                                                                setSelectedUserForReplace(p);
                                                                if (p.category) setReplaceCategory(p.category);
                                                            }}
                                                            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                                                                isAlreadyIn
                                                                    ? 'opacity-40 bg-white/5 cursor-not-allowed'
                                                                    : isSelected
                                                                    ? 'bg-primary/20 border border-primary/40 text-primary font-bold shadow-sm'
                                                                    : 'bg-white/5 hover:bg-white/10 text-white border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold truncate">{formatPlayerName(p.name, p.lastname)}</div>
                                                                <div className="text-[10px] text-muted truncate">
                                                                    {p.category ? `${p.category} Cat.` : 'Sin Cat.'} {p.institution ? `• ${p.institution}` : ''}
                                                                </div>
                                                            </div>
                                                            {isAlreadyIn ? (
                                                                <span className="text-[10px] text-yellow-400 font-semibold">Ya inscripto</span>
                                                            ) : isSelected ? (
                                                                <CheckCircle2 size={16} className="text-primary" />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-muted font-bold uppercase block mb-1">Nombre y Apellido del Nuevo Jugador *</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Martín Palermo"
                                            value={replaceGuestName}
                                            onChange={e => setReplaceGuestName(e.target.value)}
                                            className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-primary outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Category Selector */}
                            <div>
                                <label className="text-xs text-muted font-bold uppercase block mb-1">Categoría</label>
                                <select
                                    value={replaceCategory}
                                    onChange={e => setReplaceCategory(e.target.value)}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                                >
                                    {NUMERIC_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === 'Open' ? 'Categoría Open' : `${cat} Categoría`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Informative notice */}
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                                <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="block text-amber-300 mb-0.5">Información de la Sustitución</strong>
                                    {tournament.type === 'doubles' ? (
                                        <span>La dupla ocupará la misma posición/zona de <strong>{playerToReplace.player_name || playerToReplace.name}</strong> y sus partidos pendientes se actualizarán con los nuevos integrantes.</span>
                                    ) : (
                                        <span>El nuevo jugador ocupará la misma posición/zona de <strong>{playerToReplace.player_name || playerToReplace.name}</strong> y sus partidos pendientes se actualizarán automáticamente.</span>
                                    )}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPlayerToReplace(null)}
                                    className="px-4 py-2 rounded-xl text-white text-xs hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReplace || (tournament.type !== 'doubles' && replaceMode === 'member' && !selectedUserForReplace) || (tournament.type !== 'doubles' && replaceMode === 'guest' && !replaceGuestName.trim())}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                    {isSubmittingReplace ? (
                                        <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                                    ) : (
                                        <><RefreshCw size={14} /> Confirmar Sustitución</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};