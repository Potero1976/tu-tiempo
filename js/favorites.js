/* ============================================
   TU TIEMPO - Gestión de Favoritos
   ============================================ */

const Favorites = {
    STORAGE_KEY: 'tu-tiempo-favorites',

    /**
     * Obtiene todos los favoritos
     * @returns {Array}
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Añade un favorito
     * @param {string} name
     * @param {number} lat
     * @param {number} lon
     */
    add(name, lat, lon) {
        const favorites = this.getAll();
        // Verificar si ya existe
        const exists = favorites.some(f => 
            Math.abs(f.lat - lat) < 0.001 && Math.abs(f.lon - lon) < 0.001
        );
        if (exists) return false;

        favorites.push({
            name,
            lat,
            lon,
            addedAt: Date.now()
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
        return true;
    },

    /**
     * Elimina un favorito
     * @param {number} lat
     * @param {number} lon
     */
    remove(lat, lon) {
        let favorites = this.getAll();
        favorites = favorites.filter(f => 
            !(Math.abs(f.lat - lat) < 0.001 && Math.abs(f.lon - lon) < 0.001)
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    },

    /**
     * Comprueba si una ubicación es favorita
     * @param {number} lat
     * @param {number} lon
     * @returns {boolean}
     */
    isFavorite(lat, lon) {
        return this.getAll().some(f => 
            Math.abs(f.lat - lat) < 0.001 && Math.abs(f.lon - lon) < 0.001
        );
    },

    /**
     * Renderiza la lista de favoritos en el panel
     * @param {Function} onSelect - Callback al seleccionar un favorito
     */
    renderList(onSelect) {
        const container = document.getElementById('favorites-list');
        const favorites = this.getAll();

        if (favorites.length === 0) {
            container.innerHTML = '<p class="no-favorites">No hay zonas guardadas aún</p>';
            return;
        }

        container.innerHTML = favorites.map(fav => `
            <div class="favorite-item" data-lat="${fav.lat}" data-lon="${fav.lon}">
                <div>
                    <div class="fav-name">📍 ${fav.name}</div>
                    <div class="fav-coords">${fav.lat.toFixed(4)}, ${fav.lon.toFixed(4)}</div>
                </div>
                <button class="fav-delete" data-lat="${fav.lat}" data-lon="${fav.lon}" title="Eliminar">🗑️</button>
            </div>
        `).join('');

        // Eventos de clic
        container.querySelectorAll('.favorite-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('fav-delete')) return;
                const lat = parseFloat(item.dataset.lat);
                const lon = parseFloat(item.dataset.lon);
                onSelect(lat, lon, item.querySelector('.fav-name').textContent.replace('📍 ', ''));
            });
        });

        // Eventos de eliminar
        container.querySelectorAll('.fav-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lat = parseFloat(btn.dataset.lat);
                const lon = parseFloat(btn.dataset.lon);
                this.remove(lat, lon);
                this.renderList(onSelect);
            });
        });
    }
};
