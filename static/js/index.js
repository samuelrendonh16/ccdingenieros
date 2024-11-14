document.addEventListener('DOMContentLoaded', function() {
    // Inicializar iconos Lucide
    lucide.createIcons();

    // Configuración de particles.js
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#ffffff'
            },
            shape: {
                type: 'circle',
                stroke: {
                    width: 0,
                    color: '#000000'
                }
            },
            opacity: {
                value: 0.5,
                random: false,
            },
            size: {
                value: 3,
                random: true,
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#ffffff',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 6,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false,
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'repulse'
                },
                onclick: {
                    enable: true,
                    mode: 'push'
                },
                resize: true
            },
        },
        retina_detect: true
    });

    // Animaciones de secciones
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Manejo de menús desplegables
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function() {
            this.querySelector('.dropdown-content').style.display = 'block';
        });
        
        dropdown.addEventListener('mouseleave', function() {
            this.querySelector('.dropdown-content').style.display = 'none';
        });
    });
});

// Manejo del modal de configuración
const modal = document.getElementById("configModal");
const span = document.getElementsByClassName("close")[0];

// Abrir modal
document.querySelector('a[href="#configuracion"]').addEventListener('click', function(e) {
    e.preventDefault();
    modal.style.display = "block";
});

// Cerrar modal
span.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Verificación de clave
function verificarClave() {
    const password = document.getElementById("configPassword").value;
    if (password === "smig123*/") {
        // Obtener la URL desde el botón
        const configUrl = document.querySelector('[data-config-url]').getAttribute('data-config-url');
        window.location.href = configUrl;
    } else {
        alert("Clave incorrecta");
        document.getElementById("configPassword").value = "";
    }
}

// Permitir enviar con Enter
document.getElementById("configPassword").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        verificarClave();
    }
});

// Manejo de cerrar sesión
document.getElementById('cerrar-sesion').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        window.location.href = '/logout';
    }
});