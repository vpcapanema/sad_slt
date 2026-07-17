(async function () {
      await SLTReferencia.loadReferencia("../");
      const params = new URLSearchParams(location.search);
      SLTReferencia.renderPlanosPage(document.getElementById("conteudo"), {
        diretoriaId: params.get("diretoria") || "",
      });
      const hash = location.hash.replace("#", "");
      if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    })();
