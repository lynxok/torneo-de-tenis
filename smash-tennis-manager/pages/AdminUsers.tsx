
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, UserRole, Institution } from '../types';
import { api } from '../services/api';
import { Search, Shield, UserPlus, X, Loader2, Save, Building, AlertCircle, CheckCheck, Edit2, UserCheck, Users, Clock, Award, Check, Phone, CreditCard, Calendar, Trophy, Medal, LayoutList, Layers, Trash2, Gift, Sparkles } from 'lucide-react';
import { NUMERIC_CATEGORIES } from '../utils/categories';
import { formatPlayerName } from '../utils/formatters';
import { formatGender, calculateAge, getAgeCategoryLabel, getGenderBadgeClass } from '../utils/demographics';
import { computeRankings, normalizeCategoryKey, RankedPlayer } from '../utils/ranking';

interface AdminUsersProps {
    user?: UserProfile;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ user }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewGrouping, setViewGrouping] = useState<boolean>(true);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
        gender: 'masculino',
        birth_date: '',
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
        gender: 'masculino',
        birth_date: '',
        role: 'player' as UserRole,
        institution_id: '',
        is_member: false,
        member_number: '',
        member_status: 'active' as 'active' | 'pending' | 'inactive',
        is_membership_active: false,
        membership_type: 'none' as 'none' | 'vip_permanent' | 'vip_time_limited',
        membership_months: 6,
        free_tournaments_remaining: 0
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
            gender: u.gender || 'masculino',
            birth_date: u.birth_date || '',
            role: u.role || 'player',
            institution_id: u.institution_id || '',
            is_member: !!u.is_member,
            member_number: u.member_number || '',
            member_status: u.member_status || 'active',
            is_membership_active: Boolean(u.is_membership_active),
            membership_type: (u.membership_type as any) || 'none',
            membership_months: 6,
            free_tournaments_remaining: u.free_tournaments_remaining || 0
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
                gender: editFormData.gender || 'masculino',
                birth_date: editFormData.birth_date || null,
                role: editFormData.role,
                institution_id: editFormData.institution_id ? editFormData.institution_id : null,
                is_member: editFormData.is_member,
                member_number: editFormData.member_number,
                member_status: editFormData.member_status || (editFormData.is_member ? 'active' : 'inactive')
            };

            if (isSuperAdmin) {
                let expiresAt: string | null = null;
                if (editFormData.membership_type === 'vip_time_limited') {
                    const d = new Date();
                    d.setMonth(d.getMonth() + (Number(editFormData.membership_months) || 6));
                    expiresAt = d.toISOString();
                }
                updates.is_membership_active = editFormData.membership_type !== 'none';
                updates.membership_type = editFormData.membership_type;
                updates.membership_expires_at = expiresAt;
                updates.free_tournaments_remaining = Number(editFormData.free_tournaments_remaining) || 0;
            }

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
            await api.auth.updateProfile(userId, { 
                is_approved: !currentStatus,
                member_status: !currentStatus ? 'active' : 'inactive'
            });
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
                category: approvalCategory,
                is_member: approvalIsMember,
                member_number: approvalMemberNumber.trim() || undefined,
                member_status: 'active'
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

    const handleDeleteUser = async (targetUser: UserProfile) => {
        if (!isSuperAdmin) {
            alert('Solo los Super Administradores tienen permisos para eliminar usuarios.');
            return;
        }

        if (targetUser.id === user?.id) {
            alert('No puedes eliminar tu propia cuenta de Super Administrador.');
            return;
        }

        const fullName = formatPlayerName(targetUser.name, targetUser.lastname);
        const confirmed = confirm(
            `⚠️ ¿CONFIRMAR ELIMINACIÓN PERMANENTE?\n\n` +
            `Vas a eliminar permanentemente al usuario: ${fullName}\n` +
            `Email: ${targetUser.email}\n` +
            `Rol: ${targetUser.role}\n\n` +
            `Esta acción borrará el registro de la base de datos de forma irreversible.\n¿Deseas continuar?`
        );

        if (!confirmed) return;

        try {
            setDeletingUserId(targetUser.id);
            await api.auth.deleteUser(targetUser.id);
            alert(`El usuario ${fullName} ha sido eliminado correctamente.`);
            if (showEditModal && editingUser?.id === targetUser.id) {
                setShowEditModal(false);
            }
            loadUsers();
        } catch (error: any) {
            console.error("Error al eliminar usuario:", error);
            alert('Error al eliminar usuario: ' + (error.message || error));
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUser.name?.trim() || !newUser.lastname?.trim()) {
            alert('Por favor ingresa Nombre y Apellido.');
            return;
        }
        if (!newUser.dni?.trim()) {
            alert('El DNI / Documento es obligatorio.');
            return;
        }
        if (!newUser.gender) {
            alert('La Rama / Género es obligatoria.');
            return;
        }
        if (!newUser.category) {
            alert('La Categoría es obligatoria.');
            return;
        }

        setCreating(true);

        try {
            const userPayload: any = {
                name: newUser.name.trim(),
                lastname: newUser.lastname.trim(),
                role: newUser.role,
                phone: newUser.phone?.trim() || '',
                dni: newUser.dni.trim(),
                gender: newUser.gender || 'masculino',
                birth_date: newUser.birth_date || null,
                category: newUser.category,
                is_approved: true,
                is_member: newUser.is_member,
                member_number: newUser.member_number || null,
                member_status: 'active'
            };

            if (!isSuperAdmin && user?.institution_id) {
                userPayload.institution_id = user.institution_id;
            }

            await api.auth.adminCreateUser(newUser.email.trim(), newUser.password, userPayload);

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
                gender: 'masculino',
                birth_date: '',
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

    // Filter & Ranking Logic:
    const scopedUsers = useMemo(() => {
        return users.filter(u => {
            if (u.role === 'inactive' || u.member_status === 'deleted' || u.name?.includes('[Usuario Eliminado]') || u.name?.includes('[Eliminado]')) {
                return false;
            }
            if (!isSuperAdmin && user?.institution_id) {
                return u.institution_id === user.institution_id;
            }
            return true;
        });
    }, [users, isSuperAdmin, user?.institution_id]);

    const pendingUsers = useMemo(() => {
        return scopedUsers.filter(u => !u.is_approved || u.member_status === 'pending');
    }, [scopedUsers]);

    const activeMembers = useMemo(() => {
        return scopedUsers.filter(u => u.is_approved && u.member_status !== 'pending');
    }, [scopedUsers]);

    const rankedMembers = useMemo(() => {
        return computeRankings(activeMembers);
    }, [activeMembers]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: activeMembers.length };
        NUMERIC_CATEGORIES.forEach(c => { counts[c] = 0; });
        counts['Sin Asignar'] = 0;

        activeMembers.forEach(m => {
            const cat = normalizeCategoryKey(m.category);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [activeMembers]);

    const displayedPending = useMemo(() => {
        return pendingUsers.filter(u => {
            return (
                u.name.toLowerCase().includes(filter.toLowerCase()) ||
                (u.lastname && u.lastname.toLowerCase().includes(filter.toLowerCase())) ||
                u.email.toLowerCase().includes(filter.toLowerCase()) ||
                (u.dni && u.dni.includes(filter)) ||
                (u.member_number && u.member_number.includes(filter))
            );
        });
    }, [pendingUsers, filter]);

    const displayedMembers = useMemo(() => {
        return rankedMembers.filter(u => {
            const matchesFilter = (
                u.name.toLowerCase().includes(filter.toLowerCase()) ||
                (u.lastname && u.lastname.toLowerCase().includes(filter.toLowerCase())) ||
                u.email.toLowerCase().includes(filter.toLowerCase()) ||
                (u.dni && u.dni.includes(filter)) ||
                (u.member_number && u.member_number.includes(filter))
            );
            if (!matchesFilter) return false;

            if (selectedCategory === 'all') return true;
            return normalizeCategoryKey(u.category).toLowerCase() === selectedCategory.toLowerCase();
        });
    }, [rankedMembers, filter, selectedCategory]);

    const groupedMembers = useMemo(() => {
        const order = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', 'Open', 'Sin Asignar'];
        const groups: { category: string; players: RankedPlayer[] }[] = [];

        const activeCats = selectedCategory === 'all' ? order : [selectedCategory];

        activeCats.forEach(cat => {
            const playersInCat = displayedMembers.filter(p => normalizeCategoryKey(p.category) === cat);
            if (playersInCat.length > 0 || selectedCategory !== 'all') {
                groups.push({ category: cat, players: playersInCat });
            }
        });

        return groups;
    }, [displayedMembers, selectedCategory]);

    const renderUserRow = (u: RankedPlayer) => {
        const isPodium = u.category_rank <= 3;
        const podiumBadge = u.category_rank === 1
            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-500/10'
            : u.category_rank === 2
                ? 'bg-slate-300/20 text-slate-200 border-slate-300/40 shadow-slate-300/10'
                : u.category_rank === 3
                    ? 'bg-amber-700/20 text-amber-300 border-amber-700/40 shadow-amber-700/10'
                    : 'bg-white/5 text-slate-400 border-white/10';

        const podiumIcon = u.category_rank === 1
            ? '🥇'
            : u.category_rank === 2
                ? '🥈'
                : u.category_rank === 3
                    ? '🥉'
                    : null;

        return (
            <tr key={u.id} className="hover:bg-white/5 transition-colors text-sm">
                <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-black border shadow-sm ${podiumBadge}`}>
                        {podiumIcon ? `${podiumIcon} #${u.category_rank}` : `#${u.category_rank}`}
                    </span>
                </td>
                <td className="p-3.5">
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
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getGenderBadgeClass(u.gender)}`}>
                                    {formatGender(u.gender)}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {getAgeCategoryLabel(u.birth_date)}
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
                <td className="p-3.5">
                    <div className="flex flex-col">
                        <span className="font-black text-primary text-sm flex items-center gap-1">
                            <Award size={13} className="text-accent" /> {u.calculated_points} pts
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {u.matches_won || 0} PG • {u.tournaments_won || 0} TG
                        </span>
                    </div>
                </td>
                <td className="p-3.5">
                    <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            u.role === 'superadmin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            u.role === 'professor' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                            <Shield size={12} /> {u.role === 'professor' ? 'Profesor' : u.role}
                        </span>

                        {/* VIP & Free Trial Badges */}
                        {u.is_membership_active && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles size={10} /> {u.membership_type === 'vip_permanent' ? 'VIP Permanente' : 'VIP Temporal'}
                            </span>
                        )}
                        {(u.free_tournaments_remaining || 0) > 0 && !u.is_membership_active && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                <Gift size={10} /> {u.free_tournaments_remaining} {u.free_tournaments_remaining === 1 ? 'Torneo Gratis' : 'Torneos Gratis'}
                            </span>
                        )}
                    </div>
                </td>
                <td className="p-3.5 text-xs text-slate-300 hidden md:table-cell">
                    {u.institution || <span className="text-muted italic">Sin asignar</span>}
                </td>
                <td className="p-3.5 text-xs text-muted hidden lg:table-cell">
                    <div>{u.phone || '-'}</div>
                    {u.dni && <div className="text-[11px] text-slate-400">DNI: {u.dni}</div>}
                </td>
                <td className="p-3.5 text-right">
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

                        {/* Delete User Button (Super Admin Only) */}
                        {isSuperAdmin && (
                            <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={u.id === user?.id || deletingUserId === u.id}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={u.id === user?.id ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario permanentemente"}
                            >
                                {deletingUserId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

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
                    {displayedPending.length === 0 ? (
                        <div className="bg-card/40 border border-white/10 rounded-2xl p-12 text-center text-muted">
                            <CheckCheck size={40} className="mx-auto text-green-400 mb-3 opacity-80" />
                            <h3 className="text-lg font-bold text-white mb-1">¡Al día! No hay solicitudes pendientes</h3>
                            <p className="text-sm">Todos los jugadores registrados en tu club han sido verificados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedPending.map(u => (
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
                                                        {NUMERIC_CATEGORIES.map(c => (
                                                            <option key={c} value={c}>{c === 'Open' ? 'Open' : `${c} Categoría`}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[11px] text-muted font-bold block mb-1">N° de Socio (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1042"
                                                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none"
                                                        value={approvalMemberNumber}
                                                        onChange={e => setApprovalMemberNumber(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id={`approve-member-${u.id}`}
                                                    checked={approvalIsMember}
                                                    onChange={e => setApprovalIsMember(e.target.checked)}
                                                    className="rounded bg-slate-800 border-white/20 text-primary focus:ring-0 cursor-pointer"
                                                />
                                                <label htmlFor={`approve-member-${u.id}`} className="text-xs text-white cursor-pointer select-none">
                                                    Registrar como <strong>Socio Oficial</strong>
                                                </label>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                                                <button
                                                    onClick={() => setApprovingUserId(null)}
                                                    className="px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-white text-xs"
                                                    disabled={processingApproval}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleQuickApprove(u)}
                                                    className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-dark text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg shadow-green-500/20"
                                                    disabled={processingApproval}
                                                >
                                                    {processingApproval ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    Confirmar y Homologar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                                            <span className="text-xs text-muted">
                                                Club solicitado: <strong className="text-white">{u.institution || 'Sin club'}</strong>
                                            </span>

                                            <div className="flex gap-2">
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
                <div className="space-y-6">
                    {/* Category Filter Pills & View Toggle */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 p-3 rounded-2xl border border-white/10">
                        {/* Horizontal Category Selector */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    selectedCategory === 'all'
                                        ? 'bg-primary text-dark shadow-md shadow-primary/20'
                                        : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Users size={13} /> Todas las Categorías
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === 'all' ? 'bg-black/20 text-dark' : 'bg-white/10 text-white'}`}>
                                    {categoryCounts['all'] || 0}
                                </span>
                            </button>

                            {NUMERIC_CATEGORIES.map(cat => {
                                const count = categoryCounts[cat] || 0;
                                const isSelected = selectedCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-primary text-dark shadow-md shadow-primary/20'
                                                : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <Trophy size={12} className={isSelected ? 'text-dark' : 'text-amber-400'} />
                                        {cat === 'Open' ? 'Open' : `${cat}`}
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-black/20 text-dark' : 'bg-white/10 text-white'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}

                            {(categoryCounts['Sin Asignar'] || 0) > 0 && (
                                <button
                                    onClick={() => setSelectedCategory('Sin Asignar')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        selectedCategory === 'Sin Asignar'
                                            ? 'bg-primary text-dark shadow-md shadow-primary/20'
                                            : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    Sin Asignar
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-white">
                                        {categoryCounts['Sin Asignar']}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* View Mode Toggle (Grouped by Category vs Flat Table) */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                            <button
                                onClick={() => setViewGrouping(true)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                    viewGrouping ? 'bg-primary text-dark shadow' : 'text-muted hover:text-white'
                                }`}
                                title="Ver agrupado por categorías"
                            >
                                <Layers size={13} /> Agrupado
                            </button>
                            <button
                                onClick={() => setViewGrouping(false)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                    !viewGrouping ? 'bg-primary text-dark shadow' : 'text-muted hover:text-white'
                                }`}
                                title="Ver tabla continua unificada"
                            >
                                <LayoutList size={13} /> Lista
                            </button>
                        </div>
                    </div>

                    {/* USERS TABLES / GROUPED VIEW */}
                    {loading ? (
                        <div className="bg-card/50 border border-white/10 rounded-2xl p-12 text-center text-muted">
                            <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                            <p>Cargando socios y rankings...</p>
                        </div>
                    ) : displayedMembers.length === 0 ? (
                        <div className="bg-card/50 border border-white/10 rounded-2xl p-12 text-center text-muted">
                            <AlertCircle size={36} className="mx-auto opacity-50 mb-2" />
                            <p className="font-bold text-white">No se encontraron socios en este criterio.</p>
                            <p className="text-xs text-muted mt-1">Prueba cambiando de categoría o ajustando el término de búsqueda.</p>
                        </div>
                    ) : viewGrouping ? (
                        /* GROUPED VIEW */
                        <div className="space-y-6">
                            {groupedMembers.map(group => (
                                <div key={group.category} className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                                    {/* Category Header */}
                                    <div className="p-4 bg-gradient-to-r from-white/10 via-white/5 to-transparent border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                                                <Trophy size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base">
                                                    {group.category === 'Open' || group.category === 'Sin Asignar' ? group.category : `${group.category} Categoría`}
                                                </h3>
                                                <p className="text-[11px] text-muted">
                                                    {group.players.length} {group.players.length === 1 ? 'jugador registrado' : 'jugadores registrados'} en este nivel
                                                </p>
                                            </div>
                                        </div>

                                        {group.players.length > 0 && group.players[0].calculated_points > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl text-xs font-bold">
                                                <span>👑 Líder de Categoría:</span>
                                                <span className="text-white">{formatPlayerName(group.players[0].name, group.players[0].lastname)}</span>
                                                <span className="text-primary font-black">({group.players[0].calculated_points} pts)</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Table for this Category */}
                                    {group.players.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-muted italic">
                                            Sin jugadores asignados en {group.category}.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/10 text-muted text-[11px] uppercase tracking-wider">
                                                        <th className="p-3.5 text-center w-24">Ranking</th>
                                                        <th className="p-3.5">Usuario / Socio</th>
                                                        <th className="p-3.5">Puntos Oficiales</th>
                                                        <th className="p-3.5">Tipo & Rol</th>
                                                        <th className="p-3.5 hidden md:table-cell">Institución</th>
                                                        <th className="p-3.5 hidden lg:table-cell">Contacto</th>
                                                        <th className="p-3.5 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {group.players.map(u => renderUserRow(u))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* FLAT UNIFIED TABLE */
                        <div className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl overflow-hidden shadow-xl" id="users-table">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10 text-muted text-[11px] uppercase tracking-wider">
                                            <th className="p-3.5 text-center w-24">Ranking</th>
                                            <th className="p-3.5">Usuario / Socio</th>
                                            <th className="p-3.5">Puntos Oficiales</th>
                                            <th className="p-3.5">Tipo & Rol</th>
                                            <th className="p-3.5 hidden md:table-cell">Institución</th>
                                            <th className="p-3.5 hidden lg:table-cell">Contacto</th>
                                            <th className="p-3.5 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {displayedMembers.map(u => renderUserRow(u))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Rama / Género</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
                                        value={editFormData.gender}
                                        onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                                    >
                                        <option value="masculino">Masculino (Caballeros)</option>
                                        <option value="femenino">Femenino (Damas)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                        <span>F. Nacimiento</span>
                                        {editFormData.birth_date && (
                                            <span className="text-[10px] text-green-400 font-bold">
                                                {calculateAge(editFormData.birth_date)} años
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary transition-colors text-xs"
                                        value={editFormData.birth_date}
                                        onChange={e => setEditFormData({ ...editFormData, birth_date: e.target.value })}
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

                            {/* Superadmin VIP & Free Trial Exemptions */}
                            {isSuperAdmin && (
                                <div className="pt-4 border-t border-purple-500/30 space-y-3 bg-purple-950/20 p-4 rounded-2xl border border-purple-500/30">
                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                                        <Gift size={16} /> Beneficios, Membresía VIP & Torneos Gratis (Super Admin)
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted uppercase font-bold">Tipo de Membresía</label>
                                            <select
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-purple-400 outline-none"
                                                value={editFormData.membership_type}
                                                onChange={e => setEditFormData({
                                                    ...editFormData,
                                                    membership_type: e.target.value as any,
                                                    is_membership_active: e.target.value !== 'none'
                                                })}
                                            >
                                                <option value="none">Estándar (Sin VIP)</option>
                                                <option value="vip_permanent">👑 VIP Permanente (0% Comisión)</option>
                                                <option value="vip_time_limited">⏳ VIP Temporal (X Meses)</option>
                                            </select>
                                        </div>

                                        {editFormData.membership_type === 'vip_time_limited' && (
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-muted uppercase font-bold">Meses de Bonificación</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={36}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-purple-400 outline-none"
                                                    value={editFormData.membership_months}
                                                    onChange={e => setEditFormData({ ...editFormData, membership_months: Number(e.target.value) })}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted uppercase font-bold">Torneos Gratis Restantes</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={20}
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-cyan-300 text-xs font-bold focus:border-purple-400 outline-none"
                                                value={editFormData.free_tournaments_remaining}
                                                onChange={e => setEditFormData({ ...editFormData, free_tournaments_remaining: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted">
                                        Los organizadores VIP o con torneos gratis tendrán 0% de comisión de app al crear torneos.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-between items-center border-t border-white/10">
                                {isSuperAdmin && editingUser && editingUser.id !== user?.id ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteUser(editingUser)}
                                        disabled={deletingUserId === editingUser.id}
                                        className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                                        title="Eliminar permanentemente este usuario"
                                    >
                                        {deletingUserId === editingUser.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        Eliminar Usuario
                                    </button>
                                ) : <div />}

                                <div className="flex gap-3">
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
                                    <label className="text-xs text-muted uppercase font-bold">DNI / Documento *</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.dni}
                                        onChange={e => setNewUser({ ...newUser, dni: e.target.value })}
                                        required
                                        placeholder="Ej: 38450123"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Teléfono / WhatsApp</label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                                        value={newUser.phone}
                                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                        placeholder="Ej: 3434123456"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Rama / Género *</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
                                        value={newUser.gender}
                                        onChange={e => setNewUser({ ...newUser, gender: e.target.value })}
                                        required
                                    >
                                        <option value="masculino">Masculino (Caballeros)</option>
                                        <option value="femenino">Femenino (Damas)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría *</label>
                                    <select
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
                                        value={newUser.category}
                                        onChange={e => setNewUser({ ...newUser, category: e.target.value })}
                                        required
                                    >
                                        {NUMERIC_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>
                                                {cat === 'Open' ? 'Categoría Open' : `${cat} Categoría`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                        <span>F. Nacimiento</span>
                                        {newUser.birth_date && (
                                            <span className="text-[10px] text-green-400 font-bold">
                                                {calculateAge(newUser.birth_date)} años
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary transition-colors text-xs"
                                        value={newUser.birth_date}
                                        onChange={e => setNewUser({ ...newUser, birth_date: e.target.value })}
                                    />
                                </div>
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
