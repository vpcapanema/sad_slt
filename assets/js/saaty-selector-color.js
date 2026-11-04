(function () {
  "use strict";
  var palettes = new WeakMap();
  function palette(pair) {
    var arrow = pair.querySelector(".saaty-arrow"), rail = pair.querySelector(".saaty-rail");
    var ticks = pair.querySelectorAll(".saaty-tick");
    var style = getComputedStyle(arrow), gradient = style.backgroundImage;
    var bounds = arrow.getBoundingClientRect(), track = rail.getBoundingClientRect();
    if (!bounds.width && palettes.has(pair)) return palettes.get(pair);
    if (gradient === "none") {
      return Array.from(ticks, function () { return { background: style.backgroundColor, text: style.color }; });
    }
    var stops = Array.from(gradient.matchAll(/rgba?\(([^)]+)\)\s+([\d.]+)%/g), function (match) {
      return {position: Number(match[2]) / 100, rgb: match[1].split(",").slice(0, 3).map(Number)};
    });
    if (stops.length < 2) throw new Error("Degradê da régua Saaty sem níveis de cor reconhecíveis.");
    var colors = Array.from(ticks, function (_tick, index) {
      var fraction = index / (ticks.length - 1);
      var position = bounds.width ? (track.left + track.width * fraction - bounds.left) / bounds.width : fraction;
      if (style.transform !== "none" && new DOMMatrixReadOnly(style.transform).a < 0) position = 1 - position;
      position = Math.max(stops[0].position, Math.min(stops[stops.length - 1].position, position));
      var right = stops.findIndex(function (stop) { return stop.position >= position; });
      var end = stops[right], start = stops[Math.max(0, right - 1)];
      var ratio = end.position === start.position ? 0 : (position - start.position) / (end.position - start.position);
      var rgb = start.rgb.map(function (channel, i) {
        return Math.round(channel + (end.rgb[i] - channel) * ratio);
      });
      return { background: "rgb(" + rgb.join(",") + ")",
        halo: "rgba(" + rgb.join(",") + ",0.35)",
        text: (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 >= 150 ? "#0d3b66" : "#fff" };
    });
    palettes.set(pair, colors);
    return colors;
  }
  function update(pair) {
    var scale = pair.querySelector(".saaty-scale"), handle = pair.querySelector(".saaty-handle");
    var colors = palette(pair);
    var color = colors[Number(scale.getAttribute("aria-valuenow"))];
    handle.style.backgroundColor = color.background;
    pair.querySelectorAll(".saaty-tick").forEach(function (tick, index) {
      var selected = index === Number(scale.getAttribute("aria-valuenow"));
      tick.classList.toggle("is-selected", selected);
      if (selected) {
        tick.style.setProperty("--tick-cor", color.background);
        tick.style.setProperty("--tick-halo", color.halo || "transparent");
        tick.style.setProperty("--tick-texto", color.text);
      }
    });
  }
  window.SLTSaatySelectorColor = {update: update, palette: palette};
  window.addEventListener("resize", function () {
    document.querySelectorAll(".saaty-pair").forEach(update);
  });
})();
