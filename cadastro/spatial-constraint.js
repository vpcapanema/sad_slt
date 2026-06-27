(function (global) {
  /** Referência espacial do vínculo institucional (ids + metadados para análise via API). */
  let parentFc = null;
  let parentMeta = null;
  let parentUnidadeIds = [];

  function setParent(fc, meta, unidadeIds) {
    parentFc = fc?.features?.length ? fc : null;
    parentMeta = parentFc ? meta || null : null;
    parentUnidadeIds = parentFc && unidadeIds?.length ? unidadeIds.slice() : [];
  }

  function clear() {
    parentFc = null;
    parentMeta = null;
    parentUnidadeIds = [];
  }

  function hasParent() {
    return parentUnidadeIds.length > 0;
  }

  function getParentIds() {
    return parentUnidadeIds.slice();
  }

  function getMeta() {
    return parentMeta;
  }

  global.SLTSpatialConstraint = {
    setParent,
    clear,
    hasParent,
    getParentIds,
    getMeta,
  };
})(window);
