// Estado global
let currentMode = 'view'; // 'view', 'edit', 'new'
let selectedRow = null;

// Elementos del DOM
const form = document.querySelector('.subcategorias-form');
const codigoInput = document.getElementById('codigo');
const descripcionInput = document.getElementById('descripcion');
const grupoSelect = document.getElementById('grupo');
const subgrupoSelect = document.getElementById('subgrupo');
const estadoCheckbox = document.getElementById('estado');
const buscarInput = document.getElementById('buscar');
const tbody = document.querySelector('.subcategorias-table tbody');

// Botones
const newButton = document.querySelector('.btn-primary');
const saveButton = document.querySelector('.btn-secondary:nth-child(2)');
const editButton = document.querySelector('.btn-secondary:nth-child(3)');
const deleteButton = document.querySelector('.btn-danger');
const cancelButton = document.querySelector('.btn-secondary:nth-child(5)');
const closeButton = document.querySelector('.btn-secondary:last-child');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadGrupos();
    await loadSubcategorias();
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
    
    grupoSelect.addEventListener('change', loadSubgruposForGrupo);
    buscarInput.addEventListener('input', handleSearch);
    tbody.addEventListener('click', handleRowClick);
}

// Carga de datos
async function loadGrupos() {
    try {
        const response = await fetch('/api/grupos_subcategorias');
        const grupos = await response.json();
        
        grupoSelect.innerHTML = '<option value="">Seleccione un Grupo</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.IdGrupo;
            option.textContent = `${grupo.IdGrupo} - ${grupo.Grupo}`;
            grupoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        alert('Error al cargar los grupos');
    }
}

async function loadSubgruposForGrupo() {
    const grupoId = grupoSelect.value;
    if (!grupoId) {
        subgrupoSelect.innerHTML = '<option value="">Seleccione un SubGrupo</option>';
        subgrupoSelect.disabled = true;
        return;
    }

    try {
        const response = await fetch(`/api/subgrupos/${grupoId}`);
        const subgrupos = await response.json();
        
        subgrupoSelect.innerHTML = '<option value="">Seleccione un SubGrupo</option>';
        subgrupos.forEach(subgrupo => {
            const option = document.createElement('option');
            option.value = subgrupo.IdSubgrupo;
            option.textContent = `${subgrupo.IdSubgrupo} - ${subgrupo.Subgrupo}`;
            subgrupoSelect.appendChild(option);
        });
        subgrupoSelect.disabled = false;
    } catch (error) {
        console.error('Error al cargar subgrupos:', error);
        alert('Error al cargar los subgrupos');
    }
}

async function loadSubcategorias() {
    try {
        const response = await fetch('/api/subcategorias');
        const subcategorias = await response.json();
        
        tbody.innerHTML = '';
        subcategorias.forEach(subcategoria => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${subcategoria.idsubcategoria}</td>
                <td>${subcategoria.categoria}</td>
                <td>${subcategoria.idgrupo}</td>
                <td>${subcategoria.idsubgrupo}</td>
                <td>${subcategoria.estado ? 'Activo' : 'Inactivo'}</td>
            `;
        });
    } catch (error) {
        console.error('Error al cargar subcategorías:', error);
        alert('Error al cargar las subcategorías');
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

    const subcategoriaData = {
        idsubcategoria: codigoInput.value,
        categoria: descripcionInput.value,
        idgrupo: grupoSelect.value,
        idsubgrupo: subgrupoSelect.value,
        estado: estadoCheckbox.checked
    };

    try {
        const url = currentMode === 'edit' ? `/api/subcategorias/${codigoInput.value}` : '/api/subcategorias';
        const method = currentMode === 'edit' ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subcategoriaData)
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            await loadSubcategorias();
            handleCancel();
        } else {
            alert(`Error: ${data.message || 'No se pudo guardar la subcategoría'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la subcategoría');
    }
}

async function handleEdit() {
    if (!selectedRow) {
        alert('Por favor seleccione una subcategoría para editar');
        return;
    }
    currentMode = 'edit';
    enableForm(true);
    codigoInput.disabled = true;
    setButtonStates();
}

async function handleDelete() {
    if (!selectedRow) {
        alert('Por favor seleccione una subcategoría para eliminar');
        return;
    }

    if (!confirm('¿Está seguro de que desea eliminar esta subcategoría?')) {
        return;
    }

    const codigo = selectedRow.cells[0].textContent;

    try {
        const response = await fetch(`/api/subcategorias/${codigo}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            await loadSubcategorias();
            handleCancel();
        } else {
            alert(`Error: ${data.message || 'No se pudo eliminar la subcategoría'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la subcategoría');
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
           descripcionInput.value.trim() !== '' && 
           grupoSelect.value !== '' &&
           subgrupoSelect.value !== '';
}

function clearForm() {
    form.reset();
    codigoInput.value = '';
    descripcionInput.value = '';
    grupoSelect.value = '';
    subgrupoSelect.value = '';
    subgrupoSelect.disabled = true;
    estadoCheckbox.checked = true;
}

function enableForm(enabled) {
    codigoInput.disabled = !enabled || currentMode === 'edit';
    descripcionInput.disabled = !enabled;
    grupoSelect.disabled = !enabled;
    subgrupoSelect.disabled = !enabled || !grupoSelect.value;
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

async function fillFormFromRow(row) {
    codigoInput.value = row.cells[0].textContent;
    descripcionInput.value = row.cells[1].textContent;
    grupoSelect.value = row.cells[2].textContent;
    await loadSubgruposForGrupo(); // Cargar subgrupos antes de establecer el valor
    subgrupoSelect.value = row.cells[3].textContent;
    estadoCheckbox.checked = row.cells[4].textContent === 'Activo';
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