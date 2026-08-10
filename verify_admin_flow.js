/**
 * Verification Script for Admin Acceptance Flow
 * To be included in index.html temporarily.
 */

window.runVerification = async function () {
    console.log("%c[VERIFICATION] Starting Admin Acceptance Simulation...", "color: cyan; font-weight: bold; font-size: 1.2em;");

    // Helper: Valid UUIDs to prevent syntax errors if mocks fail
    const MOCK_IDS = {
        ADMIN: '00000000-0000-0000-0000-000000000001',
        PLAYER_PENDING: '00000000-0000-0000-0000-000000000002',
        PLAYER_APPROVED: '00000000-0000-0000-0000-000000000003',
        MSG_1: '00000000-0000-0000-0000-000000000010',
        MSG_2: '00000000-0000-0000-0000-000000000011',
        MSG_3: '00000000-0000-0000-0000-000000000012'
    };

    // 1. Mock Current User as Admin
    console.log("[VERIFICATION] Mocking Current User as Admin...");
    if (!window.auth) window.auth = new Auth();

    window.auth.currentUser = {
        id: MOCK_IDS.ADMIN,
        email: 'admin@demo.com',
        name: 'Admin Simulado',
        role: 'admin',
        institution: 'Club Demo',
        institution_id: 'inst-1',
        is_approved: true
    };

    // Ensure app knows about this user
    if (window.app) {
        window.app.currentUser = window.auth.currentUser;
        if (window.auth.applyRBAC) {
            window.auth.applyRBAC();
        } else {
            console.warn("auth.applyRBAC not found");
        }
    }

    // 2. Mock Database Responses
    console.log("[VERIFICATION] Mocking db.messages.getForUser...");

    // Backup original
    if (!db.messages._originalGetForUser) {
        db.messages._originalGetForUser = db.messages.getForUser;
    }

    // Mock Implementation: getForUser
    db.messages.getForUser = async (userId) => {
        console.log(`[MOCK DB] getForUser called for ${userId}`);
        return [
            // 1. Pending Player Request (Mock Sender)
            {
                id: MOCK_IDS.MSG_1,
                created_at: new Date().toISOString(),
                is_read: false,
                message: 'NUEVO JUGADOR: Sim Player (sim@player.com) solicita unirse en Categoría B.',
                sender_id: MOCK_IDS.PLAYER_PENDING,
                sender: {
                    id: MOCK_IDS.PLAYER_PENDING,
                    name: 'Sim Player',
                    lastname: 'Test',
                    is_approved: false, // Critical for "Pending" status
                    role: 'player'
                }
            },
            // 2. History Message (Approved Player)
            {
                id: MOCK_IDS.MSG_2,
                created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                is_read: true,
                message: 'NUEVO JUGADOR: Approved Player (app@player.com) solicita unirse en Categoría A.',
                sender_id: MOCK_IDS.PLAYER_APPROVED,
                sender: {
                    id: MOCK_IDS.PLAYER_APPROVED,
                    name: 'Approved Player',
                    lastname: 'Ok',
                    is_approved: true, // Already approved
                    role: 'player'
                }
            },
            // 3. Regular Message
            {
                id: MOCK_IDS.MSG_3,
                created_at: new Date().toISOString(),
                is_read: false,
                message: 'Hola profesor, ¿a qué hora es el torneo?',
                sender_id: MOCK_IDS.PLAYER_APPROVED,
                sender: {
                    id: MOCK_IDS.PLAYER_APPROVED,
                    name: 'Approved Player',
                    is_approved: true,
                    role: 'player'
                }
            }
        ];
    };

    // Mock Implementation: create (for Reply)
    db.messages.create = async (msgData) => {
        console.log(`%c[MOCK DB] messages.create INTERCEPTED`, "color: magenta; font-weight: bold;");
        console.log("Message Data:", msgData);
        alert(`[SIMULATION] Message Sent to ${msgData.recipient_id}:\n${msgData.message}`);
        return { data: { id: 'mock-msg-new-' + Date.now() }, error: null };
    };

    // Mock Implementation: markAsRead (to prevent PGRST116)
    db.messages.markAsRead = async (msgId) => {
        console.log(`%c[MOCK DB] messages.markAsRead INTERCEPTED for ${msgId}`, "color: magenta;");
        return { data: { id: msgId, is_read: true }, error: null };
    };

    // Mock DB calls for actions
    console.log("[VERIFICATION] Mocking db.users.approveUser...");

    // Backup original if needed
    if (!db.users._originalApproveUser) {
        db.users._originalApproveUser = db.users.approveUser;
    }

    // Force override
    db.users.approveUser = async (id, cat) => {
        console.log(`%c[MOCK DB] approveUser INTERCEPTED for User ${id} -> Cat ${cat}`, "color: lime; font-weight: bold; font-size: 1.1em;");

        // Return a fake success response matching Supabase format
        return {
            data: [{ id: id, is_approved: true, category: cat }],
            error: null
        };
    };

    console.log("[VERIFICATION] Mocking db.users.rejectUser...");
    db.users.rejectUser = async (id) => {
        console.log(`%c[MOCK DB] rejectUser INTERCEPTED for User ${id}`, "color: red; font-weight: bold;");
        return { error: null };
    };

    // Mock renderDashboardView to prevent errors when it tries to load real data
    console.log("[VERIFICATION] Mocking app.renderDashboardView...");
    app.renderDashboardView = async () => {
        console.log("[MOCK UI] renderDashboardView skipped to prevent unrelated errors.");
    };

    // 3. Render View
    console.log("[VERIFICATION] Rendering Messages View...");
    app.navigateTo('messages');

    console.log("%c[VERIFICATION] Ready. IDs are now valid UUIDs.", "color: cyan;");
};
