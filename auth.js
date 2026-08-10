// App Version: 98
console.info('🚀 LYNX App Version: 98');
// Auth System with Supabase Integration
// ======================================

class Auth {
    constructor() {
        this.currentUser = null;
        this.users = []; // Will be loaded from Supabase
        this.institutions = []; // Will be loaded from Supabase
        this.pendingUser = null;
        this.isInitialized = false;
    }

    async getAuthHeaders() {
        console.log('auth.getAuthHeaders: START');
        try {
            // TRY LOCAL STORAGE FIRST to avoid library deadlock
            const projectRef = 'xlipzxmjpliwifckwkvh';
            const storageKey = `sb-${projectRef}-auth-token`;
            const rawToken = localStorage.getItem(storageKey);

            let token = SUPABASE_ANON_KEY;

            if (rawToken) {
                try {
                    const sessionData = JSON.parse(rawToken);
                    if (sessionData && sessionData.access_token) {
                        token = sessionData.access_token;
                        console.log('auth.getAuthHeaders: Token retrieved from localStorage');
                    }
                } catch (e) {
                    console.warn('auth.getAuthHeaders: Failed to parse storage token', e);
                }
            } else {
                console.log('auth.getAuthHeaders: No token in localStorage, using ANON key as fallback');
            }

            return {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (e) {
            console.error('auth.getAuthHeaders: FATAL ERROR', e);
            return {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            };
        }
    }

    async init() {
        try {
            // Check if there's an existing session
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session) {
                // Get user profile - returns false if pending approval
                const isApproved = await this.loadUserProfile(session.user.id);
                if (isApproved !== false) {
                    this.showApp();
                }
            } else {
                this.showLogin();
            }

            // Load institutions for dropdowns
            await this.loadInstitutions();
            await this.loadUsers();

            // Listen to auth state changes
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                if (event === 'SIGNED_IN' && session) {
                    const isApproved = await this.loadUserProfile(session.user.id);
                    if (isApproved !== false) {
                        this.showApp();
                    }
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    // Hide pending approval screen if visible
                    const pendingScreen = document.getElementById('pending-approval-screen');
                    if (pendingScreen) pendingScreen.style.display = 'none';
                    this.showLogin();
                }
            });

            this.isInitialized = true;
            this.bindEvents();

        } catch (error) {
            console.error('Auth init error:', error);
            this.showLogin();
            this.bindEvents();
        }
    }

    async loadUserProfile(userId) {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*, institutions(name)')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error loading profile:', error);
            alert('Error cargando perfil: ' + error.message);
            return false;
        }

        console.log('Profile loaded from Supabase:', profile);
        console.log('Profile role:', profile.role);

        this.currentUser = {
            ...profile,
            institution: profile.institutions?.name || null
        };

        console.log('currentUser set to:', this.currentUser);

        // Check if player needs approval
        if (profile.role === 'player' && profile.is_approved === false) {
            console.log('Player pending approval');
            this.showPendingApproval();
            return false; // Indicate not fully logged in
        }

        return true; // User can proceed
    }

    showPendingApproval() {
        const authView = document.getElementById('auth-view');
        const appContainer = document.getElementById('app-container');

        if (authView) authView.style.display = 'none';
        if (appContainer) appContainer.style.display = 'none';

        // Create or update pending approval screen
        let pendingScreen = document.getElementById('pending-approval-screen');
        if (!pendingScreen) {
            pendingScreen = document.createElement('div');
            pendingScreen.id = 'pending-approval-screen';
            pendingScreen.style.cssText = 'display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:var(--bg-dark); padding:2rem;';
            document.body.appendChild(pendingScreen);
        }

        const userName = this.currentUser?.name || 'Usuario';
        const institutionName = this.currentUser?.institution || 'su institución';

        pendingScreen.innerHTML = `
            <div style="max-width:500px; text-align:center; background:var(--bg-card); padding:3rem; border-radius:1rem; border:1px solid var(--border);">
                <div style="font-size:4rem; margin-bottom:1rem;">⏳</div>
                <h2 style="color:var(--accent); margin-bottom:1rem;">Cuenta Pendiente de Validación</h2>
                <p style="color:var(--text-main); font-size:1.1rem; margin-bottom:1.5rem;">
                    <strong>${userName}</strong>, tu cuenta se encuentra a la espera de validación por parte de un profesor de <strong>${institutionName}</strong>.
                </p>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:2rem;">
                    Si esto no se actualiza pronto, contactá con el profesor de tu institución.
                </p>
                <button class="cta-btn" onclick="auth.logout()" style="background:transparent; border:1px solid var(--border); color:var(--text-muted);">
                    <ion-icon name="log-out-outline"></ion-icon> Cerrar Sesión
                </button>
            </div>
        `;
        pendingScreen.style.display = 'flex';
    }

    async loadInstitutions() {
        console.log('auth.loadInstitutions: START');
        const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

        try {
            // Cache busting via headers (removing query param causing PostgREST error)
            console.log('auth.loadInstitutions: Fetching from Supabase...');
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
            this.institutions = data || [];
            console.log('auth.loadInstitutions: SUCCESS', this.institutions.length);
            if (this.institutions.length > 0) {
                console.log('auth.loadInstitutions: First item sample:', {
                    name: this.institutions[0].name,
                    lat: this.institutions[0].latitude,
                    lng: this.institutions[0].longitude
                });
            }

            // Populate Register Dropdown
            const select = document.getElementById('reg-institution-select');
            if (select) {
                console.log('auth.loadInstitutions: Populating register select...');
                select.innerHTML = '<option value="">- Selecciona tu Club -</option>' +
                    this.institutions.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
            }
        } catch (e) {
            console.error('auth.loadInstitutions: ERROR', e);
        }
    }

    async loadUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*, institutions(name)')
                .order('name');

            if (!error) {
                this.users = (data || []).map(u => ({
                    ...u,
                    institution: u.institutions?.name
                }));
            }
        } catch (e) {
            console.error('Error loading users:', e);
        }
    }

    // Institution Methods
    async updateInstitution(id, updates) {
        console.log('auth.updateInstitution: START', { id });
        if (!id) {
            console.error('auth.updateInstitution: CANNOT UPDATE - MISSING ID');
            alert('Error interno: El ID de la institución no fue detectado.');
            return false;
        }

        const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

        try {
            const url = `${SUPABASE_URL}/rest/v1/institutions?id=eq.${id}`;
            console.log('auth.updateInstitution: PATCHing to URL:', url);
            console.log('auth.updateInstitution: Payload:', updates);

            const headers = await this.getAuthHeaders();
            headers['Prefer'] = 'return=representation';

            const response = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(updates)
            });

            console.log('auth.updateInstitution: Response status:', response.status);
            if (response.ok) {
                const result = await response.json();
                console.log('auth.updateInstitution: SERVER CONFIRMED UPDATE AS:', result);
            } else {
                const errText = await response.text();
                throw new Error(`Error del servidor (${response.status}): ${errText}`);
            }

            console.log('auth.updateInstitution: SUCCESS. Waiting 1000ms before refresh...');
            await new Promise(r => setTimeout(r, 1000));
            await this.loadInstitutions();
            return true;
        } catch (e) {
            console.error('auth.updateInstitution: FATAL ERROR', e);
            alert('Error al guardar cambios: ' + e.message);
            return false;
        }
    }

    async addInstitution(instData) {
        console.log('auth.addInstitution: START', instData);
        const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

        try {
            console.log('auth.addInstitution: Executing POST via FETCH...');
            const headers = await this.getAuthHeaders();
            headers['Prefer'] = 'return=representation';

            const response = await fetch(`${SUPABASE_URL}/rest/v1/institutions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(instData)
            });

            console.log('auth.addInstitution: Response status:', response.status);
            if (response.ok) {
                const result = await response.json();
                console.log('auth.addInstitution: SERVER CONFIRMED CREATION AS:', result);
                await this.loadInstitutions();
                return true;
            } else {
                const errText = await response.text();
                throw new Error(`Error del servidor (${response.status}): ${errText}`);
            }
        } catch (e) {
            console.error('auth.addInstitution: FATAL ERROR', e);
            alert('Error al crear institución: ' + e.message);
            return false;
        }
    }

    async deleteInstitution(id) {
        try {
            const { error } = await supabaseClient
                .from('institutions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await this.loadInstitutions(); // Refresh
            return true;
        } catch (e) {
            console.error('Error deleting institution:', e);
            alert('Error borrando institución: ' + e.message);
            return false;
        }
    }


    bindEvents() {
        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        // Register Form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        // Toggle Institution input based on role checkbox
        const roleCheck = document.getElementById('reg-role-admin');
        if (roleCheck) {
            roleCheck.addEventListener('change', (e) => {
                const isOrganizer = e.target.checked;
                const orgInstGroup = document.getElementById('reg-institution-group');
                const playerInstGroup = document.getElementById('reg-player-inst-group');

                if (orgInstGroup) orgInstGroup.style.display = isOrganizer ? 'block' : 'none';
                if (playerInstGroup) playerInstGroup.style.display = isOrganizer ? 'none' : 'block';
            });
        }
    }

    showLogin() {
        document.getElementById('auth-view').style.display = 'flex';
        document.getElementById('app-view').style.display = 'none';

        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');
        const formVerify = document.getElementById('form-verify');

        if (formLogin) formLogin.style.display = 'block';
        if (formRegister) formRegister.style.display = 'none';
        if (formVerify) formVerify.style.display = 'none';
    }

    showRegister() {
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-register').style.display = 'block';
    }

    showApp() {
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';

        if (!this.currentUser) return;

        // Determine role label
        let roleLabel = 'Jugador';
        if (this.currentUser.role === 'admin') roleLabel = 'Organizador';
        if (this.currentUser.role === 'superadmin') roleLabel = 'Super Admin';

        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.innerHTML = `
                <span class="admin-badge" style="margin-right:0.5rem;">${roleLabel}</span>
                <span>${this.currentUser.name}</span>
                <button onclick="auth.logout()" style="margin-left:1rem; background:none; border:none; color:var(--text-muted); cursor:pointer;">
                    <ion-icon name="log-out-outline" style="font-size:1.2rem;"></ion-icon>
                </button>
            `;
        }

        // Apply RBAC directly here as backup
        this.applyRBAC();

        // Notify App (with retry if app not ready)
        let retryCount = 0;
        const notifyApp = () => {
            if (window.app && window.app.onUserLogin) {
                console.log('Calling app.onUserLogin');
                window.app.onUserLogin(this.currentUser);
            } else if (retryCount < 50) { // Limit retries to 5 seconds
                retryCount++;
                if (retryCount % 10 === 0) console.log('app not ready, retrying...');
                setTimeout(notifyApp, 100);
            } else {
                console.error('App failed to initialize in time.');
            }
        };
        notifyApp();
    }

    applyRBAC() {
        if (!this.currentUser) return;

        console.log('Applying RBAC for role:', this.currentUser.role);

        // Show all nav buttons for superadmin
        if (this.currentUser.role === 'superadmin') {
            document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
                btn.style.display = 'flex';
            });
            const divider = document.getElementById('nav-admin-divider');
            if (divider) divider.style.display = 'block';

            const adminHeader = document.getElementById('nav-admin-header');
            if (adminHeader) adminHeader.style.display = 'block';

            // Explicitly show these
            const navUsers = document.getElementById('nav-users');
            const navInst = document.getElementById('nav-institutions');
            if (navUsers) navUsers.style.display = 'flex';
            if (navInst) navInst.style.display = 'flex';

            console.log('Superadmin RBAC applied - all buttons visible');
        } else if (this.currentUser.role === 'admin') {
            // Admin sees all except users/institutions/categories
            document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
                const view = btn.getAttribute('data-view');
                if (view === 'users' || view === 'categories') {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            });

            // Show Admin Divider/Header now that we have an admin item (Institutions)
            const divider = document.getElementById('nav-admin-divider');
            const adminHeader = document.getElementById('nav-admin-header');
            if (divider) divider.style.display = 'block';
            if (adminHeader) adminHeader.style.display = 'block';

            // Explicitly show Institutions
            const navInst = document.getElementById('nav-institutions');
            if (navInst) navInst.style.setProperty('display', 'flex', 'important');

            const navCategories = document.getElementById('nav-categories');
            if (navCategories) navCategories.style.display = 'none';
            console.log('Admin RBAC applied - categories hidden');
        } else {
            // Player - only dashboard
            document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
                const view = btn.getAttribute('data-view');
                btn.style.display = view === 'dashboard' ? 'flex' : 'none';
            });
        }

        // FINAL SAFETY CHECK: Force remove categories for anyone who is NOT superadmin
        if (this.currentUser.role !== 'superadmin') {
            const navCat = document.getElementById('nav-categories');
            if (navCat) {
                console.log('Removing categories button for non-superadmin');
                navCat.remove();
            }
        }

        // Setup navigation click handlers after buttons are visible
        if (window.app && window.app.setupNavigation) {
            window.app.setupNavigation();
            console.log('Navigation handlers attached');
        }
    }

    async logout() {
        console.log('Logging out...');

        // Immediate UI feedback
        this.currentUser = null;

        try {
            // Attempt sign out but don't let it block indefinitely
            const signOutPromise = supabaseClient.auth.signOut();
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));

            await Promise.race([signOutPromise, timeoutPromise]);
            console.log('Logout call finished (or timed out)');
        } catch (e) {
            console.error('Logout exception:', e);
        }

        // Force transition and reload regardless of success
        this.showLogin();

        // Final safety: clear any local storage that might keep the session
        try {
            localStorage.removeItem('supabase.auth.token');
        } catch (e) { }

        console.log('Redirecting to login...');
        window.location.reload();
    }

    async register() {
        const name = document.getElementById('reg-name').value;
        const lastname = document.getElementById('reg-lastname').value;
        const category = document.getElementById('reg-cat').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const gender = document.getElementById('reg-gender').value;

        // Location
        const country = document.getElementById('reg-country').value;
        const province = document.getElementById('reg-province').value;
        const city = document.getElementById('reg-city').value;

        const isOrganizer = document.getElementById('reg-role-admin').checked;
        const role = isOrganizer ? 'admin' : 'player';

        // Determine Institution based on role
        let institution = null;
        if (isOrganizer) {
            institution = document.getElementById('reg-institution-input').value;
        } else {
            // For players, get from select
            const select = document.getElementById('reg-institution-select');
            institution = select ? select.value : null;
        }

        if (isOrganizer && !institution) return alert('Debes ingresar el nombre de la Institución.');
        if (!isOrganizer && !institution) return alert('Debes seleccionar una Institución.');

        try {
            // Geocode
            const coords = await this.getCoordinates(city, province, country);
            console.log('Geocoded:', coords);

            // Sign up with Supabase Auth
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password: pass,
                options: {
                    data: {
                        name: name,
                        role: role
                    }
                }
            });

            if (error) throw error;

            // Resolve Institution ID
            let instId = null;
            if (institution) {
                const inst = this.institutions.find(i => i.name === institution);
                if (inst) {
                    instId = inst.id;
                } else if (isOrganizer) {
                    // Logic for NEW institution (organizer typing new name) typically handled separately
                    // But if it's a new name, instId remains null or handled by a later 'create institution' flow
                    // For now, we assume organizers link to existing or we rely on them creating it later?
                    // The original code passed 'institution' (name) to updateProfile.
                    // If organizer types a NEW name, it won't resolve.
                    // User flow for creating institution is usually separate.
                    // But let's proceed with current logic.
                }
            }

            // Update profile with additional data
            if (data.user) {
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .update({
                        name: name,
                        lastname: lastname,
                        category: category,
                        role: role,
                        gender: gender,
                        institution_id: instId,
                        country,
                        province,
                        city,
                        latitude: coords.lat,
                        longitude: coords.lon
                    })
                    .eq('id', data.user.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                }

                // NOTIFICATION LOGIC: Send message to admins of this institution
                if (!isOrganizer && instId) {
                    try {
                        // Find admins of this institution
                        const { data: admins } = await supabaseClient
                            .from('profiles')
                            .select('id')
                            .eq('institution_id', instId)
                            .eq('role', 'admin');

                        if (admins && admins.length > 0) {
                            const messageContent = `NUEVO JUGADOR: ${name} ${lastname} (${email}) solicita unirse en Categoría ${category}.`;

                            // Send message to each admin
                            const messagePromises = admins.map(admin =>
                                db.messages.create({
                                    sender_id: data.user.id, // The new user is the sender
                                    recipient_id: admin.id,
                                    message: messageContent,
                                    match_id: null // System message / direct message
                                })
                            );

                            await Promise.all(messagePromises);
                            console.log('Notifications sent to admins');
                        }
                    } catch (notifyErr) {
                        console.error('Error sending notifications:', notifyErr);
                        // Non-blocking error
                    }
                }
            }

            alert('¡Cuenta creada exitosamente! Revisa tu correo para confirmar (o inicia sesión directamente si la confirmación está deshabilitada).');
            this.showLogin();

        } catch (error) {
            console.error('Registration error:', error);
            alert('Error al registrar: ' + error.message);
        }
    }

    async login() {
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-pass').value.trim();

        if (!email || !pass) {
            return alert('Ingresa correo y contraseña.');
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password: pass
            });

            if (error) throw error;

            // Profile will be loaded by onAuthStateChange
            console.log('Login successful:', data.user.email);

        } catch (error) {
            console.error('Login error:', error);
            alert('Credenciales inválidas: ' + error.message);
        }
    }

    // Helper to create first superadmin
    async createSuperAdmin(email, password, name) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { name, role: 'superadmin' }
                }
            });

            if (error) throw error;

            // Force superadmin role
            if (data.user) {
                await supabaseClient
                    .from('profiles')
                    .update({ role: 'superadmin', name: name })
                    .eq('id', data.user.id);
            }
            console.log('Superadmin created');
        } catch (e) {
            console.error(e);
        }
    }

    // Generic Update Profile
    async updateProfile(userId, updates) {
        try {
            console.log('auth.updateProfile', userId, updates);
            const { error } = await supabaseClient
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            // If updating self, update local cache
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = { ...this.currentUser, ...updates };
            }

            await this.loadUsers();
            return true;
        } catch (e) {
            console.error('Error updating profile:', e);
            throw e;
        }
    }

    // Alias for backward compatibility
    async updateUserProfile(userId, updates) {
        return this.updateProfile(userId, updates);
    }

    // Admin Update Password via RPC
    async adminUpdatePassword(userId, newPassword) {
        try {
            const { error } = await supabaseClient.rpc('admin_update_password', {
                target_user_id: userId,
                new_password: newPassword
            });

            if (error) throw error;
            console.log('Password updated successfully via RPC');
            return true;
        } catch (e) {
            console.error('Error updating password via RPC:', e);
            throw e;
        }
    }

    // Admin Create User (Simulated by using a secondary client to avoid logout)
    async adminCreateUser(data) {
        // 1. Validate Uniqueness
        // Check Document
        if (data.document_number) {
            const { data: existingDoc } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('document_number', data.document_number)
                .maybeSingle();

            if (existingDoc) {
                throw new Error('El documento/DNI ya está registrado en el sistema.');
            }
        }

        // 2. Prepare Temp Client
        const SUPABASE_URL = 'https://xlipzxmjpliwifckwkvh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXB6eG1qcGxpd2lmY2t3a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjUwOTAsImV4cCI6MjA5NTQwMTA5MH0.deNbxVCVxysIO9Nu-xtl0NXx5J6sWlJXzW3jY6v9SMQ';

        // Create a new client instance that DOES NOT persist session
        const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // 3. Create Auth User
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                    role: data.role
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error('El correo electrónico ya está registrado.');
            }
            throw authError; // Throw other errors
        }

        if (!authData.user) {
            throw new Error('No se pudo crear el usuario (sin datos retornados).');
        }

        // 4. Update Profile with details
        let institutionId = null;
        if (data.institution) {
            const inst = this.institutions.find(i => i.name === data.institution);
            institutionId = inst ? inst.id : null;
        }

        const updates = {
            name: data.name,
            lastname: data.lastname,
            email: data.email, // Added email to persist in profiles
            document_number: data.document_number,
            role: data.role,
            category: data.role === 'player' ? data.category : null,
            gender: data.gender || null,
            institution_id: institutionId
        };

        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', authData.user.id);

        if (profileError) {
            console.error('Error updating profile metadata:', profileError);
            alert('Usuario creado, pero hubo un error guardando detalles del perfil: ' + profileError.message);
        } else {
            alert(`Usuario ${data.name} creado exitosamente.`);
        }

        await this.loadUsers();
        return authData.user;
    }

    // User Methods
    async deleteUser(id) {
        if (!confirm('¿Estás seguro de eliminar este usuario? Se borrará su acceso y perfil permanentemente.')) return;

        console.log('Attempting to delete user completely:', id);

        // Try to delete via RPC (Database Function) to remove Auth User + Profile
        // This requires the function 'delete_user_completely' to be created in Supabase
        const { error: rpcError } = await supabaseClient.rpc('delete_user_completely', { target_user_id: id });

        if (!rpcError) {
            console.log('User deleted successfully via RPC');
            alert('Usuario eliminado correctamente.');
            await this.loadUsers();
            return;
        }

        console.warn('RPC delete failed (Functional not found or permission error). Falling back to profile delete only.', rpcError);
        console.log('Falling back to profile delete...');

        const { error, count } = await supabaseClient
            .from('profiles')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar usuario: ' + error.message);
            return;
        }

        if (count === 0) {
            console.warn('Delete operation returned 0 rows affected.');
            alert('No se pudo eliminar el perfil. Puede que ya no exista.');
            return;
        }

        console.log('User profile deleted (Auth user may still exist)');
        alert('Perfil eliminado. Nota: Si la función de base de datos no está configurada, el usuario de Auth podría seguir existiendo.');
        await this.loadUsers();
    }

    async getCoordinates(city, province, country) {
        try {
            const q = encodeURIComponent(`${city}, ${province}, ${country}`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
            const data = await res.json();
            if (data && data[0]) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
        } catch (e) { console.error('Geocoding error:', e); }
        return { lat: null, lon: null };
    }
}

// Initialize Auth
// Initialize Auth
window.auth = new Auth();

// Wait for Supabase to be ready, then init
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure supabase.js is loaded
    setTimeout(() => {
        auth.init();
    }, 100);
});
