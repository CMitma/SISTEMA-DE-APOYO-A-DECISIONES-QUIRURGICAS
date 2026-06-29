// ==========================================
// CONFIGURACIÓN
// ==========================================
function initConfig({ appMain, btnLogout, updateNotifVisibility }) {

    const btnConfig = document.getElementById('btn-configuracion');
    const configPanel = document.getElementById('config-panel');
    const configOverlay = document.getElementById('config-overlay');
    const btnCloseConfig = document.getElementById('btn-cerrar-config');
    const selectDensidad = document.getElementById('select-densidad');
    const mainTable = document.getElementById('main-data-table');
    const checkAlertasCriticas = document.getElementById('check-alertas-criticas');
    const selectInactividad = document.getElementById('select-inactividad');

    function openConfig() { configOverlay.classList.remove('hidden'); configPanel.classList.add('open'); }
    function closeConfig() { configOverlay.classList.add('hidden'); configPanel.classList.remove('open'); }

    btnConfig.addEventListener('click', openConfig);
    btnCloseConfig.addEventListener('click', closeConfig);
    configOverlay.addEventListener('click', closeConfig);

    selectDensidad.addEventListener('change', (e) => {
        if(e.target.value === 'compacta') mainTable.classList.add('table-compact');
        else mainTable.classList.remove('table-compact');
    });

    checkAlertasCriticas.addEventListener('change', updateNotifVisibility);

    let logoutTimer;
    const logoutTimerRef = { value: null };

    function resetLogoutTimer() {
        if(appMain.classList.contains('hidden')) return;
        clearTimeout(logoutTimer);
        const minutes = parseInt(selectInactividad.value);
        logoutTimer = setTimeout(() => {
            alert("Sesión cerrada por inactividad (" + minutes + " min).");
            btnLogout.click();
        }, minutes * 60 * 1000);
        logoutTimerRef.value = logoutTimer;
    }

    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => { document.addEventListener(evt, resetLogoutTimer); });
    selectInactividad.addEventListener('change', resetLogoutTimer);

    return { resetLogoutTimer, logoutTimerRef };
}
