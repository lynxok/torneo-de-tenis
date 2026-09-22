import React, { useState } from 'react';
import { Match, Tournament, User } from '../types';
import { api } from '../services/api';
import { soundEffects } from '../services/soundEffects';

interface UseTournamentScoreProps {
    tournament: Tournament | null;
    user: User;
    loadTournament: () => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useTournamentScore = ({
    tournament,
    user,
    loadTournament,
    addToast,
}: UseTournamentScoreProps) => {
    // Score Input Modal State
    const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [showQuickScorer, setShowQuickScorer] = useState(false);

    const [scoreP1Set1, setScoreP1Set1] = useState<number | ''>('');
    const [scoreP2Set1, setScoreP2Set1] = useState<number | ''>('');
    const [tbP1Set1, setTbP1Set1] = useState<number | ''>('');
    const [tbP2Set1, setTbP2Set1] = useState<number | ''>('');

    const [scoreP1Set2, setScoreP1Set2] = useState<number | ''>('');
    const [scoreP2Set2, setScoreP2Set2] = useState<number | ''>('');
    const [tbP1Set2, setTbP1Set2] = useState<number | ''>('');
    const [tbP2Set2, setTbP2Set2] = useState<number | ''>('');

    const [scoreP1Set3, setScoreP1Set3] = useState<number | ''>('');
    const [scoreP2Set3, setScoreP2Set3] = useState<number | ''>('');
    const [tbP1Set3, setTbP1Set3] = useState<number | ''>('');
    const [tbP2Set3, setTbP2Set3] = useState<number | ''>('');
    const [hasSet3, setHasSet3] = useState(false);
    const [isSet3SuperTiebreak, setIsSet3SuperTiebreak] = useState(true);
    const [isWalkover, setIsWalkover] = useState(false);
    const [walkoverWinnerId, setWalkoverWinnerId] = useState<string>('');
    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
    const [savingScore, setSavingScore] = useState(false);

    // Dispute Modal State
    const [disputeMatchId, setDisputeMatchId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);

    const parseSetForInput = (setStr?: string) => {
        if (!setStr) return { p1: '' as number | '', p2: '' as number | '', tbP1: '' as number | '', tbP2: '' as number | '', isSTB: false };
        const clean = setStr.trim();
        const match = clean.match(/^(\d+)\s*[-/]\s*(\d+)(?:\s*\((.*?)\))?/);
        if (!match) return { p1: '' as number | '', p2: '' as number | '', tbP1: '' as number | '', tbP2: '' as number | '', isSTB: false };

        let p1 = parseInt(match[1], 10);
        let p2 = parseInt(match[2], 10);
        let tb = match[3] ? match[3].trim() : '';

        if (p1 >= 10 || p2 >= 10) {
            return { p1: 7, p2: 6, tbP1: p1, tbP2: p2, isSTB: true };
        }

        let tbP1: number | '' = '';
        let tbP2: number | '' = '';
        let isSTB = false;

        if (tb) {
            const tbParts = tb.split(/[-/]/);
            if (tbParts.length === 2) {
                tbP1 = parseInt(tbParts[0], 10) || 0;
                tbP2 = parseInt(tbParts[1], 10) || 0;
                if (tbP1 >= 10 || tbP2 >= 10) {
                    isSTB = true;
                }
            } else if (tbParts.length === 1 && /^\d+$/.test(tbParts[0])) {
                const loser = parseInt(tbParts[0], 10);
                if (p1 === 7) {
                    tbP1 = 7;
                    tbP2 = loser;
                } else {
                    tbP1 = loser;
                    tbP2 = 7;
                }
            }
        }

        return { p1, p2, tbP1, tbP2, isSTB };
    };

    const openScoreModal = (m: Match) => {
        const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament?.institution_id);
        
        // If match is already played and officially confirmed or disputed, only club admin/superadmin can edit
        if (m.is_played && (m.score_status === 'confirmed' || m.score_status === 'disputed') && !isClubAdmin) {
            addToast("Este marcador ya ha sido verificado u oficializado. Solo el organizador o SuperAdmin puede modificarlo.", "info");
            return;
        }

        setSelectedMatchForScore(m);
        setSelectedWinnerId(m.winner_id || m.player1_id || '');
        
        // Detect walkover if exists
        const isWoScore = m.score && (
            m.score.set1 === 'W-O' || m.score.set1 === 'O-W' || 
            m.score.set1 === 'WO' || m.score.set1 === 'W/O'
        );
        setIsWalkover(!!isWoScore);
        setWalkoverWinnerId(m.winner_id || m.player1_id || '');

        // If match has existing score, parse and preload values
        if (m.score && m.is_played && !isWoScore) {
            if (typeof m.score === 'object') {
                const s1 = parseSetForInput(m.score.set1);
                const s2 = parseSetForInput(m.score.set2);
                const s3 = parseSetForInput(m.score.set3);
                
                setScoreP1Set1(s1.p1);
                setScoreP2Set1(s1.p2);
                setTbP1Set1(s1.tbP1);
                setTbP2Set1(s1.tbP2);
                
                setScoreP1Set2(s2.p1);
                setScoreP2Set2(s2.p2);
                setTbP1Set2(s2.tbP1);
                setTbP2Set2(s2.tbP2);
                
                if (m.score.set3) {
                    setHasSet3(true);
                    if (s3.isSTB) {
                        setIsSet3SuperTiebreak(true);
                        setScoreP1Set3(s3.tbP1 !== '' ? s3.tbP1 : (s3.p1 !== '' && s3.p1 >= 10 ? s3.p1 : 10));
                        setScoreP2Set3(s3.tbP2 !== '' ? s3.tbP2 : (s3.p2 !== '' && s3.p2 >= 10 ? s3.p2 : 8));
                        setTbP1Set3('');
                        setTbP2Set3('');
                    } else {
                        setIsSet3SuperTiebreak(false);
                        setScoreP1Set3(s3.p1);
                        setScoreP2Set3(s3.p2);
                        setTbP1Set3(s3.tbP1);
                        setTbP2Set3(s3.tbP2);
                    }
                } else {
                    setHasSet3(false);
                    setIsSet3SuperTiebreak(true);
                    setScoreP1Set3('');
                    setScoreP2Set3('');
                    setTbP1Set3('');
                    setTbP2Set3('');
                }
            } else {
                setHasSet3(false);
                setIsSet3SuperTiebreak(true);
                setScoreP1Set1('');
                setScoreP2Set1('');
                setTbP1Set1('');
                setTbP2Set1('');
                setScoreP1Set2('');
                setScoreP2Set2('');
                setTbP1Set2('');
                setTbP2Set2('');
                setScoreP1Set3('');
                setScoreP2Set3('');
                setTbP1Set3('');
                setTbP2Set3('');
            }
        } else {
            // New / unplayed match: keep completely blank
            setHasSet3(false);
            setIsSet3SuperTiebreak(true);
            setScoreP1Set1('');
            setScoreP2Set1('');
            setTbP1Set1('');
            setTbP2Set1('');
            setScoreP1Set2('');
            setScoreP2Set2('');
            setTbP1Set2('');
            setTbP2Set2('');
            setScoreP1Set3('');
            setScoreP2Set3('');
            setTbP1Set3('');
            setTbP2Set3('');
        }
    };

