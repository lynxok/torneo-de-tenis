import React, { useEffect, useState, useMemo } from 'react';
import { Tournament, UserProfile, TournamentPlayer, Match, Booking, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    Trophy, Calendar, MapPin, Users, ChevronLeft, ChevronRight, UserPlus, CheckCircle2, Loader2, Play, Edit3, 
    X, Save, Layers, Award, Sparkles, Share2, MessageCircle, ArrowLeftRight, Lightbulb, Trash2, 
    Search, DollarSign, UserCheck, Shuffle, Info, Settings2, Grid, Check, TrendingUp, Wallet, Gift, Shield,
    Swords, AlertTriangle, CheckSquare, Clock, AlertCircle, RefreshCw, RotateCcw,
    Printer, Image as ImageIcon, Download, Plus, CreditCard, Copy, ExternalLink, Eye, HelpCircle,
    Receipt, Upload, CloudRain, Zap, Sun, Flame, Tv
} from 'lucide-react';
import { getCategoriesForInstitution, isUserEligibleForCategories, NUMERIC_CATEGORIES } from '../utils/categories';
import { computeRankings, normalizeCategoryKey } from '../utils/ranking';
import { getTournamentTier, calculateTournamentFinances } from '../utils/tournamentTiers';
import { formatPlayerName, formatMatchScore } from '../utils/formatters';
import { exportTournamentPlayersToCSV } from '../utils/exportHelper';
import { calculateGroupStandings, calculateUnifiedStandings, organizePlayoffRounds, getProjectedPlayoffRounds, buildPlayoffTreeFromZones, GroupZone, GroupStandingRow, UnifiedStandingRow, PlayoffRound, ProjectedRound } from '../utils/bracketHelper';
import { HeadToHeadModal } from '../components/HeadToHeadModal';
import { ShareGraphicModal } from '../components/ShareGraphicModal';
import { MatchQuickScorerModal } from '../components/MatchQuickScorerModal';
import { soundEffects } from '../services/soundEffects';
import { canEditTournament } from './Tournaments';
import { checkPlayerGenderEligibility } from '../utils/demographics';
import {
    EditTournamentModal,
    DeleteTournamentModal,
    ProjectionHelpModal,
    ManualEnrollModal,
    ReplacePlayerModal,
    EnrolledPlayersModal,
    OfficializeModal,
    RainDelayModal,
    CalendarPickerModal,
    DisputeModal,
    ReceiptViewerModal,
    PlayerEnrollModal,
    GenerateFixtureModal,
    ScheduleMatchModal,
    ScoreInputModal,
    TournamentGroupsTab,
    TournamentPlayoffsTab,
    TournamentOrderOfPlayTab,
    TournamentRegistrationPlayersList,
    TournamentAdminPanel,
    TournamentHeader,
    TournamentBanners,
    TournamentPrintSheets,
    TournamentModalsContainer
} from '../components/tournament-details';


interface TournamentDetailsProps {
    tournamentId: string;
    user: UserProfile;
    onBack: () => void;
}

const tournamentDataCache = new Map<string, Tournament>();

