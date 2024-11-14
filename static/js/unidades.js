// Estado global
let currentMode = 'view'; // 'view', 'edit', 'new'
let selectedRow = null;

// Elementos del DOM
const form = document.querySelector('.unidades-form');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const estadoCheckbox = document.getElementById('estado');
const tbody = document.querySelector('.unidades-table tbody');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const cancelButton = document.querySelector('.btn-secondary:nth-child(4)');
const closeButton = document.querySelector('.btn-secondary:last-child');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadUnidades();
    setupEventListeners();
    setInitialState();
});

// Configuración de event listeners
function setupEventListeners() {
    newButton.addEventListener('click', handleNew);
    saveButton.addEventListener('click', handleSave);
    editButton.addEventListener('click', handleEdit);
    cancelButton.addEventListener('click', handleCancel);
    closeButton.addEventListener('click', () => window.location.href = '/maestros');
    tbody.addEventListener('click', handleRowClick);
}

// Carga de datos
async function loadUnidades() {
    try {
        const response = await fetch('/api/unidades');
        const unidades = await response.json();
        
        tbody.innerHTML = '';
        unidades.forEach(unidad => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${unidad.IdUnidad}</td>
                <td>${unidad.Unidad}</td>
                <td>${unidad.Estado ? 'Activo' : 'Inactivo'}</td>
            `;
        });
    } catch (error) {
        console.error('Error al cargar unidades:', error);
        alert('Error al cargar las unidades');
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

    const unidadData = {
        IdUnidad: codigoInput.value,
        Unidad: descripcionInput.value,
        Estado: estadoCheckbox.checked
    };

    try {
        const response = await fetch('/api/unidades', {
            method: currentMode === 'new' ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(unidadData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            await loadUnidades();
            handleCancel();
        } else {
            throw new Error(data.error || 'Error al guardar la unidad');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function handleEdit() {
    if (!selectedRow) {
        alert('Por favor seleccione una unidad para editar');
        return;
    }
    currentMode = 'edit';
    enableForm(true);
    codigoInput.disabled = true; // No permitir editar el código en modo edición
    setButtonStates();
}

function handleCancel() {
    currentMode = 'view';
    clearForm();
    enableForm(false);
    setButtonStates();
    selectedRow = null;
    unhighlightAllRows();
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