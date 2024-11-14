document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los iconos de Lucide
    lucide.createIcons();

    // Obtener todos los elementos de inventario
    const inventarioItems = document.querySelectorAll('.inventario-item');

    // Agregar event listener a cada elemento
    inventarioItems.forEach(item => {
        item.addEventListener('click', function() {
            // Obtener el ID del elemento clickeado
            const itemId = this.id;
            
            // Redirigir directamente usando el ID como ruta
            window.location.href = '/' + itemId;
        });

        // Agregar efecto de hover
        item.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });

        item.addEventListener('mouseout', function() {
            this.style.transform = 'scale(1)';
        });
    });
});