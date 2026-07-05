// ==========================================
// SIMULACIÓN Y GRAFOS
// ==========================================
function initSimulacion({ state, navSimulacion, actualizarVistas }) {

    const btnConcluirSim = document.getElementById('btn-concluir-sim');
    const btnNuevaSimSidebar = document.getElementById('btn-nueva-sim-sidebar');
    const btnReiniciarSim = document.getElementById('btn-reiniciar-sim');
    const btnSalirPlayback = document.getElementById('btn-salir-playback');
    const inputPaciente = document.getElementById('buscar-paciente');
    const lblPacienteId = document.getElementById('lbl-paciente-id');
    const selectOperacion = document.getElementById('select-operacion');
    
    const valFc = document.getElementById('val-fc');
    const valPa = document.getElementById('val-pa');
    const valRiskScore = document.getElementById('val-risk-score');
    const riskBarFill = document.getElementById('risk-bar-fill');
    const ecgWave = document.querySelector('.ecg-wave'); 

    const btnVerGrafo = document.getElementById('btn-ver-grafo');
    const modalGrafo = document.getElementById('modal-grafo');
    const btnCerrarGrafo = document.getElementById('btn-cerrar-grafo');
    const canvasGrafo = document.getElementById('canvas-grafo');

    let simInterval = null; 
    let grafoActual = [];
    let posicionesNodos = []; 
    let rutaOptimaActual = [];
    let fcActual = 80;
    let paSistActual = 120;
    let paDiastActual = 80;

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function obtenerConfiguracionOperacion(op) {
        if (op.includes("Trasplante")) return { nodos: 150, baseRiesgo: 40, baseFc: 90 };
        if (op.includes("Válvula")) return { nodos: 80, baseRiesgo: 10, baseFc: 70 };
        return { nodos: 110, baseRiesgo: 20, baseFc: 80 }; 
    }

    function generarGrafoYPosiciones(numNodos) {
        let grafo = Array.from({length: numNodos}, () => []);
        let posiciones = [];
        for(let i=0; i<numNodos; i++) {
            posiciones.push({ x: randomInt(30, 770), y: randomInt(30, 370) });
            let conexiones = randomInt(1, 3); 
            for(let e=0; e<conexiones; e++) {
                let destino = randomInt(0, numNodos-1);
                let pesoIsquemia = randomInt(1, 20); 
                if(destino !== i && !grafo[i].some(n => n.nodo === destino)) {
                    grafo[i].push({nodo: destino, peso: pesoIsquemia});
                    grafo[destino].push({nodo: i, peso: pesoIsquemia}); 
                }
            }
        }
        return { grafo, posiciones };
    }

    function dijkstra(grafo, inicio, fin) {
        let distancias = Array(grafo.length).fill(Infinity);
        let previos = Array(grafo.length).fill(null);
        let visitados = Array(grafo.length).fill(false);
        distancias[inicio] = 0;

        for(let i=0; i<grafo.length; i++) {
            let minIdx = -1;
            for(let j=0; j<grafo.length; j++) {
                if(!visitados[j] && (minIdx === -1 || distancias[j] < distancias[minIdx])) minIdx = j;
            }
            if(distancias[minIdx] === Infinity) break;
            visitados[minIdx] = true;

            for(let arista of grafo[minIdx]) {
                if(distancias[minIdx] + arista.peso < distancias[arista.nodo]) {
                    distancias[arista.nodo] = distancias[minIdx] + arista.peso;
                    previos[arista.nodo] = minIdx;
                }
            }
        }
        let ruta = [];
        let actual = fin;
        while(actual !== null) { ruta.unshift(actual); actual = previos[actual]; }
        return { distancia: distancias[fin] === Infinity ? randomInt(30, 80) : distancias[fin], camino: ruta };
    }

    function prim(grafo) {
        let visitados = Array(grafo.length).fill(false);
        let minPesos = Array(grafo.length).fill(Infinity);
        minPesos[0] = 0;
        let totalPesoArbol = 0;

        for(let i=0; i<grafo.length; i++) {
            let u = -1;
            for(let j=0; j<grafo.length; j++) {
                if(!visitados[j] && (u === -1 || minPesos[j] < minPesos[u])) u = j;
            }
            if(minPesos[u] === Infinity) break;
            visitados[u] = true;
            totalPesoArbol += minPesos[u];

            for(let arista of grafo[u]) {
                if(!visitados[arista.nodo] && arista.peso < minPesos[arista.nodo]) minPesos[arista.nodo] = arista.peso;
            }
        }
        return totalPesoArbol;
    }

    function calcularNivelDeRiesgoAnalizado(rutaDijkstra, pesoPrim, frecCardiaca, presSistolica, baseRiesgo) {
        let impactoGrafo = (rutaDijkstra * 0.3) + (pesoPrim * 0.005);
        let impactoVital = 0;
        if (frecCardiaca < 60 || frecCardiaca > 100) impactoVital += 15;
        if (presSistolica < 90 || presSistolica > 140) impactoVital += 20;
        return Math.min(Math.max(Math.round(baseRiesgo + impactoGrafo + impactoVital), 2), 99); 
    }

    function dibujarVisualizacionGrafo() {
        if (!canvasGrafo || grafoActual.length === 0) return;
        const ctx = canvasGrafo.getContext('2d');
        canvasGrafo.width = 800; canvasGrafo.height = 400;
        ctx.clearRect(0, 0, canvasGrafo.width, canvasGrafo.height);
        
        ctx.lineWidth = 0.3; ctx.strokeStyle = "rgba(148, 163, 184, 0.15)"; 
        for(let i=0; i<grafoActual.length; i++) {
            for(let arista of grafoActual[i]) {
                ctx.beginPath();
                ctx.moveTo(posicionesNodos[i].x, posicionesNodos[i].y);
                ctx.lineTo(posicionesNodos[arista.nodo].x, posicionesNodos[arista.nodo].y);
                ctx.stroke();
            }
        }

        if (rutaOptimaActual.length > 1) {
            ctx.lineWidth = 4; ctx.strokeStyle = "#0A84FF"; 
            ctx.shadowBlur = 10; ctx.shadowColor = "rgba(10, 132, 255, 0.8)";
            ctx.beginPath();
            ctx.moveTo(posicionesNodos[rutaOptimaActual[0]].x, posicionesNodos[rutaOptimaActual[0]].y);
            for(let i=1; i<rutaOptimaActual.length; i++) ctx.lineTo(posicionesNodos[rutaOptimaActual[i]].x, posicionesNodos[rutaOptimaActual[i]].y);
            ctx.stroke(); ctx.shadowBlur = 0; 
        }

        for(let i=0; i<grafoActual.length; i++) {
            ctx.beginPath();
            if (rutaOptimaActual.includes(i)) {
                ctx.arc(posicionesNodos[i].x, posicionesNodos[i].y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#0A84FF"; ctx.lineWidth = 2;
                ctx.fill(); ctx.stroke();
            } else {
                ctx.arc(posicionesNodos[i].x, posicionesNodos[i].y, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#1E293B"; ctx.fill();
            }
        }
    }

    if(btnVerGrafo) btnVerGrafo.addEventListener('click', () => { modalGrafo.classList.remove('hidden'); setTimeout(dibujarVisualizacionGrafo, 50); });
    if(btnCerrarGrafo) btnCerrarGrafo.addEventListener('click', () => modalGrafo.classList.add('hidden'));

    function generarNuevaSimulacion() {
        if(inputPaciente) { inputPaciente.value = ""; inputPaciente.removeAttribute('readonly'); }
        if(lblPacienteId) lblPacienteId.textContent = `PT-${randomInt(1000, 9999)}`;
        if(selectOperacion) { selectOperacion.selectedIndex = 0; selectOperacion.removeAttribute('disabled'); }
        
        let configOp = obtenerConfiguracionOperacion(selectOperacion.value);
        fcActual = configOp.baseFc + randomInt(-5, 5); 
        paSistActual = 120 + randomInt(-10, 10);
        paDiastActual = 80 + randomInt(-5, 5);

        let gen = generarGrafoYPosiciones(configOp.nodos);
        grafoActual = gen.grafo; posicionesNodos = gen.posiciones;
        let dijkstraResult = dijkstra(grafoActual, 0, configOp.nodos - 1); 
        rutaOptimaActual = dijkstraResult.camino;
        let expansionTotal = prim(grafoActual);

        if (simInterval) clearInterval(simInterval);

        simInterval = setInterval(() => {
            fcActual = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            paDiastActual = Math.max(50, Math.min(100, paDiastActual + randomInt(-1, 1)));

            if(valFc) valFc.textContent = fcActual;
            if(valPa) valPa.textContent = `${paSistActual}/${paDiastActual}`;
            if(ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;

            let newRisk = calcularNivelDeRiesgoAnalizado(dijkstraResult.distancia, expansionTotal, fcActual, paSistActual, configOp.baseRiesgo);

            if(valRiskScore) valRiskScore.textContent = `${newRisk}%`;
            if(riskBarFill) {
                riskBarFill.style.width = `${newRisk}%`;
                riskBarFill.style.backgroundColor = newRisk > 70 ? "var(--danger-red)" : (newRisk > 30 ? "var(--node-warning)" : "var(--node-safe)");
            }
        }, 2000); 
    }

    setTimeout(() => { generarNuevaSimulacion(); }, 500);

    if(btnNuevaSimSidebar) btnNuevaSimSidebar.addEventListener('click', () => { 
        btnSalirPlayback.classList.add('hidden');
        btnReiniciarSim.classList.remove('hidden');
        btnConcluirSim.classList.remove('hidden');
        generarNuevaSimulacion(); 
        navSimulacion.click(); 
    });
    
    if(btnReiniciarSim) btnReiniciarSim.addEventListener('click', generarNuevaSimulacion);
    if(selectOperacion) selectOperacion.addEventListener('change', generarNuevaSimulacion); 

    if(btnConcluirSim) {
        btnConcluirSim.addEventListener('click', () => {
            let nombrePaciente = inputPaciente ? inputPaciente.value.trim() : "";
            if (!nombrePaciente) {
                window.mostrarAlerta("Datos Incompletos", "Es obligatorio ingresar el nombre del paciente para concluir y registrar la simulación clínica.", "error");
                if(inputPaciente) inputPaciente.focus();
                return; 
            }

            let riskScore = parseInt(valRiskScore.textContent);
            let riskLvl = riskScore > 70 ? "CRÍTICO" : (riskScore > 30 ? "CAUTELOSO" : "SEGURO");
            
            let nuevaSim = {
                id: `SIM-2026-${randomInt(1000, 9999)}`,
                date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                status: "LOCAL",
                patientId: lblPacienteId.textContent,
                patientName: nombrePaciente,
                riskLvl: riskLvl,
                riskScore: riskScore,
                timeEst: `${randomInt(2, 6)}h ${randomInt(10, 50)}m`,
                operation: selectOperacion.value,
                
                grafo: grafoActual,
                posiciones: posicionesNodos,
                ruta: rutaOptimaActual,
                fcBase: fcActual,
                paSistBase: paSistActual
            };
            
            state.simulations.unshift(nuevaSim);
            window.mostrarAlerta("Simulación Guardada", `La evaluación del paciente <strong>${nombrePaciente}</strong> fue registrada con éxito en la bandeja local.`, "success");
            actualizarVistas();
            generarNuevaSimulacion(); 
        });
    }

    // --- [NUEVA FUNCIÓN]: LÓGICA DE PLAYBACK REAL ---
    window.iniciarPlayback = function(sim) {
        // Bloquear UI
        if(inputPaciente) { inputPaciente.value = sim.patientName; inputPaciente.setAttribute('readonly', true); }
        if(lblPacienteId) lblPacienteId.textContent = sim.patientId;
        if(selectOperacion) { selectOperacion.value = sim.operation; selectOperacion.setAttribute('disabled', true); }

        // Ocultar botones normales y mostrar botón de salir
        if(btnReiniciarSim) btnReiniciarSim.classList.add('hidden');
        if(btnConcluirSim) btnConcluirSim.classList.add('hidden');
        if(btnSalirPlayback) btnSalirPlayback.classList.remove('hidden');

        // Restaurar datos históricos (Si son las simulaciones predeterminadas viejas, generamos uno base para no crashear)
        grafoActual = sim.grafo || generarGrafoYPosiciones(100).grafo;
        posicionesNodos = sim.posiciones || generarGrafoYPosiciones(100).posiciones;
        rutaOptimaActual = sim.ruta || dijkstra(grafoActual, 0, 99).camino;
        
        fcActual = sim.fcBase || 85;
        paSistActual = sim.paSistBase || 125;
        paDiastActual = 80;

        if (simInterval) clearInterval(simInterval);

        simInterval = setInterval(() => {
            fcActual = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            paDiastActual = Math.max(50, Math.min(100, paDiastActual + randomInt(-1, 1)));

            if(valFc) valFc.textContent = fcActual;
            if(valPa) valPa.textContent = `${paSistActual}/${paDiastActual}`;
            if(ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;

            // Mantener el score histórico fijo, no cambiarlo en playback
            if(valRiskScore) valRiskScore.textContent = `${sim.riskScore}%`;
            if(riskBarFill) {
                riskBarFill.style.width = `${sim.riskScore}%`;
                riskBarFill.style.backgroundColor = sim.riskScore > 70 ? "var(--danger-red)" : (sim.riskScore > 30 ? "var(--node-warning)" : "var(--node-safe)");
            }
        }, 2000); 
    };

    if(btnSalirPlayback) {
        btnSalirPlayback.addEventListener('click', () => {
            btnSalirPlayback.classList.add('hidden');
            btnReiniciarSim.classList.remove('hidden');
            btnConcluirSim.classList.remove('hidden');
            generarNuevaSimulacion();
        });
    }
}
