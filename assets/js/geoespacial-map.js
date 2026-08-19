/* Componente de mapa compartilhado — Bloco de Geoprocessamento (MapLibre GL) */
(function () {
  window.GeoespacialMap = {
    map: null,
    layers: new Map(),
    layerIds: [],
    symbolStyles: new Map(),
    symbolSequence: 0,

    getLayerProperties: function (layerId) {
      try { return JSON.parse(localStorage.getItem(`slt-map-layer:${layerId}`) || "{}"); }
      catch (_error) { return {}; }
    },

    getLayerStyle: function (layerId) {
      if (this.symbolStyles.has(layerId)) return this.symbolStyles.get(layerId);
      const colors = ["#e76f51", "#2a9d8f", "#3a86ff", "#9b5de5", "#f4a261", "#00a6a6", "#ef476f", "#577590", "#6a994e", "#ff7f11", "#4361ee", "#8f2d56"];
      const index = this.symbolSequence++;
      const style = {
        color: colors[index % colors.length],
        fillColor: colors[index % colors.length],
        fillOpacity: .25 + (index % 4) * .09,
        lineWidth: 1.7 + (index % 5) * .55,
        pointRadius: 4.5 + (index % 6) * .75,
        lineStyle: "solid",
        fillMode: "translucent",
        ...this.getLayerProperties(layerId),
      };
      this.symbolStyles.set(layerId, style);
      return style;
    },

    saveLayerProperties: function (layerId, properties) {
      const current = this.getLayerProperties(layerId);
      const saved = { ...current, ...properties };
      localStorage.setItem(`slt-map-layer:${layerId}`, JSON.stringify(saved));
      const style = { ...this.getLayerStyle(layerId), ...saved };
      this.symbolStyles.set(layerId, style);
      this.applyLayerProperties(layerId, saved);
      return saved;
    },

    applyLayerProperties: function (layerId, properties) {
      const info = this.layers.get(layerId);
      if (!info || !this.map) return;
      const style = { ...info.style, ...properties };
      const invalid = "#dc2626";
      const validityColor = (normal) => ["case", ["==", ["get", "slt_geometria_valida"], false], invalid, normal];
      const fillOpacity = style.fillMode === "outline" ? 0 : style.fillMode === "solid" ? 1 : Number(style.fillOpacity);
      const dash = style.lineStyle === "dashed" ? [4, 3] : style.lineStyle === "dotted" ? [1, 2] : [1, 0];
      const [fillId, lineId, pointId] = info.mapLayerIds;
      if (this.map.getLayer(fillId)) { this.map.setPaintProperty(fillId, "fill-color", validityColor(style.fillColor || style.color));this.map.setPaintProperty(fillId, "fill-opacity", ["case", ["==", ["get", "slt_geometria_valida"], false], .68, fillOpacity]);this.map.setPaintProperty(fillId, "fill-outline-color", validityColor(style.color)); }
      if (this.map.getLayer(lineId)) { this.map.setPaintProperty(lineId, "line-color", validityColor(style.color));this.map.setPaintProperty(lineId, "line-width", ["case", ["==", ["get", "slt_geometria_valida"], false], Number(style.lineWidth) + 2, Number(style.lineWidth)]);this.map.setPaintProperty(lineId, "line-dasharray", dash); }
      if (this.map.getLayer(pointId)) { this.map.setPaintProperty(pointId, "circle-color", validityColor(style.color));this.map.setPaintProperty(pointId, "circle-radius", ["case", ["==", ["get", "slt_geometria_valida"], false], Number(style.pointRadius) + 3, Number(style.pointRadius)]); }
      if (this.map.getLayer(info.labelLayerId) && properties.alias) this.map.setLayoutProperty(info.labelLayerId, "text-field", properties.alias);
      info.style = style;
    },

    init: function (elementId, options = {}) {
      if (this.map) {
        return this.map;
      }

      const defaultOptions = {
        center: [-46.6333, -23.5505],
        zoom: 6.2,
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } },
          layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
        },
      };

      const { nativeTools = false, ...mapOptions } = options;
      this.map = new maplibregl.Map({
        container: elementId,
        ...defaultOptions,
        ...mapOptions,
      });

      this.map.once("load", () => {
        document.querySelector(`#${elementId} .painel-map-loading`)?.remove();
      });

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: nativeTools }), "bottom-right");
      if (nativeTools) {
        this.map.addControl(new maplibregl.FullscreenControl(), "top-right");
        this.map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showAccuracyCircle: true,
          showUserHeading: true,
        }), "top-right");
        this.map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
      }

      return this.map;
    },

    addLayer: function (layerId, geojsonData, options = {}) {
      if (!this.map) {
        console.error("Map not initialized");
        return null;
      }

      const sourceId = `source-${layerId}`;
      const mapLayerIds = [`layer-${layerId}-fill`, `layer-${layerId}-line`, `layer-${layerId}-point`];
      const labelLayerId = `layer-${layerId}-label`;

      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });
      }

      const alertColor = "#dc2626";
      const uniqueStyle = options.uniqueStyle ? this.getLayerStyle(layerId) : null;
      const style = { color: options.color || uniqueStyle?.color || "#1683c4", fillColor: uniqueStyle?.fillColor || options.color || uniqueStyle?.color || "#1683c4", fillOpacity: uniqueStyle?.fillOpacity || .34, lineWidth: uniqueStyle?.lineWidth || 2, pointRadius: uniqueStyle?.pointRadius || 5, lineStyle: uniqueStyle?.lineStyle || "solid", fillMode: uniqueStyle?.fillMode || "translucent" };
      const colorByValidity = (normal) => ["case", ["==", ["get", "slt_geometria_valida"], false], alertColor, normal];
      this.map.addLayer({ id: mapLayerIds[0], type: "fill", source: sourceId, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": colorByValidity(style.fillColor), "fill-opacity": ["case", ["==", ["get", "slt_geometria_valida"], false], .68, style.fillMode === "outline" ? 0 : style.fillMode === "solid" ? 1 : style.fillOpacity], "fill-outline-color": colorByValidity(style.color) } });
      this.map.addLayer({ id: mapLayerIds[1], type: "line", source: sourceId, filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]], paint: { "line-color": colorByValidity(style.color), "line-width": ["case", ["==", ["get", "slt_geometria_valida"], false], style.lineWidth + 2, style.lineWidth], "line-dasharray": style.lineStyle === "dashed" ? [4,3] : style.lineStyle === "dotted" ? [1,2] : [1,0] } });
      this.map.addLayer({ id: mapLayerIds[2], type: "circle", source: sourceId, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": colorByValidity(style.color), "circle-radius": ["case", ["==", ["get", "slt_geometria_valida"], false], style.pointRadius + 3, style.pointRadius], "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
      this.map.addLayer({ id: labelLayerId, type: "symbol", source: sourceId, layout: { visibility: options.labelsVisible ? "visible" : "none", "text-field": options.label || layerId, "text-font": ["Noto Sans Regular"], "text-size": 12, "text-anchor": "center", "text-allow-overlap": false }, paint: { "text-color": "#173f2b", "text-halo-color": "#fff", "text-halo-width": 2 } });

      this.layers.set(layerId, { sourceId, mapLayerIds, labelLayerId, style, labelsVisible: Boolean(options.labelsVisible), visible: true, data: geojsonData });
      this.layerIds.push(layerId);

      return mapLayerIds;
    },

    addVectorTileLayer: function (layerId, tileUrl, options = {}) {
      if (!this.map) return null;
      const absoluteTileUrl = /^https?:\/\//i.test(tileUrl)
        ? tileUrl
        : `${window.location.origin}${tileUrl.startsWith("/") ? "" : "/"}${tileUrl}`;
      const sourceId = `source-${layerId}`;
      const mapLayerIds = [`layer-${layerId}-fill`, `layer-${layerId}-line`, `layer-${layerId}-point`];
      const labelLayerId = `layer-${layerId}-label`;
      const sourceLayer = options.sourceLayer || "camada";
      if (!this.map.getSource(sourceId)) this.map.addSource(sourceId, { type: "vector", tiles: [absoluteTileUrl], minzoom: 0, maxzoom: 22 });
      const alertColor = "#dc2626";
      const uniqueStyle = options.uniqueStyle ? this.getLayerStyle(layerId) : null;
      const style = { color: options.color || uniqueStyle?.color || "#1683c4", fillColor: uniqueStyle?.fillColor || options.color || uniqueStyle?.color || "#1683c4", fillOpacity: uniqueStyle?.fillOpacity || .34, lineWidth: uniqueStyle?.lineWidth || 2, pointRadius: uniqueStyle?.pointRadius || 5, lineStyle: uniqueStyle?.lineStyle || "solid", fillMode: uniqueStyle?.fillMode || "translucent" };
      const colorByValidity = (normal) => ["case", ["==", ["get", "slt_geometria_valida"], false], alertColor, normal];
      this.map.addLayer({ id: mapLayerIds[0], type: "fill", source: sourceId, "source-layer": sourceLayer, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": colorByValidity(style.fillColor), "fill-opacity": ["case", ["==", ["get", "slt_geometria_valida"], false], .68, style.fillMode === "outline" ? 0 : style.fillMode === "solid" ? 1 : style.fillOpacity], "fill-outline-color": colorByValidity(style.color) } });
      this.map.addLayer({ id: mapLayerIds[1], type: "line", source: sourceId, "source-layer": sourceLayer, filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]], paint: { "line-color": colorByValidity(style.color), "line-width": ["case", ["==", ["get", "slt_geometria_valida"], false], style.lineWidth + 2, style.lineWidth], "line-dasharray": style.lineStyle === "dashed" ? [4,3] : style.lineStyle === "dotted" ? [1,2] : [1,0] } });
      this.map.addLayer({ id: mapLayerIds[2], type: "circle", source: sourceId, "source-layer": sourceLayer, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": colorByValidity(style.color), "circle-radius": ["case", ["==", ["get", "slt_geometria_valida"], false], style.pointRadius + 3, style.pointRadius], "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
      this.map.addLayer({ id: labelLayerId, type: "symbol", source: sourceId, "source-layer": sourceLayer, layout: { visibility: options.labelsVisible ? "visible" : "none", "text-field": options.label || layerId, "text-font": ["Noto Sans Regular"], "text-size": 12, "text-anchor": "center", "text-allow-overlap": false }, paint: { "text-color": "#173f2b", "text-halo-color": "#fff", "text-halo-width": 2 } });
      this.layers.set(layerId, { sourceId, mapLayerIds, labelLayerId, style, labelsVisible: Boolean(options.labelsVisible), visible: true, data: null, bounds: options.bounds || null, tiled: true });
      this.layerIds.push(layerId);
      return mapLayerIds;
    },

    removeLayer: function (layerId) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo && this.map) {
        if (this.map.getLayer(layerInfo.labelLayerId)) this.map.removeLayer(layerInfo.labelLayerId);
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
        layerInfo.visible = visible;
        if (this.map.getLayer(layerInfo.labelLayerId)) this.map.setLayoutProperty(layerInfo.labelLayerId, "visibility", visible && layerInfo.labelsVisible ? "visible" : "none");
      }
    },

    toggleLabels: function (layerId, visible) {
      const layerInfo = this.layers.get(layerId);
      if (!layerInfo || !this.map) return;
      layerInfo.labelsVisible = visible;
      if (this.map.getLayer(layerInfo.labelLayerId)) this.map.setLayoutProperty(layerInfo.labelLayerId, "visibility", visible && layerInfo.visible ? "visible" : "none");
    },

    clearLayers: function () {
      this.layerIds.forEach((layerId) => this.removeLayer(layerId));
      this.layers.clear();
      this.layerIds = [];
    },

    fitBounds: function (layerId) {
      const layerInfo = this.layers.get(layerId);
      if (layerInfo?.bounds) {
        this.map.fitBounds([[layerInfo.bounds[0], layerInfo.bounds[1]], [layerInfo.bounds[2], layerInfo.bounds[3]]], { padding: 50 });
        return;
      }
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
