// Estado global
let currentMode = 'view'; // 'view', 'edit', 'new'
let selectedRow = null;

// Elementos del DOM
const form = document.querySelector('.estado-producto-form');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const estadoCheckbox = document.getElementById('estado');
const buscarInput = document.getElementById('buscar');
const tbody = document.querySelector('.estado-producto-table tbody');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const cancelButton = document.querySelector('.btn-secondary:nth-child(4)');
const closeButton = document.querySelector('.btn-secondary:nth-child(5)');
const deleteButton = document.querySelector('.btn-danger');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadEstadosProducto();
    setupEventListeners();
    setInitialState();
});

// Configuración de event listeners
function setupEventListeners() {
    newButton.addEventListener('click', handleNew);
    saveButton.addEventListener('click', handleSave);
    editButton.addEventListener('click', handleEdit);
    deleteButton.addEventListener('click', handleDelete);
    cancelButton.addEventListener('click', handleCancel);
    closeButton.addEventListener('click', () => window.location.href = '/maestros');
    
    buscarInput.addEventListener('input', handleSearch);
    tbody.addEventListener('click', handleRowClick);
}

// Carga de datos
async function loadEstadosProducto() {
    try {
        const response = await fetch('/api/estado_producto');
        const estados = await response.json();
        
        tbody.innerHTML = '';
        estados.forEach(estado => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${estado.IdEstadoProducto}</td>
                <td>${estado.EstadoProducto}</td>
                <td>${estado.Estado ? 'Activo' : 'Inactivo'}</td>
            `;
        });
    } catch (error) {
        console.error('Error al cargar estados de producto:', error);
        alert('Error al cargar los estados de producto');
    }
}

// Manejadores de eventos
function handleNew() {
    currentMode = 'new';
    clearForm();
    enableForm(true);
    setButtonStates();
}

async function handleSave() {
    if (!validateForm()) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }

    const estadoData = {
        IdEstadoProducto: codigoInput.value,
        EstadoProducto: descripcionInput.value,
        Estado: estadoCheckbox.checked
    };

    try {
        const url = currentMode === 'edit' 
            ? `/api/estado_producto/${codigoInput.value}`
            : '/api/estado_producto';
        
        const method = currentMode === 'edit' ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(estadoData)
        });

        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            await loadEstadosProducto();
            handleCancel();
        } else {
            throw new Error(data.message || 'Error al guardar el estado de producto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function handleEdit() {
    if (!selectedRow) {
        alert('Por favor seleccione un estado de producto para editar');
        return;
    }
    currentMode = 'edit';
    enableForm(true);
    codigoInput.disabled = true;
    setButtonStates();
}

async function handleDelete() {
    if (!selectedRow) {
        alert('Por favor seleccione un estado de producto para eliminar');
        return;
    }

    if (!confirm('¿Está seguro de que desea eliminar este estado de producto?')) {
        return;
    }

    const codigo = selectedRow.cells[0].textContent;

    try {
        const response = await fetch(`/api/estado_producto/${codigo}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            await loadEstadosProducto();
            handleCancel();
        } else {
            throw new Error(data.message || 'Error al eliminar el estado de producto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function handleCancel() {
    currentMode = 'view';
    clearForm();
    enableForm(false);
    setButtonStates();
    selectedRow = null;
    unhighlightAllRows();
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = tbody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
        const codigo = row.cells[0].textContent.toLowerCase();
        const descripcion = row.cells[1].textContent.toLowerCase();
        const visible = codigo.includes(searchTerm) || descripcion.includes(searchTerm);
        row.style.display = visible ? '' : 'none';
    });
}

function handleRowClick(event) {
    const row = event.target.closest('tr');
    if (!row) return;

    unhighlightAllRows();
    row.classList.add('selected');
    selectedRow = row;

    fillFormFromRow(row);
    setButtonStates();
}

// Funciones auxiliares
function validateForm() {
    return codigoInput.value.trim() !== '' && 
           descripcionInput.value.trim() !== '';
}

function clearForm() {
    form.reset();
    codigoInput.value = '';
    descripcionInput.value = '';
    estadoCheckbox.checked = true;
}

function enableForm(enabled) {
    codigoInput.disabled = !enabled || currentMode === 'edit';
    descripcionInput.disabled = !enabled;
    estadoCheckbox.disabled = !enabled;
}

function setButtonStates() {
    const isViewMode = currentMode === 'view';
    const hasSelection = selectedRow !== null;

    newButton.disabled = !isViewMode;
    saveButton.disabled = isViewMode;
    editButton.disabled = !isViewMode || !hasSelection;
    deleteButton.disabled = !isViewMode || !hasSelection;
    cancelButton.disabled = isViewMode;
}

function fillFormFromRow(row) {
    codigoInput.value = row.cells[0].textContent;
    descripcionInput.value = row.cells[1].textContent;
    estadoCheckbox.checked = row.cells[2].textContent === 'Activo';
}

function unhighlightAllRows() {
    const rows = tbody.getElementsByTagName('tr');
    Array.from(rows).forEach(row => row.classList.remove('selected'));
}

function setInitialState() {
    clearForm();
    enableForm(false);
    setButtonStates();
}

// Inicializar los íconos de Lucide
lucide.createIcons();