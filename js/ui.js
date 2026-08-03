(function () {
    function actualizarInterfaz(entradaActiva) {
        const estadoActual = document.getElementById('estado-actual');
        const btnEntrada = document.getElementById('btn-entrada');
        const btnSalida = document.getElementById('btn-salida');

        if (entradaActiva) {
            const hora = new Date(parseInt(entradaActiva, 10)).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            estadoActual.innerHTML = '<span style="color:#e67e22">🟡 TRABAJANDO</span><br><small>Desde: ' + hora + '</small>';
            btnEntrada.disabled = true;
            btnSalida.disabled = false;
            return;
        }

        estadoActual.innerHTML = '<span style="color:#7f8c8d">⚪ FUERA DE TURNO</span>';
        btnEntrada.disabled = false;
        btnSalida.disabled = true;
    }

    function renderizarTabla(registros, festivos) {
        const tbody = document.querySelector('#tabla-registros tbody');
        tbody.innerHTML = '';

        const formateadorDia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });

        registros.forEach((turno, index) => {
            const fechaEntrada = new Date(turno.entrada);
            const nombreDia = formateadorDia.format(fechaEntrada);
            const esDomingo = fechaEntrada.getDay() === 0;
            const esFestivo = festivos.includes(fechaEntrada.toLocaleDateString('en-CA'));
            const colorTexto = (esDomingo || esFestivo) ? 'color: #e74c3c; font-weight: bold;' : '';

            const diffMinutos = (turno.salida - turno.entrada) / 60000;
            const horasEfectivas = (diffMinutos >= 240 ? diffMinutos - 40 : diffMinutos) / 60;

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td style="${colorTexto}">
                    <small style="display:block; text-transform: capitalize; font-size: 0.8em;">${nombreDia}</small>
                    ${fechaEntrada.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>${new Date(turno.salida).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td><b>${horasEfectivas.toFixed(2)}h</b></td>
                <td>
                    <button type="button" data-action="delete-turno" data-index="${index}" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold; width:auto; padding:0; margin:0;">✕</button>
                </td>
            `;

            tbody.appendChild(fila);
        });
    }

    function renderResumenPago(html) {
        const resumen = document.getElementById('resumen-pago');
        resumen.style.display = 'block';
        resumen.innerHTML = html;
    }

    window.NominaUI = {
        actualizarInterfaz,
        renderizarTabla,
        renderResumenPago
    };
})();
