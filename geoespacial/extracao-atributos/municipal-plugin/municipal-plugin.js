var No = { exports: {} }, bn = {};
var t0;
function oy() {
  if (t0) return bn;
  t0 = 1;
  var O = /* @__PURE__ */ Symbol.for("react.transitional.element"), C = /* @__PURE__ */ Symbol.for("react.fragment");
  function U(v, L, X) {
    var tl = null;
    if (X !== void 0 && (tl = "" + X), L.key !== void 0 && (tl = "" + L.key), "key" in L) {
      X = {};
      for (var vl in L)
        vl !== "key" && (X[vl] = L[vl]);
    } else X = L;
    return L = X.ref, {
      $$typeof: O,
      type: v,
      key: tl,
      ref: L !== void 0 ? L : null,
      props: X
    };
  }
  return bn.Fragment = C, bn.jsx = U, bn.jsxs = U, bn;
}
var a0;
function sy() {
  return a0 || (a0 = 1, No.exports = oy()), No.exports;
}
var b = sy(), Ao = { exports: {} }, w = {};
var e0;
function ry() {
  if (e0) return w;
  e0 = 1;
  var O = /* @__PURE__ */ Symbol.for("react.transitional.element"), C = /* @__PURE__ */ Symbol.for("react.portal"), U = /* @__PURE__ */ Symbol.for("react.fragment"), v = /* @__PURE__ */ Symbol.for("react.strict_mode"), L = /* @__PURE__ */ Symbol.for("react.profiler"), X = /* @__PURE__ */ Symbol.for("react.consumer"), tl = /* @__PURE__ */ Symbol.for("react.context"), vl = /* @__PURE__ */ Symbol.for("react.forward_ref"), J = /* @__PURE__ */ Symbol.for("react.suspense"), al = /* @__PURE__ */ Symbol.for("react.memo"), B = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), j = /* @__PURE__ */ Symbol.for("react.view_transition"), $ = Symbol.iterator;
  function _l(f) {
    return f === null || typeof f != "object" ? null : (f = $ && f[$] || f["@@iterator"], typeof f == "function" ? f : null);
  }
  var Bl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, ll = Object.assign, jl = {};
  function Zl(f, S, N) {
    this.props = f, this.context = S, this.refs = jl, this.updater = N || Bl;
  }
  Zl.prototype.isReactComponent = {}, Zl.prototype.setState = function(f, S) {
    if (typeof f != "object" && typeof f != "function" && f != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, f, S, "setState");
  }, Zl.prototype.forceUpdate = function(f) {
    this.updater.enqueueForceUpdate(this, f, "forceUpdate");
  };
  function Wl() {
  }
  Wl.prototype = Zl.prototype;
  function Cl(f, S, N) {
    this.props = f, this.context = S, this.refs = jl, this.updater = N || Bl;
  }
  var Ml = Cl.prototype = new Wl();
  Ml.constructor = Cl, ll(Ml, Zl.prototype), Ml.isPureReactComponent = !0;
  var Yl = Array.isArray;
  function M() {
  }
  var H = { H: null, A: null, T: null, S: null }, Ol = Object.prototype.hasOwnProperty;
  function Dl(f, S, N) {
    var D = N.ref;
    return {
      $$typeof: O,
      type: f,
      key: S,
      ref: D !== void 0 ? D : null,
      props: N
    };
  }
  function yl(f, S) {
    return Dl(f.type, S, f.props);
  }
  function Sl(f) {
    return typeof f == "object" && f !== null && f.$$typeof === O;
  }
  function at(f) {
    var S = { "=": "=0", ":": "=2" };
    return "$" + f.replace(/[=:]/g, function(N) {
      return S[N];
    });
  }
  var yt = /\/+/g;
  function xl(f, S) {
    return typeof f == "object" && f !== null && f.key != null ? at("" + f.key) : S.toString(36);
  }
  function A(f) {
    switch (f.status) {
      case "fulfilled":
        return f.value;
      case "rejected":
        throw f.reason;
      default:
        switch (typeof f.status == "string" ? f.then(M, M) : (f.status = "pending", f.then(
          function(S) {
            f.status === "pending" && (f.status = "fulfilled", f.value = S);
          },
          function(S) {
            f.status === "pending" && (f.status = "rejected", f.reason = S);
          }
        )), f.status) {
          case "fulfilled":
            return f.value;
          case "rejected":
            throw f.reason;
        }
    }
    throw f;
  }
  function Q(f, S, N, D, K) {
    var P = typeof f;
    (P === "undefined" || P === "boolean") && (f = null);
    var F = !1;
    if (f === null) F = !0;
    else
      switch (P) {
        case "bigint":
        case "string":
        case "number":
          F = !0;
          break;
        case "object":
          switch (f.$$typeof) {
            case O:
            case C:
              F = !0;
              break;
            case B:
              return F = f._init, Q(
                F(f._payload),
                S,
                N,
                D,
                K
              );
          }
      }
    if (F)
      return K = K(f), F = D === "" ? "." + xl(f, 0) : D, Yl(K) ? (N = "", F != null && (N = F.replace(yt, "$&/") + "/"), Q(K, S, N, "", function(gt) {
        return gt;
      })) : K != null && (Sl(K) && (K = yl(
        K,
        N + (K.key == null || f && f.key === K.key ? "" : ("" + K.key).replace(
          yt,
          "$&/"
        ) + "/") + F
      )), S.push(K)), 1;
    F = 0;
    var Y = D === "" ? "." : D + ":";
    if (Yl(f))
      for (var V = 0; V < f.length; V++)
        D = f[V], P = Y + xl(D, V), F += Q(
          D,
          S,
          N,
          P,
          K
        );
    else if (V = _l(f), typeof V == "function")
      for (f = V.call(f), V = 0; !(D = f.next()).done; )
        D = D.value, P = Y + xl(D, V++), F += Q(
          D,
          S,
          N,
          P,
          K
        );
    else if (P === "object") {
      if (typeof f.then == "function")
        return Q(
          A(f),
          S,
          N,
          D,
          K
        );
      throw S = String(f), Error(
        "Objects are not valid as a React child (found: " + (S === "[object Object]" ? "object with keys {" + Object.keys(f).join(", ") + "}" : S) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return F;
  }
  function R(f, S, N) {
    if (f == null) return f;
    var D = [], K = 0;
    return Q(f, D, "", "", function(P) {
      return S.call(N, P, K++);
    }), D;
  }
  function fl(f) {
    if (f._status === -1) {
      var S = f._result, N = S();
      N.then(
        function(D) {
          (f._status === 0 || f._status === -1) && (f._status = 1, f._result = D, N.status === void 0 && (N.status = "fulfilled", N.value = D));
        },
        function(D) {
          (f._status === 0 || f._status === -1) && (f._status = 2, f._result = D, N.status === void 0 && (N.status = "rejected", N.reason = D));
        }
      ), f._status === -1 && (f._status = 0, f._result = N);
    }
    if (f._status === 1) return f._result.default;
    throw f._result;
  }
  var ul = typeof reportError == "function" ? reportError : function(f) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var S = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof f == "object" && f !== null && typeof f.message == "string" ? String(f.message) : String(f),
        error: f
      });
      if (!window.dispatchEvent(S)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", f);
      return;
    }
    console.error(f);
  };
  function Al(f) {
    var S = H.T, N = {};
    N.types = S !== null ? S.types : null, H.T = N;
    try {
      var D = f(), K = H.S;
      K !== null && K(N, D), typeof D == "object" && D !== null && typeof D.then == "function" && D.then(M, ul);
    } catch (P) {
      ul(P);
    } finally {
      S !== null && N.types !== null && (S.types = N.types), H.T = S;
    }
  }
  function Xl(f) {
    var S = H.T;
    if (S !== null) {
      var N = S.types;
      N === null ? S.types = [f] : N.indexOf(f) === -1 && N.push(f);
    } else Al(Xl.bind(null, f));
  }
  var rt = {
    map: R,
    forEach: function(f, S, N) {
      R(
        f,
        function() {
          S.apply(this, arguments);
        },
        N
      );
    },
    count: function(f) {
      var S = 0;
      return R(f, function() {
        S++;
      }), S;
    },
    toArray: function(f) {
      return R(f, function(S) {
        return S;
      }) || [];
    },
    only: function(f) {
      if (!Sl(f))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return f;
    }
  };
  return w.Activity = T, w.Children = rt, w.Component = Zl, w.Fragment = U, w.Profiler = L, w.PureComponent = Cl, w.StrictMode = v, w.Suspense = J, w.ViewTransition = j, w.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = H, w.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(f) {
      return H.H.useMemoCache(f);
    }
  }, w.addTransitionType = Xl, w.cache = function(f) {
    return function() {
      return f.apply(null, arguments);
    };
  }, w.cacheSignal = function() {
    return null;
  }, w.cloneElement = function(f, S, N) {
    if (f == null)
      throw Error(
        "The argument must be a React element, but you passed " + f + "."
      );
    var D = ll({}, f.props), K = f.key;
    if (S != null)
      for (P in S.key !== void 0 && (K = "" + S.key), S)
        !Ol.call(S, P) || P === "key" || P === "__self" || P === "__source" || P === "ref" && S.ref === void 0 || (D[P] = S[P]);
    var P = arguments.length - 2;
    if (P === 1) D.children = N;
    else if (1 < P) {
      for (var F = Array(P), Y = 0; Y < P; Y++)
        F[Y] = arguments[Y + 2];
      D.children = F;
    }
    return Dl(f.type, K, D);
  }, w.createContext = function(f) {
    return f = {
      $$typeof: tl,
      _currentValue: f,
      _currentValue2: f,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, f.Provider = f, f.Consumer = {
      $$typeof: X,
      _context: f
    }, f;
  }, w.createElement = function(f, S, N) {
    var D, K = {}, P = null;
    if (S != null)
      for (D in S.key !== void 0 && (P = "" + S.key), S)
        Ol.call(S, D) && D !== "key" && D !== "__self" && D !== "__source" && (K[D] = S[D]);
    var F = arguments.length - 2;
    if (F === 1) K.children = N;
    else if (1 < F) {
      for (var Y = Array(F), V = 0; V < F; V++)
        Y[V] = arguments[V + 2];
      K.children = Y;
    }
    if (f && f.defaultProps)
      for (D in F = f.defaultProps, F)
        K[D] === void 0 && (K[D] = F[D]);
    return Dl(f, P, K);
  }, w.createRef = function() {
    return { current: null };
  }, w.forwardRef = function(f) {
    return { $$typeof: vl, render: f };
  }, w.isValidElement = Sl, w.lazy = function(f) {
    return {
      $$typeof: B,
      _payload: { _status: -1, _result: f },
      _init: fl
    };
  }, w.memo = function(f, S) {
    return {
      $$typeof: al,
      type: f,
      compare: S === void 0 ? null : S
    };
  }, w.startTransition = Al, w.unstable_useCacheRefresh = function() {
    return H.H.useCacheRefresh();
  }, w.use = function(f) {
    return H.H.use(f);
  }, w.useActionState = function(f, S, N) {
    return H.H.useActionState(f, S, N);
  }, w.useCallback = function(f, S) {
    return H.H.useCallback(f, S);
  }, w.useContext = function(f) {
    return H.H.useContext(f);
  }, w.useDebugValue = function() {
  }, w.useDeferredValue = function(f, S) {
    return H.H.useDeferredValue(f, S);
  }, w.useEffect = function(f, S) {
    return H.H.useEffect(f, S);
  }, w.useEffectEvent = function(f) {
    return H.H.useEffectEvent(f);
  }, w.useId = function() {
    return H.H.useId();
  }, w.useImperativeHandle = function(f, S, N) {
    return H.H.useImperativeHandle(f, S, N);
  }, w.useInsertionEffect = function(f, S) {
    return H.H.useInsertionEffect(f, S);
  }, w.useLayoutEffect = function(f, S) {
    return H.H.useLayoutEffect(f, S);
  }, w.useMemo = function(f, S) {
    return H.H.useMemo(f, S);
  }, w.useOptimistic = function(f, S) {
    return H.H.useOptimistic(f, S);
  }, w.useReducer = function(f, S, N) {
    return H.H.useReducer(f, S, N);
  }, w.useRef = function(f) {
    return H.H.useRef(f);
  }, w.useState = function(f) {
    return H.H.useState(f);
  }, w.useSyncExternalStore = function(f, S, N) {
    return H.H.useSyncExternalStore(
      f,
      S,
      N
    );
  }, w.useTransition = function() {
    return H.H.useTransition();
  }, w.version = "19.3.0", w;
}
var u0;
function Ro() {
  return u0 || (u0 = 1, Ao.exports = ry()), Ao.exports;
}
var rl = Ro(), po = { exports: {} }, Sn = {}, Co = { exports: {} }, Mo = {};
var n0;
function dy() {
  return n0 || (n0 = 1, (function(O) {
    function C(A, Q) {
      var R = A.length;
      A.push(Q);
      l: for (; 0 < R; ) {
        var fl = R - 1 >>> 1, ul = A[fl];
        if (0 < L(ul, Q))
          A[fl] = Q, A[R] = ul, R = fl;
        else break l;
      }
    }
    function U(A) {
      return A.length === 0 ? null : A[0];
    }
    function v(A) {
      if (A.length === 0) return null;
      var Q = A[0], R = A.pop();
      if (R !== Q) {
        A[0] = R;
        l: for (var fl = 0, ul = A.length, Al = ul >>> 1; fl < Al; ) {
          var Xl = 2 * (fl + 1) - 1, rt = A[Xl], f = Xl + 1, S = A[f];
          if (0 > L(rt, R))
            f < ul && 0 > L(S, rt) ? (A[fl] = S, A[f] = R, fl = f) : (A[fl] = rt, A[Xl] = R, fl = Xl);
          else if (f < ul && 0 > L(S, R))
            A[fl] = S, A[f] = R, fl = f;
          else break l;
        }
      }
      return Q;
    }
    function L(A, Q) {
      var R = A.sortIndex - Q.sortIndex;
      return R !== 0 ? R : A.id - Q.id;
    }
    if (O.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var X = performance;
      O.unstable_now = function() {
        return X.now();
      };
    } else {
      var tl = Date, vl = tl.now();
      O.unstable_now = function() {
        return tl.now() - vl;
      };
    }
    var J = [], al = [], B = 1, T = null, j = 3, $ = !1, _l = !1, Bl = !1, ll = !1, jl = typeof setTimeout == "function" ? setTimeout : null, Zl = typeof clearTimeout == "function" ? clearTimeout : null, Wl = typeof setImmediate < "u" ? setImmediate : null;
    function Cl(A) {
      for (var Q = U(al); Q !== null; ) {
        if (Q.callback === null) v(al);
        else if (Q.startTime <= A)
          v(al), Q.sortIndex = Q.expirationTime, C(J, Q);
        else break;
        Q = U(al);
      }
    }
    function Ml(A) {
      if (Bl = !1, Cl(A), !_l)
        if (U(J) !== null)
          _l = !0, Yl || (Yl = !0, Sl());
        else {
          var Q = U(al);
          Q !== null && xl(Ml, Q.startTime - A);
        }
    }
    var Yl = !1, M = -1, H = 5, Ol = -1;
    function Dl() {
      return ll ? !0 : !(O.unstable_now() - Ol < H);
    }
    function yl() {
      if (ll = !1, Yl) {
        var A = O.unstable_now();
        Ol = A;
        var Q = !0;
        try {
          l: {
            _l = !1, Bl && (Bl = !1, Zl(M), M = -1), $ = !0;
            var R = j;
            try {
              t: {
                for (Cl(A), T = U(J); T !== null && !(T.expirationTime > A && Dl()); ) {
                  var fl = T.callback;
                  if (typeof fl == "function") {
                    T.callback = null, j = T.priorityLevel;
                    var ul = fl(
                      T.expirationTime <= A
                    );
                    if (A = O.unstable_now(), typeof ul == "function") {
                      T.callback = ul, Cl(A), Q = !0;
                      break t;
                    }
                    T === U(J) && v(J), Cl(A);
                  } else v(J);
                  T = U(J);
                }
                if (T !== null) Q = !0;
                else {
                  var Al = U(al);
                  Al !== null && xl(
                    Ml,
                    Al.startTime - A
                  ), Q = !1;
                }
              }
              break l;
            } finally {
              T = null, j = R, $ = !1;
            }
            Q = void 0;
          }
        } finally {
          Q ? Sl() : Yl = !1;
        }
      }
    }
    var Sl;
    if (typeof Wl == "function")
      Sl = function() {
        Wl(yl);
      };
    else if (typeof MessageChannel < "u") {
      var at = new MessageChannel(), yt = at.port2;
      at.port1.onmessage = yl, Sl = function() {
        yt.postMessage(null);
      };
    } else
      Sl = function() {
        jl(yl, 0);
      };
    function xl(A, Q) {
      M = jl(function() {
        A(O.unstable_now());
      }, Q);
    }
    O.unstable_IdlePriority = 5, O.unstable_ImmediatePriority = 1, O.unstable_LowPriority = 4, O.unstable_NormalPriority = 3, O.unstable_Profiling = null, O.unstable_UserBlockingPriority = 2, O.unstable_cancelCallback = function(A) {
      A.callback = null;
    }, O.unstable_forceFrameRate = function(A) {
      0 > A || 125 < A ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : H = 0 < A ? Math.floor(1e3 / A) : 5;
    }, O.unstable_getCurrentPriorityLevel = function() {
      return j;
    }, O.unstable_next = function(A) {
      switch (j) {
        case 1:
        case 2:
        case 3:
          var Q = 3;
          break;
        default:
          Q = j;
      }
      var R = j;
      j = Q;
      try {
        return A();
      } finally {
        j = R;
      }
    }, O.unstable_requestPaint = function() {
      ll = !0;
    }, O.unstable_runWithPriority = function(A, Q) {
      switch (A) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          A = 3;
      }
      var R = j;
      j = A;
      try {
        return Q();
      } finally {
        j = R;
      }
    }, O.unstable_scheduleCallback = function(A, Q, R) {
      var fl = O.unstable_now();
      switch (typeof R == "object" && R !== null ? (R = R.delay, R = typeof R == "number" && 0 < R ? fl + R : fl) : R = fl, A) {
        case 1:
          var ul = -1;
          break;
        case 2:
          ul = 250;
          break;
        case 5:
          ul = 1073741823;
          break;
        case 4:
          ul = 1e4;
          break;
        default:
          ul = 5e3;
      }
      return ul = R + ul, A = {
        id: B++,
        callback: Q,
        priorityLevel: A,
        startTime: R,
        expirationTime: ul,
        sortIndex: -1
      }, R > fl ? (A.sortIndex = R, C(al, A), U(J) === null && A === U(al) && (Bl ? (Zl(M), M = -1) : Bl = !0, xl(Ml, R - fl))) : (A.sortIndex = ul, C(J, A), _l || $ || (_l = !0, Yl || (Yl = !0, Sl()))), A;
    }, O.unstable_shouldYield = Dl, O.unstable_wrapCallback = function(A) {
      var Q = j;
      return function() {
        var R = j;
        j = Q;
        try {
          return A.apply(this, arguments);
        } finally {
          j = R;
        }
      };
    };
  })(Mo)), Mo;
}
var i0;
function my() {
  return i0 || (i0 = 1, Co.exports = dy()), Co.exports;
}
var Do = { exports: {} }, ot = {};
var c0;
function vy() {
  if (c0) return ot;
  c0 = 1;
  var O = Ro();
  function C(B) {
    var T = "https://react.dev/errors/" + B;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var j = 2; j < arguments.length; j++)
        T += "&args[]=" + encodeURIComponent(arguments[j]);
    }
    return "Minified React error #" + B + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function U() {
  }
  var v = {
    d: {
      f: U,
      r: function() {
        throw Error(C(522));
      },
      D: U,
      C: U,
      L: U,
      m: U,
      X: U,
      S: U,
      M: U
    },
    p: 0,
    findDOMNode: null
  }, L = /* @__PURE__ */ Symbol.for("react.portal"), X = /* @__PURE__ */ Symbol.for("react.recoverable"), tl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function vl(B, T, j) {
    var $ = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: L,
      key: $ == null ? null : $ === tl ? tl : "" + $,
      children: B,
      containerInfo: T,
      implementation: j
    };
  }
  var J = O.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function al(B, T) {
    if (B === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return ot.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = v, ot.browser = function(B) {
    return { $$typeof: X, _reason: B };
  }, ot.createPortal = function(B, T) {
    var j = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(C(299));
    return vl(B, T, null, j);
  }, ot.flushSync = function(B) {
    var T = J.T, j = v.p;
    try {
      if (J.T = null, v.p = 2, B) return B();
    } finally {
      J.T = T, v.p = j, v.d.f();
    }
  }, ot.preconnect = function(B, T) {
    typeof B == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, v.d.C(B, T));
  }, ot.prefetchDNS = function(B) {
    typeof B == "string" && v.d.D(B);
  }, ot.preinit = function(B, T) {
    if (typeof B == "string" && T && typeof T.as == "string") {
      var j = T.as, $ = al(j, T.crossOrigin), _l = typeof T.integrity == "string" ? T.integrity : void 0, Bl = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      j === "style" ? v.d.S(
        B,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: $,
          integrity: _l,
          fetchPriority: Bl
        }
      ) : j === "script" && v.d.X(B, {
        crossOrigin: $,
        integrity: _l,
        fetchPriority: Bl,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, ot.preinitModule = function(B, T) {
    if (typeof B == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var j = al(
            T.as,
            T.crossOrigin
          );
          v.d.M(B, {
            crossOrigin: j,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && v.d.M(B);
  }, ot.preload = function(B, T) {
    if (typeof B == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var j = T.as, $ = al(j, T.crossOrigin);
      v.d.L(B, j, {
        crossOrigin: $,
        integrity: typeof T.integrity == "string" ? T.integrity : void 0,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0,
        type: typeof T.type == "string" ? T.type : void 0,
        fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0,
        referrerPolicy: typeof T.referrerPolicy == "string" ? T.referrerPolicy : void 0,
        imageSrcSet: typeof T.imageSrcSet == "string" ? T.imageSrcSet : void 0,
        imageSizes: typeof T.imageSizes == "string" ? T.imageSizes : void 0,
        media: typeof T.media == "string" ? T.media : void 0
      });
    }
  }, ot.preloadModule = function(B, T) {
    if (typeof B == "string")
      if (T) {
        var j = al(T.as, T.crossOrigin);
        v.d.m(B, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: j,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else v.d.m(B);
  }, ot.requestFormReset = function(B) {
    v.d.r(B);
  }, ot.unstable_batchedUpdates = function(B, T) {
    return B(T);
  }, ot.useFormState = function(B, T, j) {
    return J.H.useFormState(B, T, j);
  }, ot.useFormStatus = function() {
    return J.H.useHostTransitionStatus();
  }, ot.version = "19.3.0", ot;
}
var f0;
function hy() {
  if (f0) return Do.exports;
  f0 = 1;
  function O() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(O);
      } catch (C) {
        console.error(C);
      }
  }
  return O(), Do.exports = vy(), Do.exports;
}
var o0;
function yy() {
  if (o0) return Sn;
  o0 = 1;
  var O = my(), C = Ro(), U = hy();
  function v(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function L(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function X(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function tl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function vl(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function J(l) {
    if (X(l) !== l)
      throw Error(v(188));
  }
  function al(l) {
    var t = l.alternate;
    if (!t) {
      if (t = X(l), t === null) throw Error(v(188));
      return t !== l ? null : l;
    }
    for (var a = l, e = t; ; ) {
      var u = a.return;
      if (u === null) break;
      var n = u.alternate;
      if (n === null) {
        if (e = u.return, e !== null) {
          a = e;
          continue;
        }
        break;
      }
      if (u.child === n.child) {
        for (n = u.child; n; ) {
          if (n === a) return J(u), l;
          if (n === e) return J(u), t;
          n = n.sibling;
        }
        throw Error(v(188));
      }
      if (a.return !== e.return) a = u, e = n;
      else {
        for (var i = !1, c = u.child; c; ) {
          if (c === a) {
            i = !0, a = u, e = n;
            break;
          }
          if (c === e) {
            i = !0, e = u, a = n;
            break;
          }
          c = c.sibling;
        }
        if (!i) {
          for (c = n.child; c; ) {
            if (c === a) {
              i = !0, a = n, e = u;
              break;
            }
            if (c === e) {
              i = !0, e = n, a = u;
              break;
            }
            c = c.sibling;
          }
          if (!i) throw Error(v(189));
        }
      }
      if (a.alternate !== e) throw Error(v(190));
    }
    if (a.tag !== 3) throw Error(v(188));
    return a.stateNode.current === a ? l : t;
  }
  function B(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = B(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  function T(l, t, a, e, u, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && a(l, e, u, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && T(
        l.child,
        t,
        a,
        e,
        u,
        n
      ))
        return !0;
      l = l.sibling;
    }
    return !1;
  }
  function j(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function $(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function _l(l) {
    var t = [null, null], a = j(l);
    return a === null || Bl(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function Bl(l, t, a, e) {
    for (; a !== null; ) {
      if (a === t) e.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (e.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && Bl(
        l,
        t,
        a.child,
        e
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
        throw Error(v(559));
    }
  }
  var jl = null, Zl = null;
  function Wl(l, t, a) {
    return l === a ? !0 : l === t ? (jl = l, !0) : !1;
  }
  function Cl(l, t, a) {
    return l === a ? (Zl = l, !1) : l === t ? (Zl !== null && (jl = l), !0) : !1;
  }
  function Ml(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function Yl(l, t, a) {
    for (var e = 0, u = l; u; u = a(u)) e++;
    u = 0;
    for (var n = t; n; n = a(n)) u++;
    for (; 0 < e - u; ) l = a(l), e--;
    for (; 0 < u - e; ) t = a(t), u--;
    for (; e--; ) {
      if (l === t || t !== null && l === t.alternate)
        return l;
      l = a(l), t = a(t);
    }
    return null;
  }
  var M = Object.assign, H = /* @__PURE__ */ Symbol.for("react.element"), Ol = /* @__PURE__ */ Symbol.for("react.transitional.element"), Dl = /* @__PURE__ */ Symbol.for("react.portal"), yl = /* @__PURE__ */ Symbol.for("react.fragment"), Sl = /* @__PURE__ */ Symbol.for("react.strict_mode"), at = /* @__PURE__ */ Symbol.for("react.profiler"), yt = /* @__PURE__ */ Symbol.for("react.consumer"), xl = /* @__PURE__ */ Symbol.for("react.context"), A = /* @__PURE__ */ Symbol.for("react.forward_ref"), Q = /* @__PURE__ */ Symbol.for("react.suspense"), R = /* @__PURE__ */ Symbol.for("react.suspense_list"), fl = /* @__PURE__ */ Symbol.for("react.memo"), ul = /* @__PURE__ */ Symbol.for("react.lazy"), Al = /* @__PURE__ */ Symbol.for("react.activity"), Xl = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), rt = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), f = /* @__PURE__ */ Symbol.for("react.view_transition"), S = /* @__PURE__ */ Symbol.for("react.recoverable"), N = Symbol.iterator;
  function D(l) {
    return l === null || typeof l != "object" ? null : (l = N && l[N] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var K = /* @__PURE__ */ Symbol.for("react.client.reference");
  function P(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === K ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case yl:
        return "Fragment";
      case at:
        return "Profiler";
      case Sl:
        return "StrictMode";
      case Q:
        return "Suspense";
      case R:
        return "SuspenseList";
      case Al:
        return "Activity";
      case f:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case Dl:
          return "Portal";
        case xl:
          return l.displayName || "Context";
        case yt:
          return (l._context.displayName || "Context") + ".Consumer";
        case A:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case fl:
          return t = l.displayName || null, t !== null ? t : P(l.type) || "Memo";
        case ul:
          t = l._payload, l = l._init;
          try {
            return P(l(t));
          } catch {
          }
      }
    return null;
  }
  var F = Array.isArray, Y = C.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, V = U.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, gt = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, Ua = [], ta = -1;
  function Ot(l) {
    return { current: l };
  }
  function Kl(l) {
    0 > ta || (l.current = Ua[ta], Ua[ta] = null, ta--);
  }
  function nl(l, t) {
    ta++, Ua[ta] = l.current, l.current = t;
  }
  var Nt = Ot(null), aa = Ot(null), Jt = Ot(null), ie = Ot(null);
  function ce(l, t) {
    switch (nl(Jt, t), nl(aa, l), nl(Nt, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? sm(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = sm(t), l = rm(t, l);
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
    Kl(Nt), nl(Nt, l);
  }
  function ha() {
    Kl(Nt), Kl(aa), Kl(Jt);
  }
  function wt(l) {
    var t = l.memoizedState;
    t !== null && (Su._currentValue = t.memoizedState, nl(ie, l)), t = Nt.current;
    var a = rm(t, l.type);
    t !== a && (nl(aa, l), nl(Nt, a));
  }
  function Ra(l) {
    aa.current === l && (Kl(Nt), Kl(aa)), ie.current === l && (Kl(ie), Su._currentValue = gt);
  }
  var _u, Re;
  function $t(l) {
    if (_u === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        _u = t && t[1] || "", Re = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + _u + l + Re;
  }
  var E = !1;
  function W(l, t) {
    if (!l || E) return "";
    E = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var e = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var _ = function() {
                throw Error();
              };
              if (Object.defineProperty(_.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(_, []);
                } catch (p) {
                  var r = p;
                }
                Reflect.construct(l, [], _);
              } else {
                try {
                  _.call();
                } catch (p) {
                  r = p;
                }
                _ = !1;
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
                  }), _ = !0, new l();
                } finally {
                  _ && (y !== void 0 ? Object.defineProperty(l.prototype, "props", y) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (p) {
                r = p;
              }
              (_ = l()) && typeof _.catch == "function" && _.catch(function() {
              });
            }
          } catch (p) {
            if (p && r && typeof p.stack == "string")
              return [p.stack, r.stack];
          }
          return [null, null];
        }
      };
      e.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var u = Object.getOwnPropertyDescriptor(
        e.DetermineComponentFrameRoot,
        "name"
      );
      u && u.configurable && Object.defineProperty(
        e.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = e.DetermineComponentFrameRoot(), i = n[0], c = n[1];
      if (i && c) {
        var o = i.split(`
`), m = c.split(`
`);
        for (u = e = 0; e < o.length && !o[e].includes("DetermineComponentFrameRoot"); )
          e++;
        for (; u < m.length && !m[u].includes(
          "DetermineComponentFrameRoot"
        ); )
          u++;
        if (e === o.length || u === m.length)
          for (e = o.length - 1, u = m.length - 1; 1 <= e && 0 <= u && o[e] !== m[u]; )
            u--;
        for (; 1 <= e && 0 <= u; e--, u--)
          if (o[e] !== m[u]) {
            if (e !== 1 || u !== 1)
              do
                if (e--, u--, 0 > u || o[e] !== m[u]) {
                  var g = `
` + o[e].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= e && 0 <= u);
            break;
          }
      }
    } finally {
      E = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? $t(a) : "";
  }
  function dl(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return $t(l.type);
      case 16:
        return $t("Lazy");
      case 13:
        return l.child !== t && t !== null ? $t("Suspense Fallback") : $t("Suspense");
      case 19:
        return $t("SuspenseList");
      case 0:
      case 15:
        return W(l.type, !1);
      case 11:
        return W(l.type.render, !1);
      case 1:
        return W(l.type, !0);
      case 31:
        return $t("Activity");
      case 30:
        return $t("ViewTransition");
      default:
        return "";
    }
  }
  function Hl(l) {
    try {
      var t = "", a = null;
      do
        t += dl(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (e) {
      return `
Error generating stack: ` + e.message + `
` + e.stack;
    }
  }
  var ea = Object.prototype.hasOwnProperty, fe = O.unstable_scheduleCallback, Fi = O.unstable_cancelCallback, v0 = O.unstable_shouldYield, h0 = O.unstable_requestPaint, At = O.unstable_now, y0 = O.unstable_getCurrentPriorityLevel, jo = O.unstable_ImmediatePriority, xo = O.unstable_UserBlockingPriority, Tn = O.unstable_NormalPriority, g0 = O.unstable_LowPriority, Ho = O.unstable_IdlePriority, b0 = O.log, S0 = O.unstable_setDisableYieldValue, Ou = null, pt = null;
  function ja(l) {
    if (typeof b0 == "function" && S0(l), pt && typeof pt.setStrictMode == "function")
      try {
        pt.setStrictMode(Ou, l);
      } catch {
      }
  }
  var Ct = Math.clz32 ? Math.clz32 : z0, T0 = Math.log, E0 = Math.LN2;
  function z0(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (T0(l) / E0 | 0) | 0;
  }
  var En = 256, zn = 262144, _n = 4194304;
  function oe(l) {
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
  function On(l, t, a) {
    var e = l.pendingLanes;
    if (e === 0) return 0;
    var u = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = e & 134217727;
    return c !== 0 ? (e = c & ~n, e !== 0 ? u = oe(e) : (i &= c, i !== 0 ? u = oe(i) : a || (a = c & ~l, a !== 0 && (u = oe(a))))) : (c = e & ~n, c !== 0 ? u = oe(c) : i !== 0 ? u = oe(i) : a || (a = e & ~l, a !== 0 && (u = oe(a)))), u === 0 ? 0 : t !== 0 && t !== u && (t & n) === 0 && (n = u & -u, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : u;
  }
  function Nu(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function qo(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var e = 31 - Ct(a), u = 1 << e;
        t |= l[e], a &= ~u;
      }
    return t;
  }
  function _0(l, t) {
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
    var l = _n;
    return _n <<= 1, (_n & 62914560) === 0 && (_n = 4194304), l;
  }
  function Wi(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Au(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function O0(l, t, a, e, u, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, o = l.expirationTimes, m = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - Ct(a), _ = 1 << g;
      c[g] = 0, o[g] = -1;
      var r = m[g];
      if (r !== null)
        for (m[g] = null, g = 0; g < r.length; g++) {
          var y = r[g];
          y !== null && (y.lane &= -536870913);
        }
      a &= ~_;
    }
    e !== 0 && Yo(l, e, 0), n !== 0 && u === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function Yo(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var e = 31 - Ct(t);
    l.entangledLanes |= t, l.entanglements[e] = l.entanglements[e] | 1073741824 | a & 261930;
  }
  function Go(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var e = 31 - Ct(a), u = 1 << e;
      u & t | l[e] & t && (l[e] |= t), a &= ~u;
    }
  }
  function Xo(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : Ii(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function Ii(l) {
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
  function ki(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Qo() {
    var l = V.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : $m(l.type));
  }
  function Vo(l, t) {
    var a = V.p;
    try {
      return V.p = l, t();
    } finally {
      V.p = a;
    }
  }
  var ya = Math.random().toString(36).slice(2), et = "__reactFiber$" + ya, bt = "__reactProps$" + ya, je = "__reactContainer$" + ya, Lo = "__reactEvents$" + ya, N0 = "__reactListeners$" + ya, A0 = "__reactHandles$" + ya, Zo = "__reactResources$" + ya, pu = "__reactMarker$" + ya, Nn = "__reactLoad$" + ya;
  function An(l) {
    delete l[et], delete l[bt], delete l[N0], delete l[A0];
  }
  function se(l) {
    var t;
    if (t = l[et]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[je] || a[et]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Cm(l); l !== null; ) {
            if (a = l[et]) return a;
            l = Cm(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function xe(l) {
    if (l = l[et] || l[je]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function Cu(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(v(33));
  }
  function He(l) {
    var t = l[Zo];
    return t || (t = l[Zo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function kl(l) {
    l[pu] = !0;
  }
  function Ko(l) {
    l[Nn] = void 0;
  }
  var Jo = /* @__PURE__ */ new Set(), wo = {};
  function re(l, t) {
    qe(l, t), qe(l + "Capture", t);
  }
  function qe(l, t) {
    for (wo[l] = t, l = 0; l < t.length; l++)
      Jo.add(t[l]);
  }
  var p0 = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), $o = {}, Fo = {};
  function C0(l) {
    return ea.call(Fo, l) ? !0 : ea.call($o, l) ? !1 : p0.test(l) ? Fo[l] = !0 : ($o[l] = !0, !1);
  }
  var hl = !1;
  function Wo() {
    var l = hl;
    return hl = !1, l;
  }
  function pn(l, t, a) {
    if (C0(t))
      if (a === null) l.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var e = t.toLowerCase().slice(0, 5);
            if (e !== "data-" && e !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, a);
      }
  }
  function Cn(l, t, a) {
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
  function ga(l, t, a, e) {
    if (e === null) l.removeAttribute(a);
    else {
      switch (typeof e) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(a);
          return;
      }
      l.setAttributeNS(t, a, e);
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
  function Io(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function M0(l, t, a) {
    var e = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof e < "u" && typeof e.get == "function" && typeof e.set == "function") {
      var u = e.get, n = e.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return u.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: e.enumerable
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
  function Pi(l) {
    if (!l._valueTracker) {
      var t = Io(l) ? "checked" : "value";
      l._valueTracker = M0(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function ko(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), e = "";
    return l && (e = Io(l) ? l.checked ? "true" : "false" : l.value), l = e, l !== a ? (t.setValue(l), !0) : !1;
  }
  var D0 = /[\n"\\]/g;
  function Bt(l) {
    return l.replace(
      D0,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function lc(l, t, a, e, u, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Mt(t)) : l.value !== "" + Mt(t) && (l.value = "" + Mt(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? tc(l, Mt(l.value)) : tc(l, Mt(t)) : a != null ? tc(l, Mt(a)) : e != null && l.removeAttribute("value"), u == null && n != null && (l.defaultChecked = !!n), u != null && (l.checked = u && typeof u != "function" && typeof u != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Mt(c) : l.removeAttribute("name");
  }
  function Po(l, t, a, e, u, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        Pi(l);
        return;
      }
      a = a != null ? "" + Mt(a) : "", t = t != null ? "" + Mt(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    e = e ?? u, e = typeof e != "function" && typeof e != "symbol" && !!e, l.checked = c ? l.checked : !!e, l.defaultChecked = !!e, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), Pi(l);
  }
  function tc(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function Be(l, t, a, e) {
    if (l = l.options, t) {
      t = {};
      for (var u = 0; u < a.length; u++)
        t["$" + a[u]] = !0;
      for (a = 0; a < l.length; a++)
        u = t.hasOwnProperty("$" + l[a].value), l[a].selected !== u && (l[a].selected = u), u && e && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + Mt(a), t = null, u = 0; u < l.length; u++) {
        if (l[u].value === a) {
          l[u].selected = !0, e && (l[u].defaultSelected = !0);
          return;
        }
        t !== null || l[u].disabled || (t = l[u]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function ls(l, t, a) {
    if (t != null && (t = "" + Mt(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Mt(a) : "";
  }
  function ts(l, t, a, e) {
    if (t == null) {
      if (e != null) {
        if (a != null) throw Error(v(92));
        if (F(e)) {
          if (1 < e.length) throw Error(v(93));
          e = e[0];
        }
        a = e;
      }
      a == null && (a = ""), t = a;
    }
    a = Mt(t), l.defaultValue = a, e = l.textContent, e === a && e !== "" && e !== null && (l.value = e), Pi(l);
  }
  function Ye(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var U0 = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function as(l, t, a) {
    var e = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? e ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : e ? l.setProperty(t, a) : typeof a != "number" || a === 0 || U0.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function es(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(v(62));
    if (l = l.style, a != null) {
      for (var e in a)
        !a.hasOwnProperty(e) || t != null && t.hasOwnProperty(e) || (e.indexOf("--") === 0 ? l.setProperty(e, "") : e === "float" ? l.cssFloat = "" : l[e] = "", hl = !0);
      for (var u in t)
        e = t[u], t.hasOwnProperty(u) && a[u] !== e && (as(l, u, e), hl = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && as(l, n, t[n]);
  }
  function ac(l) {
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
  var R0 = /* @__PURE__ */ new Map([
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
  ]), j0 = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Mn(l) {
    return j0.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function ua() {
  }
  var ec = null;
  function uc(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Ge = null, Xe = null;
  function us(l) {
    var t = xe(l);
    if (t && (l = t.stateNode)) {
      var a = l[bt] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (lc(
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
              'input[name="' + Bt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var e = a[t];
              if (e !== l && e.form === l.form) {
                var u = e[bt] || null;
                if (!u) throw Error(v(90));
                lc(
                  e,
                  u.value,
                  u.defaultValue,
                  u.defaultValue,
                  u.checked,
                  u.defaultChecked,
                  u.type,
                  u.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              e = a[t], e.form === l.form && ko(e);
          }
          break l;
        case "textarea":
          ls(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Be(l, !!a.multiple, t, !1);
      }
    }
  }
  var nc = !1;
  function ns(l, t, a) {
    if (nc) return l(t, a);
    nc = !0;
    try {
      var e = l(t);
      return e;
    } finally {
      if (nc = !1, (Ge !== null || Xe !== null) && (Mi(), Ge && (t = Ge, l = Xe, Xe = Ge = null, us(t), l)))
        for (t = 0; t < l.length; t++) us(l[t]);
    }
  }
  function Mu(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var e = a[bt] || null;
    if (e === null) return null;
    a = e[t];
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
        (e = !e.disabled) || (l = l.type, e = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !e;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (a && typeof a != "function")
      throw Error(
        v(231, t, typeof a)
      );
    return a;
  }
  var ba = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ic = !1;
  if (ba)
    try {
      var Du = {};
      Object.defineProperty(Du, "passive", {
        get: function() {
          ic = !0;
        }
      }), window.addEventListener("test", Du, Du), window.removeEventListener("test", Du, Du);
    } catch {
      ic = !1;
    }
  var xa = null, cc = null, Dn = null;
  function is() {
    if (Dn) return Dn;
    var l, t = cc, a = t.length, e, u = "value" in xa ? xa.value : xa.textContent, n = u.length;
    for (l = 0; l < a && t[l] === u[l]; l++) ;
    var i = a - l;
    for (e = 1; e <= i && t[a - e] === u[n - e]; e++) ;
    return Dn = u.slice(l, 1 < e ? 1 - e : void 0);
  }
  function Un(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function Rn() {
    return !0;
  }
  function cs() {
    return !1;
  }
  function dt(l) {
    function t(a, e, u, n, i) {
      this._reactName = a, this._targetInst = u, this.type = e, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? Rn : cs, this.isPropagationStopped = cs, this;
    }
    return M(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = Rn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = Rn);
      },
      persist: function() {
      },
      isPersistent: Rn
    }), t;
  }
  var Ha = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, jn = dt(Ha), Uu = M({}, Ha, { view: 0, detail: 0 }), x0 = dt(Uu), fc, oc, Ru, xn = M({}, Uu, {
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
    getModifierState: rc,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Ru && (Ru && l.type === "mousemove" ? (fc = l.screenX - Ru.screenX, oc = l.screenY - Ru.screenY) : oc = fc = 0, Ru = l), fc);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : oc;
    }
  }), fs = dt(xn), H0 = M({}, xn, { dataTransfer: 0 }), q0 = dt(H0), B0 = M({}, Uu, { relatedTarget: 0 }), sc = dt(B0), Y0 = M({}, Ha, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), G0 = dt(Y0), X0 = M({}, Ha, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Q0 = dt(X0), V0 = M({}, Ha, { data: 0 }), os = dt(V0), L0 = {
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
  }, Z0 = {
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
  }, K0 = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function J0(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = K0[l]) ? !!t[l] : !1;
  }
  function rc() {
    return J0;
  }
  var w0 = M({}, Uu, {
    key: function(l) {
      if (l.key) {
        var t = L0[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Un(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Z0[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: rc,
    charCode: function(l) {
      return l.type === "keypress" ? Un(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Un(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), $0 = dt(w0), F0 = M({}, xn, {
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
  }), ss = dt(F0), W0 = M({}, Ha, { submitter: 0 }), I0 = dt(W0), k0 = M({}, Uu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: rc
  }), P0 = dt(k0), lv = M({}, Ha, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), tv = dt(lv), av = M({}, xn, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), ev = dt(av), uv = M({}, Ha, {
    newState: 0,
    oldState: 0,
    source: 0
  }), nv = dt(uv), iv = [9, 13, 27, 32], dc = ba && "CompositionEvent" in window, ju = null;
  ba && "documentMode" in document && (ju = document.documentMode);
  var cv = ba && "TextEvent" in window && !ju, rs = ba && (!dc || ju && 8 < ju && 11 >= ju), ds = " ", ms = !1;
  function vs(l, t) {
    switch (l) {
      case "keyup":
        return iv.indexOf(t.keyCode) !== -1;
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
  function hs(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Qe = !1;
  function fv(l, t) {
    switch (l) {
      case "compositionend":
        return hs(t);
      case "keypress":
        return t.which !== 32 ? null : (ms = !0, ds);
      case "textInput":
        return l = t.data, l === ds && ms ? null : l;
      default:
        return null;
    }
  }
  function ov(l, t) {
    if (Qe)
      return l === "compositionend" || !dc && vs(l, t) ? (l = is(), Dn = cc = xa = null, Qe = !1, l) : null;
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
        return rs && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var sv = {
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
    return t === "input" ? !!sv[l.type] : t === "textarea";
  }
  function gs(l, t, a, e) {
    Ge ? Xe ? Xe.push(e) : Xe = [e] : Ge = e, t = Hi(t, "onChange"), 0 < t.length && (a = new jn(
      "onChange",
      "change",
      null,
      a,
      e
    ), l.push({ event: a, listeners: t }));
  }
  var xu = null, Hu = null;
  function rv(l) {
    um(l, 0);
  }
  function Hn(l) {
    var t = Cu(l);
    if (ko(t)) return l;
  }
  function bs(l, t) {
    if (l === "change") return t;
  }
  var Ss = !1;
  if (ba) {
    var mc;
    if (ba) {
      var vc = "oninput" in document;
      if (!vc) {
        var Ts = document.createElement("div");
        Ts.setAttribute("oninput", "return;"), vc = typeof Ts.oninput == "function";
      }
      mc = vc;
    } else mc = !1;
    Ss = mc && (!document.documentMode || 9 < document.documentMode);
  }
  function Es() {
    xu && (xu.detachEvent("onpropertychange", zs), Hu = xu = null);
  }
  function zs(l) {
    if (l.propertyName === "value" && Hn(Hu)) {
      var t = [];
      gs(
        t,
        Hu,
        l,
        uc(l)
      ), ns(rv, t);
    }
  }
  function dv(l, t, a) {
    l === "focusin" ? (Es(), xu = t, Hu = a, xu.attachEvent("onpropertychange", zs)) : l === "focusout" && Es();
  }
  function mv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Hn(Hu);
  }
  function vv(l, t) {
    if (l === "click") return Hn(t);
  }
  function hv(l, t) {
    if (l === "input" || l === "change")
      return Hn(t);
  }
  function yv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var Dt = typeof Object.is == "function" ? Object.is : yv;
  function qu(l, t) {
    if (Dt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), e = Object.keys(t);
    if (a.length !== e.length) return !1;
    for (e = 0; e < a.length; e++) {
      var u = a[e];
      if (!ea.call(t, u) || !Dt(l[u], t[u]))
        return !1;
    }
    return !0;
  }
  function hc(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  function _s(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function Os(l, t) {
    var a = _s(l);
    l = 0;
    for (var e; a; ) {
      if (a.nodeType === 3) {
        if (e = l + a.textContent.length, l <= t && e >= t)
          return { node: a, offset: t - l };
        l = e;
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
      a = _s(a);
    }
  }
  function Ns(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ns(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function As(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = hc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = hc(l.document);
    }
    return t;
  }
  function yc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var gv = ba && "documentMode" in document && 11 >= document.documentMode, Ve = null, gc = null, Bu = null, bc = !1;
  function ps(l, t, a) {
    var e = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    bc || Ve == null || Ve !== hc(e) || (e = Ve, "selectionStart" in e && yc(e) ? e = { start: e.selectionStart, end: e.selectionEnd } : (e = (e.ownerDocument && e.ownerDocument.defaultView || window).getSelection(), e = {
      anchorNode: e.anchorNode,
      anchorOffset: e.anchorOffset,
      focusNode: e.focusNode,
      focusOffset: e.focusOffset
    }), Bu && qu(Bu, e) || (Bu = e, e = Hi(gc, "onSelect"), 0 < e.length && (t = new jn(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: e }), t.target = Ve)));
  }
  function de(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var Le = {
    animationend: de("Animation", "AnimationEnd"),
    animationiteration: de("Animation", "AnimationIteration"),
    animationstart: de("Animation", "AnimationStart"),
    transitionrun: de("Transition", "TransitionRun"),
    transitionstart: de("Transition", "TransitionStart"),
    transitioncancel: de("Transition", "TransitionCancel"),
    transitionend: de("Transition", "TransitionEnd")
  }, Sc = {}, Cs = {};
  ba && (Cs = document.createElement("div").style, "AnimationEvent" in window || (delete Le.animationend.animation, delete Le.animationiteration.animation, delete Le.animationstart.animation), "TransitionEvent" in window || delete Le.transitionend.transition);
  function me(l) {
    if (Sc[l]) return Sc[l];
    if (!Le[l]) return l;
    var t = Le[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Cs)
        return Sc[l] = t[a];
    return l;
  }
  var Ms = me("animationend"), Ds = me("animationiteration"), Us = me("animationstart"), bv = me("transitionrun"), Sv = me("transitionstart"), Tv = me("transitioncancel"), Rs = me("transitionend"), js = /* @__PURE__ */ new Map(), Tc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Tc.push("scrollEnd");
  function Ft(l, t) {
    js.set(l, t), re(t, [l]);
  }
  var Ev = 0;
  function Sa(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = Pt.identifierPrefix;
    var a = Ev++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function xs(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, a = ou;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = l[a[e]];
        if (u != null) {
          if (u === "none") return "none";
          t = t == null ? u : t + (" " + u);
        }
      }
    return t ?? l.default;
  }
  function Ta(l, t) {
    return l = xs(l), t = xs(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
  }
  var qn = typeof reportError == "function" ? reportError : function(l) {
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
  }, Yt = [], Ze = 0, Ec = 0;
  function Bn() {
    for (var l = Ze, t = Ec = Ze = 0; t < l; ) {
      var a = Yt[t];
      Yt[t++] = null;
      var e = Yt[t];
      Yt[t++] = null;
      var u = Yt[t];
      Yt[t++] = null;
      var n = Yt[t];
      if (Yt[t++] = null, e !== null && u !== null) {
        var i = e.pending;
        i === null ? u.next = u : (u.next = i.next, i.next = u), e.pending = u;
      }
      n !== 0 && Hs(a, u, n);
    }
  }
  function Yn(l, t, a, e) {
    Yt[Ze++] = l, Yt[Ze++] = t, Yt[Ze++] = a, Yt[Ze++] = e, Ec |= e, l.lanes |= e, l = l.alternate, l !== null && (l.lanes |= e);
  }
  function zc(l, t, a, e) {
    return Yn(l, t, a, e), Gn(l);
  }
  function ve(l, t) {
    return Yn(l, null, null, t), Gn(l);
  }
  function Hs(l, t, a) {
    l.lanes |= a;
    var e = l.alternate;
    e !== null && (e.lanes |= a);
    for (var u = !1, n = l.return; n !== null; )
      n.childLanes |= a, e = n.alternate, e !== null && (e.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (u = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, u && t !== null && (u = 31 - Ct(a), l = n.hiddenUpdates, e = l[u], e === null ? l[u] = [t] : e.push(t), t.lane = a | 536870912), n) : null;
  }
  function Gn(l) {
    if (50 < nn)
      throw nn = 0, Ci = null, Error(v(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Ke = {};
  function zv(l, t, a, e) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = e, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function St(l, t, a, e) {
    return new zv(l, t, a, e);
  }
  function _c(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function Ea(l, t) {
    var a = l.alternate;
    return a === null ? (a = St(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function qs(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Xn(l, t, a, e, u, n) {
    var i = 0;
    if (e = l, typeof e == "function") _c(e) && (i = 1);
    else if (typeof e == "string")
      i = Wh(
        l,
        a,
        Nt.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (e) {
        case Al:
          return l = St(31, a, t, u), l.elementType = Al, l.lanes = n, l;
        case yl:
          return he(a.children, u, n, t);
        case Sl:
          i = 8, u |= 24;
          break;
        case at:
          return l = St(12, a, t, u | 2), l.elementType = at, l.lanes = n, l;
        case Q:
          return l = St(13, a, t, u), l.elementType = Q, l.lanes = n, l;
        case R:
          return l = St(19, a, t, u), l.elementType = R, l.lanes = n, l;
        case Xl:
        case f:
          return l = u | 32, l = St(30, a, t, l), l.elementType = f, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case xl:
                i = 10;
                break l;
              case yt:
                i = 9;
                break l;
              case A:
                i = 11;
                break l;
              case fl:
                i = 14;
                break l;
              case ul:
                i = 16, e = null;
                break l;
            }
          i = 29, a = Error(
            v(130, l === null ? "null" : typeof l, "")
          ), e = null;
      }
    return t = St(i, a, t, u), t.elementType = l, t.type = e, t.lanes = n, t;
  }
  function he(l, t, a, e) {
    return l = St(7, l, e, t), l.lanes = a, l;
  }
  function Oc(l, t, a) {
    return l = St(6, l, null, t), l.lanes = a, l;
  }
  function Bs(l) {
    var t = St(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Nc(l, t, a) {
    return t = St(
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
  var Ys = /* @__PURE__ */ new WeakMap();
  function Gt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Ys.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Hl(t)
      }, Ys.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Hl(t)
    };
  }
  var Je = [], we = 0, Qn = null, Yu = 0, Xt = [], Qt = 0, qa = null, na = 1, ia = "";
  function za(l, t) {
    Je[we++] = Yu, Je[we++] = Qn, Qn = l, Yu = t;
  }
  function Gs(l, t, a) {
    Xt[Qt++] = na, Xt[Qt++] = ia, Xt[Qt++] = qa, qa = l;
    var e = na;
    l = ia;
    var u = 32 - Ct(e) - 1;
    e &= ~(1 << u), a += 1;
    var n = 32 - Ct(t) + u;
    if (30 < n) {
      var i = u - u % 5;
      n = (e & (1 << i) - 1).toString(32), e >>= i, u -= i, na = 1 << 32 - Ct(t) + u | a << u | e, ia = n + l;
    } else
      na = 1 << n | a << u | e, ia = l;
  }
  function Vn(l) {
    l.return !== null && (za(l, 1), Gs(l, 1, 0));
  }
  function Ac(l) {
    for (; l === Qn; )
      Qn = Je[--we], Je[we] = null, Yu = Je[--we], Je[we] = null;
    for (; l === qa; )
      qa = Xt[--Qt], Xt[Qt] = null, ia = Xt[--Qt], Xt[Qt] = null, na = Xt[--Qt], Xt[Qt] = null;
  }
  function Xs(l, t) {
    Xt[Qt++] = na, Xt[Qt++] = ia, Xt[Qt++] = qa, na = t.id, ia = t.overflow, qa = l;
  }
  var Pl = null, Ul = null, el = !1, Ba = null, Vt = !1, pc = Error(v(519));
  function Ya(l) {
    var t = Error(
      v(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Gu(Gt(t, l)), pc;
  }
  function Qs(l) {
    var t = l.stateNode, a = l.type, e = l.memoizedProps;
    switch (t[et] = l, t[bt] = e, a) {
      case "dialog":
        cl("cancel", t), cl("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        cl("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < fn.length; a++)
          cl(fn[a], t);
        break;
      case "source":
        cl("error", t);
        break;
      case "img":
      case "image":
      case "link":
        cl("error", t), cl("load", t);
        break;
      case "details":
        cl("toggle", t);
        break;
      case "input":
        cl("invalid", t), Po(
          t,
          e.value,
          e.defaultValue,
          e.checked,
          e.defaultChecked,
          e.type,
          e.name,
          !0
        );
        break;
      case "select":
        cl("invalid", t);
        break;
      case "textarea":
        cl("invalid", t), ts(t, e.value, e.defaultValue, e.children);
    }
    a = e.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || e.suppressHydrationWarning === !0 || fm(t.textContent, a) ? (e.popover != null && (cl("beforetoggle", t), cl("toggle", t)), e.onScroll != null && cl("scroll", t), e.onScrollEnd != null && cl("scrollend", t), e.onClick != null && (t.onclick = ua), t = !0) : t = !1, t || Ya(l, !0);
  }
  function Ln(l) {
    for (Pl = l.return; Pl; )
      switch (Pl.tag) {
        case 5:
        case 31:
        case 13:
          Vt = !1;
          return;
        case 27:
        case 3:
          Vt = !0;
          return;
        default:
          Pl = Pl.return;
      }
  }
  function $e(l) {
    if (l !== Pl) return !1;
    if (!el) return Ln(l), el = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || uo(l.type, l.memoizedProps)), a = !a), a && Ul && Ya(l), Ln(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      Ul = pm(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      Ul = pm(l);
    } else
      t === 27 ? (t = Ul, le(l.type) ? (l = vo, vo = null, Ul = l) : Ul = t) : Ul = Pl ? Zt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function ye() {
    Ul = Pl = null, el = !1;
  }
  function Cc() {
    var l = Ba;
    return l !== null && (zt === null ? zt = l : zt.push.apply(
      zt,
      l
    ), Ba = null), l;
  }
  function Gu(l) {
    Ba === null ? Ba = [l] : Ba.push(l);
  }
  var Mc = Ot(null), ge = null, _a = null;
  function Ga(l, t, a) {
    nl(Mc, t._currentValue), t._currentValue = a;
  }
  function Oa(l) {
    l._currentValue = Mc.current, Kl(Mc);
  }
  function Zn(l, t, a) {
    for (; l !== null; ) {
      var e = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, e !== null && (e.childLanes |= t)) : e !== null && (e.childLanes & t) !== t && (e.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Dc(l, t, a, e) {
    var u = l.child;
    for (u !== null && (u.return = l); u !== null; ) {
      var n = u.dependencies;
      if (n !== null) {
        var i = u.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var c = n;
          n = u;
          for (var o = 0; o < t.length; o++)
            if (c.context === t[o]) {
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Zn(
                n.return,
                a,
                l
              ), e || (i = null);
              break l;
            }
          n = c.next;
        }
      } else if (u.tag === 18) {
        if (i = u.return, i === null) throw Error(v(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Zn(i, a, l), i = null;
      } else
        u.tag === 13 && u.memoizedState !== null && u.memoizedState.dehydrated === null ? (u.lanes |= a, i = u.alternate, i !== null && (i.lanes |= a), Zn(
          u.return,
          a,
          l
        ), i = u.child, i = i !== null ? i.sibling : null) : i = u.child;
      if (i !== null) i.return = u;
      else
        for (i = u; i !== null; ) {
          if (i === l) {
            i = null;
            break;
          }
          if (u = i.sibling, u !== null) {
            u.return = i.return, i = u;
            break;
          }
          i = i.return;
        }
      u = i;
    }
  }
  function be(l, t, a, e) {
    l = null;
    for (var u = t, n = !1; u !== null; ) {
      if (!n) {
        if ((u.flags & 524288) !== 0) n = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var i = u.alternate;
        if (i === null) throw Error(v(387));
        if (i = i.memoizedProps, i !== null) {
          var c = u.type;
          Dt(u.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (u === ie.current) {
        if (i = u.alternate, i === null) throw Error(v(387));
        i.memoizedState.memoizedState !== u.memoizedState.memoizedState && (l !== null ? l.push(Su) : l = [Su]);
      }
      u = u.return;
    }
    return l !== null && Dc(
      t,
      l,
      a,
      e
    ), t.flags |= 262144, l !== null;
  }
  function Kn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!Dt(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function Se(l) {
    ge = l, _a = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function ut(l) {
    return Vs(ge, l);
  }
  function Jn(l, t) {
    return ge === null && Se(l), Vs(l, t);
  }
  function Vs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, _a === null) {
      if (l === null) throw Error(v(308));
      _a = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else _a = _a.next = t;
    return a;
  }
  var _v = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, e) {
        l.push(e);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(a) {
        return a();
      });
    };
  }, Ov = O.unstable_scheduleCallback, Nv = O.unstable_NormalPriority, Jl = {
    $$typeof: xl,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Uc() {
    return {
      controller: new _v(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Xu(l) {
    l.refCount--, l.refCount === 0 && Ov(Nv, function() {
      l.controller.abort();
    });
  }
  function Ls(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var e = t[l];
        a.indexOf(e) === -1 && a.push(e);
      }
    }
  }
  var Qu = null;
  function Av(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Vu = null, Rc = 0, Te = 0, Fe = null;
  function pv(l, t) {
    if (Vu === null) {
      var a = Vu = [];
      Rc = 0, Te = Ff(), Fe = {
        status: "pending",
        value: void 0,
        then: function(e) {
          a.push(e);
        }
      };
    }
    return Rc++, t.then(Zs, Zs), t;
  }
  function Zs() {
    if (--Rc === 0 && (Qu = null, Vu !== null)) {
      Fe !== null && (Fe.status = "fulfilled");
      var l = Vu;
      Vu = null, Te = 0, Fe = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Cv(l, t) {
    var a = [], e = {
      status: "pending",
      value: null,
      reason: null,
      then: function(u) {
        a.push(u);
      }
    };
    return l.then(
      function() {
        e.status = "fulfilled", e.value = t;
        for (var u = 0; u < a.length; u++) (0, a[u])(t);
      },
      function(u) {
        for (e.status = "rejected", e.reason = u, u = 0; u < a.length; u++)
          (0, a[u])(void 0);
      }
    ), e;
  }
  var Ks = Y.S;
  Y.S = function(l, t) {
    if (Bd = At(), typeof t == "object" && t !== null && typeof t.then == "function" && pv(l, t), Qu !== null)
      for (var a = mu; a !== null; )
        Ls(a, Qu), a = a.next;
    if (a = l.types, a !== null) {
      for (var e = mu; e !== null; )
        Ls(e, a), e = e.next;
      if (Te !== 0) {
        e = Qu, e === null && (e = Qu = []);
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.indexOf(n) === -1 && e.push(n);
        }
      }
    }
    Ks !== null && Ks(l, t);
  };
  var Ee = Ot(null);
  function jc() {
    var l = Ee.current;
    return l !== null ? l : pl.pooledCache;
  }
  function wn(l, t) {
    t === null ? nl(Ee, Ee.current) : nl(Ee, t.pool);
  }
  function Js() {
    var l = jc();
    return l === null ? null : { parent: Jl._currentValue, pool: l };
  }
  var We = Error(v(460)), xc = Error(v(474)), $n = Error(v(542)), Fn = { then: function() {
  } };
  function ws(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function $s(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(ua, ua), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Ws(l), l === void 0 && !("reason" in t) ? Error(v(600)) : l;
      default:
        if (typeof t.status == "string") t.then(ua, ua);
        else {
          if (l = pl, l !== null && 100 < l.shellSuspendCounter)
            throw Error(v(482));
          l = t, l.status = "pending", l.then(
            function(e) {
              if (t.status === "pending") {
                var u = t;
                u.status = "fulfilled", u.value = e;
              }
            },
            function(e) {
              if (t.status === "pending") {
                var u = t;
                u.status = "rejected", u.reason = e;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw l = t.reason, Ws(l), l;
        }
        throw _e = t, We;
    }
  }
  function ze(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (_e = a, We) : a;
    }
  }
  var _e = null;
  function Fs() {
    if (_e === null) throw Error(v(459));
    var l = _e;
    return _e = null, l;
  }
  function Ws(l) {
    if (l === We || l === $n)
      throw Error(v(483));
  }
  var Ie = null, Lu = 0;
  function Wn(l) {
    var t = Lu;
    return Lu += 1, Ie === null && (Ie = []), $s(Ie, l, t);
  }
  function Xa(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function In(l, t) {
    throw t.$$typeof === H ? Error(v(525)) : (l = Object.prototype.toString.call(t), Error(
      v(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function Is(l) {
    function t(d, s) {
      if (l) {
        var h = d.deletions;
        h === null ? (d.deletions = [s], d.flags |= 16) : h.push(s);
      }
    }
    function a(d, s) {
      if (!l) return null;
      for (; s !== null; )
        t(d, s), s = s.sibling;
      return null;
    }
    function e(d) {
      for (var s = /* @__PURE__ */ new Map(); d !== null; )
        d.key === null ? s.set(d.index, d) : s.set(d.key, d), d = d.sibling;
      return s;
    }
    function u(d, s) {
      return d = Ea(d, s), d.index = 0, d.sibling = null, d;
    }
    function n(d, s, h) {
      return d.index = h, l ? (h = d.alternate, h !== null ? (h = h.index, h < s ? (d.flags |= 2, s) : h) : (d.flags |= 134217730, s)) : (d.flags |= 1048576, s);
    }
    function i(d) {
      return l && d.alternate === null && (d.flags |= 134217730), d;
    }
    function c(d, s, h, z) {
      return s === null || s.tag !== 6 ? (s = Oc(h, d.mode, z), s.return = d, s) : (s = u(s, h), s.return = d, s);
    }
    function o(d, s, h, z) {
      var x = h.type;
      return x === yl ? (d = g(
        d,
        s,
        h.props.children,
        z,
        h.key
      ), Xa(d, h), d) : s !== null && (s.elementType === x || typeof x == "object" && x !== null && x.$$typeof === ul && ze(x) === s.type) ? (s = u(s, h.props), Xa(s, h), s.return = d, s) : (s = Xn(
        h.type,
        h.key,
        h.props,
        null,
        d.mode,
        z
      ), Xa(s, h), s.return = d, s);
    }
    function m(d, s, h, z) {
      return s === null || s.tag !== 4 || s.stateNode.containerInfo !== h.containerInfo || s.stateNode.implementation !== h.implementation ? (s = Nc(h, d.mode, z), s.return = d, s) : (s = u(s, h.children || []), s.return = d, s);
    }
    function g(d, s, h, z, x) {
      return s === null || s.tag !== 7 ? (s = he(
        h,
        d.mode,
        z,
        x
      ), s.return = d, s) : (s = u(s, h), s.return = d, s);
    }
    function _(d, s, h) {
      if (typeof s == "string" && s !== "" || typeof s == "number" || typeof s == "bigint")
        return s = Oc(
          "" + s,
          d.mode,
          h
        ), s.return = d, s;
      if (typeof s == "object" && s !== null) {
        switch (s.$$typeof) {
          case Ol:
            return h = Xn(
              s.type,
              s.key,
              s.props,
              null,
              d.mode,
              h
            ), Xa(h, s), h.return = d, h;
          case Dl:
            return s = Nc(
              s,
              d.mode,
              h
            ), s.return = d, s;
          case ul:
            return s = ze(s), _(d, s, h);
        }
        if (F(s) || D(s))
          return s = he(
            s,
            d.mode,
            h,
            null
          ), s.return = d, s;
        if (typeof s.then == "function")
          return _(d, Wn(s), h);
        if (s.$$typeof === xl)
          return _(
            d,
            Jn(d, s),
            h
          );
        In(d, s);
      }
      return null;
    }
    function r(d, s, h, z) {
      var x = s !== null ? s.key : null;
      if (typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint")
        return x !== null ? null : c(d, s, "" + h, z);
      if (typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case Ol:
            return h.key === x ? o(d, s, h, z) : null;
          case Dl:
            return h.key === x ? m(d, s, h, z) : null;
          case ul:
            return h = ze(h), r(d, s, h, z);
        }
        if (F(h) || D(h))
          return x !== null ? null : g(d, s, h, z, null);
        if (typeof h.then == "function")
          return r(
            d,
            s,
            Wn(h),
            z
          );
        if (h.$$typeof === xl)
          return r(
            d,
            s,
            Jn(d, h),
            z
          );
        In(d, h);
      }
      return null;
    }
    function y(d, s, h, z, x) {
      if (typeof z == "string" && z !== "" || typeof z == "number" || typeof z == "bigint")
        return d = d.get(h) || null, c(s, d, "" + z, x);
      if (typeof z == "object" && z !== null) {
        switch (z.$$typeof) {
          case Ol:
            return d = d.get(
              z.key === null ? h : z.key
            ) || null, o(s, d, z, x);
          case Dl:
            return d = d.get(
              z.key === null ? h : z.key
            ) || null, m(s, d, z, x);
          case ul:
            return z = ze(z), y(
              d,
              s,
              h,
              z,
              x
            );
        }
        if (F(z) || D(z))
          return d = d.get(h) || null, g(s, d, z, x, null);
        if (typeof z.then == "function")
          return y(
            d,
            s,
            h,
            Wn(z),
            x
          );
        if (z.$$typeof === xl)
          return y(
            d,
            s,
            h,
            Jn(s, z),
            x
          );
        In(s, z);
      }
      return null;
    }
    function p(d, s, h, z) {
      for (var x = null, sl = null, G = s, Z = s = 0, Fl = null; G !== null && Z < h.length; Z++) {
        G.index > Z ? (Fl = G, G = null) : Fl = G.sibling;
        var ml = r(
          d,
          G,
          h[Z],
          z
        );
        if (ml === null) {
          G === null && (G = Fl);
          break;
        }
        l && G && ml.alternate === null && t(d, G), s = n(ml, s, Z), sl === null ? x = ml : sl.sibling = ml, sl = ml, G = Fl;
      }
      if (Z === h.length)
        return a(d, G), el && za(d, Z), x;
      if (G === null) {
        for (; Z < h.length; Z++)
          G = _(d, h[Z], z), G !== null && (s = n(
            G,
            s,
            Z
          ), sl === null ? x = G : sl.sibling = G, sl = G);
        return el && za(d, Z), x;
      }
      for (G = e(G); Z < h.length; Z++)
        Fl = y(
          G,
          d,
          Z,
          h[Z],
          z
        ), Fl !== null && (l && (ml = Fl.alternate, ml !== null && G.delete(ml.key === null ? Z : ml.key)), s = n(
          Fl,
          s,
          Z
        ), sl === null ? x = Fl : sl.sibling = Fl, sl = Fl);
      return l && G.forEach(function(ne) {
        return t(d, ne);
      }), el && za(d, Z), x;
    }
    function q(d, s, h, z) {
      if (h == null) throw Error(v(151));
      for (var x = null, sl = null, G = s, Z = s = 0, Fl = null, ml = h.next(); G !== null && !ml.done; Z++, ml = h.next()) {
        G.index > Z ? (Fl = G, G = null) : Fl = G.sibling;
        var ne = r(d, G, ml.value, z);
        if (ne === null) {
          G === null && (G = Fl);
          break;
        }
        l && G && ne.alternate === null && t(d, G), s = n(ne, s, Z), sl === null ? x = ne : sl.sibling = ne, sl = ne, G = Fl;
      }
      if (ml.done)
        return a(d, G), el && za(d, Z), x;
      if (G === null) {
        for (; !ml.done; Z++, ml = h.next())
          ml = _(d, ml.value, z), ml !== null && (s = n(ml, s, Z), sl === null ? x = ml : sl.sibling = ml, sl = ml);
        return el && za(d, Z), x;
      }
      for (G = e(G); !ml.done; Z++, ml = h.next())
        ml = y(G, d, Z, ml.value, z), ml !== null && (l && (Fl = ml.alternate, Fl !== null && G.delete(
          Fl.key === null ? Z : Fl.key
        )), s = n(ml, s, Z), sl === null ? x = ml : sl.sibling = ml, sl = ml);
      return l && G.forEach(function(fy) {
        return t(d, fy);
      }), el && za(d, Z), x;
    }
    function k(d, s, h, z) {
      if (typeof h == "object" && h !== null && h.type === yl && h.key === null && h.props.ref === void 0 && (h = h.props.children), typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case Ol:
            l: {
              for (var x = h.key; s !== null; ) {
                if (s.key === x) {
                  if (x = h.type, x === yl) {
                    if (s.tag === 7) {
                      a(
                        d,
                        s.sibling
                      ), z = u(
                        s,
                        h.props.children
                      ), Xa(z, h), z.return = d, d = z;
                      break l;
                    }
                  } else if (s.elementType === x || typeof x == "object" && x !== null && x.$$typeof === ul && ze(x) === s.type) {
                    a(
                      d,
                      s.sibling
                    ), z = u(s, h.props), Xa(z, h), z.return = d, d = z;
                    break l;
                  }
                  a(d, s);
                  break;
                } else t(d, s);
                s = s.sibling;
              }
              h.type === yl ? (z = he(
                h.props.children,
                d.mode,
                z,
                h.key
              ), Xa(z, h), z.return = d, d = z) : (z = Xn(
                h.type,
                h.key,
                h.props,
                null,
                d.mode,
                z
              ), Xa(z, h), z.return = d, d = z);
            }
            return i(d);
          case Dl:
            l: {
              for (x = h.key; s !== null; ) {
                if (s.key === x)
                  if (s.tag === 4 && s.stateNode.containerInfo === h.containerInfo && s.stateNode.implementation === h.implementation) {
                    a(
                      d,
                      s.sibling
                    ), z = u(s, h.children || []), z.return = d, d = z;
                    break l;
                  } else {
                    a(d, s);
                    break;
                  }
                else t(d, s);
                s = s.sibling;
              }
              z = Nc(h, d.mode, z), z.return = d, d = z;
            }
            return i(d);
          case ul:
            return h = ze(h), k(
              d,
              s,
              h,
              z
            );
        }
        if (F(h))
          return p(
            d,
            s,
            h,
            z
          );
        if (D(h)) {
          if (x = D(h), typeof x != "function") throw Error(v(150));
          return h = x.call(h), q(
            d,
            s,
            h,
            z
          );
        }
        if (typeof h.then == "function")
          return k(
            d,
            s,
            Wn(h),
            z
          );
        if (h.$$typeof === xl)
          return k(
            d,
            s,
            Jn(d, h),
            z
          );
        In(d, h);
      }
      return typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint" ? (h = "" + h, s !== null && s.tag === 6 ? (a(d, s.sibling), z = u(s, h), z.return = d, d = z) : (a(d, s), z = Oc(h, d.mode, z), z.return = d, d = z), i(d)) : a(d, s);
    }
    return function(d, s, h, z) {
      try {
        Lu = 0;
        var x = k(
          d,
          s,
          h,
          z
        );
        return Ie = null, x;
      } catch (G) {
        if (G === We || G === $n) throw G;
        var sl = St(29, G, null, d.mode);
        return sl.lanes = z, sl.return = d, sl;
      }
    };
  }
  var Oe = Is(!0), ks = Is(!1), Qa = !1;
  function Hc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function qc(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Va(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function La(l, t, a) {
    var e = l.updateQueue;
    if (e === null) return null;
    if (e = e.shared, (gl & 2) !== 0) {
      var u = e.pending;
      return u === null ? t.next = t : (t.next = u.next, u.next = t), e.pending = t, t = Gn(l), Hs(l, null, a), t;
    }
    return Yn(l, e, t, a), Gn(l);
  }
  function Zu(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var e = t.lanes;
      e &= l.pendingLanes, a |= e, t.lanes = a, Go(l, a);
    }
  }
  function Bc(l, t) {
    var a = l.updateQueue, e = l.alternate;
    if (e !== null && (e = e.updateQueue, a === e)) {
      var u = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var i = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? u = n = i : n = n.next = i, a = a.next;
        } while (a !== null);
        n === null ? u = n = t : n = n.next = t;
      } else u = n = t;
      a = {
        baseState: e.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: n,
        shared: e.shared,
        callbacks: e.callbacks
      }, l.updateQueue = a;
      return;
    }
    l = a.lastBaseUpdate, l === null ? a.firstBaseUpdate = t : l.next = t, a.lastBaseUpdate = t;
  }
  var Yc = !1;
  function Ku() {
    if (Yc) {
      var l = Fe;
      if (l !== null) throw l;
    }
  }
  function Ju(l, t, a, e) {
    Yc = !1;
    var u = l.updateQueue;
    Qa = !1;
    var n = u.firstBaseUpdate, i = u.lastBaseUpdate, c = u.shared.pending;
    if (c !== null) {
      u.shared.pending = null;
      var o = c, m = o.next;
      o.next = null, i === null ? n = m : i.next = m, i = o;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, c = g.lastBaseUpdate, c !== i && (c === null ? g.firstBaseUpdate = m : c.next = m, g.lastBaseUpdate = o));
    }
    if (n !== null) {
      var _ = u.baseState;
      i = 0, g = m = o = null, c = n;
      do {
        var r = c.lane & -536870913, y = r !== c.lane;
        if (y ? (ol & r) === r : (e & r) === r) {
          r !== 0 && r === Te && (Yc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var p = l, q = c;
            r = t;
            var k = a;
            switch (q.tag) {
              case 1:
                if (p = q.payload, typeof p == "function") {
                  _ = p.call(k, _, r);
                  break l;
                }
                _ = p;
                break l;
              case 3:
                p.flags = p.flags & -65537 | 128;
              case 0:
                if (p = q.payload, r = typeof p == "function" ? p.call(k, _, r) : p, r == null) break l;
                _ = M({}, _, r);
                break l;
              case 2:
                Qa = !0;
            }
          }
          r = c.callback, r !== null && (l.flags |= 64, y && (l.flags |= 8192), y = u.callbacks, y === null ? u.callbacks = [r] : y.push(r));
        } else
          y = {
            lane: r,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, g === null ? (m = g = y, o = _) : g = g.next = y, i |= r;
        if (c = c.next, c === null) {
          if (c = u.shared.pending, c === null)
            break;
          y = c, c = y.next, y.next = null, u.lastBaseUpdate = y, u.shared.pending = null;
        }
      } while (!0);
      g === null && (o = _), u.baseState = o, u.firstBaseUpdate = m, u.lastBaseUpdate = g, n === null && (u.shared.lanes = 0), Wa |= i, l.lanes = i, l.memoizedState = _;
    }
  }
  function Ps(l, t) {
    if (typeof l != "function")
      throw Error(v(191, l));
    l.call(t);
  }
  function lr(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Ps(a[l], t);
  }
  var Za = Ot(null), kn = Ot(0);
  function tr(l, t) {
    l = Ma, nl(kn, l), nl(Za, t), Ma = l | t.baseLanes;
  }
  function Gc() {
    nl(kn, Ma), nl(Za, Za.current);
  }
  function Xc() {
    Ma = kn.current, Kl(Za), Kl(kn);
  }
  var nt = Ot(null), st = null;
  function Ka(l) {
    var t = l.alternate;
    nl(it, it.current & 1), nl(nt, l), st === null && (t === null || Za.current !== null || t.memoizedState !== null) && (st = l);
  }
  function Qc(l) {
    nl(it, it.current), nl(nt, l), st === null && (st = l);
  }
  function ar(l) {
    l.tag === 22 ? (nl(it, it.current), nl(nt, l), st === null && (st = l)) : Ja();
  }
  function Ja() {
    nl(it, it.current), nl(nt, nt.current);
  }
  function Ut(l) {
    Kl(nt), st === l && (st = null), Kl(it);
  }
  var it = Ot(0);
  function wu(l, t) {
    nl(nt, nt.current), nl(it, t);
  }
  function Vc(l) {
    Kl(it), Kl(nt), st === l && (st = null);
  }
  function Pn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || ro(a) || mo(a)))
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
  var Na = 0, I = null, Nl = null, wl = null, li = !1, ke = !1, Ne = !1, ti = 0, $u = 0, Pe = null, Mv = 0;
  function Ql() {
    throw Error(v(321));
  }
  function Lc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!Dt(l[a], t[a])) return !1;
    return !0;
  }
  function Zc(l, t, a, e, u, n) {
    return Na = n, I = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Y.H = l === null || l.memoizedState === null ? Gr : Xr, Ne = !1, n = a(e, u), Ne = !1, ke && (n = ur(
      t,
      a,
      e,
      u
    )), er(l), n;
  }
  function er(l) {
    Y.H = fi;
    var t = Nl !== null && Nl.next !== null;
    if (Na = 0, wl = Nl = I = null, li = !1, $u = 0, Pe = null, t) throw Error(v(300));
    l === null || $l || (l = l.dependencies, l !== null && Kn(l) && ($l = !0));
  }
  function ur(l, t, a, e) {
    I = l;
    var u = 0;
    do {
      if (ke && (Pe = null), $u = 0, ke = !1, 25 <= u) throw Error(v(301));
      if (u += 1, wl = Nl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      Y.H = Bv, n = t(a, e);
    } while (ke);
    return n;
  }
  function Dv() {
    var l = Y.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Fu(t) : t, l = l.useState()[0], (Nl !== null ? Nl.memoizedState : null) !== l && (I.flags |= 1024), t;
  }
  function Kc() {
    var l = ti !== 0;
    return ti = 0, l;
  }
  function Jc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function wc(l) {
    if (li) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      li = !1;
    }
    Na = 0, wl = Nl = I = null, ke = !1, $u = ti = 0, Pe = null;
  }
  function mt() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return wl === null ? I.memoizedState = wl = l : wl = wl.next = l, wl;
  }
  function Ll() {
    if (Nl === null) {
      var l = I.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = Nl.next;
    var t = wl === null ? I.memoizedState : wl.next;
    if (t !== null)
      wl = t, Nl = l;
    else {
      if (l === null)
        throw I.alternate === null ? Error(v(467)) : Error(v(310));
      Nl = l, l = {
        memoizedState: Nl.memoizedState,
        baseState: Nl.baseState,
        baseQueue: Nl.baseQueue,
        queue: Nl.queue,
        next: null
      }, wl === null ? I.memoizedState = wl = l : wl = wl.next = l;
    }
    return wl;
  }
  function ai() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Fu(l) {
    var t = $u;
    return $u += 1, Pe === null && (Pe = []), l = $s(Pe, l, t), t = I, (wl === null ? t.memoizedState : wl.next) === null && (t = t.alternate, Y.H = t === null || t.memoizedState === null ? Gr : Xr), l;
  }
  function ei(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Fu(l);
      if (l.$$typeof === S) return;
      if (l.$$typeof === xl) return ut(l);
    }
    throw Error(v(438, String(l)));
  }
  function $c(l) {
    var t = null, a = I.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var e = I.alternate;
      e !== null && (e = e.updateQueue, e !== null && (e = e.memoCache, e != null && (t = {
        data: e.data.map(function(u) {
          return u.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = ai(), I.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), e = 0; e < l; e++)
        a[e] = rt;
    return t.index++, a;
  }
  function Aa(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function ui(l) {
    var t = Ll();
    return Fc(t, Nl, l);
  }
  function Fc(l, t, a) {
    var e = l.queue;
    if (e === null) throw Error(v(311));
    e.lastRenderedReducer = a;
    var u = l.baseQueue, n = e.pending;
    if (n !== null) {
      if (u !== null) {
        var i = u.next;
        u.next = n.next, n.next = i;
      }
      t.baseQueue = u = n, e.pending = null;
    }
    if (n = l.baseState, u === null) l.memoizedState = n;
    else {
      t = u.next;
      var c = i = null, o = null, m = t, g = !1;
      do {
        var _ = m.lane & -536870913;
        if (_ !== m.lane ? (ol & _) === _ : (Na & _) === _) {
          var r = m.revertLane;
          if (r === 0)
            o !== null && (o = o.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: m.action,
              hasEagerState: m.hasEagerState,
              eagerState: m.eagerState,
              next: null
            }), _ === Te && (g = !0);
          else if ((Na & r) === r) {
            m = m.next, r === Te && (g = !0);
            continue;
          } else
            _ = {
              lane: 0,
              revertLane: m.revertLane,
              gesture: null,
              action: m.action,
              hasEagerState: m.hasEagerState,
              eagerState: m.eagerState,
              next: null
            }, o === null ? (c = o = _, i = n) : o = o.next = _, I.lanes |= r, Wa |= r;
          _ = m.action, Ne && a(n, _), n = m.hasEagerState ? m.eagerState : a(n, _);
        } else
          r = {
            lane: _,
            revertLane: m.revertLane,
            gesture: m.gesture,
            action: m.action,
            hasEagerState: m.hasEagerState,
            eagerState: m.eagerState,
            next: null
          }, o === null ? (c = o = r, i = n) : o = o.next = r, I.lanes |= _, Wa |= _;
        m = m.next;
      } while (m !== null && m !== t);
      if (o === null ? i = n : o.next = c, !Dt(n, l.memoizedState) && ($l = !0, g && (a = Fe, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = o, e.lastRenderedState = n;
    }
    return u === null && (e.lanes = 0), [l.memoizedState, e.dispatch];
  }
  function Wc(l) {
    var t = Ll(), a = t.queue;
    if (a === null) throw Error(v(311));
    a.lastRenderedReducer = l;
    var e = a.dispatch, u = a.pending, n = t.memoizedState;
    if (u !== null) {
      a.pending = null;
      var i = u = u.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== u);
      Dt(n, t.memoizedState) || ($l = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, e];
  }
  function nr(l, t, a) {
    var e = I, u = Ll(), n = el;
    if (n) {
      if (a === void 0) throw Error(v(407));
      a = a();
    } else a = t();
    var i = !Dt(
      (Nl || u).memoizedState,
      a
    );
    if (i && (u.memoizedState = a, $l = !0), u = u.queue, Pc(fr.bind(null, e, u, l), [
      l
    ]), l = u.getSnapshot !== t || i || wl !== null && (wl.memoizedState.tag & 1) !== 0, lu(
      l ? 9 : 8,
      { destroy: void 0 },
      cr.bind(null, e, u, a, t),
      null
    ), l) {
      if (e.flags |= 2048, pl === null) throw Error(v(349));
      n || (Na & 127) !== 0 || ir(e, t, a);
    }
    return a;
  }
  function ir(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = I.updateQueue, t === null ? (t = ai(), I.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function cr(l, t, a, e) {
    t.value = a, t.getSnapshot = e, or(t) && sr(l);
  }
  function fr(l, t, a) {
    return a(function() {
      or(t) && sr(l);
    });
  }
  function or(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !Dt(l, a);
    } catch {
      return !0;
    }
  }
  function sr(l) {
    var t = ve(l, 2);
    t !== null && _t(t, l, 2);
  }
  function Ic(l) {
    var t = mt();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Ne) {
        ja(!0);
        try {
          a();
        } finally {
          ja(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Aa,
      lastRenderedState: l
    }, t;
  }
  function rr(l, t, a, e) {
    return l.baseState = a, Fc(
      l,
      Nl,
      typeof e == "function" ? e : Aa
    );
  }
  function Uv(l, t, a, e, u) {
    if (ci(l)) throw Error(v(485));
    if (l = t.action, l !== null) {
      var n = {
        payload: u,
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
      Y.T !== null ? a(!0) : n.isTransition = !1, e(n), a = t.pending, a === null ? (n.next = t.pending = n, dr(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function dr(l, t) {
    var a = t.action, e = t.payload, u = l.state;
    if (t.isTransition) {
      var n = Y.T, i = {};
      i.types = n !== null ? n.types : null, Y.T = i;
      try {
        var c = a(u, e), o = Y.S;
        o !== null && o(i, c), mr(l, t, c);
      } catch (m) {
        kc(l, t, m);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), Y.T = n;
      }
    } else
      try {
        n = a(u, e), mr(l, t, n);
      } catch (m) {
        kc(l, t, m);
      }
  }
  function mr(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(e) {
        vr(l, t, e);
      },
      function(e) {
        return kc(l, t, e);
      }
    ) : vr(l, t, a);
  }
  function vr(l, t, a) {
    t.status = "fulfilled", t.value = a, hr(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, dr(l, a)));
  }
  function kc(l, t, a) {
    var e = l.pending;
    if (l.pending = null, e !== null) {
      e = e.next;
      do
        t.status = "rejected", t.reason = a, hr(t), t = t.next;
      while (t !== e);
    }
    l.action = null;
  }
  function hr(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function yr(l, t) {
    return t;
  }
  function gr(l, t) {
    if (el) {
      var a = pl.formState;
      if (a !== null) {
        l: {
          var e = I;
          if (el) {
            if (Ul) {
              t: {
                for (var u = Ul, n = Vt; u.nodeType !== 8; ) {
                  if (!n) {
                    u = null;
                    break t;
                  }
                  if (u = Zt(
                    u.nextSibling
                  ), u === null) {
                    u = null;
                    break t;
                  }
                }
                n = u.data, u = n === "F!" || n === "F" ? u : null;
              }
              if (u) {
                Ul = Zt(
                  u.nextSibling
                ), e = u.data === "F!";
                break l;
              }
            }
            Ya(e);
          }
          e = !1;
        }
        e && (t = a[0]);
      }
    }
    return a = mt(), a.memoizedState = a.baseState = t, e = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: yr,
      lastRenderedState: t
    }, a.queue = e, a = qr.bind(
      null,
      I,
      e
    ), e.dispatch = a, e = Ic(!1), n = uf.bind(
      null,
      I,
      !1,
      e.queue
    ), e = mt(), u = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, e.queue = u, a = Uv.bind(
      null,
      I,
      u,
      n,
      a
    ), u.dispatch = a, e.memoizedState = l, [t, a, !1];
  }
  function br(l) {
    var t = Ll();
    return Sr(t, Nl, l);
  }
  function Sr(l, t, a) {
    if (t = Fc(
      l,
      t,
      yr
    )[0], l = ui(Aa)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var e = Fu(t);
      } catch (i) {
        throw i === We ? $n : i;
      }
    else e = t;
    t = Ll();
    var u = t.queue, n = u.dispatch;
    return a !== t.memoizedState && (I.flags |= 2048, lu(
      9,
      { destroy: void 0 },
      Rv.bind(null, u, a),
      null
    )), [e, n, l];
  }
  function Rv(l, t) {
    l.action = t;
  }
  function Tr(l) {
    var t = Ll(), a = Nl;
    if (a !== null)
      return Sr(t, a, l);
    Ll(), t = t.memoizedState, a = Ll();
    var e = a.queue.dispatch;
    return a.memoizedState = l, [t, e, !1];
  }
  function lu(l, t, a, e) {
    return l = { tag: l, create: a, deps: e, inst: t, next: null }, t = I.updateQueue, t === null && (t = ai(), I.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (e = a.next, a.next = l, l.next = e, t.lastEffect = l), l;
  }
  function Er() {
    return Ll().memoizedState;
  }
  function ni(l, t, a, e) {
    var u = mt();
    I.flags |= l, u.memoizedState = lu(
      1 | t,
      { destroy: void 0 },
      a,
      e === void 0 ? null : e
    );
  }
  function ii(l, t, a, e) {
    var u = Ll();
    e = e === void 0 ? null : e;
    var n = u.memoizedState.inst;
    Nl !== null && e !== null && Lc(e, Nl.memoizedState.deps) ? u.memoizedState = lu(t, n, a, e) : (I.flags |= l, u.memoizedState = lu(
      1 | t,
      n,
      a,
      e
    ));
  }
  function zr(l, t) {
    ni(8390656, 8, l, t);
  }
  function Pc(l, t) {
    ii(2048, 8, l, t);
  }
  function jv(l) {
    I.flags |= 4;
    var t = I.updateQueue;
    if (t === null)
      t = ai(), I.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function _r(l) {
    var t = Ll().memoizedState;
    return jv({ ref: t, nextImpl: l }), function() {
      if ((gl & 2) !== 0) throw Error(v(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Or(l, t) {
    return ii(4, 2, l, t);
  }
  function Nr(l, t) {
    return ii(4, 4, l, t);
  }
  function Ar(l, t) {
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
  function pr(l, t, a) {
    a = a != null ? a.concat([l]) : null, ii(4, 4, Ar.bind(null, t, l), a);
  }
  function lf() {
  }
  function Cr(l, t) {
    var a = Ll();
    t = t === void 0 ? null : t;
    var e = a.memoizedState;
    return t !== null && Lc(t, e[1]) ? e[0] : (a.memoizedState = [l, t], l);
  }
  function Mr(l, t) {
    var a = Ll();
    t = t === void 0 ? null : t;
    var e = a.memoizedState;
    if (t !== null && Lc(t, e[1]))
      return e[0];
    if (e = l(), Ne) {
      ja(!0);
      try {
        l();
      } finally {
        ja(!1);
      }
    }
    return a.memoizedState = [e, t], e;
  }
  function tf(l, t, a) {
    return a === void 0 || (Na & 1073741824) !== 0 && (ol & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Gd(), I.lanes |= l, Wa |= l, a);
  }
  function Dr(l, t, a, e) {
    return Dt(a, t) ? a : Za.current !== null ? (l = tf(l, a, e), Dt(l, t) || ($l = !0), l) : (Na & 106) === 0 || (Na & 1073741824) !== 0 && (ol & 261930) === 0 ? ($l = !0, l.memoizedState = a) : (l = Gd(), I.lanes |= l, Wa |= l, t);
  }
  function Ur(l, t, a, e, u) {
    var n = V.p;
    V.p = n !== 0 && 8 > n ? n : 8;
    var i = Y.T, c = {};
    c.types = i !== null ? i.types : null, Y.T = c, uf(l, !1, t, a);
    try {
      var o = u(), m = Y.S;
      if (m !== null && m(c, o), o !== null && typeof o == "object" && typeof o.then == "function") {
        var g = Cv(
          o,
          e
        );
        Wu(
          l,
          t,
          g,
          Ht(l)
        );
      } else
        Wu(
          l,
          t,
          e,
          Ht(l)
        );
    } catch (_) {
      Wu(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: _ },
        Ht()
      );
    } finally {
      V.p = n, i !== null && c.types !== null && (i.types = c.types), Y.T = i;
    }
  }
  function xv() {
  }
  function af(l, t, a, e) {
    if (l.tag !== 5) throw Error(v(476));
    var u = Rr(l).queue;
    Ur(
      l,
      u,
      t,
      gt,
      a === null ? xv : function() {
        return jr(l), a(e);
      }
    );
  }
  function Rr(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: gt,
      baseState: gt,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Aa,
        lastRenderedState: gt
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
        lastRenderedReducer: Aa,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function jr(l) {
    var t = Rr(l);
    t.next === null && (t = l.alternate.memoizedState), Wu(
      l,
      t.next.queue,
      {},
      Ht()
    );
  }
  function ef() {
    return ut(Su);
  }
  function xr() {
    return Ll().memoizedState;
  }
  function Hr() {
    return Ll().memoizedState;
  }
  function Hv(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Ht();
          l = Va(a);
          var e = La(t, l, a);
          e !== null && (_t(e, t, a), Zu(e, t, a)), t = { cache: Uc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function qv(l, t, a) {
    var e = Ht();
    a = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ci(l) ? Br(t, a) : (a = zc(l, t, a, e), a !== null && (_t(a, l, e), Yr(a, t, e)));
  }
  function qr(l, t, a) {
    var e = Ht();
    Wu(l, t, a, e);
  }
  function Wu(l, t, a, e) {
    var u = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (ci(l)) Br(t, u);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (u.hasEagerState = !0, u.eagerState = c, Dt(c, i))
            return Yn(l, t, u, 0), pl === null && Bn(), !1;
        } catch {
        }
      if (a = zc(l, t, u, e), a !== null)
        return _t(a, l, e), Yr(a, t, e), !0;
    }
    return !1;
  }
  function uf(l, t, a, e) {
    if (e = {
      lane: 2,
      revertLane: Ff(),
      gesture: null,
      action: e,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ci(l)) {
      if (t) throw Error(v(479));
    } else
      t = zc(
        l,
        a,
        e,
        2
      ), t !== null && _t(t, l, 2);
  }
  function ci(l) {
    var t = l.alternate;
    return l === I || t !== null && t === I;
  }
  function Br(l, t) {
    ke = li = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function Yr(l, t, a) {
    if ((a & 4194048) !== 0) {
      var e = t.lanes;
      e &= l.pendingLanes, a |= e, t.lanes = a, Go(l, a);
    }
  }
  var fi = {
    readContext: ut,
    use: ei,
    useCallback: Ql,
    useContext: Ql,
    useEffect: Ql,
    useImperativeHandle: Ql,
    useLayoutEffect: Ql,
    useInsertionEffect: Ql,
    useMemo: Ql,
    useReducer: Ql,
    useRef: Ql,
    useState: Ql,
    useDebugValue: Ql,
    useDeferredValue: Ql,
    useTransition: Ql,
    useSyncExternalStore: Ql,
    useId: Ql,
    useHostTransitionStatus: Ql,
    useFormState: Ql,
    useActionState: Ql,
    useOptimistic: Ql,
    useMemoCache: Ql,
    useCacheRefresh: Ql,
    useEffectEvent: Ql
  }, Gr = {
    readContext: ut,
    use: ei,
    useCallback: function(l, t) {
      return mt().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: ut,
    useEffect: zr,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, ni(
        4194308,
        4,
        Ar.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return ni(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      ni(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = mt();
      t = t === void 0 ? null : t;
      var e = l();
      if (Ne) {
        ja(!0);
        try {
          l();
        } finally {
          ja(!1);
        }
      }
      return a.memoizedState = [e, t], e;
    },
    useReducer: function(l, t, a) {
      var e = mt();
      if (a !== void 0) {
        var u = a(t);
        if (Ne) {
          ja(!0);
          try {
            a(t);
          } finally {
            ja(!1);
          }
        }
      } else u = t;
      return e.memoizedState = e.baseState = u, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: u
      }, e.queue = l, l = l.dispatch = qv.bind(
        null,
        I,
        l
      ), [e.memoizedState, l];
    },
    useRef: function(l) {
      var t = mt();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Ic(l);
      var t = l.queue, a = qr.bind(null, I, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: lf,
    useDeferredValue: function(l, t) {
      var a = mt();
      return tf(a, l, t);
    },
    useTransition: function() {
      var l = Ic(!1);
      return l = Ur.bind(
        null,
        I,
        l.queue,
        !0,
        !1
      ), mt().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var e = I, u = mt();
      if (el) {
        if (a === void 0)
          throw Error(v(407));
        a = a();
      } else {
        if (a = t(), pl === null)
          throw Error(v(349));
        (ol & 127) !== 0 || ir(e, t, a);
      }
      u.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return u.queue = n, zr(fr.bind(null, e, n, l), [
        l
      ]), e.flags |= 2048, lu(
        9,
        { destroy: void 0 },
        cr.bind(
          null,
          e,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var l = mt(), t = pl.identifierPrefix;
      if (el) {
        var a = ia, e = na;
        a = (e & ~(1 << 32 - Ct(e) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = ti++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Mv++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: ef,
    useFormState: gr,
    useActionState: gr,
    useOptimistic: function(l) {
      var t = mt();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = uf.bind(
        null,
        I,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: $c,
    useCacheRefresh: function() {
      return mt().memoizedState = Hv.bind(
        null,
        I
      );
    },
    useEffectEvent: function(l) {
      var t = mt(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((gl & 2) !== 0)
          throw Error(v(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, Xr = {
    readContext: ut,
    use: ei,
    useCallback: Cr,
    useContext: ut,
    useEffect: Pc,
    useImperativeHandle: pr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Mr,
    useReducer: ui,
    useRef: Er,
    useState: function() {
      return ui(Aa);
    },
    useDebugValue: lf,
    useDeferredValue: function(l, t) {
      var a = Ll();
      return Dr(
        a,
        Nl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = ui(Aa)[0], t = Ll().memoizedState;
      return [
        typeof l == "boolean" ? l : Fu(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: xr,
    useHostTransitionStatus: ef,
    useFormState: br,
    useActionState: br,
    useOptimistic: function(l, t) {
      var a = Ll();
      return rr(a, Nl, l, t);
    },
    useMemoCache: $c,
    useCacheRefresh: Hr,
    useEffectEvent: _r
  }, Bv = {
    readContext: ut,
    use: ei,
    useCallback: Cr,
    useContext: ut,
    useEffect: Pc,
    useImperativeHandle: pr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Mr,
    useReducer: Wc,
    useRef: Er,
    useState: function() {
      return Wc(Aa);
    },
    useDebugValue: lf,
    useDeferredValue: function(l, t) {
      var a = Ll();
      return Nl === null ? tf(a, l, t) : Dr(
        a,
        Nl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Wc(Aa)[0], t = Ll().memoizedState;
      return [
        typeof l == "boolean" ? l : Fu(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: xr,
    useHostTransitionStatus: ef,
    useFormState: Tr,
    useActionState: Tr,
    useOptimistic: function(l, t) {
      var a = Ll();
      return Nl !== null ? rr(a, Nl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: $c,
    useCacheRefresh: Hr,
    useEffectEvent: _r
  };
  function nf(l, t, a, e) {
    t = l.memoizedState, a = a(e, t), a = a == null ? t : M({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var cf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var e = Ht(), u = Va(e);
      u.payload = t, a != null && (u.callback = a), t = La(l, u, e), t !== null && (_t(t, l, e), Zu(t, l, e));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var e = Ht(), u = Va(e);
      u.tag = 1, u.payload = t, a != null && (u.callback = a), t = La(l, u, e), t !== null && (_t(t, l, e), Zu(t, l, e));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = Ht(), e = Va(a);
      e.tag = 2, t != null && (e.callback = t), t = La(l, e, a), t !== null && (_t(t, l, a), Zu(t, l, a));
    }
  };
  function Qr(l, t, a, e, u, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(e, n, i) : t.prototype && t.prototype.isPureReactComponent ? !qu(a, e) || !qu(u, n) : !0;
  }
  function Vr(l, t, a, e) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, e), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, e), t.state !== l && cf.enqueueReplaceState(t, t.state, null);
  }
  function Ae(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var e in t)
        e !== "ref" && (a[e] = t[e]);
    }
    if (l = l.defaultProps) {
      a === t && (a = M({}, a));
      for (var u in l)
        a[u] === void 0 && (a[u] = l[u]);
    }
    return a;
  }
  function Lr(l) {
    qn(l);
  }
  function Zr(l) {
    console.error(l);
  }
  function Kr(l) {
    qn(l);
  }
  function oi(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function Jr(l, t, a) {
    try {
      var e = l.onCaughtError;
      e(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function ff(l, t, a) {
    return a = Va(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      oi(l, t);
    }, a;
  }
  function wr(l) {
    return l = Va(l), l.tag = 3, l;
  }
  function $r(l, t, a, e) {
    var u = a.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var n = e.value;
      l.payload = function() {
        return u(n);
      }, l.callback = function() {
        Jr(t, a, e);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Jr(t, a, e), typeof u != "function" && (Ia === null ? Ia = /* @__PURE__ */ new Set([this]) : Ia.add(this));
      var c = e.stack;
      this.componentDidCatch(e.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Yv(l, t, a, e, u) {
    if (a.flags |= 32768, e !== null && typeof e == "object" && typeof e.then == "function") {
      if (t = a.alternate, t !== null && be(
        t,
        a,
        u,
        !0
      ), a = nt.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return st === null ? Di() : a.alternate === null && Vl === 0 && (Vl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = u, e === Fn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([e]) : t.add(e), Jf(l, e, u)), !1;
          case 22:
            return a.flags |= 65536, e === Fn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([e])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([e]) : a.add(e)), Jf(l, e, u)), !1;
        }
        throw Error(v(435, a.tag));
      }
      return Jf(l, e, u), Di(), !1;
    }
    if (el)
      return t = nt.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = u, e !== pc && (l = Error(v(422), { cause: e }), Gu(Gt(l, a)))) : (e !== pc && (t = Error(v(423), {
        cause: e
      }), Gu(
        Gt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, u &= -u, l.lanes |= u, e = Gt(e, a), u = ff(
        l.stateNode,
        e,
        u
      ), Bc(l, u), Vl !== 4 && (Vl = 2)), !1;
    var n = Error(v(520), { cause: e });
    if (n = Gt(n, a), un === null ? un = [n] : un.push(n), Vl !== 4 && (Vl = 2), t === null) return !0;
    e = Gt(e, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = u & -u, a.lanes |= l, l = ff(a.stateNode, e, l), Bc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Ia === null || !Ia.has(n))))
            return a.flags |= 65536, u &= -u, a.lanes |= u, u = wr(u), $r(
              u,
              l,
              a,
              e
            ), Bc(a, u), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var of = Error(v(461)), $l = !1;
  function Il(l, t, a, e) {
    t.child = l === null ? ks(t, null, a, e) : Oe(
      t,
      l.child,
      a,
      e
    );
  }
  function Fr(l, t, a, e, u) {
    a = a.render;
    var n = t.ref;
    if ("ref" in e) {
      var i = {};
      for (var c in e)
        c !== "ref" && (i[c] = e[c]);
    } else i = e;
    return Se(t), e = Zc(
      l,
      t,
      a,
      i,
      n,
      u
    ), c = Kc(), l !== null && !$l ? (Jc(l, t, u), pa(l, t, u)) : (el && c && Vn(t), t.flags |= 1, Il(l, t, e, u), t.child);
  }
  function Wr(l, t, a, e, u) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !_c(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, Ir(
        l,
        t,
        n,
        e,
        u
      )) : (l = Xn(
        a.type,
        null,
        e,
        t,
        t.mode,
        u
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !gf(l, u)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : qu, a(i, e) && l.ref === t.ref)
        return pa(l, t, u);
    }
    return t.flags |= 1, l = Ea(n, e), l.ref = t.ref, l.return = t, t.child = l;
  }
  function Ir(l, t, a, e, u) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (qu(n, e) && l.ref === t.ref)
        if ($l = !1, t.pendingProps = e = n, gf(l, u))
          (l.flags & 131072) !== 0 && ($l = !0);
        else
          return t.lanes = l.lanes, pa(l, t, u);
    }
    return sf(
      l,
      t,
      a,
      e,
      u
    );
  }
  function kr(l, t, a, e) {
    var u = e.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), e.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, l !== null) {
          for (e = t.child = l.child, u = 0; e !== null; )
            u = u | e.lanes | e.childLanes, e = e.sibling;
          e = u & ~n;
        } else e = 0, t.child = null;
        return Pr(
          l,
          t,
          n,
          a,
          e
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && wn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? tr(t, n) : Gc(), ar(t);
      else
        return e = t.lanes = 536870912, Pr(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          e
        );
    } else
      n !== null ? (wn(t, n.cachePool), tr(t, n), Ja(), t.memoizedState = null) : (l !== null && wn(t, null), Gc(), Ja());
    return Il(l, t, u, a), t.child;
  }
  function Iu(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function Pr(l, t, a, e, u) {
    var n = jc();
    return n = n === null ? null : { parent: Jl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && wn(t, null), Gc(), ar(t), l !== null && be(l, t, e, !0), t.childLanes = u, null;
  }
  function si(l, t) {
    return t = ri(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function ld(l, t, a) {
    return Oe(t, l.child, null, a), l = si(t, t.pendingProps), l.flags |= 2, Ut(t), t.memoizedState = null, l;
  }
  function Gv(l, t, a) {
    var e = t.pendingProps, u = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (el) {
        if (e.mode === "hidden")
          return l = si(t, e), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Iu(null, l);
        if (Qc(t), (l = Ul) ? (l = Am(
          l,
          Vt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: qa !== null ? { id: na, overflow: ia } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Bs(l), a.return = t, t.child = a, Pl = t, Ul = null)) : l = null, l === null) throw Ya(t);
        return t.lanes = 536870912, null;
      }
      return si(t, e);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Qc(t), u)
        if (t.flags & 256)
          t.flags &= -257, t = ld(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(v(558));
      else if ($l || be(l, t, a, !1), u = (a & l.childLanes) !== 0, $l || u) {
        if (Za.current === null) {
          if (e = pl, e !== null && (i = Xo(e, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, ve(l, i), _t(e, l, i), of;
          Di();
        }
        t = ld(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, Ul = Zt(i.nextSibling), Pl = t, el = !0, Ba = null, Vt = !1, l !== null && Xs(t, l), t = si(t, e), t.flags |= 134221824;
      return t;
    }
    return l = Ea(l.child, {
      mode: e.mode,
      children: e.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function tu(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(v(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function sf(l, t, a, e, u) {
    return Se(t), a = Zc(
      l,
      t,
      a,
      e,
      void 0,
      u
    ), e = Kc(), l !== null && !$l ? (Jc(l, t, u), pa(l, t, u)) : (el && e && Vn(t), t.flags |= 1, Il(l, t, a, u), t.child);
  }
  function td(l, t, a, e, u, n) {
    return Se(t), t.updateQueue = null, a = ur(
      t,
      e,
      a,
      u
    ), er(l), e = Kc(), l !== null && !$l ? (Jc(l, t, n), pa(l, t, n)) : (el && e && Vn(t), t.flags |= 1, Il(l, t, a, n), t.child);
  }
  function ad(l, t, a, e, u) {
    if (Se(t), t.stateNode === null) {
      var n = Ke, i = a.contextType;
      typeof i == "object" && i !== null && (n = ut(i)), n = new a(e, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = cf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = e, n.state = t.memoizedState, n.refs = {}, Hc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? ut(i) : Ke, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (nf(
        t,
        a,
        i,
        e
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && cf.enqueueReplaceState(n, n.state, null), Ju(t, e, n, u), Ku(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), e = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, o = Ae(a, c);
      n.props = o;
      var m = n.context, g = a.contextType;
      i = Ke, typeof g == "object" && g !== null && (i = ut(g));
      var _ = a.getDerivedStateFromProps;
      g = typeof _ == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || m !== i) && Vr(
        t,
        n,
        e,
        i
      ), Qa = !1;
      var r = t.memoizedState;
      n.state = r, Ju(t, e, n, u), Ku(), m = t.memoizedState, c || r !== m || Qa ? (typeof _ == "function" && (nf(
        t,
        a,
        _,
        e
      ), m = t.memoizedState), (o = Qa || Qr(
        t,
        a,
        o,
        e,
        r,
        m,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = e, t.memoizedState = m), n.props = e, n.state = m, n.context = i, e = o) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), e = !1);
    } else {
      n = t.stateNode, qc(l, t), i = t.memoizedProps, g = Ae(a, i), n.props = g, _ = t.pendingProps, r = n.context, m = a.contextType, o = Ke, typeof m == "object" && m !== null && (o = ut(m)), c = a.getDerivedStateFromProps, (m = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== _ || r !== o) && Vr(
        t,
        n,
        e,
        o
      ), Qa = !1, r = t.memoizedState, n.state = r, Ju(t, e, n, u), Ku();
      var y = t.memoizedState;
      i !== _ || r !== y || Qa || l !== null && l.dependencies !== null && Kn(l.dependencies) ? (typeof c == "function" && (nf(
        t,
        a,
        c,
        e
      ), y = t.memoizedState), (g = Qa || Qr(
        t,
        a,
        g,
        e,
        r,
        y,
        o
      ) || l !== null && l.dependencies !== null && Kn(l.dependencies)) ? (m || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(e, y, o), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        e,
        y,
        o
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), t.memoizedProps = e, t.memoizedState = y), n.props = e, n.state = y, n.context = o, e = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), e = !1);
    }
    return n = e, tu(l, t), e = (t.flags & 128) !== 0, n || e ? (n = t.stateNode, a = e && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && e ? (t.child = Oe(
      t,
      l.child,
      null,
      u
    ), t.child = Oe(
      t,
      null,
      a,
      u
    )) : Il(l, t, a, u), t.memoizedState = n.state, l = t.child) : l = pa(
      l,
      t,
      u
    ), l;
  }
  function ed(l, t, a, e) {
    return ye(), t.flags |= 256, Il(l, t, a, e), t.child;
  }
  var rf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function df(l) {
    return { baseLanes: l, cachePool: Js() };
  }
  function mf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= xt), l;
  }
  function ud(l, t, a) {
    var e = t.pendingProps, u = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (it.current & 2) !== 0), i && (u = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (el) {
        if (u ? Ka(t) : Ja(), (l = Ul) ? (l = Am(
          l,
          Vt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: qa !== null ? { id: na, overflow: ia } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Bs(l), a.return = t, t.child = a, Pl = t, Ul = null)) : l = null, l === null) throw Ya(t);
        return mo(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = e.children, e = e.fallback, u ? (Ja(), u = t.mode, n = ri(
        { mode: "hidden", children: n },
        u
      ), e = he(
        e,
        u,
        a,
        null
      ), n.return = t, e.return = t, n.sibling = e, t.child = n, e = t.child, e.memoizedState = df(a), e.childLanes = mf(
        l,
        i,
        a
      ), t.memoizedState = rf, Iu(null, e)) : (Ka(t), vf(t, n));
    }
    var c = l.memoizedState;
    if (c !== null) {
      var o = c.dehydrated;
      if (o !== null)
        return Xv(
          l,
          t,
          n,
          i,
          e,
          o,
          c,
          a
        );
    }
    return u ? (Ja(), u = e.fallback, n = t.mode, c = l.child, o = c.sibling, e = Ea(c, {
      mode: "hidden",
      children: e.children
    }), e.subtreeFlags = c.subtreeFlags & 1206910976, o !== null ? u = Ea(o, u) : (u = he(
      u,
      n,
      a,
      null
    ), u.flags |= 2), u.return = t, e.return = t, e.sibling = u, t.child = e, Iu(null, e), e = t.child, u = l.child.memoizedState, u === null ? u = df(a) : (n = u.cachePool, n !== null ? (c = Jl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Js(), u = {
      baseLanes: u.baseLanes | a,
      cachePool: n
    }), e.memoizedState = u, e.childLanes = mf(
      l,
      i,
      a
    ), t.memoizedState = rf, Iu(l.child, e)) : (Ka(t), a = l.child, l = a.sibling, a = Ea(a, {
      mode: "visible",
      children: e.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function vf(l, t) {
    return t = ri(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function ri(l, t) {
    return l = St(22, l, null, t), l.lanes = 0, l;
  }
  function di(l, t, a) {
    return Oe(t, l.child, null, a), l = vf(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Xv(l, t, a, e, u, n, i, c) {
    if (a)
      return t.flags & 256 ? (Ka(t), t.flags &= -257, di(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Ja(), t.child = l.child, t.flags |= 128, null) : (Ja(), n = u.fallback, i = t.mode, u = ri(
        { mode: "visible", children: u.children },
        i
      ), n = he(
        n,
        i,
        c,
        null
      ), n.flags |= 2, u.return = t, n.return = t, u.sibling = n, t.child = u, Oe(t, l.child, null, c), u = t.child, u.memoizedState = df(c), u.childLanes = mf(
        l,
        e,
        c
      ), t.memoizedState = rf, Iu(null, u));
    if (Ka(t), mo(n)) {
      if (e = n.nextSibling && n.nextSibling.dataset, e) var o = e.dgst;
      return e = o, e !== "" && (u = Error(v(419)), u.stack = "", u.digest = e, Gu({ value: u, source: null, stack: null })), di(
        l,
        t,
        c
      );
    }
    if ($l || be(l, t, c, !1), e = (c & l.childLanes) !== 0, $l || e) {
      if (Za.current !== null)
        return di(
          l,
          t,
          c
        );
      if (e = pl, e !== null && (u = Xo(
        e,
        c
      ), u !== 0 && u !== i.retryLane))
        throw i.retryLane = u, ve(l, u), _t(e, l, u), of;
      return ro(n) || Di(), di(
        l,
        t,
        c
      );
    }
    return ro(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, Ul = Zt(n.nextSibling), Pl = t, el = !0, Ba = null, Vt = !1, l !== null && Xs(t, l), t = vf(
      t,
      u.children
    ), t.flags |= 134221824, t);
  }
  function nd(l, t, a) {
    l.lanes |= t;
    var e = l.alternate;
    e !== null && (e.lanes |= t), Zn(l.return, t, a);
  }
  function id(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && Pn(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function mi(l, t, a, e, u, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: e,
      tail: a,
      tailMode: u,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = e, i.tail = a, i.tailMode = u, i.treeForkCount = n);
  }
  function hf(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function yf(l, t, a) {
    var e = t.pendingProps, u = e.revealOrder, n = e.tail;
    e = e.children;
    var i = it.current;
    if (t.flags & 128)
      return wu(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, wu(t, i), u === "backwards" && l !== null ? (hf(l), Il(l, t, e, a), hf(l)) : Il(l, t, e, a), e = el ? Yu : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && nd(l, a, t);
        else if (l.tag === 19)
          nd(l, a, t);
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
    switch (u) {
      case "backwards":
        a = id(t.child), a === null ? (u = t.child, t.child = null) : (u = a.sibling, a.sibling = null, hf(t)), mi(
          t,
          !0,
          u,
          null,
          n,
          e
        );
        break;
      case "unstable_legacy-backwards":
        for (a = null, u = t.child, t.child = null; u !== null; ) {
          if (l = u.alternate, l !== null && Pn(l) === null) {
            t.child = u;
            break;
          }
          l = u.sibling, u.sibling = a, a = u, u = l;
        }
        mi(
          t,
          !0,
          a,
          null,
          n,
          e
        );
        break;
      case "together":
        mi(
          t,
          !1,
          null,
          null,
          void 0,
          e
        );
        break;
      case "independent":
        t.memoizedState = null;
        break;
      default:
        a = id(t.child), a === null ? (u = t.child, t.child = null) : (u = a.sibling, a.sibling = null), mi(
          t,
          !1,
          u,
          a,
          n,
          e
        );
    }
    return t.child;
  }
  function cd(l, t, a) {
    var e = t.pendingProps;
    return Ga(t, t.type, e.value), Il(l, t, e.children, a), t.child;
  }
  function pa(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), Wa |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (be(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(v(153));
    if (t.child !== null) {
      for (l = t.child, a = Ea(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Ea(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function gf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && Kn(l)));
  }
  function Qv(l, t, a) {
    switch (t.tag) {
      case 3:
        ce(t, t.stateNode.containerInfo), Ga(t, Jl, l.memoizedState.cache), ye();
        break;
      case 27:
      case 5:
        wt(t);
        break;
      case 4:
        ce(t, t.stateNode.containerInfo);
        break;
      case 10:
        Ga(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Qc(t), null;
        break;
      case 13:
        var e = t.memoizedState;
        if (e !== null) {
          if (e.dehydrated !== null)
            return Ka(t), t.flags |= 128, null;
          e = be(
            l,
            t,
            a,
            !1
          );
          var u = t.child.childLanes;
          return e || (a & u) !== 0 ? ud(l, t, a) : (Ka(t), l = pa(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        Ka(t);
        break;
      case 19:
        if (t.flags & 128)
          return yf(
            l,
            t,
            a
          );
        if (u = (l.flags & 128) !== 0, e = (a & t.childLanes) !== 0, e || (be(
          l,
          t,
          a,
          !1
        ), e = (a & t.childLanes) !== 0), u) {
          if (e)
            return yf(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (u = t.memoizedState, u !== null && (u.rendering = null, u.tail = null, u.lastEffect = null), wu(t, it.current), e) break;
        return null;
      case 22:
        return t.lanes = 0, kr(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        Ga(t, Jl, l.memoizedState.cache);
    }
    return pa(l, t, a);
  }
  function fd(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        $l = !0;
      else {
        if (!gf(l, a) && (t.flags & 128) === 0)
          return $l = !1, Qv(
            l,
            t,
            a
          );
        $l = (l.flags & 131072) !== 0;
      }
    else
      $l = !1, el && (t.flags & 1048576) !== 0 && Gs(t, Yu, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var e = t.pendingProps;
          if (l = ze(t.elementType), t.type = l, typeof l == "function")
            _c(l) ? (e = Ae(l, e), t.tag = 1, t = ad(
              null,
              t,
              l,
              e,
              a
            )) : (t.tag = 0, t = sf(
              null,
              t,
              l,
              e,
              a
            ));
          else {
            if (l != null) {
              var u = l.$$typeof;
              if (u === A) {
                t.tag = 11, t = Fr(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break l;
              } else if (u === fl) {
                t.tag = 14, t = Wr(
                  null,
                  t,
                  l,
                  e,
                  a
                );
                break l;
              } else if (u === xl) {
                t.tag = 10, t.type = l, t = cd(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = P(l) || l, Error(v(306, t, ""));
          }
        }
        return t;
      case 0:
        return sf(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return e = t.type, u = Ae(
          e,
          t.pendingProps
        ), ad(
          l,
          t,
          e,
          u,
          a
        );
      case 3:
        l: {
          if (ce(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(v(387));
          e = t.pendingProps;
          var n = t.memoizedState;
          u = n.element, qc(l, t), Ju(t, e, null, a);
          var i = t.memoizedState;
          if (e = i.cache, Ga(t, Jl, e), e !== n.cache && Dc(
            t,
            [Jl],
            a,
            !0
          ), Ku(), e = i.element, n.isDehydrated)
            if (n = {
              element: e,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = ed(
                l,
                t,
                e,
                a
              );
              break l;
            } else if (e !== u) {
              u = Gt(
                Error(v(424)),
                t
              ), Gu(u), t = ed(
                l,
                t,
                e,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, Ul = Zt(l.firstChild), Pl = t, el = !0, Ba = null, Vt = !0, a = ks(
                t,
                null,
                e,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (ye(), e === u) {
              t = pa(
                l,
                t,
                a
              );
              break l;
            }
            Il(l, t, e, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return tu(l, t), l === null ? (a = jm(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : el || (t.stateNode = dm(
          t.type,
          t.pendingProps,
          Jt.current,
          t
        )) : t.memoizedState = jm(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return wt(t), l === null && el && (e = t.stateNode = Mm(
          t.type,
          t.pendingProps,
          Jt.current
        ), Pl = t, Vt = !0, u = Ul, le(t.type) ? (vo = u, Ul = Zt(e.firstChild)) : Ul = u), Il(
          l,
          t,
          t.pendingProps.children,
          a
        ), tu(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && el && ((u = e = Ul) && (e = Hh(
          e,
          t.type,
          t.pendingProps,
          Vt
        ), e !== null ? (t.stateNode = e, Pl = t, Ul = Zt(e.firstChild), Vt = !1, u = !0) : u = !1), u || Ya(t)), wt(t), u = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, e = n.children, uo(u, n) ? e = null : i !== null && uo(u, i) && (t.flags |= 32), t.memoizedState !== null && (u = Zc(
          l,
          t,
          Dv,
          null,
          null,
          a
        ), Su._currentValue = u), tu(l, t), Il(l, t, e, a), t.child;
      case 6:
        return l === null && el && ((l = a = Ul) && (a = qh(
          a,
          t.pendingProps,
          Vt
        ), a !== null ? (t.stateNode = a, Pl = t, Ul = null, l = !0) : l = !1), l || Ya(t)), null;
      case 13:
        return ud(l, t, a);
      case 4:
        return ce(
          t,
          t.stateNode.containerInfo
        ), e = t.pendingProps, l === null ? t.child = Oe(
          t,
          null,
          e,
          a
        ) : Il(l, t, e, a), t.child;
      case 11:
        return Fr(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return e = t.pendingProps, tu(l, t), Il(l, t, e, a), t.child;
      case 8:
        return Il(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Il(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return cd(l, t, a);
      case 9:
        return u = t.type._context, e = t.pendingProps.children, Se(t), u = ut(u), e = e(u), t.flags |= 1, Il(l, t, e, a), t.child;
      case 14:
        return Wr(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return Ir(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return yf(l, t, a);
      case 31:
        return Gv(l, t, a);
      case 22:
        return kr(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return Se(t), e = ut(Jl), l === null ? (u = jc(), u === null && (u = pl, n = Uc(), u.pooledCache = n, n.refCount++, n !== null && (u.pooledCacheLanes |= a), u = n), t.memoizedState = { parent: e, cache: u }, Hc(t), Ga(t, Jl, u)) : ((l.lanes & a) !== 0 && (qc(l, t), Ju(t, null, null, a), Ku()), u = l.memoizedState, n = t.memoizedState, u.parent !== e ? (u = { parent: e, cache: e }, t.memoizedState = u, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = u), Ga(t, Jl, e)) : (e = n.cache, Ga(t, Jl, e), e !== u.cache && Dc(
          t,
          [Jl],
          a,
          !0
        ))), Il(
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
        }), e = t.pendingProps, e.name != null && e.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : el && Vn(t), l !== null && l.memoizedProps.name !== e.name ? t.flags |= 4194816 : tu(l, t), Il(l, t, e.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(v(156, t.tag));
  }
  function Ca(l) {
    l.flags |= 4;
  }
  function bf(l, t, a, e, u) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? Bm(t, e) : Bm(t, e) && (e.src !== a.src || e.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (u & 335544128) === u)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Ld()) l.flags |= 8192;
        else
          throw _e = Fn, xc;
    } else l.flags &= -16777217;
  }
  function od(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !Ym(t))
      if (Ld()) l.flags |= 8192;
      else
        throw _e = Fn, xc;
  }
  function vi(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Bo() : 536870912, l.lanes |= t, iu |= t);
  }
  function ku(l, t) {
    if (!el)
      switch (l.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var a = l.tail, e = null; a !== null; )
            a.alternate !== null && (e = a), a = a.sibling;
          e === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : e.sibling = null;
          break;
        default:
          for (t = l.tail, a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? l.tail = null : a.sibling = null;
      }
  }
  function Rl(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, e = 0;
    if (t)
      for (var u = l.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags & 1206910976, e |= u.flags & 1206910976, u.return = l, u = u.sibling;
    else
      for (u = l.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags, e |= u.flags, u.return = l, u = u.sibling;
    return l.subtreeFlags |= e, l.childLanes = a, t;
  }
  function Vv(l, t, a) {
    var e = t.pendingProps;
    switch (Ac(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Rl(t), null;
      case 1:
        return Rl(t), null;
      case 3:
        return a = t.stateNode, e = null, l !== null && (e = l.memoizedState.cache), t.memoizedState.cache !== e && (t.flags |= 2048), Oa(Jl), ha(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && ($e(t) ? Ca(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Cc())), Rl(t), null;
      case 26:
        var u = t.type, n = t.memoizedState;
        return l === null ? (Ca(t), n !== null ? (Rl(t), od(t, n)) : (Rl(t), bf(
          t,
          u,
          null,
          e,
          a
        ))) : n ? n !== l.memoizedState ? (Ca(t), Rl(t), od(t, n)) : (Rl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== e && Ca(t), Rl(t), bf(
          t,
          u,
          l,
          e,
          a
        )), null;
      case 27:
        if (Ra(t), a = Jt.current, u = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== e && Ca(t);
        else {
          if (!e) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Rl(t), t.subtreeFlags &= -33554433, null;
          }
          l = Nt.current, $e(t) ? Qs(t) : (l = Mm(u, e, a), t.stateNode = l, Ca(t));
        }
        return Rl(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (Ra(t), u = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== e && Ca(t);
        else {
          if (!e) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Rl(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = Nt.current, $e(t))
            Qs(t);
          else {
            var i = sn(
              Jt.current
            );
            switch (n) {
              case 1:
                n = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  u
                );
                break;
              case 2:
                n = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  u
                );
                break;
              default:
                switch (u) {
                  case "svg":
                    n = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      u
                    );
                    break;
                  case "math":
                    n = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      u
                    );
                    break;
                  case "script":
                    n = i.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(
                      n.firstChild
                    );
                    break;
                  case "select":
                    n = typeof e.is == "string" ? i.createElement("select", {
                      is: e.is
                    }) : i.createElement("select"), e.multiple ? n.multiple = !0 : e.size && (n.size = e.size);
                    break;
                  default:
                    n = typeof e.is == "string" ? i.createElement(u, { is: e.is }) : i.createElement(u);
                }
            }
            n[et] = t, n[bt] = e;
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
            l: switch (ft(n, u, e), u) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                e = !!e.autoFocus;
                break l;
              case "img":
                e = !0;
                break l;
              default:
                e = !1;
            }
            e && Ca(t);
          }
        }
        return Rl(t), t.subtreeFlags &= -33554433, bf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== e && Ca(t);
        else {
          if (typeof e != "string" && t.stateNode === null)
            throw Error(v(166));
          if (l = Jt.current, $e(t)) {
            if (l = t.stateNode, a = t.memoizedProps, e = null, u = Pl, u !== null)
              switch (u.tag) {
                case 27:
                case 5:
                  e = u.memoizedProps;
              }
            l[et] = t, l = !!(l.nodeValue === a || e !== null && e.suppressHydrationWarning === !0 || fm(l.nodeValue, a)), l || Ya(t, !0);
          } else
            l = sn(l).createTextNode(
              e
            ), l[et] = t, t.stateNode = l;
        }
        return Rl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (e = $e(t), a !== null) {
            if (l === null) {
              if (!e) throw Error(v(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(557));
              l[et] = t;
            } else
              ye(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Rl(t), l = !1;
          } else
            a = Cc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Ut(t), t) : (Ut(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(v(558));
        }
        return Rl(t), null;
      case 13:
        if (e = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (u = $e(t), e !== null && e.dehydrated !== null) {
            if (l === null) {
              if (!u) throw Error(v(318));
              if (u = t.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(v(317));
              u[et] = t;
            } else
              ye(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Rl(t), u = !1;
          } else
            u = Cc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = u), u = !0;
          if (!u)
            return t.flags & 256 ? (Ut(t), t) : (Ut(t), null);
        }
        return Ut(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = e !== null, l = l !== null && l.memoizedState !== null, a && (e = t.child, u = null, e.alternate !== null && e.alternate.memoizedState !== null && e.alternate.memoizedState.cachePool !== null && (u = e.alternate.memoizedState.cachePool.pool), n = null, e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), n !== u && (e.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), vi(t, t.updateQueue), Rl(t), null);
      case 4:
        return ha(), l === null && Pf(t.stateNode.containerInfo), t.flags |= 67108864, Rl(t), null;
      case 10:
        return Oa(t.type), Rl(t), null;
      case 19:
        if (Vc(t), e = t.memoizedState, e === null) return Rl(t), null;
        if (u = (t.flags & 128) !== 0, n = e.rendering, n === null)
          if (u) ku(e, !1);
          else {
            if (Vl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Pn(l), n !== null) {
                  for (t.flags |= 128, ku(e, !1), l = n.updateQueue, t.updateQueue = l, vi(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    qs(a, l), a = a.sibling;
                  return wu(
                    t,
                    it.current & 1 | 2
                  ), el && za(t, e.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            e.tail !== null && At() > Ai && (t.flags |= 128, u = !0, ku(e, !1), t.lanes = 4194304);
          }
        else {
          if (!u)
            if (l = Pn(n), l !== null) {
              if (t.flags |= 128, u = !0, l = l.updateQueue, t.updateQueue = l, vi(t, l), ku(e, !0), e.tail === null && e.tailMode !== "collapsed" && e.tailMode !== "visible" && !n.alternate && !el)
                return Rl(t), null;
            } else
              2 * At() - e.renderingStartTime > Ai && a !== 536870912 && (t.flags |= 128, u = !0, ku(e, !1), t.lanes = 4194304);
          e.isBackwards ? (n.sibling = t.child, t.child = n) : (l = e.last, l !== null ? l.sibling = n : t.child = n, e.last = n);
        }
        if (e.tail !== null) {
          l = e.tail;
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
          return e.rendering = l, e.tail = l.sibling, e.renderingStartTime = At(), l.sibling = null, n = it.current, n = u ? n & 1 | 2 : n & 1, e.tailMode === "visible" || e.tailMode === "collapsed" || !a || el ? wu(t, n) : (a = n, nl(nt, t), nl(it, a), st === null && (st = t)), el && za(t, e.treeForkCount), l;
        }
        return Rl(t), null;
      case 22:
      case 23:
        return Ut(t), Xc(), e = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== e && (t.flags |= 8192) : e && (t.flags |= 8192), e ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Rl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Rl(t), a = t.updateQueue, a !== null && vi(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== a && (t.flags |= 2048), l !== null && Kl(Ee), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Oa(Jl), Rl(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Rl(t), null;
    }
    throw Error(v(156, t.tag));
  }
  function Lv(l, t) {
    switch (Ac(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Oa(Jl), ha(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return Ra(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Ut(t), t.alternate === null)
            throw Error(v(340));
          ye();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Ut(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(v(340));
          ye();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Vc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return ha(), null;
      case 10:
        return Oa(t.type), null;
      case 22:
      case 23:
        return Ut(t), Xc(), l !== null && Kl(Ee), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Oa(Jl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function sd(l, t) {
    switch (Ac(t), t.tag) {
      case 3:
        Oa(Jl), ha();
        break;
      case 26:
      case 27:
      case 5:
        Ra(t);
        break;
      case 4:
        ha();
        break;
      case 31:
        t.memoizedState !== null && Ut(t);
        break;
      case 13:
        Ut(t);
        break;
      case 19:
        Vc(t);
        break;
      case 10:
        Oa(t.type);
        break;
      case 22:
      case 23:
        Ut(t), Xc(), l !== null && Kl(Ee);
        break;
      case 24:
        Oa(Jl);
    }
  }
  function Pu(l, t) {
    try {
      var a = t.updateQueue, e = a !== null ? a.lastEffect : null;
      if (e !== null) {
        var u = e.next;
        a = u;
        do {
          if ((a.tag & l) === l) {
            e = void 0;
            var n = a.create, i = a.inst;
            e = n(), i.destroy = e;
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (c) {
      El(t, t.return, c);
    }
  }
  function wa(l, t, a) {
    try {
      var e = t.updateQueue, u = e !== null ? e.lastEffect : null;
      if (u !== null) {
        var n = u.next;
        e = n;
        do {
          if ((e.tag & l) === l) {
            var i = e.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, u = t;
              var o = a, m = c;
              try {
                m();
              } catch (g) {
                El(
                  u,
                  o,
                  g
                );
              }
            }
          }
          e = e.next;
        } while (e !== n);
      }
    } catch (g) {
      El(t, t.return, g);
    }
  }
  function rd(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        lr(t, a);
      } catch (e) {
        El(l, l.return, e);
      }
    }
  }
  function dd(l, t, a) {
    a.props = Ae(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (e) {
      El(l, t, e);
    }
  }
  function ca(l, t) {
    try {
      var a = l.ref;
      if (a !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var e = l.stateNode;
            break;
          case 30:
            var u = l.stateNode, n = Sa(l.memoizedProps, u);
            (u.ref === null || u.ref.name !== n) && (u.ref = Sm(n)), e = u.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new qt(l);
              T(
                l.child,
                !1,
                jh,
                i,
                void 0,
                void 0
              ), l.stateNode = i;
            }
            e = l.stateNode;
            break;
          default:
            e = l.stateNode;
        }
        typeof a == "function" ? l.refCleanup = a(e) : a.current = e;
      }
    } catch (c) {
      El(l, t, c);
    }
  }
  function ct(l, t) {
    var a = l.ref, e = l.refCleanup;
    if (a !== null)
      if (typeof e == "function")
        try {
          e();
        } catch (u) {
          El(l, t, u);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (u) {
          El(l, t, u);
        }
      else a.current = null;
  }
  function hi(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        Nm(
          l.stateNode,
          t[a]
        );
  }
  function md(l) {
    for (var t = l.return; t !== null && (Tf(t) && Nm(l.stateNode, t.stateNode), !Sf(t)); )
      t = t.return;
  }
  function ln(l) {
    for (var t = l.return; t !== null && (Tf(t) && xh(l.stateNode, t.stateNode), !Sf(t)); )
      t = t.return;
  }
  function Sf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function Tf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function Ef(l) {
    var t = l.type, a = l.memoizedProps, e = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && e.focus();
          break l;
        case "img":
          a.src ? e.src = a.src : a.srcSet && (e.srcset = a.srcSet);
      }
    } catch (u) {
      El(l, l.return, u);
    }
  }
  function zf(l, t, a) {
    try {
      var e = l.stateNode;
      hh(e, l.type, a, t), e[bt] = t;
    } catch (u) {
      El(l, l.return, u);
    }
  }
  function vd(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && le(l.type) || l.tag === 4;
  }
  function _f(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || vd(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && le(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Of(l, t, a, e) {
    var u = l.tag;
    if (u === 5 || u === 6)
      u = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(u, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(u), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = ua)), hi(l, e), hl = !0;
    else if (u !== 4 && (u === 27 && (hi(l, e), e = null, le(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (Of(
        l,
        t,
        a,
        e
      ), l = l.sibling; l !== null; )
        Of(
          l,
          t,
          a,
          e
        ), l = l.sibling;
  }
  function yi(l, t, a, e) {
    var u = l.tag;
    if (u === 5 || u === 6)
      u = l.stateNode, t ? a.insertBefore(u, t) : a.appendChild(u), hi(l, e), hl = !0;
    else if (u !== 4 && (u === 27 && (hi(l, e), e = null, le(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (yi(
        l,
        t,
        a,
        e
      ), l = l.sibling; l !== null; )
        yi(
          l,
          t,
          a,
          e
        ), l = l.sibling;
  }
  function hd(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var e = l.type, u = t.attributes; u.length; )
        t.removeAttributeNode(u[0]);
      ft(t, e, a), t[et] = l, t[bt] = a;
    } catch (n) {
      El(l, l.return, n);
    }
  }
  var gi = !1, Rt = null;
  function yd(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (gi = !0);
  }
  var fa = null;
  function gd() {
    var l = fa;
    return fa = null, l;
  }
  var Tt = 0;
  function au(l, t, a, e, u) {
    return Tt = 0, bd(
      l.child,
      t,
      a,
      e,
      u
    );
  }
  function bd(l, t, a, e, u) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (e !== null) {
          var c = co(i);
          e.push(c), c.view && (n = !0);
        } else
          n || co(i).view && (n = !0);
        gi = !0, gm(
          i,
          Tt === 0 ? t : t + "_" + Tt,
          a
        ), Tt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && u || bd(
        l.child,
        t,
        a,
        e,
        u
      ) && (n = !0));
      l = l.sibling;
    }
    return n;
  }
  function oa(l, t) {
    for (; l !== null; )
      l.tag === 5 ? bm(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || oa(
        l.child,
        t
      )), l = l.sibling;
  }
  function bi(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (bi(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(v(544));
          var a = t.name;
          t = Ta(t.default, t.share), t !== "none" && (au(
            l,
            a,
            t,
            null,
            !1
          ) || oa(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function Nf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, e = l.memoizedProps, u = Sa(e, a), n = Ta(
        e.default,
        a.paired ? e.share : e.enter
      );
      n !== "none" ? au(l, u, n, null, !1) ? (bi(l), a.paired || t || su(l, e.onEnter)) : oa(l.child, !1) : bi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Nf(l, t), l = l.sibling;
    else bi(l);
  }
  function Af(l) {
    if (Rt !== null && Rt.size !== 0) {
      var t = Rt;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var a = l.memoizedProps, e = a.name;
              if (e != null && e !== "auto") {
                var u = t.get(e);
                if (u !== void 0) {
                  var n = Ta(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (au(
                    l,
                    e,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, u.paired = n, n.paired = u, su(l, a.onShare)) : oa(l.child, !1)), t.delete(e), t.size === 0) break;
                }
              }
            }
            Af(l);
          }
          l = l.sibling;
        }
    }
  }
  function pf(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = Sa(t, l.stateNode), e = Rt !== null ? Rt.get(a) : void 0, u = Ta(
        t.default,
        e !== void 0 ? t.share : t.exit
      );
      u !== "none" && (au(l, a, u, null, !1) ? e !== void 0 ? (u = l.stateNode, e.paired = u, u.paired = e, Rt.delete(a), su(l, t.onShare)) : su(l, t.onExit) : oa(l.child, !1)), Rt !== null && Af(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        pf(l), l = l.sibling;
    else
      Rt !== null && Af(l);
  }
  function Sd(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = Sa(t, l.stateNode);
        t = Ta(t.default, t.update), l.flags &= -5, t !== "none" && au(
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
  function Cf(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, oa(l.child, !1));
          }
          Cf(l);
        }
        l = l.sibling;
      }
  }
  function Si(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, oa(l.child, !1), Cf(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Si(l), l = l.sibling;
    else Cf(l);
  }
  function Td(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? oa(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && Td(l), l = l.sibling;
  }
  function Mf(l, t, a, e, u, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var o = t.stateNode;
        if (n !== null && Tt < n.length) {
          var m = n[Tt], g = co(o);
          (m.view || g.view) && (c = !0);
          var _;
          if (_ = (l.flags & 4) === 0)
            if (g.clip) _ = !0;
            else {
              _ = m.rect;
              var r = g.rect;
              _ = _.y !== r.y || _.x !== r.x || _.height !== r.height || _.width !== r.width;
            }
          _ && (l.flags |= 4), g.abs ? g = !m.abs : (m = m.rect, g = g.rect, g = m.height !== g.height || m.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && gm(
          o,
          Tt === 0 ? a : a + "_" + Tt,
          u
        ), c && (l.flags & 4) !== 0 || (fa === null && (fa = []), fa.push(
          o,
          Tt === 0 ? e : e + "_" + Tt,
          t.memoizedProps
        )), Tt++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : Mf(
        l,
        t.child,
        a,
        e,
        u,
        n,
        i
      ) && (c = !0));
      t = t.sibling;
    }
    return c;
  }
  function Ed(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, e = l.stateNode, u = Sa(a, e), n = Ta(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, e = l;
        var c = l.child;
        Tt = 0, u = Mf(
          e,
          c,
          u,
          u,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && u && su(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && Ed(l);
      l = l.sibling;
    }
  }
  var lt = !1, bl = !1, sa = !1, Df = !1, zd = typeof WeakSet == "function" ? WeakSet : Set, tt = null, ra = !1, tn = !1, Ti = !1, Uf = !1;
  function Zv(l, t, a) {
    if (l = l.containerInfo, ao = Tu, l = As(l), yc(l)) {
      if ("selectionStart" in l)
        var e = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          e = (e = l.ownerDocument) && e.defaultView || window;
          var u = e.getSelection && e.getSelection();
          if (u && u.rangeCount !== 0) {
            e = u.anchorNode;
            var n = u.anchorOffset, i = u.focusNode;
            u = u.focusOffset;
            try {
              e.nodeType, i.nodeType;
            } catch {
              e = null;
              break l;
            }
            var c = 0, o = -1, m = -1, g = 0, _ = 0, r = l, y = null;
            t: for (; ; ) {
              for (var p; r !== e || n !== 0 && r.nodeType !== 3 || (o = c + n), r !== i || u !== 0 && r.nodeType !== 3 || (m = c + u), r.nodeType === 3 && (c += r.nodeValue.length), (p = r.firstChild) !== null; )
                y = r, r = p;
              for (; ; ) {
                if (r === l) break t;
                if (y === e && ++g === n && (o = c), y === i && ++_ === u && (m = c), (p = r.nextSibling) !== null) break;
                r = y, y = r.parentNode;
              }
              r = p;
            }
            e = o === -1 || m === -1 ? null : { start: o, end: m };
          } else e = null;
        }
      e = e || { start: 0, end: 0 };
    } else e = null;
    for (eo = { focusedElem: l, selectionRange: e }, Tu = !1, a = (a & 335544064) === a, tt = t, t = a ? 9270 : 1024; tt !== null; ) {
      if (l = tt, a && (e = l.deletions, e !== null))
        for (n = 0; n < e.length; n++)
          a && pf(e[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && yd(l), Ei(a);
      else {
        if (l.tag === 22) {
          if (e = l.alternate, l.memoizedState !== null) {
            e !== null && e.memoizedState === null && a && pf(e), Ei(a);
            continue;
          } else if (e !== null && e.memoizedState !== null) {
            a && yd(l), Ei(a);
            continue;
          }
        }
        e = l.child, (l.subtreeFlags & t) !== 0 && e !== null ? (e.return = l, tt = e) : (a && Sd(l), Ei(a));
      }
    }
    Rt = null;
  }
  function Ei(l) {
    for (; tt !== null; ) {
      var t = tt, a = l, e = t.alternate, u = t.flags;
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((u & 1024) !== 0 && e !== null) {
            a = void 0, u = e.memoizedProps, e = e.memoizedState;
            var n = t.stateNode;
            try {
              var i = Ae(
                t.type,
                u
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                e
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              El(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((u & 1024) !== 0) {
            if (e = t.stateNode.containerInfo, a = e.nodeType, a === 9)
              so(e);
            else if (a === 1)
              switch (e.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  so(e);
                  break;
                default:
                  e.textContent = "";
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
          a && e !== null && (a = Sa(
            e.memoizedProps,
            e.stateNode
          ), u = t.memoizedProps, u = Ta(u.default, u.update), u !== "none" && au(
            e,
            a,
            u,
            e.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((u & 1024) !== 0) throw Error(v(163));
      }
      if (e = t.sibling, e !== null) {
        e.return = t.return, tt = e;
        break;
      }
      tt = t.return;
    }
  }
  function _d(l, t, a) {
    var e = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        da(l, a), e & 4 && Pu(5, a);
        break;
      case 1:
        if (da(l, a), e & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              El(a, a.return, i);
            }
          else {
            var u = Ae(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              l.componentDidUpdate(
                u,
                t,
                l.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              El(
                a,
                a.return,
                i
              );
            }
          }
        e & 64 && rd(a), e & 512 && ca(a, a.return);
        break;
      case 3:
        if (da(l, a), e & 64 && (l = a.updateQueue, l !== null)) {
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
            lr(l, t);
          } catch (i) {
            El(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && e & 4 && hd(a);
      case 26:
      case 5:
        da(l, a), t === null && e & 4 && Ef(a), e & 512 && ca(a, a.return);
        break;
      case 12:
        da(l, a);
        break;
      case 31:
        da(l, a), e & 4 && pd(l, a);
        break;
      case 13:
        da(l, a), e & 4 && Cd(l, a), e & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = ah.bind(
          null,
          a
        ), Bh(l, a))));
        break;
      case 22:
        if (e = a.memoizedState !== null || lt, !e) {
          var n = t !== null && t.memoizedState !== null || bl;
          t = lt, u = bl, lt = e, (bl = n) && !u ? (e = 2, (a.subtreeFlags & 8772) !== 0 && (e |= 1), kt(
            l,
            a,
            e
          )) : da(l, a), lt = t, bl = u;
        }
        break;
      case 30:
        da(l, a), e & 512 && ca(a, a.return);
        break;
      case 7:
        e & 512 && ca(a, a.return);
      default:
        da(l, a);
    }
  }
  function Rf(l, t) {
    for (l = l.child; l !== null; )
      Od(l, t), l = l.sibling;
  }
  function Od(l, t) {
    switch (l.tag) {
      case 5:
      case 26:
        try {
          var a = l.stateNode;
          if (t) {
            var e = a.style;
            typeof e.setProperty == "function" ? e.setProperty("display", "none", "important") : e.display = "none";
          } else {
            var u = l.stateNode, n = l.memoizedProps.style, i = n != null && n.hasOwnProperty("display") ? n.display : null;
            u.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (o) {
          El(l, l.return, o);
        }
        jf(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, hl = !0;
        } catch (o) {
          El(l, l.return, o);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? ym(c, !0) : ym(l.stateNode, !1);
        } catch (o) {
          El(l, l.return, o);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Rf(l, t);
        break;
      default:
        Rf(l, t);
    }
  }
  function jf(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, e = t;
          switch (a.tag) {
            case 4:
              Od(a, e);
              break l;
            case 22:
              a.memoizedState === null && jf(a, e);
              break l;
            default:
              jf(a, e);
          }
        }
        l = l.sibling;
      }
  }
  function Nd(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, Nd(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && An(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var ql = null, Et = !1;
  function Wt(l, t, a) {
    for (a = a.child; a !== null; )
      Ad(l, t, a), a = a.sibling;
  }
  function Ad(l, t, a) {
    if (pt && typeof pt.onCommitFiberUnmount == "function")
      try {
        pt.onCommitFiberUnmount(Ou, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        bl || ct(a, t), Wt(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !bl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        bl || ct(a, t), ln(a);
        var e = ql, u = Et;
        le(a.type) && (ql = a.stateNode, Et = !1), Wt(
          l,
          t,
          a
        ), Dm(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), ql = e, Et = u;
        break;
      case 5:
        bl || ct(a, t), ln(a);
      case 6:
        if (a.tag === 6 && ln(a), e = ql, u = Et, ql = null, Wt(
          l,
          t,
          a
        ), ql = e, Et = u, ql !== null)
          if (Et)
            try {
              (ql.nodeType === 9 ? ql.body : ql.nodeName === "HTML" ? ql.ownerDocument.body : ql).removeChild(a.stateNode), hl = !0;
            } catch (n) {
              El(
                a,
                t,
                n
              );
            }
          else
            try {
              ql.removeChild(a.stateNode), hl = !0;
            } catch (n) {
              El(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        ql !== null && (Et ? (l = ql, hm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Eu(l)) : hm(ql, a.stateNode));
        break;
      case 4:
        e = ql, u = Et, ql = a.stateNode.containerInfo, Et = !0, Wt(
          l,
          t,
          a
        ), ql = e, Et = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        wa(2, a, t), bl || wa(4, a, t), Wt(
          l,
          t,
          a
        );
        break;
      case 1:
        bl || (ct(a, t), e = a.stateNode, typeof e.componentWillUnmount == "function" && dd(
          a,
          t,
          e
        )), Wt(
          l,
          t,
          a
        );
        break;
      case 21:
        Wt(
          l,
          t,
          a
        );
        break;
      case 22:
        bl = (e = bl) || a.memoizedState !== null, Wt(
          l,
          t,
          a
        ), bl = e;
        break;
      case 30:
        ct(a, t), Wt(
          l,
          t,
          a
        );
        break;
      case 7:
        bl || ct(a, t), Wt(
          l,
          t,
          a
        );
        break;
      default:
        Wt(
          l,
          t,
          a
        );
    }
  }
  function pd(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        Eu(l);
      } catch (a) {
        El(t, t.return, a);
      }
    }
  }
  function Cd(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Eu(l);
      } catch (a) {
        El(t, t.return, a);
      }
  }
  function Kv(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new zd()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new zd()), t;
      default:
        throw Error(v(435, l.tag));
    }
  }
  function zi(l, t) {
    var a = Kv(l);
    t.forEach(function(e) {
      if (!a.has(e)) {
        a.add(e);
        var u = eh.bind(null, l, e);
        e.then(u, u);
      }
    });
  }
  function vt(l, t, a) {
    var e = t.deletions;
    if (e !== null)
      for (var u = 0; u < e.length; u++) {
        var n = e[u], i = l, c = t, o = c;
        l: for (; o !== null; ) {
          switch (o.tag) {
            case 27:
              if (le(o.type)) {
                ql = o.stateNode, Et = !1;
                break l;
              }
              break;
            case 5:
              ql = o.stateNode, Et = !1;
              break l;
            case 3:
            case 4:
              ql = o.stateNode.containerInfo, Et = !0;
              break l;
          }
          o = o.return;
        }
        if (ql === null) throw Error(v(160));
        Ad(i, c, n), ql = null, Et = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Md(t, l, a), t = t.sibling;
  }
  var It = null;
  function Md(l, t, a) {
    var e = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (u & 4 && (e = l.updateQueue, e = e !== null ? e.events : null, e !== null))
          for (var n = 0; n < e.length; n++) {
            var i = e[n];
            i.ref.impl = i.nextImpl;
          }
        vt(t, l, a), ht(l), u & 4 && (wa(3, l, l.return), Pu(3, l), wa(5, l, l.return));
        break;
      case 1:
        vt(t, l, a), ht(l), u & 512 && (bl || e === null || ct(e, e.return)), u & 64 && lt && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = It, vt(t, l, a), ht(l), u & 512 && (bl || e === null || ct(e, e.return)), u & 4)
          if (u = e !== null ? e.memoizedState : null, a = l.memoizedState, e === null)
            if (a === null)
              if (l.stateNode === null)
                if (lt)
                  l.stateNode = dm(
                    l.type,
                    l.memoizedProps,
                    t.containerInfo,
                    l
                  );
                else {
                  l: {
                    t = l.type, a = l.memoizedProps, u = n.ownerDocument || n;
                    t: switch (t) {
                      case "title":
                        e = u.getElementsByTagName("title")[0], (!e || e[pu] || e[et] || e.namespaceURI === "http://www.w3.org/2000/svg" || e.hasAttribute("itemprop")) && (e = u.createElement(t), u.head.insertBefore(
                          e,
                          u.querySelector("head > title")
                        )), ft(e, t, a), e[et] = l, kl(e), t = e;
                        break l;
                      case "link":
                        if (n = qm(
                          "link",
                          "href",
                          u
                        ).get(t + (a.href || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && e.getAttribute("rel") === (a.rel == null ? null : a.rel) && e.getAttribute("title") === (a.title == null ? null : a.title) && e.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        e = u.createElement(t), ft(e, t, a), u.head.appendChild(e);
                        break;
                      case "meta":
                        if (n = qm(
                          "meta",
                          "content",
                          u
                        ).get(t + (a.content || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("content") === (a.content == null ? null : "" + a.content) && e.getAttribute("name") === (a.name == null ? null : a.name) && e.getAttribute("property") === (a.property == null ? null : a.property) && e.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && e.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                              n.splice(i, 1);
                              break t;
                            }
                        }
                        e = u.createElement(t), ft(e, t, a), u.head.appendChild(e);
                        break;
                      default:
                        throw Error(v(468, t));
                    }
                    e[et] = l, kl(e), t = e;
                  }
                  l.stateNode = t;
                }
              else
                lt || bo(n, l.type, l.stateNode);
            else
              l.stateNode = Hm(
                n,
                a,
                l.memoizedProps
              );
          else
            u !== a ? (u === null ? (t = e.stateNode, t === null || bl || t.parentNode.removeChild(t)) : u.count--, a === null ? lt || bo(n, l.type, l.stateNode) : Hm(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && zf(
              l,
              l.memoizedProps,
              e.memoizedProps
            );
        break;
      case 27:
        vt(t, l, a), ht(l), u & 512 && (bl || e === null || ct(e, e.return)), e !== null && u & 4 && zf(
          l,
          l.memoizedProps,
          e.memoizedProps
        );
        break;
      case 5:
        if (n = sa, sa = !1, vt(t, l, a), sa = n, ht(l), u & 512 && (bl || e === null || ct(e, e.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Ye(t, ""), hl = !0;
          } catch (g) {
            El(l, l.return, g);
          }
        }
        u & 4 && l.stateNode != null && (t = l.memoizedProps, zf(
          l,
          t,
          e !== null ? e.memoizedProps : t
        )), u & 1024 && (Df = !0);
        break;
      case 6:
        if (vt(t, l, a), ht(l), u & 4) {
          if (l.stateNode === null)
            throw Error(v(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, hl = !0;
          } catch (g) {
            El(l, l.return, g);
          }
        }
        break;
      case 3:
        if (hl = !1, Bi = null, n = It, It = rn(t.containerInfo), vt(t, l, a), It = n, ht(l), u & 4 && e !== null && e.memoizedState.isDehydrated)
          try {
            Eu(t.containerInfo);
          } catch (g) {
            El(l, l.return, g);
          }
        Df && (Df = !1, Dd(l)), hl = !1;
        break;
      case 4:
        u = sa, sa = lt, e = Wo(), n = It, It = rn(
          l.stateNode.containerInfo
        ), vt(t, l, a), ht(l), It = n, hl && tn && (Ti = !0), hl = e, sa = u;
        break;
      case 12:
        vt(t, l, a), ht(l);
        break;
      case 31:
        vt(t, l, a), ht(l), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, zi(l, t)));
        break;
      case 13:
        vt(t, l, a), ht(l), l.child.flags & 8192 && l.memoizedState !== null != (e !== null && e.memoizedState !== null) && (Ni = At()), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, zi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = e !== null && e.memoizedState !== null;
        var c = lt, o = bl, m = sa;
        lt = c || n, sa = m || n, bl = o || i, vt(t, l, a), bl = o, sa = m, lt = c, ht(l), u & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || e === null || i || lt || bl || (t = i || bl, a = lt, e = bl, lt = n || lt, bl = t, $a(l, 2), lt = a, bl = e), !n && sa || Rf(l, n)), u & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, zi(l, a))));
        break;
      case 19:
        vt(t, l, a), ht(l), u & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, zi(l, t)));
        break;
      case 30:
        u & 512 && (bl || e === null || ct(e, e.return)), u = Wo(), n = tn, i = (a & 335544064) === a, c = l.memoizedProps, tn = i && Ta(
          c.default,
          c.update
        ) !== "none", vt(t, l, a), ht(l), i && e !== null && hl && (l.flags |= 4), tn = n, hl = u;
        break;
      case 21:
        break;
      case 7:
        u & 512 && (bl || e === null || ct(e, e.return)), e && e.stateNode !== null && (e.stateNode._fragmentFiber = l);
      default:
        vt(t, l, a), ht(l);
    }
  }
  function ht(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, e = l.return; e !== null; ) {
          if (vd(e)) {
            a = e;
            break;
          }
          e = e.return;
        }
        e = null;
        for (var u = l.return; u !== null; ) {
          if (Tf(u)) {
            var n = u.stateNode;
            e === null ? e = [n] : e.push(n);
          }
          if (Sf(u)) break;
          u = u.return;
        }
        var i = e;
        if (a == null) throw Error(v(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, o = _f(l);
            yi(
              l,
              o,
              c,
              i
            );
            break;
          case 5:
            var m = a.stateNode;
            a.flags & 32 && (Ye(m, ""), a.flags &= -33);
            var g = _f(l);
            yi(
              l,
              g,
              m,
              i
            );
            break;
          case 3:
          case 4:
            var _ = a.stateNode.containerInfo, r = _f(l);
            Of(
              l,
              r,
              _,
              i
            );
            break;
          default:
            throw Error(v(161));
        }
      } catch (y) {
        El(l, l.return, y);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Dd(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Dd(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, Tu = !0, t.reset(), Tu = !1), l = l.sibling;
      }
  }
  function eu(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Ud(t, l), t = t.sibling;
    else Ed(t);
  }
  function Ud(l, t) {
    var a = l.alternate;
    if (a === null) Nf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Uf = ra = !1, gd(), eu(t, l), !ra && !Ti) {
            if (l = fa, l !== null)
              for (var e = 0; e < l.length; e += 3) {
                a = l[e];
                var u = l[e + 1];
                bm(a, l[e + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + u + ")"
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
            )), Uf = !0;
          }
          fa = null;
          break;
        case 5:
          eu(t, l);
          break;
        case 4:
          e = ra, ra = !1, eu(t, l), ra && (Ti = !0), ra = e;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? Nf(l, !1) : eu(t, l));
          break;
        case 30:
          e = ra, u = gd(), ra = !1, eu(t, l), ra && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = Sa(n, i), i = Sa(a.memoizedProps, i);
          var c = Ta(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, Tt = 0, t = Mf(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), Tt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (su(
            l,
            l.memoizedProps.onUpdate
          ), fa = u) : u !== null && (u.push.apply(u, fa), fa = u), ra = (l.flags & 32) !== 0 ? !0 : e;
          break;
        default:
          eu(t, l);
      }
  }
  function da(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        _d(l, t.alternate, t), t = t.sibling;
  }
  function $a(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, e = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          wa(4, a, a.return), $a(
            a,
            e
          );
          break;
        case 1:
          ct(a, a.return);
          var u = a.stateNode;
          typeof u.componentWillUnmount == "function" && dd(
            a,
            a.return,
            u
          ), $a(
            a,
            e
          );
          break;
        case 27:
          (e & 2) !== 0 && Dm(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          ct(a, a.return), a.tag !== 5 && a.tag !== 27 || ln(a), $a(
            a,
            e
          );
          break;
        case 6:
          ln(a);
          break;
        case 26:
          ct(a, a.return), u = a.stateNode, a.memoizedState !== null || u === null || bl || u.parentNode.removeChild(u), $a(
            a,
            e
          );
          break;
        case 22:
          a.memoizedState === null && $a(
            a,
            e
          );
          break;
        case 30:
          ct(a, a.return), $a(
            a,
            e
          );
          break;
        case 7:
          ct(a, a.return);
        default:
          $a(
            a,
            e
          );
      }
      l = l.sibling;
    }
  }
  function kt(l, t, a) {
    for (a = (t.subtreeFlags & 8772) !== 0 ? a : a & -2, t = t.child; t !== null; ) {
      var e = t.alternate, u = l, n = t, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          kt(
            u,
            n,
            a
          ), Pu(4, n);
          break;
        case 1:
          if (kt(
            u,
            n,
            a
          ), e = n, u = e.stateNode, typeof u.componentDidMount == "function")
            try {
              u.componentDidMount();
            } catch (g) {
              El(e, e.return, g);
            }
          if (e = n, u = e.updateQueue, u !== null) {
            var o = e.stateNode;
            try {
              var m = u.shared.hiddenCallbacks;
              if (m !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < m.length; u++)
                  Ps(m[u], o);
            } catch (g) {
              El(e, e.return, g);
            }
          }
          c && i & 64 && rd(n), ca(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && hd(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || md(n), kt(
            u,
            n,
            a
          ), c && e === null && i & 4 && Ef(n), ca(n, n.return);
          break;
        case 6:
          md(n);
          break;
        case 26:
          o = n.stateNode, n.memoizedState !== null || o === null || lt || bo(
            rn(o.ownerDocument),
            n.type,
            o
          ), kt(
            u,
            n,
            a
          ), c && e === null && i & 4 && Ef(n), ca(n, n.return);
          break;
        case 12:
          kt(
            u,
            n,
            a
          );
          break;
        case 31:
          kt(
            u,
            n,
            a
          ), c && i & 4 && pd(u, n);
          break;
        case 13:
          kt(
            u,
            n,
            a
          ), c && i & 4 && Cd(u, n);
          break;
        case 22:
          n.memoizedState === null && kt(
            u,
            n,
            a
          ), ca(n, n.return);
          break;
        case 30:
          kt(
            u,
            n,
            a
          ), ca(n, n.return);
          break;
        case 7:
          ca(n, n.return);
        default:
          kt(
            u,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function xf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Xu(a));
  }
  function Hf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Xu(l));
  }
  function Lt(l, t, a, e) {
    var u = (a & 335544064) === a;
    if (t.subtreeFlags & (u ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Rd(
          l,
          t,
          a,
          e
        ), t = t.sibling;
    else u && Td(t);
  }
  function Rd(l, t, a, e) {
    var u = (a & 335544064) === a;
    u && t.alternate === null && t.return !== null && t.return.alternate !== null && Si(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Lt(
          l,
          t,
          a,
          e
        ), n & 2048 && Pu(9, t);
        break;
      case 1:
        Lt(
          l,
          t,
          a,
          e
        );
        break;
      case 3:
        Lt(
          l,
          t,
          a,
          e
        ), u && Uf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Xu(n)));
        break;
      case 12:
        if (n & 2048) {
          Lt(
            l,
            t,
            a,
            e
          ), n = t.stateNode;
          try {
            var i = t.memoizedProps, c = i.id, o = i.onPostCommit;
            typeof o == "function" && o(
              c,
              t.alternate === null ? "mount" : "update",
              n.passiveEffectDuration,
              -0
            );
          } catch (m) {
            El(t, t.return, m);
          }
        } else
          Lt(
            l,
            t,
            a,
            e
          );
        break;
      case 31:
        Lt(
          l,
          t,
          a,
          e
        );
        break;
      case 13:
        Lt(
          l,
          t,
          a,
          e
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (u && c !== null && c.memoizedState === null && Si(c), i._visibility & 2 ? Lt(
          l,
          t,
          a,
          e
        ) : an(
          l,
          t
        )) : (u && c !== null && c.memoizedState !== null && Si(t), i._visibility & 2 ? Lt(
          l,
          t,
          a,
          e
        ) : (i._visibility |= 2, uu(
          l,
          t,
          a,
          e,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && xf(c, t);
        break;
      case 24:
        Lt(
          l,
          t,
          a,
          e
        ), n & 2048 && Hf(t.alternate, t);
        break;
      case 30:
        u && (n = t.alternate, n !== null && (oa(n.child, !0), oa(t.child, !0))), Lt(
          l,
          t,
          a,
          e
        );
        break;
      default:
        Lt(
          l,
          t,
          a,
          e
        );
    }
  }
  function uu(l, t, a, e, u) {
    for (u = u && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, o = e, m = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          uu(
            n,
            i,
            c,
            o,
            u
          ), Pu(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? uu(
            n,
            i,
            c,
            o,
            u
          ) : an(
            n,
            i
          ) : (g._visibility |= 2, uu(
            n,
            i,
            c,
            o,
            u
          )), u && m & 2048 && xf(
            i.alternate,
            i
          );
          break;
        case 24:
          uu(
            n,
            i,
            c,
            o,
            u
          ), u && m & 2048 && Hf(i.alternate, i);
          break;
        default:
          uu(
            n,
            i,
            c,
            o,
            u
          );
      }
      t = t.sibling;
    }
  }
  function an(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, e = t, u = e.flags;
        switch (e.tag) {
          case 22:
            an(a, e), u & 2048 && xf(
              e.alternate,
              e
            );
            break;
          case 24:
            an(a, e), u & 2048 && Hf(e.alternate, e);
            break;
          default:
            an(a, e);
        }
        t = t.sibling;
      }
  }
  var pe = 8192;
  function Ce(l, t, a) {
    if (l.subtreeFlags & pe)
      for (l = l.child; l !== null; )
        jd(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function jd(l, t, a) {
    switch (l.tag) {
      case 26:
        Ce(
          l,
          t,
          a
        ), l.flags & pe && (l.memoizedState !== null ? Ih(
          a,
          It,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && Xm(a, l)));
        break;
      case 5:
        Ce(
          l,
          t,
          a
        ), l.flags & pe && (l = l.stateNode, (t & 335544128) === t && Xm(a, l));
        break;
      case 3:
      case 4:
        var e = It;
        It = rn(l.stateNode.containerInfo), Ce(
          l,
          t,
          a
        ), It = e;
        break;
      case 22:
        l.memoizedState === null && (e = l.alternate, e !== null && e.memoizedState !== null ? (e = pe, pe = 16777216, Ce(
          l,
          t,
          a
        ), pe = e) : Ce(
          l,
          t,
          a
        ));
        break;
      case 30:
        if ((l.flags & pe) !== 0 && (e = l.memoizedProps.name, e != null && e !== "auto")) {
          var u = l.stateNode;
          u.paired = null, Rt === null && (Rt = /* @__PURE__ */ new Map()), Rt.set(e, u);
        }
        Ce(
          l,
          t,
          a
        );
        break;
      default:
        Ce(
          l,
          t,
          a
        );
    }
  }
  function xd(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function en(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var e = t[a];
          tt = e, qd(
            e,
            l
          );
        }
      xd(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        Hd(l), l = l.sibling;
  }
  function Hd(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        en(l), l.flags & 2048 && wa(9, l, l.return);
        break;
      case 3:
        en(l);
        break;
      case 12:
        en(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, _i(l)) : en(l);
        break;
      default:
        en(l);
    }
  }
  function _i(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var e = t[a];
          tt = e, qd(
            e,
            l
          );
        }
      xd(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          wa(8, t, t.return), _i(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, _i(t));
          break;
        default:
          _i(t);
      }
      l = l.sibling;
    }
  }
  function qd(l, t) {
    for (; tt !== null; ) {
      var a = tt;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          wa(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var e = a.memoizedState.cachePool.pool;
            e != null && e.refCount++;
          }
          break;
        case 24:
          Xu(a.memoizedState.cache);
      }
      if (e = a.child, e !== null) e.return = a, tt = e;
      else
        l: for (a = l; tt !== null; ) {
          e = tt;
          var u = e.sibling, n = e.return;
          if (Nd(e), e === a) {
            tt = null;
            break l;
          }
          if (u !== null) {
            u.return = n, tt = u;
            break l;
          }
          tt = n;
        }
    }
  }
  var Jv = {
    getCacheForType: function(l) {
      var t = ut(Jl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return ut(Jl).controller.signal;
    }
  }, wv = typeof WeakMap == "function" ? WeakMap : Map, gl = 0, pl = null, il = null, ol = 0, Tl = 0, jt = null, Fa = !1, nu = !1, qf = !1, Ma = 0, Vl = 0, Wa = 0, Me = 0, Oi = 0, xt = 0, iu = 0, un = null, zt = null, Bf = !1, Ni = 0, Bd = 0, Ai = 1 / 0, pi = null, Ia = null, Gl = 0, Pt = null, De = null, ma = 0, Yf = 0, Gf = null, Yd = null, cu = null, fu = null, ou = null, nn = 0, Ci = null;
  function Ht() {
    return (gl & 2) !== 0 && ol !== 0 ? ol & -ol : Y.T !== null ? Ff() : Qo();
  }
  function Gd() {
    if (xt === 0)
      if ((ol & 536870912) === 0 || el) {
        var l = zn;
        zn <<= 1, (zn & 3932160) === 0 && (zn = 262144), xt = l;
      } else xt = 536870912;
    return l = nt.current, l !== null && (l.flags |= 32), xt;
  }
  function su(l, t) {
    if (t != null) {
      var a = l.stateNode, e = a.ref;
      e === null && (e = a.ref = Sm(
        Sa(l.memoizedProps, a)
      )), fu === null && (fu = []), fu.push(t.bind(null, e));
    }
  }
  function _t(l, t, a) {
    (l === pl && (Tl === 2 || Tl === 9) || l.cancelPendingCommit !== null) && (ru(l, 0), ka(
      l,
      ol,
      xt,
      !1
    )), Au(l, a), ((gl & 2) === 0 || l !== pl) && (l === pl && ((gl & 2) === 0 && (Me |= a), Vl === 4 && ka(
      l,
      ol,
      xt,
      !1
    )), va(l));
  }
  function Xd(l, t, a) {
    if ((gl & 6) !== 0) throw Error(v(327));
    var e = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Nu(l, t), u = e ? Wv(l, t) : Qf(l, t, !0), n = e;
    do {
      if (u === 0) {
        nu && !e && ka(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !$v(a)) {
          u = Qf(l, t, !1), n = !1;
          continue;
        }
        if (u === 2) {
          if (n = t, l.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = l.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            t = i;
            l: {
              var c = l;
              u = un;
              var o = c.current.memoizedState.isDehydrated;
              if (o && (ru(c, i).flags |= 256), i = Qf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (qf && !o) {
                  c.errorRecoveryDisabledLanes |= n, Me |= n, u = 4;
                  break l;
                }
                n = zt, zt = u, n !== null && (zt === null ? zt = n : zt.push.apply(
                  zt,
                  n
                ));
              }
              u = i;
            }
            if (n = !1, u !== 2) continue;
          }
        }
        if (u === 1) {
          ru(l, 0), ka(l, t, 0, !0);
          break;
        }
        l: {
          switch (e = l, n = u, n) {
            case 0:
            case 1:
              throw Error(v(345));
            case 4:
              if ((t & 4194048) !== t && (t & 62914560) !== t)
                break;
            case 6:
              ka(
                e,
                t,
                xt,
                !Fa
              );
              break l;
            case 2:
              zt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(v(329));
          }
          if ((t & 62914560) === t && (u = Ni + 300 - At(), 10 < u)) {
            if (ka(
              e,
              t,
              xt,
              !Fa
            ), On(e, 0, !0) !== 0) break l;
            ma = t, e.timeoutHandle = io(
              Qd.bind(
                null,
                e,
                a,
                zt,
                pi,
                Bf,
                t,
                xt,
                Me,
                iu,
                Fa,
                n,
                "Throttled",
                -0,
                0
              ),
              u
            );
            break l;
          }
          Qd(
            e,
            a,
            zt,
            pi,
            Bf,
            t,
            xt,
            Me,
            iu,
            Fa,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    va(l);
  }
  function Qd(l, t, a, e, u, n, i, c, o, m, g, _, r, y) {
    l.timeoutHandle = -1;
    var p = t.subtreeFlags, q = (n & 335544064) === n;
    if (_ = null, (q || p & 8192 || (p & 16785408) === 16785408) && (_ = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: ua
    }, Rt = null, jd(
      t,
      n,
      _
    ), q && (p = _, q = l.containerInfo, q = (q.nodeType === 9 ? q : q.ownerDocument).__reactViewTransition, q != null && (p.count++, p.waitingForViewTransition = !0, p = vn.bind(p), q.finished.then(p, p))), p = (n & 62914560) === n ? Ni - At() : (n & 4194048) === n ? Bd - At() : 0, p = kh(
      _,
      p
    ), p !== null)) {
      ma = n, l.cancelPendingCommit = p(
        Fd.bind(
          null,
          l,
          t,
          n,
          a,
          e,
          u,
          i,
          c,
          o,
          m,
          g,
          _,
          null,
          r,
          y
        )
      ), ka(l, n, i, !m);
      return;
    }
    Fd(
      l,
      t,
      n,
      a,
      e,
      u,
      i,
      c,
      o,
      m,
      g,
      _
    );
  }
  function $v(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var e = 0; e < a.length; e++) {
          var u = a[e], n = u.getSnapshot;
          u = u.value;
          try {
            if (!Dt(n(), u)) return !1;
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
  function ka(l, t, a, e) {
    t = qo(l, t), t &= ~Oi, t &= ~Me, l.suspendedLanes |= t, l.pingedLanes &= ~t, e && (l.warmLanes |= t), e = l.expirationTimes;
    for (var u = t; 0 < u; ) {
      var n = 31 - Ct(u), i = 1 << n;
      e[n] = -1, u &= ~i;
    }
    a !== 0 && Yo(l, a, t);
  }
  function Mi() {
    return (gl & 6) === 0 ? (cn(0), !1) : !0;
  }
  function Xf() {
    if (il !== null) {
      if (Tl === 0)
        var l = il.return;
      else
        l = il, _a = ge = null, wc(l), Ie = null, Lu = 0, l = il;
      for (; l !== null; )
        sd(l.alternate, l), l = l.return;
      il = null;
    }
  }
  function ru(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, bh(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), ma = 0, Xf(), pl = l, il = a = Ea(l.current, null), ol = t, Tl = 0, jt = null, Fa = !1, nu = Nu(l, t), qf = !1, iu = xt = Oi = Me = Wa = Vl = 0, zt = un = null, Bf = !1, Ma = qo(l, t), Bn(), a;
  }
  function Vd(l, t) {
    I = null, Y.H = fi, t === We || t === $n ? (t = Fs(), Tl = 3) : t === xc ? (t = Fs(), Tl = 4) : Tl = t === of ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, jt = t, il === null && (Vl = 1, oi(
      l,
      Gt(t, l.current)
    ));
  }
  function Ld() {
    var l = nt.current;
    return l === null ? !0 : (ol & 4194048) === ol ? st === null : (ol & 62914560) === ol || (ol & 536870912) !== 0 ? l === st : !1;
  }
  function Zd() {
    var l = Y.H;
    return Y.H = fi, l === null ? fi : l;
  }
  function Kd() {
    var l = Y.A;
    return Y.A = Jv, l;
  }
  function Di() {
    Vl = 4, Fa || (ol & 4194048) !== ol && nt.current !== null || (nu = !0), (Wa & 134217727) === 0 && (Me & 134217727) === 0 || pl === null || ka(
      pl,
      ol,
      xt,
      !1
    );
  }
  function Qf(l, t, a) {
    var e = gl;
    gl |= 2;
    var u = Zd(), n = Kd();
    (pl !== l || ol !== t) && (pi = null, ru(l, t)), t = !1;
    var i = Vl;
    l: do
      try {
        if (Tl !== 0 && il !== null) {
          var c = il, o = jt;
          switch (Tl) {
            case 8:
              Xf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              nt.current === null && (t = !0);
              var m = Tl;
              if (Tl = 0, jt = null, du(l, c, o, m), a && nu) {
                i = 0;
                break l;
              }
              break;
            default:
              m = Tl, Tl = 0, jt = null, du(l, c, o, m);
          }
        }
        Fv(), i = Vl;
        break;
      } catch (g) {
        Vd(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, _a = ge = null, gl = e, Y.H = u, Y.A = n, il === null && (pl = null, ol = 0, Bn()), i;
  }
  function Fv() {
    for (; il !== null; ) Jd(il);
  }
  function Wv(l, t) {
    var a = gl;
    gl |= 2;
    var e = Zd(), u = Kd();
    pl !== l || ol !== t ? (pi = null, Ai = At() + 500, ru(l, t)) : nu = Nu(
      l,
      t
    );
    l: do
      try {
        if (Tl !== 0 && il !== null) {
          t = il;
          var n = jt;
          t: switch (Tl) {
            case 1:
              Tl = 0, jt = null, du(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (ws(n)) {
                Tl = 0, jt = null, wd(t);
                break;
              }
              t = function() {
                Tl !== 2 && Tl !== 9 || pl !== l || (Tl = 7), va(l);
              }, n.then(t, t);
              break l;
            case 3:
              Tl = 7;
              break l;
            case 4:
              Tl = 5;
              break l;
            case 7:
              ws(n) ? (Tl = 0, jt = null, wd(t)) : (Tl = 0, jt = null, du(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (il.tag) {
                case 26:
                  i = il.memoizedState;
                case 5:
                case 27:
                  var c = il;
                  if (i ? Ym(i) : c.stateNode.complete) {
                    Tl = 0, jt = null;
                    var o = c.sibling;
                    if (o !== null) il = o;
                    else {
                      var m = c.return;
                      m !== null ? (il = m, Ui(m)) : il = null;
                    }
                    break t;
                  }
              }
              Tl = 0, jt = null, du(l, t, n, 5);
              break;
            case 6:
              Tl = 0, jt = null, du(l, t, n, 6);
              break;
            case 8:
              Xf(), Vl = 6;
              break l;
            default:
              throw Error(v(462));
          }
        }
        Iv();
        break;
      } catch (g) {
        Vd(l, g);
      }
    while (!0);
    return _a = ge = null, Y.H = e, Y.A = u, gl = a, il !== null ? 0 : (pl = null, ol = 0, Bn(), Vl);
  }
  function Iv() {
    for (; il !== null && !v0(); )
      Jd(il);
  }
  function Jd(l) {
    var t = fd(l.alternate, l, Ma);
    l.memoizedProps = l.pendingProps, t === null ? Ui(l) : il = t;
  }
  function wd(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = td(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          ol
        );
        break;
      case 11:
        t = td(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          ol
        );
        break;
      case 5:
        wc(t);
        var e = t;
        e === Pl && (el ? (Ln(e), e.tag === 5 && e.stateNode != null && (Ul = e.stateNode)) : (Ln(e), el = !0));
      default:
        sd(a, t), t = il = qs(t, Ma), t = fd(a, t, Ma);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ui(l) : il = t;
  }
  function du(l, t, a, e) {
    _a = ge = null, wc(t), Ie = null, Lu = 0;
    var u = t.return;
    try {
      if (Yv(
        l,
        u,
        t,
        a,
        ol
      )) {
        Vl = 1, oi(
          l,
          Gt(a, l.current)
        ), il = null;
        return;
      }
    } catch (n) {
      if (u !== null) throw il = u, n;
      Vl = 1, oi(
        l,
        Gt(a, l.current)
      ), il = null;
      return;
    }
    t.flags & 32768 ? (el || e === 1 ? l = !0 : nu || (ol & 536870912) !== 0 ? l = !1 : (Fa = l = !0, (e === 2 || e === 9 || e === 3 || e === 6) && (e = nt.current, e !== null && e.tag === 13 && (e.flags |= 16384))), $d(t, l)) : Ui(t);
  }
  function Ui(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        $d(
          t,
          Fa
        );
        return;
      }
      l = t.return;
      var a = Vv(
        t.alternate,
        t,
        Ma
      );
      if (a !== null) {
        il = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        il = t;
        return;
      }
      il = t = l;
    } while (t !== null);
    Vl === 0 && (Vl = 5);
  }
  function $d(l, t) {
    do {
      var a = Lv(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, il = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        il = l;
        return;
      }
      il = l = a;
    } while (l !== null);
    Vl = 6, il = null;
  }
  function Fd(l, t, a, e, u, n, i, c, o, m, g, _) {
    l.cancelPendingCommit = null;
    do
      Ri();
    while (Gl !== 0);
    if ((gl & 6) !== 0) throw Error(v(327));
    if (t !== null) {
      if (t === l.current) throw Error(v(177));
      l === pl && (il = pl = null, ol = 0), De = t, Pt = l, ma = a, Gf = u, Yd = e, kv(
        l,
        t,
        a,
        i,
        c,
        o,
        _
      );
    }
  }
  function kv(l, t, a, e, u, n, i) {
    var c = t.lanes | t.childLanes;
    if (Yf = c, c |= Ec, O0(
      l,
      a,
      c,
      e,
      u,
      n
    ), fu = null, (a & 335544064) === a ? (ou = Av(l), e = 10262) : (ou = null, e = 10256), (t.subtreeFlags & e) !== 0 || (t.flags & e) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, uh(Tn, function() {
      return Kf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), gi = !1, e = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || e) {
      e = Y.T, Y.T = null, u = V.p, V.p = 2, n = gl, gl |= 4;
      try {
        Zv(l, t, a);
      } finally {
        gl = n, V.p = u, Y.T = e;
      }
    }
    Gl = 1, gi ? cu = Oh(
      i,
      l.containerInfo,
      ou,
      Vf,
      Lf,
      lh,
      Zf,
      Kf,
      Pv
    ) : (Vf(), Lf(), Zf());
  }
  function Pv(l) {
    if (Gl !== 0) {
      var t = Pt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function lh() {
    Gl === 3 && (Gl = 0, Ud(De, Pt), Gl = 4);
  }
  function Vf() {
    if (Gl === 1) {
      Gl = 0;
      var l = Pt, t = De, a = ma, e = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || e) {
        e = Y.T, Y.T = null;
        var u = V.p;
        V.p = 2;
        var n = gl;
        gl |= 4;
        try {
          tn = Ti = !1, Md(t, l, a), a = eo;
          var i = As(l.containerInfo), c = a.focusedElem, o = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Ns(
            c.ownerDocument.documentElement,
            c
          )) {
            if (o !== null && yc(c)) {
              var m = o.start, g = o.end;
              if (g === void 0 && (g = m), "selectionStart" in c)
                c.selectionStart = m, c.selectionEnd = Math.min(
                  g,
                  c.value.length
                );
              else {
                var _ = c.ownerDocument || document, r = _ && _.defaultView || window;
                if (r.getSelection) {
                  var y = r.getSelection(), p = c.textContent.length, q = Math.min(o.start, p), k = o.end === void 0 ? q : Math.min(o.end, p);
                  !y.extend && q > k && (i = k, k = q, q = i);
                  var d = Os(
                    c,
                    q
                  ), s = Os(
                    c,
                    k
                  );
                  if (d && s && (y.rangeCount !== 1 || y.anchorNode !== d.node || y.anchorOffset !== d.offset || y.focusNode !== s.node || y.focusOffset !== s.offset)) {
                    var h = _.createRange();
                    h.setStart(d.node, d.offset), y.removeAllRanges(), q > k ? (y.addRange(h), y.extend(s.node, s.offset)) : (h.setEnd(s.node, s.offset), y.addRange(h));
                  }
                }
              }
            }
            for (_ = [], y = c; y = y.parentNode; )
              y.nodeType === 1 && _.push({
                element: y,
                left: y.scrollLeft,
                top: y.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < _.length; c++) {
              var z = _[c];
              z.element.scrollLeft = z.left, z.element.scrollTop = z.top;
            }
          }
          Tu = !!ao, eo = ao = null;
        } finally {
          gl = n, V.p = u, Y.T = e;
        }
      }
      l.current = t, Gl = 2;
    }
  }
  function Lf() {
    if (Gl === 2) {
      Gl = 0;
      var l = Pt, t = De, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = Y.T, Y.T = null;
        var e = V.p;
        V.p = 2;
        var u = gl;
        gl |= 4;
        try {
          _d(l, t.alternate, t);
        } finally {
          gl = u, V.p = e, Y.T = a;
        }
      }
      Gl = 3;
    }
  }
  function Zf() {
    if (Gl === 4 || Gl === 3) {
      Gl = 0;
      var l = cu;
      cu = null, h0();
      var t = Pt, a = De, e = ma, u = Yd, n = (e & 335544064) === e ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Gl = 5 : (Gl = 0, De = Pt = null, Wd(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (Ia = null), ki(e), a = a.stateNode, pt && typeof pt.onCommitFiberRoot == "function")
        try {
          pt.onCommitFiberRoot(
            Ou,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        a = Y.T, n = V.p, V.p = 2, Y.T = null;
        try {
          for (var i = t.onRecoverableError, c = 0; c < u.length; c++) {
            var o = u[c];
            i(o.value, {
              componentStack: o.stack
            });
          }
        } finally {
          Y.T = a, V.p = n;
        }
      }
      if (u = fu, i = ou, ou = null, u !== null && (fu = null, i === null && (i = []), l !== null))
        for (o = 0; o < u.length; o++)
          a = (0, u[o])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (ma & 3) !== 0 && Ri(), va(t), n = t.pendingLanes, (e & 261930) !== 0 && (n & 42) !== 0 ? t === Ci ? nn++ : (nn = 0, Ci = t) : (nn = 0, Ci = null), cn(0);
    }
  }
  function Wd(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Xu(t)));
  }
  function Ri() {
    return cu !== null && (cu.skipTransition(), cu = null), Vf(), Lf(), Zf(), Kf();
  }
  function Kf() {
    if (Gl !== 5) return !1;
    var l = Pt, t = Yf;
    Yf = 0;
    var a = ki(ma), e = Y.T, u = V.p;
    try {
      V.p = 32 > a ? 32 : a, Y.T = null, a = Gf, Gf = null;
      var n = Pt, i = ma;
      if (Gl = 0, De = Pt = null, ma = 0, (gl & 6) !== 0) throw Error(v(331));
      var c = gl;
      if (gl |= 4, Hd(n.current), Rd(
        n,
        n.current,
        i,
        a
      ), gl = c, cn(0, !1), pt && typeof pt.onPostCommitFiberRoot == "function")
        try {
          pt.onPostCommitFiberRoot(Ou, n);
        } catch {
        }
      return !0;
    } finally {
      V.p = u, Y.T = e, Wd(l, t);
    }
  }
  function Id(l, t, a) {
    t = Gt(a, t), t = ff(l.stateNode, t, 2), l = La(l, t, 2), l !== null && (Au(l, 2), va(l));
  }
  function El(l, t, a) {
    if (l.tag === 3)
      Id(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          Id(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var e = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof e.componentDidCatch == "function" && (Ia === null || !Ia.has(e))) {
            l = Gt(a, l), a = wr(2), e = La(t, a, 2), e !== null && ($r(
              a,
              e,
              t,
              l
            ), Au(e, 2), va(e));
            break;
          }
        }
        t = t.return;
      }
  }
  function Jf(l, t, a) {
    var e = l.pingCache;
    if (e === null) {
      e = l.pingCache = new wv();
      var u = /* @__PURE__ */ new Set();
      e.set(t, u);
    } else
      u = e.get(t), u === void 0 && (u = /* @__PURE__ */ new Set(), e.set(t, u));
    u.has(a) || (qf = !0, u.add(a), l = th.bind(null, l, t, a), t.then(l, l));
  }
  function th(l, t, a) {
    var e = l.pingCache;
    e !== null && e.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, pl === l && (ol & a) === a && ((Vl === 4 || Vl === 3 && (ol & 62914560) === ol && 300 > At() - Ni) && (gl & 2) === 0 ? ru(l, 0) : Oi |= a, iu === ol && (iu = 0)), va(l);
  }
  function kd(l, t) {
    t === 0 && (t = Bo()), l = ve(l, t), l !== null && (Au(l, t), va(l));
  }
  function ah(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), kd(l, a);
  }
  function eh(l, t) {
    var a = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var e = l.stateNode, u = l.memoizedState;
        u !== null && (a = u.retryLane);
        break;
      case 19:
        e = l.stateNode;
        break;
      case 22:
        e = l.stateNode._retryCache;
        break;
      default:
        throw Error(v(314));
    }
    e !== null && e.delete(t), kd(l, a);
  }
  function uh(l, t) {
    return fe(l, t);
  }
  var mu = null, vu = null, wf = !1, ji = !1, $f = !1, Pa = 0;
  function va(l) {
    l !== vu && l.next === null && (vu === null ? mu = vu = l : vu = vu.next = l), ji = !0, wf || (wf = !0, ih());
  }
  function cn(l, t) {
    if (!$f && ji) {
      $f = !0;
      do
        for (var a = !1, e = mu; e !== null; ) {
          if (l !== 0) {
            var u = e.pendingLanes;
            if (u === 0) var n = 0;
            else {
              var i = e.suspendedLanes, c = e.pingedLanes;
              n = (1 << 31 - Ct(42 | l) + 1) - 1, n &= u & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, am(e, n));
          } else
            n = ol, n = On(
              e,
              e === pl ? n : 0,
              e.cancelPendingCommit !== null || e.timeoutHandle !== -1
            ), (n & 3) === 0 || Nu(e, n) || (a = !0, am(e, n));
          e = e.next;
        }
      while (a);
      $f = !1;
    }
  }
  function nh() {
    Pd();
  }
  function Pd() {
    ji = wf = !1;
    var l = 0;
    Pa !== 0 && gh() && (l = Pa);
    for (var t = At(), a = null, e = mu; e !== null; ) {
      var u = e.next, n = lm(e, t);
      n === 0 ? (e.next = null, a === null ? mu = u : a.next = u, u === null && (vu = a)) : (a = e, (l !== 0 || (n & 3) !== 0) && (ji = !0)), e = u;
    }
    Gl !== 0 && Gl !== 5 || cn(l), Pa !== 0 && (Pa = 0);
  }
  function lm(l, t) {
    for (var a = l.suspendedLanes, e = l.pingedLanes, u = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Ct(n), c = 1 << i, o = u[i];
      o === -1 ? ((c & a) === 0 || (c & e) !== 0) && (u[i] = _0(c, t)) : o <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = pl, a = ol, a = On(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), e = l.callbackNode, a === 0 || l === t && (Tl === 2 || Tl === 9) || l.cancelPendingCommit !== null)
      return e !== null && e !== null && Fi(e), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Nu(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (e !== null && Fi(e), ki(a)) {
        case 2:
        case 8:
          a = xo;
          break;
        case 32:
          a = Tn;
          break;
        case 268435456:
          a = Ho;
          break;
        default:
          a = Tn;
      }
      return e = tm.bind(null, l), a = fe(a, e), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return e !== null && e !== null && Fi(e), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function tm(l, t) {
    if (Gl !== 0 && Gl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (Ri() && l.callbackNode !== a)
      return null;
    var e = ol;
    return e = On(
      l,
      l === pl ? e : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), e === 0 ? null : (Xd(l, e, t), lm(l, At()), l.callbackNode != null && l.callbackNode === a ? tm.bind(null, l) : null);
  }
  function am(l, t) {
    if (Ri()) return null;
    Xd(l, t, !0);
  }
  function ih() {
    Sh(function() {
      (gl & 6) !== 0 ? fe(
        jo,
        nh
      ) : Pd();
    });
  }
  function Ff() {
    if (Pa === 0) {
      var l = Te;
      l === 0 && (l = En, En <<= 1, (En & 261888) === 0 && (En = 256)), Pa = l;
    }
    return Pa;
  }
  function em(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : Mn(l);
  }
  function ch(l, t, a, e, u) {
    if (t === "submit" && a && a.stateNode === u) {
      var n = em(
        (u[bt] || null).action
      ), i = e.submitter;
      i && (t = (t = i[bt] || null) ? em(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new jn(
        "action",
        "action",
        null,
        e,
        u
      );
      l.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (e.defaultPrevented) {
                if (Pa !== 0) {
                  var o = new FormData(u, i);
                  af(
                    a,
                    {
                      pending: !0,
                      data: o,
                      method: u.method,
                      action: n
                    },
                    null,
                    o
                  );
                }
              } else
                typeof n == "function" && (c.preventDefault(), o = new FormData(u, i), af(
                  a,
                  {
                    pending: !0,
                    data: o,
                    method: u.method,
                    action: n
                  },
                  n,
                  o
                ));
            },
            currentTarget: u
          }
        ]
      });
    }
  }
  for (var Wf = 0; Wf < Tc.length; Wf++) {
    var If = Tc[Wf], fh = If.toLowerCase(), oh = If[0].toUpperCase() + If.slice(1);
    Ft(
      fh,
      "on" + oh
    );
  }
  Ft(Ms, "onAnimationEnd"), Ft(Ds, "onAnimationIteration"), Ft(Us, "onAnimationStart"), Ft("dblclick", "onDoubleClick"), Ft("focusin", "onFocus"), Ft("focusout", "onBlur"), Ft(bv, "onTransitionRun"), Ft(Sv, "onTransitionStart"), Ft(Tv, "onTransitionCancel"), Ft(Rs, "onTransitionEnd"), qe("onMouseEnter", ["mouseout", "mouseover"]), qe("onMouseLeave", ["mouseout", "mouseover"]), qe("onPointerEnter", ["pointerout", "pointerover"]), qe("onPointerLeave", ["pointerout", "pointerover"]), re(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), re(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), re("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), re(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), re(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), re(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var fn = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), sh = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(fn)
  );
  function um(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var e = l[a], u = e.event;
      e = e.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = e.length - 1; 0 <= i; i--) {
            var c = e[i], o = c.instance, m = c.currentTarget;
            if (c = c.listener, o !== n && u.isPropagationStopped())
              break l;
            n = c, u.currentTarget = m;
            try {
              n(u);
            } catch (g) {
              qn(g);
            }
            u.currentTarget = null, n = o;
          }
        else
          for (i = 0; i < e.length; i++) {
            if (c = e[i], o = c.instance, m = c.currentTarget, c = c.listener, o !== n && u.isPropagationStopped())
              break l;
            n = c, u.currentTarget = m;
            try {
              n(u);
            } catch (g) {
              qn(g);
            }
            u.currentTarget = null, n = o;
          }
      }
    }
  }
  function cl(l, t) {
    var a = t[Lo];
    a === void 0 && (a = t[Lo] = /* @__PURE__ */ new Set());
    var e = l + "__bubble";
    a.has(e) || (nm(t, l, 2, !1), a.add(e));
  }
  function kf(l, t, a) {
    var e = 0;
    t && (e |= 4), nm(
      a,
      l,
      e,
      t
    );
  }
  var xi = "_reactListening" + Math.random().toString(36).slice(2);
  function Pf(l) {
    if (!l[xi]) {
      l[xi] = !0, Jo.forEach(function(a) {
        a !== "selectionchange" && (sh.has(a) || kf(a, !1, l), kf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[xi] || (t[xi] = !0, kf("selectionchange", !1, t));
    }
  }
  function nm(l, t, a, e) {
    switch ($m(t)) {
      case 2:
        var u = ay;
        break;
      case 8:
        u = ey;
        break;
      default:
        u = To;
    }
    a = u.bind(
      null,
      t,
      a,
      l
    ), u = void 0, !ic || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (u = !0), e ? u !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: u
    }) : l.addEventListener(t, a, !0) : u !== void 0 ? l.addEventListener(t, a, {
      passive: u
    }) : l.addEventListener(t, a, !1);
  }
  function lo(l, t, a, e, u) {
    var n = e;
    if ((t & 1) === 0 && (t & 2) === 0 && e !== null)
      l: for (; ; ) {
        if (e === null) return;
        var i = e.tag;
        if (i === 3 || i === 4) {
          var c = e.stateNode.containerInfo;
          if (c === u) break;
          if (i === 4)
            for (i = e.return; i !== null; ) {
              var o = i.tag;
              if ((o === 3 || o === 4) && i.stateNode.containerInfo === u)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = se(c), i === null) return;
            if (o = i.tag, o === 5 || o === 6 || o === 26 || o === 27) {
              e = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        e = e.return;
      }
    ns(function() {
      var m = n, g = uc(a), _ = [];
      l: {
        var r = js.get(l);
        if (r !== void 0) {
          var y = jn, p = l;
          switch (l) {
            case "keypress":
              if (Un(a) === 0) break l;
            case "keydown":
            case "keyup":
              y = $0;
              break;
            case "focusin":
              p = "focus", y = sc;
              break;
            case "focusout":
              p = "blur", y = sc;
              break;
            case "beforeblur":
            case "afterblur":
              y = sc;
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
              y = fs;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              y = q0;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              y = P0;
              break;
            case Ms:
            case Ds:
            case Us:
              y = G0;
              break;
            case Rs:
              y = tv;
              break;
            case "scroll":
            case "scrollend":
              y = x0;
              break;
            case "wheel":
              y = ev;
              break;
            case "copy":
            case "cut":
            case "paste":
              y = Q0;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              y = ss;
              break;
            case "submit":
              y = I0;
              break;
            case "toggle":
            case "beforetoggle":
              y = nv;
          }
          var q = (t & 4) !== 0, k = !q && (l === "scroll" || l === "scrollend"), d = q ? r !== null ? r + "Capture" : null : r;
          q = [];
          for (var s = m, h; s !== null; ) {
            var z = s;
            if (h = z.stateNode, z = z.tag, z !== 5 && z !== 26 && z !== 27 || h === null || d === null || (z = Mu(s, d), z != null && q.push(
              on(s, z, h)
            )), k) break;
            s = s.return;
          }
          0 < q.length && (r = new y(
            r,
            p,
            null,
            a,
            g
          ), _.push({ event: r, listeners: q }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (y = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", y && a !== ec && (p = a.relatedTarget || a.fromElement) && (se(p) || p[je]))
            break l;
          (r || y) && (p = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, r ? (y = a.relatedTarget || a.toElement, r = m, y = y ? se(y) : null, y !== null && (k = X(y), q = y.tag, y !== k || q !== 5 && q !== 27 && q !== 6) && (y = null)) : (r = null, y = m), r !== y && (q = fs, z = "onMouseLeave", d = "onMouseEnter", s = "mouse", (l === "pointerout" || l === "pointerover") && (q = ss, z = "onPointerLeave", d = "onPointerEnter", s = "pointer"), k = r == null ? p : Cu(r), h = y == null ? p : Cu(y), p = new q(
            z,
            s + "leave",
            r,
            a,
            g
          ), p.target = k, p.relatedTarget = h, z = null, se(g) === m && (q = new q(
            d,
            s + "enter",
            y,
            a,
            g
          ), q.target = h, q.relatedTarget = k, z = q), k = z, q = r && y ? Yl(
            r,
            y,
            rh
          ) : null, r !== null && im(
            _,
            p,
            r,
            q,
            !1
          ), y !== null && k !== null && im(
            _,
            k,
            y,
            q,
            !0
          )));
        }
        l: {
          if (r = m ? Cu(m) : window, y = r.nodeName && r.nodeName.toLowerCase(), y === "select" || y === "input" && r.type === "file")
            var x = bs;
          else if (ys(r))
            if (Ss)
              x = hv;
            else {
              x = mv;
              var sl = dv;
            }
          else
            y = r.nodeName, !y || y.toLowerCase() !== "input" || r.type !== "checkbox" && r.type !== "radio" ? m && ac(m.elementType) && (x = bs) : x = vv;
          if (x && (x = x(l, m))) {
            gs(
              _,
              x,
              a,
              g
            );
            break l;
          }
          sl && sl(l, r, m);
        }
        switch (sl = m ? Cu(m) : window, l) {
          case "focusin":
            (ys(sl) || sl.contentEditable === "true") && (Ve = sl, gc = m, Bu = null);
            break;
          case "focusout":
            Bu = gc = Ve = null;
            break;
          case "mousedown":
            bc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            bc = !1, ps(_, a, g);
            break;
          case "selectionchange":
            if (gv) break;
          case "keydown":
          case "keyup":
            ps(_, a, g);
        }
        var G;
        if (dc)
          l: {
            switch (l) {
              case "compositionstart":
                var Z = "onCompositionStart";
                break l;
              case "compositionend":
                Z = "onCompositionEnd";
                break l;
              case "compositionupdate":
                Z = "onCompositionUpdate";
                break l;
            }
            Z = void 0;
          }
        else
          Qe ? vs(l, a) && (Z = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (Z = "onCompositionStart");
        Z && (rs && a.locale !== "ko" && (Qe || Z !== "onCompositionStart" ? Z === "onCompositionEnd" && Qe && (G = is()) : (xa = g, cc = "value" in xa ? xa.value : xa.textContent, Qe = !0)), sl = Hi(m, Z), 0 < sl.length && (Z = new os(
          Z,
          l,
          null,
          a,
          g
        ), _.push({ event: Z, listeners: sl }), G ? Z.data = G : (G = hs(a), G !== null && (Z.data = G)))), (G = cv ? fv(l, a) : ov(l, a)) && (Z = Hi(m, "onBeforeInput"), 0 < Z.length && (sl = new os(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), _.push({
          event: sl,
          listeners: Z
        }), sl.data = G)), ch(
          _,
          l,
          m,
          a,
          g
        );
      }
      um(_, t);
    });
  }
  function on(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Hi(l, t) {
    for (var a = t + "Capture", e = []; l !== null; ) {
      var u = l, n = u.stateNode;
      if (u = u.tag, u !== 5 && u !== 26 && u !== 27 || n === null || (u = Mu(l, a), u != null && e.unshift(
        on(l, u, n)
      ), u = Mu(l, t), u != null && e.push(
        on(l, u, n)
      )), l.tag === 3) return e;
      l = l.return;
    }
    return [];
  }
  function rh(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function im(l, t, a, e, u) {
    for (var n = t._reactName, i = []; a !== null && a !== e; ) {
      var c = a, o = c.alternate, m = c.stateNode;
      if (c = c.tag, o !== null && o === e) break;
      c !== 5 && c !== 26 && c !== 27 || m === null || (o = m, u ? (m = Mu(a, n), m != null && i.unshift(
        on(a, m, o)
      )) : u || (m = Mu(a, n), m != null && i.push(
        on(a, m, o)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var dh = /\r\n?/g, mh = /\u0000|\uFFFD/g;
  function cm(l) {
    return (typeof l == "string" ? l : "" + l).replace(dh, `
`).replace(mh, "");
  }
  function fm(l, t) {
    return t = cm(t), cm(l) === t;
  }
  function zl(l, t, a, e, u, n) {
    switch (a) {
      case "children":
        if (typeof e == "string")
          t === "body" || t === "textarea" && e === "" || Ye(l, e);
        else if (typeof e == "number" || typeof e == "bigint")
          t !== "body" && Ye(l, "" + e);
        else return;
        break;
      case "className":
        Cn(l, "class", e);
        break;
      case "tabIndex":
        Cn(l, "tabindex", e);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Cn(l, a, e);
        break;
      case "style":
        es(l, e, n);
        return;
      case "data":
        if (t !== "object") {
          Cn(l, "data", e);
          break;
        }
      case "src":
      case "href":
        if (e === "" && (t !== "a" || a !== "href")) {
          l.removeAttribute(a);
          break;
        }
        if (e == null || typeof e == "function" || typeof e == "symbol" || typeof e == "boolean") {
          l.removeAttribute(a);
          break;
        }
        e = Mn(e), l.setAttribute(a, e);
        break;
      case "action":
      case "formAction":
        if (typeof e == "function") {
          l.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && zl(l, t, "name", u.name, u, null), zl(
            l,
            t,
            "formEncType",
            u.formEncType,
            u,
            null
          ), zl(
            l,
            t,
            "formMethod",
            u.formMethod,
            u,
            null
          ), zl(
            l,
            t,
            "formTarget",
            u.formTarget,
            u,
            null
          )) : (zl(l, t, "encType", u.encType, u, null), zl(l, t, "method", u.method, u, null), zl(l, t, "target", u.target, u, null)));
        if (e == null || typeof e == "symbol" || typeof e == "boolean") {
          l.removeAttribute(a);
          break;
        }
        e = Mn(e), l.setAttribute(a, e);
        break;
      case "onClick":
        e != null && (l.onclick = ua);
        return;
      case "onScroll":
        e != null && cl("scroll", l);
        return;
      case "onScrollEnd":
        e != null && cl("scrollend", l);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(v(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(v(60));
            n?.__html !== a && (l.innerHTML = a);
          }
        }
        break;
      case "multiple":
        l.multiple = e && typeof e != "function" && typeof e != "symbol";
        break;
      case "muted":
        l.muted = e && typeof e != "function" && typeof e != "symbol";
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
        if (e == null || typeof e == "function" || typeof e == "boolean" || typeof e == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        a = Mn(e), l.setAttributeNS(
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
        e != null && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, e) : l.removeAttribute(a);
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
        e && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, "") : l.removeAttribute(a);
        break;
      case "capture":
      case "download":
        e === !0 ? l.setAttribute(a, "") : e !== !1 && e != null && typeof e != "function" && typeof e != "symbol" ? l.setAttribute(a, e) : l.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        e != null && typeof e != "function" && typeof e != "symbol" && !isNaN(e) && 1 <= e ? l.setAttribute(a, e) : l.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        e == null || typeof e == "function" || typeof e == "symbol" || isNaN(e) ? l.removeAttribute(a) : l.setAttribute(a, e);
        break;
      case "popover":
        cl("beforetoggle", l), cl("toggle", l), pn(l, "popover", e);
        break;
      case "xlinkActuate":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          e
        );
        break;
      case "xlinkArcrole":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          e
        );
        break;
      case "xlinkRole":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          e
        );
        break;
      case "xlinkShow":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          e
        );
        break;
      case "xlinkTitle":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          e
        );
        break;
      case "xlinkType":
        ga(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          e
        );
        break;
      case "xmlBase":
        ga(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          e
        );
        break;
      case "xmlLang":
        ga(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          e
        );
        break;
      case "xmlSpace":
        ga(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          e
        );
        break;
      case "is":
        pn(l, "is", e);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = R0.get(a) || a, pn(l, a, e);
        else return;
    }
    hl = !0;
  }
  function to(l, t, a, e, u, n) {
    switch (a) {
      case "style":
        es(l, e, n);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(v(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(v(60));
            n?.__html !== a && (l.innerHTML = a);
          }
        }
        break;
      case "children":
        if (typeof e == "string") Ye(l, e);
        else if (typeof e == "number" || typeof e == "bigint")
          Ye(l, "" + e);
        else return;
        break;
      case "onScroll":
        e != null && cl("scroll", l);
        return;
      case "onScrollEnd":
        e != null && cl("scrollend", l);
        return;
      case "onClick":
        e != null && (l.onclick = ua);
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
        if (!wo.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (u = a.endsWith("Capture"), n = a.slice(2, u ? a.length - 7 : void 0), t = l[bt] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, u), typeof e == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, e, u);
              break l;
            }
            hl = !0, a in l ? l[a] = e : e === !0 ? l.setAttribute(a, "") : pn(l, a, e);
          }
        return;
    }
    hl = !0;
  }
  function ft(l, t, a) {
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
        cl("error", l), cl("load", l);
        var e = !1, u = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var i = a[n];
            if (i != null)
              switch (n) {
                case "src":
                  e = !0;
                  break;
                case "srcSet":
                  u = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(v(137, t));
                default:
                  zl(l, t, n, i, a, null);
              }
          }
        u && zl(l, t, "srcSet", a.srcSet, a, null), e && zl(l, t, "src", a.src, a, null);
        return;
      case "input":
        cl("invalid", l);
        var c = n = i = u = null, o = null, m = null;
        for (e in a)
          if (a.hasOwnProperty(e)) {
            var g = a[e];
            if (g != null)
              switch (e) {
                case "name":
                  u = g;
                  break;
                case "type":
                  i = g;
                  break;
                case "checked":
                  o = g;
                  break;
                case "defaultChecked":
                  m = g;
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
                    throw Error(v(137, t));
                  break;
                default:
                  zl(l, t, e, g, a, null);
              }
          }
        Po(
          l,
          n,
          c,
          o,
          m,
          i,
          u,
          !1
        );
        return;
      case "select":
        cl("invalid", l), e = i = n = null;
        for (u in a)
          if (a.hasOwnProperty(u) && (c = a[u], c != null))
            switch (u) {
              case "value":
                n = c;
                break;
              case "defaultValue":
                i = c;
                break;
              case "multiple":
                e = c;
              default:
                zl(l, t, u, c, a, null);
            }
        t = n, a = i, l.multiple = !!e, t != null ? Be(l, !!e, t, !1) : a != null && Be(l, !!e, a, !0);
        return;
      case "textarea":
        cl("invalid", l), n = u = e = null;
        for (i in a)
          if (a.hasOwnProperty(i) && (c = a[i], c != null))
            switch (i) {
              case "value":
                e = c;
                break;
              case "defaultValue":
                u = c;
                break;
              case "children":
                n = c;
                break;
              case "dangerouslySetInnerHTML":
                if (c != null) throw Error(v(91));
                break;
              default:
                zl(l, t, i, c, a, null);
            }
        ts(l, e, u, n);
        return;
      case "option":
        for (o in a)
          a.hasOwnProperty(o) && (e = a[o], e != null) && (o === "selected" ? l.selected = e && typeof e != "function" && typeof e != "symbol" : zl(l, t, o, e, a, null));
        return;
      case "dialog":
        cl("beforetoggle", l), cl("toggle", l), cl("cancel", l), cl("close", l);
        break;
      case "iframe":
      case "object":
        cl("load", l);
        break;
      case "video":
      case "audio":
        for (e = 0; e < fn.length; e++)
          cl(fn[e], l);
        break;
      case "image":
        cl("error", l), cl("load", l);
        break;
      case "details":
        cl("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        cl("error", l), cl("load", l);
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
        for (m in a)
          if (a.hasOwnProperty(m) && (e = a[m], e != null))
            switch (m) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(v(137, t));
              default:
                zl(l, t, m, e, a, null);
            }
        return;
      default:
        if (ac(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (e = a[g], e !== void 0 && to(
              l,
              t,
              g,
              e,
              a,
              void 0
            ));
          return;
        }
    }
    for (c in a)
      a.hasOwnProperty(c) && (e = a[c], e != null && zl(l, t, c, e, a, null));
  }
  var vh = {};
  function hh(l, t, a, e) {
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
        var u = null, n = null, i = null, c = null, o = null, m = null, g = null;
        for (y in a) {
          var _ = a[y];
          if (a.hasOwnProperty(y) && _ != null)
            switch (y) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                o = _;
              default:
                e.hasOwnProperty(y) || zl(l, t, y, null, e, _);
            }
        }
        for (var r in e) {
          var y = e[r];
          if (_ = a[r], e.hasOwnProperty(r) && (y != null || _ != null))
            switch (r) {
              case "type":
                y !== _ && (hl = !0), n = y;
                break;
              case "name":
                y !== _ && (hl = !0), u = y;
                break;
              case "checked":
                y !== _ && (hl = !0), m = y;
                break;
              case "defaultChecked":
                y !== _ && (hl = !0), g = y;
                break;
              case "value":
                y !== _ && (hl = !0), i = y;
                break;
              case "defaultValue":
                y !== _ && (hl = !0), c = y;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (y != null)
                  throw Error(v(137, t));
                break;
              default:
                y !== _ && zl(
                  l,
                  t,
                  r,
                  y,
                  e,
                  _
                );
            }
        }
        lc(
          l,
          i,
          c,
          o,
          m,
          g,
          n,
          u
        );
        return;
      case "select":
        y = i = c = r = null;
        for (n in a)
          if (o = a[n], a.hasOwnProperty(n) && o != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                y = o;
              default:
                e.hasOwnProperty(n) || zl(
                  l,
                  t,
                  n,
                  null,
                  e,
                  o
                );
            }
        for (u in e)
          if (n = e[u], o = a[u], e.hasOwnProperty(u) && (n != null || o != null))
            switch (u) {
              case "value":
                n !== o && (hl = !0), r = n;
                break;
              case "defaultValue":
                n !== o && (hl = !0), c = n;
                break;
              case "multiple":
                n !== o && (hl = !0), i = n;
              default:
                n !== o && zl(
                  l,
                  t,
                  u,
                  n,
                  e,
                  o
                );
            }
        t = c, a = i, e = y, r != null ? Be(l, !!a, r, !1) : !!e != !!a && (t != null ? Be(l, !!a, t, !0) : Be(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        y = r = null;
        for (c in a)
          if (u = a[c], a.hasOwnProperty(c) && u != null && !e.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                zl(l, t, c, null, e, u);
            }
        for (i in e)
          if (u = e[i], n = a[i], e.hasOwnProperty(i) && (u != null || n != null))
            switch (i) {
              case "value":
                u !== n && (hl = !0), r = u;
                break;
              case "defaultValue":
                u !== n && (hl = !0), y = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(v(91));
                break;
              default:
                u !== n && zl(l, t, i, u, e, n);
            }
        ls(l, r, y);
        return;
      case "option":
        for (var p in a)
          r = a[p], a.hasOwnProperty(p) && r != null && !e.hasOwnProperty(p) && (p === "selected" ? l.selected = !1 : zl(
            l,
            t,
            p,
            null,
            e,
            r
          ));
        for (o in e)
          r = e[o], y = a[o], e.hasOwnProperty(o) && r !== y && (r != null || y != null) && (o === "selected" ? (r !== y && (hl = !0), l.selected = r && typeof r != "function" && typeof r != "symbol") : zl(
            l,
            t,
            o,
            r,
            e,
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
        for (var q in a)
          r = a[q], a.hasOwnProperty(q) && r != null && !e.hasOwnProperty(q) && zl(l, t, q, null, e, r);
        for (m in e)
          if (r = e[m], y = a[m], e.hasOwnProperty(m) && r !== y && (r != null || y != null))
            switch (m) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(v(137, t));
                break;
              default:
                zl(
                  l,
                  t,
                  m,
                  r,
                  e,
                  y
                );
            }
        return;
      default:
        if (ac(t)) {
          for (var k in a)
            r = a[k], a.hasOwnProperty(k) && r !== void 0 && !e.hasOwnProperty(k) && to(
              l,
              t,
              k,
              void 0,
              e,
              r
            );
          for (g in e)
            r = e[g], y = a[g], !e.hasOwnProperty(g) || r === y || r === void 0 && y === void 0 || to(
              l,
              t,
              g,
              r,
              e,
              y
            );
          return;
        }
    }
    for (var d in a)
      r = a[d], a.hasOwnProperty(d) && r != null && !e.hasOwnProperty(d) && zl(l, t, d, null, e, r);
    for (_ in e)
      r = e[_], y = a[_], !e.hasOwnProperty(_) || r === y || r == null && y == null || zl(l, t, _, r, e, y);
  }
  function om(l) {
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
  function yh() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), e = 0; e < a.length; e++) {
        var u = a[e], n = u.transferSize, i = u.initiatorType, c = u.duration;
        if (n && c && om(i)) {
          for (i = 0, c = u.responseEnd, e += 1; e < a.length; e++) {
            var o = a[e], m = o.startTime;
            if (m > c) break;
            var g = o.transferSize, _ = o.initiatorType;
            g && om(_) && (o = o.responseEnd, i += g * (o < c ? 1 : (c - m) / (o - m)));
          }
          if (--e, t += 8 * (n + i) / (u.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var ao = null, eo = null;
  function sn(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function sm(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function rm(l, t) {
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
  function dm(l, t, a, e) {
    return a = sn(
      a
    ).createElement(l), a[et] = e, a[bt] = t, ft(a, l, t), kl(a), a;
  }
  function uo(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var no = null;
  function gh() {
    var l = window.event;
    return l && l.type === "popstate" ? l === no ? !1 : (no = l, !0) : (no = null, !1);
  }
  var io = typeof setTimeout == "function" ? setTimeout : void 0, bh = typeof clearTimeout == "function" ? clearTimeout : void 0, mm = typeof Promise == "function" ? Promise : void 0, vm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : io, Sh = typeof queueMicrotask == "function" ? queueMicrotask : typeof mm < "u" ? function(l) {
    return mm.resolve(null).then(l).catch(Th);
  } : io;
  function Th(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function le(l) {
    return l === "head";
  }
  function hm(l, t) {
    var a = t, e = 0;
    do {
      var u = a.nextSibling;
      if (l.removeChild(a), u && u.nodeType === 8)
        if (a = u.data, a === "/$" || a === "/&") {
          if (e === 0) {
            l.removeChild(u), Eu(t);
            return;
          }
          e--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          e++;
        else if (a === "html")
          ho(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, ho(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[pu] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && ho(l.ownerDocument.body);
      a = u;
    } while (a);
    Eu(t);
  }
  function ym(l, t) {
    var a = l;
    l = 0;
    do {
      var e = a.nextSibling;
      if (a.nodeType === 1 ? t ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (t ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), e && e.nodeType === 8)
        if (a = e.data, a === "/$") {
          if (l === 0) break;
          l--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || l++;
      a = e;
    } while (a);
  }
  function gm(l, t, a) {
    if (t = CSS.escape(t) !== t ? "r-" + btoa(t).replace(/=/g, "") : t, l.style.viewTransitionName = t, a != null && (l.style.viewTransitionClass = a), a = getComputedStyle(l), a.display === "inline") {
      if (t = l.getClientRects(), t.length === 1) var e = 1;
      else
        for (var u = e = 0; u < t.length; u++) {
          var n = t[u];
          0 < n.width && 0 < n.height && e++;
        }
      e === 1 && (l = l.style, l.display = t.length === 1 ? "inline-block" : "block", l.marginTop = "-" + a.paddingTop, l.marginBottom = "-" + a.paddingBottom);
    }
  }
  function bm(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function Eh(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function co(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return Eh(t, a, l);
  }
  function zh(l) {
    return l.documentElement.clientHeight;
  }
  function _h(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function Oh(l, t, a, e, u, n, i, c, o) {
    var m = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = m.startViewTransition({
        update: function() {
          var r = m.defaultView, y = r.navigation && r.navigation.transition, p = m.fonts.status;
          e();
          var q = [];
          if (p === "loaded" && (zh(m), m.fonts.status === "loading" && q.push(m.fonts.ready)), p = q.length, l !== null)
            for (var k = l.suspenseyImages, d = 0, s = 0; s < k.length; s++) {
              var h = k[s];
              if (!h.complete) {
                var z = h.getBoundingClientRect();
                if (0 < z.bottom && 0 < z.right && z.top < r.innerHeight && z.left < r.innerWidth) {
                  if (d += Gm(h), d > Yi) {
                    q.length = p;
                    break;
                  }
                  h = new Promise(
                    _h.bind(h)
                  ), q.push(h);
                }
              }
            }
          if (0 < q.length)
            return r = Promise.race([
              Promise.all(q),
              new Promise(function(x) {
                return setTimeout(x, 500);
              })
            ]).then(u, u), (y ? Promise.allSettled([y.finished, r]) : r).then(n, n);
          if (u(), y)
            return y.finished.then(
              n,
              n
            );
          n();
        },
        types: a
      });
      m.__reactViewTransition = g;
      var _ = [];
      return g.ready.then(
        function() {
          for (var r = m.documentElement.getAnimations({
            subtree: !0
          }), y = 0; y < r.length; y++) {
            var p = r[y], q = p.effect, k = q.pseudoElement;
            if (k != null && k.startsWith("::view-transition")) {
              _.push(p), p = q.getKeyframes();
              for (var d = k = void 0, s = !0, h = 0; h < p.length; h++) {
                var z = p[h], x = z.width;
                if (k === void 0) k = x;
                else if (k !== x) {
                  s = !1;
                  break;
                }
                if (x = z.height, d === void 0) d = x;
                else if (d !== x) {
                  s = !1;
                  break;
                }
                delete z.width, delete z.height, z.transform === "none" && delete z.transform;
              }
              s && k !== void 0 && d !== void 0 && (q.setKeyframes(p), s = getComputedStyle(
                q.target,
                q.pseudoElement
              ), s.width !== k || s.height !== d) && (s = p[0], s.width = k, s.height = d, s = p[p.length - 1], s.width = k, s.height = d, q.setKeyframes(p));
            }
          }
          i();
        },
        function(r) {
          m.__reactViewTransition === g && (m.__reactViewTransition = null);
          try {
            typeof r == "object" && r !== null && r.name === "InvalidStateError" && (r.message === "View transition was skipped because document visibility state is hidden." || r.message === "Skipping view transition because document visibility state has become hidden." || r.message === "Skipping view transition because viewport size changed." || r.message === "Transition was aborted because of invalid state") && (r = null), r !== null && o(r);
          } finally {
            e(), u(), i();
          }
        }
      ), g.finished.finally(function() {
        for (var r = 0; r < _.length; r++)
          _[r].cancel();
        m.__reactViewTransition === g && (m.__reactViewTransition = null), c();
      }), g;
    } catch {
      return e(), u(), i(), null;
    }
  }
  function Ue(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  Ue.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : M({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Ue.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), e = [], u = 0; u < a.length; u++) {
      var n = a[u].effect;
      n !== null && n.target === l && n.pseudoElement === t && e.push(a[u]);
    }
    return e;
  }, Ue.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function Sm(l) {
    return {
      name: l,
      group: new Ue("group", l),
      imagePair: new Ue("image-pair", l),
      old: new Ue("old", l),
      new: new Ue("new", l)
    };
  }
  function qt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  qt.prototype.addEventListener = function(l, t, a) {
    var e = null, u = null;
    if (!(a != null && typeof a != "boolean" && (e = a.signal || null, e !== null && e.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Em(n, l, t, a) === -1) {
        var i = this, c = t;
        a != null && typeof a != "boolean" && a.once === !0 && (c = function(o) {
          i.removeEventListener(
            l,
            t,
            a
          ), typeof t == "function" ? t.call(this, o) : t.handleEvent(o);
        }), e !== null && (u = i.removeEventListener.bind(
          i,
          l,
          t,
          a
        ), e.addEventListener("abort", u, { once: !0 }), u = e.removeEventListener.bind(e, "abort", u)), e = hu(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: u
        }), T(
          this._fragmentFiber.child,
          !1,
          Nh,
          l,
          c,
          e
        );
      }
      this._eventListeners = n;
    }
  };
  function Nh(l, t, a, e) {
    return ll(l).addEventListener(
      t,
      a,
      e
    ), !1;
  }
  qt.prototype.removeEventListener = function(l, t, a) {
    var e = this._eventListeners;
    if (e !== null && (t = Em(
      e,
      l,
      t,
      a
    ), t !== -1)) {
      var u = e[t];
      a = u.attachedListener;
      var n = u.cleanup;
      u = hu(u.optionsOrUseCapture), T(
        this._fragmentFiber.child,
        !1,
        Ah,
        l,
        a,
        u
      ), e.splice(t, 1), n !== null && n();
    }
  };
  function Ah(l, t, a, e) {
    return ll(l).removeEventListener(
      t,
      a,
      e
    ), !1;
  }
  function hu(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function Tm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function Em(l, t, a, e) {
    if (l.length === 0) return -1;
    e = Tm(e);
    for (var u = 0; u < l.length; u++) {
      var n = l[u];
      if (n.type === t && n.listener === a && Tm(n.optionsOrUseCapture) === e)
        return u;
    }
    return -1;
  }
  qt.prototype.dispatchEvent = function(l) {
    var t = j(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = ll(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var e = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.addEventListener(
            n.type,
            n.attachedListener,
            hu(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(e), l = e.dispatchEvent(l), a)
        for (u = 0; u < a.length; u++)
          n = a[u], e.removeEventListener(
            n.type,
            n.attachedListener,
            hu(n.optionsOrUseCapture)
          );
      return t.removeChild(e), l;
    }
    return t.dispatchEvent(l);
  }, qt.prototype.focus = function(l) {
    T(
      this._fragmentFiber.child,
      !0,
      zm,
      l,
      void 0,
      void 0
    );
  };
  function zm(l, t) {
    return l.tag === 6 ? !1 : (l = ll(l), Yh(l, t));
  }
  qt.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      fo,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !zm(t[a], l); a--) ;
  };
  function fo(l, t) {
    return t.push(l), !1;
  }
  qt.prototype.blur = function() {
    var l = j(
      this._fragmentFiber
    );
    l !== null && (l = ll(l), l = sn(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      ph,
      l,
      void 0,
      void 0
    ));
  };
  function ph(l, t) {
    return l.tag === 6 ? !1 : (l = ll(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  qt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Ch,
      l,
      void 0,
      void 0
    );
  };
  function Ch(l, t) {
    return l.tag === 6 || (l = ll(l), t.observe(l)), !1;
  }
  qt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), T(
        this._fragmentFiber.child,
        !1,
        Mh,
        l,
        void 0,
        void 0
      );
      for (var a = t = 0; a < la.length; a++) {
        var e = la[a];
        e.fragmentInstance === this && e.observer === l ? l.unobserve(e.instance) : la[t++] = e;
      }
      la.length = t;
    }
  };
  function Mh(l, t) {
    return l.tag === 6 || (l = ll(l), t.unobserve(l)), !1;
  }
  var la = [], oo = !1;
  function Dh(l, t, a) {
    la.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), oo || (oo = !0, Gh(function() {
      oo = !1;
      var e = la;
      la = [];
      for (var u = 0; u < e.length; u++) {
        var n = e[u];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  qt.prototype.getClientRects = function() {
    var l = [];
    return T(
      this._fragmentFiber.child,
      !1,
      Uh,
      l,
      void 0,
      void 0
    ), l;
  };
  function Uh(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = ll(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  qt.prototype.getRootNode = function(l) {
    var t = j(
      this._fragmentFiber
    );
    return t === null ? this : ll(t).getRootNode(l);
  }, qt.prototype.compareDocumentPosition = function(l) {
    var t = j(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      fo,
      a,
      void 0,
      void 0
    );
    var e = ll(t);
    if (a.length === 0) {
      if (a = e, $(this._fragmentFiber)) {
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
      var u = e = a.compareDocumentPosition(l);
      return a === l ? u = Node.DOCUMENT_POSITION_CONTAINS : e & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = _l(t)[1], a === null ? u = Node.DOCUMENT_POSITION_PRECEDING : (l = ll(a).compareDocumentPosition(
        l
      ), u = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), u |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = ll(a[0]), u = ll(a[a.length - 1]);
    var n = $(this._fragmentFiber) ? t.parentElement : e;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    e = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = u.compareDocumentPosition(l), o = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = e && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = e && t === l || n && u === l || o || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !e && t === l || !n && u === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Rh(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Rh(l, t, a, e, u) {
    var n = se(u);
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
        return n = u.ownerDocument, u === n || u === n.documentElement || u === n.body;
      l: {
        for (n = t, t = j(t); n !== null; ) {
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = Yl(
      a,
      n,
      Ml
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Wl,
      n,
      a
    ), n = jl, jl = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === e) && (t = Yl(
      e,
      n,
      Ml
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Cl,
      n,
      e
    ), n = jl, Zl = jl = null, t = n !== null)), t) : !1;
  }
  function _m(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  qt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(v(566));
    var t = [];
    T(
      this._fragmentFiber.child,
      !1,
      fo,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var e = _l(
        this._fragmentFiber
      );
      if (e = a ? e[1] || e[0] || j(this._fragmentFiber) : e[0] || e[1], e === null) return;
      if (e.tag === 6) {
        l = ll(e), _m(l, a);
        return;
      }
      if (e = ll(e), e.nodeType !== 9) {
        if (e.nodeType === 11) {
          a = "host" in e ? e.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        e.scrollIntoView(l);
      }
    }
    for (e = a ? t.length - 1 : 0; e !== (a ? -1 : t.length); ) {
      var u = t[e];
      u.tag === 6 ? (u = ll(u), _m(u, a)) : ll(u).scrollIntoView(l), e += a ? -1 : 1;
    }
  };
  function jh(l, t) {
    return l = ll(l), Om(l, t), !1;
  }
  function Om(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Nm(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        l.addEventListener(
          u.type,
          u.attachedListener,
          hu(u.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < la.length; c++) {
        var o = la[c];
        (o.fragmentInstance !== t || o.observer !== n || o.instance !== l) && (la[i++] = o);
      }
      la.length = i, n.observe(l);
    }), Om(l, t));
  }
  function xh(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        l.removeEventListener(
          u.type,
          u.attachedListener,
          hu(u.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      typeof n.rootMargin == "string" ? Dh(
        t,
        n,
        l
      ) : n.unobserve(l);
    }), l.reactFragments != null && l.reactFragments.delete(t));
  }
  function so(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          so(a), An(a);
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
  function Hh(l, t, a, e) {
    for (; l.nodeType === 1; ) {
      var u = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!e && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (e) {
        if (!l[pu])
          switch (t) {
            case "meta":
              if (!l.hasAttribute("itemprop")) break;
              return l;
            case "link":
              if (n = l.getAttribute("rel"), n === "stylesheet" && l.hasAttribute("data-precedence"))
                break;
              if (n !== u.rel || l.getAttribute("href") !== (u.href == null || u.href === "" ? null : u.href) || l.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin) || l.getAttribute("title") !== (u.title == null ? null : u.title))
                break;
              return l;
            case "style":
              if (l.hasAttribute("data-precedence")) break;
              return l;
            case "script":
              if (n = l.getAttribute("src"), (n !== (u.src == null ? null : u.src) || l.getAttribute("type") !== (u.type == null ? null : u.type) || l.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin)) && n && l.hasAttribute("async") && !l.hasAttribute("itemprop"))
                break;
              return l;
            default:
              return l;
          }
      } else if (t === "input" && l.type === "hidden") {
        var n = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && l.getAttribute("name") === n)
          return l;
      } else return l;
      if (l = Zt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function qh(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Zt(l.nextSibling), l === null)) return null;
    return l;
  }
  function Am(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Zt(l.nextSibling), l === null)) return null;
    return l;
  }
  function ro(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function mo(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function Bh(l, t) {
    var a = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || a.readyState !== "loading")
      t();
    else {
      var e = function() {
        t(), a.removeEventListener("DOMContentLoaded", e);
      };
      a.addEventListener("DOMContentLoaded", e), l._reactRetry = e;
    }
  }
  function Zt(l) {
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
  var vo = null;
  function pm(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Zt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Cm(l) {
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
  function Yh(l, t) {
    function a() {
      e = !0;
    }
    if (l.ownerDocument.activeElement === l) return !0;
    var e = !1;
    try {
      l.ownerDocument.addEventListener("focus", a, !0), (l.focus || HTMLElement.prototype.focus).call(l, t);
    } finally {
      l.ownerDocument.removeEventListener("focus", a, !0);
    }
    return e;
  }
  function Gh(l) {
    vm(function() {
      vm(function(t) {
        return l(t);
      });
    });
  }
  function Mm(l, t, a) {
    switch (t = sn(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(v(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(v(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(v(454));
        return l;
      default:
        throw Error(v(451));
    }
  }
  function Dm(l, t, a) {
    for (var e in a) {
      var u = a[e];
      a.hasOwnProperty(e) && u != null && zl(l, t, e, null, vh, u);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === ua && (l.onclick = null), An(l);
  }
  function ho(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    An(l);
  }
  var Kt = /* @__PURE__ */ new Map(), Um = /* @__PURE__ */ new Set();
  function rn(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var Da = V.d;
  V.d = {
    f: Xh,
    r: Qh,
    D: Vh,
    C: Lh,
    L: Zh,
    m: Kh,
    X: wh,
    S: Jh,
    M: $h
  };
  function Xh() {
    var l = Da.f(), t = Mi();
    return l || t;
  }
  function Qh(l) {
    var t = xe(l);
    t !== null && t.tag === 5 && t.type === "form" ? jr(t) : Da.r(l);
  }
  var yu = typeof document > "u" ? null : document;
  function Rm(l, t, a) {
    var e = yu;
    if (e && typeof t == "string" && t) {
      var u = Bt(t);
      u = 'link[rel="' + l + '"][href="' + u + '"]', typeof a == "string" && (u += '[crossorigin="' + a + '"]'), Um.has(u) || (Um.add(u), l = { rel: l, crossOrigin: a, href: t }, e.querySelector(u) === null && (t = e.createElement("link"), ft(t, "link", l), kl(t), e.head.appendChild(t)));
    }
  }
  function Vh(l) {
    Da.D(l), Rm("dns-prefetch", l, null);
  }
  function Lh(l, t) {
    Da.C(l, t), Rm("preconnect", l, t);
  }
  function Zh(l, t, a) {
    Da.L(l, t, a);
    var e = yu;
    if (e && l && t) {
      var u = 'link[rel="preload"][as="' + Bt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (u += '[imagesrcset="' + Bt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (u += '[imagesizes="' + Bt(
        a.imageSizes
      ) + '"]')) : u += '[href="' + Bt(l) + '"]';
      var n = u;
      switch (t) {
        case "style":
          n = gu(l);
          break;
        case "script":
          n = bu(l);
      }
      if (!(Kt.has(n) || (l = M(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Kt.set(n, l), e.querySelector(u) !== null || t === "style" && e.querySelector(dn(n)) || t === "script" && e.querySelector(mn(n))))) {
        var i = e.createElement("link");
        ft(i, "link", l), t === "style" && (i[Nn] = !0, i.onload = i.onerror = function() {
          Ko(i);
        }), kl(i), e.head.appendChild(i);
      }
    }
  }
  function Kh(l, t) {
    Da.m(l, t);
    var a = yu;
    if (a && l) {
      var e = t && typeof t.as == "string" ? t.as : "script", u = 'link[rel="modulepreload"][as="' + Bt(e) + '"][href="' + Bt(l) + '"]', n = u;
      switch (e) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = bu(l);
      }
      if (!Kt.has(n) && (l = M({ rel: "modulepreload", href: l }, t), Kt.set(n, l), a.querySelector(u) === null)) {
        switch (e) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(mn(n)))
              return;
        }
        e = a.createElement("link"), ft(e, "link", l), kl(e), a.head.appendChild(e);
      }
    }
  }
  function Jh(l, t, a) {
    Da.S(l, t, a);
    var e = yu;
    if (e && l) {
      var u = He(e).hoistableStyles, n = gu(l);
      t = t || "default";
      var i = u.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = e.querySelector(
          dn(n)
        ))
          c.loading = 5;
        else {
          l = M(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Kt.get(n)) && yo(l, a);
          var o = i = e.createElement("link");
          kl(o), ft(o, "link", l), o._p = new Promise(function(m, g) {
            o.onload = m, o.onerror = g;
          }), o.addEventListener("load", function() {
            c.loading |= 1;
          }), o.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, qi(i, t, e);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: c
        }, u.set(n, i);
      }
    }
  }
  function wh(l, t) {
    Da.X(l, t);
    var a = yu;
    if (a && l) {
      var e = He(a).hoistableScripts, u = bu(l), n = e.get(u);
      n || (n = a.querySelector(mn(u)), n || (l = M({ src: l, async: !0 }, t), (t = Kt.get(u)) && go(l, t), n = a.createElement("script"), kl(n), ft(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function $h(l, t) {
    Da.M(l, t);
    var a = yu;
    if (a && l) {
      var e = He(a).hoistableScripts, u = bu(l), n = e.get(u);
      n || (n = a.querySelector(mn(u)), n || (l = M({ src: l, async: !0, type: "module" }, t), (t = Kt.get(u)) && go(l, t), n = a.createElement("script"), kl(n), ft(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function jm(l, t, a, e) {
    var u = (u = Jt.current) ? rn(u) : null;
    if (!u) throw Error(v(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = gu(a.href), t = He(
          u
        ).hoistableStyles, e = t.get(a), e || (e = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = gu(a.href);
          var n = He(
            u
          ).hoistableStyles, i = n.get(l);
          if (i || (u = u.ownerDocument || u, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = u.querySelector(
            dn(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Kt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Kt.set(l, n)), Fh(
            u,
            l,
            n,
            i.state
          ))), t && e === null)
            throw Error(v(528, ""));
          return i;
        }
        if (t && e !== null)
          throw Error(v(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = bu(a), t = He(
          u
        ).hoistableScripts, e = t.get(a), e || (e = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(v(444, l));
    }
  }
  function gu(l) {
    return 'href="' + Bt(l) + '"';
  }
  function dn(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function xm(l) {
    return M({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function Fh(l, t, a, e) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[Nn] !== !0) {
        e.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[Nn] = !0, t.onload = t.onerror = Ko.bind(null, t), ft(t, "link", a), kl(t), l.head.appendChild(t);
    e.preload = t, t.addEventListener("load", function() {
      return e.loading |= 1;
    }), t.addEventListener("error", function() {
      return e.loading |= 2;
    });
  }
  function bu(l) {
    return '[src="' + Bt(l) + '"]';
  }
  function mn(l) {
    return "script[async]" + l;
  }
  function Hm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var e = l.querySelector(
            'style[data-href~="' + Bt(a.href) + '"]'
          );
          if (e)
            return t.instance = e, kl(e), e;
          var u = M({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return e = (l.ownerDocument || l).createElement(
            "style"
          ), kl(e), ft(e, "style", u), qi(e, a.precedence, l), t.instance = e;
        case "stylesheet":
          u = gu(a.href);
          var n = l.querySelector(
            dn(u)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, kl(n), n;
          e = xm(a), (u = Kt.get(u)) && yo(e, u), n = (l.ownerDocument || l).createElement("link"), kl(n);
          var i = n;
          return i._p = new Promise(function(c, o) {
            i.onload = c, i.onerror = o;
          }), ft(n, "link", e), t.state.loading |= 4, qi(n, a.precedence, l), t.instance = n;
        case "script":
          return n = bu(a.src), (u = l.querySelector(
            mn(n)
          )) ? (t.instance = u, kl(u), u) : (e = a, (u = Kt.get(n)) && (e = M({}, a), go(e, u)), l = l.ownerDocument || l, u = l.createElement("script"), kl(u), ft(u, "link", e), l.head.appendChild(u), t.instance = u);
        case "void":
          return null;
        default:
          throw Error(v(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (e = t.instance, t.state.loading |= 4, qi(e, a.precedence, l));
    return t.instance;
  }
  function qi(l, t, a) {
    for (var e = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), u = e.length ? e[e.length - 1] : null, n = u, i = 0; i < e.length; i++) {
      var c = e[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== u) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function yo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function go(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Bi = null;
  function qm(l, t, a) {
    if (Bi === null) {
      var e = /* @__PURE__ */ new Map(), u = Bi = /* @__PURE__ */ new Map();
      u.set(a, e);
    } else
      u = Bi, e = u.get(a), e || (e = /* @__PURE__ */ new Map(), u.set(a, e));
    if (e.has(l)) return e;
    for (e.set(l, null), a = a.getElementsByTagName(l), u = 0; u < a.length; u++) {
      var n = a[u];
      if (!(n[pu] || n[et] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = e.get(i);
        c ? c.push(n) : e.set(i, [n]);
      }
    }
    return e;
  }
  function bo(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function Wh(l, t, a) {
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
  function Ym(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Gm(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Xm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += Gm(t), l.suspenseyImages.push(t)), l = Ph.bind(l), t.decode().then(l, l));
  }
  function Ih(l, t, a, e) {
    if (a.type === "stylesheet" && (typeof e.media != "string" || matchMedia(e.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var u = gu(e.href), n = t.querySelector(
          dn(u)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = vn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, kl(n);
          return;
        }
        n = t.ownerDocument || t, e = xm(e), (u = Kt.get(u)) && yo(e, u), n = n.createElement("link"), kl(n);
        var i = n;
        i._p = new Promise(function(c, o) {
          i.onload = c, i.onerror = o;
        }), ft(n, "link", e), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = vn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Yi = 0;
  function kh(l, t) {
    return l.stylesheets && l.count === 0 && Xi(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var e = setTimeout(function() {
        if (l.stylesheets && Xi(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Yi === 0 && (Yi = 62500 * yh());
      var u = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Xi(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > Yi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(e), clearTimeout(u);
      };
    } : null;
  }
  function Qm(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) Xi(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function vn() {
    this.count--, Qm(this);
  }
  function Ph() {
    this.imgCount--, Qm(this);
  }
  var Gi = null;
  function Xi(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Gi = /* @__PURE__ */ new Map(), t.forEach(ly, l), Gi = null, vn.call(l));
  }
  function ly(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Gi.get(l);
      if (a) var e = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Gi.set(l, a);
        for (var u = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < u.length; n++) {
          var i = u[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), e = i);
        }
        e && a.set(null, e);
      }
      u = t.instance, i = u.getAttribute("data-precedence"), n = a.get(i) || e, n === e && a.set(null, u), a.set(i, u), this.count++, e = vn.bind(this), u.addEventListener("load", e), u.addEventListener("error", e), n ? n.parentNode.insertBefore(u, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(u, l.firstChild)), t.state.loading |= 4;
    }
  }
  var Su = {
    $$typeof: xl,
    Provider: null,
    Consumer: null,
    _currentValue: gt,
    _currentValue2: gt,
    _threadCount: 0
  };
  function ty(l, t, a, e, u, n, i, c, o) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Wi(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Wi(0), this.hiddenUpdates = Wi(null), this.identifierPrefix = e, this.onUncaughtError = u, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = o, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Vm(l, t, a, e, u, n, i, c, o, m, g, _) {
    return l = new ty(
      l,
      t,
      a,
      i,
      o,
      m,
      g,
      _,
      c
    ), t = 1, n === !0 && (t |= 24), n = St(3, null, null, t), l.current = n, n.stateNode = l, t = Uc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: e,
      isDehydrated: a,
      cache: t
    }, Hc(n), l;
  }
  function Lm(l) {
    return l ? (l = Ke, l) : Ke;
  }
  function Zm(l, t, a, e, u, n) {
    u = Lm(u), e.context === null ? e.context = u : e.pendingContext = u, e = Va(t), e.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (e.callback = n), a = La(l, e, t), a !== null && (_t(a, l, t), Zu(a, l, t));
  }
  function Km(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function So(l, t) {
    Km(l, t), (l = l.alternate) && Km(l, t);
  }
  function Jm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = ve(l, 67108864);
      t !== null && _t(t, l, 67108864), So(l, 67108864);
    }
  }
  function wm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Ht();
      t = Ii(t);
      var a = ve(l, t);
      a !== null && _t(a, l, t), So(l, t);
    }
  }
  var Tu = !0;
  function ay(l, t, a, e) {
    var u = Y.T;
    Y.T = null;
    var n = V.p;
    try {
      V.p = 2, To(l, t, a, e);
    } finally {
      V.p = n, Y.T = u;
    }
  }
  function ey(l, t, a, e) {
    var u = Y.T;
    Y.T = null;
    var n = V.p;
    try {
      V.p = 8, To(l, t, a, e);
    } finally {
      V.p = n, Y.T = u;
    }
  }
  function To(l, t, a, e) {
    if (Tu) {
      var u = Eo(e);
      if (u === null)
        lo(
          l,
          t,
          e,
          Qi,
          a
        ), Fm(l, e);
      else if (ny(
        u,
        l,
        t,
        a,
        e
      ))
        e.stopPropagation();
      else if (Fm(l, e), t & 4 && -1 < uy.indexOf(l)) {
        for (; u !== null; ) {
          var n = xe(u);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = oe(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var o = 1 << 31 - Ct(i);
                      c.entanglements[1] |= o, i &= ~o;
                    }
                    va(n), (gl & 6) === 0 && (Ai = At() + 500, cn(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ve(n, 2), c !== null && _t(c, n, 2), Mi(), So(n, 2);
            }
          if (n = Eo(e), n === null && lo(
            l,
            t,
            e,
            Qi,
            a
          ), n === u) break;
          u = n;
        }
        u !== null && e.stopPropagation();
      } else
        lo(
          l,
          t,
          e,
          null,
          a
        );
    }
  }
  function Eo(l) {
    return l = uc(l), zo(l);
  }
  var Qi = null;
  function zo(l) {
    if (Qi = null, l = se(l), l !== null) {
      var t = X(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = tl(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = vl(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Qi = l, null;
  }
  function $m(l) {
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
        switch (y0()) {
          case jo:
            return 2;
          case xo:
            return 8;
          case Tn:
          case g0:
            return 32;
          case Ho:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var _o = !1, te = null, ae = null, ee = null, hn = /* @__PURE__ */ new Map(), yn = /* @__PURE__ */ new Map(), ue = [], uy = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Fm(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        te = null;
        break;
      case "dragenter":
      case "dragleave":
        ae = null;
        break;
      case "mouseover":
      case "mouseout":
        ee = null;
        break;
      case "pointerover":
      case "pointerout":
        hn.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        yn.delete(t.pointerId);
    }
  }
  function gn(l, t, a, e, u, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: e,
      nativeEvent: n,
      targetContainers: [u]
    }, t !== null && (t = xe(t), t !== null && Jm(t)), l) : (l.eventSystemFlags |= e, t = l.targetContainers, u !== null && t.indexOf(u) === -1 && t.push(u), l);
  }
  function ny(l, t, a, e, u) {
    switch (t) {
      case "focusin":
        return te = gn(
          te,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "dragenter":
        return ae = gn(
          ae,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "mouseover":
        return ee = gn(
          ee,
          l,
          t,
          a,
          e,
          u
        ), !0;
      case "pointerover":
        var n = u.pointerId;
        return hn.set(
          n,
          gn(
            hn.get(n) || null,
            l,
            t,
            a,
            e,
            u
          )
        ), !0;
      case "gotpointercapture":
        return n = u.pointerId, yn.set(
          n,
          gn(
            yn.get(n) || null,
            l,
            t,
            a,
            e,
            u
          )
        ), !0;
    }
    return !1;
  }
  function Wm(l) {
    var t = se(l.target);
    if (t !== null) {
      var a = X(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = tl(a), t !== null) {
            l.blockedOn = t, Vo(l.priority, function() {
              wm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = vl(a), t !== null) {
            l.blockedOn = t, Vo(l.priority, function() {
              wm(a);
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
  function Vi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = Eo(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var e = new a.constructor(
          a.type,
          a
        );
        ec = e, a.target.dispatchEvent(e), ec = null;
      } else
        return t = xe(a), t !== null && Jm(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Im(l, t, a) {
    Vi(l) && a.delete(t);
  }
  function iy() {
    _o = !1, te !== null && Vi(te) && (te = null), ae !== null && Vi(ae) && (ae = null), ee !== null && Vi(ee) && (ee = null), hn.forEach(Im), yn.forEach(Im);
  }
  function Li(l, t) {
    l.blockedOn === t && (l.blockedOn = null, _o || (_o = !0, O.unstable_scheduleCallback(
      O.unstable_NormalPriority,
      iy
    )));
  }
  var Zi = null;
  function km(l) {
    Zi !== l && (Zi = l, O.unstable_scheduleCallback(
      O.unstable_NormalPriority,
      function() {
        Zi === l && (Zi = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], e = l[t + 1], u = l[t + 2];
          if (typeof e != "function") {
            if (zo(e || a) === null)
              continue;
            break;
          }
          var n = xe(a);
          n !== null && (l.splice(t, 3), t -= 3, af(
            n,
            {
              pending: !0,
              data: u,
              method: a.method,
              action: e
            },
            e,
            u
          ));
        }
      }
    ));
  }
  function Eu(l) {
    function t(o) {
      return Li(o, l);
    }
    te !== null && Li(te, l), ae !== null && Li(ae, l), ee !== null && Li(ee, l), hn.forEach(t), yn.forEach(t);
    for (var a = 0; a < ue.length; a++) {
      var e = ue[a];
      e.blockedOn === l && (e.blockedOn = null);
    }
    for (; 0 < ue.length && (a = ue[0], a.blockedOn === null); )
      Wm(a), a.blockedOn === null && ue.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (e = 0; e < a.length; e += 3) {
        var u = a[e], n = a[e + 1], i = u[bt] || null;
        if (typeof n == "function")
          i || km(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (u = n, i = n[bt] || null)
              c = i.formAction;
            else if (zo(u) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[e + 1] = c : (a.splice(e, 3), e -= 3), km(a);
        }
      }
  }
  function Pm() {
    function l(n) {
      n.canIntercept && n.info === "react-transition" && n.intercept({
        handler: function() {
          return new Promise(function(i) {
            return u = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      u !== null && (u(), u = null), e || setTimeout(a, 20);
    }
    function a() {
      if (!e && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var e = !1, u = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(a, 100), function() {
        e = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), u !== null && (u(), u = null);
      };
    }
  }
  function Oo(l) {
    this._internalRoot = l;
  }
  Ki.prototype.render = Oo.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(v(409));
    var a = t.current, e = Ht();
    Zm(a, e, l, t, null, null);
  }, Ki.prototype.unmount = Oo.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Zm(l.current, 2, null, l, null, null), Mi(), t[je] = null;
    }
  };
  function Ki(l) {
    this._internalRoot = l;
  }
  Ki.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Qo();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < ue.length && t !== 0 && t < ue[a].priority; a++) ;
      ue.splice(a, 0, l), a === 0 && Wm(l);
    }
  };
  var l0 = C.version;
  if (l0 !== "19.3.0")
    throw Error(
      v(
        527,
        l0,
        "19.3.0"
      )
    );
  V.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(v(188)) : (l = Object.keys(l).join(","), Error(v(268, l)));
    return l = al(t), l = l !== null ? B(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var cy = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: Y,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ji = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ji.isDisabled && Ji.supportsFiber)
      try {
        Ou = Ji.inject(
          cy
        ), pt = Ji;
      } catch {
      }
  }
  return Sn.createRoot = function(l, t) {
    if (!L(l)) throw Error(v(299));
    var a = !1, e = "", u = Lr, n = Zr, i = Kr;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (e = t.identifierPrefix), t.onUncaughtError !== void 0 && (u = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Vm(
      l,
      1,
      !1,
      null,
      null,
      a,
      e,
      null,
      u,
      n,
      i,
      Pm
    ), l[je] = t.current, Pf(l), new Oo(t);
  }, Sn.hydrateRoot = function(l, t, a) {
    if (!L(l)) throw Error(v(299));
    var e = !1, u = "", n = Lr, i = Zr, c = Kr, o = null;
    return a != null && (a.unstable_strictMode === !0 && (e = !0), a.identifierPrefix !== void 0 && (u = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (o = a.formState)), t = Vm(
      l,
      1,
      !0,
      t,
      a ?? null,
      e,
      u,
      o,
      n,
      i,
      c,
      Pm
    ), t.context = Lm(null), a = t.current, e = Ht(), e = Ii(e), u = Va(e), u.callback = null, La(a, u, e), a = e, t.current.lanes = a, Au(t, a), va(t), l[je] = t.current, Pf(l), new Ki(t);
  }, Sn.version = "19.3.0", Sn;
}
var s0;
function gy() {
  if (s0) return po.exports;
  s0 = 1;
  function O() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(O);
      } catch (C) {
        console.error(C);
      }
  }
  return O(), po.exports = yy(), po.exports;
}
var by = gy();
function Sy(O, C) {
  const U = (f) => O.querySelector(`[data-mlb="${f}"]`), v = (f) => O.querySelector(`[data-mlb-template="${f}"]`).content.firstElementChild.cloneNode(!0), L = (f, S) => {
    U(f).textContent = S;
  }, X = (f, S) => {
    U(f).hidden = !S;
  }, tl = (f, S, N = !1) => {
    U(f).onclick = S, U(f).disabled = N;
  };
  function vl(f, S, N) {
    const D = JSON.stringify(S);
    f.dataset.options !== D && (f.replaceChildren(...S.map(([K, P]) => {
      const F = v("option");
      return F.value = K, F.textContent = P, F;
    })), f.dataset.options = D), f.value = N;
  }
  function J(f, S, N) {
    const D = U(f), K = JSON.stringify(S);
    D.dataset.content !== K && (D.replaceChildren(...N()), D.dataset.content = K);
  }
  const {
    catalog: al,
    error: B,
    feedback: T,
    busy: j,
    config: $,
    selected: _l,
    source: Bl,
    allSources: ll,
    allYears: jl,
    activeYear: Zl,
    sources: Wl,
    years: Cl,
    themes: Ml,
    theme: Yl,
    search: M,
    facets: H,
    dimensions: Ol,
    filtered: Dl,
    visible: yl,
    page: Sl,
    selectedItems: at,
    sourceLabel: yt,
    themeLabel: xl,
    metadata: A,
    limits: Q,
    preview: R,
    previewError: fl,
    resultado: ul
  } = C, Al = !al || j;
  X("loading", !al), L("loading", B ? "Não foi possível carregar o catálogo." : "Carregando catálogo…"), X("retry", !al && !!B), tl("retry", () => C.setAttempt((f) => f + 1)), X("error", !!B && !T), L("error", B), vl(U("source"), [["__todas__", "Todas as fontes"], ...Wl.map((f) => [f, yt(f)])], Bl), vl(U("year"), [...ll ? [["", "Todos os anos"]] : [], ...Cl.map((f) => [f, f])], jl ? "" : Zl ?? ""), vl(U("theme"), [["", "Todos os temas"], ...Ml.map((f) => [f, xl(f)])], Yl);
  for (const f of ["source", "year", "theme", "search", "format", "name"]) U(f).disabled = Al;
  U("source").onchange = (f) => {
    C.setSource(f.target.value), C.setTheme(""), f.target.value === "__todas__" && C.setYear("");
  }, U("year").onchange = (f) => {
    C.setYear(f.target.value), C.setTheme("");
  }, U("theme").onchange = (f) => C.setTheme(f.target.value), U("search").value = M, U("search").oninput = (f) => C.setSearch(f.target.value), J("facets", Ol, () => Ol.map(([f, S]) => {
    const N = v("facet");
    N.querySelector("span").textContent = f;
    const D = N.querySelector("select");
    return D.dataset.dimension = f, vl(D, [["", `Todos (${S.length})`], ...S.map((K) => [K, K])], H[f] ?? ""), N;
  }));
  for (const f of U("facets").querySelectorAll("select"))
    f.value = H[f.dataset.dimension] ?? "", f.disabled = Al, f.onchange = (S) => C.setFacets({ ...H, [f.dataset.dimension]: S.target.value });
  X("reset", Object.values(H).some(Boolean)), tl("reset", () => C.setFacets({}), Al), L("available", `${Dl.length.toLocaleString("pt-BR")} atributos disponíveis`), tl("add", () => C.update({ ...$, attributes: [.../* @__PURE__ */ new Set([...$.attributes, ...Dl.map((f) => f.id)])] }), Al || !Dl.length), tl("clear", () => C.update({ ...$, attributes: [] }), Al || !_l.size);
  const Xl = (f) => `${xl(f.theme)} · ${f.unit || "Unidade não informada"} · ${f.coverage}/645 com valor`;
  J("attributes", [yl, ll], () => yl.map((f) => {
    const S = v("attribute");
    S.dataset.id = f.id, S.querySelector("strong").textContent = f.label, S.querySelector("summary").setAttribute("aria-label", `Fonte e definição de ${f.label}`), S.querySelector(".mlb-detail-meta").textContent = Xl(f), S.querySelector("[data-field]").textContent = `${ll ? `${f.source} · ` : ""}${f.field} · ${f.year}`;
    const N = S.querySelector("a");
    try {
      const D = new URL(f.url);
      ["https:", "http:"].includes(D.protocol) && (N.href = D.href);
    } catch {
    }
    return S.querySelector("[data-definition]").textContent = A(f).definicao || A(f).divulgacao || "", S.querySelector("[data-note]").textContent = A(f).nota || "", S;
  }));
  for (const f of U("attributes").children) {
    const S = f.querySelector("input");
    S.checked = _l.has(f.dataset.id), S.disabled = Al, S.onchange = () => C.toggle(f.dataset.id), f.classList.toggle("mlb-chosen", S.checked);
  }
  X("empty", !yl.length), tl("previous", () => C.setPage(Sl - 1), Al || !Sl), tl("next", () => C.setPage(Sl + 1), Al || (Sl + 1) * 40 >= Dl.length), L("page", `Página ${Sl + 1} de ${Math.max(1, Math.ceil(Dl.length / 40))}`), L("count", $.attributes.length.toLocaleString("pt-BR")), J("basket", at, () => at.map((f) => {
    const S = v("basket");
    S.dataset.id = f.id, S.querySelector(".mlb-basket-name").textContent = f.label, S.querySelector("summary").setAttribute("aria-label", `Fonte e definição de ${f.label}`), S.querySelector(".mlb-detail-meta").textContent = `${f.source} · ${f.year}`, S.querySelector("[data-description]").textContent = Xl(f), S.querySelector("[data-field]").textContent = f.field;
    const N = S.querySelector("button");
    return N.title = `Remover ${f.label}`, N.setAttribute("aria-label", N.title), S;
  }));
  for (const f of U("basket").children)
    f.querySelector("button").disabled = Al, f.querySelector("button").onclick = () => C.toggle(f.dataset.id);
  X("basket-empty", !at.length), U("format").value = $.format, U("format").onchange = (f) => C.update({ ...$, format: f.target.value }), L("format-note", $.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : $.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados."), U("name").value = $.nome ?? "", U("name").placeholder = C.nomePadrao, U("name").oninput = (f) => C.update({ ...$, nome: f.target.value }), X("limit", !T && _l.size > Q[$.format]), X("category-required", !C.canGenerate), tl("generate", C.generate, !C.canGenerate || Al || !_l.size || _l.size > Q[$.format]), L("generate", j ? "Gerando camada…" : C.download ? "Gerar e baixar camada" : "Gerar camada"), X("status", !T), L("status", C.status), X("results", !!(ul || fl || R)), X("preview-error", !!fl), L("preview-error-text", T ? "" : `Prévia indisponível: ${fl} `), tl("preview-retry", () => C.setPreviewAttempt((f) => f + 1)), X("preview", !!R), X("glossary", !!R?.glossario?.length);
  const rt = U("preview-head");
  if (rt.dataset.fields !== JSON.stringify(R?.fields)) {
    [...rt.children].slice(2).forEach((f) => f.remove());
    for (const f of R?.fields || []) {
      const S = v("head");
      S.textContent = f, rt.append(S);
    }
    rt.dataset.fields = JSON.stringify(R?.fields);
  }
  J("preview-body", R, () => (R?.rows || []).map((f) => {
    const S = v("row");
    for (const N of ["CD_MUN", "NM_MUN", ...R.fields]) {
      const D = v("cell");
      D.textContent = f[N] == null ? "Sem valor" : f[N].toLocaleString("pt-BR", { maximumFractionDigits: 8 }), S.append(D);
    }
    return S;
  })), J("glossary-body", R?.glossario, () => (R?.glossario || []).map((f) => {
    const S = v("glossary");
    return S.querySelector("code").textContent = f.campo_exportado, ["alias", "significado", "fonte"].forEach((N, D) => S.children[D + 1].textContent = f[N]), S;
  })), L("glossary-note", R?.totalAttributes > (R?.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${R.glossarioLimite} de ${R.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : "");
}
function Ty(O = "/api") {
  async function C(U, v, L) {
    const X = await fetch(`${O.replace(/\/$/, "")}/${U}`, {
      ...v ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) } : {},
      signal: L
    });
    if (!X.ok) {
      const tl = await X.json().catch(() => ({}));
      throw new Error(tl.error || `Erro HTTP ${X.status}`);
    }
    return U === "export" ? X.blob() : X.json();
  }
  return { catalog: (U) => C("catalog", null, U), preview: (U, v) => C("preview", U, v), export: (U, v) => C("export", U, v) };
}
const r0 = {
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
}, wi = (O) => {
  try {
    return JSON.parse(O.detail) || {};
  } catch {
    return {};
  }
}, $i = (O) => {
  if (r0[O]) return r0[O];
  const C = String(O).replace(/^\d+_/, "").replaceAll("_", " ");
  return C.charAt(0).toLocaleUpperCase("pt-BR") + C.slice(1);
}, Ey = {
  "IBGE · Censo 2022": "IBGE — Censo Demográfico 2022",
  "IBGE / Cadastro Central de Empresas": "IBGE — Cadastro Central de Empresas",
  "IBGE / Finanças públicas": "IBGE — Finanças Públicas",
  "IBGE / Produto Interno Bruto dos Municípios": "IBGE — Produto Interno Bruto dos Municípios",
  "IBGE / Índice de Desenvolvimento da Educação Básica": "IBGE — Índice de Desenvolvimento da Educação Básica",
  "Ipeadata / Atlas do Desenvolvimento Humano (Censo Demográfico)": "Ipea — Atlas do Desenvolvimento Humano",
  "InfoSiga SP": "Detran-SP — InfoSiga",
  "MTE / RAIS": "MTE — RAIS",
  "Seade · IPDM": "Fundação Seade — IPDM"
}, d0 = (O) => Ey[O] || String(O).replace(/\s*[·/]\s*/g, " — ");
function zy(O) {
  let C = "";
  try {
    C = JSON.parse(O.detail).categorias || "";
  } catch {
    C = "";
  }
  const U = {};
  for (const v of String(C).split("|")) {
    const L = v.indexOf(":");
    if (L < 1) continue;
    const X = v.slice(0, L).trim(), tl = v.slice(L + 1).trim();
    X && tl && (U[X] = tl);
  }
  return U;
}
const zu = { fgb: 6500, gpkg: 1900, shp: 250, geojson: 6500 }, Uo = "__todas__";
function _y({ apiBaseUrl: O = "/api", client: C, value: U, onChange: v, onExport: L, download: X = !0, className: tl = "", categoriaNome: vl = "", feedback: J, resultado: al = null, htmlHost: B = null, canGenerate: T = !0 }) {
  const j = rl.useMemo(() => C || Ty(O), [C, O]), [$, _l] = rl.useState(null), [Bl, ll] = rl.useState(0), [jl, Zl] = rl.useState(""), [Wl, Cl] = rl.useState(0), [Ml, Yl] = rl.useState({ attributes: [], format: "fgb" }), M = U ?? Ml, [H, Ol] = rl.useState(""), [Dl, yl] = rl.useState("2022"), [Sl, at] = rl.useState(""), [yt, xl] = rl.useState(""), [A, Q] = rl.useState({}), [R, fl] = rl.useState(0), [ul, Al] = rl.useState(""), [Xl, rt] = rl.useState(!1), [f, S] = rl.useState(""), [N, D] = rl.useState(null), K = rl.useRef(!0);
  rl.useEffect(() => {
    K.current = !0;
    const E = new AbortController();
    return _l(null), Al(""), j.catalog(E.signal).then((W) => {
      _l(W), Ol(W.attributes.find((dl) => dl.source === "IBGE · Censo 2022")?.source || W.attributes[0]?.source || "");
    }).catch((W) => {
      W.name !== "AbortError" && (Al(W.message), J?.error(W.message, "Catálogo de indicadores"));
    }), () => {
      K.current = !1, E.abort();
    };
  }, [j, Bl]);
  function P(E) {
    J && E.attributes.length > zu[E.format] && (E.format !== M.format || M.attributes.length <= zu[M.format]) && J.warning("Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos.", "Formato da camada"), U === void 0 && Yl(E), v?.(E), S("");
  }
  const F = $?.attributes || [], Y = [...new Set(F.map((E) => E.source))], V = H === Uo, gt = [...new Set(F.filter((E) => V || E.source === H).map((E) => E.year))].sort((E, W) => W - E), Ua = V && Dl === "", ta = Ua ? null : gt.includes(Number(Dl)) ? Number(Dl) : gt[0], Ot = F.filter((E) => (V || E.source === H) && (Ua || E.year === ta)), Kl = [...new Set(Ot.map((E) => E.theme))], nl = new Set(M.attributes), Nt = rl.useMemo(() => {
    const E = F.filter((Hl) => nl.has(Hl.id));
    if (!E.length) return "Categoria — fonte majoritária — data da geração";
    const W = /* @__PURE__ */ new Map();
    for (const Hl of E) W.set(Hl.source, (W.get(Hl.source) || 0) + 1);
    const dl = [...W.entries()].sort((Hl, ea) => ea[1] - Hl[1])[0][0];
    return `${vl || "Categoria"} — ${dl} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [F, M.attributes, vl]), aa = F.filter((E) => nl.has(E.id)), Jt = rl.useMemo(() => new Map(F.map((E) => [E.id, zy(E)])), [F]), ie = Ot.filter((E) => (!Sl || E.theme === Sl) && `${E.label} ${E.field} ${E.unit}`.toLocaleLowerCase("pt-BR").includes(yt.toLocaleLowerCase("pt-BR"))), ce = (E, W) => Object.entries(A).every(([dl, Hl]) => !Hl || dl === W || Jt.get(E.id)?.[dl] === Hl), ha = (() => {
    if (!Sl) return [];
    const E = /* @__PURE__ */ new Map();
    for (const W of ie) for (const [dl, Hl] of Object.entries(Jt.get(W.id) || {}))
      E.has(dl) || E.set(dl, /* @__PURE__ */ new Set()), ce(W, dl) && E.get(dl).add(Hl);
    return [...E].map(([W, dl]) => [W, [...dl].sort((Hl, ea) => Hl.localeCompare(ea, "pt-BR", { numeric: !0 }))]).filter(([W, dl]) => dl.length > 1 || A[W]).sort((W, dl) => W[0].localeCompare(dl[0], "pt-BR"));
  })(), wt = ie.filter((E) => ce(E, null)), Ra = wt.slice(R * 40, R * 40 + 40);
  rl.useEffect(() => {
    fl(0);
  }, [H, Dl, Sl, yt, A]), rl.useEffect(() => {
    Q({});
  }, [H, Dl, Sl]);
  const _u = `${M.format}|${[...M.attributes].join(",")}`;
  rl.useEffect(() => {
    if (D(null), Zl(""), !M.attributes.length || M.attributes.length > zu[M.format]) return;
    const E = new AbortController(), W = { attributes: M.attributes, format: M.format }, dl = setTimeout(() => j.preview(W, E.signal).then((Hl) => {
      E.signal.aborted || D(Hl);
    }).catch((Hl) => {
      E.signal.aborted || (Zl(Hl.message), J?.error(Hl.message, "Prévia dos indicadores"));
    }), 250);
    return () => {
      clearTimeout(dl), E.abort();
    };
  }, [j, _u, Wl]);
  function Re(E) {
    P({ ...M, attributes: nl.has(E) ? M.attributes.filter((W) => W !== E) : [...M.attributes, E] });
  }
  async function $t() {
    if (!T || J && !await J.confirmar({ title: "Gerar camada territorial", message: `Gerar uma camada com ${M.attributes.length} atributos dos 645 municípios de São Paulo?`, confirmLabel: "Gerar camada" })) return;
    const E = J?.processo("Gerando camada territorial");
    E?.passo("Gerando a geometria e materializando os atributos selecionados…"), rt(!0), Al(""), S($?.destino ? `Gerando geometria e tabela de atributos em ${$.destino}/` : "Gerando geometria e tabela de atributos…");
    const W = { ...M, attributes: [...M.attributes] };
    try {
      const dl = await j.export(W, E?.signal, E), Hl = `municipios_sp_${W.format}.zip`;
      if (await L?.({ blob: dl, filename: Hl, configuration: W, attributes: aa }), X) {
        const ea = URL.createObjectURL(dl), fe = document.createElement("a");
        fe.href = ea, fe.download = Hl, fe.click(), setTimeout(() => URL.revokeObjectURL(ea), 1e4);
      }
      K.current && S("Camada gerada. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT."), E?.concluir({ type: "success", message: "Camada gerada e disponível no acervo. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT." });
    } catch (dl) {
      K.current && (Al(dl.message), S("")), E?.concluir({ type: dl.name === "AbortError" ? "info" : "error", message: dl.message });
    } finally {
      K.current && rt(!1);
    }
  }
  return rl.useEffect(() => {
    B && Sy(B, {
      catalog: $,
      error: ul,
      feedback: J,
      busy: Xl,
      config: M,
      selected: nl,
      source: H,
      allSources: V,
      allYears: Ua,
      activeYear: ta,
      sources: Y,
      years: gt,
      themes: Kl,
      theme: Sl,
      search: yt,
      facets: A,
      dimensions: ha,
      filtered: wt,
      visible: Ra,
      page: R,
      selectedItems: aa,
      sourceLabel: d0,
      themeLabel: $i,
      metadata: wi,
      limits: zu,
      preview: N,
      previewError: jl,
      resultado: al,
      nomePadrao: Nt,
      download: X,
      status: f,
      canGenerate: T,
      setAttempt: ll,
      setSource: Ol,
      setTheme: at,
      setYear: yl,
      setSearch: xl,
      setFacets: Q,
      update: P,
      toggle: Re,
      setPage: fl,
      generate: $t,
      setPreviewAttempt: Cl
    });
  }), B ? al : /* @__PURE__ */ b.jsxs("section", { className: `mlb ${tl}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ b.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ b.jsxs("div", { children: [
        /* @__PURE__ */ b.jsx("h2", { className: "mlb-title", children: "Monte sua camada" }),
        /* @__PURE__ */ b.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO - DADOS MUNICIPAIS" }),
        /* @__PURE__ */ b.jsx("p", { children: "Selecione fontes, períodos, temas e atributos para compor uma única camada vetorial dos 645 municípios de São Paulo. Os dados escolhidos serão incorporados à tabela de atributos da malha municipal do IBGE de 2022." })
      ] }),
      /* @__PURE__ */ b.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ b.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ b.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    ul && !J && /* @__PURE__ */ b.jsx("div", { className: "mlb-error", role: "alert", children: ul }),
    $ ? /* @__PURE__ */ b.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ b.jsxs("select", { value: H, onChange: (E) => {
              Ol(E.target.value), at(""), E.target.value === Uo && yl("");
            }, children: [
              /* @__PURE__ */ b.jsx("option", { value: Uo, children: "Todas as fontes" }),
              Y.map((E) => /* @__PURE__ */ b.jsx("option", { value: E, children: d0(E) }, E))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ b.jsxs("select", { value: Ua ? "" : ta ?? "", onChange: (E) => {
              yl(E.target.value), at("");
            }, children: [
              V && /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os anos" }),
              gt.map((E) => /* @__PURE__ */ b.jsx("option", { children: E }, E))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ b.jsxs("select", { value: Sl, onChange: (E) => at(E.target.value), children: [
              /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os temas" }),
              Kl.map((E) => /* @__PURE__ */ b.jsx("option", { value: E, children: $i(E) }, E))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ b.jsx("input", { type: "search", value: yt, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (E) => xl(E.target.value) })
          ] }),
          ha.map(([E, W]) => /* @__PURE__ */ b.jsxs("label", { children: [
            E,
            /* @__PURE__ */ b.jsxs("select", { value: A[E] ?? "", onChange: (dl) => Q({ ...A, [E]: dl.target.value }), children: [
              /* @__PURE__ */ b.jsxs("option", { value: "", children: [
                "Todos (",
                W.length,
                ")"
              ] }),
              W.map((dl) => /* @__PURE__ */ b.jsx("option", { value: dl, children: dl }, dl))
            ] })
          ] }, E)),
          !!Object.values(A).filter(Boolean).length && /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => Q({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ b.jsxs("span", { children: [
            wt.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ b.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !wt.length || Xl, onClick: () => P({ ...M, attributes: [.../* @__PURE__ */ new Set([...M.attributes, ...wt.map((E) => E.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !nl.size || Xl, onClick: () => P({ ...M, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-attributes", children: [
          Ra.map((E) => /* @__PURE__ */ b.jsxs("article", { className: nl.has(E.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ b.jsxs("label", { children: [
              /* @__PURE__ */ b.jsx("input", { type: "checkbox", checked: nl.has(E.id), disabled: Xl, onChange: () => Re(E.id) }),
              /* @__PURE__ */ b.jsx("strong", { children: E.label })
            ] }),
            /* @__PURE__ */ b.jsxs("details", { children: [
              /* @__PURE__ */ b.jsx("summary", { "aria-label": `Fonte e definição de ${E.label}` }),
              /* @__PURE__ */ b.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ b.jsxs("p", { className: "mlb-detail-meta", children: [
                  $i(E.theme),
                  " · ",
                  E.unit || "Unidade não informada",
                  " · ",
                  E.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsxs("p", { children: [
                  V ? `${E.source} · ` : "",
                  E.field,
                  " · ",
                  E.year
                ] }),
                /* @__PURE__ */ b.jsx("a", { href: E.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ b.jsx("p", { children: wi(E).definicao || wi(E).divulgacao || "" }),
                /* @__PURE__ */ b.jsx("p", { children: wi(E).nota || "" })
              ] })
            ] })
          ] }, E.id)),
          !Ra.length && /* @__PURE__ */ b.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ b.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !R, onClick: () => fl(R - 1), children: "Anterior" }),
          /* @__PURE__ */ b.jsxs("span", { children: [
            "Página ",
            R + 1,
            " de ",
            Math.max(1, Math.ceil(wt.length / 40))
          ] }),
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: (R + 1) * 40 >= wt.length, onClick: () => fl(R + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ b.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ b.jsx("strong", { children: M.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ b.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ b.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-basket", children: [
          aa.map((E) => /* @__PURE__ */ b.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ b.jsx("span", { className: "mlb-basket-name", children: E.label }),
            /* @__PURE__ */ b.jsxs("details", { children: [
              /* @__PURE__ */ b.jsx("summary", { "aria-label": `Fonte e definição de ${E.label}` }),
              /* @__PURE__ */ b.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ b.jsxs("p", { className: "mlb-detail-meta", children: [
                  E.source,
                  " · ",
                  E.year
                ] }),
                /* @__PURE__ */ b.jsxs("p", { children: [
                  $i(E.theme),
                  " · ",
                  E.unit || "Unidade não informada",
                  " · ",
                  E.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsx("p", { children: E.field })
              ] })
            ] }),
            /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: Xl, title: `Remover ${E.label}`, "aria-label": `Remover ${E.label}`, onClick: () => Re(E.id), children: "×" })
          ] }, E.id)),
          !aa.length && /* @__PURE__ */ b.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ b.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ b.jsxs("select", { disabled: Xl, value: M.format, onChange: (E) => P({ ...M, format: E.target.value }), children: [
            /* @__PURE__ */ b.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ b.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ b.jsx("option", { value: "shp", children: "Shapefile (.shp)" }),
            /* @__PURE__ */ b.jsx("option", { value: "geojson", children: "GeoJSON (.geojson)" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("p", { className: "mlb-note", children: [
          M.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : M.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP com relatório do join, glossário e tabela em CSV, XLSX e TXT."
        ] }),
        /* @__PURE__ */ b.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ b.jsx("input", { type: "text", maxLength: 200, disabled: Xl, value: M.nome ?? "", placeholder: Nt, onChange: (E) => P({ ...M, nome: E.target.value }) })
        ] }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        !J && nl.size > zu[M.format] && /* @__PURE__ */ b.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-primary", disabled: !T || Xl || !nl.size || nl.size > zu[M.format], onClick: $t, children: Xl ? "Gerando camada…" : X ? "Gerar e baixar camada" : "Gerar camada" }),
        !J && /* @__PURE__ */ b.jsx("p", { className: "mlb-status", role: "status", children: f }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      (al || jl || N) && /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel mlb-resultados", "aria-label": "Resultados", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "Resultados" }),
        al,
        jl && /* @__PURE__ */ b.jsxs("div", { className: J ? "mlb-bloco mlb-preview" : "mlb-bloco mlb-error mlb-preview", children: [
          !J && /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
            "Prévia indisponível: ",
            jl,
            " "
          ] }),
          /* @__PURE__ */ b.jsx("button", { type: "button", onClick: () => Cl((E) => E + 1), children: "Tentar novamente" })
        ] }),
        N && /* @__PURE__ */ b.jsxs("section", { className: "mlb-bloco mlb-preview", children: [
          /* @__PURE__ */ b.jsx("h3", { children: "Prévia da tabela de atributos" }),
          /* @__PURE__ */ b.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
          /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
              /* @__PURE__ */ b.jsx("th", { children: "Código IBGE" }),
              /* @__PURE__ */ b.jsx("th", { children: "Município" }),
              N.fields.map((E) => /* @__PURE__ */ b.jsx("th", { children: E }, E))
            ] }) }),
            /* @__PURE__ */ b.jsx("tbody", { children: N.rows.map((E) => /* @__PURE__ */ b.jsxs("tr", { children: [
              /* @__PURE__ */ b.jsx("td", { children: E.CD_MUN }),
              /* @__PURE__ */ b.jsx("td", { children: E.NM_MUN }),
              N.fields.map((W) => /* @__PURE__ */ b.jsx("td", { children: E[W] == null ? "Sem valor" : E[W].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, W))
            ] }, E.CD_MUN)) })
          ] }) })
        ] }),
        N?.glossario?.length ? /* @__PURE__ */ b.jsxs("section", { className: "mlb-bloco mlb-glossario", children: [
          /* @__PURE__ */ b.jsx("h3", { children: "Glossário e aliases de atributos" }),
          /* @__PURE__ */ b.jsxs("p", { children: [
            "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
            N.totalAttributes > (N.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${N.glossarioLimite} de ${N.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
          ] }),
          /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
              /* @__PURE__ */ b.jsx("th", { children: "Campo exportado" }),
              /* @__PURE__ */ b.jsx("th", { children: "Alias" }),
              /* @__PURE__ */ b.jsx("th", { children: "Significado" }),
              /* @__PURE__ */ b.jsx("th", { children: "Fonte" })
            ] }) }),
            /* @__PURE__ */ b.jsx("tbody", { children: N.glossario.map((E) => /* @__PURE__ */ b.jsxs("tr", { children: [
              /* @__PURE__ */ b.jsx("td", { children: /* @__PURE__ */ b.jsx("code", { children: E.campo_exportado }) }),
              /* @__PURE__ */ b.jsx("td", { children: E.alias }),
              /* @__PURE__ */ b.jsx("td", { className: "mlb-glossario-significado", children: E.significado }),
              /* @__PURE__ */ b.jsx("td", { children: E.fonte })
            ] }, E.campo_exportado)) })
          ] }) })
        ] }) : null
      ] })
    ] }) : /* @__PURE__ */ b.jsx("p", { role: "status", children: ul ? /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
      "Não foi possível carregar o catálogo. ",
      /* @__PURE__ */ b.jsx("button", { type: "button", onClick: () => ll((E) => E + 1), children: "Tentar novamente" })
    ] }) : "Carregando catálogo…" })
  ] });
}
function m0({ url: O, htmlHost: C }) {
  const U = rl.useRef(null), [v, L] = rl.useState("Carregando a camada no mapa…");
  return rl.useEffect(() => {
    const X = window.L;
    if (!X) {
      L("Biblioteca de mapa indisponível nesta página.");
      return;
    }
    const tl = X.map(C?.querySelector('[data-mlb="map"]') || U.current, { scrollWheelZoom: !1 });
    X.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(tl), tl.setView([-22.3, -48.6], 6);
    const vl = new AbortController();
    L("Carregando a camada no mapa…"), fetch(O, { credentials: "same-origin", signal: vl.signal }).then(async (al) => {
      if (!al.ok) throw new Error(`Não foi possível carregar a camada no mapa (HTTP ${al.status}).`);
      return al.json();
    }).then((al) => {
      const B = X.geoJSON(al, {
        style: { color: "#176b95", weight: 1, fillColor: "#4f97bf", fillOpacity: 0.25 },
        smoothFactor: 0,
        onEachFeature: (T, j) => {
          const $ = T.properties || {};
          j.bindTooltip($.NM_MUN ? `${$.NM_MUN} (${$.CD_MUN})` : String($.CD_MUN ?? ""), { sticky: !0 }), j.on("click", () => {
            const _l = document.createElement("table");
            _l.className = "territorial-mapa-popup";
            for (const [Bl, ll] of Object.entries($)) {
              const jl = _l.insertRow();
              jl.insertCell().textContent = Bl, jl.insertCell().textContent = ll == null ? "Sem valor" : typeof ll == "number" ? ll.toLocaleString("pt-BR", { maximumFractionDigits: 8 }) : String(ll);
            }
            j.bindPopup(_l, { maxWidth: 420, maxHeight: 320 }).openPopup();
          });
        }
      }).addTo(tl);
      B.getBounds().isValid() && tl.fitBounds(B.getBounds(), { padding: [16, 16] }), L(`${(al.features || []).length.toLocaleString("pt-BR")} feições exibidas com a geometria original da camada salva. Clique em um município para ver seus atributos.`);
    }).catch((al) => {
      al.name !== "AbortError" && L(al.message);
    });
    const J = setTimeout(() => tl.invalidateSize(), 0);
    return () => {
      vl.abort(), clearTimeout(J), tl.remove();
    };
  }, [O]), rl.useEffect(() => {
    C && (C.querySelector('[data-mlb="map-status"]').textContent = v);
  }, [C, v]), C ? null : /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
    /* @__PURE__ */ b.jsx("div", { ref: U, className: "territorial-mapa", role: "region", "aria-label": "Mapa da camada gerada" }),
    /* @__PURE__ */ b.jsx("p", { className: "territorial-mapa-status", role: "status", children: v })
  ] });
}
function Oy({ gerada: O, htmlHost: C }) {
  const U = rl.useRef(null);
  return rl.useEffect(() => {
    U.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [O]), rl.useEffect(() => {
    if (!C) return;
    const v = C.querySelector("#territorial-result"), L = C.querySelector('[data-mlb="map-section"]');
    v.hidden = !1, L.hidden = !1, C.querySelector('[data-mlb="results"]').hidden = !1, C.querySelector('[data-mlb="result-name"]').textContent = O.nome, C.querySelector('[data-mlb="result-category"]').textContent = O.categoria;
    const X = C.querySelector("#territorial-download");
    return X.href = O.download.href, X.download = O.download.filename, C.querySelector("#territorial-use").href = O.usar, v.scrollIntoView({ behavior: "smooth", block: "start" }), () => {
      v.hidden = !0, L.hidden = !0;
    };
  }, [C, O]), C ? /* @__PURE__ */ b.jsx(m0, { url: O.geojson, htmlHost: C }) : /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
    /* @__PURE__ */ b.jsxs("section", { ref: U, id: "territorial-result", className: "mlb-bloco territorial-result", "aria-label": "Camada gerada", children: [
      /* @__PURE__ */ b.jsx("h3", { children: "Camada gerada e salva" }),
      /* @__PURE__ */ b.jsxs("p", { children: [
        /* @__PURE__ */ b.jsx("strong", { children: O.nome }),
        " · Categoria: ",
        /* @__PURE__ */ b.jsx("span", { children: O.categoria })
      ] }),
      /* @__PURE__ */ b.jsx("p", { children: "O arquivo está disponível no acervo. Você pode baixá-lo ou incluí-lo na extração." }),
      /* @__PURE__ */ b.jsxs("div", { className: "ea-config-tools", children: [
        /* @__PURE__ */ b.jsx("a", { id: "territorial-download", className: "ea-btn", href: O.download.href, download: O.download.filename, children: "Baixar camada (.zip)" }),
        /* @__PURE__ */ b.jsx("a", { id: "territorial-use", className: "ea-btn ea-btn-primary", href: O.usar, children: "Usar na extração" })
      ] })
    ] }),
    /* @__PURE__ */ b.jsxs("section", { className: "mlb-bloco territorial-mapa-bloco", "aria-label": "Mapa da camada gerada", children: [
      /* @__PURE__ */ b.jsx("h3", { children: "Mapa da camada gerada" }),
      /* @__PURE__ */ b.jsx(m0, { url: O.geojson })
    ] })
  ] });
}
function Ny(O, { category: C, apiBase: U, onGenerated: v, onBusyChange: L = () => {
}, configuration: X, onChange: tl = () => {
} }) {
  const vl = O.querySelector('[data-mlb="source"]') ? O : null, J = by.createRoot(vl ? document.createDocumentFragment() : O);
  function al({ category: T }) {
    const j = rl.useRef(T);
    j.current = T;
    const [$, _l] = rl.useState(X || { attributes: [], format: "fgb" }), [Bl, ll] = rl.useState(null), jl = rl.useMemo(() => {
      let Wl;
      async function Cl(Ml, Yl, M) {
        let H;
        try {
          H = await fetch(`${U}/extracao-atributos/municipal/${["catalog", "preview"].includes(Ml) ? "" : `${encodeURIComponent(j.current.id)}/`}${Ml}`, {
            credentials: "same-origin",
            ...Yl ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Yl) } : {},
            signal: M
          });
        } catch (Ol) {
          throw Ol.name === "AbortError" ? Ol : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!H.ok) {
          const Ol = await H.json().catch(() => ({}));
          throw H.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof Ol.detail == "string" ? Ol.detail : `Não foi possível concluir a operação (HTTP ${H.status}).`);
        }
        return Ml === "export" || Ml.endsWith("/pacote") ? (Wl = { arquivo: H.headers.get("X-Camada-Arquivo"), id: H.headers.get("X-Camada-Id") }, H.blob()) : H.json();
      }
      return {
        catalog: (Ml) => Cl("catalog", null, Ml),
        preview: (Ml, Yl) => Cl("preview", Ml, Yl),
        export: async (Ml, Yl, M) => {
          if (!j.current) throw new Error("Selecione a categoria da camada antes de gerar.");
          L(!0);
          try {
            let H = await Cl("jobs", { ...Ml, nome: Ml.nome || "" });
            const Ol = `jobs/${H.id}`, Dl = async () => {
              await Cl(`${Ol}/cancelar`, {});
              let yl = H;
              for (; yl.status === "executando"; )
                await new Promise((Sl) => setTimeout(Sl, 500)), yl = await Cl(Ol), M?.acompanhar(yl);
              if (yl.status !== "cancelado") throw new Error(yl.erro || "A gravação já terminou. Consulte o acervo.");
            };
            for (; H.status === "executando"; )
              M?.acompanhar(H), M?.definirCancelamento(H.cancelavel ? Dl : null, "A gravação final já começou. Aguarde sua conclusão."), await new Promise((yl) => setTimeout(yl, 500)), H = await Cl(Ol);
            if (M?.acompanhar(H), H.status === "cancelado") {
              const yl = new Error("Geração cancelada. Sua seleção foi mantida.");
              throw yl.name = "AbortError", yl;
            }
            if (H.status !== "concluido") throw new Error(H.erro || "Não foi possível gerar a camada.");
            return await Cl(`${Ol}/pacote`);
          } catch (H) {
            throw L(!1), H;
          }
        },
        generated: () => Wl
      };
    }, []);
    async function Zl(Wl) {
      try {
        const Cl = await v(jl.generated(), Wl);
        Cl && ll(Cl);
      } finally {
        L(!1);
      }
    }
    return /* @__PURE__ */ b.jsx(_y, { htmlHost: vl, value: $, onChange: (Wl) => {
      _l(Wl), tl(Wl);
    }, client: jl, download: !1, onExport: Zl, categoriaNome: T?.nome || "", canGenerate: !!T, feedback: window.SLTFeedback, resultado: Bl && /* @__PURE__ */ b.jsx(Oy, { gerada: Bl, htmlHost: vl }) });
  }
  J.render(/* @__PURE__ */ b.jsx(al, { category: C }));
  const B = () => {
    if (J.unmount(), !!vl) {
      for (const T of vl.querySelectorAll("input,select,button")) T.disabled = !0;
      for (const T of ["attributes", "basket", "facets", "preview-body", "glossary-body"]) {
        const j = vl.querySelector(`[data-mlb="${T}"]`);
        j.replaceChildren(), delete j.dataset.content;
      }
      for (const T of ["results", "retry", "error"]) vl.querySelector(`[data-mlb="${T}"]`).hidden = !0;
      vl.querySelector('[data-mlb="loading"]').hidden = !1;
    }
  };
  return B.setCategory = (T) => J.render(/* @__PURE__ */ b.jsx(al, { category: T })), B;
}
export {
  Ny as montarMunicipal
};
