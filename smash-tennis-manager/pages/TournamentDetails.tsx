import React, { useEffect, useState } from 'react';
import { Tournament, UserProfile, TournamentPlayer, Match } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    Trophy, Calendar, MapPin, Users, ChevronLeft, ChevronRight, UserPlus, CheckCircle2, Loader2, Play, Edit3, 
    X, Save, Layers, Award, Sparkles, Share2, MessageCircle, ArrowLeftRight, Lightbulb, Trash2, 
    Search, DollarSign, UserCheck, Shuffle, Info, Settings2, Grid, Check, TrendingUp, Wallet, Gift, Shield,
    Swords, AlertTriangle, CheckSquare, Clock, AlertCircle, RefreshCw, RotateCcw,
    Printer, Image as ImageIcon
} from 'lucide-react';
import { getCategoriesForInstitution, isUserEligibleForCategories, NUMERIC_CATEGORIES } from '../utils/categories';
import { getTournamentTier, calculateTournamentFinances } from '../utils/tournamentTiers';
import { formatPlayerName } from '../utils/formatters';
import { calculateGroupStandings, organizePlayoffRounds, getProjectedPlayoffRounds, GroupZone, GroupStandingRow, PlayoffRound, ProjectedRound } from '../utils/bracketHelper';
import { HeadToHeadModal } from '../components/HeadToHeadModal';
import { ShareGraphicModal } from '../components/ShareGraphicModal';
import { soundEffects } from '../services/soundEffects';

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

    // Social Media Graphics Generator State
    const [showGraphicModal, setShowGraphicModal] = useState(false);

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
    const [filterByGender, setFilterByGender] = useState(true);

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
    const [scoreP1Set1, setScoreP1Set1] = useState<number | ''>('');
    const [scoreP2Set1, setScoreP2Set1] = useState<number | ''>('');
    const [scoreP1Set2, setScoreP1Set2] = useState<number | ''>('');
    const [scoreP2Set2, setScoreP2Set2] = useState<number | ''>('');
    const [scoreP1Set3, setScoreP1Set3] = useState<number | ''>('');
    const [scoreP2Set3, setScoreP2Set3] = useState<number | ''>('');
    const [hasSet3, setHasSet3] = useState(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
    const [savingScore, setSavingScore] = useState(false);

    // Dispute Modal State
    const [disputeMatchId, setDisputeMatchId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);

    // Schedule Match Modal State (Organizador)
    const [selectedMatchForSchedule, setSelectedMatchForSchedule] = useState<Match | null>(null);
    const [scheduleDate, setScheduleDate] = useState<string>('');
    const [scheduleTime, setScheduleTime] = useState<string>('');
    const [scheduleCourt, setScheduleCourt] = useState<string>('Cancha 1');
    const [isCustomCourt, setIsCustomCourt] = useState(false);
    const [customCourtName, setCustomCourtName] = useState('');
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(new Date());
    const [dayBookingsForSchedule, setDayBookingsForSchedule] = useState<Booking[]>([]);
    const [loadingDayBookings, setLoadingDayBookings] = useState(false);
    const [overrideConflict, setOverrideConflict] = useState(false);

    // Derived state
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        loadTournament();
    }, [tournamentId]);

    // Check club court bookings in real-time when schedule date changes
    useEffect(() => {
        if (!selectedMatchForSchedule || !scheduleDate || !tournament?.institution_id) {
            setDayBookingsForSchedule([]);
            return;
        }

        let isMounted = true;
        setLoadingDayBookings(true);
        api.bookings.getByInstitutionAndDate(tournament.institution_id, scheduleDate)
            .then(res => {
                if (isMounted) {
                    setDayBookingsForSchedule(res || []);
                    setOverrideConflict(false);
                }
            })
            .catch(err => {
                console.warn("Could not load day bookings for schedule check:", err);
            })
            .finally(() => {
                if (isMounted) setLoadingDayBookings(false);
            });

        return () => {
            isMounted = false;
        };
    }, [selectedMatchForSchedule, scheduleDate, tournament?.institution_id]);

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

        // Check Gender Eligibility
        const tGender = (tournament.gender || 'Caballeros').toLowerCase();
        const uGender = (user.gender || 'masculino').toLowerCase();
        const isUserFemale = uGender === 'femenino' || uGender === 'f' || uGender === 'damas';
        const isTourneyFemale = tGender === 'damas' || tGender === 'f' || tGender === 'femenino';
        const isTourneyMale = tGender === 'caballeros' || tGender === 'm' || tGender === 'masculino';

        if (isTourneyFemale && !isUserFemale) {
            alert('🚫 Este torneo es exclusivo para la categoría Damas (Femenino).');
            return;
        }

        if (isTourneyMale && isUserFemale) {
            alert('🚫 Este torneo es exclusivo para la categoría Caballeros (Masculino).');
            return;
        }

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
        
        // If match has existing score, parse and preload values
        if (m.score && m.is_played) {
            if (typeof m.score === 'object') {
                const s1 = (m.score.set1 || '').split('-').map(Number);
                const s2 = (m.score.set2 || '').split('-').map(Number);
                const s3 = (m.score.set3 || '').split('-').map(Number);
                
                setScoreP1Set1(!isNaN(s1[0]) ? s1[0] : '');
                setScoreP2Set1(!isNaN(s1[1]) ? s1[1] : '');
                setScoreP1Set2(!isNaN(s2[0]) ? s2[0] : '');
                setScoreP2Set2(!isNaN(s2[1]) ? s2[1] : '');
                
                if (m.score.set3) {
                    setHasSet3(true);
                    setScoreP1Set3(!isNaN(s3[0]) ? s3[0] : '');
                    setScoreP2Set3(!isNaN(s3[1]) ? s3[1] : '');
                } else {
                    setHasSet3(false);
                    setScoreP1Set3('');
                    setScoreP2Set3('');
                }
            } else {
                setHasSet3(false);
                setScoreP1Set1('');
                setScoreP2Set1('');
                setScoreP1Set2('');
                setScoreP2Set2('');
                setScoreP1Set3('');
                setScoreP2Set3('');
            }
        } else {
            // New / unplayed match: keep completely blank
            setHasSet3(false);
            setScoreP1Set1('');
            setScoreP2Set1('');
            setScoreP1Set2('');
            setScoreP2Set2('');
            setScoreP1Set3('');
            setScoreP2Set3('');
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
            addToast("Error al anular resultado: " + e.message, 'error');
        } finally {
            setSavingScore(false);
        }
    };

    const handleSaveScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatchForScore) return;

        if (scoreP1Set1 === '' || scoreP2Set1 === '' || scoreP1Set2 === '' || scoreP2Set2 === '') {
            addToast("Por favor completa los resultados del Set 1 y Set 2.", 'error');
            return;
        }

        if (hasSet3 && (scoreP1Set3 === '' || scoreP2Set3 === '')) {
            addToast("Por favor completa los resultados del Set 3 o desactívalo.", 'error');
            return;
        }

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

    const formatScheduledInfo = (scheduledAt?: string, courtName?: string) => {
        if (!scheduledAt) return null;
        try {
            const d = new Date(scheduledAt);
            if (isNaN(d.getTime())) return null;
            const dateStr = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
            const courtStr = courtName || 'Cancha Asignada';
            return {
                dateStr: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
                timeStr,
                courtStr,
                fullLabel: `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • ${timeStr} • ${courtStr}`,
                iso: scheduledAt
            };
        } catch (e) {
            return null;
        }
    };

    const getQuickDatePresets = () => {
        const presets: { label: string; dateStr: string }[] = [];
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        presets.push({ label: 'Hoy', dateStr: today.toISOString().split('T')[0] });
        presets.push({ label: 'Mañana', dateStr: tomorrow.toISOString().split('T')[0] });

        // Next Saturday and Sunday
        const dayOfWeek = today.getDay(); // 0 is Sun, 6 is Sat
        const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
        const nextSat = new Date(today);
        nextSat.setDate(today.getDate() + daysUntilSat);
        presets.push({ label: 'Sábado', dateStr: nextSat.toISOString().split('T')[0] });

        const daysUntilSun = (0 - dayOfWeek + 7) % 7 || 7;
        const nextSun = new Date(today);
        nextSun.setDate(today.getDate() + daysUntilSun);
        presets.push({ label: 'Domingo', dateStr: nextSun.toISOString().split('T')[0] });

        return presets;
    };

    const courtOptions = React.useMemo(() => {
        const total = Math.max(2, (tournament?.institutions as any)?.courts_total || 4);
        const list = Array.from({ length: total }, (_, i) => `Cancha ${i + 1}`);
        if (!list.includes('Cancha Central')) list.push('Cancha Central');
        return list;
    }, [tournament]);

    const formatFullDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const [y, m, d] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
            const dayNum = dateObj.getDate();
            const monthName = dateObj.toLocaleDateString('es-AR', { month: 'long' });
            const yearNum = dateObj.getFullYear();
            return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum} de ${monthName}, ${yearNum}`;
        } catch (e) {
            return dateStr;
        }
    };

    const openCalendarPicker = (initialDateStr?: string) => {
        if (initialDateStr) {
            const [y, m] = initialDateStr.split('-').map(Number);
            if (!isNaN(y) && !isNaN(m)) {
                setCalendarViewMonth(new Date(y, m - 1, 1));
            } else {
                setCalendarViewMonth(new Date());
            }
        } else {
            setCalendarViewMonth(new Date());
        }
        setShowCalendarModal(true);
    };

    const handlePrevMonth = () => {
        setCalendarViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleSelectCalendarDate = (dateStr: string) => {
        setScheduleDate(dateStr);
        setShowCalendarModal(false);
        soundEffects.playScoreBeep();
    };

    const renderCalendarGrid = () => {
        const year = calendarViewMonth.getFullYear();
        const month = calendarViewMonth.getMonth(); // 0-indexed
        
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // 0 is Sunday in JS, so convert to Monday = 0, Sunday = 6
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
        const prevMonthDays = new Date(year, month, 0).getDate();
        
        const cells: {
            dayNum: number;
            dateStr: string;
            isCurrentMonth: boolean;
            isToday: boolean;
            isSelected: boolean;
            isTournamentDay: boolean;
            isWeekend: boolean;
        }[] = [];

        const todayStr = new Date().toISOString().split('T')[0];
        const tStart = tournament?.start_date;
        const tEnd = tournament?.end_date || tournament?.start_date;

        // Previous month filler days
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayOfWeek = (startDayIndex - 1 - i + 7) % 7;
            cells.push({
                dayNum,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                isSelected: dateStr === scheduleDate,
                isTournamentDay: !!(tStart && tEnd && dateStr >= tStart && dateStr <= tEnd),
                isWeekend: dayOfWeek === 5 || dayOfWeek === 6
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
            cells.push({
                dayNum: day,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                isSelected: dateStr === scheduleDate,
                isTournamentDay: !!(tStart && tEnd && dateStr >= tStart && dateStr <= tEnd),
                isWeekend
            });
        }

        // Next month trailing days to complete full weeks
        const remainingCells = (7 - (cells.length % 7)) % 7;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = new Date(nextYear, nextMonth, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            cells.push({
                dayNum: day,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                isSelected: dateStr === scheduleDate,
                isTournamentDay: !!(tStart && tEnd && dateStr >= tStart && dateStr <= tEnd),
                isWeekend
            });
        }

        return cells;
    };

    const openScheduleModal = (m: Match) => {
        setSelectedMatchForSchedule(m);
        setOverrideConflict(false);

        let initialDate = '';
        let initialTime = '';
        const scheduledAt = m.scheduled_at || m.proposal_data?.scheduled_at;
        if (scheduledAt) {
            try {
                const d = new Date(scheduledAt);
                if (!isNaN(d.getTime())) {
                    initialDate = d.toISOString().split('T')[0];
                    const hours = String(d.getHours()).padStart(2, '0');
                    const mins = String(d.getMinutes()).padStart(2, '0');
                    initialTime = `${hours}:${mins}`;
                }
            } catch (e) {}
        }

        if (!initialDate && tournament?.start_date) {
            initialDate = tournament.start_date;
        }

        setScheduleDate(initialDate || new Date().toISOString().split('T')[0]);
        setScheduleTime(initialTime || '16:00');

        const currentCourt = m.court_name || m.proposal_data?.court_name || m.court_slot_id || 'Cancha 1';
        setScheduleCourt(currentCourt);
        setIsCustomCourt(false);
        setCustomCourtName('');
    };

    // Calculate current target court and real-time conflicts
    const currentTargetCourt = (isCustomCourt ? customCourtName.trim() : scheduleCourt.trim()) || 'Cancha 1';
    const [targetH, targetM] = (scheduleTime || '16:00').split(':').map(Number);
    const targetStartMin = (targetH || 0) * 60 + (targetM || 0);
    const targetEndMin = targetStartMin + 90; // 90 min match slot

    const conflictBooking = dayBookingsForSchedule.find(b => {
        if (b.status === 'cancelled') return false;
        if (selectedMatchForSchedule && b.match_id === selectedMatchForSchedule.id) return false;
        if (b.court_name.trim().toLowerCase() !== currentTargetCourt.toLowerCase()) return false;

        const [bsh, bsm] = (b.start_time || '00:00').split(':').map(Number);
        const [beh, bem] = (b.end_time || '00:00').split(':').map(Number);
        const bStartMin = (bsh || 0) * 60 + (bsm || 0);
        const bEndMin = (beh || 0) * 60 + (bem || 0);

        return (targetStartMin < bEndMin && bStartMin < targetEndMin);
    });

    const availableCourtsAtThisTime = courtOptions.filter(court => {
        if (court.toLowerCase() === currentTargetCourt.toLowerCase()) return false;
        const hasConflict = dayBookingsForSchedule.some(b => {
            if (b.status === 'cancelled') return false;
            if (selectedMatchForSchedule && b.match_id === selectedMatchForSchedule.id) return false;
            if (b.court_name.trim().toLowerCase() !== court.toLowerCase()) return false;

            const [bsh, bsm] = (b.start_time || '00:00').split(':').map(Number);
            const [beh, bem] = (b.end_time || '00:00').split(':').map(Number);
            const bStartMin = (bsh || 0) * 60 + (bsm || 0);
            const bEndMin = (beh || 0) * 60 + (bem || 0);

            return (targetStartMin < bEndMin && bStartMin < targetEndMin);
        });
        return !hasConflict;
    });

    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatchForSchedule) return;

        if (!scheduleDate) {
            addToast("Por favor selecciona una fecha para el partido.", 'error');
            return;
        }
        if (!scheduleTime) {
            addToast("Por favor selecciona un horario para el partido.", 'error');
            return;
        }

        const courtFinal = currentTargetCourt;

        if (conflictBooking && !overrideConflict) {
            addToast(`⚠️ La ${courtFinal} ya tiene una reserva en ese horario (${conflictBooking.start_time} - ${conflictBooking.end_time} hs). Elige otra cancha o tilda "Priorizar torneo".`, 'error');
            return;
        }

        setSavingSchedule(true);
        try {
            const [year, month, day] = scheduleDate.split('-').map(Number);
            const [hours, minutes] = scheduleTime.split(':').map(Number);
            const scheduledDateObj = new Date(year, month - 1, day, hours, minutes);
            const scheduledIso = scheduledDateObj.toISOString();

            const p1Display = selectedMatchForSchedule.team1_name || formatPlayerName(selectedMatchForSchedule.player1_name) || 'Jugador 1';
            const p2Display = selectedMatchForSchedule.team2_name || formatPlayerName(selectedMatchForSchedule.player2_name) || 'Jugador 2';

            await api.matches.updateSchedule(selectedMatchForSchedule.id, {
                scheduled_at: scheduledIso,
                court_name: courtFinal,
                court_slot_id: courtFinal,
                institution_id: tournament?.institution_id,
                tournament_name: tournament?.name,
                player1_name: p1Display,
                player2_name: p2Display,
                player1_id: selectedMatchForSchedule.player1_id,
                player2_id: selectedMatchForSchedule.player2_id,
                override_conflict_booking_id: (overrideConflict && conflictBooking) ? conflictBooking.id : undefined
            });

            soundEffects.playScoreBeep();
            addToast(`¡Partido programado y bloqueado en el calendario de reservas para el ${scheduledDateObj.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} a las ${scheduleTime} hs en ${courtFinal}!`, 'success');
            setSelectedMatchForSchedule(null);
            loadTournament();
        } catch (err: any) {
            console.error("Error al agendar partido:", err);
            addToast("Error al guardar programación: " + (err.message || 'Error del servidor'), 'error');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleClearSchedule = async () => {
        if (!selectedMatchForSchedule) return;
        if (!confirm("¿Estás seguro de desprogramar este partido? Volverá al estado sin fecha ni horario asignado y se liberará la cancha en el club.")) return;

        setSavingSchedule(true);
        try {
            await api.matches.updateSchedule(selectedMatchForSchedule.id, {
                scheduled_at: null,
                court_name: null,
                court_slot_id: null,
                institution_id: tournament?.institution_id
            });
            addToast("Programación del partido eliminada y cancha liberada.", 'info');
            setSelectedMatchForSchedule(null);
            loadTournament();
        } catch (err: any) {
            console.error("Error al desprogramar:", err);
            addToast("Error al desprogramar: " + (err.message || 'Error del servidor'), 'error');
        } finally {
            setSavingSchedule(false);
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
                                    const message = encodeURIComponent(`🎾 ¡Te invito a participar en el torneo "${tournament.name}" en ${tournament.institutions?.name || 'nuestro club'}! Regístrate o inscríbete directamente aquí: ${shareUrl}`);
                                    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                                }}
                                className="px-4 py-3 bg-green-600/30 hover:bg-green-600/50 text-green-300 font-semibold rounded-xl transition-all border border-green-500/30 flex items-center gap-2 text-sm"
                                title="Compartir por WhatsApp"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>

                            {tournament.type === 'doubles' && !isEnrolled && !isRegClosed && (
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
                                                            const scheduledInfo = formatScheduledInfo(m.scheduled_at, m.court_name);

                                                            return (
                                                                <div 
                                                                    key={m.id} 
                                                                    className={`bg-slate-950/60 p-3 rounded-xl border transition-all flex flex-col gap-2 text-xs ${
                                                                        isUserInMatch && scheduledInfo && !m.is_played
                                                                            ? 'border-blue-500/40 bg-blue-950/20 shadow-md shadow-blue-950/40'
                                                                            : 'border-white/5'
                                                                    }`}
                                                                >
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
                                                                        <div className="flex items-center gap-1.5 shrink-0">
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

                                                                            {/* Schedule Button for Admin (Solo si el partido NO fue jugado aún) */}
                                                                            {isClubAdmin && !m.is_played && !m.winner_id && (
                                                                                <button
                                                                                    onClick={() => openScheduleModal(m)}
                                                                                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                                                                                        scheduledInfo
                                                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                                            : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                                    }`}
                                                                                    title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                                                >
                                                                                    <Calendar size={12} className={scheduledInfo ? "text-blue-400" : ""} />
                                                                                    <span className="hidden sm:inline">{scheduledInfo ? "Horario" : "Programar"}</span>
                                                                                </button>
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

                                                                    {/* Scheduled Info Badge (Solo si está pendiente por jugar) */}
                                                                    {scheduledInfo && !m.is_played && !m.winner_id && (
                                                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                                                                            <span className="flex items-center gap-1">
                                                                                <Calendar size={11} className="text-blue-400" /> {scheduledInfo.dateStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-mono">
                                                                                <Clock size={11} className="text-blue-400" /> {scheduledInfo.timeStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-bold text-blue-200">
                                                                                <MapPin size={11} className="text-green-400" /> {scheduledInfo.courtStr}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Player Highlight & WhatsApp Coordination Banner */}
                                                                    {isUserInMatch && scheduledInfo && !m.is_played && (
                                                                        <div className="p-2 bg-gradient-to-r from-blue-500/20 via-primary/10 to-transparent border border-blue-500/30 rounded-xl flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-1.5 text-[11px] text-blue-200 truncate">
                                                                                <Clock size={12} className="text-blue-400 shrink-0" />
                                                                                <span className="truncate"><strong>Tu partido:</strong> {scheduledInfo.fullLabel}</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    soundEffects.playScoreBeep();
                                                                                    const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr} (${tournament.institutions?.name || 'el club'}). ¿Confirmás disponibilidad?`);
                                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                                }}
                                                                                className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                                                                                title="Coordinar por WhatsApp con rival"
                                                                            >
                                                                                <MessageCircle size={11} /> Coordinar
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Submitter info for played matches */}
                                                                    {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name || m.played_at) && (
                                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1.5 px-0.5">
                                                                            <span className="truncate">
                                                                                Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name || 'Participante'}</strong>
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-500 shrink-0 ml-2">
                                                                                {m.score_submitted_at || m.score?.submitted_at || m.played_at 
                                                                                    ? new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs (' + new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ')'
                                                                                    : ''}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Rival Score Confirmation Banner */}
                                                                    {isOpponentPending && (
                                                                        <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2">
                                                                            <span className="text-[11px] text-amber-300 font-medium">
                                                                                ¿Confirmas este marcador cargado por {m.score_submitted_by_name || m.score?.submitted_by_name || 'tu rival'}?
                                                                            </span>
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
                                                            const scheduledInfo = formatScheduledInfo(m.scheduled_at, m.court_name);

                                                            return (
                                                                <div 
                                                                    key={m.id} 
                                                                    className={`relative bg-slate-900/90 border rounded-2xl p-3.5 shadow-lg transition-all space-y-2.5 ${
                                                                        isFinished 
                                                                            ? 'border-primary/40' 
                                                                            : isUserInMatch && scheduledInfo 
                                                                            ? 'border-blue-500/40 bg-blue-950/20' 
                                                                            : 'border-white/10 hover:border-white/20'
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

                                                                    {/* Scheduled Info Badge (Solo si está pendiente por jugar) */}
                                                                    {scheduledInfo && !m.is_played && !m.winner_id && (
                                                                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                                                                            <span className="flex items-center gap-1">
                                                                                <Calendar size={10} className="text-blue-400" /> {scheduledInfo.dateStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-mono">
                                                                                <Clock size={10} className="text-blue-400" /> {scheduledInfo.timeStr}
                                                                            </span>
                                                                            <span className="text-blue-400/60">•</span>
                                                                            <span className="flex items-center gap-1 font-bold text-blue-200">
                                                                                <MapPin size={10} className="text-green-400" /> {scheduledInfo.courtStr}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Player Highlight & WhatsApp Coordination Banner */}
                                                                    {isUserInMatch && scheduledInfo && !m.is_played && !m.winner_id && (
                                                                        <div className="p-1.5 bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center justify-between gap-1.5 text-[10px]">
                                                                            <span className="text-blue-200 truncate"><strong>Tu partido:</strong> {scheduledInfo.timeStr} ({scheduledInfo.courtStr})</span>
                                                                            <button
                                                                                onClick={() => {
                                                                                    soundEffects.playScoreBeep();
                                                                                    const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" (${m.round || 'Playoffs'}) está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr}. ¿Confirmás?`);
                                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                                }}
                                                                                className="px-1.5 py-0.5 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded text-[9px] font-bold shrink-0 flex items-center gap-0.5"
                                                                                title="Coordinar por WhatsApp"
                                                                            >
                                                                                <MessageCircle size={10} /> Avisar
                                                                            </button>
                                                                        </div>
                                                                    )}

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

                                                                        <div className="flex items-center gap-1">
                                                                            {/* Schedule Button for Admin (Solo si el partido NO fue jugado aún) */}
                                                                            {isClubAdmin && !m.is_played && !m.winner_id && (
                                                                                <button
                                                                                    onClick={() => openScheduleModal(m)}
                                                                                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                                                                                        scheduledInfo
                                                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                                            : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                                    }`}
                                                                                    title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                                                >
                                                                                    <Calendar size={11} className={scheduledInfo ? "text-blue-400" : ""} />
                                                                                    <span className="hidden sm:inline">{scheduledInfo ? "Horario" : "Programar"}</span>
                                                                                </button>
                                                                            )}

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
                                                                    </div>

                                                                    {/* Submitter info */}
                                                                    {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name) && (
                                                                        <div className="text-[9px] text-slate-400 border-t border-white/5 pt-1 truncate">
                                                                            Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name}</strong>
                                                                        </div>
                                                                    )}

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
                                            const scheduledInfo = formatScheduledInfo(m.scheduled_at, m.court_name);

                                            return (
                                                <div 
                                                    key={m.id} 
                                                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                                                        isUserInMatch && scheduledInfo && !m.is_played
                                                            ? 'bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-950/30'
                                                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/10'
                                                    }`}
                                                >
                                                    <div className="space-y-2 flex-1 min-w-0 w-full sm:w-auto">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-white/5 px-2 py-0.5 rounded">
                                                                {m.round} {m.group_number ? `(Grupo ${m.group_number})` : ''}
                                                            </span>
                                                            {isUserInMatch && (
                                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                                                                    Tu Partido
                                                                </span>
                                                            )}
                                                            {scheduledInfo && !m.is_played && !m.winner_id && (
                                                                <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                                                    <Calendar size={11} className="text-blue-400" />
                                                                    <span>{scheduledInfo.dateStr}</span>
                                                                    <span className="text-blue-400/60">•</span>
                                                                    <Clock size={11} className="text-blue-400" />
                                                                    <span>{scheduledInfo.timeStr}</span>
                                                                    <span className="text-blue-400/60">•</span>
                                                                    <MapPin size={11} className="text-green-400" />
                                                                    <span className="text-white font-bold">{scheduledInfo.courtStr}</span>
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

                                                        {/* Player Highlight & WhatsApp Coordination Banner */}
                                                        {isUserInMatch && scheduledInfo && !m.is_played && !m.winner_id && (
                                                            <div className="p-2 bg-gradient-to-r from-blue-500/20 via-primary/10 to-transparent border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 mt-1">
                                                                <div className="flex items-center gap-1.5 text-xs text-blue-200 truncate">
                                                                    <Clock size={12} className="text-blue-400 shrink-0" />
                                                                    <span className="truncate"><strong>Tu partido:</strong> {scheduledInfo.fullLabel}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        soundEffects.playScoreBeep();
                                                                        const opponentName = m.player1_id === user.id ? p2DisplayName : p1DisplayName;
                                                                        const msg = encodeURIComponent(`🎾 ¡Hola ${opponentName}! Nuestro partido de "${tournament.name}" está programado para el ${scheduledInfo.dateStr} a las ${scheduledInfo.timeStr} en ${scheduledInfo.courtStr} (${tournament.institutions?.name || 'el club'}). ¿Confirmás?`);
                                                                        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                    }}
                                                                    className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-sm"
                                                                    title="Coordinar por WhatsApp"
                                                                >
                                                                    <MessageCircle size={11} /> Coordinar
                                                                </button>
                                                            </div>
                                                        )}

                                                        {m.is_played && (m.score_submitted_by_name || m.score?.submitted_by_name || m.played_at) && (
                                                            <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                                                                <span>Cargado por: <strong className="text-slate-300">{m.score_submitted_by_name || m.score?.submitted_by_name || 'Participante'}</strong></span>
                                                                {(m.score_submitted_at || m.score?.submitted_at || m.played_at) && (
                                                                    <span className="text-slate-500">
                                                                        • {new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs ({new Date(m.score_submitted_at || m.score?.submitted_at || m.played_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 shrink-0">
                                                        {m.player1_id && m.player2_id && (
                                                            <button
                                                                onClick={() => setH2hPlayers({ p1Id: m.player1_id, p2Id: m.player2_id })}
                                                                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 text-muted hover:text-primary transition-all border border-white/10 text-xs font-bold flex items-center gap-1"
                                                                title="Ver Historial Cara a Cara"
                                                            >
                                                                <Swords size={14} /> H2H
                                                            </button>
                                                        )}

                                                        {/* Schedule Button for Admin (Solo si el partido NO fue jugado aún) */}
                                                        {isClubAdmin && !m.is_played && !m.winner_id && (
                                                            <button
                                                                onClick={() => openScheduleModal(m)}
                                                                className={`px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                                                                    scheduledInfo
                                                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                                                        : 'bg-white/5 hover:bg-primary/20 text-muted hover:text-primary border-white/10'
                                                                }`}
                                                                title={scheduledInfo ? `Modificar horario (${scheduledInfo.fullLabel})` : "Programar fecha, horario y cancha"}
                                                            >
                                                                <Calendar size={14} className={scheduledInfo ? "text-blue-400" : ""} />
                                                                <span>{scheduledInfo ? "Horario" : "Programar"}</span>
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
                                                    <div className="flex items-center gap-1.5 ml-1">
                                                        <button
                                                            onClick={() => handleOpenReplaceModal(p)}
                                                            className="p-1.5 bg-primary/15 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                                                            title="Sustituir / Reemplazar jugador en el torneo"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>

                                                        {matches.length === 0 && (
                                                            <button
                                                                onClick={() => handleUnenrollPlayer(p)}
                                                                disabled={deletingPlayerId === p.id}
                                                                className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center justify-center shadow-sm"
                                                                title="Dar de baja / Quitar inscripto"
                                                            >
                                                                {deletingPlayerId === p.id ? (
                                                                    <Loader2 size={14} className="animate-spin text-red-400" />
                                                                ) : (
                                                                    <Trash2 size={14} />
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

                                    {/* Gender filter toggle indicator */}
                                    <div className="flex items-center justify-between text-[11px] px-1">
                                        <span className="text-muted flex items-center gap-1">
                                            Rama torneo: <strong className="text-primary font-bold">{tournament?.gender || 'Caballeros'}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setFilterByGender(!filterByGender)}
                                            className="text-primary hover:underline font-semibold"
                                        >
                                            {filterByGender ? 'Ver todos los socios' : 'Filtrar por rama'}
                                        </button>
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
                                                    if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
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
                                                    const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';

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
                                                                <div className="font-bold truncate flex items-center gap-1.5">
                                                                    {formatPlayerName(p.name, p.lastname)}
                                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                                        {isFemale ? 'Damas' : 'Caballeros'}
                                                                    </span>
                                                                </div>
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
                                        placeholder="0"
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                        value={scoreP1Set1}
                                        onChange={e => setScoreP1Set1(e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value))))}
                                        required
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        placeholder="0"
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                        value={scoreP2Set1}
                                        onChange={e => setScoreP2Set1(e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value))))}
                                        required
                                    />
                                </div>

                                {/* Set 2 */}
                                <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white">Set 2</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        placeholder="0"
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                        value={scoreP1Set2}
                                        onChange={e => setScoreP1Set2(e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value))))}
                                        required
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={7}
                                        placeholder="0"
                                        className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                        value={scoreP2Set2}
                                        onChange={e => setScoreP2Set2(e.target.value === '' ? '' : Math.min(7, Math.max(0, Number(e.target.value))))}
                                        required
                                    />
                                </div>

                                {/* Set 3 / Super Tiebreak */}
                                {hasSet3 ? (
                                    <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5 animate-fade-up">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">Set 3 / STB</span>
                                            <button 
                                                type="button" 
                                                onClick={() => { setHasSet3(false); setScoreP1Set3(''); setScoreP2Set3(''); }} 
                                                className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                            >
                                                Quitar
                                            </button>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={30}
                                            placeholder="0"
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                            value={scoreP1Set3}
                                            onChange={e => setScoreP1Set3(e.target.value === '' ? '' : Math.min(30, Math.max(0, Number(e.target.value))))}
                                            required={hasSet3}
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={30}
                                            placeholder="0"
                                            className="bg-sidebar border border-white/10 rounded-lg p-2 text-center text-white font-bold placeholder-slate-600 focus:border-primary outline-none"
                                            value={scoreP2Set3}
                                            onChange={e => setScoreP2Set3(e.target.value === '' ? '' : Math.min(30, Math.max(0, Number(e.target.value))))}
                                            required={hasSet3}
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

                            <div className="pt-4 flex items-center justify-between gap-2 border-t border-white/10">
                                {isClubAdmin && selectedMatchForScore.is_played ? (
                                    <button
                                        type="button"
                                        disabled={savingScore}
                                        onClick={handleResetScore}
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
                                        onClick={() => setSelectedMatchForScore(null)}
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
                                        {selectedMatchForScore.is_played ? 'Actualizar Marcador' : 'Guardar Marcador'}
                                    </button>
                                </div>
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
                                                            if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
                                                            const query = searchUserReplaceQuery.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                                                        })
                                                        .slice(0, 15)
                                                        .map(p => {
                                                            const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';
                                                            return (
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
                                                                    <div className="truncate flex items-center gap-1.5">
                                                                        <span>{formatPlayerName(p.name, p.lastname)}</span>
                                                                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                            {isFemale ? 'Damas' : 'Caballeros'}
                                                                        </span>
                                                                    </div>
                                                                    {selectedUserForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
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
                                                            if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
                                                            const query = searchPartnerReplaceQuery.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return `${p.name} ${p.lastname || ''}`.toLowerCase().includes(query) || (p.dni && p.dni.includes(query));
                                                        })
                                                        .slice(0, 15)
                                                        .map(p => {
                                                            const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';
                                                            return (
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
                                                                    <div className="truncate flex items-center gap-1.5">
                                                                        <span>{formatPlayerName(p.name, p.lastname)}</span>
                                                                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                            {isFemale ? 'Damas' : 'Caballeros'}
                                                                        </span>
                                                                    </div>
                                                                    {selectedPartnerForReplace?.id === p.id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
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
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-muted font-bold uppercase block">Buscar Nuevo Jugador (Socio)</label>
                                        <button
                                            type="button"
                                            onClick={() => setFilterByGender(!filterByGender)}
                                            className="text-[11px] text-primary hover:underline font-semibold"
                                        >
                                            {filterByGender ? 'Ver todos' : `Filtrar (${tournament?.gender || 'Rama'})`}
                                        </button>
                                    </div>
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
                                                    if (!matchTournamentGender(p.gender, tournament?.gender)) return false;
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
                                                    const isFemale = (p.gender || 'masculino').toLowerCase().includes('fem') || p.gender === 'F';

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
                                                                <div className="font-bold truncate flex items-center gap-1.5">
                                                                    {formatPlayerName(p.name, p.lastname)}
                                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                                        {isFemale ? 'Damas' : 'Caballeros'}
                                                                    </span>
                                                                </div>
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

            {/* SCHEDULE MATCH MODAL (Organizador) */}
            {selectedMatchForSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Programar Partido</h3>
                                    <p className="text-xs text-muted">Asignar fecha, horario y cancha oficial</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedMatchForSchedule(null)} 
                                className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                            {/* Match Summary Card */}
                            <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                    <span>{selectedMatchForSchedule.round} {selectedMatchForSchedule.group_number ? `• Grupo ${selectedMatchForSchedule.group_number}` : ''}</span>
                                    <span className="text-primary font-bold">{tournament.category} • {tournament.gender || 'Caballeros'}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-white flex items-center justify-between">
                                        <span className="truncate">{selectedMatchForSchedule.team1_name || formatPlayerName(selectedMatchForSchedule.player1_name) || 'Jugador 1'}</span>
                                        <span className="text-[10px] text-muted">vs</span>
                                    </div>
                                    <div className="text-xs font-bold text-white flex items-center justify-between">
                                        <span className="truncate">{selectedMatchForSchedule.team2_name || formatPlayerName(selectedMatchForSchedule.player2_name) || 'Jugador 2'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Date Field & Quick Buttons */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar size={13} className="text-primary" /> Fecha del Partido *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => openCalendarPicker(scheduleDate)}
                                        className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                                    >
                                        <Calendar size={12} /> Abrir Calendario
                                    </button>
                                </div>

                                {/* Main Interactive Date Display & Picker Trigger */}
                                <button
                                    type="button"
                                    onClick={() => openCalendarPicker(scheduleDate)}
                                    className="w-full bg-sidebar hover:bg-slate-900/90 border border-white/10 hover:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-bold flex items-center justify-between transition-all group shadow-inner text-left"
                                    title="Haz clic para abrir el selector de calendario"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                            <Calendar size={15} />
                                        </div>
                                        <span className="truncate">{scheduleDate ? formatFullDateDisplay(scheduleDate) : 'Seleccionar fecha en calendario...'}</span>
                                    </div>
                                    <span className="text-[11px] text-primary font-bold flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                                        Elegir día <ChevronRight size={14} />
                                    </span>
                                </button>

                                {/* Quick Date Presets */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {getQuickDatePresets().map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setScheduleDate(preset.dateStr)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                scheduleDate === preset.dateStr
                                                    ? 'bg-primary/20 border-primary text-white shadow-sm'
                                                    : 'bg-white/5 border-white/10 text-muted hover:text-white'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => openCalendarPicker(scheduleDate)}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1 ml-auto"
                                    >
                                        <Calendar size={11} /> Ver Calendario Completo
                                    </button>
                                </div>
                            </div>

                            {/* Time Field & Quick Slots */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={13} className="text-blue-400" /> Horario de Inicio *
                                </label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-primary outline-none"
                                    required
                                />
                                {/* Quick Time Chips */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setScheduleTime(t)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                                                scheduleTime === t
                                                    ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                                                    : 'bg-white/5 border-white/10 text-muted hover:text-white'
                                            }`}
                                        >
                                            {t} hs
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Court Selection */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin size={13} className="text-green-400" /> Cancha Asignada *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomCourt(!isCustomCourt)}
                                        className="text-[10px] text-primary hover:underline font-semibold"
                                    >
                                        {isCustomCourt ? 'Elegir de lista' : 'Ingresar otra'}
                                    </button>
                                </div>

                                {isCustomCourt ? (
                                    <input
                                        type="text"
                                        placeholder="Ej: Cancha Central, Cancha 1 (Ladrillo)..."
                                        value={customCourtName}
                                        onChange={e => setCustomCourtName(e.target.value)}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary outline-none"
                                        required
                                    />
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {courtOptions.map(court => (
                                            <button
                                                key={court}
                                                type="button"
                                                onClick={() => setScheduleCourt(court)}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                                                    scheduleCourt === court
                                                        ? 'bg-green-500/20 border-green-400 text-green-300 shadow-sm'
                                                        : 'bg-white/5 border-white/10 text-muted hover:text-white'
                                                }`}
                                            >
                                                {court}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Real-time Conflict Alert & Available Court Suggestions */}
                            {conflictBooking && (
                                <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl space-y-2.5 text-amber-200 animate-in fade-in">
                                    <div className="flex items-start gap-2.5">
                                        <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                                            <AlertTriangle size={16} />
                                        </div>
                                        <div className="text-xs space-y-0.5 flex-1 min-w-0">
                                            <div className="font-bold text-amber-300 flex items-center justify-between gap-1">
                                                <span>¡Cancha Ocupada en ese horario!</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-mono font-bold">
                                                    {conflictBooking.start_time} - {conflictBooking.end_time} hs
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-amber-200/90 leading-tight">
                                                {conflictBooking.booking_type === 'tournament' ? (
                                                    <>Ya hay otro partido de torneo: <strong>{conflictBooking.title}</strong></>
                                                ) : conflictBooking.booking_type === 'class' ? (
                                                    <>Hay una clase programada: <strong>{conflictBooking.title || 'Clase / Escuela'}</strong></>
                                                ) : (
                                                    <>Reserva previa de socio: <strong>{conflictBooking.title || conflictBooking.user_name || 'Reserva de Cancha'}</strong></>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Free court suggestions at the same hour */}
                                    {availableCourtsAtThisTime.length > 0 && (
                                        <div className="pt-1.5 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="text-amber-300 font-bold text-[10px] uppercase">Canchas libres:</span>
                                            {availableCourtsAtThisTime.map(court => (
                                                <button
                                                    key={court}
                                                    type="button"
                                                    onClick={() => {
                                                        setScheduleCourt(court);
                                                        setIsCustomCourt(false);
                                                    }}
                                                    className="px-2 py-0.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                                    title={`Mover partido a ${court} que está libre`}
                                                >
                                                    <Check size={11} /> Elegir {court}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Override option */}
                                    <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
                                        <label className="flex items-center gap-2 cursor-pointer text-amber-200 hover:text-white transition-colors select-none">
                                            <input
                                                type="checkbox"
                                                checked={overrideConflict}
                                                onChange={e => setOverrideConflict(e.target.checked)}
                                                className="w-4 h-4 rounded bg-slate-900 border-amber-500/40 text-primary focus:ring-primary"
                                            />
                                            <span className="font-semibold text-xs">Priorizar torneo (reemplazar turno en el club)</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Court is free confirmation */}
                            {!conflictBooking && !loadingDayBookings && scheduleTime && scheduleDate && (
                                <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-xs text-green-300 font-semibold">
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 size={13} className="text-green-400" />
                                        <span>{currentTargetCourt} disponible ({scheduleTime} a {(() => {
                                            const [h, m] = scheduleTime.split(':').map(Number);
                                            const endTot = (h || 0) * 60 + (m || 0) + 90;
                                            return `${String(Math.floor(endTot / 60) % 24).padStart(2, '0')}:${String(endTot % 60).padStart(2, '0')}`;
                                        })()} hs)</span>
                                    </span>
                                    <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">Se bloqueará en reservas</span>
                                </div>
                            )}

                            {/* Live Summary Banner */}
                            {scheduleDate && scheduleTime && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-blue-200 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                                    <span>
                                        Programado para el <strong>{new Date(scheduleDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> a las <strong>{scheduleTime} hs</strong> en <strong>{isCustomCourt ? (customCourtName || 'Cancha') : scheduleCourt}</strong>.
                                    </span>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                                {(selectedMatchForSchedule.scheduled_at || selectedMatchForSchedule.court_name) ? (
                                    <button
                                        type="button"
                                        onClick={handleClearSchedule}
                                        disabled={savingSchedule}
                                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1.5"
                                        title="Quitar fecha y horario asignado"
                                    >
                                        <Trash2 size={13} /> Desprogramar
                                    </button>
                                ) : (
                                    <div></div>
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMatchForSchedule(null)}
                                        className="px-4 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingSchedule}
                                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-primary hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                                    >
                                        {savingSchedule ? (
                                            <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                                        ) : (
                                            <><Save size={14} /> Guardar Horario</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INTERACTIVE CALENDAR DATE PICKER MODAL */}
            {showCalendarModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/15 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col p-5 space-y-4">
                        {/* Header: Month & Year Navigator */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                title="Mes anterior"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="text-center">
                                <h4 className="text-base font-black text-white capitalize tracking-tight">
                                    {calendarViewMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                                </h4>
                                <span className="text-[10px] text-muted uppercase font-bold">Seleccionar Día del Partido</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                title="Mes siguiente"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Quick Jump Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    setCalendarViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                                    handleSelectCalendarDate(today.toISOString().split('T')[0]);
                                }}
                                className="px-2.5 py-1 bg-white/5 hover:bg-primary/20 text-muted hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all"
                            >
                                Ir a Hoy
                            </button>

                            {tournament?.start_date && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const [y, m] = tournament.start_date.split('-').map(Number);
                                        setCalendarViewMonth(new Date(y, m - 1, 1));
                                        handleSelectCalendarDate(tournament.start_date);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all"
                                >
                                    🏆 Inicio Torneo ({tournament.start_date.split('-').slice(1).reverse().join('/')})
                                </button>
                            )}
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 border-b border-white/10 pb-2">
                            <span>Lu</span>
                            <span>Ma</span>
                            <span>Mi</span>
                            <span>Ju</span>
                            <span>Vi</span>
                            <span className="text-blue-400 font-bold">Sá</span>
                            <span className="text-blue-400 font-bold">Do</span>
                        </div>

                        {/* Month Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendarGrid().map((cell, idx) => {
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectCalendarDate(cell.dateStr)}
                                        className={`h-9 rounded-xl text-xs flex flex-col items-center justify-center relative transition-all ${
                                            cell.isSelected
                                                ? 'bg-gradient-to-br from-blue-600 to-primary text-white font-black ring-2 ring-primary shadow-lg scale-105 z-10'
                                                : cell.isToday
                                                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 hover:bg-primary/20'
                                                : cell.isCurrentMonth
                                                ? cell.isWeekend
                                                    ? 'bg-white/5 hover:bg-primary/20 text-slate-100 font-bold border border-white/5 hover:border-primary/40'
                                                    : 'bg-black/30 hover:bg-primary/20 text-slate-300 font-medium hover:text-white'
                                                : 'opacity-25 text-slate-500 hover:opacity-50 hover:bg-white/5'
                                        }`}
                                        title={cell.dateStr}
                                    >
                                        <span>{cell.dayNum}</span>
                                        {cell.isTournamentDay && !cell.isSelected && (
                                            <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer Info & Close */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-300 font-medium truncate">
                                {scheduleDate ? (
                                    <span>Elegido: <strong className="text-primary">{formatFullDateDisplay(scheduleDate)}</strong></span>
                                ) : (
                                    <span>Toca cualquier día para seleccionarlo</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCalendarModal(false)}
                                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SOCIAL MEDIA GRAPHIC GENERATOR MODAL */}
            {showGraphicModal && tournament && (
                <ShareGraphicModal
                    isOpen={showGraphicModal}
                    onClose={() => setShowGraphicModal(false)}
                    tournament={tournament}
                    zones={zones}
                    playoffRounds={playoffRounds}
                    championName={tournament.champion_name}
                    matches={matches}
                    currentUser={user}
                />
            )}

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
        </div>
    );
};