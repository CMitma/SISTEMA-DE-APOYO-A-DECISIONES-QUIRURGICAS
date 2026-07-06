// ==========================================
// PERFIL MÉDICO MULTI-USUARIO DINÁMICO
// ==========================================
function initPerfilMedico() {
    const modalMedico = document.getElementById('modal-medico');
    const btnAvatarPerfil = document.getElementById('btn-avatar-perfil');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const formContainer = document.getElementById('profile-form');
    const btnModificar = document.getElementById('btn-modificar');
    const btnGuardar = document.getElementById('btn-guardar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const inputs = document.querySelectorAll('.data-input');
    const STORAGE_KEY = 'doctor_profile_data';

    function populateFields() {
        try {
            if (window.state && window.state.doctorLogueado) {
                const doc = window.state.doctorLogueado;
                
                if (document.getElementById('input-nombres')) document.getElementById('input-nombres').value = doc.nombres || "";
                if (document.getElementById('input-apellidos')) document.getElementById('input-apellidos').value = doc.apellidos || "";
                if (document.getElementById('modal-doctor-name')) document.getElementById('modal-doctor-name').textContent = `Dr. ${doc.nombres || ""} ${doc.apellidos || ""}`;
                
                if (document.getElementById('input-dni')) document.getElementById('input-dni').value = doc.dni || "No registrado";
                if (document.getElementById('input-fecha')) document.getElementById('input-fecha').value = doc.fecha_nacimiento || "No registrado";
                if (document.getElementById('input-cmp')) document.getElementById('input-cmp').value = doc.cmp || "No registrado";
                if (document.getElementById('input-hospital')) document.getElementById('input-hospital').value = doc.hospital || "No registrado";
                if (document.getElementById('input-domicilio')) document.getElementById('input-domicilio').value = doc.domicilio || "No registrado";
            } else {
                // Plan de emergencia (Local)
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (document.getElementById('input-nombres')) document.getElementById('input-nombres').value = data.nombres || "";
                    if (document.getElementById('input-apellidos')) document.getElementById('input-apellidos').value = data.apellidos || "";
                }
            }
            
            // Limpiar estilos de error
            inputs.forEach(i => i.classList.remove('error'));
        } catch (err) {
            console.error("Error interno al cargar datos del perfil:", err);
        }
    }

    function toggleEditMode(isEditing) {
        if (isEditing) {
            formContainer.classList.add('is-editing');
            btnModificar.style.display = 'none';
            btnGuardar.style.display = 'inline-block';
            btnCancelar.style.display = 'inline-block';
            inputs.forEach(i => i.removeAttribute('readonly'));
        } else {
            formContainer.classList.remove('is-editing');
            btnModificar.style.display = 'inline-block';
            btnGuardar.style.display = 'none';
            btnCancelar.style.display = 'none';
            inputs.forEach(i => { 
                i.setAttribute('readonly', true); 
                i.classList.remove('error'); 
            });
        }
    }

    if (btnAvatarPerfil) {
        btnAvatarPerfil.addEventListener('click', () => { 
            populateFields(); // Llena los datos
            modalMedico.classList.remove('hidden'); 
        });
    }
    
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => { 
            modalMedico.classList.add('hidden'); 
            toggleEditMode(false); 
        });
    }
    
    if (btnModificar) {
        btnModificar.addEventListener('click', () => {
            toggleEditMode(true);
        });
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => { 
            populateFields(); 
            toggleEditMode(false); 
        });
    }
    
    if (btnGuardar) {
        btnGuardar.addEventListener('click', () => {
            let isValid = true;
            inputs.forEach(input => {
                if (input.value.trim() === '') { 
                    isValid = false; 
                    input.classList.add('error'); 
                } else { 
                    input.classList.remove('error'); 
                }
            });
            
            if (isValid) {
                if (window.state && window.state.doctorLogueado) {
                    window.state.doctorLogueado.nombres = document.getElementById('input-nombres').value;
                    window.state.doctorLogueado.apellidos = document.getElementById('input-apellidos').value;
                    if(document.getElementById('input-dni')) window.state.doctorLogueado.dni = document.getElementById('input-dni').value;
                    if(document.getElementById('input-fecha')) window.state.doctorLogueado.fecha_nacimiento = document.getElementById('input-fecha').value;
                    if(document.getElementById('input-cmp')) window.state.doctorLogueado.cmp = document.getElementById('input-cmp').value;
                    if(document.getElementById('input-hospital')) window.state.doctorLogueado.hospital = document.getElementById('input-hospital').value;
                    if(document.getElementById('input-domicilio')) window.state.doctorLogueado.domicilio = document.getElementById('input-domicilio').value;
                }
                
                const nombresEditados = document.getElementById('input-nombres').value;
                const apellidosEditados = document.getElementById('input-apellidos').value;
                document.getElementById('modal-doctor-name').textContent = `Dr. ${nombresEditados} ${apellidosEditados}`;
                
                toggleEditMode(false);
            } else {
                if(window.mostrarAlerta) {
                    window.mostrarAlerta("Campos Incompletos", "Todos los campos del perfil son obligatorios.", "warning");
                }
            }
        });
    }
    
    return { modalMedico, btnCerrarModal };
}
