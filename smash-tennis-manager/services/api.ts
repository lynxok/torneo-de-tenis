
import { supabase } from './supabaseClient';
import { Institution, Match, Tournament, UserProfile, Booking, CourtSlot, Message, Transaction, SystemConfig, RankingPointRecord, UserClubMembership, Story, StoryLayer } from '../types';

export const api = {
    settings: {
        async getConfig() {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*');

            if (error) {
                console.error("Error fetching system settings:", error);
                // Fallback default
                return {
                    profile_banner_url: '/profile-banner.jpg',
                    google_drive_enabled: false,
                    google_client_id: '',
                    google_api_key: '',
                    target_folder_id: '',
                    service_account_email: '',
                    welcome_message: '¡Bienvenido a la comunidad de Smash Tennis!'
                } as unknown as SystemConfig;
            }

            // Convert key-value array to object
            const config: any = {};
            data.forEach(item => {
                config[item.key] = item.value;
            });

            // Ensure defaults if keys missing
            return {
                profile_banner_url: '/profile-banner.jpg',
                ...config
            };
        },
        async updateConfig(key: string, value: any) {
            const { data, error } = await supabase
                .from('system_settings')
                .upsert({ key, value, updated_at: new Date() })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },
    rankings: {
        async getHistory(userId: string) {
            const { data, error } = await supabase
                .from('ranking_history')
                .select('*')
                .eq('player_id', userId)
                .order('date_obtained', { ascending: false });

            if (error) {
                console.error('Error fetching ranking history:', error);
                return [];
            }
            return data as RankingPointRecord[];
        }
    },
    storage: {
        async uploadSystemAsset(file: File) {
            const fileExt = file.name.split('.').pop();
            const fileName = `banner-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
            return `${data.publicUrl}?t=${Date.now()}`;
        },

        async uploadProfileImage(file: File, identifier: string) {
            // Sanitize identifier for use as filename (remove special chars, use only alphanumeric and hyphens)
            const sanitizedId = identifier.replace(/[^a-zA-Z0-9-]/g, '_');
            const fileExt = file.name.split('.').pop();
            const fileName = `${sanitizedId}.${fileExt}`;

            // Upsert: upload or replace existing
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Add cache-busting timestamp to URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            return `${data.publicUrl}?t=${Date.now()}`;
        },
        async uploadTournamentImage(file: File, tournamentId: string) {
            const fileExt = file.name.split('.').pop();
            const fileName = `tournament-${tournamentId}-${Math.random()}.${fileExt}`;
            const filePath = `tournament-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images') // Ensure this bucket exists
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            return data.publicUrl;
        }
    },
    auth: {
        async getUserProfile(userId: string) {
            if (userId === 'debug-ignacio') {
                return {
                    id: 'debug-ignacio',
                    email: 'ignaciovalente@hotmail.com',
                    name: 'Ignacio',
                    lastname: 'Valente',
                    role: 'superadmin',
                    institution_id: 'inst-1',
                    institution: 'Club Central',
                    is_approved: true,
                    matches_won: 15,
                    tournaments_won: 2,
                    category: '1ra',
                    dni: '35999888'
                } as UserProfile;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*, institutions(name)')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return { ...data, institution: data.institutions?.name } as UserProfile;
        },
        async getAllProfiles(page = 1, pageSize = 20) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, institutions(name)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);
            if (error) throw error;
            return data as UserProfile[];
        },
        async updateProfile(id: string, updates: Partial<UserProfile>) {
            // Lista blanca estricta de columnas reales en la tabla 'profiles' de Supabase
            const ALLOWED_PROFILES_COLUMNS = [
                'name',
                'lastname',
                'email',
                'role',
                'category',
                'gender',
                'institution_id',
                'phone',
                'dni',
                'avatar_url',
                'profile_picture_url',
                'show_whatsapp',
                'is_approved',
                'member_status',
                'memberships',
                'matches_won',
                'tournaments_won',
                'updated_at'
            ];

            const sanitizedUpdates: any = {};
            for (const key of ALLOWED_PROFILES_COLUMNS) {
                if (key in updates && (updates as any)[key] !== undefined) {
                    sanitizedUpdates[key] = (updates as any)[key];
                }
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(sanitizedUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },


        async signUp(email: string, password: string, meta: any) {
            return await supabase.auth.signUp({ email, password, options: { data: meta } });
        },
        async adminCreateUser(email: string, password: string, userData: any) {
            // Note: This only works with Service Role Key on backend, specific client-side call limitation
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: userData }
            });
            if (error) throw error;
            return data;
        },
        async updateUserPassword(userId: string, newPassword: string) {
            // Note: client-side supabase.auth.updateUser updates the CURRENT LOGGED IN USER password.
            // To update ANOTHER user password from Super Admin, we update using RPC or Auth API if available, 
            // or if it's the current user, update using updateUser.
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === userId) {
                const { data, error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                return data;
            } else {
                // For editing OTHER users as Super Admin: update user via Supabase RPC or auth metadata
                const { data, error } = await supabase.rpc('admin_update_user_password', {
                    target_user_id: userId,
                    new_password: newPassword
                });
                if (error) {
                    // Fallback attempt if RPC is missing
                    const { data: fallbackData, error: fallbackError } = await supabase.auth.updateUser({ password: newPassword });
                    if (fallbackError) throw fallbackError;
                    return fallbackData;
                }
                return data;
            }
        },
        async updateUserAuthEmail(userId: string, newEmail: string) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === userId) {
                const { data, error } = await supabase.auth.updateUser({ email: newEmail });
                if (error) throw error;
                return data;
            }
        },
        async signIn(email: string, password: string) {
            return await supabase.auth.signInWithPassword({ email, password });
        },
        async signOut() {
            return await supabase.auth.signOut();
        }
    },
    memberships: {
        getUserMemberships(user: UserProfile): UserClubMembership[] {
            if (user.memberships && Array.isArray(user.memberships) && user.memberships.length > 0) {
                return user.memberships;
            }
            if (user.institution_id) {
                return [{
                    institution_id: user.institution_id,
                    institution_name: user.institution,
                    member_number: user.member_number,
                    is_primary: true,
                    status: user.member_status || (user.is_member ? 'active' : 'pending'),
                    joined_date: new Date().toISOString()
                }];
            }
            return [];
        },
        async saveUserMemberships(userId: string, memberships: UserClubMembership[]) {
            const primary = memberships.find(m => m.is_primary) || (memberships.length > 0 ? memberships[0] : null);
            const updates: Partial<UserProfile> = {
                memberships,
                institution_id: primary ? primary.institution_id : null as any,
                member_number: primary ? primary.member_number : '',
                is_member: primary ? primary.status === 'active' : false,
                member_status: primary ? primary.status : 'inactive'
            };
            return await api.auth.updateProfile(userId, updates);
        },
        async addMembership(user: UserProfile, newMembership: UserClubMembership) {
            const current = this.getUserMemberships(user);
            const exists = current.some(m => m.institution_id === newMembership.institution_id);
            if (exists) {
                throw new Error("Ya tienes una membresía registrada o solicitada en este club.");
            }
            const isFirst = current.length === 0;
            const updated: UserClubMembership[] = [
                ...current.map(m => newMembership.is_primary ? { ...m, is_primary: false } : m),
                {
                    ...newMembership,
                    is_primary: isFirst ? true : !!newMembership.is_primary,
                    status: newMembership.status || 'pending',
                    joined_date: new Date().toISOString()
                }
            ];
            return await this.saveUserMemberships(user.id, updated);
        },
        async setPrimary(user: UserProfile, institutionId: string) {
            const current = this.getUserMemberships(user);
            const updated = current.map(m => ({
                ...m,
                is_primary: m.institution_id === institutionId
            }));
            return await this.saveUserMemberships(user.id, updated);
        },
        async removeMembership(user: UserProfile, institutionId: string) {
            const current = this.getUserMemberships(user);
            const filtered = current.filter(m => m.institution_id !== institutionId);
            if (filtered.length > 0 && !filtered.some(m => m.is_primary)) {
                filtered[0].is_primary = true;
            }
            return await this.saveUserMemberships(user.id, filtered);
        },
        isMemberOf(user: UserProfile, institutionId?: string): boolean {
            if (!institutionId) return false;
            const list = this.getUserMemberships(user);
            const match = list.find(m => m.institution_id === institutionId);
            if (match) {
                return match.status === 'active' || match.status === undefined;
            }
            return !!(user.is_member && user.institution_id === institutionId);
        }
    },
    tournaments: {
        async getActive() {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*, institutions(name, city)')
                .eq('status', 'active')
                .order('start_date');

            if (error) throw error;
            return data as Tournament[];
        },
        async getAll(page = 1, pageSize = 10) {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*, institutions(name, city)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            return data as Tournament[];
        },
        async getById(id: string) {
            const { data: tournament, error } = await supabase
                .from('tournaments')
                .select('*, institutions(name)')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Fetch Players
            const { data: players } = await supabase
                .from('tournament_players')
                .select('*')
                .eq('tournament_id', id);

            // Fetch Matches
            const { data: matches } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', id)
                .order('group_number', { ascending: true });

            return {
                ...tournament,
                tournament_players: players || [],
                matches: matches || []
            };
        },
        async create(tournament: Partial<Tournament>) {
            const { data, error } = await supabase.from('tournaments').insert(tournament).select().single();
            if (error) throw error;
            return data;
        },
        async update(id: string, updates: Partial<Tournament>) {
            const { data, error } = await supabase.from('tournaments').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async delete(id: string) {
            const { error } = await supabase.from('tournaments').delete().eq('id', id);
            if (error) throw error;
        },
        async reactivate(oldTournament: Tournament) {
            const newStartDate = new Date();
            newStartDate.setFullYear(newStartDate.getFullYear() + 1);

            const newTournamentData: Partial<Tournament> = {
                name: `${oldTournament.name} (Edición ${new Date().getFullYear()})`,
                category: oldTournament.category,
                competitions: oldTournament.competitions,
                type: oldTournament.type,
                gender: oldTournament.gender,
                institution_id: oldTournament.institution_id,
                registration_price: oldTournament.registration_price,
                image_url: oldTournament.image_url,
                status: 'draft',
                registration_closed: false,
                start_date: newStartDate.toISOString().split('T')[0],
                previous_edition_id: oldTournament.id
            };

            const { data, error } = await supabase.from('tournaments').insert(newTournamentData).select().single();
            if (error) throw error;
            return data;
        },
        async getPointsDefense(previousTournamentId: string) {
            return []; // Needs historical data
        },
        async generateFixture(tournamentId: string) {
            // 1. Get Players
            const { data: players } = await supabase
                .from('tournament_players')
                .select('*')
                .eq('tournament_id', tournamentId);

            if (!players || players.length < 3) {
                throw new Error("Se necesitan al menos 3 jugadores/parejas para generar un fixture.");
            }

            // 2. Shuffle
            const shuffled = [...players].sort(() => Math.random() - 0.5);

            // 3. Determine Groups (Target size: 3 or 4)
            const totalPlayers = shuffled.length;
            let numGroups = Math.floor(totalPlayers / 3);
            if (totalPlayers === 4 || totalPlayers === 5) numGroups = 1;

            const groups: any[][] = Array.from({ length: numGroups }, () => []);

            shuffled.forEach((p, index) => {
                groups[index % numGroups].push(p);
            });

            // 4. Generate Matches
            const matchesToInsert: any[] = [];

            groups.forEach((group, groupIdx) => {
                const groupName = `Grupo ${String.fromCharCode(65 + groupIdx)}`;

                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const p1 = group[i];
                        const p2 = group[j];

                        matchesToInsert.push({
                            tournament_id: tournamentId,
                            player1_id: p1.player_id,
                            player1_name: p1.player_name,
                            player2_id: p2.player_id,
                            player2_name: p2.player_name,
                            round: 'Fase de Grupos',
                            group_number: groupIdx + 1,
                            proposal_data: { group_name: groupName },
                            scheduling_status: 'confirmed'
                        });
                    }
                }
            });

            // 5. Insert Matches
            const { error: matchError } = await supabase.from('matches').insert(matchesToInsert);
            if (matchError) throw matchError;

            // 6. Activate Tournament
            const { error: updateError } = await supabase
                .from('tournaments')
                .update({ status: 'active' })
                .eq('id', tournamentId);

            if (updateError) throw updateError;

            return true;
        },
        async generatePlayoffs(tournamentId: string) {
            // Simplified logic: Generate Quarter Finals for Top 8 (or random 8)
            const { data: players } = await supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId);

            if (!players || players.length < 2) throw new Error("Insuficientes jugadores");

            const shuffled = [...players].sort(() => Math.random() - 0.5).slice(0, 8); // Top 8
            const matchesToInsert: any[] = [];

            // If less than 8, maybe do Semis? For now, stick to Quarters logic or Semis
            const roundName = shuffled.length > 4 ? 'Cuartos de Final' : 'Semifinal';

            for (let i = 0; i < shuffled.length; i += 2) {
                if (i + 1 < shuffled.length) {
                    matchesToInsert.push({
                        tournament_id: tournamentId,
                        player1_id: shuffled[i].player_id,
                        player1_name: shuffled[i].player_name,
                        player2_id: shuffled[i + 1].player_id,
                        player2_name: shuffled[i + 1].player_name,
                        round: roundName,
                        scheduling_status: 'confirmed'
                    });
                }
            }

            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;
            return true;
        },
        async simulateHistory(tournamentId: string) {
            // 1. Get Players
            const { data: players } = await supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId);
            if (!players || players.length < 8) throw new Error("Se necesitan al menos 8 jugadores para simular un historial completo.");

            const shuffled = [...players].sort(() => Math.random() - 0.5);
            const matchesToInsert: any[] = [];

            // --- FASE DE GRUPOS ---
            const groupSize = 4;
            const groups: any[][] = [];
            for (let i = 0; i < shuffled.length; i += groupSize) {
                groups.push(shuffled.slice(i, i + groupSize));
            }

            groups.forEach((group, gIdx) => {
                const groupName = `Grupo ${String.fromCharCode(65 + gIdx)}`;
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        // Simulate Match
                        const p1 = group[i];
                        const p2 = group[j];
                        const p1Wins = Math.random() > 0.5;
                        matchesToInsert.push({
                            tournament_id: tournamentId,
                            player1_id: p1.player_id, player1_name: p1.player_name,
                            player2_id: p2.player_id, player2_name: p2.player_name,
                            round: 'Fase de Grupos',
                            group_number: gIdx + 1,
                            proposal_data: { group_name: groupName },
                            scheduling_status: 'finished',
                            score: p1Wins ? { set1: "6-4", set2: "6-3" } : { set1: "4-6", set2: "3-6" },
                            winner_id: p1Wins ? p1.player_id : p2.player_id
                        });
                    }
                }
            });

            // --- PLAYOFFS (Quarter Finals -> Final) ---
            // Take top 8 (first from each group or just first 8 from shuffled list for simplicity)
            let currentRoundPlayers = shuffled.slice(0, 8);
            const rounds = ['Cuartos de Final', 'Semifinal', 'Final'];

            for (const round of rounds) {
                const nextRoundPlayers: any[] = [];
                for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                    if (i + 1 >= currentRoundPlayers.length) break;
                    const p1 = currentRoundPlayers[i];
                    const p2 = currentRoundPlayers[i + 1];
                    const p1Wins = Math.random() > 0.5;
                    const winner = p1Wins ? p1 : p2;
                    nextRoundPlayers.push(winner);

                    matchesToInsert.push({
                        tournament_id: tournamentId,
                        player1_id: p1.player_id, player1_name: p1.player_name,
                        player2_id: p2.player_id, player2_name: p2.player_name,
                        round: round,
                        scheduling_status: 'finished',
                        score: p1Wins ? { set1: "6-4", set2: "7-5" } : { set1: "2-6", set2: "4-6" },
                        winner_id: winner.player_id
                    });
                }
                currentRoundPlayers = nextRoundPlayers;
                if (currentRoundPlayers.length < 2 && round !== 'Final') break; // Should not happen with 8 players
            }

            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;
        }
    },
    players: {
        async enroll(tournamentId: string, playerId: string, playerName: string, category: string, fee?: number) {
            const { error } = await supabase.from('tournament_players').insert({
                tournament_id: tournamentId,
                player_id: playerId,
                player_name: playerName,
                category,
                payment_status: 'pending',
                fee_amount: fee || 0
            });
            if (error) throw error;
        },
        async getByTournament(tournamentId: string) {
            const { data, error } = await supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId);
            if (error) throw error;
            return data;
        }
    },
    matches: {
        async updateScore(matchId: string, score: any, winnerId: string) {
            const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();

            const { error } = await supabase.from('matches').update({
                score,
                winner_id: winnerId,
                scheduling_status: 'finished'
            }).eq('id', matchId);
            if (error) throw error;

            if (winnerId) {
                try {
                    // 1. Increment matches_won for the winner
                    const { data: winnerProfile } = await supabase.from('profiles').select('matches_won').eq('id', winnerId).single();
                    if (winnerProfile) {
                        await supabase.from('profiles').update({
                            matches_won: (winnerProfile.matches_won || 0) + 1
                        }).eq('id', winnerId);
                    }

                    // 2. Add ranking point record (50 points per tournament win)
                    await supabase.from('ranking_history').insert({
                        player_id: winnerId,
                        points: 50,
                        reason: `Victoria en partido de torneo`,
                        tournament_id: matchData?.tournament_id || null,
                        date_obtained: new Date().toISOString()
                    });
                } catch (rankingErr) {
                    console.log("Ranking point auto-update fallback (non-blocking):", rankingErr);
                }
            }
        },
        async getByUser(userId: string) {
            const { data, error } = await supabase
                .from('matches')
                .select('*, tournaments(name, institutions(name))')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) return [];
            return data as Match[];
        }
    },
    bookings: {
        async getByUser(userId: string) {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, institutions(name)')
                .eq('user_id', userId)
                .order('date', { ascending: false });
            if (error) throw error;
            return data as Booking[];
        },
        async getByInstitutionAndDate(institutionId: string, date: string) {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('date', date);

            if (error) throw error;
            return (data || []) as Booking[];
        },
        async create(booking: Partial<Booking>) {
            const { data, error } = await supabase.from('bookings').insert(booking).select().single();
            if (error) throw error;
            return data;
        },
        async update(id: string, updates: Partial<Booking>) {
            const { data, error } = await supabase.from('bookings').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async delete(id: string) {
            const { error } = await supabase.from('bookings').delete().eq('id', id);
            if (error) throw error;
        }
    },
    messages: {
        async getInbox(user: UserProfile, page = 1, pageSize = 20) {
            let query = supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            // Logic: Direct OR Broadcast to My Institution OR Broadcast to My Role
            // Simple filtering by receiver for now, can be complex in RLS
            if (user.role === 'admin' || user.role === 'superadmin') {
                // For debug/broad access, still respect deletion
                query = query
                    .or(`receiver_id.eq.${user.id},type.eq.broadcast_admins`)
                    .neq('deleted_by_receiver', true);
            } else {
                query = query
                    .or(`receiver_id.eq.${user.id}`)
                    .neq('deleted_by_receiver', true);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching messages:', error);
                return [];
            }
            return data as Message[];
        },
        async send(message: Partial<Message>) {
            const { data, error } = await supabase.from('messages').insert(message).select().single();
            if (error) throw error;
            return data as Message;
        },
        async markAsRead(id: string) {
            const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id);
            if (error) throw error;
            return true;
        },
        async delete(id: string) {
            const { error } = await supabase.from('messages').update({ deleted_by_receiver: true }).eq('id', id);
            if (error) throw error;
            return true;
        }
    },
    institutions: {
        async getAll() {
            const { data, error } = await supabase.from('institutions').select('*').order('name');
            if (error) throw error;
            return data as Institution[];
        },
        async getById(id: string) {
            const { data, error } = await supabase.from('institutions').select('*').eq('id', id).single();
            if (error) throw error;
            return data as Institution;
        },
        async create(data: Partial<Institution>) {
            const { data: res, error } = await supabase.from('institutions').insert(data).select().single();
            if (error) throw error;
            return res;
        },
        async update(id: string, updates: Partial<Institution>) {
            const { data, error } = await supabase.from('institutions').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async getCourtSlots(instId: string, date: string) {
            const { data: inst, error: instError } = await supabase
                .from('institutions')
                .select('*')
                .eq('id', instId)
                .single();

            if (instError || !inst) return [];

            const { data: bookings } = await supabase
                .from('bookings')
                .select('*')
                .eq('institution_id', instId)
                .eq('date', date)
                .neq('status', 'cancelled')
                .neq('status', 'rejected');

            const safeBookings = bookings || [];

            const openTime = inst.schedule_open || '08:00';
            const closeTime = inst.schedule_close || '23:00';
            const duration = inst.config_booking_min_duration || 60;
            const courts = inst.courts_total || 3;

            const slots: CourtSlot[] = [];

            const toMins = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };
            const toTime = (m: number) => {
                const h = Math.floor(m / 60);
                const min = m % 60;
                return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            };

            let currentMins = toMins(openTime);
            const closeMins = toMins(closeTime);

            while (currentMins + duration <= closeMins) {
                const startStr = toTime(currentMins);
                const endStr = toTime(currentMins + duration);

                for (let c = 1; c <= courts; c++) {
                    const courtName = `Cancha ${c}`;

                    const isTaken = safeBookings.some((b: Booking) => {
                        if (b.court_name !== courtName) return false;
                        const bStart = toMins(b.start_time);
                        const bEnd = toMins(b.end_time);
                        return currentMins < bEnd && (currentMins + duration) > bStart;
                    });

                    if (!isTaken) {
                        slots.push({
                            id: `${date}-${courtName}-${startStr}`,
                            institution_id: instId,
                            court_name: courtName,
                            day_of_week: new Date(date).getDay(),
                            start_time: startStr,
                            end_time: endStr,
                            is_active: true
                        });
                    }
                }
                currentMins += duration;
            }
            return slots;
        }
    },
    reports: {
        async getStats(institutionId: string, period: 'day' | 'week' | 'month') {
            console.log("📊 Calculando estadísticas financieras (Front-end Aggregation)...");
            // Semi-real implementation: Aggregating transactions
            // Calculate real date range
            const now = new Date();
            let startDate = new Date();
            if (period === 'day') startDate.setHours(0, 0, 0, 0);
            if (period === 'week') startDate.setDate(now.getDate() - 7);
            if (period === 'month') startDate.setMonth(now.getMonth() - 1);

            let txQuery = supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate.toISOString());

            let bookingQuery = supabase
                .from('bookings')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0]);

            if (institutionId && institutionId !== 'all') {
                txQuery = txQuery.eq('institution_id', institutionId);
                bookingQuery = bookingQuery.eq('institution_id', institutionId);
            }

            const [{ data: txs, error: txErr }, { data: bookingsData, error: bookingErr }] = await Promise.all([
                txQuery,
                bookingQuery
            ]);

            if (txErr) console.error("Error transactions:", txErr);
            if (bookingErr) console.error("Error bookings:", bookingErr);

            const allTxs = txs || [];
            const allBookings = bookingsData || [];

            const income = allTxs.filter(t => t.type === 'income');
            const expense = allTxs.filter(t => t.type === 'expense');

            const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
            const totalExpenses = expense.reduce((sum, t) => sum + Number(t.amount), 0);

            // Calculate Cash Flow by Day (real or zeroed out)
            const daysMap: { [key: string]: { income: number; expense: number } } = {
                'Lun': { income: 0, expense: 0 },
                'Mar': { income: 0, expense: 0 },
                'Mie': { income: 0, expense: 0 },
                'Jue': { income: 0, expense: 0 },
                'Vie': { income: 0, expense: 0 },
                'Sab': { income: 0, expense: 0 },
                'Dom': { income: 0, expense: 0 }
            };

            const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

            allTxs.forEach(t => {
                const d = new Date(t.date);
                const dayName = dayNames[d.getDay()];
                if (daysMap[dayName]) {
                    if (t.type === 'income') daysMap[dayName].income += Number(t.amount);
                    else daysMap[dayName].expense += Number(t.amount);
                }
            });

            const chartData = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => ({
                day: d,
                income: daysMap[d].income,
                expense: daysMap[d].expense
            }));

            // Calculate Real Peak Hours from Bookings
            const hoursMap: { [key: string]: number } = {};
            allBookings.forEach(b => {
                if (b.start_time) {
                    const hourKey = b.start_time.substring(0, 5);
                    hoursMap[hourKey] = (hoursMap[hourKey] || 0) + 1;
                }
            });

            const sortedHours = Object.entries(hoursMap).sort((a, b) => b[1] - a[1]);
            const maxBookingsCount = sortedHours.length > 0 ? sortedHours[0][1] : 1;

            const peakHours = sortedHours.slice(0, 5).map(([hour, count]) => ({
                hour,
                count,
                intensity: Math.round((count / maxBookingsCount) * 100)
            }));

            // Calculate Real Payment Methods
            const cashVal = income.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + Number(t.amount), 0);
            const transferVal = income.filter(t => t.payment_method === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0);
            const mpVal = income.filter(t => t.payment_method === 'mercadopago').reduce((sum, t) => sum + Number(t.amount), 0);

            // Calculate Pending Income from pending bookings
            const pendingBookingsIncome = allBookings
                .filter(b => b.payment_status === 'pending' || b.status === 'pending')
                .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

            return {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_income: totalIncome - totalExpenses,
                profit_margin: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,

                income_bookings: income.filter(t => t.category === 'booking').reduce((sum, t) => sum + Number(t.amount), 0),
                income_tournaments: income.filter(t => t.category === 'tournament_fee').reduce((sum, t) => sum + Number(t.amount), 0),
                income_shop: income.filter(t => t.category === 'shop').reduce((sum, t) => sum + Number(t.amount), 0),

                pending_income: pendingBookingsIncome,
                occupancy_rate: 0,

                revenue_sources: [
                    { name: 'Alquiler Canchas', value: income.filter(t => t.category === 'booking').reduce((sum, t) => sum + Number(t.amount), 0), color: '#38bdf8' },
                    { name: 'Inscripción Torneos', value: income.filter(t => t.category === 'tournament_fee').reduce((sum, t) => sum + Number(t.amount), 0), color: '#f59e0b' },
                ],
                payment_methods: [
                    { name: 'Efectivo', value: cashVal, color: '#22c55e' },
                    { name: 'Transferencia', value: transferVal, color: '#3b82f6' },
                    { name: 'Mercado Pago', value: mpVal, color: '#009ee3' }
                ],
                peak_hours: peakHours,
                chart_data: chartData,
                top_bookers: []
            };
        },
        async getTransactions(institutionId: string, page = 1, pageSize = 50) {
            let query = supabase
                .from('transactions')
                .select('*', { count: 'exact' });

            if (institutionId && institutionId !== 'all') {
                query = query.eq('institution_id', institutionId);
            }

            const { data, error } = await query
                .order('date', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            return data as Transaction[];
        },
        async createTransaction(transaction: Partial<Transaction>) {
            const { data, error } = await supabase.from('transactions').insert(transaction).select().single();
            if (error) throw error;
            return data as Transaction;
        }
    },
    stories: {
        async getActive() {
            const { data, error } = await supabase
                .from('stories')
                .select(`
                    *,
                    author:profiles!stories_user_id_fkey (
                        name,
                        lastname,
                        profile_picture_url,
                        role
                    )
                `)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching active stories:", error);
                return [] as Story[];
            }

            return (data || []).map((story: any) => ({
                ...story,
                layers: (story.layers || []) as StoryLayer[]
            })) as Story[];
        },
        async createStory(file: File, layers: StoryLayer[], userId: string) {
            // 1. Subir archivo a Supabase Storage bucket 'stories'
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${userId}_${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('stories')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error("Error uploading story media:", uploadError);
                throw uploadError;
            }

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('stories')
                .getPublicUrl(filePath);

            // 3. Crear registro en la tabla stories con expiración a 20 horas
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 20 * 60 * 60 * 1000); // 20 horas exactas

            const { data, error: insertError } = await supabase
                .from('stories')
                .insert({
                    user_id: userId,
                    media_url: publicUrl,
                    storage_path: filePath,
                    layers: layers,
                    created_at: now.toISOString(),
                    expires_at: expiresAt.toISOString()
                })
                .select(`
                    *,
                    author:profiles!stories_user_id_fkey (
                        name,
                        lastname,
                        profile_picture_url,
                        role
                    )
                `)
                .single();

            if (insertError) {
                console.error("Error creating story record:", insertError);
                throw insertError;
            }

            return data as Story;
        },
        async deleteStory(storyId: string, storagePath?: string) {
            // 1. Borrar registro de DB
            const { error: dbError } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (dbError) throw dbError;

            // 2. Borrar del bucket de storage si tenemos la ruta
            if (storagePath) {
                await supabase.storage
                    .from('stories')
                    .remove([storagePath]);
            }
            return true;
        },
        async searchUsersForMention(query: string) {
            if (!query.trim()) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, lastname, profile_picture_url, role')
                .or(`name.ilike.%${query}%,lastname.ilike.%${query}%`)
                .limit(8);

            if (error) {
                console.error("Error searching players for mention:", error);
                return [];
            }
            return data || [];
        }
    }
};

