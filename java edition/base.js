document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginScreen = document.getElementById("login-screen");
    const appMain = document.getElementById("appMain");
    const btnLogout = document.getElementById("btnLogout");

    // Elementos del monitor en vivo para simular cambios
    const fcElem = document.getElementById("val-fc");
    const paElem = document.getElementById("val-pa");
    const spo2Elem = document.getElementById("val-spo2");

    // 1. Manejo del Login
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Evita recargar página

            // Ocultamos la pantalla de login y activamos el layout médico
            loginScreen.style.display = "none";
            appMain.style.style.display = "flex"; 
            
            // Iniciamos la telemetría dinámica
            startLiveMonitor();
        });
    }

    // 2. Manejo de Cierre de Sesión
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            appMain.style.style.display = "none";
            loginScreen.style.display = "flex";
        });
    }

    // 3. Simulación de signos vitales (Cicla valores reales de tus capturas)
    function startLiveMonitor() {
        const medicalStates = [
            { fc: "69", pa: "116/76", spo2: "99%" },
            { fc: "76", pa: "121/84", spo2: "100%" },
            { fc: "72", pa: "124/85", spo2: "100%" }
        ];
        let index = 0;

        setInterval(() => {
            index = (index + 1) % medicalStates.length;
            
            if (fcElem) fcElem.innerText = medicalStates[index].fc;
            if (paElem) paElem.innerText = medicalStates[index].pa;
            if (spo2Elem) spo2Elem.innerText = medicalStates[index].spo2;
        }, 3000); // Cambia dinámicamente cada 3 segundos
    }
});