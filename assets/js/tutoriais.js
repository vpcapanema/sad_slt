"use strict";

document.querySelectorAll("article video").forEach((video) => {
  const status = video.closest("article").querySelector(".erro-midia");
  video.addEventListener("error", () => {
    status.textContent = "Não foi possível reproduzir este vídeo. Tente novamente ou use o link para baixar o MP4.";
    status.hidden = false;
  });
  video.addEventListener("loadeddata", () => {
    status.hidden = true;
    status.textContent = "";
  });
  video.querySelector("track").addEventListener("error", () => {
    status.textContent = "A faixa de legendas opcional não pôde ser carregada. O vídeo mantém as legendas incorporadas.";
    status.hidden = false;
  });
});
