// Estado global
let currentMode = 'view'; // 'view', 'edit', 'new'
let selectedRow = null;

// Elementos del DOM
const form = document.querySelector('.grupos-form');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const estadoCheckbox = document.querySelector('input[name="estado"]');
const buscarInput = document.getElementById('buscar');
const tbody = document.querySelector('.grupos-table tbody');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const cancelButton = document.querySelector('.btn-secondary:nth-child(4)');
const closeButton = document.querySelector('.btn-secondary:nth-child(5)');
const deleteButton = document.querySelector('.btn-danger');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadGrupos();
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

// Funciones de manejo de eventos
async function handleNew() {
    currentMode = 'new';
    clearForm();
    enableForm(true);
    setButtonStates();
    selectedRow = null;
    unhighlightAllRows();
}

async function handleSave() {
    if (!validateForm()) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor complete todos los campos requeridos'
        });
        return;
    }

    try {
        const grupoData = {
            codigo: codigoInput.value.trim(),
            descripcion: descripcionInput.value.trim(),
            estado: estadoCheckbox.checked,
            menupos: 0
        };

        const method = currentMode === 'new' ? 'POST' : 'PUT';
        const url = '/api/grupos' + (currentMode === 'edit' ? `/${grupoData.codigo}` : '');
        
        console.log('Enviando solicitud:', {
            method,
            url,
            data: grupoData
        });

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(grupoData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar el grupo');
        }

        const data = await response.json();
        
        await Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: data.message
        });

        await loadGrupos();
        handleCancel();

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al guardar el grupo'
        });
    }
}

async function handleEdit() {
    if (!selectedRow) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor seleccione un grupo para editar'
        });
        return;
    }
    currentMode = 'edit';
    enableForm(true);
    codigoInput.disabled = true; // El código no se puede editar
    setButtonStates();
}

async function handleDelete() {
    if (!selectedRow) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor seleccione un grupo para eliminar'
        });
        return;
    }

    const result = await Swal.fire({
        title: '¿Está seguro?',
        text: "¡No podrá revertir esta acción!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            // Obtener el código del grupo seleccionado
            const codigo = selectedRow.cells[0].textContent;
            
            // Realizar la solicitud DELETE
            const response = await fetch(`/api/grupos/${codigo}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el grupo');
            }

            const data = await response.json();
            
            Swal.fire({
                icon: 'success',
                title: 'Eliminado!',
                text: data.message || 'El grupo ha sido eliminado.'
            });

            // Recargar la lista de grupos y limpiar la selección
            await loadGrupos();
            handleCancel();
            
        } catch (error) {
            console.error('Error al eliminar:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo eliminar el grupo'
            });
        }
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

    // Remover selección previa
    unhighlightAllRows();
    
    // Aplicar nueva selección
    row.classList.add('selected');
    selectedRow = row;

    // Llenar el formulario
    codigoInput.value = row.cells[0].textContent;
    descripcionInput.value = row.cells[1].textContent;
    estadoCheckbox.checked = row.cells[2].textContent.trim() === 'Activo';

    // Actualizar estado de los botones
    setButtonStates();

    console.log('Fila seleccionada:', {
        codigo: row.cells[0].textContent,
        descripcion: row.cells[1].textContent,
        estado: row.cells[2].textContent
    });
}

// Funciones auxiliares
async function loadGrupos() {
    try {
        const response = await fetch('/api/grupos');
        if (!response.ok) throw new Error('Error al cargar los grupos');
        
        const grupos = await response.json();
        
        tbody.innerHTML = '';
        grupos.forEach(grupo => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${grupo.codigo}</td>
                <td>${grupo.descripcion}</td>
                <td>${grupo.estado ? 'Activo' : 'Inactivo'}</td>
                <td>${grupo.menupos || 0}</td>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar los grupos'
        });
    }
}

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