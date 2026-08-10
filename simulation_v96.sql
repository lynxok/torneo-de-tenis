
-- 1. CLEANUP
DELETE FROM matches;
DELETE FROM tournament_players;
DELETE FROM tournaments;

-- 2. TOURNAMENTS
INSERT INTO public.tournaments (id, name, type, category, start_date, status, institution_id, description, champion_name, surface, groups)
VALUES 
('d0000000-0000-0000-0001-000000000001', 'Masters de Otoño CEBERPA 2023', 'singles', 'A', '2023-05-10', 'finished', 'dba2e0dd-9f30-4353-bd6d-261daab45c76', 'Torneo clausura de temporada.', 'Carlos Alcaraz', 'Polvo de Ladrillo', 
 '[
    {
        "players": [
            {"id": "d0000000-0000-0000-0002-000000000001", "name": "Carlos Alcaraz"},
            {"id": "d0000000-0000-0000-0002-000000000003", "name": "Novak Djokovic"},
            {"id": "d0000000-0000-0000-0002-000000000005", "name": "Casper Ruud"},
            {"id": "d0000000-0000-0000-0002-000000000006", "name": "Stefanos Tsitsipas"}
        ]
    },
    {
        "players": [
            {"id": "d0000000-0000-0000-0002-000000000004", "name": "Rafael Nadal"},
            {"id": "d0000000-0000-0000-0002-000000000002", "name": "Jannik Sinner"},
            {"id": "d0000000-0000-0000-0002-000000000007", "name": "Alexander Zverev"},
            {"id": "d0000000-0000-0000-0002-000000000008", "name": "Daniil Medvedev"}
        ]
    }
 ]'),
('d0000000-0000-0000-0001-000000000002', 'Copa Verano LYNX 2024', 'singles', 'A', '2023-12-25', 'active', 'dba2e0dd-9f30-4353-bd6d-261daab45c76', 'El evento más grande del verano.', NULL, 'Cemento', NULL),
('d0000000-0000-0000-0001-000000000003', 'Torneo de Pascuas 2024', 'singles', 'B', '2024-04-01', 'draft', 'dba2e0dd-9f30-4353-bd6d-261daab45c76', 'Preparatorio para el ranking nacional.', NULL, 'Polvo de Ladrillo', NULL),
('d0000000-0000-0000-0001-000000000004', 'Grand Slam BEN GU 2023', 'singles', 'A', '2023-09-15', 'finished', '17777351-f075-4e2f-898b-6fbbcc1a3305', 'Torneo internacional con invitados.', 'Novak Djokovic', 'Césped', NULL),
('d0000000-0000-0000-0001-000000000005', 'Challenge BEN GU Pro', 'singles', 'A', '2024-01-05', 'active', '17777351-f075-4e2f-898b-6fbbcc1a3305', 'Abierto para todas las categorías.', NULL, 'Cemento', NULL);

