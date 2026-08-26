/* ============================================
   TU TIEMPO - Mapa (Google Maps + Búsqueda)
   ============================================ */

const MapModule = {
    map: null,
    marker: null,
    selectedCoords: null,
    onLocationSelect: null,
    onClear: null,
    poiMarkers: [],

    init(callback, clearCallback) {
        this.onLocationSelect = callback;
        this.onClear = clearCallback;

        this.map = L.map('map', {
            center: [40.4168, -3.7038],
            zoom: 6,
            zoomControl: false
        });

        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Botón ubicación actual
        const locationBtn = L.control({ position: 'topright' });
        locationBtn.onAdd = function() {
            const btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            btn.innerHTML = '<a href="#" title="Mi ubicación" style="background:white;color:#333;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none;border-radius:4px;">📍</a>';
            btn.style.cssText = 'border:none;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
            L.DomEvent.disableClickPropagation(btn);
            btn.onclick = function(e) {
                e.preventDefault();
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(pos) {
                        MapModule.setLocation(pos.coords.latitude, pos.coords.longitude);
                    }, function() {
                        alert('No se pudo obtener tu ubicación');
                    });
                }
                return false;
            };
            return btn;
        };
        locationBtn.addTo(this.map);

        // Capa Google Maps
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&s=Ga', {
            attribution: '&copy; Google Maps',
            maxZoom: 20
        }).addTo(this.map);

        // Clic en el mapa → colocar pin
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.setLocation(lat, lng);
        });

        // Mover ratón → actualizar coordenadas
        this.map.on('mousemove', (e) => {
            this.updateCoordsBar(e.latlng.lat, e.latlng.lng, true);
        });

        this.map.on('mouseout', () => {
            if (this.selectedCoords) {
                this.updateCoordsBar(this.selectedCoords.lat, this.selectedCoords.lon);
            } else {
                document.getElementById('map-coords-text').textContent = 
                    'Haz clic en el mapa para ver coordenadas';
            }
        });
    },

    /**
     * Coloca el pin en el mapa
     */
    setLocation(lat, lon, name = null) {
        this.selectedCoords = { lat, lon };
        this.updateCoordsBar(lat, lon);

        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        const icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:24px;height:24px;background:#e74c3c;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);position:relative;"><div style="width:8px;height:8px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
        });

        this.marker = L.marker([lat, lon], { icon }).addTo(this.map);
        this.marker.bindPopup(`
            <div style="padding:2px;">
                <strong style="font-size:14px;color:#202124;">${name || 'Ubicación seleccionada'}</strong><br>
                <span style="font-size:12px;color:#70757a;">${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
            </div>
        `).openPopup();

        this.map.setView([lat, lon], 10, { animate: true });

        if (this.onLocationSelect) {
            this.onLocationSelect(lat, lon, name);
        }
    },

    /**
     * Limpia el pin del mapa
     */
    clearLocation() {
        if (this.marker) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
        this.selectedCoords = null;
        
        const bar = document.getElementById('map-coords-text');
        if (bar) bar.textContent = 'Haz clic en el mapa para ver coordenadas';

        if (this.onClear) {
            this.onClear();
        }
    },

    /**
     * Busca puntos de interés con Nominatim y coloca marcadores
     */
    async searchPOIs(query, centerLat, centerLon) {
        this.clearPOIs();

        try {
            const bbox = this.getBbox(centerLat, centerLon, 15000);
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=15&bounded=1&viewbox=${bbox}&addressdetails=1`;
            
            const response = await fetch(url, {
                headers: { 'Accept-Language': 'es' }
            });
            if (!response.ok) return [];

            const results = await response.json();
            const poiIcons = {
                'golf': '⛳', 'restaurant': '🍽️', 'restaurante': '🍽️',
                'hotel': '🏨', 'parking': '🅿️', 'aparcamiento': '🅿️',
                'beach': '🏖️', 'playa': '🏖️', 'supermarket': '🛒',
                'supermercado': '🛒', 'café': '☕', 'bar': '🍺',
                'museum': '🏛️', 'museo': '🏛️', 'pharmacy': '💊',
                'farmacia': '💊', 'hospital': '🏥', 'shop': '🛍️',
                'tienda': '🛍️', 'park': '🌳', 'parque': '🌳'
            };

            results.forEach(r => {
                const type = r.type || r.class || '';
                const icon = Object.entries(poiIcons).find(([k]) => 
                    type.toLowerCase().includes(k) || (r.class || '').toLowerCase().includes(k)
                );
                const emoji = icon ? icon[1] : '📍';

                const poiIcon = L.divIcon({
                    className: 'poi-marker',
                    html: `<div style="font-size:24px;text-shadow:0 2px 4px rgba(0,0,0,0.5);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${emoji}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                });

                const marker = L.marker([parseFloat(r.lat), parseFloat(r.lon)], { icon: poiIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="min-width:160px;">
                            <strong style="font-size:13px;">${emoji} ${r.display_name.split(',')[0]}</strong><br>
                            <small style="color:#666;">${r.display_name.split(',').slice(1, 3).join(',')}</small><br>
                            <small style="color:#999;">${r.type || r.class || ''}</small>
                        </div>
                    `);

                this.poiMarkers.push(marker);
            });

            if (results.length > 0) {
                const group = L.featureGroup(this.poiMarkers);
                this.map.fitBounds(group.getBounds().pad(0.2));
            }

            return results;
        } catch (e) {
            console.error('Error buscando POIs:', e);
            return [];
        }
    },

    /**
     * Calcula bbox alrededor de un punto
     */
    getBbox(lat, lon, radiusMeters) {
        const latDelta = radiusMeters / 111320;
        const lonDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
        const south = lat - latDelta;
        const north = lat + latDelta;
        const west = lon - lonDelta;
        const east = lon + lonDelta;
        return `${west},${south},${east},${north}`;
    },

    /**
     * Limpia los marcadores de POIs
     */
    clearPOIs() {
        this.poiMarkers.forEach(m => this.map.removeLayer(m));
        this.poiMarkers = [];
    },

    updateCoordsBar(lat, lon, isHover = false) {
        const bar = document.getElementById('map-coords-text');
        if (!bar) return;
        const prefix = isHover ? '🔍 ' : '📍 ';
        bar.textContent = `${prefix}${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    },

    async getLocationName(lat, lon) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`
            );
            const data = await response.json();
            
            if (data.address) {
                const parts = [];
                if (data.address.city || data.address.town || data.address.village) {
                    parts.push(data.address.city || data.address.town || data.address.village);
                }
                if (data.address.state) parts.push(data.address.state);
                if (data.address.country) parts.push(data.address.country);
                return parts.join(', ') || data.display_name.split(',').slice(0, 3).join(',');
            }
            return data.display_name.split(',').slice(0, 3).join(',');
        } catch (e) {
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    }
};
