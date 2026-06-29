// ==========================================
// APP.JS — Orquestador principal
// Conecta todos los módulos en un solo DOMContentLoaded
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO COMPARTIDO ---
    const state = {
        simulations: [
            { id: "SIM-2023-0892", date: "24 Oct 2023, 08:30", patientId: "PT-9921", patientName: "Armando Cisneros", riskLvl: "SEGURO", riskScore: 12, timeEst: "3h 45m", operation: "Bypass Coronario (Complejidad Espacial)" },
            { id: "SIM-2023-0891", date: "24 Oct 2023, 07:15", patientId: "PT-8344", patientName: "Graciela Montenegro", riskLvl: "CRÍTICO", riskScore: 78, timeEst: "5h 20m", operation: "Trasplante Cardiaco de Alta Complex" }
        ]
    };

    // --- REFERENCIAS DOM COMPARTIDAS ---
    const loginScreen      = document.getElementById('login-screen');
    const appMain          = document.getElementById('appMain');
    const loginForm        = document.getElementById('loginForm');
    const btnLogout        = document.getElementById('btnLogout');
    const navSimulacion    = document.getElementById('nav-simulacion');
    const navAnalisis      = document.getElementById('nav-analisis');
    const navHistorial     = document.getElementById('nav-historial');
    const vistaSimulacion  = document.getElementById('vista-simulacion');
    const vistaAnalisis    = document.getElementById('vista-analisis');
    const vistaHistorial   = document.getElementById('vista-historial');
    const breadcrumbActual = document.getElementById('breadcrumb-actual');

    // 1. Historial (devuelve actualizarVistas que necesitan otros módulos)
    const { actualizarVistas } = initHistorial({
        state, navSimulacion, navAnalisis, navHistorial,
        vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual
    });

    // 2. Notificaciones (devuelve updateNotifVisibility que necesita config)
    const { dropdown, menuOptions, updateNotifVisibility } = initNotificaciones();

    // 3. Config (devuelve resetLogoutTimer y logoutTimerRef que necesita login)
    const { resetLogoutTimer, logoutTimerRef } = initConfig({ appMain, btnLogout, updateNotifVisibility });

    // 4. Login (usa resetLogoutTimer y actualizarVistas)
    initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas, logoutTimerRef, selectInactividad: document.getElementById('select-inactividad') });

    // 5. Simulación (usa state, navSimulacion y actualizarVistas)
    initSimulacion({ state, navSimulacion, actualizarVistas });

    // 6. Perfil médico (devuelve refs para clics globales)
    const { modalMedico, btnCerrarModal } = initPerfilMedico();

    // --- CLICS GLOBALES para cerrar menús flotantes ---
    document.addEventListener('click', (e) => {
        if(!dropdown.classList.contains('hidden') && !document.getElementById('notif-wrapper').contains(e.target)) dropdown.classList.add('hidden');
        if(!menuOptions.classList.contains('hidden') && !document.querySelector('.notif-options-wrapper').contains(e.target)) menuOptions.classList.add('hidden');
        if(e.target === modalMedico) btnCerrarModal.click();
    });

    // Renderizar vistas iniciales con datos de ejemplo
    actualizarVistas(); 
});
