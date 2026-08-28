import React, { useEffect, useState, useMemo } from 'react';
import { 
    UserProfile, Booking, Match, Tournament,
    CoachStudentPack, CoachStudentGoal, CoachGroup, 
    CoachAttendanceRecord, CoachDrill 
} from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { soundEffects } from '../services/soundEffects';
import { formatPlayerName } from '../utils/formatters';
import {
    GraduationCap, Users, Calendar, CheckCircle2, Clock, MessageCircle,
    Plus, Search, Award, Activity, FileText, ChevronRight, TrendingUp,
    Sparkles, Phone, ShieldCheck, AlertCircle, Filter, Check, X, Loader2,
    CalendarDays, Dumbbell, BookOpen, Star, Trash2, Edit3, DollarSign,
    CheckSquare, Square, Target, Swords, Trophy, Layers, ArrowRight,
    RefreshCw, Share2, Flame
} from 'lucide-react';

interface CoachDashboardProps {
    user: UserProfile;
    onNavigate?: (view: string, data?: any) => void;
}

interface StudentNote {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    topic: string;
    attendance: boolean;
    notes: string;
    categoryRecommended?: string;
}

// DEFAULT DRILLS DATABASE
const DEFAULT_DRILLS: CoachDrill[] = [
    {
        id: 'd1',
        title: 'Peloteo Profundo Cruzado con Dianas',
        level: 'Intermedio',
        category: 'Fondo de Cancha',
        description: 'Dos jugadores pelotean en diagonal buscando impactar detrás de la línea de saque contraria. Gana 1 punto quien logre 6 impactos consecutivos profundos.',
        durationMin: 15,
        playersNeeded: '2 a 4 jugadores',
        objective: 'Desarrollar altura, peso de bola y consistencia en el intercambio cruzado.'
    },
    {
        id: 'd2',
        title: 'Approach, Volea y Smash de Cierre',
        level: 'Avanzado',
        category: 'Volea y Red',
        description: 'El profesor alimenta bola corta; el alumno ataca con approach con slice o top, realiza primera volea de contención y define con smash sobre globo defensivo.',
        durationMin: 20,
        playersNeeded: '1 a 3 jugadores',
        objective: 'Transición fluida de fondo a la red y contundencia en la definición aérea.'
    },
    {
        id: 'd3',
        title: 'Saque + 1: Dominio del Primer Golpe',
        level: 'Todos',
        category: 'Servicio y Devolución',
        description: 'El servidor ejecuta 1er saque con dirección cantada (T o Abierto) y debe atacar con su derecha dominante el primer tiro devuelto a mitad de cancha.',
        durationMin: 15,
        playersNeeded: '2 jugadores',
        objective: 'Aprovechar la ventaja de la devolución corta para ganar la iniciativa del punto.'
    },
    {
        id: 'd4',
        title: 'Cruzada y Paralela en Dobles (Interceptación del Poacher)',
        level: 'Intermedio',
        category: 'Dobles',
        description: 'Peloteo cruzado de fondo en dobles. El jugador de red debe leer la trayectoria y cruzar a interceptar (poach) en el 3er o 4to impacto.',
        durationMin: 20,
        playersNeeded: '4 jugadores',
        objective: 'Agresividad en la red y coordinación táctica con el compañero de fondo.'
    },
    {
        id: 'd5',
        title: 'Juego de Presión 30-30',
        level: 'Avanzado',
        category: 'Táctico y Presión',
        description: 'Simulación de games comenzando en 30-30. Cada jugador debe declarar su patrón de juego antes de sacar o devolver.',
        durationMin: 25,
        playersNeeded: '2 a 4 jugadores',
        objective: 'Manejo de la ansiedad y toma de decisiones tácticas en momentos críticos del partido.'
    },
    {
        id: 'd6',
        title: 'Control de Efectos y Bola Corta (Drop Shot)',
        level: 'Iniciación',
        category: 'Fondo de Cancha',
        description: 'Trabajo de toque suave desde tres cuartos de cancha para esconder el drop shot sobre jugadores que esperan muy atrás de la línea de base.',
        durationMin: 15,
        playersNeeded: '2 jugadores',
        objective: 'Desarrollar sensibilidad en la empuñadura continental y variantes tácticas.'
    }
];

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ user, onNavigate }) => {
    const { addToast } = useToast();
    
    // Main Tab Navigation
    const [activeTab, setActiveTab] = useState<'students' | 'groups' | 'tournament_radar' | 'drills' | 'schedule_evals'>('students');

    // Global Players vs Coach's Assigned Roster
    const [allGlobalPlayers, setAllGlobalPlayers] = useState<UserProfile[]>([]);
    const [loadingAllPlayers, setLoadingAllPlayers] = useState(true);
    const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_roster_${user.id}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Sub-filters for My Students
    const [searchStudent, setSearchStudent] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

    // Packs & Payment Status Map
    const [packsMap, setPacksMap] = useState<Record<string, CoachStudentPack>>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_packs_${user.id}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // Technical Goals Map
    const [goalsMap, setGoalsMap] = useState<Record<string, CoachStudentGoal>>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_goals_${user.id}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // Training Groups State
    const [groups, setGroups] = useState<CoachGroup[]>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_groups_${user.id}`);
            return saved ? JSON.parse(saved) : [
                {
                    id: 'g-sample-1',
                    name: 'Escuela Adultos 4ta Cat',
                    description: 'Entrenamiento táctico de fondo y juego de red',
                    category: '4ta',
                    scheduleDays: ['Martes', 'Jueves'],
                    scheduleTime: '19:00 - 20:30',
                    courtName: 'Cancha 2',
                    studentIds: [],
                    maxStudents: 6,
                    color: 'emerald'
                },
                {
                    id: 'g-sample-2',
                    name: 'Clínica de Dobles Competitivo',
                    description: 'Formaciones, señas tácticas e interceptaciones',
                    category: '3ra',
                    scheduleDays: ['Sábados'],
                    scheduleTime: '10:00 - 12:00',
                    courtName: 'Cancha 1',
                    studentIds: [],
                    maxStudents: 4,
                    color: 'teal'
                }
            ];
        } catch (e) {
            return [];
        }
    });

    // Group Attendance History
    const [attendanceHistory, setAttendanceHistory] = useState<CoachAttendanceRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_attendance_${user.id}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Drills Library
    const [drillsList, setDrillsList] = useState<CoachDrill[]>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_drills_${user.id}`);
            return saved ? JSON.parse(saved) : DEFAULT_DRILLS;
        } catch (e) {
            return DEFAULT_DRILLS;
        }
    });
    const [drillLevelFilter, setDrillLevelFilter] = useState<string>('all');
    const [drillCategoryFilter, setDrillCategoryFilter] = useState<string>('all');

    // Recent Matches in Club for Tournament Radar
    const [recentMatches, setRecentMatches] = useState<Match[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    // Bookings & Day Schedule
    const [classesList, setClassesList] = useState<Booking[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);

    // Evaluation Notes Log
    const [evaluationsLog, setEvaluationsLog] = useState<StudentNote[]>(() => {
        try {
            const saved = localStorage.getItem(`smash_coach_evals_${user.id}`);
            return saved ? JSON.parse(saved) : [
                {
                    id: '1',
                    studentId: 'sample-1',
                    studentName: 'Lucas Benítez',
                    date: new Date().toISOString().split('T')[0],
                    topic: 'Servicio & Devolución con efecto',
                    attendance: true,
                    notes: 'Gran progreso en el primer saque plano y consistencia en el revés cruzado.',
                    categoryRecommended: '3ra'
                }
            ];
        } catch (e) {
            return [];
        }
    });

    // ==========================================
    // MODAL STATES
    // ==========================================
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');

    const [showPackModal, setShowPackModal] = useState(false);
    const [selectedStudentForPack, setSelectedStudentForPack] = useState<UserProfile | null>(null);
    const [packTotalClasses, setPackTotalClasses] = useState(4);
    const [packUsedClasses, setPackUsedClasses] = useState(0);
    const [packPrice, setPackPrice] = useState(15000);
    const [packPaymentStatus, setPackPaymentStatus] = useState<'paid' | 'pending'>('paid');

    const [showGoalModal, setShowGoalModal] = useState(false);
    const [selectedStudentForGoal, setSelectedStudentForGoal] = useState<UserProfile | null>(null);
    const [goalTechnicalNotes, setGoalTechnicalNotes] = useState('');
    const [goalStrengths, setGoalStrengths] = useState('');
    const [goalAreasToImprove, setGoalAreasToImprove] = useState('');
    const [goalCommitment, setGoalCommitment] = useState(4);

    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [groupCategory, setGroupCategory] = useState('4ta');
    const [groupDays, setGroupDays] = useState<string[]>(['Lunes', 'Miércoles']);
    const [groupTime, setGroupTime] = useState('18:00 - 19:30');
    const [groupCourt, setGroupCourt] = useState('Cancha 1');
    const [groupSelectedStudents, setGroupSelectedStudents] = useState<string[]>([]);

    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedGroupForAttendance, setSelectedGroupForAttendance] = useState<CoachGroup | null>(null);
    const [attendancePresentIds, setAttendancePresentIds] = useState<string[]>([]);
    const [attendanceTopic, setAttendanceTopic] = useState('');
    const [attendanceNotes, setAttendanceNotes] = useState('');

    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedStudentForEval, setSelectedStudentForEval] = useState<UserProfile | null>(null);
    const [evalCategory, setEvalCategory] = useState('3ra');
    const [evalNotes, setEvalNotes] = useState('');
    const [evaluating, setEvaluating] = useState(false);

    // Initial Data Fetching
    useEffect(() => {
        loadData();
    }, [user.institution_id]);

    const loadData = async () => {
        setLoadingAllPlayers(true);
        setLoadingClasses(true);
        setLoadingMatches(true);
        try {
            // 1. Load all platform players
            const allProfiles = await api.auth.getAllProfiles(1, 300);
            const validPlayers = (allProfiles || []).filter(p => p.role === 'player');
            setAllGlobalPlayers(validPlayers);

            // Auto-populate coach roster if empty with players from the same club
            if (assignedStudentIds.length === 0 && validPlayers.length > 0) {
                const clubPlayers = validPlayers
                    .filter(p => !user.institution_id || p.institution_id === user.institution_id)
                    .map(p => p.id);
                if (clubPlayers.length > 0) {
                    setAssignedStudentIds(clubPlayers);
                    localStorage.setItem(`smash_coach_roster_${user.id}`, JSON.stringify(clubPlayers));
                }
            }

            // 2. Load today's court bookings
            const todayStr = new Date().toISOString().split('T')[0];
            const bookings = await api.bookings.getByDate(todayStr, user.institution_id);
            setClassesList(bookings || []);

            // 3. Load recent matches for tournament radar
            const tournaments = await api.tournaments.getAll(user.institution_id);
            if (tournaments && tournaments.length > 0) {
                const allMatchesPromises = tournaments.slice(0, 5).map(t => api.matches.getByTournament(t.id));
                const results = await Promise.all(allMatchesPromises);
                const flatMatches = results.flat().filter(m => m && (m.is_played || m.winner_id));
                setRecentMatches(flatMatches);
            }
        } catch (e) {
            console.error("Error loading coach data:", e);
        } finally {
            setLoadingAllPlayers(false);
            setLoadingClasses(false);
            setLoadingMatches(false);
        }
    };

    // My Assigned Students List
    const myStudents = useMemo(() => {
        return allGlobalPlayers.filter(p => assignedStudentIds.includes(p.id));
    }, [allGlobalPlayers, assignedStudentIds]);

    const filteredMyStudents = useMemo(() => {
        const query = searchStudent.toLowerCase().trim();
        return myStudents.filter(s => {
            const fullName = `${s.name} ${s.lastname || ''}`.toLowerCase();
            const matchesQuery = !query || fullName.includes(query) || (s.dni && s.dni.includes(query));
            const matchesCat = selectedCategoryFilter === 'all' || s.category === selectedCategoryFilter;
            return matchesQuery && matchesCat;
        });
    }, [myStudents, searchStudent, selectedCategoryFilter]);

    // Global Search Players for Add Modal
    const searchGlobalResults = useMemo(() => {
        const query = globalSearchQuery.toLowerCase().trim();
        if (!query) return allGlobalPlayers.slice(0, 15);
        return allGlobalPlayers.filter(p => {
            const fullName = `${p.name} ${p.lastname || ''}`.toLowerCase();
            const dni = p.dni || '';
            const inst = (p.institution || '').toLowerCase();
            return fullName.includes(query) || dni.includes(query) || inst.includes(query);
        });
    }, [allGlobalPlayers, globalSearchQuery]);

    // ==========================================
    // ROSTER MANAGEMENT
    // ==========================================
    const handleAddStudentToRoster = (studentId: string, studentName: string) => {
        if (assignedStudentIds.includes(studentId)) {
            addToast(`${studentName} ya está en tu plantel.`, 'info');
            return;
        }
        const updated = [...assignedStudentIds, studentId];
        setAssignedStudentIds(updated);
        try {
            localStorage.setItem(`smash_coach_roster_${user.id}`, JSON.stringify(updated));
        } catch (e) {}

        soundEffects.playSuccessSound?.();
        addToast(`¡${studentName} sumado a tu plantel de alumnos!`, 'success');
    };

    const handleRemoveStudentFromRoster = (studentId: string, studentName: string) => {
        if (confirm(`¿Quitar a ${studentName} de tu lista de alumnos activos?`)) {
            const updated = assignedStudentIds.filter(id => id !== studentId);
            setAssignedStudentIds(updated);
            try {
                localStorage.setItem(`smash_coach_roster_${user.id}`, JSON.stringify(updated));
            } catch (e) {}
            addToast(`${studentName} quitado de tu plantel.`, 'info');
        }
    };

    // ==========================================
    // PACKS & PAYMENTS
    // ==========================================
    const handleOpenPackModal = (student: UserProfile) => {
        setSelectedStudentForPack(student);
        const existing = packsMap[student.id];
        if (existing) {
            setPackTotalClasses(existing.totalClasses);
            setPackUsedClasses(existing.usedClasses);
            setPackPrice(existing.price);
            setPackPaymentStatus(existing.paymentStatus);
        } else {
            setPackTotalClasses(4);
            setPackUsedClasses(0);
            setPackPrice(15000);
            setPackPaymentStatus('paid');
        }
        setShowPackModal(true);
    };

    const handleSavePack = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentForPack) return;

        const newPack: CoachStudentPack = {
            studentId: selectedStudentForPack.id,
            totalClasses: Number(packTotalClasses),
            usedClasses: Number(packUsedClasses),
            price: Number(packPrice),
            paymentStatus: packPaymentStatus,
            updatedAt: new Date().toISOString()
        };

        const updatedMap = { ...packsMap, [selectedStudentForPack.id]: newPack };
        setPacksMap(updatedMap);
        try {
            localStorage.setItem(`smash_coach_packs_${user.id}`, JSON.stringify(updatedMap));
        } catch (e) {}

        soundEffects.playScoreBeep();
        addToast(`Pack actualizado para ${formatPlayerName(selectedStudentForPack.name)}`, 'success');
        setShowPackModal(false);
    };

    const handleIncrementPackClass = (studentId: string, studentName: string) => {
        const existing = packsMap[studentId] || {
            studentId,
            totalClasses: 4,
            usedClasses: 0,
            price: 15000,
            paymentStatus: 'paid'
        };

        const nextUsed = existing.usedClasses + 1;
        const isFinished = nextUsed >= existing.totalClasses;

        const updatedPack: CoachStudentPack = {
            ...existing,
            usedClasses: nextUsed,
            paymentStatus: isFinished ? 'pending' : existing.paymentStatus,
            updatedAt: new Date().toISOString()
        };

        const updatedMap = { ...packsMap, [studentId]: updatedPack };
        setPacksMap(updatedMap);
        try {
            localStorage.setItem(`smash_coach_packs_${user.id}`, JSON.stringify(updatedMap));
        } catch (e) {}

        soundEffects.playScoreBeep();
        if (isFinished) {
            addToast(`¡${studentName} completó su pack de ${existing.totalClasses} clases! Renovación pendiente.`, 'info');
        } else {
            addToast(`Asistencia sumada para ${studentName} (${nextUsed}/${existing.totalClasses})`, 'success');
        }
    };

    // ==========================================
    // TECHNICAL GOALS
    // ==========================================
    const handleOpenGoalModal = (student: UserProfile) => {
        setSelectedStudentForGoal(student);
        const existing = goalsMap[student.id];
        if (existing) {
            setGoalTechnicalNotes(existing.technicalGoals || '');
            setGoalStrengths(existing.strengths || '');
            setGoalAreasToImprove(existing.areasToImprove || '');
            setGoalCommitment(existing.commitmentLevel || 4);
        } else {
            setGoalTechnicalNotes('');
            setGoalStrengths('');
            setGoalAreasToImprove('');
            setGoalCommitment(4);
        }
        setShowGoalModal(true);
    };

    const handleSaveGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentForGoal) return;

        const newGoal: CoachStudentGoal = {
            studentId: selectedStudentForGoal.id,
            technicalGoals: goalTechnicalNotes.trim(),
            strengths: goalStrengths.trim(),
            areasToImprove: goalAreasToImprove.trim(),
            commitmentLevel: goalCommitment,
            updatedAt: new Date().toISOString()
        };

        const updatedMap = { ...goalsMap, [selectedStudentForGoal.id]: newGoal };
        setGoalsMap(updatedMap);
        try {
            localStorage.setItem(`smash_coach_goals_${user.id}`, JSON.stringify(updatedMap));
        } catch (e) {}

        soundEffects.playScoreBeep();
        addToast(`Objetivos técnicos guardados para ${formatPlayerName(selectedStudentForGoal.name)}`, 'success');
        setShowGoalModal(false);
    };

    // ==========================================
    // TRAINING GROUPS
    // ==========================================
    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;

        const newGroup: CoachGroup = {
            id: `grp-${Date.now()}`,
            name: groupName.trim(),
            description: groupDesc.trim(),
            category: groupCategory,
            scheduleDays: groupDays,
            scheduleTime: groupTime.trim(),
            courtName: groupCourt.trim(),
            studentIds: groupSelectedStudents,
            maxStudents: 8,
            color: 'emerald',
            createdAt: new Date().toISOString()
        };

        const updated = [...groups, newGroup];
        setGroups(updated);
        try {
            localStorage.setItem(`smash_coach_groups_${user.id}`, JSON.stringify(updated));
        } catch (e) {}

        soundEffects.playScoreBeep();
        addToast(`Grupo "${newGroup.name}" creado con éxito.`, 'success');
        setShowCreateGroupModal(false);
        setGroupName('');
        setGroupDesc('');
        setGroupSelectedStudents([]);
    };

    const handleDeleteGroup = (groupId: string, groupTitle: string) => {
        if (confirm(`¿Eliminar el grupo "${groupTitle}"?`)) {
            const updated = groups.filter(g => g.id !== groupId);
            setGroups(updated);
            try {
                localStorage.setItem(`smash_coach_groups_${user.id}`, JSON.stringify(updated));
            } catch (e) {}
            addToast(`Grupo eliminado.`, 'info');
        }
    };

    const handleOpenAttendanceModal = (group: CoachGroup) => {
        setSelectedGroupForAttendance(group);
        setAttendancePresentIds([...group.studentIds]); // Default to all present
        setAttendanceTopic('');
        setAttendanceNotes('');
        setShowAttendanceModal(true);
    };

    const handleSaveAttendance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroupForAttendance) return;

        const record: CoachAttendanceRecord = {
            id: `att-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            groupId: selectedGroupForAttendance.id,
            groupName: selectedGroupForAttendance.name,
            presentStudentIds: attendancePresentIds,
            topic: attendanceTopic.trim() || 'Entrenamiento técnico-táctico grupal',
            notes: attendanceNotes.trim()
        };

        // Increment used classes for all present students with active packs
        const updatedPacks = { ...packsMap };
        attendancePresentIds.forEach(stId => {
            const pack = updatedPacks[stId];
            if (pack) {
                updatedPacks[stId] = {
                    ...pack,
                    usedClasses: pack.usedClasses + 1,
                    updatedAt: new Date().toISOString()
                };
            }
        });
        setPacksMap(updatedPacks);
        try {
            localStorage.setItem(`smash_coach_packs_${user.id}`, JSON.stringify(updatedPacks));
        } catch (e) {}

        const updatedHistory = [record, ...attendanceHistory];
        setAttendanceHistory(updatedHistory);
        try {
            localStorage.setItem(`smash_coach_attendance_${user.id}`, JSON.stringify(updatedHistory));
        } catch (e) {}

        soundEffects.playScoreBeep();
        addToast(`¡Asistencia tomada para ${attendancePresentIds.length} alumnos del grupo "${selectedGroupForAttendance.name}"!`, 'success');
        setShowAttendanceModal(false);
    };

    // ==========================================
    // EVALUATIONS & TECHNICAL ENDORSEMENTS
    // ==========================================
    const handleSaveEvaluation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentForEval) return;

        setEvaluating(true);
        try {
            const newRecord: StudentNote = {
                id: Date.now().toString(),
                studentId: selectedStudentForEval.id,
                studentName: formatPlayerName(selectedStudentForEval.name, selectedStudentForEval.lastname),
                date: new Date().toISOString().split('T')[0],
                topic: 'Evaluación Técnica & Recomendación de Categoría',
                attendance: true,
                notes: evalNotes.trim() || 'Evaluación periódica de rendimiento y técnica.',
                categoryRecommended: evalCategory
            };

            const updated = [newRecord, ...evaluationsLog];
            setEvaluationsLog(updated);
            try {
                localStorage.setItem(`smash_coach_evals_${user.id}`, JSON.stringify(updated));
            } catch (e) {}

            soundEffects.playScoreBeep();
            addToast(`¡Recomendación registrada para ${newRecord.studentName}! Sugerido para ${evalCategory} categoría.`, 'success');
            setShowEvalModal(false);
            setEvalNotes('');
            setSelectedStudentForEval(null);
        } catch (err: any) {
            addToast('Error al registrar evaluación', 'error');
        } finally {
            setEvaluating(false);
        }
    };

    // ==========================================
    // WHATSAPP DIRECT ACTION
    // ==========================================
    const handleWhatsAppStudent = (student: UserProfile, customMsg?: string) => {
        const phone = student.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const pack = packsMap[student.id];

        let defaultMsg = `¡Hola ${formatPlayerName(student.name)}! Te escribo del equipo de entrenamiento de tenis de ${user.institution || 'el club'}.`;
        if (pack && pack.paymentStatus === 'pending') {
            defaultMsg = `¡Hola ${formatPlayerName(student.name)}! Te recuerdo que está disponible la renovación de tu pack de clases ($${pack.price}) para ${user.institution || 'el club'}. ¡Nos vemos en cancha! 🎾`;
        }

        const message = encodeURIComponent(customMsg || defaultMsg);
        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone}?text=${message}`, '_blank');
        } else {
            addToast(`El alumno ${formatPlayerName(student.name)} no tiene WhatsApp registrado.`, 'info');
        }
    };

    // Filtered Drills
    const filteredDrills = useMemo(() => {
        return drillsList.filter(d => {
            const matchesLevel = drillLevelFilter === 'all' || d.level === drillLevelFilter || d.level === 'Todos';
            const matchesCat = drillCategoryFilter === 'all' || d.category === drillCategoryFilter;
            return matchesLevel && matchesCat;
        });
    }, [drillsList, drillLevelFilter, drillCategoryFilter]);

    // Student Tournament Matches
    const studentTournamentMatches = useMemo(() => {
        const studentIdsSet = new Set(assignedStudentIds);
        return recentMatches.filter(m => {
            const p1Match = m.player1_id && studentIdsSet.has(m.player1_id);
            const p2Match = m.player2_id && studentIdsSet.has(m.player2_id);
            return p1Match || p2Match;
        });
    }, [recentMatches, assignedStudentIds]);

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/25 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">Suite de Entrenamiento & Clases</h1>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <Sparkles size={11} /> Profesor Oficial
                                </span>
                            </div>
                            <p className="text-slate-300 text-xs mt-1">
                                Gestión de plantel de alumnos, grupos de entrenamiento, control de packs/abonos, drills y seguimiento para {user.institution || 'el club'}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full lg:w-auto">
                        <button
                            onClick={() => setShowAddStudentModal(true)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                        >
                            <Plus size={15} /> Sumar Alumno al Plantel
                        </button>
                        <button
                            onClick={() => {
                                if (onNavigate) onNavigate('bookings');
                            }}
                            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5"
                            title="Ver Turnero y Ocupación de Canchas"
                        >
                            <Calendar size={15} className="text-emerald-400" /> Canchas
                        </button>
                    </div>
                </div>

                {/* Quick Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Mi Plantel</span>
                        <div className="text-2xl font-black text-white mt-0.5">{myStudents.length} <span className="text-xs text-muted font-normal">alumnos</span></div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Grupos de Clase</span>
                        <div className="text-2xl font-black text-emerald-400 mt-0.5">{groups.length}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Cuotas al Día</span>
                        <div className="text-2xl font-black text-teal-300 mt-0.5">
                            {Object.values(packsMap).filter(p => p.paymentStatus === 'paid').length} / {myStudents.length || 0}
                        </div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Turnos Hoy</span>
                        <div className="text-2xl font-black text-white mt-0.5">{classesList.length}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Drills Listos</span>
                        <div className="text-2xl font-black text-amber-300 mt-0.5">{drillsList.length}</div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'students'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users size={15} /> Mi Plantel de Alumnos ({myStudents.length})
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'groups'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Layers size={15} /> Grupos de Entrenamiento ({groups.length})
                </button>
                <button
                    onClick={() => setActiveTab('tournament_radar')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'tournament_radar'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Trophy size={15} /> Radar de Torneos ({studentTournamentMatches.length})
                </button>
                <button
                    onClick={() => setActiveTab('drills')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'drills'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Dumbbell size={15} /> Banco de Drills ({drillsList.length})
                </button>
                <button
                    onClick={() => setActiveTab('schedule_evals')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'schedule_evals'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Calendar size={15} /> Turnos & Evaluaciones ({evaluationsLog.length})
                </button>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: MI PLANTEL DE ALUMNOS (ROSTER + PACKS + OBJETIVOS)                 */}
            {/* ========================================================================= */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    {/* Filter & Actions Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-white/10 rounded-2xl p-3">
                        <div className="relative flex-1 w-full">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar en mis alumnos por nombre o DNI..."
                                value={searchStudent}
                                onChange={e => setSearchStudent(e.target.value)}
                                className="w-full bg-sidebar border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter size={14} className="text-muted shrink-0" />
                            <select
                                value={selectedCategoryFilter}
                                onChange={e => setSelectedCategoryFilter(e.target.value)}
                                className="bg-sidebar border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:border-emerald-500 outline-none"
                            >
                                <option value="all">Todas las categorías</option>
                                <option value="1ra">1ra Categoría</option>
                                <option value="2da">2da Categoría</option>
                                <option value="3ra">3ra Categoría</option>
                                <option value="4ta">4ta Categoría</option>
                                <option value="5ta">5ta Categoría</option>
                                <option value="6ta">6ta Categoría</option>
                            </select>
                            <button
                                onClick={() => setShowAddStudentModal(true)}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shadow-md shadow-emerald-600/20"
                            >
                                <Plus size={14} /> Sumar Alumno
                            </button>
                        </div>
                    </div>

                    {/* Students Grid */}
                    {loadingAllPlayers ? (
                        <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
                            <Loader2 size={24} className="animate-spin text-emerald-400" />
                            <span className="text-xs">Cargando plantel de alumnos...</span>
                        </div>
                    ) : filteredMyStudents.length === 0 ? (
                        <Card className="p-10 text-center bg-slate-900/40 border-white/5">
                            <Users size={40} className="mx-auto text-muted mb-3 opacity-40" />
                            <h4 className="text-sm font-bold text-white">No hay alumnos en tu lista activa</h4>
                            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                                Puedes buscar cualquier jugador registrado en el padrón de la app y sumarlo a tu plantel de entrenamiento.
                            </p>
                            <button
                                onClick={() => setShowAddStudentModal(true)}
                                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                            >
                                <Plus size={14} /> Explorar y Sumar Alumnos
                            </button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMyStudents.map(student => {
                                const formattedName = formatPlayerName(student.name, student.lastname);
                                const isFemale = (student.gender || '').toLowerCase().includes('fem');
                                const pack = packsMap[student.id] || {
                                    studentId: student.id,
                                    totalClasses: 4,
                                    usedClasses: 0,
                                    price: 15000,
                                    paymentStatus: 'paid'
                                };
                                const goal = goalsMap[student.id];
                                const isFinishedPack = pack.usedClasses >= pack.totalClasses;

                                return (
                                    <div key={student.id} className="bg-card border border-white/10 rounded-2xl p-4 space-y-3.5 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm relative group">
                                        <div>
                                            {/* Top info */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                                                        {student.profile_picture_url ? (
                                                            <img src={student.profile_picture_url} alt={formattedName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            formattedName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">{formattedName}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                                                {student.category || '4ta'} Cat.
                                                            </span>
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                                {isFemale ? 'Damas' : 'Caballeros'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveStudentFromRoster(student.id, formattedName)}
                                                    className="text-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Quitar de mi lista de alumnos"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Pack Progress & Payment */}
                                            <div className="mt-3 bg-black/25 p-2.5 rounded-xl border border-white/5 space-y-2">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-muted font-semibold flex items-center gap-1">
                                                        <Clock size={11} className="text-emerald-400" /> Pack de Clases
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${pack.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                        {pack.paymentStatus === 'paid' ? '🟢 Al día' : '🟡 Cuota Pendiente'}
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-slate-300 font-mono">
                                                        <span>{pack.usedClasses} de {pack.totalClasses} clases tomadas</span>
                                                        <span>${pack.price}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-300 ${isFinishedPack ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                            style={{ width: `${Math.min(100, (pack.usedClasses / pack.totalClasses) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Fast Class Increment Button */}
                                                <div className="flex items-center justify-between pt-1 gap-2">
                                                    <button
                                                        onClick={() => handleIncrementPackClass(student.id, formattedName)}
                                                        className="flex-1 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                                                        title="Registrar 1 clase tomada"
                                                    >
                                                        <Plus size={11} /> +1 Clase
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenPackModal(student)}
                                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-muted hover:text-white rounded-lg text-[10px] font-semibold transition-all"
                                                        title="Ajustar Pack y Precio"
                                                    >
                                                        <Edit3 size={11} /> Ajustar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Technical Goal Pill */}
                                            {goal && goal.technicalGoals && (
                                                <div className="mt-2 text-[10px] bg-teal-950/40 border border-teal-500/20 p-2 rounded-xl text-teal-200 flex items-start gap-1.5">
                                                    <Target size={12} className="text-teal-400 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2"><strong>Objetivo:</strong> {goal.technicalGoals}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Action Buttons */}
                                        <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-1.5">
                                            <button
                                                onClick={() => handleWhatsAppStudent(student)}
                                                className="py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                                title="Contactar o enviar recordatorio por WhatsApp"
                                            >
                                                <MessageCircle size={12} /> WhatsApp
                                            </button>
                                            <button
                                                onClick={() => handleOpenGoalModal(student)}
                                                className="py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                                title="Configurar objetivos técnicos y plan de trabajo"
                                            >
                                                <Target size={12} /> Metas
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedStudentForEval(student);
                                                    setEvalCategory(student.category || '3ra');
                                                    setShowEvalModal(true);
                                                }}
                                                className="py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                                title="Emitir recomendación de categoría"
                                            >
                                                <Award size={12} /> Evaluar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: GRUPOS DE ENTRENAMIENTO                                            */}
            {/* ========================================================================= */}
            {activeTab === 'groups' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Layers size={18} className="text-emerald-400" /> Grupos de Entrenamiento & Clases Grupales
                            </h3>
                            <p className="text-xs text-muted">Organización de escuelas, clínicas y turnos compartidos con toma de asistencia rápida</p>
                        </div>
                        <button
                            onClick={() => setShowCreateGroupModal(true)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                        >
                            <Plus size={14} /> Nuevo Grupo
                        </button>
                    </div>

                    {groups.length === 0 ? (
                        <Card className="p-10 text-center bg-slate-900/40 border-white/5">
                            <Layers size={40} className="mx-auto text-muted mb-3 opacity-40" />
                            <h4 className="text-sm font-bold text-white">No tienes grupos de entrenamiento creados</h4>
                            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                                Arma grupos con tus alumnos (ej. "Adultos 4ta", "Escuela de Menores") para gestionar horarios y asistencias en 1 clic.
                            </p>
                            <button
                                onClick={() => setShowCreateGroupModal(true)}
                                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                            >
                                <Plus size={14} /> Crear Primer Grupo
                            </button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(grp => {
                                const enrolledStudents = myStudents.filter(s => grp.studentIds.includes(s.id));

                                return (
                                    <div key={grp.id} className="bg-card border border-white/10 rounded-2xl p-5 space-y-4 hover:border-emerald-500/40 transition-all shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white">{grp.name}</span>
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.2 rounded-full border border-emerald-500/30">
                                                        {grp.category || '4ta'} Cat.
                                                    </span>
                                                </div>
                                                {grp.description && (
                                                    <p className="text-xs text-muted mt-1">{grp.description}</p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleDeleteGroup(grp.id, grp.name)}
                                                className="text-muted hover:text-red-400 p-1 transition-colors"
                                                title="Eliminar grupo"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        {/* Schedule Info */}
                                        <div className="bg-black/30 p-3 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] text-muted block uppercase font-bold">Días & Horario</span>
                                                <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} className="text-emerald-400" /> {grp.scheduleDays.join(', ')} ({grp.scheduleTime})
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted block uppercase font-bold">Cancha Asignada</span>
                                                <span className="text-emerald-400 font-bold mt-0.5 block">{grp.courtName || 'Cancha Principal'}</span>
                                            </div>
                                        </div>

                                        {/* Enrolled Students Avatars & Names */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted font-bold">Alumnos Asignados ({enrolledStudents.length}):</span>
                                            </div>

                                            {enrolledStudents.length === 0 ? (
                                                <p className="text-xs text-muted italic">Aún no hay alumnos asignados a este grupo.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {enrolledStudents.map(st => (
                                                        <span key={st.id} className="text-[11px] bg-white/5 border border-white/10 text-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                            {formatPlayerName(st.name)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => handleOpenAttendanceModal(grp)}
                                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                                            >
                                                <CheckSquare size={14} /> Tomar Asistencia
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Attendance History Section */}
                    {attendanceHistory.length > 0 && (
                        <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
                            <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={13} className="text-teal-400" /> Historial de Asistencias Grupales Recientes
                            </h4>
                            <div className="space-y-2">
                                {attendanceHistory.slice(0, 5).map(item => (
                                    <div key={item.id} className="bg-card border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                        <div>
                                            <span className="font-bold text-white">{item.groupName}</span>
                                            <span className="text-muted ml-2">({item.presentStudentIds.length} presentes)</span>
                                            <div className="text-slate-300 text-[11px] mt-0.5 italic">"{item.topic}"</div>
                                        </div>
                                        <span className="text-[10px] font-mono text-muted bg-white/5 px-2 py-0.5 rounded-md">
                                            {item.date}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: RADAR DE TORNEOS (COMPETENCIA DE ALUMNOS)                          */}
            {/* ========================================================================= */}
            {activeTab === 'tournament_radar' && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Trophy size={18} className="text-amber-400" /> Radar de Rendimiento en Torneos
                        </h3>
                        <p className="text-xs text-muted">Resultados oficiales y partidos disputados por los alumnos de tu plantel en torneos del club</p>
                    </div>

                    {loadingMatches ? (
                        <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
                            <Loader2 size={24} className="animate-spin text-emerald-400" />
                            <span className="text-xs">Analizando partidos de torneos...</span>
                        </div>
                    ) : studentTournamentMatches.length === 0 ? (
                        <Card className="p-10 text-center bg-slate-900/40 border-white/5">
                            <Swords size={40} className="mx-auto text-muted mb-3 opacity-40" />
                            <h4 className="text-sm font-bold text-white">Sin partidos recientes en torneos</h4>
                            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                                Cuando tus alumnos jueguen partidos en torneos del club, podrás ver sus marcadores, victorias y aspectos a pulir en sus próximas clases.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {studentTournamentMatches.map(match => {
                                const isP1MyStudent = assignedStudentIds.includes(match.player1_id || '');
                                const isP2MyStudent = assignedStudentIds.includes(match.player2_id || '');
                                const isP1Winner = match.winner_id === match.player1_id;

                                return (
                                    <div key={match.id} className="bg-card border border-white/10 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 transition-all shadow-sm">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                {match.tournaments?.name || 'Torneo Oficial'}
                                            </span>
                                            <span className="text-muted font-mono text-[11px]">{match.round || 'Ronda'}</span>
                                        </div>

                                        {/* Players & Score */}
                                        <div className="space-y-1.5 bg-black/25 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 font-bold truncate">
                                                    <span className={isP1Winner ? 'text-white' : 'text-muted'}>
                                                        {formatPlayerName(match.player1_name || 'Jugador 1')}
                                                    </span>
                                                    {isP1MyStudent && (
                                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">Mi Alumno</span>
                                                    )}
                                                </div>
                                                {isP1Winner && <Trophy size={13} className="text-amber-400 shrink-0" />}
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 font-bold truncate">
                                                    <span className={!isP1Winner && match.winner_id ? 'text-white' : 'text-muted'}>
                                                        {formatPlayerName(match.player2_name || 'Jugador 2')}
                                                    </span>
                                                    {isP2MyStudent && (
                                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">Mi Alumno</span>
                                                    )}
                                                </div>
                                                {!isP1Winner && match.winner_id && <Trophy size={13} className="text-amber-400 shrink-0" />}
                                            </div>

                                            {match.score && (
                                                <div className="pt-2 border-t border-white/5 text-right font-mono text-xs font-bold text-emerald-400">
                                                    Resultado: {typeof match.score === 'string' ? match.score : JSON.stringify(match.score)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action / Coach Followup */}
                                        <div className="pt-1 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    const targetStudent = myStudents.find(s => s.id === match.player1_id || s.id === match.player2_id);
                                                    if (targetStudent) {
                                                        const won = targetStudent.id === match.winner_id;
                                                        const msg = won 
                                                            ? `¡Felicitaciones ${formatPlayerName(targetStudent.name)} por el triunfo en el torneo! Gran partido. Lo repasamos en la próxima clase 🎾🔥` 
                                                            : `¡Hola ${formatPlayerName(targetStudent.name)}! Buen esfuerzo en el partido del torneo. En la próxima clase trabajamos esos puntos clave para seguir mejorando 💪🎾`;
                                                        handleWhatsAppStudent(targetStudent, msg);
                                                    }
                                                }}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                            >
                                                <MessageCircle size={13} /> Devolución por WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: BANCO DE DRILLS & EJERCICIOS                                       */}
            {/* ========================================================================= */}
            {activeTab === 'drills' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-white/10 rounded-2xl p-3">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Dumbbell size={18} className="text-teal-400" /> Biblioteca de Drills & Ejercicios
                            </h3>
                            <p className="text-xs text-muted">Ejercicios pedagógicos listos para planificar clases individuales y grupales</p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={drillLevelFilter}
                                onChange={e => setDrillLevelFilter(e.target.value)}
                                className="bg-sidebar border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold outline-none"
                            >
                                <option value="all">Todos los niveles</option>
                                <option value="Iniciación">Iniciación</option>
                                <option value="Intermedio">Intermedio</option>
                                <option value="Avanzado">Avanzado</option>
                            </select>

                            <select
                                value={drillCategoryFilter}
                                onChange={e => setDrillCategoryFilter(e.target.value)}
                                className="bg-sidebar border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold outline-none"
                            >
                                <option value="all">Todos los focos</option>
                                <option value="Fondo de Cancha">Fondo de Cancha</option>
                                <option value="Volea y Red">Volea y Red</option>
                                <option value="Servicio y Devolución">Servicio y Devolución</option>
                                <option value="Dobles">Dobles</option>
                                <option value="Táctico y Presión">Táctico y Presión</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDrills.map(drill => (
                            <div key={drill.id} className="bg-card border border-white/10 rounded-2xl p-5 space-y-3.5 hover:border-teal-500/40 transition-all flex flex-col justify-between shadow-sm">
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-bold text-white leading-tight">{drill.title}</h4>
                                        <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-500/30 whitespace-nowrap">
                                            {drill.level}
                                        </span>
                                    </div>

                                    <span className="text-[10px] text-muted font-bold block mt-1 uppercase tracking-wider">
                                        {drill.category}
                                    </span>

                                    <p className="text-xs text-slate-300 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed">
                                        {drill.description}
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5 text-[11px]">
                                    <div className="flex justify-between text-muted">
                                        <span>Duración: <strong className="text-white">{drill.durationMin} min</strong></span>
                                        <span>Jugadores: <strong className="text-white">{drill.playersNeeded}</strong></span>
                                    </div>
                                    <div className="text-[10px] text-teal-300 font-semibold">
                                        🎯 {drill.objective}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: TURNOS DE HOY & EVALUACIONES PEDAGÓGICAS                           */}
            {/* ========================================================================= */}
            {activeTab === 'schedule_evals' && (
                <div className="space-y-6">
                    {/* Today's Bookings */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <CalendarDays size={18} className="text-emerald-400" /> Turnos del Día de Hoy
                            </h3>
                            <p className="text-xs text-muted">Horarios programados en las canchas de {user.institution || 'la sede'}</p>
                        </div>

                        {loadingClasses ? (
                            <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
                                <Loader2 size={24} className="animate-spin text-emerald-400" />
                                <span className="text-xs">Cargando agenda de turnos...</span>
                            </div>
                        ) : classesList.length === 0 ? (
                            <Card className="p-8 text-center bg-slate-900/40 border-white/5">
                                <Calendar size={36} className="mx-auto text-muted mb-3 opacity-50" />
                                <h4 className="text-sm font-bold text-white">No hay turnos registrados para hoy</h4>
                                <p className="text-xs text-muted mt-1">
                                    Puedes reservar canchas para tus clases particulares o grupales desde el Turnero.
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {classesList.map((cls, idx) => (
                                    <div key={cls.id || idx} className="bg-card border border-white/10 rounded-2xl p-4 space-y-3 hover:border-emerald-500/40 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                {cls.court_name || 'Cancha'}
                                            </span>
                                            <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                                                <Clock size={12} className="text-muted" /> {cls.start_time} - {cls.end_time} hs
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-white truncate">
                                                {formatPlayerName(cls.user_name || 'Jugador')}
                                            </div>
                                            <div className="text-[11px] text-muted capitalize flex items-center gap-2">
                                                <span>Estado: {cls.status === 'confirmed' ? '🟢 Confirmada' : '🟡 Pendiente'}</span>
                                                {cls.price ? <span className="font-mono text-slate-300">${cls.price}</span> : null}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => {
                                                    const msg = `¡Hola! Te recuerdo tu turno hoy a las ${cls.start_time} hs en ${cls.court_name} en ${user.institution || 'el club'}. ¡Nos vemos en cancha! 🎾`;
                                                    if (cls.user_name) {
                                                        const found = myStudents.find(s => s.name.includes(cls.user_name || '') || s.id === cls.user_id);
                                                        if (found) handleWhatsAppStudent(found, msg);
                                                        else addToast('Mensaje de recordatorio preparado.', 'info');
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                            >
                                                <MessageCircle size={13} /> Recordar por WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Evaluations Log */}
                    <div className="space-y-4 pt-6 border-t border-white/10">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Award size={18} className="text-teal-400" /> Registro de Evaluaciones y Avales Técnicos
                            </h3>
                            <p className="text-xs text-muted">Historial de notas pedagógicas y ascensos sugeridos por el profesor</p>
                        </div>

                        {evaluationsLog.length === 0 ? (
                            <Card className="p-8 text-center bg-slate-900/40 border-white/5">
                                <Award size={36} className="mx-auto text-muted mb-3 opacity-50" />
                                <h4 className="text-sm font-bold text-white">No hay evaluaciones registradas</h4>
                                <p className="text-xs text-muted mt-1">
                                    Selecciona un alumno desde la pestaña "Mi Plantel de Alumnos" para emitir una recomendación técnica.
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-2.5">
                                {evaluationsLog.map(note => (
                                    <div key={note.id} className="bg-card border border-white/10 rounded-2xl p-4 space-y-2 hover:border-emerald-500/30 transition-all">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-xs sm:text-sm">{note.studentName}</span>
                                                {note.categoryRecommended && (
                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                                        <TrendingUp size={10} /> Sugerido para {note.categoryRecommended} Cat.
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted font-mono bg-white/5 px-2 py-0.5 rounded-md">
                                                {note.date}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed">
                                            "{note.notes}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: BUSCADOR & AGREGADO GLOBAL DE ALUMNOS                            */}
            {/* ========================================================================= */}
            {showAddStudentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Padrón General de Jugadores</h3>
                                    <p className="text-xs text-muted">Busca y suma jugadores de la app a tu plantel de alumnos</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddStudentModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-white/10 bg-sidebar/50">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, apellido, DNI o club..."
                                    value={globalSearchQuery}
                                    onChange={e => setGlobalSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-card border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 max-h-[60vh]">
                            {searchGlobalResults.length === 0 ? (
                                <div className="text-center py-8 text-muted text-xs">
                                    No se encontraron jugadores que coincidan con la búsqueda.
                                </div>
                            ) : (
                                searchGlobalResults.map(player => {
                                    const formattedName = formatPlayerName(player.name, player.lastname);
                                    const isAlreadyInRoster = assignedStudentIds.includes(player.id);

                                    return (
                                        <div key={player.id} className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                                                    {player.profile_picture_url ? (
                                                        <img src={player.profile_picture_url} alt={formattedName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        formattedName.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{formattedName}</div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                                                        <span className="text-emerald-400 font-bold">{player.category || '4ta'} Cat.</span>
                                                        <span>•</span>
                                                        <span className="truncate">{player.institution || 'Sin Club'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isAlreadyInRoster ? (
                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                    <Check size={12} /> En mi plantel
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddStudentToRoster(player.id, formattedName)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                                                >
                                                    <Plus size={13} /> Sumar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={() => setShowAddStudentModal(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: CONFIGURACIÓN DE PACK / ABONO DE CLASES                           */}
            {/* ========================================================================= */}
            {showPackModal && selectedStudentForPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Pack de Clases & Cuota</h3>
                                    <p className="text-xs text-muted">{formatPlayerName(selectedStudentForPack.name, selectedStudentForPack.lastname)}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPackModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePack} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Total de Clases del Pack</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={packTotalClasses}
                                        onChange={e => setPackTotalClasses(Number(e.target.value))}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Clases Consumidas</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={packTotalClasses}
                                        value={packUsedClasses}
                                        onChange={e => setPackUsedClasses(Number(e.target.value))}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Arancel Mensual / Precio ($)</label>
                                <input
                                    type="number"
                                    step="500"
                                    value={packPrice}
                                    onChange={e => setPackPrice(Number(e.target.value))}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Estado de Pago de la Cuota</label>
                                <select
                                    value={packPaymentStatus}
                                    onChange={e => setPackPaymentStatus(e.target.value as any)}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                >
                                    <option value="paid">🟢 Al día (Abonado)</option>
                                    <option value="pending">🟡 Pendiente de Pago</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPackModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Guardar Pack
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: FICHA DE OBJETIVOS TÉCNICOS                                      */}
            {/* ========================================================================= */}
            {showGoalModal && selectedStudentForGoal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Plan de Trabajo & Objetivos</h3>
                                    <p className="text-xs text-muted">{formatPlayerName(selectedStudentForGoal.name, selectedStudentForGoal.lastname)}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGoalModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveGoal} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Objetivo Técnico Principal *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={goalTechnicalNotes}
                                    onChange={e => setGoalTechnicalNotes(e.target.value)}
                                    placeholder="Ej: Lograr consistencia de revés cruzado con top y punto de impacto adelante en el saque..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-teal-500 outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Principales Fortalezas</label>
                                <input
                                    type="text"
                                    value={goalStrengths}
                                    onChange={e => setGoalStrengths(e.target.value)}
                                    placeholder="Ej: Buena velocidad de piernas, derecha pesada..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Aspectos a Corregir</label>
                                <input
                                    type="text"
                                    value={goalAreasToImprove}
                                    onChange={e => setGoalAreasToImprove(e.target.value)}
                                    placeholder="Ej: Empuñadura en la volea baja, ansiedad en puntos clave..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Nivel de Compromiso / Asistencia (1 a 5 ⭐)</label>
                                <div className="flex items-center gap-2 pt-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setGoalCommitment(star)}
                                            className={`p-2 rounded-xl border transition-all ${
                                                star <= goalCommitment 
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                                                    : 'bg-white/5 border-white/10 text-muted'
                                            }`}
                                        >
                                            <Star size={16} className={star <= goalCommitment ? 'fill-amber-400' : ''} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowGoalModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-600/20 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Guardar Metas
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 4: CREACIÓN DE GRUPOS DE CLASES                                     */}
            {/* ========================================================================= */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Nuevo Grupo de Entrenamiento</h3>
                                    <p className="text-xs text-muted">Configura días, horarios y asigna alumnos de tu plantel</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateGroupModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveGroup} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Nombre del Grupo *</label>
                                <input
                                    required
                                    type="text"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="Ej: Adultos 4ta Cat - Tarde"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría Promedio</label>
                                    <select
                                        value={groupCategory}
                                        onChange={e => setGroupCategory(e.target.value)}
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold outline-none focus:border-emerald-500"
                                    >
                                        <option value="1ra">1ra Categoría</option>
                                        <option value="2da">2da Categoría</option>
                                        <option value="3ra">3ra Categoría</option>
                                        <option value="4ta">4ta Categoría</option>
                                        <option value="5ta">5ta Categoría</option>
                                        <option value="6ta">6ta Categoría</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted uppercase font-bold">Cancha Asignada</label>
                                    <input
                                        type="text"
                                        value={groupCourt}
                                        onChange={e => setGroupCourt(e.target.value)}
                                        placeholder="Ej: Cancha 2"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Horario Semanal</label>
                                <input
                                    type="text"
                                    value={groupTime}
                                    onChange={e => setGroupTime(e.target.value)}
                                    placeholder="Ej: 19:00 - 20:30 hs"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Select Students from Roster */}
                            <div className="space-y-2">
                                <label className="text-xs text-muted uppercase font-bold block">
                                    Asignar Alumnos del Plantel ({groupSelectedStudents.length} seleccionados)
                                </label>
                                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-white/10 bg-black/20 p-2.5 rounded-xl custom-scrollbar">
                                    {myStudents.length === 0 ? (
                                        <p className="text-xs text-muted">No tienes alumnos en tu plantel aún.</p>
                                    ) : (
                                        myStudents.map(st => {
                                            const isSelected = groupSelectedStudents.includes(st.id);
                                            return (
                                                <div
                                                    key={st.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setGroupSelectedStudents(groupSelectedStudents.filter(id => id !== st.id));
                                                        } else {
                                                            setGroupSelectedStudents([...groupSelectedStudents, st.id]);
                                                        }
                                                    }}
                                                    className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'hover:bg-white/5 text-slate-300'
                                                    }`}
                                                >
                                                    <span>{formatPlayerName(st.name, st.lastname)} ({st.category || '4ta'})</span>
                                                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} className="text-muted" />}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateGroupModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Crear Grupo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 5: TOMA DE ASISTENCIA GRUPAL                                        */}
            {/* ========================================================================= */}
            {showAttendanceModal && selectedGroupForAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <CheckSquare size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Toma de Asistencia</h3>
                                    <p className="text-xs text-muted">{selectedGroupForAttendance.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAttendanceModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAttendance} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Tema o Ejercicios de la Clase</label>
                                <input
                                    type="text"
                                    value={attendanceTopic}
                                    onChange={e => setAttendanceTopic(e.target.value)}
                                    placeholder="Ej: Drills de saque y devolución + Tie-break..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-muted uppercase font-bold block">
                                    Marcar Presentes ({attendancePresentIds.length} de {selectedGroupForAttendance.studentIds.length})
                                </label>
                                <div className="space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/10">
                                    {selectedGroupForAttendance.studentIds.map(stId => {
                                        const st = myStudents.find(s => s.id === stId);
                                        const isPresent = attendancePresentIds.includes(stId);
                                        const stName = st ? formatPlayerName(st.name, st.lastname) : 'Alumno';

                                        return (
                                            <div
                                                key={stId}
                                                onClick={() => {
                                                    if (isPresent) {
                                                        setAttendancePresentIds(attendancePresentIds.filter(id => id !== stId));
                                                    } else {
                                                        setAttendancePresentIds([...attendancePresentIds, stId]);
                                                    }
                                                }}
                                                className={`p-2.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                    isPresent ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'bg-white/5 text-muted hover:text-white'
                                                }`}
                                            >
                                                <span>{stName}</span>
                                                {isPresent ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAttendanceModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    <CheckCircle2 size={14} /> Guardar Asistencia
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 6: EVALUACIÓN TÉCNICA Y RECOMENDACIÓN DE ASCENSO                     */}
            {/* ========================================================================= */}
            {showEvalModal && selectedStudentForEval && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Evaluación Técnica de Alumno</h3>
                                    <p className="text-xs text-muted">{formatPlayerName(selectedStudentForEval.name, selectedStudentForEval.lastname)}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEvalModal(false)} className="text-muted hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvaluation} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="p-3 bg-slate-900/80 border border-white/10 rounded-2xl flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-muted block uppercase font-bold">Categoría Actual</span>
                                    <span className="text-xs font-bold text-white">{selectedStudentForEval.category || '4ta'} Categoría</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-muted block uppercase font-bold">Club</span>
                                    <span className="text-xs font-bold text-emerald-400">{selectedStudentForEval.institution || user.institution || 'Club'}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-1.5">
                                    <TrendingUp size={13} className="text-emerald-400" /> Categoría Recomendada por el Coach
                                </label>
                                <select
                                    value={evalCategory}
                                    onChange={e => setEvalCategory(e.target.value)}
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white font-bold focus:border-emerald-500 outline-none"
                                >
                                    <option value="1ra">1ra Categoría (Avanzado Pro)</option>
                                    <option value="2da">2da Categoría (Intermedio Alto)</option>
                                    <option value="3ra">3ra Categoría (Intermedio)</option>
                                    <option value="4ta">4ta Categoría (Intermedio Bajo)</option>
                                    <option value="5ta">5ta Categoría (Iniciación / Principiante)</option>
                                    <option value="6ta">6ta Categoría (Escuela Inicial)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-1.5">
                                    <FileText size={13} className="text-teal-400" /> Observaciones y Devolución Técnica *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={evalNotes}
                                    onChange={e => setEvalNotes(e.target.value)}
                                    placeholder="Ej: Muestra excelente consistencia en fondo de cancha y madurez táctica para competir en 3ra categoría..."
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEvalModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={evaluating}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                                >
                                    {evaluating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Guardar Evaluación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
