(function () {
    async function loadFestivos(year = new Date().getFullYear()) {
        try {
            const response = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + year + '/CO');
            if (!response.ok) return [];
            return (await response.json()).map((item) => item.date);
        } catch (error) {
            console.log('Error cargando festivos:', error);
            return [];
        }
    }

    window.NominaHolidays = {
        loadFestivos
    };
})();
