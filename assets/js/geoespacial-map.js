/* Componente de mapa compartilhado — Bloco de Geoprocessamento (MapLibre GL) */
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
        zoom: 6.2,
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } },
          layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
        },
      };

      this.map = new maplibregl.Map({
        container: elementId,
        ...defaultOptions,
        ...options,
      });

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      return this.map;
    },

    addLayer: function (layerId, geojsonData, options = {}) {
      if (!this.map) {
        console.error("Map not initialized");
        return null;
      }

      const sourceId = `source-${layerId}`;
      const mapLayerIds = [`layer-${layerId}-fill`, `layer-${layerId}-line`, `layer-${layerId}-point`];

      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });
      }

      this.map.addLayer({ id: mapLayerIds[0], type: "fill", source: sourceId, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": options.color || "#1683c4", "fill-opacity": .34, "fill-outline-color": "#075b89" } });
      this.map.addLayer({ id: mapLayerIds[1], type: "line", source: sourceId, filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": options.color || "#075b89", "line-width": 2 } });
      this.map.addLayer({ id: mapLayerIds[2], type: "circle", source: sourceId, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": options.color || "#d97819", "circle-radius": 5, "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });

      this.layers.set(layerId, { sourceId, mapLayerIds, data: geojsonData });
      this.layerIds.push(layerId);

      return mapLayerIds;
    },

    removeLayer: function (layerId) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo && this.map) {
        layerInfo.mapLayerIds.forEach((id) => { if (this.map.getLayer(id)) this.map.removeLayer(id); });
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
        layerInfo.mapLayerIds.forEach((id) => { if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", visible ? "visible" : "none"); });
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
