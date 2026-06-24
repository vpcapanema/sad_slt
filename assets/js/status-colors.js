(function (global) {
  /** Paleta compartilhada: sidebar (badge) e halo no mapa usam as mesmas cores. */
  const STATUS_DEMANDA = {
    rascunho: {
      nome: "Rascunho",
      bg: "#eef1f4",
      text: "#5a6570",
      halo: "rgba(90, 101, 112, 0.42)",
    },
    fila_hierarquizacao: {
      nome: "Fila de hierarquização",
      bg: "#e3edf7",
      text: "#2c5282",
      halo: "rgba(44, 82, 130, 0.42)",
    },
    em_analise: {
      nome: "Em análise",
      bg: "#fff4a8",
      text: "#c49a00",
      halo: "rgba(196, 154, 0, 0.38)",
    },
    aprovada: {
      nome: "Aprovada",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    hierarquizado: {
      nome: "Hierarquizado",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    reprovada: {
      nome: "Reprovada",
      bg: "#fdecea",
      text: "#922b21",
      halo: "rgba(146, 43, 33, 0.42)",
    },
    arquivada: {
      nome: "Arquivada",
      bg: "#eceff1",
      text: "#546e7a",
      halo: "rgba(84, 110, 122, 0.42)",
    },
  };

  const STATUS_OBJETO = {
    elegivel_ahp: {
      nome: "Elegível AHP",
      bg: "#e3edf7",
      text: "#2c5282",
      halo: "rgba(44, 82, 130, 0.42)",
    },
    em_hierarquizacao: {
      nome: "Em hierarquização",
      bg: "#fff4a8",
      text: "#c49a00",
      halo: "rgba(196, 154, 0, 0.38)",
    },
    hierarquizado: {
      nome: "Hierarquizado",
      bg: "#e6f6ed",
      text: "#1a6b3c",
      halo: "rgba(26, 107, 60, 0.42)",
    },
    suspenso: {
      nome: "Suspenso",
      bg: "#eceff1",
      text: "#546e7a",
      halo: "rgba(84, 110, 122, 0.42)",
    },
    retirado: {
      nome: "Retirado",
      bg: "#fdecea",
      text: "#922b21",
      halo: "rgba(146, 43, 33, 0.42)",
    },
  };

  const FALLBACK = {
    nome: "—",
    bg: "#e8eef3",
    text: "#2d3748",
    halo: "rgba(45, 55, 72, 0.4)",
  };

  function getStatusDemanda(codigo) {
    return STATUS_DEMANDA[codigo] || { ...FALLBACK, nome: codigo || FALLBACK.nome };
  }

  function getStatusObjeto(codigo) {
    return STATUS_OBJETO[codigo] || { ...FALLBACK, nome: codigo || FALLBACK.nome };
  }

  function badgeClass(codigo) {
    return `badge-status ${String(codigo || "").replace(/\s+/g, "")}`;
  }

  global.SLTStatusColors = {
    STATUS_DEMANDA,
    STATUS_OBJETO,
    getStatusDemanda,
    getStatusObjeto,
    badgeClass,
  };
})(window);
