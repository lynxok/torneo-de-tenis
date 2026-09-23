import React, { useState } from 'react';
import { Tournament, TournamentPlayer, UserProfile } from '../types';
import { api } from '../services/api';
import { formatPlayerName } from '../utils/formatters';

interface UseTournamentPlayersAdminProps {
    tournament: Tournament | null;
    players: TournamentPlayer[];
    setPlayers: React.Dispatch<React.SetStateAction<TournamentPlayer[]>>;
    loadTournament: () => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useTournamentPlayersAdmin = ({
    tournament,
    players,
    setPlayers,
    loadTournament,
    addToast,
}: UseTournamentPlayersAdminProps) => {
    // Manual Enroll State
    const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
    const [enrollMode, setEnrollMode] = useState<'member' | 'guest'>('member');
    const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<UserProfile | null>(null);
    const [partnerUserForEnroll, setPartnerUserForEnroll] = useState<UserProfile | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestPartnerName, setGuestPartnerName] = useState('');
    const [guestCategory, setGuestCategory] = useState('4ta');
    const [manualFee, setManualFee] = useState<number | ''>(0);
    const [manualPaymentStatus, setManualPaymentStatus] = useState<'paid' | 'pending'>('paid');
    const [manualAvailabilityNotes, setManualAvailabilityNotes] = useState('');
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [submittingEnroll, setSubmittingEnroll] = useState(false);
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
    const [filterByGender, setFilterByGender] = useState(true);

    // Replace Player State
    const [showReplacePlayerModal, setShowReplacePlayerModal] = useState(false);
    const [playerToReplace, setPlayerToReplace] = useState<TournamentPlayer | null>(null);
    const [replaceMode, setReplaceMode] = useState<'member' | 'guest'>('member');
    const [searchUserReplaceQuery, setSearchUserReplaceQuery] = useState('');
    const [selectedUserForReplace, setSelectedUserForReplace] = useState<UserProfile | null>(null);
    const [replaceGuestName, setReplaceGuestName] = useState('');
    const [replacePartnerMode, setReplacePartnerMode] = useState<'member' | 'guest'>('guest');
    const [selectedPartnerForReplace, setSelectedPartnerForReplace] = useState<UserProfile | null>(null);
    const [searchPartnerReplaceQuery, setSearchPartnerReplaceQuery] = useState('');
    const [replaceGuestPartnerName, setGuestReplacePartnerName] = useState('');
    const [replaceCategory, setReplaceCategory] = useState('4ta');
    const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

    const matchTournamentGender = (userGender?: string, targetGender?: string) => {
        if (!filterByGender) return true;
        if (!targetGender) return true;
        const tg = targetGender.toLowerCase();
        if (tg === 'mixto' || tg === 'x' || tg === 'open') return true;
        const ug = (userGender || 'masculino').toLowerCase();
        const isFemale = ug === 'femenino' || ug === 'f' || ug === 'damas';
        if (tg === 'damas' || tg === 'f' || tg === 'femenino') return isFemale;
        if (tg === 'caballeros' || tg === 'm' || tg === 'masculino') return !isFemale;
        return true;
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
        setManualAvailabilityNotes('');

        if (allProfiles.length === 0) {
            setLoadingProfiles(true);
            try {
                const profiles = await api.auth.getAllProfiles(1, 200);
                setAllProfiles(profiles);
            } catch (e) {
                console.error('Error loading profiles:', e);
            } finally {
                setLoadingProfiles(false);
            }
        }
    };

