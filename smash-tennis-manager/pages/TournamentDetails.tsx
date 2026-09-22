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
    TournamentPlayoffsTab
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

    // Order of Play (OOP) State
    const [selectedOopDate, setSelectedOopDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [showRainDelayModal, setShowRainDelayModal] = useState(false);
    const [rainDelayMinutes, setRainDelayMinutes] = useState<number>(30);
    const [isApplyingRainDelay, setIsApplyingRainDelay] = useState(false);
    const [updatingOopMatchId, setUpdatingOopMatchId] = useState<string | null>(null);
    const [scheduleOopTurn, setScheduleOopTurn] = useState<string>('');
    const [scheduleOopNote, setScheduleOopNote] = useState<string>('');
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

    // --- ORDER OF PLAY (OOP) CALCULATIONS & HOOKS (TOP-LEVEL BEFORE EARLY RETURNS) ---
    const getMatchDate = (m: Match): string | null => {
        const raw = m.scheduled_at || m.proposal_data?.scheduled_at;
        if (raw) {
            try {
                const d = new Date(raw);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            } catch (e) {}
        }
        return m.oop_date || m.proposal_data?.oop_date || null;
    };

    const getMatchTime = (m: Match): string => {
        const raw = m.scheduled_at || m.proposal_data?.scheduled_at;
        if (raw) {
            try {
                const d = new Date(raw);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
                }
            } catch (e) {}
        }
        return m.oop_turn || m.proposal_data?.oop_turn || 'A confirmar';
    };

    const getMatchOopStatus = (m: Match): 'scheduled' | 'warming_up' | 'in_progress' | 'delayed' | 'finished' => {
        if (m.is_played || m.winner_id || m.score_status === 'confirmed') return 'finished';
        return m.oop_status || m.proposal_data?.oop_status || 'scheduled';
    };

    const oopDates = useMemo(() => {
        const dateSet = new Set<string>();
        if (tournament?.start_date) dateSet.add(tournament.start_date);
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        dateSet.add(todayStr);

        matches.forEach(m => {
            const d = getMatchDate(m);
            if (d) dateSet.add(d);
        });

        return Array.from(dateSet).sort();
    }, [tournament?.start_date, matches]);

    useEffect(() => {
        if (oopDates.length > 0 && !oopDates.includes(selectedOopDate)) {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (oopDates.includes(todayStr)) {
                setSelectedOopDate(todayStr);
            } else {
                setSelectedOopDate(oopDates[0]);
            }
        }
    }, [oopDates, selectedOopDate]);

    const oopDateMatches = useMemo(() => {
        if (!selectedOopDate) return [];
        return matches.filter(m => {
            if (m.is_bye) return false;
            const mDate = getMatchDate(m);
            return mDate === selectedOopDate;
        }).sort((a, b) => {
            const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 9999999999999;
            const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 9999999999999;
            if (timeA !== timeB) return timeA - timeB;
            const courtA = a.court_name || a.proposal_data?.court_name || '';
            const courtB = b.court_name || b.proposal_data?.court_name || '';
            return courtA.localeCompare(courtB);
        });
    }, [matches, selectedOopDate]);

    const unscheduledMatches = useMemo(() => {
        return matches.filter(m => {
            if (m.is_bye || m.is_played) return false;
            const hasSchedule = !!m.scheduled_at || !!m.proposal_data?.scheduled_at || !!m.proposal_data?.oop_date;
            return !hasSchedule;
        });
    }, [matches]);

    const oopMatchesByCourt = useMemo(() => {
        const groups: { [court: string]: Match[] } = {};
        courtOptions.forEach(c => {
            groups[c] = [];
        });

        oopDateMatches.forEach(m => {
            const court = m.court_name || m.proposal_data?.court_name || 'Cancha 1';
            if (!groups[court]) groups[court] = [];
            groups[court].push(m);
        });

        const entries = Object.entries(groups);
        const filtered = entries.filter(([court, list], idx) => list.length > 0 || idx < 2);
        return filtered.map(([court, courtMatches]) => ({
            court,
            matches: courtMatches
        }));
    }, [oopDateMatches, courtOptions]);

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
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    initialDate = `${year}-${month}-${day}`;
                    const hours = String(d.getHours()).padStart(2, '0');
                    const mins = String(d.getMinutes()).padStart(2, '0');
                    initialTime = `${hours}:${mins}`;
                }
            } catch (e) {}
        }

        if (!initialDate) {
            initialDate = m.oop_date || m.proposal_data?.oop_date || selectedOopDate || tournament?.start_date || new Date().toISOString().split('T')[0];
        }

        setScheduleDate(initialDate);
        setScheduleTime(initialTime || '16:00');
        setScheduleOopTurn(m.oop_turn || m.proposal_data?.oop_turn || '');
        setScheduleOopNote(m.oop_note || m.proposal_data?.oop_note || '');

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
                override_conflict_booking_id: (overrideConflict && conflictBooking) ? conflictBooking.id : undefined,
                oop_date: scheduleDate,
                oop_turn: scheduleOopTurn.trim() || undefined,
                oop_note: scheduleOopNote.trim() || undefined,
                oop_status: selectedMatchForSchedule.oop_status || 'scheduled'
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
                                                onClick={handleOpenOfficializeModal}
                                                disabled={generatingPlayoffs}
                                                className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Trophy size={14} className={generatingPlayoffs ? "animate-spin text-amber-400" : "text-amber-400"} />
                                                {playoffMatches.length > 0 ? 'Regenerar Llaves de Playoffs' : '🏆 Clasificar y Armar Llaves'}
                                            </button>
                                        )}

                                        {groupMatches.some(m => (m.score || m.is_played) && m.score_status !== 'confirmed') && (
                                            <button
                                                onClick={handleConfirmAllGroupMatches}
                                                className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                                title="Validar y confirmar oficialmente todos los resultados pendientes de la fase de grupos"
                                            >
                                                <CheckCircle2 size={14} className="text-purple-400" /> Validar Resultados Pendientes
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

                                {canDeleteTournament && (
                                    <button
                                        onClick={() => {
                                            soundEffects.playScoreBeep();
                                            setShowDeleteModal(true);
                                        }}
                                        className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ml-auto"
                                        title="Eliminar este torneo de forma permanente"
                                    >
                                        <Trash2 size={14} /> Eliminar Torneo
                                    </button>
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
                            <div className="space-y-6">
                                {/* Top Controls Bar: Dates & Actions */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-white/10 rounded-2xl">
                                    {/* Date Selector Pills */}
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar size={13} className="text-primary" /> Jornada Seleccionada
                                            </span>
                                            <span className="text-xs font-semibold text-primary">
                                                {formatFullDateDisplay(selectedOopDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                            {oopDates.map(dateStr => {
                                                const [y, m, d] = dateStr.split('-').map(Number);
                                                const dObj = new Date(y, m - 1, d);
                                                const dayShort = dObj.toLocaleDateString('es-AR', { weekday: 'short' });
                                                const dayNum = dObj.getDate();
                                                const monthShort = dObj.toLocaleDateString('es-AR', { month: 'short' });
                                                const countForDate = matches.filter(m => !m.is_bye && getMatchDate(m) === dateStr).length;
                                                const isSelected = selectedOopDate === dateStr;

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => {
                                                            setSelectedOopDate(dateStr);
                                                            soundEffects.playScoreBeep();
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                                            isSelected
                                                                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                                                                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span>{dayShort.charAt(0).toUpperCase() + dayShort.slice(1)} {dayNum} {monthShort}</span>
                                                        {countForDate > 0 && (
                                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>
                                                                {countForDate}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {/* Custom Date Input Trigger */}
                                            <label className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1">
                                                <Plus size={13} /> Otra Fecha
                                                <input
                                                    type="date"
                                                    value={selectedOopDate}
                                                    onChange={e => {
                                                        if (e.target.value) {
                                                            setSelectedOopDate(e.target.value);
                                                            soundEffects.playScoreBeep();
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 shrink-0">
                                        {isClubAdmin && (
                                            <button
                                                onClick={() => setShowRainDelayModal(true)}
                                                className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                                                title="Ajustar demora por lluvia a todos los partidos de la jornada"
                                            >
                                                <CloudRain size={14} className="text-amber-400" />
                                                <span>Demora Clima</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleShareOopWhatsApp}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                                            title="Compartir programación de hoy por WhatsApp"
                                        >
                                            <MessageCircle size={14} className="text-green-400" />
                                            <span>WhatsApp</span>
                                        </button>

                                        <button
                                            onClick={handlePrintOop}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5"
                                            title="Imprimir cartel A4 para el tablero del club"
                                        >
                                            <Printer size={14} />
                                            <span>Imprimir A4</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowGraphicModal(true);
                                                soundEffects.playScoreBeep();
                                            }}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all flex items-center gap-1.5 shadow-sm"
                                            title="Generar gráfica para Instagram o WhatsApp Stories"
                                        >
                                            <ImageIcon size={14} />
                                            <span>Gráfica Redes</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Weather / Rain Delay Notice Banner */}
                                {oopDateMatches.some(m => getMatchOopStatus(m) === 'delayed') && (
                                    <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-in fade-in">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                                                <CloudRain size={18} />
                                            </div>
                                            <div className="text-xs">
                                                <div className="font-bold text-amber-300">Jornada Afectada por Clima / Lluvia</div>
                                                <p className="text-[11px] text-amber-200/90">Los horarios han sido demorados. Verifique los nuevos turnos y estados a continuación.</p>
                                            </div>
                                        </div>
                                        {isClubAdmin && (
                                            <button
                                                onClick={() => setShowRainDelayModal(true)}
                                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold transition-all self-end sm:self-auto shrink-0"
                                            >
                                                Modificar Demora
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Main OOP Courts Board */}
                                {oopDateMatches.length === 0 ? (
                                    <div className="text-center py-14 bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                                        <Clock size={38} className="mx-auto text-primary opacity-60" />
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-white">No hay partidos programados para esta fecha</h4>
                                            <p className="text-xs text-muted max-w-md mx-auto">
                                                Seleccione otro día en la barra superior o asigne horarios a los partidos pendientes del torneo.
                                            </p>
                                        </div>
                                        {isClubAdmin && unscheduledMatches.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    const first = unscheduledMatches[0];
                                                    if (first) openScheduleModal(first);
                                                }}
                                                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-sm"
                                            >
                                                <Calendar size={14} /> Programar un Partido para este Día
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                        {oopMatchesByCourt.map(({ court, matches: cMatches }) => (
                                            <div
                                                key={court}
                                                className="bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg"
                                            >
                                                {/* Court Header */}
                                                <div className="p-3 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={15} className="text-green-400" />
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">{court}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                                                        {cMatches.length} {cMatches.length === 1 ? 'partido' : 'partidos'}
                                                    </span>
                                                </div>

                                                {/* Court Matches Stack */}
                                                <div className="p-3 space-y-3 flex-1">
                                                    {cMatches.length === 0 ? (
                                                        <div className="py-8 text-center text-slate-500 text-xs italic">
                                                            Sin partidos en este turno
                                                        </div>
                                                    ) : (
                                                        cMatches.map((m) => {
                                                            const isUserInMatch = m.player1_id === user.id || m.player2_id === user.id || m.player1_partner_id === user.id || m.player2_partner_id === user.id;
                                                            const isMatchFinishedAndConfirmed = !!(m.is_played && m.score_status === 'confirmed');
                                                            const canEditScore = isClubAdmin || (isUserInMatch && !isMatchFinishedAndConfirmed);
                                                            const p1Display = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                            const p2Display = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                            const oopStatus = getMatchOopStatus(m);
                                                            const matchTime = getMatchTime(m);
                                                            const note = m.oop_note || m.proposal_data?.oop_note;
                                                            const turn = m.oop_turn || m.proposal_data?.oop_turn;
                                                            const formattedScore = formatMatchScore(m.score);

                                                            return (
                                                                <div
                                                                    key={m.id}
                                                                    className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                                                                        oopStatus === 'in_progress'
                                                                            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                                                                            : oopStatus === 'warming_up'
                                                                            ? 'bg-amber-950/30 border-amber-500/40 shadow-md shadow-amber-950/30'
                                                                            : oopStatus === 'delayed'
                                                                            ? 'bg-red-950/30 border-red-500/40'
                                                                            : isUserInMatch
                                                                            ? 'bg-blue-950/30 border-blue-500/40 shadow-md shadow-blue-950/30'
                                                                            : 'bg-white/5 hover:bg-white/[0.07] border-white/10'
                                                                    }`}
                                                                >
                                                                    {/* Match Top Bar: Time / Turn & Status Badge */}
                                                                    <div className="flex items-center justify-between gap-1.5 text-xs">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-white/10 shrink-0">
                                                                                {matchTime}
                                                                            </span>
                                                                            {turn && (
                                                                                <span className="text-[10px] text-slate-400 truncate">
                                                                                    {turn}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        {oopStatus === 'in_progress' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse shrink-0">
                                                                                <Zap size={11} className="fill-emerald-400 text-emerald-400" /> En Juego
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'warming_up' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                                                                                <span>🎾</span> Calentando
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'delayed' && (
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1 shrink-0">
                                                                                <CloudRain size={11} /> Demorado
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'finished' && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1 shrink-0">
                                                                                <Check size={11} /> Finalizado
                                                                            </span>
                                                                        )}
                                                                        {oopStatus === 'scheduled' && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                                                                                Programado
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Round / Group and Category */}
                                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/5 pb-1">
                                                                        <span className="uppercase font-semibold truncate">
                                                                            {m.round} {m.group_number ? `• Grupo ${m.group_number}` : ''}
                                                                        </span>
                                                                        <span className="text-primary font-bold shrink-0">
                                                                            {tournament.category} {tournament.gender ? `• ${tournament.gender}` : ''}
                                                                        </span>
                                                                    </div>

                                                                    {/* Players */}
                                                                    <div className="space-y-1 py-0.5">
                                                                        <div className={`text-xs font-bold flex items-center justify-between ${m.winner_id === m.player1_id ? 'text-green-400' : 'text-white'}`}>
                                                                            <span className="truncate">{p1Display}</span>
                                                                            {m.winner_id === m.player1_id && <span className="text-[10px] text-green-400 font-bold ml-1">✓</span>}
                                                                        </div>
                                                                        <div className={`text-xs font-bold flex items-center justify-between ${m.winner_id === m.player2_id ? 'text-green-400' : 'text-white'}`}>
                                                                            <span className="truncate">{p2Display}</span>
                                                                            {m.winner_id === m.player2_id && <span className="text-[10px] text-green-400 font-bold ml-1">✓</span>}
                                                                        </div>
                                                                    </div>

                                                                    {/* Score if finished */}
                                                                    {formattedScore && (
                                                                        <div className="bg-black/40 border border-white/10 px-2 py-1 rounded-lg text-center font-mono text-xs font-bold text-primary">
                                                                            {formattedScore}
                                                                        </div>
                                                                    )}

                                                                    {/* Note memo if provided */}
                                                                    {note && (
                                                                        <div className="text-[10px] text-amber-300/90 italic bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                            <Info size={11} className="shrink-0 text-amber-400" />
                                                                            <span className="truncate">{note}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Admin Real-time OOP Status Chips Bar */}
                                                                    {isClubAdmin && !m.is_played && (
                                                                        <div className="pt-1.5 border-t border-white/10 space-y-1">
                                                                            <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                                                                                <span>Cambiar Estado en Vivo:</span>
                                                                                {updatingOopMatchId === m.id && <Loader2 size={10} className="animate-spin text-primary" />}
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-1 text-[10px]">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'warming_up')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'warming_up'
                                                                                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar en calentamiento"
                                                                                >
                                                                                    🎾 Calent
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'in_progress')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'in_progress'
                                                                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar en juego"
                                                                                >
                                                                                    ⚡ Juego
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'delayed')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'delayed'
                                                                                            ? 'bg-red-500 text-white border-red-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Marcar demorado por lluvia o tiempo"
                                                                                >
                                                                                    🌧️ Demor
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={updatingOopMatchId === m.id}
                                                                                    onClick={() => handleQuickChangeOopStatus(m.id, 'scheduled')}
                                                                                    className={`py-1 px-1 rounded-lg font-bold border text-center transition-all ${
                                                                                        oopStatus === 'scheduled'
                                                                                            ? 'bg-blue-500 text-white border-blue-400 shadow-sm'
                                                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                                                                                    }`}
                                                                                    title="Restablecer a programado"
                                                                                >
                                                                                    🕒 Prog
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Action Buttons: Schedule, Score, WhatsApp */}
                                                                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5 text-xs">
                                                                        {(isClubAdmin || isUserInMatch) && !m.is_played && (
                                                                            <button
                                                                                onClick={() => openScheduleModal(m)}
                                                                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold flex items-center gap-1 transition-all"
                                                                                title="Cambiar horario o cancha"
                                                                            >
                                                                                <Calendar size={11} className="text-blue-400" />
                                                                                <span>Horario</span>
                                                                            </button>
                                                                        )}

                                                                        {canEditScore && (
                                                                            <button
                                                                                onClick={() => openScoreModal(m)}
                                                                                className="px-2 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                                                                title={m.is_played ? "Editar marcador" : "Cargar resultado"}
                                                                            >
                                                                                <Edit3 size={11} />
                                                                                <span>{m.is_played ? "Editar" : "Resultado"}</span>
                                                                            </button>
                                                                        )}

                                                                        {isUserInMatch && !m.is_played && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    soundEffects.playScoreBeep();
                                                                                    const opp = m.player1_id === user.id ? p2Display : p1Display;
                                                                                    const msg = encodeURIComponent(`🎾 ¡Hola ${opp}! Te escribo para coordinar nuestro partido de "${tournament.name}" fijado para el ${formatFullDateDisplay(selectedOopDate)} a las ${matchTime} en ${court} (${tournament.institutions?.name || 'el club'}). ¿Confirmamos?`);
                                                                                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                                                                                }}
                                                                                className="px-2 py-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 text-[11px] font-bold flex items-center gap-1 transition-all ml-auto"
                                                                                title="Enviar WhatsApp al rival"
                                                                            >
                                                                                <MessageCircle size={11} />
                                                                                <span>Rival</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Organizer Assistant: Unscheduled Matches Drawer */}
                                {isClubAdmin && unscheduledMatches.length > 0 && (
                                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                        <div 
                                            onClick={() => setShowUnscheduledDrawer(!showUnscheduledDrawer)}
                                            className="p-4 bg-slate-950 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/10"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                                                    <Clock size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                        Partidos Pendientes de Programación
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                                            {unscheduledMatches.length} por jugar
                                                        </span>
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">Encuentros que aún no tienen fecha ni horario asignado en el fixture</p>
                                                </div>
                                            </div>
                                            <button className="text-xs text-primary font-bold hover:underline">
                                                {showUnscheduledDrawer ? 'Ocultar' : 'Ver Lista'}
                                            </button>
                                        </div>

                                        {showUnscheduledDrawer && (
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
                                                {unscheduledMatches.map(m => {
                                                    const p1 = m.team1_name || formatPlayerName(m.player1_name) || 'A definir';
                                                    const p2 = m.team2_name || formatPlayerName(m.player2_name) || 'A definir';
                                                    const p1Obj = players.find(p => p.player_id === m.player1_id || p.id === m.player1_id);
                                                    const p2Obj = players.find(p => p.player_id === m.player2_id || p.id === m.player2_id);
                                                    const availNote = p1Obj?.availability_notes || p2Obj?.availability_notes || p1Obj?.time_restrictions || p2Obj?.time_restrictions;

                                                    return (
                                                        <div key={m.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                                                    <span>{m.round} {m.group_number ? `• G${m.group_number}` : ''}</span>
                                                                    <span className="text-primary">{tournament.category}</span>
                                                                </div>
                                                                <div className="text-xs font-bold text-white pt-1">
                                                                    <div className="truncate">{p1}</div>
                                                                    <div className="text-[10px] text-slate-500">vs</div>
                                                                    <div className="truncate">{p2}</div>
                                                                </div>
                                                                {availNote && (
                                                                    <div className="text-[10px] text-amber-300 italic pt-1 truncate">
                                                                        Disp: {availNote}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => openScheduleModal(m)}
                                                                className="w-full py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                            >
                                                                <Calendar size={12} /> Asignar a {formatFullDateDisplay(selectedOopDate).split(',')[0]}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* OFFICIAL CLUB SPONSORS SECTION */}
                                <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 rounded-3xl space-y-4 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                                                <Award size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                                                    Auspiciantes & Sponsors Oficiales
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                                                        {tournament.institutions?.name || 'Sede'}
                                                    </span>
                                                </h4>
                                                <p className="text-xs text-slate-400">Marcas y empresas que respaldan el circuito y los torneos del club</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sponsors Cards Grid */}
                                    {((tournament?.sponsors || []).filter(s => s.is_active).length > 0) ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {(tournament?.sponsors || []).filter(s => s.is_active).map(sponsor => (
                                                <div
                                                    key={sponsor.id}
                                                    className="p-3.5 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl flex flex-col items-center text-center space-y-2.5 transition-all group"
                                                >
                                                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                        {sponsor.logo_url ? (
                                                            <img
                                                                src={sponsor.logo_url}
                                                                alt={sponsor.name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        ) : (
                                                            <Award size={26} className="text-amber-400 opacity-60" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 w-full">
                                                        <div className="text-xs font-bold text-white truncate">{sponsor.name}</div>
                                                        <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            sponsor.category === 'main'
                                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                : sponsor.category === 'official'
                                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                                        }`}>
                                                            {sponsor.category === 'main' ? 'Sponsor Principal' : sponsor.category === 'official' ? 'Auspiciante Oficial' : 'Aliado'}
                                                        </span>
                                                    </div>

                                                    {/* External Links */}
                                                    <div className="flex items-center gap-1.5 pt-1">
                                                        {sponsor.website_url && (
                                                            <a
                                                                href={sponsor.website_url.startsWith('http') ? sponsor.website_url : `https://${sponsor.website_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                                                                title="Visitar sitio web oficial"
                                                            >
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                        {sponsor.phone_whatsapp && (
                                                            <a
                                                                href={`https://api.whatsapp.com/send?phone=${sponsor.phone_whatsapp.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors"
                                                                title="Contactar por WhatsApp"
                                                            >
                                                                <MessageCircle size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center space-y-1">
                                            <p className="text-xs text-slate-300 font-semibold">
                                                Aún no se han configurado sponsors para esta institución.
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Los administradores del club pueden cargarlos desde el panel de Sedes e Instituciones para que aparezcan en todos sus torneos.
                                            </p>
                                        </div>
                                    )}

                                    {/* Future Monetization Teaser & Sponsor Acquisition Callout */}
                                    <div className="p-3 bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-amber-400 shrink-0" />
                                            <span className="text-slate-300 text-[11px]">
                                                ¿Te gustaría promocionar tu empresa en la Orden de Juego y en las pantallas de TV del club?
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                soundEffects.playScoreBeep();
                                                const orgPhone = (tournament?.institutions as any)?.phone || '';
                                                const text = encodeURIComponent(`Hola! Quisiera información para auspiciar el torneo "${tournament.name}" en Smash Tenis.`);
                                                if (orgPhone) {
                                                    window.open(`https://api.whatsapp.com/send?phone=${orgPhone.replace(/\D/g, '')}&text=${text}`, '_blank');
                                                } else {
                                                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-[11px] transition-all shrink-0 self-end sm:self-auto"
                                        >
                                            Sumar mi Marca 🤝
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Players List (Only shown on registration phase / before tournament starts) */}
                {matches.length === 0 && (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Users size={18} className="text-primary" /> Inscritos ({players.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    {isClubAdmin && (
                                        <button
                                            onClick={() => {
                                                if (!tournament) return;
                                                const profileMap: Record<string, any> = {};
                                                allProfiles.forEach(prof => { profileMap[prof.id] = prof; });
                                                exportTournamentPlayersToCSV(tournament, players, profileMap);
                                                soundEffects.playScoreBeep();
                                                addToast("¡Listado de inscriptos descargado en CSV!", "success");
                                            }}
                                            className="p-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                            title="Descargar lista de inscriptos en Excel / CSV con datos de contacto y disponibilidad"
                                        >
                                            <Download size={13} className="text-emerald-400" /> Exportar CSV
                                        </button>
                                    )}
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
                            </div>

                            <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                                {players.length === 0 ? (
                                    <div className="text-muted text-sm text-center py-6">Aún no hay jugadores inscritos.</div>
                                ) : (
                                    players.map((p, i) => {
                                        const pDisplayName = formatPlayerName(p.name || p.player_name);
                                        const isPaid = p.payment_status === 'paid';
                                        const isSelf = p.player_id === user.id || p.id === user.id;
                                        const pAvailability = p.availability_notes || p.time_restrictions;

                                        return (
                                            <div key={p.id || i} className="flex items-center justify-between gap-2 p-2.5 bg-sidebar/50 border border-white/5 rounded-xl hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                        {pDisplayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-bold text-white truncate">{pDisplayName}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-muted">{p.category ? `${p.category} Cat.` : 'Sin Cat.'}</span>
                                                            {(isClubAdmin || isSelf) && p.fee_amount ? (
                                                                <span className="text-[10px] text-slate-400 font-mono">${p.fee_amount}</span>
                                                            ) : null}
                                                            {(isClubAdmin || isSelf) && pAvailability ? (
                                                                <span 
                                                                    className="text-[9px] text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 max-w-[170px]"
                                                                    title={`Disponibilidad: ${pAvailability}`}
                                                                >
                                                                    <Clock size={9} className="text-amber-400 shrink-0" />
                                                                    <span className="truncate">{pAvailability}</span>
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {/* Comprobante de pago adjunto para Admin */}
                                                    {isClubAdmin && p.receipt_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingReceiptModal(p.receipt_url || null)}
                                                            className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 flex items-center gap-1 transition-all"
                                                            title="Ver comprobante de pago subido por el jugador"
                                                        >
                                                            <Eye size={11} className="text-blue-400" />
                                                            <span>Comprobante</span>
                                                        </button>
                                                    )}

                                                    {/* Payment Status: Admin or Self only */}
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
                                                    ) : isSelf ? (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                                                            isPaid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                            {isPaid ? 'Inscripción Pagada' : 'Pago Pendiente'}
                                                        </span>
                                                    ) : null}

                                                    {isSelf && (
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
                )}
            </div>

            {/* MANUAL ENROLL MODAL */}
            {showManualEnrollModal && (
                <ManualEnrollModal
                    isOpen={showManualEnrollModal}
                    onClose={() => setShowManualEnrollModal(false)}
                    tournament={tournament}
                    players={players}
                    allProfiles={allProfiles}
                    loadingProfiles={loadingProfiles}
                    enrollMode={enrollMode}
                    onEnrollModeChange={setEnrollMode}
                    searchUserQuery={searchUserQuery}
                    onSearchUserQueryChange={setSearchUserQuery}
                    filterByGender={filterByGender}
                    onToggleFilterByGender={() => setFilterByGender(!filterByGender)}
                    selectedUserForEnroll={selectedUserForEnroll}
                    onSelectUserForEnroll={setSelectedUserForEnroll}
                    guestName={guestName}
                    onGuestNameChange={setGuestName}
                    guestPartnerName={guestPartnerName}
                    onGuestPartnerNameChange={setGuestPartnerName}
                    guestCategory={guestCategory}
                    onGuestCategoryChange={setGuestCategory}
                    manualFee={manualFee}
                    onManualFeeChange={setManualFee}
                    manualPaymentStatus={manualPaymentStatus}
                    onManualPaymentStatusChange={setManualPaymentStatus}
                    manualAvailabilityNotes={manualAvailabilityNotes}
                    onManualAvailabilityNotesChange={setManualAvailabilityNotes}
                    onSubmit={handleManualEnrollSubmit}
                    submitting={submittingEnroll}
                    matchTournamentGender={matchTournamentGender}
                    getUserMasterEligibility={getUserMasterEligibility}
                    allProfilesForMasters={allProfilesForMasters}
                />
            )}

            {/* SCORE INPUT MODAL */}
            {selectedMatchForScore && (
                <ScoreInputModal
                    isOpen={!!selectedMatchForScore}
                    onClose={() => setSelectedMatchForScore(null)}
                    match={selectedMatchForScore}
                    isClubAdmin={isClubAdmin}
                    isWalkover={isWalkover}
                    onToggleWalkover={setIsWalkover}
                    walkoverWinnerId={walkoverWinnerId}
                    onWalkoverWinnerIdChange={setWalkoverWinnerId}
                    scoreP1Set1={scoreP1Set1}
                    onScoreP1Set1Change={setScoreP1Set1}
                    scoreP2Set1={scoreP2Set1}
                    onScoreP2Set1Change={setScoreP2Set1}
                    tbP1Set1={tbP1Set1}
                    onTbP1Set1Change={setTbP1Set1}
                    tbP2Set1={tbP2Set1}
                    onTbP2Set1Change={setTbP2Set1}
                    scoreP1Set2={scoreP1Set2}
                    onScoreP1Set2Change={setScoreP1Set2}
                    scoreP2Set2={scoreP2Set2}
                    onScoreP2Set2Change={setScoreP2Set2}
                    tbP1Set2={tbP1Set2}
                    onTbP1Set2Change={setTbP1Set2}
                    tbP2Set2={tbP2Set2}
                    onTbP2Set2Change={setTbP2Set2}
                    hasSet3={hasSet3}
                    onAddSet3={() => {
                        setHasSet3(true);
                        setIsSet3SuperTiebreak(true);
                        setScoreP1Set3('');
                        setScoreP2Set3('');
                    }}
                    onRemoveSet3={() => {
                        setHasSet3(false);
                        setScoreP1Set3('');
                        setScoreP2Set3('');
                        setTbP1Set3('');
                        setTbP2Set3('');
                    }}
                    isSet3SuperTiebreak={isSet3SuperTiebreak}
                    onSetIsSet3SuperTiebreak={setIsSet3SuperTiebreak}
                    scoreP1Set3={scoreP1Set3}
                    onScoreP1Set3Change={setScoreP1Set3}
                    scoreP2Set3={scoreP2Set3}
                    onScoreP2Set3Change={setScoreP2Set3}
                    tbP1Set3={tbP1Set3}
                    onTbP1Set3Change={setTbP1Set3}
                    tbP2Set3={tbP2Set3}
                    onTbP2Set3Change={setTbP2Set3}
                    computedWinnerInfo={computedWinnerInfo}
                    onResetScore={handleResetScore}
                    onSaveScore={handleSaveScore}
                    savingScore={savingScore}
                />
            )}

            {/* DISPUTE MODAL */}
            {disputeMatchId && (
                <DisputeModal
                    isOpen={!!disputeMatchId}
                    onClose={() => setDisputeMatchId(null)}
                    disputeReason={disputeReason}
                    onDisputeReasonChange={setDisputeReason}
                    onSubmit={handleDisputeScore}
                    submitting={submittingDispute}
                />
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
                <GenerateFixtureModal
                    isOpen={showFixtureModal}
                    onClose={() => setShowFixtureModal(false)}
                    tournament={tournament}
                    players={players}
                    fixtureNumGroups={fixtureNumGroups}
                    onNumGroupsChange={setFixtureNumGroups}
                    onShufflePreview={handleShufflePreview}
                    previewGroups={previewGroups}
                    onConfirmFixture={handleConfirmCustomFixture}
                    generatingFixture={generatingFixture}
                />
            )}

            {/* REPLACE / SUBSTITUTE PLAYER MODAL */}
            {playerToReplace && (
                <ReplacePlayerModal
                    isOpen={!!playerToReplace}
                    onClose={() => setPlayerToReplace(null)}
                    tournament={tournament}
                    playerToReplace={playerToReplace}
                    replaceMode={replaceMode}
                    onReplaceModeChange={setReplaceMode}
                    allProfiles={allProfiles}
                    loadingProfiles={loadingProfiles}
                    searchUserReplaceQuery={searchUserReplaceQuery}
                    onSearchUserReplaceQueryChange={setSearchUserReplaceQuery}
                    selectedUserForReplace={selectedUserForReplace}
                    onSelectUserForReplace={setSelectedUserForReplace}
                    replaceGuestName={replaceGuestName}
                    onReplaceGuestNameChange={setReplaceGuestName}
                    replacePartnerMode={replacePartnerMode}
                    onReplacePartnerModeChange={setReplacePartnerMode}
                    searchPartnerReplaceQuery={searchPartnerReplaceQuery}
                    onSearchPartnerReplaceQueryChange={setSearchPartnerReplaceQuery}
                    selectedPartnerForReplace={selectedPartnerForReplace}
                    onSelectPartnerForReplace={setSelectedPartnerForReplace}
                    replaceGuestPartnerName={replaceGuestPartnerName}
                    onReplaceGuestPartnerNameChange={setReplaceGuestPartnerName}
                    replaceCategory={replaceCategory}
                    onReplaceCategoryChange={setReplaceCategory}
                    filterByGender={filterByGender}
                    onToggleFilterByGender={() => setFilterByGender(!filterByGender)}
                    matchTournamentGender={matchTournamentGender}
                    onSubmit={handleReplacePlayerSubmit}
                    isSubmitting={isSubmittingReplace}
                    players={players}
                />
            )}

            {/* SCHEDULE MATCH MODAL (Organizador) */}
            {selectedMatchForSchedule && (
                <ScheduleMatchModal
                    isOpen={!!selectedMatchForSchedule}
                    onClose={() => setSelectedMatchForSchedule(null)}
                    tournament={tournament}
                    match={selectedMatchForSchedule}
                    players={players}
                    scheduleDate={scheduleDate}
                    onScheduleDateChange={setScheduleDate}
                    onOpenCalendarPicker={openCalendarPicker}
                    quickDatePresets={getQuickDatePresets()}
                    formatFullDateDisplay={formatFullDateDisplay}
                    scheduleTime={scheduleTime}
                    onScheduleTimeChange={setScheduleTime}
                    isCustomCourt={isCustomCourt}
                    onToggleCustomCourt={() => setIsCustomCourt(!isCustomCourt)}
                    customCourtName={customCourtName}
                    onCustomCourtNameChange={setCustomCourtName}
                    scheduleCourt={scheduleCourt}
                    onScheduleCourtChange={setScheduleCourt}
                    courtOptions={courtOptions}
                    conflictBooking={conflictBooking}
                    availableCourtsAtThisTime={availableCourtsAtThisTime}
                    overrideConflict={overrideConflict}
                    onOverrideConflictChange={setOverrideConflict}
                    loadingDayBookings={loadingDayBookings}
                    currentTargetCourt={currentTargetCourt}
                    scheduleOopTurn={scheduleOopTurn}
                    onScheduleOopTurnChange={setScheduleOopTurn}
                    scheduleOopNote={scheduleOopNote}
                    onScheduleOopNoteChange={setScheduleOopNote}
                    onClearSchedule={handleClearSchedule}
                    onSaveSchedule={handleSaveSchedule}
                    savingSchedule={savingSchedule}
                />
            )}

            {/* RAIN / CLIMATE DELAY MODAL */}
            {showRainDelayModal && (
                <RainDelayModal
                    isOpen={showRainDelayModal}
                    onClose={() => setShowRainDelayModal(false)}
                    selectedOopDate={selectedOopDate}
                    formatFullDateDisplay={formatFullDateDisplay}
                    unplayedMatchesCount={oopDateMatches.filter(m => !m.is_played).length}
                    rainDelayMinutes={rainDelayMinutes}
                    onSelectRainDelayMinutes={setRainDelayMinutes}
                    onApplyRainDelay={handleApplyRainDelay}
                    isApplyingRainDelay={isApplyingRainDelay}
                />
            )}

            {/* INTERACTIVE CALENDAR DATE PICKER MODAL */}
            {showCalendarModal && (
                <CalendarPickerModal
                    isOpen={showCalendarModal}
                    onClose={() => setShowCalendarModal(false)}
                    calendarViewMonth={calendarViewMonth}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onGoToToday={() => {
                        const today = new Date();
                        setCalendarViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        handleSelectCalendarDate(today.toISOString().split('T')[0]);
                    }}
                    startDate={tournament?.start_date}
                    onSelectTournamentStartDate={() => {
                        if (!tournament?.start_date) return;
                        const [y, m] = tournament.start_date.split('-').map(Number);
                        setCalendarViewMonth(new Date(y, m - 1, 1));
                        handleSelectCalendarDate(tournament.start_date);
                    }}
                    scheduleDate={scheduleDate}
                    onSelectDate={handleSelectCalendarDate}
                    calendarCells={renderCalendarGrid()}
                    formatFullDateDisplay={formatFullDateDisplay}
                />
            )}

            {/* DELETE TOURNAMENT CONFIRMATION MODAL */}
            {showDeleteModal && tournament && (
                <DeleteTournamentModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    tournament={tournament}
                    playersCount={players.length}
                    matchesCount={matches.length}
                    onConfirm={handleDeleteTournament}
                    isDeleting={isDeletingTournament}
                />
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

            {/* EDIT TOURNAMENT MODAL (Organizador & Superadmin) */}
            {showEditTournamentModal && tournament && (
                <EditTournamentModal
                    isOpen={showEditTournamentModal}
                    onClose={() => setShowEditTournamentModal(false)}
                    tournament={tournament}
                    formData={editTournamentForm}
                    onFormChange={setEditTournamentForm}
                    onSubmit={handleSaveEditTournament}
                    isUpdating={isUpdatingTournament}
                />
            )}

            {/* PLAYER ENROLLMENT CONFIRMATION & AVAILABILITY MODAL */}
            {showPlayerEnrollModal && tournament && (
                <PlayerEnrollModal
                    isOpen={showPlayerEnrollModal}
                    onClose={() => setShowPlayerEnrollModal(false)}
                    tournament={tournament}
                    user={user}
                    effectivePrice={effectivePrice}
                    hostInstitution={hostInstitution}
                    copiedAlias={copiedAlias}
                    onCopyAlias={() => {
                        const val = hostInstitution?.alias_mp || hostInstitution?.cvu_mp || '';
                        navigator.clipboard.writeText(val);
                        setCopiedAlias(true);
                        setTimeout(() => setCopiedAlias(false), 3000);
                        addToast("¡Alias copiado al portapapeles!", 'success');
                    }}
                    enrollmentReceiptImage={enrollmentReceiptImage}
                    onReceiptImageChange={handleEnrollmentReceiptChange}
                    onRemoveReceiptImage={() => setEnrollmentReceiptImage(null)}
                    onViewReceipt={url => setViewingReceiptModal(url)}
                    playerAvailabilityNotes={playerAvailabilityNotes}
                    onAvailabilityNotesChange={setPlayerAvailabilityNotes}
                    onToggleAvailabilityChip={chip => {
                        if (playerAvailabilityNotes.includes(chip)) {
                            setPlayerAvailabilityNotes(prev => prev.replace(chip, '').replace(/^,\s*|,\s*$/g, '').trim());
                        } else {
                            setPlayerAvailabilityNotes(prev => prev ? `${prev}, ${chip}` : chip);
                        }
                    }}
                    onConfirmEnroll={handleConfirmPlayerEnroll}
                    isEnrolling={isEnrolling}
                />
            )}

            {/* MODAL DE JUGADORES INSCRIPTOS */}
            {showEnrolledModal && (
                <EnrolledPlayersModal
                    isOpen={showEnrolledModal}
                    onClose={() => setShowEnrolledModal(false)}
                    tournament={tournament}
                    players={players}
                    filteredPlayers={filteredEnrolledPlayers}
                    searchQuery={enrolledSearchQuery}
                    onSearchQueryChange={setEnrolledSearchQuery}
                    currentUser={user}
                    isClubAdmin={isClubAdmin}
                    onExportCSV={() => {
                        if (!tournament) return;
                        const profileMap: Record<string, any> = {};
                        allProfiles.forEach(prof => { profileMap[prof.id] = prof; });
                        exportTournamentPlayersToCSV(tournament, players, profileMap);
                        soundEffects.playScoreBeep();
                        addToast("¡Listado de inscriptos descargado en CSV!", "success");
                    }}
                    onOpenManualEnroll={() => {
                        setShowEnrolledModal(false);
                        openManualEnrollModal();
                    }}
                    onOpenReplaceModal={handleOpenReplaceModal}
                    onUnenrollPlayer={handleUnenrollPlayer}
                    onTogglePaymentStatus={handleTogglePaymentStatus}
                    onViewReceipt={url => setViewingReceiptModal(url)}
                    deletingPlayerId={deletingPlayerId}
                />
            )}

            {/* MODAL PARA OFICIALIZAR Y CONFIRMAR LLAVES */}
            {showOfficializeModal && (
                <OfficializeModal
                    isOpen={showOfficializeModal}
                    onClose={() => setShowOfficializeModal(false)}
                    unplayedGroupMatchesCount={unplayedGroupMatches.length}
                    zones={zones}
                    selectedOfficialFormat={selectedOfficialFormat}
                    onSelectOfficialFormat={setSelectedOfficialFormat}
                    allowByes={allowByes}
                    players={players}
                    onConfirm={handleConfirmOfficialPlayoffs}
                    generatingPlayoffs={generatingPlayoffs}
                />
            )}

            {/* MODAL EXPLICATIVO DE MÉTODOS DE PROYECCIÓN Y CRUCES */}
            {showProjectionHelpModal && (
                <ProjectionHelpModal
                    isOpen={showProjectionHelpModal}
                    onClose={() => setShowProjectionHelpModal(false)}
                />
            )}

            {/* Quick-Scorer Modal Ergonómico */}
            {selectedMatchForScore && showQuickScorer && (
                <MatchQuickScorerModal
                    isOpen={showQuickScorer}
                    onClose={() => {
                        setShowQuickScorer(false);
                        setSelectedMatchForScore(null);
                    }}
                    player1Name={selectedMatchForScore.team1_name || selectedMatchForScore.player1_name || 'Jugador 1'}
                    player2Name={selectedMatchForScore.team2_name || selectedMatchForScore.player2_name || 'Jugador 2'}
                    p1Id={selectedMatchForScore.player1_id}
                    p2Id={selectedMatchForScore.player2_id}
                    currentScore={selectedMatchForScore.score && typeof selectedMatchForScore.score === 'object' 
                        ? `${selectedMatchForScore.score.set1 || ''} ${selectedMatchForScore.score.set2 || ''} ${selectedMatchForScore.score.set3 || ''}`.trim()
                        : (selectedMatchForScore.score || '')
                    }
                    onSaveScore={handleQuickSaveScore}
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

            {/* Modal de Zoom / Previsualización de Comprobante de Pago */}
            {viewingReceiptModal && (
                <ReceiptViewerModal
                    receiptUrl={viewingReceiptModal}
                    onClose={() => setViewingReceiptModal(null)}
                />
            )}
        </div>
    );
};