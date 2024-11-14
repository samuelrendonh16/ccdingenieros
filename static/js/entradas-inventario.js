// Sistema de Entradas de Inventario
const EntradasInventario = {
    // Estado del sistema
    state: {
        modo: 'lectura', // 'lectura', 'nuevo', 'edicion'
        entradaActual: null,
        items: [],
        consecutivoActual: null,
        bodegaSeleccionada: null,
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
            console.log('Iniciando sistema de entradas de inventario...');
            
            // Crear modal de búsqueda de productos
            this.crearModalBusquedaProductos();
            console.log('Modal de búsqueda creado');

            // Inicializar event listeners
            this.initializeEventListeners();
            console.log('Event listeners inicializados');

            // Cargar datos iniciales
            await this.cargarDatosIniciales();
            console.log('Datos iniciales cargados');

            // Actualizar interfaz
            await this.actualizarInterfaz();
            console.log('Interfaz actualizada');

        } catch (error) {
            console.error('Error durante la inicialización:', error);
            this.mostrarMensaje('Error al inicializar el sistema', 'error');
        }
    },

    // Event Listeners
    initializeEventListeners() {
        // Botones principales
        const btnNuevo = document.querySelector('button:has([data-lucide="plus"])');
        const btnGuardar = document.querySelector('button:has([data-lucide="save"])');
        const btnEditar = document.querySelector('button:has([data-lucide="edit"])');
        const btnCancelar = document.querySelector('button:has([data-lucide="x"])');
        const btnBuscar = document.querySelector('button:has([data-lucide="search"])');
        const btnImprimir = document.querySelector('button:has([data-lucide="printer"])');

        // Asignar eventos a botones principales
        if (btnNuevo) btnNuevo.addEventListener('click', () => this.iniciarNuevaEntrada());
        if (btnGuardar) btnGuardar.addEventListener('click', () => this.guardarEntrada());
        if (btnEditar) btnEditar.addEventListener('click', () => this.habilitarEdicion());
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.cancelarOperacion());
        if (btnBuscar) btnBuscar.addEventListener('click', () => this.buscarEntrada());
        if (btnImprimir) btnImprimir.addEventListener('click', () => this.imprimirEntrada());

        // Select de bodega
        const selectBodega = document.getElementById('bodega');
        if (selectBodega) {
            selectBodega.addEventListener('change', (e) => {
                this.state.bodegaSeleccionada = e.target.value;
                this.actualizarInterfaz();
            });
        }

        // Búsqueda de items
        const searchInput = document.getElementById('buscar-item');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => 
                this.buscarProductos(searchInput.value), 300
            ));
            
            searchInput.addEventListener('click', () => this.mostrarBusquedaProductos());
        }

        // Tabla de items
        const tablaCuerpo = document.querySelector('.items-table tbody');
        if (tablaCuerpo) {
            tablaCuerpo.addEventListener('click', (e) => {
                if (e.target.matches('td[contenteditable="true"]')) {
                    this.editarCelda(e.target);
                }
                if (e.target.classList.contains('btn-eliminar')) {
                    const fila = e.target.closest('tr');
                    if (fila) {
                        fila.remove();
                        this.calcularTotales();
                    }
                }
            });

            tablaCuerpo.addEventListener('input', (e) => {
                if (e.target.matches('td[contenteditable="true"]')) {
                    this.calcularTotales();
                }
            });
        }

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.modalBusqueda) {
                this.cerrarModalBusqueda();
            }
            if (e.key === 'Enter' && !e.target.matches('td[contenteditable="true"]')) {
                this.manejarTeclaEnter(e);
            }
        });

        // Campos de cálculo
        document.querySelectorAll('.campo-calculo').forEach(campo => {
            campo.addEventListener('change', () => this.calcularTotales());
        });
    },

    // Funciones de carga de datos
    async cargarDatosIniciales() {
        try {
            await Promise.all([
                this.cargarConsecutivos(),
                this.cargarBodegas(),
            ]);
    
            const fechaActual = new Date().toISOString().split('T')[0];
            const inputFecha = document.getElementById('fecha');
            const inputFechaCreacion = document.getElementById('fecha-creacion');
            
            if (inputFecha) inputFecha.value = fechaActual;
            if (inputFechaCreacion) inputFechaCreacion.value = fechaActual;
    
            await this.obtenerUltimoConsecutivo();
            console.log('Datos iniciales cargados correctamente');
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            this.mostrarMensaje('Error al cargar los datos iniciales', 'error');
            throw error;
        }
    },

    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_entradas');
            if (!response.ok) {
                throw new Error('Error al obtener el último consecutivo');
            }
            
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

    async cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos_entradas_inventario');
            if (!response.ok) throw new Error('Error al cargar consecutivos');
            
            const consecutivos = await response.json();
            const select = document.getElementById('consecutivo');
            
            if (select) {
                select.innerHTML = consecutivos.map(c => 
                    `<option value="${c.IdConsecutivo}">${c.Descripcion}</option>`
                ).join('');
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
            const select = document.getElementById('bodega');
            
            if (select) {
                select.innerHTML = '<option value="">Seleccione una bodega</option>' + 
                    bodegas.map(b => `<option value="${b.IdBodega}">${b.Descripcion}</option>`).join('');
            }
        } catch (error) {
            console.error('Error al cargar bodegas:', error);
            throw error;
        }
    },

    async actualizarInterfaz() {
        const esModoLectura = this.state.modo === 'lectura';
        
        // Actualizar botones
        const botones = {
            'plus': !esModoLectura,
            'save': esModoLectura,
            'edit': !esModoLectura,
            'x': esModoLectura,
            'search': true,
            'printer': true
        };

        Object.entries(botones).forEach(([icono, disabled]) => {
            const boton = document.querySelector(`button:has([data-lucide="${icono}"])`);
            if (boton) boton.disabled = disabled;
        });

        // Actualizar campos
        document.querySelectorAll('input:not([type="search"]), select, textarea').forEach(campo => {
            if (campo.id !== 'buscar-item' && campo.id !== 'numero' && 
                !campo.classList.contains('total')) {
                campo.disabled = esModoLectura;
            }
        });

        // Actualizar celdas editables
        document.querySelectorAll('.items-table td[contenteditable]').forEach(celda => {
            celda.contentEditable = !esModoLectura;
            celda.classList.toggle('editable', !esModoLectura);
        });

        // Actualizar tabla
        const tablaItems = document.querySelector('.items-table');
        if (tablaItems) {
            tablaItems.classList.toggle('modo-lectura', esModoLectura);
        }

        this.calcularTotales();
    },

    // Modal de búsqueda de productos
    crearModalBusquedaProductos() {
        const modalExistente = document.querySelector('.modal-busqueda-productos');
        if (modalExistente) {
            modalExistente.remove();
        }
    
        const modal = document.createElement('div');
        modal.className = 'modal-busqueda-productos';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Buscar Productos</h3>
                    <button type="button" class="btn-close" onclick="EntradasInventario.cerrarModalBusqueda()">&times;</button>
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
                                    <th>Stock Actual</th>
                                    <th>Costo</th>
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
            max-height: 80vh;
            overflow-y: auto;
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
        this.state.modalBusqueda = modal;
    },

    // Funciones de búsqueda de productos
    async buscarProductos(termino = '') {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarMensaje('Por favor, seleccione una bodega primero', 'error');
            return;
        }
    
        try {
            // Obtener datos del inventario
            const response = await fetch('/api/consulta_inventario');
            if (!response.ok) throw new Error('Error al cargar datos de inventario');
            
            const inventario = await response.json();
            
            // Filtrar productos por término de búsqueda
            this.state.productosEncontrados = inventario.filter(producto => 
                producto.IDReferencia?.toLowerCase().includes(termino.toLowerCase()) ||
                producto.Referencia?.toLowerCase().includes(termino.toLowerCase())
            );
    
            // Mostrar resultados en el modal
            this.mostrarResultadosBusqueda(this.state.productosEncontrados);
    
        } catch (error) {
            console.error('Error al buscar productos:', error);
            this.mostrarMensaje('Error al buscar productos: ' + error.message, 'error');
        }
    },

    mostrarResultadosBusqueda(productos) {
        const tbody = document.querySelector('.modal-busqueda-productos tbody');
        if (!tbody) return;
    
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron productos</td></tr>';
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
                    <td class="text-end">${this.formatearMoneda(producto.Costo || 0)}</td>
                    <td class="text-center">
                        <button type="button" 
                                class="btn btn-primary btn-sm" 
                                onclick="EntradasInventario.seleccionarProducto('${producto.IDReferencia}')">
                            Seleccionar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async seleccionarProducto(idReferencia) {
        try {
            const producto = this.state.productosEncontrados.find(p => p.IDReferencia === idReferencia);
            if (!producto) throw new Error('Producto no encontrado');
    
            const tabla = document.querySelector('.items-table tbody');
            if (!tabla) throw new Error('Tabla no encontrada');
    
            // Verificar si el producto ya existe en la tabla
            const filaExistente = tabla.querySelector(`tr[data-id="${idReferencia}"]`);
            if (filaExistente) {
                const celdaCantidad = filaExistente.querySelector('td.cantidad');
                if (celdaCantidad) {
                    const cantidadActual = this.desformatearNumero(celdaCantidad.textContent);
                    celdaCantidad.textContent = this.formatearNumero(cantidadActual + 1);
                    this.calcularTotales();
                }
            } else {
                // Crear nueva fila para el producto
                const tr = document.createElement('tr');
                tr.dataset.id = idReferencia;
                tr.innerHTML = `
                    <td>${idReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td>${producto.ID_Unidad || ''}</td>
                    <td contenteditable="true" class="numero cantidad">1</td>
                    <td contenteditable="true" class="numero valor">${this.formatearNumero(producto.Costo || 0)}</td>
                    <td contenteditable="true" class="numero iva">${this.formatearNumero(producto.IVA || 0)}</td>
                    <td contenteditable="true" class="numero impoconsumo">0</td>
                    <td contenteditable="true" class="numero ipc">0</td>
                    <td contenteditable="true" class="numero ibua">0</td>
                    <td contenteditable="true" class="numero icui">0</td>
                    <td class="subtotal">${this.formatearMoneda(producto.Costo || 0)}</td>
                    <td class="text-center">
                        <button type="button" class="btn-eliminar" onclick="EntradasInventario.eliminarProducto(this)">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
    
                tabla.appendChild(tr);
                this.agregarEventosCeldasEditables(tr);
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
    
            this.calcularTotales();
            this.cerrarModalBusqueda();
    
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje(error.message, 'error');
        }
    },

    agregarEventosCeldasEditables(fila) {
        fila.querySelectorAll('td[contenteditable="true"]').forEach(celda => {
            celda.addEventListener('blur', () => {
                let valor = this.desformatearNumero(celda.textContent);
                
                if (celda.classList.contains('cantidad')) {
                    if (valor <= 0) {
                        this.mostrarMensaje('La cantidad debe ser mayor a 0', 'warning');
                        valor = 1;
                    }
                }
    
                celda.textContent = this.formatearNumero(valor);
                this.calcularTotales();
            });
    
            celda.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    celda.blur();
                }
            });
        });
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

    mostrarBusquedaProductos() {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarMensaje('Por favor, seleccione una bodega primero', 'error');
            return;
        }

        // Mostrar el modal
        if (this.state.modalBusqueda) {
            this.state.modalBusqueda.style.display = 'block';
            const inputBusqueda = this.state.modalBusqueda.querySelector('#modal-buscar-producto');
            if (inputBusqueda) {
                inputBusqueda.value = '';
                inputBusqueda.focus();
            }

            // Cargar todos los productos inicialmente
            this.buscarProductos();
        }
    },

    cerrarModalBusqueda() {
        if (this.state.modalBusqueda) {
            this.state.modalBusqueda.style.display = 'none';
        }
    },

    agregarProductoAEntrada(idReferencia) {
        const producto = this.state.productosEncontrados.find(p => p.IdReferencia === idReferencia);
        if (!producto) return;

        const tbody = document.querySelector('.items-table tbody');
        const filaExistente = tbody.querySelector(`tr[data-id="${idReferencia}"]`);
        
        if (filaExistente) {
            const cantidadCell = filaExistente.querySelector('td[contenteditable="true"]');
            if (cantidadCell) {
                const cantidadActual = parseFloat(cantidadCell.textContent) || 0;
                cantidadCell.textContent = (cantidadActual + 1).toString();
                this.calcularTotales();
            }
        } else {
            const tr = document.createElement('tr');
            tr.dataset.id = idReferencia;
            tr.innerHTML = this.crearFilaProducto(producto);
            tbody.appendChild(tr);
        }

        this.cerrarModalBusqueda();
        this.calcularTotales();
    },

    crearFilaProducto(producto) {
        return `
            <td>${producto.IdReferencia}</td>
            <td>${producto.Referencia}</td>
            <td>${producto.IdUnidad || ''}</td>
            <td contenteditable="true" class="numero cantidad">${1}</td>
            <td contenteditable="true" class="numero">${producto.Costo || 0}</td>
            <td contenteditable="true" class="numero">${producto.IVA || 0}</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td class="subtotal">${this.formatearMoneda(producto.Costo || 0)}</td>
            <td>
                <button type="button" class="btn-eliminar" onclick="EntradasInventario.eliminarProducto(this)">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
    },

    eliminarProducto(boton) {
        const fila = boton.closest('tr');
        if (fila) {
            fila.remove();
            this.calcularTotales();
        }
    },

    // Funciones de cálculos y totales
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
                // Obtener valores usando la función desformatearNumero para manejar miles
                const cantidad = this.desformatearNumero(row.cells[3].textContent);
                const valor = this.desformatearNumero(row.cells[4].textContent);
                const iva = this.desformatearNumero(row.cells[5].textContent);
                const impoconsumo = this.desformatearNumero(row.cells[6].textContent);
                const ipc = this.desformatearNumero(row.cells[7].textContent);
                const ibua = this.desformatearNumero(row.cells[8].textContent);
                const icui = this.desformatearNumero(row.cells[9].textContent);
    
                // Calcular subtotal de la línea
                const subtotalLinea = cantidad * valor;
    
                // Acumular totales
                totales.totalUnidades += cantidad;
                totales.subtotal += subtotalLinea;
                totales.totalIva += (subtotalLinea * (iva / 100));
                totales.totalImpoconsumo += (subtotalLinea * (impoconsumo / 100));
                totales.totalIpc += (subtotalLinea * (ipc / 100));
                totales.totalIbua += (subtotalLinea * (ibua / 100));
                totales.totalIcui += (subtotalLinea * (icui / 100));
    
                // Actualizar subtotal en la fila usando el formateo correcto
                const subtotalCell = row.querySelector('.subtotal');
                if (subtotalCell) {
                    subtotalCell.textContent = this.formatearMoneda(subtotalLinea);
                }
            });
    
            // Calcular total del documento
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
                    // Formatear usando el nuevo sistema de formateo
                    campo.value = this.formatearNumero(valor);
                }
            });
        } catch (error) {
            console.error('Error al actualizar campos totales:', error);
        }
    },

    // Operaciones CRUD
    async iniciarNuevaEntrada() {
        try {
            this.state.modo = 'nuevo';
            this.limpiarFormulario();
            await this.obtenerUltimoConsecutivo();
            this.actualizarInterfaz();
            this.mostrarMensaje('Nueva entrada iniciada', 'info');
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al iniciar nueva entrada', 'error');
        }
    },

    async guardarEntrada() {
        if (!this.validarFormulario()) {
            return;
        }
    
        try {
            // Recopilar los datos asegurando que los números estén correctos
            const datosEntrada = this.recopilarDatosFormulario();
            
            // Log para verificar los datos antes de enviar
            console.log('Datos a enviar:', datosEntrada);
            
            const response = await fetch('/api/guardar_entrada', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosEntrada)
            });
    
            const result = await response.json();
            
            if (result.success) {
                await this.actualizarConsecutivo();
                this.mostrarMensaje('Entrada guardada exitosamente', 'success');
                this.state.modo = 'lectura';
                this.actualizarInterfaz();
    
                if (result.doc_content) {
                    this.descargarDocumento(result.doc_content, result.documento);
                }
    
                this.limpiarFormulario();
                await this.obtenerUltimoConsecutivo();
            } else {
                throw new Error(result.message || 'Error al guardar la entrada');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje(error.message, 'error');
        }
    },

    // Función para actualizar consecutivo
    async actualizarConsecutivo() {
        try {
            const response = await fetch('/api/actualizar_consecutivo_entradas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                const inputNumero = document.getElementById('numero');
                if (inputNumero) {
                    inputNumero.value = result.nuevoConsecutivo;
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error al actualizar consecutivo:', error);
            this.mostrarMensaje('Error al actualizar consecutivo', 'error');
        }
    },

    validarFormulario() {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarMensaje('Debe seleccionar una bodega', 'error');
            return false;
        }
    
        const fecha = document.getElementById('fecha').value;
        if (!fecha) {
            this.mostrarMensaje('Debe seleccionar una fecha', 'error');
            return false;
        }
    
        const items = document.querySelectorAll('.items-table tbody tr');
        if (items.length === 0) {
            this.mostrarMensaje('Debe agregar al menos un item', 'error');
            return false;
        }
    
        // Validar cantidades
        let cantidadInvalida = false;
        items.forEach(row => {
            const cantidad = parseFloat(row.cells[3].textContent);
            if (isNaN(cantidad) || cantidad <= 0) {
                cantidadInvalida = true;
                row.cells[3].classList.add('error');
            }
        });
    
        if (cantidadInvalida) {
            this.mostrarMensaje('Hay productos con cantidades inválidas', 'error');
            return false;
        }
    
        return true;
    },

    recopilarDatosFormulario() {
        const items = [];
        document.querySelectorAll('.items-table tbody tr').forEach(row => {
            // Usar desformatearNumero para obtener los valores numéricos correctos
            const cantidad = this.desformatearNumero(row.cells[3].textContent);
            const valor = this.desformatearNumero(row.cells[4].textContent);
            const iva = this.desformatearNumero(row.cells[5].textContent);
            const impoconsumo = this.desformatearNumero(row.cells[6].textContent);
            const ipc = this.desformatearNumero(row.cells[7].textContent);
            const ibua = this.desformatearNumero(row.cells[8].textContent);
            const icui = this.desformatearNumero(row.cells[9].textContent);

            // Calcular el subtotal correctamente
            const subtotal = cantidad * valor;

            items.push({
                ID: `${document.getElementById('numero').value}_${row.dataset.id}`,
                Numero: document.getElementById('numero').value,
                IdReferencia: row.cells[0].textContent,
                Descripcion: row.cells[1].textContent,
                idunidad: row.cells[2].textContent,
                Cantidad: cantidad,
                Valor: valor,
                Subtotal: subtotal, // Agregar el subtotal calculado
                IVA: iva,
                impoconsumo: impoconsumo,
                ipc: ipc,
                imp_ibua: ibua,
                imp_icui: icui
            });
        });

        // Obtener los totales calculados correctamente
        const totalesCalculados = {};
        const camposTotales = [
            'total-unidades', 'subtotal', 'total-iva', 
            'total-impoconsumo', 'total-icui', 'total-ibua', 
            'total-ipc', 'total-documento'
        ];

        camposTotales.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                totalesCalculados[campo.replace('-', '')] = this.desformatearNumero(elemento.value);
            }
        });

        return {
            entrada1: {
                Numero: document.getElementById('numero').value,
                Mes: new Date().toISOString().slice(0, 7).replace('-', ''),
                Anulado: document.getElementById('anulado').checked,
                IdBodega: this.state.bodegaSeleccionada,
                Observaciones: document.getElementById('observaciones').value,
                FechaCreacion: document.getElementById('fecha-creacion').value,
                fecha: document.getElementById('fecha').value,
                IdConsecutivo: document.getElementById('consecutivo').value,
                // Usar los totales calculados correctamente
                totalUnidades: totalesCalculados.totalunidades,
                subtotal: totalesCalculados.subtotal,
                totalIva: totalesCalculados.totaliva,
                totalImpoconsumo: totalesCalculados.totalimpoconsumo,
                totalIcui: totalesCalculados.totalicui,
                totalIbua: totalesCalculados.totalibua,
                totalIpc: totalesCalculados.totalipc,
                totalDocumento: totalesCalculados.totaldocumento
            },
            entradas2: items
        };
    },

    limpiarFormulario() {
        const camposALimpiar = {
            'observaciones': '',
            'fecha': new Date().toISOString().split('T')[0],
            'fecha-creacion': new Date().toISOString().split('T')[0]
        };

        Object.entries(camposALimpiar).forEach(([id, valor]) => {
            const campo = document.getElementById(id);
            if (campo) campo.value = valor;
        });

        document.getElementById('anulado')?.removeAttribute('checked');
        document.querySelector('.items-table tbody').innerHTML = '';
        
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
    },

    // Funciones de edición y control
    habilitarEdicion() {
        if (this.state.modo === 'lectura') {
            this.state.modo = 'edicion';
            this.actualizarInterfaz();
            this.mostrarMensaje('Modo edición activado', 'info');
        }
    },

    cancelarOperacion() {
        this.state.modo = 'lectura';
        if (this.state.entradaActual) {
            this.cargarEntrada(this.state.entradaActual);
        } else {
            this.limpiarFormulario();
        }
        this.actualizarInterfaz();
        this.mostrarMensaje('Operación cancelada', 'info');
    },

    editarCelda(celda) {
        if (this.state.modo === 'lectura') return;
    
        celda.removeEventListener('focus', this._handleFocus);
        celda.removeEventListener('blur', this._handleBlur);
        celda.removeEventListener('keydown', this._handleKeydown);
        celda.removeEventListener('keypress', this._handleKeypress);
        celda.removeEventListener('paste', this._handlePaste);
    
        this._handleFocus = () => {
            // Al obtener el foco, mostrar el valor sin formato
            let valor = this.desformatearNumero(celda.textContent);
            celda.textContent = valor.toString().replace('.', ',');
            celda.select();
        };
    
        this._handleBlur = () => {
            try {
                let valor = this.desformatearNumero(celda.textContent);
                
                switch (celda.classList[1]) {
                    case 'cantidad':
                        if (valor <= 0) {
                            this.mostrarMensaje('La cantidad debe ser mayor a 0', 'warning');
                            valor = 1;
                        }
                        break;
                    case 'valor':
                        if (valor < 0) valor = 0;
                        break;
                    case 'iva':
                    case 'impoconsumo':
                    case 'ipc':
                    case 'icui':
                    case 'ibua':
                        if (valor < 0 || valor > 100) {
                            this.mostrarMensaje('El porcentaje debe estar entre 0 y 100', 'warning');
                            valor = 0;
                        }
                        break;
                }

                // Formatear el valor preservando los miles
                celda.textContent = this.formatearNumero(valor);
                this.calcularTotales();
                
            } catch (error) {
                console.error('Error al procesar valor:', error);
                celda.textContent = this.formatearNumero(0);
                this.mostrarMensaje('Error al procesar el valor', 'error');
            }
        };
    
        this._handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                celda.blur();
            }
        };
    
        this._handleKeypress = (e) => {
            // Permitir números, punto, coma y teclas de control
            if (!/[\d.,]/.test(e.key) && !e.ctrlKey) {
                e.preventDefault();
                return;
            }
    
            // Permitir solo un separador decimal
            const contenidoActual = celda.textContent;
            if ((e.key === '.' || e.key === ',') && 
                (contenidoActual.includes('.') || contenidoActual.includes(','))) {
                e.preventDefault();
            }
        };
    
        this._handlePaste = (e) => {
            e.preventDefault();
            let texto = (e.clipboardData || window.clipboardData).getData('text');
            // Limpiar el texto pegado pero mantener puntos y comas
            texto = texto.replace(/[^\d.,]/g, '');
            
            if (texto) {
                // Asegurarse de que solo haya un separador decimal
                const partes = texto.split(/[.,]/);
                if (partes.length > 2) {
                    texto = partes[0] + ',' + partes[1];
                }
                celda.textContent = texto;
            }
        };
    
        celda.addEventListener('focus', this._handleFocus);
        celda.addEventListener('blur', this._handleBlur);
        celda.addEventListener('keydown', this._handleKeydown);
        celda.addEventListener('keypress', this._handleKeypress);
        celda.addEventListener('paste', this._handlePaste);
    
        celda.style.textAlign = 'right';
        celda.style.fontFamily = 'monospace';
    },

    manejarTeclaEnter(e) {
        const targetId = e.target.id;
        const nextElement = this.obtenerSiguienteCampo(targetId);
        if (nextElement) {
            e.preventDefault();
            nextElement.focus();
            if (nextElement.select) {
                nextElement.select();
            }
        }
    },

    obtenerSiguienteCampo(actualId) {
        const orden = [
            'consecutivo',
            'bodega',
            'fecha',
            'fecha-creacion',
            'centro-costos',
            'observaciones',
            'buscar-item'
        ];

        const currentIndex = orden.indexOf(actualId);
        if (currentIndex < orden.length - 1) {
            return document.getElementById(orden[currentIndex + 1]);
        }
        return null;
    },

    // Funciones de búsqueda y carga
    async buscarEntrada() {
        const numero = prompt('Ingrese el número de entrada a buscar:');
        if (!numero) return;

        try {
            const response = await fetch(`/api/entradas_inventario/${numero}`);
            const data = await response.json();
            
            if (data.success) {
                this.cargarEntrada(data.entrada);
                this.mostrarMensaje('Entrada cargada exitosamente', 'success');
            } else {
                this.mostrarMensaje('Entrada no encontrada', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al buscar la entrada', 'error');
        }
    },

    cargarEntrada(entrada) {
        // Cargar datos principales
        const campos = {
            'numero': entrada.Numero,
            'consecutivo': entrada.IdConsecutivo,
            'bodega': entrada.IdBodega,
            'fecha': entrada.fecha,
            'fecha-creacion': entrada.FechaCreacion,
            'observaciones': entrada.Observaciones
        };

        Object.entries(campos).forEach(([id, valor]) => {
            const campo = document.getElementById(id);
            if (campo) campo.value = valor;
        });

        // Cargar items
        const tbody = document.querySelector('.items-table tbody');
        tbody.innerHTML = '';
        entrada.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.id = item.IdReferencia;
            tr.innerHTML = this.crearFilaProducto({
                IdReferencia: item.IdReferencia,
                Referencia: item.Descripcion,
                IdUnidad: item.idunidad,
                Costo: item.Valor,
                IVA: item.IVA
            });
            tbody.appendChild(tr);
        });

        this.state.entradaActual = entrada;
        this.state.modo = 'lectura';
        this.calcularTotales();
    },

    // Funciones de documentos
    async imprimirEntrada() {
        try {
            const numero = document.getElementById('numero').value;
            const response = await fetch(`/api/entradas_inventario/${numero}/imprimir`);
            
            if (!response.ok) {
                throw new Error('Error al generar el documento para impresión');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const ventanaImpresion = window.open(url);
            ventanaImpresion.onload = () => {
                ventanaImpresion.print();
                window.URL.revokeObjectURL(url);
            };
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al imprimir la entrada', 'error');
        }
    },

    // Función actualizada para descargar documento
    descargarDocumento(contenido, nombreArchivo) {
        try {
            // Decodificar el contenido Base64
            const byteCharacters = atob(contenido);
            const byteNumbers = new Array(byteCharacters.length);
            
            // Convertir a array de bytes
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });

            // Crear enlace de descarga
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            
            // Limpieza
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error al descargar el documento:', error);
            this.mostrarMensaje('Error al descargar el documento', 'error');
        }
    },

    // Funciones de utilidad
    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '$ 0,00';
        return '$ ' + this.formatearNumero(valor);
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

    mostrarMensaje(mensaje, tipo = 'info') {
        const div = document.createElement('div');
        div.className = `mensaje mensaje-${tipo}`;
        div.innerHTML = `
            <div class="mensaje-contenido">
                ${mensaje}
            </div>
            <button class="mensaje-cerrar">&times;</button>
        `;
        
        document.body.appendChild(div);

        const btnCerrar = div.querySelector('.mensaje-cerrar');
        btnCerrar.addEventListener('click', () => div.remove());

        setTimeout(() => {
            if (document.body.contains(div)) {
                div.remove();
            }
        }, 5000);
    },

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
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar íconos de Lucide
        lucide.createIcons();
        // Inicializar el sistema
        EntradasInventario.init();
    } catch (error) {
        console.error('Error al inicializar el sistema:', error);
        alert('Error al inicializar el sistema de entradas de inventario');
    }
});

// Exportar el módulo para uso global
window.EntradasInventario = EntradasInventario;