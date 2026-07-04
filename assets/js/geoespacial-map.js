/* Componente de mapa compartilhado — Módulo Geoespacial */
(function () {
  window.GeoespacialMap = {
    map: null,
    layers: new Map(),
    layerGroup: null,

    init: function (elementId, options = {}) {
      if (this.map) {
        return this.map;
      }

      const defaultOptions = {
        center: [-23.5505, -46.6333],
        zoom: 10,
        zoomControl: true,
      };

      this.map = L.map(elementId, { ...defaultOptions, ...options });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.map);

      this.layerGroup = L.layerGroup().addTo(this.map);

      return this.map;
    },

    addLayer: function (layerId, geojsonData, options = {}) {
      if (!this.map) {
        console.error("Map not initialized");
        return null;
      }

      const defaultOptions = {
        style: {
          color: "#116593",
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3,
        },
      };

      const layer = L.geoJSON(geojsonData, { ...defaultOptions, ...options });
      this.layers.set(layerId, layer);
      this.layerGroup.addLayer(layer);

      return layer;
    },

    removeLayer: function (layerId) {
      const layer = this.layers.get(layerId);
      if (layer) {
        this.layerGroup.removeLayer(layer);
        this.layers.delete(layerId);
      }
    },

    toggleLayer: function (layerId, visible) {
      const layer = this.layers.get(layerId);
      if (layer) {
        if (visible) {
          this.layerGroup.addLayer(layer);
        } else {
          this.layerGroup.removeLayer(layer);
        }
      }
    },

    clearLayers: function () {
      this.layerGroup.clearLayers();
      this.layers.clear();
    },

    fitBounds: function (layerId) {
      const layer = this.layers.get(layerId);
      if (layer && layer.getBounds()) {
        this.map.fitBounds(layer.getBounds());
      }
    },

    fitAllBounds: function () {
      if (this.layers.size > 0) {
        const bounds = L.latLngBounds([]);
        this.layers.forEach((layer) => {
          if (layer.getBounds()) {
            bounds.extend(layer.getBounds());
          }
        });
        if (bounds.isValid()) {
          this.map.fitBounds(bounds);
        }
      }
    },
  };
})();
