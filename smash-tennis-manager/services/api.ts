
import { supabase } from './supabaseClient';
import { Institution, Match, Tournament, UserProfile, Booking, CourtSlot, Message, Transaction, SystemConfig, RankingPointRecord, UserClubMembership, Story, StoryLayer, MatchmakingPost } from '../types';
import { formatPlayerName } from '../utils/formatters';

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

            // Auto-heal missing profile fields from auth user_metadata if available
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (authData?.user && authData.user.id === userId && authData.user.user_metadata) {
                    const meta = authData.user.user_metadata;
                    const updates: any = {};
                    if (!data.lastname && meta.lastname) updates.lastname = meta.lastname.trim();
                    if (!data.phone && meta.phone) updates.phone = meta.phone.trim();
                    if (!data.dni && meta.dni) updates.dni = meta.dni.trim();
                    if (!data.gender && meta.gender) updates.gender = meta.gender.trim();
                    if ((!data.category || data.category === 'C') && meta.category && meta.category !== 'C') updates.category = meta.category.trim();
                    if (!data.institution_id && meta.institution_id && meta.institution_id !== 'none') updates.institution_id = meta.institution_id;
                    if ((!data.name || data.name === 'Usuario') && meta.name) updates.name = meta.name.trim();

                    if (meta.birth_date) {
                        data.birth_date = meta.birth_date;
                    }

                    if (Object.keys(updates).length > 0) {
                        await supabase.from('profiles').update(updates).eq('id', userId);
                        Object.assign(data, updates);
                        if (updates.institution_id && !data.institutions?.name) {
                            const { data: inst } = await supabase.from('institutions').select('name').eq('id', updates.institution_id).single();
                            if (inst) {
                                data.institutions = inst;
                            }
                        }
                    }
                }
            } catch (healErr) {
                console.warn("Auto-heal profile fallback:", healErr);
            }

            if (!data.gender) data.gender = 'masculino';

            // Calculate real wins from matches table
            try {
                const { count: realWins } = await supabase
                    .from('matches')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_played', true)
                    .eq('winner_id', userId);
                if (realWins !== null && realWins !== undefined) {
                    data.matches_won = realWins;
                }
            } catch (wErr) {
                // Keep default
            }

            return { ...data, institution: data.institutions?.name } as UserProfile;
        },
        async getAllProfiles(page = 1, pageSize = 50) {
            let wonMatchesData: any[] = [];
            try {
                const { data: wm } = await supabase
                    .from('matches')
                    .select('winner_id')
                    .eq('is_played', true)
                    .not('winner_id', 'is', null);
                if (wm) wonMatchesData = wm;
            } catch (e) {
                console.warn("Could not query won matches directly:", e);
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*, institutions:institutions(id, name)', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;

            // Map real won match counts per player
            const winCountMap: Record<string, number> = {};
            wonMatchesData.forEach((m: any) => {
                if (m.winner_id) winCountMap[m.winner_id] = (winCountMap[m.winner_id] || 0) + 1;
            });

            // Enrich with current user metadata if available
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (authData?.user?.user_metadata) {
                    const currentMeta = authData.user.user_metadata;
                    const match = (data || []).find((p: any) => p.id === authData.user.id);
                    if (match) {
                        if (currentMeta.birth_date) match.birth_date = currentMeta.birth_date;
                        if (currentMeta.gender) match.gender = currentMeta.gender;
                    }
                }
            } catch (e) {
                // Ignore
            }

            return (data || [])
                .filter((p: any) => p.role !== 'inactive' && p.member_status !== 'deleted' && !p.name?.includes('[Usuario Eliminado]') && !p.name?.includes('[Eliminado]'))
                .map((p: any) => ({
                    ...p,
                    matches_won: winCountMap[p.id] || 0,
                    gender: p.gender || 'masculino',
                    institution: p.institutions?.name || null
                })) as UserProfile[];
        },

        async updateProfile(id: string, updates: Partial<UserProfile>) {
            // Lista blanca con las columnas exactas existentes en PostgreSQL:
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
                'is_approved',
                'matches_won',
                'tournaments_won',
                'latitude',
                'longitude',
                'city',
                'province',
                'country',
                'updated_at'
            ];

            const sanitizedUpdates: any = {};
            for (const key of ALLOWED_PROFILES_COLUMNS) {
                if (key in updates && (updates as any)[key] !== undefined) {
                    sanitizedUpdates[key] = (updates as any)[key];
                }
            }

            // Also synchronize birth_date & gender to Auth user_metadata
            try {
                const metaUpdates: any = {};
                if (updates.birth_date !== undefined) metaUpdates.birth_date = updates.birth_date;
                if (updates.gender !== undefined) metaUpdates.gender = updates.gender;
                if (Object.keys(metaUpdates).length > 0) {
                    await supabase.auth.updateUser({ data: metaUpdates });
                }
            } catch (metaErr) {
                console.warn("User metadata sync notice:", metaErr);
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(sanitizedUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;
            const updated = data && data.length > 0 ? data[0] : null;
            if (updated && updates.birth_date) {
                updated.birth_date = updates.birth_date;
            }
            return updated;
        },


        async signUp(email: string, password: string, meta: any) {
            const res = await supabase.auth.signUp({ email, password, options: { data: meta } });
            if (res.error) return res;

            // If user was created and session is available, sync to profiles immediately
            if (res.data?.user) {
                const user = res.data.user;
                const profileUpdates: any = {
                    name: meta.name?.trim() || '',
                    lastname: meta.lastname?.trim() || '',
                    phone: meta.phone?.trim() || '',
                    dni: meta.dni?.trim() || '',
                    gender: meta.gender || 'masculino',
                    category: meta.category || '6ta',
                    role: meta.role || 'player',
                    institution_id: (meta.institution_id && meta.institution_id !== 'none') ? meta.institution_id : null,
                    is_approved: false
                };
                try {
                    await supabase.from('profiles').update(profileUpdates).eq('id', user.id);
                } catch (profErr) {
                    console.warn("Profile instant sync notice:", profErr);
                }
            }
            return res;
        },
        async adminCreateUser(email: string, password: string, userData: any) {
            // Note: This only works with Service Role Key on backend, specific client-side call limitation
            const res = await supabase.auth.signUp({
                email,
                password,
                options: { data: userData }
            });
            if (res.error) throw res.error;
            if (res.data?.user) {
                const profileUpdates: any = {
                    name: userData.name?.trim() || '',
                    lastname: userData.lastname?.trim() || '',
                    phone: userData.phone?.trim() || '',
                    dni: userData.dni?.trim() || '',
                    category: userData.category || '4ta',
                    role: userData.role || 'player',
                    institution_id: (userData.institution_id && userData.institution_id !== 'none') ? userData.institution_id : null,
                    is_approved: userData.is_approved ?? true
                };
                try {
                    await supabase.from('profiles').update(profileUpdates).eq('id', res.data.user.id);
                } catch (profErr) {
                    console.warn("Admin create profile sync notice:", profErr);
                }
            }
            return res.data;
        },
        async updateUserPassword(userId: string, newPassword: string) {
            // Note: client-side supabase.auth.updateUser updates the CURRENT LOGGED IN USER password.
            // To update ANOTHER user password from Super Admin, we update using backend RPC admin_update_user_password.
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === userId) {
                const { data, error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                return data;
            } else {
                // For editing OTHER users as Super Admin: update user via Supabase RPC with security definer
                const { data, error } = await supabase.rpc('admin_update_user_password', {
                    target_user_id: userId,
                    new_password: newPassword
                });
                if (error) {
                    console.error("Error updating user password via admin RPC:", error);
                    throw new Error(error.message || 'Error al actualizar la contraseña del usuario.');
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
        async deleteUser(userId: string) {
            // 1. Try RPC first (full hard-delete of auth.users and public.profiles if migration is applied)
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
                if (!rpcError && rpcData) {
                    return { success: true, method: 'rpc' };
                }
            } catch (e) {
                // RPC not present in Supabase yet, continue with fallback
            }

            // 2. Try direct DELETE from public.profiles
            try {
                const { data: delData, error: profileError } = await supabase
                    .from('profiles')
                    .delete({ count: 'exact' })
                    .eq('id', userId)
                    .select();

                if (!profileError && delData && delData.length > 0) {
                    return { success: true, method: 'direct_delete' };
                }
            } catch (e) {
                // Continue with decommissioning
            }

            // 3. Robust Fallback: Decommission profile in database
            // This immediately hides and disables the user across all app lists (AdminUsers, Directory, Rankings)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    name: '[Usuario Eliminado]',
                    lastname: '',
                    is_approved: false,
                    role: 'player',
                    category: null,
                    institution_id: null
                })
                .eq('id', userId);

            if (updateError) {
                console.error("Error updating profile status:", updateError);
                throw updateError;
            }

            return { success: true, method: 'decommissioned' };
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
                const isActive = (user.is_approved !== false) && (user.member_status === 'active' || user.is_member || user.is_approved || !user.member_status);
                return [{
                    institution_id: user.institution_id,
                    institution_name: user.institution,
                    member_number: user.member_number,
                    is_primary: true,
                    status: isActive ? 'active' : (user.member_status || 'pending'),
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
            // OPTIMIZED: Fetch tournament, players, and matches concurrently with Promise.all
            const [
                { data: tournament, error: tourneyError },
                { data: players, error: playersError },
                { data: matches, error: matchesError }
            ] = await Promise.all([
                supabase.from('tournaments').select('*, institutions(name, id)').eq('id', id).single(),
                supabase.from('tournament_players').select('*').eq('tournament_id', id).order('enrolled_at', { ascending: true }),
                supabase.from('matches').select('*').eq('tournament_id', id).order('group_number', { ascending: true })
            ]);

            if (tourneyError) throw tourneyError;

            // Fetch Profiles for Players in a single batch
            const playerIds = (players || []).map(p => p.player_id).filter(Boolean);
            const partnerIds = (players || []).map(p => p.partner_id).filter(Boolean);
            const allProfileIds = Array.from(new Set([...playerIds, ...partnerIds]));

            const profileMap = new Map();
            if (allProfileIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, lastname, category, avatar_url, profile_picture_url')
                    .in('id', allProfileIds);
                (profiles || []).forEach(p => profileMap.set(p.id, p));
            }

            const formattedPlayers = (players || []).map(p => {
                const prof = profileMap.get(p.player_id);
                const rawName = prof ? prof.name : (p.name || p.player_name);
                const rawLastname = prof ? prof.lastname : '';
                const formattedName = formatPlayerName(rawName, rawLastname);
                const category = prof?.category || p.category || '4ta';

                let partnerFormattedName = p.partner_name;
                if (p.partner_id) {
                    const partnerProf = profileMap.get(p.partner_id);
                    if (partnerProf) {
                        partnerFormattedName = formatPlayerName(partnerProf.name, partnerProf.lastname);
                    }
                }

                return {
                    ...p,
                    player_name: formattedName,
                    name: formattedName,
                    category,
                    partner_name: partnerFormattedName,
                    team_name: p.team_name || (partnerFormattedName ? `${formattedName} / ${partnerFormattedName}` : formattedName)
                };
            });

            // 24H AUTO-CONFIRMATION CHECK: Check if any match is pending confirmation for > 24 hours
            const now = Date.now();
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
            const autoConfirmUpdates: PromiseLike<any>[] = [];

            const formattedMatches = (matches || []).map(m => {
                let updatedScoreStatus = m.score_status;

                // Auto-confirm if pending confirmation for > 24 hours
                if (m.score_status === 'pending_confirmation' && m.score_submitted_at) {
                    const submittedTime = new Date(m.score_submitted_at).getTime();
                    if (now - submittedTime >= TWENTY_FOUR_HOURS) {
                        updatedScoreStatus = 'confirmed';
                        // Trigger async confirmation update in background
                        autoConfirmUpdates.push(
                            (async () => {
                                try {
                                    await supabase.from('matches').update({
                                        score_status: 'confirmed',
                                        score_confirmed_at: new Date().toISOString()
                                    }).eq('id', m.id);
                                } catch (e) {
                                    try {
                                        await supabase.from('matches').update({
                                            scheduling_status: 'finished',
                                            is_played: true
                                        }).eq('id', m.id);
                                    } catch (ign) {}
                                }

                                if (m.winner_id) {
                                    try {
                                        const { data: wp } = await supabase.from('profiles').select('matches_won').eq('id', m.winner_id).single();
                                        if (wp) {
                                            await supabase.from('profiles').update({ matches_won: (wp.matches_won || 0) + 1 }).eq('id', m.winner_id);
                                        }
                                        await supabase.from('ranking_history').insert({
                                            player_id: m.winner_id,
                                            points: 50,
                                            tournament_name: tournament?.name || 'Torneo Oficial',
                                            date_obtained: new Date().toISOString(),
                                            year: new Date().getFullYear()
                                        });
                                    } catch (e) {
                                        console.warn("Auto-confirm point award fallback:", e);
                                    }
                                }
                            })()
                        );
                    }
                }

                const scheduledAt = m.scheduled_at || m.proposal_data?.scheduled_at || null;
                const courtName = m.court_name || m.proposal_data?.court_name || m.court_slot_id || null;

                return {
                    ...m,
                    scheduled_at: scheduledAt,
                    court_name: courtName,
                    score_status: updatedScoreStatus,
                    player1_name: formatPlayerName(m.player1_name),
                    player2_name: formatPlayerName(m.player2_name),
                    player1_partner_name: m.player1_partner_name ? formatPlayerName(m.player1_partner_name) : undefined,
                    player2_partner_name: m.player2_partner_name ? formatPlayerName(m.player2_partner_name) : undefined
                };
            });

            if (autoConfirmUpdates.length > 0) {
                Promise.all(autoConfirmUpdates).catch(e => console.warn("Auto-confirm batch error:", e));
            }

            return {
                ...tournament,
                tournament_players: formattedPlayers,
                matches: formattedMatches
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
        async generateFixture(tournamentId: string, customGroups?: { name: string; players: any[] }[]) {
            let groupsToUse: { name: string; players: any[] }[] = [];

            if (customGroups && customGroups.length > 0) {
                groupsToUse = customGroups;
            } else {
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

                const rawGroups: any[][] = Array.from({ length: numGroups }, () => []);
                shuffled.forEach((p, index) => {
                    rawGroups[index % numGroups].push(p);
                });

                groupsToUse = rawGroups.map((grp, idx) => ({
                    name: `Grupo ${String.fromCharCode(65 + idx)}`,
                    players: grp
                }));
            }

            // 4. Generate Matches
            const matchesToInsert: any[] = [];

            groupsToUse.forEach((groupObj, groupIdx) => {
                const groupName = groupObj.name || `Grupo ${String.fromCharCode(65 + groupIdx)}`;
                const group = groupObj.players;

                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const p1 = group[i];
                        const p2 = group[j];

                        matchesToInsert.push({
                            tournament_id: tournamentId,
                            player1_id: p1.player_id || p1.id,
                            player1_name: p1.player_name || p1.name,
                            player2_id: p2.player_id || p2.id,
                            player2_name: p2.player_name || p2.name,
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
        async generatePlayoffs(tournamentId: string, customMatches?: { round: string; player1: { id: string; name: string }; player2: { id: string; name: string } }[]) {
            const matchesToInsert: any[] = [];

            if (customMatches && customMatches.length > 0) {
                for (const cm of customMatches) {
                    matchesToInsert.push({
                        tournament_id: tournamentId,
                        player1_id: cm.player1.id,
                        player1_name: formatPlayerName(cm.player1.name),
                        player2_id: cm.player2.id,
                        player2_name: formatPlayerName(cm.player2.name),
                        round: cm.round,
                        scheduling_status: 'confirmed'
                    });
                }
            } else {
                const { data: players } = await supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId);
                if (!players || players.length < 2) throw new Error("Insuficientes jugadores");

                const shuffled = [...players].sort(() => Math.random() - 0.5).slice(0, 8); // Top 8
                const roundName = shuffled.length > 4 ? 'Cuartos de Final' : 'Semifinal';

                for (let i = 0; i < shuffled.length; i += 2) {
                    if (i + 1 < shuffled.length) {
                        matchesToInsert.push({
                            tournament_id: tournamentId,
                            player1_id: shuffled[i].player_id || shuffled[i].id,
                            player1_name: formatPlayerName(shuffled[i].player_name || shuffled[i].name),
                            player2_id: shuffled[i + 1].player_id || shuffled[i + 1].id,
                            player2_name: formatPlayerName(shuffled[i + 1].player_name || shuffled[i + 1].name),
                            round: roundName,
                            scheduling_status: 'confirmed'
                        });
                    }
                }
            }

            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;
            return true;
        },
        async swapGroupPlayers(tournamentId: string, playerA: { id: string; name: string }, playerB: { id: string; name: string }) {
            // 1. Fetch unplayed group matches for this tournament
            const { data: matches, error: fetchErr } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('round', 'Fase de Grupos')
                .neq('scheduling_status', 'finished');

            if (fetchErr) throw fetchErr;
            if (!matches || matches.length === 0) {
                throw new Error("No se encontraron partidos de grupos pendientes para actualizar.");
            }

            // 2. Perform swap on affected matches
            const updates = [];
            for (const match of matches) {
                let updated = false;
                const updatePayload: any = {};

                if (match.player1_id === playerA.id) {
                    updatePayload.player1_id = playerB.id;
                    updatePayload.player1_name = playerB.name;
                    updated = true;
                } else if (match.player1_id === playerB.id) {
                    updatePayload.player1_id = playerA.id;
                    updatePayload.player1_name = playerA.name;
                    updated = true;
                }

                if (match.player2_id === playerA.id) {
                    updatePayload.player2_id = playerB.id;
                    updatePayload.player2_name = playerB.name;
                    updated = true;
                } else if (match.player2_id === playerB.id) {
                    updatePayload.player2_id = playerA.id;
                    updatePayload.player2_name = playerA.name;
                    updated = true;
                }

                if (updated) {
                    updates.push(
                        supabase.from('matches').update(updatePayload).eq('id', match.id)
                    );
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }

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
        async enroll(tournamentId: string, playerId: string, playerName: string, category: string, fee?: number, partnerId?: string, partnerName?: string) {
            let finalName = formatPlayerName(playerName);
            let finalCat = category;
            let finalPartnerName = partnerName ? formatPlayerName(partnerName) : undefined;

            try {
                const { data: prof } = await supabase.from('profiles').select('name, lastname, category').eq('id', playerId).single();
                if (prof) {
                    finalName = formatPlayerName(prof.name, prof.lastname);
                    finalCat = prof.category || finalCat;
                }
                if (partnerId) {
                    const { data: pProf } = await supabase.from('profiles').select('name, lastname').eq('id', partnerId).single();
                    if (pProf) {
                        finalPartnerName = formatPlayerName(pProf.name, pProf.lastname);
                    }
                }
            } catch (e) {
                console.log("Fallback to raw playerName");
            }

            const teamName = finalPartnerName ? `${finalName} / ${finalPartnerName}` : finalName;

            const { error } = await supabase.from('tournament_players').insert({
                tournament_id: tournamentId,
                player_id: playerId,
                player_name: teamName,
                name: teamName,
                category: finalCat,
                payment_status: 'pending',
                fee_amount: fee || 0,
                paid: false
            });
            if (error) throw error;
        },
        async manualEnroll(tournamentId: string, params: {
            playerId?: string;
            playerName: string;
            category: string;
            fee?: number;
            paymentStatus?: 'pending' | 'paid';
            partnerId?: string;
            partnerName?: string;
        }) {
            let finalName = formatPlayerName(params.playerName);
            let finalCat = params.category;
            let finalPartnerName = params.partnerName ? formatPlayerName(params.partnerName) : undefined;

            if (params.playerId) {
                try {
                    const { data: prof } = await supabase.from('profiles').select('name, lastname, category').eq('id', params.playerId).single();
                    if (prof) {
                        finalName = formatPlayerName(prof.name, prof.lastname);
                        finalCat = prof.category || finalCat;
                    }
                } catch (e) {}
            }

            if (params.partnerId) {
                try {
                    const { data: pProf } = await supabase.from('profiles').select('name, lastname').eq('id', params.partnerId).single();
                    if (pProf) {
                        finalPartnerName = formatPlayerName(pProf.name, pProf.lastname);
                    }
                } catch (e) {}
            }

            const teamName = finalPartnerName ? `${finalName} / ${finalPartnerName}` : finalName;

            const insertData: any = {
                tournament_id: tournamentId,
                player_name: teamName,
                name: teamName,
                category: finalCat,
                payment_status: params.paymentStatus || 'pending',
                fee_amount: params.fee || 0,
                paid: params.paymentStatus === 'paid'
            };
            if (params.playerId) {
                insertData.player_id = params.playerId;
            }
            const { data, error } = await supabase
                .from('tournament_players')
                .insert(insertData)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        async unenroll(enrollmentId: string) {
            const { error } = await supabase
                .from('tournament_players')
                .delete()
                .eq('id', enrollmentId);
            if (error) throw error;
            return true;
        },
        async updatePaymentStatus(enrollmentId: string, paymentStatus: 'pending' | 'paid') {
            const { error } = await supabase
                .from('tournament_players')
                .update({ payment_status: paymentStatus })
                .eq('id', enrollmentId);
            if (error) throw error;
            return true;
        },
        async replacePlayer(tournamentId: string, oldPlayer: { id: string; player_id?: string; player_name?: string; name?: string }, newParams: {
            playerId?: string;
            playerName: string;
            category: string;
            partnerId?: string;
            partnerName?: string;
        }) {
            let finalName = formatPlayerName(newParams.playerName);
            let finalCat = newParams.category;
            let finalPartnerName = newParams.partnerName ? formatPlayerName(newParams.partnerName) : undefined;

            if (newParams.playerId) {
                try {
                    const { data: prof } = await supabase.from('profiles').select('name, lastname, category').eq('id', newParams.playerId).single();
                    if (prof) {
                        finalName = formatPlayerName(prof.name, prof.lastname);
                        finalCat = prof.category || finalCat;
                    }
                } catch (e) {}
            }

            if (newParams.partnerId) {
                try {
                    const { data: pProf } = await supabase.from('profiles').select('name, lastname').eq('id', newParams.partnerId).single();
                    if (pProf) {
                        finalPartnerName = formatPlayerName(pProf.name, pProf.lastname);
                    }
                } catch (e) {}
            }

            const teamName = finalPartnerName ? `${finalName} / ${finalPartnerName}` : finalName;

            // 1. Update tournament_players row
            const updatePayload: any = {
                player_id: newParams.playerId || null,
                player_name: teamName,
                name: teamName,
                category: finalCat
            };

            const { error: tpError } = await supabase
                .from('tournament_players')
                .update(updatePayload)
                .eq('id', oldPlayer.id);

            if (tpError) throw tpError;

            // 2. Update matches of this tournament where old player is player1 or player2
            const oldIds = [oldPlayer.player_id, oldPlayer.id].filter(Boolean) as string[];
            const oldRawName = oldPlayer.player_name || oldPlayer.name;

            const { data: matches, error: mError } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId);

            if (!mError && matches && matches.length > 0) {
                const newPlayerId = newParams.playerId || oldPlayer.id;

                for (const m of matches) {
                    const updates: any = {};

                    const isP1 = (m.player1_id && oldIds.includes(m.player1_id)) || (oldRawName && m.player1_name === oldRawName);
                    const isP2 = (m.player2_id && oldIds.includes(m.player2_id)) || (oldRawName && m.player2_name === oldRawName);

                    if (isP1) {
                        updates.player1_id = newPlayerId;
                        updates.player1_name = teamName;
                        if (newParams.partnerId || finalPartnerName) {
                            updates.player1_partner_id = newParams.partnerId || null;
                            updates.player1_partner_name = finalPartnerName || null;
                            updates.team1_name = teamName;
                        }
                    }

                    if (isP2) {
                        updates.player2_id = newPlayerId;
                        updates.player2_name = teamName;
                        if (newParams.partnerId || finalPartnerName) {
                            updates.player2_partner_id = newParams.partnerId || null;
                            updates.player2_partner_name = finalPartnerName || null;
                            updates.team2_name = teamName;
                        }
                    }

                    if (Object.keys(updates).length > 0) {
                        await supabase.from('matches').update(updates).eq('id', m.id);
                    }
                }
            }

            return true;
        },
        async getByTournament(tournamentId: string) {
            const { data: players, error } = await supabase.from('tournament_players').select('*').eq('tournament_id', tournamentId);
            if (error) throw error;

            const playerIds = (players || []).map(p => p.player_id).filter(Boolean);
            const partnerIds = (players || []).map(p => p.partner_id).filter(Boolean);
            const allProfileIds = Array.from(new Set([...playerIds, ...partnerIds]));

            const profileMap = new Map();
            if (allProfileIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('id, name, lastname, category').in('id', allProfileIds);
                (profiles || []).forEach(p => profileMap.set(p.id, p));
            }

            return (players || []).map(p => {
                const prof = profileMap.get(p.player_id);
                const rawName = prof ? prof.name : (p.name || p.player_name);
                const rawLastname = prof ? prof.lastname : '';
                const formattedName = formatPlayerName(rawName, rawLastname);

                let partnerFormattedName = p.partner_name;
                if (p.partner_id) {
                    const partnerProf = profileMap.get(p.partner_id);
                    if (partnerProf) {
                        partnerFormattedName = formatPlayerName(partnerProf.name, partnerProf.lastname);
                    }
                }

                return {
                    ...p,
                    player_name: formattedName,
                    category: prof?.category || p.category,
                    partner_name: partnerFormattedName,
                    team_name: p.team_name || (partnerFormattedName ? `${formattedName} / ${partnerFormattedName}` : formattedName)
                };
            });
        }
    },
    matches: {
        async updateScore(matchId: string, score: any, winnerId: string, user?: UserProfile, isDoubles?: boolean, winnerPartnerId?: string) {
            const { data: matchData } = await supabase.from('matches').select('*, tournaments(name, institution_id)').eq('id', matchId).single();

            const isOrgOrSuperAdmin = user && (
                user.role === 'superadmin' || 
                (user.role === 'admin' && user.institution_id === matchData?.tournaments?.institution_id)
            );

            const scoreStatus = isOrgOrSuperAdmin ? 'confirmed' : 'pending_confirmation';
            const nowIso = new Date().toISOString();

            const submitterName = user ? (
                user.role === 'superadmin' ? 'Administrador General' :
                user.role === 'admin' ? `Admin (${user.name || 'Organizador'})` :
                `${user.name || ''} ${user.lastname || ''}`.trim() || 'Jugador'
            ) : 'Usuario del Sistema';

            const updatePayload: any = {
                score,
                winner_id: winnerId,
                scheduling_status: 'confirmed',
                score_status: scoreStatus,
                score_submitted_by: user?.id || null,
                score_submitted_by_name: submitterName,
                score_submitted_at: nowIso,
                played_at: nowIso,
                is_played: true
            };

            if (matchData) {
                if (winnerId === matchData.player1_id) updatePayload.winner_name = matchData.player1_name;
                else if (winnerId === matchData.player2_id) updatePayload.winner_name = matchData.player2_name;
            }

            if (isDoubles && winnerPartnerId) {
                updatePayload.winner_partner_id = winnerPartnerId;
            }

            if (scoreStatus === 'confirmed') {
                updatePayload.score_confirmed_at = nowIso;
            }

            // Attempt update with full payload; if column missing in DB cache, fallback to safe base payload
            try {
                const { error } = await supabase.from('matches').update(updatePayload).eq('id', matchId);
                if (error) throw error;
            } catch (err: any) {
                console.warn("Full match score update failed (schema cache mismatch), using resilient fallback payload:", err);
                const safePayload: any = {
                    score: {
                        ...score,
                        submitted_by_name: submitterName,
                        submitted_at: nowIso
                    },
                    winner_id: winnerId,
                    scheduling_status: 'confirmed',
                    played_at: nowIso,
                    is_played: true
                };
                if (matchData) {
                    if (winnerId === matchData.player1_id) safePayload.winner_name = matchData.player1_name;
                    else if (winnerId === matchData.player2_id) safePayload.winner_name = matchData.player2_name;
                }
                const { error: fallbackErr } = await supabase.from('matches').update(safePayload).eq('id', matchId);
                if (fallbackErr) throw fallbackErr;
            }

            // If confirmed immediately (by Admin/SuperAdmin), award wins and points
            if (scoreStatus === 'confirmed' && winnerId) {
                try {
                    // Winner 1
                    const { data: winnerProfile } = await supabase.from('profiles').select('matches_won').eq('id', winnerId).single();
                    if (winnerProfile) {
                        await supabase.from('profiles').update({
                            matches_won: (winnerProfile.matches_won || 0) + 1
                        }).eq('id', winnerId);
                    }

                    await supabase.from('ranking_history').insert({
                        player_id: winnerId,
                        points: 50,
                        tournament_name: matchData?.tournaments?.name || 'Torneo Oficial',
                        date_obtained: nowIso,
                        year: new Date().getFullYear()
                    });

                    // Winner 2 (Doubles partner)
                    if (isDoubles && winnerPartnerId) {
                        const { data: partnerProfile } = await supabase.from('profiles').select('matches_won').eq('id', winnerPartnerId).single();
                        if (partnerProfile) {
                            await supabase.from('profiles').update({
                                matches_won: (partnerProfile.matches_won || 0) + 1
                            }).eq('id', winnerPartnerId);
                        }
                        await supabase.from('ranking_history').insert({
                            player_id: winnerPartnerId,
                            points: 50,
                            tournament_name: matchData?.tournaments?.name || 'Torneo Oficial (Dobles)',
                            date_obtained: nowIso,
                            year: new Date().getFullYear()
                        });
                    }
                } catch (rankingErr) {
                    console.log("Ranking point auto-update fallback (non-blocking):", rankingErr);
                }
            }

            // If editing an existing finished match where winner changed, revert stats from old winner
            if (matchData && matchData.is_played && matchData.winner_id && matchData.winner_id !== winnerId) {
                try {
                    const oldWinnerId = matchData.winner_id;
                    const { data: oldWp } = await supabase.from('profiles').select('matches_won').eq('id', oldWinnerId).single();
                    if (oldWp && (oldWp.matches_won || 0) > 0) {
                        await supabase.from('profiles').update({ matches_won: oldWp.matches_won - 1 }).eq('id', oldWinnerId);
                    }
                    if (matchData.winner_partner_id) {
                        const { data: oldPartner } = await supabase.from('profiles').select('matches_won').eq('id', matchData.winner_partner_id).single();
                        if (oldPartner && (oldPartner.matches_won || 0) > 0) {
                            await supabase.from('profiles').update({ matches_won: oldPartner.matches_won - 1 }).eq('id', matchData.winner_partner_id);
                        }
                    }
                } catch (revertErr) {
                    console.warn("Revert old winner stats fallback:", revertErr);
                }
            }

            return { scoreStatus };
        },

        async resetScore(matchId: string, user?: UserProfile) {
            const { data: matchData } = await supabase.from('matches').select('*, tournaments(name, institution_id)').eq('id', matchId).single();
            if (!matchData) throw new Error("Partido no encontrado");

            // Revert winner matches_won count if was recorded
            if (matchData.winner_id && matchData.is_played) {
                try {
                    const { data: wp } = await supabase.from('profiles').select('matches_won').eq('id', matchData.winner_id).single();
                    if (wp && (wp.matches_won || 0) > 0) {
                        await supabase.from('profiles').update({ matches_won: wp.matches_won - 1 }).eq('id', matchData.winner_id);
                    }
                    if (matchData.winner_partner_id) {
                        const { data: partnerWp } = await supabase.from('profiles').select('matches_won').eq('id', matchData.winner_partner_id).single();
                        if (partnerWp && (partnerWp.matches_won || 0) > 0) {
                            await supabase.from('profiles').update({ matches_won: partnerWp.matches_won - 1 }).eq('id', matchData.winner_partner_id);
                        }
                    }
                } catch (revertStatsErr) {
                    console.warn("Could not revert winner matches_won on reset:", revertStatsErr);
                }
            }

            const resetPayload: any = {
                score: null,
                winner_id: null,
                winner_name: null,
                winner_partner_id: null,
                scheduling_status: 'confirmed',
                score_status: null,
                score_submitted_by: null,
                score_submitted_by_name: null,
                score_submitted_at: null,
                score_confirmed_at: null,
                score_dispute_reason: null,
                played_at: null,
                is_played: false
            };

            try {
                const { error } = await supabase.from('matches').update(resetPayload).eq('id', matchId);
                if (error) throw error;
            } catch (err: any) {
                console.warn("Full reset failed, using safe fallback:", err);
                const safeReset = {
                    score: null,
                    winner_id: null,
                    winner_name: null,
                    scheduling_status: 'confirmed',
                    played_at: null,
                    is_played: false
                };
                const { error: fallbackErr } = await supabase.from('matches').update(safeReset).eq('id', matchId);
                if (fallbackErr) throw fallbackErr;
            }

            return true;
        },

        async confirmScore(matchId: string, user: UserProfile) {
            const { data: matchData } = await supabase.from('matches').select('*, tournaments(name)').eq('id', matchId).single();
            if (!matchData) throw new Error("Partido no encontrado");

            const nowIso = new Date().toISOString();
            try {
                const { error } = await supabase.from('matches').update({
                    score_status: 'confirmed',
                    score_confirmed_at: nowIso,
                    scheduling_status: 'finished',
                    is_played: true,
                    played_at: nowIso
                }).eq('id', matchId);
                if (error) throw error;
            } catch (confirmErr) {
                console.warn("confirmScore column fallback:", confirmErr);
                await supabase.from('matches').update({
                    scheduling_status: 'finished',
                    is_played: true,
                    played_at: nowIso
                }).eq('id', matchId);
            }

            // Award wins and points to winner(s)
            if (matchData.winner_id) {
                try {
                    const { data: winnerProfile } = await supabase.from('profiles').select('matches_won').eq('id', matchData.winner_id).single();
                    if (winnerProfile) {
                        await supabase.from('profiles').update({
                            matches_won: (winnerProfile.matches_won || 0) + 1
                        }).eq('id', matchData.winner_id);
                    }

                    await supabase.from('ranking_history').insert({
                        player_id: matchData.winner_id,
                        points: 50,
                        tournament_name: matchData.tournaments?.name || 'Torneo Oficial',
                        date_obtained: nowIso,
                        year: new Date().getFullYear()
                    });

                    if (matchData.winner_partner_id) {
                        const { data: partnerProfile } = await supabase.from('profiles').select('matches_won').eq('id', matchData.winner_partner_id).single();
                        if (partnerProfile) {
                            await supabase.from('profiles').update({
                                matches_won: (partnerProfile.matches_won || 0) + 1
                            }).eq('id', matchData.winner_partner_id);
                        }
                        await supabase.from('ranking_history').insert({
                            player_id: matchData.winner_partner_id,
                            points: 50,
                            tournament_name: matchData.tournaments?.name || 'Torneo Oficial (Dobles)',
                            date_obtained: nowIso,
                            year: new Date().getFullYear()
                        });
                    }
                } catch (e) {
                    console.warn("Error awarding points on confirmation:", e);
                }
            }

            return true;
        },

        async disputeScore(matchId: string, reason: string, user: UserProfile) {
            try {
                const { error } = await supabase.from('matches').update({
                    score_status: 'disputed',
                    score_dispute_reason: reason
                }).eq('id', matchId);
                if (error) throw error;
            } catch (e) {
                console.warn("disputeScore column fallback, saving to proposal_data:", e);
                await supabase.from('matches').update({
                    proposal_data: { score_disputed: true, dispute_reason: reason, disputed_by: user.id }
                }).eq('id', matchId);
            }
            return true;
        },

        async getHeadToHead(player1Id: string, player2Id: string) {
            // Fetch both profiles
            const [
                { data: p1Data },
                { data: p2Data },
                { data: matchesData }
            ] = await Promise.all([
                supabase.from('profiles').select('id, name, lastname, category, avatar_url, profile_picture_url').eq('id', player1Id).single(),
                supabase.from('profiles').select('id, name, lastname, category, avatar_url, profile_picture_url').eq('id', player2Id).single(),
                supabase.from('matches').select('*, tournaments(name)').or(`and(player1_id.eq.${player1Id},player2_id.eq.${player2Id}),and(player1_id.eq.${player2Id},player2_id.eq.${player1Id})`).order('created_at', { ascending: false })
            ]);

            const p1 = {
                id: player1Id,
                name: p1Data ? formatPlayerName(p1Data.name, p1Data.lastname) : 'Jugador 1',
                lastname: p1Data?.lastname,
                category: p1Data?.category || '4ta',
                avatar_url: p1Data?.profile_picture_url || p1Data?.avatar_url
            };

            const p2 = {
                id: player2Id,
                name: p2Data ? formatPlayerName(p2Data.name, p2Data.lastname) : 'Jugador 2',
                lastname: p2Data?.lastname,
                category: p2Data?.category || '4ta',
                avatar_url: p2Data?.profile_picture_url || p2Data?.avatar_url
            };

            const allMatches = matchesData || [];
            let p1Wins = 0;
            let p2Wins = 0;
            let p1SetsWon = 0;
            let p2SetsWon = 0;
            let p1GamesWon = 0;
            let p2GamesWon = 0;

            const formattedMatchesList: any[] = [];

            allMatches.forEach(m => {
                const isP1Player1 = m.player1_id === player1Id;
                const winnerIsP1 = m.winner_id === player1Id;
                const winnerIsP2 = m.winner_id === player2Id;

                if (winnerIsP1) p1Wins++;
                else if (winnerIsP2) p2Wins++;

                // Parse sets and games if score exists
                if (m.score) {
                    if (typeof m.score === 'object') {
                        ['set1', 'set2', 'set3'].forEach(setKey => {
                            const val = m.score[setKey];
                            if (val && typeof val === 'string' && val.includes('-')) {
                                const [g1Str, g2Str] = val.split('-');
                                const g1 = parseInt(g1Str) || 0;
                                const g2 = parseInt(g2Str) || 0;
                                const myGames = isP1Player1 ? g1 : g2;
                                const theirGames = isP1Player1 ? g2 : g1;
                                p1GamesWon += myGames;
                                p2GamesWon += theirGames;
                                if (myGames > theirGames) p1SetsWon++;
                                else if (theirGames > myGames) p2SetsWon++;
                            }
                        });
                    }
                }

                formattedMatchesList.push({
                    id: m.id,
                    date: m.created_at || m.scheduled_at || new Date().toISOString(),
                    tournament_name: m.tournaments?.name || 'Desafío / Amistoso',
                    round: m.round || 'Partido Oficial',
                    score: m.score,
                    winner_id: m.winner_id,
                    winner_name: m.winner_id === player1Id ? p1.name : m.winner_id === player2Id ? p2.name : undefined
                });
            });

            // Calculate streak
            let streakCount = 0;
            let streakWinnerId: string | null = null;
            for (const m of formattedMatchesList) {
                if (!m.winner_id) continue;
                if (!streakWinnerId) {
                    streakWinnerId = m.winner_id;
                    streakCount = 1;
                } else if (streakWinnerId === m.winner_id) {
                    streakCount++;
                } else {
                    break;
                }
            }

            return {
                player1: p1,
                player2: p2,
                totalMatches: allMatches.length,
                player1Wins: p1Wins,
                player2Wins: p2Wins,
                player1SetsWon: p1SetsWon,
                player2SetsWon: p2SetsWon,
                player1GamesWon: p1GamesWon,
                player2GamesWon: p2GamesWon,
                lastWinnerId: formattedMatchesList.length > 0 ? formattedMatchesList[0].winner_id : undefined,
                streakCount,
                streakWinnerName: streakWinnerId === player1Id ? p1.name : streakWinnerId === player2Id ? p2.name : undefined,
                matches: formattedMatchesList
            };
        },

        async updateSchedule(matchId: string, params: { 
            scheduled_at: string | null; 
            court_name: string | null; 
            court_slot_id?: string | null;
            institution_id?: string;
            tournament_name?: string;
            player1_name?: string;
            player2_name?: string;
            player1_id?: string;
            player2_id?: string;
            duration_minutes?: number;
            override_conflict_booking_id?: string;
        }) {
            const nowIso = new Date().toISOString();
            const proposalDataPatch = {
                scheduled_at: params.scheduled_at,
                court_name: params.court_name,
                updated_at: nowIso
            };

            const fullPayload: any = {
                scheduled_at: params.scheduled_at,
                court_name: params.court_name,
                court_slot_id: params.court_slot_id || params.court_name || null,
                scheduling_status: params.scheduled_at ? 'confirmed' : 'proposed'
            };

            let updatedMatch: any = null;

            try {
                // Fetch current proposal_data to merge
                const { data: currentMatch } = await supabase.from('matches').select('proposal_data').eq('id', matchId).single();
                fullPayload.proposal_data = {
                    ...(currentMatch?.proposal_data || {}),
                    ...proposalDataPatch
                };

                const { data, error } = await supabase.from('matches').update(fullPayload).eq('id', matchId).select();
                if (error) throw error;
                updatedMatch = data && data.length > 0 ? data[0] : null;
            } catch (err: any) {
                console.warn("Full match schedule update notice (fallback resilient payload):", err);
                const safePayload: any = {
                    scheduled_at: params.scheduled_at,
                    court_slot_id: params.court_slot_id || params.court_name || null,
                    scheduling_status: params.scheduled_at ? 'confirmed' : 'proposed',
                    proposal_data: proposalDataPatch
                };
                const { data, error: fallbackErr } = await supabase.from('matches').update(safePayload).eq('id', matchId).select();
                if (fallbackErr) {
                    console.error("Match schedule update error:", fallbackErr);
                    throw fallbackErr;
                }
                updatedMatch = data && data.length > 0 ? data[0] : null;
            }

            // --- SYNC WITH CLUB BOOKINGS TABLE ---
            try {
                if (params.scheduled_at && params.institution_id) {
                    const schedDateObj = new Date(params.scheduled_at);
                    if (!isNaN(schedDateObj.getTime())) {
                        const schedDateStr = schedDateObj.toISOString().split('T')[0];
                        const startH = String(schedDateObj.getHours()).padStart(2, '0');
                        const startM = String(schedDateObj.getMinutes()).padStart(2, '0');
                        const startTimeStr = `${startH}:${startM}`;

                        const durationMin = params.duration_minutes || 90;
                        const endMinutesTotal = schedDateObj.getHours() * 60 + schedDateObj.getMinutes() + durationMin;
                        const endH = String(Math.floor(endMinutesTotal / 60) % 24).padStart(2, '0');
                        const endM = String(endMinutesTotal % 60).padStart(2, '0');
                        const endTimeStr = `${endH}:${endM}`;

                        const courtFinal = params.court_name || 'Cancha 1';
                        const p1Display = params.player1_name || 'Jugador 1';
                        const p2Display = params.player2_name || 'Jugador 2';
                        const tournamentTitle = params.tournament_name 
                            ? `🏆 Torneo (${params.tournament_name}): ${p1Display} vs ${p2Display}`
                            : `🏆 Torneo: ${p1Display} vs ${p2Display}`;

                        // If organizer requested overriding an existing conflicting booking
                        if (params.override_conflict_booking_id) {
                            try {
                                await supabase
                                    .from('bookings')
                                    .update({ 
                                        status: 'cancelled', 
                                        title: `[Reubicado por Torneo]`,
                                        cancellation_reason: 'admin'
                                    })
                                    .eq('id', params.override_conflict_booking_id);
                            } catch (ovErr) {
                                console.warn("Could not cancel conflicting booking:", ovErr);
                            }
                        }

                        // Check if a tournament booking already exists for this match
                        const { data: existingBookings } = await supabase
                            .from('bookings')
                            .select('id')
                            .eq('match_id', matchId);

                        const participants = [
                            { name: p1Display, user_id: params.player1_id, is_registered: !!params.player1_id },
                            { name: p2Display, user_id: params.player2_id, is_registered: !!params.player2_id }
                        ];

                        if (existingBookings && existingBookings.length > 0) {
                            // Update existing booking
                            await api.bookings.update(existingBookings[0].id, {
                                date: schedDateStr,
                                start_time: startTimeStr,
                                end_time: endTimeStr,
                                court_name: courtFinal,
                                title: tournamentTitle,
                                status: 'confirmed',
                                participants
                            });
                        } else {
                            // Create new tournament booking
                            const newBookingPayload: Partial<Booking> = {
                                institution_id: params.institution_id,
                                date: schedDateStr,
                                start_time: startTimeStr,
                                end_time: endTimeStr,
                                court_name: courtFinal,
                                status: 'confirmed',
                                booking_type: 'tournament',
                                match_id: matchId,
                                title: tournamentTitle,
                                total_price: 0,
                                user_id: params.player1_id || params.player2_id || undefined,
                                participants
                            };
                            await api.bookings.create(newBookingPayload);
                        }
                    }
                } else if (!params.scheduled_at) {
                    // Match was unscheduled: delete/cancel any linked tournament booking
                    try {
                        await supabase.from('bookings').delete().eq('match_id', matchId);
                    } catch (delErr) {
                        console.warn("Could not delete unlinked tournament booking:", delErr);
                    }
                }
            } catch (bookingSyncErr) {
                console.warn("Notice during match-booking calendar sync:", bookingSyncErr);
            }

            return updatedMatch;
        },

        async getByUser(userId: string) {
            const { data, error } = await supabase
                .from('matches')
                .select('*, tournaments(name, institution_id, institutions(name))')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId},player1_partner_id.eq.${userId},player2_partner_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) return [];
            return (data || []).map((m: any) => ({
                ...m,
                scheduled_at: m.scheduled_at || m.proposal_data?.scheduled_at || null,
                court_name: m.court_name || m.proposal_data?.court_name || m.court_slot_id || null,
                player1_name: formatPlayerName(m.player1_name),
                player2_name: formatPlayerName(m.player2_name),
                player1_partner_name: m.player1_partner_name ? formatPlayerName(m.player1_partner_name) : undefined,
                player2_partner_name: m.player2_partner_name ? formatPlayerName(m.player2_partner_name) : undefined
            })) as Match[];
        }
    },
    matchmaking: {
        async getPosts(institutionId?: string, category?: string, type?: 'singles' | 'doubles'): Promise<MatchmakingPost[]> {
            try {
                // Try from matchmaking_posts table
                let query = supabase.from('matchmaking_posts').select('*').eq('status', 'open').order('created_at', { ascending: false });
                if (institutionId && institutionId !== 'all') query = query.eq('institution_id', institutionId);
                if (type) query = query.eq('type', type);
                
                const { data, error } = await query;
                if (!error && data) {
                    return data as MatchmakingPost[];
                }
            } catch (e) {}

            // Graceful fallback from system_settings JSON
            try {
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'matchmaking_posts').single();
                if (setting?.value && Array.isArray(setting.value)) {
                    let list = setting.value as MatchmakingPost[];
                    list = list.filter(p => p.status === 'open');
                    if (institutionId && institutionId !== 'all') list = list.filter(p => p.institution_id === institutionId);
                    if (category && category !== 'all') list = list.filter(p => p.category === category);
                    if (type) list = list.filter(p => p.type === type);
                    return list;
                }
            } catch (e) {}

            return [];
        },

        async createPost(post: Partial<MatchmakingPost>) {
            const newPost: MatchmakingPost = {
                id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                user_id: post.user_id || '',
                user_name: formatPlayerName(post.user_name || 'Jugador', post.user_lastname),
                user_lastname: post.user_lastname,
                user_phone: post.user_phone,
                user_avatar: post.user_avatar,
                user_category: post.user_category || '4ta',
                type: post.type || 'singles',
                category: post.category || '4ta',
                institution_id: post.institution_id,
                institution_name: post.institution_name,
                date: post.date,
                time_slot: post.time_slot,
                has_court_booked: post.has_court_booked || false,
                court_name: post.court_name,
                description: post.description || '',
                created_at: new Date().toISOString(),
                status: 'open'
            };

            // 1. Try table insert
            try {
                const { data, error } = await supabase.from('matchmaking_posts').insert(newPost).select().single();
                if (!error && data) return data;
            } catch (e) {}

            // 2. Fallback to system_settings
            try {
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'matchmaking_posts').single();
                const existing = (setting?.value && Array.isArray(setting.value)) ? setting.value : [];
                const updated = [newPost, ...existing].slice(0, 50); // Keep latest 50
                await supabase.from('system_settings').upsert({ key: 'matchmaking_posts', value: updated, updated_at: new Date() });
                return newPost;
            } catch (e) {
                console.error("Matchmaking fallback save:", e);
                return newPost;
            }
        },

        async deletePost(postId: string) {
            try {
                await supabase.from('matchmaking_posts').delete().eq('id', postId);
            } catch (e) {}

            try {
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'matchmaking_posts').single();
                if (setting?.value && Array.isArray(setting.value)) {
                    const filtered = setting.value.filter((p: any) => p.id !== postId);
                    await supabase.from('system_settings').upsert({ key: 'matchmaking_posts', value: filtered, updated_at: new Date() });
                }
            } catch (e) {}
            return true;
        },

        async markMatched(postId: string, user: UserProfile) {
            try {
                await supabase.from('matchmaking_posts').update({
                    status: 'matched',
                    matched_with_user_id: user.id,
                    matched_with_name: formatPlayerName(user.name, user.lastname)
                }).eq('id', postId);
            } catch (e) {}

            try {
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'matchmaking_posts').single();
                if (setting?.value && Array.isArray(setting.value)) {
                    const updated = setting.value.map((p: any) => {
                        if (p.id === postId) {
                            return {
                                ...p,
                                status: 'matched',
                                matched_with_user_id: user.id,
                                matched_with_name: formatPlayerName(user.name, user.lastname)
                            };
                        }
                        return p;
                    });
                    await supabase.from('system_settings').upsert({ key: 'matchmaking_posts', value: updated, updated_at: new Date() });
                }
            } catch (e) {}
            return true;
        }
    },
    bookings: {
        async getByUser(userId: string) {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, institutions(name)')
                .order('date', { ascending: false });

            if (error) {
                console.error("Error fetching bookings:", error);
                return [];
            }

            const rawBookings = (data || []) as Booking[];

            // Collect user IDs to resolve profiles
            const userIds = new Set<string>();
            rawBookings.forEach(b => {
                if (b.user_id) userIds.add(b.user_id);
                const parts = b.participants || (b.extras as any)?.participants;
                if (Array.isArray(parts)) {
                    parts.forEach((p: any) => {
                        if (p.user_id) userIds.add(p.user_id);
                    });
                }
            });

            const profileMap = new Map<string, any>();
            if (userIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, lastname, avatar_url, profile_picture_url, category')
                    .in('id', Array.from(userIds));
                (profiles || []).forEach(p => profileMap.set(p.id, p));
            }

            const enriched = rawBookings.map(b => {
                let parts: BookingParticipant[] = b.participants || (b.extras as any)?.participants || [];
                const creatorProf = profileMap.get(b.user_id);
                const creatorFormatted = creatorProf ? formatPlayerName(creatorProf.name, creatorProf.lastname) : undefined;

                if (parts && parts.length > 0) {
                    parts = parts.map(p => {
                        if (p.user_id && profileMap.has(p.user_id)) {
                            const prof = profileMap.get(p.user_id);
                            return {
                                ...p,
                                name: formatPlayerName(prof.name, prof.lastname),
                                lastname: prof.lastname || p.lastname,
                                avatar_url: prof.profile_picture_url || prof.avatar_url || p.avatar_url
                            };
                        }
                        return { ...p, name: formatPlayerName(p.name, p.lastname) };
                    });
                } else if (creatorProf) {
                    parts = [{
                        user_id: creatorProf.id,
                        name: creatorFormatted || 'Jugador',
                        lastname: creatorProf.lastname,
                        is_registered: true,
                        avatar_url: creatorProf.profile_picture_url || creatorProf.avatar_url
                    }];
                }

                const genericTitles = ['reserva de cancha', 'alquiler', 'guest', 'turno de cancha', 'turno', ''];
                let resolvedTitle = b.title;
                const isGeneric = !resolvedTitle || genericTitles.includes(resolvedTitle.trim().toLowerCase());

                if (isGeneric) {
                    if (parts && parts.length > 0) {
                        resolvedTitle = parts.map(p => p.name).join(' vs ');
                    } else if (creatorFormatted) {
                        resolvedTitle = creatorFormatted;
                    }
                }

                return {
                    ...b,
                    participants: parts,
                    user_name: creatorFormatted,
                    title: resolvedTitle,
                    profiles: creatorProf
                };
            });

            return enriched.filter(b => {
                if (b.deleted_by_user) return false;
                if (b.user_id === userId) return true;
                if (b.participants && Array.isArray(b.participants)) {
                    return b.participants.some((p: any) => p.user_id === userId);
                }
                return false;
            });
        },
        async getByInstitutionAndDate(institutionId: string, date: string) {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('date', date);

            if (error) throw error;
            const rawBookings = (data || []) as Booking[];

            // Collect all user IDs to resolve profiles (creator and participants)
            const userIds = new Set<string>();
            rawBookings.forEach(b => {
                if (b.user_id) userIds.add(b.user_id);
                const parts = b.participants || (b.extras as any)?.participants;
                if (Array.isArray(parts)) {
                    parts.forEach((p: any) => {
                        if (p.user_id) userIds.add(p.user_id);
                    });
                }
            });

            const profileMap = new Map<string, any>();
            if (userIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, lastname, avatar_url, profile_picture_url, category')
                    .in('id', Array.from(userIds));
                (profiles || []).forEach(p => profileMap.set(p.id, p));
            }

            return rawBookings.map(b => {
                let parts: BookingParticipant[] = b.participants || (b.extras as any)?.participants || [];
                const creatorProf = profileMap.get(b.user_id);
                const creatorFormatted = creatorProf ? formatPlayerName(creatorProf.name, creatorProf.lastname) : undefined;

                if (parts && parts.length > 0) {
                    parts = parts.map(p => {
                        if (p.user_id && profileMap.has(p.user_id)) {
                            const prof = profileMap.get(p.user_id);
                            return {
                                ...p,
                                name: formatPlayerName(prof.name, prof.lastname),
                                lastname: prof.lastname || p.lastname,
                                avatar_url: prof.profile_picture_url || prof.avatar_url || p.avatar_url
                            };
                        }
                        return { ...p, name: formatPlayerName(p.name, p.lastname) };
                    });
                } else if (creatorProf) {
                    parts = [{
                        user_id: creatorProf.id,
                        name: creatorFormatted || 'Jugador',
                        lastname: creatorProf.lastname,
                        is_registered: true,
                        avatar_url: creatorProf.profile_picture_url || creatorProf.avatar_url
                    }];
                }

                const genericTitles = ['reserva de cancha', 'alquiler', 'guest', 'turno de cancha', 'turno', ''];
                let resolvedTitle = b.title;
                const isGeneric = !resolvedTitle || genericTitles.includes(resolvedTitle.trim().toLowerCase());

                if (isGeneric) {
                    if (parts && parts.length > 0) {
                        resolvedTitle = parts.map(p => p.name).join(' vs ');
                    } else if (creatorFormatted) {
                        resolvedTitle = creatorFormatted;
                    } else {
                        resolvedTitle = b.booking_type === 'class' ? 'Clase' : b.booking_type === 'tournament' ? 'Torneo' : b.booking_type === 'maintenance' ? 'Mantenimiento' : 'Reserva';
                    }
                }

                return {
                    ...b,
                    participants: parts,
                    user_name: creatorFormatted,
                    title: resolvedTitle,
                    profiles: creatorProf
                };
            }) as Booking[];
        },
        async create(booking: Partial<Booking>, creatorProfile?: UserProfile | null) {
            let data: any;
            try {
                const res = await supabase.from('bookings').insert(booking).select().single();
                if (res.error) throw res.error;
                data = res.data;
            } catch (err: any) {
                console.warn("Booking insert fallback without unmigrated columns:", err);
                const safeBooking: any = { ...booking };
                if (booking.participants) {
                    safeBooking.extras = { ...(safeBooking.extras || {}), participants: booking.participants };
                    delete safeBooking.participants;
                }
                delete safeBooking.deleted_by_user;
                const resFallback = await supabase.from('bookings').insert(safeBooking).select().single();
                if (resFallback.error) throw resFallback.error;
                data = resFallback.data;
            }

            // Notify participants if any registered players were included
            if (booking.participants && Array.isArray(booking.participants)) {
                const creatorName = creatorProfile 
                    ? formatPlayerName(creatorProfile.name, creatorProfile.lastname) 
                    : 'Un organizador / usuario';

                const targetParticipants = booking.participants.filter(
                    (p: any) => p.user_id && p.user_id !== booking.user_id
                );

                for (const p of targetParticipants) {
                    try {
                        await api.messages.send({
                            sender_id: booking.user_id || 'system',
                            sender_name: creatorName,
                            receiver_id: p.user_id,
                            type: 'direct',
                            institution_id: booking.institution_id,
                            subject: `🎾 Cancha Reservada: ${booking.court_name || 'Cancha'} (${booking.date})`,
                            content: `¡Hola ${p.name}! ${creatorName} te agregó como participante en una reserva de cancha para el día ${booking.date} de ${booking.start_time} a ${booking.end_time} hs en ${booking.court_name || 'la cancha'}.`,
                            is_read: false
                        });
                    } catch (msgErr) {
                        console.warn(`No se pudo enviar notificación al jugador ${p.name}:`, msgErr);
                    }
                }
            }

            return data;
        },
        async update(id: string, updates: Partial<Booking>) {
            try {
                const { data, error } = await supabase.from('bookings').update(updates).eq('id', id).select();
                if (error) throw error;
                return (data && data.length > 0) ? data[0] : updates;
            } catch (err: any) {
                console.warn("Booking update fallback without unmigrated columns:", err);
                const safeUpdates: any = { ...updates };
                if (updates.participants) {
                    safeUpdates.extras = { ...(safeUpdates.extras || {}), participants: updates.participants };
                    delete safeUpdates.participants;
                }
                delete safeUpdates.deleted_by_user;
                const { data: fbData, error: fbErr } = await supabase.from('bookings').update(safeUpdates).eq('id', id).select();
                if (fbErr) throw fbErr;
                return (fbData && fbData.length > 0) ? fbData[0] : safeUpdates;
            }
        },
        async delete(id: string) {
            try {
                const { error } = await supabase.from('bookings').delete().eq('id', id);
                if (error) throw error;
                return { success: true };
            } catch (e) {
                try {
                    await supabase.from('bookings').update({ status: 'cancelled', deleted_by_user: true }).eq('id', id);
                } catch (softErr) {
                    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
                }
                return { success: true, method: 'soft_delete' };
            }
        },
        async hideFromUser(id: string) {
            try {
                const { error } = await supabase.from('bookings').update({ deleted_by_user: true }).eq('id', id);
                if (error) {
                    await supabase.from('bookings').delete().eq('id', id);
                }
            } catch (e) {
                try {
                    await supabase.from('bookings').delete().eq('id', id);
                } catch (delErr) {
                    console.error("Error hiding/deleting booking:", delErr);
                }
            }
            return true;
        },
        async bulkCancelByWeather(institutionId: string, date: string, startTime?: string, reason?: string, adminName: string = 'Administración del Club') {
            let query = supabase
                .from('bookings')
                .select('*')
                .eq('institution_id', institutionId)
                .eq('date', date)
                .neq('status', 'cancelled');

            if (startTime) {
                query = query.gte('start_time', startTime);
            }

            const { data: bookingsToCancel, error: fetchErr } = await query;
            if (fetchErr) throw fetchErr;

            const list = (bookingsToCancel || []) as Booking[];
            if (list.length === 0) return [];

            const ids = list.map(b => b.id);
            const cancellationTitle = reason ? `[Suspendido Clima] ${reason}` : '[Suspendido Clima] Lluvia / Mal Tiempo';

            const { data: updated, error: updateErr } = await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    title: cancellationTitle,
                    cancellation_reason: 'weather'
                })
                .in('id', ids)
                .select();

            if (updateErr) {
                // Fallback without cancellation_reason column if not yet migrated
                await supabase
                    .from('bookings')
                    .update({ status: 'cancelled', title: cancellationTitle })
                    .in('id', ids);
            }

            // Dispatch in-app notifications to all affected users
            for (const b of list) {
                const recipients = new Set<string>();
                if (b.user_id) recipients.add(b.user_id);
                if (b.participants && Array.isArray(b.participants)) {
                    b.participants.forEach(p => {
                        if (p.user_id) recipients.add(p.user_id);
                    });
                }

                for (const recipientId of Array.from(recipients)) {
                    try {
                        await api.messages.send({
                            sender_id: 'system',
                            sender_name: adminName,
                            receiver_id: recipientId,
                            type: 'direct',
                            institution_id: institutionId,
                            subject: `🌧️ Turno Suspendido por Clima: ${b.court_name} (${b.date})`,
                            content: `Atención: Tu turno de tenis programado para el día ${b.date} de ${b.start_time} a ${b.end_time} hs en ${b.court_name} ha sido suspendido por razones climáticas (lluvia / estado de canchas). Por favor contáctate con el club para reprogramar o coordinar tu turno.`,
                            is_read: false
                        });
                    } catch (msgErr) {
                        console.warn("Error notifying user of weather cancellation:", msgErr);
                    }
                }
            }

            return updated || list;
        },

        async createRecurring(baseBooking: Partial<Booking>, weeksCount: number = 4, creatorProfile?: UserProfile | null) {
            const recurrenceGroupId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const createdBookings: any[] = [];
            const [y, m, d] = (baseBooking.date || '').split('-').map(Number);
            const baseDate = new Date(y, m - 1, d);

            for (let week = 0; week < weeksCount; week++) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(baseDate.getDate() + (week * 7));
                const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

                const bookingPayload: Partial<Booking> = {
                    ...baseBooking,
                    date: targetDateStr,
                    is_recurring: true,
                    recurring_weeks: weeksCount,
                    recurrence_group_id: recurrenceGroupId,
                    title: baseBooking.title ? `${baseBooking.title} (Fijo #${week + 1})` : `Turno Fijo / Abonado (Semana ${week + 1})`
                };

                const res = await this.create(bookingPayload, creatorProfile);
                createdBookings.push(res);
            }

            return createdBookings;
        },

        async addToWaitlist(entry: {
            institution_id: string;
            date: string;
            start_time: string;
            court_name: string;
            user_id: string;
            user_name: string;
            user_phone?: string;
        }) {
            const newEntry: WaitlistEntry = {
                id: `wait-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                ...entry,
                status: 'waiting',
                created_at: new Date().toISOString()
            };

            // 1. Try waitlist table
            try {
                const { data, error } = await supabase.from('booking_waitlist').insert(newEntry).select().single();
                if (!error && data) return data as WaitlistEntry;
            } catch (e) {}

            // 2. Fallback to system_settings key
            try {
                const key = `waitlist_${entry.institution_id}_${entry.date}`;
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', key).single();
                const existing = (setting?.value && Array.isArray(setting.value)) ? setting.value : [];
                const updated = [...existing, newEntry];
                await supabase.from('system_settings').upsert({ key, value: updated, updated_at: new Date() });
                return newEntry;
            } catch (e) {
                console.error("Waitlist fallback error:", e);
                return newEntry;
            }
        },

        async getWaitlist(institutionId: string, date: string): Promise<WaitlistEntry[]> {
            try {
                const { data, error } = await supabase
                    .from('booking_waitlist')
                    .select('*')
                    .eq('institution_id', institutionId)
                    .eq('date', date)
                    .eq('status', 'waiting');
                if (!error && data) return data as WaitlistEntry[];
            } catch (e) {}

            try {
                const key = `waitlist_${institutionId}_${date}`;
                const { data: setting } = await supabase.from('system_settings').select('value').eq('key', key).single();
                if (setting?.value && Array.isArray(setting.value)) {
                    return (setting.value as WaitlistEntry[]).filter(w => w.status === 'waiting');
                }
            } catch (e) {}

            return [];
        },

        async notifyWaitlist(institutionId: string, date: string, courtName: string, startTime: string) {
            try {
                const list = await this.getWaitlist(institutionId, date);
                const matching = list.filter(w => w.start_time === startTime || !w.start_time);
                if (matching.length === 0) return null;

                const firstInLine = matching[0];
                await api.messages.send({
                    sender_id: 'system',
                    sender_name: 'Sistema de Turnos Smash',
                    receiver_id: firstInLine.user_id,
                    type: 'direct',
                    institution_id: institutionId,
                    subject: `🎾 ¡Cancha Liberada! ${courtName} (${date})`,
                    content: `¡Buenas noticias ${firstInLine.user_name}! Se acaba de liberar el turno en ${courtName} para el día ${date} a las ${startTime} hs. Ingresá a la sección de Canchas y Reservas para confirmar tu turno antes de que sea reservado por otro jugador.`,
                    is_read: false
                });

                return firstInLine;
            } catch (e) {
                console.warn("Error checking waitlist notification:", e);
                return null;
            }
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
        async delete(id: string) {
            const { error } = await supabase.from('institutions').delete().eq('id', id);
            if (error) throw error;
            return true;
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
            console.log(`📊 Calculando estadísticas financieras (${period})...`);
            
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date();

            if (period === 'day') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            } else if (period === 'week') {
                const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            }

            let txQuery = supabase
                .from('transactions')
                .select('*')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());

            let bookingQuery = supabase
                .from('bookings')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);

            let allHeatmapBookingsQuery = supabase
                .from('bookings')
                .select('*');

            if (institutionId && institutionId !== 'all') {
                txQuery = txQuery.eq('institution_id', institutionId);
                bookingQuery = bookingQuery.eq('institution_id', institutionId);
                allHeatmapBookingsQuery = allHeatmapBookingsQuery.eq('institution_id', institutionId);
            }

            const [
                { data: txs, error: txErr },
                { data: bookingsData, error: bookingErr },
                { data: allHeatmapData, error: heatmapErr }
            ] = await Promise.all([
                txQuery,
                bookingQuery,
                allHeatmapBookingsQuery
            ]);

            if (txErr) console.error("Error transactions:", txErr);
            if (bookingErr) console.error("Error bookings:", bookingErr);
            if (heatmapErr) console.error("Error heatmap bookings:", heatmapErr);

            const allTxs = txs || [];
            const periodBookings = bookingsData || [];
            const heatmapBookings = (allHeatmapData && allHeatmapData.length > 0) ? allHeatmapData : periodBookings;

            const income = allTxs.filter(t => t.type === 'income');
            const expense = allTxs.filter(t => t.type === 'expense');

            const totalIncome = income.reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const totalExpenses = expense.reduce((sum, t) => sum + Number(t.amount || 0), 0);

            // --- 1. DYNAMIC CASH FLOW CHART DATA ---
            let chartData: { day: string; shortDay?: string; income: number; expense: number }[] = [];

            if (period === 'day') {
                // 8 franjas horarias de 2 horas (08:00 a 22:00)
                const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
                const daySlotMap = slots.map(s => ({ label: s, income: 0, expense: 0 }));

                allTxs.forEach(t => {
                    const d = new Date(t.date);
                    const h = d.getHours();
                    let slotIdx = Math.floor((h - 8) / 2);
                    if (slotIdx < 0) slotIdx = 0;
                    if (slotIdx >= slots.length) slotIdx = slots.length - 1;

                    if (t.type === 'income') daySlotMap[slotIdx].income += Number(t.amount || 0);
                    else daySlotMap[slotIdx].expense += Number(t.amount || 0);
                });

                chartData = daySlotMap.map(s => ({ day: s.label, income: s.income, expense: s.expense }));
            } else if (period === 'week') {
                // 7 días de la semana: Lun a Dom con número de día
                const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                const weekMap = weekDayNames.map((name, i) => {
                    const d = new Date(startDate);
                    d.setDate(startDate.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    return {
                        day: `${name} ${d.getDate()}`,
                        shortDay: name,
                        dateStr: dateStr,
                        income: 0,
                        expense: 0
                    };
                });

                allTxs.forEach(t => {
                    const tDate = new Date(t.date).toISOString().split('T')[0];
                    const match = weekMap.find(w => w.dateStr === tDate);
                    if (match) {
                        if (t.type === 'income') match.income += Number(t.amount || 0);
                        else match.expense += Number(t.amount || 0);
                    }
                });

                chartData = weekMap.map(w => ({ day: w.day, shortDay: w.shortDay, income: w.income, expense: w.expense }));
            } else if (period === 'month') {
                // Semanas del mes en curso
                const lastDayOfMonth = endDate.getDate();
                const monthWeeks = [
                    { day: 'Sem 1 (1-7)', minDay: 1, maxDay: 7, income: 0, expense: 0 },
                    { day: 'Sem 2 (8-14)', minDay: 8, maxDay: 14, income: 0, expense: 0 },
                    { day: 'Sem 3 (15-21)', minDay: 15, maxDay: 21, income: 0, expense: 0 },
                    { day: 'Sem 4 (22-28)', minDay: 22, maxDay: 28, income: 0, expense: 0 },
                    { day: `Sem 5 (29-${lastDayOfMonth})`, minDay: 29, maxDay: lastDayOfMonth, income: 0, expense: 0 },
                ];

                allTxs.forEach(t => {
                    const d = new Date(t.date);
                    const dayNum = d.getDate();
                    const match = monthWeeks.find(w => dayNum >= w.minDay && dayNum <= w.maxDay);
                    if (match) {
                        if (t.type === 'income') match.income += Number(t.amount || 0);
                        else match.expense += Number(t.amount || 0);
                    }
                });

                chartData = monthWeeks.map(w => ({ day: w.day, income: w.income, expense: w.expense }));
            }

            // --- 2. HEATMAP HORARIOS (08:00 a 23:00) ---
            const operatingHours = [
                '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
                '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
                '20:00', '21:00', '22:00', '23:00'
            ];

            const hoursCountMap: { [key: string]: number } = {};
            operatingHours.forEach(h => { hoursCountMap[h] = 0; });

            heatmapBookings.forEach(b => {
                if (b.start_time) {
                    const rawHour = b.start_time.substring(0, 2);
                    const hourKey = `${rawHour}:00`;
                    if (hoursCountMap[hourKey] !== undefined) {
                        hoursCountMap[hourKey]++;
                    }
                }
            });

            const maxHourBookings = Math.max(...Object.values(hoursCountMap), 1);
            const hoursHeatmap = operatingHours.map(hour => ({
                hour,
                count: hoursCountMap[hour] || 0,
                intensity: Math.round(((hoursCountMap[hour] || 0) / maxHourBookings) * 100)
            }));

            // Top peak hours
            const sortedPeakHours = [...hoursHeatmap].sort((a, b) => b.count - a.count);
            const peakHours = sortedPeakHours.slice(0, 5);

            // --- 3. HEATMAP DÍAS DE LA SEMANA (Lunes a Domingo) ---
            const dayDefs = [
                { day: 'Lunes', short: 'Lun', dayNum: 1 },
                { day: 'Martes', short: 'Mar', dayNum: 2 },
                { day: 'Miércoles', short: 'Mié', dayNum: 3 },
                { day: 'Jueves', short: 'Jue', dayNum: 4 },
                { day: 'Viernes', short: 'Vie', dayNum: 5 },
                { day: 'Sábado', short: 'Sáb', dayNum: 6 },
                { day: 'Domingo', short: 'Dom', dayNum: 0 }
            ];

            const daysStats = dayDefs.map(def => ({
                day: def.day,
                short: def.short,
                day_number: def.dayNum,
                count: 0,
                revenue: 0,
                intensity: 0
            }));

            heatmapBookings.forEach(b => {
                if (b.date) {
                    const [y, m, d] = b.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const dayOfWeek = dateObj.getDay(); // 0 = Dom, 1 = Lun, ...
                    const dayItem = daysStats.find(d => d.day_number === dayOfWeek);
                    if (dayItem) {
                        dayItem.count++;
                        dayItem.revenue += Number(b.total_price || 0);
                    }
                }
            });

            const maxDayBookings = Math.max(...daysStats.map(d => d.count), 1);
            daysStats.forEach(d => {
                d.intensity = Math.round((d.count / maxDayBookings) * 100);
            });

            // --- 4. HEATMAP MATRIZ 2D (Día x Horario) ---
            const matrixHeatmap = dayDefs.map(def => {
                return operatingHours.map(hour => {
                    let cellCount = 0;
                    heatmapBookings.forEach(b => {
                        if (b.date && b.start_time) {
                            const [y, m, d] = b.date.split('-').map(Number);
                            const dateObj = new Date(y, m - 1, d);
                            if (dateObj.getDay() === def.dayNum) {
                                const rawHour = b.start_time.substring(0, 2);
                                const hKey = `${rawHour}:00`;
                                if (hKey === hour) {
                                    cellCount++;
                                }
                            }
                        }
                    });
                    return {
                        day: def.day,
                        day_short: def.short,
                        day_number: def.dayNum,
                        hour: hour,
                        count: cellCount,
                        intensity: 0
                    };
                });
            });

            let maxCellCount = 1;
            matrixHeatmap.forEach(row => {
                row.forEach(cell => {
                    if (cell.count > maxCellCount) maxCellCount = cell.count;
                });
            });
            matrixHeatmap.forEach(row => {
                row.forEach(cell => {
                    cell.intensity = Math.round((cell.count / maxCellCount) * 100);
                });
            });

            // --- 5. PAYMENT METHODS & PENDING ---
            const cashVal = income.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const transferVal = income.filter(t => t.payment_method === 'transfer').reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const mpVal = income.filter(t => t.payment_method === 'mercadopago').reduce((sum, t) => sum + Number(t.amount || 0), 0);

            const pendingBookingsIncome = periodBookings
                .filter(b => b.payment_status === 'pending' || b.status === 'pending')
                .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

            return {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_income: totalIncome - totalExpenses,
                profit_margin: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,

                income_bookings: income.filter(t => t.category === 'booking').reduce((sum, t) => sum + Number(t.amount || 0), 0),
                income_tournaments: income.filter(t => t.category === 'tournament_fee').reduce((sum, t) => sum + Number(t.amount || 0), 0),
                income_shop: income.filter(t => t.category === 'shop').reduce((sum, t) => sum + Number(t.amount || 0), 0),

                pending_income: pendingBookingsIncome,
                occupancy_rate: 0,

                revenue_sources: [
                    { name: 'Alquiler Canchas', value: income.filter(t => t.category === 'booking').reduce((sum, t) => sum + Number(t.amount || 0), 0), color: '#38bdf8' },
                    { name: 'Inscripción Torneos', value: income.filter(t => t.category === 'tournament_fee').reduce((sum, t) => sum + Number(t.amount || 0), 0), color: '#f59e0b' },
                ],
                payment_methods: [
                    { name: 'Efectivo', value: cashVal, color: '#22c55e' },
                    { name: 'Transferencia', value: transferVal, color: '#3b82f6' },
                    { name: 'Mercado Pago', value: mpVal, color: '#009ee3' }
                ],
                peak_hours: peakHours,
                days_heatmap: daysStats,
                hours_heatmap: hoursHeatmap,
                matrix_heatmap: matrixHeatmap,
                chart_data: chartData,
                period_type: period,
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
        async searchUsersForMention(query: string = '') {
            let req = supabase
                .from('profiles')
                .select('id, name, lastname, profile_picture_url, role, category');

            const cleanQuery = query.trim();
            if (cleanQuery) {
                req = req.or(`name.ilike.%${cleanQuery}%,lastname.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
            }

            const { data, error } = await req
                .order('name', { ascending: true })
                .limit(20);

            if (error) {
                console.error("Error searching players for mention:", error);
                return [];
            }
            return data || [];
        }
    },
    stats: {
        async getPlayerDetailedStats(userId: string): Promise<PlayerStatsSummary> {
            try {
                const [
                    { data: matchesData },
                    { data: rankingData },
                    { data: allProfiles }
                ] = await Promise.all([
                    supabase
                        .from('matches')
                        .select('*, tournaments(name)')
                        .eq('is_played', true)
                        .or(`player1_id.eq.${userId},player2_id.eq.${userId},player1_partner_id.eq.${userId},player2_partner_id.eq.${userId}`)
                        .order('created_at', { ascending: true }),
                    supabase
                        .from('ranking_history')
                        .select('*')
                        .eq('player_id', userId)
                        .order('date_obtained', { ascending: true }),
                    supabase
                        .from('profiles')
                        .select('id, name, lastname')
                ]);

                const profileMap = new Map<string, string>();
                (allProfiles || []).forEach(p => {
                    profileMap.set(p.id, formatPlayerName(p.name, p.lastname));
                });

                const matches = matchesData || [];
                const totalMatches = matches.length;
                let wonMatches = 0;
                let tieBreaksPlayed = 0;
                let tieBreaksWon = 0;
                let threeSetsPlayed = 0;
                let threeSetsWon = 0;

                let currentStreak = 0;
                let bestStreak = 0;
                let runningStreak = 0;

                const opponentMap = new Map<string, { id: string; name: string; matches: number; wins: number; losses: number }>();

                matches.forEach(m => {
                    const isP1 = m.player1_id === userId || m.player1_partner_id === userId;
                    const isWinner = (m.winner_id === userId || m.winner_partner_id === userId);

                    if (isWinner) {
                        wonMatches++;
                        runningStreak = runningStreak > 0 ? runningStreak + 1 : 1;
                        if (runningStreak > bestStreak) bestStreak = runningStreak;
                    } else {
                        runningStreak = runningStreak < 0 ? runningStreak - 1 : -1;
                    }

                    // Opponent Tracking
                    const opponentId = isP1 
                        ? (m.player2_id || m.player2_partner_id) 
                        : (m.player1_id || m.player1_partner_id);

                    if (opponentId) {
                        const oppName = profileMap.get(opponentId) || (isP1 ? (m.player2_name || 'Rival') : (m.player1_name || 'Rival'));
                        const currentOpp = opponentMap.get(opponentId) || {
                            id: opponentId,
                            name: oppName,
                            matches: 0,
                            wins: 0,
                            losses: 0
                        };
                        currentOpp.matches++;
                        if (isWinner) currentOpp.wins++;
                        else currentOpp.losses++;
                        opponentMap.set(opponentId, currentOpp);
                    }

                    // Tie-break and 3-set analysis from score
                    let hasThirdSet = false;
                    const score = m.score;
                    if (Array.isArray(score)) {
                        if (score.length >= 3) hasThirdSet = true;
                        score.forEach((set: any, idx: number) => {
                            const p1Games = typeof set.p1 === 'number' ? set.p1 : parseInt(set.p1 || '0', 10);
                            const p2Games = typeof set.p2 === 'number' ? set.p2 : parseInt(set.p2 || '0', 10);
                            const userGames = isP1 ? p1Games : p2Games;
                            const oppGames = isP1 ? p2Games : p1Games;

                            // Tie-Break or Super Tie-Break (7-6, 6-7, 10-8, 1-0 STB, etc.)
                            const isTieBreak = (p1Games === 7 && p2Games === 6) || (p1Games === 6 && p2Games === 7) || 
                                               (idx === 2 && (p1Games >= 10 || p2Games >= 10 || p1Games === 1 || p2Games === 1));

                            if (isTieBreak) {
                                tieBreaksPlayed++;
                                if (userGames > oppGames) tieBreaksWon++;
                            }
                        });
                    } else if (typeof score === 'string') {
                        if (score.split(' ').length >= 3) hasThirdSet = true;
                        if (score.includes('7-6') || score.includes('6-7') || score.includes('10-') || score.includes('-10')) {
                            tieBreaksPlayed++;
                            if (isWinner) tieBreaksWon++;
                        }
                    }

                    if (hasThirdSet) {
                        threeSetsPlayed++;
                        if (isWinner) threeSetsWon++;
                    }
                });

                currentStreak = runningStreak;
                const lostMatches = totalMatches - wonMatches;
                const winRate = totalMatches > 0 ? Math.round((wonMatches / totalMatches) * 100) : 0;
                const tieBreakWinRate = tieBreaksPlayed > 0 ? Math.round((tieBreaksWon / tieBreaksPlayed) * 100) : 0;

                const frequentOpponents = Array.from(opponentMap.values())
                    .sort((a, b) => b.matches - a.matches)
                    .slice(0, 5);

                // Build points evolution
                let accumulatedPoints = 0;
                const rankingHistory = (rankingData || []).map((r, index) => {
                    accumulatedPoints += (r.points || 0);
                    return {
                        date: r.date_obtained || new Date().toISOString(),
                        points: accumulatedPoints,
                        rank: Math.max(1, 10 - index),
                        tournament_name: r.tournament_name || 'Torneo Oficial'
                    };
                });

                // Fallback ranking history if empty
                if (rankingHistory.length === 0 && wonMatches > 0) {
                    rankingHistory.push({
                        date: new Date().toISOString().split('T')[0],
                        points: wonMatches * 50,
                        rank: 1,
                        tournament_name: 'Partidos Oficiales'
                    });
                }

                return {
                    totalMatches,
                    wonMatches,
                    lostMatches,
                    winRate,
                    tieBreaksPlayed,
                    tieBreaksWon,
                    tieBreakWinRate,
                    threeSetsPlayed,
                    threeSetsWon,
                    currentStreak,
                    bestStreak,
                    frequentOpponents,
                    rankingHistory
                };
            } catch (err) {
                console.error("Error in getPlayerDetailedStats:", err);
                return {
                    totalMatches: 0,
                    wonMatches: 0,
                    lostMatches: 0,
                    winRate: 0,
                    tieBreaksPlayed: 0,
                    tieBreaksWon: 0,
                    tieBreakWinRate: 0,
                    threeSetsPlayed: 0,
                    threeSetsWon: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    frequentOpponents: [],
                    rankingHistory: []
                };
            }
        }
    }
};

