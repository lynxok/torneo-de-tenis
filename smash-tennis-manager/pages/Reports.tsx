
import React, { useEffect, useState } from 'react';
import { UserProfile, Transaction, Institution } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard,
    Download, AlertCircle, PieChart, ArrowUpRight, ArrowDownRight,
    Wallet, Trophy, User, Crown, Activity, Filter, CheckCircle2, XCircle, Plus, X, Save, Loader2, Smartphone, Building, Clock,
    Flame, CalendarDays, Grid, BarChart3, Layers, Sparkles
} from 'lucide-react';

interface ReportsProps {
    user: UserProfile;
}

export const Reports: React.FC<ReportsProps> = ({ user }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
    const [stats, setStats] = useState<any>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Heatmap View Tab
    const [heatmapTab, setHeatmapTab] = useState<'matrix' | 'hours' | 'days'>('matrix');

    // Super Admin specific state
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');

    // Filters for Transaction Table
    const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

    // Create Transaction Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Initial Load & Super Admin Logic
    useEffect(() => {
        if (user.role === 'superadmin') {
            // Load list of institutions for the selector
            api.institutions.getAll().then(data => {
                setInstitutions(data);
                setSelectedInstId('all'); // Default to global view
            });
        } else {
            // For normal admin, stick to their institution
            setSelectedInstId(user.institution_id || '');
        }
    }, [user]);

    // Data Fetching based on selection
    useEffect(() => {
        // Wait until we have a selected ID (or 'all')
        if (selectedInstId) {
            loadData();
        }
    }, [period, selectedInstId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Use selectedInstId (which could be 'all' or a specific UUID)
            const statsData = await api.reports.getStats(selectedInstId, period);
            const txData = await api.reports.getTransactions(selectedInstId);

            setStats(statsData);
            setTransactions(txData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleTransactionCreated = (newTx: Transaction) => {
        setTransactions([newTx, ...transactions]);
        setShowCreateModal(false);
        // Manually update stats for immediate visual feedback
        if (stats) {
            if (newTx.type === 'income') {
                setStats({ ...stats, total_income: stats.total_income + newTx.amount, net_income: stats.net_income + newTx.amount });
            } else {
                setStats({ ...stats, total_expenses: stats.total_expenses + newTx.amount, net_income: stats.net_income - newTx.amount });
            }
        }
    };

    const handleExport = () => {
        alert("Generando reporte PDF... (Simulación)");
    };

    // ACCESS CONTROL: Players and Professors cannot see this page
    if (user.role === 'player' || user.role === 'professor') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted">
                <AlertCircle size={48} className="mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
                <p>No tienes permisos para ver los reportes financieros.</p>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
    };

    const getPeriodLabel = () => {
        switch (period) {
            case 'day': return 'Hoy';
            case 'week': return 'Esta Semana';
            case 'month': return 'Este Mes';
        }
    };

    const getPaymentLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo';
            case 'transfer': return 'Transferencia';
            case 'mercadopago': return 'Mercado Pago';
            default: return method;
        }
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'cash': return <DollarSign size={10} />;
            case 'transfer': return <ArrowUpRight size={10} />;
            case 'mercadopago': return <Smartphone size={10} />;
            default: return <CreditCard size={10} />;
        }
    };

    const filteredTransactions = transactions.filter(tx =>
        txTypeFilter === 'all' ? true : tx.type === txTypeFilter
    );

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Wallet className="text-green-400" /> Caja y Finanzas
                    </h2>
                    <p className="text-muted text-sm">
                        {user.role === 'superadmin'
                            ? 'Tablero general de rendimiento financiero por institución.'
                            : `Resumen financiero y operativo de ${user.institution || 'la plataforma'}.`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto">

                    {/* SUPER ADMIN: Institution Selector */}
                    {user.role === 'superadmin' && (
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                            <select
                                className="bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm font-bold min-w-[200px]"
                                value={selectedInstId}
                                onChange={(e) => setSelectedInstId(e.target.value)}
                            >
                                <option value="all">Vista Global (Todas)</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* ADMIN ONLY: Create Button (Super Admin cannot create) */}
                    {user.role !== 'superadmin' && (
                        <button
                            id="btn-new-transaction"
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                        >
                            <Plus size={18} /> Registrar Movimiento
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-card border border-white/10 rounded-xl p-1">
                        {['day', 'week', 'month'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${period === p ? 'bg-white/10 text-white shadow' : 'text-muted hover:text-white'}`}
                            >
                                {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : 'Mes'}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleExport} className="bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-xl transition-colors shadow-lg shadow-primary/20">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {loading || !stats ? (
                <div className="text-center py-20 text-muted">Calculando reportes financieros...</div>
            ) : (
                <>
                    {/* FINANCIAL KPI CARDS */}
                    <div id="reports-kpi" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* NET INCOME */}
                        <Card className="bg-gradient-to-br from-indigo-900/40 to-card border-indigo-500/20 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Wallet size={20} /></div>
                                <span className="text-xs text-indigo-300 font-bold bg-indigo-500/10 px-2 py-1 rounded">
                                    Margen {stats.profit_margin}%
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1 relative z-10">{formatCurrency(stats.net_income)}</div>
                            <div className="text-xs text-muted uppercase font-bold relative z-10">Utilidad Neta ({getPeriodLabel()})</div>
                        </Card>

                        {/* TOTAL INCOME */}
                        <Card>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><TrendingUp size={20} /></div>
                                <span className="text-xs text-green-400 flex items-center gap-1 font-bold"><ArrowUpRight size={12} /> Ingresos</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.total_income)}</div>
                            <div className="text-xs text-muted uppercase font-bold">Total Facturado</div>
                        </Card>

                        {/* EXPENSES */}
                        <Card>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><TrendingDown size={20} /></div>
                                <span className="text-xs text-red-400 flex items-center gap-1 font-bold"><ArrowDownRight size={12} /> Gastos</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.total_expenses)}</div>
                            <div className="text-xs text-muted uppercase font-bold">Costos Operativos</div>
                        </Card>

                        {/* PENDING */}
                        <Card>
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><AlertCircle size={20} /></div>
                                <span className="text-xs text-yellow-400 font-bold">Por cobrar</span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.pending_income)}</div>
                            <div className="text-xs text-muted uppercase font-bold">Caja Pendiente</div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* MAIN CHART: CASH FLOW (2/3) */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="h-96 flex flex-col bg-card/80">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                                    <div>
                                        <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                            <Activity className="text-primary" size={18} /> Flujo de Caja (Ingresos vs Egresos)
                                        </h3>
                                        <span className="text-[11px] text-muted">
                                            {period === 'day' && 'Franjas horarias de hoy (08:00 a 22:00)'}
                                            {period === 'week' && 'Evolución diaria de la semana en curso'}
                                            {period === 'month' && 'Evolución por semanas del mes en curso'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span className="text-slate-300">Ingresos</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500/80 rounded-sm"></div> <span className="text-slate-300">Egresos</span></div>
                                    </div>
                                </div>

                                <div className="flex-1 flex items-end justify-between gap-2 sm:gap-3 px-2 sm:px-4 pb-2">
                                    {stats.chart_data && stats.chart_data.map((item: any, i: number) => {
                                        const maxIncome = Math.max(...stats.chart_data.map((d: any) => d.income || 0), 0);
                                        const maxExpense = Math.max(...stats.chart_data.map((d: any) => d.expense || 0), 0);
                                        const maxVal = Math.max(maxIncome, maxExpense, 1) * 1.15;
                                        const hIncome = Math.max(Math.round(((item.income || 0) / maxVal) * 100), item.income > 0 ? 6 : 2);
                                        const hExpense = Math.max(Math.round(((item.expense || 0) / maxVal) * 100), item.expense > 0 ? 6 : 2);

                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
                                                {/* Tooltip Wrapper */}
                                                <div className="relative w-full flex gap-1 items-end justify-center h-full">

                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/95 border border-white/15 text-white text-[11px] p-2.5 rounded-lg shadow-2xl pointer-events-none z-30 whitespace-nowrap">
                                                        <div className="font-bold text-slate-300 border-b border-white/10 pb-1 mb-1">{item.day}</div>
                                                        <div className="text-green-400 font-semibold flex items-center justify-between gap-3">
                                                            <span>Ingresos:</span> <span>{formatCurrency(item.income)}</span>
                                                        </div>
                                                        <div className="text-red-400 font-semibold flex items-center justify-between gap-3">
                                                            <span>Egresos:</span> <span>{formatCurrency(item.expense)}</span>
                                                        </div>
                                                        <div className="border-t border-white/20 mt-1 pt-1 font-bold text-white flex items-center justify-between gap-3">
                                                            <span>Neto:</span> <span>{formatCurrency(item.income - item.expense)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Bars */}
                                                    <div
                                                        style={{ height: `${hExpense}%` }}
                                                        className={`w-1/2 rounded-t-sm transition-all ${item.expense > 0 ? 'bg-red-500/70 hover:bg-red-500 shadow-sm shadow-red-500/20' : 'bg-white/5'}`}
                                                    ></div>
                                                    <div
                                                        style={{ height: `${hIncome}%` }}
                                                        className={`w-1/2 rounded-t-sm transition-all ${item.income > 0 ? 'bg-green-500 hover:bg-green-400 shadow-sm shadow-green-500/20' : 'bg-white/5'}`}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] sm:text-[11px] text-muted mt-2 uppercase font-bold text-center leading-tight">
                                                    {item.shortDay ? (
                                                        <>
                                                            <span>{item.shortDay}</span>
                                                            <span className="block text-[9px] font-normal text-slate-500">{item.day.split(' ')[1] || ''}</span>
                                                        </>
                                                    ) : (
                                                        item.day
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* REVENUE BREAKDOWN & PAYMENT METHODS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Peak Hours Card */}
                                <Card className="flex flex-col">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <Clock size={16} className="text-amber-400" /> Horarios Más Demandados
                                    </h4>
                                    <div className="flex-1 space-y-3 flex flex-col justify-center">
                                         {stats.peak_hours && stats.peak_hours.length > 0 ? (
                                             stats.peak_hours.slice(0, 5).map((slot: any, i: number) => (
                                                 <div key={i} className="flex items-center gap-3">
                                                     <div className="w-12 text-right text-xs font-bold text-slate-300">{slot.hour}</div>
                                                     <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                         <div
                                                             className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                                                             style={{ width: `${slot.intensity}%` }}
                                                         ></div>
                                                     </div>
                                                     <div className="text-[10px] text-muted w-12 text-right">{slot.count} Res.</div>
                                                 </div>
                                             ))
                                         ) : (
                                             <div className="text-center text-muted text-xs py-8">Sin datos suficientes de reservas</div>
                                         )}
                                     </div>
                                </Card>

                                {/* Payment Methods Donut */}
                                <Card className="flex flex-col">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <CreditCard size={16} className="text-blue-400" /> Métodos de Pago
                                    </h4>
                                    <div className="flex items-center justify-center gap-6 h-full">
                                        {/* CSS Conic Gradient Donut */}
                                        <div className="relative w-32 h-32 rounded-full flex items-center justify-center"
                                            style={{
                                                background: `conic-gradient(
                                                     ${stats.payment_methods[0]?.color || '#22c55e'} 0% ${stats.total_income > 0 ? Math.round(((stats.payment_methods[0]?.value || 0) / stats.total_income) * 100) : 100}%,
                                                     ${stats.payment_methods[1]?.color || '#3b82f6'} ${stats.total_income > 0 ? Math.round(((stats.payment_methods[0]?.value || 0) / stats.total_income) * 100) : 0}% ${stats.total_income > 0 ? Math.round((((stats.payment_methods[0]?.value || 0) + (stats.payment_methods[1]?.value || 0)) / stats.total_income) * 100) : 0}%,
                                                     ${stats.payment_methods[2]?.color || '#009ee3'} ${stats.total_income > 0 ? Math.round((((stats.payment_methods[0]?.value || 0) + (stats.payment_methods[1]?.value || 0)) / stats.total_income) * 100) : 0}% 100%
                                                 )`
                                            }}>
                                            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center flex-col">
                                                <span className="text-[10px] text-muted uppercase">Total</span>
                                                <span className="text-xs font-bold text-white">{formatCurrency(stats.total_income)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-xs">
                                            {stats.payment_methods.map((method: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }}></div>
                                                    <span className="text-slate-300">{method.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {/* Right Column: Transaction List & Top Items (1/3) */}
                        <div className="space-y-6">

                            {/* RECENT TRANSACTIONS */}
                            <Card className="h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <CreditCard className="text-muted" size={18} /> Movimientos
                                    </h3>
                                    <div className="flex bg-black/20 rounded-lg p-0.5">
                                        <button onClick={() => setTxTypeFilter('all')} className={`p-1.5 rounded-md transition-colors ${txTypeFilter === 'all' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`} title="Todos"><Filter size={14} /></button>
                                        <button onClick={() => setTxTypeFilter('income')} className={`p-1.5 rounded-md transition-colors ${txTypeFilter === 'income' ? 'bg-green-500/20 text-green-400' : 'text-muted hover:text-green-400'}`} title="Ingresos"><ArrowUpRight size={14} /></button>
                                        <button onClick={() => setTxTypeFilter('expense')} className={`p-1.5 rounded-md transition-colors ${txTypeFilter === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-muted hover:text-red-400'}`} title="Egresos"><ArrowDownRight size={14} /></button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[500px] -mx-2 px-2">
                                    {filteredTransactions.length === 0 ? (
                                        <div className="text-center py-10 text-muted text-xs">
                                            No hay movimientos para este período.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[10px] text-muted uppercase border-b border-white/10">
                                                    <th className="pb-2 pl-2">Detalle</th>
                                                    <th className="pb-2 text-right pr-2">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-xs">
                                                {filteredTransactions.map(tx => (
                                                    <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                                                        <td className="py-3 pl-2">
                                                            <div className="font-bold text-slate-200">{tx.description}</div>
                                                            <div className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                                                                <span>{new Date(tx.date).toLocaleDateString()}</span>
                                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                                <span className="flex items-center gap-1">
                                                                    {getPaymentIcon(tx.payment_method)}
                                                                    {getPaymentLabel(tx.payment_method)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right pr-2">
                                                            <div className={`font-mono font-bold text-sm ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                            </div>
                                                            <div className="text-[10px] text-muted uppercase">{tx.status === 'pending' ? 'Pendiente' : 'Cobrado'}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </Card>

                            {/* MVP PLAYER MINI CARD */}
                            {stats.top_player && (
                                <div className="bg-gradient-to-r from-amber-900/30 to-card border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-2 opacity-10 text-amber-500"><Trophy size={60} /></div>
                                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-lg text-lg relative z-10">
                                        {stats.top_player.name.charAt(0)}
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-xs text-amber-200 font-bold uppercase mb-0.5 flex items-center gap-1"><Crown size={12} /> Cliente MVP</div>
                                        <div className="text-white font-bold">{stats.top_player.name}</div>
                                        <div className="text-xs text-muted">{stats.top_player.matches_won} partidos ganados</div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* HEATMAP SECTION: DEMAND & OCCUPANCY */}
                    <Card className="bg-card/90 border-white/10 overflow-hidden mt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-white/10">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                                    <Flame className="text-amber-400" size={20} /> Mapas de Calor y Ocupación de Canchas
                                </h3>
                                <p className="text-xs text-muted mt-0.5">
                                    Identifica las franjas horarias de mayor demanda y los días con más alquileres en el club.
                                </p>
                            </div>

                            {/* View Switcher Tabs */}
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                                <button
                                    onClick={() => setHeatmapTab('matrix')}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${heatmapTab === 'matrix' ? 'bg-primary text-white shadow font-bold' : 'text-muted hover:text-white'}`}
                                >
                                    <Grid size={14} /> Matriz Día × Hora
                                </button>
                                <button
                                    onClick={() => setHeatmapTab('hours')}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${heatmapTab === 'hours' ? 'bg-primary text-white shadow font-bold' : 'text-muted hover:text-white'}`}
                                >
                                    <Clock size={14} /> Por Horarios
                                </button>
                                <button
                                    onClick={() => setHeatmapTab('days')}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${heatmapTab === 'days' ? 'bg-primary text-white shadow font-bold' : 'text-muted hover:text-white'}`}
                                >
                                    <CalendarDays size={14} /> Por Días
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: 2D MATRIX (DAY X HOUR) */}
                        {heatmapTab === 'matrix' && stats.matrix_heatmap && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto custom-scrollbar pb-2">
                                    <div className="min-w-[720px]">
                                        {/* Header Row with Hours */}
                                        <div className="grid grid-cols-[80px_repeat(16,1fr)] gap-1 mb-1 text-[11px] text-muted font-bold text-center">
                                            <div className="text-left pl-2">Día / Hora</div>
                                            {['08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'].map(h => (
                                                <div key={h} className="text-slate-400">{h}h</div>
                                            ))}
                                        </div>

                                        {/* Matrix Rows */}
                                        <div className="space-y-1.5">
                                            {stats.matrix_heatmap.map((row: any, rIdx: number) => {
                                                const dayName = row[0]?.day_short || `D${rIdx}`;
                                                const fullDay = row[0]?.day || '';
                                                return (
                                                    <div key={rIdx} className="grid grid-cols-[80px_repeat(16,1fr)] gap-1 items-center">
                                                        <div className="text-xs font-bold text-slate-300 pl-2 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                                            {dayName}
                                                        </div>
                                                        {row.map((cell: any, cIdx: number) => {
                                                            let bgClass = 'bg-white/5 hover:bg-white/15 text-transparent';
                                                            if (cell.count > 0) {
                                                                if (cell.intensity >= 75) bgClass = 'bg-amber-500 text-black font-black shadow-sm shadow-amber-500/30 ring-1 ring-amber-400 hover:bg-amber-400';
                                                                else if (cell.intensity >= 50) bgClass = 'bg-emerald-500 text-black font-bold shadow-sm shadow-emerald-500/20 hover:bg-emerald-400';
                                                                else if (cell.intensity >= 25) bgClass = 'bg-emerald-700/80 text-white font-medium hover:bg-emerald-600';
                                                                else bgClass = 'bg-emerald-950/80 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900';
                                                            }

                                                            return (
                                                                <div
                                                                    key={cIdx}
                                                                    className={`h-9 rounded-md flex items-center justify-center text-[11px] transition-all cursor-pointer group relative ${bgClass}`}
                                                                >
                                                                    {cell.count > 0 ? cell.count : ''}

                                                                    {/* Hover Tooltip */}
                                                                    <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                                                                        <div className="bg-black/95 text-white border border-white/15 text-[10px] px-2.5 py-1.5 rounded-md shadow-2xl">
                                                                            <div className="font-bold text-amber-300">{fullDay} a las {cell.hour} hs</div>
                                                                            <div className="text-slate-300">{cell.count} {cell.count === 1 ? 'reserva' : 'reservas'} ({cell.intensity}% afluencia)</div>
                                                                        </div>
                                                                        <div className="w-2 h-2 bg-black/95 rotate-45 -mt-1 border-r border-b border-white/15"></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Matrix Legend */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-muted">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-400">Escala de demanda:</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm bg-white/5 border border-white/10 inline-block"></span>
                                            <span className="text-[10px]">Sin reservas</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm bg-emerald-950 border border-emerald-800/40 inline-block"></span>
                                            <span className="text-[10px]">Baja</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm bg-emerald-700 inline-block"></span>
                                            <span className="text-[10px]">Media</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                                            <span className="text-[10px]">Alta</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
                                            <span className="text-[10px] font-bold text-amber-400">Pico 🔥</span>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-400 italic">
                                        * El número dentro de cada casilla indica la cantidad de turnos registrados.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: POR HORARIO */}
                        {heatmapTab === 'hours' && stats.hours_heatmap && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                                    {stats.hours_heatmap.map((slot: any, i: number) => {
                                        const isPeak = slot.intensity >= 80 && slot.count > 0;
                                        return (
                                            <div
                                                key={i}
                                                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                    isPeak
                                                        ? 'bg-gradient-to-b from-amber-500/20 to-card border-amber-500/40 shadow-lg shadow-amber-500/10'
                                                        : slot.count > 0
                                                        ? 'bg-card border-emerald-500/30'
                                                        : 'bg-card/40 border-white/5 opacity-60'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-white">{slot.hour}</span>
                                                    {isPeak && <Flame size={14} className="text-amber-400 animate-pulse" />}
                                                </div>
                                                <div className="text-xl font-black text-white mb-2">
                                                    {slot.count} <span className="text-[10px] font-normal text-muted">turnos</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[9px] text-muted font-medium">
                                                        <span>Afluencia</span>
                                                        <span>{slot.intensity}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${isPeak ? 'bg-amber-500' : 'bg-emerald-400'}`}
                                                            style={{ width: `${Math.max(slot.intensity, slot.count > 0 ? 10 : 0)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: POR DÍA DE SEMANA */}
                        {heatmapTab === 'days' && stats.days_heatmap && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {stats.days_heatmap.map((d: any, i: number) => {
                                        const isTopDay = d.intensity === 100 && d.count > 0;
                                        return (
                                            <div
                                                key={i}
                                                className={`p-4 rounded-2xl border flex flex-col justify-between relative overflow-hidden transition-all ${
                                                    isTopDay
                                                        ? 'bg-gradient-to-b from-emerald-500/20 via-card to-card border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-card border-white/10'
                                                }`}
                                            >
                                                {isTopDay && (
                                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                                        Top Día
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-bold text-white mb-0.5">{d.day}</div>
                                                    <div className="text-[10px] text-muted uppercase font-semibold">{d.short}</div>
                                                </div>

                                                <div className="my-3">
                                                    <div className="text-2xl font-black text-white">
                                                        {d.count} <span className="text-xs font-normal text-muted">turnos</span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                                                        {formatCurrency(d.revenue)}
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-muted">
                                                        <span>Demanda</span>
                                                        <span className="font-bold text-white">{d.intensity}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${isTopDay ? 'bg-emerald-400' : 'bg-primary'}`}
                                                            style={{ width: `${Math.max(d.intensity, d.count > 0 ? 10 : 0)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Card>

                </>
            )}

            {/* CREATE TRANSACTION MODAL - Only Rendered if showCreateModal is true */}
            {showCreateModal && (
                <TransactionModal
                    user={user}
                    onClose={() => setShowCreateModal(false)}
                    onSave={handleTransactionCreated}
                />
            )}
        </div>
    );
};

// --- NEW TRANSACTION MODAL COMPONENT ---
const TransactionModal = ({ user, onClose, onSave }: { user: UserProfile, onClose: () => void, onSave: (tx: Transaction) => void }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'expense' as 'income' | 'expense',
        description: '',
        amount: '',
        category: 'maintenance',
        payment_method: 'cash' as 'cash' | 'transfer' | 'mercadopago'
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newTx = await api.reports.createTransaction({
                institution_id: user.institution_id || 'inst-1',
                type: formData.type,
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category as any,
                payment_method: formData.payment_method,
                status: 'completed',
                user_name: user.name
            });
            onSave(newTx as Transaction);
        } catch (e) {
            console.error(e);
            alert("Error al registrar movimiento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div id="transaction-modal" className="bg-card border border-white/10 rounded-2xl w-full max-w-sm p-0 shadow-2xl relative flex flex-col">

                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white">Registrar Movimiento</h3>
                    <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {/* Type Selector */}
                    <div className="flex bg-black/30 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === 'income' ? 'bg-green-500 text-white shadow' : 'text-muted hover:text-white'}`}
                        >
                            Ingreso
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === 'expense' ? 'bg-red-500 text-white shadow' : 'text-muted hover:text-white'}`}
                        >
                            Egreso
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted uppercase font-bold">Monto ($)</label>
                        <input
                            type="number"
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-lg font-bold focus:outline-none focus:border-primary"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            required
                            autoFocus
                            placeholder="0.00"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted uppercase font-bold">Concepto / Descripción</label>
                        <input
                            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            required
                            placeholder={formData.type === 'expense' ? "Ej: Compra de pelotas" : "Ej: Cobro particular"}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted uppercase font-bold">Categoría</label>
                            <select
                                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="maintenance">Mantenimiento</option>
                                <option value="services">Servicios (Luz/Agua)</option>
                                <option value="salary">Sueldos</option>
                                <option value="booking">Alquiler</option>
                                <option value="tournament_fee">Torneo</option>
                                <option value="product_sale">Venta Producto</option>
                                <option value="other">Otros</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted uppercase font-bold">Pago</label>
                            <select
                                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-primary"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value as any })}
                            >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia</option>
                                <option value="mercadopago">Mercado Pago</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'income' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20' : 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {loading ? 'Guardando...' : formData.type === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
