(function () {
  "use strict";
  var source = document.getElementById("metricRCValue");
  var target = document.getElementById("collab-rc-sticky");
  var quadrant = document.querySelector(".collab-pairs-quadrant");
  if (!source || !target || !quadrant) return;
  var card = source.closest(".ahp-metric-card");
  var progress = document.getElementById("collab-reciprocal-hint");
  var overlay = target.parentElement;
  var preferred = null;
  var drag = null;
  var resize = null;
  var defaultScale = 0.9;
  var requestedScale = defaultScale;
  var scale = defaultScale;
  var grip = overlay.querySelector(".collab-rc-resize");
  var frame = 0;
  function schedule() {
    if (!frame) frame = requestAnimationFrame(place);
  }
  function sync() {
    target.className = card.className;
    var copy = card.cloneNode(true);
    copy.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
    // O status original já anuncia as mudanças; a cópia permanece consultável.
    copy.querySelectorAll('[role="status"]').forEach(function (node) {
      node.removeAttribute("role");
    });
    target.replaceChildren.apply(target, Array.from(copy.childNodes));
    if (progress) target.appendChild(progress);
    schedule();
  }
  sync();
  new MutationObserver(sync).observe(card, { subtree: true, childList: true, characterData: true, attributes: true });

  var header = document.querySelector(".app-header");
  function place() {
    frame = 0;
    var rect = quadrant.getBoundingClientRect();
    var bottom = 0;
    if (header && ["fixed", "sticky"].includes(getComputedStyle(header).position)) {
      bottom = Math.max(0, header.getBoundingClientRect().bottom);
    }
    var zoom = quadrant.currentCSSZoom || 1;
    overlay.hidden = !quadrant.querySelector(".saaty-pair, .collab-readonly-matrix td") ||
      rect.bottom <= bottom || rect.top >= innerHeight || !rect.width;
    if (overlay.hidden) return;
    // O zoom inclui tipografia, bordas e espaçamentos, sem reformatar o conteúdo.
    var naturalWidth = target.offsetWidth * zoom;
    var naturalHeight = target.offsetHeight * zoom;
    var availableHeight = Math.min(rect.height, innerHeight - bottom - 24);
    var limit = Math.min(2, document.documentElement.clientWidth / naturalWidth, availableHeight / naturalHeight);
    // Se nem 50% couber, aguarda uma viewport acessível sem reduzir abaixo do mínimo.
    if (limit < 0.5) {
      overlay.hidden = true;
      return;
    }
    scale = Math.max(0.5, Math.min(requestedScale, limit));
    overlay.style.setProperty("--rc-scale", scale);
    grip.setAttribute("aria-label", "Redimensionar indicador de consistência: " + Math.round(scale * 100) + "%");
    var size = overlay.getBoundingClientRect();
    var minX = 0;
    var maxX = Math.max(0, document.documentElement.clientWidth - size.width);
    var minY = Math.max(rect.top, bottom + 12);
    var maxY = Math.min(rect.bottom, innerHeight - 12) - size.height;
    // Nas bordas do quadrante, mantém o indicador e seu canto acessíveis na viewport.
    if (maxY < minY) {
      minY = Math.max(bottom + 12, Math.min(minY, innerHeight - 12 - size.height));
      maxY = minY;
    }
    var x = Math.max(minX, Math.min(maxX, preferred ? preferred.x : Math.min(rect.right - size.width, maxX)));
    var y = Math.max(minY, Math.min(maxY, preferred ? preferred.y : minY));
    overlay.style.left = ((x - rect.left) / zoom) + "px";
    overlay.style.top = ((y - rect.top) / zoom) + "px";
    overlay.style.right = "auto";
  }
  function isInteractive(element) {
    var control = element.closest('a, button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [tabindex]');
    return control && control !== overlay;
  }
  grip.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    var rect = overlay.getBoundingClientRect();
    preferred = { x: rect.left, y: rect.top };
    resize = { id: event.pointerId, x: event.clientX, y: event.clientY,
      width: rect.width / scale, height: rect.height / scale, scale: scale };
    grip.setPointerCapture(event.pointerId);
    grip.focus({ preventScroll: true });
  });
  grip.addEventListener("pointermove", function (event) {
    if (!resize || event.pointerId !== resize.id) return;
    // Projeção na diagonal: uma única escala preserva a razão largura/altura.
    var delta = ((event.clientX - resize.x) * resize.width +
      (event.clientY - resize.y) * resize.height) /
      (resize.width * resize.width + resize.height * resize.height);
    requestedScale = Math.max(0.5, Math.min(2, resize.scale + delta));
    schedule();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
    grip.addEventListener(name, function (event) {
      if (resize && event.pointerId === resize.id) resize = null;
    });
  });
  grip.addEventListener("keydown", function (event) {
    var direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (event.key === "Home") requestedScale = defaultScale;
    else if (event.key === "End") requestedScale = 2;
    else if (direction) requestedScale = Math.max(0.5, Math.min(2, scale + direction * (event.shiftKey ? 0.25 : 0.05)));
    else return;
    event.preventDefault();
    event.stopPropagation();
    schedule();
  });
  overlay.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary || event.button !== 0 || isInteractive(event.target)) return;
    var rect = overlay.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    overlay.setPointerCapture(event.pointerId);
    overlay.classList.add("is-dragging");
    event.preventDefault();
    overlay.focus({ preventScroll: true });
  });
  overlay.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    preferred = { x: event.clientX - drag.x, y: event.clientY - drag.y };
    schedule();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
    overlay.addEventListener(name, function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      overlay.classList.remove("is-dragging");
    });
  });
  overlay.addEventListener("keydown", function (event) {
    if (isInteractive(event.target)) return;
    var delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (event.key === "Home") preferred = null;
    else if (delta) {
      var rect = overlay.getBoundingClientRect();
      var step = event.shiftKey ? 40 : 10;
      preferred = { x: rect.left + delta[0] * step, y: rect.top + delta[1] * step };
    } else return;
    event.preventDefault();
    schedule();
  });
  var observer = new ResizeObserver(schedule);
  observer.observe(quadrant);
  observer.observe(overlay);
  if (header) observer.observe(header);
  new MutationObserver(schedule).observe(quadrant, { childList: true, subtree: true });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
})();