    const handleResetScore = async () => {
        if (!selectedMatchForScore) return;
        const confirmReset = window.confirm(
            "⚠️ ¿Estás seguro de anular el resultado de este partido?\n\nEl partido volverá al estado 'Por Jugar' y se recalcularán automáticamente las posiciones del grupo y estadísticas."
        );
        if (!confirmReset) return;

        setSavingScore(true);
        try {
            await api.matches.resetScore(selectedMatchForScore.id, user);
            addToast("Resultado anulado. El partido volvió al estado 'Por Jugar'.", 'success');
            setSelectedMatchForScore(null);
            loadTournament();
        } catch (e: any) {
            console.error(e);
            addToast("Error al anular resultado: " + e.message, 'error');
        } finally {
            setSavingScore(false);
        }
    };

    const formatSetPayload = (p1: number | '', p2: number | '', tbP1: number | '', tbP2: number | '', isSTB = false): string => {
        if (p1 === '' || p2 === '') return '';
        const n1 = Number(p1);
        const n2 = Number(p2);

        if (isSTB) {
            if (n1 > n2) {
                return `7-6 (${n1}-${n2})`;
            } else {
                return `6-7 (${n1}-${n2})`;
            }
        }

        if ((n1 === 7 && n2 === 6) || (n1 === 6 && n2 === 7)) {
            if (tbP1 !== '' && tbP2 !== '') {
                return `${n1}-${n2} (${tbP1}-${tbP2})`;
            }
            return `${n1}-${n2}`;
        }

        return `${n1}-${n2}`;
    };

