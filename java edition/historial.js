// ==========================================
// HISTORIAL (Filtros, Transferencias y PDF)
// ==========================================
function initHistorial({ state, navSimulacion, navAnalisis, navHistorial, vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual }) {

    const filtroHistorial = document.getElementById('filtro-historial');
    const btnExportarLote = document.getElementById('btn-exportar-lote');
    const toastContainer = document.getElementById('toast-container');

    function resetViews() {
        navSimulacion.classList.remove('active');
        navAnalisis.classList.remove('active');
        navHistorial.classList.remove('active');
        vistaSimulacion.classList.add('hidden');
        vistaAnalisis.classList.add('hidden');
        vistaHistorial.classList.add('hidden');
    }

    navSimulacion.addEventListener('click', (e) => {
        e.preventDefault(); resetViews();
        navSimulacion.classList.add('active'); vistaSimulacion.classList.remove('hidden');
        breadcrumbActual.textContent = "Simulación Quirúrgica";
    });

    navAnalisis.addEventListener('click', (e) => {
        e.preventDefault(); resetViews();
        navAnalisis.classList.add('active'); vistaAnalisis.classList.remove('hidden');
        breadcrumbActual.textContent = "Análisis de Pacientes";
    });

    navHistorial.addEventListener('click', (e) => {
        e.preventDefault(); resetViews();
        navHistorial.classList.add('active'); vistaHistorial.classList.remove('hidden');
        breadcrumbActual.textContent = "Historial de Procedimientos";
        renderHistorial(); 
    });

    function showToast(message, type = 'spin', duration = 2000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'spin' ? 'fa-circle-notch fa-spin toast-spin' : 'fa-circle-check'}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
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
            doc.setFontSize(16);
            doc.text(`REPORTE DE SIMULACIÓN: ${simulacion.id}`, 20, 55);
            doc.setFontSize(12);
            doc.text(`Fecha de Emisión: ${date}`, 20, 65);
            doc.line(20, 70, 190, 70); 
            doc.setFont("helvetica", "bold"); doc.text("DATOS DEL PACIENTE", 20, 80);
            doc.setFont("helvetica", "normal");
            doc.text(`ID Clínico: ${simulacion.patientId}`, 20, 90);
            doc.text(`Nombre Completo: ${simulacion.patientName}`, 20, 100);

            doc.setFont("helvetica", "bold"); doc.text("EVALUACIÓN ALGORÍTMICA", 20, 120);
            doc.setFont("helvetica", "normal");
            doc.text(`Intervención: ${simulacion.operation}`, 20, 130);
            doc.text(`Tiempo Estimado (Grafo óptimo): ${simulacion.timeEst}`, 20, 140);
            
            doc.setFont("helvetica", "bold"); doc.text("RESULTADO DE RIESGO PERIOPERATORIO", 20, 160);
            doc.setFont("helvetica", "normal");
            doc.text(`Score Matemático: ${simulacion.riskScore}%`, 20, 170);
            doc.text(`Clasificación Clínica: ${simulacion.riskLvl}`, 20, 180);
            doc.text(`Estado en el Sistema: ${simulacion.status === 'ARCHIVADO' ? 'Transferido al Expediente Central' : 'Bandeja Local (Sin auditar)'}`, 20, 190);

            doc.save(`Reporte_Individual_${simulacion.id}.pdf`);
        } else {
            doc.setFontSize(16);
            doc.text(`REPORTE GENERAL DE LOTE (HISTORIAL)`, 20, 55);
            doc.setFontSize(12);
            doc.text(`Total de registros exportados: ${state.simulations.length}`, 20, 65);
            doc.line(20, 70, 190, 70);
            
            let y = 80;
            state.simulations.forEach((sim, idx) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`${idx + 1}. ID: ${sim.id} | Paciente: ${sim.patientName}`, 20, y);
                doc.setFont("helvetica", "normal");
                doc.text(`Op: ${sim.operation.substring(0, 40)}... | Riesgo: ${sim.riskScore}% (${sim.riskLvl}) | Estado: ${sim.status}`, 20, y + 6);
                y += 15;
            });

            doc.save(`Reporte_Lote_CardioSupport.pdf`);
        }
    }

    window.descargarFichaIndividual = function(id) {
        const sim = state.simulations.find(s => s.id === id);
        if(sim) generarPDF(sim);
    };

    window.transferirAlServidor = function(id) {
        const sim = state.simulations.find(s => s.id === id);
        if(!sim) return;

        const fila = document.getElementById(`row-${id}`);
        const btnTransferir = fila.querySelector('.btn-transfer');
        
        btnTransferir.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-info"></i>`;
        showToast(`Indexando grafos de ${sim.patientName}...`, 'spin', 1500);

        setTimeout(() => {
            showToast(`Expediente ${sim.id} transferido al Archivo Central.`, 'success', 3000);
            sim.status = "ARCHIVADO"; 
            
            fila.classList.add('row-fade-out');
            setTimeout(() => {
                actualizarVistas(); 
            }, 500);
        }, 1500);
    };

    window.verOjito = function(id) {
        const sim = state.simulations.find(s => s.id === id);
        const mensaje = `Reviviendo datos hemodinámicos históricos del paciente <strong>${sim.patientName}</strong>...<br><br>
                         • Intervención: ${sim.operation}<br>
                         • Riesgo Detectado: ${sim.riskScore}%<br><br>
                         <span style="font-size: 0.8rem; color: var(--accent-blue);">Iniciando motor de renderizado de grafos (Playback)...</span>`;
        
        window.mostrarAlerta("Playback de Monitoreo", mensaje, "info", () => {
            navSimulacion.click();
            if(window.iniciarPlayback) window.iniciarPlayback(sim);
        });
    };

    if(btnExportarLote) btnExportarLote.addEventListener('click', () => generarPDF(null));
    if(filtroHistorial) filtroHistorial.addEventListener('change', () => renderHistorial());

    function renderHistorial() {
        const tbody = document.getElementById('historial-tbody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        const filtro = filtroHistorial.value; 
        let criticos = 0;
        let countMostrados = 0;
        
        const rawBtnStyle = "background: transparent; border: none; outline: none; padding: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); margin-right: 12px; font-size: 1.15rem; transition: color 0.2s;";

        state.simulations.forEach(sim => {
            if(!sim.status) sim.status = "LOCAL";
            if (sim.riskLvl === "CRÍTICO") criticos++;
            if (filtro !== "TODOS" && sim.status !== filtro) return;
            
            countMostrados++;
            let badgeClass = sim.riskLvl === "SEGURO" ? "badge-safe" : (sim.riskLvl === "CRÍTICO" ? "badge-critical" : "badge-warning");
            
            let btnTransfer = sim.status === "LOCAL" 
                ? `<button class="btn-transfer" style="${rawBtnStyle}" title="Enviar al Historial Central" onclick="transferirAlServidor('${sim.id}')"><i class="fa-solid fa-cloud-arrow-up"></i></button>`
                : `<span title="Ya archivado" style="color: var(--node-safe); font-size: 1.15rem; padding: 4px; margin-right: 12px; opacity: 0.6;"><i class="fa-solid fa-check"></i></span>`;

            let tr = document.createElement('tr');
            tr.id = `row-${sim.id}`;
            tr.innerHTML = `
                <td class="font-medium">${sim.id}</td>
                <td>${sim.date}</td>
                <td><span class="text-secondary">${sim.patientId}</span> ${sim.patientName}</td>
                <td><span class="badge ${badgeClass}"><i class="fa-solid fa-circle"></i> ${sim.riskLvl}</span></td>
                <td>${sim.timeEst} / ${sim.riskScore}% risk</td>
                <td class="actions-cell" style="display: flex; align-items: center;">
                    <button style="${rawBtnStyle}" title="Ver Playback Clínico" onclick="verOjito('${sim.id}')" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-secondary)'"><i class="fa-regular fa-eye"></i></button>
                    <button style="${rawBtnStyle}" title="Descargar Ficha PDF" onclick="descargarFichaIndividual('${sim.id}')" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-secondary)'"><i class="fa-regular fa-file-pdf"></i></button>
                    ${btnTransfer}
                </td>
            `;
            tbody.appendChild(tr);
        });

        const totalHist = document.getElementById('hist-total');
        const critHist = document.getElementById('hist-criticos');
        if(totalHist) totalHist.textContent = state.simulations.length;
        if(critHist) critHist.textContent = criticos;
        
        const pagInfo = document.querySelector('.pagination-info');
        if(pagInfo) pagInfo.textContent = `Mostrando ${countMostrados} resultados de ${filtro}`;
    }

    function renderAnalisis() {
        let total = state.simulations.length;
        if (total === 0) return;
        let totalRisk = 0, cSafe = 0, cWarn = 0, cCrit = 0, cBypass = 0, cTrans = 0, cValv = 0;
        state.simulations.forEach(sim => {
            totalRisk += sim.riskScore;
            if (sim.riskLvl === "SEGURO") cSafe++; else if (sim.riskLvl === "CRÍTICO") cCrit++; else cWarn++;
            if (sim.operation.includes("Bypass")) cBypass++; else if (sim.operation.includes("Trasplante")) cTrans++; else cValv++;
        });
        let avgRisk = Math.round(totalRisk / total), success = total - cCrit;
        
        const el = (id, val) => { if(document.getElementById(id)) document.getElementById(id).textContent = val; };
        el('ana-total-sim', total); el('ana-nuevas-hoy', `+${total - 2} agregadas hoy`);
        el('ana-avg-risk', `${avgRisk}%`); el('ana-critical', cCrit);
        el('ana-critical-pct', `${Math.round((cCrit/total)*100)}% del total quirúrgico`);
        el('ana-success', success); el('ana-success-pct', `${Math.round((success/total)*100)}% total de supervivencia`);
        
        if(document.getElementById('ana-bar-safe')) {
            document.getElementById('ana-bar-safe').style.width = `${(cSafe/total)*100}%`;
            document.getElementById('ana-bar-warn').style.width = `${(cWarn/total)*100}%`;
            document.getElementById('ana-bar-crit').style.width = `${(cCrit/total)*100}%`;
        }
        el('ana-bar-safe-txt', `${cSafe} casos`); el('ana-bar-warn-txt', `${cWarn} casos`); el('ana-bar-crit-txt', `${cCrit} casos`);
        el('ana-proc-bypass', cBypass); el('ana-proc-trasplante', cTrans); el('ana-proc-valvula', cValv);
    }

    function actualizarVistas() { renderHistorial(); renderAnalisis(); }

    return { actualizarVistas };
}
