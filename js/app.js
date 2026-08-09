(function () {
    const storage = window.NominaStorage;
    const UI = window.NominaUI;
    const payroll = window.NominaPayroll;
    const holidays = window.NominaHolidays;

    const state = {
        registros: storage.load(storage.STORAGE_KEYS.registros, []).sort((a, b) => b.entrada - a.entrada),
        entradaActiva: localStorage.getItem(storage.STORAGE_KEYS.entradaActiva),
        festivos: []
    };

    function ordenarRegistrosDesc() {
        state.registros.sort((a, b) => b.entrada - a.entrada);
    }

    function setActiveView(viewName) {
        // Alternar visibilidad de las secciones
        document.querySelectorAll('.view').forEach((section) => {
            section.classList.toggle('active', section.id === 'view-' + viewName);
        });

        // Actualizar la clase active en los li del Magic Menu para que se mueva el círculo
        document.querySelectorAll('.navigation .list').forEach((item) => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
    }

    function bindNavigation() {
        document.querySelectorAll('.navigation .list').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault(); // Evita el salto de pantalla del <a>
                setActiveView(item.dataset.view);
            });
        });
    }

    function bindConfigPersist() {
        document.querySelectorAll('.save-cfg').forEach((el) => {
            const savedValue = storage.getConfigValue(el.id);
            if (savedValue !== null && savedValue !== undefined && savedValue !== '') el.value = savedValue;

            el.addEventListener('change', () => {
                storage.setConfigValue(el.id, el.value);
            });
        });

        const salario = document.getElementById('salario');
        if (!salario.value) {
            salario.value = 2100000;
            storage.setConfigValue('salario', salario.value);
        }

        const horasSemana = document.getElementById('horas-semana');
        if (!horasSemana.value) {
            horasSemana.value = 44;
            storage.setConfigValue('horas-semana', horasSemana.value);
        }
    }

    function registrarEntrada() {
        state.entradaActiva = Date.now();
        localStorage.setItem(storage.STORAGE_KEYS.entradaActiva, String(state.entradaActiva));
        UI.actualizarInterfaz(state.entradaActiva);
    }

    function registrarSalida() {
        if (!state.entradaActiva) return;

        const fin = Date.now();
        const inicio = parseInt(state.entradaActiva, 10);

        if (fin <= inicio) {
            alert('Error en cronología');
            return;
        }

        state.registros.push({ entrada: inicio, salida: fin });
        ordenarRegistrosDesc();
        storage.save(storage.STORAGE_KEYS.registros, state.registros);
        localStorage.removeItem(storage.STORAGE_KEYS.entradaActiva);
        state.entradaActiva = null;

        UI.actualizarInterfaz(state.entradaActiva);
        UI.renderizarTabla(state.registros, state.festivos);
    }

    function eliminarRegistro(indice) {
        if (!confirm('¿Eliminar este turno del historial?')) return;

        state.registros.splice(indice, 1);
        ordenarRegistrosDesc();
        storage.save(storage.STORAGE_KEYS.registros, state.registros);
        UI.renderizarTabla(state.registros, state.festivos);
    }

    async function cargarFestivos() {
        state.festivos = await holidays.loadFestivos();
    }

    function obtenerConfiguracion() {
        const horasSemana = parseInt(document.getElementById('horas-semana').value, 10);

        // Helper para leer porcentajes de forma segura
        const leerPorcentaje = (id, valorDefectuoso) => {
            const val = parseFloat(document.getElementById(id)?.value);
            return (isNaN(val) ? valorDefectuoso : val); // Convertir a porcentaje
        };

        return {
            salario: parseFloat(document.getElementById('salario').value),
            jornadaSem: Number.isNaN(horasSemana) ? 44 : horasSemana,
            tipoHorario: document.getElementById('tipo-horario').value,
            modoCalculo: document.getElementById('modo-calculo').value,
            descuentosFijos: parseFloat(document.getElementById('descuentos').value) || 0,
            fechaInicio: document.getElementById('fecha-inicio').value,
            fechaFin: document.getElementById('fecha-fin').value,

            tiempoDescanso: parseInt(document.getElementById('Tiempo-descanso')?.value, 10) || 30,

            tasas:{
                noc: leerPorcentaje('recargoNocturno', 0.35),
                fD:  leerPorcentaje('recargoFestivoDiurno', 1.80),
                fN:  leerPorcentaje('recargoFestivoNocturno', 2.15),
                eD:  leerPorcentaje('extraDiurna', 1.25),
                eN:  leerPorcentaje('extraNocturna', 1.75),
                efD: leerPorcentaje('extraFestivaDiurna', 2.05),
                efN: leerPorcentaje('extraFestivaNocturna', 2.55)
            }
        };
    }

    async function calcularPago() {
        const config = obtenerConfiguracion();
        const { salario, jornadaSem, tipoHorario, modoCalculo, descuentosFijos, tasas, tiempoDescanso } = config;

        if (!salario || !config.fechaInicio || !config.fechaFin) {
            alert('Revisa las fechas y el salario.');
            return;
        }

        setActiveView('report');

        const resumen = document.getElementById('resumen-pago');
        resumen.style.display = 'block';
        resumen.innerHTML = '⌛ Procesando turnos y acumulados semanales...';

        state.festivos = await holidays.loadFestivos();

        const resultado = payroll.calcularPago({
            registros: state.registros,
            salario,
            jornadaSem,
            tipoHorario,
            modoCalculo,
            descuentosFijos,
            fechaInicio: config.fechaInicio,
            fechaFin: config.fechaFin,
            festivos: state.festivos,
            tasas,
            tiempoDescanso
        });

        UI.renderResumenPago(resultado.html);
    }

    function importarHistorial(event) {
        const archivo = event.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = function (e) {
            const contenido = e.target.result;
            const lineas = contenido.split('\n');
            const nuevosRegistros = [];

            for (let i = 1; i < lineas.length; i++) {
                if (!lineas[i].trim()) continue;
                const columnas = lineas[i].split(',');
                if (columnas.length >= 2) {
                    nuevosRegistros.push({
                        entrada: new Date(columnas[0]).getTime(),
                        salida: new Date(columnas[1]).getTime()
                    });
                }
            }

            if (!nuevosRegistros.length) {
                alert('❌ El archivo no tiene el formato correcto.');
                return;
            }

            if (!confirm('Se encontraron ' + nuevosRegistros.length + ' turnos. ¿Deseas cargarlos?')) {
                return;
            }

            state.registros = [...state.registros, ...nuevosRegistros];
            ordenarRegistrosDesc();
            storage.save(storage.STORAGE_KEYS.registros, state.registros);
            UI.renderizarTabla(state.registros, state.festivos);
            alert('✅ Datos importados con éxito.');
        };

        lector.readAsText(archivo);
        event.target.value = '';
    }

    function exportarHistorial() {
        if (!state.registros.length) {
            alert('No hay datos para exportar.');
            return;
        }

        let csvContent = 'Entrada,Salida\n';
        state.registros.forEach((turno) => {
            const entradaStr = new Date(turno.entrada).toLocaleString('sv-SE').replace(' ', 'T');
            const salidaStr = new Date(turno.salida).toLocaleString('sv-SE').replace(' ', 'T');
            csvContent += entradaStr + ',' + salidaStr + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'nomina_editable.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function toggleManual() {
        const formManual = document.getElementById('form-manual');
        formManual.style.display = formManual.style.display === 'block' ? 'none' : 'block';
    }

    function guardarTurnoManual() {
        const entrada = document.getElementById('manual-in').value;
        const salida = document.getElementById('manual-out').value;

        if (!entrada || !salida) {
            alert('⚠️ Por favor selecciona la fecha y hora de Entrada y Salida.');
            return;
        }

        const tIn = new Date(entrada).getTime();
        const tOut = new Date(salida).getTime();

        if (tOut <= tIn) {
            alert('❌ Error cronológico: La Salida no puede ser anterior o igual a la Entrada.');
            return;
        }

        state.registros.push({ entrada: tIn, salida: tOut });
        ordenarRegistrosDesc();
        storage.save(storage.STORAGE_KEYS.registros, state.registros);

        UI.renderizarTabla(state.registros, state.festivos);
        toggleManual();
        document.getElementById('manual-in').value = '';
        document.getElementById('manual-out').value = '';
        alert('✅ Turno agregado al historial exitosamente.');
    }

    function resetearTodo() {
        if (!confirm('¿Eliminar historial y configuración?')) return;

        localStorage.clear();
        state.registros = [];
        state.entradaActiva = null;
        state.festivos = [];
        location.reload();
    }

    function registrarServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then((reg) => {
            reg.update();

            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar ahora?')) {
                            window.location.reload();
                            //installingWorker.postMessage('SKIP_WAITING');
                        }
                    }
                };
            };
            // <-- ESTE ES EL BLOQUE NUEVO
            //navigator.serviceWorker.addEventListener('controllerchange', () => {
            //    window.location.reload();
            //});
        }).catch((error) => {
            console.log('Error al registrar el Service Worker:', error);
        });
    }

    function bindEvents() {
        document.getElementById('btn-entrada').addEventListener('click', registrarEntrada);
        document.getElementById('btn-salida').addEventListener('click', registrarSalida);
        document.querySelector('.btn-calcular').addEventListener('click', calcularPago);
        document.querySelector('.btn-reset').addEventListener('click', resetearTodo);
        document.querySelector('.btn-manual').addEventListener('click', toggleManual);
        document.querySelector('.btn-guardar-manual').addEventListener('click', guardarTurnoManual);
        document.querySelector('.btn-cancelar').addEventListener('click', toggleManual);
        document.querySelector('.btn-export').addEventListener('click', exportarHistorial);
        document.getElementById('input-import').addEventListener('change', importarHistorial);
        document.addEventListener('click', function (event) {
            if (event.target.matches('[data-action="delete-turno"]')) {
                eliminarRegistro(Number(event.target.dataset.index));
            }
        });
    }

    async function init() {
    bindNavigation();
    bindConfigPersist();
    bindEvents();
    
    // Cargar festivos locales primero para renderizar de inmediato
    state.festivos = holidays.getLocalFestivos();
    
    setActiveView('home');
    UI.actualizarInterfaz(state.entradaActiva);
    UI.renderizarTabla(state.registros, state.festivos);
    
    // Validar en segundo plano si hay cambios online
    holidays.loadFestivos().then((nuevosFestivos) => {
        if (JSON.stringify(state.festivos) !== JSON.stringify(nuevosFestivos)) {
            state.festivos = nuevosFestivos;
            UI.renderizarTabla(state.registros, state.festivos);
        }
    });

    registrarServiceWorker();
}

    document.addEventListener('DOMContentLoaded', init);
})();
