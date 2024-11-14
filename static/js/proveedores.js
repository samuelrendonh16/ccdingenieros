// Sistema de Gestión de Proveedores
const Proveedores = {
    // Estado del sistema
    state: {
        modo: 'lectura', // 'lectura', 'nuevo', 'edicion'
        proveedorActual: null,
        proveedores: [],
        departamentos: [],
        ciudades: [],
        paginacion: {
            pagina: 1,
            porPagina: 10,
            total: 0
        },
        filtros: {
            busqueda: ''
        }
    },

    // Inicialización del sistema
    async init() {
        try {
            console.log('Iniciando sistema de proveedores...');
            
            // Inicializar event listeners
            this.initializeEventListeners();
            console.log('Event listeners inicializados');

            // Cargar datos iniciales
            await this.cargarDatosIniciales();
            console.log('Datos iniciales cargados');

            // Actualizar interfaz
            await this.actualizarInterfaz();
            console.log('Interfaz actualizada');

            // Inicializar controles de tabla
            this.initTableControls();
            console.log('Controles de tabla inicializados');

        } catch (error) {
            console.error('Error durante la inicialización:', error);
            this.mostrarNotificacion('Error al inicializar el sistema', 'error');
        }
    },

    // Event Listeners
    initializeEventListeners() {
        // Botones principales
        document.getElementById('btnNuevo').addEventListener('click', () => this.iniciarNuevoProveedor());
        document.getElementById('btnGuardar').addEventListener('click', () => this.guardarProveedor());
        document.getElementById('btnEditar').addEventListener('click', () => this.habilitarEdicion());
        document.getElementById('btnEliminar').addEventListener('click', () => this.eliminarProveedor());
        document.getElementById('btnCancelar').addEventListener('click', () => this.cancelarOperacion());
        document.getElementById('btnCerrar').addEventListener('click', () => window.location.href = '/maestros');

        // Formulario
        document.getElementById('proveedorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarProveedor();
        });

        // Select de departamento y ciudad
        const selectDepartamento = document.getElementById('departamento');
        selectDepartamento.addEventListener('change', () => this.cargarCiudades(selectDepartamento.value));

        // Controles de búsqueda y paginación
        document.getElementById('tableSearch').addEventListener('input', 
            this.debounce(() => this.buscarProveedores(), 300)
        );
        document.getElementById('entriesPerPage').addEventListener('change', (e) => {
            this.state.paginacion.porPagina = parseInt(e.target.value);
            this.state.paginacion.pagina = 1;
            this.actualizarTablaProveedores();
        });

        // Validación de NIT
        document.getElementById('nit').addEventListener('input', (e) => {
            const nit = e.target.value.replace(/\D/g, '');
            e.target.value = nit;
            if (nit.length > 0) {
                document.getElementById('dv').value = this.calcularDigitoVerificacion(nit);
            } else {
                document.getElementById('dv').value = '';
            }
        });

        // Validación de email
        document.getElementById('email').addEventListener('blur', (e) => {
            const email = e.target.value;
            if (email && !this.validarEmail(email)) {
                this.mostrarNotificacion('Email inválido', 'error');
                e.target.focus();
            }
        });
    },

    // Inicialización de controles de tabla
    initTableControls() {
        // Botones de paginación
        document.getElementById('btnPrevious').addEventListener('click', () => {
            if (this.state.paginacion.pagina > 1) {
                this.state.paginacion.pagina--;
                this.actualizarTablaProveedores();
            }
        });

        document.getElementById('btnNext').addEventListener('click', () => {
            const totalPaginas = Math.ceil(this.state.proveedores.length / this.state.paginacion.porPagina);
            if (this.state.paginacion.pagina < totalPaginas) {
                this.state.paginacion.pagina++;
                this.actualizarTablaProveedores();
            }
        });

        // Inicializar tabla
        this.actualizarTablaProveedores();
    },

    // Carga de datos iniciales
    async cargarDatosIniciales() {
        try {
            const [proveedoresResponse, departamentosResponse] = await Promise.all([
                fetch('/api/proveedores'),
                fetch('/api/departamentos')
            ]);

            this.state.proveedores = await proveedoresResponse.json();
            this.state.departamentos = await departamentosResponse.json();

            this.cargarDepartamentosSelect();
            this.actualizarTablaProveedores();
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            throw error;
        }
    },

    // Carga de selects
    cargarDepartamentosSelect() {
        const select = document.getElementById('departamento');
        select.innerHTML = `
            <option value="">Seleccione un departamento</option>
            ${this.state.departamentos.map(dep => `
                <option value="${dep.IdDepartamento}">${dep.Departamento}</option>
            `).join('')}
        `;
    },

    async cargarCiudades(idDepartamento) {
        if (!idDepartamento) {
            document.getElementById('ciudad').innerHTML = '<option value="">Seleccione una ciudad</option>';
            return;
        }

        try {
            const response = await fetch(`/api/ciudades/${idDepartamento}`);
            const ciudades = await response.json();
            
            document.getElementById('ciudad').innerHTML = `
                <option value="">Seleccione una ciudad</option>
                ${ciudades.map(ciudad => `
                    <option value="${ciudad.IdCiudad}">${ciudad.Ciudad}</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('Error al cargar ciudades:', error);
            this.mostrarNotificacion('Error al cargar ciudades', 'error');
        }
    },

    // Operaciones CRUD
    async iniciarNuevoProveedor() {
        this.state.modo = 'nuevo';
        this.state.proveedorActual = null;
        this.limpiarFormulario();
        this.actualizarInterfaz();
        this.mostrarNotificacion('Nuevo proveedor', 'info');
    },

    async guardarProveedor() {
        if (!this.validarFormulario()) return;

        try {
            const formData = new FormData(document.getElementById('proveedorForm'));
            const proveedorData = {
                Nit: formData.get('nit'),
                DV: formData.get('dv'),
                RazonSocial: formData.get('razonSocial'),
                Nombre1: formData.get('nombre1'),
                Nombre2: formData.get('nombre2'),
                Apellido1: formData.get('apellido1'),
                Apellido2: formData.get('apellido2'),
                Email: formData.get('email'),
                Cuenta: formData.get('cuenta'),
                CxP: formData.get('cxp'),
                DiasCredito: formData.get('diasCredito'),
                Estado: formData.get('estado') === 'true',
                IdDepartamento: formData.get('departamento'),
                IdCiudad: formData.get('ciudad')
            };

            const url = '/api/proveedores';
            const method = this.state.modo === 'edicion' ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proveedorData)
            });

            const result = await response.json();

            if (result.message) {
                this.mostrarNotificacion(result.message, 'success');
                await this.cargarDatosIniciales();
                this.state.modo = 'lectura';
                this.actualizarInterfaz();
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al guardar el proveedor', 'error');
        }
    },

    async eliminarProveedor() {
        if (!this.state.proveedorActual) {
            this.mostrarNotificacion('Seleccione un proveedor para eliminar', 'warning');
            return;
        }
    
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
    
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/proveedores/${this.state.proveedorActual.Nit}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Error al eliminar el proveedor');
                }
                
                this.mostrarNotificacion(data.message, 'success');
                await this.cargarDatosIniciales();
                this.limpiarFormulario();
                this.state.proveedorActual = null;
                this.actualizarInterfaz();
                
            } catch (error) {
                console.error('Error:', error);
                this.mostrarNotificacion(
                    error.message || 'Error al eliminar el proveedor', 
                    'error'
                );
            }
        }
    },

    // Funciones de interfaz
    actualizarInterfaz() {
        const esModoLectura = this.state.modo === 'lectura';
        
        // Actualizar botones
        document.getElementById('btnNuevo').disabled = !esModoLectura;
        document.getElementById('btnGuardar').disabled = esModoLectura;
        document.getElementById('btnEditar').disabled = !this.state.proveedorActual || !esModoLectura;
        document.getElementById('btnEliminar').disabled = !this.state.proveedorActual || !esModoLectura;
        document.getElementById('btnCancelar').disabled = esModoLectura;

        // Actualizar campos del formulario
        const form = document.getElementById('proveedorForm');
        form.querySelectorAll('input, select, textarea').forEach(element => {
            element.disabled = esModoLectura;
        });
    },

    actualizarTablaProveedores() {
        const tbody = document.querySelector('.proveedores-table tbody');
        const proveedoresFiltrados = this.filtrarProveedores();
        const inicio = (this.state.paginacion.pagina - 1) * this.state.paginacion.porPagina;
        const fin = inicio + this.state.paginacion.porPagina;
        const proveedoresPaginados = proveedoresFiltrados.slice(inicio, fin);

        tbody.innerHTML = proveedoresPaginados.map(proveedor => `
            <tr class="${this.state.proveedorActual?.Nit === proveedor.Nit ? 'selected' : ''}"
                data-nit="${proveedor.Nit}" onclick="Proveedores.seleccionarProveedor('${proveedor.Nit}')">
                <td>${proveedor.Nit}</td>
                <td>${proveedor.RazonSocial}</td>
                <td>${proveedor.Nombre1 || ''}</td>
                <td>${proveedor.Nombre2 || ''}</td>
                <td>${proveedor.Apellido1 || ''}</td>
                <td>${proveedor.Apellido2 || ''}</td>
                <td>${proveedor.Cuenta || ''}</td>
                <td>${proveedor.CxP || ''}</td>
                <td>${proveedor.DiasCredito || ''}</td>
                <td>${proveedor.Estado ? 'Activo' : 'Inactivo'}</td>
            </tr>
        `).join('');

        this.actualizarPaginacion(proveedoresFiltrados.length);
    },

    actualizarPaginacion(totalItems) {
        const totalPaginas = Math.ceil(totalItems / this.state.paginacion.porPagina);
        document.getElementById('btnPrevious').disabled = this.state.paginacion.pagina === 1;
        document.getElementById('btnNext').disabled = this.state.paginacion.pagina === totalPaginas;

        const paginationDiv = document.querySelector('.page-numbers');
        paginationDiv.innerHTML = '';

        for (let i = 1; i <= totalPaginas; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.classList.add('btn-page');
            if (i === this.state.paginacion.pagina) button.classList.add('active');
            button.onclick = () => {
                this.state.paginacion.pagina = i;
                this.actualizarTablaProveedores();
            };
            paginationDiv.appendChild(button);
        }
    },

    // Funciones de manejo de datos
    async seleccionarProveedor(nit) {
        const proveedor = this.state.proveedores.find(p => p.Nit === nit);
        if (!proveedor) return;

        this.state.proveedorActual = proveedor;
        this.cargarProveedorEnFormulario(proveedor);
        this.actualizarInterfaz();
    },

    cargarProveedorEnFormulario(proveedor) {
        const form = document.getElementById('proveedorForm');
        
        // Campos de texto
        const campos = ['nit', 'dv', 'razonSocial', 'nombre1', 'nombre2', 
                       'apellido1', 'apellido2', 'cuenta', 'cxp', 'diasCredito', 'email'];
        
        campos.forEach(campo => {
            const input = form.querySelector(`#${campo}`);
            if (input) {
                input.value = proveedor[campo.charAt(0).toUpperCase() + campo.slice(1)] || '';
            }
        });

        // Selects
        document.getElementById('departamento').value = proveedor.IdDepartamento || '';
        this.cargarCiudades(proveedor.IdDepartamento).then(() => {
            document.getElementById('ciudad').value = proveedor.IdCiudad || '';
        });

        // Radio buttons
        const radioEstado = form.querySelector(`input[name="estado"][value="${proveedor.Estado}"]`);
        if (radioEstado) radioEstado.checked = true;
    },

    // Funciones de utilidad
    // Continuación de las funciones de validación y utilidad
    validarFormulario() {
        const form = document.getElementById('proveedorForm');
        const nit = form.querySelector('#nit').value;
        const razonSocial = form.querySelector('#razonSocial').value;
        const departamento = form.querySelector('#departamento').value;
        const ciudad = form.querySelector('#ciudad').value;
        const email = form.querySelector('#email').value;

        if (!nit) {
            this.mostrarNotificacion('El NIT es requerido', 'error');
            return false;
        }

        if (!razonSocial) {
            this.mostrarNotificacion('La Razón Social es requerida', 'error');
            return false;
        }

        if (!departamento) {
            this.mostrarNotificacion('El Departamento es requerido', 'error');
            return false;
        }

        if (!ciudad) {
            this.mostrarNotificacion('La Ciudad es requerida', 'error');
            return false;
        }

        if (email && !this.validarEmail(email)) {
            this.mostrarNotificacion('El formato del email es inválido', 'error');
            return false;
        }

        return true;
    },

    validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    calcularDigitoVerificacion(nit) {
        if (!nit || nit.length === 0) return '';
        
        const arr = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
        let x = 0;
        let y = 0;
        
        for (let i = 0; i < nit.length; i++) {
            y = parseInt(nit.charAt((nit.length - 1) - i));
            x += (y * arr[i]);
        }
        
        y = x % 11;
        
        if (y > 1) {
            return 11 - y;
        } else {
            return y;
        }
    },

    limpiarFormulario() {
        const form = document.getElementById('proveedorForm');
        form.reset();

        // Limpiar selects
        document.getElementById('departamento').value = '';
        document.getElementById('ciudad').innerHTML = '<option value="">Seleccione una ciudad</option>';

        // Restablecer estado activo por defecto
        const radioActivo = form.querySelector('input[name="estado"][value="true"]');
        if (radioActivo) radioActivo.checked = true;

        this.state.proveedorActual = null;
    },

    buscarProveedores() {
        const termino = document.getElementById('tableSearch').value.toLowerCase();
        this.state.filtros.busqueda = termino;
        this.state.paginacion.pagina = 1;
        this.actualizarTablaProveedores();
    },

    filtrarProveedores() {
        const termino = this.state.filtros.busqueda.toLowerCase();
        return this.state.proveedores.filter(proveedor => 
            proveedor.Nit.toLowerCase().includes(termino) ||
            proveedor.RazonSocial.toLowerCase().includes(termino) ||
            (proveedor.Nombre1 && proveedor.Nombre1.toLowerCase().includes(termino)) ||
            (proveedor.Apellido1 && proveedor.Apellido1.toLowerCase().includes(termino))
        );
    },

    habilitarEdicion() {
        if (!this.state.proveedorActual) {
            this.mostrarNotificacion('Seleccione un proveedor para editar', 'warning');
            return;
        }
        
        this.state.modo = 'edicion';
        this.actualizarInterfaz();
        this.mostrarNotificacion('Modo edición activado', 'info');
    },

    cancelarOperacion() {
        this.state.modo = 'lectura';
        if (this.state.proveedorActual) {
            this.cargarProveedorEnFormulario(this.state.proveedorActual);
        } else {
            this.limpiarFormulario();
        }
        this.actualizarInterfaz();
        this.mostrarNotificacion('Operación cancelada', 'info');
    },

    // Sistema de notificaciones usando SweetAlert2
    mostrarNotificacion(mensaje, tipo = 'info') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        const iconos = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        Toast.fire({
            icon: iconos[tipo] || 'info',
            title: mensaje
        });
    },

    mostrarConfirmacion(mensaje, callback) {
        Swal.fire({
            title: '¿Está seguro?',
            text: mensaje,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed && callback) {
                callback();
            }
        });
    },

    // Utilidades
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    formatearFecha(fecha) {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    formatearMoneda(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    },

    // Manejo de errores
    manejarError(error) {
        console.error('Error:', error);
        this.mostrarNotificacion(
            error.message || 'Ha ocurrido un error inesperado', 
            'error'
        );
    },

    // Exportación de datos
    exportarProveedores() {
        try {
            const proveedoresFiltrados = this.filtrarProveedores();
            const csv = this.convertirACSV(proveedoresFiltrados);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'proveedores.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            this.manejarError(error);
        }
    },

    convertirACSV(datos) {
        const columnas = ['Nit', 'RazonSocial', 'Nombre1', 'Nombre2', 'Apellido1', 'Apellido2', 
                         'Email', 'Cuenta', 'DiasCredito', 'Estado'];
        
        const encabezados = columnas.join(',');
        const filas = datos.map(item => {
            return columnas.map(columna => {
                let valor = item[columna];
                if (typeof valor === 'string') {
                    return `"${valor.replace(/"/g, '""')}"`;
                }
                return valor;
            }).join(',');
        });

        return `${encabezados}\n${filas.join('\n')}`;
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar íconos de Lucide
        lucide.createIcons();
        
        // Agregar SweetAlert2 desde CDN si no está presente
        if (typeof Swal === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            script.onload = () => Proveedores.init();
            document.head.appendChild(script);
        } else {
            Proveedores.init();
        }
    } catch (error) {
        console.error('Error al inicializar el sistema:', error);
        alert('Error al inicializar el sistema de proveedores');
    }
});

// Exportar el módulo para uso global
window.Proveedores = Proveedores;