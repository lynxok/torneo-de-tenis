import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, Institution, UserClubMembership, PlayerStatsSummary, PlayerAchievement } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    User, Mail, Award, MapPin, Phone, Edit2, Shield, CreditCard, Calendar, X, Check, Save, 
    AlertTriangle, Camera, UploadCloud, Loader2, Star, Plus, Trash2, Sparkles, Building as BuildingIcon, CheckCircle2, Smartphone, Trophy,
    Volume2, VolumeX, Flame, Zap, TrendingUp, Activity, Crown, Medal, Target, ChevronRight, Lock
} from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import imageCompression from 'browser-image-compression';
import { formatPlayerName } from '../utils/formatters';
import { formatGender, calculateAge, getAgeCategoryLabel, getGenderBadgeClass } from '../utils/demographics';
import { getUserRankInfo } from '../utils/ranking';
import { calculatePlayerAchievements, getTierColorClasses } from '../utils/achievements';
import { PlayerCardModal } from '../components/PlayerCardModal';
import { RankingEvolutionChart } from '../components/RankingEvolutionChart';
import { soundEffects } from '../services/soundEffects';

interface ProfileProps {
    user: UserProfile;
    onProfileUpdate: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onProfileUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [playerStats, setPlayerStats] = useState<PlayerStatsSummary | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [showPlayerCardModal, setShowPlayerCardModal] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(soundEffects.getSoundEnabled());
    const { addToast } = useToast();

