// =================================================================
// SIMULACIÓN — Motor de Grafos Clínicos con Visualización 
// =================================================================
function initSimulacion({ state, navSimulacion, actualizarVistas }) {

    const btnConcluirSim    = document.getElementById('btn-concluir-sim');
    const btnNuevaSimSidebar = document.getElementById('btn-nueva-sim-sidebar');
    const btnReiniciarSim   = document.getElementById('btn-reiniciar-sim');
    const btnSalirPlayback  = document.getElementById('btn-salir-playback');
    const inputPaciente     = document.getElementById('buscar-paciente');
    const lblPacienteId     = document.getElementById('lbl-paciente-id');
    const selectOperacion   = document.getElementById('select-operacion');
    const valFc             = document.getElementById('val-fc');
    const valPa             = document.getElementById('val-pa');
    const valRiskScore      = document.getElementById('val-risk-score');
    const riskBarFill       = document.getElementById('risk-bar-fill');
    const ecgWave           = document.querySelector('.ecg-wave');
    const btnVerGrafo       = document.getElementById('btn-ver-grafo');
    const modalGrafo        = document.getElementById('modal-grafo');
    const btnCerrarGrafo    = document.getElementById('btn-cerrar-grafo');
    const canvasGrafo       = document.getElementById('canvas-grafo');

    const modalContent = modalGrafo ? modalGrafo.querySelector('.modal-grafo-content') : null;
    if (modalContent) {
        const leyendaVieja = modalContent.querySelector('.leyenda-grafo');
        if (leyendaVieja) leyendaVieja.remove();

        const controlBar = document.createElement('div');
        controlBar.className = 'grafo-control-bar';
        controlBar.innerHTML = `
            <div class="grafo-algo-btns">
                <button id="btn-view-dijkstra" class="grafo-btn grafo-btn-active">
                    <i class="fa-solid fa-route"></i> Ruta Quirúrgica (Dijkstra)
                </button>
                <button id="btn-view-prim" class="grafo-btn">
                    <i class="fa-solid fa-sitemap"></i> Red Vascular (Prim MST)
                </button>
            </div>
            <div class="grafo-leyenda">
                <span class="leg-item"><span class="leg-dot leg-dot-low"></span>Bajo riesgo</span>
                <span class="leg-item"><span class="leg-dot leg-dot-mid"></span>Precaución</span>
                <span class="leg-item"><span class="leg-dot leg-dot-high"></span>Alto riesgo</span>
                <span class="leg-item"><span class="leg-line leg-line-path"></span>Ruta activa</span>
            </div>
        `;
        modalContent.insertBefore(controlBar, canvasGrafo);

        const grafoWrapper = document.createElement('div');
        grafoWrapper.className = 'grafo-wrapper';

        canvasGrafo.parentNode.insertBefore(grafoWrapper, canvasGrafo);
        grafoWrapper.appendChild(canvasGrafo);

        
        const panelDiag = document.createElement('div');
        panelDiag.id = 'panel-diagnostico';
        panelDiag.className = 'panel-diagnostico hidden';
        panelDiag.innerHTML = `
            <div class="diag-header">
                <span><i class="fa-solid fa-stethoscope"></i> Diagnóstico de Arista</span>
                <button id="btn-cerrar-diag" class="diag-close"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="diag-badge-row">
                <span id="diag-nivel-badge" class="diag-badge">--</span>
            </div>
            <div class="diag-row"><span class="diag-label">Peso de Riesgo</span><span id="diag-peso" class="diag-val">--</span></div>
            <div class="diag-row"><span class="diag-label">Escenario Clínico</span><span id="diag-escenario" class="diag-val">--</span></div>
            <div class="diag-row"><span class="diag-label">Nodo Origen</span><span id="diag-nodo-a" class="diag-val">--</span></div>
            <div class="diag-row"><span class="diag-label">Nodo Destino</span><span id="diag-nodo-b" class="diag-val">--</span></div>
            <div class="diag-accion">
                <i class="fa-solid fa-circle-radiation diag-accion-icon"></i>
                <div>
                    <div class="diag-accion-title">Acción Recomendada</div>
                    <div id="diag-accion-text" class="diag-accion-text">--</div>
                </div>
            </div>
        `;
        grafoWrapper.appendChild(panelDiag);
    }

    // ── Estado del grafo ──────────────────────────────────────────
    let grafoActual       = [];
    let posicionesNodos   = [];
    let rutaOptimaActual  = [];
    let arbolPrimActual   = [];
    let fcActual          = 80;
    let paSistActual      = 120;
    let paDiastActual     = 80;
    let modoVisualizacion = 'DIJKSTRA';
    let dashOffset        = 0;
    let animationFrameId  = null;
    let simInterval       = null;

    let nodoSeleccionado  = null;
    let aristaHover       = null;

    // ── Helpers ───────────────────────────────────────────────────
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function obtenerConfiguracionOperacion(op) {
        if (op.includes("Trasplante")) return { nodos: 60, baseRiesgo: 40, baseFc: 90,  pasos: ["Incisión","Canulación","Cardiectomía","Donante","Sutura AI/AD","Reperfusión","Cierre"] };
        if (op.includes("Válvula"))    return { nodos: 40, baseRiesgo: 10, baseFc: 70,  pasos: ["Acceso Torácico","Evaluación","Resección","Medición Anillo","Implantación","Pruebas","Cierre"] };
        return                                { nodos: 50, baseRiesgo: 20, baseFc: 80,  pasos: ["Incisión","Extracción Safena","Canulación","Clampado","Anastómosis","Desclampado","Cierre"] };
    }

    function generarGrafoJerarquico(numNodos) {

        const CANVAS_W = 800, CANVAS_H = 360;
        const CAPAS = Math.min(numNodos, 8);
        const nodosPorCapa = Math.ceil(numNodos / CAPAS);

        let posiciones = [];
        for (let i = 0; i < numNodos; i++) {
            const capa  = Math.floor(i / nodosPorCapa);
            const posEnCapa = i % nodosPorCapa;
            const totalEnCapa = Math.min(nodosPorCapa, numNodos - capa * nodosPorCapa);

            const x = 60 + (capa / (CAPAS - 1 || 1)) * (CANVAS_W - 120);
            const yBase = (CANVAS_H / (totalEnCapa + 1)) * (posEnCapa + 1);
            const jitter = randomInt(-12, 12);
            posiciones.push({ x: Math.round(x), y: Math.round(yBase + jitter), capa });
        }

        let grafo = Array.from({ length: numNodos }, () => []);
        for (let i = 0; i < numNodos; i++) {
            const capaI = posiciones[i].capa;
            const vecinos = posiciones
                .map((p, idx) => ({ idx, capa: p.capa }))
                .filter(v => v.capa === capaI + 1);

            const conexiones = Math.min(randomInt(1, 2), vecinos.length);
            for (let c = 0; c < conexiones; c++) {
                const destino = vecinos[randomInt(0, vecinos.length - 1)].idx;
                const peso = randomInt(1, 20);
                if (!grafo[i].some(n => n.nodo === destino)) {
                    grafo[i].push({ nodo: destino, peso });
                    grafo[destino].push({ nodo: i, peso });
                }
            }

            const mismasCapa = posiciones
                .map((p, idx) => ({ idx, capa: p.capa }))
                .filter(v => v.capa === capaI && v.idx !== i);
            if (mismasCapa.length > 0) {
                const lat = mismasCapa[randomInt(0, mismasCapa.length - 1)].idx;
                const peso = randomInt(5, 18);
                if (!grafo[i].some(n => n.nodo === lat)) {
                    grafo[i].push({ nodo: lat, peso });
                    grafo[lat].push({ nodo: i, peso });
                }
            }
        }
        return { grafo, posiciones };
    }

    // ── Algoritmos ────────────────────────────────────────────────
    function dijkstra(grafo, inicio, fin) {
        const n = grafo.length;
        let dist   = Array(n).fill(Infinity);
        let previo = Array(n).fill(null);
        let vis    = Array(n).fill(false);
        dist[inicio] = 0;

        for (let i = 0; i < n; i++) {
            let u = -1;
            for (let j = 0; j < n; j++) {
                if (!vis[j] && (u === -1 || dist[j] < dist[u])) u = j;
            }
            if (dist[u] === Infinity) break;
            vis[u] = true;
            for (let arista of grafo[u]) {
                const peso = arista.peso || 1;
                if (dist[u] + peso < dist[arista.nodo]) {
                    dist[arista.nodo] = dist[u] + peso;
                    previo[arista.nodo] = u;
                }
            }
        }

        let ruta = [], actual = fin;
        while (actual !== null) { ruta.unshift(actual); actual = previo[actual]; }
        return {
            distancia: dist[fin] === Infinity ? randomInt(30, 80) : dist[fin],
            camino: ruta
        };
    }

    function prim(grafo) {
        const n = grafo.length;
        let vis     = Array(n).fill(false);
        let minPeso = Array(n).fill(Infinity);
        let parent  = Array(n).fill(-1);
        let aristas = [];
        let total   = 0;
        minPeso[0]  = 0;

        for (let i = 0; i < n; i++) {
            let u = -1;
            for (let j = 0; j < n; j++) {
                if (!vis[j] && (u === -1 || minPeso[j] < minPeso[u])) u = j;
            }
            if (minPeso[u] === Infinity) break;
            vis[u] = true;
            total += minPeso[u];
            if (parent[u] !== -1) aristas.push({ u: parent[u], v: u });

            for (let a of grafo[u]) {
                const peso = a.peso || 1;
                if (!vis[a.nodo] && peso < minPeso[a.nodo]) {
                    minPeso[a.nodo] = peso;
                    parent[a.nodo] = u;
                }
            }
        }
        return { totalPeso: total, aristas };
    }

    function calcularRiesgo(distDijk, pesoPrim, fc, sist, baseRiesgo) {
        let impGrafo  = (distDijk * 0.3) + (pesoPrim * 0.005);
        let impVital  = 0;
        if (fc < 60 || fc > 100)       impVital += 15;
        if (sist < 90 || sist > 140)   impVital += 20;
        return Math.min(Math.max(Math.round(baseRiesgo + impGrafo + impVital), 2), 99);
    }

    function colorArista(peso, alpha = 1) {
        if (peso > 14) return `rgba(255,69,58,${alpha})`;      // Alto: rojo
        if (peso > 7)  return `rgba(255,159,10,${alpha})`;     // Medio: ámbar
        return              `rgba(48,209,88,${alpha})`;         // Bajo: verde
    }

    function grosorArista(peso) {
        if (peso > 14) return 3;
        if (peso > 7)  return 2;
        return 1.2;
    }

    function generarDiagnostico(peso, nodoA, nodoB, op) {
        const nivel  = peso > 14 ? 'CRÍTICO' : peso > 7 ? 'PRECAUCIÓN' : 'BAJO';
        const badgeClass = peso > 14 ? 'diag-badge-critical' : peso > 7 ? 'diag-badge-warning' : 'diag-badge-safe';

        const escenarios = {
            CRÍTICO: [
                "Fibrilación ventricular con hipoperfusión coronaria grave",
                "Colapso hemodinámico por bajo gasto cardíaco",
                "Isquemia miocárdica aguda con compromiso multivaso"
            ],
            PRECAUCIÓN: [
                "Variación tensional moderada — monitoreo continuo recomendado",
                "Taquicardia sinusal reactiva al procedimiento",
                "Edema pulmonar leve post-clampado"
            ],
            BAJO: [
                "Hemodinámica estable, perfusión coronaria óptima",
                "Parámetros vitales dentro del rango quirúrgico seguro",
                "Flujo colateral compensatorio adecuado"
            ]
        };

        const acciones = {
            CRÍTICO: "Detener procedimiento. Solicitar soporte ECMO inmediato. Activar protocolo de emergencia cardiovascular.",
            PRECAUCIÓN: "Reducir ritmo quirúrgico. Ajustar dosis vasoactivos. Re-evaluar en 60 segundos.",
            BAJO: "Continuar con el protocolo estándar. Siguiente paso: avanzar al nodo distal."
        };

        return {
            nivel, badgeClass,
            escenario: escenarios[nivel][randomInt(0, 2)],
            accion: acciones[nivel]
        };
    }

    function mostrarPanelDiag(peso, nodoA, nodoB) {
        const panel = document.getElementById('panel-diagnostico');
        if (!panel) return;
        const op = selectOperacion ? selectOperacion.value : '';
        const d  = generarDiagnostico(peso, nodoA, nodoB, op);

        document.getElementById('diag-nivel-badge').textContent = d.nivel;
        document.getElementById('diag-nivel-badge').className   = `diag-badge ${d.badgeClass}`;
        document.getElementById('diag-peso').textContent        = `${peso} / 20`;
        document.getElementById('diag-escenario').textContent   = d.escenario;
        document.getElementById('diag-nodo-a').textContent      = `Nodo #${nodoA + 1}`;
        document.getElementById('diag-nodo-b').textContent      = `Nodo #${nodoB + 1}`;
        document.getElementById('diag-accion-text').textContent = d.accion;
        panel.classList.remove('hidden');
    }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btn-cerrar-diag') {
            const panel = document.getElementById('panel-diagnostico');
            if (panel) { panel.classList.add('hidden'); aristaHover = null; }
        }
    });

    function dibujarGrafo() {
        if (!canvasGrafo || !modalGrafo || modalGrafo.classList.contains('hidden')) return;
        const ctx = canvasGrafo.getContext('2d');

        const wrapper = canvasGrafo.parentElement;
        canvasGrafo.width  = wrapper ? wrapper.clientWidth - (document.getElementById('panel-diagnostico')?.classList.contains('hidden') ? 0 : 260) : 800;
        canvasGrafo.width  = Math.max(canvasGrafo.width, 400);
        canvasGrafo.height = 380;

        ctx.clearRect(0, 0, canvasGrafo.width, canvasGrafo.height);

        const scaleX = canvasGrafo.width  / 800;
        const scaleY = canvasGrafo.height / 380;
        const px = (i) => posicionesNodos[i].x * scaleX;
        const py = (i) => posicionesNodos[i].y * scaleY;

        const nodoEnRuta  = new Set(rutaOptimaActual);
        const nodosMST    = new Set(arbolPrimActual.flatMap(a => [a.u, a.v]));
        const aristasMST  = new Set(arbolPrimActual.map(a => `${Math.min(a.u,a.v)}-${Math.max(a.u,a.v)}`));

        dashOffset += 0.4;

        for (let i = 0; i < grafoActual.length; i++) {
            for (let ar of grafoActual[i]) {
                if (ar.nodo <= i) continue; // Dibujar una sola vez

                const esMST    = aristasMST.has(`${Math.min(i,ar.nodo)}-${Math.max(i,ar.nodo)}`);
                const esRuta   = nodoEnRuta.has(i) && nodoEnRuta.has(ar.nodo);
                const hayFoco  = nodoSeleccionado !== null;

                // En modo foco: atenuar nodos/aristas fuera del subgrafo del nodo seleccionado
                const nodoEnFoco = !hayFoco || i === nodoSeleccionado || ar.nodo === nodoSeleccionado ||
                                   grafoActual[nodoSeleccionado].some(v => v.nodo === i || v.nodo === ar.nodo);

                let alpha = nodoEnFoco ? 1 : 0.08;

                if (modoVisualizacion === 'DIJKSTRA' && esRuta) continue; // Se dibuja en fase 2
                if (modoVisualizacion === 'PRIM'     && esMST)  continue;

                ctx.beginPath();
                ctx.moveTo(px(i), py(i));
                ctx.lineTo(px(ar.nodo), py(ar.nodo));
                ctx.lineWidth   = grosorArista(ar.peso) * 0.6;
                ctx.strokeStyle = colorArista(ar.peso, alpha * 0.25);
                ctx.stroke();
            }
        }

        
        if (modoVisualizacion === 'DIJKSTRA' && rutaOptimaActual.length > 1) {
            for (let k = 0; k < rutaOptimaActual.length - 1; k++) {
                const a = rutaOptimaActual[k], b = rutaOptimaActual[k + 1];
                const ar = grafoActual[a].find(x => x.nodo === b);
                const peso = ar ? ar.peso : 10;

                ctx.beginPath();
                ctx.moveTo(px(a), py(a));
                ctx.lineTo(px(b), py(b));
                ctx.lineWidth      = grosorArista(peso) + 2;
                ctx.strokeStyle    = colorArista(peso, 1);
                ctx.shadowBlur     = 10;
                ctx.shadowColor    = colorArista(peso, 0.6);
                ctx.setLineDash([10, 5]);
                ctx.lineDashOffset = -dashOffset;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
            }
        }

        if (modoVisualizacion === 'PRIM' && arbolPrimActual.length > 0) {
            for (let a of arbolPrimActual) {
                const ar = grafoActual[a.u].find(x => x.nodo === a.v);
                const peso = ar ? ar.peso : 10;

                ctx.beginPath();
                ctx.moveTo(px(a.u), py(a.u));
                ctx.lineTo(px(a.v), py(a.v));
                ctx.lineWidth      = grosorArista(peso) + 1.5;
                ctx.strokeStyle    = colorArista(peso, 1);
                ctx.shadowBlur     = 8;
                ctx.shadowColor    = colorArista(peso, 0.5);
                ctx.setLineDash([6, 4]);
                ctx.lineDashOffset = dashOffset;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
            }
        }

      
        const configOp   = obtenerConfiguracionOperacion(selectOperacion ? selectOperacion.value : '');
        const pasos      = configOp.pasos;
        const stepRatio  = Math.max(1, rutaOptimaActual.length / pasos.length);

        for (let i = 0; i < posicionesNodos.length; i++) {
            const enRuta  = modoVisualizacion === 'DIJKSTRA' && nodoEnRuta.has(i);
            const enMST   = modoVisualizacion === 'PRIM'     && nodosMST.has(i);
            const hayFoco = nodoSeleccionado !== null;
            const enFoco  = !hayFoco || i === nodoSeleccionado ||
                            grafoActual[nodoSeleccionado].some(v => v.nodo === i);
            const alpha   = enFoco ? 1 : 0.08;
            const esEspecial = enRuta || enMST;

            ctx.beginPath();
            const r = esEspecial ? 7 : 4;
            ctx.arc(px(i), py(i), r, 0, Math.PI * 2);

            if (esEspecial) {
                const peso = grafoActual[i][0]?.peso || 10;
                ctx.fillStyle   = colorArista(peso, alpha);
                ctx.shadowBlur  = 12;
                ctx.shadowColor = colorArista(peso, 0.7 * alpha);
                ctx.fill();
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = `rgba(255,255,255,${0.8 * alpha})`;
                ctx.lineWidth   = 1.5;
                ctx.stroke();
            } else {
                ctx.fillStyle   = `rgba(30,41,59,${alpha})`;
                ctx.strokeStyle = `rgba(100,116,139,${0.4 * alpha})`;
                ctx.lineWidth   = 1;
                ctx.fill();
                ctx.stroke();
            }

            
            if (enRuta) {
                const orden     = rutaOptimaActual.indexOf(i);
                const pasoIdx   = Math.min(Math.floor(orden / stepRatio), pasos.length - 1);
                const prevPaso  = orden > 0 ? Math.min(Math.floor((orden - 1) / stepRatio), pasos.length - 1) : -1;
                const esBorde   = orden === 0 || orden === rutaOptimaActual.length - 1;
                const esCambio  = pasoIdx !== prevPaso;

                if ((esBorde || esCambio) && alpha > 0.5) {
                    let texto = pasos[pasoIdx];
                    if (orden === 0)                           texto = '▶ ' + texto;
                    if (orden === rutaOptimaActual.length - 1) texto = texto + ' ✓';

                    ctx.font       = 'bold 10px Inter, sans-serif';
                    const tw       = ctx.measureText(texto).width;
                    const bw = tw + 10, bh = 17;
                    let bx = px(i) + 10, by = py(i) - 22;
                    if (bx + bw > canvasGrafo.width - 5) bx = px(i) - bw - 10;
                    if (by < 2) by = py(i) + 10;

                    ctx.fillStyle    = 'rgba(11,17,32,0.88)';
                    ctx.beginPath();
                    ctx.roundRect(bx, by, bw, bh, 4);
                    ctx.fill();

                    const peso       = grafoActual[i][0]?.peso || 10;
                    ctx.strokeStyle  = colorArista(peso, 0.9);
                    ctx.lineWidth    = 1;
                    ctx.stroke();

                    ctx.fillStyle = colorArista(peso, 1);
                    ctx.fillText(texto, bx + 5, by + 12);
                }
            }
        }

        animationFrameId = requestAnimationFrame(dibujarGrafo);
    }

    
    function distPuntoSegmento(px_, py_, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const t  = Math.max(0, Math.min(1, ((px_ - ax) * dx + (py_ - ay) * dy) / (dx * dx + dy * dy)));
        const nx = ax + t * dx - px_, ny = ay + t * dy - py_;
        return Math.sqrt(nx * nx + ny * ny);
    }

    if (canvasGrafo) {
        canvasGrafo.addEventListener('click', (e) => {
            const rect   = canvasGrafo.getBoundingClientRect();
            const mx     = e.clientX - rect.left;
            const my     = e.clientY - rect.top;
            const scaleX = canvasGrafo.width  / 800;
            const scaleY = canvasGrafo.height / 380;

            
            let nodoClickeado = null;
            for (let i = 0; i < posicionesNodos.length; i++) {
                const dx = mx - posicionesNodos[i].x * scaleX;
                const dy = my - posicionesNodos[i].y * scaleY;
                if (Math.sqrt(dx * dx + dy * dy) < 10) { nodoClickeado = i; break; }
            }

            if (nodoClickeado !== null) {
                nodoSeleccionado = nodoSeleccionado === nodoClickeado ? null : nodoClickeado;
                const panel = document.getElementById('panel-diagnostico');
                if (nodoSeleccionado === null && panel) panel.classList.add('hidden');
                return;
            }

            
            const UMBRAL = 7;
            for (let i = 0; i < grafoActual.length; i++) {
                for (let ar of grafoActual[i]) {
                    if (ar.nodo <= i) continue;
                    const ax = posicionesNodos[i].x       * scaleX;
                    const ay = posicionesNodos[i].y       * scaleY;
                    const bx = posicionesNodos[ar.nodo].x * scaleX;
                    const by = posicionesNodos[ar.nodo].y * scaleY;

                    if (distPuntoSegmento(mx, my, ax, ay, bx, by) < UMBRAL) {
                        mostrarPanelDiag(ar.peso, i, ar.nodo);
                        return;
                    }
                }
            }
        });
    }

    
    function generarNuevaSimulacion() {
        const op = selectOperacion ? selectOperacion.value : '';
        const cfg = obtenerConfiguracionOperacion(op);

        fcActual     = cfg.baseFc + randomInt(-5, 5);
        paSistActual = 120 + randomInt(-10, 10);
        paDiastActual = 80 + randomInt(-5, 5);

        if (inputPaciente) { inputPaciente.value = ''; inputPaciente.removeAttribute('readonly'); }
        if (lblPacienteId) lblPacienteId.textContent = `PT-${randomInt(1000, 9999)}`;
        if (selectOperacion) { selectOperacion.selectedIndex = 0; selectOperacion.removeAttribute('disabled'); }

        nodoSeleccionado = null;
        aristaHover      = null;

        const gen      = generarGrafoJerarquico(cfg.nodos);
        grafoActual    = gen.grafo;
        posicionesNodos = gen.posiciones;

        const dijk    = dijkstra(grafoActual, 0, cfg.nodos - 1);
        rutaOptimaActual = dijk.camino;

        const primRes = prim(grafoActual);
        arbolPrimActual = primRes.aristas;

        if (simInterval) clearInterval(simInterval);
        simInterval = setInterval(() => {
            fcActual      = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual  = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            paDiastActual = Math.max(50, Math.min(100, paDiastActual + randomInt(-1, 1)));

            if (valFc)  valFc.textContent  = fcActual;
            if (valPa)  valPa.textContent  = `${paSistActual}/${paDiastActual}`;
            if (ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;

            const newRisk = calcularRiesgo(dijk.distancia, primRes.totalPeso, fcActual, paSistActual, cfg.baseRiesgo);
            if (valRiskScore) valRiskScore.textContent = `${newRisk}%`;
            if (riskBarFill)  {
                riskBarFill.style.width = `${newRisk}%`;
                riskBarFill.style.backgroundColor = newRisk > 70 ? 'var(--danger-red)' : newRisk > 30 ? 'var(--node-warning)' : 'var(--node-safe)';
            }
        }, 2000);
    }

    setTimeout(generarNuevaSimulacion, 500);

    // ── Botones de algoritmo ──────────────────────────────────────
    document.addEventListener('click', (e) => {
        const btnD = document.getElementById('btn-view-dijkstra');
        const btnP = document.getElementById('btn-view-prim');
        if (!btnD || !btnP) return;

        if (e.target === btnD || btnD.contains(e.target)) {
            modoVisualizacion = 'DIJKSTRA';
            btnD.classList.add('grafo-btn-active');
            btnP.classList.remove('grafo-btn-active');
        }
        if (e.target === btnP || btnP.contains(e.target)) {
            modoVisualizacion = 'PRIM';
            btnP.classList.add('grafo-btn-active');
            btnD.classList.remove('grafo-btn-active');
        }
    });

    // ── Modal grafo ───────────────────────────────────────────────
    if (btnVerGrafo) {
        btnVerGrafo.addEventListener('click', () => {
            modalGrafo.classList.remove('hidden');
            cancelAnimationFrame(animationFrameId);
            dibujarGrafo();
        });
    }

    if (btnCerrarGrafo) {
        btnCerrarGrafo.addEventListener('click', () => {
            modalGrafo.classList.add('hidden');
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        });
    }

    // ── Navegación ────────────────────────────────────────────────
    if (btnNuevaSimSidebar) {
        btnNuevaSimSidebar.addEventListener('click', () => {
            if (btnSalirPlayback) btnSalirPlayback.classList.add('hidden');
            if (btnReiniciarSim)  btnReiniciarSim.classList.remove('hidden');
            if (btnConcluirSim)   btnConcluirSim.classList.remove('hidden');
            generarNuevaSimulacion();
            navSimulacion.click();
        });
    }

    if (btnReiniciarSim) btnReiniciarSim.addEventListener('click', generarNuevaSimulacion);
    if (selectOperacion) selectOperacion.addEventListener('change', generarNuevaSimulacion);

    // ── Concluir simulación ───────────────────────────────────────
    if (btnConcluirSim) {
        btnConcluirSim.addEventListener('click', async () => {
            const nombrePaciente = inputPaciente ? inputPaciente.value.trim() : '';
            if (!nombrePaciente) {
                window.mostrarAlerta("Datos Incompletos", "Por favor ingrese el nombre del paciente.", "error");
                return;
            }

            btnConcluirSim.setAttribute('disabled', true);
            btnConcluirSim.textContent = "Procesando...";

            const riskScore = parseInt(valRiskScore.textContent);
            const riskLvl   = riskScore > 70 ? "CRÍTICO" : riskScore > 30 ? "CAUTELOSO" : "SEGURO";
            const grafoJSON = { grafo: grafoActual, posiciones: posicionesNodos, ruta: rutaOptimaActual, aristasMST: arbolPrimActual };

            const nuevaSim = {
                id: `SIM-2026-${randomInt(1000, 9999)}`,
                date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                status: "LOCAL",
                patientId: lblPacienteId.textContent,
                patientName: nombrePaciente,
                riskLvl, riskScore,
                timeEst: `${randomInt(2, 6)}h ${randomInt(10, 50)}m`,
                operation: selectOperacion ? selectOperacion.value : '',
                doctor_id: state.doctorLogueado ? state.doctorLogueado.id : null,
                grafo_json: grafoJSON,
                fcBase: fcActual,
                paSistBase: paSistActual
            };

            if (!window.modoDeContingencia && window.supabaseCliente) {
                try {
                    await window.supabaseCliente.from('simulaciones').insert([{
                        id: nuevaSim.id, date: nuevaSim.date,
                        patient_id: nuevaSim.patientId, patient_name: nuevaSim.patientName,
                        risk_lvl: nuevaSim.riskLvl, risk_score: nuevaSim.riskScore,
                        time_est: nuevaSim.timeEst, operation: nuevaSim.operation,
                        status: nuevaSim.status, doctor_id: nuevaSim.doctor_id,
                        grafo_json: nuevaSim.grafo_json
                    }]);
                } catch (err) {
                    console.error("Error al guardar:", err.message);
                }
            }

            let locales = JSON.parse(localStorage.getItem('simulaciones_backup') || '[]');
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

    // ── Playback de simulación guardada ──────────────────────────
    window.iniciarPlayback = function(sim) {
        if (inputPaciente) { inputPaciente.value = sim.patientName; inputPaciente.setAttribute('readonly', true); }
        if (lblPacienteId) lblPacienteId.textContent = sim.patientId;
        if (selectOperacion) { selectOperacion.value = sim.operation; selectOperacion.setAttribute('disabled', true); }

        if (btnReiniciarSim) btnReiniciarSim.classList.add('hidden');
        if (btnConcluirSim)  btnConcluirSim.classList.add('hidden');
        if (btnSalirPlayback) btnSalirPlayback.classList.remove('hidden');

        const datos     = sim.grafo_json || sim.grafo || {};
        grafoActual     = datos.grafo      || generarGrafoJerarquico(50).grafo;
        posicionesNodos = datos.posiciones || generarGrafoJerarquico(50).posiciones;
        rutaOptimaActual = datos.ruta      || [];
        arbolPrimActual  = datos.aristasMST || [];

        fcActual     = sim.fcBase     || 85;
        paSistActual = sim.paSistBase || 125;
        paDiastActual = 80;

        if (simInterval) clearInterval(simInterval);
        simInterval = setInterval(() => {
            fcActual     = Math.max(50, Math.min(130, fcActual + randomInt(-1, 1)));
            paSistActual = Math.max(90, Math.min(180, paSistActual + randomInt(-2, 2)));
            if (valFc)  valFc.textContent  = fcActual;
            if (valPa)  valPa.textContent  = `${paSistActual}/${paDiastActual}`;
            if (ecgWave) ecgWave.style.animationDuration = `${120 / fcActual}s`;
            if (valRiskScore) valRiskScore.textContent = `${sim.riskScore}%`;
        }, 2000);
    };

    if (btnSalirPlayback) {
        btnSalirPlayback.addEventListener('click', () => {
            if (btnSalirPlayback) btnSalirPlayback.classList.add('hidden');
            if (btnReiniciarSim)  btnReiniciarSim.classList.remove('hidden');
            if (btnConcluirSim)   btnConcluirSim.classList.remove('hidden');
            generarNuevaSimulacion();
        });
    }
}
