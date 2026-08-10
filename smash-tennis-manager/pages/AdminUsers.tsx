
import React, { useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { api } from '../services/api';
import { Search, Shield, UserPlus, X, Loader2, Save, Building, AlertCircle, CheckCheck } from 'lucide-react';

interface AdminUsersProps {
    user?: UserProfile;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ user }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    // Create User Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        lastname: '',
        role: 'player' as UserRole,
        phone: '',
        dni: ''
    });

    const isSuperAdmin = user?.role === 'superadmin';

    useEffect(() => {
        loadUsers();
    }, [user]);

    const loadUsers = () => {
        setLoading(true);
        api.auth.getAllProfiles().then(setUsers).finally(() => setLoading(false));
    };

    const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
        if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return;
        try {
            await api.auth.updateProfile(userId, { role: newRole });
            loadUsers();
        } catch (e) {
            alert('Error al actualizar rol');
        }
    };

    const handleToggleApproval = async (userId: string, currentStatus: boolean | undefined) => {
        const action = currentStatus ? 'desactivar' : 'aprobar';
        if (!confirm(`¿Estás seguro de ${action} a este usuario?`)) return;
        try {
            await api.auth.updateProfile(userId, { is_approved: !currentStatus });
            loadUsers();
        } catch (e) {
            alert('Error al actualizar estado');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            // If admin creates a user, assign to their institution automatically
            const userPayload: any = {
                name: newUser.name,
                lastname: newUser.lastname,
                role: newUser.role,
                phone: newUser.phone,
                dni: newUser.dni
            };

            if (!isSuperAdmin && user?.institution_id) {
                userPayload.institution_id = user.institution_id;
            }

            await api.auth.adminCreateUser(newUser.email, newUser.password, userPayload);

            alert('Usuario creado exitosamente.');
            setShowCreateModal(false);
            setNewUser({ email: '', password: '', name: '', lastname: '', role: 'player', phone: '', dni: '' });
            loadUsers();
        } catch (error: any) {
            console.error(error);
            alert('Error al crear usuario: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    // Filter Logic:
    // 1. Search text match
    // 2. Institution Scope (Strict: Only see own institution)
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(filter.toLowerCase()) ||
            u.email.toLowerCase().includes(filter.toLowerCase());

        let matchesScope = true;
        if (!isSuperAdmin && user?.institution_id) {
            // STRICT: Only show users explicitly assigned to this institution.
            // Prevents seeing "Global" or "Unassigned" users.
            matchesScope = u.institution_id === user.institution_id;
        }

        return matchesSearch && matchesScope;
    });

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Administración de Usuarios</h2>
                    <p className="text-muted text-sm">
                        {isSuperAdmin
                            ? 'Gestión global de permisos y roles.'
                            : `Gestionando miembros de ${user?.institution || 'tu institución'}.`}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64" id="user-search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            className="w-full bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <button
                        id="btn-create-user"
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                    >
                        <UserPlus size={18} /> Nuevo Usuario
                    </button>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden min-h-[300px]" id="users-table">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-muted text-sm uppercase tracking-wider">
                                <th className="p-4">Usuario</th>
                                <th className="p-4">Rol Actual</th>
                                <th className="p-4 hidden md:table-cell">Institución</th>
                                <th className="p-4 hidden sm:table-cell">Categoría</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-muted">Cargando usuarios...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle size={32} className="opacity-50" />
                                            <p>No se encontraron usuarios bajo tu gestión.</p>
                                            {!isSuperAdmin && (
                                                <p className="text-xs max-w-md mx-auto">
                                                    Solo puedes ver usuarios asignados a <strong>{user?.institution}</strong>.
                                                    Crea un nuevo usuario para agregarlo a tu lista.
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((u, index) => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{u.name} {u.lastname}</div>
                                                <div className="text-xs text-muted">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                            u.role === 'superadmin' ? 'bg-red-500/20 text-red-400' :
                                                u.role === 'professor' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            <Shield size={12} /> {u.role === 'professor' ? 'Profesor' : u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300 hidden md:table-cell">
                                        {u.institution || <span className="text-muted italic">Sin asignar</span>}
                                    </td>
                                    <td className="p-4 text-sm text-slate-300 hidden sm:table-cell">
                                        {u.category || 'N/A'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Styled Select with Dark Options */}
                                            <select
                                                id={index === 0 ? "user-role-select" : undefined}
                                                className="bg-slate-800 text-white text-xs py-1.5 px-2 rounded-lg border border-white/10 outline-none cursor-pointer hover:border-white/30 focus:border-primary transition-all shadow-sm appearance-none pr-8 relative"
                                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                                                value={u.role}
                                                onChange={(e) => handleRoleUpdate(u.id, e.target.value as UserRole)}
                                                disabled={!isSuperAdmin && (u.role === 'superadmin' || u.role === 'admin')}
                                            >
                                                <option value="player" className="bg-slate-800 text-white">Jugador</option>
                                                <option value="professor" className="bg-slate-800 text-white">Profesor (Sin Caja)</option>

                                                {isSuperAdmin && (
                                                    <>
                                                        <option value="admin" className="bg-slate-800 text-white">Admin (Inst)</option>
                                                        <option value="coordinator" className="bg-slate-800 text-white">Coordinador</option>
                                                        <option value="superadmin" className="bg-slate-800 text-white">Super Admin</option>
                                                    </>
                                                )}

                                                {!isSuperAdmin && (u.role === 'admin' || u.role === 'superadmin' || u.role === 'coordinator') && (
                                                    <option value={u.role} disabled hidden className="bg-slate-800 text-white">{u.role}</option>
                                                )}
                                            </select>

                                            {/* Approval Toggle */}
                                            <button
                                                onClick={() => handleToggleApproval(u.id, u.is_approved)}
                                                className={`p-2 rounded-lg transition-all ${u.is_approved
                                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 animate-pulse'
                                                    }`}
                                                title={u.is_approved ? "Usuario Verificado (Click para desactivar)" : "Usuario Pendiente (Click para aprobar)"}
                                            >
                                                {u.is_approved ? <CheckCheck size={18} /> : <AlertCircle size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE USER MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div id="create-user-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} /> Crear Nuevo Usuario</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
                            {/* ... Form Content same as before ... */}
                            {!isSuperAdmin && user?.institution && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-2 mb-2">
                                    <Building size={16} className="text-blue-400" />
                                    <span className="text-xs text-blue-200">
                                        El usuario será asignado automáticamente a <strong>{user.institution}</strong>.
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Nombre *</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Apellido *</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.lastname}
                                        onChange={e => setNewUser({ ...newUser, lastname: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Email *</label>
                                <input
                                    type="email"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Contraseña *</label>
                                <input
                                    type="password"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                    minLength={6}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Rol</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                                    >
                                        <option value="player" className="bg-sidebar">Jugador</option>
                                        <option value="professor" className="bg-sidebar">Profesor (Sin Caja)</option>

                                        {isSuperAdmin && (
                                            <>
                                                <option value="admin" className="bg-sidebar">Administrador (Club)</option>
                                                <option value="coordinator" className="bg-sidebar">Coordinador</option>
                                                <option value="superadmin" className="bg-sidebar">Super Admin</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Teléfono</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.phone}
                                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {creating ? <><Loader2 className="animate-spin" size={18} /> Creando...</> : <><Save size={18} /> Crear Usuario</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
