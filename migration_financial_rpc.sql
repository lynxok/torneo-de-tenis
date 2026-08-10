-- RPC for Financial Summary (Aggregated Server-Side)
-- Matches the expected interface of the frontend reports

CREATE OR REPLACE FUNCTION get_financial_summary(
    institution_id UUID DEFAULT NULL,
    period_type TEXT DEFAULT 'month' -- 'day', 'week', 'month'
)
RETURNS JSON AS $$
DECLARE
    start_date TIMESTAMP;
    txs RECORD;
    
    total_inc NUMERIC := 0;
    total_exp NUMERIC := 0;
    net_inc NUMERIC := 0;
    margin NUMERIC := 0;
    
    inc_bookings NUMERIC := 0;
    inc_tournaments NUMERIC := 0;
    inc_shop NUMERIC := 0;
    
    json_payment_methods JSON;
    json_revenue_sources JSON;
    json_chart_data JSON;
    
BEGIN
    -- 1. Determine Date Range
    IF period_type = 'day' THEN
        start_date := NOW() - INTERVAL '1 day';
    ELSIF period_type = 'week' THEN
        start_date := NOW() - INTERVAL '1 week';
    ELSE
        start_date := NOW() - INTERVAL '1 month';
    END IF;

    -- 2. Calculate Totals (using temporary table or just variables)
    -- We can use standard SQL aggregation
    
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'booking' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'tournament_fee' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'shop' THEN amount ELSE 0 END), 0)
    INTO 
        total_inc, total_exp, inc_bookings, inc_tournaments, inc_shop
    FROM transactions
    WHERE date >= start_date
    AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id);

    net_inc := total_inc - total_exp;
    IF total_inc > 0 THEN
        margin := ROUND(((total_inc - total_exp) / total_inc) * 100);
    ELSE
        margin := 0;
    END IF;

    -- 3. Payment Methods Breakdown
    SELECT json_agg(t) INTO json_payment_methods FROM (
        SELECT 
            payment_method as name, 
            COALESCE(SUM(amount), 0) as value,
            CASE 
                WHEN payment_method = 'cash' THEN '#22c55e'
                WHEN payment_method = 'transfer' THEN '#3b82f6'
                WHEN payment_method = 'mercadopago' THEN '#009ee3'
                ELSE '#94a3b8'
            END as color
        FROM transactions
        WHERE date >= start_date
        AND type = 'income'
        AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id)
        GROUP BY payment_method
    ) t;

    -- 4. Revenue Sources Breakdown
    json_revenue_sources := json_build_array(
        json_build_object('name', 'Alquiler Canchas', 'value', inc_bookings, 'color', '#38bdf8'),
        json_build_object('name', 'Inscripción Torneos', 'value', inc_tournaments, 'color', '#f59e0b'),
        json_build_object('name', 'Tienda', 'value', inc_shop, 'color', '#10b981')
    );
    
    -- 5. Chart Data (Daily Trend)
    -- Simplified: Accessing data from last 7 entries or grouped by day
    -- For real robust charts we need generate_series, keeping it simple for now
    SELECT json_agg(d) INTO json_chart_data FROM (
        SELECT 
            to_char(date, 'Dy') as day,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE date >= start_date
        AND (institution_id IS NULL OR transactions.institution_id = get_financial_summary.institution_id)
        GROUP BY to_char(date, 'Dy'), date::date
        ORDER BY date::date ASC
    ) d;

    -- Return JSON Object
    RETURN json_build_object(
        'total_income', total_inc,
        'total_expenses', total_exp,
        'net_income', net_inc,
        'profit_margin', margin,
        'income_bookings', inc_bookings,
        'income_tournaments', inc_tournaments,
        'income_shop', inc_shop,
        'pending_income', 0,
        'occupancy_rate', 0,
        'payment_methods', COALESCE(json_payment_methods, '[]'::json),
        'revenue_sources', json_revenue_sources,
        'chart_data', COALESCE(json_chart_data, '[]'::json),
        'peak_hours', '[]'::json,
        'top_bookers', '[]'::json
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
