(function () {
  "use strict";
  function update(pair) {
    var arrow = pair.querySelector(".saaty-arrow"), rail = pair.querySelector(".saaty-rail");
    var scale = pair.querySelector(".saaty-scale"), handle = pair.querySelector(".saaty-handle");
    var style = getComputedStyle(arrow), gradient = style.backgroundImage;
    if (gradient === "none") {
      handle.style.backgroundColor = style.backgroundColor;
      return;
    }
    var stops = Array.from(gradient.matchAll(/rgba?\(([^)]+)\)\s+([\d.]+)%/g), function (match) {
      return {position: Number(match[2]) / 100, rgb: match[1].split(",").slice(0, 3).map(Number)};
    });
    if (stops.length < 2) throw new Error("Degradê da régua Saaty sem níveis de cor reconhecíveis.");
    var fraction = Number(scale.getAttribute("aria-valuenow")) / Number(scale.getAttribute("aria-valuemax"));
    var bounds = arrow.getBoundingClientRect(), track = rail.getBoundingClientRect();
    var position = bounds.width ? (track.left + track.width * fraction - bounds.left) / bounds.width : fraction;
    if (style.transform !== "none" && new DOMMatrixReadOnly(style.transform).a < 0) position = 1 - position;
    position = Math.max(stops[0].position, Math.min(stops[stops.length - 1].position, position));
    var right = stops.findIndex(function (stop) { return stop.position >= position; });
    var end = stops[right], start = stops[Math.max(0, right - 1)];
    var ratio = end.position === start.position ? 0 : (position - start.position) / (end.position - start.position);
    var rgb = start.rgb.map(function (channel, i) {
      return Math.round(channel + (end.rgb[i] - channel) * ratio);
    });
    var color = "rgb(" + rgb.join(",") + ")";
    handle.style.backgroundColor = color;
    pair.querySelectorAll(".saaty-tick").forEach(function (tick, index) {
      var selected = index === Number(scale.getAttribute("aria-valuenow"));
      tick.classList.toggle("is-selected", selected);
      if (selected) {
        tick.style.setProperty("--tick-cor", color);
        tick.style.setProperty("--tick-halo", "rgba(" + rgb.join(",") + ",0.35)");
        tick.style.setProperty("--tick-texto", (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 >= 150 ? "#0d3b66" : "#fff");
      }
    });
  }
  window.SLTSaatySelectorColor = {update: update};
  window.addEventListener("resize", function () {
    document.querySelectorAll(".saaty-pair").forEach(update);
  });
})();
