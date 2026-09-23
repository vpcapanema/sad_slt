var To = { exports: {} }, mn = {};
var lr;
function ch() {
  if (lr) return mn;
  lr = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), al = /* @__PURE__ */ Symbol.for("react.fragment");
  function X(h, el, nl) {
    var Ml = null;
    if (nl !== void 0 && (Ml = "" + nl), el.key !== void 0 && (Ml = "" + el.key), "key" in el) {
      nl = {};
      for (var Ll in el)
        Ll !== "key" && (nl[Ll] = el[Ll]);
    } else nl = el;
    return el = nl.ref, {
      $$typeof: A,
      type: h,
      key: Ml,
      ref: el !== void 0 ? el : null,
      props: nl
    };
  }
  return mn.Fragment = al, mn.jsx = X, mn.jsxs = X, mn;
}
var tr;
function fh() {
  return tr || (tr = 1, To.exports = ch()), To.exports;
}
var T = fh(), Eo = { exports: {} }, G = {};
var ar;
function oh() {
  if (ar) return G;
  ar = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), al = /* @__PURE__ */ Symbol.for("react.portal"), X = /* @__PURE__ */ Symbol.for("react.fragment"), h = /* @__PURE__ */ Symbol.for("react.strict_mode"), el = /* @__PURE__ */ Symbol.for("react.profiler"), nl = /* @__PURE__ */ Symbol.for("react.consumer"), Ml = /* @__PURE__ */ Symbol.for("react.context"), Ll = /* @__PURE__ */ Symbol.for("react.forward_ref"), Sl = /* @__PURE__ */ Symbol.for("react.suspense"), Al = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), b = /* @__PURE__ */ Symbol.for("react.activity"), x = /* @__PURE__ */ Symbol.for("react.view_transition"), ml = Symbol.iterator;
  function jl(s) {
    return s === null || typeof s != "object" ? null : (s = ml && s[ml] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var El = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, ll = Object.assign, ut = {};
  function Ol(s, _, M) {
    this.props = s, this.context = _, this.refs = ut, this.updater = M || El;
  }
  Ol.prototype.isReactComponent = {}, Ol.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, Ol.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function L() {
  }
  L.prototype = Ol.prototype;
  function Fl(s, _, M) {
    this.props = s, this.context = _, this.refs = ut, this.updater = M || El;
  }
  var zt = Fl.prototype = new L();
  zt.constructor = Fl, ll(zt, Ol.prototype), zt.isPureReactComponent = !0;
  var Zl = Array.isArray;
  function K() {
  }
  var $ = { H: null, A: null, T: null, S: null }, rt = Object.prototype.hasOwnProperty;
  function et(s, _, M) {
    var R = M.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: R !== void 0 ? R : null,
      props: M
    };
  }
  function vt(s, _) {
    return et(s.type, _, s.props);
  }
  function xl(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function Bt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(M) {
      return _[M];
    });
  }
  var ct = /\/+/g;
  function Ul(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? Bt("" + s.key) : _.toString(36);
  }
  function N(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(K, K) : (s.status = "pending", s.then(
          function(_) {
            s.status === "pending" && (s.status = "fulfilled", s.value = _);
          },
          function(_) {
            s.status === "pending" && (s.status = "rejected", s.reason = _);
          }
        )), s.status) {
          case "fulfilled":
            return s.value;
          case "rejected":
            throw s.reason;
        }
    }
    throw s;
  }
  function B(s, _, M, R, J) {
    var I = typeof s;
    (I === "undefined" || I === "boolean") && (s = null);
    var tl = !1;
    if (s === null) tl = !0;
    else
      switch (I) {
        case "bigint":
        case "string":
        case "number":
          tl = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case al:
              tl = !0;
              break;
            case j:
              return tl = s._init, B(
                tl(s._payload),
                _,
                M,
                R,
                J
              );
          }
      }
    if (tl)
      return J = J(s), tl = R === "" ? "." + Ul(s, 0) : R, Zl(J) ? (M = "", tl != null && (M = tl.replace(ct, "$&/") + "/"), B(J, _, M, "", function(Jt) {
        return Jt;
      })) : J != null && (xl(J) && (J = vt(
        J,
        M + (J.key == null || s && s.key === J.key ? "" : ("" + J.key).replace(
          ct,
          "$&/"
        ) + "/") + tl
      )), _.push(J)), 1;
    tl = 0;
    var U = R === "" ? "." : R + ":";
    if (Zl(s))
      for (var Y = 0; Y < s.length; Y++)
        R = s[Y], I = U + Ul(R, Y), tl += B(
          R,
          _,
          M,
          I,
          J
        );
    else if (Y = jl(s), typeof Y == "function")
      for (s = Y.call(s), Y = 0; !(R = s.next()).done; )
        R = R.value, I = U + Ul(R, Y++), tl += B(
          R,
          _,
          M,
          I,
          J
        );
    else if (I === "object") {
      if (typeof s.then == "function")
        return B(
          N(s),
          _,
          M,
          R,
          J
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return tl;
  }
  function H(s, _, M) {
    if (s == null) return s;
    var R = [], J = 0;
    return B(s, R, "", "", function(I) {
      return _.call(M, I, J++);
    }), R;
  }
  function sl(s) {
    if (s._status === -1) {
      var _ = s._result, M = _();
      M.then(
        function(R) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = R, M.status === void 0 && (M.status = "fulfilled", M.value = R));
        },
        function(R) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = R, M.status === void 0 && (M.status = "rejected", M.reason = R));
        }
      ), s._status === -1 && (s._status = 0, s._result = M);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var il = typeof reportError == "function" ? reportError : function(s) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var _ = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof s == "object" && s !== null && typeof s.message == "string" ? String(s.message) : String(s),
        error: s
      });
      if (!window.dispatchEvent(_)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", s);
      return;
    }
    console.error(s);
  };
  function nt(s) {
    var _ = $.T, M = {};
    M.types = _ !== null ? _.types : null, $.T = M;
    try {
      var R = s(), J = $.S;
      J !== null && J(M, R), typeof R == "object" && R !== null && typeof R.then == "function" && R.then(K, il);
    } catch (I) {
      il(I);
    } finally {
      _ !== null && M.types !== null && (_.types = M.types), $.T = _;
    }
  }
  function Bl(s) {
    var _ = $.T;
    if (_ !== null) {
      var M = _.types;
      M === null ? _.types = [s] : M.indexOf(s) === -1 && M.push(s);
    } else nt(Bl.bind(null, s));
  }
  var la = {
    map: H,
    forEach: function(s, _, M) {
      H(
        s,
        function() {
          _.apply(this, arguments);
        },
        M
      );
    },
    count: function(s) {
      var _ = 0;
      return H(s, function() {
        _++;
      }), _;
    },
    toArray: function(s) {
      return H(s, function(_) {
        return _;
      }) || [];
    },
    only: function(s) {
      if (!xl(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return G.Activity = b, G.Children = la, G.Component = Ol, G.Fragment = X, G.Profiler = el, G.PureComponent = Fl, G.StrictMode = h, G.Suspense = Sl, G.ViewTransition = x, G.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $, G.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return $.H.useMemoCache(s);
    }
  }, G.addTransitionType = Bl, G.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, G.cacheSignal = function() {
    return null;
  }, G.cloneElement = function(s, _, M) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var R = ll({}, s.props), J = s.key;
    if (_ != null)
      for (I in _.key !== void 0 && (J = "" + _.key), _)
        !rt.call(_, I) || I === "key" || I === "__self" || I === "__source" || I === "ref" && _.ref === void 0 || (R[I] = _[I]);
    var I = arguments.length - 2;
    if (I === 1) R.children = M;
    else if (1 < I) {
      for (var tl = Array(I), U = 0; U < I; U++)
        tl[U] = arguments[U + 2];
      R.children = tl;
    }
    return et(s.type, J, R);
  }, G.createContext = function(s) {
    return s = {
      $$typeof: Ml,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: nl,
      _context: s
    }, s;
  }, G.createElement = function(s, _, M) {
    var R, J = {}, I = null;
    if (_ != null)
      for (R in _.key !== void 0 && (I = "" + _.key), _)
        rt.call(_, R) && R !== "key" && R !== "__self" && R !== "__source" && (J[R] = _[R]);
    var tl = arguments.length - 2;
    if (tl === 1) J.children = M;
    else if (1 < tl) {
      for (var U = Array(tl), Y = 0; Y < tl; Y++)
        U[Y] = arguments[Y + 2];
      J.children = U;
    }
    if (s && s.defaultProps)
      for (R in tl = s.defaultProps, tl)
        J[R] === void 0 && (J[R] = tl[R]);
    return et(s, I, J);
  }, G.createRef = function() {
    return { current: null };
  }, G.forwardRef = function(s) {
    return { $$typeof: Ll, render: s };
  }, G.isValidElement = xl, G.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: sl
    };
  }, G.memo = function(s, _) {
    return {
      $$typeof: Al,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, G.startTransition = nt, G.unstable_useCacheRefresh = function() {
    return $.H.useCacheRefresh();
  }, G.use = function(s) {
    return $.H.use(s);
  }, G.useActionState = function(s, _, M) {
    return $.H.useActionState(s, _, M);
  }, G.useCallback = function(s, _) {
    return $.H.useCallback(s, _);
  }, G.useContext = function(s) {
    return $.H.useContext(s);
  }, G.useDebugValue = function() {
  }, G.useDeferredValue = function(s, _) {
    return $.H.useDeferredValue(s, _);
  }, G.useEffect = function(s, _) {
    return $.H.useEffect(s, _);
  }, G.useEffectEvent = function(s) {
    return $.H.useEffectEvent(s);
  }, G.useId = function() {
    return $.H.useId();
  }, G.useImperativeHandle = function(s, _, M) {
    return $.H.useImperativeHandle(s, _, M);
  }, G.useInsertionEffect = function(s, _) {
    return $.H.useInsertionEffect(s, _);
  }, G.useLayoutEffect = function(s, _) {
    return $.H.useLayoutEffect(s, _);
  }, G.useMemo = function(s, _) {
    return $.H.useMemo(s, _);
  }, G.useOptimistic = function(s, _) {
    return $.H.useOptimistic(s, _);
  }, G.useReducer = function(s, _, M) {
    return $.H.useReducer(s, _, M);
  }, G.useRef = function(s) {
    return $.H.useRef(s);
  }, G.useState = function(s) {
    return $.H.useState(s);
  }, G.useSyncExternalStore = function(s, _, M) {
    return $.H.useSyncExternalStore(
      s,
      _,
      M
    );
  }, G.useTransition = function() {
    return $.H.useTransition();
  }, G.version = "19.3.0", G;
}
var ur;
function Uo() {
  return ur || (ur = 1, Eo.exports = oh()), Eo.exports;
}
var Nl = Uo(), zo = { exports: {} }, rn = {}, _o = { exports: {} }, Oo = {};
var er;
function sh() {
  return er || (er = 1, (function(A) {
    function al(N, B) {
      var H = N.length;
      N.push(B);
      l: for (; 0 < H; ) {
        var sl = H - 1 >>> 1, il = N[sl];
        if (0 < el(il, B))
          N[sl] = B, N[H] = il, H = sl;
        else break l;
      }
    }
    function X(N) {
      return N.length === 0 ? null : N[0];
    }
    function h(N) {
      if (N.length === 0) return null;
      var B = N[0], H = N.pop();
      if (H !== B) {
        N[0] = H;
        l: for (var sl = 0, il = N.length, nt = il >>> 1; sl < nt; ) {
          var Bl = 2 * (sl + 1) - 1, la = N[Bl], s = Bl + 1, _ = N[s];
          if (0 > el(la, H))
            s < il && 0 > el(_, la) ? (N[sl] = _, N[s] = H, sl = s) : (N[sl] = la, N[Bl] = H, sl = Bl);
          else if (s < il && 0 > el(_, H))
            N[sl] = _, N[s] = H, sl = s;
          else break l;
        }
      }
      return B;
    }
    function el(N, B) {
      var H = N.sortIndex - B.sortIndex;
      return H !== 0 ? H : N.id - B.id;
    }
    if (A.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var nl = performance;
      A.unstable_now = function() {
        return nl.now();
      };
    } else {
      var Ml = Date, Ll = Ml.now();
      A.unstable_now = function() {
        return Ml.now() - Ll;
      };
    }
    var Sl = [], Al = [], j = 1, b = null, x = 3, ml = !1, jl = !1, El = !1, ll = !1, ut = typeof setTimeout == "function" ? setTimeout : null, Ol = typeof clearTimeout == "function" ? clearTimeout : null, L = typeof setImmediate < "u" ? setImmediate : null;
    function Fl(N) {
      for (var B = X(Al); B !== null; ) {
        if (B.callback === null) h(Al);
        else if (B.startTime <= N)
          h(Al), B.sortIndex = B.expirationTime, al(Sl, B);
        else break;
        B = X(Al);
      }
    }
    function zt(N) {
      if (El = !1, Fl(N), !jl)
        if (X(Sl) !== null)
          jl = !0, Zl || (Zl = !0, xl());
        else {
          var B = X(Al);
          B !== null && Ul(zt, B.startTime - N);
        }
    }
    var Zl = !1, K = -1, $ = 5, rt = -1;
    function et() {
      return ll ? !0 : !(A.unstable_now() - rt < $);
    }
    function vt() {
      if (ll = !1, Zl) {
        var N = A.unstable_now();
        rt = N;
        var B = !0;
        try {
          l: {
            jl = !1, El && (El = !1, Ol(K), K = -1), ml = !0;
            var H = x;
            try {
              t: {
                for (Fl(N), b = X(Sl); b !== null && !(b.expirationTime > N && et()); ) {
                  var sl = b.callback;
                  if (typeof sl == "function") {
                    b.callback = null, x = b.priorityLevel;
                    var il = sl(
                      b.expirationTime <= N
                    );
                    if (N = A.unstable_now(), typeof il == "function") {
                      b.callback = il, Fl(N), B = !0;
                      break t;
                    }
                    b === X(Sl) && h(Sl), Fl(N);
                  } else h(Sl);
                  b = X(Sl);
                }
                if (b !== null) B = !0;
                else {
                  var nt = X(Al);
                  nt !== null && Ul(
                    zt,
                    nt.startTime - N
                  ), B = !1;
                }
              }
              break l;
            } finally {
              b = null, x = H, ml = !1;
            }
            B = void 0;
          }
        } finally {
          B ? xl() : Zl = !1;
        }
      }
    }
    var xl;
    if (typeof L == "function")
      xl = function() {
        L(vt);
      };
    else if (typeof MessageChannel < "u") {
      var Bt = new MessageChannel(), ct = Bt.port2;
      Bt.port1.onmessage = vt, xl = function() {
        ct.postMessage(null);
      };
    } else
      xl = function() {
        ut(vt, 0);
      };
    function Ul(N, B) {
      K = ut(function() {
        N(A.unstable_now());
      }, B);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(N) {
      N.callback = null;
    }, A.unstable_forceFrameRate = function(N) {
      0 > N || 125 < N ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : $ = 0 < N ? Math.floor(1e3 / N) : 5;
    }, A.unstable_getCurrentPriorityLevel = function() {
      return x;
    }, A.unstable_next = function(N) {
      switch (x) {
        case 1:
        case 2:
        case 3:
          var B = 3;
          break;
        default:
          B = x;
      }
      var H = x;
      x = B;
      try {
        return N();
      } finally {
        x = H;
      }
    }, A.unstable_requestPaint = function() {
      ll = !0;
    }, A.unstable_runWithPriority = function(N, B) {
      switch (N) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          N = 3;
      }
      var H = x;
      x = N;
      try {
        return B();
      } finally {
        x = H;
      }
    }, A.unstable_scheduleCallback = function(N, B, H) {
      var sl = A.unstable_now();
      switch (typeof H == "object" && H !== null ? (H = H.delay, H = typeof H == "number" && 0 < H ? sl + H : sl) : H = sl, N) {
        case 1:
          var il = -1;
          break;
        case 2:
          il = 250;
          break;
        case 5:
          il = 1073741823;
          break;
        case 4:
          il = 1e4;
          break;
        default:
          il = 5e3;
      }
      return il = H + il, N = {
        id: j++,
        callback: B,
        priorityLevel: N,
        startTime: H,
        expirationTime: il,
        sortIndex: -1
      }, H > sl ? (N.sortIndex = H, al(Al, N), X(Sl) === null && N === X(Al) && (El ? (Ol(K), K = -1) : El = !0, Ul(zt, H - sl))) : (N.sortIndex = il, al(Sl, N), jl || ml || (jl = !0, Zl || (Zl = !0, xl()))), N;
    }, A.unstable_shouldYield = et, A.unstable_wrapCallback = function(N) {
      var B = x;
      return function() {
        var H = x;
        x = B;
        try {
          return N.apply(this, arguments);
        } finally {
          x = H;
        }
      };
    };
  })(Oo)), Oo;
}
var nr;
function dh() {
  return nr || (nr = 1, _o.exports = sh()), _o.exports;
}
var No = { exports: {} }, at = {};
var ir;
function mh() {
  if (ir) return at;
  ir = 1;
  var A = Uo();
  function al(j) {
    var b = "https://react.dev/errors/" + j;
    if (1 < arguments.length) {
      b += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var x = 2; x < arguments.length; x++)
        b += "&args[]=" + encodeURIComponent(arguments[x]);
    }
    return "Minified React error #" + j + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function X() {
  }
  var h = {
    d: {
      f: X,
      r: function() {
        throw Error(al(522));
      },
      D: X,
      C: X,
      L: X,
      m: X,
      X,
      S: X,
      M: X
    },
    p: 0,
    findDOMNode: null
  }, el = /* @__PURE__ */ Symbol.for("react.portal"), nl = /* @__PURE__ */ Symbol.for("react.recoverable"), Ml = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Ll(j, b, x) {
    var ml = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: el,
      key: ml == null ? null : ml === Ml ? Ml : "" + ml,
      children: j,
      containerInfo: b,
      implementation: x
    };
  }
  var Sl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function Al(j, b) {
    if (j === "font") return "";
    if (typeof b == "string")
      return b === "use-credentials" ? b : "";
  }
  return at.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = h, at.browser = function(j) {
    return { $$typeof: nl, _reason: j };
  }, at.createPortal = function(j, b) {
    var x = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!b || b.nodeType !== 1 && b.nodeType !== 9 && b.nodeType !== 11)
      throw Error(al(299));
    return Ll(j, b, null, x);
  }, at.flushSync = function(j) {
    var b = Sl.T, x = h.p;
    try {
      if (Sl.T = null, h.p = 2, j) return j();
    } finally {
      Sl.T = b, h.p = x, h.d.f();
    }
  }, at.preconnect = function(j, b) {
    typeof j == "string" && (b ? (b = b.crossOrigin, b = typeof b == "string" ? b === "use-credentials" ? b : "" : void 0) : b = null, h.d.C(j, b));
  }, at.prefetchDNS = function(j) {
    typeof j == "string" && h.d.D(j);
  }, at.preinit = function(j, b) {
    if (typeof j == "string" && b && typeof b.as == "string") {
      var x = b.as, ml = Al(x, b.crossOrigin), jl = typeof b.integrity == "string" ? b.integrity : void 0, El = typeof b.fetchPriority == "string" ? b.fetchPriority : void 0;
      x === "style" ? h.d.S(
        j,
        typeof b.precedence == "string" ? b.precedence : void 0,
        {
          crossOrigin: ml,
          integrity: jl,
          fetchPriority: El
        }
      ) : x === "script" && h.d.X(j, {
        crossOrigin: ml,
        integrity: jl,
        fetchPriority: El,
        nonce: typeof b.nonce == "string" ? b.nonce : void 0
      });
    }
  }, at.preinitModule = function(j, b) {
    if (typeof j == "string")
      if (typeof b == "object" && b !== null) {
        if (b.as == null || b.as === "script") {
          var x = Al(
            b.as,
            b.crossOrigin
          );
          h.d.M(j, {
            crossOrigin: x,
            integrity: typeof b.integrity == "string" ? b.integrity : void 0,
            nonce: typeof b.nonce == "string" ? b.nonce : void 0,
            fetchPriority: typeof b.fetchPriority == "string" ? b.fetchPriority : void 0
          });
        }
      } else b == null && h.d.M(j);
  }, at.preload = function(j, b) {
    if (typeof j == "string" && typeof b == "object" && b !== null && typeof b.as == "string") {
      var x = b.as, ml = Al(x, b.crossOrigin);
      h.d.L(j, x, {
        crossOrigin: ml,
        integrity: typeof b.integrity == "string" ? b.integrity : void 0,
        nonce: typeof b.nonce == "string" ? b.nonce : void 0,
        type: typeof b.type == "string" ? b.type : void 0,
        fetchPriority: typeof b.fetchPriority == "string" ? b.fetchPriority : void 0,
        referrerPolicy: typeof b.referrerPolicy == "string" ? b.referrerPolicy : void 0,
        imageSrcSet: typeof b.imageSrcSet == "string" ? b.imageSrcSet : void 0,
        imageSizes: typeof b.imageSizes == "string" ? b.imageSizes : void 0,
        media: typeof b.media == "string" ? b.media : void 0
      });
    }
  }, at.preloadModule = function(j, b) {
    if (typeof j == "string")
      if (b) {
        var x = Al(b.as, b.crossOrigin);
        h.d.m(j, {
          as: typeof b.as == "string" && b.as !== "script" ? b.as : void 0,
          crossOrigin: x,
          integrity: typeof b.integrity == "string" ? b.integrity : void 0,
          nonce: typeof b.nonce == "string" ? b.nonce : void 0,
          fetchPriority: typeof b.fetchPriority == "string" ? b.fetchPriority : void 0
        });
      } else h.d.m(j);
  }, at.requestFormReset = function(j) {
    h.d.r(j);
  }, at.unstable_batchedUpdates = function(j, b) {
    return j(b);
  }, at.useFormState = function(j, b, x) {
    return Sl.H.useFormState(j, b, x);
  }, at.useFormStatus = function() {
    return Sl.H.useHostTransitionStatus();
  }, at.version = "19.3.0", at;
}
var cr;
function rh() {
  if (cr) return No.exports;
  cr = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (al) {
        console.error(al);
      }
  }
  return A(), No.exports = mh(), No.exports;
}
var fr;
function vh() {
  if (fr) return rn;
  fr = 1;
  var A = dh(), al = Uo(), X = rh();
  function h(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function el(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function nl(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function Ml(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Ll(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Sl(l) {
    if (nl(l) !== l)
      throw Error(h(188));
  }
  function Al(l) {
    var t = l.alternate;
    if (!t) {
      if (t = nl(l), t === null) throw Error(h(188));
      return t !== l ? null : l;
    }
    for (var a = l, u = t; ; ) {
      var e = a.return;
      if (e === null) break;
      var n = e.alternate;
      if (n === null) {
        if (u = e.return, u !== null) {
          a = u;
          continue;
        }
        break;
      }
      if (e.child === n.child) {
        for (n = e.child; n; ) {
          if (n === a) return Sl(e), l;
          if (n === u) return Sl(e), t;
          n = n.sibling;
        }
        throw Error(h(188));
      }
      if (a.return !== u.return) a = e, u = n;
      else {
        for (var i = !1, c = e.child; c; ) {
          if (c === a) {
            i = !0, a = e, u = n;
            break;
          }
          if (c === u) {
            i = !0, u = e, a = n;
            break;
          }
          c = c.sibling;
        }
        if (!i) {
          for (c = n.child; c; ) {
            if (c === a) {
              i = !0, a = n, u = e;
              break;
            }
            if (c === u) {
              i = !0, u = n, a = e;
              break;
            }
            c = c.sibling;
          }
          if (!i) throw Error(h(189));
        }
      }
      if (a.alternate !== u) throw Error(h(190));
    }
    if (a.tag !== 3) throw Error(h(188));
    return a.stateNode.current === a ? l : t;
  }
  function j(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = j(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  function b(l, t, a, u, e, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && a(l, u, e, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && b(
        l.child,
        t,
        a,
        u,
        e,
        n
      ))
        return !0;
      l = l.sibling;
    }
    return !1;
  }
  function x(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function ml(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function jl(l) {
    var t = [null, null], a = x(l);
    return a === null || El(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function El(l, t, a, u) {
    for (; a !== null; ) {
      if (a === t) u.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (u.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && El(
        l,
        t,
        a.child,
        u
      ))
        return !0;
      a = a.sibling;
    }
    return !1;
  }
  function ll(l) {
    switch (l.tag) {
      case 5:
      case 27:
      case 6:
        return l.stateNode;
      case 3:
        return l.stateNode.containerInfo;
      default:
        throw Error(h(559));
    }
  }
  var ut = null, Ol = null;
  function L(l, t, a) {
    return l === a ? !0 : l === t ? (ut = l, !0) : !1;
  }
  function Fl(l, t, a) {
    return l === a ? (Ol = l, !1) : l === t ? (Ol !== null && (ut = l), !0) : !1;
  }
  function zt(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function Zl(l, t, a) {
    for (var u = 0, e = l; e; e = a(e)) u++;
    e = 0;
    for (var n = t; n; n = a(n)) e++;
    for (; 0 < u - e; ) l = a(l), u--;
    for (; 0 < e - u; ) t = a(t), e--;
    for (; u--; ) {
      if (l === t || t !== null && l === t.alternate)
        return l;
      l = a(l), t = a(t);
    }
    return null;
  }
  var K = Object.assign, $ = /* @__PURE__ */ Symbol.for("react.element"), rt = /* @__PURE__ */ Symbol.for("react.transitional.element"), et = /* @__PURE__ */ Symbol.for("react.portal"), vt = /* @__PURE__ */ Symbol.for("react.fragment"), xl = /* @__PURE__ */ Symbol.for("react.strict_mode"), Bt = /* @__PURE__ */ Symbol.for("react.profiler"), ct = /* @__PURE__ */ Symbol.for("react.consumer"), Ul = /* @__PURE__ */ Symbol.for("react.context"), N = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), H = /* @__PURE__ */ Symbol.for("react.suspense_list"), sl = /* @__PURE__ */ Symbol.for("react.memo"), il = /* @__PURE__ */ Symbol.for("react.lazy"), nt = /* @__PURE__ */ Symbol.for("react.activity"), Bl = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), la = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), M = Symbol.iterator;
  function R(l) {
    return l === null || typeof l != "object" ? null : (l = M && l[M] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var J = /* @__PURE__ */ Symbol.for("react.client.reference");
  function I(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === J ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case vt:
        return "Fragment";
      case Bt:
        return "Profiler";
      case xl:
        return "StrictMode";
      case B:
        return "Suspense";
      case H:
        return "SuspenseList";
      case nt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case et:
          return "Portal";
        case Ul:
          return l.displayName || "Context";
        case ct:
          return (l._context.displayName || "Context") + ".Consumer";
        case N:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case sl:
          return t = l.displayName || null, t !== null ? t : I(l.type) || "Memo";
        case il:
          t = l._payload, l = l._init;
          try {
            return I(l(t));
          } catch {
          }
      }
    return null;
  }
  var tl = Array.isArray, U = al.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = X.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Jt = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, _t = [], Ma = -1;
  function yt(l) {
    return { current: l };
  }
  function ql(l) {
    0 > Ma || (l.current = _t[Ma], _t[Ma] = null, Ma--);
  }
  function rl(l, t) {
    Ma++, _t[Ma] = l.current, l.current = t;
  }
  var Ot = yt(null), au = yt(null), ft = yt(null), uu = yt(null);
  function Du(l, t) {
    switch (rl(ft, t), rl(au, l), rl(Ot, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? om(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = om(t), l = sm(t, l);
        else
          switch (l) {
            case "svg":
              l = 1;
              break;
            case "math":
              l = 2;
              break;
            default:
              l = 0;
          }
    }
    ql(Ot), rl(Ot, l);
  }
  function ma() {
    ql(Ot), ql(au), ql(ft);
  }
  function ge(l) {
    var t = l.memoizedState;
    t !== null && (ve._currentValue = t.memoizedState, rl(uu, l)), t = Ot.current;
    var a = sm(t, l.type);
    t !== a && (rl(au, l), rl(Ot, a));
  }
  function S(l) {
    au.current === l && (ql(Ot), ql(au)), uu.current === l && (ql(uu), ve._currentValue = Jt);
  }
  var Q, fl;
  function vl(l) {
    if (Q === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Q = t && t[1] || "", fl = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Q + l + fl;
  }
  var wt = !1;
  function Qi(l, t) {
    if (!l || wt) return "";
    wt = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var u = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var z = function() {
                throw Error();
              };
              if (Object.defineProperty(z.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(z, []);
                } catch (O) {
                  var d = O;
                }
                Reflect.construct(l, [], z);
              } else {
                try {
                  z.call();
                } catch (O) {
                  d = O;
                }
                z = !1;
                try {
                  var y = Object.getOwnPropertyDescriptor(
                    l.prototype,
                    "props"
                  );
                  Object.defineProperty(l.prototype, "props", {
                    configurable: !0,
                    set: function() {
                      throw Error();
                    }
                  }), z = !0, new l();
                } finally {
                  z && (y !== void 0 ? Object.defineProperty(l.prototype, "props", y) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (O) {
                d = O;
              }
              (z = l()) && typeof z.catch == "function" && z.catch(function() {
              });
            }
          } catch (O) {
            if (O && d && typeof O.stack == "string")
              return [O.stack, d.stack];
          }
          return [null, null];
        }
      };
      u.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var e = Object.getOwnPropertyDescriptor(
        u.DetermineComponentFrameRoot,
        "name"
      );
      e && e.configurable && Object.defineProperty(
        u.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = u.DetermineComponentFrameRoot(), i = n[0], c = n[1];
      if (i && c) {
        var f = i.split(`
`), r = c.split(`
`);
        for (e = u = 0; u < f.length && !f[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < r.length && !r[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === f.length || e === r.length)
          for (u = f.length - 1, e = r.length - 1; 1 <= u && 0 <= e && f[u] !== r[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (f[u] !== r[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || f[u] !== r[e]) {
                  var g = `
` + f[u].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      wt = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? vl(a) : "";
  }
  function dr(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return vl(l.type);
      case 16:
        return vl("Lazy");
      case 13:
        return l.child !== t && t !== null ? vl("Suspense Fallback") : vl("Suspense");
      case 19:
        return vl("SuspenseList");
      case 0:
      case 15:
        return Qi(l.type, !1);
      case 11:
        return Qi(l.type.render, !1);
      case 1:
        return Qi(l.type, !0);
      case 31:
        return vl("Activity");
      case 30:
        return vl("ViewTransition");
      default:
        return "";
    }
  }
  function Ro(l) {
    try {
      var t = "", a = null;
      do
        t += dr(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Zi = Object.prototype.hasOwnProperty, Vi = A.unstable_scheduleCallback, Li = A.unstable_cancelCallback, mr = A.unstable_shouldYield, rr = A.unstable_requestPaint, Nt = A.unstable_now, vr = A.unstable_getCurrentPriorityLevel, po = A.unstable_ImmediatePriority, Ho = A.unstable_UserBlockingPriority, vn = A.unstable_NormalPriority, yr = A.unstable_LowPriority, jo = A.unstable_IdlePriority, hr = A.log, gr = A.unstable_setDisableYieldValue, Se = null, At = null;
  function Ca(l) {
    if (typeof hr == "function" && gr(l), At && typeof At.setStrictMode == "function")
      try {
        At.setStrictMode(Se, l);
      } catch {
      }
  }
  var Dt = Math.clz32 ? Math.clz32 : Tr, Sr = Math.log, br = Math.LN2;
  function Tr(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Sr(l) / br | 0) | 0;
  }
  var yn = 256, hn = 262144, gn = 4194304;
  function eu(l) {
    var t = l & 42;
    if (t !== 0) return t;
    switch (l & -l) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return l & -l;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return l & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return l & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return l;
    }
  }
  function Sn(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = u & 134217727;
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = eu(u) : (i &= c, i !== 0 ? e = eu(i) : a || (a = c & ~l, a !== 0 && (e = eu(a))))) : (c = u & ~n, c !== 0 ? e = eu(c) : i !== 0 ? e = eu(i) : a || (a = u & ~l, a !== 0 && (e = eu(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function be(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function xo(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - Dt(a), e = 1 << u;
        t |= l[u], a &= ~e;
      }
    return t;
  }
  function Er(l, t) {
    switch (l) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Bo() {
    var l = gn;
    return gn <<= 1, (gn & 62914560) === 0 && (gn = 4194304), l;
  }
  function Ki(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Te(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function zr(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, r = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - Dt(a), z = 1 << g;
      c[g] = 0, f[g] = -1;
      var d = r[g];
      if (d !== null)
        for (r[g] = null, g = 0; g < d.length; g++) {
          var y = d[g];
          y !== null && (y.lane &= -536870913);
        }
      a &= ~z;
    }
    u !== 0 && qo(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function qo(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - Dt(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Yo(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - Dt(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Go(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : Ji(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function Ji(l) {
    switch (l) {
      case 2:
        l = 1;
        break;
      case 8:
        l = 4;
        break;
      case 32:
        l = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        l = 128;
        break;
      case 268435456:
        l = 134217728;
        break;
      default:
        l = 0;
    }
    return l;
  }
  function wi(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Xo() {
    var l = Y.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : wm(l.type));
  }
  function Qo(l, t) {
    var a = Y.p;
    try {
      return Y.p = l, t();
    } finally {
      Y.p = a;
    }
  }
  var ra = Math.random().toString(36).slice(2), Wl = "__reactFiber$" + ra, ht = "__reactProps$" + ra, Mu = "__reactContainer$" + ra, Zo = "__reactEvents$" + ra, _r = "__reactListeners$" + ra, Or = "__reactHandles$" + ra, Vo = "__reactResources$" + ra, Ee = "__reactMarker$" + ra, bn = "__reactLoad$" + ra;
  function Tn(l) {
    delete l[Wl], delete l[ht], delete l[_r], delete l[Or];
  }
  function nu(l) {
    var t;
    if (t = l[Wl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[Mu] || a[Wl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Dm(l); l !== null; ) {
            if (a = l[Wl]) return a;
            l = Dm(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Cu(l) {
    if (l = l[Wl] || l[Mu]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function ze(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(h(33));
  }
  function Uu(l) {
    var t = l[Vo];
    return t || (t = l[Vo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Kl(l) {
    l[Ee] = !0;
  }
  function Lo(l) {
    l[bn] = void 0;
  }
  var Ko = /* @__PURE__ */ new Set(), Jo = {};
  function iu(l, t) {
    Ru(l, t), Ru(l + "Capture", t);
  }
  function Ru(l, t) {
    for (Jo[l] = t, l = 0; l < t.length; l++)
      Ko.add(t[l]);
  }
  var Nr = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), wo = {}, $o = {};
  function Ar(l) {
    return Zi.call($o, l) ? !0 : Zi.call(wo, l) ? !1 : Nr.test(l) ? $o[l] = !0 : (wo[l] = !0, !1);
  }
  var cl = !1;
  function Fo() {
    var l = cl;
    return cl = !1, l;
  }
  function En(l, t, a) {
    if (Ar(t))
      if (a === null) l.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var u = t.toLowerCase().slice(0, 5);
            if (u !== "data-" && u !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, a);
      }
  }
  function zn(l, t, a) {
    if (a === null) l.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(t);
          return;
      }
      l.setAttribute(t, a);
    }
  }
  function va(l, t, a, u) {
    if (u === null) l.removeAttribute(a);
    else {
      switch (typeof u) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(a);
          return;
      }
      l.setAttributeNS(t, a, u);
    }
  }
  function Mt(l) {
    switch (typeof l) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return l;
      case "object":
        return l;
      default:
        return "";
    }
  }
  function Wo(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Dr(l, t, a) {
    var u = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof u < "u" && typeof u.get == "function" && typeof u.set == "function") {
      var e = u.get, n = u.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return e.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: u.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(i) {
          a = "" + i;
        },
        stopTracking: function() {
          l._valueTracker = null, delete l[t];
        }
      };
    }
  }
  function $i(l) {
    if (!l._valueTracker) {
      var t = Wo(l) ? "checked" : "value";
      l._valueTracker = Dr(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function Io(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = Wo(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  var Mr = /[\n"\\]/g;
  function qt(l) {
    return l.replace(
      Mr,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function Fi(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Mt(t)) : l.value !== "" + Mt(t) && (l.value = "" + Mt(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Wi(l, Mt(l.value)) : Wi(l, Mt(t)) : a != null ? Wi(l, Mt(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Mt(c) : l.removeAttribute("name");
  }
  function ko(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        $i(l);
        return;
      }
      a = a != null ? "" + Mt(a) : "", t = t != null ? "" + Mt(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = c ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), $i(l);
  }
  function Wi(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function pu(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + Mt(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Po(l, t, a) {
    if (t != null && (t = "" + Mt(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Mt(a) : "";
  }
  function ls(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(h(92));
        if (tl(u)) {
          if (1 < u.length) throw Error(h(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = Mt(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), $i(l);
  }
  function Hu(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var Cr = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ts(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || Cr.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function as(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(h(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "", cl = !0);
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && (ts(l, e, u), cl = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && ts(l, n, t[n]);
  }
  function Ii(l) {
    if (l.indexOf("-") === -1) return !1;
    switch (l) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Ur = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), Rr = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function _n(l) {
    return Rr.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function ta() {
  }
  var ki = null;
  function Pi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var ju = null, xu = null;
  function us(l) {
    var t = Cu(l);
    if (t && (l = t.stateNode)) {
      var a = l[ht] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (Fi(
            l,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), t = a.name, a.type === "radio" && t != null) {
            for (a = l; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + qt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[ht] || null;
                if (!e) throw Error(h(90));
                Fi(
                  u,
                  e.value,
                  e.defaultValue,
                  e.defaultValue,
                  e.checked,
                  e.defaultChecked,
                  e.type,
                  e.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              u = a[t], u.form === l.form && Io(u);
          }
          break l;
        case "textarea":
          Po(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && pu(l, !!a.multiple, t, !1);
      }
    }
  }
  var lc = !1;
  function es(l, t, a) {
    if (lc) return l(t, a);
    lc = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (lc = !1, (ju !== null || xu !== null) && (_i(), ju && (t = ju, l = xu, xu = ju = null, us(t), l)))
        for (t = 0; t < l.length; t++) us(l[t]);
    }
  }
  function _e(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[ht] || null;
    if (u === null) return null;
    a = u[t];
    l: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (u = !u.disabled) || (l = l.type, u = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !u;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (a && typeof a != "function")
      throw Error(
        h(231, t, typeof a)
      );
    return a;
  }
  var ya = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), tc = !1;
  if (ya)
    try {
      var Oe = {};
      Object.defineProperty(Oe, "passive", {
        get: function() {
          tc = !0;
        }
      }), window.addEventListener("test", Oe, Oe), window.removeEventListener("test", Oe, Oe);
    } catch {
      tc = !1;
    }
  var Ua = null, ac = null, On = null;
  function ns() {
    if (On) return On;
    var l, t = ac, a = t.length, u, e = "value" in Ua ? Ua.value : Ua.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return On = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function Nn(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function An() {
    return !0;
  }
  function is() {
    return !1;
  }
  function ot(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? An : is, this.isPropagationStopped = is, this;
    }
    return K(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = An);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = An);
      },
      persist: function() {
      },
      isPersistent: An
    }), t;
  }
  var Ra = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Dn = ot(Ra), Ne = K({}, Ra, { view: 0, detail: 0 }), pr = ot(Ne), uc, ec, Ae, Mn = K({}, Ne, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: ic,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Ae && (Ae && l.type === "mousemove" ? (uc = l.screenX - Ae.screenX, ec = l.screenY - Ae.screenY) : ec = uc = 0, Ae = l), uc);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : ec;
    }
  }), cs = ot(Mn), Hr = K({}, Mn, { dataTransfer: 0 }), jr = ot(Hr), xr = K({}, Ne, { relatedTarget: 0 }), nc = ot(xr), Br = K({}, Ra, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), qr = ot(Br), Yr = K({}, Ra, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Gr = ot(Yr), Xr = K({}, Ra, { data: 0 }), fs = ot(Xr), Qr = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Zr = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Vr = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Lr(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Vr[l]) ? !!t[l] : !1;
  }
  function ic() {
    return Lr;
  }
  var Kr = K({}, Ne, {
    key: function(l) {
      if (l.key) {
        var t = Qr[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Nn(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Zr[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: ic,
    charCode: function(l) {
      return l.type === "keypress" ? Nn(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Nn(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Jr = ot(Kr), wr = K({}, Mn, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), os = ot(wr), $r = K({}, Ra, { submitter: 0 }), Fr = ot($r), Wr = K({}, Ne, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: ic
  }), Ir = ot(Wr), kr = K({}, Ra, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Pr = ot(kr), lv = K({}, Mn, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), tv = ot(lv), av = K({}, Ra, {
    newState: 0,
    oldState: 0,
    source: 0
  }), uv = ot(av), ev = [9, 13, 27, 32], cc = ya && "CompositionEvent" in window, De = null;
  ya && "documentMode" in document && (De = document.documentMode);
  var nv = ya && "TextEvent" in window && !De, ss = ya && (!cc || De && 8 < De && 11 >= De), ds = " ", ms = !1;
  function rs(l, t) {
    switch (l) {
      case "keyup":
        return ev.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function vs(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Bu = !1;
  function iv(l, t) {
    switch (l) {
      case "compositionend":
        return vs(t);
      case "keypress":
        return t.which !== 32 ? null : (ms = !0, ds);
      case "textInput":
        return l = t.data, l === ds && ms ? null : l;
      default:
        return null;
    }
  }
  function cv(l, t) {
    if (Bu)
      return l === "compositionend" || !cc && rs(l, t) ? (l = ns(), On = ac = Ua = null, Bu = !1, l) : null;
    switch (l) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return ss && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var fv = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function ys(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!fv[l.type] : t === "textarea";
  }
  function hs(l, t, a, u) {
    ju ? xu ? xu.push(u) : xu = [u] : ju = u, t = Ci(t, "onChange"), 0 < t.length && (a = new Dn(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Me = null, Ce = null;
  function ov(l) {
    um(l, 0);
  }
  function Cn(l) {
    var t = ze(l);
    if (Io(t)) return l;
  }
  function gs(l, t) {
    if (l === "change") return t;
  }
  var Ss = !1;
  if (ya) {
    var fc;
    if (ya) {
      var oc = "oninput" in document;
      if (!oc) {
        var bs = document.createElement("div");
        bs.setAttribute("oninput", "return;"), oc = typeof bs.oninput == "function";
      }
      fc = oc;
    } else fc = !1;
    Ss = fc && (!document.documentMode || 9 < document.documentMode);
  }
  function Ts() {
    Me && (Me.detachEvent("onpropertychange", Es), Ce = Me = null);
  }
  function Es(l) {
    if (l.propertyName === "value" && Cn(Ce)) {
      var t = [];
      hs(
        t,
        Ce,
        l,
        Pi(l)
      ), es(ov, t);
    }
  }
  function sv(l, t, a) {
    l === "focusin" ? (Ts(), Me = t, Ce = a, Me.attachEvent("onpropertychange", Es)) : l === "focusout" && Ts();
  }
  function dv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Cn(Ce);
  }
  function mv(l, t) {
    if (l === "click") return Cn(t);
  }
  function rv(l, t) {
    if (l === "input" || l === "change")
      return Cn(t);
  }
  function vv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var Ct = typeof Object.is == "function" ? Object.is : vv;
  function Ue(l, t) {
    if (Ct(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Zi.call(t, e) || !Ct(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function sc(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  function zs(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function _s(l, t) {
    var a = zs(l);
    l = 0;
    for (var u; a; ) {
      if (a.nodeType === 3) {
        if (u = l + a.textContent.length, l <= t && u >= t)
          return { node: a, offset: t - l };
        l = u;
      }
      l: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break l;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = zs(a);
    }
  }
  function Os(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Os(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Ns(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = sc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = sc(l.document);
    }
    return t;
  }
  function dc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var yv = ya && "documentMode" in document && 11 >= document.documentMode, qu = null, mc = null, Re = null, rc = !1;
  function As(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    rc || qu == null || qu !== sc(u) || (u = qu, "selectionStart" in u && dc(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), Re && Ue(Re, u) || (Re = u, u = Ci(mc, "onSelect"), 0 < u.length && (t = new Dn(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = qu)));
  }
  function cu(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var Yu = {
    animationend: cu("Animation", "AnimationEnd"),
    animationiteration: cu("Animation", "AnimationIteration"),
    animationstart: cu("Animation", "AnimationStart"),
    transitionrun: cu("Transition", "TransitionRun"),
    transitionstart: cu("Transition", "TransitionStart"),
    transitioncancel: cu("Transition", "TransitionCancel"),
    transitionend: cu("Transition", "TransitionEnd")
  }, vc = {}, Ds = {};
  ya && (Ds = document.createElement("div").style, "AnimationEvent" in window || (delete Yu.animationend.animation, delete Yu.animationiteration.animation, delete Yu.animationstart.animation), "TransitionEvent" in window || delete Yu.transitionend.transition);
  function fu(l) {
    if (vc[l]) return vc[l];
    if (!Yu[l]) return l;
    var t = Yu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Ds)
        return vc[l] = t[a];
    return l;
  }
  var Ms = fu("animationend"), Cs = fu("animationiteration"), Us = fu("animationstart"), hv = fu("transitionrun"), gv = fu("transitionstart"), Sv = fu("transitioncancel"), Rs = fu("transitionend"), ps = /* @__PURE__ */ new Map(), yc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  yc.push("scrollEnd");
  function $t(l, t) {
    ps.set(l, t), iu(t, [l]);
  }
  var bv = 0;
  function ha(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = kt.identifierPrefix;
    var a = bv++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function Hs(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, a = ee;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = l[a[u]];
        if (e != null) {
          if (e === "none") return "none";
          t = t == null ? e : t + (" " + e);
        }
      }
    return t ?? l.default;
  }
  function ga(l, t) {
    return l = Hs(l), t = Hs(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
  }
  var Un = typeof reportError == "function" ? reportError : function(l) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof l == "object" && l !== null && typeof l.message == "string" ? String(l.message) : String(l),
        error: l
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", l);
      return;
    }
    console.error(l);
  }, Yt = [], Gu = 0, hc = 0;
  function Rn() {
    for (var l = Gu, t = hc = Gu = 0; t < l; ) {
      var a = Yt[t];
      Yt[t++] = null;
      var u = Yt[t];
      Yt[t++] = null;
      var e = Yt[t];
      Yt[t++] = null;
      var n = Yt[t];
      if (Yt[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && js(a, e, n);
    }
  }
  function pn(l, t, a, u) {
    Yt[Gu++] = l, Yt[Gu++] = t, Yt[Gu++] = a, Yt[Gu++] = u, hc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function gc(l, t, a, u) {
    return pn(l, t, a, u), Hn(l);
  }
  function ou(l, t) {
    return pn(l, null, null, t), Hn(l);
  }
  function js(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - Dt(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Hn(l) {
    if (50 < Pe)
      throw Pe = 0, zi = null, Error(h(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Xu = {};
  function Tv(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function gt(l, t, a, u) {
    return new Tv(l, t, a, u);
  }
  function Sc(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function Sa(l, t) {
    var a = l.alternate;
    return a === null ? (a = gt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function xs(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function jn(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof u == "function") Sc(u) && (i = 1);
    else if (typeof u == "string")
      i = $y(
        l,
        a,
        Ot.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case nt:
          return l = gt(31, a, t, e), l.elementType = nt, l.lanes = n, l;
        case vt:
          return su(a.children, e, n, t);
        case xl:
          i = 8, e |= 24;
          break;
        case Bt:
          return l = gt(12, a, t, e | 2), l.elementType = Bt, l.lanes = n, l;
        case B:
          return l = gt(13, a, t, e), l.elementType = B, l.lanes = n, l;
        case H:
          return l = gt(19, a, t, e), l.elementType = H, l.lanes = n, l;
        case Bl:
        case s:
          return l = e | 32, l = gt(30, a, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof u == "object" && u !== null)
            switch (u.$$typeof) {
              case Ul:
                i = 10;
                break l;
              case ct:
                i = 9;
                break l;
              case N:
                i = 11;
                break l;
              case sl:
                i = 14;
                break l;
              case il:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            h(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = gt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function su(l, t, a, u) {
    return l = gt(7, l, u, t), l.lanes = a, l;
  }
  function bc(l, t, a) {
    return l = gt(6, l, null, t), l.lanes = a, l;
  }
  function Bs(l) {
    var t = gt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Tc(l, t, a) {
    return t = gt(
      4,
      l.children !== null ? l.children : [],
      l.key,
      t
    ), t.lanes = a, t.stateNode = {
      containerInfo: l.containerInfo,
      pendingChildren: null,
      implementation: l.implementation
    }, t;
  }
  var qs = /* @__PURE__ */ new WeakMap();
  function Gt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = qs.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Ro(t)
      }, qs.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Ro(t)
    };
  }
  var Qu = [], Zu = 0, xn = null, pe = 0, Xt = [], Qt = 0, pa = null, aa = 1, ua = "";
  function ba(l, t) {
    Qu[Zu++] = pe, Qu[Zu++] = xn, xn = l, pe = t;
  }
  function Ys(l, t, a) {
    Xt[Qt++] = aa, Xt[Qt++] = ua, Xt[Qt++] = pa, pa = l;
    var u = aa;
    l = ua;
    var e = 32 - Dt(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - Dt(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, aa = 1 << 32 - Dt(t) + e | a << e | u, ua = n + l;
    } else
      aa = 1 << n | a << e | u, ua = l;
  }
  function Bn(l) {
    l.return !== null && (ba(l, 1), Ys(l, 1, 0));
  }
  function Ec(l) {
    for (; l === xn; )
      xn = Qu[--Zu], Qu[Zu] = null, pe = Qu[--Zu], Qu[Zu] = null;
    for (; l === pa; )
      pa = Xt[--Qt], Xt[Qt] = null, ua = Xt[--Qt], Xt[Qt] = null, aa = Xt[--Qt], Xt[Qt] = null;
  }
  function Gs(l, t) {
    Xt[Qt++] = aa, Xt[Qt++] = ua, Xt[Qt++] = pa, aa = t.id, ua = t.overflow, pa = l;
  }
  var Jl = null, zl = null, w = !1, Ha = null, Zt = !1, zc = Error(h(519));
  function ja(l) {
    var t = Error(
      h(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw He(Gt(t, l)), zc;
  }
  function Xs(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Wl] = l, t[ht] = u, a) {
      case "dialog":
        W("cancel", t), W("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        W("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < tn.length; a++)
          W(tn[a], t);
        break;
      case "source":
        W("error", t);
        break;
      case "img":
      case "image":
      case "link":
        W("error", t), W("load", t);
        break;
      case "details":
        W("toggle", t);
        break;
      case "input":
        W("invalid", t), ko(
          t,
          u.value,
          u.defaultValue,
          u.checked,
          u.defaultChecked,
          u.type,
          u.name,
          !0
        );
        break;
      case "select":
        W("invalid", t);
        break;
      case "textarea":
        W("invalid", t), ls(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || cm(t.textContent, a) ? (u.popover != null && (W("beforetoggle", t), W("toggle", t)), u.onScroll != null && W("scroll", t), u.onScrollEnd != null && W("scrollend", t), u.onClick != null && (t.onclick = ta), t = !0) : t = !1, t || ja(l, !0);
  }
  function qn(l) {
    for (Jl = l.return; Jl; )
      switch (Jl.tag) {
        case 5:
        case 31:
        case 13:
          Zt = !1;
          return;
        case 27:
        case 3:
          Zt = !0;
          return;
        default:
          Jl = Jl.return;
      }
  }
  function Vu(l) {
    if (l !== Jl) return !1;
    if (!w) return qn(l), w = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || Pf(l.type, l.memoizedProps)), a = !a), a && zl && ja(l), qn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      zl = Am(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      zl = Am(l);
    } else
      t === 27 ? (t = zl, Wa(l.type) ? (l = fo, fo = null, zl = l) : zl = t) : zl = Jl ? Lt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function du() {
    zl = Jl = null, w = !1;
  }
  function _c() {
    var l = Ha;
    return l !== null && (Tt === null ? Tt = l : Tt.push.apply(
      Tt,
      l
    ), Ha = null), l;
  }
  function He(l) {
    Ha === null ? Ha = [l] : Ha.push(l);
  }
  var Oc = yt(null), mu = null, Ta = null;
  function xa(l, t, a) {
    rl(Oc, t._currentValue), t._currentValue = a;
  }
  function Ea(l) {
    l._currentValue = Oc.current, ql(Oc);
  }
  function Yn(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Nc(l, t, a, u) {
    var e = l.child;
    for (e !== null && (e.return = l); e !== null; ) {
      var n = e.dependencies;
      if (n !== null) {
        var i = e.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var c = n;
          n = e;
          for (var f = 0; f < t.length; f++)
            if (c.context === t[f]) {
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Yn(
                n.return,
                a,
                l
              ), u || (i = null);
              break l;
            }
          n = c.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(h(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Yn(i, a, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= a, i = e.alternate, i !== null && (i.lanes |= a), Yn(
          e.return,
          a,
          l
        ), i = e.child, i = i !== null ? i.sibling : null) : i = e.child;
      if (i !== null) i.return = e;
      else
        for (i = e; i !== null; ) {
          if (i === l) {
            i = null;
            break;
          }
          if (e = i.sibling, e !== null) {
            e.return = i.return, i = e;
            break;
          }
          i = i.return;
        }
      e = i;
    }
  }
  function ru(l, t, a, u) {
    l = null;
    for (var e = t, n = !1; e !== null; ) {
      if (!n) {
        if ((e.flags & 524288) !== 0) n = !0;
        else if ((e.flags & 262144) !== 0) break;
      }
      if (e.tag === 10) {
        var i = e.alternate;
        if (i === null) throw Error(h(387));
        if (i = i.memoizedProps, i !== null) {
          var c = e.type;
          Ct(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === uu.current) {
        if (i = e.alternate, i === null) throw Error(h(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(ve) : l = [ve]);
      }
      e = e.return;
    }
    return l !== null && Nc(
      t,
      l,
      a,
      u
    ), t.flags |= 262144, l !== null;
  }
  function Gn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!Ct(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function vu(l) {
    mu = l, Ta = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Il(l) {
    return Qs(mu, l);
  }
  function Xn(l, t) {
    return mu === null && vu(l), Qs(l, t);
  }
  function Qs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Ta === null) {
      if (l === null) throw Error(h(308));
      Ta = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else Ta = Ta.next = t;
    return a;
  }
  var Ev = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, u) {
        l.push(u);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(a) {
        return a();
      });
    };
  }, zv = A.unstable_scheduleCallback, _v = A.unstable_NormalPriority, Yl = {
    $$typeof: Ul,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Ac() {
    return {
      controller: new Ev(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function je(l) {
    l.refCount--, l.refCount === 0 && zv(_v, function() {
      l.controller.abort();
    });
  }
  function Zs(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var u = t[l];
        a.indexOf(u) === -1 && a.push(u);
      }
    }
  }
  var xe = null;
  function Ov(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Be = null, Dc = 0, yu = 0, Lu = null;
  function Nv(l, t) {
    if (Be === null) {
      var a = Be = [];
      Dc = 0, yu = Lf(), Lu = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Dc++, t.then(Vs, Vs), t;
  }
  function Vs() {
    if (--Dc === 0 && (xe = null, Be !== null)) {
      Lu !== null && (Lu.status = "fulfilled");
      var l = Be;
      Be = null, yu = 0, Lu = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Av(l, t) {
    var a = [], u = {
      status: "pending",
      value: null,
      reason: null,
      then: function(e) {
        a.push(e);
      }
    };
    return l.then(
      function() {
        u.status = "fulfilled", u.value = t;
        for (var e = 0; e < a.length; e++) (0, a[e])(t);
      },
      function(e) {
        for (u.status = "rejected", u.reason = e, e = 0; e < a.length; e++)
          (0, a[e])(void 0);
      }
    ), u;
  }
  var Ls = U.S;
  U.S = function(l, t) {
    if (Bd = Nt(), typeof t == "object" && t !== null && typeof t.then == "function" && Nv(l, t), xe !== null)
      for (var a = fe; a !== null; )
        Zs(a, xe), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = fe; u !== null; )
        Zs(u, a), u = u.next;
      if (yu !== 0) {
        u = xe, u === null && (u = xe = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Ls !== null && Ls(l, t);
  };
  var hu = yt(null);
  function Mc() {
    var l = hu.current;
    return l !== null ? l : Tl.pooledCache;
  }
  function Qn(l, t) {
    t === null ? rl(hu, hu.current) : rl(hu, t.pool);
  }
  function Ks() {
    var l = Mc();
    return l === null ? null : { parent: Yl._currentValue, pool: l };
  }
  var Ku = Error(h(460)), Cc = Error(h(474)), Zn = Error(h(542)), Vn = { then: function() {
  } };
  function Js(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function ws(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(ta, ta), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Fs(l), l === void 0 && !("reason" in t) ? Error(h(600)) : l;
      default:
        if (typeof t.status == "string") t.then(ta, ta);
        else {
          if (l = Tl, l !== null && 100 < l.shellSuspendCounter)
            throw Error(h(482));
          l = t, l.status = "pending", l.then(
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "fulfilled", e.value = u;
              }
            },
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "rejected", e.reason = u;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw l = t.reason, Fs(l), l;
        }
        throw Su = t, Ku;
    }
  }
  function gu(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Su = a, Ku) : a;
    }
  }
  var Su = null;
  function $s() {
    if (Su === null) throw Error(h(459));
    var l = Su;
    return Su = null, l;
  }
  function Fs(l) {
    if (l === Ku || l === Zn)
      throw Error(h(483));
  }
  var Ju = null, qe = 0;
  function Ln(l) {
    var t = qe;
    return qe += 1, Ju === null && (Ju = []), ws(Ju, l, t);
  }
  function Ba(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Kn(l, t) {
    throw t.$$typeof === $ ? Error(h(525)) : (l = Object.prototype.toString.call(t), Error(
      h(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function Ws(l) {
    function t(m, o) {
      if (l) {
        var v = m.deletions;
        v === null ? (m.deletions = [o], m.flags |= 16) : v.push(o);
      }
    }
    function a(m, o) {
      if (!l) return null;
      for (; o !== null; )
        t(m, o), o = o.sibling;
      return null;
    }
    function u(m) {
      for (var o = /* @__PURE__ */ new Map(); m !== null; )
        m.key === null ? o.set(m.index, m) : o.set(m.key, m), m = m.sibling;
      return o;
    }
    function e(m, o) {
      return m = Sa(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, v) {
      return m.index = v, l ? (v = m.alternate, v !== null ? (v = v.index, v < o ? (m.flags |= 2, o) : v) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, o, v, E) {
      return o === null || o.tag !== 6 ? (o = bc(v, m.mode, E), o.return = m, o) : (o = e(o, v), o.return = m, o);
    }
    function f(m, o, v, E) {
      var D = v.type;
      return D === vt ? (m = g(
        m,
        o,
        v.props.children,
        E,
        v.key
      ), Ba(m, v), m) : o !== null && (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === il && gu(D) === o.type) ? (o = e(o, v.props), Ba(o, v), o.return = m, o) : (o = jn(
        v.type,
        v.key,
        v.props,
        null,
        m.mode,
        E
      ), Ba(o, v), o.return = m, o);
    }
    function r(m, o, v, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== v.containerInfo || o.stateNode.implementation !== v.implementation ? (o = Tc(v, m.mode, E), o.return = m, o) : (o = e(o, v.children || []), o.return = m, o);
    }
    function g(m, o, v, E, D) {
      return o === null || o.tag !== 7 ? (o = su(
        v,
        m.mode,
        E,
        D
      ), o.return = m, o) : (o = e(o, v), o.return = m, o);
    }
    function z(m, o, v) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = bc(
          "" + o,
          m.mode,
          v
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case rt:
            return v = jn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              v
            ), Ba(v, o), v.return = m, v;
          case et:
            return o = Tc(
              o,
              m.mode,
              v
            ), o.return = m, o;
          case il:
            return o = gu(o), z(m, o, v);
        }
        if (tl(o) || R(o))
          return o = su(
            o,
            m.mode,
            v,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, Ln(o), v);
        if (o.$$typeof === Ul)
          return z(
            m,
            Xn(m, o),
            v
          );
        Kn(m, o);
      }
      return null;
    }
    function d(m, o, v, E) {
      var D = o !== null ? o.key : null;
      if (typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint")
        return D !== null ? null : c(m, o, "" + v, E);
      if (typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case rt:
            return v.key === D ? f(m, o, v, E) : null;
          case et:
            return v.key === D ? r(m, o, v, E) : null;
          case il:
            return v = gu(v), d(m, o, v, E);
        }
        if (tl(v) || R(v))
          return D !== null ? null : g(m, o, v, E, null);
        if (typeof v.then == "function")
          return d(
            m,
            o,
            Ln(v),
            E
          );
        if (v.$$typeof === Ul)
          return d(
            m,
            o,
            Xn(m, v),
            E
          );
        Kn(m, v);
      }
      return null;
    }
    function y(m, o, v, E, D) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return m = m.get(v) || null, c(o, m, "" + E, D);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case rt:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, f(o, m, E, D);
          case et:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, r(o, m, E, D);
          case il:
            return E = gu(E), y(
              m,
              o,
              v,
              E,
              D
            );
        }
        if (tl(E) || R(E))
          return m = m.get(v) || null, g(o, m, E, D, null);
        if (typeof E.then == "function")
          return y(
            m,
            o,
            v,
            Ln(E),
            D
          );
        if (E.$$typeof === Ul)
          return y(
            m,
            o,
            v,
            Xn(o, E),
            D
          );
        Kn(o, E);
      }
      return null;
    }
    function O(m, o, v, E) {
      for (var D = null, P = null, p = o, q = o = 0, Ql = null; p !== null && q < v.length; q++) {
        p.index > q ? (Ql = p, p = null) : Ql = p.sibling;
        var ul = d(
          m,
          p,
          v[q],
          E
        );
        if (ul === null) {
          p === null && (p = Ql);
          break;
        }
        l && p && ul.alternate === null && t(m, p), o = n(ul, o, q), P === null ? D = ul : P.sibling = ul, P = ul, p = Ql;
      }
      if (q === v.length)
        return a(m, p), w && ba(m, q), D;
      if (p === null) {
        for (; q < v.length; q++)
          p = z(m, v[q], E), p !== null && (o = n(
            p,
            o,
            q
          ), P === null ? D = p : P.sibling = p, P = p);
        return w && ba(m, q), D;
      }
      for (p = u(p); q < v.length; q++)
        Ql = y(
          p,
          m,
          q,
          v[q],
          E
        ), Ql !== null && (l && (ul = Ql.alternate, ul !== null && p.delete(ul.key === null ? q : ul.key)), o = n(
          Ql,
          o,
          q
        ), P === null ? D = Ql : P.sibling = Ql, P = Ql);
      return l && p.forEach(function(tu) {
        return t(m, tu);
      }), w && ba(m, q), D;
    }
    function C(m, o, v, E) {
      if (v == null) throw Error(h(151));
      for (var D = null, P = null, p = o, q = o = 0, Ql = null, ul = v.next(); p !== null && !ul.done; q++, ul = v.next()) {
        p.index > q ? (Ql = p, p = null) : Ql = p.sibling;
        var tu = d(m, p, ul.value, E);
        if (tu === null) {
          p === null && (p = Ql);
          break;
        }
        l && p && tu.alternate === null && t(m, p), o = n(tu, o, q), P === null ? D = tu : P.sibling = tu, P = tu, p = Ql;
      }
      if (ul.done)
        return a(m, p), w && ba(m, q), D;
      if (p === null) {
        for (; !ul.done; q++, ul = v.next())
          ul = z(m, ul.value, E), ul !== null && (o = n(ul, o, q), P === null ? D = ul : P.sibling = ul, P = ul);
        return w && ba(m, q), D;
      }
      for (p = u(p); !ul.done; q++, ul = v.next())
        ul = y(p, m, q, ul.value, E), ul !== null && (l && (Ql = ul.alternate, Ql !== null && p.delete(
          Ql.key === null ? q : Ql.key
        )), o = n(ul, o, q), P === null ? D = ul : P.sibling = ul, P = ul);
      return l && p.forEach(function(ih) {
        return t(m, ih);
      }), w && ba(m, q), D;
    }
    function V(m, o, v, E) {
      if (typeof v == "object" && v !== null && v.type === vt && v.key === null && v.props.ref === void 0 && (v = v.props.children), typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case rt:
            l: {
              for (var D = v.key; o !== null; ) {
                if (o.key === D) {
                  if (D = v.type, D === vt) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), E = e(
                        o,
                        v.props.children
                      ), Ba(E, v), E.return = m, m = E;
                      break l;
                    }
                  } else if (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === il && gu(D) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, v.props), Ba(E, v), E.return = m, m = E;
                    break l;
                  }
                  a(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              v.type === vt ? (E = su(
                v.props.children,
                m.mode,
                E,
                v.key
              ), Ba(E, v), E.return = m, m = E) : (E = jn(
                v.type,
                v.key,
                v.props,
                null,
                m.mode,
                E
              ), Ba(E, v), E.return = m, m = E);
            }
            return i(m);
          case et:
            l: {
              for (D = v.key; o !== null; ) {
                if (o.key === D)
                  if (o.tag === 4 && o.stateNode.containerInfo === v.containerInfo && o.stateNode.implementation === v.implementation) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, v.children || []), E.return = m, m = E;
                    break l;
                  } else {
                    a(m, o);
                    break;
                  }
                else t(m, o);
                o = o.sibling;
              }
              E = Tc(v, m.mode, E), E.return = m, m = E;
            }
            return i(m);
          case il:
            return v = gu(v), V(
              m,
              o,
              v,
              E
            );
        }
        if (tl(v))
          return O(
            m,
            o,
            v,
            E
          );
        if (R(v)) {
          if (D = R(v), typeof D != "function") throw Error(h(150));
          return v = D.call(v), C(
            m,
            o,
            v,
            E
          );
        }
        if (typeof v.then == "function")
          return V(
            m,
            o,
            Ln(v),
            E
          );
        if (v.$$typeof === Ul)
          return V(
            m,
            o,
            Xn(m, v),
            E
          );
        Kn(m, v);
      }
      return typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint" ? (v = "" + v, o !== null && o.tag === 6 ? (a(m, o.sibling), E = e(o, v), E.return = m, m = E) : (a(m, o), E = bc(v, m.mode, E), E.return = m, m = E), i(m)) : a(m, o);
    }
    return function(m, o, v, E) {
      try {
        qe = 0;
        var D = V(
          m,
          o,
          v,
          E
        );
        return Ju = null, D;
      } catch (p) {
        if (p === Ku || p === Zn) throw p;
        var P = gt(29, p, null, m.mode);
        return P.lanes = E, P.return = m, P;
      }
    };
  }
  var bu = Ws(!0), Is = Ws(!1), qa = !1;
  function Uc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Rc(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Ya(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function Ga(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (ol & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Hn(l), js(l, null, a), t;
    }
    return pn(l, u, t, a), Hn(l);
  }
  function Ye(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Yo(l, a);
    }
  }
  function pc(l, t) {
    var a = l.updateQueue, u = l.alternate;
    if (u !== null && (u = u.updateQueue, a === u)) {
      var e = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var i = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? e = n = i : n = n.next = i, a = a.next;
        } while (a !== null);
        n === null ? e = n = t : n = n.next = t;
      } else e = n = t;
      a = {
        baseState: u.baseState,
        firstBaseUpdate: e,
        lastBaseUpdate: n,
        shared: u.shared,
        callbacks: u.callbacks
      }, l.updateQueue = a;
      return;
    }
    l = a.lastBaseUpdate, l === null ? a.firstBaseUpdate = t : l.next = t, a.lastBaseUpdate = t;
  }
  var Hc = !1;
  function Ge() {
    if (Hc) {
      var l = Lu;
      if (l !== null) throw l;
    }
  }
  function Xe(l, t, a, u) {
    Hc = !1;
    var e = l.updateQueue;
    qa = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, c = e.shared.pending;
    if (c !== null) {
      e.shared.pending = null;
      var f = c, r = f.next;
      f.next = null, i === null ? n = r : i.next = r, i = f;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, c = g.lastBaseUpdate, c !== i && (c === null ? g.firstBaseUpdate = r : c.next = r, g.lastBaseUpdate = f));
    }
    if (n !== null) {
      var z = e.baseState;
      i = 0, g = r = f = null, c = n;
      do {
        var d = c.lane & -536870913, y = d !== c.lane;
        if (y ? (k & d) === d : (u & d) === d) {
          d !== 0 && d === yu && (Hc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var O = l, C = c;
            d = t;
            var V = a;
            switch (C.tag) {
              case 1:
                if (O = C.payload, typeof O == "function") {
                  z = O.call(V, z, d);
                  break l;
                }
                z = O;
                break l;
              case 3:
                O.flags = O.flags & -65537 | 128;
              case 0:
                if (O = C.payload, d = typeof O == "function" ? O.call(V, z, d) : O, d == null) break l;
                z = K({}, z, d);
                break l;
              case 2:
                qa = !0;
            }
          }
          d = c.callback, d !== null && (l.flags |= 64, y && (l.flags |= 8192), y = e.callbacks, y === null ? e.callbacks = [d] : y.push(d));
        } else
          y = {
            lane: d,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, g === null ? (r = g = y, f = z) : g = g.next = y, i |= d;
        if (c = c.next, c === null) {
          if (c = e.shared.pending, c === null)
            break;
          y = c, c = y.next, y.next = null, e.lastBaseUpdate = y, e.shared.pending = null;
        }
      } while (!0);
      g === null && (f = z), e.baseState = f, e.firstBaseUpdate = r, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), Ja |= i, l.lanes = i, l.memoizedState = z;
    }
  }
  function ks(l, t) {
    if (typeof l != "function")
      throw Error(h(191, l));
    l.call(t);
  }
  function Ps(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        ks(a[l], t);
  }
  var Xa = yt(null), Jn = yt(0);
  function l0(l, t) {
    l = Aa, rl(Jn, l), rl(Xa, t), Aa = l | t.baseLanes;
  }
  function jc() {
    rl(Jn, Aa), rl(Xa, Xa.current);
  }
  function xc() {
    Aa = Jn.current, ql(Xa), ql(Jn);
  }
  var kl = yt(null), it = null;
  function Qa(l) {
    var t = l.alternate;
    rl(Pl, Pl.current & 1), rl(kl, l), it === null && (t === null || Xa.current !== null || t.memoizedState !== null) && (it = l);
  }
  function Bc(l) {
    rl(Pl, Pl.current), rl(kl, l), it === null && (it = l);
  }
  function t0(l) {
    l.tag === 22 ? (rl(Pl, Pl.current), rl(kl, l), it === null && (it = l)) : Za();
  }
  function Za() {
    rl(Pl, Pl.current), rl(kl, kl.current);
  }
  function Ut(l) {
    ql(kl), it === l && (it = null), ql(Pl);
  }
  var Pl = yt(0);
  function Qe(l, t) {
    rl(kl, kl.current), rl(Pl, t);
  }
  function qc(l) {
    ql(Pl), ql(kl), it === l && (it = null);
  }
  function wn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || io(a) || co(a)))
          return t;
      } else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === l) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === l) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var za = 0, Z = null, bl = null, Gl = null, $n = !1, wu = !1, Tu = !1, Fn = 0, Ze = 0, $u = null, Dv = 0;
  function Rl() {
    throw Error(h(321));
  }
  function Yc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!Ct(l[a], t[a])) return !1;
    return !0;
  }
  function Gc(l, t, a, u, e, n) {
    return za = n, Z = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, U.H = l === null || l.memoizedState === null ? Y0 : G0, Tu = !1, n = a(u, e), Tu = !1, wu && (n = u0(
      t,
      a,
      u,
      e
    )), a0(l), n;
  }
  function a0(l) {
    U.H = ai;
    var t = bl !== null && bl.next !== null;
    if (za = 0, Gl = bl = Z = null, $n = !1, Ze = 0, $u = null, t) throw Error(h(300));
    l === null || Xl || (l = l.dependencies, l !== null && Gn(l) && (Xl = !0));
  }
  function u0(l, t, a, u) {
    Z = l;
    var e = 0;
    do {
      if (wu && ($u = null), Ze = 0, wu = !1, 25 <= e) throw Error(h(301));
      if (e += 1, Gl = bl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      U.H = xv, n = t(a, u);
    } while (wu);
    return n;
  }
  function Mv() {
    var l = U.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Ve(t) : t, l = l.useState()[0], (bl !== null ? bl.memoizedState : null) !== l && (Z.flags |= 1024), t;
  }
  function Xc() {
    var l = Fn !== 0;
    return Fn = 0, l;
  }
  function Qc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Zc(l) {
    if ($n) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      $n = !1;
    }
    za = 0, Gl = bl = Z = null, wu = !1, Ze = Fn = 0, $u = null;
  }
  function st() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Gl === null ? Z.memoizedState = Gl = l : Gl = Gl.next = l, Gl;
  }
  function Hl() {
    if (bl === null) {
      var l = Z.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = bl.next;
    var t = Gl === null ? Z.memoizedState : Gl.next;
    if (t !== null)
      Gl = t, bl = l;
    else {
      if (l === null)
        throw Z.alternate === null ? Error(h(467)) : Error(h(310));
      bl = l, l = {
        memoizedState: bl.memoizedState,
        baseState: bl.baseState,
        baseQueue: bl.baseQueue,
        queue: bl.queue,
        next: null
      }, Gl === null ? Z.memoizedState = Gl = l : Gl = Gl.next = l;
    }
    return Gl;
  }
  function Wn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Ve(l) {
    var t = Ze;
    return Ze += 1, $u === null && ($u = []), l = ws($u, l, t), t = Z, (Gl === null ? t.memoizedState : Gl.next) === null && (t = t.alternate, U.H = t === null || t.memoizedState === null ? Y0 : G0), l;
  }
  function In(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Ve(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Ul) return Il(l);
    }
    throw Error(h(438, String(l)));
  }
  function Vc(l) {
    var t = null, a = Z.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = Z.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Wn(), Z.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = la;
    return t.index++, a;
  }
  function _a(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function kn(l) {
    var t = Hl();
    return Lc(t, bl, l);
  }
  function Lc(l, t, a) {
    var u = l.queue;
    if (u === null) throw Error(h(311));
    u.lastRenderedReducer = a;
    var e = l.baseQueue, n = u.pending;
    if (n !== null) {
      if (e !== null) {
        var i = e.next;
        e.next = n.next, n.next = i;
      }
      t.baseQueue = e = n, u.pending = null;
    }
    if (n = l.baseState, e === null) l.memoizedState = n;
    else {
      t = e.next;
      var c = i = null, f = null, r = t, g = !1;
      do {
        var z = r.lane & -536870913;
        if (z !== r.lane ? (k & z) === z : (za & z) === z) {
          var d = r.revertLane;
          if (d === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: r.action,
              hasEagerState: r.hasEagerState,
              eagerState: r.eagerState,
              next: null
            }), z === yu && (g = !0);
          else if ((za & d) === d) {
            r = r.next, d === yu && (g = !0);
            continue;
          } else
            z = {
              lane: 0,
              revertLane: r.revertLane,
              gesture: null,
              action: r.action,
              hasEagerState: r.hasEagerState,
              eagerState: r.eagerState,
              next: null
            }, f === null ? (c = f = z, i = n) : f = f.next = z, Z.lanes |= d, Ja |= d;
          z = r.action, Tu && a(n, z), n = r.hasEagerState ? r.eagerState : a(n, z);
        } else
          d = {
            lane: z,
            revertLane: r.revertLane,
            gesture: r.gesture,
            action: r.action,
            hasEagerState: r.hasEagerState,
            eagerState: r.eagerState,
            next: null
          }, f === null ? (c = f = d, i = n) : f = f.next = d, Z.lanes |= z, Ja |= z;
        r = r.next;
      } while (r !== null && r !== t);
      if (f === null ? i = n : f.next = c, !Ct(n, l.memoizedState) && (Xl = !0, g && (a = Lu, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function Kc(l) {
    var t = Hl(), a = t.queue;
    if (a === null) throw Error(h(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      Ct(n, t.memoizedState) || (Xl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function e0(l, t, a) {
    var u = Z, e = Hl(), n = w;
    if (n) {
      if (a === void 0) throw Error(h(407));
      a = a();
    } else a = t();
    var i = !Ct(
      (bl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Xl = !0), e = e.queue, $c(c0.bind(null, u, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || Gl !== null && (Gl.memoizedState.tag & 1) !== 0, Fu(
      l ? 9 : 8,
      { destroy: void 0 },
      i0.bind(null, u, e, a, t),
      null
    ), l) {
      if (u.flags |= 2048, Tl === null) throw Error(h(349));
      n || (za & 127) !== 0 || n0(u, t, a);
    }
    return a;
  }
  function n0(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = Z.updateQueue, t === null ? (t = Wn(), Z.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function i0(l, t, a, u) {
    t.value = a, t.getSnapshot = u, f0(t) && o0(l);
  }
  function c0(l, t, a) {
    return a(function() {
      f0(t) && o0(l);
    });
  }
  function f0(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !Ct(l, a);
    } catch {
      return !0;
    }
  }
  function o0(l) {
    var t = ou(l, 2);
    t !== null && Et(t, l, 2);
  }
  function Jc(l) {
    var t = st();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Tu) {
        Ca(!0);
        try {
          a();
        } finally {
          Ca(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: _a,
      lastRenderedState: l
    }, t;
  }
  function s0(l, t, a, u) {
    return l.baseState = a, Lc(
      l,
      bl,
      typeof u == "function" ? u : _a
    );
  }
  function Cv(l, t, a, u, e) {
    if (ti(l)) throw Error(h(485));
    if (l = t.action, l !== null) {
      var n = {
        payload: e,
        action: l,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(i) {
          n.listeners.push(i);
        }
      };
      U.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, d0(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function d0(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = U.T, i = {};
      i.types = n !== null ? n.types : null, U.T = i;
      try {
        var c = a(e, u), f = U.S;
        f !== null && f(i, c), m0(l, t, c);
      } catch (r) {
        wc(l, t, r);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), U.T = n;
      }
    } else
      try {
        n = a(e, u), m0(l, t, n);
      } catch (r) {
        wc(l, t, r);
      }
  }
  function m0(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        r0(l, t, u);
      },
      function(u) {
        return wc(l, t, u);
      }
    ) : r0(l, t, a);
  }
  function r0(l, t, a) {
    t.status = "fulfilled", t.value = a, v0(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, d0(l, a)));
  }
  function wc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, v0(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function v0(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function y0(l, t) {
    return t;
  }
  function h0(l, t) {
    if (w) {
      var a = Tl.formState;
      if (a !== null) {
        l: {
          var u = Z;
          if (w) {
            if (zl) {
              t: {
                for (var e = zl, n = Zt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Lt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                zl = Lt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            ja(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = st(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: y0,
      lastRenderedState: t
    }, a.queue = u, a = x0.bind(
      null,
      Z,
      u
    ), u.dispatch = a, u = Jc(!1), n = Pc.bind(
      null,
      Z,
      !1,
      u.queue
    ), u = st(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = Cv.bind(
      null,
      Z,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function g0(l) {
    var t = Hl();
    return S0(t, bl, l);
  }
  function S0(l, t, a) {
    if (t = Lc(
      l,
      t,
      y0
    )[0], l = kn(_a)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = Ve(t);
      } catch (i) {
        throw i === Ku ? Zn : i;
      }
    else u = t;
    t = Hl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (Z.flags |= 2048, Fu(
      9,
      { destroy: void 0 },
      Uv.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Uv(l, t) {
    l.action = t;
  }
  function b0(l) {
    var t = Hl(), a = bl;
    if (a !== null)
      return S0(t, a, l);
    Hl(), t = t.memoizedState, a = Hl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Fu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = Z.updateQueue, t === null && (t = Wn(), Z.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function T0() {
    return Hl().memoizedState;
  }
  function Pn(l, t, a, u) {
    var e = st();
    Z.flags |= l, e.memoizedState = Fu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function li(l, t, a, u) {
    var e = Hl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    bl !== null && u !== null && Yc(u, bl.memoizedState.deps) ? e.memoizedState = Fu(t, n, a, u) : (Z.flags |= l, e.memoizedState = Fu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function E0(l, t) {
    Pn(8390656, 8, l, t);
  }
  function $c(l, t) {
    li(2048, 8, l, t);
  }
  function Rv(l) {
    Z.flags |= 4;
    var t = Z.updateQueue;
    if (t === null)
      t = Wn(), Z.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function z0(l) {
    var t = Hl().memoizedState;
    return Rv({ ref: t, nextImpl: l }), function() {
      if ((ol & 2) !== 0) throw Error(h(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function _0(l, t) {
    return li(4, 2, l, t);
  }
  function O0(l, t) {
    return li(4, 4, l, t);
  }
  function N0(l, t) {
    if (typeof t == "function") {
      l = l();
      var a = t(l);
      return function() {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return l = l(), t.current = l, function() {
        t.current = null;
      };
  }
  function A0(l, t, a) {
    a = a != null ? a.concat([l]) : null, li(4, 4, N0.bind(null, t, l), a);
  }
  function Fc() {
  }
  function D0(l, t) {
    var a = Hl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Yc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function M0(l, t) {
    var a = Hl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Yc(t, u[1]))
      return u[0];
    if (u = l(), Tu) {
      Ca(!0);
      try {
        l();
      } finally {
        Ca(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function Wc(l, t, a) {
    return a === void 0 || (za & 1073741824) !== 0 && (k & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Yd(), Z.lanes |= l, Ja |= l, a);
  }
  function C0(l, t, a, u) {
    return Ct(a, t) ? a : Xa.current !== null ? (l = Wc(l, a, u), Ct(l, t) || (Xl = !0), l) : (za & 106) === 0 || (za & 1073741824) !== 0 && (k & 261930) === 0 ? (Xl = !0, l.memoizedState = a) : (l = Yd(), Z.lanes |= l, Ja |= l, t);
  }
  function U0(l, t, a, u, e) {
    var n = Y.p;
    Y.p = n !== 0 && 8 > n ? n : 8;
    var i = U.T, c = {};
    c.types = i !== null ? i.types : null, U.T = c, Pc(l, !1, t, a);
    try {
      var f = e(), r = U.S;
      if (r !== null && r(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Av(
          f,
          u
        );
        Le(
          l,
          t,
          g,
          jt(l)
        );
      } else
        Le(
          l,
          t,
          u,
          jt(l)
        );
    } catch (z) {
      Le(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: z },
        jt()
      );
    } finally {
      Y.p = n, i !== null && c.types !== null && (i.types = c.types), U.T = i;
    }
  }
  function pv() {
  }
  function Ic(l, t, a, u) {
    if (l.tag !== 5) throw Error(h(476));
    var e = R0(l).queue;
    U0(
      l,
      e,
      t,
      Jt,
      a === null ? pv : function() {
        return p0(l), a(u);
      }
    );
  }
  function R0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: Jt,
      baseState: Jt,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: _a,
        lastRenderedState: Jt
      },
      next: null
    };
    var a = {};
    return t.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: _a,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function p0(l) {
    var t = R0(l);
    t.next === null && (t = l.alternate.memoizedState), Le(
      l,
      t.next.queue,
      {},
      jt()
    );
  }
  function kc() {
    return Il(ve);
  }
  function H0() {
    return Hl().memoizedState;
  }
  function j0() {
    return Hl().memoizedState;
  }
  function Hv(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = jt();
          l = Ya(a);
          var u = Ga(t, l, a);
          u !== null && (Et(u, t, a), Ye(u, t, a)), t = { cache: Ac() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function jv(l, t, a) {
    var u = jt();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ti(l) ? B0(t, a) : (a = gc(l, t, a, u), a !== null && (Et(a, l, u), q0(a, t, u)));
  }
  function x0(l, t, a) {
    var u = jt();
    Le(l, t, a, u);
  }
  function Le(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (ti(l)) B0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, Ct(c, i))
            return pn(l, t, e, 0), Tl === null && Rn(), !1;
        } catch {
        }
      if (a = gc(l, t, e, u), a !== null)
        return Et(a, l, u), q0(a, t, u), !0;
    }
    return !1;
  }
  function Pc(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Lf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ti(l)) {
      if (t) throw Error(h(479));
    } else
      t = gc(
        l,
        a,
        u,
        2
      ), t !== null && Et(t, l, 2);
  }
  function ti(l) {
    var t = l.alternate;
    return l === Z || t !== null && t === Z;
  }
  function B0(l, t) {
    wu = $n = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function q0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Yo(l, a);
    }
  }
  var ai = {
    readContext: Il,
    use: In,
    useCallback: Rl,
    useContext: Rl,
    useEffect: Rl,
    useImperativeHandle: Rl,
    useLayoutEffect: Rl,
    useInsertionEffect: Rl,
    useMemo: Rl,
    useReducer: Rl,
    useRef: Rl,
    useState: Rl,
    useDebugValue: Rl,
    useDeferredValue: Rl,
    useTransition: Rl,
    useSyncExternalStore: Rl,
    useId: Rl,
    useHostTransitionStatus: Rl,
    useFormState: Rl,
    useActionState: Rl,
    useOptimistic: Rl,
    useMemoCache: Rl,
    useCacheRefresh: Rl,
    useEffectEvent: Rl
  }, Y0 = {
    readContext: Il,
    use: In,
    useCallback: function(l, t) {
      return st().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Il,
    useEffect: E0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, Pn(
        4194308,
        4,
        N0.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return Pn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      Pn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = st();
      t = t === void 0 ? null : t;
      var u = l();
      if (Tu) {
        Ca(!0);
        try {
          l();
        } finally {
          Ca(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = st();
      if (a !== void 0) {
        var e = a(t);
        if (Tu) {
          Ca(!0);
          try {
            a(t);
          } finally {
            Ca(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = jv.bind(
        null,
        Z,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = st();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Jc(l);
      var t = l.queue, a = x0.bind(null, Z, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: Fc,
    useDeferredValue: function(l, t) {
      var a = st();
      return Wc(a, l, t);
    },
    useTransition: function() {
      var l = Jc(!1);
      return l = U0.bind(
        null,
        Z,
        l.queue,
        !0,
        !1
      ), st().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = Z, e = st();
      if (w) {
        if (a === void 0)
          throw Error(h(407));
        a = a();
      } else {
        if (a = t(), Tl === null)
          throw Error(h(349));
        (k & 127) !== 0 || n0(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, E0(c0.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Fu(
        9,
        { destroy: void 0 },
        i0.bind(
          null,
          u,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var l = st(), t = Tl.identifierPrefix;
      if (w) {
        var a = ua, u = aa;
        a = (u & ~(1 << 32 - Dt(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Fn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Dv++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: kc,
    useFormState: h0,
    useActionState: h0,
    useOptimistic: function(l) {
      var t = st();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = Pc.bind(
        null,
        Z,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Vc,
    useCacheRefresh: function() {
      return st().memoizedState = Hv.bind(
        null,
        Z
      );
    },
    useEffectEvent: function(l) {
      var t = st(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((ol & 2) !== 0)
          throw Error(h(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, G0 = {
    readContext: Il,
    use: In,
    useCallback: D0,
    useContext: Il,
    useEffect: $c,
    useImperativeHandle: A0,
    useInsertionEffect: _0,
    useLayoutEffect: O0,
    useMemo: M0,
    useReducer: kn,
    useRef: T0,
    useState: function() {
      return kn(_a);
    },
    useDebugValue: Fc,
    useDeferredValue: function(l, t) {
      var a = Hl();
      return C0(
        a,
        bl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = kn(_a)[0], t = Hl().memoizedState;
      return [
        typeof l == "boolean" ? l : Ve(l),
        t
      ];
    },
    useSyncExternalStore: e0,
    useId: H0,
    useHostTransitionStatus: kc,
    useFormState: g0,
    useActionState: g0,
    useOptimistic: function(l, t) {
      var a = Hl();
      return s0(a, bl, l, t);
    },
    useMemoCache: Vc,
    useCacheRefresh: j0,
    useEffectEvent: z0
  }, xv = {
    readContext: Il,
    use: In,
    useCallback: D0,
    useContext: Il,
    useEffect: $c,
    useImperativeHandle: A0,
    useInsertionEffect: _0,
    useLayoutEffect: O0,
    useMemo: M0,
    useReducer: Kc,
    useRef: T0,
    useState: function() {
      return Kc(_a);
    },
    useDebugValue: Fc,
    useDeferredValue: function(l, t) {
      var a = Hl();
      return bl === null ? Wc(a, l, t) : C0(
        a,
        bl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Kc(_a)[0], t = Hl().memoizedState;
      return [
        typeof l == "boolean" ? l : Ve(l),
        t
      ];
    },
    useSyncExternalStore: e0,
    useId: H0,
    useHostTransitionStatus: kc,
    useFormState: b0,
    useActionState: b0,
    useOptimistic: function(l, t) {
      var a = Hl();
      return bl !== null ? s0(a, bl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Vc,
    useCacheRefresh: j0,
    useEffectEvent: z0
  };
  function lf(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : K({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var tf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = jt(), e = Ya(u);
      e.payload = t, a != null && (e.callback = a), t = Ga(l, e, u), t !== null && (Et(t, l, u), Ye(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = jt(), e = Ya(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = Ga(l, e, u), t !== null && (Et(t, l, u), Ye(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = jt(), u = Ya(a);
      u.tag = 2, t != null && (u.callback = t), t = Ga(l, u, a), t !== null && (Et(t, l, a), Ye(t, l, a));
    }
  };
  function X0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Ue(a, u) || !Ue(e, n) : !0;
  }
  function Q0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && tf.enqueueReplaceState(t, t.state, null);
  }
  function Eu(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = K({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function Z0(l) {
    Un(l);
  }
  function V0(l) {
    console.error(l);
  }
  function L0(l) {
    Un(l);
  }
  function ui(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function K0(l, t, a) {
    try {
      var u = l.onCaughtError;
      u(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function af(l, t, a) {
    return a = Ya(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      ui(l, t);
    }, a;
  }
  function J0(l) {
    return l = Ya(l), l.tag = 3, l;
  }
  function w0(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        K0(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      K0(t, a, u), typeof e != "function" && (wa === null ? wa = /* @__PURE__ */ new Set([this]) : wa.add(this));
      var c = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Bv(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && ru(
        t,
        a,
        e,
        !0
      ), a = kl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return it === null ? Oi() : a.alternate === null && pl === 0 && (pl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Vn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Qf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Vn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Qf(l, u, e)), !1;
        }
        throw Error(h(435, a.tag));
      }
      return Qf(l, u, e), Oi(), !1;
    }
    if (w)
      return t = kl.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== zc && (l = Error(h(422), { cause: u }), He(Gt(l, a)))) : (u !== zc && (t = Error(h(423), {
        cause: u
      }), He(
        Gt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = Gt(u, a), e = af(
        l.stateNode,
        u,
        e
      ), pc(l, e), pl !== 4 && (pl = 2)), !1;
    var n = Error(h(520), { cause: u });
    if (n = Gt(n, a), ke === null ? ke = [n] : ke.push(n), pl !== 4 && (pl = 2), t === null) return !0;
    u = Gt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = af(a.stateNode, u, l), pc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (wa === null || !wa.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = J0(e), w0(
              e,
              l,
              a,
              u
            ), pc(a, e), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var uf = Error(h(461)), Xl = !1;
  function Vl(l, t, a, u) {
    t.child = l === null ? Is(t, null, a, u) : bu(
      t,
      l.child,
      a,
      u
    );
  }
  function $0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var c in u)
        c !== "ref" && (i[c] = u[c]);
    } else i = u;
    return vu(t), u = Gc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = Xc(), l !== null && !Xl ? (Qc(l, t, e), Oa(l, t, e)) : (w && c && Bn(t), t.flags |= 1, Vl(l, t, u, e), t.child);
  }
  function F0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Sc(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, W0(
        l,
        t,
        n,
        u,
        e
      )) : (l = jn(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !mf(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Ue, a(i, u) && l.ref === t.ref)
        return Oa(l, t, e);
    }
    return t.flags |= 1, l = Sa(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function W0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Ue(n, u) && l.ref === t.ref)
        if (Xl = !1, t.pendingProps = u = n, mf(l, e))
          (l.flags & 131072) !== 0 && (Xl = !0);
        else
          return t.lanes = l.lanes, Oa(l, t, e);
    }
    return ef(
      l,
      t,
      a,
      u,
      e
    );
  }
  function I0(l, t, a, u) {
    var e = u.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), u.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, l !== null) {
          for (u = t.child = l.child, e = 0; u !== null; )
            e = e | u.lanes | u.childLanes, u = u.sibling;
          u = e & ~n;
        } else u = 0, t.child = null;
        return k0(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && Qn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? l0(t, n) : jc(), t0(t);
      else
        return u = t.lanes = 536870912, k0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (Qn(t, n.cachePool), l0(t, n), Za(), t.memoizedState = null) : (l !== null && Qn(t, null), jc(), Za());
    return Vl(l, t, e, a), t.child;
  }
  function Ke(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function k0(l, t, a, u, e) {
    var n = Mc();
    return n = n === null ? null : { parent: Yl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && Qn(t, null), jc(), t0(t), l !== null && ru(l, t, u, !0), t.childLanes = e, null;
  }
  function ei(l, t) {
    return t = ni(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function P0(l, t, a) {
    return bu(t, l.child, null, a), l = ei(t, t.pendingProps), l.flags |= 2, Ut(t), t.memoizedState = null, l;
  }
  function qv(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (w) {
        if (u.mode === "hidden")
          return l = ei(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Ke(null, l);
        if (Bc(t), (l = zl) ? (l = Nm(
          l,
          Zt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: pa !== null ? { id: aa, overflow: ua } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Bs(l), a.return = t, t.child = a, Jl = t, zl = null)) : l = null, l === null) throw ja(t);
        return t.lanes = 536870912, null;
      }
      return ei(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Bc(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = P0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(h(558));
      else if (Xl || ru(l, t, a, !1), e = (a & l.childLanes) !== 0, Xl || e) {
        if (Xa.current === null) {
          if (u = Tl, u !== null && (i = Go(u, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, ou(l, i), Et(u, l, i), uf;
          Oi();
        }
        t = P0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, zl = Lt(i.nextSibling), Jl = t, w = !0, Ha = null, Zt = !1, l !== null && Gs(t, l), t = ei(t, u), t.flags |= 134221824;
      return t;
    }
    return l = Sa(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Wu(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(h(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function ef(l, t, a, u, e) {
    return vu(t), a = Gc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Xc(), l !== null && !Xl ? (Qc(l, t, e), Oa(l, t, e)) : (w && u && Bn(t), t.flags |= 1, Vl(l, t, a, e), t.child);
  }
  function ld(l, t, a, u, e, n) {
    return vu(t), t.updateQueue = null, a = u0(
      t,
      u,
      a,
      e
    ), a0(l), u = Xc(), l !== null && !Xl ? (Qc(l, t, n), Oa(l, t, n)) : (w && u && Bn(t), t.flags |= 1, Vl(l, t, a, n), t.child);
  }
  function td(l, t, a, u, e) {
    if (vu(t), t.stateNode === null) {
      var n = Xu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Il(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = tf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Uc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Il(i) : Xu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (lf(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && tf.enqueueReplaceState(n, n.state, null), Xe(t, u, n, e), Ge(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = Eu(a, c);
      n.props = f;
      var r = n.context, g = a.contextType;
      i = Xu, typeof g == "object" && g !== null && (i = Il(g));
      var z = a.getDerivedStateFromProps;
      g = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || r !== i) && Q0(
        t,
        n,
        u,
        i
      ), qa = !1;
      var d = t.memoizedState;
      n.state = d, Xe(t, u, n, e), Ge(), r = t.memoizedState, c || d !== r || qa ? (typeof z == "function" && (lf(
        t,
        a,
        z,
        u
      ), r = t.memoizedState), (f = qa || X0(
        t,
        a,
        f,
        u,
        d,
        r,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = r), n.props = u, n.state = r, n.context = i, u = f) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Rc(l, t), i = t.memoizedProps, g = Eu(a, i), n.props = g, z = t.pendingProps, d = n.context, r = a.contextType, f = Xu, typeof r == "object" && r !== null && (f = Il(r)), c = a.getDerivedStateFromProps, (r = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || d !== f) && Q0(
        t,
        n,
        u,
        f
      ), qa = !1, d = t.memoizedState, n.state = d, Xe(t, u, n, e), Ge();
      var y = t.memoizedState;
      i !== z || d !== y || qa || l !== null && l.dependencies !== null && Gn(l.dependencies) ? (typeof c == "function" && (lf(
        t,
        a,
        c,
        u
      ), y = t.memoizedState), (g = qa || X0(
        t,
        a,
        g,
        u,
        d,
        y,
        f
      ) || l !== null && l.dependencies !== null && Gn(l.dependencies)) ? (r || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, y, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        y,
        f
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = y), n.props = u, n.state = y, n.context = f, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, Wu(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = bu(
      t,
      l.child,
      null,
      e
    ), t.child = bu(
      t,
      null,
      a,
      e
    )) : Vl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = Oa(
      l,
      t,
      e
    ), l;
  }
  function ad(l, t, a, u) {
    return du(), t.flags |= 256, Vl(l, t, a, u), t.child;
  }
  var nf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function cf(l) {
    return { baseLanes: l, cachePool: Ks() };
  }
  function ff(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= Ht), l;
  }
  function ud(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Pl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (w) {
        if (e ? Qa(t) : Za(), (l = zl) ? (l = Nm(
          l,
          Zt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: pa !== null ? { id: aa, overflow: ua } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Bs(l), a.return = t, t.child = a, Jl = t, zl = null)) : l = null, l === null) throw ja(t);
        return co(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = u.children, u = u.fallback, e ? (Za(), e = t.mode, n = ni(
        { mode: "hidden", children: n },
        e
      ), u = su(
        u,
        e,
        a,
        null
      ), n.return = t, u.return = t, n.sibling = u, t.child = n, u = t.child, u.memoizedState = cf(a), u.childLanes = ff(
        l,
        i,
        a
      ), t.memoizedState = nf, Ke(null, u)) : (Qa(t), of(t, n));
    }
    var c = l.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return Yv(
          l,
          t,
          n,
          i,
          u,
          f,
          c,
          a
        );
    }
    return e ? (Za(), e = u.fallback, n = t.mode, c = l.child, f = c.sibling, u = Sa(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? e = Sa(f, e) : (e = su(
      e,
      n,
      a,
      null
    ), e.flags |= 2), e.return = t, u.return = t, u.sibling = e, t.child = u, Ke(null, u), u = t.child, e = l.child.memoizedState, e === null ? e = cf(a) : (n = e.cachePool, n !== null ? (c = Yl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Ks(), e = {
      baseLanes: e.baseLanes | a,
      cachePool: n
    }), u.memoizedState = e, u.childLanes = ff(
      l,
      i,
      a
    ), t.memoizedState = nf, Ke(l.child, u)) : (Qa(t), a = l.child, l = a.sibling, a = Sa(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function of(l, t) {
    return t = ni(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function ni(l, t) {
    return l = gt(22, l, null, t), l.lanes = 0, l;
  }
  function ii(l, t, a) {
    return bu(t, l.child, null, a), l = of(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Yv(l, t, a, u, e, n, i, c) {
    if (a)
      return t.flags & 256 ? (Qa(t), t.flags &= -257, ii(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Za(), t.child = l.child, t.flags |= 128, null) : (Za(), n = e.fallback, i = t.mode, e = ni(
        { mode: "visible", children: e.children },
        i
      ), n = su(
        n,
        i,
        c,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, bu(t, l.child, null, c), e = t.child, e.memoizedState = cf(c), e.childLanes = ff(
        l,
        u,
        c
      ), t.memoizedState = nf, Ke(null, e));
    if (Qa(t), co(n)) {
      if (u = n.nextSibling && n.nextSibling.dataset, u) var f = u.dgst;
      return u = f, u !== "" && (e = Error(h(419)), e.stack = "", e.digest = u, He({ value: e, source: null, stack: null })), ii(
        l,
        t,
        c
      );
    }
    if (Xl || ru(l, t, c, !1), u = (c & l.childLanes) !== 0, Xl || u) {
      if (Xa.current !== null)
        return ii(
          l,
          t,
          c
        );
      if (u = Tl, u !== null && (e = Go(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, ou(l, e), Et(u, l, e), uf;
      return io(n) || Oi(), ii(
        l,
        t,
        c
      );
    }
    return io(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, zl = Lt(n.nextSibling), Jl = t, w = !0, Ha = null, Zt = !1, l !== null && Gs(t, l), t = of(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function ed(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Yn(l.return, t, a);
  }
  function nd(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && wn(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function ci(l, t, a, u, e, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: u,
      tail: a,
      tailMode: e,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = u, i.tail = a, i.tailMode = e, i.treeForkCount = n);
  }
  function sf(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function df(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = Pl.current;
    if (t.flags & 128)
      return Qe(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, Qe(t, i), e === "backwards" && l !== null ? (sf(l), Vl(l, t, u, a), sf(l)) : Vl(l, t, u, a), u = w ? pe : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && ed(l, a, t);
        else if (l.tag === 19)
          ed(l, a, t);
        else if (l.child !== null) {
          l.child.return = l, l = l.child;
          continue;
        }
        if (l === t) break l;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t)
            break l;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    switch (e) {
      case "backwards":
        a = nd(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null, sf(t)), ci(
          t,
          !0,
          e,
          null,
          n,
          u
        );
        break;
      case "unstable_legacy-backwards":
        for (a = null, e = t.child, t.child = null; e !== null; ) {
          if (l = e.alternate, l !== null && wn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        ci(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        ci(
          t,
          !1,
          null,
          null,
          void 0,
          u
        );
        break;
      case "independent":
        t.memoizedState = null;
        break;
      default:
        a = nd(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), ci(
          t,
          !1,
          e,
          a,
          n,
          u
        );
    }
    return t.child;
  }
  function id(l, t, a) {
    var u = t.pendingProps;
    return xa(t, t.type, u.value), Vl(l, t, u.children, a), t.child;
  }
  function Oa(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), Ja |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (ru(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(h(153));
    if (t.child !== null) {
      for (l = t.child, a = Sa(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Sa(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function mf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && Gn(l)));
  }
  function Gv(l, t, a) {
    switch (t.tag) {
      case 3:
        Du(t, t.stateNode.containerInfo), xa(t, Yl, l.memoizedState.cache), du();
        break;
      case 27:
      case 5:
        ge(t);
        break;
      case 4:
        Du(t, t.stateNode.containerInfo);
        break;
      case 10:
        xa(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Bc(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null) {
          if (u.dehydrated !== null)
            return Qa(t), t.flags |= 128, null;
          u = ru(
            l,
            t,
            a,
            !1
          );
          var e = t.child.childLanes;
          return u || (a & e) !== 0 ? ud(l, t, a) : (Qa(t), l = Oa(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        Qa(t);
        break;
      case 19:
        if (t.flags & 128)
          return df(
            l,
            t,
            a
          );
        if (e = (l.flags & 128) !== 0, u = (a & t.childLanes) !== 0, u || (ru(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return df(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), Qe(t, Pl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, I0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        xa(t, Yl, l.memoizedState.cache);
    }
    return Oa(l, t, a);
  }
  function cd(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Xl = !0;
      else {
        if (!mf(l, a) && (t.flags & 128) === 0)
          return Xl = !1, Gv(
            l,
            t,
            a
          );
        Xl = (l.flags & 131072) !== 0;
      }
    else
      Xl = !1, w && (t.flags & 1048576) !== 0 && Ys(t, pe, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = gu(t.elementType), t.type = l, typeof l == "function")
            Sc(l) ? (u = Eu(l, u), t.tag = 1, t = td(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = ef(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === N) {
                t.tag = 11, t = $0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === sl) {
                t.tag = 14, t = F0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === Ul) {
                t.tag = 10, t.type = l, t = id(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = I(l) || l, Error(h(306, t, ""));
          }
        }
        return t;
      case 0:
        return ef(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = Eu(
          u,
          t.pendingProps
        ), td(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (Du(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(h(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Rc(l, t), Xe(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, xa(t, Yl, u), u !== n.cache && Nc(
            t,
            [Yl],
            a,
            !0
          ), Ge(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = ad(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = Gt(
                Error(h(424)),
                t
              ), He(e), t = ad(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, zl = Lt(l.firstChild), Jl = t, w = !0, Ha = null, Zt = !0, a = Is(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (du(), u === e) {
              t = Oa(
                l,
                t,
                a
              );
              break l;
            }
            Vl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Wu(l, t), l === null ? (a = pm(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : w || (t.stateNode = dm(
          t.type,
          t.pendingProps,
          ft.current,
          t
        )) : t.memoizedState = pm(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return ge(t), l === null && w && (u = t.stateNode = Mm(
          t.type,
          t.pendingProps,
          ft.current
        ), Jl = t, Zt = !0, e = zl, Wa(t.type) ? (fo = e, zl = Lt(u.firstChild)) : zl = e), Vl(
          l,
          t,
          t.pendingProps.children,
          a
        ), Wu(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && w && ((e = u = zl) && (u = Hy(
          u,
          t.type,
          t.pendingProps,
          Zt
        ), u !== null ? (t.stateNode = u, Jl = t, zl = Lt(u.firstChild), Zt = !1, e = !0) : e = !1), e || ja(t)), ge(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, Pf(e, n) ? u = null : i !== null && Pf(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Gc(
          l,
          t,
          Mv,
          null,
          null,
          a
        ), ve._currentValue = e), Wu(l, t), Vl(l, t, u, a), t.child;
      case 6:
        return l === null && w && ((l = a = zl) && (a = jy(
          a,
          t.pendingProps,
          Zt
        ), a !== null ? (t.stateNode = a, Jl = t, zl = null, l = !0) : l = !1), l || ja(t)), null;
      case 13:
        return ud(l, t, a);
      case 4:
        return Du(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = bu(
          t,
          null,
          u,
          a
        ) : Vl(l, t, u, a), t.child;
      case 11:
        return $0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return u = t.pendingProps, Wu(l, t), Vl(l, t, u, a), t.child;
      case 8:
        return Vl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Vl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return id(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, vu(t), e = Il(e), u = u(e), t.flags |= 1, Vl(l, t, u, a), t.child;
      case 14:
        return F0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return W0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return df(l, t, a);
      case 31:
        return qv(l, t, a);
      case 22:
        return I0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return vu(t), u = Il(Yl), l === null ? (e = Mc(), e === null && (e = Tl, n = Ac(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Uc(t), xa(t, Yl, e)) : ((l.lanes & a) !== 0 && (Rc(l, t), Xe(t, null, null, a), Ge()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), xa(t, Yl, u)) : (u = n.cache, xa(t, Yl, u), u !== e.cache && Nc(
          t,
          [Yl],
          a,
          !0
        ))), Vl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 30:
        return t.stateNode === null && (t.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : w && Bn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : Wu(l, t), Vl(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(h(156, t.tag));
  }
  function Na(l) {
    l.flags |= 4;
  }
  function rf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? Bm(t, u) : Bm(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Zd()) l.flags |= 8192;
        else
          throw Su = Vn, Cc;
    } else l.flags &= -16777217;
  }
  function fd(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !qm(t))
      if (Zd()) l.flags |= 8192;
      else
        throw Su = Vn, Cc;
  }
  function fi(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Bo() : 536870912, l.lanes |= t, te |= t);
  }
  function Je(l, t) {
    if (!w)
      switch (l.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var a = l.tail, u = null; a !== null; )
            a.alternate !== null && (u = a), a = a.sibling;
          u === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : u.sibling = null;
          break;
        default:
          for (t = l.tail, a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? l.tail = null : a.sibling = null;
      }
  }
  function _l(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, u = 0;
    if (t)
      for (var e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags & 1206910976, u |= e.flags & 1206910976, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags, u |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= u, l.childLanes = a, t;
  }
  function Xv(l, t, a) {
    var u = t.pendingProps;
    switch (Ec(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return _l(t), null;
      case 1:
        return _l(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Ea(Yl), ma(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Vu(t) ? Na(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, _c())), _l(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Na(t), n !== null ? (_l(t), fd(t, n)) : (_l(t), rf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Na(t), _l(t), fd(t, n)) : (_l(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Na(t), _l(t), rf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (S(t), a = ft.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Na(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return _l(t), t.subtreeFlags &= -33554433, null;
          }
          l = Ot.current, Vu(t) ? Xs(t) : (l = Mm(e, u, a), t.stateNode = l, Na(t));
        }
        return _l(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (S(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Na(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return _l(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = Ot.current, Vu(t))
            Xs(t);
          else {
            var i = un(
              ft.current
            );
            switch (n) {
              case 1:
                n = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  e
                );
                break;
              case 2:
                n = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  e
                );
                break;
              default:
                switch (e) {
                  case "svg":
                    n = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      e
                    );
                    break;
                  case "math":
                    n = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      e
                    );
                    break;
                  case "script":
                    n = i.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(
                      n.firstChild
                    );
                    break;
                  case "select":
                    n = typeof u.is == "string" ? i.createElement("select", {
                      is: u.is
                    }) : i.createElement("select"), u.multiple ? n.multiple = !0 : u.size && (n.size = u.size);
                    break;
                  default:
                    n = typeof u.is == "string" ? i.createElement(e, { is: u.is }) : i.createElement(e);
                }
            }
            n[Wl] = t, n[ht] = u;
            l: for (i = t.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                n.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === t) break l;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === t)
                  break l;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            t.stateNode = n;
            l: switch (tt(n, e, u), e) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                u = !!u.autoFocus;
                break l;
              case "img":
                u = !0;
                break l;
              default:
                u = !1;
            }
            u && Na(t);
          }
        }
        return _l(t), t.subtreeFlags &= -33554433, rf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && Na(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(h(166));
          if (l = ft.current, Vu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Jl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Wl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || cm(l.nodeValue, a)), l || ja(t, !0);
          } else
            l = un(l).createTextNode(
              u
            ), l[Wl] = t, t.stateNode = l;
        }
        return _l(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Vu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(h(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(557));
              l[Wl] = t;
            } else
              du(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            _l(t), l = !1;
          } else
            a = _c(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Ut(t), t) : (Ut(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(h(558));
        }
        return _l(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Vu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(h(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(h(317));
              e[Wl] = t;
            } else
              du(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            _l(t), e = !1;
          } else
            e = _c(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (Ut(t), t) : (Ut(t), null);
        }
        return Ut(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), fi(t, t.updateQueue), _l(t), null);
      case 4:
        return ma(), l === null && $f(t.stateNode.containerInfo), t.flags |= 67108864, _l(t), null;
      case 10:
        return Ea(t.type), _l(t), null;
      case 19:
        if (qc(t), u = t.memoizedState, u === null) return _l(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Je(u, !1);
          else {
            if (pl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = wn(l), n !== null) {
                  for (t.flags |= 128, Je(u, !1), l = n.updateQueue, t.updateQueue = l, fi(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    xs(a, l), a = a.sibling;
                  return Qe(
                    t,
                    Pl.current & 1 | 2
                  ), w && ba(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Nt() > Ti && (t.flags |= 128, e = !0, Je(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = wn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, fi(t, l), Je(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !w)
                return _l(t), null;
            } else
              2 * Nt() - u.renderingStartTime > Ti && a !== 536870912 && (t.flags |= 128, e = !0, Je(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (l = u.last, l !== null ? l.sibling = n : t.child = n, u.last = n);
        }
        if (u.tail !== null) {
          l = u.tail;
          l: {
            for (a = l; a !== null; ) {
              if (a.alternate !== null) {
                a = !1;
                break l;
              }
              a = a.sibling;
            }
            a = !0;
          }
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Nt(), l.sibling = null, n = Pl.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || w ? Qe(t, n) : (a = n, rl(kl, t), rl(Pl, a), it === null && (it = t)), w && ba(t, u.treeForkCount), l;
        }
        return _l(t), null;
      case 22:
      case 23:
        return Ut(t), xc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (_l(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : _l(t), a = t.updateQueue, a !== null && fi(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && ql(hu), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Ea(Yl), _l(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, _l(t), null;
    }
    throw Error(h(156, t.tag));
  }
  function Qv(l, t) {
    switch (Ec(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Ea(Yl), ma(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return S(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Ut(t), t.alternate === null)
            throw Error(h(340));
          du();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Ut(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(h(340));
          du();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return qc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return ma(), null;
      case 10:
        return Ea(t.type), null;
      case 22:
      case 23:
        return Ut(t), xc(), l !== null && ql(hu), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Ea(Yl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function od(l, t) {
    switch (Ec(t), t.tag) {
      case 3:
        Ea(Yl), ma();
        break;
      case 26:
      case 27:
      case 5:
        S(t);
        break;
      case 4:
        ma();
        break;
      case 31:
        t.memoizedState !== null && Ut(t);
        break;
      case 13:
        Ut(t);
        break;
      case 19:
        qc(t);
        break;
      case 10:
        Ea(t.type);
        break;
      case 22:
      case 23:
        Ut(t), xc(), l !== null && ql(hu);
        break;
      case 24:
        Ea(Yl);
    }
  }
  function we(l, t) {
    try {
      var a = t.updateQueue, u = a !== null ? a.lastEffect : null;
      if (u !== null) {
        var e = u.next;
        a = e;
        do {
          if ((a.tag & l) === l) {
            u = void 0;
            var n = a.create, i = a.inst;
            u = n(), i.destroy = u;
          }
          a = a.next;
        } while (a !== e);
      }
    } catch (c) {
      hl(t, t.return, c);
    }
  }
  function Va(l, t, a) {
    try {
      var u = t.updateQueue, e = u !== null ? u.lastEffect : null;
      if (e !== null) {
        var n = e.next;
        u = n;
        do {
          if ((u.tag & l) === l) {
            var i = u.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, e = t;
              var f = a, r = c;
              try {
                r();
              } catch (g) {
                hl(
                  e,
                  f,
                  g
                );
              }
            }
          }
          u = u.next;
        } while (u !== n);
      }
    } catch (g) {
      hl(t, t.return, g);
    }
  }
  function sd(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        Ps(t, a);
      } catch (u) {
        hl(l, l.return, u);
      }
    }
  }
  function dd(l, t, a) {
    a.props = Eu(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      hl(l, t, u);
    }
  }
  function ea(l, t) {
    try {
      var a = l.ref;
      if (a !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var u = l.stateNode;
            break;
          case 30:
            var e = l.stateNode, n = ha(l.memoizedProps, e);
            (e.ref === null || e.ref.name !== n) && (e.ref = Sm(n)), u = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new xt(l);
              b(
                l.child,
                !1,
                Ry,
                i,
                void 0,
                void 0
              ), l.stateNode = i;
            }
            u = l.stateNode;
            break;
          default:
            u = l.stateNode;
        }
        typeof a == "function" ? l.refCleanup = a(u) : a.current = u;
      }
    } catch (c) {
      hl(l, t, c);
    }
  }
  function lt(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          hl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          hl(l, t, e);
        }
      else a.current = null;
  }
  function oi(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        Om(
          l.stateNode,
          t[a]
        );
  }
  function md(l) {
    for (var t = l.return; t !== null && (yf(t) && Om(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function $e(l) {
    for (var t = l.return; t !== null && (yf(t) && py(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function vf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function yf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function hf(l) {
    var t = l.type, a = l.memoizedProps, u = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && u.focus();
          break l;
        case "img":
          a.src ? u.src = a.src : a.srcSet && (u.srcset = a.srcSet);
      }
    } catch (e) {
      hl(l, l.return, e);
    }
  }
  function gf(l, t, a) {
    try {
      var u = l.stateNode;
      ry(u, l.type, a, t), u[ht] = t;
    } catch (e) {
      hl(l, l.return, e);
    }
  }
  function rd(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Wa(l.type) || l.tag === 4;
  }
  function Sf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || rd(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Wa(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function bf(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = ta)), oi(l, u), cl = !0;
    else if (e !== 4 && (e === 27 && (oi(l, u), u = null, Wa(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (bf(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        bf(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function si(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), oi(l, u), cl = !0;
    else if (e !== 4 && (e === 27 && (oi(l, u), u = null, Wa(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (si(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        si(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function vd(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      tt(t, u, a), t[Wl] = l, t[ht] = a;
    } catch (n) {
      hl(l, l.return, n);
    }
  }
  var di = !1, Rt = null;
  function yd(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (di = !0);
  }
  var na = null;
  function hd() {
    var l = na;
    return na = null, l;
  }
  var St = 0;
  function Iu(l, t, a, u, e) {
    return St = 0, gd(
      l.child,
      t,
      a,
      u,
      e
    );
  }
  function gd(l, t, a, u, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (u !== null) {
          var c = ao(i);
          u.push(c), c.view && (n = !0);
        } else
          n || ao(i).view && (n = !0);
        di = !0, hm(
          i,
          St === 0 ? t : t + "_" + St,
          a
        ), St++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || gd(
        l.child,
        t,
        a,
        u,
        e
      ) && (n = !0));
      l = l.sibling;
    }
    return n;
  }
  function ia(l, t) {
    for (; l !== null; )
      l.tag === 5 ? gm(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || ia(
        l.child,
        t
      )), l = l.sibling;
  }
  function mi(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (mi(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(h(544));
          var a = t.name;
          t = ga(t.default, t.share), t !== "none" && (Iu(
            l,
            a,
            t,
            null,
            !1
          ) || ia(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function Tf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, u = l.memoizedProps, e = ha(u, a), n = ga(
        u.default,
        a.paired ? u.share : u.enter
      );
      n !== "none" ? Iu(l, e, n, null, !1) ? (mi(l), a.paired || t || ne(l, u.onEnter)) : ia(l.child, !1) : mi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Tf(l, t), l = l.sibling;
    else mi(l);
  }
  function Ef(l) {
    if (Rt !== null && Rt.size !== 0) {
      var t = Rt;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var a = l.memoizedProps, u = a.name;
              if (u != null && u !== "auto") {
                var e = t.get(u);
                if (e !== void 0) {
                  var n = ga(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (Iu(
                    l,
                    u,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, ne(l, a.onShare)) : ia(l.child, !1)), t.delete(u), t.size === 0) break;
                }
              }
            }
            Ef(l);
          }
          l = l.sibling;
        }
    }
  }
  function zf(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = ha(t, l.stateNode), u = Rt !== null ? Rt.get(a) : void 0, e = ga(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Iu(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, Rt.delete(a), ne(l, t.onShare)) : ne(l, t.onExit) : ia(l.child, !1)), Rt !== null && Ef(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        zf(l), l = l.sibling;
    else
      Rt !== null && Ef(l);
  }
  function Sd(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = ha(t, l.stateNode);
        t = ga(t.default, t.update), l.flags &= -5, t !== "none" && Iu(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && Sd(l);
      l = l.sibling;
    }
  }
  function _f(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, ia(l.child, !1));
          }
          _f(l);
        }
        l = l.sibling;
      }
  }
  function ri(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, ia(l.child, !1), _f(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        ri(l), l = l.sibling;
    else _f(l);
  }
  function bd(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? ia(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && bd(l), l = l.sibling;
  }
  function Of(l, t, a, u, e, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && St < n.length) {
          var r = n[St], g = ao(f);
          (r.view || g.view) && (c = !0);
          var z;
          if (z = (l.flags & 4) === 0)
            if (g.clip) z = !0;
            else {
              z = r.rect;
              var d = g.rect;
              z = z.y !== d.y || z.x !== d.x || z.height !== d.height || z.width !== d.width;
            }
          z && (l.flags |= 4), g.abs ? g = !r.abs : (r = r.rect, g = g.rect, g = r.height !== g.height || r.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && hm(
          f,
          St === 0 ? a : a + "_" + St,
          e
        ), c && (l.flags & 4) !== 0 || (na === null && (na = []), na.push(
          f,
          St === 0 ? u : u + "_" + St,
          t.memoizedProps
        )), St++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : Of(
        l,
        t.child,
        a,
        u,
        e,
        n,
        i
      ) && (c = !0));
      t = t.sibling;
    }
    return c;
  }
  function Td(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, u = l.stateNode, e = ha(a, u), n = ga(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, u = l;
        var c = l.child;
        St = 0, e = Of(
          u,
          c,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && ne(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && Td(l);
      l = l.sibling;
    }
  }
  var wl = !1, dl = !1, ca = !1, Nf = !1, Ed = typeof WeakSet == "function" ? WeakSet : Set, $l = null, fa = !1, Fe = !1, vi = !1, Af = !1;
  function Zv(l, t, a) {
    if (l = l.containerInfo, If = ye, l = Ns(l), dc(l)) {
      if ("selectionStart" in l)
        var u = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          u = (u = l.ownerDocument) && u.defaultView || window;
          var e = u.getSelection && u.getSelection();
          if (e && e.rangeCount !== 0) {
            u = e.anchorNode;
            var n = e.anchorOffset, i = e.focusNode;
            e = e.focusOffset;
            try {
              u.nodeType, i.nodeType;
            } catch {
              u = null;
              break l;
            }
            var c = 0, f = -1, r = -1, g = 0, z = 0, d = l, y = null;
            t: for (; ; ) {
              for (var O; d !== u || n !== 0 && d.nodeType !== 3 || (f = c + n), d !== i || e !== 0 && d.nodeType !== 3 || (r = c + e), d.nodeType === 3 && (c += d.nodeValue.length), (O = d.firstChild) !== null; )
                y = d, d = O;
              for (; ; ) {
                if (d === l) break t;
                if (y === u && ++g === n && (f = c), y === i && ++z === e && (r = c), (O = d.nextSibling) !== null) break;
                d = y, y = d.parentNode;
              }
              d = O;
            }
            u = f === -1 || r === -1 ? null : { start: f, end: r };
          } else u = null;
        }
      u = u || { start: 0, end: 0 };
    } else u = null;
    for (kf = { focusedElem: l, selectionRange: u }, ye = !1, a = (a & 335544064) === a, $l = t, t = a ? 9270 : 1024; $l !== null; ) {
      if (l = $l, a && (u = l.deletions, u !== null))
        for (n = 0; n < u.length; n++)
          a && zf(u[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && yd(l), yi(a);
      else {
        if (l.tag === 22) {
          if (u = l.alternate, l.memoizedState !== null) {
            u !== null && u.memoizedState === null && a && zf(u), yi(a);
            continue;
          } else if (u !== null && u.memoizedState !== null) {
            a && yd(l), yi(a);
            continue;
          }
        }
        u = l.child, (l.subtreeFlags & t) !== 0 && u !== null ? (u.return = l, $l = u) : (a && Sd(l), yi(a));
      }
    }
    Rt = null;
  }
  function yi(l) {
    for (; $l !== null; ) {
      var t = $l, a = l, u = t.alternate, e = t.flags;
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((e & 1024) !== 0 && u !== null) {
            a = void 0, e = u.memoizedProps, u = u.memoizedState;
            var n = t.stateNode;
            try {
              var i = Eu(
                t.type,
                e
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                u
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              hl(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (u = t.stateNode.containerInfo, a = u.nodeType, a === 9)
              no(u);
            else if (a === 1)
              switch (u.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  no(u);
                  break;
                default:
                  u.textContent = "";
              }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          a && u !== null && (a = ha(
            u.memoizedProps,
            u.stateNode
          ), e = t.memoizedProps, e = ga(e.default, e.update), e !== "none" && Iu(
            u,
            a,
            e,
            u.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((e & 1024) !== 0) throw Error(h(163));
      }
      if (u = t.sibling, u !== null) {
        u.return = t.return, $l = u;
        break;
      }
      $l = t.return;
    }
  }
  function zd(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        oa(l, a), u & 4 && we(5, a);
        break;
      case 1:
        if (oa(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              hl(a, a.return, i);
            }
          else {
            var e = Eu(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              l.componentDidUpdate(
                e,
                t,
                l.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              hl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && sd(a), u & 512 && ea(a, a.return);
        break;
      case 3:
        if (oa(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
          if (t = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            Ps(l, t);
          } catch (i) {
            hl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && vd(a);
      case 26:
      case 5:
        oa(l, a), t === null && u & 4 && hf(a), u & 512 && ea(a, a.return);
        break;
      case 12:
        oa(l, a);
        break;
      case 31:
        oa(l, a), u & 4 && Ad(l, a);
        break;
      case 13:
        oa(l, a), u & 4 && Dd(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = ly.bind(
          null,
          a
        ), xy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || wl, !u) {
          var n = t !== null && t.memoizedState !== null || dl;
          t = wl, e = dl, wl = u, (dl = n) && !e ? (u = 2, (a.subtreeFlags & 8772) !== 0 && (u |= 1), It(
            l,
            a,
            u
          )) : oa(l, a), wl = t, dl = e;
        }
        break;
      case 30:
        oa(l, a), u & 512 && ea(a, a.return);
        break;
      case 7:
        u & 512 && ea(a, a.return);
      default:
        oa(l, a);
    }
  }
  function Df(l, t) {
    for (l = l.child; l !== null; )
      _d(l, t), l = l.sibling;
  }
  function _d(l, t) {
    switch (l.tag) {
      case 5:
      case 26:
        try {
          var a = l.stateNode;
          if (t) {
            var u = a.style;
            typeof u.setProperty == "function" ? u.setProperty("display", "none", "important") : u.display = "none";
          } else {
            var e = l.stateNode, n = l.memoizedProps.style, i = n != null && n.hasOwnProperty("display") ? n.display : null;
            e.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (f) {
          hl(l, l.return, f);
        }
        Mf(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, cl = !0;
        } catch (f) {
          hl(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? ym(c, !0) : ym(l.stateNode, !1);
        } catch (f) {
          hl(l, l.return, f);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Df(l, t);
        break;
      default:
        Df(l, t);
    }
  }
  function Mf(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, u = t;
          switch (a.tag) {
            case 4:
              _d(a, u);
              break l;
            case 22:
              a.memoizedState === null && Mf(a, u);
              break l;
            default:
              Mf(a, u);
          }
        }
        l = l.sibling;
      }
  }
  function Od(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, Od(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && Tn(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Dl = null, bt = !1;
  function Ft(l, t, a) {
    for (a = a.child; a !== null; )
      Nd(l, t, a), a = a.sibling;
  }
  function Nd(l, t, a) {
    if (At && typeof At.onCommitFiberUnmount == "function")
      try {
        At.onCommitFiberUnmount(Se, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        dl || lt(a, t), Ft(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !dl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        dl || lt(a, t), $e(a);
        var u = Dl, e = bt;
        Wa(a.type) && (Dl = a.stateNode, bt = !1), Ft(
          l,
          t,
          a
        ), Cm(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Dl = u, bt = e;
        break;
      case 5:
        dl || lt(a, t), $e(a);
      case 6:
        if (a.tag === 6 && $e(a), u = Dl, e = bt, Dl = null, Ft(
          l,
          t,
          a
        ), Dl = u, bt = e, Dl !== null)
          if (bt)
            try {
              (Dl.nodeType === 9 ? Dl.body : Dl.nodeName === "HTML" ? Dl.ownerDocument.body : Dl).removeChild(a.stateNode), cl = !0;
            } catch (n) {
              hl(
                a,
                t,
                n
              );
            }
          else
            try {
              Dl.removeChild(a.stateNode), cl = !0;
            } catch (n) {
              hl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Dl !== null && (bt ? (l = Dl, vm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), he(l)) : vm(Dl, a.stateNode));
        break;
      case 4:
        u = Dl, e = bt, Dl = a.stateNode.containerInfo, bt = !0, Ft(
          l,
          t,
          a
        ), Dl = u, bt = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Va(2, a, t), dl || Va(4, a, t), Ft(
          l,
          t,
          a
        );
        break;
      case 1:
        dl || (lt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && dd(
          a,
          t,
          u
        )), Ft(
          l,
          t,
          a
        );
        break;
      case 21:
        Ft(
          l,
          t,
          a
        );
        break;
      case 22:
        dl = (u = dl) || a.memoizedState !== null, Ft(
          l,
          t,
          a
        ), dl = u;
        break;
      case 30:
        lt(a, t), Ft(
          l,
          t,
          a
        );
        break;
      case 7:
        dl || lt(a, t), Ft(
          l,
          t,
          a
        );
        break;
      default:
        Ft(
          l,
          t,
          a
        );
    }
  }
  function Ad(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        he(l);
      } catch (a) {
        hl(t, t.return, a);
      }
    }
  }
  function Dd(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        he(l);
      } catch (a) {
        hl(t, t.return, a);
      }
  }
  function Vv(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new Ed()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new Ed()), t;
      default:
        throw Error(h(435, l.tag));
    }
  }
  function hi(l, t) {
    var a = Vv(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = ty.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function dt(l, t, a) {
    var u = t.deletions;
    if (u !== null)
      for (var e = 0; e < u.length; e++) {
        var n = u[e], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Wa(f.type)) {
                Dl = f.stateNode, bt = !1;
                break l;
              }
              break;
            case 5:
              Dl = f.stateNode, bt = !1;
              break l;
            case 3:
            case 4:
              Dl = f.stateNode.containerInfo, bt = !0;
              break l;
          }
          f = f.return;
        }
        if (Dl === null) throw Error(h(160));
        Nd(i, c, n), Dl = null, bt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Md(t, l, a), t = t.sibling;
  }
  var Wt = null;
  function Md(l, t, a) {
    var u = l.alternate, e = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (e & 4 && (u = l.updateQueue, u = u !== null ? u.events : null, u !== null))
          for (var n = 0; n < u.length; n++) {
            var i = u[n];
            i.ref.impl = i.nextImpl;
          }
        dt(t, l, a), mt(l), e & 4 && (Va(3, l, l.return), we(3, l), Va(5, l, l.return));
        break;
      case 1:
        dt(t, l, a), mt(l), e & 512 && (dl || u === null || lt(u, u.return)), e & 64 && wl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Wt, dt(t, l, a), mt(l), e & 512 && (dl || u === null || lt(u, u.return)), e & 4)
          if (e = u !== null ? u.memoizedState : null, a = l.memoizedState, u === null)
            if (a === null)
              if (l.stateNode === null)
                if (wl)
                  l.stateNode = dm(
                    l.type,
                    l.memoizedProps,
                    t.containerInfo,
                    l
                  );
                else {
                  l: {
                    t = l.type, a = l.memoizedProps, e = n.ownerDocument || n;
                    t: switch (t) {
                      case "title":
                        u = e.getElementsByTagName("title")[0], (!u || u[Ee] || u[Wl] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), tt(u, t, a), u[Wl] = l, Kl(u), t = u;
                        break l;
                      case "link":
                        if (n = xm(
                          "link",
                          "href",
                          e
                        ).get(t + (a.href || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (u = n[i], u.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && u.getAttribute("rel") === (a.rel == null ? null : a.rel) && u.getAttribute("title") === (a.title == null ? null : a.title) && u.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        u = e.createElement(t), tt(u, t, a), e.head.appendChild(u);
                        break;
                      case "meta":
                        if (n = xm(
                          "meta",
                          "content",
                          e
                        ).get(t + (a.content || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (u = n[i], u.getAttribute("content") === (a.content == null ? null : "" + a.content) && u.getAttribute("name") === (a.name == null ? null : a.name) && u.getAttribute("property") === (a.property == null ? null : a.property) && u.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && u.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        u = e.createElement(t), tt(u, t, a), e.head.appendChild(u);
                        break;
                      default:
                        throw Error(h(468, t));
                    }
                    u[Wl] = l, Kl(u), t = u;
                  }
                  l.stateNode = t;
                }
              else
                wl || ro(n, l.type, l.stateNode);
            else
              l.stateNode = jm(
                n,
                a,
                l.memoizedProps
              );
          else
            e !== a ? (e === null ? (t = u.stateNode, t === null || dl || t.parentNode.removeChild(t)) : e.count--, a === null ? wl || ro(n, l.type, l.stateNode) : jm(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && gf(
              l,
              l.memoizedProps,
              u.memoizedProps
            );
        break;
      case 27:
        dt(t, l, a), mt(l), e & 512 && (dl || u === null || lt(u, u.return)), u !== null && e & 4 && gf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = ca, ca = !1, dt(t, l, a), ca = n, mt(l), e & 512 && (dl || u === null || lt(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Hu(t, ""), cl = !0;
          } catch (g) {
            hl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, gf(
          l,
          t,
          u !== null ? u.memoizedProps : t
        )), e & 1024 && (Nf = !0);
        break;
      case 6:
        if (dt(t, l, a), mt(l), e & 4) {
          if (l.stateNode === null)
            throw Error(h(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, cl = !0;
          } catch (g) {
            hl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (cl = !1, Ri = null, n = Wt, Wt = en(t.containerInfo), dt(t, l, a), Wt = n, mt(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            he(t.containerInfo);
          } catch (g) {
            hl(l, l.return, g);
          }
        Nf && (Nf = !1, Cd(l)), cl = !1;
        break;
      case 4:
        e = ca, ca = wl, u = Fo(), n = Wt, Wt = en(
          l.stateNode.containerInfo
        ), dt(t, l, a), mt(l), Wt = n, cl && Fe && (vi = !0), cl = u, ca = e;
        break;
      case 12:
        dt(t, l, a), mt(l);
        break;
      case 31:
        dt(t, l, a), mt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, hi(l, t)));
        break;
      case 13:
        dt(t, l, a), mt(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (bi = Nt()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, hi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = wl, f = dl, r = ca;
        wl = c || n, ca = r || n, dl = f || i, dt(t, l, a), dl = f, ca = r, wl = c, mt(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || wl || dl || (t = i || dl, a = wl, u = dl, wl = n || wl, dl = t, La(l, 2), wl = a, dl = u), !n && ca || Df(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, hi(l, a))));
        break;
      case 19:
        dt(t, l, a), mt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, hi(l, t)));
        break;
      case 30:
        e & 512 && (dl || u === null || lt(u, u.return)), e = Fo(), n = Fe, i = (a & 335544064) === a, c = l.memoizedProps, Fe = i && ga(
          c.default,
          c.update
        ) !== "none", dt(t, l, a), mt(l), i && u !== null && cl && (l.flags |= 4), Fe = n, cl = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (dl || u === null || lt(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        dt(t, l, a), mt(l);
    }
  }
  function mt(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (rd(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        u = null;
        for (var e = l.return; e !== null; ) {
          if (yf(e)) {
            var n = e.stateNode;
            u === null ? u = [n] : u.push(n);
          }
          if (vf(e)) break;
          e = e.return;
        }
        var i = u;
        if (a == null) throw Error(h(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = Sf(l);
            si(
              l,
              f,
              c,
              i
            );
            break;
          case 5:
            var r = a.stateNode;
            a.flags & 32 && (Hu(r, ""), a.flags &= -33);
            var g = Sf(l);
            si(
              l,
              g,
              r,
              i
            );
            break;
          case 3:
          case 4:
            var z = a.stateNode.containerInfo, d = Sf(l);
            bf(
              l,
              d,
              z,
              i
            );
            break;
          default:
            throw Error(h(161));
        }
      } catch (y) {
        hl(l, l.return, y);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Cd(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Cd(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, ye = !0, t.reset(), ye = !1), l = l.sibling;
      }
  }
  function ku(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Ud(t, l), t = t.sibling;
    else Td(t);
  }
  function Ud(l, t) {
    var a = l.alternate;
    if (a === null) Tf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Af = fa = !1, hd(), ku(t, l), !fa && !vi) {
            if (l = na, l !== null)
              for (var u = 0; u < l.length; u += 3) {
                a = l[u];
                var e = l[u + 1];
                gm(a, l[u + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + e + ")"
                  }
                );
              }
            l = t.containerInfo, l = l.nodeType === 9 ? l.documentElement : l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "" && (l.style.viewTransitionName = "none", l.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), l.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            )), Af = !0;
          }
          na = null;
          break;
        case 5:
          ku(t, l);
          break;
        case 4:
          u = fa, fa = !1, ku(t, l), fa && (vi = !0), fa = u;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? Tf(l, !1) : ku(t, l));
          break;
        case 30:
          u = fa, e = hd(), fa = !1, ku(t, l), fa && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ha(n, i), i = ha(a.memoizedProps, i);
          var c = ga(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, St = 0, t = Of(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), St !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (ne(
            l,
            l.memoizedProps.onUpdate
          ), na = e) : e !== null && (e.push.apply(e, na), na = e), fa = (l.flags & 32) !== 0 ? !0 : u;
          break;
        default:
          ku(t, l);
      }
  }
  function oa(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        zd(l, t.alternate, t), t = t.sibling;
  }
  function La(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, u = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Va(4, a, a.return), La(
            a,
            u
          );
          break;
        case 1:
          lt(a, a.return);
          var e = a.stateNode;
          typeof e.componentWillUnmount == "function" && dd(
            a,
            a.return,
            e
          ), La(
            a,
            u
          );
          break;
        case 27:
          (u & 2) !== 0 && Cm(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          lt(a, a.return), a.tag !== 5 && a.tag !== 27 || $e(a), La(
            a,
            u
          );
          break;
        case 6:
          $e(a);
          break;
        case 26:
          lt(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || dl || e.parentNode.removeChild(e), La(
            a,
            u
          );
          break;
        case 22:
          a.memoizedState === null && La(
            a,
            u
          );
          break;
        case 30:
          lt(a, a.return), La(
            a,
            u
          );
          break;
        case 7:
          lt(a, a.return);
        default:
          La(
            a,
            u
          );
      }
      l = l.sibling;
    }
  }
  function It(l, t, a) {
    for (a = (t.subtreeFlags & 8772) !== 0 ? a : a & -2, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          It(
            e,
            n,
            a
          ), we(4, n);
          break;
        case 1:
          if (It(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (g) {
              hl(u, u.return, g);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var r = e.shared.hiddenCallbacks;
              if (r !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < r.length; e++)
                  ks(r[e], f);
            } catch (g) {
              hl(u, u.return, g);
            }
          }
          c && i & 64 && sd(n), ea(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && vd(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || md(n), It(
            e,
            n,
            a
          ), c && u === null && i & 4 && hf(n), ea(n, n.return);
          break;
        case 6:
          md(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || wl || ro(
            en(f.ownerDocument),
            n.type,
            f
          ), It(
            e,
            n,
            a
          ), c && u === null && i & 4 && hf(n), ea(n, n.return);
          break;
        case 12:
          It(
            e,
            n,
            a
          );
          break;
        case 31:
          It(
            e,
            n,
            a
          ), c && i & 4 && Ad(e, n);
          break;
        case 13:
          It(
            e,
            n,
            a
          ), c && i & 4 && Dd(e, n);
          break;
        case 22:
          n.memoizedState === null && It(
            e,
            n,
            a
          ), ea(n, n.return);
          break;
        case 30:
          It(
            e,
            n,
            a
          ), ea(n, n.return);
          break;
        case 7:
          ea(n, n.return);
        default:
          It(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Cf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && je(a));
  }
  function Uf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && je(l));
  }
  function Vt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Rd(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && bd(t);
  }
  function Rd(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && ri(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Vt(
          l,
          t,
          a,
          u
        ), n & 2048 && we(9, t);
        break;
      case 1:
        Vt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Vt(
          l,
          t,
          a,
          u
        ), e && Af && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && je(n)));
        break;
      case 12:
        if (n & 2048) {
          Vt(
            l,
            t,
            a,
            u
          ), n = t.stateNode;
          try {
            var i = t.memoizedProps, c = i.id, f = i.onPostCommit;
            typeof f == "function" && f(
              c,
              t.alternate === null ? "mount" : "update",
              n.passiveEffectDuration,
              -0
            );
          } catch (r) {
            hl(t, t.return, r);
          }
        } else
          Vt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Vt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Vt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && ri(c), i._visibility & 2 ? Vt(
          l,
          t,
          a,
          u
        ) : We(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && ri(t), i._visibility & 2 ? Vt(
          l,
          t,
          a,
          u
        ) : (i._visibility |= 2, Pu(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Cf(c, t);
        break;
      case 24:
        Vt(
          l,
          t,
          a,
          u
        ), n & 2048 && Uf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (ia(n.child, !0), ia(t.child, !0))), Vt(
          l,
          t,
          a,
          u
        );
        break;
      default:
        Vt(
          l,
          t,
          a,
          u
        );
    }
  }
  function Pu(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, f = u, r = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          Pu(
            n,
            i,
            c,
            f,
            e
          ), we(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? Pu(
            n,
            i,
            c,
            f,
            e
          ) : We(
            n,
            i
          ) : (g._visibility |= 2, Pu(
            n,
            i,
            c,
            f,
            e
          )), e && r & 2048 && Cf(
            i.alternate,
            i
          );
          break;
        case 24:
          Pu(
            n,
            i,
            c,
            f,
            e
          ), e && r & 2048 && Uf(i.alternate, i);
          break;
        default:
          Pu(
            n,
            i,
            c,
            f,
            e
          );
      }
      t = t.sibling;
    }
  }
  function We(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            We(a, u), e & 2048 && Cf(
              u.alternate,
              u
            );
            break;
          case 24:
            We(a, u), e & 2048 && Uf(u.alternate, u);
            break;
          default:
            We(a, u);
        }
        t = t.sibling;
      }
  }
  var zu = 8192;
  function _u(l, t, a) {
    if (l.subtreeFlags & zu)
      for (l = l.child; l !== null; )
        pd(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function pd(l, t, a) {
    switch (l.tag) {
      case 26:
        _u(
          l,
          t,
          a
        ), l.flags & zu && (l.memoizedState !== null ? Fy(
          a,
          Wt,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && Gm(a, l)));
        break;
      case 5:
        _u(
          l,
          t,
          a
        ), l.flags & zu && (l = l.stateNode, (t & 335544128) === t && Gm(a, l));
        break;
      case 3:
      case 4:
        var u = Wt;
        Wt = en(l.stateNode.containerInfo), _u(
          l,
          t,
          a
        ), Wt = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = zu, zu = 16777216, _u(
          l,
          t,
          a
        ), zu = u) : _u(
          l,
          t,
          a
        ));
        break;
      case 30:
        if ((l.flags & zu) !== 0 && (u = l.memoizedProps.name, u != null && u !== "auto")) {
          var e = l.stateNode;
          e.paired = null, Rt === null && (Rt = /* @__PURE__ */ new Map()), Rt.set(u, e);
        }
        _u(
          l,
          t,
          a
        );
        break;
      default:
        _u(
          l,
          t,
          a
        );
    }
  }
  function Hd(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Ie(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          $l = u, xd(
            u,
            l
          );
        }
      Hd(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        jd(l), l = l.sibling;
  }
  function jd(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Ie(l), l.flags & 2048 && Va(9, l, l.return);
        break;
      case 3:
        Ie(l);
        break;
      case 12:
        Ie(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, gi(l)) : Ie(l);
        break;
      default:
        Ie(l);
    }
  }
  function gi(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          $l = u, xd(
            u,
            l
          );
        }
      Hd(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          Va(8, t, t.return), gi(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, gi(t));
          break;
        default:
          gi(t);
      }
      l = l.sibling;
    }
  }
  function xd(l, t) {
    for (; $l !== null; ) {
      var a = $l;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Va(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          je(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, $l = u;
      else
        l: for (a = l; $l !== null; ) {
          u = $l;
          var e = u.sibling, n = u.return;
          if (Od(u), u === a) {
            $l = null;
            break l;
          }
          if (e !== null) {
            e.return = n, $l = e;
            break l;
          }
          $l = n;
        }
    }
  }
  var Lv = {
    getCacheForType: function(l) {
      var t = Il(Yl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Il(Yl).controller.signal;
    }
  }, Kv = typeof WeakMap == "function" ? WeakMap : Map, ol = 0, Tl = null, F = null, k = 0, yl = 0, pt = null, Ka = !1, le = !1, Rf = !1, Aa = 0, pl = 0, Ja = 0, Ou = 0, Si = 0, Ht = 0, te = 0, ke = null, Tt = null, pf = !1, bi = 0, Bd = 0, Ti = 1 / 0, Ei = null, wa = null, Cl = 0, kt = null, Nu = null, sa = 0, Hf = 0, jf = null, qd = null, ae = null, ue = null, ee = null, Pe = 0, zi = null;
  function jt() {
    return (ol & 2) !== 0 && k !== 0 ? k & -k : U.T !== null ? Lf() : Xo();
  }
  function Yd() {
    if (Ht === 0)
      if ((k & 536870912) === 0 || w) {
        var l = hn;
        hn <<= 1, (hn & 3932160) === 0 && (hn = 262144), Ht = l;
      } else Ht = 536870912;
    return l = kl.current, l !== null && (l.flags |= 32), Ht;
  }
  function ne(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = Sm(
        ha(l.memoizedProps, a)
      )), ue === null && (ue = []), ue.push(t.bind(null, u));
    }
  }
  function Et(l, t, a) {
    (l === Tl && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null) && (ie(l, 0), $a(
      l,
      k,
      Ht,
      !1
    )), Te(l, a), ((ol & 2) === 0 || l !== Tl) && (l === Tl && ((ol & 2) === 0 && (Ou |= a), pl === 4 && $a(
      l,
      k,
      Ht,
      !1
    )), da(l));
  }
  function Gd(l, t, a) {
    if ((ol & 6) !== 0) throw Error(h(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || be(l, t), e = u ? $v(l, t) : Bf(l, t, !0), n = u;
    do {
      if (e === 0) {
        le && !u && $a(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Jv(a)) {
          e = Bf(l, t, !1), n = !1;
          continue;
        }
        if (e === 2) {
          if (n = t, l.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = l.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            t = i;
            l: {
              var c = l;
              e = ke;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (ie(c, i).flags |= 256), i = Bf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Rf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Ou |= n, e = 4;
                  break l;
                }
                n = Tt, Tt = e, n !== null && (Tt === null ? Tt = n : Tt.push.apply(
                  Tt,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          ie(l, 0), $a(l, t, 0, !0);
          break;
        }
        l: {
          switch (u = l, n = e, n) {
            case 0:
            case 1:
              throw Error(h(345));
            case 4:
              if ((t & 4194048) !== t && (t & 62914560) !== t)
                break;
            case 6:
              $a(
                u,
                t,
                Ht,
                !Ka
              );
              break l;
            case 2:
              Tt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(h(329));
          }
          if ((t & 62914560) === t && (e = bi + 300 - Nt(), 10 < e)) {
            if ($a(
              u,
              t,
              Ht,
              !Ka
            ), Sn(u, 0, !0) !== 0) break l;
            sa = t, u.timeoutHandle = to(
              Xd.bind(
                null,
                u,
                a,
                Tt,
                Ei,
                pf,
                t,
                Ht,
                Ou,
                te,
                Ka,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          Xd(
            u,
            a,
            Tt,
            Ei,
            pf,
            t,
            Ht,
            Ou,
            te,
            Ka,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    da(l);
  }
  function Xd(l, t, a, u, e, n, i, c, f, r, g, z, d, y) {
    l.timeoutHandle = -1;
    var O = t.subtreeFlags, C = (n & 335544064) === n;
    if (z = null, (C || O & 8192 || (O & 16785408) === 16785408) && (z = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: ta
    }, Rt = null, pd(
      t,
      n,
      z
    ), C && (O = z, C = l.containerInfo, C = (C.nodeType === 9 ? C : C.ownerDocument).__reactViewTransition, C != null && (O.count++, O.waitingForViewTransition = !0, O = fn.bind(O), C.finished.then(O, O))), O = (n & 62914560) === n ? bi - Nt() : (n & 4194048) === n ? Bd - Nt() : 0, O = Wy(
      z,
      O
    ), O !== null)) {
      sa = n, l.cancelPendingCommit = O(
        $d.bind(
          null,
          l,
          t,
          n,
          a,
          u,
          e,
          i,
          c,
          f,
          r,
          g,
          z,
          null,
          d,
          y
        )
      ), $a(l, n, i, !r);
      return;
    }
    $d(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      c,
      f,
      r,
      g,
      z
    );
  }
  function Jv(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!Ct(n(), e)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = t.child, t.subtreeFlags & 16384 && a !== null)
        a.return = t, t = a;
      else {
        if (t === l) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function $a(l, t, a, u) {
    t = xo(l, t), t &= ~Si, t &= ~Ou, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - Dt(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && qo(l, a, t);
  }
  function _i() {
    return (ol & 6) === 0 ? (ln(0), !1) : !0;
  }
  function xf() {
    if (F !== null) {
      if (yl === 0)
        var l = F.return;
      else
        l = F, Ta = mu = null, Zc(l), Ju = null, qe = 0, l = F;
      for (; l !== null; )
        od(l.alternate, l), l = l.return;
      F = null;
    }
  }
  function ie(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, hy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), sa = 0, xf(), Tl = l, F = a = Sa(l.current, null), k = t, yl = 0, pt = null, Ka = !1, le = be(l, t), Rf = !1, te = Ht = Si = Ou = Ja = pl = 0, Tt = ke = null, pf = !1, Aa = xo(l, t), Rn(), a;
  }
  function Qd(l, t) {
    Z = null, U.H = ai, t === Ku || t === Zn ? (t = $s(), yl = 3) : t === Cc ? (t = $s(), yl = 4) : yl = t === uf ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, pt = t, F === null && (pl = 1, ui(
      l,
      Gt(t, l.current)
    ));
  }
  function Zd() {
    var l = kl.current;
    return l === null ? !0 : (k & 4194048) === k ? it === null : (k & 62914560) === k || (k & 536870912) !== 0 ? l === it : !1;
  }
  function Vd() {
    var l = U.H;
    return U.H = ai, l === null ? ai : l;
  }
  function Ld() {
    var l = U.A;
    return U.A = Lv, l;
  }
  function Oi() {
    pl = 4, Ka || (k & 4194048) !== k && kl.current !== null || (le = !0), (Ja & 134217727) === 0 && (Ou & 134217727) === 0 || Tl === null || $a(
      Tl,
      k,
      Ht,
      !1
    );
  }
  function Bf(l, t, a) {
    var u = ol;
    ol |= 2;
    var e = Vd(), n = Ld();
    (Tl !== l || k !== t) && (Ei = null, ie(l, t)), t = !1;
    var i = pl;
    l: do
      try {
        if (yl !== 0 && F !== null) {
          var c = F, f = pt;
          switch (yl) {
            case 8:
              xf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              kl.current === null && (t = !0);
              var r = yl;
              if (yl = 0, pt = null, ce(l, c, f, r), a && le) {
                i = 0;
                break l;
              }
              break;
            default:
              r = yl, yl = 0, pt = null, ce(l, c, f, r);
          }
        }
        wv(), i = pl;
        break;
      } catch (g) {
        Qd(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Ta = mu = null, ol = u, U.H = e, U.A = n, F === null && (Tl = null, k = 0, Rn()), i;
  }
  function wv() {
    for (; F !== null; ) Kd(F);
  }
  function $v(l, t) {
    var a = ol;
    ol |= 2;
    var u = Vd(), e = Ld();
    Tl !== l || k !== t ? (Ei = null, Ti = Nt() + 500, ie(l, t)) : le = be(
      l,
      t
    );
    l: do
      try {
        if (yl !== 0 && F !== null) {
          t = F;
          var n = pt;
          t: switch (yl) {
            case 1:
              yl = 0, pt = null, ce(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Js(n)) {
                yl = 0, pt = null, Jd(t);
                break;
              }
              t = function() {
                yl !== 2 && yl !== 9 || Tl !== l || (yl = 7), da(l);
              }, n.then(t, t);
              break l;
            case 3:
              yl = 7;
              break l;
            case 4:
              yl = 5;
              break l;
            case 7:
              Js(n) ? (yl = 0, pt = null, Jd(t)) : (yl = 0, pt = null, ce(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (F.tag) {
                case 26:
                  i = F.memoizedState;
                case 5:
                case 27:
                  var c = F;
                  if (i ? qm(i) : c.stateNode.complete) {
                    yl = 0, pt = null;
                    var f = c.sibling;
                    if (f !== null) F = f;
                    else {
                      var r = c.return;
                      r !== null ? (F = r, Ni(r)) : F = null;
                    }
                    break t;
                  }
              }
              yl = 0, pt = null, ce(l, t, n, 5);
              break;
            case 6:
              yl = 0, pt = null, ce(l, t, n, 6);
              break;
            case 8:
              xf(), pl = 6;
              break l;
            default:
              throw Error(h(462));
          }
        }
        Fv();
        break;
      } catch (g) {
        Qd(l, g);
      }
    while (!0);
    return Ta = mu = null, U.H = u, U.A = e, ol = a, F !== null ? 0 : (Tl = null, k = 0, Rn(), pl);
  }
  function Fv() {
    for (; F !== null && !mr(); )
      Kd(F);
  }
  function Kd(l) {
    var t = cd(l.alternate, l, Aa);
    l.memoizedProps = l.pendingProps, t === null ? Ni(l) : F = t;
  }
  function Jd(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = ld(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          k
        );
        break;
      case 11:
        t = ld(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          k
        );
        break;
      case 5:
        Zc(t);
        var u = t;
        u === Jl && (w ? (qn(u), u.tag === 5 && u.stateNode != null && (zl = u.stateNode)) : (qn(u), w = !0));
      default:
        od(a, t), t = F = xs(t, Aa), t = cd(a, t, Aa);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ni(l) : F = t;
  }
  function ce(l, t, a, u) {
    Ta = mu = null, Zc(t), Ju = null, qe = 0;
    var e = t.return;
    try {
      if (Bv(
        l,
        e,
        t,
        a,
        k
      )) {
        pl = 1, ui(
          l,
          Gt(a, l.current)
        ), F = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw F = e, n;
      pl = 1, ui(
        l,
        Gt(a, l.current)
      ), F = null;
      return;
    }
    t.flags & 32768 ? (w || u === 1 ? l = !0 : le || (k & 536870912) !== 0 ? l = !1 : (Ka = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = kl.current, u !== null && u.tag === 13 && (u.flags |= 16384))), wd(t, l)) : Ni(t);
  }
  function Ni(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        wd(
          t,
          Ka
        );
        return;
      }
      l = t.return;
      var a = Xv(
        t.alternate,
        t,
        Aa
      );
      if (a !== null) {
        F = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        F = t;
        return;
      }
      F = t = l;
    } while (t !== null);
    pl === 0 && (pl = 5);
  }
  function wd(l, t) {
    do {
      var a = Qv(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, F = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        F = l;
        return;
      }
      F = l = a;
    } while (l !== null);
    pl = 6, F = null;
  }
  function $d(l, t, a, u, e, n, i, c, f, r, g, z) {
    l.cancelPendingCommit = null;
    do
      Ai();
    while (Cl !== 0);
    if ((ol & 6) !== 0) throw Error(h(327));
    if (t !== null) {
      if (t === l.current) throw Error(h(177));
      l === Tl && (F = Tl = null, k = 0), Nu = t, kt = l, sa = a, jf = e, qd = u, Wv(
        l,
        t,
        a,
        i,
        c,
        f,
        z
      );
    }
  }
  function Wv(l, t, a, u, e, n, i) {
    var c = t.lanes | t.childLanes;
    if (Hf = c, c |= hc, zr(
      l,
      a,
      c,
      u,
      e,
      n
    ), ue = null, (a & 335544064) === a ? (ee = Ov(l), u = 10262) : (ee = null, u = 10256), (t.subtreeFlags & u) !== 0 || (t.flags & u) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ay(vn, function() {
      return Xf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), di = !1, u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
      u = U.T, U.T = null, e = Y.p, Y.p = 2, n = ol, ol |= 4;
      try {
        Zv(l, t, a);
      } finally {
        ol = n, Y.p = e, U.T = u;
      }
    }
    Cl = 1, di ? ae = zy(
      i,
      l.containerInfo,
      ee,
      qf,
      Yf,
      kv,
      Gf,
      Xf,
      Iv
    ) : (qf(), Yf(), Gf());
  }
  function Iv(l) {
    if (Cl !== 0) {
      var t = kt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function kv() {
    Cl === 3 && (Cl = 0, Ud(Nu, kt), Cl = 4);
  }
  function qf() {
    if (Cl === 1) {
      Cl = 0;
      var l = kt, t = Nu, a = sa, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = U.T, U.T = null;
        var e = Y.p;
        Y.p = 2;
        var n = ol;
        ol |= 4;
        try {
          Fe = vi = !1, Md(t, l, a), a = kf;
          var i = Ns(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Os(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && dc(c)) {
              var r = f.start, g = f.end;
              if (g === void 0 && (g = r), "selectionStart" in c)
                c.selectionStart = r, c.selectionEnd = Math.min(
                  g,
                  c.value.length
                );
              else {
                var z = c.ownerDocument || document, d = z && z.defaultView || window;
                if (d.getSelection) {
                  var y = d.getSelection(), O = c.textContent.length, C = Math.min(f.start, O), V = f.end === void 0 ? C : Math.min(f.end, O);
                  !y.extend && C > V && (i = V, V = C, C = i);
                  var m = _s(
                    c,
                    C
                  ), o = _s(
                    c,
                    V
                  );
                  if (m && o && (y.rangeCount !== 1 || y.anchorNode !== m.node || y.anchorOffset !== m.offset || y.focusNode !== o.node || y.focusOffset !== o.offset)) {
                    var v = z.createRange();
                    v.setStart(m.node, m.offset), y.removeAllRanges(), C > V ? (y.addRange(v), y.extend(o.node, o.offset)) : (v.setEnd(o.node, o.offset), y.addRange(v));
                  }
                }
              }
            }
            for (z = [], y = c; y = y.parentNode; )
              y.nodeType === 1 && z.push({
                element: y,
                left: y.scrollLeft,
                top: y.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < z.length; c++) {
              var E = z[c];
              E.element.scrollLeft = E.left, E.element.scrollTop = E.top;
            }
          }
          ye = !!If, kf = If = null;
        } finally {
          ol = n, Y.p = e, U.T = u;
        }
      }
      l.current = t, Cl = 2;
    }
  }
  function Yf() {
    if (Cl === 2) {
      Cl = 0;
      var l = kt, t = Nu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = U.T, U.T = null;
        var u = Y.p;
        Y.p = 2;
        var e = ol;
        ol |= 4;
        try {
          zd(l, t.alternate, t);
        } finally {
          ol = e, Y.p = u, U.T = a;
        }
      }
      Cl = 3;
    }
  }
  function Gf() {
    if (Cl === 4 || Cl === 3) {
      Cl = 0;
      var l = ae;
      ae = null, rr();
      var t = kt, a = Nu, u = sa, e = qd, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Cl = 5 : (Cl = 0, Nu = kt = null, Fd(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (wa = null), wi(u), a = a.stateNode, At && typeof At.onCommitFiberRoot == "function")
        try {
          At.onCommitFiberRoot(
            Se,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (e !== null) {
        a = U.T, n = Y.p, Y.p = 2, U.T = null;
        try {
          for (var i = t.onRecoverableError, c = 0; c < e.length; c++) {
            var f = e[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          U.T = a, Y.p = n;
        }
      }
      if (e = ue, i = ee, ee = null, e !== null && (ue = null, i === null && (i = []), l !== null))
        for (f = 0; f < e.length; f++)
          a = (0, e[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (sa & 3) !== 0 && Ai(), da(t), n = t.pendingLanes, (u & 261930) !== 0 && (n & 42) !== 0 ? t === zi ? Pe++ : (Pe = 0, zi = t) : (Pe = 0, zi = null), ln(0);
    }
  }
  function Fd(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, je(t)));
  }
  function Ai() {
    return ae !== null && (ae.skipTransition(), ae = null), qf(), Yf(), Gf(), Xf();
  }
  function Xf() {
    if (Cl !== 5) return !1;
    var l = kt, t = Hf;
    Hf = 0;
    var a = wi(sa), u = U.T, e = Y.p;
    try {
      Y.p = 32 > a ? 32 : a, U.T = null, a = jf, jf = null;
      var n = kt, i = sa;
      if (Cl = 0, Nu = kt = null, sa = 0, (ol & 6) !== 0) throw Error(h(331));
      var c = ol;
      if (ol |= 4, jd(n.current), Rd(
        n,
        n.current,
        i,
        a
      ), ol = c, ln(0, !1), At && typeof At.onPostCommitFiberRoot == "function")
        try {
          At.onPostCommitFiberRoot(Se, n);
        } catch {
        }
      return !0;
    } finally {
      Y.p = e, U.T = u, Fd(l, t);
    }
  }
  function Wd(l, t, a) {
    t = Gt(a, t), t = af(l.stateNode, t, 2), l = Ga(l, t, 2), l !== null && (Te(l, 2), da(l));
  }
  function hl(l, t, a) {
    if (l.tag === 3)
      Wd(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          Wd(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (wa === null || !wa.has(u))) {
            l = Gt(a, l), a = J0(2), u = Ga(t, a, 2), u !== null && (w0(
              a,
              u,
              t,
              l
            ), Te(u, 2), da(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Qf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new Kv();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (Rf = !0, e.add(a), l = Pv.bind(null, l, t, a), t.then(l, l));
  }
  function Pv(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, Tl === l && (k & a) === a && ((pl === 4 || pl === 3 && (k & 62914560) === k && 300 > Nt() - bi) && (ol & 2) === 0 ? ie(l, 0) : Si |= a, te === k && (te = 0)), da(l);
  }
  function Id(l, t) {
    t === 0 && (t = Bo()), l = ou(l, t), l !== null && (Te(l, t), da(l));
  }
  function ly(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), Id(l, a);
  }
  function ty(l, t) {
    var a = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var u = l.stateNode, e = l.memoizedState;
        e !== null && (a = e.retryLane);
        break;
      case 19:
        u = l.stateNode;
        break;
      case 22:
        u = l.stateNode._retryCache;
        break;
      default:
        throw Error(h(314));
    }
    u !== null && u.delete(t), Id(l, a);
  }
  function ay(l, t) {
    return Vi(l, t);
  }
  var fe = null, oe = null, Zf = !1, Di = !1, Vf = !1, Fa = 0;
  function da(l) {
    l !== oe && l.next === null && (oe === null ? fe = oe = l : oe = oe.next = l), Di = !0, Zf || (Zf = !0, ey());
  }
  function ln(l, t) {
    if (!Vf && Di) {
      Vf = !0;
      do
        for (var a = !1, u = fe; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - Dt(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, tm(u, n));
          } else
            n = k, n = Sn(
              u,
              u === Tl ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || be(u, n) || (a = !0, tm(u, n));
          u = u.next;
        }
      while (a);
      Vf = !1;
    }
  }
  function uy() {
    kd();
  }
  function kd() {
    Di = Zf = !1;
    var l = 0;
    Fa !== 0 && yy() && (l = Fa);
    for (var t = Nt(), a = null, u = fe; u !== null; ) {
      var e = u.next, n = Pd(u, t);
      n === 0 ? (u.next = null, a === null ? fe = e : a.next = e, e === null && (oe = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Di = !0)), u = e;
    }
    Cl !== 0 && Cl !== 5 || ln(l), Fa !== 0 && (Fa = 0);
  }
  function Pd(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Dt(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = Er(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = Tl, a = k, a = Sn(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Li(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || be(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Li(u), wi(a)) {
        case 2:
        case 8:
          a = Ho;
          break;
        case 32:
          a = vn;
          break;
        case 268435456:
          a = jo;
          break;
        default:
          a = vn;
      }
      return u = lm.bind(null, l), a = Vi(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Li(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function lm(l, t) {
    if (Cl !== 0 && Cl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (Ai() && l.callbackNode !== a)
      return null;
    var u = k;
    return u = Sn(
      l,
      l === Tl ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (Gd(l, u, t), Pd(l, Nt()), l.callbackNode != null && l.callbackNode === a ? lm.bind(null, l) : null);
  }
  function tm(l, t) {
    if (Ai()) return null;
    Gd(l, t, !0);
  }
  function ey() {
    gy(function() {
      (ol & 6) !== 0 ? Vi(
        po,
        uy
      ) : kd();
    });
  }
  function Lf() {
    if (Fa === 0) {
      var l = yu;
      l === 0 && (l = yn, yn <<= 1, (yn & 261888) === 0 && (yn = 256)), Fa = l;
    }
    return Fa;
  }
  function am(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : _n(l);
  }
  function ny(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = am(
        (e[ht] || null).action
      ), i = u.submitter;
      i && (t = (t = i[ht] || null) ? am(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new Dn(
        "action",
        "action",
        null,
        u,
        e
      );
      l.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (u.defaultPrevented) {
                if (Fa !== 0) {
                  var f = new FormData(e, i);
                  Ic(
                    a,
                    {
                      pending: !0,
                      data: f,
                      method: e.method,
                      action: n
                    },
                    null,
                    f
                  );
                }
              } else
                typeof n == "function" && (c.preventDefault(), f = new FormData(e, i), Ic(
                  a,
                  {
                    pending: !0,
                    data: f,
                    method: e.method,
                    action: n
                  },
                  n,
                  f
                ));
            },
            currentTarget: e
          }
        ]
      });
    }
  }
  for (var Kf = 0; Kf < yc.length; Kf++) {
    var Jf = yc[Kf], iy = Jf.toLowerCase(), cy = Jf[0].toUpperCase() + Jf.slice(1);
    $t(
      iy,
      "on" + cy
    );
  }
  $t(Ms, "onAnimationEnd"), $t(Cs, "onAnimationIteration"), $t(Us, "onAnimationStart"), $t("dblclick", "onDoubleClick"), $t("focusin", "onFocus"), $t("focusout", "onBlur"), $t(hv, "onTransitionRun"), $t(gv, "onTransitionStart"), $t(Sv, "onTransitionCancel"), $t(Rs, "onTransitionEnd"), Ru("onMouseEnter", ["mouseout", "mouseover"]), Ru("onMouseLeave", ["mouseout", "mouseover"]), Ru("onPointerEnter", ["pointerout", "pointerover"]), Ru("onPointerLeave", ["pointerout", "pointerover"]), iu(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), iu(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), iu("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), iu(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), iu(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), iu(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var tn = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), fy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(tn)
  );
  function um(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var c = u[i], f = c.instance, r = c.currentTarget;
            if (c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = r;
            try {
              n(e);
            } catch (g) {
              Un(g);
            }
            e.currentTarget = null, n = f;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (c = u[i], f = c.instance, r = c.currentTarget, c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = r;
            try {
              n(e);
            } catch (g) {
              Un(g);
            }
            e.currentTarget = null, n = f;
          }
      }
    }
  }
  function W(l, t) {
    var a = t[Zo];
    a === void 0 && (a = t[Zo] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (em(t, l, 2, !1), a.add(u));
  }
  function wf(l, t, a) {
    var u = 0;
    t && (u |= 4), em(
      a,
      l,
      u,
      t
    );
  }
  var Mi = "_reactListening" + Math.random().toString(36).slice(2);
  function $f(l) {
    if (!l[Mi]) {
      l[Mi] = !0, Ko.forEach(function(a) {
        a !== "selectionchange" && (fy.has(a) || wf(a, !1, l), wf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Mi] || (t[Mi] = !0, wf("selectionchange", !1, t));
    }
  }
  function em(l, t, a, u) {
    switch (wm(t)) {
      case 2:
        var e = lh;
        break;
      case 8:
        e = th;
        break;
      default:
        e = yo;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !tc || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function Ff(l, t, a, u, e) {
    var n = u;
    if ((t & 1) === 0 && (t & 2) === 0 && u !== null)
      l: for (; ; ) {
        if (u === null) return;
        var i = u.tag;
        if (i === 3 || i === 4) {
          var c = u.stateNode.containerInfo;
          if (c === e) break;
          if (i === 4)
            for (i = u.return; i !== null; ) {
              var f = i.tag;
              if ((f === 3 || f === 4) && i.stateNode.containerInfo === e)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = nu(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              u = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        u = u.return;
      }
    es(function() {
      var r = n, g = Pi(a), z = [];
      l: {
        var d = ps.get(l);
        if (d !== void 0) {
          var y = Dn, O = l;
          switch (l) {
            case "keypress":
              if (Nn(a) === 0) break l;
            case "keydown":
            case "keyup":
              y = Jr;
              break;
            case "focusin":
              O = "focus", y = nc;
              break;
            case "focusout":
              O = "blur", y = nc;
              break;
            case "beforeblur":
            case "afterblur":
              y = nc;
              break;
            case "click":
              if (a.button === 2) break l;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              y = cs;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              y = jr;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              y = Ir;
              break;
            case Ms:
            case Cs:
            case Us:
              y = qr;
              break;
            case Rs:
              y = Pr;
              break;
            case "scroll":
            case "scrollend":
              y = pr;
              break;
            case "wheel":
              y = tv;
              break;
            case "copy":
            case "cut":
            case "paste":
              y = Gr;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              y = os;
              break;
            case "submit":
              y = Fr;
              break;
            case "toggle":
            case "beforetoggle":
              y = uv;
          }
          var C = (t & 4) !== 0, V = !C && (l === "scroll" || l === "scrollend"), m = C ? d !== null ? d + "Capture" : null : d;
          C = [];
          for (var o = r, v; o !== null; ) {
            var E = o;
            if (v = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || v === null || m === null || (E = _e(o, m), E != null && C.push(
              an(o, E, v)
            )), V) break;
            o = o.return;
          }
          0 < C.length && (d = new y(
            d,
            O,
            null,
            a,
            g
          ), z.push({ event: d, listeners: C }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (y = l === "mouseover" || l === "pointerover", d = l === "mouseout" || l === "pointerout", y && a !== ki && (O = a.relatedTarget || a.fromElement) && (nu(O) || O[Mu]))
            break l;
          (d || y) && (O = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, d ? (y = a.relatedTarget || a.toElement, d = r, y = y ? nu(y) : null, y !== null && (V = nl(y), C = y.tag, y !== V || C !== 5 && C !== 27 && C !== 6) && (y = null)) : (d = null, y = r), d !== y && (C = cs, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (C = os, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), V = d == null ? O : ze(d), v = y == null ? O : ze(y), O = new C(
            E,
            o + "leave",
            d,
            a,
            g
          ), O.target = V, O.relatedTarget = v, E = null, nu(g) === r && (C = new C(
            m,
            o + "enter",
            y,
            a,
            g
          ), C.target = v, C.relatedTarget = V, E = C), V = E, C = d && y ? Zl(
            d,
            y,
            oy
          ) : null, d !== null && nm(
            z,
            O,
            d,
            C,
            !1
          ), y !== null && V !== null && nm(
            z,
            V,
            y,
            C,
            !0
          )));
        }
        l: {
          if (d = r ? ze(r) : window, y = d.nodeName && d.nodeName.toLowerCase(), y === "select" || y === "input" && d.type === "file")
            var D = gs;
          else if (ys(d))
            if (Ss)
              D = rv;
            else {
              D = dv;
              var P = sv;
            }
          else
            y = d.nodeName, !y || y.toLowerCase() !== "input" || d.type !== "checkbox" && d.type !== "radio" ? r && Ii(r.elementType) && (D = gs) : D = mv;
          if (D && (D = D(l, r))) {
            hs(
              z,
              D,
              a,
              g
            );
            break l;
          }
          P && P(l, d, r);
        }
        switch (P = r ? ze(r) : window, l) {
          case "focusin":
            (ys(P) || P.contentEditable === "true") && (qu = P, mc = r, Re = null);
            break;
          case "focusout":
            Re = mc = qu = null;
            break;
          case "mousedown":
            rc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            rc = !1, As(z, a, g);
            break;
          case "selectionchange":
            if (yv) break;
          case "keydown":
          case "keyup":
            As(z, a, g);
        }
        var p;
        if (cc)
          l: {
            switch (l) {
              case "compositionstart":
                var q = "onCompositionStart";
                break l;
              case "compositionend":
                q = "onCompositionEnd";
                break l;
              case "compositionupdate":
                q = "onCompositionUpdate";
                break l;
            }
            q = void 0;
          }
        else
          Bu ? rs(l, a) && (q = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (q = "onCompositionStart");
        q && (ss && a.locale !== "ko" && (Bu || q !== "onCompositionStart" ? q === "onCompositionEnd" && Bu && (p = ns()) : (Ua = g, ac = "value" in Ua ? Ua.value : Ua.textContent, Bu = !0)), P = Ci(r, q), 0 < P.length && (q = new fs(
          q,
          l,
          null,
          a,
          g
        ), z.push({ event: q, listeners: P }), p ? q.data = p : (p = vs(a), p !== null && (q.data = p)))), (p = nv ? iv(l, a) : cv(l, a)) && (q = Ci(r, "onBeforeInput"), 0 < q.length && (P = new fs(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), z.push({
          event: P,
          listeners: q
        }), P.data = p)), ny(
          z,
          l,
          r,
          a,
          g
        );
      }
      um(z, t);
    });
  }
  function an(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Ci(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = _e(l, a), e != null && u.unshift(
        an(l, e, n)
      ), e = _e(l, t), e != null && u.push(
        an(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function oy(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function nm(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, f = c.alternate, r = c.stateNode;
      if (c = c.tag, f !== null && f === u) break;
      c !== 5 && c !== 26 && c !== 27 || r === null || (f = r, e ? (r = _e(a, n), r != null && i.unshift(
        an(a, r, f)
      )) : e || (r = _e(a, n), r != null && i.push(
        an(a, r, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var sy = /\r\n?/g, dy = /\u0000|\uFFFD/g;
  function im(l) {
    return (typeof l == "string" ? l : "" + l).replace(sy, `
`).replace(dy, "");
  }
  function cm(l, t) {
    return t = im(t), im(l) === t;
  }
  function gl(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        if (typeof u == "string")
          t === "body" || t === "textarea" && u === "" || Hu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          t !== "body" && Hu(l, "" + u);
        else return;
        break;
      case "className":
        zn(l, "class", u);
        break;
      case "tabIndex":
        zn(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        zn(l, a, u);
        break;
      case "style":
        as(l, u, n);
        return;
      case "data":
        if (t !== "object") {
          zn(l, "data", u);
          break;
        }
      case "src":
      case "href":
        if (u === "" && (t !== "a" || a !== "href")) {
          l.removeAttribute(a);
          break;
        }
        if (u == null || typeof u == "function" || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = _n(u), l.setAttribute(a, u);
        break;
      case "action":
      case "formAction":
        if (typeof u == "function") {
          l.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && gl(l, t, "name", e.name, e, null), gl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), gl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), gl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (gl(l, t, "encType", e.encType, e, null), gl(l, t, "method", e.method, e, null), gl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = _n(u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = ta);
        return;
      case "onScroll":
        u != null && W("scroll", l);
        return;
      case "onScrollEnd":
        u != null && W("scrollend", l);
        return;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(h(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(h(60));
            n?.__html !== a && (l.innerHTML = a);
          }
        }
        break;
      case "multiple":
        l.multiple = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "muted":
        l.muted = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (u == null || typeof u == "function" || typeof u == "boolean" || typeof u == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        a = _n(u), l.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "credentialless":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        u && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, "") : l.removeAttribute(a);
        break;
      case "capture":
      case "download":
        u === !0 ? l.setAttribute(a, "") : u !== !1 && u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        u != null && typeof u != "function" && typeof u != "symbol" && !isNaN(u) && 1 <= u ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        u == null || typeof u == "function" || typeof u == "symbol" || isNaN(u) ? l.removeAttribute(a) : l.setAttribute(a, u);
        break;
      case "popover":
        W("beforetoggle", l), W("toggle", l), En(l, "popover", u);
        break;
      case "xlinkActuate":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        va(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        va(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        va(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        va(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        En(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = Ur.get(a) || a, En(l, a, u);
        else return;
    }
    cl = !0;
  }
  function Wf(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        as(l, u, n);
        return;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(h(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(h(60));
            n?.__html !== a && (l.innerHTML = a);
          }
        }
        break;
      case "children":
        if (typeof u == "string") Hu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          Hu(l, "" + u);
        else return;
        break;
      case "onScroll":
        u != null && W("scroll", l);
        return;
      case "onScrollEnd":
        u != null && W("scrollend", l);
        return;
      case "onClick":
        u != null && (l.onclick = ta);
        return;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        return;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!Jo.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[ht] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            cl = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : En(l, a, u);
          }
        return;
    }
    cl = !0;
  }
  function tt(l, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        W("error", l), W("load", l);
        var u = !1, e = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var i = a[n];
            if (i != null)
              switch (n) {
                case "src":
                  u = !0;
                  break;
                case "srcSet":
                  e = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(h(137, t));
                default:
                  gl(l, t, n, i, a, null);
              }
          }
        e && gl(l, t, "srcSet", a.srcSet, a, null), u && gl(l, t, "src", a.src, a, null);
        return;
      case "input":
        W("invalid", l);
        var c = n = i = e = null, f = null, r = null;
        for (u in a)
          if (a.hasOwnProperty(u)) {
            var g = a[u];
            if (g != null)
              switch (u) {
                case "name":
                  e = g;
                  break;
                case "type":
                  i = g;
                  break;
                case "checked":
                  f = g;
                  break;
                case "defaultChecked":
                  r = g;
                  break;
                case "value":
                  n = g;
                  break;
                case "defaultValue":
                  c = g;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (g != null)
                    throw Error(h(137, t));
                  break;
                default:
                  gl(l, t, u, g, a, null);
              }
          }
        ko(
          l,
          n,
          c,
          f,
          r,
          i,
          e,
          !1
        );
        return;
      case "select":
        W("invalid", l), u = i = n = null;
        for (e in a)
          if (a.hasOwnProperty(e) && (c = a[e], c != null))
            switch (e) {
              case "value":
                n = c;
                break;
              case "defaultValue":
                i = c;
                break;
              case "multiple":
                u = c;
              default:
                gl(l, t, e, c, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? pu(l, !!u, t, !1) : a != null && pu(l, !!u, a, !0);
        return;
      case "textarea":
        W("invalid", l), n = e = u = null;
        for (i in a)
          if (a.hasOwnProperty(i) && (c = a[i], c != null))
            switch (i) {
              case "value":
                u = c;
                break;
              case "defaultValue":
                e = c;
                break;
              case "children":
                n = c;
                break;
              case "dangerouslySetInnerHTML":
                if (c != null) throw Error(h(91));
                break;
              default:
                gl(l, t, i, c, a, null);
            }
        ls(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : gl(l, t, f, u, a, null));
        return;
      case "dialog":
        W("beforetoggle", l), W("toggle", l), W("cancel", l), W("close", l);
        break;
      case "iframe":
      case "object":
        W("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < tn.length; u++)
          W(tn[u], l);
        break;
      case "image":
        W("error", l), W("load", l);
        break;
      case "details":
        W("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        W("error", l), W("load", l);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (r in a)
          if (a.hasOwnProperty(r) && (u = a[r], u != null))
            switch (r) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(h(137, t));
              default:
                gl(l, t, r, u, a, null);
            }
        return;
      default:
        if (Ii(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && Wf(
              l,
              t,
              g,
              u,
              a,
              void 0
            ));
          return;
        }
    }
    for (c in a)
      a.hasOwnProperty(c) && (u = a[c], u != null && gl(l, t, c, u, a, null));
  }
  var my = {};
  function ry(l, t, a, u) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var e = null, n = null, i = null, c = null, f = null, r = null, g = null;
        for (y in a) {
          var z = a[y];
          if (a.hasOwnProperty(y) && z != null)
            switch (y) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                f = z;
              default:
                u.hasOwnProperty(y) || gl(l, t, y, null, u, z);
            }
        }
        for (var d in u) {
          var y = u[d];
          if (z = a[d], u.hasOwnProperty(d) && (y != null || z != null))
            switch (d) {
              case "type":
                y !== z && (cl = !0), n = y;
                break;
              case "name":
                y !== z && (cl = !0), e = y;
                break;
              case "checked":
                y !== z && (cl = !0), r = y;
                break;
              case "defaultChecked":
                y !== z && (cl = !0), g = y;
                break;
              case "value":
                y !== z && (cl = !0), i = y;
                break;
              case "defaultValue":
                y !== z && (cl = !0), c = y;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (y != null)
                  throw Error(h(137, t));
                break;
              default:
                y !== z && gl(
                  l,
                  t,
                  d,
                  y,
                  u,
                  z
                );
            }
        }
        Fi(
          l,
          i,
          c,
          f,
          r,
          g,
          n,
          e
        );
        return;
      case "select":
        y = i = c = d = null;
        for (n in a)
          if (f = a[n], a.hasOwnProperty(n) && f != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                y = f;
              default:
                u.hasOwnProperty(n) || gl(
                  l,
                  t,
                  n,
                  null,
                  u,
                  f
                );
            }
        for (e in u)
          if (n = u[e], f = a[e], u.hasOwnProperty(e) && (n != null || f != null))
            switch (e) {
              case "value":
                n !== f && (cl = !0), d = n;
                break;
              case "defaultValue":
                n !== f && (cl = !0), c = n;
                break;
              case "multiple":
                n !== f && (cl = !0), i = n;
              default:
                n !== f && gl(
                  l,
                  t,
                  e,
                  n,
                  u,
                  f
                );
            }
        t = c, a = i, u = y, d != null ? pu(l, !!a, d, !1) : !!u != !!a && (t != null ? pu(l, !!a, t, !0) : pu(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        y = d = null;
        for (c in a)
          if (e = a[c], a.hasOwnProperty(c) && e != null && !u.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                gl(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (cl = !0), d = e;
                break;
              case "defaultValue":
                e !== n && (cl = !0), y = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(h(91));
                break;
              default:
                e !== n && gl(l, t, i, e, u, n);
            }
        Po(l, d, y);
        return;
      case "option":
        for (var O in a)
          d = a[O], a.hasOwnProperty(O) && d != null && !u.hasOwnProperty(O) && (O === "selected" ? l.selected = !1 : gl(
            l,
            t,
            O,
            null,
            u,
            d
          ));
        for (f in u)
          d = u[f], y = a[f], u.hasOwnProperty(f) && d !== y && (d != null || y != null) && (f === "selected" ? (d !== y && (cl = !0), l.selected = d && typeof d != "function" && typeof d != "symbol") : gl(
            l,
            t,
            f,
            d,
            u,
            y
          ));
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var C in a)
          d = a[C], a.hasOwnProperty(C) && d != null && !u.hasOwnProperty(C) && gl(l, t, C, null, u, d);
        for (r in u)
          if (d = u[r], y = a[r], u.hasOwnProperty(r) && d !== y && (d != null || y != null))
            switch (r) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (d != null)
                  throw Error(h(137, t));
                break;
              default:
                gl(
                  l,
                  t,
                  r,
                  d,
                  u,
                  y
                );
            }
        return;
      default:
        if (Ii(t)) {
          for (var V in a)
            d = a[V], a.hasOwnProperty(V) && d !== void 0 && !u.hasOwnProperty(V) && Wf(
              l,
              t,
              V,
              void 0,
              u,
              d
            );
          for (g in u)
            d = u[g], y = a[g], !u.hasOwnProperty(g) || d === y || d === void 0 && y === void 0 || Wf(
              l,
              t,
              g,
              d,
              u,
              y
            );
          return;
        }
    }
    for (var m in a)
      d = a[m], a.hasOwnProperty(m) && d != null && !u.hasOwnProperty(m) && gl(l, t, m, null, u, d);
    for (z in u)
      d = u[z], y = a[z], !u.hasOwnProperty(z) || d === y || d == null && y == null || gl(l, t, z, d, u, y);
  }
  function fm(l) {
    switch (l) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function vy() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, c = e.duration;
        if (n && c && fm(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var f = a[u], r = f.startTime;
            if (r > c) break;
            var g = f.transferSize, z = f.initiatorType;
            g && fm(z) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - r) / (f - r)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var If = null, kf = null;
  function un(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function om(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function sm(l, t) {
    if (l === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return l === 1 && t === "foreignObject" ? 0 : l;
  }
  function dm(l, t, a, u) {
    return a = un(
      a
    ).createElement(l), a[Wl] = u, a[ht] = t, tt(a, l, t), Kl(a), a;
  }
  function Pf(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var lo = null;
  function yy() {
    var l = window.event;
    return l && l.type === "popstate" ? l === lo ? !1 : (lo = l, !0) : (lo = null, !1);
  }
  var to = typeof setTimeout == "function" ? setTimeout : void 0, hy = typeof clearTimeout == "function" ? clearTimeout : void 0, mm = typeof Promise == "function" ? Promise : void 0, rm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : to, gy = typeof queueMicrotask == "function" ? queueMicrotask : typeof mm < "u" ? function(l) {
    return mm.resolve(null).then(l).catch(Sy);
  } : to;
  function Sy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Wa(l) {
    return l === "head";
  }
  function vm(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), he(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          oo(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, oo(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[Ee] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && oo(l.ownerDocument.body);
      a = e;
    } while (a);
    he(t);
  }
  function ym(l, t) {
    var a = l;
    l = 0;
    do {
      var u = a.nextSibling;
      if (a.nodeType === 1 ? t ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (t ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), u && u.nodeType === 8)
        if (a = u.data, a === "/$") {
          if (l === 0) break;
          l--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || l++;
      a = u;
    } while (a);
  }
  function hm(l, t, a) {
    if (t = CSS.escape(t) !== t ? "r-" + btoa(t).replace(/=/g, "") : t, l.style.viewTransitionName = t, a != null && (l.style.viewTransitionClass = a), a = getComputedStyle(l), a.display === "inline") {
      if (t = l.getClientRects(), t.length === 1) var u = 1;
      else
        for (var e = u = 0; e < t.length; e++) {
          var n = t[e];
          0 < n.width && 0 < n.height && u++;
        }
      u === 1 && (l = l.style, l.display = t.length === 1 ? "inline-block" : "block", l.marginTop = "-" + a.paddingTop, l.marginBottom = "-" + a.paddingBottom);
    }
  }
  function gm(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function by(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function ao(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return by(t, a, l);
  }
  function Ty(l) {
    return l.documentElement.clientHeight;
  }
  function Ey(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function zy(l, t, a, u, e, n, i, c, f) {
    var r = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = r.startViewTransition({
        update: function() {
          var d = r.defaultView, y = d.navigation && d.navigation.transition, O = r.fonts.status;
          u();
          var C = [];
          if (O === "loaded" && (Ty(r), r.fonts.status === "loading" && C.push(r.fonts.ready)), O = C.length, l !== null)
            for (var V = l.suspenseyImages, m = 0, o = 0; o < V.length; o++) {
              var v = V[o];
              if (!v.complete) {
                var E = v.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < d.innerHeight && E.left < d.innerWidth) {
                  if (m += Ym(v), m > pi) {
                    C.length = O;
                    break;
                  }
                  v = new Promise(
                    Ey.bind(v)
                  ), C.push(v);
                }
              }
            }
          if (0 < C.length)
            return d = Promise.race([
              Promise.all(C),
              new Promise(function(D) {
                return setTimeout(D, 500);
              })
            ]).then(e, e), (y ? Promise.allSettled([y.finished, d]) : d).then(n, n);
          if (e(), y)
            return y.finished.then(
              n,
              n
            );
          n();
        },
        types: a
      });
      r.__reactViewTransition = g;
      var z = [];
      return g.ready.then(
        function() {
          for (var d = r.documentElement.getAnimations({
            subtree: !0
          }), y = 0; y < d.length; y++) {
            var O = d[y], C = O.effect, V = C.pseudoElement;
            if (V != null && V.startsWith("::view-transition")) {
              z.push(O), O = C.getKeyframes();
              for (var m = V = void 0, o = !0, v = 0; v < O.length; v++) {
                var E = O[v], D = E.width;
                if (V === void 0) V = D;
                else if (V !== D) {
                  o = !1;
                  break;
                }
                if (D = E.height, m === void 0) m = D;
                else if (m !== D) {
                  o = !1;
                  break;
                }
                delete E.width, delete E.height, E.transform === "none" && delete E.transform;
              }
              o && V !== void 0 && m !== void 0 && (C.setKeyframes(O), o = getComputedStyle(
                C.target,
                C.pseudoElement
              ), o.width !== V || o.height !== m) && (o = O[0], o.width = V, o.height = m, o = O[O.length - 1], o.width = V, o.height = m, C.setKeyframes(O));
            }
          }
          i();
        },
        function(d) {
          r.__reactViewTransition === g && (r.__reactViewTransition = null);
          try {
            typeof d == "object" && d !== null && d.name === "InvalidStateError" && (d.message === "View transition was skipped because document visibility state is hidden." || d.message === "Skipping view transition because document visibility state has become hidden." || d.message === "Skipping view transition because viewport size changed." || d.message === "Transition was aborted because of invalid state") && (d = null), d !== null && f(d);
          } finally {
            u(), e(), i();
          }
        }
      ), g.finished.finally(function() {
        for (var d = 0; d < z.length; d++)
          z[d].cancel();
        r.__reactViewTransition === g && (r.__reactViewTransition = null), c();
      }), g;
    } catch {
      return u(), e(), i(), null;
    }
  }
  function Au(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  Au.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : K({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Au.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), u = [], e = 0; e < a.length; e++) {
      var n = a[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && u.push(a[e]);
    }
    return u;
  }, Au.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function Sm(l) {
    return {
      name: l,
      group: new Au("group", l),
      imagePair: new Au("image-pair", l),
      old: new Au("old", l),
      new: new Au("new", l)
    };
  }
  function xt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  xt.prototype.addEventListener = function(l, t, a) {
    var u = null, e = null;
    if (!(a != null && typeof a != "boolean" && (u = a.signal || null, u !== null && u.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Tm(n, l, t, a) === -1) {
        var i = this, c = t;
        a != null && typeof a != "boolean" && a.once === !0 && (c = function(f) {
          i.removeEventListener(
            l,
            t,
            a
          ), typeof t == "function" ? t.call(this, f) : t.handleEvent(f);
        }), u !== null && (e = i.removeEventListener.bind(
          i,
          l,
          t,
          a
        ), u.addEventListener("abort", e, { once: !0 }), e = u.removeEventListener.bind(u, "abort", e)), u = se(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: e
        }), b(
          this._fragmentFiber.child,
          !1,
          _y,
          l,
          c,
          u
        );
      }
      this._eventListeners = n;
    }
  };
  function _y(l, t, a, u) {
    return ll(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  xt.prototype.removeEventListener = function(l, t, a) {
    var u = this._eventListeners;
    if (u !== null && (t = Tm(
      u,
      l,
      t,
      a
    ), t !== -1)) {
      var e = u[t];
      a = e.attachedListener;
      var n = e.cleanup;
      e = se(e.optionsOrUseCapture), b(
        this._fragmentFiber.child,
        !1,
        Oy,
        l,
        a,
        e
      ), u.splice(t, 1), n !== null && n();
    }
  };
  function Oy(l, t, a, u) {
    return ll(l).removeEventListener(
      t,
      a,
      u
    ), !1;
  }
  function se(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function bm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function Tm(l, t, a, u) {
    if (l.length === 0) return -1;
    u = bm(u);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === a && bm(n.optionsOrUseCapture) === u)
        return e;
    }
    return -1;
  }
  xt.prototype.dispatchEvent = function(l) {
    var t = x(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = ll(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var u = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.addEventListener(
            n.type,
            n.attachedListener,
            se(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(u), l = u.dispatchEvent(l), a)
        for (e = 0; e < a.length; e++)
          n = a[e], u.removeEventListener(
            n.type,
            n.attachedListener,
            se(n.optionsOrUseCapture)
          );
      return t.removeChild(u), l;
    }
    return t.dispatchEvent(l);
  }, xt.prototype.focus = function(l) {
    b(
      this._fragmentFiber.child,
      !0,
      Em,
      l,
      void 0,
      void 0
    );
  };
  function Em(l, t) {
    return l.tag === 6 ? !1 : (l = ll(l), By(l, t));
  }
  xt.prototype.focusLast = function(l) {
    var t = [];
    b(
      this._fragmentFiber.child,
      !0,
      uo,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !Em(t[a], l); a--) ;
  };
  function uo(l, t) {
    return t.push(l), !1;
  }
  xt.prototype.blur = function() {
    var l = x(
      this._fragmentFiber
    );
    l !== null && (l = ll(l), l = un(l).activeElement, l !== null && b(
      this._fragmentFiber.child,
      !1,
      Ny,
      l,
      void 0,
      void 0
    ));
  };
  function Ny(l, t) {
    return l.tag === 6 ? !1 : (l = ll(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  xt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), b(
      this._fragmentFiber.child,
      !1,
      Ay,
      l,
      void 0,
      void 0
    );
  };
  function Ay(l, t) {
    return l.tag === 6 || (l = ll(l), t.observe(l)), !1;
  }
  xt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), b(
        this._fragmentFiber.child,
        !1,
        Dy,
        l,
        void 0,
        void 0
      );
      for (var a = t = 0; a < Pt.length; a++) {
        var u = Pt[a];
        u.fragmentInstance === this && u.observer === l ? l.unobserve(u.instance) : Pt[t++] = u;
      }
      Pt.length = t;
    }
  };
  function Dy(l, t) {
    return l.tag === 6 || (l = ll(l), t.unobserve(l)), !1;
  }
  var Pt = [], eo = !1;
  function My(l, t, a) {
    Pt.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), eo || (eo = !0, qy(function() {
      eo = !1;
      var u = Pt;
      Pt = [];
      for (var e = 0; e < u.length; e++) {
        var n = u[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  xt.prototype.getClientRects = function() {
    var l = [];
    return b(
      this._fragmentFiber.child,
      !1,
      Cy,
      l,
      void 0,
      void 0
    ), l;
  };
  function Cy(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = ll(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  xt.prototype.getRootNode = function(l) {
    var t = x(
      this._fragmentFiber
    );
    return t === null ? this : ll(t).getRootNode(l);
  }, xt.prototype.compareDocumentPosition = function(l) {
    var t = x(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    b(
      this._fragmentFiber.child,
      !1,
      uo,
      a,
      void 0,
      void 0
    );
    var u = ll(t);
    if (a.length === 0) {
      if (a = u, ml(this._fragmentFiber)) {
        l: {
          for (t = this._fragmentFiber.return; t !== null; ) {
            if (t.tag === 4) {
              t = t.stateNode.containerInfo;
              break l;
            }
            if (t.tag === 3 || t.tag === 5 || t.tag === 27)
              break;
            t = t.return;
          }
          t = null;
        }
        t != null && (a = t);
      }
      t = this._fragmentFiber;
      var e = u = a.compareDocumentPosition(l);
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = jl(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = ll(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = ll(a[0]), e = ll(a[a.length - 1]);
    var n = ml(this._fragmentFiber) ? t.parentElement : u;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    u = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = e.compareDocumentPosition(l), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = u && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = u && t === l || n && e === l || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !u && t === l || !n && e === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Uy(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Uy(l, t, a, u, e) {
    var n = nu(e);
    if (l & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (a = !!n)
        l: {
          for (; n !== null; ) {
            if (n.tag === 7 && (n === t || n.alternate === t)) {
              a = !0;
              break l;
            }
            n = n.return;
          }
          a = !1;
        }
      return a;
    }
    if (l & Node.DOCUMENT_POSITION_CONTAINS) {
      if (n === null)
        return n = e.ownerDocument, e === n || e === n.documentElement || e === n.body;
      l: {
        for (n = t, t = x(t); n !== null; ) {
          if (!(n.tag !== 5 && n.tag !== 3 && n.tag !== 27 || n !== t && n.alternate !== t)) {
            n = !0;
            break l;
          }
          n = n.return;
        }
        n = !1;
      }
      return n;
    }
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = Zl(
      a,
      n,
      zt
    ), t === null ? t = !1 : (b(
      t,
      !0,
      L,
      n,
      a
    ), n = ut, ut = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = Zl(
      u,
      n,
      zt
    ), t === null ? t = !1 : (b(
      t,
      !0,
      Fl,
      n,
      u
    ), n = ut, Ol = ut = null, t = n !== null)), t) : !1;
  }
  function zm(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  xt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(h(566));
    var t = [];
    b(
      this._fragmentFiber.child,
      !1,
      uo,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var u = jl(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || x(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = ll(u), zm(l, a);
        return;
      }
      if (u = ll(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = ll(e), zm(e, a)) : ll(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Ry(l, t) {
    return l = ll(l), _m(l, t), !1;
  }
  function _m(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Om(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.addEventListener(
          e.type,
          e.attachedListener,
          se(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < Pt.length; c++) {
        var f = Pt[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && (Pt[i++] = f);
      }
      Pt.length = i, n.observe(l);
    }), _m(l, t));
  }
  function py(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.removeEventListener(
          e.type,
          e.attachedListener,
          se(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      typeof n.rootMargin == "string" ? My(
        t,
        n,
        l
      ) : n.unobserve(l);
    }), l.reactFragments != null && l.reactFragments.delete(t));
  }
  function no(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          no(a), Tn(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      l.removeChild(a);
    }
  }
  function Hy(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[Ee])
          switch (t) {
            case "meta":
              if (!l.hasAttribute("itemprop")) break;
              return l;
            case "link":
              if (n = l.getAttribute("rel"), n === "stylesheet" && l.hasAttribute("data-precedence"))
                break;
              if (n !== e.rel || l.getAttribute("href") !== (e.href == null || e.href === "" ? null : e.href) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin) || l.getAttribute("title") !== (e.title == null ? null : e.title))
                break;
              return l;
            case "style":
              if (l.hasAttribute("data-precedence")) break;
              return l;
            case "script":
              if (n = l.getAttribute("src"), (n !== (e.src == null ? null : e.src) || l.getAttribute("type") !== (e.type == null ? null : e.type) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin)) && n && l.hasAttribute("async") && !l.hasAttribute("itemprop"))
                break;
              return l;
            default:
              return l;
          }
      } else if (t === "input" && l.type === "hidden") {
        var n = e.name == null ? null : "" + e.name;
        if (e.type === "hidden" && l.getAttribute("name") === n)
          return l;
      } else return l;
      if (l = Lt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function jy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Lt(l.nextSibling), l === null)) return null;
    return l;
  }
  function Nm(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Lt(l.nextSibling), l === null)) return null;
    return l;
  }
  function io(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function co(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function xy(l, t) {
    var a = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || a.readyState !== "loading")
      t();
    else {
      var u = function() {
        t(), a.removeEventListener("DOMContentLoaded", u);
      };
      a.addEventListener("DOMContentLoaded", u), l._reactRetry = u;
    }
  }
  function Lt(l) {
    for (; l != null; l = l.nextSibling) {
      var t = l.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = l.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F")
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return l;
  }
  var fo = null;
  function Am(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Lt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Dm(l) {
    l = l.previousSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (t === 0) return l;
          t--;
        } else a !== "/$" && a !== "/&" || t++;
      }
      l = l.previousSibling;
    }
    return null;
  }
  function By(l, t) {
    function a() {
      u = !0;
    }
    if (l.ownerDocument.activeElement === l) return !0;
    var u = !1;
    try {
      l.ownerDocument.addEventListener("focus", a, !0), (l.focus || HTMLElement.prototype.focus).call(l, t);
    } finally {
      l.ownerDocument.removeEventListener("focus", a, !0);
    }
    return u;
  }
  function qy(l) {
    rm(function() {
      rm(function(t) {
        return l(t);
      });
    });
  }
  function Mm(l, t, a) {
    switch (t = un(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(h(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(h(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(h(454));
        return l;
      default:
        throw Error(h(451));
    }
  }
  function Cm(l, t, a) {
    for (var u in a) {
      var e = a[u];
      a.hasOwnProperty(u) && e != null && gl(l, t, u, null, my, e);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === ta && (l.onclick = null), Tn(l);
  }
  function oo(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    Tn(l);
  }
  var Kt = /* @__PURE__ */ new Map(), Um = /* @__PURE__ */ new Set();
  function en(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var Da = Y.d;
  Y.d = {
    f: Yy,
    r: Gy,
    D: Xy,
    C: Qy,
    L: Zy,
    m: Vy,
    X: Ky,
    S: Ly,
    M: Jy
  };
  function Yy() {
    var l = Da.f(), t = _i();
    return l || t;
  }
  function Gy(l) {
    var t = Cu(l);
    t !== null && t.tag === 5 && t.type === "form" ? p0(t) : Da.r(l);
  }
  var de = typeof document > "u" ? null : document;
  function Rm(l, t, a) {
    var u = de;
    if (u && typeof t == "string" && t) {
      var e = qt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Um.has(e) || (Um.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), tt(t, "link", l), Kl(t), u.head.appendChild(t)));
    }
  }
  function Xy(l) {
    Da.D(l), Rm("dns-prefetch", l, null);
  }
  function Qy(l, t) {
    Da.C(l, t), Rm("preconnect", l, t);
  }
  function Zy(l, t, a) {
    Da.L(l, t, a);
    var u = de;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + qt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + qt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + qt(
        a.imageSizes
      ) + '"]')) : e += '[href="' + qt(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = me(l);
          break;
        case "script":
          n = re(l);
      }
      if (!(Kt.has(n) || (l = K(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Kt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(nn(n)) || t === "script" && u.querySelector(cn(n))))) {
        var i = u.createElement("link");
        tt(i, "link", l), t === "style" && (i[bn] = !0, i.onload = i.onerror = function() {
          Lo(i);
        }), Kl(i), u.head.appendChild(i);
      }
    }
  }
  function Vy(l, t) {
    Da.m(l, t);
    var a = de;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + qt(u) + '"][href="' + qt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = re(l);
      }
      if (!Kt.has(n) && (l = K({ rel: "modulepreload", href: l }, t), Kt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(cn(n)))
              return;
        }
        u = a.createElement("link"), tt(u, "link", l), Kl(u), a.head.appendChild(u);
      }
    }
  }
  function Ly(l, t, a) {
    Da.S(l, t, a);
    var u = de;
    if (u && l) {
      var e = Uu(u).hoistableStyles, n = me(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          nn(n)
        ))
          c.loading = 5;
        else {
          l = K(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Kt.get(n)) && so(l, a);
          var f = i = u.createElement("link");
          Kl(f), tt(f, "link", l), f._p = new Promise(function(r, g) {
            f.onload = r, f.onerror = g;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Ui(i, t, u);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: c
        }, e.set(n, i);
      }
    }
  }
  function Ky(l, t) {
    Da.X(l, t);
    var a = de;
    if (a && l) {
      var u = Uu(a).hoistableScripts, e = re(l), n = u.get(e);
      n || (n = a.querySelector(cn(e)), n || (l = K({ src: l, async: !0 }, t), (t = Kt.get(e)) && mo(l, t), n = a.createElement("script"), Kl(n), tt(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Jy(l, t) {
    Da.M(l, t);
    var a = de;
    if (a && l) {
      var u = Uu(a).hoistableScripts, e = re(l), n = u.get(e);
      n || (n = a.querySelector(cn(e)), n || (l = K({ src: l, async: !0, type: "module" }, t), (t = Kt.get(e)) && mo(l, t), n = a.createElement("script"), Kl(n), tt(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function pm(l, t, a, u) {
    var e = (e = ft.current) ? en(e) : null;
    if (!e) throw Error(h(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = me(a.href), t = Uu(
          e
        ).hoistableStyles, u = t.get(a), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = me(a.href);
          var n = Uu(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            nn(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Kt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Kt.set(l, n)), wy(
            e,
            l,
            n,
            i.state
          ))), t && u === null)
            throw Error(h(528, ""));
          return i;
        }
        if (t && u !== null)
          throw Error(h(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = re(a), t = Uu(
          e
        ).hoistableScripts, u = t.get(a), u || (u = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(h(444, l));
    }
  }
  function me(l) {
    return 'href="' + qt(l) + '"';
  }
  function nn(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Hm(l) {
    return K({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function wy(l, t, a, u) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[bn] !== !0) {
        u.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[bn] = !0, t.onload = t.onerror = Lo.bind(null, t), tt(t, "link", a), Kl(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function re(l) {
    return '[src="' + qt(l) + '"]';
  }
  function cn(l) {
    return "script[async]" + l;
  }
  function jm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + qt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Kl(u), u;
          var e = K({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Kl(u), tt(u, "style", e), Ui(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = me(a.href);
          var n = l.querySelector(
            nn(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Kl(n), n;
          u = Hm(a), (e = Kt.get(e)) && so(u, e), n = (l.ownerDocument || l).createElement("link"), Kl(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), tt(n, "link", u), t.state.loading |= 4, Ui(n, a.precedence, l), t.instance = n;
        case "script":
          return n = re(a.src), (e = l.querySelector(
            cn(n)
          )) ? (t.instance = e, Kl(e), e) : (u = a, (e = Kt.get(n)) && (u = K({}, a), mo(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Kl(e), tt(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(h(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Ui(u, a.precedence, l));
    return t.instance;
  }
  function Ui(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var c = u[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function so(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function mo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Ri = null;
  function xm(l, t, a) {
    if (Ri === null) {
      var u = /* @__PURE__ */ new Map(), e = Ri = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Ri, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[Ee] || n[Wl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = u.get(i);
        c ? c.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function ro(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function $y(l, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (l) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        return t.rel === "stylesheet" ? (l = t.disabled, typeof t.precedence == "string" && l == null) : !0;
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function Bm(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function qm(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Ym(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Gm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += Ym(t), l.suspenseyImages.push(t)), l = Iy.bind(l), t.decode().then(l, l));
  }
  function Fy(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = me(u.href), n = t.querySelector(
          nn(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = fn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Kl(n);
          return;
        }
        n = t.ownerDocument || t, u = Hm(u), (e = Kt.get(e)) && so(u, e), n = n.createElement("link"), Kl(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), tt(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = fn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var pi = 0;
  function Wy(l, t) {
    return l.stylesheets && l.count === 0 && ji(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && ji(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && pi === 0 && (pi = 62500 * vy());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && ji(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > pi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function Xm(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) ji(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function fn() {
    this.count--, Xm(this);
  }
  function Iy() {
    this.imgCount--, Xm(this);
  }
  var Hi = null;
  function ji(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Hi = /* @__PURE__ */ new Map(), t.forEach(ky, l), Hi = null, fn.call(l));
  }
  function ky(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Hi.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Hi.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = fn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var ve = {
    $$typeof: Ul,
    Provider: null,
    Consumer: null,
    _currentValue: Jt,
    _currentValue2: Jt,
    _threadCount: 0
  };
  function Py(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Ki(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ki(0), this.hiddenUpdates = Ki(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Qm(l, t, a, u, e, n, i, c, f, r, g, z) {
    return l = new Py(
      l,
      t,
      a,
      i,
      f,
      r,
      g,
      z,
      c
    ), t = 1, n === !0 && (t |= 24), n = gt(3, null, null, t), l.current = n, n.stateNode = l, t = Ac(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Uc(n), l;
  }
  function Zm(l) {
    return l ? (l = Xu, l) : Xu;
  }
  function Vm(l, t, a, u, e, n) {
    e = Zm(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ya(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = Ga(l, u, t), a !== null && (Et(a, l, t), Ye(a, l, t));
  }
  function Lm(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function vo(l, t) {
    Lm(l, t), (l = l.alternate) && Lm(l, t);
  }
  function Km(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = ou(l, 67108864);
      t !== null && Et(t, l, 67108864), vo(l, 67108864);
    }
  }
  function Jm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = jt();
      t = Ji(t);
      var a = ou(l, t);
      a !== null && Et(a, l, t), vo(l, t);
    }
  }
  var ye = !0;
  function lh(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 2, yo(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function th(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 8, yo(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function yo(l, t, a, u) {
    if (ye) {
      var e = ho(u);
      if (e === null)
        Ff(
          l,
          t,
          u,
          xi,
          a
        ), $m(l, u);
      else if (uh(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if ($m(l, u), t & 4 && -1 < ah.indexOf(l)) {
        for (; e !== null; ) {
          var n = Cu(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = eu(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - Dt(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    da(n), (ol & 6) === 0 && (Ti = Nt() + 500, ln(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ou(n, 2), c !== null && Et(c, n, 2), _i(), vo(n, 2);
            }
          if (n = ho(u), n === null && Ff(
            l,
            t,
            u,
            xi,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        Ff(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function ho(l) {
    return l = Pi(l), go(l);
  }
  var xi = null;
  function go(l) {
    if (xi = null, l = nu(l), l !== null) {
      var t = nl(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = Ml(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = Ll(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return xi = l, null;
  }
  function wm(l) {
    switch (l) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "fullscreenerror":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "resize":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (vr()) {
          case po:
            return 2;
          case Ho:
            return 8;
          case vn:
          case yr:
            return 32;
          case jo:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var So = !1, Ia = null, ka = null, Pa = null, on = /* @__PURE__ */ new Map(), sn = /* @__PURE__ */ new Map(), lu = [], ah = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function $m(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Ia = null;
        break;
      case "dragenter":
      case "dragleave":
        ka = null;
        break;
      case "mouseover":
      case "mouseout":
        Pa = null;
        break;
      case "pointerover":
      case "pointerout":
        on.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        sn.delete(t.pointerId);
    }
  }
  function dn(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Cu(t), t !== null && Km(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function uh(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return Ia = dn(
          Ia,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return ka = dn(
          ka,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Pa = dn(
          Pa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return on.set(
          n,
          dn(
            on.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, sn.set(
          n,
          dn(
            sn.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
    }
    return !1;
  }
  function Fm(l) {
    var t = nu(l.target);
    if (t !== null) {
      var a = nl(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = Ml(a), t !== null) {
            l.blockedOn = t, Qo(l.priority, function() {
              Jm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Ll(a), t !== null) {
            l.blockedOn = t, Qo(l.priority, function() {
              Jm(a);
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          l.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    l.blockedOn = null;
  }
  function Bi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = ho(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        ki = u, a.target.dispatchEvent(u), ki = null;
      } else
        return t = Cu(a), t !== null && Km(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Wm(l, t, a) {
    Bi(l) && a.delete(t);
  }
  function eh() {
    So = !1, Ia !== null && Bi(Ia) && (Ia = null), ka !== null && Bi(ka) && (ka = null), Pa !== null && Bi(Pa) && (Pa = null), on.forEach(Wm), sn.forEach(Wm);
  }
  function qi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, So || (So = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      eh
    )));
  }
  var Yi = null;
  function Im(l) {
    Yi !== l && (Yi = l, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      function() {
        Yi === l && (Yi = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (go(u || a) === null)
              continue;
            break;
          }
          var n = Cu(a);
          n !== null && (l.splice(t, 3), t -= 3, Ic(
            n,
            {
              pending: !0,
              data: e,
              method: a.method,
              action: u
            },
            u,
            e
          ));
        }
      }
    ));
  }
  function he(l) {
    function t(f) {
      return qi(f, l);
    }
    Ia !== null && qi(Ia, l), ka !== null && qi(ka, l), Pa !== null && qi(Pa, l), on.forEach(t), sn.forEach(t);
    for (var a = 0; a < lu.length; a++) {
      var u = lu[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < lu.length && (a = lu[0], a.blockedOn === null); )
      Fm(a), a.blockedOn === null && lu.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[ht] || null;
        if (typeof n == "function")
          i || Im(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[ht] || null)
              c = i.formAction;
            else if (go(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), Im(a);
        }
      }
  }
  function km() {
    function l(n) {
      n.canIntercept && n.info === "react-transition" && n.intercept({
        handler: function() {
          return new Promise(function(i) {
            return e = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      e !== null && (e(), e = null), u || setTimeout(a, 20);
    }
    function a() {
      if (!u && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var u = !1, e = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(a, 100), function() {
        u = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), e !== null && (e(), e = null);
      };
    }
  }
  function bo(l) {
    this._internalRoot = l;
  }
  Gi.prototype.render = bo.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(h(409));
    var a = t.current, u = jt();
    Vm(a, u, l, t, null, null);
  }, Gi.prototype.unmount = bo.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Vm(l.current, 2, null, l, null, null), _i(), t[Mu] = null;
    }
  };
  function Gi(l) {
    this._internalRoot = l;
  }
  Gi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Xo();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < lu.length && t !== 0 && t < lu[a].priority; a++) ;
      lu.splice(a, 0, l), a === 0 && Fm(l);
    }
  };
  var Pm = al.version;
  if (Pm !== "19.3.0")
    throw Error(
      h(
        527,
        Pm,
        "19.3.0"
      )
    );
  Y.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(h(188)) : (l = Object.keys(l).join(","), Error(h(268, l)));
    return l = Al(t), l = l !== null ? j(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var nh = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: U,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Xi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Xi.isDisabled && Xi.supportsFiber)
      try {
        Se = Xi.inject(
          nh
        ), At = Xi;
      } catch {
      }
  }
  return rn.createRoot = function(l, t) {
    if (!el(l)) throw Error(h(299));
    var a = !1, u = "", e = Z0, n = V0, i = L0;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Qm(
      l,
      1,
      !1,
      null,
      null,
      a,
      u,
      null,
      e,
      n,
      i,
      km
    ), l[Mu] = t.current, $f(l), new bo(t);
  }, rn.hydrateRoot = function(l, t, a) {
    if (!el(l)) throw Error(h(299));
    var u = !1, e = "", n = Z0, i = V0, c = L0, f = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Qm(
      l,
      1,
      !0,
      t,
      a ?? null,
      u,
      e,
      f,
      n,
      i,
      c,
      km
    ), t.context = Zm(null), a = t.current, u = jt(), u = Ji(u), e = Ya(u), e.callback = null, Ga(a, e, u), a = u, t.current.lanes = a, Te(t, a), da(t), l[Mu] = t.current, $f(l), new Gi(t);
  }, rn.version = "19.3.0", rn;
}
var or;
function yh() {
  if (or) return zo.exports;
  or = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (al) {
        console.error(al);
      }
  }
  return A(), zo.exports = vh(), zo.exports;
}
var hh = yh();
function gh(A = "/api") {
  async function al(X, h, el) {
    const nl = await fetch(`${A.replace(/\/$/, "")}/${X}`, {
      ...h ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) } : {},
      signal: el
    });
    if (!nl.ok) {
      const Ml = await nl.json().catch(() => ({}));
      throw new Error(Ml.error || `Erro HTTP ${nl.status}`);
    }
    return X === "export" ? nl.blob() : nl.json();
  }
  return { catalog: (X) => al("catalog", null, X), preview: (X, h) => al("preview", X, h), export: (X, h) => al("export", X, h) };
}
const sr = {
  "01_populacao": "População",
  "02_cor_raca": "Cor ou raça",
  "03_domicilios": "Domicílios",
  "04_saneamento": "Saneamento",
  "05_educacao": "Educação",
  "06_renda": "Renda",
  "07_trabalho": "Trabalho",
  "08_habitacao_internet": "Habitação e internet",
  "09_entorno_urbano": "Entorno urbano",
  "10_indigenas": "Indígenas",
  "11_quilombolas": "Quilombolas",
  "12_deficiencia_autismo": "Deficiência e autismo",
  "13_migracao": "Migração",
  "14_familias_fecundidade": "Famílias e fecundidade",
  "15_religiao": "Religião",
  "16_deslocamentos": "Deslocamentos",
  "17_favelas": "Favelas e comunidades urbanas",
  "18_registro_obitos": "Registro de óbitos",
  desenvolvimento_humano: "Desenvolvimento humano",
  desenvolvimento_municipal: "Desenvolvimento municipal",
  economia: "Economia",
  empresas_emprego: "Empresas e emprego",
  financas_publicas: "Finanças públicas",
  ideb: "IDEB",
  idh: "IDH",
  pobreza_desigualdade: "Pobreza e desigualdade",
  economico_produtivo: "Econômico-produtivo",
  seguranca_viaria: "Segurança viária"
}, Ao = (A) => {
  try {
    return JSON.parse(A.detail) || {};
  } catch {
    return {};
  }
}, Do = (A) => {
  if (sr[A]) return sr[A];
  const al = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return al.charAt(0).toLocaleUpperCase("pt-BR") + al.slice(1);
}, Sh = {
  "IBGE · Censo 2022": "IBGE — Censo Demográfico 2022",
  "IBGE / Cadastro Central de Empresas": "IBGE — Cadastro Central de Empresas",
  "IBGE / Finanças públicas": "IBGE — Finanças Públicas",
  "IBGE / Produto Interno Bruto dos Municípios": "IBGE — Produto Interno Bruto dos Municípios",
  "IBGE / Índice de Desenvolvimento da Educação Básica": "IBGE — Índice de Desenvolvimento da Educação Básica",
  "Ipeadata / Atlas do Desenvolvimento Humano (Censo Demográfico)": "Ipea — Atlas do Desenvolvimento Humano",
  "InfoSiga SP": "Detran-SP — InfoSiga",
  "MTE / RAIS": "MTE — RAIS",
  "Seade · IPDM": "Fundação Seade — IPDM"
}, bh = (A) => Sh[A] || String(A).replace(/\s*[·/]\s*/g, " — ");
function Th(A) {
  let al = "";
  try {
    al = JSON.parse(A.detail).categorias || "";
  } catch {
    al = "";
  }
  const X = {};
  for (const h of String(al).split("|")) {
    const el = h.indexOf(":");
    if (el < 1) continue;
    const nl = h.slice(0, el).trim(), Ml = h.slice(el + 1).trim();
    nl && Ml && (X[nl] = Ml);
  }
  return X;
}
const Mo = { fgb: 6500, gpkg: 1900, shp: 250 }, Co = "__todas__";
function Eh({ apiBaseUrl: A = "/api", client: al, value: X, onChange: h, onExport: el, download: nl = !0, className: Ml = "", categoriaNome: Ll = "" }) {
  const Sl = Nl.useMemo(() => al || gh(A), [al, A]), [Al, j] = Nl.useState(null), [b, x] = Nl.useState(0), [ml, jl] = Nl.useState(""), [El, ll] = Nl.useState(0), [ut, Ol] = Nl.useState({ attributes: [], format: "fgb" }), L = X ?? ut, [Fl, zt] = Nl.useState(""), [Zl, K] = Nl.useState("2022"), [$, rt] = Nl.useState(""), [et, vt] = Nl.useState(""), [xl, Bt] = Nl.useState({}), [ct, Ul] = Nl.useState(0), [N, B] = Nl.useState(""), [H, sl] = Nl.useState(!1), [il, nt] = Nl.useState(""), [Bl, la] = Nl.useState(null), s = Nl.useRef(!0);
  Nl.useEffect(() => {
    s.current = !0;
    const S = new AbortController();
    return j(null), B(""), Sl.catalog(S.signal).then((Q) => {
      j(Q), zt(Q.attributes.find((fl) => fl.source === "IBGE · Censo 2022")?.source || Q.attributes[0]?.source || "");
    }).catch((Q) => {
      Q.name !== "AbortError" && B(Q.message);
    }), () => {
      s.current = !1, S.abort();
    };
  }, [Sl, b]);
  function _(S) {
    X === void 0 && Ol(S), h?.(S), nt("");
  }
  const M = Al?.attributes || [], R = [...new Set(M.map((S) => S.source))], J = Fl === Co, I = [...new Set(M.filter((S) => J || S.source === Fl).map((S) => S.year))].sort((S, Q) => Q - S), tl = J && Zl === "", U = tl ? null : I.includes(Number(Zl)) ? Number(Zl) : I[0], Y = M.filter((S) => (J || S.source === Fl) && (tl || S.year === U)), Jt = [...new Set(Y.map((S) => S.theme))], _t = new Set(L.attributes), Ma = Nl.useMemo(() => {
    const S = M.filter((vl) => _t.has(vl.id));
    if (!S.length) return "Categoria — fonte majoritária — data da geração";
    const Q = /* @__PURE__ */ new Map();
    for (const vl of S) Q.set(vl.source, (Q.get(vl.source) || 0) + 1);
    const fl = [...Q.entries()].sort((vl, wt) => wt[1] - vl[1])[0][0];
    return `${Ll || "Categoria"} — ${fl} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [M, L.attributes, Ll]), yt = M.filter((S) => _t.has(S.id)), ql = Nl.useMemo(() => new Map(M.map((S) => [S.id, Th(S)])), [M]), rl = Y.filter((S) => (!$ || S.theme === $) && `${S.label} ${S.field} ${S.unit}`.toLocaleLowerCase("pt-BR").includes(et.toLocaleLowerCase("pt-BR"))), Ot = (S, Q) => Object.entries(xl).every(([fl, vl]) => !vl || fl === Q || ql.get(S.id)?.[fl] === vl), au = (() => {
    if (!$) return [];
    const S = /* @__PURE__ */ new Map();
    for (const Q of rl) for (const [fl, vl] of Object.entries(ql.get(Q.id) || {}))
      S.has(fl) || S.set(fl, /* @__PURE__ */ new Set()), Ot(Q, fl) && S.get(fl).add(vl);
    return [...S].map(([Q, fl]) => [Q, [...fl].sort((vl, wt) => vl.localeCompare(wt, "pt-BR", { numeric: !0 }))]).filter(([Q, fl]) => fl.length > 1 || xl[Q]).sort((Q, fl) => Q[0].localeCompare(fl[0], "pt-BR"));
  })(), ft = rl.filter((S) => Ot(S, null)), uu = ft.slice(ct * 40, ct * 40 + 40);
  Nl.useEffect(() => {
    Ul(0);
  }, [Fl, Zl, $, et, xl]), Nl.useEffect(() => {
    Bt({});
  }, [Fl, Zl, $]);
  const Du = `${L.format}|${[...L.attributes].join(",")}`;
  Nl.useEffect(() => {
    if (la(null), jl(""), !L.attributes.length || L.attributes.length > Mo[L.format]) return;
    const S = new AbortController(), Q = { attributes: L.attributes, format: L.format }, fl = setTimeout(() => Sl.preview(Q, S.signal).then((vl) => {
      S.signal.aborted || la(vl);
    }).catch((vl) => {
      S.signal.aborted || jl(vl.message);
    }), 250);
    return () => {
      clearTimeout(fl), S.abort();
    };
  }, [Sl, Du, El]);
  function ma(S) {
    _({ ...L, attributes: _t.has(S) ? L.attributes.filter((Q) => Q !== S) : [...L.attributes, S] });
  }
  async function ge() {
    sl(!0), B(""), nt(Al?.destino ? `Gerando geometria e tabela de atributos em ${Al.destino}/` : "Gerando geometria e tabela de atributos…");
    const S = { ...L, attributes: [...L.attributes] };
    try {
      const Q = await Sl.export(S), fl = `municipios_sp_${S.format}.zip`;
      if (await el?.({ blob: Q, filename: fl, configuration: S, attributes: yt }), nl) {
        const vl = URL.createObjectURL(Q), wt = document.createElement("a");
        wt.href = vl, wt.download = fl, wt.click(), setTimeout(() => URL.revokeObjectURL(vl), 1e4);
      }
      s.current && nt("Camada gerada. O pacote contém a camada, o dicionário e os metadados.");
    } catch (Q) {
      s.current && (B(Q.message), nt(""));
    } finally {
      s.current && sl(!1);
    }
  }
  return /* @__PURE__ */ T.jsxs("section", { className: `mlb ${Ml}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ T.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ T.jsxs("div", { children: [
        /* @__PURE__ */ T.jsx("h2", { className: "mlb-title", children: "Monte sua camada" }),
        /* @__PURE__ */ T.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO - DADOS MUNICIPAIS" }),
        /* @__PURE__ */ T.jsx("p", { children: "Selecione fontes, períodos, temas e atributos para compor uma única camada vetorial dos 645 municípios de São Paulo. Os dados escolhidos serão incorporados à tabela de atributos da malha municipal do IBGE de 2022." })
      ] }),
      /* @__PURE__ */ T.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ T.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ T.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    N && /* @__PURE__ */ T.jsx("div", { className: "mlb-error", role: "alert", children: N }),
    Al ? /* @__PURE__ */ T.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ T.jsxs("section", { className: "mlb-panel", children: [
        /* @__PURE__ */ T.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ T.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ T.jsxs("select", { value: Fl, onChange: (S) => {
              zt(S.target.value), rt(""), S.target.value === Co && K("");
            }, children: [
              /* @__PURE__ */ T.jsx("option", { value: Co, children: "Todas as fontes" }),
              R.map((S) => /* @__PURE__ */ T.jsx("option", { value: S, children: bh(S) }, S))
            ] })
          ] }),
          /* @__PURE__ */ T.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ T.jsxs("select", { value: tl ? "" : U ?? "", onChange: (S) => {
              K(S.target.value), rt("");
            }, children: [
              J && /* @__PURE__ */ T.jsx("option", { value: "", children: "Todos os anos" }),
              I.map((S) => /* @__PURE__ */ T.jsx("option", { children: S }, S))
            ] })
          ] }),
          /* @__PURE__ */ T.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ T.jsxs("select", { value: $, onChange: (S) => rt(S.target.value), children: [
              /* @__PURE__ */ T.jsx("option", { value: "", children: "Todos os temas" }),
              Jt.map((S) => /* @__PURE__ */ T.jsx("option", { value: S, children: Do(S) }, S))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ T.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ T.jsx("input", { type: "search", value: et, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (S) => vt(S.target.value) })
          ] }),
          au.map(([S, Q]) => /* @__PURE__ */ T.jsxs("label", { children: [
            S,
            /* @__PURE__ */ T.jsxs("select", { value: xl[S] ?? "", onChange: (fl) => Bt({ ...xl, [S]: fl.target.value }), children: [
              /* @__PURE__ */ T.jsxs("option", { value: "", children: [
                "Todos (",
                Q.length,
                ")"
              ] }),
              Q.map((fl) => /* @__PURE__ */ T.jsx("option", { value: fl, children: fl }, fl))
            ] })
          ] }, S)),
          !!Object.values(xl).filter(Boolean).length && /* @__PURE__ */ T.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => Bt({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ T.jsxs("span", { children: [
            ft.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ T.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ T.jsx("button", { type: "button", disabled: !ft.length || H, onClick: () => _({ ...L, attributes: [.../* @__PURE__ */ new Set([...L.attributes, ...ft.map((S) => S.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ T.jsx("button", { type: "button", disabled: !_t.size || H, onClick: () => _({ ...L, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-attributes", children: [
          uu.map((S) => /* @__PURE__ */ T.jsxs("article", { className: _t.has(S.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ T.jsxs("label", { children: [
              /* @__PURE__ */ T.jsx("input", { type: "checkbox", checked: _t.has(S.id), disabled: H, onChange: () => ma(S.id) }),
              /* @__PURE__ */ T.jsx("strong", { children: S.label })
            ] }),
            /* @__PURE__ */ T.jsxs("details", { children: [
              /* @__PURE__ */ T.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ T.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ T.jsxs("p", { className: "mlb-detail-meta", children: [
                  Do(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ T.jsxs("p", { children: [
                  J ? `${S.source} · ` : "",
                  S.field,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ T.jsx("a", { href: S.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ T.jsx("p", { children: Ao(S).definicao || Ao(S).divulgacao || "" }),
                /* @__PURE__ */ T.jsx("p", { children: Ao(S).nota || "" })
              ] })
            ] })
          ] }, S.id)),
          !uu.length && /* @__PURE__ */ T.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ T.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ T.jsx("button", { type: "button", disabled: !ct, onClick: () => Ul(ct - 1), children: "Anterior" }),
          /* @__PURE__ */ T.jsxs("span", { children: [
            "Página ",
            ct + 1,
            " de ",
            Math.max(1, Math.ceil(ft.length / 40))
          ] }),
          /* @__PURE__ */ T.jsx("button", { type: "button", disabled: (ct + 1) * 40 >= ft.length, onClick: () => Ul(ct + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ T.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ T.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ T.jsx("strong", { children: L.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ T.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ T.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ T.jsxs("div", { className: "mlb-basket", children: [
          yt.map((S) => /* @__PURE__ */ T.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ T.jsx("span", { className: "mlb-basket-name", children: S.label }),
            /* @__PURE__ */ T.jsxs("details", { children: [
              /* @__PURE__ */ T.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ T.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ T.jsxs("p", { className: "mlb-detail-meta", children: [
                  S.source,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ T.jsxs("p", { children: [
                  Do(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ T.jsx("p", { children: S.field })
              ] })
            ] }),
            /* @__PURE__ */ T.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: H, title: `Remover ${S.label}`, "aria-label": `Remover ${S.label}`, onClick: () => ma(S.id), children: "×" })
          ] }, S.id)),
          !yt.length && /* @__PURE__ */ T.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ T.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ T.jsxs("select", { disabled: H, value: L.format, onChange: (S) => _({ ...L, format: S.target.value }), children: [
            /* @__PURE__ */ T.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ T.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ T.jsx("option", { value: "shp", children: "Shapefile (.shp)" })
          ] })
        ] }),
        /* @__PURE__ */ T.jsxs("p", { className: "mlb-note", children: [
          L.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : L.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP."
        ] }),
        /* @__PURE__ */ T.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ T.jsx("input", { type: "text", maxLength: 200, disabled: H, value: L.nome ?? "", placeholder: Ma, onChange: (S) => _({ ...L, nome: S.target.value }) })
        ] }),
        /* @__PURE__ */ T.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        _t.size > Mo[L.format] && /* @__PURE__ */ T.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ T.jsx("button", { type: "button", className: "mlb-primary", disabled: H || !_t.size || _t.size > Mo[L.format], onClick: ge, children: H ? "Gerando camada…" : nl ? "Gerar e baixar camada" : "Gerar camada" }),
        /* @__PURE__ */ T.jsx("p", { className: "mlb-status", role: "status", children: il }),
        /* @__PURE__ */ T.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      ml && /* @__PURE__ */ T.jsxs("div", { className: "mlb-error mlb-preview", role: "alert", children: [
        "Prévia indisponível: ",
        ml,
        " ",
        /* @__PURE__ */ T.jsx("button", { type: "button", onClick: () => ll((S) => S + 1), children: "Tentar novamente" })
      ] }),
      Bl && /* @__PURE__ */ T.jsxs("section", { className: "mlb-panel mlb-preview", children: [
        /* @__PURE__ */ T.jsx("h2", { children: "Prévia da tabela de atributos" }),
        /* @__PURE__ */ T.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
        /* @__PURE__ */ T.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ T.jsxs("table", { "data-table-sort": "off", children: [
          /* @__PURE__ */ T.jsx("thead", { children: /* @__PURE__ */ T.jsxs("tr", { children: [
            /* @__PURE__ */ T.jsx("th", { children: "Código IBGE" }),
            /* @__PURE__ */ T.jsx("th", { children: "Município" }),
            Bl.fields.map((S) => /* @__PURE__ */ T.jsx("th", { children: S }, S))
          ] }) }),
          /* @__PURE__ */ T.jsx("tbody", { children: Bl.rows.map((S) => /* @__PURE__ */ T.jsxs("tr", { children: [
            /* @__PURE__ */ T.jsx("td", { children: S.CD_MUN }),
            /* @__PURE__ */ T.jsx("td", { children: S.NM_MUN }),
            Bl.fields.map((Q) => /* @__PURE__ */ T.jsx("td", { children: S[Q] == null ? "Sem valor" : S[Q].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, Q))
          ] }, S.CD_MUN)) })
        ] }) })
      ] }),
      Bl?.glossario?.length ? /* @__PURE__ */ T.jsxs("section", { className: "mlb-panel mlb-glossario", children: [
        /* @__PURE__ */ T.jsx("h2", { children: "Glossário e aliases de atributos" }),
        /* @__PURE__ */ T.jsxs("p", { children: [
          "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
          Bl.totalAttributes > (Bl.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${Bl.glossarioLimite} de ${Bl.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
        ] }),
        /* @__PURE__ */ T.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ T.jsxs("table", { "data-table-sort": "off", children: [
          /* @__PURE__ */ T.jsx("thead", { children: /* @__PURE__ */ T.jsxs("tr", { children: [
            /* @__PURE__ */ T.jsx("th", { children: "Campo exportado" }),
            /* @__PURE__ */ T.jsx("th", { children: "Alias" }),
            /* @__PURE__ */ T.jsx("th", { children: "Significado" }),
            /* @__PURE__ */ T.jsx("th", { children: "Fonte" })
          ] }) }),
          /* @__PURE__ */ T.jsx("tbody", { children: Bl.glossario.map((S) => /* @__PURE__ */ T.jsxs("tr", { children: [
            /* @__PURE__ */ T.jsx("td", { children: /* @__PURE__ */ T.jsx("code", { children: S.campo_exportado }) }),
            /* @__PURE__ */ T.jsx("td", { children: S.alias }),
            /* @__PURE__ */ T.jsx("td", { className: "mlb-glossario-significado", children: S.significado }),
            /* @__PURE__ */ T.jsx("td", { children: S.fonte })
          ] }, S.campo_exportado)) })
        ] }) })
      ] }) : null
    ] }) : /* @__PURE__ */ T.jsx("p", { role: "status", children: N ? /* @__PURE__ */ T.jsxs(T.Fragment, { children: [
      "Não foi possível carregar o catálogo. ",
      /* @__PURE__ */ T.jsx("button", { type: "button", onClick: () => x((S) => S + 1), children: "Tentar novamente" })
    ] }) : "Carregando catálogo…" })
  ] });
}
function zh(A, { category: al, apiBase: X, onGenerated: h, onBusyChange: el = () => {
}, configuration: nl, onChange: Ml = () => {
} }) {
  const Ll = hh.createRoot(A);
  function Sl() {
    const [Al, j] = Nl.useState(nl || { attributes: [], format: "fgb" }), b = Nl.useMemo(() => {
      let ml;
      async function jl(El, ll, ut) {
        let Ol;
        try {
          Ol = await fetch(`${X}/extracao-atributos/municipal/${encodeURIComponent(al.id)}/${El}`, {
            credentials: "same-origin",
            ...ll ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ll) } : {},
            signal: ut
          });
        } catch (L) {
          throw L.name === "AbortError" ? L : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!Ol.ok) {
          const L = await Ol.json().catch(() => ({}));
          throw Ol.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof L.detail == "string" ? L.detail : `Não foi possível concluir a operação (HTTP ${Ol.status}).`);
        }
        return El === "export" ? (ml = { arquivo: Ol.headers.get("X-Camada-Arquivo"), id: Ol.headers.get("X-Camada-Id") }, Ol.blob()) : Ol.json();
      }
      return {
        catalog: (El) => jl("catalog", null, El),
        preview: (El, ll) => jl("preview", El, ll),
        export: async (El) => {
          el(!0);
          try {
            return await jl("export", { ...El, nome: El.nome || "" });
          } catch (ll) {
            throw el(!1), ll;
          }
        },
        generated: () => ml
      };
    }, []);
    async function x(ml) {
      try {
        await h(b.generated(), ml);
      } finally {
        el(!1);
      }
    }
    return /* @__PURE__ */ T.jsx(Eh, { value: Al, onChange: (ml) => {
      j(ml), Ml(ml);
    }, client: b, download: !1, onExport: x, categoriaNome: al.nome });
  }
  return Ll.render(/* @__PURE__ */ T.jsx(Sl, {})), () => Ll.unmount();
}
export {
  zh as montarMunicipal
};
