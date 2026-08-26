/* ============================================
   TU TIEMPO - Sistema de Semáforo por Modo
   ============================================ */

const TrafficLight = {
    // Umbrales por modo: { green: [min, max], orange: [min, max], red: fuera de rango }
    thresholds: {
        general: {
            temperature:  { green: [15, 25], orange: [5, 30] },
            feelsLike:    { green: [15, 25], orange: [5, 30] },
            rainProb:     { green: [0, 20],  orange: [20, 60] },
            precipitation:{ green: [0, 0.5], orange: [0.5, 5] },
            wind:         { green: [0, 20],  orange: [20, 40] },
            gusts:        { green: [0, 30],  orange: [30, 60] },
            humidity:     { green: [30, 60], orange: [20, 80] },
            visibility:   { green: [5000, 999999], orange: [1000, 5000] },
            cloudCover:   { green: [0, 40],  orange: [40, 80] },
            uvIndex:      { green: [0, 3],   orange: [4, 6] },
            pressure:     { green: [1010, 1025], orange: [1000, 1035] }
        },
        golf: {
            temperature:  { green: [18, 28], orange: [10, 33] },
            feelsLike:    { green: [16, 28], orange: [8, 33] },
            wind:         { green: [0, 15],  orange: [15, 25] },
            gusts:        { green: [0, 25],  orange: [25, 40] },
            humidity:     { green: [30, 65], orange: [20, 80] },
            rainProb:     { green: [0, 15],  orange: [15, 40] },
            precipitation:{ green: [0, 0],   orange: [0, 2] },
            cloudCover:   { green: [0, 50],  orange: [50, 85] },
            uvIndex:      { green: [0, 5],   orange: [6, 8] },
            visibility:   { green: [5000, 999999], orange: [2000, 5000] },
            dewPoint:     { green: [8, 18],  orange: [18, 24] }
        },
        beach: {
            temperature:  { green: [22, 32], orange: [18, 36] },
            feelsLike:    { green: [22, 34], orange: [18, 38] },
            wind:         { green: [0, 20],  orange: [20, 35] },
            waveHeight:   { green: [0, 1.5], orange: [1.5, 2.5] },
            uvIndex:      { green: [0, 5],   orange: [6, 8] },
            rainProb:     { green: [0, 20],  orange: [20, 50] },
            humidity:     { green: [30, 70], orange: [70, 90] },
            visibility:   { green: [5000, 999999], orange: [2000, 5000] }
        },
        mountain: {
            temperature:  { green: [5, 20],  orange: [-5, 28] },
            feelsLike:    { green: [0, 18],  orange: [-10, 25] },
            wind:         { green: [0, 20],  orange: [20, 40] },
            gusts:        { green: [0, 35],  orange: [35, 60] },
            rainProb:     { green: [0, 20],  orange: [20, 50] },
            visibility:   { green: [3000, 999999], orange: [1000, 3000] },
            cape:         { green: [0, 500], orange: [500, 1500] },
            snowfall:     { green: [0, 0],   orange: [0, 2] }
        }
    },

    /**
     * Evalúa un valor y devuelve el estado del semáforo
     */
    evaluate(type, value, mode = 'general') {
        if (value === null || value === undefined || isNaN(value)) return 'green';
        
        const modeThresholds = this.thresholds[mode] || this.thresholds.general;
        const t = modeThresholds[type] || this.thresholds.general[type];
        if (!t) return 'green';

        // Para parámetros donde más alto = peor
        const higherIsWorse = ['rainProb', 'precipitation', 'wind', 'gusts', 'cloudCover', 'uvIndex', 'waveHeight', 'cape', 'snowfall'];
        // Para parámetros con rango ideal (muy alto o muy bajo = malo)
        const symmetricBad = ['temperature', 'feelsLike', 'humidity', 'dewPoint'];

        if (higherIsWorse.includes(type)) {
            if (value >= t.orange[1]) return 'red';
            if (value >= t.orange[0]) return 'orange';
            return 'green';
        }

        if (symmetricBad.includes(type)) {
            if (value < t.green[0] || value > t.green[1]) {
                if (value < t.orange[0] || value > t.orange[1]) return 'red';
                return 'orange';
            }
            return 'green';
        }

        // Para visibility (bajo = malo)
        if (type === 'visibility') {
            if (value < t.orange[0]) return 'red';
            if (value < t.green[0]) return 'orange';
            return 'green';
        }

        // Para pressure
        if (type === 'pressure') {
            if (value < t.orange[0] || value > t.orange[1]) return 'orange';
            return 'green';
        }

        return 'green';
    },

    /**
     * Evalúa el semáforo global
     */
    evaluateGlobal(params, mode = 'general') {
        const states = [];
        const modeThresholds = this.thresholds[mode] || this.thresholds.general;

        // Evaluar solo los parámetros que existen en el modo actual
        for (const [key, value] of Object.entries(params)) {
            if (modeThresholds[key] !== undefined && value !== null && value !== undefined) {
                states.push(this.evaluate(key, value, mode));
            }
        }

        if (states.includes('red')) return 'red';
        if (states.includes('orange')) return 'orange';
        return 'green';
    },

    /**
     * Crea el HTML de un semáforo pequeño
     */
    createSmallLight(state) {
        return `
            <div class="traffic-light state-${state}">
                <div class="tl-light red ${state === 'red' ? 'active' : ''}"></div>
                <div class="tl-light orange ${state === 'orange' ? 'active' : ''}"></div>
                <div class="tl-light green ${state === 'green' ? 'active' : ''}"></div>
            </div>
        `;
    },

    /**
     * Actualiza el semáforo global
     */
    updateGlobalLight(state, mode = 'general') {
        const el = document.getElementById('global-traffic-light');
        const statusEl = document.getElementById('global-status');
        const labelEl = document.getElementById('global-label');
        
        el.className = `traffic-light-large state-${state}`;

        const modeLabels = {
            general: '¿Salir ahora?',
            golf: '¿Salir a jugar?',
            beach: '¿Ir a la playa?',
            mountain: '¿Ir a la montaña?'
        };

        const messages = {
            green: { text: '✓ Condiciones favorables', badge: 'badge-green' },
            orange: { text: '⚠ Precaución en algunos aspectos', badge: 'badge-orange' },
            red:   { text: '✕ Condiciones adversas', badge: 'badge-red' }
        };

        labelEl.textContent = modeLabels[mode] || modeLabels.general;
        const msg = messages[state];
        statusEl.innerHTML = `<span class="status-badge ${msg.badge}">${msg.text}</span>`;
    },

    /**
     * Calcula el índice de jugabilidad de golf (0-100)
     */
    calculateGolfIndex(data) {
        let score = 100;
        const { temperature, feelsLike, wind, gusts, humidity, rainProb, precipitation, cloudCover, uvIndex, dewPoint } = data;

        // Temperatura: ideal 18-26°C
        if (temperature < 10 || temperature > 33) score -= 30;
        else if (temperature < 15 || temperature > 28) score -= 15;
        else if (temperature < 18 || temperature > 26) score -= 5;

        // Viento: penalización fuerte
        if (wind > 30) score -= 30;
        else if (wind > 20) score -= 20;
        else if (wind > 15) score -= 10;
        else if (wind > 10) score -= 3;

        // Ráfagas
        if (gusts > 40) score -= 15;
        else if (gusts > 30) score -= 10;
        else if (gusts > 20) score -= 5;

        // Lluvia
        if (precipitation > 2) score -= 30;
        else if (precipitation > 0.5) score -= 20;
        else if (precipitation > 0) score -= 10;

        // Probabilidad lluvia
        if (rainProb > 60) score -= 15;
        else if (rainProb > 30) score -= 8;
        else if (rainProb > 15) score -= 3;

        // Humedad: ideal 30-65%
        if (humidity > 85) score -= 10;
        else if (humidity > 75) score -= 5;
        else if (humidity < 20) score -= 5;

        // Punto de rocío: >24°C = muy húmedo
        if (dewPoint > 24) score -= 10;
        else if (dewPoint > 20) score -= 5;

        // Nubosidad: algo de nube es bueno, mucho es malo
        if (cloudCover > 90) score -= 5;
        if (cloudCover > 95) score -= 5;

        // UV: muy alto = incómodo
        if (uvIndex > 9) score -= 5;
        else if (uvIndex > 7) score -= 3;

        return Math.max(0, Math.min(100, score));
    },

    /**
     * Describe el índice de golf
     */
    getGolfIndexDescription(score) {
        if (score >= 85) return { text: 'Condiciones excelentes', emoji: '🟢' };
        if (score >= 70) return { text: 'Buen día para jugar', emoji: '🟢' };
        if (score >= 55) return { text: 'Jugable, con precaución', emoji: '🟡' };
        if (score >= 40) return { text: 'Condiciones difíciles', emoji: '🟠' };
        return { text: 'No recomendable jugar', emoji: '🔴' };
    },

    getWeatherIcon(code) {
        if (code === 0) return '☀️';
        if (code === 1) return '🌤️';
        if (code === 2) return '⛅';
        if (code === 3) return '☁️';
        if (code === 45 || code === 48) return '🌫️';
        if (code >= 51 && code <= 57) return '🌦️';
        if (code >= 61 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '🌨️';
        if (code >= 80 && code <= 82) return '🌧️';
        if (code === 85 || code === 86) return '🌨️';
        if (code >= 95 && code <= 99) return '⛈️';
        return '🌡️';
    },

    getWeatherDescription(code) {
        const d = {
            0: 'Cielo despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado',
            3: 'Nublado', 45: 'Niebla', 48: 'Niebla con escarcha',
            51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna intensa',
            56: 'Llovizna helada', 57: 'Llovizna helada fuerte',
            61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
            66: 'Lluvia helada', 67: 'Lluvia helada fuerte',
            71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve fuerte',
            77: 'Granizo', 80: 'Chubascos ligeros', 81: 'Chubascos moderados',
            82: 'Chubascos fuertes', 85: 'Chubascos de nieve', 86: 'Chubascos nieve fuerte',
            95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte'
        };
        return d[code] || 'Sin datos';
    },

    getWindDirection(degrees) {
        if (degrees === null || degrees === undefined || isNaN(degrees)) return '—';
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        return dirs[Math.round(degrees / 45) % 8];
    }
};
