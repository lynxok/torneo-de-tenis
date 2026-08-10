import React, { useEffect, useState } from 'react';
import { UserProfile, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { User, Mail, Award, MapPin, Phone, Edit2, Shield, CreditCard, Calendar, X, Check, Save, AlertTriangle, Camera, UploadCloud, Loader2 } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import imageCompression from 'browser-image-compression';

interface ProfileProps {
    user: UserProfile;
    onProfileUpdate: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onProfileUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const { addToast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: user.name || '',
        lastname: user.lastname || '',
        phone: user.phone || '',
        dni: user.dni || '',
        category: user.category || '',
        gender: user.gender || '',
        institution_id: user.institution_id || ''
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

        // Load System Settings (Banner)
        api.settings.getConfig().then(config => {
            if (config.profile_banner_url) {
                setBannerUrl(config.profile_banner_url);
            }
        });
    }, []);

    // Update form data when user prop changes or modal opens
    useEffect(() => {
        setFormData({
            name: user.name || '',
            lastname: user.lastname || '',
            phone: user.phone || '',
            dni: user.dni || '',
            category: user.category || '',
            gender: user.gender || '',
            institution_id: user.institution_id || ''
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
        const updates: any = { ...formData };

        // Fix: Convert empty string UUIDs to null to avoid Postgres error
        if (updates.institution_id === '') {
            updates.institution_id = null;
        }

        if (isInstitutionChanged) {
            updates.is_approved = false;
        }

        try {
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
                            <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">{user.name} {user.lastname}</h1>
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
                        <h1 className="text-3xl font-bold text-white">{user.name} {user.lastname}</h1>
                        <div className="flex flex-wrap justify-center items-center gap-2">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                Categoría {user.category || 'N/A'}
                            </span>
                            <span className="text-muted text-sm">
                                {user.institution || 'Sin club'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl border ${user.is_approved || user.role === 'superadmin' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                                <Shield size={24} />
                            </div>
                            <div>
                                <div className="text-sm text-muted">Estado de cuenta</div>
                                <div className={`font-bold ${user.is_approved || user.role === 'superadmin' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {user.is_approved || user.role === 'superadmin' ? 'Verificado & Activo' : 'Pendiente de Aprobación'}
                                </div>
                            </div>
                            {/* Add Edit Profile Button */}
                            <div className="ml-auto">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Edit2 size={16} /> Editar Perfil
                                </button>
                            </div>
                        </div>
                    </div>

                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-4">Información Personal</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <InfoField label="Email" value={user.email} icon={Mail} />
                            <InfoField label="Teléfono" value={user.phone || 'No registrado'} icon={Phone} />
                            <InfoField label="DNI / Documento" value={user.dni || 'No registrado'} icon={CreditCard} />
                            <InfoField label="Club / Institución" value={user.institution || 'Sin club asignado'} icon={MapPin} />
                            <InfoField label="Rol en Sistema" value={user.role} icon={Shield} className="capitalize" />
                            <InfoField label="Estado" value={memberSince} icon={Check} className={user.is_approved ? "text-green-400" : "text-yellow-400"} />
                        </div>
                    </Card>
                </div>

                {/* Right Column: Stats */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-card to-slate-800 border-primary/20 sticky top-24">
                        <div id="profile-stats">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Award className="text-accent" /> Estadísticas
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className="text-muted text-sm">Partidos Ganados</span>
                                    <span className="text-xl font-bold text-white">{user.matches_won || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                                    <span className="text-muted text-sm">Torneos Ganados</span>
                                    <span className="text-xl font-bold text-accent">{user.tournaments_won || 0}</span>
                                </div>
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                                    <div className="text-3xl font-bold text-primary mb-1">#{Math.floor(Math.random() * 100) + 1}</div>
                                    <div className="text-xs text-muted uppercase tracking-wider">Ranking Global</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">DNI (Requerido para foto)</label>
                                        <input className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} placeholder="Sin puntos" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted uppercase font-bold">Género</label>
                                        <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="">Seleccionar</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Femenino</option>
                                            <option value="X">Otro</option>
                                        </select>
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
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold">Categoría</label>
                                    <select className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="">Seleccionar Categoría</option>
                                        <option value="1ra">1ra</option>
                                        <option value="2da">2da</option>
                                        <option value="3ra">3ra</option>
                                        <option value="4ta">4ta</option>
                                        <option value="5ta">5ta</option>
                                        <option value="Open">Open</option>
                                    </select>
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
            {/* Crop Modal */}
            {cropModalOpen && tempImageSrc && (
                <ImageCropper
                    imageSrc={tempImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
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
