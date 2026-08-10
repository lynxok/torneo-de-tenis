// App Version: 98
console.info('🚀 LYNX App Version: 98');

class App {
    constructor() {
        console.log('App constructor starting...');
        this.currentView = 'dashboard';
        this.tournament = new Tournament();
        this.version = 'v98.0'; // Centralized version
        this.currentUser = null;

        // Fix race condition: If auth already logged in a user before app.js loaded,
        // we need to initialize now
        if (typeof auth !== 'undefined' && auth.currentUser) {
            this.onUserLogin(auth.currentUser);
        }

        // Check for payment return parameters
        this.detectPaymentReturn();
    }

    async onUserLogin(user) {
        if (this.currentUser && this.currentUser.id === user.id) {
            console.log('User already logged in, skipping initialization.');
            return;
        }

        this.currentUser = user;
        console.log('onUserLogin called with user:', user);
        console.log('User role:', user.role);

        // personalize
        let roleLabel = 'Jugador';
        if (user.role === 'admin') roleLabel = 'Organizador';
        if (user.role === 'superadmin') roleLabel = 'Super Admin';

        const title = document.querySelector('.logo-area span');
        if (title) title.textContent = 'SMASH TENNIS';

        const adminBadge = document.querySelector('.admin-badge');
        if (adminBadge) adminBadge.textContent = roleLabel;

        // Apply RBAC
        const adminViews = ['setup', 'groups', 'matches', 'brackets'];
        const superAdminViews = ['users', 'institutions'];
        const navBtns = document.querySelectorAll('.nav-btn[data-view]');

        console.log('Found nav buttons:', navBtns.length);

        navBtns.forEach(btn => {
            const view = btn.getAttribute('data-view');

            // Super Admin sees all including user/institution management
            if (user.role === 'superadmin') {
                btn.style.display = 'flex';
                console.log('Showing button for view:', view);
                return;
            }

            // Admin (Professor) sees tournament management but not user/institution management
            if (user.role === 'admin') {
                if (superAdminViews.includes(view)) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
                // Admin can see 'bookings' (we will add logic for that)
                return;
            }

            // Player: Only Dashboard by default.  
            // Groups and Brackets will show only after "entering" a tournament context.
            // Player: Dashboard + Ranking + Players + Messages + Bookings
            if (user.role === 'player' || !user.role) {
                if (['dashboard', 'ranking', 'players', 'messages', 'profile', 'bookings'].includes(view)) {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                }
            }
        });

        // Show admin divider for superadmin
        const adminDivider = document.getElementById('nav-admin-divider');
        if (adminDivider) {
            adminDivider.style.display = (user.role === 'superadmin') ? 'block' : 'none';
        }

        // Explicitly show nav buttons for superadmin (backup in case loop doesn't work)
        if (user.role === 'superadmin') {
            const navUsers = document.getElementById('nav-users');
            const navInst = document.getElementById('nav-institutions');
            const navAdminDashboard = document.getElementById('nav-admin-dashboard');
            const navPayments = document.getElementById('nav-payments');
            if (navUsers) navUsers.style.display = 'flex';
            if (navInst) navInst.style.display = 'flex';
            if (navAdminDashboard) navAdminDashboard.style.display = 'flex';
            if (navPayments) navPayments.style.display = 'flex';
            console.log('Superadmin: Forced nav buttons visible');
        } else if (user.role === 'admin') {
            const navInst = document.getElementById('nav-institutions');
            const navPayments = document.getElementById('nav-payments');
            if (navInst) navInst.style.setProperty('display', 'flex', 'important');
            if (navPayments) navPayments.style.setProperty('display', 'flex', 'important');
        }

        const btnSave = document.getElementById('btn-save-sheets');
        if (btnSave) btnSave.style.display = (user.role !== 'player') ? 'flex' : 'none';

        // Display user name
        const userName = document.getElementById('user-name');
        if (userName) userName.textContent = user.name || '';

        this.setupNavigation();
        this.bindGlobalEvents();
        // Load persist data (async)
        await this.loadRecentTournament();

        // Update messages badge
        this.updateMessagesBadge();

        // Start notification polling
        this.startNotificationPolling();
        this.fetchNotifications();

        // Initial render (now that data is loaded)
        this.renderView();
    }

    showLoading(container, text = 'Cargando...') {
        this.clearLoadingInterval(container);

        container.innerHTML = `
            <div class="loading-container">
                <div class="tennis-ball"></div>
                <div class="ball-shadow"></div>
                <span class="loading-text" style="color: var(--text-muted); font-weight: 600;">${text}</span>
                <div class="loading-progress" style="font-weight: 800; color: var(--primary); font-family: 'Outfit'; font-size: 1.5rem; text-shadow: 0 0 10px var(--primary-glow);">0%</div>
            </div>
        `;

        const progressEl = container.querySelector('.loading-progress');
        let progress = 0;

        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 1;
            if (progress > 99) progress = 99;

            if (progressEl) {
                progressEl.textContent = `${progress}%`;
            }
        }, 200);

        container.dataset.loadingInterval = interval;

        // Safety timeout
        setTimeout(() => {
            if (container.dataset.loadingInterval == interval) {
                this.clearLoadingInterval(container);
                if (container.querySelector('.loading-container')) {
                    container.innerHTML = `
                        <div style="text-align:center; padding:2rem;">
                            <p style="color:var(--text-muted); margin-bottom:1rem;">La carga está tardando demasiado.</p>
                            <button class="cta-btn secondary" onclick="app.renderView()">Reintentar</button>
                        </div>
                    `;
                }
            }
        }, 25000);
    }

    clearLoadingInterval(container) {
        if (container && container.dataset.loadingInterval) {
            clearInterval(parseInt(container.dataset.loadingInterval));
            delete container.dataset.loadingInterval;
        }
    }

    async detectPaymentReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('collection_status') || urlParams.get('status');
        const externalReference = urlParams.get('external_reference');

        if (status === 'approved' && externalReference) {
            console.log('Payment approved detected!', { status, externalReference });

            try {
                // externalReference format: "tournament:TOUR_ID:PLAYER_ID" or "booking:BOOKING_ID"
                const parts = externalReference.split(':');
                const type = parts[0];

                if (type === 'tournament') {
                    const tournamentId = parts[1];
                    const playerId = parts[2];
                    await db.payments.updateTournamentPaymentStatus(tournamentId, playerId, 'paid');
                    this.showToast('¡Pago de inscripción aprobado!', 'success');
                } else if (type === 'booking') {
                    const bookingId = parts[1];
                    await db.payments.updateBookingStatus(bookingId, 'paid');
                    this.showToast('¡Pago de reserva aprobado!', 'success');
                }

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // Refresh current view if needed
                if (this.currentUser) this.renderView();

            } catch (e) {
                console.error('Error processing payment return:', e);
                this.showToast('Error al procesar el pago detectado.', 'error');
            }
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            border: 1px solid rgba(255,255,255,0.1);
        `;

        if (type === 'success') toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        else if (type === 'error') toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        else toast.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // =====================================================
    // THEME SYSTEM (Dark/Light Mode)
    // =====================================================

    toggleTheme() {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        this.updateThemeIcon(newTheme);
        this.showToast(`Tema ${newTheme === 'light' ? 'claro' : 'oscuro'} activado`, 'info');
    }

    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.setAttribute('name', theme === 'light' ? 'sunny-outline' : 'moon-outline');
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    init() {
        // Initialize theme
        this.initTheme();

        // Check for Mercado Pago return
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('status'); // approved, rejected, pending
        const paymentId = urlParams.get('payment_id');

        if (paymentStatus === 'approved' && paymentId) {
            // We need to know which tournament.
            // Paradox: The return URL usually needs to be static or dynamic.
            // If the user configured the link, they probably didn't put ?tournament_id=...
            // UNLESS we tell them to, or we rely on "Pending" enrollment logic.
            // Strategy: We rely on the user having tried to enroll recently or just generic success message.
            // BETTER: We can't auto-enroll without knowing the ID.
            // BUT, if we assume the user clicked "Pay" from the enrollment modal, they are already on the specific tournament context? 
            // Mercado Pago redirects to a clean URL often.

            // For this MVP version: We just show a success message and ask them to confirm enrollment manually if not done, 
            // OR if we stored pending enrollment state in localStorage.

            const pendingTournamentId = localStorage.getItem('mp_pending_tournament_id');
            if (pendingTournamentId) {
                this.finalizePaymentEnrollment(pendingTournamentId, paymentId);
            } else {
                this.showToast('Pago procesado correctamente. Por favor completa tu inscripción.', 'success');
            }
        }

        // Legacy direct init logic
    }

    async finalizePaymentEnrollment(tournamentId, paymentRef) {
        localStorage.removeItem('mp_pending_tournament_id'); // Clear
        try {
            // Check if already enrolled to avoid duplicates
            // We assume standard enroll, but we could update status to 'paid'
            await db.players.enroll(
                tournamentId,
                this.currentUser.id,
                `${this.currentUser.name} ${this.currentUser.lastname || ''}`.trim(),
                this.currentUser.category,
                'paid'
            );
            // We can't easily update the payment_status to 'paid' without a specific function 
            // or RPC, so we enroll them as pending/manual and maybe log the payment ref?
            // For now, standard enroll.
            alert(`¡Pago Aprobado (Ref: ${paymentRef})! \nEstás inscrito en el torneo.`);

            // Navigate to that tournament
            await this.selectTournament(tournamentId);
        } catch (e) {
            console.error(e);
            alert('Pago aprobado pero error en inscripción: ' + e.message + '\nContacta al admin con tu Ref: ' + paymentRef);
        }
    }

    async loadRecentTournament() {
        try {
            // Load active tournaments
            const active = await db.tournaments.getActive();
            if (active && active.length > 0) {
                // Pick the first one for now (or latest start date)
                const tData = active[0];
                console.log('Loading tournament:', tData.name);

                // Map DB data to Tournament class
                this.tournament.init(
                    tData.name,
                    tData.type,
                    tData.category,
                    tData.institutions?.name, // Institution name
                    tData.start_date,
                    tData.duration,
                    tData.observations,
                    tData.rules,
                    tData.registration_deadline
                );
                this.tournament.id = tData.id; // Store ID for updates
                this.tournament.registrationPrice = tData.registration_price;

                // Load Players
                const players = await db.players.getByTournament(tData.id);
                this.tournament.players = (players || []).map(p => ({
                    id: p.player_id, // Use Auth ID as player ID
                    name: p.player_name,
                    category: p.category,
                    // Doubles logic needs team mapping if doubles, but for now simple:
                    members: [p.player_name],
                    isComplete: true,
                    // Stats would need to be calculated from matches or stored?
                    // For now, init stats to 0, updateStandings will recalc from matches
                    matchesPlayed: 0, matchesWon: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, points: 0, diffSets: 0, diffGames: 0
                }));

                // Load Matches
                const matches = await db.matches.getByTournament(tData.id);
                // We need to reconstruct Match objects. 
                // This is tricky because Match object expects Player objects (references).
                // So we map IDs to player objects.

                const playerMap = {};
                this.tournament.players.forEach(p => playerMap[p.id] = p);

                this.tournament.matches = [];
                (matches || []).forEach(m => {
                    const p1 = playerMap[m.player1_id];
                    const p2 = playerMap[m.player2_id];
                    if (p1 && p2) {
                        const matchObj = new Match(p1, p2);
                        matchObj.id = m.id;
                        matchObj.groupNumber = m.group_number;
                        matchObj.roundName = m.round;
                        matchObj.isPlayoff = (m.round !== 'Fase de Grupos');
                        if (m.score) {
                            // m.score is JSON, presumably array of sets or string? 
                            // Our DB schema says JSONB. let's assume it stores the array of objects {p1, p2}
                            // But Match.setScore expects a string usually.
                            // Let's manually set properties if JSON
                            if (Array.isArray(m.score)) {
                                matchObj.sets = m.score;
                                matchObj.isPlayed = true;
                                // Recalc winner locally or trust DB?
                                // matchObj.winner ...
                            }
                        }
                        if (m.winner_id) matchObj.winner = playerMap[m.winner_id];

                        this.tournament.matches.push(matchObj);
                    }
                });

                // Load Groups Structure (from JSON in tournament)
                if (tData.groups && Array.isArray(tData.groups) && tData.groups.length > 0) {
                    // Groups are stored directly with players array
                    this.tournament.groups = tData.groups.map(gData => {
                        return {
                            id: gData.id,
                            players: gData.players || [],
                            matches: [] // Reset matches to allow repopulation with Match objects
                        };
                    });
                    console.log('Loaded groups from DB:', this.tournament.groups.length);
                }

                // REMOVED redundant renderView() call. renderView() is now called once at the end of onUserLogin or specifically by callers.
            } else {
                console.log('No active tournaments found.');
            }
        } catch (e) {
            console.error('Error loading tournament:', e);
        }
    }

    bindGlobalEvents() {
        const btnSave = document.getElementById('btn-save-sheets');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                this.saveToSheets();
            });
        }
    }

    async saveToSheets() {
        if (!this.tournament.name) return alert('No hay datos para guardar.');

        let url = localStorage.getItem('tennis_app_script_url');
        if (!url) {
            url = prompt("Para guardar en Google Sheets, necesitas un 'Web App URL' de Google Apps Script. Ingresa la URL aquí:");
            if (url) {
                localStorage.setItem('tennis_app_script_url', url);
            } else {
                return;
            }
        }

        const btn = document.getElementById('btn-save-sheets');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Guardando...';

        try {
            // Prepare lightweight payload
            const data = {
                details: { name: this.tournament.name, type: this.tournament.type },
                groups: this.tournament.groups.map(g => ({
                    id: g.id,
                    players: g.players.map(p => ({ name: p.name, points: p.points, matches: p.matchesPlayed, diff: p.diffGames })),
                    matches: g.matches.filter(m => m.isPlayed).map(m => ({
                        p1: m.p1.name, p2: m.p2.name, winner: m.winner?.name, score: m.sets
                    }))
                })),
                bracket: this.tournament.bracket.map(round => round.map(m => ({
                    round: m.roundName, p1: m.p1.name, p2: m.p2.name, winner: m.winner?.name, score: m.sets
                })))
            };

            // Using no-cors mode usually for Google Scripts if simple POST, 
            // but reading response requires CORS. Simple fire-and-forget or text response.
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors', // Often needed for Google Script web apps due to redirects
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            alert('Datos enviados a Google Sheets (Cola de procesamiento).');
        } catch (e) {
            console.error(e);
            alert('Error al guardar: ' + e.message);
        } finally {
            btn.innerHTML = originalText;
        }
    }

    setupNavigation() {
        const buttons = document.querySelectorAll('.nav-btn[data-view]');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle click on icon or text
                const target = e.currentTarget;
                const viewName = target.getAttribute('data-view');
                this.navigateTo(viewName);
            });
        });
    }

    navigateTo(viewName) {
        this.currentView = viewName;

        // Update Sidebar
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Close mobile menu if open
        this.closeMobileMenu();

        // Render View
        this.renderView();
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    renderView() {
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');

        if (!container) return;

        // Handle loading cleanup
        this.clearLoadingInterval(container);

        // Reset and Trigger Entry Animation
        container.classList.remove('animate-fade-up');
        void container.offsetWidth; // Trigger reflow
        container.classList.add('animate-fade-up');

        switch (this.currentView) {
            case 'dashboard':
                title.textContent = 'Panel General';
                this.renderDashboardView(container);
                break;
            case 'tournaments':
                title.textContent = 'Mis Torneos';
                // Handled async due to await
                this.renderTournamentsView(container);
                break;
            case 'tournament-dashboard':
                if (!this.tournament.name) {
                    this.navigateTo('tournaments');
                    return;
                }
                title.textContent = 'Panel del Torneo: ' + this.tournament.name;
                container.innerHTML = this.getTournamentDashboardHTML();
                this.bindTournamentDashboardEvents();
                break;
            case 'setup':
                title.textContent = 'Configurar Torneo';
                container.innerHTML = this.getSetupHTML();
                this.bindSetupEvents();
                break;
            case 'groups':
                title.textContent = 'Gestión de Grupos';
                container.innerHTML = this.getGroupsHTML();
                this.bindGroupsEvents();
                break;
            case 'matches':
                title.textContent = 'Cargar Resultados';
                container.innerHTML = this.getMatchesHTML();
                this.bindMatchesEvents();
                break;
            case 'brackets':
                title.textContent = 'Fase Final (Playoffs)';
                this.renderBracketsView();
                break;
            case 'users':
                title.textContent = 'Gestión de Usuarios';
                container.innerHTML = this.getUsersHTML();
                this.bindUsersEvents();
                break;
            case 'institutions':
                title.textContent = 'Gestión de Instituciones';
                container.innerHTML = this.getInstitutionsHTML();
                this.bindInstitutionsEvents();
                break;
            case 'categories':
                // Only superadmin can access categories
                if (this.currentUser?.role !== 'superadmin') {
                    alert('Acceso denegado. Solo superadmin puede gestionar categorías.');
                    this.navigateTo('dashboard');
                    return;
                }
                title.textContent = 'Gestión de Categorías';
                this.renderCategoriesView(container);
                break;
            case 'admin-dashboard':
                if (this.currentUser?.role !== 'superadmin') {
                    this.showToast('Acceso denegado. Solo Super Admin.', 'error');
                    this.navigateTo('dashboard');
                    return;
                }
                title.textContent = 'Panel de Administración';
                this.renderAdminDashboardView(container);
                break;
            case 'ranking':
                title.textContent = 'Ranking General';
                this.renderRankingView(container);
                break;
            case 'ranking-institution':
                title.textContent = `Ranking ${this.selectedInstitutionName || 'Institución'}`;
                this.renderRankingView(container, this.selectedInstitutionId);
                break;
            case 'players':
                title.textContent = 'Jugadores';
                this.renderPlayersView(container);
                break;
            case 'player-detail':
                title.textContent = `Perfil de ${this.selectedPlayerName || 'Jugador'}`;
                this.renderPlayerDetailView(container, this.selectedPlayerId);
                break;
            case 'messages':
                title.textContent = 'Mensajes';
                this.renderMessagesView(container);
                break;
            case 'profile':
                title.textContent = 'Mi Perfil';
                this.renderProfileView(container);
                break;
            case 'tournament-history':
                title.textContent = 'Historial de Torneos';
                this.renderTournamentHistoryView(container);
                break;
            case 'bookings':
                title.textContent = 'Reservas de Canchas';
                this.renderBookingsView(container);
                break;
            case 'payments-management':
                if (this.currentUser?.role !== 'superadmin' && this.currentUser?.role !== 'admin') {
                    this.showToast('Acceso denegado.', 'error');
                    this.navigateTo('dashboard');
                    return;
                }
                title.textContent = 'Gestión de Pagos y Reservas';
                this.renderPaymentsManagementView(container);
                break;
        }
    }

    async renderTournamentsView(container) {
        // REMOVED LOCK to prevent stuck loading screen. 
        // If multiple requests come, we let them race or ideally the latest one wins (Supabase is fast).
        // if (this._isFetchingTournaments) { ... }
        this._isFetchingTournaments = true;
        this._isFetchingTournaments = true;

        this.showLoading(container, 'Cargando torneos...');

        let active = [];
        let loadError = null;

        try {
            console.log('Fetching active tournaments...');

            // Race with timeout
            const fetchPromise = db.tournaments.getActive();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading tournaments (30s).')), 30000));

            active = await Promise.race([fetchPromise, timeoutPromise]);
            console.log('Active tournaments loaded:', active.length);

            // Filter by institution for admin role
            if (this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution_id) {
                active = active.filter(t => t.institution_id === this.currentUser.institution_id);
            }

            // --- LOCATION LOGIC ---
            let nearbyTournaments = [];
            let otherTournaments = [...active];
            let userCoords = null;

            if (this.currentUser && this.currentUser.latitude && this.currentUser.longitude) {
                userCoords = { lat: this.currentUser.latitude, lng: this.currentUser.longitude };

                // Filter nearby (< 40km)
                nearbyTournaments = active.filter(t => {
                    const inst = t.institutions;
                    if (!inst || !inst.latitude || !inst.longitude) return false;
                    const dist = this.getDistance(userCoords.lat, userCoords.lng, inst.latitude, inst.longitude);
                    return dist <= 40; // 40 km radius
                });

                // Remove nearby from 'other' to avoid duplication (optional, user said "prioridad", others in "tablero general")
                // User said: "Los demas torneos los pueda ver, pero en un tablero..."
                // Usually "Others" implies excluding "Nearby".
                const nearbyIds = new Set(nearbyTournaments.map(t => t.id));
                otherTournaments = active.filter(t => !nearbyIds.has(t.id));
            }


            // 2. EXPLORE / GENERAL SEARCH
            // (nearbyTournaments logic handled inside renderTournamentsViewUI for consistency or passed as args)
            // Let's refactor: renderTournamentsView prepares data, renderTournamentsViewUI returns HTML string.

            try {
                const html = this.renderTournamentsViewUI(active, nearbyTournaments, otherTournaments);
                container.innerHTML = html;
            } catch (renderErr) {
                console.error('Critical error in renderTournamentsViewUI:', renderErr);
                container.innerHTML = `<div class="alert error">Error visualizando torneos: ${renderErr.message}</div>`;
            }

            this._activeTournamentsCache = active; // Cache for filtering
            this._isFetchingTournaments = false;

            // Initialize Map if requested or default
            // By default list view, but if user switches...
        } catch (err) {
            console.error('Error rendering tournaments view:', err);
            container.innerHTML = '<div class="alert error">Error al cargar torneos</div>';
            this._isFetchingTournaments = false;
        }
    }

    renderTournamentsViewUI(active, nearbyTournaments, otherTournaments) {
        // Splitting UI generation for easier toggling
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div class="view-toggle" style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:4px; display:flex; gap:4px;">
                    <button id="btn-view-list" class="toggle-btn active" onclick="app.toggleTournamentsView('list')" style="padding:6px 12px; border:none; background:var(--accent); color:white; border-radius:6px; cursor:pointer;">
                        <ion-icon name="list-outline"></ion-icon> Lista
                    </button>
                    <button id="btn-view-map" class="toggle-btn" onclick="app.toggleTournamentsView('map')" style="padding:6px 12px; border:none; background:transparent; color:var(--text-muted); border-radius:6px; cursor:pointer;">
                        <ion-icon name="map-outline"></ion-icon> Mapa
                    </button>
                </div>
                <button class="cta-btn" onclick="app.startNewTournament()">
                    <ion-icon name="add-circle-outline"></ion-icon> Nuevo Torneo
                </button>
            </div>

            <!-- SEARCH / FILTERS (Common) -->
            <div id="tournaments-filters" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                 <select id="filter-country" class="form-input" style="width:auto;" onchange="app.filterTournamentsUI()">
                    <option value="all">Todos los Países</option>
                    ${[...new Set(active.map(t => t.institutions?.country).filter(Boolean))].map(c => `<option value="${c}">${c}</option>`).join('')}
                 </select>
                 <select id="filter-province" class="form-input" style="width:auto;" onchange="app.filterTournamentsUI()">
                    <option value="all">Todas las Provincias</option>
                     ${[...new Set(active.map(t => t.institutions?.province).filter(Boolean))].map(p => `<option value="${p}">${p}</option>`).join('')}
                 </select>
                 <select id="filter-city" class="form-input" style="width:auto;" onchange="app.filterTournamentsUI()">
                    <option value="all">Todas las Ciudades</option>
                    ${[...new Set(active.map(t => t.institutions?.city).filter(Boolean))].map(c => `<option value="${c}">${c}</option>`).join('')}
                 </select>
            </div>

            <!-- LIST VIEW CONTAINER -->
            <div id="tournaments-list-view">
                ${nearbyTournaments.length > 0 ? `
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color:var(--primary); display:flex; align-items:center; gap:0.5rem;">
                            <ion-icon name="location"></ion-icon> Cerca de ti (< 40km)
                        </h3>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.5rem;">
                            ${nearbyTournaments.map(t => this.createTournamentCard(t)).join('')}
                        </div>
                    </div>
                    <hr style="border:0; border-top:1px solid var(--border); margin: 2rem 0;">
                ` : ''}

                <h3 style="color:var(--accent); margin-bottom:1rem;">Explorar Torneos</h3>
                <div id="tournaments-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.5rem;">
                    ${active.length === 0 ? '<p class="text-muted">No hay torneos activos.</p>' :
                otherTournaments.map(t => this.createTournamentCard(t)).join('')}
                </div>
            </div>

            <!-- MAP VIEW CONTAINER -->
            <div id="tournaments-map-view" style="display:none; height: 600px; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--border);">
                <div id="tournaments-map" style="height: 100%; width: 100%;"></div>
            </div>

            <!-- HISTORY LINK -->
            <div style="margin-top: 3rem; text-align: center;">
                <button class="cta-btn secondary" onclick="app.navigateTo('history')">
                    <ion-icon name="time-outline"></ion-icon> Ver Historial de Torneos
                </button>
            </div>
        `;
        return html;
    }

    toggleTournamentsView(mode) {
        const listBtn = document.getElementById('btn-view-list');
        const mapBtn = document.getElementById('btn-view-map');
        const listView = document.getElementById('tournaments-list-view');
        const mapView = document.getElementById('tournaments-map-view');

        if (mode === 'list') {
            listBtn.classList.add('active');
            listBtn.style.background = 'var(--accent)';
            listBtn.style.color = 'white';

            mapBtn.classList.remove('active');
            mapBtn.style.background = 'transparent';
            mapBtn.style.color = 'var(--text-muted)';

            listView.style.display = 'block';
            mapView.style.display = 'none';
        } else {
            mapBtn.classList.add('active');
            mapBtn.style.background = 'var(--accent)';
            mapBtn.style.color = 'white';

            listBtn.classList.remove('active');
            listBtn.style.background = 'transparent';
            listBtn.style.color = 'var(--text-muted)';

            listView.style.display = 'none';
            mapView.style.display = 'block';

            // Init map if not already done
            if (!this._tournamentsMapInitialized) {
                this.initTournamentsMap(this._activeTournamentsCache || []);
            } else {
                // Resize trigger needed when showing map from hidden state
                setTimeout(() => {
                    if (this._mapInstance) this._mapInstance.invalidateSize();
                }, 100);
            }
        }
    }

    initTournamentsMap(tournaments) {
        if (!document.getElementById('tournaments-map')) return;

        // Default center (Argentina)
        let center = [-38.416097, -63.616672];
        let zoom = 4;

        // If user has location, center there
        if (this.currentUser && this.currentUser.latitude) {
            center = [this.currentUser.latitude, this.currentUser.longitude];
            zoom = 10;
        }

        this._mapInstance = L.map('tournaments-map').setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this._mapInstance);

        // User Marker
        if (this.currentUser && this.currentUser.latitude) {
            const userIcon = L.divIcon({
                className: 'user-pin',
                html: '<div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20]
            });
            L.marker([this.currentUser.latitude, this.currentUser.longitude], { icon: userIcon })
                .addTo(this._mapInstance)
                .bindPopup('<b>Tu ubicación</b>');
        }

        // Tournament Markers
        const markers = L.featureGroup();

        tournaments.forEach(t => {
            const inst = t.institutions;
            if (inst && inst.latitude && inst.longitude) {
                const marker = L.marker([inst.latitude, inst.longitude])
                    .addTo(this._mapInstance)
                    .bindPopup(`
                        <div style="text-align:center; min-width:150px;">
                            <h4 style="margin:0 0 5px; color:#333;">${t.name}</h4>
                            <p style="margin:0; font-size:0.8rem; color:#666;">${inst.name}</p>
                            <p style="margin:0 0 8px; font-size:0.8rem; color:#666;">${t.category} - ${t.type}</p>
                            <button onclick="app.selectTournament('${t.id}')" style="background:var(--accent); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Ver Torneo</button>
                        </div>
                    `);
                markers.addLayer(marker);
            }
        });

        if (markers.getLayers().length > 0) {
            this._mapInstance.addLayer(markers);
            // Fit bounds to show all tournaments (or at least nearby ones)
            // setTimeout(() => this._mapInstance.fitBounds(markers.getBounds().pad(0.1)), 500); 
        }

        this._tournamentsMapInitialized = true;
    }

    createTournamentCard(t) {
        const inst = t.institutions;
        const locationStr = inst ? (inst.city ? `${inst.city}, ${inst.province || ''}` : inst.name) : 'Ubicación desconocida';

        return `
            <div class="card tournament-card" data-country="${inst?.country || ''}" data-province="${inst?.province || ''}" data-city="${inst?.city || ''}"
                 style="cursor:pointer; transition:transform 0.2s; border:1px solid var(--border);" 
                 onclick="app.selectTournament('${t.id}')" 
                 onmouseover="this.style.transform='translateY(-4px)'" 
                 onmouseout="this.style.transform='translateY(0)'">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
                    <h4 style="color:var(--accent); margin:0;">${t.name}</h4>
                    <span style="background:#22c55e; color:white; font-size:0.7rem; padding:2px 6px; border-radius:4px;">ACTIVO</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
                     <div style="margin-bottom:0.2rem; color:var(--text-main); font-weight:500;">
                        <ion-icon name="location-outline" style="vertical-align:text-bottom;"></ion-icon> ${locationStr}
                     </div>
                    <div><ion-icon name="calendar-outline"></ion-icon> Inicio: ${t.start_date || 'N/D'}</div>
                    <div><ion-icon name="people-outline"></ion-icon> Cat: ${t.category}</div>
                    <div><ion-icon name="tennisball-outline"></ion-icon> Tipo: ${t.type === 'singles' ? 'Singles' : 'Dobles'}</div>
                </div>
            </div>
        `;
    }

    filterTournamentsUI() {
        const country = document.getElementById('filter-country').value;
        const province = document.getElementById('filter-province').value;
        const city = document.getElementById('filter-city').value;

        const cards = document.querySelectorAll('#tournaments-grid .tournament-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cCountry = card.dataset.country;
            const cProvince = card.dataset.province;
            const cCity = card.dataset.city;

            let show = true;
            if (country !== 'all' && cCountry !== country) show = false;
            if (province !== 'all' && cProvince !== province) show = false;
            if (city !== 'all' && cCity !== city) show = false;

            card.style.display = show ? 'block' : 'none';
            if (show) visibleCount++;
        });

        if (visibleCount === 0) {
            // Maybe show specific message
        }
    }

    // Simplified filtering logic (already handles institutions)
    filterInstitutions(query) {
        const cards = document.querySelectorAll('.institution-card');
        let visibleCount = 0;
        const q = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const city = card.querySelector('.inst-city')?.textContent.toLowerCase() || '';
            const show = name.includes(q) || city.includes(q);
            card.style.display = show ? 'block' : 'none';
            if (show) visibleCount++;
        });
    }

    getDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }


    async renderTournamentHistoryView(container) {
        this.showLoading(container, 'Cargando historial...');

        try {
            const finishedTournaments = await db.tournaments.getFinished();

            if (finishedTournaments.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:3rem;">
                        <ion-icon name="trophy-outline" style="font-size:4rem; color:var(--text-muted); margin-bottom:1rem;"></ion-icon>
                        <h2 style="color:var(--text-muted); margin-bottom:0.5rem;">No hay torneos finalizados</h2>
                        <p style="color:var(--text-muted);">Los torneos completados aparecerán aquí con sus campeones y estadísticas.</p>
                        <button class="cta-btn secondary" onclick="app.navigateTo('tournaments')" style="margin-top:1rem;">
                            <ion-icon name="arrow-back-outline"></ion-icon> Ver Torneos Activos
                        </button>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                        <div>
                            <p style="color:var(--text-muted); margin:0;">${finishedTournaments.length} torneo${finishedTournaments.length !== 1 ? 's' : ''} finalizado${finishedTournaments.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button class="cta-btn secondary" onclick="app.navigateTo('tournaments')">
                            <ion-icon name="trophy-outline"></ion-icon> Torneos Activos
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1.5rem;">
                        ${finishedTournaments.map(t => {
                const champion = t.champion_name || 'Por determinar';
                const instName = t.institutions?.name || 'Sin institución';
                const finishDate = t.updated_at ? new Date(t.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/D';
                const startDate = t.start_date ? new Date(t.start_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';

                return `
                                <div class="card" style="cursor:pointer; transition:all 0.2s; border:1px solid var(--border); overflow:hidden;"
                                     onclick="app.selectTournament('${t.id}')"
                                     onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent)';"
                                     onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)';">
                                    
                                    <div style="background: linear-gradient(135deg, rgba(190,242,100,0.1), rgba(56,189,248,0.05)); padding:1rem; border-bottom:1px solid var(--border);">
                                        <div style="display:flex; justify-content:space-between; align-items:start;">
                                            <h4 style="color:var(--accent); margin:0; font-size:1.1rem;">${t.name}</h4>
                                            <span style="background:var(--text-muted); color:var(--bg-card); font-size:0.65rem; padding:2px 6px; border-radius:4px; text-transform:uppercase;">Finalizado</span>
                                        </div>
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">
                                            <ion-icon name="business-outline" style="vertical-align:middle;"></ion-icon> ${instName}
                                        </div>
                                    </div>
                                    
                                    <div style="padding:1rem;">
                                        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem; padding:0.75rem; background:rgba(245,158,11,0.1); border-radius:0.5rem; border:1px solid rgba(245,158,11,0.2);">
                                            <ion-icon name="trophy" style="font-size:1.5rem; color:#f59e0b;"></ion-icon>
                                            <div>
                                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Campeón</div>
                                                <div style="font-weight:600; color:var(--text-main);">${champion}</div>
                                            </div>
                                        </div>
                                        
                                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem;">
                                            <div>
                                                <div style="color:var(--text-muted);"><ion-icon name="calendar-outline" style="vertical-align:middle;"></ion-icon> Fecha</div>
                                                <div style="color:var(--text-main);">${startDate} - ${finishDate}</div>
                                            </div>
                                            <div>
                                                <div style="color:var(--text-muted);"><ion-icon name="pricetag-outline" style="vertical-align:middle;"></ion-icon> Categoría</div>
                                                <div style="color:var(--text-main);">${t.category || 'N/D'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style="padding:0.75rem 1rem; border-top:1px solid var(--border); text-align:center;">
                                        <span style="color:var(--primary); font-size:0.85rem;">
                                            <ion-icon name="eye-outline" style="vertical-align:middle;"></ion-icon> Ver Detalles
                                        </span>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (err) {
            console.error('Error loading tournament history:', err);
            container.innerHTML = `<div class="alert error">Error al cargar historial: ${err.message}</div>`;
        }
    }

    async renderAdminDashboardView(container) {
        this.showLoading(container, 'Cargando panel admin...');

        try {
            // Fetch all metrics in parallel
            const [users, tournaments, institutions, categories, logs] = await Promise.all([
                db.users.getAll(),
                db.tournaments.getAll(),
                db.institutions.getAll(),
                db.categories.getAll(),
                window.db?.logs ? db.logs.getRecent(20) : Promise.resolve([])
            ]);

            // Calculate metrics
            const totalUsers = users.length;
            const approvedPlayers = users.filter(u => u.role === 'player' && u.is_approved).length;
            const pendingPlayers = users.filter(u => u.role === 'player' && !u.is_approved).length;
            const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;

            const activeTournaments = tournaments.filter(t => t.status === 'active').length;
            const finishedTournaments = tournaments.filter(t => t.status === 'finished').length;
            const draftTournaments = tournaments.filter(t => t.status === 'draft').length;

            // Recent activity (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentUsers = users.filter(u => new Date(u.created_at) > weekAgo).length;
            const recentTournaments = tournaments.filter(t => new Date(t.created_at) > weekAgo).length;

            let html = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div style="margin-bottom: 2rem;">
                        <p style="color:var(--text-muted); margin:0;">Resumen global del sistema</p>
                    </div>

                    <!-- Main Stats Grid -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
                        <div class="stat-card" style="background:linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05)); border:1px solid rgba(56,189,248,0.3);">
                            <ion-icon name="people" style="font-size:2rem; color:var(--primary);"></ion-icon>
                            <div class="stat-value" style="color:var(--primary);">${totalUsers}</div>
                            <div class="stat-label">Usuarios Totales</div>
                        </div>
                        <div class="stat-card" style="background:linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05)); border:1px solid rgba(34,197,94,0.3);">
                            <ion-icon name="checkmark-circle" style="font-size:2rem; color:#22c55e;"></ion-icon>
                            <div class="stat-value" style="color:#22c55e;">${approvedPlayers}</div>
                            <div class="stat-label">Jugadores Activos</div>
                        </div>
                        <div class="stat-card" style="background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05)); border:1px solid rgba(245,158,11,0.3);">
                            <ion-icon name="hourglass" style="font-size:2rem; color:#f59e0b;"></ion-icon>
                            <div class="stat-value" style="color:#f59e0b;">${pendingPlayers}</div>
                            <div class="stat-label">Pendientes Aprobación</div>
                        </div>
                        <div class="stat-card" style="background:linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05)); border:1px solid rgba(168,85,247,0.3);">
                            <ion-icon name="trophy" style="font-size:2rem; color:#a855f7;"></ion-icon>
                            <div class="stat-value" style="color:#a855f7;">${tournaments.length}</div>
                            <div class="stat-label">Torneos Totales</div>
                        </div>
                    </div>

                    <!-- Secondary Stats -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
                        <!-- Tournament Status -->
                        <div class="card" style="padding:1.5rem;">
                            <h4 style="color:var(--accent); margin-bottom:1rem;"><ion-icon name="trophy-outline" style="vertical-align:middle;"></ion-icon> Estado de Torneos</h4>
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Activos</span>
                                    <span style="background:#22c55e; color:white; padding:0.25rem 0.75rem; border-radius:1rem; font-size:0.85rem; font-weight:600;">${activeTournaments}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Finalizados</span>
                                    <span style="background:var(--text-muted); color:var(--bg-card); padding:0.25rem 0.75rem; border-radius:1rem; font-size:0.85rem; font-weight:600;">${finishedTournaments}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Borradores</span>
                                    <span style="background:rgba(56,189,248,0.2); color:var(--primary); padding:0.25rem 0.75rem; border-radius:1rem; font-size:0.85rem; font-weight:600;">${draftTournaments}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Platform Stats -->
                        <div class="card" style="padding:1.5rem;">
                            <h4 style="color:var(--accent); margin-bottom:1rem;"><ion-icon name="grid-outline" style="vertical-align:middle;"></ion-icon> Plataforma</h4>
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Instituciones</span>
                                    <span style="font-weight:600; color:var(--text-main);">${institutions.length}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Categorías</span>
                                    <span style="font-weight:600; color:var(--text-main);">${categories.length}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Administradores</span>
                                    <span style="font-weight:600; color:var(--text-main);">${admins}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Activity -->
                        <div class="card" style="padding:1.5rem;">
                            <h4 style="color:var(--accent); margin-bottom:1rem;"><ion-icon name="time-outline" style="vertical-align:middle;"></ion-icon> Últimos 7 días</h4>
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Nuevos usuarios</span>
                                    <span style="font-weight:600; color:var(--primary);">+${recentUsers}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-muted);">Torneos creados</span>
                                    <span style="font-weight:600; color:var(--primary);">+${recentTournaments}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card" style="padding:1.5rem;">
                        <h4 style="color:var(--accent); margin-bottom:1rem;"><ion-icon name="flash-outline" style="vertical-align:middle;"></ion-icon> Acciones Rápidas</h4>
                        <div style="display:flex; flex-wrap:wrap; gap:1rem;">
                            <button class="cta-btn" onclick="app.navigateTo('users')" style="padding:0.75rem 1.5rem;">
                                <ion-icon name="person-add-outline"></ion-icon> Gestionar Usuarios
                            </button>
                            <button class="cta-btn secondary" onclick="app.navigateTo('institutions')" style="padding:0.75rem 1.5rem;">
                                <ion-icon name="business-outline"></ion-icon> ${this.currentUser.role === 'admin' ? 'Mi Institución' : 'Instituciones'}
                            </button>
                            <button class="cta-btn secondary" onclick="app.navigateTo('categories')" style="padding:0.75rem 1.5rem;">
                                <ion-icon name="pricetags-outline"></ion-icon> Categorías
                            </button>
                            <button class="cta-btn secondary" onclick="app.navigateTo('messages')" style="padding:0.75rem 1.5rem;">
                                <ion-icon name="mail-outline"></ion-icon> Mensajes
                            </button>
                        </div>
                    </div>
                    </div>

                    <!-- Audit Logs -->
                    <div class="card" style="padding:1.5rem; margin-top: 2rem;">
                        <h4 style="color:var(--text-main); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                            <ion-icon name="clipboard-outline"></ion-icon> Logs de Auditoría (Últimos 20)
                        </h4>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                                <thead>
                                    <tr style="text-align:left; color:var(--text-muted); border-bottom:1px solid var(--border);">
                                        <th style="padding:0.75rem;">Fecha</th>
                                        <th style="padding:0.75rem;">Usuario</th>
                                        <th style="padding:0.75rem;">Acción</th>
                                        <th style="padding:0.75rem;">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.length === 0 ? '<tr><td colspan="4" style="padding:1rem; text-align:center; color:var(--text-muted);">No hay registros o la tabla no existe aún.</td></tr>' :
                    logs.map(log => {
                        const username = log.users ? `${log.users.name || ''} ${log.users.lastname || ''}` : 'Usuario eliminado';
                        const date = new Date(log.created_at).toLocaleString();
                        const actionMap = {
                            'approve_user': '<span style="color:#22c55e;">Aprobar Usuario</span>',
                            'reject_user': '<span style="color:#ef4444;">Rechazar Usuario</span>',
                            'create_tournament': '<span style="color:#3b82f6;">Crear Torneo</span>',
                            'finalize_tournament': '<span style="color:#f59e0b;">Finalizar Torneo</span>'
                        };
                        const actionDisplay = actionMap[log.action] || log.action;

                        let detailsStr = '-';
                        try {
                            if (log.details) {
                                if (log.action.includes('user')) {
                                    detailsStr = `${log.details.target_user_name || 'ID ' + log.details.target_user_id}`;
                                } else if (log.action.includes('tournament')) {
                                    detailsStr = `${log.details.name || log.details.tournament_name || 'ID ' + log.details.tournament_id}`;
                                } else {
                                    detailsStr = JSON.stringify(log.details);
                                }
                            }
                        } catch (e) { detailsStr = 'Error parsing details'; }

                        return `
                                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                            <td style="padding:0.75rem; color:var(--text-muted);">${date}</td>
                                            <td style="padding:0.75rem;">${username}</td>
                                            <td style="padding:0.75rem;">${actionDisplay}</td>
                                            <td style="padding:0.75rem; color:var(--text-muted); font-family:monospace;">${detailsStr}</td>
                                        </tr>`;
                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (err) {
            console.error('Error loading admin dashboard:', err);
            container.innerHTML = `<div class="alert error">Error al cargar panel: ${err.message}</div>`;
        }
    }

    async renderPaymentsManagementView(container) {
        this.showLoading(container, 'Cargando gestión de pagos...');
        try {
            const instId = (this.currentUser.role === 'admin') ? this.currentUser.institution_id : null;

            const [enrollments, bookings] = await Promise.all([
                db.payments.getTournamentPayments(instId),
                db.payments.getBookingPayments(instId)
            ]);

            let html = `
                <div style="max-width: 1200px; margin: 0 auto; padding: 1rem;">
                    <div class="tabs" style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border);">
                        <button class="nav-btn active" id="tab-enrollments" onclick="document.querySelectorAll('.tab-content').forEach(c => c.style.display='none'); document.getElementById('content-enrollments').style.display='block'; document.querySelectorAll('.tabs .nav-btn').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                            <ion-icon name="trophy-outline"></ion-icon> Inscripciones a Torneos
                        </button>
                        <button class="nav-btn" id="tab-bookings" onclick="document.querySelectorAll('.tab-content').forEach(c => c.style.display='none'); document.getElementById('content-bookings').style.display='block'; document.querySelectorAll('.tabs .nav-btn').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                            <ion-icon name="calendar-outline"></ion-icon> Alquiler de Canchas
                        </button>
                    </div>

                    <div id="content-enrollments" class="tab-content">
                        <div class="card" style="padding: 1.5rem;">
                            <h4 style="margin-bottom: 1rem;">Control de Pagos de Inscripción</h4>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="text-align: left; color: var(--text-muted); border-bottom: 1px solid var(--border);">
                                            <th style="padding: 1rem;">Jugador</th>
                                            <th style="padding: 1rem;">Torneo</th>
                                            <th style="padding: 1rem;">Precio</th>
                                            <th style="padding: 1rem;">Estado</th>
                                            <th style="padding: 1rem;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${enrollments.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay inscripciones con pago pendiente.</td></tr>' :
                    enrollments.map(e => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 1rem;">
                                                    <div style="font-weight: 600;">${e.player_name}</div>
                                                </td>
                                                <td style="padding: 1rem;">
                                                    <div style="font-size: 0.9rem;">${e.tournaments.name}</div>
                                                </td>
                                                <td style="padding: 1rem; color: var(--accent);">$${e.tournaments.registration_price}</td>
                                                <td style="padding: 1rem;">
                                                    <span class="status-badge" style="background: ${e.payment_status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}; color: ${e.payment_status === 'paid' ? '#22c55e' : '#f59e0b'};">
                                                        ${e.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td style="padding: 1rem;">
                                                    ${e.payment_status !== 'paid' ? `
                                                        <button class="cta-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="app.updatePaymentStatus('tournament', null, 'paid', '${e.tournament_id}', '${e.player_id}')">
                                                            Validar Pago
                                                        </button>
                                                    ` : `
                                                        <button class="cta-btn secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="app.updatePaymentStatus('tournament', null, 'pending', '${e.tournament_id}', '${e.player_id}')">
                                                            X Anular
                                                        </button>
                                                    `}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div id="content-bookings" class="tab-content" style="display: none;">
                        <div class="card" style="padding: 1.5rem;">
                            <h4 style="margin-bottom: 1rem;">Alquileres por Cobrar</h4>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="text-align: left; color: var(--text-muted); border-bottom: 1px solid var(--border);">
                                            <th style="padding: 1rem;">Fecha/Hora</th>
                                            <th style="padding: 1rem;">Cancha</th>
                                            <th style="padding: 1rem;">Precio</th>
                                            <th style="padding: 1rem;">Estado</th>
                                            <th style="padding: 1rem;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${bookings.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay alquileres registrados.</td></tr>' :
                    bookings.map(b => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 1rem;">
                                                    <div style="font-weight: 600;">${new Date(b.date).toLocaleDateString()}</div>
                                                    <div style="font-size: 0.8rem; color: var(--text-muted);">${b.start_time} - ${b.end_time}</div>
                                                </td>
                                                <td style="padding: 1rem;">${b.court_name}</td>
                                                <td style="padding: 1rem; color: var(--accent);">$${b.total_price}</td>
                                                <td style="padding: 1rem;">
                                                    <span class="status-badge" style="background: ${b.payment_status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}; color: ${b.payment_status === 'paid' ? '#22c55e' : '#f59e0b'};">
                                                        ${b.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td style="padding: 1rem;">
                                                    ${b.payment_status !== 'paid' ? `
                                                        <button class="cta-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="app.updatePaymentStatus('booking', '${b.id}', 'paid')">
                                                            Validar Pago
                                                        </button>
                                                    ` : `
                                                        <button class="cta-btn secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="app.updatePaymentStatus('booking', '${b.id}', 'pending')">
                                                            X Anular
                                                        </button>
                                                    `}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } catch (err) {
            console.error('Error rendering payment management:', err);
            container.innerHTML = `<div class="alert error">${err.message}</div>`;
        }
    }

    async updatePaymentStatus(type, id, status, tournamentId, playerId) {
        try {
            if (type === 'tournament') {
                await db.payments.updateTournamentPaymentStatus(tournamentId, playerId, status);
                this.showToast('Estado de inscripción actualizado', 'success');
            } else {
                await db.payments.updateBookingStatus(id, status);
                this.showToast('Estado de reserva actualizado', 'success');
            }
            this.renderPaymentsManagementView(document.getElementById('view-container'));
        } catch (e) {
            console.error(e);
            this.showToast('Error al actualizar: ' + e.message, 'error');
        }
    }

    async renderRankingView(container, institutionId = null, genderFilter = 'mixto', categoryFilter = 'all') {
        this.showLoading(container, 'Cargando ranking...');

        try {
            // Get all players with their stats
            let allPlayers = await db.users.getByRole('player') || [];
            const institutions = await db.institutions.getAll() || [];

            let players = [...allPlayers];

            // 1. Filter by Institution
            if (institutionId) {
                players = players.filter(p => p.institution_id === institutionId);
            }

            // 2. Filter by Gender
            if (genderFilter !== 'mixto') {
                players = players.filter(p => p.gender === genderFilter);
            }

            // 3. Filter by Category
            if (categoryFilter !== 'all') {
                players = players.filter(p => p.category === categoryFilter);
            }

            // Sort players for specific ranking cards
            const winnersByTournaments = [...players].sort((a, b) => (b.tournaments_won || 0) - (a.tournaments_won || 0));
            const winnersByMatches = [...players].sort((a, b) => (b.matches_won || 0) - (a.matches_won || 0));

            // Store current filters
            this.currentRankingGender = genderFilter;
            this.currentRankingCategory = categoryFilter;

            let html = '';

            // Layout Container
            html += `<div style="max-width: 1200px; margin: 0 auto;">`;

            // Back button for institution-specific ranking
            if (institutionId) {
                html += `
                <button class="nav-btn" onclick="app.renderRankingView(document.getElementById('view-container'), null)" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.05);">
                    <ion-icon name="arrow-back-outline"></ion-icon> Volver al Ranking General
                </button>
                `;
            }

            // --- FILTERS ROW ---
            html += `<div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">`;

            // A. Gender Tabs
            html += `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${['mixto', 'masculino', 'femenino'].map(g => `
                    <button class="cta-btn ${genderFilter === g ? '' : 'secondary'}" 
                        style="padding: 0.5rem 1.5rem; font-size: 0.85rem; min-width: 120px;"
                        onclick="app.renderRankingView(document.getElementById('view-container'), ${institutionId ? `'${institutionId}'` : 'null'}, '${g}', '${categoryFilter}')">
                        ${g === 'mixto' ? 'General' : g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                `).join('')}
            </div>
            `;

            // B. Category Tabs
            const dbCategories = await db.categories.getAll();
            const categoryNames = ['all', ...dbCategories.map(c => c.name)];

            html += `
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; background: rgba(0,0,0,0.2); padding: 0.4rem; border-radius: 0.75rem; border: 1px solid var(--border);">
                ${categoryNames.map(c => `
                    <button class="nav-btn ${categoryFilter === c ? 'active' : ''}" 
                        style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 0.5rem; ${categoryFilter === c ? 'background: var(--primary); color: var(--bg-sidebar);' : ''}"
                        onclick="app.renderRankingView(document.getElementById('view-container'), ${institutionId ? `'${institutionId}'` : 'null'}, '${genderFilter}', '${c}')">
                        ${c === 'all' ? 'Todas' : c}
                    </button>
                `).join('')}
            </div>
            `;

            html += `</div>`; // End Filters Row

            // --- PODIUM ---
            const top3 = winnersByTournaments.slice(0, 3);
            if (top3.length > 0) {
                html += `
                <div class="podium-container">
                    ${top3[1] ? `
                    <div class="podium-item podium-2">
                        <div class="podium-user">
                            <div class="podium-avatar"><ion-icon name="person-outline"></ion-icon></div>
                            <div class="podium-name">${top3[1].name}</div>
                        </div>
                        <div class="podium-base">2</div>
                    </div>` : ''}
                    
                    <div class="podium-item podium-1">
                        <div class="podium-user">
                            <ion-icon name="trophy" style="color: #f59e0b; font-size: 2rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 10px rgba(245,158,11,0.5));"></ion-icon>
                            <div class="podium-avatar" style="width:80px; height:80px; font-size:2.5rem;"><ion-icon name="person"></ion-icon></div>
                            <div class="podium-name" style="font-size:1.1rem; color:var(--accent);">${top3[0].name}</div>
                        </div>
                        <div class="podium-base">1</div>
                    </div>

                    ${top3[2] ? `
                    <div class="podium-item podium-3">
                        <div class="podium-user">
                            <div class="podium-avatar"><ion-icon name="person-outline"></ion-icon></div>
                            <div class="podium-name">${top3[2].name}</div>
                        </div>
                        <div class="podium-base">3</div>
                    </div>` : ''}
                </div>
                `;
            }

            // --- RANKING TABLES ---
            html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-bottom: 3rem;">`;

            // Winners by Tournaments
            html += `
            <div class="glass-card" style="padding: 2rem;">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: var(--accent);">
                    <ion-icon name="ribbon-outline"></ion-icon> Ranking de Torneos
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                        <thead>
                            <tr style="text-align: left; color: var(--text-muted); border-bottom: 2px solid rgba(255,255,255,0.05);">
                                <th style="padding: 1rem 0.5rem; width: 50px;">#</th>
                                <th style="padding: 1rem 0.5rem;">Jugador</th>
                                <th style="padding: 1rem 0.5rem; text-align: center;">Títulos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${winnersByTournaments.length === 0 ? '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay registros</td></tr>' :
                    winnersByTournaments.slice(0, 10).map((p, i) => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 1rem 0.5rem; font-weight: bold; color: ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-muted)'};">
                                            ${i < 3 ? `<ion-icon name="medal" style="font-size:1.1rem;"></ion-icon>` : i + 1}
                                        </td>
                                        <td style="padding: 1rem 0.5rem;">
                                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;"><ion-icon name="person"></ion-icon></div>
                                                ${p.name} ${p.lastname || ''}
                                            </div>
                                        </td>
                                        <td style="padding: 1rem 0.5rem; text-align: center;">
                                            <span class="stat-badge" style="background: rgba(190, 242, 100, 0.1); color: var(--accent);">${p.tournaments_won || 0}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

            // Winners by Matches
            html += `
            <div class="glass-card" style="padding: 2rem;">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: var(--primary);">
                    <ion-icon name="tennisball-outline"></ion-icon> Victorias Totales
                </h3>
                 <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                        <thead>
                            <tr style="text-align: left; color: var(--text-muted); border-bottom: 2px solid rgba(255,255,255,0.05);">
                                <th style="padding: 1rem 0.5rem; width: 50px;">#</th>
                                <th style="padding: 1rem 0.5rem;">Jugador</th>
                                <th style="padding: 1rem 0.5rem; text-align: center;">Partidos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${winnersByMatches.length === 0 ? '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay registros</td></tr>' :
                    winnersByMatches.slice(0, 10).map((p, i) => `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 1rem 0.5rem; font-weight: bold; color: ${i === 0 ? '#22c55e' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-muted)'};">
                                            ${i + 1}
                                        </td>
                                        <td style="padding: 1rem 0.5rem;">
                                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;"><ion-icon name="person"></ion-icon></div>
                                                ${p.name} ${p.lastname || ''}
                                            </div>
                                        </td>
                                        <td style="padding: 1rem 0.5rem; text-align: center;">
                                            <span class="stat-badge" style="background: rgba(56, 189, 248, 0.1); color: var(--primary);">${p.matches_won || 0}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

            html += `</div>`; // End Grid

            // --- HISTORY SECTION ---
            try {
                const finishedTournaments = (await db.tournaments.getAll() || []).filter(t => t.status === 'finished');

                if (finishedTournaments.length > 0) {
                    html += `
                    <div class="glass-card" style="padding: 2.5rem; margin-top: 2rem; border: 1px solid rgba(190, 242, 100, 0.2);">
                        <h2 style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; color: var(--accent); font-size: 1.5rem;">
                            <ion-icon name="journal-outline" style="font-size: 1.75rem;"></ion-icon> Galería de Campeones
                        </h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                            ${finishedTournaments.map(t => {
                        const champion = t.bracket && t.bracket.length > 0 ? t.bracket[t.bracket.length - 1][0]?.winner?.name : 'Desconocido';
                        return `
                                <div class="card" style="margin-bottom: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                        <div style="background: var(--accent); color: var(--bg-sidebar); padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Finalizado</div>
                                        <div style="color: var(--text-muted); font-size: 0.75rem;">${new Date(t.startDate).toLocaleDateString()}</div>
                                    </div>
                                    <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${t.name}</h4>
                                    <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Campeón:</div>
                                        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent); font-weight: 700;">
                                            <ion-icon name="trophy-outline"></ion-icon>
                                            ${champion}
                                        </div>
                                    </div>
                                </div>
                                `;
                    }).join('')}
                        </div>
                    </div>
                    `;
                }
            } catch (historyErr) {
                console.warn('Error loading history:', historyErr);
            }

            // --- INSTITUTIONS SECTION ---
            if (!institutionId) {
                html += `
                <h3 style="color: var(--primary); margin: 3rem 0 1rem 0;">
                    <ion-icon name="business-outline"></ion-icon> Rankings por Institución
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                    ${institutions.length === 0 ? '<p style="color:var(--text-muted)">No hay instituciones registradas.</p>' :
                        institutions.map(inst => `
                            <div class="card" style="cursor: pointer; transition: all 0.2s; border: 1px solid var(--border);" 
                                 onclick="app.selectInstitutionRanking('${inst.id}', '${inst.name}')"
                                 onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--primary)';"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)';">
                                <h4 style="margin: 0; color: var(--accent);">
                                    <ion-icon name="podium-outline" style="margin-right: 0.5rem;"></ion-icon>
                                    Ranking ${inst.name}
                                </h4>
                                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                                    Ver líderes de esta institución
                                </p>
                            </div>
                        `).join('')}
                </div>
                `;
            }

            html += `</div>`; // End Layout Container
            container.innerHTML = html;

        } catch (e) {
            console.error('Error rendering ranking:', e);
            container.innerHTML = `<p style="color:red">Error cargando ranking: ${e.message}</p>`;
        }
    }

    selectInstitutionRanking(id, name) {
        this.selectedInstitutionId = id;
        this.selectedInstitutionName = name;
        this.navigateTo('ranking-institution');
    }

    filterRankingByGender(gender, institutionId = null) {
        const container = document.getElementById('view-container');
        this.renderRankingView(container, institutionId, gender);
    }

    async renderCategoriesView(container) {
        this.showLoading(container, 'Cargando categorías...');

        try {
            const categories = await db.categories.getAll();

            let html = `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                    <button class="cta-btn" onclick="app.showCreateCategoryModal()">
                        <ion-icon name="add-circle-outline"></ion-icon> Nueva Categoría
                    </button>
                </div>

                <div class="card">
                    <h3><ion-icon name="pricetags-outline" style="margin-right: 0.5rem;"></ion-icon> Categorías del Sistema</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">Las categorías determinan el nivel de juego de los jugadores y torneos.</p>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                                <th style="padding: 0.75rem; text-align: left;">Nombre</th>
                                <th style="padding: 0.75rem; text-align: left;">Descripción</th>
                                <th style="padding: 0.75rem; text-align: center;">Nivel</th>
                                <th style="padding: 0.75rem; text-align: right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categories.length === 0 ? `
                                <tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay categorías definidas</td></tr>
                            ` : categories.map(cat => `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <td style="padding: 0.75rem;">
                                        <span style="background: var(--primary); color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: bold;">${cat.name}</span>
                                    </td>
                                    <td style="padding: 0.75rem; color: var(--text-muted);">${cat.description || '-'}</td>
                                    <td style="padding: 0.75rem; text-align: center;">
                                        <span style="background: rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">${cat.level}</span>
                                    </td>
                                    <td style="padding: 0.75rem; text-align: right;">
                                        <button class="cta-btn secondary" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--primary); color: var(--primary); margin-right: 0.5rem;" onclick="app.editCategory('${cat.id}', '${cat.name}', '${cat.description || ''}', ${cat.level})">
                                            <ion-icon name="pencil-outline"></ion-icon>
                                        </button>
                                        <button class="cta-btn secondary" style="padding: 0.25rem 0.5rem; background: transparent; border: 1px solid #ef4444; color: #ef4444;" onclick="app.deleteCategory('${cat.id}', '${cat.name}')">
                                            <ion-icon name="trash-outline"></ion-icon>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Create/Edit Category Modal -->
                <div id="category-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center;">
                    <div style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); width: 100%; max-width: 450px;">
                        <h3 id="category-modal-title" style="margin-bottom: 1.5rem;">Nueva Categoría</h3>
                        <form id="category-form" onsubmit="app.submitCategory(event)">
                            <input type="hidden" id="cat-id">
                            <div style="margin-bottom: 1rem;">
                                <label class="form-label">Nombre *</label>
                                <input type="text" class="form-input" id="cat-name" required placeholder="Ej: A, B, C, Sub-18" maxlength="20">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label class="form-label">Descripción</label>
                                <input type="text" class="form-input" id="cat-description" placeholder="Ej: Nivel avanzado">
                            </div>
                            <div style="margin-bottom: 1.5rem;">
                                <label class="form-label">Nivel (orden)</label>
                                <input type="number" class="form-input" id="cat-level" min="0" value="0" style="max-width: 100px;">
                                <small style="color: var(--text-muted);">Menor número = mayor nivel de juego</small>
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                                <button type="button" class="cta-btn secondary" style="background: transparent; border: 1px solid var(--text-muted); color: var(--text-muted);" onclick="document.getElementById('category-modal').style.display='none'">Cancelar</button>
                                <button type="submit" class="cta-btn">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            container.innerHTML = html;
        } catch (e) {
            console.error('Error loading categories:', e);
            container.innerHTML = `<p style="color: red;">Error cargando categorías: ${e.message}</p>`;
        }
    }

    showCreateCategoryModal() {
        document.getElementById('category-modal-title').textContent = 'Nueva Categoría';
        document.getElementById('cat-id').value = '';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-description').value = '';
        document.getElementById('cat-level').value = '0';
        document.getElementById('category-modal').style.display = 'flex';
    }

    editCategory(id, name, description, level) {
        document.getElementById('category-modal-title').textContent = 'Editar Categoría';
        document.getElementById('cat-id').value = id;
        document.getElementById('cat-name').value = name;
        document.getElementById('cat-description').value = description;
        document.getElementById('cat-level').value = level;
        document.getElementById('category-modal').style.display = 'flex';
    }

    async submitCategory(e) {
        e.preventDefault();
        const id = document.getElementById('cat-id').value;
        const data = {
            name: document.getElementById('cat-name').value.toUpperCase(),
            description: document.getElementById('cat-description').value,
            level: parseInt(document.getElementById('cat-level').value) || 0
        };

        try {
            if (id) {
                await db.categories.update(id, data);
                alert('Categoría actualizada');
            } else {
                await db.categories.create(data);
                alert('Categoría creada');
            }
            document.getElementById('category-modal').style.display = 'none';
            this.navigateTo('categories');
        } catch (err) {
            console.error('Error saving category:', err);
            alert('Error: ' + err.message);
        }
    }

    async deleteCategory(id, name) {
        if (!confirm(`¿Eliminar la categoría "${name}"? Esto podría afectar torneos y jugadores existentes.`)) return;

        try {
            await db.categories.delete(id);
            alert('Categoría eliminada');
            this.navigateTo('categories');
        } catch (err) {
            console.error('Error deleting category:', err);
            alert('Error: ' + err.message);
        }
    }

    async renderPlayersView(container) {
        this.showLoading(container, 'Cargando jugadores...');

        try {
            // Get all players
            const allPlayers = auth.users.filter(u => u.role === 'player') || [];
            const institutions = auth.institutions || [];

            // Get players from user's institution (for admins)
            let institutionPlayers = [];
            let institutionName = '';
            if (this.currentUser && this.currentUser.institution_id) {
                institutionPlayers = allPlayers.filter(p => p.institution_id === this.currentUser.institution_id);
                this.institutionPlayers = allPlayers.filter(p => p.institution_id === this.currentUser.institution_id);
                this.otherPlayers = allPlayers.filter(p => p.institution_id !== this.currentUser.institution_id);
                const inst = institutions.find(i => i.id === this.currentUser.institution_id);
                institutionName = inst?.name || 'Mi Institución';
            } else {
                this.otherPlayers = allPlayers; // If not admin/no inst, everyone is "other" (or just main list)
            }

            let html = '';

            // Search Box (Global)
            html += `
                 <div style="margin-bottom: 2rem;">
                    <h3 style="color: var(--text-main); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                         <ion-icon name="search-outline"></ion-icon> Buscar Jugadores
                    </h3>
                    <input type="text" id="player-search" class="form-input" 
                        placeholder="Buscar por nombre..." 
                        style="max-width: 100%;"
                        oninput="app.filterPlayers(this.value)">
                </div>
            `;

            // Institution Players Section (for admins/professors)
            if (this.currentUser && this.currentUser.role === 'admin' && this.institutionPlayers.length > 0) {
                html += `
                    <div style="margin-bottom: 3rem;">
                        <h3 style="color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                            <ion-icon name="business-outline"></ion-icon> Jugadores de ${institutionName}
                            <span id="count-inst" style="background: rgba(56,189,248,0.2); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${this.institutionPlayers.length}</span>
                        </h3>
                        <div id="institution-players-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                            ${this.institutionPlayers.map(p => this.getPlayerCard(p)).join('')}
                        </div>
                    </div>
                `;
            }

            // Other Players Section
            const otherTitle = (this.currentUser && this.currentUser.role === 'admin') ? 'Otros Jugadores' : 'Todos los Jugadores';
            const otherIcon = (this.currentUser && this.currentUser.role === 'admin') ? 'people-outline' : 'people-circle-outline';

            html += `
                <div>
                    <h3 style="color: var(--accent); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                        <ion-icon name="${otherIcon}"></ion-icon> ${otherTitle}
                        <span id="count-other" style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${this.otherPlayers.length}</span>
                    </h3>
                    
                    <div id="other-players-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                        ${this.otherPlayers.length === 0 ?
                    '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay jugadores registrados</div>' :
                    this.otherPlayers.map(p => this.getPlayerCard(p)).join('')
                }
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (e) {
            console.error('Error loading players:', e);
            container.innerHTML = `<p style="color:red">Error cargando jugadores: ${e.message}</p>`;
        }
    }

    getPlayerCard(player) {
        const instName = player.institution || player.institutions?.name || 'Sin institución';
        return `
            <div class="card" style="cursor: pointer; transition: transform 0.2s, border-color 0.2s; border: 1px solid var(--border); padding: 1rem;"
                 onclick="app.openRivalryModal('${player.id}', '${player.name}')"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)';">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${player.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div style="font-weight: 500; color: var(--text-main);">${player.name} ${player.lastname || ''}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${instName}</div>
                    </div>
                </div>
                ${player.category ? `<div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--primary);">Categoría: ${player.category}</div>` : ''}
            </div>
        `;
    }

    filterPlayers(query) {
        const q = query.toLowerCase();

        // Filter Institution Players
        if (this.institutionPlayers && this.institutionPlayers.length > 0) {
            const filteredInst = this.institutionPlayers.filter(p =>
                p.name.toLowerCase().includes(q) || (p.lastname || '').toLowerCase().includes(q) || (p.institution || '').toLowerCase().includes(q)
            );
            const gridInst = document.getElementById('institution-players-grid');
            if (gridInst) {
                gridInst.innerHTML = filteredInst.length === 0
                    ? '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 1rem;">No se encontraron coincidencias</div>'
                    : filteredInst.map(p => this.getPlayerCard(p)).join('');
                document.getElementById('count-inst').textContent = filteredInst.length;
            }
        }

        // Filter Other Players
        if (this.otherPlayers) {
            const filteredOther = this.otherPlayers.filter(p =>
                p.name.toLowerCase().includes(q) || (p.lastname || '').toLowerCase().includes(q) || (p.institution || '').toLowerCase().includes(q)
            );
            const gridOther = document.getElementById('other-players-grid');
            if (gridOther) {
                gridOther.innerHTML = filteredOther.length === 0
                    ? '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 1rem;">No se encontraron coincidencias</div>'
                    : filteredOther.map(p => this.getPlayerCard(p)).join('');
                document.getElementById('count-other').textContent = filteredOther.length;
            }
        }

    }

    async openRivalryModal(otherPlayerId, otherPlayerName) {
        if (!this.currentUser || this.currentUser.role !== 'player') {
            // If not a player (e.g. admin), fallback to old behavior or show alert
            this.viewPlayerDetail(otherPlayerId, otherPlayerName);
            return;
        }

        if (this.currentUser.id === otherPlayerId) {
            alert('Este eres tú mismo.');
            return;
        }

        const modal = document.getElementById('base-modal');
        const content = document.getElementById('base-modal-content');

        // Show loading
        modal.style.display = 'flex';
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="tennis-ball"></div>
                <p style="margin-top: 1rem;">Cargando historial vs ${otherPlayerName}...</p>
            </div>
        `;

        try {
            const matches = await db.matches.getBetweenPlayers(this.currentUser.id, otherPlayerId);

            // Calculate Stats
            let wins = 0;
            let losses = 0;
            let setsWon = 0;
            let setsLost = 0;
            let gamesWon = 0;
            let gamesLost = 0;
            let lastMatchDate = null;

            matches.forEach(m => {
                // Determine if I am P1 or P2
                const isP1 = m.player1_id === this.currentUser.id;

                // Only count finished matches
                if (m.winner_id) {
                    if (m.winner_id === this.currentUser.id) wins++;
                    else losses++;
                }

                // Sets & Games (parse result string e.g. "6-4 6-4" or structure)
                // Assuming m.sets is array of objects {p1: 6, p2: 4}
                if (m.sets && Array.isArray(m.sets)) {
                    m.sets.forEach(s => {
                        const myGames = isP1 ? parseInt(s.p1 || 0) : parseInt(s.p2 || 0);
                        const oppGames = isP1 ? parseInt(s.p2 || 0) : parseInt(s.p1 || 0);

                        gamesWon += myGames;
                        gamesLost += oppGames;

                        if (myGames > oppGames) setsWon++;
                        else if (oppGames > myGames) setsLost++;
                    });
                }
            });

            if (matches.length > 0) {
                const last = matches[0]; // Ordered by date desc
                lastMatchDate = last.created_at ? new Date(last.created_at).toLocaleDateString() : 'N/A';
            }

            // Find a match that is waiting to be scheduled/played
            const pendingMatch = matches.find(m => !m.winner_id && m.scheduling_status !== 'confirmed');

            // Render Modal
            content.innerHTML = `
                <div style="position: relative;">
                    <button onclick="document.getElementById('base-modal').style.display='none'" 
                            style="position: absolute; right: -10px; top: -10px; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
                    
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <h2 style="color: var(--text-main); margin-bottom: 0.25rem;">H2H: Tú vs ${otherPlayerName}</h2>
                        <div style="height: 4px; width: 60px; background: var(--primary); margin: 0.5rem auto; border-radius: 2px;"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-value" style="color: #4ade80; font-size: 2rem;">${wins}</div>
                            <div class="stat-label">Victorias</div>
                        </div>
                        <div class="stat-card" style="padding: 1rem;">
                            <div class="stat-value" style="color: #f87171; font-size: 2rem;">${losses}</div>
                            <div class="stat-label">Derrotas</div>
                        </div>
                    </div>

                    ${pendingMatch ? `
                        <div style="background: rgba(56,189,248,0.1); border: 1px dashed var(--primary); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; text-align: center;">
                            <h4 style="margin-bottom: 0.5rem; color: var(--primary);">Tiene un partido pendiente</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                                Torneo: ${pendingMatch.tournaments?.name || 'Vigente'}
                            </p>
                            <button onclick="document.getElementById('base-modal').style.display='none'; app.openSchedulingModal('${pendingMatch.id}')" 
                                    class="cta-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <ion-icon name="calendar-outline"></ion-icon> Proponer Horario
                            </button>
                        </div>
                    ` : `
                        <div style="background: var(--bg-secondary); border-radius: 0.5rem; padding: 1rem; margin-bottom: 2rem;">
                            <h4 style="margin-bottom: 1rem; color: var(--text-main); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">Estadísticas Detalladas</h4>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.9rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-muted);">Sets G/P:</span>
                                    <span style="font-weight: bold; color: var(--text-main);">${setsWon} / ${setsLost}</span>
                                </div>
                                 <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-muted);">Games G/P:</span>
                                    <span style="font-weight: bold; color: var(--text-main);">${gamesWon} / ${gamesLost}</span>
                                </div>
                            </div>
                             <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.8rem; text-align: center; color: var(--text-muted);">
                                Último enfrentamiento: ${lastMatchDate || 'Nunca'}
                            </div>
                        </div>
                    `}

                    <h4 style="margin-bottom: 1rem; color: var(--text-main); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Historial Reciente</h4>
                    <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 5px;">
                        ${matches.length === 0 ? '<div style="text-align: center; color: var(--text-muted); font-style: italic; padding: 1rem;">Sin partidos registrados</div>' : ''}
                        ${matches.filter(m => m.winner_id).map(m => {
                const isWin = m.winner_id === this.currentUser.id;
                const scoreString = Array.isArray(m.score) ? m.score.map(s => `${s.p1}-${s.p2}`).join(' ') : (m.sets?.map(s => `${s.p1}-${s.p2}`).join(' ') || 'Sin resultado');
                const date = m.played_at ? new Date(m.played_at).toLocaleDateString() : (m.created_at ? new Date(m.created_at).toLocaleDateString() : '');
                const tourName = m.tournaments?.name || 'Torneo';

                return `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 0.6rem; border: 1px solid var(--border); border-left: 4px solid ${isWin ? '#4ade80' : '#f87171'};">
                                    <div style="display: flex; flex-direction: column; gap:0.2rem;">
                                        <span style="font-size: 0.75rem; color: var(--text-muted);">${date} • ${tourName}</span>
                                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">
                                            ${isWin ? 'Victoria' : 'Derrota'} vs ${otherPlayerName}
                                        </span>
                                    </div>
                                    <div style="font-weight: 700; color: var(--accent); font-family: 'Outfit', sans-serif; font-size: 1rem;">
                                        ${scoreString}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('Error fetching rivalry:', e);
            content.innerHTML = `<p style="color:red; text-align:center;">Error al cargar historial: ${e.message}</p>`;
        }
    }

    viewPlayerDetail(playerId, playerName) {
        this.selectedPlayerId = playerId;
        this.selectedPlayerName = playerName;
        this.navigateTo('player-detail');
    }

    async renderPlayerDetailView(container, playerId) {
        this.showLoading(container, 'Cargando perfil...');

        try {
            // Find player in cached users
            const player = auth.users.find(u => u.id === playerId);

            if (!player) {
                container.innerHTML = '<div class="card">Jugador no encontrado.</div>';
                return;
            }

            const instName = player.institution || player.institutions?.name || 'Sin institución';

            // TODO: Fetch real stats from tournament_players/matches when implemented
            const stats = {
                tournamentsPlayed: player.tournaments_played || 0,
                tournamentsWon: player.tournaments_won || 0,
                matchesPlayed: player.matches_played || 0,
                matchesWon: player.matches_won || 0,
                winRate: player.matches_played > 0
                    ? Math.round((player.matches_won / player.matches_played) * 100)
                    : 0
            };

            const html = `
                <button class="cta-btn secondary" onclick="app.navigateTo('players')" style="background: transparent; border: none; color: var(--text-muted); padding-left: 0; margin-bottom: 1rem;">
                    <ion-icon name="arrow-back-outline"></ion-icon> Volver a Jugadores
                </button>

                <div class="card" style="max-width: 600px;">
                    <!-- Header -->
                    <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 2rem;">
                            ${player.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h2 style="margin: 0; color: var(--accent);">${player.name} ${player.lastname || ''}</h2>
                            <div style="color: var(--text-muted); margin-top: 0.25rem;">
                                <ion-icon name="business-outline" style="vertical-align: middle;"></ion-icon> ${instName}
                            </div>
                            ${player.category ? `<div style="margin-top: 0.5rem;"><span style="background: rgba(56,189,248,0.2); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 0.25rem; font-size: 0.85rem;">Categoría ${player.category}</span></div>` : ''}
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <h4 style="color: var(--text-muted); margin-bottom: 1rem;">Estadísticas</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                        <div style="background: rgba(56,189,248,0.1); padding: 1rem; border-radius: 0.5rem; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${stats.tournamentsPlayed}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Torneos Jugados</div>
                        </div>
                        <div style="background: rgba(245,158,11,0.1); padding: 1rem; border-radius: 0.5rem; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${stats.tournamentsWon}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Torneos Ganados</div>
                        </div>
                        <div style="background: rgba(34,197,94,0.1); padding: 1rem; border-radius: 0.5rem; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #4ade80;">${stats.matchesWon}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Partidos Ganados</div>
                        </div>
                        <div style="background: rgba(168,85,247,0.1); padding: 1rem; border-radius: 0.5rem; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #a855f7;">${stats.winRate}%</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Win Rate</div>
                        </div>
                    </div>

                    <!-- Contact Info -->
                    ${player.email ? `
                        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                            <h4 style="color: var(--text-muted); margin-bottom: 0.5rem;">Contacto</h4>
                            <div style="color: var(--text-main);"><ion-icon name="mail-outline" style="vertical-align: middle; margin-right: 0.5rem;"></ion-icon>${player.email}</div>
                        </div>
                    ` : ''}
                </div>
            `;

            container.innerHTML = html;

        } catch (e) {
            console.error('Error loading player detail:', e);
            container.innerHTML = `<p style="color:red">Error cargando perfil: ${e.message}</p>`;
        }
    }

    async updateMessagesBadge() {
        if (!this.currentUser) return;
        try {
            const count = await db.messages.getUnreadCount(this.currentUser.id);
            const badge = document.getElementById('messages-badge');
            if (badge) {
                if (count > 0) {
                    badge.style.display = 'block';
                    badge.textContent = count;
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (e) {
            console.warn('Error updating badge:', e);
        }
    }

    // =====================================================
    // NOTIFICATION SYSTEM
    // =====================================================

    toggleNotificationsPanel() {
        const panel = document.getElementById('notifications-panel');
        if (!panel) return;

        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            this.fetchNotifications();

            // Close panel when clicking outside
            setTimeout(() => {
                document.addEventListener('click', this._closeNotificationsPanelHandler = (e) => {
                    if (!e.target.closest('#notifications-container')) {
                        panel.style.display = 'none';
                        document.removeEventListener('click', this._closeNotificationsPanelHandler);
                    }
                });
            }, 100);
        } else {
            panel.style.display = 'none';
        }
    }

    async fetchNotifications() {
        if (!this.currentUser) return;

        const listContainer = document.getElementById('notifications-list');
        if (!listContainer) return;

        try {
            const messages = await db.messages.getForUser(this.currentUser.id);

            // Filter recent notifications (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const notifications = messages
                .filter(m => new Date(m.created_at) > weekAgo)
                .slice(0, 10);

            if (notifications.length === 0) {
                listContainer.innerHTML = `
                    <div style="padding:2rem; text-align:center; color:var(--text-muted);">
                        <ion-icon name="notifications-off-outline" style="font-size:2rem; margin-bottom:0.5rem;"></ion-icon>
                        <p style="margin:0; font-size:0.85rem;">No hay notificaciones recientes</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = notifications.map(n => this.renderNotificationItem(n)).join('');

            // Update badge
            const unreadCount = notifications.filter(n => !n.is_read).length;
            this.updateNotificationsBadge(unreadCount);

        } catch (e) {
            console.error('Error fetching notifications:', e);
            listContainer.innerHTML = `<div style="padding:1rem; text-align:center; color:#ef4444;">Error cargando</div>`;
        }
    }

    renderNotificationItem(notification) {
        const isUnread = !notification.is_read;
        const date = new Date(notification.created_at);
        const timeAgo = this.getTimeAgo(date);

        let icon = 'mail-outline';
        let iconColor = 'var(--text-muted)';
        let title = 'Mensaje';
        let preview = notification.message || '';

        if (notification.message_type === 'proposal') {
            icon = 'calendar-outline';
            iconColor = '#f59e0b';
            title = 'Nueva propuesta de partido';
            if (notification.proposal_data) {
                preview = `${notification.proposal_data.date} a las ${notification.proposal_data.time}`;
            }
        } else if (notification.message_type === 'accepted') {
            icon = 'checkmark-circle-outline';
            iconColor = '#22c55e';
            title = 'Propuesta aceptada';
            preview = 'Tu propuesta fue aceptada';
        } else if (notification.message_type === 'rejected') {
            icon = 'close-circle-outline';
            iconColor = '#ef4444';
            title = 'Propuesta rechazada';
            preview = 'Tu propuesta fue rechazada';
        } else if (notification.message_type === 'player_request') {
            icon = 'person-add-outline';
            iconColor = '#8b5cf6';
            title = 'Nuevo jugador registrado';
        }

        const senderName = notification.sender?.name || 'Sistema';

        return `
            <div onclick="app.handleNotificationClick('${notification.id}', '${notification.message_type}', '${notification.match_id || ''}')"
                 style="padding:0.75rem 1rem; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.2s; ${isUnread ? 'background:rgba(56,189,248,0.05);' : ''}"
                 onmouseover="this.style.background='rgba(255,255,255,0.05)'" 
                 onmouseout="this.style.background='${isUnread ? 'rgba(56,189,248,0.05)' : 'transparent'}'">
                <div style="display:flex; gap:0.75rem; align-items:flex-start;">
                    <ion-icon name="${icon}" style="font-size:1.25rem; color:${iconColor}; margin-top:2px;"></ion-icon>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                            <span style="font-size:0.8rem; font-weight:${isUnread ? '600' : '400'}; color:var(--text-main);">${title}</span>
                            <span style="font-size:0.65rem; color:var(--text-muted);">${timeAgo}</span>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${senderName}: ${preview}
                        </div>
                    </div>
                    ${isUnread ? '<div style="width:8px; height:8px; background:var(--primary); border-radius:50%; margin-left:0.5rem;"></div>' : ''}
                </div>
            </div>
        `;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    }

    async handleNotificationClick(notificationId, type, matchId) {
        // Mark as read
        try {
            await db.messages.markAsRead(notificationId);
        } catch (e) {
            console.warn('Error marking notification as read:', e);
        }

        // Close panel
        const panel = document.getElementById('notifications-panel');
        if (panel) panel.style.display = 'none';

        // Navigate based on type
        if (type === 'proposal' || type === 'accepted' || type === 'rejected') {
            this.navigateTo('messages');
        } else if (type === 'player_request') {
            this.navigateTo('messages');
        } else {
            this.navigateTo('messages');
        }

        // Refresh badges
        this.fetchNotifications();
        this.updateMessagesBadge();
    }

    async markAllNotificationsRead() {
        if (!this.currentUser) return;

        try {
            const messages = await db.messages.getForUser(this.currentUser.id);
            const unread = messages.filter(m => !m.is_read);

            await Promise.all(unread.map(m => db.messages.markAsRead(m.id)));

            this.fetchNotifications();
            this.updateMessagesBadge();
            this.showToast('Todas las notificaciones marcadas como leídas', 'success');
        } catch (e) {
            console.error('Error marking all as read:', e);
        }
    }

    updateNotificationsBadge(count) {
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'block';
                badge.textContent = count > 9 ? '9+' : count;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    startNotificationPolling() {
        // Poll every 60 seconds for new notifications
        this._notificationInterval = setInterval(() => {
            if (this.currentUser) {
                this.fetchNotifications();
                this.updateMessagesBadge();
            }
        }, 60000);
    }

    stopNotificationPolling() {
        if (this._notificationInterval) {
            clearInterval(this._notificationInterval);
        }
    }

    // =====================================================
    // PDF EXPORT SYSTEM
    // =====================================================

    async exportTournamentToPDF() {
        if (!this.tournament || !this.tournament.id) {
            this.showToast('No hay torneo seleccionado para exportar', 'error');
            return;
        }

        try {
            this.showToast('Generando PDF...', 'info');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;

            // Header
            doc.setFontSize(22);
            doc.setTextColor(60, 60, 60);
            doc.text(this.tournament.name || 'Torneo', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            // Subtitle
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            const subtitle = `${this.tournament.category || ''} - ${this.tournament.type === 'singles' ? 'Singles' : 'Dobles'}`;
            doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
            yPos += 8;

            // Status & Date
            const status = this.tournament.status === 'finished' ? 'Finalizado' : 'Activo';
            const dateStr = this.tournament.start_date
                ? new Date(this.tournament.start_date).toLocaleDateString('es-AR')
                : 'Sin fecha';
            doc.setFontSize(10);
            doc.text(`Estado: ${status} | Fecha: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;

            // Line separator
            doc.setDrawColor(200, 200, 200);
            doc.line(20, yPos, pageWidth - 20, yPos);
            yPos += 10;

            // Groups section
            if (this.tournament.groups && this.tournament.groups.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(60, 60, 60);
                doc.text('Fase de Grupos', 20, yPos);
                yPos += 8;

                this.tournament.groups.forEach((group, gIdx) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.setFontSize(11);
                    doc.setTextColor(80, 80, 80);
                    doc.text(`Grupo ${gIdx + 1}`, 25, yPos);
                    yPos += 6;

                    doc.setFontSize(9);
                    group.players.forEach((p, pIdx) => {
                        doc.text(`  ${pIdx + 1}. ${p.name}`, 30, yPos);
                        yPos += 5;
                    });
                    yPos += 5;
                });

                yPos += 5;
            }

            // Bracket section
            if (this.tournament.bracket && this.tournament.bracket.length > 0) {
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(60, 60, 60);
                doc.text('Playoffs', 20, yPos);
                yPos += 10;

                const roundNames = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];

                this.tournament.bracket.forEach((round, rIdx) => {
                    if (yPos > 260) {
                        doc.addPage();
                        yPos = 20;
                    }

                    const roundName = roundNames[this.tournament.bracket.length - rIdx - 1] || `Ronda ${rIdx + 1}`;
                    doc.setFontSize(11);
                    doc.setTextColor(100, 100, 100);
                    doc.text(roundName, 25, yPos);
                    yPos += 6;

                    doc.setFontSize(9);
                    doc.setTextColor(60, 60, 60);

                    round.forEach(match => {
                        const p1Name = match.p1?.name || 'TBD';
                        const p2Name = match.p2?.name || 'TBD';
                        let result = '';

                        if (match.isPlayed && match.sets) {
                            result = match.sets.map(s => `${s[0]}-${s[1]}`).join(' ');
                        }

                        const winnerMark = match.winner?.id === match.p1?.id ? '●' : '○';
                        const loserMark = match.winner?.id === match.p2?.id ? '●' : '○';

                        doc.text(`  ${winnerMark} ${p1Name} vs ${loserMark} ${p2Name}  ${result}`, 30, yPos);
                        yPos += 5;
                    });

                    yPos += 3;
                });
            }

            // Champion
            if (this.tournament.bracket && this.tournament.bracket.length > 0) {
                const finalRound = this.tournament.bracket[this.tournament.bracket.length - 1];
                const finalMatch = finalRound?.[0];

                if (finalMatch?.isPlayed && finalMatch?.winner) {
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }

                    yPos += 10;
                    doc.setFontSize(16);
                    doc.setTextColor(245, 158, 11);
                    doc.text(`🏆 Campeón: ${finalMatch.winner.name}`, pageWidth / 2, yPos, { align: 'center' });
                }
            }

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generado por TenisPro Manager - ${new Date().toLocaleDateString('es-AR')}`, pageWidth / 2, 290, { align: 'center' });

            // Download
            const fileName = `${this.tournament.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'torneo'}_bracket.pdf`;
            doc.save(fileName);

            this.showToast('PDF descargado exitosamente', 'success');

        } catch (err) {
            console.error('Error generating PDF:', err);
            this.showToast('Error al generar PDF: ' + err.message, 'error');
        }
    }

    // =====================================================
    // PLAYER STATISTICS CHARTS
    // =====================================================

    async openPlayerStatsModal(playerId) {
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'stats-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';
        modal.innerHTML = `
            <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; max-width:600px; width:100%; border:1px solid var(--border); position:relative;">
                <button onclick="document.getElementById('stats-modal').remove()" 
                        style="position:absolute; right:1rem; top:1rem; background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
                <h3 style="color:var(--primary); margin-bottom:1.5rem;">Evolución de Partidos</h3>
                <div style="height:300px;">
                    <canvas id="player-stats-chart"></canvas>
                </div>
                <p style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-top:1rem;">
                    Últimos 6 meses de actividad
                </p>
            </div>
        `;
        document.body.appendChild(modal);

        // Fetch player matches
        try {
            const matches = await db.matches.getByPlayer(playerId);
            this.renderPlayerStatsChart(matches, playerId);
        } catch (err) {
            console.error('Error loading player stats:', err);
        }
    }

    renderPlayerStatsChart(matches, playerId) {
        const ctx = document.getElementById('player-stats-chart');
        if (!ctx) return;

        // Group matches by month
        const monthlyData = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            monthlyData[key] = { played: 0, won: 0 };
        }

        // Count matches
        matches.forEach(m => {
            if (!m.winner_id) return; // Only completed matches

            const matchDate = new Date(m.scheduled_at || m.created_at);
            const key = `${matchDate.getFullYear()}-${(matchDate.getMonth() + 1).toString().padStart(2, '0')}`;

            if (monthlyData[key]) {
                monthlyData[key].played++;
                if (m.winner_id === playerId) {
                    monthlyData[key].won++;
                }
            }
        });

        const labels = Object.keys(monthlyData).map(k => {
            const [y, m] = k.split('-');
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return months[parseInt(m) - 1];
        });

        const played = Object.values(monthlyData).map(v => v.played);
        const won = Object.values(monthlyData).map(v => v.won);

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Partidos Jugados',
                        data: played,
                        backgroundColor: 'rgba(56, 189, 248, 0.6)',
                        borderColor: '#38bdf8',
                        borderWidth: 1
                    },
                    {
                        label: 'Partidos Ganados',
                        data: won,
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: '#22c55e',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }

    // =====================================================
    // HEAD-TO-HEAD DETAILED VIEW
    // =====================================================

    async openH2HDetailedModal(player1Id, player2Id, player1Name, player2Name) {
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'h2h-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';
        modal.innerHTML = `
            <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; max-width:600px; width:100%; border:1px solid var(--border); position:relative; max-height:80vh; overflow-y:auto;">
                <button onclick="document.getElementById('h2h-modal').remove()" 
                        style="position:absolute; right:1rem; top:1rem; background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
                <h3 style="color:var(--primary); margin-bottom:0.5rem;">Head to Head</h3>
                <p style="color:var(--text-muted); margin-bottom:1.5rem;">${player1Name} vs ${player2Name}</p>
                <div id="h2h-content" style="text-align:center; padding:2rem;">
                    <div class="spinner"></div>
                    <p style="color:var(--text-muted);">Cargando historial...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        try {
            const matches = await db.matches.getBetweenPlayers(player1Id, player2Id);
            const contentDiv = document.getElementById('h2h-content');

            if (!matches || matches.length === 0) {
                contentDiv.innerHTML = `
                    <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                        <ion-icon name="people-outline" style="font-size:3rem; margin-bottom:1rem;"></ion-icon>
                        <p>No hay enfrentamientos registrados entre estos jugadores.</p>
                    </div>
                `;
                return;
            }

            // Calculate stats
            let p1Wins = 0, p2Wins = 0;
            matches.forEach(m => {
                if (m.winner_id === player1Id) p1Wins++;
                else if (m.winner_id === player2Id) p2Wins++;
            });

            const totalMatches = p1Wins + p2Wins;
            const p1Pct = totalMatches > 0 ? Math.round((p1Wins / totalMatches) * 100) : 50;
            const p2Pct = 100 - p1Pct;

            contentDiv.innerHTML = `
                <!-- Score Summary -->
                <div style="display:flex; justify-content:center; align-items:center; gap:2rem; margin-bottom:2rem; padding:1.5rem; background:rgba(56,189,248,0.1); border-radius:0.75rem;">
                    <div style="text-align:center;">
                        <div style="font-size:2.5rem; font-weight:700; color:var(--primary);">${p1Wins}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${player1Name.split(' ')[0]}</div>
                    </div>
                    <div style="font-size:1.5rem; color:var(--text-muted);">-</div>
                    <div style="text-align:center;">
                        <div style="font-size:2.5rem; font-weight:700; color:var(--accent);">${p2Wins}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${player2Name.split(' ')[0]}</div>
                    </div>
                </div>

                <!-- Win percentage bar -->
                <div style="margin-bottom:2rem;">
                    <div style="display:flex; height:8px; border-radius:4px; overflow:hidden; background:var(--border);">
                        <div style="width:${p1Pct}%; background:var(--primary);"></div>
                        <div style="width:${p2Pct}%; background:var(--accent);"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:0.5rem; font-size:0.75rem; color:var(--text-muted);">
                        <span>${p1Pct}%</span>
                        <span>${p2Pct}%</span>
                    </div>
                </div>

                <!-- Match History -->
                <h4 style="color:var(--text-main); margin-bottom:1rem; text-align:left;">Historial de Partidos</h4>
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    ${matches.map(m => {
                const date = m.scheduled_at
                    ? new Date(m.scheduled_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Sin fecha';
                const score = m.score ? m.score.map(s => `${s[0]}-${s[1]}`).join(' ') : 'N/D';
                const winner = m.winner_id === player1Id ? player1Name.split(' ')[0] : player2Name.split(' ')[0];
                const tournamentName = m.tournaments?.name || 'Torneo';

                return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--bg-dark); border-radius:0.5rem; border:1px solid var(--border);">
                                <div style="text-align:left;">
                                    <div style="font-size:0.7rem; color:var(--text-muted);">${date} • ${tournamentName}</div>
                                    <div style="font-weight:600; color:var(--text-main); margin-top:0.2rem;">
                                        <ion-icon name="trophy" style="color:#f59e0b; vertical-align:middle; font-size:0.85rem;"></ion-icon>
                                        ${winner}
                                    </div>
                                </div>
                                <div style="font-family:monospace; color:var(--text-main); font-weight:600;">${score}</div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;

        } catch (err) {
            console.error('Error loading H2H:', err);
            document.getElementById('h2h-content').innerHTML = `
                <div style="color:#ef4444; text-align:center;">Error cargando historial</div>
            `;
        }
    }

    async renderMessagesView(container) {
        this.showLoading(container, 'Cargando mensajes...');
        try {
            const messages = await db.messages.getForUser(this.currentUser.id);

            const pendingMessages = [];
            const historyMessages = [];

            messages.forEach(m => {
                const isPlayerRequest = m.message && m.message.startsWith('NUEVO JUGADOR:');
                const isChallenge = m.challenge_status && m.challenge_status !== 'none';

                // Determine if interaction is needed
                let isPending = false;

                if (isChallenge) {
                    // It is pending if the recipient matches the current user AND status is pending or countered
                    if (m.recipient_id === this.currentUser.id && (m.challenge_status === 'pending' || m.challenge_status === 'countered')) {
                        isPending = true;
                    } else if (!m.is_read) {
                        isPending = true;
                    }
                } else if (isPlayerRequest) {
                    // If player is NOT approved yet, it is pending
                    if (m.sender && !m.sender.is_approved) {
                        isPending = true;
                    }
                } else {
                    // Generic messages: Pending if unread
                    isPending = !m.is_read;
                }

                if (isPending) pendingMessages.push(m);
                else historyMessages.push(m);
            });


            const renderMessageList = (list) => {
                if (list.length === 0) return '<div class="card" style="text-align: center; color: var(--text-muted); font-style: italic;">No hay mensajes en esta sección.</div>';

                return list.map(m => {
                    const date = new Date(m.created_at).toLocaleString();
                    const senderName = m.sender ? (m.sender.name + (m.sender.lastname ? ' ' + m.sender.lastname : '')) : 'Sistema';
                    const isReadClass = m.is_read ? '' : 'border-left: 4px solid var(--accent); background: rgba(56,189,248,0.05);';

                    // Check for Player Registration Request
                    let clickAction = '';
                    let extraStyle = '';
                    let actionIcon = '';
                    const isPlayerRequest = m.message && m.message.startsWith('NUEVO JUGADOR:');

                    if (isPlayerRequest) {
                        // Extract category
                        const catMatch = m.message.match(/Categoría\s+([A-Z0-9]+)/i);
                        const requestedCategory = catMatch ? catMatch[1] : 'C'; // default

                        if (m.sender && !m.sender.is_approved) {
                            clickAction = `app.approveUser('${m.sender_id}', '${senderName.replace(/'/g, "\\'")}', '${requestedCategory}')`;
                            extraStyle = 'cursor: pointer; transition: transform 0.2s;';
                            actionIcon = '<div style="color:var(--accent); font-size:0.9rem; margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem;"><ion-icon name="create-outline"></ion-icon> Click para revisar solicitud</div>';
                        } else {
                            // Already approved or rejected
                            // If sender exists and is approved:
                            if (m.sender && m.sender.is_approved) {
                                actionIcon = '<div style="color:var(--success); font-size:0.9rem; margin-top:0.5rem;"><ion-icon name="checkmark-circle-outline"></ion-icon> Solicitud Aprobada</div>';
                            } else {
                                actionIcon = '<div style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem;"><ion-icon name="close-circle-outline"></ion-icon> Solicitud Cerrada</div>';
                            }
                        }
                    }

                    // Check for Challenge
                    const isChallenge = m.challenge_status && m.challenge_status !== 'none';
                    if (isChallenge) {
                        let statusColor = 'var(--text-muted)';
                        let statusText = m.challenge_status.toUpperCase();

                        if (m.challenge_status === 'pending') { statusColor = 'var(--warning)'; statusText = 'Pendiente de Respuesta'; }
                        if (m.challenge_status === 'accepted') { statusColor = 'var(--success)'; statusText = 'DESAFÍO ACEPTADO'; }
                        if (m.challenge_status === 'rejected') { statusColor = 'var(--error)'; statusText = 'DESAFÍO RECHAZADO'; }
                        if (m.challenge_status === 'countered') { statusColor = 'var(--accent)'; statusText = 'REFORMULADO'; }

                        actionIcon = `<div style="color:${statusColor}; font-size:0.8rem; font-weight:800; margin-top:0.5rem; letter-spacing:1px;"><ion-icon name="trophy-outline"></ion-icon> ${statusText}</div>`;

                        // Action buttons if the current user is the recipient AND status is pending/countered
                        if (m.recipient_id === this.currentUser.id && (m.challenge_status === 'pending' || m.challenge_status === 'countered')) {
                            actionIcon += `
                                <div style="display:flex; gap:0.5rem; margin-top:0.8rem;">
                                    <button class="cta-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="event.stopPropagation(); app.handleChallengeAction('${m.id}', 'accept')">Aceptar</button>
                                    <button class="cta-btn secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="event.stopPropagation(); app.handleChallengeAction('${m.id}', 'reformulate')">Reformular</button>
                                    <button class="cta-btn secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:var(--error);" onclick="event.stopPropagation(); app.handleChallengeAction('${m.id}', 'reject')">Rechazar</button>
                                </div>
                            `;
                        } else if (m.sender_id === this.currentUser.id && m.challenge_status === 'accepted') {
                            actionIcon += `<div style="font-size:0.75rem; color:var(--success); margin-top:0.3rem;">¡La reserva ha sido creada! Revisa tu panel de Dashboard.</div>`;
                        }
                    }

                    return `
                        <div class="card glass-card" style="padding: 1.25rem; ${isReadClass} ${extraStyle}" 
                                ${clickAction ? `onclick="${clickAction}" onmouseover="this.style.transform='translateX(8px)'" onmouseout="this.style.transform='translateX(0)'"` : ''}>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-glow); display:flex; align-items:center; justify-content:center; color:var(--primary); font-weight:800; font-size:0.8rem;">
                                        ${senderName.charAt(0)}
                                    </div>
                                    <span style="font-weight: 700; color: var(--text-main);">${senderName}</span>
                                </div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); opacity:0.8;">${date}</span>
                            </div>
                            <div style="color: var(--text-main); white-space: pre-wrap; font-size:0.95rem; line-height:1.5;">${m.message}</div>
                            ${actionIcon}
                            <div style="text-align: right; margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                                ${!isPlayerRequest && !isChallenge ? `<button class="cta-btn secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;" onclick="event.stopPropagation(); app.replyToMessage('${m.sender_id}', '${senderName.replace(/'/g, "\\'")}', '${m.id}')"><ion-icon name="arrow-undo-outline"></ion-icon> Responder</button>` : ''}
                                ${!m.is_read ? `<button class="cta-btn secondary" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;" onclick="event.stopPropagation(); app.markMessageRead('${m.id}')">Marcar leído</button>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            };

            container.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                         <h3 style="color: var(--primary); margin:0;">Bandeja de Entrada</h3>
                         ${this.currentUser.role === 'player' ? `
                             <button class="cta-btn" onclick="app.showChallengeModal()">
                                 <ion-icon name="flash-outline"></ion-icon> Nuevo Desafío
                             </button>
                         ` : ''}
                     </div>
                     
                     <div style="margin-bottom: 2rem;">
                        <h4 style="color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                            Pendientes (${pendingMessages.length})
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${renderMessageList(pendingMessages)}
                        </div>
                     </div>

                     <div>
                        <h4 style="color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                            Historial
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem; opacity: 0.8;">
                             ${renderMessageList(historyMessages)}
                        </div>
                     </div>
                </div>
            `;
        } catch (e) {
            console.error('Error loading messages:', e);
            container.innerHTML = `<p style="color:red">Error cargando mensajes: ${e.message}</p>`;
        }
    }

    async markMessageRead(msgId) {
        try {
            await db.messages.markAsRead(msgId);
            this.updateMessagesBadge();
            this.renderMessagesView(document.getElementById('view-container'));
        } catch (e) {
            console.error(e);
        }
    }

    async renderDashboardView(container) {
        this.showLoading(container, 'Cargando panel...');

        try {
            // Fetch active tournaments
            let activeTournaments = await db.tournaments.getActive();

            // Filter for admins (professors) - only their institution
            if (this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution_id) {
                activeTournaments = activeTournaments.filter(t => t.institution_id === this.currentUser.institution_id);
            }

            // Fetch recent matches from database (if available)
            // For now using matches from current tournament as fallback
            let recentMatchesData = [];
            let upcomingMatchesData = [];

            // Get matches from current tournament
            if (this.tournament.matches && this.tournament.matches.length > 0) {
                recentMatchesData = this.tournament.matches.filter(m => m.isPlayed).slice(-10);
                upcomingMatchesData = this.tournament.matches.filter(m => !m.isPlayed).slice(0, 5);
            }

            // PLAYER DASHBOARD LOGIC (Override matches and calc stats)
            let playerStats = null;
            if (this.currentUser && this.currentUser.role === 'player') {
                try {
                    // Fetch actual matches for the player from all tournaments
                    const rows = await db.matches.getByPlayer(this.currentUser.id);

                    // Format rows into Match objects for the template
                    const playerMatches = rows.map(m => ({
                        id: m.id,
                        p1: { id: m.player1_id, name: m.player1_name },
                        p2: { id: m.player2_id, name: m.player2_name },
                        isPlayed: !!m.winner_id || (m.score && m.score.length > 0),
                        sets: m.score || [],
                        roundName: m.round,
                        tournament_name: m.tournaments?.name || 'Torneo',
                        institution_name: m.tournaments?.institutions?.name || '',
                        scheduling_status: m.scheduling_status,
                        scheduled_at: m.scheduled_at,
                        proposal_data: m.proposal_data,
                        winner_id: m.winner_id
                    }));

                    // Calc Stats
                    let played = 0;
                    let won = 0;
                    playerMatches.forEach(m => {
                        if (m.winner_id) {
                            played++;
                            if (m.winner_id === this.currentUser.id) won++;
                        }
                    });

                    playerStats = {
                        played,
                        won,
                        lost: played - won,
                        winRate: played > 0 ? Math.round((won / played) * 100) : 0
                    };

                    // Override generic dashboard data with Player specific data
                    upcomingMatchesData = playerMatches.filter(m => !m.winner_id).slice(0, 5);
                    recentMatchesData = playerMatches.filter(m => m.winner_id).slice(0, 5);

                } catch (err) {
                    console.error('Error loading player dashboard:', err);
                }
            }

            // Build HTML
            let demoToolsHTML = '';
            // Demo tools removed as per request (v92)

            // Segment Tournaments if Player
            let enrolledIds = [];
            if (this.currentUser && this.currentUser.role === 'player') {
                try {
                    const enrollments = await db.players.getUserEnrollments(this.currentUser.id);
                    enrolledIds = enrollments.map(e => e.tournament_id);
                } catch (e) {
                    console.error("Error fetching enrollments", e);
                }
            }

            const myTournaments = activeTournaments.filter(t => enrolledIds.includes(t.id));

            // Open: Not enrolled AND Registration Deadline >= Today (or not set)
            // Ongoing: Not enrolled AND Registration Deadline < Today (or Started)
            const today = new Date().toISOString().split('T')[0];

            const openTournaments = activeTournaments.filter(t =>
                !enrolledIds.includes(t.id) &&
                (!t.registrationDeadline || t.registrationDeadline >= today)
            );

            const ongoingTournaments = activeTournaments.filter(t =>
                !enrolledIds.includes(t.id) &&
                (t.registrationDeadline && t.registrationDeadline < today)
            );

            let tournamentSectionHTML = '';

            if (this.currentUser && this.currentUser.role === 'player') {
                tournamentSectionHTML = `
                    <!-- My Tournaments -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="tennisball-outline"></ion-icon> Mis Torneos
                            <span style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${myTournaments.length}</span>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                            ${myTournaments.length === 0 ? '<div class="text-muted">No estás inscripto en ningún torneo activo.</div>' :
                        myTournaments.map(t => this.renderTournamentCard(t, 'INSCRIPTO', '#22c55e')).join('')}
                        </div>
                    </div>

                    <!-- Open for Registration -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color: var(--accent); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="create-outline"></ion-icon> Inscripción Abierta
                            <span style="background: rgba(56,189,248,0.2); color: var(--accent); padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${openTournaments.length}</span>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                            ${openTournaments.length === 0 ? '<div class="text-muted">No hay torneos con inscripción abierta.</div>' :
                        openTournaments.map(t => this.renderTournamentCard(t, 'DISPONIBLE', 'var(--accent)')).join('')}
                        </div>
                    </div>

                    <!-- Ongoing / Closed -->
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color: var(--text-muted); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="play-outline"></ion-icon> En Curso / Vigentes
                            <span style="background: rgba(255,255,255,0.1); color: var(--text-muted); padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${ongoingTournaments.length}</span>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                            ${ongoingTournaments.length === 0 ? '<div class="text-muted">No hay otros torneos vigentes.</div>' :
                        ongoingTournaments.map(t => this.renderTournamentCard(t, 'EN CURSO', 'var(--text-muted)')).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Admin view (legacy)
                tournamentSectionHTML = `
                     <div style="margin-bottom: 2rem;">
                         <h3 style="color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                             <ion-icon name="trophy-outline"></ion-icon> Torneos Activos
                             <span style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${activeTournaments.length}</span>
                         </h3>
                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                             ${activeTournaments.length === 0 ?
                        '<div class="card" style="text-align: center; color: var(--text-muted);">No hay torneos activos</div>' :
                        activeTournaments.map(t => this.renderTournamentCard(t, 'ACTIVO', '#22c55e')).join('')
                    }
                         </div>
                     </div>`;
            }

            // Build HTML
            let html = `
                <!--Player Stats-->
                    ${this.currentUser && this.currentUser.role === 'player' && playerStats ? `
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:2rem;">
                            <div class="stat-card">
                                <div class="stat-icon" style="color: var(--accent);"><ion-icon name="tennisball"></ion-icon></div>
                                <div class="stat-value" style="color: var(--accent);">${playerStats.played}</div>
                                <div class="stat-label">Partidos</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="color: #4ade80;"><ion-icon name="trending-up"></ion-icon></div>
                                <div class="stat-value" style="color: #4ade80;">${playerStats.won}</div>
                                <div class="stat-label">Ganados</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="color: #f87171;"><ion-icon name="trending-down"></ion-icon></div>
                                <div class="stat-value" style="color: #f87171;">${playerStats.lost}</div>
                                <div class="stat-label">Perdidos</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon" style="color: var(--primary);"><ion-icon name="pie-chart"></ion-icon></div>
                                <div class="stat-value" style="color: var(--primary);">${playerStats.winRate}%</div>
                                <div class="stat-label">Efectividad</div>
                            </div>
                        </div>
                    ` : ''
                }

                <!--Tournaments Section-->
                ${tournamentSectionHTML}

                <!--Two Column Layout-->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">

                    <!-- Upcoming Matches -->
                    <div class="card" style="border-left: 4px solid var(--primary);">
                        <h3 style="color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="time-outline"></ion-icon> Próximos Partidos
                        </h3>
                        ${upcomingMatchesData.length === 0 ?
                    '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay partidos pendientes</div>' :
                    upcomingMatchesData.map(m => {
                        let statusBadge = '<span style="font-size: 0.8rem; background: rgba(56,189,248,0.2); color: var(--primary); padding: 0.2rem 0.5rem; border-radius: 0.25rem;">Pendiente</span>';
                        let actionBtn = `<button onclick="app.openSchedulingModal('${m.id}')" style="background:var(--primary); color:white; border:none; padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer; font-size:0.8rem;">Agendar</button>`;

                        if (m.scheduling_status === 'confirmed' && m.scheduled_at) {
                            const date = new Date(m.scheduled_at);
                            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const courtName = m.proposal_data?.court_name ? ` - ${m.proposal_data.court_name}` : '';
                            statusBadge = `<span style="font-size: 0.8rem; background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.5rem; border-radius: 0.25rem;">${dateStr}${courtName}</span>`;

                            // Player shortcut to report result if match is confirmed
                            if (this.currentUser && this.currentUser.role === 'player') {
                                actionBtn = `<button onclick="app.openReportResultModal('${m.id}')" style="background:var(--accent); color:var(--bg-dark); border:none; padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer; font-size:0.8rem; font-weight:600;">Reportar</button>`;
                            } else {
                                actionBtn = '';
                            }
                        } else if (m.scheduling_status === 'proposed') {
                            const proposalDate = m.proposal_data?.date || '';
                            const proposalTime = m.proposal_data?.time || '';
                            const courtName = m.proposal_data?.court_name || '';
                            const proposalInfo = proposalDate && proposalTime ? `${proposalDate} ${proposalTime}${courtName ? ' - ' + courtName : ''}` : '';

                            if (m.proposal_data && m.proposal_data.proposer_id === this.currentUser.id) {
                                statusBadge = `<span style="font-size: 0.8rem; background: rgba(245,158,11,0.2); color: #f59e0b; padding: 0.2rem 0.5rem; border-radius: 0.25rem;">Propuesta Enviada</span>`;
                                if (proposalInfo) {
                                    statusBadge += `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 0.15rem;">📅 ${proposalInfo}</div>`;
                                }
                                actionBtn = `<button onclick="app.openSchedulingModal('${m.id}')" style="background:rgba(255,255,255,0.1); color:var(--text-muted); border:1px solid var(--border); padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer; font-size:0.8rem;">Ver</button>`;
                            } else {
                                statusBadge = `<span style="font-size: 0.8rem; background: rgba(245,158,11,0.2); color: #f59e0b; padding: 0.2rem 0.5rem; border-radius: 0.25rem;">Propuesta Recibida</span>`;
                                if (proposalInfo) {
                                    statusBadge += `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 0.15rem;">📅 ${proposalInfo}</div>`;
                                }
                                actionBtn = `<button onclick="app.openSchedulingModal('${m.id}')" style="background:#f59e0b; color:white; border:none; padding:0.3rem 0.6rem; border-radius:0.3rem; cursor:pointer; font-size:0.8rem;">Responder</button>`;
                            }
                        }

                        return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border);">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <ion-icon name="tennisball-outline" style="color: var(--accent);"></ion-icon>
                                        <div>
                                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.1rem;">
                                                ${m.tournament_name || 'Torneo'} ${m.institution_name ? `- ${m.institution_name}` : ''}
                                            </div>
                                            <div style="font-size: 0.95rem; font-weight: 500;">${m.p1.name} vs ${m.p2.name}</div>
                                            ${m.roundName ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${m.roundName}</div>` : ''}
                                            <div style="margin-top:0.2rem;">${statusBadge}</div>
                                        </div>
                                    </div>
                                    <div>${actionBtn}</div>
                                </div>
                            `}).join('')
                }
                    </div>

                    <!-- Recent Results -->
                    <div class="card" style="border-left: 4px solid #f59e0b;">
                        <h3 style="color: #f59e0b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="list-outline"></ion-icon> Últimos Resultados
                        </h3>
                        ${recentMatchesData.length === 0 ?
                    '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay resultados recientes</div>' :
                    recentMatchesData.slice().reverse().map(m => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border);">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <ion-icon name="trophy" style="color: ${m.winner === m.p1 ? '#4ade80' : '#f59e0b'};"></ion-icon>
                                        <div>
                                            <div style="font-size: 0.9rem;">
                                                <span style="font-weight: ${m.winner === m.p1 ? '600' : '400'}; color: ${m.winner === m.p1 ? '#4ade80' : 'inherit'};">${m.p1.name}</span>
                                                <span style="color: var(--text-muted);"> vs </span>
                                                <span style="font-weight: ${m.winner === m.p2 ? '600' : '400'}; color: ${m.winner === m.p2 ? '#4ade80' : 'inherit'};">${m.p2.name}</span>
                                            </div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">${m.sets.map(s => `${s.p1}-${s.p2}`).join(' ')}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')
                }
                    </div>
                </div>
            `;

            // Add Pending Users Section for Admins (Professors)
            if (this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution_id) {
                try {
                    const pendingUsers = await db.users.getPendingByInstitution(this.currentUser.institution_id);

                    html += `
                <div style = "margin-top: 2rem;" >
                            <h3 style="color: #f59e0b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <ion-icon name="person-add-outline"></ion-icon> Jugadores Pendientes de Aprobación
                                <span style="background: rgba(245,158,11,0.2); color: #f59e0b; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem;">${pendingUsers.length}</span>
                            </h3>
                            <div class="card" style="border-left: 4px solid #f59e0b;">
                                ${pendingUsers.length === 0 ?
                            '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay jugadores pendientes de aprobación</div>' :
                            `<table style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                                                <th style="padding: 0.75rem; text-align: left;">Nombre</th>
                                                <th style="padding: 0.75rem; text-align: left;">Email</th>
                                                <th style="padding: 0.75rem; text-align: center;">Categoría</th>
                                                <th style="padding: 0.75rem; text-align: center;">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${pendingUsers.map(u => `
                                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <td style="padding: 0.75rem;">${u.name} ${u.lastname || ''}</td>
                                                    <td style="padding: 0.75rem; color: var(--text-muted);">${u.email || 'N/A'}</td>
                                                    <td style="padding: 0.75rem; text-align: center;">${u.category || 'N/A'}</td>
                                                    <td style="padding: 0.75rem; text-align: center;">
                                                        <button onclick="app.approveUser('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.category || ''}')" style="background: #22c55e; color: white; border: none; padding: 0.4rem 0.75rem; border-radius: 0.25rem; cursor: pointer; margin-right: 0.5rem; font-size: 0.8rem;">
                                                            <ion-icon name="checkmark-outline" style="vertical-align: middle;"></ion-icon> Aprobar
                                                        </button>
                                                        <button onclick="app.rejectUser('${u.id}', '${u.name}')" style="background: #ef4444; color: white; border: none; padding: 0.4rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">
                                                            <ion-icon name="close-outline" style="vertical-align: middle;"></ion-icon> Rechazar
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>`
                        }
                            </div>
                        </div>
                `;
                } catch (err) {
                    console.warn('Could not load pending users:', err);
                }
            }

            // Add Court Agenda Section for Admins
            if (this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution_id) {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const endOfTomorrow = new Date(tomorrow);
                    endOfTomorrow.setHours(23, 59, 59, 999);

                    const reservations = await db.matches.getConfirmedByInstitution(
                        this.currentUser.institution_id,
                        today.toISOString(),
                        endOfTomorrow.toISOString()
                    );

                    // Group by Date
                    const todayStr = today.toISOString().split('T')[0];
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];

                    const todayReservations = reservations.filter(r => r.scheduled_at.startsWith(todayStr));
                    const tomorrowReservations = reservations.filter(r => r.scheduled_at.startsWith(tomorrowStr));

                    const renderReservationRow = (r) => {
                        const time = new Date(r.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const court = r.court_slots?.court_name || 'Cancha Asignada';
                        const player1 = r.player1_name || 'Jugador 1';
                        const player2 = r.player2_name || 'Jugador 2';

                        return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02);">
                            <div style="display:flex; gap:1rem; align-items:center;">
                                <div style="background:var(--primary); color:white; padding:0.25rem 0.5rem; border-radius:0.25rem; font-weight:bold; font-size:0.9rem;">${time}</div>
                                <div>
                                    <div style="font-weight:600; font-size:0.95rem;">${court}</div>
                                    <div style="font-size:0.85rem; color:var(--text-muted);">${player1} vs ${player2}</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button onclick="app.cancelReservation('${r.id}')" title="Cancelar Reserva" style="background:rgba(239,68,68,0.1); color:#f87171; border:none; padding:0.4rem; border-radius:0.25rem; cursor:pointer;">
                                    <ion-icon name="trash-outline"></ion-icon>
                                </button>
                                <button onclick="app.openSchedulingModal('${r.id}')" title="Reprogramar" style="background:rgba(251,191,36,0.1); color:#fbbf24; border:none; padding:0.4rem; border-radius:0.25rem; cursor:pointer;">
                                    <ion-icon name="calendar-outline"></ion-icon>
                                </button>
                            </div>
                        </div>`;
                    };

                    html += `
                        <div style="margin-top: 2rem;">
                            <h3 style="color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <ion-icon name="calendar-number-outline"></ion-icon> Agenda de Canchas
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                                <!-- Today -->
                                <div class="card" style="border-top: 4px solid #3b82f6;">
                                    <h4 style="margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Hoy</h4>
                                    ${todayReservations.length === 0 ? '<div style="color:var(--text-muted); text-align:center; padding:1rem;">Sin reservas para hoy</div>' :
                            `<div style="display:flex; flex-direction:column;">${todayReservations.map(renderReservationRow).join('')}</div>`}
                                </div>
                                
                                <!-- Tomorrow -->
                                <div class="card" style="border-top: 4px solid #8b5cf6;">
                                    <h4 style="margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Mañana</h4>
                                    ${tomorrowReservations.length === 0 ? '<div style="color:var(--text-muted); text-align:center; padding:1rem;">Sin reservas para mañana</div>' :
                            `<div style="display:flex; flex-direction:column;">${tomorrowReservations.map(renderReservationRow).join('')}</div>`}
                                </div>
                            </div>
                        </div>`;

                } catch (err) {
                    console.warn('Could not load agenda:', err);
                }
            }

            container.innerHTML = demoToolsHTML + html;
            this.bindDashboardEvents();

        } catch (e) {
            console.error('Error loading dashboard:', e);
            container.innerHTML = `
                <div class="welcome-card" >
                    <h2>Panel General</h2>
                    <p style="color: var(--text-muted);">No se pudieron cargar los datos. Intenta de nuevo.</p>
                    <button class="cta-btn" onclick="app.navigateTo('dashboard')">Reintentar</button>
                </div>
                `;
        }
    }

    async cancelReservation(matchId) {
        if (!confirm('¿Estás seguro de que deseas cancelar esta reserva? El partido volverá a estado pendiente.')) return;

        try {
            this.showLoading(document.body, 'Cancelando reserva...');
            await db.matches.cancelSchedule(matchId);
            await this.renderDashboardView(document.getElementById('app-container'));
        } catch (err) {
            alert('Error al cancelar reserva: ' + err.message);
            this.hideLoading();
        }
    }

    async approveUser(userId, userName, currentCategory) {
        // Create Modal for Approval/Rejection Review
        const modal = document.createElement('div');
        modal.id = 'approve-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:2000;';

        modal.innerHTML = `
                <div style = "background:var(--bg-card); padding:2rem; border-radius:1rem; border:1px solid var(--border); width:90%; max-width:400px; position:relative;" >
                <button id="close-approve-modal" style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">&times;</button>
                <h3 style="margin-bottom:1rem; color:var(--primary);">Solicitud de Ingreso</h3>
                <p style="margin-bottom:1.5rem; color:var(--text-main);">Revisando solicitud de <strong>${userName}</strong>.</p>
                
                <div style="margin-bottom:1.5rem;">
                    <label class="form-label">Asignar Categoría:</label>
                    <select id="approve-category" class="form-select">
                        <option value="A" ${currentCategory === 'A' ? 'selected' : ''}>Categoría A</option>
                        <option value="B" ${currentCategory === 'B' ? 'selected' : ''}>Categoría B</option>
                        <option value="C" ${currentCategory === 'C' ? 'selected' : ''}>Categoría C</option>
                    </select>
                </div>

                <div style="display:flex; justify-content:space-between; gap:1rem; margin-top:2rem;">
                    <button id="btn-reject-user" class="cta-btn secondary" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid #ef4444;">Rechazar</button>
                    <button id="confirm-approve" class="cta-btn">Aprobar Jugador</button>
                </div>
            </div>
                `;
        document.body.appendChild(modal);

        // Events
        const closeModal = () => modal.remove();
        document.getElementById('close-approve-modal').onclick = closeModal;

        // REJECT ACTION
        document.getElementById('btn-reject-user').onclick = async () => {
            // Close this modal and open reject confirmation (handled by rejectUser)
            modal.remove();
            this.rejectUser(userId, userName);
        };

        // APPROVE ACTION
        document.getElementById('confirm-approve').onclick = async () => {
            const selectedCategory = document.getElementById('approve-category').value;
            try {
                // Show loading state on button
                const btn = document.getElementById('confirm-approve');
                btn.innerHTML = 'Procesando...';
                btn.disabled = true;

                await db.users.approveUser(userId, selectedCategory);

                // Audit Log
                if (window.db?.logs) {
                    await db.logs.create(this.currentUser?.id, 'approve_user', {
                        target_user_id: userId,
                        target_user_name: userName,
                        category: selectedCategory
                    });
                }

                modal.remove();
                alert(`Usuario ${userName} aprobado exitosamente en Categoría ${selectedCategory}.`);

                // Refresh views
                this.renderDashboardView(document.getElementById('view-container'));
                // Attempt to refresh messages too if we are there
                if (this.currentView === 'messages') {
                    this.renderMessagesView(document.getElementById('view-container'));
                }
            } catch (e) {
                console.error('Error approving user:', e);
                alert('Error al aprobar: ' + e.message);
                modal.remove();
            }
        };
    }

    async replyToMessage(recipientId, recipientName, originalMessageId) {
        if (!recipientId) return alert('No se puede responder a este mensaje (remitente desconocido).');

        const reply = prompt(`Responder a ${recipientName}:`);
        if (!reply || reply.trim() === '') return;

        try {
            await db.messages.create({
                sender_id: this.currentUser.id,
                recipient_id: recipientId,
                message: reply,
                match_id: null // Direct message
            });

            // Mark original as read implicitly? Or just notify success
            alert('Respuesta enviada correctamente.');
            this.showToast('Mensaje enviado', 'success');

            // Optionally, mark original as read if responding?
            if (originalMessageId) {
                await this.markMessageRead(originalMessageId);
            } else {
                this.renderMessagesView(document.getElementById('view-container'));
            }

        } catch (e) {
            console.error('Error sending reply:', e);
            alert('Error al enviar respuesta: ' + e.message);
        }
    }

    async showChallengeModal(prefill = null) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'challenge-modal';
        modal.innerHTML = `
            <div class="modal-content glass-card animate-scale-in" style="max-width: 500px; width: 90%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h3 style="margin: 0; color: var(--primary);">Desafiar Jugador</h3>
                    <button class="icon-btn" onclick="document.getElementById('challenge-modal').remove()"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                
                <form id="challenge-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <item-group>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">¿A quién desafías?</label>
                        <select id="challenge-player" class="card" style="width: 100%; border:1px solid var(--border); padding: 0.8rem; background: var(--bg-card); color: var(--text-main);" required>
                            <option value="">Selecciona un jugador...</option>
                        </select>
                    </item-group>

                    <item-group>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">¿Dónde juegan?</label>
                        <select id="challenge-institution" class="card" style="width: 100%; border:1px solid var(--border); padding: 0.8rem; background: var(--bg-card); color: var(--text-main);" required>
                            <option value="">Selecciona un club...</option>
                        </select>
                    </item-group>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <item-group>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">Fecha</label>
                            <input type="date" id="challenge-date" class="card" style="width: 100%; border:1px solid var(--border); padding: 0.8rem; background: var(--bg-card); color: var(--text-main);" required>
                        </item-group>
                        <item-group>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">Hora</label>
                            <select id="challenge-slot" class="card" style="width: 100%; border:1px solid var(--border); padding: 0.8rem; background: var(--bg-card); color: var(--text-main);" required disabled>
                                <option value="">Elige club y fecha...</option>
                            </select>
                        </item-group>
                    </div>

                    <item-group>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">Mensaje de desafío</label>
                        <textarea id="challenge-message" class="card" style="width: 100%; border:1px solid var(--border); padding: 0.8rem; background: var(--bg-card); color: var(--text-main); min-height: 80px;" placeholder="Ej: ¿Te animás a un partido este sábado?"></textarea>
                    </item-group>

                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" class="cta-btn secondary" style="flex: 1;" onclick="document.getElementById('challenge-modal').remove()">Cancelar</button>
                        <button type="submit" class="cta-btn" style="flex: 1;">Enviar Desafío</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Load data
        try {
            const players = await db.users.getAll();
            const institutions = await db.institutions.getAll();

            const playerSelect = document.getElementById('challenge-player');
            players.filter(p => p.id !== this.currentUser.id && p.role === 'player' && p.is_approved).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.name} ${p.lastname || ''} (${p.category || 'N/A'})`;
                playerSelect.appendChild(opt);
            });

            const instSelect = document.getElementById('challenge-institution');
            institutions.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.id;
                opt.textContent = i.name;
                instSelect.appendChild(opt);
            });

            // Prefill if needed
            if (prefill) {
                if (prefill.recipientId) playerSelect.value = prefill.recipientId;
                if (prefill.institutionId) instSelect.value = prefill.institutionId;
                if (prefill.date) document.getElementById('challenge-date').value = prefill.date;
                if (prefill.message) document.getElementById('challenge-message').value = prefill.message;
            }

            // Sync slots
            const syncSlots = async () => {
                const instId = instSelect.value;
                const date = document.getElementById('challenge-date').value;
                const slotSelect = document.getElementById('challenge-slot');

                if (instId && date) {
                    slotSelect.disabled = true;
                    slotSelect.innerHTML = '<option>Cargando disponibilidad...</option>';
                    try {
                        const slots = await db.courtSlots.getAvailableSlots(instId, date, 90); // Default 90m challenge
                        slotSelect.innerHTML = slots.length === 0 ? '<option value="">Sin turnos disponibles</option>' : '<option value="">Selecciona horario...</option>';
                        slots.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.court_slot_id;
                            opt.dataset.time = s.time;
                            opt.dataset.court = s.courtName;
                            opt.textContent = `${s.time} - ${s.courtName}`;
                            slotSelect.appendChild(opt);
                        });
                        slotSelect.disabled = false;
                    } catch (e) {
                        console.error('Error fetching slots for challenge:', e);
                        slotSelect.innerHTML = '<option value="">Error al cargar turnos</option>';
                    }
                }
            };

            instSelect.onchange = syncSlots;
            // Removed direct onchange for date input, handled by Flatpickr

            // Initialize Flatpickr
            flatpickr("#challenge-date", {
                locale: "es",
                minDate: "today",
                dateFormat: "Y-m-d",
                disableMobile: "true", // Force custom picker even on mobile
                theme: "dark",
                onChange: function (selectedDates, dateStr, instance) {
                    syncSlots();
                }
            });

        } catch (e) {
            console.error('Error loading data for challenge modal:', e);
            this.showToast('Error al cargar datos', 'error');
        }

        document.getElementById('challenge-form').onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const recipientId = document.getElementById('challenge-player').value;
            const instId = document.getElementById('challenge-institution').value;
            const date = document.getElementById('challenge-date').value;
            const slotOpt = document.getElementById('challenge-slot').selectedOptions[0];
            const comment = document.getElementById('challenge-message').value;

            if (!recipientId || !instId || !date || !slotOpt.value) {
                alert('Por favor completa todos los campos.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Desafío';
                return;
            }

            const instName = document.getElementById('challenge-institution').selectedOptions[0].textContent;

            const proposalData = {
                institutionId: instId,
                institutionName: instName,
                date: date,
                slotId: slotOpt.value,
                time: slotOpt.dataset.time,
                courtName: slotOpt.dataset.court
            };

            const fullMessage = `🎾 DESAFÍO RECIBIDO\n\nHola! Te desafío a un partido:\n📅 Fecha: ${new Date(date + 'T00:00:00').toLocaleDateString()}\n⏰ Hora: ${proposalData.time}\n📍 Club: ${instName}\n🏟️ Cancha: ${proposalData.courtName}\n\n"${comment || '¡Espero tu respuesta!'}"`;

            try {
                await db.messages.create({
                    sender_id: this.currentUser.id,
                    recipient_id: recipientId,
                    message: fullMessage,
                    challenge_status: 'pending',
                    proposal_data: proposalData
                });

                this.showToast('¡Desafío enviado!', 'success');
                modal.remove();
                if (this.currentView === 'messages') this.renderMessagesView(document.getElementById('view-container'));
            } catch (err) {
                console.error('Error sending challenge:', err);
                alert('No se pudo enviar el desafío: ' + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Desafío';
            }
        };
    }

    async handleChallengeAction(messageId, action) {
        this.showToast('Procesando...', 'info');
        try {
            const m = (await db.messages.getForUser(this.currentUser.id)).find(msg => msg.id === messageId);
            if (!m) throw new Error('Mensaje no encontrado');

            if (action === 'accept') {
                const prop = m.proposal_data;
                // Create actual booking
                const bookingData = {
                    user_id: this.currentUser.id,
                    institution_id: prop.institutionId,
                    date: prop.date,
                    start_time: prop.time,
                    // Simple end time calculation (90m)
                    end_time: this.addMinutesToTime(prop.time, 90),
                    court_name: prop.courtName,
                    court_slot_id: prop.slotId,
                    status: 'confirmed', // Accepted challenge is confirmed
                    total_price: 0, // Placeholder, usually handled at club
                    source: 'challenge'
                };

                await db.bookings.create(bookingData);
                await db.messages.updateChallengeStatus(messageId, 'accepted');

                // Notify the sender
                await db.messages.create({
                    sender_id: this.currentUser.id,
                    recipient_id: m.sender_id,
                    message: `¡${this.currentUser.name} ha ACEPTADO tu desafío para el ${new Date(prop.date + 'T00:00:00').toLocaleDateString()} a las ${prop.time}!`,
                    challenge_status: 'accepted'
                });

                this.showToast('¡Desafío aceptado! Reserva creada.', 'success');
            }
            else if (action === 'reject') {
                if (!confirm('¿Seguro que quieres rechazar este desafío?')) return;
                await db.messages.updateChallengeStatus(messageId, 'rejected');

                // Notify the sender
                await db.messages.create({
                    sender_id: this.currentUser.id,
                    recipient_id: m.sender_id,
                    message: `Lo siento, ${this.currentUser.name} ha rechazado tu desafío.`,
                    challenge_status: 'rejected'
                });

                this.showToast('Desafío rechazado.', 'info');
            }
            else if (action === 'reformulate') {
                const prop = m.proposal_data;
                await db.messages.updateChallengeStatus(messageId, 'countered');
                // Open modal prefilled with recipient as the original sender
                this.showChallengeModal({
                    recipientId: m.sender_id,
                    institutionId: prop.institutionId,
                    date: prop.date,
                    message: `Reformulo el desafío: No puedo a esa hora, ¿qué tal esta otra?`
                });
            }

            this.renderMessagesView(document.getElementById('view-container'));
        } catch (e) {
            console.error('Error in challenge action:', e);
            this.showToast('Error: ' + e.message, 'error');
        }
    }

    addMinutesToTime(timeStr, mins) {
        const [h, m] = timeStr.split(':').map(Number);
        const total = h * 60 + m + mins;
        const nh = Math.floor(total / 60) % 24;
        const nm = total % 60;
        return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
    }

    async rejectUser(userId, userName) {
        if (!confirm(`¿Rechazar y eliminar a "${userName}" ? Esta acción no se puede deshacer.`)) return;

        try {
            await db.users.rejectUser(userId);

            // Audit Log
            if (window.db?.logs) {
                await db.logs.create(this.currentUser?.id, 'reject_user', {
                    target_user_id: userId,
                    target_user_name: userName
                });
            }

            alert('Usuario rechazado y eliminado.');
            this.navigateTo('dashboard'); // Refresh
        } catch (e) {
            console.error('Error rejecting user:', e);
            alert('Error al rechazar usuario: ' + e.message);
        }
    }

    renderTournamentCard(t, badgeText, badgeColor) {
        // Guard against undefined/null tournament
        if (!t) return '';

        return `
            <div class="card" style="cursor: pointer; transition: all 0.3s ease; border: 1px solid var(--border); overflow: hidden; position: relative;"
                onclick="app.selectTournament('${t.id || ''}')"
                onmouseover="this.style.transform='translateY(-6px)'; this.style.borderColor='var(--primary)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.3)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)'; this.style.boxShadow='none';" >
                
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: ${badgeColor}; opacity: 0.8;"></div>

                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; padding-top: 0.5rem;">
                    <h4 style="margin: 0; color: var(--text-main); font-size: 1.1rem; font-weight: 600;">${t.name || 'Sin nombre'}</h4>
                    <span style="background: ${badgeColor}; color: white; font-size: 0.65rem; padding: 3px 8px; border-radius: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${badgeText}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    <div><ion-icon name="calendar-outline"></ion-icon> ${t.start_date || 'Sin fecha'}</div>
                    ${t.registration_deadline ? `<div><ion-icon name="alarm-outline"></ion-icon> Cierre: ${t.registration_deadline}</div>` : ''}
                    <div><ion-icon name="tennisball-outline"></ion-icon> ${t.type === 'singles' ? 'Singles' : 'Dobles'} - ${t.category || 'OPEN'}</div>
                    ${t.institutions?.name ? `<div><ion-icon name="business-outline"></ion-icon> ${t.institutions.name}</div>` : ''}
                </div>
            </div>
                `;
    }

    async selectTournament(id) {
        // Show loading animation
        const container = document.getElementById('view-container');
        container.innerHTML = `
                <div class="loading-container" >
                <div class="tennis-ball"></div>
                <div class="ball-shadow"></div>
                <span class="loading-text">Cargando torneo...</span>
            </div>
                `;

        // Load the tournament data into this.tournament
        console.log('Selecting tournament:', id);
        try {
            // Re-use logic from loadRecentTournament sort of.
            // We need a method to load by ID.
            // Improvised load:
            const tData = await db.tournaments.getById(id);

            if (tData) {
                this.tournament.init(
                    tData.name,
                    tData.type,
                    tData.category,
                    tData.institutions?.name,
                    tData.start_date,
                    tData.duration,
                    tData.observations,
                    tData.rules,
                    tData.registration_deadline,
                    tData.champion_name,
                    tData.surface
                );
                this.tournament.id = tData.id;
                this.tournament.status = tData.status; // Capture Status
                this.tournament.registrationPrice = tData.registration_price;

                // Load Players & Matches
                try {
                    const players = await db.players.getByTournament(tData.id);
                    console.log('Loaded players from DB:', players);
                    this.tournament.players = players.map(p => ({
                        id: p.player_id,
                        name: p.player_name,
                        category: p.category,
                        members: [p.player_name],
                        isComplete: true,
                        matchesPlayed: 0, matchesWon: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, points: 0, diffSets: 0, diffGames: 0
                    }));
                    console.log('Tournament players loaded:', this.tournament.players.length);
                } catch (playerError) {
                    console.warn('Could not load players:', playerError);
                    this.tournament.players = [];
                }

                // Load Groups Structure
                if (tData.groups && Array.isArray(tData.groups)) {
                    console.log('Loading groups from DB:', tData.groups.length);
                    this.tournament.groups = tData.groups.map(g => ({
                        ...g,
                        matches: [] // Reset matches to allow repopulation with Match objects
                    }));
                }

                // Load Matches from DB (Source of Truth for IDs)
                try {
                    let matches = await db.matches.getByTournament(tData.id);
                    console.log('Matches loaded from DB:', matches?.length);

                    // FALLBACK 1: Check if matches exist in the groups JSONB (legacy format)
                    if ((!matches || matches.length === 0) && tData.groups && Array.isArray(tData.groups)) {
                        console.log('No matches in DB table, checking groups JSONB...');
                        matches = [];
                        tData.groups.forEach((g, gIdx) => {
                            if (g.matches && g.matches.length > 0) {
                                g.matches.forEach(m => {
                                    matches.push({
                                        id: m.id || null,
                                        player1_id: m.p1?.id,
                                        player2_id: m.p2?.id,
                                        player1_name: m.p1?.name,
                                        player2_name: m.p2?.name,
                                        group_number: gIdx + 1,
                                        round: m.roundName || 'Grupos',
                                        scheduling_status: m.scheduling_status,
                                        scheduled_at: m.scheduled_at,
                                        proposal_data: m.proposal_data,
                                        score: m.sets,
                                        winner_id: m.winner?.id
                                    });
                                });
                            }
                        });
                        console.log('Recovered matches from groups JSONB:', matches.length);
                    }

                    // FALLBACK 2: If still no matches but groups have players, regenerate matches locally
                    if ((!matches || matches.length === 0) && this.tournament.groups && this.tournament.groups.length > 0) {
                        const hasPlayers = this.tournament.groups.some(g => g.players && g.players.length >= 2);
                        if (hasPlayers) {
                            console.log('No matches found but groups have players - regenerating matches locally');
                            matches = [];
                            this.tournament.groups.forEach((g, gIdx) => {
                                const ps = g.players || [];
                                for (let i = 0; i < ps.length; i++) {
                                    for (let j = i + 1; j < ps.length; j++) {
                                        matches.push({
                                            id: null,
                                            player1_id: ps[i].id,
                                            player2_id: ps[j].id,
                                            player1_name: ps[i].name,
                                            player2_name: ps[j].name,
                                            group_number: gIdx + 1,
                                            round: 'Grupos',
                                            scheduling_status: null,
                                            scheduled_at: null,
                                            proposal_data: null,
                                            score: null,
                                            winner_id: null
                                        });
                                    }
                                }
                            });
                            console.log('Generated matches from group players:', matches.length);
                        }
                    }

                    // Create player lookups by ID and by name (for legacy data where IDs may differ)
                    const playerMapById = {};
                    const playerMapByName = {};
                    this.tournament.players.forEach(p => {
                        playerMapById[p.id] = p;
                        playerMapByName[p.name.toLowerCase().trim()] = p;
                    });

                    // Also index players from groups if they have valid IDs
                    if (this.tournament.groups) {
                        this.tournament.groups.forEach(g => {
                            if (g.players) {
                                g.players.forEach(gp => {
                                    if (gp.id && !playerMapById[gp.id]) {
                                        playerMapById[gp.id] = gp;
                                    }
                                    if (gp.name) {
                                        const nameKey = gp.name.toLowerCase().trim();
                                        if (!playerMapByName[nameKey]) {
                                            playerMapByName[nameKey] = gp;
                                        }
                                    }
                                });
                            }
                        });
                    }

                    // FIX: Ensure group players reference the main "rich" player objects (with stats)
                    // instead of the "raw" JSON objects from the groups column.
                    if (this.tournament.groups) {
                        this.tournament.groups.forEach(g => {
                            if (g.players) {
                                g.players = g.players.map(gp => {
                                    // Try find by ID
                                    if (gp.id && playerMapById[gp.id]) {
                                        return playerMapById[gp.id];
                                    }
                                    // Try find by Name
                                    if (gp.name) {
                                        const nameKey = gp.name.toLowerCase().trim();
                                        if (playerMapByName[nameKey]) {
                                            return playerMapByName[nameKey];
                                        }
                                    }
                                    return gp;
                                });
                            }
                        });
                    }

                    this.tournament.matches = [];
                    (matches || []).forEach(m => {
                        // Try to find players by ID first, then by name
                        let p1 = playerMapById[m.player1_id];
                        let p2 = playerMapById[m.player2_id];

                        // Fallback: try to find by name if ID lookup failed
                        if (!p1 && m.player1_name) {
                            p1 = playerMapByName[m.player1_name.toLowerCase().trim()];
                        }
                        if (!p2 && m.player2_name) {
                            p2 = playerMapByName[m.player2_name.toLowerCase().trim()];
                        }

                        if (p1 && p2) {
                            const matchObj = new Match(p1, p2);
                            matchObj.id = m.id;
                            matchObj.groupNumber = m.group_number;
                            matchObj.roundName = m.round;
                            matchObj.scheduling_status = m.scheduling_status;
                            matchObj.scheduled_at = m.scheduled_at;
                            matchObj.proposal_data = m.proposal_data;

                            // Only mark as played if score has actual game values
                            if (Array.isArray(m.score) && m.score.length > 0 && m.score.some(set => set.p1 > 0 || set.p2 > 0)) {
                                matchObj.sets = m.score;
                                matchObj.isPlayed = true;
                            } else {
                                matchObj.isPlayed = false;
                            }
                            if (m.winner_id) matchObj.winner = playerMapById[m.winner_id];

                            this.tournament.matches.push(matchObj);

                            // Assign match to group if applicable
                            if (matchObj.groupNumber) {
                                const groupIdx = matchObj.groupNumber - 1;
                                if (this.tournament.groups[groupIdx]) {
                                    if (!this.tournament.groups[groupIdx].matches) {
                                        this.tournament.groups[groupIdx].matches = [];
                                    }
                                    // Check if match already added to avoid duplicates if logic runs twice
                                    if (!this.tournament.groups[groupIdx].matches.some(gm => gm.id === matchObj.id)) {
                                        this.tournament.groups[groupIdx].matches.push(matchObj);
                                    }
                                }
                            }

                        } else {
                            console.warn('Could not find players for match:', m.player1_id, m.player2_id, '->', p1, p2);
                        }
                    });

                    // IMPORTANT: Clear any "legacy" matches in groups that were simple objects
                    // If we populated from groups JSONB initially (lines 2018), they are plain objects.
                    // We just repopulated groups with real Match objects above.
                    // We should ensure groups only contain the `Match` instances.
                    // Actually, the above push logic appends. If groups already had matches from JSONB loading?
                    // We should likely clear `group.matches` before distributing `this.tournament.matches`.

                    console.log('Total matches reconstructed:', this.tournament.matches.length);

                    // Auto-save matches to DB if any have null IDs (regenerated locally)
                    const hasNullIds = this.tournament.matches.some(m => !m.id);
                    if (hasNullIds && this.tournament.id && this.tournament.matches.length > 0) {
                        console.log('Detected matches with null IDs, saving to database...');
                        try {
                            const matchesToSave = this.tournament.matches.map(m => ({
                                tournament_id: this.tournament.id,
                                player1_id: m.p1?.id || null,
                                player2_id: m.p2?.id || null,
                                player1_name: m.p1?.name || 'TBD',
                                player2_name: m.p2?.name || 'TBD',
                                round: m.roundName || 'Grupos',
                                group_number: m.groupNumber || null,
                                score: m.sets || [],
                                winner_id: m.winner?.id || null
                            }));
                            const savedMatches = await db.matches.createMany(matchesToSave);

                            // Update local matches with database IDs
                            if (savedMatches && savedMatches.length === this.tournament.matches.length) {
                                this.tournament.matches.forEach((m, i) => {
                                    m.id = savedMatches[i].id;
                                });
                                console.log('Matches saved to database with IDs:', savedMatches.length);
                            }
                        } catch (saveError) {
                            console.error('Failed to save regenerated matches:', saveError);
                        }
                    }
                } catch (matchError) {
                    console.warn('Could not load matches:', matchError);
                }

                if (tData.bracket && Array.isArray(tData.bracket) && tData.bracket.length > 0) {
                    console.log('Loading bracket from DB (JSON):', tData.bracket.length);
                    this.tournament.bracket = tData.bracket;
                } else {
                    // ATTEMPT RECONSTRUCT from matches (if stored efficiently in DB table)
                    // ATTEMPT RECONSTRUCT from matches (if stored efficiently in DB table)
                    const playoffMatches = this.tournament.matches.filter(m => {
                        const rName = (m.roundName || '').toLowerCase();
                        return rName && !rName.includes('grupo') && !rName.includes('group') && !rName.includes('fase de grupos') && !rName.includes('round robin');
                    });

                    if (playoffMatches.length > 0) {
                        console.log('Reconstructing bracket from matches...', playoffMatches.length);
                        const groups = {};
                        playoffMatches.forEach(m => {
                            let r = (m.roundName || 'S/D').trim();
                            const rLower = r.toLowerCase();

                            // Normalize Round Names to merge variations (e.g. "Semis" + "Semifinal")
                            if (rLower.includes('semi')) r = 'Semifinal';
                            else if (rLower.includes('cuartos')) r = 'Cuartos de Final';
                            else if (rLower.includes('octavos')) r = 'Octavos de Final';
                            else if (rLower.includes('16vos')) r = '16vos de Final';
                            else if (rLower.includes('32vos')) r = '32vos de Final';
                            else if (rLower.includes('final')) r = 'Final'; // Check Final LAST to not catch 'Cuartos de Final'

                            if (!groups[r]) groups[r] = [];
                            groups[r].push(m);
                            // Optional: Update match roundName for consistent display
                            m.roundName = r;
                        });

                        // Sor rounds by standard progression or size
                        // Standard: 32vos -> 16vos -> Octavos -> Cuartos -> Semis -> Final
                        // Standard Sort: Descending Size (Early Rounds -> Final)
                        const sortedBracket = Object.values(groups).sort((a, b) => {
                            // Primary: Size (Larger first)
                            const sizeDiff = b.length - a.length;
                            if (sizeDiff !== 0) return sizeDiff;

                            // Secondary: Name Priority (for equal size rounds, e.g. 3rd place vs Final)
                            const nameA = (a[0].roundName || '').toLowerCase();
                            const nameB = (b[0].roundName || '').toLowerCase();

                            // Check specific terms first to avoid "final" matching "semifinal"
                            const roundScores = [
                                { keys: ['32vos'], score: 50 },
                                { keys: ['16vos'], score: 60 },
                                { keys: ['octavos'], score: 70 },
                                { keys: ['cuartos'], score: 80 },
                                { keys: ['semi'], score: 90 }, // 'semifinal' or 'semis'
                                { keys: ['final'], score: 100 } // Checked last
                            ];

                            const getScore = (name) => {
                                // Find first matching entry
                                const hit = roundScores.find(entry => entry.keys.some(k => name.includes(k)));
                                return hit ? hit.score : 0;
                            };

                            const scoreA = getScore(nameA);
                            const scoreB = getScore(nameB);

                            // Ascending Score (50 -> 100)
                            return scoreA - scoreB;
                        });

                        this.tournament.bracket = sortedBracket;
                        console.log('Bracket reconstructed:', this.tournament.bracket);
                    }
                }

                // Ensure standings are calculated before rendering
                this.tournament.updateStandings();

                // Navigate to tournament dashboard
                console.log('Tournament loaded, navigating to dashboard');
                this.navigateTo('tournament-dashboard');
            } else {
                // Tournament not found
                console.error('Tournament not found with id:', id);
                alert('No se encontró el torneo. Puede haber sido eliminado.');
                this.navigateTo('tournaments');
            }
        } catch (e) {
            console.error('Error in selectTournament:', e);
            alert('Error abriendo torneo: ' + e.message);
            this.navigateTo('tournaments');
        }
    }

    getTournamentDashboardHTML() {
        const isPlayer = this.currentUser && this.currentUser.role === 'player';
        const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'superadmin');

        // Check if current user is already enrolled
        const isEnrolled = this.tournament.players.some(p => p.id === this.currentUser?.id);

        // Tournament Info Header
        let html = `
            <div style="max-width:700px; margin:0 auto;">
                <button class="cta-btn secondary" onclick="app.navigateTo('dashboard')" style="align-self:start; margin-bottom:1rem; border:none; padding-left:0;">
                    <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel
                </button>
                
                <!-- Tournament Info Card -->
                <div class="card" style="margin-bottom:1.5rem; border-left:4px solid var(--primary);">
                    <h2 style="color:var(--accent); margin:0 0 1rem 0;">${this.tournament.name}</h2>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; color:var(--text-muted); font-size:0.9rem;">
                        <div><ion-icon name="calendar-outline"></ion-icon> <strong>Inicio:</strong> ${this.tournament.startDate || 'Sin definir'}</div>
                        <div><ion-icon name="tennisball-outline"></ion-icon> <strong>Tipo:</strong> ${this.tournament.type === 'singles' ? 'Singles' : 'Dobles'}</div>
                        <div><ion-icon name="trophy-outline"></ion-icon> <strong>Categoría:</strong> ${this.tournament.category || 'Abierta'}</div>
                        <div><ion-icon name="people-outline"></ion-icon> <strong>Inscriptos:</strong> ${this.tournament.players.length}</div>
                        ${this.tournament.registrationPrice ? `<div><ion-icon name="cash-outline"></ion-icon> <strong>Precio:</strong> $${this.tournament.registrationPrice}</div>` : ''}
                    </div>
                    ${this.tournament.rules ? `
                        <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border);">
                            <strong>Reglas:</strong> 
                            ${typeof this.tournament.rules === 'object' ?
                    Object.entries(this.tournament.rules)
                        .map(([k, v]) => {
                            const labels = { goldenPoint: 'Punto de Oro', setFormat: 'Sets', tiebreakType: 'Tie-break' };
                            let val = v === true ? 'Sí' : (v === false ? 'No' : v);
                            return `<span style="display:inline-block; margin-right:1rem; font-size:0.85rem; color:var(--text-muted);">${labels[k] || k}: ${val}</span>`;
                        }).join('')
                    : this.tournament.rules}
                        </div>` : ''
            }
                </div>
        `;

        // If tournament is finished, show results ONLY (to everyone)
        const status = (this.tournament.status || '').toLowerCase().trim();
        console.log('🏆 Tournament Status Check:', { raw: this.tournament.status, normalized: status });

        if (status === 'finished') {
            html += `
                <div style="margin-top:2rem;">
                    <h3 style="margin:0 0 1.5rem 0; color:var(--text-main); text-align:center; font-size:1.4rem;">🏁 Resultados Finales</h3>
                    
                    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:2rem; padding:2rem; background:rgba(245,158,11,0.1); border-radius:1rem; border:1px solid rgba(245,158,11,0.2); justify-content:center; flex-direction:column;">
                        <ion-icon name="trophy" style="font-size:4rem; color:#f59e0b;"></ion-icon>
                        <div style="text-align:center;">
                            <div style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem;">Campeón del Torneo</div>
                            <div style="font-weight:800; color:var(--text-main); font-size:2rem; background: linear-gradient(to right, #f59e0b, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${this.tournament.championName || 'N/D'}</div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.2rem;">
                    <div class="card" onclick="app.navigateTo('groups')" style="cursor:pointer; padding:2rem; text-align:center; border:1px solid var(--border); transition:all 0.3s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-5px)'" onmouseout="this.style.borderColor='var(--border)'; this.style.transform='none'">
                        <ion-icon name="people" style="font-size:2.5rem; color:#4ade80; margin-bottom:1rem;"></ion-icon>
                        <h4 style="margin:0;">Resultados Grupos</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Ver posiciones y partidos de la fase de grupos.</p>
                    </div>

                    <div class="card" onclick="app.navigateTo('brackets')" style="cursor:pointer; padding:2rem; text-align:center; border:1px solid var(--border); transition:all 0.3s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-5px)'" onmouseout="this.style.borderColor='var(--border)'; this.style.transform='none'">
                         <ion-icon name="git-network" style="font-size:2.5rem; color:#a855f7; margin-bottom:1rem;"></ion-icon>
                        <h4 style="margin:0;">Llave Final</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Ver el cuadro de playoffs y resultados finales.</p>
                    </div>
                </div>

                <!-- EMBEDDED BRACKETS FOR HISTORY VIEW -->
                <div style="margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                    <h3 style="margin-bottom: 1.5rem; color: var(--text-main); text-align: center;">Cuadro de Desarrollo</h3>
                    ${this.getBracketsHTML(true)}
                </div>
            </div>`;
        } else {
            // NOT FINISHED - Normal Logic

            // ADMIN VIEW: Show management options
            if (isAdmin) {
                html += `
                    <h3 style="margin:2rem 0 1rem 0; color:var(--text-muted);">Gestión del Torneo</h3>
                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <div class="card" onclick="app.navigateTo('setup')" style="cursor:pointer; padding:1.5rem; display:flex; align-items:center; gap:1.5rem; border:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='var(--bg-card)'">
                            <div style="background:rgba(59,130,246,0.1); padding:1rem; border-radius:50%; color:#60a5fa;"><ion-icon name="settings-outline" style="font-size:1.5rem;"></ion-icon></div>
                            <div>
                                <h4 style="margin:0;">Configuración / Editar</h4>
                                <p style="color:var(--text-muted); margin:0.25rem 0 0 0; font-size:0.85rem;">Modifica reglas, fechas, precios y jugadores.</p>
                            </div>
                        </div>

                        <div class="card" onclick="app.navigateTo('groups')" style="cursor:pointer; padding:1.5rem; display:flex; align-items:center; gap:1.5rem; border:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='var(--bg-card)'">
                            <div style="background:rgba(34,197,94,0.1); padding:1rem; border-radius:50%; color:#4ade80;"><ion-icon name="people-outline" style="font-size:1.5rem;"></ion-icon></div>
                            <div>
                                <h4 style="margin:0;">Grupos y Zonas</h4>
                                <p style="color:var(--text-muted); margin:0.25rem 0 0 0; font-size:0.85rem;">Genera sorteos y organiza zonas.</p>
                            </div>
                        </div>

                        <div class="card" onclick="app.navigateTo('matches')" style="cursor:pointer; padding:1.5rem; display:flex; align-items:center; gap:1.5rem; border:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='var(--bg-card)'">
                            <div style="background:rgba(251,191,36,0.1); padding:1rem; border-radius:50%; color:#fbbf24;"><ion-icon name="tennisball-outline" style="font-size:1.5rem;"></ion-icon></div>
                            <div>
                                <h4 style="margin:0;">Cargar Resultados</h4>
                                <p style="color:var(--text-muted); margin:0.25rem 0 0 0; font-size:0.85rem;">Registra marcadores de partidos.</p>
                            </div>
                        </div>

                        <div class="card" onclick="app.navigateTo('brackets')" style="cursor:pointer; padding:1.5rem; display:flex; align-items:center; gap:1.5rem; border:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='var(--bg-card)'">
                            <div style="background:rgba(168,85,247,0.1); padding:1rem; border-radius:50%; color:#a855f7;"><ion-icon name="git-network-outline" style="font-size:1.5rem;"></ion-icon></div>
                            <div>
                                <h4 style="margin:0;">Llave Final (Playoffs)</h4>
                                <p style="color:var(--text-muted); margin:0.25rem 0 0 0; font-size:0.85rem;">Gestiona rondas finales.</p>
                            </div>
                        </div>

                        <div class="card" onclick="app.finalizeTournament()" style="cursor:pointer; padding:1.5rem; display:flex; align-items:center; gap:1.5rem; border:1px solid #ef444422; transition:background 0.2s; border:1px dashed #ef4444;" onmouseover="this.style.background='#ef444411'" onmouseout="this.style.background='var(--bg-card)'">
                            <div style="background:rgba(239,68,68,0.1); padding:1rem; border-radius:50%; color:#ef4444;"><ion-icon name="ribbon-outline" style="font-size:1.5rem;"></ion-icon></div>
                            <div>
                                <h4 style="margin:0; color:#ef4444;">Finalizar Torneo</h4>
                                <p style="color:var(--text-muted); margin:0.25rem 0 0 0; font-size:0.85rem;">Declara al campeón y actualiza el Ranking Global.</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            // PLAYER VIEW: Enrollment / Matches
            if (isPlayer) {
                if (isEnrolled) {
                    const groupsCreated = this.tournament.groups?.length > 0;

                    if (!groupsCreated) {
                        html += `
                        <div class="card" style="background:rgba(34,197,94,0.1); border:1px solid #22c55e; text-align:center; padding:2rem;">
                            <ion-icon name="checkmark-circle" style="font-size:3rem; color:#22c55e;"></ion-icon>
                            <h3 style="color:#22c55e; margin:1rem 0 0.5rem 0;">¡Estás Inscripto!</h3>
                            <p style="color:var(--text-muted); margin:0;">Ya formas parte de este torneo. Espera el sorteo de grupos.</p>
                        </div>`;
                    }

                    html += `
                        <!-- View Groups/Brackets if available -->
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-top:1.5rem;">
                            ${this.tournament.groups?.length > 0 ? `
                            <div class="card" onclick="app.navigateTo('groups')" style="cursor:pointer; padding:1.5rem; text-align:center; border:1px solid var(--border);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                                <ion-icon name="people-outline" style="font-size:2rem; color:#4ade80;"></ion-icon>
                                <div style="margin-top:0.5rem;">Ver Grupos</div>
                            </div>` : ''}
                            ${this.tournament.bracket?.length > 0 ? `
                            <div class="card" onclick="app.navigateTo('brackets')" style="cursor:pointer; padding:1.5rem; text-align:center; border:1px solid var(--border);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                                <ion-icon name="git-network-outline" style="font-size:2rem; color:#a855f7;"></ion-icon>
                                <div style="margin-top:0.5rem;">Ver Llave</div>
                            </div>` : ''}
                        </div>

                        <!-- Mis Partidos Section -->
                        <h3 style="margin:2rem 0 1rem 0; color:var(--text-muted); font-size:1.1rem; display:flex; align-items:center; gap:0.5rem;">
                            <ion-icon name="calendar-outline" style="color:var(--primary);"></ion-icon> Mi Agenda de Partidos
                        </h3>
                        ${(() => {
                            const myMatches = this.tournament.matches.filter(m =>
                                this.currentUser && !m.isPlayed && (m.p1?.id === this.currentUser.id || m.p2?.id === this.currentUser.id)
                            );
                            if (myMatches.length === 0) {
                                return `<div class="card" style="padding:1.5rem; text-align:center; color:var(--text-muted); border:1px dashed var(--border);">
                                    <ion-icon name="calendar-clear-outline" style="font-size:1.5rem; margin-bottom:0.5rem;"></ion-icon>
                                    <div>No hay partidos generados o pendientes para vos en este torneo.</div>
                                </div>`;
                            }

                            return `
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                ${myMatches.map(m => {
                                let statusBadge = '<span style="font-size: 0.75rem; background: rgba(56,189,248,0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px;">Pendiente</span>';
                                let btnTxt = 'Coordinar';
                                let btnStyle = 'background:transparent; border:1px solid var(--primary); color:var(--primary);';

                                if (m.scheduling_status === 'confirmed') {
                                    let dateStr = 'Confirmado';
                                    if (m.scheduled_at) {
                                        const d = new Date(m.scheduled_at);
                                        const date = d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
                                        const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
                                        dateStr = `${date} ${time}`;
                                    }
                                    statusBadge = `<span style="font-size: 0.75rem; background: rgba(34,197,94,0.1); color: #22c55e; padding: 2px 6px; border-radius: 4px;">${dateStr}</span>`;
                                    btnTxt = 'Ver';
                                    btnStyle = 'background:transparent; border:1px solid var(--text-muted); color:var(--text-muted);';
                                } else if (m.scheduling_status === 'proposed') {
                                    statusBadge = '<span style="font-size: 0.75rem; background: rgba(245,158,11,0.1); color: #f59e0b; padding: 2px 6px; border-radius: 4px;">Propuesta</span>';
                                    btnTxt = 'Responder';
                                    btnStyle = 'background: #f59e0b; color: white; border: none;';
                                }

                                return `
                                    <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--border); border-left:4px solid var(--accent);">
                                         <div>
                                            <div style="font-weight:600; color:var(--text-main); font-size:1rem;">vs ${m.p1?.id === this.currentUser.id ? m.p2?.name : m.p1?.name}</div>
                                            <div style="margin-top:0.3rem;">${statusBadge}</div>
                                         </div>
                                         <button onclick="app.openSchedulingModal('${m.id}')" class="cta-btn" style="font-size:0.85rem; padding:0.5rem 1rem; min-width:auto; ${btnStyle}">${btnTxt}</button>
                                    </div>
                                    `;
                            }).join('')}
                            </div>`;
                        })()}
                    `;
                } else {
                    // Not enrolled - show enrollment button
                    const priceText = this.tournament.registrationPrice
                        ? `$${this.tournament.registrationPrice}`
                        : 'Gratis';

                    html += `
                        <div class="card" style="text-align:center; padding:2rem; border:2px dashed var(--primary);">
                            <ion-icon name="tennisball" style="font-size:3rem; color:var(--primary);"></ion-icon>
                            <h3 style="color:var(--accent); margin:1rem 0 0.5rem 0;">¡Inscribite a este torneo!</h3>
                            <p style="color:var(--text-muted); margin:0 0 1.5rem 0;">
                                Cupos disponibles. Precio de inscripción: <strong style="color:var(--primary);">${priceText}</strong>
                            </p>
                            <button class="cta-btn" onclick="app.enrollInTournament('${this.tournament.id}')" style="font-size:1.1rem; padding:1rem 2rem;">
                                <ion-icon name="add-circle-outline" style="margin-right:0.5rem;"></ion-icon> Inscribirme
                            </button>
                        </div>
                    `;
                }
            }
        }

        html += `</div>`;
        return html;
    }
    bindTournamentDashboardEvents() {
        // Simple navigation clicks handled by onclick inline for simplicity
    }

    async finalizeTournament() {
        if (!confirm('¿Estás seguro de que quieres finalizar el torneo? Esto actualizará el ranking global de todos los jugadores participando y no se podrá revertir.')) {
            return;
        }

        try {
            this.showLoading(document.querySelector('.tournament-content'), 'Finalizando torneo y actualizando ranking...');

            // 1. Identify the champion (Winner of the very last match in the bracket)
            const lastRound = this.tournament.bracket[this.tournament.bracket.length - 1];
            const finalMatch = lastRound ? lastRound[0] : null;
            const champion = finalMatch && finalMatch.isPlayed ? finalMatch.winner : null;

            if (!champion) {
                alert('No se puede finalizar el torneo sin haber jugado la final.');
                await this.selectTournament(this.tournament.id);
                return;
            }

            // 2. Identify all winners of all matches (Group + Playoff) to update matches_won
            const winCounts = {}; // { playerId: count }

            // Group Matches
            this.tournament.groups.forEach(g => {
                g.matches.forEach(m => {
                    if (m.isPlayed && m.winner && m.winner.id) {
                        winCounts[m.winner.id] = (winCounts[m.winner.id] || 0) + 1;
                    }
                });
            });

            // Playoff Matches
            this.tournament.bracket.forEach(round => {
                round.forEach(m => {
                    if (m.isPlayed && m.winner && m.winner.id) {
                        winCounts[m.winner.id] = (winCounts[m.winner.id] || 0) + 1;
                    }
                });
            });

            // 3. Update stats in the profiles table
            // We need to fetch current stats first to increment them
            const players = await db.users.getByRole('player');

            const updatePromises = players.map(async (p) => {
                const winsInThisTournament = winCounts[p.id] || 0;
                const isChampion = champion.id === p.id;

                if (winsInThisTournament > 0 || isChampion) {
                    const updates = {
                        matches_won: (p.matches_won || 0) + winsInThisTournament,
                        tournaments_won: (p.tournaments_won || 0) + (isChampion ? 1 : 0)
                    };
                    return db.users.update(p.id, updates);
                }
            });

            await Promise.all(updatePromises);

            // 4. Set tournament status to 'finished'
            await db.tournaments.update(this.tournament.id, { status: 'finished' });

            // Audit Log
            if (window.db?.logs) {
                await db.logs.create(this.currentUser?.id, 'finalize_tournament', {
                    tournament_id: this.tournament.id,
                    tournament_name: this.tournament.name,
                    champion: champion.name
                });
            }

            alert(`¡Torneo Finalizado! \nCampeón: ${champion.name}\nEl ranking global ha sido actualizado.`);

            // Reload
            await this.selectTournament(this.tournament.id);

        } catch (err) {
            console.error('Error finalizing tournament:', err);
            alert('Error al finalizar el torneo: ' + err.message);
            await this.selectTournament(this.tournament.id);
        }
    }

    async enrollInTournament(tournamentId) {
        if (!this.currentUser) {
            alert('Debes iniciar sesión para inscribirte.');
            return;
        }

        // Get tournament data
        const tournament = this.tournament;

        // Check if registration requires payment
        if (tournament.registrationPrice && tournament.registrationPrice > 0) {
            // Show payment modal
            const modal = document.createElement('div');
            modal.id = 'enroll-modal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:2000;';

            modal.innerHTML = `
                <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; border:1px solid var(--border); width:90%; max-width:450px;">
                    <h3 style="margin-bottom:1rem; color:var(--primary); display:flex; align-items:center; gap:0.5rem;">
                        <ion-icon name="card-outline"></ion-icon> Inscripción a ${tournament.name}
                    </h3>
                    
                    <div style="background:rgba(56,189,248,0.1); padding:1.5rem; border-radius:0.5rem; text-align:center; margin-bottom:1.5rem;">
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">Precio de inscripción</div>
                        <div style="font-size:2.5rem; font-weight:bold; color:var(--primary);">$${tournament.registrationPrice}</div>
                    </div>
                    
                    <p style="color:var(--text-muted); margin-bottom:1.5rem; font-size:0.9rem;">
                        Al hacer click en "Pagar con MercadoPago", serás redirigido a la plataforma de pago. 
                        Una vez confirmado el pago, tu inscripción quedará registrada automáticamente.
                    </p>
                    
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        <button id="btn-pay-mp" class="cta-btn" style="background: linear-gradient(135deg, #009ee3, #00b1ea); font-size:1rem; padding:1rem;">
                            <ion-icon name="logo-usd" style="margin-right:0.5rem;"></ion-icon> Pagar con MercadoPago
                        </button>
                        <button id="btn-cancel-enroll" class="cta-btn secondary" style="background:transparent; border:1px solid var(--text-muted); color:var(--text-muted);">
                            Cancelar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Cancel button
            document.getElementById('btn-cancel-enroll').onclick = () => modal.remove();

            // Pay button
            document.getElementById('btn-pay-mp').onclick = async () => {
                const btn = document.getElementById('btn-pay-mp');
                btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Preparando pago...';
                btn.disabled = true;

                try {
                    // 1. Get Institution Credentials
                    const instData = await db.institutions.getMPCredentials(tournament.institution_id);
                    const accessToken = instData?.mp_access_token;

                    if (!accessToken) {
                        console.warn('Institución sin MP token, usando modo manual');
                        // Enrollment as manual/pending
                        await db.players.enroll(
                            tournamentId,
                            this.currentUser.id,
                            `${this.currentUser.name} ${this.currentUser.lastname || ''}`.trim(),
                            this.currentUser.category
                        );
                        alert('Inscripción registrada. Por favor coordina el pago con la administración (MP no configurado).');
                        modal.remove();
                        this.renderView();
                        return;
                    }

                    // 2. Create MP Preference
                    // Note: This is an example of calling MP directly from client for demo purposes.
                    // In a production app, this should ideally be done via an Edge Function for better security,
                    // but since we want to move fast and have the token in the DB, we'll implement it here.
                    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            items: [
                                {
                                    title: `Inscripción: ${tournament.name}`,
                                    unit_price: Number(tournament.registrationPrice),
                                    quantity: 1,
                                    currency_id: 'ARS'
                                }
                            ],
                            external_reference: `tournament:${tournamentId}:${this.currentUser.id}`,
                            back_urls: {
                                success: window.location.origin + window.location.pathname,
                                pending: window.location.origin + window.location.pathname,
                                failure: window.location.origin + window.location.pathname
                            },
                            auto_return: 'approved'
                        })
                    });

                    const preference = await response.json();

                    if (preference.init_point) {
                        // 3. Register enrollment as pending before redirecting
                        await db.players.enroll(
                            tournamentId,
                            this.currentUser.id,
                            `${this.currentUser.name} ${this.currentUser.lastname || ''}`.trim(),
                            this.currentUser.category
                        );

                        // 4. Redirect to MP
                        window.location.href = preference.init_point;
                    } else {
                        throw new Error('No se pudo generar el link de pago.');
                    }

                } catch (e) {
                    console.error('MP Integration error:', e);
                    alert('Error: ' + e.message);
                    btn.disabled = false;
                    btn.innerHTML = '<ion-icon name="logo-usd"></ion-icon> Pagar con MercadoPago';
                }
            };



        } else {
            // Free tournament - enroll directly
            if (!confirm(`¿Confirmas tu inscripción al torneo "${tournament.name}"?`)) return;

            try {
                await db.players.enroll(
                    tournamentId,
                    this.currentUser.id,
                    `${this.currentUser.name} ${this.currentUser.lastname || ''}`.trim(),
                    this.currentUser.category
                );

                alert('¡Te inscribiste exitosamente!');

                // Reload tournament data
                await this.selectTournament(tournamentId);

            } catch (err) {
                console.error('Enrollment error:', err);
                alert('Error al inscribirse: ' + err.message);
            }
        }
    }

    getDashboardHTML() {
        console.log('Rendering Dashboard. User:', this.currentUser);
        // SUPER ADMIN VIEW
        if (this.currentUser && this.currentUser.role === 'superadmin') {
            const users = auth.users;
            const institutions = auth.institutions || [];
            const profesores = users.filter(u => u.role === 'admin');
            const jugadores = users.filter(u => u.role === 'player');

            let html = `
                <div class="welcome-card" >
                <h2>Panel de Super Admin</h2>
                <div style="display: flex; gap: 2rem; justify-content: center; margin-top: 2rem;">
                    <div><div style="font-size:2rem; font-weight:700; color:#60a5fa;">${profesores.length}</div><div style="color:var(--text-muted);">Profesores</div></div>
                    <div><div style="font-size:2rem; font-weight:700; color:#4ade80;">${jugadores.length}</div><div style="color:var(--text-muted);">Jugadores</div></div>
                    <div><div style="font-size:2rem; font-weight:700; color:#fbbf24;">${institutions.length}</div><div style="color:var(--text-muted);">Instituciones</div></div>
                </div>
                </div>
            </div>

            <!-- DEMO TOOLS REMOVED (v92) -->
            
            <div style="margin-top: 2rem; border-bottom: 2px solid var(--border); margin-bottom: 2rem;">
                <button class="nav-btn active-tab" onclick="app.switchAdminTab('users')" id="tab-users" style="display:inline-flex; border-bottom:none; border-radius: 0.5rem 0.5rem 0 0; background: var(--hover);">Usuarios</button>
                <button class="nav-btn" onclick="app.switchAdminTab('inst')" id="tab-inst" style="display:inline-flex; border-bottom:none; border-radius: 0.5rem 0.5rem 0 0;">Instituciones</button>
            </div>

            <!--USERS TAB-->
            <div id="view-users">
                <div class="card">
                    <h3>Crear Usuario</h3>
                    <form id="sa-add-user" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap:1rem; align-items:end; margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid var(--border);">
                        <div><label>Nombre</label><input type="text" class="form-input" id="sa-name" required></div>
                        <div><label>Email</label><input type="email" class="form-input" id="sa-email" required></div>
                        <div>
                            <label>Rol</label>
                            <select class="form-select" id="sa-role" onchange="app.toggleInstSelect(this.value)">
                                <option value="player">Jugador</option>
                                <option value="admin">Profesor</option>
                            </select>
                        </div>
                        <div>
                            <label>Institución</label>
                            <select class="form-select" id="sa-inst" disabled>
                                <option value="">- Seleccionar -</option>
                                ${institutions.map(i => `<option value="${i.name}">${i.name}</option>`).join('')}
                            </select>
                        </div>
                        <button type="submit" class="cta-btn">Crear</button>
                    </form>
                    
                    <!-- PROFESORES TABLE -->
                    <div style="margin-bottom: 2rem;">
                        <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--primary);">
                            <ion-icon name="school-outline"></ion-icon> Profesores
                            <span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${users.filter(u => u.role === 'admin').length}</span>
                        </h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; background: rgba(59,130,246,0.05); border-radius: 0.5rem; overflow: hidden; border: 1px solid rgba(59,130,246,0.2);">
                                <thead>
                                    <tr style="background: rgba(59, 130, 246, 0.15); text-align: left;">
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--primary);">Nombre</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--primary);">Email</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--primary);">Institución</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: var(--primary); text-align: center; width: 80px;">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.filter(u => u.role === 'admin').length === 0 ? '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay profesores registrados</td></tr>' : ''}
                                    ${users.map((u, idx) => u.role === 'admin' ? `
                                        <tr style="border-bottom: 1px solid rgba(59,130,246,0.1); transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.1)'" onmouseout="this.style.background='transparent'">
                                            <td style="padding: 0.75rem 1rem; font-weight: 500;">${u.name} ${u.lastname || ''}</td>
                                            <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${u.email}</td>
                                            <td style="padding: 0.75rem 1rem;"><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.6rem; border-radius: 0.25rem;">${u.institution || '-'}</span></td>
                                            <td style="padding: 0.75rem 1rem; text-align: center;">
                                                <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem;" onclick="app.deleteUser(${idx})"><ion-icon name="trash-outline"></ion-icon></button>
                                            </td>
                                        </tr>` : '').join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- JUGADORES TABLE -->
                    <div>
                        <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #4ade80;">
                            <ion-icon name="person-outline"></ion-icon> Jugadores
                            <span style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${users.filter(u => u.role === 'player').length}</span>
                        </h4>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; background: rgba(34,197,94,0.05); border-radius: 0.5rem; overflow: hidden; border: 1px solid rgba(34,197,94,0.2);">
                                <thead>
                                    <tr style="background: rgba(34, 197, 94, 0.15); text-align: left;">
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Nombre</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Email</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Categoría</th>
                                        <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80; text-align: center; width: 80px;">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.filter(u => u.role === 'player').length === 0 ? '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay jugadores registrados</td></tr>' : ''}
                                    ${users.map((u, idx) => u.role === 'player' ? `
                                        <tr style="border-bottom: 1px solid rgba(34,197,94,0.1); transition: background 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.1)'" onmouseout="this.style.background='transparent'">
                                            <td style="padding: 0.75rem 1rem; font-weight: 500;">${u.name} ${u.lastname || ''}</td>
                                            <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${u.email}</td>
                                            <td style="padding: 0.75rem 1rem;"><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.6rem; border-radius: 0.25rem;">${u.category || '-'}</span></td>
                                            <td style="padding: 0.75rem 1rem; text-align: center;">
                                                <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem;" onclick="app.deleteUser(${idx})"><ion-icon name="trash-outline"></ion-icon></button>
                                            </td>
                                        </tr>` : '').join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!--INSTITUTIONS TAB-->
                <div id="view-inst" style="display: none;">
                    <div class="card">
                        <h3>Crear Institución</h3>
                        <form id="sa-add-inst" style="margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid var(--border);">

                            <!-- Row 1: Basic Info -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1rem;">
                                <div><label class="form-label">Nombre Club *</label><input type="text" class="form-input" id="inst-name" required placeholder="Ej. Club Tenis"></div>
                                <div><label class="form-label">Teléfono Contacto</label><input type="tel" class="form-input" id="inst-phone" placeholder="+54 9 11 1234-5678"></div>
                                <div><label class="form-label">Google Maps URL</label><input type="url" class="form-input" id="inst-maps" placeholder="https://goo.gl/maps/..."></div>
                            </div>

                            <!-- Row 2: Courts -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1rem;">
                                <div><label class="form-label">Canchas CON Iluminación</label><input type="number" class="form-input" id="inst-courts-lit" min="0" placeholder="0"></div>
                                <div><label class="form-label">Canchas SIN Iluminación</label><input type="number" class="form-input" id="inst-courts-unlit" min="0" placeholder="0"></div>
                            </div>

                            <!-- Row 3: Operating Hours -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:1rem;">
                                <div><label class="form-label">Horario Canchas c/Iluminación</label><input type="text" class="form-input" id="inst-hours-lit" placeholder="Ej. 07:00 - 23:00"></div>
                                <div><label class="form-label">Horario Canchas s/Iluminación</label><input type="text" class="form-input" id="inst-hours-unlit" placeholder="Ej. 07:00 - 19:00"></div>
                            </div>

                            <!-- Row 4: Prices -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1rem;">
                                <div><label class="form-label">Alquiler Diurno ($)</label><input type="number" class="form-input" id="inst-price-day" min="0" placeholder="0"></div>
                                <div><label class="form-label">Alquiler Nocturno ($)</label><input type="number" class="form-input" id="inst-price-night" min="0" placeholder="0"></div>
                            </div>

                            <!-- Row 5: Links -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1rem;">
                                <div><label class="form-label">Logo (URL)</label><input type="text" class="form-input" id="inst-logo" placeholder="https://..."></div>
                                <div><label class="form-label">Link MercadoPago</label><input type="text" class="form-input" id="inst-mp" placeholder="https://mp..."></div>
                                ${this.currentUser.role === 'superadmin' ? `
                                <div><label class="form-label">MP Access Token (Solo Super Admin)</label><input type="password" class="form-input" id="inst-mp-token" placeholder="APP_USR-..."></div>
                                ` : ''}
                            </div>

                            <button type="submit" class="cta-btn" style="margin-top:1rem;">Crear Institución</button>
                        </form>

                        <!-- INSTITUTIONS TABLE -->
                        <div>
                            <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #f59e0b;">
                                <ion-icon name="business-outline"></ion-icon> Instituciones Registradas
                                <span style="background: rgba(245,158,11,0.2); color: #fbbf24; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${institutions.length}</span>
                            </h4>

                            <!-- Cards Grid for Institutions (better for mobile and more info) -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
                                ${institutions.length === 0 ? '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay instituciones registradas</p>' : ''}
                                ${institutions.map(i => `
                                <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; position: relative;">
                                    <!-- Header -->
                                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                        <div style="width: 50px; height: 50px; background: #334155; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            ${i.logo ? `<img src="${i.logo}" style="width:100%; height:100%; object-fit:cover;">` : '<ion-icon name="business" style="font-size: 24px; color: #94a3b8;"></ion-icon>'}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; font-size: 1.1rem;">${i.name}</div>
                                            ${i.phone ? `<div style="font-size: 0.85rem; color: var(--text-muted);"><ion-icon name="call-outline" style="vertical-align: text-bottom;"></ion-icon> ${i.phone}</div>` : ''}
                                        </div>
                                        <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.4rem;" onclick="app.deleteInst('${i.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                                    </div>
                                    
                                    <!-- Courts Info -->
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.9rem;">
                                        <div style="background: rgba(34,197,94,0.1); padding: 0.5rem; border-radius: 0.5rem; text-align: center;">
                                            <div style="color: #4ade80; font-weight: 600;">${i.courtsWithLight || 0}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">Canchas c/Luz</div>
                                            ${i.hoursWithLight ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${i.hoursWithLight}</div>` : ''}
                                        </div>
                                        <div style="background: rgba(148,163,184,0.1); padding: 0.5rem; border-radius: 0.5rem; text-align: center;">
                                            <div style="color: #94a3b8; font-weight: 600;">${i.courtsWithoutLight || 0}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">Canchas s/Luz</div>
                                            ${i.hoursWithoutLight ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${i.hoursWithoutLight}</div>` : ''}
                                        </div>
                                    </div>
                                    
                                    <!-- Prices -->
                                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.85rem;">
                                        <div><span style="color: #fbbf24;"><ion-icon name="sunny-outline" style="vertical-align: text-bottom;"></ion-icon></span> Diurno: <strong>$${i.priceDay || 0}</strong></div>
                                        <div><span style="color: #818cf8;"><ion-icon name="moon-outline" style="vertical-align: text-bottom;"></ion-icon></span> Nocturno: <strong>$${i.priceNight || 0}</strong></div>
                                    </div>
                                    
                                    <!-- Links -->
                                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem;">
                                        ${i.mapsUrl ? `<a href="${i.mapsUrl}" target="_blank" style="color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 0.3rem;"><ion-icon name="location-outline"></ion-icon> Mapa</a>` : ''}
                                        ${i.paymentLink ? `<a href="${i.paymentLink}" target="_blank" style="color: #4ade80; text-decoration: none; display: flex; align-items: center; gap: 0.3rem;"><ion-icon name="card-outline"></ion-icon> Pago</a>` : ''}
                                    </div>
                                    
                                    <!-- Assigned Professors -->
                                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Profesores:</div>
                                        ${users.filter(u => u.institution === i.name && u.role === 'admin').length > 0
                    ? users.filter(u => u.institution === i.name && u.role === 'admin').map(u => `<span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.8rem; margin-right: 0.3rem;">${u.name}</span>`).join('')
                    : '<span style="color: var(--text-muted); font-size: 0.85rem;">Ninguno asignado</span>'}
                                    </div>
                                </div>
                            `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return html;
        }

        // ... existing Standard view ...
        // PLAYER VIEW (Default if not superadmin/admin)
        console.log('Checking Player View. Role:', this.currentUser.role);
        if (this.currentUser && (this.currentUser.role === 'player' || !this.currentUser.role)) {
            const userCat = this.currentUser.category || 'C';
            const hasActiveTournament = this.tournament.name !== null;

            // 1. MOCK CALENDAR (Plus Active Tournament)
            let upcomingTournaments = [
                { name: 'Torneo Apertura 2025', date: '2025-01-12', cat: 'A', club: 'Club Central', isActive: false },
                { name: 'Copa Verano', date: '2025-01-20', cat: 'B', club: 'TenisPro Arena', isActive: false },
                { name: 'Interclubes Amateur', date: '2025-02-05', cat: 'C', club: 'Club Social', isActive: false }
            ];

            // If active tournament, unshift it
            if (hasActiveTournament && this.tournament.startDate) {
                upcomingTournaments.unshift({
                    name: this.tournament.name,
                    date: this.tournament.startDate,
                    cat: this.tournament.category,
                    club: this.tournament.institution || 'Sede Central',
                    isActive: true
                });
            }

            const calendarHTML = upcomingTournaments.map((t, idx) => {
                const isMatch = t.cat === userCat;
                const highlight = isMatch ? 'border: 2px solid var(--primary); background: rgba(59,130,246,0.1);' : 'background: rgba(0,0,0,0.2);';
                const badge = isMatch ? '<span style="background:var(--primary); color:white; font-size:0.7rem; padding:2px 6px; border-radius:4px; margin-left:auto;">Tu Categoría</span>' : '';

                // Active badge
                const activeBadge = t.isActive ? '<span style="background:#22c55e; color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px;">ACTIVO</span>' : '';

                // Parse ISO date (YYYY-MM-DD) properly
                const dateObj = new Date(t.date + 'T00:00:00');
                const day = dateObj.getDate();
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const month = monthNames[dateObj.getMonth()];

                // Click action
                const clickAction = t.isActive
                    ? `onclick = "app.enterTournamentContext()"`
                    : `onclick = "alert('Este torneo aún no está disponible para ver.')"`;

                return `
                <div class="calendar-card" style = "padding: 1rem; border-radius: 0.75rem; ${highlight} display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" ${clickAction} onmouseover = "this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)';" onmouseout = "this.style.transform=''; this.style.boxShadow='';" >
                    <div class="date-box" style="background: linear-gradient(135deg, #334155, #1e293b); min-width: 55px; height: 55px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <span style="font-size: 0.7rem; color: var(--primary); text-transform: uppercase; font-weight: 600;">${month}</span>
                        <span style="font-size: 1.4rem; font-weight: bold; color: white; line-height: 1;">${day}</span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display:flex; align-items:center; flex-wrap: wrap; gap: 0.5rem;">
                            <span style="font-weight: 600; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.name}</span>
                            ${activeBadge}
                            ${badge}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); display:flex; flex-wrap: wrap; gap:0.75rem; margin-top:0.3rem;">
                            <span><ion-icon name="trophy-outline" style="vertical-align:text-bottom;"></ion-icon> Cat. ${t.cat}</span>
                            <span><ion-icon name="location-outline" style="vertical-align:text-bottom;"></ion-icon> ${t.club}</span>
                        </div>
                    </div>
                    <ion-icon name="chevron-forward-outline" style="color: var(--text-muted); font-size: 1.2rem;"></ion-icon>
                </div> `;
            }).join('');

            // 2. STATS & RESULTS (From Active Tournament)
            let statsHTML = '<p style="color:var(--text-muted);">No hay estadísticas disponibles.</p>';
            let recentMatchesHTML = '<p style="color:var(--text-muted);">No hay partidos recientes.</p>';
            let actionHTML = '';

            if (hasActiveTournament) {
                // Check if enrolled
                const isEnrolled = this.tournament.players.some(p => p.name === this.currentUser.name);

                // Stats Logic
                let wins = 0, losses = 0, played = 0;
                let recentMatches = [];

                this.tournament.groups.forEach(g => {
                    // Find played matches
                    g.matches.forEach(m => {
                        if (!m.isPlayed) return;
                        if (m.p1.name === this.currentUser.name || m.p2.name === this.currentUser.name) {
                            played++;
                            const isP1 = m.p1.name === this.currentUser.name;
                            const amIWinner = (isP1 && m.winner === m.p1) || (!isP1 && m.winner === m.p2);
                            if (amIWinner) wins++; else losses++;
                            recentMatches.push(m);
                        }
                    });
                });

                // Enrollement Logic
                // Enrollement Logic

                // For Doubles, "isEnrolled" is tricky. A user might be in a team (members includes name).
                const myTeam = this.tournament.players.find(p => p.members && p.members.includes(this.currentUser.name));
                const isUserEnrolled = !!myTeam;
                const isDoubles = this.tournament.type === 'doubles';

                if (!isUserEnrolled) {
                    // Payment link logic
                    const instName = this.tournament.institution;
                    let payBtn = '';
                    if (instName) {
                        const inst = auth.institutions.find(i => i.name === instName);
                        if (inst && inst.paymentLink) {
                            payBtn = `<a href = "${inst.paymentLink}" target = "_blank" class="cta-btn secondary" style = "display:block; text-align:center; margin-bottom:1rem; border:1px solid var(--accent); color:var(--accent);" > Pagar Web</a > `;
                        }
                    }

                    if (hasActiveTournament) {
                        let joinActions = '';
                        if (isDoubles) {
                            // List incomplete teams
                            const pendingTeams = this.tournament.players.filter(p => !p.isComplete);
                            const teamsList = pendingTeams.map(t => `
                <div style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:0.4rem; margin-top:0.5rem;" >
                                    <span>${t.members[0]} (Busca compañero)</span>
                                    <button class="cta-btn secondary" style="font-size:0.8rem; padding:0.3rem 0.6rem;" onclick="app.joinTeam(${t.id})">Unirse</button>
                                </div>
                `).join('');

                            joinActions = `
                <button class="cta-btn" id = "btn-create-team" style = "width:100%; margin-bottom:1rem;" > Crear Nueva Pareja</button>
                    ${pendingTeams.length > 0 ? `<div style="margin-top:1rem;"><small>O únete a alguien:</small>${teamsList}</div>` : ''}
            `;
                        } else {
                            joinActions = `<button class="cta-btn" id = "btn-join-tournament" > Inscribirme</button> `;
                        }

                        actionHTML = `
                <div class="card" style = "margin-top: 2rem; border: 1px solid var(--accent);" >
                               <h3><ion-icon name="flag-outline"></ion-icon> Inscripción Abierta (${isDoubles ? 'Dobles' : 'Singles'})</h3>
                               <p>Torneo Actual: <strong>${this.tournament.name}</strong></p>
                               ${payBtn}
                               ${joinActions}
                           </div>
                `;
                    } else {
                        actionHTML = `
                <div class="card" style = "margin-top: 2rem; border: 1px solid var(--border); opacity: 0.7;" >
                               <h3><ion-icon name="information-circle-outline"></ion-icon> Sin Torneos Activos</h3>
                               <p>No hay torneos activos en este momento en tu institución.</p>
                           </div>
                `;
                    }
                } else {
                    if (isDoubles && !myTeam.isComplete) {
                        actionHTML = `
                <div class="card" style = "margin-top: 2rem; border: 1px solid var(--accent); background: rgba(234, 179, 8, 0.1);" >
                               <h3><ion-icon name="time-outline"></ion-icon> Esperando Compañero</h3>
                               <p>Te has inscrito. Esperando a que otro jugador se una a tu equipo.</p>
                           </div>
                `;
                    }
                    // Stats UI
                    statsHTML = `
                <div style = "display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; text-align:center;" >
                        <div style="background:rgba(34,197,94,0.1); padding:1rem; border-radius:0.5rem;">
                            <div style="font-size:1.5rem; font-weight:bold; color:#4ade80;">${wins}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Victorias</div>
                        </div>
                        <div style="background:rgba(239,68,68,0.1); padding:1rem; border-radius:0.5rem;">
                            <div style="font-size:1.5rem; font-weight:bold; color:#f87171;">${losses}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Derrotas</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:0.5rem;">
                            <div style="font-size:1.5rem; font-weight:bold; color:white;">${Math.round((wins / played || 0) * 100)}%</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Efectividad</div>
                        </div>
                    </div> `;

                    // Recent Matches UI
                    if (recentMatches.length > 0) {
                        recentMatchesHTML = recentMatches.map(m => {
                            const isP1 = m.p1.name === this.currentUser.name;
                            const opponent = isP1 ? m.p2.name : m.p1.name;
                            const amIWinner = (isP1 && m.winner === m.p1) || (!isP1 && m.winner === m.p2);
                            const resultColor = amIWinner ? '#4ade80' : '#f87171';
                            const resultIcon = amIWinner ? 'checkmark-circle' : 'close-circle';

                            return `
                <div style = "display:flex; justify-content:space-between; align-items:center; padding:0.75rem; border-bottom:1px solid var(--border);" >
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <ion-icon name="tennisball-outline" style="color:${resultColor}"></ion-icon>
                                    <div>
                                        <div style="font-size:0.9rem;">vs <strong>${opponent}</strong></div>
                                        <div style="font-size:0.75rem; color:var(--text-muted);">${m.sets.map(s => Object.values(s).join('-')).join(', ')}</div>
                                    </div>
                                </div>
                                <ion-icon name="${resultIcon}" style="color:${resultColor}; font-size:1.2rem;"></ion-icon>
                            </div> `;
                        }).join('');
                    } else {
                        recentMatchesHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">Aún no has jugado partidos en este torneo.</div>';
                    }

                    // Show "Enter Tournament" button to access Groups/Brackets
                    actionHTML += `
                <div class="card" style = "margin-top:1rem; border:1px solid var(--primary);" >
                            <h3><ion-icon name="enter-outline"></ion-icon> Acceder al Torneo</h3>
                            <p>Ver grupos, posiciones y llave del torneo <strong>${this.tournament.name}</strong>.</p>
                            <button class="cta-btn" id="btn-enter-tournament" style="width:100%;">Ver Grupos y Llaves</button>
                        </div>
                `;
                }
            } else {
                // No active tournament -> Empty state for sections
                statsHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">No hay torneo activo para calcular estadísticas.</div>';
                recentMatchesHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">No hay historial reciente.</div>';
                actionHTML = `
                <div class="card" style = "margin-top: 2rem; border: 1px solid var(--border); opacity: 0.7;" >
                           <h3><ion-icon name="information-circle-outline"></ion-icon> Sin Torneos Activos</h3>
                           <p>No hay torneos activos en este momento.</p>
                       </div>
                `;
            }

            // 3. CLUBS/INSTITUTIONS SECTION
            const institutions = auth.institutions || [];

            // Mock tournament data per club (in real implementation this would come from a database)
            const clubsData = institutions.map(inst => {
                // Count active tournaments for this institution 
                const activeTournaments = this.tournament.institution === inst.name ? 1 : 0;
                return {
                    name: inst.name,
                    logo: inst.logo,
                    activeTournaments: activeTournaments,
                    totalTournaments: Math.floor(Math.random() * 5) + activeTournaments // Mock total
                };
            });

            // Add some mock clubs if no institutions registered
            const displayClubs = clubsData.length > 0 ? clubsData : [
                { name: 'Club Central', logo: null, activeTournaments: 2, totalTournaments: 5 },
                { name: 'TenisPro Arena', logo: null, activeTournaments: 1, totalTournaments: 3 },
                { name: 'Club Social', logo: null, activeTournaments: 0, totalTournaments: 2 }
            ];

            const clubsHTML = displayClubs.map(club => `
                <div class="club-card" onclick="app.showClubTournaments('${club.name.replace(/'/g, "\\'")}')" 
                     style="background: linear-gradient(135deg, var(--bg-card), rgba(30, 41, 59, 0.7)); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 1rem;"
                     onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" 
                     onmouseout="this.style.borderColor='var(--border)'; this.style.transform=''">
            <div style = "width: 50px; height: 50px; border-radius: 50%; background: ${club.logo ? `url(${club.logo}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--accent))'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" >
                ${!club.logo ? `<ion-icon name="business-outline" style="font-size: 1.5rem; color: white;"></ion-icon>` : ''}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${club.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 1rem; margin-top: 0.25rem;">
                            <span style="color: ${club.activeTournaments > 0 ? '#4ade80' : 'var(--text-muted)'};">
                                <ion-icon name="flame-outline" style="vertical-align: text-bottom;"></ion-icon> ${club.activeTournaments} activo${club.activeTournaments !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <ion-icon name="chevron-forward-outline" style="color: var(--text-muted); font-size: 1.2rem;"></ion-icon>
                </div>
            `).join('');

            return `
            <div class="player-dashboard-grid" style = "display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;" >
                <!--CALENDAR COLUMN-->
                <div class="card">
                    <h3><ion-icon name="calendar-outline" style="margin-right:0.5rem; color:var(--primary);"></ion-icon> Calendario de Torneos</h3>
                    <div style="margin-top:1rem;">
                        ${calendarHTML}
                    </div>
                </div>

                <!--STATS & ACTION COLUMN-->
            <div style="display:flex; flex-direction:column; gap:1.5rem;">

                ${actionHTML ? actionHTML : ''}

                <div class="card">
                    <h3><ion-icon name="stats-chart-outline" style="margin-right:0.5rem; color:#4ade80;"></ion-icon> Mis Estadísticas</h3>
                    <div style="margin-top:1rem;">
                        ${statsHTML}
                    </div>
                </div>

                <div class="card">
                    <h3><ion-icon name="time-outline" style="margin-right:0.5rem; color:#f472b6;"></ion-icon> Últimos Resultados</h3>
                    <div style="margin-top:1rem;">
                        ${recentMatchesHTML}
                    </div>
                </div>
            </div>
            </div>

            <!--CLUBS SECTION-->
            <div class="card" style="margin-top: 1.5rem;">
                <h3><ion-icon name="business-outline" style="margin-right:0.5rem; color:#f59e0b;"></ion-icon> Explorar por Institución</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Encuentra torneos por club o institución.</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    ${clubsHTML}
                </div>
            </div>
        `;
        }

        // STANDARD VIEW (Professors or Generic)
        const hasTournament = this.tournament.name !== null;
        const isProf = this.currentUser && this.currentUser.role === 'admin';

        if (!hasTournament) {
            if (isProf) {
                return `
            <div class="welcome-card" >
                    <h2>Bienvenido, Profesor ${this.currentUser.lastname || ''}</h2>
                    <p>Institución: <strong>${this.currentUser.institution}</strong></p>
                    <p>No hay torneo activo.</p>
                    <button class="cta-btn" onclick="app.navigateTo('setup')">Crear Nuevo Torneo</button>
                </div>
            `;
            } else {
                // Fallback for players if no role matched above (shouldn't happen)
                return `
            <div class="welcome-card" >
                    <h2>Bienvenido al Gestor de Torneos</h2>
                    <p>No hay torneos activos.</p>
                </div>
            `;
            }
        }

        // PROFESSOR ACTIVE TOURNAMENT VIEW
        return `
            <div class="welcome-card" >
                <h2>${this.tournament.name}</h2>
                <span style="display:inline-block; margin-top:0.5rem; background:rgba(255,255,255,0.1); padding:0.2rem 0.8rem; border-radius:1rem;">Categoría ${this.tournament.category}</span>

                
                <div style="display: flex; gap: 2rem; justify-content: center; margin-top: 2rem;">
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${this.tournament.players.length}</div>
                        <div style="color: var(--text-muted);">${this.tournament.type === 'singles' ? 'Jugadores' : 'Parejas'}</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--accent);">${this.tournament.groups.length}</div>
                        <div style="color: var(--text-muted);">Zonas</div>
                    </div>
                </div>
            </div>
            `;
    }

    // New Helpers
    switchAdminTab(tab) {
        const viewUsers = document.getElementById('view-users');
        const viewInst = document.getElementById('view-inst');
        if (viewUsers) viewUsers.style.display = tab === 'users' ? 'block' : 'none';
        if (viewInst) viewInst.style.display = tab === 'inst' ? 'block' : 'none';

        const tabUsers = document.getElementById('tab-users');
        const tabInst = document.getElementById('tab-inst');
        if (tabUsers) tabUsers.style.background = tab === 'users' ? 'var(--hover)' : 'transparent';
        if (tabInst) tabInst.style.background = tab === 'inst' ? 'var(--hover)' : 'transparent';
    }

    toggleInstSelect(role) {
        const sel = document.getElementById('sa-inst');
        if (!sel) return;
        if (role === 'admin') {
            sel.disabled = false;
            sel.required = true;
        } else {
            sel.disabled = true;
            sel.required = false;
            sel.value = "";
        }
    }

    deleteInst(id) {
        if (confirm('Eliminar Institución?')) {
            auth.deleteInstitution(id);
            this.renderView();
            setTimeout(() => this.switchAdminTab('inst'), 100);
        }
    }

    deleteUser(index) {
        if (confirm('Eliminar usuario?')) {
            auth.users.splice(index, 1);
            localStorage.setItem('tennis_users', JSON.stringify(auth.users));
            this.renderView();
        }
    }

    bindDashboardEvents() {
        // Super Admin Bindings
        const formUser = document.getElementById('sa-add-user');
        if (formUser) {
            formUser.onsubmit = (e) => {
                e.preventDefault();
                // Add Logic
                const name = document.getElementById('sa-name').value;
                const email = document.getElementById('sa-email').value;
                const role = document.getElementById('sa-role').value;
                const inst = document.getElementById('sa-inst').value;

                auth.users.push({
                    name, email, role, institution: inst,
                    pass: '123456', // Default pass
                    id: Date.now().toString()
                });
                localStorage.setItem('tennis_users', JSON.stringify(auth.users));
                alert('Usuario creado (Pass por defecto: 123456)');
                this.renderView();
            };
        }

        const formInst = document.getElementById('sa-add-inst');
        if (formInst) {
            formInst.onsubmit = (e) => {
                e.preventDefault();
                auth.addInstitution({
                    name: document.getElementById('inst-name').value,
                    courts_with_light: parseInt(document.getElementById('inst-courts-lit').value) || 0,
                    courts_without_light: parseInt(document.getElementById('inst-courts-unlit').value) || 0
                });
                // Force Render and switch tab
                this.renderView();
                // We need to persist the tab state or switch it back.
                // Simple hack:
                setTimeout(() => this.switchAdminTab('inst'), 50);
            };
        }

        const btnJoin = document.getElementById('btn-join-tournament');
        if (btnJoin) {
            btnJoin.addEventListener('click', () => {
                if (this.tournament.registrationDeadline) {
                    const deadline = new Date(this.tournament.registrationDeadline);
                    const now = new Date();
                    if (now > deadline) {
                        return alert('La fecha límite de inscripción ha caducado.');
                    }
                }

                try {
                    const userMeanCat = this.currentUser.category;
                    if (this.tournament.type === 'doubles') {
                        // Default Create
                        this.tournament.createDoublesTeam(this.currentUser.name, userMeanCat);
                    } else {
                        // Singles
                        this.tournament.addPlayer(this.currentUser.name, userMeanCat);
                    }
                    alert('Te has inscrito correctamente.');
                    this.renderView();
                } catch (e) {
                    alert('No puedes inscribirte: ' + e.message);
                }
            });
        }

        const btnCreateTeam = document.getElementById('btn-create-team');
        if (btnCreateTeam) {
            btnCreateTeam.addEventListener('click', () => {
                if (this.tournament.registrationDeadline) {
                    const deadline = new Date(this.tournament.registrationDeadline);
                    if (new Date() > deadline) return alert('Fecha límite caducada.');
                }
                try {
                    this.tournament.createDoublesTeam(this.currentUser.name, this.currentUser.category || 'C');
                    alert('Equipo creado. Tu compañero podrá unirse seleccionándote.');
                    this.renderView();
                } catch (e) { alert(e.message); }
            });
        }

        const btnEnterTournament = document.getElementById('btn-enter-tournament');
        if (btnEnterTournament) {
            btnEnterTournament.addEventListener('click', () => {
                this.enterTournamentContext();
            });
        }
    }

    // Helper: Enable Player access to tournament-specific views
    enterTournamentContext() {
        // Show Groups and Brackets nav buttons for player
        const navBtns = document.querySelectorAll('.nav-btn[data-view]');
        navBtns.forEach(btn => {
            const view = btn.getAttribute('data-view');
            if (view === 'groups' || view === 'brackets') {
                btn.style.display = 'flex';
            }
        });
        // Navigate to groups
        this.navigateTo('groups');
    }

    // Show tournaments by club in a modal
    showClubTournaments(clubName) {
        // Mock tournaments for the club (in production, this would query a database)
        const allTournaments = [
            { name: 'Torneo Apertura 2025', date: '2025-01-12', cat: 'A', club: 'Club Central', status: 'upcoming' },
            { name: 'Copa Verano', date: '2025-01-20', cat: 'B', club: 'TenisPro Arena', status: 'upcoming' },
            { name: 'Interclubes Amateur', date: '2025-02-05', cat: 'C', club: 'Club Social', status: 'upcoming' },
            { name: 'Master Series 2024', date: '2024-11-15', cat: 'A', club: 'Club Central', status: 'finished' },
            { name: 'Liga Otoño', date: '2024-10-01', cat: 'B', club: 'TenisPro Arena', status: 'finished' }
        ];

        // Add active tournament if exists
        if (this.tournament.name && this.tournament.institution) {
            allTournaments.unshift({
                name: this.tournament.name,
                date: this.tournament.startDate || new Date().toISOString().split('T')[0],
                cat: this.tournament.category,
                club: this.tournament.institution,
                status: 'active'
            });
        }

        // Filter by club
        const clubTournaments = allTournaments.filter(t => t.club === clubName);

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const tournamentsHTML = clubTournaments.length > 0 ? clubTournaments.map(t => {
            const dateObj = new Date(t.date + 'T00:00:00');
            const day = dateObj.getDate();
            const month = monthNames[dateObj.getMonth()];

            const statusBadge = t.status === 'active'
                ? '<span style="background:#22c55e; color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px;">ACTIVO</span>'
                : t.status === 'finished'
                    ? '<span style="background:#64748b; color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px;">FINALIZADO</span>'
                    : '<span style="background:#3b82f6; color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px;">PRÓXIMO</span>';

            const clickAction = t.status === 'active'
                ? `onclick = "app.closeClubModal(); app.enterTournamentContext();"`
                : `onclick = "alert('Este torneo no está activo actualmente.')"`;

            return `
            <div style = "background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: all 0.2s;" ${clickAction} onmouseover = "this.style.borderColor='var(--primary)';" onmouseout = "this.style.borderColor='var(--border)';" >
                <div style="background: linear-gradient(135deg, #334155, #1e293b); min-width: 50px; height: 50px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <span style="font-size: 0.65rem; color: var(--primary); text-transform: uppercase; font-weight: 600;">${month}</span>
                    <span style="font-size: 1.2rem; font-weight: bold; color: white; line-height: 1;">${day}</span>
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="font-weight: 600;">${t.name}</span>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                        <ion-icon name="trophy-outline" style="vertical-align: text-bottom;"></ion-icon> Categoría ${t.cat}
                    </div>
                </div>
                <ion-icon name="chevron-forward-outline" style="color: var(--text-muted);"></ion-icon>
            </div> `;
        }).join('') : '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay torneos registrados para esta institución.</p>';

        // Create and show modal
        const modal = document.createElement('div');
        modal.id = 'club-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1rem;';
        modal.innerHTML = `
            <div style = "background: var(--bg-card); border: 1px solid var(--border); border-radius: 1rem; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;" >
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid var(--border);">
                    <h2 style="font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="business-outline" style="color: var(--primary);"></ion-icon>
                        ${clubName}
                    </h2>
                    <button id="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 0.5rem;">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>
                <div style="padding: 1.5rem;">
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">Torneos de esta institución:</p>
                    ${tournamentsHTML}
                </div>
            </div>
            `;
        document.body.appendChild(modal);

        // Add event listeners after modal is in DOM
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeClubModal();
        });

        const closeBtn = document.getElementById('modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeClubModal());
        }
    }

    closeClubModal() {
        const modal = document.getElementById('club-modal');
        if (modal) modal.remove();
    }

    joinTeam(teamId) {
        if (this.tournament.registrationDeadline) {
            const deadline = new Date(this.tournament.registrationDeadline);
            if (new Date() > deadline) return alert('Fecha límite caducada.');
        }
        if (!confirm('¿Unirte a este equipo?')) return;
        try {
            this.tournament.joinDoublesTeam(teamId, this.currentUser.name);
            alert('Te has unido al equipo.');
            this.renderView();
        } catch (e) { alert(e.message); }
    }

    getSetupHTML() {
        return `
            <div style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;" >
                    <button class="cta-btn secondary" onclick="app.navigateTo('tournament-dashboard')" style="background: transparent; border: none; color: var(--text-muted); padding-left: 0;">
                        <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel del Torneo
                    </button>
                    <button class="cta-btn secondary" onclick="app.startNewTournament()" style="background: transparent; border: 1px solid var(--accent); color: var(--accent);">
                        <ion-icon name="add-circle-outline"></ion-icon> Nuevo Torneo
                    </button>
                </div>
            <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border);">

                <!-- Basic Info -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Nombre del Torneo</label>
                        <input type="text" id="t-name" class="form-input" placeholder="Ej. Torneo Verano 2025" value="${this.tournament.name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha de Inicio</label>
                        <input type="date" id="t-startDate" class="form-input" value="${this.tournament.startDate || ''}">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Tipo de Juego</label>
                        <select id="t-type" class="form-select">
                            <option value="singles" ${this.tournament.type === 'singles' ? 'selected' : ''}>Singles (Individual)</option>
                            <option value="doubles" ${this.tournament.type === 'doubles' ? 'selected' : ''}>Dobles (Parejas)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoría</label>
                        <select id="t-cat" class="form-select">
                            <option value="OPEN" ${this.tournament.category === 'OPEN' ? 'selected' : ''}>Open (Todas)</option>
                            <option value="A" ${this.tournament.category === 'A' ? 'selected' : ''}>Categoría A</option>
                            <option value="B" ${this.tournament.category === 'B' ? 'selected' : ''}>Categoría B</option>
                            <option value="C" ${this.tournament.category === 'C' ? 'selected' : ''}>Categoría C</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Género</label>
                        <select id="t-gender" class="form-select">
                            <option value="mixto" ${(this.tournament.gender || 'mixto') === 'mixto' ? 'selected' : ''}>Mixto</option>
                            <option value="masculino" ${this.tournament.gender === 'masculino' ? 'selected' : ''}>Masculino</option>
                            <option value="femenino" ${this.tournament.gender === 'femenino' ? 'selected' : ''}>Femenino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Duración Estimada</label>
                        <select id="t-duration" class="form-select" onchange="document.getElementById('t-duration-custom').style.display = this.value === 'Otro' ? 'block' : 'none'">
                            <option value="1 Sem" ${this.tournament.duration === '1 Sem' ? 'selected' : ''}>1 Semana</option>
                            <option value="2 Sem" ${this.tournament.duration === '2 Sem' ? 'selected' : ''}>2 Semanas</option>
                            <option value="1 Mes" ${this.tournament.duration === '1 Mes' ? 'selected' : ''}>1 Mes</option>
                            <option value="2 Mes" ${this.tournament.duration === '2 Mes' ? 'selected' : ''}>2 Meses</option>
                            <option value="Weekend" ${this.tournament.duration === 'Weekend' ? 'selected' : ''}>Fin de Semana Express</option>
                            <option value="Otro" ${this.tournament.duration && !['1 Sem', '2 Sem', '1 Mes', '2 Mes', 'Weekend'].includes(this.tournament.duration) ? 'selected' : ''}>Otro (Ingresar a mano)</option>
                        </select>
                        <input type="text" id="t-duration-custom" class="form-input" style="margin-top:0.5rem; display: ${this.tournament.duration && !['1 Sem', '2 Sem', '1 Mes', '2 Mes', 'Weekend'].includes(this.tournament.duration) ? 'block' : 'none'};" placeholder="Especifique duración (ej. 3 meses)" value="${this.tournament.duration && !['1 Sem', '2 Sem', '1 Mes', '2 Mes', 'Weekend'].includes(this.tournament.duration) ? this.tournament.duration : ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Fecha Límite de Inscripción</label>
                    <input type="datetime-local" id="t-deadline" class="form-input" style="max-width:300px;" value="${this.tournament.registrationDeadline || ''}">
                        <small style="color:var(--text-muted);">Los jugadores no podrán inscribirse después de esta fecha.</small>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label" id="price-label">Precio de Inscripción ($) ${this.tournament.type === 'doubles' ? '<span style="color: var(--accent);">(por pareja)</span>' : ''}</label>
                        <input type="number" id="t-price" class="form-input" min="0" step="0.01" placeholder="0" value="${this.tournament.registrationPrice || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="display:flex; align-items:center; gap:0.5rem;">
                            <ion-icon name="link-outline"></ion-icon> Link de Pago (Mercado Pago)
                        </label>
                        <input type="url" id="t-paymentLink" class="form-input" placeholder="https://mpago.la/..." value="${this.tournament.paymentLink || ''}">
                        <small style="color:var(--text-muted);">Si se deja vacío, la inscripción será gratuita o manual.</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Institución Sede</label>
                        <select id="t-institution" class="form-select" ${this.currentUser && this.currentUser.role === 'admin' ? 'disabled' : ''}>
                            ${this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution ?
                `<option value="${this.currentUser.institution}" selected>${this.currentUser.institution}</option>` :
                `<option value="">-- Seleccionar --</option>
                                ${(auth.institutions || []).map(i => `<option value="${i.name}" ${this.tournament.institution === i.name ? 'selected' : ''}>${i.name}</option>`).join('')}`
            }
                        </select>
                        ${this.currentUser && this.currentUser.role === 'admin' ? '<small style="color:var(--text-muted);">Solo puedes crear torneos para tu institución.</small>' : ''}
                    </div>
                </div>

                <!-- Rules Toggle -->
                <div style="margin: 1.5rem 0; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden;">
                    <div style="background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="document.getElementById('rules-config').style.display = document.getElementById('rules-config').style.display === 'none' ? 'block' : 'none'">
                        <span style="font-weight: 600; color: var(--accent);"><ion-icon name="settings-outline" style="vertical-align: middle; margin-right: 0.5rem;"></ion-icon> Configuración de Reglas y Formato</span>
                        <ion-icon name="chevron-down-outline"></ion-icon>
                    </div>
                    <div id="rules-config" style="display: none; padding: 1rem; background: var(--bg-card);">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Formato de Partido</label>
                                <select id="r-matchFormat" class="form-select">
                                    <option value="bo3" ${this.tournament.rules?.matchFormat === 'bo3' ? 'selected' : ''}>Mejor de 3 Sets</option>
                                    <option value="bo5" ${this.tournament.rules?.matchFormat === 'bo5' ? 'selected' : ''}>Mejor de 5 Sets</option>
                                    <option value="proset" ${this.tournament.rules?.matchFormat === 'proset' ? 'selected' : ''}>Pro Set (A 9 juegos)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Definición 3er Set</label>
                                <select id="r-tiebreakType" class="form-select">
                                    <option value="super" ${this.tournament.rules?.tiebreakType === 'super' ? 'selected' : ''}>Super Tie-Break (10 pts)</option>
                                    <option value="normal" ${this.tournament.rules?.tiebreakType === 'normal' ? 'selected' : ''}>Tie-Break Normal (7 pts)</option>
                                    <option value="long" ${this.tournament.rules?.tiebreakType === 'long' ? 'selected' : ''}>Ventaja (Diferencia de 2 games)</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="checkbox" id="r-goldenPoint" style="width: 18px; height: 18px;" ${this.tournament.rules?.goldenPoint ? 'checked' : ''}>
                                <label for="r-goldenPoint" style="cursor: pointer;">Activar Punto de Oro (Sin Ventaja en 40-40)</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Observaciones Generales</label>
                    <textarea id="t-obs" class="form-input" rows="3" placeholder="Información adicional, premios, sede, etc.">${this.tournament.observations || ''}</textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                    <button class="cta-btn" id="btn-save-setup">
                        <ion-icon name="save-outline"></ion-icon> Guardar Configuración del Torneo
                    </button>
                </div>

            </div>

            <!-- SECCIÓN PARTICIPANTES - Separada de configuración del torneo -->
            <div class="card" style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); margin-top: 1.5rem;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <ion-icon name="people-outline"></ion-icon> Participantes
                            </h3>
                            <p style="color: var(--text-muted); margin: 0.5rem 0 0 0; font-size: 0.9rem;">Selecciona jugadores de la lista. Solo se muestran jugadores de categoría válida.</p>
                        </div>
                        <span style="background: var(--primary); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem;">${this.tournament.players?.length || 0} inscritos</span>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; border: 1px dashed var(--border);">
                        <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                            <div style="flex: 2; position: relative;">
                                <label class="form-label">Buscar Jugador</label>
                                <input type="text" id="p-search" class="form-input" placeholder="Escribe para buscar..." autocomplete="off">
                                <input type="hidden" id="p-selected-id">
                                <input type="hidden" id="p-selected-name">
                                <input type="hidden" id="p-selected-category">
                                <div id="p-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 0.5rem; z-index: 100; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                                    <!-- Opciones dinámicas -->
                                </div>
                            </div>
                            </div>
                            <!-- Category Select for Manual/Guest Players -->
                             <select id="p-manual-cat" class="form-select" style="max-width: 80px; margin-right: 0.5rem; padding: 0.5rem;">
                                <option value="A">Cat A</option>
                                <option value="B">Cat B</option>
                                <option value="C" selected>Cat C</option>
                            </select>

                            <button class="cta-btn secondary" id="btn-add-player" style="background: var(--bg-sidebar); border: 1px solid var(--primary); color: var(--primary);">
                                <ion-icon name="add-outline"></ion-icon> Agregar
                            </button>
                        </div>
                        <p id="p-category-hint" style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;"></p>
                    </div>


                    <div id="players-list" style="margin-bottom: 0; max-height: 300px; overflow-y: auto;">
                        ${this.getPlayersListHTML()}
                    </div>

            </div>
        `;
    }

    getPlayersListHTML() {
        if (this.tournament.players.length === 0) return '<p class="text-muted" style="text-align: center; padding: 1rem;">No hay jugadores agregados.</p>';

        return `
            <table style = "width: 100%; border-collapse: collapse;" >
                <thead>
                    <tr style="text-align: left; color: var(--text-muted); font-size: 0.85rem; border-bottom: 1px solid var(--border);">
                        <th style="padding: 0.5rem;">#</th>
                        <th style="padding: 0.5rem;">Nombre</th>
                        <th style="padding: 0.5rem;">Cat</th>
                        <th style="padding: 0.5rem; text-align: right;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.tournament.players.map((p, i) => `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 0.5rem;">${i + 1}</td>
                            <td style="padding: 0.5rem;">${p.name}</td>
                            <td style="padding: 0.5rem;"><span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${p.category}</span></td>
                            <td style="padding: 0.5rem; text-align: right;">
                                <button class="cta-btn" style="background: transparent; color: #ef4444; padding: 0.25rem;" onclick="app.removePlayer(${i})">
                                    <ion-icon name="trash-outline"></ion-icon>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table >
            `;
    }

    // Helper called inline
    removePlayer(index) {
        this.tournament.players.splice(index, 1);
        // Re-render list only
        document.getElementById('players-list').innerHTML = this.getPlayersListHTML();
    }

    startNewTournament() {
        // Reset tournament object and navigate to setup
        this.tournament = new Tournament();
        this.navigateTo('setup');
    }

    async createTournament() {
        try {
            console.log('Creating tournament...', this.tournament);

            // Lookup Institution ID
            let instId = null;
            if (this.tournament.institution) {
                const inst = (auth.institutions || []).find(i => i.name === this.tournament.institution);
                if (inst) instId = inst.id;
            }

            // Create in DB
            const newT = await db.tournaments.create({
                name: this.tournament.name,
                start_date: this.tournament.startDate,
                type: this.tournament.type,
                category: this.tournament.category,
                tournament_gender: this.tournament.gender || 'mixto',
                duration: this.tournament.duration,
                registration_deadline: this.tournament.registrationDeadline,
                duration: this.tournament.duration,
                registration_deadline: this.tournament.registrationDeadline,
                registration_price: this.tournament.registrationPrice,
                payment_link: this.tournament.paymentLink,
                institution_id: instId,
                observations: this.tournament.observations,
                rules: this.tournament.rules,
                status: 'active',
                created_by: auth.currentUser ? auth.currentUser.id : null
            });

            // If institution selected by name, we need to map it. 
            // But simpler: just accept it might verify later. 
            // Actually, the UI select value should be ID if possible.
            // But currently it is Name. 
            // Logic update: t-institution select should use ID as value.

            // Audit Log
            if (window.db?.logs) {
                await db.logs.create(auth.currentUser?.id, 'create_tournament', {
                    tournament_id: newT.id,
                    name: newT.name
                });
            }

            this.tournament.id = newT.id;
            alert('Torneo creado y guardado en la nube!');
            this.navigateTo('groups');
        } catch (e) {
            console.error(e);
            alert('Error al guardar torneo: ' + e.message);
        }
    }

    async updateTournament() {
        if (!this.tournament.id) return this.createTournament();
        try {
            await db.tournaments.update(this.tournament.id, {
                name: this.tournament.name,
                start_date: this.tournament.startDate,
                type: this.tournament.type,
                category: this.tournament.category,
                tournament_gender: this.tournament.gender || 'mixto',
                duration: this.tournament.duration,
                registration_deadline: this.tournament.registrationDeadline,
                registration_price: this.tournament.registrationPrice,
                payment_link: this.tournament.paymentLink,
                observations: this.tournament.observations,
                rules: this.tournament.rules
            });
            alert('Torneo actualizado');
            this.navigateTo('groups');
        } catch (e) {
            alert('Error al actualizar: ' + e.message);
        }
    }

    async bindSetupEvents() {
        // Init logic
        const nameInput = document.getElementById('t-name');
        const typeInput = document.getElementById('t-type');
        const catInput = document.getElementById('t-cat');

        if (!nameInput) return; // Guard clause

        // Sync basic inputs to memory on change to allow validation context
        [nameInput, typeInput, catInput].forEach(el => {
            el.addEventListener('change', () => {
                this.tournament.name = nameInput.value;
                this.tournament.type = typeInput.value;
                this.tournament.category = catInput.value;

                // Update price label for doubles
                const priceLabel = document.getElementById('price-label');
                if (priceLabel) {
                    priceLabel.innerHTML = `Precio de Inscripción($) ${typeInput.value === 'doubles' ? '<span style="color: var(--accent);">(por pareja)</span>' : ''} `;
                }
            });
        });

        // ========== PLAYER SEARCH DROPDOWN LOGIC ==========
        const searchInput = document.getElementById('p-search');
        const dropdown = document.getElementById('p-dropdown');
        const selectedIdInput = document.getElementById('p-selected-id');
        const selectedNameInput = document.getElementById('p-selected-name');
        const selectedCategoryInput = document.getElementById('p-selected-category');
        const categoryHint = document.getElementById('p-category-hint');

        // Load all players from DB
        let allPlayers = [];
        try {
            allPlayers = await db.users.getByRole('player');
            console.log('Loaded players for dropdown:', allPlayers.length);
        } catch (e) {
            console.error('Error loading players:', e);
        }

        // Category filter logic: A→Solo A, B→B y C, C→Solo C, OPEN→Todos
        // Also excludes players already enrolled in the current tournament
        const getFilteredPlayers = (searchTerm, tournamentCategory) => {
            // Get IDs of already enrolled players
            const enrolledPlayerIds = (this.tournament.players || []).map(p => p.id).filter(Boolean);
            const enrolledPlayerNames = (this.tournament.players || []).map(p => p.name?.toLowerCase()).filter(Boolean);

            return allPlayers.filter(player => {
                // Exclude already enrolled players (by ID or name)
                const playerFullName = `${player.name || ''} ${player.lastname || ''}`.trim().toLowerCase();
                if (enrolledPlayerIds.includes(player.id)) return false;
                if (enrolledPlayerNames.some(n => playerFullName.includes(n) || n.includes(playerFullName))) return false;

                const playerCat = player.category || 'C';
                let validCategory = false;

                switch (tournamentCategory) {
                    case 'A':
                        validCategory = playerCat === 'A';
                        break;
                    case 'B':
                        validCategory = playerCat === 'B' || playerCat === 'C';
                        break;
                    case 'C':
                        validCategory = playerCat === 'C';
                        break;
                    case 'OPEN':
                    default:
                        validCategory = true;
                        break;
                }

                const fullName = `${player.name || ''} ${player.lastname || ''}`.trim().toLowerCase();
                const matchesSearch = !searchTerm || fullName.includes(searchTerm.toLowerCase());

                return validCategory && matchesSearch;
            });
        };

        // Render dropdown options
        const renderDropdown = (players) => {
            if (players.length === 0) {
                dropdown.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No se encontraron jugadores</div>';
            } else {
                dropdown.innerHTML = players.map(p => `
                    <div class="player-option" 
                         data-id="${p.id}" 
                         data-name="${p.name} ${p.lastname || ''}" 
                         data-category="${p.category || 'C'}"
                         style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;"
                         onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
                         onmouseout="this.style.background='transparent'">
                        <span>${p.name} ${p.lastname || ''}</span>
                        <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Cat. ${p.category || 'C'}</span>
                    </div>
                `).join('');
            }
            dropdown.style.display = 'block';
        };

        // Search input event
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value;
                const tournamentCat = document.getElementById('t-cat')?.value || 'OPEN';
                const filtered = getFilteredPlayers(term, tournamentCat);
                renderDropdown(filtered);

                // Show category hint
                const catMessages = {
                    'A': 'Torneo Cat. A: Solo se muestran jugadores de categoría A',
                    'B': 'Torneo Cat. B: Se muestran jugadores de categoría B y C',
                    'C': 'Torneo Cat. C: Solo se muestran jugadores de categoría C',
                    'OPEN': 'Torneo OPEN: Se muestran todos los jugadores'
                };
                if (categoryHint) categoryHint.textContent = catMessages[tournamentCat] || '';

                // Clear selection if typing
                selectedIdInput.value = '';
                selectedNameInput.value = '';
                selectedCategoryInput.value = '';
            });

            searchInput.addEventListener('focus', () => {
                const tournamentCat = document.getElementById('t-cat')?.value || 'OPEN';
                const filtered = getFilteredPlayers(searchInput.value, tournamentCat);
                renderDropdown(filtered);
            });

            // Click outside to close
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });

            // Player selection
            dropdown.addEventListener('click', (e) => {
                const option = e.target.closest('.player-option');
                if (option) {
                    const id = option.dataset.id;
                    const name = option.dataset.name;
                    const category = option.dataset.category;

                    searchInput.value = name;
                    selectedIdInput.value = id;
                    selectedNameInput.value = name;
                    selectedCategoryInput.value = category;

                    // Update visible category select
                    const catSelect = document.getElementById('p-manual-cat');
                    if (catSelect) catSelect.value = category || 'C';

                    dropdown.style.display = 'none';
                }
            });
        }

        // Add Player button
        document.getElementById('btn-add-player').addEventListener('click', async () => {
            if (!this.tournament.id) return alert('Primero guarda la configuración básica del torneo.');

            let pId = selectedIdInput.value;
            let pName = selectedNameInput.value;
            let pCat = selectedCategoryInput.value;

            // Fallback for manual entry
            if (!pName) {
                pName = searchInput.value.trim();
                if (pName) {
                    pId = null; // Manual entry has no ID
                    pCat = document.getElementById('p-manual-cat').value;
                }
            } else {
                // Ensure enrolled category matches the visible selector if user changed it
                const visibleCat = document.getElementById('p-manual-cat').value;
                if (visibleCat) pCat = visibleCat;
            }

            if (!pName) return alert('Selecciona un jugador de la lista o escribe un nombre');

            try {
                await db.players.enroll(this.tournament.id, pId || null, pName, pCat);

                // Refresh local
                this.tournament.addPlayer(pName, pCat);

                // Clear inputs
                searchInput.value = '';
                selectedIdInput.value = '';
                selectedNameInput.value = '';
                selectedCategoryInput.value = '';

                document.getElementById('players-list').innerHTML = this.getPlayersListHTML();
            } catch (e) {
                alert(e.message);
            }
        });

        // Save All
        document.getElementById('btn-save-setup').addEventListener('click', () => {
            const name = document.getElementById('t-name').value;
            if (!name) return alert('El nombre es obligatorio');

            // Sync to object
            this.tournament.name = name;
            this.tournament.type = document.getElementById('t-type').value;
            this.tournament.category = document.getElementById('t-cat').value;
            this.tournament.gender = document.getElementById('t-gender').value;
            this.tournament.startDate = document.getElementById('t-startDate').value;
            this.tournament.duration = (document.getElementById('t-duration').value === 'Otro') ? document.getElementById('t-duration-custom').value : document.getElementById('t-duration').value;
            this.tournament.registrationDeadline = document.getElementById('t-deadline').value;
            this.tournament.registrationPrice = parseFloat(document.getElementById('t-price').value) || 0;
            this.tournament.paymentLink = document.getElementById('t-paymentLink').value;
            // For admins, always use their institution (dropdown is disabled)
            this.tournament.institution = (this.currentUser && this.currentUser.role === 'admin' && this.currentUser.institution)
                ? this.currentUser.institution
                : document.getElementById('t-institution').value;
            this.tournament.observations = document.getElementById('t-obs').value;
            this.tournament.rules = {
                matchFormat: document.getElementById('r-matchFormat').value,
                tiebreakType: document.getElementById('r-tiebreakType').value,
                goldenPoint: document.getElementById('r-goldenPoint').checked
            };

            this.updateTournament();
        });
    }

    getGroupsHTML() {
        if (!this.tournament.name) return '<p class="text-muted">Primero configura el torneo.</p>';

        // Ensure standings are up to date
        this.tournament.updateStandings();

        const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'superadmin');

        // Hide admin buttons if tournament is finished
        const status = (this.tournament.status || '').toLowerCase().trim();
        const isFinished = status === 'finished';

        let html = `
            <button class="cta-btn secondary" onclick = "app.navigateTo('tournament-dashboard')" style = "background: transparent; border: none; color: var(--text-muted); padding-left: 0; margin-bottom: 1rem;" >
                <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel del Torneo
                </button>
                ${isAdmin && !isFinished ? `
                <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                    <button class="cta-btn" id="btn-gen-groups">Generar Zonas Automáticamente</button>
                    <button class="cta-btn secondary" id="btn-reset-groups" style="background: var(--bg-card); border: 1px solid var(--border);">Resetear</button>
                </div>` : ''}
                <div class="groups-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">`;

        this.tournament.groups.forEach((group, index) => {
            html += `
            <div class="group-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
                <h3 style="margin-bottom: 1rem; color: var(--primary); display: flex; justify-content: space-between;">
                    Zona ${index + 1}
                </h3>
                <div class="table-responsive">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-muted);">
                                <th style="padding: 0.5rem;">Jugador</th>
                                <th style="padding: 0.5rem; text-align: center;">Pts</th>
                                <th style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">SG</th>
                                <th style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">SP</th>
                                <th style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">GG</th>
                                <th style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">GP</th>
                                <th style="padding: 0.5rem; text-align: center;">Dif S</th>
                                <th style="padding: 0.5rem; text-align: center;">Dif G</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.players.map(p => `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <td style="padding: 0.75rem 0.5rem; font-weight: 500;">${p.name}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; font-weight: bold; color: var(--accent);">${p.points}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">${p.setsWon}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">${p.setsLost}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">${p.gamesWon}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">${p.gamesLost}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center;">${p.diffSets > 0 ? '+' + p.diffSets : p.diffSets}</td>
                                    <td style="padding: 0.75rem 0.5rem; text-align: center;">${p.diffGames > 0 ? '+' + p.diffGames : p.diffGames}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Partidos de la Zona -->
                <div style="margin-top:1rem; padding-top:1rem; border-top:1px dashed var(--border);">
                    <h4 style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">Partidos de la Zona</h4>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        ${this.tournament.matches
                    .filter(m => m.groupNumber === index + 1)
                    .map(m => {
                        let statusBadge = '<span style="font-size: 0.75rem; background: rgba(56,189,248,0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px;">Pendiente</span>';
                        let btnTxt = 'Coordinar';
                        let btnStyle = 'background:transparent; border:1px solid var(--primary); color:var(--primary);';

                        if (m.scheduling_status === 'confirmed') {
                            let dateStr = 'Confirmado';
                            if (m.scheduled_at) {
                                const d = new Date(m.scheduled_at);
                                const date = d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
                                const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
                                dateStr = `${date} ${time}`;
                            }
                            statusBadge = `<span style="font-size: 0.75rem; background: rgba(34,197,94,0.1); color: #22c55e; padding: 2px 6px; border-radius: 4px;">${dateStr}</span>`;
                            btnTxt = 'Ver';
                            btnStyle = 'background:transparent; border:1px solid var(--text-muted); color:var(--text-muted);';
                        } else if (m.scheduling_status === 'proposed') {
                            statusBadge = '<span style="font-size: 0.75rem; background: rgba(245,158,11,0.1); color: #f59e0b; padding: 2px 6px; border-radius: 4px;">Propuesta</span>';
                            btnTxt = 'Responder';
                            btnStyle = 'background: #f59e0b; color: white; border: none;';
                        }

                        const isMyMatch = (this.currentUser && (m.p1?.id === this.currentUser.id || m.p2?.id === this.currentUser.id));
                        const highlightStyle = isMyMatch ? 'border-left: 3px solid var(--accent); background: rgba(255,255,255,0.03);' : '';

                        // Players only see Coordinar button for their own matches
                        // Admins and coordinators can see all
                        const isAdmin = this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'coordinator');
                        const canCoordinate = isAdmin || isMyMatch;

                        return `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem; ${highlightStyle}">
                                     <div style="font-size:0.85rem;">
                                        <div style="font-weight:500; color:var(--text-main);">${m.p1.name} vs ${m.p2.name}</div>
                                        ${m.isPlayed ?
                                `<div style="font-size:0.75rem; color:var(--text-muted);">Finalizado: ${m.sets.map(s => {
                                    let txt = `${s.p1}-${s.p2}`;
                                    if (s.tbPoints) {
                                        txt += ` <span style="font-size:0.85em;">(${s.tbPoints.p1}-${s.tbPoints.p2})</span>`;
                                    }
                                    return txt;
                                }).join(' ')}</div>` :
                                `<div style="margin-top:0.2rem;">${statusBadge}</div>`
                            }
                                     </div>
                                     ${!m.isPlayed && canCoordinate ?
                                `<button onclick="app.openSchedulingModal('${m.id}')" class="cta-btn" style="font-size:0.75rem; padding:0.3rem 0.6rem; min-width:auto; ${btnStyle}">${btnTxt}</button>` :
                                ''
                            }
                                </div>
                                `;
                    }).join('') || '<div class="text-muted" style="font-size:0.8rem;">No hay partidos asignados.</div>'
                }
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;

        // Add Legend for Table Columns
        html += `
            <div style="margin-top: 1rem; padding: 1rem;border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                <span><strong>Pts:</strong> Puntos</span>
                <span style="color: var(--border);">|</span>
                <span><strong>SG:</strong> Sets Ganados</span>
                <span><strong>SP:</strong> Sets Perdidos</span>
                <span style="color: var(--border);">|</span>
                <span><strong>GG:</strong> Games Ganados</span>
                <span><strong>GP:</strong> Games Perdidos</span>
                <span style="color: var(--border);">|</span>
                <span><strong>Dif S:</strong> Diferencia de Sets</span>
                <span><strong>Dif G:</strong> Diferencia de Games</span>
            </div>
        `;

        // ========== PLAYOFF SECTION ==========
        const allMatchesComplete = this.tournament.areAllGroupMatchesComplete();
        const totalGroupMatches = this.tournament.matches.filter(m => !m.isPlayoff).length;
        const playedGroupMatches = this.tournament.matches.filter(m => !m.isPlayoff && m.isPlayed).length;
        const numGroups = this.tournament.groups.length;

        html += `
            <div style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="trophy-outline"></ion-icon> Playoffs
                    </h2>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">
                        Fase de grupos: ${playedGroupMatches}/${totalGroupMatches} partidos jugados
                    </span>
                </div>
        `;

        // Get qualified players from completed groups
        this.tournament.updateStandings();
        const qualifiedSlots = [];

        this.tournament.groups.forEach((group, groupIndex) => {
            const isComplete = this.tournament.isGroupComplete(groupIndex);
            const sorted = [...group.players].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;
                return b.diffGames - a.diffGames;
            });

            // 1st place
            qualifiedSlots.push({
                position: 1,
                group: groupIndex + 1,
                player: isComplete && sorted[0] ? sorted[0] : null,
                isComplete: isComplete
            });
            // 2nd place
            qualifiedSlots.push({
                position: 2,
                group: groupIndex + 1,
                player: isComplete && sorted[1] ? sorted[1] : null,
                isComplete: isComplete
            });
        });

        // Show qualified/pending slots
        html += `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="color: var(--accent); margin-bottom: 1rem;">🏅 Clasificados por Zona</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${qualifiedSlots.map(q => {
            if (q.isComplete && q.player) {
                return `
                                <span style="background: ${q.position === 1 ? 'rgba(34,197,94,0.2)' : 'rgba(56,189,248,0.2)'}; 
                                             color: ${q.position === 1 ? '#22c55e' : 'var(--accent)'}; 
                                             padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.9rem;">
                                    ${q.position}° Zona ${q.group}: ${q.player.name}
                                </span>
                            `;
            } else {
                return `
                                <span style="background: rgba(255,255,255,0.05); color: var(--text-muted); 
                                             padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.9rem; 
                                             border: 1px dashed var(--border);">
                                    ${q.position}° Zona ${q.group}: <em>Por definir</em>
                                </span>
                            `;
            }
        }).join('')}
                </div>
            </div>
        `;

        // ========== DYNAMIC BRACKET GENERATION ==========
        // Calculate total qualified and determine number of rounds needed
        const totalQualified = numGroups * 2; // 2 per group

        // Get round names based on size
        const getRoundNames = (numPlayers) => {
            const roundNames = [];
            let remaining = numPlayers;
            while (remaining > 1) {
                if (remaining > 8) roundNames.push('Octavos de Final');
                else if (remaining > 4) roundNames.push('Cuartos de Final');
                else if (remaining > 2) roundNames.push('Semifinal');
                else roundNames.push('Final');
                remaining = Math.ceil(remaining / 2);
            }
            return roundNames;
        };

        const roundNames = getRoundNames(totalQualified);
        const numRounds = roundNames.length;

        // Build all rounds
        const allRounds = [];

        // First round - match qualifiers
        const firstRoundMatches = [];
        if (numGroups >= 2) {
            // Standard bracket pairing: 1° Zona 1 vs 2° Zona N, 1° Zona 2 vs 2° Zona N-1, etc.
            for (let i = 0; i < numGroups; i++) {
                const opponent = numGroups - 1 - i;
                if (i <= opponent) {
                    // Match 1: 1° Zona (i+1) vs 2° Zona (opponent+1)
                    const p1Slot = qualifiedSlots.find(q => q.group === i + 1 && q.position === 1);
                    const p2Slot = qualifiedSlots.find(q => q.group === opponent + 1 && q.position === 2);
                    firstRoundMatches.push({
                        p1: p1Slot?.player,
                        p1Label: `1° Zona ${i + 1}`,
                        p2: p2Slot?.player,
                        p2Label: `2° Zona ${opponent + 1}`,
                        winner: null
                    });

                    // Match 2: 1° Zona (opponent+1) vs 2° Zona (i+1) - only if not same group
                    if (i !== opponent) {
                        const p3Slot = qualifiedSlots.find(q => q.group === opponent + 1 && q.position === 1);
                        const p4Slot = qualifiedSlots.find(q => q.group === i + 1 && q.position === 2);
                        firstRoundMatches.push({
                            p1: p3Slot?.player,
                            p1Label: `1° Zona ${opponent + 1}`,
                            p2: p4Slot?.player,
                            p2Label: `2° Zona ${i + 1}`,
                            winner: null
                        });
                    }
                }
            }
        }
        allRounds.push({ name: roundNames[0] || 'Primera Ronda', matches: firstRoundMatches });

        // Generate placeholder rounds for remaining
        let matchesInRound = Math.ceil(firstRoundMatches.length / 2);
        for (let r = 1; r < numRounds; r++) {
            const roundMatches = [];
            for (let m = 0; m < matchesInRound; m++) {
                roundMatches.push({
                    p1: null,
                    p1Label: `Ganador ${r > 1 ? roundNames[r - 1] : 'Partido'} ${m * 2 + 1}`,
                    p2: null,
                    p2Label: `Ganador ${r > 1 ? roundNames[r - 1] : 'Partido'} ${m * 2 + 2}`,
                    winner: null
                });
            }
            allRounds.push({ name: roundNames[r], matches: roundMatches });
            matchesInRound = Math.ceil(matchesInRound / 2);
        }

        // Render all rounds
        html += `<div style="display: flex; gap: 2rem; overflow-x: auto; padding-bottom: 1rem;">`;

        allRounds.forEach((round, roundIndex) => {
            const isFirstRound = roundIndex === 0;
            const verticalGap = Math.pow(2, roundIndex) * 1; // Exponential spacing

            html += `
                <div style="min-width: 280px; flex-shrink: 0;">
                    <h4 style="color: var(--primary); margin-bottom: 1rem; text-align: center;">
                        ${round.name}
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: ${verticalGap}rem; justify-content: space-around; min-height: ${allRounds[0].matches.length * 5}rem;">
            `;

            round.matches.forEach((match, matchIndex) => {
                const p1Name = match.p1?.name || match.p1Label;
                const p2Name = match.p2?.name || match.p2Label;
                const p1Ready = !!match.p1;
                const p2Ready = !!match.p2;
                const p1Style = p1Ready ? '' : 'color: var(--text-muted); font-style: italic;';
                const p2Style = p2Ready ? '' : 'color: var(--text-muted); font-style: italic;';

                html += `
                    <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden;">
                        <div style="padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                            <span style="${p1Style}">${p1Name}</span>
                            ${p1Ready ? '<ion-icon name="checkmark-circle" style="color: #22c55e; font-size: 1rem;"></ion-icon>' : '<ion-icon name="time-outline" style="color: var(--text-muted); font-size: 1rem;"></ion-icon>'}
                        </div>
                        <div style="padding: 0.6rem 0.8rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
                            <span style="${p2Style}">${p2Name}</span>
                            ${p2Ready ? '<ion-icon name="checkmark-circle" style="color: #22c55e; font-size: 1rem;"></ion-icon>' : '<ion-icon name="time-outline" style="color: var(--text-muted); font-size: 1rem;"></ion-icon>'}
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        html += `</div>`;

        html += `</div>`;
        return html;
    }

    bindGroupsEvents() {
        const btnGen = document.getElementById('btn-gen-groups');
        if (btnGen) {
            btnGen.addEventListener('click', async () => {
                // Check if groups already exist with data
                const hasExistingGroups = this.tournament.groups &&
                    this.tournament.groups.length > 0 &&
                    this.tournament.groups.some(g => g.players && g.players.length > 0);

                // Helper function to generate groups (reloads players first)
                const doGenerateGroups = async () => {
                    try {
                        // Reload players from DB to ensure they're current
                        if (this.tournament.id) {
                            const dbPlayers = await db.players.getByTournament(this.tournament.id);
                            console.log('Players from tournament_players table:', dbPlayers.length);

                            // If existing groups have more players than DB, extract from groups
                            let existingGroupPlayers = [];
                            if (this.tournament.groups && this.tournament.groups.length > 0) {
                                this.tournament.groups.forEach(g => {
                                    if (g.players) {
                                        existingGroupPlayers = existingGroupPlayers.concat(g.players);
                                    }
                                });
                            }
                            console.log('Players from existing groups:', existingGroupPlayers.length);

                            // Use whichever source has more players
                            if (existingGroupPlayers.length > dbPlayers.length) {
                                console.log('Using players from existing groups');
                                this.tournament.players = existingGroupPlayers.map(p => ({
                                    ...p,
                                    matchesPlayed: 0, matchesWon: 0, setsWon: 0, setsLost: 0,
                                    gamesWon: 0, gamesLost: 0, points: 0, diffSets: 0, diffGames: 0
                                }));
                            } else {
                                console.log('Using players from tournament_players table');
                                this.tournament.players = dbPlayers.map(p => ({
                                    id: p.player_id,
                                    name: p.player_name,
                                    category: p.category,
                                    members: [p.player_name],
                                    isComplete: true,
                                    matchesPlayed: 0, matchesWon: 0, setsWon: 0, setsLost: 0,
                                    gamesWon: 0, gamesLost: 0, points: 0, diffSets: 0, diffGames: 0
                                }));
                            }
                        }

                        console.log('Total players for group generation:', this.tournament.players.length);
                        this.tournament.generateGroups();

                        // Save groups and matches to database
                        if (this.tournament.id) {
                            console.log('Saving groups to database...');
                            await db.tournaments.update(this.tournament.id, {
                                groups: this.tournament.groups,
                                bracket: this.tournament.bracket || []
                            });

                            // Save matches to database
                            if (this.tournament.matches.length > 0) {
                                console.log('Saving matches to database...', this.tournament.matches.length);
                                // Delete old matches for this tournament first
                                await db.matches.deleteByTournament(this.tournament.id);

                                // Create new matches
                                const matchesToSave = this.tournament.matches.map((m, idx) => ({
                                    tournament_id: this.tournament.id,
                                    player1_id: m.p1?.id || null,
                                    player2_id: m.p2?.id || null,
                                    player1_name: m.p1?.name || 'TBD',
                                    player2_name: m.p2?.name || 'TBD',
                                    round: m.roundName || 'Grupos',
                                    group_number: m.groupNumber || null,
                                    score: m.sets || [],
                                    winner_id: m.winner?.id || null
                                }));
                                const savedMatches = await db.matches.createMany(matchesToSave);

                                // Update local matches with database IDs
                                if (savedMatches && savedMatches.length === matchesToSave.length) {
                                    this.tournament.matches.forEach((m, i) => {
                                        m.id = savedMatches[i].id;
                                    });
                                }
                            }
                            console.log('Groups and matches saved to database');
                        }

                        this.renderView();
                    } catch (e) {
                        console.error('Error generating groups:', e);
                        alert(e.message);
                    }
                };

                if (hasExistingGroups) {
                    this.showPasswordVerificationModal(
                        '⚠️ Reiniciar Grupos',
                        'Ya existen grupos armados. Se reiniciarán todos los grupos y los resultados de partidos asociados.',
                        doGenerateGroups
                    );
                } else {
                    await doGenerateGroups();
                }
            });
        }
    }

    // Password verification modal for destructive actions
    showPasswordVerificationModal(title, message, onSuccess) {
        // Create modal HTML
        const modalHTML = `
            <div id="password-verify-modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; width: 90%; max-width: 400px; border: 1px solid var(--border);">
                    <h3 style="margin-bottom: 1rem; color: #f59e0b; display: flex; align-items: center; gap: 0.5rem;">
                        <ion-icon name="warning-outline"></ion-icon> ${title}
                    </h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${message}</p>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label class="form-label">Ingresa tu contraseña para confirmar:</label>
                        <input type="password" id="verify-password" class="form-input" placeholder="Contraseña" autocomplete="current-password">
                        <p id="password-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem; display: none;"></p>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button class="cta-btn secondary" id="btn-cancel-verify" style="background: transparent; border: 1px solid var(--border);">Cancelar</button>
                        <button class="cta-btn" id="btn-confirm-verify" style="background: #f59e0b;">
                            <ion-icon name="checkmark-outline"></ion-icon> Confirmar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('password-verify-modal');
        const passwordInput = document.getElementById('verify-password');
        const errorMsg = document.getElementById('password-error');
        const cancelBtn = document.getElementById('btn-cancel-verify');
        const confirmBtn = document.getElementById('btn-confirm-verify');

        // Focus password input
        setTimeout(() => passwordInput.focus(), 100);

        // Cancel handler
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Enter key handler
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmBtn.click();
        });

        // Confirm handler - verify password with Supabase
        confirmBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            if (!password) {
                errorMsg.textContent = 'Ingresa tu contraseña';
                errorMsg.style.display = 'block';
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Verificando...';

            try {
                // Re-authenticate with Supabase
                const { error } = await supabase.auth.signInWithPassword({
                    email: this.currentUser.email,
                    password: password
                });

                if (error) {
                    errorMsg.textContent = 'Contraseña incorrecta';
                    errorMsg.style.display = 'block';
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Confirmar';
                    return;
                }

                // Password verified - close modal and execute callback
                modal.remove();
                onSuccess();

            } catch (err) {
                errorMsg.textContent = 'Error de verificación: ' + err.message;
                errorMsg.style.display = 'block';
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Confirmar';
            }
        });
    }

    getMatchesHTML() {
        const backBtn = `<button class="cta-btn secondary" onclick = "app.navigateTo('tournament-dashboard')" style = "background: transparent; border: none; color: var(--text-muted); padding-left: 0; margin-bottom: 1rem;" >
            <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel del Torneo
        </button> `;

        if (!this.tournament.name) return backBtn + '<p class="text-muted">Primero configura el torneo.</p>';
        if (this.tournament.matches.length === 0) return backBtn + '<p class="text-muted">No hay partidos generados. Ve a "Grupos" y genera las zonas.</p>';

        let html = `
            <button class="cta-btn secondary" onclick = "app.navigateTo('tournament-dashboard')" style = "background: transparent; border: none; color: var(--text-muted); padding-left: 0; margin-bottom: 1rem;" >
                <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel del Torneo
            </button>
            <div style="max-width: 800px; margin: 0 auto;"> `;

        // Modal Container (Hidden by default)
        html += `
                <div id="score-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center;">
                    <div style="background: var(--bg-card); padding: 2rem; border-radius: 1rem; width: 90%; max-width: 500px; border: 1px solid var(--border);">
                        <h3 id="modal-title" style="margin-bottom: 1.5rem; text-align: center;">Resultados</h3>
                        <div id="modal-sets-container">
                            <!-- Sets injected here -->
                        </div>
                        <!-- 3rd Set / Super Tie Break toggle logic handled in JS -->

                        <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: space-between; flex-wrap: wrap;">
                            <button id="btn-match-not-played" class="cta-btn secondary" onclick="app.matchNotPlayed()" style="background: transparent; border: 1px solid #f59e0b; color: #f59e0b; display: none;">
                                <ion-icon name="close-circle-outline" style="margin-right: 4px;"></ion-icon>No se jugó
                            </button>
                            <div style="display: flex; gap: 1rem;">
                                <button class="cta-btn secondary" onclick="app.closeScoreModal()" style="background: transparent; border: 1px solid var(--border);">Cancelar</button>
                                <button class="cta-btn" id="btn-save-score">Guardar Partido</button>
                            </div>
                        </div>

                    </div>
                </div> `;

        this.tournament.groups.forEach((group, gIndex) => {
            if (group.matches.length > 0) {
                html += `<h3 style = "margin: 2rem 0 1rem 0; color: var(--primary);"> Zona ${gIndex + 1}</h3> `;
                group.matches.forEach((match, mIndex) => {
                    let scoreDisplay = match.isPlayed ? match.sets.map(s => {
                        let txt = `${s.p1}-${s.p2}`;
                        if (s.tbPoints) {
                            txt += ` <span style="font-size:0.7em; color:var(--text-muted);">(${s.tbPoints.p1}-${s.tbPoints.p2})</span>`;
                        }
                        return txt;
                    }).join(' ') : 'Sin jugar';

                    html += `
                <div class="match-card" style="background: var(--bg-card); padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="${match.winner === match.p1 ? 'color: var(--accent); font-weight: bold;' : ''}">${match.p1.name}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="${match.winner === match.p2 ? 'color: var(--accent); font-weight: bold;' : ''}">${match.p2.name}</span>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 120px;">

                        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem;">${scoreDisplay}</div>
                        <div style="font-size: 0.7rem; color: red;">${match.roundName} / ${match.isPlayoff}</div>
                        <button class="cta-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem;" onclick="app.openScoreModal(${gIndex}, ${mIndex})">
                            ${match.isPlayed ? 'Editar' : 'Cargar'}
                        </button>
                    </div>
                </div>
                `;
                });
            }
        });

        html += `</div> 
        
        <div style="margin-top: 2rem; text-align: center;">
             <button class="cta-btn safe-btn" onclick="app.fillGroupStage()" style="background:var(--bg-card); border:1px solid var(--accent); color:var(--accent);">🎲 Simular Fase de Grupos (Test)</button>
        </div>`;
        return html;
    }

    async fillGroupStage() {
        if (!confirm("¿Estás seguro? Esto generará resultados aleatorios para todos los partidos de grupo pendientes y los guardará en la base de datos.")) return;

        let count = 0;
        const updates = [];

        // Iterate all groups
        for (let gIndex = 0; gIndex < this.tournament.groups.length; gIndex++) {
            const group = this.tournament.groups[gIndex];
            for (let mIndex = 0; mIndex < group.matches.length; mIndex++) {
                const match = group.matches[mIndex];
                if (!match.isPlayed) {
                    // Random Score winner
                    // 6-4 6-4 or similar
                    const r = Math.random();
                    const score = r > 0.5 ? "6-4 6-4" : "4-6 4-6";

                    match.setScore(score);

                    // Prepare DB update
                    if (this.tournament.id && match.id && !match.id.toString().startsWith('temp')) {
                        updates.push(db.matches.update(match.id, {
                            score: match.sets,
                            winner_id: match.winner.id,
                            played_at: new Date().toISOString()
                        }));
                    }
                    count++;
                }
            }
        }

        if (count > 0) {
            this.showToast(`Simulando ${count} partidos...`, 'info');
            try {
                await Promise.all(updates);
                this.showToast('Partidos simulados correctamente', 'success');
                this.tournament.updateStandings();
                this.renderView();
            } catch (e) {
                console.error(e);
                this.showToast('Error simulando partidos', 'error');
            }
        } else {
            alert("No hay partidos de grupo pendientes por simular.");
        }
    }

    async openScoreModal(groupIndex, matchIndex) {
        const match = this.tournament.groups[groupIndex].matches[matchIndex];
        const modal = document.getElementById('score-modal');
        const container = document.getElementById('modal-sets-container');
        document.getElementById('modal-title').textContent = `${match.p1.name} vs ${match.p2.name} `;

        // Prepare rows for 3 sets
        // If match played, pre-fill. Else empty.
        // We render 3 rows.
        // Logic: Input Score P1, Score P2.
        // If 6-6 or similar, show TB inputs.

        let html = '';
        for (let i = 1; i <= 3; i++) {
            const set = match.sets[i - 1] || { p1: '', p2: '' };
            const isSTB = (i === 3);
            const label = isSTB ? 'Set 3 (Super Tie-break)' : `Set ${i} `;

            html += `
            <div class="set-row" data - set="${i}" style = "margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #334155;" >
                <label style="display: block; margin-bottom: 0.5rem; color: var(--primary); font-size: 0.9rem;">${label}</label>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="flex: 1; text-align: center;">
                        <span style="font-size: 0.8rem; display: block; margin-bottom: 2px;">${match.p1.name}</span>
                        <input type="number" class="form-input p1-score" value="${set.p1}" min="0" max="20" style="text-align: center;">
                    </div>
                    <span style="font-weight: bold;">-</span>
                    <div style="flex: 1; text-align: center;">
                        <span style="font-size: 0.8rem; display: block; margin-bottom: 2px;">${match.p2.name}</span>
                        <input type="number" class="form-input p2-score" value="${set.p2}" min="0" max="20" style="text-align: center;">
                    </div>
                </div>
                <!--Tie Break Container(Hidden unless needed logic could be added, but for now simple inputs if needed ? No, user requested specific menu)-->
                <!--Let's add optional TB inputs always visible but small? Or strict logic? -->
            <!--User said: "Si llega a tiebreak tiene que aparecer un menu". -->
                <!--I'll add a "Tie-Break" button/inputs that appear if scores are 6-6 -->

            <div class="tb-area" style = "margin-top: 0.5rem; display: none; background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 4px;" >
                    <label style="font-size: 0.8rem; color: var(--accent);">Tie-Break Puntos:</label>
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <input type="number" class="form-input tb-p1" placeholder="P1" style="width: 50px; padding: 4px; text-align: center;">
                        <span>-</span>
                        <input type="number" class="form-input tb-p2" placeholder="P2" style="width: 50px; padding: 4px; text-align: center;">
                    </div>
                </div>
            </div> `;
        }

        container.innerHTML = html;
        modal.style.display = 'flex';

        // Add listeners to Inputs to toggle TB visibility
        container.querySelectorAll('.set-row').forEach(row => {
            const i1 = row.querySelector('.p1-score');
            const i2 = row.querySelector('.p2-score');
            const tbArea = row.querySelector('.tb-area');

            const checkTB = () => {
                const v1 = parseInt(i1.value);
                const v2 = parseInt(i2.value);
                // Standard TB: 6-6.
                // STB (Set 3): Always play points? Or matches are best of 3 sets.
                // Set 3 is STB (10 pts). So Set 3 inputs ARE points.
                if (row.dataset.set === '3') {
                    // It's STB. Inputs are the points. No sub-TB.
                } else {
                    if (v1 === 6 && v2 === 6) {
                        tbArea.style.display = 'block';
                    } else {
                        tbArea.style.display = 'none';
                    }
                }
            };
            i1.addEventListener('input', checkTB);
            i2.addEventListener('input', checkTB);
            // Run once
            checkTB();
        });

        this._currentMatchContext = { g: groupIndex, m: matchIndex, dbMatchId: null };

        // Bind Save
        const saveBtn = document.getElementById('btn-save-score');
        saveBtn.onclick = () => this.saveScoreFromModal();

        // Show "No se jugó" button for admin/professor if match has scheduling
        const notPlayedBtn = document.getElementById('btn-match-not-played');
        if (notPlayedBtn && this.currentUser &&
            (this.currentUser.role === 'admin' || this.currentUser.role === 'superadmin' || this.currentUser.role === 'professor')) {

            // Search for this match in the database by player names and tournament
            // Using RPC function to bypass RLS
            try {
                const dbMatches = await db.matches.getByTournamentWithScheduling(this.tournament.id);
                console.log('Matches from RPC:', dbMatches?.length, dbMatches);

                const dbMatch = dbMatches?.find(m =>
                    (m.player1_name === match.p1.name && m.player2_name === match.p2.name) ||
                    (m.player1_name === match.p2.name && m.player2_name === match.p1.name)
                );

                console.log('Found DB match:', dbMatch);

                if (dbMatch && dbMatch.scheduling_status === 'confirmed') {
                    this._currentMatchContext.dbMatchId = dbMatch.id;
                    notPlayedBtn.style.display = 'inline-flex';
                    notPlayedBtn.style.alignItems = 'center';
                } else {
                    notPlayedBtn.style.display = 'none';
                }
            } catch (err) {
                console.error('Error checking DB match:', err);
                notPlayedBtn.style.display = 'none';
            }


        } else {
            if (notPlayedBtn) notPlayedBtn.style.display = 'none';
        }
    }


    closeScoreModal() {
        const modal = document.getElementById('score-modal');
        if (modal) modal.style.display = 'none';
    }

    async matchNotPlayed() {
        console.log('matchNotPlayed called', this._currentMatchContext);
        const { g, m, dbMatchId } = this._currentMatchContext;

        if (!dbMatchId) {
            alert('Este partido no tiene una reserva asociada.');
            return;
        }

        // Close modal first
        this.closeScoreModal();

        try {
            console.log('Resetting match scheduling for:', dbMatchId);
            await db.matches.resetScheduling(dbMatchId);

            alert('✓ El partido fue marcado como "No se jugó".\n\nLos jugadores pueden ahora coordinar una nueva fecha.');

            this.selectTournament(this.tournament.id);
        } catch (err) {
            console.error('Error al marcar el partido:', err);
            alert('Error al marcar el partido: ' + err.message);
        }
    }



    saveScoreFromModal() {
        const { g, m } = this._currentMatchContext;
        const container = document.getElementById('modal-sets-container');
        const rows = container.querySelectorAll('.set-row');

        let sets = [];
        let valid = true;

        rows.forEach(row => {
            const p1Val = row.querySelector('.p1-score').value;
            const p2Val = row.querySelector('.p2-score').value;

            if (p1Val === '' && p2Val === '') return; // Skip empty sets
            if (p1Val === '' || p2Val === '') {
                // Partial entry?
                // Allow user to clear set matching.
                return;
            }

            let s1 = parseInt(p1Val);
            let s2 = parseInt(p2Val);

            // Check Tie Break
            const tbArea = row.querySelector('.tb-area');
            let tbPoints = null;

            if (tbArea.style.display === 'block') {
                const tb1 = parseInt(row.querySelector('.tb-p1').value || 0);
                const tb2 = parseInt(row.querySelector('.tb-p2').value || 0);

                // Store TB points
                tbPoints = { p1: tb1, p2: tb2 };

                // Determine set winner based on TB (if not already handled by input validation)
                if (tb1 > tb2) s1 = 7;
                else s2 = 7;
            }

            sets.push({ p1: s1, p2: s2, tbPoints: tbPoints });
        });

        if (sets.length === 0) return alert("Ingresa al menos un set");

        const match = this.tournament.groups[g].matches[m];
        match.sets = sets;
        match.isPlayed = true;

        // Recalc Winner
        let p1Sets = 0;
        let p2Sets = 0;
        sets.forEach(s => {
            if (s.p1 > s.p2) p1Sets++;
            else if (s.p2 > s.p1) p2Sets++;
        });
        if (p1Sets > p2Sets) match.winner = match.p1;
        else if (p2Sets > p1Sets) match.winner = match.p2;
        else match.winner = null; // Should not happen in completed match

        // Playoff Advancement Logic
        if (match.isPlayoff && match.winner) {
            const nextMatchRef = this.tournament.getNextMatchRef(match);
            const updates = this.tournament.getAdvanceUpdates(match);

            if (nextMatchRef && updates) {
                console.log(`Advancing ${updates.player_name} to next match ${nextMatchRef.id} pos ${nextMatchRef.pos}`);

                // Update Local State (find next match object)
                // We need to search in all rounds
                let nextMatchObj = null;
                for (const round of this.tournament.bracket) {
                    const found = round.find(m => m.id === nextMatchRef.id || (m._tempId && m._tempId === nextMatchRef.id)); // match might have tempId if not reloaded
                    if (found) {
                        nextMatchObj = found;
                        break;
                    }
                }

                if (nextMatchObj) {
                    if (updates.targetField === 'player1') {
                        nextMatchObj.p1 = { id: updates.player_id, name: updates.player_name };
                        nextMatchObj.p1Label = updates.player_name; // Update label if it was "Winner Match X"
                    } else {
                        nextMatchObj.p2 = { id: updates.player_id, name: updates.player_name };
                        nextMatchObj.p2Label = updates.player_name;
                    }
                }

                // Update Database asynchronously
                if (nextMatchRef.id && !nextMatchRef.id.startsWith('temp-')) {
                    const dbUpdateData = {};
                    dbUpdateData[updates.targetField + '_id'] = updates.player_id;
                    dbUpdateData[updates.targetField + '_name'] = updates.player_name;
                    // Fire and forget (or await if critical safety needed, but rendering checks local state)
                    db.matches.update(nextMatchRef.id, dbUpdateData).then(() => console.log('Next match updated in DB'));
                }
            }
        }

        this.tournament.updateStandings();

        // Save to DB
        if (this.tournament.id && match.id) {
            const scoreData = {
                score: sets,
                winner_id: match.winner ? match.winner.id : null,
                played_at: new Date().toISOString()
            };
            db.matches.update(match.id, scoreData).then(() => {
                this.showToast('Resultado guardado', 'success');
            }).catch(e => {
                console.error('Error saving match:', e);
                this.showToast('Error al guardar', 'error');
            });
        }

        this.closeScoreModal();
        this.renderView();
    }

    bindBracketsEvents() {
        // Generate Bracket Button
        const btnGen = document.getElementById('btn-gen-bracket');
        if (btnGen) {
            btnGen.addEventListener('click', async () => {
                if (!confirm('¿Generar llave de playoffs? Se tomarán los clasificados de los grupos actuales.')) return;

                try {
                    this.showLoading(document.body, 'Generando llave...');

                    // 1. Generate in Memory
                    this.tournament.generateBracket();

                    // 2. Save to DB (Reverse Order logic handled here)
                    if (this.tournament.id) {
                        // Delete existing playoff matches?
                        // Ideally yes, to reset.
                        // For now, let's assume clean slate or append.
                        // Safer: Delete all matches with stage='playoff' for this tournament.
                        // But we don't have that helper exposed easily. 
                        // Let's assume user knows what they are doing on "Generate".

                        // We need to save from Last Round (Final) to First Round (to get IDs for next_match_id)
                        // this.tournament.bracket is [Round1, Round2, ... Final]
                        // Reverse it
                        const rounds = [...this.tournament.bracket].reverse();

                        // Map to store temporary IDs to Real DB IDs
                        const idMap = new Map(); // 'temp-X-Y' -> UUID

                        for (const round of rounds) {
                            // Save matches in this round
                            const matchesToSave = round.map(m => {
                                // Resolve next_match_id
                                let validNextId = null;
                                if (m._nextMatchTempId) {
                                    validNextId = idMap.get(m._nextMatchTempId);
                                    m.next_match_id = validNextId;
                                }

                                return {
                                    tournament_id: this.tournament.id,
                                    player1_id: m.p1?.id || null,
                                    player2_id: m.p2?.id || null,
                                    player1_name: m.p1?.name || (m.p1Label || 'TBD'), // Use label if TBD
                                    player2_name: m.p2?.name || (m.p2Label || 'TBD'),
                                    stage: 'playoff',
                                    round: m.roundName,
                                    bracket_pos: m.packet_pos, // 0 or 1 relative to parent
                                    next_match_id: validNextId,
                                    is_played: false
                                };
                            });

                            const saved = await db.matches.createMany(matchesToSave);

                            // Update idMap
                            if (saved && saved.length === round.length) {
                                round.forEach((m, idx) => {
                                    m.id = saved[idx].id;
                                    if (m._tempId) idMap.set(m._tempId, saved[idx].id);
                                });
                            }
                        }

                        // Save structure to Tournament (just in case, though we rely on matches table)
                        await db.tournaments.update(this.tournament.id, { bracket: [] }); // Clear legacy JSON if any

                        this.showToast('Llave generada y guardada', 'success');
                    }

                    this.renderView();

                } catch (e) {
                    console.error(e);
                    alert('Error al generar llave: ' + e.message);
                } finally {
                    this.hideLoading();
                }
            });
        }
    }

    bindMatchesEvents() {
        // No special global binds needed as we use inline onclick for specific items 
        // calling app.saveMatch (assuming app is global)
    }

    renderBracketsView() {
        const container = document.getElementById('view-container');
        container.innerHTML = this.getBracketsHTML();
        this.bindBracketsEvents();
    }

    getBracketsHTML(embedded = false) {
        if (!this.tournament.name) return '<p class="text-muted">Primero configura el torneo.</p>';

        let html = '';

        if (!embedded) {
            html += `
            <button class="cta-btn secondary" onclick="app.navigateTo('tournament-dashboard')" style="background: transparent; border: none; color: var(--text-muted); padding-left: 0; margin-bottom: 1rem;">
                <ion-icon name="arrow-back-outline"></ion-icon> Volver al Panel del Torneo
            </button>
            `;
        }

        if (this.tournament.bracket.length === 0) {
            if (embedded) return ''; // Don't show empty state in history if no bracket
            html += `
            <div class="welcome-card">
                <h3>Fase Final</h3>
                <p>Una vez finalizados los partidos de grupos, genera la llave final.</p>
                <button class="cta-btn" id="btn-gen-bracket">Generar Llaves (Playoff)</button>
             </div>
            `;
        } else {
            // Render Bracket in Horizontal Columns
            html += `
            <div class="bracket-wrapper" style="overflow-x: auto; padding: 2rem 0; margin-top: 1rem;">
                <div class="bracket-container" style="display: flex; gap: 3rem; min-width: max-content; padding-bottom: 1rem;">
            `;

            this.tournament.bracket.forEach((round, rIndex) => {
                const roundName = round[0]?.roundName || `Ronda ${rIndex + 1}`;

                // Gap logic for the "tree" effect
                // Matches in Round 2 should be double the height/gap of Round 1
                const baseGap = 2; // rem
                const multiplier = Math.pow(2, rIndex);
                const currentGap = baseGap * multiplier;
                const topPadding = (multiplier - 1) * 3; // Shift rounds down to align

                html += `
                <div class="bracket-round" style="display: flex; flex-direction: column; width: 320px;">
                    <h3 style="margin-bottom: 2rem; color: var(--accent); text-align: center; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">${roundName}</h3>
                    <div style="display: flex; flex-direction: column; gap: ${currentGap}rem; padding-top: ${topPadding}rem;">
                `;

                round.forEach((match, mIndex) => {
                    const isWinnerP1 = match.winner && match.winner.id === match.p1?.id;
                    const isWinnerP2 = match.winner && match.winner.id === match.p2?.id;

                    html += `
                    <div class="match-card" style="background: var(--bg-card); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); position: relative; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        
                        <!-- Player 1 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                            <span style="font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; ${isWinnerP1 ? 'color: var(--accent); font-weight: bold;' : ''}">
                                ${match.p1?.name || 'Por definir'}
                            </span>
                            ${match.isPlayed ? `<div style="display: flex; gap: 4px; font-weight: bold;">${match.sets.map(s => `<span style="width:16px; text-align:center;">${s.p1}</span>`).join('')}</div>` : ''}
                        </div>

                        <!-- Player 2 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px;">
                            <span style="font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; ${isWinnerP2 ? 'color: var(--accent); font-weight: bold;' : ''}">
                                ${match.p2?.name || 'Por definir'}
                            </span>
                            ${match.isPlayed ? `<div style="display: flex; gap: 4px; font-weight: bold;">${match.sets.map(s => `<span style="width:16px; text-align:center;">${s.p2}</span>`).join('')}</div>` : ''}
                        </div>

                        <!-- Input Grid (Only if not fixed yet or for admins) -->
                        <div style="background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 0.4rem; margin-top: 4px; ${embedded ? 'display:none;' : ''}">
                            <div style="display: flex; gap: 4px; justify-content: center; font-size: 0.6rem; color: var(--text-muted); margin-bottom: 2px;">
                                <span style="width: 32px; text-align: center;">S1</span>
                                <span style="width: 32px; text-align: center;">S2</span>
                                <span style="width: 32px; text-align: center;">S3</span>
                            </div>
                            <div style="display: flex; gap: 4px; flex-direction: column;">
                                <div style="display: flex; gap: 4px; justify-content: center;">
                                    <input type="number" class="form-input bracket-cell bracket-p1-s1" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                    <input type="number" class="form-input bracket-cell bracket-p1-s2" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                    <input type="number" class="form-input bracket-cell bracket-p1-s3" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                </div>
                                <div style="display: flex; gap: 4px; justify-content: center;">
                                    <input type="number" class="form-input bracket-cell bracket-p2-s1" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                    <input type="number" class="form-input bracket-cell bracket-p2-s2" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                    <input type="number" class="form-input bracket-cell bracket-p2-s3" data-round="${rIndex}" data-match="${mIndex}" min="0" max="25" placeholder="0" style="width: 32px; padding: 2px; text-align: center; height: 24px; font-size: 0.8rem;">
                                </div>
                            </div>

                            <!-- WO Section -->
                            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 6px; font-size: 0.65rem;">
                                <label style="display: flex; align-items: center; gap: 2px; white-space: nowrap; cursor: pointer;">
                                    <input type="checkbox" class="bracket-wo bracket-wo-p1" data-round="${rIndex}" data-match="${mIndex}" onchange="app.handleWOChange(this, ${rIndex}, ${mIndex}, 'p1')"> WO ${match.p1?.name ? match.p1.name.split(' ')[0] : 'P1'}
                                </label>
                                <label style="display: flex; align-items: center; gap: 2px; white-space: nowrap; cursor: pointer;">
                                    <input type="checkbox" class="bracket-wo bracket-wo-p2" data-round="${rIndex}" data-match="${mIndex}" onchange="app.handleWOChange(this, ${rIndex}, ${mIndex}, 'p2')"> WO ${match.p2?.name ? match.p2.name.split(' ')[0] : 'P2'}
                                </label>
                            </div>

                            <button class="cta-btn safe-btn" style="padding: 0.25rem; font-size: 0.75rem; margin-top: 8px; width: 100%; height: 28px;" onclick="app.savePlayoffMatch(${rIndex}, ${mIndex})">Guardar</button>
                        </div>
                    </div>
                    `;
                });

                html += `
                    </div>
                </div>
                `;
            });

            html += `
                </div>
            </div>
            `;
        }

        return html;
    }

    bindBracketsEvents() { // Note: renderView switch case must call this!
        const btn = document.getElementById('btn-gen-bracket');
        if (btn) {
            btn.addEventListener('click', () => {
                try {
                    this.tournament.generateBracket();
                    this.renderView();
                } catch (e) {
                    alert(e.message);
                }
            });
        }
    }

    savePlayoffMatch(roundIndex, matchIndex) {
        // Collect inputs
        const p1s1 = document.querySelector(`.bracket-p1-s1[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;
        const p1s2 = document.querySelector(`.bracket-p1-s2[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;
        const p1s3 = document.querySelector(`.bracket-p1-s3[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;

        const p2s1 = document.querySelector(`.bracket-p2-s1[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;
        const p2s2 = document.querySelector(`.bracket-p2-s2[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;
        const p2s3 = document.querySelector(`.bracket-p2-s3[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.value;

        const setsToAdd = [];

        // Helper to parse
        const addSet = (s1, s2) => {
            if (s1 !== '' && s2 !== '') {
                setsToAdd.push({ p1: parseInt(s1), p2: parseInt(s2) });
            }
        };

        addSet(p1s1, p2s1);
        addSet(p1s2, p2s2);
        addSet(p1s3, p2s3);

        const match = this.tournament.bracket[roundIndex][matchIndex];

        // CHECK WALKOVER
        const p1WO = document.querySelector(`.bracket-wo-p1[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.checked;
        const p2WO = document.querySelector(`.bracket-wo-p2[data-round="${roundIndex}"][data-match="${matchIndex}"]`)?.checked;

        if (p1WO) {
            // P1 did WO -> P2 Wins
            match.setWalkover(match.p2);
        } else if (p2WO) {
            // P2 did WO -> P1 Wins
            match.setWalkover(match.p1);
        } else {
            // Normal Scoring
            if (setsToAdd.length === 0) return alert('Ingresa al menos un set completo o selecciona WO.');

            try {
                match.setScoreFromSets(setsToAdd);
            } catch (e) {
                return alert(e.message);
            }
        }

        if (!match.winner) {
            return alert("El resultado ingresado no es válido (no determina un ganador). Verifica los sets completados.");
        }

        // Playoff Advancement Logic (Duplicate of saveScoreFromModal logic - could be refactored)
        if (match.isPlayoff && match.winner) {
            const nextMatchRef = this.tournament.getNextMatchRef(match);
            const updates = this.tournament.getAdvanceUpdates(match);

            if (nextMatchRef && updates) {
                console.log(`Advancing ${updates.player_name} to next match ${nextMatchRef.id} pos ${nextMatchRef.pos}`);

                // Update Local State
                let nextMatchObj = null;
                for (const round of this.tournament.bracket) {
                    const found = round.find(m => m.id === nextMatchRef.id || (m._tempId && m._tempId === nextMatchRef.id));
                    if (found) {
                        nextMatchObj = found;
                        break;
                    }
                }

                if (nextMatchObj) {
                    if (updates.targetField === 'player1') {
                        nextMatchObj.p1 = { id: updates.player_id, name: updates.player_name };
                        nextMatchObj.p1Label = updates.player_name;
                    } else {
                        nextMatchObj.p2 = { id: updates.player_id, name: updates.player_name };
                        nextMatchObj.p2Label = updates.player_name;
                    }
                }

                // Update Database asynchronously
                if (nextMatchRef.id && !nextMatchRef.id.startsWith('temp-')) {
                    const dbUpdateData = {};
                    dbUpdateData[updates.targetField + '_id'] = updates.player_id;
                    dbUpdateData[updates.targetField + '_name'] = updates.player_name;
                    db.matches.update(nextMatchRef.id, dbUpdateData).then(() => console.log('Next match updated in DB'));
                }
            }
        }

        // Save to DB
        if (this.tournament.id && match.id) {
            const scoreData = {
                score: match.sets, // matches structure from setScore or setWalkover
                winner_id: match.winner ? match.winner.id : null,
                is_played: true
            };
            // optimistic UI update
            this.showToast('Resultado guardado', 'success');

            db.matches.update(match.id, scoreData).catch(e => {
                console.error('Error saving match:', e);
                this.showToast('Error al conectar con BD', 'error');
            });
        }

        this.renderView();
    }

    handleWOChange(checkbox, roundIndex, matchIndex, player) {
        // If checked, uncheck the other one
        if (checkbox.checked) {
            const otherPlayer = player === 'p1' ? 'p2' : 'p1';
            const otherCheckbox = document.querySelector(`.bracket-wo-${otherPlayer}[data-round="${roundIndex}"][data-match="${matchIndex}"]`);
            if (otherCheckbox) otherCheckbox.checked = false;
        }
    }

    // ==================== USERS VIEW ====================
    getUsersHTML() {
        const users = auth.users || [];
        const institutions = auth.institutions || [];

        return `
            <!--Top Controls-->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); padding: 1rem; border-radius: 0.5rem; flex: 1; margin-right: 1rem;">
                    <h3 style="margin-bottom: 0.5rem; color: #60a5fa;"><ion-icon name="information-circle-outline"></ion-icon> Gestión de Usuarios</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        Aquí puedes ver y crear nuevos usuarios del sistema.
                    </p>
                </div>
                <button onclick="app.openCreateUserModal()" class="cta-btn" style="height: fit-content; white-space: nowrap;">
                    <ion-icon name="person-add-outline" style="margin-right:0.5rem;"></ion-icon> Crear Usuario
                </button>
            </div>

            <!--PROFESSORS TABLE-->
            <div style="margin-bottom:2rem;">
                <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #60a5fa;">
                    <ion-icon name="school-outline"></ion-icon> Profesores/Organizadores
                    <span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${users.filter(u => u.role === 'admin').length}</span>
                </h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: rgba(59,130,246,0.05); border-radius: 0.5rem; overflow: hidden; border: 1px solid rgba(59,130,246,0.2);">
                        <thead>
                            <tr style="background: rgba(59,130,246,0.15); text-align: left;">
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #60a5fa;">Nombre</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #60a5fa;">Email</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #60a5fa;">Institución</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #60a5fa; text-align: center; width: 80px;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.filter(u => u.role === 'admin').length === 0 ? '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay profesores registrados</td></tr>' : ''}
                            ${users.map(u => u.role === 'admin' ? `
                                <tr style="border-bottom: 1px solid rgba(59,130,246,0.1);">
                                    <td style="padding: 0.75rem 1rem; font-weight: 500;">${u.name} ${u.lastname || ''}</td>
                                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${u.email}</td>
                                    <td style="padding: 0.75rem 1rem;"><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.6rem; border-radius: 0.25rem;">${u.institution || '-'}</span></td>
                                    <td style="padding: 0.75rem 1rem; text-align: center;">
                                        <button style="color: #60a5fa; background: rgba(59,130,246,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem; margin-right: 0.5rem;" onclick="app.editUser('${u.id}')"><ion-icon name="create-outline"></ion-icon></button>
                                        <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem;" onclick="app.deleteUser('${u.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                                    </td>
                                </tr>` : '').join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!--PLAYERS TABLE-->
            <div>
                <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #4ade80;">
                    <ion-icon name="person-outline"></ion-icon> Jugadores
                    <span style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${users.filter(u => u.role === 'player').length}</span>
                </h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: rgba(34,197,94,0.05); border-radius: 0.5rem; overflow: hidden; border: 1px solid rgba(34,197,94,0.2);">
                        <thead>
                            <tr style="background: rgba(34,197,94,0.15); text-align: left;">
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Nombre</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Email</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80;">Categoría</th>
                                <th style="padding: 0.75rem 1rem; font-weight: 600; color: #4ade80; text-align: center; width: 80px;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.filter(u => u.role === 'player').length === 0 ? '<tr><td colspan="4" style="padding: 1rem; text-align: center; color: var(--text-muted);">No hay jugadores registrados</td></tr>' : ''}
                            ${users.map(u => u.role === 'player' ? `
                                <tr style="border-bottom: 1px solid rgba(34,197,94,0.1);">
                                    <td style="padding: 0.75rem 1rem; font-weight: 500;">${u.name} ${u.lastname || ''}</td>
                                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${u.email}</td>
                                    <td style="padding: 0.75rem 1rem;"><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.6rem; border-radius: 0.25rem;">${u.category || '-'}</span></td>
                                    <td style="padding: 0.75rem 1rem; text-align: center;">
                                        <button style="color: #60a5fa; background: rgba(59,130,246,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem; margin-right: 0.5rem;" onclick="app.editUser('${u.id}')"><ion-icon name="create-outline"></ion-icon></button>
                                        <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.4rem; border-radius: 0.4rem;" onclick="app.deleteUser('${u.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                                    </td>
                                </tr>` : '').join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!--CREATE USER MODAL HTML-->
            <div id="create-user-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; justify-content:center; align-items:center;">
                <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; width:90%; max-width:500px; border:1px solid var(--border); box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                    <h3 style="margin-bottom:1.5rem; color:var(--primary); display:flex; align-items:center; gap:0.5rem;">
                        <ion-icon name="person-add-outline"></ion-icon> Nuevo Usuario
                    </h3>

                    <form onsubmit="app.submitCreateUser(event)">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div><label class="form-label">Nombre *</label><input type="text" class="form-input" id="new-user-name" required></div>
                            <div><label class="form-label">Apellido</label><input type="text" class="form-input" id="new-user-lastname"></div>
                        </div>

                        <div style="margin-bottom:1rem;">
                            <label class="form-label">Email * <small style="color:var(--text-muted);">(Único)</small></label>
                            <input type="email" class="form-input" id="new-user-email" required>
                        </div>

                        <div style="margin-bottom:1rem;">
                            <label class="form-label">Documento/DNI * <small style="color:var(--text-muted);">(Único)</small></label>
                            <input type="text" class="form-input" id="new-user-doc" required placeholder="DNI o Pasaporte">
                        </div>

                        <!-- Password Fields -->
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="form-label">Contraseña *</label>
                                <div style="position:relative;">
                                    <input type="password" class="form-input" id="new-user-pass" required minlength="6" placeholder="Mín 6 car.">
                                        <ion-icon name="eye-outline" onclick="const i=document.getElementById('new-user-pass'); i.type=i.type==='password'?'text':'password'; this.name=i.type==='password'?'eye-outline':'eye-off-outline';" style="position:absolute; right:10px; top:10px; cursor:pointer; color:var(--text-muted);"></ion-icon>
                                </div>
                            </div>
                            <div>
                                <label class="form-label">Confirmar Pass *</label>
                                <div style="position:relative;">
                                    <input type="password" class="form-input" id="new-user-pass-confirm" required minlength="6" placeholder="Repetir">
                                        <ion-icon name="eye-outline" onclick="const i=document.getElementById('new-user-pass-confirm'); i.type=i.type==='password'?'text':'password'; this.name=i.type==='password'?'eye-outline':'eye-off-outline';" style="position:absolute; right:10px; top:10px; cursor:pointer; color:var(--text-muted);"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <label class="form-label">Rol</label>
                                <select class="form-input" id="new-user-role" onchange="document.getElementById('new-user-cat-group').style.display = this.value === 'player' ? 'block' : 'none';">
                                    <option value="player">Jugador</option>
                                    <option value="admin">Organizador/Profesor</option>
                                </select>
                            </div>
                            <div id="new-user-cat-group">
                                <label class="form-label">Categoría</label>
                                <select class="form-input" id="new-user-cat">
                                    <option value="">Selecciona...</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                            </div>
                            <div id="new-user-gender-group">
                                <label class="form-label">Género</label>
                                <select class="form-input" id="new-user-gender">
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                </select>
                            </div>
                        </div>

                        <div id="new-user-inst-group" style="margin-bottom:1rem;">
                            <label class="form-label">Institución *</label>
                            <select class="form-input" id="new-user-inst" required>
                                <option value="">Selecciona Institución...</option>
                                ${institutions.map(i => `<option value="${i.name}">${i.name}</option>`).join('')}
                            </select>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
                            <button type="button" class="cta-btn secondary" style="background:transparent; border:1px solid var(--text-muted); color:var(--text-muted);" onclick="document.getElementById('create-user-modal').style.display='none'">Cancelar</button>
                            <button type="submit" class="cta-btn">Crear Usuario</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    openCreateUserModal() {
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('new-user-name').focus();
        }
    }

    async submitCreateUser(e) {
        e.preventDefault();

        const pass = document.getElementById('new-user-pass').value;
        const passConfirm = document.getElementById('new-user-pass-confirm').value;

        if (pass !== passConfirm) {
            return alert('Las contraseñas no coinciden.');
        }

        const data = {
            name: document.getElementById('new-user-name').value,
            lastname: document.getElementById('new-user-lastname')?.value || '',
            email: document.getElementById('new-user-email').value,
            document_number: document.getElementById('new-user-doc').value,
            password: pass,
            role: document.getElementById('new-user-role').value,
            category: document.getElementById('new-user-cat').value,
            gender: document.getElementById('new-user-gender').value,
            institution: document.getElementById('new-user-inst').value
        };

        if (!data.institution) {
            return alert('Debes seleccionar una institución.');
        }

        try {
            const result = await auth.adminCreateUser(data);
            if (result) {
                document.getElementById('create-user-modal').style.display = 'none';
                e.target.reset();
                this.renderView(); // Refresh list
            }
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Error al crear usuario: ' + err.message);
        }
    }

    bindUsersEvents() {
        // Modal events
        const modal = document.getElementById('create-user-modal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) modal.style.display = 'none';
            };
        }
    }

    async deleteUser(id) {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            await auth.deleteUser(id);
            this.renderView();
        }
    }

    editUser(id) {
        const user = auth.users.find(u => u.id === id);
        if (!user) return;

        // Create Modal HTML
        const modal = document.createElement('div');
        modal.id = 'edit-user-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000; padding:1rem;';

        modal.innerHTML = `
            <div style = "background: var(--bg-card); padding: 2rem; border-radius: 1rem; border: 1px solid var(--border); width: 100%; max-width: 500px; position: relative;" >
                <h3 style="margin-bottom: 1.5rem;">Editar Usuario</h3>
                <button id="close-modal" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;"><ion-icon name="close-outline"></ion-icon></button>
                
                <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                        <div>
                            <label class="form-label">Nombre</label>
                            <input type="text" id="edit-name" class="form-input" value="${user.name}">
                        </div>
                        <div>
                            <label class="form-label">Apellido</label>
                            <input type="text" id="edit-lastname" class="form-input" value="${user.lastname || ''}">
                        </div>
                    </div>
                    
                    <div>
                        <label class="form-label">Rol</label>
                        <select id="edit-role" class="form-select">
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Profesor/Organizador</option>
                            <option value="player" ${user.role === 'player' ? 'selected' : ''}>Jugador</option>
                        </select>
                    </div>

                    <div id="edit-inst-container">
                        <label class="form-label">Institución</label>
                        <select id="edit-inst" class="form-select">
                            <option value="">-- Ninguna --</option>
                            ${(auth.institutions || []).map(i => `<option value="${i.id}" ${user.institution_id === i.id || user.institution === i.name ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>

                    <div id="edit-cat-container" style="${user.role === 'player' ? 'display:block' : 'display:none'}">
                        <label class="form-label">Categoría</label>
                        <select id="edit-cat" class="form-select">
                            <option value="A" ${user.category === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${user.category === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${user.category === 'C' ? 'selected' : ''}>C</option>
                            <option value="OPEN" ${user.category === 'OPEN' ? 'selected' : ''}>OPEN</option>
                        </select>
                    </div>

                    <!-- Password Update Section -->
                    <div style="border-top:1px solid var(--border); margin-top:0.5rem; padding-top:1rem;">
                        <label class="form-label" style="margin-bottom:0.5rem; color:var(--accent);">Cambiar Contraseña (Opcional)</label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div style="position:relative;">
                                <input type="password" class="form-input" id="edit-pass" placeholder="Nueva Contraseña" style="padding-right: 35px;">
                                <ion-icon name="eye-outline" onclick="const i=document.getElementById('edit-pass'); i.type=i.type==='password'?'text':'password'; this.name=i.type==='password'?'eye-outline':'eye-off-outline';" style="position:absolute; right:10px; top:50%; transform: translateY(-50%); cursor:pointer; color:var(--text-muted); z-index:10;"></ion-icon>
                            </div>
                            <div style="position:relative;">
                                <input type="password" class="form-input" id="edit-pass-confirm" placeholder="Repetir" style="padding-right: 35px;">
                                <ion-icon name="eye-outline" onclick="const i=document.getElementById('edit-pass-confirm'); i.type=i.type==='password'?'text':'password'; this.name=i.type==='password'?'eye-outline':'eye-off-outline';" style="position:absolute; right:10px; top:50%; transform: translateY(-50%); cursor:pointer; color:var(--text-muted); z-index:10;"></ion-icon>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="cta-btn" style="margin-top: 1rem;">Guardar Cambios</button>
                </form>
            </div>
            `;

        document.body.appendChild(modal);

        // Bind Events
        const roleSelect = document.getElementById('edit-role');
        roleSelect.addEventListener('change', (e) => {
            document.getElementById('edit-cat-container').style.display = e.target.value === 'player' ? 'block' : 'none';
        });

        document.getElementById('close-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        // Real-time password validation
        const passInput = document.getElementById('edit-pass');
        const passConfirmInput = document.getElementById('edit-pass-confirm');

        const validatePasswords = () => {
            const p1 = passInput.value;
            const p2 = passConfirmInput.value;

            if (p1 || p2) {
                if (p1 === p2 && p1.length >= 6) {
                    passInput.style.borderColor = '#22c55e'; // green
                    passConfirmInput.style.borderColor = '#22c55e';
                } else {
                    passInput.style.borderColor = p1.length < 6 ? 'var(--border)' : '#ef4444'; // red if mismatch
                    passConfirmInput.style.borderColor = (p2 && p1 !== p2) ? '#ef4444' : 'var(--border)';
                }
            } else {
                passInput.style.borderColor = 'var(--border)';
                passConfirmInput.style.borderColor = 'var(--border)';
            }
        };

        passInput.addEventListener('input', validatePasswords);
        passConfirmInput.addEventListener('input', validatePasswords);

        document.getElementById('edit-user-form').onsubmit = async (e) => {
            e.preventDefault();
            const pass = document.getElementById('edit-pass').value;
            const passConfirm = document.getElementById('edit-pass-confirm').value;

            // Password Validation
            if (pass || passConfirm) {
                if (pass.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
                if (pass !== passConfirm) return alert('Las contraseñas no coinciden.');
            }

            const updates = {
                name: document.getElementById('edit-name').value,
                lastname: document.getElementById('edit-lastname').value,
                role: document.getElementById('edit-role').value,
                institution_id: document.getElementById('edit-inst').value || null,
                category: document.getElementById('edit-cat').value
            };

            try {
                // Update Profile
                await auth.updateProfile(user.id, updates);

                // Update Password if provided
                if (pass) {
                    if (auth.adminUpdatePassword) {
                        await auth.adminUpdatePassword(user.id, pass);
                    } else {
                        alert('Cambio de contraseña no disponible en esta versión (requiere función RPC).');
                    }
                }

                modal.remove();
                this.renderView();
                this.showToast('Usuario actualizado correctamente', 'success');
            } catch (e) {
                console.error(e);
                alert('Error al actualizar usuario: ' + e.message);
            }
        };
    }

    // ==================== INSTITUTIONS VIEW ====================
    getInstitutionsHTML() {
        const users = auth.users || [];
        const institutions = auth.institutions || [];


        // Filter institutions for regular admins (show only their own)
        let displayInstitutions = institutions;
        let canCreate = false;

        if (this.currentUser.role === 'superadmin') {
            canCreate = true;
        } else if (this.currentUser.role === 'admin') {
            // Filter by ID or Name
            if (this.currentUser.institution_id) {
                displayInstitutions = institutions.filter(i => i.id === this.currentUser.institution_id);
            } else if (this.currentUser.institution) {
                displayInstitutions = institutions.filter(i => i.name === this.currentUser.institution);
            } else {
                displayInstitutions = [];
            }
        }

        return `
            ${(canCreate || this.currentUser.role === 'admin') ? `
            <form id="inst-add-form" onsubmit="app.submitInstForm(event)" style="margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid var(--border); ${(this.currentUser.role === 'admin' && displayInstitutions.length > 0) ? 'display:none;' : ''}">
                    
                    <h3 id="inst-form-title" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #f59e0b;">
                        <ion-icon name="business-outline"></ion-icon> Crear Institución
                    </h3>
                    
                    <!--Row 1: Basic Info-->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1rem;">
                        <div><label class="form-label">Nombre Club *</label><input type="text" class="form-input" id="inst-name" required placeholder="Ej. Club Tenis"></div>
                        <div><label class="form-label">Teléfono Contacto</label><input type="tel" class="form-input" id="inst-phone" placeholder="+54 9 11 1234-5678"></div>
                        <div><label class="form-label">Google Maps URL</label><input type="url" class="form-input" id="inst-maps" placeholder="https://goo.gl/maps/..."></div>
                    </div>

                    <!-- Row 1.5: Location -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:1rem; background:rgba(255,255,255,0.03); padding:1rem; border-radius:0.5rem;">
                         <div><label class="form-label">País</label><input type="text" class="form-input" id="inst-country" placeholder="Ej. Argentina"></div>
                         <div><label class="form-label">Provincia</label><input type="text" class="form-input" id="inst-province" placeholder="Ej. Buenos Aires"></div>
                         <div><label class="form-label">Ciudad</label><input type="text" class="form-input" id="inst-city" placeholder="Ej. Mar del Plata"></div>
                         <div><label class="form-label">Latitud</label><input type="text" class="form-input" id="inst-lat" placeholder="-38.012345"></div>
                         <div><label class="form-label">Longitud</label><input type="text" class="form-input" id="inst-lng" placeholder="-57.512345"></div>
                         <div style="display:flex; align-items:end;">
                            <button type="button" id="btn-detect-coords" class="cta-btn secondary" style="width:100%; padding:0.5rem;" onclick="app.autoFillInstLocation()">
                                <ion-icon name="location"></ion-icon> Detectar Coordenadas
                            </button>
                         </div>
                    </div>
                    
                    <!--Row 2: Courts-->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1rem;">
                        <div><label class="form-label">Canchas CON Iluminación</label><input type="number" class="form-input" id="inst-courts-lit" min="0" placeholder="0"></div>
                        <div><label class="form-label">Canchas SIN Iluminación</label><input type="number" class="form-input" id="inst-courts-unlit" min="0" placeholder="0"></div>
                    </div>

                    <!--Row 3: Operating Hours - Diurno(left) and Nocturno(right)-->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem; margin-bottom:1rem;">
                        <!-- Diurno (Left) -->
                        <div style="background: rgba(251,191,36,0.05); padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(251,191,36,0.2);">
                            <label class="form-label" style="color: #fbbf24; display: flex; align-items: center; gap: 0.5rem;">
                                <ion-icon name="sunny-outline"></ion-icon> Horario Diurno (Canchas s/Luz)
                            </label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                <div>
                                    <label style="font-size: 0.75rem; color: var(--text-muted);">Hora Inicio</label>
                                    <input type="time" class="form-input" id="inst-hours-unlit-start" style="padding: 0.5rem;">
                                </div>
                                <div>
                                    <label style="font-size: 0.75rem; color: var(--text-muted);">Hora Fin</label>
                                    <input type="time" class="form-input" id="inst-hours-unlit-end" style="padding: 0.5rem;">
                                </div>
                            </div>
                        </div>
                        <!-- Nocturno (Right) -->
                        <div style="background: rgba(129,140,248,0.05); padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(129,140,248,0.2);">
                            <label class="form-label" style="color: #818cf8; display: flex; align-items: center; gap: 0.5rem;">
                                <ion-icon name="moon-outline"></ion-icon> Horario Nocturno (Canchas c/Luz)
                            </label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                                <div>
                                    <label style="font-size: 0.75rem; color: var(--text-muted);">Hora Inicio</label>
                                    <input type="time" class="form-input" id="inst-hours-lit-start" style="padding: 0.5rem;">
                                </div>
                                <div>
                                    <label style="font-size: 0.75rem; color: var(--text-muted);">Hora Fin</label>
                                    <input type="time" class="form-input" id="inst-hours-lit-end" style="padding: 0.5rem;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!--Row 4: Prices-->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1rem;">
                        <div><label class="form-label">Alquiler Diurno ($)</label><input type="number" class="form-input" id="inst-price-day" min="0" placeholder="0"></div>
                        <div><label class="form-label">Alquiler Nocturno ($)</label><input type="number" class="form-input" id="inst-price-night" min="0" placeholder="0"></div>
                    </div>

                    <!--Row 4b: Payment-->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1rem;">
                    <div><label class="form-label">Link de Pago (Opcional)</label><input type="url" class="form-input" id="inst-mp" placeholder="https://mpago.la/..."></div>
                    <div><label class="form-label">Alias CBU (Transferencias)</label><input type="text" class="form-input" id="inst-alias" placeholder="Ej. CLUB.TENIS.MP"></div>
                     ${this.currentUser.role === 'superadmin' ? `
                    <div><label class="form-label">MP Access Token (Superadmin)</label><input type="password" class="form-input" id="inst-mp-token" placeholder="TEST-1234..."></div>
                    ` : ''}
                </div>

                    <button type="submit" id="inst-submit-btn" class="cta-btn" style="margin-top:1rem;">Crear Institución</button>
                </form>
            ` : ''}

                <!-- INSTITUTIONS CARDS -->
                <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #f59e0b;">
                    <ion-icon name="business-outline"></ion-icon> Instituciones Registradas
                    <span style="background: rgba(245,158,11,0.2); color: #fbbf24; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; margin-left: 0.5rem;">${displayInstitutions.length}</span>
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
                    ${displayInstitutions.length === 0 ? '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay instituciones registradas</p>' : ''}
                    ${displayInstitutions.map(i => `
                        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; position: relative;">
                            <!-- Header -->
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                <div style="width: 50px; height: 50px; background: #334155; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    ${i.logo ? `<img src="${i.logo}" style="width:100%; height:100%; object-fit:cover;">` : '<ion-icon name="business" style="font-size: 24px; color: #94a3b8;"></ion-icon>'}
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; font-size: 1.1rem;">${i.name}</div>
                                    ${i.phone ? `<div style="font-size: 0.85rem; color: var(--text-muted);"><ion-icon name="call-outline" style="vertical-align: text-bottom;"></ion-icon> ${i.phone}</div>` : ''}
                                </div>
                                <div style="display:flex; gap:0.5rem;">
                                    <button style="color: #60a5fa; background: rgba(59,130,246,0.1); border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.4rem;" onclick="app.editInst('${i.id}')"><ion-icon name="create-outline"></ion-icon></button>
                                    <button style="color: #ef4444; background: rgba(239,68,68,0.1); border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.4rem;" onclick="app.deleteInst('${i.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                                </div>
                            </div>
                            
                            <!-- Courts Info -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.9rem;">
                                <div style="background: rgba(34,197,94,0.1); padding: 0.5rem; border-radius: 0.5rem; text-align: center;">
                                    <div style="color: #4ade80; font-weight: 600;">${i.courts_with_light || 0}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Canchas c/Luz</div>
                                    ${i.hours_with_light ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${i.hours_with_light}</div>` : ''}
                                </div>
                                <div style="background: rgba(148,163,184,0.1); padding: 0.5rem; border-radius: 0.5rem; text-align: center;">
                                    <div style="color: #94a3b8; font-weight: 600;">${i.courts_without_light || 0}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Canchas s/Luz</div>
                                    ${i.hours_without_light ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${i.hours_without_light}</div>` : ''}
                                </div>
                            </div>
                            
                            <!-- Prices -->
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.85rem;">
                                <div><span style="color: #fbbf24;"><ion-icon name="sunny-outline" style="vertical-align: text-bottom;"></ion-icon></span> Diurno: <strong>$${i.price_day || 0}</strong></div>
                                <div><span style="color: #818cf8;"><ion-icon name="moon-outline" style="vertical-align: text-bottom;"></ion-icon></span> Nocturno: <strong>$${i.price_night || 0}</strong></div>
                            </div>
                            
                            <!-- Links -->
                            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem;">
                                ${i.maps_url ? `<a href="${i.maps_url}" target="_blank" style="color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 0.3rem;"><ion-icon name="location-outline"></ion-icon> Mapa</a>` : ''}
                                ${i.payment_link ? `<a href="${i.payment_link}" target="_blank" style="color: #4ade80; text-decoration: none; display: flex; align-items: center; gap: 0.3rem;"><ion-icon name="card-outline"></ion-icon> Pago</a>` : ''}
                            </div>
                            
                            <!-- Assigned Professors -->
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Profesores:</div>
                                ${users.filter(u => u.institution === i.name && u.role === 'admin').length > 0
                ? users.filter(u => u.institution === i.name && u.role === 'admin').map(u => `<span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.8rem; margin-right: 0.3rem;">${u.name}</span>`).join('')
                : '<span style="color: var(--text-muted); font-size: 0.85rem;">Ninguno asignado</span>'}
                            </div>
                            
                            <!-- Court Configuration Button -->
                            <button onclick="app.openCourtSlotsModal('${i.id}', '${i.name}')" 
                                style="margin-top: 1rem; width: 100%; padding: 0.75rem; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem;">
                                <ion-icon name="calendar-outline"></ion-icon> Configurar Horarios de Canchas
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div >
            `;
    }

    bindInstitutionsEvents() {
        const formInst = null; // FIXED: Disabled to use submitInstForm via onsubmit attr
        if (formInst) {
            formInst.onsubmit = async (e) => {
                e.preventDefault();
                console.log('Submitting institution form...');

                try {
                    // CHECK if we are in Edit Mode
                    const editId = formInst.getAttribute('data-edit-id');

                    const name = document.getElementById('inst-name').value;
                    if (!name) return alert('El nombre es obligatorio');

                    const data = {
                        name: name,
                        logo_url: document.getElementById('inst-logo').value,
                        payment_link: document.getElementById('inst-mp').value,
                        phone: document.getElementById('inst-phone').value,
                        maps_url: document.getElementById('inst-maps').value,
                        courts_with_light: parseInt(document.getElementById('inst-courts-lit').value) || 0,
                        courts_without_light: parseInt(document.getElementById('inst-courts-unlit').value) || 0
                    };

                    console.log('Data payload:', data);

                    if (editId) {
                        const updated = await auth.updateInstitution(editId, data);
                        if (updated) {
                            alert('Institución actualizada');
                            formInst.removeAttribute('data-edit-id');
                            formInst.reset();
                            // Reset Title/Btn
                            document.getElementById('inst-form-title').innerHTML = '<ion-icon name="business-outline" style="margin-right:0.5rem; color:#f59e0b;"></ion-icon> Crear Institución';
                            const btn = document.getElementById('inst-submit-btn');
                            if (btn) btn.textContent = 'Crear Institución';
                            const cancel = document.getElementById('inst-cancel-btn');
                            if (cancel) cancel.remove();
                        }
                    } else {
                        const created = await auth.addInstitution(data);
                        if (created) {
                            alert('Institución creada exitosamente');
                            formInst.reset();
                        }
                    }

                    this.renderView();
                } catch (err) {
                    console.error('Error in form submit:', err);
                    alert('Error: ' + err.message);
                }
            };
        }
    }

    async deleteInst(id) {
        if (confirm('¿Estás seguro de borrar esta institución? Se eliminarán los torneos asociados.')) {
            await auth.deleteInstitution(id);
            this.renderView();
        }
    }

    async submitInstForm(e) {
        e.preventDefault();
        console.log('Submitting institution form via submitInstForm...');

        const formInst = document.getElementById('inst-add-form');
        if (!formInst) return console.error('Form not found');

        try {
            // Capture data
            console.log('Capture ID...');
            const editId = formInst.getAttribute('data-edit-id');
            console.log('Capture Name...');
            const name = document.getElementById('inst-name')?.value;
            if (!name) return alert('El nombre es obligatorio');

            console.log('Capture Coords...');
            const rawLat = document.getElementById('inst-lat')?.value || '';
            const rawLng = document.getElementById('inst-lng')?.value || '';

            console.log('Normalize Coords...');
            // Normalize: replace ALL commas with dots and trim
            const cleanLat = rawLat.toString().trim().replace(/,/g, '.');
            const cleanLng = rawLng.toString().trim().replace(/,/g, '.');

            console.log('Constructing data object...');
            const data = {
                name: name,
                phone: document.getElementById('inst-phone')?.value?.trim() || null,
                logo: document.getElementById('inst-logo')?.value?.trim() || null,
                maps_url: document.getElementById('inst-maps')?.value?.trim() || null,
                payment_link: document.getElementById('inst-mp')?.value?.trim() || null,
                country: document.getElementById('inst-country')?.value?.trim() || null,
                province: document.getElementById('inst-province')?.value?.trim() || null,
                city: document.getElementById('inst-city')?.value?.trim() || null,
                latitude: (cleanLat !== '') ? parseFloat(cleanLat) : null,
                longitude: (cleanLng !== '') ? parseFloat(cleanLng) : null,
                courts_with_light: parseInt(document.getElementById('inst-courts-lit')?.value) || 0,
                courts_without_light: parseInt(document.getElementById('inst-courts-unlit')?.value) || 0,
                hours_with_light: app.combineTimeInputs('inst-hours-lit-start', 'inst-hours-lit-end'),
                hours_without_light: app.combineTimeInputs('inst-hours-unlit-start', 'inst-hours-unlit-end'),
                price_day: parseFloat(document.getElementById('inst-price-day')?.value) || 0,
                price_night: parseFloat(document.getElementById('inst-price-night')?.value) || 0,
                alias_cbu: document.getElementById('inst-alias')?.value?.trim() || null
            };

            // Only Superadmin can update MP Token
            if (this.currentUser.role === 'superadmin') {
                const token = document.getElementById('inst-mp-token')?.value?.trim();
                if (token) data.mp_access_token = token;
            }

            console.log('Data object constructed:', data);
            console.log('Sending data to server:', data);

            if (editId) {
                const updated = await auth.updateInstitution(editId, data);
                if (updated) {
                    alert('Institución actualizada');
                    formInst.removeAttribute('data-edit-id');
                    formInst.reset();
                    document.getElementById('inst-form-title').innerHTML = '<ion-icon name="business-outline" style="margin-right:0.5rem; color:#f59e0b;"></ion-icon> Crear Institución';
                    const btn = document.getElementById('inst-submit-btn');
                    if (btn) btn.textContent = 'Crear Institución';
                    const cancel = document.getElementById('inst-cancel-btn');
                    if (cancel) cancel.remove();
                }
            } else {
                console.log('App calling auth.addInstitution with:', data);
                const created = await auth.addInstitution(data);
                console.log('App received creation response:', created);
                if (created) {
                    alert('Institución creada exitosamente');
                    formInst.reset();
                }
            }
            this.renderView();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        }
    }

    editInst(id) {
        const inst = auth.institutions.find(i => i.id === id);
        console.log('app.editInst: Editing institution:', inst?.name, { lat: inst?.latitude, lng: inst?.longitude });
        if (!inst) return;

        // Scroll top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Populate Form - use snake_case from Supabase
        document.getElementById('inst-name').value = inst.name || '';
        document.getElementById('inst-phone').value = inst.phone || '';
        document.getElementById('inst-maps').value = inst.maps_url || '';

        document.getElementById('inst-country').value = inst.country || '';
        document.getElementById('inst-province').value = inst.province || '';
        document.getElementById('inst-city').value = inst.city || '';
        document.getElementById('inst-lat').value = inst.latitude || '';
        document.getElementById('inst-lng').value = inst.longitude || '';

        document.getElementById('inst-courts-lit').value = inst.courts_with_light || 0;
        document.getElementById('inst-courts-unlit').value = inst.courts_without_light || 0;

        // Parse time strings "HH:MM - HH:MM" into separate inputs
        this.parseTimeToInputs(inst.hours_with_light, 'inst-hours-lit-start', 'inst-hours-lit-end');
        this.parseTimeToInputs(inst.hours_without_light, 'inst-hours-unlit-start', 'inst-hours-unlit-end');

        document.getElementById('inst-price-day').value = inst.price_day || 0;
        document.getElementById('inst-price-night').value = inst.price_night || 0;
        document.getElementById('inst-logo').value = inst.logo || '';
        document.getElementById('inst-mp').value = inst.payment_link || '';
        document.getElementById('inst-alias').value = inst.alias_cbu || '';

        // Only Superadmin sees MP Token
        const tokenInput = document.getElementById('inst-mp-token');
        if (tokenInput && this.currentUser.role === 'superadmin') {
            tokenInput.value = inst.mp_access_token || '';
        }

        // Set Edit Mode on Form
        const formInst = document.getElementById('inst-add-form');
        formInst.style.display = 'block'; // Ensure it is visible if hidden
        formInst.setAttribute('data-edit-id', id);

        // Update UI Text
        document.getElementById('inst-form-title').innerHTML = '<ion-icon name="create-outline" style="margin-right:0.5rem; color:#f59e0b;"></ion-icon> Editar Institución';
        document.getElementById('inst-submit-btn').textContent = 'Actualizar Institución';

        // Add Cancel Button if not exists
        if (!document.getElementById('inst-cancel-btn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'inst-cancel-btn';
            cancelBtn.type = 'button';
            cancelBtn.className = 'cta-btn secondary';
            cancelBtn.textContent = 'Cancelar Edición';
            cancelBtn.style.background = 'transparent';
            cancelBtn.style.border = '1px solid #ef4444';
            cancelBtn.style.color = '#ef4444';
            cancelBtn.style.marginLeft = '1rem';
            cancelBtn.onclick = () => {
                formInst.removeAttribute('data-edit-id');
                formInst.reset();
                document.getElementById('inst-form-title').innerHTML = '<ion-icon name="business-outline" style="margin-right:0.5rem; color:#f59e0b;"></ion-icon> Crear Institución';
                document.getElementById('inst-submit-btn').textContent = 'Crear Institución';

                // If Admin and had one, hide again? Or just leave it open?
                // Better UX: leave it open or hide. Let's hide if admin.
                if (auth.currentUser.role === 'admin') {
                    formInst.style.display = 'none';
                }

                cancelBtn.remove();
            };
            document.getElementById('inst-submit-btn').after(cancelBtn);
        }
    }

    async autoFillInstLocation() {
        const country = document.getElementById('inst-country').value;
        const province = document.getElementById('inst-province').value;
        const city = document.getElementById('inst-city').value;

        if (!city || !province || !country) {
            return alert('Por favor ingresa País, Provincia y Ciudad para detectar coordenadas.');
        }

        const btn = document.getElementById('btn-detect-coords');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Buscando...';
            btn.disabled = true;
        }

        try {
            // Construct Query
            let queryItems = [city, province, country];
            const address = document.getElementById('inst-address')?.value;
            if (address) queryItems.unshift(address);

            const q = encodeURIComponent(queryItems.filter(Boolean).join(', '));
            console.log('Fetching coords for:', q);

            let res;
            try {
                res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
            } catch (networkError) {
                throw new Error('NETWORK_ERROR');
            }

            if (!res.ok) {
                if (res.status === 403) throw new Error('CORS_BLOCK');
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (data && data[0]) {
                const latEl = document.getElementById('inst-lat');
                const lngEl = document.getElementById('inst-lng');
                if (latEl) latEl.value = parseFloat(data[0].lat).toFixed(6);
                if (lngEl) lngEl.value = parseFloat(data[0].lon).toFixed(6);
                if (latEl && lngEl) {
                    this.showToast('Coordenadas detectadas', 'success');
                } else {
                    console.error('Lat/Lng input elements not found');
                    alert('Error: Campos de coordenadas no encontrados en el formulario.');
                }
            } else {
                alert('No se encontraron coordenadas para esta ubicación. Intenta ser más específico.');
            }

        } catch (e) {
            console.error('Geocoding error:', e);
            if (e.message === 'NETWORK_ERROR' || e.message === 'CORS_BLOCK' || e.message.includes('Mg')) {
                const msg = '⚠️ BLOQUEO DE SEGURIDAD (CORS)\n\n' +
                    'El navegador ha bloqueado la conexión.\n' +
                    'Si estás en local, usa "npm start".\n' +
                    'Si estás en Hostinger, asegúrate de acceder por HTTPS.';
                alert(msg);
            } else {
                alert('Error al geocodificar: ' + e.message);
            }
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    // Helper: Combine two time inputs into "HH:MM - HH:MM" format
    combineTimeInputs(startId, endId) {
        const start = document.getElementById(startId)?.value || '';
        const end = document.getElementById(endId)?.value || '';
        if (start && end) {
            return `${start} - ${end} `;
        }
        return start || end || '';
    }

    // Helper: Parse "HH:MM - HH:MM" string into separate inputs
    parseTimeToInputs(timeStr, startId, endId) {
        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        if (!startEl || !endEl) return;

        if (timeStr && timeStr.includes('-')) {
            const parts = timeStr.split('-').map(p => p.trim());
            startEl.value = parts[0] || '';
            endEl.value = parts[1] || '';
        } else {
            startEl.value = '';
            endEl.value = '';
        }
    }

    // =====================================================
    // COURT SLOTS MANAGEMENT
    // =====================================================

    async openCourtSlotsModal(institutionId, institutionName, preservedState = null) {
        // ... (existing logic)
        console.log('Opening court slots modal for:', institutionName);

        // Get existing slots for this institution
        let slots = [];
        try {
            slots = await db.courtSlots.getByInstitution(institutionId);
        } catch (err) {
            console.error('Error loading court slots:', err);
        }

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Remove existing modal if present to prevent ID conflicts
        const existingModal = document.getElementById('court-slots-modal');
        if (existingModal) existingModal.remove();

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'court-slots-modal';
        modal.dataset.institutionId = institutionId; // Store for global access
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';

        const instDetails = (auth.institutions || []).find(i => i.id === institutionId);
        // Supports camelCase (if mapped) or snake_case (raw)
        const c1 = instDetails?.courts_with_light || instDetails?.courtsWithLight || 0;
        const c2 = instDetails?.courts_without_light || instDetails?.courtsWithoutLight || 0;
        const totalCourts = parseInt(c1) + parseInt(c2);

        // Default values from preserved state or standard defaults
        const defaultCourt = preservedState?.courtName || 'Cancha 1';
        const defaultStart = preservedState?.startTime || '09:00';
        const defaultEnd = preservedState?.endTime || '21:00';

        const courts = totalCourts > 0
            ? Array.from({ length: totalCourts }, (_, i) => `Cancha ${i + 1}`)
            : [];

        const courtInputHTML = totalCourts > 0
            ? `<select id="slot-court" class="form-select" style="padding:0.5rem;">
                ${Array.from({ length: totalCourts }, (_, i) => {
                const val = `Cancha ${i + 1}`;
                return `<option value="${val}" ${val === defaultCourt ? 'selected' : ''}>${val}</option>`;
            }).join('')}
               </select>`
            : `<input type="text" id="slot-court" class="form-input" value="${defaultCourt === 'Cancha 1' ? '' : defaultCourt}" placeholder="Cancha 1" style="padding:0.5rem;">`;

        modal.innerHTML = `
            <style>
                .day-chip { cursor:pointer; user-select:none; }
                .day-chip input { display:none; }
                .day-chip span {
                    display:flex; align-items:center; justify-content:center;
                    width:32px; height:32px; border-radius:50%;
                    border:1px solid var(--border); color:var(--text-muted);
                    font-size:0.75rem; transition:all 0.2s; background:var(--bg-main);
                }
                .day-chip input:checked + span {
                    background:var(--primary); color:white; border-color:var(--primary);
                    box-shadow: 0 0 8px rgba(139,92,246,0.3); font-weight:bold;
                }
                .day-chip:hover span { border-color:var(--primary); }
            </style>
            <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; width:100%; max-width:1000px; max-height:90vh; overflow-y:auto; padding:2rem; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                    <div>
                        <h3 style="color:var(--text-main); font-size:1.25rem; font-weight:bold; margin:0;">Horarios de Canchas</h3>
                        <p style="color:var(--primary); font-size:0.9rem; margin:0;">${institutionName}</p>
                    </div>
                    <button onclick="document.getElementById('court-slots-modal').remove()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.5rem; padding:0.5rem; border-radius:50%; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
                    <!-- TABS -->
                    <div style="display:flex; gap:0.25rem; background:var(--bg-main); padding:0.25rem; border-radius:0.5rem; border:1px solid var(--border);">
                        <button onclick="
                            document.getElementById('slots-list-view').style.display='block'; 
                            document.getElementById('slots-grid-view').style.display='none'; 
                            document.getElementById('slot-form-container').style.display='block';
                            this.classList.add('active-tab'); 
                            this.nextElementSibling.classList.remove('active-tab');" 
                            style="border:none; padding:0.5rem 1rem; border-radius:0.4rem; cursor:pointer; font-size:0.85rem; font-weight:600; transition:all 0.2s; background:transparent; color:var(--text-muted);">Lista</button>
                        
                        <button onclick="
                            document.getElementById('slots-list-view').style.display='none'; 
                            document.getElementById('slots-grid-view').style.display='block'; 
                            document.getElementById('slot-form-container').style.display='none';
                            this.classList.add('active-tab'); 
                            this.previousElementSibling.classList.remove('active-tab'); 
                            app.renderWeeklyGrid('${institutionId}');" 
                            class="active-tab"
                            style="border:none; padding:0.5rem 1rem; border-radius:0.4rem; cursor:pointer; font-size:0.85rem; font-weight:600; transition:all 0.2s;">Semana</button>
                    </div>
                    
                    <style>
                        .active-tab { background:var(--primary) !important; color:white !important; }
                    </style>

                    <!-- COURT SELECTOR (Global) -->
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <label style="color:var(--text-muted); font-size:0.9rem;">Cancha:</label>
                        ${courts.length > 0 ?
                `<select id="slot-court" style="padding:0.5rem 1rem; font-size:0.9rem; min-width:150px; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border); border-radius:0.5rem; outline:none;">
                            ${courts.map(c => {
                    const isPreserved = preservedState && preservedState.courtName === c;
                    return `<option value="${c}" ${isPreserved ? 'selected' : ''} style="background:var(--bg-card); color:var(--text-main);">${c}</option>`;
                }).join('')}
                            </select>` :
                `<input type="text" id="slot-court" class="input" placeholder="Nombre Cancha" value="${(preservedState && preservedState.courtName) || 'Cancha 1'}" style="padding:0.5rem 1rem; font-size:0.9rem; min-width:150px; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border); border-radius:0.5rem;">`
            }
                    </div>

                    <!-- Pencil Tool -->
                    <div id="grid-tools" style="display:none; gap:0.5rem;">
                         <button id="btn-grid-pencil" onclick="app.toggleGridEditMode()" style="background:transparent; color:var(--text-muted); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.5rem; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem; transition:all 0.2s;">
                            <ion-icon name="create-outline" style="font-size:1rem;"></ion-icon> <span>Editar Horario</span>
                         </button>
                    </div>
                </div>

                <!-- Add New Slot Form (Visible in List Mode) -->
                <div id="slot-form-container" style="display:none; background:var(--bg-card); border:1px solid var(--border); padding:1.5rem; border-radius:1rem; margin-bottom:2rem; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:0.75rem; font-weight:500;">Días de la semana</label>
                        <div id="slot-days-container" style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                            ${dayNames.map((d, i) => `
                                <label class="day-chip" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                                    <input type="checkbox" value="${i}" ${i < 5 ? 'checked' : ''} style="display:none;" onchange="
                                        const span = this.nextElementSibling;
                                        if(this.checked) {
                                            span.style.background = 'var(--primary)';
                                            span.style.color = 'white';
                                            span.style.borderColor = 'var(--primary)';
                                            span.style.boxShadow = '0 0 8px rgba(139,92,246,0.3)';
                                        } else {
                                            span.style.background = 'var(--bg-main)';
                                            span.style.color = 'var(--text-muted)';
                                            span.style.borderColor = 'var(--border)';
                                            span.style.boxShadow = 'none';
                                        }
                                    ">
                                    <span style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:${i < 5 ? 'var(--primary)' : 'var(--bg-main)'}; color:${i < 5 ? 'white' : 'var(--text-muted)'}; border:1px solid ${i < 5 ? 'var(--primary)' : 'var(--border)'}; font-size:0.85rem; font-weight:bold; transition:all 0.2s; ${i < 5 ? 'box-shadow: 0 0 8px rgba(139,92,246,0.3);' : ''}">${d.substring(0, 1)}</span>
                                    <span style="font-size:0.7rem; margin-top:0.4rem; color:var(--text-muted);">${d.substring(0, 3)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr auto; gap:1.5rem; align-items:end;">
                        <div>
                            <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Hora Inicio</label>
                            <div class="input-group" style="background:var(--bg-main); border:1px solid var(--border); border-radius:0.5rem; display:flex; align-items:center; padding:0 0.75rem;">
                                <ion-icon name="time-outline" style="color:var(--text-muted); font-size:1.2rem;"></ion-icon>
                                <input type="time" id="slot-start" value="${preservedState && preservedState.startTime ? preservedState.startTime : '09:00'}" style="background:transparent; border:none; color:var(--text-main); font-size:0.95rem; width:100%; padding:0.75rem 0.5rem; outline:none;">
                            </div>
                        </div>
                        <div>
                            <label style="display:block; color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem;">Hora Fin</label>
                            <div class="input-group" style="background:var(--bg-main); border:1px solid var(--border); border-radius:0.5rem; display:flex; align-items:center; padding:0 0.75rem;">
                                <ion-icon name="time-outline" style="color:var(--text-muted); font-size:1.2rem;"></ion-icon>
                                <input type="time" id="slot-end" value="${preservedState && preservedState.endTime ? preservedState.endTime : '21:00'}" style="background:transparent; border:none; color:var(--text-main); font-size:0.95rem; width:100%; padding:0.75rem 0.5rem; outline:none;">
                            </div>
                        </div>
                        <button class="cta-btn" onclick="app.addCourtSlot('${institutionId}')" style="height:46px; width:46px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:0.75rem; background:var(--primary); color:white; border:none; cursor:pointer; box-shadow:0 4px 6px -1px rgba(139, 92, 246, 0.3); transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                            <ion-icon name="add" style="font-size:1.75rem;"></ion-icon>
                        </button>
                    </div>
                </div>
                
                <!-- Existing Slots List -->
                <!-- Existing Slots List -->
                <!-- Lists Container -->
                <div id="slots-list-view" style="display:none;">
                    <!-- Existing Slots List -->
                    <div id="slots-list">
                        ${slots.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding:2rem;">No hay horarios configurados</p>' :
                (() => {
                    // ... existing list render logic ...
                    // Since I need to wrap it, I'll rewrite the block carefully.

                    const groups = {};
                    slots.forEach(s => {
                        const key = `${s.court_name}|${s.start_time}|${s.end_time}`;
                        if (!groups[key]) groups[key] = { ...s, days: [], ids: [] };
                        groups[key].days.push(s.day_of_week);
                        groups[key].ids.push(s.id);
                    });

                    return Object.values(groups).map(g => {
                        const dayChips = [0, 1, 2, 3, 4, 5, 6].map(d => {
                            const isSelected = g.days.includes(d);
                            return `<span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; font-size:0.7rem; background:${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; color:${isSelected ? 'white' : 'var(--text-muted)'}; margin-left:2px;">${dayNames[d].substring(0, 1)}</span>`;
                        }).join('');

                        return `<div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:rgba(0,0,0,0.2); border-radius:0.75rem; margin-bottom:0.75rem; border:1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem;">
                                            <strong style="color:#a78bfa; font-size:1rem;">${g.court_name}</strong>
                                            <span style="color:var(--primary); font-weight:bold; background:rgba(139,92,246,0.1); padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.85rem;">${g.start_time.substring(0, 5)} - ${g.end_time.substring(0, 5)}</span>
                                        </div>
                                        <div style="display:flex;">${dayChips}</div>
                                    </div>
                                    <button onclick="app.deleteCourtSlotGroup('${g.ids.join(',')}', '${institutionId}')" style="background:rgba(239,68,68,0.1); color:#ef4444; border:none; width:36px; height:36px; border-radius:0.5rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;"><ion-icon name="trash-outline"></ion-icon></button>
                                </div>`;
                    }).join('');
                })()
            }
                    </div>
                </div>

                <div id="slots-grid-view" style="display:block;">
                    <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                        Selecciona una cancha arriba para ver su grilla semanal.
                    </div>
                </div>
            </div>
            `;

        document.body.appendChild(modal);
        // Default to render grid
        this.renderWeeklyGrid(institutionId);

        // Add listener to slot-court to update grid if grid view is active
        const slotCourtSelect = document.getElementById('slot-court');
        if (slotCourtSelect) {
            slotCourtSelect.addEventListener('change', () => {
                if (document.getElementById('slots-grid-view').style.display === 'block') {
                    this.renderWeeklyGrid(institutionId);
                }
            });
        }

        // Show/Hide tools based on view
        const obs = new MutationObserver(() => {
            const grid = document.getElementById('slots-grid-view');
            const tools = document.getElementById('grid-tools');
            if (grid && tools) tools.style.display = grid.style.display === 'none' ? 'none' : 'flex';
        });
        obs.observe(document.getElementById('slots-grid-view'), { attributes: true, attributeFilter: ['style'] });
    }

    toggleGridEditMode() {
        this.gridEditMode = !this.gridEditMode;
        const btn = document.getElementById('btn-grid-pencil');
        if (btn) {
            if (this.gridEditMode) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--primary)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-muted)';
                btn.style.borderColor = 'var(--border)';
            }
        }
        // Refresh grid to update cursors/interactions
        // Need institutionId. It's stored in the closure of the modal? No.
        // I'll grab it from the DOM or save it. 
        // Hack: The confirm button has it, or I can store it in dataset.
        const instId = document.getElementById('slots-list-view')?.dataset?.institutionId;
        // Wait, I didn't save it. Let's find a way.
        // Actually, renderWeeklyGrid pulls from closure if called from within.
        // Here toggleGridEditMode is global.
        // I will re-trigger the render if the grid is visible.
        // But I need the ID.
        // Start: Update openCourtSlotsModal to save ID to dataset.
        const container = document.getElementById('court-slots-modal');
        if (container && container.dataset.institutionId) {
            this.renderWeeklyGrid(container.dataset.institutionId);
        }
    }


    // =====================================================
    // PLAYER MATCH SCHEDULING
    // =====================================================

    async openSchedulingModal(matchId) {
        // Show loading state
        const modal = document.createElement('div');
        modal.id = 'scheduling-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';
        modal.innerHTML = `
            <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; max-width:500px; width:100%; border:1px solid var(--border); text-align:center;">
                <div class="spinner"></div>
                <p>Cargando información del partido...</p>
            </div>
            `;
        document.body.appendChild(modal);

        try {
            const match = await db.matches.getById(matchId);
            if (!match) throw new Error('Partido no encontrado');

            const institutionId = match.tournaments?.institution_id;

            // Determine participation
            // Is user a participant?
            const isParticipant = await db.matches.isUserInMatch(match.id, this.currentUser.id);
            if (!isParticipant && this.currentUser.role === 'player') {
                // View only mode for non-participants? 
                // Or just show limited info.
            }

            const isP1 = match.player1_id === this.currentUser.id;
            const opponentId = isP1 ? match.player2_id : match.player1_id;
            const opponentName = isP1 ? match.player2_name : match.player1_name;

            this.currentSchedulingMatch = { match, institutionId, isP1, opponentId, opponentName };

            this.renderSchedulingModalContent(modal);

        } catch (err) {
            console.error('Error opening scheduling modal:', err);
            modal.innerHTML = `
            <div style="background:var(--bg-card); padding:2rem; border-radius:1rem; max-width:500px; width:100%; border:1px solid var(--border); text-align:center;">
                    <h3 style="color:#ef4444">Error</h3>
                    <p>${err.message}</p>
                    <button class="cta-btn secondary" onclick="document.getElementById('scheduling-modal').remove()">Cerrar</button>
                </div>
            `;
        }
    }

    renderSchedulingModalContent(modal) {
        const { isP1, opponentName, match } = this.currentSchedulingMatch;
        const container = modal.firstElementChild;

        // --- STEP 1: CALENDAR STATE ---
        if (!this.calendarState) {
            const now = new Date();
            this.calendarState = {
                year: now.getFullYear(),
                month: now.getMonth(),
                selectedDate: null
            };
        }

        container.innerHTML = `
             <div style="position:relative; width:100%;">
                <button onclick="document.getElementById('scheduling-modal').remove()" 
                        style="position: absolute; right: -10px; top: -10px; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
                
                <h3 style="color:var(--primary); margin-bottom:0.5rem;">Agendar Partido</h3>
                <p style="color:var(--text-muted); margin-bottom:1.5rem; font-size:0.9rem;">
                    Coordina con <strong style="color:var(--text-main)">${opponentName}</strong>
                </p>

                <!-- STEP 1: CALENDAR -->
                <div id="step-calendar">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <button onclick="app.switchCalendarMonth(-1)" style="background:none; border:none; color:var(--text-main); font-size:1.2rem; cursor:pointer; padding:0.5rem;">
                            <ion-icon name="chevron-back-outline"></ion-icon>
                        </button>
                        <h4 id="calendar-month-title" style="color:var(--text-main); margin:0;">
                            <!-- Filled by JS -->
                        </h4>
                        <button onclick="app.switchCalendarMonth(1)" style="background:none; border:none; color:var(--text-main); font-size:1.2rem; cursor:pointer; padding:0.5rem;">
                            <ion-icon name="chevron-forward-outline"></ion-icon>
                        </button>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:0.25rem; margin-bottom:0.5rem; text-align:center;">
                        <span style="color:var(--text-muted); font-size:0.8rem;">Do</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Lu</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Ma</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Mi</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Ju</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Vi</span>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Sa</span>
                    </div>
                    <div id="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:0.25rem;">
                        <!-- Filled by JS -->
                    </div>
                </div>

                <!-- STEP 2: COURTS & SLOTS (Initially Hidden) -->
                <div id="step-slots" style="display:none; margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1.5rem; animation: fadeIn 0.3s ease;">
                    <div style="display:flex; align-items:center; margin-bottom:1rem; cursor:pointer;" onclick="app.resetToCalendar()">
                         <ion-icon name="arrow-back-outline" style="color:var(--primary); margin-right:0.5rem;"></ion-icon>
                         <span id="selected-date-display" style="font-weight:bold; color:var(--text-main);"></span>
                    </div>
                    <!-- Spinner or content -->
                    <div id="slots-container"></div>
                </div>

                <!-- FORMULARIO FINAL -->
                <div id="proposal-form" style="margin-top:1.5rem; display:none; border-top:1px solid var(--border); padding-top:1rem;">
                     <!-- Injected below -->
                </div>
            </div>
        `;

        this.renderCalendar();

        const formDiv = container.querySelector('#proposal-form');
        formDiv.innerHTML = `
            <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem;">Mensaje (opcional):</div>
            <textarea id="proposal-comment" rows="2" style="width:100%; max-width:100%; min-width:100%; padding:0.75rem; background:var(--bg-main); border:1px solid var(--border); border-radius:0.5rem; color:var(--text-main); margin-bottom:1rem;" placeholder="Escribe un mensaje para tu rival..."></textarea>
            
            <button id="btn-send-proposal" onclick="app.submitProposal()" disabled class="cta-btn primary" style="width:100%;">
                Enviar Propuesta
            </button>
        `;
    }

    renderCalendar() {
        const { year, month, selectedDate } = this.calendarState;
        const now = new Date();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const titleEl = document.getElementById('calendar-month-title');
        if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < firstDayIndex; i++) {
            grid.innerHTML += `<div></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let bg = 'var(--bg-card)';
            let color = 'var(--text-main)';
            let border = '1px solid transparent';
            let cursor = 'pointer';
            let onclick = `app.selectCalendarDate('${dateStr}')`;

            // Check if past (compare date part only to be safe, or logic below)
            const checkDate = new Date(year, month, day, 23, 59, 59);
            if (checkDate < now && checkDate.toDateString() !== now.toDateString()) {
                color = 'var(--text-muted)';
                cursor = 'default';
                onclick = '';
                bg = 'transparent';
            }

            if (year === now.getFullYear() && month === now.getMonth() && day === now.getDate()) {
                border = '1px solid var(--primary)';
            }

            if (selectedDate === dateStr) {
                bg = 'var(--primary)';
                color = '#fff';
            }

            grid.innerHTML += `
                <button onclick="${onclick}" 
                        style="padding:0.5rem; background:${bg}; color:${color}; border:${border}; border-radius:0.5rem; cursor:${cursor}; font-family:var(--font-main); font-weight:500;">
                    ${day}
                </button>
             `;
        }
    }

    switchCalendarMonth(delta) {
        let { year, month } = this.calendarState;
        month += delta;
        if (month > 11) { month = 0; year++; }
        if (month < 0) { month = 11; year--; }

        this.calendarState.year = year;
        this.calendarState.month = month;
        this.renderCalendar();
    }

    selectCalendarDate(dateStr) {
        this.calendarState.selectedDate = dateStr;
        this.renderCalendar();

        document.getElementById('step-slots').style.display = 'block';
        document.getElementById('proposal-form').style.display = 'block';

        const parts = dateStr.split('-');
        const display = document.getElementById('selected-date-display');
        if (display) display.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;

        // Inyectar un input hidden para que submitProposal lo lea (o actualizar submitProposal)
        // Por ahora, creemos el input si no existe para compatibilidad con código viejo si es que loadAvailableSlots fallara
        // PERO vamos a actualizar loadAvailableSlots para usar args.
        this.loadAvailableSlots(dateStr);
    }

    resetToCalendar() {
        document.getElementById('step-slots').style.display = 'none';
        document.getElementById('proposal-form').style.display = 'none';
        this.selectedSlot = null;
    }

    async loadAvailableSlots(dateStr) {
        const { institutionId } = this.currentSchedulingMatch;
        const container = document.getElementById('slots-container');
        if (!dateStr || !container || !institutionId) return;

        container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted);"><div class="spinner"></div></div>';

        try {
            const slots = await db.courtSlots.getAvailableSlots(institutionId, dateStr, 90);

            if (slots.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted);">No hay canchas disponibles.</div>';
                return;
            }

            this.currentSlots = slots;
            this.selectedSlot = null;
            const btn = document.getElementById('btn-send-proposal');
            if (btn) btn.disabled = true;

            const grouped = {};
            slots.forEach((slot, index) => {
                const name = slot.courtName || 'Cancha Genérica';
                if (!grouped[name]) grouped[name] = [];
                grouped[name].push({ ...slot, originalIndex: index });
            });

            this.groupedSlots = grouped;
            const courtNames = Object.keys(grouped).sort();

            let html = `
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <div id="court-tabs" style="display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.5rem; scrollbar-width:none;">
                        ${courtNames.map((name, idx) => `
                            <button onclick="app.switchCourtTab('${name}')" 
                                    class="court-tab-btn ${idx === 0 ? 'active' : ''}" 
                                    data-court="${name}"
                                    style="white-space:nowrap; padding:0.5rem 1rem; border-radius:2rem; border:1px solid var(--border); background:${idx === 0 ? 'var(--primary)' : 'var(--bg-card)'}; color:${idx === 0 ? '#fff' : 'var(--text-muted)'}; cursor:pointer; font-size:0.9rem; transition:all 0.2s;">
                                ${name}
                            </button>
                        `).join('')}
                    </div>

                    <div id="court-slots-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap:0.75rem; min-height:100px;"></div>
                </div>
            `;

            container.innerHTML = html;

            if (courtNames.length > 0) {
                this.renderCourtSlots(courtNames[0]);
            }

        } catch (err) {
            console.error('Error loading slots:', err);
            container.innerHTML = '<div style="text-align:center; padding:1rem; color:#ef4444;">Error cargando horarios.</div>';
        }
    }

    switchCourtTab(courtName) {
        const tabs = document.querySelectorAll('.court-tab-btn');
        tabs.forEach(tab => {
            if (tab.dataset.court === courtName) {
                tab.style.background = 'var(--primary)';
                tab.style.color = '#fff';
            } else {
                tab.style.background = 'var(--bg-card)';
                tab.style.color = 'var(--text-muted)';
            }
        });
        this.renderCourtSlots(courtName);
    }

    renderCourtSlots(courtName) {
        const grid = document.getElementById('court-slots-grid');
        if (!grid || !this.groupedSlots || !this.groupedSlots[courtName]) return;

        const slots = this.groupedSlots[courtName];

        // Group by time period
        const periods = {
            'Mañana': [], // Before 13:00
            'Tarde': [],   // 13:00 to 18:00
            'Noche': []    // After 18:00
        };

        slots.forEach(s => {
            const hour = parseInt(s.time.split(':')[0]);
            if (hour < 13) periods['Mañana'].push(s);
            else if (hour < 18) periods['Tarde'].push(s);
            else periods['Noche'].push(s);
        });

        let html = '';
        Object.entries(periods).forEach(([name, periodSlots]) => {
            if (periodSlots.length > 0) {
                html += `
                    <div style="grid-column: 1 / -1; margin-top: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${name}</span>
                    </div>
                    ${periodSlots.map(s => {
                    const isSelected = this.selectedSlot && this.currentSlots.indexOf(this.selectedSlot) === s.originalIndex;
                    const borderColor = isSelected ? 'var(--primary)' : 'var(--border)';
                    const bg = isSelected ? 'rgba(56,189,248,0.1)' : 'var(--bg-main)';
                    const shadow = isSelected ? '0 0 0 2px var(--primary)' : 'none';

                    return `
                            <button class="slot-btn" onclick="app.selectSlot(${s.originalIndex})" 
                                style="padding:0.7rem; background:${bg}; border:1px solid ${borderColor}; border-radius:0.6rem; color:var(--text-main); cursor:pointer; font-size:0.9rem; transition:all 0.2s; font-weight:600; box-shadow:${shadow}; outline:none;">
                                ${s.time}
                            </button>
                        `;
                }).join('')}
                `;
            }
        });

        grid.innerHTML = html;
        // Adjust grid layout for headers
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(85px, 1fr))';
        grid.style.gap = '0.75rem';
    }

    selectSlot(index) {
        if (!this.currentSlots) return;
        this.selectedSlot = this.currentSlots[index];

        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.style.borderColor = 'var(--border)';
            btn.style.background = 'var(--bg-main)';
        });
        const btn = document.querySelector(`.slot-btn[data-idx="${index}"]`);
        if (btn) {
            btn.style.borderColor = 'var(--primary)';
            btn.style.background = 'rgba(56,189,248,0.1)';
        }

        const submitBtn = document.getElementById('btn-send-proposal');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `Proponer: ${this.selectedSlot.time}`;
        }
    }

    async submitProposal() {
        if (!this.selectedSlot || !this.currentSchedulingMatch) return;
        const { match } = this.currentSchedulingMatch;
        // Date comes from calendarState now
        const date = this.calendarState ? this.calendarState.selectedDate : null;

        const slot = this.selectedSlot;

        // Show Loading
        const btn = document.getElementById('btn-send-proposal');
        const originalText = btn.textContent;
        btn.innerHTML = '<span class="spinner" style="width:1rem; height:1rem; border-width:2px; vertical-align:middle;"></span>';
        btn.disabled = true;

        try {
            // Get optional comment
            const commentEl = document.getElementById('proposal-comment');
            const comment = commentEl ? commentEl.value.trim() : null;

            const proposalData = {
                date: date,
                time: slot.time,
                court_name: slot.courtName,
                court_slot_id: slot.court_slot_id,
                proposer_id: this.currentUser.id,
                message: comment || 'Propuesta de horario'
            };

            await db.matches.proposeSchedule(match.id, proposalData);

            // Create notification message for the opponent
            const recipientId = match.player1_id === this.currentUser.id ? match.player2_id : match.player1_id;
            await db.messages.create({
                match_id: match.id,
                sender_id: this.currentUser.id,
                recipient_id: recipientId,
                message_type: 'proposal',
                proposal_data: proposalData,
                comment: comment || null
            });

            // Close modal and refresh
            document.getElementById('scheduling-modal').remove();
            console.log('Propuesta enviada correctamente');

            // Refresh dashboard (reload view)
            const mainContent = document.getElementById('main-content');
            this.renderDashboardView(mainContent);

        } catch (err) {
            console.error('Proposal error:', err);
            console.error('Error al enviar propuesta:', err.message);
            alert('Error al enviar propuesta: ' + err.message);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    async confirmProposal(matchId) {
        if (!confirm('¿Confirmar este horario?')) return;

        const { match } = this.currentSchedulingMatch;
        const proposal = match.proposal_data;
        if (!proposal) return alert('Error: No se encontró información de la propuesta');

        // Construct ISO string for scheduled_at
        const scheduledAt = new Date(`${proposal.date}T${proposal.time}:00`).toISOString();
        const courtSlotId = proposal.court_slot_id;

        try {
            await db.matches.confirmSchedule(matchId, scheduledAt, courtSlotId);
            document.getElementById('scheduling-modal').remove();
            this.showToast('Partido agendado correctamente', 'success');
            const mainContent = document.getElementById('main-content');
            this.renderDashboardView(mainContent);
        } catch (err) {
            this.showToast('Error al confirmar: ' + err.message, 'error');
        }
    }

    async rejectProposal(matchId) {
        if (!confirm('¿Rechazar propuesta?')) return;

        try {
            await db.matches.rejectSchedule(matchId);

            // Refresh modal to show calendar again instead of closing
            const match = await db.matches.getById(matchId);
            this.currentSchedulingMatch.match = match;
            this.renderSchedulingModalContent(document.getElementById('scheduling-modal'));

        } catch (err) {
            this.showToast('Error al rechazar: ' + err.message, 'error');
        }
    }

    async cancelProposal(matchId) {
        try {
            await db.matches.rejectSchedule(matchId); // Self-reject to reset
            // Refresh modal
            const match = await db.matches.getById(matchId);
            this.currentSchedulingMatch.match = match;
            this.renderSchedulingModalContent(document.getElementById('scheduling-modal'));
        } catch (err) {
            this.showToast('Error al cancelar: ' + err.message, 'error');
        }
    }


    async addCourtSlot(institutionId) {
        console.log('addCourtSlot called for:', institutionId);
        const courtNameInput = document.getElementById('slot-court');
        const daysContainer = document.getElementById('slot-days-container');
        const startTimeInput = document.getElementById('slot-start');
        const endTimeInput = document.getElementById('slot-end');

        const courtName = courtNameInput.value.trim();
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        // Get selected days
        const checkboxes = daysContainer.querySelectorAll('input[type="checkbox"]:checked');
        const selectedDays = Array.from(checkboxes).map(cb => {
            console.log('Checkbox raw value:', cb.value, 'parsed:', parseInt(cb.value));
            return parseInt(cb.value);
        });

        console.log('Selected Days Array:', selectedDays);
        if (selectedDays.some(d => isNaN(d))) {
            return alert('Error interno: Valor de día inválido (NaN). Contacta soporte.');
        }

        console.log('Data:', { courtName, startTime, endTime, selectedDays });

        if (!courtName || !startTime || !endTime) return alert('Completa todos los campos');
        if (!courtName || !startTime || !endTime) return alert('Completa todos los campos');
        if (selectedDays.length === 0) return alert('Selecciona al menos un día');
        if (startTime >= endTime) return alert('La hora de inicio debe ser anterior a la de fin');

        // Validation: Check for overlaps
        try {
            // Use getByInstitution so we get the raw slots config, not "available slots for a date"
            const existingSlots = await db.courtSlots.getByInstitution(institutionId);

            for (const day of selectedDays) {
                // Filter slots for this court and day
                const interferingSlot = existingSlots.find(s =>
                    s.court_name === courtName &&
                    s.day_of_week === day &&
                    s.is_active &&
                    // Overlap logic: (StartA < EndB) && (EndA > StartB)
                    (startTime < s.end_time.substring(0, 5) && endTime > s.start_time.substring(0, 5))
                );

                if (interferingSlot) {
                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    throw new Error(`Superposición detectada: Ya existe un horario (${interferingSlot.start_time.substring(0, 5)} - ${interferingSlot.end_time.substring(0, 5)}) para ${courtName} el ${dayNames[day]}.`);
                }
            }
        } catch (e) {
            console.warn(e);
            alert(e.message);
            return; // Stop execution
        }

        let createdCount = 0;
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Show loading state on button
        const btn = event?.target?.closest('button');
        const originalBtnContent = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<div class="spinner" style="width:20px; height:20px; border-width:2px;"></div>';
            btn.disabled = true;
        }

        try {
            // Loop through selected days
            for (const dayOfWeek of selectedDays) {
                console.log('Creating slot for day:', dayOfWeek);
                await db.courtSlots.create({
                    institution_id: institutionId,
                    court_name: courtName,
                    day_of_week: dayOfWeek,
                    start_time: startTime,
                    end_time: endTime,
                    is_active: true
                });
                createdCount++;
            }

            console.log('Created count:', createdCount);

            // Reload modal to simplify group rendering logic
            // Use window.auth to assume global access safety
            const authInstance = window.auth || auth;
            const instName = (authInstance.institutions.find(i => i.id === institutionId) || {}).name || 'Institución';

            // Pass current state to preserve inputs
            const nextState = {
                courtName: courtName,
                startTime: startTime,
                endTime: endTime
                // We don't preserve selected days usually, or maybe we should? 
                // User usually adds: Cancha 1, Mon-Fri, Morning. Then Cancha 1, Mon-Fri, Afternoon.
                // So keeping days IS useful. But checkboxes logic is harder to pass.
                // For now, let's keep court and times.
            };
            this.openCourtSlotsModal(institutionId, instName, nextState);

        } catch (e) {
            console.error('Error in addCourtSlot:', e);
            alert('Error al agregar: ' + e.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalBtnContent || '<ion-icon name="add"></ion-icon>';
                btn.disabled = false;
            }
        }
    }

    async deleteCourtSlotGroup(idsString, institutionId) {
        if (!confirm('¿Eliminar estos horarios?')) return;
        const ids = idsString.split(',');
        try {
            // Delete all in parallel
            await Promise.all(ids.map(id => db.courtSlots.delete(id)));
            // Reload
            this.openCourtSlotsModal(institutionId, (auth.institutions.find(i => i.id === institutionId) || {}).name || 'Institución');
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    }

    renderWeeklyGrid(institutionId) {
        const container = document.getElementById('slots-grid-view');
        if (!container) return; // Not in view logic

        const courtInput = document.getElementById('slot-court');
        const selectedCourt = courtInput ? courtInput.value : 'Cancha 1';

        // Use db.courtSlots, BUT we need the slots data available synchronously or cached? 
        // We can fetch again. It's safe.
        db.courtSlots.getByInstitution(institutionId).then(slots => {
            const courtSlots = slots.filter(s => s.court_name === selectedCourt && s.is_active);

            // Update Toggle Button State
            const btnPencil = document.getElementById('btn-grid-pencil');
            if (btnPencil) {
                if (this.gridEditMode) {
                    btnPencil.style.background = 'var(--primary)';
                    btnPencil.style.color = 'white';
                    btnPencil.style.borderColor = 'var(--primary)';
                } else {
                    btnPencil.style.background = 'transparent';
                    btnPencil.style.color = 'var(--text-muted)';
                    btnPencil.style.borderColor = 'var(--border)';
                }
            }
            const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

            // Grid Structure: 7 columns.
            // Reduced height: 30px per hour
            const hourHeight = 30;
            const startHour = 7;
            const endHour = 24;
            const hoursCount = endHour - startHour;
            const totalHeight = hoursCount * hourHeight;

            let gridHTML = `
                <div style="background:var(--bg-card); border-radius:0.5rem; padding:1rem; border:1px solid var(--border); overflow-x:auto;">
                    <div style="display:grid; grid-template-columns: 50px repeat(7, 1fr); gap:1px; background:var(--border); border:1px solid var(--border);">
                        <!-- Header -->
                        <div style="background:var(--bg-card); padding:0.5rem; font-size:0.7rem;">Time</div>
                        ${dayNames.map(d => `<div style="background:var(--bg-card); padding:0.5rem; text-align:center; font-size:0.75rem; font-weight:bold;">${d}</div>`).join('')}
                    </div>
                <div style="position:relative; height:${totalHeight + 20}px; background:var(--bg-card);">
                    <div style="display:grid; grid-template-columns: 50px repeat(7, 1fr); min-height:100%;">
                        <!-- Time Labels Column -->
                        <div style="border-right:1px solid var(--border);">
                            ${Array.from({ length: hoursCount }, (_, i) => i + startHour).map(h => `
                                    <div style="height:${hourHeight}px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.65rem; color:var(--text-muted); display:flex; align-items:start; justify-content:center; padding-top:4px;">
                                        ${h}:00
                                    </div>
                                `).join('')}
                        </div>
                        <!-- Day Columns -->
                        ${dayNames.map((_, dayIndex) => `
                                <div style="position:relative; border-right:1px solid rgba(255,255,255,0.05); height:${totalHeight}px;">
                                    
                                    <!-- Background Clickable Cells (Phantom Grid) -->
                                    ${this.gridEditMode ? Array.from({ length: hoursCount }, (_, i) => {
                const h = i + startHour;
                const top = i * hourHeight;
                // Use onmousedown etc.
                const isSelected = this.dragState && this.dragState.day === dayIndex &&
                    h >= Math.min(this.dragState.start, this.dragState.current) &&
                    h <= Math.max(this.dragState.start, this.dragState.current);

                const bgStyle = isSelected ? 'background:rgba(139,92,246,0.3) !important;' : '';

                return `<div onmousedown="app.handleGridDragStart(${dayIndex}, ${h})" 
                                                     onmouseenter="app.handleGridDragEnter(${dayIndex}, ${h})"
                                                     onmouseup="app.handleGridDragEnd(${dayIndex}, ${h})"
                                                     title="Arrastra para marcar rango"
                                                     style="position:absolute; top:${top}px; left:0; right:0; height:${hourHeight}px; 
                                                     cursor:cell; z-index:1; ${bgStyle}"
                                                     onmouseover="if(!window.app.dragState) this.style.background='rgba(139,92,246,0.2)'" 
                                                     onmouseout="if(!window.app.dragState) this.style.background='transparent'"></div>`;
            }).join('') : ''}

                                    <!-- Active Slots -->
                                    ${courtSlots.filter(s => s.day_of_week === dayIndex).map(s => {
                // Calculate top and height
                const [startH, startM] = s.start_time.split(':').map(Number);
                const [endH, endM] = s.end_time.split(':').map(Number);
                const startVal = startH + startM / 60;
                const endVal = endH + endM / 60;
                const duration = endVal - startVal;

                // Offset from startHour
                const top = (startVal - startHour) * hourHeight;
                const height = duration * hourHeight;

                const deleteAttr = this.gridEditMode ? `onclick="app.deleteCourtSlotFromGrid('${s.id}', '${institutionId}')"` : '';
                const styleCursor = this.gridEditMode ? 'cursor:pointer' : 'cursor:default';
                const hoverAttr = this.gridEditMode
                    ? `onmouseover="this.style.background='rgba(239,68,68,0.7)'; this.innerHTML='<ion-icon name=trash-outline></ion-icon>';" onmouseout="this.style.background='rgba(139,92,246,0.6)'; this.innerHTML='${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}';"`
                    : '';

                return `
                                            <div ${deleteAttr} style="position:absolute; top:${top}px; left:2px; right:2px; height:${height}px; background:rgba(139,92,246,0.6); border:1px solid var(--primary); border-radius:4px; font-size:0.6rem; display:flex; align-items:center; justify-content:center; color:white; overflow:hidden; ${styleCursor}; transition:all 0.2s; z-index:2;" title="${s.start_time} - ${s.end_time}" ${hoverAttr}>
                                                ${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}
                                            </div>
                                        `;
            }).join('')}
                                    ${Array.from({ length: hoursCount }, (_, i) => `<div style="height:${hourHeight}px; border-bottom:1px solid rgba(255,255,255,0.05);"></div>`).join('')} 
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
            `;
            container.innerHTML = gridHTML;
        });
    }

    handleGridDragStart(day, hour) {
        if (!this.gridEditMode) return;
        this.dragState = {
            day: day,
            start: hour,
            current: hour,
            active: true
        };
        // Re-render to show selection start immediately? 
        // Or just rely on CSS classes if I optimized? 
        // For simplicity in this vanilla setup, I'll re-render the phantom grid or just the specific column?
        // But wait, re-rendering on every mouse move IS expensive.
        // Optimized approach: update DOM elements directly.
        this.updateDragVisuals();
    }

    handleGridDragEnter(day, hour) {
        if (!this.dragState || !this.dragState.active) return;
        if (this.dragState.day !== day) return; // Keep same day

        this.dragState.current = hour;
        this.updateDragVisuals();
    }

    async handleGridDragEnd(day, hour) {
        if (!this.dragState || !this.dragState.active) return;

        const startH = Math.min(this.dragState.start, this.dragState.current);
        const endH = Math.max(this.dragState.start, this.dragState.current) + 1; // +1 to include the last hour clicked

        // Clear state
        const dayIndex = this.dragState.day;
        this.dragState = null;
        this.updateDragVisuals(); // Clear visuals

        // Get context
        const institutionId = document.getElementById('court-slots-modal')?.dataset?.institutionId;
        const courtName = document.getElementById('slot-court')?.value || 'Cancha 1';

        if (institutionId) {
            await this.createCourtSlotFromGrid(institutionId, courtName, dayIndex, `${startH}:00`, `${endH}:00`);
        }
    }

    updateDragVisuals() {
        // Find all phantom cells and update their background based on dragState
        if (!this.gridEditMode) return;

        // Iterate phantom cells? We didn't give them IDs.
        // Let's select by attribute? Or just re-render is safer for logic but slower.
        // Actually, let's just re-render the grid content. 
        // To avoid flickering, maybe just update styles?
        // Let's try re-rendering first. If slow, we optimize.
        const header = document.getElementById('court-slots-modal')?.dataset?.institutionId;
        if (header) this.renderWeeklyGrid(header);
    }

    async createCourtSlotFromGrid(institutionId, courtName, day, start, end) {
        if (!this.gridEditMode) return;
        try {
            await db.courtSlots.create({
                institution_id: institutionId,
                court_name: courtName,
                day_of_week: day,
                start_time: start,
                end_time: end,
                is_active: true
            });
            this.renderWeeklyGrid(institutionId); // Instant refresh
        } catch (e) {
            console.error(e);
            alert('Error al crear horario: ' + e.message);
        }
    }

    async deleteCourtSlot(slotId, institutionId) {
        if (!confirm('¿Eliminar este horario?')) return;
        try {
            await db.courtSlots.delete(slotId);
            const el = document.getElementById(`slot - ${slotId} `);
            if (el) {
                el.remove();
            } else {
                // Determine if we should reload. Legacy rows don't have IDs.
                // Reload modal to be safe.
                const authInstance = window.auth || auth;
                this.openCourtSlotsModal(institutionId, (authInstance.institutions.find(i => i.id === institutionId) || {}).name || 'Institución');
            }
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    }

    async deleteCourtSlotFromGrid(slotId, institutionId) {
        if (!confirm('¿Eliminar este horario?')) return;
        try {
            await db.courtSlots.delete(slotId);
            this.renderWeeklyGrid(institutionId);
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    }

    // =====================================================
    // MESSAGING SYSTEM
    // =====================================================

    async renderMessagesView_old(container) { // Renamed to disable legacy version in favor of new one
        this.showLoading(container, 'Cargando mensajes...');

        try {
            const messages = await db.messages.getForUser(this.currentUser.id);

            if (messages.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:3rem;">
                        <ion-icon name="mail-open-outline" style="font-size:4rem; color:var(--text-muted); margin-bottom:1rem;"></ion-icon>
                        <h2 style="color:var(--text-muted); margin-bottom:0.5rem;">No tienes mensajes</h2>
                        <p style="color:var(--text-muted);">Las propuestas de coordinación de partidos aparecerán aquí.</p>
                    </div>
                `;
                return;
            }

            // --- FILTER LOGIC ---
            const pendingParams = [];
            const historyParams = [];

            messages.forEach(msg => {
                // Filter out my own sent messages (if query returns them)
                if (msg.recipient_id !== this.currentUser.id) return;

                const isUnread = !msg.is_read;
                const isProposalType = msg.message_type === 'proposal' || msg.message_type === 'counter_proposal';

                let hasBeenResponded = false;
                let matchIsConfirmed = false;

                if (isProposalType) {
                    if (msg.matches && msg.matches.scheduling_status === 'confirmed') {
                        hasBeenResponded = true;
                        matchIsConfirmed = true;
                    }

                    const newerResponses = messages.filter(m =>
                        m.match_id === msg.match_id &&
                        (m.message_type === 'accepted' || m.message_type === 'rejected' || m.message_type === 'counter_proposal') &&
                        new Date(m.created_at) > new Date(msg.created_at)
                    );
                    if (newerResponses.length > 0) hasBeenResponded = true;
                }

                // "Pending" = Unread OR (Proposal that hasn't been responded/confirmed yet)
                const isPending = isUnread || (isProposalType && !hasBeenResponded && !matchIsConfirmed);

                if (isPending) pendingParams.push({ msg, hasBeenResponded, matchIsConfirmed });
                else historyParams.push({ msg, hasBeenResponded, matchIsConfirmed });
            });


            // --- TEMPLATE HELPERS ---
            const renderListItem = (params) => {
                const { msg } = params;
                const date = new Date(msg.created_at).toLocaleDateString();
                const senderName = msg.sender?.name || 'Sistema';

                let iconName = 'mail-outline';
                let iconColor = 'var(--text-muted)';
                let title = 'Mensaje';
                let preview = msg.comment || 'Sin contenido adicional';

                if (msg.message_type === 'proposal') {
                    iconName = 'calendar-outline';
                    iconColor = '#f59e0b';
                    title = 'Propuesta de Partido';
                    const p = msg.proposal_data;
                    preview = `Propone: ${p.date} ${p.time}`;
                } else if (msg.message_type === 'counter_proposal') {
                    iconName = 'swap-horizontal-outline';
                    iconColor = '#8b5cf6';
                    title = 'Contrapropuesta';
                    const p = msg.proposal_data;
                    preview = `Propone: ${p.date} ${p.time}`;
                } else if (msg.message_type === 'accepted') {
                    iconName = 'checkmark-circle-outline';
                    iconColor = '#22c55e';
                    title = 'Propuesta Aceptada';
                    preview = 'Tu propuesta ha sido aceptada.';
                } else if (msg.message_type === 'rejected') {
                    iconName = 'close-circle-outline';
                    iconColor = '#ef4444';
                    title = 'Propuesta Rechazada';
                    preview = 'Tu propuesta fue rechazada.';
                }

                const isUnread = !msg.is_read;
                const fontWeight = isUnread ? '600' : '400';
                const bg = isUnread ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent';
                const borderLeft = isUnread ? `4px solid var(--primary)` : '4px solid transparent';

                return `
                <div onclick="app.openMessageDetailModal('${msg.id}')" 
                     style="display:flex; align-items:center; gap:1rem; padding:1rem; border-bottom:1px solid var(--border); cursor:pointer; background:${bg}; border-left:${borderLeft}; transition:background 0.2s;"
                     onmouseover="this.style.background='var(--bg-secondary)'"
                     onmouseout="this.style.background='${bg}'">
                    
                    <div style="font-size:1.5rem; color:${iconColor}; display:flex; align-items:center;">
                        <ion-icon name="${iconName}"></ion-icon>
                    </div>
                    
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                            <span style="color:var(--text-main); font-weight:${fontWeight}; font-size:0.95rem;">${senderName}</span>
                            <span style="color:var(--text-muted); font-size:0.75rem;">${date}</span>
                        </div>
                        <div style="color:var(--text-main); font-size:0.9rem; margin-bottom:0.2rem; font-weight:${fontWeight};">${title}</div>
                        <div style="color:var(--text-muted); font-size:0.85rem; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:250px;">
                            ${preview}
                        </div>
                    </div>

                    <div style="color:var(--text-muted);">
                        <ion-icon name="chevron-forward-outline"></ion-icon>
                    </div>
                </div>
                `;
            };


            let html = '<div style="max-width:800px; margin:0 auto;">';

            // PENDING SECTION
            if (pendingParams.length > 0) {
                html += `
                    <h3 style="margin:1.5rem 0 1rem 0; color:var(--primary); padding-left:0.5rem; border-left:3px solid var(--primary);">Pendientes (${pendingParams.length})</h3>
                    <div style="background:var(--bg-main); border-radius:0.5rem; border:1px solid var(--border); overflow:hidden;">
                        ${pendingParams.map(renderListItem).join('')}
                    </div>
                `;
            } else {
                html += `
                    <h3 style="margin:1.5rem 0 1rem 0; color:var(--text-muted);">Pendientes</h3>
                    <div style="padding:1rem; text-align:center; color:var(--text-muted); font-style:italic; background:var(--bg-main); border-radius:0.5rem; border:1px solid var(--border);">
                        No tienes mensajes pendientes.
                    </div>
                `;
            }

            // HISTORY SECTION
            if (historyParams.length > 0) {
                html += `
                    <h3 style="margin:2rem 0 1rem 0; color:var(--text-muted); padding-left:0.5rem; border-left:3px solid var(--text-muted);">Historial</h3>
                    <div style="background:var(--bg-main); border-radius:0.5rem; border:1px solid var(--border); overflow:hidden;">
                        ${historyParams.map(renderListItem).join('')}
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

            // Store for local lookup
            this._currentMessagesCache = messages;

        } catch (e) {
            console.error('Error loading messages:', e);
            container.innerHTML = `<p style="color:red">Error cargando mensajes: ${e.message}</p>`;
        }
    }

    // Generic/Duplicate proposal-match UI methods removed to allow simple notification flow to work.
    /*
    openMessageDetailModal(messageId) {
        // ... removed
    }

    getMessageTypeLabel(type) {
        // ... removed
    }

    updateMessagesBadge() {
        // ... removed
    }

    markMessageAsRead(messageId) {
        // ... removed 
    }
    */

    async acceptMessageProposal(messageId, matchId) {
        try {
            // Get the message to extract proposal data
            const messages = await db.messages.getByMatch(matchId);
            const proposal = messages.find(m => m.id === messageId)?.proposal_data;

            if (!proposal) {
                alert('Error: No se encontró la propuesta.');
                return;
            }

            // Confirm the schedule
            const scheduledAt = new Date(`${proposal.date}T${proposal.time}:00`).toISOString();
            await db.matches.confirmSchedule(matchId, scheduledAt, proposal.court_slot_id);

            // Mark message as read
            await db.messages.markAsRead(messageId);

            // Notify the other player
            const match = await db.matches.getById(matchId);
            const recipientId = match.player1_id === this.currentUser.id ? match.player2_id : match.player1_id;

            await db.messages.create({
                match_id: matchId,
                sender_id: this.currentUser.id,
                recipient_id: recipientId,
                message_type: 'accepted',
                proposal_data: proposal,
                comment: `Partido confirmado para ${proposal.date} a las ${proposal.time} `
            });

            alert('¡Partido confirmado!');
            this.renderMessagesView(document.getElementById('view-container'));

        } catch (err) {
            console.error('Error accepting proposal:', err);
            alert('Error al aceptar: ' + err.message);
        }
    }

    async rejectMessageProposal(messageId, matchId) {
        try {
            // Get the message
            const messages = await db.messages.getByMatch(matchId);
            const proposal = messages.find(m => m.id === messageId)?.proposal_data;

            // Reset match scheduling status
            await db.matches.rejectSchedule(matchId);

            // Mark message as read
            await db.messages.markAsRead(messageId);

            // Notify the other player
            const match = await db.matches.getById(matchId);
            const recipientId = match.player1_id === this.currentUser.id ? match.player2_id : match.player1_id;

            await db.messages.create({
                match_id: matchId,
                sender_id: this.currentUser.id,
                recipient_id: recipientId,
                message_type: 'rejected',
                proposal_data: proposal,
                comment: 'El horario propuesto fue rechazado. Por favor propone otro horario.'
            });

            alert('Propuesta rechazada. El rival recibirá una notificación.');
            this.renderMessagesView(document.getElementById('view-container'));

        } catch (err) {
            console.error('Error rejecting proposal:', err);
            alert('Error al rechazar: ' + err.message);
        }
    }

    async showCounterProposalModal(messageId, matchId) {
        // Mark original as read
        await db.messages.markAsRead(messageId);

        // Open the scheduling modal for counter-proposal
        this.openSchedulingModal(matchId);
    }

    // Modify existing submitProposal to also create a message
    async createProposalMessage(matchId, proposalData) {
        try {
            const match = await db.matches.getById(matchId);
            const recipientId = match.player1_id === this.currentUser.id ? match.player2_id : match.player1_id;

            await db.messages.create({
                match_id: matchId,
                sender_id: this.currentUser.id,
                recipient_id: recipientId,
                message_type: 'proposal',
                proposal_data: proposalData,
                comment: null
            });
        } catch (err) {
            console.error('Error creating proposal message:', err);
        }
    }

    async renderProfileView(container) {
        this.showLoading(container, 'Cargando tu perfil...');

        try {
            // Re-fetch current user to be sure we have latest data
            const user = await db.auth.getCurrentUser();
            if (!user) throw new Error('No se encontró el usuario.');

            const instName = user.institution || 'Sin institución';

            container.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; padding: 1rem;">
                    <div class="card" style="padding: 2rem; border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                        <div style="text-align: center; margin-bottom: 2rem;">
                            <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; font-weight: bold; margin: 0 auto 1rem; border: 4px solid rgba(255,255,255,0.1);">
                                ${user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <h2 style="margin: 0; color: var(--text-main); font-size: 1.75rem;">${user.name} ${user.lastname || ''}</h2>
                            <p style="color: var(--primary); margin: 0.5rem 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">${user.role === 'player' ? 'Jugador' : (user.role === 'superadmin' ? 'Super Admin' : 'Organizador')}</p>
                        </div>
                        
                        <form id="profile-edit-form">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">Nombre</label>
                                    <input type="text" id="profile-name" class="form-input" value="${user.name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Apellido</label>
                                    <input type="text" id="profile-lastname" class="form-input" value="${user.lastname || ''}" required>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1.5rem;">
                                <label class="form-label">Correo Electrónico (No editable)</label>
                                <input type="email" class="form-input" value="${user.email}" disabled style="background: rgba(0,0,0,0.2); cursor: not-allowed; opacity: 0.7;">
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">DNI</label>
                                    <input type="text" id="profile-dni" class="form-input" value="${user.dni || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Teléfono</label>
                                    <input type="tel" id="profile-phone" class="form-input" value="${user.phone || ''}">
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                                <div class="form-group">
                                    <label class="form-label">Institución</label>
                                    <input type="text" class="form-input" value="${instName}" disabled style="background: rgba(0,0,0,0.2); cursor: not-allowed; opacity: 0.7;">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Categoría</label>
                                    <input type="text" class="form-input" value="${user.category || 'N/A'}" disabled style="background: rgba(0,0,0,0.2); cursor: not-allowed; opacity: 0.7;">
                                    <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4;">Para cambiar de categoría o institución, contacta a la administración.</p>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; border-top: 1px solid var(--border); padding-top: 2rem;">
                                <button type="submit" class="cta-btn" style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                    <ion-icon name="save-outline"></ion-icon> Guardar Cambios
                                </button>
                                <button type="button" class="cta-btn secondary" onclick="app.navigateTo('dashboard')" style="flex: 1;">
                                    Volver
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // Bind submit event
            const form = document.getElementById('profile-edit-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitProfileUpdate(user.id);
            });

        } catch (e) {
            console.error('Error rendering profile:', e);
            container.innerHTML = `
                <div class="card" style="padding: 2rem; text-align: center; color: #ef4444; margin: 1rem;">
                    <ion-icon name="alert-circle-outline" style="font-size: 3rem;"></ion-icon>
                    <p style="margin-top: 1rem;">Error cargando el perfil: ${e.message}</p>
                    <button class="cta-btn" onclick="app.navigateTo('dashboard')" style="margin-top: 1rem;">Volver al Inicio</button>
                </div>
            `;
        }
    }

    async submitProfileUpdate(userId) {
        const name = document.getElementById('profile-name').value;
        const lastname = document.getElementById('profile-lastname').value;
        const dni = document.getElementById('profile-dni').value;
        const phone = document.getElementById('profile-phone').value;

        try {
            this.showToast('Guardando...', 'info');

            await db.users.update(userId, {
                name,
                lastname,
                dni,
                phone
            });

            // Update cache/local data
            if (this.currentUser) {
                this.currentUser.name = name;
                this.currentUser.lastname = lastname;
                this.currentUser.dni = dni;
                this.currentUser.phone = phone;
            }

            // Update UI element in real-time
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = name;

            this.showToast('Perfil actualizado correctamente', 'success');

            // Re-render profile view to show updated data
            this.renderProfileView(document.getElementById('view-container'));

        } catch (e) {
            console.error('Error updating profile:', e);
            this.showToast('Error al actualizar: ' + e.message, 'error');
        }
    }

    async openReportResultModal(matchId) {
        const modal = document.getElementById('base-modal');
        const content = document.getElementById('base-modal-content');

        modal.style.display = 'flex';
        content.innerHTML = '<div class="tennis-ball"></div><p style="text-align:center;">Cargando partido...</p>';

        try {
            const match = await db.matches.getById(matchId);
            if (!match) throw new Error('Partido no encontrado.');

            // Get player names
            const p1Name = match.player1_name || 'Jugador 1';
            const p2Name = match.player2_name || 'Jugador 2';

            content.innerHTML = `
                <div style="position: relative;">
                    <button onclick="document.getElementById('base-modal').style.display='none'" 
                            style="position: absolute; right: -10px; top: -10px; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
                    
                    <h3 style="color: var(--primary); margin-bottom: 0.5rem; text-align: center;">Reportar Resultado</h3>
                    <p style="text-align: center; color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.9rem;">${match.tournaments?.name || 'Torneo'}</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border);">
                        <!-- Set 1 -->
                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center;">
                            <div style="text-align: right; font-weight: 500; font-size: 0.9rem;">${p1Name}</div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="number" id="set1-p1" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                                <span style="color: var(--text-muted); font-weight: bold;">-</span>
                                <input type="number" id="set1-p2" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                            </div>
                            <div style="text-align: left; font-weight: 500; font-size: 0.9rem;">${p2Name}</div>
                        </div>
                        
                        <!-- Set 2 -->
                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center;">
                            <div style="text-align: right; font-weight: 500; font-size: 0.9rem;">${p1Name}</div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="number" id="set2-p1" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                                <span style="color: var(--text-muted); font-weight: bold;">-</span>
                                <input type="number" id="set2-p2" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                            </div>
                            <div style="text-align: left; font-weight: 500; font-size: 0.9rem;">${p2Name}</div>
                        </div>
                        
                        <!-- Set 3 -->
                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center;">
                            <div style="text-align: right; font-weight: 500; font-size: 0.9rem;">${p1Name}</div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="number" id="set3-p1" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                                <span style="color: var(--text-muted); font-weight: bold;">-</span>
                                <input type="number" id="set3-p2" class="form-input" style="width: 55px; text-align: center; padding: 0.5rem; border-color: var(--border);" min="0" max="7" placeholder="0">
                            </div>
                            <div style="text-align: left; font-weight: 500; font-size: 0.9rem;">${p2Name}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                        <button onclick="app.submitMatchReport('${matchId}')" class="cta-btn" style="width: 100%;">Cargar Resultado</button>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; text-align: center; padding: 0 1rem; line-height: 1.4;">
                            <ion-icon name="information-circle-outline" style="vertical-align: middle;"></ion-icon> 
                            Asegúrate de que los datos sean correctos. El organizador podrá modificarlos en caso de error.
                        </p>
                    </div>
                </div>
            `;

        } catch (err) {
            console.error('Error opening report modal:', err);
            content.innerHTML = `<p style="color:red; text-align:center;">Error: ${err.message}</p>`;
        }
    }

    async submitMatchReport(matchId) {
        // Collect scores
        const sets = [];
        for (let i = 1; i <= 3; i++) {
            const p1Val = document.getElementById(`set${i}-p1`).value;
            const p2Val = document.getElementById(`set${i}-p2`).value;
            if (p1Val !== '' && p2Val !== '') {
                sets.push({ p1: parseInt(p1Val), p2: parseInt(p2Val) });
            }
        }

        if (sets.length === 0) return alert('Por favor ingresa al menos un set.');

        // Basic winner determination
        let setsP1 = 0;
        let setsP2 = 0;
        sets.forEach(s => {
            if (s.p1 > s.p2) setsP1++;
            else if (s.p2 > s.p1) setsP2++;
        });

        let winnerId = null;
        let winnerName = null;

        try {
            const match = await db.matches.getById(matchId);
            if (setsP1 > setsP2) {
                winnerId = match.player1_id;
                winnerName = match.player1_name;
            } else if (setsP2 > setsP1) {
                winnerId = match.player2_id;
                winnerName = match.player2_name;
            } else {
                return alert('El marcador debe tener un ganador claro (sets ganados).');
            }

            this.showToast('Actualizando...', 'info');

            await db.matches.updateScore(matchId, sets, winnerId, winnerName);

            this.showToast('Resultado guardado', 'success');
            document.getElementById('base-modal').style.display = 'none';

            // Refresh current view
            this.renderView();

        } catch (err) {
            console.error('Error submitting report:', err);
            alert('Error al guardar el resultado: ' + err.message);
        }
    }

    // =====================================================
    // BOOKING SYSTEM (Reservas)
    // =====================================================

    async renderBookingsView(container) {
        // Different View for Admin/Organizer vs Player
        if (this.currentUser.role === 'admin') {
            await this.renderOrganizerBookings(container);
        } else {
            // Player View using the search-first UI
            this.showLoading(container, 'Cargando sistema de reservas...');
            try {
                if (!this._institutionsCache || this._institutionsCache.length === 0) {
                    this._institutionsCache = await db.institutions.getAll();
                }

                const today = new Date().toISOString().split('T')[0];

                container.innerHTML = `
                    <div style="max-width: 900px; margin: 0 auto; padding: 1rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                            <h3 style="margin:0;"><ion-icon name="calendar-outline"></ion-icon> Reservar una Cancha</h3>
                            <button class="cta-btn secondary" onclick="app.renderPlayerBookingsList(document.getElementById('view-container'))">
                                <ion-icon name="list-outline"></ion-icon> Mis Reservas
                            </button>
                        </div>
                        
                        <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
                            <p style="color:var(--text-muted); margin-bottom:1.5rem;">Selecciona un club y la fecha para ver disponibilidad.</p>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; margin-bottom:0.5rem; font-size:0.9rem;">Institución / Club</label>
                                    <select id="booking-inst-select" class="form-input" onchange="app.onBookingFilterChange()">
                                        <option value="">Seleccionar Club...</option>
                                        ${this._institutionsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; margin-bottom:0.5rem; font-size:0.9rem;">Fecha</label>
                                    <input type="text" id="booking-date-input" class="form-input" placeholder="Ingrese la fecha del partido">
                                </div>
                            </div>
                        </div>

                        <div id="booking-slots-container">
                            <div class="text-center" style="padding:3rem; color:var(--text-muted); border:2px dashed var(--border); border-radius:12px;">
                                Selecciona un club y fecha para ver los horarios disponibles.
                            </div>
                        </div>
                    </div>
                `;

                // Initialize Flatpickr
                flatpickr("#booking-date-input", {
                    locale: "es",
                    dateFormat: "Y-m-d",
                    altInput: true,
                    altFormat: "d/m/Y", // Argentine format
                    minDate: "today",
                    // defaultDate: today, // Removed to show placeholder
                    disableMobile: "true",
                    onChange: function (selectedDates, dateStr, instance) {
                        app.onBookingFilterChange();
                    }
                });

            } catch (e) {
                console.error(e);
                container.innerHTML = `<div class="alert error">Error al cargar reservas: ${e.message}</div>`;
            }
        }
    }

    // Modern filter change for Player search UI
    async onBookingFilterChange() {
        const instId = document.getElementById('booking-inst-select')?.value || document.getElementById('book-institution')?.value;
        const date = document.getElementById('booking-date-input')?.value || document.getElementById('book-date')?.value;
        const container = document.getElementById('booking-slots-container');

        if (!instId || !date) {
            if (container) container.innerHTML = '<div class="text-center" style="padding:3rem; color:var(--text-muted);">Selecciona un club para ver los horarios disponibles.</div>';
            return;
        }

        if (container) this.renderBookingSlots(container, instId, date);
    }

    async renderPlayerBookingsList(container) {
        // This replaces the old renderPlayerBookings
        this.showLoading(container, 'Cargando tus reservas...');
        try {
            const bookings = await db.bookings.getByUser(this.currentUser.id);

            container.innerHTML = `
                <div style="max-width:800px; margin:0 auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                        <h3 style="color:var(--primary); margin:0;">Mis Reservas</h3>
                        <button class="cta-btn" onclick="app.renderView()">
                            <ion-icon name="add-circle-outline"></ion-icon> Nueva Reserva
                        </button>
                    </div>

                    ${bookings.length === 0 ?
                    '<div class="card" style="text-align:center; padding:3rem;"><p class="text-muted">No tienes reservas activas.</p></div>' :
                    bookings.map(b => {
                        const instName = b.institutions?.name || 'Club';
                        const dateStr = new Date(b.date + 'T00:00:00').toLocaleDateString();
                        const statusColor = b.status === 'confirmed' ? '#22c55e' : (b.status === 'pending' ? '#eab308' : '#ef4444');
                        const isUnpaid = b.payment_status !== 'paid' && b.total_price > 0 && b.status !== 'rejected';

                        return `
                                <div class="card" style="margin-bottom:1rem; border-left: 4px solid ${statusColor};">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <h4 style="margin:0; color:var(--text-main);">${instName}</h4>
                                            <div style="color:var(--text-muted); margin-top:0.5rem;">
                                                <ion-icon name="calendar-outline"></ion-icon> ${dateStr} 
                                                <ion-icon name="time-outline" style="margin-left:0.5rem;"></ion-icon> ${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}
                                            </div>
                                            <div style="margin-top:0.5rem; font-weight:bold;">${b.court_name || 'Cancha a confirmar'}</div>
                                        </div>
                                        <div style="text-align:right; display:flex; flex-direction:column; gap:0.5rem;">
                                            <div>
                                                <div style="font-weight:bold; font-size:1.2rem; color:var(--accent);">$${b.total_price}</div>
                                                <span style="font-size:0.8rem; text-transform:uppercase; color:${statusColor}; font-weight:bold;">${b.status}</span>
                                            </div>
                                            ${isUnpaid ? `
                                                <button class="cta-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="app.payBooking('${b.id}', '${b.institution_id}', ${b.total_price}, '${instName}')">
                                                    Pagar ahora
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                    }).join('')
                }
                </div>
            `;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="alert error">Error cargando tus reservas.</div>';
        }
    }

    async renderBookingSlots(container, instId, date) {
        container.innerHTML = '<div class="loading-spinner"></div> Buscando disponibilidad...';

        try {
            const slots = await db.courtSlots.getAvailableSlots(instId, date, 60);

            if (slots.length === 0) {
                container.innerHTML = '<p class="text-center" style="color:var(--text-muted);">No hay horarios disponibles para esta fecha.</p>';
                return;
            }


            // Group slots by time
            const groupedSlots = {};
            slots.forEach(s => {
                const timeKey = `${s.time} - ${s.endTime}`;
                if (!groupedSlots[timeKey]) groupedSlots[timeKey] = [];
                groupedSlots[timeKey].push(s);
            });

            const sortedTimes = Object.keys(groupedSlots).sort();

            const inst = this._institutionsCache.find(i => i.id === instId);
            const config = inst?.config_booking || { price_day: 0, price_night: 0, hour_night_start: 19 };

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    ${sortedTimes.map(timeRange => {
                const [start] = timeRange.split(' - ');
                const hour = parseInt(start.split(':')[0]);
                const isNight = hour >= (config.hour_night_start || 19);
                const price = isNight ? config.price_night : config.price_day;

                return `
                        <div class="card" style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;  padding-bottom:0.5rem; margin-bottom:0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <ion-icon name="time-outline" style="color:var(--text-muted); font-size:1.1rem;"></ion-icon>
                                    <span style="font-weight:bold; font-size:1rem; color:var(--text-main);">${timeRange}</span>
                                </div>
                                <div style="font-weight:bold; color:var(--accent); font-size:0.95rem;">$${price}</div>
                            </div>
                            
                            <div style="display:flex; flex-wrap:wrap; gap:0.75rem;">
                                ${groupedSlots[timeRange].map(s => `
                                    <button onclick="app.confirmBooking('${instId}', '${date}', '${s.time}', '${s.endTime}', '${s.courtName}', ${price}, '${s.court_slot_id}')" 
                                            class="cta-btn secondary" 
                                            style="padding: 0.4rem 1rem; font-size:0.85rem; border-radius:0.5rem; border:1px solid var(--primary); background: rgba(139, 92, 246, 0.1); color: white; display:flex; align-items:center; gap:0.5rem; transition: all 0.2s;">
                                        <ion-icon name="tennisball-outline" style="font-size:0.8rem;"></ion-icon>
                                        ${s.courtName}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
            `;

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="alert error">Error buscando horarios.</p>';
        }
    }

    // --- ORGANIZER VIEW (Config & Management) ---
    async renderOrganizerBookings(container) {
        this.showLoading(container, 'Cargando reservas...');
        try {
            // 1. Get Institution Config
            const instId = this.currentUser.institution_id;
            if (!instId) return container.innerHTML = '<div class="alert error">No tienes institución asignada.</div>';

            const { data: inst } = await db.institutions.getAll(); // Or getById
            const myInst = inst?.find(i => i.id === instId);
            const config = myInst?.config_booking || {};

            // 2. Get Pending Bookings
            const bookings = await db.bookings.getByInstitution(instId);

            container.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 300px; gap:2rem;">
                    <!-- Left: Bookings List -->
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3 style="color:var(--primary); margin:0;">Reservas Recientes</h3>
                            <button class="cta-btn secondary" onclick="app.renderOrganizerBookings(document.getElementById('view-container'))">
                                <ion-icon name="refresh-outline"></ion-icon>
                            </button>
                        </div>

                        ${bookings.length === 0 ? '<p class="text-muted">No hay reservas registradas.</p>' : ''}
                        
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                        ${bookings.map(b => {
                const dateStr = new Date(b.date + 'T00:00:00').toLocaleDateString();
                const statusColor = b.status === 'confirmed' ? '#22c55e' : (b.status === 'pending' ? '#eab308' : '#ef4444');
                const extras = b.extras || {};
                const extrasText = [];
                if (extras.balls) extrasText.push('Pelotas');
                if (extras.rackets) extrasText.push(`Raquetas (${extras.rackets})`);

                return `
                                <div class="card" style="display:flex; justify-content:space-between; align-items:center; border-left: 4px solid ${statusColor};">
                                    <div>
                                        <div style="font-weight:bold; font-size:1.1rem;">${b.profiles?.name} ${b.profiles?.lastname || ''}</div>
                                        <div style="color:var(--text-muted); font-size:0.9rem;">
                                            <ion-icon name="calendar-outline"></ion-icon> ${dateStr} 
                                            <span style="margin:0 0.5rem;">|</span>
                                            <ion-icon name="time-outline"></ion-icon> ${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}
                                            <span style="margin:0 0.5rem;">|</span>
                                            <ion-icon name="location-outline"></ion-icon> ${b.court_name || 'Cancha asignada'}
                                        </div>
                                        ${extrasText.length > 0 ? `<div style="font-size:0.8rem; color:var(--accent); margin-top:0.2rem;">Extras: ${extrasText.join(', ')}</div>` : ''}
                                        <div style="font-size:0.8rem; font-weight:bold; margin-top:0.2rem;">Total: $${b.total_price} - Estado: <span style="text-transform:uppercase; color:${statusColor}">${b.status}</span></div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem;">
                                        ${b.status === 'pending' ? `
                                            <button class="cta-btn" style="background:#22c55e; padding:0.5rem;" onclick="app.updateBookingStatus('${b.id}', 'confirmed')">
                                                <ion-icon name="checkmark-outline"></ion-icon>
                                            </button>
                                            <button class="cta-btn" style="background:#ef4444; padding:0.5rem;" onclick="app.updateBookingStatus('${b.id}', 'rejected')">
                                                <ion-icon name="close-outline"></ion-icon>
                                            </button>
                                        ` : ''}
                                        <button class="cta-btn secondary" style="padding:0.5rem;" onclick="app.showToast('Detalle no implementado aún', 'info')">
                                            <ion-icon name="eye-outline"></ion-icon>
                                        </button>
                                    </div>
                                </div>
                            `;
            }).join('')}
                        </div>
                    </div>

                    <!-- Right: Config Panel -->
                    <div class="card" style="height:fit-content;">
                        <h4 style="color:var(--accent); margin-top:0;">Configuración de Reservas</h4>
                        <form id="booking-config-form">
                            <div class="form-group">
                                <label>Precio Diurno (por hora)</label>
                                <input type="number" id="cfg-price-day" value="${config.price_day || 0}">
                            </div>
                            <div class="form-group">
                                <label>Precio Nocturno (por hora)</label>
                                <input type="number" id="cfg-price-night" value="${config.price_night || 0}">
                            </div>
                            <div class="form-group">
                                <label>Hora Inicio Nocturno (0-23)</label>
                                <input type="number" id="cfg-hour-night" value="${config.hour_night_start || 19}">
                            </div>
                            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <input type="checkbox" id="cfg-allow-balls" ${config.allow_balls ? 'checked' : ''}>
                                    <label>Alq. Pelotas</label>
                                </div>
                                <input type="number" id="cfg-price-balls" value="${config.price_balls || 0}" style="width:100px; padding:0.5rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border); border-radius:0.5rem;" placeholder="$">
                            </div>
                            <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <input type="checkbox" id="cfg-allow-rackets" ${config.allow_rackets ? 'checked' : ''}>
                                    <label>Alq. Raquetas</label>
                                </div>
                                <input type="number" id="cfg-price-rackets" value="${config.price_rackets || 0}" style="width:100px; padding:0.5rem; background:var(--bg-main); color:var(--text-main); border:1px solid var(--border); border-radius:0.5rem;" placeholder="$">
                            </div>
                            <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                                <input type="checkbox" id="cfg-members-only" ${config.members_only ? 'checked' : ''}>
                                <label>Solo Socios</label>
                            </div>
                            
                            <button type="button" class="cta-btn full-width" onclick="app.saveBookingConfig('${instId}')">Guardar Configuración</button>
                        </form>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="alert error">Error cargando panel de reservas.</div>';
        }
    }

    async saveBookingConfig(instId) {
        const config = {
            price_day: Number(document.getElementById('cfg-price-day').value),
            price_night: Number(document.getElementById('cfg-price-night').value),
            hour_night_start: Number(document.getElementById('cfg-hour-night').value),
            allow_balls: document.getElementById('cfg-allow-balls').checked,
            price_balls: Number(document.getElementById('cfg-price-balls').value),
            allow_rackets: document.getElementById('cfg-allow-rackets').checked,
            price_rackets: Number(document.getElementById('cfg-price-rackets').value),
            members_only: document.getElementById('cfg-members-only').checked
        };

        try {
            await db.institutions.update(instId, { config_booking: config });
            this.showToast('Configuración guardada', 'success');
        } catch (e) {
            this.showToast('Error al guardar', 'error');
            console.error(e);
        }
    }

    async updateBookingStatus(id, status) {
        if (!confirm(`¿Confirmar cambio a estado ${status}?`)) return;
        try {
            await db.bookings.updateStatus(id, status);
            this.showToast('Estado actualizado', 'success');
            // Refresh
            this.renderBookingsView(document.getElementById('view-container'));
        } catch (e) {
            this.showToast('Error al actualizar', 'error');
        }
    }



    showNewBookingModal() {
        // Modal for searching slots
        // 1. Select Institution
        // 2. Select Date
        // 3. API call to getAvailableSlots
        // 4. Show slots -> Click to Book

        const modalHtml = `
            <div id="booking-modal" class="modal active" style="display:flex;">
                <div class="modal-content" style="max-width:600px; width:100%;">
                    <div class="modal-header">
                        <h3>Reservar Cancha</h3>
                        <span class="close-modal" onclick="document.getElementById('booking-modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Club / Institución</label>
                            <select id="book-institution" class="form-control" onchange="app.onBookingFilterChange()">
                                <option value="">Selecciona un club...</option>
                                ${this._institutionsCache?.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha</label>
                            <input type="date" id="book-date" class="form-control" onchange="app.onBookingFilterChange()">
                        </div>

                        <div id="booking-slots-container" style="margin-top:2rem; min-height:100px;">
                            <p class="text-muted text-center">Selecciona club y fecha para ver horarios.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];

        // Initialize Flatpickr for booking modal
        flatpickr("#book-date", {
            locale: "es",
            minDate: "today",
            dateFormat: "Y-m-d",
            defaultDate: today,
            disableMobile: "true",
            theme: "dark",
            onChange: function (selectedDates, dateStr, instance) {
                app.onBookingFilterChange();
            }
        });

        // document.getElementById('book-date').value = today; // Handled by defaultDate in flatpickr
    }


    async confirmBooking(instId, date, startTime, endTime, courtName, basePrice, courtSlotId) {
        // Show confirmation with Extras
        const inst = this._institutionsCache.find(i => i.id === instId);
        const config = inst?.config_booking || {};

        const container = document.getElementById('booking-slots-container');

        container.innerHTML = `
            <div class="card" style="background:var(--bg-main);">
                <h4 style="margin-top:0;">Confirmar Reserva</h4>
                <div style="margin-bottom:1rem; font-size:1.1rem;">
                    <strong>${inst.name} - ${courtName}</strong><br>
                    <div style="margin-top:0.5rem; color:var(--text-muted); font-size:1rem;">
                         Start: ${date.split('-').reverse().join('/')} <br>
                         Horario: ${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}
                    </div>
                    <div style="margin-top:0.5rem; color:var(--accent); font-weight:bold;">
                        Precio: $${basePrice}
                    </div>
                </div>

                <div style="margin-bottom:1rem;">
                    <h5>Extras</h5>
                    ${config.allow_balls ? `
                        <div style="display:flex; justify-content:space-between;">
                            <label><input type="checkbox" id="extra-balls"> Pelotas (+$${config.price_balls})</label>
                        </div>
                    ` : ''}
                    ${config.allow_rackets ? `
                         <div style="display:flex; justify-content:space-between;">
                            <label><input type="checkbox" id="extra-rackets"> Raquetas (+$${config.price_rackets})</label>
                        </div>
                    ` : ''}
                </div>

                <div style="margin-top:2rem;">
                    <h5 style="margin-bottom:0.5rem;">Método de Pago</h5>
                    <div style="display:grid; gap:1rem;">
                        <button class="cta-btn" style="background:#009ee3; color:white; display:flex; justify-content:center; align-items:center; gap:0.5rem;" 
                                onclick="app.submitBooking('${instId}', '${date}', '${startTime}', '${endTime}', '${courtName}', ${basePrice}, '${courtSlotId}', 'mp')">
                            <ion-icon name="card-outline"></ion-icon> Pagar con Mercado Pago
                        </button>
                        
                        <button class="cta-btn secondary" style="display:flex; justify-content:center; align-items:center; gap:0.5rem;" 
                                onclick="app.submitBooking('${instId}', '${date}', '${startTime}', '${endTime}', '${courtName}', ${basePrice}, '${courtSlotId}', 'transfer')">
                            <ion-icon name="swap-horizontal-outline"></ion-icon> Pagar con Transferencia (A confirmar)
                        </button>
                    </div>
                    <div style="text-align:center; margin-top:1rem;">
                         <button class="text-link" onclick="app.onBookingFilterChange()">Cancelar y Volver</button>
                    </div>
                </div>
            </div>
        `;
    }

    async submitBooking(instId, date, startTime, endTime, courtName, basePrice, courtSlotId, paymentMethod = 'mp') {
        const inst = this._institutionsCache.find(i => i.id === instId);
        const config = inst?.config_booking || {};

        let totalPrice = basePrice;
        const extras = {};

        const ballsChk = document.getElementById('extra-balls');
        if (ballsChk && ballsChk.checked) {
            totalPrice += (config.price_balls || 0);
            extras.balls = true;
        }

        const racketsChk = document.getElementById('extra-rackets');
        if (racketsChk && racketsChk.checked) {
            totalPrice += (config.price_rackets || 0);
            extras.rackets = 1; // Simplified
        }

        try {
            const booking = await db.bookings.create({
                institution_id: instId,
                user_id: this.currentUser.id,
                date,
                start_time: startTime,
                end_time: endTime,
                court_name: courtName,
                court_slot_id: courtSlotId,
                status: 'pending',
                total_price: totalPrice,
                extras: extras,
                payment_method: paymentMethod // Should store this if DB has column, otherwise status/history implies it
            });

            // 1. Check for MP Token
            const instData = await db.institutions.getMPCredentials(instId);
            const accessToken = instData?.mp_access_token;

            // HANDLE PAYMENT METHOD
            if (paymentMethod === 'mp' && accessToken && totalPrice > 0) {
                // Show redirection message
                const container = document.getElementById('booking-slots-container');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center" style="padding:2rem;">
                            <div class="loading-spinner"></div>
                            <p>Reserva registrada. Redirigiendo a Mercado Pago...</p>
                        </div>
                    `;
                }

                // Trigger Payment
                await this.payBooking(booking.id, instId, totalPrice, inst.name);
                return;
            }

            if (paymentMethod === 'transfer') {
                // Manual transfer branch
                if (document.getElementById('booking-slots-container')) {
                    // Show success/instructions
                    const alias = inst.alias_cbu || 'Consultar al club';
                    const container = document.getElementById('booking-slots-container');
                    container.innerHTML = `
                        <div class="text-center" style="padding:2rem;">
                            <ion-icon name="checkmark-circle-outline" style="font-size:3rem; color:var(--success);"></ion-icon>
                            <h3>¡Solicitud de Reserva Enviada!</h3>
                            <p style="color:var(--text-muted); margin-bottom:1rem;">Tu reserva ha quedado en estado <strong>PENDIENTE</strong>.</p>
                            <div style="background:var(--bg-main); padding:1rem; border-radius:1rem; text-align:left; margin-bottom:1.5rem; border:1px solid var(--border);">
                                <strong>Datos para Transferencia:</strong><br>
                                <div style="margin-top:0.5rem; font-size:1.1rem; color:var(--accent);">
                                    Alias: <strong>${alias}</strong>
                                </div>
                                <br>
                                Por favor realiza la transferencia y envía el comprobante para que confirmen tu turno.<br>
                                <small style="color:var(--text-muted);">La reserva se confirmará manualmente cuando el club verifique el pago.</small>
                            </div>
                            <button class="cta-btn" onclick="app.renderPlayerBookingsList(document.getElementById('view-container'))">Ver Mis Reservas</button>
                        </div>
                     `;
                }
                return;
            }

            // Fallback (no price or something else)
            if (document.getElementById('booking-modal')) document.getElementById('booking-modal').remove();
            this.showToast('¡Solicitud de reserva enviada!', 'success');
            // Refresh list
            this.renderPlayerBookingsList(document.getElementById('view-container'));

        } catch (e) {
            console.error(e);
            alert('Error al crear reserva: ' + e.message);
        }
    }

    async payBooking(bookingId, instId, amount, instName) {
        try {
            this.showToast('Preparando pago...', 'info');

            // Call Edge Function 'create-preference'
            // This securely fetches the token server-side and creates the preference
            const { data, error } = await supabaseClient.functions.invoke('create-preference', {
                body: {
                    bookingId: bookingId,
                    institutionId: instId,
                    amount: amount,
                    title: `Reserva de Cancha: ${instName}`,
                    backUrl: window.location.href // Return to same page
                }
            });

            if (error) {
                // If it's a function error, it might be wrapped
                throw new Error(error.message || 'Error en servicio de pagos');
            }

            if (data && data.init_point) {
                // Redirect to Mercado Pago
                window.location.href = data.init_point;
            } else {
                throw new Error(data?.error || 'No se pudo generar el link de pago.');
            }

        } catch (e) {
            console.error('Booking pay error:', e);
            alert('Error al iniciar pago: ' + (e.message || e));
            // Close modal if open to prevent multiple clicks? 
            // Better to leave it open so they can retry or cancel.
        }
    }

}

// Global instance
window.app = new App();
