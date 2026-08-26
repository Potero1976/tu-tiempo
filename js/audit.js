/* ============================================
   TU TIEMPO - Auditoría de Funcionamiento
   ============================================ */

const Audit = {
    results: [],

    log(msg, ok) {
        this.results.push({ msg, ok });
        console.log(`${ok ? '✅' : '❌'} ${msg}`);
    },

    async run() {
        this.results = [];
        console.log('%c=== AUDITORÍA TU TIEMPO ===', 'color:#38bdf8;font-size:16px;font-weight:bold');
        console.time('Auditoría completada en');

        // 1. Módulos JS
        this.log('TrafficLight existe', typeof TrafficLight !== 'undefined');
        this.log('TrafficLight.getWindDirection', typeof TrafficLight?.getWindDirection === 'function');
        this.log('TrafficLight.getWeatherIcon', typeof TrafficLight?.getWeatherIcon === 'function');
        this.log('TrafficLight.getWeatherDescription', typeof TrafficLight?.getWeatherDescription === 'function');
        this.log('TrafficLight.evaluateGlobal', typeof TrafficLight?.evaluateGlobal === 'function');
        this.log('TrafficLight.evaluate', typeof TrafficLight?.evaluate === 'function');
        this.log('TrafficLight.updateGlobalLight', typeof TrafficLight?.updateGlobalLight === 'function');
        this.log('TrafficLight.createSmallLight', typeof TrafficLight?.createSmallLight === 'function');
        this.log('TrafficLight.calculateGolfIndex', typeof TrafficLight?.calculateGolfIndex === 'function');
        this.log('TrafficLight.thresholds', typeof TrafficLight?.thresholds === 'object');

        this.log('WeatherAPI existe', typeof WeatherAPI !== 'undefined');
        this.log('WeatherAPI.getForecast', typeof WeatherAPI?.getForecast === 'function');
        this.log('WeatherAPI.getMarineForecast', typeof WeatherAPI?.getMarineForecast === 'function');
        this.log('WeatherAPI.getAirQuality', typeof WeatherAPI?.getAirQuality === 'function');
        this.log('WeatherAPI.searchLocation', typeof WeatherAPI?.searchLocation === 'function');
        this.log('WeatherAPI.processForecast', typeof WeatherAPI?.processForecast === 'function');
        this.log('WeatherAPI.getCompleteData', typeof WeatherAPI?.getCompleteData === 'function');

        this.log('MapModule existe', typeof MapModule !== 'undefined');
        this.log('MapModule.init', typeof MapModule?.init === 'function');
        this.log('MapModule.setLocation', typeof MapModule?.setLocation === 'function');
        this.log('MapModule.clearLocation', typeof MapModule?.clearLocation === 'function');
        this.log('MapModule.searchPOIs', typeof MapModule?.searchPOIs === 'function');
        this.log('MapModule.clearPOIs', typeof MapModule?.clearPOIs === 'function');
        this.log('MapModule.getLocationName', typeof MapModule?.getLocationName === 'function');

        this.log('Favorites existe', typeof Favorites !== 'undefined');
        this.log('Favorites.getAll', typeof Favorites?.getAll === 'function');
        this.log('Favorites.add', typeof Favorites?.add === 'function');
        this.log('Favorites.remove', typeof Favorites?.remove === 'function');
        this.log('Favorites.isFavorite', typeof Favorites?.isFavorite === 'function');
        this.log('Favorites.renderList', typeof Favorites?.renderList === 'function');

        this.log('App existe', typeof App !== 'undefined');
        this.log('App.init', typeof App?.init === 'function');
        this.log('App.onLocationSelected', typeof App?.onLocationSelected === 'function');
        this.log('App.renderAll', typeof App?.renderAll === 'function');
        this.log('App.renderHourCards', typeof App?.renderHourCards === 'function');
        this.log('App.renderModeCards', typeof App?.renderModeCards === 'function');
        this.log('App.setMode', typeof App?.setMode === 'function');
        this.log('App.handleSearch', typeof App?.handleSearch === 'function');
        this.log('App.handlePOISearch', typeof App?.handlePOISearch === 'function');

        // 2. Elementos DOM
        const domElements = [
            'search-input', 'btn-search', 'search-results',
            'map', 'map-coords-text',
            'poi-search-input', 'poi-search-btn', 'poi-clear-btn', 'poi-results',
            'mode-section', 'btn-clear', 'btn-save-favorite',
            'global-light', 'global-traffic-light', 'global-label', 'global-status',
            'weather-content', 'special-cards',
            'loading-overlay', 'favorites-panel', 'favorites-list',
            'btn-favorites', 'btn-close-favorites'
        ];

        for (const id of domElements) {
            const el = document.getElementById(id);
            this.log(`DOM #${id}`, el !== null);
        }

        // 3. Leaflet
        this.log('Leaflet (L) cargado', typeof L !== 'undefined');
        this.log('Leaflet map instance', MapModule?.map !== null && MapModule?.map !== undefined);

        // 4. CSS cargado
        const sheets = document.styleSheets;
        let cssCount = 0;
        for (let i = 0; i < sheets.length; i++) {
            try { sheets[i].cssRules; cssCount++; } catch(e) {}
        }
        this.log(`Hojas CSS cargadas: ${cssCount}`, cssCount >= 2);

        // 5. Test API Open-Meteo (fetch rápido)
        try {
            const resp = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.42&longitude=-3.70&current=temperature_2m&forecast_days=1');
            const data = await resp.json();
            this.log('API Open-Meteo responde', resp.ok && data.current !== undefined);
            this.log('API temperatura actual', typeof data.current?.temperature_2m === 'number');
        } catch (e) {
            this.log('API Open-Meteo FALLO: ' + e.message, false);
        }

        // 6. Test Geocoding
        try {
            const resp = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Madrid&count=1&language=es');
            const data = await resp.json();
            this.log('API Geocoding responde', resp.ok && data.results?.length > 0);
        } catch (e) {
            this.log('API Geocoding FALLO: ' + e.message, false);
        }

        // 7. Test Nominatim POI
        try {
            const resp = await fetch('https://nominatim.openstreetmap.org/search?q=golf+Madrid&format=json&limit=1');
            const data = await resp.json();
            this.log('API Nominatim POI responde', resp.ok);
        } catch (e) {
            this.log('API Nominatim POI FALLO: ' + e.message, false);
        }

        // 8. Test Marine API
        try {
            const resp = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=36.72&longitude=-4.42&current=wave_height&forecast_days=1');
            this.log('API Marine responde', resp.ok);
        } catch (e) {
            this.log('API Marine FALLO: ' + e.message, false);
        }

        // 9. Test Air Quality API
        try {
            const resp = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.42&longitude=-3.70&current=us_aqi&forecast_days=1');
            this.log('API Air Quality responde', resp.ok);
        } catch (e) {
            this.log('API Air Quality FALLO: ' + e.message, false);
        }

        console.timeEnd('Auditoría completada en');

        // Resumen
        const passed = this.results.filter(r => r.ok).length;
        const failed = this.results.filter(r => !r.ok).length;
        const total = this.results.length;

        console.log('%c\n=== RESUMEN ===', 'color:#38bdf8;font-size:14px;font-weight:bold');
        console.log(`%c${passed}/${total} pasados`, `color:${failed === 0 ? '#22c55e' : '#f59e0b'};font-size:13px;font-weight:bold`);

        if (failed > 0) {
            console.log('%cFALLOS:', 'color:#ef4444;font-weight:bold');
            this.results.filter(r => !r.ok).forEach(r => {
                console.log(`  ❌ ${r.msg}`);
            });
        }

        return { passed, failed, total, results: this.results };
    }
};
