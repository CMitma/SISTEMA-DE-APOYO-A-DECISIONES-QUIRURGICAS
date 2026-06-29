// ==========================================
// SIMULACIÓN
// ==========================================
function initSimulacion({ state, navSimulacion, actualizarVistas }) {

    const btnConcluirSim = document.getElementById('btn-concluir-sim');
    const btnNuevaSimSidebar = document.getElementById('btn-nueva-sim-sidebar');
    const btnReiniciarSim = document.getElementById('btn-reiniciar-sim');
    const inputPaciente = document.getElementById('buscar-paciente');
    const lblPacienteId = document.getElementById('lbl-paciente-id');
    const selectOperacion = document.getElementById('select-operacion');
    const valFc = document.getElementById('val-fc');
    const valPa = document.getElementById('val-pa');
    const valRiskScore = document.getElementById('val-risk-score');
    const riskBarFill = document.getElementById('risk-bar-fill');

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function generarNuevaSimulacion() {
        inputPaciente.value = "";
        lblPacienteId.textContent = `PT-${randomInt(1000, 9999)}`;
        selectOperacion.selectedIndex = 0;
        let newRisk = randomInt(2, 85);
        valFc.textContent = randomInt(60, 100);
        valPa.textContent = `${randomInt(110, 140)}/${randomInt(70, 90)}`;
        valRiskScore.textContent = `${newRisk}%`;
        riskBarFill.style.width = `${newRisk}%`;
        if (newRisk > 70) riskBarFill.style.backgroundColor = "var(--danger-red)";
        else if (newRisk > 30) riskBarFill.style.backgroundColor = "var(--node-warning)";
        else riskBarFill.style.backgroundColor = "var(--node-safe)";
        navSimulacion.click(); // Navegar a la simulación
    }

    btnNuevaSimSidebar.addEventListener('click', generarNuevaSimulacion);
    btnReiniciarSim.addEventListener('click', generarNuevaSimulacion);

    btnConcluirSim.addEventListener('click', () => {
        let riskScore = parseInt(valRiskScore.textContent);
        let riskLvl = riskScore > 70 ? "CRÍTICO" : (riskScore > 30 ? "CAUTELOSO" : "SEGURO");
        // Crear objeto de simulación
        let nuevaSim = {
            id: `SIM-2023-0${randomInt(900, 999)}`,
            date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            patientId: lblPacienteId.textContent,
            patientName: inputPaciente.value || "Paciente Anónimo",
            riskLvl: riskLvl,
            riskScore: riskScore,
            timeEst: `${randomInt(2, 6)}h ${randomInt(10, 50)}m`,
            operation: selectOperacion.value
        };
        // Guardar en el array (al principio)
        state.simulations.unshift(nuevaSim);
        alert(`Simulación ${nuevaSim.id} concluida con éxito y registrada en el sistema.`);
        actualizarVistas();
    });
}
