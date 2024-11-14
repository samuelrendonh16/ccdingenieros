// Módulo de Consulta de Inventario
const ConsultaInventario = {
    // Estado del módulo
    state: {
        inventarioData: [],
        filtroActual: 'todas',
        terminoBusqueda: ''
    },

    // Inicialización
    init() {
        // Asegurarse de que todos los elementos existan antes de agregar listeners
        if (this.validarElementos()) {
            this.attachEventListeners();
            this.cargarDatosInventario();
        }
    },

    // Validar que existan todos los elementos necesarios
    validarElementos() {
        const elementos = [
            document.querySelector('input[value="todas"]'),
            document.querySelector('input[value="con-saldo"]'),
            document.querySelector('input[value="servicio"]'),
            document.querySelector('input[placeholder="Buscar por ID o Nombre"]'),
            document.querySelector('button:has([data-lucide="refresh-cw"])'),
            document.querySelector('button:has([data-lucide="file-text"])'),
            document.querySelector('button:has([data-lucide="x"])')
        ];

        const todosExisten = elementos.every(elemento => elemento !== null);
        if (!todosExisten) {
            console.error('Algunos elementos no fueron encontrados en el DOM');
        }
        return todosExisten;
    },

    // Event Listeners
    attachEventListeners() {
        // Radio buttons
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.filtroActual = e.target.value;
                this.aplicarFiltros();
            });
        });

        // Búsqueda
        const searchInput = document.querySelector('input[placeholder="Buscar por ID o Nombre"]');
        searchInput.addEventListener('input', (e) => {
            this.state.terminoBusqueda = e.target.value.toLowerCase();
            this.aplicarFiltros();
        });

        // Botones
        const btnActualizar = document.querySelector('button:has([data-lucide="refresh-cw"])');
        const btnExportar = document.querySelector('button:has([data-lucide="file-text"])');
        const btnCerrar = document.querySelector('button:has([data-lucide="x"])');

        btnActualizar?.addEventListener('click', () => this.cargarDatosInventario());
        btnExportar?.addEventListener('click', () => this.exportarInventario());
        btnCerrar?.addEventListener('click', () => window.location.href = '/inventario');
    },

    // Carga de datos
    async cargarDatosInventario() {
        try {
            const response = await fetch('/api/consulta_inventario');
            if (!response.ok) throw new Error('Error al cargar el inventario');
            
            const data = await response.json();
            this.state.inventarioData = data;
            this.aplicarFiltros();
        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al cargar los datos del inventario');
        }
    },

    // Filtrado de datos
    aplicarFiltros() {
        let datosFiltrados = [...this.state.inventarioData];

        // Aplicar filtro por tipo
        switch (this.state.filtroActual) {
            case 'con-saldo':
                datosFiltrados = datosFiltrados.filter(item => parseFloat(item.Saldo) > 0);
                break;
            case 'servicio':
                datosFiltrados = datosFiltrados.filter(item => item.Tipo === true);
                break;
        }

        // Aplicar búsqueda
        if (this.state.terminoBusqueda) {
            datosFiltrados = datosFiltrados.filter(item => 
                item.IDReferencia?.toLowerCase().includes(this.state.terminoBusqueda) ||
                item.Referencia?.toLowerCase().includes(this.state.terminoBusqueda)
            );
        }

        this.renderizarTabla(datosFiltrados);
    },

    // Renderizado de la tabla
    renderizarTabla(datos) {
        const tabla = document.querySelector('.table-container table tbody');
        if (!tabla) {
            console.error('No se encontró el tbody de la tabla');
            return;
        }

        tabla.innerHTML = '';
        datos.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${this.escapeHtml(item.IDReferencia)}</td>
                <td>${this.escapeHtml(item.Referencia)}</td>
                <td>${this.escapeHtml(item.Marca)}</td>
                <td>${this.formatearMoneda(item.Precio_Venta)}</td>
                <td>${this.escapeHtml(item.Ubicación)}</td>
                <td>${this.escapeHtml(item.Grupo)}</td>
                <td>${this.escapeHtml(item.ID_Unidad)}</td>
                <td>${this.escapeHtml(item.Bodega)}</td>
                <td>${this.formatearNumero(item.Saldo)}</td>
                <td>${this.formatearMoneda(item.Costo)}</td>
                <td>${this.escapeHtml(item.EstadoProducto)}</td>
            `;
            tabla.appendChild(tr);
        });
    },

    // Utilidades
    formatearMoneda(valor) {
        if (!valor) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(valor);
    },

    formatearNumero(valor) {
        if (!valor) return '0';
        return new Intl.NumberFormat('es-CO').format(valor);
    },

    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    },

    mostrarError(mensaje) {
        console.error(mensaje);
        // Aquí puedes implementar una mejor UI para mostrar errores
        alert(mensaje);
    }
};

// Esperar a que el DOM y los íconos de Lucide estén cargados
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Lucide termine de cargar los íconos
    setTimeout(() => {
        ConsultaInventario.init();
    }, 100);
});

lucide.createIcons();