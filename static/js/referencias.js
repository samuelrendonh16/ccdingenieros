// Estado global unificado
let currentState = {
    mode: 'view', // 'view', 'edit', 'new'
    currentProduct: null,
    isDirty: false
};

// Elementos del DOM
const form = document.querySelector('.referencias-form');

// Inputs principales
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const costoInput = document.getElementById('costo');
const precioVenta1Input = document.getElementById('precio_venta_1');
const ivaInput = document.getElementById('iva');
const ubicacionInput = document.getElementById('ubicacion');
const marcaInput = document.getElementById('marca');

// Selects
const grupoSelect = document.getElementById('grupo');
const subgrupoSelect = document.getElementById('subgrupo');
const subcategoriaSelect = document.getElementById('subcategoria');
const unidadSelect = document.getElementById('unidad');
const bodegaSelect = document.getElementById('bodega');
const estadoProductoSelect = document.getElementById('estado_producto');

// Checkboxes
const esServicioCheck = document.querySelector('input[name="es_servicio"]');
const activoCheck = document.querySelector('input[name="activo"]');
const compuestoCheck = document.querySelector('input[name="compuesto"]');
const agotadoCheck = document.querySelector('input[name="agotado"]');
const modificaPrecioCheck = document.querySelector('input[name="modifica_precio"]');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const cancelButton = document.querySelector('.btn-secondary:nth-child(4)');
const searchButton = document.querySelector('.btn-secondary:nth-child(5)');

// Inicialización del documento
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([
            loadGrupos(),
            loadUnidades(),
            loadBodegas(),
            loadEstadosProducto()
        ]);
        
        setupEventListeners();
        setInitialState();
        
        // Marcar cambios en el formulario
        form.addEventListener('change', () => {
            currentState.isDirty = true;
        });
        
    } catch (error) {
        console.error('Error during initialization:', error);
        alert('Error al inicializar el formulario');
    }
});

// Event Listeners
function setupEventListeners() {
    newButton.addEventListener('click', handleNew);
    saveButton.addEventListener('click', handleSave);
    editButton.addEventListener('click', handleEdit);
    cancelButton.addEventListener('click', handleCancel);
    searchButton.addEventListener('click', handleSearch);

    // Detectar cambios en el formulario
    form.addEventListener('change', () => {
        if (currentState.mode === 'edit') {
            currentState.isDirty = true;
        }
    });

    grupoSelect.addEventListener('change', loadSubgrupos);
    subgrupoSelect.addEventListener('change', loadSubcategorias);
    esServicioCheck.addEventListener('change', handleEsServicioChange);

    costoInput.addEventListener('input', calcularPrecioVenta);
    ivaInput.addEventListener('input', calcularPrecioVenta);
}

// Carga de datos
async function loadGrupos() {
    try {
        const response = await fetch('/api/grupos');
        const grupos = await response.json();
        populateSelect(grupoSelect, grupos, 'codigo', 'descripcion');
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        alert('Error al cargar los grupos');
    }
}

async function loadSubgrupos() {
    const grupoId = grupoSelect.value;
    subgrupoSelect.innerHTML = '<option value="">Seleccione un SubGrupo</option>';
    subcategoriaSelect.innerHTML = '<option value="">Seleccione una SubCategoría</option>';
    
    if (!grupoId) return;

    try {
        const response = await fetch(`/api/subgrupos/${grupoId}`);
        const subgrupos = await response.json();
        populateSelect(subgrupoSelect, subgrupos, 'IdSubgrupo', 'Subgrupo');
        subgrupoSelect.disabled = false;
    } catch (error) {
        console.error('Error al cargar subgrupos:', error);
    }
}

async function loadSubcategorias() {
    const subgrupoId = subgrupoSelect.value;
    if (!subgrupoId) return;

    try {
        const response = await fetch(`/api/subcategorias?idsubgrupo=${subgrupoId}`);
        const subcategorias = await response.json();
        populateSelect(subcategoriaSelect, subcategorias, 'idsubcategoria', 'categoria');
        subcategoriaSelect.disabled = false;
    } catch (error) {
        console.error('Error al cargar subcategorías:', error);
    }
}

