var bo = { exports: {} }, cn = {};
var km;
function ih() {
  if (km) return cn;
  km = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), nl = /* @__PURE__ */ Symbol.for("react.fragment");
  function Z(y, fl, al) {
    var bl = null;
    if (al !== void 0 && (bl = "" + al), fl.key !== void 0 && (bl = "" + fl.key), "key" in fl) {
      al = {};
      for (var Xl in fl)
        Xl !== "key" && (al[Xl] = fl[Xl]);
    } else al = fl;
    return fl = al.ref, {
      $$typeof: A,
      type: y,
      key: bl,
      ref: fl !== void 0 ? fl : null,
      props: al
    };
  }
  return cn.Fragment = nl, cn.jsx = Z, cn.jsxs = Z, cn;
}
var Pm;
function ch() {
  return Pm || (Pm = 1, bo.exports = ih()), bo.exports;
}
var b = ch(), To = { exports: {} }, Q = {};
var lv;
function fh() {
  if (lv) return Q;
  lv = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), nl = /* @__PURE__ */ Symbol.for("react.portal"), Z = /* @__PURE__ */ Symbol.for("react.fragment"), y = /* @__PURE__ */ Symbol.for("react.strict_mode"), fl = /* @__PURE__ */ Symbol.for("react.profiler"), al = /* @__PURE__ */ Symbol.for("react.consumer"), bl = /* @__PURE__ */ Symbol.for("react.context"), Xl = /* @__PURE__ */ Symbol.for("react.forward_ref"), gl = /* @__PURE__ */ Symbol.for("react.suspense"), zl = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), H = /* @__PURE__ */ Symbol.for("react.view_transition"), X = Symbol.iterator;
  function Nl(s) {
    return s === null || typeof s != "object" ? null : (s = X && s[X] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var Tl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, w = Object.assign, $l = {};
  function ol(s, _, C) {
    this.props = s, this.context = _, this.refs = $l, this.updater = C || Tl;
  }
  ol.prototype.isReactComponent = {}, ol.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, ol.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function Fl() {
  }
  Fl.prototype = ol.prototype;
  function st(s, _, C) {
    this.props = s, this.context = _, this.refs = $l, this.updater = C || Tl;
  }
  var jt = st.prototype = new Fl();
  jt.constructor = st, w(jt, ol.prototype), jt.isPureReactComponent = !0;
  var xl = Array.isArray;
  function J() {
  }
  var $ = { H: null, A: null, T: null, S: null }, dt = Object.prototype.hasOwnProperty;
  function ut(s, _, C) {
    var R = C.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: R !== void 0 ? R : null,
      props: C
    };
  }
  function Vl(s, _) {
    return ut(s.type, _, s.props);
  }
  function Cl(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function Kt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(C) {
      return _[C];
    });
  }
  var sa = /\/+/g;
  function Ml(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? Kt("" + s.key) : _.toString(36);
  }
  function O(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(J, J) : (s.status = "pending", s.then(
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
  function B(s, _, C, R, V) {
    var ul = typeof s;
    (ul === "undefined" || ul === "boolean") && (s = null);
    var tl = !1;
    if (s === null) tl = !0;
    else
      switch (ul) {
        case "bigint":
        case "string":
        case "number":
          tl = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case nl:
              tl = !0;
              break;
            case j:
              return tl = s._init, B(
                tl(s._payload),
                _,
                C,
                R,
                V
              );
          }
      }
    if (tl)
      return V = V(s), tl = R === "" ? "." + Ml(s, 0) : R, xl(V) ? (C = "", tl != null && (C = tl.replace(sa, "$&/") + "/"), B(V, _, C, "", function(Ht) {
        return Ht;
      })) : V != null && (Cl(V) && (V = Vl(
        V,
        C + (V.key == null || s && s.key === V.key ? "" : ("" + V.key).replace(
          sa,
          "$&/"
        ) + "/") + tl
      )), _.push(V)), 1;
    tl = 0;
    var U = R === "" ? "." : R + ":";
    if (xl(s))
      for (var Y = 0; Y < s.length; Y++)
        R = s[Y], ul = U + Ml(R, Y), tl += B(
          R,
          _,
          C,
          ul,
          V
        );
    else if (Y = Nl(s), typeof Y == "function")
      for (s = Y.call(s), Y = 0; !(R = s.next()).done; )
        R = R.value, ul = U + Ml(R, Y++), tl += B(
          R,
          _,
          C,
          ul,
          V
        );
    else if (ul === "object") {
      if (typeof s.then == "function")
        return B(
          O(s),
          _,
          C,
          R,
          V
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return tl;
  }
  function x(s, _, C) {
    if (s == null) return s;
    var R = [], V = 0;
    return B(s, R, "", "", function(ul) {
      return _.call(C, ul, V++);
    }), R;
  }
  function il(s) {
    if (s._status === -1) {
      var _ = s._result, C = _();
      C.then(
        function(R) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = R, C.status === void 0 && (C.status = "fulfilled", C.value = R));
        },
        function(R) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = R, C.status === void 0 && (C.status = "rejected", C.reason = R));
        }
      ), s._status === -1 && (s._status = 0, s._result = C);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var F = typeof reportError == "function" ? reportError : function(s) {
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
  function bt(s) {
    var _ = $.T, C = {};
    C.types = _ !== null ? _.types : null, $.T = C;
    try {
      var R = s(), V = $.S;
      V !== null && V(C, R), typeof R == "object" && R !== null && typeof R.then == "function" && R.then(J, F);
    } catch (ul) {
      F(ul);
    } finally {
      _ !== null && C.types !== null && (_.types = C.types), $.T = _;
    }
  }
  function nt(s) {
    var _ = $.T;
    if (_ !== null) {
      var C = _.types;
      C === null ? _.types = [s] : C.indexOf(s) === -1 && C.push(s);
    } else bt(nt.bind(null, s));
  }
  var Jt = {
    map: x,
    forEach: function(s, _, C) {
      x(
        s,
        function() {
          _.apply(this, arguments);
        },
        C
      );
    },
    count: function(s) {
      var _ = 0;
      return x(s, function() {
        _++;
      }), _;
    },
    toArray: function(s) {
      return x(s, function(_) {
        return _;
      }) || [];
    },
    only: function(s) {
      if (!Cl(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return Q.Activity = T, Q.Children = Jt, Q.Component = ol, Q.Fragment = Z, Q.Profiler = fl, Q.PureComponent = st, Q.StrictMode = y, Q.Suspense = gl, Q.ViewTransition = H, Q.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $, Q.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return $.H.useMemoCache(s);
    }
  }, Q.addTransitionType = nt, Q.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, Q.cacheSignal = function() {
    return null;
  }, Q.cloneElement = function(s, _, C) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var R = w({}, s.props), V = s.key;
    if (_ != null)
      for (ul in _.key !== void 0 && (V = "" + _.key), _)
        !dt.call(_, ul) || ul === "key" || ul === "__self" || ul === "__source" || ul === "ref" && _.ref === void 0 || (R[ul] = _[ul]);
    var ul = arguments.length - 2;
    if (ul === 1) R.children = C;
    else if (1 < ul) {
      for (var tl = Array(ul), U = 0; U < ul; U++)
        tl[U] = arguments[U + 2];
      R.children = tl;
    }
    return ut(s.type, V, R);
  }, Q.createContext = function(s) {
    return s = {
      $$typeof: bl,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: al,
      _context: s
    }, s;
  }, Q.createElement = function(s, _, C) {
    var R, V = {}, ul = null;
    if (_ != null)
      for (R in _.key !== void 0 && (ul = "" + _.key), _)
        dt.call(_, R) && R !== "key" && R !== "__self" && R !== "__source" && (V[R] = _[R]);
    var tl = arguments.length - 2;
    if (tl === 1) V.children = C;
    else if (1 < tl) {
      for (var U = Array(tl), Y = 0; Y < tl; Y++)
        U[Y] = arguments[Y + 2];
      V.children = U;
    }
    if (s && s.defaultProps)
      for (R in tl = s.defaultProps, tl)
        V[R] === void 0 && (V[R] = tl[R]);
    return ut(s, ul, V);
  }, Q.createRef = function() {
    return { current: null };
  }, Q.forwardRef = function(s) {
    return { $$typeof: Xl, render: s };
  }, Q.isValidElement = Cl, Q.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: il
    };
  }, Q.memo = function(s, _) {
    return {
      $$typeof: zl,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, Q.startTransition = bt, Q.unstable_useCacheRefresh = function() {
    return $.H.useCacheRefresh();
  }, Q.use = function(s) {
    return $.H.use(s);
  }, Q.useActionState = function(s, _, C) {
    return $.H.useActionState(s, _, C);
  }, Q.useCallback = function(s, _) {
    return $.H.useCallback(s, _);
  }, Q.useContext = function(s) {
    return $.H.useContext(s);
  }, Q.useDebugValue = function() {
  }, Q.useDeferredValue = function(s, _) {
    return $.H.useDeferredValue(s, _);
  }, Q.useEffect = function(s, _) {
    return $.H.useEffect(s, _);
  }, Q.useEffectEvent = function(s) {
    return $.H.useEffectEvent(s);
  }, Q.useId = function() {
    return $.H.useId();
  }, Q.useImperativeHandle = function(s, _, C) {
    return $.H.useImperativeHandle(s, _, C);
  }, Q.useInsertionEffect = function(s, _) {
    return $.H.useInsertionEffect(s, _);
  }, Q.useLayoutEffect = function(s, _) {
    return $.H.useLayoutEffect(s, _);
  }, Q.useMemo = function(s, _) {
    return $.H.useMemo(s, _);
  }, Q.useOptimistic = function(s, _) {
    return $.H.useOptimistic(s, _);
  }, Q.useReducer = function(s, _, C) {
    return $.H.useReducer(s, _, C);
  }, Q.useRef = function(s) {
    return $.H.useRef(s);
  }, Q.useState = function(s) {
    return $.H.useState(s);
  }, Q.useSyncExternalStore = function(s, _, C) {
    return $.H.useSyncExternalStore(
      s,
      _,
      C
    );
  }, Q.useTransition = function() {
    return $.H.useTransition();
  }, Q.version = "19.3.0", Q;
}
var tv;
function Do() {
  return tv || (tv = 1, To.exports = fh()), To.exports;
}
var jl = Do(), Eo = { exports: {} }, fn = {}, zo = { exports: {} }, _o = {};
var av;
function oh() {
  return av || (av = 1, (function(A) {
    function nl(O, B) {
      var x = O.length;
      O.push(B);
      l: for (; 0 < x; ) {
        var il = x - 1 >>> 1, F = O[il];
        if (0 < fl(F, B))
          O[il] = B, O[x] = F, x = il;
        else break l;
      }
    }
    function Z(O) {
      return O.length === 0 ? null : O[0];
    }
    function y(O) {
      if (O.length === 0) return null;
      var B = O[0], x = O.pop();
      if (x !== B) {
        O[0] = x;
        l: for (var il = 0, F = O.length, bt = F >>> 1; il < bt; ) {
          var nt = 2 * (il + 1) - 1, Jt = O[nt], s = nt + 1, _ = O[s];
          if (0 > fl(Jt, x))
            s < F && 0 > fl(_, Jt) ? (O[il] = _, O[s] = x, il = s) : (O[il] = Jt, O[nt] = x, il = nt);
          else if (s < F && 0 > fl(_, x))
            O[il] = _, O[s] = x, il = s;
          else break l;
        }
      }
      return B;
    }
    function fl(O, B) {
      var x = O.sortIndex - B.sortIndex;
      return x !== 0 ? x : O.id - B.id;
    }
    if (A.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var al = performance;
      A.unstable_now = function() {
        return al.now();
      };
    } else {
      var bl = Date, Xl = bl.now();
      A.unstable_now = function() {
        return bl.now() - Xl;
      };
    }
    var gl = [], zl = [], j = 1, T = null, H = 3, X = !1, Nl = !1, Tl = !1, w = !1, $l = typeof setTimeout == "function" ? setTimeout : null, ol = typeof clearTimeout == "function" ? clearTimeout : null, Fl = typeof setImmediate < "u" ? setImmediate : null;
    function st(O) {
      for (var B = Z(zl); B !== null; ) {
        if (B.callback === null) y(zl);
        else if (B.startTime <= O)
          y(zl), B.sortIndex = B.expirationTime, nl(gl, B);
        else break;
        B = Z(zl);
      }
    }
    function jt(O) {
      if (Tl = !1, st(O), !Nl)
        if (Z(gl) !== null)
          Nl = !0, xl || (xl = !0, Cl());
        else {
          var B = Z(zl);
          B !== null && Ml(jt, B.startTime - O);
        }
    }
    var xl = !1, J = -1, $ = 5, dt = -1;
    function ut() {
      return w ? !0 : !(A.unstable_now() - dt < $);
    }
    function Vl() {
      if (w = !1, xl) {
        var O = A.unstable_now();
        dt = O;
        var B = !0;
        try {
          l: {
            Nl = !1, Tl && (Tl = !1, ol(J), J = -1), X = !0;
            var x = H;
            try {
              t: {
                for (st(O), T = Z(gl); T !== null && !(T.expirationTime > O && ut()); ) {
                  var il = T.callback;
                  if (typeof il == "function") {
                    T.callback = null, H = T.priorityLevel;
                    var F = il(
                      T.expirationTime <= O
                    );
                    if (O = A.unstable_now(), typeof F == "function") {
                      T.callback = F, st(O), B = !0;
                      break t;
                    }
                    T === Z(gl) && y(gl), st(O);
                  } else y(gl);
                  T = Z(gl);
                }
                if (T !== null) B = !0;
                else {
                  var bt = Z(zl);
                  bt !== null && Ml(
                    jt,
                    bt.startTime - O
                  ), B = !1;
                }
              }
              break l;
            } finally {
              T = null, H = x, X = !1;
            }
            B = void 0;
          }
        } finally {
          B ? Cl() : xl = !1;
        }
      }
    }
    var Cl;
    if (typeof Fl == "function")
      Cl = function() {
        Fl(Vl);
      };
    else if (typeof MessageChannel < "u") {
      var Kt = new MessageChannel(), sa = Kt.port2;
      Kt.port1.onmessage = Vl, Cl = function() {
        sa.postMessage(null);
      };
    } else
      Cl = function() {
        $l(Vl, 0);
      };
    function Ml(O, B) {
      J = $l(function() {
        O(A.unstable_now());
      }, B);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, A.unstable_forceFrameRate = function(O) {
      0 > O || 125 < O ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : $ = 0 < O ? Math.floor(1e3 / O) : 5;
    }, A.unstable_getCurrentPriorityLevel = function() {
      return H;
    }, A.unstable_next = function(O) {
      switch (H) {
        case 1:
        case 2:
        case 3:
          var B = 3;
          break;
        default:
          B = H;
      }
      var x = H;
      H = B;
      try {
        return O();
      } finally {
        H = x;
      }
    }, A.unstable_requestPaint = function() {
      w = !0;
    }, A.unstable_runWithPriority = function(O, B) {
      switch (O) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          O = 3;
      }
      var x = H;
      H = O;
      try {
        return B();
      } finally {
        H = x;
      }
    }, A.unstable_scheduleCallback = function(O, B, x) {
      var il = A.unstable_now();
      switch (typeof x == "object" && x !== null ? (x = x.delay, x = typeof x == "number" && 0 < x ? il + x : il) : x = il, O) {
        case 1:
          var F = -1;
          break;
        case 2:
          F = 250;
          break;
        case 5:
          F = 1073741823;
          break;
        case 4:
          F = 1e4;
          break;
        default:
          F = 5e3;
      }
      return F = x + F, O = {
        id: j++,
        callback: B,
        priorityLevel: O,
        startTime: x,
        expirationTime: F,
        sortIndex: -1
      }, x > il ? (O.sortIndex = x, nl(zl, O), Z(gl) === null && O === Z(zl) && (Tl ? (ol(J), J = -1) : Tl = !0, Ml(jt, x - il))) : (O.sortIndex = F, nl(gl, O), Nl || X || (Nl = !0, xl || (xl = !0, Cl()))), O;
    }, A.unstable_shouldYield = ut, A.unstable_wrapCallback = function(O) {
      var B = H;
      return function() {
        var x = H;
        H = B;
        try {
          return O.apply(this, arguments);
        } finally {
          H = x;
        }
      };
    };
  })(_o)), _o;
}
var uv;
function sh() {
  return uv || (uv = 1, zo.exports = oh()), zo.exports;
}
var Oo = { exports: {} }, at = {};
var ev;
function dh() {
  if (ev) return at;
  ev = 1;
  var A = Do();
  function nl(j) {
    var T = "https://react.dev/errors/" + j;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var H = 2; H < arguments.length; H++)
        T += "&args[]=" + encodeURIComponent(arguments[H]);
    }
    return "Minified React error #" + j + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function Z() {
  }
  var y = {
    d: {
      f: Z,
      r: function() {
        throw Error(nl(522));
      },
      D: Z,
      C: Z,
      L: Z,
      m: Z,
      X: Z,
      S: Z,
      M: Z
    },
    p: 0,
    findDOMNode: null
  }, fl = /* @__PURE__ */ Symbol.for("react.portal"), al = /* @__PURE__ */ Symbol.for("react.recoverable"), bl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Xl(j, T, H) {
    var X = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: fl,
      key: X == null ? null : X === bl ? bl : "" + X,
      children: j,
      containerInfo: T,
      implementation: H
    };
  }
  var gl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function zl(j, T) {
    if (j === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return at.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = y, at.browser = function(j) {
    return { $$typeof: al, _reason: j };
  }, at.createPortal = function(j, T) {
    var H = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(nl(299));
    return Xl(j, T, null, H);
  }, at.flushSync = function(j) {
    var T = gl.T, H = y.p;
    try {
      if (gl.T = null, y.p = 2, j) return j();
    } finally {
      gl.T = T, y.p = H, y.d.f();
    }
  }, at.preconnect = function(j, T) {
    typeof j == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, y.d.C(j, T));
  }, at.prefetchDNS = function(j) {
    typeof j == "string" && y.d.D(j);
  }, at.preinit = function(j, T) {
    if (typeof j == "string" && T && typeof T.as == "string") {
      var H = T.as, X = zl(H, T.crossOrigin), Nl = typeof T.integrity == "string" ? T.integrity : void 0, Tl = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      H === "style" ? y.d.S(
        j,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: X,
          integrity: Nl,
          fetchPriority: Tl
        }
      ) : H === "script" && y.d.X(j, {
        crossOrigin: X,
        integrity: Nl,
        fetchPriority: Tl,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, at.preinitModule = function(j, T) {
    if (typeof j == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var H = zl(
            T.as,
            T.crossOrigin
          );
          y.d.M(j, {
            crossOrigin: H,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && y.d.M(j);
  }, at.preload = function(j, T) {
    if (typeof j == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var H = T.as, X = zl(H, T.crossOrigin);
      y.d.L(j, H, {
        crossOrigin: X,
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
  }, at.preloadModule = function(j, T) {
    if (typeof j == "string")
      if (T) {
        var H = zl(T.as, T.crossOrigin);
        y.d.m(j, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: H,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else y.d.m(j);
  }, at.requestFormReset = function(j) {
    y.d.r(j);
  }, at.unstable_batchedUpdates = function(j, T) {
    return j(T);
  }, at.useFormState = function(j, T, H) {
    return gl.H.useFormState(j, T, H);
  }, at.useFormStatus = function() {
    return gl.H.useHostTransitionStatus();
  }, at.version = "19.3.0", at;
}
var nv;
function mh() {
  if (nv) return Oo.exports;
  nv = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (nl) {
        console.error(nl);
      }
  }
  return A(), Oo.exports = dh(), Oo.exports;
}
var iv;
function vh() {
  if (iv) return fn;
  iv = 1;
  var A = sh(), nl = Do(), Z = mh();
  function y(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function fl(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function al(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function bl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Xl(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function gl(l) {
    if (al(l) !== l)
      throw Error(y(188));
  }
  function zl(l) {
    var t = l.alternate;
    if (!t) {
      if (t = al(l), t === null) throw Error(y(188));
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
          if (n === a) return gl(e), l;
          if (n === u) return gl(e), t;
          n = n.sibling;
        }
        throw Error(y(188));
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
          if (!i) throw Error(y(189));
        }
      }
      if (a.alternate !== u) throw Error(y(190));
    }
    if (a.tag !== 3) throw Error(y(188));
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
  function T(l, t, a, u, e, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && a(l, u, e, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && T(
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
  function H(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function X(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function Nl(l) {
    var t = [null, null], a = H(l);
    return a === null || Tl(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function Tl(l, t, a, u) {
    for (; a !== null; ) {
      if (a === t) u.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (u.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && Tl(
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
  function w(l) {
    switch (l.tag) {
      case 5:
      case 27:
      case 6:
        return l.stateNode;
      case 3:
        return l.stateNode.containerInfo;
      default:
        throw Error(y(559));
    }
  }
  var $l = null, ol = null;
  function Fl(l, t, a) {
    return l === a ? !0 : l === t ? ($l = l, !0) : !1;
  }
  function st(l, t, a) {
    return l === a ? (ol = l, !1) : l === t ? (ol !== null && ($l = l), !0) : !1;
  }
  function jt(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function xl(l, t, a) {
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
  var J = Object.assign, $ = /* @__PURE__ */ Symbol.for("react.element"), dt = /* @__PURE__ */ Symbol.for("react.transitional.element"), ut = /* @__PURE__ */ Symbol.for("react.portal"), Vl = /* @__PURE__ */ Symbol.for("react.fragment"), Cl = /* @__PURE__ */ Symbol.for("react.strict_mode"), Kt = /* @__PURE__ */ Symbol.for("react.profiler"), sa = /* @__PURE__ */ Symbol.for("react.consumer"), Ml = /* @__PURE__ */ Symbol.for("react.context"), O = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), x = /* @__PURE__ */ Symbol.for("react.suspense_list"), il = /* @__PURE__ */ Symbol.for("react.memo"), F = /* @__PURE__ */ Symbol.for("react.lazy"), bt = /* @__PURE__ */ Symbol.for("react.activity"), nt = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), Jt = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), C = Symbol.iterator;
  function R(l) {
    return l === null || typeof l != "object" ? null : (l = C && l[C] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var V = /* @__PURE__ */ Symbol.for("react.client.reference");
  function ul(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === V ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case Vl:
        return "Fragment";
      case Kt:
        return "Profiler";
      case Cl:
        return "StrictMode";
      case B:
        return "Suspense";
      case x:
        return "SuspenseList";
      case bt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case ut:
          return "Portal";
        case Ml:
          return l.displayName || "Context";
        case sa:
          return (l._context.displayName || "Context") + ".Consumer";
        case O:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case il:
          return t = l.displayName || null, t !== null ? t : ul(l.type) || "Memo";
        case F:
          t = l._payload, l = l._init;
          try {
            return ul(l(t));
          } catch {
          }
      }
    return null;
  }
  var tl = Array.isArray, U = nl.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = Z.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Ht = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, me = [], Tt = -1;
  function Et(l) {
    return { current: l };
  }
  function Ql(l) {
    0 > Tt || (l.current = me[Tt], me[Tt] = null, Tt--);
  }
  function vl(l, t) {
    Tt++, me[Tt] = l.current, l.current = t;
  }
  var xt = Et(null), S = Et(null), G = Et(null), cl = Et(null);
  function Al(l, t) {
    switch (vl(G, t), vl(S, l), vl(xt, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? cm(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = cm(t), l = fm(t, l);
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
    Ql(xt), vl(xt, l);
  }
  function mt() {
    Ql(xt), Ql(S), Ql(G);
  }
  function qi(l) {
    var t = l.memoizedState;
    t !== null && (oe._currentValue = t.memoizedState, vl(cl, l)), t = xt.current;
    var a = fm(t, l.type);
    t !== a && (vl(S, l), vl(xt, a));
  }
  function on(l) {
    S.current === l && (Ql(xt), Ql(S)), cl.current === l && (Ql(cl), oe._currentValue = Ht);
  }
  var Yi, Mo;
  function Aa(l) {
    if (Yi === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Yi = t && t[1] || "", Mo = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Yi + l + Mo;
  }
  var Gi = !1;
  function Xi(l, t) {
    if (!l || Gi) return "";
    Gi = !0;
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
                } catch (N) {
                  var d = N;
                }
                Reflect.construct(l, [], z);
              } else {
                try {
                  z.call();
                } catch (N) {
                  d = N;
                }
                z = !1;
                try {
                  var h = Object.getOwnPropertyDescriptor(
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
                  z && (h !== void 0 ? Object.defineProperty(l.prototype, "props", h) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (N) {
                d = N;
              }
              (z = l()) && typeof z.catch == "function" && z.catch(function() {
              });
            }
          } catch (N) {
            if (N && d && typeof N.stack == "string")
              return [N.stack, d.stack];
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
`), v = c.split(`
`);
        for (e = u = 0; u < f.length && !f[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < v.length && !v[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === f.length || e === v.length)
          for (u = f.length - 1, e = v.length - 1; 1 <= u && 0 <= e && f[u] !== v[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (f[u] !== v[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || f[u] !== v[e]) {
                  var g = `
` + f[u].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      Gi = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? Aa(a) : "";
  }
  function sv(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return Aa(l.type);
      case 16:
        return Aa("Lazy");
      case 13:
        return l.child !== t && t !== null ? Aa("Suspense Fallback") : Aa("Suspense");
      case 19:
        return Aa("SuspenseList");
      case 0:
      case 15:
        return Xi(l.type, !1);
      case 11:
        return Xi(l.type.render, !1);
      case 1:
        return Xi(l.type, !0);
      case 31:
        return Aa("Activity");
      case 30:
        return Aa("ViewTransition");
      default:
        return "";
    }
  }
  function Uo(l) {
    try {
      var t = "", a = null;
      do
        t += sv(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Qi = Object.prototype.hasOwnProperty, Zi = A.unstable_scheduleCallback, Vi = A.unstable_cancelCallback, dv = A.unstable_shouldYield, mv = A.unstable_requestPaint, zt = A.unstable_now, vv = A.unstable_getCurrentPriorityLevel, Co = A.unstable_ImmediatePriority, Ro = A.unstable_UserBlockingPriority, sn = A.unstable_NormalPriority, rv = A.unstable_LowPriority, po = A.unstable_IdlePriority, yv = A.log, hv = A.unstable_setDisableYieldValue, ve = null, _t = null;
  function Da(l) {
    if (typeof yv == "function" && hv(l), _t && typeof _t.setStrictMode == "function")
      try {
        _t.setStrictMode(ve, l);
      } catch {
      }
  }
  var Ot = Math.clz32 ? Math.clz32 : bv, gv = Math.log, Sv = Math.LN2;
  function bv(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (gv(l) / Sv | 0) | 0;
  }
  var dn = 256, mn = 262144, vn = 4194304;
  function lu(l) {
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
  function rn(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = u & 134217727;
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = lu(u) : (i &= c, i !== 0 ? e = lu(i) : a || (a = c & ~l, a !== 0 && (e = lu(a))))) : (c = u & ~n, c !== 0 ? e = lu(c) : i !== 0 ? e = lu(i) : a || (a = u & ~l, a !== 0 && (e = lu(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function re(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function jo(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - Ot(a), e = 1 << u;
        t |= l[u], a &= ~e;
      }
    return t;
  }
  function Tv(l, t) {
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
  function Ho() {
    var l = vn;
    return vn <<= 1, (vn & 62914560) === 0 && (vn = 4194304), l;
  }
  function Li(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function ye(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Ev(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, v = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - Ot(a), z = 1 << g;
      c[g] = 0, f[g] = -1;
      var d = v[g];
      if (d !== null)
        for (v[g] = null, g = 0; g < d.length; g++) {
          var h = d[g];
          h !== null && (h.lane &= -536870913);
        }
      a &= ~z;
    }
    u !== 0 && xo(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function xo(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - Ot(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Bo(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - Ot(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function qo(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : Ki(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function Ki(l) {
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
  function Ji(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Yo() {
    var l = Y.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : Km(l.type));
  }
  function Go(l, t) {
    var a = Y.p;
    try {
      return Y.p = l, t();
    } finally {
      Y.p = a;
    }
  }
  var da = Math.random().toString(36).slice(2), Wl = "__reactFiber$" + da, vt = "__reactProps$" + da, _u = "__reactContainer$" + da, Xo = "__reactEvents$" + da, zv = "__reactListeners$" + da, _v = "__reactHandles$" + da, Qo = "__reactResources$" + da, he = "__reactMarker$" + da, yn = "__reactLoad$" + da;
  function hn(l) {
    delete l[Wl], delete l[vt], delete l[zv], delete l[_v];
  }
  function tu(l) {
    var t;
    if (t = l[Wl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[_u] || a[Wl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Nm(l); l !== null; ) {
            if (a = l[Wl]) return a;
            l = Nm(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Ou(l) {
    if (l = l[Wl] || l[_u]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function ge(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(y(33));
  }
  function Nu(l) {
    var t = l[Qo];
    return t || (t = l[Qo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Ll(l) {
    l[he] = !0;
  }
  function Zo(l) {
    l[yn] = void 0;
  }
  var Vo = /* @__PURE__ */ new Set(), Lo = {};
  function au(l, t) {
    Au(l, t), Au(l + "Capture", t);
  }
  function Au(l, t) {
    for (Lo[l] = t, l = 0; l < t.length; l++)
      Vo.add(t[l]);
  }
  var Ov = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Ko = {}, Jo = {};
  function Nv(l) {
    return Qi.call(Jo, l) ? !0 : Qi.call(Ko, l) ? !1 : Ov.test(l) ? Jo[l] = !0 : (Ko[l] = !0, !1);
  }
  var sl = !1;
  function wo() {
    var l = sl;
    return sl = !1, l;
  }
  function gn(l, t, a) {
    if (Nv(t))
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
  function Sn(l, t, a) {
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
  function ma(l, t, a, u) {
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
  function Nt(l) {
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
  function $o(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Av(l, t, a) {
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
  function wi(l) {
    if (!l._valueTracker) {
      var t = $o(l) ? "checked" : "value";
      l._valueTracker = Av(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function Fo(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = $o(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  var Dv = /[\n"\\]/g;
  function Bt(l) {
    return l.replace(
      Dv,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function $i(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Nt(t)) : l.value !== "" + Nt(t) && (l.value = "" + Nt(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Fi(l, Nt(l.value)) : Fi(l, Nt(t)) : a != null ? Fi(l, Nt(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Nt(c) : l.removeAttribute("name");
  }
  function Wo(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        wi(l);
        return;
      }
      a = a != null ? "" + Nt(a) : "", t = t != null ? "" + Nt(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = c ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), wi(l);
  }
  function Fi(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function Du(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + Nt(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Io(l, t, a) {
    if (t != null && (t = "" + Nt(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Nt(a) : "";
  }
  function ko(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(y(92));
        if (tl(u)) {
          if (1 < u.length) throw Error(y(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = Nt(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), wi(l);
  }
  function Mu(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var Mv = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function Po(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || Mv.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function ls(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(y(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "", sl = !0);
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && (Po(l, e, u), sl = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && Po(l, n, t[n]);
  }
  function Wi(l) {
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
  var Uv = /* @__PURE__ */ new Map([
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
  ]), Cv = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function bn(l) {
    return Cv.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Pt() {
  }
  var Ii = null;
  function ki(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Uu = null, Cu = null;
  function ts(l) {
    var t = Ou(l);
    if (t && (l = t.stateNode)) {
      var a = l[vt] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if ($i(
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
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[vt] || null;
                if (!e) throw Error(y(90));
                $i(
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
              u = a[t], u.form === l.form && Fo(u);
          }
          break l;
        case "textarea":
          Io(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Du(l, !!a.multiple, t, !1);
      }
    }
  }
  var Pi = !1;
  function as(l, t, a) {
    if (Pi) return l(t, a);
    Pi = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (Pi = !1, (Uu !== null || Cu !== null) && (bi(), Uu && (t = Uu, l = Cu, Cu = Uu = null, ts(t), l)))
        for (t = 0; t < l.length; t++) ts(l[t]);
    }
  }
  function Se(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[vt] || null;
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
        y(231, t, typeof a)
      );
    return a;
  }
  var va = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), lc = !1;
  if (va)
    try {
      var be = {};
      Object.defineProperty(be, "passive", {
        get: function() {
          lc = !0;
        }
      }), window.addEventListener("test", be, be), window.removeEventListener("test", be, be);
    } catch {
      lc = !1;
    }
  var Ma = null, tc = null, Tn = null;
  function us() {
    if (Tn) return Tn;
    var l, t = tc, a = t.length, u, e = "value" in Ma ? Ma.value : Ma.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return Tn = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function En(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function zn() {
    return !0;
  }
  function es() {
    return !1;
  }
  function it(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? zn : es, this.isPropagationStopped = es, this;
    }
    return J(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = zn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = zn);
      },
      persist: function() {
      },
      isPersistent: zn
    }), t;
  }
  var Ua = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, _n = it(Ua), Te = J({}, Ua, { view: 0, detail: 0 }), Rv = it(Te), ac, uc, Ee, On = J({}, Te, {
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
    getModifierState: nc,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Ee && (Ee && l.type === "mousemove" ? (ac = l.screenX - Ee.screenX, uc = l.screenY - Ee.screenY) : uc = ac = 0, Ee = l), ac);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : uc;
    }
  }), ns = it(On), pv = J({}, On, { dataTransfer: 0 }), jv = it(pv), Hv = J({}, Te, { relatedTarget: 0 }), ec = it(Hv), xv = J({}, Ua, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Bv = it(xv), qv = J({}, Ua, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Yv = it(qv), Gv = J({}, Ua, { data: 0 }), is = it(Gv), Xv = {
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
  }, Qv = {
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
  }, Zv = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Vv(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Zv[l]) ? !!t[l] : !1;
  }
  function nc() {
    return Vv;
  }
  var Lv = J({}, Te, {
    key: function(l) {
      if (l.key) {
        var t = Xv[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = En(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Qv[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: nc,
    charCode: function(l) {
      return l.type === "keypress" ? En(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? En(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), Kv = it(Lv), Jv = J({}, On, {
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
  }), cs = it(Jv), wv = J({}, Ua, { submitter: 0 }), $v = it(wv), Fv = J({}, Te, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: nc
  }), Wv = it(Fv), Iv = J({}, Ua, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), kv = it(Iv), Pv = J({}, On, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), lr = it(Pv), tr = J({}, Ua, {
    newState: 0,
    oldState: 0,
    source: 0
  }), ar = it(tr), ur = [9, 13, 27, 32], ic = va && "CompositionEvent" in window, ze = null;
  va && "documentMode" in document && (ze = document.documentMode);
  var er = va && "TextEvent" in window && !ze, fs = va && (!ic || ze && 8 < ze && 11 >= ze), os = " ", ss = !1;
  function ds(l, t) {
    switch (l) {
      case "keyup":
        return ur.indexOf(t.keyCode) !== -1;
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
  function ms(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Ru = !1;
  function nr(l, t) {
    switch (l) {
      case "compositionend":
        return ms(t);
      case "keypress":
        return t.which !== 32 ? null : (ss = !0, os);
      case "textInput":
        return l = t.data, l === os && ss ? null : l;
      default:
        return null;
    }
  }
  function ir(l, t) {
    if (Ru)
      return l === "compositionend" || !ic && ds(l, t) ? (l = us(), Tn = tc = Ma = null, Ru = !1, l) : null;
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
        return fs && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var cr = {
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
  function vs(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!cr[l.type] : t === "textarea";
  }
  function rs(l, t, a, u) {
    Uu ? Cu ? Cu.push(u) : Cu = [u] : Uu = u, t = Ni(t, "onChange"), 0 < t.length && (a = new _n(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var _e = null, Oe = null;
  function fr(l) {
    tm(l, 0);
  }
  function Nn(l) {
    var t = ge(l);
    if (Fo(t)) return l;
  }
  function ys(l, t) {
    if (l === "change") return t;
  }
  var hs = !1;
  if (va) {
    var cc;
    if (va) {
      var fc = "oninput" in document;
      if (!fc) {
        var gs = document.createElement("div");
        gs.setAttribute("oninput", "return;"), fc = typeof gs.oninput == "function";
      }
      cc = fc;
    } else cc = !1;
    hs = cc && (!document.documentMode || 9 < document.documentMode);
  }
  function Ss() {
    _e && (_e.detachEvent("onpropertychange", bs), Oe = _e = null);
  }
  function bs(l) {
    if (l.propertyName === "value" && Nn(Oe)) {
      var t = [];
      rs(
        t,
        Oe,
        l,
        ki(l)
      ), as(fr, t);
    }
  }
  function or(l, t, a) {
    l === "focusin" ? (Ss(), _e = t, Oe = a, _e.attachEvent("onpropertychange", bs)) : l === "focusout" && Ss();
  }
  function sr(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Nn(Oe);
  }
  function dr(l, t) {
    if (l === "click") return Nn(t);
  }
  function mr(l, t) {
    if (l === "input" || l === "change")
      return Nn(t);
  }
  function vr(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var At = typeof Object.is == "function" ? Object.is : vr;
  function Ne(l, t) {
    if (At(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Qi.call(t, e) || !At(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function oc(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  function Ts(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function Es(l, t) {
    var a = Ts(l);
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
      a = Ts(a);
    }
  }
  function zs(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? zs(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function _s(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = oc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = oc(l.document);
    }
    return t;
  }
  function sc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var rr = va && "documentMode" in document && 11 >= document.documentMode, pu = null, dc = null, Ae = null, mc = !1;
  function Os(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    mc || pu == null || pu !== oc(u) || (u = pu, "selectionStart" in u && sc(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), Ae && Ne(Ae, u) || (Ae = u, u = Ni(dc, "onSelect"), 0 < u.length && (t = new _n(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = pu)));
  }
  function uu(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var ju = {
    animationend: uu("Animation", "AnimationEnd"),
    animationiteration: uu("Animation", "AnimationIteration"),
    animationstart: uu("Animation", "AnimationStart"),
    transitionrun: uu("Transition", "TransitionRun"),
    transitionstart: uu("Transition", "TransitionStart"),
    transitioncancel: uu("Transition", "TransitionCancel"),
    transitionend: uu("Transition", "TransitionEnd")
  }, vc = {}, Ns = {};
  va && (Ns = document.createElement("div").style, "AnimationEvent" in window || (delete ju.animationend.animation, delete ju.animationiteration.animation, delete ju.animationstart.animation), "TransitionEvent" in window || delete ju.transitionend.transition);
  function eu(l) {
    if (vc[l]) return vc[l];
    if (!ju[l]) return l;
    var t = ju[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Ns)
        return vc[l] = t[a];
    return l;
  }
  var As = eu("animationend"), Ds = eu("animationiteration"), Ms = eu("animationstart"), yr = eu("transitionrun"), hr = eu("transitionstart"), gr = eu("transitioncancel"), Us = eu("transitionend"), Cs = /* @__PURE__ */ new Map(), rc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  rc.push("scrollEnd");
  function wt(l, t) {
    Cs.set(l, t), au(t, [l]);
  }
  var Sr = 0;
  function ra(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = It.identifierPrefix;
    var a = Sr++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function Rs(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, a = Pu;
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
  function ya(l, t) {
    return l = Rs(l), t = Rs(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
  }
  var An = typeof reportError == "function" ? reportError : function(l) {
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
  }, qt = [], Hu = 0, yc = 0;
  function Dn() {
    for (var l = Hu, t = yc = Hu = 0; t < l; ) {
      var a = qt[t];
      qt[t++] = null;
      var u = qt[t];
      qt[t++] = null;
      var e = qt[t];
      qt[t++] = null;
      var n = qt[t];
      if (qt[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && ps(a, e, n);
    }
  }
  function Mn(l, t, a, u) {
    qt[Hu++] = l, qt[Hu++] = t, qt[Hu++] = a, qt[Hu++] = u, yc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function hc(l, t, a, u) {
    return Mn(l, t, a, u), Un(l);
  }
  function nu(l, t) {
    return Mn(l, null, null, t), Un(l);
  }
  function ps(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - Ot(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Un(l) {
    if (50 < $e)
      throw $e = 0, Si = null, Error(y(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var xu = {};
  function br(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function rt(l, t, a, u) {
    return new br(l, t, a, u);
  }
  function gc(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function ha(l, t) {
    var a = l.alternate;
    return a === null ? (a = rt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function js(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Cn(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof u == "function") gc(u) && (i = 1);
    else if (typeof u == "string")
      i = wy(
        l,
        a,
        xt.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case bt:
          return l = rt(31, a, t, e), l.elementType = bt, l.lanes = n, l;
        case Vl:
          return iu(a.children, e, n, t);
        case Cl:
          i = 8, e |= 24;
          break;
        case Kt:
          return l = rt(12, a, t, e | 2), l.elementType = Kt, l.lanes = n, l;
        case B:
          return l = rt(13, a, t, e), l.elementType = B, l.lanes = n, l;
        case x:
          return l = rt(19, a, t, e), l.elementType = x, l.lanes = n, l;
        case nt:
        case s:
          return l = e | 32, l = rt(30, a, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof u == "object" && u !== null)
            switch (u.$$typeof) {
              case Ml:
                i = 10;
                break l;
              case sa:
                i = 9;
                break l;
              case O:
                i = 11;
                break l;
              case il:
                i = 14;
                break l;
              case F:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            y(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = rt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function iu(l, t, a, u) {
    return l = rt(7, l, u, t), l.lanes = a, l;
  }
  function Sc(l, t, a) {
    return l = rt(6, l, null, t), l.lanes = a, l;
  }
  function Hs(l) {
    var t = rt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function bc(l, t, a) {
    return t = rt(
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
  var xs = /* @__PURE__ */ new WeakMap();
  function Yt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = xs.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Uo(t)
      }, xs.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Uo(t)
    };
  }
  var Bu = [], qu = 0, Rn = null, De = 0, Gt = [], Xt = 0, Ca = null, la = 1, ta = "";
  function ga(l, t) {
    Bu[qu++] = De, Bu[qu++] = Rn, Rn = l, De = t;
  }
  function Bs(l, t, a) {
    Gt[Xt++] = la, Gt[Xt++] = ta, Gt[Xt++] = Ca, Ca = l;
    var u = la;
    l = ta;
    var e = 32 - Ot(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - Ot(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, la = 1 << 32 - Ot(t) + e | a << e | u, ta = n + l;
    } else
      la = 1 << n | a << e | u, ta = l;
  }
  function pn(l) {
    l.return !== null && (ga(l, 1), Bs(l, 1, 0));
  }
  function Tc(l) {
    for (; l === Rn; )
      Rn = Bu[--qu], Bu[qu] = null, De = Bu[--qu], Bu[qu] = null;
    for (; l === Ca; )
      Ca = Gt[--Xt], Gt[Xt] = null, ta = Gt[--Xt], Gt[Xt] = null, la = Gt[--Xt], Gt[Xt] = null;
  }
  function qs(l, t) {
    Gt[Xt++] = la, Gt[Xt++] = ta, Gt[Xt++] = Ca, la = t.id, ta = t.overflow, Ca = l;
  }
  var Kl = null, _l = null, W = !1, Ra = null, Qt = !1, Ec = Error(y(519));
  function pa(l) {
    var t = Error(
      y(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Me(Yt(t, l)), Ec;
  }
  function Ys(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Wl] = l, t[vt] = u, a) {
      case "dialog":
        k("cancel", t), k("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        k("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < We.length; a++)
          k(We[a], t);
        break;
      case "source":
        k("error", t);
        break;
      case "img":
      case "image":
      case "link":
        k("error", t), k("load", t);
        break;
      case "details":
        k("toggle", t);
        break;
      case "input":
        k("invalid", t), Wo(
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
        k("invalid", t);
        break;
      case "textarea":
        k("invalid", t), ko(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || nm(t.textContent, a) ? (u.popover != null && (k("beforetoggle", t), k("toggle", t)), u.onScroll != null && k("scroll", t), u.onScrollEnd != null && k("scrollend", t), u.onClick != null && (t.onclick = Pt), t = !0) : t = !1, t || pa(l, !0);
  }
  function jn(l) {
    for (Kl = l.return; Kl; )
      switch (Kl.tag) {
        case 5:
        case 31:
        case 13:
          Qt = !1;
          return;
        case 27:
        case 3:
          Qt = !0;
          return;
        default:
          Kl = Kl.return;
      }
  }
  function Yu(l) {
    if (l !== Kl) return !1;
    if (!W) return jn(l), W = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || kf(l.type, l.memoizedProps)), a = !a), a && _l && pa(l), jn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      _l = Om(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      _l = Om(l);
    } else
      t === 27 ? (t = _l, $a(l.type) ? (l = co, co = null, _l = l) : _l = t) : _l = Kl ? Vt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function cu() {
    _l = Kl = null, W = !1;
  }
  function zc() {
    var l = Ra;
    return l !== null && (gt === null ? gt = l : gt.push.apply(
      gt,
      l
    ), Ra = null), l;
  }
  function Me(l) {
    Ra === null ? Ra = [l] : Ra.push(l);
  }
  var _c = Et(null), fu = null, Sa = null;
  function ja(l, t, a) {
    vl(_c, t._currentValue), t._currentValue = a;
  }
  function ba(l) {
    l._currentValue = _c.current, Ql(_c);
  }
  function Hn(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Oc(l, t, a, u) {
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
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Hn(
                n.return,
                a,
                l
              ), u || (i = null);
              break l;
            }
          n = c.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(y(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Hn(i, a, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= a, i = e.alternate, i !== null && (i.lanes |= a), Hn(
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
  function ou(l, t, a, u) {
    l = null;
    for (var e = t, n = !1; e !== null; ) {
      if (!n) {
        if ((e.flags & 524288) !== 0) n = !0;
        else if ((e.flags & 262144) !== 0) break;
      }
      if (e.tag === 10) {
        var i = e.alternate;
        if (i === null) throw Error(y(387));
        if (i = i.memoizedProps, i !== null) {
          var c = e.type;
          At(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === cl.current) {
        if (i = e.alternate, i === null) throw Error(y(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(oe) : l = [oe]);
      }
      e = e.return;
    }
    return l !== null && Oc(
      t,
      l,
      a,
      u
    ), t.flags |= 262144, l !== null;
  }
  function xn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!At(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function su(l) {
    fu = l, Sa = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Il(l) {
    return Gs(fu, l);
  }
  function Bn(l, t) {
    return fu === null && su(l), Gs(l, t);
  }
  function Gs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Sa === null) {
      if (l === null) throw Error(y(308));
      Sa = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else Sa = Sa.next = t;
    return a;
  }
  var Tr = typeof AbortController < "u" ? AbortController : function() {
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
  }, Er = A.unstable_scheduleCallback, zr = A.unstable_NormalPriority, Bl = {
    $$typeof: Ml,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Nc() {
    return {
      controller: new Tr(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Ue(l) {
    l.refCount--, l.refCount === 0 && Er(zr, function() {
      l.controller.abort();
    });
  }
  function Xs(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var u = t[l];
        a.indexOf(u) === -1 && a.push(u);
      }
    }
  }
  var Ce = null;
  function _r(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Re = null, Ac = 0, du = 0, Gu = null;
  function Or(l, t) {
    if (Re === null) {
      var a = Re = [];
      Ac = 0, du = Vf(), Gu = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Ac++, t.then(Qs, Qs), t;
  }
  function Qs() {
    if (--Ac === 0 && (Ce = null, Re !== null)) {
      Gu !== null && (Gu.status = "fulfilled");
      var l = Re;
      Re = null, du = 0, Gu = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Nr(l, t) {
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
  var Zs = U.S;
  U.S = function(l, t) {
    if (Hd = zt(), typeof t == "object" && t !== null && typeof t.then == "function" && Or(l, t), Ce !== null)
      for (var a = ue; a !== null; )
        Xs(a, Ce), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = ue; u !== null; )
        Xs(u, a), u = u.next;
      if (du !== 0) {
        u = Ce, u === null && (u = Ce = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Zs !== null && Zs(l, t);
  };
  var mu = Et(null);
  function Dc() {
    var l = mu.current;
    return l !== null ? l : El.pooledCache;
  }
  function qn(l, t) {
    t === null ? vl(mu, mu.current) : vl(mu, t.pool);
  }
  function Vs() {
    var l = Dc();
    return l === null ? null : { parent: Bl._currentValue, pool: l };
  }
  var Xu = Error(y(460)), Mc = Error(y(474)), Yn = Error(y(542)), Gn = { then: function() {
  } };
  function Ls(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Ks(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Pt, Pt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, ws(l), l === void 0 && !("reason" in t) ? Error(y(600)) : l;
      default:
        if (typeof t.status == "string") t.then(Pt, Pt);
        else {
          if (l = El, l !== null && 100 < l.shellSuspendCounter)
            throw Error(y(482));
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
            throw l = t.reason, ws(l), l;
        }
        throw ru = t, Xu;
    }
  }
  function vu(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (ru = a, Xu) : a;
    }
  }
  var ru = null;
  function Js() {
    if (ru === null) throw Error(y(459));
    var l = ru;
    return ru = null, l;
  }
  function ws(l) {
    if (l === Xu || l === Yn)
      throw Error(y(483));
  }
  var Qu = null, pe = 0;
  function Xn(l) {
    var t = pe;
    return pe += 1, Qu === null && (Qu = []), Ks(Qu, l, t);
  }
  function Ha(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Qn(l, t) {
    throw t.$$typeof === $ ? Error(y(525)) : (l = Object.prototype.toString.call(t), Error(
      y(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function $s(l) {
    function t(m, o) {
      if (l) {
        var r = m.deletions;
        r === null ? (m.deletions = [o], m.flags |= 16) : r.push(o);
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
      return m = ha(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, r) {
      return m.index = r, l ? (r = m.alternate, r !== null ? (r = r.index, r < o ? (m.flags |= 2, o) : r) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, o, r, E) {
      return o === null || o.tag !== 6 ? (o = Sc(r, m.mode, E), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function f(m, o, r, E) {
      var D = r.type;
      return D === Vl ? (m = g(
        m,
        o,
        r.props.children,
        E,
        r.key
      ), Ha(m, r), m) : o !== null && (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === F && vu(D) === o.type) ? (o = e(o, r.props), Ha(o, r), o.return = m, o) : (o = Cn(
        r.type,
        r.key,
        r.props,
        null,
        m.mode,
        E
      ), Ha(o, r), o.return = m, o);
    }
    function v(m, o, r, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== r.containerInfo || o.stateNode.implementation !== r.implementation ? (o = bc(r, m.mode, E), o.return = m, o) : (o = e(o, r.children || []), o.return = m, o);
    }
    function g(m, o, r, E, D) {
      return o === null || o.tag !== 7 ? (o = iu(
        r,
        m.mode,
        E,
        D
      ), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function z(m, o, r) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = Sc(
          "" + o,
          m.mode,
          r
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case dt:
            return r = Cn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              r
            ), Ha(r, o), r.return = m, r;
          case ut:
            return o = bc(
              o,
              m.mode,
              r
            ), o.return = m, o;
          case F:
            return o = vu(o), z(m, o, r);
        }
        if (tl(o) || R(o))
          return o = iu(
            o,
            m.mode,
            r,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, Xn(o), r);
        if (o.$$typeof === Ml)
          return z(
            m,
            Bn(m, o),
            r
          );
        Qn(m, o);
      }
      return null;
    }
    function d(m, o, r, E) {
      var D = o !== null ? o.key : null;
      if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint")
        return D !== null ? null : c(m, o, "" + r, E);
      if (typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case dt:
            return r.key === D ? f(m, o, r, E) : null;
          case ut:
            return r.key === D ? v(m, o, r, E) : null;
          case F:
            return r = vu(r), d(m, o, r, E);
        }
        if (tl(r) || R(r))
          return D !== null ? null : g(m, o, r, E, null);
        if (typeof r.then == "function")
          return d(
            m,
            o,
            Xn(r),
            E
          );
        if (r.$$typeof === Ml)
          return d(
            m,
            o,
            Bn(m, r),
            E
          );
        Qn(m, r);
      }
      return null;
    }
    function h(m, o, r, E, D) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return m = m.get(r) || null, c(o, m, "" + E, D);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case dt:
            return m = m.get(
              E.key === null ? r : E.key
            ) || null, f(o, m, E, D);
          case ut:
            return m = m.get(
              E.key === null ? r : E.key
            ) || null, v(o, m, E, D);
          case F:
            return E = vu(E), h(
              m,
              o,
              r,
              E,
              D
            );
        }
        if (tl(E) || R(E))
          return m = m.get(r) || null, g(o, m, E, D, null);
        if (typeof E.then == "function")
          return h(
            m,
            o,
            r,
            Xn(E),
            D
          );
        if (E.$$typeof === Ml)
          return h(
            m,
            o,
            r,
            Bn(o, E),
            D
          );
        Qn(o, E);
      }
      return null;
    }
    function N(m, o, r, E) {
      for (var D = null, ll = null, p = o, q = o = 0, Gl = null; p !== null && q < r.length; q++) {
        p.index > q ? (Gl = p, p = null) : Gl = p.sibling;
        var el = d(
          m,
          p,
          r[q],
          E
        );
        if (el === null) {
          p === null && (p = Gl);
          break;
        }
        l && p && el.alternate === null && t(m, p), o = n(el, o, q), ll === null ? D = el : ll.sibling = el, ll = el, p = Gl;
      }
      if (q === r.length)
        return a(m, p), W && ga(m, q), D;
      if (p === null) {
        for (; q < r.length; q++)
          p = z(m, r[q], E), p !== null && (o = n(
            p,
            o,
            q
          ), ll === null ? D = p : ll.sibling = p, ll = p);
        return W && ga(m, q), D;
      }
      for (p = u(p); q < r.length; q++)
        Gl = h(
          p,
          m,
          q,
          r[q],
          E
        ), Gl !== null && (l && (el = Gl.alternate, el !== null && p.delete(el.key === null ? q : el.key)), o = n(
          Gl,
          o,
          q
        ), ll === null ? D = Gl : ll.sibling = Gl, ll = Gl);
      return l && p.forEach(function(Pa) {
        return t(m, Pa);
      }), W && ga(m, q), D;
    }
    function M(m, o, r, E) {
      if (r == null) throw Error(y(151));
      for (var D = null, ll = null, p = o, q = o = 0, Gl = null, el = r.next(); p !== null && !el.done; q++, el = r.next()) {
        p.index > q ? (Gl = p, p = null) : Gl = p.sibling;
        var Pa = d(m, p, el.value, E);
        if (Pa === null) {
          p === null && (p = Gl);
          break;
        }
        l && p && Pa.alternate === null && t(m, p), o = n(Pa, o, q), ll === null ? D = Pa : ll.sibling = Pa, ll = Pa, p = Gl;
      }
      if (el.done)
        return a(m, p), W && ga(m, q), D;
      if (p === null) {
        for (; !el.done; q++, el = r.next())
          el = z(m, el.value, E), el !== null && (o = n(el, o, q), ll === null ? D = el : ll.sibling = el, ll = el);
        return W && ga(m, q), D;
      }
      for (p = u(p); !el.done; q++, el = r.next())
        el = h(p, m, q, el.value, E), el !== null && (l && (Gl = el.alternate, Gl !== null && p.delete(
          Gl.key === null ? q : Gl.key
        )), o = n(el, o, q), ll === null ? D = el : ll.sibling = el, ll = el);
      return l && p.forEach(function(nh) {
        return t(m, nh);
      }), W && ga(m, q), D;
    }
    function K(m, o, r, E) {
      if (typeof r == "object" && r !== null && r.type === Vl && r.key === null && r.props.ref === void 0 && (r = r.props.children), typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case dt:
            l: {
              for (var D = r.key; o !== null; ) {
                if (o.key === D) {
                  if (D = r.type, D === Vl) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), E = e(
                        o,
                        r.props.children
                      ), Ha(E, r), E.return = m, m = E;
                      break l;
                    }
                  } else if (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === F && vu(D) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, r.props), Ha(E, r), E.return = m, m = E;
                    break l;
                  }
                  a(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              r.type === Vl ? (E = iu(
                r.props.children,
                m.mode,
                E,
                r.key
              ), Ha(E, r), E.return = m, m = E) : (E = Cn(
                r.type,
                r.key,
                r.props,
                null,
                m.mode,
                E
              ), Ha(E, r), E.return = m, m = E);
            }
            return i(m);
          case ut:
            l: {
              for (D = r.key; o !== null; ) {
                if (o.key === D)
                  if (o.tag === 4 && o.stateNode.containerInfo === r.containerInfo && o.stateNode.implementation === r.implementation) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, r.children || []), E.return = m, m = E;
                    break l;
                  } else {
                    a(m, o);
                    break;
                  }
                else t(m, o);
                o = o.sibling;
              }
              E = bc(r, m.mode, E), E.return = m, m = E;
            }
            return i(m);
          case F:
            return r = vu(r), K(
              m,
              o,
              r,
              E
            );
        }
        if (tl(r))
          return N(
            m,
            o,
            r,
            E
          );
        if (R(r)) {
          if (D = R(r), typeof D != "function") throw Error(y(150));
          return r = D.call(r), M(
            m,
            o,
            r,
            E
          );
        }
        if (typeof r.then == "function")
          return K(
            m,
            o,
            Xn(r),
            E
          );
        if (r.$$typeof === Ml)
          return K(
            m,
            o,
            Bn(m, r),
            E
          );
        Qn(m, r);
      }
      return typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint" ? (r = "" + r, o !== null && o.tag === 6 ? (a(m, o.sibling), E = e(o, r), E.return = m, m = E) : (a(m, o), E = Sc(r, m.mode, E), E.return = m, m = E), i(m)) : a(m, o);
    }
    return function(m, o, r, E) {
      try {
        pe = 0;
        var D = K(
          m,
          o,
          r,
          E
        );
        return Qu = null, D;
      } catch (p) {
        if (p === Xu || p === Yn) throw p;
        var ll = rt(29, p, null, m.mode);
        return ll.lanes = E, ll.return = m, ll;
      }
    };
  }
  var yu = $s(!0), Fs = $s(!1), xa = !1;
  function Uc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Cc(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Ba(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function qa(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (dl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Un(l), ps(l, null, a), t;
    }
    return Mn(l, u, t, a), Un(l);
  }
  function je(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Bo(l, a);
    }
  }
  function Rc(l, t) {
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
  var pc = !1;
  function He() {
    if (pc) {
      var l = Gu;
      if (l !== null) throw l;
    }
  }
  function xe(l, t, a, u) {
    pc = !1;
    var e = l.updateQueue;
    xa = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, c = e.shared.pending;
    if (c !== null) {
      e.shared.pending = null;
      var f = c, v = f.next;
      f.next = null, i === null ? n = v : i.next = v, i = f;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, c = g.lastBaseUpdate, c !== i && (c === null ? g.firstBaseUpdate = v : c.next = v, g.lastBaseUpdate = f));
    }
    if (n !== null) {
      var z = e.baseState;
      i = 0, g = v = f = null, c = n;
      do {
        var d = c.lane & -536870913, h = d !== c.lane;
        if (h ? (P & d) === d : (u & d) === d) {
          d !== 0 && d === du && (pc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var N = l, M = c;
            d = t;
            var K = a;
            switch (M.tag) {
              case 1:
                if (N = M.payload, typeof N == "function") {
                  z = N.call(K, z, d);
                  break l;
                }
                z = N;
                break l;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = M.payload, d = typeof N == "function" ? N.call(K, z, d) : N, d == null) break l;
                z = J({}, z, d);
                break l;
              case 2:
                xa = !0;
            }
          }
          d = c.callback, d !== null && (l.flags |= 64, h && (l.flags |= 8192), h = e.callbacks, h === null ? e.callbacks = [d] : h.push(d));
        } else
          h = {
            lane: d,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, g === null ? (v = g = h, f = z) : g = g.next = h, i |= d;
        if (c = c.next, c === null) {
          if (c = e.shared.pending, c === null)
            break;
          h = c, c = h.next, h.next = null, e.lastBaseUpdate = h, e.shared.pending = null;
        }
      } while (!0);
      g === null && (f = z), e.baseState = f, e.firstBaseUpdate = v, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), La |= i, l.lanes = i, l.memoizedState = z;
    }
  }
  function Ws(l, t) {
    if (typeof l != "function")
      throw Error(y(191, l));
    l.call(t);
  }
  function Is(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Ws(a[l], t);
  }
  var Ya = Et(null), Zn = Et(0);
  function ks(l, t) {
    l = Oa, vl(Zn, l), vl(Ya, t), Oa = l | t.baseLanes;
  }
  function jc() {
    vl(Zn, Oa), vl(Ya, Ya.current);
  }
  function Hc() {
    Oa = Zn.current, Ql(Ya), Ql(Zn);
  }
  var kl = Et(null), et = null;
  function Ga(l) {
    var t = l.alternate;
    vl(Pl, Pl.current & 1), vl(kl, l), et === null && (t === null || Ya.current !== null || t.memoizedState !== null) && (et = l);
  }
  function xc(l) {
    vl(Pl, Pl.current), vl(kl, l), et === null && (et = l);
  }
  function Ps(l) {
    l.tag === 22 ? (vl(Pl, Pl.current), vl(kl, l), et === null && (et = l)) : Xa();
  }
  function Xa() {
    vl(Pl, Pl.current), vl(kl, kl.current);
  }
  function Dt(l) {
    Ql(kl), et === l && (et = null), Ql(Pl);
  }
  var Pl = Et(0);
  function Be(l, t) {
    vl(kl, kl.current), vl(Pl, t);
  }
  function Bc(l) {
    Ql(Pl), Ql(kl), et === l && (et = null);
  }
  function Vn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || no(a) || io(a)))
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
  var Ta = 0, L = null, Sl = null, ql = null, Ln = !1, Zu = !1, hu = !1, Kn = 0, qe = 0, Vu = null, Ar = 0;
  function Rl() {
    throw Error(y(321));
  }
  function qc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!At(l[a], t[a])) return !1;
    return !0;
  }
  function Yc(l, t, a, u, e, n) {
    return Ta = n, L = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, U.H = l === null || l.memoizedState === null ? B0 : q0, hu = !1, n = a(u, e), hu = !1, Zu && (n = t0(
      t,
      a,
      u,
      e
    )), l0(l), n;
  }
  function l0(l) {
    U.H = kn;
    var t = Sl !== null && Sl.next !== null;
    if (Ta = 0, ql = Sl = L = null, Ln = !1, qe = 0, Vu = null, t) throw Error(y(300));
    l === null || Yl || (l = l.dependencies, l !== null && xn(l) && (Yl = !0));
  }
  function t0(l, t, a, u) {
    L = l;
    var e = 0;
    do {
      if (Zu && (Vu = null), qe = 0, Zu = !1, 25 <= e) throw Error(y(301));
      if (e += 1, ql = Sl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      U.H = Hr, n = t(a, u);
    } while (Zu);
    return n;
  }
  function Dr() {
    var l = U.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Ye(t) : t, l = l.useState()[0], (Sl !== null ? Sl.memoizedState : null) !== l && (L.flags |= 1024), t;
  }
  function Gc() {
    var l = Kn !== 0;
    return Kn = 0, l;
  }
  function Xc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Qc(l) {
    if (Ln) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      Ln = !1;
    }
    Ta = 0, ql = Sl = L = null, Zu = !1, qe = Kn = 0, Vu = null;
  }
  function ct() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return ql === null ? L.memoizedState = ql = l : ql = ql.next = l, ql;
  }
  function Hl() {
    if (Sl === null) {
      var l = L.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = Sl.next;
    var t = ql === null ? L.memoizedState : ql.next;
    if (t !== null)
      ql = t, Sl = l;
    else {
      if (l === null)
        throw L.alternate === null ? Error(y(467)) : Error(y(310));
      Sl = l, l = {
        memoizedState: Sl.memoizedState,
        baseState: Sl.baseState,
        baseQueue: Sl.baseQueue,
        queue: Sl.queue,
        next: null
      }, ql === null ? L.memoizedState = ql = l : ql = ql.next = l;
    }
    return ql;
  }
  function Jn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Ye(l) {
    var t = qe;
    return qe += 1, Vu === null && (Vu = []), l = Ks(Vu, l, t), t = L, (ql === null ? t.memoizedState : ql.next) === null && (t = t.alternate, U.H = t === null || t.memoizedState === null ? B0 : q0), l;
  }
  function wn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Ye(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Ml) return Il(l);
    }
    throw Error(y(438, String(l)));
  }
  function Zc(l) {
    var t = null, a = L.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = L.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Jn(), L.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = Jt;
    return t.index++, a;
  }
  function Ea(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function $n(l) {
    var t = Hl();
    return Vc(t, Sl, l);
  }
  function Vc(l, t, a) {
    var u = l.queue;
    if (u === null) throw Error(y(311));
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
      var c = i = null, f = null, v = t, g = !1;
      do {
        var z = v.lane & -536870913;
        if (z !== v.lane ? (P & z) === z : (Ta & z) === z) {
          var d = v.revertLane;
          if (d === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }), z === du && (g = !0);
          else if ((Ta & d) === d) {
            v = v.next, d === du && (g = !0);
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
            }, f === null ? (c = f = z, i = n) : f = f.next = z, L.lanes |= d, La |= d;
          z = v.action, hu && a(n, z), n = v.hasEagerState ? v.eagerState : a(n, z);
        } else
          d = {
            lane: z,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = d, i = n) : f = f.next = d, L.lanes |= z, La |= z;
        v = v.next;
      } while (v !== null && v !== t);
      if (f === null ? i = n : f.next = c, !At(n, l.memoizedState) && (Yl = !0, g && (a = Gu, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function Lc(l) {
    var t = Hl(), a = t.queue;
    if (a === null) throw Error(y(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      At(n, t.memoizedState) || (Yl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function a0(l, t, a) {
    var u = L, e = Hl(), n = W;
    if (n) {
      if (a === void 0) throw Error(y(407));
      a = a();
    } else a = t();
    var i = !At(
      (Sl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Yl = !0), e = e.queue, wc(n0.bind(null, u, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || ql !== null && (ql.memoizedState.tag & 1) !== 0, Lu(
      l ? 9 : 8,
      { destroy: void 0 },
      e0.bind(null, u, e, a, t),
      null
    ), l) {
      if (u.flags |= 2048, El === null) throw Error(y(349));
      n || (Ta & 127) !== 0 || u0(u, t, a);
    }
    return a;
  }
  function u0(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = L.updateQueue, t === null ? (t = Jn(), L.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function e0(l, t, a, u) {
    t.value = a, t.getSnapshot = u, i0(t) && c0(l);
  }
  function n0(l, t, a) {
    return a(function() {
      i0(t) && c0(l);
    });
  }
  function i0(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !At(l, a);
    } catch {
      return !0;
    }
  }
  function c0(l) {
    var t = nu(l, 2);
    t !== null && St(t, l, 2);
  }
  function Kc(l) {
    var t = ct();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), hu) {
        Da(!0);
        try {
          a();
        } finally {
          Da(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Ea,
      lastRenderedState: l
    }, t;
  }
  function f0(l, t, a, u) {
    return l.baseState = a, Vc(
      l,
      Sl,
      typeof u == "function" ? u : Ea
    );
  }
  function Mr(l, t, a, u, e) {
    if (In(l)) throw Error(y(485));
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
      U.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, o0(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function o0(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = U.T, i = {};
      i.types = n !== null ? n.types : null, U.T = i;
      try {
        var c = a(e, u), f = U.S;
        f !== null && f(i, c), s0(l, t, c);
      } catch (v) {
        Jc(l, t, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), U.T = n;
      }
    } else
      try {
        n = a(e, u), s0(l, t, n);
      } catch (v) {
        Jc(l, t, v);
      }
  }
  function s0(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        d0(l, t, u);
      },
      function(u) {
        return Jc(l, t, u);
      }
    ) : d0(l, t, a);
  }
  function d0(l, t, a) {
    t.status = "fulfilled", t.value = a, m0(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, o0(l, a)));
  }
  function Jc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, m0(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function m0(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function v0(l, t) {
    return t;
  }
  function r0(l, t) {
    if (W) {
      var a = El.formState;
      if (a !== null) {
        l: {
          var u = L;
          if (W) {
            if (_l) {
              t: {
                for (var e = _l, n = Qt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Vt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                _l = Vt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            pa(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = ct(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: v0,
      lastRenderedState: t
    }, a.queue = u, a = j0.bind(
      null,
      L,
      u
    ), u.dispatch = a, u = Kc(!1), n = kc.bind(
      null,
      L,
      !1,
      u.queue
    ), u = ct(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = Mr.bind(
      null,
      L,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function y0(l) {
    var t = Hl();
    return h0(t, Sl, l);
  }
  function h0(l, t, a) {
    if (t = Vc(
      l,
      t,
      v0
    )[0], l = $n(Ea)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = Ye(t);
      } catch (i) {
        throw i === Xu ? Yn : i;
      }
    else u = t;
    t = Hl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (L.flags |= 2048, Lu(
      9,
      { destroy: void 0 },
      Ur.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Ur(l, t) {
    l.action = t;
  }
  function g0(l) {
    var t = Hl(), a = Sl;
    if (a !== null)
      return h0(t, a, l);
    Hl(), t = t.memoizedState, a = Hl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Lu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = L.updateQueue, t === null && (t = Jn(), L.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function S0() {
    return Hl().memoizedState;
  }
  function Fn(l, t, a, u) {
    var e = ct();
    L.flags |= l, e.memoizedState = Lu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function Wn(l, t, a, u) {
    var e = Hl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    Sl !== null && u !== null && qc(u, Sl.memoizedState.deps) ? e.memoizedState = Lu(t, n, a, u) : (L.flags |= l, e.memoizedState = Lu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function b0(l, t) {
    Fn(8390656, 8, l, t);
  }
  function wc(l, t) {
    Wn(2048, 8, l, t);
  }
  function Cr(l) {
    L.flags |= 4;
    var t = L.updateQueue;
    if (t === null)
      t = Jn(), L.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function T0(l) {
    var t = Hl().memoizedState;
    return Cr({ ref: t, nextImpl: l }), function() {
      if ((dl & 2) !== 0) throw Error(y(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function E0(l, t) {
    return Wn(4, 2, l, t);
  }
  function z0(l, t) {
    return Wn(4, 4, l, t);
  }
  function _0(l, t) {
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
  function O0(l, t, a) {
    a = a != null ? a.concat([l]) : null, Wn(4, 4, _0.bind(null, t, l), a);
  }
  function $c() {
  }
  function N0(l, t) {
    var a = Hl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && qc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function A0(l, t) {
    var a = Hl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && qc(t, u[1]))
      return u[0];
    if (u = l(), hu) {
      Da(!0);
      try {
        l();
      } finally {
        Da(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function Fc(l, t, a) {
    return a === void 0 || (Ta & 1073741824) !== 0 && (P & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Bd(), L.lanes |= l, La |= l, a);
  }
  function D0(l, t, a, u) {
    return At(a, t) ? a : Ya.current !== null ? (l = Fc(l, a, u), At(l, t) || (Yl = !0), l) : (Ta & 106) === 0 || (Ta & 1073741824) !== 0 && (P & 261930) === 0 ? (Yl = !0, l.memoizedState = a) : (l = Bd(), L.lanes |= l, La |= l, t);
  }
  function M0(l, t, a, u, e) {
    var n = Y.p;
    Y.p = n !== 0 && 8 > n ? n : 8;
    var i = U.T, c = {};
    c.types = i !== null ? i.types : null, U.T = c, kc(l, !1, t, a);
    try {
      var f = e(), v = U.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Nr(
          f,
          u
        );
        Ge(
          l,
          t,
          g,
          Rt(l)
        );
      } else
        Ge(
          l,
          t,
          u,
          Rt(l)
        );
    } catch (z) {
      Ge(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: z },
        Rt()
      );
    } finally {
      Y.p = n, i !== null && c.types !== null && (i.types = c.types), U.T = i;
    }
  }
  function Rr() {
  }
  function Wc(l, t, a, u) {
    if (l.tag !== 5) throw Error(y(476));
    var e = U0(l).queue;
    M0(
      l,
      e,
      t,
      Ht,
      a === null ? Rr : function() {
        return C0(l), a(u);
      }
    );
  }
  function U0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: Ht,
      baseState: Ht,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Ea,
        lastRenderedState: Ht
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
        lastRenderedReducer: Ea,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function C0(l) {
    var t = U0(l);
    t.next === null && (t = l.alternate.memoizedState), Ge(
      l,
      t.next.queue,
      {},
      Rt()
    );
  }
  function Ic() {
    return Il(oe);
  }
  function R0() {
    return Hl().memoizedState;
  }
  function p0() {
    return Hl().memoizedState;
  }
  function pr(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Rt();
          l = Ba(a);
          var u = qa(t, l, a);
          u !== null && (St(u, t, a), je(u, t, a)), t = { cache: Nc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function jr(l, t, a) {
    var u = Rt();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l) ? H0(t, a) : (a = hc(l, t, a, u), a !== null && (St(a, l, u), x0(a, t, u)));
  }
  function j0(l, t, a) {
    var u = Rt();
    Ge(l, t, a, u);
  }
  function Ge(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (In(l)) H0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, At(c, i))
            return Mn(l, t, e, 0), El === null && Dn(), !1;
        } catch {
        }
      if (a = hc(l, t, e, u), a !== null)
        return St(a, l, u), x0(a, t, u), !0;
    }
    return !1;
  }
  function kc(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Vf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l)) {
      if (t) throw Error(y(479));
    } else
      t = hc(
        l,
        a,
        u,
        2
      ), t !== null && St(t, l, 2);
  }
  function In(l) {
    var t = l.alternate;
    return l === L || t !== null && t === L;
  }
  function H0(l, t) {
    Zu = Ln = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function x0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Bo(l, a);
    }
  }
  var kn = {
    readContext: Il,
    use: wn,
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
  }, B0 = {
    readContext: Il,
    use: wn,
    useCallback: function(l, t) {
      return ct().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Il,
    useEffect: b0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, Fn(
        4194308,
        4,
        _0.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return Fn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      Fn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = ct();
      t = t === void 0 ? null : t;
      var u = l();
      if (hu) {
        Da(!0);
        try {
          l();
        } finally {
          Da(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = ct();
      if (a !== void 0) {
        var e = a(t);
        if (hu) {
          Da(!0);
          try {
            a(t);
          } finally {
            Da(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = jr.bind(
        null,
        L,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = ct();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Kc(l);
      var t = l.queue, a = j0.bind(null, L, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = ct();
      return Fc(a, l, t);
    },
    useTransition: function() {
      var l = Kc(!1);
      return l = M0.bind(
        null,
        L,
        l.queue,
        !0,
        !1
      ), ct().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = L, e = ct();
      if (W) {
        if (a === void 0)
          throw Error(y(407));
        a = a();
      } else {
        if (a = t(), El === null)
          throw Error(y(349));
        (P & 127) !== 0 || u0(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, b0(n0.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Lu(
        9,
        { destroy: void 0 },
        e0.bind(
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
      var l = ct(), t = El.identifierPrefix;
      if (W) {
        var a = ta, u = la;
        a = (u & ~(1 << 32 - Ot(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Kn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Ar++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: Ic,
    useFormState: r0,
    useActionState: r0,
    useOptimistic: function(l) {
      var t = ct();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = kc.bind(
        null,
        L,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Zc,
    useCacheRefresh: function() {
      return ct().memoizedState = pr.bind(
        null,
        L
      );
    },
    useEffectEvent: function(l) {
      var t = ct(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((dl & 2) !== 0)
          throw Error(y(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, q0 = {
    readContext: Il,
    use: wn,
    useCallback: N0,
    useContext: Il,
    useEffect: wc,
    useImperativeHandle: O0,
    useInsertionEffect: E0,
    useLayoutEffect: z0,
    useMemo: A0,
    useReducer: $n,
    useRef: S0,
    useState: function() {
      return $n(Ea);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = Hl();
      return D0(
        a,
        Sl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = $n(Ea)[0], t = Hl().memoizedState;
      return [
        typeof l == "boolean" ? l : Ye(l),
        t
      ];
    },
    useSyncExternalStore: a0,
    useId: R0,
    useHostTransitionStatus: Ic,
    useFormState: y0,
    useActionState: y0,
    useOptimistic: function(l, t) {
      var a = Hl();
      return f0(a, Sl, l, t);
    },
    useMemoCache: Zc,
    useCacheRefresh: p0,
    useEffectEvent: T0
  }, Hr = {
    readContext: Il,
    use: wn,
    useCallback: N0,
    useContext: Il,
    useEffect: wc,
    useImperativeHandle: O0,
    useInsertionEffect: E0,
    useLayoutEffect: z0,
    useMemo: A0,
    useReducer: Lc,
    useRef: S0,
    useState: function() {
      return Lc(Ea);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = Hl();
      return Sl === null ? Fc(a, l, t) : D0(
        a,
        Sl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Lc(Ea)[0], t = Hl().memoizedState;
      return [
        typeof l == "boolean" ? l : Ye(l),
        t
      ];
    },
    useSyncExternalStore: a0,
    useId: R0,
    useHostTransitionStatus: Ic,
    useFormState: g0,
    useActionState: g0,
    useOptimistic: function(l, t) {
      var a = Hl();
      return Sl !== null ? f0(a, Sl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Zc,
    useCacheRefresh: p0,
    useEffectEvent: T0
  };
  function Pc(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : J({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var lf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = Rt(), e = Ba(u);
      e.payload = t, a != null && (e.callback = a), t = qa(l, e, u), t !== null && (St(t, l, u), je(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = Rt(), e = Ba(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = qa(l, e, u), t !== null && (St(t, l, u), je(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = Rt(), u = Ba(a);
      u.tag = 2, t != null && (u.callback = t), t = qa(l, u, a), t !== null && (St(t, l, a), je(t, l, a));
    }
  };
  function Y0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Ne(a, u) || !Ne(e, n) : !0;
  }
  function G0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && lf.enqueueReplaceState(t, t.state, null);
  }
  function gu(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = J({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function X0(l) {
    An(l);
  }
  function Q0(l) {
    console.error(l);
  }
  function Z0(l) {
    An(l);
  }
  function Pn(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function V0(l, t, a) {
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
  function tf(l, t, a) {
    return a = Ba(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      Pn(l, t);
    }, a;
  }
  function L0(l) {
    return l = Ba(l), l.tag = 3, l;
  }
  function K0(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        V0(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      V0(t, a, u), typeof e != "function" && (Ka === null ? Ka = /* @__PURE__ */ new Set([this]) : Ka.add(this));
      var c = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function xr(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && ou(
        t,
        a,
        e,
        !0
      ), a = kl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return et === null ? Ti() : a.alternate === null && pl === 0 && (pl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Xf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Xf(l, u, e)), !1;
        }
        throw Error(y(435, a.tag));
      }
      return Xf(l, u, e), Ti(), !1;
    }
    if (W)
      return t = kl.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Ec && (l = Error(y(422), { cause: u }), Me(Yt(l, a)))) : (u !== Ec && (t = Error(y(423), {
        cause: u
      }), Me(
        Yt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = Yt(u, a), e = tf(
        l.stateNode,
        u,
        e
      ), Rc(l, e), pl !== 4 && (pl = 2)), !1;
    var n = Error(y(520), { cause: u });
    if (n = Yt(n, a), we === null ? we = [n] : we.push(n), pl !== 4 && (pl = 2), t === null) return !0;
    u = Yt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = tf(a.stateNode, u, l), Rc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Ka === null || !Ka.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = L0(e), K0(
              e,
              l,
              a,
              u
            ), Rc(a, e), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var af = Error(y(461)), Yl = !1;
  function Zl(l, t, a, u) {
    t.child = l === null ? Fs(t, null, a, u) : yu(
      t,
      l.child,
      a,
      u
    );
  }
  function J0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var c in u)
        c !== "ref" && (i[c] = u[c]);
    } else i = u;
    return su(t), u = Yc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = Gc(), l !== null && !Yl ? (Xc(l, t, e), za(l, t, e)) : (W && c && pn(t), t.flags |= 1, Zl(l, t, u, e), t.child);
  }
  function w0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !gc(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, $0(
        l,
        t,
        n,
        u,
        e
      )) : (l = Cn(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !df(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Ne, a(i, u) && l.ref === t.ref)
        return za(l, t, e);
    }
    return t.flags |= 1, l = ha(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function $0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Ne(n, u) && l.ref === t.ref)
        if (Yl = !1, t.pendingProps = u = n, df(l, e))
          (l.flags & 131072) !== 0 && (Yl = !0);
        else
          return t.lanes = l.lanes, za(l, t, e);
    }
    return uf(
      l,
      t,
      a,
      u,
      e
    );
  }
  function F0(l, t, a, u) {
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
        return W0(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && qn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? ks(t, n) : jc(), Ps(t);
      else
        return u = t.lanes = 536870912, W0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (qn(t, n.cachePool), ks(t, n), Xa(), t.memoizedState = null) : (l !== null && qn(t, null), jc(), Xa());
    return Zl(l, t, e, a), t.child;
  }
  function Xe(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function W0(l, t, a, u, e) {
    var n = Dc();
    return n = n === null ? null : { parent: Bl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && qn(t, null), jc(), Ps(t), l !== null && ou(l, t, u, !0), t.childLanes = e, null;
  }
  function li(l, t) {
    return t = ti(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function I0(l, t, a) {
    return yu(t, l.child, null, a), l = li(t, t.pendingProps), l.flags |= 2, Dt(t), t.memoizedState = null, l;
  }
  function Br(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (W) {
        if (u.mode === "hidden")
          return l = li(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Xe(null, l);
        if (xc(t), (l = _l) ? (l = _m(
          l,
          Qt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ca !== null ? { id: la, overflow: ta } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Hs(l), a.return = t, t.child = a, Kl = t, _l = null)) : l = null, l === null) throw pa(t);
        return t.lanes = 536870912, null;
      }
      return li(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (xc(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = I0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(y(558));
      else if (Yl || ou(l, t, a, !1), e = (a & l.childLanes) !== 0, Yl || e) {
        if (Ya.current === null) {
          if (u = El, u !== null && (i = qo(u, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, nu(l, i), St(u, l, i), af;
          Ti();
        }
        t = I0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, _l = Vt(i.nextSibling), Kl = t, W = !0, Ra = null, Qt = !1, l !== null && qs(t, l), t = li(t, u), t.flags |= 134221824;
      return t;
    }
    return l = ha(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Ku(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(y(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function uf(l, t, a, u, e) {
    return su(t), a = Yc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Gc(), l !== null && !Yl ? (Xc(l, t, e), za(l, t, e)) : (W && u && pn(t), t.flags |= 1, Zl(l, t, a, e), t.child);
  }
  function k0(l, t, a, u, e, n) {
    return su(t), t.updateQueue = null, a = t0(
      t,
      u,
      a,
      e
    ), l0(l), u = Gc(), l !== null && !Yl ? (Xc(l, t, n), za(l, t, n)) : (W && u && pn(t), t.flags |= 1, Zl(l, t, a, n), t.child);
  }
  function P0(l, t, a, u, e) {
    if (su(t), t.stateNode === null) {
      var n = xu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Il(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = lf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Uc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Il(i) : xu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (Pc(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && lf.enqueueReplaceState(n, n.state, null), xe(t, u, n, e), He(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = gu(a, c);
      n.props = f;
      var v = n.context, g = a.contextType;
      i = xu, typeof g == "object" && g !== null && (i = Il(g));
      var z = a.getDerivedStateFromProps;
      g = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || v !== i) && G0(
        t,
        n,
        u,
        i
      ), xa = !1;
      var d = t.memoizedState;
      n.state = d, xe(t, u, n, e), He(), v = t.memoizedState, c || d !== v || xa ? (typeof z == "function" && (Pc(
        t,
        a,
        z,
        u
      ), v = t.memoizedState), (f = xa || Y0(
        t,
        a,
        f,
        u,
        d,
        v,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = v), n.props = u, n.state = v, n.context = i, u = f) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Cc(l, t), i = t.memoizedProps, g = gu(a, i), n.props = g, z = t.pendingProps, d = n.context, v = a.contextType, f = xu, typeof v == "object" && v !== null && (f = Il(v)), c = a.getDerivedStateFromProps, (v = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || d !== f) && G0(
        t,
        n,
        u,
        f
      ), xa = !1, d = t.memoizedState, n.state = d, xe(t, u, n, e), He();
      var h = t.memoizedState;
      i !== z || d !== h || xa || l !== null && l.dependencies !== null && xn(l.dependencies) ? (typeof c == "function" && (Pc(
        t,
        a,
        c,
        u
      ), h = t.memoizedState), (g = xa || Y0(
        t,
        a,
        g,
        u,
        d,
        h,
        f
      ) || l !== null && l.dependencies !== null && xn(l.dependencies)) ? (v || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, h, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        h,
        f
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = h), n.props = u, n.state = h, n.context = f, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, Ku(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = yu(
      t,
      l.child,
      null,
      e
    ), t.child = yu(
      t,
      null,
      a,
      e
    )) : Zl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = za(
      l,
      t,
      e
    ), l;
  }
  function ld(l, t, a, u) {
    return cu(), t.flags |= 256, Zl(l, t, a, u), t.child;
  }
  var ef = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function nf(l) {
    return { baseLanes: l, cachePool: Vs() };
  }
  function cf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= Ct), l;
  }
  function td(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Pl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (W) {
        if (e ? Ga(t) : Xa(), (l = _l) ? (l = _m(
          l,
          Qt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ca !== null ? { id: la, overflow: ta } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = Hs(l), a.return = t, t.child = a, Kl = t, _l = null)) : l = null, l === null) throw pa(t);
        return io(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = u.children, u = u.fallback, e ? (Xa(), e = t.mode, n = ti(
        { mode: "hidden", children: n },
        e
      ), u = iu(
        u,
        e,
        a,
        null
      ), n.return = t, u.return = t, n.sibling = u, t.child = n, u = t.child, u.memoizedState = nf(a), u.childLanes = cf(
        l,
        i,
        a
      ), t.memoizedState = ef, Xe(null, u)) : (Ga(t), ff(t, n));
    }
    var c = l.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return qr(
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
    return e ? (Xa(), e = u.fallback, n = t.mode, c = l.child, f = c.sibling, u = ha(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? e = ha(f, e) : (e = iu(
      e,
      n,
      a,
      null
    ), e.flags |= 2), e.return = t, u.return = t, u.sibling = e, t.child = u, Xe(null, u), u = t.child, e = l.child.memoizedState, e === null ? e = nf(a) : (n = e.cachePool, n !== null ? (c = Bl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Vs(), e = {
      baseLanes: e.baseLanes | a,
      cachePool: n
    }), u.memoizedState = e, u.childLanes = cf(
      l,
      i,
      a
    ), t.memoizedState = ef, Xe(l.child, u)) : (Ga(t), a = l.child, l = a.sibling, a = ha(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function ff(l, t) {
    return t = ti(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function ti(l, t) {
    return l = rt(22, l, null, t), l.lanes = 0, l;
  }
  function ai(l, t, a) {
    return yu(t, l.child, null, a), l = ff(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function qr(l, t, a, u, e, n, i, c) {
    if (a)
      return t.flags & 256 ? (Ga(t), t.flags &= -257, ai(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Xa(), t.child = l.child, t.flags |= 128, null) : (Xa(), n = e.fallback, i = t.mode, e = ti(
        { mode: "visible", children: e.children },
        i
      ), n = iu(
        n,
        i,
        c,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, yu(t, l.child, null, c), e = t.child, e.memoizedState = nf(c), e.childLanes = cf(
        l,
        u,
        c
      ), t.memoizedState = ef, Xe(null, e));
    if (Ga(t), io(n)) {
      if (u = n.nextSibling && n.nextSibling.dataset, u) var f = u.dgst;
      return u = f, u !== "" && (e = Error(y(419)), e.stack = "", e.digest = u, Me({ value: e, source: null, stack: null })), ai(
        l,
        t,
        c
      );
    }
    if (Yl || ou(l, t, c, !1), u = (c & l.childLanes) !== 0, Yl || u) {
      if (Ya.current !== null)
        return ai(
          l,
          t,
          c
        );
      if (u = El, u !== null && (e = qo(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, nu(l, e), St(u, l, e), af;
      return no(n) || Ti(), ai(
        l,
        t,
        c
      );
    }
    return no(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, _l = Vt(n.nextSibling), Kl = t, W = !0, Ra = null, Qt = !1, l !== null && qs(t, l), t = ff(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function ad(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Hn(l.return, t, a);
  }
  function ud(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && Vn(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function ui(l, t, a, u, e, n) {
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
  function of(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function sf(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = Pl.current;
    if (t.flags & 128)
      return Be(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, Be(t, i), e === "backwards" && l !== null ? (of(l), Zl(l, t, u, a), of(l)) : Zl(l, t, u, a), u = W ? De : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && ad(l, a, t);
        else if (l.tag === 19)
          ad(l, a, t);
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
        a = ud(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null, of(t)), ui(
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
          if (l = e.alternate, l !== null && Vn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        ui(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        ui(
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
        a = ud(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), ui(
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
  function ed(l, t, a) {
    var u = t.pendingProps;
    return ja(t, t.type, u.value), Zl(l, t, u.children, a), t.child;
  }
  function za(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), La |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (ou(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(y(153));
    if (t.child !== null) {
      for (l = t.child, a = ha(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = ha(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function df(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && xn(l)));
  }
  function Yr(l, t, a) {
    switch (t.tag) {
      case 3:
        Al(t, t.stateNode.containerInfo), ja(t, Bl, l.memoizedState.cache), cu();
        break;
      case 27:
      case 5:
        qi(t);
        break;
      case 4:
        Al(t, t.stateNode.containerInfo);
        break;
      case 10:
        ja(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, xc(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null) {
          if (u.dehydrated !== null)
            return Ga(t), t.flags |= 128, null;
          u = ou(
            l,
            t,
            a,
            !1
          );
          var e = t.child.childLanes;
          return u || (a & e) !== 0 ? td(l, t, a) : (Ga(t), l = za(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        Ga(t);
        break;
      case 19:
        if (t.flags & 128)
          return sf(
            l,
            t,
            a
          );
        if (e = (l.flags & 128) !== 0, u = (a & t.childLanes) !== 0, u || (ou(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return sf(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), Be(t, Pl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, F0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        ja(t, Bl, l.memoizedState.cache);
    }
    return za(l, t, a);
  }
  function nd(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Yl = !0;
      else {
        if (!df(l, a) && (t.flags & 128) === 0)
          return Yl = !1, Yr(
            l,
            t,
            a
          );
        Yl = (l.flags & 131072) !== 0;
      }
    else
      Yl = !1, W && (t.flags & 1048576) !== 0 && Bs(t, De, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = vu(t.elementType), t.type = l, typeof l == "function")
            gc(l) ? (u = gu(l, u), t.tag = 1, t = P0(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = uf(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === O) {
                t.tag = 11, t = J0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === il) {
                t.tag = 14, t = w0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === Ml) {
                t.tag = 10, t.type = l, t = ed(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = ul(l) || l, Error(y(306, t, ""));
          }
        }
        return t;
      case 0:
        return uf(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = gu(
          u,
          t.pendingProps
        ), P0(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (Al(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(y(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Cc(l, t), xe(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, ja(t, Bl, u), u !== n.cache && Oc(
            t,
            [Bl],
            a,
            !0
          ), He(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = ld(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = Yt(
                Error(y(424)),
                t
              ), Me(e), t = ld(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, _l = Vt(l.firstChild), Kl = t, W = !0, Ra = null, Qt = !0, a = Fs(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (cu(), u === e) {
              t = za(
                l,
                t,
                a
              );
              break l;
            }
            Zl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Ku(l, t), l === null ? (a = Cm(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : W || (t.stateNode = om(
          t.type,
          t.pendingProps,
          G.current,
          t
        )) : t.memoizedState = Cm(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return qi(t), l === null && W && (u = t.stateNode = Am(
          t.type,
          t.pendingProps,
          G.current
        ), Kl = t, Qt = !0, e = _l, $a(t.type) ? (co = e, _l = Vt(u.firstChild)) : _l = e), Zl(
          l,
          t,
          t.pendingProps.children,
          a
        ), Ku(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && W && ((e = u = _l) && (u = py(
          u,
          t.type,
          t.pendingProps,
          Qt
        ), u !== null ? (t.stateNode = u, Kl = t, _l = Vt(u.firstChild), Qt = !1, e = !0) : e = !1), e || pa(t)), qi(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, kf(e, n) ? u = null : i !== null && kf(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Yc(
          l,
          t,
          Dr,
          null,
          null,
          a
        ), oe._currentValue = e), Ku(l, t), Zl(l, t, u, a), t.child;
      case 6:
        return l === null && W && ((l = a = _l) && (a = jy(
          a,
          t.pendingProps,
          Qt
        ), a !== null ? (t.stateNode = a, Kl = t, _l = null, l = !0) : l = !1), l || pa(t)), null;
      case 13:
        return td(l, t, a);
      case 4:
        return Al(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = yu(
          t,
          null,
          u,
          a
        ) : Zl(l, t, u, a), t.child;
      case 11:
        return J0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return u = t.pendingProps, Ku(l, t), Zl(l, t, u, a), t.child;
      case 8:
        return Zl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Zl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return ed(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, su(t), e = Il(e), u = u(e), t.flags |= 1, Zl(l, t, u, a), t.child;
      case 14:
        return w0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return $0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return sf(l, t, a);
      case 31:
        return Br(l, t, a);
      case 22:
        return F0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return su(t), u = Il(Bl), l === null ? (e = Dc(), e === null && (e = El, n = Nc(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Uc(t), ja(t, Bl, e)) : ((l.lanes & a) !== 0 && (Cc(l, t), xe(t, null, null, a), He()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), ja(t, Bl, u)) : (u = n.cache, ja(t, Bl, u), u !== e.cache && Oc(
          t,
          [Bl],
          a,
          !0
        ))), Zl(
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
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : W && pn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : Ku(l, t), Zl(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(y(156, t.tag));
  }
  function _a(l) {
    l.flags |= 4;
  }
  function mf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? Hm(t, u) : Hm(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Xd()) l.flags |= 8192;
        else
          throw ru = Gn, Mc;
    } else l.flags &= -16777217;
  }
  function id(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !xm(t))
      if (Xd()) l.flags |= 8192;
      else
        throw ru = Gn, Mc;
  }
  function ei(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Ho() : 536870912, l.lanes |= t, Wu |= t);
  }
  function Qe(l, t) {
    if (!W)
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
  function Ol(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, u = 0;
    if (t)
      for (var e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags & 1206910976, u |= e.flags & 1206910976, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags, u |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= u, l.childLanes = a, t;
  }
  function Gr(l, t, a) {
    var u = t.pendingProps;
    switch (Tc(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Ol(t), null;
      case 1:
        return Ol(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), ba(Bl), mt(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Yu(t) ? _a(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, zc())), Ol(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (_a(t), n !== null ? (Ol(t), id(t, n)) : (Ol(t), mf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (_a(t), Ol(t), id(t, n)) : (Ol(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && _a(t), Ol(t), mf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (on(t), a = G.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && _a(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(y(166));
            return Ol(t), t.subtreeFlags &= -33554433, null;
          }
          l = xt.current, Yu(t) ? Ys(t) : (l = Am(e, u, a), t.stateNode = l, _a(t));
        }
        return Ol(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (on(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && _a(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(y(166));
            return Ol(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = xt.current, Yu(t))
            Ys(t);
          else {
            var i = ke(
              G.current
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
            n[Wl] = t, n[vt] = u;
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
            u && _a(t);
          }
        }
        return Ol(t), t.subtreeFlags &= -33554433, mf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && _a(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(y(166));
          if (l = G.current, Yu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Kl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Wl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || nm(l.nodeValue, a)), l || pa(t, !0);
          } else
            l = ke(l).createTextNode(
              u
            ), l[Wl] = t, t.stateNode = l;
        }
        return Ol(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Yu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(y(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(557));
              l[Wl] = t;
            } else
              cu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ol(t), l = !1;
          } else
            a = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Dt(t), t) : (Dt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(y(558));
        }
        return Ol(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Yu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(y(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(y(317));
              e[Wl] = t;
            } else
              cu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ol(t), e = !1;
          } else
            e = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (Dt(t), t) : (Dt(t), null);
        }
        return Dt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), ei(t, t.updateQueue), Ol(t), null);
      case 4:
        return mt(), l === null && wf(t.stateNode.containerInfo), t.flags |= 67108864, Ol(t), null;
      case 10:
        return ba(t.type), Ol(t), null;
      case 19:
        if (Bc(t), u = t.memoizedState, u === null) return Ol(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Qe(u, !1);
          else {
            if (pl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Vn(l), n !== null) {
                  for (t.flags |= 128, Qe(u, !1), l = n.updateQueue, t.updateQueue = l, ei(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    js(a, l), a = a.sibling;
                  return Be(
                    t,
                    Pl.current & 1 | 2
                  ), W && ga(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && zt() > hi && (t.flags |= 128, e = !0, Qe(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = Vn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, ei(t, l), Qe(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !W)
                return Ol(t), null;
            } else
              2 * zt() - u.renderingStartTime > hi && a !== 536870912 && (t.flags |= 128, e = !0, Qe(u, !1), t.lanes = 4194304);
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
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = zt(), l.sibling = null, n = Pl.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || W ? Be(t, n) : (a = n, vl(kl, t), vl(Pl, a), et === null && (et = t)), W && ga(t, u.treeForkCount), l;
        }
        return Ol(t), null;
      case 22:
      case 23:
        return Dt(t), Hc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Ol(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ol(t), a = t.updateQueue, a !== null && ei(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && Ql(mu), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), ba(Bl), Ol(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Ol(t), null;
    }
    throw Error(y(156, t.tag));
  }
  function Xr(l, t) {
    switch (Tc(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return ba(Bl), mt(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return on(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Dt(t), t.alternate === null)
            throw Error(y(340));
          cu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Dt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(y(340));
          cu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Bc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return mt(), null;
      case 10:
        return ba(t.type), null;
      case 22:
      case 23:
        return Dt(t), Hc(), l !== null && Ql(mu), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return ba(Bl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function cd(l, t) {
    switch (Tc(t), t.tag) {
      case 3:
        ba(Bl), mt();
        break;
      case 26:
      case 27:
      case 5:
        on(t);
        break;
      case 4:
        mt();
        break;
      case 31:
        t.memoizedState !== null && Dt(t);
        break;
      case 13:
        Dt(t);
        break;
      case 19:
        Bc(t);
        break;
      case 10:
        ba(t.type);
        break;
      case 22:
      case 23:
        Dt(t), Hc(), l !== null && Ql(mu);
        break;
      case 24:
        ba(Bl);
    }
  }
  function Ze(l, t) {
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
      yl(t, t.return, c);
    }
  }
  function Qa(l, t, a) {
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
              var f = a, v = c;
              try {
                v();
              } catch (g) {
                yl(
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
      yl(t, t.return, g);
    }
  }
  function fd(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        Is(t, a);
      } catch (u) {
        yl(l, l.return, u);
      }
    }
  }
  function od(l, t, a) {
    a.props = gu(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      yl(l, t, u);
    }
  }
  function aa(l, t) {
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
            var e = l.stateNode, n = ra(l.memoizedProps, e);
            (e.ref === null || e.ref.name !== n) && (e.ref = hm(n)), u = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new pt(l);
              T(
                l.child,
                !1,
                Cy,
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
      yl(l, t, c);
    }
  }
  function lt(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          yl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          yl(l, t, e);
        }
      else a.current = null;
  }
  function ni(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        zm(
          l.stateNode,
          t[a]
        );
  }
  function sd(l) {
    for (var t = l.return; t !== null && (rf(t) && zm(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function Ve(l) {
    for (var t = l.return; t !== null && (rf(t) && Ry(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function vf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function rf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function yf(l) {
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
      yl(l, l.return, e);
    }
  }
  function hf(l, t, a) {
    try {
      var u = l.stateNode;
      my(u, l.type, a, t), u[vt] = t;
    } catch (e) {
      yl(l, l.return, e);
    }
  }
  function dd(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && $a(l.type) || l.tag === 4;
  }
  function gf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || dd(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && $a(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Sf(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Pt)), ni(l, u), sl = !0;
    else if (e !== 4 && (e === 27 && (ni(l, u), u = null, $a(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (Sf(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        Sf(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function ii(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), ni(l, u), sl = !0;
    else if (e !== 4 && (e === 27 && (ni(l, u), u = null, $a(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (ii(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        ii(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function md(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      tt(t, u, a), t[Wl] = l, t[vt] = a;
    } catch (n) {
      yl(l, l.return, n);
    }
  }
  var ci = !1, Mt = null;
  function vd(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (ci = !0);
  }
  var ua = null;
  function rd() {
    var l = ua;
    return ua = null, l;
  }
  var yt = 0;
  function Ju(l, t, a, u, e) {
    return yt = 0, yd(
      l.child,
      t,
      a,
      u,
      e
    );
  }
  function yd(l, t, a, u, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (u !== null) {
          var c = to(i);
          u.push(c), c.view && (n = !0);
        } else
          n || to(i).view && (n = !0);
        ci = !0, rm(
          i,
          yt === 0 ? t : t + "_" + yt,
          a
        ), yt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || yd(
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
  function ea(l, t) {
    for (; l !== null; )
      l.tag === 5 ? ym(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || ea(
        l.child,
        t
      )), l = l.sibling;
  }
  function fi(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (fi(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(y(544));
          var a = t.name;
          t = ya(t.default, t.share), t !== "none" && (Ju(
            l,
            a,
            t,
            null,
            !1
          ) || ea(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function bf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, u = l.memoizedProps, e = ra(u, a), n = ya(
        u.default,
        a.paired ? u.share : u.enter
      );
      n !== "none" ? Ju(l, e, n, null, !1) ? (fi(l), a.paired || t || le(l, u.onEnter)) : ea(l.child, !1) : fi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        bf(l, t), l = l.sibling;
    else fi(l);
  }
  function Tf(l) {
    if (Mt !== null && Mt.size !== 0) {
      var t = Mt;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var a = l.memoizedProps, u = a.name;
              if (u != null && u !== "auto") {
                var e = t.get(u);
                if (e !== void 0) {
                  var n = ya(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (Ju(
                    l,
                    u,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, le(l, a.onShare)) : ea(l.child, !1)), t.delete(u), t.size === 0) break;
                }
              }
            }
            Tf(l);
          }
          l = l.sibling;
        }
    }
  }
  function Ef(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = ra(t, l.stateNode), u = Mt !== null ? Mt.get(a) : void 0, e = ya(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Ju(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, Mt.delete(a), le(l, t.onShare)) : le(l, t.onExit) : ea(l.child, !1)), Mt !== null && Tf(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Ef(l), l = l.sibling;
    else
      Mt !== null && Tf(l);
  }
  function hd(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = ra(t, l.stateNode);
        t = ya(t.default, t.update), l.flags &= -5, t !== "none" && Ju(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && hd(l);
      l = l.sibling;
    }
  }
  function zf(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, ea(l.child, !1));
          }
          zf(l);
        }
        l = l.sibling;
      }
  }
  function oi(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, ea(l.child, !1), zf(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        oi(l), l = l.sibling;
    else zf(l);
  }
  function gd(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? ea(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && gd(l), l = l.sibling;
  }
  function _f(l, t, a, u, e, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && yt < n.length) {
          var v = n[yt], g = to(f);
          (v.view || g.view) && (c = !0);
          var z;
          if (z = (l.flags & 4) === 0)
            if (g.clip) z = !0;
            else {
              z = v.rect;
              var d = g.rect;
              z = z.y !== d.y || z.x !== d.x || z.height !== d.height || z.width !== d.width;
            }
          z && (l.flags |= 4), g.abs ? g = !v.abs : (v = v.rect, g = g.rect, g = v.height !== g.height || v.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && rm(
          f,
          yt === 0 ? a : a + "_" + yt,
          e
        ), c && (l.flags & 4) !== 0 || (ua === null && (ua = []), ua.push(
          f,
          yt === 0 ? u : u + "_" + yt,
          t.memoizedProps
        )), yt++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : _f(
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
  function Sd(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, u = l.stateNode, e = ra(a, u), n = ya(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, u = l;
        var c = l.child;
        yt = 0, e = _f(
          u,
          c,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && le(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && Sd(l);
      l = l.sibling;
    }
  }
  var Jl = !1, ml = !1, na = !1, Of = !1, bd = typeof WeakSet == "function" ? WeakSet : Set, wl = null, ia = !1, Le = !1, si = !1, Nf = !1;
  function Qr(l, t, a) {
    if (l = l.containerInfo, Wf = se, l = _s(l), sc(l)) {
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
            var c = 0, f = -1, v = -1, g = 0, z = 0, d = l, h = null;
            t: for (; ; ) {
              for (var N; d !== u || n !== 0 && d.nodeType !== 3 || (f = c + n), d !== i || e !== 0 && d.nodeType !== 3 || (v = c + e), d.nodeType === 3 && (c += d.nodeValue.length), (N = d.firstChild) !== null; )
                h = d, d = N;
              for (; ; ) {
                if (d === l) break t;
                if (h === u && ++g === n && (f = c), h === i && ++z === e && (v = c), (N = d.nextSibling) !== null) break;
                d = h, h = d.parentNode;
              }
              d = N;
            }
            u = f === -1 || v === -1 ? null : { start: f, end: v };
          } else u = null;
        }
      u = u || { start: 0, end: 0 };
    } else u = null;
    for (If = { focusedElem: l, selectionRange: u }, se = !1, a = (a & 335544064) === a, wl = t, t = a ? 9270 : 1024; wl !== null; ) {
      if (l = wl, a && (u = l.deletions, u !== null))
        for (n = 0; n < u.length; n++)
          a && Ef(u[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && vd(l), di(a);
      else {
        if (l.tag === 22) {
          if (u = l.alternate, l.memoizedState !== null) {
            u !== null && u.memoizedState === null && a && Ef(u), di(a);
            continue;
          } else if (u !== null && u.memoizedState !== null) {
            a && vd(l), di(a);
            continue;
          }
        }
        u = l.child, (l.subtreeFlags & t) !== 0 && u !== null ? (u.return = l, wl = u) : (a && hd(l), di(a));
      }
    }
    Mt = null;
  }
  function di(l) {
    for (; wl !== null; ) {
      var t = wl, a = l, u = t.alternate, e = t.flags;
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
              var i = gu(
                t.type,
                e
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                u
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              yl(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (u = t.stateNode.containerInfo, a = u.nodeType, a === 9)
              eo(u);
            else if (a === 1)
              switch (u.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  eo(u);
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
          a && u !== null && (a = ra(
            u.memoizedProps,
            u.stateNode
          ), e = t.memoizedProps, e = ya(e.default, e.update), e !== "none" && Ju(
            u,
            a,
            e,
            u.memoizedState = [],
            !0
          ));
          break;
        default:
          if ((e & 1024) !== 0) throw Error(y(163));
      }
      if (u = t.sibling, u !== null) {
        u.return = t.return, wl = u;
        break;
      }
      wl = t.return;
    }
  }
  function Td(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        ca(l, a), u & 4 && Ze(5, a);
        break;
      case 1:
        if (ca(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              yl(a, a.return, i);
            }
          else {
            var e = gu(
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
              yl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && fd(a), u & 512 && aa(a, a.return);
        break;
      case 3:
        if (ca(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
            Is(l, t);
          } catch (i) {
            yl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && md(a);
      case 26:
      case 5:
        ca(l, a), t === null && u & 4 && yf(a), u & 512 && aa(a, a.return);
        break;
      case 12:
        ca(l, a);
        break;
      case 31:
        ca(l, a), u & 4 && Od(l, a);
        break;
      case 13:
        ca(l, a), u & 4 && Nd(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = Pr.bind(
          null,
          a
        ), Hy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Jl, !u) {
          var n = t !== null && t.memoizedState !== null || ml;
          t = Jl, e = ml, Jl = u, (ml = n) && !e ? (u = 2, (a.subtreeFlags & 8772) !== 0 && (u |= 1), Wt(
            l,
            a,
            u
          )) : ca(l, a), Jl = t, ml = e;
        }
        break;
      case 30:
        ca(l, a), u & 512 && aa(a, a.return);
        break;
      case 7:
        u & 512 && aa(a, a.return);
      default:
        ca(l, a);
    }
  }
  function Af(l, t) {
    for (l = l.child; l !== null; )
      Ed(l, t), l = l.sibling;
  }
  function Ed(l, t) {
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
          yl(l, l.return, f);
        }
        Df(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, sl = !0;
        } catch (f) {
          yl(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? vm(c, !0) : vm(l.stateNode, !1);
        } catch (f) {
          yl(l, l.return, f);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && Af(l, t);
        break;
      default:
        Af(l, t);
    }
  }
  function Df(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, u = t;
          switch (a.tag) {
            case 4:
              Ed(a, u);
              break l;
            case 22:
              a.memoizedState === null && Df(a, u);
              break l;
            default:
              Df(a, u);
          }
        }
        l = l.sibling;
      }
  }
  function zd(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, zd(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && hn(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Dl = null, ht = !1;
  function $t(l, t, a) {
    for (a = a.child; a !== null; )
      _d(l, t, a), a = a.sibling;
  }
  function _d(l, t, a) {
    if (_t && typeof _t.onCommitFiberUnmount == "function")
      try {
        _t.onCommitFiberUnmount(ve, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        ml || lt(a, t), $t(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !ml && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        ml || lt(a, t), Ve(a);
        var u = Dl, e = ht;
        $a(a.type) && (Dl = a.stateNode, ht = !1), $t(
          l,
          t,
          a
        ), Dm(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Dl = u, ht = e;
        break;
      case 5:
        ml || lt(a, t), Ve(a);
      case 6:
        if (a.tag === 6 && Ve(a), u = Dl, e = ht, Dl = null, $t(
          l,
          t,
          a
        ), Dl = u, ht = e, Dl !== null)
          if (ht)
            try {
              (Dl.nodeType === 9 ? Dl.body : Dl.nodeName === "HTML" ? Dl.ownerDocument.body : Dl).removeChild(a.stateNode), sl = !0;
            } catch (n) {
              yl(
                a,
                t,
                n
              );
            }
          else
            try {
              Dl.removeChild(a.stateNode), sl = !0;
            } catch (n) {
              yl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Dl !== null && (ht ? (l = Dl, mm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), de(l)) : mm(Dl, a.stateNode));
        break;
      case 4:
        u = Dl, e = ht, Dl = a.stateNode.containerInfo, ht = !0, $t(
          l,
          t,
          a
        ), Dl = u, ht = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Qa(2, a, t), ml || Qa(4, a, t), $t(
          l,
          t,
          a
        );
        break;
      case 1:
        ml || (lt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && od(
          a,
          t,
          u
        )), $t(
          l,
          t,
          a
        );
        break;
      case 21:
        $t(
          l,
          t,
          a
        );
        break;
      case 22:
        ml = (u = ml) || a.memoizedState !== null, $t(
          l,
          t,
          a
        ), ml = u;
        break;
      case 30:
        lt(a, t), $t(
          l,
          t,
          a
        );
        break;
      case 7:
        ml || lt(a, t), $t(
          l,
          t,
          a
        );
        break;
      default:
        $t(
          l,
          t,
          a
        );
    }
  }
  function Od(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        de(l);
      } catch (a) {
        yl(t, t.return, a);
      }
    }
  }
  function Nd(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        de(l);
      } catch (a) {
        yl(t, t.return, a);
      }
  }
  function Zr(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new bd()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new bd()), t;
      default:
        throw Error(y(435, l.tag));
    }
  }
  function mi(l, t) {
    var a = Zr(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = ly.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function ft(l, t, a) {
    var u = t.deletions;
    if (u !== null)
      for (var e = 0; e < u.length; e++) {
        var n = u[e], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if ($a(f.type)) {
                Dl = f.stateNode, ht = !1;
                break l;
              }
              break;
            case 5:
              Dl = f.stateNode, ht = !1;
              break l;
            case 3:
            case 4:
              Dl = f.stateNode.containerInfo, ht = !0;
              break l;
          }
          f = f.return;
        }
        if (Dl === null) throw Error(y(160));
        _d(i, c, n), Dl = null, ht = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Ad(t, l, a), t = t.sibling;
  }
  var Ft = null;
  function Ad(l, t, a) {
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
        ft(t, l, a), ot(l), e & 4 && (Qa(3, l, l.return), Ze(3, l), Qa(5, l, l.return));
        break;
      case 1:
        ft(t, l, a), ot(l), e & 512 && (ml || u === null || lt(u, u.return)), e & 64 && Jl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Ft, ft(t, l, a), ot(l), e & 512 && (ml || u === null || lt(u, u.return)), e & 4)
          if (e = u !== null ? u.memoizedState : null, a = l.memoizedState, u === null)
            if (a === null)
              if (l.stateNode === null)
                if (Jl)
                  l.stateNode = om(
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
                        u = e.getElementsByTagName("title")[0], (!u || u[he] || u[Wl] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), tt(u, t, a), u[Wl] = l, Ll(u), t = u;
                        break l;
                      case "link":
                        if (n = jm(
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
                        if (n = jm(
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
                        throw Error(y(468, t));
                    }
                    u[Wl] = l, Ll(u), t = u;
                  }
                  l.stateNode = t;
                }
              else
                Jl || mo(n, l.type, l.stateNode);
            else
              l.stateNode = pm(
                n,
                a,
                l.memoizedProps
              );
          else
            e !== a ? (e === null ? (t = u.stateNode, t === null || ml || t.parentNode.removeChild(t)) : e.count--, a === null ? Jl || mo(n, l.type, l.stateNode) : pm(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && hf(
              l,
              l.memoizedProps,
              u.memoizedProps
            );
        break;
      case 27:
        ft(t, l, a), ot(l), e & 512 && (ml || u === null || lt(u, u.return)), u !== null && e & 4 && hf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = na, na = !1, ft(t, l, a), na = n, ot(l), e & 512 && (ml || u === null || lt(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Mu(t, ""), sl = !0;
          } catch (g) {
            yl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, hf(
          l,
          t,
          u !== null ? u.memoizedProps : t
        )), e & 1024 && (Of = !0);
        break;
      case 6:
        if (ft(t, l, a), ot(l), e & 4) {
          if (l.stateNode === null)
            throw Error(y(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, sl = !0;
          } catch (g) {
            yl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (sl = !1, Di = null, n = Ft, Ft = Pe(t.containerInfo), ft(t, l, a), Ft = n, ot(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            de(t.containerInfo);
          } catch (g) {
            yl(l, l.return, g);
          }
        Of && (Of = !1, Dd(l)), sl = !1;
        break;
      case 4:
        e = na, na = Jl, u = wo(), n = Ft, Ft = Pe(
          l.stateNode.containerInfo
        ), ft(t, l, a), ot(l), Ft = n, sl && Le && (si = !0), sl = u, na = e;
        break;
      case 12:
        ft(t, l, a), ot(l);
        break;
      case 31:
        ft(t, l, a), ot(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 13:
        ft(t, l, a), ot(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (yi = zt()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = Jl, f = ml, v = na;
        Jl = c || n, na = v || n, ml = f || i, ft(t, l, a), ml = f, na = v, Jl = c, ot(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || Jl || ml || (t = i || ml, a = Jl, u = ml, Jl = n || Jl, ml = t, Za(l, 2), Jl = a, ml = u), !n && na || Af(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, mi(l, a))));
        break;
      case 19:
        ft(t, l, a), ot(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 30:
        e & 512 && (ml || u === null || lt(u, u.return)), e = wo(), n = Le, i = (a & 335544064) === a, c = l.memoizedProps, Le = i && ya(
          c.default,
          c.update
        ) !== "none", ft(t, l, a), ot(l), i && u !== null && sl && (l.flags |= 4), Le = n, sl = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (ml || u === null || lt(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        ft(t, l, a), ot(l);
    }
  }
  function ot(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (dd(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        u = null;
        for (var e = l.return; e !== null; ) {
          if (rf(e)) {
            var n = e.stateNode;
            u === null ? u = [n] : u.push(n);
          }
          if (vf(e)) break;
          e = e.return;
        }
        var i = u;
        if (a == null) throw Error(y(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = gf(l);
            ii(
              l,
              f,
              c,
              i
            );
            break;
          case 5:
            var v = a.stateNode;
            a.flags & 32 && (Mu(v, ""), a.flags &= -33);
            var g = gf(l);
            ii(
              l,
              g,
              v,
              i
            );
            break;
          case 3:
          case 4:
            var z = a.stateNode.containerInfo, d = gf(l);
            Sf(
              l,
              d,
              z,
              i
            );
            break;
          default:
            throw Error(y(161));
        }
      } catch (h) {
        yl(l, l.return, h);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Dd(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Dd(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, se = !0, t.reset(), se = !1), l = l.sibling;
      }
  }
  function wu(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Md(t, l), t = t.sibling;
    else Sd(t);
  }
  function Md(l, t) {
    var a = l.alternate;
    if (a === null) bf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Nf = ia = !1, rd(), wu(t, l), !ia && !si) {
            if (l = ua, l !== null)
              for (var u = 0; u < l.length; u += 3) {
                a = l[u];
                var e = l[u + 1];
                ym(a, l[u + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
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
            )), Nf = !0;
          }
          ua = null;
          break;
        case 5:
          wu(t, l);
          break;
        case 4:
          u = ia, ia = !1, wu(t, l), ia && (si = !0), ia = u;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? bf(l, !1) : wu(t, l));
          break;
        case 30:
          u = ia, e = rd(), ia = !1, wu(t, l), ia && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ra(n, i), i = ra(a.memoizedProps, i);
          var c = ya(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, yt = 0, t = _f(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), yt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (le(
            l,
            l.memoizedProps.onUpdate
          ), ua = e) : e !== null && (e.push.apply(e, ua), ua = e), ia = (l.flags & 32) !== 0 ? !0 : u;
          break;
        default:
          wu(t, l);
      }
  }
  function ca(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        Td(l, t.alternate, t), t = t.sibling;
  }
  function Za(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, u = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Qa(4, a, a.return), Za(
            a,
            u
          );
          break;
        case 1:
          lt(a, a.return);
          var e = a.stateNode;
          typeof e.componentWillUnmount == "function" && od(
            a,
            a.return,
            e
          ), Za(
            a,
            u
          );
          break;
        case 27:
          (u & 2) !== 0 && Dm(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          lt(a, a.return), a.tag !== 5 && a.tag !== 27 || Ve(a), Za(
            a,
            u
          );
          break;
        case 6:
          Ve(a);
          break;
        case 26:
          lt(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || ml || e.parentNode.removeChild(e), Za(
            a,
            u
          );
          break;
        case 22:
          a.memoizedState === null && Za(
            a,
            u
          );
          break;
        case 30:
          lt(a, a.return), Za(
            a,
            u
          );
          break;
        case 7:
          lt(a, a.return);
        default:
          Za(
            a,
            u
          );
      }
      l = l.sibling;
    }
  }
  function Wt(l, t, a) {
    for (a = (t.subtreeFlags & 8772) !== 0 ? a : a & -2, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          Wt(
            e,
            n,
            a
          ), Ze(4, n);
          break;
        case 1:
          if (Wt(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (g) {
              yl(u, u.return, g);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var v = e.shared.hiddenCallbacks;
              if (v !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < v.length; e++)
                  Ws(v[e], f);
            } catch (g) {
              yl(u, u.return, g);
            }
          }
          c && i & 64 && fd(n), aa(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && md(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || sd(n), Wt(
            e,
            n,
            a
          ), c && u === null && i & 4 && yf(n), aa(n, n.return);
          break;
        case 6:
          sd(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || Jl || mo(
            Pe(f.ownerDocument),
            n.type,
            f
          ), Wt(
            e,
            n,
            a
          ), c && u === null && i & 4 && yf(n), aa(n, n.return);
          break;
        case 12:
          Wt(
            e,
            n,
            a
          );
          break;
        case 31:
          Wt(
            e,
            n,
            a
          ), c && i & 4 && Od(e, n);
          break;
        case 13:
          Wt(
            e,
            n,
            a
          ), c && i & 4 && Nd(e, n);
          break;
        case 22:
          n.memoizedState === null && Wt(
            e,
            n,
            a
          ), aa(n, n.return);
          break;
        case 30:
          Wt(
            e,
            n,
            a
          ), aa(n, n.return);
          break;
        case 7:
          aa(n, n.return);
        default:
          Wt(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Mf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Ue(a));
  }
  function Uf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ue(l));
  }
  function Zt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Ud(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && gd(t);
  }
  function Ud(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && oi(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Zt(
          l,
          t,
          a,
          u
        ), n & 2048 && Ze(9, t);
        break;
      case 1:
        Zt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Zt(
          l,
          t,
          a,
          u
        ), e && Nf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Ue(n)));
        break;
      case 12:
        if (n & 2048) {
          Zt(
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
          } catch (v) {
            yl(t, t.return, v);
          }
        } else
          Zt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Zt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Zt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && oi(c), i._visibility & 2 ? Zt(
          l,
          t,
          a,
          u
        ) : Ke(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && oi(t), i._visibility & 2 ? Zt(
          l,
          t,
          a,
          u
        ) : (i._visibility |= 2, $u(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Mf(c, t);
        break;
      case 24:
        Zt(
          l,
          t,
          a,
          u
        ), n & 2048 && Uf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (ea(n.child, !0), ea(t.child, !0))), Zt(
          l,
          t,
          a,
          u
        );
        break;
      default:
        Zt(
          l,
          t,
          a,
          u
        );
    }
  }
  function $u(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, f = u, v = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          $u(
            n,
            i,
            c,
            f,
            e
          ), Ze(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? $u(
            n,
            i,
            c,
            f,
            e
          ) : Ke(
            n,
            i
          ) : (g._visibility |= 2, $u(
            n,
            i,
            c,
            f,
            e
          )), e && v & 2048 && Mf(
            i.alternate,
            i
          );
          break;
        case 24:
          $u(
            n,
            i,
            c,
            f,
            e
          ), e && v & 2048 && Uf(i.alternate, i);
          break;
        default:
          $u(
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
  function Ke(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            Ke(a, u), e & 2048 && Mf(
              u.alternate,
              u
            );
            break;
          case 24:
            Ke(a, u), e & 2048 && Uf(u.alternate, u);
            break;
          default:
            Ke(a, u);
        }
        t = t.sibling;
      }
  }
  var Su = 8192;
  function bu(l, t, a) {
    if (l.subtreeFlags & Su)
      for (l = l.child; l !== null; )
        Cd(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function Cd(l, t, a) {
    switch (l.tag) {
      case 26:
        bu(
          l,
          t,
          a
        ), l.flags & Su && (l.memoizedState !== null ? $y(
          a,
          Ft,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && qm(a, l)));
        break;
      case 5:
        bu(
          l,
          t,
          a
        ), l.flags & Su && (l = l.stateNode, (t & 335544128) === t && qm(a, l));
        break;
      case 3:
      case 4:
        var u = Ft;
        Ft = Pe(l.stateNode.containerInfo), bu(
          l,
          t,
          a
        ), Ft = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = Su, Su = 16777216, bu(
          l,
          t,
          a
        ), Su = u) : bu(
          l,
          t,
          a
        ));
        break;
      case 30:
        if ((l.flags & Su) !== 0 && (u = l.memoizedProps.name, u != null && u !== "auto")) {
          var e = l.stateNode;
          e.paired = null, Mt === null && (Mt = /* @__PURE__ */ new Map()), Mt.set(u, e);
        }
        bu(
          l,
          t,
          a
        );
        break;
      default:
        bu(
          l,
          t,
          a
        );
    }
  }
  function Rd(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Je(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          wl = u, jd(
            u,
            l
          );
        }
      Rd(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        pd(l), l = l.sibling;
  }
  function pd(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Je(l), l.flags & 2048 && Qa(9, l, l.return);
        break;
      case 3:
        Je(l);
        break;
      case 12:
        Je(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, vi(l)) : Je(l);
        break;
      default:
        Je(l);
    }
  }
  function vi(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          wl = u, jd(
            u,
            l
          );
        }
      Rd(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          Qa(8, t, t.return), vi(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, vi(t));
          break;
        default:
          vi(t);
      }
      l = l.sibling;
    }
  }
  function jd(l, t) {
    for (; wl !== null; ) {
      var a = wl;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Qa(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          Ue(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, wl = u;
      else
        l: for (a = l; wl !== null; ) {
          u = wl;
          var e = u.sibling, n = u.return;
          if (zd(u), u === a) {
            wl = null;
            break l;
          }
          if (e !== null) {
            e.return = n, wl = e;
            break l;
          }
          wl = n;
        }
    }
  }
  var Vr = {
    getCacheForType: function(l) {
      var t = Il(Bl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Il(Bl).controller.signal;
    }
  }, Lr = typeof WeakMap == "function" ? WeakMap : Map, dl = 0, El = null, I = null, P = 0, rl = 0, Ut = null, Va = !1, Fu = !1, Cf = !1, Oa = 0, pl = 0, La = 0, Tu = 0, ri = 0, Ct = 0, Wu = 0, we = null, gt = null, Rf = !1, yi = 0, Hd = 0, hi = 1 / 0, gi = null, Ka = null, Ul = 0, It = null, Eu = null, fa = 0, pf = 0, jf = null, xd = null, Iu = null, ku = null, Pu = null, $e = 0, Si = null;
  function Rt() {
    return (dl & 2) !== 0 && P !== 0 ? P & -P : U.T !== null ? Vf() : Yo();
  }
  function Bd() {
    if (Ct === 0)
      if ((P & 536870912) === 0 || W) {
        var l = mn;
        mn <<= 1, (mn & 3932160) === 0 && (mn = 262144), Ct = l;
      } else Ct = 536870912;
    return l = kl.current, l !== null && (l.flags |= 32), Ct;
  }
  function le(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = hm(
        ra(l.memoizedProps, a)
      )), ku === null && (ku = []), ku.push(t.bind(null, u));
    }
  }
  function St(l, t, a) {
    (l === El && (rl === 2 || rl === 9) || l.cancelPendingCommit !== null) && (te(l, 0), Ja(
      l,
      P,
      Ct,
      !1
    )), ye(l, a), ((dl & 2) === 0 || l !== El) && (l === El && ((dl & 2) === 0 && (Tu |= a), pl === 4 && Ja(
      l,
      P,
      Ct,
      !1
    )), oa(l));
  }
  function qd(l, t, a) {
    if ((dl & 6) !== 0) throw Error(y(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || re(l, t), e = u ? wr(l, t) : xf(l, t, !0), n = u;
    do {
      if (e === 0) {
        Fu && !u && Ja(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Kr(a)) {
          e = xf(l, t, !1), n = !1;
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
              e = we;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (te(c, i).flags |= 256), i = xf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Cf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Tu |= n, e = 4;
                  break l;
                }
                n = gt, gt = e, n !== null && (gt === null ? gt = n : gt.push.apply(
                  gt,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          te(l, 0), Ja(l, t, 0, !0);
          break;
        }
        l: {
          switch (u = l, n = e, n) {
            case 0:
            case 1:
              throw Error(y(345));
            case 4:
              if ((t & 4194048) !== t && (t & 62914560) !== t)
                break;
            case 6:
              Ja(
                u,
                t,
                Ct,
                !Va
              );
              break l;
            case 2:
              gt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(y(329));
          }
          if ((t & 62914560) === t && (e = yi + 300 - zt(), 10 < e)) {
            if (Ja(
              u,
              t,
              Ct,
              !Va
            ), rn(u, 0, !0) !== 0) break l;
            fa = t, u.timeoutHandle = lo(
              Yd.bind(
                null,
                u,
                a,
                gt,
                gi,
                Rf,
                t,
                Ct,
                Tu,
                Wu,
                Va,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          Yd(
            u,
            a,
            gt,
            gi,
            Rf,
            t,
            Ct,
            Tu,
            Wu,
            Va,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    oa(l);
  }
  function Yd(l, t, a, u, e, n, i, c, f, v, g, z, d, h) {
    l.timeoutHandle = -1;
    var N = t.subtreeFlags, M = (n & 335544064) === n;
    if (z = null, (M || N & 8192 || (N & 16785408) === 16785408) && (z = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Pt
    }, Mt = null, Cd(
      t,
      n,
      z
    ), M && (N = z, M = l.containerInfo, M = (M.nodeType === 9 ? M : M.ownerDocument).__reactViewTransition, M != null && (N.count++, N.waitingForViewTransition = !0, N = an.bind(N), M.finished.then(N, N))), N = (n & 62914560) === n ? yi - zt() : (n & 4194048) === n ? Hd - zt() : 0, N = Fy(
      z,
      N
    ), N !== null)) {
      fa = n, l.cancelPendingCommit = N(
        Jd.bind(
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
          v,
          g,
          z,
          null,
          d,
          h
        )
      ), Ja(l, n, i, !v);
      return;
    }
    Jd(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      c,
      f,
      v,
      g,
      z
    );
  }
  function Kr(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!At(n(), e)) return !1;
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
  function Ja(l, t, a, u) {
    t = jo(l, t), t &= ~ri, t &= ~Tu, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - Ot(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && xo(l, a, t);
  }
  function bi() {
    return (dl & 6) === 0 ? (Fe(0), !1) : !0;
  }
  function Hf() {
    if (I !== null) {
      if (rl === 0)
        var l = I.return;
      else
        l = I, Sa = fu = null, Qc(l), Qu = null, pe = 0, l = I;
      for (; l !== null; )
        cd(l.alternate, l), l = l.return;
      I = null;
    }
  }
  function te(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, yy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), fa = 0, Hf(), El = l, I = a = ha(l.current, null), P = t, rl = 0, Ut = null, Va = !1, Fu = re(l, t), Cf = !1, Wu = Ct = ri = Tu = La = pl = 0, gt = we = null, Rf = !1, Oa = jo(l, t), Dn(), a;
  }
  function Gd(l, t) {
    L = null, U.H = kn, t === Xu || t === Yn ? (t = Js(), rl = 3) : t === Mc ? (t = Js(), rl = 4) : rl = t === af ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Ut = t, I === null && (pl = 1, Pn(
      l,
      Yt(t, l.current)
    ));
  }
  function Xd() {
    var l = kl.current;
    return l === null ? !0 : (P & 4194048) === P ? et === null : (P & 62914560) === P || (P & 536870912) !== 0 ? l === et : !1;
  }
  function Qd() {
    var l = U.H;
    return U.H = kn, l === null ? kn : l;
  }
  function Zd() {
    var l = U.A;
    return U.A = Vr, l;
  }
  function Ti() {
    pl = 4, Va || (P & 4194048) !== P && kl.current !== null || (Fu = !0), (La & 134217727) === 0 && (Tu & 134217727) === 0 || El === null || Ja(
      El,
      P,
      Ct,
      !1
    );
  }
  function xf(l, t, a) {
    var u = dl;
    dl |= 2;
    var e = Qd(), n = Zd();
    (El !== l || P !== t) && (gi = null, te(l, t)), t = !1;
    var i = pl;
    l: do
      try {
        if (rl !== 0 && I !== null) {
          var c = I, f = Ut;
          switch (rl) {
            case 8:
              Hf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              kl.current === null && (t = !0);
              var v = rl;
              if (rl = 0, Ut = null, ae(l, c, f, v), a && Fu) {
                i = 0;
                break l;
              }
              break;
            default:
              v = rl, rl = 0, Ut = null, ae(l, c, f, v);
          }
        }
        Jr(), i = pl;
        break;
      } catch (g) {
        Gd(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Sa = fu = null, dl = u, U.H = e, U.A = n, I === null && (El = null, P = 0, Dn()), i;
  }
  function Jr() {
    for (; I !== null; ) Vd(I);
  }
  function wr(l, t) {
    var a = dl;
    dl |= 2;
    var u = Qd(), e = Zd();
    El !== l || P !== t ? (gi = null, hi = zt() + 500, te(l, t)) : Fu = re(
      l,
      t
    );
    l: do
      try {
        if (rl !== 0 && I !== null) {
          t = I;
          var n = Ut;
          t: switch (rl) {
            case 1:
              rl = 0, Ut = null, ae(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Ls(n)) {
                rl = 0, Ut = null, Ld(t);
                break;
              }
              t = function() {
                rl !== 2 && rl !== 9 || El !== l || (rl = 7), oa(l);
              }, n.then(t, t);
              break l;
            case 3:
              rl = 7;
              break l;
            case 4:
              rl = 5;
              break l;
            case 7:
              Ls(n) ? (rl = 0, Ut = null, Ld(t)) : (rl = 0, Ut = null, ae(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (I.tag) {
                case 26:
                  i = I.memoizedState;
                case 5:
                case 27:
                  var c = I;
                  if (i ? xm(i) : c.stateNode.complete) {
                    rl = 0, Ut = null;
                    var f = c.sibling;
                    if (f !== null) I = f;
                    else {
                      var v = c.return;
                      v !== null ? (I = v, Ei(v)) : I = null;
                    }
                    break t;
                  }
              }
              rl = 0, Ut = null, ae(l, t, n, 5);
              break;
            case 6:
              rl = 0, Ut = null, ae(l, t, n, 6);
              break;
            case 8:
              Hf(), pl = 6;
              break l;
            default:
              throw Error(y(462));
          }
        }
        $r();
        break;
      } catch (g) {
        Gd(l, g);
      }
    while (!0);
    return Sa = fu = null, U.H = u, U.A = e, dl = a, I !== null ? 0 : (El = null, P = 0, Dn(), pl);
  }
  function $r() {
    for (; I !== null && !dv(); )
      Vd(I);
  }
  function Vd(l) {
    var t = nd(l.alternate, l, Oa);
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : I = t;
  }
  function Ld(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = k0(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          P
        );
        break;
      case 11:
        t = k0(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          P
        );
        break;
      case 5:
        Qc(t);
        var u = t;
        u === Kl && (W ? (jn(u), u.tag === 5 && u.stateNode != null && (_l = u.stateNode)) : (jn(u), W = !0));
      default:
        cd(a, t), t = I = js(t, Oa), t = nd(a, t, Oa);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : I = t;
  }
  function ae(l, t, a, u) {
    Sa = fu = null, Qc(t), Qu = null, pe = 0;
    var e = t.return;
    try {
      if (xr(
        l,
        e,
        t,
        a,
        P
      )) {
        pl = 1, Pn(
          l,
          Yt(a, l.current)
        ), I = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw I = e, n;
      pl = 1, Pn(
        l,
        Yt(a, l.current)
      ), I = null;
      return;
    }
    t.flags & 32768 ? (W || u === 1 ? l = !0 : Fu || (P & 536870912) !== 0 ? l = !1 : (Va = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = kl.current, u !== null && u.tag === 13 && (u.flags |= 16384))), Kd(t, l)) : Ei(t);
  }
  function Ei(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        Kd(
          t,
          Va
        );
        return;
      }
      l = t.return;
      var a = Gr(
        t.alternate,
        t,
        Oa
      );
      if (a !== null) {
        I = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        I = t;
        return;
      }
      I = t = l;
    } while (t !== null);
    pl === 0 && (pl = 5);
  }
  function Kd(l, t) {
    do {
      var a = Xr(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, I = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        I = l;
        return;
      }
      I = l = a;
    } while (l !== null);
    pl = 6, I = null;
  }
  function Jd(l, t, a, u, e, n, i, c, f, v, g, z) {
    l.cancelPendingCommit = null;
    do
      zi();
    while (Ul !== 0);
    if ((dl & 6) !== 0) throw Error(y(327));
    if (t !== null) {
      if (t === l.current) throw Error(y(177));
      l === El && (I = El = null, P = 0), Eu = t, It = l, fa = a, jf = e, xd = u, Fr(
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
  function Fr(l, t, a, u, e, n, i) {
    var c = t.lanes | t.childLanes;
    if (pf = c, c |= yc, Ev(
      l,
      a,
      c,
      u,
      e,
      n
    ), ku = null, (a & 335544064) === a ? (Pu = _r(l), u = 10262) : (Pu = null, u = 10256), (t.subtreeFlags & u) !== 0 || (t.flags & u) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ty(sn, function() {
      return Gf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), ci = !1, u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
      u = U.T, U.T = null, e = Y.p, Y.p = 2, n = dl, dl |= 4;
      try {
        Qr(l, t, a);
      } finally {
        dl = n, Y.p = e, U.T = u;
      }
    }
    Ul = 1, ci ? Iu = Ey(
      i,
      l.containerInfo,
      Pu,
      Bf,
      qf,
      Ir,
      Yf,
      Gf,
      Wr
    ) : (Bf(), qf(), Yf());
  }
  function Wr(l) {
    if (Ul !== 0) {
      var t = It.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function Ir() {
    Ul === 3 && (Ul = 0, Md(Eu, It), Ul = 4);
  }
  function Bf() {
    if (Ul === 1) {
      Ul = 0;
      var l = It, t = Eu, a = fa, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = U.T, U.T = null;
        var e = Y.p;
        Y.p = 2;
        var n = dl;
        dl |= 4;
        try {
          Le = si = !1, Ad(t, l, a), a = If;
          var i = _s(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && zs(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && sc(c)) {
              var v = f.start, g = f.end;
              if (g === void 0 && (g = v), "selectionStart" in c)
                c.selectionStart = v, c.selectionEnd = Math.min(
                  g,
                  c.value.length
                );
              else {
                var z = c.ownerDocument || document, d = z && z.defaultView || window;
                if (d.getSelection) {
                  var h = d.getSelection(), N = c.textContent.length, M = Math.min(f.start, N), K = f.end === void 0 ? M : Math.min(f.end, N);
                  !h.extend && M > K && (i = K, K = M, M = i);
                  var m = Es(
                    c,
                    M
                  ), o = Es(
                    c,
                    K
                  );
                  if (m && o && (h.rangeCount !== 1 || h.anchorNode !== m.node || h.anchorOffset !== m.offset || h.focusNode !== o.node || h.focusOffset !== o.offset)) {
                    var r = z.createRange();
                    r.setStart(m.node, m.offset), h.removeAllRanges(), M > K ? (h.addRange(r), h.extend(o.node, o.offset)) : (r.setEnd(o.node, o.offset), h.addRange(r));
                  }
                }
              }
            }
            for (z = [], h = c; h = h.parentNode; )
              h.nodeType === 1 && z.push({
                element: h,
                left: h.scrollLeft,
                top: h.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < z.length; c++) {
              var E = z[c];
              E.element.scrollLeft = E.left, E.element.scrollTop = E.top;
            }
          }
          se = !!Wf, If = Wf = null;
        } finally {
          dl = n, Y.p = e, U.T = u;
        }
      }
      l.current = t, Ul = 2;
    }
  }
  function qf() {
    if (Ul === 2) {
      Ul = 0;
      var l = It, t = Eu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = U.T, U.T = null;
        var u = Y.p;
        Y.p = 2;
        var e = dl;
        dl |= 4;
        try {
          Td(l, t.alternate, t);
        } finally {
          dl = e, Y.p = u, U.T = a;
        }
      }
      Ul = 3;
    }
  }
  function Yf() {
    if (Ul === 4 || Ul === 3) {
      Ul = 0;
      var l = Iu;
      Iu = null, mv();
      var t = It, a = Eu, u = fa, e = xd, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Ul = 5 : (Ul = 0, Eu = It = null, wd(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (Ka = null), Ji(u), a = a.stateNode, _t && typeof _t.onCommitFiberRoot == "function")
        try {
          _t.onCommitFiberRoot(
            ve,
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
      if (e = ku, i = Pu, Pu = null, e !== null && (ku = null, i === null && (i = []), l !== null))
        for (f = 0; f < e.length; f++)
          a = (0, e[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (fa & 3) !== 0 && zi(), oa(t), n = t.pendingLanes, (u & 261930) !== 0 && (n & 42) !== 0 ? t === Si ? $e++ : ($e = 0, Si = t) : ($e = 0, Si = null), Fe(0);
    }
  }
  function wd(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Ue(t)));
  }
  function zi() {
    return Iu !== null && (Iu.skipTransition(), Iu = null), Bf(), qf(), Yf(), Gf();
  }
  function Gf() {
    if (Ul !== 5) return !1;
    var l = It, t = pf;
    pf = 0;
    var a = Ji(fa), u = U.T, e = Y.p;
    try {
      Y.p = 32 > a ? 32 : a, U.T = null, a = jf, jf = null;
      var n = It, i = fa;
      if (Ul = 0, Eu = It = null, fa = 0, (dl & 6) !== 0) throw Error(y(331));
      var c = dl;
      if (dl |= 4, pd(n.current), Ud(
        n,
        n.current,
        i,
        a
      ), dl = c, Fe(0, !1), _t && typeof _t.onPostCommitFiberRoot == "function")
        try {
          _t.onPostCommitFiberRoot(ve, n);
        } catch {
        }
      return !0;
    } finally {
      Y.p = e, U.T = u, wd(l, t);
    }
  }
  function $d(l, t, a) {
    t = Yt(a, t), t = tf(l.stateNode, t, 2), l = qa(l, t, 2), l !== null && (ye(l, 2), oa(l));
  }
  function yl(l, t, a) {
    if (l.tag === 3)
      $d(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          $d(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Ka === null || !Ka.has(u))) {
            l = Yt(a, l), a = L0(2), u = qa(t, a, 2), u !== null && (K0(
              a,
              u,
              t,
              l
            ), ye(u, 2), oa(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Xf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new Lr();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (Cf = !0, e.add(a), l = kr.bind(null, l, t, a), t.then(l, l));
  }
  function kr(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, El === l && (P & a) === a && ((pl === 4 || pl === 3 && (P & 62914560) === P && 300 > zt() - yi) && (dl & 2) === 0 ? te(l, 0) : ri |= a, Wu === P && (Wu = 0)), oa(l);
  }
  function Fd(l, t) {
    t === 0 && (t = Ho()), l = nu(l, t), l !== null && (ye(l, t), oa(l));
  }
  function Pr(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), Fd(l, a);
  }
  function ly(l, t) {
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
        throw Error(y(314));
    }
    u !== null && u.delete(t), Fd(l, a);
  }
  function ty(l, t) {
    return Zi(l, t);
  }
  var ue = null, ee = null, Qf = !1, _i = !1, Zf = !1, wa = 0;
  function oa(l) {
    l !== ee && l.next === null && (ee === null ? ue = ee = l : ee = ee.next = l), _i = !0, Qf || (Qf = !0, uy());
  }
  function Fe(l, t) {
    if (!Zf && _i) {
      Zf = !0;
      do
        for (var a = !1, u = ue; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - Ot(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, Pd(u, n));
          } else
            n = P, n = rn(
              u,
              u === El ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || re(u, n) || (a = !0, Pd(u, n));
          u = u.next;
        }
      while (a);
      Zf = !1;
    }
  }
  function ay() {
    Wd();
  }
  function Wd() {
    _i = Qf = !1;
    var l = 0;
    wa !== 0 && ry() && (l = wa);
    for (var t = zt(), a = null, u = ue; u !== null; ) {
      var e = u.next, n = Id(u, t);
      n === 0 ? (u.next = null, a === null ? ue = e : a.next = e, e === null && (ee = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (_i = !0)), u = e;
    }
    Ul !== 0 && Ul !== 5 || Fe(l), wa !== 0 && (wa = 0);
  }
  function Id(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Ot(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = Tv(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = El, a = P, a = rn(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (rl === 2 || rl === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Vi(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || re(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Vi(u), Ji(a)) {
        case 2:
        case 8:
          a = Ro;
          break;
        case 32:
          a = sn;
          break;
        case 268435456:
          a = po;
          break;
        default:
          a = sn;
      }
      return u = kd.bind(null, l), a = Zi(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Vi(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function kd(l, t) {
    if (Ul !== 0 && Ul !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (zi() && l.callbackNode !== a)
      return null;
    var u = P;
    return u = rn(
      l,
      l === El ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (qd(l, u, t), Id(l, zt()), l.callbackNode != null && l.callbackNode === a ? kd.bind(null, l) : null);
  }
  function Pd(l, t) {
    if (zi()) return null;
    qd(l, t, !0);
  }
  function uy() {
    hy(function() {
      (dl & 6) !== 0 ? Zi(
        Co,
        ay
      ) : Wd();
    });
  }
  function Vf() {
    if (wa === 0) {
      var l = du;
      l === 0 && (l = dn, dn <<= 1, (dn & 261888) === 0 && (dn = 256)), wa = l;
    }
    return wa;
  }
  function lm(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : bn(l);
  }
  function ey(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = lm(
        (e[vt] || null).action
      ), i = u.submitter;
      i && (t = (t = i[vt] || null) ? lm(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new _n(
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
                if (wa !== 0) {
                  var f = new FormData(e, i);
                  Wc(
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
                typeof n == "function" && (c.preventDefault(), f = new FormData(e, i), Wc(
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
  for (var Lf = 0; Lf < rc.length; Lf++) {
    var Kf = rc[Lf], ny = Kf.toLowerCase(), iy = Kf[0].toUpperCase() + Kf.slice(1);
    wt(
      ny,
      "on" + iy
    );
  }
  wt(As, "onAnimationEnd"), wt(Ds, "onAnimationIteration"), wt(Ms, "onAnimationStart"), wt("dblclick", "onDoubleClick"), wt("focusin", "onFocus"), wt("focusout", "onBlur"), wt(yr, "onTransitionRun"), wt(hr, "onTransitionStart"), wt(gr, "onTransitionCancel"), wt(Us, "onTransitionEnd"), Au("onMouseEnter", ["mouseout", "mouseover"]), Au("onMouseLeave", ["mouseout", "mouseover"]), Au("onPointerEnter", ["pointerout", "pointerover"]), Au("onPointerLeave", ["pointerout", "pointerover"]), au(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), au(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), au("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), au(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), au(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), au(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var We = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), cy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(We)
  );
  function tm(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var c = u[i], f = c.instance, v = c.currentTarget;
            if (c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = v;
            try {
              n(e);
            } catch (g) {
              An(g);
            }
            e.currentTarget = null, n = f;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (c = u[i], f = c.instance, v = c.currentTarget, c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = v;
            try {
              n(e);
            } catch (g) {
              An(g);
            }
            e.currentTarget = null, n = f;
          }
      }
    }
  }
  function k(l, t) {
    var a = t[Xo];
    a === void 0 && (a = t[Xo] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (am(t, l, 2, !1), a.add(u));
  }
  function Jf(l, t, a) {
    var u = 0;
    t && (u |= 4), am(
      a,
      l,
      u,
      t
    );
  }
  var Oi = "_reactListening" + Math.random().toString(36).slice(2);
  function wf(l) {
    if (!l[Oi]) {
      l[Oi] = !0, Vo.forEach(function(a) {
        a !== "selectionchange" && (cy.has(a) || Jf(a, !1, l), Jf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Oi] || (t[Oi] = !0, Jf("selectionchange", !1, t));
    }
  }
  function am(l, t, a, u) {
    switch (Km(t)) {
      case 2:
        var e = Py;
        break;
      case 8:
        e = lh;
        break;
      default:
        e = ro;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !lc || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function $f(l, t, a, u, e) {
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
            if (i = tu(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              u = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        u = u.return;
      }
    as(function() {
      var v = n, g = ki(a), z = [];
      l: {
        var d = Cs.get(l);
        if (d !== void 0) {
          var h = _n, N = l;
          switch (l) {
            case "keypress":
              if (En(a) === 0) break l;
            case "keydown":
            case "keyup":
              h = Kv;
              break;
            case "focusin":
              N = "focus", h = ec;
              break;
            case "focusout":
              N = "blur", h = ec;
              break;
            case "beforeblur":
            case "afterblur":
              h = ec;
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
              h = ns;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              h = jv;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              h = Wv;
              break;
            case As:
            case Ds:
            case Ms:
              h = Bv;
              break;
            case Us:
              h = kv;
              break;
            case "scroll":
            case "scrollend":
              h = Rv;
              break;
            case "wheel":
              h = lr;
              break;
            case "copy":
            case "cut":
            case "paste":
              h = Yv;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              h = cs;
              break;
            case "submit":
              h = $v;
              break;
            case "toggle":
            case "beforetoggle":
              h = ar;
          }
          var M = (t & 4) !== 0, K = !M && (l === "scroll" || l === "scrollend"), m = M ? d !== null ? d + "Capture" : null : d;
          M = [];
          for (var o = v, r; o !== null; ) {
            var E = o;
            if (r = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || r === null || m === null || (E = Se(o, m), E != null && M.push(
              Ie(o, E, r)
            )), K) break;
            o = o.return;
          }
          0 < M.length && (d = new h(
            d,
            N,
            null,
            a,
            g
          ), z.push({ event: d, listeners: M }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (h = l === "mouseover" || l === "pointerover", d = l === "mouseout" || l === "pointerout", h && a !== Ii && (N = a.relatedTarget || a.fromElement) && (tu(N) || N[_u]))
            break l;
          (d || h) && (N = g.window === g ? g : (h = g.ownerDocument) ? h.defaultView || h.parentWindow : window, d ? (h = a.relatedTarget || a.toElement, d = v, h = h ? tu(h) : null, h !== null && (K = al(h), M = h.tag, h !== K || M !== 5 && M !== 27 && M !== 6) && (h = null)) : (d = null, h = v), d !== h && (M = ns, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (M = cs, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), K = d == null ? N : ge(d), r = h == null ? N : ge(h), N = new M(
            E,
            o + "leave",
            d,
            a,
            g
          ), N.target = K, N.relatedTarget = r, E = null, tu(g) === v && (M = new M(
            m,
            o + "enter",
            h,
            a,
            g
          ), M.target = r, M.relatedTarget = K, E = M), K = E, M = d && h ? xl(
            d,
            h,
            fy
          ) : null, d !== null && um(
            z,
            N,
            d,
            M,
            !1
          ), h !== null && K !== null && um(
            z,
            K,
            h,
            M,
            !0
          )));
        }
        l: {
          if (d = v ? ge(v) : window, h = d.nodeName && d.nodeName.toLowerCase(), h === "select" || h === "input" && d.type === "file")
            var D = ys;
          else if (vs(d))
            if (hs)
              D = mr;
            else {
              D = sr;
              var ll = or;
            }
          else
            h = d.nodeName, !h || h.toLowerCase() !== "input" || d.type !== "checkbox" && d.type !== "radio" ? v && Wi(v.elementType) && (D = ys) : D = dr;
          if (D && (D = D(l, v))) {
            rs(
              z,
              D,
              a,
              g
            );
            break l;
          }
          ll && ll(l, d, v);
        }
        switch (ll = v ? ge(v) : window, l) {
          case "focusin":
            (vs(ll) || ll.contentEditable === "true") && (pu = ll, dc = v, Ae = null);
            break;
          case "focusout":
            Ae = dc = pu = null;
            break;
          case "mousedown":
            mc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mc = !1, Os(z, a, g);
            break;
          case "selectionchange":
            if (rr) break;
          case "keydown":
          case "keyup":
            Os(z, a, g);
        }
        var p;
        if (ic)
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
          Ru ? ds(l, a) && (q = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (q = "onCompositionStart");
        q && (fs && a.locale !== "ko" && (Ru || q !== "onCompositionStart" ? q === "onCompositionEnd" && Ru && (p = us()) : (Ma = g, tc = "value" in Ma ? Ma.value : Ma.textContent, Ru = !0)), ll = Ni(v, q), 0 < ll.length && (q = new is(
          q,
          l,
          null,
          a,
          g
        ), z.push({ event: q, listeners: ll }), p ? q.data = p : (p = ms(a), p !== null && (q.data = p)))), (p = er ? nr(l, a) : ir(l, a)) && (q = Ni(v, "onBeforeInput"), 0 < q.length && (ll = new is(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), z.push({
          event: ll,
          listeners: q
        }), ll.data = p)), ey(
          z,
          l,
          v,
          a,
          g
        );
      }
      tm(z, t);
    });
  }
  function Ie(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Ni(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = Se(l, a), e != null && u.unshift(
        Ie(l, e, n)
      ), e = Se(l, t), e != null && u.push(
        Ie(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function fy(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function um(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, f = c.alternate, v = c.stateNode;
      if (c = c.tag, f !== null && f === u) break;
      c !== 5 && c !== 26 && c !== 27 || v === null || (f = v, e ? (v = Se(a, n), v != null && i.unshift(
        Ie(a, v, f)
      )) : e || (v = Se(a, n), v != null && i.push(
        Ie(a, v, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var oy = /\r\n?/g, sy = /\u0000|\uFFFD/g;
  function em(l) {
    return (typeof l == "string" ? l : "" + l).replace(oy, `
`).replace(sy, "");
  }
  function nm(l, t) {
    return t = em(t), em(l) === t;
  }
  function hl(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        if (typeof u == "string")
          t === "body" || t === "textarea" && u === "" || Mu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          t !== "body" && Mu(l, "" + u);
        else return;
        break;
      case "className":
        Sn(l, "class", u);
        break;
      case "tabIndex":
        Sn(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Sn(l, a, u);
        break;
      case "style":
        ls(l, u, n);
        return;
      case "data":
        if (t !== "object") {
          Sn(l, "data", u);
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
        u = bn(u), l.setAttribute(a, u);
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
          typeof n == "function" && (a === "formAction" ? (t !== "input" && hl(l, t, "name", e.name, e, null), hl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), hl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), hl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (hl(l, t, "encType", e.encType, e, null), hl(l, t, "method", e.method, e, null), hl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = bn(u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = Pt);
        return;
      case "onScroll":
        u != null && k("scroll", l);
        return;
      case "onScrollEnd":
        u != null && k("scrollend", l);
        return;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(y(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(y(60));
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
        a = bn(u), l.setAttributeNS(
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
        k("beforetoggle", l), k("toggle", l), gn(l, "popover", u);
        break;
      case "xlinkActuate":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        ma(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        ma(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        ma(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        ma(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        gn(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = Uv.get(a) || a, gn(l, a, u);
        else return;
    }
    sl = !0;
  }
  function Ff(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        ls(l, u, n);
        return;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(y(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(y(60));
            n?.__html !== a && (l.innerHTML = a);
          }
        }
        break;
      case "children":
        if (typeof u == "string") Mu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          Mu(l, "" + u);
        else return;
        break;
      case "onScroll":
        u != null && k("scroll", l);
        return;
      case "onScrollEnd":
        u != null && k("scrollend", l);
        return;
      case "onClick":
        u != null && (l.onclick = Pt);
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
        if (!Lo.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[vt] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            sl = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : gn(l, a, u);
          }
        return;
    }
    sl = !0;
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
        k("error", l), k("load", l);
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
                  throw Error(y(137, t));
                default:
                  hl(l, t, n, i, a, null);
              }
          }
        e && hl(l, t, "srcSet", a.srcSet, a, null), u && hl(l, t, "src", a.src, a, null);
        return;
      case "input":
        k("invalid", l);
        var c = n = i = e = null, f = null, v = null;
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
                  v = g;
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
                    throw Error(y(137, t));
                  break;
                default:
                  hl(l, t, u, g, a, null);
              }
          }
        Wo(
          l,
          n,
          c,
          f,
          v,
          i,
          e,
          !1
        );
        return;
      case "select":
        k("invalid", l), u = i = n = null;
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
                hl(l, t, e, c, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? Du(l, !!u, t, !1) : a != null && Du(l, !!u, a, !0);
        return;
      case "textarea":
        k("invalid", l), n = e = u = null;
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
                if (c != null) throw Error(y(91));
                break;
              default:
                hl(l, t, i, c, a, null);
            }
        ko(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : hl(l, t, f, u, a, null));
        return;
      case "dialog":
        k("beforetoggle", l), k("toggle", l), k("cancel", l), k("close", l);
        break;
      case "iframe":
      case "object":
        k("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < We.length; u++)
          k(We[u], l);
        break;
      case "image":
        k("error", l), k("load", l);
        break;
      case "details":
        k("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        k("error", l), k("load", l);
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
          if (a.hasOwnProperty(v) && (u = a[v], u != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(y(137, t));
              default:
                hl(l, t, v, u, a, null);
            }
        return;
      default:
        if (Wi(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && Ff(
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
      a.hasOwnProperty(c) && (u = a[c], u != null && hl(l, t, c, u, a, null));
  }
  var dy = {};
  function my(l, t, a, u) {
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
        var e = null, n = null, i = null, c = null, f = null, v = null, g = null;
        for (h in a) {
          var z = a[h];
          if (a.hasOwnProperty(h) && z != null)
            switch (h) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                f = z;
              default:
                u.hasOwnProperty(h) || hl(l, t, h, null, u, z);
            }
        }
        for (var d in u) {
          var h = u[d];
          if (z = a[d], u.hasOwnProperty(d) && (h != null || z != null))
            switch (d) {
              case "type":
                h !== z && (sl = !0), n = h;
                break;
              case "name":
                h !== z && (sl = !0), e = h;
                break;
              case "checked":
                h !== z && (sl = !0), v = h;
                break;
              case "defaultChecked":
                h !== z && (sl = !0), g = h;
                break;
              case "value":
                h !== z && (sl = !0), i = h;
                break;
              case "defaultValue":
                h !== z && (sl = !0), c = h;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (h != null)
                  throw Error(y(137, t));
                break;
              default:
                h !== z && hl(
                  l,
                  t,
                  d,
                  h,
                  u,
                  z
                );
            }
        }
        $i(
          l,
          i,
          c,
          f,
          v,
          g,
          n,
          e
        );
        return;
      case "select":
        h = i = c = d = null;
        for (n in a)
          if (f = a[n], a.hasOwnProperty(n) && f != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                h = f;
              default:
                u.hasOwnProperty(n) || hl(
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
                n !== f && (sl = !0), d = n;
                break;
              case "defaultValue":
                n !== f && (sl = !0), c = n;
                break;
              case "multiple":
                n !== f && (sl = !0), i = n;
              default:
                n !== f && hl(
                  l,
                  t,
                  e,
                  n,
                  u,
                  f
                );
            }
        t = c, a = i, u = h, d != null ? Du(l, !!a, d, !1) : !!u != !!a && (t != null ? Du(l, !!a, t, !0) : Du(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        h = d = null;
        for (c in a)
          if (e = a[c], a.hasOwnProperty(c) && e != null && !u.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                hl(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (sl = !0), d = e;
                break;
              case "defaultValue":
                e !== n && (sl = !0), h = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(y(91));
                break;
              default:
                e !== n && hl(l, t, i, e, u, n);
            }
        Io(l, d, h);
        return;
      case "option":
        for (var N in a)
          d = a[N], a.hasOwnProperty(N) && d != null && !u.hasOwnProperty(N) && (N === "selected" ? l.selected = !1 : hl(
            l,
            t,
            N,
            null,
            u,
            d
          ));
        for (f in u)
          d = u[f], h = a[f], u.hasOwnProperty(f) && d !== h && (d != null || h != null) && (f === "selected" ? (d !== h && (sl = !0), l.selected = d && typeof d != "function" && typeof d != "symbol") : hl(
            l,
            t,
            f,
            d,
            u,
            h
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
        for (var M in a)
          d = a[M], a.hasOwnProperty(M) && d != null && !u.hasOwnProperty(M) && hl(l, t, M, null, u, d);
        for (v in u)
          if (d = u[v], h = a[v], u.hasOwnProperty(v) && d !== h && (d != null || h != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (d != null)
                  throw Error(y(137, t));
                break;
              default:
                hl(
                  l,
                  t,
                  v,
                  d,
                  u,
                  h
                );
            }
        return;
      default:
        if (Wi(t)) {
          for (var K in a)
            d = a[K], a.hasOwnProperty(K) && d !== void 0 && !u.hasOwnProperty(K) && Ff(
              l,
              t,
              K,
              void 0,
              u,
              d
            );
          for (g in u)
            d = u[g], h = a[g], !u.hasOwnProperty(g) || d === h || d === void 0 && h === void 0 || Ff(
              l,
              t,
              g,
              d,
              u,
              h
            );
          return;
        }
    }
    for (var m in a)
      d = a[m], a.hasOwnProperty(m) && d != null && !u.hasOwnProperty(m) && hl(l, t, m, null, u, d);
    for (z in u)
      d = u[z], h = a[z], !u.hasOwnProperty(z) || d === h || d == null && h == null || hl(l, t, z, d, u, h);
  }
  function im(l) {
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
        if (n && c && im(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var f = a[u], v = f.startTime;
            if (v > c) break;
            var g = f.transferSize, z = f.initiatorType;
            g && im(z) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - v) / (f - v)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Wf = null, If = null;
  function ke(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function cm(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function fm(l, t) {
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
  function om(l, t, a, u) {
    return a = ke(
      a
    ).createElement(l), a[Wl] = u, a[vt] = t, tt(a, l, t), Ll(a), a;
  }
  function kf(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Pf = null;
  function ry() {
    var l = window.event;
    return l && l.type === "popstate" ? l === Pf ? !1 : (Pf = l, !0) : (Pf = null, !1);
  }
  var lo = typeof setTimeout == "function" ? setTimeout : void 0, yy = typeof clearTimeout == "function" ? clearTimeout : void 0, sm = typeof Promise == "function" ? Promise : void 0, dm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : lo, hy = typeof queueMicrotask == "function" ? queueMicrotask : typeof sm < "u" ? function(l) {
    return sm.resolve(null).then(l).catch(gy);
  } : lo;
  function gy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function $a(l) {
    return l === "head";
  }
  function mm(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), de(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          fo(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, fo(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[he] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && fo(l.ownerDocument.body);
      a = e;
    } while (a);
    de(t);
  }
  function vm(l, t) {
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
  function rm(l, t, a) {
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
  function ym(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function Sy(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function to(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return Sy(t, a, l);
  }
  function by(l) {
    return l.documentElement.clientHeight;
  }
  function Ty(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function Ey(l, t, a, u, e, n, i, c, f) {
    var v = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = v.startViewTransition({
        update: function() {
          var d = v.defaultView, h = d.navigation && d.navigation.transition, N = v.fonts.status;
          u();
          var M = [];
          if (N === "loaded" && (by(v), v.fonts.status === "loading" && M.push(v.fonts.ready)), N = M.length, l !== null)
            for (var K = l.suspenseyImages, m = 0, o = 0; o < K.length; o++) {
              var r = K[o];
              if (!r.complete) {
                var E = r.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < d.innerHeight && E.left < d.innerWidth) {
                  if (m += Bm(r), m > Mi) {
                    M.length = N;
                    break;
                  }
                  r = new Promise(
                    Ty.bind(r)
                  ), M.push(r);
                }
              }
            }
          if (0 < M.length)
            return d = Promise.race([
              Promise.all(M),
              new Promise(function(D) {
                return setTimeout(D, 500);
              })
            ]).then(e, e), (h ? Promise.allSettled([h.finished, d]) : d).then(n, n);
          if (e(), h)
            return h.finished.then(
              n,
              n
            );
          n();
        },
        types: a
      });
      v.__reactViewTransition = g;
      var z = [];
      return g.ready.then(
        function() {
          for (var d = v.documentElement.getAnimations({
            subtree: !0
          }), h = 0; h < d.length; h++) {
            var N = d[h], M = N.effect, K = M.pseudoElement;
            if (K != null && K.startsWith("::view-transition")) {
              z.push(N), N = M.getKeyframes();
              for (var m = K = void 0, o = !0, r = 0; r < N.length; r++) {
                var E = N[r], D = E.width;
                if (K === void 0) K = D;
                else if (K !== D) {
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
              o && K !== void 0 && m !== void 0 && (M.setKeyframes(N), o = getComputedStyle(
                M.target,
                M.pseudoElement
              ), o.width !== K || o.height !== m) && (o = N[0], o.width = K, o.height = m, o = N[N.length - 1], o.width = K, o.height = m, M.setKeyframes(N));
            }
          }
          i();
        },
        function(d) {
          v.__reactViewTransition === g && (v.__reactViewTransition = null);
          try {
            typeof d == "object" && d !== null && d.name === "InvalidStateError" && (d.message === "View transition was skipped because document visibility state is hidden." || d.message === "Skipping view transition because document visibility state has become hidden." || d.message === "Skipping view transition because viewport size changed." || d.message === "Transition was aborted because of invalid state") && (d = null), d !== null && f(d);
          } finally {
            u(), e(), i();
          }
        }
      ), g.finished.finally(function() {
        for (var d = 0; d < z.length; d++)
          z[d].cancel();
        v.__reactViewTransition === g && (v.__reactViewTransition = null), c();
      }), g;
    } catch {
      return u(), e(), i(), null;
    }
  }
  function zu(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  zu.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : J({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, zu.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), u = [], e = 0; e < a.length; e++) {
      var n = a[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && u.push(a[e]);
    }
    return u;
  }, zu.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function hm(l) {
    return {
      name: l,
      group: new zu("group", l),
      imagePair: new zu("image-pair", l),
      old: new zu("old", l),
      new: new zu("new", l)
    };
  }
  function pt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  pt.prototype.addEventListener = function(l, t, a) {
    var u = null, e = null;
    if (!(a != null && typeof a != "boolean" && (u = a.signal || null, u !== null && u.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Sm(n, l, t, a) === -1) {
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
        ), u.addEventListener("abort", e, { once: !0 }), e = u.removeEventListener.bind(u, "abort", e)), u = ne(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: e
        }), T(
          this._fragmentFiber.child,
          !1,
          zy,
          l,
          c,
          u
        );
      }
      this._eventListeners = n;
    }
  };
  function zy(l, t, a, u) {
    return w(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  pt.prototype.removeEventListener = function(l, t, a) {
    var u = this._eventListeners;
    if (u !== null && (t = Sm(
      u,
      l,
      t,
      a
    ), t !== -1)) {
      var e = u[t];
      a = e.attachedListener;
      var n = e.cleanup;
      e = ne(e.optionsOrUseCapture), T(
        this._fragmentFiber.child,
        !1,
        _y,
        l,
        a,
        e
      ), u.splice(t, 1), n !== null && n();
    }
  };
  function _y(l, t, a, u) {
    return w(l).removeEventListener(
      t,
      a,
      u
    ), !1;
  }
  function ne(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function gm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function Sm(l, t, a, u) {
    if (l.length === 0) return -1;
    u = gm(u);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === a && gm(n.optionsOrUseCapture) === u)
        return e;
    }
    return -1;
  }
  pt.prototype.dispatchEvent = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = w(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var u = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.addEventListener(
            n.type,
            n.attachedListener,
            ne(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(u), l = u.dispatchEvent(l), a)
        for (e = 0; e < a.length; e++)
          n = a[e], u.removeEventListener(
            n.type,
            n.attachedListener,
            ne(n.optionsOrUseCapture)
          );
      return t.removeChild(u), l;
    }
    return t.dispatchEvent(l);
  }, pt.prototype.focus = function(l) {
    T(
      this._fragmentFiber.child,
      !0,
      bm,
      l,
      void 0,
      void 0
    );
  };
  function bm(l, t) {
    return l.tag === 6 ? !1 : (l = w(l), xy(l, t));
  }
  pt.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      ao,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !bm(t[a], l); a--) ;
  };
  function ao(l, t) {
    return t.push(l), !1;
  }
  pt.prototype.blur = function() {
    var l = H(
      this._fragmentFiber
    );
    l !== null && (l = w(l), l = ke(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      Oy,
      l,
      void 0,
      void 0
    ));
  };
  function Oy(l, t) {
    return l.tag === 6 ? !1 : (l = w(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  pt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Ny,
      l,
      void 0,
      void 0
    );
  };
  function Ny(l, t) {
    return l.tag === 6 || (l = w(l), t.observe(l)), !1;
  }
  pt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), T(
        this._fragmentFiber.child,
        !1,
        Ay,
        l,
        void 0,
        void 0
      );
      for (var a = t = 0; a < kt.length; a++) {
        var u = kt[a];
        u.fragmentInstance === this && u.observer === l ? l.unobserve(u.instance) : kt[t++] = u;
      }
      kt.length = t;
    }
  };
  function Ay(l, t) {
    return l.tag === 6 || (l = w(l), t.unobserve(l)), !1;
  }
  var kt = [], uo = !1;
  function Dy(l, t, a) {
    kt.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), uo || (uo = !0, By(function() {
      uo = !1;
      var u = kt;
      kt = [];
      for (var e = 0; e < u.length; e++) {
        var n = u[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  pt.prototype.getClientRects = function() {
    var l = [];
    return T(
      this._fragmentFiber.child,
      !1,
      My,
      l,
      void 0,
      void 0
    ), l;
  };
  function My(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = w(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  pt.prototype.getRootNode = function(l) {
    var t = H(
      this._fragmentFiber
    );
    return t === null ? this : w(t).getRootNode(l);
  }, pt.prototype.compareDocumentPosition = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      ao,
      a,
      void 0,
      void 0
    );
    var u = w(t);
    if (a.length === 0) {
      if (a = u, X(this._fragmentFiber)) {
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
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = Nl(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = w(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = w(a[0]), e = w(a[a.length - 1]);
    var n = X(this._fragmentFiber) ? t.parentElement : u;
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
    var n = tu(e);
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
        for (n = t, t = H(t); n !== null; ) {
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = xl(
      a,
      n,
      jt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      Fl,
      n,
      a
    ), n = $l, $l = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = xl(
      u,
      n,
      jt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      st,
      n,
      u
    ), n = $l, ol = $l = null, t = n !== null)), t) : !1;
  }
  function Tm(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  pt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(y(566));
    var t = [];
    T(
      this._fragmentFiber.child,
      !1,
      ao,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var u = Nl(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || H(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = w(u), Tm(l, a);
        return;
      }
      if (u = w(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = w(e), Tm(e, a)) : w(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Cy(l, t) {
    return l = w(l), Em(l, t), !1;
  }
  function Em(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function zm(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.addEventListener(
          e.type,
          e.attachedListener,
          ne(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < kt.length; c++) {
        var f = kt[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && (kt[i++] = f);
      }
      kt.length = i, n.observe(l);
    }), Em(l, t));
  }
  function Ry(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.removeEventListener(
          e.type,
          e.attachedListener,
          ne(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      typeof n.rootMargin == "string" ? Dy(
        t,
        n,
        l
      ) : n.unobserve(l);
    }), l.reactFragments != null && l.reactFragments.delete(t));
  }
  function eo(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          eo(a), hn(a);
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
  function py(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[he])
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
      if (l = Vt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function jy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Vt(l.nextSibling), l === null)) return null;
    return l;
  }
  function _m(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Vt(l.nextSibling), l === null)) return null;
    return l;
  }
  function no(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function io(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function Hy(l, t) {
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
  function Vt(l) {
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
  var co = null;
  function Om(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Vt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Nm(l) {
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
  function xy(l, t) {
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
  function By(l) {
    dm(function() {
      dm(function(t) {
        return l(t);
      });
    });
  }
  function Am(l, t, a) {
    switch (t = ke(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(y(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(y(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(y(454));
        return l;
      default:
        throw Error(y(451));
    }
  }
  function Dm(l, t, a) {
    for (var u in a) {
      var e = a[u];
      a.hasOwnProperty(u) && e != null && hl(l, t, u, null, dy, e);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === Pt && (l.onclick = null), hn(l);
  }
  function fo(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    hn(l);
  }
  var Lt = /* @__PURE__ */ new Map(), Mm = /* @__PURE__ */ new Set();
  function Pe(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var Na = Y.d;
  Y.d = {
    f: qy,
    r: Yy,
    D: Gy,
    C: Xy,
    L: Qy,
    m: Zy,
    X: Ly,
    S: Vy,
    M: Ky
  };
  function qy() {
    var l = Na.f(), t = bi();
    return l || t;
  }
  function Yy(l) {
    var t = Ou(l);
    t !== null && t.tag === 5 && t.type === "form" ? C0(t) : Na.r(l);
  }
  var ie = typeof document > "u" ? null : document;
  function Um(l, t, a) {
    var u = ie;
    if (u && typeof t == "string" && t) {
      var e = Bt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Mm.has(e) || (Mm.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), tt(t, "link", l), Ll(t), u.head.appendChild(t)));
    }
  }
  function Gy(l) {
    Na.D(l), Um("dns-prefetch", l, null);
  }
  function Xy(l, t) {
    Na.C(l, t), Um("preconnect", l, t);
  }
  function Qy(l, t, a) {
    Na.L(l, t, a);
    var u = ie;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + Bt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + Bt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + Bt(
        a.imageSizes
      ) + '"]')) : e += '[href="' + Bt(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = ce(l);
          break;
        case "script":
          n = fe(l);
      }
      if (!(Lt.has(n) || (l = J(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Lt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(ln(n)) || t === "script" && u.querySelector(tn(n))))) {
        var i = u.createElement("link");
        tt(i, "link", l), t === "style" && (i[yn] = !0, i.onload = i.onerror = function() {
          Zo(i);
        }), Ll(i), u.head.appendChild(i);
      }
    }
  }
  function Zy(l, t) {
    Na.m(l, t);
    var a = ie;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + Bt(u) + '"][href="' + Bt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = fe(l);
      }
      if (!Lt.has(n) && (l = J({ rel: "modulepreload", href: l }, t), Lt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(tn(n)))
              return;
        }
        u = a.createElement("link"), tt(u, "link", l), Ll(u), a.head.appendChild(u);
      }
    }
  }
  function Vy(l, t, a) {
    Na.S(l, t, a);
    var u = ie;
    if (u && l) {
      var e = Nu(u).hoistableStyles, n = ce(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          ln(n)
        ))
          c.loading = 5;
        else {
          l = J(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Lt.get(n)) && oo(l, a);
          var f = i = u.createElement("link");
          Ll(f), tt(f, "link", l), f._p = new Promise(function(v, g) {
            f.onload = v, f.onerror = g;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Ai(i, t, u);
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
  function Ly(l, t) {
    Na.X(l, t);
    var a = ie;
    if (a && l) {
      var u = Nu(a).hoistableScripts, e = fe(l), n = u.get(e);
      n || (n = a.querySelector(tn(e)), n || (l = J({ src: l, async: !0 }, t), (t = Lt.get(e)) && so(l, t), n = a.createElement("script"), Ll(n), tt(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Ky(l, t) {
    Na.M(l, t);
    var a = ie;
    if (a && l) {
      var u = Nu(a).hoistableScripts, e = fe(l), n = u.get(e);
      n || (n = a.querySelector(tn(e)), n || (l = J({ src: l, async: !0, type: "module" }, t), (t = Lt.get(e)) && so(l, t), n = a.createElement("script"), Ll(n), tt(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Cm(l, t, a, u) {
    var e = (e = G.current) ? Pe(e) : null;
    if (!e) throw Error(y(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = ce(a.href), t = Nu(
          e
        ).hoistableStyles, u = t.get(a), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = ce(a.href);
          var n = Nu(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            ln(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Lt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Lt.set(l, n)), Jy(
            e,
            l,
            n,
            i.state
          ))), t && u === null)
            throw Error(y(528, ""));
          return i;
        }
        if (t && u !== null)
          throw Error(y(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = fe(a), t = Nu(
          e
        ).hoistableScripts, u = t.get(a), u || (u = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(y(444, l));
    }
  }
  function ce(l) {
    return 'href="' + Bt(l) + '"';
  }
  function ln(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Rm(l) {
    return J({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function Jy(l, t, a, u) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[yn] !== !0) {
        u.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[yn] = !0, t.onload = t.onerror = Zo.bind(null, t), tt(t, "link", a), Ll(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function fe(l) {
    return '[src="' + Bt(l) + '"]';
  }
  function tn(l) {
    return "script[async]" + l;
  }
  function pm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + Bt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Ll(u), u;
          var e = J({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Ll(u), tt(u, "style", e), Ai(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = ce(a.href);
          var n = l.querySelector(
            ln(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Ll(n), n;
          u = Rm(a), (e = Lt.get(e)) && oo(u, e), n = (l.ownerDocument || l).createElement("link"), Ll(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), tt(n, "link", u), t.state.loading |= 4, Ai(n, a.precedence, l), t.instance = n;
        case "script":
          return n = fe(a.src), (e = l.querySelector(
            tn(n)
          )) ? (t.instance = e, Ll(e), e) : (u = a, (e = Lt.get(n)) && (u = J({}, a), so(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Ll(e), tt(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(y(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Ai(u, a.precedence, l));
    return t.instance;
  }
  function Ai(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var c = u[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function oo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function so(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Di = null;
  function jm(l, t, a) {
    if (Di === null) {
      var u = /* @__PURE__ */ new Map(), e = Di = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Di, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[he] || n[Wl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = u.get(i);
        c ? c.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function mo(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function wy(l, t, a) {
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
  function Hm(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function xm(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Bm(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function qm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += Bm(t), l.suspenseyImages.push(t)), l = Wy.bind(l), t.decode().then(l, l));
  }
  function $y(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = ce(u.href), n = t.querySelector(
          ln(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = an.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Ll(n);
          return;
        }
        n = t.ownerDocument || t, u = Rm(u), (e = Lt.get(e)) && oo(u, e), n = n.createElement("link"), Ll(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), tt(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = an.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Mi = 0;
  function Fy(l, t) {
    return l.stylesheets && l.count === 0 && Ci(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Ci(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Mi === 0 && (Mi = 62500 * vy());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Ci(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > Mi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function Ym(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) Ci(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function an() {
    this.count--, Ym(this);
  }
  function Wy() {
    this.imgCount--, Ym(this);
  }
  var Ui = null;
  function Ci(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Ui = /* @__PURE__ */ new Map(), t.forEach(Iy, l), Ui = null, an.call(l));
  }
  function Iy(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Ui.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Ui.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = an.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var oe = {
    $$typeof: Ml,
    Provider: null,
    Consumer: null,
    _currentValue: Ht,
    _currentValue2: Ht,
    _threadCount: 0
  };
  function ky(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Li(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Li(0), this.hiddenUpdates = Li(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Gm(l, t, a, u, e, n, i, c, f, v, g, z) {
    return l = new ky(
      l,
      t,
      a,
      i,
      f,
      v,
      g,
      z,
      c
    ), t = 1, n === !0 && (t |= 24), n = rt(3, null, null, t), l.current = n, n.stateNode = l, t = Nc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Uc(n), l;
  }
  function Xm(l) {
    return l ? (l = xu, l) : xu;
  }
  function Qm(l, t, a, u, e, n) {
    e = Xm(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ba(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = qa(l, u, t), a !== null && (St(a, l, t), je(a, l, t));
  }
  function Zm(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function vo(l, t) {
    Zm(l, t), (l = l.alternate) && Zm(l, t);
  }
  function Vm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = nu(l, 67108864);
      t !== null && St(t, l, 67108864), vo(l, 67108864);
    }
  }
  function Lm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Rt();
      t = Ki(t);
      var a = nu(l, t);
      a !== null && St(a, l, t), vo(l, t);
    }
  }
  var se = !0;
  function Py(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 2, ro(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function lh(l, t, a, u) {
    var e = U.T;
    U.T = null;
    var n = Y.p;
    try {
      Y.p = 8, ro(l, t, a, u);
    } finally {
      Y.p = n, U.T = e;
    }
  }
  function ro(l, t, a, u) {
    if (se) {
      var e = yo(u);
      if (e === null)
        $f(
          l,
          t,
          u,
          Ri,
          a
        ), Jm(l, u);
      else if (ah(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (Jm(l, u), t & 4 && -1 < th.indexOf(l)) {
        for (; e !== null; ) {
          var n = Ou(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = lu(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - Ot(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    oa(n), (dl & 6) === 0 && (hi = zt() + 500, Fe(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = nu(n, 2), c !== null && St(c, n, 2), bi(), vo(n, 2);
            }
          if (n = yo(u), n === null && $f(
            l,
            t,
            u,
            Ri,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        $f(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function yo(l) {
    return l = ki(l), ho(l);
  }
  var Ri = null;
  function ho(l) {
    if (Ri = null, l = tu(l), l !== null) {
      var t = al(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = bl(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = Xl(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Ri = l, null;
  }
  function Km(l) {
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
        switch (vv()) {
          case Co:
            return 2;
          case Ro:
            return 8;
          case sn:
          case rv:
            return 32;
          case po:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var go = !1, Fa = null, Wa = null, Ia = null, un = /* @__PURE__ */ new Map(), en = /* @__PURE__ */ new Map(), ka = [], th = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Jm(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Fa = null;
        break;
      case "dragenter":
      case "dragleave":
        Wa = null;
        break;
      case "mouseover":
      case "mouseout":
        Ia = null;
        break;
      case "pointerover":
      case "pointerout":
        un.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        en.delete(t.pointerId);
    }
  }
  function nn(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Ou(t), t !== null && Vm(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function ah(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return Fa = nn(
          Fa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Wa = nn(
          Wa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Ia = nn(
          Ia,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return un.set(
          n,
          nn(
            un.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, en.set(
          n,
          nn(
            en.get(n) || null,
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
  function wm(l) {
    var t = tu(l.target);
    if (t !== null) {
      var a = al(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = bl(a), t !== null) {
            l.blockedOn = t, Go(l.priority, function() {
              Lm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Xl(a), t !== null) {
            l.blockedOn = t, Go(l.priority, function() {
              Lm(a);
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
  function pi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = yo(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        Ii = u, a.target.dispatchEvent(u), Ii = null;
      } else
        return t = Ou(a), t !== null && Vm(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function $m(l, t, a) {
    pi(l) && a.delete(t);
  }
  function uh() {
    go = !1, Fa !== null && pi(Fa) && (Fa = null), Wa !== null && pi(Wa) && (Wa = null), Ia !== null && pi(Ia) && (Ia = null), un.forEach($m), en.forEach($m);
  }
  function ji(l, t) {
    l.blockedOn === t && (l.blockedOn = null, go || (go = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      uh
    )));
  }
  var Hi = null;
  function Fm(l) {
    Hi !== l && (Hi = l, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      function() {
        Hi === l && (Hi = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (ho(u || a) === null)
              continue;
            break;
          }
          var n = Ou(a);
          n !== null && (l.splice(t, 3), t -= 3, Wc(
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
  function de(l) {
    function t(f) {
      return ji(f, l);
    }
    Fa !== null && ji(Fa, l), Wa !== null && ji(Wa, l), Ia !== null && ji(Ia, l), un.forEach(t), en.forEach(t);
    for (var a = 0; a < ka.length; a++) {
      var u = ka[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < ka.length && (a = ka[0], a.blockedOn === null); )
      wm(a), a.blockedOn === null && ka.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[vt] || null;
        if (typeof n == "function")
          i || Fm(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[vt] || null)
              c = i.formAction;
            else if (ho(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), Fm(a);
        }
      }
  }
  function Wm() {
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
  function So(l) {
    this._internalRoot = l;
  }
  xi.prototype.render = So.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(y(409));
    var a = t.current, u = Rt();
    Qm(a, u, l, t, null, null);
  }, xi.prototype.unmount = So.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Qm(l.current, 2, null, l, null, null), bi(), t[_u] = null;
    }
  };
  function xi(l) {
    this._internalRoot = l;
  }
  xi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Yo();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < ka.length && t !== 0 && t < ka[a].priority; a++) ;
      ka.splice(a, 0, l), a === 0 && wm(l);
    }
  };
  var Im = nl.version;
  if (Im !== "19.3.0")
    throw Error(
      y(
        527,
        Im,
        "19.3.0"
      )
    );
  Y.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(y(188)) : (l = Object.keys(l).join(","), Error(y(268, l)));
    return l = zl(t), l = l !== null ? j(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var eh = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: U,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Bi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Bi.isDisabled && Bi.supportsFiber)
      try {
        ve = Bi.inject(
          eh
        ), _t = Bi;
      } catch {
      }
  }
  return fn.createRoot = function(l, t) {
    if (!fl(l)) throw Error(y(299));
    var a = !1, u = "", e = X0, n = Q0, i = Z0;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Gm(
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
      Wm
    ), l[_u] = t.current, wf(l), new So(t);
  }, fn.hydrateRoot = function(l, t, a) {
    if (!fl(l)) throw Error(y(299));
    var u = !1, e = "", n = X0, i = Q0, c = Z0, f = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Gm(
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
      Wm
    ), t.context = Xm(null), a = t.current, u = Rt(), u = Ki(u), e = Ba(u), e.callback = null, qa(a, e, u), a = u, t.current.lanes = a, ye(t, a), oa(t), l[_u] = t.current, wf(l), new xi(t);
  }, fn.version = "19.3.0", fn;
}
var cv;
function rh() {
  if (cv) return Eo.exports;
  cv = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (nl) {
        console.error(nl);
      }
  }
  return A(), Eo.exports = vh(), Eo.exports;
}
var yh = rh();
function hh(A = "/api") {
  async function nl(Z, y, fl) {
    const al = await fetch(`${A.replace(/\/$/, "")}/${Z}`, {
      ...y ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(y) } : {},
      signal: fl
    });
    if (!al.ok) {
      const bl = await al.json().catch(() => ({}));
      throw new Error(bl.error || `Erro HTTP ${al.status}`);
    }
    return Z === "export" ? al.blob() : al.json();
  }
  return { catalog: (Z) => nl("catalog", null, Z), preview: (Z, y) => nl("preview", Z, y), export: (Z, y) => nl("export", Z, y) };
}
const fv = {
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
}, No = (A) => {
  if (fv[A]) return fv[A];
  const nl = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return nl.charAt(0).toLocaleUpperCase("pt-BR") + nl.slice(1);
};
function gh(A) {
  let nl = "";
  try {
    nl = JSON.parse(A.detail).categorias || "";
  } catch {
    nl = "";
  }
  const Z = {};
  for (const y of String(nl).split("|")) {
    const fl = y.indexOf(":");
    if (fl < 1) continue;
    const al = y.slice(0, fl).trim(), bl = y.slice(fl + 1).trim();
    al && bl && (Z[al] = bl);
  }
  return Z;
}
const ov = { fgb: 6500, gpkg: 1900, shp: 250 }, Ao = "__todas__";
function Sh({ apiBaseUrl: A = "/api", client: nl, value: Z, onChange: y, onExport: fl, download: al = !0, className: bl = "", categoriaNome: Xl = "" }) {
  const gl = jl.useMemo(() => nl || hh(A), [nl, A]), [zl, j] = jl.useState(null), [T, H] = jl.useState({ attributes: [], format: "fgb" }), X = Z ?? T, [Nl, Tl] = jl.useState(""), [w, $l] = jl.useState("2022"), [ol, Fl] = jl.useState(""), [st, jt] = jl.useState(""), [xl, J] = jl.useState({}), [$, dt] = jl.useState(0), [ut, Vl] = jl.useState(""), [Cl, Kt] = jl.useState(!1), [sa, Ml] = jl.useState(""), [O, B] = jl.useState(null), x = jl.useRef(!0);
  jl.useEffect(() => {
    x.current = !0;
    const S = new AbortController();
    return j(null), Vl(""), gl.catalog(S.signal).then((G) => {
      j(G), Tl(G.attributes.find((cl) => cl.source === "IBGE · Censo 2022")?.source || G.attributes[0]?.source || "");
    }).catch((G) => {
      G.name !== "AbortError" && Vl(G.message);
    }), () => {
      x.current = !1, S.abort();
    };
  }, [gl]);
  function il(S) {
    Z === void 0 && H(S), y?.(S), Ml("");
  }
  const F = zl?.attributes || [], bt = [...new Set(F.map((S) => S.source))], nt = Nl === Ao, Jt = [...new Set(F.filter((S) => nt || S.source === Nl).map((S) => S.year))].sort((S, G) => G - S), s = nt && w === "", _ = s ? null : Jt.includes(Number(w)) ? Number(w) : Jt[0], C = F.filter((S) => (nt || S.source === Nl) && (s || S.year === _)), R = [...new Set(C.map((S) => S.theme))], V = new Set(X.attributes), ul = jl.useMemo(() => {
    const S = F.filter((Al) => V.has(Al.id));
    if (!S.length) return "Categoria — fonte majoritária — data da geração";
    const G = /* @__PURE__ */ new Map();
    for (const Al of S) G.set(Al.source, (G.get(Al.source) || 0) + 1);
    const cl = [...G.entries()].sort((Al, mt) => mt[1] - Al[1])[0][0];
    return `${Xl || "Categoria"} — ${cl} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [F, X.attributes, Xl]), tl = F.filter((S) => V.has(S.id)), U = jl.useMemo(() => new Map(F.map((S) => [S.id, gh(S)])), [F]), Y = C.filter((S) => (!ol || S.theme === ol) && `${S.label} ${S.field} ${S.unit}`.toLocaleLowerCase("pt-BR").includes(st.toLocaleLowerCase("pt-BR"))), Ht = (S, G) => Object.entries(xl).every(([cl, Al]) => !Al || cl === G || U.get(S.id)?.[cl] === Al), me = (() => {
    if (!ol) return [];
    const S = /* @__PURE__ */ new Map();
    for (const G of Y) for (const [cl, Al] of Object.entries(U.get(G.id) || {}))
      S.has(cl) || S.set(cl, /* @__PURE__ */ new Set()), Ht(G, cl) && S.get(cl).add(Al);
    return [...S].map(([G, cl]) => [G, [...cl].sort((Al, mt) => Al.localeCompare(mt, "pt-BR", { numeric: !0 }))]).filter(([G, cl]) => cl.length > 1 || xl[G]).sort((G, cl) => G[0].localeCompare(cl[0], "pt-BR"));
  })(), Tt = Y.filter((S) => Ht(S, null)), Et = Tt.slice($ * 40, $ * 40 + 40);
  jl.useEffect(() => {
    dt(0);
  }, [Nl, w, ol, st, xl]), jl.useEffect(() => {
    J({});
  }, [Nl, w, ol]);
  const Ql = `${X.format}|${[...X.attributes].join(",")}`;
  jl.useEffect(() => {
    if (B(null), !X.attributes.length) return;
    const S = new AbortController(), G = { attributes: X.attributes, format: X.format }, cl = setTimeout(() => gl.preview(G, S.signal).then(B).catch((Al) => {
      Al.name !== "AbortError" && Vl(Al.message);
    }), 250);
    return () => {
      clearTimeout(cl), S.abort();
    };
  }, [gl, Ql]);
  function vl(S) {
    il({ ...X, attributes: V.has(S) ? X.attributes.filter((G) => G !== S) : [...X.attributes, S] });
  }
  async function xt() {
    Kt(!0), Vl(""), Ml(zl?.destino ? `Gerando geometria e tabela de atributos em ${zl.destino}/` : "Gerando geometria e tabela de atributos…");
    const S = { ...X, attributes: [...X.attributes] };
    try {
      const G = await gl.export(S), cl = `municipios_sp_${S.format}.zip`;
      if (await fl?.({ blob: G, filename: cl, configuration: S, attributes: tl }), al) {
        const Al = URL.createObjectURL(G), mt = document.createElement("a");
        mt.href = Al, mt.download = cl, mt.click(), setTimeout(() => URL.revokeObjectURL(Al), 1e4);
      }
      x.current && Ml("Camada gerada. O pacote contém a camada, o dicionário e os metadados.");
    } catch (G) {
      x.current && (Vl(G.message), Ml(""));
    } finally {
      x.current && Kt(!1);
    }
  }
  return /* @__PURE__ */ b.jsxs("section", { className: `mlb ${bl}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ b.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ b.jsxs("div", { children: [
        /* @__PURE__ */ b.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO / DADOS MUNICIPAIS" }),
        /* @__PURE__ */ b.jsx("h1", { children: "Monte sua camada" }),
        /* @__PURE__ */ b.jsx("p", { children: "Escolha os indicadores e receba uma camada vetorial com os atributos incorporados." })
      ] }),
      /* @__PURE__ */ b.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ b.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ b.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    ut && /* @__PURE__ */ b.jsx("div", { className: "mlb-error", role: "alert", children: ut }),
    zl ? /* @__PURE__ */ b.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ b.jsxs("main", { className: "mlb-panel", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ b.jsxs("select", { value: Nl, onChange: (S) => {
              Tl(S.target.value), Fl(""), S.target.value === Ao && $l("");
            }, children: [
              /* @__PURE__ */ b.jsx("option", { value: Ao, children: "Todas" }),
              bt.map((S) => /* @__PURE__ */ b.jsx("option", { children: S }, S))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ b.jsxs("select", { value: s ? "" : _ ?? "", onChange: (S) => {
              $l(S.target.value), Fl("");
            }, children: [
              nt && /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os anos" }),
              Jt.map((S) => /* @__PURE__ */ b.jsx("option", { children: S }, S))
            ] })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ b.jsxs("select", { value: ol, onChange: (S) => Fl(S.target.value), children: [
              /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os temas" }),
              R.map((S) => /* @__PURE__ */ b.jsx("option", { value: S, children: No(S) }, S))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ b.jsx("input", { type: "search", value: st, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (S) => jt(S.target.value) })
          ] }),
          me.map(([S, G]) => /* @__PURE__ */ b.jsxs("label", { children: [
            S,
            /* @__PURE__ */ b.jsxs("select", { value: xl[S] ?? "", onChange: (cl) => J({ ...xl, [S]: cl.target.value }), children: [
              /* @__PURE__ */ b.jsxs("option", { value: "", children: [
                "Todos (",
                G.length,
                ")"
              ] }),
              G.map((cl) => /* @__PURE__ */ b.jsx("option", { value: cl, children: cl }, cl))
            ] })
          ] }, S)),
          !!Object.values(xl).filter(Boolean).length && /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => J({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ b.jsxs("span", { children: [
            Tt.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ b.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !Tt.length || Cl, onClick: () => il({ ...X, attributes: [.../* @__PURE__ */ new Set([...X.attributes, ...Tt.map((S) => S.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !V.size || Cl, onClick: () => il({ ...X, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-attributes", children: [
          Et.map((S) => /* @__PURE__ */ b.jsxs("article", { className: V.has(S.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ b.jsxs("label", { children: [
              /* @__PURE__ */ b.jsx("input", { type: "checkbox", checked: V.has(S.id), disabled: Cl, onChange: () => vl(S.id) }),
              /* @__PURE__ */ b.jsx("strong", { children: S.label })
            ] }),
            /* @__PURE__ */ b.jsxs("details", { children: [
              /* @__PURE__ */ b.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ b.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ b.jsxs("p", { className: "mlb-detail-meta", children: [
                  No(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsxs("p", { children: [
                  nt ? `${S.source} · ` : "",
                  S.field,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ b.jsx("a", { href: S.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ b.jsx("p", { children: JSON.parse(S.detail).definicao || JSON.parse(S.detail).divulgacao || "" }),
                /* @__PURE__ */ b.jsx("p", { children: JSON.parse(S.detail).nota || "" })
              ] })
            ] })
          ] }, S.id)),
          !Et.length && /* @__PURE__ */ b.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ b.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !$, onClick: () => dt($ - 1), children: "Anterior" }),
          /* @__PURE__ */ b.jsxs("span", { children: [
            "Página ",
            $ + 1,
            " de ",
            Math.max(1, Math.ceil(Tt.length / 40))
          ] }),
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: ($ + 1) * 40 >= Tt.length, onClick: () => dt($ + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ b.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ b.jsx("strong", { children: X.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ b.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ b.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-basket", children: [
          tl.map((S) => /* @__PURE__ */ b.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ b.jsx("span", { className: "mlb-basket-name", children: S.label }),
            /* @__PURE__ */ b.jsxs("details", { children: [
              /* @__PURE__ */ b.jsx("summary", { "aria-label": `Fonte e definição de ${S.label}` }),
              /* @__PURE__ */ b.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ b.jsxs("p", { className: "mlb-detail-meta", children: [
                  S.source,
                  " · ",
                  S.year
                ] }),
                /* @__PURE__ */ b.jsxs("p", { children: [
                  No(S.theme),
                  " · ",
                  S.unit || "Unidade não informada",
                  " · ",
                  S.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ b.jsx("p", { children: S.field })
              ] })
            ] }),
            /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: Cl, title: `Remover ${S.label}`, "aria-label": `Remover ${S.label}`, onClick: () => vl(S.id), children: "×" })
          ] }, S.id)),
          !tl.length && /* @__PURE__ */ b.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ b.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ b.jsxs("select", { disabled: Cl, value: X.format, onChange: (S) => il({ ...X, format: S.target.value }), children: [
            /* @__PURE__ */ b.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ b.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ b.jsx("option", { value: "shp", children: "Shapefile (.shp)" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("p", { className: "mlb-note", children: [
          X.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : X.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP."
        ] }),
        /* @__PURE__ */ b.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ b.jsx("input", { type: "text", maxLength: 200, disabled: Cl, value: X.nome ?? "", placeholder: ul, onChange: (S) => il({ ...X, nome: S.target.value }) })
        ] }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        V.size > ov[X.format] && /* @__PURE__ */ b.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-primary", disabled: Cl || !V.size || V.size > ov[X.format], onClick: xt, children: Cl ? "Gerando camada…" : al ? "Gerar e baixar camada" : "Gerar camada" }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-status", role: "status", children: sa }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      O && /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel mlb-preview", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "Prévia da tabela de atributos" }),
        /* @__PURE__ */ b.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
        /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { children: [
          /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("th", { children: "Código IBGE" }),
            /* @__PURE__ */ b.jsx("th", { children: "Município" }),
            O.fields.map((S) => /* @__PURE__ */ b.jsx("th", { children: S }, S))
          ] }) }),
          /* @__PURE__ */ b.jsx("tbody", { children: O.rows.map((S) => /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("td", { children: S.CD_MUN }),
            /* @__PURE__ */ b.jsx("td", { children: S.NM_MUN }),
            O.fields.map((G) => /* @__PURE__ */ b.jsx("td", { children: S[G] == null ? "Sem valor" : S[G].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, G))
          ] }, S.CD_MUN)) })
        ] }) })
      ] }),
      O?.glossario?.length ? /* @__PURE__ */ b.jsxs("section", { className: "mlb-panel mlb-glossario", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "Glossário e aliases de atributos" }),
        /* @__PURE__ */ b.jsxs("p", { children: [
          "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
          O.totalAttributes > (O.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${O.glossarioLimite} de ${O.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
        ] }),
        /* @__PURE__ */ b.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ b.jsxs("table", { children: [
          /* @__PURE__ */ b.jsx("thead", { children: /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("th", { children: "Campo exportado" }),
            /* @__PURE__ */ b.jsx("th", { children: "Alias" }),
            /* @__PURE__ */ b.jsx("th", { children: "Significado" }),
            /* @__PURE__ */ b.jsx("th", { children: "Fonte" })
          ] }) }),
          /* @__PURE__ */ b.jsx("tbody", { children: O.glossario.map((S) => /* @__PURE__ */ b.jsxs("tr", { children: [
            /* @__PURE__ */ b.jsx("td", { children: /* @__PURE__ */ b.jsx("code", { children: S.campo_exportado }) }),
            /* @__PURE__ */ b.jsx("td", { children: S.alias }),
            /* @__PURE__ */ b.jsx("td", { className: "mlb-glossario-significado", children: S.significado }),
            /* @__PURE__ */ b.jsx("td", { children: S.fonte })
          ] }, S.campo_exportado)) })
        ] }) })
      ] }) : null
    ] }) : /* @__PURE__ */ b.jsx("p", { role: "status", children: ut ? "Não foi possível carregar o catálogo. Verifique a API configurada." : "Carregando catálogo…" })
  ] });
}
function bh({ category: A, apiBase: nl, onGenerated: Z }) {
  const y = document.createElement("dialog");
  y.className = "ea-municipal-dialog";
  const fl = document.createElement("div");
  y.append(fl), document.body.append(y);
  const al = yh.createRoot(fl);
  let bl = !1;
  const Xl = () => {
    bl || (al.unmount(), y.close(), y.remove());
  };
  y.addEventListener("cancel", (zl) => {
    zl.preventDefault(), Xl();
  });
  function gl() {
    const [zl, j] = jl.useState(!1), T = jl.useMemo(() => {
      let X;
      async function Nl(Tl, w, $l) {
        let ol;
        try {
          ol = await fetch(`${nl}/extracao-atributos/municipal/${encodeURIComponent(A.id)}/${Tl}`, {
            ...w ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(w) } : {},
            signal: $l
          });
        } catch (Fl) {
          throw Fl.name === "AbortError" ? Fl : new Error("A conexão com o servidor caiu durante a geração. Isso costuma ser falta de memória para o tamanho da seleção: tente menos atributos.");
        }
        if (!ol.ok) {
          const Fl = await ol.json().catch(() => ({}));
          throw ol.status === 502 || ol.status === 503 || ol.status === 504 ? new Error(`O servidor não respondeu à geração (HTTP ${ol.status}). Se a seleção for grande, tente menos atributos.`) : new Error(typeof Fl.detail == "string" ? Fl.detail : "Falha no gerador municipal.");
        }
        return Tl === "export" ? (X = { arquivo: ol.headers.get("X-Camada-Arquivo"), id: ol.headers.get("X-Camada-Id") }, ol.blob()) : ol.json();
      }
      return {
        catalog: (Tl) => Nl("catalog", null, Tl),
        preview: (Tl, w) => Nl("preview", Tl, w),
        export: async (Tl) => {
          bl = !0, j(!0);
          try {
            return await Nl("export", { ...Tl, nome: Tl.nome || "" });
          } catch (w) {
            throw bl = !1, j(!1), w;
          }
        },
        generated: () => X
      };
    }, []);
    async function H() {
      try {
        await Z(T.generated()), bl = !1, Xl();
      } finally {
        bl = !1, j(!1);
      }
    }
    return /* @__PURE__ */ b.jsxs(b.Fragment, { children: [
      /* @__PURE__ */ b.jsxs("header", { className: "ea-municipal-header", children: [
        /* @__PURE__ */ b.jsxs("div", { children: [
          /* @__PURE__ */ b.jsxs("h2", { children: [
            "Camada municipal · ",
            A.nome
          ] }),
          /* @__PURE__ */ b.jsx("p", { children: A.conceito })
        ] }),
        /* @__PURE__ */ b.jsx("button", { type: "button", "aria-label": "Fechar gerador municipal", disabled: zl, onClick: Xl, children: "×" })
      ] }),
      /* @__PURE__ */ b.jsx("p", { className: "ea-municipal-help", children: "Escolha os atributos que representam esta categoria. Ao gerar, a camada será salva no acervo e adicionada às bases da análise." }),
      /* @__PURE__ */ b.jsx(Sh, { client: T, download: !1, onExport: H, categoriaNome: A.nome })
    ] });
  }
  y.showModal(), al.render(/* @__PURE__ */ b.jsx(gl, {}));
}
export {
  bh as abrirMunicipal
};
