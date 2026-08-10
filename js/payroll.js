(function () {
    function ajustarReloj(timestamp) {
        const fecha = new Date(timestamp);
        const minutos = fecha.getMinutes();

        /*if (minutos <= 20) {
            fecha.setMinutes(0, 0, 0);
        } else if (minutos <= 40) {
            fecha.setMinutes(30, 0, 0);
        } else {
            fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
        }*/

        return fecha;
    }

    function getLunesActual(fecha) {
        const d = new Date(fecha);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const lunes = new Date(d);
        lunes.setDate(diff);
        return lunes.toLocaleDateString('en-CA');
    }

    function calcularPago({ registros, salario, jornadaSem, tipoHorario, modoCalculo, descuentosFijos, fechaInicio, fechaFin, festivos, tasas, tiempoDescanso }) {
        const fIn = new Date(fechaInicio + 'T00:00:00').getTime();
        const fOut = new Date(fechaFin + 'T23:59:59').getTime();

        const divisor = (jornadaSem / 6) * 30;
        const valorHora = salario / divisor;
        /*const umbralHora = (tipoHorario === 'LV') ? (jornadaSem / 5) : 6;*/
        const umbralHora = tipoHorario === 'LV'? jornadaSem / 5 : jornadaSem / 6;
        const BLOQUE = 1 / 60;

        const acumulador = {
            ord: 0,
            noc: 0,
            fD: 0,
            fN: 0,
            eD: 0,
            eN: 0,
            efD: 0,
            efN: 0,
            totalEf: 0
        };

        let acumuladoSemanal = 0;
        let ultimoLunes = null;
        let festivosAcumulados = new Set();

        const historialOrdenado = [...registros].sort((a, b) => a.entrada - b.entrada);

        historialOrdenado.forEach((turno) => {
            const dEntrada = ajustarReloj(turno.entrada);
            const dSalida = ajustarReloj(turno.salida);

            if (dSalida <= dEntrada) return;

            let cursor = new Date(dEntrada);
            const finT = new Date(dSalida);
            let horasTurno = 0;
            let pausaActiva = false;

            while (cursor < finT) {
                if (!pausaActiva && horasTurno >= 4) {
                    cursor.setMinutes(cursor.getMinutes() + tiempoDescanso);
                    pausaActiva = true;
                    if (cursor >= finT) break;
                }

                const lunesActual = getLunesActual(cursor);
                if (ultimoLunes !== lunesActual) {
                    acumuladoSemanal = 0;
                    ultimoLunes = lunesActual;

                    const diasDistribucion = tipoHorario === 'LV' ? 5 : 6;
                    const horasPorDiaFestivo = jornadaSem / diasDistribucion;

                    const [yr, mo, dy] = lunesActual.split('-').map(Number);

                    for (let i = 0; i < 7; i++) {
                        const diaTemp = new Date(yr, mo - 1, dy + i);
                        const dSem = diaTemp.getDay();

                        const esDiaDistribuido = tipoHorario === 'LV'
                            ? (dSem >= 1 && dSem <= 5)
                            : (dSem >= 1 && dSem <= 6);

                        const isoFecha =
                            `${diaTemp.getFullYear()}-${String(diaTemp.getMonth() + 1).padStart(2, '0')}-${String(diaTemp.getDate()).padStart(2, '0')}`;

                        if (esDiaDistribuido && festivos.includes(isoFecha)) {
                            acumuladoSemanal += horasPorDiaFestivo;
                        }
                    }
                }

                const horaActual = cursor.getHours();
                const esNoche = (horaActual >= 19 || horaActual < 6);
                const fechaIso = cursor.toLocaleDateString('en-CA');
                const esFestivoDia = (cursor.getDay() === 0 || festivos.includes(fechaIso));
                const diaSemana = cursor.getDay();
                const esExtraDiaria = (horasTurno >= umbralHora);
                const dentroDelCorte = (cursor.getTime() >= fIn && cursor.getTime() <= fOut);

                let esExtra = false;

                if (esFestivoDia) {
                    esExtra = esExtraDiaria;
                    if (dentroDelCorte) {
                        if (esExtra) {
                            esNoche ? acumulador.efN += BLOQUE : acumulador.efD += BLOQUE;
                        } else {
                            esNoche ? acumulador.fN += BLOQUE : acumulador.fD += BLOQUE;
                        }
                        acumulador.totalEf += BLOQUE;
                    }
                } else {
                    esExtra = (esExtraDiaria || acumuladoSemanal >= jornadaSem);
                    /*esExtra = acumuladoSemanal >= jornadaSem;*/

                    if (esExtra) {
                        if (dentroDelCorte) {
                            esNoche ? acumulador.eN += BLOQUE : acumulador.eD += BLOQUE;
                            acumulador.totalEf += BLOQUE;
                        }
                    } else {
                        if (dentroDelCorte) {
                            esNoche ? acumulador.noc += BLOQUE : acumulador.ord += BLOQUE;
                            acumulador.totalEf += BLOQUE;
                        }
                        acumuladoSemanal += BLOQUE;
                    }
                }

                horasTurno += BLOQUE;
                cursor.setMinutes(cursor.getMinutes() + 1);
            }
        });

        const formatearMoneda = (valor) => '$' + Math.round(valor).toLocaleString('es-CO');
        let vBase = 0;
        const baseHoras = acumulador.ord + acumulador.noc + acumulador.fD + acumulador.fN;

        if (modoCalculo === 'fijo') {
            vBase = salario;
        } else {
            vBase = baseHoras * valorHora;
        }

        const conceptos = [
            { nombre: 'Recargo Nocturno (' + tasas.noc + '%)', horas: acumulador.noc, valor: acumulador.noc * (valorHora * tasas.noc) },
            { nombre: 'Recargo Festivo Diurno (' + tasas.fD + '%)', horas: acumulador.fD, valor: acumulador.fD * (valorHora * tasas.fD) },
            { nombre: 'Recargo Festivo Nocturno (' + tasas.fN + '%)', horas: acumulador.fN, valor: acumulador.fN * (valorHora * tasas.fN) },
            { nombre: 'Extra Diurna (' + tasas.eD + '%)', horas: acumulador.eD, valor: acumulador.eD * (valorHora * tasas.eD) },
            { nombre: 'Extra Nocturna (' + tasas.eN + '%)', horas: acumulador.eN, valor: acumulador.eN * (valorHora * tasas.eN) },
            { nombre: 'Extra Festiva Diurna (' + tasas.efD + '%)', horas: acumulador.efD, valor: acumulador.efD * (valorHora * tasas.efD) },
            { nombre: 'Extra Festiva Nocturna (' + tasas.efN + '%)', horas: acumulador.efN, valor: acumulador.efN * (valorHora * tasas.efN) }
        ];

        const bruto = vBase + conceptos.reduce((total, concepto) => total + concepto.valor, 0);
        const salud = bruto * 0.04;
        const pension = bruto * 0.04;
        const netoFinal = bruto - salud - pension - descuentosFijos;

        let html = `
            <div style="text-align:center; font-weight:bold; border-bottom:2px solid #1a73e8; margin-bottom:10px;">VOLANTE DETALLADO</div>
            <div class="concepto"><span>Modalidad:</span><span><b>${modoCalculo === 'fijo' ? 'Sueldo Fijo' : 'Por Horas'}</b></span></div>
            <div class="concepto"><span>Horas Efectivas (Corte):</span><span><b>${acumulador.totalEf.toFixed(2)}h</b></span></div>
            <div class="concepto"><span>${modoCalculo === 'fijo' ? 'Sueldo Base' : 'Sueldo Ordinario (' + baseHoras.toFixed(2) + 'h)'}</span><span>${formatearMoneda(vBase)}</span></div>
        `;

        conceptos.forEach((concepto) => {
            if (concepto.horas > 0) {
                html += `<div class="concepto" style="color:#28a745"><span>${concepto.nombre} (${concepto.horas.toFixed(2)}h)</span><span>+ ${formatearMoneda(concepto.valor)}</span></div>`;
            }
        });

        html += `
            <div style="margin-top:10px; border-top:1px solid #eee;">
                <div class="concepto" style="color:#c0392b"><span>Salud (4%)</span><span>- ${formatearMoneda(salud)}</span></div>
                <div class="concepto" style="color:#c0392b"><span>Pensión (4%)</span><span>- ${formatearMoneda(pension)}</span></div>
        `;

        if (descuentosFijos > 0) {
            html += `<div class="concepto" style="color:#c0392b"><span>Descuentos Fijos</span><span>- ${formatearMoneda(descuentosFijos)}</span></div>`;
        }

        html += `
            </div>
            <div class="concepto total"><span>NETO A RECIBIR:</span><span>${formatearMoneda(netoFinal)}</span></div>
        `;

        return {
            html,
            bruto,
            netoFinal
        };
    }

    window.NominaPayroll = {
        ajustarReloj,
        getLunesActual,
        calcularPago
    };
})();
