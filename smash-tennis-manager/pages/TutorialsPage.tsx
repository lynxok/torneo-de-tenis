
import React from 'react';
import { UserProfile, TutorialDef } from '../types';
import { Card } from '../components/ui/Card';
import { Play, BookOpen, Calendar, Trophy, Users, Wallet, Mail, UserCircle, Zap, Building, UserPlus, LayoutGrid, Target } from 'lucide-react';

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
    
    // Safety check: ensure role exists
    const userRole = user.role || 'player';
    const availableTutorials = TUTORIALS.filter(t => t.role.includes(userRole));

    return (
        <div className="space-y-6 animate-fade-up">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="text-primary" /> Centro de Aprendizaje
                </h2>
                <p className="text-muted text-sm">
                    Guías interactivas: Haz clic en los elementos señalados para avanzar.
                </p>
            </div>

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
                                className="w-full py-3 bg-white/5 hover:bg-primary hover:text-white text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10 group-hover:border-primary/50"
                            >
                                <Play size={16} className="fill-current" /> Iniciar Guía
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
    );
};
