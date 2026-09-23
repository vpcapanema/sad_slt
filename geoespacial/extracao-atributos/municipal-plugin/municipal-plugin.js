var bo = { exports: {} }, cn = {};
var km;
function ih() {
  if (km) return cn;
  km = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), tl = /* @__PURE__ */ Symbol.for("react.fragment");
  function Z(h, nl, al) {
    var Nl = null;
    if (al !== void 0 && (Nl = "" + al), nl.key !== void 0 && (Nl = "" + nl.key), "key" in nl) {
      al = {};
      for (var Zl in nl)
        Zl !== "key" && (al[Zl] = nl[Zl]);
    } else al = nl;
    return nl = al.ref, {
      $$typeof: A,
      type: h,
      key: Nl,
      ref: nl !== void 0 ? nl : null,
      props: al
    };
  }
  return cn.Fragment = tl, cn.jsx = Z, cn.jsxs = Z, cn;
}
var Pm;
function ch() {
  return Pm || (Pm = 1, bo.exports = ih()), bo.exports;
}
var z = ch(), To = { exports: {} }, X = {};
var lv;
function fh() {
  if (lv) return X;
  lv = 1;
  var A = /* @__PURE__ */ Symbol.for("react.transitional.element"), tl = /* @__PURE__ */ Symbol.for("react.portal"), Z = /* @__PURE__ */ Symbol.for("react.fragment"), h = /* @__PURE__ */ Symbol.for("react.strict_mode"), nl = /* @__PURE__ */ Symbol.for("react.profiler"), al = /* @__PURE__ */ Symbol.for("react.consumer"), Nl = /* @__PURE__ */ Symbol.for("react.context"), Zl = /* @__PURE__ */ Symbol.for("react.forward_ref"), gl = /* @__PURE__ */ Symbol.for("react.suspense"), bl = /* @__PURE__ */ Symbol.for("react.memo"), j = /* @__PURE__ */ Symbol.for("react.lazy"), S = /* @__PURE__ */ Symbol.for("react.activity"), U = /* @__PURE__ */ Symbol.for("react.view_transition"), Q = Symbol.iterator;
  function dl(s) {
    return s === null || typeof s != "object" ? null : (s = Q && s[Q] || s["@@iterator"], typeof s == "function" ? s : null);
  }
  var Al = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, fl = Object.assign, ut = {};
  function jl(s, _, R) {
    this.props = s, this.context = _, this.refs = ut, this.updater = R || Al;
  }
  jl.prototype.isReactComponent = {}, jl.prototype.setState = function(s, _) {
    if (typeof s != "object" && typeof s != "function" && s != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, s, _, "setState");
  }, jl.prototype.forceUpdate = function(s) {
    this.updater.enqueueForceUpdate(this, s, "forceUpdate");
  };
  function Lt() {
  }
  Lt.prototype = jl.prototype;
  function ot(s, _, R) {
    this.props = s, this.context = _, this.refs = ut, this.updater = R || Al;
  }
  var pt = ot.prototype = new Lt();
  pt.constructor = ot, fl(pt, jl.prototype), pt.isPureReactComponent = !0;
  var xl = Array.isArray;
  function J() {
  }
  var w = { H: null, A: null, T: null, S: null }, st = Object.prototype.hasOwnProperty;
  function tt(s, _, R) {
    var p = R.ref;
    return {
      $$typeof: A,
      type: s,
      key: _,
      ref: p !== void 0 ? p : null,
      props: R
    };
  }
  function Vl(s, _) {
    return tt(s.type, _, s.props);
  }
  function Cl(s) {
    return typeof s == "object" && s !== null && s.$$typeof === A;
  }
  function Kt(s) {
    var _ = { "=": "=0", ":": "=2" };
    return "$" + s.replace(/[=:]/g, function(R) {
      return _[R];
    });
  }
  var sa = /\/+/g;
  function Dl(s, _) {
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
  function B(s, _, R, p, V) {
    var ul = typeof s;
    (ul === "undefined" || ul === "boolean") && (s = null);
    var ll = !1;
    if (s === null) ll = !0;
    else
      switch (ul) {
        case "bigint":
        case "string":
        case "number":
          ll = !0;
          break;
        case "object":
          switch (s.$$typeof) {
            case A:
            case tl:
              ll = !0;
              break;
            case j:
              return ll = s._init, B(
                ll(s._payload),
                _,
                R,
                p,
                V
              );
          }
      }
    if (ll)
      return V = V(s), ll = p === "" ? "." + Dl(s, 0) : p, xl(V) ? (R = "", ll != null && (R = ll.replace(sa, "$&/") + "/"), B(V, _, R, "", function(Ht) {
        return Ht;
      })) : V != null && (Cl(V) && (V = Vl(
        V,
        R + (V.key == null || s && s.key === V.key ? "" : ("" + V.key).replace(
          sa,
          "$&/"
        ) + "/") + ll
      )), _.push(V)), 1;
    ll = 0;
    var C = p === "" ? "." : p + ":";
    if (xl(s))
      for (var Y = 0; Y < s.length; Y++)
        p = s[Y], ul = C + Dl(p, Y), ll += B(
          p,
          _,
          R,
          ul,
          V
        );
    else if (Y = dl(s), typeof Y == "function")
      for (s = Y.call(s), Y = 0; !(p = s.next()).done; )
        p = p.value, ul = C + Dl(p, Y++), ll += B(
          p,
          _,
          R,
          ul,
          V
        );
    else if (ul === "object") {
      if (typeof s.then == "function")
        return B(
          O(s),
          _,
          R,
          p,
          V
        );
      throw _ = String(s), Error(
        "Objects are not valid as a React child (found: " + (_ === "[object Object]" ? "object with keys {" + Object.keys(s).join(", ") + "}" : _) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return ll;
  }
  function x(s, _, R) {
    if (s == null) return s;
    var p = [], V = 0;
    return B(s, p, "", "", function(ul) {
      return _.call(R, ul, V++);
    }), p;
  }
  function il(s) {
    if (s._status === -1) {
      var _ = s._result, R = _();
      R.then(
        function(p) {
          (s._status === 0 || s._status === -1) && (s._status = 1, s._result = p, R.status === void 0 && (R.status = "fulfilled", R.value = p));
        },
        function(p) {
          (s._status === 0 || s._status === -1) && (s._status = 2, s._result = p, R.status === void 0 && (R.status = "rejected", R.reason = p));
        }
      ), s._status === -1 && (s._status = 0, s._result = R);
    }
    if (s._status === 1) return s._result.default;
    throw s._result;
  }
  var $ = typeof reportError == "function" ? reportError : function(s) {
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
  function St(s) {
    var _ = w.T, R = {};
    R.types = _ !== null ? _.types : null, w.T = R;
    try {
      var p = s(), V = w.S;
      V !== null && V(R, p), typeof p == "object" && p !== null && typeof p.then == "function" && p.then(J, $);
    } catch (ul) {
      $(ul);
    } finally {
      _ !== null && R.types !== null && (_.types = R.types), w.T = _;
    }
  }
  function et(s) {
    var _ = w.T;
    if (_ !== null) {
      var R = _.types;
      R === null ? _.types = [s] : R.indexOf(s) === -1 && R.push(s);
    } else St(et.bind(null, s));
  }
  var Jt = {
    map: x,
    forEach: function(s, _, R) {
      x(
        s,
        function() {
          _.apply(this, arguments);
        },
        R
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
  return X.Activity = S, X.Children = Jt, X.Component = jl, X.Fragment = Z, X.Profiler = nl, X.PureComponent = ot, X.StrictMode = h, X.Suspense = gl, X.ViewTransition = U, X.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = w, X.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(s) {
      return w.H.useMemoCache(s);
    }
  }, X.addTransitionType = et, X.cache = function(s) {
    return function() {
      return s.apply(null, arguments);
    };
  }, X.cacheSignal = function() {
    return null;
  }, X.cloneElement = function(s, _, R) {
    if (s == null)
      throw Error(
        "The argument must be a React element, but you passed " + s + "."
      );
    var p = fl({}, s.props), V = s.key;
    if (_ != null)
      for (ul in _.key !== void 0 && (V = "" + _.key), _)
        !st.call(_, ul) || ul === "key" || ul === "__self" || ul === "__source" || ul === "ref" && _.ref === void 0 || (p[ul] = _[ul]);
    var ul = arguments.length - 2;
    if (ul === 1) p.children = R;
    else if (1 < ul) {
      for (var ll = Array(ul), C = 0; C < ul; C++)
        ll[C] = arguments[C + 2];
      p.children = ll;
    }
    return tt(s.type, V, p);
  }, X.createContext = function(s) {
    return s = {
      $$typeof: Nl,
      _currentValue: s,
      _currentValue2: s,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, s.Provider = s, s.Consumer = {
      $$typeof: al,
      _context: s
    }, s;
  }, X.createElement = function(s, _, R) {
    var p, V = {}, ul = null;
    if (_ != null)
      for (p in _.key !== void 0 && (ul = "" + _.key), _)
        st.call(_, p) && p !== "key" && p !== "__self" && p !== "__source" && (V[p] = _[p]);
    var ll = arguments.length - 2;
    if (ll === 1) V.children = R;
    else if (1 < ll) {
      for (var C = Array(ll), Y = 0; Y < ll; Y++)
        C[Y] = arguments[Y + 2];
      V.children = C;
    }
    if (s && s.defaultProps)
      for (p in ll = s.defaultProps, ll)
        V[p] === void 0 && (V[p] = ll[p]);
    return tt(s, ul, V);
  }, X.createRef = function() {
    return { current: null };
  }, X.forwardRef = function(s) {
    return { $$typeof: Zl, render: s };
  }, X.isValidElement = Cl, X.lazy = function(s) {
    return {
      $$typeof: j,
      _payload: { _status: -1, _result: s },
      _init: il
    };
  }, X.memo = function(s, _) {
    return {
      $$typeof: bl,
      type: s,
      compare: _ === void 0 ? null : _
    };
  }, X.startTransition = St, X.unstable_useCacheRefresh = function() {
    return w.H.useCacheRefresh();
  }, X.use = function(s) {
    return w.H.use(s);
  }, X.useActionState = function(s, _, R) {
    return w.H.useActionState(s, _, R);
  }, X.useCallback = function(s, _) {
    return w.H.useCallback(s, _);
  }, X.useContext = function(s) {
    return w.H.useContext(s);
  }, X.useDebugValue = function() {
  }, X.useDeferredValue = function(s, _) {
    return w.H.useDeferredValue(s, _);
  }, X.useEffect = function(s, _) {
    return w.H.useEffect(s, _);
  }, X.useEffectEvent = function(s) {
    return w.H.useEffectEvent(s);
  }, X.useId = function() {
    return w.H.useId();
  }, X.useImperativeHandle = function(s, _, R) {
    return w.H.useImperativeHandle(s, _, R);
  }, X.useInsertionEffect = function(s, _) {
    return w.H.useInsertionEffect(s, _);
  }, X.useLayoutEffect = function(s, _) {
    return w.H.useLayoutEffect(s, _);
  }, X.useMemo = function(s, _) {
    return w.H.useMemo(s, _);
  }, X.useOptimistic = function(s, _) {
    return w.H.useOptimistic(s, _);
  }, X.useReducer = function(s, _, R) {
    return w.H.useReducer(s, _, R);
  }, X.useRef = function(s) {
    return w.H.useRef(s);
  }, X.useState = function(s) {
    return w.H.useState(s);
  }, X.useSyncExternalStore = function(s, _, R) {
    return w.H.useSyncExternalStore(
      s,
      _,
      R
    );
  }, X.useTransition = function() {
    return w.H.useTransition();
  }, X.version = "19.3.0", X;
}
var tv;
function Do() {
  return tv || (tv = 1, To.exports = fh()), To.exports;
}
var Hl = Do(), Eo = { exports: {} }, fn = {}, zo = { exports: {} }, _o = {};
var av;
function oh() {
  return av || (av = 1, (function(A) {
    function tl(O, B) {
      var x = O.length;
      O.push(B);
      l: for (; 0 < x; ) {
        var il = x - 1 >>> 1, $ = O[il];
        if (0 < nl($, B))
          O[il] = B, O[x] = $, x = il;
        else break l;
      }
    }
    function Z(O) {
      return O.length === 0 ? null : O[0];
    }
    function h(O) {
      if (O.length === 0) return null;
      var B = O[0], x = O.pop();
      if (x !== B) {
        O[0] = x;
        l: for (var il = 0, $ = O.length, St = $ >>> 1; il < St; ) {
          var et = 2 * (il + 1) - 1, Jt = O[et], s = et + 1, _ = O[s];
          if (0 > nl(Jt, x))
            s < $ && 0 > nl(_, Jt) ? (O[il] = _, O[s] = x, il = s) : (O[il] = Jt, O[et] = x, il = et);
          else if (s < $ && 0 > nl(_, x))
            O[il] = _, O[s] = x, il = s;
          else break l;
        }
      }
      return B;
    }
    function nl(O, B) {
      var x = O.sortIndex - B.sortIndex;
      return x !== 0 ? x : O.id - B.id;
    }
    if (A.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var al = performance;
      A.unstable_now = function() {
        return al.now();
      };
    } else {
      var Nl = Date, Zl = Nl.now();
      A.unstable_now = function() {
        return Nl.now() - Zl;
      };
    }
    var gl = [], bl = [], j = 1, S = null, U = 3, Q = !1, dl = !1, Al = !1, fl = !1, ut = typeof setTimeout == "function" ? setTimeout : null, jl = typeof clearTimeout == "function" ? clearTimeout : null, Lt = typeof setImmediate < "u" ? setImmediate : null;
    function ot(O) {
      for (var B = Z(bl); B !== null; ) {
        if (B.callback === null) h(bl);
        else if (B.startTime <= O)
          h(bl), B.sortIndex = B.expirationTime, tl(gl, B);
        else break;
        B = Z(bl);
      }
    }
    function pt(O) {
      if (Al = !1, ot(O), !dl)
        if (Z(gl) !== null)
          dl = !0, xl || (xl = !0, Cl());
        else {
          var B = Z(bl);
          B !== null && Dl(pt, B.startTime - O);
        }
    }
    var xl = !1, J = -1, w = 5, st = -1;
    function tt() {
      return fl ? !0 : !(A.unstable_now() - st < w);
    }
    function Vl() {
      if (fl = !1, xl) {
        var O = A.unstable_now();
        st = O;
        var B = !0;
        try {
          l: {
            dl = !1, Al && (Al = !1, jl(J), J = -1), Q = !0;
            var x = U;
            try {
              t: {
                for (ot(O), S = Z(gl); S !== null && !(S.expirationTime > O && tt()); ) {
                  var il = S.callback;
                  if (typeof il == "function") {
                    S.callback = null, U = S.priorityLevel;
                    var $ = il(
                      S.expirationTime <= O
                    );
                    if (O = A.unstable_now(), typeof $ == "function") {
                      S.callback = $, ot(O), B = !0;
                      break t;
                    }
                    S === Z(gl) && h(gl), ot(O);
                  } else h(gl);
                  S = Z(gl);
                }
                if (S !== null) B = !0;
                else {
                  var St = Z(bl);
                  St !== null && Dl(
                    pt,
                    St.startTime - O
                  ), B = !1;
                }
              }
              break l;
            } finally {
              S = null, U = x, Q = !1;
            }
            B = void 0;
          }
        } finally {
          B ? Cl() : xl = !1;
        }
      }
    }
    var Cl;
    if (typeof Lt == "function")
      Cl = function() {
        Lt(Vl);
      };
    else if (typeof MessageChannel < "u") {
      var Kt = new MessageChannel(), sa = Kt.port2;
      Kt.port1.onmessage = Vl, Cl = function() {
        sa.postMessage(null);
      };
    } else
      Cl = function() {
        ut(Vl, 0);
      };
    function Dl(O, B) {
      J = ut(function() {
        O(A.unstable_now());
      }, B);
    }
    A.unstable_IdlePriority = 5, A.unstable_ImmediatePriority = 1, A.unstable_LowPriority = 4, A.unstable_NormalPriority = 3, A.unstable_Profiling = null, A.unstable_UserBlockingPriority = 2, A.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, A.unstable_forceFrameRate = function(O) {
      0 > O || 125 < O ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : w = 0 < O ? Math.floor(1e3 / O) : 5;
    }, A.unstable_getCurrentPriorityLevel = function() {
      return U;
    }, A.unstable_next = function(O) {
      switch (U) {
        case 1:
        case 2:
        case 3:
          var B = 3;
          break;
        default:
          B = U;
      }
      var x = U;
      U = B;
      try {
        return O();
      } finally {
        U = x;
      }
    }, A.unstable_requestPaint = function() {
      fl = !0;
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
      var x = U;
      U = O;
      try {
        return B();
      } finally {
        U = x;
      }
    }, A.unstable_scheduleCallback = function(O, B, x) {
      var il = A.unstable_now();
      switch (typeof x == "object" && x !== null ? (x = x.delay, x = typeof x == "number" && 0 < x ? il + x : il) : x = il, O) {
        case 1:
          var $ = -1;
          break;
        case 2:
          $ = 250;
          break;
        case 5:
          $ = 1073741823;
          break;
        case 4:
          $ = 1e4;
          break;
        default:
          $ = 5e3;
      }
      return $ = x + $, O = {
        id: j++,
        callback: B,
        priorityLevel: O,
        startTime: x,
        expirationTime: $,
        sortIndex: -1
      }, x > il ? (O.sortIndex = x, tl(bl, O), Z(gl) === null && O === Z(bl) && (Al ? (jl(J), J = -1) : Al = !0, Dl(pt, x - il))) : (O.sortIndex = $, tl(gl, O), dl || Q || (dl = !0, xl || (xl = !0, Cl()))), O;
    }, A.unstable_shouldYield = tt, A.unstable_wrapCallback = function(O) {
      var B = U;
      return function() {
        var x = U;
        U = B;
        try {
          return O.apply(this, arguments);
        } finally {
          U = x;
        }
      };
    };
  })(_o)), _o;
}
var uv;
function sh() {
  return uv || (uv = 1, zo.exports = oh()), zo.exports;
}
var Oo = { exports: {} }, lt = {};
var ev;
function dh() {
  if (ev) return lt;
  ev = 1;
  var A = Do();
  function tl(j) {
    var S = "https://react.dev/errors/" + j;
    if (1 < arguments.length) {
      S += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var U = 2; U < arguments.length; U++)
        S += "&args[]=" + encodeURIComponent(arguments[U]);
    }
    return "Minified React error #" + j + "; visit " + S + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function Z() {
  }
  var h = {
    d: {
      f: Z,
      r: function() {
        throw Error(tl(522));
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
  }, nl = /* @__PURE__ */ Symbol.for("react.portal"), al = /* @__PURE__ */ Symbol.for("react.recoverable"), Nl = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function Zl(j, S, U) {
    var Q = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: nl,
      key: Q == null ? null : Q === Nl ? Nl : "" + Q,
      children: j,
      containerInfo: S,
      implementation: U
    };
  }
  var gl = A.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function bl(j, S) {
    if (j === "font") return "";
    if (typeof S == "string")
      return S === "use-credentials" ? S : "";
  }
  return lt.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = h, lt.browser = function(j) {
    return { $$typeof: al, _reason: j };
  }, lt.createPortal = function(j, S) {
    var U = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!S || S.nodeType !== 1 && S.nodeType !== 9 && S.nodeType !== 11)
      throw Error(tl(299));
    return Zl(j, S, null, U);
  }, lt.flushSync = function(j) {
    var S = gl.T, U = h.p;
    try {
      if (gl.T = null, h.p = 2, j) return j();
    } finally {
      gl.T = S, h.p = U, h.d.f();
    }
  }, lt.preconnect = function(j, S) {
    typeof j == "string" && (S ? (S = S.crossOrigin, S = typeof S == "string" ? S === "use-credentials" ? S : "" : void 0) : S = null, h.d.C(j, S));
  }, lt.prefetchDNS = function(j) {
    typeof j == "string" && h.d.D(j);
  }, lt.preinit = function(j, S) {
    if (typeof j == "string" && S && typeof S.as == "string") {
      var U = S.as, Q = bl(U, S.crossOrigin), dl = typeof S.integrity == "string" ? S.integrity : void 0, Al = typeof S.fetchPriority == "string" ? S.fetchPriority : void 0;
      U === "style" ? h.d.S(
        j,
        typeof S.precedence == "string" ? S.precedence : void 0,
        {
          crossOrigin: Q,
          integrity: dl,
          fetchPriority: Al
        }
      ) : U === "script" && h.d.X(j, {
        crossOrigin: Q,
        integrity: dl,
        fetchPriority: Al,
        nonce: typeof S.nonce == "string" ? S.nonce : void 0
      });
    }
  }, lt.preinitModule = function(j, S) {
    if (typeof j == "string")
      if (typeof S == "object" && S !== null) {
        if (S.as == null || S.as === "script") {
          var U = bl(
            S.as,
            S.crossOrigin
          );
          h.d.M(j, {
            crossOrigin: U,
            integrity: typeof S.integrity == "string" ? S.integrity : void 0,
            nonce: typeof S.nonce == "string" ? S.nonce : void 0,
            fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0
          });
        }
      } else S == null && h.d.M(j);
  }, lt.preload = function(j, S) {
    if (typeof j == "string" && typeof S == "object" && S !== null && typeof S.as == "string") {
      var U = S.as, Q = bl(U, S.crossOrigin);
      h.d.L(j, U, {
        crossOrigin: Q,
        integrity: typeof S.integrity == "string" ? S.integrity : void 0,
        nonce: typeof S.nonce == "string" ? S.nonce : void 0,
        type: typeof S.type == "string" ? S.type : void 0,
        fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0,
        referrerPolicy: typeof S.referrerPolicy == "string" ? S.referrerPolicy : void 0,
        imageSrcSet: typeof S.imageSrcSet == "string" ? S.imageSrcSet : void 0,
        imageSizes: typeof S.imageSizes == "string" ? S.imageSizes : void 0,
        media: typeof S.media == "string" ? S.media : void 0
      });
    }
  }, lt.preloadModule = function(j, S) {
    if (typeof j == "string")
      if (S) {
        var U = bl(S.as, S.crossOrigin);
        h.d.m(j, {
          as: typeof S.as == "string" && S.as !== "script" ? S.as : void 0,
          crossOrigin: U,
          integrity: typeof S.integrity == "string" ? S.integrity : void 0,
          nonce: typeof S.nonce == "string" ? S.nonce : void 0,
          fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0
        });
      } else h.d.m(j);
  }, lt.requestFormReset = function(j) {
    h.d.r(j);
  }, lt.unstable_batchedUpdates = function(j, S) {
    return j(S);
  }, lt.useFormState = function(j, S, U) {
    return gl.H.useFormState(j, S, U);
  }, lt.useFormStatus = function() {
    return gl.H.useHostTransitionStatus();
  }, lt.version = "19.3.0", lt;
}
var nv;
function mh() {
  if (nv) return Oo.exports;
  nv = 1;
  function A() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(A);
      } catch (tl) {
        console.error(tl);
      }
  }
  return A(), Oo.exports = dh(), Oo.exports;
}
var iv;
function vh() {
  if (iv) return fn;
  iv = 1;
  var A = sh(), tl = Do(), Z = mh();
  function h(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function nl(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function al(l) {
    for (var t = l, a = t; a && !a.alternate; )
      t = a, (t.flags & 4098) !== 0 && (l = t.return), a = t.return;
    for (; t.return; ) t = t.return;
    return t.tag === 3 ? l : null;
  }
  function Nl(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Zl(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function gl(l) {
    if (al(l) !== l)
      throw Error(h(188));
  }
  function bl(l) {
    var t = l.alternate;
    if (!t) {
      if (t = al(l), t === null) throw Error(h(188));
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
  function S(l, t, a, u, e, n) {
    for (; l !== null; ) {
      if ((l.tag === 5 || l.tag === 27 || l.tag === 6) && a(l, u, e, n) || (l.tag !== 22 || l.memoizedState === null) && (t || l.tag !== 5 && l.tag !== 27) && S(
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
  function U(l) {
    for (l = l.return; l !== null; ) {
      if (l.tag === 3 || l.tag === 5 || l.tag === 27) return l;
      l = l.return;
    }
    return null;
  }
  function Q(l) {
    var t = !1;
    for (l = l.return; l !== null && (l.tag === 4 && (t = !0), !(l.tag === 3 || l.tag === 5 || l.tag === 27)); )
      l = l.return;
    return t;
  }
  function dl(l) {
    var t = [null, null], a = U(l);
    return a === null || Al(
      t,
      l,
      a.child,
      { foundSelf: !1 }
    ), t;
  }
  function Al(l, t, a, u) {
    for (; a !== null; ) {
      if (a === t) u.foundSelf = !0;
      else if (a.tag === 5 || a.tag === 27 || a.tag === 6) {
        if (u.foundSelf) return l[1] = a, !0;
        l[0] = a;
      } else if ((a.tag !== 22 || a.memoizedState === null) && Al(
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
  function fl(l) {
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
  var ut = null, jl = null;
  function Lt(l, t, a) {
    return l === a ? !0 : l === t ? (ut = l, !0) : !1;
  }
  function ot(l, t, a) {
    return l === a ? (jl = l, !1) : l === t ? (jl !== null && (ut = l), !0) : !1;
  }
  function pt(l) {
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
  var J = Object.assign, w = /* @__PURE__ */ Symbol.for("react.element"), st = /* @__PURE__ */ Symbol.for("react.transitional.element"), tt = /* @__PURE__ */ Symbol.for("react.portal"), Vl = /* @__PURE__ */ Symbol.for("react.fragment"), Cl = /* @__PURE__ */ Symbol.for("react.strict_mode"), Kt = /* @__PURE__ */ Symbol.for("react.profiler"), sa = /* @__PURE__ */ Symbol.for("react.consumer"), Dl = /* @__PURE__ */ Symbol.for("react.context"), O = /* @__PURE__ */ Symbol.for("react.forward_ref"), B = /* @__PURE__ */ Symbol.for("react.suspense"), x = /* @__PURE__ */ Symbol.for("react.suspense_list"), il = /* @__PURE__ */ Symbol.for("react.memo"), $ = /* @__PURE__ */ Symbol.for("react.lazy"), St = /* @__PURE__ */ Symbol.for("react.activity"), et = /* @__PURE__ */ Symbol.for("react.legacy_hidden"), Jt = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), s = /* @__PURE__ */ Symbol.for("react.view_transition"), _ = /* @__PURE__ */ Symbol.for("react.recoverable"), R = Symbol.iterator;
  function p(l) {
    return l === null || typeof l != "object" ? null : (l = R && l[R] || l["@@iterator"], typeof l == "function" ? l : null);
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
      case St:
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
        case sa:
          return (l._context.displayName || "Context") + ".Consumer";
        case O:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case il:
          return t = l.displayName || null, t !== null ? t : ul(l.type) || "Memo";
        case $:
          t = l._payload, l = l._init;
          try {
            return ul(l(t));
          } catch {
          }
      }
    return null;
  }
  var ll = Array.isArray, C = tl.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Y = Z.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Ht = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, me = [], bt = -1;
  function Tt(l) {
    return { current: l };
  }
  function Xl(l) {
    0 > bt || (l.current = me[bt], me[bt] = null, bt--);
  }
  function vl(l, t) {
    bt++, me[bt] = l.current, l.current = t;
  }
  var jt = Tt(null), b = Tt(null), G = Tt(null), cl = Tt(null);
  function _l(l, t) {
    switch (vl(G, t), vl(b, l), vl(jt, null), t.nodeType) {
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
    Xl(jt), vl(jt, l);
  }
  function dt() {
    Xl(jt), Xl(b), Xl(G);
  }
  function qi(l) {
    var t = l.memoizedState;
    t !== null && (oe._currentValue = t.memoizedState, vl(cl, l)), t = jt.current;
    var a = fm(t, l.type);
    t !== a && (vl(b, l), vl(jt, a));
  }
  function on(l) {
    b.current === l && (Xl(jt), Xl(b)), cl.current === l && (Xl(cl), oe._currentValue = Ht);
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
              var E = function() {
                throw Error();
              };
              if (Object.defineProperty(E.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(E, []);
                } catch (N) {
                  var d = N;
                }
                Reflect.construct(l, [], E);
              } else {
                try {
                  E.call();
                } catch (N) {
                  d = N;
                }
                E = !1;
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
                  }), E = !0, new l();
                } finally {
                  E && (y !== void 0 ? Object.defineProperty(l.prototype, "props", y) : delete l.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (N) {
                d = N;
              }
              (E = l()) && typeof E.catch == "function" && E.catch(function() {
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
  function Co(l) {
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
  var Qi = Object.prototype.hasOwnProperty, Zi = A.unstable_scheduleCallback, Vi = A.unstable_cancelCallback, dv = A.unstable_shouldYield, mv = A.unstable_requestPaint, Et = A.unstable_now, vv = A.unstable_getCurrentPriorityLevel, Uo = A.unstable_ImmediatePriority, Ro = A.unstable_UserBlockingPriority, sn = A.unstable_NormalPriority, rv = A.unstable_LowPriority, po = A.unstable_IdlePriority, yv = A.log, hv = A.unstable_setDisableYieldValue, ve = null, zt = null;
  function Da(l) {
    if (typeof yv == "function" && hv(l), zt && typeof zt.setStrictMode == "function")
      try {
        zt.setStrictMode(ve, l);
      } catch {
      }
  }
  var _t = Math.clz32 ? Math.clz32 : bv, gv = Math.log, Sv = Math.LN2;
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
  function Ho(l, t) {
    (t & 8) !== 0 && (t |= t & 32);
    var a = l.entangledLanes;
    if (a !== 0)
      for (l = l.entanglements, a &= t; 0 < a; ) {
        var u = 31 - _t(a), e = 1 << u;
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
  function jo() {
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
      var g = 31 - _t(a), E = 1 << g;
      c[g] = 0, f[g] = -1;
      var d = v[g];
      if (d !== null)
        for (v[g] = null, g = 0; g < d.length; g++) {
          var y = d[g];
          y !== null && (y.lane &= -536870913);
        }
      a &= ~E;
    }
    u !== 0 && xo(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function xo(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - _t(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Bo(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - _t(a), e = 1 << u;
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
  var da = Math.random().toString(36).slice(2), $l = "__reactFiber$" + da, mt = "__reactProps$" + da, _u = "__reactContainer$" + da, Xo = "__reactEvents$" + da, zv = "__reactListeners$" + da, _v = "__reactHandles$" + da, Qo = "__reactResources$" + da, he = "__reactMarker$" + da, yn = "__reactLoad$" + da;
  function hn(l) {
    delete l[$l], delete l[mt], delete l[zv], delete l[_v];
  }
  function tu(l) {
    var t;
    if (t = l[$l]) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[_u] || a[$l]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Nm(l); l !== null; ) {
            if (a = l[$l]) return a;
            l = Nm(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Ou(l) {
    if (l = l[$l] || l[_u]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function ge(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(h(33));
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
  var ol = !1;
  function wo() {
    var l = ol;
    return ol = !1, l;
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
  function Ot(l) {
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
  function xt(l) {
    return l.replace(
      Dv,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function $i(l, t, a, u, e, n, i, c) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + Ot(t)) : l.value !== "" + Ot(t) && (l.value = "" + Ot(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? i === "number" && l.value == t ? Fi(l, Ot(l.value)) : Fi(l, Ot(t)) : a != null ? Fi(l, Ot(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), c != null && typeof c != "function" && typeof c != "symbol" && typeof c != "boolean" ? l.name = "" + Ot(c) : l.removeAttribute("name");
  }
  function Wo(l, t, a, u, e, n, i, c) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        wi(l);
        return;
      }
      a = a != null ? "" + Ot(a) : "", t = t != null ? "" + Ot(t) : a, c || t === l.value || (l.value = t), l.defaultValue = t;
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
      for (a = "" + Ot(a), t = null, e = 0; e < l.length; e++) {
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
    if (t != null && (t = "" + Ot(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + Ot(a) : "";
  }
  function ko(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(h(92));
        if (ll(u)) {
          if (1 < u.length) throw Error(h(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = Ot(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), wi(l);
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
      throw Error(h(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "", ol = !0);
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && (Po(l, e, u), ol = !0);
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
  var Cv = /* @__PURE__ */ new Map([
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
  function Pt() {
  }
  var Ii = null;
  function ki(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var Cu = null, Uu = null;
  function ts(l) {
    var t = Ou(l);
    if (t && (l = t.stateNode)) {
      var a = l[mt] || null;
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
              'input[name="' + xt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[mt] || null;
                if (!e) throw Error(h(90));
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
      if (Pi = !1, (Cu !== null || Uu !== null) && (bi(), Cu && (t = Cu, l = Uu, Uu = Cu = null, ts(t), l)))
        for (t = 0; t < l.length; t++) ts(l[t]);
    }
  }
  function Se(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[mt] || null;
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
  function nt(l) {
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
  var Ca = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, _n = nt(Ca), Te = J({}, Ca, { view: 0, detail: 0 }), Rv = nt(Te), ac, uc, Ee, On = J({}, Te, {
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
  }), ns = nt(On), pv = J({}, On, { dataTransfer: 0 }), Hv = nt(pv), jv = J({}, Te, { relatedTarget: 0 }), ec = nt(jv), xv = J({}, Ca, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), Bv = nt(xv), qv = J({}, Ca, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), Yv = nt(qv), Gv = J({}, Ca, { data: 0 }), is = nt(Gv), Xv = {
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
  }), Kv = nt(Lv), Jv = J({}, On, {
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
  }), cs = nt(Jv), wv = J({}, Ca, { submitter: 0 }), $v = nt(wv), Fv = J({}, Te, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: nc
  }), Wv = nt(Fv), Iv = J({}, Ca, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), kv = nt(Iv), Pv = J({}, On, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), lr = nt(Pv), tr = J({}, Ca, {
    newState: 0,
    oldState: 0,
    source: 0
  }), ar = nt(tr), ur = [9, 13, 27, 32], ic = va && "CompositionEvent" in window, ze = null;
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
    Cu ? Uu ? Uu.push(u) : Uu = [u] : Cu = u, t = Ni(t, "onChange"), 0 < t.length && (a = new _n(
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
  var Nt = typeof Object.is == "function" ? Object.is : vr;
  function Ne(l, t) {
    if (Nt(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Qi.call(t, e) || !Nt(l[e], t[e]))
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
  var Hu = {
    animationend: uu("Animation", "AnimationEnd"),
    animationiteration: uu("Animation", "AnimationIteration"),
    animationstart: uu("Animation", "AnimationStart"),
    transitionrun: uu("Transition", "TransitionRun"),
    transitionstart: uu("Transition", "TransitionStart"),
    transitioncancel: uu("Transition", "TransitionCancel"),
    transitionend: uu("Transition", "TransitionEnd")
  }, vc = {}, Ns = {};
  va && (Ns = document.createElement("div").style, "AnimationEvent" in window || (delete Hu.animationend.animation, delete Hu.animationiteration.animation, delete Hu.animationstart.animation), "TransitionEvent" in window || delete Hu.transitionend.transition);
  function eu(l) {
    if (vc[l]) return vc[l];
    if (!Hu[l]) return l;
    var t = Hu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in Ns)
        return vc[l] = t[a];
    return l;
  }
  var As = eu("animationend"), Ds = eu("animationiteration"), Ms = eu("animationstart"), yr = eu("transitionrun"), hr = eu("transitionstart"), gr = eu("transitioncancel"), Cs = eu("transitionend"), Us = /* @__PURE__ */ new Map(), rc = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  rc.push("scrollEnd");
  function wt(l, t) {
    Us.set(l, t), au(t, [l]);
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
  }, Bt = [], ju = 0, yc = 0;
  function Dn() {
    for (var l = ju, t = yc = ju = 0; t < l; ) {
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
      n !== 0 && ps(a, e, n);
    }
  }
  function Mn(l, t, a, u) {
    Bt[ju++] = l, Bt[ju++] = t, Bt[ju++] = a, Bt[ju++] = u, yc |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function hc(l, t, a, u) {
    return Mn(l, t, a, u), Cn(l);
  }
  function nu(l, t) {
    return Mn(l, null, null, t), Cn(l);
  }
  function ps(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - _t(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Cn(l) {
    if (50 < $e)
      throw $e = 0, Si = null, Error(h(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var xu = {};
  function br(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function vt(l, t, a, u) {
    return new br(l, t, a, u);
  }
  function gc(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function ha(l, t) {
    var a = l.alternate;
    return a === null ? (a = vt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 1206910976, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function Hs(l, t) {
    l.flags &= 1206910978;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Un(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof u == "function") gc(u) && (i = 1);
    else if (typeof u == "string")
      i = wy(
        l,
        a,
        jt.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (u) {
        case St:
          return l = vt(31, a, t, e), l.elementType = St, l.lanes = n, l;
        case Vl:
          return iu(a.children, e, n, t);
        case Cl:
          i = 8, e |= 24;
          break;
        case Kt:
          return l = vt(12, a, t, e | 2), l.elementType = Kt, l.lanes = n, l;
        case B:
          return l = vt(13, a, t, e), l.elementType = B, l.lanes = n, l;
        case x:
          return l = vt(19, a, t, e), l.elementType = x, l.lanes = n, l;
        case et:
        case s:
          return l = e | 32, l = vt(30, a, t, l), l.elementType = s, l.lanes = n, l.stateNode = {
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
              case sa:
                i = 9;
                break l;
              case O:
                i = 11;
                break l;
              case il:
                i = 14;
                break l;
              case $:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            h(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = vt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function iu(l, t, a, u) {
    return l = vt(7, l, u, t), l.lanes = a, l;
  }
  function Sc(l, t, a) {
    return l = vt(6, l, null, t), l.lanes = a, l;
  }
  function js(l) {
    var t = vt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function bc(l, t, a) {
    return t = vt(
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
  function qt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = xs.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Co(t)
      }, xs.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Co(t)
    };
  }
  var Bu = [], qu = 0, Rn = null, De = 0, Yt = [], Gt = 0, Ua = null, la = 1, ta = "";
  function ga(l, t) {
    Bu[qu++] = De, Bu[qu++] = Rn, Rn = l, De = t;
  }
  function Bs(l, t, a) {
    Yt[Gt++] = la, Yt[Gt++] = ta, Yt[Gt++] = Ua, Ua = l;
    var u = la;
    l = ta;
    var e = 32 - _t(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - _t(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, la = 1 << 32 - _t(t) + e | a << e | u, ta = n + l;
    } else
      la = 1 << n | a << e | u, ta = l;
  }
  function pn(l) {
    l.return !== null && (ga(l, 1), Bs(l, 1, 0));
  }
  function Tc(l) {
    for (; l === Rn; )
      Rn = Bu[--qu], Bu[qu] = null, De = Bu[--qu], Bu[qu] = null;
    for (; l === Ua; )
      Ua = Yt[--Gt], Yt[Gt] = null, ta = Yt[--Gt], Yt[Gt] = null, la = Yt[--Gt], Yt[Gt] = null;
  }
  function qs(l, t) {
    Yt[Gt++] = la, Yt[Gt++] = ta, Yt[Gt++] = Ua, la = t.id, ta = t.overflow, Ua = l;
  }
  var Kl = null, El = null, F = !1, Ra = null, Xt = !1, Ec = Error(h(519));
  function pa(l) {
    var t = Error(
      h(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Me(qt(t, l)), Ec;
  }
  function Ys(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[$l] = l, t[mt] = u, a) {
      case "dialog":
        I("cancel", t), I("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        I("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < We.length; a++)
          I(We[a], t);
        break;
      case "source":
        I("error", t);
        break;
      case "img":
      case "image":
      case "link":
        I("error", t), I("load", t);
        break;
      case "details":
        I("toggle", t);
        break;
      case "input":
        I("invalid", t), Wo(
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
        I("invalid", t);
        break;
      case "textarea":
        I("invalid", t), ko(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || nm(t.textContent, a) ? (u.popover != null && (I("beforetoggle", t), I("toggle", t)), u.onScroll != null && I("scroll", t), u.onScrollEnd != null && I("scrollend", t), u.onClick != null && (t.onclick = Pt), t = !0) : t = !1, t || pa(l, !0);
  }
  function Hn(l) {
    for (Kl = l.return; Kl; )
      switch (Kl.tag) {
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
          Kl = Kl.return;
      }
  }
  function Yu(l) {
    if (l !== Kl) return !1;
    if (!F) return Hn(l), F = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || kf(l.type, l.memoizedProps)), a = !a), a && El && pa(l), Hn(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      El = Om(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(317));
      El = Om(l);
    } else
      t === 27 ? (t = El, $a(l.type) ? (l = co, co = null, El = l) : El = t) : El = Kl ? Zt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function cu() {
    El = Kl = null, F = !1;
  }
  function zc() {
    var l = Ra;
    return l !== null && (ht === null ? ht = l : ht.push.apply(
      ht,
      l
    ), Ra = null), l;
  }
  function Me(l) {
    Ra === null ? Ra = [l] : Ra.push(l);
  }
  var _c = Tt(null), fu = null, Sa = null;
  function Ha(l, t, a) {
    vl(_c, t._currentValue), t._currentValue = a;
  }
  function ba(l) {
    l._currentValue = _c.current, Xl(_c);
  }
  function jn(l, t, a) {
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
              n.lanes |= a, c = n.alternate, c !== null && (c.lanes |= a), jn(
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
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), jn(i, a, l), i = null;
      } else
        e.tag === 13 && e.memoizedState !== null && e.memoizedState.dehydrated === null ? (e.lanes |= a, i = e.alternate, i !== null && (i.lanes |= a), jn(
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
        if (i === null) throw Error(h(387));
        if (i = i.memoizedProps, i !== null) {
          var c = e.type;
          Nt(e.pendingProps.value, i.value) || (l !== null ? l.push(c) : l = [c]);
        }
      } else if (e === cl.current) {
        if (i = e.alternate, i === null) throw Error(h(387));
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
      if (!Nt(
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
  function Fl(l) {
    return Gs(fu, l);
  }
  function Bn(l, t) {
    return fu === null && su(l), Gs(l, t);
  }
  function Gs(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Sa === null) {
      if (l === null) throw Error(h(308));
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
    $$typeof: Dl,
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
  function Ce(l) {
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
  var Ue = null;
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
    if (--Ac === 0 && (Ue = null, Re !== null)) {
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
  var Zs = C.S;
  C.S = function(l, t) {
    if (jd = Et(), typeof t == "object" && t !== null && typeof t.then == "function" && Or(l, t), Ue !== null)
      for (var a = ue; a !== null; )
        Xs(a, Ue), a = a.next;
    if (a = l.types, a !== null) {
      for (var u = ue; u !== null; )
        Xs(u, a), u = u.next;
      if (du !== 0) {
        u = Ue, u === null && (u = Ue = []);
        for (var e = 0; e < a.length; e++) {
          var n = a[e];
          u.indexOf(n) === -1 && u.push(n);
        }
      }
    }
    Zs !== null && Zs(l, t);
  };
  var mu = Tt(null);
  function Dc() {
    var l = mu.current;
    return l !== null ? l : Tl.pooledCache;
  }
  function qn(l, t) {
    t === null ? vl(mu, mu.current) : vl(mu, t.pool);
  }
  function Vs() {
    var l = Dc();
    return l === null ? null : { parent: Bl._currentValue, pool: l };
  }
  var Xu = Error(h(460)), Mc = Error(h(474)), Yn = Error(h(542)), Gn = { then: function() {
  } };
  function Ls(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Ks(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Pt, Pt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, ws(l), l === void 0 && !("reason" in t) ? Error(h(600)) : l;
      default:
        if (typeof t.status == "string") t.then(Pt, Pt);
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
    if (ru === null) throw Error(h(459));
    var l = ru;
    return ru = null, l;
  }
  function ws(l) {
    if (l === Xu || l === Yn)
      throw Error(h(483));
  }
  var Qu = null, pe = 0;
  function Xn(l) {
    var t = pe;
    return pe += 1, Qu === null && (Qu = []), Ks(Qu, l, t);
  }
  function ja(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function Qn(l, t) {
    throw t.$$typeof === w ? Error(h(525)) : (l = Object.prototype.toString.call(t), Error(
      h(
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
    function c(m, o, r, T) {
      return o === null || o.tag !== 6 ? (o = Sc(r, m.mode, T), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function f(m, o, r, T) {
      var D = r.type;
      return D === Vl ? (m = g(
        m,
        o,
        r.props.children,
        T,
        r.key
      ), ja(m, r), m) : o !== null && (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === $ && vu(D) === o.type) ? (o = e(o, r.props), ja(o, r), o.return = m, o) : (o = Un(
        r.type,
        r.key,
        r.props,
        null,
        m.mode,
        T
      ), ja(o, r), o.return = m, o);
    }
    function v(m, o, r, T) {
      return o === null || o.tag !== 4 || o.stateNode.containerInfo !== r.containerInfo || o.stateNode.implementation !== r.implementation ? (o = bc(r, m.mode, T), o.return = m, o) : (o = e(o, r.children || []), o.return = m, o);
    }
    function g(m, o, r, T, D) {
      return o === null || o.tag !== 7 ? (o = iu(
        r,
        m.mode,
        T,
        D
      ), o.return = m, o) : (o = e(o, r), o.return = m, o);
    }
    function E(m, o, r) {
      if (typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint")
        return o = Sc(
          "" + o,
          m.mode,
          r
        ), o.return = m, o;
      if (typeof o == "object" && o !== null) {
        switch (o.$$typeof) {
          case st:
            return r = Un(
              o.type,
              o.key,
              o.props,
              null,
              m.mode,
              r
            ), ja(r, o), r.return = m, r;
          case tt:
            return o = bc(
              o,
              m.mode,
              r
            ), o.return = m, o;
          case $:
            return o = vu(o), E(m, o, r);
        }
        if (ll(o) || p(o))
          return o = iu(
            o,
            m.mode,
            r,
            null
          ), o.return = m, o;
        if (typeof o.then == "function")
          return E(m, Xn(o), r);
        if (o.$$typeof === Dl)
          return E(
            m,
            Bn(m, o),
            r
          );
        Qn(m, o);
      }
      return null;
    }
    function d(m, o, r, T) {
      var D = o !== null ? o.key : null;
      if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint")
        return D !== null ? null : c(m, o, "" + r, T);
      if (typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case st:
            return r.key === D ? f(m, o, r, T) : null;
          case tt:
            return r.key === D ? v(m, o, r, T) : null;
          case $:
            return r = vu(r), d(m, o, r, T);
        }
        if (ll(r) || p(r))
          return D !== null ? null : g(m, o, r, T, null);
        if (typeof r.then == "function")
          return d(
            m,
            o,
            Xn(r),
            T
          );
        if (r.$$typeof === Dl)
          return d(
            m,
            o,
            Bn(m, r),
            T
          );
        Qn(m, r);
      }
      return null;
    }
    function y(m, o, r, T, D) {
      if (typeof T == "string" && T !== "" || typeof T == "number" || typeof T == "bigint")
        return m = m.get(r) || null, c(o, m, "" + T, D);
      if (typeof T == "object" && T !== null) {
        switch (T.$$typeof) {
          case st:
            return m = m.get(
              T.key === null ? r : T.key
            ) || null, f(o, m, T, D);
          case tt:
            return m = m.get(
              T.key === null ? r : T.key
            ) || null, v(o, m, T, D);
          case $:
            return T = vu(T), y(
              m,
              o,
              r,
              T,
              D
            );
        }
        if (ll(T) || p(T))
          return m = m.get(r) || null, g(o, m, T, D, null);
        if (typeof T.then == "function")
          return y(
            m,
            o,
            r,
            Xn(T),
            D
          );
        if (T.$$typeof === Dl)
          return y(
            m,
            o,
            r,
            Bn(o, T),
            D
          );
        Qn(o, T);
      }
      return null;
    }
    function N(m, o, r, T) {
      for (var D = null, P = null, H = o, q = o = 0, Gl = null; H !== null && q < r.length; q++) {
        H.index > q ? (Gl = H, H = null) : Gl = H.sibling;
        var el = d(
          m,
          H,
          r[q],
          T
        );
        if (el === null) {
          H === null && (H = Gl);
          break;
        }
        l && H && el.alternate === null && t(m, H), o = n(el, o, q), P === null ? D = el : P.sibling = el, P = el, H = Gl;
      }
      if (q === r.length)
        return a(m, H), F && ga(m, q), D;
      if (H === null) {
        for (; q < r.length; q++)
          H = E(m, r[q], T), H !== null && (o = n(
            H,
            o,
            q
          ), P === null ? D = H : P.sibling = H, P = H);
        return F && ga(m, q), D;
      }
      for (H = u(H); q < r.length; q++)
        Gl = y(
          H,
          m,
          q,
          r[q],
          T
        ), Gl !== null && (l && (el = Gl.alternate, el !== null && H.delete(el.key === null ? q : el.key)), o = n(
          Gl,
          o,
          q
        ), P === null ? D = Gl : P.sibling = Gl, P = Gl);
      return l && H.forEach(function(Pa) {
        return t(m, Pa);
      }), F && ga(m, q), D;
    }
    function M(m, o, r, T) {
      if (r == null) throw Error(h(151));
      for (var D = null, P = null, H = o, q = o = 0, Gl = null, el = r.next(); H !== null && !el.done; q++, el = r.next()) {
        H.index > q ? (Gl = H, H = null) : Gl = H.sibling;
        var Pa = d(m, H, el.value, T);
        if (Pa === null) {
          H === null && (H = Gl);
          break;
        }
        l && H && Pa.alternate === null && t(m, H), o = n(Pa, o, q), P === null ? D = Pa : P.sibling = Pa, P = Pa, H = Gl;
      }
      if (el.done)
        return a(m, H), F && ga(m, q), D;
      if (H === null) {
        for (; !el.done; q++, el = r.next())
          el = E(m, el.value, T), el !== null && (o = n(el, o, q), P === null ? D = el : P.sibling = el, P = el);
        return F && ga(m, q), D;
      }
      for (H = u(H); !el.done; q++, el = r.next())
        el = y(H, m, q, el.value, T), el !== null && (l && (Gl = el.alternate, Gl !== null && H.delete(
          Gl.key === null ? q : Gl.key
        )), o = n(el, o, q), P === null ? D = el : P.sibling = el, P = el);
      return l && H.forEach(function(nh) {
        return t(m, nh);
      }), F && ga(m, q), D;
    }
    function K(m, o, r, T) {
      if (typeof r == "object" && r !== null && r.type === Vl && r.key === null && r.props.ref === void 0 && (r = r.props.children), typeof r == "object" && r !== null) {
        switch (r.$$typeof) {
          case st:
            l: {
              for (var D = r.key; o !== null; ) {
                if (o.key === D) {
                  if (D = r.type, D === Vl) {
                    if (o.tag === 7) {
                      a(
                        m,
                        o.sibling
                      ), T = e(
                        o,
                        r.props.children
                      ), ja(T, r), T.return = m, m = T;
                      break l;
                    }
                  } else if (o.elementType === D || typeof D == "object" && D !== null && D.$$typeof === $ && vu(D) === o.type) {
                    a(
                      m,
                      o.sibling
                    ), T = e(o, r.props), ja(T, r), T.return = m, m = T;
                    break l;
                  }
                  a(m, o);
                  break;
                } else t(m, o);
                o = o.sibling;
              }
              r.type === Vl ? (T = iu(
                r.props.children,
                m.mode,
                T,
                r.key
              ), ja(T, r), T.return = m, m = T) : (T = Un(
                r.type,
                r.key,
                r.props,
                null,
                m.mode,
                T
              ), ja(T, r), T.return = m, m = T);
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
                    ), T = e(o, r.children || []), T.return = m, m = T;
                    break l;
                  } else {
                    a(m, o);
                    break;
                  }
                else t(m, o);
                o = o.sibling;
              }
              T = bc(r, m.mode, T), T.return = m, m = T;
            }
            return i(m);
          case $:
            return r = vu(r), K(
              m,
              o,
              r,
              T
            );
        }
        if (ll(r))
          return N(
            m,
            o,
            r,
            T
          );
        if (p(r)) {
          if (D = p(r), typeof D != "function") throw Error(h(150));
          return r = D.call(r), M(
            m,
            o,
            r,
            T
          );
        }
        if (typeof r.then == "function")
          return K(
            m,
            o,
            Xn(r),
            T
          );
        if (r.$$typeof === Dl)
          return K(
            m,
            o,
            Bn(m, r),
            T
          );
        Qn(m, r);
      }
      return typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint" ? (r = "" + r, o !== null && o.tag === 6 ? (a(m, o.sibling), T = e(o, r), T.return = m, m = T) : (a(m, o), T = Sc(r, m.mode, T), T.return = m, m = T), i(m)) : a(m, o);
    }
    return function(m, o, r, T) {
      try {
        pe = 0;
        var D = K(
          m,
          o,
          r,
          T
        );
        return Qu = null, D;
      } catch (H) {
        if (H === Xu || H === Yn) throw H;
        var P = vt(29, H, null, m.mode);
        return P.lanes = T, P.return = m, P;
      }
    };
  }
  var yu = $s(!0), Fs = $s(!1), xa = !1;
  function Cc(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Uc(l, t) {
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
    if (u = u.shared, (sl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Cn(l), ps(l, null, a), t;
    }
    return Mn(l, u, t, a), Cn(l);
  }
  function He(l, t, a) {
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
  function je() {
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
      var E = e.baseState;
      i = 0, g = v = f = null, c = n;
      do {
        var d = c.lane & -536870913, y = d !== c.lane;
        if (y ? (k & d) === d : (u & d) === d) {
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
                  E = N.call(K, E, d);
                  break l;
                }
                E = N;
                break l;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = M.payload, d = typeof N == "function" ? N.call(K, E, d) : N, d == null) break l;
                E = J({}, E, d);
                break l;
              case 2:
                xa = !0;
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
          }, g === null ? (v = g = y, f = E) : g = g.next = y, i |= d;
        if (c = c.next, c === null) {
          if (c = e.shared.pending, c === null)
            break;
          y = c, c = y.next, y.next = null, e.lastBaseUpdate = y, e.shared.pending = null;
        }
      } while (!0);
      g === null && (f = E), e.baseState = f, e.firstBaseUpdate = v, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), La |= i, l.lanes = i, l.memoizedState = E;
    }
  }
  function Ws(l, t) {
    if (typeof l != "function")
      throw Error(h(191, l));
    l.call(t);
  }
  function Is(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Ws(a[l], t);
  }
  var Ya = Tt(null), Zn = Tt(0);
  function ks(l, t) {
    l = Oa, vl(Zn, l), vl(Ya, t), Oa = l | t.baseLanes;
  }
  function Hc() {
    vl(Zn, Oa), vl(Ya, Ya.current);
  }
  function jc() {
    Oa = Zn.current, Xl(Ya), Xl(Zn);
  }
  var Wl = Tt(null), at = null;
  function Ga(l) {
    var t = l.alternate;
    vl(Il, Il.current & 1), vl(Wl, l), at === null && (t === null || Ya.current !== null || t.memoizedState !== null) && (at = l);
  }
  function xc(l) {
    vl(Il, Il.current), vl(Wl, l), at === null && (at = l);
  }
  function Ps(l) {
    l.tag === 22 ? (vl(Il, Il.current), vl(Wl, l), at === null && (at = l)) : Xa();
  }
  function Xa() {
    vl(Il, Il.current), vl(Wl, Wl.current);
  }
  function At(l) {
    Xl(Wl), at === l && (at = null), Xl(Il);
  }
  var Il = Tt(0);
  function Be(l, t) {
    vl(Wl, Wl.current), vl(Il, t);
  }
  function Bc(l) {
    Xl(Il), Xl(Wl), at === l && (at = null);
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
  function Ul() {
    throw Error(h(321));
  }
  function qc(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!Nt(l[a], t[a])) return !1;
    return !0;
  }
  function Yc(l, t, a, u, e, n) {
    return Ta = n, L = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, C.H = l === null || l.memoizedState === null ? B0 : q0, hu = !1, n = a(u, e), hu = !1, Zu && (n = t0(
      t,
      a,
      u,
      e
    )), l0(l), n;
  }
  function l0(l) {
    C.H = kn;
    var t = Sl !== null && Sl.next !== null;
    if (Ta = 0, ql = Sl = L = null, Ln = !1, qe = 0, Vu = null, t) throw Error(h(300));
    l === null || Yl || (l = l.dependencies, l !== null && xn(l) && (Yl = !0));
  }
  function t0(l, t, a, u) {
    L = l;
    var e = 0;
    do {
      if (Zu && (Vu = null), qe = 0, Zu = !1, 25 <= e) throw Error(h(301));
      if (e += 1, ql = Sl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      C.H = jr, n = t(a, u);
    } while (Zu);
    return n;
  }
  function Dr() {
    var l = C.H, t = l.useState()[0];
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
  function it() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return ql === null ? L.memoizedState = ql = l : ql = ql.next = l, ql;
  }
  function pl() {
    if (Sl === null) {
      var l = L.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = Sl.next;
    var t = ql === null ? L.memoizedState : ql.next;
    if (t !== null)
      ql = t, Sl = l;
    else {
      if (l === null)
        throw L.alternate === null ? Error(h(467)) : Error(h(310));
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
    return qe += 1, Vu === null && (Vu = []), l = Ks(Vu, l, t), t = L, (ql === null ? t.memoizedState : ql.next) === null && (t = t.alternate, C.H = t === null || t.memoizedState === null ? B0 : q0), l;
  }
  function wn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Ye(l);
      if (l.$$typeof === _) return;
      if (l.$$typeof === Dl) return Fl(l);
    }
    throw Error(h(438, String(l)));
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
    var t = pl();
    return Vc(t, Sl, l);
  }
  function Vc(l, t, a) {
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
      var c = i = null, f = null, v = t, g = !1;
      do {
        var E = v.lane & -536870913;
        if (E !== v.lane ? (k & E) === E : (Ta & E) === E) {
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
            }), E === du && (g = !0);
          else if ((Ta & d) === d) {
            v = v.next, d === du && (g = !0);
            continue;
          } else
            E = {
              lane: 0,
              revertLane: v.revertLane,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }, f === null ? (c = f = E, i = n) : f = f.next = E, L.lanes |= d, La |= d;
          E = v.action, hu && a(n, E), n = v.hasEagerState ? v.eagerState : a(n, E);
        } else
          d = {
            lane: E,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, f === null ? (c = f = d, i = n) : f = f.next = d, L.lanes |= E, La |= E;
        v = v.next;
      } while (v !== null && v !== t);
      if (f === null ? i = n : f.next = c, !Nt(n, l.memoizedState) && (Yl = !0, g && (a = Gu, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = f, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function Lc(l) {
    var t = pl(), a = t.queue;
    if (a === null) throw Error(h(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      Nt(n, t.memoizedState) || (Yl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function a0(l, t, a) {
    var u = L, e = pl(), n = F;
    if (n) {
      if (a === void 0) throw Error(h(407));
      a = a();
    } else a = t();
    var i = !Nt(
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
      if (u.flags |= 2048, Tl === null) throw Error(h(349));
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
      return !Nt(l, a);
    } catch {
      return !0;
    }
  }
  function c0(l) {
    var t = nu(l, 2);
    t !== null && gt(t, l, 2);
  }
  function Kc(l) {
    var t = it();
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
    if (In(l)) throw Error(h(485));
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
      C.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, o0(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function o0(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = C.T, i = {};
      i.types = n !== null ? n.types : null, C.T = i;
      try {
        var c = a(e, u), f = C.S;
        f !== null && f(i, c), s0(l, t, c);
      } catch (v) {
        Jc(l, t, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), C.T = n;
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
    if (F) {
      var a = Tl.formState;
      if (a !== null) {
        l: {
          var u = L;
          if (F) {
            if (El) {
              t: {
                for (var e = El, n = Xt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Zt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                El = Zt(
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
    return a = it(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: v0,
      lastRenderedState: t
    }, a.queue = u, a = H0.bind(
      null,
      L,
      u
    ), u.dispatch = a, u = Kc(!1), n = kc.bind(
      null,
      L,
      !1,
      u.queue
    ), u = it(), e = {
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
    var t = pl();
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
    t = pl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (L.flags |= 2048, Lu(
      9,
      { destroy: void 0 },
      Cr.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Cr(l, t) {
    l.action = t;
  }
  function g0(l) {
    var t = pl(), a = Sl;
    if (a !== null)
      return h0(t, a, l);
    pl(), t = t.memoizedState, a = pl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function Lu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = L.updateQueue, t === null && (t = Jn(), L.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function S0() {
    return pl().memoizedState;
  }
  function Fn(l, t, a, u) {
    var e = it();
    L.flags |= l, e.memoizedState = Lu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function Wn(l, t, a, u) {
    var e = pl();
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
  function Ur(l) {
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
    var t = pl().memoizedState;
    return Ur({ ref: t, nextImpl: l }), function() {
      if ((sl & 2) !== 0) throw Error(h(440));
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
    var a = pl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && qc(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function A0(l, t) {
    var a = pl();
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
    return a === void 0 || (Ta & 1073741824) !== 0 && (k & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = Bd(), L.lanes |= l, La |= l, a);
  }
  function D0(l, t, a, u) {
    return Nt(a, t) ? a : Ya.current !== null ? (l = Fc(l, a, u), Nt(l, t) || (Yl = !0), l) : (Ta & 106) === 0 || (Ta & 1073741824) !== 0 && (k & 261930) === 0 ? (Yl = !0, l.memoizedState = a) : (l = Bd(), L.lanes |= l, La |= l, t);
  }
  function M0(l, t, a, u, e) {
    var n = Y.p;
    Y.p = n !== 0 && 8 > n ? n : 8;
    var i = C.T, c = {};
    c.types = i !== null ? i.types : null, C.T = c, kc(l, !1, t, a);
    try {
      var f = e(), v = C.S;
      if (v !== null && v(c, f), f !== null && typeof f == "object" && typeof f.then == "function") {
        var g = Nr(
          f,
          u
        );
        Ge(
          l,
          t,
          g,
          Ut(l)
        );
      } else
        Ge(
          l,
          t,
          u,
          Ut(l)
        );
    } catch (E) {
      Ge(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: E },
        Ut()
      );
    } finally {
      Y.p = n, i !== null && c.types !== null && (i.types = c.types), C.T = i;
    }
  }
  function Rr() {
  }
  function Wc(l, t, a, u) {
    if (l.tag !== 5) throw Error(h(476));
    var e = C0(l).queue;
    M0(
      l,
      e,
      t,
      Ht,
      a === null ? Rr : function() {
        return U0(l), a(u);
      }
    );
  }
  function C0(l) {
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
  function U0(l) {
    var t = C0(l);
    t.next === null && (t = l.alternate.memoizedState), Ge(
      l,
      t.next.queue,
      {},
      Ut()
    );
  }
  function Ic() {
    return Fl(oe);
  }
  function R0() {
    return pl().memoizedState;
  }
  function p0() {
    return pl().memoizedState;
  }
  function pr(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Ut();
          l = Ba(a);
          var u = qa(t, l, a);
          u !== null && (gt(u, t, a), He(u, t, a)), t = { cache: Nc() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Hr(l, t, a) {
    var u = Ut();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, In(l) ? j0(t, a) : (a = hc(l, t, a, u), a !== null && (gt(a, l, u), x0(a, t, u)));
  }
  function H0(l, t, a) {
    var u = Ut();
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
    if (In(l)) j0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, c = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = c, Nt(c, i))
            return Mn(l, t, e, 0), Tl === null && Dn(), !1;
        } catch {
        }
      if (a = hc(l, t, e, u), a !== null)
        return gt(a, l, u), x0(a, t, u), !0;
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
      if (t) throw Error(h(479));
    } else
      t = hc(
        l,
        a,
        u,
        2
      ), t !== null && gt(t, l, 2);
  }
  function In(l) {
    var t = l.alternate;
    return l === L || t !== null && t === L;
  }
  function j0(l, t) {
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
    readContext: Fl,
    use: wn,
    useCallback: Ul,
    useContext: Ul,
    useEffect: Ul,
    useImperativeHandle: Ul,
    useLayoutEffect: Ul,
    useInsertionEffect: Ul,
    useMemo: Ul,
    useReducer: Ul,
    useRef: Ul,
    useState: Ul,
    useDebugValue: Ul,
    useDeferredValue: Ul,
    useTransition: Ul,
    useSyncExternalStore: Ul,
    useId: Ul,
    useHostTransitionStatus: Ul,
    useFormState: Ul,
    useActionState: Ul,
    useOptimistic: Ul,
    useMemoCache: Ul,
    useCacheRefresh: Ul,
    useEffectEvent: Ul
  }, B0 = {
    readContext: Fl,
    use: wn,
    useCallback: function(l, t) {
      return it().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Fl,
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
      var a = it();
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
      var u = it();
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
      }, u.queue = l, l = l.dispatch = Hr.bind(
        null,
        L,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = it();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = Kc(l);
      var t = l.queue, a = H0.bind(null, L, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: $c,
    useDeferredValue: function(l, t) {
      var a = it();
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
      ), it().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = L, e = it();
      if (F) {
        if (a === void 0)
          throw Error(h(407));
        a = a();
      } else {
        if (a = t(), Tl === null)
          throw Error(h(349));
        (k & 127) !== 0 || u0(u, t, a);
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
      var l = it(), t = Tl.identifierPrefix;
      if (F) {
        var a = ta, u = la;
        a = (u & ~(1 << 32 - _t(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Kn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Ar++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: Ic,
    useFormState: r0,
    useActionState: r0,
    useOptimistic: function(l) {
      var t = it();
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
      return it().memoizedState = pr.bind(
        null,
        L
      );
    },
    useEffectEvent: function(l) {
      var t = it(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((sl & 2) !== 0)
          throw Error(h(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, q0 = {
    readContext: Fl,
    use: wn,
    useCallback: N0,
    useContext: Fl,
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
      var a = pl();
      return D0(
        a,
        Sl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = $n(Ea)[0], t = pl().memoizedState;
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
      var a = pl();
      return f0(a, Sl, l, t);
    },
    useMemoCache: Zc,
    useCacheRefresh: p0,
    useEffectEvent: T0
  }, jr = {
    readContext: Fl,
    use: wn,
    useCallback: N0,
    useContext: Fl,
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
      var a = pl();
      return Sl === null ? Fc(a, l, t) : D0(
        a,
        Sl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Lc(Ea)[0], t = pl().memoizedState;
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
      var a = pl();
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
      var u = Ut(), e = Ba(u);
      e.payload = t, a != null && (e.callback = a), t = qa(l, e, u), t !== null && (gt(t, l, u), He(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = Ut(), e = Ba(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = qa(l, e, u), t !== null && (gt(t, l, u), He(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = Ut(), u = Ba(a);
      u.tag = 2, t != null && (u.callback = t), t = qa(l, u, a), t !== null && (gt(t, l, a), He(t, l, a));
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
      ), a = Wl.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
          case 19:
            return at === null ? Ti() : a.alternate === null && Rl === 0 && (Rl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Xf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Gn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Xf(l, u, e)), !1;
        }
        throw Error(h(435, a.tag));
      }
      return Xf(l, u, e), Ti(), !1;
    }
    if (F)
      return t = Wl.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Ec && (l = Error(h(422), { cause: u }), Me(qt(l, a)))) : (u !== Ec && (t = Error(h(423), {
        cause: u
      }), Me(
        qt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = qt(u, a), e = tf(
        l.stateNode,
        u,
        e
      ), Rc(l, e), Rl !== 4 && (Rl = 2)), !1;
    var n = Error(h(520), { cause: u });
    if (n = qt(n, a), we === null ? we = [n] : we.push(n), Rl !== 4 && (Rl = 2), t === null) return !0;
    u = qt(u, a), a = t;
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
  var af = Error(h(461)), Yl = !1;
  function Ql(l, t, a, u) {
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
    ), c = Gc(), l !== null && !Yl ? (Xc(l, t, e), za(l, t, e)) : (F && c && pn(t), t.flags |= 1, Ql(l, t, u, e), t.child);
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
      )) : (l = Un(
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
        ), n !== null ? ks(t, n) : Hc(), Ps(t);
      else
        return u = t.lanes = 536870912, W0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (qn(t, n.cachePool), ks(t, n), Xa(), t.memoizedState = null) : (l !== null && qn(t, null), Hc(), Xa());
    return Ql(l, t, e, a), t.child;
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
    }, l !== null && qn(t, null), Hc(), Ps(t), l !== null && ou(l, t, u, !0), t.childLanes = e, null;
  }
  function li(l, t) {
    return t = ti(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function I0(l, t, a) {
    return yu(t, l.child, null, a), l = li(t, t.pendingProps), l.flags |= 2, At(t), t.memoizedState = null, l;
  }
  function Br(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (F) {
        if (u.mode === "hidden")
          return l = li(t, u), t.lanes = 536870912, l.memoizedState = { baseLanes: 0, cachePool: null }, Xe(null, l);
        if (xc(t), (l = El) ? (l = _m(
          l,
          Xt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ua !== null ? { id: la, overflow: ta } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = js(l), a.return = t, t.child = a, Kl = t, El = null)) : l = null, l === null) throw pa(t);
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
        else throw Error(h(558));
      else if (Yl || ou(l, t, a, !1), e = (a & l.childLanes) !== 0, Yl || e) {
        if (Ya.current === null) {
          if (u = Tl, u !== null && (i = qo(u, a), i !== 0 && i !== n.retryLane))
            throw n.retryLane = i, nu(l, i), gt(u, l, i), af;
          Ti();
        }
        t = I0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, El = Zt(i.nextSibling), Kl = t, F = !0, Ra = null, Xt = !1, l !== null && qs(t, l), t = li(t, u), t.flags |= 134221824;
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
        throw Error(h(284));
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
    ), u = Gc(), l !== null && !Yl ? (Xc(l, t, e), za(l, t, e)) : (F && u && pn(t), t.flags |= 1, Ql(l, t, a, e), t.child);
  }
  function k0(l, t, a, u, e, n) {
    return su(t), t.updateQueue = null, a = t0(
      t,
      u,
      a,
      e
    ), l0(l), u = Gc(), l !== null && !Yl ? (Xc(l, t, n), za(l, t, n)) : (F && u && pn(t), t.flags |= 1, Ql(l, t, a, n), t.child);
  }
  function P0(l, t, a, u, e) {
    if (su(t), t.stateNode === null) {
      var n = xu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Fl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = lf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Cc(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Fl(i) : xu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (Pc(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && lf.enqueueReplaceState(n, n.state, null), xe(t, u, n, e), je(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var c = t.memoizedProps, f = gu(a, c);
      n.props = f;
      var v = n.context, g = a.contextType;
      i = xu, typeof g == "object" && g !== null && (i = Fl(g));
      var E = a.getDerivedStateFromProps;
      g = typeof E == "function" || typeof n.getSnapshotBeforeUpdate == "function", c = t.pendingProps !== c, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (c || v !== i) && G0(
        t,
        n,
        u,
        i
      ), xa = !1;
      var d = t.memoizedState;
      n.state = d, xe(t, u, n, e), je(), v = t.memoizedState, c || d !== v || xa ? (typeof E == "function" && (Pc(
        t,
        a,
        E,
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
      n = t.stateNode, Uc(l, t), i = t.memoizedProps, g = gu(a, i), n.props = g, E = t.pendingProps, d = n.context, v = a.contextType, f = xu, typeof v == "object" && v !== null && (f = Fl(v)), c = a.getDerivedStateFromProps, (v = typeof c == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== E || d !== f) && G0(
        t,
        n,
        u,
        f
      ), xa = !1, d = t.memoizedState, n.state = d, xe(t, u, n, e), je();
      var y = t.memoizedState;
      i !== E || d !== y || xa || l !== null && l.dependencies !== null && xn(l.dependencies) ? (typeof c == "function" && (Pc(
        t,
        a,
        c,
        u
      ), y = t.memoizedState), (g = xa || Y0(
        t,
        a,
        g,
        u,
        d,
        y,
        f
      ) || l !== null && l.dependencies !== null && xn(l.dependencies)) ? (v || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, y, f), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        y,
        f
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = y), n.props = u, n.state = y, n.context = f, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && d === l.memoizedState || (t.flags |= 1024), u = !1);
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
    )) : Ql(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = za(
      l,
      t,
      e
    ), l;
  }
  function ld(l, t, a, u) {
    return cu(), t.flags |= 256, Ql(l, t, a, u), t.child;
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
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Il.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (F) {
        if (e ? Ga(t) : Xa(), (l = El) ? (l = _m(
          l,
          Xt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: Ua !== null ? { id: la, overflow: ta } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = js(l), a.return = t, t.child = a, Kl = t, El = null)) : l = null, l === null) throw pa(t);
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
    return l = vt(22, l, null, t), l.lanes = 0, l;
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
      return u = f, u !== "" && (e = Error(h(419)), e.stack = "", e.digest = u, Me({ value: e, source: null, stack: null })), ai(
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
      if (u = Tl, u !== null && (e = qo(
        u,
        c
      ), e !== 0 && e !== i.retryLane))
        throw i.retryLane = e, nu(l, e), gt(u, l, e), af;
      return no(n) || Ti(), ai(
        l,
        t,
        c
      );
    }
    return no(n) ? (t.flags |= 192, t.child = l.child, null) : (l = i.treeContext, El = Zt(n.nextSibling), Kl = t, F = !0, Ra = null, Xt = !1, l !== null && qs(t, l), t = ff(
      t,
      e.children
    ), t.flags |= 134221824, t);
  }
  function ad(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), jn(l.return, t, a);
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
    var i = Il.current;
    if (t.flags & 128)
      return Be(t, i), null;
    var c = (i & 2) !== 0;
    if (c ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, Be(t, i), e === "backwards" && l !== null ? (of(l), Ql(l, t, u, a), of(l)) : Ql(l, t, u, a), u = F ? De : 0, !c && l !== null && (l.flags & 128) !== 0)
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
    return Ha(t, t.type, u.value), Ql(l, t, u.children, a), t.child;
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
      throw Error(h(153));
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
        _l(t, t.stateNode.containerInfo), Ha(t, Bl, l.memoizedState.cache), cu();
        break;
      case 27:
      case 5:
        qi(t);
        break;
      case 4:
        _l(t, t.stateNode.containerInfo);
        break;
      case 10:
        Ha(
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
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), Be(t, Il.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, F0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        Ha(t, Bl, l.memoizedState.cache);
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
      Yl = !1, F && (t.flags & 1048576) !== 0 && Bs(t, De, t.index);
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
              } else if (e === Dl) {
                t.tag = 10, t.type = l, t = ed(
                  null,
                  t,
                  a
                );
                break l;
              }
            }
            throw t = ul(l) || l, Error(h(306, t, ""));
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
          if (_l(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(h(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Uc(l, t), xe(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, Ha(t, Bl, u), u !== n.cache && Oc(
            t,
            [Bl],
            a,
            !0
          ), je(), u = i.element, n.isDehydrated)
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
              e = qt(
                Error(h(424)),
                t
              ), Me(e), t = ld(
                l,
                t,
                u,
                a
              );
              break l;
            } else
              for (l = t.stateNode.containerInfo, l.nodeType === 9 ? l = l.body : l = l.nodeName === "HTML" ? l.ownerDocument.body : l, El = Zt(l.firstChild), Kl = t, F = !0, Ra = null, Xt = !0, a = Fs(
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
        )) ? t.memoizedState = a : F || (t.stateNode = om(
          t.type,
          t.pendingProps,
          G.current,
          t
        )) : t.memoizedState = Um(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return qi(t), l === null && F && (u = t.stateNode = Am(
          t.type,
          t.pendingProps,
          G.current
        ), Kl = t, Xt = !0, e = El, $a(t.type) ? (co = e, El = Zt(u.firstChild)) : El = e), Ql(
          l,
          t,
          t.pendingProps.children,
          a
        ), Ku(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && F && ((e = u = El) && (u = py(
          u,
          t.type,
          t.pendingProps,
          Xt
        ), u !== null ? (t.stateNode = u, Kl = t, El = Zt(u.firstChild), Xt = !1, e = !0) : e = !1), e || pa(t)), qi(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, kf(e, n) ? u = null : i !== null && kf(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Yc(
          l,
          t,
          Dr,
          null,
          null,
          a
        ), oe._currentValue = e), Ku(l, t), Ql(l, t, u, a), t.child;
      case 6:
        return l === null && F && ((l = a = El) && (a = Hy(
          a,
          t.pendingProps,
          Xt
        ), a !== null ? (t.stateNode = a, Kl = t, El = null, l = !0) : l = !1), l || pa(t)), null;
      case 13:
        return td(l, t, a);
      case 4:
        return _l(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = yu(
          t,
          null,
          u,
          a
        ) : Ql(l, t, u, a), t.child;
      case 11:
        return J0(
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
        return ed(l, t, a);
      case 9:
        return e = t.type._context, u = t.pendingProps.children, su(t), e = Fl(e), u = u(e), t.flags |= 1, Ql(l, t, u, a), t.child;
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
        return su(t), u = Fl(Bl), l === null ? (e = Dc(), e === null && (e = Tl, n = Nc(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Cc(t), Ha(t, Bl, e)) : ((l.lanes & a) !== 0 && (Uc(l, t), xe(t, null, null, a), je()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), Ha(t, Bl, u)) : (u = n.cache, Ha(t, Bl, u), u !== e.cache && Oc(
          t,
          [Bl],
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
        }), u = t.pendingProps, u.name != null && u.name !== "auto" ? t.flags |= l === null ? 18882560 : 18874368 : F && pn(t), l !== null && l.memoizedProps.name !== u.name ? t.flags |= 4194816 : Ku(l, t), Ql(l, t, u.children, a), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(h(156, t.tag));
  }
  function _a(l) {
    l.flags |= 4;
  }
  function mf(l, t, a, u, e) {
    var n;
    if ((n = (l.mode & 32) !== 0) && (n = a === null ? jm(t, u) : jm(t, u) && (u.src !== a.src || u.srcSet !== a.srcSet)), n) {
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
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? jo() : 536870912, l.lanes |= t, Wu |= t);
  }
  function Qe(l, t) {
    if (!F)
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
  function zl(l) {
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
        return zl(t), null;
      case 1:
        return zl(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), ba(Bl), dt(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Yu(t) ? _a(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, zc())), zl(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (_a(t), n !== null ? (zl(t), id(t, n)) : (zl(t), mf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (_a(t), zl(t), id(t, n)) : (zl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && _a(t), zl(t), mf(
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
              throw Error(h(166));
            return zl(t), t.subtreeFlags &= -33554433, null;
          }
          l = jt.current, Yu(t) ? Ys(t) : (l = Am(e, u, a), t.stateNode = l, _a(t));
        }
        return zl(t), t.subtreeFlags &= -33554433, null;
      case 5:
        if (on(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && _a(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(h(166));
            return zl(t), t.subtreeFlags &= -33554433, null;
          }
          if (n = jt.current, Yu(t))
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
            n[$l] = t, n[mt] = u;
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
            l: switch (Pl(n, e, u), e) {
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
        return zl(t), t.subtreeFlags &= -33554433, mf(
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
            throw Error(h(166));
          if (l = G.current, Yu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Kl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[$l] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || nm(l.nodeValue, a)), l || pa(t, !0);
          } else
            l = ke(l).createTextNode(
              u
            ), l[$l] = t, t.stateNode = l;
        }
        return zl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Yu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(h(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(h(557));
              l[$l] = t;
            } else
              cu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            zl(t), l = !1;
          } else
            a = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (At(t), t) : (At(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(h(558));
        }
        return zl(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Yu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(h(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(h(317));
              e[$l] = t;
            } else
              cu(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            zl(t), e = !1;
          } else
            e = zc(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (At(t), t) : (At(t), null);
        }
        return At(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), ei(t, t.updateQueue), zl(t), null);
      case 4:
        return dt(), l === null && wf(t.stateNode.containerInfo), t.flags |= 67108864, zl(t), null;
      case 10:
        return ba(t.type), zl(t), null;
      case 19:
        if (Bc(t), u = t.memoizedState, u === null) return zl(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Qe(u, !1);
          else {
            if (Rl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = Vn(l), n !== null) {
                  for (t.flags |= 128, Qe(u, !1), l = n.updateQueue, t.updateQueue = l, ei(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    Hs(a, l), a = a.sibling;
                  return Be(
                    t,
                    Il.current & 1 | 2
                  ), F && ga(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Et() > hi && (t.flags |= 128, e = !0, Qe(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = Vn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, ei(t, l), Qe(u, !0), u.tail === null && u.tailMode !== "collapsed" && u.tailMode !== "visible" && !n.alternate && !F)
                return zl(t), null;
            } else
              2 * Et() - u.renderingStartTime > hi && a !== 536870912 && (t.flags |= 128, e = !0, Qe(u, !1), t.lanes = 4194304);
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
          return u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Et(), l.sibling = null, n = Il.current, n = e ? n & 1 | 2 : n & 1, u.tailMode === "visible" || u.tailMode === "collapsed" || !a || F ? Be(t, n) : (a = n, vl(Wl, t), vl(Il, a), at === null && (at = t)), F && ga(t, u.treeForkCount), l;
        }
        return zl(t), null;
      case 22:
      case 23:
        return At(t), jc(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (zl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : zl(t), a = t.updateQueue, a !== null && ei(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && Xl(mu), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), ba(Bl), zl(t), null;
      case 25:
        return null;
      case 30:
        return t.flags |= 33554432, zl(t), null;
    }
    throw Error(h(156, t.tag));
  }
  function Xr(l, t) {
    switch (Tc(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return ba(Bl), dt(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return on(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (At(t), t.alternate === null)
            throw Error(h(340));
          cu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (At(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(h(340));
          cu();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return Bc(t), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null), t.flags |= 4, t) : null;
      case 4:
        return dt(), null;
      case 10:
        return ba(t.type), null;
      case 22:
      case 23:
        return At(t), jc(), l !== null && Xl(mu), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
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
        ba(Bl), dt();
        break;
      case 26:
      case 27:
      case 5:
        on(t);
        break;
      case 4:
        dt();
        break;
      case 31:
        t.memoizedState !== null && At(t);
        break;
      case 13:
        At(t);
        break;
      case 19:
        Bc(t);
        break;
      case 10:
        ba(t.type);
        break;
      case 22:
      case 23:
        At(t), jc(), l !== null && Xl(mu);
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
              var i = new Rt(l);
              S(
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
      yl(l, t, c);
    }
  }
  function kl(l, t) {
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
      my(u, l.type, a, t), u[mt] = t;
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
      e = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(e, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(e), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Pt)), ni(l, u), ol = !0;
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
      e = l.stateNode, t ? a.insertBefore(e, t) : a.appendChild(e), ni(l, u), ol = !0;
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
      Pl(t, u, a), t[$l] = l, t[mt] = a;
    } catch (n) {
      yl(l, l.return, n);
    }
  }
  var ci = !1, Dt = null;
  function vd(l) {
    (l.tag === 30 || (l.subtreeFlags & 33554432) !== 0) && (ci = !0);
  }
  var ua = null;
  function rd() {
    var l = ua;
    return ua = null, l;
  }
  var rt = 0;
  function Ju(l, t, a, u, e) {
    return rt = 0, yd(
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
          rt === 0 ? t : t + "_" + rt,
          a
        ), rt++;
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
            throw Error(h(544));
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
      var t = l.memoizedProps, a = ra(t, l.stateNode), u = Dt !== null ? Dt.get(a) : void 0, e = ya(
        t.default,
        u !== void 0 ? t.share : t.exit
      );
      e !== "none" && (Ju(l, a, e, null, !1) ? u !== void 0 ? (e = l.stateNode, u.paired = e, e.paired = u, Dt.delete(a), le(l, t.onShare)) : le(l, t.onExit) : ea(l.child, !1)), Dt !== null && Tf(l);
    } else if ((l.subtreeFlags & 33554432) !== 0)
      for (l = l.child; l !== null; )
        Ef(l), l = l.sibling;
    else
      Dt !== null && Tf(l);
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
        if (n !== null && rt < n.length) {
          var v = n[rt], g = to(f);
          (v.view || g.view) && (c = !0);
          var E;
          if (E = (l.flags & 4) === 0)
            if (g.clip) E = !0;
            else {
              E = v.rect;
              var d = g.rect;
              E = E.y !== d.y || E.x !== d.x || E.height !== d.height || E.width !== d.width;
            }
          E && (l.flags |= 4), g.abs ? g = !v.abs : (v = v.rect, g = g.rect, g = v.height !== g.height || v.width !== g.width), g && (l.flags |= 32);
        } else l.flags |= 32;
        (l.flags & 4) !== 0 && rm(
          f,
          rt === 0 ? a : a + "_" + rt,
          e
        ), c && (l.flags & 4) !== 0 || (ua === null && (ua = []), ua.push(
          f,
          rt === 0 ? u : u + "_" + rt,
          t.memoizedProps
        )), rt++;
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
        rt = 0, e = _f(
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
            var c = 0, f = -1, v = -1, g = 0, E = 0, d = l, y = null;
            t: for (; ; ) {
              for (var N; d !== u || n !== 0 && d.nodeType !== 3 || (f = c + n), d !== i || e !== 0 && d.nodeType !== 3 || (v = c + e), d.nodeType === 3 && (c += d.nodeValue.length), (N = d.firstChild) !== null; )
                y = d, d = N;
              for (; ; ) {
                if (d === l) break t;
                if (y === u && ++g === n && (f = c), y === i && ++E === e && (v = c), (N = d.nextSibling) !== null) break;
                d = y, y = d.parentNode;
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
    Dt = null;
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
          if ((e & 1024) !== 0) throw Error(h(163));
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
        ), jy(l, a))));
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
          l.stateNode.nodeValue = t ? "" : l.memoizedProps, ol = !0;
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
  var Ol = null, yt = !1;
  function $t(l, t, a) {
    for (a = a.child; a !== null; )
      _d(l, t, a), a = a.sibling;
  }
  function _d(l, t, a) {
    if (zt && typeof zt.onCommitFiberUnmount == "function")
      try {
        zt.onCommitFiberUnmount(ve, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        ml || kl(a, t), $t(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && !ml && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        ml || kl(a, t), Ve(a);
        var u = Ol, e = yt;
        $a(a.type) && (Ol = a.stateNode, yt = !1), $t(
          l,
          t,
          a
        ), Dm(
          a.stateNode,
          a.type,
          a.memoizedProps
        ), Ol = u, yt = e;
        break;
      case 5:
        ml || kl(a, t), Ve(a);
      case 6:
        if (a.tag === 6 && Ve(a), u = Ol, e = yt, Ol = null, $t(
          l,
          t,
          a
        ), Ol = u, yt = e, Ol !== null)
          if (yt)
            try {
              (Ol.nodeType === 9 ? Ol.body : Ol.nodeName === "HTML" ? Ol.ownerDocument.body : Ol).removeChild(a.stateNode), ol = !0;
            } catch (n) {
              yl(
                a,
                t,
                n
              );
            }
          else
            try {
              Ol.removeChild(a.stateNode), ol = !0;
            } catch (n) {
              yl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Ol !== null && (yt ? (l = Ol, mm(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), de(l)) : mm(Ol, a.stateNode));
        break;
      case 4:
        u = Ol, e = yt, Ol = a.stateNode.containerInfo, yt = !0, $t(
          l,
          t,
          a
        ), Ol = u, yt = e;
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
        ml || (kl(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && od(
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
        kl(a, t), $t(
          l,
          t,
          a
        );
        break;
      case 7:
        ml || kl(a, t), $t(
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
        throw Error(h(435, l.tag));
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
  function ct(l, t, a) {
    var u = t.deletions;
    if (u !== null)
      for (var e = 0; e < u.length; e++) {
        var n = u[e], i = l, c = t, f = c;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if ($a(f.type)) {
                Ol = f.stateNode, yt = !1;
                break l;
              }
              break;
            case 5:
              Ol = f.stateNode, yt = !1;
              break l;
            case 3:
            case 4:
              Ol = f.stateNode.containerInfo, yt = !0;
              break l;
          }
          f = f.return;
        }
        if (Ol === null) throw Error(h(160));
        _d(i, c, n), Ol = null, yt = !1, i = n.alternate, i !== null && (i.return = null), n.return = null;
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
        ct(t, l, a), ft(l), e & 4 && (Qa(3, l, l.return), Ze(3, l), Qa(5, l, l.return));
        break;
      case 1:
        ct(t, l, a), ft(l), e & 512 && (ml || u === null || kl(u, u.return)), e & 64 && Jl && (l = l.updateQueue, l !== null && (t = l.callbacks, t !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? t : a.concat(t))));
        break;
      case 26:
        if (n = Ft, ct(t, l, a), ft(l), e & 512 && (ml || u === null || kl(u, u.return)), e & 4)
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
                        u = e.getElementsByTagName("title")[0], (!u || u[he] || u[$l] || u.namespaceURI === "http://www.w3.org/2000/svg" || u.hasAttribute("itemprop")) && (u = e.createElement(t), e.head.insertBefore(
                          u,
                          e.querySelector("head > title")
                        )), Pl(u, t, a), u[$l] = l, Ll(u), t = u;
                        break l;
                      case "link":
                        if (n = Hm(
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
                        u = e.createElement(t), Pl(u, t, a), e.head.appendChild(u);
                        break;
                      case "meta":
                        if (n = Hm(
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
                        u = e.createElement(t), Pl(u, t, a), e.head.appendChild(u);
                        break;
                      default:
                        throw Error(h(468, t));
                    }
                    u[$l] = l, Ll(u), t = u;
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
        ct(t, l, a), ft(l), e & 512 && (ml || u === null || kl(u, u.return)), u !== null && e & 4 && hf(
          l,
          l.memoizedProps,
          u.memoizedProps
        );
        break;
      case 5:
        if (n = na, na = !1, ct(t, l, a), na = n, ft(l), e & 512 && (ml || u === null || kl(u, u.return)), l.flags & 32) {
          t = l.stateNode;
          try {
            Mu(t, ""), ol = !0;
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
        if (ct(t, l, a), ft(l), e & 4) {
          if (l.stateNode === null)
            throw Error(h(162));
          t = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = t, ol = !0;
          } catch (g) {
            yl(l, l.return, g);
          }
        }
        break;
      case 3:
        if (ol = !1, Di = null, n = Ft, Ft = Pe(t.containerInfo), ct(t, l, a), Ft = n, ft(l), e & 4 && u !== null && u.memoizedState.isDehydrated)
          try {
            de(t.containerInfo);
          } catch (g) {
            yl(l, l.return, g);
          }
        Of && (Of = !1, Dd(l)), ol = !1;
        break;
      case 4:
        e = na, na = Jl, u = wo(), n = Ft, Ft = Pe(
          l.stateNode.containerInfo
        ), ct(t, l, a), ft(l), Ft = n, ol && Le && (si = !0), ol = u, na = e;
        break;
      case 12:
        ct(t, l, a), ft(l);
        break;
      case 31:
        ct(t, l, a), ft(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 13:
        ct(t, l, a), ft(l), l.child.flags & 8192 && l.memoizedState !== null != (u !== null && u.memoizedState !== null) && (yi = Et()), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 22:
        n = l.memoizedState !== null, i = u !== null && u.memoizedState !== null;
        var c = Jl, f = ml, v = na;
        Jl = c || n, na = v || n, ml = f || i, ct(t, l, a), ml = f, na = v, Jl = c, ft(l), e & 8192 && (t = l.stateNode, t._visibility = n ? t._visibility & -2 : t._visibility | 1, !n || u === null || i || Jl || ml || (t = i || ml, a = Jl, u = ml, Jl = n || Jl, ml = t, Za(l, 2), Jl = a, ml = u), !n && na || Af(l, n)), e & 4 && (t = l.updateQueue, t !== null && (a = t.retryQueue, a !== null && (t.retryQueue = null, mi(l, a))));
        break;
      case 19:
        ct(t, l, a), ft(l), e & 4 && (t = l.updateQueue, t !== null && (l.updateQueue = null, mi(l, t)));
        break;
      case 30:
        e & 512 && (ml || u === null || kl(u, u.return)), e = wo(), n = Le, i = (a & 335544064) === a, c = l.memoizedProps, Le = i && ya(
          c.default,
          c.update
        ) !== "none", ct(t, l, a), ft(l), i && u !== null && ol && (l.flags |= 4), Le = n, ol = e;
        break;
      case 21:
        break;
      case 7:
        e & 512 && (ml || u === null || kl(u, u.return)), u && u.stateNode !== null && (u.stateNode._fragmentFiber = l);
      default:
        ct(t, l, a), ft(l);
    }
  }
  function ft(l) {
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
        if (a == null) throw Error(h(160));
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
            var E = a.stateNode.containerInfo, d = gf(l);
            Sf(
              l,
              d,
              E,
              i
            );
            break;
          default:
            throw Error(h(161));
        }
      } catch (y) {
        yl(l, l.return, y);
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
          c === "none" ? t = !1 : (n = a.memoizedState, a.memoizedState = null, a = l.child, rt = 0, t = _f(
            l,
            a,
            t,
            i,
            c,
            n,
            !0
          ), rt !== (n === null ? 0 : n.length) && (l.flags |= 32)), (l.flags & 4) !== 0 && t ? (le(
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
          kl(a, a.return);
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
          kl(a, a.return), a.tag !== 5 && a.tag !== 27 || Ve(a), Za(
            a,
            u
          );
          break;
        case 6:
          Ve(a);
          break;
        case 26:
          kl(a, a.return), e = a.stateNode, a.memoizedState !== null || e === null || ml || e.parentNode.removeChild(e), Za(
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
          kl(a, a.return), Za(
            a,
            u
          );
          break;
        case 7:
          kl(a, a.return);
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
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Ce(a));
  }
  function Cf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ce(l));
  }
  function Qt(l, t, a, u) {
    var e = (a & 335544064) === a;
    if (t.subtreeFlags & (e ? 10262 : 10256))
      for (t = t.child; t !== null; )
        Cd(
          l,
          t,
          a,
          u
        ), t = t.sibling;
    else e && gd(t);
  }
  function Cd(l, t, a, u) {
    var e = (a & 335544064) === a;
    e && t.alternate === null && t.return !== null && t.return.alternate !== null && oi(t);
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
        ), n & 2048 && Ze(9, t);
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
        ), e && Nf && (l = l.containerInfo, l = l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l, l.style.viewTransitionName === "root" && (l.style.viewTransitionName = ""), l = l.ownerDocument.documentElement, l !== null && l.style.viewTransitionName === "none" && (l.style.viewTransitionName = "")), n & 2048 && (n = null, t.alternate !== null && (n = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== n && (t.refCount++, n != null && Ce(n)));
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
          } catch (v) {
            yl(t, t.return, v);
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
        i = t.stateNode, c = t.alternate, t.memoizedState !== null ? (e && c !== null && c.memoizedState === null && oi(c), i._visibility & 2 ? Qt(
          l,
          t,
          a,
          u
        ) : Ke(
          l,
          t
        )) : (e && c !== null && c.memoizedState !== null && oi(t), i._visibility & 2 ? Qt(
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
        Qt(
          l,
          t,
          a,
          u
        ), n & 2048 && Cf(t.alternate, t);
        break;
      case 30:
        e && (n = t.alternate, n !== null && (ea(n.child, !0), ea(t.child, !0))), Qt(
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
          ), e && v & 2048 && Cf(i.alternate, i);
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
            Ke(a, u), e & 2048 && Cf(u.alternate, u);
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
        Ud(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function Ud(l, t, a) {
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
          e.paired = null, Dt === null && (Dt = /* @__PURE__ */ new Map()), Dt.set(u, e);
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
          wl = u, Hd(
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
          wl = u, Hd(
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
  function Hd(l, t) {
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
          Ce(a.memoizedState.cache);
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
      var t = Fl(Bl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Fl(Bl).controller.signal;
    }
  }, Lr = typeof WeakMap == "function" ? WeakMap : Map, sl = 0, Tl = null, W = null, k = 0, rl = 0, Mt = null, Va = !1, Fu = !1, Uf = !1, Oa = 0, Rl = 0, La = 0, Tu = 0, ri = 0, Ct = 0, Wu = 0, we = null, ht = null, Rf = !1, yi = 0, jd = 0, hi = 1 / 0, gi = null, Ka = null, Ml = 0, It = null, Eu = null, fa = 0, pf = 0, Hf = null, xd = null, Iu = null, ku = null, Pu = null, $e = 0, Si = null;
  function Ut() {
    return (sl & 2) !== 0 && k !== 0 ? k & -k : C.T !== null ? Vf() : Yo();
  }
  function Bd() {
    if (Ct === 0)
      if ((k & 536870912) === 0 || F) {
        var l = mn;
        mn <<= 1, (mn & 3932160) === 0 && (mn = 262144), Ct = l;
      } else Ct = 536870912;
    return l = Wl.current, l !== null && (l.flags |= 32), Ct;
  }
  function le(l, t) {
    if (t != null) {
      var a = l.stateNode, u = a.ref;
      u === null && (u = a.ref = hm(
        ra(l.memoizedProps, a)
      )), ku === null && (ku = []), ku.push(t.bind(null, u));
    }
  }
  function gt(l, t, a) {
    (l === Tl && (rl === 2 || rl === 9) || l.cancelPendingCommit !== null) && (te(l, 0), Ja(
      l,
      k,
      Ct,
      !1
    )), ye(l, a), ((sl & 2) === 0 || l !== Tl) && (l === Tl && ((sl & 2) === 0 && (Tu |= a), Rl === 4 && Ja(
      l,
      k,
      Ct,
      !1
    )), oa(l));
  }
  function qd(l, t, a) {
    if ((sl & 6) !== 0) throw Error(h(327));
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
                if (Uf && !f) {
                  c.errorRecoveryDisabledLanes |= n, Tu |= n, e = 4;
                  break l;
                }
                n = ht, ht = e, n !== null && (ht === null ? ht = n : ht.push.apply(
                  ht,
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
              throw Error(h(345));
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
              ht = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(h(329));
          }
          if ((t & 62914560) === t && (e = yi + 300 - Et(), 10 < e)) {
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
                ht,
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
            ht,
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
  function Yd(l, t, a, u, e, n, i, c, f, v, g, E, d, y) {
    l.timeoutHandle = -1;
    var N = t.subtreeFlags, M = (n & 335544064) === n;
    if (E = null, (M || N & 8192 || (N & 16785408) === 16785408) && (E = {
      stylesheets: null,
      count: 0,
      imgCount: 0,
      imgBytes: 0,
      suspenseyImages: [],
      waitingForImages: !0,
      waitingForViewTransition: !1,
      unsuspend: Pt
    }, Dt = null, Ud(
      t,
      n,
      E
    ), M && (N = E, M = l.containerInfo, M = (M.nodeType === 9 ? M : M.ownerDocument).__reactViewTransition, M != null && (N.count++, N.waitingForViewTransition = !0, N = an.bind(N), M.finished.then(N, N))), N = (n & 62914560) === n ? yi - Et() : (n & 4194048) === n ? jd - Et() : 0, N = Fy(
      E,
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
          E,
          null,
          d,
          y
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
      E
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
            if (!Nt(n(), e)) return !1;
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
    t = Ho(l, t), t &= ~ri, t &= ~Tu, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - _t(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && xo(l, a, t);
  }
  function bi() {
    return (sl & 6) === 0 ? (Fe(0), !1) : !0;
  }
  function jf() {
    if (W !== null) {
      if (rl === 0)
        var l = W.return;
      else
        l = W, Sa = fu = null, Qc(l), Qu = null, pe = 0, l = W;
      for (; l !== null; )
        cd(l.alternate, l), l = l.return;
      W = null;
    }
  }
  function te(l, t) {
    var a = l.timeoutHandle;
    return a !== -1 && (l.timeoutHandle = -1, yy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), fa = 0, jf(), Tl = l, W = a = ha(l.current, null), k = t, rl = 0, Mt = null, Va = !1, Fu = re(l, t), Uf = !1, Wu = Ct = ri = Tu = La = Rl = 0, ht = we = null, Rf = !1, Oa = Ho(l, t), Dn(), a;
  }
  function Gd(l, t) {
    L = null, C.H = kn, t === Xu || t === Yn ? (t = Js(), rl = 3) : t === Mc ? (t = Js(), rl = 4) : rl = t === af ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Mt = t, W === null && (Rl = 1, Pn(
      l,
      qt(t, l.current)
    ));
  }
  function Xd() {
    var l = Wl.current;
    return l === null ? !0 : (k & 4194048) === k ? at === null : (k & 62914560) === k || (k & 536870912) !== 0 ? l === at : !1;
  }
  function Qd() {
    var l = C.H;
    return C.H = kn, l === null ? kn : l;
  }
  function Zd() {
    var l = C.A;
    return C.A = Vr, l;
  }
  function Ti() {
    Rl = 4, Va || (k & 4194048) !== k && Wl.current !== null || (Fu = !0), (La & 134217727) === 0 && (Tu & 134217727) === 0 || Tl === null || Ja(
      Tl,
      k,
      Ct,
      !1
    );
  }
  function xf(l, t, a) {
    var u = sl;
    sl |= 2;
    var e = Qd(), n = Zd();
    (Tl !== l || k !== t) && (gi = null, te(l, t)), t = !1;
    var i = Rl;
    l: do
      try {
        if (rl !== 0 && W !== null) {
          var c = W, f = Mt;
          switch (rl) {
            case 8:
              jf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              Wl.current === null && (t = !0);
              var v = rl;
              if (rl = 0, Mt = null, ae(l, c, f, v), a && Fu) {
                i = 0;
                break l;
              }
              break;
            default:
              v = rl, rl = 0, Mt = null, ae(l, c, f, v);
          }
        }
        Jr(), i = Rl;
        break;
      } catch (g) {
        Gd(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Sa = fu = null, sl = u, C.H = e, C.A = n, W === null && (Tl = null, k = 0, Dn()), i;
  }
  function Jr() {
    for (; W !== null; ) Vd(W);
  }
  function wr(l, t) {
    var a = sl;
    sl |= 2;
    var u = Qd(), e = Zd();
    Tl !== l || k !== t ? (gi = null, hi = Et() + 500, te(l, t)) : Fu = re(
      l,
      t
    );
    l: do
      try {
        if (rl !== 0 && W !== null) {
          t = W;
          var n = Mt;
          t: switch (rl) {
            case 1:
              rl = 0, Mt = null, ae(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Ls(n)) {
                rl = 0, Mt = null, Ld(t);
                break;
              }
              t = function() {
                rl !== 2 && rl !== 9 || Tl !== l || (rl = 7), oa(l);
              }, n.then(t, t);
              break l;
            case 3:
              rl = 7;
              break l;
            case 4:
              rl = 5;
              break l;
            case 7:
              Ls(n) ? (rl = 0, Mt = null, Ld(t)) : (rl = 0, Mt = null, ae(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (W.tag) {
                case 26:
                  i = W.memoizedState;
                case 5:
                case 27:
                  var c = W;
                  if (i ? xm(i) : c.stateNode.complete) {
                    rl = 0, Mt = null;
                    var f = c.sibling;
                    if (f !== null) W = f;
                    else {
                      var v = c.return;
                      v !== null ? (W = v, Ei(v)) : W = null;
                    }
                    break t;
                  }
              }
              rl = 0, Mt = null, ae(l, t, n, 5);
              break;
            case 6:
              rl = 0, Mt = null, ae(l, t, n, 6);
              break;
            case 8:
              jf(), Rl = 6;
              break l;
            default:
              throw Error(h(462));
          }
        }
        $r();
        break;
      } catch (g) {
        Gd(l, g);
      }
    while (!0);
    return Sa = fu = null, C.H = u, C.A = e, sl = a, W !== null ? 0 : (Tl = null, k = 0, Dn(), Rl);
  }
  function $r() {
    for (; W !== null && !dv(); )
      Vd(W);
  }
  function Vd(l) {
    var t = nd(l.alternate, l, Oa);
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : W = t;
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
          k
        );
        break;
      case 11:
        t = k0(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          k
        );
        break;
      case 5:
        Qc(t);
        var u = t;
        u === Kl && (F ? (Hn(u), u.tag === 5 && u.stateNode != null && (El = u.stateNode)) : (Hn(u), F = !0));
      default:
        cd(a, t), t = W = Hs(t, Oa), t = nd(a, t, Oa);
    }
    l.memoizedProps = l.pendingProps, t === null ? Ei(l) : W = t;
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
        k
      )) {
        Rl = 1, Pn(
          l,
          qt(a, l.current)
        ), W = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw W = e, n;
      Rl = 1, Pn(
        l,
        qt(a, l.current)
      ), W = null;
      return;
    }
    t.flags & 32768 ? (F || u === 1 ? l = !0 : Fu || (k & 536870912) !== 0 ? l = !1 : (Va = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = Wl.current, u !== null && u.tag === 13 && (u.flags |= 16384))), Kd(t, l)) : Ei(t);
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
        W = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        W = t;
        return;
      }
      W = t = l;
    } while (t !== null);
    Rl === 0 && (Rl = 5);
  }
  function Kd(l, t) {
    do {
      var a = Xr(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, W = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        W = l;
        return;
      }
      W = l = a;
    } while (l !== null);
    Rl = 6, W = null;
  }
  function Jd(l, t, a, u, e, n, i, c, f, v, g, E) {
    l.cancelPendingCommit = null;
    do
      zi();
    while (Ml !== 0);
    if ((sl & 6) !== 0) throw Error(h(327));
    if (t !== null) {
      if (t === l.current) throw Error(h(177));
      l === Tl && (W = Tl = null, k = 0), Eu = t, It = l, fa = a, Hf = e, xd = u, Fr(
        l,
        t,
        a,
        i,
        c,
        f,
        E
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
      u = C.T, C.T = null, e = Y.p, Y.p = 2, n = sl, sl |= 4;
      try {
        Qr(l, t, a);
      } finally {
        sl = n, Y.p = e, C.T = u;
      }
    }
    Ml = 1, ci ? Iu = Ey(
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
    if (Ml !== 0) {
      var t = It.onRecoverableError;
      t(l, { componentStack: null });
    }
  }
  function Ir() {
    Ml === 3 && (Ml = 0, Md(Eu, It), Ml = 4);
  }
  function Bf() {
    if (Ml === 1) {
      Ml = 0;
      var l = It, t = Eu, a = fa, u = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || u) {
        u = C.T, C.T = null;
        var e = Y.p;
        Y.p = 2;
        var n = sl;
        sl |= 4;
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
                var E = c.ownerDocument || document, d = E && E.defaultView || window;
                if (d.getSelection) {
                  var y = d.getSelection(), N = c.textContent.length, M = Math.min(f.start, N), K = f.end === void 0 ? M : Math.min(f.end, N);
                  !y.extend && M > K && (i = K, K = M, M = i);
                  var m = Es(
                    c,
                    M
                  ), o = Es(
                    c,
                    K
                  );
                  if (m && o && (y.rangeCount !== 1 || y.anchorNode !== m.node || y.anchorOffset !== m.offset || y.focusNode !== o.node || y.focusOffset !== o.offset)) {
                    var r = E.createRange();
                    r.setStart(m.node, m.offset), y.removeAllRanges(), M > K ? (y.addRange(r), y.extend(o.node, o.offset)) : (r.setEnd(o.node, o.offset), y.addRange(r));
                  }
                }
              }
            }
            for (E = [], y = c; y = y.parentNode; )
              y.nodeType === 1 && E.push({
                element: y,
                left: y.scrollLeft,
                top: y.scrollTop
              });
            for (typeof c.focus == "function" && c.focus(), c = 0; c < E.length; c++) {
              var T = E[c];
              T.element.scrollLeft = T.left, T.element.scrollTop = T.top;
            }
          }
          se = !!Wf, If = Wf = null;
        } finally {
          sl = n, Y.p = e, C.T = u;
        }
      }
      l.current = t, Ml = 2;
    }
  }
  function qf() {
    if (Ml === 2) {
      Ml = 0;
      var l = It, t = Eu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = C.T, C.T = null;
        var u = Y.p;
        Y.p = 2;
        var e = sl;
        sl |= 4;
        try {
          Td(l, t.alternate, t);
        } finally {
          sl = e, Y.p = u, C.T = a;
        }
      }
      Ml = 3;
    }
  }
  function Yf() {
    if (Ml === 4 || Ml === 3) {
      Ml = 0;
      var l = Iu;
      Iu = null, mv();
      var t = It, a = Eu, u = fa, e = xd, n = (u & 335544064) === u ? 10262 : 10256;
      if ((a.subtreeFlags & n) !== 0 || (a.flags & n) !== 0 ? Ml = 5 : (Ml = 0, Eu = It = null, wd(t, t.pendingLanes)), n = t.pendingLanes, n === 0 && (Ka = null), Ji(u), a = a.stateNode, zt && typeof zt.onCommitFiberRoot == "function")
        try {
          zt.onCommitFiberRoot(
            ve,
            a,
            void 0,
            (a.current.flags & 128) === 128
          );
        } catch {
        }
      if (e !== null) {
        a = C.T, n = Y.p, Y.p = 2, C.T = null;
        try {
          for (var i = t.onRecoverableError, c = 0; c < e.length; c++) {
            var f = e[c];
            i(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          C.T = a, Y.p = n;
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
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Ce(t)));
  }
  function zi() {
    return Iu !== null && (Iu.skipTransition(), Iu = null), Bf(), qf(), Yf(), Gf();
  }
  function Gf() {
    if (Ml !== 5) return !1;
    var l = It, t = pf;
    pf = 0;
    var a = Ji(fa), u = C.T, e = Y.p;
    try {
      Y.p = 32 > a ? 32 : a, C.T = null, a = Hf, Hf = null;
      var n = It, i = fa;
      if (Ml = 0, Eu = It = null, fa = 0, (sl & 6) !== 0) throw Error(h(331));
      var c = sl;
      if (sl |= 4, pd(n.current), Cd(
        n,
        n.current,
        i,
        a
      ), sl = c, Fe(0, !1), zt && typeof zt.onPostCommitFiberRoot == "function")
        try {
          zt.onPostCommitFiberRoot(ve, n);
        } catch {
        }
      return !0;
    } finally {
      Y.p = e, C.T = u, wd(l, t);
    }
  }
  function $d(l, t, a) {
    t = qt(a, t), t = tf(l.stateNode, t, 2), l = qa(l, t, 2), l !== null && (ye(l, 2), oa(l));
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
            l = qt(a, l), a = L0(2), u = qa(t, a, 2), u !== null && (K0(
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
    e.has(a) || (Uf = !0, e.add(a), l = kr.bind(null, l, t, a), t.then(l, l));
  }
  function kr(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, Tl === l && (k & a) === a && ((Rl === 4 || Rl === 3 && (k & 62914560) === k && 300 > Et() - yi) && (sl & 2) === 0 ? te(l, 0) : ri |= a, Wu === k && (Wu = 0)), oa(l);
  }
  function Fd(l, t) {
    t === 0 && (t = jo()), l = nu(l, t), l !== null && (ye(l, t), oa(l));
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
        throw Error(h(314));
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
              n = (1 << 31 - _t(42 | l) + 1) - 1, n &= e & ~(i & ~c), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, Pd(u, n));
          } else
            n = k, n = rn(
              u,
              u === Tl ? n : 0,
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
    for (var t = Et(), a = null, u = ue; u !== null; ) {
      var e = u.next, n = Id(u, t);
      n === 0 ? (u.next = null, a === null ? ue = e : a.next = e, e === null && (ee = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (_i = !0)), u = e;
    }
    Ml !== 0 && Ml !== 5 || Fe(l), wa !== 0 && (wa = 0);
  }
  function Id(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - _t(n), c = 1 << i, f = e[i];
      f === -1 ? ((c & a) === 0 || (c & u) !== 0) && (e[i] = Tv(c, t)) : f <= t && (l.expiredLanes |= c), n &= ~c;
    }
    if (t = Tl, a = k, a = rn(
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
    if (Ml !== 0 && Ml !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (zi() && l.callbackNode !== a)
      return null;
    var u = k;
    return u = rn(
      l,
      l === Tl ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (qd(l, u, t), Id(l, Et()), l.callbackNode != null && l.callbackNode === a ? kd.bind(null, l) : null);
  }
  function Pd(l, t) {
    if (zi()) return null;
    qd(l, t, !0);
  }
  function uy() {
    hy(function() {
      (sl & 6) !== 0 ? Zi(
        Uo,
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
        (e[mt] || null).action
      ), i = u.submitter;
      i && (t = (t = i[mt] || null) ? lm(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
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
  wt(As, "onAnimationEnd"), wt(Ds, "onAnimationIteration"), wt(Ms, "onAnimationStart"), wt("dblclick", "onDoubleClick"), wt("focusin", "onFocus"), wt("focusout", "onBlur"), wt(yr, "onTransitionRun"), wt(hr, "onTransitionStart"), wt(gr, "onTransitionCancel"), wt(Cs, "onTransitionEnd"), Au("onMouseEnter", ["mouseout", "mouseover"]), Au("onMouseLeave", ["mouseout", "mouseover"]), Au("onPointerEnter", ["pointerout", "pointerover"]), Au("onPointerLeave", ["pointerout", "pointerover"]), au(
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
  function I(l, t) {
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
      var v = n, g = ki(a), E = [];
      l: {
        var d = Us.get(l);
        if (d !== void 0) {
          var y = _n, N = l;
          switch (l) {
            case "keypress":
              if (En(a) === 0) break l;
            case "keydown":
            case "keyup":
              y = Kv;
              break;
            case "focusin":
              N = "focus", y = ec;
              break;
            case "focusout":
              N = "blur", y = ec;
              break;
            case "beforeblur":
            case "afterblur":
              y = ec;
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
              y = ns;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              y = Hv;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              y = Wv;
              break;
            case As:
            case Ds:
            case Ms:
              y = Bv;
              break;
            case Cs:
              y = kv;
              break;
            case "scroll":
            case "scrollend":
              y = Rv;
              break;
            case "wheel":
              y = lr;
              break;
            case "copy":
            case "cut":
            case "paste":
              y = Yv;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              y = cs;
              break;
            case "submit":
              y = $v;
              break;
            case "toggle":
            case "beforetoggle":
              y = ar;
          }
          var M = (t & 4) !== 0, K = !M && (l === "scroll" || l === "scrollend"), m = M ? d !== null ? d + "Capture" : null : d;
          M = [];
          for (var o = v, r; o !== null; ) {
            var T = o;
            if (r = T.stateNode, T = T.tag, T !== 5 && T !== 26 && T !== 27 || r === null || m === null || (T = Se(o, m), T != null && M.push(
              Ie(o, T, r)
            )), K) break;
            o = o.return;
          }
          0 < M.length && (d = new y(
            d,
            N,
            null,
            a,
            g
          ), E.push({ event: d, listeners: M }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (y = l === "mouseover" || l === "pointerover", d = l === "mouseout" || l === "pointerout", y && a !== Ii && (N = a.relatedTarget || a.fromElement) && (tu(N) || N[_u]))
            break l;
          (d || y) && (N = g.window === g ? g : (y = g.ownerDocument) ? y.defaultView || y.parentWindow : window, d ? (y = a.relatedTarget || a.toElement, d = v, y = y ? tu(y) : null, y !== null && (K = al(y), M = y.tag, y !== K || M !== 5 && M !== 27 && M !== 6) && (y = null)) : (d = null, y = v), d !== y && (M = ns, T = "onMouseLeave", m = "onMouseEnter", o = "mouse", (l === "pointerout" || l === "pointerover") && (M = cs, T = "onPointerLeave", m = "onPointerEnter", o = "pointer"), K = d == null ? N : ge(d), r = y == null ? N : ge(y), N = new M(
            T,
            o + "leave",
            d,
            a,
            g
          ), N.target = K, N.relatedTarget = r, T = null, tu(g) === v && (M = new M(
            m,
            o + "enter",
            y,
            a,
            g
          ), M.target = r, M.relatedTarget = K, T = M), K = T, M = d && y ? xl(
            d,
            y,
            fy
          ) : null, d !== null && um(
            E,
            N,
            d,
            M,
            !1
          ), y !== null && K !== null && um(
            E,
            K,
            y,
            M,
            !0
          )));
        }
        l: {
          if (d = v ? ge(v) : window, y = d.nodeName && d.nodeName.toLowerCase(), y === "select" || y === "input" && d.type === "file")
            var D = ys;
          else if (vs(d))
            if (hs)
              D = mr;
            else {
              D = sr;
              var P = or;
            }
          else
            y = d.nodeName, !y || y.toLowerCase() !== "input" || d.type !== "checkbox" && d.type !== "radio" ? v && Wi(v.elementType) && (D = ys) : D = dr;
          if (D && (D = D(l, v))) {
            rs(
              E,
              D,
              a,
              g
            );
            break l;
          }
          P && P(l, d, v);
        }
        switch (P = v ? ge(v) : window, l) {
          case "focusin":
            (vs(P) || P.contentEditable === "true") && (pu = P, dc = v, Ae = null);
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
            mc = !1, Os(E, a, g);
            break;
          case "selectionchange":
            if (rr) break;
          case "keydown":
          case "keyup":
            Os(E, a, g);
        }
        var H;
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
        q && (fs && a.locale !== "ko" && (Ru || q !== "onCompositionStart" ? q === "onCompositionEnd" && Ru && (H = us()) : (Ma = g, tc = "value" in Ma ? Ma.value : Ma.textContent, Ru = !0)), P = Ni(v, q), 0 < P.length && (q = new is(
          q,
          l,
          null,
          a,
          g
        ), E.push({ event: q, listeners: P }), H ? q.data = H : (H = ms(a), H !== null && (q.data = H)))), (H = er ? nr(l, a) : ir(l, a)) && (q = Ni(v, "onBeforeInput"), 0 < q.length && (P = new is(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), E.push({
          event: P,
          listeners: q
        }), P.data = H)), ey(
          E,
          l,
          v,
          a,
          g
        );
      }
      tm(E, t);
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
        u != null && I("scroll", l);
        return;
      case "onScrollEnd":
        u != null && I("scrollend", l);
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
        I("beforetoggle", l), I("toggle", l), gn(l, "popover", u);
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
          a = Cv.get(a) || a, gn(l, a, u);
        else return;
    }
    ol = !0;
  }
  function Ff(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        ls(l, u, n);
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
        if (typeof u == "string") Mu(l, u);
        else if (typeof u == "number" || typeof u == "bigint")
          Mu(l, "" + u);
        else return;
        break;
      case "onScroll":
        u != null && I("scroll", l);
        return;
      case "onScrollEnd":
        u != null && I("scrollend", l);
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
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), n = a.slice(2, e ? a.length - 7 : void 0), t = l[mt] || null, t = t != null ? t[a] : null, typeof t == "function" && l.removeEventListener(n, t, e), typeof u == "function")) {
              typeof t != "function" && t !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(n, u, e);
              break l;
            }
            ol = !0, a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : gn(l, a, u);
          }
        return;
    }
    ol = !0;
  }
  function Pl(l, t, a) {
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
        I("error", l), I("load", l);
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
                  hl(l, t, n, i, a, null);
              }
          }
        e && hl(l, t, "srcSet", a.srcSet, a, null), u && hl(l, t, "src", a.src, a, null);
        return;
      case "input":
        I("invalid", l);
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
                    throw Error(h(137, t));
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
        I("invalid", l), u = i = n = null;
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
        I("invalid", l), n = e = u = null;
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
                hl(l, t, i, c, a, null);
            }
        ko(l, u, e, n);
        return;
      case "option":
        for (f in a)
          a.hasOwnProperty(f) && (u = a[f], u != null) && (f === "selected" ? l.selected = u && typeof u != "function" && typeof u != "symbol" : hl(l, t, f, u, a, null));
        return;
      case "dialog":
        I("beforetoggle", l), I("toggle", l), I("cancel", l), I("close", l);
        break;
      case "iframe":
      case "object":
        I("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < We.length; u++)
          I(We[u], l);
        break;
      case "image":
        I("error", l), I("load", l);
        break;
      case "details":
        I("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        I("error", l), I("load", l);
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
                throw Error(h(137, t));
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
        for (y in a) {
          var E = a[y];
          if (a.hasOwnProperty(y) && E != null)
            switch (y) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                f = E;
              default:
                u.hasOwnProperty(y) || hl(l, t, y, null, u, E);
            }
        }
        for (var d in u) {
          var y = u[d];
          if (E = a[d], u.hasOwnProperty(d) && (y != null || E != null))
            switch (d) {
              case "type":
                y !== E && (ol = !0), n = y;
                break;
              case "name":
                y !== E && (ol = !0), e = y;
                break;
              case "checked":
                y !== E && (ol = !0), v = y;
                break;
              case "defaultChecked":
                y !== E && (ol = !0), g = y;
                break;
              case "value":
                y !== E && (ol = !0), i = y;
                break;
              case "defaultValue":
                y !== E && (ol = !0), c = y;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (y != null)
                  throw Error(h(137, t));
                break;
              default:
                y !== E && hl(
                  l,
                  t,
                  d,
                  y,
                  u,
                  E
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
        y = i = c = d = null;
        for (n in a)
          if (f = a[n], a.hasOwnProperty(n) && f != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                y = f;
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
                n !== f && (ol = !0), d = n;
                break;
              case "defaultValue":
                n !== f && (ol = !0), c = n;
                break;
              case "multiple":
                n !== f && (ol = !0), i = n;
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
        t = c, a = i, u = y, d != null ? Du(l, !!a, d, !1) : !!u != !!a && (t != null ? Du(l, !!a, t, !0) : Du(l, !!a, a ? [] : "", !1));
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
                hl(l, t, c, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                e !== n && (ol = !0), d = e;
                break;
              case "defaultValue":
                e !== n && (ol = !0), y = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(h(91));
                break;
              default:
                e !== n && hl(l, t, i, e, u, n);
            }
        Io(l, d, y);
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
          d = u[f], y = a[f], u.hasOwnProperty(f) && d !== y && (d != null || y != null) && (f === "selected" ? (d !== y && (ol = !0), l.selected = d && typeof d != "function" && typeof d != "symbol") : hl(
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
        for (var M in a)
          d = a[M], a.hasOwnProperty(M) && d != null && !u.hasOwnProperty(M) && hl(l, t, M, null, u, d);
        for (v in u)
          if (d = u[v], y = a[v], u.hasOwnProperty(v) && d !== y && (d != null || y != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (d != null)
                  throw Error(h(137, t));
                break;
              default:
                hl(
                  l,
                  t,
                  v,
                  d,
                  u,
                  y
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
            d = u[g], y = a[g], !u.hasOwnProperty(g) || d === y || d === void 0 && y === void 0 || Ff(
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
      d = a[m], a.hasOwnProperty(m) && d != null && !u.hasOwnProperty(m) && hl(l, t, m, null, u, d);
    for (E in u)
      d = u[E], y = a[E], !u.hasOwnProperty(E) || d === y || d == null && y == null || hl(l, t, E, d, u, y);
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
            var g = f.transferSize, E = f.initiatorType;
            g && im(E) && (f = f.responseEnd, i += g * (f < c ? 1 : (c - v) / (f - v)));
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
    ).createElement(l), a[$l] = u, a[mt] = t, Pl(a, l, t), Ll(a), a;
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
          var d = v.defaultView, y = d.navigation && d.navigation.transition, N = v.fonts.status;
          u();
          var M = [];
          if (N === "loaded" && (by(v), v.fonts.status === "loading" && M.push(v.fonts.ready)), N = M.length, l !== null)
            for (var K = l.suspenseyImages, m = 0, o = 0; o < K.length; o++) {
              var r = K[o];
              if (!r.complete) {
                var T = r.getBoundingClientRect();
                if (0 < T.bottom && 0 < T.right && T.top < d.innerHeight && T.left < d.innerWidth) {
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
      v.__reactViewTransition = g;
      var E = [];
      return g.ready.then(
        function() {
          for (var d = v.documentElement.getAnimations({
            subtree: !0
          }), y = 0; y < d.length; y++) {
            var N = d[y], M = N.effect, K = M.pseudoElement;
            if (K != null && K.startsWith("::view-transition")) {
              E.push(N), N = M.getKeyframes();
              for (var m = K = void 0, o = !0, r = 0; r < N.length; r++) {
                var T = N[r], D = T.width;
                if (K === void 0) K = D;
                else if (K !== D) {
                  o = !1;
                  break;
                }
                if (D = T.height, m === void 0) m = D;
                else if (m !== D) {
                  o = !1;
                  break;
                }
                delete T.width, delete T.height, T.transform === "none" && delete T.transform;
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
        for (var d = 0; d < E.length; d++)
          E[d].cancel();
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
  function Rt(l) {
    this._fragmentFiber = l, this._observers = this._eventListeners = null;
  }
  Rt.prototype.addEventListener = function(l, t, a) {
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
        }), S(
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
    return fl(l).addEventListener(
      t,
      a,
      u
    ), !1;
  }
  Rt.prototype.removeEventListener = function(l, t, a) {
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
      e = ne(e.optionsOrUseCapture), S(
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
    return fl(l).removeEventListener(
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
  Rt.prototype.dispatchEvent = function(l) {
    var t = U(
      this._fragmentFiber
    );
    if (t === null) return !0;
    t = fl(t);
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
  }, Rt.prototype.focus = function(l) {
    S(
      this._fragmentFiber.child,
      !0,
      bm,
      l,
      void 0,
      void 0
    );
  };
  function bm(l, t) {
    return l.tag === 6 ? !1 : (l = fl(l), xy(l, t));
  }
  Rt.prototype.focusLast = function(l) {
    var t = [];
    S(
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
  Rt.prototype.blur = function() {
    var l = U(
      this._fragmentFiber
    );
    l !== null && (l = fl(l), l = ke(l).activeElement, l !== null && S(
      this._fragmentFiber.child,
      !1,
      Oy,
      l,
      void 0,
      void 0
    ));
  };
  function Oy(l, t) {
    return l.tag === 6 ? !1 : (l = fl(l), l === t || l.contains(t) ? (t.blur(), !0) : !1);
  }
  Rt.prototype.observeUsing = function(l) {
    this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(l), S(
      this._fragmentFiber.child,
      !1,
      Ny,
      l,
      void 0,
      void 0
    );
  };
  function Ny(l, t) {
    return l.tag === 6 || (l = fl(l), t.observe(l)), !1;
  }
  Rt.prototype.unobserveUsing = function(l) {
    var t = this._observers;
    if (t !== null && t.has(l)) {
      t.delete(l), S(
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
    return l.tag === 6 || (l = fl(l), t.unobserve(l)), !1;
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
  Rt.prototype.getClientRects = function() {
    var l = [];
    return S(
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
      l = fl(l), t.push.apply(t, l.getClientRects());
    return !1;
  }
  Rt.prototype.getRootNode = function(l) {
    var t = U(
      this._fragmentFiber
    );
    return t === null ? this : fl(t).getRootNode(l);
  }, Rt.prototype.compareDocumentPosition = function(l) {
    var t = U(
      this._fragmentFiber
    );
    if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var a = [];
    S(
      this._fragmentFiber.child,
      !1,
      ao,
      a,
      void 0,
      void 0
    );
    var u = fl(t);
    if (a.length === 0) {
      if (a = u, Q(this._fragmentFiber)) {
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
      return a === l ? e = Node.DOCUMENT_POSITION_CONTAINS : u & Node.DOCUMENT_POSITION_CONTAINED_BY && (a = dl(t)[1], a === null ? e = Node.DOCUMENT_POSITION_PRECEDING : (l = fl(a).compareDocumentPosition(
        l
      ), e = l === 0 || l & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), e |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    t = fl(a[0]), e = fl(a[a.length - 1]);
    var n = Q(this._fragmentFiber) ? t.parentElement : u;
    if (n == null)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    u = n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, n = n.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var i = t.compareDocumentPosition(l), c = e.compareDocumentPosition(l), f = i & Node.DOCUMENT_POSITION_CONTAINED_BY || c & Node.DOCUMENT_POSITION_CONTAINED_BY;
    return c = u && n && i & Node.DOCUMENT_POSITION_FOLLOWING && c & Node.DOCUMENT_POSITION_PRECEDING, t = u && t === l || n && e === l || f || c ? Node.DOCUMENT_POSITION_CONTAINED_BY : !u && t === l || !n && e === l ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : i, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Cy(
      t,
      this._fragmentFiber,
      a[0],
      a[a.length - 1],
      l
    ) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function Cy(l, t, a, u, e) {
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
        for (n = t, t = U(t); n !== null; ) {
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
      pt
    ), t === null ? t = !1 : (S(
      t,
      !0,
      Lt,
      n,
      a
    ), n = ut, ut = null, t = n !== null)), t) : l & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!n) && !(t = n === u) && (t = xl(
      u,
      n,
      pt
    ), t === null ? t = !1 : (S(
      t,
      !0,
      ot,
      n,
      u
    ), n = ut, jl = ut = null, t = n !== null)), t) : !1;
  }
  function Tm(l, t) {
    var a = l.ownerDocument.createRange();
    a.selectNodeContents(l), l = a.getBoundingClientRect(), window.scrollTo(
      window.scrollX + l.left,
      t ? window.scrollY + l.top : window.scrollY + l.bottom - window.innerHeight
    );
  }
  Rt.prototype.scrollIntoView = function(l) {
    if (typeof l == "object") throw Error(h(566));
    var t = [];
    S(
      this._fragmentFiber.child,
      !1,
      ao,
      t,
      void 0,
      void 0
    );
    var a = l !== !1;
    if (t.length === 0) {
      var u = dl(
        this._fragmentFiber
      );
      if (u = a ? u[1] || u[0] || U(this._fragmentFiber) : u[0] || u[1], u === null) return;
      if (u.tag === 6) {
        l = fl(u), Tm(l, a);
        return;
      }
      if (u = fl(u), u.nodeType !== 9) {
        if (u.nodeType === 11) {
          a = "host" in u ? u.host : null, a !== null && a.scrollIntoView(l);
          return;
        }
        u.scrollIntoView(l);
      }
    }
    for (u = a ? t.length - 1 : 0; u !== (a ? -1 : t.length); ) {
      var e = t[u];
      e.tag === 6 ? (e = fl(e), Tm(e, a)) : fl(e).scrollIntoView(l), u += a ? -1 : 1;
    }
  };
  function Uy(l, t) {
    return l = fl(l), Em(l, t), !1;
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
      if (l = Zt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function Hy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Zt(l.nextSibling), l === null)) return null;
    return l;
  }
  function _m(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Zt(l.nextSibling), l === null)) return null;
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
  var co = null;
  function Om(l) {
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
  var Vt = /* @__PURE__ */ new Map(), Mm = /* @__PURE__ */ new Set();
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
    t !== null && t.tag === 5 && t.type === "form" ? U0(t) : Na.r(l);
  }
  var ie = typeof document > "u" ? null : document;
  function Cm(l, t, a) {
    var u = ie;
    if (u && typeof t == "string" && t) {
      var e = xt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Mm.has(e) || (Mm.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), Pl(t, "link", l), Ll(t), u.head.appendChild(t)));
    }
  }
  function Gy(l) {
    Na.D(l), Cm("dns-prefetch", l, null);
  }
  function Xy(l, t) {
    Na.C(l, t), Cm("preconnect", l, t);
  }
  function Qy(l, t, a) {
    Na.L(l, t, a);
    var u = ie;
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
          n = ce(l);
          break;
        case "script":
          n = fe(l);
      }
      if (!(Vt.has(n) || (l = J(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Vt.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(ln(n)) || t === "script" && u.querySelector(tn(n))))) {
        var i = u.createElement("link");
        Pl(i, "link", l), t === "style" && (i[yn] = !0, i.onload = i.onerror = function() {
          Zo(i);
        }), Ll(i), u.head.appendChild(i);
      }
    }
  }
  function Zy(l, t) {
    Na.m(l, t);
    var a = ie;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + xt(u) + '"][href="' + xt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = fe(l);
      }
      if (!Vt.has(n) && (l = J({ rel: "modulepreload", href: l }, t), Vt.set(n, l), a.querySelector(e) === null)) {
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
        u = a.createElement("link"), Pl(u, "link", l), Ll(u), a.head.appendChild(u);
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
          ), (a = Vt.get(n)) && oo(l, a);
          var f = i = u.createElement("link");
          Ll(f), Pl(f, "link", l), f._p = new Promise(function(v, g) {
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
      n || (n = a.querySelector(tn(e)), n || (l = J({ src: l, async: !0 }, t), (t = Vt.get(e)) && so(l, t), n = a.createElement("script"), Ll(n), Pl(n, "link", l), a.head.appendChild(n)), n = {
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
      n || (n = a.querySelector(tn(e)), n || (l = J({ src: l, async: !0, type: "module" }, t), (t = Vt.get(e)) && so(l, t), n = a.createElement("script"), Ll(n), Pl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Um(l, t, a, u) {
    var e = (e = G.current) ? Pe(e) : null;
    if (!e) throw Error(h(446));
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
          )) ? n._p || (i.instance = n, i.state.loading = 5) : (n = Vt.get(l), n || (n = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Vt.set(l, n)), Jy(
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
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (a = fe(a), t = Nu(
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
  function ce(l) {
    return 'href="' + xt(l) + '"';
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
      t = l.createElement("link"), t[yn] = !0, t.onload = t.onerror = Zo.bind(null, t), Pl(t, "link", a), Ll(t), l.head.appendChild(t);
    u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    });
  }
  function fe(l) {
    return '[src="' + xt(l) + '"]';
  }
  function tn(l) {
    return "script[async]" + l;
  }
  function pm(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + xt(a.href) + '"]'
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
          ), Ll(u), Pl(u, "style", e), Ai(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = ce(a.href);
          var n = l.querySelector(
            ln(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Ll(n), n;
          u = Rm(a), (e = Vt.get(e)) && oo(u, e), n = (l.ownerDocument || l).createElement("link"), Ll(n);
          var i = n;
          return i._p = new Promise(function(c, f) {
            i.onload = c, i.onerror = f;
          }), Pl(n, "link", u), t.state.loading |= 4, Ai(n, a.precedence, l), t.instance = n;
        case "script":
          return n = fe(a.src), (e = l.querySelector(
            tn(n)
          )) ? (t.instance = e, Ll(e), e) : (u = a, (e = Vt.get(n)) && (u = J({}, a), so(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Ll(e), Pl(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(h(443, t.type));
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
  function Hm(l, t, a) {
    if (Di === null) {
      var u = /* @__PURE__ */ new Map(), e = Di = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Di, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[he] || n[$l] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
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
  function jm(l, t) {
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
        n = t.ownerDocument || t, u = Rm(u), (e = Vt.get(e)) && oo(u, e), n = n.createElement("link"), Ll(n);
        var i = n;
        i._p = new Promise(function(c, f) {
          i.onload = c, i.onerror = f;
        }), Pl(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = an.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var Mi = 0;
  function Fy(l, t) {
    return l.stylesheets && l.count === 0 && Ui(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Ui(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && Mi === 0 && (Mi = 62500 * vy());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Ui(l, l.stylesheets), l.unsuspend)) {
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
      if (l.stylesheets) Ui(l, l.stylesheets);
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
  var Ci = null;
  function Ui(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Ci = /* @__PURE__ */ new Map(), t.forEach(Iy, l), Ci = null, an.call(l));
  }
  function Iy(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Ci.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Ci.set(l, a);
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
    $$typeof: Dl,
    Provider: null,
    Consumer: null,
    _currentValue: Ht,
    _currentValue2: Ht,
    _threadCount: 0
  };
  function ky(l, t, a, u, e, n, i, c, f) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = Li(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Li(0), this.hiddenUpdates = Li(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = f, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function Gm(l, t, a, u, e, n, i, c, f, v, g, E) {
    return l = new ky(
      l,
      t,
      a,
      i,
      f,
      v,
      g,
      E,
      c
    ), t = 1, n === !0 && (t |= 24), n = vt(3, null, null, t), l.current = n, n.stateNode = l, t = Nc(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Cc(n), l;
  }
  function Xm(l) {
    return l ? (l = xu, l) : xu;
  }
  function Qm(l, t, a, u, e, n) {
    e = Xm(e), u.context === null ? u.context = e : u.pendingContext = e, u = Ba(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = qa(l, u, t), a !== null && (gt(a, l, t), He(a, l, t));
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
      t !== null && gt(t, l, 67108864), vo(l, 67108864);
    }
  }
  function Lm(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Ut();
      t = Ki(t);
      var a = nu(l, t);
      a !== null && gt(a, l, t), vo(l, t);
    }
  }
  var se = !0;
  function Py(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = Y.p;
    try {
      Y.p = 2, ro(l, t, a, u);
    } finally {
      Y.p = n, C.T = e;
    }
  }
  function lh(l, t, a, u) {
    var e = C.T;
    C.T = null;
    var n = Y.p;
    try {
      Y.p = 8, ro(l, t, a, u);
    } finally {
      Y.p = n, C.T = e;
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
                      var f = 1 << 31 - _t(i);
                      c.entanglements[1] |= f, i &= ~f;
                    }
                    oa(n), (sl & 6) === 0 && (hi = Et() + 500, Fe(0));
                  }
                }
                break;
              case 31:
              case 13:
                c = nu(n, 2), c !== null && gt(c, n, 2), bi(), vo(n, 2);
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
          if (l = Nl(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = Zl(t), l !== null) return l;
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
          case Uo:
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
          if (t = Nl(a), t !== null) {
            l.blockedOn = t, Go(l.priority, function() {
              Lm(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = Zl(a), t !== null) {
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
  function Hi(l, t) {
    l.blockedOn === t && (l.blockedOn = null, go || (go = !0, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      uh
    )));
  }
  var ji = null;
  function Fm(l) {
    ji !== l && (ji = l, A.unstable_scheduleCallback(
      A.unstable_NormalPriority,
      function() {
        ji === l && (ji = null);
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
      return Hi(f, l);
    }
    Fa !== null && Hi(Fa, l), Wa !== null && Hi(Wa, l), Ia !== null && Hi(Ia, l), un.forEach(t), en.forEach(t);
    for (var a = 0; a < ka.length; a++) {
      var u = ka[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < ka.length && (a = ka[0], a.blockedOn === null); )
      wm(a), a.blockedOn === null && ka.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[mt] || null;
        if (typeof n == "function")
          i || Fm(a);
        else if (i) {
          var c = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[mt] || null)
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
    if (t === null) throw Error(h(409));
    var a = t.current, u = Ut();
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
  var Im = tl.version;
  if (Im !== "19.3.0")
    throw Error(
      h(
        527,
        Im,
        "19.3.0"
      )
    );
  Y.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(h(188)) : (l = Object.keys(l).join(","), Error(h(268, l)));
    return l = bl(t), l = l !== null ? j(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var eh = {
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
        ve = Bi.inject(
          eh
        ), zt = Bi;
      } catch {
      }
  }
  return fn.createRoot = function(l, t) {
    if (!nl(l)) throw Error(h(299));
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
    if (!nl(l)) throw Error(h(299));
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
    ), t.context = Xm(null), a = t.current, u = Ut(), u = Ki(u), e = Ba(u), e.callback = null, qa(a, e, u), a = u, t.current.lanes = a, ye(t, a), oa(t), l[_u] = t.current, wf(l), new xi(t);
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
      } catch (tl) {
        console.error(tl);
      }
  }
  return A(), Eo.exports = vh(), Eo.exports;
}
var yh = rh();
function hh(A = "/api") {
  async function tl(Z, h, nl) {
    const al = await fetch(`${A.replace(/\/$/, "")}/${Z}`, {
      ...h ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) } : {},
      signal: nl
    });
    if (!al.ok) {
      const Nl = await al.json().catch(() => ({}));
      throw new Error(Nl.error || `Erro HTTP ${al.status}`);
    }
    return Z === "export" ? al.blob() : al.json();
  }
  return { catalog: (Z) => tl("catalog", null, Z), preview: (Z, h) => tl("preview", Z, h), export: (Z, h) => tl("export", Z, h) };
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
  const tl = String(A).replace(/^\d+_/, "").replaceAll("_", " ");
  return tl.charAt(0).toLocaleUpperCase("pt-BR") + tl.slice(1);
}, gh = {
  "IBGE · Censo 2022": "IBGE — Censo Demográfico 2022",
  "IBGE / Cadastro Central de Empresas": "IBGE — Cadastro Central de Empresas",
  "IBGE / Finanças públicas": "IBGE — Finanças Públicas",
  "IBGE / Produto Interno Bruto dos Municípios": "IBGE — Produto Interno Bruto dos Municípios",
  "IBGE / Índice de Desenvolvimento da Educação Básica": "IBGE — Índice de Desenvolvimento da Educação Básica",
  "Ipeadata / Atlas do Desenvolvimento Humano (Censo Demográfico)": "Ipea — Atlas do Desenvolvimento Humano",
  "InfoSiga SP": "Detran-SP — InfoSiga",
  "MTE / RAIS": "MTE — RAIS",
  "Seade · IPDM": "Fundação Seade — IPDM"
}, Sh = (A) => gh[A] || String(A).replace(/\s*[·/]\s*/g, " — ");
function bh(A) {
  let tl = "";
  try {
    tl = JSON.parse(A.detail).categorias || "";
  } catch {
    tl = "";
  }
  const Z = {};
  for (const h of String(tl).split("|")) {
    const nl = h.indexOf(":");
    if (nl < 1) continue;
    const al = h.slice(0, nl).trim(), Nl = h.slice(nl + 1).trim();
    al && Nl && (Z[al] = Nl);
  }
  return Z;
}
const ov = { fgb: 6500, gpkg: 1900, shp: 250 }, Ao = "__todas__";
function Th({ apiBaseUrl: A = "/api", client: tl, value: Z, onChange: h, onExport: nl, download: al = !0, className: Nl = "", categoriaNome: Zl = "" }) {
  const gl = Hl.useMemo(() => tl || hh(A), [tl, A]), [bl, j] = Hl.useState(null), [S, U] = Hl.useState({ attributes: [], format: "fgb" }), Q = Z ?? S, [dl, Al] = Hl.useState(""), [fl, ut] = Hl.useState("2022"), [jl, Lt] = Hl.useState(""), [ot, pt] = Hl.useState(""), [xl, J] = Hl.useState({}), [w, st] = Hl.useState(0), [tt, Vl] = Hl.useState(""), [Cl, Kt] = Hl.useState(!1), [sa, Dl] = Hl.useState(""), [O, B] = Hl.useState(null), x = Hl.useRef(!0);
  Hl.useEffect(() => {
    x.current = !0;
    const b = new AbortController();
    return j(null), Vl(""), gl.catalog(b.signal).then((G) => {
      j(G), Al(G.attributes.find((cl) => cl.source === "IBGE · Censo 2022")?.source || G.attributes[0]?.source || "");
    }).catch((G) => {
      G.name !== "AbortError" && Vl(G.message);
    }), () => {
      x.current = !1, b.abort();
    };
  }, [gl]);
  function il(b) {
    Z === void 0 && U(b), h?.(b), Dl("");
  }
  const $ = bl?.attributes || [], St = [...new Set($.map((b) => b.source))], et = dl === Ao, Jt = [...new Set($.filter((b) => et || b.source === dl).map((b) => b.year))].sort((b, G) => G - b), s = et && fl === "", _ = s ? null : Jt.includes(Number(fl)) ? Number(fl) : Jt[0], R = $.filter((b) => (et || b.source === dl) && (s || b.year === _)), p = [...new Set(R.map((b) => b.theme))], V = new Set(Q.attributes), ul = Hl.useMemo(() => {
    const b = $.filter((_l) => V.has(_l.id));
    if (!b.length) return "Categoria — fonte majoritária — data da geração";
    const G = /* @__PURE__ */ new Map();
    for (const _l of b) G.set(_l.source, (G.get(_l.source) || 0) + 1);
    const cl = [...G.entries()].sort((_l, dt) => dt[1] - _l[1])[0][0];
    return `${Zl || "Categoria"} — ${cl} — ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-CA")}`;
  }, [$, Q.attributes, Zl]), ll = $.filter((b) => V.has(b.id)), C = Hl.useMemo(() => new Map($.map((b) => [b.id, bh(b)])), [$]), Y = R.filter((b) => (!jl || b.theme === jl) && `${b.label} ${b.field} ${b.unit}`.toLocaleLowerCase("pt-BR").includes(ot.toLocaleLowerCase("pt-BR"))), Ht = (b, G) => Object.entries(xl).every(([cl, _l]) => !_l || cl === G || C.get(b.id)?.[cl] === _l), me = (() => {
    if (!jl) return [];
    const b = /* @__PURE__ */ new Map();
    for (const G of Y) for (const [cl, _l] of Object.entries(C.get(G.id) || {}))
      b.has(cl) || b.set(cl, /* @__PURE__ */ new Set()), Ht(G, cl) && b.get(cl).add(_l);
    return [...b].map(([G, cl]) => [G, [...cl].sort((_l, dt) => _l.localeCompare(dt, "pt-BR", { numeric: !0 }))]).filter(([G, cl]) => cl.length > 1 || xl[G]).sort((G, cl) => G[0].localeCompare(cl[0], "pt-BR"));
  })(), bt = Y.filter((b) => Ht(b, null)), Tt = bt.slice(w * 40, w * 40 + 40);
  Hl.useEffect(() => {
    st(0);
  }, [dl, fl, jl, ot, xl]), Hl.useEffect(() => {
    J({});
  }, [dl, fl, jl]);
  const Xl = `${Q.format}|${[...Q.attributes].join(",")}`;
  Hl.useEffect(() => {
    if (B(null), !Q.attributes.length) return;
    const b = new AbortController(), G = { attributes: Q.attributes, format: Q.format }, cl = setTimeout(() => gl.preview(G, b.signal).then(B).catch((_l) => {
      _l.name !== "AbortError" && Vl(_l.message);
    }), 250);
    return () => {
      clearTimeout(cl), b.abort();
    };
  }, [gl, Xl]);
  function vl(b) {
    il({ ...Q, attributes: V.has(b) ? Q.attributes.filter((G) => G !== b) : [...Q.attributes, b] });
  }
  async function jt() {
    Kt(!0), Vl(""), Dl(bl?.destino ? `Gerando geometria e tabela de atributos em ${bl.destino}/` : "Gerando geometria e tabela de atributos…");
    const b = { ...Q, attributes: [...Q.attributes] };
    try {
      const G = await gl.export(b), cl = `municipios_sp_${b.format}.zip`;
      if (await nl?.({ blob: G, filename: cl, configuration: b, attributes: ll }), al) {
        const _l = URL.createObjectURL(G), dt = document.createElement("a");
        dt.href = _l, dt.download = cl, dt.click(), setTimeout(() => URL.revokeObjectURL(_l), 1e4);
      }
      x.current && Dl("Camada gerada. O pacote contém a camada, o dicionário e os metadados.");
    } catch (G) {
      x.current && (Vl(G.message), Dl(""));
    } finally {
      x.current && Kt(!1);
    }
  }
  return /* @__PURE__ */ z.jsxs("section", { className: `mlb ${Nl}`, "aria-label": "Gerador de camada municipal", children: [
    /* @__PURE__ */ z.jsxs("header", { className: "mlb-header", children: [
      /* @__PURE__ */ z.jsxs("div", { children: [
        /* @__PURE__ */ z.jsx("h1", { children: "Monte sua camada" }),
        /* @__PURE__ */ z.jsx("span", { className: "mlb-eyebrow", children: "SÃO PAULO - DADOS MUNICIPAIS" }),
        /* @__PURE__ */ z.jsx("p", { children: "Selecione fontes, períodos, temas e atributos para compor uma única camada vetorial dos 645 municípios de São Paulo. Os dados escolhidos serão incorporados à tabela de atributos da malha municipal do IBGE de 2022." })
      ] }),
      /* @__PURE__ */ z.jsxs("div", { className: "mlb-geometry", children: [
        /* @__PURE__ */ z.jsx("strong", { children: "645 municípios" }),
        /* @__PURE__ */ z.jsx("span", { children: "Malha IBGE 2022 · SIRGAS 2000" })
      ] })
    ] }),
    tt && /* @__PURE__ */ z.jsx("div", { className: "mlb-error", role: "alert", children: tt }),
    bl ? /* @__PURE__ */ z.jsxs("div", { className: "mlb-layout", children: [
      /* @__PURE__ */ z.jsxs("main", { className: "mlb-panel", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "1. Escolha os dados" }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-filters", children: [
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Fonte",
            /* @__PURE__ */ z.jsxs("select", { value: dl, onChange: (b) => {
              Al(b.target.value), Lt(""), b.target.value === Ao && ut("");
            }, children: [
              /* @__PURE__ */ z.jsx("option", { value: Ao, children: "Todas as fontes" }),
              St.map((b) => /* @__PURE__ */ z.jsx("option", { value: b, children: Sh(b) }, b))
            ] })
          ] }),
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Ano de referência",
            /* @__PURE__ */ z.jsxs("select", { value: s ? "" : _ ?? "", onChange: (b) => {
              ut(b.target.value), Lt("");
            }, children: [
              et && /* @__PURE__ */ z.jsx("option", { value: "", children: "Todos os anos" }),
              Jt.map((b) => /* @__PURE__ */ z.jsx("option", { children: b }, b))
            ] })
          ] }),
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Tema",
            /* @__PURE__ */ z.jsxs("select", { value: jl, onChange: (b) => Lt(b.target.value), children: [
              /* @__PURE__ */ z.jsx("option", { value: "", children: "Todos os temas" }),
              p.map((b) => /* @__PURE__ */ z.jsx("option", { value: b, children: No(b) }, b))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-search", children: [
          /* @__PURE__ */ z.jsxs("label", { children: [
            "Buscar atributo",
            /* @__PURE__ */ z.jsx("input", { type: "search", value: ot, placeholder: "Ex.: renda, RAIS, sinistros…", onChange: (b) => pt(b.target.value) })
          ] }),
          me.map(([b, G]) => /* @__PURE__ */ z.jsxs("label", { children: [
            b,
            /* @__PURE__ */ z.jsxs("select", { value: xl[b] ?? "", onChange: (cl) => J({ ...xl, [b]: cl.target.value }), children: [
              /* @__PURE__ */ z.jsxs("option", { value: "", children: [
                "Todos (",
                G.length,
                ")"
              ] }),
              G.map((cl) => /* @__PURE__ */ z.jsx("option", { value: cl, children: cl }, cl))
            ] })
          ] }, b)),
          !!Object.values(xl).filter(Boolean).length && /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-facet-reset", onClick: () => J({}), children: "Limpar filtros" })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-listbar", children: [
          /* @__PURE__ */ z.jsxs("span", { children: [
            bt.length.toLocaleString("pt-BR"),
            " atributos disponíveis"
          ] }),
          /* @__PURE__ */ z.jsxs("span", { className: "mlb-listbar-actions", children: [
            /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !bt.length || Cl, onClick: () => il({ ...Q, attributes: [.../* @__PURE__ */ new Set([...Q.attributes, ...bt.map((b) => b.id)])] }), children: "Adicionar resultados" }),
            /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !V.size || Cl, onClick: () => il({ ...Q, attributes: [] }), children: "Limpar seleção" })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-attributes", children: [
          Tt.map((b) => /* @__PURE__ */ z.jsxs("article", { className: V.has(b.id) ? "mlb-attribute mlb-chosen" : "mlb-attribute", children: [
            /* @__PURE__ */ z.jsxs("label", { children: [
              /* @__PURE__ */ z.jsx("input", { type: "checkbox", checked: V.has(b.id), disabled: Cl, onChange: () => vl(b.id) }),
              /* @__PURE__ */ z.jsx("strong", { children: b.label })
            ] }),
            /* @__PURE__ */ z.jsxs("details", { children: [
              /* @__PURE__ */ z.jsx("summary", { "aria-label": `Fonte e definição de ${b.label}` }),
              /* @__PURE__ */ z.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ z.jsxs("p", { className: "mlb-detail-meta", children: [
                  No(b.theme),
                  " · ",
                  b.unit || "Unidade não informada",
                  " · ",
                  b.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ z.jsxs("p", { children: [
                  et ? `${b.source} · ` : "",
                  b.field,
                  " · ",
                  b.year
                ] }),
                /* @__PURE__ */ z.jsx("a", { href: b.url, target: "_blank", rel: "noreferrer", children: "Consultar fonte oficial" }),
                /* @__PURE__ */ z.jsx("p", { children: JSON.parse(b.detail).definicao || JSON.parse(b.detail).divulgacao || "" }),
                /* @__PURE__ */ z.jsx("p", { children: JSON.parse(b.detail).nota || "" })
              ] })
            ] })
          ] }, b.id)),
          !Tt.length && /* @__PURE__ */ z.jsx("p", { className: "mlb-empty", children: "Nenhum atributo encontrado para estes filtros." })
        ] }),
        /* @__PURE__ */ z.jsxs("nav", { className: "mlb-pages", "aria-label": "Páginas de atributos", children: [
          /* @__PURE__ */ z.jsx("button", { type: "button", disabled: !w, onClick: () => st(w - 1), children: "Anterior" }),
          /* @__PURE__ */ z.jsxs("span", { children: [
            "Página ",
            w + 1,
            " de ",
            Math.max(1, Math.ceil(bt.length / 40))
          ] }),
          /* @__PURE__ */ z.jsx("button", { type: "button", disabled: (w + 1) * 40 >= bt.length, onClick: () => st(w + 1), children: "Próxima" })
        ] })
      ] }),
      /* @__PURE__ */ z.jsxs("aside", { className: "mlb-panel mlb-output", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "2. Gere a camada" }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-count", children: [
          /* @__PURE__ */ z.jsx("strong", { children: Q.attributes.length.toLocaleString("pt-BR") }),
          /* @__PURE__ */ z.jsx("span", { children: "atributos selecionados" })
        ] }),
        /* @__PURE__ */ z.jsx("p", { children: "Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros." }),
        /* @__PURE__ */ z.jsxs("div", { className: "mlb-basket", children: [
          ll.map((b) => /* @__PURE__ */ z.jsxs("article", { className: "mlb-basket-item", children: [
            /* @__PURE__ */ z.jsx("span", { className: "mlb-basket-name", children: b.label }),
            /* @__PURE__ */ z.jsxs("details", { children: [
              /* @__PURE__ */ z.jsx("summary", { "aria-label": `Fonte e definição de ${b.label}` }),
              /* @__PURE__ */ z.jsxs("div", { className: "mlb-detail", children: [
                /* @__PURE__ */ z.jsxs("p", { className: "mlb-detail-meta", children: [
                  b.source,
                  " · ",
                  b.year
                ] }),
                /* @__PURE__ */ z.jsxs("p", { children: [
                  No(b.theme),
                  " · ",
                  b.unit || "Unidade não informada",
                  " · ",
                  b.coverage,
                  "/645 com valor"
                ] }),
                /* @__PURE__ */ z.jsx("p", { children: b.field })
              ] })
            ] }),
            /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-basket-remove", disabled: Cl, title: `Remover ${b.label}`, "aria-label": `Remover ${b.label}`, onClick: () => vl(b.id), children: "×" })
          ] }, b.id)),
          !ll.length && /* @__PURE__ */ z.jsx("p", { children: "Selecione atributos na lista ao lado." })
        ] }),
        /* @__PURE__ */ z.jsxs("label", { children: [
          "Formato da camada",
          /* @__PURE__ */ z.jsxs("select", { disabled: Cl, value: Q.format, onChange: (b) => il({ ...Q, format: b.target.value }), children: [
            /* @__PURE__ */ z.jsx("option", { value: "fgb", children: "FlatGeobuf (.fgb)" }),
            /* @__PURE__ */ z.jsx("option", { value: "gpkg", children: "GeoPackage (.gpkg)" }),
            /* @__PURE__ */ z.jsx("option", { value: "shp", children: "Shapefile (.shp)" })
          ] })
        ] }),
        /* @__PURE__ */ z.jsxs("p", { className: "mlb-note", children: [
          Q.format === "shp" ? "Até 250 atributos. Nomes abreviados com correspondência no dicionário." : Q.format === "gpkg" ? "Até 1.900 atributos. Nomes completos preservados." : "Até 6.500 atributos. Nomes completos preservados.",
          " Todos os formatos são entregues em ZIP."
        ] }),
        /* @__PURE__ */ z.jsxs("label", { className: "mlb-nome", children: [
          "Nome da camada",
          /* @__PURE__ */ z.jsx("input", { type: "text", maxLength: 200, disabled: Cl, value: Q.nome ?? "", placeholder: ul, onChange: (b) => il({ ...Q, nome: b.target.value }) })
        ] }),
        /* @__PURE__ */ z.jsx("p", { className: "mlb-note", children: "Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data." }),
        V.size > ov[Q.format] && /* @__PURE__ */ z.jsx("p", { className: "mlb-error", children: "Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos." }),
        /* @__PURE__ */ z.jsx("button", { type: "button", className: "mlb-primary", disabled: Cl || !V.size || V.size > ov[Q.format], onClick: jt, children: Cl ? "Gerando camada…" : al ? "Gerar e baixar camada" : "Gerar camada" }),
        /* @__PURE__ */ z.jsx("p", { className: "mlb-status", role: "status", children: sa }),
        /* @__PURE__ */ z.jsx("p", { className: "mlb-note", children: "Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos." })
      ] }),
      O && /* @__PURE__ */ z.jsxs("section", { className: "mlb-panel mlb-preview", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "Prévia da tabela de atributos" }),
        /* @__PURE__ */ z.jsx("p", { children: "5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos." }),
        /* @__PURE__ */ z.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ z.jsxs("table", { children: [
          /* @__PURE__ */ z.jsx("thead", { children: /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("th", { children: "Código IBGE" }),
            /* @__PURE__ */ z.jsx("th", { children: "Município" }),
            O.fields.map((b) => /* @__PURE__ */ z.jsx("th", { children: b }, b))
          ] }) }),
          /* @__PURE__ */ z.jsx("tbody", { children: O.rows.map((b) => /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("td", { children: b.CD_MUN }),
            /* @__PURE__ */ z.jsx("td", { children: b.NM_MUN }),
            O.fields.map((G) => /* @__PURE__ */ z.jsx("td", { children: b[G] == null ? "Sem valor" : b[G].toLocaleString("pt-BR", { maximumFractionDigits: 8 }) }, G))
          ] }, b.CD_MUN)) })
        ] }) })
      ] }),
      O?.glossario?.length ? /* @__PURE__ */ z.jsxs("section", { className: "mlb-panel mlb-glossario", children: [
        /* @__PURE__ */ z.jsx("h2", { children: "Glossário e aliases de atributos" }),
        /* @__PURE__ */ z.jsxs("p", { children: [
          "Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.",
          O.totalAttributes > (O.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${O.glossarioLimite} de ${O.totalAttributes.toLocaleString("pt-BR")} atributos; o dicionário do pacote traz todos.` : ""
        ] }),
        /* @__PURE__ */ z.jsx("div", { className: "mlb-table", children: /* @__PURE__ */ z.jsxs("table", { children: [
          /* @__PURE__ */ z.jsx("thead", { children: /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("th", { children: "Campo exportado" }),
            /* @__PURE__ */ z.jsx("th", { children: "Alias" }),
            /* @__PURE__ */ z.jsx("th", { children: "Significado" }),
            /* @__PURE__ */ z.jsx("th", { children: "Fonte" })
          ] }) }),
          /* @__PURE__ */ z.jsx("tbody", { children: O.glossario.map((b) => /* @__PURE__ */ z.jsxs("tr", { children: [
            /* @__PURE__ */ z.jsx("td", { children: /* @__PURE__ */ z.jsx("code", { children: b.campo_exportado }) }),
            /* @__PURE__ */ z.jsx("td", { children: b.alias }),
            /* @__PURE__ */ z.jsx("td", { className: "mlb-glossario-significado", children: b.significado }),
            /* @__PURE__ */ z.jsx("td", { children: b.fonte })
          ] }, b.campo_exportado)) })
        ] }) })
      ] }) : null
    ] }) : /* @__PURE__ */ z.jsx("p", { role: "status", children: tt ? "Não foi possível carregar o catálogo. Verifique a API configurada." : "Carregando catálogo…" })
  ] });
}
function Eh(A, { category: tl, apiBase: Z, onGenerated: h, onBusyChange: nl = () => {
} }) {
  const al = yh.createRoot(A);
  function Nl() {
    const Zl = Hl.useMemo(() => {
      let bl;
      async function j(S, U, Q) {
        let dl;
        try {
          dl = await fetch(`${Z}/extracao-atributos/municipal/${encodeURIComponent(tl.id)}/${S}`, {
            credentials: "same-origin",
            ...U ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(U) } : {},
            signal: Q
          });
        } catch (Al) {
          throw Al.name === "AbortError" ? Al : new Error("A conexão com o servidor foi interrompida. Confira sua rede e tente novamente.");
        }
        if (!dl.ok) {
          const Al = await dl.json().catch(() => ({}));
          throw dl.status === 401 ? new Error("Sua sessão expirou. Entre novamente para continuar.") : new Error(typeof Al.detail == "string" ? Al.detail : `Não foi possível concluir a operação (HTTP ${dl.status}).`);
        }
        return S === "export" ? (bl = { arquivo: dl.headers.get("X-Camada-Arquivo"), id: dl.headers.get("X-Camada-Id") }, dl.blob()) : dl.json();
      }
      return {
        catalog: (S) => j("catalog", null, S),
        preview: (S, U) => j("preview", S, U),
        export: async (S) => {
          nl(!0);
          try {
            return await j("export", { ...S, nome: S.nome || "" });
          } catch (U) {
            throw nl(!1), U;
          }
        },
        generated: () => bl
      };
    }, []);
    async function gl(bl) {
      try {
        await h(Zl.generated(), bl);
      } finally {
        nl(!1);
      }
    }
    return /* @__PURE__ */ z.jsx(Th, { client: Zl, download: !1, onExport: gl, categoriaNome: tl.nome });
  }
  return al.render(/* @__PURE__ */ z.jsx(Nl, {})), () => al.unmount();
}
export {
  Eh as montarMunicipal
};