    // Calculate computed winner automatically from sets score
    const computedWinnerInfo = React.useMemo(() => {
        if (!selectedMatchForScore) return null;
        if (isWalkover) {
            const wId = walkoverWinnerId || selectedMatchForScore.player1_id;
            const wName = wId === selectedMatchForScore.player1_id 
                ? (selectedMatchForScore.team1_name || selectedMatchForScore.player1_name)
                : (selectedMatchForScore.team2_name || selectedMatchForScore.player2_name);
            return {
                winnerId: wId,
                winnerName: wName,
                isTie: false,
                isComplete: true,
                p1Sets: wId === selectedMatchForScore.player1_id ? 2 : 0,
                p2Sets: wId === selectedMatchForScore.player2_id ? 2 : 0,
                isWalkover: true
            };
        }

        let p1Sets = 0;
        let p2Sets = 0;

        if (scoreP1Set1 !== '' && scoreP2Set1 !== '') {
            if (Number(scoreP1Set1) > Number(scoreP2Set1)) p1Sets++;
            else if (Number(scoreP2Set1) > Number(scoreP1Set1)) p2Sets++;
        }

        if (scoreP1Set2 !== '' && scoreP2Set2 !== '') {
            if (Number(scoreP1Set2) > Number(scoreP2Set2)) p1Sets++;
            else if (Number(scoreP2Set2) > Number(scoreP1Set2)) p2Sets++;
        }

        if (hasSet3 && scoreP1Set3 !== '' && scoreP2Set3 !== '') {
            if (Number(scoreP1Set3) > Number(scoreP2Set3)) p1Sets++;
            else if (Number(scoreP2Set3) > Number(scoreP1Set3)) p2Sets++;
        }

        const isComplete = p1Sets === 2 || p2Sets === 2;
        let winnerId = '';
        let winnerName = '';

        if (p1Sets > p2Sets) {
            winnerId = selectedMatchForScore.player1_id;
            winnerName = selectedMatchForScore.team1_name || selectedMatchForScore.player1_name;
        } else if (p2Sets > p1Sets) {
            winnerId = selectedMatchForScore.player2_id;
            winnerName = selectedMatchForScore.team2_name || selectedMatchForScore.player2_name;
        }

        return {
            winnerId,
            winnerName,
            isTie: p1Sets === p2Sets,
            isComplete,
            p1Sets,
            p2Sets,
            isWalkover: false
        };
    }, [selectedMatchForScore, isWalkover, walkoverWinnerId, scoreP1Set1, scoreP2Set1, scoreP1Set2, scoreP2Set2, hasSet3, scoreP1Set3, scoreP2Set3]);

