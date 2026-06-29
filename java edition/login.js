// ==========================================
// LOGIN
// ==========================================
function initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas, logoutTimerRef, selectInactividad }) {

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginScreen.classList.add('hidden');
        appMain.classList.remove('hidden');
        resetLogoutTimer();
        actualizarVistas();
    });

    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        appMain.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginForm.reset();
        clearTimeout(logoutTimerRef.value);
    });
}
