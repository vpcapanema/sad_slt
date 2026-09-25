var _o = { exports: {} }, hn = {};
var t0;
function cy() {
  if (t0) return hn;
  t0 = 1;
  var O = /* @__PURE__ */ Symbol.for("react.transitional.element"), F = /* @__PURE__ */ Symbol.for("react.fragment");
  function Z(h, ll, W) {
    var _l = null;
    if (W !== void 0 && (_l = "" + W), ll.key !== void 0 && (_l = "" + ll.key), "key" in ll) {
      W = {};
      for (var ql in ll)
        ql !== "key" && (W[ql] = ll[ql]);
    } else W = ll;
    return ll = W.ref, {
      $$typeof: O,
      type: h,
      key: _l,
      ref: ll !== void 0 ? ll : null,
      props: W
    };
  }
  return hn.Fragment = F, hn.jsx = Z, hn.jsxs = Z, hn;
}
var a0;
function fy() {
  return a0 || (a0 = 1, _o.exports = cy()), _o.exports;
}
var S = fy(), Oo = { exports: {} }, V = {};
var u0;
function oy() {
  if (u0) return V;
  u0 = 1;
  var O = /* @__PURE__ */ Symbol.for("react.transitional.element"), F = /* @__PURE__ */ Symbol.for("react.portal"), Z = /* @__PURE__ */ Symbol.for("react.fragment"), h = /* @__PURE__ */ Symbol.for("react.strict_mode"), ll = /* @__PURE__ */ Symbol.for("react.profiler"), W = /* @__PURE__ */ Symbol.for("react.consumer"), _l = /* @__PURE__ */ Symbol.for("react.context"), ql = /* @__PURE__ */ Symbol.for("react.forward_ref"), L = /* @__PURE__ */ Symbol.for("react.suspense"), Al = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), T = /* @__PURE__ */ Symbol.for("react.activity"), R = /* @__PURE__ */ Symbol.for("react.view_transition"), El = Symbol.iterator;
  function Zl(s) {
    return s === null || typeof s != "object" ? null : (s = El && s[El] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var ml = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, K = Object.assign, Ml = {};
  function xl(s, _, p) {
    this.props = s, this.context = _, this.refs = Ml, this.updater = p || ml;
  }
  xl.prototype.isReactComponent = {}, xl.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, xl.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function nt() {
  }
  nt.prototype = xl.prototype;
  function cl(s, _, p) {
    this.props = s, this.context = _, this.refs = Ml, this.updater = p || ml;
  }
  var x = cl.prototype = new nt();
  x.constructor = cl, K(x, xl.prototype), x.isPureReactComponent = !0;
  var Ul = Array.isArray;
  function q() {
  }
  var I = { H: null, A: null, T: null, S: null }, Tt = Object.prototype.hasOwnProperty;
  function Ll(s, _, p) {
    var U = p.ref;
    return {
      $$typeof: O,
      type: s,
      key: _,
      ref: U !== void 0 ? U : null,
      props: p
    };
  }
  function it(s, _) {
    return Ll(s.type, _, s.props);
  }
  function Il(s) {
    return typeof s == "object" && s !== null && s.$$typeof === O;
  }
  function Pt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(p) {
      return _[p];
    });
  }
  var mt = /\/+/g;
  function Rl(s, _) {
    return typeof s == "object" && s !== null && s.key != null ? Pt("" + s.key) : _.toString(36);
  }
  function N(s) {
    switch (s.status) {
      case "fulfilled":
        return s.value;
      case "rejected":
        throw s.reason;
      default:
        switch (typeof s.status == "string" ? s.then(q, q) : (s.status = "pending", s.then(
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
  function B(s, _, p, U, J) {
    var fl = typeof s;
    (fl === "undefined" || fl === "boolean") && (s = null);
    var tl = !1;
    if (s === null) tl = !0;
    else
      switch (fl) {
        case "bigint":
        case "string":
        case "number":
          tl = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case O:
            case F:
              tl = !0;
              break;
            case j:
              return tl = s._init, B(
                tl(s._payload),
                _,
                p,
                U,
                J
              );
          }
      }
    if (tl)
      return J = J(s), tl = U === "" ? "." + Rl(s, 0) : U, Ul(J) ? (p = "", tl != null && (p = tl.replace(mt, "$&/") + "/"), B(J, _, p, "", function(Ht) {
        return Ht;
      })) : J != null && (Il(J) && (J = it(
        J,
        p + (J.key == null || s && s.key === J.key ? "" : ("" + J.key).replace(
          mt,
          "$&/"
        ) + "/") + tl
      )), _.push(J)), 1;
    tl = 0;
    var C = U === "" ? "." : U + ":";
    if (Ul(s))
      for (var G = 0; G < s.length; G++)
        U = s[G], fl = C + Rl(U, G), tl += B(
          U,
          _,
          p,
          fl,
          J
        );
    else if (G = Zl(s), typeof G == "function")
      for (s = G.call(s), G = 0; !(U = s.next()).done; )
        U = U.value, fl = C + Rl(U, G++), tl += B(
          U,
          _,
          p,
          fl,
          J
        );
    else if (fl === "object") {
      if (typeof s.then == "function")
        return B(
          N(s),
          _,
          p,
          U,
          J
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return tl;
  }
  function Y(s, _, p) {
    if (s == null) return s;
    var U = [], J = 0;
    return B(s, U, "", "", function(fl) {
      return _.call(p, fl, J++);
    }), U;
  }
  function sl(s) {
    if (s._status === -1) {
      var _ = s._result, p = _();
      p.then(
        function(U) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = U, p.status === void 0 && (p.status = "fulfilled", p.value = U));
        },
        function(U) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = U, p.status === void 0 && (p.status = "rejected", p.reason = U));
        }
      ), s._status === -1 && (s._status = 0, s._result = p);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var k = typeof reportError == "function" ? reportError : function(s) {
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
  function dt(s) {
    var _ = I.T, p = {};
    p.types = _ !== null ? _.types : null, I.T = p;
    try {
      var U = s(), J = I.S;
      J !== null && J(p, U), typeof U == "object" && U !== null && typeof U.then == "function" && U.then(q, k);
    } catch (fl) {
      k(fl);
    } finally {
      _ !== null && p.types !== null && (_.types = p.types), I.T = _;
    }
  }
  function Lt(s) {
    var _ = I.T;
    if (_ !== null) {
      var p = _.types;
      p === null ? _.types = [s] : p.indexOf(s) === -1 && p.push(s);
    } else dt(Lt.bind(null, s));
  }
  var jt = {
    map: Y,
    forEach: function(s, _, p) {
      Y(
        s,
        function() {
          _.apply(this, arguments);
        },
        p
      );
    },
    count: function(s) {
      var _ = 0;
      return Y(s, function() {
        _++;
      }), _;
    },
    toArray: function(s) {
      return Y(s, function(_) {
        return _;
      }) || [];
    },
    only: function(s) {
      if (!Il(s))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return s;
    }
  };
  return V.Activity = T, V.Children = jt, V.Component = xl, V.Fragment = Z, V.Profiler = ll, V.PureComponent = cl, V.StrictMode = h, V.Suspense = L, V.ViewTransition = R, V.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = I, V.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return I.H.useMemoCache(s);
    }
  }, V.addTransitionType = Lt, V.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, V.cacheSignal = function() {
    return null;
  }, V.cloneElement = function(s, _, p) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var U = K({}, s.props), J = s.key;
    if (_ != null)
      for (fl in _.key !== void 0 && (J = "" + _.key), _)
        !Tt.call(_, fl) || fl === "key" || fl === "__self" || fl === "__source" || fl === "ref" && _.ref === void 0 || (U[fl] = _[fl]);
    var fl = arguments.length - 2;
    if (fl === 1) U.children = p;
    else if (1 < fl) {
      for (var tl = Array(fl), C = 0; C < fl; C++)
        tl[C] = arguments[C + 2];
      U.children = tl;
    }
    return Ll(s.type, J, U);
  }, V.createContext = function(s) {
    return s = {
      $$typeof: _l,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: W,
      _context: s
    }, s;
  }, V.createElement = function(s, _, p) {
    var U, J = {}, fl = null;
    if (_ != null)
      for (U in _.key !== void 0 && (fl = "" + _.key), _)
        Tt.call(_, U) && U !== "key" && U !== "__self" && U !== "__source" && (J[U] = _[U]);
    var tl = arguments.length - 2;
    if (tl === 1) J.children = p;
    else if (1 < tl) {
      for (var C = Array(tl), G = 0; G < tl; G++)
        C[G] = arguments[G + 2];
      J.children = C;
    }
    if (s && s.defaultProps)
      for (U in tl = s.defaultProps, tl)
        J[U] === void 0 && (J[U] = tl[U]);
    return Ll(s, fl, J);
  }, V.createRef = function() {
    return { current: null };
  }, V.forwardRef = function(s) {
    return { $$typeof: ql, render: s };
  }, V.isValidElement = Il, V.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: sl
    };
  }, V.memo = function(s, _) {
    return {
      $$typeof: Al,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, V.startTransition = dt, V.unstable_useCacheRefresh = function() {
    return I.H.useCacheRefresh();
  }, V.use = function(s) {
    return I.H.use(s);
  }, V.useActionState = function(s, _, p) {
    return I.H.useActionState(s, _, p);
  }, V.useCallback = function(s, _) {
    return I.H.useCallback(s, _);
  }, V.useContext = function(s) {
    return I.H.useContext(s);
  }, V.useDebugValue = function() {
  }, V.useDeferredValue = function(s, _) {
    return I.H.useDeferredValue(s, _);
  }, V.useEffect = function(s, _) {
    return I.H.useEffect(s, _);
  }, V.useEffectEvent = function(s) {
    return I.H.useEffectEvent(s);
  }, V.useId = function() {
    return I.H.useId();
  }, V.useImperativeHandle = function(s, _, p) {
    return I.H.useImperativeHandle(s, _, p);
  }, V.useInsertionEffect = function(s, _) {
    return I.H.useInsertionEffect(s, _);
  }, V.useLayoutEffect = function(s, _) {
    return I.H.useLayoutEffect(s, _);
  }, V.useMemo = function(s, _) {
    return I.H.useMemo(s, _);
  }, V.useOptimistic = function(s, _) {
    return I.H.useOptimistic(s, _);
  }, V.useReducer = function(s, _, p) {
    return I.H.useReducer(s, _, p);
  }, V.useRef = function(s) {
    return I.H.useRef(s);
  }, V.useState = function(s) {
    return I.H.useState(s);
  }, V.useSyncExternalStore = function(s, _, p) {
    return I.H.useSyncExternalStore(
      s,
      _,
      p
    );
  }, V.useTransition = function() {
    return I.H.useTransition();
  }, V.version = "19.3.0", V;
}
var e0;
function Ro() {
  return e0 || (e0 = 1, Oo.exports = oy()), Oo.exports;
}
var vl = Ro(), No = { exports: {} }, yn = {}, Ao = { exports: {} }, Mo = {};
var n0;
function sy() {
  return n0 || (n0 = 1, (function(O) {
    function F(N, B) {
      var Y = N.length;
      N.push(B);
      l: for (; 0 < Y; ) {
        var sl = Y - 1 >>> 1, k = N[sl];
        if (0 < ll(k, B))
          N[sl] = B, N[Y] = k, Y = sl;
        else break l;
      }
    }
    function Z(N) {
      return N.length === 0 ? null : N[0];
    }
    function h(N) {
      if (N.length === 0) return null;
      var B = N[0], Y = N.pop();
      if (Y !== B) {
        N[0] = Y;
        l: for (var sl = 0, k = N.length, dt = k >>> 1; sl < dt; ) {
          var Lt = 2 * (sl + 1) - 1, jt = N[Lt], s = Lt + 1, _ = N[s];
          if (0 > ll(jt, Y))
            s < k && 0 > ll(_, jt) ? (N[sl] = _, N[s] = Y, sl = s) : (N[sl] = jt, N[Lt] = Y, sl = Lt);
          else if (s < k && 0 > ll(_, Y))
            N[sl] = _, N[s] = Y, sl = s;
          else break l;
        }
      }
      return B;
    }
    function ll(N, B) {
      var Y = N.sortIndex - B.sortIndex;
      return Y !== 0 ? Y : N.id - B.id;
    }
    if (O.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var W = performance;
      O.unstable_now = function() {
        return W.now();
      };
    } else {
      var _l = Date, ql = _l.now();
      O.unstable_now = function() {
        return _l.now() - ql;
      };
    }
    var L = [], Al = [], j = 1, T = null, R = 3, El = !1, Zl = !1, ml = !1, K = !1, Ml = typeof setTimeout == "function" ? setTimeout : null, xl = typeof clearTimeout == "function" ? clearTimeout : null, nt = typeof setImmediate < "u" ? setImmediate : null;
    function cl(N) {
      for (var B = Z(Al); B !== null; ) {
        if (B.callback === null) h(Al);
        else if (B.startTime <= N)
          h(Al), B.sortIndex = B.expirationTime, F(L, B);
        else break;
        B = Z(Al);
      }
    }
    function x(N) {
      if (ml = !1, cl(N), !Zl)
        if (Z(L) !== null)
          Zl = !0, Ul || (Ul = !0, Il());
        else {
          var B = Z(Al);
          B !== null && Rl(x, B.startTime - N);
        }
    }
    var Ul = !1, q = -1, I = 5, Tt = -1;
    function Ll() {
      return K ? !0 : !(O.unstable_now() - Tt < I);
    }
    function it() {
      if (K = !1, Ul) {
        var N = O.unstable_now();
        Tt = N;
        var B = !0;
        try {
          l: {
            Zl = !1, ml && (ml = !1, xl(q), q = -1), El = !0;
            var Y = R;
            try {
              t: {
                for (cl(N), T = Z(L); T !== null && !(T.expirationTime > N && Ll()); ) {
                  var sl = T.callback;
                  if (typeof sl == "function") {
                    T.callback = null, R = T.priorityLevel;
                    var k = sl(
                      T.expirationTime <= N
                    );
                    if (N = O.unstable_now(), typeof k == "function") {
                      T.callback = k, cl(N), B = !0;
                      break t;
                    }
                    T === Z(L) && h(L), cl(N);
                  } else h(L);
                  T = Z(L);
                }
                if (T !== null) B = !0;
                else {
                  var dt = Z(Al);
                  dt !== null && Rl(
                    x,
                    dt.startTime - N
                  ), B = !1;
                }
              }
              break l;
            } finally {
              T = null, R = Y, El = !1;
            }
            B = void 0;
          }
        } finally {
          B ? Il() : Ul = !1;
        }
      }
    }
    var Il;
    if (typeof nt == "function")
      Il = function() {
        nt(it);
      };
    else if (typeof MessageChannel < "u") {
      var Pt = new MessageChannel(), mt = Pt.port2;
      Pt.port1.onmessage = it, Il = function() {
        mt.postMessage(null);
      };
    } else
      Il = function() {
        Ml(it, 0);
      };
    function Rl(N, B) {
      q = Ml(function() {
        N(O.unstable_now());
      }, B);
    }
    O.unstable_IdlePriority = 5, O.unstable_ImmediatePriority = 1, O.unstable_LowPriority = 4, O.unstable_NormalPriority = 3, O.unstable_Profiling = null, O.unstable_UserBlockingPriority = 2, O.unstable_cancelCallback = function(N) {
      N.callback = null;
    }, O.unstable_forceFrameRate = function(N) {
      0 > N || 125 < N ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : I = 0 < N ? Math.floor(1e3 / N) : 5;
    }, O.unstable_getCurrentPriorityLevel = function() {
      return R;
    }, O.unstable_next = function(N) {
      switch (R) {
        case 1:
        case 2:
        case 3:
          var B = 3;
          break;
        default:
          B = R;
      }
      var Y = R;
      R = B;
      try {
        return N();
      } finally {
        R = Y;
      }
    }, O.unstable_requestPaint = function() {
      K = !0;
    }, O.unstable_runWithPriority = function(N, B) {
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
      var Y = R;
      R = N;
      try {
        return B();
      } finally {
        R = Y;
      }
    }, O.unstable_scheduleCallback = function(N, B, Y) {
      var sl = O.unstable_now();
      switch (typeof Y == "object" && Y !== null ? (Y = Y.delay, Y = typeof Y == "number" && 0 < Y ? sl + Y : sl) : Y = sl, N) {
        case 1:
          var k = -1;
          break;
        case 2:
          k = 250;
          break;
        case 5:
          k = 1073741823;
          break;
        case 4:
          k = 1e4;
          break;
        default:
          k = 5e3;
      }
      return k = Y + k, N = {
        id: j++,
        callback: B,
        priorityLevel: N,
        startTime: Y,
        expirationTime: k,
        sortIndex: -1
      }, Y > sl ? (N.sortIndex = Y, F(Al, N), Z(L) === null && N === Z(Al) && (ml ? (xl(q), q = -1) : ml = !0, Rl(x, Y - sl))) : (N.sortIndex = k, F(L, N), Zl || El || (Zl = !0, Ul || (Ul = !0, Il()))), N;
    }, O.unstable_shouldYield = Ll, O.unstable_wrapCallback = function(N) {
      var B = R;
      return function() {
        var Y = R;
        R = B;
        try {
          return N.apply(this, arguments);
        } finally {
          R = Y;
        }
      };
    };
  })(Mo)), Mo;
}
var i0;
function ry() {
  return i0 || (i0 = 1, Ao.exports = sy()), Ao.exports;
}
var Do = { exports: {} }, et = {};
var c0;
function my() {
  if (c0) return et;
  c0 = 1;
  var O = Ro();
  function F(j) {
    var T = "https://react.dev/errors/" + j;
    if (1 < arguments.length) {
      T += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var R = 2; R < arguments.length; R++)
        T += "&args[]=" + encodeURIComponent(arguments[R]);
    }
    return "Minified React error #" + j + "; visit " + T + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function Z() {
  }
  var h = {
    d: {
      f: Z,
      r: function() {
        throw Error(F(522));
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
  }, ll = /* @__PURE__ */ Symbol.for("react.portal"), W = /* @__PURE__ */ Symbol.for("react.recoverable"), _l = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function ql(j, T, R) {
    var El = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: ll,
      key: El == null ? null : El === _l ? _l : "" + El,
      children: j,
      containerInfo: T,
      implementation: R
    };
  }
  var L = O.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function Al(j, T) {
    if (j === "font") return "";
    if (typeof T == "string")
      return T === "use-credentials" ? T : "";
  }
  return et.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = h, et.browser = function(j) {
    return { $$typeof: W, _reason: j };
  }, et.createPortal = function(j, T) {
    var R = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!T || T.nodeType !== 1 && T.nodeType !== 9 && T.nodeType !== 11)
      throw Error(F(299));
    return ql(j, T, null, R);
  }, et.flushSync = function(j) {
    var T = L.T, R = h.p;
    try {
      if (L.T = null, h.p = 2, j) return j();
    } finally {
      L.T = T, h.p = R, h.d.f();
    }
  }, et.preconnect = function(j, T) {
    typeof j == "string" && (T ? (T = T.crossOrigin, T = typeof T == "string" ? T === "use-credentials" ? T : "" : void 0) : T = null, h.d.C(j, T));
  }, et.prefetchDNS = function(j) {
    typeof j == "string" && h.d.D(j);
  }, et.preinit = function(j, T) {
    if (typeof j == "string" && T && typeof T.as == "string") {
      var R = T.as, El = Al(R, T.crossOrigin), Zl = typeof T.integrity == "string" ? T.integrity : void 0, ml = typeof T.fetchPriority == "string" ? T.fetchPriority : void 0;
      R === "style" ? h.d.S(
        j,
        typeof T.precedence == "string" ? T.precedence : void 0,
        {
          crossOrigin: El,
          integrity: Zl,
          fetchPriority: ml
        }
      ) : R === "script" && h.d.X(j, {
        crossOrigin: El,
        integrity: Zl,
        fetchPriority: ml,
        nonce: typeof T.nonce == "string" ? T.nonce : void 0
      });
    }
  }, et.preinitModule = function(j, T) {
    if (typeof j == "string")
      if (typeof T == "object" && T !== null) {
        if (T.as == null || T.as === "script") {
          var R = Al(
            T.as,
            T.crossOrigin
          );
          h.d.M(j, {
            crossOrigin: R,
            integrity: typeof T.integrity == "string" ? T.integrity : void 0,
            nonce: typeof T.nonce == "string" ? T.nonce : void 0,
            fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
          });
        }
      } else T == null && h.d.M(j);
  }, et.preload = function(j, T) {
    if (typeof j == "string" && typeof T == "object" && T !== null && typeof T.as == "string") {
      var R = T.as, El = Al(R, T.crossOrigin);
      h.d.L(j, R, {
        crossOrigin: El,
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
  }, et.preloadModule = function(j, T) {
    if (typeof j == "string")
      if (T) {
        var R = Al(T.as, T.crossOrigin);
        h.d.m(j, {
          as: typeof T.as == "string" && T.as !== "script" ? T.as : void 0,
          crossOrigin: R,
          integrity: typeof T.integrity == "string" ? T.integrity : void 0,
          nonce: typeof T.nonce == "string" ? T.nonce : void 0,
          fetchPriority: typeof T.fetchPriority == "string" ? T.fetchPriority : void 0
        });
      } else h.d.m(j);
  }, et.requestFormReset = function(j) {
    h.d.r(j);
  }, et.unstable_batchedUpdates = function(j, T) {
    return j(T);
  }, et.useFormState = function(j, T, R) {
    return L.H.useFormState(j, T, R);
  }, et.useFormStatus = function() {
    return L.H.useHostTransitionStatus();
  }, et.version = "19.3.0", et;
}
var f0;
function dy() {
  if (f0) return Do.exports;
  f0 = 1;
  function O() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(O);
      } catch (F) {
        console.error(F);
      }
  }
  return O(), Do.exports = my(), Do.exports;
}
var o0;
function vy() {
  if (o0) return yn;
  o0 = 1;
  var O = ry(), F = Ro(), Z = dy();
  function h(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function ll(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function W(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function _l(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function ql(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function L(l) {
    if (W(l) !== l)
      throw Error(h(188));
  }
  function Al(l) {
    var t = l.alternate;
    if (!t) {
      if (t = W(l), t === null) throw Error(h(188));
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
          if (n === a) return L(e), l;
          if (n === u) return L(e), t;
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
  function R(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function El(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function Zl(l) {
    var t = [null, null], a = R(l);
    return a === null || ml(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function ml(l, t, a, u) {
    for (; a !== null; ) {
      if (a === t) u.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (u.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && ml(
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
  function K(l) {
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
  var Ml = null, xl = null;
  function nt(l, t, a) {
    return l === a ? !0 : l === t ? (Ml = l, !0) : !1;
  }
  function cl(l, t, a) {
    return l === a ? (xl = l, !1) : l === t ? (xl !== null && (Ml = l), !0) : !1;
  }
  function x(l) {
    if (l === null) return null;
    do
      l = l === null ? null : l.return;
    while (l && l.tag !== 5 && l.tag !== 27 && l.tag !== 3);
    return l || null;
  }
  function Ul(l, t, a) {
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
  var q = Object.assign, I = /* @__PURE__ */ Symbol.for("react.element"), Tt = /* @__PURE__ */ Symbol.for("react.transitional.element"), Ll = /* @__PURE__ */ Symbol.for("react.portal"), it = /* @__PURE__ */ Symbol.for("react.fragment"), Il = /* @__PURE__ */ Symbol.for("react.strict_mode"), Pt = /* @__PURE__ */ Symbol.for("react.profiler"), mt = /* @__PURE__ */ Symbol.for("react.consumer"), Rl = /* @__PURE__ */ Symbol.for("react.context"), N = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), Y = /* @__PURE__ */ Symbol.for("react.suspense_list"), sl = /* @__PURE__ */ Symbol.for("react.memo"), k = /* @__PURE__ */ Symbol.for("react.lazy"), dt = /* @__PURE__ */ Symbol.for("react.activity"), Lt = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), jt = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), p = Symbol.iterator;
  function U(l) {
    return l === null || typeof l != "object" ? null : (l = p && l[p] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var J = /* @__PURE__ */ Symbol.for("react.client.reference");
  function fl(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === J ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case it:
        return "Fragment";
      case Pt:
        return "Profiler";
      case Il:
        return "StrictMode";
      case B:
        return "Suspense";
      case Y:
        return "SuspenseList";
      case dt:
        return "Activity";
      case s:
        return "ViewTransition";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case Ll:
          return "Portal";
        case Rl:
          return l.displayName || "Context";
        case mt:
          return (l._context.displayName || "Context") + ".Consumer";
        case N:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case sl:
          return t = l.displayName || null, t !== null ? t : fl(l.type) || "Memo";
        case k:
          t = l._payload, l = l._init;
          try {
            return fl(l(t));
          } catch {
          }
      }
    return null;
  }
  var tl = Array.isArray, C = F.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, G = Z.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Ht = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, Mu = [], Ma = -1;
  function Yl(l) {
    return { current: l };
  }
  function Kl(l) {
    0 > Ma || (l.current = Mu[Ma], Mu[Ma] = null, Ma--);
  }
  function hl(l, t) {
    Ma++, Mu[Ma] = l.current, l.current = t;
  }
  var Et = Yl(null), Da = Yl(null), Kt = Yl(null), Du = Yl(null);
  function Jt(l, t) {
    switch (hl(Kt, t), hl(Da, l), hl(Et, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? sd(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = sd(t), l = rd(t, l);
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
    Kl(Et), hl(Et, l);
  }
  function ra() {
    Kl(Et), Kl(Da), Kl(Kt);
  }
  function be(l) {
    var t = l.memoizedState;
    t !== null && (ye._currentValue = t.memoizedState, hl(Du, l)), t = Et.current;
    var a = rd(t, l.type);
    t !== a && (hl(Da, l), hl(Et, a));
  }
  function uu(l) {
    Da.current === l && (Kl(Et), Kl(Da)), Du.current === l && (Kl(Du), ye._currentValue = Ht);
  }
  var Te, b;
  function Q(l) {
    if (Te === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Te = t && t[1] || "", b = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Te + l + b;
  }
  var el = !1;
  function Dl(l, t) {
    if (!l || el) return "";
    el = !0;
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
                } catch (A) {
                  var r = A;
                }
                Reflect.construct(l, [], z);
              } else {
                try {
                  z.call();
                } catch (A) {
                  r = A;
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
              } catch (A) {
                r = A;
              }
              (z = l()) && typeof z.catch == "function" && z.catch(function() {
              });
            }
          } catch (A) {
            if (A && r && typeof A.stack == "string")
              return [A.stack, r.stack];
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
`), d = c.split(`
`);
        for (e = u = 0; u < f.length && !f[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < d.length && !d[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === f.length || e === d.length)
          for (u = f.length - 1, e = d.length - 1; 1 <= u && 0 <= e && f[u] !== d[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (f[u] !== d[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || f[u] !== d[e]) {
                  var g = `
` + f[u].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      el = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? Q(a) : "";
  }
  function Ca(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return Q(l.type);
      case 16:
        return Q("Lazy");
      case 13:
        return l.child !== t && t !== null ? Q("Suspense Fallback") : Q("Suspense");
      case 19:
        return Q("SuspenseList");
      case 0:
      case 15:
        return Dl(l.type, !1);
      case 11:
        return Dl(l.type.render, !1);
      case 1:
        return Dl(l.type, !0);
      case 31:
        return Q("Activity");
      case 30:
        return Q("ViewTransition");
      default:
        return "";
    }
  }
  function Cu(l) {
    try {
      var t = "", a = null;
      do
        t += Ca(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Ki = Object.prototype.hasOwnProperty, Ji = O.unstable_scheduleCallback, wi = O.unstable_cancelCallback, m0 = O.unstable_shouldYield, d0 = O.unstable_requestPaint, zt = O.unstable_now, v0 = O.unstable_getCurrentPriorityLevel, jo = O.unstable_ImmediatePriority, Ho = O.unstable_UserBlockingPriority, Sn = O.unstable_NormalPriority, h0 = O.unstable_LowPriority, xo = O.unstable_IdlePriority, y0 = O.log, g0 = O.unstable_setDisableYieldValue, Ee = null, _t = null;
  function pa(l) {
    if (typeof y0 == "function" && g0(l), _t && typeof _t.setStrictMode == "function")
      try {
        _t.setStrictMode(Ee, l);
      } catch {
      }
  }
  var Ot = Math.clz32 ? Math.clz32 : T0, S0 = Math.log, b0 = Math.LN2;
  function T0(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (S0(l) / b0 | 0) | 0;
  }
  var bn = 256, Tn = 262144, En = 4194304;
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
  function zn(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var c = u & 134217727;
    return c !== 0 ? (u = c & ~n, u !== 0 ? e = eu(u) : (i &= c, i !== 0 ? e = eu(i) : a || (a = c & ~l, a !== 0 && (e = eu(a))))) : (c = u & ~n, c !== 0 ? e = eu(c) : i !== 0 ? e = eu(i) : a || (a = u & ~l, a !== 0 && (e = eu(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function ze(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function Bo(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - Ot(a), e = 1 << u;
        t |= l[u], a &= ~e;
      }
    return t;
  }
  function E0(l, t) {
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
  function qo() {
    var l = En;
    return En <<= 1, (En & 62914560) === 0 && (En = 4194304), l;
  }
  function $i(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function _e(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function z0(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var c = l.entanglements, f = l.expirationTimes, d = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - Ot(a), z = 1 << g;
      c[g] = 0, f[g] = -1;
      var r = d[g];
      if (r !== null)
        for (d[g] = null, g = 0; g < r.length; g++) {
          var y = r[g];
          y !== null && (y.lane &= -536870913);
        }
      a &= ~z;
    }
    u !== 0 && Yo(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function Yo(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - Ot(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Go(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - Ot(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Xo(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : Fi(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function Fi(l) {
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
  function Wi(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Qo() {
    var l = G.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : $d(l.type));
  }
  function Vo(l, t) {
    var a = G.p;
    try {
      return G.p = l, t();
    } finally {
      G.p = a;
    }
  }
  var ma = Math.random().toString(36).slice(2), kl = "__reactFiber$" + ma, vt = "__reactProps$" + ma, pu = "__reactContainer$" + ma, Zo = "__reactEvents$" + ma, _0 = "__reactListeners$" + ma, O0 = "__reactHandles$" + ma, Lo = "__reactResources$" + ma, Oe = "__reactMarker$" + ma, _n = "__reactLoad$" + ma;
  function On(l) {
    delete l[kl], delete l[vt], delete l[_0], delete l[O0];
  }
  function nu(l) {
    var t;
    if (t = l[kl]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[pu] || a[kl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Dd(l); l !== null; ) {
            if (a = l[kl]) return a;
            l = Dd(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Uu(l) {
    if (l = l[kl] || l[pu]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function Ne(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(h(33));
  }
  function Ru(l) {
    var t = l[Lo];
    return t || (t = l[Lo] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function wl(l) {
    l[Oe] = !0;
  }
  function Ko(l) {
    l[_n] = void 0;
  }
  var Jo = /* @__PURE__ */ new Set(), wo = {};
  function iu(l, t) {
    ju(l, t), ju(l + "Capture", t);
  }
  function ju(l, t) {
    for (wo[l] = t, l = 0; l < t.length; l++)
      Jo.add(t[l]);
  }
  var N0 = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), $o = {}, Fo = {};
  function A0(l) {
    return Ki.call(Fo, l) ? !0 : Ki.call($o, l) ? !1 : N0.test(l) ? Fo[l] = !0 : ($o[l] = !0, !1);
  }
  var rl = !1;
  function Wo() {
    var l = rl;
    return rl = !1, l;
  }
  function Nn(l, t, a) {
    if (A0(t))
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
  function An(l, t, a) {
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
  function da(l, t, a, u) {
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
  function Io(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function M0(l, t, a) {
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
  function Ii(l) {
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
    var a = t.getValue(), u = "";
    return l && (u = Io(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  var D0 = /[\n"\\]/g;
  function xt(l) {
    return l.replace(
      D0,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function ki(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Nt(t)) : l.value !== "" + Nt(t) && (l.value = "" + Nt(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Pi(l, Nt(l.value)) : Pi(l, Nt(t)) : a != null ? Pi(l, Nt(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Nt(c) : l.removeAttribute("name");
  }
  function Po(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        Ii(l);
        return;
      }
      a = a != null ? "" + Nt(a) : "", t = t != null ? "" + Nt(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = c ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), Ii(l);
  }
  function Pi(l, t) {
    l.defaultValue !== "" + t && (l.defaultValue = "" + t);
  }
  function Hu(l, t, a, u) {
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
  function ls(l, t, a) {
    if (t != null && (t = "" + Nt(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Nt(a) : "";
  }
  function ts(l, t, a, u) {
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
    a = Nt(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), Ii(l);
  }
  function xu(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var C0 = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function as(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || C0.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function us(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(h(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "", rl = !0);
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && (as(l, e, u), rl = !0);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && as(l, n, t[n]);
  }
  function lc(l) {
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
  var p0 = /* @__PURE__ */ new Map([
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
  ]), U0 = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Mn(l) {
    return U0.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function la() {
  }
  var tc = null;
  function ac(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Bu = null, qu = null;
  function es(l) {
    var t = Uu(l);
    if (t && (l = t.stateNode)) {
      var a = l[vt] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (ki(
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
              'input[name="' + xt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[vt] || null;
                if (!e) throw Error(h(90));
                ki(
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
              u = a[t], u.form === l.form && ko(u);
          }
          break l;
        case "textarea":
          ls(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && Hu(l, !!a.multiple, t, !1);
      }
    }
  }
  var uc = !1;
  function ns(l, t, a) {
    if (uc) return l(t, a);
    uc = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (uc = !1, (Bu !== null || qu !== null) && (Mi(), Bu && (t = Bu, l = qu, qu = Bu = null, es(t), l)))
        for (t = 0; t < l.length; t++) es(l[t]);
    }
  }
  function Ae(l, t) {
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
        h(231, t, typeof a)
      );
    return a;
  }
  var va = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ec = !1;
  if (va)
    try {
      var Me = {};
      Object.defineProperty(Me, "passive", {
        get: function() {
          ec = !0;
        }
      }), window.addEventListener("test", Me, Me), window.removeEventListener("test", Me, Me);
    } catch {
      ec = !1;
    }
  var Ua = null, nc = null, Dn = null;
  function is() {
    if (Dn) return Dn;
    var l, t = nc, a = t.length, u, e = "value" in Ua ? Ua.value : Ua.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return Dn = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function Cn(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function pn() {
    return !0;
  }
  function cs() {
    return !1;
  }
  function ft(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var c in l)
        l.hasOwnProperty(c) && (a = l[c], this[c] = a ? a(n) : n[c]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? pn : cs, this.isPropagationStopped = cs, this;
    }
    return q(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = pn);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = pn);
      },
      persist: function() {
      },
      isPersistent: pn
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
  }, Un = ft(Ra), De = q({}, Ra, { view: 0, detail: 0 }), R0 = ft(De), ic, cc, Ce, Rn = q({}, De, {
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
    getModifierState: oc,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Ce && (Ce && l.type === "mousemove" ? (ic = l.screenX - Ce.screenX, cc = l.screenY - Ce.screenY) : cc = ic = 0, Ce = l), ic);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : cc;
    }
  }), fs = ft(Rn), j0 = q({}, Rn, { dataTransfer: 0 }), H0 = ft(j0), x0 = q({}, De, { relatedTarget: 0 }), fc = ft(x0), B0 = q({}, Ra, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), q0 = ft(B0), Y0 = q({}, Ra, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), G0 = ft(Y0), X0 = q({}, Ra, { data: 0 }), os = ft(X0), Q0 = {
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
  }, V0 = {
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
  }, Z0 = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function L0(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = Z0[l]) ? !!t[l] : !1;
  }
  function oc() {
    return L0;
  }
  var K0 = q({}, De, {
    key: function(l) {
      if (l.key) {
        var t = Q0[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Cn(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? V0[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: oc,
    charCode: function(l) {
      return l.type === "keypress" ? Cn(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Cn(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), J0 = ft(K0), w0 = q({}, Rn, {
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
  }), ss = ft(w0), $0 = q({}, Ra, { submitter: 0 }), F0 = ft($0), W0 = q({}, De, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: oc
  }), I0 = ft(W0), k0 = q({}, Ra, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), P0 = ft(k0), lv = q({}, Rn, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), tv = ft(lv), av = q({}, Ra, {
    newState: 0,
    oldState: 0,
    source: 0
  }), uv = ft(av), ev = [9, 13, 27, 32], sc = va && "CompositionEvent" in window, pe = null;
  va && "documentMode" in document && (pe = document.documentMode);
  var nv = va && "TextEvent" in window && !pe, rs = va && (!sc || pe && 8 < pe && 11 >= pe), ms = " ", ds = !1;
  function vs(l, t) {
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
  function hs(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Yu = !1;
  function iv(l, t) {
    switch (l) {
      case "compositionend":
        return hs(t);
      case "keypress":
        return t.which !== 32 ? null : (ds = !0, ms);
      case "textInput":
        return l = t.data, l === ms && ds ? null : l;
      default:
        return null;
    }
  }
  function cv(l, t) {
    if (Yu)
      return l === "compositionend" || !sc && vs(l, t) ? (l = is(), Dn = nc = Ua = null, Yu = !1, l) : null;
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
  function gs(l, t, a, u) {
    Bu ? qu ? qu.push(u) : qu = [u] : Bu = u, t = ji(t, "onChange"), 0 < t.length && (a = new Un(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Ue = null, Re = null;
  function ov(l) {
    ed(l, 0);
  }
  function jn(l) {
    var t = Ne(l);
    if (ko(t)) return l;
  }
  function Ss(l, t) {
    if (l === "change") return t;
  }
  var bs = !1;
  if (va) {
    var rc;
    if (va) {
      var mc = "oninput" in document;
      if (!mc) {
        var Ts = document.createElement("div");
        Ts.setAttribute("oninput", "return;"), mc = typeof Ts.oninput == "function";
      }
      rc = mc;
    } else rc = !1;
    bs = rc && (!document.documentMode || 9 < document.documentMode);
  }
  function Es() {
    Ue && (Ue.detachEvent("onpropertychange", zs), Re = Ue = null);
  }
  function zs(l) {
    if (l.propertyName === "value" && jn(Re)) {
      var t = [];
      gs(
        t,
        Re,
        l,
        ac(l)
      ), ns(ov, t);
    }
  }
  function sv(l, t, a) {
    l === "focusin" ? (Es(), Ue = t, Re = a, Ue.attachEvent("onpropertychange", zs)) : l === "focusout" && Es();
  }
  function rv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return jn(Re);
  }
  function mv(l, t) {
    if (l === "click") return jn(t);
  }
  function dv(l, t) {
    if (l === "input" || l === "change")
      return jn(t);
  }
  function vv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var At = typeof Object.is == "function" ? Object.is : vv;
  function je(l, t) {
    if (At(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Ki.call(t, e) || !At(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function dc(l) {
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
      a = _s(a);
    }
  }
  function Ns(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Ns(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function As(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = dc(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = dc(l.document);
    }
    return t;
  }
  function vc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var hv = va && "documentMode" in document && 11 >= document.documentMode, Gu = null, hc = null, He = null, yc = !1;
  function Ms(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    yc || Gu == null || Gu !== dc(u) || (u = Gu, "selectionStart" in u && vc(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), He && je(He, u) || (He = u, u = ji(hc, "onSelect"), 0 < u.length && (t = new Un(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = Gu)));
  }
  function cu(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var Xu = {
    animationend: cu("Animation", "AnimationEnd"),
    animationiteration: cu("Animation", "AnimationIteration"),
    animationstart: cu("Animation", "AnimationStart"),
    transitionrun: cu("Transition", "TransitionRun"),
    transitionstart: cu("Transition", "TransitionStart"),
    transitioncancel: cu("Transition", "TransitionCancel"),
    transitionend: cu("Transition", "TransitionEnd")
  }, gc = {}, Ds = {};
  va && (Ds = document.createElement("div").style, "AnimationEvent" in window || (delete Xu.animationend.animation, delete Xu.animationiteration.animation, delete Xu.animationstart.animation), "TransitionEvent" in window || delete Xu.transitionend.transition);
  function fu(l) {
    if (gc[l]) return gc[l];
    if (!Xu[l]) return l;
    var t = Xu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Ds)
        return gc[l] = t[a];
    return l;
  }
  var Cs = fu("animationend"), ps = fu("animationiteration"), Us = fu("animationstart"), yv = fu("transitionrun"), gv = fu("transitionstart"), Sv = fu("transitioncancel"), Rs = fu("transitionend"), js = /* @__PURE__ */ new Map(), Sc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Sc.push("scrollEnd");
  function wt(l, t) {
    js.set(l, t), iu(t, [l]);
  }
  var bv = 0;
  function ha(l, t) {
    if (l.name != null && l.name !== "auto") return l.name;
    if (t.autoName !== null) return t.autoName;
    l = It.identifierPrefix;
    var a = bv++;
    return l = "_" + l + "t_" + a.toString(32) + "_", t.autoName = l;
  }
  function Hs(l) {
    if (l == null || typeof l == "string")
      return l;
    var t = null, a = ie;
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
    return l = Hs(l), t = Hs(t), t == null ? l === "auto" ? null : l : t === "auto" ? null : t;
  }
  var Hn = typeof reportError == "function" ? reportError : function(l) {
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
  }, Bt = [], Qu = 0, bc = 0;
  function xn() {
    for (var l = Qu, t = bc = Qu = 0; t < l; ) {
      var a = Bt[t];
      Bt[t++] = null;
      var u = Bt[t];
      Bt[t++] = null;
      var e = Bt[t];
      Bt[t++] = null;
      var n = Bt[t];
      if (Bt[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && xs(a, e, n);
    }
  }
  function Bn(l, t, a, u) {
    Bt[Qu++] = l, Bt[Qu++] = t, Bt[Qu++] = a, Bt[Qu++] = u, bc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function Tc(l, t, a, u) {
    return Bn(l, t, a, u), qn(l);
  }
  function ou(l, t) {
    return Bn(l, null, null, t), qn(l);
  }
  function xs(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - Ot(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function qn(l) {
    if (50 < an)
      throw an = 0, Ai = null, Error(h(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Vu = {};
  function Tv(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function ht(l, t, a, u) {
    return new Tv(l, t, a, u);
  }
  function Ec(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function ga(l, t) {
    var a = l.alternate;
    return a === null ? (a = ht(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function Bs(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Yn(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof u == "function") Ec(u) && (i = 1);
    else if (typeof u == "string")
      i = $h(
        l,
        a,
        Et.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case dt:
          return l = ht(31, a, t, e), l.elementType = dt, l.lanes = n, l;
        case it:
          return su(a.children, e, n, t);
        case Il:
          i = 8, e |= 24;
          break;
        case Pt:
          return l = ht(12, a, t, e | 2), l.elementType = Pt, l.lanes = n, l;
        case B:
          return l = ht(13, a, t, e), l.elementType = B, l.lanes = n, l;
        case Y:
          return l = ht(19, a, t, e), l.elementType = Y, l.lanes = n, l;
        case Lt:
        case s:
          return l = e | 32, l = ht(30, a, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, l;
        default:
          if (typeof u == "object" && u !== null)
            switch (u.$$typeof) {
              case Rl:
                i = 10;
                break l;
              case mt:
                i = 9;
                break l;
              case N:
                i = 11;
                break l;
              case sl:
                i = 14;
                break l;
              case k:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            h(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = ht(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function su(l, t, a, u) {
    return l = ht(7, l, u, t), l.lanes = a, l;
  }
  function zc(l, t, a) {
    return l = ht(6, l, null, t), l.lanes = a, l;
  }
  function qs(l) {
    var t = ht(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function _c(l, t, a) {
    return t = ht(
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
  function qt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Ys.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Cu(t)
      }, Ys.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Cu(t)
    };
  }
  var Zu = [], Lu = 0, Gn = null, xe = 0, Yt = [], Gt = 0, ja = null, ta = 1, aa = "";
  function Sa(l, t) {
    Zu[Lu++] = xe, Zu[Lu++] = Gn, Gn = l, xe = t;
  }
  function Gs(l, t, a) {
    Yt[Gt++] = ta, Yt[Gt++] = aa, Yt[Gt++] = ja, ja = l;
    var u = ta;
    l = aa;
    var e = 32 - Ot(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - Ot(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, ta = 1 << 32 - Ot(t) + e | a << e | u, aa = n + l;
    } else
      ta = 1 << n | a << e | u, aa = l;
  }
  function Xn(l) {
    l.return !== null && (Sa(l, 1), Gs(l, 1, 0));
  }
  function Oc(l) {
    for (; l === Gn; )
      Gn = Zu[--Lu], Zu[Lu] = null, xe = Zu[--Lu], Zu[Lu] = null;
    for (; l === ja; )
      ja = Yt[--Gt], Yt[Gt] = null, aa = Yt[--Gt], Yt[Gt] = null, ta = Yt[--Gt], Yt[Gt] = null;
  }
  function Xs(l, t) {
    Yt[Gt++] = ta, Yt[Gt++] = aa, Yt[Gt++] = ja, ta = t.id, aa = t.overflow, ja = l;
  }
  var $l = null, Ol = null, P = !1, Ha = null, Xt = !1, Nc = Error(h(519));
  function xa(l) {
    var t = Error(
      h(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Be(qt(t, l)), Nc;
  }
  function Qs(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[kl] = l, t[vt] = u, a) {
      case "dialog":
        ul("cancel", t), ul("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        ul("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < en.length; a++)
          ul(en[a], t);
        break;
      case "source":
        ul("error", t);
        break;
      case "img":
      case "image":
      case "link":
        ul("error", t), ul("load", t);
        break;
      case "details":
        ul("toggle", t);
        break;
      case "input":
        ul("invalid", t), Po(
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
        ul("invalid", t);
        break;
      case "textarea":
        ul("invalid", t), ts(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || fd(t.textContent, a) ? (u.popover != null && (ul("beforetoggle", t), ul("toggle", t)), u.onScroll != null && ul("scroll", t), u.onScrollEnd != null && ul("scrollend", t), u.onClick != null && (t.onclick = la), t = !0) : t = !1, t || xa(l, !0);
  }
  function Qn(l) {
    for ($l = l.return; $l; )
      switch ($l.tag) {
        case 5:
        case 31:
        case 13:
          Xt = !1;
          return;
        case 27:
        case 3:
          Xt = !0;
          return;
        default:
          $l = $l.return;
      }
  }
  function Ku(l) {
    if (l !== $l) return !1;
    if (!P) return Qn(l), P = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || ao(l.type, l.memoizedProps)), a = !a), a && Ol && xa(l), Qn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      Ol = Md(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      Ol = Md(l);
    } else
      t === 27 ? (t = Ol, Ia(l.type) ? (l = ro, ro = null, Ol = l) : Ol = t) : Ol = $l ? Vt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function ru() {
    Ol = $l = null, P = !1;
  }
  function Ac() {
    var l = Ha;
    return l !== null && (St === null ? St = l : St.push.apply(
      St,
      l
    ), Ha = null), l;
  }
  function Be(l) {
    Ha === null ? Ha = [l] : Ha.push(l);
  }
  var Mc = Yl(null), mu = null, ba = null;
  function Ba(l, t, a) {
    hl(Mc, t._currentValue), t._currentValue = a;
  }
  function Ta(l) {
    l._currentValue = Mc.current, Kl(Mc);
  }
  function Vn(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Dc(l, t, a, u) {
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
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), Vn(
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
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Vn(i, a, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= a, i = e.alternate, i !== null && (i.lanes |= a), Vn(
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
  function du(l, t, a, u) {
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
          At(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === Du.current) {
        if (i = e.alternate, i === null) throw Error(h(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(ye) : l = [ye]);
      }
      e = e.return;
    }
    return l !== null && Dc(
      t,
      l,
      a,
      u
    ), t.flags |= 262144, l !== null;
  }
  function Zn(l) {
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
  function vu(l) {
    mu = l, ba = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Pl(l) {
    return Vs(mu, l);
  }
  function Ln(l, t) {
    return mu === null && vu(l), Vs(l, t);
  }
  function Vs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, ba === null) {
      if (l === null) throw Error(h(308));
      ba = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else ba = ba.next = t;
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
  }, zv = O.unstable_scheduleCallback, _v = O.unstable_NormalPriority, Gl = {
    $$typeof: Rl,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Cc() {
    return {
      controller: new Ev(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function qe(l) {
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
  var Ye = null;
  function Ov(l) {
    var t = l.transitionTypes;
    return l.transitionTypes = null, t;
  }
  var Ge = null, pc = 0, hu = 0, Ju = null;
  function Nv(l, t) {
    if (Ge === null) {
      var a = Ge = [];
      pc = 0, hu = wf(), Ju = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return pc++, t.then(Ls, Ls), t;
  }
  function Ls() {
    if (--pc === 0 && (Ye = null, Ge !== null)) {
      Ju !== null && (Ju.status = "fulfilled");
      var l = Ge;
      Ge = null, hu = 0, Ju = null;
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
  var Ks = C.S;
  C.S = function(l, t) {
    if (qm = zt(), typeof t == "object" && t !== null && typeof t.then == "function" && Nv(l, t), Ye !== null)
      for (var a = se; a !== null; )
        Zs(a, Ye), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = se; u !== null; )
        Zs(u, a), u = u.next;
      if (hu !== 0) {
        u = Ye, u === null && (u = Ye = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Ks !== null && Ks(l, t);
  };
  var yu = Yl(null);
  function Uc() {
    var l = yu.current;
    return l !== null ? l : zl.pooledCache;
  }
  function Kn(l, t) {
    t === null ? hl(yu, yu.current) : hl(yu, t.pool);
  }
  function Js() {
    var l = Uc();
    return l === null ? null : { parent: Gl._currentValue, pool: l };
  }
  var wu = Error(h(460)), Rc = Error(h(474)), Jn = Error(h(542)), wn = { then: function() {
  } };
  function ws(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function $s(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(la, la), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Ws(l), l === void 0 && !("reason" in t) ? Error(h(600)) : l;
      default:
        if (typeof t.status == "string") t.then(la, la);
        else {
          if (l = zl, l !== null && 100 < l.shellSuspendCounter)
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
            throw l = t.reason, Ws(l), l;
        }
        throw Su = t, wu;
    }
  }
  function gu(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Su = a, wu) : a;
    }
  }
  var Su = null;
  function Fs() {
    if (Su === null) throw Error(h(459));
    var l = Su;
    return Su = null, l;
  }
  function Ws(l) {
    if (l === wu || l === Jn)
      throw Error(h(483));
  }
  var $u = null, Xe = 0;
  function $n(l) {
    var t = Xe;
    return Xe += 1, $u === null && ($u = []), $s($u, l, t);
  }
  function qa(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Fn(l, t) {
    throw t.$$typeof === I ? Error(h(525)) : (l = Object.prototype.toString.call(t), Error(
      h(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function Is(l) {
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
      return m = ga(m, o), m.index = 0, m.sibling = null, m;
    }
    function n(m, o, v) {
      return m.index = v, l ? (v = m.alternate, v !== null ? (v = v.index, v < o ? (m.flags |= 2, o) : v) : (m.flags |= 134217730, o)) : (m.flags |= 1048576, o);
    }
    function i(m) {
      return l && m.alternate === null && (m.flags |= 134217730), m;
    }
    function c(m, o, v, E) {
      return o === null || o.tag !== 6 ? (o = zc(v, m.mode, E), o.return = m, o) : (o = e(o, v), o.return = m, o);
    }
    function f(m, o, v, E) {
      var M = v.type;
      return M === it ? (m = g(
        m,
        o,
        v.props.children,
        E,
        v.key
      ), qa(m, v), m) : o !== null && (o.elementType === M || typeof M == "object" && M !== null && M.$$typeof === k && gu(M) === o.type) ? (o = e(o, v.props), qa(o, v), o.return = m, o) : (o = Yn(
        v.type,
        v.key,
        v.props,
        null,
        m.mode,
        E
      ), qa(o, v), o.return = m, o);
    }
    function d(m, o, v, E) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== v.containerInfo || o.stateNode.implementation !== v.implementation ? (o = _c(v, m.mode, E), o.return = m, o) : (o = e(o, v.children || []), o.return = m, o);
    }
    function g(m, o, v, E, M) {
      return o === null || o.tag !== 7 ? (o = su(
        v,
        m.mode,
        E,
        M
      ), o.return = m, o) : (o = e(o, v), o.return = m, o);
    }
    function z(m, o, v) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = zc(
          "" + o,
          m.mode,
          v
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case Tt:
            return v = Yn(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              v
            ), qa(v, o), v.return = m, v;
          case Ll:
            return o = _c(
              o,
              m.mode,
              v
            ), o.return = m, o;
          case k:
            return o = gu(o), z(m, o, v);
        }
        if (tl(o) || U(o))
          return o = su(
            o,
            m.mode,
            v,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return z(m, $n(o), v);
        if (o.$$typeof === Rl)
          return z(
            m,
            Ln(m, o),
            v
          );
        Fn(m, o);
      }
      return null;
    }
    function r(m, o, v, E) {
      var M = o !== null ? o.key : null;
      if (typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint")
        return M !== null ? null : c(m, o, "" + v, E);
      if (typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case Tt:
            return v.key === M ? f(m, o, v, E) : null;
          case Ll:
            return v.key === M ? d(m, o, v, E) : null;
          case k:
            return v = gu(v), r(m, o, v, E);
        }
        if (tl(v) || U(v))
          return M !== null ? null : g(m, o, v, E, null);
        if (typeof v.then == "function")
          return r(
            m,
            o,
            $n(v),
            E
          );
        if (v.$$typeof === Rl)
          return r(
            m,
            o,
            Ln(m, v),
            E
          );
        Fn(m, v);
      }
      return null;
    }
    function y(m, o, v, E, M) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return m = m.get(v) || null, c(o, m, "" + E, M);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case Tt:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, f(o, m, E, M);
          case Ll:
            return m = m.get(
              E.key === null ? v : E.key
            ) || null, d(o, m, E, M);
          case k:
            return E = gu(E), y(
              m,
              o,
              v,
              E,
              M
            );
        }
        if (tl(E) || U(E))
          return m = m.get(v) || null, g(o, m, E, M, null);
        if (typeof E.then == "function")
          return y(
            m,
            o,
            v,
            $n(E),
            M
          );
        if (E.$$typeof === Rl)
          return y(
            m,
            o,
            v,
            Ln(o, E),
            M
          );
        Fn(o, E);
      }
      return null;
    }
    function A(m, o, v, E) {
      for (var M = null, il = null, H = o, X = o = 0, Vl = null; H !== null && X < v.length; X++) {
        H.index > X ? (Vl = H, H = null) : Vl = H.sibling;
        var ol = r(
          m,
          H,
          v[X],
          E
        );
        if (ol === null) {
          H === null && (H = Vl);
          break;
        }
        l && H && ol.alternate === null && t(m, H), o = n(ol, o, X), il === null ? M = ol : il.sibling = ol, il = ol, H = Vl;
      }
      if (X === v.length)
        return a(m, H), P && Sa(m, X), M;
      if (H === null) {
        for (; X < v.length; X++)
          H = z(m, v[X], E), H !== null && (o = n(
            H,
            o,
            X
          ), il === null ? M = H : il.sibling = H, il = H);
        return P && Sa(m, X), M;
      }
      for (H = u(H); X < v.length; X++)
        Vl = y(
          H,
          m,
          X,
          v[X],
          E
        ), Vl !== null && (l && (ol = Vl.alternate, ol !== null && H.delete(ol.key === null ? X : ol.key)), o = n(
          Vl,
          o,
          X
        ), il === null ? M = Vl : il.sibling = Vl, il = Vl);
      return l && H.forEach(function(au) {
        return t(m, au);
      }), P && Sa(m, X), M;
    }
    function D(m, o, v, E) {
      if (v == null) throw Error(h(151));
      for (var M = null, il = null, H = o, X = o = 0, Vl = null, ol = v.next(); H !== null && !ol.done; X++, ol = v.next()) {
        H.index > X ? (Vl = H, H = null) : Vl = H.sibling;
        var au = r(m, H, ol.value, E);
        if (au === null) {
          H === null && (H = Vl);
          break;
        }
        l && H && au.alternate === null && t(m, H), o = n(au, o, X), il === null ? M = au : il.sibling = au, il = au, H = Vl;
      }
      if (ol.done)
        return a(m, H), P && Sa(m, X), M;
      if (H === null) {
        for (; !ol.done; X++, ol = v.next())
          ol = z(m, ol.value, E), ol !== null && (o = n(ol, o, X), il === null ? M = ol : il.sibling = ol, il = ol);
        return P && Sa(m, X), M;
      }
      for (H = u(H); !ol.done; X++, ol = v.next())
        ol = y(H, m, X, ol.value, E), ol !== null && (l && (Vl = ol.alternate, Vl !== null && H.delete(
          Vl.key === null ? X : Vl.key
        )), o = n(ol, o, X), il === null ? M = ol : il.sibling = ol, il = ol);
      return l && H.forEach(function(iy) {
        return t(m, iy);
      }), P && Sa(m, X), M;
    }
    function $(m, o, v, E) {
      if (typeof v == "object" && v !== null && v.type === it && v.key === null && v.props.ref === void 0 && (v = v.props.children), typeof v == "object" && v !== null) {
        switch (v.$$typeof) {
          case Tt:
            l: {
              for (var M = v.key; o !== null; ) {
                if (o.key === M) {
                  if (M = v.type, M === it) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), E = e(
                        o,
                        v.props.children
                      ), qa(E, v), E.return = m, m = E;
                      break l;
                    }
                  } else if (o.elementType === M || typeof M == "object" && M !== null && M.$$typeof === k && gu(M) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), E = e(o, v.props), qa(E, v), E.return = m, m = E;
                    break l;
                  }
                  a(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              v.type === it ? (E = su(
                v.props.children,
                m.mode,
                E,
                v.key
              ), qa(E, v), E.return = m, m = E) : (E = Yn(
                v.type,
                v.key,
                v.props,
                null,
                m.mode,
                E
              ), qa(E, v), E.return = m, m = E);
            }
            return i(m);
          case Ll:
            l: {
              for (M = v.key; o !== null; ) {
                if (o.key === M)
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
              E = _c(v, m.mode, E), E.return = m, m = E;
            }
            return i(m);
          case k:
            return v = gu(v), $(
              m,
              o,
              v,
              E
            );
        }
        if (tl(v))
          return A(
            m,
            o,
            v,
            E
          );
        if (U(v)) {
          if (M = U(v), typeof M != "function") throw Error(h(150));
          return v = M.call(v), D(
            m,
            o,
            v,
            E
          );
        }
        if (typeof v.then == "function")
          return $(
            m,
            o,
            $n(v),
            E
          );
        if (v.$$typeof === Rl)
          return $(
            m,
            o,
            Ln(m, v),
            E
          );
        Fn(m, v);
      }
      return typeof v == "string" && v !== "" || typeof v == "number" || typeof v == "bigint" ? (v = "" + v, o !== null && o.tag === 6 ? (a(m, o.sibling), E = e(o, v), E.return = m, m = E) : (a(m, o), E = zc(v, m.mode, E), E.return = m, m = E), i(m)) : a(m, o);
    }
    return function(m, o, v, E) {
      try {
        Xe = 0;
        var M = $(
          m,
          o,
          v,
          E
        );
        return $u = null, M;
      } catch (H) {
        if (H === wu || H === Jn) throw H;
        var il = ht(29, H, null, m.mode);
        return il.lanes = E, il.return = m, il;
      }
    };
  }
  var bu = Is(!0), ks = Is(!1), Ya = !1;
  function jc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Hc(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Ga(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function Xa(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (dl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = qn(l), xs(l, null, a), t;
    }
    return Bn(l, u, t, a), qn(l);
  }
  function Qe(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Go(l, a);
    }
  }
  function xc(l, t) {
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
  var Bc = !1;
  function Ve() {
    if (Bc) {
      var l = Ju;
      if (l !== null) throw l;
    }
  }
  function Ze(l, t, a, u) {
    Bc = !1;
    var e = l.updateQueue;
    Ya = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, c = e.shared.pending;
    if (c !== null) {
      e.shared.pending = null;
      var f = c, d = f.next;
      f.next = null, i === null ? n = d : i.next = d, i = f;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, c = g.lastBaseUpdate, c !== i && (c === null ? g.firstBaseUpdate = d : c.next = d, g.lastBaseUpdate = f));
    }
    if (n !== null) {
      var z = e.baseState;
      i = 0, g = d = f = null, c = n;
      do {
        var r = c.lane & -536870913, y = r !== c.lane;
        if (y ? (nl & r) === r : (u & r) === r) {
          r !== 0 && r === hu && (Bc = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: c.tag,
            payload: c.payload,
            callback: null,
            next: null
          });
          l: {
            var A = l, D = c;
            r = t;
            var $ = a;
            switch (D.tag) {
              case 1:
                if (A = D.payload, typeof A == "function") {
                  z = A.call($, z, r);
                  break l;
                }
                z = A;
                break l;
              case 3:
                A.flags = A.flags & -65537 | 128;
              case 0:
                if (A = D.payload, r = typeof A == "function" ? A.call($, z, r) : A, r == null) break l;
                z = q({}, z, r);
                break l;
              case 2:
                Ya = !0;
            }
          }
          r = c.callback, r !== null && (l.flags |= 64, y && (l.flags |= 8192), y = e.callbacks, y === null ? e.callbacks = [r] : y.push(r));
        } else
          y = {
            lane: r,
            tag: c.tag,
            payload: c.payload,
            callback: c.callback,
            next: null
          }, g === null ? (d = g = y, f = z) : g = g.next = y, i |= r;
        if (c = c.next, c === null) {
          if (c = e.shared.pending, c === null)
            break;
          y = c, c = y.next, y.next = null, e.lastBaseUpdate = y, e.shared.pending = null;
        }
      } while (!0);
      g === null && (f = z), e.baseState = f, e.firstBaseUpdate = d, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), wa |= i, l.lanes = i, l.memoizedState = z;
    }
  }
  function Ps(l, t) {
    if (typeof l != "function")
      throw Error(h(191, l));
    l.call(t);
  }
  function lr(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Ps(a[l], t);
  }
  var Qa = Yl(null), Wn = Yl(0);
  function tr(l, t) {
    l = Na, hl(Wn, l), hl(Qa, t), Na = l | t.baseLanes;
  }
  function qc() {
    hl(Wn, Na), hl(Qa, Qa.current);
  }
  function Yc() {
    Na = Wn.current, Kl(Qa), Kl(Wn);
  }
  var lt = Yl(null), ct = null;
  function Va(l) {
    var t = l.alternate;
    hl(tt, tt.current & 1), hl(lt, l), ct === null && (t === null || Qa.current !== null || t.memoizedState !== null) && (ct = l);
  }
  function Gc(l) {
    hl(tt, tt.current), hl(lt, l), ct === null && (ct = l);
  }
  function ar(l) {
    l.tag === 22 ? (hl(tt, tt.current), hl(lt, l), ct === null && (ct = l)) : Za();
  }
  function Za() {
    hl(tt, tt.current), hl(lt, lt.current);
  }
  function Mt(l) {
    Kl(lt), ct === l && (ct = null), Kl(tt);
  }
  var tt = Yl(0);
  function Le(l, t) {
    hl(lt, lt.current), hl(tt, t);
  }
  function Xc(l) {
    Kl(tt), Kl(lt), ct === l && (ct = null);
  }
  function In(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || oo(a) || so(a)))
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
  var Ea = 0, w = null, Tl = null, Xl = null, kn = !1, Fu = !1, Tu = !1, Pn = 0, Ke = 0, Wu = null, Mv = 0;
  function jl() {
    throw Error(h(321));
  }
  function Qc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!At(l[a], t[a])) return !1;
    return !0;
  }
  function Vc(l, t, a, u, e, n) {
    return Ea = n, w = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, C.H = l === null || l.memoizedState === null ? Gr : Xr, Tu = !1, n = a(u, e), Tu = !1, Fu && (n = er(
      t,
      a,
      u,
      e
    )), ur(l), n;
  }
  function ur(l) {
    C.H = ii;
    var t = Tl !== null && Tl.next !== null;
    if (Ea = 0, Xl = Tl = w = null, kn = !1, Ke = 0, Wu = null, t) throw Error(h(300));
    l === null || Ql || (l = l.dependencies, l !== null && Zn(l) && (Ql = !0));
  }
  function er(l, t, a, u) {
    w = l;
    var e = 0;
    do {
      if (Fu && (Wu = null), Ke = 0, Fu = !1, 25 <= e) throw Error(h(301));
      if (e += 1, Xl = Tl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      C.H = xv, n = t(a, u);
    } while (Fu);
    return n;
  }
  function Dv() {
    var l = C.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Je(t) : t, l = l.useState()[0], (Tl !== null ? Tl.memoizedState : null) !== l && (w.flags |= 1024), t;
  }
  function Zc() {
    var l = Pn !== 0;
    return Pn = 0, l;
  }
  function Lc(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Kc(l) {
    if (kn) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      kn = !1;
    }
    Ea = 0, Xl = Tl = w = null, Fu = !1, Ke = Pn = 0, Wu = null;
  }
  function ot() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Xl === null ? w.memoizedState = Xl = l : Xl = Xl.next = l, Xl;
  }
  function Bl() {
    if (Tl === null) {
      var l = w.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = Tl.next;
    var t = Xl === null ? w.memoizedState : Xl.next;
    if (t !== null)
      Xl = t, Tl = l;
    else {
      if (l === null)
        throw w.alternate === null ? Error(h(467)) : Error(h(310));
      Tl = l, l = {
        memoizedState: Tl.memoizedState,
        baseState: Tl.baseState,
        baseQueue: Tl.baseQueue,
        queue: Tl.queue,
        next: null
      }, Xl === null ? w.memoizedState = Xl = l : Xl = Xl.next = l;
    }
    return Xl;
  }
  function li() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Je(l) {
    var t = Ke;
    return Ke += 1, Wu === null && (Wu = []), l = $s(Wu, l, t), t = w, (Xl === null ? t.memoizedState : Xl.next) === null && (t = t.alternate, C.H = t === null || t.memoizedState === null ? Gr : Xr), l;
  }
  function ti(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Je(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Rl) return Pl(l);
    }
    throw Error(h(438, String(l)));
  }
  function Jc(l) {
    var t = null, a = w.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = w.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = li(), w.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = jt;
    return t.index++, a;
  }
  function za(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function ai(l) {
    var t = Bl();
    return wc(t, Tl, l);
  }
  function wc(l, t, a) {
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
      var c = i = null, f = null, d = t, g = !1;
      do {
        var z = d.lane & -536870913;
        if (z !== d.lane ? (nl & z) === z : (Ea & z) === z) {
          var r = d.revertLane;
          if (r === 0)
            f !== null && (f = f.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: d.action,
              hasEagerState: d.hasEagerState,
              eagerState: d.eagerState,
              next: null
            }), z === hu && (g = !0);
          else if ((Ea & r) === r) {
            d = d.next, r === hu && (g = !0);
            continue;
          } else
            z = {
              lane: 0,
              revertLane: d.revertLane,
              gesture: null,
              action: d.action,
              hasEagerState: d.hasEagerState,
              eagerState: d.eagerState,
              next: null
            }, f === null ? (c = f = z, i = n) : f = f.next = z, w.lanes |= r, wa |= r;
          z = d.action, Tu && a(n, z), n = d.hasEagerState ? d.eagerState : a(n, z);
        } else
          r = {
            lane: z,
            revertLane: d.revertLane,
            gesture: d.gesture,
            action: d.action,
            hasEagerState: d.hasEagerState,
            eagerState: d.eagerState,
            next: null
          }, f === null ? (c = f = r, i = n) : f = f.next = r, w.lanes |= z, wa |= z;
        d = d.next;
      } while (d !== null && d !== t);
      if (f === null ? i = n : f.next = c, !At(n, l.memoizedState) && (Ql = !0, g && (a = Ju, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function $c(l) {
    var t = Bl(), a = t.queue;
    if (a === null) throw Error(h(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      At(n, t.memoizedState) || (Ql = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function nr(l, t, a) {
    var u = w, e = Bl(), n = P;
    if (n) {
      if (a === void 0) throw Error(h(407));
      a = a();
    } else a = t();
    var i = !At(
      (Tl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Ql = !0), e = e.queue, Ic(fr.bind(null, u, e, l), [
      l
    ]), l = e.getSnapshot !== t || i || Xl !== null && (Xl.memoizedState.tag & 1) !== 0, Iu(
      l ? 9 : 8,
      { destroy: void 0 },
      cr.bind(null, u, e, a, t),
      null
    ), l) {
      if (u.flags |= 2048, zl === null) throw Error(h(349));
      n || (Ea & 127) !== 0 || ir(u, t, a);
    }
    return a;
  }
  function ir(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = w.updateQueue, t === null ? (t = li(), w.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function cr(l, t, a, u) {
    t.value = a, t.getSnapshot = u, or(t) && sr(l);
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
      return !At(l, a);
    } catch {
      return !0;
    }
  }
  function sr(l) {
    var t = ou(l, 2);
    t !== null && bt(t, l, 2);
  }
  function Fc(l) {
    var t = ot();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Tu) {
        pa(!0);
        try {
          a();
        } finally {
          pa(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: za,
      lastRenderedState: l
    }, t;
  }
  function rr(l, t, a, u) {
    return l.baseState = a, wc(
      l,
      Tl,
      typeof u == "function" ? u : za
    );
  }
  function Cv(l, t, a, u, e) {
    if (ni(l)) throw Error(h(485));
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
      C.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, mr(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function mr(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = C.T, i = {};
      i.types = n !== null ? n.types : null, C.T = i;
      try {
        var c = a(e, u), f = C.S;
        f !== null && f(i, c), dr(l, t, c);
      } catch (d) {
        Wc(l, t, d);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), C.T = n;
      }
    } else
      try {
        n = a(e, u), dr(l, t, n);
      } catch (d) {
        Wc(l, t, d);
      }
  }
  function dr(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        vr(l, t, u);
      },
      function(u) {
        return Wc(l, t, u);
      }
    ) : vr(l, t, a);
  }
  function vr(l, t, a) {
    t.status = "fulfilled", t.value = a, hr(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, mr(l, a)));
  }
  function Wc(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, hr(t), t = t.next;
      while (t !== u);
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
    if (P) {
      var a = zl.formState;
      if (a !== null) {
        l: {
          var u = w;
          if (P) {
            if (Ol) {
              t: {
                for (var e = Ol, n = Xt; e.nodeType !== 8; ) {
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
                Ol = Vt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            xa(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = ot(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: yr,
      lastRenderedState: t
    }, a.queue = u, a = Br.bind(
      null,
      w,
      u
    ), u.dispatch = a, u = Fc(!1), n = af.bind(
      null,
      w,
      !1,
      u.queue
    ), u = ot(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = Cv.bind(
      null,
      w,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function Sr(l) {
    var t = Bl();
    return br(t, Tl, l);
  }
  function br(l, t, a) {
    if (t = wc(
      l,
      t,
      yr
    )[0], l = ai(za)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = Je(t);
      } catch (i) {
        throw i === wu ? Jn : i;
      }
    else u = t;
    t = Bl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (w.flags |= 2048, Iu(
      9,
      { destroy: void 0 },
      pv.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function pv(l, t) {
    l.action = t;
  }
  function Tr(l) {
    var t = Bl(), a = Tl;
    if (a !== null)
      return br(t, a, l);
    Bl(), t = t.memoizedState, a = Bl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Iu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = w.updateQueue, t === null && (t = li(), w.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function Er() {
    return Bl().memoizedState;
  }
  function ui(l, t, a, u) {
    var e = ot();
    w.flags |= l, e.memoizedState = Iu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function ei(l, t, a, u) {
    var e = Bl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    Tl !== null && u !== null && Qc(u, Tl.memoizedState.deps) ? e.memoizedState = Iu(t, n, a, u) : (w.flags |= l, e.memoizedState = Iu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function zr(l, t) {
    ui(8390656, 8, l, t);
  }
  function Ic(l, t) {
    ei(2048, 8, l, t);
  }
  function Uv(l) {
    w.flags |= 4;
    var t = w.updateQueue;
    if (t === null)
      t = li(), w.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function _r(l) {
    var t = Bl().memoizedState;
    return Uv({ ref: t, nextImpl: l }), function() {
      if ((dl & 2) !== 0) throw Error(h(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function Or(l, t) {
    return ei(4, 2, l, t);
  }
  function Nr(l, t) {
    return ei(4, 4, l, t);
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
  function Mr(l, t, a) {
    a = a != null ? a.concat([l]) : null, ei(4, 4, Ar.bind(null, t, l), a);
  }
  function kc() {
  }
  function Dr(l, t) {
    var a = Bl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Qc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function Cr(l, t) {
    var a = Bl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Qc(t, u[1]))
      return u[0];
    if (u = l(), Tu) {
      pa(!0);
      try {
        l();
      } finally {
        pa(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function Pc(l, t, a) {
    return a === void 0 || (Ea & 1073741824) !== 0 && (nl & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Gm(), w.lanes |= l, wa |= l, a);
  }
  function pr(l, t, a, u) {
    return At(a, t) ? a : Qa.current !== null ? (l = Pc(l, a, u), At(l, t) || (Ql = !0), l) : (Ea & 106) === 0 || (Ea & 1073741824) !== 0 && (nl & 261930) === 0 ? (Ql = !0, l.memoizedState = a) : (l = Gm(), w.lanes |= l, wa |= l, t);
  }
  function Ur(l, t, a, u, e) {
    var n = G.p;
    G.p = n !== 0 && 8 > n ? n : 8;
    var i = C.T, c = {};
    c.types = i !== null ? i.types : null, C.T = c, af(l, !1, t, a);
    try {
      var f = e(), d = C.S;
      if (d !== null && d(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Av(
          f,
          u
        );
        we(
          l,
          t,
          g,
          Ut(l)
        );
      } else
        we(
          l,
          t,
          u,
          Ut(l)
        );
    } catch (z) {
      we(
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
  function Rv() {
  }
  function lf(l, t, a, u) {
    if (l.tag !== 5) throw Error(h(476));
    var e = Rr(l).queue;
    Ur(
      l,
      e,
      t,
      Ht,
      a === null ? Rv : function() {
        return jr(l), a(u);
      }
    );
  }
  function Rr(l) {
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
        lastRenderedReducer: za,
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
        lastRenderedReducer: za,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function jr(l) {
    var t = Rr(l);
    t.next === null && (t = l.alternate.memoizedState), we(
      l,
      t.next.queue,
      {},
      Ut()
    );
  }
  function tf() {
    return Pl(ye);
  }
  function Hr() {
    return Bl().memoizedState;
  }
  function xr() {
    return Bl().memoizedState;
  }
  function jv(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Ut();
          l = Ga(a);
          var u = Xa(t, l, a);
          u !== null && (bt(u, t, a), Qe(u, t, a)), t = { cache: Cc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Hv(l, t, a) {
    var u = Ut();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ni(l) ? qr(t, a) : (a = Tc(l, t, a, u), a !== null && (bt(a, l, u), Yr(a, t, u)));
  }
  function Br(l, t, a) {
    var u = Ut();
    we(l, t, a, u);
  }
  function we(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (ni(l)) qr(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, At(c, i))
            return Bn(l, t, e, 0), zl === null && xn(), !1;
        } catch {
        }
      if (a = Tc(l, t, e, u), a !== null)
        return bt(a, l, u), Yr(a, t, u), !0;
    }
    return !1;
  }
  function af(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: wf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, ni(l)) {
      if (t) throw Error(h(479));
    } else
      t = Tc(
        l,
        a,
        u,
        2
      ), t !== null && bt(t, l, 2);
  }
  function ni(l) {
    var t = l.alternate;
    return l === w || t !== null && t === w;
  }
  function qr(l, t) {
    Fu = kn = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function Yr(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Go(l, a);
    }
  }
  var ii = {
    readContext: Pl,
    use: ti,
    useCallback: jl,
    useContext: jl,
    useEffect: jl,
    useImperativeHandle: jl,
    useLayoutEffect: jl,
    useInsertionEffect: jl,
    useMemo: jl,
    useReducer: jl,
    useRef: jl,
    useState: jl,
    useDebugValue: jl,
    useDeferredValue: jl,
    useTransition: jl,
    useSyncExternalStore: jl,
    useId: jl,
    useHostTransitionStatus: jl,
    useFormState: jl,
    useActionState: jl,
    useOptimistic: jl,
    useMemoCache: jl,
    useCacheRefresh: jl,
    useEffectEvent: jl
  }, Gr = {
    readContext: Pl,
    use: ti,
    useCallback: function(l, t) {
      return ot().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Pl,
    useEffect: zr,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, ui(
        4194308,
        4,
        Ar.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return ui(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      ui(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = ot();
      t = t === void 0 ? null : t;
      var u = l();
      if (Tu) {
        pa(!0);
        try {
          l();
        } finally {
          pa(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = ot();
      if (a !== void 0) {
        var e = a(t);
        if (Tu) {
          pa(!0);
          try {
            a(t);
          } finally {
            pa(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = Hv.bind(
        null,
        w,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = ot();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Fc(l);
      var t = l.queue, a = Br.bind(null, w, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: kc,
    useDeferredValue: function(l, t) {
      var a = ot();
      return Pc(a, l, t);
    },
    useTransition: function() {
      var l = Fc(!1);
      return l = Ur.bind(
        null,
        w,
        l.queue,
        !0,
        !1
      ), ot().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = w, e = ot();
      if (P) {
        if (a === void 0)
          throw Error(h(407));
        a = a();
      } else {
        if (a = t(), zl === null)
          throw Error(h(349));
        (nl & 127) !== 0 || ir(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, zr(fr.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Iu(
        9,
        { destroy: void 0 },
        cr.bind(
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
      var l = ot(), t = zl.identifierPrefix;
      if (P) {
        var a = aa, u = ta;
        a = (u & ~(1 << 32 - Ot(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Pn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Mv++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: tf,
    useFormState: gr,
    useActionState: gr,
    useOptimistic: function(l) {
      var t = ot();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = af.bind(
        null,
        w,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: Jc,
    useCacheRefresh: function() {
      return ot().memoizedState = jv.bind(
        null,
        w
      );
    },
    useEffectEvent: function(l) {
      var t = ot(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((dl & 2) !== 0)
          throw Error(h(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, Xr = {
    readContext: Pl,
    use: ti,
    useCallback: Dr,
    useContext: Pl,
    useEffect: Ic,
    useImperativeHandle: Mr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Cr,
    useReducer: ai,
    useRef: Er,
    useState: function() {
      return ai(za);
    },
    useDebugValue: kc,
    useDeferredValue: function(l, t) {
      var a = Bl();
      return pr(
        a,
        Tl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = ai(za)[0], t = Bl().memoizedState;
      return [
        typeof l == "boolean" ? l : Je(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: Hr,
    useHostTransitionStatus: tf,
    useFormState: Sr,
    useActionState: Sr,
    useOptimistic: function(l, t) {
      var a = Bl();
      return rr(a, Tl, l, t);
    },
    useMemoCache: Jc,
    useCacheRefresh: xr,
    useEffectEvent: _r
  }, xv = {
    readContext: Pl,
    use: ti,
    useCallback: Dr,
    useContext: Pl,
    useEffect: Ic,
    useImperativeHandle: Mr,
    useInsertionEffect: Or,
    useLayoutEffect: Nr,
    useMemo: Cr,
    useReducer: $c,
    useRef: Er,
    useState: function() {
      return $c(za);
    },
    useDebugValue: kc,
    useDeferredValue: function(l, t) {
      var a = Bl();
      return Tl === null ? Pc(a, l, t) : pr(
        a,
        Tl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = $c(za)[0], t = Bl().memoizedState;
      return [
        typeof l == "boolean" ? l : Je(l),
        t
      ];
    },
    useSyncExternalStore: nr,
    useId: Hr,
    useHostTransitionStatus: tf,
    useFormState: Tr,
    useActionState: Tr,
    useOptimistic: function(l, t) {
      var a = Bl();
      return Tl !== null ? rr(a, Tl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: Jc,
    useCacheRefresh: xr,
    useEffectEvent: _r
  };
  function uf(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : q({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var ef = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = Ut(), e = Ga(u);
      e.payload = t, a != null && (e.callback = a), t = Xa(l, e, u), t !== null && (bt(t, l, u), Qe(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = Ut(), e = Ga(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = Xa(l, e, u), t !== null && (bt(t, l, u), Qe(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = Ut(), u = Ga(a);
      u.tag = 2, t != null && (u.callback = t), t = Xa(l, u, a), t !== null && (bt(t, l, a), Qe(t, l, a));
    }
  };
  function Qr(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !je(a, u) || !je(e, n) : !0;
  }
  function Vr(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && ef.enqueueReplaceState(t, t.state, null);
  }
  function Eu(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = q({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function Zr(l) {
    Hn(l);
  }
  function Lr(l) {
    console.error(l);
  }
  function Kr(l) {
    Hn(l);
  }
  function ci(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function Jr(l, t, a) {
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
  function nf(l, t, a) {
    return a = Ga(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      ci(l, t);
    }, a;
  }
  function wr(l) {
    return l = Ga(l), l.tag = 3, l;
  }
  function $r(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        Jr(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      Jr(t, a, u), typeof e != "function" && ($a === null ? $a = /* @__PURE__ */ new Set([this]) : $a.add(this));
      var c = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: c !== null ? c : ""
      });
    });
  }
  function Bv(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && du(
        t,
        a,
        e,
        !0
      ), a = lt.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return ct === null ? Di() : a.alternate === null && Hl === 0 && (Hl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === wn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Lf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === wn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Lf(l, u, e)), !1;
        }
        throw Error(h(435, a.tag));
      }
      return Lf(l, u, e), Di(), !1;
    }
    if (P)
      return t = lt.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Nc && (l = Error(h(422), { cause: u }), Be(qt(l, a)))) : (u !== Nc && (t = Error(h(423), {
        cause: u
      }), Be(
        qt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = qt(u, a), e = nf(
        l.stateNode,
        u,
        e
      ), xc(l, e), Hl !== 4 && (Hl = 2)), !1;
    var n = Error(h(520), { cause: u });
    if (n = qt(n, a), tn === null ? tn = [n] : tn.push(n), Hl !== 4 && (Hl = 2), t === null) return !0;
    u = qt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = nf(a.stateNode, u, l), xc(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && ($a === null || !$a.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = wr(e), $r(
              e,
              l,
              a,
              u
            ), xc(a, e), !1;
          break;
        case 22:
          if (a.memoizedState !== null)
            return a.flags |= 65536, !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var cf = Error(h(461)), Ql = !1;
  function Jl(l, t, a, u) {
    t.child = l === null ? ks(t, null, a, u) : bu(
      t,
      l.child,
      a,
      u
    );
  }
  function Fr(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var c in u)
        c !== "ref" && (i[c] = u[c]);
    } else i = u;
    return vu(t), u = Vc(
      l,
      t,
      a,
      i,
      n,
      e
    ), c = Zc(), l !== null && !Ql ? (Lc(l, t, e), _a(l, t, e)) : (P && c && Xn(t), t.flags |= 1, Jl(l, t, u, e), t.child);
  }
  function Wr(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Ec(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, Ir(
        l,
        t,
        n,
        u,
        e
      )) : (l = Yn(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !hf(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : je, a(i, u) && l.ref === t.ref)
        return _a(l, t, e);
    }
    return t.flags |= 1, l = ga(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function Ir(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (je(n, u) && l.ref === t.ref)
        if (Ql = !1, t.pendingProps = u = n, hf(l, e))
          (l.flags & 131072) !== 0 && (Ql = !0);
        else
          return t.lanes = l.lanes, _a(l, t, e);
    }
    return ff(
      l,
      t,
      a,
      u,
      e
    );
  }
  function kr(l, t, a, u) {
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
        return Pr(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && Kn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? tr(t, n) : qc(), ar(t);
      else
        return u = t.lanes = 536870912, Pr(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (Kn(t, n.cachePool), tr(t, n), Za(), t.memoizedState = null) : (l !== null && Kn(t, null), qc(), Za());
    return Jl(l, t, e, a), t.child;
  }
  function $e(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function Pr(l, t, a, u, e) {
    var n = Uc();
    return n = n === null ? null : { parent: Gl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && Kn(t, null), qc(), ar(t), l !== null && du(l, t, u, !0), t.childLanes = e, null;
  }
  function fi(l, t) {
    return t = oi(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function lm(l, t, a) {
    return bu(t, l.child, null, a), l = fi(t, t.pendingProps), l.flags |= 2, Mt(t), t.memoizedState = null, l;
  }
  function qv(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (P) {
        if (u.mode === "hidden")
          return l = fi(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, $e(null, l);
        if (Gc(t), (l = Ol) ? (l = Ad(
          l,
          Xt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ja !== null ? { id: ta, overflow: aa } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = qs(l), a.return = t, t.child = a, $l = t, Ol = null)) : l = null, l === null) throw xa(t);
        return t.lanes = 536870912, null;
      }
      return fi(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Gc(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = lm(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(h(558));
      else if (Ql || du(l, t, a, !1), e = (a & l.childLanes) !== 0, Ql || e) {
        if (Qa.current === null) {
          if (u = zl, u !== null && (i = Xo(u, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, ou(l, i), bt(u, l, i), cf;
          Di();
        }
        t = lm(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, Ol = Vt(i.nextSibling), $l = t, P = !0, Ha = null, Xt = !1, l !== null && Xs(t, l), t = fi(t, u), t.flags |= 134221824;
      return t;
    }
    return l = ga(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function ku(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(h(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function ff(l, t, a, u, e) {
    return vu(t), a = Vc(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Zc(), l !== null && !Ql ? (Lc(l, t, e), _a(l, t, e)) : (P && u && Xn(t), t.flags |= 1, Jl(l, t, a, e), t.child);
  }
  function tm(l, t, a, u, e, n) {
    return vu(t), t.updateQueue = null, a = er(
      t,
      u,
      a,
      e
    ), ur(l), u = Zc(), l !== null && !Ql ? (Lc(l, t, n), _a(l, t, n)) : (P && u && Xn(t), t.flags |= 1, Jl(l, t, a, n), t.child);
  }
  function am(l, t, a, u, e) {
    if (vu(t), t.stateNode === null) {
      var n = Vu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Pl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = ef, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, jc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Pl(i) : Vu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (uf(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && ef.enqueueReplaceState(n, n.state, null), Ze(t, u, n, e), Ve(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = Eu(a, c);
      n.props = f;
      var d = n.context, g = a.contextType;
      i = Vu, typeof g == "object" && g !== null && (i = Pl(g));
      var z = a.getDerivedStateFromProps;
      g = typeof z == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || d !== i) && Vr(
        t,
        n,
        u,
        i
      ), Ya = !1;
      var r = t.memoizedState;
      n.state = r, Ze(t, u, n, e), Ve(), d = t.memoizedState, c || r !== d || Ya ? (typeof z == "function" && (uf(
        t,
        a,
        z,
        u
      ), d = t.memoizedState), (f = Ya || Qr(
        t,
        a,
        f,
        u,
        r,
        d,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = d), n.props = u, n.state = d, n.context = i, u = f) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Hc(l, t), i = t.memoizedProps, g = Eu(a, i), n.props = g, z = t.pendingProps, r = n.context, d = a.contextType, f = Vu, typeof d == "object" && d !== null && (f = Pl(d)), c = a.getDerivedStateFromProps, (d = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== z || r !== f) && Vr(
        t,
        n,
        u,
        f
      ), Ya = !1, r = t.memoizedState, n.state = r, Ze(t, u, n, e), Ve();
      var y = t.memoizedState;
      i !== z || r !== y || Ya || l !== null && l.dependencies !== null && Zn(l.dependencies) ? (typeof c == "function" && (uf(
        t,
        a,
        c,
        u
      ), y = t.memoizedState), (g = Ya || Qr(
        t,
        a,
        g,
        u,
        r,
        y,
        f
      ) || l !== null && l.dependencies !== null && Zn(l.dependencies)) ? (d || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, y, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        y,
        f
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = y), n.props = u, n.state = y, n.context = f, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && r === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, ku(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = bu(
      t,
      l.child,
      null,
      e
    ), t.child = bu(
      t,
      null,
      a,
      e
    )) : Jl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = _a(
      l,
      t,
      e
    ), l;
  }
  function um(l, t, a, u) {
    return ru(), t.flags |= 256, Jl(l, t, a, u), t.child;
  }
  var of = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function sf(l) {
    return { baseLanes: l, cachePool: Js() };
  }
  function rf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= pt), l;
  }
  function em(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (tt.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (P) {
        if (e ? Va(t) : Za(), (l = Ol) ? (l = Ad(
          l,
          Xt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ja !== null ? { id: ta, overflow: aa } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = qs(l), a.return = t, t.child = a, $l = t, Ol = null)) : l = null, l === null) throw xa(t);
        return so(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      return n = u.children, u = u.fallback, e ? (Za(), e = t.mode, n = oi(
        { mode: "hidden", children: n },
        e
      ), u = su(
        u,
        e,
        a,
        null
      ), n.return = t, u.return = t, n.sibling = u, t.child = n, u = t.child, u.memoizedState = sf(a), u.childLanes = rf(
        l,
        i,
        a
      ), t.memoizedState = of, $e(null, u)) : (Va(t), mf(t, n));
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
    return e ? (Za(), e = u.fallback, n = t.mode, c = l.child, f = c.sibling, u = ga(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 1206910976, f !== null ? e = ga(f, e) : (e = su(
      e,
      n,
      a,
      null
    ), e.flags |= 2), e.return = t, u.return = t, u.sibling = e, t.child = u, $e(null, u), u = t.child, e = l.child.memoizedState, e === null ? e = sf(a) : (n = e.cachePool, n !== null ? (c = Gl._currentValue, n = n.parent !== c ? { parent: c, pool: c } : n) : n = Js(), e = {
      baseLanes: e.baseLanes | a,
      cachePool: n
    }), u.memoizedState = e, u.childLanes = rf(
      l,
      i,
      a
    ), t.memoizedState = of, $e(l.child, u)) : (Va(t), a = l.child, l = a.sibling, a = ga(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function mf(l, t) {
    return t = oi(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function oi(l, t) {
    return l = ht(22, l, null, t), l.lanes = 0, l;
  }
  function si(l, t, a) {
    return bu(t, l.child, null, a), l = mf(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function Yv(l, t, a, u, e, n, i, c) {
    if (a)
      return t.flags & 256 ? (Va(t), t.flags &= -257, si(
        l,
        t,
        c
      )) : t.memoizedState !== null ? (Za(), t.child = l.child, t.flags |= 128, null) : (Za(), n = e.fallback, i = t.mode, e = oi(
        { mode: "visible", children: e.children },
        i
      ), n = su(
        n,
        i,
        c,
        null
      ), n.flags |= 2, e.return = t, n.return = t, e.sibling = n, t.child = e, bu(t, l.child, null, c), e = t.child, e.memoizedState = sf(c), e.childLanes = rf(
        l,
        u,
        c
      ), t.memoizedState = of, $e(null, e));
    if (Va(t), so(n)) {
      if (u = n.nextSibling && n.nextSibling.dataset, u) var f = u.dgst;
      return u = f, u !== "" && (e = Error(h(419)), e.stack = "", e.digest = u, Be({ value: e, source: null, stack: null })), si(
        l,
        t,
        c
      );
    }
    if (Ql || du(l, t, c, !1), u = (c & l.childLanes) !== 0, Ql || u) {
      if (Qa.current !== null)
        return si(
          l,
          t,
          c
        );
      if (u = zl, u !== null && (e = Xo(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, ou(l, e), bt(u, l, e), cf;
      return oo(n) || Di(), si(
        l,
        t,
        c
      );
    }
    return oo(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, Ol = Vt(n.nextSibling), $l = t, P = !0, Ha = null, Xt = !1, l !== null && Xs(t, l), t = mf(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function nm(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Vn(l.return, t, a);
  }
  function im(l) {
    for (var t = null; l !== null; ) {
      var a = l.alternate;
      a !== null && In(a) === null && (t = l), l = l.sibling;
    }
    return t;
  }
  function ri(l, t, a, u, e, n) {
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
  function df(l) {
    var t = l.child;
    for (l.child = null; t !== null; ) {
      var a = t.sibling;
      t.sibling = l.child, l.child = t, t = a;
    }
  }
  function vf(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = tt.current;
    if (t.flags & 128)
      return Le(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, Le(t, i), e === "backwards" && l !== null ? (df(l), Jl(l, t, u, a), df(l)) : Jl(l, t, u, a), u = P ? xe : 0, !c && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && nm(l, a, t);
        else if (l.tag === 19)
          nm(l, a, t);
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
        a = im(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null, df(t)), ri(
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
          if (l = e.alternate, l !== null && In(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        ri(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        ri(
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
        a = im(t.child), a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), ri(
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
  function cm(l, t, a) {
    var u = t.pendingProps;
    return Ba(t, t.type, u.value), Jl(l, t, u.children, a), t.child;
  }
  function _a(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), wa |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (du(
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
      for (l = t.child, a = ga(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = ga(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function hf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && Zn(l)));
  }
  function Gv(l, t, a) {
    switch (t.tag) {
      case 3:
        Jt(t, t.stateNode.containerInfo), Ba(t, Gl, l.memoizedState.cache), ru();
        break;
      case 27:
      case 5:
        be(t);
        break;
      case 4:
        Jt(t, t.stateNode.containerInfo);
        break;
      case 10:
        Ba(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Gc(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null) {
          if (u.dehydrated !== null)
            return Va(t), t.flags |= 128, null;
          u = du(
            l,
            t,
            a,
            !1
          );
          var e = t.child.childLanes;
          return u || (a & e) !== 0 ? em(l, t, a) : (Va(t), l = _a(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        }
        Va(t);
        break;
      case 19:
        if (t.flags & 128)
          return vf(
            l,
            t,
            a
          );
        if (e = (l.flags & 128) !== 0, u = (a & t.childLanes) !== 0, u || (du(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return vf(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), Le(t, tt.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, kr(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        Ba(t, Gl, l.memoizedState.cache);
    }
    return _a(l, t, a);
  }
  function fm(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Ql = !0;
      else {
        if (!hf(l, a) && (t.flags & 128) === 0)
          return Ql = !1, Gv(
            l,
            t,
            a
          );
        Ql = (l.flags & 131072) !== 0;
      }
    else
      Ql = !1, P && (t.flags & 1048576) !== 0 && Gs(t, xe, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = gu(t.elementType), t.type = l, typeof l == "function")
            Ec(l) ? (u = Eu(l, u), t.tag = 1, t = am(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = ff(
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
                t.tag = 11, t = Fr(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === sl) {
                t.tag = 14, t = Wr(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === Rl) {
                t.tag = 10, t.type = l, t = cm(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = fl(l) || l, Error(h(306, t, ""));
          }
        }
        return t;
      case 0:
        return ff(
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
        ), am(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (Jt(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(h(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Hc(l, t), Ze(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, Ba(t, Gl, u), u !== n.cache && Dc(
            t,
            [Gl],
            a,
            !0
          ), Ve(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = um(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = qt(
                Error(h(424)),
                t
              ), Be(e), t = um(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, Ol = Vt(l.firstChild), $l = t, P = !0, Ha = null, Xt = !0, a = ks(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 134221824, a = a.sibling;
          else {
            if (ru(), u === e) {
              t = _a(
                l,
                t,
                a
              );
              break l;
            }
            Jl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return ku(l, t), l === null ? (a = jd(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : P || (t.stateNode = md(
          t.type,
          t.pendingProps,
          Kt.current,
          t
        )) : t.memoizedState = jd(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return be(t), l === null && P && (u = t.stateNode = Cd(
          t.type,
          t.pendingProps,
          Kt.current
        ), $l = t, Xt = !0, e = Ol, Ia(t.type) ? (ro = e, Ol = Vt(u.firstChild)) : Ol = e), Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), ku(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && P && ((e = u = Ol) && (u = jh(
          u,
          t.type,
          t.pendingProps,
          Xt
        ), u !== null ? (t.stateNode = u, $l = t, Ol = Vt(u.firstChild), Xt = !1, e = !0) : e = !1), e || xa(t)), be(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, ao(e, n) ? u = null : i !== null && ao(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Vc(
          l,
          t,
          Dv,
          null,
          null,
          a
        ), ye._currentValue = e), ku(l, t), Jl(l, t, u, a), t.child;
      case 6:
        return l === null && P && ((l = a = Ol) && (a = Hh(
          a,
          t.pendingProps,
          Xt
        ), a !== null ? (t.stateNode = a, $l = t, Ol = null, l = !0) : l = !1), l || xa(t)), null;
      case 13:
        return em(l, t, a);
      case 4:
        return Jt(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = bu(
          t,
          null,
          u,
          a
        ) : Jl(l, t, u, a), t.child;
      case 11:
        return Fr(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return u = t.pendingProps, ku(l, t), Jl(l, t, u, a), t.child;
      case 8:
        return Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return cm(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, vu(t), e = Pl(e), u = u(e), t.flags |= 1, Jl(l, t, u, a), t.child;
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
        return vf(l, t, a);
      case 31:
        return qv(l, t, a);
      case 22:
        return kr(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return vu(t), u = Pl(Gl), l === null ? (e = Uc(), e === null && (e = zl, n = Cc(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, jc(t), Ba(t, Gl, e)) : ((l.lanes & a) !== 0 && (Hc(l, t), Ze(t, null, null, a), Ve()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), Ba(t, Gl, u)) : (u = n.cache, Ba(t, Gl, u), u !== e.cache && Dc(
          t,
          [Gl],
          a,
          !0
        ))), Jl(
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
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : P && Xn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : ku(l, t), Jl(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(h(156, t.tag));
  }
  function Oa(l) {
    l.flags |= 4;
  }
  function yf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? qd(t, u) : qd(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (Zm()) l.flags |= 8192;
        else
          throw Su = wn, Rc;
    } else l.flags &= -16777217;
  }
  function om(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !Yd(t))
      if (Zm()) l.flags |= 8192;
      else
        throw Su = wn, Rc;
  }
  function mi(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? qo() : 536870912, l.lanes |= t, ue |= t);
  }
  function Fe(l, t) {
    if (!P)
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
  function Nl(l) {
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
    switch (Oc(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Nl(t), null;
      case 1:
        return Nl(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Ta(Gl), ra(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Ku(t) ? Oa(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Ac())), Nl(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Oa(t), n !== null ? (Nl(t), om(t, n)) : (Nl(t), yf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Oa(t), Nl(t), om(t, n)) : (Nl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Oa(t), Nl(t), yf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (uu(t), a = Kt.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Oa(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Nl(t), t.subtreeFlags &= -33554433, null;
          }
          l = Et.current, Ku(t) ? Qs(t) : (l = Cd(e, u, a), t.stateNode = l, Oa(t));
        }
        return Nl(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (uu(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Oa(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return Nl(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = Et.current, Ku(t))
            Qs(t);
          else {
            var i = cn(
              Kt.current
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
            n[kl] = t, n[vt] = u;
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
            l: switch (ut(n, e, u), e) {
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
            u && Oa(t);
          }
        }
        return Nl(t), t.subtreeFlags &= -33554433, yf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && Oa(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(h(166));
          if (l = Kt.current, Ku(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = $l, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[kl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || fd(l.nodeValue, a)), l || xa(t, !0);
          } else
            l = cn(l).createTextNode(
              u
            ), l[kl] = t, t.stateNode = l;
        }
        return Nl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Ku(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(h(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(557));
              l[kl] = t;
            } else
              ru(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Nl(t), l = !1;
          } else
            a = Ac(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (Mt(t), t) : (Mt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(h(558));
        }
        return Nl(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Ku(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(h(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(h(317));
              e[kl] = t;
            } else
              ru(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Nl(t), e = !1;
          } else
            e = Ac(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (Mt(t), t) : (Mt(t), null);
        }
        return Mt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), mi(t, t.updateQueue), Nl(t), null);
      case 4:
        return ra(), l === null && If(t.stateNode.containerInfo), t.flags |= 67108864, Nl(t), null;
      case 10:
        return Ta(t.type), Nl(t), null;
      case 19:
        if (Xc(t), u = t.memoizedState, u === null) return Nl(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Fe(u, !1);
          else {
            if (Hl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = In(l), n !== null) {
                  for (t.flags |= 128, Fe(u, !1), l = n.updateQueue, t.updateQueue = l, mi(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    Bs(a, l), a = a.sibling;
                  return Le(
                    t,
                    tt.current & 1 | 2
                  ), P && Sa(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && zt() > Oi && (t.flags |= 128, e = !0, Fe(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = In(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, mi(t, l), Fe(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !P)
                return Nl(t), null;
            } else
              2 * zt() - u.renderingStartTime > Oi && a !== 536870912 && (t.flags |= 128, e = !0, Fe(u, !1), t.lanes = 4194304);
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
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = zt(), l.sibling = null, n = tt.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || P ? Le(t, n) : (a = n, hl(lt, t), hl(tt, a), ct === null && (ct = t)), P && Sa(t, u.treeForkCount), l;
        }
        return Nl(t), null;
      case 22:
      case 23:
        return Mt(t), Yc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Nl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Nl(t), a = t.updateQueue, a !== null && mi(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && Kl(yu), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Ta(Gl), Nl(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, Nl(t), null;
    }
    throw Error(h(156, t.tag));
  }
  function Qv(l, t) {
    switch (Oc(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Ta(Gl), ra(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return uu(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (Mt(t), t.alternate === null)
            throw Error(h(340));
          ru();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (Mt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(h(340));
          ru();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Xc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return ra(), null;
      case 10:
        return Ta(t.type), null;
      case 22:
      case 23:
        return Mt(t), Yc(), l !== null && Kl(yu), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Ta(Gl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function sm(l, t) {
    switch (Oc(t), t.tag) {
      case 3:
        Ta(Gl), ra();
        break;
      case 26:
      case 27:
      case 5:
        uu(t);
        break;
      case 4:
        ra();
        break;
      case 31:
        t.memoizedState !== null && Mt(t);
        break;
      case 13:
        Mt(t);
        break;
      case 19:
        Xc(t);
        break;
      case 10:
        Ta(t.type);
        break;
      case 22:
      case 23:
        Mt(t), Yc(), l !== null && Kl(yu);
        break;
      case 24:
        Ta(Gl);
    }
  }
  function We(l, t) {
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
      Sl(t, t.return, c);
    }
  }
  function La(l, t, a) {
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
              var f = a, d = c;
              try {
                d();
              } catch (g) {
                Sl(
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
      Sl(t, t.return, g);
    }
  }
  function rm(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        lr(t, a);
      } catch (u) {
        Sl(l, l.return, u);
      }
    }
  }
  function mm(l, t, a) {
    a.props = Eu(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      Sl(l, t, u);
    }
  }
  function ua(l, t) {
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
            (e.ref === null || e.ref.name !== n) && (e.ref = bd(n)), u = e.ref;
            break;
          case 7:
            if (l.stateNode === null) {
              var i = new Rt(l);
              T(
                l.child,
                !1,
                Uh,
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
      Sl(l, t, c);
    }
  }
  function at(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          Sl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          Sl(l, t, e);
        }
      else a.current = null;
  }
  function di(l, t) {
    if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && l.alternate === null && t !== null)
      for (var a = 0; a < t.length; a++)
        Nd(
          l.stateNode,
          t[a]
        );
  }
  function dm(l) {
    for (var t = l.return; t !== null && (Sf(t) && Nd(l.stateNode, t.stateNode), !gf(t)); )
      t = t.return;
  }
  function Ie(l) {
    for (var t = l.return; t !== null && (Sf(t) && Rh(l.stateNode, t.stateNode), !gf(t)); )
      t = t.return;
  }
  function gf(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 27;
  }
  function Sf(l) {
    return l && l.tag === 7 && l.stateNode !== null;
  }
  function bf(l) {
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
      Sl(l, l.return, e);
    }
  }
  function Tf(l, t, a) {
    try {
      var u = l.stateNode;
      dh(u, l.type, a, t), u[vt] = t;
    } catch (e) {
      Sl(l, l.return, e);
    }
  }
  function vm(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Ia(l.type) || l.tag === 4;
  }
  function Ef(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || vm(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Ia(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function zf(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = la)), di(l, u), rl = !0;
    else if (e !== 4 && (e === 27 && (di(l, u), u = null, Ia(l.type) && (a = l.stateNode, t = null)), l = l.child, l !== null))
      for (zf(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        zf(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function vi(l, t, a, u) {
    var e = l.tag;
    if (e === 5 || e === 6)
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), di(l, u), rl = !0;
    else if (e !== 4 && (e === 27 && (di(l, u), u = null, Ia(l.type) && (a = l.stateNode)), l = l.child, l !== null))
      for (vi(
        l,
        t,
        a,
        u
      ), l = l.sibling; l !== null; )
        vi(
          l,
          t,
          a,
          u
        ), l = l.sibling;
  }
  function hm(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      ut(t, u, a), t[kl] = l, t[vt] = a;
    } catch (n) {
      Sl(l, l.return, n);
    }
  }
  var hi = !1, Dt = null;
  function ym(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (hi = !0);
  }
  var ea = null;
  function gm() {
    var l = ea;
    return ea = null, l;
  }
  var yt = 0;
  function Pu(l, t, a, u, e) {
    return yt = 0, Sm(
      l.child,
      t,
      a,
      u,
      e
    );
  }
  function Sm(l, t, a, u, e) {
    for (var n = !1; l !== null; ) {
      if (l.tag === 5) {
        var i = l.stateNode;
        if (u !== null) {
          var c = no(i);
          u.push(c), c.view && (n = !0);
        } else
          n || no(i).view && (n = !0);
        hi = !0, gd(
          i,
          yt === 0 ? t : t + "_" + yt,
          a
        ), yt++;
      } else (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && e || Sm(
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
  function na(l, t) {
    for (; l !== null; )
      l.tag === 5 ? Sd(l.stateNode, l.memoizedProps) : (l.tag !== 22 || l.memoizedState === null) && (l.tag === 30 && t || na(
        l.child,
        t
      )), l = l.sibling;
  }
  function yi(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if ((l.tag !== 22 || l.memoizedState === null) && (yi(l), l.tag === 30 && (l.flags & 18874368) !== 0 && l.stateNode.paired)) {
          var t = l.memoizedProps;
          if (t.name == null || t.name === "auto")
            throw Error(h(544));
          var a = t.name;
          t = ya(t.default, t.share), t !== "none" && (Pu(
            l,
            a,
            t,
            null,
            !1
          ) || na(l.child, !1));
        }
        l = l.sibling;
      }
  }
  function _f(l, t) {
    if (l.tag === 30) {
      var a = l.stateNode, u = l.memoizedProps, e = ha(u, a), n = ya(
        u.default,
        a.paired ? u.share : u.enter
      );
      n !== "none" ? Pu(l, e, n, null, !1) ? (yi(l), a.paired || t || ce(l, u.onEnter)) : na(l.child, !1) : yi(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        _f(l, t), l = l.sibling;
    else yi(l);
  }
  function Of(l) {
    if (Dt !== null && Dt.size !== 0) {
      var t = Dt;
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
                  if (n !== "none" && (Pu(
                    l,
                    u,
                    n,
                    null,
                    !1
                  ) ? (n = l.stateNode, e.paired = n, n.paired = e, ce(l, a.onShare)) : na(l.child, !1)), t.delete(u), t.size === 0) break;
                }
              }
            }
            Of(l);
          }
          l = l.sibling;
        }
    }
  }
  function Nf(l) {
    if (l.tag === 30) {
      var t = l.memoizedProps, a = ha(t, l.stateNode), u = Dt !== null ? Dt.get(a) : void 0, e = ya(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Pu(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, Dt.delete(a), ce(l, t.onShare)) : ce(l, t.onExit) : na(l.child, !1)), Dt !== null && Of(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Nf(l), l = l.sibling;
    else
      Dt !== null && Of(l);
  }
  function bm(l) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var t = l.memoizedProps, a = ha(t, l.stateNode);
        t = ya(t.default, t.update), l.flags &= -5, t !== "none" && Pu(
          l,
          a,
          t,
          l.memoizedState = [],
          !1
        );
      } else
        (l.subtreeFlags & 33554432) !== 0 && bm(l);
      l = l.sibling;
    }
  }
  function Af(l) {
    if ((l.subtreeFlags & 18874368) !== 0)
      for (l = l.child; l !== null; ) {
        if (l.tag !== 22 || l.memoizedState === null) {
          if (l.tag === 30 && (l.flags & 18874368) !== 0) {
            var t = l.stateNode;
            t.paired !== null && (t.paired = null, na(l.child, !1));
          }
          Af(l);
        }
        l = l.sibling;
      }
  }
  function gi(l) {
    if (l.tag === 30)
      l.stateNode.paired = null, na(l.child, !1), Af(l);
    else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        gi(l), l = l.sibling;
    else Af(l);
  }
  function Tm(l) {
    for (l = l.child; l !== null; )
      l.tag === 30 ? na(l.child, !1) : (l.subtreeFlags & 33554432) !== 0 && Tm(l), l = l.sibling;
  }
  function Mf(l, t, a, u, e, n, i) {
    for (var c = !1; t !== null; ) {
      if (t.tag === 5) {
        var f = t.stateNode;
        if (n !== null && yt < n.length) {
          var d = n[yt], g = no(f);
          (d.view || g.view) && (c = !0);
          var z;
          if (z = (l.flags & 4) === 0)
            if (g.clip) z = !0;
            else {
              z = d.rect;
              var r = g.rect;
              z = z.y !== r.y || z.x !== r.x || z.height !== r.height || z.width !== r.width;
            }
          z && (l.flags |= 4), g.abs ? g = !d.abs : (d = d.rect, g = g.rect, g = d.height !== g.height || d.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && gd(
          f,
          yt === 0 ? a : a + "_" + yt,
          e
        ), c && (l.flags & 4) !== 0 || (ea === null && (ea = []), ea.push(
          f,
          yt === 0 ? u : u + "_" + yt,
          t.memoizedProps
        )), yt++;
      } else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && i ? l.flags |= t.flags & 32 : Mf(
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
  function Em(l, t) {
    for (l = l.child; l !== null; ) {
      if (l.tag === 30) {
        var a = l.memoizedProps, u = l.stateNode, e = ha(a, u), n = ya(a.default, a.update), i;
        i = l.memoizedState, l.memoizedState = null, u = l;
        var c = l.child;
        yt = 0, e = Mf(
          u,
          c,
          e,
          e,
          n,
          i,
          !1
        ), (l.flags & 4) !== 0 && e && ce(l, a.onUpdate);
      } else
        (l.subtreeFlags & 33554432) !== 0 && Em(l);
      l = l.sibling;
    }
  }
  var Fl = !1, yl = !1, ia = !1, Df = !1, zm = typeof WeakSet == "function" ? WeakSet : Set, Wl = null, ca = !1, ke = !1, Si = !1, Cf = !1;
  function Vv(l, t, a) {
    if (l = l.containerInfo, lo = ge, l = As(l), vc(l)) {
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
            var c = 0, f = -1, d = -1, g = 0, z = 0, r = l, y = null;
            t: for (; ; ) {
              for (var A; r !== u || n !== 0 && r.nodeType !== 3 || (f = c + n), r !== i || e !== 0 && r.nodeType !== 3 || (d = c + e), r.nodeType === 3 && (c += r.nodeValue.length), (A = r.firstChild) !== null; )
                y = r, r = A;
              for (; ; ) {
                if (r === l) break t;
                if (y === u && ++g === n && (f = c), y === i && ++z === e && (d = c), (A = r.nextSibling) !== null) break;
                r = y, y = r.parentNode;
              }
              r = A;
            }
            u = f === -1 || d === -1 ? null : { start: f, end: d };
          } else u = null;
        }
      u = u || { start: 0, end: 0 };
    } else u = null;
    for (to = { focusedElem: l, selectionRange: u }, ge = !1, a = (a & 335544064) === a, Wl = t, t = a ? 9270 : 1024; Wl !== null; ) {
      if (l = Wl, a && (u = l.deletions, u !== null))
        for (n = 0; n < u.length; n++)
          a && Nf(u[n]);
      if (l.alternate === null && (l.flags & 2) !== 0)
        a && ym(l), bi(a);
      else {
        if (l.tag === 22) {
          if (u = l.alternate, l.memoizedState !== null) {
            u !== null && u.memoizedState === null && a && Nf(u), bi(a);
            continue;
          } else if (u !== null && u.memoizedState !== null) {
            a && ym(l), bi(a);
            continue;
          }
        }
        u = l.child, (l.subtreeFlags & t) !== 0 && u !== null ? (u.return = l, Wl = u) : (a && bm(l), bi(a));
      }
    }
    Dt = null;
  }
  function bi(l) {
    for (; Wl !== null; ) {
      var t = Wl, a = l, u = t.alternate, e = t.flags;
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
              Sl(t, t.return, c);
            }
          }
          break;
        case 3:
          if ((e & 1024) !== 0) {
            if (u = t.stateNode.containerInfo, a = u.nodeType, a === 9)
              fo(u);
            else if (a === 1)
              switch (u.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  fo(u);
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
          ), e = t.memoizedProps, e = ya(e.default, e.update), e !== "none" && Pu(
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
        u.return = t.return, Wl = u;
        break;
      }
      Wl = t.return;
    }
  }
  function _m(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        fa(l, a), u & 4 && We(5, a);
        break;
      case 1:
        if (fa(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              Sl(a, a.return, i);
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
              Sl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && rm(a), u & 512 && ua(a, a.return);
        break;
      case 3:
        if (fa(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
            Sl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && hm(a);
      case 26:
      case 5:
        fa(l, a), t === null && u & 4 && bf(a), u & 512 && ua(a, a.return);
        break;
      case 12:
        fa(l, a);
        break;
      case 31:
        fa(l, a), u & 4 && Mm(l, a);
        break;
      case 13:
        fa(l, a), u & 4 && Dm(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = lh.bind(
          null,
          a
        ), xh(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Fl, !u) {
          var n = t !== null && t.memoizedState !== null || yl;
          t = Fl, e = yl, Fl = u, (yl = n) && !e ? (u = 2, (a.subtreeFlags & 8772) !== 0 && (u |= 1), Wt(
            l,
            a,
            u
          )) : fa(l, a), Fl = t, yl = e;
        }
        break;
      case 30:
        fa(l, a), u & 512 && ua(a, a.return);
        break;
      case 7:
        u & 512 && ua(a, a.return);
      default:
        fa(l, a);
    }
  }
  function pf(l, t) {
    for (l = l.child; l !== null; )
      Om(l, t), l = l.sibling;
  }
  function Om(l, t) {
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
          Sl(l, l.return, f);
        }
        Uf(l, t);
        break;
      case 6:
        try {
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, rl = !0;
        } catch (f) {
          Sl(l, l.return, f);
        }
        break;
      case 18:
        try {
          var c = l.stateNode;
          t ? yd(c, !0) : yd(l.stateNode, !1);
        } catch (f) {
          Sl(l, l.return, f);
        }
        break;
      case 22:
      case 23:
        l.memoizedState === null && pf(l, t);
        break;
      default:
        pf(l, t);
    }
  }
  function Uf(l, t) {
    if (l.subtreeFlags & 67108864)
      for (l = l.child; l !== null; ) {
        l: {
          var a = l, u = t;
          switch (a.tag) {
            case 4:
              Om(a, u);
              break l;
            case 22:
              a.memoizedState === null && Uf(a, u);
              break l;
            default:
              Uf(a, u);
          }
        }
        l = l.sibling;
      }
  }
  function Nm(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, Nm(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && On(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Cl = null, gt = !1;
  function $t(l, t, a) {
    for (a = a.child; a !== null; )
      Am(l, t, a), a = a.sibling;
  }
  function Am(l, t, a) {
    if (_t && typeof _t.onCommitFiberUnmount == "function")
      try {
        _t.onCommitFiberUnmount(Ee, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        yl || at(a, t), $t(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !yl && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        yl || at(a, t), Ie(a);
        var u = Cl, e = gt;
        Ia(a.type) && (Cl = a.stateNode, gt = !1), $t(
          l,
          t,
          a
        ), pd(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Cl = u, gt = e;
        break;
      case 5:
        yl || at(a, t), Ie(a);
      case 6:
        if (a.tag === 6 && Ie(a), u = Cl, e = gt, Cl = null, $t(
          l,
          t,
          a
        ), Cl = u, gt = e, Cl !== null)
          if (gt)
            try {
              (Cl.nodeType === 9 ? Cl.body : Cl.nodeName === "HTML" ? Cl.ownerDocument.body : Cl).removeChild(a.stateNode), rl = !0;
            } catch (n) {
              Sl(
                a,
                t,
                n
              );
            }
          else
            try {
              Cl.removeChild(a.stateNode), rl = !0;
            } catch (n) {
              Sl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Cl !== null && (gt ? (l = Cl, hd(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Se(l)) : hd(Cl, a.stateNode));
        break;
      case 4:
        u = Cl, e = gt, Cl = a.stateNode.containerInfo, gt = !0, $t(
          l,
          t,
          a
        ), Cl = u, gt = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        La(2, a, t), yl || La(4, a, t), $t(
          l,
          t,
          a
        );
        break;
      case 1:
        yl || (at(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && mm(
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
        yl = (u = yl) || a.memoizedState !== null, $t(
          l,
          t,
          a
        ), yl = u;
        break;
      case 30:
        at(a, t), $t(
          l,
          t,
          a
        );
        break;
      case 7:
        yl || at(a, t), $t(
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
  function Mm(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        Se(l);
      } catch (a) {
        Sl(t, t.return, a);
      }
    }
  }
  function Dm(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Se(l);
      } catch (a) {
        Sl(t, t.return, a);
      }
  }
  function Zv(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new zm()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new zm()), t;
      default:
        throw Error(h(435, l.tag));
    }
  }
  function Ti(l, t) {
    var a = Zv(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = th.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function st(l, t, a) {
    var u = t.deletions;
    if (u !== null)
      for (var e = 0; e < u.length; e++) {
        var n = u[e], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Ia(f.type)) {
                Cl = f.stateNode, gt = !1;
                break l;
              }
              break;
            case 5:
              Cl = f.stateNode, gt = !1;
              break l;
            case 3:
            case 4:
              Cl = f.stateNode.containerInfo, gt = !0;
              break l;
          }
          f = f.return;
        }
        if (Cl === null) throw Error(h(160));
        Am(i, c, n), Cl = null, gt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        Cm(t, l, a), t = t.sibling;
  }
  var Ft = null;
  function Cm(l, t, a) {
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
        st(t, l, a), rt(l), e & 4 && (La(3, l, l.return), We(3, l), La(5, l, l.return));
        break;
      case 1:
        st(t, l, a), rt(l), e & 512 && (yl || u === null || at(u, u.return)), e & 64 && Fl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Ft, st(t, l, a), rt(l), e & 512 && (yl || u === null || at(u, u.return)), e & 4)
          if (e = u !== null ? u.memoizedState : null, a = l.memoizedState, u === null)
            if (a === null)
              if (l.stateNode === null)
                if (Fl)
                  l.stateNode = md(
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
                        u = e.getElementsByTagName("title")[0], (!u || u[Oe] || u[kl] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), ut(u, t, a), u[kl] = l, wl(u), t = u;
                        break l;
                      case "link":
                        if (n = Bd(
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
                        u = e.createElement(t), ut(u, t, a), e.head.appendChild(u);
                        break;
                      case "meta":
                        if (n = Bd(
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
                        u = e.createElement(t), ut(u, t, a), e.head.appendChild(u);
                        break;
                      default:
                        throw Error(h(468, t));
                    }
                    u[kl] = l, wl(u), t = u;
                  }
                  l.stateNode = t;
                }
              else
                Fl || yo(n, l.type, l.stateNode);
            else
              l.stateNode = xd(
                n,
                a,
                l.memoizedProps
              );
          else
            e !== a ? (e === null ? (t = u.stateNode, t === null || yl || t.parentNode.removeChild(t)) : e.count--, a === null ? Fl || yo(n, l.type, l.stateNode) : xd(n, a, l.memoizedProps)) : a === null && l.stateNode !== null && Tf(
              l,
              l.memoizedProps,
              u.memoizedProps
            );
        break;
      case 27:
        st(t, l, a), rt(l), e & 512 && (yl || u === null || at(u, u.return)), u !== null && e & 4 && Tf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = ia, ia = !1, st(t, l, a), ia = n, rt(l), e & 512 && (yl || u === null || at(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            xu(t, ""), rl = !0;
          } catch (g) {
            Sl(l, l.return, g);
          }
        }
        e & 4 && l.stateNode != null && (t = l.memoizedProps, Tf(
          l,
          t,
          u !== null ? u.memoizedProps : t
        )), e & 1024 && (Df = !0);
        break;
      case 6:
        if (st(t, l, a), rt(l), e & 4) {
          if (l.stateNode === null)
            throw Error(h(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, rl = !0;
          } catch (g) {
            Sl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (rl = !1, xi = null, n = Ft, Ft = fn(t.containerInfo), st(t, l, a), Ft = n, rt(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            Se(t.containerInfo);
          } catch (g) {
            Sl(l, l.return, g);
          }
        Df && (Df = !1, pm(l)), rl = !1;
        break;
      case 4:
        e = ia, ia = Fl, u = Wo(), n = Ft, Ft = fn(
          l.stateNode.containerInfo
        ), st(t, l, a), rt(l), Ft = n, rl && ke && (Si = !0), rl = u, ia = e;
        break;
      case 12:
        st(t, l, a), rt(l);
        break;
      case 31:
        st(t, l, a), rt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, Ti(l, t)));
        break;
      case 13:
        st(t, l, a), rt(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (_i = zt()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, Ti(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = Fl, f = yl, d = ia;
        Fl = c || n, ia = d || n, yl = f || i, st(t, l, a), yl = f, ia = d, Fl = c, rt(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || Fl || yl || (t = i || yl, a = Fl, u = yl, Fl = n || Fl, yl = t, Ka(l, 2), Fl = a, yl = u), !n && ia || pf(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, Ti(l, a))));
        break;
      case 19:
        st(t, l, a), rt(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, Ti(l, t)));
        break;
      case 30:
        e & 512 && (yl || u === null || at(u, u.return)), e = Wo(), n = ke, i = (a & 335544064) === a, c = l.memoizedProps, ke = i && ya(
          c.default,
          c.update
        ) !== "none", st(t, l, a), rt(l), i && u !== null && rl && (l.flags |= 4), ke = n, rl = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (yl || u === null || at(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        st(t, l, a), rt(l);
    }
  }
  function rt(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (vm(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        u = null;
        for (var e = l.return; e !== null; ) {
          if (Sf(e)) {
            var n = e.stateNode;
            u === null ? u = [n] : u.push(n);
          }
          if (gf(e)) break;
          e = e.return;
        }
        var i = u;
        if (a == null) throw Error(h(160));
        switch (a.tag) {
          case 27:
            var c = a.stateNode, f = Ef(l);
            vi(
              l,
              f,
              c,
              i
            );
            break;
          case 5:
            var d = a.stateNode;
            a.flags & 32 && (xu(d, ""), a.flags &= -33);
            var g = Ef(l);
            vi(
              l,
              g,
              d,
              i
            );
            break;
          case 3:
          case 4:
            var z = a.stateNode.containerInfo, r = Ef(l);
            zf(
              l,
              r,
              z,
              i
            );
            break;
          default:
            throw Error(h(161));
        }
      } catch (y) {
        Sl(l, l.return, y);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function pm(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        pm(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, ge = !0, t.reset(), ge = !1), l = l.sibling;
      }
  }
  function le(l, t) {
    if (t.subtreeFlags & 9270)
      for (t = t.child; t !== null; )
        Um(t, l), t = t.sibling;
    else Em(t);
  }
  function Um(l, t) {
    var a = l.alternate;
    if (a === null) _f(l, !1);
    else
      switch (l.tag) {
        case 3:
          if (Cf = ca = !1, gm(), le(t, l), !ca && !Si) {
            if (l = ea, l !== null)
              for (var u = 0; u < l.length; u += 3) {
                a = l[u];
                var e = l[u + 1];
                Sd(a, l[u + 2]), a = a.ownerDocument.documentElement, a !== null && a.animate(
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
            )), Cf = !0;
          }
          ea = null;
          break;
        case 5:
          le(t, l);
          break;
        case 4:
          u = ca, ca = !1, le(t, l), ca && (Si = !0), ca = u;
          break;
        case 22:
          l.memoizedState === null && (a.memoizedState !== null ? _f(l, !1) : le(t, l));
          break;
        case 30:
          u = ca, e = gm(), ca = !1, le(t, l), ca && (l.flags |= 4);
          var n = l.memoizedProps, i = l.stateNode;
          t = ha(n, i), i = ha(a.memoizedProps, i);
          var c = ya(n.default, n.update);
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, yt = 0, t = Mf(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), yt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (ce(
            l,
            l.memoizedProps.onUpdate
          ), ea = e) : e !== null && (e.push.apply(e, ea), ea = e), ca = (l.flags & 32) !== 0 ? !0 : u;
          break;
        default:
          le(t, l);
      }
  }
  function fa(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        _m(l, t.alternate, t), t = t.sibling;
  }
  function Ka(l, t) {
    for (l = l.child; l !== null; ) {
      var a = l, u = t;
      switch (a.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          La(4, a, a.return), Ka(
            a,
            u
          );
          break;
        case 1:
          at(a, a.return);
          var e = a.stateNode;
          typeof e.componentWillUnmount == "function" && mm(
            a,
            a.return,
            e
          ), Ka(
            a,
            u
          );
          break;
        case 27:
          (u & 2) !== 0 && pd(
            a.stateNode,
            a.type,
            a.memoizedProps
          );
        case 5:
          at(a, a.return), a.tag !== 5 && a.tag !== 27 || Ie(a), Ka(
            a,
            u
          );
          break;
        case 6:
          Ie(a);
          break;
        case 26:
          at(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || yl || e.parentNode.removeChild(e), Ka(
            a,
            u
          );
          break;
        case 22:
          a.memoizedState === null && Ka(
            a,
            u
          );
          break;
        case 30:
          at(a, a.return), Ka(
            a,
            u
          );
          break;
        case 7:
          at(a, a.return);
        default:
          Ka(
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
          ), We(4, n);
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
              Sl(u, u.return, g);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var d = e.shared.hiddenCallbacks;
              if (d !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < d.length; e++)
                  Ps(d[e], f);
            } catch (g) {
              Sl(u, u.return, g);
            }
          }
          c && i & 64 && rm(n), ua(n, n.return);
          break;
        case 27:
          (a & 2) !== 0 && hm(n);
        case 5:
          n.tag !== 5 && n.tag !== 27 || dm(n), Wt(
            e,
            n,
            a
          ), c && u === null && i & 4 && bf(n), ua(n, n.return);
          break;
        case 6:
          dm(n);
          break;
        case 26:
          f = n.stateNode, n.memoizedState !== null || f === null || Fl || yo(
            fn(f.ownerDocument),
            n.type,
            f
          ), Wt(
            e,
            n,
            a
          ), c && u === null && i & 4 && bf(n), ua(n, n.return);
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
          ), c && i & 4 && Mm(e, n);
          break;
        case 13:
          Wt(
            e,
            n,
            a
          ), c && i & 4 && Dm(e, n);
          break;
        case 22:
          n.memoizedState === null && Wt(
            e,
            n,
            a
          ), ua(n, n.return);
          break;
        case 30:
          Wt(
            e,
            n,
            a
          ), ua(n, n.return);
          break;
        case 7:
          ua(n, n.return);
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
  function Rf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && qe(a));
  }
  function jf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && qe(l));
  }
  function Qt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Rm(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && Tm(t);
  }
  function Rm(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && gi(t);
    var n = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Qt(
          l,
          t,
          a,
          u
        ), n & 2048 && We(9, t);
        break;
      case 1:
        Qt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Qt(
          l,
          t,
          a,
          u
        ), e && Cf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && qe(n)));
        break;
      case 12:
        if (n & 2048) {
          Qt(
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
          } catch (d) {
            Sl(t, t.return, d);
          }
        } else
          Qt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Qt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Qt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && gi(c), i._visibility & 2 ? Qt(
          l,
          t,
          a,
          u
        ) : Pe(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && gi(t), i._visibility & 2 ? Qt(
          l,
          t,
          a,
          u
        ) : (i._visibility |= 2, te(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        ))), n & 2048 && Rf(c, t);
        break;
      case 24:
        Qt(
          l,
          t,
          a,
          u
        ), n & 2048 && jf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (na(n.child, !0), na(t.child, !0))), Qt(
          l,
          t,
          a,
          u
        );
        break;
      default:
        Qt(
          l,
          t,
          a,
          u
        );
    }
  }
  function te(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, c = a, f = u, d = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          te(
            n,
            i,
            c,
            f,
            e
          ), We(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? te(
            n,
            i,
            c,
            f,
            e
          ) : Pe(
            n,
            i
          ) : (g._visibility |= 2, te(
            n,
            i,
            c,
            f,
            e
          )), e && d & 2048 && Rf(
            i.alternate,
            i
          );
          break;
        case 24:
          te(
            n,
            i,
            c,
            f,
            e
          ), e && d & 2048 && jf(i.alternate, i);
          break;
        default:
          te(
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
  function Pe(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            Pe(a, u), e & 2048 && Rf(
              u.alternate,
              u
            );
            break;
          case 24:
            Pe(a, u), e & 2048 && jf(u.alternate, u);
            break;
          default:
            Pe(a, u);
        }
        t = t.sibling;
      }
  }
  var zu = 8192;
  function _u(l, t, a) {
    if (l.subtreeFlags & zu)
      for (l = l.child; l !== null; )
        jm(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function jm(l, t, a) {
    switch (l.tag) {
      case 26:
        _u(
          l,
          t,
          a
        ), l.flags & zu && (l.memoizedState !== null ? Fh(
          a,
          Ft,
          l.memoizedState,
          l.memoizedProps
        ) : (l = l.stateNode, (t & 335544128) === t && Xd(a, l)));
        break;
      case 5:
        _u(
          l,
          t,
          a
        ), l.flags & zu && (l = l.stateNode, (t & 335544128) === t && Xd(a, l));
        break;
      case 3:
      case 4:
        var u = Ft;
        Ft = fn(l.stateNode.containerInfo), _u(
          l,
          t,
          a
        ), Ft = u;
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
          e.paired = null, Dt === null && (Dt = /* @__PURE__ */ new Map()), Dt.set(u, e);
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
  function Hm(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function ln(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Wl = u, Bm(
            u,
            l
          );
        }
      Hm(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        xm(l), l = l.sibling;
  }
  function xm(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        ln(l), l.flags & 2048 && La(9, l, l.return);
        break;
      case 3:
        ln(l);
        break;
      case 12:
        ln(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, Ei(l)) : ln(l);
        break;
      default:
        ln(l);
    }
  }
  function Ei(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Wl = u, Bm(
            u,
            l
          );
        }
      Hm(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          La(8, t, t.return), Ei(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, Ei(t));
          break;
        default:
          Ei(t);
      }
      l = l.sibling;
    }
  }
  function Bm(l, t) {
    for (; Wl !== null; ) {
      var a = Wl;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          La(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          qe(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Wl = u;
      else
        l: for (a = l; Wl !== null; ) {
          u = Wl;
          var e = u.sibling, n = u.return;
          if (Nm(u), u === a) {
            Wl = null;
            break l;
          }
          if (e !== null) {
            e.return = n, Wl = e;
            break l;
          }
          Wl = n;
        }
    }
  }
  var Lv = {
    getCacheForType: function(l) {
      var t = Pl(Gl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Pl(Gl).controller.signal;
    }
  }, Kv = typeof WeakMap == "function" ? WeakMap : Map, dl = 0, zl = null, al = null, nl = 0, gl = 0, Ct = null, Ja = !1, ae = !1, Hf = !1, Na = 0, Hl = 0, wa = 0, Ou = 0, zi = 0, pt = 0, ue = 0, tn = null, St = null, xf = !1, _i = 0, qm = 0, Oi = 1 / 0, Ni = null, $a = null, pl = 0, It = null, Nu = null, oa = 0, Bf = 0, qf = null, Ym = null, ee = null, ne = null, ie = null, an = 0, Ai = null;
  function Ut() {
    return (dl & 2) !== 0 && nl !== 0 ? nl & -nl : C.T !== null ? wf() : Qo();
  }
  function Gm() {
    if (pt === 0)
      if ((nl & 536870912) === 0 || P) {
        var l = Tn;
        Tn <<= 1, (Tn & 3932160) === 0 && (Tn = 262144), pt = l;
      } else pt = 536870912;
    return l = lt.current, l !== null && (l.flags |= 32), pt;
  }
  function ce(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = bd(
        ha(l.memoizedProps, a)
      )), ne === null && (ne = []), ne.push(t.bind(null, u));
    }
  }
  function bt(l, t, a) {
    (l === zl && (gl === 2 || gl === 9) || l.cancelPendingCommit !== null) && (fe(l, 0), Fa(
      l,
      nl,
      pt,
      !1
    )), _e(l, a), ((dl & 2) === 0 || l !== zl) && (l === zl && ((dl & 2) === 0 && (Ou |= a), Hl === 4 && Fa(
      l,
      nl,
      pt,
      !1
    )), sa(l));
  }
  function Xm(l, t, a) {
    if ((dl & 6) !== 0) throw Error(h(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || ze(l, t), e = u ? $v(l, t) : Gf(l, t, !0), n = u;
    do {
      if (e === 0) {
        ae && !u && Fa(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !Jv(a)) {
          e = Gf(l, t, !1), n = !1;
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
              e = tn;
              var f = c.current.memoizedState.isDehydrated;
              if (f && (fe(c, i).flags |= 256), i = Gf(
                c,
                i,
                !1
              ), i !== 2 && i !== 6) {
                if (Hf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Ou |= n, e = 4;
                  break l;
                }
                n = St, St = e, n !== null && (St === null ? St = n : St.push.apply(
                  St,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          fe(l, 0), Fa(l, t, 0, !0);
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
              Fa(
                u,
                t,
                pt,
                !Ja
              );
              break l;
            case 2:
              St = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(h(329));
          }
          if ((t & 62914560) === t && (e = _i + 300 - zt(), 10 < e)) {
            if (Fa(
              u,
              t,
              pt,
              !Ja
            ), zn(u, 0, !0) !== 0) break l;
            oa = t, u.timeoutHandle = eo(
              Qm.bind(
                null,
                u,
                a,
                St,
                Ni,
                xf,
                t,
                pt,
                Ou,
                ue,
                Ja,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          Qm(
            u,
            a,
            St,
            Ni,
            xf,
            t,
            pt,
            Ou,
            ue,
            Ja,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    sa(l);
  }
  function Qm(l, t, a, u, e, n, i, c, f, d, g, z, r, y) {
    l.timeoutHandle = -1;
    var A = t.subtreeFlags, D = (n & 335544064) === n;
    if (z = null, (D || A & 8192 || (A & 16785408) === 16785408) && (z = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: la
    }, Dt = null, jm(
      t,
      n,
      z
    ), D && (A = z, D = l.containerInfo, D = (D.nodeType === 9 ? D : D.ownerDocument).__reactViewTransition, D != null && (A.count++, A.waitingForViewTransition = !0, A = rn.bind(A), D.finished.then(A, A))), A = (n & 62914560) === n ? _i - zt() : (n & 4194048) === n ? qm - zt() : 0, A = Wh(
      z,
      A
    ), A !== null)) {
      oa = n, l.cancelPendingCommit = A(
        Fm.bind(
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
          d,
          g,
          z,
          null,
          r,
          y
        )
      ), Fa(l, n, i, !d);
      return;
    }
    Fm(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      c,
      f,
      d,
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
  function Fa(l, t, a, u) {
    t = Bo(l, t), t &= ~zi, t &= ~Ou, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - Ot(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && Yo(l, a, t);
  }
  function Mi() {
    return (dl & 6) === 0 ? (un(0), !1) : !0;
  }
  function Yf() {
    if (al !== null) {
      if (gl === 0)
        var l = al.return;
      else
        l = al, ba = mu = null, Kc(l), $u = null, Xe = 0, l = al;
      for (; l !== null; )
        sm(l.alternate, l), l = l.return;
      al = null;
    }
  }
  function fe(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, yh(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), oa = 0, Yf(), zl = l, al = a = ga(l.current, null), nl = t, gl = 0, Ct = null, Ja = !1, ae = ze(l, t), Hf = !1, ue = pt = zi = Ou = wa = Hl = 0, St = tn = null, xf = !1, Na = Bo(l, t), xn(), a;
  }
  function Vm(l, t) {
    w = null, C.H = ii, t === wu || t === Jn ? (t = Fs(), gl = 3) : t === Rc ? (t = Fs(), gl = 4) : gl = t === cf ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Ct = t, al === null && (Hl = 1, ci(
      l,
      qt(t, l.current)
    ));
  }
  function Zm() {
    var l = lt.current;
    return l === null ? !0 : (nl & 4194048) === nl ? ct === null : (nl & 62914560) === nl || (nl & 536870912) !== 0 ? l === ct : !1;
  }
  function Lm() {
    var l = C.H;
    return C.H = ii, l === null ? ii : l;
  }
  function Km() {
    var l = C.A;
    return C.A = Lv, l;
  }
  function Di() {
    Hl = 4, Ja || (nl & 4194048) !== nl && lt.current !== null || (ae = !0), (wa & 134217727) === 0 && (Ou & 134217727) === 0 || zl === null || Fa(
      zl,
      nl,
      pt,
      !1
    );
  }
  function Gf(l, t, a) {
    var u = dl;
    dl |= 2;
    var e = Lm(), n = Km();
    (zl !== l || nl !== t) && (Ni = null, fe(l, t)), t = !1;
    var i = Hl;
    l: do
      try {
        if (gl !== 0 && al !== null) {
          var c = al, f = Ct;
          switch (gl) {
            case 8:
              Yf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              lt.current === null && (t = !0);
              var d = gl;
              if (gl = 0, Ct = null, oe(l, c, f, d), a && ae) {
                i = 0;
                break l;
              }
              break;
            default:
              d = gl, gl = 0, Ct = null, oe(l, c, f, d);
          }
        }
        wv(), i = Hl;
        break;
      } catch (g) {
        Vm(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, ba = mu = null, dl = u, C.H = e, C.A = n, al === null && (zl = null, nl = 0, xn()), i;
  }
  function wv() {
    for (; al !== null; ) Jm(al);
  }
  function $v(l, t) {
    var a = dl;
    dl |= 2;
    var u = Lm(), e = Km();
    zl !== l || nl !== t ? (Ni = null, Oi = zt() + 500, fe(l, t)) : ae = ze(
      l,
      t
    );
    l: do
      try {
        if (gl !== 0 && al !== null) {
          t = al;
          var n = Ct;
          t: switch (gl) {
            case 1:
              gl = 0, Ct = null, oe(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (ws(n)) {
                gl = 0, Ct = null, wm(t);
                break;
              }
              t = function() {
                gl !== 2 && gl !== 9 || zl !== l || (gl = 7), sa(l);
              }, n.then(t, t);
              break l;
            case 3:
              gl = 7;
              break l;
            case 4:
              gl = 5;
              break l;
            case 7:
              ws(n) ? (gl = 0, Ct = null, wm(t)) : (gl = 0, Ct = null, oe(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (al.tag) {
                case 26:
                  i = al.memoizedState;
                case 5:
                case 27:
                  var c = al;
                  if (i ? Yd(i) : c.stateNode.complete) {
                    gl = 0, Ct = null;
                    var f = c.sibling;
                    if (f !== null) al = f;
                    else {
                      var d = c.return;
                      d !== null ? (al = d, Ci(d)) : al = null;
                    }
                    break t;
                  }
              }
              gl = 0, Ct = null, oe(l, t, n, 5);
              break;
            case 6:
              gl = 0, Ct = null, oe(l, t, n, 6);
              break;
            case 8:
              Yf(), Hl = 6;
              break l;
            default:
              throw Error(h(462));
          }
        }
        Fv();
        break;
      } catch (g) {
        Vm(l, g);
      }
    while (!0);
    return ba = mu = null, C.H = u, C.A = e, dl = a, al !== null ? 0 : (zl = null, nl = 0, xn(), Hl);
  }
  function Fv() {
    for (; al !== null && !m0(); )
      Jm(al);
  }
  function Jm(l) {
    var t = fm(l.alternate, l, Na);
    l.memoizedProps = l.pendingProps, t === null ? Ci(l) : al = t;
  }
  function wm(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = tm(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          nl
        );
        break;
      case 11:
        t = tm(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          nl
        );
        break;
      case 5:
        Kc(t);
        var u = t;
        u === $l && (P ? (Qn(u), u.tag === 5 && u.stateNode != null && (Ol = u.stateNode)) : (Qn(u), P = !0));
      default:
        sm(a, t), t = al = Bs(t, Na), t = fm(a, t, Na);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ci(l) : al = t;
  }
  function oe(l, t, a, u) {
    ba = mu = null, Kc(t), $u = null, Xe = 0;
    var e = t.return;
    try {
      if (Bv(
        l,
        e,
        t,
        a,
        nl
      )) {
        Hl = 1, ci(
          l,
          qt(a, l.current)
        ), al = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw al = e, n;
      Hl = 1, ci(
        l,
        qt(a, l.current)
      ), al = null;
      return;
    }
    t.flags & 32768 ? (P || u === 1 ? l = !0 : ae || (nl & 536870912) !== 0 ? l = !1 : (Ja = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = lt.current, u !== null && u.tag === 13 && (u.flags |= 16384))), $m(t, l)) : Ci(t);
  }
  function Ci(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        $m(
          t,
          Ja
        );
        return;
      }
      l = t.return;
      var a = Xv(
        t.alternate,
        t,
        Na
      );
      if (a !== null) {
        al = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        al = t;
        return;
      }
      al = t = l;
    } while (t !== null);
    Hl === 0 && (Hl = 5);
  }
  function $m(l, t) {
    do {
      var a = Qv(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, al = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        al = l;
        return;
      }
      al = l = a;
    } while (l !== null);
    Hl = 6, al = null;
  }
  function Fm(l, t, a, u, e, n, i, c, f, d, g, z) {
    l.cancelPendingCommit = null;
    do
      pi();
    while (pl !== 0);
    if ((dl & 6) !== 0) throw Error(h(327));
    if (t !== null) {
      if (t === l.current) throw Error(h(177));
      l === zl && (al = zl = null, nl = 0), Nu = t, It = l, oa = a, qf = e, Ym = u, Wv(
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
    if (Bf = c, c |= bc, z0(
      l,
      a,
      c,
      u,
      e,
      n
    ), ne = null, (a & 335544064) === a ? (ie = Ov(l), u = 10262) : (ie = null, u = 10256), (t.subtreeFlags & u) !== 0 || (t.flags & u) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, ah(Sn, function() {
      return Zf(), null;
    })) : (l.callbackNode = null, l.callbackPriority = 0), hi = !1, u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
      u = C.T, C.T = null, e = G.p, G.p = 2, n = dl, dl |= 4;
      try {
        Vv(l, t, a);
      } finally {
        dl = n, G.p = e, C.T = u;
      }
    }
    pl = 1, hi ? ee = zh(
      i,
      l.containerInfo,
      ie,
      Xf,
      Qf,
      kv,
      Vf,
      Zf,
      Iv
    ) : (Xf(), Qf(), Vf());
  }
  function Iv(l) {
    if (pl !== 0) {
      var t = It.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function kv() {
    pl === 3 && (pl = 0, Um(Nu, It), pl = 4);
  }
  function Xf() {
    if (pl === 1) {
      pl = 0;
      var l = It, t = Nu, a = oa, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = C.T, C.T = null;
        var e = G.p;
        G.p = 2;
        var n = dl;
        dl |= 4;
        try {
          ke = Si = !1, Cm(t, l, a), a = to;
          var i = As(l.containerInfo), c = a.focusedElem, f = a.selectionRange;
          if (i !== c && c && c.ownerDocument && Ns(
            c.ownerDocument.documentElement,
            c
          )) {
            if (f !== null && vc(c)) {
              var d = f.start, g = f.end;
              if (g === void 0 && (g = d), "selectionStart" in c)
                c.selectionStart = d, c.selectionEnd = Math.min(
                  g,
                  c.value.length
                );
              else {
                var z = c.ownerDocument || document, r = z && z.defaultView || window;
                if (r.getSelection) {
                  var y = r.getSelection(), A = c.textContent.length, D = Math.min(f.start, A), $ = f.end === void 0 ? D : Math.min(f.end, A);
                  !y.extend && D > $ && (i = $, $ = D, D = i);
                  var m = Os(
                    c,
                    D
                  ), o = Os(
                    c,
                    $
                  );
                  if (m && o && (y.rangeCount !== 1 || y.anchorNode !== m.node || y.anchorOffset !== m.offset || y.focusNode !== o.node || y.focusOffset !== o.offset)) {
                    var v = z.createRange();
                    v.setStart(m.node, m.offset), y.removeAllRanges(), D > $ ? (y.addRange(v), y.extend(o.node, o.offset)) : (v.setEnd(o.node, o.offset), y.addRange(v));
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
          ge = !!lo, to = lo = null;
        } finally {
          dl = n, G.p = e, C.T = u;
        }
      }
      l.current = t, pl = 2;
    }
  }
  function Qf() {
    if (pl === 2) {
      pl = 0;
      var l = It, t = Nu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = C.T, C.T = null;
        var u = G.p;
        G.p = 2;
        var e = dl;
        dl |= 4;
        try {
          _m(l, t.alternate, t);
        } finally {
          dl = e, G.p = u, C.T = a;
        }
      }
      pl = 3;
    }
  }
  function Vf() {
    if (pl === 4 || pl === 3) {
      pl = 0;
      var l = ee;
      ee = null, d0();
      var t = It, a = Nu, u = oa, e = Ym, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? pl = 5 : (pl = 0, Nu = It = null, Wm(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && ($a = null), Wi(u), a = a.stateNode, _t && typeof _t.onCommitFiberRoot == "function")
        try {
          _t.onCommitFiberRoot(
            Ee,
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
      if (e = ne, i = ie, ie = null, e !== null && (ne = null, i === null && (i = []), l !== null))
        for (f = 0; f < e.length; f++)
          a = (0, e[f])(
            i
          ), a !== void 0 && l.finished.finally(a);
      (oa & 3) !== 0 && pi(), sa(t), n = t.pendingLanes, (u & 261930) !== 0 && (n & 42) !== 0 ? t === Ai ? an++ : (an = 0, Ai = t) : (an = 0, Ai = null), un(0);
    }
  }
  function Wm(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, qe(t)));
  }
  function pi() {
    return ee !== null && (ee.skipTransition(), ee = null), Xf(), Qf(), Vf(), Zf();
  }
  function Zf() {
    if (pl !== 5) return !1;
    var l = It, t = Bf;
    Bf = 0;
    var a = Wi(oa), u = C.T, e = G.p;
    try {
      G.p = 32 > a ? 32 : a, C.T = null, a = qf, qf = null;
      var n = It, i = oa;
      if (pl = 0, Nu = It = null, oa = 0, (dl & 6) !== 0) throw Error(h(331));
      var c = dl;
      if (dl |= 4, xm(n.current), Rm(
        n,
        n.current,
        i,
        a
      ), dl = c, un(0, !1), _t && typeof _t.onPostCommitFiberRoot == "function")
        try {
          _t.onPostCommitFiberRoot(Ee, n);
        } catch {
        }
      return !0;
    } finally {
      G.p = e, C.T = u, Wm(l, t);
    }
  }
  function Im(l, t, a) {
    t = qt(a, t), t = nf(l.stateNode, t, 2), l = Xa(l, t, 2), l !== null && (_e(l, 2), sa(l));
  }
  function Sl(l, t, a) {
    if (l.tag === 3)
      Im(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          Im(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && ($a === null || !$a.has(u))) {
            l = qt(a, l), a = wr(2), u = Xa(t, a, 2), u !== null && ($r(
              a,
              u,
              t,
              l
            ), _e(u, 2), sa(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Lf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new Kv();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (Hf = !0, e.add(a), l = Pv.bind(null, l, t, a), t.then(l, l));
  }
  function Pv(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, zl === l && (nl & a) === a && ((Hl === 4 || Hl === 3 && (nl & 62914560) === nl && 300 > zt() - _i) && (dl & 2) === 0 ? fe(l, 0) : zi |= a, ue === nl && (ue = 0)), sa(l);
  }
  function km(l, t) {
    t === 0 && (t = qo()), l = ou(l, t), l !== null && (_e(l, t), sa(l));
  }
  function lh(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), km(l, a);
  }
  function th(l, t) {
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
    u !== null && u.delete(t), km(l, a);
  }
  function ah(l, t) {
    return Ji(l, t);
  }
  var se = null, re = null, Kf = !1, Ui = !1, Jf = !1, Wa = 0;
  function sa(l) {
    l !== re && l.next === null && (re === null ? se = re = l : re = re.next = l), Ui = !0, Kf || (Kf = !0, eh());
  }
  function un(l, t) {
    if (!Jf && Ui) {
      Jf = !0;
      do
        for (var a = !1, u = se; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, c = u.pingedLanes;
              n = (1 << 31 - Ot(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, ad(u, n));
          } else
            n = nl, n = zn(
              u,
              u === zl ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || ze(u, n) || (a = !0, ad(u, n));
          u = u.next;
        }
      while (a);
      Jf = !1;
    }
  }
  function uh() {
    Pm();
  }
  function Pm() {
    Ui = Kf = !1;
    var l = 0;
    Wa !== 0 && hh() && (l = Wa);
    for (var t = zt(), a = null, u = se; u !== null; ) {
      var e = u.next, n = ld(u, t);
      n === 0 ? (u.next = null, a === null ? se = e : a.next = e, e === null && (re = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Ui = !0)), u = e;
    }
    pl !== 0 && pl !== 5 || un(l), Wa !== 0 && (Wa = 0);
  }
  function ld(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - Ot(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = E0(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = zl, a = nl, a = zn(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (gl === 2 || gl === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && wi(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || ze(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && wi(u), Wi(a)) {
        case 2:
        case 8:
          a = Ho;
          break;
        case 32:
          a = Sn;
          break;
        case 268435456:
          a = xo;
          break;
        default:
          a = Sn;
      }
      return u = td.bind(null, l), a = Ji(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && wi(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function td(l, t) {
    if (pl !== 0 && pl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (pi() && l.callbackNode !== a)
      return null;
    var u = nl;
    return u = zn(
      l,
      l === zl ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (Xm(l, u, t), ld(l, zt()), l.callbackNode != null && l.callbackNode === a ? td.bind(null, l) : null);
  }
  function ad(l, t) {
    if (pi()) return null;
    Xm(l, t, !0);
  }
  function eh() {
    gh(function() {
      (dl & 6) !== 0 ? Ji(
        jo,
        uh
      ) : Pm();
    });
  }
  function wf() {
    if (Wa === 0) {
      var l = hu;
      l === 0 && (l = bn, bn <<= 1, (bn & 261888) === 0 && (bn = 256)), Wa = l;
    }
    return Wa;
  }
  function ud(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : Mn(l);
  }
  function nh(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = ud(
        (e[vt] || null).action
      ), i = u.submitter;
      i && (t = (t = i[vt] || null) ? ud(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var c = new Un(
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
                if (Wa !== 0) {
                  var f = new FormData(e, i);
                  lf(
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
                typeof n == "function" && (c.preventDefault(), f = new FormData(e, i), lf(
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
  for (var $f = 0; $f < Sc.length; $f++) {
    var Ff = Sc[$f], ih = Ff.toLowerCase(), ch = Ff[0].toUpperCase() + Ff.slice(1);
    wt(
      ih,
      "on" + ch
    );
  }
  wt(Cs, "onAnimationEnd"), wt(ps, "onAnimationIteration"), wt(Us, "onAnimationStart"), wt("dblclick", "onDoubleClick"), wt("focusin", "onFocus"), wt("focusout", "onBlur"), wt(yv, "onTransitionRun"), wt(gv, "onTransitionStart"), wt(Sv, "onTransitionCancel"), wt(Rs, "onTransitionEnd"), ju("onMouseEnter", ["mouseout", "mouseover"]), ju("onMouseLeave", ["mouseout", "mouseover"]), ju("onPointerEnter", ["pointerout", "pointerover"]), ju("onPointerLeave", ["pointerout", "pointerover"]), iu(
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
  var en = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), fh = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(en)
  );
  function ed(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var c = u[i], f = c.instance, d = c.currentTarget;
            if (c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = d;
            try {
              n(e);
            } catch (g) {
              Hn(g);
            }
            e.currentTarget = null, n = f;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (c = u[i], f = c.instance, d = c.currentTarget, c = c.listener, f !== n && e.isPropagationStopped())
              break l;
            n = c, e.currentTarget = d;
            try {
              n(e);
            } catch (g) {
              Hn(g);
            }
            e.currentTarget = null, n = f;
          }
      }
    }
  }
  function ul(l, t) {
    var a = t[Zo];
    a === void 0 && (a = t[Zo] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (nd(t, l, 2, !1), a.add(u));
  }
  function Wf(l, t, a) {
    var u = 0;
    t && (u |= 4), nd(
      a,
      l,
      u,
      t
    );
  }
  var Ri = "_reactListening" + Math.random().toString(36).slice(2);
  function If(l) {
    if (!l[Ri]) {
      l[Ri] = !0, Jo.forEach(function(a) {
        a !== "selectionchange" && (fh.has(a) || Wf(a, !1, l), Wf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Ri] || (t[Ri] = !0, Wf("selectionchange", !1, t));
    }
  }
  function nd(l, t, a, u) {
    switch ($d(t)) {
      case 2:
        var e = ly;
        break;
      case 8:
        e = ty;
        break;
      default:
        e = So;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !ec || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function kf(l, t, a, u, e) {
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
    ns(function() {
      var d = n, g = ac(a), z = [];
      l: {
        var r = js.get(l);
        if (r !== void 0) {
          var y = Un, A = l;
          switch (l) {
            case "keypress":
              if (Cn(a) === 0) break l;
            case "keydown":
            case "keyup":
              y = J0;
              break;
            case "focusin":
              A = "focus", y = fc;
              break;
            case "focusout":
              A = "blur", y = fc;
              break;
            case "beforeblur":
            case "afterblur":
              y = fc;
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
              y = H0;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              y = I0;
              break;
            case Cs:
            case ps:
            case Us:
              y = q0;
              break;
            case Rs:
              y = P0;
              break;
            case "scroll":
            case "scrollend":
              y = R0;
              break;
            case "wheel":
              y = tv;
              break;
            case "copy":
            case "cut":
            case "paste":
              y = G0;
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
              y = F0;
              break;
            case "toggle":
            case "beforetoggle":
              y = uv;
          }
          var D = (t & 4) !== 0, $ = !D && (l === "scroll" || l === "scrollend"), m = D ? r !== null ? r + "Capture" : null : r;
          D = [];
          for (var o = d, v; o !== null; ) {
            var E = o;
            if (v = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || v === null || m === null || (E = Ae(o, m), E != null && D.push(
              nn(o, E, v)
            )), $) break;
            o = o.return;
          }
          0 < D.length && (r = new y(
            r,
            A,
            null,
            a,
            g
          ), z.push({ event: r, listeners: D }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (y = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", y && a !== tc && (A = a.relatedTarget || a.fromElement) && (nu(A) || A[pu]))
            break l;
          (r || y) && (A = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, r ? (y = a.relatedTarget || a.toElement, r = d, y = y ? nu(y) : null, y !== null && ($ = W(y), D = y.tag, y !== $ || D !== 5 && D !== 27 && D !== 6) && (y = null)) : (r = null, y = d), r !== y && (D = fs, E = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (D = ss, E = "onPointerLeave", m = "onPointerEnter", o = "pointer"), $ = r == null ? A : Ne(r), v = y == null ? A : Ne(y), A = new D(
            E,
            o + "leave",
            r,
            a,
            g
          ), A.target = $, A.relatedTarget = v, E = null, nu(g) === d && (D = new D(
            m,
            o + "enter",
            y,
            a,
            g
          ), D.target = v, D.relatedTarget = $, E = D), $ = E, D = r && y ? Ul(
            r,
            y,
            oh
          ) : null, r !== null && id(
            z,
            A,
            r,
            D,
            !1
          ), y !== null && $ !== null && id(
            z,
            $,
            y,
            D,
            !0
          )));
        }
        l: {
          if (r = d ? Ne(d) : window, y = r.nodeName && r.nodeName.toLowerCase(), y === "select" || y === "input" && r.type === "file")
            var M = Ss;
          else if (ys(r))
            if (bs)
              M = dv;
            else {
              M = rv;
              var il = sv;
            }
          else
            y = r.nodeName, !y || y.toLowerCase() !== "input" || r.type !== "checkbox" && r.type !== "radio" ? d && lc(d.elementType) && (M = Ss) : M = mv;
          if (M && (M = M(l, d))) {
            gs(
              z,
              M,
              a,
              g
            );
            break l;
          }
          il && il(l, r, d);
        }
        switch (il = d ? Ne(d) : window, l) {
          case "focusin":
            (ys(il) || il.contentEditable === "true") && (Gu = il, hc = d, He = null);
            break;
          case "focusout":
            He = hc = Gu = null;
            break;
          case "mousedown":
            yc = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            yc = !1, Ms(z, a, g);
            break;
          case "selectionchange":
            if (hv) break;
          case "keydown":
          case "keyup":
            Ms(z, a, g);
        }
        var H;
        if (sc)
          l: {
            switch (l) {
              case "compositionstart":
                var X = "onCompositionStart";
                break l;
              case "compositionend":
                X = "onCompositionEnd";
                break l;
              case "compositionupdate":
                X = "onCompositionUpdate";
                break l;
            }
            X = void 0;
          }
        else
          Yu ? vs(l, a) && (X = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (X = "onCompositionStart");
        X && (rs && a.locale !== "ko" && (Yu || X !== "onCompositionStart" ? X === "onCompositionEnd" && Yu && (H = is()) : (Ua = g, nc = "value" in Ua ? Ua.value : Ua.textContent, Yu = !0)), il = ji(d, X), 0 < il.length && (X = new os(
          X,
          l,
          null,
          a,
          g
        ), z.push({ event: X, listeners: il }), H ? X.data = H : (H = hs(a), H !== null && (X.data = H)))), (H = nv ? iv(l, a) : cv(l, a)) && (X = ji(d, "onBeforeInput"), 0 < X.length && (il = new os(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), z.push({
          event: il,
          listeners: X
        }), il.data = H)), nh(
          z,
          l,
          d,
          a,
          g
        );
      }
      ed(z, t);
    });
  }
  function nn(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function ji(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = Ae(l, a), e != null && u.unshift(
        nn(l, e, n)
      ), e = Ae(l, t), e != null && u.push(
        nn(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function oh(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function id(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var c = a, f = c.alternate, d = c.stateNode;
      if (c = c.tag, f !== null && f === u) break;
      c !== 5 && c !== 26 && c !== 27 || d === null || (f = d, e ? (d = Ae(a, n), d != null && i.unshift(
        nn(a, d, f)
      )) : e || (d = Ae(a, n), d != null && i.push(
        nn(a, d, f)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var sh = /\r\n?/g, rh = /\u0000|\uFFFD/g;
  function cd(l) {
    return (typeof l == "string" ? l : "" + l).replace(sh, `
`).replace(rh, "");
  }
  function fd(l, t) {
    return t = cd(t), cd(l) === t;
  }
  function bl(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        if (typeof u == "string")
          t === "body" || t === "textarea" && u === "" || xu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          t !== "body" && xu(l, "" + u);
        else return;
        break;
      case "className":
        An(l, "class", u);
        break;
      case "tabIndex":
        An(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        An(l, a, u);
        break;
      case "style":
        us(l, u, n);
        return;
      case "data":
        if (t !== "object") {
          An(l, "data", u);
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
        u = Mn(u), l.setAttribute(a, u);
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
          typeof n == "function" && (a === "formAction" ? (t !== "input" && bl(l, t, "name", e.name, e, null), bl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), bl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), bl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (bl(l, t, "encType", e.encType, e, null), bl(l, t, "method", e.method, e, null), bl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = Mn(u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = la);
        return;
      case "onScroll":
        u != null && ul("scroll", l);
        return;
      case "onScrollEnd":
        u != null && ul("scrollend", l);
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
        a = Mn(u), l.setAttributeNS(
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
        ul("beforetoggle", l), ul("toggle", l), Nn(l, "popover", u);
        break;
      case "xlinkActuate":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        da(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        da(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        da(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        da(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        Nn(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N")
          a = p0.get(a) || a, Nn(l, a, u);
        else return;
    }
    rl = !0;
  }
  function Pf(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        us(l, u, n);
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
        if (typeof u == "string") xu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          xu(l, "" + u);
        else return;
        break;
      case "onScroll":
        u != null && ul("scroll", l);
        return;
      case "onScrollEnd":
        u != null && ul("scrollend", l);
        return;
      case "onClick":
        u != null && (l.onclick = la);
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
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[vt] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            rl = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : Nn(l, a, u);
          }
        return;
    }
    rl = !0;
  }
  function ut(l, t, a) {
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
        ul("error", l), ul("load", l);
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
                  bl(l, t, n, i, a, null);
              }
          }
        e && bl(l, t, "srcSet", a.srcSet, a, null), u && bl(l, t, "src", a.src, a, null);
        return;
      case "input":
        ul("invalid", l);
        var c = n = i = e = null, f = null, d = null;
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
                  d = g;
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
                  bl(l, t, u, g, a, null);
              }
          }
        Po(
          l,
          n,
          c,
          f,
          d,
          i,
          e,
          !1
        );
        return;
      case "select":
        ul("invalid", l), u = i = n = null;
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
                bl(l, t, e, c, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? Hu(l, !!u, t, !1) : a != null && Hu(l, !!u, a, !0);
        return;
      case "textarea":
        ul("invalid", l), n = e = u = null;
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
                bl(l, t, i, c, a, null);
            }
        ts(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : bl(l, t, f, u, a, null));
        return;
      case "dialog":
        ul("beforetoggle", l), ul("toggle", l), ul("cancel", l), ul("close", l);
        break;
      case "iframe":
      case "object":
        ul("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < en.length; u++)
          ul(en[u], l);
        break;
      case "image":
        ul("error", l), ul("load", l);
        break;
      case "details":
        ul("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        ul("error", l), ul("load", l);
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
        for (d in a)
          if (a.hasOwnProperty(d) && (u = a[d], u != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(h(137, t));
              default:
                bl(l, t, d, u, a, null);
            }
        return;
      default:
        if (lc(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && Pf(
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
      a.hasOwnProperty(c) && (u = a[c], u != null && bl(l, t, c, u, a, null));
  }
  var mh = {};
  function dh(l, t, a, u) {
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
        var e = null, n = null, i = null, c = null, f = null, d = null, g = null;
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
                u.hasOwnProperty(y) || bl(l, t, y, null, u, z);
            }
        }
        for (var r in u) {
          var y = u[r];
          if (z = a[r], u.hasOwnProperty(r) && (y != null || z != null))
            switch (r) {
              case "type":
                y !== z && (rl = !0), n = y;
                break;
              case "name":
                y !== z && (rl = !0), e = y;
                break;
              case "checked":
                y !== z && (rl = !0), d = y;
                break;
              case "defaultChecked":
                y !== z && (rl = !0), g = y;
                break;
              case "value":
                y !== z && (rl = !0), i = y;
                break;
              case "defaultValue":
                y !== z && (rl = !0), c = y;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (y != null)
                  throw Error(h(137, t));
                break;
              default:
                y !== z && bl(
                  l,
                  t,
                  r,
                  y,
                  u,
                  z
                );
            }
        }
        ki(
          l,
          i,
          c,
          f,
          d,
          g,
          n,
          e
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
                u.hasOwnProperty(n) || bl(
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
                n !== f && (rl = !0), r = n;
                break;
              case "defaultValue":
                n !== f && (rl = !0), c = n;
                break;
              case "multiple":
                n !== f && (rl = !0), i = n;
              default:
                n !== f && bl(
                  l,
                  t,
                  e,
                  n,
                  u,
                  f
                );
            }
        t = c, a = i, u = y, r != null ? Hu(l, !!a, r, !1) : !!u != !!a && (t != null ? Hu(l, !!a, t, !0) : Hu(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        y = r = null;
        for (c in a)
          if (e = a[c], a.hasOwnProperty(c) && e != null && !u.hasOwnProperty(c))
            switch (c) {
              case "value":
                break;
              case "children":
                break;
              default:
                bl(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (rl = !0), r = e;
                break;
              case "defaultValue":
                e !== n && (rl = !0), y = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(h(91));
                break;
              default:
                e !== n && bl(l, t, i, e, u, n);
            }
        ls(l, r, y);
        return;
      case "option":
        for (var A in a)
          r = a[A], a.hasOwnProperty(A) && r != null && !u.hasOwnProperty(A) && (A === "selected" ? l.selected = !1 : bl(
            l,
            t,
            A,
            null,
            u,
            r
          ));
        for (f in u)
          r = u[f], y = a[f], u.hasOwnProperty(f) && r !== y && (r != null || y != null) && (f === "selected" ? (r !== y && (rl = !0), l.selected = r && typeof r != "function" && typeof r != "symbol") : bl(
            l,
            t,
            f,
            r,
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
        for (var D in a)
          r = a[D], a.hasOwnProperty(D) && r != null && !u.hasOwnProperty(D) && bl(l, t, D, null, u, r);
        for (d in u)
          if (r = u[d], y = a[d], u.hasOwnProperty(d) && r !== y && (r != null || y != null))
            switch (d) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(h(137, t));
                break;
              default:
                bl(
                  l,
                  t,
                  d,
                  r,
                  u,
                  y
                );
            }
        return;
      default:
        if (lc(t)) {
          for (var $ in a)
            r = a[$], a.hasOwnProperty($) && r !== void 0 && !u.hasOwnProperty($) && Pf(
              l,
              t,
              $,
              void 0,
              u,
              r
            );
          for (g in u)
            r = u[g], y = a[g], !u.hasOwnProperty(g) || r === y || r === void 0 && y === void 0 || Pf(
              l,
              t,
              g,
              r,
              u,
              y
            );
          return;
        }
    }
    for (var m in a)
      r = a[m], a.hasOwnProperty(m) && r != null && !u.hasOwnProperty(m) && bl(l, t, m, null, u, r);
    for (z in u)
      r = u[z], y = a[z], !u.hasOwnProperty(z) || r === y || r == null && y == null || bl(l, t, z, r, u, y);
  }
  function od(l) {
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
  function vh() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, c = e.duration;
        if (n && c && od(i)) {
          for (i = 0, c = e.responseEnd, u += 1; u < a.length; u++) {
            var f = a[u], d = f.startTime;
            if (d > c) break;
            var g = f.transferSize, z = f.initiatorType;
            g && od(z) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - d) / (f - d)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var lo = null, to = null;
  function cn(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function sd(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function rd(l, t) {
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
  function md(l, t, a, u) {
    return a = cn(
      a
    ).createElement(l), a[kl] = u, a[vt] = t, ut(a, l, t), wl(a), a;
  }
  function ao(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var uo = null;
  function hh() {
    var l = window.event;
    return l && l.type === "popstate" ? l === uo ? !1 : (uo = l, !0) : (uo = null, !1);
  }
  var eo = typeof setTimeout == "function" ? setTimeout : void 0, yh = typeof clearTimeout == "function" ? clearTimeout : void 0, dd = typeof Promise == "function" ? Promise : void 0, vd = typeof requestAnimationFrame == "function" ? requestAnimationFrame : eo, gh = typeof queueMicrotask == "function" ? queueMicrotask : typeof dd < "u" ? function(l) {
    return dd.resolve(null).then(l).catch(Sh);
  } : eo;
  function Sh(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Ia(l) {
    return l === "head";
  }
  function hd(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), Se(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          mo(
            l.ownerDocument.documentElement
          );
        else if (a === "head") {
          a = l.ownerDocument.head, mo(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, c = n.nodeName;
            n[Oe] || c === "SCRIPT" || c === "STYLE" || c === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && mo(l.ownerDocument.body);
      a = e;
    } while (a);
    Se(t);
  }
  function yd(l, t) {
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
  function gd(l, t, a) {
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
  function Sd(l, t) {
    l = l.style, t = t.style;
    var a = t != null ? t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null : null;
    l.viewTransitionName = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), a = t != null ? t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null : null, l.viewTransitionClass = a == null || typeof a == "boolean" ? "" : ("" + a).trim(), l.display === "inline-block" && (t == null ? l.display = l.margin = "" : (a = t.display, l.display = a == null || typeof a == "boolean" ? "" : a, a = t.margin, a != null ? l.margin = a : (a = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], l.marginTop = a == null || typeof a == "boolean" ? "" : a, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], l.marginBottom = t == null || typeof t == "boolean" ? "" : t)));
  }
  function bh(l, t, a) {
    return a = a.ownerDocument.defaultView, {
      rect: l,
      abs: t.position === "absolute" || t.position === "fixed",
      clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
      view: 0 <= l.bottom && 0 <= l.right && l.top <= a.innerHeight && l.left <= a.innerWidth
    };
  }
  function no(l) {
    var t = l.getBoundingClientRect(), a = getComputedStyle(l);
    return bh(t, a, l);
  }
  function Th(l) {
    return l.documentElement.clientHeight;
  }
  function Eh(l) {
    this.addEventListener("load", l), this.addEventListener("error", l);
  }
  function zh(l, t, a, u, e, n, i, c, f) {
    var d = t.nodeType === 9 ? t : t.ownerDocument;
    try {
      var g = d.startViewTransition({
        update: function() {
          var r = d.defaultView, y = r.navigation && r.navigation.transition, A = d.fonts.status;
          u();
          var D = [];
          if (A === "loaded" && (Th(d), d.fonts.status === "loading" && D.push(d.fonts.ready)), A = D.length, l !== null)
            for (var $ = l.suspenseyImages, m = 0, o = 0; o < $.length; o++) {
              var v = $[o];
              if (!v.complete) {
                var E = v.getBoundingClientRect();
                if (0 < E.bottom && 0 < E.right && E.top < r.innerHeight && E.left < r.innerWidth) {
                  if (m += Gd(v), m > Bi) {
                    D.length = A;
                    break;
                  }
                  v = new Promise(
                    Eh.bind(v)
                  ), D.push(v);
                }
              }
            }
          if (0 < D.length)
            return r = Promise.race([
              Promise.all(D),
              new Promise(function(M) {
                return setTimeout(M, 500);
              })
            ]).then(e, e), (y ? Promise.allSettled([y.finished, r]) : r).then(n, n);
          if (e(), y)
            return y.finished.then(
              n,
              n
            );
          n();
        },
        types: a
      });
      d.__reactViewTransition = g;
      var z = [];
      return g.ready.then(
        function() {
          for (var r = d.documentElement.getAnimations({
            subtree: !0
          }), y = 0; y < r.length; y++) {
            var A = r[y], D = A.effect, $ = D.pseudoElement;
            if ($ != null && $.startsWith("::view-transition")) {
              z.push(A), A = D.getKeyframes();
              for (var m = $ = void 0, o = !0, v = 0; v < A.length; v++) {
                var E = A[v], M = E.width;
                if ($ === void 0) $ = M;
                else if ($ !== M) {
                  o = !1;
                  break;
                }
                if (M = E.height, m === void 0) m = M;
                else if (m !== M) {
                  o = !1;
                  break;
                }
                delete E.width, delete E.height, E.transform === "none" && delete E.transform;
              }
              o && $ !== void 0 && m !== void 0 && (D.setKeyframes(A), o = getComputedStyle(
                D.target,
                D.pseudoElement
              ), o.width !== $ || o.height !== m) && (o = A[0], o.width = $, o.height = m, o = A[A.length - 1], o.width = $, o.height = m, D.setKeyframes(A));
            }
          }
          i();
        },
        function(r) {
          d.__reactViewTransition === g && (d.__reactViewTransition = null);
          try {
            typeof r == "object" && r !== null && r.name === "InvalidStateError" && (r.message === "View transition was skipped because document visibility state is hidden." || r.message === "Skipping view transition because document visibility state has become hidden." || r.message === "Skipping view transition because viewport size changed." || r.message === "Transition was aborted because of invalid state") && (r = null), r !== null && f(r);
          } finally {
            u(), e(), i();
          }
        }
      ), g.finished.finally(function() {
        for (var r = 0; r < z.length; r++)
          z[r].cancel();
        d.__reactViewTransition === g && (d.__reactViewTransition = null), c();
      }), g;
    } catch {
      return u(), e(), i(), null;
    }
  }
  function Au(l, t) {
    this._scope = document.documentElement, this._selector = "::view-transition-" + l + "(" + t + ")";
  }
  Au.prototype.animate = function(l, t) {
    return t = typeof t == "number" ? { duration: t } : q({}, t), t.pseudoElement = this._selector, this._scope.animate(l, t);
  }, Au.prototype.getAnimations = function() {
    for (var l = this._scope, t = this._selector, a = l.getAnimations({ subtree: !0 }), u = [], e = 0; e < a.length; e++) {
      var n = a[e].effect;
      n !== null && n.target === l && n.pseudoElement === t && u.push(a[e]);
    }
    return u;
  }, Au.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function bd(l) {
    return {
      name: l,
      group: new Au("group", l),
      imagePair: new Au("image-pair", l),
      old: new Au("old", l),
      new: new Au("new", l)
    };
  }
  function Rt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  Rt.prototype.addEventListener = function(l, t, a) {
    var u = null, e = null;
    if (!(a != null && typeof a != "boolean" && (u = a.signal || null, u !== null && u.aborted))) {
      this._eventListeners === null && (this._eventListeners = []);
      var n = this._eventListeners;
      if (Ed(n, l, t, a) === -1) {
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
        ), u.addEventListener("abort", e, { once: !0 }), e = u.removeEventListener.bind(u, "abort", e)), u = me(a), n.push({
          type: l,
          listener: t,
          optionsOrUseCapture: a,
          attachedListener: c,
          cleanup: e
        }), T(
          this._fragmentFiber.child,
          !1,
          _h,
          l,
          c,
          u
        );
      }
      this._eventListeners = n;
    }
  };
  function _h(l, t, a, u) {
    return K(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  Rt.prototype.removeEventListener = function(l, t, a) {
    var u = this._eventListeners;
    if (u !== null && (t = Ed(
      u,
      l,
      t,
      a
    ), t !== -1)) {
      var e = u[t];
      a = e.attachedListener;
      var n = e.cleanup;
      e = me(e.optionsOrUseCapture), T(
        this._fragmentFiber.child,
        !1,
        Oh,
        l,
        a,
        e
      ), u.splice(t, 1), n !== null && n();
    }
  };
  function Oh(l, t, a, u) {
    return K(l).removeEventListener(
      t,
      a,
      u
    ), !1;
  }
  function me(l) {
    return l != null && typeof l != "boolean" && (l.once === !0 || l.signal instanceof AbortSignal) ? { capture: l.capture, passive: l.passive } : l;
  }
  function Td(l) {
    return l == null ? "c=0" : typeof l == "boolean" ? "c=" + (l ? "1" : "0") : "c=" + (l.capture ? "1" : "0");
  }
  function Ed(l, t, a, u) {
    if (l.length === 0) return -1;
    u = Td(u);
    for (var e = 0; e < l.length; e++) {
      var n = l[e];
      if (n.type === t && n.listener === a && Td(n.optionsOrUseCapture) === u)
        return e;
    }
    return -1;
  }
  Rt.prototype.dispatchEvent = function(l) {
    var t = R(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = K(t);
    var a = this._eventListeners;
    if (a !== null && 0 < a.length || !l.bubbles) {
      var u = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
      if (a)
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.addEventListener(
            n.type,
            n.attachedListener,
            me(n.optionsOrUseCapture)
          );
        }
      if (t.appendChild(u), l = u.dispatchEvent(l), a)
        for (e = 0; e < a.length; e++)
          n = a[e], u.removeEventListener(
            n.type,
            n.attachedListener,
            me(n.optionsOrUseCapture)
          );
      return t.removeChild(u), l;
    }
    return t.dispatchEvent(l);
  }, Rt.prototype.focus = function(l) {
    T(
      this._fragmentFiber.child,
      !0,
      zd,
      l,
      void 0,
      void 0
    );
  };
  function zd(l, t) {
    return l.tag === 6 ? !1 : (l = K(l), Bh(l, t));
  }
  Rt.prototype.focusLast = function(l) {
    var t = [];
    T(
      this._fragmentFiber.child,
      !0,
      io,
      t,
      void 0,
      void 0
    );
    for (var a = t.length - 1; 0 <= a && !zd(t[a], l); a--) ;
  };
  function io(l, t) {
    return t.push(l), !1;
  }
  Rt.prototype.blur = function() {
    var l = R(
      this._fragmentFiber
    );
    l !== null && (l = K(l), l = cn(l).activeElement, l !== null && T(
      this._fragmentFiber.child,
      !1,
      Nh,
      l,
      void 0,
      void 0
    ));
  };
  function Nh(l, t) {
    return l.tag === 6 ? !1 : (l = K(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  Rt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), T(
      this._fragmentFiber.child,
      !1,
      Ah,
      l,
      void 0,
      void 0
    );
  };
  function Ah(l, t) {
    return l.tag === 6 || (l = K(l), t.observe(l)), !1;
  }
  Rt.prototype.unobserveUsing = function(l) {
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
      for (var a = t = 0; a < kt.length; a++) {
        var u = kt[a];
        u.fragmentInstance === this && u.observer === l ? l.unobserve(u.instance) : kt[t++] = u;
      }
      kt.length = t;
    }
  };
  function Mh(l, t) {
    return l.tag === 6 || (l = K(l), t.unobserve(l)), !1;
  }
  var kt = [], co = !1;
  function Dh(l, t, a) {
    kt.push({
      fragmentInstance: l,
      observer: t,
      instance: a
    }), co || (co = !0, qh(function() {
      co = !1;
      var u = kt;
      kt = [];
      for (var e = 0; e < u.length; e++) {
        var n = u[e];
        n.observer.unobserve(n.instance);
      }
    }));
  }
  Rt.prototype.getClientRects = function() {
    var l = [];
    return T(
      this._fragmentFiber.child,
      !1,
      Ch,
      l,
      void 0,
      void 0
    ), l;
  };
  function Ch(l, t) {
    if (l.tag === 6) {
      l = l.stateNode;
      var a = l.ownerDocument.createRange();
      a.selectNodeContents(l), t.push.apply(t, a.getClientRects());
    } else
      l = K(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  Rt.prototype.getRootNode = function(l) {
    var t = R(
      this._fragmentFiber
    );
    return t === null ? this : K(t).getRootNode(l);
  }, Rt.prototype.compareDocumentPosition = function(l) {
    var t = R(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    T(
      this._fragmentFiber.child,
      !1,
      io,
      a,
      void 0,
      void 0
    );
    var u = K(t);
    if (a.length === 0) {
      if (a = u, El(this._fragmentFiber)) {
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
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = Zl(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = K(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = K(a[0]), e = K(a[a.length - 1]);
    var n = El(this._fragmentFiber) ? t.parentElement : u;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    u = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = e.compareDocumentPosition(l), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = u && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = u && t === l || n && e === l || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !u && t === l || !n && e === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || ph(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function ph(l, t, a, u, e) {
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
        for (n = t, t = R(t); n !== null; ) {
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
    return l & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!n) && !(t = n === a) && (t = Ul(
      a,
      n,
      x
    ), t === null ? t = !1 : (T(
      t,
      !0,
      nt,
      n,
      a
    ), n = Ml, Ml = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = Ul(
      u,
      n,
      x
    ), t === null ? t = !1 : (T(
      t,
      !0,
      cl,
      n,
      u
    ), n = Ml, xl = Ml = null, t = n !== null)), t) : !1;
  }
  function _d(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  Rt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(h(566));
    var t = [];
    T(
      this._fragmentFiber.child,
      !1,
      io,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var u = Zl(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || R(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = K(u), _d(l, a);
        return;
      }
      if (u = K(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = K(e), _d(e, a)) : K(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Uh(l, t) {
    return l = K(l), Od(l, t), !1;
  }
  function Od(l, t) {
    l.reactFragments == null && (l.reactFragments = /* @__PURE__ */ new Set()), l.reactFragments.add(t);
  }
  function Nd(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.addEventListener(
          e.type,
          e.attachedListener,
          me(e.optionsOrUseCapture)
        );
      }
    l.nodeType !== 3 && (a = t._observers, a !== null && a.forEach(function(n) {
      for (var i = 0, c = 0; c < kt.length; c++) {
        var f = kt[c];
        (f.fragmentInstance !== t || f.observer !== n || f.instance !== l) && (kt[i++] = f);
      }
      kt.length = i, n.observe(l);
    }), Od(l, t));
  }
  function Rh(l, t) {
    var a = t._eventListeners;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u];
        l.removeEventListener(
          e.type,
          e.attachedListener,
          me(e.optionsOrUseCapture)
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
  function fo(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          fo(a), On(a);
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
  function jh(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[Oe])
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
  function Hh(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Vt(l.nextSibling), l === null)) return null;
    return l;
  }
  function Ad(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Vt(l.nextSibling), l === null)) return null;
    return l;
  }
  function oo(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function so(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function xh(l, t) {
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
  var ro = null;
  function Md(l) {
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
  function Dd(l) {
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
  function Bh(l, t) {
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
  function qh(l) {
    vd(function() {
      vd(function(t) {
        return l(t);
      });
    });
  }
  function Cd(l, t, a) {
    switch (t = cn(a), l) {
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
  function pd(l, t, a) {
    for (var u in a) {
      var e = a[u];
      a.hasOwnProperty(u) && e != null && bl(l, t, u, null, mh, e);
    }
    a.dangerouslySetInnerHTML != null && (l.textContent = ""), l.onclick === la && (l.onclick = null), On(l);
  }
  function mo(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    On(l);
  }
  var Zt = /* @__PURE__ */ new Map(), Ud = /* @__PURE__ */ new Set();
  function fn(l) {
    if (typeof l.getRootNode == "function") {
      var t = l.getRootNode();
      if (t.nodeType === 9 || t.nodeType === 11) return t;
    }
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  var Aa = G.d;
  G.d = {
    f: Yh,
    r: Gh,
    D: Xh,
    C: Qh,
    L: Vh,
    m: Zh,
    X: Kh,
    S: Lh,
    M: Jh
  };
  function Yh() {
    var l = Aa.f(), t = Mi();
    return l || t;
  }
  function Gh(l) {
    var t = Uu(l);
    t !== null && t.tag === 5 && t.type === "form" ? jr(t) : Aa.r(l);
  }
  var de = typeof document > "u" ? null : document;
  function Rd(l, t, a) {
    var u = de;
    if (u && typeof t == "string" && t) {
      var e = xt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Ud.has(e) || (Ud.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), ut(t, "link", l), wl(t), u.head.appendChild(t)));
    }
  }
  function Xh(l) {
    Aa.D(l), Rd("dns-prefetch", l, null);
  }
  function Qh(l, t) {
    Aa.C(l, t), Rd("preconnect", l, t);
  }
  function Vh(l, t, a) {
    Aa.L(l, t, a);
    var u = de;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + xt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + xt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + xt(
        a.imageSizes
      ) + '"]')) : e += '[href="' + xt(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = ve(l);
          break;
        case "script":
          n = he(l);
      }
      if (!(Zt.has(n) || (l = q(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Zt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(on(n)) || t === "script" && u.querySelector(sn(n))))) {
        var i = u.createElement("link");
        ut(i, "link", l), t === "style" && (i[_n] = !0, i.onload = i.onerror = function() {
          Ko(i);
        }), wl(i), u.head.appendChild(i);
      }
    }
  }
  function Zh(l, t) {
    Aa.m(l, t);
    var a = de;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + xt(u) + '"][href="' + xt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = he(l);
      }
      if (!Zt.has(n) && (l = q({ rel: "modulepreload", href: l }, t), Zt.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(sn(n)))
              return;
        }
        u = a.createElement("link"), ut(u, "link", l), wl(u), a.head.appendChild(u);
      }
    }
  }
  function Lh(l, t, a) {
    Aa.S(l, t, a);
    var u = de;
    if (u && l) {
      var e = Ru(u).hoistableStyles, n = ve(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var c = { loading: 0, preload: null };
        if (i = u.querySelector(
          on(n)
        ))
          c.loading = 5;
        else {
          l = q(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Zt.get(n)) && vo(l, a);
          var f = i = u.createElement("link");
          wl(f), ut(f, "link", l), f._p = new Promise(function(d, g) {
            f.onload = d, f.onerror = g;
          }), f.addEventListener("load", function() {
            c.loading |= 1;
          }), f.addEventListener("error", function() {
            c.loading |= 2;
          }), c.loading |= 4, Hi(i, t, u);
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
  function Kh(l, t) {
    Aa.X(l, t);
    var a = de;
    if (a && l) {
      var u = Ru(a).hoistableScripts, e = he(l), n = u.get(e);
      n || (n = a.querySelector(sn(e)), n || (l = q({ src: l, async: !0 }, t), (t = Zt.get(e)) && ho(l, t), n = a.createElement("script"), wl(n), ut(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Jh(l, t) {
    Aa.M(l, t);
    var a = de;
    if (a && l) {
      var u = Ru(a).hoistableScripts, e = he(l), n = u.get(e);
      n || (n = a.querySelector(sn(e)), n || (l = q({ src: l, async: !0, type: "module" }, t), (t = Zt.get(e)) && ho(l, t), n = a.createElement("script"), wl(n), ut(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function jd(l, t, a, u) {
    var e = (e = Kt.current) ? fn(e) : null;
    if (!e) throw Error(h(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (a = ve(a.href), t = Ru(
          e
        ).hoistableStyles, u = t.get(a), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, t.set(a, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = ve(a.href);
          var n = Ru(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            on(l)
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Zt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Zt.set(l, n)), wh(
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
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = he(a), t = Ru(
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
  function ve(l) {
    return 'href="' + xt(l) + '"';
  }
  function on(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function Hd(l) {
    return q({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function wh(l, t, a, u) {
    if (t = l.querySelector(
      'link[rel="preload"][as="style"][' + t + "]"
    )) {
      if (t[_n] !== !0) {
        u.loading = 1;
        return;
      }
    } else
      t = l.createElement("link"), t[_n] = !0, t.onload = t.onerror = Ko.bind(null, t), ut(t, "link", a), wl(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function he(l) {
    return '[src="' + xt(l) + '"]';
  }
  function sn(l) {
    return "script[async]" + l;
  }
  function xd(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + xt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, wl(u), u;
          var e = q({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), wl(u), ut(u, "style", e), Hi(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = ve(a.href);
          var n = l.querySelector(
            on(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, wl(n), n;
          u = Hd(a), (e = Zt.get(e)) && vo(u, e), n = (l.ownerDocument || l).createElement("link"), wl(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), ut(n, "link", u), t.state.loading |= 4, Hi(n, a.precedence, l), t.instance = n;
        case "script":
          return n = he(a.src), (e = l.querySelector(
            sn(n)
          )) ? (t.instance = e, wl(e), e) : (u = a, (e = Zt.get(n)) && (u = q({}, a), ho(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), wl(e), ut(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(h(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Hi(u, a.precedence, l));
    return t.instance;
  }
  function Hi(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var c = u[i];
      if (c.dataset.precedence === t) n = c;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function vo(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function ho(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var xi = null;
  function Bd(l, t, a) {
    if (xi === null) {
      var u = /* @__PURE__ */ new Map(), e = xi = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = xi, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[Oe] || n[kl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var c = u.get(i);
        c ? c.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function yo(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function $h(l, t, a) {
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
  function qd(l, t) {
    return l === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
  }
  function Yd(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Gd(l) {
    return (l.width || 100) * (l.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * 0.25;
  }
  function Xd(l, t) {
    typeof t.decode == "function" && (l.imgCount++, t.complete || (l.imgBytes += Gd(t), l.suspenseyImages.push(t)), l = Ih.bind(l), t.decode().then(l, l));
  }
  function Fh(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = ve(u.href), n = t.querySelector(
          on(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = rn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, wl(n);
          return;
        }
        n = t.ownerDocument || t, u = Hd(u), (e = Zt.get(e)) && vo(u, e), n = n.createElement("link"), wl(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), ut(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = rn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Bi = 0;
  function Wh(l, t) {
    return l.stylesheets && l.count === 0 && Yi(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Yi(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Bi === 0 && (Bi = 62500 * vh());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Yi(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > Bi ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function Qd(l) {
    if (l.count === 0 && (l.imgCount === 0 || !l.waitingForImages)) {
      if (l.stylesheets) Yi(l, l.stylesheets);
      else if (l.unsuspend) {
        var t = l.unsuspend;
        l.unsuspend = null, t();
      }
    }
  }
  function rn() {
    this.count--, Qd(this);
  }
  function Ih() {
    this.imgCount--, Qd(this);
  }
  var qi = null;
  function Yi(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, qi = /* @__PURE__ */ new Map(), t.forEach(kh, l), qi = null, rn.call(l));
  }
  function kh(l, t) {
    if (!(t.state.loading & 4)) {
      var a = qi.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), qi.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = rn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var ye = {
    $$typeof: Rl,
    Provider: null,
    Consumer: null,
    _currentValue: Ht,
    _currentValue2: Ht,
    _threadCount: 0
  };
  function Ph(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = $i(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = $i(0), this.hiddenUpdates = $i(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Vd(l, t, a, u, e, n, i, c, f, d, g, z) {
    return l = new Ph(
      l,
      t,
      a,
      i,
      f,
      d,
      g,
      z,
      c
    ), t = 1, n === !0 && (t |= 24), n = ht(3, null, null, t), l.current = n, n.stateNode = l, t = Cc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, jc(n), l;
  }
  function Zd(l) {
    return l ? (l = Vu, l) : Vu;
  }
  function Ld(l, t, a, u, e, n) {
    e = Zd(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ga(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = Xa(l, u, t), a !== null && (bt(a, l, t), Qe(a, l, t));
  }
  function Kd(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function go(l, t) {
    Kd(l, t), (l = l.alternate) && Kd(l, t);
  }
  function Jd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = ou(l, 67108864);
      t !== null && bt(t, l, 67108864), go(l, 67108864);
    }
  }
  function wd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Ut();
      t = Fi(t);
      var a = ou(l, t);
      a !== null && bt(a, l, t), go(l, t);
    }
  }
  var ge = !0;
  function ly(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = G.p;
    try {
      G.p = 2, So(l, t, a, u);
    } finally {
      G.p = n, C.T = e;
    }
  }
  function ty(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = G.p;
    try {
      G.p = 8, So(l, t, a, u);
    } finally {
      G.p = n, C.T = e;
    }
  }
  function So(l, t, a, u) {
    if (ge) {
      var e = bo(u);
      if (e === null)
        kf(
          l,
          t,
          u,
          Gi,
          a
        ), Fd(l, u);
      else if (uy(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (Fd(l, u), t & 4 && -1 < ay.indexOf(l)) {
        for (; e !== null; ) {
          var n = Uu(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = eu(n.pendingLanes);
                  if (i !== 0) {
                    var c = n;
                    for (c.pendingLanes |= 2, c.entangledLanes |= 2; i; ) {
                      var f = 1 << 31 - Ot(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    sa(n), (dl & 6) === 0 && (Oi = zt() + 500, un(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = ou(n, 2), c !== null && bt(c, n, 2), Mi(), go(n, 2);
            }
          if (n = bo(u), n === null && kf(
            l,
            t,
            u,
            Gi,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        kf(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function bo(l) {
    return l = ac(l), To(l);
  }
  var Gi = null;
  function To(l) {
    if (Gi = null, l = nu(l), l !== null) {
      var t = W(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = _l(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = ql(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Gi = l, null;
  }
  function $d(l) {
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
        switch (v0()) {
          case jo:
            return 2;
          case Ho:
            return 8;
          case Sn:
          case h0:
            return 32;
          case xo:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var Eo = !1, ka = null, Pa = null, lu = null, mn = /* @__PURE__ */ new Map(), dn = /* @__PURE__ */ new Map(), tu = [], ay = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function Fd(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        ka = null;
        break;
      case "dragenter":
      case "dragleave":
        Pa = null;
        break;
      case "mouseover":
      case "mouseout":
        lu = null;
        break;
      case "pointerover":
      case "pointerout":
        mn.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        dn.delete(t.pointerId);
    }
  }
  function vn(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Uu(t), t !== null && Jd(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function uy(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return ka = vn(
          ka,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Pa = vn(
          Pa,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return lu = vn(
          lu,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return mn.set(
          n,
          vn(
            mn.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, dn.set(
          n,
          vn(
            dn.get(n) || null,
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
  function Wd(l) {
    var t = nu(l.target);
    if (t !== null) {
      var a = W(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = _l(a), t !== null) {
            l.blockedOn = t, Vo(l.priority, function() {
              wd(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = ql(a), t !== null) {
            l.blockedOn = t, Vo(l.priority, function() {
              wd(a);
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
  function Xi(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = bo(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        tc = u, a.target.dispatchEvent(u), tc = null;
      } else
        return t = Uu(a), t !== null && Jd(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function Id(l, t, a) {
    Xi(l) && a.delete(t);
  }
  function ey() {
    Eo = !1, ka !== null && Xi(ka) && (ka = null), Pa !== null && Xi(Pa) && (Pa = null), lu !== null && Xi(lu) && (lu = null), mn.forEach(Id), dn.forEach(Id);
  }
  function Qi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, Eo || (Eo = !0, O.unstable_scheduleCallback(
      O.unstable_NormalPriority,
      ey
    )));
  }
  var Vi = null;
  function kd(l) {
    Vi !== l && (Vi = l, O.unstable_scheduleCallback(
      O.unstable_NormalPriority,
      function() {
        Vi === l && (Vi = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (To(u || a) === null)
              continue;
            break;
          }
          var n = Uu(a);
          n !== null && (l.splice(t, 3), t -= 3, lf(
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
  function Se(l) {
    function t(f) {
      return Qi(f, l);
    }
    ka !== null && Qi(ka, l), Pa !== null && Qi(Pa, l), lu !== null && Qi(lu, l), mn.forEach(t), dn.forEach(t);
    for (var a = 0; a < tu.length; a++) {
      var u = tu[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < tu.length && (a = tu[0], a.blockedOn === null); )
      Wd(a), a.blockedOn === null && tu.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[vt] || null;
        if (typeof n == "function")
          i || kd(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[vt] || null)
              c = i.formAction;
            else if (To(e) !== null) continue;
          } else c = i.action;
          typeof c == "function" ? a[u + 1] = c : (a.splice(u, 3), u -= 3), kd(a);
        }
      }
  }
  function Pd() {
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
  function zo(l) {
    this._internalRoot = l;
  }
  Zi.prototype.render = zo.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(h(409));
    var a = t.current, u = Ut();
    Ld(a, u, l, t, null, null);
  }, Zi.prototype.unmount = zo.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      Ld(l.current, 2, null, l, null, null), Mi(), t[pu] = null;
    }
  };
  function Zi(l) {
    this._internalRoot = l;
  }
  Zi.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Qo();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < tu.length && t !== 0 && t < tu[a].priority; a++) ;
      tu.splice(a, 0, l), a === 0 && Wd(l);
    }
  };
  var l0 = F.version;
  if (l0 !== "19.3.0")
    throw Error(
      h(
        527,
        l0,
        "19.3.0"
      )
    );
  G.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(h(188)) : (l = Object.keys(l).join(","), Error(h(268, l)));
    return l = Al(t), l = l !== null ? j(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var ny = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: C,
    reconcilerVersion: "19.3.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Li = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Li.isDisabled && Li.supportsFiber)
      try {
        Ee = Li.inject(
          ny
        ), _t = Li;
      } catch {
      }
  }
  return yn.createRoot = function(l, t) {
    if (!ll(l)) throw Error(h(299));
    var a = !1, u = "", e = Zr, n = Lr, i = Kr;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Vd(
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
      Pd
    ), l[pu] = t.current, If(l), new zo(t);
  }, yn.hydrateRoot = function(l, t, a) {
    if (!ll(l)) throw Error(h(299));
    var u = !1, e = "", n = Zr, i = Lr, c = Kr, f = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (c = a.onRecoverableError), a.formState !== void 0 && (f = a.formState)), t = Vd(
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
      Pd
    ), t.context = Zd(null), a = t.current, u = Ut(), u = Fi(u), e = Ga(u), e.callback = null, Xa(a, e, u), a = u, t.current.lanes = a, _e(t, a), sa(t), l[pu] = t.current, If(l), new Zi(t);
  }, yn.version = "19.3.0", yn;
}
var s0;
function hy() {
  if (s0) return No.exports;
  s0 = 1;
  function O() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(O);
      } catch (F) {
        console.error(F);
      }
  }
  return O(), No.exports = vy(), No.exports;
}
var yy = hy();
function gy(O = "/api") {
  async function F(Z, h, ll) {
    const W = await fetch(`${O.replace(/\/$/, "")}/${Z}`, {
      ...h ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) } : {},
      signal: ll
    });
    if (!W.ok) {
      const _l = await W.json().catch(() => ({}));
      throw new Error(_l.error || `Erro HTTP ${W.status}`);
    }
    return Z === "export" ? W.blob() : W.json();
  }
  return { catalog: (Z) => F("catalog", null, Z), preview: (Z, h) => F("preview", Z, h), export: (Z, h) => F("export", Z, h) };
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
}, Co = (O) => {
  try {
    return JSON.parse(O.detail) || {};
  } catch {
    return {};
  }
}, po = (O) => {
  if (r0[O]) return r0[O];
  const F = String(O).replace(/^\d+_/, "").replaceAll("_", " ");
  return F.charAt(0).toLocaleUpperCase("pt-BR") + F.slice(1);
}, Sy = {
  "IBGE · Censo 2022": "IBGE — Censo Demográfico 2022",
  "IBGE / Cadastro Central de Empresas": "IBGE — Cadastro Central de Empresas",
  "IBGE / Finanças públicas": "IBGE — Finanças Públicas",
  "IBGE / Produto Interno Bruto dos Municípios": "IBGE — Produto Interno Bruto dos Municípios",
  "IBGE / Índice de Desenvolvimento da Educação Básica": "IBGE — Índice de Desenvolvimento da Educação Básica",
  "Ipeadata / Atlas do Desenvolvimento Humano (Censo Demográfico)": "Ipea — Atlas do Desenvolvimento Humano",
  "InfoSiga SP": "Detran-SP — InfoSiga",
  "MTE / RAIS": "MTE — RAIS",
  "Seade · IPDM": "Fundação Seade — IPDM"
}, by = (O) => Sy[O] || String(O).replace(/\s*[·/]\s*/g, " — ");
function Ty(O) {
  let F = "";
  try {
    F = JSON.parse(O.detail).categorias || "";
  } catch {
    F = "";
  }
  const Z = {};
  for (const h of String(F).split("|")) {
    const ll = h.indexOf(":");
    if (ll < 1) continue;
    const W = h.slice(0, ll).trim(), _l = h.slice(ll + 1).trim();
    W && _l && (Z[W] = _l);
  }
  return Z;
}
const gn = { fgb: 6500, gpkg: 1900, shp: 250, geojson: 6500 }, Uo = "__todas__";
function Ey({ apiBaseUrl: O = "/api", client: F, value: Z, onChange: h, onExport: ll, download: W = !0, className: _l = "", categoriaNome: ql = "", feedback: L, resultado: Al = null }) {
  const j = vl.useMemo(() => F || gy(O), [F, O]), [T, R] = vl.useState(null), [El, Zl] = vl.useState(0), [ml, K] = vl.useState(""), [Ml, xl] = vl.useState(0), [nt, cl] = vl.useState({ attributes: [], format: "fgb" }), x = Z ?? nt, [Ul, q] = vl.useState(""), [I, Tt] = vl.useState("2022"), [Ll, it] = vl.useState(""), [Il, Pt] = vl.useState(""), [mt, Rl] = vl.useState({}), [N, B] = vl.useState(0), [Y, sl] = vl.useState(""), [k, dt] = vl.useState(!1), [Lt, jt] = vl.useState(""), [s, _] = vl.useState(null), p = vl.useRef(!0);
  vl.useEffect(() => {
    p.current = !0;
    const b = new AbortController();
    return R(null), sl(""), j.catalog(b.signal).then((Q) => {
      R(Q), q(Q.attributes.find((el) => el.source === "IBGE · Censo 2022")?.source || Q.attributes[0]?.source || "");
    }).catch((Q) => {
      Q.name !== "AbortError" && (sl(Q.message), L?.error(Q.message, "Catálogo de indicadores"));
    }), () => {
      p.current = !1, b.abort();
    };
  }, [j, El]);
  function U(b) {
    L && b.attributes.length > gn[b.format] && (b.format !== x.format || x.attributes.length <= gn[x.format]) && L.warning("Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos.", "Formato da camada"), Z === void 0 && cl(b), h?.(b), jt("");
  }
  const J = T?.attributes || [], fl = [...new Set(J.map((b) => b.source))], tl = Ul === Uo, C = [...new Set(J.filter((b) => tl || b.source === Ul).map((b) => b.year))].sort((b, Q) => Q - b), G = tl && I === "", Ht = G ? null : C.includes(Number(I)) ? Number(I) : C[0], Mu = J.filter((b) => (tl || b.source === Ul) && (G || b.year === Ht)), Ma = [...new Set(Mu.map((b) => b.theme))], Yl = new Set(x.attributes), Kl = vl.useMemo(() => {
    const b = J.filter((Dl) => Yl.has(Dl.id));
    if (!b.length) return "Categoria — fonte majoritária — data da geração";
    const Q = /* @__PURE__ */ new Map();
    for (const Dl of b) Q.set(Dl.source, (Q.get(Dl.source) || 0) + 1);
    const el = [...Q.entries()].sort((Dl, Ca) => Ca[1] - Dl[1])[0][0];
    return `${ql || "Categoria"} — ${el} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [J, x.attributes, ql]), hl = J.filter((b) => Yl.has(b.id)), Et = vl.useMemo(() => new Map(J.map((b) => [b.id, Ty(b)])), [J]), Da = Mu.filter((b) => (!Ll || b.theme === Ll) && `${b.label} ${b.field} ${b.unit}`.toLocaleLowerCase("pt-BR").includes(Il.toLocaleLowerCase("pt-BR"))), Kt = (b, Q) => Object.entries(mt).every(([el, Dl]) => !Dl || el === Q || Et.get(b.id)?.[el] === Dl), Du = (() => {
    if (!Ll) return [];
    const b = /* @__PURE__ */ new Map();
    for (const Q of Da) for (const [el, Dl] of Object.entries(Et.get(Q.id) || {}))
      b.has(el) || b.set(el, /* @__PURE__ */ new Set()), Kt(Q, el) && b.get(el).add(Dl);
    return [...b].map(([Q, el]) => [Q, [...el].sort((Dl, Ca) => Dl.localeCompare(Ca, "pt-BR", { numeric: !0 }))]).filter(([Q, el]) => el.length > 1 || mt[Q]).sort((Q, el) => Q[0].localeCompare(el[0], "pt-BR"));
  })(), Jt = Da.filter((b) => Kt(b, null)), ra = Jt.slice(N * 40, N * 40 + 40);
  vl.useEffect(() => {
    B(0);
  }, [Ul, I, Ll, Il, mt]), vl.useEffect(() => {
    Rl({});
  }, [Ul, I, Ll]);
  const be = `${x.format}|${[...x.attributes].join(",")}`;
  vl.useEffect(() => {
    if (_(null), K(""), !x.attributes.length || x.attributes.length > gn[x.format]) return;
    const b = new AbortController(), Q = { attributes: x.attributes, format: x.format }, el = setTimeout(() => j.preview(Q, b.signal).then((Dl) => {
      b.signal.aborted || _(Dl);
    }).catch((Dl) => {
      b.signal.aborted || (K(Dl.message), L?.error(Dl.message, "Prévia dos indicadores"));
    }), 250);
    return () => {
      clearTimeout(el), b.abort();
    };
  }, [j, be, Ml]);
  function uu(b) {
    U({ ...x, attributes: Yl.has(b) ? x.attributes.filter((Q) => Q !== b) : [...x.attributes, b] });
  }
  async function Te() {
    if (L && !await L.confirmar({ title: "Gerar camada territorial", message: `Gerar uma camada com ${x.attributes.length} atributos dos 645 municípios de São Paulo?`, confirmLabel: "Gerar camada" })) return;
    const b = L?.processo("Gerando camada territorial");
    b?.passo("Gerando a geometria e materializando os atributos selecionados…"), dt(!0), sl(""), jt(T?.destino ? `Gerando geometria e tabela de atributos em ${T.destino}/` : "Gerando geometria e tabela de atributos…");
    const Q = { ...x, attributes: [...x.attributes] };
    try {
      const el = await j.export(Q, b?.signal, b), Dl = `municipios_sp_${Q.format}.zip`;
      if (await ll?.({ blob: el, filename: Dl, configuration: Q, attributes: hl }), W) {
        const Ca = URL.createObjectURL(el), Cu = document.createElement("a");
        Cu.href = Ca, Cu.download = Dl, Cu.click(), setTimeout(() => URL.revokeObjectURL(Ca), 1e4);
      }
      p.current && jt("Camada gerada. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT."), b?.concluir({ type: "success", message: "Camada gerada e disponível no acervo. O pacote contém a camada, o relatório do join, o glossário, os metadados e a tabela em CSV, XLSX e TXT." });
    } catch (el) {
      p.current && (sl(el.message), jt("")), b?.concluir({ type: el.name === "AbortError" ? "info" : "error", message: el.message });
    } finally {
      p.current && dt(!1);
    }
  }
  return /* @__PURE__ */ S.jsxs("section", { className: `mlb ${_l}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ S.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ S.jsxs("div", { children: [
        /* @__PURE__ */ S.jsx("h2", { className: "mlb-title", children: "Monte sua camada" }),
        /* @__PURE__ */ S.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO - DADOS MUNICIPAIS" }),
        /* @__PURE__ */ S.jsx("p", { children: "Selecione fontes, períodos, temas e atributos para compor uma única camada vetorial dos 645 municípios de São Paulo. Os dados escolhidos serão incorporados à tabela de atributos da malha municipal do IBGE de 2022." })
      ] }),
      /* @__PURE__ */ S.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ S.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ S.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    Y && !L && /* @__PURE__ */ S.jsx("div", { className: "mlb-error", role: "alert", children: Y }),
    T ? /* @__PURE__ */ S.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ S.jsxs("section", { className: "mlb-panel", children: [
        /* @__PURE__ */ S.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ S.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ S.jsxs("select", { value: Ul, onChange: (b) => {
              q(b.target.value), it(""), b.target.value === Uo && Tt("");
            }, children: [
              /* @__PURE__ */ S.jsx("option", { value: Uo, children: "Todas as fontes" }),
              fl.map((b) => /* @__PURE__ */ S.jsx("option", { value: b, children: by(b) }, b))
            ] })
          ] }),
          /* @__PURE__ */ S.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ S.jsxs("select", { value: G ? "" : Ht ?? "", onChange: (b) => {
              Tt(b.target.value), it("");
            }, children: [
              tl && /* @__PURE__ */ S.jsx("option", { value: "", children: "Todos os anos" }),
              C.map((b) => /* @__PURE__ */ S.jsx("option", { children: b }, b))
            ] })
          ] }),
          /* @__PURE__ */ S.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ S.jsxs("select", { value: Ll, onChange: (b) => it(b.target.value), children: [
              /* @__PURE__ */ S.jsx("option", { value: "", children: "Todos os temas" }),
              Ma.map((b) => /* @__PURE__ */ S.jsx("option", { value: b, children: po(b) }, b))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ S.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ S.jsx("input", { type: "search", value: Il, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (b) => Pt(b.target.value) })
          ] }),
          Du.map(([b, Q]) => /* @__PURE__ */ S.jsxs("label", { children: [
            b,
            /* @__PURE__ */ S.jsxs("select", { value: mt[b] ?? "", onChange: (el) => Rl({ ...mt, [b]: el.target.value }), children: [
              /* @__PURE__ */ S.jsxs("option", { value: "", children: [
                "Todos (",
                Q.length,
                ")"
              ] }),
              Q.map((el) => /* @__PURE__ */ S.jsx("option", { value: el, children: el }, el))
            ] })
          ] }, b)),
          !!Object.values(mt).filter(Boolean).length && /* @__PURE__ */ S.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => Rl({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ S.jsxs("span", { children: [
            Jt.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ S.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ S.jsx("button", { type: "button", disabled: !Jt.length || k, onClick: () => U({ ...x, attributes: [.../* @__PURE__ */ new Set([...x.attributes, ...Jt.map((b) => b.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ S.jsx("button", { type: "button", disabled: !Yl.size || k, onClick: () => U({ ...x, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-attributes", children: [
          ra.map((b) => /* @__PURE__ */ S.jsxs("article", { className: Yl.has(b.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ S.jsxs("label", { children: [
              /* @__PURE__ */ S.jsx("input", { type: "checkbox", checked: Yl.has(b.id), disabled: k, onChange: () => uu(b.id) }),
              /* @__PURE__ */ S.jsx("strong", { children: b.label })
            ] }),
            /* @__PURE__ */ S.jsxs("details", { children: [
              /* @__PURE__ */ S.jsx("summary", { "aria-label": `Fonte e definição de ${b.label}` }),
              /* @__PURE__ */ S.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ S.jsxs("p", { className: "mlb-detail-meta", children: [
                  po(b.theme),
                  " · ",
                  b.unit || "Unidade não informada",
                  " · ",
                  b.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ S.jsxs("p", { children: [
                  tl ? `${b.source} · ` : "",
                  b.field,
                  " · ",
                  b.year
                ] }),
                /* @__PURE__ */ S.jsx("a", { href: b.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ S.jsx("p", { children: Co(b).definicao || Co(b).divulgacao || "" }),
                /* @__PURE__ */ S.jsx("p", { children: Co(b).nota || "" })
              ] })
            ] })
          ] }, b.id)),
          !ra.length && /* @__PURE__ */ S.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ S.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ S.jsx("button", { type: "button", disabled: !N, onClick: () => B(N - 1), children: "Anterior" }),
          /* @__PURE__ */ S.jsxs("span", { children: [
            "Página ",
            N + 1,
            " de ",
            Math.max(1, Math.ceil(Jt.length / 40))
          ] }),
          /* @__PURE__ */ S.jsx("button", { type: "button", disabled: (N + 1) * 40 >= Jt.length, onClick: () => B(N + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ S.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ S.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ S.jsx("strong", { children: x.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ S.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ S.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ S.jsxs("div", { className: "mlb-basket", children: [
          hl.map((b) => /* @__PURE__ */ S.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ S.jsx("span", { className: "mlb-basket-name", children: b.label }),
            /* @__PURE__ */ S.jsxs("details", { children: [
              /* @__PURE__ */ S.jsx("summary", { "aria-label": `Fonte e definição de ${b.label}` }),
              /* @__PURE__ */ S.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ S.jsxs("p", { className: "mlb-detail-meta", children: [
                  b.source,
                  " · ",
                  b.year
                ] }),
                /* @__PURE__ */ S.jsxs("p", { children: [
                  po(b.theme),
                  " · ",
                  b.unit || "Unidade não informada",
                  " · ",
                  b.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ S.jsx("p", { children: b.field })
              ] })
            ] }),
            /* @__PURE__ */ S.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: k, title: `Remover ${b.label}`, "aria-label": `Remover ${b.label}`, onClick: () => uu(b.id), children: "×" })
          ] }, b.id)),
          !hl.length && /* @__PURE__ */ S.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ S.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ S.jsxs("select", { disabled: k, value: x.format, onChange: (b) => U({ ...x, format: b.target.value }), children: [
            /* @__PURE__ */ S.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ S.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ S.jsx("option", { value: "shp", children: "Shapefile (.shp)" }),
            /* @__PURE__ */ S.jsx("option", { value: "geojson", children: "GeoJSON (.geojson)" })
          ] })
        ] }),
        /* @__PURE__ */ S.jsxs("p", { className: "mlb-note", children: [
          x.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : x.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP com relatório do join, glossário e tabela em CSV, XLSX e TXT."
        ] }),
        /* @__PURE__ */ S.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ S.jsx("input", { type: "text", maxLength: 200, disabled: k, value: x.nome ?? "", placeholder: Kl, onChange: (b) => U({ ...x, nome: b.target.value }) })
        ] }),
        /* @__PURE__ */ S.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        !L && Yl.size > gn[x.format] && /* @__PURE__ */ S.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ S.jsx("button", { type: "button", className: "mlb-primary", disabled: k || !Yl.size || Yl.size > gn[x.format], onClick: Te, children: k ? "Gerando camada…" : W ? "Gerar e baixar camada" : "Gerar camada" }),
        !L && /* @__PURE__ */ S.jsx("p", { className: "mlb-status", role: "status", children: Lt }),
        /* @__PURE__ */ S.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      (Al || ml || s) && /* @__PURE__ */ S.jsxs("section", { className: "mlb-panel mlb-resultados", "aria-label": "Resultados", children: [
        /* @__PURE__ */ S.jsx("h2", { children: "Resultados" }),
        Al,
        ml && /* @__PURE__ */ S.jsxs("div", { className: L ? "mlb-bloco mlb-preview" : "mlb-bloco mlb-error mlb-preview", children: [
          !L && /* @__PURE__ */ S.jsxs(S.Fragment, { children: [
            "Prévia indisponível: ",
            ml,
            " "
          ] }),
          /* @__PURE__ */ S.jsx("button", { type: "button", onClick: () => xl((b) => b + 1), children: "Tentar novamente" })
        ] }),
        s && /* @__PURE__ */ S.jsxs("section", { className: "mlb-bloco mlb-preview", children: [
          /* @__PURE__ */ S.jsx("h3", { children: "Prévia da tabela de atributos" }),
          /* @__PURE__ */ S.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
          /* @__PURE__ */ S.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ S.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ S.jsx("thead", { children: /* @__PURE__ */ S.jsxs("tr", { children: [
              /* @__PURE__ */ S.jsx("th", { children: "Código IBGE" }),
              /* @__PURE__ */ S.jsx("th", { children: "Município" }),
              s.fields.map((b) => /* @__PURE__ */ S.jsx("th", { children: b }, b))
            ] }) }),
            /* @__PURE__ */ S.jsx("tbody", { children: s.rows.map((b) => /* @__PURE__ */ S.jsxs("tr", { children: [
              /* @__PURE__ */ S.jsx("td", { children: b.CD_MUN }),
              /* @__PURE__ */ S.jsx("td", { children: b.NM_MUN }),
              s.fields.map((Q) => /* @__PURE__ */ S.jsx("td", { children: b[Q] == null ? "Sem valor" : b[Q].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, Q))
            ] }, b.CD_MUN)) })
          ] }) })
        ] }),
        s?.glossario?.length ? /* @__PURE__ */ S.jsxs("section", { className: "mlb-bloco mlb-glossario", children: [
          /* @__PURE__ */ S.jsx("h3", { children: "Glossário e aliases de atributos" }),
          /* @__PURE__ */ S.jsxs("p", { children: [
            "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
            s.totalAttributes > (s.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${s.glossarioLimite} de ${s.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
          ] }),
          /* @__PURE__ */ S.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ S.jsxs("table", { "data-table-sort": "off", children: [
            /* @__PURE__ */ S.jsx("thead", { children: /* @__PURE__ */ S.jsxs("tr", { children: [
              /* @__PURE__ */ S.jsx("th", { children: "Campo exportado" }),
              /* @__PURE__ */ S.jsx("th", { children: "Alias" }),
              /* @__PURE__ */ S.jsx("th", { children: "Significado" }),
              /* @__PURE__ */ S.jsx("th", { children: "Fonte" })
            ] }) }),
            /* @__PURE__ */ S.jsx("tbody", { children: s.glossario.map((b) => /* @__PURE__ */ S.jsxs("tr", { children: [
              /* @__PURE__ */ S.jsx("td", { children: /* @__PURE__ */ S.jsx("code", { children: b.campo_exportado }) }),
              /* @__PURE__ */ S.jsx("td", { children: b.alias }),
              /* @__PURE__ */ S.jsx("td", { className: "mlb-glossario-significado", children: b.significado }),
              /* @__PURE__ */ S.jsx("td", { children: b.fonte })
            ] }, b.campo_exportado)) })
          ] }) })
        ] }) : null
      ] })
    ] }) : /* @__PURE__ */ S.jsx("p", { role: "status", children: Y ? /* @__PURE__ */ S.jsxs(S.Fragment, { children: [
      "Não foi possível carregar o catálogo. ",
      /* @__PURE__ */ S.jsx("button", { type: "button", onClick: () => Zl((b) => b + 1), children: "Tentar novamente" })
    ] }) : "Carregando catálogo…" })
  ] });
}
function zy({ url: O }) {
  const F = vl.useRef(null), [Z, h] = vl.useState("Carregando a camada no mapa…");
  return vl.useEffect(() => {
    const ll = window.L;
    if (!ll) {
      h("Biblioteca de mapa indisponível nesta página.");
      return;
    }
    const W = ll.map(F.current, { scrollWheelZoom: !1 });
    ll.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(W), W.setView([-22.3, -48.6], 6);
    const _l = new AbortController();
    h("Carregando a camada no mapa…"), fetch(O, { credentials: "same-origin", signal: _l.signal }).then(async (L) => {
      if (!L.ok) throw new Error(`Não foi possível carregar a camada no mapa (HTTP ${L.status}).`);
      return L.json();
    }).then((L) => {
      const Al = ll.geoJSON(L, {
        style: { color: "#176b95", weight: 1, fillColor: "#4f97bf", fillOpacity: 0.25 },
        smoothFactor: 0,
        onEachFeature: (j, T) => {
          const R = j.properties || {};
          T.bindTooltip(R.NM_MUN ? `${R.NM_MUN} (${R.CD_MUN})` : String(R.CD_MUN ?? ""), { sticky: !0 }), T.on("click", () => {
            const El = document.createElement("table");
            El.className = "territorial-mapa-popup";
            for (const [Zl, ml] of Object.entries(R)) {
              const K = El.insertRow();
              K.insertCell().textContent = Zl, K.insertCell().textContent = ml == null ? "Sem valor" : typeof ml == "number" ? ml.toLocaleString("pt-BR", { maximumFractionDigits: 8 }) : String(ml);
            }
            T.bindPopup(El, { maxWidth: 420, maxHeight: 320 }).openPopup();
          });
        }
      }).addTo(W);
      Al.getBounds().isValid() && W.fitBounds(Al.getBounds(), { padding: [16, 16] }), h(`${(L.features || []).length.toLocaleString("pt-BR")} feições exibidas com a geometria original da camada salva. Clique em um município para ver seus atributos.`);
    }).catch((L) => {
      L.name !== "AbortError" && h(L.message);
    });
    const ql = setTimeout(() => W.invalidateSize(), 0);
    return () => {
      _l.abort(), clearTimeout(ql), W.remove();
    };
  }, [O]), /* @__PURE__ */ S.jsxs(S.Fragment, { children: [
    /* @__PURE__ */ S.jsx("div", { ref: F, className: "territorial-mapa", role: "region", "aria-label": "Mapa da camada gerada" }),
    /* @__PURE__ */ S.jsx("p", { className: "territorial-mapa-status", role: "status", children: Z })
  ] });
}
function _y({ gerada: O }) {
  const F = vl.useRef(null);
  return vl.useEffect(() => {
    F.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [O]), /* @__PURE__ */ S.jsxs(S.Fragment, { children: [
    /* @__PURE__ */ S.jsxs("section", { ref: F, id: "territorial-result", className: "mlb-bloco territorial-result", "aria-label": "Camada gerada", children: [
      /* @__PURE__ */ S.jsx("h3", { children: "Camada gerada e salva" }),
      /* @__PURE__ */ S.jsxs("p", { children: [
        /* @__PURE__ */ S.jsx("strong", { children: O.nome }),
        " · Categoria: ",
        /* @__PURE__ */ S.jsx("span", { children: O.categoria })
      ] }),
      /* @__PURE__ */ S.jsx("p", { children: "O arquivo está disponível no acervo. Você pode baixá-lo ou incluí-lo na extração." }),
      /* @__PURE__ */ S.jsxs("div", { className: "ea-config-tools", children: [
        /* @__PURE__ */ S.jsx("a", { id: "territorial-download", className: "ea-btn", href: O.download.href, download: O.download.filename, children: "Baixar camada (.zip)" }),
        /* @__PURE__ */ S.jsx("a", { id: "territorial-use", className: "ea-btn ea-btn-primary", href: O.usar, children: "Usar na extração" })
      ] })
    ] }),
    /* @__PURE__ */ S.jsxs("section", { className: "mlb-bloco territorial-mapa-bloco", "aria-label": "Mapa da camada gerada", children: [
      /* @__PURE__ */ S.jsx("h3", { children: "Mapa da camada gerada" }),
      /* @__PURE__ */ S.jsx(zy, { url: O.geojson })
    ] })
  ] });
}
function Oy(O, { category: F, apiBase: Z, onGenerated: h, onBusyChange: ll = () => {
}, configuration: W, onChange: _l = () => {
} }) {
  const ql = yy.createRoot(O);
  function L() {
    const [Al, j] = vl.useState(W || { attributes: [], format: "fgb" }), [T, R] = vl.useState(null), El = vl.useMemo(() => {
      let ml;
      async function K(Ml, xl, nt) {
        let cl;
        try {
          cl = await fetch(`${Z}/extracao-atributos/municipal/${encodeURIComponent(F.id)}/${Ml}`, {
            credentials: "same-origin",
            ...xl ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(xl) } : {},
            signal: nt
          });
        } catch (x) {
          throw x.name === "AbortError" ? x : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!cl.ok) {
          const x = await cl.json().catch(() => ({}));
          throw cl.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof x.detail == "string" ? x.detail : `Não foi possível concluir a operação (HTTP ${cl.status}).`);
        }
        return Ml === "export" || Ml.endsWith("/pacote") ? (ml = { arquivo: cl.headers.get("X-Camada-Arquivo"), id: cl.headers.get("X-Camada-Id") }, cl.blob()) : cl.json();
      }
      return {
        catalog: (Ml) => K("catalog", null, Ml),
        preview: (Ml, xl) => K("preview", Ml, xl),
        export: async (Ml, xl, nt) => {
          ll(!0);
          try {
            let cl = await K("jobs", { ...Ml, nome: Ml.nome || "" });
            const x = `jobs/${cl.id}`, Ul = async () => {
              await K(`${x}/cancelar`, {});
              let q = cl;
              for (; q.status === "executando"; )
                await new Promise((I) => setTimeout(I, 500)), q = await K(x), nt?.acompanhar(q);
              if (q.status !== "cancelado") throw new Error(q.erro || "A gravação já terminou. Consulte o acervo.");
            };
            for (; cl.status === "executando"; )
              nt?.acompanhar(cl), nt?.definirCancelamento(cl.cancelavel ? Ul : null, "A gravação final já começou. Aguarde sua conclusão."), await new Promise((q) => setTimeout(q, 500)), cl = await K(x);
            if (nt?.acompanhar(cl), cl.status === "cancelado") {
              const q = new Error("Geração cancelada. Sua seleção foi mantida.");
              throw q.name = "AbortError", q;
            }
            if (cl.status !== "concluido") throw new Error(cl.erro || "Não foi possível gerar a camada.");
            return await K(`${x}/pacote`);
          } catch (cl) {
            throw ll(!1), cl;
          }
        },
        generated: () => ml
      };
    }, []);
    async function Zl(ml) {
      try {
        const K = await h(El.generated(), ml);
        K && R(K);
      } finally {
        ll(!1);
      }
    }
    return /* @__PURE__ */ S.jsx(Ey, { value: Al, onChange: (ml) => {
      j(ml), _l(ml);
    }, client: El, download: !1, onExport: Zl, categoriaNome: F.nome, feedback: window.SLTFeedback, resultado: T && /* @__PURE__ */ S.jsx(_y, { gerada: T }) });
  }
  return ql.render(/* @__PURE__ */ S.jsx(L, {})), () => ql.unmount();
}
export {
  Oy as montarMunicipal
};
