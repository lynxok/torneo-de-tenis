// Supabase Configuration for Tennis Tournament Manager
// =====================================================

const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

// Initialize Supabase Client
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// DATABASE SERVICE - Handles all Supabase operations
// =====================================================

const db = {
    // ==================== AUTH ====================
    auth: {
        // Get current user
        async getCurrentUser() {
            const { data: { user } } = await sbClient.auth.getUser();
            if (!user) return null;

            // Get profile with role
            const { data: profile } = await sbClient
                .from('profiles')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .eq('id', user.id)
                .single();

            return profile ? { ...user, ...profile, institution: profile.institutions?.name } : user;
        },

        // Sign up new user
        async signUp(email, password, metadata = {}) {
            const { data, error } = await sbClient.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            if (error) throw error;
            return data;
        },

        // Sign in
        async signIn(email, password) {
            const { data, error } = await sbClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        },

        // Sign out
        async signOut() {
            const { error } = await sbClient.auth.signOut();
            if (error) throw error;
        },

        // Listen to auth changes
        onAuthStateChange(callback) {
            return sbClient.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
        },

        // Update user profile
        async updateProfile(userId, updates) {
            const { data, error } = await sbClient
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // Admin update password (requires RPC function 'admin_update_password')
        async adminUpdatePassword(userId, newPassword) {
            const { error } = await sbClient.rpc('admin_update_password', {
                target_user_id: userId,
                new_password: newPassword
            });
            if (error) throw error;
        }
    },

    // ==================== CATEGORIES ====================
    categories: {
        async getAll() {
            const { data, error } = await sbClient
                .from('categories')
                .select('*')
                .order('level', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        async create(categoryData) {
            const { data, error } = await sbClient
                .from('categories')
                .insert([categoryData])
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async delete(id) {
            const { error } = await sbClient
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ==================== INSTITUTIONS ====================
    institutions: {
        async getAll() {
            console.log('db.institutions.getAll: START (RAW FETCH)');
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/institutions?order=name`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                const data = await response.json();
                console.log('db.institutions.getAll: SUCCESS', data.length);
                return data || [];
            } catch (err) {
                console.error('db.institutions.getAll: ERROR', err);
                throw err;
            }
        },

        async create(institution) {
            const { data, error } = await sbClient
                .from('institutions')
                .insert(institution)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('institutions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async delete(id) {
            const { error } = await sbClient
                .from('institutions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },

        async getMPCredentials(id) {
            const { data, error } = await sbClient
                .from('institutions')
                .select('mp_access_token')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ==================== USERS/PROFILES ====================
    users: {
        async getAll() {
            const { data, error } = await sbClient
                .from('profiles')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .order('name');
            if (error) throw error;
            return (data || []).map(u => ({
                ...u,
                institution: u.institutions?.name
            }));
        },

        async getByRole(role) {
            const { data, error } = await sbClient
                .from('profiles')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .eq('role', role)
                .order('name');
            if (error) throw error;
            return data || [];
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data?.[0];
        },

        async delete(id) {
            // Note: This only deletes the profile, not the auth user
            const { error } = await sbClient
                .from('profiles')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },

        // Get pending (unapproved) players for a specific institution
        async getPendingByInstitution(institutionId) {
            const { data, error } = await sbClient
                .from('profiles')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .eq('institution_id', institutionId)
                .eq('role', 'player')
                .eq('is_approved', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Approve a user
        async approveUser(userId, category) {
            const updates = { is_approved: true };
            if (category) updates.category = category;

            const { data, error } = await sbClient
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                console.warn('Update returned 0 rows. Check RLS policies.');
                // Optionally throw error, or just return null
                // throw new Error('No se pudo aprobar. Verifique permisos.');
            }
            return data?.[0];
        },

        // Reject (delete) a user
        async rejectUser(userId) {
            // Delete from profiles table
            const { error } = await sbClient
                .from('profiles')
                .delete()
                .eq('id', userId);
            if (error) throw error;
        }
    },

    // ==================== TOURNAMENTS ====================
    tournaments: {
        async getAll() {
            const { data, error } = await sbClient
                .from('tournaments')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        async getActive() {
            console.log('db.tournaments.getActive: START (RAW FETCH)');
            try {
                const select = '*,institutions(name,city,province,country,latitude,longitude)';
                const url = `${SUPABASE_URL}/rest/v1/tournaments?select=${encodeURIComponent(select)}&status=eq.active&order=start_date`;

                const response = await fetch(url, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                console.log('db.tournaments.getActive: Response status:', response.status);
                if (!response.ok) {
                    const err = await response.text();
                    console.error('db.tournaments.getActive: FETCH ERROR', response.status, err);
                    return [];
                }

                const data = await response.json();
                console.log('db.tournaments.getActive: SUCCESS', data.length);
                return data || [];
            } catch (err) {
                console.error('db.tournaments.getActive: ERROR', err);
                return [];
            }
        },

        async getById(id) {
            console.log('db.tournaments.getById: START (RAW FETCH)', id);
            try {
                const select = '*,institutions(name,city,province,country,latitude,longitude)';
                const url = `${SUPABASE_URL}/rest/v1/tournaments?select=${encodeURIComponent(select)}&id=eq.${id}&limit=1`;

                const response = await fetch(url, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    console.error('db.tournaments.getById: FETCH ERROR', response.status, await response.text());
                    return null;
                }

                const data = await response.json();
                console.log('db.tournaments.getById: SUCCESS', data?.[0]?.name);
                return data?.[0] || null;
            } catch (err) {
                console.error('db.tournaments.getById: EXCEPTION', err);
                return null;
            }
        },

        async getFinished() {
            const { data, error } = await sbClient
                .from('tournaments')
                .select('*, institutions(name, city, province, country, latitude, longitude)')
                .eq('status', 'finished')
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        async getById(id) {
            const { data, error } = await sbClient
                .from('tournaments')
                .select('*, institutions(name, city, province, country, latitude, longitude), tournament_players(*), matches(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        },

        async create(tournament) {
            const { data, error } = await sbClient
                .from('tournaments')
                .insert(tournament)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('tournaments')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async delete(id) {
            const { error } = await sbClient
                .from('tournaments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // ==================== TOURNAMENT PLAYERS ====================
    players: {
        async enroll(tournamentId, playerId, playerName, category, paymentStatus = 'pending') {
            const { data, error } = await sbClient
                .from('tournament_players')
                .insert({
                    tournament_id: tournamentId,
                    player_id: playerId,
                    player_name: playerName,
                    category: category,
                    payment_status: paymentStatus
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async getByTournament(tournamentId) {
            const { data, error } = await sbClient
                .from('tournament_players')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('enrolled_at');
            if (error) throw error;
            return data || [];
        },

        async getUserEnrollments(userId) {
            const { data, error } = await sbClient
                .from('tournament_players')
                .select('tournament_id')
                .eq('player_id', userId);
            if (error) throw error;
            return data || [];
        },

        async updateGroup(playerId, tournamentId, groupNumber) {
            const { data, error } = await sbClient
                .from('tournament_players')
                .update({ group_number: groupNumber })
                .eq('tournament_id', tournamentId)
                .eq('player_id', playerId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async remove(tournamentId, playerId) {
            const { error } = await sbClient
                .from('tournament_players')
                .delete()
                .eq('tournament_id', tournamentId)
                .eq('player_id', playerId);
            if (error) throw error;
        }
    },

    // ==================== MATCHES ====================
    matches: {
        async create(match) {
            const { data, error } = await sbClient
                .from('matches')
                .insert(match)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async createMany(matches) {
            const { data, error } = await sbClient
                .from('matches')
                .insert(matches)
                .select();
            if (error) throw error;
            return data;
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('matches')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },


        async getByTournament(tournamentId) {
            const { data, error } = await sbClient
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at');
            if (error) throw error;
            return data || [];
        },

        // Get matches with scheduling info (bypasses RLS using RPC)
        async getByTournamentWithScheduling(tournamentId) {
            const { data, error } = await sbClient.rpc('get_matches_by_tournament', {
                p_tournament_id: tournamentId
            });
            if (error) throw error;
            return data || [];
        },


        async getByPlayer(playerId) {
            const { data, error } = await sbClient
                .from('matches')
                .select('*, tournaments(name, institutions(name))')
                .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },

        // Get completed matches between two players
        async getBetweenPlayers(player1Id, player2Id) {
            // We want matches where (P1=A AND P2=B) OR (P1=B AND P2=A)
            const { data, error } = await sbClient
                .from('matches')
                .select('*, tournaments(name)')
                .or(`and(player1_id.eq.${player1Id},player2_id.eq.${player2Id}),and(player1_id.eq.${player2Id},player2_id.eq.${player1Id})`)
                // .eq('group_id', 'group') // Removing invalid column filter. Logic handles filtering by valid matches anyway
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },


        async getById(matchId) {
            const { data, error } = await sbClient
                .from('matches')
                .select('*, tournaments(name, institution_id)')
                .eq('id', matchId)
                .single();

            if (error) throw error;
            return data;
        },

        async createPlayoffMatches(matches) {
            const { data, error } = await sbClient
                .from('matches')
                .insert(matches)
                .select();

            if (error) {
                console.error('Error creating playoff matches:', error);
                throw error;
            }
            return data;
        },

        async updateScore(matchId, score, winnerId, winnerName) {
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    score: score,
                    winner_id: winnerId,
                    winner_name: winnerName,
                    played_at: new Date().toISOString()
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // Scheduling Methods
        async proposeSchedule(matchId, proposalData) {
            // proposalData: { date, time, court, proposed_by, message }
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    scheduling_status: 'proposed',
                    proposal_data: proposalData
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async confirmSchedule(matchId, scheduledAt, courtSlotId) {
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    scheduling_status: 'confirmed',
                    scheduled_at: scheduledAt,
                    court_slot_id: courtSlotId
                    // proposal_data can be kept for history or cleared
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async rejectSchedule(matchId) {
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    scheduling_status: null, // Reset to open
                    proposal_data: null // Clear proposal
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // Reset scheduling for matches that weren't played (for organizers)
        async resetScheduling(matchId) {
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    scheduling_status: null, // Reset to null (open/pending isn't a valid enum value)
                    scheduled_at: null,
                    court_slot_id: null,
                    proposal_data: null // Clear old proposal
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },


        async delete(matchId) {
            const { error } = await sbClient
                .from('matches')
                .delete()
                .eq('id', matchId);
            if (error) throw error;
        },

        async deleteByTournament(tournamentId) {
            const { error } = await sbClient
                .from('matches')
                .delete()
                .eq('tournament_id', tournamentId);
            if (error) throw error;
        },

        async isUserInMatch(matchId, userId) {
            // 1. Check direct participant (Singles)
            const { data: match, error } = await sbClient
                .from('matches')
                .select('player1_id, player2_id, tournament_id')
                .eq('id', matchId)
                .single();

            if (error || !match) return false;

            if (match.player1_id === userId || match.player2_id === userId) return true;

            // 2. Check if user is associated via tournament_players (for doubles or different ID structures)
            const { data: tp } = await sbClient
                .from('tournament_players')
                .select('player_id, id')
                .or(`id.eq.${match.player1_id},id.eq.${match.player2_id}`)
                .eq('player_id', userId);

            if (tp && tp.length > 0) return true;

            return false;
        },

        // Get confirmed matches for an institution (for Agenda view)
        async getConfirmedByInstitution(institutionId, startDate, endDate) {
            // We need to join with court_slots to filter by institution
            const { data, error } = await sbClient
                .from('matches')
                .select('*, court_slots!inner(*), tournaments(name)')
                .eq('scheduling_status', 'confirmed')
                .eq('court_slots.institution_id', institutionId)
                .gte('scheduled_at', startDate)
                .lte('scheduled_at', endDate)
                .order('scheduled_at');

            if (error) throw error;
            return data || [];
        },

        // Cancel a schedule (Admin/Organizer power)
        async cancelSchedule(matchId) {
            const { data, error } = await sbClient
                .from('matches')
                .update({
                    scheduling_status: null,
                    scheduled_at: null,
                    court_slot_id: null,
                    proposal_data: null
                })
                .eq('id', matchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ==================== BOOKINGS (Private Reservations) ====================
    bookings: {
        async create(bookingData) {
            const { data, error } = await sbClient
                .from('bookings')
                .insert(bookingData)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async getByUser(userId) {
            console.log('db.bookings.getByUser: START (sbClient)');
            try {
                const { data, error } = await sbClient
                    .from('bookings')
                    .select('*,institutions(name,city,province,country,latitude,longitude)')
                    .eq('user_id', userId)
                    .order('date', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('db.bookings.getByUser: EXCEPTION', err);
                return [];
            }
        },

        async getByInstitution(institutionId, statusFilter = null) {
            console.log('db.bookings.getByInstitution: START (sbClient)');
            try {
                let query = sbClient
                    .from('bookings')
                    .select('*,profiles:user_id(name,lastname,email,category)')
                    .eq('institution_id', institutionId)
                    .order('created_at', { ascending: false });

                if (statusFilter) {
                    query = query.eq('status', statusFilter);
                }

                const { data, error } = await query;

                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('db.bookings.getByInstitution: EXCEPTION', err);
                return [];
            }
        },

        async updateStatus(id, newStatus) {
            const { data, error } = await sbClient
                .from('bookings')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // For calendar view: get accepted bookings in a range
        async getConfirmedRange(institutionId, startDate, endDate) {
            const { data, error } = await sbClient
                .from('bookings')
                .select('*')
                .eq('institution_id', institutionId)
                .neq('status', 'rejected')
                .neq('status', 'cancelled')
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;
            return data || [];
        }
    },

    // ==================== COURT SLOTS ====================
    courtSlots: {
        async getByInstitution(institutionId) {
            const { data, error } = await sbClient
                .from('court_slots')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('is_active', true)
                .order('court_name')
                .order('day_of_week')
                .order('start_time');
            if (error) throw error;
            return data || [];
        },

        async create(slotData) {
            const { data, error } = await sbClient
                .from('court_slots')
                .insert(slotData)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async update(id, updates) {
            const { data, error } = await sbClient
                .from('court_slots')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        async delete(id) {
            const { error } = await sbClient
                .from('court_slots')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
        },

        // Get available time slots for a specific date
        async getAvailableSlots(institutionId, date, matchDurationMinutes) {
            console.log('db.courtSlots.getAvailableSlots: START (RAW FETCH)');
            try {
                // Fix: Parse YYYY-MM-DD explicitly to avoid UTC conversion issues
                // new Date('2026-01-06') is UTC, which might be previous day in local time
                const [y, m, d] = date.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay();

                // 1. Get Slots
                const { data: slots, error: slotsError } = await sbClient
                    .from('court_slots')
                    .select('*')
                    .eq('institution_id', institutionId)
                    .eq('day_of_week', dayOfWeek)
                    .eq('is_active', true)
                    .order('court_name')
                    .order('day_of_week')
                    .order('start_time');

                if (slotsError) throw slotsError;

                if (!slots || slots.length === 0) return [];

                // 2. Get Booked Matches (Confirmed)
                const dateStart = new Date(date);
                dateStart.setHours(0, 0, 0, 0);
                const dateEnd = new Date(date);
                dateEnd.setHours(23, 59, 59, 999);

                const { data: confirmedMatches, error: matchesError } = await sbClient
                    .from('matches')
                    .select('scheduled_at,court_slot_id,proposal_data')
                    .eq('scheduling_status', 'confirmed')
                    .gte('scheduled_at', dateStart.toISOString())
                    .lte('scheduled_at', dateEnd.toISOString());

                if (matchesError) throw matchesError;

                // 3. Get Proposed Matches (using RPC)
                const { data: proposedForDate, error: rpcError } = await sbClient
                    .rpc('get_proposed_matches_for_date', { target_date: date });

                if (rpcError) throw rpcError;

                // 4. Get Private Bookings
                const { data: bookings, error: bookingsError } = await sbClient
                    .from('bookings')
                    .select('start_time,end_time,court_name,court_slot_id')
                    .eq('institution_id', institutionId)
                    .eq('date', date)
                    .neq('status', 'rejected')
                    .neq('status', 'cancelled');

                if (bookingsError) throw bookingsError;

                // 4. Calculate available sub-slots
                const available = [];

                slots.forEach(slot => {
                    // Parse start/end times
                    const [startHour, startMin] = slot.start_time.split(':').map(Number);
                    const [endHour, endMin] = slot.end_time.split(':').map(Number);

                    const slotStartMinutes = startHour * 60 + startMin;
                    const slotEndMinutes = endHour * 60 + endMin;

                    // Generate possible time blocks
                    for (let time = slotStartMinutes; time + matchDurationMinutes <= slotEndMinutes; time += 30) {
                        const blockStart = `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
                        const blockEnd = `${Math.floor((time + matchDurationMinutes) / 60).toString().padStart(2, '0')}:${((time + matchDurationMinutes) % 60).toString().padStart(2, '0')}`;

                        // Check if this block conflicts with any CONFIRMED match
                        const isBookedConfirmed = confirmedMatches?.some(m => {
                            // Check by court_slot_id if available
                            if (m.court_slot_id && m.court_slot_id !== slot.id) return false;
                            // Also check by court_name from proposal_data
                            if (!m.court_slot_id && m.proposal_data?.court_name && m.proposal_data.court_name !== slot.court_name) return false;

                            const matchTime = new Date(m.scheduled_at);
                            const matchHour = matchTime.getHours();
                            const matchMin = matchTime.getMinutes();
                            const matchStartMinutes = matchHour * 60 + matchMin;
                            // Simple overlap check
                            return !(time + matchDurationMinutes <= matchStartMinutes || time >= matchStartMinutes + matchDurationMinutes);
                        });

                        // Check if this block conflicts with any PROPOSED match
                        const isBookedProposed = proposedForDate?.some(m => {
                            const proposal = m.proposal_data;
                            if (!proposal || !proposal.time) return false;
                            // Check if same court
                            if (proposal.court_name && proposal.court_name !== slot.court_name) return false;

                            const [propHour, propMin] = proposal.time.split(':').map(Number);
                            const propStartMinutes = propHour * 60 + propMin;
                            // Simple overlap check (proposed match blocks the full duration)
                            return !(time + matchDurationMinutes <= propStartMinutes || time >= propStartMinutes + matchDurationMinutes);
                        });

                        // Check if this block conflicts with any PRIVATE BOOKING
                        const isBookedPrivate = bookings?.some(b => {
                            // Check court
                            if (b.court_slot_id && b.court_slot_id !== slot.id) return false;
                            if (!b.court_slot_id && b.court_name && b.court_name !== slot.court_name) return false;

                            // Parse times
                            const [bStartH, bStartM] = b.start_time.split(':').map(Number);
                            const [bEndH, bEndM] = b.end_time.split(':').map(Number);

                            const bStartMin = bStartH * 60 + bStartM;
                            const bEndMin = bEndH * 60 + bEndM;

                            // Overlap check
                            // Slot block: [time, time + matchDurationMinutes]
                            // Booking block: [bStartMin, bEndMin]

                            return (time < bEndMin && (time + matchDurationMinutes) > bStartMin);
                        });

                        if (!isBookedConfirmed && !isBookedProposed && !isBookedPrivate) {
                            available.push({
                                court_slot_id: slot.id,
                                courtName: slot.court_name, // Map to UI expectation
                                date: date,
                                time: blockStart, // Map to UI expectation
                                endTime: blockEnd
                            });
                        }
                    }
                });

                return available;
            } catch (err) {
                console.error('db.courtSlots.getAvailableSlots: ERROR', err);
                throw err;
            }
        }
    },

    // ==================== MESSAGES ====================
    messages: {
        // Get all messages for a user (received)
        async getForUser(userId) {
            const { data, error } = await sbClient
                .from('match_messages')
                .select(`
                    *,
                    matches (
                        player1_name,
                        player2_name,
                        scheduling_status,
                        tournaments ( name )
                    )
                `)
                .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Manually fetch sender names for each message
            if (data && data.length > 0) {
                const senderIds = [...new Set(data.map(m => m.sender_id))];
                const { data: senders } = await sbClient
                    .from('profiles')
                    .select('id, name, lastname, email, is_approved, institution_id')
                    .in('id', senderIds);

                const senderMap = {};
                if (senders) {
                    senders.forEach(s => senderMap[s.id] = s);
                }

                data.forEach(m => {
                    m.sender = senderMap[m.sender_id] || { name: 'Usuario' };
                });
            }

            return data || [];
        },

        // Get unread message count
        async getUnreadCount(userId) {
            const { count, error } = await sbClient
                .from('match_messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return count || 0;
        },

        // Mark message as read
        async markAsRead(messageId) {
            const { data, error } = await sbClient
                .from('match_messages')
                .update({ is_read: true })
                .eq('id', messageId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // Mark all messages for a match as read
        async markMatchMessagesAsRead(matchId, userId) {
            const { error } = await sbClient
                .from('match_messages')
                .update({ is_read: true })
                .eq('match_id', matchId)
                .eq('recipient_id', userId);
            if (error) throw error;
        },

        // Create a new message/notification
        async create(message) {
            const { data, error } = await sbClient
                .from('match_messages')
                .insert(message)
                .select()
                .single();
            if (error) throw error;
            return data;
        },

        // Get messages for a specific match
        async getByMatch(matchId) {
            const { data, error } = await sbClient
                .from('match_messages')
                .select('*')
                .eq('match_id', matchId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },

        // Update challenge status
        async updateChallengeStatus(messageId, status) {
            const { data, error } = await sbClient
                .from('match_messages')
                .update({
                    challenge_status: status,
                    is_read: true // Usually interacting with it should mark it as read
                })
                .eq('id', messageId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // ==================== PAYMENTS \u0026 BOOKINGS ====================
    payments: {
        async getTournamentPayments(institutionId = null) {
            let query = sbClient
                .from('tournament_players')
                .select('*, tournaments!inner(name, registration_price, institution_id)')
                .gt('tournaments.registration_price', 0);

            if (institutionId) {
                query = query.eq('tournaments.institution_id', institutionId);
            }

            const { data, error } = await query.order('enrolled_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        async getBookingPayments(institutionId = null) {
            let query = sbClient
                .from('bookings')
                .select('*, institutions!inner(name)')
                .gt('total_price', 0);

            if (institutionId) {
                query = query.eq('institution_id', institutionId);
            }

            const { data, error } = await query.order('date', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        async updateTournamentPaymentStatus(tournamentId, playerId, status) {
            const isPaid = status === 'paid';
            const { data, error } = await sbClient
                .from('tournament_players')
                .update({
                    payment_status: status,
                    paid: isPaid
                })
                .eq('tournament_id', tournamentId)
                .eq('player_id', playerId)
                .select();
            if (error) throw error;
            return data;
        },

        async updateBookingStatus(bookingId, status) {
            const isPaid = status === 'paid';
            const { data, error } = await sbClient
                .from('bookings')
                .update({
                    payment_status: status,
                    paid: isPaid // Assuming bookings might also have this or simple status is enough
                })
                .eq('id', bookingId)
                .select();
            if (error) throw error;
            return data;
        }
    },



    // ==================== AUDIT LOGS ====================
    logs: {
        async create(userId, action, details = {}) {
            try {
                const { error } = await sbClient
                    .from('audit_logs')
                    .insert({
                        user_id: userId,
                        action: action,
                        details: details
                    });
                if (error) console.error('Error creating audit log:', error);
            } catch (err) {
                console.error('Error creating audit log:', err);
            }
        },

        async getRecent(limit = 50) {
            const { data, error } = await sbClient
                .from('audit_logs')
                .select('*, users:user_id(name, lastname)')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) return [];
            return data || [];
        }
    }
};

// Export for use in other files
window.db = db;
window.supabaseClient = sbClient;

console.log('✅ Supabase initialized successfully');
