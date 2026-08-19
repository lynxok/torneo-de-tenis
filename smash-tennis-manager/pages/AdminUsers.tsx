
import React, { useEffect, useState } from 'react';
import { UserProfile, UserRole, Institution } from '../types';
import { api } from '../services/api';
import { Search, Shield, UserPlus, X, Loader2, Save, Building, AlertCircle, CheckCheck, Edit2, UserCheck, Users, Clock, Award, Check, Phone, CreditCard } from 'lucide-react';
import { NUMERIC_CATEGORIES } from '../utils/categories';
import { formatPlayerName } from '../utils/formatters';

interface AdminUsersProps {
    user?: UserProfile;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ user }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');

    // Quick Approval State
    const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
    const [approvalCategory, setApprovalCategory] = useState<string>('4ta');
    const [approvalInstitutionId, setApprovalInstitutionId] = useState<string>('');
    const [approvalIsMember, setApprovalIsMember] = useState<boolean>(true);
    const [approvalMemberNumber, setApprovalMemberNumber] = useState<string>('');
    const [processingApproval, setProcessingApproval] = useState(false);


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
        dni: '',
        category: '4ta',
        is_member: true,
        member_number: ''
    });

    // Edit User Modal State (Super Admin & Admin)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [updating, setUpdating] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        lastname: '',
        email: '',
        password: '',
        phone: '',
        dni: '',
        category: '',
        gender: '',
        role: 'player' as UserRole,
        institution_id: '',
        is_member: false,
        member_number: '',
        member_status: 'active' as 'active' | 'pending' | 'inactive'
    });

    const isSuperAdmin = user?.role === 'superadmin';

    useEffect(() => {
        loadUsers();
        api.institutions.getAll().then(setInstitutions);
    }, [user]);

    const loadUsers = () => {
        setLoading(true);
        api.auth.getAllProfiles().then(setUsers).finally(() => setLoading(false));
    };

    const openEditModal = (u: UserProfile) => {
        setEditingUser(u);
        setEditFormData({
            name: u.name || '',
            lastname: u.lastname || '',
            email: u.email || '',
            password: '',
            phone: u.phone || '',
            dni: u.dni || '',
            category: u.category || '',
            gender: u.gender || '',
            role: u.role || 'player',
            institution_id: u.institution_id || '',
            is_member: !!u.is_member,
            member_number: u.member_number || '',
            member_status: u.member_status || 'active'
        });
        setShowEditModal(true);
    };

    const handleSaveUserEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setUpdating(true);

        try {
            const updates: any = {
                name: editFormData.name,
                lastname: editFormData.lastname,
                email: editFormData.email,
                phone: editFormData.phone,
                dni: editFormData.dni,
                category: editFormData.category || null,
                gender: editFormData.gender || null,
                role: editFormData.role,
                institution_id: editFormData.institution_id ? editFormData.institution_id : null
            };

            const updatedProfile = await api.auth.updateProfile(editingUser.id, updates);

            // Actualizar el estado local inmediatamente
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { 
                ...u, 
                ...updates, 
                institution: institutions.find(i => i.id === updates.institution_id)?.name || null 
            } : u));

            // Update Auth Email if changed
            if (editFormData.email !== editingUser.email) {
                await api.auth.updateUserAuthEmail(editingUser.id, editFormData.email);
            }

            // If Super Admin specified a new password, update auth password
            if (isSuperAdmin && editFormData.password.trim().length > 0) {
                if (editFormData.password.length < 6) {
                    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
                }
                try {
                    await api.auth.updateUserPassword(editingUser.id, editFormData.password.trim());
                } catch (pwErr: any) {
                    if (!pwErr.message?.toLowerCase().includes('should be different')) {
                        throw pwErr;
                    }
                }
            }

            alert('Usuario actualizado correctamente.');
            setShowEditModal(false);
            setEditingUser(null);
            loadUsers();
        } catch (error: any) {

            console.error(error);
            alert('Error al actualizar usuario: ' + error.message);
        } finally {
            setUpdating(false);
        }
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

    const handleQuickApprove = async (targetUser: UserProfile) => {
        if (!approvalCategory) {
            alert('Por favor selecciona una categoría antes de aprobar.');
            return;
        }
        setProcessingApproval(true);
        try {
            const updates: any = {
                is_approved: true,
                category: approvalCategory
            };

            // Si es SuperAdmin y seleccionó un club (o cambió el club), se actualiza institution_id
            if (approvalInstitutionId) {
                updates.institution_id = approvalInstitutionId;
            }

            await api.auth.updateProfile(targetUser.id, updates);
            alert(`¡${targetUser.name} ha sido aprobado con categoría ${approvalCategory}!`);
            setApprovingUserId(null);
            loadUsers();
        } catch (e: any) {

            alert('Error al aprobar usuario: ' + e.message);
        } finally {
            setProcessingApproval(false);
        }
    };

    const handleRejectRequest = async (userId: string) => {
        if (!confirm('¿Estás seguro de rechazar y desvincular esta solicitud?')) return;
        try {
            await api.auth.updateProfile(userId, {
                institution_id: null,
                is_approved: false,
                member_status: 'inactive'
            });
            loadUsers();
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const userPayload: any = {
                name: newUser.name,
                lastname: newUser.lastname,
                role: newUser.role,
                phone: newUser.phone,
                dni: newUser.dni,
                category: newUser.category,
                is_approved: true,
                is_member: newUser.is_member,
                member_number: newUser.member_number || null,
                member_status: 'active'
            };

            if (!isSuperAdmin && user?.institution_id) {
                userPayload.institution_id = user.institution_id;
            }

            await api.auth.adminCreateUser(newUser.email, newUser.password, userPayload);

            alert('Usuario creado exitosamente.');
            setShowCreateModal(false);
            setNewUser({
                email: '',
                password: '',
                name: '',
                lastname: '',
                role: 'player',
                phone: '',
                dni: '',
                category: '4ta',
                is_member: true,
                member_number: ''
            });
            loadUsers();
        } catch (error: any) {
            console.error(error);
            alert('Error al crear usuario: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    // Filter Logic:
    const scopedUsers = users.filter(u => {
        if (!isSuperAdmin && user?.institution_id) {
            return u.institution_id === user.institution_id;
        }
        return true;
    });

    const pendingUsers = scopedUsers.filter(u => !u.is_approved || u.member_status === 'pending');
    const activeMembers = scopedUsers.filter(u => u.is_approved && u.member_status !== 'pending');

    const displayedUsers = (activeTab === 'pending' ? pendingUsers : activeMembers).filter(u => {
        return (
            u.name.toLowerCase().includes(filter.toLowerCase()) ||
            (u.lastname && u.lastname.toLowerCase().includes(filter.toLowerCase())) ||
            u.email.toLowerCase().includes(filter.toLowerCase()) ||
            (u.dni && u.dni.includes(filter)) ||
            (u.member_number && u.member_number.includes(filter))
        );
    });

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-primary" /> Administración de Socios y Usuarios
                    </h2>
                    <p className="text-muted text-sm">
                        {isSuperAdmin
                            ? 'Gestión global de permisos, roles y clubes.'
                            : `Gestión de socios y jugadores de ${user?.institution || 'tu club'}.`}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64" id="user-search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar nombre, DNI, socio..."
                            className="w-full bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <button
                        id="btn-create-user"
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 whitespace-nowrap text-sm"
                    >
                        <UserPlus size={18} /> Nuevo Socio / Usuario
                    </button>

                    {user?.institution_id && (
                        <button
                            onClick={() => {
                                const inviteUrl = `${window.location.origin}/?club=${user.institution_id}&mode=register`;
                                navigator.clipboard.writeText(inviteUrl);
                                alert('¡Enlace de invitación copiado al portapapeles! Compártelo para que los nuevos socios se registren directamente en tu club.');
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border border-white/10 whitespace-nowrap text-sm"
                            title="Copiar link directo para que nuevos socios se registren con tu club preseleccionado"
                        >
                            <Building size={16} className="text-primary" /> Link Invitación Club
                        </button>
                    )}
                </div>
            </div>

            {/* TABS HEADER */}
            <div className="flex border-b border-white/10 gap-4">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors relative ${
                        activeTab === 'members'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted hover:text-white'
                    }`}
                >
                    <UserCheck size={18} />
                    Socios y Jugadores Activos
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold text-white">
                        {activeMembers.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors relative ${
                        activeTab === 'pending'
                            ? 'text-yellow-400 border-b-2 border-yellow-400'
                            : 'text-muted hover:text-white'
                    }`}
                >
                    <Clock size={18} />
                    Solicitudes Pendientes
                    {pendingUsers.length > 0 && (
                        <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                            {pendingUsers.length} nuevas
                        </span>
                    )}
                </button>
            </div>

            {/* TAB: SOLICITUDES PENDIENTES */}
            {activeTab === 'pending' && (
                <div className="space-y-4">
                    {displayedUsers.length === 0 ? (
                        <div className="bg-card/40 border border-white/10 rounded-2xl p-12 text-center text-muted">
                            <CheckCheck size={40} className="mx-auto text-green-400 mb-3 opacity-80" />
                            <h3 className="text-lg font-bold text-white mb-1">¡Al día! No hay solicitudes pendientes</h3>
                            <p className="text-sm">Todos los jugadores registrados en tu club han sido verificados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedUsers.map(u => (
                                <div key={u.id} className="bg-card/70 border border-yellow-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-700 flex items-center justify-center font-bold text-lg text-white border border-white/10">
                                                {(u.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-base">{formatPlayerName(u.name, u.lastname)}</h4>
                                                <p className="text-xs text-muted">{u.email}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                                                    {u.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-green-400" /> {u.phone}</span>}
                                                    {u.dni && <span className="flex items-center gap-1"><CreditCard size={12} className="text-blue-400" /> DNI: {u.dni}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase border border-yellow-500/30 flex items-center gap-1">
                                            <Clock size={12} /> Pendiente
                                        </span>
                                    </div>

                                    {/* QUICK APPROVAL BOX */}
                                    {approvingUserId === u.id ? (
                                        <div className="bg-slate-900/90 border border-primary/40 rounded-xl p-4 space-y-3 animate-fade-up">
                                            <h5 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                                                <Award size={14} /> Homologar Club, Categoría y Membresía
                                            </h5>

                                            {/* Selector de Club (Especialmente para SuperAdmin) */}
                                            <div>
                                                <label className="text-[11px] text-muted font-bold block mb-1">Club / Sede Asignada *</label>
                                                <select
                                                    className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none"
                                                    value={approvalInstitutionId}
                                                    onChange={e => setApprovalInstitutionId(e.target.value)}
                                                    disabled={!isSuperAdmin && !!user?.institution_id}
                                                >
                                                    <option value="">-- Sin Club Asignado --</option>
                                                    {institutions.map(inst => (
                                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] text-muted font-bold block mb-1">Categoría Oficial</label>
                                                    <select
                                                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none"
                                                        value={approvalCategory}
                                                        onChange={e => setApprovalCategory(e.target.value)}
                                                    >
                                                        {NUMERIC_CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat} Categoría</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[11px] text-muted font-bold block mb-1">N° de Socio (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1450"
                                                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none"
                                                        value={approvalMemberNumber}
                                                        onChange={e => setApprovalMemberNumber(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-white/5">
                                                <input
                                                    type="checkbox"
                                                    id={`is-member-check-${u.id}`}
                                                    className="accent-primary w-4 h-4 cursor-pointer"
                                                    checked={approvalIsMember}
                                                    onChange={e => setApprovalIsMember(e.target.checked)}
                                                />
                                                <label htmlFor={`is-member-check-${u.id}`} className="text-xs text-slate-300 cursor-pointer select-none">
                                                    Es Socio Oficial del Club (Tarifa preferencial)
                                                </label>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => setApprovingUserId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-white transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleQuickApprove(u)}
                                                    disabled={processingApproval}
                                                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-lg shadow-green-500/20"
                                                >
                                                    {processingApproval ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirmar y Habilitar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pt-2 border-t border-white/10">
                                            {/* Info de Club solicitado y Categoría pretendida */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Building size={13} className="text-slate-400 shrink-0" />
                                                    <span className="text-muted truncate">Club:</span>
                                                    <span className="font-bold text-primary truncate">
                                                        {u.institution || institutions.find(i => i.id === u.institution_id)?.name || 'Independiente'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 justify-end">
                                                    <Award size={13} className="text-amber-400 shrink-0" />
                                                    <span className="text-muted">Categoría:</span>
                                                    <span className="font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px]">
                                                        {u.category || 'Sin declarar'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="px-3 py-1.5 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-colors flex items-center gap-1"
                                                >
                                                    <Edit2 size={12} /> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(u.id)}
                                                    className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
                                                >
                                                    Rechazar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setApprovingUserId(u.id);
                                                        setApprovalCategory(u.category || '4ta');
                                                        setApprovalMemberNumber(u.member_number || '');
                                                        setApprovalInstitutionId(u.institution_id || '');
                                                        setApprovalIsMember(true);
                                                    }}
                                                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-lg shadow-primary/20 transition-all"
                                                >
                                                    <CheckCheck size={14} /> Revisar y Aprobar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: SOCIOS Y JUGADORES ACTIVOS */}
            {activeTab === 'members' && (
                <div className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden min-h-[300px]" id="users-table">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-muted text-xs uppercase tracking-wider">
                                    <th className="p-4">Usuario / Socio</th>
                                    <th className="p-4">Tipo & Rol</th>
                                    <th className="p-4 hidden md:table-cell">Institución</th>
                                    <th className="p-4 hidden sm:table-cell">Categoría</th>
                                    <th className="p-4 hidden lg:table-cell">Contacto</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted">Cargando usuarios...</td></tr>
                                ) : displayedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted">
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle size={32} className="opacity-50" />
                                                <p>No se encontraron socios bajo tu gestión.</p>
                                                {!isSuperAdmin && (
                                                    <p className="text-xs max-w-md mx-auto">
                                                        Solo puedes ver usuarios asignados a <strong>{user?.institution}</strong>.
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayedUsers.map((u, index) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors text-sm">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                                                    {(u.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-1.5">
                                                        {formatPlayerName(u.name, u.lastname)}
                                                        {u.is_member && (
                                                            <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] px-1.5 py-0.2 rounded font-bold uppercase">
                                                                Socio {u.member_number ? `#${u.member_number}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                                u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                u.role === 'superadmin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                u.role === 'professor' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                <Shield size={12} /> {u.role === 'professor' ? 'Profesor' : u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-300 hidden md:table-cell">
                                            {u.institution || <span className="text-muted italic">Sin asignar</span>}
                                        </td>
                                        <td className="p-4 text-xs font-semibold text-primary hidden sm:table-cell">
                                            {u.category ? `${u.category} Categoría` : <span className="text-muted font-normal">Sin Asignar</span>}
                                        </td>
                                        <td className="p-4 text-xs text-muted hidden lg:table-cell">
                                            <div>{u.phone || '-'}</div>
                                            {u.dni && <div className="text-[11px] text-slate-400">DNI: {u.dni}</div>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Role Select */}
                                                <select
                                                    className="bg-slate-800 text-white text-xs py-1.5 px-2 rounded-lg border border-white/10 outline-none cursor-pointer hover:border-white/30 focus:border-primary transition-all shadow-sm"
                                                    value={u.role}
                                                    onChange={(e) => handleRoleUpdate(u.id, e.target.value as UserRole)}
                                                    disabled={!isSuperAdmin && u.role === 'superadmin'}
                                                >
                                                    <option value="player" className="bg-slate-800 text-white">Jugador</option>
                                                    <option value="professor" className="bg-slate-800 text-white">Profesor</option>
                                                    <option value="admin" className="bg-slate-800 text-white">Organizador / Admin</option>

                                                    {isSuperAdmin && (
                                                        <>
                                                            <option value="coordinator" className="bg-slate-800 text-white">Coordinador</option>
                                                            <option value="superadmin" className="bg-slate-800 text-white">Super Admin</option>
                                                        </>
                                                    )}
                                                </select>

                                                {/* Edit Profile Button */}
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                                                    title="Editar datos del usuario"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Edit2 size={18} className="text-primary" /> Editar Usuario: {editingUser.name} {editingUser.lastname}
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSaveUserEdit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Nombre *</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={editFormData.name}
                                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Apellido *</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={editFormData.lastname}
                                        onChange={e => setEditFormData({ ...editFormData, lastname: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Email / Correo *</label>
                                <input
                                    type="email"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                    value={editFormData.email}
                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Super Admin Password Field */}
                            {isSuperAdmin && (
                                <div className="space-y-1 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                                    <label className="text-xs text-amber-300 uppercase font-bold flex items-center justify-between">
                                        <span>🔑 Cambiar Contraseña (Super Admin)</span>
                                        <span className="text-[10px] text-muted font-normal lowercase">(Dejar en blanco para no modificar)</span>
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Nueva contraseña (mínimo 6 caracteres)"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={editFormData.password}
                                        onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                                        minLength={6}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Teléfono / WhatsApp</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={editFormData.phone}
                                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">DNI / Documento</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={editFormData.dni}
                                        onChange={e => setEditFormData({ ...editFormData, dni: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* SOCIO & CATEGORIA CONFIG */}
                            <div className="p-4 bg-slate-900/80 border border-white/10 rounded-xl space-y-3">
                                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <Award size={14} /> Membresía y Nivel en el Club
                                </h4>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted font-semibold">Categoría Oficial</label>
                                        <select
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                            value={editFormData.category}
                                            onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                                        >
                                            <option value="">Sin Categoría</option>
                                            {NUMERIC_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat} Categoría</option>
                                            ))}
                                            <option value="Open">Open</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-muted font-semibold">N° de Carnet / Socio</label>
                                        <input
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                            placeholder="Ej: 00482"
                                            value={editFormData.member_number}
                                            onChange={e => setEditFormData({ ...editFormData, member_number: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                            checked={editFormData.is_member}
                                            onChange={e => setEditFormData({ ...editFormData, is_member: e.target.checked })}
                                        />
                                        <span>Es Socio Activo del Club (Tarifa preferencial)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Super Admin Specific Controls: Role & Institution */}
                            {isSuperAdmin && (
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Rol en Sistema</label>
                                        <select
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                            value={editFormData.role}
                                            onChange={e => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                                        >
                                            <option value="player">Jugador</option>
                                            <option value="professor">Profesor (Sin Caja)</option>
                                            <option value="admin">Administrador (Club)</option>
                                            <option value="coordinator">Coordinador</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Club / Institución</label>
                                        <select
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                            value={editFormData.institution_id}
                                            onChange={e => setEditFormData({ ...editFormData, institution_id: e.target.value })}
                                        >
                                            <option value="">Sin Asignar</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {updating ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : <><Save size={18} /> Guardar Cambios</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE USER MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div id="create-user-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-lg p-0 shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} /> Crear Nuevo Socio / Usuario</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
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
                                    <label className="text-xs text-muted uppercase font-bold">DNI / Documento</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.dni}
                                        onChange={e => setNewUser({ ...newUser, dni: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Teléfono / WhatsApp</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.phone}
                                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Rol de Usuario</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                                    >
                                        <option value="player">Jugador</option>
                                        <option value="professor">Profesor</option>
                                        <option value="admin">Organizador / Admin</option>
                                        {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">N° de Carnet (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 00482"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.member_number}
                                        onChange={e => setNewUser({ ...newUser, member_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                                >
                                    {creating ? <><Loader2 className="animate-spin" size={18} /> Creando...</> : <><Save size={18} /> Crear Socio</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
