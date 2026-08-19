
import React, { useState } from 'react';
import { UserProfile, TutorialDef } from '../types';
import { Card } from '../components/ui/Card';
import { 
    Play, BookOpen, Calendar, Trophy, Users, Wallet, Mail, UserCircle, Zap, Building, 
    UserPlus, LayoutGrid, Target, Shuffle, Scale, Award, Info, CheckCircle2, 
    ChevronRight, TrendingUp, Layers, HelpCircle, ShieldCheck, Flame, ArrowLeftRight
} from 'lucide-react';

// --- TUTORIAL DEFINITIONS ---
export const TUTORIALS: TutorialDef[] = [
    {
        id: 'tour-dashboard-guide',
        title: 'Recorrido por el Dashboard',
        description: 'Conoce cada sección de tu pantalla de inicio: estadísticas, alertas y accesos rápidos.',
        icon: LayoutGrid,
        role: ['player', 'admin', 'superadmin', 'professor'],
        steps: [
            { 
                targetId: 'dashboard-header', 
                title: 'Bienvenida y Contexto', 
                content: 'Aquí verás la fecha actual y tu información básica. Si eres organizador, también verás notificaciones importantes sobre el estado del sistema.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'dashboard-quick-actions', 
                title: 'Accesos Rápidos', 
                content: 'Estos botones son atajos a las funciones más usadas: Reservar Cancha, Buscar Rival o Ver Ranking. Úsalos para navegar rápidamente.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'dashboard-main-content', 
                title: 'Tu Actividad Principal', 
                content: 'En esta columna central aparecerán tus próximos partidos confirmados, los torneos en los que estás inscrito y alertas sobre puntos de ranking por vencer.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'dashboard-stats-sidebar', 
                title: 'Estadísticas y Ranking', 
                content: 'Esta barra lateral muestra un resumen de tu rendimiento: porcentaje de victorias, partidos jugados y tu puntaje actual en el ranking.', 
                view: 'dashboard' 
            }
        ]
    },
    {
        id: 'tour-ranking-system',
        title: 'Sistema de Puntos y Ranking',
        description: 'Aprende cómo leer la tabla de posiciones y conoce las reglas de puntuación.',
        icon: Target,
        role: ['player', 'admin', 'superadmin', 'professor'],
        steps: [
            { 
                targetId: 'nav-rankings', // Requires navigation to rankings first if not there
                title: 'Acceso al Ranking', 
                content: 'Haz clic en "Ranking" en el menú lateral para ver la tabla de posiciones completa.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'ranking-rules-banner', 
                title: 'Reglamento de Puntos', 
                content: 'Haz clic en este banner desplegable para entender cuántos puntos otorga cada partido ganado o torneo.', 
                view: 'rankings' 
            },
            { 
                targetId: 'ranking-table', 
                title: 'Tabla de Posiciones', 
                content: 'Aquí verás a todos los jugadores ordenados por puntaje. Puedes filtrar por categoría arriba. Haz clic en los puntos de cualquier jugador para ver su desglose histórico.', 
                view: 'rankings' 
            }
        ]
    },
    {
        id: 'tour-create-tournament',
        title: 'Crear un Torneo',
        description: 'Aprende a configurar un nuevo torneo, definir categorías y abrir la inscripción.',
        icon: Trophy,
        role: ['admin', 'superadmin'],
        steps: [
            { 
                targetId: 'nav-tournaments', 
                title: 'Navegación', 
                content: 'Primero, haz clic en la sección "Torneos" en el menú lateral para acceder al panel de competiciones.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'btn-new-tournament', 
                title: 'Crear Nuevo', 
                content: 'Haz clic en el botón "Nuevo Torneo" arriba a la derecha para abrir el formulario de creación.', 
                view: 'tournaments' 
            },
            { 
                targetId: 'new-tournament-modal', 
                title: 'Completar Datos', 
                content: 'Aquí debes llenar el nombre, fecha y formato. Haz clic en el formulario para cerrar la guía y empezar a escribir.', 
                view: 'tournaments' 
            }
        ]
    },
    {
        id: 'tour-finance',
        title: 'Gestión Financiera',
        description: 'Control de caja, registro de ingresos/egresos y reportes automáticos.',
        icon: Wallet,
        role: ['admin', 'superadmin'],
        steps: [
            { 
                targetId: 'nav-tournaments', // Using existing nav ID as anchor if Report link doesn't have one, but let's assume it's next to it or we use dashboard
                title: 'Acceso a Reportes', 
                content: 'Haz clic en "Caja y Reportes" desde el Panel General o el menú lateral (solo visible para administradores).', 
                view: 'dashboard' 
            },
            { 
                targetId: 'reports-kpi', 
                title: 'Indicadores Clave', 
                content: 'Aquí verás el resumen en tiempo real de tu facturación, gastos y utilidad neta.', 
                view: 'reports' 
            },
            { 
                targetId: 'btn-new-transaction', 
                title: 'Registrar Movimiento', 
                content: 'Haz clic aquí para ingresar manualmente un cobro (ej: alquiler en efectivo) o un gasto (ej: compra de pelotas).', 
                view: 'reports' 
            },
            { 
                targetId: 'transaction-modal', 
                title: 'Formulario', 
                content: 'Selecciona si es Ingreso o Egreso, el monto y la categoría. Haz clic en el formulario para probarlo.', 
                view: 'reports' 
            }
        ]
    },
    {
        id: 'tour-admin-users',
        title: 'Administración de Usuarios',
        description: 'Aprueba nuevos jugadores, asigna roles de profesor y gestiona permisos.',
        icon: UserPlus,
        role: ['admin', 'superadmin'],
        steps: [
            { 
                targetId: 'nav-players', // Fallback nav
                title: 'Sección Usuarios', 
                content: 'Accede a la lista de usuarios desde el panel de administración.', 
                view: 'admin-users' 
            },
            { 
                targetId: 'user-search', 
                title: 'Buscar Miembros', 
                content: 'Utiliza este buscador para encontrar jugadores por nombre o email rápidamente.', 
                view: 'admin-users' 
            },
            { 
                targetId: 'btn-create-user', 
                title: 'Alta Manual', 
                content: 'Si un jugador no se registró, puedes crearlo manualmente desde aquí.', 
                view: 'admin-users' 
            },
            { 
                targetId: 'users-table', 
                title: 'Roles y Permisos', 
                content: 'En la lista puedes ver el rol actual. Usa el desplegable a la derecha para cambiar un jugador a Profesor o Admin.', 
                view: 'admin-users' 
            }
        ]
    },
    {
        id: 'tour-institution-setup',
        title: 'Configuración de Sede',
        description: 'Define la cantidad de canchas, precios por horario y servicios disponibles.',
        icon: Building,
        role: ['admin', 'superadmin'],
        steps: [
            { 
                targetId: 'nav-bookings', // Fallback nav
                title: 'Configuración', 
                content: 'Ve a la sección "Instituciones" para editar los datos de tu club.', 
                view: 'admin-institutions' 
            },
            { 
                targetId: 'inst-edit-btn', 
                title: 'Editar Datos', 
                content: 'Haz clic en "Editar" para modificar la información de tu sede.', 
                view: 'admin-institutions' 
            },
            { 
                targetId: 'inst-form-tabs', 
                title: 'Secciones', 
                content: 'Navega por las pestañas para cambiar Ubicación, Instalaciones o Precios.', 
                view: 'admin-institutions' 
            },
            { 
                targetId: 'courts-grid', 
                title: 'Canchas', 
                content: 'Asegúrate de configurar correctamente la cantidad de canchas para que la grilla de reservas funcione bien.', 
                view: 'admin-institutions' 
            }
        ]
    },
    {
        id: 'tour-manage-bookings',
        title: 'Gestión de Canchas y Clases',
        description: 'Bloquea horarios, crea clases recurrentes o agenda reservas manuales.',
        icon: Calendar,
        role: ['admin', 'superadmin', 'professor'],
        steps: [
            { 
                targetId: 'nav-bookings', 
                title: 'Agenda de Canchas', 
                content: 'Haz clic en "Reservas" en el menú para ver la grilla horaria.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'grid-container', 
                title: 'Selección de Horario', 
                content: 'Haz clic en cualquier recuadro vacío de la grilla (horario libre) para iniciar una acción.', 
                view: 'bookings' 
            },
            { 
                targetId: 'booking-action-modal', 
                title: 'Tipo de Reserva', 
                content: 'Elige "Clase / Escuela" para agendar entrenamientos o "Bloquear" para mantenimiento.', 
                view: 'bookings' 
            }
        ]
    },
    {
        id: 'tour-enrollment',
        title: 'Inscribirse a Torneo',
        description: 'Pasos para sumarte a una competición activa y asegurar tu lugar.',
        icon: Zap,
        role: ['player'],
        steps: [
            { 
                targetId: 'nav-tournaments', 
                title: 'Ver Torneos', 
                content: 'Ve a la sección de Torneos para ver las competencias disponibles.', 
                view: 'tournaments' 
            },
            { 
                targetId: 'new-tournament-modal', // Assuming first card effectively
                title: 'Elegir Torneo', 
                content: 'Haz clic en la tarjeta de un torneo que esté en estado "Borrador" o "Inscripción Abierta".', 
                view: 'tournaments' 
            },
            { 
                targetId: 'btn-enroll-tournament', 
                title: 'Confirmar', 
                content: 'Una vez dentro, haz clic en este botón para solicitar tu inscripción. El organizador te confirmará luego.', 
                view: 'tournament-detail' 
            }
        ]
    },
    {
        id: 'tour-messaging',
        title: 'Mensajería y Difusión',
        description: 'Comunícate con otros jugadores o envía anuncios importantes a toda tu sede.',
        icon: Mail,
        role: ['player', 'admin', 'superadmin', 'professor'],
        steps: [
            { 
                targetId: 'nav-players', // Fallback nav
                title: 'Centro de Mensajes', 
                content: 'Ve a la sección "Mensajes" en el menú lateral.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'btn-new-message', 
                title: 'Redactar', 
                content: 'Haz clic en el botón "Nuevo Mensaje" para comenzar.', 
                view: 'messages' 
            },
            { 
                targetId: 'compose-modal', 
                title: 'Destinatario', 
                content: 'Si eres Organizador, aquí podrás elegir "Difusión" para enviar un mensaje a todos los socios a la vez.', 
                view: 'messages' 
            }
        ]
    },
    {
        id: 'tour-player-booking',
        title: 'Reservar una Cancha',
        description: 'Guía rápida para reservar tu horario de juego en tu club favorito.',
        icon: Calendar,
        role: ['player'],
        steps: [
            { 
                targetId: 'nav-bookings', 
                title: 'Mis Reservas', 
                content: 'Haz clic en "Reservas" en el menú lateral.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'btn-player-book', 
                title: 'Iniciar Reserva', 
                content: 'Haz clic en el botón "Hacer una Reserva" para buscar canchas disponibles.', 
                view: 'bookings' 
            },
            { 
                targetId: 'player-booking-modal', 
                title: 'Confirmación', 
                content: 'Selecciona el club, el día y el horario que prefieras. Haz clic en el formulario para interactuar con él.', 
                view: 'bookings' 
            }
        ]
    },
    {
        id: 'tour-find-rival',
        title: 'Buscar Rivales',
        description: 'Encuentra jugadores de tu mismo nivel para desafiar.',
        icon: Users,
        role: ['player'],
        steps: [
            { 
                targetId: 'nav-players', 
                title: 'Comunidad', 
                content: 'Haz clic en "Jugadores" para ver el directorio completo.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'filter-bar', 
                title: 'Filtros Inteligentes', 
                content: 'Utiliza esta barra para filtrar por Categoría o Club. Haz clic en la barra para probarla.', 
                view: 'players' 
            },
            { 
                targetId: 'players-container', 
                title: 'Ver Perfil', 
                content: 'Haz clic en la tarjeta de cualquier jugador para ver sus estadísticas o enviarle un desafío.', 
                view: 'players' 
            }
        ]
    },
    {
        id: 'tour-profile',
        title: 'Mi Perfil Deportivo',
        description: 'Actualiza tus datos, categoría y visualiza tus estadísticas de rendimiento.',
        icon: UserCircle,
        role: ['player', 'admin', 'professor'],
        steps: [
            { 
                targetId: 'nav-players', // Using players nav or dashboard as starting point
                title: 'Acceso al Perfil', 
                content: 'Haz clic en tu inicial o foto en la esquina superior derecha, o selecciona "Mi Perfil" en el menú.', 
                view: 'dashboard' 
            },
            { 
                targetId: 'profile-stats', 
                title: 'Rendimiento', 
                content: 'Aquí verás tu historial de partidos ganados, torneos y tu posición en el ranking global.', 
                view: 'profile' 
            },
            { 
                targetId: 'btn-edit-profile', 
                title: 'Editar Datos', 
                content: 'Haz clic aquí para modificar tu teléfono, categoría o cambiar de club.', 
                view: 'profile' 
            },
            { 
                targetId: 'edit-profile-modal', 
                title: 'Formulario', 
                content: 'Actualiza tu información y guarda los cambios. Haz clic en el formulario para cerrarlo.', 
                view: 'profile' 
            }
        ]
    }
];

