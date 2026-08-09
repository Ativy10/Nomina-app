(function () {
    const YEAR_ACTUAL = new Date().getFullYear();
    const CACHE_KEY = `festivos_co_${YEAR_ACTUAL}`;

    function getLocalFestivos() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    async function loadFestivos() {
        const locales = getLocalFestivos();
        
        if (!navigator.onLine) return locales;

        try {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${YEAR_ACTUAL}/CO`);
            if (!response.ok) return locales;
            
            const remotos = (await response.json()).map((item) => item.date);
            
            if (JSON.stringify(locales) !== JSON.stringify(remotos)) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(remotos));
                return remotos;
            }
            return locales;
        } catch (error) {
            return locales;
        }
    }

    window.NominaHolidays = { loadFestivos, getLocalFestivos };
})();