// Módulo principal de informes
const InformesSystem = {
    // Utilidades compartidas
    utils: {
        crearDialogo(contenidoHTML) {
            const dialog = document.createElement('div');
            dialog.className = 'dialogo-modal';
            dialog.innerHTML = `
                <div class="dialogo-contenido">
                    ${contenidoHTML}
                    <div class="dialogo-botones">
                        <button class="btn btn-primary" id="btn-aceptar">Aceptar</button>
                        <button class="btn btn-secondary" id="btn-cancelar">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
            return dialog;
        },

        async solicitarFechas() {
            return new Promise((resolve) => {
                const dialogHTML = `
                    <div class="fechas-selector">
                        <h3>Seleccione el rango de fechas</h3>
                        <div class="fecha-input">
                            <label for="fecha-inicio">Fecha Inicio:</label>
                            <input type="date" id="fecha-inicio" required>
                        </div>
                        <div class="fecha-input">
                            <label for="fecha-fin">Fecha Fin:</label>
                            <input type="date" id="fecha-fin" required>
                        </div>
                    </div>
                `;

                const dialog = this.crearDialogo(dialogHTML);
                const btnAceptar = dialog.querySelector('#btn-aceptar');
                const btnCancelar = dialog.querySelector('#btn-cancelar');

                const cerrarDialogo = (fechas = null) => {
                    document.body.removeChild(dialog);
                    resolve(fechas);
                };

                btnAceptar.addEventListener('click', () => {
                    const fechaInicio = dialog.querySelector('#fecha-inicio').value;
                    const fechaFin = dialog.querySelector('#fecha-fin').value;

                    if (!fechaInicio || !fechaFin) {
                        alert('Por favor, seleccione ambas fechas');
                        return;
                    }

                    cerrarDialogo({ inicio: fechaInicio, fin: fechaFin });
                });

                btnCancelar.addEventListener('click', () => cerrarDialogo());
            });
        },

        formatMoney(amount) {
            if (!amount) return '$0';
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            }).format(amount);
        },

        mostrarVentanaInforme(titulo, contenido) {
            const ventana = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
            ventana.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${titulo}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                            background-color: #f5f5f5;
                        }
                        .informe-container {
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            margin-bottom: 20px;
                        }
                        .informe-header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .informe-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 14px;
                        }
                        .informe-table th, .informe-table td {
                            border: 1px solid #ddd;
                            padding: 12px 8px;
                            text-align: left;
                        }
                        .informe-table th {
                            background-color: #4CAF50;
                            color: white;
                            font-weight: bold;
                        }
                        .informe-table tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .informe-table tr:hover {
                            background-color: #f5f5f5;
                        }
                        h1 {
                            color: #333;
                            margin-bottom: 20px;
                        }
                        @media print {
                            body {
                                background-color: white;
                            }
                            .informe-container {
                                box-shadow: none;
                            }
                            .informe-table th {
                                background-color: #ddd !important;
                                color: black !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="informe-container">
                        <div class="informe-header">
                            <h1>${titulo}</h1>
                        </div>
                        ${contenido}
                    </div>
                </body>
                </html>
            `);
        }
    },

    // Controladores de informes
    informes: {
        async comprasCostos() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;

            try {
                const response = await fetch(`/api/compras_costos_informes?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`);
                if (!response.ok) throw new Error('Error al obtener datos');
                
                const data = await response.json();
                if (!data.compras || !Array.isArray(data.compras)) {
                    throw new Error('Formato de datos inválido');
                }
                this.mostrarInformeComprasCostos(data.compras);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al cargar el informe de compras x costos');
            }
        },

        mostrarInformeComprasCostos(datos) {
            const contenido = `
                <table class="informe-table">
                    <thead>
                        <tr>
                            <th>Centro de Costos</th>
                            <th>NIT</th>
                            <th>Razón Social</th>
                            <th>Compra</th>
                            <th>Fra. Proveedor</th>
                            <th>Fecha</th>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Valor</th>
                            <th>Valor Sin IVA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.map(item => `
                            <tr>
                                <td>${item.CentroDeCostos || ''}</td>
                                <td>${item.Nit || ''}</td>
                                <td>${item.RazonSocial || ''}</td>
                                <td>${item.Compra || ''}</td>
                                <td>${item.FraProveedor || ''}</td>
                                <td>${item.Fecha || ''}</td>
                                <td>${item.Codigo || ''}</td>
                                <td>${item.Producto || ''}</td>
                                <td>${item.Cantidad || '0'}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Valor)}</td>
                                <td>${InformesSystem.utils.formatMoney(item.ValorSinIVA)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            InformesSystem.utils.mostrarVentanaInforme('Informe de Compras x Costos', contenido);
        },

        async informeCompras() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;

            try {
                const response = await fetch(`/api/informe_compras?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}&tipo=detalladas`);
                if (!response.ok) throw new Error('Error al obtener datos');
                
                const data = await response.json();
                if (!data.compras || !Array.isArray(data.compras)) {
                    throw new Error('Formato de datos inválido');
                }
                this.mostrarInformeCompras(data.compras);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al cargar el informe de compras');
            }
        },

        mostrarInformeCompras(datos) {
            const contenido = `
                <table class="informe-table">
                    <thead>
                        <tr>
                            <th>NIT</th>
                            <th>Razón Social</th>
                            <th>Número</th>
                            <th>Factura</th>
                            <th>Fecha</th>
                            <th>Referencia</th>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Valor</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.map(item => `
                            <tr>
                                <td>${item.Nit || ''}</td>
                                <td>${item.RazonSocial || ''}</td>
                                <td>${item.Numero || ''}</td>
                                <td>${item.NumFactura || ''}</td>
                                <td>${item.Fecha || ''}</td>
                                <td>${item.IdReferencia || ''}</td>
                                <td>${item.Descripcion || ''}</td>
                                <td>${item.Cantidad || '0'}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Valor)}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            InformesSystem.utils.mostrarVentanaInforme('Informe de Compras', contenido);
        },

        async entradasInventario() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;

            try {
                const response = await fetch(`/api/entradas_informes?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`);
                if (!response.ok) throw new Error('Error al obtener datos');
                
                const data = await response.json();
                if (!data.entradas || !Array.isArray(data.entradas)) {
                    throw new Error('Formato de datos inválido');
                }
                this.mostrarInformeEntradas(data.entradas);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al cargar el informe de entradas');
            }
        },

        mostrarInformeEntradas(datos) {
            const contenido = `
                <table class="informe-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Referencia</th>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Valor</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.map(item => `
                            <tr>
                                <td>${item.Numero || ''}</td>
                                <td>${item.Fecha || ''}</td>
                                <td>${item.IdReferencia || ''}</td>
                                <td>${item.Descripcion || ''}</td>
                                <td>${item.Cantidad || '0'}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Valor)}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            InformesSystem.utils.mostrarVentanaInforme('Informe de Entradas de Inventario', contenido);
        },

        async salidasInventario() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;

            try {
                const response = await fetch(`/api/salidas_inventario_informes?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`);
                if (!response.ok) throw new Error('Error al obtener datos');
                
                const data = await response.json();
                if (!data.salidas || !Array.isArray(data.salidas)) {
                    throw new Error('Formato de datos inválido');
                }
                this.mostrarInformeSalidas(data.salidas);
            } catch (error) {
                console.error('Error:', error);
                alert('Error al cargar el informe de salidas');
            }
        },

        mostrarInformeSalidas(datos) {
            const contenido = `
                <table class="informe-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Referencia</th>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Valor</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.map(item => `
                            <tr>
                                <td>${item.Numero || ''}</td>
                                <td>${item.Fecha || ''}</td>
                                <td>${item.IdReferencia || ''}</td>
                                <td>${item.Descripcion || ''}</td>
                                <td>${item.Cantidad || '0'}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Valor)}</td>
                                <td>${InformesSystem.utils.formatMoney(item.Total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            InformesSystem.utils.mostrarVentanaInforme('Informe de Salidas de Inventario', contenido);
        }
    },

    // Exportación a Excel
    exportacion: {
        async comprasCostosExcel() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;
            
            window.location.href = `/api/exportar_compras_costos_excel?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`;
        },

        async comprasExcel() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;window.location.href = `/api/exportar_informe_compras_excel?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}&tipo=detalladas`;
        },

        async entradasExcel() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;
            
            try {
                window.location.href = `/api/exportar_entradas_excel?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`;
            } catch (error) {
                console.error('Error al exportar entradas:', error);
                alert('Error al exportar el informe de entradas a Excel');
            }
        },

        async salidasExcel() {
            const fechas = await InformesSystem.utils.solicitarFechas();
            if (!fechas) return;
            
            try {
                window.location.href = `/api/exportar_salidas_excel?fecha_inicio=${fechas.inicio}&fecha_fin=${fechas.fin}`;
            } catch (error) {
                console.error('Error al exportar salidas:', error);
                alert('Error al exportar el informe de salidas a Excel');
            }
        }
    },

    // Inicialización y manejo de eventos
    init() {
        // Asignar eventos a los botones
        document.querySelectorAll('.informe-item').forEach(item => {
            const titulo = item.querySelector('h2').textContent.trim();
            const btnVerInforme = item.querySelector('button:first-of-type');
            const btnExportar = item.querySelector('button:last-of-type');

            // Asignar manejadores según el tipo de informe
            switch (titulo) {
                case 'Compras x Costos':
                    if (btnVerInforme) {
                        btnVerInforme.addEventListener('click', () => {
                            this.informes.comprasCostos.call(this.informes);
                        });
                    }
                    if (btnExportar) {
                        btnExportar.addEventListener('click', () => {
                            this.exportacion.comprasCostosExcel.call(this.exportacion);
                        });
                    }
                    break;

                case 'Informe de Compras':
                    if (btnVerInforme) {
                        btnVerInforme.addEventListener('click', () => {
                            this.informes.informeCompras.call(this.informes);
                        });
                    }
                    if (btnExportar) {
                        btnExportar.addEventListener('click', () => {
                            this.exportacion.comprasExcel.call(this.exportacion);
                        });
                    }
                    break;

                case 'Entradas de Inventario':
                    if (btnVerInforme) {
                        btnVerInforme.addEventListener('click', () => {
                            this.informes.entradasInventario.call(this.informes);
                        });
                    }
                    if (btnExportar) {
                        btnExportar.addEventListener('click', () => {
                            this.exportacion.entradasExcel.call(this.exportacion);
                        });
                    }
                    break;

                case 'Salidas de Inventario':
                    if (btnVerInforme) {
                        btnVerInforme.addEventListener('click', () => {
                            this.informes.salidasInventario.call(this.informes);
                        });
                    }
                    if (btnExportar) {
                        btnExportar.addEventListener('click', () => {
                            this.exportacion.salidasExcel.call(this.exportacion);
                        });
                    }
                    break;

                default:
                    console.warn(`Tipo de informe no reconocido: ${titulo}`);
            }
        });

        // Agregar listener para cerrar diálogos con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dialogos = document.querySelectorAll('.dialogo-modal');
                dialogos.forEach(dialogo => {
                    document.body.removeChild(dialogo);
                });
            }
        });
    },

    // Método para manejar errores de manera consistente
    manejarError(error, mensaje) {
        console.error(error);
        alert(mensaje || 'Ha ocurrido un error inesperado');
    }
};

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializar los íconos de Lucide si están disponibles
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        // Inicializar el sistema de informes
        InformesSystem.init();
    } catch (error) {
        console.error('Error al inicializar el sistema de informes:', error);
    }
});

// Exportar el módulo para uso en otros archivos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InformesSystem;
}