// ==========================================
// APP.JS — Orquestador principal
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const state = {
        simulations: [
            { id: "SIM-2023-0892", date: "24 Oct 2023, 08:30", patientId: "PT-9921", patientName: "Armando Cisneros", riskLvl: "SEGURO", riskScore: 12, timeEst: "3h 45m", operation: "Bypass Coronario (Complejidad Espacial)", status: "LOCAL" },
            { id: "SIM-2023-0891", date: "24 Oct 2023, 07:15", patientId: "PT-8344", patientName: "Graciela Montenegro", riskLvl: "CRÍTICO", riskScore: 78, timeEst: "5h 20m", operation: "Trasplante Cardiaco de Alta Complex", status: "LOCAL" }
        ]
    };

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

    window.mostrarAlerta = function(titulo, mensaje, tipo = 'info', onConfirm = null) {
        const overlay = document.getElementById('custom-alert');
        const iconEl = document.getElementById('custom-alert-icon');
        document.getElementById('custom-alert-title').textContent = titulo;
        document.getElementById('custom-alert-message').innerHTML = mensaje; 

        if(tipo === 'error' || tipo === 'warning') {
            iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-critical"></i>';
        } else if (tipo === 'success') {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-safe"></i>';
        } else {
            iconEl.innerHTML = '<i class="fa-solid fa-circle-info text-info"></i>';
        }
        
        const oldBtn = document.getElementById('btn-custom-alert-ok');
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        newBtn.addEventListener('click', () => {
            overlay.classList.add('hidden');
            if(onConfirm) onConfirm(); // Ejecuta la función de Playback al cerrar
        });
        
        overlay.classList.remove('hidden');
    };

    const { actualizarVistas } = initHistorial({
        state, navSimulacion, navAnalisis, navHistorial,
        vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual
    });

    const { dropdown, menuOptions, updateNotifVisibility } = initNotificaciones();
    const { resetLogoutTimer, logoutTimerRef } = initConfig({ appMain, btnLogout, updateNotifVisibility });
    
    initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas, logoutTimerRef, selectInactividad: document.getElementById('select-inactividad') });
    initSimulacion({ state, navSimulacion, actualizarVistas });
    const { modalMedico, btnCerrarModal } = initPerfilMedico();

    document.addEventListener('click', (e) => {
        if(!dropdown.classList.contains('hidden') && !document.getElementById('notif-wrapper').contains(e.target)) dropdown.classList.add('hidden');
        if(!menuOptions.classList.contains('hidden') && !document.querySelector('.notif-options-wrapper').contains(e.target)) menuOptions.classList.add('hidden');
        if(e.target === modalMedico) btnCerrarModal.click();
    });

    actualizarVistas(); 
});
