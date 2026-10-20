(async function () {
  await SLTReferencia.iniciarPagina((container) => {
    const params = new URLSearchParams(location.search);
    SLTReferencia.renderPlanosPage(container, {
      diretoriaId: params.get("diretoria") || "",
    });
  });
})();
