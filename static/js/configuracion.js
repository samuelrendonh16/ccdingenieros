// Seleccionar elementos del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar iconos Lucide
    lucide.createIcons();
    const form = document.getElementById('consecutivoForm');
    const btnNuevo = document.getElementById('btnNuevo');
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnBorrar = document.getElementById('btnBorrar');
    const tabla = document.getElementById('consecutivosTable');
    const buscarInput = document.getElementById('buscar');

    let modoEdicion = false;
    let consecutivoSeleccionado = null;

    // Cargar datos iniciales
    cargarConsecutivos();

    // Event Listeners
    btnNuevo.addEventListener('click', habilitarNuevoConsecutivo);
    btnEditar.addEventListener('click', habilitarEdicion);
    btnGuardar.addEventListener('click', guardarConsecutivo);
    btnBorrar.addEventListener('click', borrarConsecutivo);
    buscarInput.addEventListener('input', filtrarTabla);

    // Funciones principales
    function habilitarNuevoConsecutivo() {
        form.reset();
        habilitarFormulario(true);
        modoEdicion = false;
        btnGuardar.disabled = false;
    }

    function habilitarEdicion() {
        if (!consecutivoSeleccionado) {
            alert('Por favor, seleccione un consecutivo para editar');
            return;
        }
        habilitarFormulario(true);
        modoEdicion = true;
        btnGuardar.disabled = false;
    }

    async function guardarConsecutivo(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        const consecutivoData = {
            IdConsecutivo: document.getElementById('numero').value,
            Consecutivo: document.getElementById('descripcion').value,
            Formulario: document.getElementById('formulario').value,
            Prefijo: document.getElementById('prefijo').value,
            Desde: document.getElementById('desde').value,
            Hasta: document.getElementById('hasta').value,
            Actual: document.getElementById('actual').value,
            Resolucion: document.getElementById('resolucion').value,
            FechaInicioResolucion: document.getElementById('fechaResolucion').value,
            Observaciones: document.getElementById('observaciones').value,
            Activo: !document.getElementById('inactivo').checked,
            TipoDocumentoFactura: '',
            Tipo: ''
        };

        try {
            const url = '/api/consecutivos';
            const method = modoEdicion ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(consecutivoData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            alert(result.message);
            
            // Recargar datos y resetear formulario
            cargarConsecutivos();
            form.reset();
            habilitarFormulario(false);
            btnGuardar.disabled = true;

        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar el consecutivo: ' + error.message);
        }
    }

    async function borrarConsecutivo() {
        if (!consecutivoSeleccionado) {
            alert('Por favor, seleccione un consecutivo para eliminar');
            return;
        }

        if (!confirm('¿Está seguro de que desea eliminar este consecutivo?')) {
            return;
        }

        try {
            const response = await fetch(`/api/consecutivos/${consecutivoSeleccionado.IdConsecutivo}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            alert(result.message);
            cargarConsecutivos();
            form.reset();
            consecutivoSeleccionado = null;

        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar el consecutivo: ' + error.message);
        }
    }

    async function cargarConsecutivos() {
        try {
            const response = await fetch('/api/consecutivos');
            const consecutivos = await response.json();
            
            const tbody = tabla.querySelector('tbody');
            tbody.innerHTML = '';

            consecutivos.forEach(consecutivo => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${consecutivo.IdConsecutivo}</td>
                    <td>${consecutivo.Consecutivo}</td>
                    <td>${consecutivo.Formulario}</td>
                    <td>${consecutivo.Prefijo}</td>
                    <td>${consecutivo.Desde}</td>
                    <td>${consecutivo.Hasta}</td>
                    <td>${consecutivo.Actual}</td>
                    <td>${consecutivo.Resolucion || ''}</td>
                    <td>${consecutivo.FechaResolucion || ''}</td>
                    <td>${consecutivo.ObservacionesResolucion || ''}</td>
                    <td>${consecutivo.Estado ? 'Activo' : 'Inactivo'}</td>
                `;

                tr.addEventListener('click', () => seleccionarConsecutivo(consecutivo, tr));
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error al cargar consecutivos:', error);
            alert('Error al cargar los consecutivos');
        }
    }

    function seleccionarConsecutivo(consecutivo, tr) {
        // Remover selección anterior
        const selectedRow = tabla.querySelector('.selected-row');
        if (selectedRow) {
            selectedRow.classList.remove('selected-row');
        }

        // Marcar nueva selección
        tr.classList.add('selected-row');
        consecutivoSeleccionado = consecutivo;

        // Llenar formulario
        document.getElementById('numero').value = consecutivo.IdConsecutivo;
        document.getElementById('descripcion').value = consecutivo.Consecutivo;
        document.getElementById('formulario').value = consecutivo.Formulario;
        document.getElementById('prefijo').value = consecutivo.Prefijo;
        document.getElementById('desde').value = consecutivo.Desde;
        document.getElementById('hasta').value = consecutivo.Hasta;
        document.getElementById('actual').value = consecutivo.Actual;
        document.getElementById('resolucion').value = consecutivo.Resolucion || '';
        document.getElementById('fechaResolucion').value = consecutivo.FechaResolucion || '';
        document.getElementById('observaciones').value = consecutivo.ObservacionesResolucion || '';
        document.getElementById('inactivo').checked = !consecutivo.Estado;
    }

    function habilitarFormulario(habilitar) {
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.disabled = !habilitar;
        });
    }

    function validarFormulario() {
        const campos = ['numero', 'descripcion', 'formulario', 'prefijo', 'desde', 'hasta', 'actual'];
        return campos.every(campo => document.getElementById(campo).value.trim() !== '');
    }

    function filtrarTabla() {
        const textoBusqueda = buscarInput.value.toLowerCase();
        const filas = tabla.querySelectorAll('tbody tr');

        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            fila.style.display = texto.includes(textoBusqueda) ? '' : 'none';
        });
    }
});