    const handleManualEnrollSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!tournament) return;

        let pName = '';
        let pId = undefined;
        let pCat = '';
        let partnerId = undefined;
        let partnerName = undefined;

        if (enrollMode === 'member') {
            if (!selectedUserForEnroll) {
                addToast('Por favor selecciona un socio del listado.', 'error');
                return;
            }
            pId = selectedUserForEnroll.id;
            pName = (selectedUserForEnroll.name + ' ' + (selectedUserForEnroll.lastname || '')).trim();
            pCat = selectedUserForEnroll.category || tournament.category || 'Open';

            // Check if already enrolled
            const alreadyEnrolled = players.some(p => p.player_id === pId);
            if (alreadyEnrolled) {
                addToast('Este socio ya se encuentra inscripto en el torneo.', 'error');
                return;
            }

            if (tournament.type === 'doubles') {
                if (partnerUserForEnroll) {
                    partnerId = partnerUserForEnroll.id;
                    partnerName = (partnerUserForEnroll.name + ' ' + (partnerUserForEnroll.lastname || '')).trim();
                } else if (guestPartnerName.trim()) {
                    partnerName = guestPartnerName.trim();
                }
            }
        } else {
            if (!guestName.trim()) {
                addToast('Por favor ingresa el nombre del jugador invitado.', 'error');
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
                fee: typeof manualFee === 'number' ? manualFee : 0,
                paymentStatus: manualPaymentStatus,
                partnerId,
                partnerName,
                availabilityNotes: manualAvailabilityNotes.trim() || undefined
            });

            addToast('¡' + pName + (partnerName ? ' y ' + partnerName : '') + ' fueron inscriptos correctamente!', 'success');
            setShowManualEnrollModal(false);
            loadTournament();
        } catch (e) {
            addToast('Error al inscribir: ' + (e.message || 'Intente nuevamente'), 'error');
        } finally {
            setSubmittingEnroll(false);
        }
    };

    const handleUnenrollPlayer = async (player: TournamentPlayer) => {
        const playerName = player.name || player.player_name || 'este jugador';
        if (!confirm('¿Estás seguro de dar de baja a ' + playerName + ' del torneo?')) return;

        setDeletingPlayerId(player.id);
        try {
            await api.players.unenroll(player.id);
            addToast('Inscripción de ' + playerName + ' eliminada.', 'success');
            loadTournament();
        } catch (e) {
            addToast('Error al eliminar inscripción: ' + (e.message || 'Error de servidor'), 'error');
        } finally {
            setDeletingPlayerId(null);
        }
    };

    const handleTogglePaymentStatus = async (player: TournamentPlayer) => {
        const nextStatus = player.payment_status === 'paid' ? 'pending' : 'paid';
        try {
            await api.players.updatePaymentStatus(player.id, nextStatus);
            addToast('Estado de pago actualizado a ' + (nextStatus === 'paid' ? 'Pagado' : 'Pendiente') + '.', 'success');
            // Optimistic update
            setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, payment_status: nextStatus } : p));
        } catch (e) {
            addToast('Error al actualizar pago', 'error');
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
        setGuestReplacePartnerName(parts[1]?.trim() || '');
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
        setShowReplacePlayerModal(true);
    };

    const handleReplacePlayerSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!tournament || !playerToReplace) return;

        let pId = undefined;
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
                addToast('Ingresa o selecciona al Jugador 1.', 'error');
                return;
            }
            if (!p2) {
                addToast('Ingresa o selecciona al Jugador 2 (Pareja).', 'error');
                return;
            }

            pName = p1 + ' / ' + p2;
            if (replaceMode === 'member' && selectedUserForReplace) {
                pId = selectedUserForReplace.id;
            }
        } else {
            if (replaceMode === 'member') {
                if (!selectedUserForReplace) {
                    addToast('Por favor selecciona un socio de la lista.', 'error');
                    return;
                }
                pId = selectedUserForReplace.id;
                pName = formatPlayerName(selectedUserForReplace.name, selectedUserForReplace.lastname);
                pCat = replaceCategory || selectedUserForReplace.category || '4ta';
            } else {
                if (!replaceGuestName.trim()) {
                    addToast('Ingresa el nombre y apellido del nuevo jugador.', 'error');
                    return;
                }
                pName = replaceGuestName.trim();
                pCat = replaceCategory || tournament.category || '4ta';
            }
        }

        const oldName = playerToReplace.player_name || playerToReplace.name || 'el jugador';
        if (!confirm('¿Confirmas sustituir a "' + oldName + '" por "' + pName + '" en todos los partidos de este torneo?')) {
            return;
        }

        setIsSubmittingReplace(true);
        try {
            await api.players.replacePlayer(tournament.id, playerToReplace, {
                playerId: pId,
                playerName: pName,
                category: pCat
            });

            addToast('¡"' + oldName + '" fue sustituido exitosamente por "' + pName + '"!', 'success');
            setPlayerToReplace(null);
            setShowReplacePlayerModal(false);
            loadTournament();
        } catch (err) {
            addToast('Error al sustituir jugador: ' + (err.message || 'Error del servidor'), 'error');
        } finally {
            setIsSubmittingReplace(false);
        }
    };

    return {
        showManualEnrollModal,
        setShowManualEnrollModal,
        enrollMode,
        setEnrollMode,
        selectedUserForEnroll,
        setSelectedUserForEnroll,
        partnerUserForEnroll,
        setPartnerUserForEnroll,
        guestName,
        setGuestName,
        guestPartnerName,
        setGuestPartnerName,
        guestCategory,
        setGuestCategory,
        manualFee,
        setManualFee,
        manualPaymentStatus,
        setManualPaymentStatus,
        manualAvailabilityNotes,
        setManualAvailabilityNotes,
        searchUserQuery,
        setSearchUserQuery,
        submittingEnroll,
        setSubmittingEnroll,
        allProfiles,
        setAllProfiles,
        loadingProfiles,
        setLoadingProfiles,
        deletingPlayerId,
        setDeletingPlayerId,
        filterByGender,
        setFilterByGender,
        matchTournamentGender,
        showReplacePlayerModal,
        setShowReplacePlayerModal,
        playerToReplace,
        setPlayerToReplace,
        replaceMode,
        setReplaceMode,
        searchUserReplaceQuery,
        setSearchUserReplaceQuery,
        selectedUserForReplace,
        setSelectedUserForReplace,
        replaceGuestName,
        setReplaceGuestName,
        replacePartnerMode,
        setReplacePartnerMode,
        selectedPartnerForReplace,
        setSelectedPartnerForReplace,
        searchPartnerReplaceQuery,
        setSearchPartnerReplaceQuery,
        replaceGuestPartnerName,
        setGuestReplacePartnerName,
        replaceCategory,
        setReplaceCategory,
        isSubmittingReplace,
        setIsSubmittingReplace,
        openManualEnrollModal,
        handleManualEnrollSubmit,
        handleUnenrollPlayer,
        handleTogglePaymentStatus,
        handleOpenReplaceModal,
        handleReplacePlayerSubmit,
    };
};