async function loadUnidades() {
    try {
        const response = await fetch('/api/unidades/activas');
        const unidades = await response.json();
        populateSelect(unidadSelect, unidades, 'IdUnidad', 'Unidad');
    } catch (error) {
        console.error('Error al cargar unidades:', error);
    }
}

async function loadBodegas() {
    try {
        const response = await fetch('/api/bodegas_disponibles');
        const bodegas = await response.json();
        populateSelect(bodegaSelect, bodegas, 'IdBodega', 'Descripcion');
    } catch (error) {
        console.error('Error al cargar bodegas:', error);
    }
}

async function loadEstadosProducto() {
    try {
        const response = await fetch('/api/estado_producto');
        const estados = await response.json();
        populateSelect(estadoProductoSelect, estados, 'IdEstadoProducto', 'EstadoProducto');
    } catch (error) {
        console.error('Error al cargar estados de producto:', error);
    }
}

// Manejadores de eventos
async function handleNew() {
    currentMode = 'new';
    clearForm();
    enableForm(true);
    setButtonStates();
    
    if (grupoSelect.value) {
        const response = await fetch(`/api/grupos/${grupoSelect.value}/siguiente-codigo`, {
            method: 'POST'
        });
        const data = await response.json();
        codigoInput.value = data.nuevoCodigo;
    }
}

