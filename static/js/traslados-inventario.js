// Sistema de Traslados de Inventario
const TrasladosInventario = {
    // Estado del sistema
    state: {
        modo: 'lectura', // 'lectura', 'nuevo', 'edicion'
        trasladoActual: null,
        items: [],
        consecutivoActual: null,
        bodegaOrigenSeleccionada: null,
        bodegaDestinoSeleccionada: null,
        modalBusqueda: null,
        productosEncontrados: [],
        datosCalculados: {
            totalUnidades: 0,
            subtotal: 0,
            totalIva: 0,
            totalImpoconsumo: 0,
            totalIcui: 0,
            totalIbua: 0,
            totalIpc: 0,
            totalDocumento: 0
        }
    },

    // Inicialización
    async init() {
        try {
            console.log('Iniciando sistema de traslados de inventario...');

            // Inicializar event listeners
            this.initializeEventListeners();
            console.log('Event listeners inicializados');

            // Cargar datos iniciales
            await this.cargarDatosIniciales();
            console.log('Datos iniciales cargados');

            // Establecer estado inicial
            this.state.modo = 'lectura';
            // Actualizar interfaz
            this.actualizarInterfaz();
            console.log('Interfaz actualizada');

        } catch (error) {
            console.error('Error durante la inicialización:', error);
            this.mostrarMensaje('Error al inicializar el sistema', 'error');
        }
    },

    // Event Listeners
    initializeEventListeners() {
        console.log('Inicializando event listeners...');
    
        // Botones principales usando IDs
        const btnNuevo = document.getElementById('btn-nuevo');
        const btnGuardar = document.getElementById('btn-guardar');
        const btnCancelar = document.getElementById('btn-cancelar');
        const btnCerrar = document.getElementById('btn-cerrar');
    
        if (btnNuevo) {
            console.log('Botón Nuevo encontrado');
            btnNuevo.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Iniciando nuevo traslado...');
                this.iniciarNuevoTraslado();
            });
            btnNuevo.disabled = false;
        } else {
            console.warn('Botón Nuevo no encontrado');
        }
    
        if (btnGuardar) {
            console.log('Botón Guardar encontrado');
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Intentando guardar traslado...');
                this.guardarTraslado();
            });
            btnGuardar.disabled = true;
        } else {
            console.warn('Botón Guardar no encontrado');
        }
    
        if (btnCancelar) {
            console.log('Botón Cancelar encontrado');
            btnCancelar.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cancelando operación...');
                this.cancelarOperacion();
            });
            btnCancelar.disabled = true;
        } else {
            console.warn('Botón Cancelar no encontrado');
        }
    
        if (btnCerrar) {
            console.log('Botón Cerrar encontrado');
            btnCerrar.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Cerrando formulario...');
                this.cerrarFormulario();
            });
            btnCerrar.disabled = false;
        } else {
            console.warn('Botón Cerrar no encontrado');
        }
    
        // Select de bodega origen
        const selectOrigen = document.getElementById('bodega-origen');
        if (selectOrigen) {
            console.log('Select de bodega origen encontrado');
            selectOrigen.addEventListener('change', (e) => {
                console.log('Bodega origen seleccionada:', e.target.value);
                this.state.bodegaOrigenSeleccionada = e.target.value;
                this.validarBodegas();
            });
        }
    
        // Select de bodega destino
        const selectDestino = document.getElementById('bodega-destino');
        if (selectDestino) {
            console.log('Select de bodega destino encontrado');
            selectDestino.addEventListener('change', (e) => {
                console.log('Bodega destino seleccionada:', e.target.value);
                this.state.bodegaDestinoSeleccionada = e.target.value;
                this.validarBodegas();
            });
        }
    
        // Input de búsqueda de productos
        const searchInput = document.getElementById('buscar-item');
        if (searchInput) {
            console.log('Input de búsqueda encontrado');
            searchInput.addEventListener('click', () => {
                if (this.state.modo !== 'lectura') {
                    console.log('Mostrando búsqueda de productos...');
                    this.mostrarBusquedaProductos();
                } else {
                    console.log('Sistema en modo lectura, búsqueda no disponible');
                    this.mostrarMensaje('Active el modo edición primero', 'info');
                }
            });
        }
    },

    // Método para actualizar el estado de los botones
    actualizarEstadoBotones() {
        const esModoLectura = this.state.modo === 'lectura';
        const esModoNuevo = this.state.modo === 'nuevo';
        
        // Obtener referencias a los botones
        const btnNuevo = document.getElementById('btn-nuevo');
        const btnGuardar = document.getElementById('btn-guardar');
        const btnCancelar = document.getElementById('btn-cancelar');
        const btnCerrar = document.getElementById('btn-cerrar');

        if (btnNuevo) btnNuevo.disabled = !esModoLectura;
        if (btnGuardar) btnGuardar.disabled = esModoLectura;
        if (btnCancelar) btnCancelar.disabled = esModoLectura;
        if (btnCerrar) btnCerrar.disabled = !esModoLectura;

        // Actualizar clases de los botones
        if (btnGuardar) {
            btnGuardar.className = `btn ${esModoLectura ? 'btn-secondary' : 'btn-success'}`;
        }
    },

    // Función para cancelar operación
    cancelarOperacion() {
        console.log('Cancelando operación...');
        this.state.modo = 'lectura';
        
        // Recargar datos originales si estábamos editando
        if (this.state.trasladoActual) {
            this.cargarDatosTraslado(this.state.trasladoActual);
        } else {
            this.limpiarFormulario();
        }
        
        // Deshabilitar campos
        this.deshabilitarCampos();
        
        // Actualizar estado de botones
        const btnGuardar = document.querySelector('button:has([data-lucide="save"])');
        const btnCancelar = document.querySelector('button:has([data-lucide="x"])');
        const btnEditar = document.querySelector('button:has([data-lucide="edit"])');
        const btnNuevo = document.querySelector('button:has([data-lucide="plus"])');
        
        if (btnGuardar) btnGuardar.disabled = true;
        if (btnCancelar) btnCancelar.disabled = true;
        if (btnEditar) btnEditar.disabled = false;
        if (btnNuevo) btnNuevo.disabled = false;

        this.mostrarMensaje('Operación cancelada', 'info');
    },

    // Función para habilitar edición
    habilitarEdicion() {
        console.log('Habilitando modo edición...');
        this.state.modo = 'edicion';
        
        // Habilitar campos editables
        const camposEditables = [
            'consecutivo',
            'bodega-origen',
            'bodega-destino',
            'fecha',
            'observaciones'
        ];

        camposEditables.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.disabled = false;
            }
        });

        // Habilitar celdas editables en la tabla
        const celdas = document.querySelectorAll('.items-table td[contenteditable]');
        celdas.forEach(celda => {
            celda.contentEditable = 'true';
        });

        // Actualizar estado de botones
        const btnGuardar = document.querySelector('button:has([data-lucide="save"])');
        const btnCancelar = document.querySelector('button:has([data-lucide="x"])');
        const btnEditar = document.querySelector('button:has([data-lucide="edit"])');
        
        if (btnGuardar) btnGuardar.disabled = false;
        if (btnCancelar) btnCancelar.disabled = false;
        if (btnEditar) btnEditar.disabled = true;

        this.mostrarMensaje('Modo edición activado', 'info');
    },

    // Función para cargar datos de un traslado existente
    cargarDatosTraslado(traslado) {
        // Cargar datos del encabezado
        document.getElementById('numero').value = traslado.Numero;
        document.getElementById('consecutivo').value = traslado.IdConsecutivo;
        document.getElementById('bodega-origen').value = traslado.IdBodegaOrigen;
        document.getElementById('bodega-destino').value = traslado.IdBodegaDestino;
        document.getElementById('fecha').value = traslado.fecha;
        document.getElementById('observaciones').value = traslado.Observaciones;
        document.getElementById('anulado').checked = traslado.Anulado;

        // Limpiar y cargar items
        const tabla = document.querySelector('.items-table tbody');
        tabla.innerHTML = '';
        
        traslado.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.IdReferencia;
            tr.innerHTML = `
                <td>${item.IdReferencia}</td>
                <td>${item.Descripcion}</td>
                <td>${item.idunidad}</td>
                <td contenteditable="true" class="numero cantidad">${this.formatearNumero(item.Cantidad)}</td>
                <td contenteditable="true" class="numero valor">${this.formatearNumero(item.Valor)}</td>
                <td contenteditable="true" class="numero iva">${this.formatearNumero(item.IVA)}</td>
                <td class="subtotal">${this.formatearMoneda(item.Cantidad * item.Valor)}</td>
                <td class="text-center">
                    <button type="button" class="btn-eliminar" onclick="TrasladosInventario.eliminarProducto(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6"></path>
                            <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"></path>
                        </svg>
                    </button>
                </td>
            `;
            tabla.appendChild(tr);
            this.agregarEventosCeldasEditables(tr);
        });

        this.calcularTotales();
    },

    // Funciones de carga de datos
    async cargarDatosIniciales() {
        try {
            await this.cargarConsecutivos();
            await this.cargarBodegas();
            await this.obtenerUltimoConsecutivo();

            // Establecer fechas
            const fechaActual = new Date().toISOString().split('T')[0];
            const inputFecha = document.getElementById('fecha');
            const inputFechaCreacion = document.getElementById('fecha-creacion');
            
            if (inputFecha) inputFecha.value = fechaActual;
            if (inputFechaCreacion) inputFechaCreacion.value = fechaActual;

            // Deshabilitar campos inicialmente
            this.deshabilitarCampos();
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            throw error;
        }
    },

    async cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos_traslados_inventario');
            if (!response.ok) throw new Error('Error al cargar consecutivos');
            
            const consecutivos = await response.json();
            const select = document.getElementById('consecutivo');
            
            if (select) {
                select.innerHTML = consecutivos.map(c => 
                    `<option value="${c.IdConsecutivo}">${c.Descripcion}</option>`
                ).join('');
                select.disabled = true; // Deshabilitar inicialmente
            }
        } catch (error) {
            console.error('Error al cargar consecutivos:', error);
            throw error;
        }
    },

    async cargarBodegas() {
        try {
            const response = await fetch('/api/bodegas_disponibles');
            if (!response.ok) throw new Error('Error al cargar bodegas');
            
            const bodegas = await response.json();
            ['bodega-origen', 'bodega-destino'].forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.innerHTML = '<option value="">Seleccione una bodega</option>' + 
                        bodegas.map(b => `<option value="${b.IdBodega}">${b.Descripcion}</option>`).join('');
                    select.disabled = true; // Deshabilitar inicialmente
                }
            });
        } catch (error) {
            console.error('Error al cargar bodegas:', error);
            throw error;
        }
    },

    // Obtener el último consecutivo
    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_traslados');
            if (!response.ok) throw new Error('Error al obtener el consecutivo');
            
            const data = await response.json();
            if (data.success) {
                const inputNumero = document.getElementById('numero');
                if (inputNumero) {
                    inputNumero.value = data.ultimoConsecutivo;
                    this.state.consecutivoActual = data.ultimoConsecutivo;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al obtener el consecutivo', 'error');
        }
    },

    // Actualizar campos totales
    actualizarCamposTotales(totales) {
        try {
            const campos = {
                'total-unidades': totales.totalUnidades,
                'subtotal': totales.subtotal,
                'total-iva': totales.totalIva,
                'total-impoconsumo': totales.totalImpoconsumo,
                'total-icui': totales.totalIcui,
                'total-ibua': totales.totalIbua,
                'total-ipc': totales.totalIpc,
                'total-documento': totales.totalDocumento
            };
    
            Object.entries(campos).forEach(([id, valor]) => {
                const campo = document.getElementById(id);
                if (campo) {
                    if (id === 'total-unidades') {
                        campo.value = this.formatearNumero(valor);
                    } else {
                        campo.value = this.formatearMoneda(valor);
                    }
                }
            });
        } catch (error) {
            console.error('Error al actualizar campos totales:', error);
        }
    },

    // Mostrar búsqueda de productos
    mostrarBusquedaProductos() {
        if (!this.state.bodegaOrigenSeleccionada) {
            this.mostrarMensaje('Por favor, seleccione una bodega de origen primero', 'error');
            return;
        }

        if (this.state.modo === 'lectura') {
            this.mostrarMensaje('Active el modo edición primero', 'info');
            return;
        }

        // Crear modal si no existe
        if (!document.querySelector('.modal-busqueda-productos')) {
            this.crearModalBusqueda();
        }

        // Mostrar modal
        const modal = document.querySelector('.modal-busqueda-productos');
        if (modal) {
            modal.style.display = 'block';
            const inputBusqueda = modal.querySelector('.input-busqueda');
            if (inputBusqueda) {
                inputBusqueda.value = '';
                inputBusqueda.focus();
                // Cargar productos iniciales
                this.buscarProductos('');
            }
        }
    },

    // Crear modal de búsqueda
    crearModalBusqueda() {
        const modal = document.createElement('div');
        modal.className = 'modal-busqueda-productos';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Buscar Productos</h3>
                    <button type="button" class="btn-close" onclick="TrasladosInventario.cerrarModalBusqueda()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="input-group mb-3">
                        <input type="text" class="form-control input-busqueda" 
                               placeholder="Escriba para buscar productos...">
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Unidad</th>
                                    <th>Stock</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Estilos del modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 1000;
            display: none;
        `;

        modal.querySelector('.modal-content').style.cssText = `
            background-color: white;
            margin: 10% auto;
            padding: 20px;
            width: 80%;
            max-width: 800px;
            border-radius: 8px;
        `;

        // Eventos
        const inputBusqueda = modal.querySelector('.input-busqueda');
        inputBusqueda.addEventListener('input', (e) => {
            this.buscarProductos(e.target.value);
        });

        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarModalBusqueda();
            }
        });

        document.body.appendChild(modal);
    },

    // Función para buscar y mostrar productos
    async buscarProductos(termino = '') {
        if (!this.state.bodegaOrigenSeleccionada) {
            this.mostrarMensaje('Seleccione una bodega de origen primero', 'error');
            return;
        }

        try {
            // Obtener datos del inventario
            const response = await fetch('/api/consulta_inventario');
            if (!response.ok) throw new Error('Error al cargar datos de inventario');
            
            const inventario = await response.json();
            console.log('Datos de inventario:', inventario); // Debug

            // Filtrar productos por bodega origen y término de búsqueda
            this.state.productosEncontrados = inventario.filter(producto => 
                producto.Bodega === this.state.bodegaOrigenSeleccionada &&
                (producto.IDReferencia?.toLowerCase().includes(termino.toLowerCase()) ||
                 producto.Referencia?.toLowerCase().includes(termino.toLowerCase()))
            );

            console.log('Productos encontrados:', this.state.productosEncontrados); // Debug

            // Mostrar resultados en el modal
            this.mostrarResultadosBusqueda(this.state.productosEncontrados);

        } catch (error) {
            console.error('Error al buscar productos:', error);
            this.mostrarMensaje('Error al buscar productos: ' + error.message, 'error');
        }
    },

    // Función auxiliar para validar el valor del saldo
    validarSaldo(saldo) {
        const valor = parseFloat(saldo);
        return !isNaN(valor) ? valor : 0;
    },

    // Mostrar resultados de búsqueda
    // Función buscarProductos corregida
    async buscarProductos(termino = '') {
        if (!this.state.bodegaOrigenSeleccionada) {
            this.mostrarMensaje('Seleccione una bodega de origen primero', 'error');
            return;
        }

        try {
            // Obtener datos del inventario
            const response = await fetch('/api/consulta_inventario');
            if (!response.ok) throw new Error('Error al cargar datos de inventario');
            
            const inventario = await response.json();
            console.log('Datos de inventario:', inventario); // Debug

            // Filtrar productos por bodega origen y término de búsqueda
            this.state.productosEncontrados = inventario.filter(producto => 
                producto.Bodega === this.state.bodegaOrigenSeleccionada &&
                (producto.IDReferencia?.toLowerCase().includes(termino.toLowerCase()) ||
                 producto.Referencia?.toLowerCase().includes(termino.toLowerCase()))
            );

            console.log('Productos encontrados:', this.state.productosEncontrados); // Debug

            // Mostrar resultados en el modal
            this.mostrarResultadosBusqueda(this.state.productosEncontrados);

        } catch (error) {
            console.error('Error al buscar productos:', error);
            this.mostrarMensaje('Error al buscar productos: ' + error.message, 'error');
        }
    },

    // Función mostrarResultadosBusqueda modificada
    mostrarResultadosBusqueda(productos) {
        const tbody = document.querySelector('.modal-busqueda-productos tbody');
        if (!tbody) return;

        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = productos.map(producto => {
            const cantidad = parseFloat(producto.Saldo || 0);
            console.log(`Producto ${producto.IDReferencia} - Cantidad: ${cantidad}`); // Debug
            
            return `
                <tr>
                    <td>${producto.IDReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td>${producto.ID_Unidad || ''}</td>
                    <td class="text-end">${this.formatearNumero(cantidad)}</td>
                    <td class="text-center">
                        <button type="button" 
                                class="btn-seleccionar" 
                                onclick="TrasladosInventario.seleccionarProducto('${producto.IDReferencia}')">
                            Seleccionar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Funciones de formateo
    formatearNumero(valor) {
        // Verificar si el valor es válido
        if (valor === null || valor === undefined || isNaN(valor)) {
            return '0';
        }

        // Convertir a número si es string
        const numero = typeof valor === 'string' ? parseFloat(valor) : valor;

        // Formatear el número con separadores de miles y 2 decimales
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numero);
    },

    // Función para desformatear números (quitar separadores y convertir a número)
    desformatearNumero(valorFormateado) {
        if (!valorFormateado) return 0;
        
        // Eliminar todos los caracteres excepto números, punto y signo negativo
        const numeroLimpio = valorFormateado.toString().replace(/[^\d.-]/g, '');
        
        // Convertir a número
        const numero = parseFloat(numeroLimpio);
        
        // Retornar 0 si no es un número válido
        return isNaN(numero) ? 0 : numero;
    },

    // Función para validar entrada numérica
    validarEntradaNumerica(valor, min = 0, max = Infinity) {
        const numero = this.desformatearNumero(valor);
        
        if (isNaN(numero)) return min;
        if (numero < min) return min;
        if (numero > max) return max;
        
        return numero;
    },

    desformatearNumero(valor) {
        if (!valor) return 0;
        
        // Eliminar el símbolo de moneda y espacios
        let numeroLimpio = valor.toString().replace(/[$\s]/g, '').trim();
        
        // Manejar el caso de números con separadores de miles
        const ultimoPunto = numeroLimpio.lastIndexOf('.');
        const ultimaComa = numeroLimpio.lastIndexOf(',');
        
        // Determinar cuál es el separador decimal (el último que aparece)
        const posicionSeparadorDecimal = Math.max(ultimoPunto, ultimaComa);
        
        if (posicionSeparadorDecimal !== -1) {
            // Separar la parte entera y decimal
            const parteEntera = numeroLimpio.substring(0, posicionSeparadorDecimal);
            const parteDecimal = numeroLimpio.substring(posicionSeparadorDecimal + 1);
            
            // Eliminar todos los separadores de la parte entera
            const parteEnteraLimpia = parteEntera.replace(/[^\d]/g, '');
            
            // Reconstruir el número
            numeroLimpio = parteEnteraLimpia + '.' + parteDecimal;
        } else {
            // Si no hay separador decimal, solo limpiar separadores de miles
            numeroLimpio = numeroLimpio.replace(/[^\d]/g, '');
        }
        
        return parseFloat(numeroLimpio) || 0;
    },

    formatearNumero(numero) {
        if (numero === null || numero === undefined || isNaN(numero)) return '0,00';
        
        // Usar Intl.NumberFormat con la configuración específica para Colombia
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
            style: 'decimal'
        }).format(numero);
    },

    // Función para formatear valores monetarios
    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '$ 0,00';
        return '$ ' + this.formatearNumero(valor);
    },

    // Función auxiliar para desformatear moneda (útil para cálculos)
    desformatearMoneda(valorFormateado) {
        if (!valorFormateado) return 0;
        
        // Remover símbolos de moneda y separadores
        return parseFloat(valorFormateado.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
    },

    // Función para seleccionar producto con stock correcto
    async seleccionarProducto(idReferencia) {
        try {
            const producto = this.state.productosEncontrados.find(p => p.IDReferencia === idReferencia);
            if (!producto) throw new Error('Producto no encontrado');
    
            const tabla = document.querySelector('.items-table tbody');
            if (!tabla) throw new Error('Tabla no encontrada');
    
            const numeroTraslado = document.getElementById('numero').value;
            const idCorto = `${numeroTraslado}_${idReferencia}_${Date.now().toString().slice(-4)}`.slice(0, 25);
    
            const tr = document.createElement('tr');
            tr.dataset.id = idReferencia;
            tr.innerHTML = `
                <td>${idReferencia}</td>
                <td>${producto.Referencia}</td>
                <td>${producto.ID_Unidad || ''}</td>
                <td contenteditable="true" class="numero cantidad">1</td>
                <td contenteditable="true" class="numero valor">${this.formatearNumero(producto.Costo || 0)}</td>
                <td contenteditable="true" class="numero iva">${this.formatearNumero(producto.IVA || 0)}</td>
                <td class="subtotal">${this.formatearMoneda(producto.Costo || 0)}</td>
                <td class="text-center">
                    <button type="button" class="btn-eliminar" onclick="TrasladosInventario.eliminarProducto(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6"></path>
                            <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"></path>
                        </svg>
                    </button>
                </td>
            `;
    
            tabla.appendChild(tr);
            this.agregarEventosCeldasEditables(tr, producto.Saldo || 0);
            this.calcularTotales();
            this.cerrarModalBusqueda();
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje(error.message, 'error');
        }
    },

    // Función para mostrar resultados de búsqueda (corregida)
    mostrarResultadosBusqueda(productos) {
        const tbody = document.querySelector('.modal-busqueda-productos tbody');
        if (!tbody) return;

        if (!productos || productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = productos.map(producto => {
            const cantidad = parseFloat(producto.Saldo || 0);
            return `
                <tr>
                    <td>${producto.IDReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td>${producto.ID_Unidad || ''}</td>
                    <td class="text-end">${this.formatearNumero(cantidad)}</td>
                    <td class="text-center">
                        <button type="button" 
                                class="btn-seleccionar" 
                                onclick="TrasladosInventario.seleccionarProducto('${producto.IDReferencia}')"
                                ${cantidad <= 0 ? 'disabled' : ''}>
                            ${cantidad > 0 ? 'Seleccionar' : 'Sin stock'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Función auxiliar para agregar nueva fila
    agregarNuevaFila(tabla, producto) {
        const tr = document.createElement('tr');
        tr.dataset.id = producto.IDReferencia;
        
        tr.innerHTML = `
            <td>${producto.IDReferencia}</td>
            <td>${producto.Referencia}</td>
            <td>${producto.ID_Unidad || ''}</td>
            <td contenteditable="true" class="numero cantidad">1</td>
            <td contenteditable="true" class="numero valor">${this.formatearNumero(producto.Costo || 0)}</td>
            <td contenteditable="true" class="numero iva">${this.formatearNumero(producto.IVA || 0)}</td>
            <td class="subtotal">${this.formatearMoneda(producto.Costo || 0)}</td>
            <td class="text-center">
                <button type="button" class="btn-eliminar" onclick="TrasladosInventario.eliminarProducto(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        `;

        tabla.appendChild(tr);
        this.agregarEventosCeldasEditables(tr, parseFloat(producto.Stock));
        this.calcularTotales();
    },

    eliminarProducto(boton) {
        const fila = boton.closest('tr');
        if (fila) {
            fila.remove();
            this.calcularTotales();
            this.mostrarMensaje('Producto eliminado', 'info');
        }
    },

    // Función auxiliar para actualizar cantidad en fila existente
    actualizarCantidadExistente(fila, producto) {
        const celdaCantidad = fila.querySelector('td.cantidad');
        if (celdaCantidad) {
            const cantidadActual = this.desformatearNumero(celdaCantidad.textContent);
            const saldo = parseFloat(producto.Saldo);
            
            if (cantidadActual >= saldo) {
                throw new Error('No hay más stock disponible');
            }
            
            celdaCantidad.textContent = (cantidadActual + 1).toString();
        }
    },

    agregarEventosCeldasEditables(fila, stockMaximo) {
        fila.querySelectorAll('td[contenteditable="true"]').forEach(celda => {
            celda.addEventListener('focus', () => {
                // Al obtener el foco, mostrar el valor sin formato
                let valor = this.desformatearNumero(celda.textContent);
                celda.textContent = valor.toString().replace('.', ',');
                celda.select();
            });

            celda.addEventListener('blur', () => {
                try {
                    let valor = this.desformatearNumero(celda.textContent);
                    
                    if (celda.classList.contains('cantidad')) {
                        if (valor <= 0) {
                            this.mostrarMensaje('La cantidad debe ser mayor a 0', 'warning');
                            valor = 1;
                        } else if (stockMaximo && valor > stockMaximo) {
                            this.mostrarMensaje(`Stock máximo disponible: ${stockMaximo}`, 'warning');
                            valor = stockMaximo;
                        }
                    }

                    celda.textContent = this.formatearNumero(valor);
                    this.calcularTotales();
                    
                } catch (error) {
                    console.error('Error al procesar valor:', error);
                    celda.textContent = this.formatearNumero(0);
                    this.mostrarMensaje('Error al procesar el valor', 'error');
                }
            });

            celda.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    celda.blur();
                }
            });

            celda.addEventListener('keypress', (e) => {
                if (!/[\d.,]/.test(e.key) && !e.ctrlKey) {
                    e.preventDefault();
                }
            });
        });
    },

    cerrarModalBusqueda() {
        const modal = document.querySelector('.modal-busqueda-productos');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Función para calcular totales
    calcularTotales() {
        const totales = {
            totalUnidades: 0,
            subtotal: 0,
            totalIva: 0,
            totalImpoconsumo: 0,
            totalIcui: 0,
            totalIbua: 0,
            totalIpc: 0,
            totalDocumento: 0
        };

        try {
            document.querySelectorAll('.items-table tbody tr').forEach(row => {
                // Obtener valores usando la función desformatearNumero
                const cantidad = this.desformatearNumero(row.cells[3].textContent);
                const valor = this.desformatearNumero(row.cells[4].textContent);
                const iva = this.desformatearNumero(row.cells[5].textContent);

                // Calcular subtotal de la línea
                const subtotalLinea = cantidad * valor;
                const ivaLinea = subtotalLinea * (iva / 100);

                // Acumular totales
                totales.totalUnidades += cantidad;
                totales.subtotal += subtotalLinea;
                totales.totalIva += ivaLinea;

                // Actualizar subtotal en la fila usando el formateo correcto
                const subtotalCell = row.querySelector('.subtotal');
                if (subtotalCell) {
                    subtotalCell.textContent = this.formatearMoneda(subtotalLinea);
                }
            });

            totales.totalDocumento = totales.subtotal + 
                                   totales.totalIva + 
                                   totales.totalImpoconsumo + 
                                   totales.totalIpc + 
                                   totales.totalIbua + 
                                   totales.totalIcui;

            this.actualizarCamposTotales(totales);
            this.state.datosCalculados = totales;

        } catch (error) {
            console.error('Error en cálculo de totales:', error);
            this.mostrarMensaje('Error al calcular los totales', 'error');
        }
    },

    // Funciones de interfaz
    actualizarInterfaz() {
        this.actualizarEstadoBotones();
        this.actualizarEstadoCampos(this.state.modo === 'lectura');
    },

    cerrarFormulario() {
        // Aquí puedes agregar la lógica para cerrar el formulario
        // Por ejemplo, redirigir a otra página o limpiar el formulario
        this.limpiarFormulario();
        this.state.modo = 'lectura';
        this.actualizarInterfaz();
        window.location.href = '/inventario'; // O la ruta que corresponda
    },

    actualizarEstadoCampos(soloLectura) {
        // Campos de formulario
        const campos = [
            'consecutivo',
            'bodega-origen',
            'bodega-destino',
            'fecha',
            'fecha-creacion',
            'observaciones'
        ];

        campos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.disabled = soloLectura;
            }
        });

        // Checkbox de anulado
        const checkAnulado = document.getElementById('anulado');
        if (checkAnulado) {
            checkAnulado.disabled = soloLectura;
        }

        // Tabla de items
        const tablaCuerpo = document.querySelector('.items-table tbody');
        if (tablaCuerpo) {
            const celdas = tablaCuerpo.querySelectorAll('td[contenteditable]');
            celdas.forEach(celda => {
                celda.contentEditable = !soloLectura;
            });
        }
    },

    deshabilitarCampos() {
        const campos = document.querySelectorAll('input, select, textarea');
        campos.forEach(campo => {
            if (campo.id !== 'buscar-item') {
                campo.disabled = true;
            }
        });

        // Deshabilitar celdas editables de la tabla
        const celdasEditables = document.querySelectorAll('td[contenteditable]');
        celdasEditables.forEach(celda => {
            celda.contentEditable = false;
        });
    },

    // Funciones de operaciones
    async iniciarNuevoTraslado() {
        this.state.modo = 'nuevo';
        
        // Establecer fecha actual (solo fecha, sin tiempo)
        const fechaActual = new Date().toISOString().split('T')[0];
        
        const inputFecha = document.getElementById('fecha');
        const inputFechaCreacion = document.getElementById('fecha-creacion');
        
        if (inputFecha) inputFecha.value = fechaActual;
        if (inputFechaCreacion) inputFechaCreacion.value = fechaActual;
        
        // Resto del código...
        this.state.datosCalculados = {
            totalUnidades: 0,
            subtotal: 0,
            totalIva: 0,
            totalImpoconsumo: 0,
            totalIcui: 0,
            totalIbua: 0,
            totalIpc: 0,
            totalDocumento: 0
        };
    
        await this.obtenerUltimoConsecutivo();
        this.habilitarCamposNuevo();
        this.actualizarInterfaz();
        this.limpiarCamposEditables();
    
        this.mostrarMensaje('Nuevo traslado iniciado', 'info');
    },

    // Función para limpiar solo campos editables
    limpiarCamposEditables() {
        // Limpiar observaciones
        const observaciones = document.getElementById('observaciones');
        if (observaciones) observaciones.value = '';

        // Resetear selects de bodegas
        ['bodega-origen', 'bodega-destino'].forEach(id => {
            const select = document.getElementById(id);
            if (select) select.selectedIndex = 0;
        });

        // Limpiar tabla de items
        const tabla = document.querySelector('.items-table tbody');
        if (tabla) tabla.innerHTML = '';

        // Resetear checkbox de anulado
        const anulado = document.getElementById('anulado');
        if (anulado) anulado.checked = false;
    },

    habilitarCamposNuevo() {
        const camposAHabilitar = [
            'consecutivo',
            'bodega-origen',
            'bodega-destino',
            'fecha',
            'observaciones'
        ];

        camposAHabilitar.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.disabled = false;
                if (elemento.tagName === 'SELECT') {
                    elemento.selectedIndex = 0;  // Reset selects
                }
            }
        });

        // Habilitar campos de totales pero mantenerlos readonly
        const camposTotales = [
            'total-unidades',
            'subtotal',
            'total-iva',
            'total-impoconsumo',
            'total-icui',
            'total-ibua',
            'total-ipc',
            'total-documento'
        ];

        camposTotales.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.disabled = false;
                campo.readOnly = true;
                campo.value = '0.00';  // Mantener valor inicial
            }
        });
    },

    // Función validación antes de guardar
    validarFormulario() {
        if (!this.state.bodegaOrigenSeleccionada || !this.state.bodegaDestinoSeleccionada) {
            this.mostrarMensaje('Debe seleccionar las bodegas de origen y destino', 'error');
            return false;
        }
    
        if (this.state.bodegaOrigenSeleccionada === this.state.bodegaDestinoSeleccionada) {
            this.mostrarMensaje('Las bodegas de origen y destino no pueden ser iguales', 'error');
            return false;
        }
    
        const fecha = document.getElementById('fecha').value;
        if (!fecha) {
            this.mostrarMensaje('Debe seleccionar una fecha', 'error');
            return false;
        }
    
        const items = document.querySelectorAll('.items-table tbody tr');
        if (items.length === 0) {
            this.mostrarMensaje('Debe agregar al menos un producto', 'error');
            return false;
        }
    
        return true;
    },

    // Función para recopilar datos del formulario al guardar
    async guardarTraslado() {
        try {
            if (!this.validarFormulario()) return;
    
            const datos = this.recopilarDatosFormulario();
            
            // Log detallado antes de enviar
            console.log('Enviando datos al servidor:', JSON.stringify(datos, null, 2));
    
            const response = await fetch('/api/guardar_traslado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(datos)
            });
    
            const responseText = await response.text();
            console.log('Respuesta del servidor (texto):', responseText);
    
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Error al parsear respuesta:', e);
                throw new Error('Error al procesar la respuesta del servidor');
            }
    
            if (!response.ok) {
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }
    
            if (result.success) {
                this.mostrarMensaje('Traslado guardado exitosamente', 'success');
                this.state.modo = 'lectura';
                this.actualizarInterfaz();
                this.limpiarFormulario();
                await this.obtenerUltimoConsecutivo();
            } else {
                throw new Error(result.message || 'Error desconocido al guardar');
            }
    
        } catch (error) {
            console.error('Error durante el guardado:', error);
            this.mostrarMensaje(`Error al guardar: ${error.message}`, 'error');
        }
    },

    // Función para recopilar datos del formulario al guardar
    recopilarDatosFormulario() {
        // Función auxiliar para generar ID corto y único
        const generarIdCorto = (numero, idReferencia, index) => {
            const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos del timestamp
            return `${numero}_${idReferencia}_${index}${timestamp}`.slice(0, 25);
        };
    
        const fechaHoy = new Date();
        const mesActual = `${fechaHoy.getFullYear()}${String(fechaHoy.getMonth() + 1).padStart(2, '0')}`;
        
        // Obtener las fechas del formulario
        const fechaDoc = document.getElementById('fecha').value;
        
        // Recopilar datos del encabezado
        const traslado1 = {
            Numero: document.getElementById('numero').value,
            Mes: mesActual,
            Anulado: document.getElementById('anulado').checked,
            IdBodegaOrigen: this.state.bodegaOrigenSeleccionada,
            IdBodegaDestino: this.state.bodegaDestinoSeleccionada,
            Observaciones: document.getElementById('observaciones').value || '',
            FechaCreacion: new Date().toISOString().split('T')[0],
            IdUsuario: 'MIG',
            IdConsecutivo: document.getElementById('consecutivo').value,
            fecha: fechaDoc,
            subtotal: this.desformatearMoneda(document.getElementById('subtotal').value),
            total_iva: this.desformatearMoneda(document.getElementById('total-iva').value),
            total_impoconsumo: this.desformatearMoneda(document.getElementById('total-impoconsumo').value),
            total_icui: this.desformatearMoneda(document.getElementById('total-icui').value),
            total_ibua: this.desformatearMoneda(document.getElementById('total-ibua').value),
            total_ipc: this.desformatearMoneda(document.getElementById('total-ipc').value),
            total: this.desformatearMoneda(document.getElementById('total-documento').value)
        };
    
        // Recopilar datos de los items
        const traslados2 = Array.from(document.querySelectorAll('.items-table tbody tr')).map((tr, index) => {
            const idRef = tr.dataset.id;
            return {
                ID: generarIdCorto(traslado1.Numero, idRef, index),
                Numero: traslado1.Numero,
                IdReferencia: idRef,
                Descripcion: tr.cells[1].textContent.trim(),
                Cantidad: this.desformatearNumero(tr.querySelector('.cantidad').textContent),
                Valor: this.desformatearNumero(tr.querySelector('.valor').textContent),
                IVA: this.desformatearNumero(tr.querySelector('.iva').textContent),
                idunidad: tr.cells[2].textContent.trim(),
                impoconsumo: 0,
                ipc: 0,
                imp_ibua: 0,
                imp_icui: 0
            };
        });
    
        // Verificar longitud de IDs antes de enviar
        traslados2.forEach(item => {
            if (item.ID.length > 25) {
                console.warn(`ID demasiado largo (${item.ID.length}): ${item.ID}`);
                item.ID = item.ID.slice(0, 25);
            }
        });
    
        const datosCompletos = {
            traslado1,
            traslados2
        };
    
        // Log para verificar los datos antes de enviar
        console.log('Datos a enviar:', {
            fecha: traslado1.fecha,
            fechaCreacion: traslado1.FechaCreacion,
            mes: traslado1.Mes,
            'Ejemplo de ID': traslados2[0]?.ID
        });
    
        return datosCompletos;
    },

    // Función auxiliar para generar ID único y válido
    generarIdUnico(prefijo, longitud = 25) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 5);
        let id = `${prefijo}_${timestamp}${randomStr}`;
        return id.slice(0, longitud);
    },

    // Funciones de utilidad
    mostrarMensaje(mensaje, tipo = 'info') {
        const div = document.createElement('div');
        div.className = `mensaje mensaje-${tipo}`;
        div.textContent = mensaje;
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.backgroundColor = tipo === 'error' ? '#f44336' : 
                                  tipo === 'success' ? '#4CAF50' : 
                                  '#2196F3';
        div.style.color = 'white';
        div.style.zIndex = '1000';
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    validarBodegas() {
        if (this.state.bodegaOrigenSeleccionada === this.state.bodegaDestinoSeleccionada && 
            this.state.bodegaOrigenSeleccionada !== null) {
            this.mostrarMensaje('Las bodegas origen y destino no pueden ser iguales', 'error');
            return false;
        }
        return true;
    },

    limpiarFormulario() {
        // Limpiar campos
        ['observaciones'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '';
        });

        // Resetear selects
        ['bodega-origen', 'bodega-destino'].forEach(id => {
            const select = document.getElementById(id);
            if (select) select.selectedIndex = 0;
        });

        // Limpiar tabla
        const tabla = document.querySelector('.items-table tbody');
        if (tabla) tabla.innerHTML = '';

        // Resetear totales
        this.state.datosCalculados = {
            totalUnidades: 0,
            subtotal: 0,
            totalIva: 0,
            totalImpoconsumo: 0,
            totalIcui: 0,
            totalIbua: 0,
            totalIpc: 0,
            totalDocumento: 0
        };
        
        this.actualizarCamposTotales(this.state.datosCalculados);
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        lucide.createIcons();
        TrasladosInventario.init();
    } catch (error) {
        console.error('Error al inicializar el sistema:', error);
        alert('Error al inicializar el sistema de traslados de inventario');
    }
});

// Exportar el módulo para uso global
window.TrasladosInventario = TrasladosInventario;