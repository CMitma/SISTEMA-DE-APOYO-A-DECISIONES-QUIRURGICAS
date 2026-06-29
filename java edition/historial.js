// ==========================================
// HISTORIAL (navegación de vistas + render)
// ==========================================
function initHistorial({ state, navSimulacion, navAnalisis, navHistorial, vistaSimulacion, vistaAnalisis, vistaHistorial, breadcrumbActual }) {

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
        navSimulacion.classList.add('active');
        vistaSimulacion.classList.remove('hidden');
        breadcrumbActual.textContent = "Simulación Quirúrgica";
    });

    navAnalisis.addEventListener('click', (e) => {
        e.preventDefault(); resetViews();
        navAnalisis.classList.add('active');
        vistaAnalisis.classList.remove('hidden');
        breadcrumbActual.textContent = "Análisis de Pacientes";
    });

    navHistorial.addEventListener('click', (e) => {
        e.preventDefault(); resetViews();
        navHistorial.classList.add('active');
        vistaHistorial.classList.remove('hidden');
        breadcrumbActual.textContent = "Historial de Procedimientos";
    });

    function renderHistorial() {
        const tbody = document.getElementById('historial-tbody');
        tbody.innerHTML = '';
        let criticos = 0;
        state.simulations.forEach(sim => {
            if (sim.riskLvl === "CRÍTICO") criticos++;
            let badgeClass = sim.riskLvl === "SEGURO" ? "badge-safe" : (sim.riskLvl === "CRÍTICO" ? "badge-critical" : "badge-warning");
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sim.id}</strong></td>
                <td>${sim.date}</td>
                <td><strong>${sim.patientId}</strong> ${sim.patientName}</td>
                <td><span class="badge ${badgeClass}"><i class="fa-solid fa-circle"></i> ${sim.riskLvl}</span></td>
                <td>${sim.timeEst} / ${sim.riskScore}% risk</td>
                <td class="actions-cell"><i class="fa-regular fa-eye"></i> <i class="fa-regular fa-file-lines"></i></td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById('hist-total').textContent = state.simulations.length;
        document.getElementById('hist-criticos').textContent = criticos;
    }

    function renderAnalisis() {
        let total = state.simulations.length;
        if (total === 0) return;
        let totalRisk = 0;
        let cSafe = 0, cWarn = 0, cCrit = 0;
        let cBypass = 0, cTrans = 0, cValv = 0;
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
        document.getElementById('ana-nuevas-hoy').textContent = `+${total - 2} agregadas hoy`;
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

    return { actualizarVistas };
}
