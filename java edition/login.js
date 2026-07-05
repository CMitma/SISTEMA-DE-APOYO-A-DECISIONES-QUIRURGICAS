// ==========================================
// LOGIN Y REGISTRO DE ACCESOS (ARCHIVO PLANO)
// ==========================================
function initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas, logoutTimerRef, selectInactividad }) {

    //fallback a base local si se cae la principal
    function conectarBaseDatosLocal() {
        return new Promise((resolve, reject) => {
            console.warn("Intentando conectar a Base de Datos en la nube...");
            setTimeout(() => reject(new Error("Timeout: Base de datos principal no responde.")), 300);
        }).catch(err => {
            console.error(err.message + " -> Ejecutando Fallback a Base de Datos Local.");
            if (!localStorage.getItem('local_db_users')) {
                localStorage.setItem('local_db_users', JSON.stringify([]));
            }
            return true; 
        });
    }

    // Guarda el acceso 
    function registrarAcceso(identificador) {
        let users = JSON.parse(localStorage.getItem('local_db_users')) || [];
        users.push({ id: identificador, loginTime: new Date().toLocaleString() });
        localStorage.setItem('local_db_users', JSON.stringify(users));
        console.log("Acceso registrado en memoria local.");
    }

    // Descargar archivo plano (accesos.txt) al hacer clic en el botón!!!
    const btnDescargarLog = document.getElementById('btn-descargar-log');
    if (btnDescargarLog) {
        btnDescargarLog.addEventListener('click', () => {
            let users = JSON.parse(localStorage.getItem('local_db_users')) || [];
            if (users.length === 0) {
                alert("No hay registros de acceso todavía.");
                return;
            }

            const datosPlano = "=== REGISTRO DE USUARIOS (ARCHIVO PLANO) ===\n\n" + 
                               users.map(u => `QUIROFANO/USUARIO: ${u.id} | FECHA DE ACCESO: ${u.loginTime}`).join("\n");
            
            const blob = new Blob([datosPlano], { type: "text/plain" });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            a.href = url;
            a.download = "accesos.txt";
            a.click(); 
            window.URL.revokeObjectURL(url);
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const identificador = document.getElementById('email').value;
        await conectarBaseDatosLocal();
        registrarAcceso(identificador); // Solo registra, no descarga

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
