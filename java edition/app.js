// ==========================================
// APP.JS — Orquestador principal de la aplicación
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // URL y Key de supabase 
    const SUPABASE_URL = "https://lepenlrqqeiheqmubaea.supabase.co";
    const SUPABASE_KEY = "sb_publishable_YKjH37Sduf3wE5zNvEqooQ__8JKCCSc";
    
    window.supabaseCliente = null; 
    window.modoDeContingencia = false; 

    const state = {
        doctorLogueado: null,
        simulations: []
    };
    window.state = state; 

    window.agregarNotificacionCampanita = function(titulo, mensaje, tipo = 'info') {
        const notifLista = document.querySelector('.notif-list') || document.getElementById('notif-list');
        const notifBadge = document.querySelector('.notif-badge');
        
        if (notifLista) {
            const mensajeVacio = notifLista.querySelector('.text-center');
            if (mensajeVacio) {
                mensajeVacio.remove();
            }

            const item = document.createElement('div');
            item.className = "notif-item unread";
            item.style = "padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; gap: 10px; align-items: start; background-color: rgba(255,255,255,0.05);";
            
            let icono = '<i class="fa-solid fa-circle-info text-info"></i>';
            if (tipo === 'error') icono = '<i class="fa-solid fa-triangle-exclamation text-critical"></i>';
            if (tipo === 'success') icono = '<i class="fa-solid fa-circle-check text-safe"></i>';

            item.innerHTML = `
                <div style="margin-top: 2px; font-size: 1.2rem;">${icono}</div>
                <div style="flex: 1;">
                    <p style="margin: 0; color: var(--text-primary); font-weight: bold; font-size: 0.9rem;">${titulo}</p>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.8rem;">${mensaje}</p>
                    <span style="font-size: 0.7rem; color: var(--accent-blue); display: block; margin-top: 5px;">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
            notifLista.insertBefore(item, notifLista.firstChild);
            
            if (notifBadge) { 
                notifBadge.classList.remove('hidden'); 
                notifBadge.textContent = parseInt(notifBadge.textContent || 0) + 1; 
            }
        }
    };

    window.addEventListener('offline', () => {
        window.modoDeContingencia = true;
        window.agregarNotificacionCampanita("Sin Conexión a Internet", "Se perdió la conexión. Activando la Base de Datos de Contingencia Local.", "error");
    });

    window.addEventListener('online', () => {
        window.modoDeContingencia = false;
        window.agregarNotificacionCampanita("Conexión Restablecida", "Servidor Supabase en la nube online. Ya puedes sincronizar tus expedientes.", "success");
    });

    try {
        window.supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await window.supabaseCliente.from('doctores').select('id').limit(1);
        if (error) {
            throw error;
        }
        console.log("⚡ [SISTEMA CENTRAL] Conexión exitosa a la base de datos PostgreSQL en la nube.");
    } catch (err) {
        window.modoDeContingencia = true;
        console.warn("⚠️ [MODO CONTINGENCIA] Base de datos principal offline. Conmutando a LocalStorage.");
    }

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

        if (tipo === 'error' || tipo === 'warning') {
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
            if(onConfirm) {
                onConfirm(); 
            }
        });
        
        overlay.classList.remove('hidden');
    };

    window.historialControlador = initHistorial({
        state, navSimulacion, navAnalisis, navHistorial, vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual
    });

    const { dropdown, menuOptions, updateNotifVisibility } = initNotificaciones();
    const { resetLogoutTimer, logoutTimerRef } = initConfig({ appMain, btnLogout, updateNotifVisibility });
    
    initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas: window.historialControlador.actualizarVistas, logoutTimerRef, selectInactividad: document.getElementById('select-inactividad') });
    initSimulacion({ state, navSimulacion, actualizarVistas: window.historialControlador.actualizarVistas });
    

    const { modalMedico, btnCerrarModal } = initPerfilMedico();

    document.addEventListener('click', (e) => {
        if (!dropdown.classList.contains('hidden') && !document.getElementById('notif-wrapper').contains(e.target)) {
            dropdown.classList.add('hidden');
        }
        if (!menuOptions.classList.contains('hidden') && !document.querySelector('.notif-options-wrapper').contains(e.target)) {
            menuOptions.classList.add('hidden');
        }

        if (modalMedico && e.target === modalMedico) {
            btnCerrarModal.click();
        }
    });

    window.historialControlador.cargarSimulacionesDesdeBackend(); 
});
