// Sistema de Salidas de Inventario
const SalidasInventario = {
    // Estado del sistema
    state: {
        modo: 'lectura', // 'lectura', 'nuevo', 'edicion'
        salidaActual: null,
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
    init() {
        try {
            console.log('Iniciando sistema de salidas de inventario...');
            
            // Primero creamos el modal
            this.crearModalBusquedaProductos();
            console.log('Modal de búsqueda creado');

            // Luego inicializamos los event listeners
            this.initializeEventListeners();
            console.log('Event listeners inicializados');

            // Inicializar el state con valores por defecto
            this.state.datosCalculados = {
                totalUnidades: 0,
                subtotal: 0,
                totalImpoconsumo: 0,
                totalIcui: 0,
                totalIbua: 0,
                totalIpc: 0,
                totalDocumento: 0
            };

            // Cargar datos iniciales
            this.cargarDatosIniciales();
            console.log('Datos iniciales cargados');

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
        // Botones principales
        const btnNuevo = document.querySelector('button:has([data-lucide="plus"])');
        const btnGuardar = document.querySelector('button:has([data-lucide="save"])');
        const btnEditar = document.querySelector('button:has([data-lucide="edit"])');
        const btnCancelar = document.querySelector('button:has([data-lucide="x"])');
        const btnBuscar = document.querySelector('button:has([data-lucide="search"])');
        const btnImprimir = document.querySelector('button:has([data-lucide="printer"])');

        // Asignar eventos a botones principales
        if (btnNuevo) btnNuevo.addEventListener('click', () => this.iniciarNuevaSalida());
        if (btnGuardar) btnGuardar.addEventListener('click', () => this.guardarSalida());
        if (btnEditar) btnEditar.addEventListener('click', () => this.habilitarEdicion());
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.cancelarOperacion());
        if (btnBuscar) btnBuscar.addEventListener('click', () => this.buscarSalida());
        if (btnImprimir) btnImprimir.addEventListener('click', () => this.imprimirSalida());

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
                    if (e.target.classList.contains('cantidad')) {
                        this.validarCantidad(e.target);
                    }
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

    // Función para editar celda
    editarCelda(celda) {
        if (this.state.modo === 'lectura') return;
    
        celda.removeEventListener('focus', this._handleFocus);
        celda.removeEventListener('blur', this._handleBlur);
        celda.removeEventListener('keydown', this._handleKeydown);
        celda.removeEventListener('keypress', this._handleKeypress);
        celda.removeEventListener('paste', this._handlePaste);
    
        this._handleFocus = () => {
            let valor = this.desformatearNumero(celda.textContent);
            celda.textContent = valor.toString().replace('.', ',');
            celda.select();
        };
    
        this._handleBlur = async () => {
            try {
                let valor = this.desformatearNumero(celda.textContent);
                
                if (celda.classList.contains('cantidad')) {
                    const validado = await this.validarCantidad(celda);
                    if (!validado) return;
                } else {
                    if (isNaN(valor) || valor < 0) valor = 0;
                }

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
            if (!/[\d.,]/.test(e.key) && !e.ctrlKey) {
                e.preventDefault();
                return;
            }
    
            const contenidoActual = celda.textContent;
            if ((e.key === '.' || e.key === ',') && 
                (contenidoActual.includes('.') || contenidoActual.includes(','))) {
                e.preventDefault();
            }
        };
    
        this._handlePaste = (e) => {
            e.preventDefault();
            let texto = (e.clipboardData || window.clipboardData).getData('text');
            texto = texto.replace(/[^\d.,]/g, '');
            
            if (texto) {
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

    // Funciones de carga de datos
    async cargarDatosIniciales() {
        try {
            console.log('Cargando datos iniciales...');
            
            // Cargar datos básicos
            await Promise.all([
                this.cargarConsecutivos(),
                this.cargarBodegas()
            ]);
    
            // Establecer fechas actuales
            const fechaActual = new Date().toISOString().split('T')[0];
            const inputFecha = document.getElementById('fecha');
            const inputFechaCreacion = document.getElementById('fecha-creacion');
            
            if (inputFecha) inputFecha.value = fechaActual;
            if (inputFechaCreacion) inputFechaCreacion.value = fechaActual;
    
            // Obtener último consecutivo
            await this.obtenerUltimoConsecutivo();
    
            // Inicializar los totales con valores en cero
            this.state.datosCalculados = {
                totalUnidades: 0,
                subtotal: 0,
                totalImpoconsumo: 0,
                totalIcui: 0,
                totalIbua: 0,
                totalIpc: 0,
                totalDocumento: 0
            };
            
            // Actualizar los campos totales con los valores iniciales
            this.actualizarCamposTotales(this.state.datosCalculados);
            
            console.log('Datos iniciales cargados correctamente');
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            this.mostrarMensaje('Error al cargar los datos iniciales', 'error');
            throw error;
        }
    },

    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_salidas');
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

    async cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos_salidas_inventario');
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

    // Búsqueda y manejo de productos
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
            
            // Filtrar productos por término de búsqueda y bodega seleccionada
            this.state.productosEncontrados = inventario
                .filter(producto => 
                    producto.Bodega === this.state.bodegaSeleccionada &&
                    (producto.IDReferencia?.toLowerCase().includes(termino.toLowerCase()) ||
                    producto.Referencia?.toLowerCase().includes(termino.toLowerCase()))
                )
                .sort((a, b) => {
                    // Ordenar primero por stock disponible (descendente)
                    const stockA = parseFloat(a.Saldo || 0);
                    const stockB = parseFloat(b.Saldo || 0);
                    if (stockB !== stockA) return stockB - stockA;
                    
                    // Luego por descripción
                    return a.Referencia?.localeCompare(b.Referencia);
                });
    
            // Mostrar resultados
            this.mostrarResultadosBusqueda();
    
        } catch (error) {
            console.error('Error al buscar productos:', error);
            this.mostrarMensaje('Error al buscar productos: ' + error.message, 'error');
        }
    },

    async verificarStockDisponible(idReferencia, cantidadRequerida) {
        try {
            const response = await fetch(`/api/verificar_inventario?idReferencia=${idReferencia}&idBodega=${this.state.bodegaSeleccionada}`);
            if (!response.ok) throw new Error('Error al verificar stock');
            
            const data = await response.json();
            const saldoDisponible = parseFloat(data.saldoDisponible) || 0;
            
            return {
                disponible: saldoDisponible >= cantidadRequerida,
                saldoDisponible: saldoDisponible
            };
        } catch (error) {
            console.error('Error al verificar stock:', error);
            throw error;
        }
    },

    async validarCantidad(celda) {
        try {
            const cantidad = this.desformatearNumero(celda.textContent);
            const fila = celda.closest('tr');
            if (!fila) return false;
    
            const stockDisponible = parseFloat(fila.dataset.stock) || 0;
    
            if (cantidad <= 0) {
                celda.classList.add('error');
                this.mostrarMensaje('La cantidad debe ser mayor a 0', 'error');
                celda.textContent = this.formatearNumero(1);
                return false;
            }
    
            if (cantidad > stockDisponible) {
                celda.classList.add('error');
                this.mostrarMensaje(`Stock insuficiente. Disponible: ${stockDisponible}`, 'error');
                celda.textContent = this.formatearNumero(stockDisponible);
                this.calcularTotales();
                return false;
            }
    
            celda.classList.remove('error');
            return true;
    
        } catch (error) {
            console.error('Error al validar cantidad:', error);
            this.mostrarMensaje('Error al validar cantidad', 'error');
            return false;
        }
    },

     // Funciones del modal
     cerrarModalBusqueda() {
        if (this.state.modalBusqueda) {
            this.state.modalBusqueda.style.display = 'none';
        }
    },

    async agregarProductoASalida(idReferencia) {
        try {
            // Verificar stock disponible
            const response = await fetch(`/api/verificar_inventario?idReferencia=${idReferencia}&idBodega=${this.state.bodegaSeleccionada}`);
            const data = await response.json();

            if (!data.disponible) {
                this.mostrarMensaje('No hay stock disponible para este producto', 'error');
                return;
            }

            const producto = this.state.productosEncontrados.find(p => p.IdReferencia === idReferencia);
            if (!producto) return;

            const tbody = document.querySelector('.items-table tbody');
            const filaExistente = tbody.querySelector(`tr[data-id="${idReferencia}"]`);

            if (filaExistente) {
                const cantidadCell = filaExistente.querySelector('td[contenteditable="true"]');
                if (cantidadCell) {
                    const cantidadActual = parseFloat(cantidadCell.textContent) || 0;
                    const nuevaCantidad = cantidadActual + 1;
                    
                    if (nuevaCantidad <= data.saldoDisponible) {
                        cantidadCell.textContent = nuevaCantidad;
                        this.calcularTotales();
                    } else {
                        this.mostrarMensaje('Stock insuficiente', 'error');
                    }
                }
            } else {
                const tr = document.createElement('tr');
                tr.dataset.id = idReferencia;
                tr.innerHTML = this.crearFilaProducto(producto);
                tbody.appendChild(tr);
            }

            // Cerrar el modal después de agregar el producto
            this.cerrarModalBusqueda();
            this.calcularTotales();

        } catch (error) {
            console.error('Error al agregar producto:', error);
            this.mostrarMensaje('Error al agregar el producto', 'error');
        }
    },

    mostrarBusquedaProductos() {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarMensaje('Por favor, seleccione una bodega primero', 'error');
            return;
        }

        if (this.state.modalBusqueda) {
            this.state.modalBusqueda.style.display = 'block';
            const inputBusqueda = this.state.modalBusqueda.querySelector('#modal-buscar-producto');
            if (inputBusqueda) {
                inputBusqueda.value = '';
                inputBusqueda.focus();
            }
            // Cargar productos inicialmente
            this.buscarProductos();
        }
    },

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
                    <button type="button" class="btn-close" onclick="SalidasInventario.cerrarModalBusqueda()">&times;</button>
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
                                    <th class="text-end">Stock Disponible</th>
                                    <th class="text-end">Precio</th>
                                    <th class="text-center">Acciones</th>
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
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: none;
        `;
    
        modal.querySelector('.modal-content').style.cssText = `
            background-color: white;
            margin: 2% auto;
            padding: 25px;
            width: 90%;
            max-width: 1200px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            max-height: 90vh;
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

    mostrarResultadosBusqueda() {
        const tbody = document.querySelector('.modal-busqueda-productos tbody');
        if (!tbody) return;
    
        if (!this.state.productosEncontrados.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron productos</td></tr>';
            return;
        }
    
        tbody.innerHTML = this.state.productosEncontrados.map(producto => {
            const stock = parseFloat(producto.Saldo || 0);
            const sinStock = stock <= 0;
            
            return `
                <tr>
                    <td>${producto.IDReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td class="text-center">${producto.ID_Unidad || ''}</td>
                    <td class="text-end ${sinStock ? 'text-danger' : ''}">
                        ${this.formatearNumero(stock)}
                    </td>
                    <td class="text-end">${this.formatearMoneda(producto.PrecioVenta1 || producto.Costo || 0)}</td>
                    <td class="text-center">
                        <button type="button" 
                                class="btn-seleccionar ${sinStock ? 'disabled' : ''}"
                                onclick="SalidasInventario.seleccionarProducto('${producto.IDReferencia}')"
                                ${sinStock ? 'disabled' : ''}>
                            ${sinStock ? 'Sin Stock' : 'Seleccionar'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Agregar esta función al objeto SalidasInventario
    agregarEventosCeldasEditables(fila, stockMaximo) {
        fila.querySelectorAll('td[contenteditable="true"]').forEach(celda => {
            celda.addEventListener('blur', async () => {
                let valor = this.desformatearNumero(celda.textContent);
                
                if (celda.classList.contains('cantidad')) {
                    const validado = await this.validarCantidad(celda);
                    if (!validado) {
                        return;
                    }
                } else {
                    // Para otros campos numéricos, asegurar que sean valores válidos
                    if (isNaN(valor) || valor < 0) {
                        valor = 0;
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

            // Permitir solo números y puntos
            celda.addEventListener('keypress', (e) => {
                const char = String.fromCharCode(e.keyCode);
                const pattern = /[\d.]/;
                if (!pattern.test(char)) {
                    e.preventDefault();
                }
            });
        });
    },

    // Función auxiliar para desformatear números
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

    // Función para seleccionar producto
    async seleccionarProducto(idReferencia) {
        try {
            const producto = this.state.productosEncontrados.find(p => p.IDReferencia === idReferencia);
            if (!producto) throw new Error('Producto no encontrado');
    
            // Validar que tenga stock
            if (!producto.Saldo || producto.Saldo <= 0) {
                this.mostrarMensaje('No hay stock disponible para este producto', 'error');
                return;
            }
    
            const tabla = document.querySelector('.items-table tbody');
            if (!tabla) throw new Error('Tabla no encontrada');
    
            // Verificar si el producto ya existe en la tabla
            const filaExistente = tabla.querySelector(`tr[data-id="${idReferencia}"]`);
            
            if (filaExistente) {
                const celdaCantidad = filaExistente.querySelector('td.cantidad');
                if (celdaCantidad) {
                    const cantidadActual = this.desformatearNumero(celdaCantidad.textContent);
                    const nuevaCantidad = cantidadActual + 1;
                    
                    if (nuevaCantidad > producto.Saldo) {
                        this.mostrarMensaje(`Stock insuficiente. Disponible: ${producto.Saldo}`, 'error');
                        return;
                    }
                    
                    celdaCantidad.textContent = this.formatearNumero(nuevaCantidad);
                    this.calcularTotales();
                }
            } else {
                const tr = document.createElement('tr');
                tr.dataset.id = idReferencia;
                tr.dataset.stock = producto.Saldo; // Guardamos el stock disponible en el dataset
                tr.innerHTML = `
                    <td>${idReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td>${producto.ID_Unidad || ''}</td>
                    <td contenteditable="true" class="numero cantidad">1</td>
                    <td contenteditable="true" class="numero valor">${this.formatearNumero(producto.PrecioVenta1 || producto.Costo || 0)}</td>
                    <td contenteditable="true" class="numero impoconsumo">0</td>
                    <td contenteditable="true" class="numero ipc">0</td>
                    <td contenteditable="true" class="numero ibua">0</td>
                    <td contenteditable="true" class="numero icui">0</td>
                    <td class="subtotal">${this.formatearMoneda(producto.PrecioVenta1 || producto.Costo || 0)}</td>
                    <td class="text-center">
                        <button type="button" class="btn-eliminar" onclick="SalidasInventario.eliminarProducto(this)">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
    
                tabla.appendChild(tr);
                this.agregarEventosCeldasEditables(tr, producto.Saldo);
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

    // Funciones de cálculos y totales
    calcularTotales() {
        const totales = {
            totalUnidades: 0,
            subtotal: 0,
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
                const impoconsumo = this.desformatearNumero(row.cells[5].textContent);
                const ipc = this.desformatearNumero(row.cells[6].textContent);
                const ibua = this.desformatearNumero(row.cells[7].textContent);
                const icui = this.desformatearNumero(row.cells[8].textContent);

                // Calcular subtotal de la línea
                const subtotalLinea = cantidad * valor;

                // Acumular totales
                totales.totalUnidades += cantidad;
                totales.subtotal += subtotalLinea;
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

            totales.totalDocumento = totales.subtotal + 
                                   totales.totalImpoconsumo + 
                                   totales.totalIpc + 
                                   totales.totalIbua + 
                                   totales.totalIcui;

            this.state.datosCalculados = totales;
            this.actualizarCamposTotales(totales);

        } catch (error) {
            console.error('Error en cálculo de totales:', error);
            this.mostrarMensaje('Error al calcular los totales', 'error');
        }
    },

    actualizarCamposTotales(totales) {
        try {
            // Si no se proporcionan totales, usar los valores por defecto
            const valoresActuales = totales || {
                totalUnidades: 0,
                subtotal: 0,
                totalImpoconsumo: 0,
                totalIcui: 0,
                totalIbua: 0,
                totalIpc: 0,
                totalDocumento: 0
            };
    
            const campos = {
                'total-unidades': valoresActuales.totalUnidades,
                'subtotal': valoresActuales.subtotal,
                'total-impoconsumo': valoresActuales.totalImpoconsumo,
                'total-icui': valoresActuales.totalIcui,
                'total-ibua': valoresActuales.totalIbua,
                'total-ipc': valoresActuales.totalIpc,
                'total-documento': valoresActuales.totalDocumento
            };
    
            Object.entries(campos).forEach(([id, valor]) => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.value = this.formatearNumero(valor);
                }
            });
        } catch (error) {
            console.error('Error al actualizar campos totales:', error);
        }
    },

    // Operaciones CRUD
    async iniciarNuevaSalida() {
        try {
            this.state.modo = 'nuevo';
            this.limpiarFormulario();
            await this.obtenerUltimoConsecutivo();
            this.actualizarInterfaz();
            this.mostrarMensaje('Nueva salida iniciada', 'info');
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al iniciar nueva salida', 'error');
        }
    },

    async guardarSalida() {
        if (!this.validarFormulario()) {
            return;
        }

        try {
            // Asegurarse de que los campos requeridos tienen valores
            const numero = document.getElementById('numero').value;
            const fecha = document.getElementById('fecha').value;
            const bodega = this.state.bodegaSeleccionada;
            const consecutivo = document.getElementById('consecutivo').value;

            if (!numero || !fecha || !bodega || !consecutivo) {
                throw new Error('Faltan campos requeridos');
            }

            const datosSalida = {
                salida1: {
                    Numero: numero,
                    // Usar el mes actual en formato YYYYMM
                    Mes: fecha.substring(0, 7).replace('-', ''),
                    Anulado: document.getElementById('anulado')?.checked || false,
                    IdBodega: bodega,
                    CuentaDebito: null,
                    CuentaCredito: null,
                    Observaciones: document.getElementById('observaciones')?.value || '',
                    FechaCreacion: document.getElementById('fecha-creacion')?.value || fecha,
                    Recibe: null,
                    idproyecto: null,
                    fechamodificacion: new Date().toISOString(),
                    IdConsecutivo: consecutivo,
                    op: fecha,
                    fecha: fecha,
                    subtotal: this.desformatearNumero(document.getElementById('subtotal')?.value || '0'),
                    total_iva: this.desformatearNumero(document.getElementById('total-iva')?.value || '0'),
                    total_impoconsumo: this.desformatearNumero(document.getElementById('total-impoconsumo')?.value || '0'),
                    total_ipc: this.desformatearNumero(document.getElementById('total-ipc')?.value || '0'),
                    total_ibua: this.desformatearNumero(document.getElementById('total-ibua')?.value || '0'),
                    total_icui: this.desformatearNumero(document.getElementById('total-icui')?.value || '0'),
                    total: this.desformatearNumero(document.getElementById('total-documento')?.value || '0')
                },
                salidas2: []
            };

            // Recopilar datos de los items
            document.querySelectorAll('.items-table tbody tr').forEach(row => {
                if (!row) return;

                const cantidad = this.desformatearNumero(row.cells[3]?.textContent || '0');
                const valor = this.desformatearNumero(row.cells[4]?.textContent || '0');
                const impoconsumo = this.desformatearNumero(row.cells[5]?.textContent || '0');
                const ipc = this.desformatearNumero(row.cells[6]?.textContent || '0');
                const ibua = this.desformatearNumero(row.cells[7]?.textContent || '0');
                const icui = this.desformatearNumero(row.cells[8]?.textContent || '0');

                datosSalida.salidas2.push({
                    ID: `${numero}_${row.dataset.id || ''}`,
                    Numero: numero,
                    IdReferencia: row.cells[0]?.textContent || '',
                    Descripcion: row.cells[1]?.textContent || '',
                    idunidad: row.cells[2]?.textContent || '',
                    Cantidad: cantidad,
                    Valor: valor,
                    IVA: 0,
                    Descuento: 0,
                    lote: '',
                    impoconsumo: impoconsumo,
                    ipc: ipc,
                    imp_ibua: ibua,
                    imp_icui: icui
                });
            });

            // Verificar que hay items para guardar
            if (datosSalida.salidas2.length === 0) {
                throw new Error('No hay productos para guardar');
            }

            // Log para verificar los datos antes de enviar
            console.log('Datos a enviar:', JSON.stringify(datosSalida, null, 2));

            const response = await fetch('/api/guardar_salida', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosSalida)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la salida');
            }

            const result = await response.json();
            
            if (result.success) {
                await this.actualizarConsecutivo();
                this.mostrarMensaje('Salida guardada exitosamente', 'success');
                this.state.modo = 'lectura';
                this.actualizarInterfaz();

                if (result.doc_content) {
                    this.descargarDocumento(result.doc_content, result.documento);
                }

                this.limpiarFormulario();
                await this.obtenerUltimoConsecutivo();
            } else {
                throw new Error(result.message || 'Error al guardar la salida');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje(error.message || 'Error al guardar la salida', 'error');
        }
    },

    async actualizarConsecutivo() {
        try {
            const response = await fetch('/api/actualizar_consecutivo_salidas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar consecutivo');
            }

            const inputNumero = document.getElementById('numero');
            if (inputNumero) {
                inputNumero.value = result.nuevoConsecutivo;
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarMensaje('Error al actualizar consecutivo', 'error');
            throw error;
        }
    },

    recopilarDatosFormulario() {
        const items = [];
        document.querySelectorAll('.items-table tbody tr').forEach(row => {
            // Usar desformatearNumero para obtener los valores numéricos correctos
            const cantidad = this.desformatearNumero(row.cells[3].textContent);
            const valor = this.desformatearNumero(row.cells[4].textContent);
            const impoconsumo = this.desformatearNumero(row.cells[5].textContent);
            const ipc = this.desformatearNumero(row.cells[6].textContent);
            const ibua = this.desformatearNumero(row.cells[7].textContent);
            const icui = this.desformatearNumero(row.cells[8].textContent);

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
                Subtotal: subtotal,
                impoconsumo: impoconsumo,
                ipc: ipc,
                imp_ibua: ibua,
                imp_icui: icui
            });
        });

        // Obtener los totales calculados
        const totalesCalculados = {};
        ['total-unidades', 'subtotal', 'total-impoconsumo', 
         'total-icui', 'total-ibua', 'total-ipc', 'total-documento'].forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                totalesCalculados[campo.replace('-', '')] = this.desformatearNumero(elemento.value);
            }
        });

        return {
            salida1: {
                Numero: document.getElementById('numero').value,
                Mes: new Date().toISOString().slice(0, 7).replace('-', ''),
                Anulado: document.getElementById('anulado').checked,
                IdBodega: this.state.bodegaSeleccionada,
                Observaciones: document.getElementById('observaciones').value,
                FechaCreacion: document.getElementById('fecha-creacion').value,
                fecha: document.getElementById('fecha').value,
                IdConsecutivo: document.getElementById('consecutivo').value,
                totalUnidades: totalesCalculados.totalunidades,
                subtotal: totalesCalculados.subtotal,
                totalImpoconsumo: totalesCalculados.totalimpoconsumo,
                totalIcui: totalesCalculados.totalicui,
                totalIbua: totalesCalculados.totalibua,
                totalIpc: totalesCalculados.totalipc,
                totalDocumento: totalesCalculados.totaldocumento
            },
            salidas2: items
        };
    },

    // Funciones de validación y control
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

        // Validar cantidades y stock
        let error = false;
        items.forEach(row => {
            const cantidad = parseFloat(row.cells[3].textContent) || 0;
            if (cantidad <= 0) {
                error = true;
                row.cells[3].classList.add('error');
            }
        });

        if (error) {
            this.mostrarMensaje('Hay productos con cantidades inválidas', 'error');
            return false;
        }

        return true;
    },

    limpiarFormulario() {
        // Limpiar campos principales
        const camposALimpiar = {
            'observaciones': '',
            'fecha': new Date().toISOString().split('T')[0],
            'fecha-creacion': new Date().toISOString().split('T')[0],
            'centro-costos': ''
        };

        Object.entries(camposALimpiar).forEach(([id, valor]) => {
            const campo = document.getElementById(id);
            if (campo) campo.value = valor;
        });

        // Desmarcar checkbox de anulado
        document.getElementById('anulado')?.removeAttribute('checked');

        // Limpiar tabla
        document.querySelector('.items-table tbody').innerHTML = '';

        // Reiniciar totales
        this.state.datosCalculados = {
            totalUnidades: 0,
            subtotal: 0,
            totalImpoconsumo: 0,
            totalIcui: 0,
            totalIbua: 0,
            totalIpc: 0,
            totalDocumento: 0
        };

        this.actualizarCamposTotales();
    },

    // Manejo de interfaz
    actualizarInterfaz() {
        const esModoLectura = this.state.modo === 'lectura';
        
        // Actualizar botones
        document.querySelectorAll('.action-bar button').forEach(btn => {
            if (btn.querySelector('[data-lucide="save"]')) {
                btn.disabled = esModoLectura;
            } else if (btn.querySelector('[data-lucide="plus"]')) {
                btn.disabled = !esModoLectura;
            } else if (btn.querySelector('[data-lucide="edit"]')) {
                btn.disabled = !this.state.salidaActual || !esModoLectura;
            } else if (btn.querySelector('[data-lucide="x"]')) {
                btn.disabled = esModoLectura;
            }
        });

        // Actualizar campos
        document.querySelectorAll('input:not([readonly]), select:not([readonly]), textarea').forEach(campo => {
            campo.disabled = esModoLectura;
        });

        // Mantener algunos campos siempre como readonly
        ['numero', 'fecha-creacion'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.disabled = true;
        });

        // Actualizar tabla
        document.querySelectorAll('.items-table td[contenteditable="true"]').forEach(celda => {
            celda.contentEditable = !esModoLectura;
            celda.classList.toggle('editable', !esModoLectura);
        });

        document.querySelector('.items-table').classList.toggle('modo-lectura', esModoLectura);
    },

    // Manejo de documentos
    async imprimirSalida() {
        try {
            const numero = document.getElementById('numero').value;
            const response = await fetch(`/api/salidas_inventario/${numero}/imprimir`);
            
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
            this.mostrarMensaje('Error al imprimir la salida', 'error');
        }
    },

    descargarDocumento(contenido, nombreArchivo) {
        try {
            const byteCharacters = atob(contenido);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error al descargar el documento:', error);
            this.mostrarMensaje('Error al descargar el documento', 'error');
        }
    },

    // Utilidades
    crearFilaProducto(producto) {
        return `
            <td>${producto.IdReferencia}</td>
            <td>${producto.Referencia}</td>
            <td>${producto.IdUnidad || ''}</td>
            <td contenteditable="true" class="numero cantidad">1</td>
            <td contenteditable="true" class="numero">${producto.PrecioVenta1 || producto.Costo || 0}</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td contenteditable="true" class="numero">0</td>
            <td class="subtotal">${this.formatearMoneda(producto.PrecioVenta1 || producto.Costo || 0)}</td>
            <td>
                <button type="button" class="btn-eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
    },

    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '$ 0,00';
        return '$ ' + this.formatearNumero(valor);
    },

    formatearNumero(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) {
            return '0,00';
        }
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    },

    eliminarProducto(boton) {
        const fila = boton.closest('tr');
        if (fila) {
            fila.remove();
            this.calcularTotales();
            this.mostrarMensaje('Producto eliminado', 'info');
        }
    },

    mostrarMensaje(mensaje, tipo = 'info') {
        const div = document.createElement('div');
        div.className = `mensaje mensaje-${tipo}`;
        div.innerHTML = `
            <div class="mensaje-contenido">${mensaje}</div>
            <button class="mensaje-cerrar">&times;</button>
        `;
        
        document.body.appendChild(div);
        
        const btnCerrar = div.querySelector('.mensaje-cerrar');
        btnCerrar.addEventListener('click', () => div.remove());

        setTimeout(() => div.remove(), 5000);
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    try {
        lucide.createIcons();
        SalidasInventario.init();
    } catch (error) {
        console.error('Error al inicializar:', error);
        alert('Error al inicializar el sistema de salidas de inventario');
    }
});

// Exportar para uso global
window.SalidasInventario = SalidasInventario;