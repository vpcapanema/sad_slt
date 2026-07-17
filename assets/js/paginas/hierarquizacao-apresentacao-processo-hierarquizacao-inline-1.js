(() => {
      "use strict";
      const slides = [...document.querySelectorAll(".slide:not([hidden])")];
      const counter = document.getElementById("slide-counter");
      const progress = document.getElementById("progress-bar");
      const dots = document.getElementById("dots");
      let current = 0;

      const goTo = (index) => {
        const safe = Math.max(0, Math.min(slides.length - 1, index));
        slides[safe].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      };

      slides.forEach((slide, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Ir para o slide ${index + 1}`);
        dot.addEventListener("click", () => goTo(index));
        dots.appendChild(dot);
      });
      const dotButtons = [...dots.querySelectorAll("button")];

      const update = (index) => {
        current = index;
        counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
        progress.style.width = `${((index + 1) / slides.length) * 100}%`;
        dotButtons.forEach((dot, i) => dot.classList.toggle("active", i === index));
        document.title = `${index + 1}/${slides.length} — As Três Fases da Hierarquização — SLT`;
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) update(slides.indexOf(entry.target));
        });
      }, { threshold: .58 });
      slides.forEach((slide) => observer.observe(slide));

      document.getElementById("prev-slide").addEventListener("click", () => goTo(current - 1));
      document.getElementById("next-slide").addEventListener("click", () => goTo(current + 1));
      document.addEventListener("keydown", (event) => {
        if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); goTo(current + 1); }
        if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); goTo(current - 1); }
        if (event.key === "Home") { event.preventDefault(); goTo(0); }
        if (event.key === "End") { event.preventDefault(); goTo(slides.length - 1); }
      });
      update(0);
    })();
