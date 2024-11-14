// Estado global
let currentMode = 'view'; // 'view', 'edit', 'new'
let selectedRow = null;

// Elementos del DOM
const form = document.querySelector('.subgrupos-form');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const grupoSelect = document.getElementById('grupo');
const estadoCheckbox = document.getElementById('estado');
const tbody = document.querySelector('.subgrupos-table tbody');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const cancelButton = document.querySelector('.btn-secondary:nth-child(4)');
const closeButton = document.querySelector('.btn-secondary:nth-child(5)');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadGrupos(),
        loadSubgrupos()
    ]);
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
async function loadGrupos() {
    try {
        const response = await fetch('/api/obtener_grupos_subgrupos');
        const grupos = await response.json();
        
        grupoSelect.innerHTML = '<option value="">Seleccione el Grupo</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.codigo;
            option.textContent = `${grupo.codigo} - ${grupo.descripcion}`;
            grupoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        alert('Error al cargar los grupos');
    }
}

async function loadSubgrupos() {
    try {
        const response = await fetch('/api/subgrupos');
        const subgrupos = await response.json();
        
        tbody.innerHTML = '';
        subgrupos.forEach(subgrupo => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${subgrupo.IdSubgrupo}</td>
                <td>${subgrupo.Subgrupo}</td>
                <td>${subgrupo.IdGrupo}</td>
                <td>${subgrupo.Estado ? 'Activo' : 'Inactivo'}</td>
            `;
        });
    } catch (error) {
        console.error('Error al cargar subgrupos:', error);
        alert('Error al cargar los subgrupos');
    }
}

// Manejadores de eventos
async function handleNew() {
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

    const subgrupoData = {
        IdSubgrupo: codigoInput.value,
        Subgrupo: descripcionInput.value,
        IdGrupo: grupoSelect.value,
        Estado: estadoCheckbox.checked
    };

    try {
        const response = await fetch('/api/subgrupos', {
            method: currentMode === 'new' ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subgrupoData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            await loadSubgrupos();
            handleCancel();
        } else {
            alert(`Error: ${data.message || 'No se pudo guardar el subgrupo'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el subgrupo');
    }
}

async function handleEdit() {
    if (!selectedRow) {
        alert('Por favor seleccione un subgrupo para editar');
        return;
    }
    currentMode = 'edit';
    enableForm(true);
    codigoInput.disabled = true; // No permitir editar el código
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
           descripcionInput.value.trim() !== '' && 
           grupoSelect.value !== '';
}

function clearForm() {
    form.reset();
    codigoInput.value = '';
    descripcionInput.value = '';
    grupoSelect.value = '';
    estadoCheckbox.checked = true;
}

function enableForm(enabled) {
    codigoInput.disabled = !enabled || currentMode === 'edit';
    descripcionInput.disabled = !enabled;
    grupoSelect.disabled = !enabled;
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
    grupoSelect.value = row.cells[2].textContent;
    estadoCheckbox.checked = row.cells[3].textContent === 'Activo';
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