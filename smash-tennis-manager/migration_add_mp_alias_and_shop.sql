-- =========================================================================
-- MIGRATION: Soporte para Mercado Pago Alias/CVU por Club, Tienda & Partidos
-- =========================================================================

-- 1. Agregar campos de cobro por transferencia y Alias a la tabla 'institutions'
ALTER TABLE IF EXISTS public.institutions 
ADD COLUMN IF NOT EXISTS alias_mp TEXT,
ADD COLUMN IF NOT EXISTS cvu_mp TEXT,
ADD COLUMN IF NOT EXISTS titular_mp TEXT;

-- 2. Asegurar campos en 'matchmaking_posts' para cupos múltiples y jugadores unidos
ALTER TABLE IF EXISTS public.matchmaking_posts
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS joined_players JSONB DEFAULT '[]'::jsonb;

-- 3. Tabla de Productos de la Tienda / Pro-Shop & Buffet por Club
CREATE TABLE IF NOT EXISTS public.club_products (
    id TEXT PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'balls', -- 'balls' | 'accessories' | 'rentals' | 'buffet' | 'apparel'
    price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    stock INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Pedidos de la Tienda / Buffet
CREATE TABLE IF NOT EXISTS public.store_orders (
    id TEXT PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    institution_name TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'transfer_mp', -- 'transfer_mp' | 'cash'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'verified' | 'delivered' | 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS y políticas
ALTER TABLE public.club_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read club_products" ON public.club_products;
CREATE POLICY "Public read club_products" ON public.club_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write club_products" ON public.club_products;
CREATE POLICY "Admin write club_products" ON public.club_products FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read store_orders" ON public.store_orders;
CREATE POLICY "Public read store_orders" ON public.store_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write store_orders" ON public.store_orders;
CREATE POLICY "Admin write store_orders" ON public.store_orders FOR ALL USING (true);
