// =================================================================
// SIMULACIÓN, ANIMACIÓN DE FLUJO Y CONTROLES ANTIDUPLICACIÓN
// =================================================================
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
    
    // Inyectar selectores del algoritmo de grafos en la ventana modal
    const selectorContenedor = document.createElement('div');
    selectorContenedor.style = "display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;";
    selectorContenedor.innerHTML = `
        <button id="btn-view-dijkstra" class="nav-link active" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px;">🔵 Ruta de Perfusión (Dijkstra)</button>
        <button id="btn-view-prim" class="nav-link" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; background: transparent;">🟢 Distribución Vascular (Prim MST)</button>
    `;
    if (canvasGrafo) {
        canvasGrafo.parentNode.insertBefore(selectorContenedor, canvasGrafo);
    }

    let simInterval = null; 
    let animationFrameId = null;
    let modoVisualizacion = 'DIJKSTRA'; 
    let dashOffset = 0;

    let grafoActual = [];
    let posicionesNodos = []; 
    let rutaOptimaActual = [];
    let arbolPrimActual = []; 
    let fcActual = 80; 
    let paSistActual = 120; 
    let paDiastActual = 80;

    function randomInt(min, max) { 
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }

    function obtenerConfiguracionOperacion(op) {
        if (op.includes("Trasplante")) return { nodos: 150, baseRiesgo: 40, baseFc: 90 };
        if (op.includes("Válvula")) return { nodos: 80, baseRiesgo: 10, baseFc: 70 };
        return { nodos: 110, baseRiesgo: 20, baseFc: 80 }; 
    }

    function generarGrafoYPosiciones(numNodos) {
        let grafo = Array.from({length: numNodos}, () => []);
        let posiciones = [];
        for(let i=0; i<numNodos; i++) {
            posiciones.push({ x: randomInt(40, 760), y: randomInt(40, 360) });
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
                if(!visitados[j] && (minIdx === -1 || distancias[j] < distancias[minIdx])) {
                    minIdx = j;
                }
            }
            if(distancias[minIdx] === Infinity) break;
            visitados[minIdx] = true;
            for(let arista of grafo[minIdx]) {
                let peso = arista.peso || arista.weight || 1;
                if(distancias[minIdx] + peso < distancias[arista.nodo]) {
                    distancias[arista.nodo] = distancias[minIdx] + peso;
                    previos[arista.nodo] = minIdx;
                }
            }
        }
        let ruta = []; 
        let actual = fin;
        while(actual !== null) { 
            ruta.unshift(actual); 
            actual = previos[actual]; 
        }
        return { distancia: distancias[fin] === Infinity ? randomInt(30, 80) : distancias[fin], camino: ruta };
    }

    function prim(grafo) {
        let visitados = Array(grafo.length).fill(false);
        let minPesos = Array(grafo.length).fill(Infinity);
        let parent = Array(grafo.length).fill(-1);
        minPesos[0] = 0; 
        let totalPesoArbol = 0; 
        let aristasMST = [];
        
        for(let i=0; i<grafo.length; i++) {
            let u = -1;
            for(let j=0; j<grafo.length; j++) {
                if(!visitados[j] && (u === -1 || minPesos[j] < minPesos[u])) {
                    u = j;
                }
            }
            if(minPesos[u] === Infinity) break;
            visitados[u] = true;
            totalPesoArbol += minPesos[u];
            
            if(parent[u] !== -1) {
                aristasMST.push({ u: parent[u], v: u });
            }
            for(let arista of grafo[u]) {
                let peso = arista.peso || arista.weight || 1;
                if(!visitados[arista.nodo] && peso < minPesos[arista.nodo]) {
                    minPesos[arista.nodo] = peso;
                    parent[arista.nodo] = u;
                }
            }
        }
        return { totalPeso: totalPesoArbol, aristas: aristasMST };
    }

    function calcularNivelDeRiesgoAnalizado(rutaDijkstra, pesoPrim, frecCardiaca, presSistolica, baseRiesgo) {
        let impactoGrafo = (rutaDijkstra * 0.3) + (pesoPrim * 0.005);
        let impactoVital = 0;
        if (frecCardiaca < 60 || frecCardiaca > 100) impactoVital += 15;
        if (presSistolica < 90 || presSistolica > 140) impactoVital += 20;
        return Math.min(Math.max(Math.round(baseRiesgo + impactoGrafo + impactoVital), 2), 99); 
    }

    function animarYDrawGrafo() {
        if (!canvasGrafo || modalGrafo.classList.contains('hidden')) return;
        const ctx = canvasGrafo.getContext('2d');
        canvasGrafo.width = 800; canvasGrafo.height = 400;
        ctx.clearRect(0, 0, canvasGrafo.width, canvasGrafo.height);
        
        for(let i=0; i<grafoActual.length; i++) {
            for(let arista of grafoActual[i]) {
                let peso = arista.peso || arista.weight || 1;
                ctx.beginPath();
                ctx.moveTo(posicionesNodos[i].x, posicionesNodos[i].y);
                ctx.lineTo(posicionesNodos[arista.nodo].x, posicionesNodos[arista.nodo].y);
                if (peso > 14) { 
                    ctx.lineWidth = 0.8; 
                    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)"; 
                } else { 
                    ctx.lineWidth = 1.5; 
                    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)"; 
                }
                ctx.stroke();
            }
        }
        
        dashOffset += 0.3; 
        if (modoVisualizacion === 'DIJKSTRA' && rutaOptimaActual.length > 1) {
            ctx.lineWidth = 4; 
            ctx.strokeStyle = "#00E5FF"; 
            ctx.setLineDash([10, 7]); 
            ctx.lineDashOffset = -dashOffset;
            ctx.shadowBlur = 8; 
            ctx.shadowColor = "rgba(0, 229, 255, 0.8)";
            ctx.beginPath();
            ctx.moveTo(posicionesNodos[rutaOptimaActual[0]].x, posicionesNodos[rutaOptimaActual[0]].y);
            for(let i=1; i<rutaOptimaActual.length; i++) {
                ctx.lineTo(posicionesNodos[rutaOptimaActual[i]].x, posicionesNodos[rutaOptimaActual[i]].y);
            }
            ctx.stroke();
            ctx.setLineDash([]); 
            ctx.shadowBlur = 0; 
        } 
        else if (modoVisualizacion === 'PRIM' && arbolPrimActual.length > 0) {
            ctx.lineWidth = 3; 
            ctx.strokeStyle = "#3CD070";
            ctx.setLineDash([6, 6]); 
            ctx.lineDashOffset = dashOffset;
            ctx.shadowBlur = 6; 
            ctx.shadowColor = "rgba(60, 208, 112, 0.7)";
            arbolPrimActual.forEach(a => {
                ctx.beginPath();
                ctx.moveTo(posicionesNodos[a.u].x, posicionesNodos[a.u].y);
                ctx.lineTo(posicionesNodos[a.v].x, posicionesNodos[a.v].y);
                ctx.stroke();
            });
            ctx.setLineDash([]); 
            ctx.shadowBlur = 0;
        }
        
        for(let i=0; i<posicionesNodos.length; i++) {
            ctx.beginPath();
            if (modoVisualizacion === 'DIJKSTRA' && rutaOptimaActual.includes(i)) {
                ctx.arc(posicionesNodos[i].x, posicionesNodos[i].y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#FFFFFF"; 
                ctx.strokeStyle = "#00E5FF"; 
                ctx.lineWidth = 2;
                ctx.fill(); 
                ctx.stroke();
            } else {
                ctx.arc(posicionesNodos[i].x, posicionesNodos[i].y, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#1E293B"; 
                ctx.fill();
            }
        }
        animationFrameId = requestAnimationFrame(animarYDrawGrafo);
    }

    const btnDijkstra = document.getElementById('btn-view-dijkstra');
    const btnPrim = document.getElementById('btn-view-prim');

    if (btnDijkstra) {
        btnDijkstra.addEventListener('click', (e) => {
            modoVisualizacion = 'DIJKSTRA';
            e.target.classList.add('active'); 
            btnPrim.classList.remove('active');
            btnPrim.style.background = "transparent";
        });
    }

    if (btnPrim) {
        btnPrim.addEventListener('click', (e) => {
            modoVisualizacion = 'PRIM';
            e.target.classList.add('active'); 
            btnDijkstra.classList.remove('active');
            btnDijkstra.style.background = "transparent";
        });
    }

    if(btnVerGrafo) {
        btnVerGrafo.addEventListener('click', () => { 
            modalGrafo.classList.remove('hidden'); 
            animarYDrawGrafo(); 
        });
    }
    
    if(btnCerrarGrafo) {
        btnCerrarGrafo.addEventListener('click', () => { 
            modalGrafo.classList.add('hidden'); 
            cancelAnimationFrame(animationFrameId); 
        });
    }

    function generarNuevaSimulacion() {
        if(inputPaciente) { 
            inputPaciente.value = ""; 
            inputPaciente.removeAttribute('readonly'); 
        }
        if(lblPacienteId) lblPacienteId.textContent = `PT-${randomInt(1000, 9999)}`;
        if(selectOperacion) { 
            selectOperacion.selectedIndex = 0; 
            selectOperacion.removeAttribute('disabled'); 
        }
        
        let configOp = obtenerConfiguracionOperacion(selectOperacion.value);
        fcActual = configOp.baseFc + randomInt(-5, 5); 
        paSistActual = 120 + randomInt(-10, 10); 
        paDiastActual = 80 + randomInt(-5, 5);
        
        let gen = generarGrafoYPosiciones(configOp.nodos);
        grafoActual = gen.grafo; 
        posicionesNodos = gen.posiciones;
        
        let dijkstraResult = dijkstra(grafoActual, 0, configOp.nodos - 1); 
        rutaOptimaActual = dijkstraResult.camino;
        
        let primResult = prim(grafoActual); 
        arbolPrimActual = primResult.aristas;
        
        if (simInterval) clearInterval(simInterval);
        simInterval = setInterval(() => {
            fcActual = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            paDiastActual = Math.max(50, Math.min(100, paDiastActual + randomInt(-1, 1)));
            
            if(valFc) valFc.textContent = fcActual;
            if(valPa) valPa.textContent = `${paSistActual}/${paDiastActual}`;
            if(ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;
            
            let newRisk = calcularNivelDeRiesgoAnalizado(dijkstraResult.distancia, primResult.totalPeso, fcActual, paSistActual, configOp.baseRiesgo);
            if(valRiskScore) valRiskScore.textContent = `${newRisk}%`;
            if(riskBarFill) {
                riskBarFill.style.width = `${newRisk}%`;
                riskBarFill.style.backgroundColor = newRisk > 70 ? "var(--danger-red)" : (newRisk > 30 ? "var(--node-warning)" : "var(--node-safe)");
            }
        }, 2000); 
    }

    setTimeout(() => { 
        generarNuevaSimulacion(); 
    }, 500);

    if(btnNuevaSimSidebar) {
        btnNuevaSimSidebar.addEventListener('click', () => { 
            btnSalirPlayback.classList.add('hidden'); 
            btnReiniciarSim.classList.remove('hidden'); 
            btnConcluirSim.classList.remove('hidden');
            generarNuevaSimulacion(); 
            navSimulacion.click(); 
        });
    }

    if(btnReiniciarSim) {
        btnReiniciarSim.addEventListener('click', generarNuevaSimulacion);
    }
    
    if(selectOperacion) {
        selectOperacion.addEventListener('change', generarNuevaSimulacion); 
    }

    if(btnConcluirSim) {
        btnConcluirSim.addEventListener('click', async () => {
            let nombrePaciente = inputPaciente ? inputPaciente.value.trim() : "";
            if (!nombrePaciente) { 
                window.mostrarAlerta("Datos Incompletos", "Por favor ingrese el nombre del paciente.", "error"); 
                return; 
            }
            
            // Deshabilitar el botón para evitar múltiples clics
            btnConcluirSim.setAttribute('disabled', true);
            btnConcluirSim.textContent = "Procesando...";

            let riskScore = parseInt(valRiskScore.textContent);
            let riskLvl = riskScore > 70 ? "CRÍTICO" : (riskScore > 30 ? "CAUTELOSO" : "SEGURO");
            let estructuraGrafoJSON = { grafo: grafoActual, posiciones: posicionesNodos, ruta: rutaOptimaActual, aristasMST: arbolPrimActual };

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
                doctor_id: state.doctorLogueado ? state.doctorLogueado.id : null,
                grafo_json: estructuraGrafoJSON,
                fcBase: fcActual, 
                paSistBase: paSistActual
            };

            // Intentta guardar en Supabase si hay red
            if (!window.modoDeContingencia && window.supabaseCliente) {
                try {
                    const { error } = await window.supabaseCliente.from('simulaciones').insert([{
                        id: nuevaSim.id, 
                        date: nuevaSim.date, 
                        patient_id: nuevaSim.patientId,
                        patient_name: nuevaSim.patientName, 
                        risk_lvl: nuevaSim.riskLvl, 
                        risk_score: nuevaSim.riskScore,
                        time_est: nuevaSim.timeEst, 
                        operation: nuevaSim.operation, 
                        status: nuevaSim.status,
                        doctor_id: nuevaSim.doctor_id, 
                        grafo_json: nuevaSim.grafo_json
                    }]);
                    
                    if (error) {
                        throw error;
                    }
                    nuevaSim.status = "LOCAL"; 
                } catch (err) {
                    console.error("Error al guardar, usando contingencia local:", err.message);
                }
            }

            // Siempre guardamos el respaldo local de seguridad
            let locales = JSON.parse(localStorage.getItem('simulaciones_backup') || "[]");
            locales.unshift(nuevaSim);
            localStorage.setItem('simulaciones_backup', JSON.stringify(locales));
            
        
            state.simulations.unshift(nuevaSim);
            
            window.mostrarAlerta("Simulación Guardada", `Paciente <strong>${nombrePaciente}</strong> registrado con éxito.`, "success");
            
            
            btnConcluirSim.removeAttribute('disabled');
            btnConcluirSim.textContent = "Concluir Simulación";

            if (window.historialControlador) {
                await window.historialControlador.cargarSimulacionesDesdeBackend();
            }
            generarNuevaSimulacion(); 
        });
    }

    window.iniciarPlayback = function(sim) {
        if(inputPaciente) { 
            inputPaciente.value = sim.patientName; 
            inputPaciente.setAttribute('readonly', true); 
        }
        if(lblPacienteId) {
            lblPacienteId.textContent = sim.patientId;
        }
        if(selectOperacion) { 
            selectOperacion.value = sim.operation; 
            selectOperacion.setAttribute('disabled', true); 
        }
        
        if(btnReiniciarSim) btnReiniciarSim.classList.add('hidden');
        if(btnConcluirSim) btnConcluirSim.classList.add('hidden');
        if(btnSalirPlayback) btnSalirPlayback.classList.remove('hidden');
        
        let datosGrafo = sim.grafo_json || sim.grafo; 
        grafoActual = datosGrafo.grafo || generarGrafoYPosiciones(80).grafo;
        posicionesNodos = datosGrafo.posiciones || generarGrafoYPosiciones(80).posiciones;
        rutaOptimaActual = datosGrafo.ruta || [];
        arbolPrimActual = datosGrafo.aristasMST || [];
        
        fcActual = sim.fcBase || 85; 
        paSistActual = sim.paSistBase || 125; 
        paDiastActual = 80;

        if (simInterval) {
            clearInterval(simInterval);
        }
        
        simInterval = setInterval(() => {
            fcActual = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            
            if(valFc) valFc.textContent = fcActual;
            if(valPa) valPa.textContent = `${paSistActual}/${paDiastActual}`;
            if(ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;
            if(valRiskScore) valRiskScore.textContent = `${sim.riskScore}%`;
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
