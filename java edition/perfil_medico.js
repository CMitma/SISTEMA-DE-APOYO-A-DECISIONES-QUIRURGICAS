// ==========================================
// PERFIL MÉDICO
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
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            const data = JSON.parse(stored);
            document.getElementById('input-nombres').value = data.nombres;
            document.getElementById('input-apellidos').value = data.apellidos;
            document.getElementById('modal-doctor-name').textContent = `Dr. ${data.nombres} ${data.apellidos}`;
        }
        inputs.forEach(i => i.classList.remove('error'));
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
            inputs.forEach(i => { i.setAttribute('readonly', true); i.classList.remove('error'); });
        }
    }

    btnAvatarPerfil.addEventListener('click', () => { populateFields(); modalMedico.classList.remove('hidden'); });
    btnCerrarModal.addEventListener('click', () => { modalMedico.classList.add('hidden'); toggleEditMode(false); });
    btnModificar.addEventListener('click', () => toggleEditMode(true));
    btnCancelar.addEventListener('click', () => { populateFields(); toggleEditMode(false); });

    btnGuardar.addEventListener('click', () => {
        let isValid = true;
        inputs.forEach(input => {
            if(input.value.trim() === '') { isValid = false; input.classList.add('error'); }
            else { input.classList.remove('error'); }
        });
        if (isValid) {
            const data = {
                nombres: document.getElementById('input-nombres').value,
                apellidos: document.getElementById('input-apellidos').value
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            document.getElementById('modal-doctor-name').textContent = `Dr. ${data.nombres} ${data.apellidos}`;
            toggleEditMode(false);
        } else {
            alert("Todos los campos son obligatorios.");
        }
    });

    return { modalMedico, btnCerrarModal };
}