// Función para el botón Guardar
async function handleSave() {
    if (!validateForm()) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }

    try {
        // Crear objeto con los nombres de campos correctos según el modelo
        const referenciaData = {
            IdReferencia: codigoInput.value.trim(),
            Referencia: descripcionInput.value.trim(),
            IdGrupo: grupoSelect.value,
            idsubgrupo: subgrupoSelect.value || null,
            idsubcategoria: subcategoriaSelect.value || null,
            IdUnidad: unidadSelect.value,
            idbodega: bodegaSelect.value || null,
            Costo: Number(costoInput.value) || 0,
            PrecioVenta1: Number(precioVenta1Input.value) || 0,
            IVA: Number(ivaInput.value) || 0,
            Ubicacion: ubicacionInput.value.trim(),
            Marca: marcaInput.value.trim(),
            EstadoProducto: estadoProductoSelect.value,
            // Booleanos - nombres según el modelo
            Tipo: esServicioCheck.checked,
            Estado: activoCheck.checked,
            compuesto: compuestoCheck.checked,
            productoagotado: agotadoCheck.checked,
            modificaprecio: modificaPrecioCheck.checked,
            // Campos adicionales requeridos
            ManejaInventario: true,
            FechaCreacion: new Date().toISOString()
        };

        // Log para depuración
        console.log('Datos a enviar:', referenciaData);

        const response = await fetch(`/api/referencias/${referenciaData.IdReferencia}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(referenciaData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al guardar los cambios');
        }

        alert('Cambios guardados exitosamente');
        
        // Actualizar el estado y la interfaz
        currentState.mode = 'view';
        currentState.isDirty = false;
        currentState.currentProduct = referenciaData;
        
        enableForm(false);
        setButtonStates();

    } catch (error) {
        console.error('Error al guardar:', error);
        alert(`Error al guardar los cambios: ${error.message}`);
    }
}

function handleEsServicioChange() {
    const esServicio = esServicioCheck.checked;
    bodegaSelect.disabled = esServicio;
    ubicacionInput.disabled = esServicio;
    if (esServicio) {
        bodegaSelect.value = '';
        ubicacionInput.value = '';
    }
}

// Función para el botón Editar
function handleEdit() {
    currentState.mode = 'edit';
    enableForm(true);
    codigoInput.disabled = true;
    setButtonStates();
}

// Función para el botón Cancelar
function handleCancel() {
    if (currentState.mode === 'edit') {
        const confirmar = confirm('¿Está seguro que desea cancelar la edición? Se perderán los cambios no guardados.');
        if (!confirmar) return;
        
        // Restaurar datos originales
        if (currentState.currentProduct) {
            fillForm(currentState.currentProduct);
        }
    } else {
        clearForm();
    }
    
    currentState.mode = 'view';
    currentState.isDirty = false;
    enableForm(false);
    setButtonStates();
}

async function handleSearch() {
    // Implementar modal o popup de búsqueda
    const searchTerm = prompt('Ingrese el código o descripción a buscar:');
    if (!searchTerm) return;

    try {
        const response = await fetch(`/api/buscar_productos_editar?buscar=${encodeURIComponent(searchTerm)}`);
        const productos = await response.json();
        
        if (productos.length === 0) {
            alert('No se encontraron productos');
            return;
        }

        // Si hay más de uno, permitir seleccionar
        let selectedId;
        if (productos.length === 1) {
            selectedId = productos[0].IdReferencia;
        } else {
            const options = productos.map(p => `${p.IdReferencia} - ${p.Referencia}`);
            const selected = prompt('Seleccione un producto:\n\n' + options.join('\n'));
            if (!selected) return;
            selectedId = selected.split(' - ')[0];
        }

        // Cargar los datos del producto seleccionado
        const detalleResponse = await fetch(`/api/buscar_productos_editar/${selectedId}`);
        const detalle = await detalleResponse.json();
        fillForm(detalle);
        handleEdit();
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        alert('Error al buscar productos');
    }
}

// Funciones auxiliares
function validateForm() {
    return codigoInput.value.trim() !== '' && 
           descripcionInput.value.trim() !== '' && 
           grupoSelect.value !== '' &&
           unidadSelect.value !== '';
}

function clearForm() {
    form.reset();
    activoCheck.checked = true;
    subgrupoSelect.innerHTML = '<option value="">Seleccione un SubGrupo</option>';
    subcategoriaSelect.innerHTML = '<option value="">Seleccione una SubCategoría</option>';
}

// Función para habilitar/deshabilitar formulario
function enableForm(enabled) {
    const formElements = form.elements;
    for (let element of formElements) {
        // No deshabilitar checkboxes si estamos en modo edición
        if (element.type === 'checkbox' && currentState.mode === 'edit') {
            continue;
        }
        element.disabled = !enabled;
    }
    
    // Elementos dependientes
    subgrupoSelect.disabled = !enabled || !grupoSelect.value;
    subcategoriaSelect.disabled = !enabled || !subgrupoSelect.value;
    
    // El código siempre está deshabilitado en edición
    if (currentState.mode === 'edit') {
        codigoInput.disabled = true;
    }
}

// Función para configurar estados de los botones
function setButtonStates() {
    const isViewMode = currentState.mode === 'view';
    const hasProduct = currentState.currentProduct !== null;
    
    newButton.disabled = !isViewMode;
    saveButton.disabled = isViewMode;
    editButton.disabled = !isViewMode || !hasProduct;
    cancelButton.disabled = isViewMode;
    searchButton.disabled = !isViewMode;

    // Aplicar clases visuales
    [newButton, saveButton, editButton, cancelButton, searchButton].forEach(button => {
        if (button.disabled) {
            button.classList.add('disabled');
        } else {
            button.classList.remove('disabled');
        }
    });
}

function calcularPrecioVenta() {
    const costo = parseFloat(costoInput.value) || 0;
    const iva = parseFloat(ivaInput.value) || 0;
    
    // Ejemplo de cálculo: costo + 30% de margen + IVA
    const margen = 0.30;
    const precioSinIva = costo * (1 + margen);
    const precioConIva = precioSinIva * (1 + (iva / 100));
    
    precioVenta1Input.value = precioConIva.toFixed(2);
}

function populateSelect(select, data, valueKey, textKey) {
    const defaultOption = select.querySelector('option:first-child');
    select.innerHTML = '';
    select.appendChild(defaultOption);
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = `${item[valueKey]} - ${item[textKey]}`;
        select.appendChild(option);
    });
}



function setInitialState() {
    currentState = {
        mode: 'view',
        currentProduct: null,
        isDirty: false
    };
    
    // Inicializar la interfaz en modo lectura
    enableForm(false);
    setButtonStates();
    clearForm();
}

function fillForm(data) {
    codigoInput.value = data.IdReferencia;
    descripcionInput.value = data.Referencia;
    grupoSelect.value = data.IdGrupo;
    costoInput.value = data.Costo;
    precioVenta1Input.value = data.PrecioVenta1;
    ivaInput.value = data.IVA;
    ubicacionInput.value = data.Ubicacion;
    marcaInput.value = data.Marca;
    esServicioCheck.checked = data.Tipo;
    activoCheck.checked = data.Estado;
    compuestoCheck.checked = data.compuesto;
    agotadoCheck.checked = data.productoagotado;
    modificaPrecioCheck.checked = data.modificaprecio;
    
    // Cargar datos dependientes
    loadSubgrupos().then(() => {
        subgrupoSelect.value = data.idsubgrupo;
        return loadSubcategorias();
    }).then(() => {
        subcategoriaSelect.value = data.idsubcategoria;
    });
    
    unidadSelect.value = data.IdUnidad;
    bodegaSelect.value = data.idbodega;
    estadoProductoSelect.value = data.EstadoProducto;
}

// Función para manejar la búsqueda de productos
async function handleSearch() {
    const modal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const tbody = document.querySelector('#productsTable tbody');
    const closeBtn = document.querySelector('.close');

    // Función para cargar productos
    async function loadProducts(searchTerm = '') {
        try {
            const response = await fetch(`/api/buscar_productos_editar?buscar=${encodeURIComponent(searchTerm)}`);
            const productos = await response.json();
            
            tbody.innerHTML = productos.length ? productos.map(p => `
                <tr>
                    <td>${p.IdReferencia}</td>
                    <td>${p.Referencia}</td>
                    <td>${p.IdGrupo || ''}</td>
                    <td>${p.IdUnidad || ''}</td>
                    <td>
                        <button class="btn-select" onclick="selectProduct('${p.IdReferencia}')">
                            Seleccionar
                        </button>
                    </td>
                </tr>
            `).join('') : '<tr class="no-results"><td colspan="5">No se encontraron productos</td></tr>';
        } catch (error) {
            console.error('Error al cargar productos:', error);
            tbody.innerHTML = '<tr class="no-results"><td colspan="5">Error al cargar productos</td></tr>';
        }
    }

    // Limpiar y mostrar modal
    searchInput.value = '';
    modal.style.display = 'block';
    
    // Cargar productos iniciales
    await loadProducts();

    // Configurar búsqueda con debounce
    let timeoutId;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => loadProducts(e.target.value), 300);
    });

    // Manejar el cierre del modal
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        searchInput.value = '';
    };

    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            searchInput.value = '';
        }
    };

    // Enfocar el input de búsqueda
    searchInput.focus();
}

// Función para seleccionar un producto
async function selectProduct(idReferencia) {
    try {
        const response = await fetch(`/api/buscar_productos_editar/${idReferencia}`);
        if (!response.ok) throw new Error('Error al obtener los datos del producto');
        
        const detalle = await response.json();
        fillForm(detalle);
        currentState.mode = 'view';
        currentState.currentProduct = detalle;
        currentState.isDirty = false;
        document.getElementById('searchModal').style.display = 'none';
        
        enableForm(false);
        setButtonStates();
        
    } catch (error) {
        console.error('Error al cargar detalles del producto:', error);
        alert('Error al cargar los detalles del producto');
    }
}

// Hacer la función selectProduct global
window.selectProduct = selectProduct;

// Inicializar los íconos de Lucide
lucide.createIcons();