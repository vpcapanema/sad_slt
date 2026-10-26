var Uo = { exports: {} }, _n = {};
var u0;
function oy() {
  if (u0) return _n;
  u0 = 1;
  var N = /* @__PURE__ */ Symbol.for("react.transitional.element"), C = /* @__PURE__ */ Symbol.for("react.fragment");
  function A(d, Q, H) {
    var W = null;
    if (H !== void 0 && (W = "" + H), Q.key !== void 0 && (W = "" + Q.key), "key" in Q) {
      H = {};
      for (var st in Q)
        st !== "key" && (H[st] = Q[st]);
    } else H = Q;
    return Q = H.ref, {
      $$typeof: N,
      type: d,
      key: W,
      ref: Q !== void 0 ? Q : null,
      props: H
    };
  }
  return _n.Fragment = C, _n.jsx = A, _n.jsxs = A, _n;
}
var n0;
function sy() {
  return n0 || (n0 = 1, Uo.exports = oy()), Uo.exports;
}
var g = sy(), Ro = { exports: {} }, P = {};
var i0;
function ry() {
  if (i0) return P;
  i0 = 1;
  var N = /* @__PURE__ */ Symbol.for("react.transitional.element"), C = /* @__PURE__ */ Symbol.for("react.portal"), A = /* @__PURE__ */ Symbol.for("react.fragment"), d = /* @__PURE__ */ Symbol.for("react.strict_mode"), Q = /* @__PURE__ */ Symbol.for("react.profiler"), H = /* @__PURE__ */ Symbol.for("react.consumer"), W = /* @__PURE__ */ Symbol.for("react.context"), st = /* @__PURE__ */ Symbol.for("react.forward_ref"), k = /* @__PURE__ */ Symbol.for("react.suspense"), tt = /* @__PURE__ */ Symbol.for("react.memo"), G = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), x = /* @__PURE__ */ Symbol.for("react.view_transition"), w = Symbol.iterator;
  function Ct(s) {
    return s === null || typeof s != "object" ? null : (s = w && s[w] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var Gt = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, nt = Object.assign, qt = {};
  function wt(s, O, X) {
    this.props = s, this.context = O, this.refs = qt, this.updater = X || Gt;
  }
  wt.prototype.isReactComponent = {}, wt.prototype.setState = function(s, O) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, O, "setState");
  }, wt.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function pl() {
  }
  pl.prototype = wt.prototype;
  function Xt(s, O, X) {
    this.props = s, this.context = O, this.refs = qt, this.updater = X || Gt;
  }
  var Bt = Xt.prototype = new pl();
  Bt.constructor = Xt, nt(Bt, wt.prototype), Bt.isPureReactComponent = !0;
  var _t = Array.isArray;
  function D() {
  }
  var F = { H: null, A: null, T: null, S: null }, et = Object.prototype.hasOwnProperty;
  function Et(s, O, X) {
    var B = X.ref;
    return {
      $$typeof: N,
      type: s,
      key: O,
      ref: B !== void 0 ? B : null,
      props: X
    };
  }
  function Lt(s, O) {
    return Et(s.type, O, s.props);
  }
  function it(s) {
    return typeof s == "object" && s !== null && s.$$typeof === N;
  }
  function Rt(s) {
    var O = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(X) {
      return O[X];
    });
  }
  var nl = /\/+/g;
  function Mt(s, O) {
    return typeof s == "object" && s !== null && s.key != null ? Rt("" + s.key) : O.toString(36);
  }
  function M(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(D, D) : (s.status = "pending", s.then(
          function(O) {
            s.status === "pending" && (s.status = "fulfilled", s.value = O);
          },
          function(O) {
            s.status === "pending" && (s.status = "rejected", s.reason = O);
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
  function Z(s, O, X, B, J) {
    var rt = typeof s;
    (rt === "undefined" || rt === "boolean") && (s = null);
    var ft = !1;
    if (s === null) ft = !0;
    else
      switch (rt) {
        case "bigint":
        case "string":
        case "number":
          ft = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case N:
            case C:
              ft = !0;
              break;
            case G:
              return ft = s._init, Z(
                ft(s._payload),
                O,
                X,
                B,
                J
              );
          }
      }
    if (ft)
      return J = J(s), ft = B === "" ? "." + Mt(s, 0) : B, _t(J) ? (X = "", ft != null && (X = ft.replace(nl, "$&/") + "/"), Z(J, O, X, "", function(tl) {
        return tl;
      })) : J != null && (it(J) && (J = Lt(
        J,
        X + (J.key == null || s && s.key === J.key ? "" : ("" + J.key).replace(
          nl,
          "$&/"
        ) + "/") + ft
      )), O.push(J)), 1;
    ft = 0;
    var j = B === "" ? "." : B + ":";
    if (_t(s))
      for (var V = 0; V < s.length; V++)
        B = s[V], rt = j + Mt(B, V), ft += Z(
          B,
          O,
          X,
          rt,
          J
        );
    else if (V = Ct(s), typeof V == "function")
      for (s = V.call(s), V = 0; !(B = s.next()).done; )
        B = B.value, rt = j + Mt(B, V++), ft += Z(
          B,
          O,
          X,
          rt,
          J
        );
    else if (rt === "object") {
      if (typeof s.then == "function")
        return Z(
          M(s),
          O,
          X,
          B,
          J
        );
      throw O = String(s), Error(
        "Objects are not valid as a React child (found: " + (O === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : O) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ft;
  }
  function R(s, O, X) {
    if (s == null) return s;
    var B = [], J = 0;
    return Z(s, B, "", "", function(rt) {
      return O.call(X, rt, J++);
    }), B;
  }
  function ct(s) {
    if (s._status === -1) {
      var O = s._result, X = O();
      X.then(
        function(B) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = B, X.status === void 0 && (X.status = "fulfilled", X.value = B));
        },
        function(B) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = B, X.status === void 0 && (X.status = "rejected", X.reason = B));
        }
      ), s._status === -1 && (s._status = 0, s._result = X);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var ut = typeof reportError == "function" ? reportError : function(s) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var O = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof s == "object" && s !== null && typeof s.message == "string" ? String(s.message) : String(s),
        error: s
      });
      if (!window.dispatchEvent(O)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", s);
      return;
    }
    console.error(s);
  };
  function Pt(s) {
    var O = F.T, X = {};
    X.types = O !== null ? O.types : null, F.T = X;
    try {
      var B = s(), J = F.S;
      J !== null && J(X, B), typeof B == "object" && B !== null && typeof B.then == "function" && B.then(D, ut);
    } catch (rt) {
      ut(rt);
    } finally {
      O !== null && X.types !== null && (O.types = X.types), F.T = O;
    }
  }
  function ml(s) {
    var O = F.T;
    if (O !== null) {
      var X = O.types;
      X === null ? O.types = [s] : X.indexOf(s) === -1 && X.push(s);
    } else Pt(ml.bind(null, s));
  }
  var Tl = {
    map: R,
    forEach: function(s, O, X) {
      R(
        s,
        function() {
          O.apply(this, arguments);
        },
        X
      );
    },
    count: function(s) {
      var O = 0;
      return R(s, function() {
        O++;
      }), O;
    },
    toArray: function(s) {
      return R(s, function(O) {
        return O;
      }) || [];
    },
    only: function(s) {
      if (!it(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return P.Activity = T, P.Children = Tl, P.Component = wt, P.Fragment = A, P.Profiler = Q, P.PureComponent = Xt, P.StrictMode = d, P.Suspense = k, P.ViewTransition = x, P.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = F, P.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return F.H.useMemoCache(s);
    }
  }, P.addTransitionType = ml, P.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, P.cacheSignal = function() {
    return null;
  }, P.cloneElement = function(s, O, X) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var B = nt({}, s.props), J = s.key;
    if (O != null)
      for (rt in O.key !== void 0 && (J = "" + O.key), O)
        !et.call(O, rt) || rt === "key" || rt === "__self" || rt === "__source" || rt === "ref" && O.ref === void 0 || (B[rt] = O[rt]);
    var rt = arguments.length - 2;
    if (rt === 1) B.children = X;
    else if (1 < rt) {
      for (var ft = Array(rt), j = 0; j < rt; j++)
        ft[j] = arguments[j + 2];
      B.children = ft;
    }
    return Et(s.type, J, B);
  }, P.createContext = function(s) {
    return s = {
      $$typeof: W,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: H,
      _context: s
    }, s;
  }, P.createElement = function(s, O, X) {
    var B, J = {}, rt = null;
    if (O != null)
      for (B in O.key !== void 0 && (rt = "" + O.key), O)
        et.call(O, B) && B !== "key" && B !== "__self" && B !== "__source" && (J[B] = O[B]);
    var ft = arguments.length - 2;
    if (ft === 1) J.children = X;
    else if (1 < ft) {
      for (var j = Array(ft), V = 0; V < ft; V++)
        j[V] = arguments[V + 2];
      J.children = j;
    }
    if (s && s.defaultProps)
      for (B in ft = s.defaultProps, ft)
        J[B] === void 0 && (J[B] = ft[B]);
    return Et(s, rt, J);
  }, P.createRef = function() {
    return { current: null };
  }, P.forwardRef = function(s) {
    return { $$typeof: st, render: s };
  }, P.isValidElement = it, P.lazy = function(s) {
    return {
      $$typeof: G,
      _payload: { _status: -1, _result: s },
      _init: ct
    };
  }, P.memo = function(s, O) {
    return {
      $$typeof: tt,
      type: s,
      compare: O === void 0 ? null : O
    };
  }, P.startTransition = Pt, P.unstable_useCacheRefresh = function() {
    return F.H.useCacheRefresh();
  }, P.use = function(s) {
    return F.H.use(s);
  }, P.useActionState = function(s, O, X) {
    return F.H.useActionState(s, O, X);
  }, P.useCallback = function(s, O) {
    return F.H.useCallback(s, O);
  }, P.useContext = function(s) {
    return F.H.useContext(s);
  }, P.useDebugValue = function() {
  }, P.useDeferredValue = function(s, O) {
    return F.H.useDeferredValue(s, O);
  }, P.useEffect = function(s, O) {
    return F.H.useEffect(s, O);
  }, P.useEffectEvent = function(s) {
    return F.H.useEffectEvent(s);
  }, P.useId = function() {
    return F.H.useId();
  }, P.useImperativeHandle = function(s, O, X) {
    return F.H.useImperativeHandle(s, O, X);
  }, P.useInsertionEffect = function(s, O) {
    return F.H.useInsertionEffect(s, O);
  }, P.useLayoutEffect = function(s, O) {
    return F.H.useLayoutEffect(s, O);
  }, P.useMemo = function(s, O) {
    return F.H.useMemo(s, O);
  }, P.useOptimistic = function(s, O) {
    return F.H.useOptimistic(s, O);
  }, P.useReducer = function(s, O, X) {
    return F.H.useReducer(s, O, X);
  }, P.useRef = function(s) {
    return F.H.useRef(s);
  }, P.useState = function(s) {
    return F.H.useState(s);
  }, P.useSyncExternalStore = function(s, O, X) {
    return F.H.useSyncExternalStore(
      s,
      O,
      X
    );
  }, P.useTransition = function() {
    return F.H.useTransition();
  }, P.version = "19.3.0", P;
}
var c0;
function Bo() {
  return c0 || (c0 = 1, Ro.exports = ry()), Ro.exports;
}
var ht = Bo(), jo = { exports: {} }, On = {}, xo = { exports: {} }, Ho = {};
var f0;
function dy() {
  return f0 || (f0 = 1, (function(N) {
    function C(M, Z) {
      var R = M.length;
      M.push(Z);
      t: for (; 0 < R; ) {
        var ct = R - 1 >>> 1, ut = M[ct];
        if (0 < Q(ut, Z))
          M[ct] = Z, M[R] = ut, R = ct;
        else break t;
      }
    }
    function A(M) {
      return M.length === 0 ? null : M[0];
    }
    function d(M) {
      if (M.length === 0) return null;
      var Z = M[0], R = M.pop();
      if (R !== Z) {
        M[0] = R;
        t: for (var ct = 0, ut = M.length, Pt = ut >>> 1; ct < Pt; ) {
          var ml = 2 * (ct + 1) - 1, Tl = M[ml], s = ml + 1, O = M[s];
          if (0 > Q(Tl, R))
            s < ut && 0 > Q(O, Tl) ? (M[ct] = O, M[s] = R, ct = s) : (M[ct] = Tl, M[ml] = R, ct = ml);
          else if (s < ut && 0 > Q(O, R))
            M[ct] = O, M[s] = R, ct = s;
          else break t;
        }
      }
      return Z;
    }
    function Q(M, Z) {
      var R = M.sortIndex - Z.sortIndex;
      return R !== 0 ? R : M.id - Z.id;
    }
    if (N.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var H = performance;
      N.unstable_now = function() {
        return H.now();
      };
    } else {
      var W = Date, st = W.now();
      N.unstable_now = function() {
        return W.now() - st;
      };
    }
    var k = [], tt = [], G = 1, T = null, x = 3, w = !1, Ct = !1, Gt = !1, nt = !1, qt = typeof setTimeout == "function" ? setTimeout : null, wt = typeof clearTimeout == "function" ? clearTimeout : null, pl = typeof setImmediate < "u" ? setImmediate : null;
    function Xt(M) {
      for (var Z = A(tt); Z !== null; ) {
        if (Z.callback === null) d(tt);
        else if (Z.startTime <= M)
          d(tt), Z.sortIndex = Z.expirationTime, C(k, Z);
        else break;
        Z = A(tt);
      }
    }
    function Bt(M) {
      if (Gt = !1, Xt(M), !Ct)
        if (A(k) !== null)
          Ct = !0, _t || (_t = !0, it());
        else {
          var Z = A(tt);
          Z !== null && Mt(Bt, Z.startTime - M);
        }
    }
    var _t = !1, D = -1, F = 5, et = -1;
    function Et() {
      return nt ? !0 : !(N.unstable_now() - et < F);
    }
    function Lt() {
      if (nt = !1, _t) {
        var M = N.unstable_now();
        et = M;
        var Z = !0;
        try {
          t: {
            Ct = !1, Gt && (Gt = !1, wt(D), D = -1), w = !0;
            var R = x;
            try {
              l: {
                for (Xt(M), T = A(k); T !== null && !(T.expirationTime > M && Et()); ) {
                  var ct = T.callback;
                  if (typeof ct == "function") {
                    T.callback = null, x = T.priorityLevel;
                    var ut = ct(
                      T.expirationTime <= M
                    );
                    if (M = N.unstable_now(), typeof ut == "function") {
                      T.callback = ut, Xt(M), Z = !0;
                      break l;
                    }
                    T === A(k) && d(k), Xt(M);
                  } else d(k);
                  T = A(k);
                }
                if (T !== null) Z = !0;
                else {
                  var Pt = A(tt);
                  Pt !== null && Mt(
                    Bt,
                    Pt.startTime - M
                  ), Z = !1;
                }
              }
              break t;
            } finally {
              T = null, x = R, w = !1;
            }
            Z = void 0;
          }
        } finally {
          Z ? it() : _t = !1;
        }
      }
    }
    var it;
    if (typeof pl == "function")
      it = function() {
        pl(Lt);
      };
    else if (typeof MessageChannel < "u") {
      var Rt = new MessageChannel(), nl = Rt.port2;
      Rt.port1.onmessage = Lt, it = function() {
        nl.postMessage(null);
      };
    } else
      it = function() {
        qt(Lt, 0);
      };
    function Mt(M, Z) {
      D = qt(function() {
        M(N.unstable_now());
      }, Z);
    }
    N.unstable_IdlePriority = 5, N.unstable_ImmediatePriority = 1, N.unstable_LowPriority = 4, N.unstable_NormalPriority = 3, N.unstable_Profiling = null, N.unstable_UserBlockingPriority = 2, N.unstable_cancelCallback = function(M) {
      M.callback = null;
    }, N.unstable_forceFrameRate = function(M) {
      0 > M || 125 < M ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : F = 0 < M ? Math.floor(1e3 / M) : 5;
    }, N.unstable_getCurrentPriorityLevel = function() {
      return x;
    }, N.unstable_next = function(M) {
      switch (x) {
        case 1:
        case 2:
        case 3:
          var Z = 3;
          break;
        default:
          Z = x;
      }
      var R = x;
      x = Z;
      try {
        return M();
      } finally {
        x = R;
      }
    }, N.unstable_requestPaint = function() {
      nt = !0;
    }, N.unstable_runWithPriority = function(M, Z) {
      switch (M) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          M = 3;
      }
      var R = x;
      x = M;
      try {
        return Z();
      } finally {
        x = R;
      }
    }, N.unstable_scheduleCallback = function(M, Z, R) {
      var ct = N.unstable_now();
      switch (typeof R == "object" && R !== null ? (R = R.delay, R = typeof R == "number" && 0 < R ? ct + R : ct) : R = ct, M) {
        case 1:
          var ut = -1;
          break;
        case 2:
          ut = 250;
          break;
        case 5:
          ut = 1073741823;
          break;
        case 4:
          ut = 1e4;
          break;
        default:
          ut = 5e3;
      }
      return ut = R + ut, M = {
        id: G++,
        callback: Z,
        priorityLevel: M,
        startTime: R,
        expirationTime: ut,
        sortIndex: -1
      }, R > ct ? (M.sortIndex = R, C(tt, M), A(k) === null && M === A(tt) && (Gt ? (wt(D), D = -1) : Gt = !0, Mt(Bt, R - ct))) : (M.sortIndex = ut, C(k, M), Ct || w || (Ct = !0, _t || (_t = !0, it()))), M;
    }, N.unstable_shouldYield = Et, N.unstable_wrapCallback = function(M) {
      var Z = x;
      return function() {
        var R = x;
        x = Z;
        try {
          return M.apply(this, arguments);
        } finally {
          x = R;
        }
      };
    };
  })(Ho)), Ho;
}
var o0;
function my() {
  return o0 || (o0 = 1, xo.exports = dy()), xo.exports;
}
var qo = { exports: {} }, dl = {};
var s0;
function vy() {
  if (s0) return dl;
  s0 = 1;
  var N = Bo();
  function C(G) {
    var T = "https://react.dev/errors/" + G;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var x = 2; x < arguments.length; x++)
        T += "&args[]=" + encodeURIComponent(arguments[x]);
    }
    return "Minified React error #" + G + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function A() {
  }
  var d = {
    d: {
      f: A,
      r: function() {
        throw Error(C(522));
      },
      D: A,
      C: A,
      L: A,
      m: A,
      X: A,
      S: A,
      M: A
    },
    p: 0,
    findDOMNode: null
  }, Q = /* @__PURE__ */ Symbol.for("react.portal"), H = /* @__PURE__ */ Symbol.for("react.recoverable"), W = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function st(G, T, x) {
    var w = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: Q,
      key: w == null ? null : w === W ? W : "" + w,
      children: G,
      containerInfo: T,
      implementation: x
    };
  }
  var k = N.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function tt(G, T) {
    if (G === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return dl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = d, dl.browser = function(G) {
    return { $$typeof: H, _reason: G };
  }, dl.createPortal = function(G, T) {
    var x = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(C(299));
    return st(G, T, null, x);
  }, dl.flushSync = function(G) {
    var T = k.T, x = d.p;
    try {
      if (k.T = null, d.p = 2, G) return G();
    } finally {
      k.T = T, d.p = x, d.d.f();
    }
  }, dl.preconnect = function(G, T) {
    typeof G == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, d.d.C(G, T));
  }, dl.prefetchDNS = function(G) {
    typeof G == "string" && d.d.D(G);
  }, dl.preinit = function(G, T) {
    if (typeof G == "string" && T && typeof T.as == "string") {
      var x = T.as, w = tt(x, T.crossOrigin), Ct = typeof T.integrity == "string" ? T.integrity : void 0, Gt = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      x === "style" ? d.d.S(
        G,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: w,
          integrity: Ct,
          fetchPriority: Gt
        }
      ) : x === "script" && d.d.X(G, {
        crossOrigin: w,
        integrity: Ct,
        fetchPriority: Gt,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, dl.preinitModule = function(G, T) {
    if (typeof G == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var x = tt(
            T.as,
            T.crossOrigin
          );
          d.d.M(G, {
            crossOrigin: x,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && d.d.M(G);
  }, dl.preload = function(G, T) {
    if (typeof G == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var x = T.as, w = tt(x, T.crossOrigin);
      d.d.L(G, x, {
        crossOrigin: w,
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
  }, dl.preloadModule = function(G, T) {
    if (typeof G == "string")
      if (T) {
        var x = tt(T.as, T.crossOrigin);
        d.d.m(G, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: x,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else d.d.m(G);
  }, dl.requestFormReset = function(G) {
    d.d.r(G);
  }, dl.unstable_batchedUpdates = function(G, T) {
    return G(T);
  }, dl.useFormState = function(G, T, x) {
    return k.H.useFormState(G, T, x);
  }, dl.useFormStatus = function() {
    return k.H.useHostTransitionStatus();
  }, dl.version = "19.3.0", dl;
}
var r0;
function hy() {
  if (r0) return qo.exports;
  r0 = 1;
  function N() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(N);
      } catch (C) {
        console.error(C);
      }
  }
  return N(), qo.exports = vy(), qo.exports;
}
var d0;
function yy() {
  if (d0) return On;
  d0 = 1;
  var N = my(), C = Bo(), A = hy();
  function d(t) {
    var l = "https://react.dev/errors/" + t;
    if (1 < arguments.length) {
      l += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        l += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + t + "; visit " + l + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function Q(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function H(t) {
    for (var l = t, a = l; a && !a.alternate; )
      l = a, (l.flags & 4098) !== 0 && (t = l.return), a = l.return;
    for (; l.return; ) l = l.return;
    return l.tag === 3 ? t : null;
  }
  function W(t) {
    if (t.tag === 13) {
      var l = t.memoizedState;
      if (l === null && (t = t.alternate, t !== null && (l = t.memoizedState)), l !== null) return l.dehydrated;
    }
    return null;
  }
  function st(t) {
    if (t.tag === 31) {
      var l = t.memoizedState;
      if (l === null && (t = t.alternate, t !== null && (l = t.memoizedState)), l !== null) return l.dehydrated;
    }
    return null;
  }
  function k(t) {
    if (H(t) !== t)
      throw Error(d(188));
  }
  function tt(t) {
    var l = t.alternate;
    if (!l) {
      if (l = H(t), l === null) throw Error(d(188));
      return l !== t ? null : t;
    }
    for (var a = t, e = l; ; ) {
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
          if (n === a) return k(u), t;
          if (n === e) return k(u), l;
          n = n.sibling;
        }
        throw Error(d(188));
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
          if (!i) throw Error(d(189));
        }
      }
      if (a.alternate !== e) throw Error(d(190));
    }
    if (a.tag !== 3) throw Error(d(188));
    return a.stateNode.current === a ? t : l;
  }
  function G(t) {
    var l = t.tag;
    if (l === 5 || l === 26 || l === 27 || l === 6) return t;
    for (t = t.child; t !== null; ) {
      if (l = G(t), l !== null) return l;
      t = t.sibling;
    }
    return null;
  }
  function T(t, l, a, e, u, n) {
    for (; t !== null; ) {
      if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && a(t, e, u, n) || (t.tag !== 22 || t.memoizedState === null) && (l || t.tag !== 5 && t.tag !== 27) && T(
        t.child,
        l,
        a,
        e,
        u,
        n
      ))
        return !0;
      t = t.sibling;
    }
    return !1;
  }
  function x(t) {
    for (t = t.return; t !== null; ) {
      if (t.tag === 3 || t.tag === 5 || t.tag === 27) return t;
      t = t.return;
    }
    return null;
  }
  function w(t) {
    var l = !1;
    for (t = t.return; t !== null && (t.tag === 4 && (l = !0), !(t.tag === 3 || t.tag === 5 || t.tag === 27)); )
      t = t.return;
    return l;
  }
  function Ct(t) {
    var l = [null, null], a = x(t);
    return a === null || Gt(
      l,
      t,
      a.child,
      { foundSelf: !1 }
    ), l;
  }
  function Gt(t, l, a, e) {
    for (; a !== null; ) {
      if (a === l) e.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (e.foundSelf) return t[1] = a, !0;
        t[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && Gt(
        t,
        l,
        a.child,
        e
      ))
        return !0;
      a = a.sibling;
    }
    return !1;
  }
  function nt(t) {
    switch (t.tag) {
      case 5:
      case 27:
      case 6:
        return t.stateNode;
      case 3:
        return t.stateNode.containerInfo;
      default:
        throw Error(d(559));
    }
  }
  var qt = null, wt = null;
  function pl(t, l, a) {
    return t === a ? !0 : t === l ? (qt = t, !0) : !1;
  }
  function Xt(t, l, a) {
    return t === a ? (wt = t, !1) : t === l ? (wt !== null && (qt = t), !0) : !1;
  }
  function Bt(t) {
    if (t === null) return null;
    do
      t = t === null ? null : t.return;
    while (t && t.tag !== 5 && t.tag !== 27 && t.tag !== 3);
    return t || null;
  }
  function _t(t, l, a) {
    for (var e = 0, u = t; u; u = a(u)) e++;
    u = 0;
    for (var n = l; n; n = a(n)) u++;
    for (; 0 < e - u; ) t = a(t), e--;
    for (; 0 < u - e; ) l = a(l), u--;
    for (; e--; ) {
      if (t === l || l !== null && t === l.alternate)
        return t;
      t = a(t), l = a(l);
    }
    return null;
  }
  var D = Object.assign, F = /* @__PURE__ */ Symbol.for("react.element"), et = /* @__PURE__ */ Symbol.for("react.transitional.element"), Et = /* @__PURE__ */ Symbol.for("react.portal"), Lt = /* @__PURE__ */ Symbol.for("react.fragment"), it = /* @__PURE__ */ Symbol.for("react.strict_mode"), Rt = /* @__PURE__ */ Symbol.for("react.profiler"), nl = /* @__PURE__ */ Symbol.for("react.consumer"), Mt = /* @__PURE__ */ Symbol.for("react.context"), M = /* @__PURE__ */ Symbol.for("react.forward_ref"), Z = /* @__PURE__ */ Symbol.for("react.suspense"), R = /* @__PURE__ */ Symbol.for("react.suspense_list"), ct = /* @__PURE__ */ Symbol.for("react.memo"), ut = /* @__PURE__ */ Symbol.for("react.lazy"), Pt = /* @__PURE__ */ Symbol.for("react.activity"), ml = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), Tl = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), O = /* @__PURE__ */ Symbol.for("react.recoverable"), X = Symbol.iterator;
  function B(t) {
    return t === null || typeof t != "object" ? null : (t = X && t[X] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var J = /* @__PURE__ */ Symbol.for("react.client.reference");
  function rt(t) {
    if (t == null) return null;
    if (typeof t == "function")
      return t.$$typeof === J ? null : t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case Lt:
        return "Fragment";
      case Rt:
        return "Profiler";
      case it:
        return "StrictMode";
      case Z:
        return "Suspense";
      case R:
        return "SuspenseList";
      case Pt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof t == "object")
      switch (t.$$typeof) {
        case Et:
          return "Portal";
        case Mt:
          return t.displayName || "Context";
        case nl:
          return (t._context.displayName || "Context") + ".Consumer";
        case M:
          var l = t.render;
          return t = t.displayName, t || (t = l.displayName || l.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
        case ct:
          return l = t.displayName || null, l !== null ? l : rt(t.type) || "Memo";
        case ut:
          l = t._payload, t = t._init;
          try {
            return rt(t(l));
          } catch {
          }
      }
    return null;
  }
  var ft = Array.isArray, j = C.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, V = A.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, tl = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, ya = [], Fl = -1;
  function _(t) {
    return { current: t };
  }
  function U(t) {
    0 > Fl || (t.current = ya[Fl], ya[Fl] = null, Fl--);
  }
  function K(t, l) {
    Fl++, ya[Fl] = t.current, t.current = l;
  }
  var dt = _(null), Jt = _(null), Cl = _(null), Wl = _(null);
  function hl(t, l) {
    switch (K(Cl, l), K(Jt, t), K(dt, null), l.nodeType) {
      case 9:
      case 11:
        t = (t = l.documentElement) && (t = t.namespaceURI) ? mm(t) : 0;
        break;
      default:
        if (t = l.tagName, l = l.namespaceURI)
          l = mm(l), t = vm(l, t);
        else
          switch (t) {
            case "svg":
              t = 1;
              break;
            case "math":
              t = 2;
              break;
            default:
              t = 0;
          }
    }
    U(dt), K(dt, t);
  }
  function ga() {
    U(dt), U(Jt), U(Cl);
  }
  function ja(t) {
    var l = t.memoizedState;
    l !== null && (zu._currentValue = l.memoizedState, K(Wl, t)), l = dt.current;
    var a = vm(l, t.type);
    l !== a && (K(Jt, t), K(dt, a));
  }
  function fe(t) {
    Jt.current === t && (U(dt), U(Jt)), Wl.current === t && (U(Wl), zu._currentValue = tl);
  }
  var xe, Au;
  function Il(t) {
    if (xe === void 0)
      try {
        throw Error();
      } catch (a) {
        var l = a.stack.trim().match(/\n( *(at )?)/);
        xe = l && l[1] || "", Au = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + xe + t + Au;
  }
  var kl = !1;
  function oe(t, l) {
    if (!t || kl) return "";
    kl = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var e = {
        DetermineComponentFrameRoot: function() {
          try {
            if (l) {
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
                } catch (p) {
                  var r = p;
                }
                Reflect.construct(t, [], z);
              } else {
                try {
                  z.call();
                } catch (p) {
                  r = p;
                }
                z = !1;
                try {
                  var y = Object.getOwnPropertyDescriptor(
                    t.prototype,
                    "props"
                  );
                  Object.defineProperty(t.prototype, "props", {
                    configurable: !0,
                    set: function() {
                      throw Error();
                    }
                  }), z = !0, new t();
                } finally {
                  z && (y !== void 0 ? Object.defineProperty(t.prototype, "props", y) : delete t.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (p) {
                r = p;
              }
              (z = t()) && typeof z.catch == "function" && z.catch(function() {
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
        var f = i.split(`
`), v = c.split(`
`);
        for (u = e = 0; e < f.length && !f[e].includes("DetermineComponentFrameRoot"); )
          e++;
        for (; u < v.length && !v[u].includes(
          "DetermineComponentFrameRoot"
        ); )
          u++;
        if (e === f.length || u === v.length)
          for (e = f.length - 1, u = v.length - 1; 1 <= e && 0 <= u && f[e] !== v[u]; )
            u--;
        for (; 1 <= e && 0 <= u; e--, u--)
          if (f[e] !== v[u]) {
            if (e !== 1 || u !== 1)
              do
                if (e--, u--, 0 > u || f[e] !== v[u]) {
                  var b = `
` + f[e].replace(" at new ", " at ");
                  return t.displayName && b.includes("<anonymous>") && (b = b.replace("<anonymous>", t.displayName)), b;
                }
              while (1 <= e && 0 <= u);
            break;
          }
      }
    } finally {
      kl = !1, Error.prepareStackTrace = a;
    }
    return (a = t ? t.displayName || t.name : "") ? Il(a) : "";
  }
  function Nn(t, l) {
    switch (t.tag) {
      case 26:
      case 27:
      case 5:
        return Il(t.type);
      case 16:
        return Il("Lazy");
      case 13:
        return t.child !== l && l !== null ? Il("Suspense Fallback") : Il("Suspense");
      case 19:
        return Il("SuspenseList");
      case 0:
      case 15:
        return oe(t.type, !1);
      case 11:
        return oe(t.type.render, !1);
      case 1:
        return oe(t.type, !0);
      case 31:
        return Il("Activity");
      case 30:
        return Il("ViewTransition");
      default:
        return "";
    }
  }
  function pu(t) {
    try {
      var l = "", a = null;
      do
        l += Nn(t, a), a = t, t = t.return;
      while (t);
      return l;
    } catch (e) {
      return `
Error generating stack: ` + e.message + `
` + e.stack;
    }
  }
  var He = Object.prototype.hasOwnProperty, Cu = N.unstable_scheduleCallback, se = N.unstable_cancelCallback, An = N.unstable_shouldYield, S = N.unstable_requestPaint, $ = N.unstable_now, bt = N.unstable_getCurrentPriorityLevel, jt = N.unstable_ImmediatePriority, Ml = N.unstable_UserBlockingPriority, xa = N.unstable_NormalPriority, g0 = N.unstable_LowPriority, Yo = N.unstable_IdlePriority, b0 = N.log, S0 = N.unstable_setDisableYieldValue, Mu = null, Dl = null;
  function Ha(t) {
    if (typeof b0 == "function" && S0(t), Dl && typeof Dl.setStrictMode == "function")
      try {
        Dl.setStrictMode(Mu, t);
      } catch {
      }
  }
  var Ul = Math.clz32 ? Math.clz32 : z0, T0 = Math.log, E0 = Math.LN2;
  function z0(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (T0(t) / E0 | 0) | 0;
  }
  var pn = 256, Cn = 262144, Mn = 4194304;
  function re(t) {
    var l = t & 42;
    if (l !== 0) return l;
    switch (t & -t) {
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
        return t & -t;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return t & 62914560;
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
        return t;
    }
  }
  function Dn(t, l, a) {
    var e = t.pendingLanes;
    if (e === 0) return 0;
    var u = 0, n = t.suspendedLanes, i = t.pingedLanes;
    t = t.warmLanes;
    var c = e & 134217727;
    return c !== 0 ? (e = c & ~n, e !== 0 ? u = re(e) : (i &= c, i !== 0 ? u = re(i) : a || (a = c & ~t, a !== 0 && (u = re(a))))) : (c = e & ~n, c !== 0 ? u = re(c) : i !== 0 ? u = re(i) : a || (a = e & ~t, a !== 0 && (u = re(a)))), u === 0 ? 0 : l !== 0 && l !== u && (l & n) === 0 && (n = u & -u, a = l & -l, n >= a || n === 32 && (a & 4194048) !== 0) ? l : u;
  }
  function Du(t, l) {
    return (t.pendingLanes & ~(t.suspendedLanes & ~t.pingedLanes) & l) === 0;
  }
  function Go(t, l) {
    (l & 8) !== 0 && (l |= l & 32);
    var a = t.entangledLanes;
    if (a !== 0)
      for (t = t.entanglements, a &= l; 0 < a; ) {
        var e = 31 - Ul(a), u = 1 << e;
        l |= t[e], a &= ~u;
      }
    return l;
  }
  function _0(t, l) {
    switch (t) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return l + 250;
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
        return l + 5e3;
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
  function Xo() {
    var t = Mn;
    return Mn <<= 1, (Mn & 62914560) === 0 && (Mn = 4194304), t;
  }
  function ac(t) {
    for (var l = [], a = 0; 31 > a; a++) l.push(t);
    return l;
  }
  function Uu(t, l) {
    t.pendingLanes |= l, l !== 268435456 && (t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0);
  }
  function O0(t, l, a, e, u, n) {
    var i = t.pendingLanes;
    t.pendingLanes = a, t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0, t.expiredLanes &= a, t.entangledLanes &= a, t.errorRecoveryDisabledLanes &= a, t.shellSuspendCounter = 0;
    var c = t.entanglements, f = t.expirationTimes, v = t.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var b = 31 - Ul(a), z = 1 << b;
      c[b] = 0, f[b] = -1;
      var r = v[b];
      if (r !== null)
        for (v[b] = null, b = 0; b < r.length; b++) {
          var y = r[b];
          y !== null && (y.lane &= -536870913);
        }
      a &= ~z;
    }
    e !== 0 && Qo(t, e, 0), n !== 0 && u === 0 && t.tag !== 0 && (t.suspendedLanes |= n & ~(i & ~l));
  }
  function Qo(t, l, a) {
    t.pendingLanes |= l, t.suspendedLanes &= ~l;
    var e = 31 - Ul(l);
    t.entangledLanes |= l, t.entanglements[e] = t.entanglements[e] | 1073741824 | a & 261930;
  }
  function Lo(t, l) {
    var a = t.entangledLanes |= l;
    for (t = t.entanglements; a; ) {
      var e = 31 - Ul(a), u = 1 << e;
      u & l | t[e] & l && (t[e] |= l), a &= ~u;
    }
  }
  function Vo(t, l) {
    var a = l & -l;
    return a = (a & 42) !== 0 ? 1 : ec(a), (a & (t.suspendedLanes | l)) !== 0 ? 0 : a;
  }
  function ec(t) {
    switch (t) {
      case 2:
        t = 1;
        break;
      case 8:
        t = 4;
        break;
      case 32:
        t = 16;
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
        t = 128;
        break;
      case 268435456:
        t = 134217728;
        break;
      default:
        t = 0;
    }
    return t;
  }
  function uc(t) {
    return t &= -t, 2 < t ? 8 < t ? (t & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Zo() {
    var t = V.p;
    return t !== 0 ? t : (t = window.event, t === void 0 ? 32 : Im(t.type));
  }
  function Ko(t, l) {
    var a = V.p;
    try {
      return V.p = t, l();
    } finally {
      V.p = a;
    }
  }
  var ba = Math.random().toString(36).slice(2), il = "__reactFiber$" + ba, El = "__reactProps$" + ba, qe = "__reactContainer$" + ba, wo = "__reactEvents$" + ba, N0 = "__reactListeners$" + ba, A0 = "__reactHandles$" + ba, Jo = "__reactResources$" + ba, Ru = "__reactMarker$" + ba, Un = "__reactLoad$" + ba;
  function Rn(t) {
    delete t[il], delete t[El], delete t[N0], delete t[A0];
  }
  function de(t) {
    var l;
    if (l = t[il]) return l;
    for (var a = t.parentNode; a; ) {
      if (l = a[qe] || a[il]) {
        if (a = l.alternate, l.child !== null || a !== null && a.child !== null)
          for (t = Um(t); t !== null; ) {
            if (a = t[il]) return a;
            t = Um(t);
          }
        return l;
      }
      t = a, a = t.parentNode;
    }
    return null;
  }
  function Be(t) {
    if (t = t[il] || t[qe]) {
      var l = t.tag;
      if (l === 5 || l === 6 || l === 13 || l === 31 || l === 26 || l === 27 || l === 3)
        return t;
    }
    return null;
  }
  function ju(t) {
    var l = t.tag;
    if (l === 5 || l === 26 || l === 27 || l === 6) return t.stateNode;
    throw Error(d(33));
  }
  function Ye(t) {
    var l = t[Jo];
    return l || (l = t[Jo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), l;
  }
  function ll(t) {
    t[Ru] = !0;
  }
  function $o(t) {
    t[Un] = void 0;
  }
  var Fo = /* @__PURE__ */ new Set(), Wo = {};
  function me(t, l) {
    Ge(t, l), Ge(t + "Capture", l);
  }
  function Ge(t, l) {
    for (Wo[t] = l, t = 0; t < l.length; t++)
      Fo.add(l[t]);
  }
  var p0 = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Io = {}, ko = {};
  function C0(t) {
    return He.call(ko, t) ? !0 : He.call(Io, t) ? !1 : p0.test(t) ? ko[t] = !0 : (Io[t] = !0, !1);
  }
  var Tt = !1;
  function Po() {
    var t = Tt;
    return Tt = !1, t;
  }
  function jn(t, l, a) {
    if (C0(l))
      if (a === null) t.removeAttribute(l);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            t.removeAttribute(l);
            return;
          case "boolean":
            var e = l.toLowerCase().slice(0, 5);
            if (e !== "data-" && e !== "aria-") {
              t.removeAttribute(l);
              return;
            }
        }
        t.setAttribute(l, a);
      }
  }
  function xn(t, l, a) {
    if (a === null) t.removeAttribute(l);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(l);
          return;
      }
      t.setAttribute(l, a);
    }
  }
  function Sa(t, l, a, e) {
    if (e === null) t.removeAttribute(a);
    else {
      switch (typeof e) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          t.removeAttribute(a);
          return;
      }
      t.setAttributeNS(l, a, e);
    }
  }
  function Rl(t) {
    switch (typeof t) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return t;
      case "object":
        return t;
      default:
        return "";
    }
  }
  function ts(t) {
    var l = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (l === "checkbox" || l === "radio");
  }
  function M0(t, l, a) {
    var e = Object.getOwnPropertyDescriptor(
      t.constructor.prototype,
      l
    );
    if (!t.hasOwnProperty(l) && typeof e < "u" && typeof e.get == "function" && typeof e.set == "function") {
      var u = e.get, n = e.set;
      return Object.defineProperty(t, l, {
        configurable: !0,
        get: function() {
          return u.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(t, l, {
        enumerable: e.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(i) {
          a = "" + i;
        },
        stopTracking: function() {
          t._valueTracker = null, delete t[l];
        }
      };
    }
  }
  function nc(t) {
    if (!t._valueTracker) {
      var l = ts(t) ? "checked" : "value";
      t._valueTracker = M0(
        t,
        l,
        "" + t[l]
      );
    }
  }
  function ls(t) {
    if (!t) return !1;
    var l = t._valueTracker;
    if (!l) return !0;
    var a = l.getValue(), e = "";
    return t && (e = ts(t) ? t.checked ? "true" : "false" : t.value), t = e, t !== a ? (l.setValue(t), !0) : !1;
  }
  var D0 = /[\n"\\]/g;
  function Xl(t) {
    return t.replace(
      D0,
      function(l) {
        return "\\" + l.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function ic(t, l, a, e, u, n, i, c) {
    t.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? t.type = i : t.removeAttribute("type"), l != null ? i === "number" ? (l === 0 && t.value === "" || t.value != l) && (t.value = "" + Rl(l)) : t.value !== "" + Rl(l) && (t.value = "" + Rl(l)) : i !== "submit" && i !== "reset" || t.removeAttribute("value"), l != null ? i === "number" && t.value == l ? cc(t, Rl(t.value)) : cc(t, Rl(l)) : a != null ? cc(t, Rl(a)) : e != null && t.removeAttribute("value"), u == null && n != null && (t.defaultChecked = !!n), u != null && (t.checked = u && typeof u != "function" && typeof u != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? t.name = "" + Rl(c) : t.removeAttribute("name");
  }
  function as(t, l, a, e, u, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (t.type = n), l != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || l != null)) {
        nc(t);
        return;
      }
      a = a != null ? "" + Rl(a) : "", l = l != null ? "" + Rl(l) : a, c || l === t.value || (t.value = l), t.defaultValue = l;
    }
    e = e ?? u, e = typeof e != "function" && typeof e != "symbol" && !!e, t.checked = c ? t.checked : !!e, t.defaultChecked = !!e, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (t.name = i), nc(t);
  }
  function cc(t, l) {
    t.defaultValue !== "" + l && (t.defaultValue = "" + l);
  }
  function Xe(t, l, a, e) {
    if (t = t.options, l) {
      l = {};
      for (var u = 0; u < a.length; u++)
        l["$" + a[u]] = !0;
      for (a = 0; a < t.length; a++)
        u = l.hasOwnProperty("$" + t[a].value), t[a].selected !== u && (t[a].selected = u), u && e && (t[a].defaultSelected = !0);
    } else {
      for (a = "" + Rl(a), l = null, u = 0; u < t.length; u++) {
        if (t[u].value === a) {
          t[u].selected = !0, e && (t[u].defaultSelected = !0);
          return;
        }
        l !== null || t[u].disabled || (l = t[u]);
      }
      l !== null && (l.selected = !0);
    }
  }
  function es(t, l, a) {
    if (l != null && (l = "" + Rl(l), l !== t.value && (t.value = l), a == null)) {
      t.defaultValue !== l && (t.defaultValue = l);
      return;
    }
    t.defaultValue = a != null ? "" + Rl(a) : "";
  }
  function us(t, l, a, e) {
    if (l == null) {
      if (e != null) {
        if (a != null) throw Error(d(92));
        if (ft(e)) {
          if (1 < e.length) throw Error(d(93));
          e = e[0];
        }
        a = e;
      }
      a == null && (a = ""), l = a;
    }
    a = Rl(l), t.defaultValue = a, e = t.textContent, e === a && e !== "" && e !== null && (t.value = e), nc(t);
  }
  function Qe(t, l) {
    if (l) {
      var a = t.firstChild;
      if (a && a === t.lastChild && a.nodeType === 3) {
        a.nodeValue = l;
        return;
      }
    }
    t.textContent = l;
  }
  var U0 = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ns(t, l, a) {
    var e = l.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? e ? t.setProperty(l, "") : l === "float" ? t.cssFloat = "" : t[l] = "" : e ? t.setProperty(l, a) : typeof a != "number" || a === 0 || U0.has(l) ? l === "float" ? t.cssFloat = a : t[l] = ("" + a).trim() : t[l] = a + "px";
  }
  function is(t, l, a) {
    if (l != null && typeof l != "object")
      throw Error(d(62));
    if (t = t.style, a != null) {
      for (var e in a)
        !a.hasOwnProperty(e) || l != null && l.hasOwnProperty(e) || (e.indexOf("--") === 0 ? t.setProperty(e, "") : e === "float" ? t.cssFloat = "" : t[e] = "", Tt = !0);
      for (var u in l)
        e = l[u], l.hasOwnProperty(u) && a[u] !== e && (ns(t, u, e), Tt = !0);
    } else
      for (var n in l)
        l.hasOwnProperty(n) && ns(t, n, l[n]);
  }
  function fc(t) {
    if (t.indexOf("-") === -1) return !1;
    switch (t) {
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
  function Hn(t) {
    return j0.test("" + t) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : t;
  }
  function na() {
  }
  var oc = null;
  function sc(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Le = null, Ve = null;
  function cs(t) {
    var l = Be(t);
    if (l && (t = l.stateNode)) {
      var a = t[El] || null;
      t: switch (t = l.stateNode, l.type) {
        case "input":
          if (ic(
            t,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), l = a.name, a.type === "radio" && l != null) {
            for (a = t; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + Xl(
                "" + l
              ) + '"][type="radio"]'
            ), l = 0; l < a.length; l++) {
              var e = a[l];
              if (e !== t && e.form === t.form) {
                var u = e[El] || null;
                if (!u) throw Error(d(90));
                ic(
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
            for (l = 0; l < a.length; l++)
              e = a[l], e.form === t.form && ls(e);
          }
          break t;
        case "textarea":
          es(t, a.value, a.defaultValue);
          break t;
        case "select":
          l = a.value, l != null && Xe(t, !!a.multiple, l, !1);
      }
    }
  }
  var rc = !1;
  function fs(t, l, a) {
    if (rc) return t(l, a);
    rc = !0;
    try {
      var e = t(l);
      return e;
    } finally {
      if (rc = !1, (Le !== null || Ve !== null) && (Hi(), Le && (l = Le, t = Ve, Ve = Le = null, cs(l), t)))
        for (l = 0; l < t.length; l++) cs(t[l]);
    }
  }
  function xu(t, l) {
    var a = t.stateNode;
    if (a === null) return null;
    var e = a[El] || null;
    if (e === null) return null;
    a = e[l];
    t: switch (l) {
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
        (e = !e.disabled) || (t = t.type, e = !(t === "button" || t === "input" || t === "select" || t === "textarea")), t = !e;
        break t;
      default:
        t = !1;
    }
    if (t) return null;
    if (a && typeof a != "function")
      throw Error(
        d(231, l, typeof a)
      );
    return a;
  }
  var Ta = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), dc = !1;
  if (Ta)
    try {
      var Hu = {};
      Object.defineProperty(Hu, "passive", {
        get: function() {
          dc = !0;
        }
      }), window.addEventListener("test", Hu, Hu), window.removeEventListener("test", Hu, Hu);
    } catch {
      dc = !1;
    }
  var qa = null, mc = null, qn = null;
  function os() {
    if (qn) return qn;
    var t, l = mc, a = l.length, e, u = "value" in qa ? qa.value : qa.textContent, n = u.length;
    for (t = 0; t < a && l[t] === u[t]; t++) ;
    var i = a - t;
    for (e = 1; e <= i && l[a - e] === u[n - e]; e++) ;
    return qn = u.slice(t, 1 < e ? 1 - e : void 0);
  }
  function Bn(t) {
    var l = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && l === 13 && (t = 13)) : t = l, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Yn() {
    return !0;
  }
  function ss() {
    return !1;
  }
  function yl(t) {
    function l(a, e, u, n, i) {
      this._reactName = a, this._targetInst = u, this.type = e, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in t)
        t.hasOwnProperty(c) && (a = t[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? Yn : ss, this.isPropagationStopped = ss, this;
    }
    return D(l.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = Yn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = Yn);
      },
      persist: function() {
      },
      isPersistent: Yn
    }), l;
  }
  var Ba = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(t) {
      return t.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Gn = yl(Ba), qu = D({}, Ba, { view: 0, detail: 0 }), x0 = yl(qu), vc, hc, Bu, Xn = D({}, qu, {
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
    getModifierState: gc,
    button: 0,
    buttons: 0,
    relatedTarget: function(t) {
      return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
    },
    movementX: function(t) {
      return "movementX" in t ? t.movementX : (t !== Bu && (Bu && t.type === "mousemove" ? (vc = t.screenX - Bu.screenX, hc = t.screenY - Bu.screenY) : hc = vc = 0, Bu = t), vc);
    },
    movementY: function(t) {
      return "movementY" in t ? t.movementY : hc;
    }
  }), rs = yl(Xn), H0 = D({}, Xn, { dataTransfer: 0 }), q0 = yl(H0), B0 = D({}, qu, { relatedTarget: 0 }), yc = yl(B0), Y0 = D({}, Ba, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), G0 = yl(Y0), X0 = D({}, Ba, {
    clipboardData: function(t) {
      return "clipboardData" in t ? t.clipboardData : window.clipboardData;
    }
  }), Q0 = yl(X0), L0 = D({}, Ba, { data: 0 }), ds = yl(L0), V0 = {
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
  function w0(t) {
    var l = this.nativeEvent;
    return l.getModifierState ? l.getModifierState(t) : (t = K0[t]) ? !!l[t] : !1;
  }
  function gc() {
    return w0;
  }
  var J0 = D({}, qu, {
    key: function(t) {
      if (t.key) {
        var l = V0[t.key] || t.key;
        if (l !== "Unidentified") return l;
      }
      return t.type === "keypress" ? (t = Bn(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? Z0[t.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: gc,
    charCode: function(t) {
      return t.type === "keypress" ? Bn(t) : 0;
    },
    keyCode: function(t) {
      return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    },
    which: function(t) {
      return t.type === "keypress" ? Bn(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
    }
  }), $0 = yl(J0), F0 = D({}, Xn, {
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
  }), ms = yl(F0), W0 = D({}, Ba, { submitter: 0 }), I0 = yl(W0), k0 = D({}, qu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: gc
  }), P0 = yl(k0), tv = D({}, Ba, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), lv = yl(tv), av = D({}, Xn, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), ev = yl(av), uv = D({}, Ba, {
    newState: 0,
    oldState: 0,
    source: 0
  }), nv = yl(uv), iv = [9, 13, 27, 32], bc = Ta && "CompositionEvent" in window, Yu = null;
  Ta && "documentMode" in document && (Yu = document.documentMode);
  var cv = Ta && "TextEvent" in window && !Yu, vs = Ta && (!bc || Yu && 8 < Yu && 11 >= Yu), hs = " ", ys = !1;
  function gs(t, l) {
    switch (t) {
      case "keyup":
        return iv.indexOf(l.keyCode) !== -1;
      case "keydown":
        return l.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function bs(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Ze = !1;
  function fv(t, l) {
    switch (t) {
      case "compositionend":
        return bs(l);
      case "keypress":
        return l.which !== 32 ? null : (ys = !0, hs);
      case "textInput":
        return t = l.data, t === hs && ys ? null : t;
      default:
        return null;
    }
  }
  function ov(t, l) {
    if (Ze)
      return t === "compositionend" || !bc && gs(t, l) ? (t = os(), qn = mc = qa = null, Ze = !1, t) : null;
    switch (t) {
      case "paste":
        return null;
      case "keypress":
        if (!(l.ctrlKey || l.altKey || l.metaKey) || l.ctrlKey && l.altKey) {
          if (l.char && 1 < l.char.length)
            return l.char;
          if (l.which) return String.fromCharCode(l.which);
        }
        return null;
      case "compositionend":
        return vs && l.locale !== "ko" ? null : l.data;
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
  function Ss(t) {
    var l = t && t.nodeName && t.nodeName.toLowerCase();
    return l === "input" ? !!sv[t.type] : l === "textarea";
  }
  function Ts(t, l, a, e) {
    Le ? Ve ? Ve.push(e) : Ve = [e] : Le = e, l = Qi(l, "onChange"), 0 < l.length && (a = new Gn(
      "onChange",
      "change",
      null,
      a,
      e
    ), t.push({ event: a, listeners: l }));
  }
  var Gu = null, Xu = null;
  function rv(t) {
    cm(t, 0);
  }
  function Qn(t) {
    var l = ju(t);
    if (ls(l)) return t;
  }
  function Es(t, l) {
    if (t === "change") return l;
  }
  var zs = !1;
  if (Ta) {
    var Sc;
    if (Ta) {
      var Tc = "oninput" in document;
      if (!Tc) {
        var _s = document.createElement("div");
        _s.setAttribute("oninput", "return;"), Tc = typeof _s.oninput == "function";
      }
      Sc = Tc;
    } else Sc = !1;
    zs = Sc && (!document.documentMode || 9 < document.documentMode);
  }
  function Os() {
    Gu && (Gu.detachEvent("onpropertychange", Ns), Xu = Gu = null);
  }
  function Ns(t) {
    if (t.propertyName === "value" && Qn(Xu)) {
      var l = [];
      Ts(
        l,
        Xu,
        t,
        sc(t)
      ), fs(rv, l);
    }
  }
  function dv(t, l, a) {
    t === "focusin" ? (Os(), Gu = l, Xu = a, Gu.attachEvent("onpropertychange", Ns)) : t === "focusout" && Os();
  }
  function mv(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown")
      return Qn(Xu);
  }
  function vv(t, l) {
    if (t === "click") return Qn(l);
  }
  function hv(t, l) {
    if (t === "input" || t === "change")
      return Qn(l);
  }
  function yv(t, l) {
    return t === l && (t !== 0 || 1 / t === 1 / l) || t !== t && l !== l;
  }
  var jl = typeof Object.is == "function" ? Object.is : yv;
  function Qu(t, l) {
    if (jl(t, l)) return !0;
    if (typeof t != "object" || t === null || typeof l != "object" || l === null)
      return !1;
    var a = Object.keys(t), e = Object.keys(l);
    if (a.length !== e.length) return !1;
    for (e = 0; e < a.length; e++) {
      var u = a[e];
      if (!He.call(l, u) || !jl(t[u], l[u]))
        return !1;
    }
    return !0;
  }
  function Ec(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function As(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function ps(t, l) {
    var a = As(t);
    t = 0;
    for (var e; a; ) {
      if (a.nodeType === 3) {
        if (e = t + a.textContent.length, t <= l && e >= l)
          return { node: a, offset: l - t };
        t = e;
      }
      t: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break t;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = As(a);
    }
  }
  function Cs(t, l) {
    return t && l ? t === l ? !0 : t && t.nodeType === 3 ? !1 : l && l.nodeType === 3 ? Cs(t, l.parentNode) : "contains" in t ? t.contains(l) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(l) & 16) : !1 : !1;
  }
  function Ms(t) {
    t = t != null && t.ownerDocument != null && t.ownerDocument.defaultView != null ? t.ownerDocument.defaultView : window;
    for (var l = Ec(t.document); l instanceof t.HTMLIFrameElement; ) {
      try {
        var a = typeof l.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) t = l.contentWindow;
      else break;
      l = Ec(t.document);
    }
    return l;
  }
  function zc(t) {
    var l = t && t.nodeName && t.nodeName.toLowerCase();
    return l && (l === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || l === "textarea" || t.contentEditable === "true");
  }
  var gv = Ta && "documentMode" in document && 11 >= document.documentMode, Ke = null, _c = null, Lu = null, Oc = !1;
  function Ds(t, l, a) {
    var e = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Oc || Ke == null || Ke !== Ec(e) || (e = Ke, "selectionStart" in e && zc(e) ? e = { start: e.selectionStart, end: e.selectionEnd } : (e = (e.ownerDocument && e.ownerDocument.defaultView || window).getSelection(), e = {
      anchorNode: e.anchorNode,
      anchorOffset: e.anchorOffset,
      focusNode: e.focusNode,
      focusOffset: e.focusOffset
    }), Lu && Qu(Lu, e) || (Lu = e, e = Qi(_c, "onSelect"), 0 < e.length && (l = new Gn(
      "onSelect",
      "select",
      null,
      l,
      a
    ), t.push({ event: l, listeners: e }), l.target = Ke)));
  }
  function ve(t, l) {
    var a = {};
    return a[t.toLowerCase()] = l.toLowerCase(), a["Webkit" + t] = "webkit" + l, a["Moz" + t] = "moz" + l, a;
  }
  var we = {
    animationend: ve("Animation", "AnimationEnd"),
    animationiteration: ve("Animation", "AnimationIteration"),
    animationstart: ve("Animation", "AnimationStart"),
    transitionrun: ve("Transition", "TransitionRun"),
    transitionstart: ve("Transition", "TransitionStart"),
    transitioncancel: ve("Transition", "TransitionCancel"),
    transitionend: ve("Transition", "TransitionEnd")
  }, Nc = {}, Us = {};
  Ta && (Us = document.createElement("div").style, "AnimationEvent" in window || (delete we.animationend.animation, delete we.animationiteration.animation, delete we.animationstart.animation), "TransitionEvent" in window || delete we.transitionend.transition);
  function he(t) {
    if (Nc[t]) return Nc[t];
    if (!we[t]) return t;
    var l = we[t], a;
    for (a in l)
      if (l.hasOwnProperty(a) && a in Us)
        return Nc[t] = l[a];
    return t;
  }
  var Rs = he("animationend"), js = he("animationiteration"), xs = he("animationstart"), bv = he("transitionrun"), Sv = he("transitionstart"), Tv = he("transitioncancel"), Hs = he("transitionend"), qs = /* @__PURE__ */ new Map(), Ac = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Ac.push("scrollEnd");
  function Pl(t, l) {
    qs.set(t, l), me(l, [t]);
  }
  var Ev = 0;
  function Ea(t, l) {
    if (t.name != null && t.name !== "auto") return t.name;
    if (l.autoName !== null) return l.autoName;
    t = ea.identifierPrefix;
    var a = Ev++;
    return t = "_" + t + "t_" + a.toString(32) + "_", l.autoName = t;
  }
  function Bs(t) {
    if (t == null || typeof t == "string")
      return t;
    var l = null, a = du;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = t[a[e]];
        if (u != null) {
          if (u === "none") return "none";
          l = l == null ? u : l + (" " + u);
        }
      }
    return l ?? t.default;
  }
  function za(t, l) {
    return t = Bs(t), l = Bs(l), l == null ? t === "auto" ? null : t : l === "auto" ? null : l;
  }
  var Ln = typeof reportError == "function" ? reportError : function(t) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var l = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof t == "object" && t !== null && typeof t.message == "string" ? String(t.message) : String(t),
        error: t
      });
      if (!window.dispatchEvent(l)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", t);
      return;
    }
    console.error(t);
  }, Ql = [], Je = 0, pc = 0;
  function Vn() {
    for (var t = Je, l = pc = Je = 0; l < t; ) {
      var a = Ql[l];
      Ql[l++] = null;
      var e = Ql[l];
      Ql[l++] = null;
      var u = Ql[l];
      Ql[l++] = null;
      var n = Ql[l];
      if (Ql[l++] = null, e !== null && u !== null) {
        var i = e.pending;
        i === null ? u.next = u : (u.next = i.next, i.next = u), e.pending = u;
      }
      n !== 0 && Ys(a, u, n);
    }
  }
  function Zn(t, l, a, e) {
    Ql[Je++] = t, Ql[Je++] = l, Ql[Je++] = a, Ql[Je++] = e, pc |= e, t.lanes |= e, t = t.alternate, t !== null && (t.lanes |= e);
  }
  function Cc(t, l, a, e) {
    return Zn(t, l, a, e), Kn(t);
  }
  function ye(t, l) {
    return Zn(t, null, null, l), Kn(t);
  }
  function Ys(t, l, a) {
    t.lanes |= a;
    var e = t.alternate;
    e !== null && (e.lanes |= a);
    for (var u = !1, n = t.return; n !== null; )
      n.childLanes |= a, e = n.alternate, e !== null && (e.childLanes |= a), n.tag === 22 && (t = n.stateNode, t === null || t._visibility & 1 || (u = !0)), t = n, n = n.return;
    return t.tag === 3 ? (n = t.stateNode, u && l !== null && (u = 31 - Ul(a), t = n.hiddenUpdates, e = t[u], e === null ? t[u] = [l] : e.push(l), l.lane = a | 536870912), n) : null;
  }
  function Kn(t) {
    if (50 < rn)
      throw rn = 0, xi = null, Error(d(185));
    for (var l = t.return; l !== null; )
      t = l, l = t.return;
    return t.tag === 3 ? t.stateNode : null;
  }
  var $e = {};
  function zv(t, l, a, e) {
    this.tag = t, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = l, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = e, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function zl(t, l, a, e) {
    return new zv(t, l, a, e);
  }
  function Mc(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function _a(t, l) {
    var a = t.alternate;
    return a === null ? (a = zl(
      t.tag,
      l,
      t.key,
      t.mode
    ), a.elementType = t.elementType, a.type = t.type, a.stateNode = t.stateNode, a.alternate = t, t.alternate = a) : (a.pendingProps = l, a.type = t.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = t.flags & 1206910976, a.childLanes = t.childLanes, a.lanes = t.lanes, a.child = t.child, a.memoizedProps = t.memoizedProps, a.memoizedState = t.memoizedState, a.updateQueue = t.updateQueue, l = t.dependencies, a.dependencies = l === null ? null : { lanes: l.lanes, firstContext: l.firstContext }, a.sibling = t.sibling, a.index = t.index, a.ref = t.ref, a.refCleanup = t.refCleanup, a;
  }
  function Gs(t, l) {
    t.flags &= 1206910978;
    var a = t.alternate;
    return a === null ? (t.childLanes = 0, t.lanes = l, t.child = null, t.subtreeFlags = 0, t.memoizedProps = null, t.memoizedState = null, t.updateQueue = null, t.dependencies = null, t.stateNode = null) : (t.childLanes = a.childLanes, t.lanes = a.lanes, t.child = a.child, t.subtreeFlags = 0, t.deletions = null, t.memoizedProps = a.memoizedProps, t.memoizedState = a.memoizedState, t.updateQueue = a.updateQueue, t.type = a.type, l = a.dependencies, t.dependencies = l === null ? null : {
      lanes: l.lanes,
      firstContext: l.firstContext
    }), t;
  }
  function wn(t, l, a, e, u, n) {
    var i = 0;
    if (e = t, typeof e == "function") Mc(e) && (i = 1);
    else if (typeof e == "string")
      i = Wh(
        t,
        a,
        dt.current
      ) ? 26 : t === "html" || t === "head" || t === "body" ? 27 : 5;
    else
      t: switch (e) {
        case Pt:
          return t = zl(31, a, l, u), t.elementType = Pt, t.lanes = n, t;
        case Lt:
          return ge(a.children, u, n, l);
        case it:
          i = 8, u |= 24;
          break;
        case Rt:
          return t = zl(12, a, l, u | 2), t.elementType = Rt, t.lanes = n, t;
        case Z:
          return t = zl(13, a, l, u), t.elementType = Z, t.lanes = n, t;
        case R:
          return t = zl(19, a, l, u), t.elementType = R, t.lanes = n, t;
        case ml:
        case s:
          return t = u | 32, t = zl(30, a, l, t), t.elementType = s, t.lanes = n, t.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, t;
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case Mt:
                i = 10;
                break t;
              case nl:
                i = 9;
                break t;
              case M:
                i = 11;
                break t;
              case ct:
                i = 14;
                break t;
              case ut:
                i = 16, e = null;
                break t;
            }
          i = 29, a = Error(
            d(130, t === null ? "null" : typeof t, "")
          ), e = null;
      }
    return l = zl(i, a, l, u), l.elementType = t, l.type = e, l.lanes = n, l;
  }
  function ge(t, l, a, e) {
    return t = zl(7, t, e, l), t.lanes = a, t;
  }
  function Dc(t, l, a) {
    return t = zl(6, t, null, l), t.lanes = a, t;
  }
  function Xs(t) {
    var l = zl(18, null, null, 0);
    return l.stateNode = t, l;
  }
  function Uc(t, l, a) {
    return l = zl(
      4,
      t.children !== null ? t.children : [],
      t.key,
      l
    ), l.lanes = a, l.stateNode = {
      containerInfo: t.containerInfo,
      pendingChildren: null,
      implementation: t.implementation
    }, l;
  }
  var Qs = /* @__PURE__ */ new WeakMap();
  function Ll(t, l) {
    if (typeof t == "object" && t !== null) {
      var a = Qs.get(t);
      return a !== void 0 ? a : (l = {
        value: t,
        source: l,
        stack: pu(l)
      }, Qs.set(t, l), l);
    }
    return {
      value: t,
      source: l,
      stack: pu(l)
    };
  }
  var Fe = [], We = 0, Jn = null, Vu = 0, Vl = [], Zl = 0, Ya = null, ia = 1, ca = "";
  function Oa(t, l) {
    Fe[We++] = Vu, Fe[We++] = Jn, Jn = t, Vu = l;
  }
  function Ls(t, l, a) {
    Vl[Zl++] = ia, Vl[Zl++] = ca, Vl[Zl++] = Ya, Ya = t;
    var e = ia;
    t = ca;
    var u = 32 - Ul(e) - 1;
    e &= ~(1 << u), a += 1;
    var n = 32 - Ul(l) + u;
    if (30 < n) {
      var i = u - u % 5;
      n = (e & (1 << i) - 1).toString(32), e >>= i, u -= i, ia = 1 << 32 - Ul(l) + u | a << u | e, ca = n + t;
    } else
      ia = 1 << n | a << u | e, ca = t;
  }
  function $n(t) {
    t.return !== null && (Oa(t, 1), Ls(t, 1, 0));
  }
  function Rc(t) {
    for (; t === Jn; )
      Jn = Fe[--We], Fe[We] = null, Vu = Fe[--We], Fe[We] = null;
    for (; t === Ya; )
      Ya = Vl[--Zl], Vl[Zl] = null, ca = Vl[--Zl], Vl[Zl] = null, ia = Vl[--Zl], Vl[Zl] = null;
  }
  function Vs(t, l) {
    Vl[Zl++] = ia, Vl[Zl++] = ca, Vl[Zl++] = Ya, ia = l.id, ca = l.overflow, Ya = t;
  }
  var al = null, xt = null, ot = !1, Ga = null, Kl = !1, jc = Error(d(519));
  function Xa(t) {
    var l = Error(
      d(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Zu(Ll(l, t)), jc;
  }
  function Zs(t) {
    var l = t.stateNode, a = t.type, e = t.memoizedProps;
    switch (l[il] = t, l[El] = e, a) {
      case "dialog":
        vt("cancel", l), vt("close", l);
        break;
      case "iframe":
      case "object":
      case "embed":
        vt("load", l);
        break;
      case "video":
      case "audio":
        for (a = 0; a < mn.length; a++)
          vt(mn[a], l);
        break;
      case "source":
        vt("error", l);
        break;
      case "img":
      case "image":
      case "link":
        vt("error", l), vt("load", l);
        break;
      case "details":
        vt("toggle", l);
        break;
      case "input":
        vt("invalid", l), as(
          l,
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
        vt("invalid", l);
        break;
      case "textarea":
        vt("invalid", l), us(l, e.value, e.defaultValue, e.children);
    }
    a = e.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || l.textContent === "" + a || e.suppressHydrationWarning === !0 || rm(l.textContent, a) ? (e.popover != null && (vt("beforetoggle", l), vt("toggle", l)), e.onScroll != null && vt("scroll", l), e.onScrollEnd != null && vt("scrollend", l), e.onClick != null && (l.onclick = na), l = !0) : l = !1, l || Xa(t, !0);
  }
  function Fn(t) {
    for (al = t.return; al; )
      switch (al.tag) {
        case 5:
        case 31:
        case 13:
          Kl = !1;
          return;
        case 27:
        case 3:
          Kl = !0;
          return;
        default:
          al = al.return;
      }
  }
  function Ie(t) {
    if (t !== al) return !1;
    if (!ot) return Fn(t), ot = !0, !1;
    var l = t.tag, a;
    if ((a = l !== 3 && l !== 27) && ((a = l === 5) && (a = t.type, a = !(a !== "form" && a !== "button") || so(t.type, t.memoizedProps)), a = !a), a && xt && Xa(t), Fn(t), l === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(d(317));
      xt = Dm(t);
    } else if (l === 31) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(d(317));
      xt = Dm(t);
    } else
      l === 27 ? (l = xt, ae(t.type) ? (t = To, To = null, xt = t) : xt = l) : xt = al ? Jl(t.stateNode.nextSibling) : null;
    return !0;
  }
  function be() {
    xt = al = null, ot = !1;
  }
  function xc() {
    var t = Ga;
    return t !== null && (Nl === null ? Nl = t : Nl.push.apply(
      Nl,
      t
    ), Ga = null), t;
  }
  function Zu(t) {
    Ga === null ? Ga = [t] : Ga.push(t);
  }
  var Hc = _(null), Se = null, Na = null;
  function Qa(t, l, a) {
    K(Hc, l._currentValue), l._currentValue = a;
  }
  function Aa(t) {
    t._currentValue = Hc.current, U(Hc);
  }
  function Wn(t, l, a) {
    for (; t !== null; ) {
      var e = t.alternate;
      if ((t.childLanes & l) !== l ? (t.childLanes |= l, e !== null && (e.childLanes |= l)) : e !== null && (e.childLanes & l) !== l && (e.childLanes |= l), t === a) break;
      t = t.return;
    }
  }
  function qc(t, l, a, e) {
    var u = t.child;
    for (u !== null && (u.return = t); u !== null; ) {
      var n = u.dependencies;
      if (n !== null) {
        var i = u.child;
        n = n.firstContext;
        t: for (; n !== null; ) {
          var c = n;
          n = u;
          for (var f = 0; f < l.length; f++)
            if (c.context === l[f]) {
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Wn(
                n.return,
                a,
                t
              ), e || (i = null);
              break t;
            }
          n = c.next;
        }
      } else if (u.tag === 18) {
        if (i = u.return, i === null) throw Error(d(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Wn(i, a, t), i = null;
      } else
        u.tag === 13 && u.memoizedState !== null && u.memoizedState.dehydrated === null ? (u.lanes |= a, i = u.alternate, i !== null && (i.lanes |= a), Wn(
          u.return,
          a,
          t
        ), i = u.child, i = i !== null ? i.sibling : null) : i = u.child;
      if (i !== null) i.return = u;
      else
        for (i = u; i !== null; ) {
          if (i === t) {
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
  function Te(t, l, a, e) {
    t = null;
    for (var u = l, n = !1; u !== null; ) {
      if (!n) {
        if ((u.flags & 524288) !== 0) n = !0;
        else if ((u.flags & 262144) !== 0) break;
      }
      if (u.tag === 10) {
        var i = u.alternate;
        if (i === null) throw Error(d(387));
        if (i = i.memoizedProps, i !== null) {
          var c = u.type;
          jl(u.pendingProps.value, i.value) || (t !== null ? t.push(c) : t = [c]);
        }
      } else if (u === Wl.current) {
        if (i = u.alternate, i === null) throw Error(d(387));
        i.memoizedState.memoizedState !== u.memoizedState.memoizedState && (t !== null ? t.push(zu) : t = [zu]);
      }
      u = u.return;
    }
    return t !== null && qc(
      l,
      t,
      a,
      e
    ), l.flags |= 262144, t !== null;
  }
  function In(t) {
    for (t = t.firstContext; t !== null; ) {
      if (!jl(
        t.context._currentValue,
        t.memoizedValue
      ))
        return !0;
      t = t.next;
    }
    return !1;
  }
  function Ee(t) {
    Se = t, Na = null, t = t.dependencies, t !== null && (t.firstContext = null);
  }
  function cl(t) {
    return Ks(Se, t);
  }
  function kn(t, l) {
    return Se === null && Ee(t), Ks(t, l);
  }
  function Ks(t, l) {
    var a = l._currentValue;
    if (l = { context: l, memoizedValue: a, next: null }, Na === null) {
      if (t === null) throw Error(d(308));
      Na = l, t.dependencies = { lanes: 0, firstContext: l }, t.flags |= 524288;
    } else Na = Na.next = l;
    return a;
  }
  var _v = typeof AbortController < "u" ? AbortController : function() {
    var t = [], l = this.signal = {
      aborted: !1,
      addEventListener: function(a, e) {
        t.push(e);
      }
    };
    this.abort = function() {
      l.aborted = !0, t.forEach(function(a) {
        return a();
      });
    };
  }, Ov = N.unstable_scheduleCallback, Nv = N.unstable_NormalPriority, $t = {
    $$typeof: Mt,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Bc() {
    return {
      controller: new _v(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Ku(t) {
    t.refCount--, t.refCount === 0 && Ov(Nv, function() {
      t.controller.abort();
    });
  }
  function ws(t, l) {
    if ((t.pendingLanes & 4194048) !== 0) {
      var a = t.transitionTypes;
      for (a === null && (a = t.transitionTypes = []), t = 0; t < l.length; t++) {
        var e = l[t];
        a.indexOf(e) === -1 && a.push(e);
      }
    }
  }
  var wu = null;
  function Av(t) {
    var l = t.transitionTypes;
    return t.transitionTypes = null, l;
  }
  var Ju = null, Yc = 0, ze = 0, ke = null;
  function pv(t, l) {
    if (Ju === null) {
      var a = Ju = [];
      Yc = 0, ze = lo(), ke = {
        status: "pending",
        value: void 0,
        then: function(e) {
          a.push(e);
        }
      };
    }
    return Yc++, l.then(Js, Js), l;
  }
  function Js() {
    if (--Yc === 0 && (wu = null, Ju !== null)) {
      ke !== null && (ke.status = "fulfilled");
      var t = Ju;
      Ju = null, ze = 0, ke = null;
      for (var l = 0; l < t.length; l++) (0, t[l])();
    }
  }
  function Cv(t, l) {
    var a = [], e = {
      status: "pending",
      value: null,
      reason: null,
      then: function(u) {
        a.push(u);
      }
    };
    return t.then(
      function() {
        e.status = "fulfilled", e.value = l;
        for (var u = 0; u < a.length; u++) (0, a[u])(l);
      },
      function(u) {
        for (e.status = "rejected", e.reason = u, u = 0; u < a.length; u++)
          (0, a[u])(void 0);
      }
    ), e;
  }
  var $s = j.S;
  j.S = function(t, l) {
    if (Xd = $(), typeof l == "object" && l !== null && typeof l.then == "function" && pv(t, l), wu !== null)
      for (var a = yu; a !== null; )
        ws(a, wu), a = a.next;
    if (a = t.types, a !== null) {
      for (var e = yu; e !== null; )
        ws(e, a), e = e.next;
      if (ze !== 0) {
        e = wu, e === null && (e = wu = []);
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.indexOf(n) === -1 && e.push(n);
        }
      }
    }
    $s !== null && $s(t, l);
  };
  var _e = _(null);
  function Gc() {
    var t = _e.current;
    return t !== null ? t : Ut.pooledCache;
  }
  function Pn(t, l) {
    l === null ? K(_e, _e.current) : K(_e, l.pool);
  }
  function Fs() {
    var t = Gc();
    return t === null ? null : { parent: $t._currentValue, pool: t };
  }
  var Pe = Error(d(460)), Xc = Error(d(474)), ti = Error(d(542)), li = { then: function() {
  } };
  function Ws(t) {
    return t = t.status, t === "fulfilled" || t === "rejected";
  }
  function Is(t, l, a) {
    switch (a = t[a], a === void 0 ? t.push(l) : a !== l && (l.then(na, na), l = a), l.status) {
      case "fulfilled":
        return l.value;
      case "rejected":
        throw t = l.reason, Ps(t), t === void 0 && !("reason" in l) ? Error(d(600)) : t;
      default:
        if (typeof l.status == "string") l.then(na, na);
        else {
          if (t = Ut, t !== null && 100 < t.shellSuspendCounter)
            throw Error(d(482));
          t = l, t.status = "pending", t.then(
            function(e) {
              if (l.status === "pending") {
                var u = l;
                u.status = "fulfilled", u.value = e;
              }
            },
            function(e) {
              if (l.status === "pending") {
                var u = l;
                u.status = "rejected", u.reason = e;
              }
            }
          );
        }
        switch (l.status) {
          case "fulfilled":
            return l.value;
          case "rejected":
            throw t = l.reason, Ps(t), t;
        }
        throw Ne = l, Pe;
    }
  }
  function Oe(t) {
    try {
      var l = t._init;
      return l(t._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Ne = a, Pe) : a;
    }
  }
  var Ne = null;
  function ks() {
    if (Ne === null) throw Error(d(459));
    var t = Ne;
    return Ne = null, t;
  }
  function Ps(t) {
    if (t === Pe || t === ti)
      throw Error(d(483));
  }
  var tu = null, $u = 0;
  function ai(t) {
    var l = $u;
    return $u += 1, tu === null && (tu = []), Is(tu, t, l);
  }
  function La(t, l) {
    l = l.props.ref, t.ref = l !== void 0 ? l : null;
  }
  function ei(t, l) {
    throw l.$$typeof === F ? Error(d(525)) : (t = Object.prototype.toString.call(l), Error(
      d(
        31,
        t === "[object Object]" ? "object with keys {" + Object.keys(l).join(", ") + "}" : t
      )
    ));
  }
  function tr(t) {
    function l(m, o) {
      if (t) {
        var h = m.deletions;
        h === null ? (m.deletions = [o], m.flags |= 16) : h.push(o);
      }
    }
    function a(m, o) {
      if (!t) return null;
      for (; o !== null; )
        l(m, o), o = o.sibling;
      return null;
    }
    function e(m) {
      for (var o = /* @__PURE__ */ new Map(); m !== null; )
        m.key === null ? o.set(m.index, m) : o.set(m.key, m), m = m.sibling;
      return o;
    }
    function u(m, o) {
      return m = _a(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, h) {
      return m.index = h, t ? (h = m.alternate, h !== null ? (h = h.index, h < o ? (m.flags |= 2, o) : h) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return t && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, o, h, E) {
      return o === null || o.tag !== 6 ? (o = Dc(h, m.mode, E), o.return = m, o) : (o = u(o, h), o.return = m, o);
    }
    function f(m, o, h, E) {
      var q = h.type;
      return q === Lt ? (m = b(
        m,
        o,
        h.props.children,
        E,
        h.key
      ), La(m, h), m) : o !== null && (o.elementType === q || typeof q == "object" && q !== null && q.$$typeof === ut && Oe(q) === o.type) ? (o = u(o, h.props), La(o, h), o.return = m, o) : (o = wn(
        h.type,
        h.key,
        h.props,
        null,
        m.mode,
        E
      ), La(o, h), o.return = m, o);
    }
    function v(m, o, h, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== h.containerInfo || o.stateNode.implementation !== h.implementation ? (o = Uc(h, m.mode, E), o.return = m, o) : (o = u(o, h.children || []), o.return = m, o);
    }
    function b(m, o, h, E, q) {
      return o === null || o.tag !== 7 ? (o = ge(
        h,
        m.mode,
        E,
        q
      ), o.return = m, o) : (o = u(o, h), o.return = m, o);
    }
    function z(m, o, h) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = Dc(
          "" + o,
          m.mode,
          h
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case et:
            return h = wn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              h
            ), La(h, o), h.return = m, h;
          case Et:
            return o = Uc(
              o,
              m.mode,
              h
            ), o.return = m, o;
          case ut:
            return o = Oe(o), z(m, o, h);
        }
        if (ft(o) || B(o))
          return o = ge(
            o,
            m.mode,
            h,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, ai(o), h);
        if (o.$$typeof === Mt)
          return z(
            m,
            kn(m, o),
            h
          );
        ei(m, o);
      }
      return null;
    }
    function r(m, o, h, E) {
      var q = o !== null ? o.key : null;
      if (typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint")
        return q !== null ? null : c(m, o, "" + h, E);
      if (typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case et:
            return h.key === q ? f(m, o, h, E) : null;
          case Et:
            return h.key === q ? v(m, o, h, E) : null;
          case ut:
            return h = Oe(h), r(m, o, h, E);
        }
        if (ft(h) || B(h))
          return q !== null ? null : b(m, o, h, E, null);
        if (typeof h.then == "function")
          return r(
            m,
            o,
            ai(h),
            E
          );
        if (h.$$typeof === Mt)
          return r(
            m,
            o,
            kn(m, h),
            E
          );
        ei(m, h);
      }
      return null;
    }
    function y(m, o, h, E, q) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return m = m.get(h) || null, c(o, m, "" + E, q);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case et:
            return m = m.get(
              E.key === null ? h : E.key
            ) || null, f(o, m, E, q);
          case Et:
            return m = m.get(
              E.key === null ? h : E.key
            ) || null, v(o, m, E, q);
          case ut:
            return E = Oe(E), y(
              m,
              o,
              h,
              E,
              q
            );
        }
        if (ft(E) || B(E))
          return m = m.get(h) || null, b(o, m, E, q, null);
        if (typeof E.then == "function")
          return y(
            m,
            o,
            h,
            ai(E),
            q
          );
        if (E.$$typeof === Mt)
          return y(
            m,
            o,
            h,
            kn(o, E),
            q
          );
        ei(o, E);
      }
      return null;
    }
    function p(m, o, h, E) {
      for (var q = null, gt = null, L = o, I = o = 0, It = null; L !== null && I < h.length; I++) {
        L.index > I ? (It = L, L = null) : It = L.sibling;
        var St = r(
          m,
          L,
          h[I],
          E
        );
        if (St === null) {
          L === null && (L = It);
          break;
        }
        t && L && St.alternate === null && l(m, L), o = n(St, o, I), gt === null ? q = St : gt.sibling = St, gt = St, L = It;
      }
      if (I === h.length)
        return a(m, L), ot && Oa(m, I), q;
      if (L === null) {
        for (; I < h.length; I++)
          L = z(m, h[I], E), L !== null && (o = n(
            L,
            o,
            I
          ), gt === null ? q = L : gt.sibling = L, gt = L);
        return ot && Oa(m, I), q;
      }
      for (L = e(L); I < h.length; I++)
        It = y(
          L,
          m,
          I,
          h[I],
          E
        ), It !== null && (t && (St = It.alternate, St !== null && L.delete(St.key === null ? I : St.key)), o = n(
          It,
          o,
          I
        ), gt === null ? q = It : gt.sibling = It, gt = It);
      return t && L.forEach(function(ce) {
        return l(m, ce);
      }), ot && Oa(m, I), q;
    }
    function Y(m, o, h, E) {
      if (h == null) throw Error(d(151));
      for (var q = null, gt = null, L = o, I = o = 0, It = null, St = h.next(); L !== null && !St.done; I++, St = h.next()) {
        L.index > I ? (It = L, L = null) : It = L.sibling;
        var ce = r(m, L, St.value, E);
        if (ce === null) {
          L === null && (L = It);
          break;
        }
        t && L && ce.alternate === null && l(m, L), o = n(ce, o, I), gt === null ? q = ce : gt.sibling = ce, gt = ce, L = It;
      }
      if (St.done)
        return a(m, L), ot && Oa(m, I), q;
      if (L === null) {
        for (; !St.done; I++, St = h.next())
          St = z(m, St.value, E), St !== null && (o = n(St, o, I), gt === null ? q = St : gt.sibling = St, gt = St);
        return ot && Oa(m, I), q;
      }
      for (L = e(L); !St.done; I++, St = h.next())
        St = y(L, m, I, St.value, E), St !== null && (t && (It = St.alternate, It !== null && L.delete(
          It.key === null ? I : It.key
        )), o = n(St, o, I), gt === null ? q = St : gt.sibling = St, gt = St);
      return t && L.forEach(function(fy) {
        return l(m, fy);
      }), ot && Oa(m, I), q;
    }
    function at(m, o, h, E) {
      if (typeof h == "object" && h !== null && h.type === Lt && h.key === null && h.props.ref === void 0 && (h = h.props.children), typeof h == "object" && h !== null) {
        switch (h.$$typeof) {
          case et:
            t: {
              for (var q = h.key; o !== null; ) {
                if (o.key === q) {
                  if (q = h.type, q === Lt) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), E = u(
                        o,
                        h.props.children
                      ), La(E, h), E.return = m, m = E;
                      break t;
                    }
                  } else if (o.elementType === q || typeof q == "object" && q !== null && q.$$typeof === ut && Oe(q) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), E = u(o, h.props), La(E, h), E.return = m, m = E;
                    break t;
                  }
                  a(m, o);
                  break;
                } else l(m, o);
                o = o.sibling;
              }
              h.type === Lt ? (E = ge(
                h.props.children,
                m.mode,
                E,
                h.key
              ), La(E, h), E.return = m, m = E) : (E = wn(
                h.type,
                h.key,
                h.props,
                null,
                m.mode,
                E
              ), La(E, h), E.return = m, m = E);
            }
            return i(m);
          case Et:
            t: {
              for (q = h.key; o !== null; ) {
                if (o.key === q)
                  if (o.tag === 4 && o.stateNode.containerInfo === h.containerInfo && o.stateNode.implementation === h.implementation) {
                    a(
                      m,
                      o.sibling
                    ), E = u(o, h.children || []), E.return = m, m = E;
                    break t;
                  } else {
                    a(m, o);
                    break;
                  }
                else l(m, o);
                o = o.sibling;
              }
              E = Uc(h, m.mode, E), E.return = m, m = E;
            }
            return i(m);
          case ut:
            return h = Oe(h), at(
              m,
              o,
              h,
              E
            );
        }
        if (ft(h))
          return p(
            m,
            o,
            h,
            E
          );
        if (B(h)) {
          if (q = B(h), typeof q != "function") throw Error(d(150));
          return h = q.call(h), Y(
            m,
            o,
            h,
            E
          );
        }
        if (typeof h.then == "function")
          return at(
            m,
            o,
            ai(h),
            E
          );
        if (h.$$typeof === Mt)
          return at(
            m,
            o,
            kn(m, h),
            E
          );
        ei(m, h);
      }
      return typeof h == "string" && h !== "" || typeof h == "number" || typeof h == "bigint" ? (h = "" + h, o !== null && o.tag === 6 ? (a(m, o.sibling), E = u(o, h), E.return = m, m = E) : (a(m, o), E = Dc(h, m.mode, E), E.return = m, m = E), i(m)) : a(m, o);
    }
    return function(m, o, h, E) {
      try {
        $u = 0;
        var q = at(
          m,
          o,
          h,
          E
        );
        return tu = null, q;
      } catch (L) {
        if (L === Pe || L === ti) throw L;
        var gt = zl(29, L, null, m.mode);
        return gt.lanes = E, gt.return = m, gt;
      }
    };
  }
  var Ae = tr(!0), lr = tr(!1), Va = !1;
  function Qc(t) {
    t.updateQueue = {
      baseState: t.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Lc(t, l) {
    t = t.updateQueue, l.updateQueue === t && (l.updateQueue = {
      baseState: t.baseState,
      firstBaseUpdate: t.firstBaseUpdate,
      lastBaseUpdate: t.lastBaseUpdate,
      shared: t.shared,
      callbacks: null
    });
  }
  function Za(t) {
    return { lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Ka(t, l, a) {
    var e = t.updateQueue;
    if (e === null) return null;
    if (e = e.shared, (zt & 2) !== 0) {
      var u = e.pending;
      return u === null ? l.next = l : (l.next = u.next, u.next = l), e.pending = l, l = Kn(t), Ys(t, null, a), l;
    }
    return Zn(t, e, l, a), Kn(t);
  }
  function Fu(t, l, a) {
    if (l = l.updateQueue, l !== null && (l = l.shared, (a & 4194048) !== 0)) {
      var e = l.lanes;
      e &= t.pendingLanes, a |= e, l.lanes = a, Lo(t, a);
    }
  }
  function Vc(t, l) {
    var a = t.updateQueue, e = t.alternate;
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
        n === null ? u = n = l : n = n.next = l;
      } else u = n = l;
      a = {
        baseState: e.baseState,
        firstBaseUpdate: u,
        lastBaseUpdate: n,
        shared: e.shared,
        callbacks: e.callbacks
      }, t.updateQueue = a;
      return;
    }
    t = a.lastBaseUpdate, t === null ? a.firstBaseUpdate = l : t.next = l, a.lastBaseUpdate = l;
  }
  var Zc = !1;
  function Wu() {
    if (Zc) {
      var t = ke;
      if (t !== null) throw t;
    }
  }
  function Iu(t, l, a, e) {
    Zc = !1;
    var u = t.updateQueue;
    Va = !1;
    var n = u.firstBaseUpdate, i = u.lastBaseUpdate, c = u.shared.pending;
    if (c !== null) {
      u.shared.pending = null;
      var f = c, v = f.next;
      f.next = null, i === null ? n = v : i.next = v, i = f;
      var b = t.alternate;
      b !== null && (b = b.updateQueue, c = b.lastBaseUpdate, c !== i && (c === null ? b.firstBaseUpdate = v : c.next = v, b.lastBaseUpdate = f));
    }
    if (n !== null) {
      var z = u.baseState;
      i = 0, b = v = f = null, c = n;
      do {
        var r = c.lane & -536870913, y = r !== c.lane;
        if (y ? (yt & r) === r : (e & r) === r) {
          r !== 0 && r === ze && (Zc = !0), b !== null && (b = b.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          t: {
            var p = t, Y = c;
            r = l;
            var at = a;
            switch (Y.tag) {
              case 1:
                if (p = Y.payload, typeof p == "function") {
                  z = p.call(at, z, r);
                  break t;
                }
                z = p;
                break t;
              case 3:
                p.flags = p.flags & -65537 | 128;
              case 0:
                if (p = Y.payload, r = typeof p == "function" ? p.call(at, z, r) : p, r == null) break t;
                z = D({}, z, r);
                break t;
              case 2:
                Va = !0;
            }
          }
          r = c.callback, r !== null && (t.flags |= 64, y && (t.flags |= 8192), y = u.callbacks, y === null ? u.callbacks = [r] : y.push(r));
        } else
          y = {
            lane: r,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, b === null ? (v = b = y, f = z) : b = b.next = y, i |= r;
        if (c = c.next, c === null) {
          if (c = u.shared.pending, c === null)
            break;
          y = c, c = y.next, y.next = null, u.lastBaseUpdate = y, u.shared.pending = null;
        }
      } while (!0);
      b === null && (f = z), u.baseState = f, u.firstBaseUpdate = v, u.lastBaseUpdate = b, n === null && (u.shared.lanes = 0), ka |= i, t.lanes = i, t.memoizedState = z;
    }
  }
  function ar(t, l) {
    if (typeof t != "function")
      throw Error(d(191, t));
    t.call(l);
  }
  function er(t, l) {
    var a = t.callbacks;
    if (a !== null)
      for (t.callbacks = null, t = 0; t < a.length; t++)
        ar(a[t], l);
  }
  var wa = _(null), ui = _(0);
  function ur(t, l) {
    t = Ua, K(ui, t), K(wa, l), Ua = t | l.baseLanes;
  }
  function Kc() {
    K(ui, Ua), K(wa, wa.current);
  }
  function wc() {
    Ua = ui.current, U(wa), U(ui);
  }
  var fl = _(null), vl = null;
  function Ja(t) {
    var l = t.alternate;
    K(ol, ol.current & 1), K(fl, t), vl === null && (l === null || wa.current !== null || l.memoizedState !== null) && (vl = t);
  }
  function Jc(t) {
    K(ol, ol.current), K(fl, t), vl === null && (vl = t);
  }
  function nr(t) {
    t.tag === 22 ? (K(ol, ol.current), K(fl, t), vl === null && (vl = t)) : $a();
  }
  function $a() {
    K(ol, ol.current), K(fl, fl.current);
  }
  function xl(t) {
    U(fl), vl === t && (vl = null), U(ol);
  }
  var ol = _(0);
  function ku(t, l) {
    K(fl, fl.current), K(ol, l);
  }
  function $c(t) {
    U(ol), U(fl), vl === t && (vl = null);
  }
  function ni(t) {
    for (var l = t; l !== null; ) {
      if (l.tag === 13) {
        var a = l.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || bo(a) || So(a)))
          return l;
      } else if (l.tag === 19 && l.memoizedProps.revealOrder !== "independent") {
        if ((l.flags & 128) !== 0) return l;
      } else if (l.child !== null) {
        l.child.return = l, l = l.child;
        continue;
      }
      if (l === t) break;
      for (; l.sibling === null; ) {
        if (l.return === null || l.return === t) return null;
        l = l.return;
      }
      l.sibling.return = l.return, l = l.sibling;
    }
    return null;
  }
  var pa = 0, lt = null, Dt = null, Ft = null, ii = !1, lu = !1, pe = !1, ci = 0, Pu = 0, au = null, Mv = 0;
  function Vt() {
    throw Error(d(321));
  }
  function Fc(t, l) {
    if (l === null) return !1;
    for (var a = 0; a < l.length && a < t.length; a++)
      if (!jl(t[a], l[a])) return !1;
    return !0;
  }
  function Wc(t, l, a, e, u, n) {
    return pa = n, lt = l, l.memoizedState = null, l.updateQueue = null, l.lanes = 0, j.H = t === null || t.memoizedState === null ? Lr : Vr, pe = !1, n = a(e, u), pe = !1, lu && (n = cr(
      l,
      a,
      e,
      u
    )), ir(t), n;
  }
  function ir(t) {
    j.H = vi;
    var l = Dt !== null && Dt.next !== null;
    if (pa = 0, Ft = Dt = lt = null, ii = !1, Pu = 0, au = null, l) throw Error(d(300));
    t === null || Wt || (t = t.dependencies, t !== null && In(t) && (Wt = !0));
  }
  function cr(t, l, a, e) {
    lt = t;
    var u = 0;
    do {
      if (lu && (au = null), Pu = 0, lu = !1, 25 <= u) throw Error(d(301));
      if (u += 1, Ft = Dt = null, t.updateQueue != null) {
        var n = t.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      j.H = Bv, n = l(a, e);
    } while (lu);
    return n;
  }
  function Dv() {
    var t = j.H, l = t.useState()[0];
    return l = typeof l.then == "function" ? tn(l) : l, t = t.useState()[0], (Dt !== null ? Dt.memoizedState : null) !== t && (lt.flags |= 1024), l;
  }
  function Ic() {
    var t = ci !== 0;
    return ci = 0, t;
  }
  function kc(t, l, a) {
    l.updateQueue = t.updateQueue, l.flags &= -2053, t.lanes &= ~a;
  }
  function Pc(t) {
    if (ii) {
      for (t = t.memoizedState; t !== null; ) {
        var l = t.queue;
        l !== null && (l.pending = null), t = t.next;
      }
      ii = !1;
    }
    pa = 0, Ft = Dt = lt = null, lu = !1, Pu = ci = 0, au = null;
  }
  function gl() {
    var t = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Ft === null ? lt.memoizedState = Ft = t : Ft = Ft.next = t, Ft;
  }
  function Kt() {
    if (Dt === null) {
      var t = lt.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = Dt.next;
    var l = Ft === null ? lt.memoizedState : Ft.next;
    if (l !== null)
      Ft = l, Dt = t;
    else {
      if (t === null)
        throw lt.alternate === null ? Error(d(467)) : Error(d(310));
      Dt = t, t = {
        memoizedState: Dt.memoizedState,
        baseState: Dt.baseState,
        baseQueue: Dt.baseQueue,
        queue: Dt.queue,
        next: null
      }, Ft === null ? lt.memoizedState = Ft = t : Ft = Ft.next = t;
    }
    return Ft;
  }
  function fi() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function tn(t) {
    var l = Pu;
    return Pu += 1, au === null && (au = []), t = Is(au, t, l), l = lt, (Ft === null ? l.memoizedState : Ft.next) === null && (l = l.alternate, j.H = l === null || l.memoizedState === null ? Lr : Vr), t;
  }
  function oi(t) {
    if (t !== null && typeof t == "object") {
      if (typeof t.then == "function") return tn(t);
      if (t.$$typeof === O) return;
      if (t.$$typeof === Mt) return cl(t);
    }
    throw Error(d(438, String(t)));
  }
  function tf(t) {
    var l = null, a = lt.updateQueue;
    if (a !== null && (l = a.memoCache), l == null) {
      var e = lt.alternate;
      e !== null && (e = e.updateQueue, e !== null && (e = e.memoCache, e != null && (l = {
        data: e.data.map(function(u) {
          return u.slice();
        }),
        index: 0
      })));
    }
    if (l == null && (l = { data: [], index: 0 }), a === null && (a = fi(), lt.updateQueue = a), a.memoCache = l, a = l.data[l.index], a === void 0)
      for (a = l.data[l.index] = Array(t), e = 0; e < t; e++)
        a[e] = Tl;
    return l.index++, a;
  }
  function Ca(t, l) {
    return typeof l == "function" ? l(t) : l;
  }
  function si(t) {
    var l = Kt();
    return lf(l, Dt, t);
  }
  function lf(t, l, a) {
    var e = t.queue;
    if (e === null) throw Error(d(311));
    e.lastRenderedReducer = a;
    var u = t.baseQueue, n = e.pending;
    if (n !== null) {
      if (u !== null) {
        var i = u.next;
        u.next = n.next, n.next = i;
      }
      l.baseQueue = u = n, e.pending = null;
    }
    if (n = t.baseState, u === null) t.memoizedState = n;
    else {
      l = u.next;
      var c = i = null, f = null, v = l, b = !1;
      do {
        var z = v.lane & -536870913;
        if (z !== v.lane ? (yt & z) === z : (pa & z) === z) {
          var r = v.revertLane;
          if (r === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }), z === ze && (b = !0);
          else if ((pa & r) === r) {
            v = v.next, r === ze && (b = !0);
            continue;
          } else
            z = {
              lane: 0,
              revertLane: v.revertLane,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }, f === null ? (c = f = z, i = n) : f = f.next = z, lt.lanes |= r, ka |= r;
          z = v.action, pe && a(n, z), n = v.hasEagerState ? v.eagerState : a(n, z);
        } else
          r = {
            lane: z,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = r, i = n) : f = f.next = r, lt.lanes |= z, ka |= z;
        v = v.next;
      } while (v !== null && v !== l);
      if (f === null ? i = n : f.next = c, !jl(n, t.memoizedState) && (Wt = !0, b && (a = ke, a !== null)))
        throw a;
      t.memoizedState = n, t.baseState = i, t.baseQueue = f, e.lastRenderedState = n;
    }
    return u === null && (e.lanes = 0), [t.memoizedState, e.dispatch];
  }
  function af(t) {
    var l = Kt(), a = l.queue;
    if (a === null) throw Error(d(311));
    a.lastRenderedReducer = t;
    var e = a.dispatch, u = a.pending, n = l.memoizedState;
    if (u !== null) {
      a.pending = null;
      var i = u = u.next;
      do
        n = t(n, i.action), i = i.next;
      while (i !== u);
      jl(n, l.memoizedState) || (Wt = !0), l.memoizedState = n, l.baseQueue === null && (l.baseState = n), a.lastRenderedState = n;
    }
    return [n, e];
  }
  function fr(t, l, a) {
    var e = lt, u = Kt(), n = ot;
    if (n) {
      if (a === void 0) throw Error(d(407));
      a = a();
    } else a = l();
    var i = !jl(
      (Dt || u).memoizedState,
      a
    );
    if (i && (u.memoizedState = a, Wt = !0), u = u.queue, nf(rr.bind(null, e, u, t), [
      t
    ]), t = u.getSnapshot !== l || i || Ft !== null && (Ft.memoizedState.tag & 1) !== 0, eu(
      t ? 9 : 8,
      { destroy: void 0 },
      sr.bind(null, e, u, a, l),
      null
    ), t) {
      if (e.flags |= 2048, Ut === null) throw Error(d(349));
      n || (pa & 127) !== 0 || or(e, l, a);
    }
    return a;
  }
  function or(t, l, a) {
    t.flags |= 16384, t = { getSnapshot: l, value: a }, l = lt.updateQueue, l === null ? (l = fi(), lt.updateQueue = l, l.stores = [t]) : (a = l.stores, a === null ? l.stores = [t] : a.push(t));
  }
  function sr(t, l, a, e) {
    l.value = a, l.getSnapshot = e, dr(l) && mr(t);
  }
  function rr(t, l, a) {
    return a(function() {
      dr(l) && mr(t);
    });
  }
  function dr(t) {
    var l = t.getSnapshot;
    t = t.value;
    try {
      var a = l();
      return !jl(t, a);
    } catch {
      return !0;
    }
  }
  function mr(t) {
    var l = ye(t, 2);
    l !== null && Al(l, t, 2);
  }
  function ef(t) {
    var l = gl();
    if (typeof t == "function") {
      var a = t;
      if (t = a(), pe) {
        Ha(!0);
        try {
          a();
        } finally {
          Ha(!1);
        }
      }
    }
    return l.memoizedState = l.baseState = t, l.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Ca,
      lastRenderedState: t
    }, l;
  }
  function vr(t, l, a, e) {
    return t.baseState = a, lf(
      t,
      Dt,
      typeof e == "function" ? e : Ca
    );
  }
  function Uv(t, l, a, e, u) {
    if (mi(t)) throw Error(d(485));
    if (t = l.action, t !== null) {
      var n = {
        payload: u,
        action: t,
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
      j.T !== null ? a(!0) : n.isTransition = !1, e(n), a = l.pending, a === null ? (n.next = l.pending = n, hr(l, n)) : (n.next = a.next, l.pending = a.next = n);
    }
  }
  function hr(t, l) {
    var a = l.action, e = l.payload, u = t.state;
    if (l.isTransition) {
      var n = j.T, i = {};
      i.types = n !== null ? n.types : null, j.T = i;
      try {
        var c = a(u, e), f = j.S;
        f !== null && f(i, c), yr(t, l, c);
      } catch (v) {
        uf(t, l, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), j.T = n;
      }
    } else
      try {
        n = a(u, e), yr(t, l, n);
      } catch (v) {
        uf(t, l, v);
      }
  }
  function yr(t, l, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(e) {
        gr(t, l, e);
      },
      function(e) {
        return uf(t, l, e);
      }
    ) : gr(t, l, a);
  }
  function gr(t, l, a) {
    l.status = "fulfilled", l.value = a, br(l), t.state = a, l = t.pending, l !== null && (a = l.next, a === l ? t.pending = null : (a = a.next, l.next = a, hr(t, a)));
  }
  function uf(t, l, a) {
    var e = t.pending;
    if (t.pending = null, e !== null) {
      e = e.next;
      do
        l.status = "rejected", l.reason = a, br(l), l = l.next;
      while (l !== e);
    }
    t.action = null;
  }
  function br(t) {
    t = t.listeners;
    for (var l = 0; l < t.length; l++) (0, t[l])();
  }
  function Sr(t, l) {
    return l;
  }
  function Tr(t, l) {
    if (ot) {
      var a = Ut.formState;
      if (a !== null) {
        t: {
          var e = lt;
          if (ot) {
            if (xt) {
              l: {
                for (var u = xt, n = Kl; u.nodeType !== 8; ) {
                  if (!n) {
                    u = null;
                    break l;
                  }
                  if (u = Jl(
                    u.nextSibling
                  ), u === null) {
                    u = null;
                    break l;
                  }
                }
                n = u.data, u = n === "F!" || n === "F" ? u : null;
              }
              if (u) {
                xt = Jl(
                  u.nextSibling
                ), e = u.data === "F!";
                break t;
              }
            }
            Xa(e);
          }
          e = !1;
        }
        e && (l = a[0]);
      }
    }
    return a = gl(), a.memoizedState = a.baseState = l, e = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Sr,
      lastRenderedState: l
    }, a.queue = e, a = Gr.bind(
      null,
      lt,
      e
    ), e.dispatch = a, e = ef(!1), n = rf.bind(
      null,
      lt,
      !1,
      e.queue
    ), e = gl(), u = {
      state: l,
      dispatch: null,
      action: t,
      pending: null
    }, e.queue = u, a = Uv.bind(
      null,
      lt,
      u,
      n,
      a
    ), u.dispatch = a, e.memoizedState = t, [l, a, !1];
  }
  function Er(t) {
    var l = Kt();
    return zr(l, Dt, t);
  }
  function zr(t, l, a) {
    if (l = lf(
      t,
      l,
      Sr
    )[0], t = si(Ca)[0], typeof l == "object" && l !== null && typeof l.then == "function")
      try {
        var e = tn(l);
      } catch (i) {
        throw i === Pe ? ti : i;
      }
    else e = l;
    l = Kt();
    var u = l.queue, n = u.dispatch;
    return a !== l.memoizedState && (lt.flags |= 2048, eu(
      9,
      { destroy: void 0 },
      Rv.bind(null, u, a),
      null
    )), [e, n, t];
  }
  function Rv(t, l) {
    t.action = l;
  }
  function _r(t) {
    var l = Kt(), a = Dt;
    if (a !== null)
      return zr(l, a, t);
    Kt(), l = l.memoizedState, a = Kt();
    var e = a.queue.dispatch;
    return a.memoizedState = t, [l, e, !1];
  }
  function eu(t, l, a, e) {
    return t = { tag: t, create: a, deps: e, inst: l, next: null }, l = lt.updateQueue, l === null && (l = fi(), lt.updateQueue = l), a = l.lastEffect, a === null ? l.lastEffect = t.next = t : (e = a.next, a.next = t, t.next = e, l.lastEffect = t), t;
  }
  function Or() {
    return Kt().memoizedState;
  }
  function ri(t, l, a, e) {
    var u = gl();
    lt.flags |= t, u.memoizedState = eu(
      1 | l,
      { destroy: void 0 },
      a,
      e === void 0 ? null : e
    );
  }
  function di(t, l, a, e) {
    var u = Kt();
    e = e === void 0 ? null : e;
    var n = u.memoizedState.inst;
    Dt !== null && e !== null && Fc(e, Dt.memoizedState.deps) ? u.memoizedState = eu(l, n, a, e) : (lt.flags |= t, u.memoizedState = eu(
      1 | l,
      n,
      a,
      e
    ));
  }
  function Nr(t, l) {
    ri(8390656, 8, t, l);
  }
  function nf(t, l) {
    di(2048, 8, t, l);
  }
  function jv(t) {
    lt.flags |= 4;
    var l = lt.updateQueue;
    if (l === null)
      l = fi(), lt.updateQueue = l, l.events = [t];
    else {
      var a = l.events;
      a === null ? l.events = [t] : a.push(t);
    }
  }
  function Ar(t) {
    var l = Kt().memoizedState;
    return jv({ ref: l, nextImpl: t }), function() {
      if ((zt & 2) !== 0) throw Error(d(440));
      return l.impl.apply(void 0, arguments);
    };
  }
  function pr(t, l) {
    return di(4, 2, t, l);
  }
  function Cr(t, l) {
    return di(4, 4, t, l);
  }
  function Mr(t, l) {
    if (typeof l == "function") {
      t = t();
      var a = l(t);
      return function() {
        typeof a == "function" ? a() : l(null);
      };
    }
    if (l != null)
      return t = t(), l.current = t, function() {
        l.current = null;
      };
  }
  function Dr(t, l, a) {
    a = a != null ? a.concat([t]) : null, di(4, 4, Mr.bind(null, l, t), a);
  }
  function cf() {
  }
  function Ur(t, l) {
    var a = Kt();
    l = l === void 0 ? null : l;
    var e = a.memoizedState;
    return l !== null && Fc(l, e[1]) ? e[0] : (a.memoizedState = [t, l], t);
  }
  function Rr(t, l) {
    var a = Kt();
    l = l === void 0 ? null : l;
    var e = a.memoizedState;
    if (l !== null && Fc(l, e[1]))
      return e[0];
    if (e = t(), pe) {
      Ha(!0);
      try {
        t();
      } finally {
        Ha(!1);
      }
    }
    return a.memoizedState = [e, l], e;
  }
  function ff(t, l, a) {
    return a === void 0 || (pa & 1073741824) !== 0 && (yt & 261930) === 0 ? t.memoizedState = l : (t.memoizedState = a, t = Ld(), lt.lanes |= t, ka |= t, a);
  }
  function jr(t, l, a, e) {
    return jl(a, l) ? a : wa.current !== null ? (t = ff(t, a, e), jl(t, l) || (Wt = !0), t) : (pa & 106) === 0 || (pa & 1073741824) !== 0 && (yt & 261930) === 0 ? (Wt = !0, t.memoizedState = a) : (t = Ld(), lt.lanes |= t, ka |= t, l);
  }
  function xr(t, l, a, e, u) {
    var n = V.p;
    V.p = n !== 0 && 8 > n ? n : 8;
    var i = j.T, c = {};
    c.types = i !== null ? i.types : null, j.T = c, rf(t, !1, l, a);
    try {
      var f = u(), v = j.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var b = Cv(
          f,
          e
        );
        ln(
          t,
          l,
          b,
          Yl(t)
        );
      } else
        ln(
          t,
          l,
          e,
          Yl(t)
        );
    } catch (z) {
      ln(
        t,
        l,
        { then: function() {
        }, status: "rejected", reason: z },
        Yl()
      );
    } finally {
      V.p = n, i !== null && c.types !== null && (i.types = c.types), j.T = i;
    }
  }
  function xv() {
  }
  function of(t, l, a, e) {
    if (t.tag !== 5) throw Error(d(476));
    var u = Hr(t).queue;
    xr(
      t,
      u,
      l,
      tl,
      a === null ? xv : function() {
        return qr(t), a(e);
      }
    );
  }
  function Hr(t) {
    var l = t.memoizedState;
    if (l !== null) return l;
    l = {
      memoizedState: tl,
      baseState: tl,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Ca,
        lastRenderedState: tl
      },
      next: null
    };
    var a = {};
    return l.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Ca,
        lastRenderedState: a
      },
      next: null
    }, t.memoizedState = l, t = t.alternate, t !== null && (t.memoizedState = l), l;
  }
  function qr(t) {
    var l = Hr(t);
    l.next === null && (l = t.alternate.memoizedState), ln(
      t,
      l.next.queue,
      {},
      Yl()
    );
  }
  function sf() {
    return cl(zu);
  }
  function Br() {
    return Kt().memoizedState;
  }
  function Yr() {
    return Kt().memoizedState;
  }
  function Hv(t) {
    for (var l = t.return; l !== null; ) {
      switch (l.tag) {
        case 24:
        case 3:
          var a = Yl();
          t = Za(a);
          var e = Ka(l, t, a);
          e !== null && (Al(e, l, a), Fu(e, l, a)), l = { cache: Bc() }, t.payload = l;
          return;
      }
      l = l.return;
    }
  }
  function qv(t, l, a) {
    var e = Yl();
    a = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, mi(t) ? Xr(l, a) : (a = Cc(t, l, a, e), a !== null && (Al(a, t, e), Qr(a, l, e)));
  }
  function Gr(t, l, a) {
    var e = Yl();
    ln(t, l, a, e);
  }
  function ln(t, l, a, e) {
    var u = {
      lane: e,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (mi(t)) Xr(l, u);
    else {
      var n = t.alternate;
      if (t.lanes === 0 && (n === null || n.lanes === 0) && (n = l.lastRenderedReducer, n !== null))
        try {
          var i = l.lastRenderedState, c = n(i, a);
          if (u.hasEagerState = !0, u.eagerState = c, jl(c, i))
            return Zn(t, l, u, 0), Ut === null && Vn(), !1;
        } catch {
        }
      if (a = Cc(t, l, u, e), a !== null)
        return Al(a, t, e), Qr(a, l, e), !0;
    }
    return !1;
  }
  function rf(t, l, a, e) {
    if (e = {
      lane: 2,
      revertLane: lo(),
      gesture: null,
      action: e,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, mi(t)) {
      if (l) throw Error(d(479));
    } else
      l = Cc(
        t,
        a,
        e,
        2
      ), l !== null && Al(l, t, 2);
  }
  function mi(t) {
    var l = t.alternate;
    return t === lt || l !== null && l === lt;
  }
  function Xr(t, l) {
    lu = ii = !0;
    var a = t.pending;
    a === null ? l.next = l : (l.next = a.next, a.next = l), t.pending = l;
  }
  function Qr(t, l, a) {
    if ((a & 4194048) !== 0) {
      var e = l.lanes;
      e &= t.pendingLanes, a |= e, l.lanes = a, Lo(t, a);
    }
  }
  var vi = {
    readContext: cl,
    use: oi,
    useCallback: Vt,
    useContext: Vt,
    useEffect: Vt,
    useImperativeHandle: Vt,
    useLayoutEffect: Vt,
    useInsertionEffect: Vt,
    useMemo: Vt,
    useReducer: Vt,
    useRef: Vt,
    useState: Vt,
    useDebugValue: Vt,
    useDeferredValue: Vt,
    useTransition: Vt,
    useSyncExternalStore: Vt,
    useId: Vt,
    useHostTransitionStatus: Vt,
    useFormState: Vt,
    useActionState: Vt,
    useOptimistic: Vt,
    useMemoCache: Vt,
    useCacheRefresh: Vt,
    useEffectEvent: Vt
  }, Lr = {
    readContext: cl,
    use: oi,
    useCallback: function(t, l) {
      return gl().memoizedState = [
        t,
        l === void 0 ? null : l
      ], t;
    },
    useContext: cl,
    useEffect: Nr,
    useImperativeHandle: function(t, l, a) {
      a = a != null ? a.concat([t]) : null, ri(
        4194308,
        4,
        Mr.bind(null, l, t),
        a
      );
    },
    useLayoutEffect: function(t, l) {
      return ri(4194308, 4, t, l);
    },
    useInsertionEffect: function(t, l) {
      ri(4, 2, t, l);
    },
    useMemo: function(t, l) {
      var a = gl();
      l = l === void 0 ? null : l;
      var e = t();
      if (pe) {
        Ha(!0);
        try {
          t();
        } finally {
          Ha(!1);
        }
      }
      return a.memoizedState = [e, l], e;
    },
    useReducer: function(t, l, a) {
      var e = gl();
      if (a !== void 0) {
        var u = a(l);
        if (pe) {
          Ha(!0);
          try {
            a(l);
          } finally {
            Ha(!1);
          }
        }
      } else u = l;
      return e.memoizedState = e.baseState = u, t = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: t,
        lastRenderedState: u
      }, e.queue = t, t = t.dispatch = qv.bind(
        null,
        lt,
        t
      ), [e.memoizedState, t];
    },
    useRef: function(t) {
      var l = gl();
      return t = { current: t }, l.memoizedState = t;
    },
    useState: function(t) {
      t = ef(t);
      var l = t.queue, a = Gr.bind(null, lt, l);
      return l.dispatch = a, [t.memoizedState, a];
    },
    useDebugValue: cf,
    useDeferredValue: function(t, l) {
      var a = gl();
      return ff(a, t, l);
    },
    useTransition: function() {
      var t = ef(!1);
      return t = xr.bind(
        null,
        lt,
        t.queue,
        !0,
        !1
      ), gl().memoizedState = t, [!1, t];
    },
    useSyncExternalStore: function(t, l, a) {
      var e = lt, u = gl();
      if (ot) {
        if (a === void 0)
          throw Error(d(407));
        a = a();
      } else {
        if (a = l(), Ut === null)
          throw Error(d(349));
        (yt & 127) !== 0 || or(e, l, a);
      }
      u.memoizedState = a;
      var n = { value: a, getSnapshot: l };
      return u.queue = n, Nr(rr.bind(null, e, n, t), [
        t
      ]), e.flags |= 2048, eu(
        9,
        { destroy: void 0 },
        sr.bind(
          null,
          e,
          n,
          a,
          l
        ),
        null
      ), a;
    },
    useId: function() {
      var t = gl(), l = Ut.identifierPrefix;
      if (ot) {
        var a = ca, e = ia;
        a = (e & ~(1 << 32 - Ul(e) - 1)).toString(32) + a, l = "_" + l + "R_" + a, a = ci++, 0 < a && (l += "H" + a.toString(32)), l += "_";
      } else
        a = Mv++, l = "_" + l + "r_" + a.toString(32) + "_";
      return t.memoizedState = l;
    },
    useHostTransitionStatus: sf,
    useFormState: Tr,
    useActionState: Tr,
    useOptimistic: function(t) {
      var l = gl();
      l.memoizedState = l.baseState = t;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return l.queue = a, l = rf.bind(
        null,
        lt,
        !0,
        a
      ), a.dispatch = l, [t, l];
    },
    useMemoCache: tf,
    useCacheRefresh: function() {
      return gl().memoizedState = Hv.bind(
        null,
        lt
      );
    },
    useEffectEvent: function(t) {
      var l = gl(), a = { impl: t };
      return l.memoizedState = a, function() {
        if ((zt & 2) !== 0)
          throw Error(d(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, Vr = {
    readContext: cl,
    use: oi,
    useCallback: Ur,
    useContext: cl,
    useEffect: nf,
    useImperativeHandle: Dr,
    useInsertionEffect: pr,
    useLayoutEffect: Cr,
    useMemo: Rr,
    useReducer: si,
    useRef: Or,
    useState: function() {
      return si(Ca);
    },
    useDebugValue: cf,
    useDeferredValue: function(t, l) {
      var a = Kt();
      return jr(
        a,
        Dt.memoizedState,
        t,
        l
      );
    },
    useTransition: function() {
      var t = si(Ca)[0], l = Kt().memoizedState;
      return [
        typeof t == "boolean" ? t : tn(t),
        l
      ];
    },
    useSyncExternalStore: fr,
    useId: Br,
    useHostTransitionStatus: sf,
    useFormState: Er,
    useActionState: Er,
    useOptimistic: function(t, l) {
      var a = Kt();
      return vr(a, Dt, t, l);
    },
    useMemoCache: tf,
    useCacheRefresh: Yr,
    useEffectEvent: Ar
  }, Bv = {
    readContext: cl,
    use: oi,
    useCallback: Ur,
    useContext: cl,
    useEffect: nf,
    useImperativeHandle: Dr,
    useInsertionEffect: pr,
    useLayoutEffect: Cr,
    useMemo: Rr,
    useReducer: af,
    useRef: Or,
    useState: function() {
      return af(Ca);
    },
    useDebugValue: cf,
    useDeferredValue: function(t, l) {
      var a = Kt();
      return Dt === null ? ff(a, t, l) : jr(
        a,
        Dt.memoizedState,
        t,
        l
      );
    },
    useTransition: function() {
      var t = af(Ca)[0], l = Kt().memoizedState;
      return [
        typeof t == "boolean" ? t : tn(t),
        l
      ];
    },
    useSyncExternalStore: fr,
    useId: Br,
    useHostTransitionStatus: sf,
    useFormState: _r,
    useActionState: _r,
    useOptimistic: function(t, l) {
      var a = Kt();
      return Dt !== null ? vr(a, Dt, t, l) : (a.baseState = t, [t, a.queue.dispatch]);
    },
    useMemoCache: tf,
    useCacheRefresh: Yr,
    useEffectEvent: Ar
  };
  function df(t, l, a, e) {
    l = t.memoizedState, a = a(e, l), a = a == null ? l : D({}, l, a), t.memoizedState = a, t.lanes === 0 && (t.updateQueue.baseState = a);
  }
  var mf = {
    enqueueSetState: function(t, l, a) {
      t = t._reactInternals;
      var e = Yl(), u = Za(e);
      u.payload = l, a != null && (u.callback = a), l = Ka(t, u, e), l !== null && (Al(l, t, e), Fu(l, t, e));
    },
    enqueueReplaceState: function(t, l, a) {
      t = t._reactInternals;
      var e = Yl(), u = Za(e);
      u.tag = 1, u.payload = l, a != null && (u.callback = a), l = Ka(t, u, e), l !== null && (Al(l, t, e), Fu(l, t, e));
    },
    enqueueForceUpdate: function(t, l) {
      t = t._reactInternals;
      var a = Yl(), e = Za(a);
      e.tag = 2, l != null && (e.callback = l), l = Ka(t, e, a), l !== null && (Al(l, t, a), Fu(l, t, a));
    }
  };
  function Zr(t, l, a, e, u, n, i) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(e, n, i) : l.prototype && l.prototype.isPureReactComponent ? !Qu(a, e) || !Qu(u, n) : !0;
  }
  function Kr(t, l, a, e) {
    t = l.state, typeof l.componentWillReceiveProps == "function" && l.componentWillReceiveProps(a, e), typeof l.UNSAFE_componentWillReceiveProps == "function" && l.UNSAFE_componentWillReceiveProps(a, e), l.state !== t && mf.enqueueReplaceState(l, l.state, null);
  }
  function Ce(t, l) {
    var a = l;
    if ("ref" in l) {
      a = {};
      for (var e in l)
        e !== "ref" && (a[e] = l[e]);
    }
    if (t = t.defaultProps) {
      a === l && (a = D({}, a));
      for (var u in t)
        a[u] === void 0 && (a[u] = t[u]);
    }
    return a;
  }
  function wr(t) {
    Ln(t);
  }
  function Jr(t) {
    console.error(t);
  }
  function $r(t) {
    Ln(t);
  }
  function hi(t, l) {
    try {
      var a = t.onUncaughtError;
      a(l.value, { componentStack: l.stack });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function Fr(t, l, a) {
    try {
      var e = t.onCaughtError;
      e(a.value, {
        componentStack: a.stack,
        errorBoundary: l.tag === 1 ? l.stateNode : null
      });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function vf(t, l, a) {
    return a = Za(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      hi(t, l);
    }, a;
  }
  function Wr(t) {
    return t = Za(t), t.tag = 3, t;
  }
  function Ir(t, l, a, e) {
    var u = a.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var n = e.value;
      t.payload = function() {
        return u(n);
      }, t.callback = function() {
        Fr(l, a, e);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (t.callback = function() {
      Fr(l, a, e), typeof u != "function" && (Pa === null ? Pa = /* @__PURE__ */ new Set([this]) : Pa.add(this));
      var c = e.stack;
      this.componentDidCatch(e.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Yv(t, l, a, e, u) {
    if (a.flags |= 32768, e !== null && typeof e == "object" && typeof e.then == "function") {
      if (l = a.alternate, l !== null && Te(
        l,
        a,
        u,
        !0
      ), a = fl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return vl === null ? qi() : a.alternate === null && Zt === 0 && (Zt = 3), a.flags &= -257, a.flags |= 65536, a.lanes = u, e === li ? a.flags |= 16384 : (l = a.updateQueue, l === null ? a.updateQueue = /* @__PURE__ */ new Set([e]) : l.add(e), kf(t, e, u)), !1;
          case 22:
            return a.flags |= 65536, e === li ? a.flags |= 16384 : (l = a.updateQueue, l === null ? (l = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([e])
            }, a.updateQueue = l) : (a = l.retryQueue, a === null ? l.retryQueue = /* @__PURE__ */ new Set([e]) : a.add(e)), kf(t, e, u)), !1;
        }
        throw Error(d(435, a.tag));
      }
      return kf(t, e, u), qi(), !1;
    }
    if (ot)
      return l = fl.current, l !== null ? ((l.flags & 65536) === 0 && (l.flags |= 256), l.flags |= 65536, l.lanes = u, e !== jc && (t = Error(d(422), { cause: e }), Zu(Ll(t, a)))) : (e !== jc && (l = Error(d(423), {
        cause: e
      }), Zu(
        Ll(l, a)
      )), t = t.current.alternate, t.flags |= 65536, u &= -u, t.lanes |= u, e = Ll(e, a), u = vf(
        t.stateNode,
        e,
        u
      ), Vc(t, u), Zt !== 4 && (Zt = 2)), !1;
    var n = Error(d(520), { cause: e });
    if (n = Ll(n, a), sn === null ? sn = [n] : sn.push(n), Zt !== 4 && (Zt = 2), l === null) return !0;
    e = Ll(e, a), a = l;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, t = u & -u, a.lanes |= t, t = vf(a.stateNode, e, t), Vc(a, t), !1;
        case 1:
          if (l = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof l.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Pa === null || !Pa.has(n))))
            return a.flags |= 65536, u &= -u, a.lanes |= u, u = Wr(u), Ir(
              u,
              t,
              a,
              e
            ), Vc(a, u), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var hf = Error(d(461)), Wt = !1;
  function kt(t, l, a, e) {
    l.child = t === null ? lr(l, null, a, e) : Ae(
      l,
      t.child,
      a,
      e
    );
  }
  function kr(t, l, a, e, u) {
    a = a.render;
    var n = l.ref;
    if ("ref" in e) {
      var i = {};
      for (var c in e)
        c !== "ref" && (i[c] = e[c]);
    } else i = e;
    return Ee(l), e = Wc(
      t,
      l,
      a,
      i,
      n,
      u
    ), c = Ic(), t !== null && !Wt ? (kc(t, l, u), Ma(t, l, u)) : (ot && c && $n(l), l.flags |= 1, kt(t, l, e, u), l.child);
  }
  function Pr(t, l, a, e, u) {
    if (t === null) {
      var n = a.type;
      return typeof n == "function" && !Mc(n) && n.defaultProps === void 0 && a.compare === null ? (l.tag = 15, l.type = n, td(
        t,
        l,
        n,
        e,
        u
      )) : (t = wn(
        a.type,
        null,
        e,
        l,
        l.mode,
        u
      ), t.ref = l.ref, t.return = l, l.child = t);
    }
    if (n = t.child, !_f(t, u)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Qu, a(i, e) && t.ref === l.ref)
        return Ma(t, l, u);
    }
    return l.flags |= 1, t = _a(n, e), t.ref = l.ref, t.return = l, l.child = t;
  }
  function td(t, l, a, e, u) {
    if (t !== null) {
      var n = t.memoizedProps;
      if (Qu(n, e) && t.ref === l.ref)
        if (Wt = !1, l.pendingProps = e = n, _f(t, u))
          (t.flags & 131072) !== 0 && (Wt = !0);
        else
          return l.lanes = t.lanes, Ma(t, l, u);
    }
    return yf(
      t,
      l,
      a,
      e,
      u
    );
  }
  function ld(t, l, a, e) {
    var u = e.children, n = t !== null ? t.memoizedState : null;
    if (t === null && l.stateNode === null && (l.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), e.mode === "hidden") {
      if ((l.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, t !== null) {
          for (e = l.child = t.child, u = 0; e !== null; )
            u = u | e.lanes | e.childLanes, e = e.sibling;
          e = u & ~n;
        } else e = 0, l.child = null;
        return ad(
          t,
          l,
          n,
          a,
          e
        );
      }
      if ((a & 536870912) !== 0)
        l.memoizedState = { baseLanes: 0, cachePool: null }, t !== null && Pn(
          l,
          n !== null ? n.cachePool : null
        ), n !== null ? ur(l, n) : Kc(), nr(l);
      else
        return e = l.lanes = 536870912, ad(
          t,
          l,
          n !== null ? n.baseLanes | a : a,
          a,
          e
        );
    } else
      n !== null ? (Pn(l, n.cachePool), ur(l, n), $a(), l.memoizedState = null) : (t !== null && Pn(l, null), Kc(), $a());
    return kt(t, l, u, a), l.child;
  }
  function an(t, l) {
    return t !== null && t.tag === 22 || l.stateNode !== null || (l.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), l.sibling;
  }
  function ad(t, l, a, e, u) {
    var n = Gc();
    return n = n === null ? null : { parent: $t._currentValue, pool: n }, l.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, t !== null && Pn(l, null), Kc(), nr(l), t !== null && Te(t, l, e, !0), l.childLanes = u, null;
  }
  function yi(t, l) {
    return l = gi(
      { mode: l.mode, children: l.children },
      t.mode
    ), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function ed(t, l, a) {
    return Ae(l, t.child, null, a), t = yi(l, l.pendingProps), t.flags |= 2, xl(l), l.memoizedState = null, t;
  }
  function Gv(t, l, a) {
    var e = l.pendingProps, u = (l.flags & 128) !== 0;
    if (l.flags &= -129, t === null) {
      if (ot) {
        if (e.mode === "hidden")
          return t = yi(l, e), l.lanes = 536870912, t.memoizedState = { baseLanes: 0, cachePool: null }, an(null, t);
        if (Jc(l), (t = xt) ? (t = Mm(
          t,
          Kl
        ), t = t !== null && t.data === "&" ? t : null, t !== null && (l.memoizedState = {
          dehydrated: t,
          treeContext: Ya !== null ? { id: ia, overflow: ca } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Xs(t), a.return = l, l.child = a, al = l, xt = null)) : t = null, t === null) throw Xa(l);
        return l.lanes = 536870912, null;
      }
      return yi(l, e);
    }
    var n = t.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Jc(l), u)
        if (l.flags & 256)
          l.flags &= -257, l = ed(
            t,
            l,
            a
          );
        else if (l.memoizedState !== null)
          l.child = t.child, l.flags |= 128, l = null;
        else throw Error(d(558));
      else if (Wt || Te(t, l, a, !1), u = (a & t.childLanes) !== 0, Wt || u) {
        if (wa.current === null) {
          if (e = Ut, e !== null && (i = Vo(e, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, ye(t, i), Al(e, t, i), hf;
          qi();
        }
        l = ed(
          t,
          l,
          a
        );
      } else
        t = n.treeContext, xt = Jl(i.nextSibling), al = l, ot = !0, Ga = null, Kl = !1, t !== null && Vs(l, t), l = yi(l, e), l.flags |= 134221824;
      return l;
    }
    return t = _a(t.child, {
      mode: e.mode,
      children: e.children
    }), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function uu(t, l) {
    var a = l.ref;
    if (a === null)
      t !== null && t.ref !== null && (l.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(d(284));
      (t === null || t.ref !== a) && (l.flags |= 4194816);
    }
  }
  function yf(t, l, a, e, u) {
    return Ee(l), a = Wc(
      t,
      l,
      a,
      e,
      void 0,
      u
    ), e = Ic(), t !== null && !Wt ? (kc(t, l, u), Ma(t, l, u)) : (ot && e && $n(l), l.flags |= 1, kt(t, l, a, u), l.child);
  }
  function ud(t, l, a, e, u, n) {
    return Ee(l), l.updateQueue = null, a = cr(
      l,
      e,
      a,
      u
    ), ir(t), e = Ic(), t !== null && !Wt ? (kc(t, l, n), Ma(t, l, n)) : (ot && e && $n(l), l.flags |= 1, kt(t, l, a, n), l.child);
  }
  function nd(t, l, a, e, u) {
    if (Ee(l), l.stateNode === null) {
      var n = $e, i = a.contextType;
      typeof i == "object" && i !== null && (n = cl(i)), n = new a(e, n), l.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = mf, l.stateNode = n, n._reactInternals = l, n = l.stateNode, n.props = e, n.state = l.memoizedState, n.refs = {}, Qc(l), i = a.contextType, n.context = typeof i == "object" && i !== null ? cl(i) : $e, n.state = l.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (df(
        l,
        a,
        i,
        e
      ), n.state = l.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && mf.enqueueReplaceState(n, n.state, null), Iu(l, e, n, u), Wu(), n.state = l.memoizedState), typeof n.componentDidMount == "function" && (l.flags |= 4194308), e = !0;
    } else if (t === null) {
      n = l.stateNode;
      var c = l.memoizedProps, f = Ce(a, c);
      n.props = f;
      var v = n.context, b = a.contextType;
      i = $e, typeof b == "object" && b !== null && (i = cl(b));
      var z = a.getDerivedStateFromProps;
      b = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = l.pendingProps !== c, b || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || v !== i) && Kr(
        l,
        n,
        e,
        i
      ), Va = !1;
      var r = l.memoizedState;
      n.state = r, Iu(l, e, n, u), Wu(), v = l.memoizedState, c || r !== v || Va ? (typeof z == "function" && (df(
        l,
        a,
        z,
        e
      ), v = l.memoizedState), (f = Va || Zr(
        l,
        a,
        f,
        e,
        r,
        v,
        i
      )) ? (b || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (l.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (l.flags |= 4194308), l.memoizedProps = e, l.memoizedState = v), n.props = e, n.state = v, n.context = i, e = f) : (typeof n.componentDidMount == "function" && (l.flags |= 4194308), e = !1);
    } else {
      n = l.stateNode, Lc(t, l), i = l.memoizedProps, b = Ce(a, i), n.props = b, z = l.pendingProps, r = n.context, v = a.contextType, f = $e, typeof v == "object" && v !== null && (f = cl(v)), c = a.getDerivedStateFromProps, (v = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || r !== f) && Kr(
        l,
        n,
        e,
        f
      ), Va = !1, r = l.memoizedState, n.state = r, Iu(l, e, n, u), Wu();
      var y = l.memoizedState;
      i !== z || r !== y || Va || t !== null && t.dependencies !== null && In(t.dependencies) ? (typeof c == "function" && (df(
        l,
        a,
        c,
        e
      ), y = l.memoizedState), (b = Va || Zr(
        l,
        a,
        b,
        e,
        r,
        y,
        f
      ) || t !== null && t.dependencies !== null && In(t.dependencies)) ? (v || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(e, y, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        e,
        y,
        f
      )), typeof n.componentDidUpdate == "function" && (l.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (l.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === t.memoizedProps && r === t.memoizedState || (l.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === t.memoizedProps && r === t.memoizedState || (l.flags |= 1024), l.memoizedProps = e, l.memoizedState = y), n.props = e, n.state = y, n.context = f, e = b) : (typeof n.componentDidUpdate != "function" || i === t.memoizedProps && r === t.memoizedState || (l.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === t.memoizedProps && r === t.memoizedState || (l.flags |= 1024), e = !1);
    }
    return n = e, uu(t, l), e = (l.flags & 128) !== 0, n || e ? (n = l.stateNode, a = e && typeof a.getDerivedStateFromError != "function" ? null : n.render(), l.flags |= 1, t !== null && e ? (l.child = Ae(
      l,
      t.child,
      null,
      u
    ), l.child = Ae(
      l,
      null,
      a,
      u
    )) : kt(t, l, a, u), l.memoizedState = n.state, t = l.child) : t = Ma(
      t,
      l,
      u
    ), t;
  }
  function id(t, l, a, e) {
    return be(), l.flags |= 256, kt(t, l, a, e), l.child;
  }
  var gf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function bf(t) {
    return { baseLanes: t, cachePool: Fs() };
  }
  function Sf(t, l, a) {
    return t = t !== null ? t.childLanes & ~a : 0, l && (t |= Bl), t;
  }
  function cd(t, l, a) {
    var e = l.pendingProps, u = !1, n = (l.flags & 128) !== 0, i;
    if ((i = n) || (i = t !== null && t.memoizedState === null ? !1 : (ol.current & 2) !== 0), i && (u = !0, l.flags &= -129), i = (l.flags & 32) !== 0, l.flags &= -33, t === null) {
      if (ot) {
        if (u ? Ja(l) : $a(), (t = xt) ? (t = Mm(
          t,
          Kl
        ), t = t !== null && t.data !== "&" ? t : null, t !== null && (l.memoizedState = {
          dehydrated: t,
          treeContext: Ya !== null ? { id: ia, overflow: ca } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Xs(t), a.return = l, l.child = a, al = l, xt = null)) : t = null, t === null) throw Xa(l);
        return So(t) ? l.lanes = 32 : l.lanes = 536870912, null;
      }
      return n = e.children, e = e.fallback, u ? ($a(), u = l.mode, n = gi(
        { mode: "hidden", children: n },
        u
      ), e = ge(
        e,
        u,
        a,
        null
      ), n.return = l, e.return = l, n.sibling = e, l.child = n, e = l.child, e.memoizedState = bf(a), e.childLanes = Sf(
        t,
        i,
        a
      ), l.memoizedState = gf, an(null, e)) : (Ja(l), Tf(l, n));
    }
    var c = t.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return Xv(
          t,
          l,
          n,
          i,
          e,
          f,
          c,
          a
        );
    }
    return u ? ($a(), u = e.fallback, n = l.mode, c = t.child, f = c.sibling, e = _a(c, {
      mode: "hidden",
      children: e.children
    }), e.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? u = _a(f, u) : (u = ge(
      u,
      n,
      a,
      null
    ), u.flags |= 2), u.return = l, e.return = l, e.sibling = u, l.child = e, an(null, e), e = l.child, u = t.child.memoizedState, u === null ? u = bf(a) : (n = u.cachePool, n !== null ? (c = $t._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Fs(), u = {
      baseLanes: u.baseLanes | a,
      cachePool: n
    }), e.memoizedState = u, e.childLanes = Sf(
      t,
      i,
      a
    ), l.memoizedState = gf, an(t.child, e)) : (Ja(l), a = t.child, t = a.sibling, a = _a(a, {
      mode: "visible",
      children: e.children
    }), a.return = l, a.sibling = null, t !== null && (i = l.deletions, i === null ? (l.deletions = [t], l.flags |= 16) : i.push(t)), l.child = a, l.memoizedState = null, a);
  }
  function Tf(t, l) {
    return l = gi(
      { mode: "visible", children: l },
      t.mode
    ), l.return = t, t.child = l;
  }
  function gi(t, l) {
    return t = zl(22, t, null, l), t.lanes = 0, t;
  }
  function bi(t, l, a) {
    return Ae(l, t.child, null, a), t = Tf(
      l,
      l.pendingProps.children
    ), t.flags |= 2, l.memoizedState = null, t;
  }
  function Xv(t, l, a, e, u, n, i, c) {
    if (a)
      return l.flags & 256 ? (Ja(l), l.flags &= -257, bi(
        t,
        l,
        c
      )) : l.memoizedState !== null ? ($a(), l.child = t.child, l.flags |= 128, null) : ($a(), n = u.fallback, i = l.mode, u = gi(
        { mode: "visible", children: u.children },
        i
      ), n = ge(
        n,
        i,
        c,
        null
      ), n.flags |= 2, u.return = l, n.return = l, u.sibling = n, l.child = u, Ae(l, t.child, null, c), u = l.child, u.memoizedState = bf(c), u.childLanes = Sf(
        t,
        e,
        c
      ), l.memoizedState = gf, an(null, u));
    if (Ja(l), So(n)) {
      if (e = n.nextSibling && n.nextSibling.dataset, e) var f = e.dgst;
      return e = f, e !== "" && (u = Error(d(419)), u.stack = "", u.digest = e, Zu({ value: u, source: null, stack: null })), bi(
        t,
        l,
        c
      );
    }
    if (Wt || Te(t, l, c, !1), e = (c & t.childLanes) !== 0, Wt || e) {
      if (wa.current !== null)
        return bi(
          t,
          l,
          c
        );
      if (e = Ut, e !== null && (u = Vo(
        e,
        c
      ), u !== 0 && u !== i.retryLane))
        throw i.retryLane = u, ye(t, u), Al(e, t, u), hf;
      return bo(n) || qi(), bi(
        t,
        l,
        c
      );
    }
    return bo(n) ? (l.flags |= 192, l.child = t.child, null) : (t = i.treeContext, xt = Jl(n.nextSibling), al = l, ot = !0, Ga = null, Kl = !1, t !== null && Vs(l, t), l = Tf(
      l,
      u.children
    ), l.flags |= 134221824, l);
  }
  function fd(t, l, a) {
    t.lanes |= l;
    var e = t.alternate;
    e !== null && (e.lanes |= l), Wn(t.return, l, a);
  }
  function od(t) {
    for (var l = null; t !== null; ) {
      var a = t.alternate;
      a !== null && ni(a) === null && (l = t), t = t.sibling;
    }
    return l;
  }
  function Si(t, l, a, e, u, n) {
    var i = t.memoizedState;
    i === null ? t.memoizedState = {
      isBackwards: l,
      rendering: null,
      renderingStartTime: 0,
      last: e,
      tail: a,
      tailMode: u,
      treeForkCount: n
    } : (i.isBackwards = l, i.rendering = null, i.renderingStartTime = 0, i.last = e, i.tail = a, i.tailMode = u, i.treeForkCount = n);
  }
  function Ef(t) {
    var l = t.child;
    for (t.child = null; l !== null; ) {
      var a = l.sibling;
      l.sibling = t.child, t.child = l, l = a;
    }
  }
  function zf(t, l, a) {
    var e = l.pendingProps, u = e.revealOrder, n = e.tail;
    e = e.children;
    var i = ol.current;
    if (l.flags & 128)
      return ku(l, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, l.flags |= 128) : i &= 1, ku(l, i), u === "backwards" && t !== null ? (Ef(t), kt(t, l, e, a), Ef(t)) : kt(t, l, e, a), e = ot ? Vu : 0, !c && t !== null && (t.flags & 128) !== 0)
      t: for (t = l.child; t !== null; ) {
        if (t.tag === 13)
          t.memoizedState !== null && fd(t, a, l);
        else if (t.tag === 19)
          fd(t, a, l);
        else if (t.child !== null) {
          t.child.return = t, t = t.child;
          continue;
        }
        if (t === l) break t;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l)
            break t;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    switch (u) {
      case "backwards":
        a = od(l.child), a === null ? (u = l.child, l.child = null) : (u = a.sibling, a.sibling = null, Ef(l)), Si(
          l,
          !0,
          u,
          null,
          n,
          e
        );
        break;
      case "unstable_legacy-backwards":
        for (a = null, u = l.child, l.child = null; u !== null; ) {
          if (t = u.alternate, t !== null && ni(t) === null) {
            l.child = u;
            break;
          }
          t = u.sibling, u.sibling = a, a = u, u = t;
        }
        Si(
          l,
          !0,
          a,
          null,
          n,
          e
        );
        break;
      case "together":
        Si(
          l,
          !1,
          null,
          null,
          void 0,
          e
        );
        break;
      case "independent":
        l.memoizedState = null;
        break;
      default:
        a = od(l.child), a === null ? (u = l.child, l.child = null) : (u = a.sibling, a.sibling = null), Si(
          l,
          !1,
          u,
          a,
          n,
          e
        );
    }
    return l.child;
  }
  function sd(t, l, a) {
    var e = l.pendingProps;
    return Qa(l, l.type, e.value), kt(t, l, e.children, a), l.child;
  }
  function Ma(t, l, a) {
    if (t !== null && (l.dependencies = t.dependencies), ka |= l.lanes, (a & l.childLanes) === 0)
      if (t !== null) {
        if (Te(
          t,
          l,
          a,
          !1
        ), (a & l.childLanes) === 0)
          return null;
      } else return null;
    if (t !== null && l.child !== t.child)
      throw Error(d(153));
    if (l.child !== null) {
      for (t = l.child, a = _a(t, t.pendingProps), l.child = a, a.return = l; t.sibling !== null; )
        t = t.sibling, a = a.sibling = _a(t, t.pendingProps), a.return = l;
      a.sibling = null;
    }
    return l.child;
  }
  function _f(t, l) {
    return (t.lanes & l) !== 0 ? !0 : (t = t.dependencies, !!(t !== null && In(t)));
  }
  function Qv(t, l, a) {
    switch (l.tag) {
      case 3:
        hl(l, l.stateNode.containerInfo), Qa(l, $t, t.memoizedState.cache), be();
        break;
      case 27:
      case 5:
        ja(l);
        break;
      case 4:
        hl(l, l.stateNode.containerInfo);
        break;
      case 10:
        Qa(
          l,
          l.type,
          l.memoizedProps.value
        );
        break;
      case 31:
        if (l.memoizedState !== null)
          return l.flags |= 128, Jc(l), null;
        break;
      case 13:
        var e = l.memoizedState;
        if (e !== null) {
          if (e.dehydrated !== null)
            return Ja(l), l.flags |= 128, null;
          e = Te(
            t,
            l,
            a,
            !1
          );
          var u = l.child.childLanes;
          return e || (a & u) !== 0 ? cd(t, l, a) : (Ja(l), t = Ma(
            t,
            l,
            a
          ), t !== null ? t.sibling : null);
        }
        Ja(l);
        break;
      case 19:
        if (l.flags & 128)
          return zf(
            t,
            l,
            a
          );
        if (u = (t.flags & 128) !== 0, e = (a & l.childLanes) !== 0, e || (Te(
          t,
          l,
          a,
          !1
        ), e = (a & l.childLanes) !== 0), u) {
          if (e)
            return zf(
              t,
              l,
              a
            );
          l.flags |= 128;
        }
        if (u = l.memoizedState, u !== null && (u.rendering = null, u.tail = null, u.lastEffect = null), ku(l, ol.current), e) break;
        return null;
      case 22:
        return l.lanes = 0, ld(
          t,
          l,
          a,
          l.pendingProps
        );
      case 24:
        Qa(l, $t, t.memoizedState.cache);
    }
    return Ma(t, l, a);
  }
  function rd(t, l, a) {
    if (t !== null)
      if (t.memoizedProps !== l.pendingProps)
        Wt = !0;
      else {
        if (!_f(t, a) && (l.flags & 128) === 0)
          return Wt = !1, Qv(
            t,
            l,
            a
          );
        Wt = (t.flags & 131072) !== 0;
      }
    else
      Wt = !1, ot && (l.flags & 1048576) !== 0 && Ls(l, Vu, l.index);
    switch (l.lanes = 0, l.tag) {
      case 16:
        t: {
          var e = l.pendingProps;
          if (t = Oe(l.elementType), l.type = t, typeof t == "function")
            Mc(t) ? (e = Ce(t, e), l.tag = 1, l = nd(
              null,
              l,
              t,
              e,
              a
            )) : (l.tag = 0, l = yf(
              null,
              l,
              t,
              e,
              a
            ));
          else {
            if (t != null) {
              var u = t.$$typeof;
              if (u === M) {
                l.tag = 11, l = kr(
                  null,
                  l,
                  t,
                  e,
                  a
                );
                break t;
              } else if (u === ct) {
                l.tag = 14, l = Pr(
                  null,
                  l,
                  t,
                  e,
                  a
                );
                break t;
              } else if (u === Mt) {
                l.tag = 10, l.type = t, l = sd(
                  null,
                  l,
                  a
                );
                break t;
              }
            }
            throw l = rt(t) || t, Error(d(306, l, ""));
          }
        }
        return l;
      case 0:
        return yf(
          t,
          l,
          l.type,
          l.pendingProps,
          a
        );
      case 1:
        return e = l.type, u = Ce(
          e,
          l.pendingProps
        ), nd(
          t,
          l,
          e,
          u,
          a
        );
      case 3:
        t: {
          if (hl(
            l,
            l.stateNode.containerInfo
          ), t === null) throw Error(d(387));
          e = l.pendingProps;
          var n = l.memoizedState;
          u = n.element, Lc(t, l), Iu(l, e, null, a);
          var i = l.memoizedState;
          if (e = i.cache, Qa(l, $t, e), e !== n.cache && qc(
            l,
            [$t],
            a,
            !0
          ), Wu(), e = i.element, n.isDehydrated)
            if (n = {
              element: e,
              isDehydrated: !1,
              cache: i.cache
            }, l.updateQueue.baseState = n, l.memoizedState = n, l.flags & 256) {
              l = id(
                t,
                l,
                e,
                a
              );
              break t;
            } else if (e !== u) {
              u = Ll(
                Error(d(424)),
                l
              ), Zu(u), l = id(
                t,
                l,
                e,
                a
              );
              break t;
            } else
              for (t = l.stateNode.containerInfo, t.nodeType === 9 ? t = t.body : t = t.nodeName === "HTML" ? t.ownerDocument.body : t, xt = Jl(t.firstChild), al = l, ot = !0, Ga = null, Kl = !0, a = lr(
                l,
                null,
                e,
                a
              ), l.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (be(), e === u) {
              l = Ma(
                t,
                l,
                a
              );
              break t;
            }
            kt(t, l, e, a);
          }
          l = l.child;
        }
        return l;
      case 26:
        return uu(t, l), t === null ? (a = qm(
          l.type,
          null,
          l.pendingProps,
          null
        )) ? l.memoizedState = a : ot || (l.stateNode = hm(
          l.type,
          l.pendingProps,
          Cl.current,
          l
        )) : l.memoizedState = qm(
          l.type,
          t.memoizedProps,
          l.pendingProps,
          t.memoizedState
        ), null;
      case 27:
        return ja(l), t === null && ot && (e = l.stateNode = Rm(
          l.type,
          l.pendingProps,
          Cl.current
        ), al = l, Kl = !0, u = xt, ae(l.type) ? (To = u, xt = Jl(e.firstChild)) : xt = u), kt(
          t,
          l,
          l.pendingProps.children,
          a
        ), uu(t, l), t === null && (l.flags |= 4194304), l.child;
      case 5:
        return t === null && ot && ((u = e = xt) && (e = Hh(
          e,
          l.type,
          l.pendingProps,
          Kl
        ), e !== null ? (l.stateNode = e, al = l, xt = Jl(e.firstChild), Kl = !1, u = !0) : u = !1), u || Xa(l)), ja(l), u = l.type, n = l.pendingProps, i = t !== null ? t.memoizedProps : null, e = n.children, so(u, n) ? e = null : i !== null && so(u, i) && (l.flags |= 32), l.memoizedState !== null && (u = Wc(
          t,
          l,
          Dv,
          null,
          null,
          a
        ), zu._currentValue = u), uu(t, l), kt(t, l, e, a), l.child;
      case 6:
        return t === null && ot && ((t = a = xt) && (a = qh(
          a,
          l.pendingProps,
          Kl
        ), a !== null ? (l.stateNode = a, al = l, xt = null, t = !0) : t = !1), t || Xa(l)), null;
      case 13:
        return cd(t, l, a);
      case 4:
        return hl(
          l,
          l.stateNode.containerInfo
        ), e = l.pendingProps, t === null ? l.child = Ae(
          l,
          null,
          e,
          a
        ) : kt(t, l, e, a), l.child;
      case 11:
        return kr(
          t,
          l,
          l.type,
          l.pendingProps,
          a
        );
      case 7:
        return e = l.pendingProps, uu(t, l), kt(t, l, e, a), l.child;
      case 8:
        return kt(
          t,
          l,
          l.pendingProps.children,
          a
        ), l.child;
      case 12:
        return kt(
          t,
          l,
          l.pendingProps.children,
          a
        ), l.child;
      case 10:
        return sd(t, l, a);
      case 9:
        return u = l.type._context, e = l.pendingProps.children, Ee(l), u = cl(u), e = e(u), l.flags |= 1, kt(t, l, e, a), l.child;
      case 14:
        return Pr(
          t,
          l,
          l.type,
          l.pendingProps,
          a
        );
      case 15:
        return td(
          t,
          l,
          l.type,
          l.pendingProps,
          a
        );
      case 19:
        return zf(t, l, a);
      case 31:
        return Gv(t, l, a);
      case 22:
        return ld(
          t,
          l,
          a,
          l.pendingProps
        );
      case 24:
        return Ee(l), e = cl($t), t === null ? (u = Gc(), u === null && (u = Ut, n = Bc(), u.pooledCache = n, n.refCount++, n !== null && (u.pooledCacheLanes |= a), u = n), l.memoizedState = { parent: e, cache: u }, Qc(l), Qa(l, $t, u)) : ((t.lanes & a) !== 0 && (Lc(t, l), Iu(l, null, null, a), Wu()), u = t.memoizedState, n = l.memoizedState, u.parent !== e ? (u = { parent: e, cache: e }, l.memoizedState = u, l.lanes === 0 && (l.memoizedState = l.updateQueue.baseState = u), Qa(l, $t, e)) : (e = n.cache, Qa(l, $t, e), e !== u.cache && qc(
          l,
          [$t],
          a,
          !0
        ))), kt(
          t,
          l,
          l.pendingProps.children,
          a
        ), l.child;
      case 30:
        return l.stateNode === null && (l.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), e = l.pendingProps, e.name != null && e.name !== "auto" ? l.flags |= t === null ? 18882560 : 18874368 : ot && $n(l), t !== null && t.memoizedProps.name !== e.name ? l.flags |= 4194816 : uu(t, l), kt(t, l, e.children, a), l.child;
      case 29:
        throw l.pendingProps;
    }
    throw Error(d(156, l.tag));
  }
  function Da(t) {
    t.flags |= 4;
  }
  function Of(t, l, a, e, u) {
    var n;
    if ((n = (t.mode & 32) !== 0) && (n = a === null ? Xm(l, e) : Xm(l, e) && (e.src !== a.src || e.srcSet !== a.srcSet)), n) {
      if (t.flags |= 16777216, (u & 335544128) === u)
        if (t.stateNode.complete) t.flags |= 8192;
        else if (wd()) t.flags |= 8192;
        else
          throw Ne = li, Xc;
    } else t.flags &= -16777217;
  }
  function dd(t, l) {
    if (l.type !== "stylesheet" || (l.state.loading & 4) !== 0)
      t.flags &= -16777217;
    else if (t.flags |= 16777216, !Qm(l))
      if (wd()) t.flags |= 8192;
      else
        throw Ne = li, Xc;
  }
  function Ti(t, l) {
    l !== null && (t.flags |= 4), t.flags & 16384 && (l = t.tag !== 22 ? Xo() : 536870912, t.lanes |= l, ou |= l);
  }
  function en(t, l) {
    if (!ot)
      switch (t.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var a = t.tail, e = null; a !== null; )
            a.alternate !== null && (e = a), a = a.sibling;
          e === null ? l || t.tail === null ? t.tail = null : t.tail.sibling = null : e.sibling = null;
          break;
        default:
          for (l = t.tail, a = null; l !== null; )
            l.alternate !== null && (a = l), l = l.sibling;
          a === null ? t.tail = null : a.sibling = null;
      }
  }
  function Ht(t) {
    var l = t.alternate !== null && t.alternate.child === t.child, a = 0, e = 0;
    if (l)
      for (var u = t.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags & 1206910976, e |= u.flags & 1206910976, u.return = t, u = u.sibling;
    else
      for (u = t.child; u !== null; )
        a |= u.lanes | u.childLanes, e |= u.subtreeFlags, e |= u.flags, u.return = t, u = u.sibling;
    return t.subtreeFlags |= e, t.childLanes = a, l;
  }
  function Lv(t, l, a) {
    var e = l.pendingProps;
    switch (Rc(l), l.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Ht(l), null;
      case 1:
        return Ht(l), null;
      case 3:
        return a = l.stateNode, e = null, t !== null && (e = t.memoizedState.cache), l.memoizedState.cache !== e && (l.flags |= 2048), Aa($t), ga(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (t === null || t.child === null) && (Ie(l) ? Da(l) : t === null || t.memoizedState.isDehydrated && (l.flags & 256) === 0 || (l.flags |= 1024, xc())), Ht(l), null;
      case 26:
        var u = l.type, n = l.memoizedState;
        return t === null ? (Da(l), n !== null ? (Ht(l), dd(l, n)) : (Ht(l), Of(
          l,
          u,
          null,
          e,
          a
        ))) : n ? n !== t.memoizedState ? (Da(l), Ht(l), dd(l, n)) : (Ht(l), l.flags &= -16777217) : (t = t.memoizedProps, t !== e && Da(l), Ht(l), Of(
          l,
          u,
          t,
          e,
          a
        )), null;
      case 27:
        if (fe(l), a = Cl.current, u = l.type, t !== null && l.stateNode != null)
          t.memoizedProps !== e && Da(l);
        else {
          if (!e) {
            if (l.stateNode === null)
              throw Error(d(166));
            return Ht(l), l.subtreeFlags &= -33554433, null;
          }
          t = dt.current, Ie(l) ? Zs(l) : (t = Rm(u, e, a), l.stateNode = t, Da(l));
        }
        return Ht(l), l.subtreeFlags &= -33554433, null;
      case 5:
        if (fe(l), u = l.type, t !== null && l.stateNode != null)
          t.memoizedProps !== e && Da(l);
        else {
          if (!e) {
            if (l.stateNode === null)
              throw Error(d(166));
            return Ht(l), l.subtreeFlags &= -33554433, null;
          }
          if (n = dt.current, Ie(l))
            Zs(l);
          else {
            var i = hn(
              Cl.current
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
            n[il] = l, n[El] = e;
            t: for (i = l.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                n.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === l) break t;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === l)
                  break t;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            l.stateNode = n;
            t: switch (rl(n, u, e), u) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                e = !!e.autoFocus;
                break t;
              case "img":
                e = !0;
                break t;
              default:
                e = !1;
            }
            e && Da(l);
          }
        }
        return Ht(l), l.subtreeFlags &= -33554433, Of(
          l,
          l.type,
          t === null ? null : t.memoizedProps,
          l.pendingProps,
          a
        ), null;
      case 6:
        if (t && l.stateNode != null)
          t.memoizedProps !== e && Da(l);
        else {
          if (typeof e != "string" && l.stateNode === null)
            throw Error(d(166));
          if (t = Cl.current, Ie(l)) {
            if (t = l.stateNode, a = l.memoizedProps, e = null, u = al, u !== null)
              switch (u.tag) {
                case 27:
                case 5:
                  e = u.memoizedProps;
              }
            t[il] = l, t = !!(t.nodeValue === a || e !== null && e.suppressHydrationWarning === !0 || rm(t.nodeValue, a)), t || Xa(l, !0);
          } else
            t = hn(t).createTextNode(
              e
            ), t[il] = l, l.stateNode = t;
        }
        return Ht(l), null;
      case 31:
        if (a = l.memoizedState, t === null || t.memoizedState !== null) {
          if (e = Ie(l), a !== null) {
            if (t === null) {
              if (!e) throw Error(d(318));
              if (t = l.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(d(557));
              t[il] = l;
            } else
              be(), (l.flags & 128) === 0 && (l.memoizedState = null), l.flags |= 4;
            Ht(l), t = !1;
          } else
            a = xc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = a), t = !0;
          if (!t)
            return l.flags & 256 ? (xl(l), l) : (xl(l), null);
          if ((l.flags & 128) !== 0)
            throw Error(d(558));
        }
        return Ht(l), null;
      case 13:
        if (e = l.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (u = Ie(l), e !== null && e.dehydrated !== null) {
            if (t === null) {
              if (!u) throw Error(d(318));
              if (u = l.memoizedState, u = u !== null ? u.dehydrated : null, !u) throw Error(d(317));
              u[il] = l;
            } else
              be(), (l.flags & 128) === 0 && (l.memoizedState = null), l.flags |= 4;
            Ht(l), u = !1;
          } else
            u = xc(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = u), u = !0;
          if (!u)
            return l.flags & 256 ? (xl(l), l) : (xl(l), null);
        }
        return xl(l), (l.flags & 128) !== 0 ? (l.lanes = a, l) : (a = e !== null, t = t !== null && t.memoizedState !== null, a && (e = l.child, u = null, e.alternate !== null && e.alternate.memoizedState !== null && e.alternate.memoizedState.cachePool !== null && (u = e.alternate.memoizedState.cachePool.pool), n = null, e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), n !== u && (e.flags |= 2048)), a !== t && a && (l.child.flags |= 8192), Ti(l, l.updateQueue), Ht(l), null);
      case 4:
        return ga(), t === null && no(l.stateNode.containerInfo), l.flags |= 67108864, Ht(l), null;
      case 10:
        return Aa(l.type), Ht(l), null;
      case 19:
        if ($c(l), e = l.memoizedState, e === null) return Ht(l), null;
        if (u = (l.flags & 128) !== 0, n = e.rendering, n === null)
          if (u) en(e, !1);
          else {
            if (Zt !== 0 || t !== null && (t.flags & 128) !== 0)
              for (t = l.child; t !== null; ) {
                if (n = ni(t), n !== null) {
                  for (l.flags |= 128, en(e, !1), t = n.updateQueue, l.updateQueue = t, Ti(l, t), l.subtreeFlags = 0, t = a, a = l.child; a !== null; )
                    Gs(a, t), a = a.sibling;
                  return ku(
                    l,
                    ol.current & 1 | 2
                  ), ot && Oa(l, e.treeForkCount), l.child;
                }
                t = t.sibling;
              }
            e.tail !== null && $() > Ri && (l.flags |= 128, u = !0, en(e, !1), l.lanes = 4194304);
          }
        else {
          if (!u)
            if (t = ni(n), t !== null) {
              if (l.flags |= 128, u = !0, t = t.updateQueue, l.updateQueue = t, Ti(l, t), en(e, !0), e.tail === null && e.tailMode !== "collapsed" && e.tailMode !== "visible" && !n.alternate && !ot)
                return Ht(l), null;
            } else
              2 * $() - e.renderingStartTime > Ri && a !== 536870912 && (l.flags |= 128, u = !0, en(e, !1), l.lanes = 4194304);
          e.isBackwards ? (n.sibling = l.child, l.child = n) : (t = e.last, t !== null ? t.sibling = n : l.child = n, e.last = n);
        }
        if (e.tail !== null) {
          t = e.tail;
          t: {
            for (a = t; a !== null; ) {
              if (a.alternate !== null) {
                a = !1;
                break t;
              }
              a = a.sibling;
            }
            a = !0;
          }
          return e.rendering = t, e.tail = t.sibling, e.renderingStartTime = $(), t.sibling = null, n = ol.current, n = u ? n & 1 | 2 : n & 1, e.tailMode === "visible" || e.tailMode === "collapsed" || !a || ot ? ku(l, n) : (a = n, K(fl, l), K(ol, a), vl === null && (vl = l)), ot && Oa(l, e.treeForkCount), t;
        }
        return Ht(l), null;
      case 22:
      case 23:
        return xl(l), wc(), e = l.memoizedState !== null, t !== null ? t.memoizedState !== null !== e && (l.flags |= 8192) : e && (l.flags |= 8192), e ? (a & 536870912) !== 0 && (l.flags & 128) === 0 && (Ht(l), l.subtreeFlags & 6 && (l.flags |= 8192)) : Ht(l), a = l.updateQueue, a !== null && Ti(l, a.retryQueue), a = null, t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (a = t.memoizedState.cachePool.pool), e = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (e = l.memoizedState.cachePool.pool), e !== a && (l.flags |= 2048), t !== null && U(_e), null;
      case 24:
        return a = null, t !== null && (a = t.memoizedState.cache), l.memoizedState.cache !== a && (l.flags |= 2048), Aa($t), Ht(l), null;
      case 25:
        return null;
      case 30:
        return l.flags |= 33554432, Ht(l), null;
    }
    throw Error(d(156, l.tag));
  }
  function Vv(t, l) {
    switch (Rc(l), l.tag) {
      case 1:
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 3:
        return Aa($t), ga(), t = l.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (l.flags = t & -65537 | 128, l) : null;
      case 26:
      case 27:
      case 5:
        return fe(l), null;
      case 31:
        if (l.memoizedState !== null) {
          if (xl(l), l.alternate === null)
            throw Error(d(340));
          be();
        }
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 13:
        if (xl(l), t = l.memoizedState, t !== null && t.dehydrated !== null) {
          if (l.alternate === null)
            throw Error(d(340));
          be();
        }
        return t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 19:
        return $c(l), t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, t = l.memoizedState, t !== null && (t.rendering = null, t.tail = null), l.flags |= 4, l) : null;
      case 4:
        return ga(), null;
      case 10:
        return Aa(l.type), null;
      case 22:
      case 23:
        return xl(l), wc(), t !== null && U(_e), t = l.flags, t & 65536 ? (l.flags = t & -65537 | 128, l) : null;
      case 24:
        return Aa($t), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function md(t, l) {
    switch (Rc(l), l.tag) {
      case 3:
        Aa($t), ga();
        break;
      case 26:
      case 27:
      case 5:
        fe(l);
        break;
      case 4:
        ga();
        break;
      case 31:
        l.memoizedState !== null && xl(l);
        break;
      case 13:
        xl(l);
        break;
      case 19:
        $c(l);
        break;
      case 10:
        Aa(l.type);
        break;
      case 22:
      case 23:
        xl(l), wc(), t !== null && U(_e);
        break;
      case 24:
        Aa($t);
    }
  }
  function un(t, l) {
    try {
      var a = l.updateQueue, e = a !== null ? a.lastEffect : null;
      if (e !== null) {
        var u = e.next;
        a = u;
        do {
          if ((a.tag & t) === t) {
            e = void 0;
            var n = a.create, i = a.inst;
            e = n(), i.destroy = e;
          }
          a = a.next;
        } while (a !== u);
      }
    } catch (c) {
      At(l, l.return, c);
    }
  }
  function Fa(t, l, a) {
    try {
      var e = l.updateQueue, u = e !== null ? e.lastEffect : null;
      if (u !== null) {
        var n = u.next;
        e = n;
        do {
          if ((e.tag & t) === t) {
            var i = e.inst, c = i.destroy;
            if (c !== void 0) {
              i.destroy = void 0, u = l;
              var f = a, v = c;
              try {
                v();
              } catch (b) {
                At(
                  u,
                  f,
                  b
                );
              }
            }
          }
          e = e.next;
        } while (e !== n);
      }
    } catch (b) {
      At(l, l.return, b);
    }
  }
  function vd(t) {
    var l = t.updateQueue;
    if (l !== null) {
      var a = t.stateNode;
      try {
        er(l, a);
      } catch (e) {
        At(t, t.return, e);
      }
    }
  }
  function hd(t, l, a) {
    a.props = Ce(
      t.type,
      t.memoizedProps
    ), a.state = t.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (e) {
      At(t, l, e);
    }
  }
  function fa(t, l) {
    try {
      var a = t.ref;
      if (a !== null) {
        switch (t.tag) {
          case 26:
          case 27:
          case 5:
            var e = t.stateNode;
            break;
          case 30:
            var u = t.stateNode, n = Ea(t.memoizedProps, u);
            (u.ref === null || u.ref.name !== n) && (u.ref = zm(n)), e = u.ref;
            break;
          case 7:
            if (t.stateNode === null) {
              var i = new Gl(t);
              T(
                t.child,
                !1,
                jh,
                i,
                void 0,
                void 0
              ), t.stateNode = i;
            }
            e = t.stateNode;
            break;
          default:
            e = t.stateNode;
        }
        typeof a == "function" ? t.refCleanup = a(e) : a.current = e;
      }
    } catch (c) {
      At(t, l, c);
    }
  }
  function sl(t, l) {
    var a = t.ref, e = t.refCleanup;
    if (a !== null)
      if (typeof e == "function")
        try {
          e();
        } catch (u) {
          At(t, l, u);
        } finally {
          t.refCleanup = null, t = t.alternate, t != null && (t.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (u) {
          At(t, l, u);
        }
      else a.current = null;
  }
  function Ei(t, l) {
    if ((t.tag === 5 || t.tag === 27 || t.tag === 6) && t.alternate === null && l !== null)
      for (var a = 0; a < l.length; a++)
        Cm(
          t.stateNode,
          l[a]
        );
  }
  function yd(t) {
    for (var l = t.return; l !== null && (Af(l) && Cm(t.stateNode, l.stateNode), !Nf(l)); )
      l = l.return;
  }
  function nn(t) {
    for (var l = t.return; l !== null && (Af(l) && xh(t.stateNode, l.stateNode), !Nf(l)); )
      l = l.return;
  }
  function Nf(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 27;
  }
  function Af(t) {
    return t && t.tag === 7 && t.stateNode !== null;
  }
  function pf(t) {
    var l = t.type, a = t.memoizedProps, e = t.stateNode;
    try {
      t: switch (l) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && e.focus();
          break t;
        case "img":
          a.src ? e.src = a.src : a.srcSet && (e.srcset = a.srcSet);
      }
    } catch (u) {
      At(t, t.return, u);
    }
  }
  function Cf(t, l, a) {
    try {
      var e = t.stateNode;
      hh(e, t.type, a, l), e[El] = l;
    } catch (u) {
      At(t, t.return, u);
    }
  }
  function gd(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 26 || t.tag === 27 && ae(t.type) || t.tag === 4;
  }
  function Mf(t) {
    t: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || gd(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.tag === 27 && ae(t.type) || t.flags & 2 || t.child === null || t.tag === 4) continue t;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function Df(t, l, a, e) {
    var u = t.tag;
    if (u === 5 || u === 6)
      u = t.stateNode, l ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(u, l) : (l = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, l.appendChild(u), a = a._reactRootContainer, a != null || l.onclick !== null || (l.onclick = na)), Ei(t, e), Tt = !0;
    else if (u !== 4 && (u === 27 && (Ei(t, e), e = null, ae(t.type) && (a = t.stateNode, l = null)), t = t.child, t !== null))
      for (Df(
        t,
        l,
        a,
        e
      ), t = t.sibling; t !== null; )
        Df(
          t,
          l,
          a,
          e
        ), t = t.sibling;
  }
  function zi(t, l, a, e) {
    var u = t.tag;
    if (u === 5 || u === 6)
      u = t.stateNode, l ? a.insertBefore(u, l) : a.appendChild(u), Ei(t, e), Tt = !0;
    else if (u !== 4 && (u === 27 && (Ei(t, e), e = null, ae(t.type) && (a = t.stateNode)), t = t.child, t !== null))
      for (zi(
        t,
        l,
        a,
        e
      ), t = t.sibling; t !== null; )
        zi(
          t,
          l,
          a,
          e
        ), t = t.sibling;
  }
  function bd(t) {
    var l = t.stateNode, a = t.memoizedProps;
    try {
      for (var e = t.type, u = l.attributes; u.length; )
        l.removeAttributeNode(u[0]);
      rl(l, e, a), l[il] = t, l[El] = a;
    } catch (n) {
      At(t, t.return, n);
    }
  }
  var _i = !1, Hl = null;
  function Sd(t) {
    (t.tag === 30 || (t.subtreeFlags & 33554432) !== 0) && (_i = !0);
  }
  var oa = null;
  function Td() {
    var t = oa;
    return oa = null, t;
  }
  var _l = 0;
  function nu(t, l, a, e, u) {
    return _l = 0, Ed(
      t.child,
      l,
      a,
      e,
      u
    );
  }
  function Ed(t, l, a, e, u) {
    for (var n = !1; t !== null; ) {
      if (t.tag === 5) {
        var i = t.stateNode;
        if (e !== null) {
          var c = vo(i);
          e.push(c), c.view && (n = !0);
        } else
          n || vo(i).view && (n = !0);
        _i = !0, Tm(
          i,
          _l === 0 ? l : l + "_" + _l,
          a
        ), _l++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && u || Ed(
        t.child,
        l,
        a,
        e,
        u
      ) && (n = !0));
      t = t.sibling;
    }
    return n;
  }
  function sa(t, l) {
    for (; t !== null; )
      t.tag === 5 ? Em(t.stateNode, t.memoizedProps) : (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && l || sa(
        t.child,
        l
      )), t = t.sibling;
  }
  function Oi(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if ((t.tag !== 22 || t.memoizedState === null) && (Oi(t), t.tag === 30 && (t.flags & 18874368) !== 0 && t.stateNode.paired)) {
          var l = t.memoizedProps;
          if (l.name == null || l.name === "auto")
            throw Error(d(544));
          var a = l.name;
          l = za(l.default, l.share), l !== "none" && (nu(
            t,
            a,
            l,
            null,
            !1
          ) || sa(t.child, !1));
        }
        t = t.sibling;
      }
  }
  function Uf(t, l) {
    if (t.tag === 30) {
      var a = t.stateNode, e = t.memoizedProps, u = Ea(e, a), n = za(
        e.default,
        a.paired ? e.share : e.enter
      );
      n !== "none" ? nu(t, u, n, null, !1) ? (Oi(t), a.paired || l || mu(t, e.onEnter)) : sa(t.child, !1) : Oi(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        Uf(t, l), t = t.sibling;
    else Oi(t);
  }
  function Rf(t) {
    if (Hl !== null && Hl.size !== 0) {
      var l = Hl;
      if ((t.subtreeFlags & 18874368) !== 0)
        for (t = t.child; t !== null; ) {
          if (t.tag !== 22 || t.memoizedState === null) {
            if (t.tag === 30 && (t.flags & 18874368) !== 0) {
              var a = t.memoizedProps, e = a.name;
              if (e != null && e !== "auto") {
                var u = l.get(e);
                if (u !== void 0) {
                  var n = za(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (nu(
                    t,
                    e,
                    n,
                    null,
                    !1
                  ) ? (n = t.stateNode, u.paired = n, n.paired = u, mu(t, a.onShare)) : sa(t.child, !1)), l.delete(e), l.size === 0) break;
                }
              }
            }
            Rf(t);
          }
          t = t.sibling;
        }
    }
  }
  function jf(t) {
    if (t.tag === 30) {
      var l = t.memoizedProps, a = Ea(l, t.stateNode), e = Hl !== null ? Hl.get(a) : void 0, u = za(
        l.default,
        e !== void 0 ? l.share : l.exit
      );
      u !== "none" && (nu(t, a, u, null, !1) ? e !== void 0 ? (u = t.stateNode, e.paired = u, u.paired = e, Hl.delete(a), mu(t, l.onShare)) : mu(t, l.onExit) : sa(t.child, !1)), Hl !== null && Rf(t);
    } else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        jf(t), t = t.sibling;
    else
      Hl !== null && Rf(t);
  }
  function zd(t) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var l = t.memoizedProps, a = Ea(l, t.stateNode);
        l = za(l.default, l.update), t.flags &= -5, l !== "none" && nu(
          t,
          a,
          l,
          t.memoizedState = [],
          !1
        );
      } else
        (t.subtreeFlags & 33554432) !== 0 && zd(t);
      t = t.sibling;
    }
  }
  function xf(t) {
    if ((t.subtreeFlags & 18874368) !== 0)
      for (t = t.child; t !== null; ) {
        if (t.tag !== 22 || t.memoizedState === null) {
          if (t.tag === 30 && (t.flags & 18874368) !== 0) {
            var l = t.stateNode;
            l.paired !== null && (l.paired = null, sa(t.child, !1));
          }
          xf(t);
        }
        t = t.sibling;
      }
  }
  function Ni(t) {
    if (t.tag === 30)
      t.stateNode.paired = null, sa(t.child, !1), xf(t);
    else if ((t.subtreeFlags & 33554432) !== 0)
      for (t = t.child; t !== null; )
        Ni(t), t = t.sibling;
    else xf(t);
  }
  function _d(t) {
    for (t = t.child; t !== null; )
      t.tag === 30 ? sa(t.child, !1) : (t.subtreeFlags & 33554432) !== 0 && _d(t), t = t.sibling;
  }
  function Hf(t, l, a, e, u, n, i) {
    for (var c = !1; l !== null; ) {
      if (l.tag === 5) {
        var f = l.stateNode;
        if (n !== null && _l < n.length) {
          var v = n[_l], b = vo(f);
          (v.view || b.view) && (c = !0);
          var z;
          if (z = (t.flags & 4) === 0)
            if (b.clip) z = !0;
            else {
              z = v.rect;
              var r = b.rect;
              z = z.y !== r.y || z.x !== r.x || z.height !== r.height || z.width !== r.width;
            }
          z && (t.flags |= 4), b.abs ? b = !v.abs : (v = v.rect, b = b.rect, b = v.height !== b.height || v.width !== b.width), b && (t.flags |= 32);
        } else t.flags |= 32;
        (t.flags & 4) !== 0 && Tm(
          f,
          _l === 0 ? a : a + "_" + _l,
          u
        ), c && (t.flags & 4) !== 0 || (oa === null && (oa = []), oa.push(
          f,
          _l === 0 ? e : e + "_" + _l,
          l.memoizedProps
        )), _l++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && i ? t.flags |= l.flags & 32 : Hf(
        t,
        l.child,
        a,
        e,
        u,
        n,
        i
      ) && (c = !0));
      l = l.sibling;
    }
    return c;
  }
  function Od(t, l) {
    for (t = t.child; t !== null; ) {
      if (t.tag === 30) {
        var a = t.memoizedProps, e = t.stateNode, u = Ea(a, e), n = za(a.default, a.update), i;
        i = t.memoizedState, t.memoizedState = null, e = t;
        var c = t.child;
        _l = 0, u = Hf(
          e,
          c,
          u,
          u,
          n,
          i,
          !1
        ), (t.flags & 4) !== 0 && u && mu(t, a.onUpdate);
      } else
        (t.subtreeFlags & 33554432) !== 0 && Od(t);
      t = t.sibling;
    }
  }
  var el = !1, Ot = !1, ra = !1, qf = !1, Nd = typeof WeakSet == "function" ? WeakSet : Set, ul = null, da = !1, cn = !1, Ai = !1, Bf = !1;
  function Zv(t, l, a) {
    if (t = t.containerInfo, fo = _u, t = Ms(t), zc(t)) {
      if ("selectionStart" in t)
        var e = {
          start: t.selectionStart,
          end: t.selectionEnd
        };
      else
        t: {
          e = (e = t.ownerDocument) && e.defaultView || window;
          var u = e.getSelection && e.getSelection();
          if (u && u.rangeCount !== 0) {
            e = u.anchorNode;
            var n = u.anchorOffset, i = u.focusNode;
            u = u.focusOffset;
            try {
              e.nodeType, i.nodeType;
            } catch {
              e = null;
              break t;
            }
            var c = 0, f = -1, v = -1, b = 0, z = 0, r = t, y = null;
            l: for (; ; ) {
              for (var p; r !== e || n !== 0 && r.nodeType !== 3 || (f = c + n), r !== i || u !== 0 && r.nodeType !== 3 || (v = c + u), r.nodeType === 3 && (c += r.nodeValue.length), (p = r.firstChild) !== null; )
                y = r, r = p;
              for (; ; ) {
                if (r === t) break l;
                if (y === e && ++b === n && (f = c), y === i && ++z === u && (v = c), (p = r.nextSibling) !== null) break;
                r = y, y = r.parentNode;
              }
              r = p;
            }
            e = f === -1 || v === -1 ? null : { start: f, end: v };
          } else e = null;
        }
      e = e || { start: 0, end: 0 };
    } else e = null;
    for (oo = { focusedElem: t, selectionRange: e }, _u = !1, a = (a & 335544064) === a, ul = l, l = a ? 9270 : 1024; ul !== null; ) {
      if (t = ul, a && (e = t.deletions, e !== null))
        for (n = 0; n < e.length; n++)
          a && jf(e[n]);
      if (t.alternate === null && (t.flags & 2) !== 0)
        a && Sd(t), pi(a);
      else {
        if (t.tag === 22) {
          if (e = t.alternate, t.memoizedState !== null) {
            e !== null && e.memoizedState === null && a && jf(e), pi(a);
            continue;
          } else if (e !== null && e.memoizedState !== null) {
            a && Sd(t), pi(a);
            continue;
          }
        }
        e = t.child, (t.subtreeFlags & l) !== 0 && e !== null ? (e.return = t, ul = e) : (a && zd(t), pi(a));
      }
    }
    Hl = null;
  }
  function pi(t) {
    for (; ul !== null; ) {
      var l = ul, a = t, e = l.alternate, u = l.flags;
      switch (l.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if ((u & 1024) !== 0 && e !== null) {
            a = void 0, u = e.memoizedProps, e = e.memoizedState;
            var n = l.stateNode;
            try {
              var i = Ce(
                l.type,
                u
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                e
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              At(l, l.return, c);
            }
          }
          break;
        case 3:
          if ((u & 1024) !== 0) {
            if (e = l.stateNode.containerInfo, a = e.nodeType, a === 9)
              go(e);
            else if (a === 1)
              switch (e.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  go(e);
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
          a && e !== null && (a = Ea(
            e.memoizedProps,
            e.stateNode
          ), u = l.memoizedProps, u = za(u.default, u.update), u !== "none" && nu(
            e,
            a,
            u,
            e.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((u & 1024) !== 0) throw Error(d(163));
      }
      if (e = l.sibling, e !== null) {
        e.return = l.return, ul = e;
        break;
      }
      ul = l.return;
    }
  }
  function Ad(t, l, a) {
    var e = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        ma(t, a), e & 4 && un(5, a);
        break;
      case 1:
        if (ma(t, a), e & 4)
          if (t = a.stateNode, l === null)
            try {
              t.componentDidMount();
            } catch (i) {
              At(a, a.return, i);
            }
          else {
            var u = Ce(
              a.type,
              l.memoizedProps
            );
            l = l.memoizedState;
            try {
              t.componentDidUpdate(
                u,
                l,
                t.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              At(
                a,
                a.return,
                i
              );
            }
          }
        e & 64 && vd(a), e & 512 && fa(a, a.return);
        break;
      case 3:
        if (ma(t, a), e & 64 && (t = a.updateQueue, t !== null)) {
          if (l = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                l = a.child.stateNode;
                break;
              case 1:
                l = a.child.stateNode;
            }
          try {
            er(t, l);
          } catch (i) {
            At(a, a.return, i);
          }
        }
        break;
      case 27:
        l === null && e & 4 && bd(a);
      case 26:
      case 5:
        ma(t, a), l === null && e & 4 && pf(a), e & 512 && fa(a, a.return);
        break;
      case 12:
        ma(t, a);
        break;
      case 31:
        ma(t, a), e & 4 && Dd(t, a);
        break;
      case 13:
        ma(t, a), e & 4 && Ud(t, a), e & 64 && (t = a.memoizedState, t !== null && (t = t.dehydrated, t !== null && (a = ah.bind(
          null,
          a
        ), Bh(t, a))));
        break;
      case 22:
        if (e = a.memoizedState !== null || el, !e) {
          var n = l !== null && l.memoizedState !== null || Ot;
          l = el, u = Ot, el = e, (Ot = n) && !u ? (e = 2, (a.subtreeFlags & 8772) !== 0 && (e |= 1), aa(
            t,
            a,
            e
          )) : ma(t, a), el = l, Ot = u;
        }
        break;
      case 30:
        ma(t, a), e & 512 && fa(a, a.return);
        break;
      case 7:
        e & 512 && fa(a, a.return);
      default:
        ma(t, a);
    }
  }
  function Yf(t, l) {
    for (t = t.child; t !== null; )
      pd(t, l), t = t.sibling;
  }
  function pd(t, l) {
    switch (t.tag) {
      case 5:
      case 26:
        try {
          var a = t.stateNode;
          if (l) {
            var e = a.style;
            typeof e.setProperty == "function" ? e.setProperty("display", "none", "important") : e.display = "none";
          } else {
            var u = t.stateNode, n = t.memoizedProps.style, i = n != null && n.hasOwnProperty("display") ? n.display : null;
            u.style.display = i == null || typeof i == "boolean" ? "" : ("" + i).trim();
          }
        } catch (f) {
          At(t, t.return, f);
        }
        Gf(t, l);
        break;
      case 6:
        try {
          t.stateNode.nodeValue = l ? "" : t.memoizedProps, Tt = !0;
        } catch (f) {
          At(t, t.return, f);
        }
        break;
      case 18:
        try {
          var c = t.stateNode;
          l ? Sm(c, !0) : Sm(t.stateNode, !1);
        } catch (f) {
          At(t, t.return, f);
        }
        break;
      case 22:
      case 23:
        t.memoizedState === null && Yf(t, l);
        break;
      default:
        Yf(t, l);
    }
  }
  function Gf(t, l) {
    if (t.subtreeFlags & 67108864)
      for (t = t.child; t !== null; ) {
        t: {
          var a = t, e = l;
          switch (a.tag) {
            case 4:
              pd(a, e);
              break t;
            case 22:
              a.memoizedState === null && Gf(a, e);
              break t;
            default:
              Gf(a, e);
          }
        }
        t = t.sibling;
      }
  }
  function Cd(t) {
    var l = t.alternate;
    l !== null && (t.alternate = null, Cd(l)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (l = t.stateNode, l !== null && Rn(l)), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  var Yt = null, Ol = !1;
  function ta(t, l, a) {
    for (a = a.child; a !== null; )
      Md(t, l, a), a = a.sibling;
  }
  function Md(t, l, a) {
    if (Dl && typeof Dl.onCommitFiberUnmount == "function")
      try {
        Dl.onCommitFiberUnmount(Mu, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        Ot || sl(a, l), ta(
          t,
          l,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !Ot && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        Ot || sl(a, l), nn(a);
        var e = Yt, u = Ol;
        ae(a.type) && (Yt = a.stateNode, Ol = !1), ta(
          t,
          l,
          a
        ), jm(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Yt = e, Ol = u;
        break;
      case 5:
        Ot || sl(a, l), nn(a);
      case 6:
        if (a.tag === 6 && nn(a), e = Yt, u = Ol, Yt = null, ta(
          t,
          l,
          a
        ), Yt = e, Ol = u, Yt !== null)
          if (Ol)
            try {
              (Yt.nodeType === 9 ? Yt.body : Yt.nodeName === "HTML" ? Yt.ownerDocument.body : Yt).removeChild(a.stateNode), Tt = !0;
            } catch (n) {
              At(
                a,
                l,
                n
              );
            }
          else
            try {
              Yt.removeChild(a.stateNode), Tt = !0;
            } catch (n) {
              At(
                a,
                l,
                n
              );
            }
        break;
      case 18:
        Yt !== null && (Ol ? (t = Yt, bm(
          t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t,
          a.stateNode
        ), Ou(t)) : bm(Yt, a.stateNode));
        break;
      case 4:
        e = Yt, u = Ol, Yt = a.stateNode.containerInfo, Ol = !0, ta(
          t,
          l,
          a
        ), Yt = e, Ol = u;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Fa(2, a, l), Ot || Fa(4, a, l), ta(
          t,
          l,
          a
        );
        break;
      case 1:
        Ot || (sl(a, l), e = a.stateNode, typeof e.componentWillUnmount == "function" && hd(
          a,
          l,
          e
        )), ta(
          t,
          l,
          a
        );
        break;
      case 21:
        ta(
          t,
          l,
          a
        );
        break;
      case 22:
        Ot = (e = Ot) || a.memoizedState !== null, ta(
          t,
          l,
          a
        ), Ot = e;
        break;
      case 30:
        sl(a, l), ta(
          t,
          l,
          a
        );
        break;
      case 7:
        Ot || sl(a, l), ta(
          t,
          l,
          a
        );
        break;
      default:
        ta(
          t,
          l,
          a
        );
    }
  }
  function Dd(t, l) {
    if (l.memoizedState === null && (t = l.alternate, t !== null && (t = t.memoizedState, t !== null))) {
      t = t.dehydrated;
      try {
        Ou(t);
      } catch (a) {
        At(l, l.return, a);
      }
    }
  }
  function Ud(t, l) {
    if (l.memoizedState === null && (t = l.alternate, t !== null && (t = t.memoizedState, t !== null && (t = t.dehydrated, t !== null))))
      try {
        Ou(t);
      } catch (a) {
        At(l, l.return, a);
      }
  }
  function Kv(t) {
    switch (t.tag) {
      case 31:
      case 13:
      case 19:
        var l = t.stateNode;
        return l === null && (l = t.stateNode = new Nd()), l;
      case 22:
        return t = t.stateNode, l = t._retryCache, l === null && (l = t._retryCache = new Nd()), l;
      default:
        throw Error(d(435, t.tag));
    }
  }
  function Ci(t, l) {
    var a = Kv(t);
    l.forEach(function(e) {
      if (!a.has(e)) {
        a.add(e);
        var u = eh.bind(null, t, e);
        e.then(u, u);
      }
    });
  }
  function bl(t, l, a) {
    var e = l.deletions;
    if (e !== null)
      for (var u = 0; u < e.length; u++) {
        var n = e[u], i = t, c = l, f = c;
        t: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (ae(f.type)) {
                Yt = f.stateNode, Ol = !1;
                break t;
              }
              break;
            case 5:
              Yt = f.stateNode, Ol = !1;
              break t;
            case 3:
            case 4:
              Yt = f.stateNode.containerInfo, Ol = !0;
              break t;
          }
          f = f.return;
        }
        if (Yt === null) throw Error(d(160));
        Md(i, c, n), Yt = null, Ol = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (l.subtreeFlags & 13886)
      for (l = l.child; l !== null; )
        Rd(l, t, a), l = l.sibling;
  }
  var la = null;
  function Rd(t, l, a) {
    var e = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (u & 4 && (e = t.updateQueue, e = e !== null ? e.events : null, e !== null))
          for (var n = 0; n < e.length; n++) {
            var i = e[n];
            i.ref.impl = i.nextImpl;
          }
        bl(l, t, a), Sl(t), u & 4 && (Fa(3, t, t.return), un(3, t), Fa(5, t, t.return));
        break;
      case 1:
        bl(l, t, a), Sl(t), u & 512 && (Ot || e === null || sl(e, e.return)), u & 64 && el && (t = t.updateQueue, t !== null && (l = t.callbacks, l !== null && (a = t.shared.hiddenCallbacks, t.shared.hiddenCallbacks = a === null ? l : a.concat(l))));
        break;
      case 26:
        if (n = la, bl(l, t, a), Sl(t), u & 512 && (Ot || e === null || sl(e, e.return)), u & 4)
          if (u = e !== null ? e.memoizedState : null, a = t.memoizedState, e === null)
            if (a === null)
              if (t.stateNode === null)
                if (el)
                  t.stateNode = hm(
                    t.type,
                    t.memoizedProps,
                    l.containerInfo,
                    t
                  );
                else {
                  t: {
                    l = t.type, a = t.memoizedProps, u = n.ownerDocument || n;
                    l: switch (l) {
                      case "title":
                        e = u.getElementsByTagName("title")[0], (!e || e[Ru] || e[il] || e.namespaceURI === "http://www.w3.org/2000/svg" || e.hasAttribute("itemprop")) && (e = u.createElement(l), u.head.insertBefore(
                          e,
                          u.querySelector("head > title")
                        )), rl(e, l, a), e[il] = t, ll(e), l = e;
                        break t;
                      case "link":
                        if (n = Gm(
                          "link",
                          "href",
                          u
                        ).get(l + (a.href || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && e.getAttribute("rel") === (a.rel == null ? null : a.rel) && e.getAttribute("title") === (a.title == null ? null : a.title) && e.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                              n.splice(i, 1);
                              break l;
                            }
                        }
                        e = u.createElement(l), rl(e, l, a), u.head.appendChild(e);
                        break;
                      case "meta":
                        if (n = Gm(
                          "meta",
                          "content",
                          u
                        ).get(l + (a.content || ""))) {
                          for (i = 0; i < n.length; i++)
                            if (e = n[i], e.getAttribute("content") === (a.content == null ? null : "" + a.content) && e.getAttribute("name") === (a.name == null ? null : a.name) && e.getAttribute("property") === (a.property == null ? null : a.property) && e.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && e.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                              n.splice(i, 1);
                              break l;
                            }
                        }
                        e = u.createElement(l), rl(e, l, a), u.head.appendChild(e);
                        break;
                      default:
                        throw Error(d(468, l));
                    }
                    e[il] = t, ll(e), l = e;
                  }
                  t.stateNode = l;
                }
              else
                el || Oo(n, t.type, t.stateNode);
            else
              t.stateNode = Ym(
                n,
                a,
                t.memoizedProps
              );
          else
            u !== a ? (u === null ? (l = e.stateNode, l === null || Ot || l.parentNode.removeChild(l)) : u.count--, a === null ? el || Oo(n, t.type, t.stateNode) : Ym(n, a, t.memoizedProps)) : a === null && t.stateNode !== null && Cf(
              t,
              t.memoizedProps,
              e.memoizedProps
            );
        break;
      case 27:
        bl(l, t, a), Sl(t), u & 512 && (Ot || e === null || sl(e, e.return)), e !== null && u & 4 && Cf(
          t,
          t.memoizedProps,
          e.memoizedProps
        );
        break;
      case 5:
        if (n = ra, ra = !1, bl(l, t, a), ra = n, Sl(t), u & 512 && (Ot || e === null || sl(e, e.return)), t.flags & 32) {
          l = t.stateNode;
          try {
            Qe(l, ""), Tt = !0;
          } catch (b) {
            At(t, t.return, b);
          }
        }
        u & 4 && t.stateNode != null && (l = t.memoizedProps, Cf(
          t,
          l,
          e !== null ? e.memoizedProps : l
        )), u & 1024 && (qf = !0);
        break;
      case 6:
        if (bl(l, t, a), Sl(t), u & 4) {
          if (t.stateNode === null)
            throw Error(d(162));
          l = t.memoizedProps, a = t.stateNode;
          try {
            a.nodeValue = l, Tt = !0;
          } catch (b) {
            At(t, t.return, b);
          }
        }
        break;
      case 3:
        if (Tt = !1, Vi = null, n = la, la = yn(l.containerInfo), bl(l, t, a), la = n, Sl(t), u & 4 && e !== null && e.memoizedState.isDehydrated)
          try {
            Ou(l.containerInfo);
          } catch (b) {
            At(t, t.return, b);
          }
        qf && (qf = !1, jd(t)), Tt = !1;
        break;
      case 4:
        u = ra, ra = el, e = Po(), n = la, la = yn(
          t.stateNode.containerInfo
        ), bl(l, t, a), Sl(t), la = n, Tt && cn && (Ai = !0), Tt = e, ra = u;
        break;
      case 12:
        bl(l, t, a), Sl(t);
        break;
      case 31:
        bl(l, t, a), Sl(t), u & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, Ci(t, l)));
        break;
      case 13:
        bl(l, t, a), Sl(t), t.child.flags & 8192 && t.memoizedState !== null != (e !== null && e.memoizedState !== null) && (Ui = $()), u & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, Ci(t, l)));
        break;
      case 22:
        n = t.memoizedState !== null, i = e !== null && e.memoizedState !== null;
        var c = el, f = Ot, v = ra;
        el = c || n, ra = v || n, Ot = f || i, bl(l, t, a), Ot = f, ra = v, el = c, Sl(t), u & 8192 && (l = t.stateNode, l._visibility = n ? l._visibility & -2 : l._visibility | 1, !n || e === null || i || el || Ot || (l = i || Ot, a = el, e = Ot, el = n || el, Ot = l, Wa(t, 2), el = a, Ot = e), !n && ra || Yf(t, n)), u & 4 && (l = t.updateQueue, l !== null && (a = l.retryQueue, a !== null && (l.retryQueue = null, Ci(t, a))));
        break;
      case 19:
        bl(l, t, a), Sl(t), u & 4 && (l = t.updateQueue, l !== null && (t.updateQueue = null, Ci(t, l)));
        break;
      case 30:
        u & 512 && (Ot || e === null || sl(e, e.return)), u = Po(), n = cn, i = (a & 335544064) === a, c = t.memoizedProps, cn = i && za(
          c.default,
          c.update
        ) !== "none", bl(l, t, a), Sl(t), i && e !== null && Tt && (t.flags |= 4), cn = n, Tt = u;
        break;
      case 21:
        break;
      case 7:
        u & 512 && (Ot || e === null || sl(e, e.return)), e && e.stateNode !== null && (e.stateNode._fragmentFiber = t);
      default:
        bl(l, t, a), Sl(t);
    }
  }
  function Sl(t) {
    var l = t.flags;
    if (l & 2) {
      try {
        for (var a, e = t.return; e !== null; ) {
          if (gd(e)) {
            a = e;
            break;
          }
          e = e.return;
        }
        e = null;
        for (var u = t.return; u !== null; ) {
          if (Af(u)) {
            var n = u.stateNode;
            e === null ? e = [n] : e.push(n);
          }
          if (Nf(u)) break;
          u = u.return;
        }
        var i = e;
        if (a == null) throw Error(d(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = Mf(t);
            zi(
              t,
              f,
              c,
              i
            );
            break;
          case 5:
            var v = a.stateNode;
            a.flags & 32 && (Qe(v, ""), a.flags &= -33);
            var b = Mf(t);
            zi(
              t,
              b,
              v,
              i
            );
            break;
          case 3:
          case 4:
            var z = a.stateNode.containerInfo, r = Mf(t);
            Df(
              t,
              r,
              z,
              i
            );
            break;
          default:
            throw Error(d(161));
        }
      } catch (y) {
        At(t, t.return, y);
      }
      t.flags &= -3;
    }
    l & 4096 && (t.flags &= -4097);
  }
  function jd(t) {
    if (t.subtreeFlags & 1024)
      for (t = t.child; t !== null; ) {
        var l = t;
        jd(l), l.tag === 5 && l.flags & 1024 && (l = l.stateNode, _u = !0, l.reset(), _u = !1), t = t.sibling;
      }
  }
  function iu(t, l) {
    if (l.subtreeFlags & 9270)
      for (l = l.child; l !== null; )
        xd(l, t), l = l.sibling;
    else Od(l);
  }
  function xd(t, l) {
    var a = t.alternate;
    if (a === null) Uf(t, !1);
    else
      switch (t.tag) {
        case 3:
          if (Bf = da = !1, Td(), iu(l, t), !da && !Ai) {
            if (t = oa, t !== null)
              for (var e = 0; e < t.length; e += 3) {
                a = t[e];
                var u = t[e + 1];
                Em(a, t[e + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + u + ")"
                  }
                );
              }
            t = l.containerInfo, t = t.nodeType === 9 ? t.documentElement : t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "" && (t.style.viewTransitionName = "none", t.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), t.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            )), Bf = !0;
          }
          oa = null;
          break;
        case 5:
          iu(l, t);
          break;
        case 4:
          e = da, da = !1, iu(l, t), da && (Ai = !0), da = e;
          break;
        case 22:
          t.memoizedState === null && (a.memoizedState !== null ? Uf(t, !1) : iu(l, t));
          break;
        case 30:
          e = da, u = Td(), da = !1, iu(l, t), da && (t.flags |= 4);
          var n = t.memoizedProps, i = t.stateNode;
          l = Ea(n, i), i = Ea(a.memoizedProps, i);
          var c = za(n.default, n.update);
          c === "none" ? l = !1 : (n = a.memoizedState, a.memoizedState = null, a = t.child, _l = 0, l = Hf(
            t,
            a,
            l,
            i,
            c,
            n,
            !0
          ), _l !== (n === null ? 0 : n.length) && (t.flags |= 32)), (t.flags & 4) !== 0 && l ? (mu(
            t,
            t.memoizedProps.onUpdate
          ), oa = u) : u !== null && (u.push.apply(u, oa), oa = u), da = (t.flags & 32) !== 0 ? !0 : e;
          break;
        default:
          iu(l, t);
      }
  }
  function ma(t, l) {
    if (l.subtreeFlags & 8772)
      for (l = l.child; l !== null; )
        Ad(t, l.alternate, l), l = l.sibling;
  }
  function Wa(t, l) {
    for (t = t.child; t !== null; ) {
      var a = t, e = l;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Fa(4, a, a.return), Wa(
            a,
            e
          );
          break;
        case 1:
          sl(a, a.return);
          var u = a.stateNode;
          typeof u.componentWillUnmount == "function" && hd(
            a,
            a.return,
            u
          ), Wa(
            a,
            e
          );
          break;
        case 27:
          (e & 2) !== 0 && jm(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          sl(a, a.return), a.tag !== 5 && a.tag !== 27 || nn(a), Wa(
            a,
            e
          );
          break;
        case 6:
          nn(a);
          break;
        case 26:
          sl(a, a.return), u = a.stateNode, a.memoizedState !== null || u === null || Ot || u.parentNode.removeChild(u), Wa(
            a,
            e
          );
          break;
        case 22:
          a.memoizedState === null && Wa(
            a,
            e
          );
          break;
        case 30:
          sl(a, a.return), Wa(
            a,
            e
          );
          break;
        case 7:
          sl(a, a.return);
        default:
          Wa(
            a,
            e
          );
      }
      t = t.sibling;
    }
  }
  function aa(t, l, a) {
    for (a = (l.subtreeFlags & 8772) !== 0 ? a : a & -2, l = l.child; l !== null; ) {
      var e = l.alternate, u = t, n = l, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          aa(
            u,
            n,
            a
          ), un(4, n);
          break;
        case 1:
          if (aa(
            u,
            n,
            a
          ), e = n, u = e.stateNode, typeof u.componentDidMount == "function")
            try {
              u.componentDidMount();
            } catch (b) {
              At(e, e.return, b);
            }
          if (e = n, u = e.updateQueue, u !== null) {
            var f = e.stateNode;
            try {
              var v = u.shared.hiddenCallbacks;
              if (v !== null)
                for (u.shared.hiddenCallbacks = null, u = 0; u < v.length; u++)
                  ar(v[u], f);
            } catch (b) {
              At(e, e.return, b);
            }
          }
          c && i & 64 && vd(n), fa(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && bd(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || yd(n), aa(
            u,
            n,
            a
          ), c && e === null && i & 4 && pf(n), fa(n, n.return);
          break;
        case 6:
          yd(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || el || Oo(
            yn(f.ownerDocument),
            n.type,
            f
          ), aa(
            u,
            n,
            a
          ), c && e === null && i & 4 && pf(n), fa(n, n.return);
          break;
        case 12:
          aa(
            u,
            n,
            a
          );
          break;
        case 31:
          aa(
            u,
            n,
            a
          ), c && i & 4 && Dd(u, n);
          break;
        case 13:
          aa(
            u,
            n,
            a
          ), c && i & 4 && Ud(u, n);
          break;
        case 22:
          n.memoizedState === null && aa(
            u,
            n,
            a
          ), fa(n, n.return);
          break;
        case 30:
          aa(
            u,
            n,
            a
          ), fa(n, n.return);
          break;
        case 7:
          fa(n, n.return);
        default:
          aa(
            u,
            n,
            a
          );
      }
      l = l.sibling;
    }
  }
  function Xf(t, l) {
    var a = null;
    t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (a = t.memoizedState.cachePool.pool), t = null, l.memoizedState !== null && l.memoizedState.cachePool !== null && (t = l.memoizedState.cachePool.pool), t !== a && (t != null && t.refCount++, a != null && Ku(a));
  }
  function Qf(t, l) {
    t = null, l.alternate !== null && (t = l.alternate.memoizedState.cache), l = l.memoizedState.cache, l !== t && (l.refCount++, t != null && Ku(t));
  }
  function wl(t, l, a, e) {
    var u = (a & 335544064) === a;
    if (l.subtreeFlags & (u ? 10262 : 10256))
      for (l = l.child; l !== null; )
        Hd(
          t,
          l,
          a,
          e
        ), l = l.sibling;
    else u && _d(l);
  }
  function Hd(t, l, a, e) {
    var u = (a & 335544064) === a;
    u && l.alternate === null && l.return !== null && l.return.alternate !== null && Ni(l);
    var n = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        wl(
          t,
          l,
          a,
          e
        ), n & 2048 && un(9, l);
        break;
      case 1:
        wl(
          t,
          l,
          a,
          e
        );
        break;
      case 3:
        wl(
          t,
          l,
          a,
          e
        ), u && Bf && (t = t.containerInfo, t = t.nodeType === 9 ? t.body : t.nodeName === "HTML" ? t.ownerDocument.body : t, t.style.viewTransitionName === "root" && (t.style.viewTransitionName = ""), t = t.ownerDocument.documentElement, t !== null && t.style.viewTransitionName === "none" && (t.style.viewTransitionName = "")), n & 2048 && (n = null, l.alternate !== null && (n = l.alternate.memoizedState.cache), l = l.memoizedState.cache, l !== n && (l.refCount++, n != null && Ku(n)));
        break;
      case 12:
        if (n & 2048) {
          wl(
            t,
            l,
            a,
            e
          ), n = l.stateNode;
          try {
            var i = l.memoizedProps, c = i.id, f = i.onPostCommit;
            typeof f == "function" && f(
              c,
              l.alternate === null ? "mount" : "update",
              n.passiveEffectDuration,
              -0
            );
          } catch (v) {
            At(l, l.return, v);
          }
        } else
          wl(
            t,
            l,
            a,
            e
          );
        break;
      case 31:
        wl(
          t,
          l,
          a,
          e
        );
        break;
      case 13:
        wl(
          t,
          l,
          a,
          e
        );
        break;
      case 23:
        break;
      case 22:
        i = l.stateNode, c = l.alternate, l.memoizedState !== null ? (u && c !== null && c.memoizedState === null && Ni(c), i._visibility & 2 ? wl(
          t,
          l,
          a,
          e
        ) : fn(
          t,
          l
        )) : (u && c !== null && c.memoizedState !== null && Ni(l), i._visibility & 2 ? wl(
          t,
          l,
          a,
          e
        ) : (i._visibility |= 2, cu(
          t,
          l,
          a,
          e,
          (l.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Xf(c, l);
        break;
      case 24:
        wl(
          t,
          l,
          a,
          e
        ), n & 2048 && Qf(l.alternate, l);
        break;
      case 30:
        u && (n = l.alternate, n !== null && (sa(n.child, !0), sa(l.child, !0))), wl(
          t,
          l,
          a,
          e
        );
        break;
      default:
        wl(
          t,
          l,
          a,
          e
        );
    }
  }
  function cu(t, l, a, e, u) {
    for (u = u && ((l.subtreeFlags & 10256) !== 0 || !1), l = l.child; l !== null; ) {
      var n = t, i = l, c = a, f = e, v = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          cu(
            n,
            i,
            c,
            f,
            u
          ), un(8, i);
          break;
        case 23:
          break;
        case 22:
          var b = i.stateNode;
          i.memoizedState !== null ? b._visibility & 2 ? cu(
            n,
            i,
            c,
            f,
            u
          ) : fn(
            n,
            i
          ) : (b._visibility |= 2, cu(
            n,
            i,
            c,
            f,
            u
          )), u && v & 2048 && Xf(
            i.alternate,
            i
          );
          break;
        case 24:
          cu(
            n,
            i,
            c,
            f,
            u
          ), u && v & 2048 && Qf(i.alternate, i);
          break;
        default:
          cu(
            n,
            i,
            c,
            f,
            u
          );
      }
      l = l.sibling;
    }
  }
  function fn(t, l) {
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; ) {
        var a = t, e = l, u = e.flags;
        switch (e.tag) {
          case 22:
            fn(a, e), u & 2048 && Xf(
              e.alternate,
              e
            );
            break;
          case 24:
            fn(a, e), u & 2048 && Qf(e.alternate, e);
            break;
          default:
            fn(a, e);
        }
        l = l.sibling;
      }
  }
  var Me = 8192;
  function De(t, l, a) {
    if (t.subtreeFlags & Me)
      for (t = t.child; t !== null; )
        qd(
          t,
          l,
          a
        ), t = t.sibling;
  }
  function qd(t, l, a) {
    switch (t.tag) {
      case 26:
        De(
          t,
          l,
          a
        ), t.flags & Me && (t.memoizedState !== null ? Ih(
          a,
          la,
          t.memoizedState,
          t.memoizedProps
        ) : (t = t.stateNode, (l & 335544128) === l && Vm(a, t)));
        break;
      case 5:
        De(
          t,
          l,
          a
        ), t.flags & Me && (t = t.stateNode, (l & 335544128) === l && Vm(a, t));
        break;
      case 3:
      case 4:
        var e = la;
        la = yn(t.stateNode.containerInfo), De(
          t,
          l,
          a
        ), la = e;
        break;
      case 22:
        t.memoizedState === null && (e = t.alternate, e !== null && e.memoizedState !== null ? (e = Me, Me = 16777216, De(
          t,
          l,
          a
        ), Me = e) : De(
          t,
          l,
          a
        ));
        break;
      case 30:
        if ((t.flags & Me) !== 0 && (e = t.memoizedProps.name, e != null && e !== "auto")) {
          var u = t.stateNode;
          u.paired = null, Hl === null && (Hl = /* @__PURE__ */ new Map()), Hl.set(e, u);
        }
        De(
          t,
          l,
          a
        );
        break;
      default:
        De(
          t,
          l,
          a
        );
    }
  }
  function Bd(t) {
    var l = t.alternate;
    if (l !== null && (t = l.child, t !== null)) {
      l.child = null;
      do
        l = t.sibling, t.sibling = null, t = l;
      while (t !== null);
    }
  }
  function on(t) {
    var l = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (l !== null)
        for (var a = 0; a < l.length; a++) {
          var e = l[a];
          ul = e, Gd(
            e,
            t
          );
        }
      Bd(t);
    }
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        Yd(t), t = t.sibling;
  }
  function Yd(t) {
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        on(t), t.flags & 2048 && Fa(9, t, t.return);
        break;
      case 3:
        on(t);
        break;
      case 12:
        on(t);
        break;
      case 22:
        var l = t.stateNode;
        t.memoizedState !== null && l._visibility & 2 && (t.return === null || t.return.tag !== 13) ? (l._visibility &= -3, Mi(t)) : on(t);
        break;
      default:
        on(t);
    }
  }
  function Mi(t) {
    var l = t.deletions;
    if ((t.flags & 16) !== 0) {
      if (l !== null)
        for (var a = 0; a < l.length; a++) {
          var e = l[a];
          ul = e, Gd(
            e,
            t
          );
        }
      Bd(t);
    }
    for (t = t.child; t !== null; ) {
      switch (l = t, l.tag) {
        case 0:
        case 11:
        case 15:
          Fa(8, l, l.return), Mi(l);
          break;
        case 22:
          a = l.stateNode, a._visibility & 2 && (a._visibility &= -3, Mi(l));
          break;
        default:
          Mi(l);
      }
      t = t.sibling;
    }
  }
  function Gd(t, l) {
    for (; ul !== null; ) {
      var a = ul;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Fa(8, a, l);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var e = a.memoizedState.cachePool.pool;
            e != null && e.refCount++;
          }
          break;
        case 24:
          Ku(a.memoizedState.cache);
      }
      if (e = a.child, e !== null) e.return = a, ul = e;
      else
        t: for (a = t; ul !== null; ) {
          e = ul;
          var u = e.sibling, n = e.return;
          if (Cd(e), e === a) {
            ul = null;
            break t;
          }
          if (u !== null) {
            u.return = n, ul = u;
            break t;
          }
          ul = n;
        }
    }
  }
  var wv = {
    getCacheForType: function(t) {
      var l = cl($t), a = l.data.get(t);
      return a === void 0 && (a = t(), l.data.set(t, a)), a;
    },
    cacheSignal: function() {
      return cl($t).controller.signal;
    }
  }, Jv = typeof WeakMap == "function" ? WeakMap : Map, zt = 0, Ut = null, mt = null, yt = 0, Nt = 0, ql = null, Ia = !1, fu = !1, Lf = !1, Ua = 0, Zt = 0, ka = 0, Ue = 0, Di = 0, Bl = 0, ou = 0, sn = null, Nl = null, Vf = !1, Ui = 0, Xd = 0, Ri = 1 / 0, ji = null, Pa = null, Qt = 0, ea = null, Re = null, va = 0, Zf = 0, Kf = null, Qd = null, su = null, ru = null, du = null, rn = 0, xi = null;
  function Yl() {
    return (zt & 2) !== 0 && yt !== 0 ? yt & -yt : j.T !== null ? lo() : Zo();
  }
  function Ld() {
    if (Bl === 0)
      if ((yt & 536870912) === 0 || ot) {
        var t = Cn;
        Cn <<= 1, (Cn & 3932160) === 0 && (Cn = 262144), Bl = t;
      } else Bl = 536870912;
    return t = fl.current, t !== null && (t.flags |= 32), Bl;
  }
  function mu(t, l) {
    if (l != null) {
      var a = t.stateNode, e = a.ref;
      e === null && (e = a.ref = zm(
        Ea(t.memoizedProps, a)
      )), ru === null && (ru = []), ru.push(l.bind(null, e));
    }
  }
  function Al(t, l, a) {
    (t === Ut && (Nt === 2 || Nt === 9) || t.cancelPendingCommit !== null) && (vu(t, 0), te(
      t,
      yt,
      Bl,
      !1
    )), Uu(t, a), ((zt & 2) === 0 || t !== Ut) && (t === Ut && ((zt & 2) === 0 && (Ue |= a), Zt === 4 && te(
      t,
      yt,
      Bl,
      !1
    )), ha(t));
  }
  function Vd(t, l, a) {
    if ((zt & 6) !== 0) throw Error(d(327));
    var e = !a && (l & 127) === 0 && (l & t.expiredLanes) === 0 || Du(t, l), u = e ? Wv(t, l) : Jf(t, l, !0), n = e;
    do {
      if (u === 0) {
        fu && !e && te(t, l, 0, !1);
        break;
      } else {
        if (a = t.current.alternate, n && !$v(a)) {
          u = Jf(t, l, !1), n = !1;
          continue;
        }
        if (u === 2) {
          if (n = l, t.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = t.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            l = i;
            t: {
              var c = t;
              u = sn;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (vu(c, i).flags |= 256), i = Jf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Lf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Ue |= n, u = 4;
                  break t;
                }
                n = Nl, Nl = u, n !== null && (Nl === null ? Nl = n : Nl.push.apply(
                  Nl,
                  n
                ));
              }
              u = i;
            }
            if (n = !1, u !== 2) continue;
          }
        }
        if (u === 1) {
          vu(t, 0), te(t, l, 0, !0);
          break;
        }
        t: {
          switch (e = t, n = u, n) {
            case 0:
            case 1:
              throw Error(d(345));
            case 4:
              if ((l & 4194048) !== l && (l & 62914560) !== l)
                break;
            case 6:
              te(
                e,
                l,
                Bl,
                !Ia
              );
              break t;
            case 2:
              Nl = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(d(329));
          }
          if ((l & 62914560) === l && (u = Ui + 300 - $(), 10 < u)) {
            if (te(
              e,
              l,
              Bl,
              !Ia
            ), Dn(e, 0, !0) !== 0) break t;
            va = l, e.timeoutHandle = mo(
              Zd.bind(
                null,
                e,
                a,
                Nl,
                ji,
                Vf,
                l,
                Bl,
                Ue,
                ou,
                Ia,
                n,
                "Throttled",
                -0,
                0
              ),
              u
            );
            break t;
          }
          Zd(
            e,
            a,
            Nl,
            ji,
            Vf,
            l,
            Bl,
            Ue,
            ou,
            Ia,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    ha(t);
  }
  function Zd(t, l, a, e, u, n, i, c, f, v, b, z, r, y) {
    t.timeoutHandle = -1;
    var p = l.subtreeFlags, Y = (n & 335544064) === n;
    if (z = null, (Y || p & 8192 || (p & 16785408) === 16785408) && (z = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: na
    }, Hl = null, qd(
      l,
      n,
      z
    ), Y && (p = z, Y = t.containerInfo, Y = (Y.nodeType === 9 ? Y : Y.ownerDocument).__reactViewTransition, Y != null && (p.count++, p.waitingForViewTransition = !0, p = Sn.bind(p), Y.finished.then(p, p))), p = (n & 62914560) === n ? Ui - $() : (n & 4194048) === n ? Xd - $() : 0, p = kh(
      z,
      p
    ), p !== null)) {
      va = n, t.cancelPendingCommit = p(
        kd.bind(
          null,
          t,
          l,
          n,
          a,
          e,
          u,
          i,
          c,
          f,
          v,
          b,
          z,
          null,
          r,
          y
        )
      ), te(t, n, i, !v);
      return;
    }
    kd(
      t,
      l,
      n,
      a,
      e,
      u,
      i,
      c,
      f,
      v,
      b,
      z
    );
  }
  function $v(t) {
    for (var l = t; ; ) {
      var a = l.tag;
      if ((a === 0 || a === 11 || a === 15) && l.flags & 16384 && (a = l.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var e = 0; e < a.length; e++) {
          var u = a[e], n = u.getSnapshot;
          u = u.value;
          try {
            if (!jl(n(), u)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = l.child, l.subtreeFlags & 16384 && a !== null)
        a.return = l, l = a;
      else {
        if (l === t) break;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t) return !0;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    }
    return !0;
  }
  function te(t, l, a, e) {
    l = Go(t, l), l &= ~Di, l &= ~Ue, t.suspendedLanes |= l, t.pingedLanes &= ~l, e && (t.warmLanes |= l), e = t.expirationTimes;
    for (var u = l; 0 < u; ) {
      var n = 31 - Ul(u), i = 1 << n;
      e[n] = -1, u &= ~i;
    }
    a !== 0 && Qo(t, a, l);
  }
  function Hi() {
    return (zt & 6) === 0 ? (dn(0), !1) : !0;
  }
  function wf() {
    if (mt !== null) {
      if (Nt === 0)
        var t = mt.return;
      else
        t = mt, Na = Se = null, Pc(t), tu = null, $u = 0, t = mt;
      for (; t !== null; )
        md(t.alternate, t), t = t.return;
      mt = null;
    }
  }
  function vu(t, l) {
    var a = t.timeoutHandle;
    return a !== -1 && (t.timeoutHandle = -1, bh(a)), a = t.cancelPendingCommit, a !== null && (t.cancelPendingCommit = null, a()), va = 0, wf(), Ut = t, mt = a = _a(t.current, null), yt = l, Nt = 0, ql = null, Ia = !1, fu = Du(t, l), Lf = !1, ou = Bl = Di = Ue = ka = Zt = 0, Nl = sn = null, Vf = !1, Ua = Go(t, l), Vn(), a;
  }
  function Kd(t, l) {
    lt = null, j.H = vi, l === Pe || l === ti ? (l = ks(), Nt = 3) : l === Xc ? (l = ks(), Nt = 4) : Nt = l === hf ? 8 : l !== null && typeof l == "object" && typeof l.then == "function" ? 6 : 1, ql = l, mt === null && (Zt = 1, hi(
      t,
      Ll(l, t.current)
    ));
  }
  function wd() {
    var t = fl.current;
    return t === null ? !0 : (yt & 4194048) === yt ? vl === null : (yt & 62914560) === yt || (yt & 536870912) !== 0 ? t === vl : !1;
  }
  function Jd() {
    var t = j.H;
    return j.H = vi, t === null ? vi : t;
  }
  function $d() {
    var t = j.A;
    return j.A = wv, t;
  }
  function qi() {
    Zt = 4, Ia || (yt & 4194048) !== yt && fl.current !== null || (fu = !0), (ka & 134217727) === 0 && (Ue & 134217727) === 0 || Ut === null || te(
      Ut,
      yt,
      Bl,
      !1
    );
  }
  function Jf(t, l, a) {
    var e = zt;
    zt |= 2;
    var u = Jd(), n = $d();
    (Ut !== t || yt !== l) && (ji = null, vu(t, l)), l = !1;
    var i = Zt;
    t: do
      try {
        if (Nt !== 0 && mt !== null) {
          var c = mt, f = ql;
          switch (Nt) {
            case 8:
              wf(), i = 6;
              break t;
            case 3:
            case 2:
            case 9:
            case 6:
              fl.current === null && (l = !0);
              var v = Nt;
              if (Nt = 0, ql = null, hu(t, c, f, v), a && fu) {
                i = 0;
                break t;
              }
              break;
            default:
              v = Nt, Nt = 0, ql = null, hu(t, c, f, v);
          }
        }
        Fv(), i = Zt;
        break;
      } catch (b) {
        Kd(t, b);
      }
    while (!0);
    return l && t.shellSuspendCounter++, Na = Se = null, zt = e, j.H = u, j.A = n, mt === null && (Ut = null, yt = 0, Vn()), i;
  }
  function Fv() {
    for (; mt !== null; ) Fd(mt);
  }
  function Wv(t, l) {
    var a = zt;
    zt |= 2;
    var e = Jd(), u = $d();
    Ut !== t || yt !== l ? (ji = null, Ri = $() + 500, vu(t, l)) : fu = Du(
      t,
      l
    );
    t: do
      try {
        if (Nt !== 0 && mt !== null) {
          l = mt;
          var n = ql;
          l: switch (Nt) {
            case 1:
              Nt = 0, ql = null, hu(t, l, n, 1);
              break;
            case 2:
            case 9:
              if (Ws(n)) {
                Nt = 0, ql = null, Wd(l);
                break;
              }
              l = function() {
                Nt !== 2 && Nt !== 9 || Ut !== t || (Nt = 7), ha(t);
              }, n.then(l, l);
              break t;
            case 3:
              Nt = 7;
              break t;
            case 4:
              Nt = 5;
              break t;
            case 7:
              Ws(n) ? (Nt = 0, ql = null, Wd(l)) : (Nt = 0, ql = null, hu(t, l, n, 7));
              break;
            case 5:
              var i = null;
              switch (mt.tag) {
                case 26:
                  i = mt.memoizedState;
                case 5:
                case 27:
                  var c = mt;
                  if (i ? Qm(i) : c.stateNode.complete) {
                    Nt = 0, ql = null;
                    var f = c.sibling;
                    if (f !== null) mt = f;
                    else {
                      var v = c.return;
                      v !== null ? (mt = v, Bi(v)) : mt = null;
                    }
                    break l;
                  }
              }
              Nt = 0, ql = null, hu(t, l, n, 5);
              break;
            case 6:
              Nt = 0, ql = null, hu(t, l, n, 6);
              break;
            case 8:
              wf(), Zt = 6;
              break t;
            default:
              throw Error(d(462));
          }
        }
        Iv();
        break;
      } catch (b) {
        Kd(t, b);
      }
    while (!0);
    return Na = Se = null, j.H = e, j.A = u, zt = a, mt !== null ? 0 : (Ut = null, yt = 0, Vn(), Zt);
  }
  function Iv() {
    for (; mt !== null && !An(); )
      Fd(mt);
  }
  function Fd(t) {
    var l = rd(t.alternate, t, Ua);
    t.memoizedProps = t.pendingProps, l === null ? Bi(t) : mt = l;
  }
  function Wd(t) {
    var l = t, a = l.alternate;
    switch (l.tag) {
      case 15:
      case 0:
        l = ud(
          a,
          l,
          l.pendingProps,
          l.type,
          void 0,
          yt
        );
        break;
      case 11:
        l = ud(
          a,
          l,
          l.pendingProps,
          l.type.render,
          l.ref,
          yt
        );
        break;
      case 5:
        Pc(l);
        var e = l;
        e === al && (ot ? (Fn(e), e.tag === 5 && e.stateNode != null && (xt = e.stateNode)) : (Fn(e), ot = !0));
      default:
        md(a, l), l = mt = Gs(l, Ua), l = rd(a, l, Ua);
    }
    t.memoizedProps = t.pendingProps, l === null ? Bi(t) : mt = l;
  }
  function hu(t, l, a, e) {
    Na = Se = null, Pc(l), tu = null, $u = 0;
    var u = l.return;
    try {
      if (Yv(
        t,
        u,
        l,
        a,
        yt
      )) {
        Zt = 1, hi(
          t,
          Ll(a, t.current)
        ), mt = null;
        return;
      }
    } catch (n) {
      if (u !== null) throw mt = u, n;
      Zt = 1, hi(
        t,
        Ll(a, t.current)
      ), mt = null;
      return;
    }
    l.flags & 32768 ? (ot || e === 1 ? t = !0 : fu || (yt & 536870912) !== 0 ? t = !1 : (Ia = t = !0, (e === 2 || e === 9 || e === 3 || e === 6) && (e = fl.current, e !== null && e.tag === 13 && (e.flags |= 16384))), Id(l, t)) : Bi(l);
  }
  function Bi(t) {
    var l = t;
    do {
      if ((l.flags & 32768) !== 0) {
        Id(
          l,
          Ia
        );
        return;
      }
      t = l.return;
      var a = Lv(
        l.alternate,
        l,
        Ua
      );
      if (a !== null) {
        mt = a;
        return;
      }
      if (l = l.sibling, l !== null) {
        mt = l;
        return;
      }
      mt = l = t;
    } while (l !== null);
    Zt === 0 && (Zt = 5);
  }
  function Id(t, l) {
    do {
      var a = Vv(t.alternate, t);
      if (a !== null) {
        a.flags &= 32767, mt = a;
        return;
      }
      if (a = t.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !l && (t = t.sibling, t !== null)) {
        mt = t;
        return;
      }
      mt = t = a;
    } while (t !== null);
    Zt = 6, mt = null;
  }
  function kd(t, l, a, e, u, n, i, c, f, v, b, z) {
    t.cancelPendingCommit = null;
    do
      Yi();
    while (Qt !== 0);
    if ((zt & 6) !== 0) throw Error(d(327));
    if (l !== null) {
      if (l === t.current) throw Error(d(177));
      t === Ut && (mt = Ut = null, yt = 0), Re = l, ea = t, va = a, Kf = u, Qd = e, kv(
        t,
        l,
        a,
        i,
        c,
        f,
        z
      );
    }
  }
  function kv(t, l, a, e, u, n, i) {
    var c = l.lanes | l.childLanes;
    if (Zf = c, c |= pc, O0(
      t,
      a,
      c,
      e,
      u,
      n
    ), ru = null, (a & 335544064) === a ? (du = Av(t), e = 10262) : (du = null, e = 10256), (l.subtreeFlags & e) !== 0 || (l.flags & e) !== 0 ? (t.callbackNode = null, t.callbackPriority = 0, uh(xa, function() {
      return If(), null;
    })) : (t.callbackNode = null, t.callbackPriority = 0), _i = !1, e = (l.flags & 13878) !== 0, (l.subtreeFlags & 13878) !== 0 || e) {
      e = j.T, j.T = null, u = V.p, V.p = 2, n = zt, zt |= 4;
      try {
        Zv(t, l, a);
      } finally {
        zt = n, V.p = u, j.T = e;
      }
    }
    Qt = 1, _i ? su = Oh(
      i,
      t.containerInfo,
      du,
      $f,
      Ff,
      th,
      Wf,
      If,
      Pv
    ) : ($f(), Ff(), Wf());
  }
  function Pv(t) {
    if (Qt !== 0) {
      var l = ea.onRecoverableError;
      l(t, { componentStack: null });
    }
  }
  function th() {
    Qt === 3 && (Qt = 0, xd(Re, ea), Qt = 4);
  }
  function $f() {
    if (Qt === 1) {
      Qt = 0;
      var t = ea, l = Re, a = va, e = (l.flags & 13878) !== 0;
      if ((l.subtreeFlags & 13878) !== 0 || e) {
        e = j.T, j.T = null;
        var u = V.p;
        V.p = 2;
        var n = zt;
        zt |= 4;
        try {
          cn = Ai = !1, Rd(l, t, a), a = oo;
          var i = Ms(t.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Cs(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && zc(c)) {
              var v = f.start, b = f.end;
              if (b === void 0 && (b = v), "selectionStart" in c)
                c.selectionStart = v, c.selectionEnd = Math.min(
                  b,
                  c.value.length
                );
              else {
                var z = c.ownerDocument || document, r = z && z.defaultView || window;
                if (r.getSelection) {
                  var y = r.getSelection(), p = c.textContent.length, Y = Math.min(f.start, p), at = f.end === void 0 ? Y : Math.min(f.end, p);
                  !y.extend && Y > at && (i = at, at = Y, Y = i);
                  var m = ps(
                    c,
                    Y
                  ), o = ps(
                    c,
                    at
                  );
                  if (m && o && (y.rangeCount !== 1 || y.anchorNode !== m.node || y.anchorOffset !== m.offset || y.focusNode !== o.node || y.focusOffset !== o.offset)) {
                    var h = z.createRange();
                    h.setStart(m.node, m.offset), y.removeAllRanges(), Y > at ? (y.addRange(h), y.extend(o.node, o.offset)) : (h.setEnd(o.node, o.offset), y.addRange(h));
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
          _u = !!fo, oo = fo = null;
        } finally {
          zt = n, V.p = u, j.T = e;
        }
      }
      t.current = l, Qt = 2;
    }
  }
  function Ff() {
    if (Qt === 2) {
      Qt = 0;
      var t = ea, l = Re, a = (l.flags & 8772) !== 0;
      if ((l.subtreeFlags & 8772) !== 0 || a) {
        a = j.T, j.T = null;
        var e = V.p;
        V.p = 2;
        var u = zt;
        zt |= 4;
        try {
          Ad(t, l.alternate, l);
        } finally {
          zt = u, V.p = e, j.T = a;
        }
      }
      Qt = 3;
    }
  }
  function Wf() {
    if (Qt === 4 || Qt === 3) {
      Qt = 0;
      var t = su;
      su = null, S();
      var l = ea, a = Re, e = va, u = Qd, n = (e & 335544064) === e ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Qt = 5 : (Qt = 0, Re = ea = null, Pd(l, l.pendingLanes)), n = l.pendingLanes, n === 0 && (Pa = null), uc(e), a = a.stateNode, Dl && typeof Dl.onCommitFiberRoot == "function")
        try {
          Dl.onCommitFiberRoot(
            Mu,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        a = j.T, n = V.p, V.p = 2, j.T = null;
        try {
          for (var i = l.onRecoverableError, c = 0; c < u.length; c++) {
            var f = u[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          j.T = a, V.p = n;
        }
      }
      if (u = ru, i = du, du = null, u !== null && (ru = null, i === null && (i = []), t !== null))
        for (f = 0; f < u.length; f++)
          a = (0, u[f])(
            i
          ), a !== void 0 && t.finished.finally(a);
      (va & 3) !== 0 && Yi(), ha(l), n = l.pendingLanes, (e & 261930) !== 0 && (n & 42) !== 0 ? l === xi ? rn++ : (rn = 0, xi = l) : (rn = 0, xi = null), dn(0);
    }
  }
  function Pd(t, l) {
    (t.pooledCacheLanes &= l) === 0 && (l = t.pooledCache, l != null && (t.pooledCache = null, Ku(l)));
  }
  function Yi() {
    return su !== null && (su.skipTransition(), su = null), $f(), Ff(), Wf(), If();
  }
  function If() {
    if (Qt !== 5) return !1;
    var t = ea, l = Zf;
    Zf = 0;
    var a = uc(va), e = j.T, u = V.p;
    try {
      V.p = 32 > a ? 32 : a, j.T = null, a = Kf, Kf = null;
      var n = ea, i = va;
      if (Qt = 0, Re = ea = null, va = 0, (zt & 6) !== 0) throw Error(d(331));
      var c = zt;
      if (zt |= 4, Yd(n.current), Hd(
        n,
        n.current,
        i,
        a
      ), zt = c, dn(0, !1), Dl && typeof Dl.onPostCommitFiberRoot == "function")
        try {
          Dl.onPostCommitFiberRoot(Mu, n);
        } catch {
        }
      return !0;
    } finally {
      V.p = u, j.T = e, Pd(t, l);
    }
  }
  function tm(t, l, a) {
    l = Ll(a, l), l = vf(t.stateNode, l, 2), t = Ka(t, l, 2), t !== null && (Uu(t, 2), ha(t));
  }
  function At(t, l, a) {
    if (t.tag === 3)
      tm(t, t, a);
    else
      for (; l !== null; ) {
        if (l.tag === 3) {
          tm(
            l,
            t,
            a
          );
          break;
        } else if (l.tag === 1) {
          var e = l.stateNode;
          if (typeof l.type.getDerivedStateFromError == "function" || typeof e.componentDidCatch == "function" && (Pa === null || !Pa.has(e))) {
            t = Ll(a, t), a = Wr(2), e = Ka(l, a, 2), e !== null && (Ir(
              a,
              e,
              l,
              t
            ), Uu(e, 2), ha(e));
            break;
          }
        }
        l = l.return;
      }
  }
  function kf(t, l, a) {
    var e = t.pingCache;
    if (e === null) {
      e = t.pingCache = new Jv();
      var u = /* @__PURE__ */ new Set();
      e.set(l, u);
    } else
      u = e.get(l), u === void 0 && (u = /* @__PURE__ */ new Set(), e.set(l, u));
    u.has(a) || (Lf = !0, u.add(a), t = lh.bind(null, t, l, a), l.then(t, t));
  }
  function lh(t, l, a) {
    var e = t.pingCache;
    e !== null && e.delete(l), t.pingedLanes |= t.suspendedLanes & a, t.warmLanes &= ~a, Ut === t && (yt & a) === a && ((Zt === 4 || Zt === 3 && (yt & 62914560) === yt && 300 > $() - Ui) && (zt & 2) === 0 ? vu(t, 0) : Di |= a, ou === yt && (ou = 0)), ha(t);
  }
  function lm(t, l) {
    l === 0 && (l = Xo()), t = ye(t, l), t !== null && (Uu(t, l), ha(t));
  }
  function ah(t) {
    var l = t.memoizedState, a = 0;
    l !== null && (a = l.retryLane), lm(t, a);
  }
  function eh(t, l) {
    var a = 0;
    switch (t.tag) {
      case 31:
      case 13:
        var e = t.stateNode, u = t.memoizedState;
        u !== null && (a = u.retryLane);
        break;
      case 19:
        e = t.stateNode;
        break;
      case 22:
        e = t.stateNode._retryCache;
        break;
      default:
        throw Error(d(314));
    }
    e !== null && e.delete(l), lm(t, a);
  }
  function uh(t, l) {
    return Cu(t, l);
  }
  var yu = null, gu = null, Pf = !1, Gi = !1, to = !1, le = 0;
  function ha(t) {
    t !== gu && t.next === null && (gu === null ? yu = gu = t : gu = gu.next = t), Gi = !0, Pf || (Pf = !0, ih());
  }
  function dn(t, l) {
    if (!to && Gi) {
      to = !0;
      do
        for (var a = !1, e = yu; e !== null; ) {
          if (t !== 0) {
            var u = e.pendingLanes;
            if (u === 0) var n = 0;
            else {
              var i = e.suspendedLanes, c = e.pingedLanes;
              n = (1 << 31 - Ul(42 | t) + 1) - 1, n &= u & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, nm(e, n));
          } else
            n = yt, n = Dn(
              e,
              e === Ut ? n : 0,
              e.cancelPendingCommit !== null || e.timeoutHandle !== -1
            ), (n & 3) === 0 || Du(e, n) || (a = !0, nm(e, n));
          e = e.next;
        }
      while (a);
      to = !1;
    }
  }
  function nh() {
    am();
  }
  function am() {
    Gi = Pf = !1;
    var t = 0;
    le !== 0 && gh() && (t = le);
    for (var l = $(), a = null, e = yu; e !== null; ) {
      var u = e.next, n = em(e, l);
      n === 0 ? (e.next = null, a === null ? yu = u : a.next = u, u === null && (gu = a)) : (a = e, (t !== 0 || (n & 3) !== 0) && (Gi = !0)), e = u;
    }
    Qt !== 0 && Qt !== 5 || dn(t), le !== 0 && (le = 0);
  }
  function em(t, l) {
    for (var a = t.suspendedLanes, e = t.pingedLanes, u = t.expirationTimes, n = t.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Ul(n), c = 1 << i, f = u[i];
      f === -1 ? ((c & a) === 0 || (c & e) !== 0) && (u[i] = _0(c, l)) : f <= l && (t.expiredLanes |= c), n &= ~c;
    }
    if (l = Ut, a = yt, a = Dn(
      t,
      t === l ? a : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), e = t.callbackNode, a === 0 || t === l && (Nt === 2 || Nt === 9) || t.cancelPendingCommit !== null)
      return e !== null && e !== null && se(e), t.callbackNode = null, t.callbackPriority = 0;
    if ((a & 3) === 0 || Du(t, a)) {
      if (l = a & -a, l === t.callbackPriority) return l;
      switch (e !== null && se(e), uc(a)) {
        case 2:
        case 8:
          a = Ml;
          break;
        case 32:
          a = xa;
          break;
        case 268435456:
          a = Yo;
          break;
        default:
          a = xa;
      }
      return e = um.bind(null, t), a = Cu(a, e), t.callbackPriority = l, t.callbackNode = a, l;
    }
    return e !== null && e !== null && se(e), t.callbackPriority = 2, t.callbackNode = null, 2;
  }
  function um(t, l) {
    if (Qt !== 0 && Qt !== 5)
      return t.callbackNode = null, t.callbackPriority = 0, null;
    var a = t.callbackNode;
    if (Yi() && t.callbackNode !== a)
      return null;
    var e = yt;
    return e = Dn(
      t,
      t === Ut ? e : 0,
      t.cancelPendingCommit !== null || t.timeoutHandle !== -1
    ), e === 0 ? null : (Vd(t, e, l), em(t, $()), t.callbackNode != null && t.callbackNode === a ? um.bind(null, t) : null);
  }
  function nm(t, l) {
    if (Yi()) return null;
    Vd(t, l, !0);
  }
  function ih() {
    Sh(function() {
      (zt & 6) !== 0 ? Cu(
        jt,
        nh
      ) : am();
    });
  }
  function lo() {
    if (le === 0) {
      var t = ze;
      t === 0 && (t = pn, pn <<= 1, (pn & 261888) === 0 && (pn = 256)), le = t;
    }
    return le;
  }
  function im(t) {
    return t == null || typeof t == "symbol" || typeof t == "boolean" ? null : typeof t == "function" ? t : Hn(t);
  }
  function ch(t, l, a, e, u) {
    if (l === "submit" && a && a.stateNode === u) {
      var n = im(
        (u[El] || null).action
      ), i = e.submitter;
      i && (l = (l = i[El] || null) ? im(l.formAction) : i.getAttribute("formAction"), l !== null && (n = l, i = null));
      var c = new Gn(
        "action",
        "action",
        null,
        e,
        u
      );
      t.push({
        event: c,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (e.defaultPrevented) {
                if (le !== 0) {
                  var f = new FormData(u, i);
                  of(
                    a,
                    {
                      pending: !0,
                      data: f,
                      method: u.method,
                      action: n
                    },
                    null,
                    f
                  );
                }
              } else
                typeof n == "function" && (c.preventDefault(), f = new FormData(u, i), of(
                  a,
                  {
                    pending: !0,
                    data: f,
                    method: u.method,
                    action: n
                  },
                  n,
                  f
                ));
            },
            currentTarget: u
          }
        ]
      });
    }
  }
  for (var ao = 0; ao < Ac.length; ao++) {
    var eo = Ac[ao], fh = eo.toLowerCase(), oh = eo[0].toUpperCase() + eo.slice(1);
    Pl(
      fh,
      "on" + oh
    );
  }
  Pl(Rs, "onAnimationEnd"), Pl(js, "onAnimationIteration"), Pl(xs, "onAnimationStart"), Pl("dblclick", "onDoubleClick"), Pl("focusin", "onFocus"), Pl("focusout", "onBlur"), Pl(bv, "onTransitionRun"), Pl(Sv, "onTransitionStart"), Pl(Tv, "onTransitionCancel"), Pl(Hs, "onTransitionEnd"), Ge("onMouseEnter", ["mouseout", "mouseover"]), Ge("onMouseLeave", ["mouseout", "mouseover"]), Ge("onPointerEnter", ["pointerout", "pointerover"]), Ge("onPointerLeave", ["pointerout", "pointerover"]), me(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), me(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), me("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), me(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), me(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), me(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var mn = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), sh = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(mn)
  );
  function cm(t, l) {
    l = (l & 4) !== 0;
    for (var a = 0; a < t.length; a++) {
      var e = t[a], u = e.event;
      e = e.listeners;
      t: {
        var n = void 0;
        if (l)
          for (var i = e.length - 1; 0 <= i; i--) {
            var c = e[i], f = c.instance, v = c.currentTarget;
            if (c = c.listener, f !== n && u.isPropagationStopped())
              break t;
            n = c, u.currentTarget = v;
            try {
              n(u);
            } catch (b) {
              Ln(b);
            }
            u.currentTarget = null, n = f;
          }
        else
          for (i = 0; i < e.length; i++) {
            if (c = e[i], f = c.instance, v = c.currentTarget, c = c.listener, f !== n && u.isPropagationStopped())
              break t;
            n = c, u.currentTarget = v;
            try {
              n(u);
            } catch (b) {
              Ln(b);
            }
            u.currentTarget = null, n = f;
          }
      }
    }
  }
  function vt(t, l) {
    var a = l[wo];
    a === void 0 && (a = l[wo] = /* @__PURE__ */ new Set());
    var e = t + "__bubble";
    a.has(e) || (fm(l, t, 2, !1), a.add(e));
  }
  function uo(t, l, a) {
    var e = 0;
    l && (e |= 4), fm(
      a,
      t,
      e,
      l
    );
  }
  var Xi = "_reactListening" + Math.random().toString(36).slice(2);
  function no(t) {
    if (!t[Xi]) {
      t[Xi] = !0, Fo.forEach(function(a) {
        a !== "selectionchange" && (sh.has(a) || uo(a, !1, t), uo(a, !0, t));
      });
      var l = t.nodeType === 9 ? t : t.ownerDocument;
      l === null || l[Xi] || (l[Xi] = !0, uo("selectionchange", !1, l));
    }
  }
  function fm(t, l, a, e) {
    switch (Im(l)) {
      case 2:
        var u = ay;
        break;
      case 8:
        u = ey;
        break;
      default:
        u = Ao;
    }
    a = u.bind(
      null,
      l,
      a,
      t
    ), u = void 0, !dc || l !== "touchstart" && l !== "touchmove" && l !== "wheel" || (u = !0), e ? u !== void 0 ? t.addEventListener(l, a, {
      capture: !0,
      passive: u
    }) : t.addEventListener(l, a, !0) : u !== void 0 ? t.addEventListener(l, a, {
      passive: u
    }) : t.addEventListener(l, a, !1);
  }
  function io(t, l, a, e, u) {
    var n = e;
    if ((l & 1) === 0 && (l & 2) === 0 && e !== null)
      t: for (; ; ) {
        if (e === null) return;
        var i = e.tag;
        if (i === 3 || i === 4) {
          var c = e.stateNode.containerInfo;
          if (c === u) break;
          if (i === 4)
            for (i = e.return; i !== null; ) {
              var f = i.tag;
              if ((f === 3 || f === 4) && i.stateNode.containerInfo === u)
                return;
              i = i.return;
            }
          for (; c !== null; ) {
            if (i = de(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              e = n = i;
              continue t;
            }
            c = c.parentNode;
          }
        }
        e = e.return;
      }
    fs(function() {
      var v = n, b = sc(a), z = [];
      t: {
        var r = qs.get(t);
        if (r !== void 0) {
          var y = Gn, p = t;
          switch (t) {
            case "keypress":
              if (Bn(a) === 0) break t;
            case "keydown":
            case "keyup":
              y = $0;
              break;
            case "focusin":
              p = "focus", y = yc;
              break;
            case "focusout":
              p = "blur", y = yc;
              break;
            case "beforeblur":
            case "afterblur":
              y = yc;
              break;
            case "click":
              if (a.button === 2) break t;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              y = rs;
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
            case Rs:
            case js:
            case xs:
              y = G0;
              break;
            case Hs:
              y = lv;
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
              y = ms;
              break;
            case "submit":
              y = I0;
              break;
            case "toggle":
            case "beforetoggle":
              y = nv;
          }
          var Y = (l & 4) !== 0, at = !Y && (t === "scroll" || t === "scrollend"), m = Y ? r !== null ? r + "Capture" : null : r;
          Y = [];
          for (var o = v, h; o !== null; ) {
            var E = o;
            if (h = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || h === null || m === null || (E = xu(o, m), E != null && Y.push(
              vn(o, E, h)
            )), at) break;
            o = o.return;
          }
          0 < Y.length && (r = new y(
            r,
            p,
            null,
            a,
            b
          ), z.push({ event: r, listeners: Y }));
        }
      }
      if ((l & 7) === 0) {
        t: {
          if (y = t === "mouseover" || t === "pointerover", r = t === "mouseout" || t === "pointerout", y && a !== oc && (p = a.relatedTarget || a.fromElement) && (de(p) || p[qe]))
            break t;
          (r || y) && (p = b.window === b ? b : (y = b.ownerDocument) ? y.defaultView || y.parentWindow : window, r ? (y = a.relatedTarget || a.toElement, r = v, y = y ? de(y) : null, y !== null && (at = H(y), Y = y.tag, y !== at || Y !== 5 && Y !== 27 && Y !== 6) && (y = null)) : (r = null, y = v), r !== y && (Y = rs, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (t === "pointerout" || t === "pointerover") && (Y = ms, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), at = r == null ? p : ju(r), h = y == null ? p : ju(y), p = new Y(
            E,
            o + "leave",
            r,
            a,
            b
          ), p.target = at, p.relatedTarget = h, E = null, de(b) === v && (Y = new Y(
            m,
            o + "enter",
            y,
            a,
            b
          ), Y.target = h, Y.relatedTarget = at, E = Y), at = E, Y = r && y ? _t(
            r,
            y,
            rh
          ) : null, r !== null && om(
            z,
            p,
            r,
            Y,
            !1
          ), y !== null && at !== null && om(
            z,
            at,
            y,
            Y,
            !0
          )));
        }
        t: {
          if (r = v ? ju(v) : window, y = r.nodeName && r.nodeName.toLowerCase(), y === "select" || y === "input" && r.type === "file")
            var q = Es;
          else if (Ss(r))
            if (zs)
              q = hv;
            else {
              q = mv;
              var gt = dv;
            }
          else
            y = r.nodeName, !y || y.toLowerCase() !== "input" || r.type !== "checkbox" && r.type !== "radio" ? v && fc(v.elementType) && (q = Es) : q = vv;
          if (q && (q = q(t, v))) {
            Ts(
              z,
              q,
              a,
              b
            );
            break t;
          }
          gt && gt(t, r, v);
        }
        switch (gt = v ? ju(v) : window, t) {
          case "focusin":
            (Ss(gt) || gt.contentEditable === "true") && (Ke = gt, _c = v, Lu = null);
            break;
          case "focusout":
            Lu = _c = Ke = null;
            break;
          case "mousedown":
            Oc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Oc = !1, Ds(z, a, b);
            break;
          case "selectionchange":
            if (gv) break;
          case "keydown":
          case "keyup":
            Ds(z, a, b);
        }
        var L;
        if (bc)
          t: {
            switch (t) {
              case "compositionstart":
                var I = "onCompositionStart";
                break t;
              case "compositionend":
                I = "onCompositionEnd";
                break t;
              case "compositionupdate":
                I = "onCompositionUpdate";
                break t;
            }
            I = void 0;
          }
        else
          Ze ? gs(t, a) && (I = "onCompositionEnd") : t === "keydown" && a.keyCode === 229 && (I = "onCompositionStart");
        I && (vs && a.locale !== "ko" && (Ze || I !== "onCompositionStart" ? I === "onCompositionEnd" && Ze && (L = os()) : (qa = b, mc = "value" in qa ? qa.value : qa.textContent, Ze = !0)), gt = Qi(v, I), 0 < gt.length && (I = new ds(
          I,
          t,
          null,
          a,
          b
        ), z.push({ event: I, listeners: gt }), L ? I.data = L : (L = bs(a), L !== null && (I.data = L)))), (L = cv ? fv(t, a) : ov(t, a)) && (I = Qi(v, "onBeforeInput"), 0 < I.length && (gt = new ds(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          b
        ), z.push({
          event: gt,
          listeners: I
        }), gt.data = L)), ch(
          z,
          t,
          v,
          a,
          b
        );
      }
      cm(z, l);
    });
  }
  function vn(t, l, a) {
    return {
      instance: t,
      listener: l,
      currentTarget: a
    };
  }
  function Qi(t, l) {
    for (var a = l + "Capture", e = []; t !== null; ) {
      var u = t, n = u.stateNode;
      if (u = u.tag, u !== 5 && u !== 26 && u !== 27 || n === null || (u = xu(t, a), u != null && e.unshift(
        vn(t, u, n)
      ), u = xu(t, l), u != null && e.push(
        vn(t, u, n)
      )), t.tag === 3) return e;
      t = t.return;
    }
    return [];
  }
  function rh(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5 && t.tag !== 27);
    return t || null;
  }
  function om(t, l, a, e, u) {
    for (var n = l._reactName, i = []; a !== null && a !== e; ) {
      var c = a, f = c.alternate, v = c.stateNode;
      if (c = c.tag, f !== null && f === e) break;
      c !== 5 && c !== 26 && c !== 27 || v === null || (f = v, u ? (v = xu(a, n), v != null && i.unshift(
        vn(a, v, f)
      )) : u || (v = xu(a, n), v != null && i.push(
        vn(a, v, f)
      ))), a = a.return;
    }
    i.length !== 0 && t.push({ event: l, listeners: i });
  }
  var dh = /\r\n?/g, mh = /\u0000|\uFFFD/g;
  function sm(t) {
    return (typeof t == "string" ? t : "" + t).replace(dh, `
`).replace(mh, "");
  }
  function rm(t, l) {
    return l = sm(l), sm(t) === l;
  }
  function pt(t, l, a, e, u, n) {
    switch (a) {
      case "children":
        if (typeof e == "string")
          l === "body" || l === "textarea" && e === "" || Qe(t, e);
        else if (typeof e == "number" || typeof e == "bigint")
          l !== "body" && Qe(t, "" + e);
        else return;
        break;
      case "className":
        xn(t, "class", e);
        break;
      case "tabIndex":
        xn(t, "tabindex", e);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        xn(t, a, e);
        break;
      case "style":
        is(t, e, n);
        return;
      case "data":
        if (l !== "object") {
          xn(t, "data", e);
          break;
        }
      case "src":
      case "href":
        if (e === "" && (l !== "a" || a !== "href")) {
          t.removeAttribute(a);
          break;
        }
        if (e == null || typeof e == "function" || typeof e == "symbol" || typeof e == "boolean") {
          t.removeAttribute(a);
          break;
        }
        e = Hn(e), t.setAttribute(a, e);
        break;
      case "action":
      case "formAction":
        if (typeof e == "function") {
          t.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (l !== "input" && pt(t, l, "name", u.name, u, null), pt(
            t,
            l,
            "formEncType",
            u.formEncType,
            u,
            null
          ), pt(
            t,
            l,
            "formMethod",
            u.formMethod,
            u,
            null
          ), pt(
            t,
            l,
            "formTarget",
            u.formTarget,
            u,
            null
          )) : (pt(t, l, "encType", u.encType, u, null), pt(t, l, "method", u.method, u, null), pt(t, l, "target", u.target, u, null)));
        if (e == null || typeof e == "symbol" || typeof e == "boolean") {
          t.removeAttribute(a);
          break;
        }
        e = Hn(e), t.setAttribute(a, e);
        break;
      case "onClick":
        e != null && (t.onclick = na);
        return;
      case "onScroll":
        e != null && vt("scroll", t);
        return;
      case "onScrollEnd":
        e != null && vt("scrollend", t);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(d(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(d(60));
            n?.__html !== a && (t.innerHTML = a);
          }
        }
        break;
      case "multiple":
        t.multiple = e && typeof e != "function" && typeof e != "symbol";
        break;
      case "muted":
        t.muted = e && typeof e != "function" && typeof e != "symbol";
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
          t.removeAttribute("xlink:href");
          break;
        }
        a = Hn(e), t.setAttributeNS(
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
        e != null && typeof e != "function" && typeof e != "symbol" ? t.setAttribute(a, e) : t.removeAttribute(a);
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
        e && typeof e != "function" && typeof e != "symbol" ? t.setAttribute(a, "") : t.removeAttribute(a);
        break;
      case "capture":
      case "download":
        e === !0 ? t.setAttribute(a, "") : e !== !1 && e != null && typeof e != "function" && typeof e != "symbol" ? t.setAttribute(a, e) : t.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        e != null && typeof e != "function" && typeof e != "symbol" && !isNaN(e) && 1 <= e ? t.setAttribute(a, e) : t.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        e == null || typeof e == "function" || typeof e == "symbol" || isNaN(e) ? t.removeAttribute(a) : t.setAttribute(a, e);
        break;
      case "popover":
        vt("beforetoggle", t), vt("toggle", t), jn(t, "popover", e);
        break;
      case "xlinkActuate":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          e
        );
        break;
      case "xlinkArcrole":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          e
        );
        break;
      case "xlinkRole":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          e
        );
        break;
      case "xlinkShow":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          e
        );
        break;
      case "xlinkTitle":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          e
        );
        break;
      case "xlinkType":
        Sa(
          t,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          e
        );
        break;
      case "xmlBase":
        Sa(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          e
        );
        break;
      case "xmlLang":
        Sa(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          e
        );
        break;
      case "xmlSpace":
        Sa(
          t,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          e
        );
        break;
      case "is":
        jn(t, "is", e);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = R0.get(a) || a, jn(t, a, e);
        else return;
    }
    Tt = !0;
  }
  function co(t, l, a, e, u, n) {
    switch (a) {
      case "style":
        is(t, e, n);
        return;
      case "dangerouslySetInnerHTML":
        if (e != null) {
          if (typeof e != "object" || !("__html" in e))
            throw Error(d(61));
          if (a = e.__html, a != null) {
            if (u.children != null) throw Error(d(60));
            n?.__html !== a && (t.innerHTML = a);
          }
        }
        break;
      case "children":
        if (typeof e == "string") Qe(t, e);
        else if (typeof e == "number" || typeof e == "bigint")
          Qe(t, "" + e);
        else return;
        break;
      case "onScroll":
        e != null && vt("scroll", t);
        return;
      case "onScrollEnd":
        e != null && vt("scrollend", t);
        return;
      case "onClick":
        e != null && (t.onclick = na);
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
        if (!Wo.hasOwnProperty(a))
          t: {
            if (a[0] === "o" && a[1] === "n" && (u = a.endsWith("Capture"), n = a.slice(2, u ? a.length - 7 : void 0), l = t[El] || null, l = l != null ? l[a] : null, typeof l == "function" && t.removeEventListener(n, l, u), typeof e == "function")) {
              typeof l != "function" && l !== null && (a in t ? t[a] = null : t.hasAttribute(a) && t.removeAttribute(a)), t.addEventListener(n, e, u);
              break t;
            }
            Tt = !0, a in t ? t[a] = e : e === !0 ? t.setAttribute(a, "") : jn(t, a, e);
          }
        return;
    }
    Tt = !0;
  }
  function rl(t, l, a) {
    switch (l) {
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
        vt("error", t), vt("load", t);
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
                  throw Error(d(137, l));
                default:
                  pt(t, l, n, i, a, null);
              }
          }
        u && pt(t, l, "srcSet", a.srcSet, a, null), e && pt(t, l, "src", a.src, a, null);
        return;
      case "input":
        vt("invalid", t);
        var c = n = i = u = null, f = null, v = null;
        for (e in a)
          if (a.hasOwnProperty(e)) {
            var b = a[e];
            if (b != null)
              switch (e) {
                case "name":
                  u = b;
                  break;
                case "type":
                  i = b;
                  break;
                case "checked":
                  f = b;
                  break;
                case "defaultChecked":
                  v = b;
                  break;
                case "value":
                  n = b;
                  break;
                case "defaultValue":
                  c = b;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (b != null)
                    throw Error(d(137, l));
                  break;
                default:
                  pt(t, l, e, b, a, null);
              }
          }
        as(
          t,
          n,
          c,
          f,
          v,
          i,
          u,
          !1
        );
        return;
      case "select":
        vt("invalid", t), e = i = n = null;
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
                pt(t, l, u, c, a, null);
            }
        l = n, a = i, t.multiple = !!e, l != null ? Xe(t, !!e, l, !1) : a != null && Xe(t, !!e, a, !0);
        return;
      case "textarea":
        vt("invalid", t), n = u = e = null;
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
                if (c != null) throw Error(d(91));
                break;
              default:
                pt(t, l, i, c, a, null);
            }
        us(t, e, u, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (e = a[f], e != null) && (f === "selected" ? t.selected = e && typeof e != "function" && typeof e != "symbol" : pt(t, l, f, e, a, null));
        return;
      case "dialog":
        vt("beforetoggle", t), vt("toggle", t), vt("cancel", t), vt("close", t);
        break;
      case "iframe":
      case "object":
        vt("load", t);
        break;
      case "video":
      case "audio":
        for (e = 0; e < mn.length; e++)
          vt(mn[e], t);
        break;
      case "image":
        vt("error", t), vt("load", t);
        break;
      case "details":
        vt("toggle", t);
        break;
      case "embed":
      case "source":
      case "link":
        vt("error", t), vt("load", t);
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
        for (v in a)
          if (a.hasOwnProperty(v) && (e = a[v], e != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(d(137, l));
              default:
                pt(t, l, v, e, a, null);
            }
        return;
      default:
        if (fc(l)) {
          for (b in a)
            a.hasOwnProperty(b) && (e = a[b], e !== void 0 && co(
              t,
              l,
              b,
              e,
              a,
              void 0
            ));
          return;
        }
    }
    for (c in a)
      a.hasOwnProperty(c) && (e = a[c], e != null && pt(t, l, c, e, a, null));
  }
  var vh = {};
  function hh(t, l, a, e) {
    switch (l) {
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
        var u = null, n = null, i = null, c = null, f = null, v = null, b = null;
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
                e.hasOwnProperty(y) || pt(t, l, y, null, e, z);
            }
        }
        for (var r in e) {
          var y = e[r];
          if (z = a[r], e.hasOwnProperty(r) && (y != null || z != null))
            switch (r) {
              case "type":
                y !== z && (Tt = !0), n = y;
                break;
              case "name":
                y !== z && (Tt = !0), u = y;
                break;
              case "checked":
                y !== z && (Tt = !0), v = y;
                break;
              case "defaultChecked":
                y !== z && (Tt = !0), b = y;
                break;
              case "value":
                y !== z && (Tt = !0), i = y;
                break;
              case "defaultValue":
                y !== z && (Tt = !0), c = y;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (y != null)
                  throw Error(d(137, l));
                break;
              default:
                y !== z && pt(
                  t,
                  l,
                  r,
                  y,
                  e,
                  z
                );
            }
        }
        ic(
          t,
          i,
          c,
          f,
          v,
          b,
          n,
          u
        );
        return;
      case "select":
        y = i = c = r = null;
        for (n in a)
          if (f = a[n], a.hasOwnProperty(n) && f != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                y = f;
              default:
                e.hasOwnProperty(n) || pt(
                  t,
                  l,
                  n,
                  null,
                  e,
                  f
                );
            }
        for (u in e)
          if (n = e[u], f = a[u], e.hasOwnProperty(u) && (n != null || f != null))
            switch (u) {
              case "value":
                n !== f && (Tt = !0), r = n;
                break;
              case "defaultValue":
                n !== f && (Tt = !0), c = n;
                break;
              case "multiple":
                n !== f && (Tt = !0), i = n;
              default:
                n !== f && pt(
                  t,
                  l,
                  u,
                  n,
                  e,
                  f
                );
            }
        l = c, a = i, e = y, r != null ? Xe(t, !!a, r, !1) : !!e != !!a && (l != null ? Xe(t, !!a, l, !0) : Xe(t, !!a, a ? [] : "", !1));
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
                pt(t, l, c, null, e, u);
            }
        for (i in e)
          if (u = e[i], n = a[i], e.hasOwnProperty(i) && (u != null || n != null))
            switch (i) {
              case "value":
                u !== n && (Tt = !0), r = u;
                break;
              case "defaultValue":
                u !== n && (Tt = !0), y = u;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (u != null) throw Error(d(91));
                break;
              default:
                u !== n && pt(t, l, i, u, e, n);
            }
        es(t, r, y);
        return;
      case "option":
        for (var p in a)
          r = a[p], a.hasOwnProperty(p) && r != null && !e.hasOwnProperty(p) && (p === "selected" ? t.selected = !1 : pt(
            t,
            l,
            p,
            null,
            e,
            r
          ));
        for (f in e)
          r = e[f], y = a[f], e.hasOwnProperty(f) && r !== y && (r != null || y != null) && (f === "selected" ? (r !== y && (Tt = !0), t.selected = r && typeof r != "function" && typeof r != "symbol") : pt(
            t,
            l,
            f,
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
        for (var Y in a)
          r = a[Y], a.hasOwnProperty(Y) && r != null && !e.hasOwnProperty(Y) && pt(t, l, Y, null, e, r);
        for (v in e)
          if (r = e[v], y = a[v], e.hasOwnProperty(v) && r !== y && (r != null || y != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(d(137, l));
                break;
              default:
                pt(
                  t,
                  l,
                  v,
                  r,
                  e,
                  y
                );
            }
        return;
      default:
        if (fc(l)) {
          for (var at in a)
            r = a[at], a.hasOwnProperty(at) && r !== void 0 && !e.hasOwnProperty(at) && co(
              t,
              l,
              at,
              void 0,
              e,
              r
            );
          for (b in e)
            r = e[b], y = a[b], !e.hasOwnProperty(b) || r === y || r === void 0 && y === void 0 || co(
              t,
              l,
              b,
              r,
              e,
              y
            );
          return;
        }
    }
    for (var m in a)
      r = a[m], a.hasOwnProperty(m) && r != null && !e.hasOwnProperty(m) && pt(t, l, m, null, e, r);
    for (z in e)
      r = e[z], y = a[z], !e.hasOwnProperty(z) || r === y || r == null && y == null || pt(t, l, z, r, e, y);
  }
  function dm(t) {
    switch (t) {
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
      for (var t = 0, l = 0, a = performance.getEntriesByType("resource"), e = 0; e < a.length; e++) {
        var u = a[e], n = u.transferSize, i = u.initiatorType, c = u.duration;
        if (n && c && dm(i)) {
          for (i = 0, c = u.responseEnd, e += 1; e < a.length; e++) {
            var f = a[e], v = f.startTime;
            if (v > c) break;
            var b = f.transferSize, z = f.initiatorType;
            b && dm(z) && (f = f.responseEnd, i += b * (f < c ? 1 : (c - v) / (f - v)));
          }
          if (--e, l += 8 * (n + i) / (u.duration / 1e3), t++, 10 < t) break;
        }
      }
      if (0 < t) return l / t / 1e6;
    }
    return navigator.connection && (t = navigator.connection.downlink, typeof t == "number") ? t : 5;
  }
  var fo = null, oo = null;
  function hn(t) {
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  function mm(t) {
    switch (t) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function vm(t, l) {
    if (t === 0)
      switch (l) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return t === 1 && l === "foreignObject" ? 0 : t;
  }
  function hm(t, l, a, e) {
    return a = hn(
      a
    ).createElement(t), a[il] = e, a[El] = l, rl(a, t, l), ll(a), a;
  }
  function so(t, l) {
    return t === "textarea" || t === "noscript" || typeof l.children == "string" || typeof l.children == "number" || typeof l.children == "bigint" || typeof l.dangerouslySetInnerHTML == "object" && l.dangerouslySetInnerHTML !== null && l.dangerouslySetInnerHTML.__html != null;
  }
  var ro = null;
  function gh() {
    var t = window.event;
    return t && t.type === "popstate" ? t === ro ? !1 : (ro = t, !0) : (ro = null, !1);
  }
  var mo = typeof setTimeout == "function" ? setTimeout : void 0, bh = typeof clearTimeout == "function" ? clearTimeout : void 0, ym = typeof Promise == "function" ? Promise : void 0, gm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : mo, Sh = typeof queueMicrotask == "function" ? queueMicrotask : typeof ym < "u" ? function(t) {
    return ym.resolve(null).then(t).catch(Th);
  } : mo;
  function Th(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function ae(t) {
    return t === "head";
  }
  function bm(t, l) {
    var a = l, e = 0;
    do {
      var u = a.nextSibling;
      if (t.removeChild(a), u && u.nodeType === 8)
        if (a = u.data, a === "/$" || a === "/&") {
          if (e === 0) {
            t.removeChild(u), Ou(l);
            return;
          }
          e--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          e++;
        else if (a === "html")
          Eo(
            t.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = t.ownerDocument.head, Eo(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[Ru] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && Eo(t.ownerDocument.body);
      a = u;
    } while (a);
    Ou(l);
  }
  function Sm(t, l) {
    var a = t;
    t = 0;
    do {
      var e = a.nextSibling;
      if (a.nodeType === 1 ? l ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (l ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), e && e.nodeType === 8)
        if (a = e.data, a === "/$") {
          if (t === 0) break;
          t--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || t++;
      a = e;
    } while (a);
  }
  function Tm(t, l, a) {
    if (l = CSS.escape(l) !== l ? "r-" + btoa(l).replace(/=/g, "") : l, t.style.viewTransitionName = l, a != null && (t.style.viewTransitionClass = a), a = getComputedStyle(t), a.display === "inline") {
      if (l = t.getClientRects(), l.length === 1) var e = 1;
      else
        for (var u = e = 0; u < l.length; u++) {
          var n = l[u];
          0 < n.width && 0 < n.height && e++;
        }
      e === 1 && (t = t.style, t.display = l.length === 1 ? "inline-block" : "block", t.marginTop = "-" + a.paddingTop, t.marginBottom = "-" + a.paddingBottom);
    }
  }
  function Em(t, l) {
    t = t.style, l = l.style;
    var a = l != null ? l.hasOwnProperty("viewTransitionName") ? l.viewTransitionName : l.hasOwnProperty("view-transition-name") ? l["view-transition-name"] : null : null;
    t.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = l != null ? l.hasOwnProperty("viewTransitionClass") ? l.viewTransitionClass : l.hasOwnProperty("view-transition-class") ? l["view-transition-class"] : null : null, t.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), t.display === "inline-block" && (l == null ? t.display = t.margin = "" : (a = l.display, t.display = a == null || typeof a == "boolean" ? "" : a, a = l.margin, a != null ? t.margin = a : (a = l.hasOwnProperty("marginTop") ? l.marginTop : l["margin-top"], t.marginTop = a == null || typeof a == "boolean" ? "" : a, l = l.hasOwnProperty("marginBottom") ? l.marginBottom : l["margin-bottom"], t.marginBottom = l == null || typeof l == "boolean" ? "" : l)));
  }
  function Eh(t, l, a) {
    return a = a.ownerDocument.defaultView, {
      rect: t,
      abs: l.position === "absolute" || l.position === "fixed",
      clip: l.clipPath !== "none" || l.overflow !== "visible" || l.filter !== "none" || l.mask !== "none" || l.mask !== "none" || l.borderRadius !== "0px",
      view: 0 <= t.bottom && 0 <= t.right && t.top <= a.innerHeight && t.left <= a.innerWidth
    };
  }
  function vo(t) {
    var l = t.getBoundingClientRect(), a = getComputedStyle(t);
    return Eh(l, a, t);
  }
  function zh(t) {
    return t.documentElement.clientHeight;
  }
  function _h(t) {
    this.addEventListener("load", t), this.addEventListener("error", t);
  }
  function Oh(t, l, a, e, u, n, i, c, f) {
    var v = l.nodeType === 9 ? l : l.ownerDocument;
    try {
      var b = v.startViewTransition({
        update: function() {
          var r = v.defaultView, y = r.navigation && r.navigation.transition, p = v.fonts.status;
          e();
          var Y = [];
          if (p === "loaded" && (zh(v), v.fonts.status === "loading" && Y.push(v.fonts.ready)), p = Y.length, t !== null)
            for (var at = t.suspenseyImages, m = 0, o = 0; o < at.length; o++) {
              var h = at[o];
              if (!h.complete) {
                var E = h.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < r.innerHeight && E.left < r.innerWidth) {
                  if (m += Lm(h), m > Zi) {
                    Y.length = p;
                    break;
                  }
                  h = new Promise(
                    _h.bind(h)
                  ), Y.push(h);
                }
              }
            }
          if (0 < Y.length)
            return r = Promise.race([
              Promise.all(Y),
              new Promise(function(q) {
                return setTimeout(q, 500);
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
      v.__reactViewTransition = b;
      var z = [];
      return b.ready.then(
        function() {
          for (var r = v.documentElement.getAnimations({
            subtree: !0
          }), y = 0; y < r.length; y++) {
            var p = r[y], Y = p.effect, at = Y.pseudoElement;
            if (at != null && at.startsWith("::view-transition")) {
              z.push(p), p = Y.getKeyframes();
              for (var m = at = void 0, o = !0, h = 0; h < p.length; h++) {
                var E = p[h], q = E.width;
                if (at === void 0) at = q;
                else if (at !== q) {
                  o = !1;
                  break;
                }
                if (q = E.height, m === void 0) m = q;
                else if (m !== q) {
                  o = !1;
                  break;
                }
                delete E.width, delete E.height, E.transform === "none" && delete E.transform;
              }
              o && at !== void 0 && m !== void 0 && (Y.setKeyframes(p), o = getComputedStyle(
                Y.target,
                Y.pseudoElement
              ), o.width !== at || o.height !== m) && (o = p[0], o.width = at, o.height = m, o = p[p.length - 1], o.width = at, o.height = m, Y.setKeyframes(p));
            }
          }
          i();
        },
        function(r) {
          v.__reactViewTransition === b && (v.__reactViewTransition = null);
          try {
            typeof r == "object" && r !== null && r.name === "InvalidStateError" && (r.message === "View transition was skipped because document visibility state is hidden." || r.message === "Skipping view transition because document visibility state has become hidden." || r.message === "Skipping view transition because viewport size changed." || r.message === "Transition was aborted because of invalid state") && (r = null), r !== null && f(r);
          } finally {
            e(), u(), i();
          }
        }
      ), b.finished.finally(function() {
        for (var r = 0; r < z.length; r++)
          z[r].cancel();
        v.__reactViewTransition === b && (v.__reactViewTransition = null), c();
      }), b;
    } catch {
      return e(), u(), i(), null;
    }
  }
  function je(t, l) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + t + "(" + l + ")";
  }
  je.prototype.animate = function(t, l) {
    return l = typeof l == "number" ? { duration: l } : D({}, l), l.pseudoElement = this._selector, this._scope.animate(t, l);
  }, je.prototype.getAnimations = function() {
    for (var t = this._scope, l = this._selector, a = t.getAnimations({ subtree: !0 }), e = [], u = 0; u < a.length; u++) {
      var n = a[u].effect;
      n !== null && n.target === t && n.pseudoElement === l && e.push(a[u]);
    }
    return e;
  }, je.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function zm(t) {
    return {
      name: t,
      group: new je("group", t),
      imagePair: new je("image-pair", t),
      old: new je("old", t),
      new: new je("new", t)
    };
  }
  function Gl(t) {
    this._fragmentFiber = t, this._observers = this._eventListeners = null;
  }
  Gl.prototype.addEventListener = function(t, l, a) {
    var e = null, u = null;
    if (!(a != null && typeof a != "boolean" && (e = a.signal || null, e !== null && e.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Om(n, t, l, a) === -1) {
        var i = this, c = l;
        a != null && typeof a != "boolean" && a.once === !0 && (c = function(f) {
          i.removeEventListener(
            t,
            l,
            a
          ), typeof l == "function" ? l.call(this, f) : l.handleEvent(f);
        }), e !== null && (u = i.removeEventListener.bind(
          i,
          t,
          l,
          a
        ), e.addEventListener("abort", u, { once: !0 }), u = e.removeEventListener.bind(e, "abort", u)), e = bu(a), n.push({
          type: t,
          listener: l,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: u
        }), T(
          this._fragmentFiber.child,
          !1,
          Nh,
          t,
          c,
          e
        );
      }
      this._eventListeners = n;
    }
  };
  function Nh(t, l, a, e) {
    return nt(t).addEventListener(
      l,
      a,
      e
    ), !1;
  }
  Gl.prototype.removeEventListener = function(t, l, a) {
    var e = this._eventListeners;
    if (e !== null && (l = Om(
      e,
      t,
      l,
      a
    ), l !== -1)) {
      var u = e[l];
      a = u.attachedListener;
      var n = u.cleanup;
      u = bu(u.optionsOrUseCapture), T(
        this._fragmentFiber.child,
        !1,
        Ah,
        t,
        a,
        u
      ), e.splice(l, 1), n !== null && n();
    }
  };
  function Ah(t, l, a, e) {
    return nt(t).removeEventListener(
      l,
      a,
      e
    ), !1;
  }
  function bu(t) {
    return t != null && typeof t != "boolean" && (t.once === !0 || t.signal instanceof AbortSignal) ? { capture: t.capture, passive: t.passive } : t;
  }
  function _m(t) {
    return t == null ? "c=0" : typeof t == "boolean" ? "c=" + (t ? "1" : "0") : "c=" + (t.capture ? "1" : "0");
  }
  function Om(t, l, a, e) {
    if (t.length === 0) return -1;
    e = _m(e);
    for (var u = 0; u < t.length; u++) {
      var n = t[u];
      if (n.type === l && n.listener === a && _m(n.optionsOrUseCapture) === e)
        return u;
    }
    return -1;
  }
  Gl.prototype.dispatchEvent = function(t) {
    var l = x(
      this._fragmentFiber
    );
    if (l === null) return !0;
    l = nt(l);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !t.bubbles) {
      var e = l.nodeType === 9 ? l.createComment("") : document.createTextNode("");
      if (a)
        for (var u = 0; u < a.length; u++) {
          var n = a[u];
          e.addEventListener(
            n.type,
            n.attachedListener,
            bu(n.optionsOrUseCapture)
          );
        }
      if (l.appendChild(e), t = e.dispatchEvent(t), a)
        for (u = 0; u < a.length; u++)
          n = a[u], e.removeEventListener(
            n.type,
            n.attachedListener,
            bu(n.optionsOrUseCapture)
          );
      return l.removeChild(e), t;
    }
    return l.dispatchEvent(t);
  }, Gl.prototype.focus = function(t) {
    T(
      this._fragmentFiber.child,
      !0,
      Nm,
      t,
      void 0,
      void 0
    );
  };
  function Nm(t, l) {
    return t.tag === 6 ? !1 : (t = nt(t), Yh(t, l));
  }
  Gl.prototype.focusLast = function(t) {
    var l = [];
    T(
      this._fragmentFiber.child,
      !0,
      ho,
      l,
      void 0,
      void 0
    );
    for (var a = l.length - 1; 0 <= a && !Nm(l[a], t); a--) ;
  };
  function ho(t, l) {
    return l.push(t), !1;
  }
  Gl.prototype.blur = function() {
    var t = x(
      this._fragmentFiber
    );
    t !== null && (t = nt(t), t = hn(t).activeElement, t !== null && T(
      this._fragmentFiber.child,
      !1,
      ph,
      t,
      void 0,
      void 0
    ));
  };
  function ph(t, l) {
    return t.tag === 6 ? !1 : (t = nt(t), t === l || t.contains(l) ? (l.blur(), !0) : !1);
  }
  Gl.prototype.observeUsing = function(t) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(t), T(
      this._fragmentFiber.child,
      !1,
      Ch,
      t,
      void 0,
      void 0
    );
  };
  function Ch(t, l) {
    return t.tag === 6 || (t = nt(t), l.observe(t)), !1;
  }
  Gl.prototype.unobserveUsing = function(t) {
    var l = this._observers;
    if (l !== null && l.has(t)) {
      l.delete(t), T(
        this._fragmentFiber.child,
        !1,
        Mh,
        t,
        void 0,
        void 0
      );
      for (var a = l = 0; a < ua.length; a++) {
        var e = ua[a];
        e.fragmentInstance === this && e.observer === t ? t.unobserve(e.instance) : ua[l++] = e;
      }
      ua.length = l;
    }
  };
  function Mh(t, l) {
    return t.tag === 6 || (t = nt(t), l.unobserve(t)), !1;
  }
  var ua = [], yo = !1;
  function Dh(t, l, a) {
    ua.push({
      fragmentInstance: t,
      observer: l,
      instance: a
    }), yo || (yo = !0, Gh(function() {
      yo = !1;
      var e = ua;
      ua = [];
      for (var u = 0; u < e.length; u++) {
        var n = e[u];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  Gl.prototype.getClientRects = function() {
    var t = [];
    return T(
      this._fragmentFiber.child,
      !1,
      Uh,
      t,
      void 0,
      void 0
    ), t;
  };
  function Uh(t, l) {
    if (t.tag === 6) {
      t = t.stateNode;
      var a = t.ownerDocument.createRange();
      a.selectNodeContents(t), l.push.apply(l, a.getClientRects());
    } else
      t = nt(t), l.push.apply(l, t.getClientRects());
    return !1;
  }
  Gl.prototype.getRootNode = function(t) {
    var l = x(
      this._fragmentFiber
    );
    return l === null ? this : nt(l).getRootNode(t);
  }, Gl.prototype.compareDocumentPosition = function(t) {
    var l = x(
      this._fragmentFiber
    );
    if (l === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      ho,
      a,
      void 0,
      void 0
    );
    var e = nt(l);
    if (a.length === 0) {
      if (a = e, w(this._fragmentFiber)) {
        t: {
          for (l = this._fragmentFiber.return; l !== null; ) {
            if (l.tag === 4) {
              l = l.stateNode.containerInfo;
              break t;
            }
            if (l.tag === 3 || l.tag === 5 || l.tag === 27)
              break;
            l = l.return;
          }
          l = null;
        }
        l != null && (a = l);
      }
      l = this._fragmentFiber;
      var u = e = a.compareDocumentPosition(t);
      return a === t ? u = Node.DOCUMENT_POSITION_CONTAINS : e & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = Ct(l)[1], a === null ? u = Node.DOCUMENT_POSITION_PRECEDING : (t = nt(a).compareDocumentPosition(
        t
      ), u = t === 0 || t & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), u |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    l = nt(a[0]), u = nt(a[a.length - 1]);
    var n = w(this._fragmentFiber) ? l.parentElement : e;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    e = n.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(u) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = l.compareDocumentPosition(t), c = u.compareDocumentPosition(t), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = e && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, l = e && l === t || n && u === t || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !e && l === t || !n && u === t ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, l & Node.DOCUMENT_POSITION_DISCONNECTED || l & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Rh(
      l,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      t
    ) ? l : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Rh(t, l, a, e, u) {
    var n = de(u);
    if (t & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (a = !!n)
        t: {
          for (; n !== null; ) {
            if (n.tag === 7 && (n === l || n.alternate === l)) {
              a = !0;
              break t;
            }
            n = n.return;
          }
          a = !1;
        }
      return a;
    }
    if (t & Node.DOCUMENT_POSITION_CONTAINS) {
      if (n === null)
        return n = u.ownerDocument, u === n || u === n.documentElement || u === n.body;
      t: {
        for (n = l, l = x(l); n !== null; ) {
          if (!(n.tag !== 5 && n.tag !== 3 && n.tag !== 27 || n !== l && n.alternate !== l)) {
            n = !0;
            break t;
          }
          n = n.return;
        }
        n = !1;
      }
      return n;
    }
    return t & Node.DOCUMENT_POSITION_PRECEDING ? ((l = !!n) && !(l = n === a) && (l = _t(
      a,
      n,
      Bt
    ), l === null ? l = !1 : (T(
      l,
      !0,
      pl,
      n,
      a
    ), n = qt, qt = null, l = n !== null)), l) : t & Node.DOCUMENT_POSITION_FOLLOWING ? ((l = !!n) && !(l = n === e) && (l = _t(
      e,
      n,
      Bt
    ), l === null ? l = !1 : (T(
      l,
      !0,
      Xt,
      n,
      e
    ), n = qt, wt = qt = null, l = n !== null)), l) : !1;
  }
  function Am(t, l) {
    var a = t.ownerDocument.createRange();
    a.selectNodeContents(t), t = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + t.left,
      l ? window.scrollY + t.top : window.scrollY + t.bottom - window.innerHeight
    );
  }
  Gl.prototype.scrollIntoView = function(t) {
    if (typeof t == "object") throw Error(d(566));
    var l = [];
    T(
      this._fragmentFiber.child,
      !1,
      ho,
      l,
      void 0,
      void 0
    );
    var a = t !== !1;
    if (l.length === 0) {
      var e = Ct(
        this._fragmentFiber
      );
      if (e = a ? e[1] || e[0] || x(this._fragmentFiber) : e[0] || e[1], e === null) return;
      if (e.tag === 6) {
        t = nt(e), Am(t, a);
        return;
      }
      if (e = nt(e), e.nodeType !== 9) {
        if (e.nodeType === 11) {
          a = "host" in e ? e.host : null, a !== null && a.scrollIntoView(t);
          return;
        }
        e.scrollIntoView(t);
      }
    }
    for (e = a ? l.length - 1 : 0; e !== (a ? -1 : l.length); ) {
      var u = l[e];
      u.tag === 6 ? (u = nt(u), Am(u, a)) : nt(u).scrollIntoView(t), e += a ? -1 : 1;
    }
  };
  function jh(t, l) {
    return t = nt(t), pm(t, l), !1;
  }
  function pm(t, l) {
    t.reactFragments == null && (t.reactFragments = /* @__PURE__ */ new Set()), t.reactFragments.add(l);
  }
  function Cm(t, l) {
    var a = l._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        t.addEventListener(
          u.type,
          u.attachedListener,
          bu(u.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (a = l._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < ua.length; c++) {
        var f = ua[c];
        (f.fragmentInstance !== l || f.observer !== n || f.instance !== t) && (ua[i++] = f);
      }
      ua.length = i, n.observe(t);
    }), pm(t, l));
  }
  function xh(t, l) {
    var a = l._eventListeners;
    if (a !== null)
      for (var e = 0; e < a.length; e++) {
        var u = a[e];
        t.removeEventListener(
          u.type,
          u.attachedListener,
          bu(u.optionsOrUseCapture)
        );
      }
    t.nodeType !== 3 && (a = l._observers, a !== null && a.forEach(function(n) {
      typeof n.rootMargin == "string" ? Dh(
        l,
        n,
        t
      ) : n.unobserve(t);
    }), t.reactFragments != null && t.reactFragments.delete(l));
  }
  function go(t) {
    var l = t.firstChild;
    for (l && l.nodeType === 10 && (l = l.nextSibling); l; ) {
      var a = l;
      switch (l = l.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          go(a), Rn(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      t.removeChild(a);
    }
  }
  function Hh(t, l, a, e) {
    for (; t.nodeType === 1; ) {
      var u = a;
      if (t.nodeName.toLowerCase() !== l.toLowerCase()) {
        if (!e && (t.nodeName !== "INPUT" || t.type !== "hidden"))
          break;
      } else if (e) {
        if (!t[Ru])
          switch (l) {
            case "meta":
              if (!t.hasAttribute("itemprop")) break;
              return t;
            case "link":
              if (n = t.getAttribute("rel"), n === "stylesheet" && t.hasAttribute("data-precedence"))
                break;
              if (n !== u.rel || t.getAttribute("href") !== (u.href == null || u.href === "" ? null : u.href) || t.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin) || t.getAttribute("title") !== (u.title == null ? null : u.title))
                break;
              return t;
            case "style":
              if (t.hasAttribute("data-precedence")) break;
              return t;
            case "script":
              if (n = t.getAttribute("src"), (n !== (u.src == null ? null : u.src) || t.getAttribute("type") !== (u.type == null ? null : u.type) || t.getAttribute("crossorigin") !== (u.crossOrigin == null ? null : u.crossOrigin)) && n && t.hasAttribute("async") && !t.hasAttribute("itemprop"))
                break;
              return t;
            default:
              return t;
          }
      } else if (l === "input" && t.type === "hidden") {
        var n = u.name == null ? null : "" + u.name;
        if (u.type === "hidden" && t.getAttribute("name") === n)
          return t;
      } else return t;
      if (t = Jl(t.nextSibling), t === null) break;
    }
    return null;
  }
  function qh(t, l, a) {
    if (l === "") return null;
    for (; t.nodeType !== 3; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !a || (t = Jl(t.nextSibling), t === null)) return null;
    return t;
  }
  function Mm(t, l) {
    for (; t.nodeType !== 8; )
      if ((t.nodeType !== 1 || t.nodeName !== "INPUT" || t.type !== "hidden") && !l || (t = Jl(t.nextSibling), t === null)) return null;
    return t;
  }
  function bo(t) {
    return t.data === "$?" || t.data === "$~";
  }
  function So(t) {
    return t.data === "$!" || t.data === "$?" && t.ownerDocument.readyState !== "loading";
  }
  function Bh(t, l) {
    var a = t.ownerDocument;
    if (t.data === "$~") t._reactRetry = l;
    else if (t.data !== "$?" || a.readyState !== "loading")
      l();
    else {
      var e = function() {
        l(), a.removeEventListener("DOMContentLoaded", e);
      };
      a.addEventListener("DOMContentLoaded", e), t._reactRetry = e;
    }
  }
  function Jl(t) {
    for (; t != null; t = t.nextSibling) {
      var l = t.nodeType;
      if (l === 1 || l === 3) break;
      if (l === 8) {
        if (l = t.data, l === "$" || l === "$!" || l === "$?" || l === "$~" || l === "&" || l === "F!" || l === "F")
          break;
        if (l === "/$" || l === "/&") return null;
      }
    }
    return t;
  }
  var To = null;
  function Dm(t) {
    t = t.nextSibling;
    for (var l = 0; t; ) {
      if (t.nodeType === 8) {
        var a = t.data;
        if (a === "/$" || a === "/&") {
          if (l === 0)
            return Jl(t.nextSibling);
          l--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || l++;
      }
      t = t.nextSibling;
    }
    return null;
  }
  function Um(t) {
    t = t.previousSibling;
    for (var l = 0; t; ) {
      if (t.nodeType === 8) {
        var a = t.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (l === 0) return t;
          l--;
        } else a !== "/$" && a !== "/&" || l++;
      }
      t = t.previousSibling;
    }
    return null;
  }
  function Yh(t, l) {
    function a() {
      e = !0;
    }
    if (t.ownerDocument.activeElement === t) return !0;
    var e = !1;
    try {
      t.ownerDocument.addEventListener("focus", a, !0), (t.focus || HTMLElement.prototype.focus).call(t, l);
    } finally {
      t.ownerDocument.removeEventListener("focus", a, !0);
    }
    return e;
  }
  function Gh(t) {
    gm(function() {
      gm(function(l) {
        return t(l);
      });
    });
  }
  function Rm(t, l, a) {
    switch (l = hn(a), t) {
      case "html":
        if (t = l.documentElement, !t) throw Error(d(452));
        return t;
      case "head":
        if (t = l.head, !t) throw Error(d(453));
        return t;
      case "body":
        if (t = l.body, !t) throw Error(d(454));
        return t;
      default:
        throw Error(d(451));
    }
  }
  function jm(t, l, a) {
    for (var e in a) {
      var u = a[e];
      a.hasOwnProperty(e) && u != null && pt(t, l, e, null, vh, u);
    }
    a.dangerouslySetInnerHTML != null && (t.textContent = ""), t.onclick === na && (t.onclick = null), Rn(t);
  }
  function Eo(t) {
    for (var l = t.attributes; l.length; )
      t.removeAttributeNode(l[0]);
    Rn(t);
  }
  var $l = /* @__PURE__ */ new Map(), xm = /* @__PURE__ */ new Set();
  function yn(t) {
    if (typeof t.getRootNode == "function") {
      var l = t.getRootNode();
      if (l.nodeType === 9 || l.nodeType === 11) return l;
    }
    return t.nodeType === 9 ? t : t.ownerDocument;
  }
  var Ra = V.d;
  V.d = {
    f: Xh,
    r: Qh,
    D: Lh,
    C: Vh,
    L: Zh,
    m: Kh,
    X: Jh,
    S: wh,
    M: $h
  };
  function Xh() {
    var t = Ra.f(), l = Hi();
    return t || l;
  }
  function Qh(t) {
    var l = Be(t);
    l !== null && l.tag === 5 && l.type === "form" ? qr(l) : Ra.r(t);
  }
  var Su = typeof document > "u" ? null : document;
  function Hm(t, l, a) {
    var e = Su;
    if (e && typeof l == "string" && l) {
      var u = Xl(l);
      u = 'link[rel="' + t + '"][href="' + u + '"]', typeof a == "string" && (u += '[crossorigin="' + a + '"]'), xm.has(u) || (xm.add(u), t = { rel: t, crossOrigin: a, href: l }, e.querySelector(u) === null && (l = e.createElement("link"), rl(l, "link", t), ll(l), e.head.appendChild(l)));
    }
  }
  function Lh(t) {
    Ra.D(t), Hm("dns-prefetch", t, null);
  }
  function Vh(t, l) {
    Ra.C(t, l), Hm("preconnect", t, l);
  }
  function Zh(t, l, a) {
    Ra.L(t, l, a);
    var e = Su;
    if (e && t && l) {
      var u = 'link[rel="preload"][as="' + Xl(l) + '"]';
      l === "image" && a && a.imageSrcSet ? (u += '[imagesrcset="' + Xl(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (u += '[imagesizes="' + Xl(
        a.imageSizes
      ) + '"]')) : u += '[href="' + Xl(t) + '"]';
      var n = u;
      switch (l) {
        case "style":
          n = Tu(t);
          break;
        case "script":
          n = Eu(t);
      }
      if (!($l.has(n) || (t = D(
        {
          rel: "preload",
          href: l === "image" && a && a.imageSrcSet ? void 0 : t,
          as: l
        },
        a
      ), $l.set(n, t), e.querySelector(u) !== null || l === "style" && e.querySelector(gn(n)) || l === "script" && e.querySelector(bn(n))))) {
        var i = e.createElement("link");
        rl(i, "link", t), l === "style" && (i[Un] = !0, i.onload = i.onerror = function() {
          $o(i);
        }), ll(i), e.head.appendChild(i);
      }
    }
  }
  function Kh(t, l) {
    Ra.m(t, l);
    var a = Su;
    if (a && t) {
      var e = l && typeof l.as == "string" ? l.as : "script", u = 'link[rel="modulepreload"][as="' + Xl(e) + '"][href="' + Xl(t) + '"]', n = u;
      switch (e) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = Eu(t);
      }
      if (!$l.has(n) && (t = D({ rel: "modulepreload", href: t }, l), $l.set(n, t), a.querySelector(u) === null)) {
        switch (e) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(bn(n)))
              return;
        }
        e = a.createElement("link"), rl(e, "link", t), ll(e), a.head.appendChild(e);
      }
    }
  }
  function wh(t, l, a) {
    Ra.S(t, l, a);
    var e = Su;
    if (e && t) {
      var u = Ye(e).hoistableStyles, n = Tu(t);
      l = l || "default";
      var i = u.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = e.querySelector(
          gn(n)
        ))
          c.loading = 5;
        else {
          t = D(
            { rel: "stylesheet", href: t, "data-precedence": l },
            a
          ), (a = $l.get(n)) && zo(t, a);
          var f = i = e.createElement("link");
          ll(f), rl(f, "link", t), f._p = new Promise(function(v, b) {
            f.onload = v, f.onerror = b;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Li(i, l, e);
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
  function Jh(t, l) {
    Ra.X(t, l);
    var a = Su;
    if (a && t) {
      var e = Ye(a).hoistableScripts, u = Eu(t), n = e.get(u);
      n || (n = a.querySelector(bn(u)), n || (t = D({ src: t, async: !0 }, l), (l = $l.get(u)) && _o(t, l), n = a.createElement("script"), ll(n), rl(n, "link", t), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function $h(t, l) {
    Ra.M(t, l);
    var a = Su;
    if (a && t) {
      var e = Ye(a).hoistableScripts, u = Eu(t), n = e.get(u);
      n || (n = a.querySelector(bn(u)), n || (t = D({ src: t, async: !0, type: "module" }, l), (l = $l.get(u)) && _o(t, l), n = a.createElement("script"), ll(n), rl(n, "link", t), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, e.set(u, n));
    }
  }
  function qm(t, l, a, e) {
    var u = (u = Cl.current) ? yn(u) : null;
    if (!u) throw Error(d(446));
    switch (t) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = Tu(a.href), l = Ye(
          u
        ).hoistableStyles, e = l.get(a), e || (e = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, l.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          t = Tu(a.href);
          var n = Ye(
            u
          ).hoistableStyles, i = n.get(t);
          if (i || (u = u.ownerDocument || u, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(t, i), (n = u.querySelector(
            gn(t)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = $l.get(t), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, $l.set(t, n)), Fh(
            u,
            t,
            n,
            i.state
          ))), l && e === null)
            throw Error(d(528, ""));
          return i;
        }
        if (l && e !== null)
          throw Error(d(529, ""));
        return null;
      case "script":
        return l = a.async, a = a.src, typeof a == "string" && l && typeof l != "function" && typeof l != "symbol" ? (a = Eu(a), l = Ye(
          u
        ).hoistableScripts, e = l.get(a), e || (e = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, l.set(a, e)), e) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(d(444, t));
    }
  }
  function Tu(t) {
    return 'href="' + Xl(t) + '"';
  }
  function gn(t) {
    return 'link[rel="stylesheet"][' + t + "]";
  }
  function Bm(t) {
    return D({}, t, {
      "data-precedence": t.precedence,
      precedence: null
    });
  }
  function Fh(t, l, a, e) {
    if (l = t.querySelector(
      'link[rel="preload"][as="style"][' + l + "]"
    )) {
      if (l[Un] !== !0) {
        e.loading = 1;
        return;
      }
    } else
      l = t.createElement("link"), l[Un] = !0, l.onload = l.onerror = $o.bind(null, l), rl(l, "link", a), ll(l), t.head.appendChild(l);
    e.preload = l, l.addEventListener("load", function() {
      return e.loading |= 1;
    }), l.addEventListener("error", function() {
      return e.loading |= 2;
    });
  }
  function Eu(t) {
    return '[src="' + Xl(t) + '"]';
  }
  function bn(t) {
    return "script[async]" + t;
  }
  function Ym(t, l, a) {
    if (l.count++, l.instance === null)
      switch (l.type) {
        case "style":
          var e = t.querySelector(
            'style[data-href~="' + Xl(a.href) + '"]'
          );
          if (e)
            return l.instance = e, ll(e), e;
          var u = D({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return e = (t.ownerDocument || t).createElement(
            "style"
          ), ll(e), rl(e, "style", u), Li(e, a.precedence, t), l.instance = e;
        case "stylesheet":
          u = Tu(a.href);
          var n = t.querySelector(
            gn(u)
          );
          if (n)
            return l.state.loading |= 4, l.instance = n, ll(n), n;
          e = Bm(a), (u = $l.get(u)) && zo(e, u), n = (t.ownerDocument || t).createElement("link"), ll(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), rl(n, "link", e), l.state.loading |= 4, Li(n, a.precedence, t), l.instance = n;
        case "script":
          return n = Eu(a.src), (u = t.querySelector(
            bn(n)
          )) ? (l.instance = u, ll(u), u) : (e = a, (u = $l.get(n)) && (e = D({}, a), _o(e, u)), t = t.ownerDocument || t, u = t.createElement("script"), ll(u), rl(u, "link", e), t.head.appendChild(u), l.instance = u);
        case "void":
          return null;
        default:
          throw Error(d(443, l.type));
      }
    else
      l.type === "stylesheet" && (l.state.loading & 4) === 0 && (e = l.instance, l.state.loading |= 4, Li(e, a.precedence, t));
    return l.instance;
  }
  function Li(t, l, a) {
    for (var e = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), u = e.length ? e[e.length - 1] : null, n = u, i = 0; i < e.length; i++) {
      var c = e[i];
      if (c.dataset.precedence === l) n = c;
      else if (n !== u) break;
    }
    n ? n.parentNode.insertBefore(t, n.nextSibling) : (l = a.nodeType === 9 ? a.head : a, l.insertBefore(t, l.firstChild));
  }
  function zo(t, l) {
    t.crossOrigin == null && (t.crossOrigin = l.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = l.referrerPolicy), t.title == null && (t.title = l.title);
  }
  function _o(t, l) {
    t.crossOrigin == null && (t.crossOrigin = l.crossOrigin), t.referrerPolicy == null && (t.referrerPolicy = l.referrerPolicy), t.integrity == null && (t.integrity = l.integrity);
  }
  var Vi = null;
  function Gm(t, l, a) {
    if (Vi === null) {
      var e = /* @__PURE__ */ new Map(), u = Vi = /* @__PURE__ */ new Map();
      u.set(a, e);
    } else
      u = Vi, e = u.get(a), e || (e = /* @__PURE__ */ new Map(), u.set(a, e));
    if (e.has(t)) return e;
    for (e.set(t, null), a = a.getElementsByTagName(t), u = 0; u < a.length; u++) {
      var n = a[u];
      if (!(n[Ru] || n[il] || t === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(l) || "";
        i = t + i;
        var c = e.get(i);
        c ? c.push(n) : e.set(i, [n]);
      }
    }
    return e;
  }
  function Oo(t, l, a) {
    t = t.ownerDocument || t, t.head.insertBefore(
      a,
      l === "title" ? t.querySelector("head > title") : null
    );
  }
  function Wh(t, l, a) {
    if (a === 1 || l.itemProp != null) return !1;
    switch (t) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof l.precedence != "string" || typeof l.href != "string" || l.href === "")
          break;
        return !0;
      case "link":
        if (typeof l.rel != "string" || typeof l.href != "string" || l.href === "" || l.onLoad || l.onError)
          break;
        return l.rel === "stylesheet" ? (t = l.disabled, typeof l.precedence == "string" && t == null) : !0;
      case "script":
        if (l.async && typeof l.async != "function" && typeof l.async != "symbol" && !l.onLoad && !l.onError && l.src && typeof l.src == "string")
          return !0;
    }
    return !1;
  }
  function Xm(t, l) {
    return t === "img" && l.src != null && l.src !== "" && l.onLoad == null && l.loading !== "lazy";
  }
  function Qm(t) {
    return !(t.type === "stylesheet" && (t.state.loading & 3) === 0);
  }
  function Lm(t) {
    return (t.width || 100) * (t.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Vm(t, l) {
    typeof l.decode == "function" && (t.imgCount++, l.complete || (t.imgBytes += Lm(l), t.suspenseyImages.push(l)), t = Ph.bind(t), l.decode().then(t, t));
  }
  function Ih(t, l, a, e) {
    if (a.type === "stylesheet" && (typeof e.media != "string" || matchMedia(e.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var u = Tu(e.href), n = l.querySelector(
          gn(u)
        );
        if (n) {
          l = n._p, l !== null && typeof l == "object" && typeof l.then == "function" && (t.count++, t = Sn.bind(t), l.then(t, t)), a.state.loading |= 4, a.instance = n, ll(n);
          return;
        }
        n = l.ownerDocument || l, e = Bm(e), (u = $l.get(u)) && zo(e, u), n = n.createElement("link"), ll(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), rl(n, "link", e), a.instance = n;
      }
      t.stylesheets === null && (t.stylesheets = /* @__PURE__ */ new Map()), t.stylesheets.set(a, l), (l = a.state.preload) && (a.state.loading & 3) === 0 && (t.count++, a = Sn.bind(t), l.addEventListener("load", a), l.addEventListener("error", a));
    }
  }
  var Zi = 0;
  function kh(t, l) {
    return t.stylesheets && t.count === 0 && wi(t, t.stylesheets), 0 < t.count || 0 < t.imgCount ? function(a) {
      var e = setTimeout(function() {
        if (t.stylesheets && wi(t, t.stylesheets), t.unsuspend) {
          var n = t.unsuspend;
          t.unsuspend = null, n();
        }
      }, 6e4 + l);
      0 < t.imgBytes && Zi === 0 && (Zi = 62500 * yh());
      var u = setTimeout(
        function() {
          if (t.waitingForImages = !1, t.count === 0 && (t.stylesheets && wi(t, t.stylesheets), t.unsuspend)) {
            var n = t.unsuspend;
            t.unsuspend = null, n();
          }
        },
        (t.imgBytes > Zi ? 50 : 800) + l
      );
      return t.unsuspend = a, function() {
        t.unsuspend = null, clearTimeout(e), clearTimeout(u);
      };
    } : null;
  }
  function Zm(t) {
    if (t.count === 0 && (t.imgCount === 0 || !t.waitingForImages)) {
      if (t.stylesheets) wi(t, t.stylesheets);
      else if (t.unsuspend) {
        var l = t.unsuspend;
        t.unsuspend = null, l();
      }
    }
  }
  function Sn() {
    this.count--, Zm(this);
  }
  function Ph() {
    this.imgCount--, Zm(this);
  }
  var Ki = null;
  function wi(t, l) {
    t.stylesheets = null, t.unsuspend !== null && (t.count++, Ki = /* @__PURE__ */ new Map(), l.forEach(ty, t), Ki = null, Sn.call(t));
  }
  function ty(t, l) {
    if (!(l.state.loading & 4)) {
      var a = Ki.get(t);
      if (a) var e = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Ki.set(t, a);
        for (var u = t.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < u.length; n++) {
          var i = u[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), e = i);
        }
        e && a.set(null, e);
      }
      u = l.instance, i = u.getAttribute("data-precedence"), n = a.get(i) || e, n === e && a.set(null, u), a.set(i, u), this.count++, e = Sn.bind(this), u.addEventListener("load", e), u.addEventListener("error", e), n ? n.parentNode.insertBefore(u, n.nextSibling) : (t = t.nodeType === 9 ? t.head : t, t.insertBefore(u, t.firstChild)), l.state.loading |= 4;
    }
  }
  var zu = {
    $$typeof: Mt,
    Provider: null,
    Consumer: null,
    _currentValue: tl,
    _currentValue2: tl,
    _threadCount: 0
  };
  function ly(t, l, a, e, u, n, i, c, f) {
    this.tag = 1, this.containerInfo = t, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ac(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ac(0), this.hiddenUpdates = ac(null), this.identifierPrefix = e, this.onUncaughtError = u, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Km(t, l, a, e, u, n, i, c, f, v, b, z) {
    return t = new ly(
      t,
      l,
      a,
      i,
      f,
      v,
      b,
      z,
      c
    ), l = 1, n === !0 && (l |= 24), n = zl(3, null, null, l), t.current = n, n.stateNode = t, l = Bc(), l.refCount++, t.pooledCache = l, l.refCount++, n.memoizedState = {
      element: e,
      isDehydrated: a,
      cache: l
    }, Qc(n), t;
  }
  function wm(t) {
    return t ? (t = $e, t) : $e;
  }
  function Jm(t, l, a, e, u, n) {
    u = wm(u), e.context === null ? e.context = u : e.pendingContext = u, e = Za(l), e.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (e.callback = n), a = Ka(t, e, l), a !== null && (Al(a, t, l), Fu(a, t, l));
  }
  function $m(t, l) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var a = t.retryLane;
      t.retryLane = a !== 0 && a < l ? a : l;
    }
  }
  function No(t, l) {
    $m(t, l), (t = t.alternate) && $m(t, l);
  }
  function Fm(t) {
    if (t.tag === 13 || t.tag === 31) {
      var l = ye(t, 67108864);
      l !== null && Al(l, t, 67108864), No(t, 67108864);
    }
  }
  function Wm(t) {
    if (t.tag === 13 || t.tag === 31) {
      var l = Yl();
      l = ec(l);
      var a = ye(t, l);
      a !== null && Al(a, t, l), No(t, l);
    }
  }
  var _u = !0;
  function ay(t, l, a, e) {
    var u = j.T;
    j.T = null;
    var n = V.p;
    try {
      V.p = 2, Ao(t, l, a, e);
    } finally {
      V.p = n, j.T = u;
    }
  }
  function ey(t, l, a, e) {
    var u = j.T;
    j.T = null;
    var n = V.p;
    try {
      V.p = 8, Ao(t, l, a, e);
    } finally {
      V.p = n, j.T = u;
    }
  }
  function Ao(t, l, a, e) {
    if (_u) {
      var u = po(e);
      if (u === null)
        io(
          t,
          l,
          e,
          Ji,
          a
        ), km(t, e);
      else if (ny(
        u,
        t,
        l,
        a,
        e
      ))
        e.stopPropagation();
      else if (km(t, e), l & 4 && -1 < uy.indexOf(t)) {
        for (; u !== null; ) {
          var n = Be(u);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = re(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - Ul(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    ha(n), (zt & 6) === 0 && (Ri = $() + 500, dn(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ye(n, 2), c !== null && Al(c, n, 2), Hi(), No(n, 2);
            }
          if (n = po(e), n === null && io(
            t,
            l,
            e,
            Ji,
            a
          ), n === u) break;
          u = n;
        }
        u !== null && e.stopPropagation();
      } else
        io(
          t,
          l,
          e,
          null,
          a
        );
    }
  }
  function po(t) {
    return t = sc(t), Co(t);
  }
  var Ji = null;
  function Co(t) {
    if (Ji = null, t = de(t), t !== null) {
      var l = H(t);
      if (l === null) t = null;
      else {
        var a = l.tag;
        if (a === 13) {
          if (t = W(l), t !== null) return t;
          t = null;
        } else if (a === 31) {
          if (t = st(l), t !== null) return t;
          t = null;
        } else if (a === 3) {
          if (l.stateNode.current.memoizedState.isDehydrated)
            return l.tag === 3 ? l.stateNode.containerInfo : null;
          t = null;
        } else l !== t && (t = null);
      }
    }
    return Ji = t, null;
  }
  function Im(t) {
    switch (t) {
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
        switch (bt()) {
          case jt:
            return 2;
          case Ml:
            return 8;
          case xa:
          case g0:
            return 32;
          case Yo:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Mo = !1, ee = null, ue = null, ne = null, Tn = /* @__PURE__ */ new Map(), En = /* @__PURE__ */ new Map(), ie = [], uy = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function km(t, l) {
    switch (t) {
      case "focusin":
      case "focusout":
        ee = null;
        break;
      case "dragenter":
      case "dragleave":
        ue = null;
        break;
      case "mouseover":
      case "mouseout":
        ne = null;
        break;
      case "pointerover":
      case "pointerout":
        Tn.delete(l.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        En.delete(l.pointerId);
    }
  }
  function zn(t, l, a, e, u, n) {
    return t === null || t.nativeEvent !== n ? (t = {
      blockedOn: l,
      domEventName: a,
      eventSystemFlags: e,
      nativeEvent: n,
      targetContainers: [u]
    }, l !== null && (l = Be(l), l !== null && Fm(l)), t) : (t.eventSystemFlags |= e, l = t.targetContainers, u !== null && l.indexOf(u) === -1 && l.push(u), t);
  }
  function ny(t, l, a, e, u) {
    switch (l) {
      case "focusin":
        return ee = zn(
          ee,
          t,
          l,
          a,
          e,
          u
        ), !0;
      case "dragenter":
        return ue = zn(
          ue,
          t,
          l,
          a,
          e,
          u
        ), !0;
      case "mouseover":
        return ne = zn(
          ne,
          t,
          l,
          a,
          e,
          u
        ), !0;
      case "pointerover":
        var n = u.pointerId;
        return Tn.set(
          n,
          zn(
            Tn.get(n) || null,
            t,
            l,
            a,
            e,
            u
          )
        ), !0;
      case "gotpointercapture":
        return n = u.pointerId, En.set(
          n,
          zn(
            En.get(n) || null,
            t,
            l,
            a,
            e,
            u
          )
        ), !0;
    }
    return !1;
  }
  function Pm(t) {
    var l = de(t.target);
    if (l !== null) {
      var a = H(l);
      if (a !== null) {
        if (l = a.tag, l === 13) {
          if (l = W(a), l !== null) {
            t.blockedOn = l, Ko(t.priority, function() {
              Wm(a);
            });
            return;
          }
        } else if (l === 31) {
          if (l = st(a), l !== null) {
            t.blockedOn = l, Ko(t.priority, function() {
              Wm(a);
            });
            return;
          }
        } else if (l === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          t.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    t.blockedOn = null;
  }
  function $i(t) {
    if (t.blockedOn !== null) return !1;
    for (var l = t.targetContainers; 0 < l.length; ) {
      var a = po(t.nativeEvent);
      if (a === null) {
        a = t.nativeEvent;
        var e = new a.constructor(
          a.type,
          a
        );
        oc = e, a.target.dispatchEvent(e), oc = null;
      } else
        return l = Be(a), l !== null && Fm(l), t.blockedOn = a, !1;
      l.shift();
    }
    return !0;
  }
  function t0(t, l, a) {
    $i(t) && a.delete(l);
  }
  function iy() {
    Mo = !1, ee !== null && $i(ee) && (ee = null), ue !== null && $i(ue) && (ue = null), ne !== null && $i(ne) && (ne = null), Tn.forEach(t0), En.forEach(t0);
  }
  function Fi(t, l) {
    t.blockedOn === l && (t.blockedOn = null, Mo || (Mo = !0, N.unstable_scheduleCallback(
      N.unstable_NormalPriority,
      iy
    )));
  }
  var Wi = null;
  function l0(t) {
    Wi !== t && (Wi = t, N.unstable_scheduleCallback(
      N.unstable_NormalPriority,
      function() {
        Wi === t && (Wi = null);
        for (var l = 0; l < t.length; l += 3) {
          var a = t[l], e = t[l + 1], u = t[l + 2];
          if (typeof e != "function") {
            if (Co(e || a) === null)
              continue;
            break;
          }
          var n = Be(a);
          n !== null && (t.splice(l, 3), l -= 3, of(
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
  function Ou(t) {
    function l(f) {
      return Fi(f, t);
    }
    ee !== null && Fi(ee, t), ue !== null && Fi(ue, t), ne !== null && Fi(ne, t), Tn.forEach(l), En.forEach(l);
    for (var a = 0; a < ie.length; a++) {
      var e = ie[a];
      e.blockedOn === t && (e.blockedOn = null);
    }
    for (; 0 < ie.length && (a = ie[0], a.blockedOn === null); )
      Pm(a), a.blockedOn === null && ie.shift();
    if (a = (t.ownerDocument || t).$$reactFormReplay, a != null)
      for (e = 0; e < a.length; e += 3) {
        var u = a[e], n = a[e + 1], i = u[El] || null;
        if (typeof n == "function")
          i || l0(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (u = n, i = n[El] || null)
              c = i.formAction;
            else if (Co(u) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[e + 1] = c : (a.splice(e, 3), e -= 3), l0(a);
        }
      }
  }
  function a0() {
    function t(n) {
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
    function l() {
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
      return navigation.addEventListener("navigate", t), navigation.addEventListener("navigatesuccess", l), navigation.addEventListener("navigateerror", l), setTimeout(a, 100), function() {
        e = !0, navigation.removeEventListener("navigate", t), navigation.removeEventListener("navigatesuccess", l), navigation.removeEventListener("navigateerror", l), u !== null && (u(), u = null);
      };
    }
  }
  function Do(t) {
    this._internalRoot = t;
  }
  Ii.prototype.render = Do.prototype.render = function(t) {
    var l = this._internalRoot;
    if (l === null) throw Error(d(409));
    var a = l.current, e = Yl();
    Jm(a, e, t, l, null, null);
  }, Ii.prototype.unmount = Do.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var l = t.containerInfo;
      Jm(t.current, 2, null, t, null, null), Hi(), l[qe] = null;
    }
  };
  function Ii(t) {
    this._internalRoot = t;
  }
  Ii.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var l = Zo();
      t = { blockedOn: null, target: t, priority: l };
      for (var a = 0; a < ie.length && l !== 0 && l < ie[a].priority; a++) ;
      ie.splice(a, 0, t), a === 0 && Pm(t);
    }
  };
  var e0 = C.version;
  if (e0 !== "19.3.0")
    throw Error(
      d(
        527,
        e0,
        "19.3.0"
      )
    );
  V.findDOMNode = function(t) {
    var l = t._reactInternals;
    if (l === void 0)
      throw typeof t.render == "function" ? Error(d(188)) : (t = Object.keys(t).join(","), Error(d(268, t)));
    return t = tt(l), t = t !== null ? G(t) : null, t = t === null ? null : t.stateNode, t;
  };
  var cy = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: j,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var ki = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!ki.isDisabled && ki.supportsFiber)
      try {
        Mu = ki.inject(
          cy
        ), Dl = ki;
      } catch {
      }
  }
  return On.createRoot = function(t, l) {
    if (!Q(t)) throw Error(d(299));
    var a = !1, e = "", u = wr, n = Jr, i = $r;
    return l != null && (l.unstable_strictMode === !0 && (a = !0), l.identifierPrefix !== void 0 && (e = l.identifierPrefix), l.onUncaughtError !== void 0 && (u = l.onUncaughtError), l.onCaughtError !== void 0 && (n = l.onCaughtError), l.onRecoverableError !== void 0 && (i = l.onRecoverableError)), l = Km(
      t,
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
      a0
    ), t[qe] = l.current, no(t), new Do(l);
  }, On.hydrateRoot = function(t, l, a) {
    if (!Q(t)) throw Error(d(299));
    var e = !1, u = "", n = wr, i = Jr, c = $r, f = null;
    return a != null && (a.unstable_strictMode === !0 && (e = !0), a.identifierPrefix !== void 0 && (u = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), l = Km(
      t,
      1,
      !0,
      l,
      a ?? null,
      e,
      u,
      f,
      n,
      i,
      c,
      a0
    ), l.context = wm(null), a = l.current, e = Yl(), e = ec(e), u = Za(e), u.callback = null, Ka(a, u, e), a = e, l.current.lanes = a, Uu(l, a), ha(l), t[qe] = l.current, no(t), new Ii(l);
  }, On.version = "19.3.0", On;
}
var m0;
function gy() {
  if (m0) return jo.exports;
  m0 = 1;
  function N() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(N);
      } catch (C) {
        console.error(C);
      }
  }
  return N(), jo.exports = yy(), jo.exports;
}
var by = gy();
function Sy(N, C) {
  const A = (_) => N.querySelector(`[data-mlb="${_}"]`), d = (_) => N.querySelector(`[data-mlb-template="${_}"]`).content.firstElementChild.cloneNode(!0), Q = (_, U) => {
    A(_).textContent = U;
  }, H = (_, U) => {
    A(_).hidden = !U;
  }, W = (_, U, K = !1) => {
    A(_).onclick = U, A(_).disabled = K;
  };
  function st(_, U, K) {
    const dt = JSON.stringify(U);
    _.dataset.options !== dt && (_.replaceChildren(...U.map(([Jt, Cl]) => {
      const Wl = d("option");
      return Wl.value = Jt, Wl.textContent = Cl, Wl;
    })), _.dataset.options = dt), _.value = K;
  }
  function k(_, U, K) {
    const dt = A(_), Jt = JSON.stringify(U);
    dt.dataset.content !== Jt && (dt.replaceChildren(...K()), dt.dataset.content = Jt);
  }
  const {
    catalog: tt,
    error: G,
    feedback: T,
    busy: x,
    config: w,
    selected: Ct,
    source: Gt,
    allSources: nt,
    allYears: qt,
    activeYear: wt,
    sources: pl,
    years: Xt,
    themes: Bt,
    theme: _t,
    search: D,
    facets: F,
    dimensions: et,
    filtered: Et,
    visible: Lt,
    page: it,
    selectedItems: Rt,
    sourceLabel: nl,
    themeLabel: Mt,
    metadata: M,
    limits: Z,
    preview: R,
    previewError: ct,
    resultado: ut,
    origin: Pt,
    changeOrigin: ml,
    changeSource: Tl,
    changeYear: s
  } = C, O = !tt || x, X = tt?.featureCount || tt?.municipalities || 645, B = tt?.territoryLabel || "municípios";
  N.querySelector(".mlb-geometry strong").textContent = `${X.toLocaleString("pt-BR")} ${B}`, N.querySelector(".mlb-eyebrow").textContent = `SÃO PAULO — ${B.toLocaleUpperCase("pt-BR")}`, N.querySelector(".territorial-builder-description").textContent = `Selecione fontes, períodos, temas e atributos para compor uma camada dos ${X.toLocaleString("pt-BR")} ${B} de São Paulo. Geometria IBGE 2022; valores ausentes permanecem nulos.`;
  const J = A("origin");
  J && (J.value = Pt, J.disabled = O, J.onchange = (_) => ml(_.target.value)), H("loading", !tt), Q("loading", G ? "Não foi possível carregar o catálogo." : "Carregando catálogo…"), H("retry", !tt && !!G), W("retry", () => C.setAttempt((_) => _ + 1)), H("error", !!G && !T), Q("error", G), st(A("source"), [["__todas__", "Todas as fontes"], ...pl.map((_) => [_, nl(_)])], Gt), st(A("year"), [["", "Todos"], ...Xt.map((_) => [_, _])], qt ? "" : wt ?? ""), st(A("theme"), [["", "Todos os temas"], ...Bt.map((_) => [_, Mt(_)])], _t);
  for (const _ of ["source", "year", "theme", "search", "format", "name"]) A(_).disabled = O;
  A("source").onchange = (_) => Tl(_.target.value), A("year").onchange = (_) => s(_.target.value), A("theme").onchange = (_) => C.setTheme(_.target.value);
  const rt = N.querySelector(".mlb-filters"), ft = document.createElement("canvas"), j = ft.getContext("2d");
  if (j) {
    j.font = getComputedStyle(A("source")).font;
    for (const _ of ["origin", "theme"]) {
      const U = A(_);
      U && rt.style.setProperty(
        `--filter-${_}-width`,
        `${Math.ceil(Math.max(...[...U.options].map((K) => j.measureText(K.text).width))) + 48}px`
      );
    }
  }
  A("search").value = D, A("search").oninput = (_) => C.setSearch(_.target.value), k("facets", et, () => et.map(([_, U]) => {
    const K = d("facet");
    K.querySelector("span").textContent = _;
    const dt = K.querySelector("select");
    return dt.dataset.dimension = _, st(dt, [["", `Todos (${U.length})`], ...U.map((Jt) => [Jt, Jt])], F[_] ?? ""), K;
  }));
  for (const _ of A("facets").querySelectorAll("select"))
    _.value = F[_.dataset.dimension] ?? "", _.disabled = O, _.onchange = (U) => C.setFacets({ ...F, [_.dataset.dimension]: U.target.value });
  H("reset", Object.values(F).some(Boolean)), W("reset", () => C.setFacets({}), O), Q("available", `${Et.length.toLocaleString("pt-BR")} atributos disponíveis`), W("add", () => C.update({ ...w, attributes: [.../* @__PURE__ */ new Set([...w.attributes, ...Et.map((_) => _.id)])] }), O || !Et.length), W("clear", () => C.update({ ...w, attributes: [] }), O || !Ct.size);
  const V = (_) => `${Mt(_.theme)} · ${_.unit || "Unidade não informada"} · ${_.coverage}/${X} com valor`;
  k("attributes", [Lt, nt], () => Lt.map((_) => {
    const U = d("attribute");
    U.dataset.id = _.id, U.querySelector("strong").textContent = _.label, U.querySelector("summary").setAttribute("aria-label", `Fonte e definição de ${_.label}`), U.querySelector(".mlb-detail-meta").textContent = V(_), U.querySelector("[data-field]").textContent = `${nt ? `${_.source} · ` : ""}${_.field} · ${_.year}`;
    const K = U.querySelector("a");
    try {
      const Jt = new URL(_.url);
      ["https:", "http:"].includes(Jt.protocol) && (K.href = Jt.href);
    } catch {
    }
    const dt = M(_);
    return U.querySelector("[data-definition]").textContent = [dt.definicao || dt.divulgacao, dt.formula ? `Fórmula: ${dt.formula}` : ""].filter(Boolean).join(" · "), U.querySelector("[data-note]").textContent = [_.producer ? `Cálculo: ${_.producer}.` : "", dt.nota, dt.homologado_hierarquizacao === !1 ? "Cálculo disponível; não homologado automaticamente para hierarquização." : ""].filter(Boolean).join(" "), U;
  }));
  for (const _ of A("attributes").children) {
    const U = _.querySelector("input");
    U.checked = Ct.has(_.dataset.id), U.disabled = O, U.onchange = () => C.toggle(_.dataset.id), _.classList.toggle("mlb-chosen", U.checked);
  }
  H("empty", !Lt.length), W("previous", () => C.setPage(it - 1), O || !it), W("next", () => C.setPage(it + 1), O || (it + 1) * 40 >= Et.length), Q("page", `Página ${it + 1} de ${Math.max(1, Math.ceil(Et.length / 40))}`), Q("count", w.attributes.length.toLocaleString("pt-BR")), k("basket", Rt, () => Rt.map((_) => {
    const U = d("basket");
    U.dataset.id = _.id, U.querySelector(".mlb-basket-name").textContent = _.label, U.querySelector("summary").setAttribute("aria-label", `Fonte e definição de ${_.label}`), U.querySelector(".mlb-detail-meta").textContent = `${_.source} · ${_.year}`, U.querySelector("[data-description]").textContent = V(_), U.querySelector("[data-field]").textContent = _.field;
    const K = U.querySelector("button");
    return K.title = `Remover ${_.label}`, K.setAttribute("aria-label", K.title), U;
  }));
  for (const _ of A("basket").children)
    _.querySelector("button").disabled = O, _.querySelector("button").onclick = () => C.toggle(_.dataset.id);
  H("basket-empty", !Rt.length), A("format").value = w.format, A("format").onchange = (_) => C.update({ ...w, format: _.target.value }), Q("format-note", w.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : w.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados."), A("name").value = w.nome ?? "", A("name").placeholder = C.nomePadrao, A("name").oninput = (_) => C.update({ ...w, nome: _.target.value }), H("limit", !T && Ct.size > Z[w.format]), H("category-required", !C.canGenerate), W("generate", C.generate, !C.canGenerate || O || !Ct.size || Ct.size > Z[w.format]), Q("generate", x ? "Gerando camada…" : C.download ? "Gerar e baixar camada" : "Gerar camada"), H("status", !T), Q("status", C.status), H("results", !!(ut || ct || R)), H("preview-error", !!ct), Q("preview-error-text", T ? "" : `Prévia indisponível: ${ct} `), W("preview-retry", () => C.setPreviewAttempt((_) => _ + 1)), H("preview", !!R), H("glossary", !!R?.glossario?.length);
  const tl = A("preview-head");
  A("preview-description") && (A("preview-description").textContent = `Até 5 ${B} · todos os campos fixos e até 8 indicadores selecionados. A exportação inclui ${X.toLocaleString("pt-BR")} ${B} e todos os atributos escolhidos.`);
  const ya = R ? [...R.fixedFields || [R.keyField || "CD_MUN", "NM_MUN"], ...R.fields] : [], Fl = JSON.stringify([ya, R?.aliases]);
  if (tl.dataset.fields !== Fl) {
    tl.replaceChildren();
    for (const _ of ya) {
      const U = d("head");
      U.textContent = R.aliases?.[_] || _, U.title = _, tl.append(U);
    }
    tl.dataset.fields = Fl;
  }
  k("preview-body", R, () => (R?.rows || []).map((_) => {
    const U = d("row");
    for (const K of ya) {
      const dt = d("cell");
      dt.textContent = _[K] == null ? "Sem valor" : _[K].toLocaleString("pt-BR", { maximumFractionDigits: 8 }), U.append(dt);
    }
    return U;
  })), k("glossary-body", R?.glossario, () => (R?.glossario || []).map((_) => {
    const U = d("glossary");
    return U.querySelector("code").textContent = _.campo_exportado, ["alias", "significado", "fonte"].forEach((K, dt) => U.children[dt + 1].textContent = _[K]), U;
  })), Q("glossary-note", R?.totalAttributes > (R?.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${R.glossarioLimite} de ${R.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : "");
}
function Ty(N = "/api") {
  async function C(A, d, Q) {
    const H = await fetch(`${N.replace(/\/$/, "")}/${A}`, {
      ...d ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) } : {},
      signal: Q
    });
    if (!H.ok) {
      const W = await H.json().catch(() => ({}));
      throw new Error(W.error || `Erro HTTP ${H.status}`);
    }
    return A === "export" ? H.blob() : H.json();
  }
  return { catalog: (A) => C("catalog", null, A), preview: (A, d) => C("preview", A, d), export: (A, d) => C("export", A, d) };
}
const v0 = {
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
}, Pi = (N) => {
  try {
    return JSON.parse(N.detail) || {};
  } catch {
    return {};
  }
}, tc = (N) => {
  if (v0[N]) return v0[N];
  const C = String(N).replace(/^\d+_/, "").replaceAll("_", " ");
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
}, h0 = (N) => Ey[N] || String(N).replace(/\s*[·/]\s*/g, " — ");
function zy(N) {
  let C = "";
  try {
    C = JSON.parse(N.detail).categorias || "";
  } catch {
    C = "";
  }
  const A = {};
  for (const d of String(C).split("|")) {
    const Q = d.indexOf(":");
    if (Q < 1) continue;
    const H = d.slice(0, Q).trim(), W = d.slice(Q + 1).trim();
    H && W && (A[H] = W);
  }
  return A;
}
const Nu = { fgb: 6500, gpkg: 1900, shp: 250, geojson: 6500 }, lc = "__todas__";
function _y({ apiBaseUrl: N = "/api", client: C, value: A, onChange: d, onExport: Q, download: H = !0, className: W = "", categoriaNome: st = "", feedback: k, resultado: tt = null, htmlHost: G = null, canGenerate: T = !0 }) {
  const x = ht.useMemo(() => C || Ty(N), [C, N]), [w, Ct] = ht.useState(null), [Gt, nt] = ht.useState(0), [qt, wt] = ht.useState(""), [pl, Xt] = ht.useState(0), [Bt, _t] = ht.useState({ attributes: [], format: "fgb" }), D = A ?? Bt, [F, et] = ht.useState(""), [Et, Lt] = ht.useState("originais"), [it, Rt] = ht.useState("2022"), [nl, Mt] = ht.useState(""), [M, Z] = ht.useState(""), [R, ct] = ht.useState({}), [ut, Pt] = ht.useState(0), [ml, Tl] = ht.useState(""), [s, O] = ht.useState(!1), [X, B] = ht.useState(""), [J, rt] = ht.useState(null), ft = ht.useRef(!0);
  ht.useEffect(() => {
    ft.current = !0;
    const S = new AbortController();
    return Ct(null), Tl(""), x.catalog(S.signal).then(($) => {
      Ct($);
      const bt = $.attributes.filter((Ml) => (Ml.origin || "originais") === "originais"), jt = bt.find((Ml) => Ml.source === "IBGE · Censo 2022") || bt[0];
      et(jt?.source || lc), Rt("2022"), Mt("");
    }).catch(($) => {
      $.name !== "AbortError" && (Tl($.message), k?.error($.message, "Catálogo de indicadores"));
    }), () => {
      ft.current = !1, S.abort();
    };
  }, [x, Gt]);
  function j(S) {
    k && S.attributes.length > Nu[S.format] && (S.format !== D.format || D.attributes.length <= Nu[D.format]) && k.warning("Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos.", "Formato da camada"), A === void 0 && _t(S), d?.(S), B("");
  }
  const V = w?.attributes || [], tl = V.filter((S) => (S.origin || "originais") === Et), ya = w?.featureCount || w?.municipalities || 645, Fl = w?.territoryLabel || "municípios", _ = [...new Set(tl.map((S) => S.source))], U = F === lc, K = [...new Set(tl.filter((S) => U || S.source === F).map((S) => S.year))].sort((S, $) => $ - S), dt = it === "", Jt = dt ? null : K.includes(Number(it)) ? Number(it) : K[0], Cl = tl.filter((S) => (U || S.source === F) && (dt || S.year === Jt)), Wl = [...new Set(Cl.map((S) => S.theme))], hl = new Set(D.attributes), ga = ht.useMemo(() => {
    const S = V.filter((jt) => hl.has(jt.id));
    if (!S.length) return "Categoria — fonte majoritária — data da geração";
    const $ = /* @__PURE__ */ new Map();
    for (const jt of S) $.set(jt.source, ($.get(jt.source) || 0) + 1);
    const bt = [...$.entries()].sort((jt, Ml) => Ml[1] - jt[1])[0][0];
    return `${st || "Categoria"} — ${bt} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [V, D.attributes, st]), ja = V.filter((S) => hl.has(S.id)), fe = ht.useMemo(() => new Map(V.map((S) => [S.id, zy(S)])), [V]), xe = Cl.filter((S) => (!nl || S.theme === nl) && `${S.label} ${S.field} ${S.unit}`.toLocaleLowerCase("pt-BR").includes(M.toLocaleLowerCase("pt-BR"))), Au = (S, $) => Object.entries(R).every(([bt, jt]) => !jt || bt === $ || fe.get(S.id)?.[bt] === jt), Il = (() => {
    if (!nl) return [];
    const S = /* @__PURE__ */ new Map();
    for (const $ of xe) for (const [bt, jt] of Object.entries(fe.get($.id) || {}))
      S.has(bt) || S.set(bt, /* @__PURE__ */ new Set()), Au($, bt) && S.get(bt).add(jt);
    return [...S].map(([$, bt]) => [$, [...bt].sort((jt, Ml) => jt.localeCompare(Ml, "pt-BR", { numeric: !0 }))]).filter(([$, bt]) => bt.length > 1 || R[$]).sort(($, bt) => $[0].localeCompare(bt[0], "pt-BR"));
  })(), kl = xe.filter((S) => Au(S, null)), oe = kl.slice(ut * 40, ut * 40 + 40);
  ht.useEffect(() => {
    Pt(0);
  }, [F, it, nl, M, R, Et]);
  function Nn(S) {
    Lt(S), et(lc), Rt(""), Mt(""), ct({});
  }
  function pu(S) {
    et(S), Rt(""), Mt(""), ct({});
  }
  function He(S) {
    Rt(S), Mt(""), ct({});
  }
  ht.useEffect(() => {
    ct({});
  }, [F, it, nl]);
  const Cu = `${D.format}|${[...D.attributes].join(",")}`;
  ht.useEffect(() => {
    if (rt(null), wt(""), !D.attributes.length || D.attributes.length > Nu[D.format]) return;
    const S = new AbortController(), $ = { attributes: D.attributes, format: D.format }, bt = setTimeout(() => x.preview($, S.signal).then((jt) => {
      S.signal.aborted || rt(jt);
    }).catch((jt) => {
      S.signal.aborted || (wt(jt.message), k?.error(jt.message, "Prévia dos indicadores"));
    }), 250);
    return () => {
      clearTimeout(bt), S.abort();
    };
  }, [x, Cu, pl]);
  function se(S) {
    j({ ...D, attributes: hl.has(S) ? D.attributes.filter(($) => $ !== S) : [...D.attributes, S] });
  }
  async function An() {
    if (!T || k && !await k.confirmar({ title: "Gerar camada territorial", message: `Gerar uma camada com ${D.attributes.length} atributos de ${ya.toLocaleString("pt-BR")} ${Fl} de São Paulo?`, confirmLabel: "Gerar camada" })) return;
    const S = k?.processo("Gerando camada territorial");
    S?.passo("Gerando a geometria e materializando os atributos selecionados…"), O(!0), Tl(""), B(w?.destino ? `Gerando geometria e tabela de atributos em ${w.destino}/` : "Gerando geometria e tabela de atributos…");
    const $ = { ...D, attributes: [...D.attributes] };
    try {
      const bt = await x.export($, S?.signal, S), jt = `${w?.territorialidade === "setores_2022" ? "setores_sp_2022" : "municipios_sp"}_${$.format}.zip`;
      if (await Q?.({ blob: bt, filename: jt, configuration: $, attributes: ja }), H) {
        const Ml = URL.createObjectURL(bt), xa = document.createElement("a");
        xa.href = Ml, xa.download = jt, xa.click(), setTimeout(() => URL.revokeObjectURL(Ml), 1e4);
      }
      ft.current && B("Camada gerada. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT."), S?.concluir({ type: "success", message: "Camada gerada e disponível no acervo. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT." });
    } catch (bt) {
      ft.current && (Tl(bt.message), B("")), S?.concluir({ type: bt.name === "AbortError" ? "info" : "error", message: bt.message });
    } finally {
      ft.current && O(!1);
    }
  }
  return ht.useEffect(() => {
    G && Sy(G, {
      catalog: w,
      error: ml,
      feedback: k,
      busy: s,
      config: D,
      selected: hl,
      source: F,
      allSources: U,
      allYears: dt,
      activeYear: Jt,
      sources: _,
      years: K,
      themes: Wl,
      theme: nl,
      search: M,
      facets: R,
      dimensions: Il,
      filtered: kl,
      visible: oe,
      page: ut,
      selectedItems: ja,
      origin: Et,
      changeOrigin: Nn,
      changeSource: pu,
      changeYear: He,
      sourceLabel: h0,
      themeLabel: tc,
      metadata: Pi,
      limits: Nu,
      preview: J,
      previewError: qt,
      resultado: tt,
      nomePadrao: ga,
      download: H,
      status: X,
      canGenerate: T,
      setAttempt: nt,
      setSource: et,
      setTheme: Mt,
      setYear: Rt,
      setSearch: Z,
      setFacets: ct,
      update: j,
      toggle: se,
      setPage: Pt,
      generate: An,
      setPreviewAttempt: Xt
    });
  }), G ? tt : /* @__PURE__ */ g.jsxs("section", { className: `mlb ${W}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ g.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ g.jsxs("div", { children: [
        /* @__PURE__ */ g.jsx("h2", { className: "mlb-title", children: "Monte sua camada" }),
        /* @__PURE__ */ g.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO - DADOS MUNICIPAIS" }),
        /* @__PURE__ */ g.jsx("p", { children: "Selecione fontes, períodos, temas e atributos para compor uma única camada vetorial dos 645 municípios de São Paulo. Os dados escolhidos serão incorporados à tabela de atributos da malha municipal do IBGE de 2022." })
      ] }),
      /* @__PURE__ */ g.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ g.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ g.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    ml && !k && /* @__PURE__ */ g.jsx("div", { className: "mlb-error", role: "alert", children: ml }),
    w ? /* @__PURE__ */ g.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ g.jsxs("section", { className: "mlb-panel", children: [
        /* @__PURE__ */ g.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ g.jsxs("label", { children: [
            "Tipo de valor",
            /* @__PURE__ */ g.jsxs("select", { value: Et, onChange: (S) => Nn(S.target.value), disabled: s, children: [
              /* @__PURE__ */ g.jsx("option", { value: "originais", children: "Valores originais" }),
              /* @__PURE__ */ g.jsx("option", { value: "combinados", children: "Valores combinados — SICARD" })
            ] })
          ] }),
          /* @__PURE__ */ g.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ g.jsxs("select", { value: F, onChange: (S) => pu(S.target.value), children: [
              /* @__PURE__ */ g.jsx("option", { value: lc, children: "Todas as fontes" }),
              _.map((S) => /* @__PURE__ */ g.jsx("option", { value: S, children: h0(S) }, S))
            ] })
          ] }),
          /* @__PURE__ */ g.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ g.jsxs("select", { value: dt ? "" : Jt ?? "", onChange: (S) => He(S.target.value), children: [
              /* @__PURE__ */ g.jsx("option", { value: "", children: "Todos" }),
              K.map((S) => /* @__PURE__ */ g.jsx("option", { children: S }, S))
            ] })
          ] }),
          /* @__PURE__ */ g.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ g.jsxs("select", { value: nl, onChange: (S) => Mt(S.target.value), children: [
              /* @__PURE__ */ g.jsx("option", { value: "", children: "Todos os temas" }),
              Wl.map((S) => /* @__PURE__ */ g.jsx("option", { value: S, children: tc(S) }, S))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ g.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ g.jsx("input", { type: "search", value: M, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (S) => Z(S.target.value) })
          ] }),
          Il.map(([S, $]) => /* @__PURE__ */ g.jsxs("label", { children: [
            S,
            /* @__PURE__ */ g.jsxs("select", { value: R[S] ?? "", onChange: (bt) => ct({ ...R, [S]: bt.target.value }), children: [
              /* @__PURE__ */ g.jsxs("option", { value: "", children: [
                "Todos (",
                $.length,
                ")"
              ] }),
              $.map((bt) => /* @__PURE__ */ g.jsx("option", { value: bt, children: bt }, bt))
            ] })
          ] }, S)),
          !!Object.values(R).filter(Boolean).length && /* @__PURE__ */ g.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => ct({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ g.jsxs("span", { children: [
            kl.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ g.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ g.jsx("button", { type: "button", disabled: !kl.length || s, onClick: () => j({ ...D, attributes: [.../* @__PURE__ */ new Set([...D.attributes, ...kl.map((S) => S.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ g.jsx("button", { type: "button", disabled: !hl.size || s, onClick: () => j({ ...D, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-attributes", children: [
          oe.map((S) => /* @__PURE__ */ g.jsxs("article", { className: hl.has(S.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ g.jsxs("label", { children: [
              /* @__PURE__ */ g.jsx("input", { type: "checkbox", checked: hl.has(S.id), disabled: s, onChange: () => se(S.id) }),
              /* @__PURE__ */ g.jsx("strong", { children: S.label })
            ] }),
            /* @__PURE__ */ g.jsxs("details", { children: [
              /* @__PURE__ */ g.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ g.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ g.jsxs("p", { className: "mlb-detail-meta", children: [
                  tc(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ g.jsxs("p", { children: [
                  U ? `${S.source} · ` : "",
                  S.field,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ g.jsx("a", { href: S.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ g.jsx("p", { children: Pi(S).definicao || Pi(S).divulgacao || "" }),
                /* @__PURE__ */ g.jsx("p", { children: Pi(S).nota || "" })
              ] })
            ] })
          ] }, S.id)),
          !oe.length && /* @__PURE__ */ g.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ g.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ g.jsx("button", { type: "button", disabled: !ut, onClick: () => Pt(ut - 1), children: "Anterior" }),
          /* @__PURE__ */ g.jsxs("span", { children: [
            "Página ",
            ut + 1,
            " de ",
            Math.max(1, Math.ceil(kl.length / 40))
          ] }),
          /* @__PURE__ */ g.jsx("button", { type: "button", disabled: (ut + 1) * 40 >= kl.length, onClick: () => Pt(ut + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ g.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ g.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ g.jsx("strong", { children: D.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ g.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ g.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ g.jsxs("div", { className: "mlb-basket", children: [
          ja.map((S) => /* @__PURE__ */ g.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ g.jsx("span", { className: "mlb-basket-name", children: S.label }),
            /* @__PURE__ */ g.jsxs("details", { children: [
              /* @__PURE__ */ g.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ g.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ g.jsxs("p", { className: "mlb-detail-meta", children: [
                  S.source,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ g.jsxs("p", { children: [
                  tc(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ g.jsx("p", { children: S.field })
              ] })
            ] }),
            /* @__PURE__ */ g.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: s, title: `Remover ${S.label}`, "aria-label": `Remover ${S.label}`, onClick: () => se(S.id), children: "×" })
          ] }, S.id)),
          !ja.length && /* @__PURE__ */ g.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ g.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ g.jsxs("select", { disabled: s, value: D.format, onChange: (S) => j({ ...D, format: S.target.value }), children: [
            /* @__PURE__ */ g.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ g.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ g.jsx("option", { value: "shp", children: "Shapefile (.shp)" }),
            /* @__PURE__ */ g.jsx("option", { value: "geojson", children: "GeoJSON (.geojson)" })
          ] })
        ] }),
        /* @__PURE__ */ g.jsxs("p", { className: "mlb-note", children: [
          D.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : D.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP com relatório do join, glossário e tabela em CSV, XLSX e TXT."
        ] }),
        /* @__PURE__ */ g.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ g.jsx("input", { type: "text", maxLength: 200, disabled: s, value: D.nome ?? "", placeholder: ga, onChange: (S) => j({ ...D, nome: S.target.value }) })
        ] }),
        /* @__PURE__ */ g.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        !k && hl.size > Nu[D.format] && /* @__PURE__ */ g.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ g.jsx("button", { type: "button", className: "mlb-primary", disabled: !T || s || !hl.size || hl.size > Nu[D.format], onClick: An, children: s ? "Gerando camada…" : H ? "Gerar e baixar camada" : "Gerar camada" }),
        !k && /* @__PURE__ */ g.jsx("p", { className: "mlb-status", role: "status", children: X }),
        /* @__PURE__ */ g.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      (tt || qt || J) && /* @__PURE__ */ g.jsxs("section", { className: "mlb-panel mlb-resultados", "aria-label": "Resultados", children: [
        /* @__PURE__ */ g.jsx("h2", { children: "Resultados" }),
        tt,
        qt && /* @__PURE__ */ g.jsxs("div", { className: k ? "mlb-bloco mlb-preview" : "mlb-bloco mlb-error mlb-preview", children: [
          !k && /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
            "Prévia indisponível: ",
            qt,
            " "
          ] }),
          /* @__PURE__ */ g.jsx("button", { type: "button", onClick: () => Xt((S) => S + 1), children: "Tentar novamente" })
        ] }),
        J && /* @__PURE__ */ g.jsxs("section", { className: "mlb-bloco mlb-preview", children: [
          /* @__PURE__ */ g.jsx("h3", { children: "Prévia da tabela de atributos" }),
          /* @__PURE__ */ g.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
          /* @__PURE__ */ g.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ g.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ g.jsx("thead", { children: /* @__PURE__ */ g.jsxs("tr", { children: [
              /* @__PURE__ */ g.jsx("th", { children: "Código IBGE" }),
              /* @__PURE__ */ g.jsx("th", { children: "Município" }),
              J.fields.map((S) => /* @__PURE__ */ g.jsx("th", { title: S, children: J.aliases?.[S] || S }, S))
            ] }) }),
            /* @__PURE__ */ g.jsx("tbody", { children: J.rows.map((S) => /* @__PURE__ */ g.jsxs("tr", { children: [
              /* @__PURE__ */ g.jsx("td", { children: S.CD_MUN }),
              /* @__PURE__ */ g.jsx("td", { children: S.NM_MUN }),
              J.fields.map(($) => /* @__PURE__ */ g.jsx("td", { children: S[$] == null ? "Sem valor" : S[$].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, $))
            ] }, S.CD_MUN)) })
          ] }) })
        ] }),
        J?.glossario?.length ? /* @__PURE__ */ g.jsxs("section", { className: "mlb-bloco mlb-glossario", children: [
          /* @__PURE__ */ g.jsx("h3", { children: "Glossário e aliases de atributos" }),
          /* @__PURE__ */ g.jsxs("p", { children: [
            "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
            J.totalAttributes > (J.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${J.glossarioLimite} de ${J.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
          ] }),
          /* @__PURE__ */ g.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ g.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ g.jsx("thead", { children: /* @__PURE__ */ g.jsxs("tr", { children: [
              /* @__PURE__ */ g.jsx("th", { children: "Campo exportado" }),
              /* @__PURE__ */ g.jsx("th", { children: "Alias" }),
              /* @__PURE__ */ g.jsx("th", { children: "Significado" }),
              /* @__PURE__ */ g.jsx("th", { children: "Fonte" })
            ] }) }),
            /* @__PURE__ */ g.jsx("tbody", { children: J.glossario.map((S) => /* @__PURE__ */ g.jsxs("tr", { children: [
              /* @__PURE__ */ g.jsx("td", { children: /* @__PURE__ */ g.jsx("code", { children: S.campo_exportado }) }),
              /* @__PURE__ */ g.jsx("td", { children: S.alias }),
              /* @__PURE__ */ g.jsx("td", { className: "mlb-glossario-significado", children: S.significado }),
              /* @__PURE__ */ g.jsx("td", { children: S.fonte })
            ] }, S.campo_exportado)) })
          ] }) })
        ] }) : null
      ] })
    ] }) : /* @__PURE__ */ g.jsx("p", { role: "status", children: ml ? /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
      "Não foi possível carregar o catálogo. ",
      /* @__PURE__ */ g.jsx("button", { type: "button", onClick: () => nt((S) => S + 1), children: "Tentar novamente" })
    ] }) : "Carregando catálogo…" })
  ] });
}
function y0({ url: N, htmlHost: C }) {
  const A = ht.useRef(null), [d, Q] = ht.useState("Carregando a camada no mapa…");
  return ht.useEffect(() => {
    const H = window.L;
    if (!H) {
      Q("Biblioteca de mapa indisponível nesta página.");
      return;
    }
    const W = H.map(C?.querySelector('[data-mlb="map"]') || A.current, { scrollWheelZoom: !1 });
    H.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(W), W.setView([-22.3, -48.6], 6);
    const st = new AbortController();
    Q("Carregando a camada no mapa…"), fetch(N, { credentials: "same-origin", signal: st.signal }).then(async (tt) => {
      if (!tt.ok) throw new Error(`Não foi possível carregar a camada no mapa (HTTP ${tt.status}).`);
      return tt.json();
    }).then((tt) => {
      const G = H.geoJSON(tt, {
        style: { color: "#176b95", weight: 1, fillColor: "#4f97bf", fillOpacity: 0.25 },
        smoothFactor: 0,
        onEachFeature: (T, x) => {
          const w = T.properties || {};
          x.bindTooltip(w.CD_SETOR ? `Setor ${w.CD_SETOR} — ${w.NM_MUN}` : w.NM_MUN ? `${w.NM_MUN} (${w.CD_MUN})` : String(w.CD_MUN ?? ""), { sticky: !0 }), x.on("click", () => {
            const Ct = document.createElement("table");
            Ct.className = "territorial-mapa-popup";
            for (const [Gt, nt] of Object.entries(w)) {
              const qt = Ct.insertRow();
              qt.insertCell().textContent = Gt, qt.insertCell().textContent = nt == null ? "Sem valor" : typeof nt == "number" ? nt.toLocaleString("pt-BR", { maximumFractionDigits: 8 }) : String(nt);
            }
            x.bindPopup(Ct, { maxWidth: 420, maxHeight: 320 }).openPopup();
          });
        }
      }).addTo(W);
      G.getBounds().isValid() && W.fitBounds(G.getBounds(), { padding: [16, 16] }), Q(`${(tt.features || []).length.toLocaleString("pt-BR")} feições exibidas com a geometria original da camada salva. Clique em uma unidade territorial para ver seus atributos.`);
    }).catch((tt) => {
      tt.name !== "AbortError" && Q(tt.message);
    });
    const k = setTimeout(() => W.invalidateSize(), 0);
    return () => {
      st.abort(), clearTimeout(k), W.remove();
    };
  }, [N]), ht.useEffect(() => {
    C && (C.querySelector('[data-mlb="map-status"]').textContent = d);
  }, [C, d]), C ? null : /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
    /* @__PURE__ */ g.jsx("div", { ref: A, className: "territorial-mapa", role: "region", "aria-label": "Mapa da camada gerada" }),
    /* @__PURE__ */ g.jsx("p", { className: "territorial-mapa-status", role: "status", children: d })
  ] });
}
function Oy({ gerada: N, htmlHost: C }) {
  const A = ht.useRef(null);
  return ht.useEffect(() => {
    A.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [N]), ht.useEffect(() => {
    if (!C) return;
    const d = C.querySelector("#territorial-result"), Q = C.querySelector('[data-mlb="map-section"]');
    d.hidden = !1, Q.hidden = !1, C.querySelector('[data-mlb="results"]').hidden = !1, C.querySelector('[data-mlb="result-name"]').textContent = N.nome, C.querySelector('[data-mlb="result-category"]').textContent = N.categoria;
    const H = C.querySelector("#territorial-download");
    return H.href = N.download.href, H.download = N.download.filename, C.querySelector("#territorial-use").href = N.usar, d.scrollIntoView({ behavior: "smooth", block: "start" }), () => {
      d.hidden = !0, Q.hidden = !0;
    };
  }, [C, N]), C ? /* @__PURE__ */ g.jsx(y0, { url: N.geojson, htmlHost: C }) : /* @__PURE__ */ g.jsxs(g.Fragment, { children: [
    /* @__PURE__ */ g.jsxs("section", { ref: A, id: "territorial-result", className: "mlb-bloco territorial-result", "aria-label": "Camada gerada", children: [
      /* @__PURE__ */ g.jsx("h3", { children: "Camada gerada e salva" }),
      /* @__PURE__ */ g.jsxs("p", { children: [
        /* @__PURE__ */ g.jsx("strong", { children: N.nome }),
        " · Categoria: ",
        /* @__PURE__ */ g.jsx("span", { children: N.categoria })
      ] }),
      /* @__PURE__ */ g.jsx("p", { children: "O arquivo está disponível no acervo. Você pode baixá-lo ou incluí-lo na extração." }),
      /* @__PURE__ */ g.jsxs("div", { className: "ea-config-tools", children: [
        /* @__PURE__ */ g.jsx("a", { id: "territorial-download", className: "ea-btn", href: N.download.href, download: N.download.filename, children: "Baixar camada (.zip)" }),
        /* @__PURE__ */ g.jsx("a", { id: "territorial-use", className: "ea-btn ea-btn-primary", href: N.usar, children: "Usar na extração" })
      ] })
    ] }),
    /* @__PURE__ */ g.jsxs("section", { className: "mlb-bloco territorial-mapa-bloco", "aria-label": "Mapa da camada gerada", children: [
      /* @__PURE__ */ g.jsx("h3", { children: "Mapa da camada gerada" }),
      /* @__PURE__ */ g.jsx(y0, { url: N.geojson })
    ] })
  ] });
}
function Ny() {
  const N = window.ProcessFeedback, C = window.Notify;
  if (!N || !C) return null;
  const A = "Camadas territoriais";
  return {
    error: (d, Q) => C.error(Q || A, d),
    warning: (d, Q) => C.warning(Q || A, d),
    confirmar: (d) => N.confirmar(d),
    processo(d) {
      const Q = "Gerar geometria e atributos", H = N.iniciarCadastro({ title: d, tasks: [Q] });
      return {
        signal: new AbortController().signal,
        passo: (W) => H.tarefaAtual(Q, W),
        acompanhar: (W) => {
          N.atual === H && N.acompanhar(W);
        },
        // Devolver a Promise permite ao modal tratar recusa/falha sem confirmar cancelamento.
        definirCancelamento: (W) => {
          N.atual === H && N.permitirCancelamento(W ? async () => {
            await W(), H.confirmarCancelamento("Geração cancelada. Sua seleção foi mantida."), C.info(d, "Geração cancelada. Sua seleção foi mantida.", { duration: 7e3 });
          } : null);
        },
        concluir: ({ type: W = "success", message: st } = {}) => {
          if (W === "success")
            H.concluirTarefa(Q, "Camada gerada"), H.sucesso({ title: "Camada gerada", message: st });
          else if (W === "warning") H.sucesso({ _status: "partial", message: st });
          else if (W === "info") {
            const k = H._finalizado;
            H.confirmarCancelamento(st), k || C.info(d, st, { duration: 7e3 });
          } else H.erro({ message: st });
        }
      };
    }
  };
}
function Ay(N, { category: C, apiBase: A, onGenerated: d, onBusyChange: Q = () => {
}, configuration: H, onChange: W = () => {
} }) {
  const st = N.querySelector('[data-mlb="source"]') ? N : null, k = by.createRoot(st ? document.createDocumentFragment() : N);
  function tt({ category: T }) {
    const x = ht.useRef(T);
    x.current = T;
    const [w, Ct] = ht.useState(H || { attributes: [], format: "fgb" }), [Gt, nt] = ht.useState(null), qt = ht.useMemo(() => {
      let Xt;
      async function Bt(_t, D, F) {
        let et;
        const Et = H?.territorialidade || "municipios", Lt = _t === "catalog" ? `?territorialidade=${encodeURIComponent(Et)}` : "", it = D ? { ...D, territorialidade: Et } : null;
        try {
          et = await fetch(`${A}/extracao-atributos/municipal/${["catalog", "preview"].includes(_t) ? "" : `${encodeURIComponent(x.current.id)}/`}${_t}${Lt}`, {
            credentials: "same-origin",
            ...it ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it) } : {},
            signal: F
          });
        } catch (Rt) {
          throw Rt.name === "AbortError" ? Rt : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!et.ok) {
          const Rt = await et.json().catch(() => ({}));
          throw et.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof Rt.detail == "string" ? Rt.detail : `Não foi possível concluir a operação (HTTP ${et.status}).`);
        }
        return _t === "export" || _t.endsWith("/pacote") ? (Xt = { arquivo: et.headers.get("X-Camada-Arquivo"), id: et.headers.get("X-Camada-Id") }, et.blob()) : et.json();
      }
      return {
        catalog: (_t) => Bt("catalog", null, _t),
        preview: (_t, D) => Bt("preview", _t, D),
        export: async (_t, D, F) => {
          if (!x.current) throw new Error("Selecione a categoria da camada antes de gerar.");
          Q(!0);
          try {
            let et = await Bt("jobs", { ..._t, nome: _t.nome || "" });
            const Et = `jobs/${et.id}`, Lt = async () => {
              await Bt(`${Et}/cancelar`, {});
              let it = et;
              for (; it.status === "executando"; )
                await new Promise((Rt) => setTimeout(Rt, 500)), it = await Bt(Et), F?.acompanhar(it);
              if (it.status !== "cancelado") throw new Error(it.erro || "A gravação já terminou. Consulte o acervo.");
            };
            for (; et.status === "executando"; )
              F?.acompanhar(et), F?.definirCancelamento(et.cancelavel ? Lt : null, "A gravação final já começou. Aguarde sua conclusão."), await new Promise((it) => setTimeout(it, 500)), et = await Bt(Et);
            if (F?.acompanhar(et), et.status === "cancelado") {
              const it = new Error("Geração cancelada. Sua seleção foi mantida.");
              throw it.name = "AbortError", it;
            }
            if (et.status !== "concluido") throw new Error(et.erro || "Não foi possível gerar a camada.");
            return await Bt(`${Et}/pacote`);
          } catch (et) {
            throw Q(!1), et;
          }
        },
        generated: () => Xt
      };
    }, []), wt = ht.useMemo(Ny, []);
    async function pl(Xt) {
      try {
        const Bt = await d(qt.generated(), Xt);
        Bt && nt(Bt);
      } finally {
        Q(!1);
      }
    }
    return /* @__PURE__ */ g.jsx(_y, { htmlHost: st, value: w, onChange: (Xt) => {
      Ct(Xt), W(Xt);
    }, client: qt, download: !1, onExport: pl, categoriaNome: T?.nome || "", canGenerate: !!T, feedback: wt, resultado: Gt && /* @__PURE__ */ g.jsx(Oy, { gerada: Gt, htmlHost: st }) });
  }
  k.render(/* @__PURE__ */ g.jsx(tt, { category: C }));
  const G = () => {
    if (k.unmount(), !!st) {
      for (const T of st.querySelectorAll("input,select,button")) T.disabled = !0;
      for (const T of ["attributes", "basket", "facets", "preview-body", "glossary-body"]) {
        const x = st.querySelector(`[data-mlb="${T}"]`);
        x.replaceChildren(), delete x.dataset.content;
      }
      for (const T of ["results", "retry", "error"]) st.querySelector(`[data-mlb="${T}"]`).hidden = !0;
      st.querySelector('[data-mlb="loading"]').hidden = !1;
    }
  };
  return G.setCategory = (T) => k.render(/* @__PURE__ */ g.jsx(tt, { category: T })), G;
}
export {
  Ay as montarMunicipal
};
