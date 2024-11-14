// Sistema de Órdenes de Compra
const OrdenesCompra = {
    // Estado del sistema (actualizado para incluir campos necesarios)
    state: {
        modo: 'lectura',
        ordenActual: null,
        proveedor: null,
        items: [],
        consecutivoActual: null,
        bodegaSeleccionada: null,
        modalBusqueda: null,
        productosEncontrados: [],
        procesandoOrden: false,
        datosCalculados: {
            totalUnidades: 0,
            subtotal: 0,
            valorDescuento: 0,
            totalIva: 0,
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

    actualizarInterfaz() {
        try {
            const esModoLectura = this.state.modo === 'lectura';
            
            // Actualizar estado de los botones
            const estadoBotones = {
                'btn-nuevo': !this.procesandoOrden,
                'btn-guardar': !esModoLectura && !this.procesandoOrden,
                'btn-editar': esModoLectura && this.state.ordenActual && !this.procesandoOrden,
                'btn-cancelar': !esModoLectura && !this.procesandoOrden,
                'btn-cerrar': !this.procesandoOrden
            };
    
            Object.entries(estadoBotones).forEach(([id, habilitado]) => {
                const boton = document.getElementById(id);
                if (boton) {
                    boton.disabled = !habilitado;
                    boton.classList.toggle('disabled', !habilitado);
                    
                    // Cambiar el texto del botón guardar si está procesando
                    if (id === 'btn-guardar' && this.procesandoOrden) {
                        boton.innerHTML = '<i data-lucide="loader"></i> Guardando...';
                    } else if (id === 'btn-guardar') {
                        boton.innerHTML = '<i data-lucide="save"></i> Guardar';
                    }
                }
            });
    
            // Actualizar íconos
            if (window.lucide) {
                lucide.createIcons();
            }
    
        } catch (error) {
            console.error('Error al actualizar interfaz:', error);
            this.mostrarNotificacion('Error al actualizar la interfaz', 'error');
        }
    },

    // Inicialización del sistema
    async init() {
        try {
            console.log('Iniciando sistema de órdenes de compra...');
            
            // Establecer estado inicial
            this.state = {
                modo: 'lectura',
                ordenActual: null,
                proveedor: null,
                items: [],
                consecutivoActual: null,
                bodegaSeleccionada: null,
                modalBusqueda: null,
                productosEncontrados: [],
                procesandoOrden: false,  // Nueva propiedad
                datosCalculados: {
                    totalUnidades: 0,
                    subtotal: 0,
                    valorDescuento: 0,
                    totalIva: 0,
                    totalDocumento: 0
                }
            };

            await this.obtenerUltimoConsecutivo();
            
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
                'btn-nuevo': () => this.iniciarNuevaOrden(),
                'btn-guardar': () => {
                    console.log('Botón guardar clickeado'); // Agregar log
                    this.guardarOrden();
                },
                'btn-editar': () => this.habilitarEdicion(),
                'btn-cancelar': () => this.cancelarOperacion(),
                'btn-anular': () => this.anularOrden(),
                'btn-imprimir': () => this.imprimirOrden(),
                'btn-cerrar': () => window.location.href = '/inventario'
            };
    
            // Agregar event listeners a botones principales
            Object.entries(botonesConfig).forEach(([id, handler]) => {
                const boton = document.getElementById(id);
                if (boton) {
                    boton.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`Botón ${id} clickeado`); // Agregar log
                        if (!boton.disabled) {
                            handler();
                        } else {
                            console.log(`Botón ${id} está deshabilitado`); // Agregar log
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
            ['descuento-porcentaje'].forEach(id => {
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

            // Checkbox de orden completada
            const checkboxCompletada = document.getElementById('orden-completada');
            if (checkboxCompletada) {
                checkboxCompletada.addEventListener('change', () => {
                    this.actualizarEstadoOrden();
                });
            }

        } catch (error) {
            console.error('Error al inicializar event listeners:', error);
            this.mostrarNotificacion('Error al inicializar controles', 'error');
        }
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
            this.buscarProductos('');
        }
    },

    manejarTeclaEnter(evento) {
        const teclaEnter = evento.key === 'Enter';
        const elementoActivo = document.activeElement;
        
        if (teclaEnter && elementoActivo.tagName === 'INPUT') {
            evento.preventDefault();
            
            // Obtener el siguiente campo según el ID actual
            const siguienteCampo = this.obtenerSiguienteCampo(elementoActivo.id);
            if (siguienteCampo) {
                siguienteCampo.focus();
                if (siguienteCampo.type !== 'checkbox') {
                    siguienteCampo.select();
                }
            }
        }
    },

    obtenerSiguienteCampo(campoActualId) {
        const ordenCampos = [
            'consecutivo',
            'numero',
            'fecha-orden',
            'proveedor',
            'bodega',
            'centro-costos',
            'solicita',
            'aprueba',
            'observaciones'
        ];
    
        const indiceActual = ordenCampos.indexOf(campoActualId);
        if (indiceActual !== -1 && indiceActual < ordenCampos.length - 1) {
            return document.getElementById(ordenCampos[indiceActual + 1]);
        }
        return null;
    },

    formatearNumeroEnCampo(valor, decimales = 2) {
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }).format(valor || 0);
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
            document.getElementById('fecha-orden').value = fechaActual;

            console.log('Datos iniciales cargados correctamente');
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            throw error;
        }
    },

    // Métodos para gestión de proveedores
    mostrarBusquedaProveedores() {
        console.log('Abriendo modal de búsqueda de proveedores');
        const modal = document.querySelector('.modal-proveedores');
        if (!modal) {
            console.error('Modal de proveedores no encontrado');
            return;
        }
    
        modal.style.display = 'block';
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
                            onclick="OrdenesCompra.seleccionarProveedor('${p.Nit}')">
                        Seleccionar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async seleccionarProveedor(nit) {
        try {
            this.mostrarSpinner('Cargando datos del proveedor...');
            
            const response = await fetch(`/api/proveedores/${nit}`);
            if (!response.ok) throw new Error('Error al obtener datos del proveedor');
            
            const proveedor = await response.json();
            console.log('Datos del proveedor recibidos:', proveedor); // Log para verificar datos
    
            // Validar que el proveedor tenga NIT
            if (!proveedor.Nit) {
                throw new Error('El proveedor no tiene NIT válido');
            }
            
            this.state.proveedor = proveedor;
            console.log('Proveedor guardado en el estado:', this.state.proveedor); // Log de verificación
            
            // Actualizar el campo de proveedor en el formulario
            const proveedorInput = document.getElementById('proveedor');
            if (proveedorInput) {
                proveedorInput.value = `${proveedor.Nit} - ${proveedor.RazonSocial}`;
            }
            
            this.actualizarInterfaz();
            
            // Cerrar el modal si existe
            const modal = document.querySelector('.modal-proveedores');
            if (modal) {
                modal.style.display = 'none';
            }
            
            this.mostrarNotificacion('Proveedor seleccionado correctamente', 'success');
        } catch (error) {
            console.error('Error al seleccionar proveedor:', error);
            this.mostrarNotificacion('Error al seleccionar el proveedor: ' + error.message, 'error');
        } finally {
            this.ocultarSpinner();
        }
    },

    // Métodos para gestión de productos
    async buscarProductos(termino = '') {
        if (!this.state.bodegaSeleccionada) {
            this.mostrarNotificacion('Por favor, seleccione una bodega primero', 'error');
            return;
        }
    
        try {
            // Obtener datos del inventario
            const response = await fetch(`/api/consulta_inventario?bodega=${this.state.bodegaSeleccionada}&termino=${termino}`);
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
            this.mostrarNotificacion('Error al buscar productos: ' + error.message, 'error');
        }
    },

    mostrarResultadosBusqueda(productos) {
        const tbody = document.querySelector('.modal-busqueda-productos tbody');
        if (!tbody) return;
    
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron productos</td></tr>';
            return;
        }
    
        tbody.innerHTML = productos.map(producto => {
            const cantidad = parseFloat(producto.Saldo || 0);
            const costo = parseFloat(producto.Costo || 0);
            return `
                <tr>
                    <td>${producto.IDReferencia}</td>
                    <td>${producto.Referencia}</td>
                    <td>${producto.ID_Unidad || ''}</td>
                    <td class="text-end">${this.formatearNumero(cantidad)}</td>
                    <td class="text-end">${this.formatearMoneda(costo)}</td>
                    <td class="text-end">${producto.IVA || 0}%</td>
                    <td class="text-center">
                        <button type="button" 
                                class="btn btn-primary btn-sm" 
                                onclick="OrdenesCompra.seleccionarProducto('${producto.IDReferencia}')">
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
                const celdaCantidad = filaExistente.querySelector('td[data-tipo="cantidad"]');
                if (celdaCantidad) {
                    const cantidadActual = this.parsearNumero(celdaCantidad.textContent);
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
                    <td contenteditable="true" class="numero" data-tipo="cantidad">1</td>
                    <td contenteditable="true" class="numero" data-tipo="valorUnitario">
                        ${this.formatearNumero(producto.Costo || 0)}
                    </td>
                    <td contenteditable="true" class="numero" data-tipo="iva">${producto.IVA || 0}</td>
                    <td contenteditable="true" class="numero" data-tipo="descuento">0</td>
                    <td class="subtotal">${this.formatearMoneda(producto.Costo || 0)}</td>
                    <td>
                        <button type="button" class="btn btn-small btn-danger btn-eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
    
                tabla.appendChild(tr);
                this.agregarEventosCeldasEditables(tr);
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
    
            this.calcularTotales();
            this.cerrarModalBusqueda();
    
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion(error.message, 'error');
        }
    },

    agregarEventosCeldasEditables(fila) {
        fila.querySelectorAll('td[contenteditable="true"]').forEach(celda => {
            celda.addEventListener('blur', () => {
                let valor = this.parsearNumero(celda.textContent);
                
                if (celda.dataset.tipo === 'cantidad') {
                    if (valor <= 0) {
                        this.mostrarNotificacion('La cantidad debe ser mayor a 0', 'warning');
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

    agregarProductoAOrden(idReferencia) {
        const producto = this.state.productosEncontrados.find(p => p.IdReferencia === idReferencia);
        if (!producto) return;
    
        const tbody = document.querySelector('.items-table tbody');
        const filaExistente = tbody.querySelector(`tr[data-id="${idReferencia}"]`);
        
        if (filaExistente) {
            // Si el producto ya existe, mostrar notificación y no agregarlo
            this.mostrarNotificacion('Este producto ya está en la orden', 'warning');
            return;
        }
    
        // Agregar el nuevo producto
        const tr = document.createElement('tr');
        tr.dataset.id = idReferencia;
        tr.innerHTML = this.crearFilaProducto(producto);
        tbody.appendChild(tr);
    
        // Cerrar el modal de búsqueda
        document.querySelector('.modal-busqueda-productos').style.display = 'none';
        
        // Recalcular totales
        this.calcularTotales();
    },

    crearFilaProducto(producto) {
        const precioSinIva = parseFloat(producto.PrecioVenta1) / (1 + (parseFloat(producto.IVA || 0) / 100));
        
        return `
            <td>${producto.IdReferencia}</td>
            <td>${producto.Referencia}</td>
            <td>${producto.IdUnidad || ''}</td>
            <td contenteditable="true" class="numero" data-tipo="cantidad">1</td>
            <td contenteditable="true" class="numero" data-tipo="valorUnitario">
                ${this.formatearNumero(producto.PrecioVenta1 || 0)}
            </td>
            <td contenteditable="true" class="numero" data-tipo="iva">${producto.IVA || 0}</td>
            <td contenteditable="true" class="numero" data-tipo="descuento">0</td>
            <td class="subtotal">${this.formatearMoneda(producto.PrecioVenta1 || 0)}</td>
            <td>
                <button type="button" class="btn btn-small btn-danger btn-eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
    },

    // Funciones de gestión de la orden
    async iniciarNuevaOrden() {
        try {
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

            this.state.modo = 'nuevo';
            this.state.ordenActual = null;
            this.state.proveedor = null;
            this.state.items = [];
            
            await this.obtenerUltimoConsecutivo();
            this.limpiarFormulario();
            this.habilitarCampos();
            this.actualizarInterfaz();
            
            this.mostrarNotificacion('Nueva orden iniciada', 'success');
        } catch (error) {
            console.error('Error al iniciar nueva orden:', error);
            this.mostrarNotificacion('Error al iniciar nueva orden', 'error');
        }
    },

    async guardarOrden() {
        if (this.state.procesandoOrden) {
            this.mostrarNotificacion('Ya hay una orden en proceso de guardado', 'warning');
            return;
        }
    
        this.state.procesandoOrden = true;
        this.mostrarSpinner('Guardando orden...');
    
        try {
            if (!this.validarOrden()) {
                throw new Error('Validación fallida');
            }
    
            // Obtener detalles de la tabla
            const detalles = Array.from(document.querySelectorAll('.items-table tbody tr')).map(fila => {
                const cantidad = this.desformatearNumero(fila.querySelector('[data-tipo="cantidad"]')?.textContent);
                const valorUnitario = this.desformatearNumero(fila.querySelector('[data-tipo="valorUnitario"]')?.textContent);
                const iva = this.desformatearNumero(fila.querySelector('[data-tipo="iva"]')?.textContent);
                const descuento = this.desformatearNumero(fila.querySelector('[data-tipo="descuento"]')?.textContent);
    
                // Calcular el valor sin IVA
                const valorSinIva = valorUnitario / (1 + (iva / 100));
    
                return {
                    ID: `${this.state.consecutivoActual}_${fila.dataset.id}_${Date.now()}`.slice(0, 25),
                    Numero: this.state.consecutivoActual,
                    IdReferencia: fila.dataset.id,
                    Descripcion: fila.cells[1].textContent,
                    CantidadPedida: cantidad,
                    CantidadEntregada: 0,
                    Valor: valorUnitario,            // Usar el valor unitario directo
                    ValorSinIva: valorSinIva,        // Agregar el valor sin IVA
                    Descuento: descuento,
                    Iva: iva,
                    CantidadTotal: cantidad,
                    IdCentroCosto: document.getElementById('centro-costos')?.value || '',
                    aprobadoworkflow: 0,
                    apruebaworkflow: false,
                    cantidadinicial: cantidad,
                    ultimogrupoaprueba: 0,
                    idunidad: fila.cells[2].textContent,
                    Subtotal: cantidad * valorUnitario  // Agregar el subtotal
                };
            });
    
            const datosOrden = {
                ordenCompra: {
                    Numero: this.state.consecutivoActual,
                    Mes: new Date().toISOString().slice(0, 7).replace('-', ''),
                    Anulado: false,
                    Nit: this.state.proveedor?.Nit,
                    Descuento: this.desformatearNumero(document.getElementById('valor-descuento')?.value || '0'),
                    IdMontajeSolicitud: null,
                    FechaCreacion: new Date().toISOString(),
                    IdUsuario: 'MIG',
                    Observaciones: document.getElementById('observaciones')?.value || '',
                    OrdenCompletada: document.getElementById('orden-completada')?.checked || false,
                    IdBodega: this.state.bodegaSeleccionada,
                    fechamodificacion: new Date().toISOString(),
                    moneda: 1,
                    tasacambio: 1.0,
                    IdConsecutivo: document.getElementById('consecutivo')?.value || '3',
                    IdCentroCosto: document.getElementById('centro-costos')?.value || '',
                    Solicita: document.getElementById('solicita')?.value || '',
                    Aprueba: document.getElementById('aprueba')?.value || '',
                    aprobadoworkflow: 0,
                    nivelworkflow: 0,
                    workflow: 0
                },
                detalles: detalles
            };
    
            console.log('Datos a enviar:', datosOrden); // Debug
    
            const response = await fetch('/api/guardar_orden_compra', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(datosOrden)
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la orden');
            }
    
            const resultado = await response.json();
    
            if (resultado.success) {
                this.mostrarNotificacion('Orden guardada exitosamente', 'success');
                this.state.modo = 'lectura';
                await this.limpiarFormulario();
                this.actualizarInterfaz();
            } else {
                throw new Error(resultado.message || 'Error al guardar la orden');
            }
    
        } catch (error) {
            console.error('Error al guardar la orden:', error);
            this.mostrarNotificacion('Error al guardar la orden: ' + error.message, 'error');
        } finally {
            this.state.procesandoOrden = false;
            this.ocultarSpinner();
            this.actualizarInterfaz();
        }
    },

    cancelarOperacion() {
        try {
            console.log('Cancelando operación...');
            
            // Limpiar el formulario
            this.limpiarFormulario();
            
            // Restablecer el estado
            this.state.modo = 'lectura';
            this.state.proveedor = null;
            this.state.items = [];
            this.state.bodegaSeleccionada = null;
            
            // Actualizar la interfaz
            this.actualizarInterfaz();
            
            this.mostrarNotificacion('Operación cancelada', 'info');
        } catch (error) {
            console.error('Error al cancelar operación:', error);
            this.mostrarNotificacion('Error al cancelar la operación', 'error');
        }
    },

    mostrarSpinner(mensaje = 'Procesando...') {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p>${mensaje}</p>
            </div>
        `;
        document.body.appendChild(spinner);
    },
    
    ocultarSpinner() {
        const spinner = document.querySelector('.spinner-overlay');
        if (spinner) {
            spinner.remove();
        }
    },
    
    // Función auxiliar para obtener los detalles de los productos
    obtenerDetallesProductos() {
        return Array.from(document.querySelectorAll('.items-table tbody tr')).map(fila => {
            // Obtener valores usando desformatearNumero
            const cantidad = this.desformatearNumero(fila.querySelector('[data-tipo="cantidad"]')?.textContent);
            const valorUnitario = this.desformatearNumero(fila.querySelector('[data-tipo="valorUnitario"]')?.textContent);
            const iva = this.desformatearNumero(fila.querySelector('[data-tipo="iva"]')?.textContent);
            const descuento = this.desformatearNumero(fila.querySelector('[data-tipo="descuento"]')?.textContent);
            const subtotal = cantidad * valorUnitario;
    
            console.log('Detalle producto:', {
                id: fila.dataset.id,
                cantidad,
                valorUnitario,
                iva,
                descuento,
                subtotal
            }); // Debug
    
            return {
                ID: `${this.state.consecutivoActual}_${fila.dataset.id}_${Date.now()}`,
                Numero: this.state.consecutivoActual,
                IdReferencia: fila.dataset.id,
                Descripcion: fila.querySelector('td:nth-child(2)')?.textContent || '',
                CantidadPedida: cantidad,
                CantidadEntregada: 0,
                Valor: valorUnitario,
                Descuento: descuento,
                Iva: iva,
                CantidadTotal: cantidad,
                IdCentroCosto: document.getElementById('centro-costos')?.value || null,
                aprobadoworkflow: 0,
                apruebaworkflow: false,
                cantidadinicial: cantidad,
                ultimogrupoaprueba: 0,
                idunidad: fila.querySelector('td:nth-child(3)')?.textContent || ''
            };
        });
    },

    validarOrden() {
        console.log('Validando orden...');
        
        // Validar proveedor
        if (!this.state.proveedor?.Nit) {
            this.mostrarNotificacion('Debe seleccionar un proveedor válido', 'warning');
            return false;
        }
    
        // Validar bodega
        const bodega = document.getElementById('bodega').value;
        if (!bodega) {
            this.mostrarNotificacion('Debe seleccionar una bodega', 'warning');
            return false;
        }
    
        // Obtener productos de la tabla
        const items = document.querySelectorAll('.items-table tbody tr');
        
        // Validar que haya productos
        if (items.length === 0) {
            this.mostrarNotificacion('Debe agregar al menos un producto', 'warning');
            return false;
        }
    
        // Validar cada producto
        for (const item of items) {
            const cantidad = parseFloat(item.querySelector('[data-tipo="cantidad"]')?.textContent || '0');
            const valor = parseFloat(item.querySelector('[data-tipo="valorUnitario"]')?.textContent || '0');
            const descripcion = item.querySelector('td:nth-child(2)')?.textContent;
    
            if (cantidad <= 0) {
                this.mostrarNotificacion(`La cantidad debe ser mayor a 0 para el producto: ${descripcion}`, 'warning');
                return false;
            }
    
            if (valor <= 0) {
                this.mostrarNotificacion(`El valor debe ser mayor a 0 para el producto: ${descripcion}`, 'warning');
                return false;
            }
        }
    
        return true;
    },

    recopilarDatosOrden() {
        const items = [];
        document.querySelectorAll('.items-table tbody tr').forEach(fila => {
            items.push({
                idReferencia: fila.dataset.id,
                descripcion: fila.cells[1].textContent,
                unidad: fila.cells[2].textContent,
                cantidad: parseFloat(fila.querySelector('[data-tipo="cantidad"]').textContent),
                valorUnitario: parseFloat(fila.querySelector('[data-tipo="valorUnitario"]').textContent),
                iva: parseFloat(fila.querySelector('[data-tipo="iva"]').textContent),
                descuento: parseFloat(fila.querySelector('[data-tipo="descuento"]').textContent),
                subtotal: parseFloat(fila.querySelector('.subtotal').textContent.replace(/[^0-9.-]+/g, ''))
            });
        });

        return {
            ordenCompra: {
                numero: this.state.consecutivoActual,
                fecha: document.getElementById('fecha-orden').value,
                proveedor: this.state.proveedor.Nit,
                bodega: this.state.bodegaSeleccionada,
                observaciones: document.getElementById('observaciones').value,
                centrosCostos: document.getElementById('centro-costos').value,
                solicita: document.getElementById('solicita').value,
                aprueba: document.getElementById('aprueba').value,
                valorDescuento: parseFloat(document.getElementById('valor-descuento').value.replace(/[^0-9.-]+/g, '')),
                anulado: false,
                ordenCompletada: document.getElementById('orden-completada').checked,
                idConsecutivo: this.state.consecutivoActual
            },
            detalles: items
        };
    },

    configurarEventosModalProductos(modal) {
        if (!modal) return;

        // Configurar el input de búsqueda
        const inputBusqueda = modal.querySelector('#modal-buscar-producto');
        if (inputBusqueda) {
            // Usar debounce para optimizar las búsquedas
            const debouncedSearch = this.debounce((value) => {
                this.buscarProductos(value);
            }, 300);

            inputBusqueda.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            // Enfocar el input cuando se abre el modal
            inputBusqueda.addEventListener('focus', () => {
                if (!this.state.bodegaSeleccionada) {
                    this.mostrarNotificacion('Seleccione una bodega primero', 'warning');
                    modal.style.display = 'none';
                    return;
                }
            });
        }

        // Configurar el botón de cerrar
        const btnCerrar = modal.querySelector('.btn-cerrar');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Cerrar el modal al hacer clic fuera del contenido
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Evitar que el clic en el contenido del modal lo cierre
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Manejar teclas
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
            }
            if (e.key === 'Enter' && document.activeElement === inputBusqueda) {
                e.preventDefault();
                const primerBotonAgregar = modal.querySelector('.btn-success');
                if (primerBotonAgregar) {
                    primerBotonAgregar.click();
                }
            }
        });

        // Configurar la tabla de resultados
        const tabla = modal.querySelector('.tabla-productos');
        if (tabla) {
            tabla.addEventListener('click', (e) => {
                const btnAgregar = e.target.closest('.btn-success');
                if (btnAgregar) {
                    const fila = btnAgregar.closest('tr');
                    if (fila && fila.dataset.id) {
                        this.agregarProductoAOrden(fila.dataset.id);
                        modal.style.display = 'none';
                        
                        // Limpiar y enfocar el campo de búsqueda para la próxima vez
                        if (inputBusqueda) {
                            inputBusqueda.value = '';
                        }
                    }
                }
            });
        }

        // Funcionalidad de paginación si existe
        const botonesPaginacion = modal.querySelectorAll('.paginacion button');
        botonesPaginacion.forEach(boton => {
            boton.addEventListener('click', (e) => {
                const pagina = e.target.dataset.pagina;
                if (pagina) {
                    this.buscarProductos(inputBusqueda.value, parseInt(pagina));
                }
            });
        });

        // Manejar el scroll infinito si está implementado
        const contenedorTabla = modal.querySelector('.tabla-productos');
        if (contenedorTabla) {
            contenedorTabla.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = contenedorTabla;
                if (scrollTop + clientHeight >= scrollHeight - 5) {
                    // Cargar más productos si estamos cerca del final
                    if (!this.cargandoMasProductos) {
                        this.cargarMasProductos();
                    }
                }
            });
        }

        // Funcionalidad de filtros adicionales si existen
        const filtros = modal.querySelectorAll('.filtros select, .filtros input');
        filtros.forEach(filtro => {
            filtro.addEventListener('change', () => {
                this.aplicarFiltrosProductos();
            });
        });

        // Ordenamiento de columnas si está implementado
        const headersColomnas = modal.querySelectorAll('th[data-sortable]');
        headersColomnas.forEach(header => {
            header.addEventListener('click', () => {
                const columna = header.dataset.column;
                const direccionActual = header.dataset.sortDirection || 'asc';
                const nuevaDireccion = direccionActual === 'asc' ? 'desc' : 'asc';
                
                // Limpiar direcciones anteriores
                headersColomnas.forEach(h => h.dataset.sortDirection = '');
                
                // Establecer nueva dirección
                header.dataset.sortDirection = nuevaDireccion;
                
                // Actualizar la búsqueda con el nuevo ordenamiento
                this.buscarProductos(inputBusqueda.value, 1, {
                    orderBy: columna,
                    orderDirection: nuevaDireccion
                });
            });
        });

        // Control de estado del modal
        this.state.modalBusqueda = modal;
    },

    configurarEventosModalProveedor(modal) {
        if (!modal) return;

        // Configurar el input de búsqueda
        const inputBusqueda = modal.querySelector('.input-busqueda');
        if (inputBusqueda) {
            // Usar debounce para optimizar las búsquedas
            const debouncedSearch = this.debounce(async (termino) => {
                try {
                    const response = await fetch(`/api/proveedores?buscar=${termino}`);
                    if (!response.ok) throw new Error('Error al buscar proveedores');
                    
                    const proveedores = await response.json();
                    this.mostrarResultadosProveedores(proveedores);
                } catch (error) {
                    console.error('Error:', error);
                    this.mostrarNotificacion('Error al buscar proveedores', 'error');
                }
            }, 300);

            // Evento input para búsqueda
            inputBusqueda.addEventListener('input', (e) => {
                const termino = e.target.value.trim();
                if (termino.length >= 3 || termino.length === 0) {
                    debouncedSearch(termino);
                }
            });

            // Cargar resultados iniciales al abrir el modal
            inputBusqueda.addEventListener('focus', () => {
                if (inputBusqueda.value.length === 0) {
                    debouncedSearch('');
                }
            });
        }

        // Configurar el botón de cerrar
        const btnCerrar = modal.querySelector('.btn-cerrar');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Cerrar el modal al hacer clic fuera del contenido
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Evitar que el clic en el contenido del modal lo cierre
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Configurar la tabla de resultados
        const tbody = modal.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const btnSeleccionar = e.target.closest('.btn-primary');
                if (btnSeleccionar) {
                    const nit = btnSeleccionar.closest('tr').querySelector('td:first-child').textContent;
                    try {
                        await this.seleccionarProveedor(nit);
                        modal.style.display = 'none';
                    } catch (error) {
                        console.error('Error al seleccionar proveedor:', error);
                        this.mostrarNotificacion('Error al seleccionar el proveedor', 'error');
                    }
                }
            });
        }

        // Manejar teclas
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
            }
            if (e.key === 'Enter' && document.activeElement === inputBusqueda) {
                e.preventDefault();
                const primerBotonSeleccionar = modal.querySelector('.btn-primary');
                if (primerBotonSeleccionar) {
                    primerBotonSeleccionar.click();
                }
            }
        });

        // Funcionalidad de ordenamiento si está implementada
        const headersColomnas = modal.querySelectorAll('th[data-sortable]');
        headersColomnas.forEach(header => {
            header.addEventListener('click', () => {
                const columna = header.dataset.column;
                const direccionActual = header.dataset.sortDirection || 'asc';
                const nuevaDireccion = direccionActual === 'asc' ? 'desc' : 'asc';
                
                // Limpiar direcciones anteriores
                headersColomnas.forEach(h => h.dataset.sortDirection = '');
                
                // Establecer nueva dirección
                header.dataset.sortDirection = nuevaDireccion;
                
                // Reordenar la tabla
                this.ordenarTablaProveedores(columna, nuevaDireccion);
            });
        });

        // Filtros adicionales si existen
        const filtros = modal.querySelectorAll('.filtros select, .filtros input');
        filtros.forEach(filtro => {
            filtro.addEventListener('change', () => {
                this.aplicarFiltrosProveedores();
            });
        });

        // Funcionalidad de paginación si existe
        const botonesPaginacion = modal.querySelectorAll('.paginacion button');
        botonesPaginacion.forEach(boton => {
            boton.addEventListener('click', (e) => {
                const pagina = e.target.dataset.pagina;
                if (pagina) {
                    const termino = inputBusqueda.value.trim();
                    this.buscarProveedores(termino, parseInt(pagina));
                }
            });
        });

        // Scroll infinito si está implementado
        const contenedorTabla = modal.querySelector('.tabla-resultados');
        if (contenedorTabla) {
            let paginaActual = 1;
            let cargandoMas = false;

            contenedorTabla.addEventListener('scroll', async () => {
                const { scrollTop, scrollHeight, clientHeight } = contenedorTabla;
                
                if (scrollTop + clientHeight >= scrollHeight - 5 && !cargandoMas) {
                    cargandoMas = true;
                    paginaActual++;

                    try {
                        const termino = inputBusqueda.value.trim();
                        const response = await fetch(`/api/proveedores?buscar=${termino}&pagina=${paginaActual}`);
                        if (!response.ok) throw new Error('Error al cargar más proveedores');
                        
                        const nuevosProveedores = await response.json();
                        if (nuevosProveedores.length > 0) {
                            this.agregarProveedoresATabla(nuevosProveedores);
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        this.mostrarNotificacion('Error al cargar más proveedores', 'error');
                    } finally {
                        cargandoMas = false;
                    }
                }
            });
        }

        // Agregar método para ordenar la tabla
        this.ordenarTablaProveedores = (columna, direccion) => {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const comparador = (a, b) => {
                const valorA = a.querySelector(`td[data-column="${columna}"]`).textContent;
                const valorB = b.querySelector(`td[data-column="${columna}"]`).textContent;
                
                if (direccion === 'asc') {
                    return valorA.localeCompare(valorB);
                } else {
                    return valorB.localeCompare(valorA);
                }
            };

            rows.sort(comparador);
            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
        };

        // Agregar método para aplicar filtros
        this.aplicarFiltrosProveedores = () => {
            const filtrosActivos = {};
            filtros.forEach(filtro => {
                if (filtro.value) {
                    filtrosActivos[filtro.name] = filtro.value;
                }
            });

            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                let mostrar = true;
                Object.entries(filtrosActivos).forEach(([nombre, valor]) => {
                    const celda = row.querySelector(`td[data-${nombre}]`);
                    if (celda && !celda.textContent.toLowerCase().includes(valor.toLowerCase())) {
                        mostrar = false;
                    }
                });
                row.style.display = mostrar ? '' : 'none';
            });
        };

        // Método auxiliar para agregar nuevos proveedores a la tabla
        this.agregarProveedoresATabla = (proveedores) => {
            proveedores.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-column="nit">${p.Nit}</td>
                    <td data-column="razonSocial">${p.RazonSocial}</td>
                    <td data-column="ciudad">${p.Ciudad || ''}</td>
                    <td data-column="telefono">${p.Telefono || ''}</td>
                    <td>
                        <button type="button" class="btn btn-small btn-primary">
                            Seleccionar
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        };
    },

    // Funciones de carga de datos
    async cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos_ordenes_compra');
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
                    bodegas.map(b => 
                        `<option value="${b.IdBodega}">${b.Descripcion}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error al cargar bodegas:', error);
            throw error;
        }
    },

    async obtenerUltimoConsecutivo() {
        try {
            const response = await fetch('/api/ultimo_consecutivo_ordenes_compra');
            if (!response.ok) throw new Error('Error al obtener el último consecutivo');
            
            const data = await response.json();
            if (data.success) {
                this.state.consecutivoActual = data.ultimoConsecutivo;
                
                // Actualizar tanto el número como el consecutivo completo
                const inputNumero = document.getElementById('numero');
                const inputConsecutivo = document.getElementById('consecutivo');
                
                if (inputNumero) {
                    inputNumero.value = data.ultimoConsecutivo;
                }
                
                if (inputConsecutivo) {
                    inputConsecutivo.value = `ORDEN DE COMPRA - ${data.ultimoConsecutivo}`;
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

    async actualizarConsecutivo() {
        try {
            const response = await fetch('/api/actualizar_consecutivo_ordenes_compra', {
                method: 'POST'
            });

            const resultado = await response.json();
            if (resultado.success) {
                this.state.consecutivoActual = resultado.nuevoConsecutivo;
                document.getElementById('numero').value = resultado.nuevoConsecutivo;
                return true;
            } else {
                throw new Error(resultado.message || 'Error al actualizar consecutivo');
            }
        } catch (error) {
            console.error('Error al actualizar consecutivo:', error);
            this.mostrarNotificacion('Error al actualizar el consecutivo', 'error');
            return false;
        }
    },

    // Funciones de interfaz
    habilitarCampos() {
        const esModoLectura = this.state.modo === 'lectura';
        
        const campos = {
            general: [
                'proveedor',
                'bodega',
                'centro-costos',
                'fecha-orden',
                'observaciones',
                'solicita',
                'aprueba',
                'valor-descuento'
            ],
            soloLectura: [
                'numero',
                'consecutivo',
                'total-unidades',
                'subtotal',
                'total-impuestos',
                'total-documento'
            ]
        };

        campos.general.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.disabled = esModoLectura;
                campo.classList.toggle('disabled', esModoLectura);
            }
        });

        campos.soloLectura.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.disabled = true;
                campo.classList.add('readonly');
            }
        });

        // Habilitar/deshabilitar botones
        const botones = {
            'btn-nuevo': true,
            'btn-guardar': !esModoLectura,
            'btn-editar': esModoLectura && this.state.ordenActual,
            'btn-cancelar': !esModoLectura,
            'btn-anular': esModoLectura && this.state.ordenActual,
            'btn-imprimir': this.state.ordenActual !== null,
            'btn-cerrar': true
        };

        Object.entries(botones).forEach(([id, habilitado]) => {
            const boton = document.getElementById(id);
            if (boton) {
                boton.disabled = !habilitado;
                boton.classList.toggle('disabled', !habilitado);
            }
        });

        // Configurar elementos de la tabla
        document.querySelectorAll('.items-table td[contenteditable]').forEach(celda => {
            celda.contentEditable = !esModoLectura;
            celda.classList.toggle('editable', !esModoLectura);
        });

        document.querySelectorAll('.items-table .btn-eliminar').forEach(boton => {
            boton.disabled = esModoLectura;
            boton.classList.toggle('disabled', esModoLectura);
        });
    },

    limpiarFormulario() {
        // Limpiar campos de texto
        ['proveedor', 'solicita', 'aprueba', 'observaciones'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '';
        });

        // Restablecer selects
        document.getElementById('bodega').value = '';
        document.getElementById('centro-costos').value = '';

        // Establecer fecha actual
        document.getElementById('fecha-orden').value = new Date().toISOString().split('T')[0];

        // Limpiar checkboxes
        document.getElementById('orden-completada').checked = false;

        // Limpiar campos numéricos
        ['total-unidades', 'subtotal', 'valor-descuento', 'total-impuestos', 'total-documento'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '0.00';
        });

        // Limpiar tabla de items
        const tbody = document.querySelector('.items-table tbody');
        if (tbody) tbody.innerHTML = '';

        // Limpiar estado
        this.state.items = [];
        this.state.datosCalculados = {
            totalUnidades: 0,
            subtotal: 0,
            valorDescuento: 0,
            totalIva: 0,
            totalDocumento: 0
        };
    },

    // Función para formatear números permitiendo valores grandes
    formatearNumero(valor) {
        if (!valor && valor !== 0) return '0.00';
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        }).format(parseFloat(valor) || 0);
    },

    // Función para parsear números del formato colombiano
    parsearNumero(texto) {
        if (!texto) return 0;
        // Remover todos los caracteres excepto números, punto y coma
        const numeroLimpio = texto.replace(/[^\d.,]/g, '')
            .replace(/,/g, '.'); // Convertir comas a puntos
        return parseFloat(numeroLimpio) || 0;
    },

    // Función para calcular totales de una fila
    calcularTotalesFila(fila) {
        try {
            // Obtener valores usando desformatearNumero
            const cantidad = this.desformatearNumero(fila.querySelector('[data-tipo="cantidad"]').textContent);
            const valorUnitario = this.desformatearNumero(fila.querySelector('[data-tipo="valorUnitario"]').textContent);
            const iva = this.desformatearNumero(fila.querySelector('[data-tipo="iva"]').textContent) || 0;
            const descuento = this.desformatearNumero(fila.querySelector('[data-tipo="descuento"]').textContent) || 0;
    
            console.log('Valores base:', {cantidad, valorUnitario, iva, descuento}); // Debug
    
            // Calcular subtotales
            const subtotalSinIva = cantidad * valorUnitario;
            const valorDescuento = subtotalSinIva * (descuento / 100);
            const valorIva = (subtotalSinIva - valorDescuento) * (iva / 100);
            const total = subtotalSinIva - valorDescuento + valorIva;
    
            console.log('Valores calculados:', {
                subtotalSinIva,
                valorDescuento,
                valorIva,
                total
            }); // Debug
    
            // Actualizar subtotal en la fila
            const celdaSubtotal = fila.querySelector('.subtotal');
            if (celdaSubtotal) {
                celdaSubtotal.textContent = this.formatearMoneda(total);
            }
    
            return {
                cantidad,
                valorUnitario,
                subtotalSinIva,
                valorDescuento,
                valorIva,
                total
            };
        } catch (error) {
            console.error('Error al calcular totales de fila:', error);
            return null;
        }
    },

    // Función para calcular todos los totales del documento
    calcularTotales() {
        const totales = {
            totalUnidades: 0,
            subtotal: 0,
            valorDescuento: 0,
            totalIva: 0,
            totalDocumento: 0
        };
    
        try {
            document.querySelectorAll('.items-table tbody tr').forEach(fila => {
                const valores = this.calcularTotalesFila(fila);
                if (!valores) return;
    
                totales.totalUnidades += valores.cantidad;
                totales.subtotal += valores.subtotalSinIva;
                totales.valorDescuento += valores.valorDescuento;
                totales.totalIva += valores.valorIva;
            });
    
            totales.totalDocumento = totales.subtotal - totales.valorDescuento + totales.totalIva;
    
            // Actualizar campos de totales
            const camposTotales = {
                'total-unidades': totales.totalUnidades,
                'subtotal': totales.subtotal,
                'valor-descuento': totales.valorDescuento,
                'total-impuestos': totales.totalIva,
                'total-documento': totales.totalDocumento
            };
    
            Object.entries(camposTotales).forEach(([id, valor]) => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.value = this.formatearMoneda(valor);
                    console.log(`Campo ${id} actualizado:`, valor); // Debug
                }
            });
    
            this.state.datosCalculados = totales;
            console.log('Totales finales calculados:', totales); // Debug
    
        } catch (error) {
            console.error('Error al calcular totales:', error);
            this.mostrarNotificacion('Error al calcular totales', 'error');
        }
    },

    // Función para actualizar los campos de totales en el formulario
    actualizarCamposTotales(totales) {
        try {
            const campos = {
                'total-unidades': totales.totalUnidades,
                'subtotal': totales.subtotal,
                'valor-descuento': totales.valorDescuento,
                'total-impuestos': totales.totalImpuestos,
                'total-documento': totales.totalDocumento
            };

            Object.entries(campos).forEach(([id, valor]) => {
                const campo = document.getElementById(id);
                if (campo) {
                    campo.value = this.formatearMoneda(valor);
                    console.log(`Campo ${id}:`, valor, '→', campo.value); // Debug
                }
            });
        } catch (error) {
            console.error('Error al actualizar campos totales:', error);
            this.mostrarNotificacion('Error al actualizar totales', 'error');
        }
    },

    // Función para formatear moneda
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

    // Función mejorada para editar celdas que permite números grandes
    editarCelda(celda) {
        if (!celda || !celda.isContentEditable) return;

        celda.addEventListener('focus', () => {
            // Al obtener el foco, mostrar el valor sin formato
            let valor = this.desformatearNumero(celda.textContent);
            celda.textContent = valor.toString();
            celda.select();
            celda.dataset.valorOriginal = valor.toString();
        });

        celda.addEventListener('blur', () => {
            try {
                let valor = this.desformatearNumero(celda.textContent);
                const tipo = celda.dataset.tipo;

                switch (tipo) {
                    case 'cantidad':
                        if (valor <= 0) {
                            this.mostrarNotificacion('La cantidad debe ser mayor a 0', 'warning');
                            valor = 1;
                        }
                        celda.textContent = this.formatearNumero(valor);
                        break;

                    case 'valorSinIva':
                    case 'valorConIva':
                        if (valor < 0) {
                            this.mostrarNotificacion('El valor no puede ser negativo', 'warning');
                            valor = 0;
                        }
                        celda.textContent = this.formatearMoneda(valor);
                        break;

                    case 'iva':
                    case 'descuento':
                        if (valor < 0 || valor > 100) {
                            this.mostrarNotificacion('El porcentaje debe estar entre 0 y 100', 'warning');
                            valor = 0;
                        }
                        celda.textContent = this.formatearNumero(valor);
                        break;
                }

                this.calcularTotales();
            } catch (error) {
                console.error('Error al procesar valor:', error);
                celda.textContent = this.formatearNumero(0);
                this.mostrarNotificacion('Error al procesar el valor', 'error');
            }
        });

        celda.addEventListener('keypress', (e) => {
            if (!/[\d.,]/.test(e.key) && !e.ctrlKey) {
                e.preventDefault();
            }
        });

        celda.addEventListener('paste', (e) => {
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
        });
    },

    actualizarEstadoOrden() {
        const checkboxCompletada = document.getElementById('orden-completada');
        if (checkboxCompletada && this.state.ordenActual) {
            this.state.ordenActual.ordenCompletada = checkboxCompletada.checked;
        }
    },

    async anularOrden() {
        if (!this.state.ordenActual) {
            this.mostrarNotificacion('No hay una orden seleccionada para anular', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: 'Esta acción anulará la orden de compra y no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, anular',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/ordenes_compra/${this.state.ordenActual.numero}/anular`, {
                    method: 'POST'
                });
                
                if (!response.ok) throw new Error('Error al anular la orden');
                
                const data = await response.json();
                if (data.success) {
                    this.mostrarNotificacion('Orden anulada exitosamente', 'success');
                    await this.iniciarNuevaOrden();
                } else {
                    throw new Error(data.message || 'Error al anular la orden');
                }
            } catch (error) {
                console.error('Error:', error);
                this.mostrarNotificacion('Error al anular la orden', 'error');
            }
        }
    },

    async imprimirOrden() {
        if (!this.state.ordenActual) {
            this.mostrarNotificacion('No hay una orden para imprimir', 'warning');
            return;
        }

        try {
            this.mostrarSpinner('Generando documento...');
            
            const response = await fetch(`/api/ordenes_compra/${this.state.ordenActual.numero}/imprimir`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf'
                }
            });

            if (!response.ok) throw new Error('Error al generar el documento');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const ventanaImpresion = window.open(url);
            if (ventanaImpresion) {
                ventanaImpresion.onload = () => {
                    ventanaImpresion.print();
                    setTimeout(() => {
                        ventanaImpresion.close();
                        window.URL.revokeObjectURL(url);
                    }, 100);
                };
            } else {
                throw new Error('No se pudo abrir la ventana de impresión');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al imprimir la orden', 'error');
        } finally {
            this.ocultarSpinner();
        }
    },

    async buscarOrden(numero) {
        try {
            this.mostrarSpinner('Buscando orden...');
            
            const response = await fetch(`/api/ordenes_compra/${numero}`);
            if (!response.ok) throw new Error('Error al buscar la orden');
            
            const orden = await response.json();
            await this.cargarOrden(orden);
            
            this.mostrarNotificacion('Orden cargada exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al buscar la orden', 'error');
        } finally {
            this.ocultarSpinner();
        }
    },

    async cargarOrden(orden) {
        try {
            // Cargar datos principales
            this.state.ordenActual = orden;
            this.state.modo = 'lectura';
            
            // Cargar proveedor
            await this.seleccionarProveedor(orden.proveedor);
            
            // Cargar campos del formulario
            document.getElementById('numero').value = orden.numero;
            document.getElementById('fecha-orden').value = orden.fecha;
            document.getElementById('bodega').value = orden.bodega;
            document.getElementById('centro-costos').value = orden.centrosCostos;
            document.getElementById('solicita').value = orden.solicita;
            document.getElementById('aprueba').value = orden.aprueba;
            document.getElementById('observaciones').value = orden.observaciones;
            document.getElementById('orden-completada').checked = orden.ordenCompletada;
            
            // Cargar items en la tabla
            const tbody = document.querySelector('.items-table tbody');
            tbody.innerHTML = '';
            
            orden.detalles.forEach(item => {
                const tr = document.createElement('tr');
                tr.dataset.id = item.idReferencia;
                tr.innerHTML = this.crearFilaProductoExistente(item);
                tbody.appendChild(tr);
            });

            // Actualizar totales
            this.calcularTotales();
            
            // Actualizar interfaz
            this.actualizarInterfaz();
            
        } catch (error) {
            console.error('Error al cargar orden:', error);
            throw error;
        }
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
                    <button type="button" class="btn-close" onclick="OrdenesCompra.cerrarModalBusqueda()">&times;</button>
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
                                    <th>IVA</th>
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

    cerrarModalBusqueda() {
        if (this.state.modalBusqueda) {
            this.state.modalBusqueda.style.display = 'none';
        }
    },

    // Modal de búsqueda de proveedores
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

    // Funciones utilitarias
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
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar íconos de Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
        // Inicializar el sistema
        OrdenesCompra.init();
    } catch (error) {
        console.error('Error al inicializar el sistema:', error);
        alert('Error al inicializar el sistema de órdenes de compra');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado completamente');
    if (window.OrdenesCompra) {
        console.log('Módulo OrdenesCompra encontrado');
        OrdenesCompra.init();
    } else {
        console.error('Módulo OrdenesCompra no encontrado');
    }
});

// Exportar el módulo
window.OrdenesCompra = OrdenesCompra;