interface TutorialsPageProps {
    user: UserProfile;
    onStartTutorial: (tutorialId: string) => void;
}

export const TutorialsPage: React.FC<TutorialsPageProps> = ({ user, onStartTutorial }) => {
    const [activeSection, setActiveSection] = useState<'rules' | 'interactive'>('rules');
    
    // Safety check: ensure role exists
    const userRole = user.role || 'player';
    const availableTutorials = TUTORIALS.filter(t => t.role.includes(userRole));

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                        <BookOpen className="text-primary" size={26} /> Centro de Ayuda y Reglamento
                    </h2>
                    <p className="text-muted text-sm mt-1">
                        Normativa oficial de torneos, sistemas de sorteo, desempates en zonas y ranking deportivo.
                    </p>
                </div>

                {/* Section Switcher Tabs */}
                <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 text-xs font-bold">
                    <button
                        onClick={() => setActiveSection('rules')}
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                            activeSection === 'rules'
                                ? 'bg-primary text-dark shadow-md font-black shadow-primary/20'
                                : 'text-muted hover:text-white'
                        }`}
                    >
                        <ShieldCheck size={16} /> Reglamento y Torneos
                    </button>
                    <button
                        onClick={() => setActiveSection('interactive')}
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                            activeSection === 'interactive'
                                ? 'bg-primary text-dark shadow-md font-black shadow-primary/20'
                                : 'text-muted hover:text-white'
                        }`}
                    >
                        <Play size={16} /> Guías Interactivas ({availableTutorials.length})
                    </button>
                </div>
            </div>

            {/* SECTION 1: REGLAMENTO, SORTEOS, EMPATES Y RANKING */}
            {activeSection === 'rules' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Top Highlights Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-950/40 to-card border border-blue-500/20 p-4 rounded-2xl flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                                <Shuffle size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sorteos de Grupos</h4>
                                <p className="text-xs text-slate-300 mt-0.5">Sorteo 100% aleatorio con reubicación manual.</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-950/40 to-card border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                                <Scale size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Criterio de Desempates</h4>
                                <p className="text-xs text-slate-300 mt-0.5">Norma oficial AAT/ITF: H2H, Sets y Games.</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-950/40 to-card border border-green-500/20 p-4 rounded-2xl flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0 border border-green-500/30">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Puntos de Ranking</h4>
                                <p className="text-xs text-slate-300 mt-0.5">+1000 Campeón, +100 Partido, +20 Presentación.</p>
                            </div>
                        </div>
                    </div>

                    {/* BLOCK 1: SORTEO Y ARMADO DE ZONAS */}
                    <Card className="p-6 border-white/10 space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <Shuffle size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">1. Sorteos y Armado de Zonas</h3>
                                <p className="text-xs text-muted">Estructura de fase de grupos, cantidad de jugadores y cabezas de serie.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
                            <div className="space-y-3 bg-sidebar/50 p-4 rounded-2xl border border-white/5">
                                <h4 className="font-bold text-white flex items-center gap-2 text-sm text-primary">
                                    <Layers size={16} /> Formato y Garantía de Partidos
                                </h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                                        <span><strong>Zonas de 3 o 4 participantes:</strong> El organizador puede configurar la cantidad de zonas según el tiempo disponible y la cantidad de inscriptos.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                                        <span><strong>Partidos mínimos garantizados:</strong> Todo jugador inscripto tiene garantizados al menos 2 partidos en fase de grupos (todos contra todos / Round Robin).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                                        <span><strong>Clasificación a Playoffs:</strong> Los 2 mejores jugadores de cada grupo clasifican al cuadro principal de eliminación directa (Cuartos de Final / Semifinales).</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-3 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                                <h4 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                                    <Info size={16} /> Cabezas de Serie y Ranking Histórico
                                </h4>
                                <p className="text-amber-200/90 text-xs leading-relaxed">
                                    Hasta no contar con un historial o ranking oficial acumulado en el sistema, el sorteo de zonas se realiza mediante un <strong>sorteo 100% aleatorio y equitativo</strong> sin cabezas de serie automáticas.
                                </p>
                                <p className="text-amber-300/80 text-[11px] flex items-center gap-1.5 bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
                                    <ArrowLeftRight size={14} className="shrink-0" />
                                    <span><strong>Herramienta para el Organizador:</strong> Una vez generado el fixture, el organizador puede mover o rebalancear a los jugadores destacados entre zonas usando el botón <strong>"Intercambiar Jugadores"</strong>.</span>
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* BLOCK 2: SISTEMA DE DESEMPATES */}
                    <Card className="p-6 border-white/10 space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Scale size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">2. Criterio Oficial de Desempates en Zonas</h3>
                                <p className="text-xs text-muted">Normativa reglamentaria aplicada automáticamente en la tabla de posiciones.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs text-slate-300">
                                Cuando dos o más jugadores finalizan la fase de grupos con la misma cantidad de partidos jugados, el sistema aplica la siguiente <strong>jerarquía de desempate</strong>:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Paso 1 (General)</div>
                                    <div className="font-bold text-white text-xs">Partidos Ganados (PG)</div>
                                    <p className="text-[11px] text-muted">El jugador con mayor cantidad de victorias ocupa la mejor posición.</p>
                                </div>

                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Paso 2 (Empate de 2)</div>
                                    <div className="font-bold text-white text-xs">Duelo Directo (Head-to-Head)</div>
                                    <p className="text-[11px] text-muted">Si empatan 2 participantes, queda arriba quien ganó el enfrentamiento entre ellos.</p>
                                </div>

                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Paso 3 (Triple Empate)</div>
                                    <div className="font-bold text-white text-xs">Diferencia de Sets (DS)</div>
                                    <p className="text-[11px] text-muted">Mayor balance neto de Sets Ganados menos Sets Perdidos (SG - SP).</p>
                                </div>

                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Paso 4</div>
                                    <div className="font-bold text-white text-xs">Diferencia de Games (DG)</div>
                                    <p className="text-[11px] text-muted">Mayor balance neto de Games Ganados menos Games Perdidos (GG - GP).</p>
                                </div>

                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Paso 5</div>
                                    <div className="font-bold text-white text-xs">Games a Favor (GF)</div>
                                    <p className="text-[11px] text-muted">Quien haya conseguido mayor cantidad absoluta de games ganados.</p>
                                </div>

                                <div className="bg-sidebar/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paso 6</div>
                                    <div className="font-bold text-white text-xs">Sorteo Transparente</div>
                                    <p className="text-[11px] text-muted">Sorteo aleatorio por sistema en caso de paridad idéntica absoluta.</p>
                                </div>
                            </div>

                            {/* STB Note */}
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-200">
                                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-white">¿Cómo se computa el Super Tie-Break (3er set a 10 puntos)?</span> Computa como <strong>1 set ganado</strong> para el vencedor y <strong>1 game</strong> neto a favor (1-0), evitando distorsiones desmedidas en la diferencia de games.
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* BLOCK 3: PUNTOS Y RANKING */}
                    <Card className="p-6 border-white/10 space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                                <Trophy size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">3. Sistema de Puntos para el Ranking</h3>
                                <p className="text-xs text-muted">Escala de puntajes oficiales otorgados por torneos y partidos disputados.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Tournament Points Scale */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Trophy size={14} className="text-amber-400" /> Puntos en Torneos Oficiales
                                </h4>
                                <div className="bg-sidebar/50 rounded-2xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/10 text-muted uppercase text-[10px]">
                                                <th className="p-3">Instancia / Logro</th>
                                                <th className="p-3 text-right">Puntos Otorgados</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-slate-300">
                                            <tr>
                                                <td className="p-3 font-bold text-yellow-400 flex items-center gap-1.5">
                                                    🥇 Campeón del Torneo
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-yellow-400">+1000 pts</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-slate-200">🥈 Finalista / Subcampeón</td>
                                                <td className="p-3 text-right font-mono font-bold text-white">+600 pts</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">🥉 Semifinales</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-300">+360 pts</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">🎾 Cuartos de Final</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-300">+180 pts</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">🟢 Victoria en Fase de Grupos</td>
                                                <td className="p-3 text-right font-mono font-bold text-green-400">+100 pts</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3">🤝 Bonus por Partido Disputado</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-400">+20 pts</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Matches & Dynamic Update */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Zap size={14} className="text-primary" /> Partidos Amistosos y Desafíos
                                </h4>
                                <div className="bg-sidebar/50 p-4 rounded-2xl border border-white/5 space-y-2.5 text-xs text-slate-300">
                                    <p>
                                        Cada victoria en un <strong>Partido Individual o Desafío de Club</strong> suma <strong className="text-green-400">+100 puntos</strong> al ranking de la categoría.
                                    </p>
                                    <p>
                                        Incluso al disputar un partido que resulte en derrota, se acredita un bonus de <strong className="text-slate-200">+20 puntos</strong> por presentación y actividad deportiva.
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-4 rounded-2xl space-y-1.5">
                                    <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                        <TrendingUp size={14} /> Actualización en Tiempo Real
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        El ranking de tu categoría y el Ranking Global se recalculan automáticamente en el momento en que se valida el resultado de cada partido o final de torneo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* SECTION 2: GUÍAS INTERACTIVAS */}
            {activeSection === 'interactive' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <p className="text-muted text-xs">
                        Selecciona un tutorial interactivo para recibir una visita guiada con señaladores en pantalla:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableTutorials.map(tutorial => (
                            <Card key={tutorial.id} className="group hover:border-primary/50 transition-all flex flex-col h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <tutorial.icon size={80} />
                                </div>
                                
                                <div className="mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
                                        <tutorial.icon size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{tutorial.title}</h3>
                                    <p className="text-sm text-muted leading-relaxed">
                                        {tutorial.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button 
                                        onClick={() => onStartTutorial(tutorial.id)}
                                        className="w-full py-3 bg-white/5 hover:bg-primary hover:text-white text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10 group-hover:border-primary/50 text-xs"
                                    >
                                        <Play size={15} className="fill-current" /> Iniciar Guía Interactiva
                                    </button>
                                </div>
                            </Card>
                        ))}

                        {availableTutorials.length === 0 && (
                            <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl text-muted">
                                <Zap className="mx-auto mb-4 opacity-20" size={48} />
                                <p>No hay tutoriales disponibles para tu rol actual.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
