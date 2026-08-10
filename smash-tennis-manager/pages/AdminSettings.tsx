
import React, { useEffect, useState } from 'react';
import { UserProfile, SystemConfig } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Sliders, Cloud, Lock, Save, Folder, Info, CheckCircle2, AlertTriangle, Key, MessageCircle } from 'lucide-react';

interface AdminSettingsProps {
    user: UserProfile;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
    const [config, setConfig] = useState<SystemConfig>({
        google_drive_enabled: false,
        google_client_id: '',
        google_api_key: '',
        target_folder_id: '',
        service_account_email: '',
        welcome_message: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        // Only superadmin allowed
        if (user.role !== 'superadmin') return;

        api.settings.getConfig().then(data => {
            setConfig(data);
            setLoading(false);
        });
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Update each config key individually
            const updates = Object.entries(config).map(([key, value]) =>
                api.settings.updateConfig(key, value)
            );
            await Promise.all(updates);

            addToast("Configuración guardada correctamente.", 'success');
        } catch (error) {
            console.error(error);
            addToast("Error al guardar configuración.", 'error');
        } finally {
            setSaving(false);
        }
    };

    if (user.role !== 'superadmin') {
        return <div className="text-center text-red-500 py-20">Acceso denegado.</div>;
    }

    if (loading) return <div className="text-center text-muted py-20">Cargando ajustes...</div>;

    return (
        <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sliders className="text-primary" /> Ajustes Globales
                </h2>
                <p className="text-muted text-sm">Configuración del sistema e integraciones externas.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* APPEARANCE CONFIG */}
                <Card className="border-primary/20">
                    <div className="border-b border-white/10 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sliders className="text-purple-400" /> Apariencia
                        </h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Personaliza la identidad visual de la aplicación.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs text-muted uppercase font-bold">Banner de Perfil Global</label>

                            <div className="relative h-48 w-full rounded-2xl overflow-hidden group border-2 border-dashed border-white/10 bg-black/20">
                                {config.profile_banner_url ? (
                                    <img src={config.profile_banner_url} alt="Profile Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted">No hay banner configurado</div>
                                )}

                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-center p-4">
                                        <p className="text-white font-bold mb-2">Cambiar Banner</p>
                                        <p className="text-xs text-slate-300 mb-4">Recomendado: 1920x400px</p>
                                        <label className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl cursor-pointer transition-colors text-sm font-bold inline-block">
                                            Subir Imagen
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        try {
                                                            setSaving(true);
                                                            const url = await api.storage.uploadSystemAsset(e.target.files[0]);
                                                            setConfig({ ...config, profile_banner_url: url });
                                                            addToast("Banner subido correctamente (Guardar para aplicar)", 'success');
                                                        } catch (error) {
                                                            console.error(error);
                                                            addToast("Error al subir imagen", 'error');
                                                        } finally {
                                                            setSaving(false);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted">Esta imagen aparecerá en el encabezado del perfil de todos los usuarios.</p>
                        </div>
                    </div>
                </Card>

                {/* WELCOME MESSAGE CONFIG */}
                <Card className="border-primary/20">
                    <div className="border-b border-white/10 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MessageCircle className="text-green-400" /> Comunicación
                        </h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Configura los mensajes automáticos del sistema.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                            Mensaje de Bienvenida (Nuevos Usuarios)
                        </label>
                        <textarea
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary min-h-[100px] text-sm resize-none"
                            placeholder="Escribe el mensaje que recibirán los usuarios al registrarse..."
                            value={config.welcome_message || ''}
                            onChange={e => setConfig({ ...config, welcome_message: e.target.value })}
                        />
                        <p className="text-[10px] text-muted">Este mensaje se enviará automáticamente a la bandeja de entrada del usuario tras el registro.</p>
                    </div>
                </Card>

                {/* GOOGLE DRIVE CONFIG */}
                <Card className="border-primary/20">
                    <div className="border-b border-white/10 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Cloud className="text-blue-400" /> Integración Google Drive
                        </h3>
                        <p className="text-sm text-slate-300 mt-1">
                            Configura el almacenamiento para las fotos de perfil de los usuarios.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Toggle Switch */}
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                            <div>
                                <div className="font-bold text-white">Habilitar Google Drive</div>
                                <div className="text-xs text-muted">Permitir subida de imágenes a la nube.</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.google_drive_enabled}
                                    onChange={e => setConfig({ ...config, google_drive_enabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                        </div>

                        <div className={`space-y-4 transition-all ${!config.google_drive_enabled ? 'opacity-50 pointer-events-none' : ''}`}>

                            {/* Service Account Email Info */}
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                                <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-white">Permisos de Carpeta</h4>
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        Para que el sistema pueda guardar archivos, debes compartir la carpeta de destino en tu Google Drive con el siguiente email de servicio, otorgándole permisos de <strong>Editor</strong>.
                                    </p>
                                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/10">
                                        <code className="text-xs text-green-400 font-mono select-all">
                                            {config.service_account_email || 'service-account-email@placeholder.com'}
                                        </code>
                                        <span className="text-[10px] text-muted uppercase font-bold px-2">Copiar</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                        <Folder size={14} /> ID de Carpeta (Folder ID)
                                    </label>
                                    <input
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary font-mono text-sm"
                                        placeholder="ej: 1A2b3C4d5E6f..."
                                        value={config.target_folder_id}
                                        onChange={e => setConfig({ ...config, target_folder_id: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted">El ID alfanumérico al final de la URL de Drive.</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                        <Key size={14} /> Google API Key (Opcional)
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary font-mono text-sm"
                                        placeholder="AIzaSy..."
                                        value={config.google_api_key}
                                        onChange={e => setConfig({ ...config, google_api_key: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold flex items-center gap-2">
                                    <Lock size={14} /> Google Client ID
                                </label>
                                <input
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary font-mono text-sm"
                                    placeholder="xxx-xxx.apps.googleusercontent.com"
                                    value={config.google_client_id}
                                    onChange={e => setConfig({ ...config, google_client_id: e.target.value })}
                                />
                            </div>

                            <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl flex gap-2 items-center">
                                <AlertTriangle className="text-yellow-500 shrink-0" size={16} />
                                <p className="text-xs text-yellow-200/80">
                                    <strong>Nota:</strong> Las imágenes se guardarán automáticamente con el nombre <code>[DNI].jpg</code>. Si el archivo ya existe, será reemplazado.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </form>
        </div>
    );
};
