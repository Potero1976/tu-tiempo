/* ============================================
   TU TIEMPO - API Open-Meteo
   ============================================ */

const WeatherAPI = {
    BASE_URL: 'https://api.open-meteo.com/v1/forecast',
    MARINE_URL: 'https://marine-api.open-meteo.com/v1/marine',
    AQI_URL: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    GEOCODING_URL: 'https://geocoding-api.open-meteo.com/v1/search',

    async getForecast(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,pressure_msl,uv_index,is_day,cape,snowfall,shortwave_radiation,freezing_level_height',
            current: 'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover,pressure_msl,is_day,cape,visibility,uv_index',
            daily: 'uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
            forecast_days: 3,
            timezone: 'auto'
        });

        const url = `${this.BASE_URL}?${params}`;
        console.log('Fetching weather:', url);
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            console.error('Open-Meteo error:', response.status, text);
            throw new Error(`Error HTTP: ${response.status} - ${text}`);
        }
        const data = await response.json();
        console.log('Weather data OK:', data.current);
        return data;
    },

    async getMarineForecast(lat, lon) {
        try {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                hourly: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period',
                current: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period',
            forecast_days: 7,
                timezone: 'auto'
            });
            const response = await fetch(`${this.MARINE_URL}?${params}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.warn('Marine API no disponible:', e.message);
            return null;
        }
    },

    async getAirQuality(lat, lon) {
        try {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current: 'us_aqi,pm10,pm2_5,ozone',
                forecast_days: 1,
                timezone: 'auto'
            });
            const response = await fetch(`${this.AQI_URL}?${params}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.warn('Air Quality API no disponible:', e.message);
            return null;
        }
    },

    async searchLocation(query) {
        const params = new URLSearchParams({
            name: query,
            count: 5,
            language: 'es',
            format: 'json'
        });
        const response = await fetch(`${this.GEOCODING_URL}?${params}`);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    },

    getWindDirection(degrees) {
        if (degrees === null || degrees === undefined) return '—';
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        return dirs[Math.round(degrees / 45) % 8];
    },

    processForecast(data) {
        const now = new Date();

        const current = {
            temperature: data.current.temperature_2m,
            feelsLike: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            dewPoint: data.current.dew_point_2m,
            weatherCode: data.current.weather_code,
            wind: data.current.wind_speed_10m,
            windDir: data.current.wind_direction_10m,
            gusts: data.current.wind_gusts_10m,
            precipitation: data.current.precipitation,
            cloudCover: data.current.cloud_cover,
            pressure: data.current.pressure_msl,
            isDay: data.current.is_day,
            cape: data.current.cape,
            visibility: data.current.visibility,
            uvIndex: data.current.uv_index
        };

        const hourly = [];
        const times = data.hourly.time;

        for (let i = 0; i < times.length; i++) {
            const time = new Date(times[i]);
            const timeDiff = (time - now) / (1000 * 60 * 60);

            if (timeDiff >= -0.5) {
                hourly.push({
                    time: times[i],
                    hour: time.getHours(),
                    hourStr: `${time.getHours().toString().padStart(2, '0')}:00`,
                    isCurrent: Math.abs(timeDiff) < 0.5,
                    temperature: data.hourly.temperature_2m[i],
                    feelsLike: data.hourly.apparent_temperature[i],
                    humidity: data.hourly.relative_humidity_2m[i],
                    dewPoint: data.hourly.dew_point_2m[i],
                    rainProb: data.hourly.precipitation_probability[i],
                    precipitation: data.hourly.precipitation[i],
                    weatherCode: data.hourly.weather_code[i],
                    cloudCover: data.hourly.cloud_cover[i],
                    wind: data.hourly.wind_speed_10m[i],
                    windDir: data.hourly.wind_direction_10m[i],
                    gusts: data.hourly.wind_gusts_10m[i],
                    visibility: data.hourly.visibility[i],
                    pressure: data.hourly.pressure_msl[i],
                    uvIndex: data.hourly.uv_index[i],
                    isDay: data.hourly.is_day[i],
                    cape: data.hourly.cape[i],
                    snowfall: data.hourly.snowfall[i],
                    solarRadiation: data.hourly.shortwave_radiation[i],
                    freezingLevel: data.hourly.freezing_level_height[i]
                });
            }
        }

        const daily = {
            uvMax: data.daily?.uv_index_max?.[0] ?? null,
            tempMax: data.daily?.temperature_2m_max?.[0] ?? null,
            tempMin: data.daily?.temperature_2m_min?.[0] ?? null,
            precipSum: data.daily?.precipitation_sum?.[0] ?? null,
            sunrise: data.daily?.sunrise?.[0] ?? null,
            sunset: data.daily?.sunset?.[0] ?? null,
            windMax: data.daily?.wind_speed_10m_max?.[0] ?? null,
            gustsMax: data.daily?.wind_gusts_10m_max?.[0] ?? null,
            windDirDominant: data.daily?.wind_direction_10m_dominant?.[0] ?? null
        };

        return { current, hourly, daily, timezone: data.timezone };
    },

    processMarine(data) {
        if (!data) return null;
        const current = {
            waveHeight: data.current?.wave_height ?? null,
            waveDir: data.current?.wave_direction ?? null,
            wavePeriod: data.current?.wave_period ?? null,
            swellHeight: data.current?.swell_wave_height ?? null,
            swellPeriod: data.current?.swell_wave_period ?? null
        };
        return { current };
    },

    async getCompleteData(lat, lon) {
        console.log('getCompleteData called for', lat, lon);

        const weatherRaw = await this.getForecast(lat, lon);
        const weather = this.processForecast(weatherRaw);

        let marineData = null;
        try {
            const marine = await this.getMarineForecast(lat, lon);
            marineData = this.processMarine(marine);
        } catch (e) {
            console.warn('Marine falló:', e.message);
        }

        let aqi = null;
        try {
            const aqiRaw = await this.getAirQuality(lat, lon);
            aqi = aqiRaw?.current ?? null;
        } catch (e) {
            console.warn('AQI falló:', e.message);
        }

        return { weather, marine: marineData, aqi, timezone: weather.timezone };
    }
};
