document.addEventListener('DOMContentLoaded', function() {
    const licenciaForm = document.getElementById('licenciaForm');
    const solicitarLicenciaBtn = document.getElementById('solicitarLicenciaBtn');
    const tipolicenciaSelect = document.getElementById('tipolicencia');
    const fechaVencimientoGroup = document.getElementById('fechaVencimientoGroup');
    const baseUrl = 'http://194.163.45.32:81';

    licenciaForm.addEventListener('submit', function(e) {
        e.preventDefault();
        solicitarLicencia();
    });

    solicitarLicenciaBtn.addEventListener('click', function(e) {
        e.preventDefault();
        solicitarLicencia();
    });

    function solicitarLicencia() {
        const formData = new FormData(licenciaForm);
        const data = Object.fromEntries(formData.entries());
        
        const camposRequeridos = ['nit', 'razonsocial', 'nombrecomercial', 'ubicacioncomercial', 'ciudad', 'telefono', 'version', 'cantidadusuario', 'tipolicencia'];
        
        for (const campo of camposRequeridos) {
            if (!data[campo]) {
                Swal.fire(`El campo ${campo} es requerido y no puede estar vacío`);
                return;
            }
        }

        if (data.tipolicencia === 'RENTA' && !data.fechaVencimiento) {
            Swal.fire('Para licencias de RENTA, la fecha de vencimiento es obligatoria');
            return;
        }
    
        if (data.tipolicencia === 'COMPRA') {
            delete data.fechaVencimiento;
        }

        data.caracteristicas_equipo = obtenerCaracteristicasEquipo();

        console.log('Datos a enviar:', data);  // Para depuración

        fetch(`${baseUrl}/api/solicitar_licencia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(handleResponse)
        .then(data => {
            if (data.success) {
                Swal.fire('Licencia generada exitosamente. Por favor, revise su correo electrónico.');
                mostrarModalVerificacion(data.licencia.numerolicencia);
            } else {
                throw new Error(data.message || 'Error desconocido al generar la licencia');
            }
        })
        .catch(handleError);
    }

    function mostrarModalVerificacion(numeroLicencia) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="licenciaModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Verificar Licencia</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Su número de licencia es: ${'•'.repeat(numeroLicencia.length)}</p>
                            <input type="text" id="licenciaInput" class="form-control" placeholder="Ingrese el código de licencia">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" id="verificarLicencia">Verificar Licencia</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    
        const modalElement = document.getElementById('licenciaModal');
        const bsModal = new bootstrap.Modal(modalElement);
        bsModal.show();
    
        document.getElementById('verificarLicencia').addEventListener('click', function() {
            const licenciaIngresada = document.getElementById('licenciaInput').value;
            verificarLicencia(licenciaIngresada, numeroLicencia);
        });
    }

    function verificarLicencia(licenciaIngresada, numeroLicenciaGenerado) {
        console.log('Licencia ingresada:', licenciaIngresada);
        console.log('Número de licencia generado:', numeroLicenciaGenerado);

        const nit = document.querySelector('input[name="nit"]').value;
        const data = { 
            licencia: licenciaIngresada,
            nit: nit,
            caracteristicas_equipo: obtenerCaracteristicasEquipo()
        };
    
        fetch(`${baseUrl}/api/verificar_licencia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(handleResponse)
        .then(data => {
            console.log('Respuesta del servidor:', data);
            if (data.valida) {
                Swal.fire('Licencia válida. Redirigiendo al login...');
                const modal = bootstrap.Modal.getInstance(document.getElementById('licenciaModal'));
                modal.hide();
                window.location.href = data.redirect_url;
            } else {
                Swal.fire('Licencia inválida. Por favor, intente nuevamente.');
            }
        })
        .catch(handleError);
    }

    tipolicenciaSelect.addEventListener('change', function() {
        if (this.value === 'COMPRA') {
            fechaVencimientoGroup.style.display = 'none';
        } else {
            fechaVencimientoGroup.style.display = 'flex';
        }
    });

    tipolicenciaSelect.dispatchEvent(new Event('change'));

    function obtenerCaracteristicasEquipo() {
        const navegador = navigator.userAgent;
        const plataforma = navigator.platform;
        const memoria = navigator.deviceMemory || 'Desconocida';
        const nucleos = navigator.hardwareConcurrency || 'Desconocido';
        const resolucion = `${screen.width}x${screen.height}`;
        const colorDepth = screen.colorDepth;
        
        const caracteristicas = `${navegador}|${plataforma}|${memoria}|${nucleos}|${resolucion}|${colorDepth}`;
        return btoa(caracteristicas);
    }

    function handleResponse(response) {
        console.log('Estado de la respuesta:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
            });
        }
        return response.json();
    }

    function handleError(error) {
        console.error('Error detallado:', error);
        Swal.fire(`Error: ${error.message}`);
    }
});