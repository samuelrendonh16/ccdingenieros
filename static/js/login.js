document.addEventListener('DOMContentLoaded', function() {
    // Mantener los elementos DOM y animaciones existentes
    const loginForm = document.getElementById('loginForm');
    const formContainer = document.querySelector('.bg-white');
    const inputs = document.querySelectorAll('.form-control');
    const logo = document.querySelector('img[alt="MIG Sistemas"]');
    const loginTitle = document.querySelector('.fs-1.fw-bold');
    const baseUrl = 'http://194.163.45.32:81';

    // Animaciones existentes
    inicializarAnimaciones();
    configurarEfectosInputs();
    configurarEfectoBoton();

    // Manejar el envío del formulario con la nueva lógica de permisos
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const button = this.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        // Animación del botón durante el envío
        button.innerHTML = '<span class="spinner"></span> Ingresando...';
        button.disabled = true;

        try {
            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };

            const response = await fetch(`${baseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                credentials: 'include' // Importante para las cookies de sesión
            });

            const data = await response.json();

            if (data.success) {
                // Guardar información del usuario y sus permisos
                const usuarioInfo = {
                    id: data.user.IdUsuario,
                    descripcion: data.user.Descripcion,
                    permisos: {
                        superUsuario: data.user.superUsuario,
                        permiso_usuarios: data.user.permiso_usuarios,
                        permiso_configuracion: data.user.permiso_configuracion,
                        permiso_maestros: data.user.permiso_maestros,
                        permiso_inventario: data.user.permiso_inventario
                    },
                    modulos: {
                        ocultar_traslados: data.user.ocultar_traslados,
                        ocultar_entradas: data.user.ocultar_entradas,
                        ocultar_salidas: data.user.ocultar_salidas,
                        ocultar_compras: data.user.ocultar_compras,
                        ocultar_ordenes: data.user.ocultar_ordenes
                    },
                    acciones: {
                        puede_anular: data.user.puede_anular,
                        puede_modificar: data.user.puede_modificar,
                        puede_eliminar: data.user.puede_eliminar,
                        puede_exportar: data.user.puede_exportar,
                        ver_costos: data.user.ver_costos,
                        ver_precios: data.user.ver_precios,
                        ver_inventario: data.user.ver_inventario
                    }
                };

                localStorage.setItem('usuario', JSON.stringify(usuarioInfo));

                // Animación de éxito
                formContainer.style.transform = 'scale(1.02)';
                formContainer.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.2)';
                
                await Swal.fire({
                    title: '¡Bienvenido!',
                    text: `${data.message}\n${usuarioInfo.descripcion}`,
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                });

                // Animación de salida
                formContainer.style.opacity = '0';
                formContainer.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    window.location.href = '/inicio';
                }, 500);
            } else {
                throw new Error(data.message || 'Error en el inicio de sesión');
            }
        } catch (error) {
            // Animación de error
            aplicarAnimacionError();
            
            Swal.fire({
                title: 'Error de acceso',
                text: error.message || 'Usuario o contraseña incorrectos',
                icon: 'error',
                confirmButtonText: 'Intentar nuevamente'
            });
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });

    // Funciones de animación existentes
    function inicializarAnimaciones() {
        // Animación inicial del contenedor
        formContainer.style.opacity = '0';
        formContainer.style.transform = 'translateY(20px)';
        setTimeout(() => {
            formContainer.style.transition = 'all 0.8s ease-out';
            formContainer.style.opacity = '1';
            formContainer.style.transform = 'translateY(0)';
        }, 200);

        // Animación del logo
        if (logo) {
            logo.style.opacity = '0';
            logo.style.transform = 'scale(0.8)';
            setTimeout(() => {
                logo.style.transition = 'all 0.8s ease-out';
                logo.style.opacity = '1';
                logo.style.transform = 'scale(1)';
            }, 600);
        }

        // Animación del título
        if (loginTitle) {
            loginTitle.style.opacity = '0';
            loginTitle.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                loginTitle.style.transition = 'all 0.8s ease-out';
                loginTitle.style.opacity = '1';
                loginTitle.style.transform = 'translateY(0)';
            }, 800);
        }
    }

    function configurarEfectosInputs() {
        inputs.forEach((input, index) => {
            // Animación inicial
            input.style.opacity = '0';
            input.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                input.style.transition = 'all 0.5s ease-out';
                input.style.opacity = '1';
                input.style.transform = 'translateX(0)';
            }, 1000 + (index * 200));

            // Efectos de focus
            input.addEventListener('focus', function() {
                this.closest('.input-group').style.transform = 'scale(1.02)';
                this.closest('.input-group').style.transition = 'all 0.3s ease';
                this.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.2)';
            });

            input.addEventListener('blur', function() {
                this.closest('.input-group').style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            });
        });
    }

    function configurarEfectoBoton() {
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.addEventListener('mouseover', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.3)';
            });

            loginButton.addEventListener('mouseout', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        }
    }

    function aplicarAnimacionError() {
        formContainer.style.transform = 'translateX(10px)';
        setTimeout(() => formContainer.style.transform = 'translateX(-10px)', 100);
        setTimeout(() => formContainer.style.transform = 'translateX(10px)', 200);
        setTimeout(() => formContainer.style.transform = 'translateX(0)', 300);
    }
});