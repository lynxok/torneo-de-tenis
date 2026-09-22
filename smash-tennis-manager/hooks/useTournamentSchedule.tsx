import React, { useState } from 'react';
import { Match, Booking, Tournament } from '../types';
import { api } from '../services/api';
import { soundEffects } from '../services/soundEffects';

interface UseTournamentScheduleProps {
    tournament: Tournament | null;
    loadTournament: () => void;
    addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useTournamentSchedule = ({
    tournament,
    loadTournament,
    addToast,
}: UseTournamentScheduleProps) => {
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
    const [scheduleOopTurn, setScheduleOopTurn] = useState<string>('');
    const [scheduleOopNote, setScheduleOopNote] = useState<string>('');

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

    return {
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
    };
};
