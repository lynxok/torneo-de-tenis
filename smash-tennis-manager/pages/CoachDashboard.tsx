import React, { useEffect, useState } from 'react';
import { UserProfile, Booking } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { soundEffects } from '../services/soundEffects';
import { formatPlayerName } from '../utils/formatters';
import {
    GraduationCap, Users, Calendar, CheckCircle2, Clock, MessageCircle,
    Plus, Search, Award, Activity, FileText, ChevronRight, TrendingUp,
    Sparkles, Phone, ShieldCheck, AlertCircle, Filter, Check, X, Loader2,
    CalendarDays, Dumbbell, BookOpen, Star
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

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ user, onNavigate }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'classes' | 'students' | 'evaluations'>('classes');
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [searchStudent, setSearchStudent] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

    // Classes / Bookings State
    const [classesList, setClassesList] = useState<Booking[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);

    // New Class / Evaluation Modal
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedStudentForEval, setSelectedStudentForEval] = useState<UserProfile | null>(null);
    const [evalCategory, setEvalCategory] = useState('3ra');
    const [evalNotes, setEvalNotes] = useState('');
    const [evaluating, setEvaluating] = useState(false);

    // Local Persistence for Training Evaluations & Attendance Log
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

    useEffect(() => {
        loadStudentsAndClasses();
    }, [user.institution_id]);

    const loadStudentsAndClasses = async () => {
        setLoadingStudents(true);
        setLoadingClasses(true);
        try {
            const allProfiles = await api.auth.getAllProfiles(1, 200);
            const clubPlayers = allProfiles.filter(p => 
                p.role === 'player' && (!user.institution_id || p.institution_id === user.institution_id || !p.institution_id)
            );
            setStudents(clubPlayers);

            const todayStr = new Date().toISOString().split('T')[0];
            const bookings = await api.bookings.getByDate(todayStr, user.institution_id);
            setClassesList(bookings || []);
        } catch (e) {
            console.error('Error loading coach data:', e);
        } finally {
            setLoadingStudents(false);
            setLoadingClasses(false);
        }
    };

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

    const handleWhatsAppStudent = (student: UserProfile, msg?: string) => {
        const phone = student.phone || '';
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(msg || `¡Hola ${formatPlayerName(student.name)}! Te escribo de parte del equipo de entrenamiento de tenis de ${user.institution || 'el club'}.`);
        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone}?text=${message}`, '_blank');
        } else {
            addToast(`El alumno ${formatPlayerName(student.name)} no tiene número de WhatsApp registrado en su perfil.`, 'info');
        }
    };

    const filteredStudents = students.filter(s => {
        const query = searchStudent.toLowerCase().trim();
        const fullName = `${s.name} ${s.lastname || ''}`.toLowerCase();
        const matchesQuery = !query || fullName.includes(query) || (s.dni && s.dni.includes(query));
        const matchesCat = selectedCategoryFilter === 'all' || s.category === selectedCategoryFilter;
        return matchesQuery && matchesCat;
    });

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-teal-950/60 border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white">Panel de Entrenamiento & Clases</h1>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <Sparkles size={11} /> Profesor Oficial
                                </span>
                            </div>
                            <p className="text-slate-300 text-xs mt-1">
                                Gestión de alumnos, seguimiento pedagógico y avales técnicos de categoría para {user.institution || 'el club'}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => {
                                if (onNavigate) onNavigate('bookings');
                            }}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                        >
                            <Calendar size={15} className="text-emerald-400" /> Ir a Grilla de Canchas
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[11px] text-muted font-bold uppercase tracking-wider block">Alumnos del Club</span>
                        <div className="text-2xl font-black text-white mt-0.5">{students.length}</div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[11px] text-muted font-bold uppercase tracking-wider block">Turnos de Hoy</span>
                        <div className="text-2xl font-black text-emerald-400 mt-0.5">{classesList.length}</div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[11px] text-muted font-bold uppercase tracking-wider block">Evaluaciones</span>
                        <div className="text-2xl font-black text-teal-300 mt-0.5">{evaluationsLog.length}</div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5">
                        <span className="text-[11px] text-muted font-bold uppercase tracking-wider block">Sede</span>
                        <div className="text-sm font-bold text-slate-200 mt-1 truncate">{user.institution || 'Central'}</div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'classes'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Calendar size={15} /> Agenda de Turnos y Canchas ({classesList.length})
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'students'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users size={15} /> Directorio de Alumnos ({students.length})
                </button>
                <button
                    onClick={() => setActiveTab('evaluations')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        activeTab === 'evaluations'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                            : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Award size={15} /> Evaluaciones & Ascensos ({evaluationsLog.length})
                </button>
            </div>

            {/* TAB 1: AGENDA DE TURNOS */}
            {activeTab === 'classes' && (
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
                                                    const found = students.find(s => s.name.includes(cls.user_name || '') || s.id === cls.user_id);
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
            )}

            {/* TAB 2: DIRECTORIO DE ALUMNOS */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-white/10 rounded-2xl p-3">
                        <div className="relative flex-1 w-full">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar alumno por nombre, apellido o DNI..."
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
                        </div>
                    </div>

                    {loadingStudents ? (
                        <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
                            <Loader2 size={24} className="animate-spin text-emerald-400" />
                            <span className="text-xs">Cargando directorio de alumnos...</span>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <Card className="p-8 text-center bg-slate-900/40 border-white/5">
                            <Users size={36} className="mx-auto text-muted mb-3 opacity-50" />
                            <h4 className="text-sm font-bold text-white">No se encontraron alumnos</h4>
                            <p className="text-xs text-muted mt-1">Prueba cambiando los términos de búsqueda o filtros.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredStudents.map(student => {
                                const formattedName = formatPlayerName(student.name, student.lastname);
                                const isFemale = (student.gender || '').toLowerCase().includes('fem');

                                return (
                                    <div key={student.id} className="bg-card border border-white/10 rounded-2xl p-4 space-y-3 hover:border-emerald-500/40 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                                                {student.profile_picture_url ? (
                                                    <img src={student.profile_picture_url} alt={formattedName} className="w-full h-full object-cover" />
                                                ) : (
                                                    formattedName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold text-white truncate">{formattedName}</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                                        {student.category || '4ta'} Cat.
                                                    </span>
                                                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isFemale ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                        {isFemale ? 'Damas' : 'Caballeros'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-muted space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                                            <div className="flex justify-between">
                                                <span>DNI:</span>
                                                <span className="text-slate-300 font-mono">{student.dni || 'No registrado'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Teléfono:</span>
                                                <span className="text-slate-300 font-mono">{student.phone || 'No registrado'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                                            <button
                                                onClick={() => handleWhatsAppStudent(student)}
                                                className="flex-1 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                                title="Contactar al alumno por WhatsApp"
                                            >
                                                <MessageCircle size={13} /> WhatsApp
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedStudentForEval(student);
                                                    setEvalCategory(student.category || '3ra');
                                                    setShowEvalModal(true);
                                                }}
                                                className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                                title="Emitir recomendación de categoría o nota técnica"
                                            >
                                                <Award size={13} /> Evaluar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: EVALUACIONES Y RECOMENDACIONES DE ASCENSO */}
            {activeTab === 'evaluations' && (
                <div className="space-y-4">
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
                                Selecciona un alumno desde la pestaña "Directorio de Alumnos" para emitir una recomendación técnica.
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
            )}

            {/* EVALUATION & CATEGORY RECOMMENDATION MODAL */}
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