-- 3. INSCRIPTIONS
INSERT INTO tournament_players (tournament_id, player_id, player_name, category)
VALUES 
-- Zone 1
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000005', 'Casper Ruud', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000006', 'Stefanos Tsitsipas', 'A'),
-- Zone 2
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000007', 'Alexander Zverev', 'A'),
('d0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000008', 'Daniil Medvedev', 'A'),
-- Others
('d0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'A'),
('d0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'A'),
('d0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'A'),
('d0000000-0000-0000-0001-000000000002', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'A'),
('d0000000-0000-0000-0001-000000000002', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'A');

-- 4. MATCHES
-- MASTERS CEBERPA 2023
-- GROUP 1: Alcaraz (1st), Djokovic (2nd)
INSERT INTO matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at, group_number)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000003', 'Carlos Alcaraz', 'Novak Djokovic', '[{"p1":6, "p2":4}, {"p1":6, "p2":3}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Fase de Grupos', '2023-05-10 10:00:00', 1),
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000005', 'd0000000-0000-0000-0002-000000000006', 'Casper Ruud', 'Stefanos Tsitsipas', '[{"p1":6, "p2":4}, {"p1":3, "p2":6}, {"p1":7, "p2":6, "tbPoints": {"p1":7, "p2":4}}]', 'd0000000-0000-0000-0002-000000000005', 'Casper Ruud', 'confirmed', 'Fase de Grupos', '2023-05-10 12:00:00', 1),
('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000005', 'Carlos Alcaraz', 'Casper Ruud', '[{"p1":6, "p2":2}, {"p1":6, "p2":1}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Fase de Grupos', '2023-05-12 10:00:00', 1),
('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000003', 'd0000000-0000-0000-0002-000000000006', 'Novak Djokovic', 'Stefanos Tsitsipas', '[{"p1":6, "p2":2}, {"p1":6, "p2":2}]', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'confirmed', 'Fase de Grupos', '2023-05-12 12:00:00', 1),
('a0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000006', 'Carlos Alcaraz', 'Stefanos Tsitsipas', '[{"p1":6, "p2":3}, {"p1":6, "p2":4}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Fase de Grupos', '2023-05-13 14:00:00', 1),
('a0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000003', 'd0000000-0000-0000-0002-000000000005', 'Novak Djokovic', 'Casper Ruud', '[{"p1":7, "p2":5}, {"p1":6, "p2":3}]', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'confirmed', 'Fase de Grupos', '2023-05-13 16:00:00', 1);

-- GROUP 2: Nadal (1st), Sinner (2nd)
INSERT INTO matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at, group_number)
VALUES 
('a0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000004', 'd0000000-0000-0000-0002-000000000002', 'Rafael Nadal', 'Jannik Sinner', '[{"p1":7, "p2":5}, {"p1":7, "p2":6}]', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'confirmed', 'Fase de Grupos', '2023-05-10 14:00:00', 2),
('a0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000007', 'd0000000-0000-0000-0002-000000000008', 'Alexander Zverev', 'Daniil Medvedev', '[{"p1":6, "p2":4}, {"p1":3, "p2":6}, {"p1":6, "p2":4}]', 'd0000000-0000-0000-0002-000000000007', 'Alexander Zverev', 'confirmed', 'Fase de Grupos', '2023-05-10 16:00:00', 2),
('a0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000004', 'd0000000-0000-0000-0002-000000000007', 'Rafael Nadal', 'Alexander Zverev', '[{"p1":6, "p2":3}, {"p1":6, "p2":3}]', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'confirmed', 'Fase de Grupos', '2023-05-12 14:00:00', 2),
('a0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000002', 'd0000000-0000-0000-0002-000000000008', 'Jannik Sinner', 'Daniil Medvedev', '[{"p1":6, "p2":2}, {"p1":6, "p2":4}]', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'confirmed', 'Fase de Grupos', '2023-05-12 16:00:00', 2);


-- SEMIS
-- Alcaraz (Z1#1) vs Sinner (Z2#2) -> Alcaraz
INSERT INTO matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at, group_number)
VALUES 
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000002', 'Carlos Alcaraz', 'Jannik Sinner', '[{"p1":6, "p2":2}, {"p1":6, "p2":1}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Semifinal', '2023-05-14 10:00:00', NULL),
-- Nadal (Z2#1) vs Djokovic (Z1#2) -> Nadal
('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000004', 'd0000000-0000-0000-0002-000000000003', 'Rafael Nadal', 'Novak Djokovic', '[{"p1":7, "p2":6, "tbPoints": {"p1":7, "p2":5}}, {"p1":3, "p2":6}, {"p1":6, "p2":4}]', 'd0000000-0000-0000-0002-000000000004', 'Rafael Nadal', 'confirmed', 'Semifinal', '2023-05-14 12:00:00', NULL);

-- FINAL
INSERT INTO matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at, group_number)
VALUES 
('a0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000004', 'Carlos Alcaraz', 'Rafael Nadal', '[{"p1":6, "p2":4}, {"p1":7, "p2":6, "tbPoints": {"p1":8, "p2":6}}]', 'd0000000-0000-0000-0002-000000000001', 'Carlos Alcaraz', 'confirmed', 'Final', '2023-05-15 18:00:00', NULL);


-- OTHERS
INSERT INTO matches (id, tournament_id, player1_id, player2_id, player1_name, player2_name, score, winner_id, winner_name, scheduling_status, round, played_at, group_number)
VALUES 
('a0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0002-000000000003', 'd0000000-0000-0000-0002-000000000002', 'Novak Djokovic', 'Jannik Sinner', '[{"p1":7, "p2":5}, {"p1":6, "p2":4}]', 'd0000000-0000-0000-0002-000000000003', 'Novak Djokovic', 'confirmed', 'Final', '2023-09-20 19:30:00', NULL),
('a0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0002-000000000004', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'Rafael Nadal', '[{"p1":6, "p2":1}, {"p1":6, "p2":0}]', 'd0000000-0000-0000-0002-000000000002', 'Jannik Sinner', 'confirmed', 'Semifinal', '2023-09-18 15:00:00', NULL),
('a0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0001-000000000002', 'd0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000002', 'Carlos Alcaraz', 'Jannik Sinner', NULL, NULL, NULL, 'confirmed', 'Ronda de 16', NULL, NULL);