export const TournamentDetails: React.FC<TournamentDetailsProps> = ({ tournamentId, user, onBack }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'playoffs' | 'order_of_play'>('groups');
    const [standingsViewMode, setStandingsViewMode] = useState<'unified' | 'zones'>('unified');
    const { addToast } = useToast();

    // Edit Tournament State (Organizador & Superadmin)
    const [showEditTournamentModal, setShowEditTournamentModal] = useState(false);
    const [editTournamentForm, setEditTournamentForm] = useState<Partial<Tournament>>({
        name: '',
        start_date: '',
        type: 'singles',
        gender: 'Caballeros',
        category: '4ta',
        registration_price: 0,
        registration_closed: false,
        status: 'draft',
        competition_format: 'tabla_general_byes',
        min_guaranteed_matches: 3,
        allow_byes: true,
        qualifiers_mode: 'all'
    });
    const [isUpdatingTournament, setIsUpdatingTournament] = useState(false);

    // Social Media Graphics Generator State
    const [showGraphicModal, setShowGraphicModal] = useState(false);

    // Enrolled Players Modal State
    const [showEnrolledModal, setShowEnrolledModal] = useState(false);
    const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');

    // H2H State
    const [h2hPlayers, setH2hPlayers] = useState<{ p1Id: string; p2Id: string } | null>(null);

    // Superadmin Fee Waiver & Ranking State
    const [isTogglingWaive, setIsTogglingWaive] = useState(false);
    const [isTogglingRanking, setIsTogglingRanking] = useState(false);
    const [generatingPlayoffs, setGeneratingPlayoffs] = useState(false);

    // Delete Tournament State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeletingTournament, setIsDeletingTournament] = useState(false);

    // Swap / Edit Groups State
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [swapSource, setSwapSource] = useState<{ id: string; name: string } | null>(null);
    const [isSwapping, setIsSwapping] = useState(false);

    // Host Institution & Mercado Pago State
    const [hostInstitution, setHostInstitution] = useState<Institution | null>(null);
    const [copiedAlias, setCopiedAlias] = useState(false);

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
    const [manualAvailabilityNotes, setManualAvailabilityNotes] = useState('');
    const [submittingEnroll, setSubmittingEnroll] = useState(false);
    const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
    const [filterByGender, setFilterByGender] = useState(true);

    // Player Self-Enrollment Modal State (Availability preferences & Comprobante)
    const [showPlayerEnrollModal, setShowPlayerEnrollModal] = useState(false);
    const [playerAvailabilityNotes, setPlayerAvailabilityNotes] = useState('');
    const [enrollmentReceiptImage, setEnrollmentReceiptImage] = useState<string | null>(null);
    const [viewingReceiptModal, setViewingReceiptModal] = useState<string | null>(null);

    const handleEnrollmentReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            addToast("El comprobante debe ser menor a 10 MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
                    setEnrollmentReceiptImage(compressedDataUrl);
                    soundEffects.playScoreBeep();
                    addToast("¡Comprobante adjuntado con éxito!", "success");
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

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

    const [previewFormat, setPreviewFormat] = useState<string | null>(null);
    const [showOfficializeModal, setShowOfficializeModal] = useState(false);
    const [selectedOfficialFormat, setSelectedOfficialFormat] = useState<string>('tabla_general_byes');
    const [showProjectionHelpModal, setShowProjectionHelpModal] = useState(false);

    // Score Modal State (with 24h confirmation, tiebreaks & doubles support)
    const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
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

    // Schedule & Calendar Hook
    const {
        selectedMatchForSchedule,
        setSelectedMatchForSchedule,
        scheduleDate,
        setScheduleDate,
        scheduleTime,
        setScheduleTime,
        scheduleCourt,
        setScheduleCourt,
        isCustomCourt,
        setIsCustomCourt,
        customCourtName,
        setCustomCourtName,
        savingSchedule,
        setSavingSchedule,
        showCalendarModal,
        setShowCalendarModal,
        calendarViewMonth,
        setCalendarViewMonth,
        dayBookingsForSchedule,
        setDayBookingsForSchedule,
        loadingDayBookings,
        setLoadingDayBookings,
        overrideConflict,
        setOverrideConflict,
        scheduleOopTurn,
        setScheduleOopTurn,
        scheduleOopNote,
        setScheduleOopNote,
        formatScheduledInfo,
        getQuickDatePresets,
        getMatchDate,
        getMatchTime,
        getMatchOopStatus,
        formatFullDateDisplay,
        openCalendarPicker,
        handlePrevMonth,
        handleNextMonth,
        handleSelectCalendarDate,
        renderCalendarGrid,
        openScheduleModal,
        handleSaveSchedule,
        handleClearSchedule,
    } = useTournamentSchedule({
        tournament,
        loadTournament,
        addToast,
    });

    // Order of Play (OOP) State
    const [selectedOopDate, setSelectedOopDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [showRainDelayModal, setShowRainDelayModal] = useState(false);
    const [rainDelayMinutes, setRainDelayMinutes] = useState<number>(30);
    const [isApplyingRainDelay, setIsApplyingRainDelay] = useState(false);
    const [updatingOopMatchId, setUpdatingOopMatchId] = useState<string | null>(null);
    const [showUnscheduledDrawer, setShowUnscheduledDrawer] = useState(true);

    // Derived state
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    const filteredEnrolledPlayers = useMemo(() => {
        if (!enrolledSearchQuery.trim()) return players;
        const q = enrolledSearchQuery.toLowerCase().trim();
        return players.filter(p => {
            const name = (p.name || p.player_name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            return name.includes(q) || cat.includes(q);
        });
    }, [players, enrolledSearchQuery]);

    // Masters Eligibility: top-N players per category only
    const [allProfilesForMasters, setAllProfilesForMasters] = useState<UserProfile[]>([]);

    useEffect(() => {
        loadTournament();
    }, [tournamentId]);

    // Load all player profiles when tournament is Masters (for top-N eligibility check)
    useEffect(() => {
        if (tournament?.tier_applied === 'masters' && allProfilesForMasters.length === 0) {
            api.auth.getAllProfiles().then(profiles => setAllProfilesForMasters(profiles)).catch(() => {});
        }
    }, [tournament?.tier_applied]);

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

    const loadTournament = async (showLoadingSpinner = true) => {
        const cached = tournamentDataCache.get(tournamentId);
        if (cached && !tournament) {
            setTournament(cached);
            if (cached.tournament_players) setPlayers(cached.tournament_players);
            if (cached.matches) {
                setMatches(cached.matches);
                const hasCachedPlayoffs = cached.matches.some((m: any) => m.round !== 'Fase de Grupos' && !m.group_number);
                if (hasCachedPlayoffs) {
                    setActiveTab('playoffs');
                }
            }
            if (cached.registration_price !== undefined) setManualFee(cached.registration_price);
            if (cached.category) setGuestCategory(cached.category);
            if (cached.institutions) setHostInstitution(cached.institutions as Institution);
            setLoading(false);
            showLoadingSpinner = false;
        }

        if (showLoadingSpinner) {
            setLoading(true);
        }

        try {
            const data = await api.tournaments.getById(tournamentId);
            tournamentDataCache.set(tournamentId, data);
            setTournament(data);
            if (data.tournament_players) setPlayers(data.tournament_players);
            if (data.matches) {
                setMatches(data.matches);
                // Si el torneo ya tiene partidos de llaves/playoffs generados, abrir directamente en la pestaña de Llaves
                const hasPlayoffs = data.matches.some((m: any) => m.round !== 'Fase de Grupos' && !m.group_number);
                if (hasPlayoffs) {
                    setActiveTab('playoffs');
                }
            }
            if (data.registration_price !== undefined) {
                setManualFee(data.registration_price);
            }
            if (data.category) {
                setGuestCategory(data.category);
            }
            if (data.institution_id) {
                api.institutions.getById(data.institution_id)
                    .then(inst => setHostInstitution(inst))
                    .catch(err => {
                        console.warn("Could not load host institution details:", err);
                        if (data.institutions) setHostInstitution(data.institutions as Institution);
                    });
            } else if (data.institutions) {
                setHostInstitution(data.institutions as Institution);
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

    /**
     * Checks if a user qualifies for a Masters tournament (top-N per category).
     * Default top-N is 20 but can be overridden.
     */
    const getUserMasterEligibility = (targetUser: UserProfile, topN: number = 20) => {
        if (allProfilesForMasters.length === 0) {
            // Profiles not loaded yet — allow optimistically (server will re-validate if needed)
            return { eligible: true, rank: 0, topN };
        }
        const ranked = computeRankings(allProfilesForMasters);
        const userCat = normalizeCategoryKey(targetUser.category);
        const found = ranked.find(p => p.id === targetUser.id);
        const categoryRank = found?.category_rank ?? 9999;
        return { eligible: categoryRank <= topN, rank: categoryRank, topN };
    };

    const handleEnrollClick = async () => {
        if (!tournament) return;

        // ── Masters Eligibility Check ──────────────────────────────────────────
        if (tournament.tier_applied === 'masters') {
            const mastersTopN = 20; // top N per category allowed in Masters
            const mastersEligibility = getUserMasterEligibility(user, mastersTopN);
            if (!mastersEligibility.eligible) {
                alert(
                    `👑 El Torneo Master Final es exclusivo para los Top ${mastersEligibility.topN} jugadores de cada categoría.\n\n` +
                    `Tu posición actual en la categoría ${normalizeCategoryKey(user.category)}: #${mastersEligibility.rank}.\n\n` +
                    `Seguí compitiendo para llegar al top ${mastersEligibility.topN} y clasificarte el próximo año.`
                );
                return;
            }
        }

        // Check Gender Eligibility
        const genderElig = checkPlayerGenderEligibility(user, tournament);
        if (genderElig.isInformativeOnly) {
            alert(genderElig.reason || `🚫 Este torneo es exclusivo para la categoría ${genderElig.tournamentGenderLabel}. Estás en modo informativo.`);
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

        setPlayerAvailabilityNotes('');
        setShowPlayerEnrollModal(true);
    };

    const handleConfirmPlayerEnroll = async () => {
        if (!tournament) return;

        if (effectivePrice > 0 && !enrollmentReceiptImage) {
            addToast("⚠️ Debes adjuntar la foto o captura del comprobante para confirmar tu inscripción.", "error");
            return;
        }

        setIsEnrolling(true);
        try {
            const expiresAt = effectivePrice > 0 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined;
            await api.players.enroll(
                tournament.id, 
                user.id, 
                user.name + ' ' + (user.lastname || ''), 
                user.category || 'Open', 
                effectivePrice,
                undefined,
                undefined,
                playerAvailabilityNotes.trim() || undefined,
                enrollmentReceiptImage || undefined,
                expiresAt
            );
            soundEffects.playBookingSuccess();
            addToast("¡Inscripción registrada con éxito! El organizador verificará tu comprobante.", 'success');
            setShowPlayerEnrollModal(false);
            setEnrollmentReceiptImage(null);
            loadTournament();
        } catch (e: any) {
            addToast("Error al inscribirse: " + e.message, 'error');
        } finally {
            setIsEnrolling(false);
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
        setManualAvailabilityNotes('');

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
                partnerName,
                availabilityNotes: manualAvailabilityNotes.trim() || undefined
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



    if (loading) return <div className="text-center py-20 text-muted">Cargando detalles del torneo...</div>;
    if (!tournament) return <div className="text-center py-20 text-red-500">Torneo no encontrado.</div>;

    const isEnrolled = players.some(p => p.player_id === user.id || p.id === user.id);
    const isRegClosed = Boolean(
        tournament.registration_closed || 
        tournament.status === 'finished' ||
        (tournament.registration_deadline && new Date() > new Date(tournament.registration_deadline + 'T23:59:59'))
    );
    const isClubAdmin = user.role === 'superadmin' || (user.role === 'admin' && user.institution_id === tournament.institution_id);

    const canDeleteTournament = Boolean(
        tournament && (
            user.role === 'superadmin' ||
            (tournament.created_by && tournament.created_by === user.id) ||
            (user.role === 'admin' && user.institution_id && tournament.institution_id === user.institution_id)
        )
    );

    const handleDeleteTournament = async () => {
        if (!tournament) return;
        setIsDeletingTournament(true);
        try {
            await api.tournaments.delete(tournament.id);
            soundEffects.playScoreBeep();
            addToast(`Torneo "${tournament.name}" eliminado exitosamente.`, 'success');
            setShowDeleteModal(false);
            onBack();
        } catch (err: any) {
            console.error("Error al eliminar torneo:", err);
            addToast(err?.message ? `Error al eliminar torneo: ${err.message}` : "Error al eliminar el torneo", 'error');
        } finally {
            setIsDeletingTournament(false);
        }
    };

    const groupMatches = matches.filter(m => m.round === 'Fase de Grupos' || m.group_number);
    const playoffMatches = matches.filter(m => m.round !== 'Fase de Grupos' && !m.group_number);
    const displayedMatches = activeTab === 'groups' ? groupMatches : activeTab === 'playoffs' ? playoffMatches : matches;

    const unplayedGroupMatches = groupMatches.filter(m => !m.is_played && !m.winner_id && m.scheduling_status !== 'finished');
    const isGroupStageComplete = groupMatches.length > 0 && unplayedGroupMatches.length === 0;

    const baseCompetitionFormat = tournament?.competition_format || tournament?.rules?.competition_format || 'tabla_general_byes';
    const activeCompetitionFormat = previewFormat || baseCompetitionFormat;
    const competitionFormat = activeCompetitionFormat;
    const allowByes = tournament?.allow_byes ?? tournament?.rules?.allow_byes ?? true;
    const minGuaranteedMatches = tournament?.min_guaranteed_matches ?? tournament?.rules?.min_guaranteed_matches ?? 3;

    const zones = calculateGroupStandings(groupMatches, players);
    const unifiedStandings = calculateUnifiedStandings(zones, players);
    const playoffRounds = organizePlayoffRounds(playoffMatches);
    const projectedPlayoffRounds = getProjectedPlayoffRounds(zones, activeCompetitionFormat, allowByes, players);

    const finalMatch = playoffMatches.find(m => m.round === 'Final' || m.round === 'Gran Final');
    const championName = tournament?.champion_name || (finalMatch?.winner_id ? (
        finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player1_name : finalMatch.player2_name
    ) : null);

    const handleQuickChangeOopStatus = async (matchId: string, newStatus: 'scheduled' | 'warming_up' | 'in_progress' | 'delayed' | 'finished') => {
        setUpdatingOopMatchId(matchId);
        try {
            soundEffects.playScoreBeep();
            await api.matches.updateOopStatus(matchId, newStatus);
            setMatches(prev => prev.map(m => m.id === matchId ? { 
                ...m, 
                oop_status: newStatus,
                proposal_data: { ...m.proposal_data, oop_status: newStatus } 
            } : m));
            const statusLabel = newStatus === 'in_progress' ? 'En Juego' : newStatus === 'warming_up' ? 'Calentando' : newStatus === 'delayed' ? 'Demorado' : newStatus === 'finished' ? 'Finalizado' : 'Programado';
            addToast(`Estado del partido actualizado: ${statusLabel}`, 'success');
        } catch (err: any) {
            console.error("Error al actualizar estado OOP:", err);
            addToast("Error al actualizar estado: " + err.message, "error");
        } finally {
            setUpdatingOopMatchId(null);
        }
    };

    const handleApplyRainDelay = async () => {
        if (!tournament?.id || !selectedOopDate) return;
        setIsApplyingRainDelay(true);
        try {
            soundEffects.playTennisHit();
            const res = await api.matches.bulkDelaySchedule(tournament.id, selectedOopDate, rainDelayMinutes);
            addToast(`🌧️ Demora de ${rainDelayMinutes} min aplicada a ${res.delayedCount} partidos de la jornada`, 'success');
            setShowRainDelayModal(false);
            loadTournament();
        } catch (err: any) {
            console.error("Error al aplicar demora por clima:", err);
            addToast("Error al aplicar demora: " + err.message, "error");
        } finally {
            setIsApplyingRainDelay(false);
        }
    };

    const handleShareOopWhatsApp = () => {
        soundEffects.playScoreBeep();
        const dateParts = selectedOopDate.split('-').map(Number);
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const formattedDate = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        const clubName = tournament?.institutions?.name || 'Sede Central';

        let text = `🎾 *ORDEN DE JUEGO OFICIAL - SMASH TENIS* 🎾\n`;
        text += `🏆 *Torneo:* ${tournament?.name || 'Torneo'}\n`;
        text += `📅 *Jornada:* ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}\n`;
        text += `📍 *Sede:* ${clubName}\n\n`;

        if (oopDateMatches.length === 0) {
            text += `_No hay partidos programados para este día._\n\n`;
        } else {
            oopMatchesByCourt.forEach(({ court, matches: cMatches }) => {
                if (cMatches.length === 0) return;
                text += `🏟️ *${court.toUpperCase()}*\n`;
                cMatches.forEach((m, idx) => {
                    const time = getMatchTime(m);
                    const p1 = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                    const p2 = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                    const st = getMatchOopStatus(m);
                    const statusTag = st === 'in_progress' ? '⚡ [En Juego]' : st === 'warming_up' ? '🎾 [Calentando]' : st === 'delayed' ? '🌧️ [Demorado]' : st === 'finished' ? '✓ [Finalizado]' : '';
                    
                    text += `  • *${time}*: ${p1} vs ${p2} ${statusTag}\n`;
                    if (m.oop_note || m.proposal_data?.oop_note) {
                        text += `    ↳ _Nota: ${m.oop_note || m.proposal_data?.oop_note}_\n`;
                    }
                });
                text += `\n`;
            });
        }

        const activeSponsors = (tournament?.sponsors || []).filter(s => s.is_active);
        if (activeSponsors.length > 0) {
            text += `🤝 *Auspiciantes Oficiales:*\n`;
            text += activeSponsors.map(s => `• ${s.name} (${s.category === 'main' ? 'Sponsor Principal' : 'Auspiciante'})`).join('\n');
            text += `\n\n`;
        }

        const tournamentUrl = `${window.location.origin}/?view=tournament-detail&tournament=${tournament?.id}`;
        text += `📲 *Seguí el cuadro y resultados en vivo:*\n${tournamentUrl}`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handlePrintOop = () => {
        soundEffects.playScoreBeep();
        window.print();
    };

    const handleConfirmAllGroupMatches = async () => {
        const pending = groupMatches.filter(m => (m.score || m.is_played) && m.score_status !== 'confirmed');
        if (pending.length === 0) {
            addToast("Todos los partidos con resultado en la fase de grupos ya están validados.", "info");
            return;
        }
        if (!confirm(`¿Deseas validar y confirmar oficialmente los ${pending.length} partidos pendientes de la fase de grupos?`)) return;

        try {
            for (const pm of pending) {
                await api.matches.confirmScore(pm.id, user);
            }
            addToast(`Se validaron ${pending.length} partidos de grupos con éxito.`, "success");
            await loadTournament();
        } catch (e: any) {
            addToast("Error al validar partidos: " + e.message, "error");
        }
    };

    const handleOpenOfficializeModal = () => {
        if (!tournament || zones.length === 0) return;
        // Si el torneo tiene formato configurado lo respetamos, de lo contrario sugerimos:
        // 4 zonas o 3 zonas -> 'zonas_playoffs' (criterio tradicional sin repetición)
        // >= 5 zonas impares -> 'tabla_general_byes'
        if (activeCompetitionFormat) {
            setSelectedOfficialFormat(activeCompetitionFormat);
        } else {
            const recommended = (zones.length === 4 || zones.length === 3 || zones.length === 2) 
                ? 'zonas_playoffs' 
                : 'tabla_general_byes';
            setSelectedOfficialFormat(recommended);
        }
        setShowOfficializeModal(true);
    };

    const handleConfirmOfficialPlayoffs = async (chosenFormat: string) => {
        if (!tournament || zones.length === 0) return;

        // Auto-validar partidos de grupo que tengan marcador cargado pero sigan pendientes
        const pendingGroupMatches = groupMatches.filter(m => (m.score || m.is_played) && m.score_status !== 'confirmed');
        if (pendingGroupMatches.length > 0) {
            try {
                for (const pm of pendingGroupMatches) {
                    await api.matches.confirmScore(pm.id, user);
                }
            } catch (err) {
                console.error("Error auto-confirming pending group matches on playoff generation:", err);
            }
        }

        setGeneratingPlayoffs(true);
        setShowOfficializeModal(false);
        try {
            const seeds = buildPlayoffTreeFromZones(zones, chosenFormat, allowByes);
            await api.tournaments.generatePlayoffs(tournament.id, seeds);
            addToast("¡Cuadro de llaves oficializado y generado exitosamente!", "success");
            setActiveTab('playoffs');
            await loadTournament();
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

    const handleOpenEditTournament = () => {
        if (!tournament) return;
        const existingRules = tournament.rules || {};
        setEditTournamentForm({
            name: tournament.name || '',
            start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
            type: tournament.type || 'singles',
            gender: tournament.gender || 'Caballeros',
            category: tournament.category || '4ta',
            registration_price: tournament.registration_price || 0,
            registration_closed: !!tournament.registration_closed,
            status: tournament.status || 'draft',
            competition_format: tournament.competition_format || existingRules.competition_format || 'tabla_general_byes',
            min_guaranteed_matches: tournament.min_guaranteed_matches ?? existingRules.min_guaranteed_matches ?? 3,
            allow_byes: tournament.allow_byes ?? existingRules.allow_byes ?? true,
            qualifiers_mode: tournament.qualifiers_mode || existingRules.qualifiers_mode || 'all'
        });
        setShowEditTournamentModal(true);
    };

    const handleSaveEditTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournament) return;
        if (!editTournamentForm.start_date) {
            addToast("Por favor ingresa una fecha de inicio", 'error');
            return;
        }

        setIsUpdatingTournament(true);
        try {
            const existingRules = (typeof tournament.rules === 'object' && tournament.rules !== null) ? tournament.rules : {};
            const updatedRules = {
                ...existingRules,
                competition_format: editTournamentForm.competition_format || 'tabla_general_byes',
                min_guaranteed_matches: Number(editTournamentForm.min_guaranteed_matches) || 3,
                allow_byes: editTournamentForm.allow_byes !== false,
                qualifiers_mode: editTournamentForm.qualifiers_mode || 'all'
            };

            const updates: Partial<Tournament> = {
                name: editTournamentForm.name?.trim(),
                start_date: editTournamentForm.start_date,
                type: editTournamentForm.type,
                gender: editTournamentForm.gender,
                category: editTournamentForm.category,
                registration_price: Number(editTournamentForm.registration_price) || 0,
                registration_closed: editTournamentForm.registration_closed,
                status: editTournamentForm.status,
                competition_format: editTournamentForm.competition_format || 'tabla_general_byes',
                min_guaranteed_matches: Number(editTournamentForm.min_guaranteed_matches) || 3,
                allow_byes: editTournamentForm.allow_byes !== false,
                qualifiers_mode: editTournamentForm.qualifiers_mode || 'all',
                rules: updatedRules
            };

            await api.tournaments.update(tournament.id, updates);
            setTournament(prev => prev ? ({ ...prev, ...updates }) : null);
            addToast("¡Torneo y configuración actualizados exitosamente!", 'success');
            setShowEditTournamentModal(false);
        } catch (err: any) {
            console.error("Error al actualizar torneo:", err);
            addToast(err?.message ? `Error al actualizar torneo: ${err.message}` : "Error al actualizar torneo", 'error');
        } finally {
            setIsUpdatingTournament(false);
        }
    };

    const tierInfo = getTournamentTier(players.length);
    const finances = calculateTournamentFinances(players.length, effectivePrice, undefined, isCommissionWaived);
    const genderElig = checkPlayerGenderEligibility(user, tournament);

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <TournamentHeader
                tournament={tournament}
                players={players}
                user={user}
                onBack={onBack}
                genderElig={genderElig}
                competitionFormat={competitionFormat}
                minGuaranteedMatches={minGuaranteedMatches}
                countsForRanking={countsForRanking}
                tierInfo={tierInfo}
                isUserMember={isUserMember}
                setShowEnrolledModal={setShowEnrolledModal}
                canEditTournament={canEditTournament}
                handleOpenEditTournament={handleOpenEditTournament}
                setShowGraphicModal={setShowGraphicModal}
                addToast={addToast}
                isRegClosed={isRegClosed}
                isEnrolled={isEnrolled}
                handleEnrollClick={handleEnrollClick}
                isEnrolling={isEnrolling}
                effectivePrice={effectivePrice}
            />

            {/* Banners */}
            <TournamentBanners
                genderElig={genderElig}
                tournament={tournament}
                user={user}
                getUserMasterEligibility={getUserMasterEligibility}
                allProfilesForMasters={allProfilesForMasters}
            />

                        {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ADMIN PANEL */}
                <TournamentAdminPanel
                    isClubAdmin={isClubAdmin}
                    tournament={tournament}
                    isRegClosed={isRegClosed}
                    loadTournament={loadTournament}
                    addToast={addToast}
                    matches={matches}
                    players={players}
                    setFixtureNumGroups={setFixtureNumGroups}
                    handleShufflePreview={handleShufflePreview}
                    setShowFixtureModal={setShowFixtureModal}
                    groupMatches={groupMatches}
                    isSwapMode={isSwapMode}
                    setIsSwapMode={setIsSwapMode}
                    setSwapSource={setSwapSource}
                    isSwapping={isSwapping}
                    handleOpenOfficializeModal={handleOpenOfficializeModal}
                    generatingPlayoffs={generatingPlayoffs}
                    playoffMatches={playoffMatches}
                    handleConfirmAllGroupMatches={handleConfirmAllGroupMatches}
                    openManualEnrollModal={openManualEnrollModal}
                    canDeleteTournament={canDeleteTournament}
                    setShowDeleteModal={setShowDeleteModal}
                    user={user}
                    isCommissionWaived={isCommissionWaived}
                    isTogglingWaive={isTogglingWaive}
                    handleToggleCommissionWaived={handleToggleCommissionWaived}
                    countsForRanking={countsForRanking}
                    isTogglingRanking={isTogglingRanking}
                    handleToggleCountsForRanking={handleToggleCountsForRanking}
                    tierInfo={tierInfo}
                    finances={finances}
                    effectivePrice={effectivePrice}
                />

                                {/* Left: Matches & Brackets (Full width on playoffs tab or once tournament has started) */}
                <div className={`${matches.length > 0 || activeTab === 'playoffs' ? 'col-span-1 lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
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
                                    onClick={() => setActiveTab('order_of_play')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeTab === 'order_of_play' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted hover:text-white'}`}
                                >
                                    <Clock size={14} /> Orden de Juego ({oopDateMatches.length})
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
                            <TournamentGroupsTab
                                zones={zones}
                                unifiedStandings={unifiedStandings}
                                standingsViewMode={standingsViewMode}
                                setStandingsViewMode={setStandingsViewMode}
                                competitionFormat={competitionFormat}
                                isSwapMode={isSwapMode}
                                swapSource={swapSource}
                                handlePlayerClickForSwap={handlePlayerClickForSwap}
                                tournament={tournament}
                                user={user}
                                isClubAdmin={isClubAdmin}
                                openScheduleModal={openScheduleModal}
                                openQuickScorerModal={openQuickScorerModal}
                                openScoreModal={openScoreModal}
                                handleConfirmScore={handleConfirmScore}
                                setDisputeMatchId={setDisputeMatchId}
                                setH2hPlayers={setH2hPlayers}
                                formatScheduledInfo={formatScheduledInfo}
                            />
                        )}

                                                {/* TAB 2: CUADRO DE LLAVES (PLAYOFFS / BRACKET TREE) */}
                        {activeTab === 'playoffs' && (
                            <TournamentPlayoffsTab
                                championName={championName}
                                playoffRounds={playoffRounds}
                                projectedPlayoffRounds={projectedPlayoffRounds}
                                isGroupStageComplete={isGroupStageComplete}
                                setShowProjectionHelpModal={setShowProjectionHelpModal}
                                isClubAdmin={isClubAdmin}
                                groupMatches={groupMatches}
                                handleOpenOfficializeModal={handleOpenOfficializeModal}
                                generatingPlayoffs={generatingPlayoffs}
                                unplayedGroupMatches={unplayedGroupMatches}
                                tournament={tournament}
                                user={user}
                                openScheduleModal={openScheduleModal}
                                openQuickScorerModal={openQuickScorerModal}
                                openScoreModal={openScoreModal}
                                handleConfirmScore={handleConfirmScore}
                                setDisputeMatchId={setDisputeMatchId}
                                setH2hPlayers={setH2hPlayers}
                                formatScheduledInfo={formatScheduledInfo}
                            />
                        )}

                                                {/* TAB 4: ORDEN DE JUEGO DIARIO (OOP) */}
                        {activeTab === 'order_of_play' && (
                            <TournamentOrderOfPlayTab
                                formatFullDateDisplay={formatFullDateDisplay}
                                selectedOopDate={selectedOopDate}
                                setSelectedOopDate={setSelectedOopDate}
                                oopDates={oopDates}
                                matches={matches}
                                getMatchDate={getMatchDate}
                                isClubAdmin={isClubAdmin}
                                setShowRainDelayModal={setShowRainDelayModal}
                                handleShareOopWhatsApp={handleShareOopWhatsApp}
                                handlePrintOop={handlePrintOop}
                                setShowGraphicModal={setShowGraphicModal}
                                oopDateMatches={oopDateMatches}
                                getMatchOopStatus={getMatchOopStatus}
                                unscheduledMatches={unscheduledMatches}
                                openScheduleModal={openScheduleModal}
                                oopMatchesByCourt={oopMatchesByCourt}
                                user={user}
                                getMatchTime={getMatchTime}
                                tournament={tournament}
                                updatingOopMatchId={updatingOopMatchId}
                                handleQuickChangeOopStatus={handleQuickChangeOopStatus}
                                openScoreModal={openScoreModal}
                                setShowUnscheduledDrawer={setShowUnscheduledDrawer}
                                showUnscheduledDrawer={showUnscheduledDrawer}
                                players={players}
                            />
                        )}
                                            </Card>
                </div>

                {/* Right: Players List (Only shown on registration phase / before tournament starts) */}
                <TournamentRegistrationPlayersList
                    matchesLength={matches.length}
                    tournament={tournament}
                    players={players}
                    isClubAdmin={isClubAdmin}
                    allProfiles={allProfiles}
                    addToast={addToast}
                    openManualEnrollModal={openManualEnrollModal}
                    user={user}
                    setViewingReceiptModal={setViewingReceiptModal}
                    handleUpdatePaymentStatus={handleUpdatePaymentStatus}
                    handleOpenReplaceModal={handleOpenReplaceModal}
                    handleDeletePlayer={handleDeletePlayer}
                />
            </div>

                        {/* ALL TOURNAMENT MODALS */}
            <TournamentModalsContainer
                showManualEnrollModal={showManualEnrollModal}
                setShowManualEnrollModal={setShowManualEnrollModal}
                tournament={tournament}
                players={players}
                allProfiles={allProfiles}
                loadingProfiles={loadingProfiles}
                enrollMode={enrollMode}
                setEnrollMode={setEnrollMode}
                searchUserQuery={searchUserQuery}
                setSearchUserQuery={setSearchUserQuery}
                filterByGender={filterByGender}
                setFilterByGender={setFilterByGender}
                selectedUserForEnroll={selectedUserForEnroll}
                setSelectedUserForEnroll={setSelectedUserForEnroll}
                guestName={guestName}
                setGuestName={setGuestName}
                guestPartnerName={guestPartnerName}
                setGuestPartnerName={setGuestPartnerName}
                guestCategory={guestCategory}
                setGuestCategory={setGuestCategory}
                manualFee={manualFee}
                setManualFee={setManualFee}
                manualPaymentStatus={manualPaymentStatus}
                setManualPaymentStatus={setManualPaymentStatus}
                manualAvailabilityNotes={manualAvailabilityNotes}
                setManualAvailabilityNotes={setManualAvailabilityNotes}
                handleManualEnrollSubmit={handleManualEnrollSubmit}
                submittingEnroll={submittingEnroll}
                matchTournamentGender={matchTournamentGender}
                getUserMasterEligibility={getUserMasterEligibility}
                allProfilesForMasters={allProfilesForMasters}
                selectedMatchForScore={selectedMatchForScore}
                setSelectedMatchForScore={setSelectedMatchForScore}
                user={user}
                scoreSet1={scoreSet1}
                setScoreSet1={setScoreSet1}
                scoreSet2={scoreSet2}
                setScoreSet2={setScoreSet2}
                scoreSet3={scoreSet3}
                setScoreSet3={setScoreSet3}
                isSuperTiebreak={isSuperTiebreak}
                setIsSuperTiebreak={setIsSuperTiebreak}
                scoreError={scoreError}
                savingScore={savingScore}
                handleResetScore={handleResetScore}
                handleSaveScore={handleSaveScore}
                handleDisputeScore={handleDisputeScore}
                disputeMatchId={disputeMatchId}
                setDisputeMatchId={setDisputeMatchId}
                h2hPlayers={h2hPlayers}
                setH2hPlayers={setH2hPlayers}
                showFixtureModal={showFixtureModal}
                setShowFixtureModal={setShowFixtureModal}
                fixtureNumGroups={fixtureNumGroups}
                setFixtureNumGroups={setFixtureNumGroups}
                handleShufflePreview={handleShufflePreview}
                previewZones={previewZones}
                setPreviewZones={setPreviewZones}
                handleConfirmCustomFixture={handleConfirmCustomFixture}
                generatingFixture={generatingFixture}
                showReplacePlayerModal={showReplacePlayerModal}
                setShowReplacePlayerModal={setShowReplacePlayerModal}
                playerToReplace={playerToReplace}
                replaceMode={replaceMode}
                setReplaceMode={setReplaceMode}
                searchReplaceUserQuery={searchReplaceUserQuery}
                setSearchReplaceUserQuery={setSearchReplaceUserQuery}
                selectedUserForReplace={selectedUserForReplace}
                setSelectedUserForReplace={setSelectedUserForReplace}
                guestReplaceName={guestReplaceName}
                setGuestReplaceName={setGuestReplaceName}
                guestReplacePartnerName={guestReplacePartnerName}
                setGuestReplacePartnerName={setGuestReplacePartnerName}
                replaceCategory={replaceCategory}
                setReplaceCategory={setReplaceCategory}
                handleReplacePlayerSubmit={handleReplacePlayerSubmit}
                isSubmittingReplace={isSubmittingReplace}
                selectedMatchForSchedule={selectedMatchForSchedule}
                setSelectedMatchForSchedule={setSelectedMatchForSchedule}
                scheduleDate={scheduleDate}
                setScheduleDate={setScheduleDate}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                scheduleCourtName={scheduleCourtName}
                setScheduleCourtName={setScheduleCourtName}
                scheduleOrderTurn={scheduleOrderTurn}
                setScheduleOrderTurn={setScheduleOrderTurn}
                scheduleNotes={scheduleNotes}
                setScheduleNotes={setScheduleNotes}
                courtBookings={courtBookings}
                conflictError={conflictError}
                overrideConflict={overrideConflict}
                setOverrideConflict={setOverrideConflict}
                savingSchedule={savingSchedule}
                clearingSchedule={clearingSchedule}
                allCourts={allCourts}
                getQuickDatePresets={getQuickDatePresets}
                openCalendarPicker={openCalendarPicker}
                handleSaveSchedule={handleSaveSchedule}
                handleClearSchedule={handleClearSchedule}
                showRainDelayModal={showRainDelayModal}
                setShowRainDelayModal={setShowRainDelayModal}
                rainDelayHours={rainDelayHours}
                setRainDelayHours={setRainDelayHours}
                rainDelayNote={rainDelayNote}
                setRainDelayNote={setRainDelayNote}
                handleApplyRainDelay={handleApplyRainDelay}
                isApplyingDelay={isApplyingDelay}
                formatFullDateDisplay={formatFullDateDisplay}
                selectedOopDate={selectedOopDate}
                showCalendarPicker={showCalendarPicker}
                setShowCalendarPicker={setShowCalendarPicker}
                calendarViewDate={calendarViewDate}
                handlePrevMonth={handlePrevMonth}
                handleNextMonth={handleNextMonth}
                renderCalendarGrid={renderCalendarGrid}
                showDeleteModal={showDeleteModal}
                setShowDeleteModal={setShowDeleteModal}
                handleDeleteTournament={handleDeleteTournament}
                isDeletingTournament={isDeletingTournament}
                showGraphicModal={showGraphicModal}
                setShowGraphicModal={setShowGraphicModal}
                matches={matches}
                showEditTournamentModal={showEditTournamentModal}
                setShowEditTournamentModal={setShowEditTournamentModal}
                editTournamentStartDate={editTournamentStartDate}
                setEditTournamentStartDate={setEditTournamentStartDate}
                editTournamentEndDate={editTournamentEndDate}
                setEditTournamentEndDate={setEditTournamentEndDate}
                editTournamentCategory={editTournamentCategory}
                setEditTournamentCategory={setEditTournamentCategory}
                editTournamentGender={editTournamentGender}
                setEditTournamentGender={setEditTournamentGender}
                editTournamentEntryFee={editTournamentEntryFee}
                setEditTournamentEntryFee={setEditTournamentEntryFee}
                editTournamentEntryFeeMember={editTournamentEntryFeeMember}
                setEditTournamentEntryFeeMember={setEditTournamentEntryFeeMember}
                editTournamentCompetitionFormat={editTournamentCompetitionFormat}
                setEditTournamentCompetitionFormat={setEditTournamentCompetitionFormat}
                editTournamentMinMatches={editTournamentMinMatches}
                setEditTournamentMinMatches={setEditTournamentMinMatches}
                handleSaveEditTournament={handleSaveEditTournament}
                isUpdatingTournament={isUpdatingTournament}
                showEnrollModal={showEnrollModal}
                setShowEnrollModal={setShowEnrollModal}
                isDoubles={isDoubles}
                userCategory={userCategory}
                hasPartner={hasPartner}
                setHasPartner={setHasPartner}
                partnerMode={partnerMode}
                setPartnerMode={setPartnerMode}
                searchPartnerQuery={searchPartnerQuery}
                setSearchPartnerQuery={setSearchPartnerQuery}
                selectedPartnerUser={selectedPartnerUser}
                setSelectedPartnerUser={setSelectedPartnerUser}
                partnerGuestName={partnerGuestName}
                setPartnerGuestName={setPartnerGuestName}
                partnerCategory={partnerCategory}
                setPartnerCategory={setPartnerCategory}
                partnerPaymentMethod={partnerPaymentMethod}
                setPartnerPaymentMethod={setPartnerPaymentMethod}
                enrollmentReceiptFile={enrollmentReceiptFile}
                receiptPreviewUrl={receiptPreviewUrl}
                handleEnrollmentReceiptChange={handleEnrollmentReceiptChange}
                availabilityNotes={availabilityNotes}
                setAvailabilityNotes={setAvailabilityNotes}
                handleConfirmPlayerEnroll={handleConfirmPlayerEnroll}
                effectivePrice={effectivePrice}
                isClubAdmin={isClubAdmin}
                showEnrolledModal={showEnrolledModal}
                setShowEnrolledModal={setShowEnrolledModal}
                handleTogglePaymentStatus={handleTogglePaymentStatus}
                handleUnenrollPlayer={handleUnenrollPlayer}
                exportTournamentPlayersToCSV={exportTournamentPlayersToCSV}
                addToast={addToast}
                showOfficializeModal={showOfficializeModal}
                setShowOfficializeModal={setShowOfficializeModal}
                officializeOption={officializeOption}
                setOfficializeOption={setOfficializeOption}
                handleConfirmOfficialPlayoffs={handleConfirmOfficialPlayoffs}
                unplayedGroupMatches={unplayedGroupMatches}
                totalGroupMatchesCount={totalGroupMatchesCount}
                showProjectionHelpModal={showProjectionHelpModal}
                setShowProjectionHelpModal={setShowProjectionHelpModal}
                quickScorerMatch={quickScorerMatch}
                setQuickScorerMatch={setQuickScorerMatch}
                handleQuickSaveScore={handleQuickSaveScore}
                viewingReceiptModal={viewingReceiptModal}
                setViewingReceiptModal={setViewingReceiptModal}
            />

            {/* PRINTABLE CONTROL SHEETS (A4 - Only visible during print) */}
            <TournamentPrintSheets
                tournament={tournament}
                players={players}
                matches={matches}
                formatFullDateDisplay={formatFullDateDisplay}
                selectedOopDate={selectedOopDate}
                oopDateMatches={oopDateMatches}
                oopMatchesByCourt={oopMatchesByCourt}
                getMatchTime={getMatchTime}
            />
        </div>
    );
};