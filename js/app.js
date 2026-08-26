/* ============================================
   TU TIEMPO - Orquestador Principal
   ============================================ */

const App = {
    currentMode: 'general',
    currentData: null,
    currentLocationName: null,
    selectedDate: 0,
    loading: false,

    init() {
        console.log('TU TIEMPO - Iniciando...');

        MapModule.init(
            (lat, lon, name) => this.onLocationSelected(lat, lon, name),
            () => this.onLocationCleared()
        );

        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('btn-search');
        const searchResults = document.getElementById('search-results');

        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleSearch();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSearch();
            }
        });

        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim();
            if (q.length >= 3) {
                clearTimeout(this._searchTimeout);
                this._searchTimeout = setTimeout(() => this.handleSearch(), 400);
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchResults.contains(e.target) && e.target !== searchInput && e.target !== searchBtn) {
                searchResults.classList.add('hidden');
            }
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            MapModule.clearLocation();
            MapModule.clearPOIs();
            document.getElementById('poi-search-input').value = '';
        });

        document.getElementById('poi-search-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.handlePOISearch();
        });
        document.getElementById('poi-search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handlePOISearch();
        });
        document.getElementById('poi-clear-btn').addEventListener('click', () => {
            MapModule.clearPOIs();
            document.getElementById('poi-search-input').value = '';
            document.getElementById('poi-results').classList.add('hidden');
        });

        document.querySelectorAll('.poi-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                document.getElementById('poi-search-input').value = tag.dataset.poi;
                this.handlePOISearch();
            });
        });

        document.getElementById('btn-save-favorite').addEventListener('click', () => this.saveFavorite());

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });

        document.getElementById('btn-favorites').addEventListener('click', () => {
            document.getElementById('favorites-panel').classList.toggle('hidden');
        });
        document.getElementById('btn-close-favorites').addEventListener('click', () => {
            document.getElementById('favorites-panel').classList.add('hidden');
        });

        Favorites.renderList((lat, lon, name) => {
            document.getElementById('favorites-panel').classList.add('hidden');
            MapModule.setLocation(lat, lon, name);
        });

        console.log('TU TIEMPO - Listo');
    },

    async handleSearch() {
        const input = document.getElementById('search-input');
        const resultsDiv = document.getElementById('search-results');
        const query = input.value.trim();
        if (query.length < 2) return;

        try {
            resultsDiv.innerHTML = '<div class="search-loading">Buscando...</div>';
            resultsDiv.classList.remove('hidden');

            const results = await WeatherAPI.searchLocation(query);

            if (results.length === 0) {
                resultsDiv.innerHTML = '<div class="search-item"><strong>No se encontraron resultados</strong></div>';
                return;
            }

            resultsDiv.innerHTML = results.map(r => {
                const region = [r.admin1, r.country].filter(Boolean).join(', ');
                return `
                    <div class="search-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}">
                        <strong>${r.name}</strong>
                        <small>${region}</small>
                    </div>
                `;
            }).join('');

            resultsDiv.querySelectorAll('.search-item[data-lat]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const lat = parseFloat(item.dataset.lat);
                    const lon = parseFloat(item.dataset.lon);
                    const name = item.dataset.name;
                    MapModule.setLocation(lat, lon, name);
                    resultsDiv.classList.add('hidden');
                    input.value = name;
                });
            });
        } catch (e) {
            console.error('Error búsqueda:', e);
            resultsDiv.innerHTML = `<div class="search-item"><strong>Error: ${e.message}</strong></div>`;
        }
    },

    async onLocationSelected(lat, lon, name) {
        if (this.loading) return;

        if (!name) name = await MapModule.getLocationName(lat, lon);
        this.currentLocationName = name;

        document.getElementById('search-input').value = name;

        this.showLoading(true);

        try {
            this.currentData = await WeatherAPI.getCompleteData(lat, lon);
            this.selectedDate = 0;
            this.renderAll();
        } catch (e) {
            console.error('Error al obtener datos:', e);
            document.getElementById('weather-content').innerHTML = `
                <div class="error-message">
                    <p>Error al obtener datos meteorológicos.</p>
                    <p style="font-size:0.8rem;color:#999;margin-top:8px;">${e.message}</p>
                </div>
            `;
        } finally {
            this.showLoading(false);
        }
    },

    onLocationCleared() {
        this.currentData = null;
        this.currentLocationName = null;
        document.getElementById('weather-content').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🗺️</div>
                <p>Haz clic en el mapa o busca una ciudad</p>
            </div>
        `;
        document.getElementById('special-cards').innerHTML = '';
        document.getElementById('search-input').value = '';
        this.updateFavoriteButton(false);
    },

    setMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        if (this.currentData) this.renderAll();
    },

    selectDate(index) {
        this.selectedDate = index;
        this.renderAll();
    },

    renderAll() {
        if (!this.currentData) return;
        const { weather, marine, aqi } = this.currentData;
        const mode = this.currentMode;

        const globalParams = {
            temperature: weather.current.temperature, feelsLike: weather.current.feelsLike,
            wind: weather.current.wind, gusts: weather.current.gusts,
            humidity: weather.current.humidity, dewPoint: weather.current.dewPoint,
            cloudCover: weather.current.cloudCover, pressure: weather.current.pressure,
            visibility: weather.current.visibility,
            waveHeight: marine?.current?.waveHeight ?? null,
            cape: weather.current.cape, rainProb: null
        };
        const globalState = TrafficLight.evaluateGlobal(globalParams, mode);
        TrafficLight.updateGlobalLight(globalState, mode);

        this.renderDateSelector();
        this.renderDaySummary();
        this.renderNowcast();
        this.renderHourCards(weather.hourly, mode);
        this.renderModeCards(weather, marine, aqi);

        if (MapModule.selectedCoords) {
            const isFav = Favorites.isFavorite(MapModule.selectedCoords.lat, MapModule.selectedCoords.lon);
            this.updateFavoriteButton(isFav);
        }
    },

    renderDateSelector() {
        if (!this.currentData) return;
        const weather = this.currentData.weather;
        const now = new Date();
        const days = [];

        for (let d = 0; d < 7; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() + d);
            const dayNames = ['Hoy', 'Mañana'];
            const label = d < 2 ? dayNames[d] : date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
            const dateStr = date.toISOString().split('T')[0];
            days.push({ label, dateStr, date });
        }

        const html = days.map((day, i) => {
            const isActive = i === this.selectedDate;
            return `<button class="date-tab ${isActive ? 'active' : ''}" data-date="${i}">${day.label}<br><small>${day.dateStr}</small></button>`;
        }).join('');

        let container = document.getElementById('date-selector');
        if (!container) {
            container = document.createElement('div');
            container.id = 'date-selector';
            container.className = 'date-selector';
            const content = document.getElementById('weather-content');
            content.parentNode.insertBefore(container, content);
        }
        container.innerHTML = html;

        container.querySelectorAll('.date-tab').forEach(tab => {
            tab.addEventListener('click', () => this.selectDate(parseInt(tab.dataset.date)));
        });
    },

    renderDaySummary() {
        if (!this.currentData) return;
        const weather = this.currentData.weather;
        const now = new Date();
        const selectedDateObj = new Date(now);
        selectedDateObj.setDate(selectedDateObj.getDate() + this.selectedDate);
        const dateStr = selectedDateObj.toISOString().split('T')[0];

        const dayHours = weather.hourly.filter(h => h.time.split('T')[0] === dateStr);
        if (dayHours.length === 0) return;

        const temps = dayHours.map(h => h.temperature).filter(t => t != null);
        const winds = dayHours.map(h => h.wind).filter(w => w != null);
        const gusts = dayHours.map(h => h.gusts).filter(g => g != null);
        const rains = dayHours.map(h => h.rainProb).filter(r => r != null);
        const uvVals = dayHours.map(h => h.uvIndex).filter(u => u != null);

        const tempMax = Math.round(Math.max(...temps));
        const tempMin = Math.round(Math.min(...temps));
        const windMax = Math.round(Math.max(...winds));
        const gustsMax = gusts.length > 0 ? Math.round(Math.max(...gusts)) : null;
        const rainAvg = Math.round(rains.reduce((a, b) => a + b, 0) / rains.length);
        const uvMax = uvVals.length > 0 ? Math.max(...uvVals).toFixed(1) : null;

        const sunrise = weather.daily.sunrise;
        const sunset = weather.daily.sunset;
        let sunRiseStr = '—', sunSetStr = '—', dayLength = '—';
        if (sunrise) {
            const sr = new Date(sunrise);
            sunRiseStr = sr.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        }
        if (sunset) {
            const ss = new Date(sunset);
            sunSetStr = ss.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            if (sunrise) {
                const diff = (new Date(sunset) - new Date(sunrise)) / 1000 / 60 / 60;
                const h = Math.floor(diff);
                const m = Math.round((diff - h) * 60);
                dayLength = `${h}h ${m}min`;
            }
        }

        const avgRain = dayHours.filter(h => h.rainProb > 50).length;
        const rainHours = avgRain > 0 ? `${avgRain}h con lluvia probable` : 'Sin lluvia probable';

        let container = document.getElementById('day-summary');
        if (!container) {
            container = document.createElement('div');
            container.id = 'day-summary';
            container.className = 'day-summary-section';
            const dateSelector = document.getElementById('date-selector');
            dateSelector.parentNode.insertBefore(container, dateSelector.nextSibling);
        }

        container.innerHTML = `
            <div class="day-summary">
                <div class="day-sun">
                    <div class="sun-item"><span class="sun-icon">🌅</span><span class="sun-time">${sunRiseStr}</span><span class="sun-label">Amanecer</span></div>
                    <div class="sun-item sun-length"><span class="sun-icon">☀️</span><span class="sun-time">${dayLength}</span><span class="sun-label">Luz solar</span></div>
                    <div class="sun-item"><span class="sun-icon">🌇</span><span class="sun-time">${sunSetStr}</span><span class="sun-label">Atardecer</span></div>
                </div>
                <div class="day-stats">
                    <div class="day-stat"><span class="stat-val" style="color:#ef4444">${tempMax}°</span><span class="stat-label">Máx</span></div>
                    <div class="day-stat"><span class="stat-val" style="color:#60a5fa">${tempMin}°</span><span class="stat-label">Mín</span></div>
                    <div class="day-stat"><span class="stat-val">💨 ${windMax}</span><span class="stat-label">Viento</span></div>
                    ${gustsMax ? `<div class="day-stat"><span class="stat-val gust">🌬 ${gustsMax}</span><span class="stat-label">Ráfagas</span></div>` : ''}
                    <div class="day-stat"><span class="stat-val" style="color:#60a5fa">🌧 ${rainAvg}%</span><span class="stat-label">Lluvia</span></div>
                    ${uvMax ? `<div class="day-stat"><span class="stat-val" style="color:${parseFloat(uvMax) > 5 ? '#ef4444' : '#22c55e'}">☀️ ${uvMax}</span><span class="stat-label">UV máx</span></div>` : ''}
                </div>
                <div class="day-rain-info">💧 ${rainHours}</div>
            </div>
        `;
    },

    renderNowcast() {
        if (!this.currentData) return;
        const weather = this.currentData.weather;
        const now = new Date();

        const next2h = weather.hourly.filter(h => {
            const diff = (new Date(h.time) - now) / (1000 * 60 * 60);
            return diff >= 0 && diff <= 2;
        });

        if (next2h.length === 0) return;

        const willRain = next2h.some(h => h.rainProb > 50 || h.precipitation > 0);
        const maxProb = Math.max(...next2h.map(h => h.rainProb || 0));
        const maxPrecip = Math.max(...next2h.map(h => h.precipitation || 0));

        let container = document.getElementById('nowcast');
        if (!container) {
            container = document.createElement('div');
            container.id = 'nowcast';
            container.className = 'nowcast-section';
            const daySummary = document.getElementById('day-summary');
            if (daySummary) {
                daySummary.parentNode.insertBefore(container, daySummary.nextSibling);
            } else {
                const dateSelector = document.getElementById('date-selector');
                dateSelector.parentNode.insertBefore(container, dateSelector.nextSibling);
            }
        }

        const state = willRain ? (maxProb > 80 ? 'rain-likely' : 'rain-possible') : 'no-rain';
        const msgs = {
            'rain-likely': { icon: '🌧️', text: `Lluvia probable en la próxima hora (${maxProb}%)`, color: '#60a5fa' },
            'rain-possible': { icon: '🌦️', text: `Posibilidad de lluvia (${maxProb}%)`, color: '#f59e0b' },
            'no-rain': { icon: '☀️', text: 'Sin lluvia en las próximas 2 horas', color: '#22c55e' }
        };
        const msg = msgs[state];

        container.innerHTML = `
            <div class="nowcast-card ${state}">
                <div class="nowcast-icon">${msg.icon}</div>
                <div class="nowcast-text">
                    <div class="nowcast-title">Lluvia nowcast</div>
                    <div class="nowcast-msg" style="color:${msg.color}">${msg.text}</div>
                </div>
                ${maxPrecip > 0 ? `<div class="nowcast-amount">💧 ${maxPrecip.toFixed(1)} mm/h</div>` : ''}
            </div>
        `;
    },

    renderHourCards(hourly, mode) {
        const container = document.getElementById('weather-content');
        if (!hourly || hourly.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay datos horarios disponibles</p></div>';
            return;
        }

        const now = new Date();
        const selectedDateObj = new Date(now);
        selectedDateObj.setDate(selectedDateObj.getDate() + this.selectedDate);
        const selectedDateStr = selectedDateObj.toISOString().split('T')[0];

        const filteredHours = hourly.filter(h => {
            const hDate = h.time.split('T')[0];
            return hDate === selectedDateStr;
        });

        if (filteredHours.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay datos para esta fecha</p></div>';
            return;
        }

        const cardsHtml = filteredHours.map(h => {
            const params = {
                temperature: h.temperature, feelsLike: h.feelsLike,
                humidity: h.humidity, dewPoint: h.dewPoint,
                rainProb: h.rainProb, precipitation: h.precipitation,
                wind: h.wind, gusts: h.gusts, cloudCover: h.cloudCover,
                uvIndex: h.uvIndex, visibility: h.visibility,
                pressure: h.pressure, cape: h.cape, snowfall: h.snowfall
            };
            const state = TrafficLight.evaluateGlobal(params, mode);
            const borderClass = state === 'red' ? 'card-red' : state === 'orange' ? 'card-orange' : 'card-green';
            const windDir = TrafficLight.getWindDirection(h.windDir);
            const uvColor = h.uvIndex <= 2 ? '#22c55e' : h.uvIndex <= 5 ? '#f59e0b' : h.uvIndex <= 7 ? '#f97316' : '#ef4444';
            const capeColor = h.cape > 1000 ? '#ef4444' : h.cape > 500 ? '#f59e0b' : '#22c55e';

            return `
                <div class="hour-card ${borderClass}">
                    <div class="hour-time">${h.isCurrent ? 'AHORA' : h.hourStr}</div>
                    <div class="hour-icon">${TrafficLight.getWeatherIcon(h.weatherCode)}</div>
                    <div class="hour-temp">${Math.round(h.temperature)}°C</div>
                    <div class="hour-desc">${TrafficLight.getWeatherDescription(h.weatherCode)}</div>
                    <div class="hour-detail">💧 ${Math.round(h.feelsLike)}°C</div>
                    <div class="hour-wind">💨 ${Math.round(h.wind)} ${windDir}</div>
                    ${h.gusts ? `<div class="hour-detail gust">🌬 ${Math.round(h.gusts)}</div>` : ''}
                    <div class="hour-rain">🌧 ${h.rainProb ?? '—'}%</div>
                    <div class="hour-detail">☁️ ${h.cloudCover ?? '—'}%</div>
                    <div class="hour-detail">💧${h.humidity ?? '—'}%</div>
                    <div class="hour-detail" style="color:${uvColor}">☀️${h.uvIndex != null ? h.uvIndex.toFixed(1) : '—'}</div>
                    <div class="hour-detail" style="color:${capeColor}">⚡${h.cape != null ? Math.round(h.cape) : '—'}</div>
                    ${h.solarRadiation != null ? `<div class="hour-detail">🔆${Math.round(h.solarRadiation)}</div>` : ''}
                    ${h.freezingLevel != null ? `<div class="hour-detail">❄️${Math.round(h.freezingLevel)}m</div>` : ''}
                </div>
            `;
        }).join('');

        const currentState = TrafficLight.evaluateGlobal(
            this.getGlobalParams(this.currentData.weather.current, this.currentData.marine), mode
        );

        const dayLabel = this.selectedDate === 0 ? 'Hoy' : this.selectedDate === 1 ? 'Mañana' :
            new Date(now.getTime() + this.selectedDate * 86400000).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

        container.innerHTML = `
            <div class="hour-cards-grid">${cardsHtml}</div>
        `;
    },

    getGlobalParams(current, marine) {
        return {
            temperature: current.temperature, feelsLike: current.feelsLike,
            wind: current.wind, gusts: current.gusts, humidity: current.humidity,
            dewPoint: current.dewPoint, cloudCover: current.cloudCover,
            pressure: current.pressure, visibility: current.visibility,
            waveHeight: marine?.current?.waveHeight ?? null,
            cape: current.cape, rainProb: null
        };
    },

    renderModeCards(weather, marine, aqi) {
        let extraHtml = '';

        if (this.currentMode === 'golf') {
            const golfScore = TrafficLight.calculateGolfIndex({
                temperature: weather.current.temperature, feelsLike: weather.current.feelsLike,
                wind: weather.current.wind, gusts: weather.current.gusts,
                humidity: weather.current.humidity, precipitation: weather.current.precipitation,
                cloudCover: weather.current.cloudCover, uvIndex: weather.daily.uvMax,
                dewPoint: weather.current.dewPoint
            });
            const golfDesc = TrafficLight.getGolfIndexDescription(golfScore);
            const scoreColor = golfScore >= 70 ? 'golf-good' : golfScore >= 50 ? 'golf-moderate' : 'golf-bad';
            extraHtml += `
                <div class="special-card golf-card ${scoreColor}">
                    <div class="golf-header">
                        <span class="golf-title">⛳ Índice de Jugabilidad</span>
                        <span class="golf-emoji">${golfDesc.emoji}</span>
                    </div>
                    <div class="golf-score">${golfScore}<span class="golf-max">/100</span></div>
                    <div class="golf-desc">${golfDesc.text}</div>
                </div>`;
        }

        if (this.currentMode === 'beach') {
            const mc = marine?.current;
            extraHtml += mc ? `
                <div class="special-card beach-card">
                    <div class="special-title">🏖️ Condiciones del mar</div>
                    <div class="special-grid">
                        <div class="special-item"><span class="special-label">Oleaje</span><span class="special-value">${mc.waveHeight != null ? mc.waveHeight.toFixed(1) + ' m' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Período</span><span class="special-value">${mc.wavePeriod != null ? mc.wavePeriod.toFixed(1) + ' s' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Mar de fondo</span><span class="special-value">${mc.swellHeight != null ? mc.swellHeight.toFixed(1) + ' m' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Dirección</span><span class="special-value">${mc.waveDir != null ? TrafficLight.getWindDirection(mc.waveDir) : '—'}</span></div>
                    </div>
                </div>` : `
                <div class="special-card beach-card"><div class="special-title">🏖️ Condiciones del mar</div><p style="color:#888">No disponible para esta ubicación</p></div>`;
        }

        if (this.currentMode === 'mountain') {
            const mc = weather.current;
            extraHtml += `
                <div class="special-card mountain-card">
                    <div class="special-title">🏔️ Datos de montaña</div>
                    <div class="special-grid">
                        <div class="special-item"><span class="special-label">Sensación</span><span class="special-value">${mc.feelsLike != null ? Math.round(mc.feelsLike) + '°C' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Nieve</span><span class="special-value">${mc.snowfall != null ? mc.snowfall.toFixed(1) + ' cm' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">CAPE</span><span class="special-value">${mc.cape != null ? Math.round(mc.cape) + ' J/kg' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Visibilidad</span><span class="special-value">${mc.visibility != null ? (mc.visibility / 1000).toFixed(1) + ' km' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Presión</span><span class="special-value">${mc.pressure != null ? Math.round(mc.pressure) + ' hPa' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Humedad</span><span class="special-value">${mc.humidity != null ? mc.humidity + '%' : '—'}</span></div>
                    </div>
                </div>`;
        }

        if ((this.currentMode === 'general' || this.currentMode === 'golf') && aqi) {
            const aqiValue = aqi.us_aqi;
            if (aqiValue != null) {
                const aqiState = aqiValue <= 50 ? 'green' : aqiValue <= 100 ? 'orange' : 'red';
                const aqiLabel = aqiValue <= 50 ? 'Buena' : aqiValue <= 100 ? 'Moderada' : 'Mala';
                extraHtml += `
                    <div class="special-card aqi-card">
                        <div class="special-title">🌬️ Calidad del aire</div>
                        <div class="aqi-value ${aqiState}">${aqiValue} <span>AQI</span></div>
                        <div class="aqi-label">${aqiLabel}</div>
                    </div>`;
            }
        }

        if (this.currentMode === 'general') {
            const c = weather.current;
            const d = weather.daily;
            extraHtml += `
                <div class="special-card summary-card">
                    <div class="special-title">📊 Datos actuales</div>
                    <div class="special-grid">
                        <div class="special-item"><span class="special-label">Sensación</span><span class="special-value">${c.feelsLike != null ? Math.round(c.feelsLike) + '°C' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Humedad</span><span class="special-value">${c.humidity != null ? c.humidity + '%' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Presión</span><span class="special-value">${c.pressure != null ? Math.round(c.pressure) + ' hPa' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">UV máx</span><span class="special-value">${d.uvMax != null ? d.uvMax.toFixed(1) : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Máx / Mín</span><span class="special-value">${d.tempMax != null ? Math.round(d.tempMax) + '°' : '—'} / ${d.tempMin != null ? Math.round(d.tempMin) + '°' : '—'}</span></div>
                        <div class="special-item"><span class="special-label">Viento máx</span><span class="special-value">${d.windMax != null ? Math.round(d.windMax) + ' km/h' : '—'}</span></div>
                    </div>
                </div>`;
        }

        const sc = document.getElementById('special-cards');
        sc.innerHTML = extraHtml ? `
            <div class="section-header"><h3>Datos adicionales</h3></div>
            <div class="special-cards-grid">${extraHtml}</div>` : '';
    },

    async handlePOISearch() {
        const input = document.getElementById('poi-search-input');
        const query = input.value.trim();
        if (query.length < 2) return;

        let centerLat = 40.4168, centerLon = -3.7038;
        if (MapModule.selectedCoords) {
            centerLat = MapModule.selectedCoords.lat;
            centerLon = MapModule.selectedCoords.lon;
        }

        const results = await MapModule.searchPOIs(query, centerLat, centerLon);
        const resultsDiv = document.getElementById('poi-results');

        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="poi-result-item"><strong>No se encontraron resultados</strong></div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        resultsDiv.innerHTML = results.slice(0, 8).map(r => `
            <div class="poi-result-item" data-lat="${r.lat}" data-lon="${r.lon}">
                <strong>${r.display_name.split(',')[0]}</strong>
                <small>${r.display_name.split(',').slice(1, 3).join(',')}</small>
            </div>
        `).join('');

        resultsDiv.querySelectorAll('.poi-result-item[data-lat]').forEach(item => {
            item.addEventListener('click', () => {
                MapModule.map.setView([parseFloat(item.dataset.lat), parseFloat(item.dataset.lon)], 16);
            });
        });
        resultsDiv.classList.remove('hidden');
    },

    updateFavoriteButton(isFavorite) {
        const btn = document.getElementById('btn-save-favorite');
        btn.textContent = isFavorite ? '★ Guardada' : '☆ Guardar zona';
        btn.className = isFavorite ? 'btn-fav saved' : 'btn-fav';
    },

    saveFavorite() {
        if (!MapModule.selectedCoords || !this.currentLocationName) return;
        const { lat, lon } = MapModule.selectedCoords;
        if (Favorites.isFavorite(lat, lon)) {
            Favorites.remove(lat, lon);
            this.updateFavoriteButton(false);
        } else {
            Favorites.add(this.currentLocationName, lat, lon);
            this.updateFavoriteButton(true);
        }
        Favorites.renderList((lat, lon, name) => {
            document.getElementById('favorites-panel').classList.add('hidden');
            MapModule.setLocation(lat, lon, name);
        });
    },

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
        this.loading = show;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
