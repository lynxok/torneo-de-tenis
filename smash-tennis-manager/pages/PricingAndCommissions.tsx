import React, { useState, useEffect } from 'react';
import { UserProfile, TournamentSaga, SystemConfig, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import {
    ShieldCheck, Trophy, Sparkles, TrendingUp, DollarSign, Percent, Calculator,
    Gift, CheckCircle2, AlertCircle, ArrowRight, Flame, Clock, Award, Users,
    Plus, HelpCircle, Layers, Star, Zap, Info
} from 'lucide-react';
import { TIER_META, TIER_ORDER, calculateTournamentFinances, DEFAULT_TIER_CONFIG, getTierInfoByKey } from '../utils/tournamentTiers';

interface PricingAndCommissionsProps {
    user: UserProfile;
    onNavigate?: (view: string) => void;
}

export const PricingAndCommissions: React.FC<PricingAndCommissionsProps> = ({ user, onNavigate }) => {
    const { addToast } = useToast();
    const [config, setConfig] = useState<SystemConfig>({
        google_drive_enabled: false,
        google_client_id: '',
        google_api_key: '',
        target_folder_id: '',
        ...DEFAULT_TIER_CONFIG
    });
    const [sagas, setSagas] = useState<TournamentSaga[]>([]);
    const [loading, setLoading] = useState(true);

    // Promo Code Input State
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    // New Saga Modal State
    const [isSagaModalOpen, setIsSagaModalOpen] = useState(false);
    const [newSagaName, setNewSagaName] = useState('');
    const [creatingSaga, setCreatingSaga] = useState(false);
    const [currentInst, setCurrentInst] = useState<Institution | null>(null);

    // Live Simulator State
    const [simPlayers, setSimPlayers] = useState<number>(24);
    const [simPrice, setSimPrice] = useState<number>(20000);
    const [simTierKey, setSimTierKey] = useState<'challenger' | '250' | '500' | '1000' | 'masters'>('250');
    const [simIsDirectJump, setSimIsDirectJump] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, [user.institution_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cfgData, sagasData, instData] = await Promise.all([
                api.settings.getConfig(),
                user.institution_id ? api.sagas.getByInstitution(user.institution_id) : Promise.resolve([]),
                user.institution_id ? api.institutions.getById(user.institution_id) : Promise.resolve(null)
            ]);
            setConfig({ ...DEFAULT_TIER_CONFIG, ...cfgData });
            setSagas(sagasData);
            if (instData) setCurrentInst(instData);
        } catch (e) {
            console.error("Error loading pricing data:", e);
        } finally {
            setLoading(false);
        }
    };

    const isVipActive = Boolean(user.is_membership_active || currentInst?.is_membership_active);
    const vipType = user.membership_type || currentInst?.membership_type || 'none';
    const freeSlotsRemaining = Math.max(user.free_tournaments_remaining || 0, currentInst?.free_tournaments_remaining || 0);
    const freeSlotsDisputed = Math.max(user.free_tournaments_disputed || 0, currentInst?.free_tournaments_disputed || 0);

    const handleRedeemPromoCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCodeInput.trim()) {
            addToast("Por favor ingresa un código promocional.", 'error');
            return;
        }

        setRedeeming(true);
        try {
            const res = await api.promoCodes.redeemPromoCode(promoCodeInput, user.id);
            addToast(res.message || "¡Código canjeado con éxito!", 'success');
            setPromoCodeInput('');
            window.location.reload();
        } catch (err: any) {
            addToast(err.message || "Error al canjear código promocional.", 'error');
        } finally {
            setRedeeming(false);
        }
    };

    const handleCreateSaga = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSagaName.trim()) {
            addToast("Ingresa un nombre para la saga del torneo.", 'error');
            return;
        }
        if (!user.institution_id) {
            addToast("Debes pertenecer a un club para crear sagas de torneos.", 'error');
            return;
        }

        setCreatingSaga(true);
        try {
            await api.sagas.create({
                name: newSagaName.trim(),
                institution_id: user.institution_id,
                created_by: user.id,
                current_tier: 'challenger'
            });
            addToast("¡Saga de torneo creada con éxito!", 'success');
            setNewSagaName('');
            setIsSagaModalOpen(false);
            loadData();
        } catch (err: any) {
            console.error(err);
            addToast("Error al crear saga de torneo.", 'error');
        } finally {
            setCreatingSaga(false);
        }
    };

    const selectedTierInfo = getTierInfoByKey(simTierKey, config);
    const effectiveFeePct = simIsDirectJump 
        ? (selectedTierInfo.directFeePercentage ?? selectedTierInfo.feePercentage)
        : selectedTierInfo.feePercentage;

    const grossTotal = simPlayers * simPrice;
    const isUserWaived = Boolean(
        isVipActive ||
        freeSlotsRemaining > 0
    );

    const appliedFeePct = isUserWaived ? 0 : effectiveFeePct;
    const platformCommission = (grossTotal * appliedFeePct) / 100;
    const clubNetTotal = grossTotal - platformCommission;

    return (
        <div className="space-y-8 animate-fade-up max-w-6xl mx-auto pb-12">
            
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                        <Trophy className="text-amber-400" size={32} />
                        Precios, Comisiones y Ascenso de Torneos
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Transparencia total: Conoce cómo monetiza tu club, escala de categorías y beneficios de fidelidad.
                    </p>
                </div>

                {/* Badge de Estado del Organizador */}
                <div className="flex items-center gap-2">
                    {isVipActive && vipType === 'vip_permanent' && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <Sparkles size={14} /> Membresía VIP Permanente (0% Comisión)
                        </span>
                    )}
                    {isVipActive && vipType === 'vip_time_limited' && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                            <Sparkles size={14} /> Membresía VIP Bonificada
                        </span>
                    )}
                    {freeSlotsRemaining > 0 && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                            <Gift size={14} /> {freeSlotsRemaining} Torneo{freeSlotsRemaining > 1 ? 's' : ''} Gratis Restante{freeSlotsRemaining > 1 ? 's' : ''}
                        </span>
                    )}
                    {!isVipActive && freeSlotsRemaining === 0 && (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-primary" /> Plan Estándar por Convocatoria
                        </span>
                    )}
                </div>
            </div>

            {/* 1. HERO BANNER: $0 COSTO FIJO / RIESGO CERO */}
            <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl shadow-emerald-950/40">
                <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-8 space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider">
                            <Zap size={14} /> Garantía de Riesgo Cero
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            La app tiene <span className="text-emerald-400 font-extrabold">$0 costo fijo mensual</span>.
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            No pagas abonos de mantenimiento ni licencias obligatorias. Si tu club no organiza torneos o no registra inscriptos, <strong className="text-white">el costo es literalmente $0</strong>. Solo se aplica una pequeña comisión por inscripto cuando un torneo se disputa efectivamente.
                        </p>
                    </div>

                    <div className="lg:col-span-4 bg-slate-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur space-y-3">
                        <div className="text-xs uppercase font-bold text-muted tracking-wider">Compromiso Smash Tenis</div>
                        <div className="space-y-2 text-xs text-slate-200">
                            <div className="flex items-center gap-2 text-emerald-300">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>Sin costo de alta ni mensualidad</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-300">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>2 Torneos gratis si ingresas código</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-300">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>Descuentos de hasta 50% por mérito</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. ESTADO DE MEMBRESÍA & CANJE DE CÓDIGO PROMOCIONAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tarjeta de Beneficios Actuales */}
                <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-card to-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                    <Gift size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Tus Beneficios Activos</h3>
                                    <p className="text-xs text-muted">Torneos de bienvenida y bonificaciones especiales</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 my-4">
                            <div className="p-4 rounded-2xl bg-sidebar/80 border border-white/10 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted">Torneos Gratuitos Restantes:</span>
                                    <span className="font-black text-cyan-300 text-sm">{freeSlotsRemaining} de 2</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all"
                                        style={{ width: `${Math.min(100, (freeSlotsRemaining / 2) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[11px] text-muted">
                                    {freeSlotsRemaining > 0 
                                        ? `¡Aprovecha tus ${freeSlotsRemaining} torneos 100% bonificados sin comisión!`
                                        : (freeSlotsDisputed > 0 
                                            ? `Has utilizado con éxito tus ${freeSlotsDisputed} torneos de bienvenida.`
                                            : 'No tienes torneos gratuitos activos. Ingresa un código abajo si tienes uno.')
                                    }
                                </p>
                            </div>

                            {user.promo_code_used && (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                                    <span className="text-muted">Código Canjeado:</span>
                                    <span className="font-mono font-bold text-green-400">{user.promo_code_used}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-2">
                        <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span>
                            <strong>¿Cuándo se consume un torneo gratis?</strong> Solo cuando el torneo se disputa efectivamente con al menos 2 partidos jugados y cargados. Si creas un torneo de prueba y lo cancelas, no se gasta tu cupo.
                        </span>
                    </div>
                </Card>

                {/* Formulario de Canje de Código Promocional */}
                <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-card to-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Canjear Código Promocional</h3>
                                <p className="text-xs text-muted">Obtén 2 torneos gratis para tu club</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 mb-4">
                            Si el Super Admin te brindó un código de invitación o promoción de bienvenida, ingrésalo aquí para activar tus 2 torneos gratuitos:
                        </p>

                        <form onSubmit={handleRedeemPromoCode} className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ej: BIENVENIDOCLUB2026"
                                    className="w-full bg-sidebar border border-white/15 rounded-xl p-3 text-white placeholder-slate-500 uppercase font-mono font-bold text-sm focus:border-purple-400 focus:outline-none transition-colors"
                                    value={promoCodeInput}
                                    onChange={e => setPromoCodeInput(e.target.value)}
                                    disabled={redeeming || Boolean(user.promo_code_used)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={redeeming || Boolean(user.promo_code_used) || !promoCodeInput.trim()}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {redeeming ? 'Validando código...' : (user.promo_code_used ? '✓ Código ya canjeado' : 'Canjear y Activar 2 Torneos Gratis')}
                            </button>
                        </form>
                    </div>

                    <p className="text-[11px] text-muted text-center mt-4">
                        ¿No tienes un código? Contacta a la administración de Smash Tenis para solicitar tu acceso bonificado de organizador.
                    </p>
                </Card>
            </div>

            {/* 3. ESCALERA DE ASCENSO DE CATEGORÍAS ATP (SAGAS & NIVELES) */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="text-amber-400" /> Escalera de Ascenso de Torneos (Circuito ATP)
                        </h2>
                        <p className="text-xs text-muted">
                            Haz crecer las sagas de tu club. Cada edición que convoque jugadores y respete la cadencia asciende de nivel y desbloquea la tarifa bonificada.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                            <Clock size={13} /> Regla Épica: Mínimo 180 días entre ediciones
                        </span>
                    </div>
                </div>

                {/* Grid de Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {TIER_ORDER.map((tierKey, index) => {
                        const tier = getTierInfoByKey(tierKey, config);
                        const meta = TIER_META[tierKey];

                        return (
                            <div
                                key={tierKey}
                                className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${meta.badgeColor} ${meta.borderColor} bg-slate-950/70`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg">{meta.icon}</span>
                                        <span className="text-[10px] font-mono font-bold text-muted bg-white/5 px-2 py-0.5 rounded-md">
                                            Nivel {index + 1}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className={`text-sm font-black ${meta.textColor}`}>{meta.label}</h4>
                                        <p className="text-[11px] text-slate-300 mt-1 leading-tight">{meta.description}</p>
                                    </div>

                                    <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                                        <div className="flex justify-between text-slate-300">
                                            <span className="text-muted text-[11px]">Puntos Campeón:</span>
                                            <span className="font-bold text-white">{tier.pointsWinner} pts</span>
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span className="text-muted text-[11px]">Convocatoria:</span>
                                            <span className="font-bold text-white">
                                                {tier.minPlayers}{tier.maxPlayers ? `-${tier.maxPlayers}` : '+'} jug.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-[10px] text-muted uppercase font-bold">Por Mérito:</span>
                                        <span className="font-extrabold text-green-400">{tier.feePercentage}%</span>
                                    </div>
                                    {tierKey !== 'challenger' && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[10px] text-muted uppercase font-bold">Salto Directo:</span>
                                            <span className="font-extrabold text-amber-300">{tier.directFeePercentage}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Explicación de la Cadencia Épica */}
                <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-slate-300">
                    <Flame className="text-orange-400 shrink-0" size={24} />
                    <div className="flex-1">
                        <strong className="text-white">¿Por qué existe la regla de los 180 días?</strong> Para que el ascenso de tu torneo sea realmente épico y prestigioso. Si un organizador repite el torneo todos los meses, esas repeticiones mensuales no computan para ascender de categoría la saga, asegurando que cada subida de nivel represente un verdadero hito deportivo.
                    </div>
                </div>
            </div>

            {/* 4. SIMULADOR INTERACTIVO DE RECAUDACIÓN Y LIQUIDACIÓN */}
            <Card className="border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
                <div className="border-b border-white/10 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Calculator className="text-primary" /> Simulador de Liquidación en Vivo
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                            Calcula exactamente cuánto recaudará tu club según la categoría, cantidad de inscriptos y arancel.
                        </p>
                    </div>
                    <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Sparkles size={14} /> Cálculo en Tiempo Real
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Controles del Simulador */}
                    <div className="lg:col-span-7 space-y-5">
                        
                        {/* Selector de Nivel de Torneo */}
                        <div>
                            <label className="text-xs text-muted uppercase font-bold block mb-2">1. Categoría del Torneo a Simular</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {TIER_ORDER.map(tKey => {
                                    const meta = TIER_META[tKey];
                                    const isSelected = simTierKey === tKey;
                                    return (
                                        <button
                                            key={tKey}
                                            type="button"
                                            onClick={() => setSimTierKey(tKey)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 ${
                                                isSelected 
                                                    ? `${meta.badgeColor} ${meta.borderColor} ${meta.textColor} shadow-lg shadow-black/40 scale-105`
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            <span>{meta.icon}</span>
                                            <span>{meta.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modo de Creación: Mérito vs Salto Directo */}
                        {simTierKey !== 'challenger' && (
                            <div>
                                <label className="text-xs text-muted uppercase font-bold block mb-2">2. Modo de Creación</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setSimIsDirectJump(false)}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            !simIsDirectJump
                                                ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Award size={14} /> Por Mérito / Saga ({selectedTierInfo.feePercentage}%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSimIsDirectJump(true)}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            simIsDirectJump
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Zap size={14} /> Salto Directo ({selectedTierInfo.directFeePercentage}%)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sliders de Inscriptos y Precio */}
                        <div className="space-y-4 pt-2">
                            <div>
                                <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                                    <span className="text-muted uppercase">3. Cantidad de Inscriptos:</span>
                                    <span className="text-primary font-mono text-sm">{simPlayers} jugadores</span>
                                </div>
                                <input
                                    type="range"
                                    min={4}
                                    max={128}
                                    step={2}
                                    value={simPlayers}
                                    onChange={e => setSimPlayers(Number(e.target.value))}
                                    className="w-full accent-primary h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
                                    <span className="text-muted uppercase">4. Precio de Inscripción por Jugador:</span>
                                    <span className="text-emerald-400 font-mono text-sm">${simPrice.toLocaleString('es-AR')}</span>
                                </div>
                                <input
                                    type="range"
                                    min={2000}
                                    max={60000}
                                    step={1000}
                                    value={simPrice}
                                    onChange={e => setSimPrice(Number(e.target.value))}
                                    className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta de Resultados del Simulador */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-black border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="text-xs uppercase font-bold text-muted tracking-wider border-b border-white/10 pb-2 flex justify-between items-center">
                            <span>Desglose de Liquidación</span>
                            <span className="text-cyan-400 font-mono font-bold">{selectedTierInfo.label}</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-300">Recaudación Bruta:</span>
                                <span className="font-mono font-bold text-white text-sm">${grossTotal.toLocaleString('es-AR')}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-300 flex items-center gap-1">
                                    Comisión App ({appliedFeePct}%):
                                    {isUserWaived && <span className="text-[10px] text-green-400 font-bold">(Bonificado 0%)</span>}
                                </span>
                                <span className="font-mono font-bold text-red-400">-${platformCommission.toLocaleString('es-AR')}</span>
                            </div>

                            <div className="pt-3 border-t border-white/15 space-y-1">
                                <div className="text-[11px] text-emerald-400 uppercase font-extrabold tracking-wider">
                                    Ingreso Neto Libre para el Club
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono">
                                    ${clubNetTotal.toLocaleString('es-AR')}
                                </div>
                                <p className="text-[10px] text-muted mt-1">
                                    El 100% restante queda disponible para el club / organizador.
                                </p>
                            </div>
                        </div>

                        {onNavigate && (
                            <button
                                type="button"
                                onClick={() => onNavigate('tournaments')}
                                className="w-full mt-2 bg-gradient-to-r from-primary to-primary-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 text-xs flex items-center justify-center gap-2 hover:translate-y-px transition-all"
                            >
                                <Plus size={16} /> Crear Torneo con estos Parámetros
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* 5. TUS SAGAS DE TORNEO REGISTRADAS */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers className="text-purple-400" /> Sagas de Torneos de tu Club
                        </h2>
                        <p className="text-xs text-muted">
                            Administra las series recurrentes creadas por tu institución.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsSagaModalOpen(true)}
                        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} /> Nueva Saga de Torneo
                    </button>
                </div>

                {sagas.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center space-y-3 bg-slate-900/40">
                        <Layers size={36} className="text-muted mx-auto" />
                        <div className="text-sm font-bold text-white">Aún no tienes sagas de torneos registradas</div>
                        <p className="text-xs text-muted max-w-md mx-auto">
                            Crea una saga (ej: <em>"Copa de Verano"</em>, <em>"Abierto Aniversario"</em>) para agrupar las ediciones anuales y comenzar a escalar de categoría.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsSagaModalOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Crear mi Primera Saga
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {sagas.map(saga => {
                            const meta = TIER_META[saga.current_tier] || TIER_META.challenger;
                            return (
                                <div
                                    key={saga.id}
                                    className={`p-5 rounded-2xl border ${meta.badgeColor} ${meta.borderColor} bg-slate-950/80 space-y-3 flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-white text-base">{saga.name}</h4>
                                            <span className="text-lg">{meta.icon}</span>
                                        </div>
                                        <span className={`inline-block text-xs font-extrabold mt-1 ${meta.textColor}`}>
                                            {meta.label}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-300">
                                        <span>Ediciones Totales:</span>
                                        <span className="font-bold font-mono text-white">{saga.total_editions}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL PARA CREAR NUEVA SAGA */}
            {isSagaModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-up space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Layers className="text-primary" /> Crear Nueva Saga de Torneo
                            </h3>
                            <button
                                onClick={() => setIsSagaModalOpen(false)}
                                className="text-muted hover:text-white text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSaga} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase mb-1.5">
                                    Nombre de la Saga / Serie *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Copa de Verano, Torneo Aniversario..."
                                    className="w-full bg-sidebar border border-white/15 rounded-xl p-3 text-white focus:border-primary focus:outline-none text-sm"
                                    required
                                    value={newSagaName}
                                    onChange={e => setNewSagaName(e.target.value)}
                                />
                                <p className="text-[11px] text-muted mt-1.5">
                                    Las próximas ediciones que organices podrán vincularse a esta saga para computar mérito y ascender de nivel.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSagaModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted hover:text-white bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingSaga || !newSagaName.trim()}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {creatingSaga ? 'Guardando...' : 'Crear Saga'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};