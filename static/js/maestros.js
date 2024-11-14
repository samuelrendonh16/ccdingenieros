document.addEventListener('DOMContentLoaded', function() {
    // Función para inicializar los iconos y el acordeón
    function initializeUI() {
        // Inicializar los iconos de Lucide
        lucide.createIcons();
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const accordionItem = this.parentElement;
                const isActive = accordionItem.classList.contains('active');
                // Cerrar todos los items del acordeón
                document.querySelectorAll('.accordion-item').forEach(item => {
                    item.classList.remove('active');
                });
                // Si el item clickeado no estaba activo, abrirlo
                if (!isActive) {
                    accordionItem.classList.add('active');
                }
            });
        });
        // Manejar clics en los enlaces de subcategorías
        document.querySelectorAll('.accordion-content a').forEach(link => {
            link.addEventListener('click', function(e) {
                // Verificar si el enlace es para "Referencias" o "Grupos"
                if (this.getAttribute('href') === '/referencias' || 
                    this.getAttribute('href') === '/grupos' ||
                    this.getAttribute('href') === '/subgrupos' ||
                    this.getAttribute('href') === '/estados-productos' ||
                    this.getAttribute('href') === '/proveedores' ||
                    this.getAttribute('href') === '/unidades' ||
                    this.getAttribute('href') === '/bodegas' ||
                    this.getAttribute('href') === '/subcategorias') {
                    // No prevenir el comportamiento por defecto para estos enlaces
                    return;
                }
               
                // Para otros enlaces, prevenir el comportamiento por defecto
                e.preventDefault();
                const category = this.getAttribute('href').substring(1);
                console.log(`Abriendo categoría: ${category}`);
                // Aquí puedes agregar la lógica para cargar el contenido de cada categoría
            });
        });
    }
    // Comprobar si Lucide ya está cargado
    if (typeof lucide !== 'undefined') {
        initializeUI();
    } else {
        // Si Lucide no está cargado, esperar a que se cargue
        window.addEventListener('load', initializeUI);
    }
});