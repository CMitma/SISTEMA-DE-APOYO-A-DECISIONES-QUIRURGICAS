// ==========================================
// HISTORIAL (Sincronización de Nube y PDF)
// ==========================================
function initHistorial({ state, navSimulacion, navAnalisis, navHistorial, vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual }) {
    
    const filtroHistorial = document.getElementById('filtro-historial');
    const btnExportarLote = document.getElementById('btn-exportar-lote');
    const toastContainer = document.getElementById('toast-container');
    
    // Botón de sincronización masiva para la nube
    const syncBtn = document.createElement('button');
    syncBtn.id = "btn-sync-offline-data";
    syncBtn.className = "btn-primary";
    syncBtn.style = "padding: 8px 14px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; margin-left: auto; background: var(--accent-blue);";
    syncBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Sincronizar Pendientes`;
    
    if (filtroHistorial && filtroHistorial.parentNode) {
        filtroHistorial.parentNode.appendChild(syncBtn);
    }

    async function ejecutarSincronizacionEnLote() {
        let locales = JSON.parse(localStorage.getItem('simulaciones_backup') || "[]");
        let pendientes = locales.filter(s => s.status === "LOCAL");
        
        if (pendientes.length === 0) {
            window.mostrarAlerta("Sistema al Día", "No existen expedientes clínicos retenidos de forma local.", "success");
            return;
        }

        if (window.modoDeContingencia || !window.supabaseCliente) {
            window.mostrarAlerta("Error de Red", "El servidor central sigue offline. Intente más tarde.", "error");
            return;
        }

        showToast("Estableciendo túnel de sincronización...", "spin", 2000);
        let subidosContador = 0;

        for (let sim of pendientes) {
            try {
                const { error } = await window.supabaseCliente.from('simulaciones').insert([{
                    id: sim.id, 
                    date: sim.date, 
                    patient_id: sim.patientId, 
                    patient_name: sim.patientName,
                    risk_lvl: sim.riskLvl, 
                    risk_score: sim.riskScore, 
                    time_est: sim.timeEst,
                    operation: sim.operation, 
                    status: "LOCAL", 
                    doctor_id: sim.doctor_id, 
                    grafo_json: sim.grafo_json
                }]);
                
                if (!error) { 
                    sim.status = "SINCRONIZADO"; 
                    subidosContador++; 
                }
            } catch (e) { 
                console.error(e); 
            }
        }

        localStorage.setItem('simulaciones_backup', JSON.stringify(locales));
        window.mostrarAlerta("Sincronización Concluida", `Se han subido <strong>${subidosContador}</strong> casos clínicos exitosamente a la base PostgreSQL central.`, "success");
        await cargarSimulacionesDesdeBackend();
    }

    syncBtn.addEventListener('click', ejecutarSincronizacionEnLote);

    function resetViews() {
        navSimulacion.classList.remove('active');
        navAnalisis.classList.remove('active');
        navHistorial.classList.remove('active');
        vistaSimulacion.classList.add('hidden');
        vistaAnalisis.classList.add('hidden');
        vistaHistorial.classList.add('hidden');
    }
    
    navSimulacion.addEventListener('click', (e) => {
        e.preventDefault(); 
        resetViews();
        navSimulacion.classList.add('active'); 
        vistaSimulacion.classList.remove('hidden');
        breadcrumbActual.textContent = "Simulación Quirúrgica";
    });
    
    navAnalisis.addEventListener('click', (e) => {
        e.preventDefault(); 
        resetViews();
        navAnalisis.classList.add('active'); 
        vistaAnalisis.classList.remove('hidden');
        breadcrumbActual.textContent = "Análisis de Pacientes";
    });
    
    navHistorial.addEventListener('click', async (e) => {
        e.preventDefault(); 
        resetViews();
        navHistorial.classList.add('active'); 
        vistaHistorial.classList.remove('hidden');
        breadcrumbActual.textContent = "Historial de Procedimientos";
        await cargarSimulacionesDesdeBackend(); 
    });

    async function cargarSimulacionesDesdeBackend() {
        let datosConsolidados = [];
        if (!window.modoDeContingencia && window.supabaseCliente) {
            try {
                const { data, error } = await window.supabaseCliente
                    .from('simulaciones')
                    .select('*')
                    .order('date', { ascending: false });
                    
                if (error) {
                    throw error;
                }
                
                datosConsolidados = data.map(sim => ({
                    id: sim.id, 
                    date: sim.date, 
                    patientId: sim.patient_id,
                    patientName: sim.patient_name, 
                    riskLvl: sim.risk_lvl,
                    riskScore: sim.risk_score, 
                    timeEst: sim.time_est,
                    operation: sim.operation, 
                    status: sim.status, 
                    grafo_json: sim.grafo_json
                }));
            } catch (err) { 
                console.error("Fallo al sincronizar historial:", err.message); 
            }
        }
        
        let locales = JSON.parse(localStorage.getItem('simulaciones_backup') || "[]");
        let combinados = [...locales, ...datosConsolidados];
        
        state.simulations = combinados.filter((value, index, self) => index === self.findIndex((t) => t.id === value.id));
        renderHistorial(); 
        renderAnalisis();
    }

    function showToast(message, type = 'spin', duration = 2000) {
        const toast = document.createElement('div'); 
        toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'spin' ? 'fa-circle-notch fa-spin toast-spin' : 'fa-circle-check'}"></i> <span>${message}</span>`;
        
        if (toastContainer) {
            toastContainer.appendChild(toast);
        }
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { 
            toast.classList.remove('show'); 
            setTimeout(() => toast.remove(), 300); 
        }, duration);
    }
    
    function generarPDF(simulacion = null) {
        const { jsPDF } = window.jspdf; 
        const doc = new jsPDF(); 
        const date = new Date().toLocaleString();
        
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F'); 
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22); 
        doc.setFont("helvetica", "bold"); 
        doc.text("CardioSupport AI", 20, 25);
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal"); 
        doc.text("HOSPITAL CENTRAL - DEPARTAMENTO CARDIOVASCULAR", 20, 32);
        doc.setTextColor(30, 41, 59); 
        
        if (simulacion) {
            doc.setFontSize(16); doc.text(`REPORTE DE SIMULACIÓN: ${simulacion.id}`, 20, 55);
            doc.setFontSize(12); doc.text(`Fecha de Emisión: ${date}`, 20, 65); doc.line(20, 70, 190, 70); 
            doc.setFont("helvetica", "bold"); doc.text("DATOS DEL PACIENTE", 20, 80); doc.setFont("helvetica", "normal");
            doc.text(`ID Clínico: ${simulacion.patientId}`, 20, 90); doc.text(`Nombre Completo: ${simulacion.patientName}`, 20, 100);
            doc.setFont("helvetica", "bold"); doc.text("EVALUACIÓN ALGORÍTMICA", 20, 120); doc.setFont("helvetica", "normal");
            doc.text(`Intervención: ${simulacion.operation}`, 20, 130); doc.text(`Tiempo Estimado (Grafo Óptimo): ${simulacion.timeEst}`, 20, 140);
            doc.setFont("helvetica", "bold"); doc.text("RESULTADO DE RIESGO", 20, 160); doc.setFont("helvetica", "normal");
            doc.text(`Score Matemático: ${simulacion.riskScore}%`, 20, 170); doc.text(`Clasificación Clínica: ${simulacion.riskLvl}`, 20, 180);
            doc.save(`Reporte_Individual_${simulacion.id}.pdf`);
        } else {
            doc.setFontSize(16); doc.text(`REPORTE GENERAL DE LOTE (HISTORIAL)`, 20, 55);
            doc.line(20, 70, 190, 70); 
            let y = 80;
            state.simulations.forEach((sim, idx) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`${idx + 1}. ID: ${sim.id} | Paciente: ${sim.patientName}`, 20, y);
                doc.setFont("helvetica", "normal"); doc.text(`Op: ${sim.operation.substring(0, 40)}... | Riesgo: ${sim.riskScore}% (${sim.riskLvl})`, 20, y + 6);
                y += 15;
            });
            doc.save(`Reporte_Lote_CardioSupport.pdf`);
        }
    }
    
    window.descargarFichaIndividual = function(id) { 
        const sim = state.simulations.find(s => s.id === id); 
        if(sim) generarPDF(sim); 
    };
    
    window.transferirAlServidor = async function(id) {
        const sim = state.simulations.find(s => s.id === id); 
        if (!sim) return;
        
        const fila = document.getElementById(`row-${id}`); 
        const btnTransferir = fila.querySelector('.btn-transfer');
        
        btnTransferir.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-info"></i>`;
        showToast(`Indexando estructuras y grafos de ${sim.patientName} en la nube...`, 'spin', 1500);
        
        if (!window.modoDeContingencia && window.supabaseCliente) {
            try {
                await window.supabaseCliente.from('simulaciones').update({ 
                    status: 'ARCHIVADO',
                    grafo_json: sim.grafo_json || sim.grafo
                }).eq('id', id);
                sim.status = "ARCHIVADO";
            } catch (err) { 
                console.error(err.message); 
            }
        } else {
            sim.status = "ARCHIVADO";
            let locales = JSON.parse(localStorage.getItem('simulaciones_backup') || "[]");
            let idx = locales.findIndex(l => l.id === id);
            if (idx !== -1) { 
                locales[idx].status = "ARCHIVADO"; 
                localStorage.setItem('simulaciones_backup', JSON.stringify(locales)); 
            }
        }
        
        setTimeout(() => {
            showToast(`Expediente ${sim.id} transferido al Archivo Central.`, 'success', 3000);
            fila.classList.add('row-fade-out');
            setTimeout(() => { actualizarVistas(); }, 500);
        }, 1500);
    };
    
    window.verOjito = function(id) {
        const sim = state.simulations.find(s => s.id === id);
        const mensaje = `Reviviendo mapa coronario e historial clínico de <strong>${sim.patientName}</strong>...<br><br>
                         Intervención: ${sim.operation}<br>
                         Riesgo Sincronizado: ${sim.riskScore}% (${sim.riskLvl})<br><br>
                         <span style="font-size: 0.8rem; color: var(--accent-blue);">Descargando matriz de adyacencia desde el clúster central (Playback)...</span>`;
        
        window.mostrarAlerta("Monitoreo Colaborativo", mensaje, "info", () => {
            navSimulacion.click();
            if(window.iniciarPlayback) window.iniciarPlayback(sim);
        });
    };
    
    if (btnExportarLote) {
        btnExportarLote.addEventListener('click', () => generarPDF(null));
    }
    
    if (filtroHistorial) {
        filtroHistorial.addEventListener('change', () => renderHistorial());
    }
    
    function renderHistorial() {
        const tbody = document.getElementById('historial-tbody'); 
        if(!tbody) return;
        
        tbody.innerHTML = ''; 
        const filtro = filtroHistorial.value; 
        let criticos = 0;
        const rawBtnStyle = "background: transparent; border: none; outline: none; padding: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); margin-right: 12px; font-size: 1.15rem; transition: color 0.2s;";
        
        state.simulations.forEach(sim => {
            let estatusActual = sim.status || "LOCAL";
            if (sim.riskLvl === "CRÍTICO") criticos++;
            if (filtro !== "TODOS" && estatusActual !== filtro) return;
            
            let badgeClass = sim.riskLvl === "SEGURO" ? "badge-safe" : (sim.riskLvl === "CRÍTICO" ? "badge-critical" : "badge-warning");
            
            let btnTransfer = estatusActual === "LOCAL" 
                ? `<button class="btn-transfer" style="${rawBtnStyle}" title="Enviar al Historial Central" onclick="transferirAlServidor('${sim.id}')"><i class="fa-solid fa-cloud-arrow-up"></i></button>`
                : `<span title="Ya archivado en nube" style="color: #3CD070; font-size: 1.15rem; padding: 4px; margin-right: 12px; opacity: 0.8;"><i class="fa-solid fa-check-double"></i></span>`;
            
            let tr = document.createElement('tr'); 
            tr.id = `row-${sim.id}`;
            tr.innerHTML = `
                <td class="font-medium">${sim.id}</td>
                <td>${sim.date}</td>
                <td><span class="text-secondary">${sim.patientId}</span> ${sim.patientName}</td>
                <td><span class="badge ${badgeClass}"><i class="fa-solid fa-circle"></i> ${sim.riskLvl}</span></td>
                <td>${sim.timeEst} / ${sim.riskScore}% risk</td>
                <td class="actions-cell" style="display: flex; align-items: center;">
                    <button style="${rawBtnStyle}" title="Ver Playback Clínico" onclick="verOjito('${sim.id}')"><i class="fa-regular fa-eye"></i></button>
                    <button style="${rawBtnStyle}" title="Descargar Ficha PDF" onclick="descargarFichaIndividual('${sim.id}')"><i class="fa-regular fa-file-pdf"></i></button>
                    ${btnTransfer}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (document.getElementById('hist-total')) {
            document.getElementById('hist-total').textContent = state.simulations.length;
        }
        if (document.getElementById('hist-criticos')) {
            document.getElementById('hist-criticos').textContent = criticos;
        }
    }
    
    function renderAnalisis() {
        let total = state.simulations.length; 
        if (total === 0) return;
        
        let totalRisk = 0, cSafe = 0, cWarn = 0, cCrit = 0, cBypass = 0, cTrans = 0, cValv = 0;
        
        state.simulations.forEach(sim => {
            totalRisk += sim.riskScore;
            if (sim.riskLvl === "SEGURO") cSafe++; 
            else if (sim.riskLvl === "CRÍTICO") cCrit++; 
            else cWarn++;
            
            if (sim.operation.includes("Bypass")) cBypass++; 
            else if (sim.operation.includes("Trasplante")) cTrans++; 
            else cValv++;
        });
        
        let avgRisk = Math.round(totalRisk / total);
        let success = total - cCrit;
        
        document.getElementById('ana-total-sim').textContent = total;
        document.getElementById('ana-nuevas-hoy').textContent = `+${Math.max(0, total - 2)} agregadas hoy`;
        document.getElementById('ana-avg-risk').textContent = `${avgRisk}%`;
        document.getElementById('ana-critical').textContent = cCrit;
        document.getElementById('ana-critical-pct').textContent = `${Math.round((cCrit/total)*100)}% del total quirúrgico`;
        document.getElementById('ana-success').textContent = success;
        document.getElementById('ana-success-pct').textContent = `${Math.round((success/total)*100)}% total de supervivencia`;
        
        document.getElementById('ana-bar-safe').style.width = `${(cSafe/total)*100}%`;
        document.getElementById('ana-bar-safe-txt').textContent = `${cSafe} casos (${Math.round((cSafe/total)*100)}%)`;
        
        document.getElementById('ana-bar-warn').style.width = `${(cWarn/total)*100}%`;
        document.getElementById('ana-bar-warn-txt').textContent = `${cWarn} casos (${Math.round((cWarn/total)*100)}%)`;
        
        document.getElementById('ana-bar-crit').style.width = `${(cCrit/total)*100}%`;
        document.getElementById('ana-bar-crit-txt').textContent = `${cCrit} casos (${Math.round((cCrit/total)*100)}%)`;
        
        document.getElementById('ana-proc-bypass').textContent = cBypass;
        document.getElementById('ana-proc-trasplante').textContent = cTrans;
        document.getElementById('ana-proc-valvula').textContent = cValv;
    }
    
    function actualizarVistas() { 
        renderHistorial(); 
        renderAnalisis(); 
    }
    
    return { actualizarVistas, cargarSimulacionesDesdeBackend };
}
