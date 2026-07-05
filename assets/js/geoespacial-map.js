/* Componente de mapa compartilhado — Módulo Geoespacial (MapLibre GL) */
(function () {
  window.GeoespacialMap = {
    map: null,
    layers: new Map(),
    layerIds: [],

    init: function (elementId, options = {}) {
      if (this.map) {
        return this.map;
      }

      const defaultOptions = {
        center: [-46.6333, -23.5505],
        zoom: 10,
        style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      };

      this.map = new maplibregl.Map({
        container: elementId,
        ...defaultOptions,
        ...options,
      });

      this.map.on("load", () => {
        this.map.addSource("osm", {
          type: "raster",
          tiles: ["https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        });
        this.map.addLayer({
          id: "osm-layer",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 19,
        });
      });

      return this.map;
    },

    addLayer: function (layerId, geojsonData, options = {}) {
      if (!this.map) {
        console.error("Map not initialized");
        return null;
      }

      const defaultOptions = {
        type: "fill",
        paint: {
          "fill-color": "#116593",
          "fill-opacity": 0.3,
          "fill-outline-color": "#116593",
        },
      };

      const sourceId = `source-${layerId}`;
      const layerIdFull = `layer-${layerId}`;

      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });
      }

      this.map.addLayer({
        id: layerIdFull,
        source: sourceId,
        ...defaultOptions,
        ...options,
      });

      this.layers.set(layerId, { sourceId, layerIdFull, data: geojsonData });
      this.layerIds.push(layerId);

      return layerIdFull;
    },

    removeLayer: function (layerId) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo && this.map) {
        if (this.map.getLayer(layerInfo.layerIdFull)) {
          this.map.removeLayer(layerInfo.layerIdFull);
        }
        if (this.map.getSource(layerInfo.sourceId)) {
          this.map.removeSource(layerInfo.sourceId);
        }
        this.layers.delete(layerId);
        this.layerIds = this.layerIds.filter((id) => id !== layerId);
      }
    },

    toggleLayer: function (layerId, visible) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo && this.map) {
        this.map.setLayoutProperty(layerInfo.layerIdFull, "visibility", visible ? "visible" : "none");
      }
    },

    clearLayers: function () {
      this.layerIds.forEach((layerId) => this.removeLayer(layerId));
      this.layers.clear();
      this.layerIds = [];
    },

    fitBounds: function (layerId) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo && layerInfo.data) {
        const bounds = this.calculateBounds(layerInfo.data);
        if (bounds) {
          this.map.fitBounds(bounds, { padding: 50 });
        }
      }
    },

    fitAllBounds: function () {
      if (this.layers.size > 0) {
        const allBounds = [];
        this.layers.forEach((layerInfo) => {
          if (layerInfo.data) {
            const bounds = this.calculateBounds(layerInfo.data);
            if (bounds) {
              allBounds.push(bounds);
            }
          }
        });
        if (allBounds.length > 0) {
          const combinedBounds = this.combineBounds(allBounds);
          this.map.fitBounds(combinedBounds, { padding: 50 });
        }
      }
    },

    calculateBounds: function (geojsonData) {
      if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        return null;
      }

      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;

      const processCoordinates = (coords) => {
        if (Array.isArray(coords[0])) {
          coords.forEach(processCoordinates);
        } else {
          const [lng, lat] = coords;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        }
      };

      geojsonData.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          processCoordinates(feature.geometry.coordinates);
        }
      });

      if (minLng === Infinity) {
        return null;
      }

      return [[minLng, minLat], [maxLng, maxLat]];
    },

    combineBounds: function (boundsArray) {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;

      boundsArray.forEach((bounds) => {
        minLng = Math.min(minLng, bounds[0][0]);
        minLat = Math.min(minLat, bounds[0][1]);
        maxLng = Math.max(maxLng, bounds[1][0]);
        maxLat = Math.max(maxLat, bounds[1][1]);
      });

      return [[minLng, minLat], [maxLng, maxLat]];
    },
  };
})();
