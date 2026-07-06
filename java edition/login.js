// =================================================================
// LOGIN MULTI-USUARIO DINÁMICO Y REGISTRO DE AUDITORÍA
// =================================================================
function initLogin({ state, loginScreen, appMain, loginForm, btnLogout, resetLogoutTimer, actualizarVistas, logoutTimerRef, selectInactividad }) {
    
    const btnDescargarLog = document.getElementById('btn-descargar-log');
    if (btnDescargarLog) {
        btnDescargarLog.addEventListener('click', async () => {
            let datosPlano = "=== REGISTRO DE USUARIOS (ARCHIVO PLANO) ===\n\n";
            if (!window.modoDeContingencia && window.supabaseCliente) {
                const { data } = await window.supabaseCliente.from('registro_accesos').select('*').order('fecha_hora', { ascending: false });
                if (data) {
                    data.forEach(u => {
                        datosPlano += `QUIROFANO: ${u.codigo_quirofano} | FECHA: ${new Date(u.fecha_hora).toLocaleString()} | EVENTO: ${u.evento}\n`;
                    });
                }
            } else {
                let users = JSON.parse(localStorage.getItem('local_db_users')) || [];
                users.forEach(u => {
                    datosPlano += `QUIROFANO: ${u.id} | FECHA: ${u.loginTime} (MODO CONTINGENCIA LOCAL)\n`;
                });
            }
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
        
        const identificador = document.getElementById('email').value.trim();
        const token = document.getElementById('surgeonCode').value.trim();
        let doctorValidado = null;

        if (!window.modoDeContingencia && window.supabaseCliente) {
            try {
                const { data, error } = await window.supabaseCliente
                    .from('doctores')
                    .select('*')
                    .eq('codigo_quirofano', identificador)
                    .eq('token_autorizacion', token)
                    .single();
                    
                if (error || !data) {
                    throw new Error("Credenciales Inválidas");
                }
                
                doctorValidado = data;
                
                // Registro del acceso en Supabase
                await window.supabaseCliente.from('registro_accesos').insert([
                    { codigo_quirofano: identificador, evento: "Inicio de sesión exitoso - Servidor Nube" }
                ]);
                
            } catch (err) { 
                window.mostrarAlerta("Fallo de Autenticación", "Identificador de Quirófano o Token Clínico incorrecto.", "error"); 
                return; 
            }
        } else {
            if (identificador === "Q-OR-04" && token === "123456") {
                doctorValidado = { 
                    id: 1, nombres: "Alejandro", apellidos: "Montenegro Solís", codigo_quirofano: "Q-OR-04", 
                    dni: "45781293", fecha_nacimiento: "12 de Abril de 1982", cmp: "28280921", 
                    hospital: "Hospital Central", domicilio: "Calle Mayor, 42 - Surco" 
                };
            } else if (identificador === "Q-OR-05" && token === "654321") {
                doctorValidado = { 
                    id: 2, nombres: "Paolo", apellidos: "Ordaya Guerrero", codigo_quirofano: "Q-OR-05", 
                    dni: "49103640", fecha_nacimiento: "21 de Octubre de 2005", cmp: "99381244", 
                    hospital: "Clínica Quirúrgica Lince", domicilio: "Av. Las Gardenias 123 - Surco" 
                };
            } else { 
                window.mostrarAlerta("Fallo", "Credenciales incorrectas en el Respaldo Local.", "error"); 
                return; 
            }
            
            let users = JSON.parse(localStorage.getItem('local_db_users')) || [];
            users.push({ id: identificador, loginTime: new Date().toLocaleString() }); 
            localStorage.setItem('local_db_users', JSON.stringify(users));
        }


        state.doctorLogueado = doctorValidado;
        window.state.doctorLogueado = doctorValidado;
        
        if (document.getElementById('modal-doctor-name')) {
            document.getElementById('modal-doctor-name').textContent = `Dr. ${doctorValidado.nombres} ${doctorValidado.apellidos}`;
        }
        
        loginScreen.classList.add('hidden'); 
        appMain.classList.remove('hidden'); 
        resetLogoutTimer();
        
        if (window.historialControlador) {
            await window.historialControlador.cargarSimulacionesDesdeBackend();
        }
    });

    btnLogout.addEventListener('click', (e) => {
        e.preventDefault(); 
        appMain.classList.add('hidden'); 
        loginScreen.classList.remove('hidden'); 
        loginForm.reset(); 
        clearTimeout(logoutTimerRef.value);
    });
}
