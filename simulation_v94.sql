-- SIMULACION DE DATOS PROFESIONALES V94 (FINAL SCHEMA COMPLIANT)
-- Torneo de Tenis LYNX

-- 1. JUGADORES (Profiles) - Reutilizando IDs existentes de la base de datos
UPDATE profiles SET name = 'Carlos', lastname = 'Alcaraz', email = 'carlos@demo.com', category = 'A', is_approved = true, tournaments_won = 2, matches_won = 15 WHERE id = 'd0000000-0000-0000-0002-000000000001';
UPDATE profiles SET name = 'Jannik', lastname = 'Sinner', email = 'jannik@demo.com', category = 'A', is_approved = true, tournaments_won = 1, matches_won = 14 WHERE id = 'd0000000-0000-0000-0002-000000000002';
UPDATE profiles SET name = 'Novak', lastname = 'Djokovic', email = 'nole@demo.com', category = 'A', is_approved = true, tournaments_won = 5, matches_won = 50 WHERE id = 'd0000000-0000-0000-0002-000000000003';
UPDATE profiles SET name = 'Rafael', lastname = 'Nadal', email = 'rafa@demo.com', category = 'A', is_approved = true, tournaments_won = 3, matches_won = 40 WHERE id = 'd0000000-0000-0000-0002-000000000004';
UPDATE profiles SET name = 'Paula', lastname = 'Badosa', email = 'paula@demo.com', category = 'A', is_approved = true, tournaments_won = 1, matches_won = 18 WHERE id = 'd0000000-0000-0000-0002-000000000005';
UPDATE profiles SET name = 'Stan', lastname = 'Wawrinka', email = 'stan@demo.com', category = 'A', is_approved = true, tournaments_won = 0, matches_won = 10 WHERE id = 'd0000000-0000-0000-0002-000000000008';

-- 3. TORNEOS
INSERT INTO public.tournaments (id, name, type, category, start_date, status, institution_id, description)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Gran Slam CEBERPA 2023', 'singles', 'A', '2023-11-01', 'finished', (SELECT id FROM public.institutions LIMIT 1), 'Torneo profesional fin de año.'),
('22222222-2222-2222-2222-222222222222', 'Copa de Verano 2024', 'singles', 'A', '2023-12-20', 'active', (SELECT id FROM public.institutions LIMIT 1), 'Circuito veraniego.')
ON CONFLICT (id) DO NOTHING;

-- 4. INSCRIPCIONES
INSERT INTO public.tournament_players (tournament_id, player_id, player_name, category)
VALUES 
('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'A'),
('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'A'),
('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'A'),
('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'A'),
('22222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0002-000000000005', 'Paula Badosa', 'A'),
('22222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0002-000000000008', 'Stan Wawrinka', 'A')
ON CONFLICT (tournament_id, player_id) DO NOTHING;

-- 5. PARTIDOS
INSERT INTO public.matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at)
VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000004', 'Carlos Alcaraz', 'Rafael Nadal', '[{"p1":6, "p2":4}, {"p1":7, "p2":5}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Semifinal', '2023-11-13 14:00:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0002-000000000003', 'd0000000-0000-0000-0002-000000000002', 'Novak Djokovic', 'Jannik Sinner', '[{"p1":6, "p2":3}, {"p1":6, "p2":2}]', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'confirmed', 'Semifinal', '2023-11-13 16:00:00')
ON CONFLICT (id) DO NOTHING;

-- 6. RESERVAS
INSERT INTO public.bookings (institution_id, user_id, court_name, date, start_time, end_time, total_price, status)
VALUES 
((SELECT id FROM public.institutions LIMIT 1), 'd0000000-0000-0000-0002-000000000001', 'Cancha 1', CURRENT_DATE + INTERVAL '1 day', '10:00', '11:30', 2500, 'confirmed'),
((SELECT id FROM public.institutions LIMIT 1), 'd0000000-0000-0000-0002-000000000002', 'Cancha 2', CURRENT_DATE + INTERVAL '1 day', '11:00', '12:30', 2500, 'pending')
ON CONFLICT DO NOTHING;
