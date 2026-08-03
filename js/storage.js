(function () {
    const STORAGE_KEYS = {
        registros: 'jornada_registros',
        entradaActiva: 'entrada_activa',
        configPrefix: 'cfg_'
    };

    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.error('Error al leer ' + key + ':', error);
            return fallback;
        }
    }

    function save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function setValue(key, value) {
        localStorage.setItem(key, value);
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    window.NominaStorage = {
        STORAGE_KEYS,
        load,
        save,
        setValue,
        remove,
        getConfigValue: function (id) {
            return localStorage.getItem(STORAGE_KEYS.configPrefix + id);
        },
        setConfigValue: function (id, value) {
            localStorage.setItem(STORAGE_KEYS.configPrefix + id, value);
        }
    };
})();
