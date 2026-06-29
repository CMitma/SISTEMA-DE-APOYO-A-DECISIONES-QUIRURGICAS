document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginScreen = document.getElementById("login-screen");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Evita que la página se recargue

            const email = document.getElementById("email").value;
            const code = document.getElementById("surgeonCode").value;

            // VALIDACIÓN TEMPORAL: Permite entrar con un punto "." en ambos campos
            if (email === "." && code === ".") {
                
                // Efecto de desvanecimiento suave hacia el menú
                loginScreen.style.transition = "opacity 0.4s ease";
                loginScreen.style.opacity = "0";
                
                setTimeout(() => {
                    loginScreen.style.display = "none"; // Revela el menú de la intranet de tu compañero
                }, 400);

            } else {
                // Mensaje de alerta por si ponen otra cosa que no sea el punto
                alert("Acceso denegado. Para pruebas, ingresa un punto (.) en ambos campos.");
            }
        });
    }

    // Configuración para el botón "Cerrar Sesión" del menú lateral
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            if (loginScreen) {
                loginScreen.style.display = "flex";
                loginScreen.style.opacity = "1";
                if (loginForm) loginForm.reset(); // Limpia los campos al salir
            }
        });
    }
});