    const handleSaveScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatchForScore) return;

        let finalWinnerId = '';
        let scoreObj: any = {};

        if (isWalkover) {
            if (!walkoverWinnerId) {
                addToast("Por favor selecciona quién ganó el partido por W.O.", 'error');
                return;
            }
            finalWinnerId = walkoverWinnerId;
            const isP1Winner = finalWinnerId === selectedMatchForScore.player1_id;
            scoreObj = {
                set1: isP1Winner ? '6-0' : '0-6',
                set2: isP1Winner ? '6-0' : '0-6',
                walkover: true,
                walkover_winner: isP1Winner ? 'p1' : 'p2'
            };
        } else {
            if (scoreP1Set1 === '' || scoreP2Set1 === '' || scoreP1Set2 === '' || scoreP2Set2 === '') {
                addToast("Por favor completa los resultados del Set 1 y Set 2.", 'error');
                return;
            }

            if (hasSet3 && (scoreP1Set3 === '' || scoreP2Set3 === '')) {
                addToast("Por favor completa los resultados del Set 3 o desactívalo.", 'error');
                return;
            }

            if (!computedWinnerInfo || !computedWinnerInfo.isComplete || !computedWinnerInfo.winnerId) {
                addToast("El partido debe tener un ganador definido (uno de los jugadores debe ganar 2 sets).", 'error');
                return;
            }

            finalWinnerId = computedWinnerInfo.winnerId;
            scoreObj = {
                set1: formatSetPayload(scoreP1Set1, scoreP2Set1, tbP1Set1, tbP2Set1, false),
                set2: formatSetPayload(scoreP1Set2, scoreP2Set2, tbP1Set2, tbP2Set2, false),
            };
            if (hasSet3) {
                scoreObj.set3 = formatSetPayload(scoreP1Set3, scoreP2Set3, tbP1Set3, tbP2Set3, isSet3SuperTiebreak);
            }
        }

        setSavingScore(true);
        try {
            const isDoubles = tournament?.type === 'doubles';
            const winnerPartnerId = finalWinnerId === selectedMatchForScore.player1_id 
                ? selectedMatchForScore.player1_partner_id 
                : selectedMatchForScore.player2_partner_id;

            const res = await api.matches.updateScore(
                selectedMatchForScore.id, 
                scoreObj, 
                finalWinnerId,
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

    const openQuickScorerModal = (m: Match) => {
        const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament?.institution_id);
        if (m.is_played && (m.score_status === 'confirmed' || m.score_status === 'disputed') && !isClubAdmin) {
            addToast("Este marcador ya ha sido verificado u oficializado. Solo el organizador o SuperAdmin puede modificarlo.", "info");
            return;
        }
        setSelectedMatchForScore(m);
        setShowQuickScorer(true);
    };

    const handleQuickSaveScore = async (scoreString: string, winnerId?: string) => {
        if (!selectedMatchForScore) return;

        let finalWinnerId = winnerId;
        if (!finalWinnerId) {
            finalWinnerId = selectedMatchForScore.player1_id;
        }

        const isDoubles = tournament?.type === 'doubles';
        const winnerPartnerId = finalWinnerId === selectedMatchForScore.player1_id 
            ? selectedMatchForScore.player1_partner_id 
            : selectedMatchForScore.player2_partner_id;

        // Construir objeto estructurado para retrocompatibilidad
        const parts = scoreString.trim().split(/\s+/);
        const scoreObj: any = {
            raw: scoreString,
            set1: parts[0] || '6-0',
            set2: parts[1] || '6-0'
        };
        if (parts[2]) {
            scoreObj.set3 = parts[2];
        }
        if (scoreString.includes('W.O.')) {
            scoreObj.walkover = true;
            scoreObj.walkover_winner = finalWinnerId === selectedMatchForScore.player1_id ? 'p1' : 'p2';
        }

        const res = await api.matches.updateScore(
            selectedMatchForScore.id, 
            scoreObj, 
            finalWinnerId,
            user,
            isDoubles,
            winnerPartnerId
        );

        if (res.scoreStatus === 'confirmed') {
            addToast("⚡ Marcador cargado y oficializado con éxito.", 'success');
        } else {
            addToast("⚡ Resultado cargado con Quick-Scorer.", 'info');
        }
        setShowQuickScorer(false);
        setSelectedMatchForScore(null);
        loadTournament();
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

    return {
        selectedMatchForScore,
        setSelectedMatchForScore,
        showScoreModal,
        setShowScoreModal,
        showQuickScorer,
        setShowQuickScorer,
        scoreP1Set1,
        setScoreP1Set1,
        scoreP2Set1,
        setScoreP2Set1,
        tbP1Set1,
        setTbP1Set1,
        tbP2Set1,
        setTbP2Set1,
        scoreP1Set2,
        setScoreP1Set2,
        scoreP2Set2,
        setScoreP2Set2,
        tbP1Set2,
        setTbP1Set2,
        tbP2Set2,
        setTbP2Set2,
        scoreP1Set3,
        setScoreP1Set3,
        scoreP2Set3,
        setScoreP2Set3,
        tbP1Set3,
        setTbP1Set3,
        tbP2Set3,
        setTbP2Set3,
        hasSet3,
        setHasSet3,
        isSet3SuperTiebreak,
        setIsSet3SuperTiebreak,
        isWalkover,
        setIsWalkover,
        walkoverWinnerId,
        setWalkoverWinnerId,
        selectedWinnerId,
        setSelectedWinnerId,
        savingScore,
        setSavingScore,
        disputeMatchId,
        setDisputeMatchId,
        disputeReason,
        setDisputeReason,
        submittingDispute,
        setSubmittingDispute,
        parseSetForInput,
        openScoreModal,
        handleResetScore,
        formatSetPayload,
        handleSaveScore,
        openQuickScorerModal,
        handleQuickSaveScore,
        handleConfirmScore,
        handleDisputeScore,
    };
};