    // Memberships Modal State
    const [showAddMembershipModal, setShowAddMembershipModal] = useState(false);
    const [newInstId, setNewInstId] = useState('');
    const [newMemberNumber, setNewMemberNumber] = useState('');
    const [newIsPrimary, setNewIsPrimary] = useState(false);
    const [savingMembership, setSavingMembership] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: user.name || '',
        lastname: user.lastname || '',
        phone: user.phone || '',
        dni: user.dni || '',
        category: user.category || '',
        gender: user.gender || 'masculino',
        birth_date: user.birth_date || '',
        institution_id: user.institution_id || '',
        show_whatsapp: user.show_whatsapp !== false,
        newPassword: '',
        confirmPassword: ''
    });

    // Image Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.profile_picture_url || null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Cropping State
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

    const [bannerUrl, setBannerUrl] = useState('/profile-banner.jpg');

    useEffect(() => {
        // Load institutions for the dropdown
        api.institutions.getAll().then(setInstitutions);

        // Load all profiles for accurate ranking computation
        api.auth.getAllProfiles().then(setAllProfiles).catch(() => {});

        // Load System Settings (Banner)
        api.settings.getConfig().then(config => {
            if (config.profile_banner_url) {
                setBannerUrl(config.profile_banner_url);
            }
        });

        // Load Detailed Player Stats
        api.stats.getPlayerDetailedStats(user.id)
            .then(setPlayerStats)
            .catch(console.error)
            .finally(() => setLoadingStats(false));
    }, [user.id]);

    const handleToggleSound = () => {
        const next = !soundEnabled;
        soundEffects.setSoundEnabled(next);
        setSoundEnabled(next);
        if (next) soundEffects.playTennisHit();
        addToast(next ? "🔊 Sonidos y vibración activados" : "🔇 Sonidos silenciados", "info");
    };

    // Achievements state
    const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
    const [selectedAchievement, setSelectedAchievement] = useState<PlayerAchievement | null>(null);

    const rankInfo = useMemo(() => {
        return getUserRankInfo(user.id, allProfiles.length > 0 ? allProfiles : [user]);
    }, [user, allProfiles]);

    const achievements = useMemo(() => {
        return calculatePlayerAchievements(user, playerStats, allProfiles);
    }, [user, playerStats, allProfiles]);

    const filteredAchievements = useMemo(() => {
        if (achievementFilter === 'unlocked') return achievements.filter(a => a.unlocked);
        if (achievementFilter === 'locked') return achievements.filter(a => !a.unlocked);
        return achievements;
    }, [achievements, achievementFilter]);

    const unlockedCount = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements]);

    const userMemberships = api.memberships.getUserMemberships(user);

    const handleSetPrimaryClub = async (institutionId: string) => {
        try {
            await api.memberships.setPrimary(user, institutionId);
            addToast("Club principal actualizado.", "success");
            onProfileUpdate();
        } catch (e: any) {
            addToast("Error al definir club principal: " + e.message, "error");
        }
    };

    const handleRemoveClub = async (institutionId: string) => {
        if (!confirm("¿Deseas desvincularte de este club?")) return;
        try {
            await api.memberships.removeMembership(user, institutionId);
            addToast("Membresía eliminada.", "info");
            onProfileUpdate();
        } catch (e: any) {
            addToast("Error al eliminar membresía: " + e.message, "error");
        }
    };

    const handleAddMembershipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInstId) {
            addToast("Selecciona un club para sumar la membresía.", "warning");
            return;
        }

        setSavingMembership(true);
        try {
            const instObj = institutions.find(i => i.id === newInstId);
            await api.memberships.addMembership(user, {
                institution_id: newInstId,
                institution_name: instObj?.name || '',
                member_number: newMemberNumber.trim() || undefined,
                is_primary: newIsPrimary,
                status: 'pending'
            });

            addToast("Membresía solicitada con éxito. Pendiente de validación.", "success");
            setShowAddMembershipModal(false);
            setNewInstId('');
            setNewMemberNumber('');
            setNewIsPrimary(false);
            onProfileUpdate();
        } catch (e: any) {
            addToast(e.message || "Error al agregar membresía", "error");
        } finally {
            setSavingMembership(false);
        }
    };

    // Update form data when user prop changes or modal opens
    useEffect(() => {
        setFormData({
            name: user.name || '',
            lastname: user.lastname || '',
            phone: user.phone || '',
            dni: user.dni || '',
            category: user.category || '',
            gender: user.gender || 'masculino',
            birth_date: user.birth_date || '',
            institution_id: user.institution_id || '',
            show_whatsapp: user.show_whatsapp !== false,
            newPassword: '',
            confirmPassword: ''
        });
        setPreviewUrl(user.profile_picture_url || null);
        setSelectedFile(null);
    }, [user, isEditing]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Read file for cropping
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempImageSrc(reader.result?.toString() || null);
                setCropModalOpen(true);
            });
            reader.readAsDataURL(file);

            // Clear input value to allow selecting same file again
            e.target.value = '';
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        try {
            // Compress the image
            const options = {
                maxSizeMB: 0.5, // Max size 0.5MB
                maxWidthOrHeight: 800, // Max dimension 800px
                useWebWorker: true,
                fileType: 'image/jpeg'
            };

            const compressedFile = await imageCompression(croppedBlob as File, options);

            // Create a new File object from the blob/compressed file
            const finalFile = new File([compressedFile], "profile.jpg", { type: "image/jpeg" });

            setSelectedFile(finalFile);
            setPreviewUrl(URL.createObjectURL(finalFile));
            setCropModalOpen(false);
            setTempImageSrc(null);

        } catch (error) {
            console.error("Error compressing image:", error);
            addToast("Error al procesar la imagen", "error");
        }
    };

    const handleCropCancel = () => {
        setCropModalOpen(false);
        setTempImageSrc(null);
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const isInstitutionChanged = formData.institution_id !== user.institution_id;
        const updates: any = {
            name: formData.name,
            lastname: formData.lastname,
            phone: formData.phone,
            dni: formData.dni,
            category: formData.category,
            gender: formData.gender,
            birth_date: formData.birth_date || null,
            institution_id: formData.institution_id,
            show_whatsapp: formData.show_whatsapp
        };

        // Fix: Convert empty string UUIDs to null to avoid Postgres error
        if (updates.institution_id === '') {
            updates.institution_id = null;
        }

        if (isInstitutionChanged) {
            updates.is_approved = false;
        }

        try {
            // Check password change
            if (formData.newPassword.trim().length > 0) {
                if (formData.newPassword.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres.');
                }
                if (formData.newPassword !== formData.confirmPassword) {
                    throw new Error('Las contraseñas escritas no coinciden.');
                }
                await api.auth.updateUserPassword(user.id, formData.newPassword.trim());
            }

            // 1. Upload Image if selected
            if (selectedFile) {
                setUploadingImage(true);
                const imageUrl = await api.storage.uploadProfileImage(selectedFile, user.id);
                updates.profile_picture_url = imageUrl;
                setUploadingImage(false);
            }

            // 2. Update Profile Data
            await api.auth.updateProfile(user.id, updates);

            if (isInstitutionChanged) {
                addToast("Cambiaste de institución. Pendiente de aprobación.", 'warning');
            } else {
                addToast("Perfil actualizado correctamente.", 'success');
            }

            onProfileUpdate(); // Refresh global app state
            setIsEditing(false);
        } catch (error: any) {
            console.error(error);
            addToast(error.message || "Error al actualizar perfil.", 'error');
            setUploadingImage(false);
        } finally {
            setSaving(false);
        }
    };

    const memberSince = user.is_approved ? 'Verificado' : 'Pendiente de Aprobación';
    const joinDate = "2024";
    const isChangingInstitution = formData.institution_id !== user.institution_id && formData.institution_id !== '';

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header Banner - Enhanced Design */}
            <div className="relative h-64 rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl group">
                <img
                    src={bannerUrl}
                    alt="Profile Banner"
                    className="absolute inset-0 w-full h-full object-cover object-[center_31%] opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Transparent gradient for max visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                {/* Profile Info Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-8 flex items-end translate-y-4">
                    <div className="flex items-end gap-6 w-full">
                        {/* Avatar */}
                        <div className="relative group/avatar">
                            <div className="w-40 h-40 rounded-full border-[6px] border-dark bg-card flex items-center justify-center relative z-10 shadow-2xl overflow-hidden ring-4 ring-white/5">
                                {user.profile_picture_url ? (
                                    <img src={user.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-6xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            {/* Online Badge */}
                            <div className="absolute bottom-4 right-4 w-6 h-6 bg-emerald-500 border-4 border-dark rounded-full z-20 shadow-lg" title="Online"></div>
                        </div>

                        {/* Basic Info (Name & Category) - Positioned next to avatar */}
                        <div className="mb-4 pb-1 hidden md:block animate-fade-up">
                            <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">{formatPlayerName(user.name, user.lastname)}</h1>
                            <div className="flex items-center gap-3 mt-2 text-slate-300">
                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md border border-white/10">
                                    <Award size={14} className="text-primary" />
                                    Categoría {user.category || 'N/A'}
                                </span>
                                <span className="flex items-center gap-1.5 text-sm font-medium opacity-80">
                                    <MapPin size={14} />
                                    {user.institution || 'Sin club'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Mobile Name Display (visible only on small screens) */}
                    <div className="md:hidden space-y-2 mb-6 text-center">
                        <h1 className="text-3xl font-bold text-white">{formatPlayerName(user.name, user.lastname)}</h1>
                        <div className="flex flex-wrap justify-center items-center gap-2">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                Categoría {user.category || 'N/A'}
                            </span>
                            <span className="text-muted text-sm">
                                {user.institution || 'Sin club'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl border ${user.is_approved || user.role === 'superadmin' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                                <Shield size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-muted">Estado de cuenta</div>
                                <div className={`font-bold text-sm ${user.is_approved || user.role === 'superadmin' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {user.is_approved || user.role === 'superadmin' ? 'Verificado & Activo' : 'Pendiente de Aprobación'}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons: Player Card, Sound Toggle, Edit Profile */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => {
                                    soundEffects.playTennisHit();
                                    setShowPlayerCardModal(true);
                                }}
                                className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                                title="Ver y descargar mi tarjeta coleccionable oficial"
                            >
                                <Award size={15} className="text-amber-400" /> Mi Tarjeta Smash
                            </button>

                            <button
                                onClick={handleToggleSound}
                                className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    soundEnabled 
                                        ? 'bg-primary/20 border-primary text-primary' 
                                        : 'bg-white/5 border-white/10 text-muted hover:text-white'
                                }`}
                                title={soundEnabled ? 'Sonidos activos. Clic para silenciar' : 'Sonidos silenciados. Clic para activar'}
                            >
                                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>

                            <button
                                onClick={() => {
                                    soundEffects.playScoreBeep();
                                    setIsEditing(true);
                                }}
                                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-primary/20"
                            >
                                <Edit2 size={15} /> Editar Perfil
                            </button>
                        </div>
                    </div>

                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-4">Información Personal</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <InfoField label="Email" value={user.email} icon={Mail} />
                            <InfoField label="Teléfono" value={user.phone || 'No registrado'} icon={Phone} />
                            <InfoField label="DNI / Documento" value={user.dni || 'No registrado'} icon={CreditCard} />
                            <InfoField 
                                label="Rama / Género" 
                                value={formatGender(user.gender)} 
                                icon={User} 
                                className={formatGender(user.gender) === 'Femenino' ? 'text-pink-400 font-bold' : 'text-blue-400 font-bold'} 
                            />
                            <InfoField 
                                label="Rango Etario / Edad" 
                                value={getAgeCategoryLabel(user.birth_date)} 
                                icon={Calendar} 
                                className="text-primary font-bold" 
                            />
                            <InfoField label="Club Principal" value={user.institution || 'Sin club principal'} icon={MapPin} />
                            <InfoField label="Rol en Sistema" value={user.role} icon={Shield} className="capitalize" />
                            <InfoField
                                label="Condición General"
                                value={user.is_member ? `Socio Oficial ${user.member_number ? `(#${user.member_number})` : ''}` : 'Invitado / No Socio'}
                                icon={Award}
                                className={user.is_member ? 'text-primary font-bold' : 'text-slate-400'}
                            />
                            <InfoField 
                                label="Disponibilidad Desafíos" 
                                value={user.show_whatsapp === false ? 'Desactivado (Sin retos)' : 'Activo (Recibe y envía retos)'} 
                                icon={Smartphone} 
                                className={user.show_whatsapp === false ? 'text-slate-400' : 'text-green-400 font-semibold'}
                            />
                            <InfoField label="Estado" value={memberSince} icon={Check} className={user.is_approved ? "text-green-400" : "text-yellow-400"} />
                        </div>
                    </Card>

                    {/* CLUB MEMBERSHIPS SECTION */}
                    <Card className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BuildingIcon className="text-primary" size={20} /> Mis Membresías de Clubes
                                </h3>
                                <p className="text-xs text-muted mt-0.5">
                                    Define tu club principal y suma todos los clubes de los que seas socio para acceder a tarifas preferenciales.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setNewInstId('');
                                    setNewMemberNumber('');
                                    setNewIsPrimary(userMemberships.length === 0);
                                    setShowAddMembershipModal(true);
                                }}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                            >
                                <Plus size={14} /> Sumar Club
                            </button>
                        </div>

                        {userMemberships.length === 0 ? (
                            <div className="text-center py-6 text-muted text-xs border border-dashed border-white/10 rounded-xl">
                                No tienes membresías registradas. Haz clic en "Sumar Club" para registrarte como socio.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userMemberships.map((m, idx) => {
                                    const instObj = institutions.find(i => i.id === m.institution_id);
                                    const clubName = instObj?.name || m.institution_name || 'Club';
                                    const isPrimary = m.is_primary || (user.institution_id === m.institution_id && !userMemberships.some(other => other.is_primary && other.institution_id !== m.institution_id));
                                    const isActive = m.status === 'active' || (m.status === undefined && user.is_approved !== false) || (isPrimary && user.is_approved !== false);

                                    return (
                                        <div key={idx} className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                                            isPrimary ? 'bg-primary/10 border-primary/40' : 'bg-sidebar/50 border-white/5'
                                        }`}>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">{clubName}</span>
                                                    {isPrimary ? (
                                                        <span className="text-[10px] bg-primary text-dark font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                            <Star size={10} className="fill-dark" /> Club Principal
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSetPrimaryClub(m.institution_id)}
                                                            className="text-[10px] bg-white/5 hover:bg-white/10 text-muted hover:text-white px-2 py-0.5 rounded-md border border-white/10 transition-colors"
                                                            title="Establecer como mi club principal de representación"
                                                        >
                                                            Hacer Principal
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                                                    {instObj?.city && <span>{instObj.city}</span>}
                                                    {m.member_number ? (
                                                        <span className="text-slate-300">N° Socio: <strong className="text-white">{m.member_number}</strong></span>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Sin N° de carnet</span>
                                                    )}
                                                    <span>•</span>
                                                    <span className={`font-semibold ${isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        {isActive ? '✓ Tarifa Socio Activa' : '⏳ Pendiente de Aprobación'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                {userMemberships.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveClub(m.institution_id)}
                                                        className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Eliminar vinculación con este club"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Stats & Advanced Performance */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-card to-slate-800 border-primary/20">
                        <div id="profile-stats" className="space-y-5">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Award className="text-accent" size={20} /> Estadísticas & Ranking
                                </h3>
                                <button
                                    onClick={() => {
                                        soundEffects.playTennisHit();
                                        setShowPlayerCardModal(true);
                                    }}
                                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors"
                                >
                                    <Zap size={12} /> Ver Tarjeta
                                </button>
                            </div>

                            {/* Base Metrics */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className="text-muted text-xs font-bold uppercase">Partidos Ganados</span>
                                    <span className="text-lg font-black text-white">{playerStats ? playerStats.wonMatches : (user.matches_won || 0)} PG</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className="text-muted text-xs font-bold uppercase">Torneos Ganados</span>
                                    <span className="text-lg font-black text-accent">{user.tournaments_won || 0} 🏆</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className="text-muted text-xs font-bold uppercase">Puntos Oficiales</span>
                                    <span className="text-lg font-black text-primary">{rankInfo.points} pts</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                        <div className="text-2xl font-black text-primary mb-0.5">#{rankInfo.categoryRank}</div>
                                        <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                            {user.category ? `En ${user.category}` : 'En Categoría'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                                        <div className="text-2xl font-black text-white mb-0.5">#{rankInfo.globalRank}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-wider">Ranking Global</div>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Performance KPIs */}
                            <div className="pt-3 border-t border-white/10 space-y-2.5">
                                <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity size={14} className="text-primary" /> Rendimiento Avanzado
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-[10px] text-muted font-bold uppercase">Tie-Breaks</div>
                                        <div className="text-sm font-black text-white mt-0.5">
                                            {playerStats ? `${playerStats.tieBreakWinRate}%` : '0%'}
                                        </div>
                                        <div className="text-[9px] text-muted">
                                            {playerStats ? `${playerStats.tieBreaksWon}/${playerStats.tieBreaksPlayed} ganados` : '0 jugados'}
                                        </div>
                                    </div>

                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-[10px] text-muted font-bold uppercase">3er Set</div>
                                        <div className="text-sm font-black text-emerald-400 mt-0.5">
                                            {playerStats ? `${playerStats.threeSetsWon}/${playerStats.threeSetsPlayed}` : '0/0'}
                                        </div>
                                        <div className="text-[9px] text-muted">Partidos decisivos</div>
                                    </div>

                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-[10px] text-muted font-bold uppercase">Racha Actual</div>
                                        <div className="text-sm font-black text-orange-400 mt-0.5 flex items-center gap-1">
                                            <Flame size={14} /> {playerStats ? (playerStats.currentStreak > 0 ? `+${playerStats.currentStreak}` : playerStats.currentStreak) : '0'}
                                        </div>
                                        <div className="text-[9px] text-muted">Partidos seguidos</div>
                                    </div>

                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="text-[10px] text-muted font-bold uppercase">Mejor Racha</div>
                                        <div className="text-sm font-black text-amber-300 mt-0.5">
                                            🔥 {playerStats ? playerStats.bestStreak : 0}
                                        </div>
                                        <div className="text-[9px] text-muted">Récord invicto</div>
                                    </div>
                                </div>
                            </div>

                            {/* Ranking & Points Evolution Interactive Chart */}
                            <div className="pt-2">
                                <RankingEvolutionChart 
                                    user={user} 
                                    stats={playerStats} 
                                    rankInfo={rankInfo} 
                                />
                            </div>

                            {/* Frequent Opponents */}
                            {playerStats && playerStats.frequentOpponents.length > 0 && (
                                <div className="pt-3 border-t border-white/10 space-y-2">
                                    <div className="text-xs font-bold text-muted uppercase tracking-wider">
                                        Rivales Más Frecuentes
                                    </div>
                                    <div className="space-y-1.5">
                                        {playerStats.frequentOpponents.slice(0, 3).map((opp, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-white/5 border border-white/5 rounded-lg">
                                                <span className="font-bold text-white truncate max-w-[140px]">{opp.name}</span>
                                                <span className="text-[11px] font-mono">
                                                    <span className="text-emerald-400 font-bold">{opp.wins}V</span> - <span className="text-red-400 font-bold">{opp.losses}D</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </Card>

                    {/* ACHIEVEMENTS & MEDALS SHOWCASE */}
                    <Card className="bg-gradient-to-br from-card to-slate-900 border-white/10 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Trophy className="text-amber-400" size={20} /> Vitrina de Logros & Medallas
                                </h3>
                                <p className="text-xs text-muted">
                                    {unlockedCount} de {achievements.length} medallas desbloqueadas
                                </p>
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                                <button
                                    onClick={() => setAchievementFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        achievementFilter === 'all' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                                    }`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setAchievementFilter('unlocked')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        achievementFilter === 'unlocked' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                                    }`}
                                >
                                    Ganadas ({unlockedCount})
                                </button>
                                <button
                                    onClick={() => setAchievementFilter('locked')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        achievementFilter === 'locked' ? 'bg-primary text-white' : 'text-muted hover:text-white'
                                    }`}
                                >
                                    Bloqueadas
                                </button>
                            </div>
                        </div>

                        {/* Achievements Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {filteredAchievements.map((item) => {
                                const tierStyles = getTierColorClasses(item.tier);
                                const isUnlocked = item.unlocked;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            soundEffects.playScoreBeep();
                                            setSelectedAchievement(item);
                                        }}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                                            isUnlocked 
                                                ? `${tierStyles.bg} hover:border-white/40 shadow-lg` 
                                                : 'bg-black/30 border-white/5 opacity-60 hover:opacity-90'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                                                    isUnlocked 
                                                        ? tierStyles.badge 
                                                        : 'bg-slate-800 text-slate-500 border border-white/5'
                                                }`}>
                                                    {isUnlocked ? (
                                                        item.tier === 'diamond' ? <Crown size={18} /> :
                                                        item.tier === 'gold' ? <Trophy size={18} /> :
                                                        item.tier === 'silver' ? <Medal size={18} /> :
                                                        <Sparkles size={18} />
                                                    ) : (
                                                        <Lock size={16} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                                                        {item.title}
                                                    </div>
                                                    <div className="text-[10px] text-muted capitalize">
                                                        Nivel {item.tier}
                                                    </div>
                                                </div>
                                            </div>

                                            {isUnlocked && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    ✓ Ganado
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-2.5 space-y-1">
                                            <div className="flex justify-between text-[9px]">
                                                <span className="text-slate-400">{item.progress.label}</span>
                                                <span className="text-slate-500 font-mono">
                                                    {Math.round((item.progress.current / item.progress.max) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        isUnlocked ? 'bg-gradient-to-r from-amber-400 to-primary' : 'bg-slate-600'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (item.progress.current / item.progress.max) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* ACHIEVEMENT DETAIL MODAL */}
            {selectedAchievement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden space-y-4 text-center">
                        <button 
                            onClick={() => setSelectedAchievement(null)}
                            className="absolute top-4 right-4 text-muted hover:text-white p-1 rounded-xl hover:bg-white/5"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-xl text-slate-950 font-black text-2xl bg-gradient-to-br from-amber-400 to-orange-500">
                            {selectedAchievement.tier === 'diamond' ? <Crown size={32} /> :
                             selectedAchievement.tier === 'gold' ? <Trophy size={32} /> :
                             selectedAchievement.tier === 'silver' ? <Medal size={32} /> :
                             <Sparkles size={32} />}
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-white">{selectedAchievement.title}</h3>
                            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                                Medalla Nivel {selectedAchievement.tier}
                            </p>
                        </div>

                        <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                            {selectedAchievement.description}
                        </p>

                        <div className="space-y-1.5 text-xs bg-black/40 p-3 rounded-xl border border-white/5 text-left">
                            <div className="flex justify-between text-muted text-[11px]">
                                <span>Progreso Actual</span>
                                <span className="font-bold text-white">{selectedAchievement.progress.label}</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, (selectedAchievement.progress.current / selectedAchievement.progress.max) * 100)}%` }}
                                />
                            </div>
                            {selectedAchievement.rewardDescription && (
                                <div className="text-[10px] text-amber-400/90 pt-1 font-semibold">
                                    🎁 Recompensa: {selectedAchievement.rewardDescription}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedAchievement(null)}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div id="edit-profile-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-bold text-white">Editar Perfil</h3>
                            <button onClick={() => setIsEditing(false)} className="text-muted hover:text-white transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">

                                {/* PROFILE PICTURE UPLOAD */}
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden group">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={24} className="text-muted" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <p className="text-xs text-white font-bold">Cambiar</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="text-center mt-2">
                                        <p className="text-xs text-muted">Haz clic para subir foto</p>
                                        {selectedFile && <p className="text-[10px] text-primary">{selectedFile.name}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Nombre</label>
                                        <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Apellido</label>
                                        <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.lastname} onChange={e => setFormData({ ...formData, lastname: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Teléfono</label>
                                    <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+54 9 ..." />
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                                    <div className="space-y-0.5 pr-3">
                                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Smartphone size={14} className="text-green-400" /> Activar Desafíos y WhatsApp
                                        </span>
                                        <p className="text-[10px] text-muted">
                                            Al estar activo, podrás enviar y recibir desafíos de partidos por WhatsApp y mensajes internos con otros miembros de la comunidad.
                                        </p>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                                        checked={formData.show_whatsapp}
                                        onChange={e => setFormData({ ...formData, show_whatsapp: e.target.checked })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">DNI</label>
                                        <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-xs" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} placeholder="Sin puntos" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Rama / Género</label>
                                        <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-xs cursor-pointer" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="masculino">Masculino</option>
                                            <option value="femenino">Femenino</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                            <span>F. Nacimiento</span>
                                            {formData.birth_date && (
                                                <span className="text-[10px] text-green-400 font-bold">
                                                    {calculateAge(formData.birth_date)} años
                                                </span>
                                            )}
                                        </label>
                                        <input 
                                            type="date"
                                            className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary transition-colors text-xs" 
                                            value={formData.birth_date} 
                                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Institución / Club</label>
                                    <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.institution_id} onChange={e => setFormData({ ...formData, institution_id: e.target.value })}>
                                        <option value="">Seleccionar Institución</option>
                                        {institutions.map(inst => (<option key={inst.id} value={inst.id}>{inst.name} ({inst.city})</option>))}
                                    </select>
                                </div>
                                {isChangingInstitution && (
                                    <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-fade-up">
                                        <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                                        <p className="text-xs text-yellow-200"><span className="font-bold">Atención:</span> Al cambiar de institución, tu perfil deberá ser validado nuevamente.</p>
                                    </div>
                                )}
                                {user.role === 'player' ? (
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold flex items-center justify-between">
                                            <span>Categoría Oficial</span>
                                            <span className="text-[10px] text-primary lowercase font-normal">(Homologada por el Club)</span>
                                        </label>
                                        <div className="w-full bg-sidebar/50 border border-white/10 rounded-xl p-3 text-white flex items-center justify-between">
                                            <span className="font-bold text-sm text-primary">{user.category ? `${user.category} Categoría` : 'Pendiente de Asignación'}</span>
                                            <span className="text-[10px] text-muted">Solo editable por tu Profesor/Club</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Categoría</label>
                                        <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors text-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option value="">Seleccionar Categoría</option>
                                            <optgroup label="Sistema Estándar">
                                                <option value="1ra">1ra</option>
                                                <option value="2da">2da</option>
                                                <option value="3ra">3ra</option>
                                                <option value="4ta">4ta</option>
                                                <option value="5ta">5ta</option>
                                                <option value="6ta">6ta</option>
                                                <option value="7ma">7ma</option>
                                                <option value="Open">Open</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                )}

                                {/* Password Change Section for Users */}
                                <div className="pt-3 border-t border-white/10 space-y-3">
                                    <div className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                                        <Shield size={14} className="text-primary" /> Cambiar mi contraseña (Opcional)
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted font-medium">Nueva Contraseña</label>
                                            <input
                                                type="password"
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary text-xs"
                                                value={formData.newPassword}
                                                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                                minLength={6}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] text-muted font-medium">Confirmar Contraseña</label>
                                            <input
                                                type="password"
                                                placeholder="Repetir contraseña"
                                                className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary text-xs"
                                                value={formData.confirmPassword}
                                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancelar</button>
                            <button form="edit-profile-form" type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                {saving ? <><Loader2 className="animate-spin" size={18} /> {uploadingImage ? 'Subiendo Foto...' : 'Guardando...'}</> : <><Save size={18} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ADD MEMBERSHIP MODAL */}
            {showAddMembershipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Plus size={18} className="text-primary" /> Sumar Membresía de Club
                            </h3>
                            <button onClick={() => setShowAddMembershipModal(false)} className="text-muted hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddMembershipSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Seleccionar Club / Institución</label>
                                <select 
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
                                    value={newInstId}
                                    onChange={e => setNewInstId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecciona un club</option>
                                    {institutions
                                        .filter(inst => !userMemberships.some(m => m.institution_id === inst.id))
                                        .map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name} {inst.city ? `(${inst.city})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted uppercase font-bold">Número de Socio / Carnet (Opcional)</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: 45892"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-primary transition-colors"
                                    value={newMemberNumber}
                                    onChange={e => setNewMemberNumber(e.target.value)}
                                />
                            </div>

                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-white flex items-center gap-1">
                                        <Star size={12} className="text-primary" /> Club Principal
                                    </span>
                                    <p className="text-[10px] text-muted">Aparecerá en tu perfil público y torneos como tu club de cabecera.</p>
                                </div>
                                <input 
                                    type="checkbox"
                                    className="w-4 h-4 accent-primary cursor-pointer"
                                    checked={newIsPrimary}
                                    onChange={e => setNewIsPrimary(e.target.checked)}
                                />
                            </div>

                            <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-[11px] text-slate-300">
                                ℹ️ Una vez enviada, los administradores de la institución podrán validar tu condición de socio oficial para aplicar las tarifas preferenciales.
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMembershipModal(false)}
                                    className="px-4 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingMembership}
                                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                                >
                                    {savingMembership ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enviar Solicitud
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Crop Modal */}
            {cropModalOpen && tempImageSrc && (
                <ImageCropper
                    imageSrc={tempImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {/* PLAYER CARD MODAL */}
            {showPlayerCardModal && (
                <PlayerCardModal
                    isOpen={showPlayerCardModal}
                    onClose={() => setShowPlayerCardModal(false)}
                    user={user}
                    stats={playerStats}
                    rank={rankInfo.globalRank}
                />
            )}
        </div>
    );
};

const InfoField = ({ label, value, icon: Icon, className = '' }: any) => (
    <div className="space-y-1 group">
        <label className="text-xs text-muted uppercase font-bold flex items-center gap-1 group-hover:text-primary transition-colors">
            {label}
        </label>
        <div className={`flex items-center gap-3 text-slate-200 text-lg ${className}`}>
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted group-hover:text-white group-hover:bg-white/10 transition-colors">
                <Icon size={16} />
            </div>
            {value}
        </div>
    </div>
);
