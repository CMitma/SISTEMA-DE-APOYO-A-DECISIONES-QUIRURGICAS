document.addEventListener("DOMContentLoaded", () => {
    // Pantallas
    const loginForm = document.getElementById("loginForm");
    const loginScreen = document.getElementById("login-screen");
    const appMain = document.getElementById("appMain");
    const btnLogout = document.getElementById("btnLogout");

    // Buscador interactivo de pacientes y selectores
    const buscarPaciente = document.getElementById("buscar-paciente");
    const lblPacienteId = document.getElementById("lbl-paciente-id");
    const selectOperacion = document.getElementById("select-operacion");

    // Botones de acción 
    const btnReiniciar = document.querySelector(".btn-secondary");
    const btnConcluir = document.querySelector(".btn-primary");
    const badgeMonitor = document.querySelector(".badge-active");
    const riesgoFill = document.querySelector(".progress-bar-fill");
    const riesgoTexto = document.querySelector(".risk-header strong");
    const riesgoFooter = document.querySelector(".risk-footer");

    // Monitor de Telemetría
    const fcElem = document.getElementById("val-fc");
    const paElem = document.getElementById("val-pa");
    const spo2Elem = document.getElementById("val-spo2");

    let intervalId = null;

    // --- BASE DE DATOS DE EJEMPLO (Pacientes e Intervenciones con consecuencias) ---
    const pacientesData = {
        "Mariano Valenzuela": { id: "PT-7724", clave: "p1" },
        "Elena Rostova": { id: "PT-3091", clave: "p2" },
        "Carlos Mendoza": { id: "PT-5541", clave: "p3" }
    };

    const escenariosSimulacion = {
        // Bypass Coronario: Riesgo moderado, signos ligeramente altos
        op1: {
            riesgo: "4%",
            colorRiesgo: "#22c55e",
            footer: "Estabilidad hemodinámica monitorizada (Grafos estables)",
            estados: [
                { fc: "76", pa: "121/84", spo2: "100%" },
                { fc: "72", pa: "124/85", spo2: "100%" },
                { fc: "69", pa: "116/76", spo2: "99%" }
            ]
        },
        // Reemplazo de Válvula: Riesgo alto, arritmia/frecuencia inestable
        op2: {
            riesgo: "38%",
            colorRiesgo: "#f97316", // Naranja
            footer: "Alerta: Fluctuaciones críticas detectadas en gradiente de presión",
            estados: [
                { fc: "94", pa: "138/91", spo2: "96%" },
                { fc: "105", pa: "142/95", spo2: "95%" },
                { fc: "88", pa: "130/88", spo2: "97%" }
            ]
        },
        // Aneurisma: Riesgo crítico inmediato, hipertensión simulada severa
        op3: {
            riesgo: "74%",
            colorRiesgo: "#dc2626", // Rojo peligro
            footer: "Peligro Inminente: Tensión límite en la pared aórtica. Reducir carga",
            estados: [
                { fc: "112", pa: "168/104", spo2: "94%" },
                { fc: "120", pa: "175/110", spo2: "93%" },
                { fc: "115", pa: "162/99", spo2: "94%" }
            ]
        }
    };

    // --- CONTROL DE ACCESO ---
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (loginScreen) loginScreen.style.display = "none";
            if (appMain) appMain.style.display = "flex"; 
            actualizarYArrancarEscenario();
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            if (appMain) appMain.style.display = "none";
            if (loginScreen) loginScreen.style.display = "flex";
            detenerSimulacion();
        });
    }

    // --- DETECTOR DE CAMBIOS EN VIVO ---

    // Lógica limpia para el Buscador Escrito
    if (buscarPaciente) {
        buscarPaciente.addEventListener("input", () => {
            const nombreIntroducido = buscarPaciente.value;

            // Verificamos si lo que escribió el usuario coincide con un paciente real
            if (pacientesData[nombreIntroducido]) {
                const paciente = pacientesData[nombreIntroducido];
                
                // Actualizamos el ID Clínico en la pantalla automáticamente
                if (lblPacienteId) lblPacienteId.innerText = paciente.id;
                
                // Reiniciamos o adaptamos el escenario con el nuevo paciente validado
                actualizarYArrancarEscenario();
            } else {
                // Si borra o escribe algo a medias, muestra que está buscando
                if (lblPacienteId) lblPacienteId.innerText = "Buscando...";
            }
        });
    }

    // Cambiar dinámicamente las consecuencias médicas al cambiar la operación
    if (selectOperacion) {
        selectOperacion.addEventListener("change", () => {
            actualizarYArrancarEscenario();
        });
    }

    // --- ACCIONES INTERACTIVAS EN QUIRÓFANO ---
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", () => {
            detenerSimulacion();
            if (fcElem) fcElem.innerText = "--";
            if (paElem) paElem.innerText = "--/--";
            if (spo2Elem) spo2Elem.innerText = "--%";
            if (badgeMonitor) {
                badgeMonitor.innerText = "RE-CALIBRANDO SIMULADOR...";
                badgeMonitor.style.backgroundColor = "#eab308";
            }
            setTimeout(() => {
                actualizarYArrancarEscenario();
            }, 1200);
        });
    }

    if (btnConcluir) {
        btnConcluir.addEventListener("click", () => {
            detenerSimulacion();
            if (fcElem) fcElem.innerText = "70";
            if (paElem) paElem.innerText = "120/80";
            if (spo2Elem) spo2Elem.innerText = "100%";
            if (badgeMonitor) {
                badgeMonitor.innerText = "CIRUGÍA CONCLUIDA CON ÉXITO";
                badgeMonitor.style.backgroundColor = "#22c55e";
            }
            if (riesgoFill) riesgoFill.style.width = "0%";
            if (riesgoTexto) riesgoTexto.innerText = "0%";
            if (riesgoFooter) riesgoFooter.innerText = "Paciente estabilizado fuera de peligro.";
        });
    }

    // --- MOTOR CENTRAL DE TELEMETRÍA ---
    function actualizarYArrancarEscenario() {
        detenerSimulacion();

        // Obtener datos según la operación seleccionada actualmente
        const operacionActual = selectOperacion ? selectOperacion.value : "op1";
        const datosEscenario = escenariosSimulacion[operacionActual];

        // Actualizar interfaz visual de riesgo
        if (riesgoTexto) riesgoTexto.innerText = datosEscenario.riesgo;
        if (riesgoFill) {
            riesgoFill.style.width = datosEscenario.riesgo;
            riesgoFill.style.backgroundColor = datosEscenario.colorRiesgo;
        }
        if (riesgoFooter) riesgoFooter.innerText = datosEscenario.footer;

        if (badgeMonitor) {
            badgeMonitor.innerText = "MONITOR ACTIVO";
            badgeMonitor.style.backgroundColor = "#ef4444";
        }

        // Iniciar bucle de signos vitales específicos de esta operación
        let index = 0;
        const estados = datosEscenario.estados;
        
        // Carga inicial inmediata
        fcElem.innerText = estados[0].fc;
        paElem.innerText = estados[0].pa;
        spo2Elem.innerText = estados[0].spo2;

        intervalId = setInterval(() => {
            index = (index + 1) % estados.length;
            if (fcElem) fcElem.innerText = estados[index].fc;
            if (paElem) paElem.innerText = estados[index].pa;
            if (spo2Elem) spo2Elem.innerText = estados[index].spo2;
        }, 2500); // Ritmo cardíaco cambia dinámicamente cada 2.5 segs
    }

    function detenerSimulacion() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
});