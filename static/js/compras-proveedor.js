// Sistema de Compras a Proveedores
const ComprasProveedor = {
    // Estado del sistema
    state: {
        modo: 'lectura', // 'lectura', 'nuevo', 'edicion'
        compraActual: null,
        proveedor: null,
        items: [],
        consecutivoActual: null,
        bodegaSeleccionada: null,
        modalBusqueda: null,
        productosEncontrados: [],
        datosCalculados: {
            totalUnidades: 0,
            subtotal: 0,
            valorDescuento: 0,
            totalFlete: 0,
            retefuente: 0,
            totalIva: 0,
            reteiva: 0,
            totalIpc: 0,
            reteica: 0,
            totalIbua: 0,
            totalIcui: 0,
            totalDocumento: 0
        }
    },

    // Función debounce para optimizar llamadas
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

    // Inicialización del sistema
    async init() {
        await this.obtenerUltimoConsecutivo();
        try {
            console.log('Iniciando sistema de compras a proveedores...');
            
            // Establecer estado inicial
            this.state = {
                modo: 'lectura',
                compraActual: null,
                proveedor: null,
                items: [],
                consecutivoActual: null,
                bodegaSeleccionada: null,
                modalBusqueda: null,
                productosEncontrados: [],
                datosCalculados: {
                    totalUnidades: 0,
                    subtotal: 0,
                    valorDescuento: 0,
                    totalFlete: 0,
                    retefuente: 0,
                    totalIva: 0,
                    reteiva: 0,
                    totalIpc: 0,
                    reteica: 0,
                    totalIbua: 0,
                    totalIcui: 0,
                    totalDocumento: 0
                }
            };
            
            // Crear modales
            this.crearModalBusquedaProductos();
            this.crearModalBusquedaProveedores();
            console.log('Modales de búsqueda creados');

            // Inicializar event listeners
            this.initializeEventListeners();
            console.log('Event listeners inicializados');

            // Cargar datos iniciales
            await this.cargarDatosIniciales();
            console.log('Datos iniciales cargados');

            // Actualizar interfaz inicial
            this.actualizarInterfaz();
            console.log('Interfaz actualizada');

        } catch (error) {
            console.error('Error durante la inicialización:', error);
            this.mostrarNotificacion('Error al inicializar el sistema', 'error');
        }
    },

    // Inicialización de event listeners
    initializeEventListeners() {
        try {
            // Configuración de botones principales
            const botonesConfig = {
                'btn-nuevo': () => this.iniciarNuevaCompra(),
                'btn-guardar': () => this.guardarCompra(),
                'btn-editar': () => this.habilitarEdicion(),
                'btn-cancelar': () => this.cancelarOperacion(),
                'btn-anular': () => this.anularCompra(),
                'btn-imprimir': () => this.imprimirCompra(),
                'btn-saldos': () => this.mostrarSaldosProveedor(),
                'btn-cerrar': () => window.location.href = '/inventario'
            };

            // Agregar event listeners a botones principales
            Object.entries(botonesConfig).forEach(([id, handler]) => {
                const boton = document.getElementById(id);
                if (boton) {
                    boton.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!boton.disabled) {
                            handler();
                        }
                    });
                    console.log(`Event listener agregado a: ${id}`);
                } else {
                    console.warn(`Botón no encontrado: ${id}`);
                }
            });

            // Event listener para búsqueda de proveedor
            const btnBuscarProveedor = document.querySelector('.input-with-button button');
            if (btnBuscarProveedor) {
                btnBuscarProveedor.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!btnBuscarProveedor.disabled) {
                        this.mostrarBusquedaProveedores();
                    }
                });
            }

            // Event listener para select de bodega
            const selectBodega = document.getElementById('bodega');
            if (selectBodega) {
                selectBodega.addEventListener('change', (e) => {
                    this.state.bodegaSeleccionada = e.target.value;
                    this.actualizarInterfaz();
                });
            }

            // Event listeners para campos que afectan los totales
            ['descuento-porcentaje', 'total-flete'].forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.addEventListener('input', () => this.calcularTotales());
                }
            });

            // Event listener para búsqueda de productos
            const searchInput = document.getElementById('buscar-item');
            if (searchInput) {
                const debouncedSearch = this.debounce((value) => {
                    this.buscarProductos(value);
                }, 300);

                searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
                searchInput.addEventListener('click', () => this.mostrarBusquedaProductos());
            }

            // Event listeners para la tabla de items
            const tablaCuerpo = document.querySelector('.items-table tbody');
            if (tablaCuerpo) {
                // Evento para edición de celdas y eliminación de items
                tablaCuerpo.addEventListener('click', (e) => {
                    if (e.target.matches('td[contenteditable="true"]')) {
                        this.editarCelda(e.target);
                    }
                    const btnEliminar = e.target.closest('.btn-eliminar');
                    if (btnEliminar) {
                        const fila = btnEliminar.closest('tr');
                        if (fila) {
                            fila.remove();
                            this.calcularTotales();
                        }
                    }
                });

                // Evento para cálculo automático en edición
                tablaCuerpo.addEventListener('input', (e) => {
                    if (e.target.matches('td[contenteditable="true"]')) {
                        this.calcularTotales();
                    }
                });
            }

            // Event listeners para teclado
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.modalBusqueda) {
                    this.cerrarModalBusqueda();
                }
                if (e.key === 'Enter' && !e.target.matches('td[contenteditable="true"]')) {
                    this.manejarTeclaEnter(e);
                }
            });

        } catch (error) {
            console.error('Error al inicializar event listeners:', error);
            this.mostrarNotificacion('Error al inicializar controles', 'error');
        }
    },

    // Carga de datos iniciales
    async cargarDatosIniciales() {
        try {
            await Promise.all([
                this.cargarConsecutivos(),
                this.cargarBodegas(),
            ]);

            // Configurar fechas iniciales
            const fechaActual = new Date().toISOString().split('T')[0];
            document.getElementById('fecha-documento').value = fechaActual;
            document.getElementById('fecha-creacion').value = fechaActual;

            await this.obtenerUltimoConsecutivo();
            console.log('Datos iniciales cargados correctamente');
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            throw error;
        }
    },

    mostrarBusquedaProveedores() {
        const modal = document.querySelector('.modal-proveedores');
        if (!modal) {
            console.error('Modal de proveedores no encontrado');
            return;
        }

        // Mostrar el modal
        modal.style.display = 'block';

        // Enfocar el campo de búsqueda
        const inputBusqueda = modal.querySelector('.input-busqueda');
        if (inputBusqueda) {
            inputBusqueda.value = '';
            inputBusqueda.focus();
        }

        // Cargar proveedores iniciales
        this.buscarProveedores('');
    },

    async buscarProveedores(termino = '') {
        try {
            const response = await fetch(`/api/proveedores?buscar=${termino}`);
            if (!response.ok) throw new Error('Error al buscar proveedores');
            
            const proveedores = await response.json();
            this.mostrarResultadosProveedores(proveedores);
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al buscar proveedores', 'error');
        }
    },

    mostrarResultadosProveedores(proveedores) {
        const tbody = document.querySelector('.modal-proveedores tbody');
        if (!tbody) return;

        if (proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se encontraron proveedores</td></tr>';
            return;
        }

        tbody.innerHTML = proveedores.map(p => `
            <tr>
                <td>${p.Nit}</td>
                <td>${p.RazonSocial}</td>
                <td>${p.Ciudad || ''}</td>
                <td>${p.Telefono || ''}</td>
                <td>
                    <button type="button" class="btn btn-small btn-primary"
                            onclick="ComprasProveedor.seleccionarProveedor('${p.Nit}')">
                        Seleccionar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // Cargar consecutivos
    async cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos_compra');
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

    // Cargar bodegas
    async cargarBodegas() {
        try {
            const response = await fetch('/api/bodegas_disponibles');
            if (!response.ok) throw new Error('Error al cargar bodegas');
            
            const bodegas = await response.json();
            const select = document.getElementById('bodega');
            
            if (select) {
                select.innerHTML = '<option value="">Seleccione una bodega</option>' + 
                    bodegas.map(b => 
                        `<option value="${b.IdBodega}">${b.Descripcion}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error al cargar bodegas:', error);
            throw error;
        }
    },

    // Obtener último consecutivo
    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_compras');
            if (!response.ok) throw new Error('Error al obtener el último consecutivo');
            
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
            this.mostrarNotificacion('Error al obtener el consecutivo', 'error');
        }
    },

    // Creación y manejo de modales
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
                    <h3>
                        <i data-lucide="search" class="mr-2"></i>
                        Búsqueda de Productos
                    </h3>
                    <button type="button" class="btn-close" onclick="ComprasProveedor.cerrarModalBusqueda()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" 
                               id="modal-buscar-producto"
                               class="input-busqueda" 
                               placeholder="Escriba para buscar productos por código o descripción..."
                               autocomplete="off">
                    </div>
                    <div class="tabla-productos">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th>Unidad</th>
                                    <th>Stock</th>
                                    <th>Precio</th>
                                    <th>IVA</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="productos-encontrados">
                                <tr>
                                    <td colspan="7" class="sin-resultados">
                                        Escriba para buscar productos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
        
        if (window.lucide) {
            lucide.createIcons();
        }
    
        this.configurarEventosModalProductos(modal);
    },

    crearModalBusquedaProveedores() {
        const modalExistente = document.querySelector('.modal-proveedores');
        if (modalExistente) {
            modalExistente.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal-busqueda modal-proveedores';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Buscar Proveedor</h3>
                    <button type="button" class="btn-cerrar">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" class="input-busqueda" 
                               placeholder="Buscar por NIT o Razón Social...">
                    </div>
                    <div class="tabla-resultados">
                        <table>
                            <thead>
                                <tr>
                                    <th>NIT</th>
                                    <th>Razón Social</th>
                                    <th>Ciudad</th>
                                    <th>Teléfono</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.configurarEventosModalProveedor(modal);
    },

    configurarEventosModalProductos(modal) {
        if (!modal) return;
    
        const input = modal.querySelector('#modal-buscar-producto');
        const btnCerrar = modal.querySelector('.btn-close');
    
        // Configurar búsqueda con debounce
        input.addEventListener('input', this.debounce((e) => {
            this.buscarProductos(e.target.value);
        }, 300));
    
        // Enfocar input al abrir modal
        modal.addEventListener('shown.bs.modal', () => {
            input.focus();
        });
    
        // Cerrar modal
        btnCerrar.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    
        // Evitar cierre al hacer clic en contenido
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    
        // Manejar teclas
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
            }
            if (e.key === 'Enter' && document.activeElement === input) {
                e.preventDefault();
                const primerBoton = modal.querySelector('.btn-seleccionar');
                if (primerBoton) {
                    primerBoton.click();
                }
            }
        });
    },
    
        configurarEventosModalProveedor(modal) {
            const input = modal.querySelector('.input-busqueda');
            const btnCerrar = modal.querySelector('.btn-cerrar');
            const tbody = modal.querySelector('tbody');
    
            input.addEventListener('input', this.debounce(async (e) => {
                const termino = e.target.value.trim();
                if (termino.length < 3) return;
    
                try {
                    const response = await fetch(`/api/proveedores?buscar=${termino}`);
                    const proveedores = await response.json();
    
                    tbody.innerHTML = proveedores.map(p => `
                        <tr>
                            <td>${p.Nit}</td>
                            <td>${p.RazonSocial}</td>
                            <td>${p.Ciudad || ''}</td>
                            <td>${p.Telefono || ''}</td>
                            <td>
                                <button class="btn btn-small btn-primary" 
                                        onclick="ComprasProveedor.seleccionarProveedor('${p.Nit}')">
                                    Seleccionar
                                </button>
                            </td>
                        </tr>
                    `).join('');
                } catch (error) {
                    console.error('Error:', error);
                    this.mostrarNotificacion('Error al buscar proveedores', 'error');
                }
            }, 300));
    
            btnCerrar.addEventListener('click', () => modal.style.display = 'none');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        },
    
        // Funciones de búsqueda y selección
        async buscarProductos(termino = '') {
            if (!this.state.bodegaSeleccionada) {
                this.mostrarNotificacion('Seleccione una bodega primero', 'warning');
                return;
            }
        
            if (!this.state.proveedor) {
                this.mostrarNotificacion('Seleccione un proveedor primero', 'warning');
                return;
            }
        
            try {
                const url = `/api/consulta_inventario?bodega=${this.state.bodegaSeleccionada}&termino=${termino}`;
                const response = await fetch(url);
                
                if (!response.ok) throw new Error('Error al cargar datos de inventario');
                
                const inventario = await response.json();
                
                this.state.productosEncontrados = inventario.map(producto => ({
                    ...producto,
                    Saldo: parseFloat(producto.Saldo || 0)
                }));
        
                this.mostrarResultadosBusqueda();
            } catch (error) {
                console.error('Error:', error);
                this.mostrarNotificacion('Error al buscar productos', 'error');
            }
        },
    
        mostrarResultadosBusqueda() {
            const tbody = document.getElementById('productos-encontrados');
            if (!tbody) return;
        
            if (this.state.productosEncontrados.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="sin-resultados">
                            No se encontraron productos que coincidan con la búsqueda
                        </td>
                    </tr>`;
                return;
            }
        
            tbody.innerHTML = this.state.productosEncontrados.map(producto => {
                const saldo = parseFloat(producto.Saldo) || 0;
                const precio = parseFloat(producto.PrecioVenta1) || 0;
                const iva = parseFloat(producto.IVA) || 0;
        
                return `
                    <tr data-id="${producto.IDReferencia}">
                        <td>${producto.IDReferencia}</td>
                        <td>${producto.Referencia}</td>
                        <td class="text-center">${producto.ID_Unidad || '-'}</td>
                        <td class="text-end stock-column">${this.formatearNumero(saldo)}</td>
                        <td class="text-end">${this.formatearMoneda(precio)}</td>
                        <td class="text-end">${iva}%</td>
                        <td class="text-center">
                            <button type="button" 
                                    class="btn btn-primary btn-sm btn-seleccionar" 
                                    data-id="${producto.IDReferencia}">
                                <i data-lucide="plus-circle" class="mr-1"></i>
                                Seleccionar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        
            // Actualizar íconos
            if (window.lucide) {
                lucide.createIcons();
            }
        
            // Agregar event listeners a los botones de selección
            tbody.querySelectorAll('.btn-seleccionar').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const idReferencia = btn.dataset.id;
                    this.agregarProductoACompra(idReferencia);
                });
            });
        },
    
        async seleccionarProveedor(nit) {
            try {
                this.mostrarSpinner('Cargando datos del proveedor...');
                
                const response = await fetch(`/api/proveedores/${nit}`);
                if (!response.ok) {
                    throw new Error('Error al obtener datos del proveedor');
                }
                
                const proveedor = await response.json();
                
                // Actualizar el estado con los datos del proveedor
                this.state.proveedor = proveedor;
                
                // Actualizar el campo visual del proveedor
                const campoProveedor = document.getElementById('proveedor');
                if (campoProveedor) {
                    campoProveedor.value = `${proveedor.Nit} - ${proveedor.RazonSocial}`;
                }
                
                // Actualizar la interfaz si es necesario
                this.actualizarInterfaz();
                
                // Cerrar el modal de proveedores
                const modal = document.querySelector('.modal-proveedores');
                if (modal) {
                    modal.style.display = 'none';
                }
                
                this.mostrarNotificacion('Proveedor seleccionado correctamente', 'success');
            } catch (error) {
                console.error('Error:', error);
                this.mostrarNotificacion('Error al seleccionar el proveedor', 'error');
            } finally {
                this.ocultarSpinner();
            }
        },
    
        // Funciones de gestión de productos en la compra
        agregarProductoACompra(idReferencia) {
            console.log('Agregando producto:', idReferencia); // Debug
        
            const producto = this.state.productosEncontrados.find(p => p.IDReferencia === idReferencia);
            if (!producto) {
                console.error('Producto no encontrado:', idReferencia);
                return;
            }
        
            const tbody = document.querySelector('.items-table tbody');
            const filaExistente = tbody?.querySelector(`tr[data-id="${idReferencia}"]`);
            
            if (filaExistente) {
                const cantidadCell = filaExistente.querySelector('[data-tipo="cantidad"]');
                if (cantidadCell) {
                    const cantidadActual = parseFloat(cantidadCell.textContent) || 0;
                    cantidadCell.textContent = this.formatearNumero(cantidadActual + 1);
                    this.calcularTotalesFila(filaExistente);
                }
            } else {
                const tr = document.createElement('tr');
                tr.dataset.id = idReferencia;
                tr.innerHTML = this.crearFilaProducto(producto);
                tbody?.appendChild(tr);
            }
        
            // Cerrar el modal
            const modal = document.querySelector('.modal-busqueda-productos');
            if (modal) {
                modal.style.display = 'none';
            }
        
            // Recalcular totales
            this.calcularTotales();
        },
    
        crearFilaProducto(producto) {
            const precioSinIva = producto.PrecioVenta1 / (1 + (parseFloat(producto.IVA || 0) / 100));
            
            return `
                <td>${producto.IDReferencia}</td>
                <td>${producto.Referencia}</td>
                <td>${producto.ID_Unidad || ''}</td>
                <td contenteditable="true" class="numero" data-tipo="cantidad">1</td>
                <td contenteditable="true" class="numero" data-tipo="valorConIva">
                    ${this.formatearNumero(producto.PrecioVenta1)}
                </td>
                <td contenteditable="true" class="numero" data-tipo="valorSinIva">
                    ${this.formatearNumero(precioSinIva)}
                </td>
                <td contenteditable="true" class="numero" data-tipo="iva">${producto.IVA || 0}</td>
                <td contenteditable="true" class="numero" data-tipo="descuento">0</td>
                <td contenteditable="true" class="numero" data-tipo="ipc">0</td>
                <td contenteditable="true" class="numero" data-tipo="icui">0</td>
                <td contenteditable="true" class="numero" data-tipo="ibua">0</td>
                <td contenteditable="false" data-tipo="numOrden"></td>
                <td contenteditable="false" data-tipo="numEntrada"></td>
                <td contenteditable="true" data-tipo="centroCosto"></td>
                <td contenteditable="true" class="numero" data-tipo="precieve">
                    ${this.formatearNumero(producto.PrecioVenta1)}
                </td>
                <td contenteditable="true" class="numero" data-tipo="margen">0</td>
                <td class="subtotal">${this.formatearMoneda(producto.PrecioVenta1)}</td>
                <td>
                    <button type="button" class="btn btn-small btn-danger btn-eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;
        },
    
        calcularTotalesFila(fila) {
            try {
                // Obtener valores usando desformatearNumero
                const cantidad = this.desformatearNumero(fila.querySelector('[data-tipo="cantidad"]').textContent);
                const valorConIva = this.desformatearNumero(fila.querySelector('[data-tipo="valorConIva"]').textContent);
                const iva = this.desformatearNumero(fila.querySelector('[data-tipo="iva"]').textContent);
                const descuento = this.desformatearNumero(fila.querySelector('[data-tipo="descuento"]').textContent);
                
                console.log('Valores de fila:', { cantidad, valorConIva, iva, descuento }); // Debug
                
                // Calcular valor sin IVA
                const valorSinIva = valorConIva / (1 + (iva / 100));
                
                // Actualizar campo de valor sin IVA
                const celdaValorSinIva = fila.querySelector('[data-tipo="valorSinIva"]');
                if (celdaValorSinIva) {
                    celdaValorSinIva.textContent = this.formatearNumero(valorSinIva);
                }
        
                // Calcular subtotal considerando cantidad y valor con IVA
                const subtotalSinDescuento = cantidad * valorConIva;
                const subtotal = subtotalSinDescuento * (1 - (descuento / 100));
                
                // Actualizar subtotal formateado
                const celdaSubtotal = fila.querySelector('.subtotal');
                if (celdaSubtotal) {
                    celdaSubtotal.textContent = this.formatearMoneda(subtotal);
                }
    
                console.log('Subtotales calculados:', { 
                    subtotalSinDescuento, 
                    subtotal, 
                    valorSinIva 
                }); // Debug
                
                return {
                    cantidad,
                    valorConIva,
                    valorSinIva,
                    iva,
                    descuento,
                    subtotal
                };
            } catch (error) {
                console.error('Error al calcular totales de fila:', error);
                return {
                    cantidad: 0,
                    valorConIva: 0,
                    valorSinIva: 0,
                    iva: 0,
                    descuento: 0,
                    subtotal: 0
                };
            }
        },
    
        // Funciones de cálculo de totales
        calcularTotales() {
            const totales = {
                totalUnidades: 0,
                subtotal: 0,
                valorDescuento: 0,
                totalFlete: this.desformatearNumero(document.getElementById('total-flete').value),
                totalIva: 0,
                totalIpc: 0,
                totalIcui: 0,
                totalIbua: 0
            };
    
            try {
                document.querySelectorAll('.items-table tbody tr').forEach(fila => {
                    const valores = this.calcularTotalesFila(fila);
                    console.log('Valores por fila:', valores); // Debug
                    
                    // Acumular totales
                    totales.totalUnidades += valores.cantidad;
                    totales.subtotal += valores.cantidad * valores.valorConIva; // Usar valor con IVA
                    totales.valorDescuento += (valores.cantidad * valores.valorConIva) * (valores.descuento / 100);
                    
                    // Calcular IVA sobre el valor sin descuento
                    const baseIva = valores.cantidad * valores.valorSinIva;
                    totales.totalIva += baseIva * (valores.iva / 100);
                    
                    // Calcular otros impuestos sobre el subtotal con descuento
                    const subtotalConDescuento = valores.subtotal;
                    const ipc = this.desformatearNumero(fila.querySelector('[data-tipo="ipc"]').textContent);
                    const icui = this.desformatearNumero(fila.querySelector('[data-tipo="icui"]').textContent);
                    const ibua = this.desformatearNumero(fila.querySelector('[data-tipo="ibua"]').textContent);
                    
                    totales.totalIpc += subtotalConDescuento * (ipc / 100);
                    totales.totalIcui += subtotalConDescuento * (icui / 100);
                    totales.totalIbua += subtotalConDescuento * (ibua / 100);
                });
    
                console.log('Totales calculados:', totales); // Debug
    
                // Calcular descuento general
                const descuentoPorcentaje = this.desformatearNumero(document.getElementById('descuento-porcentaje').value);
                const descuentoGeneral = totales.subtotal * (descuentoPorcentaje / 100);
    
                // Calcular retenciones
                const retefuente = this.calcularRetefuente(totales.subtotal);
                const reteiva = this.calcularReteIVA(totales.totalIva);
                const reteica = this.calcularReteICA(totales.subtotal);
    
                // Calcular total documento
                const totalDocumento = totales.subtotal - totales.valorDescuento - descuentoGeneral +
                                     totales.totalIva + totales.totalIpc + totales.totalIcui + 
                                     totales.totalIbua + totales.totalFlete - 
                                     retefuente - reteiva - reteica;
    
                this.actualizarCamposTotales({
                    ...totales,
                    descuentoGeneral,
                    retefuente,
                    reteiva,
                    reteica,
                    totalDocumento
                });
    
            } catch (error) {
                console.error('Error al calcular totales:', error);
                this.mostrarNotificacion('Error al calcular totales', 'error');
            }
        }, 
    
        actualizarCamposTotales(totales) {
            try {
                const campos = {
                    'total-unidades': totales.totalUnidades,
                    'subtotal': totales.subtotal,
                    'valor-descuento': totales.valorDescuento + totales.descuentoGeneral,
                    'total-flete': totales.totalFlete,
                    'retefuente': totales.retefuente,
                    'total-iva': totales.totalIva,
                    'reteiva': totales.reteiva,
                    'total-ipc': totales.totalIpc,
                    'reteica': totales.reteica,
                    'total-ibua': totales.totalIbua,
                    'total-icui': totales.totalIcui,
                    'total-documento': totales.totalDocumento
                };
    
                Object.entries(campos).forEach(([id, valor]) => {
                    const campo = document.getElementById(id);
                    if (campo) {
                        campo.value = this.formatearNumero(valor);
                        console.log(`Campo ${id}:`, valor, '→', campo.value); // Debug
                    }
                });
    
                this.state.datosCalculados = totales;
            } catch (error) {
                console.error('Error al actualizar campos totales:', error);
                this.mostrarNotificacion('Error al actualizar totales', 'error');
            }
        },
    
        // Funciones de retenciones
        calcularRetefuente(baseGravable) {
            if (!this.state.proveedor) return 0;
            const tarifaRetefuente = this.state.proveedor.TarifaRetefuente || 2.5;
            return baseGravable * (tarifaRetefuente / 100);
        },
    
        calcularReteIVA(iva) {
            if (!this.state.proveedor) return 0;
            const tarifaReteiva = this.state.proveedor.TarifaReteIVA || 15;
            return iva * (tarifaReteiva / 100);
        },
    
        calcularReteICA(baseGravable) {
            if (!this.state.proveedor || !this.state.proveedor.Ciudad) return 0;
            const tarifaReteica = this.state.proveedor.Ciudad.TarifaReteICA || 0;
            return baseGravable * (tarifaReteica / 1000);
        },
    
    // Funciones de gestión del documento
    async iniciarNuevaCompra() {
        await this.prepararNuevoDocumento();
        try {
            // Verificar si hay cambios pendientes
            if (this.state.modo !== 'lectura') {
                const confirmar = await Swal.fire({
                    title: '¿Está seguro?',
                    text: 'Hay cambios sin guardar que se perderán',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, continuar',
                    cancelButtonText: 'No, cancelar'
                });

                if (!confirmar.isConfirmed) return;
            }

            // Cambiar el modo
            this.state.modo = 'nuevo';
            
            // Limpiar estados
            this.state.compraActual = null;
            this.state.proveedor = null;
            this.state.items = [];
            
            // Obtener nuevo consecutivo
            await this.obtenerUltimoConsecutivo();
            
            // Limpiar formulario
            this.limpiarFormulario();
            
            // Habilitar campos
            this.habilitarCampos();
            
            // Actualizar interfaz
            this.actualizarInterfaz();
            
            this.mostrarNotificacion('Nueva compra iniciada', 'success');
        } catch (error) {
            console.error('Error al iniciar nueva compra:', error);
            this.mostrarNotificacion('Error al iniciar nueva compra', 'error');
        }
    },

    habilitarCampos() {
        try {
            // Mapeo de campos y su estado según el modo
            const campos = {
                general: [
                    'numero-factura',
                    'proveedor',
                    'bodega',
                    'centro-costos',
                    'fecha-documento',
                    'observaciones',
                    'descuento-porcentaje',
                    'total-flete'
                ],
                soloLectura: [
                    'numero',
                    'consecutivo',
                    'fecha-creacion',
                    'total-unidades',
                    'subtotal',
                    'valor-descuento',
                    'retefuente',
                    'total-iva',
                    'reteiva',
                    'total-ipc',
                    'reteica',
                    'total-ibua',
                    'total-icui',
                    'total-documento'
                ],
                botones: {
                    'btn-nuevo': true,
                    'btn-guardar': this.state.modo !== 'lectura',
                    'btn-editar': this.state.modo === 'lectura' && this.state.compraActual,
                    'btn-cancelar': this.state.modo !== 'lectura',
                    'btn-anular': this.state.modo === 'lectura' && this.state.compraActual,
                    'btn-imprimir': true,
                    'btn-saldos': true,
                    'btn-cerrar': true
                }
            };

            // Habilitar/deshabilitar campos generales
            campos.general.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.disabled = this.state.modo === 'lectura';
                    campo.classList.toggle('disabled', this.state.modo === 'lectura');
                }
            });

            // Configurar campos de solo lectura
            campos.soloLectura.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.disabled = true;
                    campo.classList.add('readonly');
                }
            });

            // Configurar botones
            Object.entries(campos.botones).forEach(([id, habilitado]) => {
                const boton = document.getElementById(id);
                if (boton) {
                    boton.disabled = !habilitado;
                    boton.classList.toggle('disabled', !habilitado);
                }
            });

            // Habilitar/deshabilitar botón de búsqueda de proveedor
            const btnBuscarProveedor = document.querySelector('.input-with-button button');
            if (btnBuscarProveedor) {
                btnBuscarProveedor.disabled = this.state.modo === 'lectura';
                btnBuscarProveedor.classList.toggle('disabled', this.state.modo === 'lectura');
            }

            // Habilitar/deshabilitar búsqueda de productos
            const buscarItem = document.getElementById('buscar-item');
            if (buscarItem) {
                buscarItem.disabled = this.state.modo === 'lectura';
                buscarItem.classList.toggle('disabled', this.state.modo === 'lectura');
            }

            // Configurar celdas editables en la tabla de productos
            const celdasEditables = document.querySelectorAll('.items-table td[contenteditable]');
            celdasEditables.forEach(celda => {
                celda.contentEditable = this.state.modo !== 'lectura';
                celda.classList.toggle('editable', this.state.modo !== 'lectura');
            });

            // Configurar botones de eliminación en la tabla
            const botonesEliminar = document.querySelectorAll('.items-table .btn-eliminar');
            botonesEliminar.forEach(boton => {
                boton.disabled = this.state.modo === 'lectura';
                boton.classList.toggle('disabled', this.state.modo === 'lectura');
            });

            console.log(`Campos habilitados según modo: ${this.state.modo}`);
        } catch (error) {
            console.error('Error al habilitar campos:', error);
            this.mostrarNotificacion('Error al habilitar campos del formulario', 'error');
        }
    },

    async guardarCompra() {
        if (!this.validarCompra()) return;

        try {
            const datosCompra = this.recopilarDatosCompra();
            
            // Verificar los valores antes de enviar
            datosCompra.compras2.forEach(item => {
                const subtotalEsperado = item.Cantidad * item.Valor;
                console.log(`Item ${item.IdReferencia}:`, {
                    cantidad: item.Cantidad,
                    valor: item.Valor,
                    subtotalCalculado: subtotalEsperado,
                    subtotalGuardado: item.Subtotal
                });
            });

            this.mostrarSpinner('Guardando compra...');
            
            const response = await fetch('/api/guardar_compra', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosCompra)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la compra');
            }

            const resultado = await response.json();
            
            if (resultado.success) {
                await this.actualizarConsecutivo();
                
                Swal.fire({
                    title: '¡Compra guardada!',
                    text: 'La compra se ha guardado exitosamente',
                    icon: 'success',
                    confirmButtonText: 'Aceptar'
                }).then(() => {
                    this.iniciarNuevaCompra();
                });
            } else {
                throw new Error(resultado.message || 'Error al guardar la compra');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al guardar la compra',
                icon: 'error'
            });
        } finally {
            this.ocultarSpinner();
        }
    },

    async anularCompra() {
        if (!this.state.compraActual) {
            this.mostrarNotificacion('No hay una compra seleccionada para anular', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: 'Esta acción anulará la compra y no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, anular',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const response = await fetch(`/api/anular_compra/${this.state.consecutivoActual}`, {
                        method: 'POST'
                    });
                    
                    if (!response.ok) throw new Error('Error al anular la compra');
                    
                    return await response.json();
                } catch (error) {
                    Swal.showValidationMessage(`Error: ${error.message}`);
                }
            }
        });

        if (result.isConfirmed) {
            this.mostrarNotificacion('Compra anulada exitosamente', 'success');
            this.iniciarNuevaCompra();
        }
    },

    async imprimirCompra(numero = this.state.consecutivoActual) {
        if (!numero) {
            this.mostrarNotificacion('No hay una compra para imprimir', 'warning');
            return;
        }

        try {
            this.mostrarSpinner('Generando documento...');
            
            const response = await fetch(`/api/compras/${numero}/imprimir`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf'
                }
            });

            if (!response.ok) throw new Error('Error al generar el documento');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const ventanaImpresion = window.open(url);
            
            ventanaImpresion.onload = () => {
                ventanaImpresion.print();
                setTimeout(() => {
                    ventanaImpresion.close();
                    window.URL.revokeObjectURL(url);
                }, 100);
            };
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al imprimir la compra', 'error');
        } finally {
            this.ocultarSpinner();
        }
    },

    async cargarCompra(numeroCompra) {
        try {
            this.mostrarSpinner('Cargando compra...');
            
            const response = await fetch(`/api/compras/${numeroCompra}`);
            if (!response.ok) throw new Error('Error al cargar la compra');
            
            const compra = await response.json();
            
            // Cargar datos principales
            this.state.compraActual = compra;
            this.state.proveedor = compra.proveedor;
            this.state.bodegaSeleccionada = compra.IdBodega;
            
            // Cargar campos del formulario
            document.getElementById('numero').value = compra.Numero;
            document.getElementById('numero-factura').value = compra.NumFactura;
            document.getElementById('proveedor').value = `${compra.proveedor.Nit} - ${compra.proveedor.RazonSocial}`;
            document.getElementById('bodega').value = compra.IdBodega;
            document.getElementById('centro-costos').value = compra.IdCentroCosto;
            document.getElementById('fecha-documento').value = compra.Fecha;
            document.getElementById('fecha-creacion').value = compra.FechaCreacion;
            document.getElementById('observaciones').value = compra.Observaciones;
            document.getElementById('descuento-porcentaje').value = compra.descuento || 0;
            document.getElementById('total-flete').value = compra.flete || 0;
            
            // Cargar items
            const tbody = document.querySelector('.items-table tbody');
            tbody.innerHTML = '';
            
            compra.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.dataset.id = item.IdReferencia;
                tr.innerHTML = this.crearFilaProductoExistente(item);
                tbody.appendChild(tr);
            });

            // Recalcular totales
            this.calcularTotales();
            
            // Actualizar interfaz
            this.state.modo = 'lectura';
            this.actualizarInterfaz();
            
            this.mostrarNotificacion('Compra cargada exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al cargar la compra', 'error');
        } finally {
            this.ocultarSpinner();
        }
    },

    actualizarInterfaz() {
        try {
            const esModoLectura = this.state.modo === 'lectura';
            
            // Habilitar/deshabilitar campos según el modo
            this.habilitarCampos();
            
            // Actualizar estado visual de los campos según el modo
            document.querySelectorAll('input, select, textarea').forEach(elemento => {
                if (!elemento.classList.contains('no-disable')) {
                    elemento.disabled = esModoLectura;
                    elemento.classList.toggle('disabled', esModoLectura);
                }
            });

            // Actualizar estado de los botones
            const estadoBotones = {
                'btn-nuevo': true,
                'btn-guardar': !esModoLectura,
                'btn-editar': esModoLectura && this.state.compraActual,
                'btn-cancelar': !esModoLectura,
                'btn-anular': esModoLectura && this.state.compraActual,
                'btn-imprimir': true,
                'btn-saldos': true,
                'btn-cerrar': true
            };

            Object.entries(estadoBotones).forEach(([id, habilitado]) => {
                const boton = document.getElementById(id);
                if (boton) {
                    boton.disabled = !habilitado;
                    boton.classList.toggle('disabled', !habilitado);
                }
            });

            // Actualizar tabla de items
            const tabla = document.querySelector('.items-table');
            if (tabla) {
                tabla.classList.toggle('modo-lectura', esModoLectura);
                tabla.querySelectorAll('td[contenteditable]').forEach(celda => {
                    celda.contentEditable = !esModoLectura;
                    celda.classList.toggle('editable', !esModoLectura);
                });
            }

            // Actualizar íconos de Lucide
            if (window.lucide) {
                lucide.createIcons();
            }

            console.log('Interfaz actualizada según modo:', this.state.modo);
        } catch (error) {
            console.error('Error al actualizar interfaz:', error);
            this.mostrarNotificacion('Error al actualizar la interfaz', 'error');
        }
    },

    crearFilaProductoExistente(item) {
        return `
            <td>${item.IdReferencia}</td>
            <td>${item.Descripcion}</td>
            <td>${item.idunidad || ''}</td>
            <td contenteditable="true" class="numero" data-tipo="cantidad">${item.Cantidad}</td>
            <td contenteditable="true" class="numero" data-tipo="valorConIva">
                ${this.formatearNumero(item.Valor * (1 + item.IVA/100))}
            </td>
            <td contenteditable="true" class="numero" data-tipo="valorSinIva">
                ${this.formatearNumero(item.Valor)}
            </td>
            <td contenteditable="true" class="numero" data-tipo="iva">${item.IVA}</td>
            <td contenteditable="true" class="numero" data-tipo="descuento">${item.Descuento}</td>
            <td contenteditable="true" class="numero" data-tipo="ipc">${item.ipc || 0}</td>
            <td contenteditable="true" class="numero" data-tipo="icui">${item.imp_icui || 0}</td>
            <td contenteditable="true" class="numero" data-tipo="ibua">${item.imp_ibua || 0}</td>
            <td contenteditable="false" data-tipo="numOrden">${item.NumOrdenCompra || ''}</td>
            <td contenteditable="false" data-tipo="numEntrada">${item.NumEntradaCia || ''}</td>
            <td contenteditable="true" data-tipo="centroCosto">${item.IdCentroCosto || ''}</td>
            <td contenteditable="true" class="numero" data-tipo="precieve">
                ${this.formatearNumero(item.precioventa1)}
            </td>
            <td contenteditable="true" class="numero" data-tipo="margen">${item.margen || 0}</td>
            <td class="subtotal">${this.formatearMoneda(item.Cantidad * item.Valor)}</td>
            <td>
                <button type="button" class="btn btn-small btn-danger btn-eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
    },

    // Funciones de utilidad
    limpiarFormulario() {
        try {
            // Limpiar campos de texto
            const camposTexto = [
                'numero-factura',
                'proveedor',
                'observaciones'
            ];

            camposTexto.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) campo.value = '';
            });

            // Restablecer selects
            document.getElementById('bodega').value = '';
            document.getElementById('centro-costos').value = '';

            // Establecer fechas actuales
            const fechaActual = new Date().toISOString().split('T')[0];
            document.getElementById('fecha-documento').value = fechaActual;
            document.getElementById('fecha-creacion').value = fechaActual;

            // Limpiar campos numéricos
            const camposNumericos = [
                'total-unidades',
                'descuento-porcentaje',
                'subtotal',
                'valor-descuento',
                'total-flete',
                'retefuente',
                'total-iva',
                'reteiva',
                'total-ipc',
                'reteica',
                'total-ibua',
                'total-icui',
                'total-documento'
            ];

            camposNumericos.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) campo.value = '0.00';
            });

            // Limpiar tabla de items
            const tbody = document.querySelector('.items-table tbody');
            if (tbody) tbody.innerHTML = '';

            console.log('Formulario limpiado correctamente');
        } catch (error) {
            console.error('Error al limpiar formulario:', error);
            throw error;
        }
    },

    validarCompra() {
        if (!this.state.proveedor) {
            this.mostrarNotificacion('Debe seleccionar un proveedor', 'warning');
            return false;
        }

        if (!this.state.bodegaSeleccionada) {
            this.mostrarNotificacion('Debe seleccionar una bodega', 'warning');
            return false;
        }

        const numFactura = document.getElementById('numero-factura').value;
        if (!numFactura) {
            this.mostrarNotificacion('Debe ingresar el número de factura del proveedor', 'warning');
            return false;
        }

        const items = document.querySelectorAll('.items-table tbody tr');
        if (items.length === 0) {
            this.mostrarNotificacion('Debe agregar al menos un producto', 'warning');
            return false;
        }

        let errores = [];
        items.forEach((fila, index) => {
            const cantidad = parseFloat(fila.querySelector('[data-tipo="cantidad"]').textContent);
            const valor = parseFloat(fila.querySelector('[data-tipo="valorConIva"]').textContent);
            
            if (!cantidad || cantidad <= 0) {
                errores.push(`Fila ${index + 1}: La cantidad debe ser mayor a 0`);
            }
            if (!valor || valor <= 0) {
                errores.push(`Fila ${index + 1}: El valor debe ser mayor a 0`);
            }
        });

        if (errores.length > 0) {
            Swal.fire({
                title: 'Validación',
                html: errores.join('<br>'),
                icon: 'warning'
            });
            return false;
        }

        return true;
    },

    recopilarDatosCompra() {
        try {
            const items = [];
            document.querySelectorAll('.items-table tbody tr').forEach(fila => {
                // Usar desformatearNumero para obtener los valores numéricos correctos
                const cantidad = this.desformatearNumero(fila.querySelector('[data-tipo="cantidad"]').textContent);
                const valorConIva = this.desformatearNumero(fila.querySelector('[data-tipo="valorConIva"]').textContent);
                const valorSinIva = this.desformatearNumero(fila.querySelector('[data-tipo="valorSinIva"]').textContent);
                const iva = this.desformatearNumero(fila.querySelector('[data-tipo="iva"]').textContent);
                const descuento = this.desformatearNumero(fila.querySelector('[data-tipo="descuento"]').textContent);
                const ipc = this.desformatearNumero(fila.querySelector('[data-tipo="ipc"]').textContent);
                const icui = this.desformatearNumero(fila.querySelector('[data-tipo="icui"]').textContent);
                const ibua = this.desformatearNumero(fila.querySelector('[data-tipo="ibua"]').textContent);
                const precieve = this.desformatearNumero(fila.querySelector('[data-tipo="precieve"]').textContent);
                const margen = this.desformatearNumero(fila.querySelector('[data-tipo="margen"]').textContent);

                // Calcular subtotal correctamente
                const subtotal = cantidad * valorSinIva;

                items.push({
                    ID: `${this.state.consecutivoActual}_${fila.dataset.id}_${Date.now()}`,
                    Numero: this.state.consecutivoActual,
                    IdReferencia: fila.dataset.id,
                    Descripcion: fila.cells[1].textContent,
                    idunidad: fila.cells[2].textContent,
                    Cantidad: cantidad,
                    Valor: valorSinIva, // Guardar el valor sin IVA
                    ValorConIva: valorConIva, // Añadir el valor con IVA
                    Subtotal: subtotal, // Guardar el subtotal calculado
                    IVA: iva,
                    Descuento: descuento,
                    NumOrdenCompra: fila.querySelector('[data-tipo="numOrden"]')?.textContent || '',
                    NumEntradaCia: fila.querySelector('[data-tipo="numEntrada"]')?.textContent || '',
                    IdCentroCosto: fila.querySelector('[data-tipo="centroCosto"]')?.textContent || '',
                    precioventa1: precieve,
                    margen: margen,
                    ipc: ipc,
                    imp_ibua: ibua,
                    imp_icui: icui
                });
            });

            const usuarioActual = 'MIG'; // Usar un usuario válido que exista en la base de datos

            // Obtener los totales usando desformatearNumero
            const datosCompra = {
                compra1: {
                    Numero: this.state.consecutivoActual,
                    Mes: new Date().toISOString().slice(0, 7).replace('-', ''),
                    Anulado: false,
                    Fecha: document.getElementById('fecha-documento').value,
                    FechaCreacion: document.getElementById('fecha-creacion').value,
                    fechamodificacion: new Date().toISOString(),
                    Observaciones: document.getElementById('observaciones').value,
                    IdUsuario: usuarioActual, // Usar el usuario válido
                    IdBodega: this.state.bodegaSeleccionada,
                    Nit: this.state.proveedor.Nit,
                    NumFactura: document.getElementById('numero-factura').value,
                    IdCentroCosto: document.getElementById('centro-costos').value,
                    IdConsecutivo: document.getElementById('consecutivo').value,
                    descuento: this.desformatearNumero(document.getElementById('descuento-porcentaje').value),
                    porcretefuente: this.state.proveedor?.TarifaRetefuente || 0,
                    retefuente: this.desformatearNumero(document.getElementById('retefuente').value),
                    reteica: this.desformatearNumero(document.getElementById('reteica').value),
                    reteiva: this.desformatearNumero(document.getElementById('reteiva').value),
                    total: this.desformatearNumero(document.getElementById('total-documento').value),
                    totaliva: this.desformatearNumero(document.getElementById('total-iva').value),
                    subtotal: this.desformatearNumero(document.getElementById('subtotal').value),
                    totaldescuento: this.desformatearNumero(document.getElementById('valor-descuento').value),
                    flete: this.desformatearNumero(document.getElementById('total-flete').value),
                    totalipc: this.desformatearNumero(document.getElementById('total-ipc').value),
                    total_ibua: this.desformatearNumero(document.getElementById('total-ibua').value),
                    total_icui: this.desformatearNumero(document.getElementById('total-icui').value),
                    // Valores por defecto para campos requeridos
                    tipoempresa: 1,
                    tipoproveedor: 1,
                    calculareteiva: false,
                    calculareteica: false,
                    porcuotas: false,
                    transmitido: false,
                    cantidadmetaldisponible: 0,
                    totalcantidadmetal: 0,
                    topemaximo: 0,
                    acumulado: 0,
                    totalcompras: 0,
                    valorindustriacomercio: 0
                },
                compras2: items
            };

            // Log para verificar los valores antes de enviar
            console.log('Datos a guardar:', JSON.stringify(datosCompra, null, 2));

            return datosCompra;
        } catch (error) {
            console.error('Error al recopilar datos:', error);
            this.mostrarNotificacion('Error al recopilar los datos de la compra', 'error');
            throw error;
        }
    },

    async mostrarSaldosProveedor() {
        if (!this.state.proveedor) {
            this.mostrarNotificacion('Seleccione un proveedor primero', 'warning');
            return;
        }

        try {
            this.mostrarSpinner('Consultando saldos...');
            
            const response = await fetch(`/api/proveedores/${this.state.proveedor.Nit}/saldos`);
            const datos = await response.json();

            const contenido = `
                <div class="saldos-proveedor">
                    <h3>Saldos de ${this.state.proveedor.RazonSocial}</h3>
                    <div class="saldo-item">
                        <span>Saldo actual:</span>
                        <span>${this.formatearMoneda(datos.saldoActual)}</span>
                    </div>
                    <div class="saldo-item">
                        <span>Facturas vencidas:</span>
                        <span>${datos.facturasVencidas}</span>
                    </div>
                    <div class="saldo-item">
                        <span>Valor vencido:</span>
                        <span>${this.formatearMoneda(datos.valorVencido)}</span>
                    </div>
                    <div class="saldo-item">
                        <span>Cupo disponible:</span>
                        <span>${this.formatearMoneda(datos.cupoDisponible)}</span>
                    </div>
                </div>
            `;

            Swal.fire({
                title: 'Saldos del Proveedor',
                html: contenido,
                width: 600,
                showCloseButton: true,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al consultar saldos', 'error');
        } finally {
            this.ocultarSpinner();
        }
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
            celda.textContent = valor.toString();
            celda.select();
            // Guardar el valor original para comparación
            celda.dataset.valorOriginal = valor.toString();
        };

        this._handleBlur = () => {
            try {
                const tipo = celda.dataset.tipo;
                let valor = this.desformatearNumero(celda.textContent);
                let valorOriginal = parseFloat(celda.dataset.valorOriginal || '0');

                // Si el valor no cambió, mantener el valor original
                if (celda.textContent.trim() === celda.dataset.valorOriginal) {
                    valor = valorOriginal;
                }

                console.log('Valor antes de formatear:', valor); // Debug

                switch (tipo) {
                    case 'cantidad':
                        valor = Math.round(valor);
                        if (valor <= 0) {
                            this.mostrarNotificacion('La cantidad debe ser mayor a 0', 'warning');
                            valor = 1;
                        }
                        celda.textContent = valor.toString();
                        break;

                    case 'valorConIva':
                    case 'valorSinIva':
                        if (valor < 0) {
                            this.mostrarNotificacion('El valor no puede ser negativo', 'warning');
                            valor = 0;
                        }
                        
                        // Formatear el valor manteniendo los miles
                        celda.textContent = this.formatearNumero(valor);

                        // Si es valor con IVA, actualizar el valor sin IVA
                        if (tipo === 'valorConIva') {
                            const iva = this.desformatearNumero(celda.parentElement.querySelector('[data-tipo="iva"]').textContent) || 0;
                            const valorSinIva = valor / (1 + (iva / 100));
                            const celdaValorSinIva = celda.parentElement.querySelector('[data-tipo="valorSinIva"]');
                            if (celdaValorSinIva) {
                                celdaValorSinIva.textContent = this.formatearNumero(valorSinIva);
                            }
                        }
                        break;

                    case 'iva':
                    case 'descuento':
                    case 'ipc':
                    case 'icui':
                    case 'ibua':
                        // Para porcentajes, validar rango 0-100
                        if (valor < 0 || valor > 100) {
                            this.mostrarNotificacion('El porcentaje debe estar entre 0 y 100', 'warning');
                            valor = 0;
                        }
                        celda.textContent = this.formatearNumero(valor);
                        break;

                    default:
                        celda.textContent = this.formatearNumero(valor);
                }

                console.log('Valor después de formatear:', celda.textContent); // Debug
                this.calcularTotales();
                
            } catch (error) {
                console.error('Error al procesar valor:', error);
                celda.textContent = this.formatearNumero(0);
                this.mostrarNotificacion('Error al procesar el valor', 'error');
            }
        };

        this._handleKeypress = (e) => {
            // Permitir: números, punto decimal, coma y teclas de control
            if (!/[\d.,]/.test(e.key) && !e.ctrlKey) {
                e.preventDefault();
                return;
            }

            // Prevenir múltiples separadores decimales
            const contenidoActual = celda.textContent;
            if ((e.key === '.' || e.key === ',') && 
                (contenidoActual.includes('.') || contenidoActual.includes(','))) {
                e.preventDefault();
            }
        };

        this._handlePaste = (e) => {
            e.preventDefault();
            let texto = (e.clipboardData || window.clipboardData).getData('text');
            
            // Limpiar el texto pegado manteniendo números y separadores
            texto = texto.replace(/[^\d.,]/g, '').trim();
            
            if (texto) {
                // Asegurarse de que solo haya un separador decimal
                const partes = texto.split(/[.,]/);
                if (partes.length > 2) {
                    texto = partes[0] + ',' + partes[1];
                }
                celda.textContent = texto;
            }
        };

        this._handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                celda.blur();
            }
        };

        celda.addEventListener('focus', this._handleFocus);
        celda.addEventListener('blur', this._handleBlur);
        celda.addEventListener('keydown', this._handleKeydown);
        celda.addEventListener('keypress', this._handleKeypress);
        celda.addEventListener('paste', this._handlePaste);
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
            'numero-factura',
            'proveedor',
            'bodega',
            'centro-costos',
            'fecha-documento',
            'observaciones',
            'descuento-porcentaje',
            'total-flete',
            'buscar-item'
        ];

        const currentIndex = orden.indexOf(actualId);
        if (currentIndex < orden.length - 1) {
            return document.getElementById(orden[currentIndex + 1]);
        }
        return null;
    },

    // Funciones de interfaz
    mostrarSpinner(mensaje = 'Procesando...') {
        Swal.fire({
            title: mensaje,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });
    },

    ocultarSpinner() {
        Swal.close();
    },

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

        Toast.fire({
            icon: tipo,
            title: mensaje
        });
    },

    mostrarBusquedaProductos() {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarNotificacion('Seleccione una bodega primero', 'warning');
            return;
        }

        if (!this.state.proveedor) {
            this.mostrarNotificacion('Seleccione un proveedor primero', 'warning');
            return;
        }

        const modal = document.querySelector('.modal-busqueda-productos');
        if (modal) {
            modal.style.display = 'block';
            const inputBusqueda = modal.querySelector('#modal-buscar-producto');
            if (inputBusqueda) {
                inputBusqueda.value = '';
                inputBusqueda.focus();
            }
            // Cargar productos iniciales
            this.buscarProductos();
        }
    },

    cerrarModalBusqueda() {
        const modal = document.querySelector('.modal-busqueda-productos');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async actualizarConsecutivo() {
        try {
            const response = await fetch('/api/actualizar_consecutivo_compras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const resultado = await response.json();
            if (resultado.success) {
                // Actualizar el estado y la interfaz
                this.state.consecutivoActual = resultado.nuevoConsecutivo;
                
                // Actualizar el campo de número
                const inputNumero = document.getElementById('numero');
                if (inputNumero) {
                    inputNumero.value = resultado.nuevoConsecutivo;
                }

                console.log('Consecutivo actualizado:', resultado.nuevoConsecutivo);
                return true;
            } else {
                throw new Error(resultado.message || 'Error al actualizar consecutivo');
            }
        } catch (error) {
            console.error('Error al actualizar consecutivo:', error);
            this.mostrarNotificacion('Error al actualizar el consecutivo: ' + error.message, 'error');
            return false;
        }
    },

    // Método auxiliar para obtener el último consecutivo (útil al iniciar)
    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_compras');
            if (!response.ok) throw new Error('Error al obtener el último consecutivo');
            
            const data = await response.json();
            if (data.success) {
                this.state.consecutivoActual = data.ultimoConsecutivo;
                
                const inputNumero = document.getElementById('numero');
                if (inputNumero) {
                    inputNumero.value = data.ultimoConsecutivo;
                }
                
                return data.ultimoConsecutivo;
            } else {
                throw new Error(data.message || 'Error al obtener el consecutivo');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al obtener el consecutivo', 'error');
            return null;
        }
    },

    // Método para inicializar un nuevo documento con el siguiente consecutivo
    async prepararNuevoDocumento() {
        try {
            // Obtener el último consecutivo
            await this.obtenerUltimoConsecutivo();
            
            // Limpiar el formulario
            this.limpiarFormulario();
            
            // Actualizar la interfaz
            this.actualizarInterfaz();
            
            return true;
        } catch (error) {
            console.error('Error al preparar nuevo documento:', error);
            this.mostrarNotificacion('Error al preparar nuevo documento', 'error');
            return false;
        }
    },

    formatearMoneda(valor) {
        if (typeof valor !== 'number') return '$ 0,00';
        return '$ ' + this.formatearNumero(valor);
    },

    formatearNumero(numero) {
        if (numero === null || numero === undefined || isNaN(numero)) return '0,00';
        
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
            style: 'decimal'
        }).format(numero);
    },

    desformatearNumero(valor) {
        if (!valor) return 0;
        
        // Eliminar todos los caracteres no numéricos excepto punto y coma
        let numeroLimpio = valor.toString()
            .replace(/[^\d.,]/g, '')
            .trim();
        
        // Reemplazar comas por puntos para el procesamiento
        numeroLimpio = numeroLimpio.replace(/\./g, '').replace(',', '.');
        
        // Convertir a número
        const numero = parseFloat(numeroLimpio);
        
        return isNaN(numero) ? 0 : numero;
    },
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar íconos de Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
        // Inicializar el sistema
        ComprasProveedor.init();
    } catch (error) {
        console.error('Error al inicializar el sistema:', error);
        alert('Error al inicializar el sistema de compras a proveedores');
    }
});

// Exportar el módulo
window.ComprasProveedor = ComprasProveedor;