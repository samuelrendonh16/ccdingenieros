document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const btnNuevo = document.getElementById('btn-nuevo');
    const btnGuardar = document.getElementById('btn-guardar');
    const btnEditar = document.getElementById('btn-editar');
    const btnEliminar = document.getElementById('btn-eliminar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const form = document.querySelector('.bodegas-form');
    const tabla = document.querySelector('.bodegas-table tbody');
    const inputBuscar = document.getElementById('buscar');

    // Variables de estado
    let modo = 'lectura'; // 'lectura', 'nuevo', 'edicion'
    let bodegaSeleccionada = null;
    let bodegasData = [];

    // Inicialización
    inicializarBotones();
    cargarBodegas();
    inicializarIconos();

    // Inicializar iconos de Lucide
    function inicializarIconos() {
        lucide.createIcons();
    }

    // Configuración inicial de botones
    function inicializarBotones() {
        btnNuevo.addEventListener('click', iniciarNuevo);
        btnGuardar.addEventListener('click', guardarBodega);
        btnEditar.addEventListener('click', iniciarEdicion);
        btnEliminar.addEventListener('click', eliminarBodega);
        btnCancelar.addEventListener('click', cancelarOperacion);
        inputBuscar.addEventListener('input', filtrarBodegas);

        actualizarEstadoBotones();
    }

    // Actualizar estado de los botones según el modo
    function actualizarEstadoBotones() {
        switch (modo) {
            case 'lectura':
                btnNuevo.disabled = false;
                btnGuardar.disabled = true;
                btnEditar.disabled = !bodegaSeleccionada;
                btnEliminar.disabled = !bodegaSeleccionada;
                btnCancelar.disabled = true;
                habilitarFormulario(false);
                break;
            case 'nuevo':
            case 'edicion':
                btnNuevo.disabled = true;
                btnGuardar.disabled = false;
                btnEditar.disabled = true;
                btnEliminar.disabled = true;
                btnCancelar.disabled = false;
                habilitarFormulario(true);
                break;
        }
    }

    // Habilitar/deshabilitar campos del formulario
    function habilitarFormulario(habilitar) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = !habilitar;
            if (habilitar && modo === 'edicion' && input.id === 'codigo') {
                input.disabled = true; // El código no se puede editar
            }
        });
    }

    // Limpiar formulario
    function limpiarFormulario() {
        form.reset();
        document.getElementById('estado').checked = true;
    }

    // Cargar datos de bodegas
    async function cargarBodegas() {
        try {
            const response = await fetch('/api/bodegas');
            if (!response.ok) throw new Error('Error al cargar bodegas');
            
            bodegasData = await response.json();
            actualizarTablaBodegas(bodegasData);
        } catch (error) {
            mostrarError('Error al cargar las bodegas', error);
        }
    }

    // Actualizar tabla de bodegas
    function actualizarTablaBodegas(bodegas) {
        tabla.innerHTML = '';
        bodegas.forEach(bodega => {
            const row = tabla.insertRow();
            row.innerHTML = `
                <td>${bodega.IdBodega}</td>
                <td>${bodega.Descripcion}</td>
                <td>${bodega.Estado ? 'Activo' : 'Inactivo'}</td>
                <td>${bodega.Email || ''}</td>
                <td>${bodega.nombrepunto || ''}</td>
                <td>${bodega.direccionpunto || ''}</td>
                <td>${bodega.telefonopunto || ''}</td>
                <td>${bodega.Encargado || ''}</td>
            `;
            row.addEventListener('click', () => seleccionarBodega(bodega));
        });
    }

    // Filtrar bodegas
    function filtrarBodegas() {
        const texto = inputBuscar.value.toLowerCase();
        const bodegasFiltradas = bodegasData.filter(bodega => 
            bodega.IdBodega.toLowerCase().includes(texto) ||
            bodega.Descripcion.toLowerCase().includes(texto)
        );
        actualizarTablaBodegas(bodegasFiltradas);
    }

    // Seleccionar bodega
    function seleccionarBodega(bodega) {
        bodegaSeleccionada = bodega;
        mostrarDatosBodega(bodega);
        actualizarEstadoBotones();
        
        // Resaltar fila seleccionada
        const filas = tabla.querySelectorAll('tr');
        filas.forEach(fila => fila.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
    }

    // Mostrar datos de la bodega en el formulario
    function mostrarDatosBodega(bodega) {
        document.getElementById('codigo').value = bodega.IdBodega;
        document.getElementById('descripcion').value = bodega.Descripcion;
        document.getElementById('estado').checked = bodega.Estado;
        document.getElementById('email').value = bodega.Email || '';
        document.getElementById('nombre-punto').value = bodega.nombrepunto || '';
        document.getElementById('direccion-punto').value = bodega.direccionpunto || '';
        document.getElementById('telefono-punto').value = bodega.telefonopunto || '';
        document.getElementById('encargado').value = bodega.Encargado || '';
    }

    // Iniciar nuevo registro
    function iniciarNuevo() {
        modo = 'nuevo';
        bodegaSeleccionada = null;
        limpiarFormulario();
        actualizarEstadoBotones();
    }

    // Iniciar edición
    function iniciarEdicion() {
        if (!bodegaSeleccionada) return;
        modo = 'edicion';
        actualizarEstadoBotones();
    }

    // Guardar bodega
    async function guardarBodega() {
        if (!validarFormulario()) return;

        const bodegaData = {
            IdBodega: document.getElementById('codigo').value,
            Descripcion: document.getElementById('descripcion').value,
            Estado: document.getElementById('estado').checked,
            Email: document.getElementById('email').value,
            nombrepunto: document.getElementById('nombre-punto').value,
            direccionpunto: document.getElementById('direccion-punto').value,
            telefonopunto: document.getElementById('telefono-punto').value,
            Encargado: document.getElementById('encargado').value
        };

        try {
            const url = '/api/bodegas';
            const method = modo === 'nuevo' ? 'POST' : 'PUT';
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodegaData)
            });

            if (!response.ok) throw new Error('Error al guardar la bodega');

            await cargarBodegas();
            modo = 'lectura';
            actualizarEstadoBotones();
            mostrarExito('Bodega guardada exitosamente');
        } catch (error) {
            mostrarError('Error al guardar la bodega', error);
        }
    }

    // Eliminar bodega
    async function eliminarBodega() {
        if (!bodegaSeleccionada) return;

        try {
            const confirmacion = await Swal.fire({
                title: '¿Está seguro?',
                text: "Esta acción no se puede revertir",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (!confirmacion.isConfirmed) return;

            const response = await fetch(`/api/bodegas/${bodegaSeleccionada.IdBodega}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar la bodega');

            await cargarBodegas();
            bodegaSeleccionada = null;
            limpiarFormulario();
            modo = 'lectura';
            actualizarEstadoBotones();
            mostrarExito('Bodega eliminada exitosamente');
        } catch (error) {
            mostrarError('Error al eliminar la bodega', error);
        }
    }

    // Cancelar operación
    function cancelarOperacion() {
        modo = 'lectura';
        if (bodegaSeleccionada) {
            mostrarDatosBodega(bodegaSeleccionada);
        } else {
            limpiarFormulario();
        }
        actualizarEstadoBotones();
    }

    // Validar formulario
    function validarFormulario() {
        const codigo = document.getElementById('codigo').value;
        const descripcion = document.getElementById('descripcion').value;

        if (!codigo || !descripcion) {
            mostrarError('Validación', 'Los campos Código y Descripción son obligatorios');
            return false;
        }

        const email = document.getElementById('email').value;
        if (email && !validarEmail(email)) {
            mostrarError('Validación', 'El formato del email no es válido');
            return false;
        }

        return true;
    }

    // Validar email
    function validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Mostrar mensaje de éxito
    function mostrarExito(mensaje) {
        Swal.fire({
            title: '¡Éxito!',
            text: mensaje,
            icon: 'success',
            confirmButtonText: 'Aceptar'
        });
    }

    // Mostrar mensaje de error
    function mostrarError(titulo, error) {
        Swal.fire({
            title: titulo,
            text: error.message || 'Ha ocurrido un error',
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
        console.error(error);
    }
});