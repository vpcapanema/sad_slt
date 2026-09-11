var bo = { exports: {} }, nn = {};
var Im;
function nh() {
  if (Im) return nn;
  Im = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), il = /* @__PURE__ */ Symbol.for("react.fragment");
  function Z(y, fl, al) {
    var Sl = null;
    if (al !== void 0 && (Sl = "" + al), fl.key !== void 0 && (Sl = "" + fl.key), "key" in fl) {
      al = {};
      for (var Gl in fl)
        Gl !== "key" && (al[Gl] = fl[Gl]);
    } else al = fl;
    return fl = al.ref, {
      $$typeof: A,
      type: y,
      key: Sl,
      ref: fl !== void 0 ? fl : null,
      props: al
    };
  }
  return nn.Fragment = il, nn.jsx = Z, nn.jsxs = Z, nn;
}
var km;
function ih() {
  return km || (km = 1, bo.exports = nh()), bo.exports;
}
var b = ih(), To = { exports: {} }, Q = {};
var Pm;
function ch() {
  if (Pm) return Q;
  Pm = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), il = /* @__PURE__ */ Symbol.for("react.portal"), Z = /* @__PURE__ */ Symbol.for("react.fragment"), y = /* @__PURE__ */ Symbol.for("react.strict_mode"), fl = /* @__PURE__ */ Symbol.for("react.profiler"), al = /* @__PURE__ */ Symbol.for("react.consumer"), Sl = /* @__PURE__ */ Symbol.for("react.context"), Gl = /* @__PURE__ */ Symbol.for("react.forward_ref"), yl = /* @__PURE__ */ Symbol.for("react.suspense"), zl = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), H = /* @__PURE__ */ Symbol.for("react.view_transition"), X = Symbol.iterator;
  function Al(s) {
    return s === null || typeof s != "object" ? null : (s = X && s[X] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var bl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, F = Object.assign, lt = {};
  function Tl(s, _, M) {
    this.props = s, this.context = _, this.refs = lt, this.updater = M || bl;
  }
  Tl.prototype.isReactComponent = {}, Tl.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, Tl.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function ft() {
  }
  ft.prototype = Tl.prototype;
  function ot(s, _, M) {
    this.props = s, this.context = _, this.refs = lt, this.updater = M || bl;
  }
  var Rt = ot.prototype = new ft();
  Rt.constructor = ot, F(Rt, Tl.prototype), Rt.isPureReactComponent = !0;
  var Hl = Array.isArray;
  function K() {
  }
  var J = { H: null, A: null, T: null, S: null }, st = Object.prototype.hasOwnProperty;
  function tt(s, _, M) {
    var R = M.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: R !== void 0 ? R : null,
      props: M
    };
  }
  function Zl(s, _) {
    return tt(s.type, _, s.props);
  }
  function Ul(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function Zt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(M) {
      return _[M];
    });
  }
  var ca = /\/+/g;
  function Dl(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? Zt("" + s.key) : _.toString(36);
  }
  function O(s) {
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
  function B(s, _, M, R, W) {
    var tl = typeof s;
    (tl === "undefined" || tl === "boolean") && (s = null);
    var ul = !1;
    if (s === null) ul = !0;
    else
      switch (tl) {
        case "bigint":
        case "string":
        case "number":
          ul = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case il:
              ul = !0;
              break;
            case j:
              return ul = s._init, B(
                ul(s._payload),
                _,
                M,
                R,
                W
              );
          }
      }
    if (ul)
      return W = W(s), ul = R === "" ? "." + Dl(s, 0) : R, Hl(W) ? (M = "", ul != null && (M = ul.replace(ca, "$&/") + "/"), B(W, _, M, "", function(at) {
        return at;
      })) : W != null && (Ul(W) && (W = Zl(
        W,
        M + (W.key == null || s && s.key === W.key ? "" : ("" + W.key).replace(
          ca,
          "$&/"
        ) + "/") + ul
      )), _.push(W)), 1;
    ul = 0;
    var C = R === "" ? "." : R + ":";
    if (Hl(s))
      for (var G = 0; G < s.length; G++)
        R = s[G], tl = C + Dl(R, G), ul += B(
          R,
          _,
          M,
          tl,
          W
        );
    else if (G = Al(s), typeof G == "function")
      for (s = G.call(s), G = 0; !(R = s.next()).done; )
        R = R.value, tl = C + Dl(R, G++), ul += B(
          R,
          _,
          M,
          tl,
          W
        );
    else if (tl === "object") {
      if (typeof s.then == "function")
        return B(
          O(s),
          _,
          M,
          R,
          W
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ul;
  }
  function x(s, _, M) {
    if (s == null) return s;
    var R = [], W = 0;
    return B(s, R, "", "", function(tl) {
      return _.call(M, tl, W++);
    }), R;
  }
  function cl(s) {
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
  var w = typeof reportError == "function" ? reportError : function(s) {
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
  function gt(s) {
    var _ = J.T, M = {};
    M.types = _ !== null ? _.types : null, J.T = M;
    try {
      var R = s(), W = J.S;
      W !== null && W(M, R), typeof R == "object" && R !== null && typeof R.then == "function" && R.then(K, w);
    } catch (tl) {
      w(tl);
    } finally {
      _ !== null && M.types !== null && (_.types = M.types), J.T = _;
    }
  }
  function St(s) {
    var _ = J.T;
    if (_ !== null) {
      var M = _.types;
      M === null ? _.types = [s] : M.indexOf(s) === -1 && M.push(s);
    } else gt(St.bind(null, s));
  }
  var Ft = {
    map: x,
    forEach: function(s, _, M) {
      x(
        s,
        function() {
          _.apply(this, arguments);
        },
        M
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
      if (!Ul(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return Q.Activity = T, Q.Children = Ft, Q.Component = Tl, Q.Fragment = Z, Q.Profiler = fl, Q.PureComponent = ot, Q.StrictMode = y, Q.Suspense = yl, Q.ViewTransition = H, Q.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = J, Q.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return J.H.useMemoCache(s);
    }
  }, Q.addTransitionType = St, Q.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, Q.cacheSignal = function() {
    return null;
  }, Q.cloneElement = function(s, _, M) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var R = F({}, s.props), W = s.key;
    if (_ != null)
      for (tl in _.key !== void 0 && (W = "" + _.key), _)
        !st.call(_, tl) || tl === "key" || tl === "__self" || tl === "__source" || tl === "ref" && _.ref === void 0 || (R[tl] = _[tl]);
    var tl = arguments.length - 2;
    if (tl === 1) R.children = M;
    else if (1 < tl) {
      for (var ul = Array(tl), C = 0; C < tl; C++)
        ul[C] = arguments[C + 2];
      R.children = ul;
    }
    return tt(s.type, W, R);
  }, Q.createContext = function(s) {
    return s = {
      $$typeof: Sl,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: al,
      _context: s
    }, s;
  }, Q.createElement = function(s, _, M) {
    var R, W = {}, tl = null;
    if (_ != null)
      for (R in _.key !== void 0 && (tl = "" + _.key), _)
        st.call(_, R) && R !== "key" && R !== "__self" && R !== "__source" && (W[R] = _[R]);
    var ul = arguments.length - 2;
    if (ul === 1) W.children = M;
    else if (1 < ul) {
      for (var C = Array(ul), G = 0; G < ul; G++)
        C[G] = arguments[G + 2];
      W.children = C;
    }
    if (s && s.defaultProps)
      for (R in ul = s.defaultProps, ul)
        W[R] === void 0 && (W[R] = ul[R]);
    return tt(s, tl, W);
  }, Q.createRef = function() {
    return { current: null };
  }, Q.forwardRef = function(s) {
    return { $$typeof: Gl, render: s };
  }, Q.isValidElement = Ul, Q.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: cl
    };
  }, Q.memo = function(s, _) {
    return {
      $$typeof: zl,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, Q.startTransition = gt, Q.unstable_useCacheRefresh = function() {
    return J.H.useCacheRefresh();
  }, Q.use = function(s) {
    return J.H.use(s);
  }, Q.useActionState = function(s, _, M) {
    return J.H.useActionState(s, _, M);
  }, Q.useCallback = function(s, _) {
    return J.H.useCallback(s, _);
  }, Q.useContext = function(s) {
    return J.H.useContext(s);
  }, Q.useDebugValue = function() {
  }, Q.useDeferredValue = function(s, _) {
    return J.H.useDeferredValue(s, _);
  }, Q.useEffect = function(s, _) {
    return J.H.useEffect(s, _);
  }, Q.useEffectEvent = function(s) {
    return J.H.useEffectEvent(s);
  }, Q.useId = function() {
    return J.H.useId();
  }, Q.useImperativeHandle = function(s, _, M) {
    return J.H.useImperativeHandle(s, _, M);
  }, Q.useInsertionEffect = function(s, _) {
    return J.H.useInsertionEffect(s, _);
  }, Q.useLayoutEffect = function(s, _) {
    return J.H.useLayoutEffect(s, _);
  }, Q.useMemo = function(s, _) {
    return J.H.useMemo(s, _);
  }, Q.useOptimistic = function(s, _) {
    return J.H.useOptimistic(s, _);
  }, Q.useReducer = function(s, _, M) {
    return J.H.useReducer(s, _, M);
  }, Q.useRef = function(s) {
    return J.H.useRef(s);
  }, Q.useState = function(s) {
    return J.H.useState(s);
  }, Q.useSyncExternalStore = function(s, _, M) {
    return J.H.useSyncExternalStore(
      s,
      _,
      M
    );
  }, Q.useTransition = function() {
    return J.H.useTransition();
  }, Q.version = "19.3.0", Q;
}
var lv;
function Ao() {
  return lv || (lv = 1, To.exports = ch()), To.exports;
}
var pl = Ao(), Eo = { exports: {} }, cn = {}, zo = { exports: {} }, _o = {};
var tv;
function fh() {
  return tv || (tv = 1, (function(A) {
    function il(O, B) {
      var x = O.length;
      O.push(B);
      l: for (; 0 < x; ) {
        var cl = x - 1 >>> 1, w = O[cl];
        if (0 < fl(w, B))
          O[cl] = B, O[x] = w, x = cl;
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
        l: for (var cl = 0, w = O.length, gt = w >>> 1; cl < gt; ) {
          var St = 2 * (cl + 1) - 1, Ft = O[St], s = St + 1, _ = O[s];
          if (0 > fl(Ft, x))
            s < w && 0 > fl(_, Ft) ? (O[cl] = _, O[s] = x, cl = s) : (O[cl] = Ft, O[St] = x, cl = St);
          else if (s < w && 0 > fl(_, x))
            O[cl] = _, O[s] = x, cl = s;
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
      var Sl = Date, Gl = Sl.now();
      A.unstable_now = function() {
        return Sl.now() - Gl;
      };
    }
    var yl = [], zl = [], j = 1, T = null, H = 3, X = !1, Al = !1, bl = !1, F = !1, lt = typeof setTimeout == "function" ? setTimeout : null, Tl = typeof clearTimeout == "function" ? clearTimeout : null, ft = typeof setImmediate < "u" ? setImmediate : null;
    function ot(O) {
      for (var B = Z(zl); B !== null; ) {
        if (B.callback === null) y(zl);
        else if (B.startTime <= O)
          y(zl), B.sortIndex = B.expirationTime, il(yl, B);
        else break;
        B = Z(zl);
      }
    }
    function Rt(O) {
      if (bl = !1, ot(O), !Al)
        if (Z(yl) !== null)
          Al = !0, Hl || (Hl = !0, Ul());
        else {
          var B = Z(zl);
          B !== null && Dl(Rt, B.startTime - O);
        }
    }
    var Hl = !1, K = -1, J = 5, st = -1;
    function tt() {
      return F ? !0 : !(A.unstable_now() - st < J);
    }
    function Zl() {
      if (F = !1, Hl) {
        var O = A.unstable_now();
        st = O;
        var B = !0;
        try {
          l: {
            Al = !1, bl && (bl = !1, Tl(K), K = -1), X = !0;
            var x = H;
            try {
              t: {
                for (ot(O), T = Z(yl); T !== null && !(T.expirationTime > O && tt()); ) {
                  var cl = T.callback;
                  if (typeof cl == "function") {
                    T.callback = null, H = T.priorityLevel;
                    var w = cl(
                      T.expirationTime <= O
                    );
                    if (O = A.unstable_now(), typeof w == "function") {
                      T.callback = w, ot(O), B = !0;
                      break t;
                    }
                    T === Z(yl) && y(yl), ot(O);
                  } else y(yl);
                  T = Z(yl);
                }
                if (T !== null) B = !0;
                else {
                  var gt = Z(zl);
                  gt !== null && Dl(
                    Rt,
                    gt.startTime - O
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
          B ? Ul() : Hl = !1;
        }
      }
    }
    var Ul;
    if (typeof ft == "function")
      Ul = function() {
        ft(Zl);
      };
    else if (typeof MessageChannel < "u") {
      var Zt = new MessageChannel(), ca = Zt.port2;
      Zt.port1.onmessage = Zl, Ul = function() {
        ca.postMessage(null);
      };
    } else
      Ul = function() {
        lt(Zl, 0);
      };
    function Dl(O, B) {
      K = lt(function() {
        O(A.unstable_now());
      }, B);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, A.unstable_forceFrameRate = function(O) {
      0 > O || 125 < O ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : J = 0 < O ? Math.floor(1e3 / O) : 5;
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
      F = !0;
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
      var cl = A.unstable_now();
      switch (typeof x == "object" && x !== null ? (x = x.delay, x = typeof x == "number" && 0 < x ? cl + x : cl) : x = cl, O) {
        case 1:
          var w = -1;
          break;
        case 2:
          w = 250;
          break;
        case 5:
          w = 1073741823;
          break;
        case 4:
          w = 1e4;
          break;
        default:
          w = 5e3;
      }
      return w = x + w, O = {
        id: j++,
        callback: B,
        priorityLevel: O,
        startTime: x,
        expirationTime: w,
        sortIndex: -1
      }, x > cl ? (O.sortIndex = x, il(zl, O), Z(yl) === null && O === Z(zl) && (bl ? (Tl(K), K = -1) : bl = !0, Dl(Rt, x - cl))) : (O.sortIndex = w, il(yl, O), Al || X || (Al = !0, Hl || (Hl = !0, Ul()))), O;
    }, A.unstable_shouldYield = tt, A.unstable_wrapCallback = function(O) {
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
var av;
function oh() {
  return av || (av = 1, zo.exports = fh()), zo.exports;
}
var Oo = { exports: {} }, Pl = {};
var uv;
function sh() {
  if (uv) return Pl;
  uv = 1;
  var A = Ao();
  function il(j) {
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
        throw Error(il(522));
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
  }, fl = /* @__PURE__ */ Symbol.for("react.portal"), al = /* @__PURE__ */ Symbol.for("react.recoverable"), Sl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Gl(j, T, H) {
    var X = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: fl,
      key: X == null ? null : X === Sl ? Sl : "" + X,
      children: j,
      containerInfo: T,
      implementation: H
    };
  }
  var yl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function zl(j, T) {
    if (j === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return Pl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = y, Pl.browser = function(j) {
    return { $$typeof: al, _reason: j };
  }, Pl.createPortal = function(j, T) {
    var H = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(il(299));
    return Gl(j, T, null, H);
  }, Pl.flushSync = function(j) {
    var T = yl.T, H = y.p;
    try {
      if (yl.T = null, y.p = 2, j) return j();
    } finally {
      yl.T = T, y.p = H, y.d.f();
    }
  }, Pl.preconnect = function(j, T) {
    typeof j == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, y.d.C(j, T));
  }, Pl.prefetchDNS = function(j) {
    typeof j == "string" && y.d.D(j);
  }, Pl.preinit = function(j, T) {
    if (typeof j == "string" && T && typeof T.as == "string") {
      var H = T.as, X = zl(H, T.crossOrigin), Al = typeof T.integrity == "string" ? T.integrity : void 0, bl = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      H === "style" ? y.d.S(
        j,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: X,
          integrity: Al,
          fetchPriority: bl
        }
      ) : H === "script" && y.d.X(j, {
        crossOrigin: X,
        integrity: Al,
        fetchPriority: bl,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, Pl.preinitModule = function(j, T) {
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
  }, Pl.preload = function(j, T) {
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
  }, Pl.preloadModule = function(j, T) {
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
  }, Pl.requestFormReset = function(j) {
    y.d.r(j);
  }, Pl.unstable_batchedUpdates = function(j, T) {
    return j(T);
  }, Pl.useFormState = function(j, T, H) {
    return yl.H.useFormState(j, T, H);
  }, Pl.useFormStatus = function() {
    return yl.H.useHostTransitionStatus();
  }, Pl.version = "19.3.0", Pl;
}
var ev;
function dh() {
  if (ev) return Oo.exports;
  ev = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (il) {
        console.error(il);
      }
  }
  return A(), Oo.exports = sh(), Oo.exports;
}
var nv;
function mh() {
  if (nv) return cn;
  nv = 1;
  var A = oh(), il = Ao(), Z = dh();
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
  function Sl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Gl(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function yl(l) {
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
          if (n === a) return yl(e), l;
          if (n === u) return yl(e), t;
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
  function Al(l) {
    var t = [null, null], a = H(l);
    return a === null || bl(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function bl(l, t, a, u) {
    for (; a !== null; ) {
      if (a === t) u.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (u.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && bl(
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
  function F(l) {
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
  var lt = null, Tl = null;
  function ft(l, t, a) {
    return l === a ? !0 : l === t ? (lt = l, !0) : !1;
  }
  function ot(l, t, a) {
    return l === a ? (Tl = l, !1) : l === t ? (Tl !== null && (lt = l), !0) : !1;
  }
  function Rt(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function Hl(l, t, a) {
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
  var K = Object.assign, J = /* @__PURE__ */ Symbol.for("react.element"), st = /* @__PURE__ */ Symbol.for("react.transitional.element"), tt = /* @__PURE__ */ Symbol.for("react.portal"), Zl = /* @__PURE__ */ Symbol.for("react.fragment"), Ul = /* @__PURE__ */ Symbol.for("react.strict_mode"), Zt = /* @__PURE__ */ Symbol.for("react.profiler"), ca = /* @__PURE__ */ Symbol.for("react.consumer"), Dl = /* @__PURE__ */ Symbol.for("react.context"), O = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), x = /* @__PURE__ */ Symbol.for("react.suspense_list"), cl = /* @__PURE__ */ Symbol.for("react.memo"), w = /* @__PURE__ */ Symbol.for("react.lazy"), gt = /* @__PURE__ */ Symbol.for("react.activity"), St = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), Ft = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), M = Symbol.iterator;
  function R(l) {
    return l === null || typeof l != "object" ? null : (l = M && l[M] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var W = /* @__PURE__ */ Symbol.for("react.client.reference");
  function tl(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === W ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case Zl:
        return "Fragment";
      case Zt:
        return "Profiler";
      case Ul:
        return "StrictMode";
      case B:
        return "Suspense";
      case x:
        return "SuspenseList";
      case gt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case tt:
          return "Portal";
        case Dl:
          return l.displayName || "Context";
        case ca:
          return (l._context.displayName || "Context") + ".Consumer";
        case O:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case cl:
          return t = l.displayName || null, t !== null ? t : tl(l.type) || "Memo";
        case w:
          t = l._payload, l = l._init;
          try {
            return tl(l(t));
          } catch {
          }
      }
    return null;
  }
  var ul = Array.isArray, C = il.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, G = Z.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, at = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, Eu = [], _a = -1;
  function bt(l) {
    return { current: l };
  }
  function Xl(l) {
    0 > _a || (l.current = Eu[_a], Eu[_a] = null, _a--);
  }
  function S(l, t) {
    _a++, Eu[_a] = l.current, l.current = t;
  }
  var q = bt(null), el = bt(null), hl = bt(null), pt = bt(null);
  function fn(l, t) {
    switch (S(hl, t), S(el, l), S(q, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? im(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = im(t), l = cm(t, l);
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
    Xl(q), S(q, l);
  }
  function zu() {
    Xl(q), Xl(el), Xl(hl);
  }
  function qi(l) {
    var t = l.memoizedState;
    t !== null && (oe._currentValue = t.memoizedState, S(pt, l)), t = q.current;
    var a = cm(t, l.type);
    t !== a && (S(el, l), S(q, a));
  }
  function on(l) {
    el.current === l && (Xl(q), Xl(el)), pt.current === l && (Xl(pt), oe._currentValue = at);
  }
  var Yi, Do;
  function Oa(l) {
    if (Yi === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Yi = t && t[1] || "", Do = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Yi + l + Do;
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
    return (a = l ? l.displayName || l.name : "") ? Oa(a) : "";
  }
  function ov(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return Oa(l.type);
      case 16:
        return Oa("Lazy");
      case 13:
        return l.child !== t && t !== null ? Oa("Suspense Fallback") : Oa("Suspense");
      case 19:
        return Oa("SuspenseList");
      case 0:
      case 15:
        return Xi(l.type, !1);
      case 11:
        return Xi(l.type.render, !1);
      case 1:
        return Xi(l.type, !0);
      case 31:
        return Oa("Activity");
      case 30:
        return Oa("ViewTransition");
      default:
        return "";
    }
  }
  function Mo(l) {
    try {
      var t = "", a = null;
      do
        t += ov(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Qi = Object.prototype.hasOwnProperty, Zi = A.unstable_scheduleCallback, Vi = A.unstable_cancelCallback, sv = A.unstable_shouldYield, dv = A.unstable_requestPaint, Tt = A.unstable_now, mv = A.unstable_getCurrentPriorityLevel, Uo = A.unstable_ImmediatePriority, Co = A.unstable_UserBlockingPriority, sn = A.unstable_NormalPriority, vv = A.unstable_LowPriority, Ro = A.unstable_IdlePriority, rv = A.log, yv = A.unstable_setDisableYieldValue, me = null, Et = null;
  function Na(l) {
    if (typeof rv == "function" && yv(l), Et && typeof Et.setStrictMode == "function")
      try {
        Et.setStrictMode(me, l);
      } catch {
      }
  }
  var zt = Math.clz32 ? Math.clz32 : Sv, hv = Math.log, gv = Math.LN2;
  function Sv(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (hv(l) / gv | 0) | 0;
  }
  var dn = 256, mn = 262144, vn = 4194304;
  function ka(l) {
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
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = ka(u) : (i &= c, i !== 0 ? e = ka(i) : a || (a = c & ~l, a !== 0 && (e = ka(a))))) : (c = u & ~n, c !== 0 ? e = ka(c) : i !== 0 ? e = ka(i) : a || (a = u & ~l, a !== 0 && (e = ka(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function ve(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function po(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - zt(a), e = 1 << u;
        t |= l[u], a &= ~e;
      }
    return t;
  }
  function bv(l, t) {
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
  function jo() {
    var l = vn;
    return vn <<= 1, (vn & 62914560) === 0 && (vn = 4194304), l;
  }
  function Li(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function re(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Tv(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, v = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - zt(a), z = 1 << g;
      c[g] = 0, f[g] = -1;
      var d = v[g];
      if (d !== null)
        for (v[g] = null, g = 0; g < d.length; g++) {
          var h = d[g];
          h !== null && (h.lane &= -536870913);
        }
      a &= ~z;
    }
    u !== 0 && Ho(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function Ho(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - zt(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function xo(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - zt(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Bo(l, t) {
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
  function qo() {
    var l = G.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : Lm(l.type));
  }
  function Yo(l, t) {
    var a = G.p;
    try {
      return G.p = l, t();
    } finally {
      G.p = a;
    }
  }
  var fa = Math.random().toString(36).slice(2), wl = "__reactFiber$" + fa, dt = "__reactProps$" + fa, _u = "__reactContainer$" + fa, Go = "__reactEvents$" + fa, Ev = "__reactListeners$" + fa, zv = "__reactHandles$" + fa, Xo = "__reactResources$" + fa, ye = "__reactMarker$" + fa, yn = "__reactLoad$" + fa;
  function hn(l) {
    delete l[wl], delete l[dt], delete l[Ev], delete l[zv];
  }
  function Pa(l) {
    var t;
    if (t = l[wl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[_u] || a[wl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Om(l); l !== null; ) {
            if (a = l[wl]) return a;
            l = Om(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Ou(l) {
    if (l = l[wl] || l[_u]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function he(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(y(33));
  }
  function Nu(l) {
    var t = l[Xo];
    return t || (t = l[Xo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Vl(l) {
    l[ye] = !0;
  }
  function Qo(l) {
    l[yn] = void 0;
  }
  var Zo = /* @__PURE__ */ new Set(), Vo = {};
  function lu(l, t) {
    Au(l, t), Au(l + "Capture", t);
  }
  function Au(l, t) {
    for (Vo[l] = t, l = 0; l < t.length; l++)
      Zo.add(t[l]);
  }
  var _v = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Lo = {}, Ko = {};
  function Ov(l) {
    return Qi.call(Ko, l) ? !0 : Qi.call(Lo, l) ? !1 : _v.test(l) ? Ko[l] = !0 : (Lo[l] = !0, !1);
  }
  var ol = !1;
  function Jo() {
    var l = ol;
    return ol = !1, l;
  }
  function gn(l, t, a) {
    if (Ov(t))
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
  function oa(l, t, a, u) {
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
  function _t(l) {
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
  function wo(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Nv(l, t, a) {
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
      var t = wo(l) ? "checked" : "value";
      l._valueTracker = Nv(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function $o(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = wo(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  var Av = /[\n"\\]/g;
  function jt(l) {
    return l.replace(
      Av,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function $i(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + _t(t)) : l.value !== "" + _t(t) && (l.value = "" + _t(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Fi(l, _t(l.value)) : Fi(l, _t(t)) : a != null ? Fi(l, _t(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + _t(c) : l.removeAttribute("name");
  }
  function Fo(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        wi(l);
        return;
      }
      a = a != null ? "" + _t(a) : "", t = t != null ? "" + _t(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
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
      for (a = "" + _t(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Wo(l, t, a) {
    if (t != null && (t = "" + _t(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + _t(a) : "";
  }
  function Io(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(y(92));
        if (ul(u)) {
          if (1 < u.length) throw Error(y(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = _t(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), wi(l);
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
  var Dv = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function ko(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || Dv.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function Po(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(y(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "", ol = !0);
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && (ko(l, e, u), ol = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && ko(l, n, t[n]);
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
  var Mv = /* @__PURE__ */ new Map([
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
  ]), Uv = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function bn(l) {
    return Uv.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Wt() {
  }
  var Ii = null;
  function ki(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Uu = null, Cu = null;
  function ls(l) {
    var t = Ou(l);
    if (t && (l = t.stateNode)) {
      var a = l[dt] || null;
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
              'input[name="' + jt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[dt] || null;
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
              u = a[t], u.form === l.form && $o(u);
          }
          break l;
        case "textarea":
          Wo(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Du(l, !!a.multiple, t, !1);
      }
    }
  }
  var Pi = !1;
  function ts(l, t, a) {
    if (Pi) return l(t, a);
    Pi = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (Pi = !1, (Uu !== null || Cu !== null) && (bi(), Uu && (t = Uu, l = Cu, Cu = Uu = null, ls(t), l)))
        for (t = 0; t < l.length; t++) ls(l[t]);
    }
  }
  function ge(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[dt] || null;
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
  var sa = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), lc = !1;
  if (sa)
    try {
      var Se = {};
      Object.defineProperty(Se, "passive", {
        get: function() {
          lc = !0;
        }
      }), window.addEventListener("test", Se, Se), window.removeEventListener("test", Se, Se);
    } catch {
      lc = !1;
    }
  var Aa = null, tc = null, Tn = null;
  function as() {
    if (Tn) return Tn;
    var l, t = tc, a = t.length, u, e = "value" in Aa ? Aa.value : Aa.textContent, n = e.length;
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
  function us() {
    return !1;
  }
  function et(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? zn : us, this.isPropagationStopped = us, this;
    }
    return K(t.prototype, {
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
  var Da = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, _n = et(Da), be = K({}, Da, { view: 0, detail: 0 }), Cv = et(be), ac, uc, Te, On = K({}, be, {
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
      return "movementX" in l ? l.movementX : (l !== Te && (Te && l.type === "mousemove" ? (ac = l.screenX - Te.screenX, uc = l.screenY - Te.screenY) : uc = ac = 0, Te = l), ac);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : uc;
    }
  }), es = et(On), Rv = K({}, On, { dataTransfer: 0 }), pv = et(Rv), jv = K({}, be, { relatedTarget: 0 }), ec = et(jv), Hv = K({}, Da, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), xv = et(Hv), Bv = K({}, Da, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), qv = et(Bv), Yv = K({}, Da, { data: 0 }), ns = et(Yv), Gv = {
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
  }, Xv = {
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
  }, Qv = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function Zv(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Qv[l]) ? !!t[l] : !1;
  }
  function nc() {
    return Zv;
  }
  var Vv = K({}, be, {
    key: function(l) {
      if (l.key) {
        var t = Gv[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = En(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? Xv[l.keyCode] || "Unidentified" : "";
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
  }), Lv = et(Vv), Kv = K({}, On, {
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
  }), is = et(Kv), Jv = K({}, Da, { submitter: 0 }), wv = et(Jv), $v = K({}, be, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: nc
  }), Fv = et($v), Wv = K({}, Da, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Iv = et(Wv), kv = K({}, On, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Pv = et(kv), lr = K({}, Da, {
    newState: 0,
    oldState: 0,
    source: 0
  }), tr = et(lr), ar = [9, 13, 27, 32], ic = sa && "CompositionEvent" in window, Ee = null;
  sa && "documentMode" in document && (Ee = document.documentMode);
  var ur = sa && "TextEvent" in window && !Ee, cs = sa && (!ic || Ee && 8 < Ee && 11 >= Ee), fs = " ", os = !1;
  function ss(l, t) {
    switch (l) {
      case "keyup":
        return ar.indexOf(t.keyCode) !== -1;
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
  function ds(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Ru = !1;
  function er(l, t) {
    switch (l) {
      case "compositionend":
        return ds(t);
      case "keypress":
        return t.which !== 32 ? null : (os = !0, fs);
      case "textInput":
        return l = t.data, l === fs && os ? null : l;
      default:
        return null;
    }
  }
  function nr(l, t) {
    if (Ru)
      return l === "compositionend" || !ic && ss(l, t) ? (l = as(), Tn = tc = Aa = null, Ru = !1, l) : null;
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
        return cs && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var ir = {
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
  function ms(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!ir[l.type] : t === "textarea";
  }
  function vs(l, t, a, u) {
    Uu ? Cu ? Cu.push(u) : Cu = [u] : Uu = u, t = Ni(t, "onChange"), 0 < t.length && (a = new _n(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var ze = null, _e = null;
  function cr(l) {
    lm(l, 0);
  }
  function Nn(l) {
    var t = he(l);
    if ($o(t)) return l;
  }
  function rs(l, t) {
    if (l === "change") return t;
  }
  var ys = !1;
  if (sa) {
    var cc;
    if (sa) {
      var fc = "oninput" in document;
      if (!fc) {
        var hs = document.createElement("div");
        hs.setAttribute("oninput", "return;"), fc = typeof hs.oninput == "function";
      }
      cc = fc;
    } else cc = !1;
    ys = cc && (!document.documentMode || 9 < document.documentMode);
  }
  function gs() {
    ze && (ze.detachEvent("onpropertychange", Ss), _e = ze = null);
  }
  function Ss(l) {
    if (l.propertyName === "value" && Nn(_e)) {
      var t = [];
      vs(
        t,
        _e,
        l,
        ki(l)
      ), ts(cr, t);
    }
  }
  function fr(l, t, a) {
    l === "focusin" ? (gs(), ze = t, _e = a, ze.attachEvent("onpropertychange", Ss)) : l === "focusout" && gs();
  }
  function or(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Nn(_e);
  }
  function sr(l, t) {
    if (l === "click") return Nn(t);
  }
  function dr(l, t) {
    if (l === "input" || l === "change")
      return Nn(t);
  }
  function mr(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var Ot = typeof Object.is == "function" ? Object.is : mr;
  function Oe(l, t) {
    if (Ot(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Qi.call(t, e) || !Ot(l[e], t[e]))
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
  function bs(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function Ts(l, t) {
    var a = bs(l);
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
      a = bs(a);
    }
  }
  function Es(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Es(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function zs(l) {
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
  var vr = sa && "documentMode" in document && 11 >= document.documentMode, pu = null, dc = null, Ne = null, mc = !1;
  function _s(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    mc || pu == null || pu !== oc(u) || (u = pu, "selectionStart" in u && sc(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), Ne && Oe(Ne, u) || (Ne = u, u = Ni(dc, "onSelect"), 0 < u.length && (t = new _n(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = pu)));
  }
  function tu(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var ju = {
    animationend: tu("Animation", "AnimationEnd"),
    animationiteration: tu("Animation", "AnimationIteration"),
    animationstart: tu("Animation", "AnimationStart"),
    transitionrun: tu("Transition", "TransitionRun"),
    transitionstart: tu("Transition", "TransitionStart"),
    transitioncancel: tu("Transition", "TransitionCancel"),
    transitionend: tu("Transition", "TransitionEnd")
  }, vc = {}, Os = {};
  sa && (Os = document.createElement("div").style, "AnimationEvent" in window || (delete ju.animationend.animation, delete ju.animationiteration.animation, delete ju.animationstart.animation), "TransitionEvent" in window || delete ju.transitionend.transition);
  function au(l) {
    if (vc[l]) return vc[l];
    if (!ju[l]) return l;
    var t = ju[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Os)
        return vc[l] = t[a];
    return l;
  }
  var Ns = au("animationend"), As = au("animationiteration"), Ds = au("animationstart"), rr = au("transitionrun"), yr = au("transitionstart"), hr = au("transitioncancel"), Ms = au("transitionend"), Us = /* @__PURE__ */ new Map(), rc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  rc.push("scrollEnd");
  function Vt(l, t) {
    Us.set(l, t), lu(t, [l]);
  }
  var gr = 0;
  function da(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = wt.identifierPrefix;
    var a = gr++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function Cs(l) {
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
  function ma(l, t) {
    return l = Cs(l), t = Cs(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
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
  }, Ht = [], Hu = 0, yc = 0;
  function Dn() {
    for (var l = Hu, t = yc = Hu = 0; t < l; ) {
      var a = Ht[t];
      Ht[t++] = null;
      var u = Ht[t];
      Ht[t++] = null;
      var e = Ht[t];
      Ht[t++] = null;
      var n = Ht[t];
      if (Ht[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && Rs(a, e, n);
    }
  }
  function Mn(l, t, a, u) {
    Ht[Hu++] = l, Ht[Hu++] = t, Ht[Hu++] = a, Ht[Hu++] = u, yc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function hc(l, t, a, u) {
    return Mn(l, t, a, u), Un(l);
  }
  function uu(l, t) {
    return Mn(l, null, null, t), Un(l);
  }
  function Rs(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - zt(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Un(l) {
    if (50 < we)
      throw we = 0, Si = null, Error(y(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var xu = {};
  function Sr(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function mt(l, t, a, u) {
    return new Sr(l, t, a, u);
  }
  function gc(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function va(l, t) {
    var a = l.alternate;
    return a === null ? (a = mt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function ps(l, t) {
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
      i = Jy(
        l,
        a,
        q.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case gt:
          return l = mt(31, a, t, e), l.elementType = gt, l.lanes = n, l;
        case Zl:
          return eu(a.children, e, n, t);
        case Ul:
          i = 8, e |= 24;
          break;
        case Zt:
          return l = mt(12, a, t, e | 2), l.elementType = Zt, l.lanes = n, l;
        case B:
          return l = mt(13, a, t, e), l.elementType = B, l.lanes = n, l;
        case x:
          return l = mt(19, a, t, e), l.elementType = x, l.lanes = n, l;
        case St:
        case s:
          return l = e | 32, l = mt(30, a, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof u == "object" && u !== null)
            switch (u.$$typeof) {
              case Dl:
                i = 10;
                break l;
              case ca:
                i = 9;
                break l;
              case O:
                i = 11;
                break l;
              case cl:
                i = 14;
                break l;
              case w:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            y(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = mt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function eu(l, t, a, u) {
    return l = mt(7, l, u, t), l.lanes = a, l;
  }
  function Sc(l, t, a) {
    return l = mt(6, l, null, t), l.lanes = a, l;
  }
  function js(l) {
    var t = mt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function bc(l, t, a) {
    return t = mt(
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
  var Hs = /* @__PURE__ */ new WeakMap();
  function xt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Hs.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Mo(t)
      }, Hs.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Mo(t)
    };
  }
  var Bu = [], qu = 0, Rn = null, Ae = 0, Bt = [], qt = 0, Ma = null, It = 1, kt = "";
  function ra(l, t) {
    Bu[qu++] = Ae, Bu[qu++] = Rn, Rn = l, Ae = t;
  }
  function xs(l, t, a) {
    Bt[qt++] = It, Bt[qt++] = kt, Bt[qt++] = Ma, Ma = l;
    var u = It;
    l = kt;
    var e = 32 - zt(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - zt(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, It = 1 << 32 - zt(t) + e | a << e | u, kt = n + l;
    } else
      It = 1 << n | a << e | u, kt = l;
  }
  function pn(l) {
    l.return !== null && (ra(l, 1), xs(l, 1, 0));
  }
  function Tc(l) {
    for (; l === Rn; )
      Rn = Bu[--qu], Bu[qu] = null, Ae = Bu[--qu], Bu[qu] = null;
    for (; l === Ma; )
      Ma = Bt[--qt], Bt[qt] = null, kt = Bt[--qt], Bt[qt] = null, It = Bt[--qt], Bt[qt] = null;
  }
  function Bs(l, t) {
    Bt[qt++] = It, Bt[qt++] = kt, Bt[qt++] = Ma, It = t.id, kt = t.overflow, Ma = l;
  }
  var Ll = null, _l = null, $ = !1, Ua = null, Yt = !1, Ec = Error(y(519));
  function Ca(l) {
    var t = Error(
      y(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw De(xt(t, l)), Ec;
  }
  function qs(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[wl] = l, t[dt] = u, a) {
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
        for (a = 0; a < Fe.length; a++)
          k(Fe[a], t);
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
        k("invalid", t), Fo(
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
        k("invalid", t), Io(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || em(t.textContent, a) ? (u.popover != null && (k("beforetoggle", t), k("toggle", t)), u.onScroll != null && k("scroll", t), u.onScrollEnd != null && k("scrollend", t), u.onClick != null && (t.onclick = Wt), t = !0) : t = !1, t || Ca(l, !0);
  }
  function jn(l) {
    for (Ll = l.return; Ll; )
      switch (Ll.tag) {
        case 5:
        case 31:
        case 13:
          Yt = !1;
          return;
        case 27:
        case 3:
          Yt = !0;
          return;
        default:
          Ll = Ll.return;
      }
  }
  function Yu(l) {
    if (l !== Ll) return !1;
    if (!$) return jn(l), $ = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || kf(l.type, l.memoizedProps)), a = !a), a && _l && Ca(l), jn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      _l = _m(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(317));
      _l = _m(l);
    } else
      t === 27 ? (t = _l, Ja(l.type) ? (l = co, co = null, _l = l) : _l = t) : _l = Ll ? Xt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function nu() {
    _l = Ll = null, $ = !1;
  }
  function zc() {
    var l = Ua;
    return l !== null && (yt === null ? yt = l : yt.push.apply(
      yt,
      l
    ), Ua = null), l;
  }
  function De(l) {
    Ua === null ? Ua = [l] : Ua.push(l);
  }
  var _c = bt(null), iu = null, ya = null;
  function Ra(l, t, a) {
    S(_c, t._currentValue), t._currentValue = a;
  }
  function ha(l) {
    l._currentValue = _c.current, Xl(_c);
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
  function cu(l, t, a, u) {
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
          Ot(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === pt.current) {
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
      if (!Ot(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function fu(l) {
    iu = l, ya = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function $l(l) {
    return Ys(iu, l);
  }
  function Bn(l, t) {
    return iu === null && fu(l), Ys(l, t);
  }
  function Ys(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, ya === null) {
      if (l === null) throw Error(y(308));
      ya = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else ya = ya.next = t;
    return a;
  }
  var br = typeof AbortController < "u" ? AbortController : function() {
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
  }, Tr = A.unstable_scheduleCallback, Er = A.unstable_NormalPriority, xl = {
    $$typeof: Dl,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Nc() {
    return {
      controller: new br(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Me(l) {
    l.refCount--, l.refCount === 0 && Tr(Er, function() {
      l.controller.abort();
    });
  }
  function Gs(l, t) {
    if ((l.pendingLanes & 4194048) !== 0) {
      var a = l.transitionTypes;
      for (a === null && (a = l.transitionTypes = []), l = 0; l < t.length; l++) {
        var u = t[l];
        a.indexOf(u) === -1 && a.push(u);
      }
    }
  }
  var Ue = null;
  function zr(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Ce = null, Ac = 0, ou = 0, Gu = null;
  function _r(l, t) {
    if (Ce === null) {
      var a = Ce = [];
      Ac = 0, ou = Vf(), Gu = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Ac++, t.then(Xs, Xs), t;
  }
  function Xs() {
    if (--Ac === 0 && (Ue = null, Ce !== null)) {
      Gu !== null && (Gu.status = "fulfilled");
      var l = Ce;
      Ce = null, ou = 0, Gu = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Or(l, t) {
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
  var Qs = C.S;
  C.S = function(l, t) {
    if (jd = Tt(), typeof t == "object" && t !== null && typeof t.then == "function" && _r(l, t), Ue !== null)
      for (var a = ue; a !== null; )
        Gs(a, Ue), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = ue; u !== null; )
        Gs(u, a), u = u.next;
      if (ou !== 0) {
        u = Ue, u === null && (u = Ue = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Qs !== null && Qs(l, t);
  };
  var su = bt(null);
  function Dc() {
    var l = su.current;
    return l !== null ? l : El.pooledCache;
  }
  function qn(l, t) {
    t === null ? S(su, su.current) : S(su, t.pool);
  }
  function Zs() {
    var l = Dc();
    return l === null ? null : { parent: xl._currentValue, pool: l };
  }
  var Xu = Error(y(460)), Mc = Error(y(474)), Yn = Error(y(542)), Gn = { then: function() {
  } };
  function Vs(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Ls(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Wt, Wt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Js(l), l === void 0 && !("reason" in t) ? Error(y(600)) : l;
      default:
        if (typeof t.status == "string") t.then(Wt, Wt);
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
            throw l = t.reason, Js(l), l;
        }
        throw mu = t, Xu;
    }
  }
  function du(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (mu = a, Xu) : a;
    }
  }
  var mu = null;
  function Ks() {
    if (mu === null) throw Error(y(459));
    var l = mu;
    return mu = null, l;
  }
  function Js(l) {
    if (l === Xu || l === Yn)
      throw Error(y(483));
  }
  var Qu = null, Re = 0;
  function Xn(l) {
    var t = Re;
    return Re += 1, Qu === null && (Qu = []), Ls(Qu, l, t);
  }
  function pa(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Qn(l, t) {
    throw t.$$typeof === J ? Error(y(525)) : (l = Object.prototype.toString.call(t), Error(
      y(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function ws(l) {
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
      return m = va(m, o), m.index = 0, m.sibling = null, m;
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
      return D === Zl ? (m = g(
        m,
        o,
        r.props.children,
        E,
        r.key
      ), pa(m, r), m) : o !== null && (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === w && du(D) === o.type) ? (o = e(o, r.props), pa(o, r), o.return = m, o) : (o = Cn(
        r.type,
        r.key,
        r.props,
        null,
        m.mode,
        E
      ), pa(o, r), o.return = m, o);
    }
    function v(m, o, r, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== r.containerInfo || o.stateNode.implementation !== r.implementation ? (o = bc(r, m.mode, E), o.return = m, o) : (o = e(o, r.children || []), o.return = m, o);
    }
    function g(m, o, r, E, D) {
      return o === null || o.tag !== 7 ? (o = eu(
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
          case st:
            return r = Cn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              r
            ), pa(r, o), r.return = m, r;
          case tt:
            return o = bc(
              o,
              m.mode,
              r
            ), o.return = m, o;
          case w:
            return o = du(o), z(m, o, r);
        }
        if (ul(o) || R(o))
          return o = eu(
            o,
            m.mode,
            r,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, Xn(o), r);
        if (o.$$typeof === Dl)
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
          case st:
            return r.key === D ? f(m, o, r, E) : null;
          case tt:
            return r.key === D ? v(m, o, r, E) : null;
          case w:
            return r = du(r), d(m, o, r, E);
        }
        if (ul(r) || R(r))
          return D !== null ? null : g(m, o, r, E, null);
        if (typeof r.then == "function")
          return d(
            m,
            o,
            Xn(r),
            E
          );
        if (r.$$typeof === Dl)
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
          case st:
            return m = m.get(
              E.key === null ? r : E.key
            ) || null, f(o, m, E, D);
          case tt:
            return m = m.get(
              E.key === null ? r : E.key
            ) || null, v(o, m, E, D);
          case w:
            return E = du(E), h(
              m,
              o,
              r,
              E,
              D
            );
        }
        if (ul(E) || R(E))
          return m = m.get(r) || null, g(o, m, E, D, null);
        if (typeof E.then == "function")
          return h(
            m,
            o,
            r,
            Xn(E),
            D
          );
        if (E.$$typeof === Dl)
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
      for (var D = null, ll = null, p = o, Y = o = 0, Yl = null; p !== null && Y < r.length; Y++) {
        p.index > Y ? (Yl = p, p = null) : Yl = p.sibling;
        var nl = d(
          m,
          p,
          r[Y],
          E
        );
        if (nl === null) {
          p === null && (p = Yl);
          break;
        }
        l && p && nl.alternate === null && t(m, p), o = n(nl, o, Y), ll === null ? D = nl : ll.sibling = nl, ll = nl, p = Yl;
      }
      if (Y === r.length)
        return a(m, p), $ && ra(m, Y), D;
      if (p === null) {
        for (; Y < r.length; Y++)
          p = z(m, r[Y], E), p !== null && (o = n(
            p,
            o,
            Y
          ), ll === null ? D = p : ll.sibling = p, ll = p);
        return $ && ra(m, Y), D;
      }
      for (p = u(p); Y < r.length; Y++)
        Yl = h(
          p,
          m,
          Y,
          r[Y],
          E
        ), Yl !== null && (l && (nl = Yl.alternate, nl !== null && p.delete(nl.key === null ? Y : nl.key)), o = n(
          Yl,
          o,
          Y
        ), ll === null ? D = Yl : ll.sibling = Yl, ll = Yl);
      return l && p.forEach(function(Ia) {
        return t(m, Ia);
      }), $ && ra(m, Y), D;
    }
    function U(m, o, r, E) {
      if (r == null) throw Error(y(151));
      for (var D = null, ll = null, p = o, Y = o = 0, Yl = null, nl = r.next(); p !== null && !nl.done; Y++, nl = r.next()) {
        p.index > Y ? (Yl = p, p = null) : Yl = p.sibling;
        var Ia = d(m, p, nl.value, E);
        if (Ia === null) {
          p === null && (p = Yl);
          break;
        }
        l && p && Ia.alternate === null && t(m, p), o = n(Ia, o, Y), ll === null ? D = Ia : ll.sibling = Ia, ll = Ia, p = Yl;
      }
      if (nl.done)
        return a(m, p), $ && ra(m, Y), D;
      if (p === null) {
        for (; !nl.done; Y++, nl = r.next())
          nl = z(m, nl.value, E), nl !== null && (o = n(nl, o, Y), ll === null ? D = nl : ll.sibling = nl, ll = nl);
        return $ && ra(m, Y), D;
      }
      for (p = u(p); !nl.done; Y++, nl = r.next())
        nl = h(p, m, Y, nl.value, E), nl !== null && (l && (Yl = nl.alternate, Yl !== null && p.delete(
          Yl.key === null ? Y : Yl.key
        )), o = n(nl, o, Y), ll === null ? D = nl : ll.sibling = nl, ll = nl);
      return l && p.forEach(function(eh) {
        return t(m, eh);
      }), $ && ra(m, Y), D;
    }
    function L(m, o, r, E) {
      if (typeof r == "object" && r !== null && r.type === Zl && r.key === null && r.props.ref === void 0 && (r = r.props.children), typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case st:
            l: {
              for (var D = r.key; o !== null; ) {
                if (o.key === D) {
                  if (D = r.type, D === Zl) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), E = e(
                        o,
                        r.props.children
                      ), pa(E, r), E.return = m, m = E;
                      break l;
                    }
                  } else if (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === w && du(D) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, r.props), pa(E, r), E.return = m, m = E;
                    break l;
                  }
                  a(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              r.type === Zl ? (E = eu(
                r.props.children,
                m.mode,
                E,
                r.key
              ), pa(E, r), E.return = m, m = E) : (E = Cn(
                r.type,
                r.key,
                r.props,
                null,
                m.mode,
                E
              ), pa(E, r), E.return = m, m = E);
            }
            return i(m);
          case tt:
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
          case w:
            return r = du(r), L(
              m,
              o,
              r,
              E
            );
        }
        if (ul(r))
          return N(
            m,
            o,
            r,
            E
          );
        if (R(r)) {
          if (D = R(r), typeof D != "function") throw Error(y(150));
          return r = D.call(r), U(
            m,
            o,
            r,
            E
          );
        }
        if (typeof r.then == "function")
          return L(
            m,
            o,
            Xn(r),
            E
          );
        if (r.$$typeof === Dl)
          return L(
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
        Re = 0;
        var D = L(
          m,
          o,
          r,
          E
        );
        return Qu = null, D;
      } catch (p) {
        if (p === Xu || p === Yn) throw p;
        var ll = mt(29, p, null, m.mode);
        return ll.lanes = E, ll.return = m, ll;
      }
    };
  }
  var vu = ws(!0), $s = ws(!1), ja = !1;
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
  function Ha(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function xa(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (sl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Un(l), Rs(l, null, a), t;
    }
    return Mn(l, u, t, a), Un(l);
  }
  function pe(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, xo(l, a);
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
  function je() {
    if (pc) {
      var l = Gu;
      if (l !== null) throw l;
    }
  }
  function He(l, t, a, u) {
    pc = !1;
    var e = l.updateQueue;
    ja = !1;
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
          d !== 0 && d === ou && (pc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var N = l, U = c;
            d = t;
            var L = a;
            switch (U.tag) {
              case 1:
                if (N = U.payload, typeof N == "function") {
                  z = N.call(L, z, d);
                  break l;
                }
                z = N;
                break l;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = U.payload, d = typeof N == "function" ? N.call(L, z, d) : N, d == null) break l;
                z = K({}, z, d);
                break l;
              case 2:
                ja = !0;
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
      g === null && (f = z), e.baseState = f, e.firstBaseUpdate = v, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), Za |= i, l.lanes = i, l.memoizedState = z;
    }
  }
  function Fs(l, t) {
    if (typeof l != "function")
      throw Error(y(191, l));
    l.call(t);
  }
  function Ws(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Fs(a[l], t);
  }
  var Ba = bt(null), Zn = bt(0);
  function Is(l, t) {
    l = Ea, S(Zn, l), S(Ba, t), Ea = l | t.baseLanes;
  }
  function jc() {
    S(Zn, Ea), S(Ba, Ba.current);
  }
  function Hc() {
    Ea = Zn.current, Xl(Ba), Xl(Zn);
  }
  var Fl = bt(null), ut = null;
  function qa(l) {
    var t = l.alternate;
    S(Wl, Wl.current & 1), S(Fl, l), ut === null && (t === null || Ba.current !== null || t.memoizedState !== null) && (ut = l);
  }
  function xc(l) {
    S(Wl, Wl.current), S(Fl, l), ut === null && (ut = l);
  }
  function ks(l) {
    l.tag === 22 ? (S(Wl, Wl.current), S(Fl, l), ut === null && (ut = l)) : Ya();
  }
  function Ya() {
    S(Wl, Wl.current), S(Fl, Fl.current);
  }
  function Nt(l) {
    Xl(Fl), ut === l && (ut = null), Xl(Wl);
  }
  var Wl = bt(0);
  function xe(l, t) {
    S(Fl, Fl.current), S(Wl, t);
  }
  function Bc(l) {
    Xl(Wl), Xl(Fl), ut === l && (ut = null);
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
  var ga = 0, V = null, gl = null, Bl = null, Ln = !1, Zu = !1, ru = !1, Kn = 0, Be = 0, Vu = null, Nr = 0;
  function Cl() {
    throw Error(y(321));
  }
  function qc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!Ot(l[a], t[a])) return !1;
    return !0;
  }
  function Yc(l, t, a, u, e, n) {
    return ga = n, V = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, C.H = l === null || l.memoizedState === null ? x0 : B0, ru = !1, n = a(u, e), ru = !1, Zu && (n = l0(
      t,
      a,
      u,
      e
    )), Ps(l), n;
  }
  function Ps(l) {
    C.H = kn;
    var t = gl !== null && gl.next !== null;
    if (ga = 0, Bl = gl = V = null, Ln = !1, Be = 0, Vu = null, t) throw Error(y(300));
    l === null || ql || (l = l.dependencies, l !== null && xn(l) && (ql = !0));
  }
  function l0(l, t, a, u) {
    V = l;
    var e = 0;
    do {
      if (Zu && (Vu = null), Be = 0, Zu = !1, 25 <= e) throw Error(y(301));
      if (e += 1, Bl = gl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      C.H = jr, n = t(a, u);
    } while (Zu);
    return n;
  }
  function Ar() {
    var l = C.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? qe(t) : t, l = l.useState()[0], (gl !== null ? gl.memoizedState : null) !== l && (V.flags |= 1024), t;
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
    ga = 0, Bl = gl = V = null, Zu = !1, Be = Kn = 0, Vu = null;
  }
  function nt() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Bl === null ? V.memoizedState = Bl = l : Bl = Bl.next = l, Bl;
  }
  function jl() {
    if (gl === null) {
      var l = V.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = gl.next;
    var t = Bl === null ? V.memoizedState : Bl.next;
    if (t !== null)
      Bl = t, gl = l;
    else {
      if (l === null)
        throw V.alternate === null ? Error(y(467)) : Error(y(310));
      gl = l, l = {
        memoizedState: gl.memoizedState,
        baseState: gl.baseState,
        baseQueue: gl.baseQueue,
        queue: gl.queue,
        next: null
      }, Bl === null ? V.memoizedState = Bl = l : Bl = Bl.next = l;
    }
    return Bl;
  }
  function Jn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function qe(l) {
    var t = Be;
    return Be += 1, Vu === null && (Vu = []), l = Ls(Vu, l, t), t = V, (Bl === null ? t.memoizedState : Bl.next) === null && (t = t.alternate, C.H = t === null || t.memoizedState === null ? x0 : B0), l;
  }
  function wn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return qe(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Dl) return $l(l);
    }
    throw Error(y(438, String(l)));
  }
  function Zc(l) {
    var t = null, a = V.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = V.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Jn(), V.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = Ft;
    return t.index++, a;
  }
  function Sa(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function $n(l) {
    var t = jl();
    return Vc(t, gl, l);
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
        if (z !== v.lane ? (P & z) === z : (ga & z) === z) {
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
            }), z === ou && (g = !0);
          else if ((ga & d) === d) {
            v = v.next, d === ou && (g = !0);
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
            }, f === null ? (c = f = z, i = n) : f = f.next = z, V.lanes |= d, Za |= d;
          z = v.action, ru && a(n, z), n = v.hasEagerState ? v.eagerState : a(n, z);
        } else
          d = {
            lane: z,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = d, i = n) : f = f.next = d, V.lanes |= z, Za |= z;
        v = v.next;
      } while (v !== null && v !== t);
      if (f === null ? i = n : f.next = c, !Ot(n, l.memoizedState) && (ql = !0, g && (a = Gu, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function Lc(l) {
    var t = jl(), a = t.queue;
    if (a === null) throw Error(y(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      Ot(n, t.memoizedState) || (ql = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function t0(l, t, a) {
    var u = V, e = jl(), n = $;
    if (n) {
      if (a === void 0) throw Error(y(407));
      a = a();
    } else a = t();
    var i = !Ot(
      (gl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, ql = !0), e = e.queue, wc(e0.bind(null, u, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || Bl !== null && (Bl.memoizedState.tag & 1) !== 0, Lu(
      l ? 9 : 8,
      { destroy: void 0 },
      u0.bind(null, u, e, a, t),
      null
    ), l) {
      if (u.flags |= 2048, El === null) throw Error(y(349));
      n || (ga & 127) !== 0 || a0(u, t, a);
    }
    return a;
  }
  function a0(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = V.updateQueue, t === null ? (t = Jn(), V.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function u0(l, t, a, u) {
    t.value = a, t.getSnapshot = u, n0(t) && i0(l);
  }
  function e0(l, t, a) {
    return a(function() {
      n0(t) && i0(l);
    });
  }
  function n0(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !Ot(l, a);
    } catch {
      return !0;
    }
  }
  function i0(l) {
    var t = uu(l, 2);
    t !== null && ht(t, l, 2);
  }
  function Kc(l) {
    var t = nt();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), ru) {
        Na(!0);
        try {
          a();
        } finally {
          Na(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Sa,
      lastRenderedState: l
    }, t;
  }
  function c0(l, t, a, u) {
    return l.baseState = a, Vc(
      l,
      gl,
      typeof u == "function" ? u : Sa
    );
  }
  function Dr(l, t, a, u, e) {
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
      C.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, f0(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function f0(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = C.T, i = {};
      i.types = n !== null ? n.types : null, C.T = i;
      try {
        var c = a(e, u), f = C.S;
        f !== null && f(i, c), o0(l, t, c);
      } catch (v) {
        Jc(l, t, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), C.T = n;
      }
    } else
      try {
        n = a(e, u), o0(l, t, n);
      } catch (v) {
        Jc(l, t, v);
      }
  }
  function o0(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        s0(l, t, u);
      },
      function(u) {
        return Jc(l, t, u);
      }
    ) : s0(l, t, a);
  }
  function s0(l, t, a) {
    t.status = "fulfilled", t.value = a, d0(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, f0(l, a)));
  }
  function Jc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, d0(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function d0(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function m0(l, t) {
    return t;
  }
  function v0(l, t) {
    if ($) {
      var a = El.formState;
      if (a !== null) {
        l: {
          var u = V;
          if ($) {
            if (_l) {
              t: {
                for (var e = _l, n = Yt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Xt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                _l = Xt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            Ca(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = nt(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: m0,
      lastRenderedState: t
    }, a.queue = u, a = p0.bind(
      null,
      V,
      u
    ), u.dispatch = a, u = Kc(!1), n = kc.bind(
      null,
      V,
      !1,
      u.queue
    ), u = nt(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = Dr.bind(
      null,
      V,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function r0(l) {
    var t = jl();
    return y0(t, gl, l);
  }
  function y0(l, t, a) {
    if (t = Vc(
      l,
      t,
      m0
    )[0], l = $n(Sa)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = qe(t);
      } catch (i) {
        throw i === Xu ? Yn : i;
      }
    else u = t;
    t = jl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (V.flags |= 2048, Lu(
      9,
      { destroy: void 0 },
      Mr.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Mr(l, t) {
    l.action = t;
  }
  function h0(l) {
    var t = jl(), a = gl;
    if (a !== null)
      return y0(t, a, l);
    jl(), t = t.memoizedState, a = jl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Lu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = V.updateQueue, t === null && (t = Jn(), V.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function g0() {
    return jl().memoizedState;
  }
  function Fn(l, t, a, u) {
    var e = nt();
    V.flags |= l, e.memoizedState = Lu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function Wn(l, t, a, u) {
    var e = jl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    gl !== null && u !== null && qc(u, gl.memoizedState.deps) ? e.memoizedState = Lu(t, n, a, u) : (V.flags |= l, e.memoizedState = Lu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function S0(l, t) {
    Fn(8390656, 8, l, t);
  }
  function wc(l, t) {
    Wn(2048, 8, l, t);
  }
  function Ur(l) {
    V.flags |= 4;
    var t = V.updateQueue;
    if (t === null)
      t = Jn(), V.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function b0(l) {
    var t = jl().memoizedState;
    return Ur({ ref: t, nextImpl: l }), function() {
      if ((sl & 2) !== 0) throw Error(y(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function T0(l, t) {
    return Wn(4, 2, l, t);
  }
  function E0(l, t) {
    return Wn(4, 4, l, t);
  }
  function z0(l, t) {
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
  function _0(l, t, a) {
    a = a != null ? a.concat([l]) : null, Wn(4, 4, z0.bind(null, t, l), a);
  }
  function $c() {
  }
  function O0(l, t) {
    var a = jl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && qc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function N0(l, t) {
    var a = jl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && qc(t, u[1]))
      return u[0];
    if (u = l(), ru) {
      Na(!0);
      try {
        l();
      } finally {
        Na(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function Fc(l, t, a) {
    return a === void 0 || (ga & 1073741824) !== 0 && (P & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = xd(), V.lanes |= l, Za |= l, a);
  }
  function A0(l, t, a, u) {
    return Ot(a, t) ? a : Ba.current !== null ? (l = Fc(l, a, u), Ot(l, t) || (ql = !0), l) : (ga & 106) === 0 || (ga & 1073741824) !== 0 && (P & 261930) === 0 ? (ql = !0, l.memoizedState = a) : (l = xd(), V.lanes |= l, Za |= l, t);
  }
  function D0(l, t, a, u, e) {
    var n = G.p;
    G.p = n !== 0 && 8 > n ? n : 8;
    var i = C.T, c = {};
    c.types = i !== null ? i.types : null, C.T = c, kc(l, !1, t, a);
    try {
      var f = e(), v = C.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Or(
          f,
          u
        );
        Ye(
          l,
          t,
          g,
          Ut(l)
        );
      } else
        Ye(
          l,
          t,
          u,
          Ut(l)
        );
    } catch (z) {
      Ye(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: z },
        Ut()
      );
    } finally {
      G.p = n, i !== null && c.types !== null && (i.types = c.types), C.T = i;
    }
  }
  function Cr() {
  }
  function Wc(l, t, a, u) {
    if (l.tag !== 5) throw Error(y(476));
    var e = M0(l).queue;
    D0(
      l,
      e,
      t,
      at,
      a === null ? Cr : function() {
        return U0(l), a(u);
      }
    );
  }
  function M0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: at,
      baseState: at,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Sa,
        lastRenderedState: at
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
        lastRenderedReducer: Sa,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function U0(l) {
    var t = M0(l);
    t.next === null && (t = l.alternate.memoizedState), Ye(
      l,
      t.next.queue,
      {},
      Ut()
    );
  }
  function Ic() {
    return $l(oe);
  }
  function C0() {
    return jl().memoizedState;
  }
  function R0() {
    return jl().memoizedState;
  }
  function Rr(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Ut();
          l = Ha(a);
          var u = xa(t, l, a);
          u !== null && (ht(u, t, a), pe(u, t, a)), t = { cache: Nc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function pr(l, t, a) {
    var u = Ut();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l) ? j0(t, a) : (a = hc(l, t, a, u), a !== null && (ht(a, l, u), H0(a, t, u)));
  }
  function p0(l, t, a) {
    var u = Ut();
    Ye(l, t, a, u);
  }
  function Ye(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (In(l)) j0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, Ot(c, i))
            return Mn(l, t, e, 0), El === null && Dn(), !1;
        } catch {
        }
      if (a = hc(l, t, e, u), a !== null)
        return ht(a, l, u), H0(a, t, u), !0;
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
      ), t !== null && ht(t, l, 2);
  }
  function In(l) {
    var t = l.alternate;
    return l === V || t !== null && t === V;
  }
  function j0(l, t) {
    Zu = Ln = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function H0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, xo(l, a);
    }
  }
  var kn = {
    readContext: $l,
    use: wn,
    useCallback: Cl,
    useContext: Cl,
    useEffect: Cl,
    useImperativeHandle: Cl,
    useLayoutEffect: Cl,
    useInsertionEffect: Cl,
    useMemo: Cl,
    useReducer: Cl,
    useRef: Cl,
    useState: Cl,
    useDebugValue: Cl,
    useDeferredValue: Cl,
    useTransition: Cl,
    useSyncExternalStore: Cl,
    useId: Cl,
    useHostTransitionStatus: Cl,
    useFormState: Cl,
    useActionState: Cl,
    useOptimistic: Cl,
    useMemoCache: Cl,
    useCacheRefresh: Cl,
    useEffectEvent: Cl
  }, x0 = {
    readContext: $l,
    use: wn,
    useCallback: function(l, t) {
      return nt().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: $l,
    useEffect: S0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, Fn(
        4194308,
        4,
        z0.bind(null, t, l),
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
      var a = nt();
      t = t === void 0 ? null : t;
      var u = l();
      if (ru) {
        Na(!0);
        try {
          l();
        } finally {
          Na(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = nt();
      if (a !== void 0) {
        var e = a(t);
        if (ru) {
          Na(!0);
          try {
            a(t);
          } finally {
            Na(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = pr.bind(
        null,
        V,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = nt();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Kc(l);
      var t = l.queue, a = p0.bind(null, V, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = nt();
      return Fc(a, l, t);
    },
    useTransition: function() {
      var l = Kc(!1);
      return l = D0.bind(
        null,
        V,
        l.queue,
        !0,
        !1
      ), nt().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = V, e = nt();
      if ($) {
        if (a === void 0)
          throw Error(y(407));
        a = a();
      } else {
        if (a = t(), El === null)
          throw Error(y(349));
        (P & 127) !== 0 || a0(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, S0(e0.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Lu(
        9,
        { destroy: void 0 },
        u0.bind(
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
      var l = nt(), t = El.identifierPrefix;
      if ($) {
        var a = kt, u = It;
        a = (u & ~(1 << 32 - zt(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Kn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Nr++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: Ic,
    useFormState: v0,
    useActionState: v0,
    useOptimistic: function(l) {
      var t = nt();
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
        V,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Zc,
    useCacheRefresh: function() {
      return nt().memoizedState = Rr.bind(
        null,
        V
      );
    },
    useEffectEvent: function(l) {
      var t = nt(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((sl & 2) !== 0)
          throw Error(y(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, B0 = {
    readContext: $l,
    use: wn,
    useCallback: O0,
    useContext: $l,
    useEffect: wc,
    useImperativeHandle: _0,
    useInsertionEffect: T0,
    useLayoutEffect: E0,
    useMemo: N0,
    useReducer: $n,
    useRef: g0,
    useState: function() {
      return $n(Sa);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = jl();
      return A0(
        a,
        gl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = $n(Sa)[0], t = jl().memoizedState;
      return [
        typeof l == "boolean" ? l : qe(l),
        t
      ];
    },
    useSyncExternalStore: t0,
    useId: C0,
    useHostTransitionStatus: Ic,
    useFormState: r0,
    useActionState: r0,
    useOptimistic: function(l, t) {
      var a = jl();
      return c0(a, gl, l, t);
    },
    useMemoCache: Zc,
    useCacheRefresh: R0,
    useEffectEvent: b0
  }, jr = {
    readContext: $l,
    use: wn,
    useCallback: O0,
    useContext: $l,
    useEffect: wc,
    useImperativeHandle: _0,
    useInsertionEffect: T0,
    useLayoutEffect: E0,
    useMemo: N0,
    useReducer: Lc,
    useRef: g0,
    useState: function() {
      return Lc(Sa);
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = jl();
      return gl === null ? Fc(a, l, t) : A0(
        a,
        gl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Lc(Sa)[0], t = jl().memoizedState;
      return [
        typeof l == "boolean" ? l : qe(l),
        t
      ];
    },
    useSyncExternalStore: t0,
    useId: C0,
    useHostTransitionStatus: Ic,
    useFormState: h0,
    useActionState: h0,
    useOptimistic: function(l, t) {
      var a = jl();
      return gl !== null ? c0(a, gl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Zc,
    useCacheRefresh: R0,
    useEffectEvent: b0
  };
  function Pc(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : K({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var lf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = Ut(), e = Ha(u);
      e.payload = t, a != null && (e.callback = a), t = xa(l, e, u), t !== null && (ht(t, l, u), pe(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = Ut(), e = Ha(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = xa(l, e, u), t !== null && (ht(t, l, u), pe(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = Ut(), u = Ha(a);
      u.tag = 2, t != null && (u.callback = t), t = xa(l, u, a), t !== null && (ht(t, l, a), pe(t, l, a));
    }
  };
  function q0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Oe(a, u) || !Oe(e, n) : !0;
  }
  function Y0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && lf.enqueueReplaceState(t, t.state, null);
  }
  function yu(l, t) {
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
  function G0(l) {
    An(l);
  }
  function X0(l) {
    console.error(l);
  }
  function Q0(l) {
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
  function Z0(l, t, a) {
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
    return a = Ha(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      Pn(l, t);
    }, a;
  }
  function V0(l) {
    return l = Ha(l), l.tag = 3, l;
  }
  function L0(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        Z0(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Z0(t, a, u), typeof e != "function" && (Va === null ? Va = /* @__PURE__ */ new Set([this]) : Va.add(this));
      var c = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Hr(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && cu(
        t,
        a,
        e,
        !0
      ), a = Fl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return ut === null ? Ti() : a.alternate === null && Rl === 0 && (Rl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Xf(l, u, e)), !1;
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
    if ($)
      return t = Fl.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Ec && (l = Error(y(422), { cause: u }), De(xt(l, a)))) : (u !== Ec && (t = Error(y(423), {
        cause: u
      }), De(
        xt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = xt(u, a), e = tf(
        l.stateNode,
        u,
        e
      ), Rc(l, e), Rl !== 4 && (Rl = 2)), !1;
    var n = Error(y(520), { cause: u });
    if (n = xt(n, a), Je === null ? Je = [n] : Je.push(n), Rl !== 4 && (Rl = 2), t === null) return !0;
    u = xt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = tf(a.stateNode, u, l), Rc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Va === null || !Va.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = V0(e), L0(
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
  var af = Error(y(461)), ql = !1;
  function Ql(l, t, a, u) {
    t.child = l === null ? $s(t, null, a, u) : vu(
      t,
      l.child,
      a,
      u
    );
  }
  function K0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var c in u)
        c !== "ref" && (i[c] = u[c]);
    } else i = u;
    return fu(t), u = Yc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = Gc(), l !== null && !ql ? (Xc(l, t, e), ba(l, t, e)) : ($ && c && pn(t), t.flags |= 1, Ql(l, t, u, e), t.child);
  }
  function J0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !gc(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, w0(
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
      if (a = a.compare, a = a !== null ? a : Oe, a(i, u) && l.ref === t.ref)
        return ba(l, t, e);
    }
    return t.flags |= 1, l = va(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function w0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Oe(n, u) && l.ref === t.ref)
        if (ql = !1, t.pendingProps = u = n, df(l, e))
          (l.flags & 131072) !== 0 && (ql = !0);
        else
          return t.lanes = l.lanes, ba(l, t, e);
    }
    return uf(
      l,
      t,
      a,
      u,
      e
    );
  }
  function $0(l, t, a, u) {
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
        return F0(
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
        ), n !== null ? Is(t, n) : jc(), ks(t);
      else
        return u = t.lanes = 536870912, F0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (qn(t, n.cachePool), Is(t, n), Ya(), t.memoizedState = null) : (l !== null && qn(t, null), jc(), Ya());
    return Ql(l, t, e, a), t.child;
  }
  function Ge(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function F0(l, t, a, u, e) {
    var n = Dc();
    return n = n === null ? null : { parent: xl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && qn(t, null), jc(), ks(t), l !== null && cu(l, t, u, !0), t.childLanes = e, null;
  }
  function li(l, t) {
    return t = ti(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function W0(l, t, a) {
    return vu(t, l.child, null, a), l = li(t, t.pendingProps), l.flags |= 2, Nt(t), t.memoizedState = null, l;
  }
  function xr(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if ($) {
        if (u.mode === "hidden")
          return l = li(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Ge(null, l);
        if (xc(t), (l = _l) ? (l = zm(
          l,
          Yt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ma !== null ? { id: It, overflow: kt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = js(l), a.return = t, t.child = a, Ll = t, _l = null)) : l = null, l === null) throw Ca(t);
        return t.lanes = 536870912, null;
      }
      return li(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (xc(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = W0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(y(558));
      else if (ql || cu(l, t, a, !1), e = (a & l.childLanes) !== 0, ql || e) {
        if (Ba.current === null) {
          if (u = El, u !== null && (i = Bo(u, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, uu(l, i), ht(u, l, i), af;
          Ti();
        }
        t = W0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, _l = Xt(i.nextSibling), Ll = t, $ = !0, Ua = null, Yt = !1, l !== null && Bs(t, l), t = li(t, u), t.flags |= 134221824;
      return t;
    }
    return l = va(l.child, {
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
    return fu(t), a = Yc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Gc(), l !== null && !ql ? (Xc(l, t, e), ba(l, t, e)) : ($ && u && pn(t), t.flags |= 1, Ql(l, t, a, e), t.child);
  }
  function I0(l, t, a, u, e, n) {
    return fu(t), t.updateQueue = null, a = l0(
      t,
      u,
      a,
      e
    ), Ps(l), u = Gc(), l !== null && !ql ? (Xc(l, t, n), ba(l, t, n)) : ($ && u && pn(t), t.flags |= 1, Ql(l, t, a, n), t.child);
  }
  function k0(l, t, a, u, e) {
    if (fu(t), t.stateNode === null) {
      var n = xu, i = a.contextType;
      typeof i == "object" && i !== null && (n = $l(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = lf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Uc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? $l(i) : xu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (Pc(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && lf.enqueueReplaceState(n, n.state, null), He(t, u, n, e), je(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = yu(a, c);
      n.props = f;
      var v = n.context, g = a.contextType;
      i = xu, typeof g == "object" && g !== null && (i = $l(g));
      var z = a.getDerivedStateFromProps;
      g = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || v !== i) && Y0(
        t,
        n,
        u,
        i
      ), ja = !1;
      var d = t.memoizedState;
      n.state = d, He(t, u, n, e), je(), v = t.memoizedState, c || d !== v || ja ? (typeof z == "function" && (Pc(
        t,
        a,
        z,
        u
      ), v = t.memoizedState), (f = ja || q0(
        t,
        a,
        f,
        u,
        d,
        v,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = v), n.props = u, n.state = v, n.context = i, u = f) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Cc(l, t), i = t.memoizedProps, g = yu(a, i), n.props = g, z = t.pendingProps, d = n.context, v = a.contextType, f = xu, typeof v == "object" && v !== null && (f = $l(v)), c = a.getDerivedStateFromProps, (v = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || d !== f) && Y0(
        t,
        n,
        u,
        f
      ), ja = !1, d = t.memoizedState, n.state = d, He(t, u, n, e), je();
      var h = t.memoizedState;
      i !== z || d !== h || ja || l !== null && l.dependencies !== null && xn(l.dependencies) ? (typeof c == "function" && (Pc(
        t,
        a,
        c,
        u
      ), h = t.memoizedState), (g = ja || q0(
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
    return n = u, Ku(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = vu(
      t,
      l.child,
      null,
      e
    ), t.child = vu(
      t,
      null,
      a,
      e
    )) : Ql(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = ba(
      l,
      t,
      e
    ), l;
  }
  function P0(l, t, a, u) {
    return nu(), t.flags |= 256, Ql(l, t, a, u), t.child;
  }
  var ef = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function nf(l) {
    return { baseLanes: l, cachePool: Zs() };
  }
  function cf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= Mt), l;
  }
  function ld(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Wl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if ($) {
        if (e ? qa(t) : Ya(), (l = _l) ? (l = zm(
          l,
          Yt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ma !== null ? { id: It, overflow: kt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = js(l), a.return = t, t.child = a, Ll = t, _l = null)) : l = null, l === null) throw Ca(t);
        return io(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = u.children, u = u.fallback, e ? (Ya(), e = t.mode, n = ti(
        { mode: "hidden", children: n },
        e
      ), u = eu(
        u,
        e,
        a,
        null
      ), n.return = t, u.return = t, n.sibling = u, t.child = n, u = t.child, u.memoizedState = nf(a), u.childLanes = cf(
        l,
        i,
        a
      ), t.memoizedState = ef, Ge(null, u)) : (qa(t), ff(t, n));
    }
    var c = l.memoizedState;
    if (c !== null) {
      var f = c.dehydrated;
      if (f !== null)
        return Br(
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
    return e ? (Ya(), e = u.fallback, n = t.mode, c = l.child, f = c.sibling, u = va(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? e = va(f, e) : (e = eu(
      e,
      n,
      a,
      null
    ), e.flags |= 2), e.return = t, u.return = t, u.sibling = e, t.child = u, Ge(null, u), u = t.child, e = l.child.memoizedState, e === null ? e = nf(a) : (n = e.cachePool, n !== null ? (c = xl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Zs(), e = {
      baseLanes: e.baseLanes | a,
      cachePool: n
    }), u.memoizedState = e, u.childLanes = cf(
      l,
      i,
      a
    ), t.memoizedState = ef, Ge(l.child, u)) : (qa(t), a = l.child, l = a.sibling, a = va(a, {
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
    return l = mt(22, l, null, t), l.lanes = 0, l;
  }
  function ai(l, t, a) {
    return vu(t, l.child, null, a), l = ff(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Br(l, t, a, u, e, n, i, c) {
    if (a)
      return t.flags & 256 ? (qa(t), t.flags &= -257, ai(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Ya(), t.child = l.child, t.flags |= 128, null) : (Ya(), n = e.fallback, i = t.mode, e = ti(
        { mode: "visible", children: e.children },
        i
      ), n = eu(
        n,
        i,
        c,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, vu(t, l.child, null, c), e = t.child, e.memoizedState = nf(c), e.childLanes = cf(
        l,
        u,
        c
      ), t.memoizedState = ef, Ge(null, e));
    if (qa(t), io(n)) {
      if (u = n.nextSibling && n.nextSibling.dataset, u) var f = u.dgst;
      return u = f, u !== "" && (e = Error(y(419)), e.stack = "", e.digest = u, De({ value: e, source: null, stack: null })), ai(
        l,
        t,
        c
      );
    }
    if (ql || cu(l, t, c, !1), u = (c & l.childLanes) !== 0, ql || u) {
      if (Ba.current !== null)
        return ai(
          l,
          t,
          c
        );
      if (u = El, u !== null && (e = Bo(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, uu(l, e), ht(u, l, e), af;
      return no(n) || Ti(), ai(
        l,
        t,
        c
      );
    }
    return no(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, _l = Xt(n.nextSibling), Ll = t, $ = !0, Ua = null, Yt = !1, l !== null && Bs(t, l), t = ff(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function td(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Hn(l.return, t, a);
  }
  function ad(l) {
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
    var i = Wl.current;
    if (t.flags & 128)
      return xe(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, xe(t, i), e === "backwards" && l !== null ? (of(l), Ql(l, t, u, a), of(l)) : Ql(l, t, u, a), u = $ ? Ae : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && td(l, a, t);
        else if (l.tag === 19)
          td(l, a, t);
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
        a = ad(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null, of(t)), ui(
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
        a = ad(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), ui(
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
  function ud(l, t, a) {
    var u = t.pendingProps;
    return Ra(t, t.type, u.value), Ql(l, t, u.children, a), t.child;
  }
  function ba(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), Za |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (cu(
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
      for (l = t.child, a = va(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = va(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function df(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && xn(l)));
  }
  function qr(l, t, a) {
    switch (t.tag) {
      case 3:
        fn(t, t.stateNode.containerInfo), Ra(t, xl, l.memoizedState.cache), nu();
        break;
      case 27:
      case 5:
        qi(t);
        break;
      case 4:
        fn(t, t.stateNode.containerInfo);
        break;
      case 10:
        Ra(
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
            return qa(t), t.flags |= 128, null;
          u = cu(
            l,
            t,
            a,
            !1
          );
          var e = t.child.childLanes;
          return u || (a & e) !== 0 ? ld(l, t, a) : (qa(t), l = ba(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        qa(t);
        break;
      case 19:
        if (t.flags & 128)
          return sf(
            l,
            t,
            a
          );
        if (e = (l.flags & 128) !== 0, u = (a & t.childLanes) !== 0, u || (cu(
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
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), xe(t, Wl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, $0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        Ra(t, xl, l.memoizedState.cache);
    }
    return ba(l, t, a);
  }
  function ed(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        ql = !0;
      else {
        if (!df(l, a) && (t.flags & 128) === 0)
          return ql = !1, qr(
            l,
            t,
            a
          );
        ql = (l.flags & 131072) !== 0;
      }
    else
      ql = !1, $ && (t.flags & 1048576) !== 0 && xs(t, Ae, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = du(t.elementType), t.type = l, typeof l == "function")
            gc(l) ? (u = yu(l, u), t.tag = 1, t = k0(
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
                t.tag = 11, t = K0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === cl) {
                t.tag = 14, t = J0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === Dl) {
                t.tag = 10, t.type = l, t = ud(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = tl(l) || l, Error(y(306, t, ""));
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
        return u = t.type, e = yu(
          u,
          t.pendingProps
        ), k0(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (fn(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(y(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Cc(l, t), He(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, Ra(t, xl, u), u !== n.cache && Oc(
            t,
            [xl],
            a,
            !0
          ), je(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = P0(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = xt(
                Error(y(424)),
                t
              ), De(e), t = P0(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, _l = Xt(l.firstChild), Ll = t, $ = !0, Ua = null, Yt = !0, a = $s(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (nu(), u === e) {
              t = ba(
                l,
                t,
                a
              );
              break l;
            }
            Ql(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return Ku(l, t), l === null ? (a = Um(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : $ || (t.stateNode = fm(
          t.type,
          t.pendingProps,
          hl.current,
          t
        )) : t.memoizedState = Um(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return qi(t), l === null && $ && (u = t.stateNode = Nm(
          t.type,
          t.pendingProps,
          hl.current
        ), Ll = t, Yt = !0, e = _l, Ja(t.type) ? (co = e, _l = Xt(u.firstChild)) : _l = e), Ql(
          l,
          t,
          t.pendingProps.children,
          a
        ), Ku(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && $ && ((e = u = _l) && (u = Ry(
          u,
          t.type,
          t.pendingProps,
          Yt
        ), u !== null ? (t.stateNode = u, Ll = t, _l = Xt(u.firstChild), Yt = !1, e = !0) : e = !1), e || Ca(t)), qi(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, kf(e, n) ? u = null : i !== null && kf(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Yc(
          l,
          t,
          Ar,
          null,
          null,
          a
        ), oe._currentValue = e), Ku(l, t), Ql(l, t, u, a), t.child;
      case 6:
        return l === null && $ && ((l = a = _l) && (a = py(
          a,
          t.pendingProps,
          Yt
        ), a !== null ? (t.stateNode = a, Ll = t, _l = null, l = !0) : l = !1), l || Ca(t)), null;
      case 13:
        return ld(l, t, a);
      case 4:
        return fn(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = vu(
          t,
          null,
          u,
          a
        ) : Ql(l, t, u, a), t.child;
      case 11:
        return K0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return u = t.pendingProps, Ku(l, t), Ql(l, t, u, a), t.child;
      case 8:
        return Ql(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Ql(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return ud(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, fu(t), e = $l(e), u = u(e), t.flags |= 1, Ql(l, t, u, a), t.child;
      case 14:
        return J0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return w0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return sf(l, t, a);
      case 31:
        return xr(l, t, a);
      case 22:
        return $0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return fu(t), u = $l(xl), l === null ? (e = Dc(), e === null && (e = El, n = Nc(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Uc(t), Ra(t, xl, e)) : ((l.lanes & a) !== 0 && (Cc(l, t), He(t, null, null, a), je()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), Ra(t, xl, u)) : (u = n.cache, Ra(t, xl, u), u !== e.cache && Oc(
          t,
          [xl],
          a,
          !0
        ))), Ql(
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
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : $ && pn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : Ku(l, t), Ql(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(y(156, t.tag));
  }
  function Ta(l) {
    l.flags |= 4;
  }
  function mf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? jm(t, u) : jm(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Gd()) l.flags |= 8192;
        else
          throw mu = Gn, Mc;
    } else l.flags &= -16777217;
  }
  function nd(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !Hm(t))
      if (Gd()) l.flags |= 8192;
      else
        throw mu = Gn, Mc;
  }
  function ei(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? jo() : 536870912, l.lanes |= t, Wu |= t);
  }
  function Xe(l, t) {
    if (!$)
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
  function Yr(l, t, a) {
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
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), ha(xl), zu(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Yu(t) ? Ta(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, zc())), Ol(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Ta(t), n !== null ? (Ol(t), nd(t, n)) : (Ol(t), mf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Ta(t), Ol(t), nd(t, n)) : (Ol(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Ta(t), Ol(t), mf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (on(t), a = hl.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Ta(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(y(166));
            return Ol(t), t.subtreeFlags &= -33554433, null;
          }
          l = q.current, Yu(t) ? qs(t) : (l = Nm(e, u, a), t.stateNode = l, Ta(t));
        }
        return Ol(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (on(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Ta(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(y(166));
            return Ol(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = q.current, Yu(t))
            qs(t);
          else {
            var i = Ie(
              hl.current
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
            n[wl] = t, n[dt] = u;
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
            l: switch (kl(n, e, u), e) {
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
            u && Ta(t);
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
          l.memoizedProps !== u && Ta(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(y(166));
          if (l = hl.current, Yu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Ll, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[wl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || em(l.nodeValue, a)), l || Ca(t, !0);
          } else
            l = Ie(l).createTextNode(
              u
            ), l[wl] = t, t.stateNode = l;
        }
        return Ol(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Yu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(y(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(y(557));
              l[wl] = t;
            } else
              nu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ol(t), l = !1;
          } else
            a = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Nt(t), t) : (Nt(t), null);
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
              e[wl] = t;
            } else
              nu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ol(t), e = !1;
          } else
            e = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (Nt(t), t) : (Nt(t), null);
        }
        return Nt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), ei(t, t.updateQueue), Ol(t), null);
      case 4:
        return zu(), l === null && wf(t.stateNode.containerInfo), t.flags |= 67108864, Ol(t), null;
      case 10:
        return ha(t.type), Ol(t), null;
      case 19:
        if (Bc(t), u = t.memoizedState, u === null) return Ol(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Xe(u, !1);
          else {
            if (Rl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Vn(l), n !== null) {
                  for (t.flags |= 128, Xe(u, !1), l = n.updateQueue, t.updateQueue = l, ei(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    ps(a, l), a = a.sibling;
                  return xe(
                    t,
                    Wl.current & 1 | 2
                  ), $ && ra(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Tt() > hi && (t.flags |= 128, e = !0, Xe(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = Vn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, ei(t, l), Xe(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !$)
                return Ol(t), null;
            } else
              2 * Tt() - u.renderingStartTime > hi && a !== 536870912 && (t.flags |= 128, e = !0, Xe(u, !1), t.lanes = 4194304);
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
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Tt(), l.sibling = null, n = Wl.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || $ ? xe(t, n) : (a = n, S(Fl, t), S(Wl, a), ut === null && (ut = t)), $ && ra(t, u.treeForkCount), l;
        }
        return Ol(t), null;
      case 22:
      case 23:
        return Nt(t), Hc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Ol(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ol(t), a = t.updateQueue, a !== null && ei(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && Xl(su), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), ha(xl), Ol(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Ol(t), null;
    }
    throw Error(y(156, t.tag));
  }
  function Gr(l, t) {
    switch (Tc(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return ha(xl), zu(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return on(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Nt(t), t.alternate === null)
            throw Error(y(340));
          nu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Nt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(y(340));
          nu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Bc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return zu(), null;
      case 10:
        return ha(t.type), null;
      case 22:
      case 23:
        return Nt(t), Hc(), l !== null && Xl(su), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return ha(xl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function id(l, t) {
    switch (Tc(t), t.tag) {
      case 3:
        ha(xl), zu();
        break;
      case 26:
      case 27:
      case 5:
        on(t);
        break;
      case 4:
        zu();
        break;
      case 31:
        t.memoizedState !== null && Nt(t);
        break;
      case 13:
        Nt(t);
        break;
      case 19:
        Bc(t);
        break;
      case 10:
        ha(t.type);
        break;
      case 22:
      case 23:
        Nt(t), Hc(), l !== null && Xl(su);
        break;
      case 24:
        ha(xl);
    }
  }
  function Qe(l, t) {
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
      vl(t, t.return, c);
    }
  }
  function Ga(l, t, a) {
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
                vl(
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
      vl(t, t.return, g);
    }
  }
  function cd(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        Ws(t, a);
      } catch (u) {
        vl(l, l.return, u);
      }
    }
  }
  function fd(l, t, a) {
    a.props = yu(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      vl(l, t, u);
    }
  }
  function Pt(l, t) {
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
            var e = l.stateNode, n = da(l.memoizedProps, e);
            (e.ref === null || e.ref.name !== n) && (e.ref = ym(n)), u = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new Ct(l);
              T(
                l.child,
                !1,
                Uy,
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
      vl(l, t, c);
    }
  }
  function Il(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          vl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          vl(l, t, e);
        }
      else a.current = null;
  }
  function ni(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        Em(
          l.stateNode,
          t[a]
        );
  }
  function od(l) {
    for (var t = l.return; t !== null && (rf(t) && Em(l.stateNode, t.stateNode), !vf(t)); )
      t = t.return;
  }
  function Ze(l) {
    for (var t = l.return; t !== null && (rf(t) && Cy(l.stateNode, t.stateNode), !vf(t)); )
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
      vl(l, l.return, e);
    }
  }
  function hf(l, t, a) {
    try {
      var u = l.stateNode;
      dy(u, l.type, a, t), u[dt] = t;
    } catch (e) {
      vl(l, l.return, e);
    }
  }
  function sd(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Ja(l.type) || l.tag === 4;
  }
  function gf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || sd(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Ja(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Sf(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Wt)), ni(l, u), ol = !0;
    else if (e !== 4 && (e === 27 && (ni(l, u), u = null, Ja(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
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
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), ni(l, u), ol = !0;
    else if (e !== 4 && (e === 27 && (ni(l, u), u = null, Ja(l.type) && (a = l.stateNode)), l = l.child, l !== null))
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
  function dd(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      kl(t, u, a), t[wl] = l, t[dt] = a;
    } catch (n) {
      vl(l, l.return, n);
    }
  }
  var ci = !1, At = null;
  function md(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (ci = !0);
  }
  var la = null;
  function vd() {
    var l = la;
    return la = null, l;
  }
  var vt = 0;
  function Ju(l, t, a, u, e) {
    return vt = 0, rd(
      l.child,
      t,
      a,
      u,
      e
    );
  }
  function rd(l, t, a, u, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (u !== null) {
          var c = to(i);
          u.push(c), c.view && (n = !0);
        } else
          n || to(i).view && (n = !0);
        ci = !0, vm(
          i,
          vt === 0 ? t : t + "_" + vt,
          a
        ), vt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || rd(
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
  function ta(l, t) {
    for (; l !== null; )
      l.tag === 5 ? rm(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || ta(
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
          t = ma(t.default, t.share), t !== "none" && (Ju(
            l,
            a,
            t,
            null,
            !1
          ) || ta(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function bf(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, u = l.memoizedProps, e = da(u, a), n = ma(
        u.default,
        a.paired ? u.share : u.enter
      );
      n !== "none" ? Ju(l, e, n, null, !1) ? (fi(l), a.paired || t || le(l, u.onEnter)) : ta(l.child, !1) : fi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        bf(l, t), l = l.sibling;
    else fi(l);
  }
  function Tf(l) {
    if (At !== null && At.size !== 0) {
      var t = At;
      if ((l.subtreeFlags & 18874368) !== 0)
        for (l = l.child; l !== null; ) {
          if (l.tag !== 22 || l.memoizedState === null) {
            if (l.tag === 30 && (l.flags & 18874368) !== 0) {
              var a = l.memoizedProps, u = a.name;
              if (u != null && u !== "auto") {
                var e = t.get(u);
                if (e !== void 0) {
                  var n = ma(
                    a.default,
                    a.share
                  );
                  if (n !== "none" && (Ju(
                    l,
                    u,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, le(l, a.onShare)) : ta(l.child, !1)), t.delete(u), t.size === 0) break;
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
      var t = l.memoizedProps, a = da(t, l.stateNode), u = At !== null ? At.get(a) : void 0, e = ma(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Ju(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, At.delete(a), le(l, t.onShare)) : le(l, t.onExit) : ta(l.child, !1)), At !== null && Tf(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Ef(l), l = l.sibling;
    else
      At !== null && Tf(l);
  }
  function yd(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = da(t, l.stateNode);
        t = ma(t.default, t.update), l.flags &= -5, t !== "none" && Ju(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && yd(l);
      l = l.sibling;
    }
  }
  function zf(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, ta(l.child, !1));
          }
          zf(l);
        }
        l = l.sibling;
      }
  }
  function oi(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, ta(l.child, !1), zf(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        oi(l), l = l.sibling;
    else zf(l);
  }
  function hd(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? ta(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && hd(l), l = l.sibling;
  }
  function _f(l, t, a, u, e, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && vt < n.length) {
          var v = n[vt], g = to(f);
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
        (l.flags & 4) !== 0 && vm(
          f,
          vt === 0 ? a : a + "_" + vt,
          e
        ), c && (l.flags & 4) !== 0 || (la === null && (la = []), la.push(
          f,
          vt === 0 ? u : u + "_" + vt,
          t.memoizedProps
        )), vt++;
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
  function gd(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, u = l.stateNode, e = da(a, u), n = ma(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, u = l;
        var c = l.child;
        vt = 0, e = _f(
          u,
          c,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && le(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && gd(l);
      l = l.sibling;
    }
  }
  var Kl = !1, dl = !1, aa = !1, Of = !1, Sd = typeof WeakSet == "function" ? WeakSet : Set, Jl = null, ua = !1, Ve = !1, si = !1, Nf = !1;
  function Xr(l, t, a) {
    if (l = l.containerInfo, Wf = se, l = zs(l), sc(l)) {
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
    for (If = { focusedElem: l, selectionRange: u }, se = !1, a = (a & 335544064) === a, Jl = t, t = a ? 9270 : 1024; Jl !== null; ) {
      if (l = Jl, a && (u = l.deletions, u !== null))
        for (n = 0; n < u.length; n++)
          a && Ef(u[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && md(l), di(a);
      else {
        if (l.tag === 22) {
          if (u = l.alternate, l.memoizedState !== null) {
            u !== null && u.memoizedState === null && a && Ef(u), di(a);
            continue;
          } else if (u !== null && u.memoizedState !== null) {
            a && md(l), di(a);
            continue;
          }
        }
        u = l.child, (l.subtreeFlags & t) !== 0 && u !== null ? (u.return = l, Jl = u) : (a && yd(l), di(a));
      }
    }
    At = null;
  }
  function di(l) {
    for (; Jl !== null; ) {
      var t = Jl, a = l, u = t.alternate, e = t.flags;
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
              var i = yu(
                t.type,
                e
              );
              a = n.getSnapshotBeforeUpdate(
                i,
                u
              ), n.__reactInternalSnapshotBeforeUpdate = a;
            } catch (c) {
              vl(t, t.return, c);
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
          a && u !== null && (a = da(
            u.memoizedProps,
            u.stateNode
          ), e = t.memoizedProps, e = ma(e.default, e.update), e !== "none" && Ju(
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
        u.return = t.return, Jl = u;
        break;
      }
      Jl = t.return;
    }
  }
  function bd(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        ea(l, a), u & 4 && Qe(5, a);
        break;
      case 1:
        if (ea(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              vl(a, a.return, i);
            }
          else {
            var e = yu(
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
              vl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && cd(a), u & 512 && Pt(a, a.return);
        break;
      case 3:
        if (ea(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
            Ws(l, t);
          } catch (i) {
            vl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && dd(a);
      case 26:
      case 5:
        ea(l, a), t === null && u & 4 && yf(a), u & 512 && Pt(a, a.return);
        break;
      case 12:
        ea(l, a);
        break;
      case 31:
        ea(l, a), u & 4 && _d(l, a);
        break;
      case 13:
        ea(l, a), u & 4 && Od(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = kr.bind(
          null,
          a
        ), jy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Kl, !u) {
          var n = t !== null && t.memoizedState !== null || dl;
          t = Kl, e = dl, Kl = u, (dl = n) && !e ? (u = 2, (a.subtreeFlags & 8772) !== 0 && (u |= 1), Jt(
            l,
            a,
            u
          )) : ea(l, a), Kl = t, dl = e;
        }
        break;
      case 30:
        ea(l, a), u & 512 && Pt(a, a.return);
        break;
      case 7:
        u & 512 && Pt(a, a.return);
      default:
        ea(l, a);
    }
  }
  function Af(l, t) {
    for (l = l.child; l !== null; )
      Td(l, t), l = l.sibling;
  }
  function Td(l, t) {
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
          vl(l, l.return, f);
        }
        Df(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, ol = !0;
        } catch (f) {
          vl(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? mm(c, !0) : mm(l.stateNode, !1);
        } catch (f) {
          vl(l, l.return, f);
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
              Td(a, u);
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
  function Ed(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, Ed(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && hn(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Nl = null, rt = !1;
  function Lt(l, t, a) {
    for (a = a.child; a !== null; )
      zd(l, t, a), a = a.sibling;
  }
  function zd(l, t, a) {
    if (Et && typeof Et.onCommitFiberUnmount == "function")
      try {
        Et.onCommitFiberUnmount(me, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        dl || Il(a, t), Lt(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !dl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        dl || Il(a, t), Ze(a);
        var u = Nl, e = rt;
        Ja(a.type) && (Nl = a.stateNode, rt = !1), Lt(
          l,
          t,
          a
        ), Am(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Nl = u, rt = e;
        break;
      case 5:
        dl || Il(a, t), Ze(a);
      case 6:
        if (a.tag === 6 && Ze(a), u = Nl, e = rt, Nl = null, Lt(
          l,
          t,
          a
        ), Nl = u, rt = e, Nl !== null)
          if (rt)
            try {
              (Nl.nodeType === 9 ? Nl.body : Nl.nodeName === "HTML" ? Nl.ownerDocument.body : Nl).removeChild(a.stateNode), ol = !0;
            } catch (n) {
              vl(
                a,
                t,
                n
              );
            }
          else
            try {
              Nl.removeChild(a.stateNode), ol = !0;
            } catch (n) {
              vl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Nl !== null && (rt ? (l = Nl, dm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), de(l)) : dm(Nl, a.stateNode));
        break;
      case 4:
        u = Nl, e = rt, Nl = a.stateNode.containerInfo, rt = !0, Lt(
          l,
          t,
          a
        ), Nl = u, rt = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Ga(2, a, t), dl || Ga(4, a, t), Lt(
          l,
          t,
          a
        );
        break;
      case 1:
        dl || (Il(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && fd(
          a,
          t,
          u
        )), Lt(
          l,
          t,
          a
        );
        break;
      case 21:
        Lt(
          l,
          t,
          a
        );
        break;
      case 22:
        dl = (u = dl) || a.memoizedState !== null, Lt(
          l,
          t,
          a
        ), dl = u;
        break;
      case 30:
        Il(a, t), Lt(
          l,
          t,
          a
        );
        break;
      case 7:
        dl || Il(a, t), Lt(
          l,
          t,
          a
        );
        break;
      default:
        Lt(
          l,
          t,
          a
        );
    }
  }
  function _d(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        de(l);
      } catch (a) {
        vl(t, t.return, a);
      }
    }
  }
  function Od(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        de(l);
      } catch (a) {
        vl(t, t.return, a);
      }
  }
  function Qr(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new Sd()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new Sd()), t;
      default:
        throw Error(y(435, l.tag));
    }
  }
  function mi(l, t) {
    var a = Qr(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = Pr.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function it(l, t, a) {
    var u = t.deletions;
    if (u !== null)
      for (var e = 0; e < u.length; e++) {
        var n = u[e], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Ja(f.type)) {
                Nl = f.stateNode, rt = !1;
                break l;
              }
              break;
            case 5:
              Nl = f.stateNode, rt = !1;
              break l;
            case 3:
            case 4:
              Nl = f.stateNode.containerInfo, rt = !0;
              break l;
          }
          f = f.return;
        }
        if (Nl === null) throw Error(y(160));
        zd(i, c, n), Nl = null, rt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Nd(t, l, a), t = t.sibling;
  }
  var Kt = null;
  function Nd(l, t, a) {
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
        it(t, l, a), ct(l), e & 4 && (Ga(3, l, l.return), Qe(3, l), Ga(5, l, l.return));
        break;
      case 1:
        it(t, l, a), ct(l), e & 512 && (dl || u === null || Il(u, u.return)), e & 64 && Kl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Kt, it(t, l, a), ct(l), e & 512 && (dl || u === null || Il(u, u.return)), e & 4)
          if (e = u !== null ? u.memoizedState : null, a = l.memoizedState, u === null)
            if (a === null)
              if (l.stateNode === null)
                if (Kl)
                  l.stateNode = fm(
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
                        u = e.getElementsByTagName("title")[0], (!u || u[ye] || u[wl] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), kl(u, t, a), u[wl] = l, Vl(u), t = u;
                        break l;
                      case "link":
                        if (n = pm(
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
                        u = e.createElement(t), kl(u, t, a), e.head.appendChild(u);
                        break;
                      case "meta":
                        if (n = pm(
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
                        u = e.createElement(t), kl(u, t, a), e.head.appendChild(u);
                        break;
                      default:
                        throw Error(y(468, t));
                    }
                    u[wl] = l, Vl(u), t = u;
                  }
                  l.stateNode = t;
                }
              else
                Kl || mo(n, l.type, l.stateNode);
            else
              l.stateNode = Rm(
                n,
                a,
                l.memoizedProps
              );
          else
            e !== a ? (e === null ? (t = u.stateNode, t === null || dl || t.parentNode.removeChild(t)) : e.count--, a === null ? Kl || mo(n, l.type, l.stateNode) : Rm(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && hf(
              l,
              l.memoizedProps,
              u.memoizedProps
            );
        break;
      case 27:
        it(t, l, a), ct(l), e & 512 && (dl || u === null || Il(u, u.return)), u !== null && e & 4 && hf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = aa, aa = !1, it(t, l, a), aa = n, ct(l), e & 512 && (dl || u === null || Il(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Mu(t, ""), ol = !0;
          } catch (g) {
            vl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, hf(
          l,
          t,
          u !== null ? u.memoizedProps : t
        )), e & 1024 && (Of = !0);
        break;
      case 6:
        if (it(t, l, a), ct(l), e & 4) {
          if (l.stateNode === null)
            throw Error(y(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, ol = !0;
          } catch (g) {
            vl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (ol = !1, Di = null, n = Kt, Kt = ke(t.containerInfo), it(t, l, a), Kt = n, ct(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            de(t.containerInfo);
          } catch (g) {
            vl(l, l.return, g);
          }
        Of && (Of = !1, Ad(l)), ol = !1;
        break;
      case 4:
        e = aa, aa = Kl, u = Jo(), n = Kt, Kt = ke(
          l.stateNode.containerInfo
        ), it(t, l, a), ct(l), Kt = n, ol && Ve && (si = !0), ol = u, aa = e;
        break;
      case 12:
        it(t, l, a), ct(l);
        break;
      case 31:
        it(t, l, a), ct(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 13:
        it(t, l, a), ct(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (yi = Tt()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = Kl, f = dl, v = aa;
        Kl = c || n, aa = v || n, dl = f || i, it(t, l, a), dl = f, aa = v, Kl = c, ct(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || Kl || dl || (t = i || dl, a = Kl, u = dl, Kl = n || Kl, dl = t, Xa(l, 2), Kl = a, dl = u), !n && aa || Af(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, mi(l, a))));
        break;
      case 19:
        it(t, l, a), ct(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 30:
        e & 512 && (dl || u === null || Il(u, u.return)), e = Jo(), n = Ve, i = (a & 335544064) === a, c = l.memoizedProps, Ve = i && ma(
          c.default,
          c.update
        ) !== "none", it(t, l, a), ct(l), i && u !== null && ol && (l.flags |= 4), Ve = n, ol = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (dl || u === null || Il(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        it(t, l, a), ct(l);
    }
  }
  function ct(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (sd(u)) {
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
        vl(l, l.return, h);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function Ad(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        Ad(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, se = !0, t.reset(), se = !1), l = l.sibling;
      }
  }
  function wu(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Dd(t, l), t = t.sibling;
    else gd(t);
  }
  function Dd(l, t) {
    var a = l.alternate;
    if (a === null) bf(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Nf = ua = !1, vd(), wu(t, l), !ua && !si) {
            if (l = la, l !== null)
              for (var u = 0; u < l.length; u += 3) {
                a = l[u];
                var e = l[u + 1];
                rm(a, l[u + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
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
          la = null;
          break;
        case 5:
          wu(t, l);
          break;
        case 4:
          u = ua, ua = !1, wu(t, l), ua && (si = !0), ua = u;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? bf(l, !1) : wu(t, l));
          break;
        case 30:
          u = ua, e = vd(), ua = !1, wu(t, l), ua && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = da(n, i), i = da(a.memoizedProps, i);
          var c = ma(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, vt = 0, t = _f(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), vt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (le(
            l,
            l.memoizedProps.onUpdate
          ), la = e) : e !== null && (e.push.apply(e, la), la = e), ua = (l.flags & 32) !== 0 ? !0 : u;
          break;
        default:
          wu(t, l);
      }
  }
  function ea(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        bd(l, t.alternate, t), t = t.sibling;
  }
  function Xa(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, u = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Ga(4, a, a.return), Xa(
            a,
            u
          );
          break;
        case 1:
          Il(a, a.return);
          var e = a.stateNode;
          typeof e.componentWillUnmount == "function" && fd(
            a,
            a.return,
            e
          ), Xa(
            a,
            u
          );
          break;
        case 27:
          (u & 2) !== 0 && Am(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          Il(a, a.return), a.tag !== 5 && a.tag !== 27 || Ze(a), Xa(
            a,
            u
          );
          break;
        case 6:
          Ze(a);
          break;
        case 26:
          Il(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || dl || e.parentNode.removeChild(e), Xa(
            a,
            u
          );
          break;
        case 22:
          a.memoizedState === null && Xa(
            a,
            u
          );
          break;
        case 30:
          Il(a, a.return), Xa(
            a,
            u
          );
          break;
        case 7:
          Il(a, a.return);
        default:
          Xa(
            a,
            u
          );
      }
      l = l.sibling;
    }
  }
  function Jt(l, t, a) {
    for (a = (t.subtreeFlags & 8772) !== 0 ? a : a & -2, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags, c = (a & 1) !== 0;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          Jt(
            e,
            n,
            a
          ), Qe(4, n);
          break;
        case 1:
          if (Jt(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (g) {
              vl(u, u.return, g);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var v = e.shared.hiddenCallbacks;
              if (v !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < v.length; e++)
                  Fs(v[e], f);
            } catch (g) {
              vl(u, u.return, g);
            }
          }
          c && i & 64 && cd(n), Pt(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && dd(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || od(n), Jt(
            e,
            n,
            a
          ), c && u === null && i & 4 && yf(n), Pt(n, n.return);
          break;
        case 6:
          od(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || Kl || mo(
            ke(f.ownerDocument),
            n.type,
            f
          ), Jt(
            e,
            n,
            a
          ), c && u === null && i & 4 && yf(n), Pt(n, n.return);
          break;
        case 12:
          Jt(
            e,
            n,
            a
          );
          break;
        case 31:
          Jt(
            e,
            n,
            a
          ), c && i & 4 && _d(e, n);
          break;
        case 13:
          Jt(
            e,
            n,
            a
          ), c && i & 4 && Od(e, n);
          break;
        case 22:
          n.memoizedState === null && Jt(
            e,
            n,
            a
          ), Pt(n, n.return);
          break;
        case 30:
          Jt(
            e,
            n,
            a
          ), Pt(n, n.return);
          break;
        case 7:
          Pt(n, n.return);
        default:
          Jt(
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
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Me(a));
  }
  function Uf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Me(l));
  }
  function Gt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Md(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && hd(t);
  }
  function Md(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && oi(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Gt(
          l,
          t,
          a,
          u
        ), n & 2048 && Qe(9, t);
        break;
      case 1:
        Gt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Gt(
          l,
          t,
          a,
          u
        ), e && Nf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Me(n)));
        break;
      case 12:
        if (n & 2048) {
          Gt(
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
            vl(t, t.return, v);
          }
        } else
          Gt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Gt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Gt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && oi(c), i._visibility & 2 ? Gt(
          l,
          t,
          a,
          u
        ) : Le(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && oi(t), i._visibility & 2 ? Gt(
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
        Gt(
          l,
          t,
          a,
          u
        ), n & 2048 && Uf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (ta(n.child, !0), ta(t.child, !0))), Gt(
          l,
          t,
          a,
          u
        );
        break;
      default:
        Gt(
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
          ), Qe(8, i);
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
          ) : Le(
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
  function Le(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            Le(a, u), e & 2048 && Mf(
              u.alternate,
              u
            );
            break;
          case 24:
            Le(a, u), e & 2048 && Uf(u.alternate, u);
            break;
          default:
            Le(a, u);
        }
        t = t.sibling;
      }
  }
  var hu = 8192;
  function gu(l, t, a) {
    if (l.subtreeFlags & hu)
      for (l = l.child; l !== null; )
        Ud(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function Ud(l, t, a) {
    switch (l.tag) {
      case 26:
        gu(
          l,
          t,
          a
        ), l.flags & hu && (l.memoizedState !== null ? wy(
          a,
          Kt,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && Bm(a, l)));
        break;
      case 5:
        gu(
          l,
          t,
          a
        ), l.flags & hu && (l = l.stateNode, (t & 335544128) === t && Bm(a, l));
        break;
      case 3:
      case 4:
        var u = Kt;
        Kt = ke(l.stateNode.containerInfo), gu(
          l,
          t,
          a
        ), Kt = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = hu, hu = 16777216, gu(
          l,
          t,
          a
        ), hu = u) : gu(
          l,
          t,
          a
        ));
        break;
      case 30:
        if ((l.flags & hu) !== 0 && (u = l.memoizedProps.name, u != null && u !== "auto")) {
          var e = l.stateNode;
          e.paired = null, At === null && (At = /* @__PURE__ */ new Map()), At.set(u, e);
        }
        gu(
          l,
          t,
          a
        );
        break;
      default:
        gu(
          l,
          t,
          a
        );
    }
  }
  function Cd(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Ke(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Jl = u, pd(
            u,
            l
          );
        }
      Cd(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        Rd(l), l = l.sibling;
  }
  function Rd(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Ke(l), l.flags & 2048 && Ga(9, l, l.return);
        break;
      case 3:
        Ke(l);
        break;
      case 12:
        Ke(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, vi(l)) : Ke(l);
        break;
      default:
        Ke(l);
    }
  }
  function vi(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Jl = u, pd(
            u,
            l
          );
        }
      Cd(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          Ga(8, t, t.return), vi(t);
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
  function pd(l, t) {
    for (; Jl !== null; ) {
      var a = Jl;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Ga(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          Me(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Jl = u;
      else
        l: for (a = l; Jl !== null; ) {
          u = Jl;
          var e = u.sibling, n = u.return;
          if (Ed(u), u === a) {
            Jl = null;
            break l;
          }
          if (e !== null) {
            e.return = n, Jl = e;
            break l;
          }
          Jl = n;
        }
    }
  }
  var Zr = {
    getCacheForType: function(l) {
      var t = $l(xl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return $l(xl).controller.signal;
    }
  }, Vr = typeof WeakMap == "function" ? WeakMap : Map, sl = 0, El = null, I = null, P = 0, ml = 0, Dt = null, Qa = !1, Fu = !1, Cf = !1, Ea = 0, Rl = 0, Za = 0, Su = 0, ri = 0, Mt = 0, Wu = 0, Je = null, yt = null, Rf = !1, yi = 0, jd = 0, hi = 1 / 0, gi = null, Va = null, Ml = 0, wt = null, bu = null, na = 0, pf = 0, jf = null, Hd = null, Iu = null, ku = null, Pu = null, we = 0, Si = null;
  function Ut() {
    return (sl & 2) !== 0 && P !== 0 ? P & -P : C.T !== null ? Vf() : qo();
  }
  function xd() {
    if (Mt === 0)
      if ((P & 536870912) === 0 || $) {
        var l = mn;
        mn <<= 1, (mn & 3932160) === 0 && (mn = 262144), Mt = l;
      } else Mt = 536870912;
    return l = Fl.current, l !== null && (l.flags |= 32), Mt;
  }
  function le(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = ym(
        da(l.memoizedProps, a)
      )), ku === null && (ku = []), ku.push(t.bind(null, u));
    }
  }
  function ht(l, t, a) {
    (l === El && (ml === 2 || ml === 9) || l.cancelPendingCommit !== null) && (te(l, 0), La(
      l,
      P,
      Mt,
      !1
    )), re(l, a), ((sl & 2) === 0 || l !== El) && (l === El && ((sl & 2) === 0 && (Su |= a), Rl === 4 && La(
      l,
      P,
      Mt,
      !1
    )), ia(l));
  }
  function Bd(l, t, a) {
    if ((sl & 6) !== 0) throw Error(y(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || ve(l, t), e = u ? Jr(l, t) : xf(l, t, !0), n = u;
    do {
      if (e === 0) {
        Fu && !u && La(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Lr(a)) {
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
              e = Je;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (te(c, i).flags |= 256), i = xf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Cf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Su |= n, e = 4;
                  break l;
                }
                n = yt, yt = e, n !== null && (yt === null ? yt = n : yt.push.apply(
                  yt,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          te(l, 0), La(l, t, 0, !0);
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
              La(
                u,
                t,
                Mt,
                !Qa
              );
              break l;
            case 2:
              yt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(y(329));
          }
          if ((t & 62914560) === t && (e = yi + 300 - Tt(), 10 < e)) {
            if (La(
              u,
              t,
              Mt,
              !Qa
            ), rn(u, 0, !0) !== 0) break l;
            na = t, u.timeoutHandle = lo(
              qd.bind(
                null,
                u,
                a,
                yt,
                gi,
                Rf,
                t,
                Mt,
                Su,
                Wu,
                Qa,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          qd(
            u,
            a,
            yt,
            gi,
            Rf,
            t,
            Mt,
            Su,
            Wu,
            Qa,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    ia(l);
  }
  function qd(l, t, a, u, e, n, i, c, f, v, g, z, d, h) {
    l.timeoutHandle = -1;
    var N = t.subtreeFlags, U = (n & 335544064) === n;
    if (z = null, (U || N & 8192 || (N & 16785408) === 16785408) && (z = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Wt
    }, At = null, Ud(
      t,
      n,
      z
    ), U && (N = z, U = l.containerInfo, U = (U.nodeType === 9 ? U : U.ownerDocument).__reactViewTransition, U != null && (N.count++, N.waitingForViewTransition = !0, N = tn.bind(N), U.finished.then(N, N))), N = (n & 62914560) === n ? yi - Tt() : (n & 4194048) === n ? jd - Tt() : 0, N = $y(
      z,
      N
    ), N !== null)) {
      na = n, l.cancelPendingCommit = N(
        Kd.bind(
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
      ), La(l, n, i, !v);
      return;
    }
    Kd(
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
  function Lr(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!Ot(n(), e)) return !1;
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
  function La(l, t, a, u) {
    t = po(l, t), t &= ~ri, t &= ~Su, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - zt(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && Ho(l, a, t);
  }
  function bi() {
    return (sl & 6) === 0 ? ($e(0), !1) : !0;
  }
  function Hf() {
    if (I !== null) {
      if (ml === 0)
        var l = I.return;
      else
        l = I, ya = iu = null, Qc(l), Qu = null, Re = 0, l = I;
      for (; l !== null; )
        id(l.alternate, l), l = l.return;
      I = null;
    }
  }
  function te(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, ry(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), na = 0, Hf(), El = l, I = a = va(l.current, null), P = t, ml = 0, Dt = null, Qa = !1, Fu = ve(l, t), Cf = !1, Wu = Mt = ri = Su = Za = Rl = 0, yt = Je = null, Rf = !1, Ea = po(l, t), Dn(), a;
  }
  function Yd(l, t) {
    V = null, C.H = kn, t === Xu || t === Yn ? (t = Ks(), ml = 3) : t === Mc ? (t = Ks(), ml = 4) : ml = t === af ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Dt = t, I === null && (Rl = 1, Pn(
      l,
      xt(t, l.current)
    ));
  }
  function Gd() {
    var l = Fl.current;
    return l === null ? !0 : (P & 4194048) === P ? ut === null : (P & 62914560) === P || (P & 536870912) !== 0 ? l === ut : !1;
  }
  function Xd() {
    var l = C.H;
    return C.H = kn, l === null ? kn : l;
  }
  function Qd() {
    var l = C.A;
    return C.A = Zr, l;
  }
  function Ti() {
    Rl = 4, Qa || (P & 4194048) !== P && Fl.current !== null || (Fu = !0), (Za & 134217727) === 0 && (Su & 134217727) === 0 || El === null || La(
      El,
      P,
      Mt,
      !1
    );
  }
  function xf(l, t, a) {
    var u = sl;
    sl |= 2;
    var e = Xd(), n = Qd();
    (El !== l || P !== t) && (gi = null, te(l, t)), t = !1;
    var i = Rl;
    l: do
      try {
        if (ml !== 0 && I !== null) {
          var c = I, f = Dt;
          switch (ml) {
            case 8:
              Hf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              Fl.current === null && (t = !0);
              var v = ml;
              if (ml = 0, Dt = null, ae(l, c, f, v), a && Fu) {
                i = 0;
                break l;
              }
              break;
            default:
              v = ml, ml = 0, Dt = null, ae(l, c, f, v);
          }
        }
        Kr(), i = Rl;
        break;
      } catch (g) {
        Yd(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, ya = iu = null, sl = u, C.H = e, C.A = n, I === null && (El = null, P = 0, Dn()), i;
  }
  function Kr() {
    for (; I !== null; ) Zd(I);
  }
  function Jr(l, t) {
    var a = sl;
    sl |= 2;
    var u = Xd(), e = Qd();
    El !== l || P !== t ? (gi = null, hi = Tt() + 500, te(l, t)) : Fu = ve(
      l,
      t
    );
    l: do
      try {
        if (ml !== 0 && I !== null) {
          t = I;
          var n = Dt;
          t: switch (ml) {
            case 1:
              ml = 0, Dt = null, ae(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Vs(n)) {
                ml = 0, Dt = null, Vd(t);
                break;
              }
              t = function() {
                ml !== 2 && ml !== 9 || El !== l || (ml = 7), ia(l);
              }, n.then(t, t);
              break l;
            case 3:
              ml = 7;
              break l;
            case 4:
              ml = 5;
              break l;
            case 7:
              Vs(n) ? (ml = 0, Dt = null, Vd(t)) : (ml = 0, Dt = null, ae(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (I.tag) {
                case 26:
                  i = I.memoizedState;
                case 5:
                case 27:
                  var c = I;
                  if (i ? Hm(i) : c.stateNode.complete) {
                    ml = 0, Dt = null;
                    var f = c.sibling;
                    if (f !== null) I = f;
                    else {
                      var v = c.return;
                      v !== null ? (I = v, Ei(v)) : I = null;
                    }
                    break t;
                  }
              }
              ml = 0, Dt = null, ae(l, t, n, 5);
              break;
            case 6:
              ml = 0, Dt = null, ae(l, t, n, 6);
              break;
            case 8:
              Hf(), Rl = 6;
              break l;
            default:
              throw Error(y(462));
          }
        }
        wr();
        break;
      } catch (g) {
        Yd(l, g);
      }
    while (!0);
    return ya = iu = null, C.H = u, C.A = e, sl = a, I !== null ? 0 : (El = null, P = 0, Dn(), Rl);
  }
  function wr() {
    for (; I !== null && !sv(); )
      Zd(I);
  }
  function Zd(l) {
    var t = ed(l.alternate, l, Ea);
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : I = t;
  }
  function Vd(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = I0(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          P
        );
        break;
      case 11:
        t = I0(
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
        u === Ll && ($ ? (jn(u), u.tag === 5 && u.stateNode != null && (_l = u.stateNode)) : (jn(u), $ = !0));
      default:
        id(a, t), t = I = ps(t, Ea), t = ed(a, t, Ea);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : I = t;
  }
  function ae(l, t, a, u) {
    ya = iu = null, Qc(t), Qu = null, Re = 0;
    var e = t.return;
    try {
      if (Hr(
        l,
        e,
        t,
        a,
        P
      )) {
        Rl = 1, Pn(
          l,
          xt(a, l.current)
        ), I = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw I = e, n;
      Rl = 1, Pn(
        l,
        xt(a, l.current)
      ), I = null;
      return;
    }
    t.flags & 32768 ? ($ || u === 1 ? l = !0 : Fu || (P & 536870912) !== 0 ? l = !1 : (Qa = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = Fl.current, u !== null && u.tag === 13 && (u.flags |= 16384))), Ld(t, l)) : Ei(t);
  }
  function Ei(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        Ld(
          t,
          Qa
        );
        return;
      }
      l = t.return;
      var a = Yr(
        t.alternate,
        t,
        Ea
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
    Rl === 0 && (Rl = 5);
  }
  function Ld(l, t) {
    do {
      var a = Gr(l.alternate, l);
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
    Rl = 6, I = null;
  }
  function Kd(l, t, a, u, e, n, i, c, f, v, g, z) {
    l.cancelPendingCommit = null;
    do
      zi();
    while (Ml !== 0);
    if ((sl & 6) !== 0) throw Error(y(327));
    if (t !== null) {
      if (t === l.current) throw Error(y(177));
      l === El && (I = El = null, P = 0), bu = t, wt = l, na = a, jf = e, Hd = u, $r(
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
  function $r(l, t, a, u, e, n, i) {
    var c = t.lanes | t.childLanes;
    if (pf = c, c |= yc, Tv(
      l,
      a,
      c,
      u,
      e,
      n
    ), ku = null, (a & 335544064) === a ? (Pu = zr(l), u = 10262) : (Pu = null, u = 10256), (t.subtreeFlags & u) !== 0 || (t.flags & u) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ly(sn, function() {
      return Gf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), ci = !1, u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
      u = C.T, C.T = null, e = G.p, G.p = 2, n = sl, sl |= 4;
      try {
        Xr(l, t, a);
      } finally {
        sl = n, G.p = e, C.T = u;
      }
    }
    Ml = 1, ci ? Iu = Ty(
      i,
      l.containerInfo,
      Pu,
      Bf,
      qf,
      Wr,
      Yf,
      Gf,
      Fr
    ) : (Bf(), qf(), Yf());
  }
  function Fr(l) {
    if (Ml !== 0) {
      var t = wt.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function Wr() {
    Ml === 3 && (Ml = 0, Dd(bu, wt), Ml = 4);
  }
  function Bf() {
    if (Ml === 1) {
      Ml = 0;
      var l = wt, t = bu, a = na, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = C.T, C.T = null;
        var e = G.p;
        G.p = 2;
        var n = sl;
        sl |= 4;
        try {
          Ve = si = !1, Nd(t, l, a), a = If;
          var i = zs(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Es(
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
                  var h = d.getSelection(), N = c.textContent.length, U = Math.min(f.start, N), L = f.end === void 0 ? U : Math.min(f.end, N);
                  !h.extend && U > L && (i = L, L = U, U = i);
                  var m = Ts(
                    c,
                    U
                  ), o = Ts(
                    c,
                    L
                  );
                  if (m && o && (h.rangeCount !== 1 || h.anchorNode !== m.node || h.anchorOffset !== m.offset || h.focusNode !== o.node || h.focusOffset !== o.offset)) {
                    var r = z.createRange();
                    r.setStart(m.node, m.offset), h.removeAllRanges(), U > L ? (h.addRange(r), h.extend(o.node, o.offset)) : (r.setEnd(o.node, o.offset), h.addRange(r));
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
          sl = n, G.p = e, C.T = u;
        }
      }
      l.current = t, Ml = 2;
    }
  }
  function qf() {
    if (Ml === 2) {
      Ml = 0;
      var l = wt, t = bu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = C.T, C.T = null;
        var u = G.p;
        G.p = 2;
        var e = sl;
        sl |= 4;
        try {
          bd(l, t.alternate, t);
        } finally {
          sl = e, G.p = u, C.T = a;
        }
      }
      Ml = 3;
    }
  }
  function Yf() {
    if (Ml === 4 || Ml === 3) {
      Ml = 0;
      var l = Iu;
      Iu = null, dv();
      var t = wt, a = bu, u = na, e = Hd, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Ml = 5 : (Ml = 0, bu = wt = null, Jd(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (Va = null), Ji(u), a = a.stateNode, Et && typeof Et.onCommitFiberRoot == "function")
        try {
          Et.onCommitFiberRoot(
            me,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (e !== null) {
        a = C.T, n = G.p, G.p = 2, C.T = null;
        try {
          for (var i = t.onRecoverableError, c = 0; c < e.length; c++) {
            var f = e[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          C.T = a, G.p = n;
        }
      }
      if (e = ku, i = Pu, Pu = null, e !== null && (ku = null, i === null && (i = []), l !== null))
        for (f = 0; f < e.length; f++)
          a = (0, e[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (na & 3) !== 0 && zi(), ia(t), n = t.pendingLanes, (u & 261930) !== 0 && (n & 42) !== 0 ? t === Si ? we++ : (we = 0, Si = t) : (we = 0, Si = null), $e(0);
    }
  }
  function Jd(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Me(t)));
  }
  function zi() {
    return Iu !== null && (Iu.skipTransition(), Iu = null), Bf(), qf(), Yf(), Gf();
  }
  function Gf() {
    if (Ml !== 5) return !1;
    var l = wt, t = pf;
    pf = 0;
    var a = Ji(na), u = C.T, e = G.p;
    try {
      G.p = 32 > a ? 32 : a, C.T = null, a = jf, jf = null;
      var n = wt, i = na;
      if (Ml = 0, bu = wt = null, na = 0, (sl & 6) !== 0) throw Error(y(331));
      var c = sl;
      if (sl |= 4, Rd(n.current), Md(
        n,
        n.current,
        i,
        a
      ), sl = c, $e(0, !1), Et && typeof Et.onPostCommitFiberRoot == "function")
        try {
          Et.onPostCommitFiberRoot(me, n);
        } catch {
        }
      return !0;
    } finally {
      G.p = e, C.T = u, Jd(l, t);
    }
  }
  function wd(l, t, a) {
    t = xt(a, t), t = tf(l.stateNode, t, 2), l = xa(l, t, 2), l !== null && (re(l, 2), ia(l));
  }
  function vl(l, t, a) {
    if (l.tag === 3)
      wd(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          wd(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Va === null || !Va.has(u))) {
            l = xt(a, l), a = V0(2), u = xa(t, a, 2), u !== null && (L0(
              a,
              u,
              t,
              l
            ), re(u, 2), ia(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Xf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new Vr();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (Cf = !0, e.add(a), l = Ir.bind(null, l, t, a), t.then(l, l));
  }
  function Ir(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, El === l && (P & a) === a && ((Rl === 4 || Rl === 3 && (P & 62914560) === P && 300 > Tt() - yi) && (sl & 2) === 0 ? te(l, 0) : ri |= a, Wu === P && (Wu = 0)), ia(l);
  }
  function $d(l, t) {
    t === 0 && (t = jo()), l = uu(l, t), l !== null && (re(l, t), ia(l));
  }
  function kr(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), $d(l, a);
  }
  function Pr(l, t) {
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
    u !== null && u.delete(t), $d(l, a);
  }
  function ly(l, t) {
    return Zi(l, t);
  }
  var ue = null, ee = null, Qf = !1, _i = !1, Zf = !1, Ka = 0;
  function ia(l) {
    l !== ee && l.next === null && (ee === null ? ue = ee = l : ee = ee.next = l), _i = !0, Qf || (Qf = !0, ay());
  }
  function $e(l, t) {
    if (!Zf && _i) {
      Zf = !0;
      do
        for (var a = !1, u = ue; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - zt(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, kd(u, n));
          } else
            n = P, n = rn(
              u,
              u === El ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || ve(u, n) || (a = !0, kd(u, n));
          u = u.next;
        }
      while (a);
      Zf = !1;
    }
  }
  function ty() {
    Fd();
  }
  function Fd() {
    _i = Qf = !1;
    var l = 0;
    Ka !== 0 && vy() && (l = Ka);
    for (var t = Tt(), a = null, u = ue; u !== null; ) {
      var e = u.next, n = Wd(u, t);
      n === 0 ? (u.next = null, a === null ? ue = e : a.next = e, e === null && (ee = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (_i = !0)), u = e;
    }
    Ml !== 0 && Ml !== 5 || $e(l), Ka !== 0 && (Ka = 0);
  }
  function Wd(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - zt(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = bv(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = El, a = P, a = rn(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (ml === 2 || ml === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Vi(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || ve(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Vi(u), Ji(a)) {
        case 2:
        case 8:
          a = Co;
          break;
        case 32:
          a = sn;
          break;
        case 268435456:
          a = Ro;
          break;
        default:
          a = sn;
      }
      return u = Id.bind(null, l), a = Zi(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Vi(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function Id(l, t) {
    if (Ml !== 0 && Ml !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (zi() && l.callbackNode !== a)
      return null;
    var u = P;
    return u = rn(
      l,
      l === El ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (Bd(l, u, t), Wd(l, Tt()), l.callbackNode != null && l.callbackNode === a ? Id.bind(null, l) : null);
  }
  function kd(l, t) {
    if (zi()) return null;
    Bd(l, t, !0);
  }
  function ay() {
    yy(function() {
      (sl & 6) !== 0 ? Zi(
        Uo,
        ty
      ) : Fd();
    });
  }
  function Vf() {
    if (Ka === 0) {
      var l = ou;
      l === 0 && (l = dn, dn <<= 1, (dn & 261888) === 0 && (dn = 256)), Ka = l;
    }
    return Ka;
  }
  function Pd(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : bn(l);
  }
  function uy(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = Pd(
        (e[dt] || null).action
      ), i = u.submitter;
      i && (t = (t = i[dt] || null) ? Pd(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
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
                if (Ka !== 0) {
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
    var Kf = rc[Lf], ey = Kf.toLowerCase(), ny = Kf[0].toUpperCase() + Kf.slice(1);
    Vt(
      ey,
      "on" + ny
    );
  }
  Vt(Ns, "onAnimationEnd"), Vt(As, "onAnimationIteration"), Vt(Ds, "onAnimationStart"), Vt("dblclick", "onDoubleClick"), Vt("focusin", "onFocus"), Vt("focusout", "onBlur"), Vt(rr, "onTransitionRun"), Vt(yr, "onTransitionStart"), Vt(hr, "onTransitionCancel"), Vt(Ms, "onTransitionEnd"), Au("onMouseEnter", ["mouseout", "mouseover"]), Au("onMouseLeave", ["mouseout", "mouseover"]), Au("onPointerEnter", ["pointerout", "pointerover"]), Au("onPointerLeave", ["pointerout", "pointerover"]), lu(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), lu(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), lu("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), lu(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), lu(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), lu(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Fe = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), iy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Fe)
  );
  function lm(l, t) {
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
    var a = t[Go];
    a === void 0 && (a = t[Go] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (tm(t, l, 2, !1), a.add(u));
  }
  function Jf(l, t, a) {
    var u = 0;
    t && (u |= 4), tm(
      a,
      l,
      u,
      t
    );
  }
  var Oi = "_reactListening" + Math.random().toString(36).slice(2);
  function wf(l) {
    if (!l[Oi]) {
      l[Oi] = !0, Zo.forEach(function(a) {
        a !== "selectionchange" && (iy.has(a) || Jf(a, !1, l), Jf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Oi] || (t[Oi] = !0, Jf("selectionchange", !1, t));
    }
  }
  function tm(l, t, a, u) {
    switch (Lm(t)) {
      case 2:
        var e = ky;
        break;
      case 8:
        e = Py;
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
            if (i = Pa(c), i === null) return;
            if (f = i.tag, f === 5 || f === 6 || f === 26 || f === 27) {
              u = n = i;
              continue l;
            }
            c = c.parentNode;
          }
        }
        u = u.return;
      }
    ts(function() {
      var v = n, g = ki(a), z = [];
      l: {
        var d = Us.get(l);
        if (d !== void 0) {
          var h = _n, N = l;
          switch (l) {
            case "keypress":
              if (En(a) === 0) break l;
            case "keydown":
            case "keyup":
              h = Lv;
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
              h = es;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              h = pv;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              h = Fv;
              break;
            case Ns:
            case As:
            case Ds:
              h = xv;
              break;
            case Ms:
              h = Iv;
              break;
            case "scroll":
            case "scrollend":
              h = Cv;
              break;
            case "wheel":
              h = Pv;
              break;
            case "copy":
            case "cut":
            case "paste":
              h = qv;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              h = is;
              break;
            case "submit":
              h = wv;
              break;
            case "toggle":
            case "beforetoggle":
              h = tr;
          }
          var U = (t & 4) !== 0, L = !U && (l === "scroll" || l === "scrollend"), m = U ? d !== null ? d + "Capture" : null : d;
          U = [];
          for (var o = v, r; o !== null; ) {
            var E = o;
            if (r = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || r === null || m === null || (E = ge(o, m), E != null && U.push(
              We(o, E, r)
            )), L) break;
            o = o.return;
          }
          0 < U.length && (d = new h(
            d,
            N,
            null,
            a,
            g
          ), z.push({ event: d, listeners: U }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (h = l === "mouseover" || l === "pointerover", d = l === "mouseout" || l === "pointerout", h && a !== Ii && (N = a.relatedTarget || a.fromElement) && (Pa(N) || N[_u]))
            break l;
          (d || h) && (N = g.window === g ? g : (h = g.ownerDocument) ? h.defaultView || h.parentWindow : window, d ? (h = a.relatedTarget || a.toElement, d = v, h = h ? Pa(h) : null, h !== null && (L = al(h), U = h.tag, h !== L || U !== 5 && U !== 27 && U !== 6) && (h = null)) : (d = null, h = v), d !== h && (U = es, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (U = is, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), L = d == null ? N : he(d), r = h == null ? N : he(h), N = new U(
            E,
            o + "leave",
            d,
            a,
            g
          ), N.target = L, N.relatedTarget = r, E = null, Pa(g) === v && (U = new U(
            m,
            o + "enter",
            h,
            a,
            g
          ), U.target = r, U.relatedTarget = L, E = U), L = E, U = d && h ? Hl(
            d,
            h,
            cy
          ) : null, d !== null && am(
            z,
            N,
            d,
            U,
            !1
          ), h !== null && L !== null && am(
            z,
            L,
            h,
            U,
            !0
          )));
        }
        l: {
          if (d = v ? he(v) : window, h = d.nodeName && d.nodeName.toLowerCase(), h === "select" || h === "input" && d.type === "file")
            var D = rs;
          else if (ms(d))
            if (ys)
              D = dr;
            else {
              D = or;
              var ll = fr;
            }
          else
            h = d.nodeName, !h || h.toLowerCase() !== "input" || d.type !== "checkbox" && d.type !== "radio" ? v && Wi(v.elementType) && (D = rs) : D = sr;
          if (D && (D = D(l, v))) {
            vs(
              z,
              D,
              a,
              g
            );
            break l;
          }
          ll && ll(l, d, v);
        }
        switch (ll = v ? he(v) : window, l) {
          case "focusin":
            (ms(ll) || ll.contentEditable === "true") && (pu = ll, dc = v, Ne = null);
            break;
          case "focusout":
            Ne = dc = pu = null;
            break;
          case "mousedown":
            mc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mc = !1, _s(z, a, g);
            break;
          case "selectionchange":
            if (vr) break;
          case "keydown":
          case "keyup":
            _s(z, a, g);
        }
        var p;
        if (ic)
          l: {
            switch (l) {
              case "compositionstart":
                var Y = "onCompositionStart";
                break l;
              case "compositionend":
                Y = "onCompositionEnd";
                break l;
              case "compositionupdate":
                Y = "onCompositionUpdate";
                break l;
            }
            Y = void 0;
          }
        else
          Ru ? ss(l, a) && (Y = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (Y = "onCompositionStart");
        Y && (cs && a.locale !== "ko" && (Ru || Y !== "onCompositionStart" ? Y === "onCompositionEnd" && Ru && (p = as()) : (Aa = g, tc = "value" in Aa ? Aa.value : Aa.textContent, Ru = !0)), ll = Ni(v, Y), 0 < ll.length && (Y = new ns(
          Y,
          l,
          null,
          a,
          g
        ), z.push({ event: Y, listeners: ll }), p ? Y.data = p : (p = ds(a), p !== null && (Y.data = p)))), (p = ur ? er(l, a) : nr(l, a)) && (Y = Ni(v, "onBeforeInput"), 0 < Y.length && (ll = new ns(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), z.push({
          event: ll,
          listeners: Y
        }), ll.data = p)), uy(
          z,
          l,
          v,
          a,
          g
        );
      }
      lm(z, t);
    });
  }
  function We(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Ni(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = ge(l, a), e != null && u.unshift(
        We(l, e, n)
      ), e = ge(l, t), e != null && u.push(
        We(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function cy(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function am(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, f = c.alternate, v = c.stateNode;
      if (c = c.tag, f !== null && f === u) break;
      c !== 5 && c !== 26 && c !== 27 || v === null || (f = v, e ? (v = ge(a, n), v != null && i.unshift(
        We(a, v, f)
      )) : e || (v = ge(a, n), v != null && i.push(
        We(a, v, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var fy = /\r\n?/g, oy = /\u0000|\uFFFD/g;
  function um(l) {
    return (typeof l == "string" ? l : "" + l).replace(fy, `
`).replace(oy, "");
  }
  function em(l, t) {
    return t = um(t), um(l) === t;
  }
  function rl(l, t, a, u, e, n) {
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
        Po(l, u, n);
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
          typeof n == "function" && (a === "formAction" ? (t !== "input" && rl(l, t, "name", e.name, e, null), rl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), rl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), rl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (rl(l, t, "encType", e.encType, e, null), rl(l, t, "method", e.method, e, null), rl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = bn(u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = Wt);
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
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        oa(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        oa(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        oa(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        oa(
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
          a = Mv.get(a) || a, gn(l, a, u);
        else return;
    }
    ol = !0;
  }
  function Ff(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        Po(l, u, n);
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
        u != null && (l.onclick = Wt);
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
        if (!Vo.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[dt] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            ol = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : gn(l, a, u);
          }
        return;
    }
    ol = !0;
  }
  function kl(l, t, a) {
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
                  rl(l, t, n, i, a, null);
              }
          }
        e && rl(l, t, "srcSet", a.srcSet, a, null), u && rl(l, t, "src", a.src, a, null);
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
                  rl(l, t, u, g, a, null);
              }
          }
        Fo(
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
                rl(l, t, e, c, a, null);
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
                rl(l, t, i, c, a, null);
            }
        Io(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : rl(l, t, f, u, a, null));
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
        for (u = 0; u < Fe.length; u++)
          k(Fe[u], l);
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
                rl(l, t, v, u, a, null);
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
      a.hasOwnProperty(c) && (u = a[c], u != null && rl(l, t, c, u, a, null));
  }
  var sy = {};
  function dy(l, t, a, u) {
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
                u.hasOwnProperty(h) || rl(l, t, h, null, u, z);
            }
        }
        for (var d in u) {
          var h = u[d];
          if (z = a[d], u.hasOwnProperty(d) && (h != null || z != null))
            switch (d) {
              case "type":
                h !== z && (ol = !0), n = h;
                break;
              case "name":
                h !== z && (ol = !0), e = h;
                break;
              case "checked":
                h !== z && (ol = !0), v = h;
                break;
              case "defaultChecked":
                h !== z && (ol = !0), g = h;
                break;
              case "value":
                h !== z && (ol = !0), i = h;
                break;
              case "defaultValue":
                h !== z && (ol = !0), c = h;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (h != null)
                  throw Error(y(137, t));
                break;
              default:
                h !== z && rl(
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
                u.hasOwnProperty(n) || rl(
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
                n !== f && (ol = !0), d = n;
                break;
              case "defaultValue":
                n !== f && (ol = !0), c = n;
                break;
              case "multiple":
                n !== f && (ol = !0), i = n;
              default:
                n !== f && rl(
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
                rl(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (ol = !0), d = e;
                break;
              case "defaultValue":
                e !== n && (ol = !0), h = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(y(91));
                break;
              default:
                e !== n && rl(l, t, i, e, u, n);
            }
        Wo(l, d, h);
        return;
      case "option":
        for (var N in a)
          d = a[N], a.hasOwnProperty(N) && d != null && !u.hasOwnProperty(N) && (N === "selected" ? l.selected = !1 : rl(
            l,
            t,
            N,
            null,
            u,
            d
          ));
        for (f in u)
          d = u[f], h = a[f], u.hasOwnProperty(f) && d !== h && (d != null || h != null) && (f === "selected" ? (d !== h && (ol = !0), l.selected = d && typeof d != "function" && typeof d != "symbol") : rl(
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
        for (var U in a)
          d = a[U], a.hasOwnProperty(U) && d != null && !u.hasOwnProperty(U) && rl(l, t, U, null, u, d);
        for (v in u)
          if (d = u[v], h = a[v], u.hasOwnProperty(v) && d !== h && (d != null || h != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (d != null)
                  throw Error(y(137, t));
                break;
              default:
                rl(
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
          for (var L in a)
            d = a[L], a.hasOwnProperty(L) && d !== void 0 && !u.hasOwnProperty(L) && Ff(
              l,
              t,
              L,
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
      d = a[m], a.hasOwnProperty(m) && d != null && !u.hasOwnProperty(m) && rl(l, t, m, null, u, d);
    for (z in u)
      d = u[z], h = a[z], !u.hasOwnProperty(z) || d === h || d == null && h == null || rl(l, t, z, d, u, h);
  }
  function nm(l) {
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
  function my() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, c = e.duration;
        if (n && c && nm(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var f = a[u], v = f.startTime;
            if (v > c) break;
            var g = f.transferSize, z = f.initiatorType;
            g && nm(z) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - v) / (f - v)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Wf = null, If = null;
  function Ie(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function im(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function cm(l, t) {
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
  function fm(l, t, a, u) {
    return a = Ie(
      a
    ).createElement(l), a[wl] = u, a[dt] = t, kl(a, l, t), Vl(a), a;
  }
  function kf(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Pf = null;
  function vy() {
    var l = window.event;
    return l && l.type === "popstate" ? l === Pf ? !1 : (Pf = l, !0) : (Pf = null, !1);
  }
  var lo = typeof setTimeout == "function" ? setTimeout : void 0, ry = typeof clearTimeout == "function" ? clearTimeout : void 0, om = typeof Promise == "function" ? Promise : void 0, sm = typeof requestAnimationFrame == "function" ? requestAnimationFrame : lo, yy = typeof queueMicrotask == "function" ? queueMicrotask : typeof om < "u" ? function(l) {
    return om.resolve(null).then(l).catch(hy);
  } : lo;
  function hy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Ja(l) {
    return l === "head";
  }
  function dm(l, t) {
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
            n[ye] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && fo(l.ownerDocument.body);
      a = e;
    } while (a);
    de(t);
  }
  function mm(l, t) {
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
  function vm(l, t, a) {
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
  function rm(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function gy(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function to(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return gy(t, a, l);
  }
  function Sy(l) {
    return l.documentElement.clientHeight;
  }
  function by(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function Ty(l, t, a, u, e, n, i, c, f) {
    var v = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = v.startViewTransition({
        update: function() {
          var d = v.defaultView, h = d.navigation && d.navigation.transition, N = v.fonts.status;
          u();
          var U = [];
          if (N === "loaded" && (Sy(v), v.fonts.status === "loading" && U.push(v.fonts.ready)), N = U.length, l !== null)
            for (var L = l.suspenseyImages, m = 0, o = 0; o < L.length; o++) {
              var r = L[o];
              if (!r.complete) {
                var E = r.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < d.innerHeight && E.left < d.innerWidth) {
                  if (m += xm(r), m > Mi) {
                    U.length = N;
                    break;
                  }
                  r = new Promise(
                    by.bind(r)
                  ), U.push(r);
                }
              }
            }
          if (0 < U.length)
            return d = Promise.race([
              Promise.all(U),
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
            var N = d[h], U = N.effect, L = U.pseudoElement;
            if (L != null && L.startsWith("::view-transition")) {
              z.push(N), N = U.getKeyframes();
              for (var m = L = void 0, o = !0, r = 0; r < N.length; r++) {
                var E = N[r], D = E.width;
                if (L === void 0) L = D;
                else if (L !== D) {
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
              o && L !== void 0 && m !== void 0 && (U.setKeyframes(N), o = getComputedStyle(
                U.target,
                U.pseudoElement
              ), o.width !== L || o.height !== m) && (o = N[0], o.width = L, o.height = m, o = N[N.length - 1], o.width = L, o.height = m, U.setKeyframes(N));
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
  function Tu(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  Tu.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : K({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Tu.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), u = [], e = 0; e < a.length; e++) {
      var n = a[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && u.push(a[e]);
    }
    return u;
  }, Tu.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function ym(l) {
    return {
      name: l,
      group: new Tu("group", l),
      imagePair: new Tu("image-pair", l),
      old: new Tu("old", l),
      new: new Tu("new", l)
    };
  }
  function Ct(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  Ct.prototype.addEventListener = function(l, t, a) {
    var u = null, e = null;
    if (!(a != null && typeof a != "boolean" && (u = a.signal || null, u !== null && u.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (gm(n, l, t, a) === -1) {
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
          Ey,
          l,
          c,
          u
        );
      }
      this._eventListeners = n;
    }
  };
  function Ey(l, t, a, u) {
    return F(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  Ct.prototype.removeEventListener = function(l, t, a) {
    var u = this._eventListeners;
    if (u !== null && (t = gm(
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
        zy,
        l,
        a,
        e
      ), u.splice(t, 1), n !== null && n();
    }
  };
  function zy(l, t, a, u) {
    return F(l).removeEventListener(
      t,
      a,
      u
    ), !1;
  }
  function ne(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function hm(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function gm(l, t, a, u) {
    if (l.length === 0) return -1;
    u = hm(u);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === a && hm(n.optionsOrUseCapture) === u)
        return e;
    }
    return -1;
  }
  Ct.prototype.dispatchEvent = function(l) {
    var t = H(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = F(t);
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
  }, Ct.prototype.focus = function(l) {
    T(
      this._fragmentFiber.child,
      !0,
      Sm,
      l,
      void 0,
      void 0
    );
  };
  function Sm(l, t) {
    return l.tag === 6 ? !1 : (l = F(l), Hy(l, t));
  }
  Ct.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      ao,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !Sm(t[a], l); a--) ;
  };
  function ao(l, t) {
    return t.push(l), !1;
  }
  Ct.prototype.blur = function() {
    var l = H(
      this._fragmentFiber
    );
    l !== null && (l = F(l), l = Ie(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      _y,
      l,
      void 0,
      void 0
    ));
  };
  function _y(l, t) {
    return l.tag === 6 ? !1 : (l = F(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  Ct.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Oy,
      l,
      void 0,
      void 0
    );
  };
  function Oy(l, t) {
    return l.tag === 6 || (l = F(l), t.observe(l)), !1;
  }
  Ct.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), T(
        this._fragmentFiber.child,
        !1,
        Ny,
        l,
        void 0,
        void 0
      );
      for (var a = t = 0; a < $t.length; a++) {
        var u = $t[a];
        u.fragmentInstance === this && u.observer === l ? l.unobserve(u.instance) : $t[t++] = u;
      }
      $t.length = t;
    }
  };
  function Ny(l, t) {
    return l.tag === 6 || (l = F(l), t.unobserve(l)), !1;
  }
  var $t = [], uo = !1;
  function Ay(l, t, a) {
    $t.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), uo || (uo = !0, xy(function() {
      uo = !1;
      var u = $t;
      $t = [];
      for (var e = 0; e < u.length; e++) {
        var n = u[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  Ct.prototype.getClientRects = function() {
    var l = [];
    return T(
      this._fragmentFiber.child,
      !1,
      Dy,
      l,
      void 0,
      void 0
    ), l;
  };
  function Dy(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = F(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  Ct.prototype.getRootNode = function(l) {
    var t = H(
      this._fragmentFiber
    );
    return t === null ? this : F(t).getRootNode(l);
  }, Ct.prototype.compareDocumentPosition = function(l) {
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
    var u = F(t);
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
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = Al(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = F(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = F(a[0]), e = F(a[a.length - 1]);
    var n = X(this._fragmentFiber) ? t.parentElement : u;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    u = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = e.compareDocumentPosition(l), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = u && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = u && t === l || n && e === l || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !u && t === l || !n && e === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || My(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function My(l, t, a, u, e) {
    var n = Pa(e);
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = Hl(
      a,
      n,
      Rt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      ft,
      n,
      a
    ), n = lt, lt = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = Hl(
      u,
      n,
      Rt
    ), t === null ? t = !1 : (T(
      t,
      !0,
      ot,
      n,
      u
    ), n = lt, Tl = lt = null, t = n !== null)), t) : !1;
  }
  function bm(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  Ct.prototype.scrollIntoView = function(l) {
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
      var u = Al(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || H(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = F(u), bm(l, a);
        return;
      }
      if (u = F(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = F(e), bm(e, a)) : F(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Uy(l, t) {
    return l = F(l), Tm(l, t), !1;
  }
  function Tm(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Em(l, t) {
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
      for (var i = 0, c = 0; c < $t.length; c++) {
        var f = $t[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && ($t[i++] = f);
      }
      $t.length = i, n.observe(l);
    }), Tm(l, t));
  }
  function Cy(l, t) {
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
      typeof n.rootMargin == "string" ? Ay(
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
  function Ry(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[ye])
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
      if (l = Xt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function py(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Xt(l.nextSibling), l === null)) return null;
    return l;
  }
  function zm(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Xt(l.nextSibling), l === null)) return null;
    return l;
  }
  function no(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function io(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function jy(l, t) {
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
  function Xt(l) {
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
  function _m(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Xt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Om(l) {
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
  function Hy(l, t) {
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
  function xy(l) {
    sm(function() {
      sm(function(t) {
        return l(t);
      });
    });
  }
  function Nm(l, t, a) {
    switch (t = Ie(a), l) {
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
  function Am(l, t, a) {
    for (var u in a) {
      var e = a[u];
      a.hasOwnProperty(u) && e != null && rl(l, t, u, null, sy, e);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === Wt && (l.onclick = null), hn(l);
  }
  function fo(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    hn(l);
  }
  var Qt = /* @__PURE__ */ new Map(), Dm = /* @__PURE__ */ new Set();
  function ke(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var za = G.d;
  G.d = {
    f: By,
    r: qy,
    D: Yy,
    C: Gy,
    L: Xy,
    m: Qy,
    X: Vy,
    S: Zy,
    M: Ly
  };
  function By() {
    var l = za.f(), t = bi();
    return l || t;
  }
  function qy(l) {
    var t = Ou(l);
    t !== null && t.tag === 5 && t.type === "form" ? U0(t) : za.r(l);
  }
  var ie = typeof document > "u" ? null : document;
  function Mm(l, t, a) {
    var u = ie;
    if (u && typeof t == "string" && t) {
      var e = jt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Dm.has(e) || (Dm.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), kl(t, "link", l), Vl(t), u.head.appendChild(t)));
    }
  }
  function Yy(l) {
    za.D(l), Mm("dns-prefetch", l, null);
  }
  function Gy(l, t) {
    za.C(l, t), Mm("preconnect", l, t);
  }
  function Xy(l, t, a) {
    za.L(l, t, a);
    var u = ie;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + jt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + jt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + jt(
        a.imageSizes
      ) + '"]')) : e += '[href="' + jt(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = ce(l);
          break;
        case "script":
          n = fe(l);
      }
      if (!(Qt.has(n) || (l = K(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Qt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(Pe(n)) || t === "script" && u.querySelector(ln(n))))) {
        var i = u.createElement("link");
        kl(i, "link", l), t === "style" && (i[yn] = !0, i.onload = i.onerror = function() {
          Qo(i);
        }), Vl(i), u.head.appendChild(i);
      }
    }
  }
  function Qy(l, t) {
    za.m(l, t);
    var a = ie;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + jt(u) + '"][href="' + jt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = fe(l);
      }
      if (!Qt.has(n) && (l = K({ rel: "modulepreload", href: l }, t), Qt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(ln(n)))
              return;
        }
        u = a.createElement("link"), kl(u, "link", l), Vl(u), a.head.appendChild(u);
      }
    }
  }
  function Zy(l, t, a) {
    za.S(l, t, a);
    var u = ie;
    if (u && l) {
      var e = Nu(u).hoistableStyles, n = ce(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          Pe(n)
        ))
          c.loading = 5;
        else {
          l = K(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Qt.get(n)) && oo(l, a);
          var f = i = u.createElement("link");
          Vl(f), kl(f, "link", l), f._p = new Promise(function(v, g) {
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
  function Vy(l, t) {
    za.X(l, t);
    var a = ie;
    if (a && l) {
      var u = Nu(a).hoistableScripts, e = fe(l), n = u.get(e);
      n || (n = a.querySelector(ln(e)), n || (l = K({ src: l, async: !0 }, t), (t = Qt.get(e)) && so(l, t), n = a.createElement("script"), Vl(n), kl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Ly(l, t) {
    za.M(l, t);
    var a = ie;
    if (a && l) {
      var u = Nu(a).hoistableScripts, e = fe(l), n = u.get(e);
      n || (n = a.querySelector(ln(e)), n || (l = K({ src: l, async: !0, type: "module" }, t), (t = Qt.get(e)) && so(l, t), n = a.createElement("script"), Vl(n), kl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Um(l, t, a, u) {
    var e = (e = hl.current) ? ke(e) : null;
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
            Pe(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Qt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Qt.set(l, n)), Ky(
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
    return 'href="' + jt(l) + '"';
  }
  function Pe(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Cm(l) {
    return K({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function Ky(l, t, a, u) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[yn] !== !0) {
        u.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[yn] = !0, t.onload = t.onerror = Qo.bind(null, t), kl(t, "link", a), Vl(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function fe(l) {
    return '[src="' + jt(l) + '"]';
  }
  function ln(l) {
    return "script[async]" + l;
  }
  function Rm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + jt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Vl(u), u;
          var e = K({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Vl(u), kl(u, "style", e), Ai(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = ce(a.href);
          var n = l.querySelector(
            Pe(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Vl(n), n;
          u = Cm(a), (e = Qt.get(e)) && oo(u, e), n = (l.ownerDocument || l).createElement("link"), Vl(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), kl(n, "link", u), t.state.loading |= 4, Ai(n, a.precedence, l), t.instance = n;
        case "script":
          return n = fe(a.src), (e = l.querySelector(
            ln(n)
          )) ? (t.instance = e, Vl(e), e) : (u = a, (e = Qt.get(n)) && (u = K({}, a), so(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Vl(e), kl(e, "link", u), l.head.appendChild(e), t.instance = e);
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
  function pm(l, t, a) {
    if (Di === null) {
      var u = /* @__PURE__ */ new Map(), e = Di = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Di, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[ye] || n[wl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
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
  function Jy(l, t, a) {
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
  function jm(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function Hm(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function xm(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Bm(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += xm(t), l.suspenseyImages.push(t)), l = Fy.bind(l), t.decode().then(l, l));
  }
  function wy(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = ce(u.href), n = t.querySelector(
          Pe(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = tn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Vl(n);
          return;
        }
        n = t.ownerDocument || t, u = Cm(u), (e = Qt.get(e)) && oo(u, e), n = n.createElement("link"), Vl(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), kl(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = tn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Mi = 0;
  function $y(l, t) {
    return l.stylesheets && l.count === 0 && Ci(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Ci(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Mi === 0 && (Mi = 62500 * my());
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
  function qm(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) Ci(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function tn() {
    this.count--, qm(this);
  }
  function Fy() {
    this.imgCount--, qm(this);
  }
  var Ui = null;
  function Ci(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Ui = /* @__PURE__ */ new Map(), t.forEach(Wy, l), Ui = null, tn.call(l));
  }
  function Wy(l, t) {
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
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = tn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var oe = {
    $$typeof: Dl,
    Provider: null,
    Consumer: null,
    _currentValue: at,
    _currentValue2: at,
    _threadCount: 0
  };
  function Iy(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Li(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Li(0), this.hiddenUpdates = Li(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Ym(l, t, a, u, e, n, i, c, f, v, g, z) {
    return l = new Iy(
      l,
      t,
      a,
      i,
      f,
      v,
      g,
      z,
      c
    ), t = 1, n === !0 && (t |= 24), n = mt(3, null, null, t), l.current = n, n.stateNode = l, t = Nc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Uc(n), l;
  }
  function Gm(l) {
    return l ? (l = xu, l) : xu;
  }
  function Xm(l, t, a, u, e, n) {
    e = Gm(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ha(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = xa(l, u, t), a !== null && (ht(a, l, t), pe(a, l, t));
  }
  function Qm(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function vo(l, t) {
    Qm(l, t), (l = l.alternate) && Qm(l, t);
  }
  function Zm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = uu(l, 67108864);
      t !== null && ht(t, l, 67108864), vo(l, 67108864);
    }
  }
  function Vm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Ut();
      t = Ki(t);
      var a = uu(l, t);
      a !== null && ht(a, l, t), vo(l, t);
    }
  }
  var se = !0;
  function ky(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = G.p;
    try {
      G.p = 2, ro(l, t, a, u);
    } finally {
      G.p = n, C.T = e;
    }
  }
  function Py(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = G.p;
    try {
      G.p = 8, ro(l, t, a, u);
    } finally {
      G.p = n, C.T = e;
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
        ), Km(l, u);
      else if (th(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (Km(l, u), t & 4 && -1 < lh.indexOf(l)) {
        for (; e !== null; ) {
          var n = Ou(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = ka(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - zt(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    ia(n), (sl & 6) === 0 && (hi = Tt() + 500, $e(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = uu(n, 2), c !== null && ht(c, n, 2), bi(), vo(n, 2);
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
    if (Ri = null, l = Pa(l), l !== null) {
      var t = al(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = Sl(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = Gl(t), l !== null) return l;
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
  function Lm(l) {
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
        switch (mv()) {
          case Uo:
            return 2;
          case Co:
            return 8;
          case sn:
          case vv:
            return 32;
          case Ro:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var go = !1, wa = null, $a = null, Fa = null, an = /* @__PURE__ */ new Map(), un = /* @__PURE__ */ new Map(), Wa = [], lh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Km(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        wa = null;
        break;
      case "dragenter":
      case "dragleave":
        $a = null;
        break;
      case "mouseover":
      case "mouseout":
        Fa = null;
        break;
      case "pointerover":
      case "pointerout":
        an.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        un.delete(t.pointerId);
    }
  }
  function en(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Ou(t), t !== null && Zm(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function th(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return wa = en(
          wa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return $a = en(
          $a,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Fa = en(
          Fa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return an.set(
          n,
          en(
            an.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, un.set(
          n,
          en(
            un.get(n) || null,
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
  function Jm(l) {
    var t = Pa(l.target);
    if (t !== null) {
      var a = al(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = Sl(a), t !== null) {
            l.blockedOn = t, Yo(l.priority, function() {
              Vm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Gl(a), t !== null) {
            l.blockedOn = t, Yo(l.priority, function() {
              Vm(a);
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
        return t = Ou(a), t !== null && Zm(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function wm(l, t, a) {
    pi(l) && a.delete(t);
  }
  function ah() {
    go = !1, wa !== null && pi(wa) && (wa = null), $a !== null && pi($a) && ($a = null), Fa !== null && pi(Fa) && (Fa = null), an.forEach(wm), un.forEach(wm);
  }
  function ji(l, t) {
    l.blockedOn === t && (l.blockedOn = null, go || (go = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      ah
    )));
  }
  var Hi = null;
  function $m(l) {
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
    wa !== null && ji(wa, l), $a !== null && ji($a, l), Fa !== null && ji(Fa, l), an.forEach(t), un.forEach(t);
    for (var a = 0; a < Wa.length; a++) {
      var u = Wa[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < Wa.length && (a = Wa[0], a.blockedOn === null); )
      Jm(a), a.blockedOn === null && Wa.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[dt] || null;
        if (typeof n == "function")
          i || $m(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[dt] || null)
              c = i.formAction;
            else if (ho(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), $m(a);
        }
      }
  }
  function Fm() {
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
    var a = t.current, u = Ut();
    Xm(a, u, l, t, null, null);
  }, xi.prototype.unmount = So.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Xm(l.current, 2, null, l, null, null), bi(), t[_u] = null;
    }
  };
  function xi(l) {
    this._internalRoot = l;
  }
  xi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = qo();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < Wa.length && t !== 0 && t < Wa[a].priority; a++) ;
      Wa.splice(a, 0, l), a === 0 && Jm(l);
    }
  };
  var Wm = il.version;
  if (Wm !== "19.3.0")
    throw Error(
      y(
        527,
        Wm,
        "19.3.0"
      )
    );
  G.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(y(188)) : (l = Object.keys(l).join(","), Error(y(268, l)));
    return l = zl(t), l = l !== null ? j(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var uh = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: C,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Bi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Bi.isDisabled && Bi.supportsFiber)
      try {
        me = Bi.inject(
          uh
        ), Et = Bi;
      } catch {
      }
  }
  return cn.createRoot = function(l, t) {
    if (!fl(l)) throw Error(y(299));
    var a = !1, u = "", e = G0, n = X0, i = Q0;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Ym(
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
      Fm
    ), l[_u] = t.current, wf(l), new So(t);
  }, cn.hydrateRoot = function(l, t, a) {
    if (!fl(l)) throw Error(y(299));
    var u = !1, e = "", n = G0, i = X0, c = Q0, f = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Ym(
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
      Fm
    ), t.context = Gm(null), a = t.current, u = Ut(), u = Ki(u), e = Ha(u), e.callback = null, xa(a, e, u), a = u, t.current.lanes = a, re(t, a), ia(t), l[_u] = t.current, wf(l), new xi(t);
  }, cn.version = "19.3.0", cn;
}
var iv;
function vh() {
  if (iv) return Eo.exports;
  iv = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (il) {
        console.error(il);
      }
  }
  return A(), Eo.exports = mh(), Eo.exports;
}
var rh = vh();
function yh(A = "/api") {
  async function il(Z, y, fl) {
    const al = await fetch(`${A.replace(/\/$/, "")}/${Z}`, {
      ...y ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(y) } : {},
      signal: fl
    });
    if (!al.ok) {
      const Sl = await al.json().catch(() => ({}));
      throw new Error(Sl.error || `Erro HTTP ${al.status}`);
    }
    return Z === "export" ? al.blob() : al.json();
  }
  return { catalog: (Z) => il("catalog", null, Z), preview: (Z, y) => il("preview", Z, y), export: (Z, y) => il("export", Z, y) };
}
const cv = {
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
  pobreza_desigualdade: "Pobreza e desigualdade"
}, No = (A) => {
  if (cv[A]) return cv[A];
  const il = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return il.charAt(0).toLocaleUpperCase("pt-BR") + il.slice(1);
};
function hh(A) {
  let il = "";
  try {
    il = JSON.parse(A.detail).categorias || "";
  } catch {
    il = "";
  }
  const Z = {};
  for (const y of String(il).split("|")) {
    const fl = y.indexOf(":");
    if (fl < 1) continue;
    const al = y.slice(0, fl).trim(), Sl = y.slice(fl + 1).trim();
    al && Sl && (Z[al] = Sl);
  }
  return Z;
}
const fv = { fgb: 6500, gpkg: 1900, shp: 250 };
function gh({ apiBaseUrl: A = "/api", client: il, value: Z, onChange: y, onExport: fl, download: al = !0, className: Sl = "", categoriaNome: Gl = "" }) {
  const yl = pl.useMemo(() => il || yh(A), [il, A]), [zl, j] = pl.useState(null), [T, H] = pl.useState({ attributes: [], format: "fgb" }), X = Z ?? T, [Al, bl] = pl.useState(""), [F, lt] = pl.useState("2022"), [Tl, ft] = pl.useState(""), [ot, Rt] = pl.useState(""), [Hl, K] = pl.useState({}), [J, st] = pl.useState(0), [tt, Zl] = pl.useState(""), [Ul, Zt] = pl.useState(!1), [ca, Dl] = pl.useState(""), [O, B] = pl.useState(null), x = pl.useRef(!0);
  pl.useEffect(() => {
    x.current = !0;
    const S = new AbortController();
    return j(null), Zl(""), yl.catalog(S.signal).then((q) => {
      j(q), bl(q.attributes.find((el) => el.source === "IBGE · Censo 2022")?.source || q.attributes[0]?.source || "");
    }).catch((q) => {
      q.name !== "AbortError" && Zl(q.message);
    }), () => {
      x.current = !1, S.abort();
    };
  }, [yl]);
  function cl(S) {
    Z === void 0 && H(S), y?.(S), Dl("");
  }
  const w = zl?.attributes || [], gt = [...new Set(w.map((S) => S.source))], St = [...new Set(w.filter((S) => S.source === Al).map((S) => S.year))].sort((S, q) => q - S), Ft = St.includes(Number(F)) ? Number(F) : St[0], s = w.filter((S) => S.source === Al && S.year === Ft), _ = [...new Set(s.map((S) => S.theme))], M = new Set(X.attributes), R = pl.useMemo(() => {
    const S = w.filter((hl) => M.has(hl.id));
    if (!S.length) return "Categoria — fonte majoritária — data da geração";
    const q = /* @__PURE__ */ new Map();
    for (const hl of S) q.set(hl.source, (q.get(hl.source) || 0) + 1);
    const el = [...q.entries()].sort((hl, pt) => pt[1] - hl[1])[0][0];
    return `${Gl || "Categoria"} — ${el} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [w, X.attributes, Gl]), W = w.filter((S) => M.has(S.id)), tl = pl.useMemo(() => new Map(w.map((S) => [S.id, hh(S)])), [w]), ul = s.filter((S) => (!Tl || S.theme === Tl) && `${S.label} ${S.field} ${S.unit}`.toLocaleLowerCase("pt-BR").includes(ot.toLocaleLowerCase("pt-BR"))), C = (S, q) => Object.entries(Hl).every(([el, hl]) => !hl || el === q || tl.get(S.id)?.[el] === hl), G = (() => {
    if (!Tl) return [];
    const S = /* @__PURE__ */ new Map();
    for (const q of ul) for (const [el, hl] of Object.entries(tl.get(q.id) || {}))
      S.has(el) || S.set(el, /* @__PURE__ */ new Set()), C(q, el) && S.get(el).add(hl);
    return [...S].map(([q, el]) => [q, [...el].sort((hl, pt) => hl.localeCompare(pt, "pt-BR", { numeric: !0 }))]).filter(([q, el]) => el.length > 1 || Hl[q]).sort((q, el) => q[0].localeCompare(el[0], "pt-BR"));
  })(), at = ul.filter((S) => C(S, null)), Eu = at.slice(J * 40, J * 40 + 40);
  pl.useEffect(() => {
    st(0);
  }, [Al, F, Tl, ot, Hl]), pl.useEffect(() => {
    K({});
  }, [Al, F, Tl]);
  const _a = `${X.format}|${[...X.attributes].join(",")}`;
  pl.useEffect(() => {
    if (B(null), !X.attributes.length) return;
    const S = new AbortController(), q = { attributes: X.attributes, format: X.format }, el = setTimeout(() => yl.preview(q, S.signal).then(B).catch((hl) => {
      hl.name !== "AbortError" && Zl(hl.message);
    }), 250);
    return () => {
      clearTimeout(el), S.abort();
    };
  }, [yl, _a]);
  function bt(S) {
    cl({ ...X, attributes: M.has(S) ? X.attributes.filter((q) => q !== S) : [...X.attributes, S] });
  }
  async function Xl() {
    Zt(!0), Zl(""), Dl(zl?.destino ? `Gerando geometria e tabela de atributos em ${zl.destino}/` : "Gerando geometria e tabela de atributos…");
    const S = { ...X, attributes: [...X.attributes] };
    try {
      const q = await yl.export(S), el = `municipios_sp_${S.format}.zip`;
      if (await fl?.({ blob: q, filename: el, configuration: S, attributes: W }), al) {
        const hl = URL.createObjectURL(q), pt = document.createElement("a");
        pt.href = hl, pt.download = el, pt.click(), setTimeout(() => URL.revokeObjectURL(hl), 1e4);
      }
      x.current && Dl("Camada gerada. O pacote contém a camada, o dicionário e os metadados.");
    } catch (q) {
      x.current && (Zl(q.message), Dl(""));
    } finally {
      x.current && Zt(!1);
    }
  }
  return /* @__PURE__ */ b.jsxs("section", { className: `mlb ${Sl}`, "aria-label": "Gerador de camada municipal", children: [
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
    tt && /* @__PURE__ */ b.jsx("div", { className: "mlb-error", role: "alert", children: tt }),
    zl ? /* @__PURE__ */ b.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ b.jsxs("main", { className: "mlb-panel", children: [
        /* @__PURE__ */ b.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ b.jsx("select", { value: Al, onChange: (S) => {
              bl(S.target.value), ft("");
            }, children: gt.map((S) => /* @__PURE__ */ b.jsx("option", { children: S }, S)) })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ b.jsx("select", { value: Ft ?? "", onChange: (S) => {
              lt(S.target.value), ft("");
            }, children: St.map((S) => /* @__PURE__ */ b.jsx("option", { children: S }, S)) })
          ] }),
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ b.jsxs("select", { value: Tl, onChange: (S) => ft(S.target.value), children: [
              /* @__PURE__ */ b.jsx("option", { value: "", children: "Todos os temas" }),
              _.map((S) => /* @__PURE__ */ b.jsx("option", { value: S, children: No(S) }, S))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ b.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ b.jsx("input", { type: "search", value: ot, placeholder: "Ex.: renda, população, IPDM…", onChange: (S) => Rt(S.target.value) })
          ] }),
          G.map(([S, q]) => /* @__PURE__ */ b.jsxs("label", { children: [
            S,
            /* @__PURE__ */ b.jsxs("select", { value: Hl[S] ?? "", onChange: (el) => K({ ...Hl, [S]: el.target.value }), children: [
              /* @__PURE__ */ b.jsxs("option", { value: "", children: [
                "Todos (",
                q.length,
                ")"
              ] }),
              q.map((el) => /* @__PURE__ */ b.jsx("option", { value: el, children: el }, el))
            ] })
          ] }, S)),
          !!Object.values(Hl).filter(Boolean).length && /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => K({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ b.jsxs("span", { children: [
            at.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ b.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !at.length || Ul, onClick: () => cl({ ...X, attributes: [.../* @__PURE__ */ new Set([...X.attributes, ...at.map((S) => S.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !M.size || Ul, onClick: () => cl({ ...X, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ b.jsxs("div", { className: "mlb-attributes", children: [
          Eu.map((S) => /* @__PURE__ */ b.jsxs("article", { className: M.has(S.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ b.jsxs("label", { children: [
              /* @__PURE__ */ b.jsx("input", { type: "checkbox", checked: M.has(S.id), disabled: Ul, onChange: () => bt(S.id) }),
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
          !Eu.length && /* @__PURE__ */ b.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ b.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: !J, onClick: () => st(J - 1), children: "Anterior" }),
          /* @__PURE__ */ b.jsxs("span", { children: [
            "Página ",
            J + 1,
            " de ",
            Math.max(1, Math.ceil(at.length / 40))
          ] }),
          /* @__PURE__ */ b.jsx("button", { type: "button", disabled: (J + 1) * 40 >= at.length, onClick: () => st(J + 1), children: "Próxima" })
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
          W.map((S) => /* @__PURE__ */ b.jsxs("article", { className: "mlb-basket-item", children: [
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
            /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: Ul, title: `Remover ${S.label}`, "aria-label": `Remover ${S.label}`, onClick: () => bt(S.id), children: "×" })
          ] }, S.id)),
          !W.length && /* @__PURE__ */ b.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ b.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ b.jsxs("select", { disabled: Ul, value: X.format, onChange: (S) => cl({ ...X, format: S.target.value }), children: [
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
          /* @__PURE__ */ b.jsx("input", { type: "text", maxLength: 200, disabled: Ul, value: X.nome ?? "", placeholder: R, onChange: (S) => cl({ ...X, nome: S.target.value }) })
        ] }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        M.size > fv[X.format] && /* @__PURE__ */ b.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ b.jsx("button", { type: "button", className: "mlb-primary", disabled: Ul || !M.size || M.size > fv[X.format], onClick: Xl, children: Ul ? "Gerando camada…" : al ? "Gerar e baixar camada" : "Gerar camada" }),
        /* @__PURE__ */ b.jsx("p", { className: "mlb-status", role: "status", children: ca }),
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
            O.fields.map((q) => /* @__PURE__ */ b.jsx("td", { children: S[q] == null ? "Sem valor" : S[q].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, q))
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
    ] }) : /* @__PURE__ */ b.jsx("p", { role: "status", children: tt ? "Não foi possível carregar o catálogo. Verifique a API configurada." : "Carregando catálogo…" })
  ] });
}
function Sh({ category: A, apiBase: il, onGenerated: Z }) {
  const y = document.createElement("dialog");
  y.className = "ea-municipal-dialog";
  const fl = document.createElement("div");
  y.append(fl), document.body.append(y);
  const al = rh.createRoot(fl);
  let Sl = !1;
  const Gl = () => {
    Sl || (al.unmount(), y.close(), y.remove());
  };
  y.addEventListener("cancel", (zl) => {
    zl.preventDefault(), Gl();
  });
  function yl() {
    const [zl, j] = pl.useState(!1), T = pl.useMemo(() => {
      let X;
      async function Al(bl, F, lt) {
        const Tl = await fetch(`${il}/extracao-atributos/municipal/${encodeURIComponent(A.id)}/${bl}`, {
          ...F ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(F) } : {},
          signal: lt
        });
        if (!Tl.ok) {
          const ft = await Tl.json().catch(() => ({}));
          throw new Error(typeof ft.detail == "string" ? ft.detail : "Falha no gerador municipal.");
        }
        return bl === "export" ? (X = { arquivo: Tl.headers.get("X-Camada-Arquivo"), id: Tl.headers.get("X-Camada-Id") }, Tl.blob()) : Tl.json();
      }
      return {
        catalog: (bl) => Al("catalog", null, bl),
        preview: (bl, F) => Al("preview", bl, F),
        export: async (bl) => {
          Sl = !0, j(!0);
          try {
            return await Al("export", { ...bl, nome: bl.nome || "" });
          } catch (F) {
            throw Sl = !1, j(!1), F;
          }
        },
        generated: () => X
      };
    }, []);
    async function H() {
      try {
        await Z(T.generated()), Sl = !1, Gl();
      } finally {
        Sl = !1, j(!1);
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
        /* @__PURE__ */ b.jsx("button", { type: "button", "aria-label": "Fechar gerador municipal", disabled: zl, onClick: Gl, children: "×" })
      ] }),
      /* @__PURE__ */ b.jsx("p", { className: "ea-municipal-help", children: "Escolha os atributos que representam esta categoria. Ao gerar, a camada será salva no acervo e adicionada às bases da análise." }),
      /* @__PURE__ */ b.jsx(gh, { client: T, download: !1, onExport: H, categoriaNome: A.nome })
    ] });
  }
  y.showModal(), al.render(/* @__PURE__ */ b.jsx(yl, {}));
}
export {
  Sh as abrirMunicipal
};
