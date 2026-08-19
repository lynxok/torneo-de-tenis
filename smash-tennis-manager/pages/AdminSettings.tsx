
import React, { useEffect, useState } from 'react';
import { UserProfile, SystemConfig } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { 
    Sliders, Cloud, Lock, Save, Folder, Info, CheckCircle2, AlertTriangle, Key, MessageCircle,
    Trophy, DollarSign, Percent, Calculator, Sparkles, TrendingUp, Wallet, ArrowRight, ShieldCheck, Layers
} from 'lucide-react';
import { DEFAULT_TIER_CONFIG, calculateTournamentFinances } from '../utils/tournamentTiers';

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
        welcome_message: '',
        ...DEFAULT_TIER_CONFIG
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    // Live Monetization Simulator State
    const [simPlayers, setSimPlayers] = useState<number>(24);
    const [simPrice, setSimPrice] = useState<number>(20000);

    useEffect(() => {
        // Only superadmin allowed
        if (user.role !== 'superadmin') return;

        api.settings.getConfig().then(data => {
            setConfig({
                ...DEFAULT_TIER_CONFIG,
                ...data
            });
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

                {/* TOURNAMENT TIERS CONFIG (MODELO A - POR CONVOCATORIA) */}
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-card to-card">
                    <div className="border-b border-white/10 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy className="text-amber-400" /> Categorías de Torneo (Circuito Smash Tour)
                            </h3>
                            <p className="text-xs text-slate-300 mt-1">
                                Escala de niveles estilo ATP basada en el <strong>Modelo A (Convocatoria y Métricas Reales)</strong>.
                            </p>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1">
                            <Sparkles size={12} /> Modelo A Activo
                        </span>
                    </div>

                    <div className="space-y-6">
                        {/* SMASH 250 */}
                        <div className="bg-sidebar/60 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                        🥉 Smash 250
                                    </span>
                                    <span className="text-xs text-slate-300 font-medium">Torneos Relámpago / Formato Estándar</span>
                                </div>
                                <span className="text-xs text-muted font-mono">{config.tier_250_points ?? 250} pts Campeón</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Mín. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={3}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_250_min_players ?? 6}
                                        onChange={e => setConfig({ ...config, tier_250_min_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Máx. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={4}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_250_max_players ?? 16}
                                        onChange={e => setConfig({ ...config, tier_250_max_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Puntos al Campeón</label>
                                    <input
                                        type="number"
                                        min={50}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-cyan-300 text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_250_points ?? 250}
                                        onChange={e => setConfig({ ...config, tier_250_points: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SMASH 500 */}
                        <div className="bg-sidebar/60 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                        🥈 Smash 500
                                    </span>
                                    <span className="text-xs text-slate-300 font-medium">Torneos Abiertos / Convocatoria Media</span>
                                </div>
                                <span className="text-xs text-muted font-mono">{config.tier_500_points ?? 500} pts Campeón</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Mín. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={10}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_500_min_players ?? 17}
                                        onChange={e => setConfig({ ...config, tier_500_min_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Máx. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={16}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_500_max_players ?? 32}
                                        onChange={e => setConfig({ ...config, tier_500_max_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Puntos al Campeón</label>
                                    <input
                                        type="number"
                                        min={100}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-purple-300 text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_500_points ?? 500}
                                        onChange={e => setConfig({ ...config, tier_500_points: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SMASH 1000 */}
                        <div className="bg-sidebar/60 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        🥇 Smash 1000
                                    </span>
                                    <span className="text-xs text-slate-300 font-medium">Grandes Abiertos / Aniversarios</span>
                                </div>
                                <span className="text-xs text-muted font-mono">{config.tier_1000_points ?? 1000} pts Campeón</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Mín. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={20}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_1000_min_players ?? 33}
                                        onChange={e => setConfig({ ...config, tier_1000_min_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Máx. Inscriptos</label>
                                    <input
                                        type="number"
                                        min={32}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_1000_max_players ?? 64}
                                        onChange={e => setConfig({ ...config, tier_1000_max_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Puntos al Campeón</label>
                                    <input
                                        type="number"
                                        min={500}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-amber-300 text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_1000_points ?? 1000}
                                        onChange={e => setConfig({ ...config, tier_1000_points: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* MASTER FINAL */}
                        <div className="bg-sidebar/60 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        👑 Master Final
                                    </span>
                                    <span className="text-xs text-slate-300 font-medium">Torneo de Maestros (Top 8 del Año)</span>
                                </div>
                                <span className="text-xs text-muted font-mono">{config.tier_masters_points ?? 1500} pts Campeón</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Cantidad de Inscriptos</label>
                                    <input
                                        type="number"
                                        min={4}
                                        max={16}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_masters_min_players ?? 8}
                                        onChange={e => setConfig({ ...config, tier_masters_min_players: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] text-muted uppercase font-bold">Puntos al Campeón</label>
                                    <input
                                        type="number"
                                        min={1000}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-emerald-300 text-xs font-bold focus:border-primary outline-none"
                                        value={config.tier_masters_points ?? 1500}
                                        onChange={e => setConfig({ ...config, tier_masters_points: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* PLATFORM MONETIZATION & COMMISSIONS CONFIG */}
                <Card className="border-green-500/30 bg-gradient-to-br from-green-950/20 via-card to-card">
                    <div className="border-b border-white/10 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet className="text-green-400" /> Modelo de Monetización y Comisiones (% Take Rate)
                            </h3>
                            <p className="text-xs text-slate-300 mt-1">
                                Configura el porcentaje de comisión que la aplicación retiene o factura por cada jugador inscripto.
                            </p>
                        </div>
                        <span className="px-2.5 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1">
                            <DollarSign size={12} /> Fee por Inscripto
                        </span>
                    </div>

                    <div className="space-y-6">
                        {/* Commission Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="bg-sidebar/60 border border-cyan-500/20 rounded-2xl p-3.5 space-y-1.5">
                                <div className="text-[10px] text-muted uppercase font-bold flex items-center justify-between">
                                    <span>Smash 250</span>
                                    <span className="text-cyan-400">🥉</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        max={100}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-bold text-sm focus:border-primary outline-none"
                                        value={config.tier_250_fee_pct ?? 5}
                                        onChange={e => setConfig({ ...config, tier_250_fee_pct: Number(e.target.value) })}
                                    />
                                    <span className="text-muted font-bold text-sm">%</span>
                                </div>
                                <p className="text-[10px] text-muted">Comisión estándar</p>
                            </div>

                            <div className="bg-sidebar/60 border border-purple-500/20 rounded-2xl p-3.5 space-y-1.5">
                                <div className="text-[10px] text-muted uppercase font-bold flex items-center justify-between">
                                    <span>Smash 500</span>
                                    <span className="text-purple-400">🥈</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        max={100}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-bold text-sm focus:border-primary outline-none"
                                        value={config.tier_500_fee_pct ?? 7.5}
                                        onChange={e => setConfig({ ...config, tier_500_fee_pct: Number(e.target.value) })}
                                    />
                                    <span className="text-muted font-bold text-sm">%</span>
                                </div>
                                <p className="text-[10px] text-muted">Comisión media</p>
                            </div>

                            <div className="bg-sidebar/60 border border-amber-500/20 rounded-2xl p-3.5 space-y-1.5">
                                <div className="text-[10px] text-muted uppercase font-bold flex items-center justify-between">
                                    <span>Smash 1000</span>
                                    <span className="text-amber-400">🥇</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        max={100}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-bold text-sm focus:border-primary outline-none"
                                        value={config.tier_1000_fee_pct ?? 10}
                                        onChange={e => setConfig({ ...config, tier_1000_fee_pct: Number(e.target.value) })}
                                    />
                                    <span className="text-muted font-bold text-sm">%</span>
                                </div>
                                <p className="text-[10px] text-muted">Comisión mayor</p>
                            </div>

                            <div className="bg-sidebar/60 border border-emerald-500/20 rounded-2xl p-3.5 space-y-1.5">
                                <div className="text-[10px] text-muted uppercase font-bold flex items-center justify-between">
                                    <span>Master Final</span>
                                    <span className="text-emerald-400">👑</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        max={100}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-bold text-sm focus:border-primary outline-none"
                                        value={config.tier_masters_fee_pct ?? 12}
                                        onChange={e => setConfig({ ...config, tier_masters_fee_pct: Number(e.target.value) })}
                                    />
                                    <span className="text-muted font-bold text-sm">%</span>
                                </div>
                                <p className="text-[10px] text-muted">Torneo especial</p>
                            </div>
                        </div>

                        {/* Optional Fixed Base Fee & Payout Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Fee Fijo Base / Jugador (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="100"
                                        placeholder="0"
                                        className="w-full bg-sidebar border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white font-bold text-sm focus:border-primary outline-none"
                                        value={config.monetization_base_fee_fixed ?? 0}
                                        onChange={e => setConfig({ ...config, monetization_base_fee_fixed: Number(e.target.value) })}
                                    />
                                </div>
                                <p className="text-[10px] text-muted">Monto adicional fijo cobrado por jugador.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Alias Mercado Pago / CVU de Cobro</label>
                                <input
                                    type="text"
                                    placeholder="ej: smash.torneos.mp"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-primary outline-none"
                                    value={config.platform_payout_alias || ''}
                                    onChange={e => setConfig({ ...config, platform_payout_alias: e.target.value })}
                                />
                                <p className="text-[10px] text-muted">Para transferencias y liquidaciones de los clubes.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-muted uppercase font-bold">Titular de la Cuenta</label>
                                <input
                                    type="text"
                                    placeholder="ej: Ignacio Valente / LYNX"
                                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm focus:border-primary outline-none"
                                    value={config.platform_payout_holder || ''}
                                    onChange={e => setConfig({ ...config, platform_payout_holder: e.target.value })}
                                />
                                <p className="text-[10px] text-muted">Nombre que verán los clubes al transferir.</p>
                            </div>
                        </div>

                        {/* LIVE INTERACTIVE SIMULATOR */}
                        {(() => {
                            const sim = calculateTournamentFinances(simPlayers, simPrice, config);
                            return (
                                <div className="bg-black/40 border border-green-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                                        <div className="flex items-center gap-2">
                                            <Calculator className="text-green-400" size={18} />
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                                Simulador Interactivo de Ganancias en Vivo
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-300">Nivel Resultante:</span>
                                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${sim.tier.badgeColor} ${sim.tier.textColor} ${sim.tier.borderColor}`}>
                                                {sim.tier.label} ({sim.tier.feePercentage}%)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Simulator Sliders / Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-300">
                                                <span>Inscriptos de Prueba:</span>
                                                <span className="text-primary font-mono">{simPlayers} jugadores</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={6}
                                                max={64}
                                                step={1}
                                                className="w-full accent-primary cursor-pointer"
                                                value={simPlayers}
                                                onChange={e => setSimPlayers(Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-300">
                                                <span>Precio Inscripción:</span>
                                                <span className="text-green-400 font-mono">${simPrice.toLocaleString('es-AR')} ARS</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={5000}
                                                max={50000}
                                                step={1000}
                                                className="w-full accent-green-400 cursor-pointer"
                                                value={simPrice}
                                                onChange={e => setSimPrice(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    {/* Simulation Result Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                        <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                            <div className="text-[10px] text-muted uppercase font-bold">Recaudación Bruta</div>
                                            <div className="text-base font-mono font-bold text-white">
                                                ${sim.grossTotal.toLocaleString('es-AR')}
                                            </div>
                                            <p className="text-[10px] text-slate-400">{sim.playerCount} × ${sim.pricePerPlayer.toLocaleString('es-AR')}</p>
                                        </div>

                                        <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30 space-y-1 shadow-lg shadow-green-500/10">
                                            <div className="text-[10px] text-green-400 uppercase font-bold flex items-center justify-between">
                                                <span>Tu Comisión (App Smash)</span>
                                                <TrendingUp size={12} />
                                            </div>
                                            <div className="text-lg font-mono font-black text-green-400">
                                                +${sim.platformTotalCommission.toLocaleString('es-AR')}
                                            </div>
                                            <p className="text-[10px] text-green-300/80 font-bold">{sim.feePct}% del total del torneo</p>
                                        </div>

                                        <div className="bg-sidebar/80 p-3 rounded-xl border border-white/5 space-y-1">
                                            <div className="text-[10px] text-muted uppercase font-bold">Neto para el Club</div>
                                            <div className="text-base font-mono font-bold text-slate-300">
                                                ${sim.clubNetIncome.toLocaleString('es-AR')}
                                            </div>
                                            <p className="text-[10px] text-slate-400">Fondos libres para premios y sede</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
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
