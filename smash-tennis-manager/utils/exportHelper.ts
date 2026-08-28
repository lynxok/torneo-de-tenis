import { Tournament, TournamentPlayer, Transaction } from '../types';
import { formatPlayerName } from './formatters';

function escapeCSV(val: any): string {
    if (val === null || val === undefined) return '""';
    const str = String(val).trim();
    return `"${str.replace(/"/g, '""')}"`;
}

function downloadCSV(csvContent: string, filename: string) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportTournamentPlayersToCSV(
    tournament: Tournament,
    players: TournamentPlayer[],
    allProfilesMap: Record<string, any> = {}
) {
    const headers = [
        '#',
        'Nombre y Apellido',
        'DNI',
        'Teléfono / WhatsApp',
        'Categoría',
        'Rama',
        'Modalidad',
        'Pareja de Dobles',
        'Estado de Pago',
        'Arancel ($)',
        'Disponibilidad / Restricciones Horarias'
    ];

    const rows = players.map((p, idx) => {
        const profile = p.player_id ? allProfilesMap[p.player_id] : null;
        const formattedName = formatPlayerName(p.name || p.player_name);
        const dni = profile?.dni || (p as any).dni || 'No registrado';
        const phone = profile?.phone || (p as any).phone || 'No registrado';
        const category = p.category || tournament.category || '-';
        const gender = tournament.gender || 'Caballeros';
        const modality = tournament.type === 'doubles' ? 'Dobles' : 'Singles';
        const partner = p.partner_name ? formatPlayerName(p.partner_name) : '-';
        const payment = p.payment_status === 'paid' ? 'Pagado' : 'Pendiente';
        const fee = p.fee_amount !== undefined ? `$${p.fee_amount}` : (tournament.registration_price ? `$${tournament.registration_price}` : '$0');
        const availability = p.availability_notes || p.time_restrictions || 'Sin restricciones informadas';

        return [
            escapeCSV(idx + 1),
            escapeCSV(formattedName),
            escapeCSV(dni),
            escapeCSV(phone),
            escapeCSV(category),
            escapeCSV(gender),
            escapeCSV(modality),
            escapeCSV(partner),
            escapeCSV(payment),
            escapeCSV(fee),
            escapeCSV(availability)
        ].join(';');
    });

    const csvContent = [headers.map(escapeCSV).join(';'), ...rows].join('\r\n');
    const sanitizedTitle = (tournament.name || 'Torneo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Inscriptos_${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, filename);
}

export function exportTransactionsToCSV(
    institutionName: string,
    transactions: Transaction[],
    stats?: { total_income?: number; total_expenses?: number; net_income?: number }
) {
    const headers = [
        '#',
        'Fecha',
        'Hora',
        'Tipo',
        'Categoría',
        'Descripción / Concepto',
        'Método de Pago',
        'Monto ($)',
        'Usuario / Socio'
    ];

    const getPaymentLabel = (method: string) => {
        switch (method) {
            case 'cash': return 'Efectivo';
            case 'transfer': return 'Transferencia';
            case 'mercadopago': return 'Mercado Pago';
            default: return method;
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'booking': return 'Reserva de Cancha';
            case 'tournament_fee': return 'Inscripción a Torneo';
            case 'product_sale': return 'Cantina / Buffet / Pelotas';
            case 'maintenance': return 'Mantenimiento / Operativo';
            default: return 'Otro';
        }
    };

    let totalIngresos = 0;
    let totalEgresos = 0;

    const rows = transactions.map((t, idx) => {
        const d = new Date(t.date);
        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('es-AR') : t.date;
        const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-';
        const typeStr = t.type === 'income' ? 'Ingreso' : 'Egreso';
        const catStr = getCategoryLabel(t.category);
        const methodStr = getPaymentLabel(t.payment_method);
        const amountNum = Number(t.amount) || 0;

        if (t.type === 'income') totalIngresos += amountNum;
        else totalEgresos += amountNum;

        return [
            escapeCSV(idx + 1),
            escapeCSV(dateStr),
            escapeCSV(timeStr),
            escapeCSV(typeStr),
            escapeCSV(catStr),
            escapeCSV(t.description),
            escapeCSV(methodStr),
            escapeCSV(t.type === 'expense' ? `-${amountNum}` : `${amountNum}`),
            escapeCSV(t.user_name || 'Particular / Sede')
        ].join(';');
    });

    const netIncome = (stats?.net_income !== undefined) ? stats.net_income : (totalIngresos - totalEgresos);

    const summaryLines = [
        '',
        [escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV('RESUMEN DE CAJA:'), escapeCSV('Total Ingresos'), escapeCSV(`$${stats?.total_income ?? totalIngresos}`), escapeCSV('')].join(';'),
        [escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV('Total Egresos'), escapeCSV(`-$${stats?.total_expenses ?? totalEgresos}`), escapeCSV('')].join(';'),
        [escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV(''), escapeCSV('BALANCE NETO'), escapeCSV(`$${netIncome}`), escapeCSV('')].join(';')
    ];

    const csvContent = [headers.map(escapeCSV).join(';'), ...rows, ...summaryLines].join('\r\n');
    const sanitizedInst = (institutionName || 'Club').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Arqueo_Caja_${sanitizedInst}_${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvContent, filename);
}
